/* =====================================================================
   MIRAS admin — core runtime (window.MA)
   No framework, no build step. Load order: core.js → data.js → modules/*.js → MA.boot().

   What lives here (see ADMIN.md for the module contract):
     utils · events · storage (localStorage + IndexedDB) · prefs · i18n · icons
     router + module registry · UI kit (modals, drawers, menus, toasts) · charts · sea (tide-line canvas)
     site bridge (talks to ../index.html over postMessage) · content store (draft / published / defaults, undo)
     content fields (bilingual, bound to the draft) · versions · activity · notifications · permissions
     command palette + keyboard shortcuts · shell (sidebar, top bar, customize drawer)
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA = {};
  let actN = 0; // order of content edits and undo toasts (⌘Z undoes whichever came last)

  /* ================= utils ================= */
  const $ = MA.$ = (s, r = document) => r.querySelector(s);
  const $$ = MA.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = MA.esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  MA.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  MA.uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  MA.clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  MA.eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  MA.debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  MA.slug = v => String(v || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  // an inert <template> never loads images or runs handlers, so visitor-supplied text can be stripped safely
  MA.strip = v => { const t = document.createElement('template'); t.innerHTML = String(v ?? ''); return t.content.textContent; };
  MA.isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  /** h('div.card#id', {onclick, style:'..', 'aria-label':..}, ...children) → Element. Children: Node | string (text) | array | null. */
  MA.h = (sel, attrs, ...kids) => {
    if (attrs instanceof Node || typeof attrs === 'string' || Array.isArray(attrs)) { kids.unshift(attrs); attrs = {}; }
    const m = sel.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i) || [];
    const el = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, t, v) => { t === '.' ? el.classList.add(v) : (el.id = v); });
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'class') el.className += ' ' + v;
      else if (k === 'style' && typeof v === 'object') for (const [p, x] of Object.entries(v)) p.startsWith('--') ? el.style.setProperty(p, x) : (el.style[p] = x);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    const add = k => { if (k == null || k === false) return; if (Array.isArray(k)) return k.forEach(add); el.append(k instanceof Node ? k : document.createTextNode(String(k))); };
    kids.forEach(add);
    return el;
  };
  /** Parse an HTML string into a single element (or fragment if several). */
  MA.frag = html => { const t = document.createElement('template'); t.innerHTML = String(html).trim(); return t.content.childElementCount === 1 && t.content.childNodes.length === 1 ? t.content.firstElementChild : t.content; };
  /** Copy text to the clipboard. Resolves true only when the copy really happened; never claims success otherwise.
   *  msg: success toast text (default 'Copied'), or false for no toast. A failure always shows a toast. */
  MA.copy = async (text, msg) => {
    let ok = false;
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(String(text ?? '')); ok = true; } } catch (e) {}
    if (!ok) {
      const prev = document.activeElement, ta = MA.h('textarea', { readOnly: true, 'aria-hidden': 'true', style: 'position:fixed;top:0;inset-inline-start:-9999px;opacity:0' });
      ta.value = String(text ?? ''); document.body.append(ta); ta.select();
      try { ok = document.execCommand('copy') === true; } catch (e) { ok = false; }
      ta.remove(); prev?.focus?.({ preventScroll: true });
    }
    if (!ok) MA.toast(MA.t('copyFailed'), { tone: 'bad' });
    else if (msg !== false) MA.toast(msg || MA.t('copied'));
    return ok;
  };
  MA.download = (name, data, type = 'text/plain') => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type + ';charset=utf-8' });
    const a = MA.h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
  MA.pickFile = ({ accept = '', multiple = false } = {}) => new Promise(res => {
    const inp = MA.h('input', { type: 'file', accept, multiple, style: 'display:none' });
    inp.addEventListener('change', () => { res([...inp.files]); inp.remove(); }); document.body.append(inp); inp.click();
  });
  MA.readText = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
  MA.readDataURL = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  /** CSV helpers (RFC4180-ish). Cells that a spreadsheet would run as a formula (= + - @, tab, CR) get a leading ' unless they are a plain phone number. */
  const CSV_FORMULA = /^[=+\-@\t\r]/, CSV_PHONE = /^\+?[\d\s().-]+$/;
  MA.csv = {
    stringify(rows, cols) {
      const cell = v => {
        v = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v);
        if (CSV_FORMULA.test(v) && !CSV_PHONE.test(v)) v = "'" + v;
        return /[",\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      };
      return '﻿' + [cols.map(c => cell(c.label || c.key)).join(','), ...rows.map(r => cols.map(c => cell(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','))].join('\n');
    },
    parse(text) {
      const rows = []; let row = [], cur = '', q = false; text = String(text).replace(/^﻿/, '');
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
        else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
        else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
        else cur += c;
      }
      if (cur || row.length) { row.push(cur); rows.push(row); }
      const [head, ...body] = rows.filter(r => r.some(x => x.trim()));
      return head ? body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()]))) : [];
    },
  };
  /** Path helpers. Content paths use "/" (text keys contain dots): "text/en/j0.t", "swells/2/ar/steps/1". */
  const segs = p => Array.isArray(p) ? p : String(p).split('/').filter(s => s !== '').map(s => /^\d+$/.test(s) ? +s : s);
  MA.path = {
    get(o, p) { for (const s of segs(p)) { if (o == null) return undefined; o = o[s]; } return o; },
    set(o, p, v) { const ss = segs(p); let cur = o; ss.slice(0, -1).forEach((s, i) => { if (cur[s] == null || typeof cur[s] !== 'object') cur[s] = typeof ss[i + 1] === 'number' ? [] : {}; cur = cur[s]; }); cur[ss.at(-1)] = v; return o; },
    del(o, p) { const ss = segs(p); const parent = MA.path.get(o, ss.slice(0, -1)); if (parent == null) return; Array.isArray(parent) ? parent.splice(ss.at(-1), 1) : delete parent[ss.at(-1)]; },
    join: (...a) => a.flat().join('/'),
    lang: (tpl, l) => String(tpl).replace('{lang}', l),
  };
  /* Search folding, so a Persian keyboard finds Arabic text and the other way round:
     case, compatibility forms, diacritics (tashkeel), tatweel, ZWNJ, ي/ى/ی, ك/ک, أ/إ/آ/ٱ→ا, ة→ه, ؤ→و, ئ→ی, Arabic-Indic and Persian digits → 0-9. */
  const FOLD = { 'ي': 'ی', 'ى': 'ی', 'ئ': 'ی', 'ك': 'ک', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ة': 'ه', 'ۀ': 'ه', 'ؤ': 'و' };
  const foldChar = ch => {
    let out = '';
    for (const x of (FOLD[ch] || ch).normalize('NFKD').toLowerCase()) {
      const c = x.codePointAt(0);
      if ((c >= 0x300 && c <= 0x36F) || (c >= 0x64B && c <= 0x65F) || c === 0x670 || c === 0x640 || (c >= 0x200B && c <= 0x200F) || c === 0x61C) continue;
      if (c >= 0x660 && c <= 0x669) { out += c - 0x660; continue; }
      if (c >= 0x6F0 && c <= 0x6F9) { out += c - 0x6F0; continue; }
      out += FOLD[x] || x;
    }
    return out;
  };
  /** → { f: folded string, map: index in s for every UTF-16 unit of f (plus one past the end) } — used to highlight matches in the original text. */
  MA.foldMap = s => { s = String(s ?? ''); let f = '', i = 0; const map = []; for (const ch of s) { const o = foldChar(ch); for (let k = 0; k < o.length; k++) map.push(i); f += o; i += ch.length; } map.push(i); return { f, map }; };
  const foldMemo = new Map();
  /** Fold text for searching. Use it on both the query and the text: MA.fold(text).includes(MA.fold(q)). */
  MA.fold = s => { s = String(s ?? ''); let v = foldMemo.get(s); if (v === undefined) { v = MA.foldMap(s).f; if (foldMemo.size > 5000) foldMemo.clear(); foldMemo.set(s, v); } return v; };

  /* ================= events ================= */
  const bus = new Map();
  MA.on = (evt, fn) => { (bus.get(evt) || bus.set(evt, new Set()).get(evt)).add(fn); return () => bus.get(evt)?.delete(fn); };
  MA.emit = (evt, data) => { for (const fn of [...(bus.get(evt) || [])]) try { fn(data); } catch (e) { console.error(`[MA] ${evt} handler failed`, e); } };
  /** Subscribe for as long as the current view is mounted (auto-unsubscribed on route change). */
  MA.onView = (evt, fn) => { const off = MA.on(evt, fn); viewCleanups.push(off); return off; };
  const viewCleanups = [];
  /** Run fn when the current page goes away. Returns an unregister function (for things that clean up earlier). */
  MA.cleanup = fn => { viewCleanups.push(fn); return () => { const i = viewCleanups.indexOf(fn); if (i >= 0) viewCleanups.splice(i, 1); }; };

  /* ================= storage ================= */
  const NS = 'miras.admin.';
  MA.db = {
    get(key, fallback) { try { const v = localStorage.getItem(NS + key); return v == null ? MA.clone(fallback) : JSON.parse(v); } catch (e) { return MA.clone(fallback); } },
    set(key, val) { try { localStorage.setItem(NS + key, JSON.stringify(val)); } catch (e) { storageFullToast(); return false; } MA.emit('db:' + key, val); return true; },
    del(key) { try { localStorage.removeItem(NS + key); } catch (e) {} MA.emit('db:' + key, undefined); },
    keys() { try { return Object.keys(localStorage).filter(k => k.startsWith(NS)).map(k => k.slice(NS.length)); } catch (e) { return []; } },
    raw: { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } } },
  };
  let fullToastAt = 0;
  const storageFullToast = () => { if (Date.now() - fullToastAt < 4000) return; fullToastAt = Date.now(); MA.toast(MA.t('storageFull'), { tone: 'bad', ms: 10000, action: { label: MA.t('save.free'), run: () => MA.storage.free() } }); };
  // other tabs (or the site, in the same browser) writing to storage → refresh
  addEventListener('storage', e => {
    if (!e.key) { MA.emit('db:*'); return; }
    if (e.key.startsWith(NS)) MA.emit('db:' + e.key.slice(NS.length), MA.db.get(e.key.slice(NS.length)));
    if (e.key === 'miras.events') MA.emit('site:events');
    if (e.key === 'miras.leads.inbox') MA.emit('site:leads');
    if (e.key === 'miras.cms.draft') MA.emit('sync:draft');
    if (e.key === NS + 'published') MA.emit('sync:published');
  });
  /** Other admin tabs announce draft saves and publishes here too (the storage event covers browsers without BroadcastChannel). */
  const TAB = MA.uid('tab');
  MA.tab = TAB;
  const bc = (() => { try { return new BroadcastChannel('miras-admin'); } catch (e) { return null; } })();
  MA.broadcast = m => { try { bc?.postMessage({ ...m, tab: TAB }); } catch (e) {} };
  if (bc) bc.onmessage = e => { const m = e.data || {}; if (m.tab === TAB) return; if (m.type === 'draft') MA.emit('sync:draft'); else if (m.type === 'published') MA.emit('sync:published'); };
  /** Tiny IndexedDB key/value store for blobs and file handles. Stores: files, handles, kv. */
  MA.idb = (() => {
    let dbp;
    const open = () => dbp ||= new Promise((res, rej) => {
      const r = indexedDB.open('miras-admin', 1);
      r.onupgradeneeded = () => ['files', 'handles', 'kv'].forEach(s => r.result.objectStoreNames.contains(s) || r.result.createObjectStore(s));
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const tx = async (store, mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction(store, mode), s = t.objectStore(store), out = fn(s); t.oncomplete = () => res(out?.result); t.onerror = () => rej(t.error); }); };
    return {
      get: (store, key) => tx(store, 'readonly', s => s.get(key)),
      put: (store, key, val) => tx(store, 'readwrite', s => s.put(val, key)),
      del: (store, key) => tx(store, 'readwrite', s => s.delete(key)),
      keys: (store) => tx(store, 'readonly', s => s.getAllKeys()),
      clear: (store) => tx(store, 'readwrite', s => s.clear()),
    };
  })();

  /* ================= preferences (personalisation) ================= */
  const PREF_DEFAULTS = {
    theme: 'system', accent: 'tide', density: 'comfortable', scale: 'm', corners: 'soft', sidebar: 'expanded', motion: 'system',
    lang: 'en', home: 'overview', navOrder: [], navHidden: [], ambient: true, langLayout: 'side', previewLang: 'en', previewDevice: 'desktop',
    sampleData: true, viewAs: '', dateRange: '30d', me: '', digits: 'auto', calendar: 'gregory',
    singleKeys: true, keymap: {}, previewPanes: {}, // keyboard: bare-key shortcuts on/off and remapped combos {default → yours}; previewPane open/width per page
  };
  let prefs = Object.assign({}, PREF_DEFAULTS, MA.db.get('prefs', {}));
  // An earlier build made the ink ('deep') the default and moved saved blue prefs to it (flag 'accentInk'). Blue is the default again:
  // once, a browser that took that ink default moves back to Tide. This runs on the first load, before anything new can be picked, so
  // every colour chosen in Customize from now on stays.
  if (!MA.db.get('accentTide', false)) { if (MA.db.get('accentInk', false) && prefs.accent === 'deep') { prefs.accent = PREF_DEFAULTS.accent; MA.db.set('prefs', prefs); } MA.db.set('accentTide', true); }
  const mqDark = matchMedia('(prefers-color-scheme: dark)');
  MA.prefs = {
    defaults: PREF_DEFAULTS,
    get: k => k ? prefs[k] : { ...prefs },
    set(k, v) { if (typeof k === 'object') Object.assign(prefs, k); else prefs[k] = v; MA.db.set('prefs', prefs); applyPrefs(); MA.emit('prefs', prefs); },
    reset() { const keep = { me: prefs.me, lang: prefs.lang }; prefs = Object.assign({}, PREF_DEFAULTS, keep); MA.db.set('prefs', prefs); applyPrefs(); MA.emit('prefs', prefs); renderShell(); route(); },
  };
  MA.isDark = () => prefs.theme === 'dark' || (prefs.theme === 'system' && mqDark.matches);
  function applyPrefs() {
    const d = document.documentElement;
    d.dataset.theme = MA.isDark() ? 'dark' : 'light';
    d.dataset.accent = prefs.accent; d.dataset.density = prefs.density; d.dataset.scale = prefs.scale; d.dataset.corners = prefs.corners;
    d.dataset.sidebar = prefs.sidebar; d.dataset.motion = prefs.motion; d.dataset.layoutLangs = prefs.langLayout;
    if (d.lang !== prefs.lang) { d.lang = prefs.lang; d.dir = MA.isRTL() ? 'rtl' : 'ltr'; }
    $('meta[name=theme-color]')?.setAttribute('content', MA.isDark() ? '#0C0F2C' : '#F4F0E7');
    if (prefs.lang === 'fa') loadPersianFont();
  }
  /** Vazirmatn is only needed for the Persian UI: requested the first time Persian is on (non-blocking). */
  function loadPersianFont() { if (document.getElementById('font-fa')) return; document.head.append(MA.h('link', { id: 'font-fa', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300..700&display=swap' })); }
  mqDark.addEventListener?.('change', () => { if (prefs.theme === 'system') { applyPrefs(); MA.emit('prefs', prefs); } });
  MA.reducedMotion = () => prefs.motion === 'reduced' || (prefs.motion === 'system' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ================= i18n (admin UI language) ================= */
  /** Admin UI languages. Site content stays English + Arabic; the admin itself also speaks Persian. */
  MA.LANGS = [{ id: 'en', name: 'English', dir: 'ltr' }, { id: 'ar', name: 'العربية', dir: 'rtl' }, { id: 'fa', name: 'فارسی', dir: 'rtl' }];
  MA.isRTL = (l = prefs.lang) => (MA.LANGS.find(x => x.id === l)?.dir || 'ltr') === 'rtl';
  const DICT = { en: {}, ar: {}, fa: {} };
  /** Add UI strings: { en:{…}, ar:{…}, fa:{…} }. Missing Persian or Arabic falls back to English. */
  MA.i18n = { add(d) { for (const l of Object.keys(DICT)) Object.assign(DICT[l], d[l] || {}); }, has: (key, l = prefs.lang) => key in (DICT[l] || {}) };
  MA.lang = () => prefs.lang;
  const LI = () => ({ en: 0, ar: 1, fa: 2 })[prefs.lang] ?? 0;
  /* Plurals: a dictionary value may be an object of CLDR forms { zero, one, two, few, many, other } (Intl.PluralRules).
     Arabic needs all six ("تعديلان غير منشورين", "١٢ تعديلاً غير منشور"); Persian and English need one/other. `zero`, when given,
     wins for 0 in every language. The count is vars.count, or vars.n (a number, or a formatted string like '۱۲'). */
  const PR = {};
  const pluralCat = (n, l = prefs.lang) => (PR[l] ||= new Intl.PluralRules(l === 'ar' ? 'ar' : l === 'fa' ? 'fa' : 'en')).select(n);
  const countOf = vars => { if (!vars) return 0; if (typeof vars.count === 'number') return vars.count; if (typeof vars.n === 'number') return vars.n; const s = MA.fold(String(vars.n ?? '')).replace(/[^\d.-]/g, ''); return s ? +s : 0; };
  const pickForm = (forms, n, l) => { if (!forms || typeof forms !== 'object') return forms; return (n === 0 && forms.zero != null ? forms.zero : forms[pluralCat(n, l)]) ?? forms.other ?? Object.values(forms)[0] ?? ''; };
  const fill = (s, vars) => { if (!vars) return s; const v = typeof vars.n === 'number' ? { ...vars, n: MA.num(vars.n) } : vars; return String(s).replace(/\{(\w+)\}/g, (m, k) => k in v ? v[k] : m); };
  MA.t = (key, vars) => {
    let l = prefs.lang, s = DICT[l]?.[key]; if (s == null) { l = 'en'; s = DICT.en[key]; } if (s == null) return fill(key, vars);
    return fill(typeof s === 'object' ? pickForm(s, countOf(vars), l) : s, vars);
  };
  /** MA.plural(n, forms, vars?) → the right form for n with {n} filled in (digits follow the preference).
   *  forms: { one, other, … } or per language { en:{…}, ar:{…}, fa:{…} }. */
  MA.plural = (n, forms, vars = {}) => {
    let f = forms, l = prefs.lang;
    if (f && typeof f === 'object' && ('en' in f || 'ar' in f || 'fa' in f)) { if (f[l] == null) l = 'en'; f = f[l]; }
    return fill(pickForm(f, +n || 0, l), { ...vars, n: +n || 0 });
  };
  MA.pluralCat = pluralCat;
  /** Pick a value from a bilingual object {en, ar}. */
  MA.L = o => o == null ? '' : typeof o === 'string' ? o : (o[prefs.lang] ?? o.en ?? '');
  /** Site copy exists in English and Arabic only: show Arabic to an Arabic admin, English otherwise (ADMIN.md rule 3). */
  MA.siteLang = () => prefs.lang === 'ar' ? 'ar' : 'en';
  /** The language of a piece of visitor text: 'ar' or 'fa' for Arabic script (Persian letters → 'fa'), else 'en'. */
  MA.langOf = s => { s = String(s ?? ''); if (!/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(s)) return 'en'; return /[پچژگ]/.test(s) || (/[کی]/.test(s) && !/[ةيك]/.test(s)) ? 'fa' : 'ar'; };
  /**
   * Site copy (or visitor text) shown inside the admin, tagged so screen readers switch voice: <span lang dir=auto>.
   * lang: 'en' | 'ar' | 'auto' (detect, for names and messages people typed). opts: { html: true (keeps <em>/<br>, sanitised), tag, cls }
   * For HTML strings use MA.siteText.attrs(lang) → ' lang="ar" dir="auto"'.
   */
  MA.siteText = (text, lang = MA.siteLang(), { html = false, tag = 'span', cls } = {}) => {
    const l = lang === 'auto' ? MA.langOf(MA.strip(text)) : lang;
    const el = MA.h(tag, { lang: l, dir: 'auto', class: cls || null });
    if (html) el.innerHTML = cleanHTML(String(text ?? '')); else el.textContent = String(text ?? '');
    return el;
  };
  MA.siteText.attrs = (lang = MA.siteLang(), text = '') => ` lang="${lang === 'auto' ? MA.langOf(text) : esc(lang)}" dir="auto"`;
  const nfmt = {};
  // digits: 'auto' = Persian digits for Persian, Western digits otherwise; 'native' = ١٢٣ / ۱۲۳; 'latn' = 123
  const locale = () => {
    const l = prefs.lang, native = prefs.digits === 'native' || (prefs.digits === 'auto' && l === 'fa');
    const nu = native ? (l === 'fa' ? 'arabext' : l === 'ar' ? 'arab' : 'latn') : 'latn';
    return `${l === 'fa' ? 'fa-IR' : l === 'ar' ? 'ar' : 'en-GB'}-u-nu-${nu}-ca-${prefs.calendar || 'gregory'}`;
  };
  MA.locale = locale;
  MA.num = (n, opts = {}) => { const k = locale() + JSON.stringify(opts); return (nfmt[k] ||= new Intl.NumberFormat(locale(), opts)).format(n ?? 0); };
  MA.compact = n => MA.num(n, { notation: 'compact', maximumFractionDigits: 1 });
  MA.pct = (n, d = 0) => MA.num(n, { style: 'percent', maximumFractionDigits: d });
  MA.money = (n, cur = 'QAR') => MA.num(n, { style: 'currency', currency: cur, maximumFractionDigits: 0 });
  MA.date = (d, o = { day: 'numeric', month: 'short', year: 'numeric' }) => new Intl.DateTimeFormat(locale(), o).format(new Date(d));
  MA.time = d => new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(d));
  MA.ago = d => {
    const s = (new Date(d) - Date.now()) / 1000, rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto', style: 'short' });
    const a = Math.abs(s);
    if (a < 45) return MA.t('justNow');
    if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    if (a < 86400 * 7) return rtf.format(Math.round(s / 86400), 'day');
    return MA.date(d, { day: 'numeric', month: 'short' });
  };
  MA.i18n.add({
    en: {
      copied: 'Copied to clipboard.', justNow: 'just now', storageFull: "This browser's storage is full. Export a backup and clear old data.",
      search: 'Search or jump to…', cancel: 'Cancel', save: 'Save', saved: 'Saved', done: 'Done', close: 'Close', delete: 'Delete', remove: 'Remove', edit: 'Edit', add: 'Add', undo: 'Undo', redo: 'Redo', reset: 'Reset', confirm: 'Confirm', back: 'Back', more: 'More', open: 'Open', none: 'None', all: 'All', yes: 'Yes', no: 'No', new: 'New', export: 'Export', import: 'Import', duplicate: 'Duplicate', today: 'Today', yesterday: 'Yesterday',
      'grp.clients': 'Clients', 'grp.work': 'Workspace', 'grp.site': 'Website', 'grp.system': 'Admin',
      publish: 'Publish', published: 'Published', unpublished: 'Unpublished', draft: 'Draft', allPublished: 'All published', nChanges: '{n} unpublished', nChangesOne: '1 unpublished',
      preview: 'Preview', previewSite: 'Preview the site', viewSite: 'Open the site', customize: 'Customize', notifications: 'Notifications', noNotifications: "You're all caught up.", markAllRead: 'Mark all read',
      shortcuts: 'Keyboard shortcuts', collapse: 'Collapse sidebar', expand: 'Expand sidebar', menu: 'Menu',
      noAccess: "Your role can't open this page", noAccessText: 'Ask an owner to change your role, or switch "View as" back in your profile menu.',
      notFound: "That page doesn't exist", notFoundText: 'It may have moved. Try the search, or head back to the overview.', goOverview: 'Go to the overview',
      siteOffline: "Couldn't reach the website", siteOfflineText: 'The admin reads and previews ../index.html. Open it through the same web server as the site (not straight from the file system), then reload.', retry: 'Try again',
      loading: 'Loading…', resetToDefault: 'Reset to default', resetToPublished: 'Discard change', showInPreview: 'Show in preview', copyFromEn: 'Copy from English', changedField: 'Unpublished', staleAr: 'Arabic may be out of date', staleEn: 'English may be out of date', readOnly: 'Read only', italicTip: 'Italic accent (⌘I): shows in the accent colour on the site',
      inspect: 'Click to edit', inspectTip: 'Click any text in the preview to edit it', reload: 'Reload', openNewTab: 'Open in a new tab', desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile',
      'pal.nav': 'Go to', 'pal.actions': 'Actions', 'pal.content': 'Site copy', 'pal.results': 'Results', 'pal.empty': 'Nothing matches "{q}".', 'pal.hint.nav': 'navigate', 'pal.hint.open': 'open', 'pal.hint.close': 'close',
      'k.palette': 'Search and commands', 'k.help': 'Show shortcuts', 'k.sidebar': 'Toggle sidebar', 'k.undo': 'Undo a site edit', 'k.redo': 'Redo a site edit', 'k.checkpoint': 'Save a checkpoint', 'k.preview': 'Toggle preview', 'k.theme': 'Toggle light/dark', 'k.go': 'Go to {name}', 'k.publish': 'Publish',
      'cz.title': 'Customize', 'cz.sub': 'Make the admin yours. Changes save to this browser.', 'cz.appearance': 'Appearance', 'cz.theme': 'Theme', 'cz.light': 'Light', 'cz.dark': 'Dark', 'cz.system': 'System', 'cz.accent': 'Accent', 'cz.density': 'Density', 'cz.comfortable': 'Comfortable', 'cz.compact': 'Compact', 'cz.text': 'Text size', 'cz.corners': 'Corners', 'cz.sharp': 'Sharp', 'cz.soft': 'Soft', 'cz.round': 'Round',
      'cz.layout': 'Layout', 'cz.sidebar': 'Sidebar', 'cz.expanded': 'Expanded', 'cz.collapsed': 'Icons only', 'cz.home': 'Start page', 'cz.langs': 'Bilingual fields', 'cz.side': 'Side by side', 'cz.stack': 'Stacked', 'cz.nav': 'Sidebar items', 'cz.navHint': 'Drag to reorder. Hide what you never use.',
      'cz.motion': 'Motion', 'cz.motionFull': 'Full', 'cz.motionReduced': 'Reduced', 'cz.ambient': 'Living tide lines', 'cz.ambientHint': 'The sea in the sidebar and overview moves with your traffic.', 'cz.language': 'Admin language', 'cz.reset': 'Reset all preferences', 'cz.data': 'Data',
      'cz.sample': 'Show sample data', 'cz.sampleHint': 'Fills charts and the inbox with clearly marked examples until real data arrives.',
      'acc.tide': 'Tide', 'acc.flare': 'Flare', 'acc.foam': 'Foam', 'acc.deep': 'Deep',
      'cz.digits': 'Digits', 'cz.digitsAuto': 'Auto', 'cz.calendar': 'Calendar', 'cz.gregory': 'Gregorian', 'cz.persian': 'Solar Hijri', 'cz.hijri': 'Hijri', 'cz.calendarHint': 'Dates across the admin use this calendar. Stored dates stay the same.',
      viewAs: 'View as', viewAsNote: 'Viewing as {role}. Some pages are locked.', viewAsBack: 'Back to {role}', profile: 'Your profile', signOutNote: 'Accounts are stored in this browser.',
      sampleRibbon: 'Some numbers and briefs are <b>sample data</b>, so you can see how things will look.', sampleHide: 'Hide sample data',
      checkpointSaved: 'Checkpoint saved. Find it in History.', undone: 'Undid: {what}', redone: 'Redid: {what}', nothingToUndo: 'Nothing to undo.',
      'role.owner': 'Owner', 'role.admin': 'Admin', 'role.editor': 'Editor', 'role.sales': 'Sales', 'role.viewer': 'Viewer',
      'sec.top': 'Opening film', 'sec.swells': 'Swells', 'sec.plan': 'Services', 'sec.process': 'Process', 'sec.make': 'What we make', 'sec.studio': 'Studio', 'sec.faq': 'Questions', 'sec.contact': 'Contact', 'sec.foot': 'Footer', 'sec.nav': 'Navigation', 'sec.aria': 'Screen-reader labels', 'sec.other': 'Other copy', 'sec.why': 'Why MIRAS', 'sec.how': 'How we work', 'sec.tag': 'Image captions', 'sec.ui': 'Messages', 'sec.work': 'Selected work', 'sec.cons': 'Consent bar', 'sec.consent': 'Consent bar',
    },
    ar: {
      copied: 'نُسخ.', justNow: 'الآن', storageFull: 'مساحة التخزين في هذا المتصفح ممتلئة. صدّر نسخة احتياطية وامسح البيانات القديمة.',
      search: 'ابحث أو انتقل إلى…', cancel: 'إلغاء', save: 'حفظ', saved: 'حُفظ', done: 'تم', close: 'إغلاق', delete: 'حذف', remove: 'إزالة', edit: 'تعديل', add: 'إضافة', undo: 'تراجع', redo: 'إعادة', reset: 'إعادة ضبط', confirm: 'تأكيد', back: 'رجوع', more: 'المزيد', open: 'فتح', none: 'لا شيء', all: 'الكل', yes: 'نعم', no: 'لا', new: 'جديد', export: 'تصدير', import: 'استيراد', duplicate: 'تكرار', today: 'اليوم', yesterday: 'أمس',
      'grp.clients': 'العملاء', 'grp.work': 'العمل', 'grp.site': 'الموقع', 'grp.system': 'الإدارة',
      publish: 'نشر', published: 'منشور', unpublished: 'غير منشور', draft: 'مسودة', allPublished: 'كل شيء منشور', nChanges: { one: 'تعديل واحد غير منشور', two: 'تعديلان غير منشورين', few: '{n} تعديلات غير منشورة', many: '{n} تعديلاً غير منشور', other: '{n} تعديل غير منشور' }, nChangesOne: 'تعديل واحد غير منشور',
      preview: 'معاينة', previewSite: 'معاينة الموقع', viewSite: 'فتح الموقع', customize: 'تخصيص', notifications: 'الإشعارات', noNotifications: 'لا جديد.', markAllRead: 'تعليم الكل كمقروء',
      shortcuts: 'اختصارات لوحة المفاتيح', collapse: 'طيّ الشريط الجانبي', expand: 'توسيع الشريط الجانبي', menu: 'القائمة',
      noAccess: 'دورك لا يسمح بفتح هذه الصفحة', noAccessText: 'اطلب من المالك تغيير دورك، أو أعد «العرض كـ» إلى دورك من قائمة الملف الشخصي.',
      notFound: 'هذه الصفحة غير موجودة', notFoundText: 'ربما نُقلت. جرّب البحث، أو عد إلى النظرة العامة.', goOverview: 'إلى النظرة العامة',
      siteOffline: 'تعذّر الوصول إلى الموقع', siteOfflineText: 'لوحة الإدارة تقرأ ملف ‎../index.html‎ وتعاينه. افتحها من خادم الويب نفسه الذي يعرض الموقع، ثم أعد التحميل.', retry: 'حاول مجدداً',
      loading: 'جارٍ التحميل…', resetToDefault: 'استرجاع النص الأصلي', resetToPublished: 'تجاهل التعديل', showInPreview: 'أظهره في المعاينة', copyFromEn: 'انسخ من الإنجليزية', changedField: 'غير منشور', staleAr: 'قد تحتاج العربية إلى تحديث', staleEn: 'قد تحتاج الإنجليزية إلى تحديث', readOnly: 'للقراءة فقط', italicTip: 'تمييز (⌘I): يظهر بلون مميز في الموقع',
      inspect: 'انقر للتعديل', inspectTip: 'انقر أي نص في المعاينة لتعديله', reload: 'إعادة التحميل', openNewTab: 'فتح في علامة تبويب جديدة', desktop: 'سطح المكتب', tablet: 'جهاز لوحي', mobile: 'جوال',
      'pal.nav': 'انتقل إلى', 'pal.actions': 'إجراءات', 'pal.content': 'نصوص الموقع', 'pal.results': 'النتائج', 'pal.empty': 'لا نتائج لـ «{q}».', 'pal.hint.nav': 'للتنقل', 'pal.hint.open': 'للفتح', 'pal.hint.close': 'للإغلاق',
      'k.palette': 'البحث والأوامر', 'k.help': 'عرض الاختصارات', 'k.sidebar': 'إظهار الشريط الجانبي وإخفاؤه', 'k.undo': 'التراجع عن تعديل', 'k.redo': 'إعادة تعديل', 'k.checkpoint': 'حفظ نقطة استرجاع', 'k.preview': 'إظهار المعاينة وإخفاؤها', 'k.theme': 'التبديل بين الفاتح والداكن', 'k.go': 'انتقل إلى {name}', 'k.publish': 'نشر',
      'cz.title': 'تخصيص', 'cz.sub': 'اجعل لوحة الإدارة على ذوقك. تُحفظ التغييرات في هذا المتصفح.', 'cz.appearance': 'المظهر', 'cz.theme': 'السمة', 'cz.light': 'فاتح', 'cz.dark': 'داكن', 'cz.system': 'حسب النظام', 'cz.accent': 'اللون المميز', 'cz.density': 'الكثافة', 'cz.comfortable': 'مريحة', 'cz.compact': 'مضغوطة', 'cz.text': 'حجم النص', 'cz.corners': 'الزوايا', 'cz.sharp': 'حادة', 'cz.soft': 'ناعمة', 'cz.round': 'دائرية',
      'cz.layout': 'التخطيط', 'cz.sidebar': 'الشريط الجانبي', 'cz.expanded': 'موسّع', 'cz.collapsed': 'أيقونات فقط', 'cz.home': 'صفحة البداية', 'cz.langs': 'الحقول ثنائية اللغة', 'cz.side': 'جنباً إلى جنب', 'cz.stack': 'فوق بعض', 'cz.nav': 'عناصر الشريط الجانبي', 'cz.navHint': 'اسحب لإعادة الترتيب، وأخفِ ما لا تستخدمه.',
      'cz.motion': 'الحركة', 'cz.motionFull': 'كاملة', 'cz.motionReduced': 'مخفّفة', 'cz.ambient': 'خطوط المدّ الحيّة', 'cz.ambientHint': 'يتحرك البحر في الشريط الجانبي والنظرة العامة مع زوّارك.', 'cz.language': 'لغة لوحة الإدارة', 'cz.reset': 'إعادة ضبط كل التفضيلات', 'cz.data': 'البيانات',
      'cz.sample': 'عرض بيانات تجريبية', 'cz.sampleHint': 'تملأ الرسوم وصندوق الوارد بأمثلة واضحة العلامة حتى تصل البيانات الحقيقية.',
      'acc.tide': 'المدّ', 'acc.flare': 'الوهج', 'acc.foam': 'الزبد', 'acc.deep': 'العمق',
      'cz.digits': 'الأرقام', 'cz.digitsAuto': 'تلقائي', 'cz.calendar': 'التقويم', 'cz.gregory': 'ميلادي', 'cz.persian': 'هجري شمسي', 'cz.hijri': 'هجري', 'cz.calendarHint': 'تظهر التواريخ في لوحة الإدارة بهذا التقويم، ولا تتغير البيانات المحفوظة.',
      viewAs: 'العرض كـ', viewAsNote: 'تعرض اللوحة كـ{role}. بعض الصفحات مقفلة.', viewAsBack: 'العودة إلى {role}', profile: 'ملفك الشخصي', signOutNote: 'الحسابات محفوظة في هذا المتصفح.',
      sampleRibbon: 'بعض الأرقام والطلبات <b>بيانات تجريبية</b> لترى كيف ستبدو الأمور.', sampleHide: 'إخفاء البيانات التجريبية',
      checkpointSaved: 'حُفظت نقطة استرجاع. تجدها في السجل.', undone: 'تراجعنا عن: {what}', redone: 'أعدنا: {what}', nothingToUndo: 'لا شيء للتراجع عنه.',
      'role.owner': 'مالك', 'role.admin': 'مدير', 'role.editor': 'محرّر', 'role.sales': 'مبيعات', 'role.viewer': 'مشاهد',
      'sec.top': 'الفيلم الافتتاحي', 'sec.swells': 'الموجات', 'sec.plan': 'الخدمات', 'sec.process': 'طريقتنا', 'sec.make': 'ما نصنعه', 'sec.studio': 'الاستوديو', 'sec.faq': 'الأسئلة', 'sec.contact': 'التواصل', 'sec.foot': 'التذييل', 'sec.nav': 'التنقل', 'sec.aria': 'تسميات قارئ الشاشة', 'sec.other': 'نصوص أخرى', 'sec.why': 'لماذا ميراس', 'sec.how': 'طريقة عملنا', 'sec.tag': 'تعليقات الصور', 'sec.ui': 'الرسائل', 'sec.work': 'أعمال مختارة', 'sec.cons': 'شريط الموافقة', 'sec.consent': 'شريط الموافقة',
    },
    fa: {
      copied: 'کپی شد.', justNow: 'همین حالا', storageFull: 'حافظهٔ این مرورگر پر است. یک نسخهٔ پشتیبان بگیرید و داده‌های قدیمی را پاک کنید.',
      search: 'جست‌وجو یا رفتن به…', cancel: 'انصراف', save: 'ذخیره', saved: 'ذخیره شد', done: 'تمام', close: 'بستن', delete: 'حذف', remove: 'برداشتن', edit: 'ویرایش', add: 'افزودن', undo: 'واگرد', redo: 'ازنو', reset: 'بازنشانی', confirm: 'تأیید', back: 'بازگشت', more: 'بیشتر', open: 'باز کردن', none: 'هیچ', all: 'همه', yes: 'بله', no: 'خیر', new: 'جدید', export: 'خروجی', import: 'وارد کردن', duplicate: 'تکثیر', today: 'امروز', yesterday: 'دیروز',
      'grp.clients': 'مشتری‌ها', 'grp.work': 'کار', 'grp.site': 'وب‌سایت', 'grp.system': 'مدیریت',
      publish: 'انتشار', published: 'منتشرشده', unpublished: 'منتشرنشده', draft: 'پیش‌نویس', allPublished: 'همه منتشر شده', nChanges: { one: 'یک تغییر منتشرنشده', other: '{n} تغییر منتشرنشده' }, nChangesOne: 'یک تغییر منتشرنشده',
      preview: 'پیش‌نمایش', previewSite: 'پیش‌نمایش سایت', viewSite: 'باز کردن سایت', customize: 'شخصی‌سازی', notifications: 'اعلان‌ها', noNotifications: 'خبر تازه‌ای نیست.', markAllRead: 'همه خوانده شد',
      shortcuts: 'میان‌برهای صفحه‌کلید', collapse: 'جمع کردن نوار کناری', expand: 'باز کردن نوار کناری', menu: 'منو',
      noAccess: 'نقش شما اجازهٔ دیدن این صفحه را ندارد', noAccessText: 'از مالک بخواهید نقشتان را تغییر دهد، یا «مشاهده به‌عنوان» را از منوی نمایه به نقش خودتان برگردانید.',
      notFound: 'این صفحه وجود ندارد', notFoundText: 'شاید جابه‌جا شده باشد. جست‌وجو کنید یا به نمای کلی برگردید.', goOverview: 'رفتن به نمای کلی',
      siteOffline: 'به وب‌سایت دسترسی نداریم', siteOfflineText: 'پنل مدیریت فایل ‎../index.html‎ را می‌خواند و پیش‌نمایش می‌دهد. آن را از همان سروری باز کنید که سایت را نمایش می‌دهد، سپس صفحه را دوباره بارگذاری کنید.', retry: 'تلاش دوباره',
      loading: 'در حال بارگذاری…', resetToDefault: 'بازگرداندن متن اصلی', resetToPublished: 'کنار گذاشتن تغییر', showInPreview: 'نشان دادن در پیش‌نمایش', copyFromEn: 'کپی از انگلیسی', changedField: 'منتشرنشده', staleAr: 'شاید متن عربی به‌روز نباشد', staleEn: 'شاید متن انگلیسی به‌روز نباشد', readOnly: 'فقط خواندنی', italicTip: 'تأکید (⌘I): در سایت با رنگ متمایز نمایش داده می‌شود',
      inspect: 'برای ویرایش کلیک کنید', inspectTip: 'روی هر متنی در پیش‌نمایش کلیک کنید تا ویرایشش کنید', reload: 'بارگذاری دوباره', openNewTab: 'باز کردن در زبانهٔ تازه', desktop: 'دسکتاپ', tablet: 'تبلت', mobile: 'موبایل',
      'pal.nav': 'رفتن به', 'pal.actions': 'کارها', 'pal.content': 'متن‌های سایت', 'pal.results': 'نتیجه‌ها', 'pal.empty': 'چیزی برای «{q}» پیدا نشد.', 'pal.hint.nav': 'جابه‌جایی', 'pal.hint.open': 'باز کردن', 'pal.hint.close': 'بستن',
      'k.palette': 'جست‌وجو و فرمان‌ها', 'k.help': 'نمایش میان‌برها', 'k.sidebar': 'نمایش یا پنهان کردن نوار کناری', 'k.undo': 'واگرد ویرایش سایت', 'k.redo': 'انجام دوبارهٔ ویرایش', 'k.checkpoint': 'ذخیرهٔ نقطهٔ بازگشت', 'k.preview': 'نمایش یا پنهان کردن پیش‌نمایش', 'k.theme': 'جابه‌جایی روشن و تیره', 'k.go': 'رفتن به {name}', 'k.publish': 'انتشار',
      'cz.title': 'شخصی‌سازی', 'cz.sub': 'پنل را مطابق سلیقهٔ خودتان کنید. تغییرات در همین مرورگر ذخیره می‌شوند.', 'cz.appearance': 'ظاهر', 'cz.theme': 'پوسته', 'cz.light': 'روشن', 'cz.dark': 'تیره', 'cz.system': 'مطابق سیستم', 'cz.accent': 'رنگ تأکید', 'cz.density': 'تراکم', 'cz.comfortable': 'راحت', 'cz.compact': 'فشرده', 'cz.text': 'اندازهٔ متن', 'cz.corners': 'گوشه‌ها', 'cz.sharp': 'تیز', 'cz.soft': 'نرم', 'cz.round': 'گرد',
      'cz.layout': 'چیدمان', 'cz.sidebar': 'نوار کناری', 'cz.expanded': 'باز', 'cz.collapsed': 'فقط آیکون', 'cz.home': 'صفحهٔ شروع', 'cz.langs': 'فیلدهای دوزبانه', 'cz.side': 'کنار هم', 'cz.stack': 'زیر هم', 'cz.nav': 'موارد نوار کناری', 'cz.navHint': 'برای تغییر ترتیب بکشید و آنچه را استفاده نمی‌کنید پنهان کنید.',
      'cz.motion': 'حرکت', 'cz.motionFull': 'کامل', 'cz.motionReduced': 'کم', 'cz.ambient': 'خطوط زندهٔ موج', 'cz.ambientHint': 'دریای نوار کناری و نمای کلی با بازدیدکنندگان شما جان می‌گیرد.', 'cz.language': 'زبان پنل', 'cz.reset': 'بازنشانی همهٔ ترجیحات', 'cz.data': 'داده‌ها',
      'cz.sample': 'نمایش دادهٔ نمونه', 'cz.sampleHint': 'تا رسیدن دادهٔ واقعی، نمودارها و صندوق ورودی را با نمونه‌هایی که برچسب روشن دارند پر می‌کند.',
      'acc.tide': 'مد', 'acc.flare': 'شعله', 'acc.foam': 'کف', 'acc.deep': 'ژرفا',
      'cz.digits': 'ارقام', 'cz.digitsAuto': 'خودکار', 'cz.calendar': 'تقویم', 'cz.gregory': 'میلادی', 'cz.persian': 'خورشیدی', 'cz.hijri': 'قمری', 'cz.calendarHint': 'تاریخ‌های پنل با این تقویم نمایش داده می‌شوند؛ داده‌های ذخیره‌شده تغییر نمی‌کنند.',
      viewAs: 'مشاهده به‌عنوان', viewAsNote: 'پنل را به‌عنوان {role} می‌بینید. برخی صفحه‌ها قفل‌اند.', viewAsBack: 'بازگشت به {role}', profile: 'نمایهٔ شما', signOutNote: 'حساب‌ها در همین مرورگر نگه‌داری می‌شوند.',
      sampleRibbon: 'برخی عددها و درخواست‌ها <b>دادهٔ نمونه</b> هستند تا ببینید همه‌چیز چگونه دیده می‌شود.', sampleHide: 'پنهان کردن دادهٔ نمونه',
      checkpointSaved: 'نقطهٔ بازگشت ذخیره شد. آن را در «تاریخچه» پیدا می‌کنید.', undone: 'واگرد شد: {what}', redone: 'دوباره انجام شد: {what}', nothingToUndo: 'چیزی برای واگرد نیست.',
      'role.owner': 'مالک', 'role.admin': 'مدیر', 'role.editor': 'ویراستار', 'role.sales': 'فروش', 'role.viewer': 'بیننده',
      'sec.top': 'فیلم آغازین', 'sec.swells': 'موج‌ها', 'sec.plan': 'خدمات', 'sec.process': 'روش کار', 'sec.make': 'آنچه می‌سازیم', 'sec.studio': 'استودیو', 'sec.faq': 'پرسش‌ها', 'sec.contact': 'تماس', 'sec.foot': 'پانویس', 'sec.nav': 'ناوبری', 'sec.aria': 'برچسب‌های صفحه‌خوان', 'sec.other': 'متن‌های دیگر', 'sec.why': 'چرا میراس', 'sec.how': 'روش کار ما', 'sec.tag': 'زیرنویس تصاویر', 'sec.ui': 'پیام‌ها', 'sec.work': 'نمونه‌کارها', 'sec.cons': 'نوار رضایت', 'sec.consent': 'نوار رضایت',
    },
  });
  // runtime states: saving, cross-tab sync, conflicts with the live site, site errors, notifications stored as keys
  MA.i18n.add({
    en: {
      copyFailed: "Couldn't copy. Select the text and copy it yourself.", pageFailed: 'This page failed to load', adminLabel: 'MIRAS admin',
      'core.you': 'You', 'core.title.founder': 'Founder', 'core.title.producer': 'Producer', 'core.title.partner': 'Client partner', 'core.title.designer': 'Designer',
      'save.notSaved': 'Not saved', 'save.full': "Not saved: this browser's storage is full. Your latest edits are only in this tab.", 'save.free': 'Free space',
      'save.freeTitle': 'Free up space in this browser?', 'save.freeText': 'This removes {autos} automatic checkpoints, {events} old site events and {briefs} brief copies that are already in your inbox. Publishes and checkpoints with a note stay.',
      'save.freed': 'Freed {kb} KB. Your draft is saved.', 'save.freedStill': 'Freed {kb} KB, but storage is still full. Export a backup in Settings and clear old data.', 'save.nothing': 'Nothing left to clear here. Export a backup in Settings, then remove old data.', 'save.again': 'Your draft is saved again.',
      checkpointFailed: "Checkpoint not saved: this browser's storage is full.",
      'conflict.ribbon': 'The live site changed since you started editing.', 'conflict.ribbonN': '{n} of your edits are on copy that changed.', 'conflict.ribbonOne': 'One of your edits is on copy that changed.', 'conflict.review': 'Review',
      'conflict.title': 'The live site changed', 'conflict.intro': 'Someone published, or the site was updated, after you edited these. Choose which version to keep. Nothing goes live until you publish.',
      'conflict.live': 'Live site now', 'conflict.mine': 'Your edit', 'conflict.keepMine': 'Keep mine', 'conflict.takeTheirs': 'Use the live version', 'conflict.keepAll': 'Keep all mine', 'conflict.takeAll': 'Use all live versions',
      'conflict.keptMine': 'Kept your edit.', 'conflict.tookTheirs': 'Using the live version.', 'conflict.empty': '(empty)', 'conflict.undoLabel': 'Use the live version',
      'sync.updated': 'Updated with edits from another tab.', 'sync.clash': 'Edited in two tabs: kept the newer version of {what}.', 'sync.published': 'Published from another tab.',
      'cs.pruned': 'Removed {n} old fields from your draft. The site no longer uses them.', 'cs.prunedOne': 'Removed an old field from your draft. The site no longer uses it.', 'cs.legacy': 'Draft before the update',
      'cs.p.type': '{path}: wrong kind of value, fixed', 'cs.p.missing': '{path}: missing, filled in', 'cs.p.unknown': '{path}: not used by the site any more, removed', 'cs.p.html': '{path}: unsafe code removed',
      'site.contentErr': "The site loaded, but part of its content couldn't be used: {part}.", 'site.openHistory': 'Open History', 'site.cached': "Couldn't reach the live site. You're working on the copy loaded {when}, and previews are paused.", 'site.offlineShort': 'Site offline',
      'pv.err': "The preview couldn't show part of your draft ({part}). Everything else is up to date.",
      'notify.signed': 'Signed: {name}', 'notify.newBrief': 'New brief from {name}', 'notify.welcome': 'Welcome to the MIRAS admin', 'notify.welcomeText': 'Press ⌘K to jump anywhere, and use Customize to make it yours.',
      'notify.backup': 'Time for a backup', 'notify.backupText': 'Everything here lives in this browser only. Export a backup in Settings › Admin data.', 'notify.backupLast': 'Last backup: {date}.',
      'act.pruned': 'Old fields: {n}',
    },
    ar: {
      copyFailed: 'تعذّر النسخ. حدّد النص وانسخه بنفسك.', pageFailed: 'تعذّر تحميل هذه الصفحة', adminLabel: 'لوحة إدارة ميراس',
      'core.you': 'أنت', 'core.title.founder': 'المؤسس', 'core.title.producer': 'منتج', 'core.title.partner': 'مسؤول علاقات العملاء', 'core.title.designer': 'مصمم',
      'save.notSaved': 'لم يُحفظ', 'save.full': 'لم يُحفظ: مساحة التخزين في هذا المتصفح ممتلئة، وآخر تعديلاتك موجودة في هذه النافذة فقط.', 'save.free': 'إخلاء مساحة',
      'save.freeTitle': 'إخلاء مساحة في هذا المتصفح؟', 'save.freeText': 'سيُحذف من نقاط الاسترجاع التلقائية: {autos}، ومن أحداث الموقع القديمة: {events}، ومن نسخ الطلبات الموجودة أصلاً في صندوق الوارد: {briefs}. تبقى عمليات النشر ونقاط الاسترجاع التي تحمل ملاحظة.',
      'save.freed': 'أُخليت {kb} كيلوبايت، وحُفظت مسودتك.', 'save.freedStill': 'أُخليت {kb} كيلوبايت، لكن المساحة ما زالت ممتلئة. صدّر نسخة احتياطية من الإعدادات وامسح البيانات القديمة.', 'save.nothing': 'لم يبقَ ما يمكن مسحه هنا. صدّر نسخة احتياطية من الإعدادات ثم احذف البيانات القديمة.', 'save.again': 'حُفظت مسودتك من جديد.',
      checkpointFailed: 'لم تُحفظ نقطة الاسترجاع: مساحة التخزين في هذا المتصفح ممتلئة.',
      'conflict.ribbon': 'تغيّر الموقع المنشور منذ بدأت التعديل.', 'conflict.ribbonN': 'تعديلات لك على نصوص تغيّرت: {n}.', 'conflict.ribbonOne': 'أحد تعديلاتك على نص تغيّر.', 'conflict.review': 'مراجعة',
      'conflict.title': 'تغيّر الموقع المنشور', 'conflict.intro': 'نشر أحدهم أو حُدّث الموقع بعد أن عدّلت هذه النصوص. اختر النسخة التي تريد إبقاءها، ولن يظهر شيء على الموقع قبل أن تنشر.',
      'conflict.live': 'المنشور الآن', 'conflict.mine': 'تعديلك', 'conflict.keepMine': 'أبقِ تعديلي', 'conflict.takeTheirs': 'استخدم النسخة المنشورة', 'conflict.keepAll': 'أبقِ كل تعديلاتي', 'conflict.takeAll': 'استخدم كل النسخ المنشورة',
      'conflict.keptMine': 'أُبقي تعديلك.', 'conflict.tookTheirs': 'تُستخدم النسخة المنشورة.', 'conflict.empty': '(فارغ)', 'conflict.undoLabel': 'استخدام النسخة المنشورة',
      'sync.updated': 'حُدّثت المسودة بتعديلات من نافذة أخرى.', 'sync.clash': 'عُدّل «{what}» في نافذتين، فأبقينا النسخة الأحدث.', 'sync.published': 'نُشرت التعديلات من نافذة أخرى.',
      'cs.pruned': 'أزلنا من مسودتك حقولاً قديمة لم يعد الموقع يستخدمها: {n}.', 'cs.prunedOne': 'أزلنا من مسودتك حقلاً قديماً لم يعد الموقع يستخدمه.', 'cs.legacy': 'المسودة قبل التحديث',
      'cs.p.type': '{path}: نوع القيمة غير صحيح، وصُحّح', 'cs.p.missing': '{path}: ناقص، وأُكمل', 'cs.p.unknown': '{path}: لم يعد الموقع يستخدمه، وأُزيل', 'cs.p.html': '{path}: أُزيلت منه شيفرة غير آمنة',
      'site.contentErr': 'حُمّل الموقع، لكن تعذّر استخدام جزء من محتواه: {part}.', 'site.openHistory': 'افتح السجل', 'site.cached': 'تعذّر الوصول إلى الموقع. تعمل على النسخة المحمّلة {when}، والمعاينة متوقفة.', 'site.offlineShort': 'الموقع غير متاح',
      'pv.err': 'تعذّر على المعاينة عرض جزء من مسودتك ({part}). كل ما عداه محدّث.',
      'notify.signed': 'تم الاتفاق: {name}', 'notify.newBrief': 'طلب جديد من {name}', 'notify.welcome': 'أهلاً بك في لوحة ميراس', 'notify.welcomeText': 'جرّب ⌘K للتنقل، وزر التخصيص لتجعلها على ذوقك.',
      'notify.backup': 'حان وقت النسخة الاحتياطية', 'notify.backupText': 'كل ما هنا محفوظ في هذا المتصفح فقط. صدّر نسخة احتياطية من الإعدادات › بيانات الإدارة.', 'notify.backupLast': 'آخر نسخة احتياطية: {date}.',
      'act.pruned': 'حقول قديمة: {n}',
    },
    fa: {
      copyFailed: 'کپی نشد. متن را انتخاب کنید و خودتان کپی کنید.', pageFailed: 'این صفحه بارگذاری نشد', adminLabel: 'پنل مدیریت میراس',
      'core.you': 'شما', 'core.title.founder': 'بنیان‌گذار', 'core.title.producer': 'تهیه‌کننده', 'core.title.partner': 'مسئول ارتباط با مشتری', 'core.title.designer': 'طراح',
      'save.notSaved': 'ذخیره نشد', 'save.full': 'ذخیره نشد: حافظهٔ این مرورگر پر است و آخرین ویرایش‌های شما فقط در همین زبانه است.', 'save.free': 'آزاد کردن فضا',
      'save.freeTitle': 'فضای این مرورگر آزاد شود؟', 'save.freeText': '{autos} نقطهٔ بازگشت خودکار، {events} رویداد قدیمی سایت و {briefs} نسخه از درخواست‌هایی که در صندوق ورودی هستند پاک می‌شوند. انتشارها و نقطه‌های بازگشتِ یادداشت‌دار می‌مانند.',
      'save.freed': '{kb} کیلوبایت آزاد شد و پیش‌نویس شما ذخیره شد.', 'save.freedStill': '{kb} کیلوبایت آزاد شد، اما حافظه هنوز پر است. از تنظیمات نسخهٔ پشتیبان بگیرید و داده‌های قدیمی را پاک کنید.', 'save.nothing': 'اینجا چیزی برای پاک کردن نمانده. از تنظیمات نسخهٔ پشتیبان بگیرید و داده‌های قدیمی را حذف کنید.', 'save.again': 'پیش‌نویس شما دوباره ذخیره شد.',
      checkpointFailed: 'نقطهٔ بازگشت ذخیره نشد: حافظهٔ این مرورگر پر است.',
      'conflict.ribbon': 'سایت منتشرشده از وقتی ویرایش را شروع کردید تغییر کرده است.', 'conflict.ribbonN': '{n} ویرایش شما روی متن‌هایی است که تغییر کرده‌اند.', 'conflict.ribbonOne': 'یکی از ویرایش‌های شما روی متنی است که تغییر کرده.', 'conflict.review': 'بررسی',
      'conflict.title': 'سایت منتشرشده تغییر کرده است', 'conflict.intro': 'پس از ویرایش شما، کسی منتشر کرده یا سایت به‌روز شده است. انتخاب کنید کدام نسخه بماند؛ تا منتشر نکنید چیزی در سایت تغییر نمی‌کند.',
      'conflict.live': 'نسخهٔ منتشرشدهٔ فعلی', 'conflict.mine': 'ویرایش شما', 'conflict.keepMine': 'ویرایش من بماند', 'conflict.takeTheirs': 'نسخهٔ منتشرشده', 'conflict.keepAll': 'همهٔ ویرایش‌های من بماند', 'conflict.takeAll': 'همه از نسخهٔ منتشرشده',
      'conflict.keptMine': 'ویرایش شما ماند.', 'conflict.tookTheirs': 'نسخهٔ منتشرشده به کار رفت.', 'conflict.empty': '(خالی)', 'conflict.undoLabel': 'استفاده از نسخهٔ منتشرشده',
      'sync.updated': 'پیش‌نویس با ویرایش‌های زبانهٔ دیگر به‌روز شد.', 'sync.clash': '«{what}» در دو زبانه ویرایش شده بود؛ نسخهٔ جدیدتر ماند.', 'sync.published': 'از زبانهٔ دیگر منتشر شد.',
      'cs.pruned': '{n} فیلد قدیمی از پیش‌نویس شما حذف شد؛ سایت دیگر از آن‌ها استفاده نمی‌کند.', 'cs.prunedOne': 'یک فیلد قدیمی از پیش‌نویس شما حذف شد؛ سایت دیگر از آن استفاده نمی‌کند.', 'cs.legacy': 'پیش‌نویس پیش از به‌روزرسانی',
      'cs.p.type': '{path}: نوع مقدار درست نبود و اصلاح شد', 'cs.p.missing': '{path}: ناقص بود و تکمیل شد', 'cs.p.unknown': '{path}: سایت دیگر از آن استفاده نمی‌کند و حذف شد', 'cs.p.html': '{path}: کد ناامن حذف شد',
      'site.contentErr': 'سایت بارگذاری شد، اما بخشی از محتوایش قابل استفاده نبود: {part}.', 'site.openHistory': 'باز کردن تاریخچه', 'site.cached': 'به سایت دسترسی نداریم. روی نسخه‌ای کار می‌کنید که {when} بارگذاری شد و پیش‌نمایش متوقف است.', 'site.offlineShort': 'سایت در دسترس نیست',
      'pv.err': 'پیش‌نمایش نتوانست بخشی از پیش‌نویس شما را نشان دهد ({part}). بقیه به‌روز است.',
      'notify.signed': 'قرارداد بسته شد: {name}', 'notify.newBrief': 'درخواست تازه از {name}', 'notify.welcome': 'به پنل میراس خوش آمدید', 'notify.welcomeText': 'با ⌘K به هر جا بروید و با «شخصی‌سازی» پنل را مال خودتان کنید.',
      'notify.backup': 'وقت پشتیبان‌گیری است', 'notify.backupText': 'همه‌چیز فقط در همین مرورگر نگه‌داری می‌شود. از تنظیمات › داده‌های پنل نسخهٔ پشتیبان بگیرید.', 'notify.backupLast': 'آخرین پشتیبان: {date}.',
      'act.pruned': 'فیلدهای قدیمی: {n}',
    },
  });

  // accessibility, keyboard, deltas, the shared preview pane, backups, site parts
  MA.i18n.add({
    en: {
      'nav.locked': '{name}, locked for your role', 'd.pts': { one: '{n} pt', other: '{n} pts' }, 'a11y.skip': 'Skip to content', 'nav.badgeNew': '{name}, {n} new', 'nav.badgeQuiet': '{name}, {n} to review', 'me.label': '{name}, {role}: account menu',
      'k.toastUndo': 'Undo the action in the last message', 'toast.undoHint': 'Press {key} to undo.',
      'cz.keyboard': 'Keyboard', 'k.single': 'Single-key shortcuts', 'k.singleHint': 'Keys like J, E or Backspace act on their own. Turn this off if you use speech input or press keys by accident. Shortcuts with ⌘/Ctrl or Alt keep working.',
      'cz.keys': 'Shortcuts', 'cz.keysHint': 'To change a shortcut, choose Change and press the new keys.', 'cz.change': 'Change', 'cz.pressKeys': 'Press the new keys…', 'cz.keyTaken': '{key} is already used by “{name}”.', 'cz.keyReset': 'Use the default', 'cz.keySaved': 'Shortcut changed to {key}.', 'cz.keyInvalid': 'Pick a key with a letter, number or symbol.',
      'cz.move': 'Move {name}', 'cz.moveHint': 'Use ↑ and ↓ to change the order.', 'cz.moved': '{name} is now number {n}.', 'cz.hide': 'Hide {name}', 'cz.show': 'Show {name}',
      'd.vs': 'vs {range}', 'd.vsPrev': 'vs the period before', 'd.flat': '≈ flat', 'd.new': 'New', 'd.none': 'none in {range}', 'd.noneBefore': 'none before', 'd.more': '{n} more', 'd.fewer': '{n} fewer',
      'pv.show': 'Show preview', 'pv.hide': 'Hide preview', 'pv.title': 'Live preview', 'pv.resize': 'Resize the preview (← → keys, double-click to reset)',
      'part.text': 'Page copy', 'part.ui': 'Messages', 'part.swells': 'Swells', 'part.services': 'Services', 'part.sgroups': 'Service groups', 'part.stages': 'Process stages', 'part.steps': 'Step labels', 'part.make': 'What we make', 'part.faq': 'Questions',
      'part.studio': 'Studio settings', 'part.theme': 'Brand colours', 'part.seo': 'SEO', 'part.sections': 'Sections', 'part.media': 'Images', 'part.layout': 'Section order', 'part.tagline': 'Tagline', 'part.schedule': 'Scheduled changes', 'part.content': 'All content', 'part.page': 'The page', 'part.render': 'Drawing the page',
      'bk.ribbon': { one: 'No backup for a day. Everything here lives only in this browser.', other: 'No backup for {n} days. Everything here lives only in this browser.' }, 'bk.never': 'No backup yet. Everything here lives only in this browser.', 'bk.now': 'Back up now', 'bk.later': 'Later',
      'ch.lines': '{series}, {from} to {to}', 'ch.columns': 'Bar chart: {items}', restore: 'Restore', 'field.colorPick': '{label}: colour picker', 'field.colorHex': '{label}: hex code',
    },
    ar: {
      'nav.locked': '{name}، مقفلة لدورك', 'd.pts': '{n} نقطة', 'a11y.skip': 'تخطَّ إلى المحتوى', 'nav.badgeNew': '{name}، عناصر جديدة: {n}', 'nav.badgeQuiet': '{name}، للمراجعة: {n}', 'me.label': '{name}، {role}: قائمة الحساب',
      'k.toastUndo': 'التراجع عن الإجراء في آخر إشعار', 'toast.undoHint': 'اضغط {key} للتراجع.',
      'cz.keyboard': 'لوحة المفاتيح', 'k.single': 'اختصارات المفتاح الواحد', 'k.singleHint': 'مفاتيح مثل J وE وزر الحذف تعمل وحدها. أوقفها إن كنت تستخدم الإملاء الصوتي أو تضغط المفاتيح خطأً. تبقى الاختصارات مع ⌘/Ctrl أو Alt فعّالة.',
      'cz.keys': 'الاختصارات', 'cz.keysHint': 'لتغيير اختصار اختر «تغيير» ثم اضغط المفاتيح الجديدة.', 'cz.change': 'تغيير', 'cz.pressKeys': 'اضغط المفاتيح الجديدة…', 'cz.keyTaken': 'الاختصار {key} مستخدم لـ«{name}».', 'cz.keyReset': 'استخدم الاختصار الأصلي', 'cz.keySaved': 'أصبح الاختصار {key}.', 'cz.keyInvalid': 'اختر مفتاحاً فيه حرف أو رقم أو رمز.',
      'cz.move': 'نقل {name}', 'cz.moveHint': 'استخدم ↑ و↓ لتغيير الترتيب.', 'cz.moved': 'أصبح {name} في الموضع {n}.', 'cz.hide': 'إخفاء {name}', 'cz.show': 'إظهار {name}',
      'd.vs': 'مقارنةً بفترة {range}', 'd.vsPrev': 'مقارنةً بالفترة السابقة', 'd.flat': '≈ ثابت تقريباً', 'd.new': 'جديد', 'd.none': 'لا شيء في فترة {range}', 'd.noneBefore': 'لا شيء قبلها', 'd.more': 'أكثر بـ{n}', 'd.fewer': 'أقل بـ{n}',
      'pv.show': 'إظهار المعاينة', 'pv.hide': 'إخفاء المعاينة', 'pv.title': 'المعاينة الحيّة', 'pv.resize': 'تغيير عرض المعاينة (بمفتاحَي ← →، والنقر المزدوج يعيده)',
      'part.text': 'نصوص الصفحة', 'part.ui': 'الرسائل', 'part.swells': 'الموجات', 'part.services': 'الخدمات', 'part.sgroups': 'مجموعات الخدمات', 'part.stages': 'مراحل العمل', 'part.steps': 'تسميات الخطوات', 'part.make': 'ما نصنعه', 'part.faq': 'الأسئلة',
      'part.studio': 'إعدادات الاستوديو', 'part.theme': 'ألوان الهوية', 'part.seo': 'الظهور في البحث', 'part.sections': 'الأقسام', 'part.media': 'الصور', 'part.layout': 'ترتيب الأقسام', 'part.tagline': 'الشعار', 'part.schedule': 'التغييرات المجدولة', 'part.content': 'المحتوى كله', 'part.page': 'الصفحة', 'part.render': 'رسم الصفحة',
      'bk.ribbon': { one: 'لا نسخة احتياطية منذ يوم. كل ما هنا محفوظ في هذا المتصفح فقط.', two: 'لا نسخة احتياطية منذ يومين. كل ما هنا محفوظ في هذا المتصفح فقط.', few: 'لا نسخة احتياطية منذ {n} أيام. كل ما هنا محفوظ في هذا المتصفح فقط.', many: 'لا نسخة احتياطية منذ {n} يوماً. كل ما هنا محفوظ في هذا المتصفح فقط.', other: 'لا نسخة احتياطية منذ {n} يوم. كل ما هنا محفوظ في هذا المتصفح فقط.' },
      'bk.never': 'لا توجد نسخة احتياطية بعد. كل ما هنا محفوظ في هذا المتصفح فقط.', 'bk.now': 'أنشئ نسخة الآن', 'bk.later': 'لاحقاً',
      'ch.lines': '{series}، من {from} إلى {to}', 'ch.columns': 'رسم بالأعمدة: {items}', restore: 'استرجاع', 'field.colorPick': '{label}: منتقي الألوان', 'field.colorHex': '{label}: رمز اللون',
    },
    fa: {
      'nav.locked': '{name}، برای نقش شما قفل است', 'd.pts': '{n} واحد درصد', 'a11y.skip': 'رفتن به محتوا', 'nav.badgeNew': '{name}، {n} مورد تازه', 'nav.badgeQuiet': '{name}، {n} مورد برای بررسی', 'me.label': '{name}، {role}: منوی حساب',
      'k.toastUndo': 'واگرد کارِ آخرین پیام', 'toast.undoHint': 'برای واگرد {key} را بزنید.',
      'cz.keyboard': 'صفحه‌کلید', 'k.single': 'میان‌برهای تک‌کلیدی', 'k.singleHint': 'کلیدهایی مثل J و E یا کلید پاک‌کردن به‌تنهایی کار می‌کنند. اگر با گفتار تایپ می‌کنید یا ناخواسته کلیدی را می‌زنید، خاموشش کنید. میان‌برهای همراه ⌘/Ctrl یا Alt همچنان کار می‌کنند.',
      'cz.keys': 'میان‌برها', 'cz.keysHint': 'برای تغییر یک میان‌بر «تغییر» را بزنید و کلیدهای تازه را فشار دهید.', 'cz.change': 'تغییر', 'cz.pressKeys': 'کلیدهای تازه را فشار دهید…', 'cz.keyTaken': '{key} برای «{name}» استفاده شده است.', 'cz.keyReset': 'بازگشت به پیش‌فرض', 'cz.keySaved': 'میان‌بر به {key} تغییر کرد.', 'cz.keyInvalid': 'کلیدی با حرف، عدد یا نماد انتخاب کنید.',
      'cz.move': 'جابه‌جا کردن {name}', 'cz.moveHint': 'با ↑ و ↓ ترتیب را عوض کنید.', 'cz.moved': '{name} اکنون در جایگاه {n} است.', 'cz.hide': 'پنهان کردن {name}', 'cz.show': 'نمایش {name}',
      'd.vs': 'در مقایسه با {range}', 'd.vsPrev': 'در مقایسه با دورهٔ قبل', 'd.flat': '≈ بدون تغییر', 'd.new': 'تازه', 'd.none': 'در {range} صفر', 'd.noneBefore': 'پیش از آن صفر', 'd.more': '{n} بیشتر', 'd.fewer': '{n} کمتر',
      'pv.show': 'نمایش پیش‌نمایش', 'pv.hide': 'پنهان کردن پیش‌نمایش', 'pv.title': 'پیش‌نمایش زنده', 'pv.resize': 'تغییر پهنای پیش‌نمایش (کلیدهای ← →، دوبار کلیک برای بازگشت)',
      'part.text': 'متن‌های صفحه', 'part.ui': 'پیام‌ها', 'part.swells': 'موج‌ها', 'part.services': 'خدمات', 'part.sgroups': 'گروه‌های خدمات', 'part.stages': 'مراحل کار', 'part.steps': 'برچسب گام‌ها', 'part.make': 'آنچه می‌سازیم', 'part.faq': 'پرسش‌ها',
      'part.studio': 'تنظیمات استودیو', 'part.theme': 'رنگ‌های برند', 'part.seo': 'سئو', 'part.sections': 'بخش‌ها', 'part.media': 'تصاویر', 'part.layout': 'ترتیب بخش‌ها', 'part.tagline': 'شعار', 'part.schedule': 'تغییرهای زمان‌بندی‌شده', 'part.content': 'کل محتوا', 'part.page': 'صفحه', 'part.render': 'رسم صفحه',
      'bk.ribbon': { one: 'یک روز است نسخهٔ پشتیبان نگرفته‌اید. همه‌چیز فقط در همین مرورگر است.', other: '{n} روز است نسخهٔ پشتیبان نگرفته‌اید. همه‌چیز فقط در همین مرورگر است.' }, 'bk.never': 'هنوز نسخهٔ پشتیبان نگرفته‌اید. همه‌چیز فقط در همین مرورگر است.', 'bk.now': 'همین حالا پشتیبان بگیرید', 'bk.later': 'بعداً',
      'ch.lines': '{series}، از {from} تا {to}', 'ch.columns': 'نمودار ستونی: {items}', restore: 'بازیابی', 'field.colorPick': '{label}: انتخاب رنگ', 'field.colorHex': '{label}: کد رنگ',
    },
  });

  /* ================= icons (24 grid, 1.7 stroke) ================= */
  const I = MA.icons = {
    tide: '<path d="M3 8c3-3 6 3 9 0s6-3 9 0"/><path d="M3 13c3-2.4 6 2.4 9 0s6-2.4 9 0"/><path d="M3 18c3-1.6 6 1.6 9 0s6-1.6 9 0"/>',
    inbox: '<path d="M3.5 13.5l2.6-7.3A2 2 0 0 1 8 5h8a2 2 0 0 1 1.9 1.2l2.6 7.3"/><path d="M3.5 13.5V17a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-3.5h-5a3.5 3.5 0 0 1-7 0z"/>',
    chart: '<path d="M4 19.5h16"/><rect x="5" y="11" width="3" height="5.5" rx="1"/><rect x="10.5" y="5.5" width="3" height="11" rx="1"/><rect x="16" y="8.5" width="3" height="8" rx="1"/>',
    pages: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M3.5 9h17M9 9v11"/>',
    swell: '<path d="M2.5 17.5c3.5 0 4.5-9 10-9 3 0 4.4 2.6 3.2 4.4-1 1.4-3.2 1-3.2-.6"/><path d="M2.5 20.5h19"/>',
    process: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3"/>',
    faq: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.7"/><path d="M12 16.8h.01"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l4.5-4.5 3.5 3.5 3-3 5 5"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.9 1.8-1.8 0-1.2-1-1.6-1-2.7 0-1 .8-1.7 1.8-1.7h2.2a3.7 3.7 0 0 0 3.7-3.7C20.5 6.6 16.7 3.5 12 3.5z"/><circle cx="7.8" cy="11" r="1"/><circle cx="10.5" cy="7.3" r="1"/><circle cx="15" cy="7.6" r="1"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.3 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.3-3.5-8.5s1.1-6 3.5-8.5z"/>',
    settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    team: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.3c1.7.6 2.8 2.2 3 4.7"/>',
    history: '<path d="M3.8 12a8.2 8.2 0 1 0 2.4-5.8"/><path d="M3.5 4.5v3.6h3.6"/><path d="M12 8v4.3l2.8 1.7"/>',
    publish: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    chevDown: '<path d="M6 9l6 6 6-6"/>', chevUp: '<path d="M6 15l6-6 6 6"/>', chevRight: '<path d="M9 6l6 6-6 6"/>', chevLeft: '<path d="M15 6l-6 6 6 6"/>',
    arrowRight: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>', arrowLeft: '<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>',
    up: '<path d="M7 17L17 7M8 7h9v9"/>', down: '<path d="M7 7l10 10M17 8v9H8"/>',
    more: '<circle class="f" cx="5" cy="12" r="1.5"/><circle class="f" cx="12" cy="12" r="1.5"/><circle class="f" cx="19" cy="12" r="1.5"/>',
    moreV: '<circle class="f" cx="12" cy="5" r="1.5"/><circle class="f" cx="12" cy="12" r="1.5"/><circle class="f" cx="12" cy="19" r="1.5"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>', sort: '<path d="M7 4v16M3.5 16.5L7 20l3.5-3.5M17 20V4M13.5 7.5L17 4l3.5 3.5"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    board: '<rect x="3.5" y="4" width="4.5" height="16" rx="1.5"/><rect x="9.75" y="4" width="4.5" height="10" rx="1.5"/><rect x="16" y="4" width="4.5" height="13" rx="1.5"/>',
    star: '<path d="M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.6-5 2.6.9-5.6-4-4 5.6-.8z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    chat: '<path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.6z"/>',
    phone: '<path d="M6.6 3.5h2.6l1.4 4-2 1.3a10 10 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.6 5.5a2 2 0 0 1 2-2z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4 19.5h16"/>', upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4 19.5h16"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.9 12a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12"/>',
    edit: '<path d="M14.5 5.5l4 4L8 20H4v-4z"/><path d="M12.5 7.5l4 4"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M4 4l16 16"/><path d="M10.6 6.1A9 9 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.6 3.3M6.6 7.6C4 9.3 2.5 12 2.5 12S6 18 12 18a9.3 9.3 0 0 0 4.4-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    drag: '<circle class="f" cx="9" cy="6" r="1.4"/><circle class="f" cx="15" cy="6" r="1.4"/><circle class="f" cx="9" cy="12" r="1.4"/><circle class="f" cx="15" cy="12" r="1.4"/><circle class="f" cx="9" cy="18" r="1.4"/><circle class="f" cx="15" cy="18" r="1.4"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
    monitor: '<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>',
    tablet: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M11 18h2"/>', mobile: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    user: '<circle cx="12" cy="8.5" r="3.7"/><path d="M4.5 20c.9-3.9 3.8-6 7.5-6s6.6 2.1 7.5 6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    external: '<path d="M14 4.5h5.5V10M19.5 4.5L11 13"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 20v-4h-4"/>',
    cursor: '<path d="M5 4l5.5 15 2.2-6.3L19 10.5z"/><path d="M13 13l5 5"/>',
    sidebar: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/>',
    sliders: '<path d="M5 4v7M5 15v5M12 4v3M12 11v9M19 4v9M19 17v3"/><path d="M3 13h4M10 9h4M17 15h4"/>',
    sparkle: '<path d="M12 3.5c.7 4 2.5 5.8 6.5 6.5-4 .7-5.8 2.5-6.5 6.5-.7-4-2.5-5.8-6.5-6.5 4-.7 5.8-2.5 6.5-6.5z"/><path d="M19 3v4M17 5h4"/>',
    tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.1 6.1a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.3"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    pin: '<path d="M9 4h6l-1 5 3.5 3.5h-11L10 9z"/><path d="M12 12.5V20"/>',
    archive: '<rect x="3.5" y="4.5" width="17" height="4.5" rx="1.2"/><path d="M5 9v9.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
    reply: '<path d="M9.5 6L4 11.5 9.5 17"/><path d="M4.5 11.5H14a6 6 0 0 1 6 6v1"/>',
    note: '<path d="M5 4.5h14v10l-5 5H5z"/><path d="M14 19.5v-5h5M8.5 9h7M8.5 12.5h4"/>',
    folder: '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    file: '<path d="M6 3.5h8l4.5 4.5v12a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M13.5 3.5V8.5h5"/>',
    code: '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
    warn: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.2M12 17h.01"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    flag: '<path d="M5 21V4.5M5 5h11.5l-2 4 2 4H5"/>',
    logout: '<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14"/><path d="M10 16l-4-4 4-4M6 12h9"/>',
    play: '<path d="M7 5v14l12-7z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
    type: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>', italic: '<path d="M14 5h-4M14 19h-4M14 5l-4 14"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle class="f" cx="12" cy="12" r="1.5"/>',
    funnel: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
    layers: '<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5"/>',
    columns: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M12 4.5v15"/>',
    whatsapp: '<path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.6z"/><path d="M9 9.2c0 3 2.2 5.5 5.6 5.6l.9-1.3-1.7-.9-.8.6c-1-.4-1.9-1.3-2.3-2.3l.6-.8-.9-1.7-1.3.9z"/>',
    language: '<path d="M4 5h9M8.5 3v2M6 5c.6 3.4 3 6 6.5 7.5M11 5c-.8 3.6-3.3 6.7-7 8.5"/><path d="M12.5 21l4-9 4 9M14 17.8h5"/>',
    command: '<path d="M9 9V6.5A2.5 2.5 0 1 0 6.5 9zM9 9h6M15 9V6.5A2.5 2.5 0 1 1 17.5 9zM15 9v6M15 15h2.5a2.5 2.5 0 1 1-2.5 2.5zM15 15H9M9 15v2.5A2.5 2.5 0 1 1 6.5 15zM9 15V9"/>',
    mira: '<path d="M4 17.5c2-5 6.5-9 11-9 3.6 0 5.5 3 4 5.2-1.2 1.8-4 1.3-4-.6"/><circle class="f" cx="15.6" cy="10.6" r=".9"/><path d="M3 20.5h18"/>',
  };
  MA.icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[name] || I.sparkle}</svg>`;
  MA.iconEl = (name, cls) => MA.frag(MA.icon(name, cls));
  /** Mira PNGs from the site, for empty states and celebrations. pose: ride | present | arrive | wave */
  MA.mira = (pose = 'arrive', cls = 'mira') => {
    const src = { ride: 'mira-ride-shore.png', present: 'mira-present-shore.png', arrive: 'mira-arrive-shore.png', wave: 'mira-arrive.png', blue: 'mira-arrive.png' }[pose] || 'mira-arrive-shore.png';
    return `<img class="${cls}" src="img/${src}" alt="" draggable="false">`; // copies live in admin/img so the admin never depends on site files
  };

  /* ================= permissions ================= */
  MA.ROLES = {
    owner: ['*'],
    admin: ['content.edit', 'content.publish', 'leads.view', 'leads.edit', 'analytics.view', 'media.edit', 'settings.edit', 'team.manage'],
    editor: ['content.edit', 'media.edit', 'analytics.view', 'leads.view'],
    sales: ['leads.view', 'leads.edit', 'analytics.view'],
    viewer: ['leads.view', 'analytics.view'],
  };
  MA.PERMS = ['content.edit', 'content.publish', 'leads.view', 'leads.edit', 'analytics.view', 'media.edit', 'settings.edit', 'team.manage'];
  MA.role = () => prefs.viewAs || MA.team?.me?.()?.role || 'owner';
  MA.can = perm => { if (!perm) return true; const p = MA.ROLES[MA.role()] || []; return p.includes('*') || p.includes(perm); };

  /* ================= modules + router ================= */
  const MODS = [], KEYS = [];
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  /**
   * Register a page. def = { id, group: 'work'|'clients'|'site'|'system', order, title: {en, ar}, icon, perm, shortcut: 'g x',
   *   badge(): number|string|null, render(view, ctx), update?(ctx) → true if handled in place, search?(q) → [{title, sub, icon, run}],
   *   navItems?() → [{key, title: {en, ar, fa}, icon, href, match(ctx) → bool, badge?()}] (one sidebar link per item instead of the page's own) }
   * ctx = { sub: string[], query: URLSearchParams, path: string }
   */
  MA.module = def => {
    const i = MODS.findIndex(m => m.id === def.id); if (i >= 0) MODS.splice(i, 1, def); else MODS.push(def);
    MODS.sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
    for (let k = KEYS.length - 1; k >= 0; k--) if (KEYS[k].module === def.id) KEYS.splice(k, 1); // registering again replaces its go-to key
    if (def.shortcut) KEYS.push({ combo: def.shortcut, fn: () => MA.go('#/' + def.id), desc: () => MA.t('k.go', { name: MA.L(def.title) }), global: false, core: true, module: def.id });
    if (booted) renderNav();
  };
  MA.modules = () => MODS;
  MA.go = (hash, { replace = false } = {}) => { if (!hash.startsWith('#')) hash = '#/' + hash.replace(/^\/+/, ''); if (location.hash === hash) return route(); replace ? history.replaceState(null, '', hash) : (location.hash = hash); if (replace) route(); };
  /** Update the query of the current route without re-rendering. */
  MA.setQuery = (obj) => { const cur = parseHash(); for (const [k, v] of Object.entries(obj)) (v == null || v === '') ? cur.query.delete(k) : cur.query.set(k, v); const q = cur.query.toString(); history.replaceState(null, '', '#/' + [cur.id, ...cur.sub].join('/') + (q ? '?' + q : '')); };
  const parseHash = () => {
    const raw = location.hash.replace(/^#\/?/, ''), [p, q = ''] = raw.split('?'), parts = p.split('/').filter(Boolean).map(decodeURIComponent);
    return { id: parts[0] || prefs.home || 'overview', sub: parts.slice(1), query: new URLSearchParams(q), path: p };
  };
  MA.ctx = () => parseHash();
  let current = null, booted = false, routeKey = null, routeN = 0;
  function route() {
    if (!booted) return;
    const ctx = parseHash(), mod = MODS.find(m => m.id === ctx.id) || null, view = $('#view'), key = ctx.id + '/' + ctx.sub.join('/');
    if (current && mod && current.mod === mod && mod.update && mod.update(ctx) === true) { current.ctx = ctx; routeKey = key; renderCrumbs(ctx, mod); markNav(); focusRequested(ctx); return; }
    const moved = routeKey !== null && key !== routeKey; routeKey = key; // a real page change (not the first page, not a re-render)
    viewCleanups.splice(0).forEach(fn => { try { fn(); } catch (e) {} });
    current?.mod?.destroy?.();
    if (moved || !layers.some(l => l.keepOnRerender)) closeLayers(); // a re-render (a preference changed) keeps Customize open
    view.className = 'view view-enter'; view.innerHTML = ''; view.scrollTop = 0; scrollTo(0, 0);
    current = { mod, ctx };
    renderCrumbs(ctx, mod); markNav();
    const arrive = title => { if (moved && !wantsField(ctx)) settleFocus(title); };
    if (!mod) { view.append(MA.ui.empty({ title: MA.t('notFound'), text: MA.t('notFoundText'), pose: 'present', actions: [MA.h('a.btn.primary', { href: '#/overview' }, MA.t('goOverview'))] })); arrive(MA.t('notFound')); return; }
    if (mod.perm && !MA.can(mod.perm)) { view.append(MA.ui.empty({ title: MA.t('noAccess'), text: MA.t('noAccessText'), pose: 'present', icon: 'lock' })); arrive(MA.t('noAccess')); return; }
    document.title = `${MA.L(mod.title)} · MIRAS`;
    // pages that edit site content need the site's defaults; the rest (inbox, team, analytics…) work without the site
    if (!MA.content?.draft && needsSite(mod)) { view.append(MA.site.pending ? skeleton() : siteDownState()); arrive(MA.L(mod.title)); return; }
    try { mod.render(view, ctx); }
    catch (e) { console.error(e); view.append(MA.ui.empty({ title: MA.t('pageFailed'), text: esc(String(e.message || e)), pose: 'present' })); }
    setTimeout(() => view.classList.remove('view-enter'), 400);
    focusRequested(ctx);
    arrive(MA.L(mod.title));
  }
  const wantsField = ctx => !!(MA.content?.focusAfterRoute || ctx.query.get('field'));
  /** After a page change: say the page's name (polite live region) and move focus to its heading, unless the page
   *  already put focus somewhere inside itself or a dialog is open. ?field= routes focus the field instead. */
  function settleFocus(title) {
    const token = ++routeN, from = document.activeElement;
    MA.announce(title);
    setTimeout(() => {
      if (token !== routeN) return;
      const view = $('#view'), a = document.activeElement;
      if (!view || layers.some(l => l.modal)) return;
      // only from where navigation started (a nav link, the palette, the body): never pull focus the person already moved
      if (a && a !== document.body && a !== from && (view.contains(a) || !a.closest('.side, .top'))) return;
      const h = view.querySelector('h1') || view.querySelector('.empty h2, h2') || view;
      if (h !== view && !h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }, 60);
  }
  /** Read a short message to screen readers (polite; assertive for errors). */
  MA.announce = (msg, { assertive = false } = {}) => {
    const el = $(assertive ? '#a11y-alert' : '#a11y-live'); if (!el || !msg) return;
    el.textContent = ''; setTimeout(() => { el.textContent = MA.strip(msg); }, 30);
  };
  // ?field=… (from search, or a click in the preview) → scroll to that field once the page is drawn
  function focusRequested(ctx) {
    const want = MA.content?.focusAfterRoute || (ctx.query.get('field') ? { tpl: ctx.query.get('field') } : null);
    if (want) setTimeout(() => { if (MA.form.focus(want.tpl, want.lang)) MA.content.focusAfterRoute = null; }, 140);
  }
  MA.rerender = () => { if (current) { current.mod = null; route(); } };
  addEventListener('hashchange', route);
  /** def.needsSite (true/false) wins; otherwise website pages and History need the site's content. */
  const needsSite = mod => mod.needsSite ?? (mod.group === 'site' || mod.id === 'history');
  const siteDownState = () => MA.ui.empty({ title: MA.t('siteOffline'), pose: 'present',
    text: MA.site.contentFailed ? esc(MA.t('site.contentErr', { part: MA.site.errorText() || '—' })) : MA.t('siteOfflineText'),
    actions: [MA.h('button.btn.primary', { type: 'button', onclick: () => location.reload() }, MA.t('retry'))] });

  /* ================= UI kit ================= */
  const ui = MA.ui = {};
  /** Page header. title may contain <em>. actions: Node[] */
  ui.pageHead = ({ title, sub, eyebrow, actions = [] }) => MA.h('header.page-head',
    MA.h('div', eyebrow ? MA.h('p.label.eyebrow', eyebrow) : null, MA.h('h1.h1', { html: title }), sub ? MA.h('p.lead', { html: sub }) : null),
    actions.length ? MA.h('div.actions', actions) : null);
  ui.empty = ({ title, text, pose = 'arrive', icon, actions = [], compact = false }) => MA.h('div.empty', { style: compact ? 'padding:28px 16px' : '' },
    icon ? MA.h('div', { html: MA.icon(icon, 'lg'), style: 'color:var(--ink3)' }) : MA.frag(MA.mira(pose)),
    MA.h('h2.h2', { html: title }), text ? MA.h('p', { html: text }) : null, actions.length ? MA.h('div.btn-row', actions) : null);
  ui.btn = (label, { icon, kind = '', size = '', onclick, href, title, disabled } = {}) => {
    const el = MA.h(href ? 'a' : 'button', { class: `btn ${kind} ${size}`.trim(), href, onclick, title, disabled, type: href ? null : 'button' });
    el.innerHTML = (icon ? MA.icon(icon) : '') + (label ? `<span>${esc(label)}</span>` : ''); return el;
  };
  /** Icon-only button. menu: true marks it as a menu trigger (aria-haspopup; ui.menu keeps aria-expanded in step). */
  ui.iconBtn = (icon, { tip, onclick, pressed, size = '', tipPos, menu = false } = {}) => MA.h('button', { type: 'button', class: `icon-btn ${size}`.trim(), 'aria-label': tip, 'data-tip': tip, 'data-tip-pos': tipPos, onclick, 'aria-pressed': pressed == null ? null : String(!!pressed), 'aria-haspopup': menu ? 'menu' : null, 'aria-expanded': menu ? 'false' : null, html: MA.icon(icon) });
  ui.badge = (text, tone = '') => MA.h('span', { class: 'badge ' + tone }, text);
  /** Tide-line status mark: 'draft' (dashed grey) · 'live' (solid tide) · 'edited' (live with edits waiting, dashed flare). */
  const tlSvg = (state, title = '') => `<svg class="tl ${state}" viewBox="0 0 18 6" aria-hidden="true"${title ? ` data-tip="${esc(title)}"` : ''}><path d="M1 3.5c2-2.6 4 2.6 6 0s4-2.6 6 0 2.6 1.6 4 0"/></svg>`;
  /** states: 'live' · 'edited' · 'draft' · 'stale' (a translation may be behind: dashed warn) · 'bad' (not saved / offline). */
  ui.tideMark = (state = 'live', title = '') => MA.frag(tlSvg(state, title));
  ui.tideMark.html = tlSvg;
  ui.sample = () => MA.h('span.badge.sample', { title: MA.t('sampleRibbon').replace(/<[^>]+>/g, '') }, MA.L({ en: 'Sample', ar: 'تجريبي', fa: 'نمونه' }));
  ui.avatar = (m, size = '') => {
    const name = (m && MA.team?.display?.(m)) || m?.name || '', el = MA.h('span', { class: 'avatar ' + size, title: name, style: `--av:${m?.color || 'var(--tide)'}` });
    if (m?.avatar) el.innerHTML = `<img src="${esc(m.avatar)}" alt="">`; else if (m?.unnamed && !m?.name) el.innerHTML = MA.icon('user', 'sm'); else el.textContent = MA.initials(name);
    return el;
  };
  MA.initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  /* ---- button groups: built once, then only their state changes, so keyboard focus never falls out ---- */
  /** Roving focus in a group: ←/→ (mirrored in RTL), ↑/↓, Home/End move focus; Enter/Space press. activate(b): tabs follow focus. */
  const roving = (el, sel, activate) => el.addEventListener('keydown', e => {
    const k = e.key; if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(k) || e.altKey || e.metaKey || e.ctrlKey) return;
    const items = $$(sel, el).filter(b => !b.disabled && !b.hidden), i = items.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault();
    const fwd = k === 'ArrowDown' || ((k === 'ArrowRight') !== (getComputedStyle(el).direction === 'rtl'));
    const j = k === 'Home' ? 0 : k === 'End' ? items.length - 1 : k === 'ArrowUp' ? (i - 1 + items.length) % items.length : (i + (fwd ? 1 : -1) + items.length) % items.length;
    items.forEach(b => { b.tabIndex = b === items[j] ? 0 : -1; }); items[j].focus(); activate?.(items[j]);
  });
  /** If a page rebuilt the group while handling the change, keep focus on the same choice in the new group. */
  const keepFocus = (el, sig, v, sel) => {
    const go = () => { const a = document.activeElement; if (el.isConnected && el.contains(a)) return true; if (a && a !== document.body) return true; const twin = $$(`[data-group="${CSS.escape(sig)}"]`).find(g => g !== el); const b = twin && $$(sel, twin).find(x => x.dataset.value === String(v)); if (b) { b.focus({ preventScroll: true }); return true; } return false; };
    if (!go()) requestAnimationFrame(() => go() || setTimeout(go, 80));
  };
  /**
   * Segmented control (toggle buttons, aria-pressed). Tab lands on the chosen one; arrows move between them.
   * opts: { size:'sm', label | labelledby (name the group), disabled }. el.set(v) changes the choice in place; el.value reads it.
   */
  ui.seg = (options, value, onChange, { size = '', label, labelledby, disabled = false } = {}) => {
    const sig = 'seg:' + (label || '') + ':' + options.map(o => o.value).join('|');
    const el = MA.h('div', { class: ('seg ' + size).trim(), role: 'group', 'aria-label': labelledby ? null : label, 'aria-labelledby': labelledby || null, dataset: { group: sig } });
    let cur = value;
    const btns = options.map(o => MA.h('button', { type: 'button', disabled: disabled || o.disabled, title: o.title, 'aria-label': o.label == null || o.label === '' ? o.title : null, dataset: { value: String(o.value) },
      html: (o.icon ? MA.icon(o.icon, 'sm') : '') + (o.label != null ? `<span>${esc(o.label)}</span>` : ''),
      onclick: e => { const had = document.activeElement === e.currentTarget; set(o.value); onChange(o.value); if (had) keepFocus(el, sig, o.value, 'button'); } }));
    el.append(...btns);
    const set = v => { cur = v; let any = false; btns.forEach(b => { const on = b.dataset.value === String(v); any ||= on && !b.disabled; b.setAttribute('aria-pressed', String(on)); b.tabIndex = on ? 0 : -1; }); if (!any) { const f = btns.find(b => !b.disabled); if (f) f.tabIndex = 0; } };
    roving(el, 'button');
    set(value); el.set = set; Object.defineProperty(el, 'value', { get: () => cur });
    return el;
  };
  /** Switch (a checkbox with role=switch). label: visible text; or name it with opts.labelledby / opts.ariaLabel (for rows that show the label elsewhere). */
  ui.switch = (checked, onChange, label = '', { disabled, labelledby, describedby, ariaLabel } = {}) => {
    const inp = MA.h('input', { type: 'checkbox', checked: !!checked, disabled, role: 'switch', 'aria-labelledby': labelledby || null, 'aria-describedby': describedby || null, 'aria-label': ariaLabel || null, onchange: e => onChange(e.target.checked) });
    const sw = MA.h('label.switch', inp, MA.h('span.track'), label ? MA.h('span', { html: label }) : null); sw.input = inp; return sw;
  };
  ui.select = (options, value, onChange, { cls = '', label, labelledby, id } = {}) => {
    const s = MA.h('select', { class: 'select ' + cls, id: id || null, 'aria-label': labelledby ? null : label, 'aria-labelledby': labelledby || null, onchange: e => onChange(e.target.value) });
    options.forEach(o => { const opt = typeof o === 'object' ? o : { value: o, label: o }; s.append(MA.h('option', { value: opt.value, selected: String(opt.value) === String(value) }, opt.label)); });
    return s;
  };
  /**
   * Tabs (APG tabs pattern): one Tab stop, ←/→/Home/End move and select, aria-controls → the panel.
   * items: [{value, label, icon, count}]. opts: { label (names the tab list), panel: Element | id (gets role=tabpanel, labelled by the selected tab) }.
   * el.set(v) selects in place; el.setCount(value, count) updates a count.
   */
  let tabsN = 0;
  ui.tabs = (items, value, onChange, { label, panel } = {}) => {
    const uid = 'tabs' + (++tabsN), sig = 'tabs:' + (label || '') + ':' + items.map(t => t.value).join('|');
    const el = MA.h('div.tabs', { role: 'tablist', 'aria-label': label || null, dataset: { group: sig } });
    const pEl = () => typeof panel === 'string' ? document.getElementById(panel) : panel || null;
    const pid = panel ? (typeof panel === 'string' ? panel : (panel.id ||= uid + '-panel')) : null;
    const btns = items.map((t, i) => MA.h('button', { type: 'button', role: 'tab', id: `${uid}-${i}`, 'aria-controls': pid, dataset: { value: String(t.value) },
      html: (t.icon ? MA.icon(t.icon, 'sm') : '') + esc(t.label) + (t.count != null ? ` <span class="count">${esc(t.count)}</span>` : ''),
      onclick: e => { const had = document.activeElement === e.currentTarget; set(t.value); onChange(t.value); if (had) keepFocus(el, sig, t.value, '[role=tab]'); } }));
    el.append(...btns);
    const set = v => {
      let sel = null; btns.forEach(b => { const on = b.dataset.value === String(v); if (on) sel = b; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      if (!sel && btns[0]) btns[0].tabIndex = 0;
      const p = pEl(); if (p) { p.setAttribute('role', 'tabpanel'); if (sel) p.setAttribute('aria-labelledby', sel.id); if (!p.hasAttribute('tabindex')) p.tabIndex = 0; }
    };
    roving(el, '[role=tab]', b => { if (b.getAttribute('aria-selected') !== 'true') b.click(); });
    el.setCount = (v, count) => { const b = btns.find(x => x.dataset.value === String(v)); if (!b) return; let c = b.querySelector('.count'); if (count == null) { c?.remove(); return; } if (!c) { b.append(' '); c = MA.h('span.count'); b.append(c); } c.textContent = count; };
    set(value); el.set = set; if (panel && !pEl()) queueMicrotask(() => set(value)); // a panel id that isn't in the DOM yet
    return el;
  };
  /** Labelled form row: the label is tied to the control (for/id), hint and error are announced with it (aria-describedby). */
  ui.field = (label, control, { hint, err, id } = {}) => {
    const ctl = !control?.matches ? null : control.matches('input,select,textarea,[role=textbox]') ? control : control.querySelector('input:not([type=hidden]):not([type=color]),select,textarea,[role=textbox]') || control.querySelector('input');
    const cid = id || ctl?.id || MA.uid('fld'); if (ctl && !ctl.id) ctl.id = cid;
    const lab = MA.h('label', { for: cid, id: cid + '-l', html: label });
    const f = MA.h('div.field', lab, control), desc = [];
    if (hint) { f.append(MA.h('p.hint', { html: hint, id: cid + '-h' })); desc.push(cid + '-h'); }
    if (err) { f.append(MA.h('p.err', { id: cid + '-e' }, err)); desc.push(cid + '-e'); ctl?.setAttribute('aria-invalid', 'true'); }
    if (ctl) {
      if (desc.length) ctl.setAttribute('aria-describedby', [ctl.getAttribute('aria-describedby'), ...desc].filter(Boolean).join(' '));
      if (!/^(INPUT|SELECT|TEXTAREA)$/.test(ctl.tagName) && label) ctl.setAttribute('aria-labelledby', lab.id); // a rich editor can't use <label for>
    }
    return f;
  };
  /**
   * One way to write a change, everywhere: "▲ 18% vs 13 Aug – 11 Sep" · "≈ flat" (under 2%) · "New" (no baseline) · "▲ 3 more" (both under 10).
   * opts: { goodWhen:'up'|'down' (colours the direction), label: what it's compared with ('13 Aug – 11 Sep'; default "the period before"),
   *         rate: true (cur/prev are shares: change in points), rel (a ratio, when only the change is known), short: true (no "vs" part) }
   * → <span class="delta up|down|flat|new good|bad"><b>▲ 18%</b> <span class="vs">vs …</span></span>, with .text (one plain sentence).
   */
  ui.delta = (cur, prev, opts = {}) => {
    const d = ui.delta.info(cur, prev, opts);
    const el = MA.h('span', { class: `delta ${d.dir}${d.tone ? ' ' + d.tone : ''}`, title: d.text }, MA.h('b', d.amt), opts.short ? null : [d.dir === 'new' ? ' · ' : ' ', MA.h('span.vs', d.vs)]);
    el.text = d.text; return el;
  };
  /** The parts of ui.delta: { dir:'up'|'down'|'flat'|'new', tone:'good'|'bad'|'', amt, vs, text } */
  ui.delta.info = (cur, prev, { goodWhen = 'up', label, rate = false, rel } = {}) => {
    const vs = label ? MA.t('d.vs', { range: label }) : MA.t('d.vsPrev');
    const out = (dir, amt, vsTxt = vs) => ({ dir, amt, vs: vsTxt, tone: dir === 'up' || dir === 'down' ? ((dir === 'up') === (goodWhen !== 'down') ? 'good' : 'bad') : '', text: `${amt}${dir === 'new' ? ' · ' : ' '}${vsTxt}`.trim() });
    if (cur == null && prev == null) {
      if (rel == null || !isFinite(rel)) return out('new', MA.t('d.new'), MA.t('d.noneBefore'));
      return Math.abs(rel) < .02 ? out('flat', MA.t('d.flat')) : out(rel > 0 ? 'up' : 'down', `${rel > 0 ? '▲' : '▼'} ${MA.pct(Math.abs(rel))}`);
    }
    cur = +cur || 0; prev = +prev || 0;
    if (!prev && !cur) return out('flat', MA.t('d.flat'));
    if (!prev) return out('new', MA.t('d.new'), label ? MA.t('d.none', { range: label }) : MA.t('d.noneBefore'));
    const r = (cur - prev) / prev; if (Math.abs(r) < .02) return out('flat', MA.t('d.flat'));
    const up = r > 0, diff = Math.abs(cur - prev), arrow = up ? '▲' : '▼';
    if (rate) return out(up ? 'up' : 'down', `${arrow} ${MA.t('d.pts', { count: Math.round(diff * 1000) / 10, n: MA.num(Math.round(diff * 1000) / 10, { maximumFractionDigits: 1 }) })}`);
    if (cur < 10 && prev < 10) return out(up ? 'up' : 'down', `${arrow} ${MA.t(up ? 'd.more' : 'd.fewer', { n: MA.num(diff) })}`);
    return out(up ? 'up' : 'down', `${arrow} ${MA.pct(Math.abs(r))}`);
  };
  /** KPI tile. Change: pass cur + prev (+ goodWhen, vs: comparison label) for the full grammar, or delta (a ratio) when that's all there is. */
  ui.kpi = ({ label, value, delta, cur, prev, goodWhen, vs, spark, unit, sample }) => {
    const hasCmp = cur != null && prev != null, d = hasCmp ? ui.delta(cur, prev, { goodWhen, label: vs }) : delta == null || !isFinite(delta) ? null : ui.delta(null, null, { rel: delta, goodWhen, label: vs });
    const el = MA.h('div.kpi',
      MA.h('div.k-label', MA.h('span.label', label), sample ? ui.sample() : null),
      MA.h('div.k-value', { html: esc(value) + (unit ? `<small>${esc(unit)}</small>` : '') }),
      d ? MA.h('div.k-delta', d) : null);
    if (spark?.length) el.append(MA.h('div.k-spark', { html: MA.chart.spark(spark) }));
    return el;
  };

  /* ---- layers: popovers, menus, modals, drawers, the palette ----
     One stack. A modal layer (modal, modal drawer, palette) makes the app and every layer under it inert, takes focus
     (the first [autofocus] or field, else a button, else its close button, else itself), keeps Tab inside, and gives focus
     back to whatever opened it. A non-modal drawer (preview, inbox brief) takes focus to its heading but leaves the page usable.
     Popovers and menus close when Tab leaves them. Esc closes the top layer. */
  const layers = [];
  MA.layers = () => layers.slice();
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable=true]';
  const focusables = root => $$(FOCUSABLE, root).filter(x => !x.closest('[inert],[hidden]') && x.getClientRects().length > 0);
  function syncInert() {
    let top = -1; layers.forEach((l, i) => { if (l.modal) top = i; });
    const app = $('#app'); if (app) app.inert = top >= 0;
    layers.forEach((l, i) => { if (l.el) l.el.inert = i < top; });
  }
  const addLayer = L => { layers.push(L); syncInert(); return L; };
  const dropLayer = L => { const i = layers.indexOf(L); if (i >= 0) layers.splice(i, 1); if (L.el) L.el.inert = false; syncInert(); };
  function closeLayers() { while (layers.length) { const L = layers.at(-1); L.close(true); if (layers.at(-1) === L) layers.pop(); } syncInert(); }
  MA.closeLayers = closeLayers;
  /** Give focus to a layer once it is drawn, unless something inside it already has it. pick() → the element to focus. */
  const takeFocus = (L, pick) => setTimeout(() => { if (!L.el?.isConnected) return; const a = document.activeElement; if (a && a !== document.body && L.el.contains(a)) return; const t = pick(); if (t) { if (!t.matches(FOCUSABLE) && !t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } }, 30);
  addEventListener('keydown', e => { if (e.key === 'Escape' && layers.length) { e.preventDefault(); e.stopPropagation(); layers.at(-1).close(); } }, true);
  // Tab: wraps inside a modal layer; leaves (and closes) a popover or menu
  addEventListener('keydown', e => {
    if (e.key !== 'Tab' || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const L = layers.at(-1); if (!L?.el) return;
    const a = document.activeElement, f = focusables(L.el);
    // a menu closes on Tab; a popover when Tab leaves its first or last control. Focus goes back to the trigger first, so Tab then moves on from there.
    if (L.kind === 'pop') { if (L.menu || !f.length || !L.el.contains(a) || (e.shiftKey ? a === f[0] : a === f.at(-1))) L.close(); return; }
    if (!L.modal) return;
    if (!f.length) { e.preventDefault(); L.el.focus?.(); return; }
    if (!L.el.contains(a)) { e.preventDefault(); (e.shiftKey ? f.at(-1) : f[0]).focus(); return; }
    if (e.shiftKey && a === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && a === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }, true);
  /** Popover anchored to an element. content: Node. opts: { align, width, onClose, label (names a non-menu popover) }. Returns { el, close }. */
  ui.pop = (anchor, content, { align = 'start', width, onClose, label, menu = false } = {}) => {
    const scrim = MA.h('div.scrim.clear'), pop = MA.h('div.pop', { role: menu ? null : 'dialog', 'aria-label': menu ? null : (label || anchor?.getAttribute?.('aria-label') || null) }, content);
    if (width) pop.style.width = width + 'px';
    document.body.append(scrim, pop);
    const r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight, rtl = document.dir === 'rtl';
    let x = (align === 'end') !== rtl ? r.right - pw : r.left; x = MA.clamp(x, 8, innerWidth - pw - 8);
    let y = r.bottom + 6; if (y + ph > innerHeight - 8) y = Math.max(8, r.top - ph - 6);
    Object.assign(pop.style, { left: x + 'px', top: y + 'px' });
    let closed = false;
    const L = { el: pop, kind: 'pop', menu, anchor, modal: false, close(silent) { if (closed) return; closed = true; dropLayer(L); scrim.remove(); pop.remove(); onClose?.(); if (!silent) anchor.focus?.({ preventScroll: true }); } };
    scrim.addEventListener('pointerdown', () => L.close());
    addLayer(L); $$(menu ? '[role^=menuitem]:not([disabled])' : FOCUSABLE, pop).find(x => !x.disabled)?.focus({ preventScroll: true });
    return L;
  };
  /** Menu: items = [{label, icon, run, danger, checked, meta, href, disabled} | '-' | {heading}]. ↑/↓/Home/End and type-ahead move; Tab or Esc closes. */
  ui.menu = (anchor, items, opts = {}) => {
    const box = MA.h('div', { role: 'menu', 'aria-label': opts.label || anchor?.getAttribute?.('aria-label') || null });
    let L;
    items.forEach(it => {
      if (!it) return;
      if (it === '-') return box.append(MA.h('div.menu-sep', { role: 'separator' }));
      if (it.heading) return box.append(MA.h('div', { class: 'menu-label label' + (it.plain ? ' plain' : ''), role: 'presentation' }, it.heading)); // plain: a value (an email), not a section name
      const b = MA.h(it.href ? 'a' : 'button', { class: 'menu-item' + (it.danger ? ' danger' : ''), href: it.href, target: it.target, role: it.checked != null ? 'menuitemradio' : 'menuitem', tabindex: '-1', 'aria-checked': it.checked == null ? null : String(!!it.checked), disabled: it.disabled, 'aria-disabled': it.disabled ? 'true' : null, type: it.href ? null : 'button',
        html: (it.icon ? MA.icon(it.icon, 'sm') : '') + `<span>${esc(it.label)}</span>` + (it.meta ? `<span class="meta">${it.meta}</span>` : ''),
        onclick: e => { if (it.disabled) return; L.close(); it.run?.(e); } });
      box.append(b);
    });
    box.addEventListener('keydown', e => {
      const its = $$('.menu-item:not([disabled])', box), i = its.indexOf(document.activeElement); if (!its.length) return;
      const go = j => { e.preventDefault(); its[(j + its.length) % its.length]?.focus(); };
      if (e.key === 'ArrowDown') go(i + 1); else if (e.key === 'ArrowUp') go(i - 1); else if (e.key === 'Home') go(0); else if (e.key === 'End') go(its.length - 1);
      else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && /\S/.test(e.key)) { // type-ahead: the next item starting with that letter
        const k = MA.fold(e.key), order = [...its.slice(i + 1), ...its.slice(0, i + 1)], hit = order.find(x => MA.fold(x.textContent.trim()).startsWith(k));
        if (hit) { e.preventDefault(); hit.focus(); }
      }
    });
    if (anchor?.setAttribute) { anchor.setAttribute('aria-haspopup', 'menu'); anchor.setAttribute('aria-expanded', 'true'); }
    L = ui.pop(anchor, box, { ...opts, menu: true, onClose: () => { anchor?.setAttribute?.('aria-expanded', 'false'); opts.onClose?.(); } }); return L;
  };
  /** Modal. body: Node | (el, close) => void. actions: [{label, kind, run(close) → false to keep open}]. opts.initial: () => element to focus first. */
  ui.modal = ({ title, body, actions, size = '', onClose, dismissable = true, initial }) => {
    const hid = MA.uid('mh'), scrim = MA.h('div.scrim'), wrap = MA.h('div.modal-wrap'), box = MA.h('div', { class: 'modal ' + size, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': hid, tabindex: '-1' });
    let closed = false;
    const close = (silent) => { if (closed) return; closed = true; dropLayer(L); scrim.remove(); wrap.remove(); onClose?.(); if (!silent && prevFocus?.isConnected) prevFocus.focus?.({ preventScroll: true }); };
    const prevFocus = document.activeElement;
    const closeBtn = ui.iconBtn('close', { tip: MA.t('close'), onclick: () => close() });
    const head = MA.h('div.modal-head', MA.h('h2.h2', { id: hid, html: title }), closeBtn);
    const bodyEl = MA.h('div.modal-body');
    const L = { el: box, body: bodyEl, close, kind: 'modal', modal: true }; addLayer(L);
    if (typeof body === 'function') body(bodyEl, close); else if (body) bodyEl.append(body);
    box.append(head, bodyEl);
    if (actions?.length) box.append(MA.h('div.modal-foot', actions.map(a => MA.h('button', { type: 'button', class: 'btn ' + (a.kind || ''), disabled: a.disabled, onclick: async () => { if ((await a.run?.(close, bodyEl)) !== false) close(); }, html: (a.icon ? MA.icon(a.icon) : '') + `<span>${esc(a.label)}</span>` }))));
    wrap.append(box); document.body.append(scrim, wrap);
    wrap.addEventListener('pointerdown', e => { if (e.target === wrap && dismissable) close(); });
    syncInert();
    takeFocus(L, () => initial?.() || bodyEl.querySelector('[autofocus],input:not([type=hidden]),textarea,select,[contenteditable=true]') || box.querySelector('.modal-foot .btn.primary,.modal-foot .btn') || focusables(bodyEl)[0] || closeBtn || box);
    return L;
  };
  ui.confirm = (title, text = '', { ok = MA.t('confirm'), danger = false, cancel = MA.t('cancel') } = {}) => new Promise(res => {
    let answered = false;
    ui.modal({ title, body: text ? MA.h('p.muted', { html: text }) : null, onClose: () => answered || res(false),
      actions: [{ label: cancel, kind: 'ghost', run: () => { answered = true; res(false); } }, { label: ok, kind: danger ? 'danger solid' : 'primary', run: () => { answered = true; res(true); } }] });
  });
  ui.prompt = (title, { value = '', label = '', placeholder = '', ok = MA.t('save'), multiline = false, hint } = {}) => new Promise(res => {
    let answered = false;
    const inp = MA.h(multiline ? 'textarea' : 'input', { class: multiline ? 'textarea' : 'input', value, placeholder, autofocus: true, 'aria-label': label ? null : MA.strip(title) });
    if (multiline) inp.value = value;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !multiline) { e.preventDefault(); answered = true; L.close(); res(inp.value); } });
    const L = ui.modal({ title, body: ui.field(label, inp, { hint }), onClose: () => answered || res(null),
      actions: [{ label: MA.t('cancel'), kind: 'ghost', run: () => { answered = true; res(null); } }, { label: ok, kind: 'primary', run: () => { answered = true; res(inp.value); } }] });
  });
  /** Side drawer. render(bodyEl, L). modal (default true): the page behind is inert. Returns { el, body, foot, close }. */
  ui.drawer = ({ title, render, width = 520, foot, onClose, modal = true, initial }) => {
    const hid = MA.uid('dh'), scrim = modal ? MA.h('div.scrim') : null, el = MA.h('aside.drawer', { role: 'dialog', 'aria-modal': modal ? 'true' : null, 'aria-labelledby': hid, tabindex: '-1', style: `--dw:${width}px` });
    const prevFocus = document.activeElement;
    let closed = false;
    const close = (silent) => { if (closed) return; closed = true; dropLayer(L); scrim?.remove(); el.remove(); onClose?.(); if (!silent && prevFocus?.isConnected) prevFocus.focus?.({ preventScroll: true }); };
    const body = MA.h('div.drawer-body'), footEl = MA.h('div.drawer-foot');
    const heading = MA.h('h2.h3', { id: hid, html: title, tabindex: '-1' }), closeBtn = ui.iconBtn('close', { tip: MA.t('close'), onclick: () => close() });
    el.append(MA.h('div.drawer-head', heading, closeBtn), body);
    const L = { el, body, foot: footEl, close, kind: 'drawer', modal };
    if (foot) { foot(footEl, L); el.append(footEl); }
    document.body.append(...[scrim, el].filter(Boolean));
    scrim?.addEventListener('pointerdown', () => close());
    addLayer(L); render?.(body, L);
    takeFocus(L, () => initial?.() || (modal ? body.querySelector('[autofocus]') || focusables(body)[0] || closeBtn : heading));
    return L;
  };
  /* ---- toasts: one polite live region from boot; errors are alerts. Hover or focus holds a toast, and so does a hidden tab.
     Toasts with an action stay at least 10 s. The newest undo is also on ⌥Z (Alt+Z), and on ⌘Z when nothing was edited since. */
  let toastUndo = null;
  const TOASTS = new Set();
  const toastRegion = () => { let box = $('.toasts'); if (!box) { box = MA.h('div.toasts', { role: 'status', 'aria-live': 'polite', 'aria-relevant': 'additions' }); document.body.append(box); } return box; };
  MA.toast = (msg, opts = {}) => {
    const box = toastRegion();
    const act = opts.undo ? { label: MA.t('undo'), run: opts.undo, undo: true } : opts.action;
    const t = MA.h('div', { class: 'toast ' + (opts.tone || ''), role: opts.tone === 'bad' ? 'alert' : null }, MA.frag(MA.icon(opts.tone === 'bad' ? 'warn' : opts.icon || 'check')), MA.h('span', { html: msg }));
    let done = false, timer = 0, left = opts.ms || (act ? 10000 : 4000), started = 0;
    const st = { hover: false, focus: false };
    const kill = () => { if (done) return; done = true; clearTimeout(timer); TOASTS.delete(api); if (toastUndo?.t === t) toastUndo = null; t.classList.add('out'); setTimeout(() => t.remove(), 260); };
    const sync = () => { if (done) return; const hold = st.hover || st.focus || document.hidden; if (hold && timer) { clearTimeout(timer); timer = 0; left = Math.max(2000, left - (Date.now() - started)); } else if (!hold && !timer) { started = Date.now(); timer = setTimeout(kill, left); } };
    const api = { t, sync, kill };
    if (act) {
      const b = MA.h('button', { type: 'button', onclick: () => { act.run(); kill(); } }, act.label);
      t.append(b);
      if (act.undo) { const k = MA.keys.effective('alt+z'); b.setAttribute('aria-keyshortcuts', MA.keys.aria(k)); t.append(MA.h('kbd.tk', { 'aria-hidden': 'true', title: MA.t('k.toastUndo') }, MA.keys.label(k))); }
      if (act.undo) t.append(MA.h('span.sr-only', MA.t('toast.undoHint', { key: MA.keys.label(MA.keys.effective('alt+z')) })));
    }
    box.append(t);
    while (box.children.length > 3) { const old = box.firstElementChild; [...TOASTS].find(x => x.t === old)?.kill(); old.remove(); }
    t.addEventListener('pointerenter', () => { st.hover = true; sync(); }); t.addEventListener('pointerleave', () => { st.hover = false; sync(); });
    t.addEventListener('focusin', () => { st.focus = true; sync(); }); t.addEventListener('focusout', e => { if (!t.contains(e.relatedTarget)) { st.focus = false; sync(); } });
    TOASTS.add(api); sync();
    if (act?.undo) toastUndo = { t, at: ++actN, run: () => { act.run(); kill(); } };
    return kill;
  };
  document.addEventListener('visibilitychange', () => { for (const x of TOASTS) x.sync(); });
  /** Run the newest toast's Undo while it is on screen. → true if something was undone */
  MA.toast.undo = () => { const u = toastUndo; if (!u || !u.t.isConnected) return false; u.run(); return true; };
  /** Order number of the newest undo toast on screen (0 = none): ⌘Z uses it if no content edit came after it. */
  MA.toast.undoAt = () => toastUndo?.t.isConnected ? toastUndo.at : 0;
  /** Make children of `list` draggable to reorder. itemSel: selector for items; handleSel optional; onEnd(newOrderOfDatasetIds) */
  ui.sortable = (list, { item = '[data-id]', handle, onEnd, axis = 'y' } = {}) => {
    let drag = null;
    const down = e => {
      const it = e.target.closest(item); if (!it || !list.contains(it)) return;
      if (handle && !e.target.closest(handle)) return;
      if (e.target.closest('input,textarea,select,[contenteditable=true]') ) return;
      if (e.button !== 0) return;
      drag = { it, x: e.clientX, y: e.clientY, started: false, id: e.pointerId };
      addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    };
    list.addEventListener('pointerdown', down);
    const move = e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.started) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return; drag.started = true; drag.it.classList.add('dragging'); document.body.style.userSelect = 'none'; }
      const sibs = $$(item, list).filter(x => x !== drag.it && x.parentElement === drag.it.parentElement);
      for (const s of sibs) {
        const r = s.getBoundingClientRect(), mid = axis === 'x' ? r.left + r.width / 2 : r.top + r.height / 2, p = axis === 'x' ? e.clientX : e.clientY;
        const inside = axis === 'x' ? (e.clientY > r.top && e.clientY < r.bottom && e.clientX > r.left && e.clientX < r.right) : (e.clientY > r.top && e.clientY < r.bottom);
        if (inside) { const before = (p < mid) !== (axis === 'x' && document.dir === 'rtl'); s.parentElement.insertBefore(drag.it, before ? s : s.nextSibling); break; }
      }
    };
    const up = e => {
      if (!drag || e.pointerId !== drag.id) return;
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      const d = drag; drag = null; document.body.style.userSelect = '';
      if (!d.started) return; d.it.classList.remove('dragging');
      if (e.type === 'pointercancel') return;
      const swallow = ev => { ev.stopPropagation(); ev.preventDefault(); }; addEventListener('click', swallow, { capture: true, once: true }); setTimeout(() => removeEventListener('click', swallow, { capture: true }), 50);
      onEnd?.($$(item, list).map(x => x.dataset.id));
    };
    return { destroy() { list.removeEventListener('pointerdown', down); removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); } };
  };

  /* ================= charts (SVG strings; bind hover with MA.chart.hover) ================= */
  const CH = MA.chart = {};
  CH.colors = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];
  const niceMax = v => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
  const smoothPath = pts => { if (!pts.length) return ''; let d = `M${pts[0][0]},${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`; } return d; };
  CH.spark = (vals, { w = 120, h = 36, color = 'var(--accent)', fill = true } = {}) => {
    if (!vals?.length) return '';
    const max = Math.max(...vals, 1), min = Math.min(...vals, 0), r = max - min || 1;
    const pts = vals.map((v, i) => [+(i / Math.max(1, vals.length - 1) * w).toFixed(1), +(h - 2 - (v - min) / r * (h - 4)).toFixed(1)]);
    const line = smoothPath(pts); // area: a flat translucent fill (no gradients in the system)
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible" aria-hidden="true">${fill ? `<path d="${line} L${w},${h} L0,${h} Z" fill="${color}" fill-opacity=".1"/>` : ''}<path d="${line}" fill="none" stroke="${color}" stroke-width="1.7" vector-effect="non-scaling-stroke" stroke-linecap="round"/></svg>`;
  };
  /**
   * Line/area chart. series: [{label, values:number[], color?, dashed?, area?}], labels: string[] (x labels, same length)
   * Returns an element; hover shows a tooltip with every series.
   * Accessible name: opts.label (+ opts.desc, a one-sentence summary), else one is made from the series and the date span.
   * opts.hidden: true when the caller shows its own text summary or table (the drawing is then aria-hidden).
   */
  const svgName = (label, desc, hidden) => hidden ? 'aria-hidden="true" focusable="false"' : `role="img" aria-label="${esc(MA.strip(label))}"${desc ? ` aria-description="${esc(MA.strip(desc))}"` : ''}`;
  CH.lines = (series, labels, { h = 220, w = 720, yFmt = v => MA.compact(v), xEvery, stacked = false, area = true, label, desc, hidden = false } = {}) => {
    const pad = { l: 36, r: 8, t: 10, b: 24 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b, n = labels.length;
    const max = niceMax(Math.max(1, ...series.flatMap(s => s.values)));
    const X = i => pad.l + (n <= 1 ? iw / 2 : i / (n - 1) * iw), Y = v => pad.t + ih - v / max * ih;
    const ticks = [0, .25, .5, .75, 1].map(f => f * max);
    const every = xEvery || Math.ceil(n / 7);
    const name = label || MA.t('ch.lines', { series: series.map(x => x.label).filter(Boolean).join(', '), from: labels[0] ?? '', to: labels.at(-1) ?? '' });
    let svg = `<svg viewBox="0 0 ${w} ${h}" ${svgName(name, desc, hidden)}>${hidden ? '' : `<title>${esc(MA.strip(name))}</title>${desc ? `<desc>${esc(MA.strip(desc))}</desc>` : ''}`}<g class="grid">${ticks.map(t => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(t)}" y2="${Y(t)}"/>`).join('')}</g>`;
    svg += `<g class="axis">${ticks.map(t => `<text x="${pad.l - 8}" y="${Y(t) + 3}" text-anchor="end">${esc(yFmt(t))}</text>`).join('')}${labels.map((l, i) => i % every === 0 || i === n - 1 ? `<text x="${X(i)}" y="${h - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${esc(l)}</text>` : '').join('')}</g>`;
    series.forEach((s, k) => {
      const c = s.color || CH.colors[k % 6], pts = s.values.map((v, i) => [X(i), Y(v)]), d = smoothPath(pts);
      if (area && s.area !== false && !s.dashed) svg += `<path d="${d} L${X(n - 1)},${Y(0)} L${X(0)},${Y(0)} Z" fill="${c}" fill-opacity="${k ? .05 : .09}"/>`; // flat translucent area
      svg += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${s.dashed ? 1.4 : 2}" ${s.dashed ? 'stroke-dasharray="4 4" stroke-opacity=".7"' : ''} stroke-linecap="round"/>`;
    });
    svg += `<line class="hover-line" x1="0" x2="0" y1="${pad.t}" y2="${pad.t + ih}" style="display:none"/><g class="dots"></g></svg>`;
    const el = MA.h('div.chart', { html: svg });
    const tip = MA.h('div.chart-tip', { hidden: true }); el.append(tip);
    const sv = el.querySelector('svg'), hl = sv.querySelector('.hover-line'), dots = sv.querySelector('.dots');
    sv.addEventListener('pointermove', e => {
      const r = sv.getBoundingClientRect(), sx = (e.clientX - r.left) / r.width * w, i = MA.clamp(Math.round((sx - pad.l) / iw * (n - 1)), 0, n - 1);
      hl.style.display = ''; hl.setAttribute('x1', X(i)); hl.setAttribute('x2', X(i));
      dots.innerHTML = series.map((s, k) => `<circle cx="${X(i)}" cy="${Y(s.values[i] ?? 0)}" r="3.5" fill="var(--panel)" stroke="${s.color || CH.colors[k % 6]}" stroke-width="2"/>`).join('');
      tip.hidden = false; tip.innerHTML = `<div class="t">${esc(labels[i])}</div>` + series.map((s, k) => `<div class="r"><span class="swatch" style="background:${s.color || CH.colors[k % 6]};width:8px;height:8px;border-radius:2px"></span>${esc(s.label)}<b>${esc(yFmt(s.values[i] ?? 0))}</b></div>`).join('');
      tip.style.left = (X(i) / w * r.width) + 'px'; tip.style.top = (Math.min(...series.map(s => Y(s.values[i] ?? 0))) / h * r.height) + 'px';
    });
    sv.addEventListener('pointerleave', () => { hl.style.display = 'none'; dots.innerHTML = ''; tip.hidden = true; });
    return el;
  };
  /** Vertical bars. items: [{label, value, color?}]. opts: { label, desc, hidden } as in lines(). */
  CH.columns = (items, { h = 180, w = 520, yFmt = v => MA.compact(v), color = 'var(--accent)', label, desc, hidden = false } = {}) => {
    const pad = { l: 30, r: 4, t: 8, b: 22 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b, n = items.length || 1, max = niceMax(Math.max(1, ...items.map(i => i.value)));
    const bw = iw / n * .62, X = i => pad.l + (i + .5) * iw / n, Y = v => pad.t + ih - v / max * ih;
    const every = Math.ceil(n / 12);
    const name = label || MA.t('ch.columns', { items: items.slice(0, 12).map(it => `${it.label} ${yFmt(it.value)}`).join(', ') + (items.length > 12 ? '…' : '') });
    const svg = `<svg viewBox="0 0 ${w} ${h}" ${svgName(name, desc, hidden)}>${hidden ? '' : `<title>${esc(MA.strip(name))}</title>`}<g class="grid">${[0, .5, 1].map(f => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(f * max)}" y2="${Y(f * max)}"/>`).join('')}</g><g class="axis">${[0, .5, 1].map(f => `<text x="${pad.l - 6}" y="${Y(f * max) + 3}" text-anchor="end">${esc(yFmt(f * max))}</text>`).join('')}${items.map((it, i) => i % every === 0 ? `<text x="${X(i)}" y="${h - 6}" text-anchor="middle">${esc(it.label)}</text>` : '').join('')}</g>${items.map((it, i) => `<rect x="${X(i) - bw / 2}" y="${Y(it.value)}" width="${bw}" height="${Math.max(0, pad.t + ih - Y(it.value))}" rx="${Math.min(4, bw / 3)}" fill="${it.color || color}"><title>${esc(it.label)}: ${esc(yFmt(it.value))}</title></rect>`).join('')}</svg>`;
    return MA.h('div.chart', { html: svg });
  };
  /** Horizontal bar list (HTML). items: [{label, value, color?, icon?, href?}] */
  CH.barlist = (items, { max, fmt = v => MA.num(v), total, empty = '—' } = {}) => {
    if (!items.length) return MA.h('p.faint.small', empty);
    const m = max || Math.max(1, ...items.map(i => i.value)), tot = total ?? items.reduce((s, i) => s + i.value, 0);
    return MA.h('div.barlist', items.map(it => MA.h(it.href ? 'a' : 'div', { class: 'b', href: it.href, style: it.color ? `--bc:color-mix(in srgb, ${it.color} 22%, transparent)` : '', html:
      `<i style="width:${(it.value / m * 100).toFixed(1)}%"></i>${it.icon ? MA.icon(it.icon, 'sm') : ''}<span class="truncate">${esc(it.label)}</span><span class="v">${esc(fmt(it.value))}</span>${tot ? `<span class="p">${MA.pct(it.value / tot)}</span>` : ''}` })));
  };
  /** Donut. items: [{label, value, color?}] */
  CH.ring = (items, { size = 150, thick = 18, center = '' } = {}) => {
    const tot = items.reduce((s, i) => s + i.value, 0) || 1, r = (size - thick) / 2, c = 2 * Math.PI * r; let off = 0;
    const segsSvg = items.map((it, k) => { const len = it.value / tot * c, s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${it.color || CH.colors[k % 6]}" stroke-width="${thick}" stroke-dasharray="${Math.max(0, len - 2)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"><title>${esc(it.label)}: ${MA.pct(it.value / tot)}</title></circle>`; off += len; return s; }).join('');
    return `<svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--panel3)" stroke-width="${thick}"/>${segsSvg}${center ? `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" style="font:400 26px var(--serif);fill:var(--ink)">${esc(center)}</text>` : ''}</svg>`;
  };
  CH.legend = items => MA.h('div.legend', items.map((it, k) => MA.h('span', { html: `<i style="--c:${it.color || CH.colors[k % 6]}"></i>${esc(it.label)}${it.value != null ? ` <b class="num">${esc(it.value)}</b>` : ''}` })));
  /** Funnel (HTML). steps: [{label, value}] */
  CH.funnel = (steps, { fmt = v => MA.num(v) } = {}) => {
    const top = Math.max(1, steps[0]?.value || 1);
    return MA.h('div.funnel', { style: 'display:flex;flex-direction:column;gap:6px' }, steps.map((s, i) => {
      const p = s.value / top, prev = i ? steps[i - 1].value : null;
      return MA.h('div', { style: 'display:grid;grid-template-columns:minmax(110px,1.1fr) 3fr auto;align-items:center;gap:12px', html:
        `<span class="small truncate">${esc(s.label)}</span><span style="position:relative;height:28px;border-radius:var(--r1);background:var(--panel3);overflow:hidden"><i style="position:absolute;inset-block:0;inset-inline-start:0;width:${(p * 100).toFixed(1)}%;background:color-mix(in srgb,var(--accent) ${Math.round(100 - i * 14)}%,transparent);border-radius:inherit"></i></span><span class="mono tiny num" style="min-width:8.5em;text-align:end;direction:ltr">${esc(fmt(s.value))}${prev ? ` <span class="faint">· ${MA.pct(prev ? s.value / prev : 0)}</span>` : ''}</span>` });
    }));
  };
  /** Heat grid (7 rows × 24 cols). m[d][h] numbers; rowLabels length 7. */
  CH.heat = (m, { rowLabels = [], color = 'var(--accent)' } = {}) => {
    const max = Math.max(1, ...m.flat());
    return MA.h('div', { style: 'display:grid;grid-template-columns:auto repeat(24,minmax(0,1fr));gap:3px;align-items:center;direction:ltr', html:
      m.map((row, d) => `<span class="tiny faint" style="padding-inline-end:6px">${esc(rowLabels[d] || '')}</span>` + row.map((v, h) => `<span title="${esc(rowLabels[d] || '')} ${h}:00 · ${v}" style="aspect-ratio:1;border-radius:3px;background:color-mix(in srgb,${color} ${Math.round(6 + v / max * 94)}%,var(--panel3))"></span>`).join('')).join('') +
      `<span></span>${Array.from({ length: 24 }, (_, h) => `<span class="tiny faint" style="text-align:center;font-size:var(--fs-min)">${h % 6 === 0 ? MA.num(h) : ''}</span>`).join('')}` });
  };

  /* ================= the sea: nested tide lines that never cross (brand motif) ================= */
  const SEAS = new Set();
  const swellF = (x, t) => .55 * Math.sin(6.283 * 1.05 * x + .45 * t) + .3 * Math.sin(6.283 * 2.2 * x - .7 * t + 1.7) + .15 * Math.sin(6.283 * 3.9 * x + 1.1 * t + .4);
  /** MA.sea(canvas, {lines, rough 0..1, color, alpha, calm, speed}) → { set(rough), destroy() } */
  /* Drawn only when something changed: a resize, set(), a theme change, or while the tide is moving (ambient on, motion allowed),
     and then at about 30 fps. With ambient off or reduced motion the sea is drawn once and the loop stops. */
  MA.sea = (cv, o = {}) => {
    o = Object.assign({ lines: 14, rough: .35, color: 'currentColor', alpha: .9, calm: .85, speed: .8, width: 1.1 }, o);
    const ctx = cv.getContext('2d'); let w = 0, h = 0, dpr = 1, t = Math.random() * 10, rough = o.rough, target = o.rough, vis = true, last = 0, lastDraw = 0, dirty = true, col = null, frames = 0;
    const ro = new ResizeObserver(() => { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); w = r.width; h = r.height; cv.width = Math.max(1, w * dpr); cv.height = Math.max(1, h * dpr); col = null; draw(); kickSea(); });
    const io = new IntersectionObserver(es => { vis = es[0]?.isIntersecting ?? true; if (vis) { dirty = true; kickSea(); } }); ro.observe(cv); io.observe(cv);
    function draw() {
      if (!w || !h) return;
      frames++;
      const N = o.lines, S = Math.max(24, Math.round(w / 8)), top = h * .18 * (.4 + rough), bot = h - 1, gap = (bot - top) / Math.max(1, N - 1), amp = h * .32 * rough, minGap = Math.max(.8, gap * .2);
      col ||= o.color === 'currentColor' ? getComputedStyle(cv).color : o.color;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); ctx.strokeStyle = col; ctx.lineWidth = o.width; ctx.globalAlpha = o.alpha; ctx.lineJoin = ctx.lineCap = 'round';
      let prev = null;
      for (let i = 0; i < N; i++) {
        const base = top + i * gap, e = Math.pow(MA.clamp(1 - i / ((N - 1) * o.calm), 0, 1), 1.5), ys = new Float32Array(S + 1);
        ctx.beginPath();
        for (let s = 0; s <= S; s++) { const x = s / S; let y = base - amp * e * swellF(x + i * .006, t - i * .05); if (prev) y = Math.max(y, prev[s] + minGap); ys[s] = y; s ? ctx.lineTo(x * w, y) : ctx.moveTo(0, y); }
        ctx.stroke(); prev = ys;
      }
    }
    const born = performance.now();
    const api = {
      /** One animation frame. Returns true while this sea still needs frames. */
      step(now) {
        if (!cv.isConnected) { if (now - born > 3000) { api.destroy(); return false; } return true; }
        if (!vis) return false;
        const moving = prefs.ambient && !MA.reducedMotion(), converging = Math.abs(target - rough) > .001;
        if (!moving && !converging && !dirty) { last = 0; return false; }
        if (!dirty && now - lastDraw < 32) return true; // ~30 fps is plenty for a slow tide
        const dt = last ? Math.min(.05, (now - last) / 1000) : .016; last = now;
        rough = converging ? rough + (target - rough) * (1 - Math.exp(-dt * 1.5)) : target;
        if (moving) t += dt * o.speed;
        draw(); dirty = false; lastDraw = now;
        return moving || Math.abs(target - rough) > .001;
      },
      set(r) { target = MA.clamp(r, 0, 1); kickSea(); },
      /** Theme or colour changed: recompute the stroke colour and draw again. */
      invalidate() { col = null; dirty = true; },
      destroy() { ro.disconnect(); io.disconnect(); SEAS.delete(api); }, draw,
      get frames() { return frames; }, // how many times it has drawn (tests use this to check it idles)
    };
    SEAS.add(api); kickSea(); return api;
  };
  let seaRaf = 0;
  function kickSea() { if (!seaRaf && SEAS.size && !document.hidden) seaRaf = requestAnimationFrame(seaLoop); }
  function seaLoop(now) { seaRaf = 0; let again = false; for (const s of [...SEAS]) if (s.step(now)) again = true; if (again) kickSea(); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { for (const s of SEAS) s.invalidate(); kickSea(); } });
  MA.on('prefs', () => { for (const s of SEAS) s.invalidate(); kickSea(); });

  /* ================= site bridge ================= */
  const SITE_URL = '../index.html';
  const ORIGIN = location.origin && location.origin !== 'null' ? location.origin : '*'; // the site and the admin share one origin
  const frames = new Set();
  let readyResolve; const readyP = new Promise(r => readyResolve = r);
  const CACHE_KEY = 'site.handshake';
  const cacheHandshake = d => { try { MA.idb.put('kv', CACHE_KEY, { defaults: d.defaults, published: d.published || null, icons: d.icons || {}, lang: d.lang || 'en', at: new Date().toISOString() }).catch(() => {}); } catch (e) {} };
  /** The site's flash() and goto() call scrollIntoView(), which also scrolls every parent document (the admin page around
      the preview). Patch it on the preview's own window so scrolling stays inside the frame. Handles every block mode; both
      flags are set so the older per-module copies (faq, process, services) see it is done and leave it alone. */
  const containScroll = w => {
    try {
      if (!w || w.__mirasContained) return; w.__mirasContained = w.__miContained = true;
      w.Element.prototype.scrollIntoView = function (o) {
        const r = this.getBoundingClientRect(), b = o && typeof o === 'object' ? o.block || 'start' : o === false ? 'end' : 'start';
        const off = b === 'center' ? (w.innerHeight - r.height) / 2 : b === 'end' ? w.innerHeight - r.height : b === 'nearest' ? Math.min(Math.max(r.top, 0), Math.max(0, w.innerHeight - r.height)) : 0;
        w.scrollTo({ top: Math.max(0, w.scrollY + r.top - off), behavior: 'instant' });
      };
    } catch (e) { /* not same-origin: nothing to patch */ }
  };
  MA.site = {
    url: SITE_URL, info: null, ready: readyP, offline: false, contentFailed: false, errors: [], source: null, cachedAt: null,
    /**
     * Load the site invisibly (?cms=export) to read its defaults and the content currently published.
     * The site posts {type:'miras:error', part, message} for any part of its content that failed, and miras:ready in any case.
     */
    handshake(ms = 9000) {
      MA.site.errors = [];
      const f = MA.h('iframe', { src: SITE_URL + '?cms=export', title: 'site data', 'aria-hidden': 'true', tabindex: '-1', style: 'position:fixed;left:-3000px;top:0;width:1280px;height:800px;border:0;visibility:hidden;pointer-events:none' });
      let done = false;
      const finish = info => { if (done) return; done = true; removeEventListener('message', onMsg); clearTimeout(timer); setTimeout(() => f.remove(), 50); readyResolve(info); };
      const timer = setTimeout(() => { MA.site.contentFailed = MA.site.errors.length > 0; MA.site.offline = !MA.site.contentFailed; finish(null); }, ms);
      const onMsg = e => {
        if (e.source !== f.contentWindow || (ORIGIN !== '*' && e.origin !== ORIGIN) || !e.data || typeof e.data.type !== 'string') return;
        if (e.data.type === 'miras:error') { const x = { part: String(e.data.part || '').slice(0, 60), message: String(e.data.message || '').slice(0, 300) }; MA.site.errors.push(x); MA.emit('site:error', { ...x, frame: null }); return; }
        if (e.data.type !== 'miras:ready') return;
        MA.site.info = e.data; MA.site.offline = false; MA.site.contentFailed = false; MA.site.source = 'live';
        // parts that failed while the site loaded come with ready (and again as miras:error after it, which this frame no longer hears)
        for (const x of Array.isArray(e.data.errors) ? e.data.errors : []) { const part = String(x?.part || '').slice(0, 60); if (part && !MA.site.errors.some(y => y.part === part)) MA.site.errors.push({ part, message: String(x?.message || '').slice(0, 300) }); }
        cacheHandshake(e.data); finish(e.data);
      };
      addEventListener('message', onMsg); document.body.append(f);
    },
    /** A readable name for a content part the site reported (miras:error part: 'faq', 'services', 'render'…). */
    partName: part => { const k = 'part.' + part; return MA.i18n.has(k) || MA.i18n.has(k, 'en') ? MA.t(k) : String(part || '—'); },
    /** The failed parts as one readable list ('Questions, Brand colours'), or '' when none. */
    errorText: () => [...new Set(MA.site.errors.map(x => x.part).filter(Boolean))].map(p => MA.site.partName(p)).join(MA.L({ en: ', ', ar: '، ', fa: '، ' })),
    /** The last handshake this browser saw (kept in IndexedDB), so the admin can start before the site answers. → info | null */
    async cached() { try { const c = await MA.idb.get('kv', CACHE_KEY); return c?.defaults ? c : null; } catch (e) { return null; } },
    /** Send a message to every live preview frame. */
    broadcast(m) { for (const fr of frames) if (!(m.type === 'miras:content' && fr.state.live === false)) fr.post(m); },
    flash(key) { MA.site.broadcast({ type: 'miras:flash', key }); },
    frames: () => [...frames],
    /**
     * Embed a live preview of the site. opts: { device: 'desktop'|'tablet'|'mobile', lang: 'en'|'ar', inspect, bar: true, section, live: false = ignore draft edits (post your own content) }
     * Returns { el, iframe, set(opts), goto(sectionId), flash(key), reload(), destroy() }.
     * Edits to the draft are pushed automatically; clicks in inspect mode emit MA 'site:pick' {key, lang}.
     * The frame never writes the draft: it gets the content by postMessage as soon as the site is ready.
     * While it can't be seen (page hidden, scrolled away, display:none) the site is told to pause its animation.
     */
    frame(opts = {}) {
      const st = Object.assign({ device: prefs.previewDevice || 'desktop', lang: prefs.previewLang || 'en', inspect: false, bar: true, section: null }, opts);
      const iframe = MA.h('iframe', { title: MA.t('preview'), loading: 'eager' });
      const device = MA.h('div.pv-device', iframe), stage = MA.h('div.pv-stage', device), loading = MA.h('div.pv-loading', MA.t('loading'));
      stage.append(loading);
      const el = MA.h('div.pv'); let ready = false, queue = [], paused = false, errTimer = 0, lastErrAt = 0;
      const WIDTH = { desktop: 1280, tablet: 820, mobile: 390 };
      const send = m => { try { iframe.contentWindow.postMessage(m, ORIGIN); } catch (e) {} };
      const post = m => { if (!ready) { queue.push(m); return; } send(m); if (m.type === 'miras:content') settleErr(); };
      // can anyone see it? (on screen, has a size, page visible) — checked on scroll, resize, visibility and intersection changes
      const onScreen = () => { if (!el.isConnected || document.hidden) return false; const r = stage.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
      const syncPause = () => { if (!ready) return; const want = !onScreen(); if (want !== paused) { paused = want; send({ type: want ? 'miras:pause' : 'miras:resume' }); } };
      const io = new IntersectionObserver(() => syncPause()); io.observe(stage);
      const errBox = MA.h('div.callout.bad.pv-err', { role: 'status', hidden: true, style: 'margin:8px 8px 0;padding:10px 12px;font-size:.86rem' });
      const showError = part => { lastErrAt = Date.now(); errBox.innerHTML = MA.icon('warn') + `<span>${esc(MA.t('pv.err', { part: part ? MA.site.partName(part) : '—' }))}</span>`; errBox.hidden = false; };
      const settleErr = () => { clearTimeout(errTimer); errTimer = setTimeout(() => { if (Date.now() - lastErrAt > 900) errBox.hidden = true; }, 1000); };
      const fit = () => {
        const W = WIDTH[st.device], cw = stage.clientWidth, ch = stage.clientHeight; if (!cw || !ch) return;
        const framed = st.device !== 'desktop' && cw > W + 40; stage.classList.toggle('framed', framed);
        const availW = framed ? cw - 32 : cw, availH = framed ? ch - 32 : ch, scale = Math.min(1, availW / W);
        Object.assign(device.style, { width: W + 'px', height: (availH / scale) + 'px', transform: `scale(${scale})`, flex: 'none' });
        stage.style.alignItems = 'flex-start';
      };
      const ro = new ResizeObserver(() => { fit(); syncPause(); }); ro.observe(stage);
      let bar = null, segDev, segLang, inspBtn;
      if (st.bar) {
        segDev = ui.seg([{ value: 'desktop', icon: 'monitor', title: MA.t('desktop') }, { value: 'tablet', icon: 'tablet', title: MA.t('tablet') }, { value: 'mobile', icon: 'mobile', title: MA.t('mobile') }], st.device, v => api.set({ device: v }), { size: 'sm', label: MA.t('preview') });
        segLang = ui.seg([{ value: 'en', label: 'EN', title: 'English' }, { value: 'ar', label: 'ع', title: 'العربية' }], st.lang, v => api.set({ lang: v }), { size: 'sm', label: MA.L({ en: 'Preview language', ar: 'لغة المعاينة', fa: 'زبان پیش‌نمایش' }) });
        inspBtn = ui.iconBtn('cursor', { tip: MA.t('inspectTip'), pressed: st.inspect, size: 'sm', tipPos: 'bottom', onclick: () => api.set({ inspect: !st.inspect }) });
        bar = MA.h('div.pv-bar', segDev, MA.h('div.url', { html: `<span>miras.qa</span><b>/${st.lang === 'ar' ? 'ar' : ''}</b>` }), segLang, inspBtn,
          ui.iconBtn('refresh', { tip: MA.t('reload'), size: 'sm', tipPos: 'bottom', onclick: () => api.reload() }),
          ui.iconBtn('external', { tip: MA.t('openNewTab'), size: 'sm', tipPos: 'bottom', onclick: () => open(SITE_URL + '?cms=preview', '_blank') }));
        el.append(bar);
      }
      el.append(errBox, stage);
      const api = {
        el, iframe, state: st, post, syncPause, showError,
        get paused() { return paused; },
        onReady() {
          containScroll(iframe.contentWindow);
          ready = true; paused = false; loading.remove();
          // the content goes first, so uploads (media:…) and unsaved edits are right from the first frame the site paints after ready
          if (st.live !== false && MA.content?.draft) { send({ type: 'miras:content', content: MA.content.forPreview(), lang: st.lang }); settleErr(); }
          send({ type: 'miras:inspect', on: st.inspect });
          if (st.section) { send({ type: 'miras:goto', id: st.section }); setTimeout(() => st.section && post({ type: 'miras:goto', id: st.section }), 800); }
          queue.splice(0).forEach(send);
          syncPause();
          MA.emit('site:frameReady', api);
        },
        /** opts.remember: false = an automatic choice (not saved as the preference). */
        set(o, { remember = true } = {}) {
          Object.assign(st, o);
          if ('device' in o) { fit(); segDev?.set(st.device); if (remember) MA.prefs.set('previewDevice', st.device); }
          if ('lang' in o) { post({ type: 'miras:lang', lang: st.lang }); segLang?.set(st.lang); const u = bar?.querySelector('.url b'); if (u) u.textContent = '/' + (st.lang === 'ar' ? 'ar' : ''); if (remember) MA.prefs.set('previewLang', st.lang); MA.emit('site:previewLang', st.lang); }
          if ('inspect' in o) { post({ type: 'miras:inspect', on: st.inspect }); inspBtn?.setAttribute('aria-pressed', String(st.inspect)); }
        },
        goto(id) { st.section = id; post({ type: 'miras:goto', id }); },
        flash(key) { post({ type: 'miras:flash', key }); },
        reload() { ready = false; paused = false; stage.append(loading); iframe.src = SITE_URL + '?cms=preview&t=' + Date.now(); },
        destroy() { ro.disconnect(); io.disconnect(); clearTimeout(errTimer); frames.delete(api); offCleanup(); },
      };
      frames.add(api);
      const offCleanup = MA.cleanup(() => api.destroy()); // a frame closed early (drawer) removes this itself, so nothing keeps it alive
      iframe.src = SITE_URL + '?cms=preview';
      requestAnimationFrame(fit);
      return api;
    },
  };
  addEventListener('message', e => {
    const m = e.data; if (!m || typeof m.type !== 'string' || !m.type.startsWith('miras:')) return;
    if (ORIGIN !== '*' && e.origin !== ORIGIN) return;
    const fr = [...frames].find(f => f.iframe.contentWindow === e.source); if (!fr) return;
    if (m.type === 'miras:ready') fr.onReady(e.source);
    else if (m.type === 'miras:pick') MA.emit('site:pick', { key: m.key, lang: m.lang, frame: fr });
    else if (m.type === 'miras:section') MA.emit('site:section', { id: m.id, frame: fr });
    else if (m.type === 'miras:error') { fr.showError(String(m.part || '').slice(0, 60)); MA.emit('site:error', { part: String(m.part || ''), message: String(m.message || ''), frame: fr }); }
  });
  document.addEventListener('visibilitychange', () => { for (const fr of frames) fr.syncPause(); });
  addEventListener('scroll', () => { for (const fr of frames) fr.syncPause(); }, { capture: true, passive: true }); // scroll events come at most once a frame
  // a click in a preview (inspect mode) → open that field wherever it lives
  MA.on('site:pick', ({ key, lang }) => { const loc = MA.content.fromPick(key); if (!loc) return; MA.content.focusAfterRoute = { tpl: loc.tpl, lang }; MA.go(`#/${loc.route}?field=${encodeURIComponent(loc.tpl)}`); });

  /**
   * The one live-preview pane for editor pages (Pages, Swells & services, Process, FAQ, Brand…), so every preview looks and
   * behaves the same: a Preview toggle for the page head, a head row (label, your extra controls, hide), the shared frame
   * toolbar, a resize grip (drag, ←/→, double-click resets), open/closed + width + device remembered per page, the phone
   * layout when the pane is narrower than 700px (unless a device was picked here), no device bezels, re-aimed when shown,
   * and the iframe destroyed while hidden. The page key `p` toggles it while the page is mounted.
   *   const pv = MA.ui.previewPane({ key: 'faq', section: 'faq' });
   *   view.append(MA.ui.pageHead({ title, actions: [pv.toggle] }), MA.ui.previewPane.split(editorEl, pv));
   * opts: { key, section, device:'auto'|'desktop'|'tablet'|'mobile', lang, label, toggleLabel, open (default true), width (440), min (340), max (820), head: Node[], bindKey (true) }
   * → { el, toggle, frame (null while hidden), visible, show(), hide(), toggleOpen(), goto(section), flash(key), destroy() }
   */
  ui.previewPane = (opts = {}) => {
    const o = Object.assign({ key: 'page', section: null, device: 'auto', lang: null, label: MA.t('pv.title'), toggleLabel: MA.t('preview'), open: true, width: 440, min: 340, max: 820, head: [], bindKey: true }, opts);
    const all = () => MA.db.get('pvPanes', {}), saved = () => all()[o.key] || {};
    const save = patch => { const a = all(); a[o.key] = { ...a[o.key], ...patch }; MA.db.set('pvPanes', a); };
    let fr = null, split = null, width = MA.clamp(+saved().width || o.width, o.min, o.max), visible = saved().open ?? o.open, alive = true;
    const el = MA.h('aside.pvp', { 'aria-label': o.label });
    const body = MA.h('div.pvp-body');
    const grip = MA.h('div.pvp-grip', { role: 'separator', tabindex: '0', 'aria-orientation': 'vertical', 'aria-label': MA.t('pv.resize'), 'aria-valuemin': String(o.min), 'aria-valuemax': String(o.max), title: MA.t('pv.resize') });
    el.append(grip, MA.h('div.pvp-head', MA.h('span.label', o.label), MA.h('span.grow'), ...[].concat(o.head || []), ui.iconBtn('close', { tip: MA.t('pv.hide'), size: 'sm', onclick: () => api.hide() })), body);
    const toggle = ui.btn(o.toggleLabel, { icon: 'eye', kind: 'ghost', onclick: () => api.toggleOpen() });
    toggle.classList.add('pvp-toggle'); toggle.setAttribute('aria-keyshortcuts', 'P');
    const device = () => saved().device || (o.device !== 'auto' ? o.device : (el.clientWidth || width) < 700 ? 'mobile' : 'desktop');
    const setWidth = w => { width = MA.clamp(Math.round(w), o.min, Math.max(o.min, Math.min(o.max, (split?.clientWidth || innerWidth) - 380))); for (const x of [split, el]) x?.style.setProperty('--pv-w', width + 'px'); grip.setAttribute('aria-valuenow', String(width)); return width; };
    const reDevice = () => { if (!fr || saved().device || o.device !== 'auto') return; const d = device(); if (fr.state.device !== d) fr.set({ device: d }, { remember: false }); };
    const build = () => {
      if (fr || !alive) return fr;
      fr = MA.site.frame({ section: o.section, device: device(), ...(o.lang ? { lang: o.lang } : {}) });
      const set0 = fr.set; fr.set = (x, how = {}) => { if ('device' in x && how.remember !== false) save({ device: x.device }); return set0(x, how); }; // a device picked here sticks to this page
      body.append(fr.el); requestAnimationFrame(reDevice);
      return fr;
    };
    const drop = () => { if (!fr) return; fr.destroy(); fr.el.remove(); fr = null; };
    const apply = () => {
      el.hidden = !visible; split?.classList.toggle('pv-off', !visible);
      toggle.setAttribute('aria-pressed', String(visible)); toggle.setAttribute('aria-expanded', String(visible));
      const tip = MA.t(visible ? 'pv.hide' : 'pv.show'); toggle.title = tip;
      if (visible) build(); else drop();
    };
    let drag = null;
    grip.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); grip.setPointerCapture?.(e.pointerId); drag = { x: e.clientX, w: el.offsetWidth }; (split || el).classList.add('pvp-resizing'); });
    grip.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; setWidth(drag.w + (document.dir === 'rtl' ? dx : -dx)); });
    const end = () => { if (!drag) return; drag = null; (split || el).classList.remove('pvp-resizing'); save({ width }); reDevice(); };
    grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
    grip.addEventListener('dblclick', () => { save({ width: setWidth(o.width) }); reDevice(); });
    grip.addEventListener('keydown', e => {
      const k = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : e.key === 'Home' ? 99 : e.key === 'End' ? -99 : 0; if (!k) return;
      e.preventDefault(); save({ width: setWidth(width + k * 24 * (document.dir === 'rtl' ? -1 : 1)) }); reDevice();
    });
    const api = {
      el, toggle, key: o.key,
      get frame() { return fr; }, get visible() { return visible; }, get width() { return width; },
      show() { visible = true; save({ open: true }); apply(); if (fr && o.section) fr.goto(o.section); return api; },
      hide() { const had = el.contains(document.activeElement); visible = false; save({ open: false }); apply(); if (had) toggle.focus({ preventScroll: true }); return api; },
      toggleOpen() { return visible ? api.hide() : api.show(); },
      goto(id) { o.section = id; fr?.goto(id); },
      flash(key) { if (!visible) api.show(); setTimeout(() => fr?.flash(key), fr?.state && fr.iframe.contentDocument?.readyState === 'complete' ? 0 : 900); },
      destroy() { alive = false; drop(); },
      _split(x) { split = x; setWidth(width); apply(); },
    };
    setWidth(width); apply();
    if (o.bindKey) MA.keys.bindView('p', () => api.toggleOpen(), () => MA.t('k.preview'));
    MA.cleanup(() => api.destroy());
    return api;
  };
  /** Editor + preview pane side by side (stacked under 1100px). */
  ui.previewPane.split = (editor, pane) => { const x = MA.h('div.pvp-split', editor, pane.el); pane._split(x); return x; };

  /* ================= content store ================= */
  /*
    Three full snapshots: defaults (built into index.html), published (defaults + assets/content.js, or what this browser
    published last) and the draft (published + your edits).
    The draft is SAVED as your edits only, never as a full copy, so a site update or a teammate's publish is never undone:
      localStorage 'miras.cms.draft' = { v: 2, base: {d, p, at}, overrides, was, t, at, tab }
        overrides  your edits vs published (objects deep, arrays whole)
        base       hashes of the defaults (d) and of the published content (p) the edits were made on
        was        per edited path, a hash of the published value it was edited from (live site changed under it = conflict)
        t          per path, when it last changed or was reset (a tombstone): two tabs merge path by path, the newer wins
    On load, draft = published + overrides, pruned to the shape of the site's defaults (keys the site dropped disappear).
    Every string that enters the store is sanitised: only <em>, <span dir> and <br> survive.
  */
  const CK = { draft: 'miras.cms.draft' };
  const DRAFT_V = 2, DAY_MS = 864e5;
  const isObj = MA.isObj;
  const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const merge = (a, b) => { if (b === undefined) return a; if (!isObj(a) || !isObj(b)) return b; const o = { ...a }; for (const k of Object.keys(b)) if (!BAD_KEYS.has(k)) o[k] = merge(a[k], b[k]); return o; };
  /** Minimal overrides of `obj` vs `base`: objects deep, arrays atomic. */
  const diffOver = (base, obj) => {
    if (!isObj(base) || !isObj(obj)) return MA.eq(base, obj) ? undefined : MA.clone(obj);
    const o = {}; let any = false;
    for (const k of Object.keys(obj)) { const d = diffOver(base[k], obj[k]); if (d !== undefined) { o[k] = d; any = true; } }
    return any ? o : undefined;
  };
  /** Leaf-level change list between two full contents. Arrays of equal length compare element-wise. */
  const leafDiff = (a, b, p = [], out = []) => {
    if (MA.eq(a, b)) return out;
    if (isObj(a) && isObj(b)) { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) leafDiff(a[k], b[k], [...p, k], out); return out; }
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) { a.forEach((x, i) => leafDiff(x, b[i], [...p, i], out)); return out; }
    out.push({ path: p.join('/'), before: a, after: b }); return out;
  };
  MA.mergeContent = merge; MA.diffContent = leafDiff; MA.overridesOf = diffOver;
  /** Short stable hash of any JSON value (cyrb53). */
  const hashStr = (str, seed = 0) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  const hashOf = v => hashStr(JSON.stringify(v === undefined ? null : v));
  MA.hash = hashOf;
  /** Leaf paths of an overrides tree (objects are walked; arrays and values are leaves) → Map(path → value) */
  const leaves = (o, p = '', out = new Map()) => { if (isObj(o)) { for (const k of Object.keys(o)) leaves(o[k], p ? p + '/' + k : k, out); } else if (p) out.set(p, o); return out; };
  const stripMeta = o => { if (!isObj(o)) return o; const { meta, schema, version, schedule, ...rest } = o; return rest; };
  const stripEnvelope = o => { const { v, kind, exportedAt, by, base, at, tab, ...rest } = stripMeta(o); return rest; };

  /* ---- sanitising: one allowlist for everything that enters the store ---- */
  /* Only these can ever be markup: <em>, </em>, <br>, <span dir="ltr|rtl|auto">, </span>. Any other "<" that could open a tag or
     comment (followed by a letter, /, ! or ?) becomes "&lt;", so it shows as text instead of running. "a < b", "<5k" and safe
     strings come back unchanged. */
  const NOT_ALLOWED_LT = /<(?=[a-z\/!?])(?!(?:\/?(?:em|br)\s*\/?>|span\s+dir\s*=\s*(["']?)(?:ltr|rtl|auto)\1\s*>|\/span\s*>))/gi;
  const htmlMemo = new Map();
  const cleanHTML = s => {
    if (typeof s !== 'string' || s.indexOf('<') < 0) return s;
    let v = htmlMemo.get(s); if (v !== undefined) return v;
    v = s.replace(NOT_ALLOWED_LT, '&lt;');
    if (htmlMemo.size > 4000) htmlMemo.clear(); htmlMemo.set(s, v); return v;
  };
  /** Any value: every string inside is cleaned (see cleanHTML); keys like __proto__ are dropped. */
  const sanitize = v => typeof v === 'string' ? cleanHTML(v) : Array.isArray(v) ? v.map(sanitize) : isObj(v) ? Object.fromEntries(Object.entries(v).filter(([k]) => !BAD_KEYS.has(k)).map(([k, x]) => [k, sanitize(x)])) : v;

  /* ---- the content's shape, read from the site's defaults (plus newer optional parts the site may not ship yet) ---- */
  const EXTRA = {
    layout: [''], tagline: { en: '', ar: '' },
    studio: { exceptions: [{ id: '', from: '', to: '', label: { en: '', ar: '' }, closed: false, open: '', close: '' }], consent: false, privacyUrl: '', formFields: { phone: false, budget: false } },
  };
  const shapeUnion = (a, b) => {
    if (a === undefined) return b; if (b === undefined) return a;
    if (isObj(a) && isObj(b)) { const o = { ...a }; for (const k of Object.keys(b)) o[k] = shapeUnion(a[k], b[k]); return o; }
    if (Array.isArray(a) && Array.isArray(b)) return a.length ? (b.length ? [shapeUnion(a[0], b[0])] : a) : b;
    return a;
  };
  const shapeOf = v => {
    if (isObj(v)) { const o = {}; for (const k of Object.keys(v)) o[k] = shapeOf(v[k]); return o; }
    if (Array.isArray(v)) { let it; for (const x of v) if (x != null) it = shapeUnion(it, shapeOf(x)); return it === undefined ? [] : [it]; }
    return v;
  };
  const blank = s => isObj(s) ? Object.fromEntries(Object.keys(s).map(k => [k, blank(s[k])])) : Array.isArray(s) ? [] : typeof s === 'string' ? '' : typeof s === 'number' ? 0 : typeof s === 'boolean' ? false : null;
  const typeName = v => v === null ? 'null' : Array.isArray(v) ? 'list' : typeof v === 'object' ? 'object' : typeof v === 'string' ? 'text' : typeof v;
  let SHAPE = {}, DEF = {}, sceneOrder = null;
  const buildShape = () => { DEF = stripMeta(C.defaults || {}); SHAPE = shapeUnion(shapeOf(DEF), EXTRA); sceneOrder = null; };
  const pathKnown = p => { let n = SHAPE; for (const s of String(p).split('/')) { if (!isObj(n) || !(s in n)) return false; n = n[s]; } return true; };
  const cleanStr = (s, path, P) => { const c = cleanHTML(s); if (c !== s) P.push({ path, kind: 'html' }); return c; };
  /**
   * Shape `v` like the site's content. shape: expected shape; ref: where a missing required value comes from (same
   * position, matched by id for lists of items with ids); dn: the defaults here (decide which keys are required).
   * Unknown keys are dropped, wrong types fixed, strings sanitised. Problems are collected in P, never thrown.
   */
  function norm(v, shape, ref, dn, path, P) {
    if (isObj(shape)) {
      if (!isObj(v)) { P.push({ path, kind: v == null ? 'missing' : 'type', expected: 'object', got: typeName(v) }); v = {}; }
      const out = {};
      for (const k of Object.keys(v)) {
        const p = path ? path + '/' + k : k;
        if (!(k in shape) || BAD_KEYS.has(k)) { P.push({ path: p, kind: 'unknown' }); continue; }
        if (v[k] === undefined) continue;
        out[k] = norm(v[k], shape[k], ref?.[k], dn?.[k], p, P);
      }
      if (isObj(dn)) for (const k of Object.keys(dn)) {
        if (k in out || !(k in shape)) continue;
        P.push({ path: path ? path + '/' + k : k, kind: 'missing' });
        out[k] = MA.clone(isObj(ref) && ref[k] !== undefined ? ref[k] : dn[k]);
      }
      return out;
    }
    if (Array.isArray(shape)) {
      if (!Array.isArray(v)) { P.push({ path, kind: v == null ? 'missing' : 'type', expected: 'list', got: typeName(v) }); return MA.clone(Array.isArray(ref) ? ref : Array.isArray(dn) ? dn : []); }
      const it = shape[0];
      if (it === undefined) return v.filter(x => x === null || typeof x !== 'object').map(x => typeof x === 'string' ? cleanHTML(x) : x);
      const refs = Array.isArray(ref) ? ref : [], keyed = isObj(it) && 'id' in it, byId = keyed ? new Map(refs.filter(isObj).map(x => [x.id, x])) : null;
      const out = [];
      v.forEach((x, i) => {
        const p = path + '/' + i;
        if (x == null) { P.push({ path: p, kind: 'missing' }); return; }
        const r = keyed ? byId.get(x?.id) : refs[i];
        out.push(norm(x, it, r, isObj(it) ? blank(it) : r, p, P));
      });
      return out;
    }
    // a single value
    if (shape === null || shape === undefined) { if (typeof v === 'string') return cleanStr(v, path, P); if (v !== null && typeof v === 'object') { P.push({ path, kind: 'type', got: typeName(v) }); return null; } return v; }
    const want = typeof shape;
    if (typeof v === want) return want === 'string' ? cleanStr(v, path, P) : v;
    if (v === null && want === 'number') return null; // a cleared number field
    if (want === 'string' && (typeof v === 'number' || typeof v === 'boolean')) { P.push({ path, kind: 'type', expected: 'text', got: typeName(v) }); return String(v); }
    if (want === 'number' && typeof v === 'string' && v.trim() !== '' && isFinite(+v)) { P.push({ path, kind: 'type', expected: 'number', got: 'text' }); return +v; }
    P.push({ path, kind: v == null ? 'missing' : 'type', expected: want === 'string' ? 'text' : want, got: typeName(v) });
    return MA.clone(typeof ref === want ? ref : typeof dn === want ? dn : blank(shape));
  }
  /** Full content shaped like the site's: P collects problems. */
  const normalize = (content, ref = C.published || DEF, P = []) => norm(stripMeta(content), SHAPE, ref, DEF, '', P);

  /* ---- draft state ---- */
  let undoStack = [], redoStack = [], lastSet = { path: null, at: 0 }, batch = null, editAt = 0;
  const touched = MA.db.get('touched', {}); let touchedDirty = false;
  let st = { overrides: {}, was: {}, t: {} }, seenAt = 0, seenKey = '', myAt = 0, seenT = {}, conflicts = [], syncToastAt = 0, lastWritten = '';
  const saveDraft = MA.debounce(() => C.save(), 250);
  // previews get the draft at most every ~30 ms while typing (a timer, not rAF, so hidden or throttled tabs still deliver it in order)
  const pushPreview = (() => { let tm = 0; return () => { if (tm) return; tm = setTimeout(() => { tm = 0; if (C.draft) MA.site.broadcast({ type: 'miras:content', content: C.forPreview() }); }, 30); }; })();
  const pushUndo = e => { undoStack.push(e); if (undoStack.length > 300) undoStack.shift(); };
  const readStored = () => { try { return JSON.parse(localStorage.getItem(CK.draft) || 'null'); } catch (e) { return null; } };
  const pubHashAt = p => hashOf(MA.path.get(C.published, p));
  /** published = defaults + (what this browser published last, if newer than the served file, else assets/content.js) */
  function computePublished() {
    const local = MA.db.get('published', null);
    const servedAt = Date.parse(C.served?.meta?.publishedAt || 0) || 0, localAt = Date.parse(local?.at || 0) || 0;
    const useLocal = localAt > servedAt && isObj(local?.overrides);
    const baseOver = sanitize(useLocal ? local.overrides : (isObj(C.served) ? C.served : {}));
    C.publishedMeta = useLocal ? { at: local.at, by: local.by, live: false } : { at: C.served?.meta?.publishedAt || null, by: C.served?.meta?.by || null, live: true };
    C.schedule = Array.isArray(baseOver.schedule) ? baseOver.schedule.filter(isObj) : [];
    C.published = normalize(merge(DEF, stripMeta(baseOver)), DEF);
  }
  /** draft = published + your edits, pruned to the site's shape; your edits are then recomputed from it. → problems */
  function rebuild() {
    const P = [];
    C.draft = normalize(merge(C.published, st.overrides), C.published, P);
    st.overrides = diffOver(C.published, C.draft) || {};
    const L = leaves(st.overrides);
    for (const p of Object.keys(st.was)) if (!L.has(p)) delete st.was[p];
    for (const p of L.keys()) if (st.was[p] == null) st.was[p] = pubHashAt(p);
    return P;
  }
  /** Paths you edited whose published value changed since (a teammate published, or the site was updated). */
  function findConflicts() {
    const before = conflicts.map(c => c.path).join('|');
    conflicts = [...leaves(st.overrides).keys()].filter(p => st.was[p] != null && st.was[p] !== pubHashAt(p)).map(path => ({ path }));
    if (conflicts.map(c => c.path).join('|') !== before) { MA.emit('content:conflict', C.conflicts()); renderRibbon(); }
  }
  /** Fold edits that aren't saved yet into the state, stamping the paths that changed (a reset leaves a tombstone). */
  function capture(now = Date.now()) {
    if (!C.draft) return;
    const over = diffOver(C.published, C.draft) || {}, prev = leaves(st.overrides), next = leaves(over);
    const stamp = p => { st.t[p] = Math.max(now, (+st.t[p] || 0) + 1); }; // a local change is always newer than what this path had
    for (const [p, v] of next) if (!prev.has(p) || !MA.eq(prev.get(p), v)) stamp(p);
    for (const p of prev.keys()) if (!next.has(p)) stamp(p);
    st.overrides = over;
    for (const p of Object.keys(st.was)) if (!next.has(p)) delete st.was[p];
    for (const p of next.keys()) if (st.was[p] == null) st.was[p] = pubHashAt(p);
  }
  /** Merge another tab's saved state into ours, path by path; the newer change wins. */
  function mergeFrom(s) {
    const theirs = { overrides: isObj(s.overrides) ? sanitize(s.overrides) : {}, was: isObj(s.was) ? s.was : {}, t: isObj(s.t) ? s.t : {} };
    const mine = leaves(st.overrides), their = leaves(theirs.overrides);
    const paths = new Set([...mine.keys(), ...their.keys(), ...Object.keys(st.t), ...Object.keys(theirs.t)]);
    const out = {}, t = {}, was = {}, clashes = []; let tookTheirs = false, keptMine = false;
    for (const p of paths) {
      const tm = +st.t[p] || 0, tt = +theirs.t[p] || 0, b = +seenT[p] || 0, useTheirs = tt > tm, side = useTheirs ? their : mine;
      if (side.has(p)) { MA.path.set(out, p, MA.clone(side.get(p))); const w = (useTheirs ? theirs.was : st.was)[p]; if (w != null) was[p] = w; }
      if (tm || tt) t[p] = Math.max(tm, tt);
      const differ = mine.has(p) !== their.has(p) || !MA.eq(mine.get(p), their.get(p));
      if (differ) { if (useTheirs) tookTheirs = true; else keptMine = true; if (tm > b && tt > b) clashes.push({ path: p, kept: useTheirs ? 'theirs' : 'mine' }); }
    }
    st = { overrides: out, was, t };
    return { clashes, tookTheirs, keptMine };
  }
  /** Another tab saved the draft → merge it in, refresh every field and preview. */
  function syncFromStore(fromSave) {
    if (!C.draft) return false;
    const s = readStored();
    if (!isObj(s) || s.v !== DRAFT_V || s.tab === MA.tab) return false;
    const key = s.tab + ':' + s.at; if (key === seenKey) return false; // each write of another tab is merged once (merging is idempotent anyway)
    capture();
    const before = MA.clone(C.draft), r = mergeFrom(s);
    seenKey = key; seenAt = Math.max(seenAt, +s.at || 0); rebuild(); seenT = { ...st.t }; findConflicts();
    if (!MA.eq(before, C.draft)) { lastSet = { path: null, at: 0 }; pushPreview(); MA.emit('content:change', { path: '', by: 'sync' }); }
    if (r.clashes.length) MA.toast(MA.t('sync.clash', { what: esc(r.clashes.slice(0, 2).map(c => C.label(c.path)).join(', ') + (r.clashes.length > 2 ? '…' : '')) }), { icon: 'info', ms: 9000 });
    else if (r.tookTheirs && Date.now() - syncToastAt > 30000) { syncToastAt = Date.now(); MA.toast(MA.t('sync.updated'), { icon: 'refresh' }); }
    if (r.keptMine && !fromSave) saveDraft(); // the other tab needs ours too
    return true;
  }
  /** Another tab published (or this browser's published record changed) → rebase the draft on it. */
  function syncPublished() {
    if (!C.draft) return;
    const pubBefore = hashOf(C.published), before = MA.clone(C.draft);
    capture(); computePublished();
    if (hashOf(C.published) === pubBefore) return;
    rebuild(); findConflicts(); C.save();
    if (!MA.eq(before, C.draft)) pushPreview();
    MA.emit('content:change', { path: '', by: 'sync' });
    MA.toast(MA.t('sync.published'), { icon: 'publish' });
  }
  MA.on('sync:draft', () => syncFromStore(false));
  MA.on('sync:published', syncPublished);
  /** Old tombstones go after two weeks; the map never grows past 800 paths. */
  function pruneTimes() {
    const live = leaves(st.overrides), cut = Date.now() - 14 * DAY_MS;
    for (const p of Object.keys(st.t)) if (!live.has(p) && st.t[p] < cut) delete st.t[p];
    const ks = Object.keys(st.t); if (ks.length > 800) ks.filter(p => !live.has(p)).sort((a, b) => st.t[a] - st.t[b]).slice(0, ks.length - 800).forEach(p => delete st.t[p]);
  }
  function pruneTouched() { let n = 0; for (const k of Object.keys(touched)) if (MA.path.get(C.draft, k) === undefined) { delete touched[k]; n++; } if (n) touchedDirty = true; }
  function saveFailed(e) {
    const first = !C.saveError;
    C.saveError = { at: new Date().toISOString(), reason: /quota/i.test(`${e?.name} ${e?.message}`) || e?.code === 22 ? 'quota' : 'error' };
    MA.emit('content:saveError', C.saveError); renderRibbon(); updateStatus();
    if (first) MA.toast(MA.t('save.full'), { tone: 'bad', ms: 12000, action: { label: MA.t('save.free'), run: () => MA.storage.free() } });
    return false;
  }
  function reportPruned(paths) {
    const n = paths.length;
    MA.toast(n === 1 ? MA.t('cs.prunedOne') : MA.t('cs.pruned', { n: MA.num(n) }), { icon: 'info', ms: 8000 });
    MA.activity.log({ action: 'draft.prune', target: MA.t('act.pruned', { n }), module: 'history', href: '#/history', meta: { n, paths: paths.slice(0, 40) } });
  }
  /** A draft saved by an older admin is a full copy. Keep only paths edited here since this browser last published;
   *  everything else follows the live site. The whole old draft is kept in History as an automatic checkpoint. → dropped paths */
  function fromLegacy(stored) {
    const full = normalize(merge(C.published, sanitize(stripEnvelope(stored))), C.published);
    const all = diffOver(C.published, full) || {}, since = Date.parse(MA.db.get('published', null)?.at || 0) || 0, keep = {}, dropped = [];
    const keys = Object.keys(touched).filter(k => touched[k] > since);
    for (const [p, v] of leaves(all)) (keys.some(k => k === p || k.startsWith(p + '/') || p.startsWith(k + '/')) ? MA.path.set(keep, p, v) : dropped.push(p));
    st = { overrides: keep, was: {}, t: {} };
    if (dropped.length) MA.versions.save({ kind: 'checkpoint', note: MA.t('cs.legacy'), content: diffOver(DEF, full) || {}, force: true }); // a named checkpoint: never rotated out with the autosaves
    return dropped;
  }
  const gonePaths = (orphans, P) => [...new Set([...orphans, ...P.filter(x => x.kind === 'unknown').map(x => x.path)])];
  function applyRaw(path, v) {
    if (!path) { C.draft = normalize(MA.clone(v), C.published); return; }
    if (v === undefined) MA.path.del(C.draft, path); else MA.path.set(C.draft, path, MA.clone(v));
  }
  function applyStep(s, which) {
    if (s.steps) for (const x of (which === 'before' ? [...s.steps].reverse() : s.steps)) applyRaw(x.path, x[which]);
    else applyRaw(s.path, s[which]);
    lastSet = { path: null, at: 0 }; C.save(); pushPreview();
    MA.emit('content:change', s.steps ? { path: '', by: 'undo' } : { path: s.path, value: s[which], by: 'undo' });
  }

  const C = MA.content = {
    defaults: null, published: null, served: null, draft: null, publishedMeta: null, focusAfterRoute: null, schedule: [],
    /** null, or {at, reason:'quota'|'error'} while the draft can't be saved (the shell shows it until a save works again). */
    saveError: null,
    /** Called once the site handshake (or the cached copy of it) is in. */
    init(info) {
      C.defaults = sanitize(info.defaults || {});
      C.served = isObj(info.published) ? info.published : null; // assets/content.js as served right now (overrides or null)
      buildShape(); computePublished();
      const stored = readStored(); let legacy = null;
      if (isObj(stored) && stored.v === DRAFT_V) {
        st = { overrides: isObj(stored.overrides) ? sanitize(stored.overrides) : {}, was: isObj(stored.was) ? { ...stored.was } : {}, t: isObj(stored.t) ? { ...stored.t } : {} };
        seenAt = +stored.at || 0; seenKey = stored.tab + ':' + stored.at; seenT = { ...st.t };
      } else if (isObj(stored)) legacy = fromLegacy(stored);
      else st = { overrides: {}, was: {}, t: {} };
      const orphans = [...leaves(st.overrides).keys()].filter(p => !pathKnown(p));
      const gone = gonePaths(orphans, rebuild());
      findConflicts(); pruneTouched();
      if (gone.length) reportPruned(gone);
      if (legacy || gone.length || (isObj(stored) && stored.v !== DRAFT_V)) C.save();
      updateStatus();
      MA.emit('content:ready');
    },
    /** A newer handshake arrived (the admin started from its cached copy): rebase on it, keeping your edits. → true if anything changed */
    rebase(info) {
      if (!C.draft || !info?.defaults) return false;
      const d = sanitize(info.defaults), pub = isObj(info.published) ? info.published : null;
      if (hashOf(d) === hashOf(C.defaults) && hashOf(pub) === hashOf(C.served)) return false;
      capture();
      const before = MA.clone(C.draft);
      C.defaults = d; C.served = pub; buildShape(); computePublished();
      const orphans = [...leaves(st.overrides).keys()].filter(p => !pathKnown(p));
      const gone = gonePaths(orphans, rebuild());
      findConflicts(); if (gone.length) reportPruned(gone);
      C.save();
      if (!MA.eq(before, C.draft)) { pushPreview(); MA.emit('content:change', { path: '', by: 'sync' }); }
      MA.emit('content:rebase');
      return true;
    },
    get: (path, src) => MA.path.get(src || C.draft, path),
    def: path => MA.path.get(C.defaults, path),
    pub: path => MA.path.get(C.published, path),
    /** Set a value in the draft. opts: { label, silent, coalesce: true (merge rapid typing into one undo step), by } */
    set(path, value, opts = {}) {
      if (!MA.can('content.edit')) { MA.toast(MA.t('readOnly'), { tone: 'bad' }); return false; }
      if (!C.draft || !path) return false;
      value = sanitize(value);
      const before = MA.clone(C.get(path));
      if (MA.eq(before, value)) return false;
      MA.path.set(C.draft, path, MA.clone(value));
      const now = Date.now();
      if (batch) batch.steps.push({ path, before, after: MA.clone(value) });
      else if (opts.coalesce !== false && lastSet.path === path && now - lastSet.at < 900 && undoStack.at(-1)?.path === path && !undoStack.at(-1).steps) undoStack.at(-1).after = MA.clone(value);
      else pushUndo({ path, before, after: MA.clone(value), label: opts.label || C.label(path) });
      redoStack = []; lastSet = batch ? { path: null, at: 0 } : { path, at: now }; editAt = ++actN;
      touched[path] = now; touchedDirty = true;
      saveDraft(); pushPreview();
      if (!opts.silent) MA.emit('content:change', { path, value, by: opts.by || 'edit' });
      return true;
    },
    /** Replace a whole subtree (lists: swells, faq…) in one undo step. */
    replace(path, value, label) { lastSet = { path: null, at: 0 }; return C.set(path, value, { label, coalesce: false }); },
    reset(path, to = 'default') { return C.set(path, MA.clone(to === 'published' ? C.pub(path) : C.def(path)), { coalesce: false, label: C.label(path), by: 'reset' }); },
    /** Every set/replace/reset inside fn becomes ONE undo step called `label`. Nested batches join the outer one. fn may return a promise. */
    batch(label, fn) {
      if (batch) return fn();
      batch = { label, steps: [] };
      const end = () => {
        const b = batch; batch = null; lastSet = { path: null, at: 0 };
        if (b.steps.length === 1) pushUndo({ ...b.steps[0], label: b.label || C.label(b.steps[0].path) });
        else if (b.steps.length) pushUndo({ path: null, steps: b.steps, label: b.label || C.label(b.steps[0].path) });
        return b.steps.length;
      };
      let r; try { r = fn(); } catch (e) { end(); throw e; }
      if (r && typeof r.then === 'function') return r.finally(end);
      end(); return r;
    },
    /** Replace the entire draft (restore a version, import, discard all). Accepts full content, an assets/content.js payload or a draft export {v:2, overrides}. → problems found (array) or false */
    load(full, label = MA.t('restore')) {
      if (!MA.can('content.edit')) { MA.toast(MA.t('readOnly'), { tone: 'bad' }); return false; }
      if (!C.draft || !isObj(full)) return false;
      const P = [], next = normalize(C.toFull(full), C.published, P);
      pushUndo({ path: '', before: MA.clone(C.draft), after: MA.clone(next), label }); redoStack = []; lastSet = { path: null, at: 0 };
      C.draft = next; editAt = ++actN; C.save(); pushPreview(); MA.emit('content:change', { path: '', by: 'load' });
      return P;
    },
    /** Any content-ish object → full content (not yet normalised). */
    toFull(x) { if (isObj(x) && x.v === DRAFT_V && isObj(x.overrides)) return merge(C.published, sanitize(x.overrides)); return merge(DEF, sanitize(stripEnvelope(x))); },
    undo() {
      if (!MA.can('content.edit')) { MA.toast(MA.t('readOnly'), { tone: 'bad' }); return false; }
      const s = undoStack.pop(); if (!s) { MA.toast(MA.t('nothingToUndo')); return false; }
      applyStep(s, 'before'); redoStack.push(s);
      MA.toast(MA.t('undone', { what: esc(s.label) }), { icon: 'undo', action: { label: MA.t('redo'), run: C.redo } });
      return true;
    },
    redo() {
      if (!MA.can('content.edit')) { MA.toast(MA.t('readOnly'), { tone: 'bad' }); return false; }
      const s = redoStack.pop(); if (!s) return false;
      applyStep(s, 'after'); undoStack.push(s);
      MA.toast(MA.t('redone', { what: esc(s.label) }), { icon: 'redo' });
      return true;
    },
    canUndo: () => undoStack.length > 0 && MA.can('content.edit'),
    /** Order number of the last draft edit in this tab (0 = none yet); compare with MA.toast.undoAt(). */
    editedAt: () => editAt,
    canRedo: () => redoStack.length > 0 && MA.can('content.edit'),
    /** Write your edits (overrides only) to storage, merging any newer save from another tab first. → true | false (storage full: see C.saveError) */
    save() {
      if (!C.draft) return false;
      syncFromStore(true); // never overwrite another tab's newer edits
      capture(); pruneTimes();
      if (conflicts.length) findConflicts();
      const body = { v: DRAFT_V, base: { d: hashOf(DEF), p: hashOf(C.published), at: C.publishedMeta?.at || null }, overrides: st.overrides, was: st.was, t: st.t };
      const json = JSON.stringify(body);
      const stored = readStored(), same = json === lastWritten && stored?.tab === MA.tab && +stored?.at === myAt;
      if (!same) {
        const at = Math.max(Date.now(), seenAt + 1);
        try { localStorage.setItem(CK.draft, json.slice(0, -1) + `,"at":${at},"tab":${JSON.stringify(MA.tab)}}`); }
        catch (e) { return saveFailed(e); }
        seenAt = myAt = at; seenT = { ...st.t }; lastWritten = json;
        MA.broadcast({ type: 'draft', at });
      }
      if (touchedDirty && MA.db.raw.set(NS + 'touched', touched)) touchedDirty = false;
      if (C.saveError) { C.saveError = null; MA.emit('content:saveError', null); renderRibbon(); updateStatus(); MA.toast(MA.t('save.again')); }
      return true;
    },
    isChanged: path => !MA.eq(C.get(path), C.pub(path)),
    isCustom: path => !MA.eq(C.get(path), C.def(path)),
    /** Draft vs published, leaf level: [{path, before, after}] */
    changes: () => C.draft ? leafDiff(C.published, C.draft) : [],
    /** Your edits vs published (what is saved as the draft). */
    overrides: () => C.draft ? (diffOver(C.published, C.draft) || {}) : {},
    /** A draft file to share: { schema, v:2, kind:'draft', exportedAt, by, base:{publishedAt}, overrides }. Read it back with C.parse(). */
    exportDraft() { return { schema: 'miras.content', v: DRAFT_V, kind: 'draft', exportedAt: new Date().toISOString(), by: MA.team?.me?.()?.name || 'MIRAS', base: { publishedAt: C.publishedMeta?.at || null }, overrides: C.overrides() }; },
    /**
     * Read an exported draft (v2 or older), an assets/content.js file or a content JSON.
     * → { kind: 'draft'|'content.js'|'content', content: full normalised content (pass to load), problems: [...], schedule } | { err: 'json'|'object'|'schema'|'empty' }
     */
    parse(raw) {
      let s = String(raw ?? '').replace(/^﻿/, '').trim();
      const js = s.match(/MIRAS_CONTENT\s*=\s*([\s\S]*?);?\s*$/); if (js) s = js[1].trim();
      let o; try { o = JSON.parse(s); } catch (e) { return { err: 'json' }; }
      if (!isObj(o)) return { err: 'object' };
      const schema = o.schema || o.meta?.schema; if (schema && schema !== 'miras.content') return { err: 'schema' };
      const v2 = o.v === DRAFT_V && isObj(o.overrides), body = v2 ? o.overrides : stripEnvelope(o);
      if (!Object.keys(body).some(k => k in SHAPE)) return { err: 'empty' };
      const src = v2 ? { v: DRAFT_V, overrides: body } : body;
      return { kind: v2 ? 'draft' : o.meta ? 'content.js' : 'content', content: normalize(C.toFull(src), C.published), problems: C.validate(src), schedule: Array.isArray(o.schedule) ? sanitize(o.schedule) : null };
    },
    /**
     * Check content against the site's shape before using it (imports, restores). Accepts the same inputs as load().
     * → [{ path, kind: 'unknown'|'missing'|'type'|'html', expected?, got?, message }] (empty = fine). load() repairs all of these.
     */
    validate(content) {
      if (!isObj(content)) return [{ path: '', kind: 'type', expected: 'object', got: typeName(content), message: MA.t('cs.p.type', { path: '—' }) }];
      const P = [], full = isObj(content) && content.v === DRAFT_V && isObj(content.overrides) ? merge(C.published, content.overrides) : merge(DEF, stripEnvelope(content));
      normalize(full, C.published, P);
      return P.map(p => ({ ...p, message: C.problemText(p) }));
    },
    problemText: p => MA.t('cs.p.' + p.kind, { path: p.path ? C.label(p.path) : '—' }),
    /** Shape any content like the site's (drops unknown keys, fixes types, sanitises). ref: where missing values come from. */
    normalize: (content, ref) => normalize(content, ref),
    /** Clean every string in a value: only <em>, <span dir> and <br> survive. */
    sanitize: v => sanitize(v),
    /** Paths you edited whose live value changed since: [{ path, label, mine, theirs }] */
    conflicts: () => conflicts.filter(c => C.isChanged(c.path)).map(c => ({ path: c.path, label: C.label(c.path), mine: MA.clone(C.get(c.path)), theirs: MA.clone(C.pub(c.path)) })),
    /** Settle one conflict: 'mine' keeps your edit, 'theirs' takes the live value (one undo step). */
    resolve(path, choice = 'mine') {
      if (!MA.can('content.edit')) { MA.toast(MA.t('readOnly'), { tone: 'bad' }); return false; }
      if (!conflicts.some(c => c.path === path)) return false;
      if (choice === 'theirs') C.set(path, MA.clone(C.pub(path)), { coalesce: false, label: MA.t('conflict.undoLabel'), by: 'conflict' });
      else st.was[path] = pubHashAt(path);
      conflicts = conflicts.filter(c => c.path !== path);
      C.save(); MA.emit('content:conflict', C.conflicts()); renderRibbon();
      return true;
    },
    resolveAll(choice = 'mine') {
      const ps = conflicts.map(c => c.path); if (!ps.length) return 0;
      const run = () => ps.forEach(p => C.resolve(p, choice));
      if (choice === 'theirs') C.batch(MA.t('conflict.takeAll'), run); else run();
      return ps.length;
    },
    /** What assets/content.js should contain: overrides vs defaults (known paths only), plus meta. opts: { from: 'draft'|'published', schedule: [] | null (default: keep the published schedule) } */
    publishPayload(note = '', { from = 'draft', schedule } = {}) {
      const full = normalize(MA.clone(from === 'published' ? C.published : C.draft), C.published);
      const over = diffOver(DEF, full) || {};
      const sched = schedule !== undefined ? schedule : C.schedule;
      if (Array.isArray(sched) && sched.length) over.schedule = sanitize(MA.clone(sched)).filter(isObj);
      over.meta = { publishedAt: new Date().toISOString(), by: MA.team?.me?.()?.name || 'MIRAS', note, schema: 'miras.content', version: 1 };
      return over;
    },
    /** One scheduled change for content.js: at `at` the site switches to the draft as it is now. → { id, at, note, overrides } */
    schedulePayload(at, note = '') { return { id: MA.uid('s'), at: new Date(at).toISOString(), note: String(note || ''), overrides: stripMeta(C.publishPayload(note)) }; },
    /** Render the payload as the content.js file. */
    fileText(payload) { return `/* MIRAS site content, published from the admin on ${payload.meta?.publishedAt || ''}.\n   Holds only what differs from the defaults built into index.html. Replace this file to publish; null = defaults. */\nwindow.MIRAS_CONTENT = ${JSON.stringify(payload, null, 2)};\n`; },
    /** Record a successful publish (after the file was written or downloaded). */
    markPublished(payload, { live = false } = {}) {
      MA.db.set('published', { at: payload.meta.publishedAt, by: payload.meta.by, overrides: payload });
      C.schedule = Array.isArray(payload.schedule) ? sanitize(payload.schedule).filter(isObj) : [];
      C.published = normalize(merge(DEF, sanitize(stripMeta(payload))), DEF);
      C.publishedMeta = { at: payload.meta.publishedAt, by: payload.meta.by, live };
      MA.versions.save({ kind: 'publish', note: payload.meta.note, content: payload });
      MA.activity.log({ action: 'publish', target: payload.meta.note || '', module: 'history', href: '#/history' });
      capture(); findConflicts(); C.save();
      MA.broadcast({ type: 'published' });
      MA.emit('content:published', payload); MA.emit('content:change', { path: '', by: 'publish' });
    },
    /** Draft with uploaded media resolved for the live preview (hooks may rewrite values). */
    forPreview() { let c = MA.clone(C.draft); for (const fn of C.previewHooks) c = fn(c) || c; return c; },
    previewHooks: [],
    touched: path => touched[path] || 0,
    /** Human label for a content path. */
    label(path) {
      const p = String(path).split('/');
      if (p[0] === 'text') { const k = p.slice(2).join('/'); return `${C.groupName(C.groupOf(k))} · ${C.keyLabel(k)}`; }
      const LISTS = { faq: 'sec.faq', swells: 'sec.swells', services: 'sec.plan', stages: 'sec.process', make: 'sec.make' }; // a whole list reads as the list
      if (p.length === 1 && LISTS[p[0]]) return MA.t(LISTS[p[0]]);
      const NAMES = { services: ['Service', 'خدمة', 'خدمت'], sgroups: ['Service group', 'مجموعة خدمات', 'گروه خدمات'], swells: ['Swell', 'موجة', 'موج'], stages: ['Stage', 'محطة', 'مرحله'], faq: ['Question', 'سؤال', 'پرسش'], make: ['Make word', 'كلمة', 'واژه'], ui: ['Message', 'رسالة', 'پیام'], studio: ['Studio', 'الاستوديو', 'استودیو'], theme: ['Colour', 'لون', 'رنگ'], seo: ['SEO', 'الظهور', 'سئو'], sections: ['Section', 'قسم', 'بخش'], media: ['Image', 'صورة', 'تصویر'], steps: ['Step label', 'تسمية الخطوة', 'برچسب گام'], tagline: ['Tagline', 'الشعار', 'شعار'], layout: ['Section order', 'ترتيب الأقسام', 'ترتیب بخش‌ها'] };
      const L = NAMES[p[0]] ? NAMES[p[0]][LI()] : p[0];
      return [L, ...p.slice(1).filter(x => x !== 'en' && x !== 'ar').map(x => /^\d+$/.test(x) ? '#' + MA.num(+x + 1) : x)].join(' · ') + (p.includes('ar') ? ' (AR)' : p.includes('en') ? ' (EN)' : '');
    },
    /** Which site section a text key belongs to (by prefix). Unknown prefixes become their own group. */
    groupOf(key) {
      const pre = String(key).split('.')[0];
      // a11y.* (the skip link) is a screen-reader/keyboard label, so it sits with the aria labels; bp.* (the brief card) is in the contact section
      const G = { nav: 'nav', cta: 'nav', aria: 'aria', a11y: 'aria', h: 'top', jg: 'top', hero: 'swells', plan: 'plan', wk: 'work', mk: 'make', hr: 'why', st: 'studio', q: 'faq', c: 'contact', f: 'contact', bp: 'contact', ft: 'foot', tag: 'tag', cons: 'cons' };
      if (/^j\d+$/.test(pre)) return 'top';
      return G[pre] || pre;
    },
    /** Readable name for a text group; groups the site adds later fall back to their prefix, title-cased. */
    groupName(g) { const k = 'sec.' + g, v = MA.t(k); return v === k ? (C.GROUP_NAMES[g] ? MA.L(C.GROUP_NAMES[g]) : String(g).charAt(0).toUpperCase() + String(g).slice(1)) : v; },
    GROUP_NAMES: {},
    /** Site section id to scroll the preview to, for a group. */
    sectionOf: g => ({ nav: 'top', aria: 'top', tag: 'top', top: 'top', cons: 'top', consent: 'top', swells: 'swells', plan: 'plan', work: 'work', process: 'how', make: 'make', why: 'why', studio: 'studio', faq: 'faq', contact: 'contact', foot: 'foot' })[g] || g,
    /** Labels for known keys: [en, ar, fa] or a plain English string. */
    KEY_LABELS: {
      'nav.services': ['Menu: Services', 'القائمة: الخدمات', 'منو: خدمات'], 'nav.studio': ['Menu: Studio', 'القائمة: الاستوديو', 'منو: استودیو'], 'nav.contact': ['Menu: Contact', 'القائمة: التواصل', 'منو: تماس'],
      'nav.why': ['Menu: Why MIRAS', 'القائمة: لماذا ميراس', 'منو: چرا میراس'], 'nav.how': ['Menu: How we work', 'القائمة: طريقة عملنا', 'منو: روش کار ما'],
      'nav.work': ['Menu: Work', 'القائمة: أعمالنا', 'منو: نمونه‌کارها'], 'nav.about': ['Menu: About', 'القائمة: من نحن', 'منو: درباره'], 'nav.menu': ['Menu button', 'زر القائمة', 'دکمهٔ منو'],
      'plan.go': ['Explore button', 'زر الاستكشاف', 'دکمهٔ کاوش'], 'wk.all': ['All work link', 'رابط كل الأعمال', 'پیوند همهٔ کارها'], 'wk.note': ['Note', 'ملاحظة', 'یادداشت'],
      'cons.text': ['Notice text', 'نص الإشعار', 'متن اعلان'], 'cons.ok': ['Allow button', 'زر السماح', 'دکمهٔ اجازه'], 'cons.no': ['Decline button', 'زر الرفض', 'دکمهٔ رد کردن'],
      'cta.start': ['Main button', 'الزر الرئيسي', 'دکمهٔ اصلی'], 'jg.cue': ['Scroll cue', 'إشارة التمرير', 'اشارهٔ اسکرول'],
      'hero.hint': ['Swell picker · Hint', 'منتقي الموجات · تلميح', 'انتخاب موج · راهنما'], 'hero.cue': ['Swell picker · Button', 'منتقي الموجات · الزر', 'انتخاب موج · دکمه'],
      'plan.add': ['Add-to-brief button', 'زر الإضافة إلى الطلب', 'دکمهٔ افزودن به درخواست'], 'plan.back': ['Back link', 'رابط العودة', 'پیوند بازگشت'],
      'mk.title': ['Headline', 'العنوان', 'عنوان'], 'mk.lead': ['Intro', 'المقدمة', 'مقدمه'],
      'st.now': ['Clock label (screen readers)', 'تسمية الساعة (قارئ الشاشة)', 'برچسب ساعت (صفحه‌خوان)'], 'st.text': ['Intro', 'المقدمة', 'مقدمه'], 'st.where': ['Address label', 'تسمية العنوان', 'برچسب نشانی'], 'st.addr': ['Address', 'العنوان البريدي', 'نشانی'],
      'q.title': ['Headline', 'العنوان', 'عنوان'], 'c.title': ['Headline', 'العنوان', 'عنوان'], 'c.lead': ['Intro', 'المقدمة', 'مقدمه'],
      'f.name': ['Form · Name label', 'النموذج · تسمية الاسم', 'فرم · برچسب نام'], 'f.email': ['Form · Email label', 'النموذج · تسمية البريد', 'فرم · برچسب ایمیل'], 'f.co': ['Form · Company label', 'النموذج · تسمية الشركة', 'فرم · برچسب شرکت'],
      'f.waves': ['Form · Picks label', 'النموذج · تسمية الاختيارات', 'فرم · برچسب انتخاب‌ها'], 'f.msg': ['Form · Message label', 'النموذج · تسمية الرسالة', 'فرم · برچسب پیام'],
      'f.nameErr': ['Form · Name error', 'النموذج · خطأ الاسم', 'فرم · خطای نام'], 'f.emailErr': ['Form · Email error', 'النموذج · خطأ البريد', 'فرم · خطای ایمیل'],
      'f.send': ['Form · Send button', 'النموذج · زر الإرسال', 'فرم · دکمهٔ ارسال'], 'f.note': ['Form · Note under the button', 'النموذج · ملاحظة تحت الزر', 'فرم · یادداشت زیر دکمه'], 'f.noteDirect': ['Form · Note (form service on)', 'النموذج · ملاحظة (خدمة النماذج مفعّلة)', 'فرم · یادداشت (سرویس فرم فعال)'],
      'f.done': ['After sending (email app)', 'بعد الإرسال (تطبيق البريد)', 'پس از ارسال (برنامهٔ ایمیل)'], 'f.sent': ['After sending (form service)', 'بعد الإرسال (خدمة النماذج)', 'پس از ارسال (سرویس فرم)'], 'f.fallback': ['Fallback line', 'سطر بديل', 'سطر جایگزین'], 'f.copy': ['Copy button', 'زر النسخ', 'دکمهٔ کپی'],
      'ft.copy': ['Copyright', 'حقوق النشر', 'حق نشر'],
      'aria.main': ['Main menu', 'القائمة الرئيسية', 'منوی اصلی'], 'aria.footer': ['Footer menu', 'قائمة التذييل', 'منوی پانویس'], 'aria.chips': ['Swell buttons', 'أزرار الموجات', 'دکمه‌های موج'],
      'ft.privacy': ['Privacy policy link', 'رابط سياسة الخصوصية', 'پیوند سیاست حریم خصوصی'], 'ft.terms': ['Terms link', 'رابط الشروط والأحكام', 'پیوند شرایط و ضوابط'], 'ft.cookies': ['Cookie policy link', 'رابط سياسة ملفات الارتباط', 'پیوند سیاست کوکی'], 'ft.back': ['Back-to-top link', 'رابط العودة إلى الأعلى', 'پیوند بازگشت به بالا'],
      'aria.legal': ['Legal menu', 'قائمة الصفحات القانونية', 'منوی صفحه‌های حقوقی'], 'wk.l': ['Eyebrow', 'العنوان الصغير', 'روتیتر'], 'wk.t': ['Headline', 'العنوان', 'عنوان'],
      'f.phone': ['Form · Phone label', 'النموذج · تسمية الهاتف', 'فرم · برچسب تلفن'], 'f.budget': ['Form · Budget label', 'النموذج · تسمية الميزانية', 'فرم · برچسب بودجه'], 'f.privacy': ['Form · Privacy link', 'النموذج · رابط الخصوصية', 'فرم · پیوند حریم خصوصی'],
    },
    /** Field label for a text key; keys the site adds later get a label from their suffix (.t → Headline, .s3 → Item 3…). Film scenes are numbered in page order. */
    keyLabel(k) {
      const known = C.KEY_LABELS[k]; if (known) return Array.isArray(known) ? known[LI()] || known[0] : known;
      const pre = String(k).split('.')[0], suf = String(k).split('.').slice(1).join('.'), li = LI(), m = suf.match(/^([a-z]*?)(\d+)(d?)$/);
      if (/^j\d+$/.test(pre) && !sceneOrder) sceneOrder = [...new Set(Object.keys(DEF?.text?.en || {}).map(x => x.split('.')[0]).filter(x => /^j\d+$/.test(x)))];
      const sn = /^j\d+$/.test(pre) ? (sceneOrder.indexOf(pre) + 1 || +pre.slice(1) + 1) : 0;
      const scene = sn ? `${['Scene', 'المشهد', 'صحنه'][li]} ${MA.num(sn)} · ` : '';
      const W = { '': ['Item', 'عنصر', 'مورد'], h: ['Headline', 'العنوان', 'عنوان'], back: ['Back link', 'رابط العودة', 'پیوند بازگشت'],
        a: ['Image description', 'وصف الصورة', 'توضیح تصویر'], t: ['Headline', 'العنوان', 'عنوان'], d: ['Text', 'النص', 'متن'], l: ['Eyebrow', 'العنوان الصغير', 'روتیتر'],
        b: ['Button', 'الزر', 'دکمه'], hint: ['Hint', 'تلميح', 'راهنمایی'], cue: ['Cue', 'إشارة', 'اشاره'], title: ['Title', 'العنوان', 'عنوان'], lead: ['Intro', 'المقدمة', 'مقدمه'], s: ['Item', 'عنصر', 'مورد'], f: ['Feature', 'ميزة', 'ویژگی'], q: ['Question', 'سؤال', 'پرسش'] };
      if (m && W[m[1]]) return scene + `${W[m[1]][li]} ${MA.num(+m[2])}` + (m[3] ? ` · ${['text', 'النص', 'متن'][li]}` : '');
      return W[suf] ? scene + W[suf][li] : k;
    },
    /** Map a preview click (data-cms / data-i18n key) to {route, tpl}. tpl has {lang} where the value is bilingual. */
    fromPick(key) {
      let m;
      if (key.startsWith('text.')) return { route: 'pages', tpl: `text/{lang}/${key.slice(5)}` };
      if (/^tagline(\.(en|ar))?$/.test(key)) return { route: 'pages', tpl: 'tagline/{lang}' };
      if ((m = key.match(/^swells\.(\d+)\.steps\.(\d+)$/))) return { route: 'services', tpl: `swells/${m[1]}/{lang}/steps/${m[2]}` };
      if ((m = key.match(/^swells\.(\d+)\.(\w+)$/))) return { route: 'services', tpl: `swells/${m[1]}/{lang}/${m[2]}` };
      if ((m = key.match(/^stages\.(\d+)\.(gets|tags)\.(\d+)$/))) return { route: 'process', tpl: `stages/${m[1]}/{lang}/${m[2]}/${m[3]}` };
      if ((m = key.match(/^stages\.(\d+)\.(\w+)$/))) return { route: 'process', tpl: `stages/${m[1]}/{lang}/${m[2]}` };
      if ((m = key.match(/^make\.(\d+)\.(\d+)$/))) return { route: 'pages', tpl: `make/${m[1]}/${m[2]}/{lang}` };
      if ((m = key.match(/^faq\.(\d+)\.(\w+)$/))) return { route: 'faq', tpl: `faq/${m[1]}/{lang}/${m[2]}` };
      if ((m = key.match(/^services\.(\d+)\.(\w+)$/))) return { route: 'services', tpl: `services/${m[1]}/{lang}/${m[2]}` };
      if ((m = key.match(/^sgroups\.(\d+)\.(\w+)$/))) return { route: 'services', tpl: `sgroups/{lang}/${m[1]}/${m[2]}` };
      if ((m = key.match(/^ui\.(\w+)$/))) return { route: 'pages', tpl: `ui/{lang}/${m[1]}` };
      if ((m = key.match(/^studio\.(\w+)$/))) return { route: 'settings', tpl: `studio/${m[1]}` };
      if ((m = key.match(/^media\.(\w+)$/))) return { route: 'media', tpl: `media/${m[1]}` };
      return null;
    },
    /** Reverse: a field template → the preview key to flash. */
    toPick(tpl) {
      const p = String(tpl).split('/').filter(x => x !== '{lang}' && x !== 'en' && x !== 'ar');
      if (p[0] === 'text') return 'text.' + p.slice(1).join('/');
      return p.join('.');
    },
  };
  MA.on('content:change', () => updateStatus());

  /* ================= versions, activity, notifications ================= */
  MA.versions = {
    list: () => MA.db.get('versions', []),
    /** kind: 'publish' | 'checkpoint' | 'auto' | 'import'. content: overrides object (defaults to the current draft's overrides).
     *  → the version, or null when it wasn't saved (storage full, or a role that can't edit). */
    save({ kind = 'checkpoint', note = '', content, force = false } = {}) {
      if (!force && kind !== 'publish' && !MA.can('content.edit')) return null;
      if (!content && !C.draft) return null;
      const list = MA.versions.list(), me = MA.team?.me?.();
      const v = { id: MA.uid('v'), at: new Date().toISOString(), kind, note, by: me?.name || 'MIRAS', byId: me?.id || '', content: content ? sanitize(stripMeta(MA.clone(content))) : (diffOver(DEF, C.draft) || {}) };
      list.unshift(v);
      if (!MA.db.set('versions', list.slice(0, 80))) return null;
      MA.emit('versions'); return v;
    },
    get: id => MA.versions.list().find(v => v.id === id),
    remove(id) { MA.db.set('versions', MA.versions.list().filter(v => v.id !== id)); MA.emit('versions'); },
    /** Full content for a version (overrides merged over defaults). */
    full: v => MA.clone(merge(C.defaults, v.content || {})),
  };
  const isolate = s => '⁨' + s + '⁩'; // keeps names and labels from reordering the line around them
  MA.activity = {
    list: () => MA.db.get('activity', []),
    /** { action, target, module, href, meta }. Store data in meta (ids, numbers); MA.activity.text(a) renders it in the current language. */
    log({ action, target = '', module = '', href = '', meta } = {}) {
      const me = MA.team?.me?.(), list = MA.activity.list();
      list.unshift({ id: MA.uid('a'), at: new Date().toISOString(), by: me?.name || 'MIRAS', byId: me?.id || '', action, target, module, href, meta });
      MA.db.set('activity', list.slice(0, 400)); MA.emit('activity');
      if (action === 'settings.export') MA.backup.mark(); // Settings › Export a backup
    },
    /** A direction-aware "a → b" (← in RTL), each side isolated. */
    arrow: (a, b) => `${isolate(a)}${MA.isRTL() ? ' ← ' : ' → '}${isolate(b)}`,
    /** The target line of an entry in the current UI language. Entries with meta are rendered now; older ones keep their stored text. */
    text(a) {
      const m = a?.meta || {};
      if (a?.action === 'lead.stage' && m.stage) return MA.activity.arrow(m.name ?? '', MA.L(MA.leads?.stage?.(m.stage)) || m.stage);
      if (a?.action === 'draft.prune' && m.n != null) return MA.t('act.pruned', { n: MA.num(m.n) });
      return String(a?.target ?? '');
    },
  };
  MA.notify = {
    list: () => MA.db.get('notifications', []),
    unread: () => MA.notify.list().filter(n => !n.read).length,
    /** { key, vars, textKey, textVars } (translated when shown, so they follow the admin language) or plain { title, text }; plus icon, href, tone */
    push(n) { const list = MA.notify.list(); list.unshift({ id: MA.uid('n'), at: new Date().toISOString(), read: false, ...n }); MA.db.set('notifications', list.slice(0, 120)); MA.emit('notify'); },
    read(id) { MA.db.set('notifications', MA.notify.list().map(n => (!id || n.id === id) ? { ...n, read: true } : n)); MA.emit('notify'); },
    clear() { MA.db.set('notifications', []); MA.emit('notify'); },
    /** → { title, text } in the current UI language (vars: names are isolated, numbers and dates formatted). */
    text(n) {
      const fill = o => { const r = {}; for (const [k, x] of Object.entries(o || {})) r[k] = k === 'date' ? MA.date(x) : typeof x === 'number' ? MA.num(x) : isolate(String(x ?? '')); return r; };
      return { title: n?.key ? MA.t(n.key, fill(n.vars)) : String(n?.title ?? ''), text: n?.textKey ? MA.t(n.textKey, fill(n.textVars)) : String(n?.text ?? '') };
    },
  };

  /* ================= backups + storage ================= */
  let persisted = null;
  MA.backup = {
    lastAt: () => MA.db.get('backupAt', null),
    /** Record that a backup was exported now (Settings calls this; logging 'settings.export' also does). */
    mark(at = new Date().toISOString()) { MA.db.set('backupAt', at); MA.emit('backup', MA.backup.status()); },
    /** { at, days: whole days since the last backup (null = never), due: true when a nudge is due (7+ days, or never with real data), persisted } */
    status() {
      const at = MA.backup.lastAt(), days = at ? Math.max(0, Math.floor((Date.now() - Date.parse(at)) / DAY_MS)) : null;
      const real = () => (MA.leads?.raw?.() || []).some(l => !l.sample) || MA.versions.list().length > 0 || !!MA.db.get('published', null);
      return { at, days, due: days === null ? real() : days >= 7, persisted };
    },
    /** Ask the browser to keep this site's storage (no eviction under pressure). → true | false | null (unsupported) */
    async persist() {
      try { if (await navigator.storage?.persisted?.()) return (persisted = true); persisted = navigator.storage?.persist ? await navigator.storage.persist() : null; } catch (e) { persisted = null; }
      MA.emit('backup', MA.backup.status()); return persisted;
    },
  };
  const lsBytes = () => { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || '').length; } } catch (e) {} return n * 2; };
  const readJSON = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  MA.storage = {
    /** Bytes this origin uses in localStorage (UTF-16). */
    used: lsBytes,
    /** What free() would remove: { autos, events, briefs } */
    plan() {
      let a = 0; const autos = MA.versions.list().filter(v => v.kind === 'auto' && ++a > 5).length;
      const ev = readJSON('miras.events'), events = Array.isArray(ev) ? Math.max(0, ev.length - 500) : 0;
      const inbox = readJSON('miras.leads.inbox'), seen = new Set(MA.db.get('leads.siteSeen', [])), briefs = Array.isArray(inbox) ? inbox.filter(b => b?.id && seen.has(b.id)).length : 0;
      return { autos, events, briefs };
    },
    /** Remove automatic checkpoints beyond the newest 5, site events beyond the newest 500, and site brief copies already in the inbox (asks first). → bytes freed */
    async free({ confirm = true } = {}) {
      const p = MA.storage.plan();
      if (!p.autos && !p.events && !p.briefs) { MA.toast(MA.t('save.nothing'), { tone: 'bad' }); return 0; }
      if (confirm && !(await ui.confirm(MA.t('save.freeTitle'), esc(MA.t('save.freeText', { autos: MA.num(p.autos), events: MA.num(p.events), briefs: MA.num(p.briefs) })), { ok: MA.t('save.free'), danger: true }))) return 0;
      const before = lsBytes(), put = (k, v) => { try { localStorage.removeItem(k); localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
      let a = 0; if (p.autos) put(NS + 'versions', MA.versions.list().filter(v => !(v.kind === 'auto' && ++a > 5)));
      if (p.events) put('miras.events', readJSON('miras.events').slice(-500));
      if (p.briefs) { const seen = new Set(MA.db.get('leads.siteSeen', [])); put('miras.leads.inbox', readJSON('miras.leads.inbox').filter(b => !(b?.id && seen.has(b.id)))); }
      MA.emit('versions'); MA.emit('site:events');
      const freed = Math.max(0, before - lsBytes()), ok = C.draft ? C.save() : true;
      MA.toast(MA.t(ok ? 'save.freed' : 'save.freedStill', { kb: MA.num(Math.max(1, Math.round(freed / 1024))) }), ok ? { icon: 'check' } : { tone: 'bad' });
      return freed;
    },
  };

  /* ================= content fields (bound to the draft) ================= */
  const F = MA.form = {};
  const RICH_OK = new Set(['EM', 'SPAN', 'BR']);
  /** The rich editor's own clean-up (contenteditable output → <em>/<span dir>/<br>; <i> → <em>, blocks → <br>), then the store's allowlist. */
  F.sanitize = html => {
    const t = document.createElement('template'); t.innerHTML = html;
    const walk = node => {
      for (const ch of [...node.childNodes]) {
        if (ch.nodeType === 3) continue;
        if (ch.nodeType !== 1) { ch.remove(); continue; }
        walk(ch);
        let tag = ch.tagName;
        if (tag === 'I') { const em = document.createElement('em'); em.append(...ch.childNodes); ch.replaceWith(em); continue; }
        if (tag === 'DIV' || tag === 'P') { const frag = document.createDocumentFragment(); if (ch.previousSibling) frag.append(document.createElement('br')); frag.append(...ch.childNodes); ch.replaceWith(frag); continue; }
        if (!RICH_OK.has(tag)) { ch.replaceWith(...ch.childNodes); continue; }
        for (const a of [...ch.attributes]) if (!(tag === 'SPAN' && a.name === 'dir')) ch.removeAttribute(a.name);
        if (tag === 'SPAN' && !ch.hasAttribute('dir')) ch.replaceWith(...ch.childNodes);
      }
    };
    walk(t.content);
    return cleanHTML(t.innerHTML.replace(/<br>$/, '').replace(/&nbsp;/g, ' ').replace(/<em><\/em>/g, ''));
  };
  /** Build one input bound to a content path. kind: text | textarea | rich | number | email | url | color | select | switch */
  F.input = (path, { kind = 'text', dir, placeholder = '', options, max, rows, readonly, label } = {}) => {
    const can = MA.can('content.edit') && !readonly, val = C.get(path);
    let el;
    if (kind === 'rich') {
      el = MA.h('div.rich', { contenteditable: can ? 'true' : 'false', role: 'textbox', 'aria-multiline': 'true', dir, 'data-placeholder': placeholder, spellcheck: 'true' });
      el.innerHTML = cleanHTML(String(val ?? '')); // never markup that didn't pass the allowlist
      el.addEventListener('input', () => C.set(path, F.sanitize(el.innerHTML)));
      el.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); F.toggleEm(el); C.set(path, F.sanitize(el.innerHTML)); }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') e.preventDefault();
        if (e.key === 'Enter' && !e.shiftKey) e.preventDefault();
      });
      el.addEventListener('paste', e => { e.preventDefault(); const txt = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, txt.replace(/\s*\n\s*/g, ' ')); });
      el._get = () => F.sanitize(el.innerHTML); el._set = v => { el.innerHTML = cleanHTML(String(v ?? '')); };
    } else if (kind === 'textarea') {
      el = MA.h('textarea.textarea', { dir, placeholder, rows: rows || 3, readOnly: !can });
      el.value = val ?? '';
      const grow = () => { el.style.height = 'auto'; el.style.height = Math.min(480, el.scrollHeight + 2) + 'px'; };
      el.addEventListener('input', () => { grow(); C.set(path, el.value); }); requestAnimationFrame(grow);
      el._get = () => el.value; el._set = v => { el.value = v ?? ''; grow(); };
    } else if (kind === 'select') {
      el = MA.h('select.select', { disabled: !can, onchange: () => C.set(path, isNaN(+el.value) || el.value === '' || typeof val === 'string' ? el.value : +el.value) });
      (options || []).forEach(o => el.append(MA.h('option', { value: o.value, selected: String(o.value) === String(val) }, o.label)));
      el._get = () => el.value; el._set = v => { el.value = v; };
    } else if (kind === 'switch') {
      const sw = ui.switch(!!val, v => C.set(path, v), '', { disabled: !can }); el = sw.querySelector('input'); el._get = () => el.checked; el._set = v => { el.checked = !!v; };
      el.dataset.path = path; return sw;
    } else if (kind === 'color') {
      const nm = MA.strip(label || C.label(path));
      const pick = MA.h('input', { type: 'color', value: val || '#000000', disabled: !can, 'aria-label': MA.t('field.colorPick', { label: nm }) }), hex = MA.h('input.input.mono', { value: val || '', maxLength: 7, readOnly: !can, style: 'width:110px;direction:ltr', spellcheck: false, 'aria-label': MA.t('field.colorHex', { label: nm }) });
      pick.addEventListener('input', () => { hex.value = pick.value.toUpperCase(); C.set(path, pick.value.toUpperCase()); });
      hex.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) { pick.value = hex.value; C.set(path, hex.value.toUpperCase()); } });
      const wrap = MA.h('div.row', pick, hex); hex.dataset.path = path; hex._get = () => hex.value; hex._set = v => { hex.value = v || ''; pick.value = v || '#000000'; };
      return wrap;
    } else {
      el = MA.h('input.input', { type: kind === 'number' ? 'number' : kind === 'email' ? 'email' : kind === 'url' ? 'url' : 'text', dir, placeholder, readOnly: !can, maxLength: max ? max * 2 : null });
      el.value = val ?? '';
      el.addEventListener('input', () => C.set(path, kind === 'number' ? (el.value === '' ? null : +el.value) : el.value));
      el._get = () => el.value; el._set = v => { el.value = v ?? ''; };
    }
    el.dataset.path = path;
    return el;
  };
  F.toggleEm = el => {
    const sel = getSelection(); if (!sel.rangeCount) return;
    const r = sel.getRangeAt(0); if (!el.contains(r.commonAncestorContainer)) return;
    const em = (r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement).closest('em');
    if (em && el.contains(em)) { em.replaceWith(...em.childNodes); return; }
    if (r.collapsed) return;
    const wrap = document.createElement('em'); try { r.surroundContents(wrap); } catch (e) { wrap.append(r.extractContents()); r.insertNode(wrap); }
    sel.removeAllRanges(); const nr = document.createRange(); nr.selectNodeContents(wrap); sel.addRange(nr);
  };
  /**
   * Bilingual content field. tpl contains {lang}, e.g. 'text/{lang}/j0.t' or 'swells/2/{lang}/problem'.
   * opts: { label, hint, kind: 'text'|'textarea'|'rich', max, placeholder, langs: ['en','ar'], pick (preview key; derived from tpl by default) }
   */
  F.bi = (tpl, opts = {}) => {
    const langs = opts.langs || ['en', 'ar'], kind = opts.kind || (C.get(MA.path.lang(tpl, 'en'))?.includes?.('<em>') ? 'rich' : 'text');
    const pick = opts.pick ?? C.toPick(tpl);
    const box = MA.h('div.cf', { dataset: { tpl } });
    const state = MA.h('span.state'), tools = MA.h('div.tools');
    const head = MA.h('div.cf-head', MA.h('span.name', { html: esc(opts.label || C.label(tpl)) }), opts.showKey === false ? null : MA.h('span.key', tpl.replace('{lang}/', '').replace(/^text\//, '')), state, tools);
    const grid = MA.h('div', { class: 'cf-langs' + (langs.length === 1 ? ' one' : '') });
    const inputs = {};
    for (const l of langs) {
      const path = MA.path.lang(tpl, l), inp = F.input(path, { kind, dir: l === 'ar' ? 'rtl' : 'ltr', placeholder: opts.placeholder?.[l] ?? (l === 'ar' ? 'بالعربية…' : 'In English…') });
      inp.setAttribute('lang', l); inp.setAttribute('aria-label', `${MA.strip(opts.label || C.label(tpl))} (${l.toUpperCase()})`);
      const count = MA.h('span.count');
      const wrap = MA.h('div.cf-lang', MA.h('span.lang-tag', l === 'ar' ? 'AR' : 'EN'), inp, opts.max ? count : null);
      // focusing an Arabic field shows the Arabic site: through frame.set, so each preview's EN/ع toggle and saved language follow
      if (pick) inp.addEventListener('focus', () => { for (const fr of frames) if (fr.state.lang !== l && fr.state.live !== false) fr.set({ lang: l }); MA.site.flash(pick); });
      inputs[l] = { inp, count, path };
      grid.append(wrap);
    }
    tools.append(
      pick ? ui.iconBtn('eye', { tip: MA.t('showInPreview'), size: 'sm', onclick: () => MA.site.flash(pick) }) : '',
      MA.can('content.edit') && !opts.readonly ? ui.iconBtn('more', { tip: MA.t('more'), size: 'sm', menu: true, onclick: e => ui.menu(e.currentTarget, [
        { label: MA.t('resetToPublished'), icon: 'undo', disabled: !langs.some(l => C.isChanged(MA.path.lang(tpl, l))), run: () => C.batch(MA.t('resetToPublished'), () => langs.forEach(l => C.reset(MA.path.lang(tpl, l), 'published'))) },
        { label: MA.t('resetToDefault'), icon: 'refresh', disabled: !langs.some(l => C.isCustom(MA.path.lang(tpl, l))), run: () => C.batch(MA.t('resetToDefault'), () => langs.forEach(l => C.reset(MA.path.lang(tpl, l), 'default'))) },
        langs.includes('ar') ? { label: MA.t('copyFromEn'), icon: 'copy', run: () => C.set(MA.path.lang(tpl, 'ar'), C.get(MA.path.lang(tpl, 'en')), { coalesce: false, by: 'copy' }) } : null,
      ], { align: 'end' }) }) : '');
    const refresh = () => {
      const changed = langs.some(l => C.isChanged(inputs[l].path));
      const ten = C.touched(inputs.en?.path), tar = C.touched(inputs.ar?.path);
      const stale = inputs.en && inputs.ar && (ten - tar > 1500 ? 'ar' : tar - ten > 1500 ? 'en' : null);
      state.className = 'state' + (stale ? ' stale' : changed ? ' changed' : '');
      state.innerHTML = stale ? `${tlSvg('stale')}${MA.t(stale === 'ar' ? 'staleAr' : 'staleEn')}` : changed ? `${tlSvg('edited')}${MA.t('changedField')}` : '';
      for (const l of langs) { if (!opts.max) continue; const n = MA.strip(C.get(inputs[l].path) || '').length; inputs[l].count.textContent = `${n}/${opts.max}`; inputs[l].count.classList.toggle('over', n > opts.max); }
    };
    box._refresh = refresh; refresh();
    box.append(head, grid);
    if (opts.hint) { const hid = MA.uid('cfh'); box.append(MA.h('p.hint', { html: opts.hint, id: hid })); for (const l of langs) inputs[l].inp.setAttribute('aria-describedby', hid); }
    return box;
  };
  /** Single-language content field (settings-like values). opts: { label, hint, kind, options, placeholder, dir } */
  F.one = (path, opts = {}) => {
    const box = MA.h('div.cf', { dataset: { tpl: path } }), state = MA.h('span.state'), nid = MA.uid('cfn');
    const inp = F.input(path, { ...opts, label: MA.strip(opts.label || C.label(path)) });
    // the visible name labels the control (text, select, switch, hex); the hint describes it
    const ctls = inp.matches?.('input,select,textarea,[role=textbox]') ? [inp] : $$('input,select,textarea', inp);
    ctls.forEach(c => { if (!c.getAttribute('aria-label')) c.setAttribute('aria-labelledby', nid); });
    const canReset = MA.can('content.edit') && !opts.readonly; // read-only roles don't get a reset they can't use
    box.append(MA.h('div.cf-head', MA.h('span.name', { id: nid, html: esc(opts.label || C.label(path)) }), state,
      MA.h('div.tools', canReset ? ui.iconBtn('refresh', { tip: MA.t('resetToDefault'), size: 'sm', onclick: () => C.reset(path, 'default') }) : null)), MA.h('div.cf-langs.one', MA.h('div.cf-lang', inp)));
    if (opts.hint) { box.append(MA.h('p.hint', { html: opts.hint, id: nid + '-h' })); ctls.forEach(c => c.setAttribute('aria-describedby', nid + '-h')); }
    box._refresh = () => { const ch = C.isChanged(path); state.className = 'state' + (ch ? ' changed' : ''); state.innerHTML = ch ? `${tlSvg('edited')}${MA.t('changedField')}` : ''; };
    box._refresh(); return box;
  };
  /** Scroll to a field (by tpl) inside the current view, flash it and focus its input for `lang`. */
  F.focus = (tpl, lang) => {
    const box = $$('.cf').find(b => b.dataset.tpl === tpl); if (!box) return false;
    box.scrollIntoView({ block: 'center', behavior: MA.reducedMotion() ? 'auto' : 'smooth' });
    box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
    const inp = box.querySelector(`[lang="${lang || 'en'}"]`) || box.querySelector('[data-path]'); setTimeout(() => inp?.focus({ preventScroll: true }), 250);
    return true;
  };
  // keep every mounted field in sync with the draft (undo, reset, other editors)
  MA.on('content:change', ({ path, by }) => {
    for (const el of $$('[data-path]')) {
      if (path && !(el.dataset.path === path || el.dataset.path.startsWith(path + '/') || path.startsWith(el.dataset.path + '/')) && path !== '') continue;
      const v = C.get(el.dataset.path);
      if ((document.activeElement === el && by === 'edit') || !el._set) continue; // never fight the field being typed in
      const cur = el._get?.(); if (!MA.eq(cur ?? '', v ?? '')) el._set(v);
    }
    $$('.cf').forEach(b => b._refresh?.());
  });

  /* ================= keyboard ================= */
  /* Shortcuts can be remapped (prefs.keymap: { 'default combo': 'your combo' }) and bare-key ones turned off
     (prefs.singleKeys = false: only combos with ⌘/Ctrl or Alt, plus Esc, still work — WCAG 2.1.4). */
  const effective = combo => prefs.keymap?.[combo] || combo;
  // read the physical key (event.code) so shortcuts survive an Arabic or Persian keyboard layout
  const CODE = { Slash: '/', BracketLeft: '[', BracketRight: ']', Comma: ',', Period: '.', Backslash: '\\', Minus: '-', Equal: '=', Semicolon: ';', Quote: "'", Backquote: '`' };
  const comboOf = e => {
    let key = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : /^Digit\d$/.test(e.code) ? e.code.slice(5) : CODE[e.code] || String(e.key || '').toLowerCase();
    if (e.shiftKey && key === '/') key = '?';
    const mods = (e.metaKey || e.ctrlKey ? 'mod+' : '') + (e.altKey ? 'alt+' : '');
    return (e.shiftKey && key !== '?' ? 'shift+' : '') + mods + key;
  };
  MA.keys = {
    isMac,
    /** combo: 'mod+k', 'shift+mod+z', '?', 'g o' (sequence). desc: string | () => string. Returns off().
     *  A later binding for the same combo shadows the earlier one until it is removed. */
    bind(combo, fn, desc, { global = false, core = false } = {}) { const k = { combo, fn, desc, global, core }; KEYS.push(k); return () => { const i = KEYS.indexOf(k); if (i >= 0) KEYS.splice(i, 1); }; },
    /** Bind only while the current page is mounted (removed automatically on route change). */
    bindView(combo, fn, desc, opts) { const off = MA.keys.bind(combo, fn, desc, opts); MA.cleanup(off); return off; },
    unbind(combo) { for (let i = KEYS.length - 1; i >= 0; i--) if (KEYS[i].combo === combo) { KEYS.splice(i, 1); return; } },
    /** Bindings with a description, newest per combo. Each has .combo (as bound) and .key (what to press, after remapping). */
    list: () => { const seen = new Set(); return KEYS.slice().reverse().filter(k => k.desc && !seen.has(k.combo) && seen.add(k.combo)).reverse().map(k => Object.assign(Object.create(k), { key: effective(k.combo) })); },
    /** What to press for a bound combo (after the person's remapping). Use it when you show a shortcut: MA.keys.label(MA.keys.effective('e')). */
    effective,
    /** The combo a keydown event stands for ('shift+mod+z', 'g', '?'), read from the physical key. */
    comboOf,
    /** Bare-key shortcuts on? Pages with their own key handlers should check this. */
    singleOn: () => prefs.singleKeys !== false,
    /** Remap a combo (null = back to the default). → true, or false when another shortcut already uses it. */
    remap(def, combo) {
      const map = { ...(prefs.keymap || {}) };
      if (!combo || combo === def) delete map[def];
      else { if (KEYS.some(k => k.desc && k.combo !== def && effective(k.combo) === combo)) return false; map[def] = combo; }
      MA.prefs.set('keymap', map); return true;
    },
    label: combo => combo.split(' ').map(part => part.split('+').map(x => ({ mod: isMac ? '⌘' : 'Ctrl', shift: '⇧', alt: isMac ? '⌥' : 'Alt', enter: '↵', escape: 'Esc', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', backspace: '⌫' })[x] || x.toUpperCase()).join(isMac ? '' : '+')).join(' '),
    /** aria-keyshortcuts value: 'alt+z' → 'Alt+Z', 'mod+k' → 'Meta+K' / 'Control+K'. */
    aria: combo => combo.split(' ').map(part => part.split('+').map(x => ({ mod: isMac ? 'Meta' : 'Control', shift: 'Shift', alt: 'Alt', enter: 'Enter', escape: 'Escape', backspace: 'Backspace', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', arrowup: 'ArrowUp', arrowdown: 'ArrowDown' })[x] || x.toUpperCase()).join('+')).join(' '),
  };
  let seq = '', seqT;
  addEventListener('keydown', e => {
    if (e.defaultPrevented || e.isComposing) return;
    const typing = e.target.closest?.('input,textarea,select,[contenteditable=true]');
    const combo = comboOf(e), hasMod = e.metaKey || e.ctrlKey || e.altKey;
    if (!hasMod && prefs.singleKeys === false && combo !== 'escape') { seq = ''; return; } // bare keys are off
    const find = c => { for (let i = KEYS.length - 1; i >= 0; i--) if (effective(KEYS[i].combo) === c) return KEYS[i]; return null; };
    let k = seq ? null : find(combo); // a pending sequence ("g …") takes priority over single keys
    if (!k && !hasMod && !typing && !layers.length) {
      const s = seq ? seq + ' ' + combo : combo, hit = find(s);
      if (hit && s.includes(' ')) { k = hit; seq = ''; }
      else if (KEYS.some(x => effective(x.combo).startsWith(s + ' '))) { seq = s; clearTimeout(seqT); seqT = setTimeout(() => seq = '', 1000); e.preventDefault(); return; }
      else { seq = ''; k = find(combo); }
    }
    if (!k) return;
    const eff = effective(k.combo);
    if (layers.length && !/(mod|alt)\+/.test(eff)) return; // bare keys don't fire under a dialog or menu
    if (typing && !k.global && !(e.metaKey || e.ctrlKey)) return;
    if (typing && ['mod+z', 'shift+mod+z', 'mod+y'].includes(eff)) return; // native undo while typing
    e.preventDefault(); k.fn(e);
  });

  /* ================= command palette ================= */
  const COMMANDS = [], SEARCHERS = [];
  MA.commands = { add(c) { const i = COMMANDS.findIndex(x => x.id === c.id); i >= 0 ? COMMANDS.splice(i, 1, c) : COMMANDS.push(c); }, list: () => COMMANDS };
  /** fn(q) → [{title, sub, icon, run, group, score?}] (sync) */
  MA.search = { add: fn => SEARCHERS.push(fn) };
  /**
   * How well text s matches query q, on folded text (Arabic/Persian letter variants, digits and case don't matter):
   * exact 1000 · starts with 800 · a word starts with 600 · contains 400 (earlier is better) · letters in order ≤ 150 (only with fuzzy).
   */
  const score = (q, s, { fuzzy = true } = {}) => {
    const fq = MA.fold(q).trim(); if (!fq) return 1;
    const fs = MA.fold(s).trim(); if (!fs) return 0;
    if (fs === fq) return 1000;
    if (fs.startsWith(fq)) return 800 - Math.min(100, fs.length * .2);
    const i = fs.indexOf(fq);
    if (i >= 0) return (/[\s\-–·:/(«"'،.]/.test(fs[i - 1]) ? 600 : 400) - Math.min(150, i) - Math.min(50, fs.length * .05);
    if (!fuzzy || fq.length < 2) return 0;
    let j = 0, sc = 0, run = 0;
    for (const c of fs) { if (c === fq[j]) { j++; run++; sc += 2 + run; } else run = 0; if (j === fq.length) return Math.max(0, Math.min(150, sc * 3) - fs.length * .1); }
    return 0;
  };
  MA.score = score;
  /** Highlight the first folded match of q in s (escaped HTML). */
  const hl = (s, q) => {
    s = String(s ?? ''); const fq = MA.fold(q).trim(); if (!fq) return esc(s);
    const { f, map } = MA.foldMap(s), i = f.indexOf(fq); if (i < 0) return esc(s);
    const a = map[i], b = map[i + fq.length] ?? s.length;
    return esc(s.slice(0, a)) + '<mark>' + esc(s.slice(a, b)) + '</mark>' + esc(s.slice(b));
  };
  const GROUP_RANK = { nav: 3, cmd: 2, found: 1 };
  /** One ranked list for a query: exact and prefix matches beat loose ones, whatever kind they are; duplicates go. */
  function paletteResults(q) {
    const navs = MODS.map(m => ({ kind: 'nav', title: MA.L(m.title), sub: MA.t('grp.' + m.group), icon: m.icon, meta: m.shortcut ? MA.keys.label(MA.keys.effective(m.shortcut)) : '', run: () => MA.go('#/' + m.id), group: MA.t('pal.nav'),
      s: Math.max(score(q, MA.L(m.title)), score(q, m.keywords || '', { fuzzy: false }) * .6) }));
    const cmds = COMMANDS.filter(c => !c.when || c.when()).map(c => ({ kind: 'cmd', title: MA.L(c.title), sub: MA.L(c.sub || ''), icon: c.icon || 'bolt', meta: c.shortcut ? MA.keys.label(MA.keys.effective(c.shortcut)) : '', run: c.run, group: MA.t('pal.actions'),
      s: Math.max(score(q, MA.L(c.title)), score(q, c.keywords || '', { fuzzy: false }) * .6) }));
    const found = [];
    if (MA.fold(q).trim().length > 1) {
      // a module's own search already decided its rows match (e.g. by email); never rank them out completely
      const rate = r => r.score ?? Math.max(score(q, r.title), score(q, r.sub || '', { fuzzy: false }) * .5, 300);
      for (const fn of SEARCHERS) try { found.push(...(fn(q) || []).map(r => ({ ...r, kind: 'found', group: r.group || MA.t('pal.results'), s: rate(r) }))); } catch (e) { console.error(e); }
      for (const m of MODS) try { if (m.search) found.push(...(m.search(q) || []).map(r => ({ ...r, kind: 'found', group: r.group || MA.L(m.title), s: rate(r) }))); } catch (e) { console.error(e); }
      found.push(...contentSearch(q).map(r => ({ ...r, kind: 'found' })));
    }
    let all = [...navs, ...cmds, ...found].filter(x => x.s > 0);
    if (all.some(x => x.s >= 300)) all = all.filter(x => x.s >= 160); // loose letter matches are noise once real matches exist
    all.sort((a, b) => b.s - a.s || GROUP_RANK[b.kind] - GROUP_RANK[a.kind] || String(a.title).length - String(b.title).length);
    const seen = new Set();
    return all.filter(x => { const k = x.kind === 'found' ? 'f|' + (x.key || MA.fold(MA.strip(x.title)).trim()) : x.kind + '|' + x.title; if (seen.has(k)) return false; seen.add(k); if (x.kind === 'found' && x.key) seen.add('f|' + MA.fold(MA.strip(x.title)).trim()); return true; }).slice(0, 24);
  }
  /** ⌘K palette: a combobox (the input) over a listbox of options; ↑/↓ move the active option (aria-activedescendant), Enter runs it.
   *  Focus goes back to where it was when the palette closes, unless the command took you to another page. */
  MA.palette = {
    results: paletteResults,
    open(initial = '') {
      if ($('.palette-wrap')) return;
      const lid = MA.uid('pl'), prevFocus = document.activeElement;
      const input = MA.h('input', { placeholder: MA.t('search'), value: initial, 'aria-label': MA.t('search'), autocomplete: 'off', spellcheck: false,
        role: 'combobox', 'aria-expanded': 'true', 'aria-controls': lid, 'aria-autocomplete': 'list', 'aria-haspopup': 'listbox' });
      const list = MA.h('div.palette-list', { role: 'listbox', id: lid, 'aria-label': MA.t('pal.results') });
      const box = MA.h('div.palette', { role: 'dialog', 'aria-modal': 'true', 'aria-label': MA.t('search') },
        MA.h('div.palette-input', MA.frag(MA.icon('search')), input, MA.h('kbd', 'Esc')), list,
        MA.h('div.palette-foot', { 'aria-hidden': 'true', html: `<span><kbd>↑</kbd><kbd>↓</kbd> ${MA.t('pal.hint.nav')}</span><span><kbd>↵</kbd> ${MA.t('pal.hint.open')}</span><span><kbd>Esc</kbd> ${MA.t('pal.hint.close')}</span>` }));
      const scrim = MA.h('div.scrim'), wrap = MA.h('div.palette-wrap', box);
      let items = [], active = 0, closed = false;
      const close = silent => { if (closed) return; closed = true; dropLayer(L); scrim.remove(); wrap.remove(); if (!silent && prevFocus?.isConnected) prevFocus.focus?.({ preventScroll: true }); };
      const L = { el: box, close, kind: 'palette', modal: true }; addLayer(L);
      const run = it => {
        const at = location.hash; close(true); it.run();
        // a command that stayed on this page (theme, customize…) gives focus back; a new page focuses its own heading
        setTimeout(() => { if (location.hash === at && (!document.activeElement || document.activeElement === document.body) && prevFocus?.isConnected) prevFocus.focus?.({ preventScroll: true }); }, 120);
      };
      const row = (it, q, withGroup) => { const idx = items.push(it) - 1, sub = withGroup && it.group && it.sub !== it.group ? [it.group, it.sub].filter(Boolean).join(' · ') : it.sub || '';
        return MA.h('div', { role: 'option', id: `${lid}-${idx}`, class: 'palette-item', 'aria-selected': 'false', dataset: { i: idx }, onclick: () => run(it), onpointermove: () => { if (active !== idx) { active = idx; mark(); } },
          html: `${MA.icon(it.icon || 'arrowRight')}<span>${hl(it.title, q)}</span><span class="sub">${esc(sub)}</span>${it.meta ? `<span class="meta"><kbd>${esc(it.meta)}</kbd></span>` : ''}` }); };
      const group = (label, rowsEls) => { const gid = MA.uid('pg'); return MA.h('div', { role: 'group', 'aria-labelledby': gid }, MA.h('div.palette-group.label', { id: gid, role: 'presentation' }, label), rowsEls); };
      const keyLabel = c => c ? MA.keys.label(MA.keys.effective(c)) : '';
      const draw = () => {
        const q = input.value.trim();
        items = []; list.innerHTML = '';
        if (q) {
          const res = paletteResults(q);
          if (res.length) list.append(group(MA.t('pal.results'), res.map(it => row(it, q, true))));
        } else {
          const navs = orderedMods().filter(m => !prefs.navHidden.includes(m.id)).slice(0, 13).map(m => ({ title: MA.L(m.title), sub: MA.t('grp.' + m.group), icon: m.icon, meta: keyLabel(m.shortcut), run: () => MA.go('#/' + m.id) }));
          const cmds = COMMANDS.filter(c => !c.when || c.when()).slice(0, 8).map(c => ({ title: MA.L(c.title), sub: MA.L(c.sub || ''), icon: c.icon || 'bolt', meta: keyLabel(c.shortcut), run: c.run }));
          for (const [g, arr] of [[MA.t('pal.nav'), navs], [MA.t('pal.actions'), cmds]]) if (arr.length) list.append(group(g, arr.map(it => row(it, '', false))));
        }
        if (!items.length) list.append(MA.h('div.empty', { style: 'padding:36px', role: 'presentation' }, MA.h('p', { role: 'status' }, MA.t('pal.empty', { q }))));
        active = 0; mark();
      };
      const mark = () => {
        $$('.palette-item', list).forEach(b => { const on = +b.dataset.i === active; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); if (on) b.scrollIntoView({ block: 'nearest' }); });
        if (items.length) input.setAttribute('aria-activedescendant', `${lid}-${active}`); else input.removeAttribute('aria-activedescendant');
      };
      input.addEventListener('input', draw);
      input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); mark(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); mark(); }
        else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); active = 0; mark(); }
        else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); active = Math.max(0, items.length - 1); mark(); }
        else if (e.key === 'Enter') { e.preventDefault(); items[active] && run(items[active]); }
      });
      scrim.addEventListener('pointerdown', () => close()); wrap.addEventListener('pointerdown', e => { if (e.target === wrap) close(); });
      document.body.append(scrim, wrap); syncInert(); draw(); input.focus(); input.select();
      return L;
    },
  };
  /** Search every text value in the draft (both languages), plus studio details, SEO and the tagline. */
  function contentSearch(q) {
    if (!C.draft) return [];
    const out = [], fq = MA.fold(q).trim(); if (fq.length < 2) return out;
    const SKIP = new Set(['id', 'icon', 'img', 'tint', 'phase', 'swell', 'for', 'group']);
    const add = (o, p, lang) => {
      const txt = MA.strip(o), { f, map } = MA.foldMap(txt), i = f.indexOf(fq); if (i < 0) return;
      const path = p.join('/'), tpl = lang ? p.map(x => x === lang ? '{lang}' : x).join('/') : path, loc = routeForPath(path, tpl); if (!loc) return;
      const at = map[i] ?? 0;
      out.push({ title: txt.length > 70 ? '…' + txt.slice(Math.max(0, at - 20), at + 50) + '…' : txt, sub: C.label(path), icon: 'type', group: MA.t('pal.content'), key: loc.route + '|' + tpl + '|' + (lang || ''),
        s: score(q, txt, { fuzzy: false }) - .5, run: () => { C.focusAfterRoute = { tpl: loc.tpl, lang: lang || 'en' }; MA.go(`#/${loc.route}?field=${encodeURIComponent(loc.tpl)}`); } });
    };
    const visit = (o, p) => {
      if (typeof o === 'string') { const lang = p.includes('ar') ? 'ar' : p.includes('en') ? 'en' : ''; if (!lang || SKIP.has(String(p.at(-1)))) return; add(o, p, lang); }
      else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) visit(v, [...p, k]);
    };
    for (const k of ['text', 'swells', 'stages', 'faq', 'ui', 'make', 'steps', 'services', 'sgroups', 'tagline', 'seo']) visit(C.draft[k], [k]);
    for (const [k, v] of Object.entries(C.draft.studio || {})) if (typeof v === 'string' && v) add(v, ['studio', k], '');
    for (const k of ['ogImage', 'themeColor']) if (typeof C.draft.seo?.[k] === 'string' && C.draft.seo[k]) add(C.draft.seo[k], ['seo', k], '');
    return out.sort((a, b) => b.s - a.s).slice(0, 30);
  }
  function routeForPath(path, tpl) {
    const top = path.split('/')[0];
    return { text: { route: 'pages', tpl }, swells: { route: 'services', tpl }, stages: { route: 'process', tpl }, steps: { route: 'process', tpl }, services: { route: 'services', tpl }, sgroups: { route: 'services', tpl }, faq: { route: 'faq', tpl }, ui: { route: 'pages', tpl }, make: { route: 'pages', tpl }, tagline: { route: 'pages', tpl }, studio: { route: 'settings', tpl }, seo: { route: 'seo', tpl } }[top] || null;
  }

  /* ================= shell ================= */
  function renderShell() {
    const app = $('#app');
    app.innerHTML = '';
    const skip = MA.h('a.skip-link', { href: '#view', onclick: e => { e.preventDefault(); const v = $('#view'), h = v?.querySelector('h1'); if (h && !h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); (h || v)?.focus({ preventScroll: false }); } }, MA.t('a11y.skip'));
    const side = MA.h('aside.side', { 'aria-label': MA.t('adminLabel') },
      MA.h('div.side-top',
        MA.h('a.brandmark', { href: '#/overview', 'aria-label': 'MIRAS' }, MA.h('span.mono-mask'), MA.h('span.word', MA.h('b', 'MIRAS'), MA.h('span', MA.L({ en: 'Studio admin', ar: 'استوديو الإدارة', fa: 'پنل استودیو' })))),
        MA.h('button.collapse', { type: 'button', 'aria-label': MA.t(prefs.sidebar === 'collapsed' ? 'expand' : 'collapse'), 'aria-expanded': String(prefs.sidebar !== 'collapsed'), 'data-tip': MA.t(prefs.sidebar === 'collapsed' ? 'expand' : 'collapse'), 'data-tip-pos': 'end', html: MA.icon('sidebar'), onclick: toggleSidebar })),
      MA.h('nav.side-scroll#nav', { 'aria-label': MA.t('menu') }),
      MA.h('div.side-foot', MA.h('div.side-sea', { 'aria-hidden': 'true' }, MA.h('canvas.sea#sideSea', { style: 'color:var(--tide60)' })), MA.h('button.me#meBtn', { type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false' })));
    const top = MA.h('header.top#top',
      MA.h('button.icon-btn.mob-only', { type: 'button', 'aria-label': MA.t('menu'), html: MA.icon('list'), onclick: () => document.documentElement.classList.toggle('nav-open') }),
      MA.h('nav.crumbs#crumbs', { 'aria-label': MA.L({ en: 'Breadcrumb', ar: 'مسار التنقل', fa: 'مسیر صفحه' }) }), MA.h('div.spacer'),
      MA.h('button.search-btn', { type: 'button', 'aria-keyshortcuts': MA.keys.aria(MA.keys.effective('mod+k')), onclick: () => MA.palette.open(), html: `${MA.icon('search', 'sm')}<span>${MA.t('search')}</span><kbd>${MA.keys.label(MA.keys.effective('mod+k'))}</kbd>` }),
      MA.h('button.status-pill#statusPill', { type: 'button', onclick: () => openPublish() }),
      ui.iconBtn('eye', { tip: MA.t('previewSite'), tipPos: 'bottom', onclick: () => MA.preview.toggle() }),
      MA.h('button.icon-btn#bellBtn', { type: 'button', 'aria-label': MA.t('notifications'), 'aria-haspopup': 'dialog', 'data-tip': MA.t('notifications'), 'data-tip-pos': 'bottom', html: MA.icon('bell'), onclick: e => openBell(e.currentTarget) }),
      ui.iconBtn('sliders', { tip: MA.t('customize'), tipPos: 'bottom', onclick: () => MA.customize() }),
      MA.h('button.btn.primary#publishBtn', { type: 'button', 'aria-keyshortcuts': MA.keys.aria(MA.keys.effective('shift+mod+p')), onclick: () => openPublish(), html: `${MA.icon('publish')}<span>${MA.t('publish')}</span>` }));
    const main = MA.h('div.main', MA.h('div#ribbon'), top, MA.h('main.view#view', { tabindex: '-1' }));
    app.append(skip, MA.h('div.app', side, main));
    navSig = ''; renderNav(); renderMe(); updateStatus(); updateBell(); renderRibbon();
    MA.siteSea?.destroy?.();
    MA.siteSea = MA.sea($('#sideSea'), { lines: 9, rough: .25, alpha: .55, width: 1 });
    $('#nav').addEventListener('click', e => { if (e.target.closest('.nav-item')) document.documentElement.classList.remove('nav-open'); });
  }
  /** Screen-reader live regions and the toast region exist from the start, so the first message is heard too. */
  function liveRegions() {
    if (!$('#a11y-live')) document.body.append(MA.h('div#a11y-live.sr-only', { role: 'status', 'aria-live': 'polite' }), MA.h('div#a11y-alert.sr-only', { role: 'alert', 'aria-live': 'assertive' }));
    toastRegion();
  }
  function toggleSidebar() { MA.prefs.set('sidebar', prefs.sidebar === 'collapsed' ? 'expanded' : 'collapsed'); renderShellBits(); }
  function renderShellBits() { const c = $('.side .collapse'); if (c) { const k = prefs.sidebar === 'collapsed' ? 'expand' : 'collapse'; c.setAttribute('aria-label', MA.t(k)); c.setAttribute('aria-expanded', String(prefs.sidebar !== 'collapsed')); c.dataset.tip = MA.t(k); } renderNav(); }
  function orderedMods() {
    const order = prefs.navOrder || [];
    return [...MODS].sort((a, b) => { const ia = order.indexOf(a.id), ib = order.indexOf(b.id); return (ia < 0 ? 999 + (a.order ?? 50) : ia) - (ib < 0 ? 999 + (b.order ?? 50) : ib); });
  }
  MA.orderedModules = orderedMods;
  /* The sidebar is rebuilt only when its structure changes (order, hidden pages, language, roles); badge refreshes update the
     counts and names in place, so a focused link is never pulled out from under the keyboard. */
  let navSig = '';
  const badgeOf = m => { let b = null; try { b = m.badge?.(); } catch (e) {} if (b == null || b === false || b === 0 || b === '') return null; return typeof b === 'object' ? { n: b.n, quiet: !!b.quiet, label: b.label } : { n: b, quiet: false }; };
  const navName = (e, b, locked) => { const name = MA.L(e.title); if (locked) return MA.t('nav.locked', { name }); if (!b) return name; if (b.label) return `${name}, ${MA.strip(b.label)}`; const n = typeof b.n === 'number' ? b.n : /^\d+$/.test(String(b.n)) ? +b.n : null; return MA.t(b.quiet ? 'nav.badgeQuiet' : 'nav.badgeNew', n == null ? { name, n: b.n } : { name, n, count: n }); };
  /** The sidebar's links. A page is one link. A page that lists several (module.navItems()) gives one link per item, and each item
   *  has its own match(ctx) for the current route, its own href and badge. Items share their page's permission and hide with it. */
  function navEntries(m) {
    if (typeof m.navItems !== 'function') return [{ key: m.id, mod: m, title: m.title, icon: m.icon, href: '#/' + m.id, match: ctx => ctx.id === m.id, badge: () => m.badge?.() }];
    let items = []; try { items = m.navItems() || []; } catch (err) { console.error(err); }
    return items.filter(it => it && it.href).map(it => ({ key: m.id + '/' + it.key, mod: m, title: it.title, icon: it.icon || m.icon, href: it.href, match: it.match, badge: () => it.badge?.() }));
  }
  const navMatch = (e, ctx) => { try { return !!(e.match && e.match(ctx)); } catch (err) { return false; } };
  let navNow = [];   // the links as they are drawn, in order (markNav reads them)
  function paintNavItem(a, e) {
    const b = badgeOf(e), locked = !!(e.mod.perm && !MA.can(e.mod.perm)), tail = a.querySelector('.tail');
    a.setAttribute('aria-label', navName(e, b, locked)); a.dataset.tip = MA.L(e.title);
    b ? a.dataset.badge = '1' : delete a.dataset.badge;
    const html = locked ? MA.icon('lock', 'sm lock') : b ? `<span class="count${b.quiet ? ' quiet' : ''}" aria-hidden="true">${badgeText(b.n)}</span>` : '';
    if (tail.innerHTML !== html) tail.innerHTML = html;
  }
  /** The sidebar's categories, in order. Clients is its own category, right after Workspace. */
  const NAV_GROUPS = ['work', 'clients', 'site', 'system'];
  function renderNav() {
    const nav = $('#nav'); if (!nav) return;
    const groups = NAV_GROUPS.map(g => [g, orderedMods().filter(m => m.group === g && !prefs.navHidden.includes(m.id)).flatMap(navEntries)])
      .filter(([, es]) => es.length);
    navNow = groups.flatMap(([, es]) => es);
    const sig = prefs.lang + '|' + MA.role() + '|' + groups.map(([g, es]) => g + ':' + es.map(e => e.key).join(',')).join('|');
    if (sig === navSig && nav.childElementCount) { for (const a of $$('.nav-item', nav)) { const e = navNow.find(x => x.key === a.dataset.id); if (e) paintNavItem(a, e); } markNav(); return; }
    const had = nav.contains(document.activeElement) ? document.activeElement.dataset?.id : null;
    navSig = sig; nav.innerHTML = '';
    for (const [g, es] of groups) {
      // data-group sets the category colour in admin.css (--g): work Tide60, clients Flare, site Foam, system Shore
      const gid = 'navg-' + g, box = MA.h('div.nav-group', { role: 'group', 'aria-labelledby': gid, dataset: { group: g } }, MA.h('div.label', { id: gid }, MA.t('grp.' + g)));
      for (const e of es) {
        const a = MA.h('a.nav-item', { href: e.href, dataset: { id: e.key }, 'data-tip-pos': 'end', html: `${MA.icon(e.icon)}<span class="name">${esc(MA.L(e.title))}</span><span class="tail"></span>` });
        paintNavItem(a, e); box.append(a);
      }
      nav.append(box);
    }
    markNav();
    if (had) nav.querySelector(`.nav-item[data-id="${CSS.escape(had)}"]`)?.focus({ preventScroll: true });
  }
  MA.renderNav = renderNav;
  /** Counts follow the digit preference (Persian digits in Persian). */
  const badgeText = n => typeof n === 'number' ? esc(MA.num(n)) : /^\d+$/.test(String(n ?? '')) ? esc(MA.num(+n)) : esc(n);
  /** The one link whose match(route) is true is the current page (a page with items marks only the item it is on). */
  function markNav() { const ctx = current?.ctx || parseHash(), on = navNow.find(e => navMatch(e, ctx)); $$('.nav-item').forEach(a => a.dataset.id === on?.key ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')); }
  function renderCrumbs(ctx, mod) {
    const c = $('#crumbs'); if (!c) return;
    c.innerHTML = '';
    if (!mod) return;
    c.append(MA.h('span.faint', { html: MA.icon(mod.icon, 'sm') }));
    const extra = mod.crumbs?.(ctx) || [];
    if (extra.length) { c.append(MA.h('a', { href: '#/' + mod.id }, MA.L(mod.title))); extra.forEach((x, i) => { c.append(MA.h('span.sep', '/')); c.append(i === extra.length - 1 ? MA.h('b', x.label) : MA.h('a', { href: x.href }, x.label)); }); }
    else c.append(MA.h('b', MA.L(mod.title)));
  }
  MA.setCrumbs = (items) => { if (current) { const m = current.mod; const orig = m.crumbs; m.crumbs = () => items; renderCrumbs(current.ctx, m); m.crumbs = orig; } };
  function renderMe() {
    const b = $('#meBtn'); if (!b) return;
    const me = MA.team?.me?.() || { name: 'MIRAS', role: 'owner', color: 'var(--tide)' };
    const who = MA.team?.display?.(me) ?? me.name, roleTxt = prefs.viewAs ? `${MA.t('viewAs')}: ${MA.t('role.' + prefs.viewAs)}` : MA.t('role.' + (me.role || 'owner'));
    b.innerHTML = ''; b.append(ui.avatar(me), MA.h('span.who', MA.h('b', who), MA.h('span', roleTxt)));
    b.setAttribute('aria-label', MA.t('me.label', { name: who || 'MIRAS', role: roleTxt })); b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-expanded', 'false');
    b.onclick = () => {
      const realRole = me.role || 'owner';
      ui.menu(b, [
        me.email ? { heading: me.email, plain: true } : { heading: MA.t('profile') },
        MA.modules().find(m => m.id === 'team') ? { label: MA.t('profile'), icon: 'user', run: () => MA.go('#/team/' + (me.id || '')) } : null,
        { label: MA.t('customize'), icon: 'sliders', run: () => MA.customize() },
        { label: MA.t('shortcuts'), icon: 'keyboard', meta: '<kbd>?</kbd>', run: () => showShortcuts() },
        '-', { heading: MA.t('viewAs') },
        ...Object.keys(MA.ROLES).map(r => ({ label: MA.t('role.' + r), checked: (prefs.viewAs || realRole) === r, run: () => { MA.prefs.set('viewAs', r === realRole ? '' : r); renderMe(); renderNav(); renderRibbon(); route(); } })),
        '-', { heading: MA.t('cz.language') },
        ...MA.LANGS.map(L => ({ label: L.name, checked: MA.lang() === L.id, run: () => setAdminLang(L.id) })),
        '-',
        { label: MA.t('viewSite'), icon: 'external', href: SITE_URL, target: '_blank' },
      ].filter(Boolean));
    };
  }
  MA.renderMe = renderMe;
  function setAdminLang(l) { MA.prefs.set('lang', l); renderShell(); MA.rerender(); }
  MA.setAdminLang = setAdminLang;
  /** Calm one-line bars above the top bar: view-as, a draft that can't be saved, the live site changing under your edits, site content errors, working from the cached copy. */
  function renderRibbon() {
    const r = $('#ribbon'); if (!r) return; r.innerHTML = '';
    const bar = (cls, tone, icon, html, ...btns) => r.append(MA.h('div', { class: 'demo-ribbon ' + cls, role: cls === 'rb-save' ? 'alert' : null, style: tone === 'bad' ? 'background:var(--bad-bg);color:var(--bad)' : tone === 'info' ? 'background:var(--info-bg);color:var(--info)' : '', html: MA.icon(icon, 'sm') + `<span>${html}</span>` }, ...btns));
    const act = (label, run) => MA.h('button.btn.sm.ghost', { type: 'button', onclick: run }, label);
    if (MA.content?.saveError) bar('rb-save', 'bad', 'warn', esc(MA.t('save.full')), act(MA.t('save.free'), () => MA.storage.free()));
    const cf = MA.content?.draft ? MA.content.conflicts() : [];
    if (cf.length) bar('rb-conflict', 'info', 'refresh', `${esc(MA.t('conflict.ribbon'))} ${esc(cf.length === 1 ? MA.t('conflict.ribbonOne') : MA.t('conflict.ribbonN', { n: MA.num(cf.length) }))}`, act(MA.t('conflict.review'), () => openConflicts()));
    if (MA.site.errors.length && MA.content?.draft) bar('rb-site', 'bad', 'warn', esc(MA.t('site.contentErr', { part: MA.site.errorText() || '—' })), MA.modules().some(m => m.id === 'history') ? act(MA.t('site.openHistory'), () => MA.go('#/history')) : null);
    const bk = backupDue();
    if (bk) bar('rb-backup', '', 'download', esc(bk.days == null ? MA.t('bk.never') : MA.t('bk.ribbon', { n: bk.days, count: bk.days })),
      act(MA.t('bk.now'), () => { const c = MA.commands.list().find(x => x.id === 'settings.export'); c && (!c.when || c.when()) ? c.run() : MA.go('#/settings/data'); }),
      act(MA.t('bk.later'), () => { MA.db.set('backup.snoozedAt', Date.now()); renderRibbon(); }));
    if (MA.site.source === 'cache' && MA.site.offline) bar('rb-cache', '', 'info', esc(MA.t('site.cached', { when: MA.site.cachedAt ? MA.ago(MA.site.cachedAt) : '—' })), act(MA.t('retry'), () => location.reload()));
    if (prefs.viewAs) r.append(MA.h('div.demo-ribbon', { style: 'background:var(--info-bg);color:var(--info)', html: MA.icon('eye', 'sm') + `<span>${MA.t('viewAsNote', { role: '<b>' + MA.t('role.' + prefs.viewAs) + '</b>' })}</span>` }, MA.h('button.btn.sm.ghost', { type: 'button', onclick: () => { MA.prefs.set('viewAs', ''); renderMe(); renderNav(); renderRibbon(); route(); } }, MA.t('viewAsBack', { role: MA.t('role.' + (MA.team?.me?.()?.role || 'owner')) }))));
  }
  MA.renderRibbon = renderRibbon;
  /** The backup nudge shows once the admin is a week old, there is real data and the last backup is 7+ days old (or never),
   *  for people who can export (owner/admin); "Later" hides it for a week. → { days } | null */
  function backupDue() {
    if (!MA.can('settings.edit')) return null;
    const s = MA.backup.status(), installed = Date.parse(MA.db.get('installedAt', '')) || Date.now(), snoozed = +MA.db.get('backup.snoozedAt', 0) || 0;
    if (!s.due || Date.now() - installed < 7 * DAY_MS || Date.now() - snoozed < 7 * DAY_MS) return null;
    return { days: s.days };
  }
  MA.backup.due = () => !!backupDue();
  MA.on('backup', () => renderRibbon());
  /** Review the paths where the live site changed under your edits: keep yours or take the live version, one by one or all at once. */
  function openConflicts() {
    const list = C.conflicts(); if (!list.length) return null;
    const sl = MA.lang() === 'ar' ? 'ar' : 'en', can = MA.can('content.edit');
    const SKIP = new Set(['id', 'icon', 'tint', 'phase', 'swell', 'for', 'group']);
    const textOf = v => {
      const out = []; let len = 0;
      const walk = x => { if (len > 400) return; if (typeof x === 'string') { const t = MA.strip(x).trim(); if (t) { out.push(t); len += t.length; } } else if (typeof x === 'number' || typeof x === 'boolean') out.push(String(x)); else if (Array.isArray(x)) x.forEach(walk); else if (isObj(x)) for (const [k, y] of Object.entries(x)) { if ((k === 'en' || k === 'ar') && k !== sl) continue; if (!SKIP.has(k)) walk(y); } };
      walk(v); const s = out.join(' · '); return s ? (s.length > 240 ? s.slice(0, 240) + '…' : s) : MA.t('conflict.empty');
    };
    const body = MA.h('div.cfx', { style: 'display:flex;flex-direction:column;gap:12px' }, MA.h('p.muted', MA.t('conflict.intro')));
    for (const c of list) {
      const acts = MA.h('div.btn-row.cfx-acts', { style: 'margin-top:10px' });
      const col = (label, v) => MA.h('div', MA.h('p.label', { style: 'margin-bottom:4px' }, label), MA.h('p.small', { dir: 'auto', lang: c.path.includes('/ar') ? 'ar' : sl, style: 'overflow-wrap:anywhere' }, textOf(v)));
      body.append(MA.h('div.cfx-row', { style: 'padding:12px 14px;border-radius:var(--r2);box-shadow:inset 0 0 0 1px var(--line2)' }, MA.h('b', c.label),
        MA.h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:8px' }, col(MA.t('conflict.live'), c.theirs), col(MA.t('conflict.mine'), c.mine)), can ? acts : null));
      const settle = choice => { if (C.resolve(c.path, choice)) { acts.innerHTML = ''; acts.append(MA.h('span.small.muted', { html: MA.icon('check', 'sm') + ' ' + esc(MA.t(choice === 'theirs' ? 'conflict.tookTheirs' : 'conflict.keptMine')) })); } };
      acts.append(ui.btn(MA.t('conflict.keepMine'), { size: 'sm', kind: 'ghost', onclick: () => settle('mine') }), ui.btn(MA.t('conflict.takeTheirs'), { size: 'sm', onclick: () => settle('theirs') }));
    }
    const L = ui.modal({ title: esc(MA.t('conflict.title')), body, size: 'wide', actions: [
      can ? { label: MA.t('conflict.takeAll'), kind: 'ghost', run: () => { C.resolveAll('theirs'); } } : null,
      can ? { label: MA.t('conflict.keepAll'), kind: 'ghost', run: () => { C.resolveAll('mine'); } } : null,
      { label: MA.t('done'), kind: 'primary' }].filter(Boolean) });
    L.el.classList.add('cfx-modal');
    setTimeout(() => L.el.querySelector('.modal-foot .btn.primary')?.focus({ preventScroll: true }), 40); // start on Done, not on a bulk choice
    return L;
  }
  MA.content.review = openConflicts;
  /** The top-bar pill and the Publish button carry the tide-line mark: live (all published) · edited (changes waiting) · bad (not saved, site offline). */
  function updateStatus() {
    const pill = $('#statusPill'); if (!pill) return;
    const err = C.saveError, off = !C.draft, n = off ? 0 : C.changes().length;
    pill.classList.toggle('dirty', n > 0 && !err); pill.classList.toggle('unsaved', !!err);
    const txt = err ? MA.t('save.notSaved') : off ? MA.t(MA.site.pending ? 'loading' : 'site.offlineShort') : n ? MA.t('nChanges', { n, count: n }) : MA.t('allPublished');
    const mark = err || (off && !MA.site.pending) ? 'bad' : off ? 'draft' : n ? 'edited' : 'live';
    pill.dataset.state = mark;
    pill.innerHTML = `${tlSvg(mark)}<span class="txt">${esc(txt)}</span>`;
    if (err) pill.setAttribute('title', MA.t('save.full')); else pill.removeAttribute('title');
    const pb = $('#publishBtn');
    if (pb) { pb.disabled = !n || !MA.can('content.publish'); pb.classList.toggle('has-edits', n > 0); pb.querySelector('.tl')?.remove(); if (n > 0) pb.insertAdjacentHTML('beforeend', tlSvg('edited')); }
  }
  MA.updateStatus = updateStatus;
  function openPublish() { if (MA.publish?.open) MA.publish.open(); else MA.go('#/history?tab=publish'); }
  MA.openPublish = openPublish;
  function updateBell() { const b = $('#bellBtn'); if (!b) return; b.querySelector('.pip')?.remove(); const n = MA.notify.unread(); if (n) b.append(MA.h('span', { class: 'pip n' }, n > 9 ? MA.num(9) + '+' : MA.num(n))); }
  MA.on('notify', updateBell);
  function openBell(anchor) {
    const list = MA.notify.list().slice(0, 30);
    const box = MA.h('div', { style: 'width:360px' },
      MA.h('div.row.between', { style: 'padding:6px 8px 8px' }, MA.h('b.h4', MA.t('notifications')), list.some(n => !n.read) ? MA.h('button.btn.sm.ghost', { type: 'button', onclick: () => { MA.notify.read(); L.close(); } }, MA.t('markAllRead')) : null),
      list.length ? MA.h('div.list', list.map(n => { const tx = MA.notify.text(n); return MA.h(n.href ? 'a' : 'div', { class: 'list-item', href: n.href, style: 'align-items:flex-start', onclick: () => { MA.notify.read(n.id); L.close(); },
        html: `<span style="color:${n.tone === 'bad' ? 'var(--bad)' : n.tone === 'good' ? 'var(--good)' : 'var(--accent-text)'};margin-top:2px">${MA.icon(n.icon || 'bell', 'sm')}</span><span class="grow"><b style="font-weight:${n.read ? 500 : 700}">${esc(tx.title)}</b>${tx.text ? `<span class="small muted" style="display:block">${esc(tx.text)}</span>` : ''}<span class="tiny faint">${MA.ago(n.at)}</span></span>${n.read ? '' : '<span class="dot" style="background:var(--flare);margin-top:6px"></span>'}` }); }))
        : MA.h('div.empty', { style: 'padding:28px' }, MA.frag(MA.mira('arrive')), MA.h('p', MA.t('noNotifications'))));
    const L = ui.pop(anchor, box, { align: 'end' });
  }

  /* ---- global preview drawer ---- */
  MA.preview = {
    L: null,
    toggle() { if (MA.preview.L) { MA.preview.L.close(); return; } MA.preview.open(); },
    open(opts = {}) {
      if (MA.preview.L) return MA.preview.L;
      let fr;
      const L = ui.drawer({ title: MA.t('previewSite'), width: Math.min(1100, Math.round(innerWidth * .62)), modal: false, onClose: () => { fr?.destroy(); MA.preview.L = null; },
        render: body => { body.style.padding = '0'; body.style.display = 'flex'; fr = MA.site.frame({ ...opts }); fr.el.style.borderRadius = '0'; fr.el.style.flex = '1'; body.append(fr.el); } });
      L.frame = fr; MA.preview.L = L; return L;
    },
  };

  /* ---- shortcuts help ---- */
  function showShortcuts() {
    const grid = MA.h('div.shortcuts');
    if (prefs.singleKeys === false) grid.append(MA.h('p.hint.small', { style: 'grid-column:1/-1;margin-bottom:6px' }, MA.t('k.singleHint')));
    MA.keys.list().forEach(k => { const off = prefs.singleKeys === false && !/(mod|alt)\+/.test(k.key) && k.key !== 'escape';
      grid.append(MA.h('div', { class: off ? 'off' : null }, MA.h('span', typeof k.desc === 'function' ? k.desc() : k.desc), MA.h('span.keys', { html: k.key.split(' ').map(p => `<kbd>${esc(MA.keys.label(p))}</kbd>`).join(' ') }))); });
    ui.modal({ title: MA.t('shortcuts'), body: grid, size: 'wide', actions: [{ label: MA.t('cz.keys'), kind: 'ghost', icon: 'keyboard', run: () => { setTimeout(() => MA.customize('keyboard'), 30); } }, { label: MA.t('done'), kind: 'primary' }] });
  }
  MA.showShortcuts = showShortcuts;

  /* ---- customize drawer: every control is named by its row label; the sidebar order works with ↑/↓ as well as by drag ---- */
  MA.customize = (focusSection) => {
    ui.drawer({ title: MA.t('cz.title'), width: 460, render: (body, LD) => {
      const sec = (t, id, ...kids) => { const hid = MA.uid('czs'); return MA.h('section', { style: 'margin-bottom:26px', 'aria-labelledby': hid, dataset: { cz: id } }, MA.h('h3.label', { id: hid, style: 'margin-bottom:12px' }, t), ...kids); };
      /** row(label, control-maker(labelId, hintId), hint) */
      const row = (label, make, hint) => { const id = MA.uid('czr'), hid = hint ? id + '-h' : null; return MA.h('div.cz-row', MA.h('div.row.between', MA.h('span.h4', { id }, label), make(id, hid)), hint ? MA.h('p.hint.small.faint', { id: hid }, hint) : null); };
      const named = (el, id, hid) => { el.setAttribute('aria-labelledby', id); if (hid) el.setAttribute('aria-describedby', hid); return el; };
      const thumb = (bg, side, ink) => `<span class="thumb" aria-hidden="true" style="background:${bg}"><span style="width:28%;background:${side}"></span><span style="flex:1;padding:8px;display:flex;flex-direction:column;gap:5px"><i style="height:6px;width:60%;border-radius:3px;background:${ink};opacity:.7"></i><i style="height:6px;width:80%;border-radius:3px;background:${ink};opacity:.25"></i><i style="height:6px;width:40%;border-radius:3px;background:${ink};opacity:.25"></i></span></span>`;
      const themeId = MA.uid('czt'), themeGrid = MA.h('div.opt-grid', { role: 'group', 'aria-labelledby': themeId });
      // the System swatch is split in two (light | dark), not a gradient
      const themes = [['light', '#F4F0E7', '#0D0F2E', '#0D0F2E'], ['dark', '#0C0F2C', '#06081A', '#F2EADB'], ['system', 'linear-gradient(90deg,#F4F0E7 50%,#0C0F2C 50%)', '#0D0F2E', '#8098FD']];
      const themeBtns = themes.map(([v, bg, sd, ink]) => MA.h('button.opt', { type: 'button', dataset: { value: v }, onclick: () => { MA.prefs.set('theme', v); syncTheme(); }, html: thumb(bg, sd, ink) + `<span>${esc(MA.t('cz.' + v))}</span>` }));
      const syncTheme = () => themeBtns.forEach(b => b.setAttribute('aria-pressed', String(prefs.theme === b.dataset.value)));
      themeGrid.append(...themeBtns); syncTheme();
      const accId = MA.uid('cza'), dots = MA.h('div.accent-dots', { role: 'group', 'aria-labelledby': accId });
      const accents = [['tide', '#2B3BF0'], ['flare', '#FF5A23'], ['foam', '#1E9E6E'], ['deep', MA.isDark() ? '#F2EADB' : '#0D0F2E']];
      const dotBtns = accents.map(([v, c]) => MA.h('button', { type: 'button', style: `--c:${c}`, dataset: { value: v }, 'aria-label': MA.t('acc.' + v), 'data-tip': MA.t('acc.' + v), onclick: () => { MA.prefs.set('accent', v); syncDots(); } }));
      const syncDots = () => dotBtns.forEach(b => b.setAttribute('aria-pressed', String(prefs.accent === b.dataset.value)));
      dots.append(...dotBtns); syncDots();
      const segp = (k, opts, after) => (id, hid) => named(ui.seg(opts.map(([v, l]) => ({ value: v, label: l })), prefs[k], v => { MA.prefs.set(k, v); if (k === 'sidebar') renderShellBits(); after?.(v); }, { size: 'sm' }), id, hid);
      const sw = (k, after) => (id, hid) => ui.switch(prefs[k], v => { MA.prefs.set(k, v); after?.(v); }, '', { labelledby: id, describedby: hid });
      // sidebar items: reorder (drag, or the move button with ↑/↓) + hide
      const ne = MA.h('div.navedit', { role: 'list' });
      const moveNav = (id, d) => {
        const ids = orderedMods().map(m => m.id), i = ids.indexOf(id), j = i + d; if (i < 0 || j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]]; MA.prefs.set('navOrder', ids); drawNe(); renderNav();
        ne.querySelector(`.ne[data-id="${CSS.escape(id)}"] .drag-handle`)?.focus();
        MA.announce(MA.t('cz.moved', { name: MA.L(MODS.find(m => m.id === id)?.title), n: MA.num(j + 1) }));
      };
      const moveHint = MA.uid('czm');
      const drawNe = () => {
        ne.innerHTML = '';
        orderedMods().forEach(m => {
          const off = prefs.navHidden.includes(m.id), name = MA.L(m.title);
          const handle = MA.h('button.drag-handle', { type: 'button', 'aria-label': MA.t('cz.move', { name }), 'aria-describedby': moveHint, html: MA.icon('drag', 'sm'),
            onkeydown: e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); moveNav(m.id, e.key === 'ArrowUp' ? -1 : 1); } } });
          ne.append(MA.h('div', { class: 'ne' + (off ? ' off' : ''), role: 'listitem', dataset: { id: m.id } }, handle, MA.h('span', { html: MA.icon(m.icon, 'sm'), style: 'color:var(--ink3)' }), MA.h('span.grow', name),
            ui.iconBtn(off ? 'eyeOff' : 'eye', { tip: off ? MA.t('cz.show', { name }) : MA.t('cz.hide', { name }), size: 'sm', onclick: () => { const h = new Set(prefs.navHidden); off ? h.delete(m.id) : h.add(m.id); MA.prefs.set('navHidden', [...h]); drawNe(); renderNav(); ne.querySelector(`.ne[data-id="${CSS.escape(m.id)}"] .icon-btn`)?.focus(); } })));
        });
      };
      drawNe();
      const sortable = ui.sortable(ne, { item: '.ne', handle: '.drag-handle', onEnd: ids => { MA.prefs.set('navOrder', ids); renderNav(); } });
      // keyboard: bare-key shortcuts on/off, and remapping the global ones
      const keysBox = MA.h('div.cz-keys');
      const drawKeys = () => {
        keysBox.innerHTML = '';
        const seen = new Set(), list = KEYS.filter(k => k.core && k.desc && !seen.has(k.combo) && seen.add(k.combo));
        for (const k of list) {
          const eff = effective(k.combo), changed = eff !== k.combo, name = typeof k.desc === 'function' ? k.desc() : k.desc, lid = MA.uid('czk');
          const kb = MA.h('span.keys', { html: eff.split(' ').map(p => `<kbd>${esc(MA.keys.label(p))}</kbd>`).join(' ') });
          const btn = MA.h('button.btn.sm.ghost', { type: 'button', 'aria-describedby': lid }, MA.t('cz.change'));
          btn.onclick = () => {
            btn.textContent = MA.t('cz.pressKeys'); btn.classList.add('listening');
            const onKey = e => {
              if (['Shift', 'Alt', 'Meta', 'Control', 'CapsLock', 'Tab'].includes(e.key)) return;
              e.preventDefault(); e.stopPropagation(); removeEventListener('keydown', onKey, true); btn.removeEventListener('blur', stop);
              if (e.key === 'Escape') { drawKeys(); keysBox.querySelector(`[data-combo="${CSS.escape(k.combo)}"] .btn`)?.focus(); return; }
              const c = comboOf(e);
              if (!/[a-z0-9\[\]\/\\.,;'`=?-]$/.test(c.split('+').pop())) { MA.toast(MA.t('cz.keyInvalid'), { tone: 'bad' }); drawKeys(); return; }
              const clash = KEYS.find(x => x.desc && x.combo !== k.combo && effective(x.combo) === c);
              if (clash) { MA.toast(esc(MA.t('cz.keyTaken', { key: MA.keys.label(c), name: typeof clash.desc === 'function' ? clash.desc() : clash.desc })), { tone: 'bad' }); drawKeys(); keysBox.querySelector(`[data-combo="${CSS.escape(k.combo)}"] .btn`)?.focus(); return; }
              const before = prefs.keymap?.[k.combo] || null;
              MA.keys.remap(k.combo, c); drawKeys(); keysBox.querySelector(`[data-combo="${CSS.escape(k.combo)}"] .btn`)?.focus();
              MA.toast(esc(MA.t('cz.keySaved', { key: MA.keys.label(c) })), { undo: () => { MA.keys.remap(k.combo, before); drawKeys(); } });
            };
            const stop = () => { removeEventListener('keydown', onKey, true); drawKeys(); };
            addEventListener('keydown', onKey, true); btn.addEventListener('blur', stop, { once: true });
          };
          keysBox.append(MA.h('div.cz-key', { dataset: { combo: k.combo } }, MA.h('span.grow', { id: lid }, name), kb, btn,
            changed ? ui.iconBtn('undo', { tip: MA.t('cz.keyReset'), size: 'sm', onclick: () => { MA.keys.remap(k.combo, null); drawKeys(); } }) : null));
        }
      };
      drawKeys();
      body.append(
        MA.h('p.muted', { style: 'margin:-4px 0 22px' }, MA.t('cz.sub')),
        sec(MA.t('cz.appearance'), 'appearance',
          MA.h('div', { style: 'margin-bottom:16px' }, MA.h('p.h4', { id: themeId, style: 'margin-bottom:8px' }, MA.t('cz.theme')), themeGrid),
          MA.h('div.cz-row', MA.h('div.row.between', MA.h('span.h4', { id: accId }, MA.t('cz.accent')), dots)),
          row(MA.t('cz.density'), segp('density', [['comfortable', MA.t('cz.comfortable')], ['compact', MA.t('cz.compact')]])),
          row(MA.t('cz.text'), segp('scale', [['s', 'A'], ['m', '⁦A+⁩'], ['l', '⁦A++⁩']])), // isolated LTR, so RTL doesn't flip it to "+A"
          row(MA.t('cz.corners'), segp('corners', [['sharp', MA.t('cz.sharp')], ['soft', MA.t('cz.soft')], ['round', MA.t('cz.round')]]))),
        sec(MA.t('cz.layout'), 'layout',
          row(MA.t('cz.sidebar'), segp('sidebar', [['expanded', MA.t('cz.expanded')], ['collapsed', MA.t('cz.collapsed')]])),
          row(MA.t('cz.langs'), segp('langLayout', [['side', MA.t('cz.side')], ['stack', MA.t('cz.stack')]])),
          row(MA.t('cz.home'), (id, hid) => named(ui.select(orderedMods().map(m => ({ value: m.id, label: MA.L(m.title) })), prefs.home, v => MA.prefs.set('home', v), { cls: 'sm' }), id, hid)),
          MA.h('div', MA.h('p.h4', MA.t('cz.nav')), MA.h('p.hint.small.faint', { style: 'margin:2px 0 4px' }, MA.t('cz.navHint')), MA.h('p.hint.small.faint', { id: moveHint, style: 'margin:0 0 10px' }, MA.t('cz.moveHint')), ne)),
        sec(MA.t('cz.motion'), 'motion',
          row(MA.t('cz.motion'), segp('motion', [['system', MA.t('cz.system')], ['full', MA.t('cz.motionFull')], ['reduced', MA.t('cz.motionReduced')]])),
          row(MA.t('cz.ambient'), sw('ambient'), MA.t('cz.ambientHint'))),
        sec(MA.t('cz.keyboard'), 'keyboard',
          row(MA.t('k.single'), sw('singleKeys', () => drawKeys()), MA.t('k.singleHint')),
          MA.h('div', MA.h('p.h4', MA.t('cz.keys')), MA.h('p.hint.small.faint', { style: 'margin:2px 0 10px' }, MA.t('cz.keysHint')), keysBox)),
        sec(MA.t('cz.language'), 'language', (() => { const lid = MA.uid('czl'); const sg = ui.seg(MA.LANGS.map(L => ({ value: L.id, label: L.name })), prefs.lang, v => { MA.closeLayers(); setAdminLang(v); setTimeout(() => MA.customize(), 50); }, { labelledby: lid }); return MA.h('div', MA.h('span.sr-only', { id: lid }, MA.t('cz.language')), sg); })(),
          MA.h('div', { style: 'height:16px' }),
          MA.lang() === 'en' ? null : row(MA.t('cz.digits'), (id, hid) => named(ui.seg([{ value: 'auto', label: MA.t('cz.digitsAuto') }, { value: 'latn', label: '123' }, { value: 'native', label: MA.lang() === 'fa' ? '۱۲۳' : '١٢٣' }], prefs.digits, v => { MA.prefs.set('digits', v); MA.rerender(); }, { size: 'sm' }), id, hid)), // English has one digit system
          row(MA.t('cz.calendar'), (id, hid) => named(ui.seg([{ value: 'gregory', label: MA.t('cz.gregory') }, { value: 'persian', label: MA.t('cz.persian') }, { value: 'islamic-umalqura', label: MA.t('cz.hijri') }], prefs.calendar, v => { MA.prefs.set('calendar', v); MA.rerender(); }, { size: 'sm' }), id, hid), MA.t('cz.calendarHint'))),
        sec(MA.t('cz.data'), 'data', row(MA.t('cz.sample'), sw('sampleData', () => { MA.emit('sample'); MA.rerender(); renderNav(); }), MA.t('cz.sampleHint'))),
        MA.h('button.btn.ghost.danger', { type: 'button', onclick: async () => { if (await ui.confirm(MA.t('cz.reset'), '', { danger: true })) { MA.closeLayers(); MA.prefs.reset(); } } }, MA.t('cz.reset')));
      LD.sortable = sortable; LD.keepOnRerender = true;
      if (focusSection) setTimeout(() => { const x = body.querySelector(`[data-cz="${focusSection}"]`); x?.scrollIntoView({ block: 'start' }); focusables(x || body)[0]?.focus({ preventScroll: true }); }, 60);
    }, onClose: () => {} });
  };

  /* ---- built-in commands + shortcuts ---- */
  const CORE = { core: true }, CORE_G = { core: true, global: true };
  MA.keys.bind('mod+k', () => MA.palette.open(), () => MA.t('k.palette'), CORE_G);
  MA.keys.bind('/', () => MA.palette.open(), () => MA.t('k.palette'), CORE);
  MA.keys.bind('?', () => showShortcuts(), () => MA.t('k.help'), CORE);
  MA.keys.bind('[', () => toggleSidebar(), () => MA.t('k.sidebar'), CORE);
  // ⌘Z undoes the newest undo toast when nothing in the site copy was edited after it (a deleted brief, a moved card…), else the last edit
  MA.keys.bind('mod+z', () => { const at = MA.toast.undoAt(); if (at && at > C.editedAt()) MA.toast.undo(); else C.undo(); }, () => MA.t('k.undo'), CORE);
  MA.keys.bind('shift+mod+z', () => C.redo(), () => MA.t('k.redo'), CORE);
  MA.keys.bind('alt+z', () => { if (!MA.toast.undo()) MA.toast(MA.t('nothingToUndo')); }, () => MA.t('k.toastUndo'), CORE);
  /** ⌘S: a checkpoint, only for roles that can edit, and the toast only when it really saved. → the version or null */
  const checkpoint = () => {
    if (!MA.can('content.edit')) { MA.toast(MA.t('readOnly'), { tone: 'bad' }); return null; }
    const v = MA.versions.save({ kind: 'checkpoint' });
    if (!v) { MA.toast(MA.t('checkpointFailed'), { tone: 'bad', action: { label: MA.t('save.free'), run: () => MA.storage.free() } }); return null; }
    MA.activity.log({ action: 'checkpoint', module: 'history', href: '#/history' }); MA.toast(MA.t('checkpointSaved')); return v;
  };
  MA.checkpoint = checkpoint;
  MA.keys.bind('mod+s', () => { checkpoint(); }, () => MA.t('k.checkpoint'), CORE_G);
  MA.keys.bind('p', () => MA.preview.toggle(), () => MA.t('k.preview'), CORE);
  MA.keys.bind('shift+mod+p', () => openPublish(), () => MA.t('k.publish'), CORE_G);
  MA.keys.bind('shift+d', () => MA.prefs.set('theme', MA.isDark() ? 'light' : 'dark'), () => MA.t('k.theme'), CORE);
  MA.commands.add({ id: 'theme', title: { en: 'Toggle light / dark', ar: 'التبديل بين الفاتح والداكن', fa: 'تغییر روشن و تیره' }, icon: 'moon', keywords: 'dark light theme mode', run: () => MA.prefs.set('theme', MA.isDark() ? 'light' : 'dark') });
  MA.commands.add({ id: 'customize', title: { en: 'Customize the admin', ar: 'تخصيص لوحة الإدارة', fa: 'شخصی‌سازی پنل' }, icon: 'sliders', keywords: 'preferences appearance density accent sidebar', run: () => MA.customize() });
  MA.commands.add({ id: 'preview', title: { en: 'Preview the site', ar: 'معاينة الموقع', fa: 'پیش‌نمایش سایت' }, icon: 'eye', shortcut: 'p', run: () => MA.preview.open() });
  MA.commands.add({ id: 'publish', title: { en: 'Publish changes', ar: 'نشر التعديلات', fa: 'انتشار تغییرات' }, icon: 'publish', shortcut: 'shift+mod+p', run: () => openPublish() });
  MA.commands.add({ id: 'checkpoint', title: { en: 'Save a checkpoint', ar: 'حفظ نقطة استرجاع', fa: 'ذخیرهٔ نقطهٔ بازگشت' }, icon: 'flag', shortcut: 'mod+s', when: () => MA.can('content.edit') && !!C.draft, run: () => { checkpoint(); } });
  MA.LANGS.forEach(L => MA.commands.add({ id: 'lang-' + L.id, title: { en: `Admin language: ${L.name}`, ar: `لغة لوحة الإدارة: ${L.name}`, fa: `زبان پنل: ${L.name}` }, icon: 'language', keywords: 'language english arabic persian farsi rtl عربي فارسی', when: () => MA.lang() !== L.id, run: () => setAdminLang(L.id) }));
  MA.commands.add({ id: 'shortcuts', title: { en: 'Keyboard shortcuts', ar: 'اختصارات لوحة المفاتيح', fa: 'میان‌برهای صفحه‌کلید' }, icon: 'keyboard', shortcut: '?', run: () => showShortcuts() });
  MA.commands.add({ id: 'site', title: { en: 'Open the live site', ar: 'فتح الموقع', fa: 'باز کردن سایت' }, icon: 'external', run: () => open(SITE_URL, '_blank') });
  MA.commands.add({ id: 'undo', title: { en: 'Undo last site edit', ar: 'التراجع عن آخر تعديل', fa: 'واگرد آخرین ویرایش سایت' }, icon: 'undo', shortcut: 'mod+z', when: () => C.canUndo(), run: () => C.undo() });

  /* ================= tiny test helpers (used by tests/*.test.js, run headless) ================= */
  MA.test = (() => {
    let pass = 0, fail = 0;
    const log = (...a) => console.log(...a);
    return {
      wait: ms => new Promise(r => setTimeout(r, ms)),
      async until(fn, ms = 4000, label = 'condition') { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch (e) {} await new Promise(r => setTimeout(r, 50)); } log('TEST FAIL timeout: ' + label); fail++; return false; },
      ok(cond, msg) { if (cond) { pass++; log('TEST PASS ' + msg); } else { fail++; log('TEST FAIL ' + msg); } return !!cond; },
      eq(a, b, msg) { return MA.test.ok(MA.eq(a, b), msg + (MA.eq(a, b) ? '' : ` (got ${JSON.stringify(a)?.slice(0, 200)}, want ${JSON.stringify(b)?.slice(0, 200)})`)); },
      click(sel, root = document) { const el = typeof sel === 'string' ? root.querySelector(sel) : sel; if (!el) { fail++; log('TEST FAIL missing element ' + sel); return null; } el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.click(); return el; },
      type(sel, text, root = document) { const el = typeof sel === 'string' ? root.querySelector(sel) : sel; if (!el) { fail++; log('TEST FAIL missing input ' + sel); return null; } el.focus(); if (el.isContentEditable) el.innerHTML = text; else el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return el; },
      key(key, opts = {}, target = document.activeElement || document.body) { target.dispatchEvent(new KeyboardEvent('keydown', { key, code: opts.code || (key.length === 1 && /[a-z]/i.test(key) ? 'Key' + key.toUpperCase() : key), bubbles: true, ...opts })); },
      text: (sel, root = document) => (typeof sel === 'string' ? root.querySelector(sel) : sel)?.textContent?.trim() || '',
      done(name = '') { log(`TEST DONE ${name} pass=${pass} fail=${fail}`); return { pass, fail }; },
      errors: [],
    };
  })();
  // the harness only listens for page errors during a test run (?test=…)
  if (new URLSearchParams(location.search).has('test')) {
    addEventListener('error', e => { MA.test.errors.push(String(e.message)); console.log('TEST ERROR ' + e.message + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
    addEventListener('unhandledrejection', e => console.log('TEST ERROR (promise) ' + (e.reason?.message || e.reason)));
  }

  /* ================= boot ================= */
  addEventListener('scroll', () => $('#top')?.classList.toggle('scrolled', scrollY > 4), { passive: true }); // once; renderShell only builds DOM
  const skeleton = () => MA.frag(`<div class="stack" style="max-width:900px"><div class="skel" style="height:44px;width:40%"></div><div class="skel" style="height:18px;width:60%"></div><div class="grid c4" style="margin-top:24px">${'<div class="skel" style="height:120px"></div>'.repeat(4)}</div><div class="skel" style="height:260px;margin-top:16px"></div></div>`);
  /** A calm "time for a backup" notification, at most weekly, once there is real data and the admin is a week old. */
  function backupNudge() {
    if (!MA.db.get('installedAt', null)) MA.db.set('installedAt', new Date().toISOString());
    const s = MA.backup.status(), installed = Date.parse(MA.db.get('installedAt', '')) || Date.now(), last = +MA.db.get('backup.nudgedAt', 0) || 0;
    if (!s.due || Date.now() - installed < 7 * DAY_MS || Date.now() - last < 7 * DAY_MS) return;
    MA.db.set('backup.nudgedAt', Date.now());
    MA.notify.push({ key: 'notify.backup', textKey: s.at ? 'notify.backupLast' : 'notify.backupText', textVars: s.at ? { date: s.at } : undefined, icon: 'download', href: '#/settings/data' });
  }
  MA.commands.add({ id: 'conflicts', title: { en: 'Review what changed on the live site', ar: 'راجع ما تغيّر في الموقع المنشور', fa: 'بررسی تغییرات سایت منتشرشده' }, icon: 'refresh', when: () => !!C.draft && C.conflicts().length > 0, run: () => openConflicts() });
  MA.boot = async () => {
    const qs = new URLSearchParams(location.search);
    if (qs.get('test')) document.documentElement.classList.add('no-anim'); // headless screenshots show finished overlays
    try { localStorage.setItem('miras.admin', '1'); } catch (e) {} // lets the site keep a local event feed + brief copies on this browser
    applyPrefs();
    liveRegions();
    renderShell();
    const view = $('#view');
    view.innerHTML = ''; view.append(skeleton());
    MA.backup.persist(); // ask the browser to keep this data (no silent eviction)
    MA.site.pending = true;
    MA.site.handshake();
    // start from the last handshake this browser saw, and check the live site in the background
    const cached = qs.has('nocache') ? null : await Promise.race([MA.site.cached(), new Promise(r => setTimeout(() => r(null), 700))]);
    if (cached) { MA.site.source = 'cache'; MA.site.cachedAt = cached.at || null; if (!MA.site.info) MA.site.info = cached; C.init(cached); }
    booted = true;
    MA.emit('boot');
    renderNav(); renderMe(); updateStatus(); renderRibbon();
    route();
    MA.on('prefs', () => { renderRibbon(); updateStatus(); });
    MA.on('content:published', updateStatus);
    MA.on('site:error', () => renderRibbon());
    MA.site.ready.then(fresh => {
      MA.site.pending = false;
      const mod = current?.mod;
      if (fresh) {
        MA.site.source = 'live'; MA.site.cachedAt = null;
        if (!C.draft) {
          C.init(fresh); MA.emit('content:change', { path: '', by: 'init' });
          if (mod && !['inbox', 'team'].includes(mod.id)) MA.rerender();
        } else { const d = MA.hash(C.defaults); if (C.rebase(fresh) && MA.hash(C.defaults) !== d) MA.rerender(); }
      } else if (mod && !C.draft && needsSite(mod)) MA.rerender(); // show why the page can't open
      renderNav(); renderRibbon(); updateStatus();
    });
    setTimeout(backupNudge, 4000);
    // dev harness: admin/index.html?test=name loads tests/name.test.js after the first page renders
    const test = qs.get('test');
    // (after the site handshake settles, so a test never races the draft; at most 15 s)
    if (test && /^[\w-]+$/.test(test)) Promise.race([MA.site.ready, new Promise(r => setTimeout(r, 15000))]).then(() => setTimeout(() => document.body.append(MA.h('script', { src: `tests/${test}.test.js?${Date.now()}` })), 600));
  };
})();
