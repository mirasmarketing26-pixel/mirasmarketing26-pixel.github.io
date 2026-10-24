/* =====================================================================
   MIRAS admin — Client projects: the new-project wizard and the project workspace.
   The clients module routes here (portal/API.md; PortalAPI in portal/api.js, local or remote):
   · #/clients/projects/new                 the wizard, as a page (render)
   · #/clients/projects/<pid>[/<tab>]       the project workspace (render); tabs: overview (default), steps, approvals, comments, files, settings
   · MA.clientsProject.wizard({clientId?})  the same wizard as a full-screen dialog; resolves with the new project id, or null
   The wizard is two steps and nothing in it is required except the kind of project and the client:
     1. What kind of project? An icon grid of the templates (window.PORTAL_TEMPLATES, portal/templates.js). Choosing one goes straight on.
     2. The client (already chosen when it opens from a client page) and an optional title. "More options" folds away summary, owner, priority,
        dates and language. createProject adds the template's steps; they are changed on the project's Steps page.
   The Steps tab is a plain list (see ovSteps): one row per step (a status circle, the name, a count of its files), the files of an open step as small
   tiles with one status chip, one Edit panel per step and per file, and a "+" row to add a step or a file or link. Approved steps are folded.
   Editors (leads.edit) change things; viewers see the same text without buttons.
   Text that a person typed or the portal holds is shown as text, never as HTML, and carries its language.
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA;
  const t = (k, v) => MA.t('cp.' + k, v);
  const h = (...a) => MA.h(...a);
  const esc = MA.esc;
  const api = () => window.PortalAPI;
  const canEdit = () => MA.can('leads.edit');

  /* ---------- constants (the portal contract, portal/API.md) ---------- */
  const TPL_KEYS = ['video', 'social', 'brand', 'web', 'campaign', 'photo', 'blank'];
  const KINDS = ['image', 'video', 'post', 'document', 'link'];
  const PSTAT = ['planning', 'in_progress', 'review', 'live', 'done'];
  const STEP_ST = ['pending', 'in_progress', 'waiting', 'approved', 'changes'];
  const DEL_ST = ['draft', 'in_review', 'published'];
  const PRIO = ['low', 'normal', 'high'];
  const SERVICES = ['video', 'social', 'brand', 'web', 'campaign', 'photo', 'other'];
  const TABS = ['overview', 'steps', 'approvals', 'comments', 'files', 'settings'];
  const FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'application/pdf'];
  const FILE_ACCEPT = FILE_TYPES.join(',');
  const MAX_BYTES = 25 * 1024 * 1024;
  const MAX = { title: 200, summary: 1000, desc: 2000, reply: 2000, stages: 50, url: 2000, client: 120 };
  const TONE_STEP = { pending: 'outline', in_progress: 'info', waiting: 'warn', approved: 'good', changes: 'bad' };
  const TONE_DEL = { draft: 'outline', in_review: 'warn', approved: 'good', changes: 'bad', published: 'accent' };
  const TONE_PROJ = { planning: 'outline', in_progress: 'info', review: 'warn', live: 'good', done: 'accent' };
  const TONE_PRIO = { low: 'outline', normal: 'accent', high: 'flare' };
  const KICON = { image: 'image', video: 'play', post: 'note', document: 'file', link: 'link' };
  /**
   * The five step statuses as icons, drawn on the admin's 24 grid and registered once under cp- names (ui.menu looks icons up by name).
   * The shape says the state, the colour only adds to it: empty circle = pending, half = in progress, hourglass = waiting for the client,
   * check = approved, undo arrow = changes requested.
   */
  const ST_ICON = { pending: 'cp-st-pending', in_progress: 'cp-st-half', waiting: 'cp-st-wait', approved: 'cp-st-ok', changes: 'cp-st-undo' };
  Object.assign(MA.icons, {
    'cp-st-pending': '<circle cx="12" cy="12" r="8.5"/>',
    'cp-st-half': '<circle cx="12" cy="12" r="8.5"/><path class="f" d="M12 3.5a8.5 8.5 0 0 1 0 17z"/>',
    'cp-st-wait': '<path d="M7 3.5h10M7 20.5h10"/><path d="M8 3.5c0 4 2.4 6.2 4 8.5-1.6 2.3-4 4.5-4 8.5M16 3.5c0 4-2.4 6.2-4 8.5 1.6 2.3 4 4.5 4 8.5"/><path class="f" d="M10 19c.5-1.3 1.2-2 2-2.8.8.8 1.5 1.5 2 2.8z"/>',
    'cp-st-ok': '<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.4l2.7 2.7 5-5.6"/>',
    'cp-st-undo': '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  });
  const stIcon = (v, cls = '') => MA.icon(ST_ICON[v] || ST_ICON.pending, cls);
  /** The big icon of each template in the New project grid. */
  const TPL_ICON = { video: 'play', social: 'chat', brand: 'palette', web: 'globe', campaign: 'target', photo: 'image', blank: 'plus' };
  /** One icon on each tab of the project page. */
  const TAB_ICON = { overview: 'grid', steps: 'process', approvals: 'check', comments: 'chat', files: 'folder', settings: 'settings' };
  /** The first word of a title made for a project with no template, or the Blank one (portal/API.md, Simple creation). */
  const GENERIC_PROJECT = { en: 'Project', ar: 'مشروع' };
  /** A link or file name that is a picture (its address ends in an image extension). */
  const IMG_EXT = /\.(png|jpe?g|webp|gif|avif)(?:[?#]|$)/i;
  const ERR = { unauthorised: 'err.unauthorised', not_found: 'err.notFound', invalid: 'err.invalid', conflict: 'err.conflict' };
  /** A thumb for likes (turned over for dislikes). The icon set has none, so it is drawn here on the same 24 grid. */
  const THUMB = '<path d="M7.5 10.5V20h-3a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1z"/><path d="M7.5 10.5l3.2-6.2a1.7 1.7 0 0 1 3.2 1l-.7 3.7h5a2 2 0 0 1 2 2.4l-1.3 6a2.5 2.5 0 0 1-2.4 2.6H7.5"/>';
  const thumbIcon = down => `<svg class="i sm" viewBox="0 0 24 24" aria-hidden="true"${down ? ' style="transform:rotate(180deg)"' : ''}>${THUMB}</svg>`;

  /* ---------- small helpers ---------- */
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const dayOf = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const isDay = s => { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false; const y = +String(s).slice(0, 4); return y >= 2000 && y <= 2100 && ymd(dayOf(s)) === s; };
  const today = () => ymd(new Date());
  const dayTxt = s => (isDay(s) ? MA.date(dayOf(s)) : '');
  const stampTxt = iso => (iso ? MA.date(new Date(iso), { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
  const bytesTxt = n => (n ? (n < 1048576 ? t('size.kb', { n: Math.max(1, Math.round(n / 1024)) }) : t('size.mb', { n: +(n / 1048576).toFixed(1) })) : '—');
  const isHttps = u => /^https:\/\/\S+$/i.test(String(u || ''));
  const isWeb = u => /^https?:\/\/\S+$/i.test(String(u || ''));
  const linkText = u => { const s = String(u || ''); return s.length > 64 ? s.slice(0, 61) + '…' : s; };
  const clip = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const langOf = s => { try { return MA.langOf(s) || null; } catch (e) { return null; } };
  /** A client is shown as its name, else its company (the name or the company may be empty, never both). */
  const displayName = c => (c && (c.name || c.company)) || '';
  /** Text a person typed or the portal holds: shown as text, tagged with its language. */
  const U = text => h('span.cp-u', { lang: langOf(text), dir: 'auto' }, String(text ?? ''));
  const fail = e => MA.toast(esc(t(ERR[e && e.code] || 'err.server')), { tone: 'bad' });
  const stepLabel = s => t('stepSt.' + s);
  const delLabel = s => t('delSt.' + s);
  const projLabel = s => t('projSt.' + s);
  const prioLabel = s => t('prio.' + s);
  const kindLabel = k => t('kind.' + k);
  const svcLabel = s => (SERVICES.includes(s) ? t('svc.' + s) : String(s || ''));
  const tplByKey = key => (window.PORTAL_TEMPLATE_BY_KEY ? window.PORTAL_TEMPLATE_BY_KEY(key) : null);
  /** Template text is read in English or Arabic. Persian screens show the Arabic text (there is no Persian text yet). */
  const tplLang = () => (MA.lang() === 'en' ? 'en' : 'ar');
  const tplName = tp => h('span', { lang: tplLang(), dir: 'auto' }, tp.name[tplLang()] || tp.name.en);
  /** An icon button. disabled, and a data-k for focus after the page is redrawn. */
  const ib = (icon, tip, disabled, fn, k = '', cls = '') => {
    const b = MA.ui.iconBtn(icon, { tip, onclick: fn });
    if (disabled) b.disabled = true;
    if (k) b.dataset.k = k;
    if (cls) b.classList.add(cls);
    return b;
  };
  /** A quiet text button that switches something on or off: pressed (a mode) or expanded (a fold). */
  function toggle(label, { icon, pressed, expanded, onclick, k, act } = {}) {
    const b = h('button.cp-tog', { type: 'button', onclick, 'data-k': k || null, 'data-act': act || null,
      'aria-pressed': pressed == null ? null : String(!!pressed), 'aria-expanded': expanded == null ? null : String(!!expanded) });
    b.innerHTML = (icon ? MA.icon(icon, 'sm') : '') + '<span>' + esc(label) + '</span>';
    return b;
  }
  /** The one Edit action of a step or a file: a pencil. Its name says what it edits; its tooltip is the one word. */
  const editBtn = (name, fn, k) => {
    const b = ib('edit', t('editNamed', { name }), false, fn, k);
    b.dataset.tip = t('edit');
    return b;
  };
  /** A "+" row: a dashed circle with a plus, then one word. The full action is its accessible name ("Add file or link"). */
  const addRow = (k, word, name, fn, cls = '') => {
    const b = h('button', { type: 'button', class: 'cp-add ' + cls, 'data-k': k, 'aria-label': name, onclick: fn });
    b.innerHTML = '<span class="cp-add-i" aria-hidden="true">' + MA.icon('plus') + '</span><span>' + esc(word) + '</span>';
    return b;
  };
  /** Likes, dislikes and comments as small icon and number pairs. A pair at zero is left out unless all is true; comments null leaves that pair out. */
  function reactChips({ likes = 0, dislikes = 0, comments = null }, all = false) {
    const items = [['like', likes, thumbIcon(false), t('likes')], ['dislike', dislikes, thumbIcon(true), t('dislikes')]];
    if (comments != null) items.push(['comment', comments, MA.icon('chat', 'sm'), t('tabComments')]);
    const shown = items.filter(x => all || x[1] > 0);
    if (!shown.length) return null;
    return h('span.cp-reacts', shown.map(([k, n, svg, label]) => h('span', { class: 'cp-react is-' + k, title: label + ': ' + MA.num(n) },
      h('span.cp-react-i', { 'aria-hidden': 'true', html: svg }), h('span.cp-react-n', { 'aria-hidden': 'true' }, MA.num(n)), h('span.sr-only', label + ': ' + MA.num(n)))));
  }
  /** Marks a field's error (or clears it). field is the div.field from MA.ui.field. */
  function markErr(field, msg) {
    if (!field) return null;
    field.querySelector(':scope > .err')?.remove();
    const ctl = field.querySelector('input,select,textarea');
    if (ctl) { ctl.removeAttribute('aria-invalid'); }
    if (!msg) return null;
    const id = (ctl && ctl.id ? ctl.id : MA.uid('cpe')) + '-e';
    const p = h('p.err', { id }, msg);
    field.append(p);
    if (ctl) {
      ctl.setAttribute('aria-invalid', 'true');
      ctl.setAttribute('aria-describedby', [ctl.getAttribute('aria-describedby'), id].filter(Boolean).join(' '));
    }
    return p;
  }
  /** A block of optional fields behind a quiet "More options" toggle (used in dialogs). The block stays in the page, hidden, so what was typed is kept. */
  function fold(content, open) {
    content.hidden = !open;
    const tog = toggle(t('moreOptions'), { icon: 'chevDown', expanded: open, act: 'more', onclick: () => {
      content.hidden = !content.hidden;
      tog.setAttribute('aria-expanded', String(!content.hidden));
    } });
    return [tog, content];
  }
  const skeleton = () => h('div.stack', h('div.skel', { style: 'height:44px;width:40%' }), h('div.skel', { style: 'height:220px' }));
  const missingView = () => MA.ui.empty({ title: t('missing'), icon: 'folder', actions: [MA.ui.btn(t('backToClients'), { kind: 'primary', icon: 'arrowLeft', href: '#/clients' })] });
  const failedView = retry => MA.ui.empty({ title: t('loadFailed'), text: t('loadFailedText'), icon: 'warn', actions: [MA.ui.btn(t('retry'), { icon: 'refresh', kind: 'primary', onclick: retry })] });

  /* ---------- data (the team's view, from PortalAPI.admin) ---------- */
  const D = { clients: [], projects: [], events: {}, ready: false };   // events: the activity log of each project opened here (null: it could not be read)
  let seq = 0, applied = 0;
  /** The project on screen (its workspace), or null (the wizard page). Its activity log is read with the data. */
  const pidNow = () => (S && S.pid) || null;
  /** One project's activity log, newest first (portal/API.md, listEvents). null when it could not be read. */
  async function eventsOf(pid) {
    try { const r = await api().admin.listEvents(pid); return Array.isArray(r && r.events) ? r.events : []; } catch (e) { return null; }
  }
  /** Loads every client and every project (with stages, deliverables, approvals, reactions and comments), and the activity of the project on screen. A newer load wins. */
  async function loadAll() {
    const my = ++seq, pid = pidNow();
    const [clients, projects, events] = await Promise.all([api().admin.listClients(), api().admin.listProjects(), pid ? eventsOf(pid) : null]);
    if (my >= applied) { applied = my; D.clients = clients; D.projects = projects; D.ready = true; if (pid) D.events[pid] = events; }
    return D;
  }
  /** The team member's name for the activity log: their own name when they have one (the portal writes "You" otherwise). */
  function byName() {
    try { const m = MA.team.me(); const n = m && !m.unnamed && m.name ? String(m.name).trim().slice(0, 120) : ''; return n ? { byName: n } : {}; } catch (e) { return {}; }
  }
  const projectById = id => D.projects.find(p => p.id === id) || null;
  const clientById = id => D.clients.find(c => c.id === id) || null;
  const stepsOf = p => (p.steps || []).slice().sort((a, b) => a.position - b.position);
  const delivsOf = (p, stepId) => (p.deliverables || []).filter(d => d.stepId === stepId);
  const orderedDels = p => stepsOf(p).flatMap(s => delivsOf(p, s.id));
  const stageTitle = (p, stepId) => ((p.steps || []).find(s => s.id === stepId) || {}).title || '';
  /** Team names for the owner list. The current owner is kept even if they are not a team member any more. */
  const ownerOptions = current => {
    const names = [...new Set(MA.team.all().map(m => MA.team.display(m)).filter(Boolean))];
    if (current && !names.includes(current)) names.unshift(current);
    return [{ value: '', label: t('noOwner') }].concat(names.map(n => ({ value: n, label: n })));
  };
  const nextDue = p => {
    const c = [];
    if (p.dueDate && p.status !== 'done' && p.status !== 'live') c.push({ date: p.dueDate, what: null, key: 'dueProject' });
    stepsOf(p).forEach(s => { if (s.dueDate && s.status !== 'approved') c.push({ date: s.dueDate, what: s.title }); });
    (p.deliverables || []).forEach(d => { if (d.dueDate && d.status !== 'published' && d.status !== 'approved') c.push({ date: d.dueDate, what: d.title }); });
    c.sort((a, b) => a.date.localeCompare(b.date));
    return c[0] || null;
  };

  /* ---------- routing and mounting ---------- */
  let S = null;   // the workspace or wizard page on screen: { root, alive, pid, tab, panel, tabsEl, ctx, actAll, dl, dlTab, custom, open (stepId -> opened or folded by hand) }
  /** clients.js calls this for #/clients/projects/... . view is the page element; ctx.sub holds the path parts after 'clients'. */
  function render(view, ctx) {
    const sub = (ctx && ctx.sub) || [];
    const st = { root: h('div.m-clients-project'), alive: true, pid: null, tab: 'overview', panel: null, tabsEl: null, ctx: ctx || {}, apf: 'all', thread: null,
      actAll: false, dl: null, dlTab: false, custom: false, open: {} };
    if (S) S.alive = false;
    S = st;
    MA.cleanup(() => { st.alive = false; if (S === st) S = null; });
    view.append(st.root);
    if (sub[1] === 'new') { mountWizardPage(st); return; }
    st.pid = sub[1] || null;
    st.tab = TABS.includes(sub[2]) ? sub[2] : 'overview';
    // a review link (?deliverable=<id>) without a tab opens Steps, or Approvals when the deliverable waits for a decision (see mount)
    st.dl = linkedDel(ctx);
    st.dlTab = !!st.dl && !TABS.includes(sub[2]);
    st.root.replaceChildren(skeleton());
    mount(st);
  }

  async function mount(st) {
    try { await loadAll(); } catch (e) { if (st.alive) st.root.replaceChildren(failedView(() => { st.root.replaceChildren(skeleton()); mount(st); })); return; }
    if (!st.alive) return;
    const linked = st.dl ? ((projectById(st.pid) || {}).deliverables || []).find(x => x.id === st.dl) : null;
    if (st.dlTab) st.tab = linked && linked.status === 'in_review' ? 'approvals' : 'steps';
    if (linked) st.open[linked.stepId] = true;   // a review link's file is shown, even in a step that is folded by default
    paint(st, '');
    reveal(st);
  }

  /** The deliverable a review link names (?deliverable=<id>), or null. */
  function linkedDel(ctx) {
    const q = ctx && ctx.query;
    const id = q && typeof q.get === 'function' ? q.get('deliverable') : null;
    return id || null;
  }
  const HL_MS = 2600;   // how long a review link's deliverable stays highlighted
  /** Scrolls to the deliverable a review link named and highlights its row for a moment. Runs once per link. */
  function reveal(st) {
    const id = st.dl;
    st.dl = null; st.dlTab = false;
    if (!id || !st.panel) return;   // no link, or the project is not here (the missing-project page shows instead)
    const el = st.panel.querySelector('[data-id="' + CSS.escape(id) + '"]');
    if (!el) { MA.toast(esc(t('dlMissing'))); return; }
    el.tabIndex = -1;
    el.scrollIntoView({ block: 'center' });   // the page has just opened on this link, so it moves straight to the item
    el.focus({ preventScroll: true });
    el.classList.add('is-hl');
    setTimeout(() => el.classList.remove('is-hl'), HL_MS);
  }

  /** Draws the whole workspace from the loaded data. focusKey: a data-k to focus afterwards. */
  function paint(st, focusKey) {
    const p = st.pid ? projectById(st.pid) : null;
    if (!p) { st.root.replaceChildren(missingView()); return; }
    const c = clientById(p.clientId);
    st.panel = h('div.cp-panel');
    st.tabsEl = MA.ui.tabs(tabItems(p), st.tab, v => switchTab(st, v), { label: t('tabsLabel'), panel: st.panel });
    st.root.replaceChildren(headBlock(st, p, c), st.tabsEl, st.panel);
    fillPanel(st, p);
    try { MA.setCrumbs([...(c ? [{ label: displayName(c), href: '#/clients/' + c.id }] : []), { label: p.title }]); } catch (e) { /* crumbs are cosmetic */ }
    if (focusKey) focusData(st.root, focusKey);
  }

  function focusData(root, key) {
    const el = root.querySelector('[data-k="' + CSS.escape(key) + '"]');
    if (el && !el.disabled) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); }
  }

  /** Switches tab in place and keeps the address in step (no route change, so the page is not rebuilt). */
  function switchTab(st, v) {
    st.tab = v;
    try { history.replaceState(null, '', '#/clients/projects/' + st.pid + '/' + v); } catch (e) { /* address bar is cosmetic */ }
    const p = projectById(st.pid);
    if (p) fillPanel(st, p);
    st.tabsEl?.set(v);
  }

  function fillPanel(st, p) {
    const build = { overview: ovOverview, steps: ovSteps, approvals: ovApprovals, comments: ovComments, files: ovFiles, settings: ovSettings }[st.tab] || ovOverview;
    st.panel.replaceChildren(build(st, p));
    resolveFiles(st.panel);
  }

  /** Points every stored-file link at the file it names, and every picture at its image (local blob or remote file), once it is drawn. */
  function resolveFiles(root) {
    root.querySelectorAll('[data-file]').forEach(el => {
      Promise.resolve(api().fileUrl(el.dataset.file, { team: true })).then(u => {
        if (!el.isConnected) return;
        if (!u) { el.setAttribute('aria-disabled', 'true'); el.classList.add('is-off'); el.title = t('fileMissing'); return; }
        el.href = u;
      }).catch(() => {});
    });
    root.querySelectorAll('[data-src-file]').forEach(el => {
      Promise.resolve(api().fileUrl(el.dataset.srcFile, { team: true })).then(u => {
        if (!el.isConnected) return;
        if (!u) { pictureFailed(el); return; }
        el.src = u;
      }).catch(() => pictureFailed(el));
    });
  }

  /** A picture that cannot be shown: a thumbnail shows its icon; a larger view says the file is missing. */
  function pictureFailed(el) {
    if (!el.isConnected) return;
    const frame = el.closest('.cp-thumb');
    if (frame) { frame.classList.add('is-broken'); return; }
    el.replaceWith(h('p.muted', t('fileMissing')));
  }

  const tabItems = p => [
    { value: 'overview', label: t('tabOverview'), icon: TAB_ICON.overview },
    { value: 'steps', label: t('tabSteps'), icon: TAB_ICON.steps, count: MA.num(stepsOf(p).length) },
    { value: 'approvals', label: t('tabApprovals'), icon: TAB_ICON.approvals },
    { value: 'comments', label: t('tabComments'), icon: TAB_ICON.comments, count: (p.comments || []).length ? MA.num(p.comments.length) : null },
    { value: 'files', label: t('tabFiles'), icon: TAB_ICON.files },
    { value: 'settings', label: t('tabSettings'), icon: TAB_ICON.settings },
  ];

  /** The title, the way back to the client, and the few facts that are set (client, status; priority, due date and owner only when they have a value). */
  function headBlock(st, p, c) {
    const head = MA.ui.pageHead({
      title: esc(p.title),
      actions: [MA.ui.btn(t('openClient'), { href: c ? '#/clients/' + c.id : '#/clients', icon: 'user' })],
    });
    const facts = [
      metaItem(t('mClient'), c ? h('a.cp-link', { href: '#/clients/' + c.id }, U(displayName(c))) : h('span', t('unknownClient'))),
      metaItem(t('mStatus'), MA.ui.badge(projLabel(p.status), TONE_PROJ[p.status] || 'outline')),
    ];
    if (p.priority) facts.push(metaItem(t('mPriority'), MA.ui.badge(prioLabel(p.priority), TONE_PRIO[p.priority] || 'outline')));
    if (p.dueDate) facts.push(metaItem(t('mDue'), h('span', dayTxt(p.dueDate), ' ', overdueBadge(p.dueDate, p.status !== 'done' && p.status !== 'live'))));
    if (p.ownerName) facts.push(metaItem(t('mOwner'), U(p.ownerName)));
    return h('div.cp-head', head, h('dl.cp-meta', facts));
  }
  const metaItem = (label, value) => h('div.cp-meta-i', h('dt', label), h('dd', value));
  const overdueBadge = (date, open) => (open && isDay(date) && date < today() ? MA.ui.badge(t('overdue'), 'bad') : null);

  /* ---------- overview ---------- */
  function ovOverview(st, p) {
    const can = canEdit(), steps = stepsOf(p), dels = p.deliverables || [];
    const approved = steps.filter(s => s.status === 'approved').length;
    const waiting = dels.filter(d => d.status === 'in_review');
    const changes = dels.filter(d => d.status === 'changes');
    const next = steps.find(s => s.status !== 'approved') || null;
    const due = nextDue(p);
    const rows = [];
    if (!steps.length) rows.push(nextRow(t('nextNoStages'), can ? [addStageBtn(st, p)] : []));
    if (changes.length) rows.push(nextRow(t('nextChanges', { n: MA.num(changes.length) }), [goBtn(st, 'steps', 'openSteps')]));
    if (waiting.length) rows.push(nextRow(t('nextWaiting', { n: MA.num(waiting.length) }), [goBtn(st, 'approvals', 'openApprovals')]));
    if (next) rows.push(nextRow(h('span', t('nextStage') + ': ', U(next.title), ' ', MA.ui.badge(stepLabel(next.status), TONE_STEP[next.status] || 'outline')), [goBtn(st, 'steps', 'openStage')]));
    if (due) {
      rows.push(nextRow(h('span', t('nextDue') + ': ', dayTxt(due.date), ' ', overdueBadge(due.date, true), ' · ', due.what === null ? t('dueProject') : U(due.what)), [goBtn(st, 'steps', 'openSteps')]));
    }
    if (steps.length && !next) rows.push(nextRow(t('nextAllDone'), []));
    if (!rows.length) rows.push(nextRow(t('nextNone'), []));
    return h('div.cp-stack',
      h('section.cp-section', h('h2.h3', t('ovNext')), h('ol.cp-next', rows)),
      h('section.cp-section', h('h2.h3', t('ovProgress')), progressEl(approved, steps.length), feedbackEl(p)),
      h('section.cp-section', h('h2.h3', t('ovSummary')), summaryEl(st, p)),
      h('section.cp-section', h('h2.h3', t('ovActivity')), activityEl(st, p)));
  }
  const nextRow = (title, acts) => h('li.cp-next-row', h('div.cp-next-main', h('strong', title)), acts && acts.length ? h('div.btn-row', acts) : null);
  /** A button that opens another tab. Secondary (outline) unless it is the only action on the screen (primary). */
  const goBtn = (st, tab, key, primary = false) => MA.ui.btn(t(key), { size: 'sm', icon: 'arrowRight', kind: primary ? 'primary' : '', onclick: () => switchTab(st, tab) });
  const addStageBtn = (st, p) => { const b = MA.ui.btn(t('addStage'), { kind: 'primary', size: 'sm', icon: 'plus', onclick: () => stageModal(st, p, null) }); b.dataset.k = 'add-stage'; return b; };

  function progressEl(done, total) {
    const pct = total ? Math.round(done / total * 100) : 0;
    return h('div.cp-progress',
      h('div.cp-bar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(done), 'aria-label': t('ovProgress') },
        h('span', { style: 'inline-size:' + pct + '%' })),
      h('p.small', t('stagesApproved', { done: MA.num(done), total: MA.num(total) })));
  }

  /** What the client has said so far, as icons and numbers: likes, dislikes and comments. Nothing is drawn until there is something. */
  function feedbackEl(p) {
    const dels = p.deliverables || [];
    const likes = dels.reduce((n, d) => n + ((d.reactions && d.reactions.likes) || 0), 0);
    const dislikes = dels.reduce((n, d) => n + ((d.reactions && d.reactions.dislikes) || 0), 0);
    const chips = reactChips({ likes, dislikes, comments: (p.comments || []).length });
    return chips ? h('div.cp-feed', chips) : null;
  }

  function summaryEl(st, p) {
    if (p.summary) return h('p.cp-sumtext', U(p.summary));
    return h('div.cp-inline', h('p.muted', t('noSummary')), canEdit() ? MA.ui.btn(t('addSummary'), { size: 'sm', icon: 'plus', onclick: () => switchTab(st, 'settings') }) : null);
  }

  /* ---------- activity: comments, decisions and the team's changes (the activity log), newest first ---------- */
  const ACT_SHOWN = 20;   // the latest entries; "Show all" shows the rest
  /** Every entry the overview and the approvals tab list: comments, the client's decisions and the team's logged changes, newest first. */
  function activityItems(p) {
    const items = [];
    (p.comments || []).forEach(c => {
      const d = (p.deliverables || []).find(x => x.id === c.deliverableId);
      items.push({ at: c.createdAt, who: c.authorName, key: c.authorRole === 'client' ? 'actComment' : 'actReply', what: d ? d.title : t('threadProject'), body: c.body });
    });
    (p.deliverables || []).forEach(d => {
      if (d.approval) items.push({ at: d.approval.createdAt, who: d.approval.byName, key: d.approval.decision === 'changes' ? 'actChanges' : 'actApprove', what: d.title, body: d.approval.note, full: true });
    });
    (D.events[p.id] || []).forEach(e => items.push({ at: e.createdAt, ev: e }));
    items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    return items;
  }
  /** A sentence from a translated template: each {name} is replaced by its value (text or a node), and the rest stays text. */
  function words(key, vals) {
    const tpl = t(key), out = [];
    let last = 0;
    tpl.replace(/\{(\w+)\}/g, (mark, name, at) => {
      if (at > last) out.push(tpl.slice(last, at));
      out.push(name in vals ? vals[name] : mark);
      last = at + mark.length;
      return mark;
    });
    if (last < tpl.length) out.push(tpl.slice(last));
    return out;
  }
  /** A status word for the kind of item it belongs to ('in review' reads "In review"). Anything else is shown as it came. */
  function statusWord(kind, v) {
    const key = String(v).trim().replace(/ /g, '_');
    if (kind === 'project' && PSTAT.includes(key)) return projLabel(key);
    if (kind === 'step' && STEP_ST.includes(key)) return stepLabel(key);
    if (kind === 'deliverable' && DEL_ST.concat(['approved', 'changes']).includes(key)) return delLabel(key);
    return String(v);
  }
  /** The title of the item an entry is about (a stage, a deliverable or the project), or null when it has been deleted since. */
  function itemOf(p, e) {
    const list = e.kind === 'step' ? (p.steps || []) : e.kind === 'project' ? [p] : (p.deliverables || []);
    const x = list.find(y => y.id === e.subjectId);
    return x ? x.title : null;
  }
  /** Who made a change, as the log names them: the team member's name, or "You" when none was recorded. */
  const evWho = e => (!e.byName || e.byName === 'You' ? t('ev.you') : e.byName);
  const EV_FILE = { added: 'Added', replaced: 'Replaced', removed: 'Removed' };
  /**
   * What one entry says, in the admin's language. The portal writes each change in English (portal/API.md, Activity log), and it is read
   * back here into its parts. A change in a form this admin does not know is shown as it was written.
   */
  function eventWords(p, e) {
    const ch = String(e.change || '');
    const itemTitle = itemOf(p, e);
    const item = itemTitle != null ? U(itemTitle) : h('span.muted', t('ev.gone'));
    const named = v => (v === 'none' ? t('none') : U(v));
    const dated = v => (v === 'none' ? t('none') : isDay(v) ? dayTxt(v) : String(v));
    let m;
    if ((m = /^Status: (.*?) → (.*)$/.exec(ch))) {
      const from = statusWord(e.kind, m[1]), to = statusWord(e.kind, m[2]);
      return e.kind === 'project' ? words('ev.projStatus', { from, to }) : words('ev.status', { item, from, to });
    }
    if ((m = /^Due date: (.*?) → (.*)$/.exec(ch))) return words('ev.due', { item, from: dated(m[1]), to: dated(m[2]) });
    if ((m = /^Owner: (.*?) → (.*)$/.exec(ch))) return words('ev.owner', { item, from: named(m[1]), to: named(m[2]) });
    if ((m = /^File name: (.*?) → (.*)$/.exec(ch))) return words('ev.fileName', { item, from: named(m[1]), to: named(m[2]) });
    if ((m = /^(File|Link) (added|replaced|removed): (.*)$/.exec(ch))) return words('ev.' + m[1].toLowerCase() + EV_FILE[m[2]], { name: U(m[3]), item });
    return words('ev.raw', { change: U(ch) });
  }
  /** One entry of the activity list: who, what, and when. Names and file names are shown as text, each with its language. */
  function actRow(p, x) {
    if (x.ev) {
      return h('li', h('p', U(evWho(x.ev)), ' ', ...eventWords(p, x.ev)), h('p.tiny.muted', h('time', { datetime: x.at }, stampTxt(x.at))));
    }
    // a decision's note is shown in full (the client's change request); a comment is cut to a line or two here
    return h('li',
      h('p', U(x.who || ''), ' ', t(x.key), ' ', U(x.what)),
      x.body ? (x.full ? h('p.cp-said', U(x.body)) : h('p.small.muted', U(clip(x.body, 160)))) : null,
      h('p.tiny.muted', h('time', { datetime: x.at }, stampTxt(x.at))));
  }
  /**
   * The activity list. It holds the latest 20 entries; "Show all" shows the rest, and "Show fewer" folds them again.
   * If the log could not be read, the list says so and offers to try again.
   */
  function activityEl(st, p) {
    const failed = D.events[p.id] === null;
    const all = activityItems(p);
    const retry = failed ? MA.ui.btn(t('retry'), { size: 'sm', icon: 'refresh', onclick: () => retryEvents(st) }) : null;
    if (retry) retry.dataset.k = 'act-retry';
    const note = failed ? h('div.btn-row', h('p.small.muted', t('actFailed')), retry) : null;
    if (!all.length) return h('div.cp-stack', failed ? note : h('p.muted', t('actNone')));
    const shown = st.actAll ? all : all.slice(0, ACT_SHOWN);
    const more = all.length > ACT_SHOWN ? MA.ui.btn(st.actAll ? t('actLess') : t('actAll', { n: all.length }), { size: 'sm', onclick: () => toggleAll(st, p) }) : null;
    if (more) { more.dataset.k = 'act-toggle'; more.setAttribute('aria-expanded', String(st.actAll)); }
    return h('div.cp-stack', h('ol.cp-activity', shown.map(x => actRow(p, x))), more ? h('div.btn-row.cp-act-more', more) : null, note);
  }
  /** Shows every entry of the activity list, or folds it back to the latest 20. Focus stays on the control. */
  function toggleAll(st, p) {
    st.actAll = !st.actAll;
    fillPanel(st, projectById(st.pid) || p);
    focusData(st.panel, 'act-toggle');
  }
  /** Reads the project again after its activity log failed to load, then draws the page. */
  async function retryEvents(st) {
    try { await loadAll(); } catch (e) { fail(e); }
    if (!st.alive) return;
    paint(st, '');
    const tab = st.root.querySelector('[role="tab"][aria-selected="true"]');
    if (tab) tab.focus({ preventScroll: true });
  }

  /* ---------- thumbnails: a fixed frame with the picture (or a video's poster); the larger view opens in a dialog ---------- */
  /** The picture a deliverable shows: its image (an uploaded picture, or a link to one), or a video's poster. null when it has none. */
  function pictureOf(d) {
    if (d.kind === 'video') return d.posterUrl || null;
    if (!d.url) return null;
    return (d.kind === 'image' || d.kind === 'post' || IMG_EXT.test(String(d.fileName || d.url))) ? d.url : null;
  }

  /**
   * The thumbnail frame of a deliverable: size 'tile' (the full width of its tile on the Steps page) or 'sm' (64px, in the tables).
   * With a picture it is a button that opens the larger view, and its <img> carries the deliverable's title as alt text.
   * Without one it is a plain tile with the kind's icon, so tiles still line up; on the Steps page a file or link with no picture
   * makes that tile an Open link (a new tab), so a document or a link is one click away.
   */
  function thumb(d, size = 'tile') {
    const pic = pictureOf(d), video = d.kind === 'video';
    const cls = 'cp-thumb' + (size === 'sm' ? ' sm' : size === 'tile' ? ' tile' : '') + (video ? ' is-video' : '');
    const ph = h('span.cp-thumb-ph', { 'aria-hidden': 'true', html: MA.icon(KICON[d.kind] || 'file') });
    if (!pic) {
      if (size === 'tile' && d.url) {
        const open = t('openNamed', { name: d.title });
        return isWeb(d.url)
          ? h('a', { class: cls + ' is-empty is-link', href: d.url, target: '_blank', rel: 'noopener', 'aria-label': open }, ph)
          : h('a', { class: cls + ' is-empty is-link', href: '#', 'data-file': d.url, target: '_blank', rel: 'noopener', 'aria-label': open }, ph);
      }
      return h('span', { class: cls + ' is-empty', 'aria-hidden': 'true' }, ph);
    }
    const img = h('img.cp-thumb-img', { alt: d.title, decoding: 'async', 'data-src-file': pic });
    img.addEventListener('error', () => pictureFailed(img));
    // a video's play label: the word on a regular frame, the icon alone on a small one
    const play = video ? h('span.cp-play', { 'aria-hidden': 'true' }, h('span', { html: MA.icon('play') }), size === 'sm' ? null : h('span', t('playLabel'))) : null;
    return h('button', { type: 'button', class: cls, 'aria-label': t('viewLarger', { name: d.title }), onclick: () => viewLarger(d, pic) }, ph, img, play);
  }

  /** The picture at a larger size, in a dialog. The file itself opens in a new tab, when there is one. */
  function viewLarger(d, pic) {
    const img = h('img.cp-lb-img', { alt: d.title, decoding: 'async', 'data-src-file': pic });
    img.addEventListener('error', () => pictureFailed(img));
    const open = !d.url ? null : isWeb(d.url)
      ? h('a.cp-link', { href: d.url, target: '_blank', rel: 'noopener' }, t('dlOpen'))
      : h('a.cp-link', { href: '#', 'data-file': d.url, target: '_blank', rel: 'noopener' }, t('dlOpen'));
    const L = MA.ui.modal({
      title: esc(d.title),
      size: 'wide',
      body: el => el.append(h('figure.cp-lb', img,
        d.kind === 'video' ? h('figcaption.small.muted', t('posterNote')) : (d.description ? h('figcaption.small.muted', U(d.description)) : null),
        open ? h('p.small.cp-lb-open', open) : null)),
    });
    L.el.classList.add('cp-dlg');
    resolveFiles(L.el);
  }

  /* ---------- steps and deliverables ---------- */
  /** Is this step open? A step the team opened or folded by hand stays as they left it. Otherwise only the first step that is not approved is open. */
  const firstToDo = p => { const s = stepsOf(p).find(x => x.status !== 'approved'); return s ? s.id : null; };
  const isOpen = (st, p, s) => (s.id in st.open ? !!st.open[s.id] : firstToDo(p) === s.id);

  /**
   * The Steps tab: a plain list. One row per step: a status circle, the name, and how many files it holds. Click the circle to change the
   * status; click the name to open the step's files, which show as small tiles. Everything else about a step or a file (owner, due date,
   * description, version, the file or link, delete) is behind its one Edit button. A "+" row at the end of the list adds a step, and one at
   * the end of an open step adds a file or link. "Reorder" shows the handles and the move buttons; Alt with the arrow keys works on any row.
   */
  function ovSteps(st, p) {
    const can = canEdit(), steps = stepsOf(p), custom = can && st.custom && steps.length > 1;
    if (!steps.length) {
      return h('div.cp-stack', MA.ui.empty({ title: t('noStages'), icon: 'process', compact: true, actions: can ? [addStageBtn(st, p)] : [] }));
    }
    const tog = can && steps.length > 1 ? toggle(t('reorder'), { icon: 'sort', pressed: custom, act: 'reorder', k: 'reorder', onclick: () => {
      st.custom = !st.custom;
      fillPanel(st, projectById(st.pid) || p);
      focusData(st.panel, 'reorder');
    } }) : null;
    const list = h('ol.cp-stages', { 'aria-label': t('stagesList') });
    steps.forEach((s, i) => list.append(stageRow(st, p, s, i, steps.length, can, custom)));
    if (custom) MA.ui.sortable(list, { item: '.cp-stage', handle: '.cp-grip', onEnd: ids => reorder(st, p, ids, '') });
    return h('div.cp-stack', tog ? h('div.cp-toolbar', tog) : null, list,
      can ? addRow('add-stage', t('plusStep'), t('addStage'), () => stageModal(st, p, null), 'is-step') : null);
  }

  /** Opens a small menu of statuses under a button, with the current one marked and focused (so Enter keeps it and the arrows move from it). */
  function statusMenu(anchor, items, label) {
    const L = MA.ui.menu(anchor, items, { label });
    const cur = L && L.el && L.el.querySelector('[aria-checked="true"]');
    if (cur) cur.focus({ preventScroll: true });
    return L;
  }

  /** The status circle of a step. Editors get a button that opens the five statuses; others get the icon alone, named for a screen reader. */
  function statusCircle(st, p, s, can) {
    const word = stepLabel(s.status);
    const name = t('statusOf', { name: s.title, status: word });
    if (!can) return h('span', { class: 'cp-circle is-static', 'data-st': s.status, role: 'img', 'aria-label': name, title: word, html: stIcon(s.status) });
    const b = h('button', { type: 'button', class: 'cp-circle', 'data-st': s.status, 'data-k': 'status-' + s.id, 'aria-label': name, 'data-tip': word, 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      html: stIcon(s.status), onclick: () => statusMenu(b, STEP_ST.map(v => ({ label: stepLabel(v), icon: ST_ICON[v], checked: v === s.status, run: () => setStepStatus(st, p, s, v) })), t('stageStatus')) });
    return b;
  }

  function stageRow(st, p, s, i, n, can, custom) {
    const dels = delivsOf(p, s.id);
    const open = isOpen(st, p, s);
    const bodyId = 'cp-body-' + s.id;
    const count = dels.length
      ? [h('span.cp-count', { 'aria-hidden': 'true', html: MA.icon('file', 'sm') + '<span>' + esc(MA.num(dels.length)) + '</span>' }), h('span.sr-only', t('nFiles', { count: dels.length, n: dels.length }))]
      : null;
    const nameBtn = h('button', { type: 'button', class: 'cp-stage-btn', 'aria-expanded': String(open), 'aria-controls': bodyId, 'data-k': 'name-' + s.id, onclick: () => toggleStage(st, s.id) },
      h('span.cp-stage-title', U(s.title)), count, h('span.cp-chev', { 'aria-hidden': 'true', html: MA.icon('chevDown', 'sm') }));
    // MA.h prints a child string as text, so an icon (markup) goes in through html:
    const grip = custom ? h('button.cp-grip', { type: 'button', 'aria-label': t('dragStage'), title: t('dragStage'), 'data-k': 'grip-' + s.id, html: MA.icon('drag') }) : null;
    const acts = can ? h('div.cp-row-acts',
      custom ? ib('chevUp', t('moveUp'), i === 0, () => moveStage(st, p, s, -1), 'up-' + s.id) : null,
      custom ? ib('chevDown', t('moveDown'), i === n - 1, () => moveStage(st, p, s, 1), 'down-' + s.id) : null,
      editBtn(s.title, () => stageModal(st, p, s), 'edit-' + s.id)) : null;
    const sec = h('li.cp-stage', { dataset: { id: s.id }, 'data-open': String(open) },
      h('div.cp-stage-head', grip, statusCircle(st, p, s, can), h('h3.cp-stage-h', nameBtn), acts),
      h('div.cp-stage-body', { id: bodyId, hidden: !open }, open ? stageBody(st, p, s, dels, can) : null));
    if (can) {
      // Alt + Up or Down on any control of the row moves the step (the handles and buttons only show with Reorder)
      sec.addEventListener('keydown', e => {
        if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || !e.target.closest('.cp-stage-head')) return;
        e.preventDefault();
        moveStage(st, p, s, e.key === 'ArrowUp' ? -1 : 1);
      });
    }
    return sec;
  }

  /** What an open step holds: its files as tiles, then the "+" row. A step with no files shows just the "+" row (viewers see a quiet line). */
  function stageBody(st, p, s, dels, can) {
    return [
      dels.length ? h('ul.cp-dgrid', { 'aria-label': s.title }, dels.map(d => delivTile(st, p, s, d, can))) : (can ? null : h('p.cp-d-none', t('dlEmpty'))),
      can ? addRow('adddl-' + s.id, t('plusFile'), t('addFile'), () => deliverableModal(st, p, s, null)) : null,
    ];
  }

  /** Opens or folds one step in place (the page is not redrawn). Focus stays on its name. */
  function toggleStage(st, id) {
    const p = projectById(st.pid);
    if (!p) return;
    const steps = stepsOf(p), i = steps.findIndex(x => x.id === id);
    if (i < 0) return;
    st.open[id] = !isOpen(st, p, steps[i]);
    const old = st.panel.querySelector('.cp-stage[data-id="' + CSS.escape(id) + '"]');
    if (!old) return;
    const can = canEdit(), fresh = stageRow(st, p, steps[i], i, steps.length, can, can && st.custom && steps.length > 1);
    old.replaceWith(fresh);
    resolveFiles(fresh);
    focusData(fresh, 'name-' + id);
  }

  /** The chip of a file's status. Short: "Changes" for a change request. */
  const chipLabel = v => (v === 'changes' ? t('chipChanges') : delLabel(v));

  /** One file or link, as a small tile: its picture (or the kind's icon), its name, one status chip and the Edit button. What the client said (likes, dislikes, comments) shows only once there is something. */
  function delivTile(st, p, s, d, can) {
    const r = d.reactions || {};
    const comments = (p.comments || []).filter(c => c.deliverableId === d.id).length;
    const feel = reactChips({ likes: r.likes || 0, dislikes: r.dislikes || 0, comments });
    return h('li.cp-d', { dataset: { id: d.id }, 'data-st': d.status },
      thumb(d, 'tile'),
      h('strong.cp-d-title', U(d.title)),
      feel ? h('div.cp-d-feel', feel) : null,
      h('div.cp-d-foot', delChip(st, p, d, can), can ? editBtn(d.title, () => deliverableModal(st, p, s, d), 'edit-' + d.id) : null));
  }

  /** The status chip of a file: a word with a dot. Editors can open the three statuses the team sets (the client's approval and change request are shown, not set here). */
  function delChip(st, p, d, can) {
    const tone = TONE_DEL[d.status] || 'outline', label = chipLabel(d.status);
    if (!can) return MA.ui.badge(label, tone);
    const b = h('button', { type: 'button', class: 'badge cp-dchip ' + tone, 'data-k': 'dstatus-' + d.id, 'aria-label': t('statusOf', { name: d.title, status: label }), 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      html: '<span>' + esc(label) + '</span>' + MA.icon('chevDown', 'sm'),
      onclick: () => {
        const opts = DEL_ST.concat(d.status === 'approved' || d.status === 'changes' ? [d.status] : []);
        statusMenu(b, opts.map(v => ({ label: chipLabel(v), checked: v === d.status, run: () => setDelStatus(st, p, d, v) })), t('dlStatus'));
      } });
    return b;
  }

  /** The file or link of a file, as a link (Edit shows it; the Files tab lists them all). */
  function fileInfo(d) {
    if (!d.url) return h('span.muted', t('dlNoFile'));
    const size = d.fileSize ? h('span.muted', ' · ', bytesTxt(d.fileSize)) : null;
    if (isWeb(d.url)) return h('span', h('a.cp-link', { href: d.url, target: '_blank', rel: 'noopener' }, U(d.fileName || linkText(d.url))), size);
    return h('span', h('a.cp-link', { href: '#', 'data-file': d.url, target: '_blank', rel: 'noopener' }, U(d.fileName || d.title)), size);
  }

  /* ---------- approvals ---------- */
  function ovApprovals(st, p) {
    const all = orderedDels(p);
    // the team's changes sit under the decisions, in the same list as the comments and decisions (the overview's list)
    const log = h('section.cp-section', h('h2.h3', t('ovActivity')), activityEl(st, p));
    if (!all.length) {
      return h('div.cp-stack', MA.ui.empty({ title: t('apEmpty'), icon: 'flag', compact: true, actions: canEdit() ? [goBtn(st, 'steps', 'openSteps', true)] : [] }), log);
    }
    const f = st.apf || 'all';
    const seg = MA.ui.seg([
      { value: 'all', label: t('apAll') }, { value: 'waiting', label: t('apWaiting') }, { value: 'approved', label: t('apApproved') },
      { value: 'changes', label: t('apChanges') }, { value: 'none', label: t('apNotSent') },
    ], f, v => { st.apf = v; fillPanel(st, projectById(st.pid)); }, { label: t('apFilter') });
    const match = d => f === 'all' || (f === 'waiting' && d.status === 'in_review') || (f === 'approved' && d.status === 'approved')
      || (f === 'changes' && d.status === 'changes') || (f === 'none' && !['in_review', 'approved', 'changes'].includes(d.status));
    const rows = all.filter(match);
    const body = rows.length
      ? h('div.table-wrap', h('table.table.cp-table',
          h('thead', h('tr', th(t('colDeliv')), th(t('colDecision')), th(t('colBy')), th(t('colTime')), th(t('colReact')))),
          h('tbody', rows.map(d => apRow(p, d)))))
      : h('p.muted', t('apNone'));
    return h('div.cp-stack', seg, body, log);
  }
  const th = (text) => h('th', { scope: 'col' }, text);
  const dash = () => h('span.muted', '—');
  /** One deliverable's latest decision. The client's note sits under the decision, in plain text, in full. */
  function apRow(p, d) {
    const ap = d.approval;
    const r = d.reactions || { likes: 0, dislikes: 0 };
    const note = ap && ap.note ? h('p.cp-said', U(ap.note)) : null;
    return h('tr', { dataset: { id: d.id } },
      h('td', h('div.cp-deliv', thumb(d, 'sm'), h('div.cp-deliv-txt', h('strong', U(d.title)), h('div.tiny.muted', U(stageTitle(p, d.stepId)))))),
      h('td', decisionBadge(d), note),
      h('td', ap ? U(ap.byName) : dash()),
      h('td', ap ? stampTxt(ap.createdAt) : dash()),
      h('td', reactChips({ likes: r.likes || 0, dislikes: r.dislikes || 0 }, true)));
  }
  function decisionBadge(d) {
    const map = { approved: ['dcApproved', 'good'], changes: ['dcChanges', 'bad'], in_review: ['dcWaiting', 'warn'], published: ['delSt.published', 'good'] };
    const m = map[d.status];
    return m ? MA.ui.badge(t(m[0]), m[1]) : MA.ui.badge(t('dcNotSent'), 'outline');
  }

  /* ---------- comments: every thread in a list (the project, then each deliverable, with counts); the chosen one beside it ---------- */
  /**
   * Every thread of the project, in the order the team needs: threads with a client message first (the latest client message first),
   * then the others by their latest message, then the empty ones in project order. The first one is the thread the tab opens on.
   */
  function threadsOf(p) {
    const comments = (p.comments || []).slice().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    const base = [{ id: 'project', title: t('threadProject'), meta: '' }]
      .concat(orderedDels(p).map(d => ({ id: d.id, title: d.title, meta: stageTitle(p, d.stepId) })));
    const rows = base.map(x => {
      const msgs = comments.filter(c => (x.id === 'project' ? !c.deliverableId : c.deliverableId === x.id));
      const last = msgs[msgs.length - 1] || null;
      const lastClient = msgs.filter(c => c.authorRole === 'client').pop() || null;
      return { ...x, msgs, last: last ? last.createdAt : null, lastClient: lastClient ? lastClient.createdAt : null, needsReply: !!last && last.authorRole === 'client' };
    });
    const rank = r => (r.lastClient ? 2 : r.last ? 1 : 0);
    const when = r => String(r.lastClient || r.last || '');
    return rows.sort((a, b) => rank(b) - rank(a) || when(b).localeCompare(when(a)));
  }

  /** The comments tab. Opens on the first thread (the latest client message), so the messages show without a choice. */
  function ovComments(st, p) {
    const can = canEdit();
    const threads = threadsOf(p);
    const cur = threads.find(x => x.id === st.thread) || threads[0];
    st.thread = cur.id;
    const list = h('ul.cp-th-list', { 'aria-label': t('threadsList') }, threads.map(x => h('li', threadBtn(st, p, x, x.id === cur.id))));
    const body = cur.msgs.length
      ? h('ol.cp-thread', { 'aria-label': cur.title }, cur.msgs.map(msgRow))
      : MA.ui.empty({ title: t('cmEmpty'), icon: 'chat', compact: true });
    return h('div.cp-cm', list,
      h('section.cp-cm-main',
        h('h3.h3.cp-cm-title', U(cur.title)),
        cur.meta ? h('p.small', U(cur.meta)) : null,
        body,
        can ? replyForm(st, p, cur.id) : h('p.muted', t('readOnlyNote'))));
  }

  /** One thread in the list: its name, its stage, its count, and a mark when the client wrote last. */
  function threadBtn(st, p, x, on) {
    const n = x.msgs.length;
    return h('button.cp-th', {
      type: 'button', 'aria-current': on ? 'true' : null, dataset: { k: 'th-' + x.id },
      onclick: () => selectThread(st, p, x.id),
    },
      h('span.cp-th-title', U(x.title)),
      x.meta ? h('span.cp-th-meta', U(x.meta)) : null,
      h('span.cp-th-count', t('nComments', { count: n, n }), x.needsReply ? MA.ui.badge(t('thNeedsReply'), 'warn') : null));
  }

  /** Opens another thread in place: its messages and reply box change, the page does not reload. Focus stays on the thread it chose. */
  function selectThread(st, p, id) {
    st.thread = id;
    fillPanel(st, p);
    focusData(st.panel, 'th-' + id);
  }
  const msgRow = c => h('li.cp-msg', { class: c.authorRole === 'team' ? 'is-team' : 'is-client' },
    h('div.cp-msg-head', h('strong', U(c.authorName)), MA.ui.badge(c.authorRole === 'team' ? t('roleTeam') : t('roleClient'), c.authorRole === 'team' ? 'accent' : 'outline'), h('span.tiny.muted', stampTxt(c.createdAt))),
    h('p.cp-msg-body', U(c.body)));

  function replyForm(st, p, thread) {
    const ta = h('textarea.textarea', { rows: 3, maxlength: MAX.reply, placeholder: t('phReply'), 'data-k': 'reply', 'aria-keyshortcuts': 'Control+Enter Meta+Enter' });
    const field = MA.ui.field(t('replyLabel'), ta);
    const send = async () => {
      const body = ta.value.trim();
      if (!body) { markErr(field, t('replyEmpty')); ta.focus(); return; }
      markErr(field, '');
      await act(st, () => api().admin.teamComment({ projectId: p.id, deliverableId: thread === 'project' ? null : thread, body }), { ok: t('replySent'), focus: 'reply' });
    };
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } });
    return h('div.cp-reply', field, h('div.btn-row', MA.ui.btn(t('send'), { kind: 'primary', icon: 'reply', onclick: send })));
  }

  /* ---------- files ---------- */
  function ovFiles(st, p) {
    const rows = orderedDels(p).filter(d => d.url);
    if (!rows.length) {
      return MA.ui.empty({ title: t('flEmpty'), icon: 'folder', compact: true, actions: canEdit() ? [goBtn(st, 'steps', 'openSteps', true)] : [] });
    }
    return h('div.cp-stack',
      h('div.table-wrap', h('table.table.cp-table',
        h('thead', h('tr', th(t('colName')), th(t('colSource')), th(t('colType')), th(t('colSize')), th(t('colDate')), th(t('colStage')), th(t('colVersion')), th(t('colOpen')))),
        h('tbody', rows.map(d => h('tr',
          h('td', h('div.cp-deliv', thumb(d, 'sm'), h('div.cp-deliv-txt', U(d.fileName || d.title)))),
          h('td', isWeb(d.url) ? t('srcLink') : t('srcFile')),
          h('td', kindLabel(d.kind)),
          h('td', bytesTxt(d.fileSize)),
          h('td', stampTxt(d.createdAt)),
          h('td', U(stageTitle(p, d.stepId))),
          h('td', t('dlVersion', { n: d.version })),
          h('td', isWeb(d.url)
            ? h('a.cp-link', { href: d.url, target: '_blank', rel: 'noopener' }, t('dlOpen'))
            : h('a.cp-link', { href: '#', 'data-file': d.url, target: '_blank', rel: 'noopener' }, t('dlOpen')))))))));
  }

  /* ---------- settings ---------- */
  function ovSettings(st, p) {
    const can = canEdit();
    const tpl = tplByKey(p.templateKey);
    const done = p.status === 'done';
    const inp = (v, o = {}) => h('input.input', { value: v == null ? '' : String(v), maxlength: o.max || null, placeholder: o.ph || null, type: o.type || 'text', autocomplete: 'off', 'data-k': o.k || null, disabled: !can });
    const title = inp(p.title, { max: MAX.title, ph: t('phTitle'), k: 'set-title' });
    const service = MA.ui.select(SERVICES.map(v => ({ value: v, label: svcLabel(v) })).concat(SERVICES.includes(p.service) ? [] : [{ value: p.service || 'other', label: svcLabel(p.service) || t('svc.other') }]), p.service || 'other', () => {}, { label: t('fService') });
    service.disabled = !can; service.dataset.k = 'set-service';
    const status = MA.ui.select(PSTAT.map(v => ({ value: v, label: projLabel(v) })), p.status, () => {}, { label: t('fStatus') });
    status.disabled = !can; status.dataset.k = 'set-status';
    const prio = MA.ui.select([{ value: '', label: t('prioNone') }].concat(PRIO.map(v => ({ value: v, label: prioLabel(v) }))), p.priority || '', () => {}, { label: t('fPriority') });
    prio.disabled = !can; prio.dataset.k = 'set-priority';
    const owner = MA.ui.select(ownerOptions(p.ownerName || ''), p.ownerName || '', () => {}, { label: t('fOwner') });
    owner.disabled = !can; owner.dataset.k = 'set-owner';
    const start = inp(p.startDate || '', { type: 'date', k: 'set-start' });
    const due = inp(p.dueDate || '', { type: 'date', k: 'set-due' });
    const summary = h('textarea.textarea', { rows: 3, maxlength: MAX.summary, placeholder: t('phSummary'), 'data-k': 'set-summary', disabled: !can }, p.summary || '');
    const fT = MA.ui.field(t('fTitle'), title);
    const fSvc = MA.ui.field(t('fService'), service);
    const fSt = MA.ui.field(t('fStatus'), status);
    const fPr = MA.ui.field(t('fPriority'), prio);
    const fOw = MA.ui.field(t('fOwner'), owner);
    const fSd = MA.ui.field(t('fStart'), start);
    const fDd = MA.ui.field(t('fDue'), due);
    const fSm = MA.ui.field(t('fSummary'), summary);
    const saveBtn = MA.ui.btn(t('saveSettings'), { kind: 'primary', icon: 'check', onclick: () => saveSettings(st, p, { title, service, status, prio, owner, start, due, summary, fT, fSd, fDd, fSm }) });
    saveBtn.dataset.k = 'save';
    const form = h('form.cp-form', { novalidate: true, onsubmit: e => { e.preventDefault(); if (can) saveBtn.click(); } },
      h('div.cp-grid2', fT, fSt, fSvc, fPr, fOw, fSd, fDd),
      h('div.cp-wide', fSm),
      can ? h('div.btn-row', saveBtn) : null);
    const used = tpl ? h('p.small.muted', t('tplLabel'), ' ', tplName(tpl)) : null;
    const danger = can ? h('section.cp-section.cp-danger',
      h('div.btn-row',
        done
          ? MA.ui.btn(t('reopen'), { kind: 'ghost', icon: 'refresh', onclick: () => setProjectStatus(st, p, 'in_progress') })
          : MA.ui.btn(t('archive'), { kind: 'ghost', icon: 'check', onclick: () => setProjectStatus(st, p, 'done') }),
        MA.ui.btn(t('deleteProj'), { kind: 'danger', icon: 'trash', onclick: () => deleteProject(st, p) })))
      : null;
    return h('div.cp-stack', can ? null : h('p.muted', t('readOnlyNote')), form, used, danger);
  }

  /* ---------- text (English) ---------- */
  MA.i18n.add({
    en: {
      'cp.err.unauthorised': 'Sign in again to continue.', 'cp.err.notFound': 'That item was not found. It may have been deleted.',
      'cp.err.invalid': 'Check the highlighted fields and try again.', 'cp.err.conflict': 'That changed while you were working. Refresh and try again.',
      'cp.err.server': 'Something went wrong. Try again in a moment.',
      'cp.size.kb': '{n} KB', 'cp.size.mb': '{n} MB',
      'cp.missing': "This project isn't available",
      'cp.loadFailed': "The project couldn't be loaded", 'cp.loadFailedText': 'Check the connection, then try again.', 'cp.retry': 'Try again',
      'cp.backToClients': 'Back to clients', 'cp.openClient': 'Client',
      'cp.readOnly': 'Only editors can change projects.', 'cp.readOnlyNote': 'Read only.',
      'cp.unknownClient': 'Unknown client', 'cp.none': 'None', 'cp.noOwner': 'No owner', 'cp.overdue': 'Overdue',
      'cp.save': 'Save', 'cp.cancel': 'Cancel', 'cp.delete': 'Delete', 'cp.next': 'Next', 'cp.back': 'Back',
      'cp.saved': 'Saved', 'cp.created': 'Project created', 'cp.creating': 'Creating…', 'cp.createProject': 'Create project', 'cp.send': 'Send',
      'cp.tabsLabel': 'Project sections', 'cp.tabOverview': 'Overview', 'cp.tabSteps': 'Steps', 'cp.tabApprovals': 'Approvals',
      'cp.tabComments': 'Comments', 'cp.tabFiles': 'Files', 'cp.tabSettings': 'Settings',
      'cp.mClient': 'Client', 'cp.mStatus': 'Status', 'cp.mPriority': 'Priority', 'cp.mDue': 'Due', 'cp.mOwner': 'Owner',
      'cp.ovNext': 'Next',
      'cp.nextNoStages': 'No steps yet',
      'cp.nextChanges': 'Changes requested: {n}',
      'cp.nextWaiting': 'Waiting for the client: {n}',
      'cp.nextStage': 'Next step', 'cp.openStage': 'Open',
      'cp.nextDue': 'Due', 'cp.dueProject': 'Project',
      'cp.nextAllDone': 'Every step is approved',
      'cp.nextNone': 'Nothing is waiting on you',
      'cp.openSteps': 'Steps', 'cp.openApprovals': 'Approvals',
      'cp.ovProgress': 'Progress', 'cp.stagesApproved': '{done} of {total} approved',
      'cp.ovSummary': 'Summary', 'cp.noSummary': 'No summary yet.', 'cp.addSummary': 'Add summary',
      'cp.ovActivity': 'Activity', 'cp.actNone': 'Nothing yet.',
      'cp.actAll': 'Show all ({n})', 'cp.actLess': 'Show fewer', 'cp.actFailed': 'The activity could not be loaded.',
      'cp.ev.you': 'You', 'cp.ev.gone': 'a removed item', 'cp.ev.raw': 'logged a change: {change}',
      'cp.ev.projStatus': 'changed the project status from {from} to {to}',
      'cp.ev.status': 'changed the status of {item} from {from} to {to}',
      'cp.ev.due': 'changed the due date of {item} from {from} to {to}',
      'cp.ev.owner': 'changed the owner of {item} from {from} to {to}',
      'cp.ev.fileName': 'renamed the file on {item} from {from} to {to}',
      'cp.ev.fileAdded': 'added the file {name} to {item}', 'cp.ev.linkAdded': 'added the link {name} to {item}',
      'cp.ev.fileReplaced': 'replaced the file {name} on {item}', 'cp.ev.linkReplaced': 'replaced the link {name} on {item}',
      'cp.ev.fileRemoved': 'removed the file {name} from {item}', 'cp.ev.linkRemoved': 'removed the link {name} from {item}',
      'cp.dlMissing': 'That file is no longer in this project.',
      'cp.actComment': 'commented on', 'cp.actReply': 'replied on', 'cp.actApprove': 'approved', 'cp.actChanges': 'asked for changes on',
      'cp.threadProject': 'Project',
      'cp.threadsList': 'Comment threads', 'cp.thNeedsReply': 'Needs reply',
      'cp.viewLarger': 'View larger: {name}', 'cp.playLabel': 'Play', 'cp.posterNote': 'A still image from the video. Open the file to watch it.',
      'cp.addStage': 'Add step', 'cp.stagesList': 'Steps', 'cp.noStages': 'No steps yet',
      'cp.reorder': 'Reorder', 'cp.edit': 'Edit', 'cp.editNamed': 'Edit {name}', 'cp.statusOf': 'Status of {name}: {status}', 'cp.openNamed': 'Open {name}',
      'cp.nFiles': { one: '1 file', other: '{n} files' }, 'cp.plusStep': 'Step', 'cp.plusFile': 'File', 'cp.addFile': 'Add file or link', 'cp.chipChanges': 'Changes',
      'cp.stageStatus': 'Status', 'cp.stageOwner': 'Owner', 'cp.stageDue': 'Due date',
      'cp.stEdit': 'Edit step', 'cp.stDelete': 'Delete step', 'cp.dragStage': 'Drag to reorder, or use Alt with the arrow keys',
      'cp.moveUp': 'Move up', 'cp.moveDown': 'Move down',
      'cp.dlEmpty': 'No files yet.',
      'cp.dlStatus': 'Status',
      'cp.dlEdit': 'Edit file or link', 'cp.dlDelete': 'Delete file or link', 'cp.dlNoFile': 'No file',
      'cp.dlOpen': 'Open', 'cp.dlVersion': 'Version {n}', 'cp.dlNew': 'New file or link',
      'cp.dlAdded': 'Added', 'cp.dlDeleted': 'Deleted', 'cp.dlDelTitle': 'Delete this file or link?',
      'cp.dlDelText': 'Its approval and reactions are removed too. This cannot be undone.',
      'cp.stNew': 'New step', 'cp.stAdded': 'Step added', 'cp.stDeleted': 'Step deleted', 'cp.stDelTitle': 'Delete this step?',
      'cp.stDelText': { zero: 'It has no files.', one: 'It has 1 file. It is deleted with the step.', other: 'It has {n} files. They are deleted with the step.' },
      'cp.stageName': 'Step name', 'cp.phStageName': 'Script and storyboard',
      'cp.stageDesc': 'Description', 'cp.phStageDesc': 'The client approves the story before filming starts.',
      'cp.moreOptions': 'More options',
      'cp.apFilter': 'Filter by decision',
      'cp.apAll': 'All', 'cp.apWaiting': 'Waiting', 'cp.apApproved': 'Approved', 'cp.apChanges': 'Changes', 'cp.apNotSent': 'Not sent',
      'cp.apEmpty': 'No deliverables yet.', 'cp.apNone': 'Nothing here.',
      'cp.colDeliv': 'Deliverable', 'cp.colDecision': 'Decision', 'cp.colBy': 'By', 'cp.colTime': 'When', 'cp.colReact': 'Reactions',
      'cp.dcApproved': 'Approved', 'cp.dcChanges': 'Changes requested', 'cp.dcWaiting': 'Waiting for the client', 'cp.dcNotSent': 'Not sent yet',
      'cp.likes': 'Likes', 'cp.dislikes': 'Dislikes',
      'cp.nComments': { one: '1 comment', other: '{n} comments' },
      'cp.cmEmpty': 'No comments yet.',
      'cp.roleClient': 'Client', 'cp.roleTeam': 'Team',
      'cp.replyLabel': 'Reply', 'cp.phReply': 'Write a reply', 'cp.replySent': 'Reply sent', 'cp.replyEmpty': 'Write a reply first.',
      'cp.flEmpty': 'No files yet.',
      'cp.colName': 'Name', 'cp.colSource': 'Source', 'cp.colType': 'Type', 'cp.colSize': 'Size', 'cp.colDate': 'Added', 'cp.colStage': 'Step',
      'cp.colVersion': 'Version', 'cp.colOpen': 'Open', 'cp.srcFile': 'File', 'cp.srcLink': 'Link',
      'cp.fileMissing': 'This file is no longer in this browser.',
      'cp.tplLabel': 'Template:',
      'cp.fTitle': 'Title', 'cp.phTitle': 'Ramadan campaign 2027',
      'cp.fService': 'Service', 'cp.fStatus': 'Status', 'cp.fPriority': 'Priority', 'cp.fOwner': 'Owner',
      'cp.fStart': 'Start date', 'cp.fDue': 'Due date',
      'cp.fSummary': 'Summary', 'cp.phSummary': 'Three Ramadan films and a month of posts.',
      'cp.saveSettings': 'Save',
      'cp.archive': 'Mark done', 'cp.reopen': 'Reopen', 'cp.archived': 'Marked done', 'cp.reopened': 'Reopened',
      'cp.deleteProj': 'Delete project', 'cp.deleteProjTitle': 'Delete this project?',
      'cp.deleteProjText': 'Its steps, deliverables, approvals and comments are deleted with it. The client loses access to them. This cannot be undone.',
      'cp.projDeleted': 'Project deleted',
      'cp.projSt.planning': 'Planning', 'cp.projSt.in_progress': 'In progress', 'cp.projSt.review': 'Review', 'cp.projSt.live': 'Live', 'cp.projSt.done': 'Done',
      'cp.stepSt.pending': 'Pending', 'cp.stepSt.in_progress': 'In progress', 'cp.stepSt.waiting': 'Waiting for client', 'cp.stepSt.approved': 'Approved', 'cp.stepSt.changes': 'Changes requested',
      'cp.delSt.draft': 'Draft', 'cp.delSt.in_review': 'In review', 'cp.delSt.approved': 'Approved', 'cp.delSt.changes': 'Changes requested', 'cp.delSt.published': 'Published',
      'cp.prio.low': 'Low', 'cp.prio.normal': 'Normal', 'cp.prio.high': 'High',
      'cp.kind.image': 'Image', 'cp.kind.video': 'Video', 'cp.kind.post': 'Post', 'cp.kind.document': 'Document', 'cp.kind.link': 'Link',
      'cp.svc.video': 'Video production', 'cp.svc.social': 'Monthly social media', 'cp.svc.brand': 'Brand identity', 'cp.svc.web': 'Website',
      'cp.svc.campaign': 'Campaign and ads', 'cp.svc.photo': 'Photo shoot', 'cp.svc.other': 'Other',
      'cp.wizTitle': 'New project', 'cp.wzSteps': 'Steps to create a project', 'cp.wzName.1': 'Kind', 'cp.wzName.2': 'Create',
      'cp.wzTitle.1': 'What kind of project?', 'cp.wzTitle.2': 'Who is it for?', 'cp.wzTitle.2b': 'Give it a name', 'cp.wzDone': 'Done',
      'cp.kw.video': 'Video', 'cp.kw.social': 'Social', 'cp.kw.brand': 'Brand', 'cp.kw.web': 'Website', 'cp.kw.campaign': 'Campaign', 'cp.kw.photo': 'Photo', 'cp.kw.blank': 'Blank',
      'cp.previewSteps': 'Preview steps', 'cp.previewHint': 'Pick a kind to see its steps.',
      'cp.fClient': 'Client', 'cp.chooseClient': 'Choose a client', 'cp.newClient': 'New client', 'cp.clientName': 'Client name', 'cp.addClient': 'Add',
      'cp.errClient': 'Choose a client.', 'cp.errClientName': 'Add a name.', 'cp.errTemplate': 'Pick a kind.',
      'cp.fTitleOpt': 'Title (optional)',
      'cp.errTooLong': 'Keep it to {max} characters or fewer.', 'cp.errDate': 'Enter a real date, such as 2026-11-30.',
      'cp.errDueBeforeStart': 'The due date cannot be before the start date.', 'cp.fixFirst': 'Fix the fields marked in red.',
      'cp.fLang': 'Language', 'cp.langEn': 'English', 'cp.langAr': 'Arabic', 'cp.prioNone': 'Not set',
      'cp.codeTitle': 'Client added', 'cp.codeLabel': 'Access code', 'cp.codeWarn': 'Shown once. Copy it now.', 'cp.codeLink': 'Portal link',
      'cp.copyCode': 'Copy code', 'cp.copyLink': 'Copy link', 'cp.codeCopied': 'Code copied', 'cp.linkCopied': 'Link copied', 'cp.codeDone': 'Done',
      'cp.errMaxStages': 'A project can have up to {max} steps.',
      'cp.currentFile': 'Current file:', 'cp.versionRaised': 'Version raised to {v} because the file was replaced.',
      'cp.fDlTitle': 'Name', 'cp.phDlName': 'Final cut 16:9',
      'cp.fDlDesc': 'Description', 'cp.phDlDesc': 'The 16:9 version with English subtitles, for YouTube and the website.',
      'cp.fDlDue': 'Due date', 'cp.fDlVersion': 'Version', 'cp.dlKind': 'Kind',
      'cp.fSource': 'Source', 'cp.fFile': 'File', 'cp.hFile': 'Image, MP4 or PDF. Up to 25 MB.', 'cp.fLink': 'Link',
      'cp.fileEmpty': 'The file is empty.', 'cp.fileType': 'Use an image (PNG, JPEG, WebP, GIF or AVIF), an MP4 video or a PDF.',
      'cp.fileSize': 'The file is larger than 25 MB.', 'cp.errNeedFile': 'Choose a file.',
      'cp.errLink': 'The link must start with https://.', 'cp.errVersion': 'Enter a whole number from 1 to 999.', 'cp.errRequired': 'This field is required.',
    },
  });

  /* ---------- text (Arabic) ---------- */
  MA.i18n.add({
    ar: {
      'cp.err.unauthorised': 'سجّل الدخول مرة أخرى للمتابعة.', 'cp.err.notFound': 'لم يُعثر على هذا العنصر. ربما حُذف.',
      'cp.err.invalid': 'راجع الحقول المحددة ثم حاول مرة أخرى.', 'cp.err.conflict': 'تغيّر هذا أثناء العمل. حدّث الصفحة ثم حاول مرة أخرى.',
      'cp.err.server': 'حدث خطأ ما. حاول مرة أخرى بعد قليل.',
      'cp.size.kb': '{n} كيلوبايت', 'cp.size.mb': '{n} ميغابايت',
      'cp.missing': 'هذا المشروع غير متاح',
      'cp.loadFailed': 'تعذّر تحميل المشروع', 'cp.loadFailedText': 'تحقق من الاتصال، ثم حاول مرة أخرى.', 'cp.retry': 'حاول مرة أخرى',
      'cp.backToClients': 'العودة إلى العملاء', 'cp.openClient': 'العميل',
      'cp.readOnly': 'المحررون فقط يمكنهم تعديل المشاريع.', 'cp.readOnlyNote': 'للقراءة فقط.',
      'cp.unknownClient': 'عميل غير معروف', 'cp.none': 'لا يوجد',
      'cp.noOwner': 'بدون مسؤول', 'cp.overdue': 'متأخر',
      'cp.save': 'حفظ', 'cp.cancel': 'إلغاء', 'cp.delete': 'حذف', 'cp.next': 'التالي', 'cp.back': 'السابق',
      'cp.saved': 'تم الحفظ', 'cp.created': 'تم إنشاء المشروع', 'cp.creating': 'جارٍ الإنشاء…', 'cp.createProject': 'إنشاء المشروع', 'cp.send': 'إرسال',
      'cp.tabsLabel': 'أقسام المشروع', 'cp.tabOverview': 'نظرة عامة', 'cp.tabSteps': 'المراحل', 'cp.tabApprovals': 'الموافقات',
      'cp.tabComments': 'التعليقات', 'cp.tabFiles': 'الملفات', 'cp.tabSettings': 'الإعدادات',
      'cp.mClient': 'العميل', 'cp.mStatus': 'الحالة', 'cp.mPriority': 'الأولوية', 'cp.mDue': 'الاستحقاق', 'cp.mOwner': 'المسؤول',
      'cp.ovNext': 'التالي',
      'cp.nextNoStages': 'لا توجد مراحل بعد',
      'cp.nextChanges': 'طُلبت تعديلات: {n}',
      'cp.nextWaiting': 'بانتظار العميل: {n}',
      'cp.nextStage': 'المرحلة التالية', 'cp.openStage': 'فتح',
      'cp.nextDue': 'الاستحقاق', 'cp.dueProject': 'المشروع',
      'cp.nextAllDone': 'اعتُمدت كل المراحل',
      'cp.nextNone': 'لا شيء ينتظرك',
      'cp.openSteps': 'المراحل', 'cp.openApprovals': 'الموافقات',
      'cp.ovProgress': 'التقدم', 'cp.stagesApproved': 'اعتُمد {done} من {total}',
      'cp.ovSummary': 'الملخص', 'cp.noSummary': 'لا يوجد ملخص بعد.', 'cp.addSummary': 'إضافة ملخص',
      'cp.ovActivity': 'النشاط', 'cp.actNone': 'لا شيء بعد.',
      'cp.actAll': 'عرض الكل ({n})', 'cp.actLess': 'عرض أقل', 'cp.actFailed': 'تعذّر تحميل النشاط.',
      'cp.ev.you': 'أنت', 'cp.ev.gone': 'عنصر محذوف', 'cp.ev.raw': 'سجّل تغييراً: {change}',
      'cp.ev.projStatus': 'غيّر حالة المشروع من {from} إلى {to}',
      'cp.ev.status': 'غيّر حالة {item} من {from} إلى {to}',
      'cp.ev.due': 'غيّر تاريخ استحقاق {item} من {from} إلى {to}',
      'cp.ev.owner': 'غيّر مسؤول {item} من {from} إلى {to}',
      'cp.ev.fileName': 'غيّر اسم الملف في {item} من {from} إلى {to}',
      'cp.ev.fileAdded': 'أضاف الملف {name} إلى {item}', 'cp.ev.linkAdded': 'أضاف الرابط {name} إلى {item}',
      'cp.ev.fileReplaced': 'استبدل الملف {name} في {item}', 'cp.ev.linkReplaced': 'استبدل الرابط {name} في {item}',
      'cp.ev.fileRemoved': 'حذف الملف {name} من {item}', 'cp.ev.linkRemoved': 'حذف الرابط {name} من {item}',
      'cp.dlMissing': 'لم يعد هذا الملف في هذا المشروع.',
      'cp.actComment': 'علّق على', 'cp.actReply': 'ردّ على', 'cp.actApprove': 'وافق على', 'cp.actChanges': 'طلب تعديلات على',
      'cp.threadProject': 'المشروع',
      'cp.threadsList': 'سلاسل التعليقات', 'cp.thNeedsReply': 'بانتظار الرد',
      'cp.viewLarger': 'عرض أكبر: {name}', 'cp.playLabel': 'تشغيل', 'cp.posterNote': 'صورة ثابتة من الفيديو. افتح الملف لمشاهدته.',
      'cp.addStage': 'إضافة مرحلة', 'cp.stagesList': 'المراحل', 'cp.noStages': 'لا توجد مراحل بعد',
      'cp.reorder': 'ترتيب', 'cp.edit': 'تعديل', 'cp.editNamed': 'تعديل {name}', 'cp.statusOf': 'حالة {name}: {status}', 'cp.openNamed': 'فتح {name}',
      'cp.nFiles': { zero: 'لا توجد ملفات', one: 'ملف واحد', two: 'ملفان', few: '{n} ملفات', many: '{n} ملفاً', other: '{n} ملف' },
      'cp.plusStep': 'مرحلة', 'cp.plusFile': 'ملف', 'cp.addFile': 'إضافة ملف أو رابط', 'cp.chipChanges': 'تعديلات',
      'cp.stageStatus': 'الحالة', 'cp.stageOwner': 'المسؤول', 'cp.stageDue': 'تاريخ الاستحقاق',
      'cp.stEdit': 'تعديل المرحلة', 'cp.stDelete': 'حذف المرحلة', 'cp.dragStage': 'اسحب لإعادة الترتيب، أو استخدم Alt مع مفاتيح الأسهم',
      'cp.moveUp': 'نقل إلى أعلى', 'cp.moveDown': 'نقل إلى أسفل',
      'cp.dlEmpty': 'لا توجد ملفات بعد.',
      'cp.dlStatus': 'الحالة',
      'cp.dlEdit': 'تعديل الملف أو الرابط', 'cp.dlDelete': 'حذف الملف أو الرابط', 'cp.dlNoFile': 'بدون ملف',
      'cp.dlOpen': 'فتح', 'cp.dlVersion': 'الإصدار {n}', 'cp.dlNew': 'ملف أو رابط جديد',
      'cp.dlAdded': 'تمت الإضافة', 'cp.dlDeleted': 'تم الحذف', 'cp.dlDelTitle': 'حذف هذا الملف أو الرابط؟',
      'cp.dlDelText': 'تُحذف معه الموافقة والتفاعلات. لا يمكن التراجع عن ذلك.',
      'cp.stNew': 'مرحلة جديدة', 'cp.stAdded': 'تمت إضافة المرحلة', 'cp.stDeleted': 'تم حذف المرحلة', 'cp.stDelTitle': 'حذف هذه المرحلة؟',
      'cp.stDelText': { zero: 'لا توجد بها ملفات.', one: 'بها ملف واحد يُحذف مع المرحلة.', two: 'بها ملفان يُحذفان مع المرحلة.', few: 'بها {n} ملفات تُحذف مع المرحلة.', many: 'بها {n} ملفاً يُحذف مع المرحلة.', other: 'بها {n} ملف يُحذف مع المرحلة.' },
      'cp.stageName': 'اسم المرحلة', 'cp.phStageName': 'النص وسير اللقطات',
      'cp.stageDesc': 'الوصف', 'cp.phStageDesc': 'يعتمد العميل القصة قبل بدء التصوير.',
      'cp.moreOptions': 'خيارات إضافية',
      'cp.apFilter': 'تصفية حسب القرار',
      'cp.apAll': 'الكل', 'cp.apWaiting': 'بانتظار الرد', 'cp.apApproved': 'معتمد', 'cp.apChanges': 'تعديلات', 'cp.apNotSent': 'لم يُرسل',
      'cp.apEmpty': 'لا توجد مخرجات بعد.', 'cp.apNone': 'لا شيء هنا.',
      'cp.colDeliv': 'المخرج', 'cp.colDecision': 'القرار', 'cp.colBy': 'المعتمِد', 'cp.colTime': 'الوقت', 'cp.colReact': 'التفاعلات',
      'cp.dcApproved': 'معتمد', 'cp.dcChanges': 'طلب تعديلات', 'cp.dcWaiting': 'بانتظار العميل', 'cp.dcNotSent': 'لم يُرسل بعد',
      'cp.likes': 'الإعجابات', 'cp.dislikes': 'عدم الإعجاب',
      'cp.nComments': { zero: 'لا توجد تعليقات', one: 'تعليق واحد', two: 'تعليقان', few: '{n} تعليقات', many: '{n} تعليقاً', other: '{n} تعليق' },
      'cp.cmEmpty': 'لا توجد تعليقات بعد.',
      'cp.roleClient': 'العميل', 'cp.roleTeam': 'الفريق',
      'cp.replyLabel': 'الرد', 'cp.phReply': 'اكتب رداً', 'cp.replySent': 'تم إرسال الرد', 'cp.replyEmpty': 'اكتب الرد أولاً.',
      'cp.flEmpty': 'لا توجد ملفات بعد.',
      'cp.colName': 'الاسم', 'cp.colSource': 'المصدر', 'cp.colType': 'النوع', 'cp.colSize': 'الحجم', 'cp.colDate': 'أُضيف', 'cp.colStage': 'المرحلة',
      'cp.colVersion': 'الإصدار', 'cp.colOpen': 'فتح', 'cp.srcFile': 'ملف', 'cp.srcLink': 'رابط',
      'cp.fileMissing': 'لم يعد هذا الملف موجوداً في هذا المتصفح.',
      'cp.tplLabel': 'القالب:',
      'cp.fTitle': 'العنوان', 'cp.phTitle': 'حملة رمضان 2027',
      'cp.fService': 'الخدمة', 'cp.fStatus': 'الحالة', 'cp.fPriority': 'الأولوية', 'cp.fOwner': 'المسؤول',
      'cp.fStart': 'تاريخ البداية', 'cp.fDue': 'تاريخ الاستحقاق',
      'cp.fSummary': 'الملخص', 'cp.phSummary': 'ثلاثة أفلام رمضانية وشهر من المنشورات.',
      'cp.saveSettings': 'حفظ',
      'cp.archive': 'تعليم كمنتهٍ', 'cp.reopen': 'إعادة الفتح', 'cp.archived': 'عُلّم المشروع منتهياً', 'cp.reopened': 'أُعيد فتح المشروع',
      'cp.deleteProj': 'حذف المشروع', 'cp.deleteProjTitle': 'حذف هذا المشروع؟',
      'cp.deleteProjText': 'تُحذف معه مراحله ومخرجاته وموافقاته وتعليقاته. يفقد العميل الوصول إليها. لا يمكن التراجع عن ذلك.',
      'cp.projDeleted': 'تم حذف المشروع',
      'cp.projSt.planning': 'تخطيط', 'cp.projSt.in_progress': 'قيد التنفيذ', 'cp.projSt.review': 'مراجعة', 'cp.projSt.live': 'منشور', 'cp.projSt.done': 'منتهٍ',
      'cp.stepSt.pending': 'في الانتظار', 'cp.stepSt.in_progress': 'قيد التنفيذ', 'cp.stepSt.waiting': 'بانتظار العميل', 'cp.stepSt.approved': 'معتمد', 'cp.stepSt.changes': 'طُلبت تعديلات',
      'cp.delSt.draft': 'مسودة', 'cp.delSt.in_review': 'قيد المراجعة', 'cp.delSt.approved': 'معتمد', 'cp.delSt.changes': 'طُلبت تعديلات', 'cp.delSt.published': 'منشور',
      'cp.prio.low': 'منخفضة', 'cp.prio.normal': 'عادية', 'cp.prio.high': 'مرتفعة',
      'cp.kind.image': 'صورة', 'cp.kind.video': 'فيديو', 'cp.kind.post': 'منشور', 'cp.kind.document': 'مستند', 'cp.kind.link': 'رابط',
      'cp.svc.video': 'إنتاج فيديو', 'cp.svc.social': 'إدارة التواصل الاجتماعي الشهرية', 'cp.svc.brand': 'الهوية البصرية', 'cp.svc.web': 'موقع إلكتروني',
      'cp.svc.campaign': 'حملة وإعلانات', 'cp.svc.photo': 'جلسة تصوير', 'cp.svc.other': 'أخرى',
      'cp.wizTitle': 'مشروع جديد', 'cp.wzSteps': 'خطوات إنشاء المشروع', 'cp.wzName.1': 'النوع', 'cp.wzName.2': 'إنشاء',
      'cp.wzTitle.1': 'ما نوع المشروع؟', 'cp.wzTitle.2': 'لمن هذا المشروع؟', 'cp.wzTitle.2b': 'سمِّ المشروع', 'cp.wzDone': 'تم',
      'cp.kw.video': 'فيديو', 'cp.kw.social': 'التواصل', 'cp.kw.brand': 'الهوية', 'cp.kw.web': 'موقع', 'cp.kw.campaign': 'حملة', 'cp.kw.photo': 'تصوير', 'cp.kw.blank': 'فارغ',
      'cp.previewSteps': 'معاينة المراحل', 'cp.previewHint': 'اختر نوعاً لترى مراحله.',
      'cp.fClient': 'العميل', 'cp.chooseClient': 'اختر عميلاً', 'cp.newClient': 'عميل جديد', 'cp.clientName': 'اسم العميل', 'cp.addClient': 'إضافة',
      'cp.errClient': 'اختر عميلاً.', 'cp.errClientName': 'أضف اسماً.', 'cp.errTemplate': 'اختر نوعاً.',
      'cp.fTitleOpt': 'العنوان (اختياري)',
      'cp.errTooLong': 'اجعله {max} حرف أو أقل.', 'cp.errDate': 'أدخل تاريخاً صحيحاً، مثل 2026-11-30.',
      'cp.errDueBeforeStart': 'لا يمكن أن يسبق تاريخ الاستحقاق تاريخ البداية.', 'cp.fixFirst': 'صحّح الحقول المعلَّمة بالأحمر.',
      'cp.fLang': 'اللغة', 'cp.langEn': 'الإنجليزية', 'cp.langAr': 'العربية', 'cp.prioNone': 'غير محددة',
      'cp.codeTitle': 'تمت إضافة العميل', 'cp.codeLabel': 'رمز الدخول', 'cp.codeWarn': 'يظهر مرة واحدة فقط. انسخه الآن.', 'cp.codeLink': 'رابط البوابة',
      'cp.copyCode': 'نسخ الرمز', 'cp.copyLink': 'نسخ الرابط', 'cp.codeCopied': 'نُسخ الرمز', 'cp.linkCopied': 'نُسخ الرابط', 'cp.codeDone': 'تم',
      'cp.errMaxStages': 'يمكن أن يضم المشروع {max} مرحلة كحد أقصى.',
      'cp.currentFile': 'الملف الحالي:', 'cp.versionRaised': 'رُفع الإصدار إلى {v} لأن الملف استُبدل.',
      'cp.fDlTitle': 'الاسم', 'cp.phDlName': 'النسخة النهائية 16:9',
      'cp.fDlDesc': 'الوصف', 'cp.phDlDesc': 'نسخة 16:9 مع ترجمة عربية، لليوتيوب والموقع.',
      'cp.fDlDue': 'تاريخ الاستحقاق', 'cp.fDlVersion': 'الإصدار', 'cp.dlKind': 'النوع',
      'cp.fSource': 'المصدر', 'cp.fFile': 'الملف', 'cp.hFile': 'صورة أو MP4 أو PDF، حتى 25 ميغابايت.', 'cp.fLink': 'الرابط',
      'cp.fileEmpty': 'الملف فارغ.', 'cp.fileType': 'استخدم صورة (PNG أو JPEG أو WebP أو GIF أو AVIF)، أو فيديو MP4، أو PDF.',
      'cp.fileSize': 'حجم الملف أكبر من 25 ميغابايت.', 'cp.errNeedFile': 'اختر ملفاً.',
      'cp.errLink': 'يجب أن يبدأ الرابط بـ https://.', 'cp.errVersion': 'أدخل رقماً صحيحاً من 1 إلى 999.', 'cp.errRequired': 'هذا الحقل مطلوب.',
    },
  });

  /* ---------- text (Persian) ---------- */
  MA.i18n.add({
    fa: {
      'cp.err.unauthorised': 'برای ادامه دوباره وارد شوید.', 'cp.err.notFound': 'این مورد پیدا نشد. شاید حذف شده باشد.',
      'cp.err.invalid': 'فیلدهای مشخص‌شده را بررسی کنید و دوباره تلاش کنید.', 'cp.err.conflict': 'این مورد در حین کار تغییر کرد. صفحه را تازه کنید و دوباره تلاش کنید.',
      'cp.err.server': 'مشکلی پیش آمد. کمی بعد دوباره تلاش کنید.',
      'cp.size.kb': '{n} کیلوبایت', 'cp.size.mb': '{n} مگابایت',
      'cp.missing': 'این پروژه در دسترس نیست',
      'cp.loadFailed': 'پروژه بارگذاری نشد', 'cp.loadFailedText': 'اتصال را بررسی کنید و دوباره تلاش کنید.', 'cp.retry': 'دوباره تلاش کنید',
      'cp.backToClients': 'بازگشت به مشتری‌ها', 'cp.openClient': 'مشتری',
      'cp.readOnly': 'فقط ویراستاران می‌توانند پروژه‌ها را تغییر دهند.', 'cp.readOnlyNote': 'فقط خواندنی.',
      'cp.unknownClient': 'مشتری نامشخص', 'cp.none': 'ندارد', 'cp.noOwner': 'بدون مسئول', 'cp.overdue': 'دیرکرد',
      'cp.save': 'ذخیره', 'cp.cancel': 'انصراف', 'cp.delete': 'حذف', 'cp.next': 'بعدی', 'cp.back': 'قبلی',
      'cp.saved': 'ذخیره شد', 'cp.created': 'پروژه ساخته شد', 'cp.creating': 'در حال ساخت…', 'cp.createProject': 'ساختن پروژه', 'cp.send': 'ارسال',
      'cp.tabsLabel': 'بخش‌های پروژه', 'cp.tabOverview': 'نمای کلی', 'cp.tabSteps': 'مرحله‌ها', 'cp.tabApprovals': 'تأییدها',
      'cp.tabComments': 'نظرها', 'cp.tabFiles': 'فایل‌ها', 'cp.tabSettings': 'تنظیمات',
      'cp.mClient': 'مشتری', 'cp.mStatus': 'وضعیت', 'cp.mPriority': 'اولویت', 'cp.mDue': 'موعد', 'cp.mOwner': 'مسئول',
      'cp.ovNext': 'بعدی',
      'cp.nextNoStages': 'هنوز مرحله‌ای نیست',
      'cp.nextChanges': 'درخواست اصلاح: {n}',
      'cp.nextWaiting': 'منتظر مشتری: {n}',
      'cp.nextStage': 'مرحلهٔ بعدی', 'cp.openStage': 'باز کردن',
      'cp.nextDue': 'موعد', 'cp.dueProject': 'پروژه',
      'cp.nextAllDone': 'همهٔ مرحله‌ها تأیید شده‌اند',
      'cp.nextNone': 'فعلاً چیزی منتظر شما نیست',
      'cp.openSteps': 'مرحله‌ها', 'cp.openApprovals': 'تأییدها',
      'cp.ovProgress': 'پیشرفت', 'cp.stagesApproved': '{done} از {total} تأیید شد',
      'cp.ovSummary': 'خلاصه', 'cp.noSummary': 'هنوز خلاصه‌ای نیست.', 'cp.addSummary': 'افزودن خلاصه',
      'cp.ovActivity': 'فعالیت', 'cp.actNone': 'هنوز چیزی نیست.',
      'cp.actAll': 'نمایش همه ({n})', 'cp.actLess': 'نمایش کمتر', 'cp.actFailed': 'فعالیت‌ها بارگذاری نشد.',
      'cp.ev.you': 'شما', 'cp.ev.gone': 'یک مورد حذف‌شده', 'cp.ev.raw': 'یک تغییر را ثبت کرد: {change}',
      'cp.ev.projStatus': 'وضعیت پروژه را از {from} به {to} تغییر داد',
      'cp.ev.status': 'وضعیت {item} را از {from} به {to} تغییر داد',
      'cp.ev.due': 'موعد {item} را از {from} به {to} تغییر داد',
      'cp.ev.owner': 'مسئول {item} را از {from} به {to} تغییر داد',
      'cp.ev.fileName': 'نام فایل {item} را از {from} به {to} تغییر داد',
      'cp.ev.fileAdded': 'فایل {name} را به {item} اضافه کرد', 'cp.ev.linkAdded': 'پیوند {name} را به {item} اضافه کرد',
      'cp.ev.fileReplaced': 'فایل {name} را در {item} جایگزین کرد', 'cp.ev.linkReplaced': 'پیوند {name} را در {item} جایگزین کرد',
      'cp.ev.fileRemoved': 'فایل {name} را از {item} حذف کرد', 'cp.ev.linkRemoved': 'پیوند {name} را از {item} حذف کرد',
      'cp.dlMissing': 'این فایل دیگر در این پروژه نیست.',
      'cp.actComment': 'دربارهٔ آن نظر داد:', 'cp.actReply': 'به آن پاسخ داد:', 'cp.actApprove': 'تأیید کرد:', 'cp.actChanges': 'اصلاح خواست برای:',
      'cp.threadProject': 'پروژه',
      'cp.threadsList': 'رشته‌های نظرات', 'cp.thNeedsReply': 'منتظر پاسخ',
      'cp.viewLarger': 'نمایش بزرگ‌تر: {name}', 'cp.playLabel': 'پخش', 'cp.posterNote': 'تصویر ثابت از ویدیو. برای تماشا، فایل را باز کنید.',
      'cp.addStage': 'افزودن مرحله', 'cp.stagesList': 'مرحله‌ها', 'cp.noStages': 'هنوز مرحله‌ای نیست',
      'cp.reorder': 'جابه‌جایی', 'cp.edit': 'ویرایش', 'cp.editNamed': 'ویرایش {name}', 'cp.statusOf': 'وضعیت {name}: {status}', 'cp.openNamed': 'باز کردن {name}',
      'cp.nFiles': { one: '{n} فایل', other: '{n} فایل' }, 'cp.plusStep': 'مرحله', 'cp.plusFile': 'فایل', 'cp.addFile': 'افزودن فایل یا پیوند', 'cp.chipChanges': 'اصلاح',
      'cp.stageStatus': 'وضعیت', 'cp.stageOwner': 'مسئول', 'cp.stageDue': 'موعد',
      'cp.stEdit': 'ویرایش مرحله', 'cp.stDelete': 'حذف مرحله', 'cp.dragStage': 'برای جابه‌جایی بکشید، یا با Alt و کلیدهای جهت‌نما',
      'cp.moveUp': 'بالا بردن', 'cp.moveDown': 'پایین بردن',
      'cp.dlEmpty': 'هنوز فایلی نیست.',
      'cp.dlStatus': 'وضعیت',
      'cp.dlEdit': 'ویرایش فایل یا پیوند', 'cp.dlDelete': 'حذف فایل یا پیوند', 'cp.dlNoFile': 'بدون فایل',
      'cp.dlOpen': 'باز کردن', 'cp.dlVersion': 'نسخهٔ {n}', 'cp.dlNew': 'فایل یا پیوند تازه',
      'cp.dlAdded': 'افزوده شد', 'cp.dlDeleted': 'حذف شد', 'cp.dlDelTitle': 'این فایل یا پیوند حذف شود؟',
      'cp.dlDelText': 'تأیید و واکنش‌های آن هم حذف می‌شوند. این کار برگشت‌پذیر نیست.',
      'cp.stNew': 'مرحلهٔ تازه', 'cp.stAdded': 'مرحله افزوده شد', 'cp.stDeleted': 'مرحله حذف شد', 'cp.stDelTitle': 'این مرحله حذف شود؟',
      'cp.stDelText': { zero: 'فایلی ندارد.', one: 'یک فایل دارد که با مرحله حذف می‌شود.', other: '{n} فایل دارد که با مرحله حذف می‌شوند.' },
      'cp.stageName': 'نام مرحله', 'cp.phStageName': 'فیلمنامه و استوری‌برد',
      'cp.stageDesc': 'توضیح', 'cp.phStageDesc': 'مشتری پیش از شروع فیلم‌برداری، داستان را تأیید می‌کند.',
      'cp.moreOptions': 'گزینه‌های بیشتر',
      'cp.apFilter': 'فیلتر بر اساس تصمیم',
      'cp.apAll': 'همه', 'cp.apWaiting': 'منتظر پاسخ', 'cp.apApproved': 'تأییدشده', 'cp.apChanges': 'اصلاح', 'cp.apNotSent': 'ارسال نشده',
      'cp.apEmpty': 'هنوز تحویلی نیست.', 'cp.apNone': 'چیزی اینجا نیست.',
      'cp.colDeliv': 'تحویل', 'cp.colDecision': 'تصمیم', 'cp.colBy': 'تأییدکننده', 'cp.colTime': 'زمان', 'cp.colReact': 'واکنش‌ها',
      'cp.dcApproved': 'تأییدشده', 'cp.dcChanges': 'درخواست اصلاح', 'cp.dcWaiting': 'منتظر مشتری', 'cp.dcNotSent': 'هنوز ارسال نشده',
      'cp.likes': 'پسندها', 'cp.dislikes': 'نپسندها',
      'cp.nComments': { one: '{n} نظر', other: '{n} نظر' },
      'cp.cmEmpty': 'هنوز نظری نیست.',
      'cp.roleClient': 'مشتری', 'cp.roleTeam': 'تیم',
      'cp.replyLabel': 'پاسخ', 'cp.phReply': 'پاسخی بنویسید', 'cp.replySent': 'پاسخ ارسال شد', 'cp.replyEmpty': 'اول پاسخ را بنویسید.',
      'cp.flEmpty': 'هنوز فایلی نیست.',
      'cp.colName': 'نام', 'cp.colSource': 'منبع', 'cp.colType': 'نوع', 'cp.colSize': 'اندازه', 'cp.colDate': 'افزوده‌شده', 'cp.colStage': 'مرحله',
      'cp.colVersion': 'نسخه', 'cp.colOpen': 'باز کردن', 'cp.srcFile': 'فایل', 'cp.srcLink': 'پیوند',
      'cp.fileMissing': 'این فایل دیگر در این مرورگر نیست.',
      'cp.tplLabel': 'قالب:',
      'cp.fTitle': 'عنوان', 'cp.phTitle': 'کمپین رمضان ۲۰۲۷',
      'cp.fService': 'خدمت', 'cp.fStatus': 'وضعیت', 'cp.fPriority': 'اولویت', 'cp.fOwner': 'مسئول',
      'cp.fStart': 'تاریخ شروع', 'cp.fDue': 'تاریخ موعد',
      'cp.fSummary': 'خلاصه', 'cp.phSummary': 'سه فیلم رمضانی و یک ماه پست.',
      'cp.saveSettings': 'ذخیره',
      'cp.archive': 'علامت پایان‌یافته', 'cp.reopen': 'بازگشایی', 'cp.archived': 'پروژه پایان‌یافته شد', 'cp.reopened': 'پروژه دوباره باز شد',
      'cp.deleteProj': 'حذف پروژه', 'cp.deleteProjTitle': 'این پروژه حذف شود؟',
      'cp.deleteProjText': 'مرحله‌ها، تحویل‌ها، تأییدها و نظرهایش هم حذف می‌شوند. مشتری دیگر به آن‌ها دسترسی ندارد. این کار برگشت‌پذیر نیست.',
      'cp.projDeleted': 'پروژه حذف شد',
      'cp.projSt.planning': 'برنامه‌ریزی', 'cp.projSt.in_progress': 'در حال انجام', 'cp.projSt.review': 'بازبینی', 'cp.projSt.live': 'منتشرشده', 'cp.projSt.done': 'پایان‌یافته',
      'cp.stepSt.pending': 'در انتظار', 'cp.stepSt.in_progress': 'در حال انجام', 'cp.stepSt.waiting': 'منتظر مشتری', 'cp.stepSt.approved': 'تأییدشده', 'cp.stepSt.changes': 'درخواست اصلاح',
      'cp.delSt.draft': 'پیش‌نویس', 'cp.delSt.in_review': 'در بازبینی', 'cp.delSt.approved': 'تأییدشده', 'cp.delSt.changes': 'درخواست اصلاح', 'cp.delSt.published': 'منتشرشده',
      'cp.prio.low': 'کم', 'cp.prio.normal': 'عادی', 'cp.prio.high': 'بالا',
      'cp.kind.image': 'تصویر', 'cp.kind.video': 'ویدیو', 'cp.kind.post': 'پست', 'cp.kind.document': 'سند', 'cp.kind.link': 'پیوند',
      'cp.svc.video': 'تولید ویدیو', 'cp.svc.social': 'مدیریت ماهانهٔ شبکه‌های اجتماعی', 'cp.svc.brand': 'هویت بصری', 'cp.svc.web': 'وب‌سایت',
      'cp.svc.campaign': 'کمپین و تبلیغات', 'cp.svc.photo': 'عکاسی', 'cp.svc.other': 'سایر',
      'cp.wizTitle': 'پروژهٔ تازه', 'cp.wzSteps': 'مراحل ساختن پروژه', 'cp.wzName.1': 'نوع', 'cp.wzName.2': 'ساخت',
      'cp.wzTitle.1': 'چه نوع پروژه‌ای؟', 'cp.wzTitle.2': 'برای چه کسی است؟', 'cp.wzTitle.2b': 'یک نام بدهید', 'cp.wzDone': 'انجام شد',
      'cp.kw.video': 'ویدیو', 'cp.kw.social': 'اجتماعی', 'cp.kw.brand': 'هویت', 'cp.kw.web': 'وب‌سایت', 'cp.kw.campaign': 'کمپین', 'cp.kw.photo': 'عکاسی', 'cp.kw.blank': 'خالی',
      'cp.previewSteps': 'پیش‌نمایش مرحله‌ها', 'cp.previewHint': 'یک نوع انتخاب کنید تا مرحله‌هایش را ببینید.',
      'cp.fClient': 'مشتری', 'cp.chooseClient': 'یک مشتری انتخاب کنید', 'cp.newClient': 'مشتری تازه', 'cp.clientName': 'نام مشتری', 'cp.addClient': 'افزودن',
      'cp.errClient': 'یک مشتری انتخاب کنید.', 'cp.errClientName': 'یک نام بنویسید.', 'cp.errTemplate': 'یک نوع انتخاب کنید.',
      'cp.fTitleOpt': 'عنوان (اختیاری)',
      'cp.errTooLong': 'تا {max} نویسه نگه دارید.', 'cp.errDate': 'یک تاریخ درست وارد کنید، مثل ۲۰۲۶-۱۱-۳۰.',
      'cp.errDueBeforeStart': 'تاریخ موعد نمی‌تواند قبل از تاریخ شروع باشد.', 'cp.fixFirst': 'فیلدهای قرمز را درست کنید.',
      'cp.fLang': 'زبان', 'cp.langEn': 'انگلیسی', 'cp.langAr': 'عربی', 'cp.prioNone': 'تعیین نشده',
      'cp.codeTitle': 'مشتری افزوده شد', 'cp.codeLabel': 'رمز ورود', 'cp.codeWarn': 'فقط یک بار نشان داده می‌شود. همین حالا کپی‌اش کنید.', 'cp.codeLink': 'پیوند پورتال',
      'cp.copyCode': 'کپی رمز', 'cp.copyLink': 'کپی پیوند', 'cp.codeCopied': 'رمز کپی شد', 'cp.linkCopied': 'پیوند کپی شد', 'cp.codeDone': 'انجام شد',
      'cp.errMaxStages': 'پروژه حداکثر {max} مرحله می‌تواند داشته باشد.',
      'cp.currentFile': 'فایل فعلی:', 'cp.versionRaised': 'چون فایل جایگزین شد، نسخه به {v} رفت.',
      'cp.fDlTitle': 'نام', 'cp.phDlName': 'نسخهٔ نهایی ۱۶:۹',
      'cp.fDlDesc': 'توضیح', 'cp.phDlDesc': 'نسخهٔ ۱۶:۹ با زیرنویس فارسی، برای یوتیوب و وب‌سایت.',
      'cp.fDlDue': 'تاریخ موعد', 'cp.fDlVersion': 'نسخه', 'cp.dlKind': 'نوع',
      'cp.fSource': 'منبع', 'cp.fFile': 'فایل', 'cp.hFile': 'تصویر، MP4 یا PDF، تا ۲۵ مگابایت.', 'cp.fLink': 'پیوند',
      'cp.fileEmpty': 'فایل خالی است.', 'cp.fileType': 'یک تصویر (PNG، JPEG، WebP، GIF یا AVIF)، ویدیوی MP4 یا PDF بفرستید.',
      'cp.fileSize': 'حجم فایل بیشتر از ۲۵ مگابایت است.', 'cp.errNeedFile': 'یک فایل انتخاب کنید.',
      'cp.errLink': 'پیوند باید با https:// شروع شود.', 'cp.errVersion': 'یک عدد صحیح از ۱ تا ۹۹۹ وارد کنید.', 'cp.errRequired': 'این فیلد الزامی است.',
    },
  });

  /* ---------- writes: every change goes through act() (reload, redraw, say what happened) ---------- */
  /** Runs one change, reloads the data and redraws the workspace. Returns the API result, or null when it failed. */
  async function act(st, fn, { ok = '', undo = null, focus = '' } = {}) {
    try {
      const r = await fn();
      await loadAll();
      if (ok) MA.toast(esc(ok), undo ? { undo: async () => { try { await undo(); await loadAll(); if (st.alive) paint(st, focus); } catch (e) { fail(e); } } } : {});
      if (st.alive) paint(st, focus);
      return r || {};
    } catch (e) {
      fail(e);
      try { await loadAll(); } catch (x) { /* keep what the page had */ }
      if (st.alive) paint(st, focus);
      return null;
    }
  }

  /** Disables the primary button of an open dialog while a save runs. */
  function setBusy(L, on) {
    const box = L && L.el;
    if (!box) return;
    box.setAttribute('aria-busy', on ? 'true' : 'false');
    const b = box.querySelector('.modal-foot .btn.primary');
    if (b) b.disabled = !!on;
  }

  /** A file the browser can read and the portal accepts. Returns the message, or '' when it is fine. */
  function fileProblem(f) {
    if (!f || !f.size) return t('fileEmpty');
    if (!FILE_TYPES.includes(f.type)) return t('fileType');
    if (f.size > MAX_BYTES) return t('fileSize');
    return '';
  }

  async function setStepStatus(st, p, s, v) {
    const prev = s.status;
    if (v === prev) return;
    st.open[s.id] = isOpen(st, p, s);   // the step you are working on does not fold or open by itself when its status changes
    await act(st, () => api().admin.updateStep(s.id, { status: v, ...byName() }), {
      ok: t('saved'), undo: () => api().admin.updateStep(s.id, { status: prev, ...byName() }), focus: 'status-' + s.id,
    });
  }

  async function setDelStatus(st, p, d, v) {
    const prev = d.status;
    if (v === prev) return;
    const canUndo = DEL_ST.includes(prev);
    await act(st, () => api().admin.updateDeliverable(d.id, { status: v, ...byName() }), {
      ok: t('saved'), undo: canUndo ? () => api().admin.updateDeliverable(d.id, { status: prev, ...byName() }) : null, focus: 'dstatus-' + d.id,
    });
  }

  async function setProjectStatus(st, p, v) {
    const prev = p.status;
    if (v === prev) return;
    await act(st, () => api().admin.updateProject(p.id, { status: v, ...byName() }), {
      ok: v === 'done' ? t('archived') : t('reopened'), undo: () => api().admin.updateProject(p.id, { status: prev, ...byName() }), focus: 'set-title',
    });
  }

  /** Moves one step up or down (keyboard: Alt + Up or Down on any control of its row, or the Reorder buttons). */
  async function moveStage(st, p, s, dir) {
    if (!canEdit()) return;
    const ids = stepsOf(p).map(x => x.id);
    const i = ids.indexOf(s.id), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = ids.slice();
    next.splice(i, 1);
    next.splice(j, 0, s.id);
    await reorder(st, p, next, (st.custom ? 'grip-' : 'name-') + s.id);
  }

  /** Puts the stages in this order. Only the stages that move are sent, one moveStep each. */
  async function reorder(st, p, ids, focus) {
    if (!canEdit()) return;
    const cur = stepsOf(p).map(x => x.id);
    if (cur.join() === ids.join()) return;
    const order = cur.slice();
    await act(st, async () => {
      for (let i = 0; i < ids.length; i++) {
        if (order[i] === ids[i]) continue;
        await api().admin.moveStep(ids[i], i);
        order.splice(order.indexOf(ids[i]), 1);
        order.splice(i, 0, ids[i]);
      }
    }, { focus: focus || ('grip-' + ids[0]) });
  }

  /* ---------- step dialog: Add asks for the name (the rest is folded under More options); Edit shows every field, all optional, and Delete ---------- */
  function stageModal(st, p, s) {
    if (!canEdit()) return;
    const isNew = !s;
    if (isNew && stepsOf(p).length >= MAX.stages) { MA.toast(esc(t('errMaxStages', { max: MAX.stages })), { tone: 'bad' }); return; }
    const title = h('input.input', { value: s ? s.title : '', maxlength: MAX.title, placeholder: t('phStageName'), autocomplete: 'off', 'data-k': 'm-title' });
    const desc = h('textarea.textarea', { rows: 3, maxlength: MAX.desc, placeholder: t('phStageDesc'), 'data-k': 'm-desc' });
    desc.value = s ? s.description || '' : '';
    const owner = MA.ui.select(ownerOptions(s ? s.ownerName || '' : ''), s ? s.ownerName || '' : '', () => {}, { label: t('stageOwner') });
    owner.dataset.k = 'm-owner';
    const due = h('input.input', { type: 'date', value: s && s.dueDate ? s.dueDate : '', 'data-k': 'm-due' });
    const fT = MA.ui.field(t('stageName'), title);
    const fD = MA.ui.field(t('stageDesc'), desc);
    const fO = MA.ui.field(t('stageOwner'), owner);
    const fU = MA.ui.field(t('stageDue'), due);
    const extra = h('div.cp-form', fO, fU, fD);
    const [moreTog, moreBox] = isNew ? fold(extra, false) : [null, extra];
    let L = null;
    const save = async () => {
      markErr(fT, ''); markErr(fU, ''); markErr(fD, '');
      const v = title.value.trim();
      if (!v) { markErr(fT, t('errRequired')); title.focus(); return false; }
      if (v.length > MAX.title) { markErr(fT, t('errTooLong', { max: MAX.title })); return false; }
      if (due.value && !isDay(due.value)) { extra.hidden = false; moreTog?.setAttribute('aria-expanded', 'true'); markErr(fU, t('errDate')); due.focus(); return false; }
      if (desc.value.trim().length > MAX.desc) { extra.hidden = false; moreTog?.setAttribute('aria-expanded', 'true'); markErr(fD, t('errTooLong', { max: MAX.desc })); desc.focus(); return false; }
      const fields = { title: v, description: desc.value.trim() || null, ownerName: owner.value || null, dueDate: due.value || null };
      setBusy(L, true);
      const r = isNew
        ? await act(st, () => api().admin.createStep({ projectId: p.id, ...fields }), { ok: t('stAdded'), focus: 'add-stage' })
        : await act(st, () => api().admin.updateStep(s.id, { ...fields, ...byName() }), { ok: t('saved'), focus: 'edit-' + s.id });
      setBusy(L, false);
      return !!r;
    };
    const del = isNew ? null : h('div.cp-danger', MA.ui.btn(t('stDelete'), { kind: 'danger', icon: 'trash', onclick: () => stageDelete(st, p, s, L) }));
    if (del) del.firstChild.dataset.k = 'm-delete';
    L = MA.ui.modal({
      title: esc(isNew ? t('stNew') : t('stEdit')),
      body: h('div.cp-form', fT, moreTog, moreBox, del),
      initial: () => title,
      actions: [{ label: t('cancel'), kind: 'ghost' }, { label: t('save'), kind: 'primary', icon: 'check', run: save }],
    });
    L.el.classList.add('cp-dlg');
  }

  /** Asks first (a step takes its files with it), then closes the Edit dialog that asked and deletes. */
  async function stageDelete(st, p, s, L) {
    if (!canEdit()) return;
    const dels = delivsOf(p, s.id);
    const ok = await MA.ui.confirm(t('stDelTitle'), esc(t('stDelText', { count: dels.length, n: dels.length })), { ok: t('delete'), danger: true });
    if (!ok) return;
    if (L) L.close(true);
    await act(st, async () => {
      for (const d of dels) await api().admin.deleteDeliverable(d.id);
      await api().admin.deleteStep(s.id);
    }, { ok: t('stDeleted'), focus: 'add-stage' });
  }

  /* ---------- file or link dialog: Add asks for the name and the file or link (the rest is folded); Edit shows every field, all optional, and Delete ---------- */
  function deliverableModal(st, p, s, d) {
    if (!canEdit()) return;
    const isNew = !d;
    const hasFile = !!d && !!d.url && !isWeb(d.url);
    let source = d && isWeb(d.url) ? 'link' : 'file';
    let kindTouched = !isNew;   // a new file or link sets the kind from what is chosen, until the kind is picked by hand
    const title = h('input.input', { value: d ? d.title : '', maxlength: MAX.title, placeholder: t('phDlName'), autocomplete: 'off', 'data-k': 'm-title' });
    const kind = MA.ui.select(KINDS.map(k => ({ value: k, label: kindLabel(k) })), d ? d.kind : 'document', () => { kindTouched = true; }, { label: t('dlKind') });
    kind.dataset.k = 'm-kind';
    const desc = h('textarea.textarea', { rows: 2, maxlength: MAX.desc, placeholder: t('phDlDesc'), 'data-k': 'm-desc' });
    desc.value = d ? d.description || '' : '';
    const due = h('input.input', { type: 'date', value: d && d.dueDate ? d.dueDate : '', 'data-k': 'm-due' });
    const version = h('input.input', { type: 'number', min: '1', max: '999', step: '1', inputmode: 'numeric', value: d ? String(d.version) : '1', 'data-k': 'm-version' });
    const file = h('input.cp-file', { type: 'file', accept: FILE_ACCEPT, 'data-k': 'm-file' });
    const link = h('input.input', { type: 'url', placeholder: 'https://…', value: d && isWeb(d.url) ? d.url : '', autocomplete: 'off', spellcheck: 'false', 'data-k': 'm-link' });
    const current = d && d.url ? h('p.small', t('currentFile'), ' ', fileInfo(d)) : null;
    const bumped = h('p.tiny', { hidden: true }, '');
    const fT = MA.ui.field(t('fDlTitle'), title);
    const fK = MA.ui.field(t('dlKind'), kind);
    const fD = MA.ui.field(t('fDlDesc'), desc);
    const fU = MA.ui.field(t('fDlDue'), due);
    const fV = MA.ui.field(t('fDlVersion'), version);
    const fF = MA.ui.field(t('fFile'), file, { hint: t('hFile') });
    const fL = MA.ui.field(t('fLink'), link);
    const fileWrap = h('div.cp-srcwrap', { hidden: source !== 'file' }, fF, hasFile ? current : null, bumped);
    const linkWrap = h('div.cp-srcwrap', { hidden: source !== 'link' }, fL);
    const srcSeg = MA.ui.seg([{ value: 'file', label: t('srcFile') }, { value: 'link', label: t('srcLink') }], source, v => {
      source = v;
      fileWrap.hidden = v !== 'file';
      linkWrap.hidden = v !== 'link';
    }, { label: t('fSource') });
    const fS = h('div.field', h('span.field-label', t('fSource')), srcSeg);
    // adding: the name and the file or link are enough (the kind follows from them); the rest is folded. Editing: every field is there.
    const extra = h('div.cp-form', isNew ? fK : null, fD, fU, fV);
    const [moreTog, moreBox] = isNew ? fold(extra, false) : [null, extra];
    const showExtra = () => { extra.hidden = false; moreTog?.setAttribute('aria-expanded', 'true'); };
    const setKind = v => { if (!kindTouched) kind.value = v; };
    file.addEventListener('change', () => {
      markErr(fF, '');
      const f = file.files && file.files[0];
      if (!f) return;
      if (!title.value.trim()) title.value = f.name.replace(/\.[^.]+$/, '').slice(0, MAX.title);   // the file's name, until something better is typed
      setKind(f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'document');
      if (d && d.url) {
        version.value = String(d.version + 1);
        bumped.textContent = t('versionRaised', { v: MA.num(d.version + 1) });
        bumped.hidden = false;
      }
    });
    link.addEventListener('input', () => setKind(IMG_EXT.test(link.value.trim()) ? 'image' : 'link'));
    let L = null;
    const save = async () => {
      [fT, fD, fU, fV, fF, fL].forEach(f => markErr(f, ''));
      const v = title.value.trim();
      if (!v) { markErr(fT, t('errRequired')); title.focus(); return false; }
      if (v.length > MAX.title) { markErr(fT, t('errTooLong', { max: MAX.title })); return false; }
      if (desc.value.trim().length > MAX.desc) { showExtra(); markErr(fD, t('errTooLong', { max: MAX.desc })); return false; }
      if (due.value && !isDay(due.value)) { showExtra(); markErr(fU, t('errDate')); due.focus(); return false; }
      const n = Number(version.value);
      if (!Number.isInteger(n) || n < 1 || n > 999) { showExtra(); markErr(fV, t('errVersion')); version.focus(); return false; }
      let url, fileName, fileSize;
      if (source === 'file') {
        // no file chosen: the file stays as it is (a file can be named first and filled in later)
        const f = file.files && file.files[0];
        if (f) {
          const prob = fileProblem(f);
          if (prob) { markErr(fF, prob); return false; }
          setBusy(L, true);
          try {
            const up = await api().upload(f);
            url = up.url; fileName = f.name; fileSize = f.size;
          } catch (e) { setBusy(L, false); fail(e); return false; }
        }
      } else {
        const lk = link.value.trim();
        if (lk) {
          if (!isHttps(lk) || lk.length > MAX.url) { markErr(fL, t('errLink')); link.focus(); return false; }
          url = lk; fileName = null; fileSize = null;
        }
      }
      const fields = { title: v, kind: kind.value, description: desc.value.trim() || null, dueDate: due.value || null, version: n };
      setBusy(L, true);
      let ok = false;
      try {
        if (isNew) {
          await api().admin.createDeliverable({ projectId: p.id, stepId: s.id, ...fields, url: url || null, fileName: fileName || null, fileSize: fileSize || null, status: 'draft', ...byName() });
        } else {
          const patch = { ...fields, ...byName() };
          if (url !== undefined) { patch.url = url; patch.fileName = fileName; patch.fileSize = fileSize; }
          await api().admin.updateDeliverable(d.id, patch);
        }
        ok = true;
      } catch (e) { fail(e); }
      setBusy(L, false);
      if (!ok) return false;
      st.open[s.id] = true;   // the step you added to stays open
      await loadAll().catch(() => {});
      MA.toast(esc(isNew ? t('dlAdded') : t('saved')));
      if (st.alive) paint(st, isNew ? 'adddl-' + s.id : 'edit-' + d.id);
      return true;
    };
    const del = isNew ? null : h('div.cp-danger', MA.ui.btn(t('dlDelete'), { kind: 'danger', icon: 'trash', onclick: () => deliverableDelete(st, p, s, d, L) }));
    if (del) del.firstChild.dataset.k = 'm-delete';
    L = MA.ui.modal({
      title: esc(isNew ? t('dlNew') : t('dlEdit')),
      body: h('div.cp-form', fT, isNew ? null : fK, fS, fileWrap, linkWrap, moreTog, moreBox, del),
      initial: () => title,
      actions: [{ label: t('cancel'), kind: 'ghost' }, { label: t('save'), kind: 'primary', icon: 'check', run: save }],
    });
    L.el.classList.add('cp-dlg');
    resolveFiles(L.el);
  }

  /** Asks first (its approval and reactions go with it), then closes the Edit dialog that asked and deletes. */
  async function deliverableDelete(st, p, s, d, L) {
    if (!canEdit()) return;
    const ok = await MA.ui.confirm(t('dlDelTitle'), esc(t('dlDelText')), { ok: t('delete'), danger: true });
    if (!ok) return;
    if (L) L.close(true);
    await act(st, () => api().admin.deleteDeliverable(d.id), { ok: t('dlDeleted'), focus: 'adddl-' + s.id });
  }

  /* ---------- settings ---------- */
  async function saveSettings(st, p, f) {
    if (!canEdit()) return;
    [f.fT, f.fSd, f.fDd, f.fSm].forEach(x => markErr(x, ''));
    const title = f.title.value.trim();
    if (!title) { markErr(f.fT, t('errRequired')); f.title.focus(); return; }
    if (title.length > MAX.title) { markErr(f.fT, t('errTooLong', { max: MAX.title })); return; }
    if (f.start.value && !isDay(f.start.value)) { markErr(f.fSd, t('errDate')); f.start.focus(); return; }
    if (f.due.value && !isDay(f.due.value)) { markErr(f.fDd, t('errDate')); f.due.focus(); return; }
    if (f.start.value && f.due.value && f.due.value < f.start.value) { markErr(f.fDd, t('errDueBeforeStart')); f.due.focus(); return; }
    const summary = f.summary.value.trim();
    if (summary.length > MAX.summary) { markErr(f.fSm, t('errTooLong', { max: MAX.summary })); f.summary.focus(); return; }
    const patch = {
      title, service: f.service.value, status: f.status.value, priority: f.prio.value || null,
      ownerName: f.owner.value || null, startDate: f.start.value || null, dueDate: f.due.value || null, summary: summary || null,
    };
    await act(st, () => api().admin.updateProject(p.id, { ...patch, ...byName() }), { ok: t('saved'), focus: 'save' });
  }

  async function deleteProject(st, p) {
    if (!canEdit()) return;
    const ok = await MA.ui.confirm(t('deleteProjTitle'), esc(t('deleteProjText')), { ok: t('deleteProj'), danger: true });
    if (!ok) return;
    try {
      await api().admin.deleteProject(p.id);
    } catch (e) { fail(e); return; }
    try { await loadAll(); } catch (e) { /* the list reloads when it is opened */ }
    MA.toast(esc(t('projDeleted')));
    MA.go(p.clientId ? '#/clients/' + p.clientId : '#/clients');
  }

  /* ---------- the new-project wizard: the kind of project, then the client and a title ---------- */
  const freshWz = () => ({
    step: 1, clientId: '', locked: false, templateKey: '',
    title: '', summary: '', owner: '', priority: '', startDate: '', dueDate: '', lang: MA.lang() === 'en' ? 'en' : 'ar',
    more: false, preview: false, qa: { open: false, value: '', err: '', busy: false },
    errs: {}, busy: false, focus: '',
  });
  /** The wizard's state. It starts fresh each time the wizard opens. locked: the client was chosen before it opened (from a client page). */
  let WZ = freshWz();
  let HOST = null;   // where the wizard is drawn now: { el, ctl: { modal, close } }

  /** Starts a fresh draft. A client given here is already chosen: the second step then asks only for the title. */
  function startDraft(clientId) {
    WZ = freshWz();
    if (clientId) { WZ.clientId = clientId; WZ.locked = true; }
  }

  /**
   * Opens the new-project wizard as a full-screen dialog. opts.clientId chooses the client (a client page passes its own).
   * Resolves with the new project's id, or null when it is closed without creating one.
   */
  function wizard(opts = {}) {
    return new Promise(resolve => {
      if (!canEdit()) { MA.toast(esc(t('readOnly')), { tone: 'bad' }); resolve(null); return; }
      startDraft(opts.clientId);
      let made = null;
      const L = MA.ui.modal({
        title: esc(t('wizTitle')),
        size: 'xwide',
        body: el => { wizardInto(el, { modal: true, close: pid => { made = pid || null; L.close(); } }); },
        onClose: () => resolve(made),
      });
      L.el.classList.add('cp-full', 'cp-dlg');
    });
  }

  async function wizardInto(el, ctl) {
    HOST = { el, ctl };
    el.replaceChildren(skeleton());
    try { await loadAll(); } catch (e) {
      if (HOST && HOST.el === el) el.replaceChildren(failedView(() => wizardInto(el, ctl)));
      return;
    }
    if (!HOST || HOST.el !== el || !el.isConnected) return;
    if (WZ.locked && !clientById(WZ.clientId)) { WZ.locked = false; WZ.clientId = ''; }   // the client is gone: ask for one
    paintWiz({ head: true });
  }

  /** The page version (#/clients/projects/new): the same two steps, in the page instead of a dialog. ?client=<id> chooses the client. */
  function mountWizardPage(st) {
    if (!canEdit()) {
      st.root.replaceChildren(MA.ui.empty({ title: t('readOnly'), icon: 'lock', compact: true, actions: [MA.ui.btn(t('backToClients'), { icon: 'arrowLeft', href: '#/clients' })] }));
      return;
    }
    startDraft((st.ctx && st.ctx.query && st.ctx.query.get('client')) || '');
    const body = h('div.cp-wiz-page');
    st.root.replaceChildren(MA.ui.pageHead({ title: esc(t('wizTitle')) }), body);
    wizardInto(body, { modal: false, close: null });
  }

  function paintWiz(o = {}) {
    const H = HOST;
    if (!H || !H.el || !H.el.isConnected) return;
    const heading = WZ.step === 1 ? t('wzTitle.1') : t(WZ.locked ? 'wzTitle.2b' : 'wzTitle.2');
    const wrap = h('div.cp-wiz',
      stepsBar(),
      h('div.cp-wiz-body',
        h('h2.h2.cp-wiz-h', { tabindex: '-1' }, heading),
        WZ.step === 2 && Object.keys(WZ.errs).length ? h('p.cp-alert', { role: 'alert' }, t('fixFirst')) : null,
        WZ.step === 1 ? stepKind() : stepFinish()),
      footBar());
    H.el.replaceChildren(wrap);
    const f = WZ.focus;
    WZ.focus = '';
    if (f) { focusData(wrap, f); return; }
    if (Object.keys(WZ.errs).length) { const bad = wrap.querySelector('[aria-invalid="true"]'); if (bad) { bad.focus({ preventScroll: true }); return; } }
    if (o.head) wrap.querySelector('.cp-wiz-h')?.focus({ preventScroll: true });
  }

  function stepsBar() {
    return h('ol.cp-wiz-steps', { 'aria-label': t('wzSteps') }, [1, 2].map(n => h('li',
      { class: n < WZ.step ? 'is-done' : n === WZ.step ? 'is-current' : null, 'aria-current': n === WZ.step ? 'step' : null },
      h('span.cp-wiz-n', MA.num(n)),
      h('span.cp-wiz-name', t('wzName.' + n)),
      h('span.sr-only', n < WZ.step ? t('wzDone') : ''))));
  }

  function footBar() {
    const back = WZ.step > 1 ? MA.ui.btn(t('back'), { kind: 'ghost', onclick: () => goStep(1) }) : null;
    if (back) back.dataset.act = 'back';
    const cancel = MA.ui.btn(t('cancel'), { kind: 'ghost', onclick: cancelWizard });
    cancel.dataset.act = 'cancel';
    return h('div.cp-wiz-foot', h('div.cp-wiz-left', back), h('div.cp-wiz-right', cancel));
  }

  /** Moves to a step. The heading takes focus, so the new step is announced. */
  function goStep(n) {
    WZ.errs = {};
    WZ.step = n;
    paintWiz({ head: true });
  }

  function cancelWizard() {
    const ctl = HOST && HOST.ctl;
    if (ctl && ctl.modal) ctl.close(null);
    else MA.go('#/clients');
  }

  /** Closes the wizard and opens the new project on its Steps page. */
  function finish(pid) {
    const ctl = HOST && HOST.ctl;
    if (ctl && ctl.modal) ctl.close(pid);
    MA.go('#/clients/projects/' + pid + '/steps');
  }

  /* ---------- step 1: what kind of project? One big icon for each template, one word under it. Choosing one goes straight on. ---------- */
  function stepKind() {
    const keys = TPL_KEYS.filter(k => tplByKey(k));
    if (!keys.length) return MA.ui.empty({ title: t('loadFailed'), text: t('loadFailedText'), icon: 'warn', compact: true });
    return h('div.cp-stack',
      WZ.errs.template ? h('p.err', { role: 'alert' }, WZ.errs.template) : null,
      h('ul.cp-tiles', { role: 'list', 'aria-label': t('wzTitle.1') }, keys.map(k => h('li', tile(k)))),
      previewRow());
  }

  function tile(key) {
    const b = h('button.cp-tile', {
      type: 'button', 'data-tpl': key, 'data-k': 'tpl-' + key, 'aria-pressed': WZ.templateKey === key ? 'true' : null,
      onclick: () => pickKind(key), onkeydown: tileKey,
    });
    b.innerHTML = `<span class="cp-tile-ic" aria-hidden="true">${MA.icon(TPL_ICON[key] || 'plus')}</span><span class="cp-tile-name">${esc(t('kw.' + key))}</span>`;
    return b;
  }

  /** Choosing a kind goes straight to the next step. With "Preview steps" on, it only chooses, and the steps show under the grid. */
  function pickKind(key) {
    WZ.templateKey = key;
    WZ.errs = {};
    if (WZ.preview) { WZ.focus = 'tpl-' + key; paintWiz({}); return; }
    goStep(2);
  }

  /** Arrow keys move between the tiles (they do not choose); Home and End go to the first and the last. */
  function tileKey(e) {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
    const list = [...e.currentTarget.closest('ul').querySelectorAll('button.cp-tile')];
    const i = list.indexOf(e.currentTarget);
    if (i < 0) return;
    e.preventDefault();
    let j = i;
    if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = list.length - 1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const forward = (e.key === 'ArrowRight') !== (getComputedStyle(e.currentTarget).direction === 'rtl');
      j = Math.max(0, Math.min(list.length - 1, i + (forward ? 1 : -1)));
    } else {
      // up and down: the nearest tile in the next row that way
      const me = list[i].getBoundingClientRect(), down = e.key === 'ArrowDown';
      let best = Infinity;
      list.forEach((b, k) => {
        const r = b.getBoundingClientRect(), dy = r.top - me.top;
        if (down ? dy < 8 : dy > -8) return;
        const dist = Math.abs(dy) * 1000 + Math.abs(r.left - me.left);
        if (dist < best) { best = dist; j = k; }
      });
    }
    list[j].focus();
  }

  /** A quiet toggle under the grid. On, it shows the chosen kind's steps as chips (and a Next button to go on). Off by default. */
  function previewRow() {
    const tog = toggle(t('previewSteps'), { icon: 'eye', pressed: WZ.preview, act: 'preview', k: 'preview', onclick: () => {
      WZ.preview = !WZ.preview;
      WZ.focus = 'preview';
      paintWiz({});
    } });
    let panel = null;
    if (WZ.preview) {
      const tp = tplByKey(WZ.templateKey);
      const next = MA.ui.btn(t('next'), { kind: 'primary', icon: 'arrowRight', onclick: () => goStep(2) });
      next.dataset.act = 'next';
      panel = tp
        ? h('div.cp-prev',
            h('ol.cp-chips', { 'aria-label': t('previewSteps') }, tp.steps.map(s => h('li.cp-chip', { lang: WZ.lang, dir: 'auto' }, s.title[WZ.lang] || s.title.en))),
            h('div.btn-row', next))
        : h('p.small.muted', t('previewHint'));
    }
    return h('div.cp-prevrow', tog, panel);
  }

  /* ---------- step 2: the client and a title. Nothing else is needed; the rest is under More options. ---------- */
  /** The title a project gets when none is typed: "<kind> · <client>" in the project's language (portal/API.md, Simple creation). */
  function autoTitle() {
    const tp = tplByKey(WZ.templateKey), L = WZ.lang;
    const base = tp && tp.key !== 'blank' ? (tp.name[L] || tp.name.en) : GENERIC_PROJECT[L];
    const who = displayName(clientById(WZ.clientId));
    return clip(who ? base + ' · ' + who : base, MAX.title);
  }

  function stepFinish() {
    const e = WZ.errs;
    const client = clientById(WZ.clientId);
    const chosen = h('div.cp-chosen',
      h('span.cp-chosen-i', { 'aria-hidden': 'true', html: MA.icon(TPL_ICON[WZ.templateKey] || 'plus') }),
      h('span', t('kw.' + WZ.templateKey)),
      WZ.locked && client ? h('span.cp-chosen-who', ' · ', U(displayName(client))) : null);
    const titleIn = h('input.input', { value: WZ.title, maxlength: MAX.title, placeholder: autoTitle(), autocomplete: 'off', 'data-k': 'wz-title' });
    titleIn.addEventListener('input', () => { WZ.title = titleIn.value; });
    titleIn.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); createNow(); } });
    const moreTog = toggle(t('moreOptions'), { icon: 'chevDown', expanded: WZ.more, act: 'more', k: 'more', onclick: () => {
      WZ.more = !WZ.more;
      WZ.focus = 'more';
      paintWiz({});
    } });
    const create = MA.ui.btn(WZ.busy ? t('creating') : t('createProject'), { kind: 'primary', size: 'lg', icon: 'plus', disabled: WZ.busy, onclick: createNow });
    create.dataset.act = 'create';
    create.dataset.k = 'create';
    return h('div.cp-finish',
      chosen,
      WZ.locked ? null : clientField(e, titleIn),
      MA.ui.field(t('fTitleOpt'), titleIn, { err: e.title }),
      moreTog,
      WZ.more ? moreFields(e, titleIn) : null,
      h('div.cp-go', create));
  }

  /** The client: a list of their names (a name, else the company), and New client beside it, which opens a single field. */
  function clientField(e, titleIn) {
    const list = D.clients.slice().sort((a, b) => displayName(a).localeCompare(displayName(b)));
    const open = WZ.qa.open || !list.length;
    let sel = null;
    if (list.length) {
      sel = MA.ui.select([{ value: '', label: t('chooseClient') }].concat(list.map(c => ({ value: c.id, label: displayName(c) }))), WZ.clientId, v => {
        WZ.clientId = v;
        titleIn.placeholder = autoTitle();
      }, { label: t('fClient') });
      sel.dataset.k = 'wz-client';
    }
    const newBtn = MA.ui.btn(t('newClient'), { icon: 'plus', kind: 'ghost', size: 'sm', onclick: () => {
      WZ.qa.open = true;
      WZ.focus = 'wz-qa';
      paintWiz({});
    } });
    newBtn.dataset.act = 'new-client';
    return MA.ui.field(t('fClient'), h('div.cp-client', sel ? h('div.cp-inline', sel, open ? null : newBtn) : null, open ? quickAdd(!!list.length) : null), { err: e.client });
  }

  /** The New client quick-add: one field, the client's name. The portal makes the link name and the access code. */
  function quickAdd(canClose) {
    const qa = WZ.qa;
    const inp = h('input.input', { value: qa.value, maxlength: MAX.client, placeholder: t('clientName'), autocomplete: 'off', 'aria-label': t('clientName'), 'data-k': 'wz-qa' });
    inp.addEventListener('input', () => { qa.value = inp.value; });
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); ev.stopPropagation(); addClientNow(); } });
    const add = MA.ui.btn(t('addClient'), { icon: 'check', size: 'sm', disabled: qa.busy, onclick: addClientNow });
    add.dataset.act = 'add-client';
    const close = canClose ? ib('close', t('cancel'), false, () => { qa.open = false; qa.err = ''; WZ.focus = 'wz-client'; paintWiz({}); }, 'qa-close') : null;
    return h('div.cp-qa', h('div.cp-inline', inp, add, close), qa.err ? h('p.err', { role: 'alert' }, qa.err) : null);
  }

  /** Makes the client from the name alone, chooses it, and shows its access code once. */
  async function addClientNow() {
    const qa = WZ.qa;
    if (qa.busy) return;
    const name = qa.value.trim();
    qa.err = '';
    if (!name) qa.err = t('errClientName');
    else if (name.length > MAX.client) qa.err = t('errTooLong', { max: MAX.client });
    if (qa.err) { WZ.focus = 'wz-qa'; paintWiz({}); return; }
    qa.busy = true;
    let made;
    try { made = await api().admin.createClient({ name }); } catch (e) {
      qa.busy = false;
      qa.err = t(ERR[e && e.code] || 'err.server');
      WZ.focus = 'wz-qa';
      paintWiz({});
      return;
    }
    try { await loadAll(); } catch (e) { /* the list is read again the next time it is drawn */ }
    WZ.clientId = made.client.id;
    WZ.qa = { open: false, value: '', err: '', busy: false };
    paintWiz({});
    codeDialog(made.client, made.code, () => { WZ.focus = 'wz-title'; paintWiz({}); });
  }

  /** The portal link of a client (the same address the Clients page copies). */
  const portalUrl = slug => location.origin + (api() && api().mode === 'remote' ? '/portal/' + slug : '/portal/?c=' + slug);

  /** The new client's access code. It is shown once and cannot be read again, so the dialog stays until it is closed on purpose. */
  function codeDialog(client, code, done) {
    const link = portalUrl(client.slug);
    const copyBtn = MA.ui.btn(t('copyCode'), { icon: 'copy', size: 'sm', onclick: () => MA.copy(code, t('codeCopied')) });
    const codeBox = h('div.cp-codebox', h('code.cp-code', { dir: 'ltr' }, code), copyBtn);
    const linkBox = h('div.cp-codebox', h('input.input', { value: link, readonly: true, dir: 'ltr', spellcheck: 'false' }),
      MA.ui.btn(t('copyLink'), { icon: 'link', size: 'sm', onclick: () => MA.copy(link, t('linkCopied')) }));
    const L = MA.ui.modal({
      title: esc(t('codeTitle')),
      body: h('div.cp-form',
        h('p.cp-code-who', U(displayName(client))),
        h('div.field', h('span.field-label', t('codeLabel')), codeBox),
        h('p.small', t('codeWarn')),
        MA.ui.field(t('codeLink'), linkBox)),
      dismissable: false,
      initial: () => copyBtn,
      onClose: done,
      actions: [{ label: t('codeDone'), kind: 'primary', icon: 'check' }],
    });
    L.el.classList.add('cp-dlg');
  }

  /** Summary, owner, priority, dates and language: all optional, and drawn only when More options is open. */
  function moreFields(e, titleIn) {
    const sumIn = h('textarea.textarea', { rows: 3, maxlength: MAX.summary, 'data-k': 'wz-summary' });
    sumIn.value = WZ.summary;
    sumIn.addEventListener('input', () => { WZ.summary = sumIn.value; });
    const sumField = MA.ui.field(t('fSummary'), sumIn, { err: e.summary });
    sumField.classList.add('cp-wide');
    const owner = MA.ui.select(ownerOptions(WZ.owner), WZ.owner, v => { WZ.owner = v; }, { label: t('fOwner') });
    owner.dataset.k = 'wz-owner';
    const prio = MA.ui.select([{ value: '', label: t('prioNone') }].concat(PRIO.map(v => ({ value: v, label: prioLabel(v) }))), WZ.priority, v => { WZ.priority = v; }, { label: t('fPriority') });
    prio.dataset.k = 'wz-priority';
    const startIn = h('input.input', { type: 'date', value: WZ.startDate, 'data-k': 'wz-start' });
    const dueIn = h('input.input', { type: 'date', value: WZ.dueDate, 'data-k': 'wz-due' });
    ['input', 'change'].forEach(ev => {
      startIn.addEventListener(ev, () => { WZ.startDate = startIn.value; });
      dueIn.addEventListener(ev, () => { WZ.dueDate = dueIn.value; });
    });
    const lang = MA.ui.seg([{ value: 'en', label: t('langEn') }, { value: 'ar', label: t('langAr') }], WZ.lang, v => {
      WZ.lang = v;
      titleIn.placeholder = autoTitle();
    }, { label: t('fLang') });
    return h('div.cp-grid2.cp-more',
      sumField,
      MA.ui.field(t('fOwner'), owner),
      MA.ui.field(t('fPriority'), prio),
      MA.ui.field(t('fStart'), startIn, { err: e.start }),
      MA.ui.field(t('fDue'), dueIn, { err: e.due }),
      h('div.field', h('span.field-label', t('fLang')), lang));
  }

  /** What stops a project from being made. Only the kind and the client are needed; the rest must be right if it is given. */
  function checkAll() {
    const e = {};
    if (!tplByKey(WZ.templateKey)) e.template = t('errTemplate');
    if (!clientById(WZ.clientId)) e.client = t('errClient');
    if (WZ.title.trim().length > MAX.title) e.title = t('errTooLong', { max: MAX.title });
    if (WZ.summary.trim().length > MAX.summary) e.summary = t('errTooLong', { max: MAX.summary });
    if (WZ.startDate && !isDay(WZ.startDate)) e.start = t('errDate');
    if (WZ.dueDate && !isDay(WZ.dueDate)) e.due = t('errDate');
    if (!e.start && !e.due && WZ.startDate && WZ.dueDate && WZ.dueDate < WZ.startDate) e.due = t('errDueBeforeStart');
    return e;
  }

  /** What createProject is given: the client and the kind, and only the optional values that were filled in. A blank title is left out, so the portal makes it. */
  function projectInput() {
    const input = { clientId: WZ.clientId, templateKey: WZ.templateKey, language: WZ.lang, status: 'planning' };
    if (WZ.title.trim()) input.title = WZ.title.trim();
    if (WZ.summary.trim()) input.summary = WZ.summary.trim();
    if (WZ.owner) input.ownerName = WZ.owner;
    if (WZ.priority) input.priority = WZ.priority;
    if (WZ.startDate) input.startDate = WZ.startDate;
    if (WZ.dueDate) input.dueDate = WZ.dueDate;
    return input;
  }

  /** Checks, makes the project, and opens its Steps page. The steps and the suggested deliverables come from the template. */
  async function createNow() {
    if (WZ.busy) return;
    const e = checkAll();
    if (Object.keys(e).length) {
      WZ.errs = e;
      if (e.template) WZ.step = 1;
      else if (e.summary || e.start || e.due) WZ.more = true;
      paintWiz({ head: !!e.template });
      return;
    }
    WZ.busy = true;
    WZ.errs = {};
    paintWiz({});
    let pid = null;
    try {
      pid = (await api().admin.createProject(projectInput())).project.id;
    } catch (err) {
      WZ.busy = false;
      fail(err);
      paintWiz({});
      return;
    }
    WZ.busy = false;
    startDraft('');
    MA.toast(esc(t('created')));
    finish(pid);
  }

  /* ---------- the public API: the clients module calls these ---------- */
  MA.clientsProject = { wizard, render };
})();
