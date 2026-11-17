/*
 * PortalAPI: the client portal data layer. The contract is portal/API.md.
 *  - Local mode (window.PORTAL_API_BASE empty or missing): everything is kept in this browser.
 *    Data: localStorage 'miras.portal.v1'. Client session: sessionStorage. Files: IndexedDB 'miras-admin' / 'files'.
 *  - Remote mode (window.PORTAL_API_BASE = 'https://…'): the same calls go to the Worker in portal/worker/.
 * Every method returns a Promise. A failure rejects with an Error whose .code is
 * 'unauthorised' | 'not_found' | 'invalid' | 'conflict' | 'server'.
 * Extra fields on errors (additive): .status (remote), .reason ('locked' after too many wrong codes), .retryAfter (seconds).
 * Plain browser script: no modules, no dependencies. Global: window.PortalAPI.
 */
(function (global) {
  'use strict';

  // ---------------------------------------------------------------- configuration
  var rawBase = typeof global.PORTAL_API_BASE === 'string' ? global.PORTAL_API_BASE.trim() : '';
  var BASE = rawBase.replace(/\/+$/, '');
  var MODE = BASE ? 'remote' : 'local';

  var STORE_KEY = 'miras.portal.v1';
  var SESSION_KEY = 'miras.portal.session';
  var IDB_NAME = 'miras-admin';          // the admin opens this database at version 1
  var IDB_STORES = ['files', 'handles', 'kv'];
  var FILE_KEY_PREFIX = 'portal:';       // IndexedDB key in store 'files' is 'portal:<id>'
  var REF_PREFIX = 'idb:portal:';        // what local deliverables and metrics keep in url / screenshotUrl
  var MAX_FILE_BYTES = 25 * 1024 * 1024;
  var FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'application/pdf'];
  var STEP_STATUSES = ['pending', 'in_progress', 'waiting', 'approved', 'changes'];
  var PROJECT_STATUSES = ['planning', 'in_progress', 'review', 'live', 'done'];
  var KINDS = ['image', 'video', 'post', 'document', 'link'];
  var PLATFORMS = ['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'x', 'snapchat', 'website', 'other'];
  var DECISIONS = ['approve', 'changes'];
  var PRIORITIES = ['low', 'normal', 'high'];
  var TEAM_DELIVERABLE_STATUSES = ['draft', 'in_review', 'published'];   // the team sets these; approved and changes come from clients
  var LANGUAGES = ['en', 'ar'];
  var CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 symbols, no 0/O/1/I/L; bytes >= 248 are rejected
  var LOCK_AFTER = 5;
  var LOCK_MS = 15 * 60 * 1000;
  var SESSION_MS = 12 * 60 * 60 * 1000;
  // Sample data (local only): the three link names it uses, and where its images are. The images are the public site's
  // files, two folders up from this script (portal/api.js → assets/), so the base comes from this script's own address.
  var SAMPLE_SLUGS = ['dar-lusail', 'sidra-coffee', 'heritage-walks'];
  var ASSET_BASE = (function () {
    try {
      var s = document.currentScript;
      return new URL('../assets/', s && s.src ? s.src : global.location.href).href;
    } catch (e) { return ''; }
  })();
  // Limits. Same numbers as portal/worker/src/validate.js. MAX.contacts is a count.
  var MAX = {
    name: 120, title: 200, service: 80, body: 2000, note: 1000, metricNote: 500, email: 254, url: 2000, steps: 50, inbox: 200, ids: 100,
    summary: 1000, description: 2000, owner: 120, fileName: 255, role: 80, industry: 80, phone: 30, website: 200, notes: 5000,
    templateKey: 40, contacts: 20
  };

  // ---------------------------------------------------------------- helpers
  function fail(code, message, extra) {
    var err = new Error(message || code);
    err.code = code;
    if (extra) Object.keys(extra).forEach(function (k) { err[k] = extra[k]; });
    return err;
  }

  function nowIso() { return new Date().toISOString(); }

  function randomBytes(n) {
    var b = new Uint8Array(n);
    global.crypto.getRandomValues(b);
    return b;
  }

  function toHex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return s;
  }

  function uid() {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') return global.crypto.randomUUID();
    } catch (e) { /* insecure context: fall through */ }
    var b = randomBytes(16);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = toHex(b);
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  async function sha256Hex(text) {
    if (!global.crypto || !global.crypto.subtle) {
      throw fail('server', 'This browser cannot check codes here. Open the portal over HTTPS or localhost.');
    }
    var digest = await global.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return toHex(new Uint8Array(digest));
  }

  // Code hash scheme (shared with the Worker): hex(SHA-256(saltHex + ':' + normalisedCode)).
  function codeHash(salt, code) { return sha256Hex(salt + ':' + code); }

  function sameText(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function clean(v) { return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ''); }

  function excerpt(s, max) {
    s = String(s);
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  function text(v, field, max) {
    if (typeof v !== 'string') throw fail('invalid', field + ' must be text.');
    var s = clean(v).trim();
    if (!s) throw fail('invalid', field + ' is required.');
    if (s.length > max) throw fail('invalid', field + ' is too long (max ' + max + ' characters).');
    return s;
  }

  function optText(v, field, max) {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v !== 'string') throw fail('invalid', field + ' must be text.');
    var s = clean(v).trim();
    if (s.length > max) throw fail('invalid', field + ' is too long (max ' + max + ' characters).');
    return s || null;
  }

  function oneOf(v, list, field) {
    if (list.indexOf(v) < 0) throw fail('invalid', field + ' is not valid.');
    return v;
  }

  function whole(v, field, min, max) {
    if (typeof v !== 'number' || !isFinite(v) || Math.floor(v) !== v || v < min || v > max) {
      throw fail('invalid', field + ' must be a whole number between ' + min + ' and ' + max + '.');
    }
    return v;
  }

  function amount(v, field) {
    if (v === undefined || v === null || v === '') return null;
    var n = typeof v === 'string' ? Number(v) : v;
    if (typeof n !== 'number' || !isFinite(n) || n < 0 || n > 1e12) throw fail('invalid', field + ' must be a positive number.');
    return n;
  }

  function monthOf(v) {
    if (typeof v !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) throw fail('invalid', 'Month must look like 2026-10.');
    return v;
  }

  function checkSlug(v) {
    var s = String(v == null ? '' : v).trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(s)) {
      throw fail('invalid', 'Link name must be 3 to 40 characters: lowercase letters, numbers and hyphens.');
    }
    return s;
  }

  function slugify(v) {
    return String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  }

  // True when a slug was given: not missing, null or blank. A blank slug means "make one for me".
  function slugGiven(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }

  // The first usable link name made from the name, then the company; null when neither gives 3 or more characters.
  function slugFrom(name, company) {
    var parts = [name, company];
    for (var i = 0; i < parts.length; i++) {
      var s = slugify(parts[i]);
      if (s.length >= 3) return s;
    }
    return null;
  }

  // base-2, base-3 ... kept within 40 characters.
  function slugWithSuffix(base, n) {
    var tail = '-' + n;
    return base.slice(0, 40 - tail.length).replace(/-+$/, '') + tail;
  }

  // A link name for a client whose name and company give no Latin letters or numbers (Arabic only, say): client-xxxxx.
  function randomSlug() {
    var alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
    var bytes = randomBytes(5);
    var out = 'client-';
    for (var i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
  }

  // A link name nobody uses yet, for a client created without one: base, base-2, base-3 ... or client-xxxxx.
  function freshSlug(doc, name, company) {
    var base = slugFrom(name, company);
    for (var n = 1; n <= 100; n++) {
      var candidate = base ? (n === 1 ? base : slugWithSuffix(base, n)) : randomSlug();
      if (!doc.clients.some(function (c) { return c.slug === candidate; })) return candidate;
    }
    throw fail('conflict', 'Could not make a free link name. Type one.');
  }

  // How a client is shown everywhere: the name, else the company, else ''.
  function displayName(c) { return (c && (c.name || c.company)) || ''; }

  // A client needs a name or a company. Either one is enough.
  function needNameOrCompany(name, company) {
    if (!name && !company) throw fail('invalid', 'Add a name or a company.');
  }

  // The word a project without a ready template (or with the Blank one) starts its title with.
  var GENERIC_PROJECT = { en: 'Project', ar: 'مشروع' };

  // "Video production · Dar Lusail": the template's name and the client's display name, in the project's language.
  function generatedTitle(templateKey, client, lang) {
    var template = templateKey && templateKey !== 'blank' ? templateFor(templateKey) : null;
    var base = template ? template.name[lang] : GENERIC_PROJECT[lang];
    var who = displayName(client);
    return excerpt(who ? base + ' · ' + who : base, MAX.title);
  }

  // The service when none is given: the ready template's key, otherwise 'other'.
  function defaultService(templateKey) {
    return templateKey && templateKey !== 'blank' ? templateKey : 'other';
  }

  function checkEmail(v) {
    var s = optText(v, 'Email', MAX.email);
    if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw fail('invalid', 'Email is not valid.');
    return s;
  }

  // A calendar date as YYYY-MM-DD (years 2000 to 2100). Null when missing or empty.
  function dateOf(v, field) {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw fail('invalid', field + ' must be a date like 2026-10-31.');
    var y = Number(v.slice(0, 4));
    var m = Number(v.slice(5, 7));
    var d = Number(v.slice(8, 10));
    var real = new Date(Date.UTC(y, m - 1, d));
    if (y < 2000 || y > 2100 || real.getUTCFullYear() !== y || real.getUTCMonth() !== m - 1 || real.getUTCDate() !== d) {
      throw fail('invalid', field + ' is not a real date.');
    }
    return v;
  }

  // A phone or WhatsApp number: 6 to 15 digits (Latin, Arabic-Indic or Persian), an optional + first, spaces, dashes, dots and brackets.
  function checkPhone(v, field) {
    var s = optText(v, field, MAX.phone);
    if (!s) return null;
    var digits = (s.match(/[0-9٠-٩۰-۹]/g) || []).length;
    if (!/^\+?[0-9٠-٩۰-۹ ()\-.]+$/.test(s) || digits < 6 || digits > 15) {
      throw fail('invalid', field + ' is not valid. Use digits, with an optional + at the start.');
    }
    return s;
  }

  // A web address. A bare domain such as miras.qa becomes https://miras.qa. Null when missing or empty.
  function checkWebsite(v) {
    var s = optText(v, 'Website', MAX.website);
    if (!s) return null;
    if (!/^https?:\/\//i.test(s) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(s)) s = 'https://' + s;
    var ok = /^https?:\/\/\S+$/i.test(s);
    if (ok) {
      try { new URL(s); } catch (e) { ok = false; }
    }
    if (!ok) throw fail('invalid', 'Website must be a web address, for example miras.qa.');
    return s;
  }

  function checkPriority(v) {
    if (v === undefined || v === null || v === '') return null;
    return oneOf(v, PRIORITIES, 'Priority');
  }

  // A file size in bytes, from 1 to the upload limit. Null when not set.
  function checkFileSize(v) {
    if (v === undefined || v === null || v === '') return null;
    var n = typeof v === 'string' ? Number(v) : v;
    return whole(n, 'File size', 1, MAX_FILE_BYTES);
  }

  // Template text in one language. Local mode reads window.PORTAL_TEMPLATES, so portal/templates.js must be loaded first.
  function templateFor(key) {
    var list = global.PORTAL_TEMPLATES;
    if (!Array.isArray(list)) throw fail('server', 'Project templates are not loaded on this page (portal/templates.js).');
    for (var i = 0; i < list.length; i++) {
      if (list[i].key === key) return list[i];
    }
    throw fail('invalid', 'Template is not valid.');
  }

  function templateKeyIn(v) {
    var key = optText(v, 'Template', MAX.templateKey);
    if (key) templateFor(key);
    return key;
  }

  // Optional project fields the input contains (camelCase in, the stored names out). Only the keys given are returned.
  function projectFieldsIn(input) {
    var out = {};
    if (input.summary !== undefined) out.summary = optText(input.summary, 'Summary', MAX.summary);
    if (input.ownerName !== undefined) out.ownerName = optText(input.ownerName, 'Owner', MAX.owner);
    if (input.priority !== undefined) out.priority = checkPriority(input.priority);
    if (input.startDate !== undefined) out.startDate = dateOf(input.startDate, 'Start date');
    if (input.dueDate !== undefined) out.dueDate = dateOf(input.dueDate, 'Due date');
    if (input.templateKey !== undefined) out.templateKey = templateKeyIn(input.templateKey);
    return out;
  }

  // A due date cannot be before the start date. Called with the values the project will have after the change.
  function checkProjectDates(start, due) {
    if (start && due && due < start) throw fail('invalid', 'The due date cannot be before the start date.');
  }

  // Optional step fields the input contains.
  function stepFieldsIn(input) {
    var out = {};
    if (input.description !== undefined) out.description = optText(input.description, 'Description', MAX.description);
    if (input.ownerName !== undefined) out.ownerName = optText(input.ownerName, 'Owner', MAX.owner);
    if (input.dueDate !== undefined) out.dueDate = dateOf(input.dueDate, 'Due date');
    return out;
  }

  // Optional deliverable fields the input contains. status is the team's value (draft, in_review, published).
  function deliverableFieldsIn(input) {
    var out = {};
    if (input.description !== undefined) out.description = optText(input.description, 'Description', MAX.description);
    if (input.dueDate !== undefined) out.dueDate = dateOf(input.dueDate, 'Due date');
    if (input.fileName !== undefined) out.fileName = optText(input.fileName, 'File name', MAX.fileName);
    if (input.fileSize !== undefined) out.fileSize = checkFileSize(input.fileSize);
    if (input.status !== undefined) out.status = oneOf(input.status, TEAM_DELIVERABLE_STATUSES, 'Status');
    return out;
  }

  // Optional team details of a client (the admin only; never in the client view).
  function clientDetailsIn(input) {
    var out = {};
    if (input.phone !== undefined) out.phone = checkPhone(input.phone, 'Phone');
    if (input.whatsapp !== undefined) out.whatsapp = checkPhone(input.whatsapp, 'WhatsApp');
    if (input.industry !== undefined) out.industry = optText(input.industry, 'Industry', MAX.industry);
    if (input.website !== undefined) out.website = checkWebsite(input.website);
    if (input.notes !== undefined) out.notes = optText(input.notes, 'Notes', MAX.notes);
    return out;
  }

  function normCode(v) { return String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9]/g, ''); }

  function newCode() {
    var out = '';
    while (out.length < 12) {
      var bytes = randomBytes(24);
      for (var i = 0; i < bytes.length && out.length < 12; i++) {
        if (bytes[i] < 248) out += CODE_ALPHABET[bytes[i] % 31];
      }
    }
    return out;
  }

  function formatCode(raw) { return raw.slice(0, 4) + '-' + raw.slice(4, 8) + '-' + raw.slice(8, 12); }

  function numOrNull(v) { return v === undefined || v === null ? null : v; }

  // Link validation. Local accepts http(s), idb:portal refs, and blob: URLs returned by upload() in this page.
  // Remote accepts http(s) and /files/<key>. Anything else (javascript:, data:, …) is refused.
  function normUrl(v) {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v !== 'string') throw fail('invalid', 'Link must be text.');
    var s = v.trim();
    if (!s) return null;
    if (s.length > MAX.url) throw fail('invalid', 'Link is too long.');
    if (MODE === 'local' && blobRefs.has(s)) return blobRefs.get(s);
    if (/^https?:\/\/[^\s]+$/i.test(s)) {
      try { new URL(s); return s; } catch (e) { /* fall through to invalid */ }
    }
    if (MODE === 'local' && /^idb:portal:[A-Za-z0-9-]{8,64}$/.test(s)) return s;
    if (MODE === 'remote' && /^\/files\/[A-Za-z0-9_-]{16,128}$/.test(s)) return s;
    throw fail('invalid', 'Link is not valid. Use an https link or an uploaded file.');
  }

  function checkFile(file) {
    if (!file || typeof file.size !== 'number' || typeof file.type !== 'string') throw fail('invalid', 'Choose a file to upload.');
    if (file.size <= 0) throw fail('invalid', 'The file is empty.');
    if (file.size > MAX_FILE_BYTES) throw fail('invalid', 'The file is larger than 25 MB.');
    if (FILE_TYPES.indexOf(file.type) < 0) throw fail('invalid', 'That file type is not allowed. Use an image, an MP4 video or a PDF.');
  }

  // ---------------------------------------------------------------- local store (localStorage)
  var memDoc = null;     // last good copy, used when browser storage is blocked or full
  var memOnly = false;

  function blankDoc() {
    return { v: 1, clients: [], contacts: [], projects: [], steps: [], deliverables: [], reactions: [], approvals: [], comments: [], metrics: [], notifications: [], events: [], loginAttempts: {} };
  }

  // Fills in arrays that older stored data may lack. A deliverable saved before it had a status takes the status its
  // latest approval implies (approved or changes), or draft.
  function normaliseDoc(d) {
    ['clients', 'contacts', 'projects', 'steps', 'deliverables', 'reactions', 'approvals', 'comments', 'metrics', 'notifications', 'events'].forEach(function (k) {
      if (!Array.isArray(d[k])) d[k] = [];
    });
    if (!d.loginAttempts || typeof d.loginAttempts !== 'object') d.loginAttempts = {};
    d.deliverables.forEach(function (x) {
      if (x.status) return;
      var latest = null;
      d.approvals.forEach(function (a) { if (a.deliverableId === x.id) latest = a; });
      x.status = latest ? (latest.decision === 'approve' ? 'approved' : 'changes') : 'draft';
    });
    return d;
  }

  // Always returns a fresh copy, so a failed validation never leaks half-made changes into memory.
  function loadDoc() {
    if (memOnly && memDoc) return JSON.parse(JSON.stringify(memDoc));
    var raw = null;
    try {
      raw = global.localStorage.getItem(STORE_KEY);
    } catch (e) {
      memOnly = true;
      return memDoc ? JSON.parse(JSON.stringify(memDoc)) : blankDoc();
    }
    if (raw === null) return blankDoc();
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.clients)) return normaliseDoc(parsed);
    } catch (e) { /* unreadable: start empty below */ }
    console.warn('[PortalAPI] stored portal data is unreadable; starting empty.');
    return blankDoc();
  }

  function saveDoc(doc) {
    memDoc = doc;
    if (memOnly) return;
    try {
      global.localStorage.setItem(STORE_KEY, JSON.stringify(doc));
    } catch (e) {
      memOnly = true;
      console.warn('[PortalAPI] browser storage is full or blocked; keeping portal data for this page only.');
    }
  }

  // ---------------------------------------------------------------- local session (sessionStorage)
  var memSession = null;

  function readSession() {
    var s = null;
    try {
      var raw = global.sessionStorage.getItem(SESSION_KEY);
      if (raw) s = JSON.parse(raw);
    } catch (e) { s = null; }
    if (!s && memSession) s = memSession;
    if (!s || typeof s !== 'object' || !s.clientId || !(s.exp > Date.now())) return null;
    return s;
  }

  function writeSession(s) {
    memSession = s;
    try { global.sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* memory copy only */ }
  }

  function clearSession() {
    memSession = null;
    try { global.sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  }

  // The signed-in client, or an 'unauthorised' error. Checks the session version so a reset code ends old sessions.
  function currentClient(doc) {
    var s = readSession();
    if (!s) throw fail('unauthorised', 'Sign in with your link and code.');
    var client = doc.clients.find(function (c) { return c.id === s.clientId; });
    if (!client || client.sv !== s.sv) {
      clearSession();
      throw fail('unauthorised', 'Your session has ended. Sign in again.');
    }
    return { client: client, session: s };
  }

  // ---------------------------------------------------------------- local files (IndexedDB 'miras-admin' / 'files')
  var idbDb = null;
  var blobUrls = new Map();   // ref -> object URL created in this page
  var blobRefs = new Map();   // object URL -> ref, so a url from upload() can be stored as a stable ref

  function openIdb() {
    if (idbDb) return Promise.resolve(idbDb);
    return new Promise(function (resolve, reject) {
      function open(version) {
        var req = version ? global.indexedDB.open(IDB_NAME, version) : global.indexedDB.open(IDB_NAME);
        req.onupgradeneeded = function () {
          IDB_STORES.forEach(function (name) {
            if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
          });
        };
        req.onsuccess = function () {
          idbDb = req.result;
          idbDb.onversionchange = function () { idbDb.close(); idbDb = null; };
          resolve(idbDb);
        };
        req.onerror = function () {
          var err = req.error;
          if (version && err && err.name === 'VersionError') { open(0); return; }
          reject(err);
        };
      }
      try { open(1); } catch (e) { reject(e); }
    });
  }

  function idbRun(mode, makeRequest) {
    return openIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('files', mode);
        var req = makeRequest(tx.objectStore('files'));
        tx.oncomplete = function () { resolve(req ? req.result : undefined); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error || new Error('IndexedDB transaction aborted')); };
      });
    });
  }

  function remember(ref, url) {
    blobUrls.set(ref, url);
    blobRefs.set(url, ref);
  }

  // Frees the object URL and the IndexedDB file for refs that no record uses any more.
  function dropUnusedFiles(doc, refs) {
    var used = {};
    doc.deliverables.forEach(function (d) { if (d.url) used[d.url] = true; if (d.posterUrl) used[d.posterUrl] = true; });
    doc.metrics.forEach(function (m) { if (m.screenshotUrl) used[m.screenshotUrl] = true; });
    var seen = {};
    refs.forEach(function (ref) {
      if (!ref || seen[ref] || used[ref] || ref.indexOf(REF_PREFIX) !== 0) return;
      seen[ref] = true;
      var url = blobUrls.get(ref);
      if (url) {
        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        blobUrls.delete(ref);
        blobRefs.delete(url);
      }
      idbRun('readwrite', function (s) { return s.delete(FILE_KEY_PREFIX + ref.slice(REF_PREFIX.length)); }).catch(function () {});
    });
  }

  async function localUpload(file) {
    checkFile(file);
    var id = uid();
    var ref = REF_PREFIX + id;
    try {
      await idbRun('readwrite', function (s) { return s.put(file, FILE_KEY_PREFIX + id); });
    } catch (e) {
      throw fail('server', 'Could not store the file in this browser.');
    }
    var url = URL.createObjectURL(file);
    remember(ref, url);
    return { url: url, ref: ref };
  }

  async function localFileUrl(ref) {
    if (blobUrls.has(ref)) return blobUrls.get(ref);
    try {
      var file = await idbRun('readonly', function (s) { return s.get(FILE_KEY_PREFIX + ref.slice(REF_PREFIX.length)); });
      if (!(file instanceof Blob)) return '';
      var url = URL.createObjectURL(file);
      remember(ref, url);
      return url;
    } catch (e) {
      return '';
    }
  }

  // ---------------------------------------------------------------- shapes (what the API returns)
  // Team view of a client (admin methods only). contacts: the client's contact rows, oldest first.
  function pubClient(c, contacts) {
    return {
      id: c.id, name: c.name || null, company: c.company || null, email: c.email || null, slug: c.slug, createdAt: c.createdAt,
      phone: c.phone || null, whatsapp: c.whatsapp || null, industry: c.industry || null, website: c.website || null, notes: c.notes || null,
      contacts: (contacts || []).map(pubContact)
    };
  }
  function pubContact(k) {
    return { id: k.id, clientId: k.clientId, name: k.name, role: k.role || null, email: k.email || null, phone: k.phone || null };
  }
  function pubProject(p) {
    return {
      id: p.id, clientId: p.clientId, title: p.title, service: p.service, status: p.status, createdAt: p.createdAt, updatedAt: p.updatedAt,
      summary: p.summary || null, ownerName: p.ownerName || null, priority: p.priority || null,
      startDate: p.startDate || null, dueDate: p.dueDate || null, templateKey: p.templateKey || null
    };
  }
  function pubStep(s) {
    return {
      id: s.id, projectId: s.projectId, position: s.position, title: s.title, status: s.status, updatedAt: s.updatedAt,
      description: s.description || null, ownerName: s.ownerName || null, dueDate: s.dueDate || null
    };
  }
  function pubDeliverable(d) {
    var out = {
      id: d.id, projectId: d.projectId, stepId: d.stepId, title: d.title, kind: d.kind, url: d.url || null, version: d.version, createdAt: d.createdAt,
      status: d.status || 'draft', description: d.description || null, dueDate: d.dueDate || null,
      fileName: d.fileName || null, fileSize: d.fileSize === undefined ? null : d.fileSize
    };
    // Local sample data only: a still image shown for a video that has no link yet. Not in API.md; only present when set.
    if (d.posterUrl) out.posterUrl = d.posterUrl;
    return out;
  }
  // Every stored file a list of deliverables uses (the file and the poster still), for dropUnusedFiles.
  function fileRefsOf(deliverables) {
    var out = [];
    deliverables.forEach(function (d) { if (d.url) out.push(d.url); if (d.posterUrl) out.push(d.posterUrl); });
    return out;
  }
  function pubApproval(a) {
    return { id: a.id, deliverableId: a.deliverableId, decision: a.decision, byName: a.byName, note: a.note || null, createdAt: a.createdAt };
  }
  function pubComment(c) {
    return { id: c.id, projectId: c.projectId, deliverableId: c.deliverableId || null, authorName: c.authorName, authorRole: c.authorRole, body: c.body, createdAt: c.createdAt };
  }
  function pubMetric(m) {
    return {
      id: m.id, clientId: m.clientId, platform: m.platform, month: m.month,
      followers: numOrNull(m.followers), reach: numOrNull(m.reach), engagement: numOrNull(m.engagement), impressions: numOrNull(m.impressions),
      screenshotUrl: m.screenshotUrl || null, note: m.note || null, createdAt: m.createdAt
    };
  }
  // value and refId are null on notifications written before they existed; the admin falls back to the old reading for those.
  function pubNotification(n) {
    return {
      id: n.id, kind: n.kind, projectId: n.projectId, clientId: n.clientId, deliverableId: n.deliverableId || null,
      value: n.value || null, refId: n.refId || null,
      body: n.body, createdAt: n.createdAt, readAt: n.readAt || null
    };
  }

  function reactionSummary(doc, deliverableId, viewerId) {
    var out = { likes: 0, dislikes: 0, mine: null };
    doc.reactions.forEach(function (r) {
      if (r.deliverableId !== deliverableId) return;
      if (r.value === 'like') out.likes++;
      else if (r.value === 'dislike') out.dislikes++;
      if (viewerId && r.clientId === viewerId) out.mine = r.value;
    });
    return out;
  }

  function latestApproval(doc, deliverableId) {
    var found = null;
    doc.approvals.forEach(function (a) { if (a.deliverableId === deliverableId) found = a; });
    return found ? pubApproval(found) : null;
  }

  // A project with its steps, deliverables (with reactions and approval) and comments.
  function projectView(doc, p, viewerId) {
    var out = pubProject(p);
    out.steps = doc.steps
      .filter(function (s) { return s.projectId === p.id; })
      .sort(function (a, b) { return a.position - b.position; })
      .map(pubStep);
    out.deliverables = doc.deliverables
      .filter(function (d) { return d.projectId === p.id; })
      .map(function (d) {
        var v = pubDeliverable(d);
        v.reactions = reactionSummary(doc, d.id, viewerId);
        v.approval = latestApproval(doc, d.id);
        return v;
      });
    out.comments = doc.comments.filter(function (c) { return c.projectId === p.id; }).map(pubComment);
    return out;
  }

  function metricSort(a, b) {
    if (a.month !== b.month) return a.month < b.month ? 1 : -1;
    if (a.platform !== b.platform) return a.platform < b.platform ? -1 : 1;
    return 0;
  }

  function clientView(doc, client) {
    var metrics = doc.metrics
      .filter(function (m) { return m.clientId === client.id; })
      .sort(metricSort)
      .map(pubMetric);
    var projects = doc.projects
      .filter(function (p) { return p.clientId === client.id; })
      .map(function (p) {
        var v = projectView(doc, p, client.id);
        v.metrics = metrics;
        return v;
      });
    return { client: { id: client.id, name: client.name || null, company: client.company || null }, projects: projects, metrics: metrics };
  }

  // extra: { value, refId } (structured fields, see API.md Notification); both null when not given.
  function makeNotification(kind, clientId, projectId, deliverableId, body, extra) {
    extra = extra || {};
    return {
      id: uid(), kind: kind, projectId: projectId, clientId: clientId, deliverableId: deliverableId || null,
      value: extra.value || null, refId: extra.refId || null,
      body: excerpt(body, 300), createdAt: nowIso(), readAt: null
    };
  }

  // Preview sessions (local only, PortalAPI.previewClient) are labelled "(preview)" wherever a name is shown to the team.
  function nameOf(session) { return session.preview ? session.name + ' (preview)' : session.name; }
  // "Sara (Dar Lusail)": the person and the client. When the person is shown under the client's own name, just that name.
  function who(session, client) {
    var co = client.company || client.name || '';
    if (!co || co === session.name) return session.preview ? session.name + ' (preview)' : session.name;
    return session.preview ? session.name + ' (preview, ' + co + ')' : session.name + ' (' + co + ')';
  }

  function findOr(list, id, message) {
    var hit = list.find(function (x) { return x.id === id; });
    if (!hit) throw fail('not_found', message || 'Not found.');
    return hit;
  }

  // A deliverable that belongs to one of this client's projects, or not_found.
  function ownDeliverable(doc, client, deliverableId) {
    var d = doc.deliverables.find(function (x) { return x.id === deliverableId; });
    var p = d && doc.projects.find(function (x) { return x.id === d.projectId && x.clientId === client.id; });
    if (!d || !p) throw fail('not_found', 'Deliverable not found.');
    return { deliverable: d, project: p };
  }

  // An optional deliverable that must belong to the given project.
  function deliverableIn(doc, deliverableId, projectId) {
    if (!deliverableId) return null;
    var d = doc.deliverables.find(function (x) { return x.id === deliverableId && x.projectId === projectId; });
    if (!d) throw fail('not_found', 'Deliverable not found.');
    return d;
  }

  // ---------------------------------------------------------------- local: client methods
  async function localLogin(input) {
    input = input || {};
    var slug = String(input.slug == null ? '' : input.slug).trim().toLowerCase();
    var code = normCode(input.code);
    if (!slug || !code) throw fail('invalid', 'Enter your link and your code.');

    var doc = loadDoc();
    var rec = doc.loginAttempts[slug];
    if (rec && rec.lockedUntil > Date.now()) {
      throw fail('unauthorised', 'Too many wrong codes. Try again in 15 minutes.', { reason: 'locked', retryAfter: Math.ceil((rec.lockedUntil - Date.now()) / 1000) });
    }

    var found = doc.clients.find(function (c) { return c.slug === slug; }) || null;
    var hash = await codeHash(found ? found.codeSalt : '00', code);   // same work whether or not the link exists
    doc = loadDoc();                                                    // storage may have changed while hashing
    found = doc.clients.find(function (c) { return c.slug === slug; }) || null;
    var match = !!found && sameText(hash, found.codeHash);

    if (!match) {
      var attempt = doc.loginAttempts[slug] || { failures: 0, lockedUntil: 0 };
      if (attempt.lockedUntil && attempt.lockedUntil <= Date.now()) attempt = { failures: 0, lockedUntil: 0 };
      attempt.failures += 1;
      if (attempt.failures >= LOCK_AFTER) attempt = { failures: 0, lockedUntil: Date.now() + LOCK_MS };
      doc.loginAttempts[slug] = attempt;
      saveDoc(doc);
      if (attempt.lockedUntil > Date.now()) {
        throw fail('unauthorised', 'Too many wrong codes. Try again in 15 minutes.', { reason: 'locked', retryAfter: Math.ceil(LOCK_MS / 1000) });
      }
      throw fail('unauthorised', 'That link and code do not match.');
    }

    delete doc.loginAttempts[slug];
    saveDoc(doc);
    // The name is optional: blank means the client's own name (or company). 'Client' only if stored data has neither.
    var name = optText(input.name, 'Name', MAX.name) || displayName(found) || 'Client';
    writeSession({ clientId: found.id, name: name, sv: found.sv, exp: Date.now() + SESSION_MS });
    return {
      client: { id: found.id, name: found.name || null, company: found.company || null },
      projectCount: doc.projects.filter(function (p) { return p.clientId === found.id; }).length
    };
  }

  async function localProject() {
    var doc = loadDoc();
    var cur = currentClient(doc);
    return clientView(doc, cur.client);
  }

  async function localApprove(input) {
    input = input || {};
    var doc = loadDoc();
    var cur = currentClient(doc);
    var own = ownDeliverable(doc, cur.client, input.deliverableId);
    var decision = oneOf(input.decision, DECISIONS, 'Decision');
    var note = optText(input.note, 'Note', MAX.note);
    var now = nowIso();
    var approval = { id: uid(), deliverableId: own.deliverable.id, decision: decision, byName: nameOf(cur.session), note: note, createdAt: now };
    doc.approvals.push(approval);
    var step = doc.steps.find(function (s) { return s.id === own.deliverable.stepId; });
    if (step) { step.status = decision === 'approve' ? 'approved' : 'changes'; step.updatedAt = now; }
    own.deliverable.status = decision === 'approve' ? 'approved' : 'changes';
    own.project.updatedAt = now;
    var body = decision === 'approve'
      ? who(cur.session, cur.client) + ' approved "' + own.deliverable.title + '" in ' + own.project.title + '.'
      : who(cur.session, cur.client) + ' asked for changes on "' + own.deliverable.title + '" in ' + own.project.title + '.' + (note ? ' ' + excerpt(note, 200) : '');
    doc.notifications.push(makeNotification('approval', cur.client.id, own.project.id, own.deliverable.id, body, { value: decision, refId: approval.id }));
    saveDoc(doc);
    return { approval: pubApproval(approval) };
  }

  async function localReact(input) {
    input = input || {};
    var doc = loadDoc();
    var cur = currentClient(doc);
    var own = ownDeliverable(doc, cur.client, input.deliverableId);
    var value = input.value === undefined ? null : input.value;
    if (value !== null && value !== 'like' && value !== 'dislike') throw fail('invalid', 'Reaction must be like, dislike or null.');
    var idx = -1;
    doc.reactions.forEach(function (r, i) { if (r.deliverableId === own.deliverable.id && r.clientId === cur.client.id) idx = i; });
    var existing = idx >= 0 ? doc.reactions[idx] : null;
    if (value === null || (existing && existing.value === value)) {
      if (existing) doc.reactions.splice(idx, 1);   // same value again clears it; no notification for a clear
    } else {
      if (existing) {
        existing.value = value;
        existing.createdAt = nowIso();
      } else {
        doc.reactions.push({ deliverableId: own.deliverable.id, clientId: cur.client.id, value: value, createdAt: nowIso() });
      }
      var verb = value === 'like' ? 'liked' : 'disliked';
      doc.notifications.push(makeNotification('reaction', cur.client.id, own.project.id, own.deliverable.id,
        who(cur.session, cur.client) + ' ' + verb + ' "' + own.deliverable.title + '" in ' + own.project.title + '.', { value: value }));
    }
    saveDoc(doc);
    return { reactions: reactionSummary(doc, own.deliverable.id, cur.client.id) };
  }

  async function localComment(input) {
    input = input || {};
    var doc = loadDoc();
    var cur = currentClient(doc);
    var project = doc.projects.find(function (p) { return p.id === input.projectId && p.clientId === cur.client.id; });
    if (!project) throw fail('not_found', 'Project not found.');
    var deliverable = deliverableIn(doc, input.deliverableId || null, project.id);
    var body = text(input.body, 'Comment', MAX.body);
    var comment = {
      id: uid(), projectId: project.id, deliverableId: deliverable ? deliverable.id : null,
      authorName: nameOf(cur.session), authorRole: 'client', body: body, createdAt: nowIso()
    };
    doc.comments.push(comment);
    var where = deliverable ? '"' + deliverable.title + '" in ' + project.title : project.title;
    doc.notifications.push(makeNotification('comment', cur.client.id, project.id, deliverable ? deliverable.id : null,
      who(cur.session, cur.client) + ' commented on ' + where + ': ' + body, { refId: comment.id }));
    saveDoc(doc);
    return { comment: pubComment(comment) };
  }

  async function localLogout() {
    clearSession();
    return { ok: true };
  }

  // ---------------------------------------------------------------- local: team methods
  function contactsOf(doc, clientId) {
    return doc.contacts.filter(function (k) { return k.clientId === clientId; });
  }

  async function localListClients() {
    var doc = loadDoc();
    return doc.clients
      .slice()
      .sort(function (a, b) { var x = displayName(a).toLowerCase(), y = displayName(b).toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; })
      .map(function (c) { return pubClient(c, contactsOf(doc, c.id)); });
  }

  // A name or a company is needed (either one is enough); everything else is optional. Without a link name, one is made
  // from the name or the company (base, base-2 ... when taken). A link name that was given and is taken is a conflict.
  async function localCreateClient(input) {
    input = input || {};
    var name = optText(input.name, 'Name', MAX.name);
    var company = optText(input.company, 'Company', MAX.name);
    needNameOrCompany(name, company);
    var email = checkEmail(input.email);
    var details = clientDetailsIn(input);
    var given = slugGiven(input.slug);
    var slug = given ? checkSlug(input.slug) : null;
    var code = newCode();
    var salt = toHex(randomBytes(16));
    var hash = await codeHash(salt, code);
    var doc = loadDoc();
    if (given) {
      if (doc.clients.some(function (c) { return c.slug === slug; })) throw fail('conflict', 'That link name is already used.');
    } else {
      slug = freshSlug(doc, name, company);
    }
    var client = { id: uid(), name: name, company: company, email: email, slug: slug, createdAt: nowIso(), codeSalt: salt, codeHash: hash, sv: 1 };
    Object.keys(details).forEach(function (k) { client[k] = details[k]; });
    doc.clients.push(client);
    saveDoc(doc);
    return { client: pubClient(client, []), code: formatCode(code) };
  }

  async function localUpdateClient(id, patch) {
    patch = patch || {};
    var doc = loadDoc();
    var c = findOr(doc.clients, id, 'Client not found.');
    // Name and company are each optional, but the client must keep at least one of them.
    var name = patch.name !== undefined ? optText(patch.name, 'Name', MAX.name) : (c.name || null);
    var company = patch.company !== undefined ? optText(patch.company, 'Company', MAX.name) : (c.company || null);
    if (patch.name !== undefined || patch.company !== undefined) needNameOrCompany(name, company);
    if (patch.name !== undefined) c.name = name;
    if (patch.company !== undefined) c.company = company;
    if (patch.email !== undefined) c.email = checkEmail(patch.email);
    var details = clientDetailsIn(patch);
    Object.keys(details).forEach(function (k) { c[k] = details[k]; });
    if (patch.slug !== undefined) {
      var slug = checkSlug(patch.slug);
      if (doc.clients.some(function (x) { return x.slug === slug && x.id !== c.id; })) throw fail('conflict', 'That link name is already used.');
      c.slug = slug;
    }
    saveDoc(doc);
    return { client: pubClient(c, contactsOf(doc, c.id)) };
  }

  async function localDeleteClient(id) {
    var doc = loadDoc();
    var c = findOr(doc.clients, id, 'Client not found.');
    var projectIds = doc.projects.filter(function (p) { return p.clientId === c.id; }).map(function (p) { return p.id; });
    var deliverables = doc.deliverables.filter(function (d) { return projectIds.indexOf(d.projectId) >= 0; });
    var deliverableIds = deliverables.map(function (d) { return d.id; });
    var refs = fileRefsOf(deliverables)
      .concat(doc.metrics.filter(function (m) { return m.clientId === c.id; }).map(function (m) { return m.screenshotUrl; }));
    doc.reactions = doc.reactions.filter(function (r) { return r.clientId !== c.id && deliverableIds.indexOf(r.deliverableId) < 0; });
    doc.approvals = doc.approvals.filter(function (a) { return deliverableIds.indexOf(a.deliverableId) < 0; });
    doc.comments = doc.comments.filter(function (x) { return projectIds.indexOf(x.projectId) < 0; });
    doc.steps = doc.steps.filter(function (s) { return projectIds.indexOf(s.projectId) < 0; });
    doc.deliverables = doc.deliverables.filter(function (d) { return projectIds.indexOf(d.projectId) < 0; });
    doc.projects = doc.projects.filter(function (p) { return p.clientId !== c.id; });
    doc.notifications = doc.notifications.filter(function (n) { return n.clientId !== c.id && (!n.projectId || projectIds.indexOf(n.projectId) < 0); });
    doc.events = doc.events.filter(function (e) { return projectIds.indexOf(e.projectId) < 0; });
    doc.metrics = doc.metrics.filter(function (m) { return m.clientId !== c.id; });
    delete doc.loginAttempts[c.slug];
    doc.contacts = doc.contacts.filter(function (k) { return k.clientId !== c.id; });
    doc.clients = doc.clients.filter(function (x) { return x.id !== c.id; });
    saveDoc(doc);
    dropUnusedFiles(doc, refs);
    return { ok: true };
  }

  async function localResetCode(id) {
    var code = newCode();
    var salt = toHex(randomBytes(16));
    var hash = await codeHash(salt, code);
    var doc = loadDoc();
    var c = findOr(doc.clients, id, 'Client not found.');
    c.codeSalt = salt;
    c.codeHash = hash;
    c.sv = (c.sv || 0) + 1;   // ends any signed-in session for this client
    saveDoc(doc);
    return { code: formatCode(code) };
  }

  // Contacts: people at a client (team only). Up to MAX.contacts per client; deleting the client removes them.
  async function localCreateContact(input) {
    input = input || {};
    var doc = loadDoc();
    var c = findOr(doc.clients, input.clientId, 'Client not found.');
    var name = text(input.name, 'Name', MAX.name);
    var role = optText(input.role, 'Role', MAX.role);
    var email = checkEmail(input.email);
    var phone = checkPhone(input.phone, 'Phone');
    if (contactsOf(doc, c.id).length >= MAX.contacts) throw fail('invalid', 'A client can have up to ' + MAX.contacts + ' contacts.');
    var contact = { id: uid(), clientId: c.id, name: name, role: role, email: email, phone: phone, createdAt: nowIso() };
    doc.contacts.push(contact);
    saveDoc(doc);
    return { contact: pubContact(contact) };
  }

  async function localUpdateContact(id, patch) {
    patch = patch || {};
    var doc = loadDoc();
    var k = findOr(doc.contacts, id, 'Contact not found.');
    if (patch.name !== undefined) k.name = text(patch.name, 'Name', MAX.name);
    if (patch.role !== undefined) k.role = optText(patch.role, 'Role', MAX.role);
    if (patch.email !== undefined) k.email = checkEmail(patch.email);
    if (patch.phone !== undefined) k.phone = checkPhone(patch.phone, 'Phone');
    saveDoc(doc);
    return { contact: pubContact(k) };
  }

  async function localDeleteContact(id) {
    var doc = loadDoc();
    var k = findOr(doc.contacts, id, 'Contact not found.');
    doc.contacts = doc.contacts.filter(function (x) { return x.id !== k.id; });
    saveDoc(doc);
    return { ok: true };
  }

  async function localListProjects(clientId) {
    var doc = loadDoc();
    return doc.projects
      .filter(function (p) { return !clientId || p.clientId === clientId; })
      .map(function (p) { return projectView(doc, p, null); });
  }

  /**
   * Creates a project. Only clientId is needed. Without a title the project is titled from its template and the client
   * ("Video production · Dar Lusail"), in input.language; without a service it takes the template's key (or 'other').
   * Optional templateKey creates that template's stages and suggested deliverables (drafts with no file),
   * in input.language ('en' by default, or 'ar'). Optional steps: [titles] are added after the template's stages.
   */
  async function localCreateProject(input) {
    input = input || {};
    var doc = loadDoc();
    var owner = findOr(doc.clients, input.clientId, 'Client not found.');
    var status = input.status === undefined ? 'planning' : oneOf(input.status, PROJECT_STATUSES, 'Status');
    var fields = projectFieldsIn(input);
    checkProjectDates(fields.startDate || null, fields.dueDate || null);
    var lang = input.language === undefined || input.language === null ? 'en' : oneOf(input.language, LANGUAGES, 'Language');
    var title = optText(input.title, 'Title', MAX.title) || generatedTitle(fields.templateKey, owner, lang);
    var service = optText(input.service, 'Service', MAX.service) || defaultService(fields.templateKey);
    var template = fields.templateKey ? templateFor(fields.templateKey) : null;
    var stepTitles = [];
    if (input.steps !== undefined && input.steps !== null) {
      if (!Array.isArray(input.steps) || input.steps.length > MAX.steps) throw fail('invalid', 'Steps must be a list of up to 50 titles.');
      stepTitles = input.steps.map(function (t) { return text(t, 'Step', MAX.title); });
    }
    var templateStages = template ? template.steps : [];
    if (templateStages.length + stepTitles.length > MAX.steps) throw fail('invalid', 'A project can have up to 50 stages.');
    var now = nowIso();
    var project = {
      id: uid(), clientId: input.clientId, title: title, service: service, status: status, createdAt: now, updatedAt: now,
      summary: fields.summary || null, ownerName: fields.ownerName || null, priority: fields.priority || null,
      startDate: fields.startDate || null, dueDate: fields.dueDate || null, templateKey: fields.templateKey || null
    };
    doc.projects.push(project);
    var position = 0;
    templateStages.forEach(function (stage) {
      var step = {
        id: uid(), projectId: project.id, position: position++, title: stage.title[lang], status: 'pending', updatedAt: now,
        description: stage.description[lang], ownerName: null, dueDate: null
      };
      doc.steps.push(step);
      stage.deliverables.forEach(function (item) {
        doc.deliverables.push({
          id: uid(), projectId: project.id, stepId: step.id, title: item.title[lang], kind: item.kind, url: null, version: 1, createdAt: now,
          status: 'draft', description: item.description[lang], dueDate: null, fileName: null, fileSize: null
        });
      });
    });
    stepTitles.forEach(function (t) {
      doc.steps.push({ id: uid(), projectId: project.id, position: position++, title: t, status: 'pending', updatedAt: now,
        description: null, ownerName: null, dueDate: null });
    });
    saveDoc(doc);
    return { project: projectView(doc, project, null) };
  }

  async function localUpdateProject(id, patch) {
    patch = patch || {};
    var doc = loadDoc();
    var p = findOr(doc.projects, id, 'Project not found.');
    var by = actorOf(patch);
    var wasStatus = p.status;
    if (patch.title !== undefined) p.title = text(patch.title, 'Title', MAX.title);
    if (patch.service !== undefined) p.service = text(patch.service, 'Service', MAX.service);
    if (patch.status !== undefined) p.status = oneOf(patch.status, PROJECT_STATUSES, 'Status');
    var fields = projectFieldsIn(patch);
    checkProjectDates(
      'startDate' in fields ? fields.startDate : p.startDate,
      'dueDate' in fields ? fields.dueDate : p.dueDate);
    Object.keys(fields).forEach(function (k) { p[k] = fields[k] || null; });   // templateKey only records the template; stages are not changed
    var now = nowIso();
    p.updatedAt = now;
    if (p.status !== wasStatus) logEvent(doc, p.id, 'project', p.id, eventLine('Status', eventStatus(wasStatus), eventStatus(p.status)), by, now);
    saveDoc(doc);
    return { project: projectView(doc, p, null) };
  }

  async function localDeleteProject(id) {
    var doc = loadDoc();
    var p = findOr(doc.projects, id, 'Project not found.');
    var deliverables = doc.deliverables.filter(function (d) { return d.projectId === p.id; });
    var deliverableIds = deliverables.map(function (d) { return d.id; });
    var refs = fileRefsOf(deliverables);
    doc.reactions = doc.reactions.filter(function (r) { return deliverableIds.indexOf(r.deliverableId) < 0; });
    doc.approvals = doc.approvals.filter(function (a) { return deliverableIds.indexOf(a.deliverableId) < 0; });
    doc.comments = doc.comments.filter(function (c) { return c.projectId !== p.id; });
    doc.steps = doc.steps.filter(function (s) { return s.projectId !== p.id; });
    doc.deliverables = doc.deliverables.filter(function (d) { return d.projectId !== p.id; });
    doc.notifications = doc.notifications.filter(function (n) { return n.projectId !== p.id; });
    doc.events = doc.events.filter(function (e) { return e.projectId !== p.id; });
    doc.projects = doc.projects.filter(function (x) { return x.id !== p.id; });
    saveDoc(doc);
    dropUnusedFiles(doc, refs);
    return { ok: true };
  }

  function touchProject(doc, projectId, now) {
    var p = doc.projects.find(function (x) { return x.id === projectId; });
    if (p) p.updatedAt = now;
  }

  // ---------------------------------------------------------------- local: activity log (doc.events)
  // The same rules as the Worker's project_events (portal/worker/src/store.js). One entry for each change the team makes:
  // a project's status; a step's status, due date or owner; a deliverable's status, due date or file. Only a real change is
  // logged, in the same save as the change. Client actions are not logged here (they have their own notifications).
  var ARROW = '→';
  // A value as the log shows it: 'none' when it is not set.
  function eventValue(x) { return x === null || x === undefined || x === '' ? 'none' : String(x); }
  // A status as words: in_progress reads as "in progress".
  function eventStatus(x) { return eventValue(x).replace(/_/g, ' '); }
  function eventLine(label, before, after) { return label + ': ' + before + ' ' + ARROW + ' ' + after; }
  // The name on an entry: the team member's name when the caller gives one (byName), otherwise 'You'.
  function actorOf(input) { return optText(input.byName, 'Name', MAX.owner) || 'You'; }
  // A change to a deliverable's file: added, replaced or removed (a link counts as a file). The name is the file name, or the
  // title when there is none. A rename with the same file is logged as "File name". Null when nothing about the file changed.
  function fileChangeText(kind, beforeUrl, beforeName, afterUrl, afterName, title) {
    var label = kind === 'link' ? 'Link' : 'File';
    var oldUrl = beforeUrl || null;
    var newUrl = afterUrl || null;
    if (oldUrl === newUrl) {
      return (beforeName || null) === (afterName || null) ? null : eventLine('File name', eventValue(beforeName), eventValue(afterName));
    }
    if (!newUrl) return label + ' removed: ' + (beforeName || title);
    return label + ' ' + (oldUrl ? 'replaced' : 'added') + ': ' + (afterName || title);
  }
  function logEvent(doc, projectId, kind, subjectId, change, byName, now) {
    doc.events.push({ id: uid(), projectId: projectId, kind: kind, subjectId: subjectId, change: change, byName: byName, createdAt: now });
  }
  function pubEvent(e) {
    return { id: e.id, projectId: e.projectId, kind: e.kind, subjectId: e.subjectId, change: e.change, byName: e.byName, createdAt: e.createdAt };
  }

  async function localCreateStep(input) {
    input = input || {};
    var doc = loadDoc();
    var p = findOr(doc.projects, input.projectId, 'Project not found.');
    var title = text(input.title, 'Title', MAX.title);
    var status = input.status === undefined ? 'pending' : oneOf(input.status, STEP_STATUSES, 'Status');
    var position = doc.steps
      .filter(function (s) { return s.projectId === p.id; })
      .reduce(function (m, s) { return Math.max(m, s.position + 1); }, 0);
    var fields = stepFieldsIn(input);
    var now = nowIso();
    var step = {
      id: uid(), projectId: p.id, position: position, title: title, status: status, updatedAt: now,
      description: fields.description || null, ownerName: fields.ownerName || null, dueDate: fields.dueDate || null
    };
    doc.steps.push(step);
    p.updatedAt = now;
    saveDoc(doc);
    return { step: pubStep(step) };
  }

  async function localUpdateStep(id, patch) {
    patch = patch || {};
    var doc = loadDoc();
    var s = findOr(doc.steps, id, 'Step not found.');
    var by = actorOf(patch);
    var was = { status: s.status, dueDate: s.dueDate, ownerName: s.ownerName };
    if (patch.title !== undefined) s.title = text(patch.title, 'Title', MAX.title);
    if (patch.status !== undefined) s.status = oneOf(patch.status, STEP_STATUSES, 'Status');
    var fields = stepFieldsIn(patch);
    Object.keys(fields).forEach(function (k) { s[k] = fields[k]; });
    var now = nowIso();
    s.updatedAt = now;
    touchProject(doc, s.projectId, now);
    if (s.status !== was.status) logEvent(doc, s.projectId, 'step', s.id, eventLine('Status', eventStatus(was.status), eventStatus(s.status)), by, now);
    if ('dueDate' in fields && eventValue(fields.dueDate) !== eventValue(was.dueDate)) {
      logEvent(doc, s.projectId, 'step', s.id, eventLine('Due date', eventValue(was.dueDate), eventValue(s.dueDate)), by, now);
    }
    if ('ownerName' in fields && eventValue(fields.ownerName) !== eventValue(was.ownerName)) {
      logEvent(doc, s.projectId, 'step', s.id, eventLine('Owner', eventValue(was.ownerName), eventValue(s.ownerName)), by, now);
    }
    saveDoc(doc);
    return { step: pubStep(s) };
  }

  async function localMoveStep(id, position) {
    var doc = loadDoc();
    var s = findOr(doc.steps, id, 'Step not found.');
    var at = whole(position, 'Position', 0, 9999);
    var siblings = doc.steps
      .filter(function (x) { return x.projectId === s.projectId && x.id !== s.id; })
      .sort(function (a, b) { return a.position - b.position; });
    siblings.splice(Math.min(at, siblings.length), 0, s);
    var now = nowIso();
    siblings.forEach(function (x, i) { x.position = i; });
    touchProject(doc, s.projectId, now);
    saveDoc(doc);
    return { steps: siblings.map(pubStep) };
  }

  async function localDeleteStep(id) {
    var doc = loadDoc();
    var s = findOr(doc.steps, id, 'Step not found.');
    if (doc.deliverables.some(function (d) { return d.stepId === s.id; })) {
      throw fail('conflict', 'Move or delete the deliverables in this step first.');
    }
    doc.steps = doc.steps.filter(function (x) { return x.id !== s.id; });
    doc.steps
      .filter(function (x) { return x.projectId === s.projectId; })
      .sort(function (a, b) { return a.position - b.position; })
      .forEach(function (x, i) { x.position = i; });   // keep positions 0..n-1
    touchProject(doc, s.projectId, nowIso());
    saveDoc(doc);
    return { ok: true };
  }

  async function localCreateDeliverable(input) {
    input = input || {};
    var doc = loadDoc();
    var p = findOr(doc.projects, input.projectId, 'Project not found.');
    var step = findOr(doc.steps, input.stepId, 'Step not found.');
    if (step.projectId !== p.id) throw fail('invalid', 'That step is not in this project.');
    var title = text(input.title, 'Title', MAX.title);
    var kind = oneOf(input.kind, KINDS, 'Kind');
    var url = normUrl(input.url);
    var version = input.version === undefined ? 1 : whole(input.version, 'Version', 1, 999);
    var fields = deliverableFieldsIn(input);
    var by = actorOf(input);
    var now = nowIso();
    var d = {
      id: uid(), projectId: p.id, stepId: step.id, title: title, kind: kind, url: url, version: version, createdAt: now,
      status: fields.status || 'draft', description: fields.description || null, dueDate: fields.dueDate || null,
      fileName: fields.fileName || null, fileSize: fields.fileSize === undefined ? null : fields.fileSize
    };
    doc.deliverables.push(d);
    p.updatedAt = now;
    // A file attached when the deliverable is made is a file added. The other fields start at their defaults, so they are not logged.
    if (d.url) logEvent(doc, p.id, 'file', d.id, fileChangeText(d.kind, null, null, d.url, d.fileName, d.title), by, now);
    saveDoc(doc);
    return { deliverable: pubDeliverable(d) };
  }

  async function localUpdateDeliverable(id, patch) {
    patch = patch || {};
    var doc = loadDoc();
    var d = findOr(doc.deliverables, id, 'Deliverable not found.');
    var oldUrl = d.url;
    var oldName = d.fileName;
    var oldStatus = d.status;
    var oldDue = d.dueDate;
    var by = actorOf(patch);
    if (patch.title !== undefined) d.title = text(patch.title, 'Title', MAX.title);
    if (patch.kind !== undefined) d.kind = oneOf(patch.kind, KINDS, 'Kind');
    if (patch.url !== undefined) d.url = normUrl(patch.url);
    var oldVersion = d.version;
    if (patch.version !== undefined) d.version = whole(patch.version, 'Version', 1, 999);
    var fields = deliverableFieldsIn(patch);
    Object.keys(fields).forEach(function (k) { d[k] = fields[k]; });
    // A new file or a new version needs a fresh review: approved, changes or published goes back to in_review
    // (unless the same patch sets the status).
    if (fields.status === undefined && (d.url !== oldUrl || d.version !== oldVersion) &&
        ['approved', 'changes', 'published'].indexOf(d.status) >= 0) {
      d.status = 'in_review';
    }
    if (patch.stepId !== undefined) {
      var step = findOr(doc.steps, patch.stepId, 'Step not found.');
      if (step.projectId !== d.projectId) throw fail('invalid', 'That step is not in this project.');
      d.stepId = step.id;
    }
    var now = nowIso();
    touchProject(doc, d.projectId, now);
    // The log, in this order: the file, the status, the due date. Only what changed is logged.
    var fileChange = fileChangeText(d.kind, oldUrl, oldName, d.url, d.fileName, d.title);
    if (fileChange) logEvent(doc, d.projectId, 'file', d.id, fileChange, by, now);
    if (d.status !== oldStatus) logEvent(doc, d.projectId, 'deliverable', d.id, eventLine('Status', eventStatus(oldStatus), eventStatus(d.status)), by, now);
    if ('dueDate' in fields && eventValue(fields.dueDate) !== eventValue(oldDue)) {
      logEvent(doc, d.projectId, 'deliverable', d.id, eventLine('Due date', eventValue(oldDue), eventValue(d.dueDate)), by, now);
    }
    saveDoc(doc);
    if (oldUrl !== d.url) dropUnusedFiles(doc, [oldUrl]);
    return { deliverable: pubDeliverable(d) };
  }

  async function localDeleteDeliverable(id) {
    var doc = loadDoc();
    var d = findOr(doc.deliverables, id, 'Deliverable not found.');
    doc.reactions = doc.reactions.filter(function (r) { return r.deliverableId !== d.id; });
    doc.approvals = doc.approvals.filter(function (a) { return a.deliverableId !== d.id; });
    doc.comments = doc.comments.filter(function (c) { return c.deliverableId !== d.id; });
    doc.notifications.forEach(function (n) { if (n.deliverableId === d.id) n.deliverableId = null; });
    doc.deliverables = doc.deliverables.filter(function (x) { return x.id !== d.id; });
    touchProject(doc, d.projectId, nowIso());
    saveDoc(doc);
    dropUnusedFiles(doc, fileRefsOf([d]));
    return { ok: true };
  }

  async function localListMetrics(clientId) {
    var doc = loadDoc();
    return doc.metrics
      .filter(function (m) { return !clientId || m.clientId === clientId; })
      .sort(metricSort)
      .map(pubMetric);
  }

  function metricTaken(doc, clientId, platform, month, exceptId) {
    return doc.metrics.some(function (m) {
      return m.clientId === clientId && m.platform === platform && m.month === month && m.id !== exceptId;
    });
  }

  async function localCreateMetric(input) {
    input = input || {};
    var doc = loadDoc();
    var c = findOr(doc.clients, input.clientId, 'Client not found.');
    var platform = oneOf(input.platform, PLATFORMS, 'Platform');
    var month = monthOf(input.month);
    if (metricTaken(doc, c.id, platform, month, null)) throw fail('conflict', 'There is already a ' + platform + ' entry for ' + month + '.');
    var metric = {
      id: uid(), clientId: c.id, platform: platform, month: month,
      followers: amount(input.followers, 'Followers'), reach: amount(input.reach, 'Reach'),
      engagement: amount(input.engagement, 'Engagement'), impressions: amount(input.impressions, 'Impressions'),
      screenshotUrl: normUrl(input.screenshotUrl), note: optText(input.note, 'Note', MAX.metricNote), createdAt: nowIso()
    };
    doc.metrics.push(metric);
    saveDoc(doc);
    return { metric: pubMetric(metric) };
  }

  async function localUpdateMetric(id, patch) {
    patch = patch || {};
    var doc = loadDoc();
    var m = findOr(doc.metrics, id, 'Metric not found.');
    var oldShot = m.screenshotUrl;
    var platform = patch.platform !== undefined ? oneOf(patch.platform, PLATFORMS, 'Platform') : m.platform;
    var month = patch.month !== undefined ? monthOf(patch.month) : m.month;
    if (metricTaken(doc, m.clientId, platform, month, m.id)) throw fail('conflict', 'There is already a ' + platform + ' entry for ' + month + '.');
    m.platform = platform;
    m.month = month;
    if (patch.followers !== undefined) m.followers = amount(patch.followers, 'Followers');
    if (patch.reach !== undefined) m.reach = amount(patch.reach, 'Reach');
    if (patch.engagement !== undefined) m.engagement = amount(patch.engagement, 'Engagement');
    if (patch.impressions !== undefined) m.impressions = amount(patch.impressions, 'Impressions');
    if (patch.screenshotUrl !== undefined) m.screenshotUrl = normUrl(patch.screenshotUrl);
    if (patch.note !== undefined) m.note = optText(patch.note, 'Note', MAX.metricNote);
    saveDoc(doc);
    if (oldShot !== m.screenshotUrl) dropUnusedFiles(doc, [oldShot]);
    return { metric: pubMetric(m) };
  }

  async function localDeleteMetric(id) {
    var doc = loadDoc();
    var m = findOr(doc.metrics, id, 'Metric not found.');
    doc.metrics = doc.metrics.filter(function (x) { return x.id !== m.id; });
    saveDoc(doc);
    dropUnusedFiles(doc, [m.screenshotUrl]);
    return { ok: true };
  }

  async function localTeamComment(input) {
    input = input || {};
    var doc = loadDoc();
    var p = findOr(doc.projects, input.projectId, 'Project not found.');
    var deliverable = deliverableIn(doc, input.deliverableId || null, p.id);
    var comment = {
      id: uid(), projectId: p.id, deliverableId: deliverable ? deliverable.id : null,
      authorName: 'Miras team', authorRole: 'team', body: text(input.body, 'Comment', MAX.body), createdAt: nowIso()
    };
    doc.comments.push(comment);
    saveDoc(doc);
    return { comment: pubComment(comment) };
  }

  async function localListNotifications(opts) {
    opts = opts || {};
    var doc = loadDoc();
    var all = doc.notifications.slice().reverse();   // newest first
    var unread = all.filter(function (n) { return !n.readAt; }).length;
    var rows = opts.unreadOnly ? all.filter(function (n) { return !n.readAt; }) : all;
    return { items: rows.slice(0, MAX.inbox).map(pubNotification), unread: unread };
  }

  async function localMarkRead(input) {
    var doc = loadDoc();
    var now = nowIso();
    var updated = 0;
    if (input && input.all === true) {
      doc.notifications.forEach(function (n) { if (!n.readAt) { n.readAt = now; updated++; } });
    } else if (input && Array.isArray(input.ids)) {
      if (input.ids.length > MAX.ids) throw fail('invalid', 'Mark up to 100 notifications at a time.');
      var wanted = Object.create(null);
      input.ids.forEach(function (id) { wanted[String(id)] = true; });
      doc.notifications.forEach(function (n) { if (wanted[n.id] && !n.readAt) { n.readAt = now; updated++; } });
    } else {
      throw fail('invalid', 'Send {ids: [...]} or {all: true}.');
    }
    saveDoc(doc);
    return { updated: updated };
  }

  /** The project's activity log, newest first, at most 200 entries. Resolves { events }. */
  async function localListEvents(projectId) {
    var doc = loadDoc();
    findOr(doc.projects, projectId, 'Project not found.');
    var mine = doc.events.filter(function (e) { return e.projectId === projectId; });
    return { events: mine.reverse().slice(0, 200).map(pubEvent) };
  }

  async function localSeed() {
    var doc = loadDoc();
    var slug = 'demo';
    var i = 2;
    while (doc.clients.some(function (c) { return c.slug === slug; })) { slug = 'demo-' + i; i++; }
    var made = await localCreateClient({ name: 'Demo Client', company: 'Demo Co', email: 'demo@example.com', slug: slug });
    var proj = await localCreateProject({
      clientId: made.client.id, title: 'Spring launch', service: 'social', status: 'in_progress',
      summary: 'Launch the spring collection on Instagram and Facebook. Please review the teaser and the final cut by the dates below.',
      ownerName: 'Lina Khalil', priority: 'high', startDate: '2026-09-01', dueDate: '2026-10-30',
      steps: ['Brief', 'Concept', 'Production', 'Review', 'Launch']
    });
    var steps = proj.project.steps;
    // Step descriptions, owners and due dates: one plain sentence each, as the portal shows them.
    var plan = [
      { description: 'We agree the goal, the audience and the messages that must appear.', dueDate: '2026-09-08', ownerName: 'Lina Khalil' },
      { description: 'We share three visual directions for the launch posts.', dueDate: '2026-09-22', ownerName: 'Lina Khalil' },
      { description: 'We produce the teaser and the posts for your review.', dueDate: '2026-10-06', ownerName: 'Omar Haddad' },
      { description: 'You review the final cut and confirm the timing.', dueDate: '2026-10-20', ownerName: 'Lina Khalil' },
      { description: 'The posts and the teaser go live on the agreed dates.', dueDate: '2026-10-30', ownerName: 'Omar Haddad' }
    ];
    for (var k = 0; k < steps.length; k++) {
      await localUpdateStep(steps[k].id, plan[k]);
    }
    await localCreateDeliverable({
      projectId: proj.project.id, stepId: steps[1].id, title: 'Concept board', kind: 'post', url: null, version: 1,
      description: 'Three directions on one board, with the reason for each.', dueDate: '2026-09-22'
    });
    await localCreateDeliverable({
      projectId: proj.project.id, stepId: steps[2].id, title: 'Teaser cut', kind: 'link', url: 'https://example.com/teaser', version: 1,
      description: 'A 30-second teaser for the launch. Open the link to watch it.', dueDate: '2026-10-06', status: 'in_review'
    });
    await localCreateMetric({ clientId: made.client.id, platform: 'instagram', month: '2026-09', followers: 1200, reach: 8400, engagement: 3.2, impressions: 15000, note: 'Demo numbers' });
    return { client: made.client, code: made.code, slug: slug, projectId: proj.project.id };
  }

  // ---------------------------------------------------------------- local: preview (a client's page, no code)
  // Local only. The session is marked preview, so what the client does shows as "(preview)" to the team. The same rules and
  // notifications apply; nothing else changes.
  async function localPreviewClient(slug) {
    var s = String(slug == null ? '' : slug).trim().toLowerCase();
    var doc = loadDoc();
    var client = s ? doc.clients.find(function (c) { return c.slug === s; }) : null;
    // A sample link opened in a browser that has no sample yet: load the sample first, so the preview just works
    if (!client && s && SAMPLE_SLUGS.indexOf(s) >= 0) {
      await localLoadSample();
      doc = loadDoc();
      client = doc.clients.find(function (c) { return c.slug === s; }) || null;
    }
    if (!client) throw fail('not_found', 'No client uses that link name.');
    var contact = contactsOf(doc, client.id)[0];
    writeSession({ clientId: client.id, name: contact ? contact.name : (displayName(client) || 'Client'), sv: client.sv, exp: Date.now() + SESSION_MS, preview: true });
    return {
      client: { id: client.id, name: client.name || null, company: client.company || null },
      projectCount: doc.projects.filter(function (p) { return p.clientId === client.id; }).length
    };
  }

  // ---------------------------------------------------------------- local: sample data (the admin's "Load sample data")
  // Three clients with projects, steps, files, comments, approvals, reactions and numbers. Everything goes through the normal
  // methods, so every rule applies. Client actions use the real sign-in with each sample code, and the codes are not kept.
  // doc.sample lists the ids that were made, so clearSample removes exactly those records and nothing else.
  var SAMPLE_FILES = {
    bahr1: 'work/bahr-1.jpg', bahr2: 'work/bahr-2.jpg', bahr3: 'work/bahr-3.jpg',
    noor1: 'work/noor-1.jpg', noor2: 'work/noor-2.jpg', noor3: 'work/noor-3.jpg',
    halwa1: 'work/halwa-1.jpg', poster: 'film/d/f0120.jpg'
  };
  var SAMPLE_NOTE = 'Sample client. Remove it with the sample data.';
  var sampleJob = null;   // the load in progress, if any

  // Records an id the sample made, in doc.sample (saved at once, so a failed load can still be rolled back).
  function sampleTrack(kind, id) {
    var doc = loadDoc();
    if (!doc.sample) doc.sample = { clientIds: [], projectIds: [] };
    doc.sample[kind].push(id);
    saveDoc(doc);
  }

  // One image from the site folder, by its address on this origin (the site's own files, so nothing is copied into storage).
  // Resolves { ref, name, size }; size is not known without reading the file, so it is null.
  function sampleFile(key) {
    var path = SAMPLE_FILES[key];
    if (!ASSET_BASE) throw fail('server', 'Could not find the site folder for the sample images.');
    return { ref: new URL(path, ASSET_BASE).href, name: path.split('/').pop(), size: null };
  }

  async function sampleClient(spec) {
    var made = await localCreateClient({ name: spec.name, company: spec.company, email: spec.email, slug: spec.slug, industry: spec.industry, notes: SAMPLE_NOTE });
    sampleTrack('clientIds', made.client.id);
    await localCreateContact({ clientId: made.client.id, name: spec.contact, role: spec.role, email: spec.contactEmail });
    return { id: made.client.id, slug: spec.slug, name: spec.contact, code: made.code };
  }

  // A project made from its template, with the template's stages and drafts replaced by the sample's own stages. Steps start
  // pending; their final statuses are set once the client has acted (sampleStatuses).
  async function sampleProject(clientId, spec) {
    var made = await localCreateProject({
      clientId: clientId, title: spec.title, service: spec.service, status: 'in_progress', templateKey: spec.templateKey, language: 'en',
      summary: spec.summary, ownerName: spec.owner, priority: spec.priority, startDate: spec.start || null, dueDate: spec.due || null
    });
    var p = made.project;
    sampleTrack('projectIds', p.id);
    for (var i = 0; i < p.deliverables.length; i++) await localDeleteDeliverable(p.deliverables[i].id);
    for (var j = 0; j < p.steps.length; j++) await localDeleteStep(p.steps[j].id);
    var steps = {};
    for (var k = 0; k < spec.steps.length; k++) {
      var st = spec.steps[k];
      steps[st.key] = (await localCreateStep({ projectId: p.id, title: st.title, description: st.description, status: 'pending', ownerName: spec.owner })).step.id;
    }
    return { id: p.id, steps: steps, spec: spec };
  }

  async function sampleStatuses(project) {
    for (var i = 0; i < project.spec.steps.length; i++) {
      var st = project.spec.steps[i];
      await localUpdateStep(project.steps[st.key], { status: st.status });
    }
  }

  // A file (or a text item with no file yet) in one stage. Resolves the deliverable id.
  async function sampleItem(project, stepKey, item) {
    var img = item.file ? sampleFile(item.file) : null;
    var made = await localCreateDeliverable({
      projectId: project.id, stepId: project.steps[stepKey], title: item.title, kind: item.kind, url: img ? img.ref : null, version: 1,
      description: item.description, status: item.status, fileName: img ? img.name : null, fileSize: img ? img.size : null
    });
    return made.deliverable.id;
  }

  // Runs actions as the client, through the real sign-in. The code is used here and then dropped.
  async function asSampleClient(c, fn) {
    await localClient.login({ slug: c.slug, code: c.code, name: c.name });
    try { await fn(); } finally { await localClient.logout(); c.code = null; }
  }

  async function sampleMetrics(clientId, rows) {
    for (var i = 0; i < rows.length; i++) await localCreateMetric(Object.assign({ clientId: clientId }, rows[i]));
  }

  async function buildSample() {
    // Dar Lusail Properties: a film project, with storyboard frames, a rough cut and two platforms of numbers.
    var dar = await sampleClient({ name: 'Dar Lusail Properties', company: 'Dar Lusail Properties', email: 'dar@example.com', slug: 'dar-lusail', industry: 'Real estate', contact: 'Maryam Al-Thani', role: 'Marketing manager', contactEmail: 'maryam@example.com' });
    var dp = await sampleProject(dar.id, {
      title: 'Tower launch film and social', service: 'video', templateKey: 'video', owner: 'Sara Haddad', priority: 'high', start: '2026-09-01', due: '2026-11-30',
      summary: 'A launch film for the Lusail tower, with cut-downs for Instagram and LinkedIn.',
      steps: [
        { key: 'brief', title: 'Brief', description: 'We agree the goal, the audience and the messages.', status: 'approved' },
        { key: 'script', title: 'Script', description: 'The spoken lines and the order of the scenes.', status: 'approved' },
        { key: 'storyboard', title: 'Storyboard', description: 'One frame per shot. Review each frame.', status: 'waiting' },
        { key: 'rough', title: 'Rough cut', description: 'The first edit, with temporary music.', status: 'waiting' },
        { key: 'final', title: 'Final cut', description: 'Colour, sound and final titles.', status: 'pending' },
        { key: 'delivery', title: 'Delivery', description: 'Final films for web and social.', status: 'pending' }
      ]
    });
    var f1 = await sampleItem(dp, 'storyboard', { title: 'Frame 1: Opening', kind: 'image', file: 'bahr1', description: 'Frame 1 of 3.', status: 'in_review' });
    var f2 = await sampleItem(dp, 'storyboard', { title: 'Frame 2: Tower reveal', kind: 'image', file: 'bahr2', description: 'Frame 2 of 3.', status: 'in_review' });
    await sampleItem(dp, 'storyboard', { title: 'Frame 3: Closing shot', kind: 'image', file: 'bahr3', description: 'Frame 3 of 3.', status: 'in_review' });
    var poster = sampleFile('poster');
    var rough = await sampleItem(dp, 'rough', { title: 'Rough cut, version 1', kind: 'video', file: null, description: 'This is a video file. The link is added later.', status: 'in_review' });
    var roughDoc = loadDoc();
    roughDoc.deliverables.forEach(function (d) { if (d.id === rough) d.posterUrl = poster.ref; });
    saveDoc(roughDoc);
    // The client's decisions and comments, through the real flow.
    await asSampleClient(dar, async function () {
      await localClient.approve({ deliverableId: f1, decision: 'approve' });
      await localClient.react({ deliverableId: f1, value: 'like' });
      await localClient.approve({ deliverableId: f2, decision: 'changes', note: 'Warmer light on the glass, please.' });
      await localClient.react({ deliverableId: f2, value: 'dislike' });
      await localClient.comment({ projectId: dp.id, deliverableId: f2, body: 'Can the tower appear earlier in the opening?' });
    });
    await localTeamComment({ projectId: dp.id, deliverableId: f2, body: 'Yes. We will move the tower into the first five seconds in the next version.' });
    await sampleStatuses(dp);
    await sampleMetrics(dar.id, [
      { platform: 'instagram', month: '2026-08', followers: 4820, reach: 61200, engagement: 3.8, impressions: 88400, note: 'The tower teaser drove most of the new followers.' },
      { platform: 'instagram', month: '2026-09', followers: 5310, reach: 70400, engagement: 4.1, impressions: 97200, note: 'Launch countdown posts ran all month.' },
      { platform: 'linkedin', month: '2026-08', followers: 1240, reach: 9800, engagement: 2.6, impressions: 13100, note: 'Two posts from the project team.' },
      { platform: 'linkedin', month: '2026-09', followers: 1415, reach: 11200, engagement: 2.9, impressions: 14800, note: 'Event invitations brought most of the reach.' }
    ]);

    // Sidra Coffee Roasters: a monthly social plan with post designs waiting for the client, and three months of Instagram numbers.
    var sc = await sampleClient({ name: 'Sidra Coffee Roasters', company: 'Sidra Coffee Roasters', email: 'sidra@example.com', slug: 'sidra-coffee', industry: 'Food and drink', contact: 'Khalid', role: 'Owner', contactEmail: 'khalid@example.com' });
    var sp = await sampleProject(sc.id, {
      title: 'Monthly social media, April', service: 'social', templateKey: 'social', owner: 'Omar Haddad', priority: 'normal',
      summary: 'The posts for the month on Instagram: plan, designs, captions and publishing.',
      steps: [
        { key: 'plan', title: 'Plan', description: 'The themes and the posting dates for the month.', status: 'approved' },
        { key: 'designs', title: 'Post designs', description: 'One design per post. Review each post.', status: 'waiting' },
        { key: 'captions', title: 'Captions', description: 'The words under each post, in Arabic and English.', status: 'pending' },
        { key: 'publishing', title: 'Publishing', description: 'Posts go live on the agreed dates.', status: 'pending' }
      ]
    });
    await sampleItem(sp, 'designs', { title: 'Post 1 of 3', kind: 'post', file: 'noor1', description: 'Post 1 of 3 for the month.', status: 'in_review' });
    await sampleItem(sp, 'designs', { title: 'Post 2 of 3', kind: 'post', file: 'noor2', description: 'Post 2 of 3 for the month.', status: 'in_review' });
    await sampleItem(sp, 'designs', { title: 'Post 3 of 3', kind: 'post', file: 'noor3', description: 'Post 3 of 3 for the month.', status: 'in_review' });
    await sampleStatuses(sp);
    await sampleMetrics(sc.id, [
      { platform: 'instagram', month: '2026-07', followers: 2140, reach: 18600, engagement: 3.1, impressions: 25400, note: 'Start of the series.' },
      { platform: 'instagram', month: '2026-08', followers: 2390, reach: 20900, engagement: 3.4, impressions: 27900, note: 'Weekly roasting posts.' },
      { platform: 'instagram', month: '2026-09', followers: 2760, reach: 24800, engagement: 3.7, impressions: 31200, note: 'A new blend launch.' }
    ]);

    // Qatar Heritage Walks: a website refresh. The wireframe is approved; the design has changes requested with the client's note.
    var hc = await sampleClient({ name: 'Qatar Heritage Walks', company: 'Qatar Heritage Walks', email: 'heritage@example.com', slug: 'heritage-walks', industry: 'Tourism', contact: 'Aisha Rahman', role: 'Programme lead', contactEmail: 'aisha@example.com' });
    var hp = await sampleProject(hc.id, {
      title: 'Website refresh', service: 'web', templateKey: 'web', owner: 'Sara Haddad', priority: 'normal', start: '2026-09-15', due: '2026-12-20',
      summary: 'A new website for the walking tours: pages, design and the booking link.',
      steps: [
        { key: 'discovery', title: 'Discovery', description: 'What visitors need and what the site must do.', status: 'approved' },
        { key: 'wireframes', title: 'Wireframes', description: 'The page layout, before colour and photos.', status: 'approved' },
        { key: 'design', title: 'Design', description: 'The look of the main pages.', status: 'changes' },
        { key: 'build', title: 'Build', description: 'The site is built and tested.', status: 'pending' }
      ]
    });
    var hw = await sampleItem(hp, 'wireframes', { title: 'Home page wireframe', kind: 'image', file: 'halwa1', description: 'The home page layout.', status: 'in_review' });
    var hd = await sampleItem(hp, 'design', { title: 'Home page design', kind: 'image', file: null, description: 'The look of the home page. The file is added when it is ready.', status: 'in_review' });
    await asSampleClient(hc, async function () {
      await localClient.approve({ deliverableId: hw, decision: 'approve' });
      await localClient.approve({ deliverableId: hd, decision: 'changes', note: 'Please make the Arabic headline larger, and show the walk map on the first screen.' });
    });
    await sampleStatuses(hp);
    [dar, sc, hc].forEach(function (c) { c.code = null; });   // the codes are only needed to sign in above; they are not kept
  }

  // Counts of what the sample holds now (zeros when it is not loaded).
  function sampleSummary(doc) {
    var rec = doc.sample || { clientIds: [], projectIds: [] };
    var projects = doc.projects.filter(function (p) { return rec.projectIds.indexOf(p.id) >= 0; });
    var projectIds = projects.map(function (p) { return p.id; });
    return {
      loaded: !!doc.sample,
      clients: doc.clients.filter(function (c) { return rec.clientIds.indexOf(c.id) >= 0; }).length,
      projects: projects.length,
      steps: doc.steps.filter(function (s) { return projectIds.indexOf(s.projectId) >= 0; }).length,
      deliverables: doc.deliverables.filter(function (d) { return projectIds.indexOf(d.projectId) >= 0; }).length,
      metrics: doc.metrics.filter(function (m) { return rec.clientIds.indexOf(m.clientId) >= 0; }).length
    };
  }

  // A call while a load is running waits for that load (it does not start a second one).
  async function localLoadSample() {
    if (sampleJob) return sampleJob;
    var doc = loadDoc();
    if (doc.sample) return sampleSummary(doc);
    SAMPLE_SLUGS.forEach(function (slug) {
      if (doc.clients.some(function (c) { return c.slug === slug; })) {
        throw fail('conflict', 'A client already uses the link name "' + slug + '". Rename or remove that client first.');
      }
    });
    sampleJob = runSampleLoad();
    try {
      return await sampleJob;
    } finally {
      sampleJob = null;
    }
  }

  // Builds the sample. A failure removes whatever was made, so a half-loaded sample is never left behind.
  async function runSampleLoad() {
    try {
      await buildSample();
    } catch (e) {
      try { await localClearSample(); } catch (e2) { /* the first error is the one to report */ }
      throw e;
    }
    return sampleSummary(loadDoc());
  }

  // Removes exactly the ids doc.sample lists: the projects first, then the clients (with their contacts and numbers).
  async function localClearSample() {
    var rec = loadDoc().sample;
    if (!rec) return { clients: 0, projects: 0 };
    var projects = 0, clients = 0;
    for (var i = 0; i < rec.projectIds.length; i++) {
      try { await localDeleteProject(rec.projectIds[i]); projects++; } catch (e) { if (!e || e.code !== 'not_found') throw e; }
    }
    for (var j = 0; j < rec.clientIds.length; j++) {
      try { await localDeleteClient(rec.clientIds[j]); clients++; } catch (e) { if (!e || e.code !== 'not_found') throw e; }
    }
    var after = loadDoc();
    delete after.sample;
    saveDoc(after);
    return { clients: clients, projects: projects };
  }

  // ---------------------------------------------------------------- remote: HTTP
  var KNOWN_CODES = ['unauthorised', 'not_found', 'invalid', 'conflict', 'server'];
  var STATUS_CODE = { 400: 'invalid', 401: 'unauthorised', 403: 'unauthorised', 404: 'not_found', 409: 'conflict', 413: 'invalid', 415: 'invalid', 422: 'invalid', 429: 'unauthorised' };

  function httpError(status, data) {
    var code = data && KNOWN_CODES.indexOf(data.error) >= 0 ? data.error : (STATUS_CODE[status] || 'server');
    var message = data && typeof data.message === 'string' ? data.message : code;
    var extra = { status: status };
    if (data && data.reason) extra.reason = data.reason;
    if (data && typeof data.retryAfter === 'number') extra.retryAfter = data.retryAfter;
    return fail(code, message, extra);
  }

  async function rq(method, path, body) {
    var opts = { method: method, credentials: 'include', headers: { Accept: 'application/json' } };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    var res, raw;
    try {
      res = await fetch(BASE + path, opts);
      raw = await res.text();
    } catch (e) {
      throw fail('server', 'Network error. Check your connection and try again.');
    }
    var data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
    if (!res.ok) throw httpError(res.status, data);
    if (data === null || typeof data !== 'object') throw fail('server', 'Unexpected response from the server.');
    return data;
  }

  function enc(v) { return encodeURIComponent(String(v)); }

  async function remoteUpload(file) {
    checkFile(file);
    var res, raw;
    try {
      res = await fetch(BASE + '/api/admin/upload', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': file.type }, body: file
      });
      raw = await res.text();
    } catch (e) {
      throw fail('server', 'Network error. Check your connection and try again.');
    }
    var data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
    if (!res.ok) throw httpError(res.status, data);
    if (!data || typeof data.url !== 'string') throw fail('server', 'Unexpected response from the server.');
    return { url: data.url };
  }

  // ---------------------------------------------------------------- public surface
  var localClient = {
    /** Signs in with a link name and code; the name is optional (blank means the client's own name or company). Local: keeps the session in sessionStorage. Resolves { client, projectCount }. */
    login: localLogin,
    /** The signed-in client's projects, steps, deliverables (with reactions and approval), comments and metrics. */
    project: localProject,
    /** Approves or asks for changes on one of the client's deliverables. Resolves { approval }. */
    approve: localApprove,
    /** Sets the client's like or dislike on a deliverable. The same value again clears it. Resolves { reactions }. */
    react: localReact,
    /** Adds a comment to one of the client's projects, optionally on one deliverable. Resolves { comment }. */
    comment: localComment,
    /** Ends the client session in this browser. */
    logout: localLogout
  };

  var localAdmin = {
    /** All clients (never the code or its hash), sorted by name. */
    listClients: localListClients,
    /** Creates a client and a code. A name or a company is needed (either one); the link name is made from them when not given. Resolves { client, code }; the code is shown once. */
    createClient: localCreateClient,
    /** Changes name, company, email, slug or the other details. A client keeps at least a name or a company. Resolves { client }. */
    updateClient: localUpdateClient,
    /** Deletes the client and all their projects, files, metrics, reactions and notifications. */
    deleteClient: localDeleteClient,
    /** Replaces the client's code. The old code and any open client session stop working. Resolves { code }. */
    resetCode: localResetCode,
    /** Adds a contact to a client (up to 20). Resolves { contact }. */
    createContact: localCreateContact,
    /** Changes a contact's name, role, email or phone. Resolves { contact }. */
    updateContact: localUpdateContact,
    /** Deletes a contact. */
    deleteContact: localDeleteContact,
    /** Projects (optionally for one client) with steps, deliverables, approvals and comments. */
    listProjects: localListProjects,
    /** Creates a project. Only clientId is needed: a missing title is made from the template and the client. Resolves { project }. */
    createProject: localCreateProject,
    /** Changes title, service or status. Resolves { project }. */
    updateProject: localUpdateProject,
    /** Deletes a project with everything under it. */
    deleteProject: localDeleteProject,
    /** Adds a step at the end of a project. Resolves { step }. */
    createStep: localCreateStep,
    /** Changes a step's title or status. Resolves { step }. */
    updateStep: localUpdateStep,
    /** Moves a step to a 0-based position. Resolves { steps } for the whole project. */
    moveStep: localMoveStep,
    /** Deletes a step. Refused with 'conflict' while it still has deliverables. */
    deleteStep: localDeleteStep,
    /** Adds a deliverable to a step of a project. Resolves { deliverable }. */
    createDeliverable: localCreateDeliverable,
    /** Changes title, kind, url, version or step (within the same project). Resolves { deliverable }. */
    updateDeliverable: localUpdateDeliverable,
    /** Deletes a deliverable with its reactions, approvals and comments. */
    deleteDeliverable: localDeleteDeliverable,
    /** Metrics (optionally for one client), newest month first. */
    listMetrics: localListMetrics,
    /** Adds a monthly metric. One entry per client, platform and month. Resolves { metric }. */
    createMetric: localCreateMetric,
    /** Changes a metric. Resolves { metric }. */
    updateMetric: localUpdateMetric,
    /** Deletes a metric. */
    deleteMetric: localDeleteMetric,
    /** Adds a team comment to a project, optionally on one deliverable. Resolves { comment }. */
    teamComment: localTeamComment,
    /** Uploads a file (PNG, JPEG, WebP, GIF, AVIF, MP4 or PDF, up to 25 MB). Resolves { url, ref } locally, { url } remotely. */
    upload: localUpload,
    /** The team inbox, newest first, at most 200 items. Resolves { items, unread }. */
    listNotifications: localListNotifications,
    /** Marks notifications read: { ids: [...] } (up to 100) or { all: true }. Resolves { updated }. */
    markRead: localMarkRead,
    /** A project's activity log, newest first, at most 200 entries. Resolves { events }. Team only. */
    listEvents: localListEvents
  };

  var remoteClient = {
    /** Signs in with a link name and code; the name is optional. Remote: the Worker sets an HttpOnly session cookie. */
    login: function (input) {
      input = input || {};
      return rq('POST', '/api/client/login', { slug: input.slug, code: input.code, name: input.name });
    },
    /** The signed-in client's projects, steps, deliverables, comments and metrics. */
    project: function () { return rq('GET', '/api/client/project'); },
    /** Approves or asks for changes on one of the client's deliverables. Resolves { approval }. */
    approve: function (input) { return rq('POST', '/api/client/approve', input || {}); },
    /** Sets the client's like or dislike on a deliverable. The same value again clears it. Resolves { reactions }. */
    react: function (input) { return rq('POST', '/api/client/react', input || {}); },
    /** Adds a comment to one of the client's projects. Resolves { comment }. */
    comment: function (input) { return rq('POST', '/api/client/comment', input || {}); },
    /** Ends the session and clears the cookie. */
    logout: function () { return rq('POST', '/api/client/logout', {}); }
  };

  var remoteAdmin = {
    /** All clients (never the code or its hash). */
    listClients: function () { return rq('GET', '/api/admin/clients'); },
    /** Creates a client and a code. A name or a company is needed (either one). Resolves { client, code }; the code is shown once. */
    createClient: function (input) { return rq('POST', '/api/admin/clients', input || {}); },
    /** Changes name, company, email or slug. Resolves { client }. */
    updateClient: function (id, patch) { return rq('PATCH', '/api/admin/clients/' + enc(id), patch || {}); },
    /** Deletes the client and everything under them. */
    deleteClient: function (id) { return rq('DELETE', '/api/admin/clients/' + enc(id)); },
    /** Replaces the client's code. Resolves { code }. */
    resetCode: function (id) { return rq('POST', '/api/admin/clients/' + enc(id) + '/reset-code', {}); },
    /** Adds a contact to a client (up to 20). Resolves { contact }. */
    createContact: function (input) { return rq('POST', '/api/admin/contacts', input || {}); },
    /** Changes a contact's name, role, email or phone. Resolves { contact }. */
    updateContact: function (id, patch) { return rq('PATCH', '/api/admin/contacts/' + enc(id), patch || {}); },
    /** Deletes a contact. */
    deleteContact: function (id) { return rq('DELETE', '/api/admin/contacts/' + enc(id)); },
    /** Projects (optionally for one client) with steps, deliverables, approvals and comments. */
    listProjects: function (clientId) { return rq('GET', '/api/admin/projects' + (clientId ? '?clientId=' + enc(clientId) : '')); },
    /** Creates a project. Only clientId is needed: a missing title is made from the template and the client. Resolves { project }. */
    createProject: function (input) { return rq('POST', '/api/admin/projects', input || {}); },
    /** Changes title, service or status. Resolves { project }. */
    updateProject: function (id, patch) { return rq('PATCH', '/api/admin/projects/' + enc(id), patch || {}); },
    /** Deletes a project with everything under it. */
    deleteProject: function (id) { return rq('DELETE', '/api/admin/projects/' + enc(id)); },
    /** Adds a step at the end of a project. Resolves { step }. */
    createStep: function (input) { return rq('POST', '/api/admin/steps', input || {}); },
    /** Changes a step's title or status. Resolves { step }. */
    updateStep: function (id, patch) { return rq('PATCH', '/api/admin/steps/' + enc(id), patch || {}); },
    /** Moves a step to a 0-based position. Resolves { steps }. */
    moveStep: function (id, position) { return rq('POST', '/api/admin/steps/' + enc(id) + '/move', { position: position }); },
    /** Deletes a step. Refused with 'conflict' while it still has deliverables. */
    deleteStep: function (id) { return rq('DELETE', '/api/admin/steps/' + enc(id)); },
    /** Adds a deliverable to a step of a project. Resolves { deliverable }. */
    createDeliverable: function (input) { return rq('POST', '/api/admin/deliverables', input || {}); },
    /** Changes title, kind, url, version or step. Resolves { deliverable }. */
    updateDeliverable: function (id, patch) { return rq('PATCH', '/api/admin/deliverables/' + enc(id), patch || {}); },
    /** Deletes a deliverable with its reactions, approvals and comments. */
    deleteDeliverable: function (id) { return rq('DELETE', '/api/admin/deliverables/' + enc(id)); },
    /** Metrics (optionally for one client), newest month first. */
    listMetrics: function (clientId) { return rq('GET', '/api/admin/metrics' + (clientId ? '?clientId=' + enc(clientId) : '')); },
    /** Adds a monthly metric. Resolves { metric }. */
    createMetric: function (input) { return rq('POST', '/api/admin/metrics', input || {}); },
    /** Changes a metric. Resolves { metric }. */
    updateMetric: function (id, patch) { return rq('PATCH', '/api/admin/metrics/' + enc(id), patch || {}); },
    /** Deletes a metric. */
    deleteMetric: function (id) { return rq('DELETE', '/api/admin/metrics/' + enc(id)); },
    /** Adds a team comment to a project. Resolves { comment }. */
    teamComment: function (input) { return rq('POST', '/api/admin/comments', input || {}); },
    /** Uploads a file to R2. Resolves { url } where url is /files/<key>. */
    upload: remoteUpload,
    /** The team inbox, newest first. Resolves { items, unread }. */
    listNotifications: function (opts) { return rq('GET', '/api/admin/inbox' + (opts && opts.unreadOnly ? '?unreadOnly=1' : '')); },
    /** Marks notifications read: { ids: [...] } or { all: true }. Resolves { updated }. */
    markRead: function (input) { return rq('POST', '/api/admin/inbox/read', input || {}); },
    /** A project's activity log, newest first, at most 200 entries. Resolves { events }. Team only. */
    listEvents: function (projectId) { return rq('GET', '/api/admin/projects/' + enc(projectId) + '/events'); }
  };

  /**
   * Resolves a stored url to something an <img>, <video>, <a> or <iframe> can load.
   * Local: idb:portal refs become a blob: URL made from IndexedDB (cached per page). Remote: /files/<key> becomes an absolute URL;
   * with { team: true } (the admin dashboard) it becomes /api/admin/files/<key>, which sits behind Cloudflare Access.
   * Returns '' when the url is empty, unknown or the file is missing. Never returns javascript: or data: URLs.
   */
  async function fileUrl(url, options) {
    if (typeof url !== 'string' || !url) return '';
    if (url.indexOf('blob:') === 0) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.indexOf('/files/') === 0) {
      if (MODE !== 'remote') return '';
      var team = !!(options && options.team);
      return BASE + (team ? '/api/admin' : '') + url;
    }
    if (url.indexOf(REF_PREFIX) === 0 && MODE === 'local') return localFileUrl(url);
    return '';
  }

  /**
   * Local mode only: creates a demo client (with a code), a project with five steps, two deliverables and one metric.
   * Used by the tests. Never called automatically. Resolves { client, code, slug, projectId }.
   */
  async function seed() {
    if (MODE !== 'local') throw fail('invalid', 'seed() works in local mode only.');
    return localSeed();
  }

  var PortalAPI = {
    /** 'local' or 'remote', from window.PORTAL_API_BASE. */
    mode: MODE,
    /** Client-side calls (login, project, approve, react, comment, logout). */
    client: MODE === 'remote' ? remoteClient : localClient,
    /** Team-side calls (clients, projects, steps, deliverables, metrics, comments, files, inbox). */
    admin: MODE === 'remote' ? remoteAdmin : localAdmin,
    /** Same as PortalAPI.admin.upload. */
    upload: MODE === 'remote' ? remoteUpload : localUpload,
    fileUrl: fileUrl,
    seed: seed,
    /** Local only. Opens a client's page without a code, for the team's preview. Resolves { client, projectCount }. */
    previewClient: function (slug) { return MODE === 'local' ? localPreviewClient(slug) : Promise.reject(fail('invalid', 'Preview works in local mode only.')); },
    /** Local only. Loads three sample clients with projects, steps, files, comments and numbers. Resolves a count summary. */
    loadSample: function () { return MODE === 'local' ? localLoadSample() : Promise.reject(fail('invalid', 'Sample data works in local mode only.')); },
    /** Local only. Removes exactly the sample records that loadSample made. Resolves { clients, projects }. */
    clearSample: function () { return MODE === 'local' ? localClearSample() : Promise.reject(fail('invalid', 'Sample data works in local mode only.')); },
    /** True when sample data is loaded in this browser (always false in remote mode). */
    sampleLoaded: function () { return MODE === 'local' && !!loadDoc().sample; }
  };

  /** Where data lives right now: 'localStorage' or 'memory' (storage blocked or full) in local mode, 'remote' otherwise. */
  Object.defineProperty(PortalAPI, 'storage', {
    enumerable: true,
    get: function () { return MODE === 'remote' ? 'remote' : (memOnly ? 'memory' : 'localStorage'); }
  });

  global.PortalAPI = PortalAPI;
})(window);
