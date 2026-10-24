/* =====================================================================
   MIRAS admin — data layer: team, leads (briefs), metrics.
   Everything lives in this browser (localStorage), like the rest of the admin.
   Sample data is generated deterministically, always flagged `sample: true`, and hidden when prefs.sampleData is off.
   The device is the only copy: MA.backup (core) nudges for backups and asks the browser to persist storage.
   Real data:
     · briefs sent from the site on this browser       → localStorage 'miras.leads.inbox' (written by index.html)
     · interaction events from the site on this browser → localStorage 'miras.events'      (written by index.html)
     · anything imported (CSV/JSON) or added by hand
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA;
  const DAY = 864e5;

  /* ---------- deterministic randomness (so sample data never changes between reloads) ---------- */
  const hash = s => { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; };
  MA.rng = seed => hash(String(seed));
  /** Date → 'YYYY-MM-DD' in Qatar time (the studio's day). */
  const qDayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit' });
  const qHourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Qatar', hour: '2-digit', hour12: false });
  const qDay = d => qDayFmt.format(new Date(d));
  const qHour = d => +qHourFmt.format(new Date(d)) % 24;
  const qWeekday = ds => new Date(ds + 'T12:00:00Z').getUTCDay(); // 0 = Sunday
  /** 'YYYY-MM-DD' ± n days (calendar arithmetic, no time zone involved). */
  const addDays = (ds, n) => new Date(Date.parse(ds + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
  const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / DAY);
  MA.qDay = qDay; MA.qHour = qHour; MA.addDays = addDays;

  /* ================= team ================= */
  // The owner starts unnamed (shown as a localized "You" until they add their name); seed titles follow the admin language until edited.
  const TEAM_SEED = [
    { id: 'u-owner', name: '', unnamed: true, email: 'hello@miras.qa', role: 'owner', title: '', titleKey: 'founder', color: '#2B3BF0', status: 'active' },
    { id: 'u-noor', name: 'Noor Al-Kuwari', email: 'noor@miras.qa', role: 'editor', title: '', titleKey: 'producer', color: '#FF5A23', status: 'active', sample: true },
    { id: 'u-rami', name: 'Rami Haddad', email: 'rami@miras.qa', role: 'sales', title: '', titleKey: 'partner', color: '#1E9E6E', status: 'active', sample: true },
    { id: 'u-lina', name: 'Lina Saeed', email: 'lina@miras.qa', role: 'editor', title: '', titleKey: 'designer', color: '#0D0F2E', status: 'invited', sample: true },
  ];
  const SEED_TITLES = { 'u-owner': ['Founder', 'founder'], 'u-noor': ['Producer', 'producer'], 'u-rami': ['Client partner', 'partner'], 'u-lina': ['Designer', 'designer'] };
  const youName = () => MA.t('core.you'), seedTitle = k => MA.t('core.title.' + k);
  /** Stored member → what the UI shows. */
  const view = m => !m || !((m.unnamed && !m.name) || (m.titleKey && !m.title)) ? m : { ...m, name: m.name || (m.unnamed ? youName() : ''), title: m.title || (m.titleKey ? seedTitle(m.titleKey) : '') };
  /** A shown member (or a patch made from one) → what is stored: the placeholders never get frozen into one language. */
  const unview = (stored, patch) => {
    const p = { ...patch };
    if ('name' in p && stored?.unnamed) { if (!String(p.name || '').trim() || ['You', 'أنت', 'شما', youName()].includes(String(p.name).trim())) delete p.name; else p.unnamed = false; }
    if ('title' in p && stored?.titleKey) { if (!p.title || p.title === seedTitle(stored.titleKey) || p.title === SEED_TITLES[stored.id]?.[0]) delete p.title; else p.titleKey = null; }
    return p;
  };
  /** Teams saved by older versions: the seeded English owner name and titles become placeholders. */
  const migrateTeam = list => {
    let changed = false;
    for (const m of list) {
      if (m.id === 'u-owner' && m.name === 'Studio owner') { m.name = ''; m.unnamed = true; changed = true; }
      const st = SEED_TITLES[m.id]; if (st && m.title === st[0] && !m.titleKey) { m.title = ''; m.titleKey = st[1]; changed = true; }
    }
    return changed;
  };
  /** The demo teammates are only stored while sample data is on (Customize › Sample data); turning it on adds them back. */
  const ensureTeamSamples = () => { if (MA.prefs.get('sampleData') && !MA.team.raw().some(m => m.sample)) MA.db.set('team', MA.team.raw().concat(MA.clone(TEAM_SEED.filter(m => m.sample)))); };
  MA.team = {
    /** Stored records (the unnamed owner has name ''). */
    raw() { let list = MA.db.get('team', null); if (!Array.isArray(list)) { list = MA.clone(TEAM_SEED.filter(m => !m.sample || MA.prefs.get('sampleData'))); MA.db.set('team', list); } else if (migrateTeam(list)) MA.db.set('team', list); return list; },
    all: () => { ensureTeamSamples(); return MA.team.raw().filter(m => !m.sample || MA.prefs.get('sampleData')).map(view); },
    get: id => view(MA.team.raw().find(m => m.id === id)),
    /** The current person as stored: name is '' until the owner names themselves (so emails sign as the studio). Show it with display(). */
    me: () => { const all = MA.team.raw(), m = all.find(x => x.id === MA.prefs.get('me')) || all.find(x => x.role === 'owner') || all[0]; return m && m.titleKey && !m.title ? { ...m, title: seedTitle(m.titleKey) } : m; },
    /** Name to show for a member: a localized "You" for the unnamed owner. */
    display: m => m ? (m.name || (m.unnamed ? youName() : '')) : '',
    add(m) { const list = MA.team.raw(), n = { id: MA.uid('u-'), status: 'invited', role: 'editor', color: ['#2B3BF0', '#FF5A23', '#1E9E6E', '#0D0F2E', '#8098FD'][list.length % 5], invitedAt: new Date().toISOString(), ...m }; list.push(n); MA.db.set('team', list); MA.emit('team'); return n; },
    update(id, patch, { silent } = {}) { MA.db.set('team', MA.team.raw().map(m => m.id === id ? { ...m, ...unview(m, patch) } : m)); if (!silent) MA.emit('team'); },
    remove(id) { const m = MA.team.get(id); MA.db.set('team', MA.team.raw().filter(x => x.id !== id)); MA.emit('team'); return m; },
    restore(m) {
      const list = MA.team.raw(), r = { ...m };
      if (r.unnamed && !('name' in unview(r, { name: r.name }))) r.name = ''; // a "You" placeholder goes back to unnamed
      if (r.titleKey && !('title' in unview(r, { title: r.title }))) r.title = '';
      list.push(r); MA.db.set('team', list); MA.emit('team');
    },
    name: id => MA.team.display(MA.team.get(id)),
  };

  /* ================= leads (briefs from the site + anything added by hand) ================= */
  const STAGES = [
    { id: 'new', en: 'New brief', ar: 'طلب جديد', fa: 'درخواست تازه', color: 'var(--tide)', target: 1 },
    { id: 'call', en: 'Discovery call', ar: 'مكالمة تعارف', fa: 'تماس آشنایی', color: 'var(--tide60)', target: 5 },
    { id: 'proposal', en: 'Proposal sent', ar: 'أُرسل العرض', fa: 'پیشنهاد ارسال شد', color: '#C98A00', target: 10 },
    { id: 'negotiating', en: 'Negotiating', ar: 'تفاوض', fa: 'در حال مذاکره', color: 'var(--flare)', target: 14 },
    { id: 'won', en: 'Won', ar: 'تم الاتفاق', fa: 'قرارداد بسته شد', color: '#1E9E6E', closed: true },
    { id: 'lost', en: 'Lost', ar: 'لم يتم', fa: 'از دست رفت', color: 'var(--ink4)', closed: true },
  ];
  const SOURCES = [
    { id: 'site', en: 'Website brief', ar: 'طلب من الموقع', fa: 'درخواست از سایت', icon: 'globe' },
    { id: 'email', en: 'Email', ar: 'بريد إلكتروني', fa: 'ایمیل', icon: 'mail' },
    { id: 'whatsapp', en: 'WhatsApp', ar: 'واتساب', fa: 'واتس‌اپ', icon: 'whatsapp' },
    { id: 'referral', en: 'Referral', ar: 'توصية', fa: 'معرفی', icon: 'team' },
    { id: 'instagram', en: 'Instagram', ar: 'إنستغرام', fa: 'اینستاگرام', icon: 'image' },
    { id: 'linkedin', en: 'LinkedIn', ar: 'لينكدإن', fa: 'لینکدین', icon: 'link' },
    { id: 'event', en: 'Event', ar: 'فعالية', fa: 'رویداد', icon: 'calendar' },
    { id: 'manual', en: 'Added by hand', ar: 'أُضيف يدوياً', fa: 'افزوده‌شده به‌صورت دستی', icon: 'edit' },
    { id: 'import', en: 'Imported', ar: 'مستورد', fa: 'واردشده', icon: 'upload' },
  ];
  // fictional sample briefs — flagged sample:true and clearly badged in the UI
  const SAMPLE_PEOPLE = [
    ['Maryam Al-Thani', 'Dar Lusail Properties', 'en', ['launch', 'film'], 'site', 85000, "We open a new residential tower in March and need the whole launch: film, social and the launch-day plan. Budget is flexible for the right idea."],
    ['Khalid Al-Mansoori', 'Sidra Coffee Roasters', 'ar', ['scattered', 'social'], 'site', 42000, 'نملك ثلاثة فروع وكل فرع يبدو مختلفاً. نحتاج هوية واحدة ومحتوى شهري يشبهنا.'],
    ['Aisha Rahman', 'Qatar Heritage Walks', 'en', ['web'], 'email', 28000, 'Our booking site is slow on phones and only in English. We want something bilingual that gets people to book.'],
    ['Omar Farouk', 'Pearl Fitness Club', 'en', ['social', 'remember'], 'instagram', 36000, 'Followers but no members. We need a campaign that turns followers into sign-ups.'],
    ['Hessa Al-Sulaiti', 'Hessa Atelier', 'ar', ['scattered'], 'referral', 55000, 'دار أزياء صغيرة نريد هوية فاخرة وتغليفاً قبل افتتاح المتجر.'],
    ['Daniel Brooks', 'Gulf Logistics Hub', 'en', ['film'], 'linkedin', 64000, 'Corporate film for our 10-year anniversary. Needs to feel human, not like a brochure.'],
    ['Fatima Al-Kaabi', 'Nour Clinics', 'ar', ['web', 'social'], 'site', 47000, 'موقع جديد للعيادات مع حجز المواعيد، وخطة محتوى توعوية.'],
    ['Yousef Nasser', 'Doha Padel League', 'en', ['launch', 'remember'], 'event', 39000, 'Season 2 launch in November. We want a campaign people actually talk about.'],
    ['Sara Haddad', 'Sanad Fintech', 'en', ['scattered', 'web'], 'site', 92000, 'Rebrand ahead of a funding round. Identity, site, and a pitch film if time allows.'],
    ['Abdullah Al-Marri', 'Marri Dates Co.', 'ar', ['scattered', 'launch'], 'whatsapp', 33000, 'تغليف جديد لهدايا رمضان وإطلاق في المجمعات.'],
    ['Leila Mansour', 'Studio Kunafa', 'en', ['social'], 'instagram', 18000, 'Three months of reels for our dessert bar. We post, nobody comes.'],
    ['Tariq Bin Saad', 'Al Wakra Marina', 'en', ['film', 'launch'], 'site', 120000, 'Opening of the marina promenade. Drone film, launch event, the works.'],
    ['Reem Al-Hajri', 'Bloom Kids Academy', 'ar', ['remember', 'social'], 'site', 26000, 'نريد هوية مرحة يحبها الأطفال وأولياء الأمور، وخطة محتوى شهرية لحساباتنا.'],
    ['James Whitfield', 'Lusail Tech Week', 'en', ['launch'], 'referral', 74000, 'Event branding and the launch campaign for our second edition.'],
    ['Nadia Karim', 'Karim & Co. Law', 'en', ['web', 'scattered'], 'email', 31000, 'A calm, serious website in Arabic and English. Our current one is from 2014.'],
    ['Hamad Al-Kuwari', 'Kuwari Motors', 'ar', ['film'], 'site', 58000, 'إعلان تلفزيوني لسيارة جديدة، ونسخ قصيرة للمنصات.'],
    ['Priya Menon', 'Spice Route Kitchens', 'en', ['social', 'film'], 'instagram', 22000, 'Food films for delivery apps and Instagram.'],
    ['Mohammed Al-Emadi', 'Emadi Group', 'ar', ['scattered', 'web', 'film'], 'linkedin', 150000, 'إعادة بناء هوية المجموعة وكل شركاتها التابعة.'],
    ['Chloe Martin', 'Maison Perle Hotel', 'en', ['launch', 'web'], 'site', 88000, 'Soft opening in February. Website, launch film and influencer week.'],
    ['Saad Al-Dosari', 'Dosari Sports', 'ar', ['social'], 'whatsapp', 15000, 'نريد محتوى أسبوعياً لمتجرنا الرياضي.'],
    ['Elena Petrova', 'Art Basel Doha (pop-up)', 'en', ['remember', 'launch'], 'event', 45000, 'Campaign, signage and daily social content for a two-week art pop-up.'],
    ['Faisal Al-Naimi', 'Naimi Real Estate', 'ar', ['web', 'launch'], 'site', 67000, 'موقع للمشاريع الجديدة مع صفحات هبوط لكل مشروع.'],
  ];
  const STAGE_BY_AGE = ['new', 'new', 'new', 'call', 'call', 'proposal', 'proposal', 'negotiating', 'won', 'won', 'lost'];
  function sampleLeads() {
    const r = MA.rng('miras-leads-v1'), now = Date.now(), owners = ['u-owner', 'u-noor', 'u-rami'];
    return SAMPLE_PEOPLE.map((p, i) => {
      const ageDays = Math.round(Math.pow(i / SAMPLE_PEOPLE.length, 1.25) * 58 + r() * 2), at = new Date(now - ageDays * DAY - r() * 8 * 3600e3);
      const stage = i < 4 ? 'new' : STAGE_BY_AGE[Math.min(STAGE_BY_AGE.length - 1, Math.floor(r() * STAGE_BY_AGE.length * (ageDays / 40 + .3)))];
      const [name, company, lang, waves, source, value, message] = p;
      const email = name.toLowerCase().replace(/[^a-z ]/g, '').trim().split(' ').map((w, k) => k ? w[0] : w).join('.') + '@' + company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) + '.qa';
      const stageAt = new Date(Math.min(now, at.getTime() + r() * Math.max(1, ageDays) * .6 * DAY));
      const owner = stage === 'new' ? '' : owners[i % 3];
      const timeline = [{ at: at.toISOString(), type: 'created', text: source === 'site' ? 'Brief sent from the website' : 'Added', by: '' }];
      if (stage !== 'new') timeline.push({ at: stageAt.toISOString(), type: 'stage', text: stage, by: owner });
      return { id: 'sample-' + (i + 1), at: at.toISOString(), name, email, phone: '', company, waves, message, lang, source, stage, value, owner,
        tags: i % 5 === 0 ? ['priority'] : i % 7 === 0 ? ['repeat client'] : [], notes: [], timeline, read: i >= 3, starred: i === 0 || i === 8, archived: false,
        stageAt: stageAt.toISOString(), lastContact: stage === 'new' ? null : stageAt.toISOString(), snoozeUntil: null, sample: true };
    });
  }
  // the lead list is parsed once and kept in memory; another tab's write (storage event → 'db:leads') replaces it
  let leadCache = null;
  MA.on('db:leads', v => { if (v !== leadCache) leadCache = Array.isArray(v) ? v : null; });
  MA.on('db:*', () => { leadCache = null; });
  const TRASH = 'leads.trash', TRASH_DAYS = 30, SEEN = 'leads.siteSeen';
  const str = (v, n = 2000) => v == null ? '' : String(v).slice(0, n);
  /** Briefs from the site that this browser already took in (so a deleted brief never comes back). First run: everything already listed or announced. */
  function seenSet() {
    const s = MA.db.get(SEEN, null); if (Array.isArray(s)) return new Set(s);
    const ids = new Set(L.raw().filter(l => l.source === 'site').map(l => l.id));
    for (const n of MA.notify.list()) { const m = /^#\/inbox\/(.+)$/.exec(n.href || ''); if (m && (n.key === 'notify.newBrief' || n.icon === 'inbox')) ids.add(decodeURIComponent(m[1])); }
    MA.db.set(SEEN, [...ids]); return ids;
  }
  const L = MA.leads = {
    STAGES, SOURCES,
    stage: id => STAGES.find(s => s.id === id) || STAGES[0],
    source: id => SOURCES.find(s => s.id === id) || SOURCES.at(-2),
    /** Every stored lead (a copy of the list; the lead objects are shared, so change them through update()). */
    raw() {
      if (!leadCache) { let list = MA.db.get('leads', null); if (!Array.isArray(list)) { list = MA.prefs.get('sampleData') ? sampleLeads() : []; leadCache = list; MA.db.set('leads', list); } leadCache = list; }
      return leadCache.slice();
    },
    save(list) { leadCache = list; MA.db.set('leads', list); MA.emit('leads'); MA.renderNav?.(); },
    /** All leads visible right now (samples only while sample data is on). Archived included; filter yourself. */
    all: () => { if (MA.prefs.get('sampleData') && !L.raw().some(l => l.sample)) L.save(L.raw().concat(sampleLeads())); return L.raw().filter(l => !l.sample || MA.prefs.get('sampleData')); },
    get: id => L.raw().find(l => l.id === id),
    add(p) {
      const me = MA.team.me(), list = L.raw(), now = new Date().toISOString();
      const l = { id: MA.uid('l-'), at: now, name: '', email: '', phone: '', company: '', waves: [], message: '', lang: 'en', source: 'manual', stage: 'new', value: null, owner: '', tags: [], notes: [], read: true, starred: false, archived: false, stageAt: now, lastContact: null, snoozeUntil: null,
        timeline: [{ at: now, type: 'created', text: p.source === 'site' ? 'Brief sent from the website' : 'Added', by: p.source === 'site' ? '' : me?.id }], ...p };
      list.unshift(l); L.save(list); return l;
    },
    update(id, patch, { log } = {}) {
      const list = L.raw(), i = list.findIndex(l => l.id === id); if (i < 0) return null;
      const before = list[i], me = MA.team.me();
      const l = { ...before, ...patch, updatedAt: new Date().toISOString() };
      if (log) l.timeline = [...(before.timeline || []), { at: l.updatedAt, by: me?.id, ...log }];
      list[i] = l; L.save(list); return l;
    },
    move(id, stage) {
      const l = L.get(id); if (!l || l.stage === stage) return l;
      const res = L.update(id, { stage, stageAt: new Date().toISOString(), owner: l.owner || MA.team.me()?.id || '' }, { log: { type: 'stage', text: stage } });
      // stored as parts (meta) so History shows it in the current language; target stays as a readable fallback
      MA.activity.log({ action: 'lead.stage', target: MA.activity.arrow(l.name || l.email || '—', MA.L(L.stage(stage))), module: 'inbox', href: '#/inbox/' + id, meta: { name: l.name || l.email || '—', stage } });
      if (stage === 'won') MA.notify.push({ key: 'notify.signed', vars: { name: l.name || l.email || '—' }, text: l.company, icon: 'star', tone: 'good', href: '#/inbox/' + id });
      return res;
    },
    note(id, text) { const l = L.get(id), me = MA.team.me(); if (!l) return; const n = { id: MA.uid('n'), at: new Date().toISOString(), by: me?.id, text }; return L.update(id, { notes: [...(l.notes || []), n] }, { log: { type: 'note', text } }); },
    /** Delete leads: they move to "Recently deleted" for 30 days. → the removed leads (pass them to restore() to undo) */
    remove(ids) {
      ids = [].concat(ids); const list = L.raw(), gone = list.filter(l => ids.includes(l.id)); if (!gone.length) return gone;
      L.save(list.filter(l => !ids.includes(l.id)));
      const now = new Date().toISOString(), keep = MA.db.get(TRASH, []).filter(x => !ids.includes(x.lead?.id));
      MA.db.set(TRASH, [...gone.map(lead => ({ lead, deletedAt: now })), ...keep].slice(0, 500)); MA.emit('leads.trash');
      return gone;
    },
    restore(leads) {
      leads = [].concat(leads).filter(l => l?.id);
      const list = L.raw(), ids = new Set(leads.map(l => l.id));
      L.save([...leads, ...list.filter(l => !ids.has(l.id))].sort((a, b) => String(b.at).localeCompare(String(a.at))));
      const t = MA.db.get(TRASH, []); if (t.some(x => ids.has(x.lead?.id))) { MA.db.set(TRASH, t.filter(x => !ids.has(x.lead?.id))); MA.emit('leads.trash'); }
    },
    /** "Recently deleted": [{ ...lead, deletedAt }] newest first, kept 30 days (samples only while sample data is on). */
    trash() {
      const cut = Date.now() - TRASH_DAYS * DAY, all = MA.db.get(TRASH, []), live = all.filter(x => x?.lead?.id && Date.parse(x.deletedAt) > cut);
      if (live.length !== all.length) MA.db.set(TRASH, live);
      return live.filter(x => !x.lead.sample || MA.prefs.get('sampleData')).map(x => ({ ...x.lead, deletedAt: x.deletedAt }));
    },
    /** Bring deleted leads back. → the restored leads */
    untrash(ids) { ids = [].concat(ids); const back = MA.db.get(TRASH, []).filter(x => ids.includes(x.lead?.id)).map(x => x.lead); if (back.length) L.restore(back); return back; },
    /** Delete for good: the given ids, or everything in the trash. → how many */
    purge(ids) { const t = MA.db.get(TRASH, []), keep = ids == null ? [] : t.filter(x => ![].concat(ids).includes(x.lead?.id)); MA.db.set(TRASH, keep); MA.emit('leads.trash'); return t.length - keep.length; },
    clearSamples() { L.save(L.raw().filter(l => !l.sample)); },
    unread: () => L.all().filter(l => !l.read && !l.archived).length,
    /** Pull briefs the site saved on this browser (index.html → 'miras.leads.inbox'). Returns how many were new. A brief is taken in once: deleting it later is final. */
    importSite() {
      let inbox = []; try { inbox = JSON.parse(localStorage.getItem('miras.leads.inbox') || '[]'); } catch (e) {}
      if (!Array.isArray(inbox)) return 0;
      const seen = seenSet(), list = L.raw(), have = new Set(list.map(l => l.id)); let n = 0, grew = false;
      for (const b of inbox) {
        if (!b || typeof b.id !== 'string' || !b.id) continue;
        if (seen.has(b.id) || have.has(b.id)) { if (!seen.has(b.id)) { seen.add(b.id); grew = true; } continue; }
        seen.add(b.id); grew = true; n++;
        const at = Date.parse(b.at) ? new Date(b.at).toISOString() : new Date().toISOString();
        const utm = MA.isObj(b.utm) ? Object.fromEntries(['source', 'medium', 'campaign'].filter(k => b.utm[k] != null && b.utm[k] !== '').map(k => [k, str(b.utm[k], 120)])) : b.utm ? { campaign: str(b.utm, 120) } : {};
        list.unshift({ id: b.id, at, name: str(b.name, 200), email: str(b.email, 200), phone: str(b.phone, 60), company: str(b.company, 200), waves: Array.isArray(b.waves) ? b.waves.map(x => str(x, 60)) : [], services: Array.isArray(b.services) ? b.services.map(x => str(x, 60)) : [], words: Array.isArray(b.words) ? b.words.map(x => str(x, 80)) : [],
          message: str(b.message, 5000), lang: b.lang === 'ar' ? 'ar' : 'en', source: 'site', stage: 'new', value: null, budget: typeof b.budget === 'number' ? b.budget : b.budget ? str(b.budget, 80) : null, ref: str(b.ref, 200), utm, landing: str(b.landing, 300),
          channel: L.channelOf({ ref: b.ref, utm }),
          owner: '', tags: [], notes: [], read: false, starred: false, archived: false, stageAt: at, lastContact: null, snoozeUntil: null,
          timeline: [{ at, type: 'created', text: 'Brief sent from the website', by: '' }] });
        MA.notify.push({ key: 'notify.newBrief', vars: { name: str(b.name, 200) || '—' }, text: str(b.company || b.email, 200), icon: 'inbox', href: '#/inbox/' + encodeURIComponent(b.id) });
      }
      if (grew) MA.db.set(SEEN, [...seen].slice(-3000));
      if (n) { list.sort((a, b) => String(b.at).localeCompare(String(a.at))); L.save(list); }
      return n;
    },
    /** Where a site brief came from, read from its first-touch referrer and UTM source: 'instagram' | 'linkedin' | 'whatsapp' |
     *  'search' | 'email' | 'x' | 'referral' (another site) | 'direct'. Shown next to the source; never replaces it. */
    channelOf({ ref, utm } = {}) {
      const src = String((MA.isObj(utm) ? utm.source || utm.medium : '') || '').toLowerCase(), host = String(ref || '').toLowerCase().replace(/^www\./, '');
      const t = src + ' ' + host;
      if (/instagram|\big\b|ig\.me/.test(t)) return 'instagram';
      if (/linkedin|lnkd/.test(t)) return 'linkedin';
      if (/whatsapp|wa\.me/.test(t)) return 'whatsapp';
      if (/google|bing|duckduckgo|yahoo|yandex|ecosia|search|chatgpt|perplexity/.test(t)) return 'search';
      if (/mail|newsletter/.test(t)) return 'email';
      if (/twitter|\bx\.com|t\.co\b|\bx\b/.test(t)) return 'x';
      if (/facebook|fb\.|tiktok|snapchat|youtube/.test(t)) return 'social';
      return host || src ? 'referral' : 'direct';
    },
    /** Label for a swell id, from the current draft (falls back to the id). */
    waveLabel(id, lang = MA.lang()) { const s = MA.content.draft?.swells?.find(x => x.id === id); return s ? MA.strip(s[lang]?.service || s.en.service) : id; },
    csvColumns: () => [
      { key: 'at', label: 'Received' }, { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'company', label: 'Company' },
      { key: 'waves', label: 'Swells', get: l => (l.waves || []).map(w => L.waveLabel(w, 'en')).join('; ') }, { key: 'stage', label: 'Stage', get: l => L.stage(l.stage).en },
      { key: 'value', label: 'Value (QAR)' }, { key: 'source', label: 'Source', get: l => L.source(l.source).en }, { key: 'owner', label: 'Owner', get: l => MA.team.name(l.owner) },
      { key: 'services', label: 'Services', get: l => (l.services || []).map(id => MA.content.draft?.services?.find(x => x.id === id)?.en?.name || id).join('; ') }, { key: 'words', label: 'Words caught' }, { key: 'tags', label: 'Tags' }, { key: 'lang', label: 'Language' }, { key: 'message', label: 'Message' },
      { key: 'budget', label: 'Budget' }, { key: 'ref', label: 'Referrer' }, { key: 'utm', label: 'Campaign (UTM)', get: l => MA.isObj(l.utm) ? Object.entries(l.utm).map(([k, v]) => `${k}=${v}`).join('; ') : (l.utm || '') },
      { key: 'landing', label: 'Landing page' }, { key: 'channel', label: 'Channel' },
    ],
    /** Rows from a parsed CSV (MA.csv.parse) or a JSON array → leads. Header names are matched loosely. */
    fromRows(rows) {
      const pick = (r, ...ks) => { for (const k of Object.keys(r)) if (ks.some(x => k.toLowerCase().replace(/[^a-z]/g, '').includes(x))) return r[k]; return ''; };
      const ids = new Set((MA.content.draft?.swells || []).map(s => s.id));
      return rows.map(r => ({ name: pick(r, 'name'), email: pick(r, 'email', 'mail'), phone: pick(r, 'phone', 'mobile', 'whatsapp'), company: pick(r, 'company', 'organisation', 'organization', 'business'),
        message: pick(r, 'message', 'brief', 'notes', 'details'), value: +String(pick(r, 'value', 'budget', 'amount')).replace(/[^\d.]/g, '') || null,
        waves: String(pick(r, 'swell', 'service', 'waves', 'interest')).split(/[;,]/).map(x => x.trim()).map(x => [...ids].find(id => id === x || L.waveLabel(id, 'en').toLowerCase() === x.toLowerCase())).filter(Boolean),
        at: (Date.parse(pick(r, 'received', 'date', 'created', 'submitted')) ? new Date(pick(r, 'received', 'date', 'created', 'submitted')).toISOString() : new Date().toISOString()),
        services: String(pick(r, 'services')).split(/[;,]/).map(x => x.trim()).map(x => (MA.content.draft?.services || []).find(sv => sv.id === x || sv.en.name.toLowerCase() === x.toLowerCase())?.id).filter(Boolean),
        words: String(pick(r, 'words')).split(/[;,]/).map(x => x.trim()).filter(Boolean),
        ...(pick(r, 'budget') ? { budget: String(pick(r, 'budget')) } : {}), ...(pick(r, 'referrer', 'ref') ? { ref: String(pick(r, 'referrer', 'ref')) } : {}), ...(pick(r, 'utm', 'campaign') ? { utm: String(pick(r, 'utm', 'campaign')) } : {}),
        source: 'import', read: false })).filter(l => l.name || l.email);
    },
  };
  // briefs written by the site in another tab land here live
  MA.on('site:leads', () => { if (L.importSite()) MA.toast(MA.L({ en: 'A new brief just arrived from the site.', ar: 'وصل طلب جديد من الموقع.', fa: 'یک درخواست تازه از سایت رسید.' }), { icon: 'inbox', action: { label: MA.L({ en: 'Open', ar: 'افتح', fa: 'باز کن' }), run: () => MA.go('#/inbox') } }); });
  MA.on('boot', () => { L.importSite(); L.trash(); });

  /* ================= metrics ================= */
  const EMPTY = () => ({ visitors: 0, views: 0, briefs: 0, copies: 0, planToBrief: 0, langSwitch: 0, picks: {}, services: {}, make: {}, faq: {}, sections: {}, journey: { 25: 0, 50: 0, 75: 0, 100: 0 },
    funnel: { landed: 0, film50: 0, swell: 0, contact: 0, brief: 0 }, lang: { en: 0, ar: 0 }, device: { desktop: 0, tablet: 0, mobile: 0 }, ref: {}, country: {}, hours: Array(24).fill(0) });
  const addInto = (a, b) => { for (const [k, v] of Object.entries(b)) { if (typeof v === 'number') a[k] = (a[k] || 0) + v; else if (Array.isArray(v)) { a[k] = a[k] || Array(v.length).fill(0); v.forEach((x, i) => a[k][i] += x); } else if (v && typeof v === 'object') { a[k] = a[k] || {}; addInto(a[k], v); } } return a; };
  const SWELL_W = { launch: 1.25, scattered: 1.1, film: .95, social: 1.3, web: .8, remember: .7 };
  const REFS = [['google.com', 30], ['direct', 26], ['instagram.com', 18], ['linkedin.com', 9], ['wa.me', 7], ['x.com', 3], ['bing.com', 2], ['qatarliving.com', 2], ['chatgpt.com', 3]];
  const COUNTRIES = [['QA', 62], ['SA', 9], ['AE', 8], ['KW', 4], ['GB', 4], ['US', 3], ['EG', 3], ['IN', 3], ['JO', 2], ['other', 2]];
  /** One sample day. Deterministic per date (memoised: callers must not mutate it); quieter on the Qatar weekend (Fri/Sat); gentle growth over the year. */
  const sampleMemo = new Map();
  function sampleDay(ds) {
    const k = ds + '|' + M.sectionOrder().join(','); let d = sampleMemo.get(k);
    if (!d) { d = makeSampleDay(ds); if (sampleMemo.size > 1500) sampleMemo.clear(); sampleMemo.set(k, d); }
    return d;
  }
  function makeSampleDay(ds) {
    const r = MA.rng('day:' + ds), wd = qWeekday(ds), t = (Date.parse(ds) - Date.parse('2026-01-01')) / DAY;
    const base = 58 + t * .16, wk = wd === 5 ? .58 : wd === 6 ? .72 : wd === 0 ? 1.12 : 1, spike = r() < .05 ? 1.9 : 1;
    const visitors = Math.max(6, Math.round(base * wk * spike * (.82 + r() * .36))), views = Math.round(visitors * (1.18 + r() * .22));
    const d = EMPTY(); d.visitors = visitors; d.views = views;
    const f50 = Math.round(visitors * (.56 + r() * .1)), sw = Math.round(visitors * (.31 + r() * .08)), ct = Math.round(visitors * (.2 + r() * .07)), br = Math.round(ct * (.11 + r() * .09) * (r() < .2 ? 0 : 1));
    d.funnel = { landed: visitors, film50: f50, swell: sw, contact: ct, brief: br }; d.briefs = br; d.copies = Math.round(br * .3 * r());
    d.planToBrief = Math.round(sw * .18 * (.7 + r() * .6)); d.langSwitch = Math.round(visitors * .07 * (.6 + r()));
    for (const [id, w] of Object.entries(SWELL_W)) d.picks[id] = Math.round(sw * w * .52 * (.7 + r() * .6));
    const ar = Math.round(visitors * (.36 + r() * .1)); d.lang = { en: visitors - ar, ar };
    const mob = Math.round(visitors * (.6 + r() * .08)), tab = Math.round(visitors * .05 * (.5 + r())); d.device = { mobile: mob, tablet: tab, desktop: Math.max(0, visitors - mob - tab) };
    let left = visitors; REFS.forEach(([h, w], i) => { const n = i === REFS.length - 1 ? left : Math.min(left, Math.round(visitors * w / 100 * (.7 + r() * .6))); d.ref[h] = n; left -= n; });
    left = visitors; COUNTRIES.forEach(([c, w], i) => { const n = i === COUNTRIES.length - 1 ? left : Math.min(left, Math.round(visitors * w / 100 * (.75 + r() * .5))); d.country[c] = n; left -= n; });
    const order = M.sectionOrder();
    order.forEach((s, i) => d.sections[s] = Math.round(visitors * Math.pow(.86, i) * (.94 + r() * .1)));
    d.journey = { 25: Math.round(visitors * .78), 50: f50, 75: Math.round(f50 * .82), 100: Math.round(f50 * .7) };
    [0, 1, 2, 3, 4].forEach(i => d.faq[i] = Math.round(visitors * [.08, .05, .07, .03, .06][i] * (.6 + r() * .8)));
    // sample data deliberately has no service picks: services only count from real 'service' events
    const curve = h => Math.max(.08, Math.exp(-((h - 11) ** 2) / 18) + .75 * Math.exp(-((h - 21) ** 2) / 10));
    let tot = 0; const hw = d.hours.map((_, h) => { const v = curve(h) * (.7 + r() * .6); tot += v; return v; });
    d.hours = hw.map(v => Math.round(v / tot * views));
    return d;
  }
  /** Aggregate the site's own event log (this browser) per Qatar day. Incremental: when the log only grew, just the new events are added. */
  let localState = null; // { days, seen, n, first }
  function localDays() {
    let ev = []; try { ev = JSON.parse(localStorage.getItem('miras.events') || '[]'); } catch (e) {}
    if (!Array.isArray(ev)) ev = [];
    if (!localState || ev.length < localState.n || (ev[0]?.t ?? null) !== localState.first) localState = { days: {}, seen: {}, n: 0, first: ev[0]?.t ?? null };
    const { days, seen } = localState;
    const once = (ds, key) => { const k = ds + '|' + key; if (seen[k]) return false; seen[k] = 1; return true; };
    for (const e of ev.slice(localState.n)) {
      if (!e || typeof e.t !== 'number') continue;
      const ds = qDay(e.t), d = days[ds] ||= EMPTY(), p = e.p || {};
      if (once(ds, 's:' + e.s)) { d.visitors++; d.funnel.landed++; if (e.l) d.lang[e.l] = (d.lang[e.l] || 0) + 1; if (e.d) d.device[e.d] = (d.device[e.d] || 0) + 1; }
      switch (e.e) {
        case 'view': d.views++; d.hours[qHour(e.t)]++; { const h = p.ref || (p.utm ? p.utm : 'direct'); d.ref[h] = (d.ref[h] || 0) + 1; } break;
        case 'journey': d.journey[p.p] = (d.journey[p.p] || 0) + (once(ds, `j${p.p}:${e.s}`) ? 1 : 0); if (p.p >= 50 && once(ds, 'f50:' + e.s)) d.funnel.film50++; break;
        case 'swell': if (p.on) { d.picks[p.id] = (d.picks[p.id] || 0) + 1; if (once(ds, 'sw:' + e.s)) d.funnel.swell++; } break;
        case 'section': if (once(ds, `sec${p.id}:${e.s}`)) { d.sections[p.id] = (d.sections[p.id] || 0) + 1; if (p.id === 'contact') d.funnel.contact++; } break;
        case 'brief': d.briefs++; if (once(ds, 'br:' + e.s)) d.funnel.brief++; break;
        case 'brief_copy': d.copies++; break;
        case 'plan_to_brief': d.planToBrief++; break;
        case 'lang': d.langSwitch++; break;
        case 'faq': d.faq[p.i] = (d.faq[p.i] || 0) + 1; break;
        case 'service': if (p.on) d.services[p.id] = (d.services[p.id] || 0) + 1; break;
        case 'make': d.make[p.w] = (d.make[p.w] || 0) + 1; break;
      }
    }
    localState.n = ev.length;
    return days;
  }
  let localCache = null;
  MA.on('site:events', () => { localCache = null; MA.emit('metrics'); }); // localDays() then only reads the new events
  /* range labels are templates: the day count follows the digit preference ("۳۰ روز گذشته" / "آخر 30 يوماً" / "آخر ٣٠ يوماً") */
  const RANGE_T = {
    '1d': { en: 'Today', ar: 'اليوم', fa: 'امروز', days: 1 },
    '7d': { en: 'Last {n} days', ar: 'آخر {n} أيام', fa: '{n} روز گذشته', days: 7, n: 7 },
    '30d': { en: 'Last {n} days', ar: 'آخر {n} يوماً', fa: '{n} روز گذشته', days: 30, n: 30 },
    '90d': { en: 'Last {n} days', ar: 'آخر {n} يوماً', fa: '{n} روز گذشته', days: 90, n: 90 },
    '12m': { en: 'Last {n} months', ar: 'آخر {n} شهراً', fa: '{n} ماه گذشته', days: 365, n: 12 },
    mtd: { en: 'Month to date', ar: 'منذ بداية الشهر', fa: 'از ابتدای ماه' }, ytd: { en: 'Year to date', ar: 'منذ بداية السنة', fa: 'از ابتدای سال' },
  };
  const RANGES = {};
  for (const [k, d] of Object.entries(RANGE_T)) {
    const o = { tpl: { en: d.en, ar: d.ar, fa: d.fa } }; if (d.days) o.days = d.days;
    for (const l of ['en', 'ar', 'fa']) Object.defineProperty(o, l, { enumerable: true, get: () => d.n ? d[l].replace('{n}', MA.num(d.n)) : d[l] });
    RANGES[k] = o;
  }
  /* the selected calendar's day / month / year of a date ('YYYY-MM-DD'), for month and year starts in Solar Hijri and Hijri */
  const calFmt = {}, calMemo = new Map();
  const calParts = (ds, cal) => {
    const k = cal + ds; let v = calMemo.get(k); if (v) return v;
    const f = calFmt[cal] ||= new Intl.DateTimeFormat('en-u-ca-' + cal + '-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
    const p = {}; for (const x of f.formatToParts(new Date(ds + 'T12:00:00Z'))) p[x.type] = x.value;
    v = { d: +p.day, m: +p.month, y: +String(p.year ?? p.relatedYear ?? '').replace(/\D/g, '') };
    if (calMemo.size > 4000) calMemo.clear(); calMemo.set(k, v); return v;
  };
  const M = MA.metrics = {
    /** { key: { en, ar, fa (filled with MA.num when read), tpl: {en, ar, fa}, days } } */
    RANGES,
    /** {from, to} as 'YYYY-MM-DD' (inclusive), plus the equal-length period before it. key: range id or {from, to}. */
    /** Month to date / year to date start on day 1 of the selected calendar's month or year; the comparison is the same span of the month or year before. */
    range(key = MA.prefs.get('dateRange') || '30d') {
      const today = qDay(Date.now());
      let from, to = today, prev = null;
      if (typeof key === 'object') ({ from, to } = key);
      else if (key === 'mtd' || key === 'ytd') {
        const u = key === 'mtd' ? 'month' : 'year'; from = M.calStart(today, u);
        const span = dayDiff(from, to), pFrom = M.calStart(addDays(from, -1), u), pTo = addDays(pFrom, span);
        prev = { from: pFrom, to: pTo < from ? pTo : addDays(from, -1) };
      }
      else from = addDays(today, -((M.RANGES[key]?.days || 30) - 1));
      const n = dayDiff(from, to) + 1;
      if (!prev) { const prevTo = addDays(from, -1); prev = { from: addDays(prevTo, -(n - 1)), to: prevTo }; }
      return { key, from, to, n, prev, label: typeof key === 'object' ? `${MA.date(from, { day: 'numeric', month: 'short' })} – ${MA.date(to, { day: 'numeric', month: 'short' })}` : MA.L(M.RANGES[key]) };
    },
    /** First day ('YYYY-MM-DD') of the month or year containing ds, in the calendar chosen in Customize (Gregorian, Solar Hijri or Hijri). */
    calStart(ds, unit = 'month', cal = MA.prefs.get('calendar') || 'gregory') {
      if (cal === 'gregory') return unit === 'year' ? ds.slice(0, 5) + '01-01' : ds.slice(0, 8) + '01';
      let d = ds;
      for (let i = 0; i < 400; i++) { const p = calParts(d, cal); if (p.d === 1 && (unit !== 'year' || p.m === 1)) return d; d = addDays(d, -1); }
      return ds;
    },
    /** Is the sample generator in use? (pref on) */
    sampleOn: () => !!MA.prefs.get('sampleData'),
    /** Does this browser hold any real events from the site? */
    hasLocal: () => { try { return (localStorage.getItem('miras.events') || '[]').length > 2; } catch (e) { return false; } },
    /** 'sample' | 'local' | 'mixed' | 'none' */
    source: () => M.sampleOn() ? (M.hasLocal() ? 'mixed' : 'sample') : (M.hasLocal() ? 'local' : 'none'),
    /** Daily rows from..to (inclusive). Each row: { date, sample: bool, ...metrics }. */
    days(from, to) {
      if (typeof from === 'object') ({ from, to } = from);
      const loc = localCache ||= localDays(), out = [], today = qDay(Date.now());
      for (let ds = from; ds <= to; ds = addDays(ds, 1)) {
        const row = EMPTY();
        if (M.sampleOn() && ds <= today) addInto(row, sampleDay(ds));
        if (loc[ds]) addInto(row, loc[ds]);
        out.push({ date: ds, sample: M.sampleOn(), ...row });
      }
      // today's sample is partial: scale by how much of the Qatar day has passed
      const last = out.at(-1);
      if (last && last.date === today && M.sampleOn()) {
        const f = Math.max(.04, (qHour(Date.now()) + new Date().getMinutes() / 60) / 24), s = sampleDay(last.date), l = loc[last.date] || EMPTY();
        const part = JSON.parse(JSON.stringify(s), (k, v) => typeof v === 'number' ? Math.round(v * f) : v);
        Object.assign(last, addInto(addInto(EMPTY(), part), l), { date: last.date, sample: true, partial: true });
      }
      return out;
    },
    /** Sum rows into one object of the same shape. */
    sum: rows => rows.reduce((a, r) => { const { date, sample, partial, ...rest } = r; return addInto(a, rest); }, EMPTY()),
    /** Current + previous period totals and rows for a range. */
    period(key) { const R = M.range(key), rows = M.days(R.from, R.to), prevRows = M.days(R.prev.from, R.prev.to); return { R, rows, prevRows, cur: M.sum(rows), prev: M.sum(prevRows) }; },
    /** Relative change; null when there's no baseline. */
    delta: (a, b) => !b ? (a ? null : 0) : (a - b) / b,
    conversion: t => t.visitors ? t.funnel.brief / t.visitors : 0,
    /** Real events from the last `mins` minutes (this browser): { sessions, events } */
    live(mins = 5) {
      let ev = []; try { ev = JSON.parse(localStorage.getItem('miras.events') || '[]'); } catch (e) {}
      const since = Date.now() - mins * 60e3, recent = ev.filter(e => e.t >= since);
      return { sessions: new Set(recent.map(e => e.s)).size, events: recent.reverse() };
    },
    /** Recent activity feed: real local events (newest first), plus a few sample ones when sample data is on. */
    feed(n = 20) {
      let ev = []; try { ev = JSON.parse(localStorage.getItem('miras.events') || '[]'); } catch (e) {}
      const real = ev.slice(-n).reverse().map(e => ({ ...e, sample: false }));
      if (!M.sampleOn()) return real;
      const r = MA.rng('feed:' + qDay(Date.now()) + ':' + new Date().getHours()), kinds = ['view', 'swell', 'section', 'journey', 'lang', 'faq', 'brief'], ids = Object.keys(SWELL_W), now = Date.now(), secs = M.sectionOrder().filter(x => x !== 'top' && x !== 'foot'), svc = (MA.content.defaults?.services || []).map(x => x.id);
      const fake = Array.from({ length: n }, (_, i) => { const e = kinds[Math.floor(Math.pow(r(), 1.6) * kinds.length)]; return { t: now - (i + 1) * (90e3 + r() * 600e3), e, s: 'x' + Math.floor(r() * 1e6), l: r() < .38 ? 'ar' : 'en', d: r() < .62 ? 'mobile' : 'desktop', sample: true,
        p: e === 'swell' ? { id: ids[Math.floor(r() * ids.length)], on: true } : e === 'section' ? { id: secs[Math.floor(r() * secs.length)] } : e === 'service' ? { id: svc[Math.floor(r() * svc.length)], on: true } : e === 'journey' ? { p: [25, 50, 75, 100][Math.floor(r() * 4)] } : e === 'faq' ? { i: Math.floor(r() * 5) } : e === 'view' ? { ref: REFS[Math.floor(r() * 5)][0] } : {} }; });
      return [...real, ...fake].sort((a, b) => b.t - a.t).slice(0, n);
    },
    /** Human sentence for an event (used by feeds). */
    describe(e) {
      const p = e.p || {}, cl = MA.lang() === 'ar' ? 'ar' : 'en'; // site content exists in English and Arabic only
      const L = o => MA.L(o), iso = v => '\u2068' + v + '\u2069', sec = id => iso(MA.content.groupName ? MA.content.groupName(id) : MA.t('sec.' + id));
      const ref = p.ref && p.ref !== 'direct' ? p.ref : '';
      switch (e.e) {
        case 'view': return ref ? L({ en: `Visit from ${ref}`, ar: `زيارة من ${ref}`, fa: `بازدید از ${ref}` }) : L({ en: 'Visit', ar: 'زيارة', fa: 'بازدید' });
        case 'swell': return L({ en: 'Tapped a swell: ', ar: 'اختار موجة: ', fa: 'موجی را انتخاب کرد: ' }) + iso(MA.strip(MA.content.draft?.swells?.find(s => s.id === p.id)?.[cl]?.problem || p.id));
        case 'section': return L({ en: 'Reached ', ar: 'وصل إلى ', fa: 'رسید به ' }) + sec(p.id);
        case 'journey': return L({ en: `Watched ${p.p}% of the film`, ar: `شاهد ${p.p}٪ من الفيلم`, fa: `${MA.num(p.p)}٪ از فیلم را دید` });
        case 'lang': return L({ en: 'Switched language', ar: 'بدّل اللغة', fa: 'زبان را عوض کرد' });
        case 'faq': return L({ en: 'Opened a question: ', ar: 'فتح سؤالاً: ', fa: 'پرسشی را باز کرد: ' }) + iso(MA.strip(MA.content.draft?.faq?.[p.i]?.[cl]?.q || '#' + (p.i + 1)));
        case 'brief': return L({ en: 'Sent a brief', ar: 'أرسل طلباً', fa: 'درخواستی فرستاد' });
        case 'brief_copy': return L({ en: 'Copied the brief', ar: 'نسخ الطلب', fa: 'درخواست را کپی کرد' });
        case 'plan_to_brief': return L({ en: 'Added the plan to a brief', ar: 'أضاف الخطة إلى الطلب', fa: 'برنامه را به درخواست افزود' });
        case 'service': return L({ en: 'Added a service: ', ar: 'أضاف خدمة: ', fa: 'خدمتی را افزود: ' }) + iso(MA.strip(MA.content.draft?.services?.find(x => x.id === p.id)?.[cl]?.name || p.id));
        case 'make': return L({ en: 'Caught a word: ', ar: 'التقط كلمة: ', fa: 'واژه‌ای را گرفت: ' }) + iso(p.w || '');
        case 'brief_blocked': return p.why === 'fast' ? L({ en: 'Blocked a brief sent too fast (likely a bot)', ar: 'حُجب طلب أُرسل بسرعة مريبة (غالباً برنامج آلي)', fa: 'درخواستی که بیش از حد سریع فرستاده شد مسدود شد (احتمالاً ربات)' }) : L({ en: 'Blocked a spam brief (hidden field filled)', ar: 'حُجب طلب مزعج (مُلئ الحقل المخفي)', fa: 'درخواست هرزنامه مسدود شد (فیلد پنهان پر شده بود)' });
        case 'consent': return p.on ? L({ en: 'Allowed analytics cookies', ar: 'سمح بملفات تعريف الارتباط للتحليلات', fa: 'کوکی‌های تحلیل را پذیرفت' }) : L({ en: 'Declined analytics cookies', ar: 'رفض ملفات تعريف الارتباط للتحليلات', fa: 'کوکی‌های تحلیل را رد کرد' });
        case 'work': return L({ en: 'Opened a project', ar: 'فتح مشروعاً', fa: 'پروژه‌ای را باز کرد' }) + (p.to ? ': ' + iso(String(p.to)) : '');
        default: return e.e;
      }
    },
    /** 7×24 matrix (Sun..Sat × hour) of views. */
    heat(rows) { const m = Array.from({ length: 7 }, () => Array(24).fill(0)); rows.forEach(r => { const wd = qWeekday(r.date); r.hours.forEach((v, h) => m[wd][h] += v); }); return m; },
    /** Site sections in page order: content.layout when the site has one (sections can be reordered), else the site's own section list. */
    sectionOrder: () => {
      const secs = Object.keys(MA.content.draft?.sections || MA.content.defaults?.sections || { plan: 1, make: 1, why: 1, studio: 1, faq: 1, contact: 1 });
      const lay = MA.content.draft?.layout || MA.content.defaults?.layout;
      const order = Array.isArray(lay) ? [...lay.filter(id => secs.includes(id)), ...secs.filter(id => !lay.includes(id))] : secs;
      return ['top', ...new Set(order), 'foot'];
    },
    clearLocal() { try { localStorage.removeItem('miras.events'); } catch (e) {} localCache = null; localState = null; MA.emit('metrics'); },
    /** Label for the last funnel step depends on how the form delivers. */
    briefLabel: () => (MA.content.draft?.studio?.formEndpoint ? MA.L({ en: 'Brief sent', ar: 'أُرسل الطلب', fa: 'درخواست ارسال شد' }) : MA.L({ en: 'Opened email draft', ar: 'فتح مسودة البريد', fa: 'پیش‌نویس ایمیل را باز کرد' })),
    funnelSteps(t) {
      return [
        { label: MA.L({ en: 'Landed', ar: 'وصل إلى الموقع', fa: 'وارد سایت شد' }), value: t.funnel.landed },
        { label: MA.L({ en: 'Watched past 50%', ar: 'شاهد أكثر من نصف الفيلم', fa: 'بیش از نیمی از فیلم را دید' }), value: t.funnel.film50 },
        { label: MA.L({ en: 'Tapped a swell', ar: 'اختار موجة', fa: 'موجی را انتخاب کرد' }), value: t.funnel.swell },
        { label: MA.L({ en: 'Reached contact', ar: 'وصل إلى التواصل', fa: 'به بخش تماس رسید' }), value: t.funnel.contact },
        { label: M.briefLabel(), value: t.funnel.brief },
      ];
    },
  };

  /* ---------- real numbers only: demo briefs and teammates stored by earlier versions are removed once ---------- */
  MA.on('boot', () => {
    if (new URLSearchParams(location.search).has('test') || MA.db.get('samplePurgedV1', false)) return;
    MA.db.set('samplePurgedV1', true);
    if (MA.prefs.get('sampleData')) return; // someone who switched the demo on on purpose keeps it
    MA.db.set('leads', MA.leads.raw().filter(l => !l.sample)); MA.db.set('team', MA.team.raw().filter(m => !m.sample));
    if (!MA.team.raw().some(m => m.id === MA.prefs.get('me'))) MA.prefs.set('me', '');
  });

  /* ---------- first run: a welcome note ---------- */
  MA.on('boot', () => {
    if (!MA.db.get('welcomed', false)) {
      MA.db.set('welcomed', true);
      MA.notify.push({ key: 'notify.welcome', textKey: 'notify.welcomeText', icon: 'mira' }); // stored as keys, so it reads in whatever language the admin is in
    }
  });
})();
