/* MIRAS: shared behaviour for the inner pages.
   - Language: English comes from the page (data-i18n, data-i18n-aria, data-i18n-alt, hidden <div hidden> blocks),
     Arabic from SHARED_AR + window.PAGE_AR. ?lang=ar|en, then the visitor's last choice ('miras-lang'), then English.
     The address follows the language: ?lang=ar in the address bar, the canonical and og:url, and on links to the site's
     own pages; English has no lang. A browser set to Arabic on the English site is offered Arabic in a thin bar.
   - Content: assets/content.js (published from the admin) overrides the page. content.pages[<body data-page>].text,
     content.shared.text, content.work, content.studio, content.theme, content.tagline and content.schedule apply here.
     ?cms=preview and ?cms=export speak the same postMessage protocol as index.html.
   - Studio hours, briefs (keepLead/track), first-touch attribution, analytics behind a consent bar.
   - Nav and menu. Every animation (motifs, wave titles, the footer, the nav's frame work) runs on the one loop in
     assets/motifs.js (window.MOTIFS), loaded before this file; a page that doesn't load it yet gets it injected.
   The contract with the admin is in admin/SITE-CONTRACT.md, section "Multi-page". */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const html = document.documentElement;
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = mq.matches; mq.addEventListener?.('change', e => reduce = e.matches);
  // the motif library (assets/motifs.js + motifs.css). Pages load it before this file; an older page gets it added here.
  const ASSETS = (() => { try { return new URL('.', document.currentScript.src).href; } catch (e) { return 'assets/'; } })();
  const motifWait = [];
  const withMotifs = fn => { if (window.MOTIFS) { try { fn(window.MOTIFS); } catch (e) { console.error(e); } } else motifWait.push(fn); };
  if (!document.querySelector('link[href*="motifs.css"]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = ASSETS + 'motifs.css?v=r3';
    const site = document.querySelector('link[href*="site.css"]'); site ? site.before(l) : document.head.append(l);
  }
  if (!window.MOTIFS) {
    const sc = document.createElement('script'); sc.src = ASSETS + 'motifs.js?v=r3';
    sc.onload = () => motifWait.splice(0).forEach(withMotifs); document.head.append(sc);
  }
  const C = { tide: '#2B3BF0', deep: '#0D0F2E', shore: '#F2EADB', flare: '#FF5A23', foam: '#BFF0DD', tide60: '#8098FD' };
  const C_DEF = { ...C };

  /* ================= helpers ================= */
  const clone = v => JSON.parse(JSON.stringify(v));
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const badKey = k => k === '__proto__' || k === 'constructor' || k === 'prototype';
  const merge = (a, b) => { if (b === undefined) return a; if (!isObj(a) || !isObj(b)) return b; const o = { ...a }; for (const k of Object.keys(b)) if (!badKey(k)) o[k] = merge(a[k], b[k]); return o; };
  const refill = (o, v) => { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, v); };
  const str = v => typeof v === 'string' ? v : typeof v === 'number' && isFinite(v) ? String(v) : null;
  const sid = (v, fb) => String(str(v) ?? '').replace(/[^\w-]/g, '').slice(0, 64) || fb;
  const errText = e => String(e?.message || e).slice(0, 300);
  const fmt = (v, vars = {}) => String(v ?? '').replace(/\{(\w+)\}/g, (m, k) => k in vars ? vars[k] : m);
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const decode = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
  // links and image paths: paths on this site and http(s); links may also be mailto:/tel:, images blob:, data:image or an upload ('media:<id>')
  function safeUrl(v, img, link) {
    const s = (str(v) ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s) || s.startsWith('//') || !/^[a-z][\w+.-]*:/i.test(s)) return s;
    if (link && /^(?:mailto|tel):/i.test(s)) return s;
    if (img && (/^media:[\w-]+$/.test(s) || /^blob:/i.test(s) || /^data:image\/(?:png|jpe?g|gif|webp|avif|svg\+xml)[;,]/i.test(s))) return s;
    return null;
  }
  // the shape of `tpl`, filled from `v` where the types match (fields this page doesn't know pass through)
  function conform(v, tpl) {
    if (typeof tpl === 'string') return str(v) ?? tpl;
    if (typeof tpl === 'number') return typeof v === 'number' && isFinite(v) ? v : tpl;
    if (typeof tpl === 'boolean') return typeof v === 'boolean' ? v : tpl;
    if (Array.isArray(tpl)) {
      if (!Array.isArray(v)) return clone(tpl);
      if (isObj(tpl[0])) return v.map((x, i) => conform(x, tpl[Math.min(i, tpl.length - 1)]));
      return typeof tpl[0] === 'number' ? v.filter(x => typeof x === 'number' && isFinite(x)) : v.map(str).filter(x => x != null);
    }
    if (isObj(tpl)) {
      const src = isObj(v) ? v : {}, o = {};
      for (const k of Object.keys(tpl)) o[k] = conform(src[k], tpl[k]);
      for (const k of Object.keys(src)) if (!(k in o) && !badKey(k)) o[k] = src[k];
      return o;
    }
    return v === undefined ? tpl : v;
  }

  /* ---- sanitising: the same rule as index.html. <em>, <i> (→ <em>), <br> and <span dir> stay; any other markup shows as text;
     entities (&amp; …) are kept and a bare & < > " is escaped. ---- */
  const ENT = /^&(?:#\d{1,7}|#x[\da-f]{1,6}|[a-z][a-z\d]{1,31});/i, KEEP = /<\/?(?:em|i|br|span)\b[^<>]*>/gi;
  const escText = s => s.replace(/[&<>"]/g, (c, i) => c === '&' ? (ENT.test(s.slice(i, i + 40)) ? '&' : '&amp;') : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;');
  const safe = v => {
    const s = typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';
    let out = '', at = 0, m; KEEP.lastIndex = 0;
    while ((m = KEEP.exec(s))) {
      out += escText(s.slice(at, m.index)); at = KEEP.lastIndex;
      const close = m[0][1] === '/', name = m[0].slice(close ? 2 : 1).match(/^[a-z]+/i)[0].toLowerCase();
      if (name === 'br') out += close ? '' : '<br>';
      else if (name === 'em' || name === 'i') out += close ? '</em>' : '<em>';
      else { const d = /\bdir\s*=\s*["']?(ltr|rtl|auto)\b/i.exec(m[0]); out += close ? '</span>' : d ? `<span dir="${d[1].toLowerCase()}">` : '<span>'; }
    }
    return out + escText(s.slice(at));
  };

  /* ---- markup tokens. The admin keeps only <em>, <br> and <span dir> as markup, so page copy carries links, bold and code
     as plain-text tokens, and the page turns them back into markup after sanitising:
       {email} → the studio's email (studio.email) as a link · [words](link) → a link · **words** → bold · `words` → code ---- */
  const DEFAULT_EMAIL = 'hello@mirasmarketing.com';
  function tokenize(h) {
    return String(h ?? '')
      .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m, attrs, inner) => {
        const href = decode((/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs) || []).slice(1).find(x => x != null) || '').trim();
        const mail = /^mailto:(.+)$/i.exec(href), words = decode(inner.replace(/<[^>]*>/g, '')).trim();
        if (mail && mail[1] === DEFAULT_EMAIL && words === DEFAULT_EMAIL) return '{email}';
        if (!href || /[\s()]/.test(href) || /[[\]]/.test(inner)) return inner; // can't be written as a token: keep the words
        return `[${inner}](${href})`;
      })
      .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
      .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  }
  const emailLink = () => `<a href="mailto:${esc(STUDIO.email)}" dir="ltr" data-cms="studio.email">${esc(STUDIO.email)}</a>`;
  function detok(h) { // h is already sanitised
    return h
      .replace(/\[([^\]]*)\]\(([^\s()<>]+)\)/g, (m, words, u) => {
        const url = safeUrl(decode(u), false, true); if (!url) return words;
        return `<a href="${esc(url)}"${/^(?:https?:)?\/\//i.test(url) ? ' rel="noopener"' : ''}${/^(?:mailto|tel):/i.test(url) ? ' dir="ltr"' : ''}>${words}</a>`;
      })
      .replace(/`([^`]+?)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\{email\}/g, emailLink);
  }
  const view = v => detok(safe(v));                                   // copy → the HTML the page shows
  const textOf = v => decode(view(v).replace(/<[^>]*>/g, ''));        // copy → plain text (textContent, attributes)

  /* ================= where this page runs ================= */
  const PAGE = sid(document.body.dataset.page, 'page');
  const Q = new URLSearchParams(location.search);
  // ?cms=preview is the admin's live preview (reads the draft, takes edits over postMessage); ?cms=export only reports the content
  const cmsMode = Q.get('cms');
  // The admin runs on this same origin. Another site framing this page can't drive it and hears nothing back.
  const inAdmin = !!cmsMode && parent !== window && (() => { try { return parent.location.origin === location.origin; } catch (e) { return false; } })();
  const ORIGIN = location.origin && location.origin !== 'null' ? location.origin : '*';
  const post = m => { if (inAdmin) try { parent.postMessage(m, ORIGIN); } catch (e) {} };
  let readySent = false; const pending = []; // content problems found before 'miras:ready' are reported right after it
  const bornAt = performance.now();

  /* ================= copy (English / Arabic) ================= */
  // shared by every inner page (content.shared.text); the rest of a page's keys are its own (content.pages[page].text)
  const SHARED_EN = {
    'n.work': 'Work', 'n.services': 'Services', 'n.about': 'About', 'n.contact': 'Contact', 'n.start': 'Start a project', 'n.menu': 'Menu', 'n.close': 'Close', 'n.home': 'Home',
    'f.copy': '© 2026 MIRAS · mirasmarketing.com',
    's.strategy': 'Strategy', 's.branding': 'Branding', 's.content': 'Content', 's.digital': 'Digital',
    's.websites': 'Website design', 's.seo': 'SEO', 's.social': 'Social media', 's.ads': 'Paid ads',
    'c.concept': 'Concept', 'c.all': 'All', 'cta.l': 'Start a project', 'cta.t': 'What’s your next project?', 'cta.d': 'Send us a few lines. We reply within one working day.', 'cta.b': 'Start a project', 'cta.w': 'See the work',
    'ft.ask': 'Tell us what you’re working on.', 'ft.reply': 'We reply within one working day.', 'sv.ask': 'Ask about this', 'a11y.main': 'Skip to content',
    'aria.main': 'Main', 'aria.footer': 'Footer', 'aria.legal': 'Legal', 'aria.brand': 'MIRAS', 'brand.name': 'MIRAS',
    'l.privacy': 'Privacy policy', 'l.terms': 'Terms &amp; conditions', 'l.cookies': 'Cookie policy',
  };
  /* Arabic glossary, the same on every page, in index.html and in work.js: a brief → «الطلب» (never «موجز») · the social service →
     «إدارة حسابات التواصل الاجتماعي» (short tag «سوشيال ميديا») · paid ads → «الإعلانات الممولة» · websites → «تصميم المواقع وصفحات
     الهبوط» · Reels → «ريلز» · Concept → «مشروع مفاهيمي». English service names: Social media setup & management · Paid ads & SEO ·
     Campaign ideas (the idea; buying and running the ads is Paid ads, advertising.html). Page names in menus (s.websites, s.seo,
     s.social, s.ads): Website design · SEO · Social media · Paid ads / «تصميم المواقع» · «تحسين محركات البحث» (in running copy
     «تحسين محركات البحث (SEO)») · «السوشيال ميديا» · «الإعلانات الممولة». A row or link that opens a service page uses these shared
     keys (s.*), so its name is the menu's in both languages. Hero words that must fit a phone may be shorter than the menu name:
     SEO «الظهور في البحث» (its ask «اسأل عن تحسين الظهور في البحث»), Paid ads «الإعلانات». Google in Arabic copy → «جوجل»
     («خرائط جوجل», «ملف النشاط التجاري على جوجل»); tool names stay Latin (Google Search Console), and so do the legal pages. */
  const SHARED_AR = {
    'n.work': 'أعمالنا', 'n.services': 'خدماتنا', 'n.about': 'من نحن', 'n.contact': 'تواصل معنا', 'n.start': 'ابدأ مشروعك', 'n.menu': 'القائمة', 'n.close': 'إغلاق', 'n.home': 'الرئيسية',
    'f.copy': '© 2026 ميراس · mirasmarketing.com',
    's.strategy': 'الاستراتيجية', 's.branding': 'العلامة التجارية', 's.content': 'المحتوى', 's.digital': 'التسويق الرقمي',
    's.websites': 'تصميم المواقع', 's.seo': 'تحسين محركات البحث', 's.social': 'السوشيال ميديا', 's.ads': 'الإعلانات الممولة',
    'c.concept': 'مشروع مفاهيمي', 'c.all': 'الكل', 'cta.l': 'ابدأ مشروعك', 'cta.t': 'ما مشروعك القادم؟', 'cta.d': 'أرسل لنا بضعة أسطر، وسنردّ خلال يوم عمل واحد.', 'cta.b': 'ابدأ مشروعك', 'cta.w': 'شاهد الأعمال',
    'ft.ask': 'أخبرنا بما تعمل عليه.', 'ft.reply': 'نردّ خلال يوم عمل واحد.', 'sv.ask': 'اسأل عن هذه الخدمة', 'a11y.main': 'انتقل إلى المحتوى',
    'aria.main': 'القائمة الرئيسية', 'aria.footer': 'روابط التذييل', 'aria.legal': 'روابط قانونية', 'aria.brand': 'ميراس', 'brand.name': 'ميراس',
    'l.privacy': 'سياسة الخصوصية', 'l.terms': 'الشروط والأحكام', 'l.cookies': 'سياسة ملفات تعريف الارتباط',
  };
  const SHARED = new Set(Object.keys(SHARED_EN));
  // copy that belongs to the home page's content (content.text / content.ui) and shows here too; these are its defaults
  const HOME_COPY = {
    en: { 'cons.text': 'Allow analytics? It shows us which pages are useful.', 'cons.ok': 'Allow analytics', 'cons.no': 'No thanks', 'f.privacy': 'How we handle your details',
          budgets: 'Not sure yet|Under QAR 20,000|QAR 20,000–50,000|QAR 50,000–150,000|Over QAR 150,000' },
    ar: { 'cons.text': 'هل تسمح لنا بقياس زيارتك؟ تساعدنا التحليلات على تحسين الموقع.', 'cons.ok': 'السماح بالتحليلات', 'cons.no': 'لا، شكراً', 'f.privacy': 'كيف نتعامل مع بياناتك',
          budgets: 'لم نحدّدها بعد|أقل من 20,000 ريال|من 20,000 إلى 50,000 ريال|من 50,000 إلى 150,000 ريال|أكثر من 150,000 ريال' },
  };
  // this page's own copy, read before anything is drawn: English from the page, Arabic from window.PAGE_AR
  const PEN = {}, PAR = {};
  $$('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if (!SHARED.has(k) && !(k in PEN)) PEN[k] = tokenize(el.innerHTML); });
  $$('[data-i18n-aria]').forEach(el => { const k = el.dataset.i18nAria; if (!SHARED.has(k) && !(k in PEN)) PEN[k] = escText(el.getAttribute('aria-label') ?? ''); });
  $$('[data-i18n-alt]').forEach(el => { const k = el.dataset.i18nAlt; if (!SHARED.has(k) && !(k in PEN)) PEN[k] = escText(el.getAttribute('alt') ?? ''); });
  for (const [k, v] of Object.entries(isObj(window.PAGE_AR) ? window.PAGE_AR : {})) if (!SHARED.has(k) && typeof v === 'string') PAR[k] = tokenize(v);
  // the page's meta description is page copy too ('meta.d'): English from the tag, Arabic from PAGE_AR['meta.d'].
  // Only a page that gives the Arabic gets the key, so every page key keeps both languages.
  const META = $('meta[name=description]');
  if (META && 'meta.d' in PAR && !('meta.d' in PEN)) PEN['meta.d'] = escText(META.getAttribute('content') || '');
  // image slots the admin can swap on this page: <img data-media="<slot>">
  const MEDIA_DEF = {}; $$('img[data-media]').forEach(img => { const k = sid(img.dataset.media, ''); if (k && !(k in MEDIA_DEF)) MEDIA_DEF[k] = img.getAttribute('src') || ''; });
  // the footer line, both languages at once (content.tagline, the same as on the home page)
  const TAGLINE_DEF = { en: $('[data-cms="tagline.en"]')?.innerHTML ?? 'From the swell to the shore.', ar: $('[data-cms="tagline.ar"]')?.innerHTML ?? 'من الموج إلى الشاطئ.' };
  // PLACEHOLDER until the client confirms (the same defaults as index.html's STUDIO): email, WhatsApp, hours (Sun–Thu 9:00–18:00 Qatar time)
  const STUDIO_DEF = { email: DEFAULT_EMAIL, whatsapp: '', phoneLabel: '', timezone: 'Asia/Qatar', open: '09:00', close: '18:00', days: [0, 1, 2, 3, 4],
                       formEndpoint: '', analytics: { provider: '', id: '', src: '' },
                       exceptions: [], consent: false, privacyUrl: 'privacy.html', formFields: { phone: false, budget: false } };
  const MW = window.MIRAS_WORK || null; // assets/work.js, on the pages that show projects

  const DEFAULTS = clone({
    schema: 'miras.content', version: 1,
    pages: { [PAGE]: { text: { en: PEN, ar: PAR }, media: MEDIA_DEF } },
    shared: { text: { en: SHARED_EN, ar: SHARED_AR } },
    ...(MW ? { work: MW.defaults, workHome: MW.homeDefaults } : {}),
    studio: STUDIO_DEF, theme: C_DEF, tagline: TAGLINE_DEF, schedule: [],
  });

  // what the page shows now
  let PAGE_TEXT = clone(DEFAULTS.pages[PAGE].text), SHARED_TEXT = clone(DEFAULTS.shared.text), MEDIA = clone(MEDIA_DEF), SCHEDULE = [], HOME = { text: null, ui: null };
  const STUDIO = clone(STUDIO_DEF), TAGLINE = clone(TAGLINE_DEF), TEXT = { en: {}, ar: {} };
  const rebuild = () => { for (const l of ['en', 'ar']) TEXT[l] = { ...SHARED_TEXT[l], ...PAGE_TEXT[l] }; };
  rebuild();

  /* ================= content: normalise each part, apply it on its own ================= */
  const COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i, HM = /^([01]?\d|2[0-3]):[0-5]\d$/, YMD = /^\d{4}-\d{2}-\d{2}$/;
  const BLANK = { day: { id: '', from: '', to: '', label: { en: '', ar: '' }, closed: true, open: '', close: '' }, plan: { id: '', at: '', note: '', overrides: {} } };
  const uniq = (list, pre) => { const seen = new Set(); return list.map((x, i) => { let id = sid(x.id, pre + (i + 1)); while (seen.has(id)) id += '-' + (i + 1); seen.add(id); return { ...x, id }; }); };
  const dict = (v, def) => {
    if (!isObj(v)) throw new TypeError('expected { en, ar }');
    const o = {};
    for (const l of Object.keys(def)) { const d = { ...def[l] }, src = isObj(v[l]) ? v[l] : {}; for (const k of Object.keys(src)) { const s = str(src[k]); if (s != null && !badKey(k)) d[k] = s; } o[l] = d; }
    return o;
  };
  function normStudio(v) {
    if (!isObj(v)) throw new TypeError('expected an object');
    const d = STUDIO_DEF, o = conform(v, d);
    o.days = Array.isArray(v.days) ? [...new Set(v.days.map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6))] : [...d.days];
    if (!HM.test(o.open)) o.open = d.open;
    if (!HM.test(o.close)) o.close = d.close;
    if (o.timezone !== d.timezone) try { new Intl.DateTimeFormat('en', { timeZone: o.timezone }); } catch (e) { o.timezone = d.timezone; }
    o.email = o.email.trim();
    o.formEndpoint = safeUrl(o.formEndpoint) ?? '';
    o.privacyUrl = safeUrl(o.privacyUrl) ?? '';
    o.analytics = { ...o.analytics, provider: ['', 'plausible', 'ga4', 'umami'].includes(o.analytics.provider) ? o.analytics.provider : '', src: safeUrl(o.analytics.src) ?? '' };
    o.exceptions = (Array.isArray(v.exceptions) ? v.exceptions : []).map((x, i) => {
      if (!isObj(x)) return null;
      const e = conform(x, BLANK.day), from = YMD.test(e.from) ? e.from : '', to = YMD.test(e.to) && e.to >= from ? e.to : from;
      const open = HM.test(e.open) ? e.open : '', close = HM.test(e.close) ? e.close : '';
      return { ...e, id: sid(e.id, 'day-' + (i + 1)), from, to, open, close, closed: typeof x.closed === 'boolean' ? x.closed : !(open && close) };
    }).filter(e => e && e.from);
    return o;
  }
  const NORM = {
    shared: v => { if (!isObj(v)) throw new TypeError('expected { text: { en, ar } }'); return { text: dict(v.text === undefined ? {} : v.text, DEFAULTS.shared.text) }; },
    pages: v => {
      if (!isObj(v)) throw new TypeError('expected { <page>: { text, media } }');
      const p = v[PAGE] === undefined ? {} : v[PAGE]; if (!isObj(p)) throw new TypeError(`expected pages.${PAGE} to be an object`);
      const media = p.media === undefined ? {} : p.media; if (!isObj(media)) throw new TypeError(`expected pages.${PAGE}.media to be image paths`);
      const d = DEFAULTS.pages[PAGE];
      return { [PAGE]: { text: dict(p.text === undefined ? {} : p.text, d.text),
        media: Object.fromEntries(Object.entries(d.media).map(([k, def]) => [k, media[k] === undefined ? def : safeUrl(media[k], true) ?? def])) } };
    },
    ...(MW ? { work: v => MW.normalize(v), workHome: v => MW.normalizeHome(v) } : {}),
    studio: normStudio,
    theme: v => { if (!isObj(v)) throw new TypeError('expected colours'); return Object.fromEntries(Object.entries(C_DEF).map(([k, d]) => [k, COLOR.test(str(v[k]) ?? '') ? v[k] : d])); },
    tagline: v => { if (!isObj(v)) throw new TypeError('expected { en, ar }'); return conform(v, DEFAULTS.tagline); },
    schedule: v => !Array.isArray(v) ? [] : uniq(v.map(x => isObj(x) ? conform(x, BLANK.plan) : null).filter(x => x && !isNaN(Date.parse(x.at))), 'at-'),
  };
  const APPLY = {
    shared(v) { SHARED_TEXT = v.text; },
    pages(v) { PAGE_TEXT = v[PAGE].text; MEDIA = v[PAGE].media; },
    ...(MW ? { work(v) { MW.use(v); }, workHome(v) { MW.use([...window.WORK], v); } } : {}),
    studio(v) { refill(STUDIO, v); },
    theme(v) {
      let moved = false;
      for (const k of Object.keys(C)) { const was = C[k]; C[k] = v[k] || C_DEF[k]; if (C[k] !== was) moved = true; if (C[k] === C_DEF[k]) html.style.removeProperty('--' + k); else html.style.setProperty('--' + k, C[k]); }
      if (moved) withMotifs(MO => MO.readColors()); // the motifs re-read only the tokens a theme actually moved
    },
    tagline(v) { refill(TAGLINE, v); },
    schedule(v) { SCHEDULE = v; },
  };
  function exportContent() {
    return clone({
      schema: 'miras.content', version: 1,
      pages: { [PAGE]: { text: PAGE_TEXT, media: MEDIA } }, shared: { text: SHARED_TEXT },
      ...(MW ? { work: window.WORK, workHome: MW.homeSlugs } : {}),
      studio: STUDIO, theme: C, tagline: TAGLINE, schedule: SCHEDULE,
    });
  }
  function setContent(f) {
    const errs = [];
    for (const part of Object.keys(APPLY)) {
      try { APPLY[part](NORM[part](f[part])); }
      catch (err) { errs.push({ part, message: errText(err) }); try { APPLY[part](NORM[part](clone(DEFAULTS[part]))); } catch (e) {} }
    }
    // the home page's own copy that shows here too (consent bar, budget ranges): read as plain strings, sanitised when shown
    HOME = { text: isObj(f.text) ? f.text : null, ui: isObj(f.ui) ? f.ui : null };
    rebuild();
    try { showContent(); } catch (err) { errs.push({ part: 'page', message: errText(err) }); }
    return errs;
  }
  // the content to show at a moment: content.js over DEFAULTS, then every scheduled change whose time has come, oldest first
  function resolve(c, at) {
    let f = merge(DEFAULTS, isObj(c) ? c : {});
    const due = (Array.isArray(f.schedule) ? f.schedule : []).map((x, i) => [x, i]).filter(([x]) => isObj(x) && isObj(x.overrides) && Date.parse(x.at) <= at)
      .sort((a, b) => Date.parse(a[0].at) - Date.parse(b[0].at) || a[1] - b[1]);
    for (const [x] of due) { const { schedule, meta, ...o } = x.overrides; f = merge(f, o); }
    return f;
  }
  // previews show the draft as it is; the live site (and ?cms=export) applies the schedule as of now
  function useContent(c, at = cmsMode === 'preview' ? -Infinity : Date.now(), quiet = false) {
    let f, errs = [];
    try { f = clone(resolve(c, at)); } catch (err) { errs.push({ part: 'content', message: errText(err) }); f = clone(DEFAULTS); }
    errs = errs.concat(setContent(f));
    if (!quiet) report(errs);
    return errs;
  }
  function report(errs) {
    for (const e of errs) {
      console.warn(`MIRAS: the "${e.part}" content couldn't be used, so its defaults are showing.`, e.message);
      if (readySent) post({ type: 'miras:error', page: PAGE, ...e }); else pending.push(e);
    }
  }
  // the admin preview starts from the saved draft: the full content (old format) or { v: 2, overrides } over the published content
  function savedDraft() {
    let d = null; try { d = JSON.parse(localStorage.getItem('miras.cms.draft') || 'null'); } catch (e) {}
    if (!isObj(d)) return null;
    if (d.v !== 2) return d;
    // `base` may be an overrides object (a draft file); the admin's own saves keep hashes there ({ d, p, at }), which aren't content
    let base = isObj(d.base) && Object.keys(d.base).some(k => k in DEFAULTS || k === 'text' || k === 'ui') ? d.base : null;
    if (!base) { // the admin's rule: what this browser published last, when that is newer than content.js
      let local = null; try { local = JSON.parse(localStorage.getItem('miras.admin.published') || 'null'); } catch (e) {}
      const served = isObj(window.MIRAS_CONTENT) ? window.MIRAS_CONTENT : {}, servedAt = Date.parse(served.meta?.publishedAt) || 0, localAt = Date.parse(local?.at) || 0;
      base = localAt > servedAt && isObj(local?.overrides) ? local.overrides : served;
    }
    return merge(base, isObj(d.overrides) ? d.overrides : {});
  }

  /* ================= uploads in a standalone preview tab ================= */
  // "Open in a new tab" reads uploads ('media:<id>') straight from the admin's IndexedDB; it never creates that database
  const uploads = {};
  function uploadUrl(id) {
    return uploads[id] ||= new Promise(res => {
      let r; try { r = indexedDB.open('miras-admin'); } catch (e) { return res(null); }
      r.onupgradeneeded = () => r.transaction.abort();
      r.onerror = r.onblocked = () => res(null);
      r.onsuccess = () => {
        const db = r.result;
        try { const q = db.transaction('files', 'readonly').objectStore('files').get(id); q.onsuccess = () => { db.close(); res(q.result instanceof Blob ? URL.createObjectURL(q.result) : null); }; q.onerror = () => { db.close(); res(null); }; }
        catch (e) { db.close(); res(null); }
      };
    });
  }
  function showUploads() {
    if (cmsMode !== 'preview') return;
    $$('img[data-up]').forEach(img => { const id = img.dataset.up; uploadUrl(id).then(u => { if (u && img.dataset.up === id) img.src = u; }); });
  }
  function showContent() {
    // images: an empty slot, or an upload the page can't read ('media:<id>'), shows the default picture
    $$('img[data-media]').forEach(img => {
      const k = img.dataset.media, v = MEDIA[k] ?? '', up = /^media:([\w-]+)$/.exec(v), src = !v || up ? MEDIA_DEF[k] : v;
      img.dataset.cms = `pages.${PAGE}.media.${k}`;
      if (up) img.dataset.up = up[1]; else delete img.dataset.up;
      if (img.getAttribute('src') !== src) img.src = src;
    });
    $('meta[name=theme-color]')?.setAttribute('content', C.tide);
    for (const l of ['en', 'ar']) $$(`[data-cms="tagline.${l}"]`).forEach(el => { el.innerHTML = safe(TAGLINE[l]); });
  }

  /* ================= language ================= */
  const hooks = [];
  const pick = (k, l) => TEXT[l]?.[k] ?? TEXT.en[k];
  const M = window.MIRAS = {
    lang: 'en', C, $, $$, clamp, page: PAGE, cms: cmsMode, bornAt, esc, fmt, safeUrl,
    get reduce() { return reduce; },
    /** sanitised HTML for a key in the current language ({tokens} filled from vars first) */
    t: (k, vars) => { const v = pick(k, M.lang); return v == null ? esc(k) : view(vars ? fmt(v, vars) : v); },
    /** the same as plain text, for textContent and attributes */
    text: (k, vars) => { const v = pick(k, M.lang); return v == null ? k : textOf(vars ? fmt(v, vars) : v); },
    /** plain text for a key in a given language, whatever the page shows now (the About marquee mixes both) */
    textIn: (k, l = M.lang) => { const v = pick(k, l === 'ar' ? 'ar' : 'en'); return v == null ? '' : textOf(v); },
    /** the shared tide class (assets/motifs.js), kept here for older page scripts */
    get Tide() { return window.MOTIFS ? window.MOTIFS.Tide : null; },
    /** copy from the home page's content that also shows here: 'cons.text', 'cons.ok', 'cons.no', 'f.privacy', 'budgets' */
    homeCopy: (k, l = M.lang) => str(k === 'budgets' ? HOME.ui?.[l]?.budgets : HOME.text?.[l]?.[k]) ?? HOME_COPY[l]?.[k] ?? HOME_COPY.en[k] ?? '',
    /** budget ranges (content.ui.<lang>.budgets, '|' between items) */
    budgets: (l = M.lang) => String(M.homeCopy('budgets', l)).split('|').map(s => textOf(s.trim())).filter(Boolean),
    studio: STUDIO,
    onLang: fn => { hooks.push(fn); fn(M.lang); },
    /** set the page's meta description (plain text), e.g. from a project's line in the current language */
    meta: s => { if (META && s != null) META.setAttribute('content', String(s).replace(/\s+/g, ' ').trim().slice(0, 300)); },
    settle: el => settle(el),
    /** write the canonical and og:url again (project.html calls it once it has written the project's address pair) */
    address: () => syncHead(M.lang),
  };

  /* ================= the address: one file serves both languages (?lang=ar is the Arabic one) ================= */
  // The head holds what both addresses share: the pair of hreflang alternates (en, ar, x-default). What differs, the
  // canonical and og:url, is written here from that pair, so the address of the language shown names itself, ?lang=ar
  // included (as Google asks, no canonical is in the raw HTML for a script to change). A page without the pair (the 404,
  // an unknown project) gets neither. The address bar follows the language (lang=ar; lang=en or none for English), and so do
  // the links to the site's own pages, so a reader and a crawler stay in the language they came in.
  const OWN_HOSTS = new Set([location.host, 'www.mirasmarketing.com', 'mirasmarketing.com']);
  const saveLang = l => { if (!cmsMode) try { localStorage.setItem('miras-lang', l); } catch (e) {} };
  // the same address in a language: lang=ar set; for English lang is taken out, or set to lang=en when `named`; the rest
  // of the query and the hash stay
  function inLang(href, l, named) {
    const m = /^([^?#]*)(?:\?([^#]*))?(#.*)?$/.exec(href), q = new URLSearchParams(m[2] || ''), want = l === 'ar' ? 'ar' : named ? 'en' : null;
    if (want ? q.get('lang') === want : !q.has('lang')) return href;
    if (want) q.set('lang', want); else q.delete('lang');
    const s = String(q);
    return m[1] + (s ? '?' + s : '') + (m[3] || '');
  }
  // this page in a language, as a path on this site (the switch and the Arabic hint link here). The English one names
  // its language (lang=en), so a new tab or a copied link opens English even for a visitor who saved Arabic
  const pageIn = l => inLang(location.pathname + location.search, l, true);
  // the address bar: lang=ar in Arabic; in English lang=en when the address already had a lang (SITE-CONTRACT §6, the
  // address the switch links to), else no lang. The canonical comes from the hreflang pair, never from this address
  function syncUrl(l) {
    if (cmsMode) return;
    try { const now = location.pathname + location.search, to = inLang(now, l, new URLSearchParams(location.search).has('lang')); if (to !== now) history.replaceState(history.state, '', to + location.hash); } catch (e) {}
  }
  function syncHead(l) {
    const head = document.head, alt = head.querySelector(`link[rel="alternate"][hreflang="${l === 'ar' ? 'ar' : 'en'}"]`);
    let can = head.querySelector('link[rel="canonical"]'), og = head.querySelector('meta[property="og:url"]');
    if (!alt) { can?.remove(); og?.remove(); return; }
    const url = alt.getAttribute('href');
    if (!can) { can = document.createElement('link'); can.rel = 'canonical'; head.querySelector('link[rel="alternate"][hreflang]').before(can); }
    if (can.getAttribute('href') !== url) can.setAttribute('href', url);
    if (!og) {
      og = document.createElement('meta'); og.setAttribute('property', 'og:url');
      const at = head.querySelector('meta[property="og:site_name"], meta[property="og:type"]'); if (at) at.after(og); else head.append(og);
    }
    if (og.getAttribute('content') !== url) og.setAttribute('content', url);
  }
  // a link to one of the site's own pages carries the language; mail, phone, other sites, #places on this page, files
  // (images, PDFs, the sitemap), the admin and webmail are left as they are
  function ownPage(a) {
    const h = a.getAttribute('href');
    if (!h || h[0] === '#' || a.id === 'langBtn' || a.hasAttribute('download') || a.hasAttribute('data-lang-keep')) return null;
    let u; try { u = new URL(h, location.href); } catch (e) { return null; }
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || !OWN_HOSTS.has(u.host)) return null;
    const seg = u.pathname.split('/'), last = seg[seg.length - 1];
    if (seg.includes('admin') || seg[1] === 'webmail' || seg[1] === 'assets' || (/\.\w+$/.test(last) && !/\.html?$/i.test(last))) return null;
    return h;
  }
  function linkLang(a) { const h = ownPage(a); if (h == null) return; const to = inLang(h, M.lang); if (to !== h) a.setAttribute('href', to); }
  const linksLang = () => { if (!cmsMode) $$('a[href]').forEach(linkLang); };
  // in Arabic, links drawn later (work cards, a project's next link, a service's brief link) take lang=ar as they appear
  const linkWatch = !cmsMode && 'MutationObserver' in window ? new MutationObserver(rs => {
    for (const r of rs) {
      if (r.type === 'attributes') { if (r.target.matches('a')) linkLang(r.target); }
      else for (const n of r.addedNodes) if (n.nodeType === 1) { if (n.matches('a[href]')) linkLang(n); n.querySelectorAll('a[href]').forEach(linkLang); }
    }
  }) : null;
  function watchLinks(on) {
    if (!linkWatch) return;
    linkWatch.disconnect();
    if (on) linkWatch.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  }
  // the switch is a link to this page in the other language (hreflang, and lang for its own word), so it works without
  // this script and a new tab opens the other language; a plain click switches in place
  function paintSwitch(l) {
    const b = $('#langBtn'), to = l === 'ar' ? 'en' : 'ar'; if (!b) return;
    b.textContent = to === 'ar' ? 'العربية' : 'English'; b.lang = to;
    if (b.tagName === 'A') { b.setAttribute('hreflang', to); b.setAttribute('href', pageIn(to)); }
  }

  function setLang(l) {
    M.lang = l; html.lang = l; html.dir = l === 'ar' ? 'rtl' : 'ltr';
    syncUrl(l); // first, so the page hooks read the address of the language they draw
    $$('[data-i18n]').forEach(el => { const v = pick(el.dataset.i18n, l); if (v == null) return; const h = view(v); if (el.innerHTML !== h) el.innerHTML = h; }); // words already showing are left alone
    $$('[data-i18n-aria]').forEach(el => { const v = pick(el.dataset.i18nAria, l); if (v != null) el.setAttribute('aria-label', textOf(v)); });
    $$('[data-i18n-alt]').forEach(el => { const v = pick(el.dataset.i18nAlt, l); if (v != null) el.setAttribute('alt', textOf(v)); });
    // links to the studio's email outside the copy (contact details, legal pages)
    $$('a[data-cms="studio.email"]').forEach(a => { a.href = 'mailto:' + STUDIO.email; a.textContent = STUDIO.email; a.dir = 'ltr'; });
    paintSwitch(l);
    const t = window.PAGE_TITLE; if (t) document.title = t[l] || t.en;
    // before the page hooks, so a page can still write its own (project.html: MIRAS.meta(line) in its onLang hook)
    if (META) { const v = pick('meta.d', l); if (v != null) META.setAttribute('content', textOf(v)); }
    paintConsent();
    hooks.forEach(fn => fn(l));
    syncShare(l);
    // after the page hooks: project.html writes its address pair there, and the hooks draw cards and links
    syncHead(l); linksLang(); watchLinks(l === 'ar');
    $$('[data-settle].settle').forEach(el => { el.classList.remove('settle'); settle(el); });
    showUploads();
    // motifs re-read direction, words and colours
    withMotifs(MO => MO.refresh());
  }
  // draw the page in a language; if the content breaks drawing, draw the defaults instead
  function render(l, quiet) {
    try { setLang(l); return null; }
    catch (err) {
      const e = { part: 'render', message: errText(err) }; if (!quiet) report([e]);
      try { setContent(clone(DEFAULTS)); setLang(l); } catch (e2) { console.error('MIRAS: the page could not be drawn.', e2); }
      return e;
    }
  }
  // the social cards follow the page: their title and description are the words the page has now (<title> and the
  // description), og:locale names the language (ar_AR is the Arabic locale Facebook knows), and the share image's alt
  // text is in the language shown (English from the static tag). Crawlers that do not run scripts read the static tags
  const SHARE_ALT = { en: document.head.querySelector('meta[property="og:image:alt"]')?.getAttribute('content') || '', ar: 'شعار ميراس، وبجانبه ميرا تركب موجة أمام شمس برتقالية.' };
  function syncShare(l) {
    const put = (sel, v) => { const m = document.head.querySelector(sel); if (m && v != null && v !== '') m.setAttribute('content', String(v)); };
    const title = document.title, desc = META ? META.getAttribute('content') : '';
    put('meta[property="og:title"]', title); put('meta[name="twitter:title"]', title);
    put('meta[property="og:description"]', desc); put('meta[name="twitter:description"]', desc);
    put('meta[property="og:locale"]', l === 'ar' ? 'ar_AR' : 'en_GB');
    put('meta[property="og:locale:alternate"]', l === 'ar' ? 'en_GB' : 'ar_AR');
    const alt = SHARE_ALT[l === 'ar' ? 'ar' : 'en'];
    put('meta[property="og:image:alt"]', alt); put('meta[name="twitter:image:alt"]', alt);
  }
  // a switch keeps the reader's place: the words nearest a third of the way down the screen stay where they were.
  // The page redraws its words in place, so the browser's own scroll anchoring does not hold them.
  // a word in a sticky or fixed block (the legal pages' contents list) stays put while the page scrolls, so it cannot hold a place
  const pinned = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
  function keepPlace() {
    const vh = innerHeight || 800; let at = null, best = Infinity;
    for (const el of $$('[data-i18n]')) {
      if (el.closest('header, #mnav') || pinned(el)) continue; // fixed chrome stays put whatever the page does
      const r = el.getBoundingClientRect(); if (r.height < 1 || r.bottom <= 0 || r.top >= vh) continue;
      const d = Math.abs(r.top - vh / 3); if (d < best) { best = d; at = el; }
    }
    if (!at) return () => {};
    const key = at.dataset.i18n, idx = $$(`[data-i18n="${key}"]`).indexOf(at), top = at.getBoundingClientRect().top;
    return () => {
      const el = at.isConnected ? at : $$(`[data-i18n="${key}"]`)[idx];
      if (!el) return;
      const dy = el.getBoundingClientRect().top - top;
      if (Math.abs(dy) > .5) scrollTo({ top: scrollY + dy, behavior: 'instant' });
    };
  }
  // the words settle for a moment after a switch (web fonts, the redraw's reflow), so the place is held through that;
  // the reader's own scroll or tap ends the hold at once
  function holdPlace(keep) {
    const ev = ['wheel', 'touchstart', 'pointerdown', 'keydown'], end = performance.now() + 700; let on = true;
    const done = () => { on = false; ev.forEach(t => removeEventListener(t, done, true)); };
    ev.forEach(t => addEventListener(t, done, { capture: true, passive: true }));
    const tick = () => { if (!on) return; keep(); if (performance.now() < end) requestAnimationFrame(tick); else done(); };
    requestAnimationFrame(tick);
    document.fonts?.ready?.then(() => { if (on) keep(); }, () => {});
  }
  // the visitor picks a language (the switch, the Arabic hint): it is remembered ('miras-lang') and the page redraws in
  // place; the address follows (setLang), so it can be shared as it is
  function chooseLang(l) { const keep = keepPlace(); saveLang(l); render(l); keep(); holdPlace(keep); dropHint(); }
  // a link that switches in place on a plain click; with a modifier key (or the middle button) the browser opens its address
  function switchLink(a, to) {
    const link = a.tagName === 'A', fresh = () => { if (link) a.setAttribute('href', pageIn(to())); };
    a.addEventListener('pointerdown', fresh);
    a.addEventListener('click', e => {
      fresh();
      if (link && (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
      e.preventDefault(); chooseLang(to());
    });
  }
  const langBtn = $('#langBtn');
  if (langBtn) switchLink(langBtn, () => M.lang === 'ar' ? 'en' : 'ar');

  /* ---- the Arabic hint: a browser set to Arabic, on the English site, with no language in the address and none chosen
     before, gets a thin bar offering the Arabic site. It never switches by itself; «إخفاء» hides it for good
     ('miras-ar-hint'). It exists only for those browsers, so nobody else's page changes. ---- */
  let arHint = null;
  function dropHint() {
    if (!arHint) return;
    const m = document.getElementById('main') || $('main');
    if (m && arHint.contains(document.activeElement)) { if (!m.hasAttribute('tabindex')) m.tabIndex = -1; m.focus({ preventScroll: true }); }
    arHint.remove(); arHint = null;
  }
  function offerArabic(saved) {
    if (cmsMode || arHint || M.lang !== 'en' || Q.has('lang') || saved === 'ar' || saved === 'en') return;
    let first = '', off = null;
    try { first = String((navigator.languages && navigator.languages[0]) || navigator.language || ''); } catch (e) {}
    if (!/^ar(?:-|_|$)/i.test(first)) return;
    try { off = localStorage.getItem('miras-ar-hint'); } catch (e) {}
    if (off) return;
    const bar = arHint = document.createElement('div');
    bar.className = 'ar-hint'; bar.id = 'arHint'; bar.lang = 'ar'; bar.dir = 'rtl';
    bar.setAttribute('role', 'region'); bar.setAttribute('aria-labelledby', 'arHintText');
    bar.innerHTML = '<p id="arHintText">هذا الموقع متوفّر بالعربية.</p><a hreflang="ar" data-lang-keep>تصفّح بالعربية</a><button type="button">إخفاء</button>';
    const a = bar.querySelector('a'); a.setAttribute('href', pageIn('ar'));
    switchLink(a, () => 'ar');
    bar.querySelector('button').addEventListener('click', () => { try { localStorage.setItem('miras-ar-hint', '1'); } catch (e) {} dropHint(); });
    document.body.append(bar);
  }

  /* ================= studio hours (studio.open/close/days/timezone, special days in studio.exceptions) ================= */
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const mins = v => { const [h, m] = String(v).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const hhmm = v => { const [h, m] = String(v).split(':'); return `${+h || 0}:${String(m || '00').padStart(2, '0')}`; };
  const addDays = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  // 7 Jan 2024 was a Sunday, so day d is 7 + d
  const dayName = d => new Intl.DateTimeFormat(M.lang === 'ar' ? 'ar' : 'en-GB', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + d, 12)));
  function studioNow(when) {
    const opts = tz => ({ timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false });
    let parts; try { parts = new Intl.DateTimeFormat('en-GB', opts(STUDIO.timezone)).formatToParts(when); } catch (e) { parts = new Intl.DateTimeFormat('en-GB', opts('Asia/Qatar')).formatToParts(when); }
    const get = k => parts.find(p => p.type === k)?.value;
    return { hh: +get('hour') % 24, mm: get('minute'), wd: WD[get('weekday')] ?? 0, ymd: `${get('year')}-${get('month')}-${get('day')}` };
  }
  function hoursOn(ymd, wd) {
    const x = (STUDIO.exceptions || []).find(x => x.from && ymd >= x.from && ymd <= (x.to || x.from));
    if (x) return x.closed ? { x, closed: true } : { x, open: x.open || STUDIO.open, close: x.close || STUDIO.close };
    return (STUDIO.days || []).includes(wd) ? { open: STUDIO.open, close: STUDIO.close } : { closed: true };
  }
  /** Is the studio open? → { time: 'HH:MM', open, key: 'open'|'today'|'tomorrow'|'weekend'|'closedFor'|'hoursFor', vars: { day, open, close, label } } */
  M.hours = (when = new Date()) => {
    const { hh, mm, wd, ymd } = studioNow(when), now = hh * 60 + +mm, day = hoursOn(ymd, wd);
    const label = x => { const l = x?.label || {}; return String(l[M.lang] || l.en || l.ar || '').trim(); };
    let n = 1, next = null; for (; n <= 21; n++) { const h = hoursOn(addDays(ymd, n), (wd + n) % 7); if (!h.closed) { next = h; break; } }
    const open = !day.closed && now >= mins(day.open) && now < mins(day.close);
    const key = day.closed && day.x && label(day.x) ? 'closedFor'
      : !day.closed && day.x && label(day.x) && now < mins(day.close) ? 'hoursFor'
      : open ? 'open' : !day.closed && now < mins(day.open) ? 'today' : !day.closed && n === 1 ? 'tomorrow' : 'weekend';
    const later = key === 'today' || key === 'hoursFor';
    return { time: `${String(hh).padStart(2, '0')}:${mm}`, open, key,
      vars: { day: dayName((wd + n) % 7), open: hhmm(later ? day.open : next?.open || STUDIO.open), close: day.close ? hhmm(day.close) : '', label: label(day.x) } };
  };

  /* ================= analytics, consent, first touch, briefs ================= */
  // Events go to the analytics service chosen in the admin. On the studio's own browsers (the ones that have opened the admin)
  // they're also kept locally, so the admin can show a live feed while you test the site. Nothing is tracked in the admin's previews.
  let adminHere = false; try { adminHere = localStorage.getItem('miras.admin') === '1'; } catch (e) {}
  const SID = Math.random().toString(36).slice(2, 10);
  M.track = (e, p = {}) => {
    if (cmsMode) return;
    const a = STUDIO.analytics || {};
    try {
      if (a.provider === 'plausible' && window.plausible) window.plausible(e, { props: p });
      else if (a.provider === 'ga4' && window.gtag) window.gtag('event', e, p);
      else if (a.provider === 'umami' && window.umami) window.umami.track(e, p);
    } catch (err) {}
    if (!adminHere) return;
    try {
      const list = JSON.parse(localStorage.getItem('miras.events') || '[]');
      list.push({ t: Date.now(), e, p, s: SID, l: M.lang, d: innerWidth < 760 ? 'mobile' : innerWidth < 1100 ? 'tablet' : 'desktop' });
      localStorage.setItem('miras.events', JSON.stringify(list.slice(-3000)));
    } catch (err) {}
  };
  /** A brief, kept for the admin's Inbox on the studio's own browsers only (the same list as the home page's form). */
  M.keepLead = lead => {
    if (!adminHere || cmsMode) return;
    try { const list = JSON.parse(localStorage.getItem('miras.leads.inbox') || '[]'); list.push(lead); localStorage.setItem('miras.leads.inbox', JSON.stringify(list.slice(-500))); } catch (e) {}
  };
  // first touch: where this visit came from, kept for the session (whichever page it lands on) and sent with a brief
  M.touch = (() => {
    let t = null; try { t = JSON.parse(sessionStorage.getItem('miras.touch') || 'null'); } catch (e) {}
    if (isObj(t)) return t;
    const cut = v => String(v || '').slice(0, 120); let ref = '';
    try { const r = document.referrer ? new URL(document.referrer) : null; ref = r && r.host !== location.host ? r.hostname : ''; } catch (e) {}
    t = { ref, source: cut(Q.get('utm_source')), medium: cut(Q.get('utm_medium')), campaign: cut(Q.get('utm_campaign')), landing: location.pathname, at: new Date().toISOString() };
    if (!cmsMode) try { sessionStorage.setItem('miras.touch', JSON.stringify(t)); } catch (e) {}
    return t;
  })();
  let analyticsOn = false;
  function injectAnalytics() {
    const a = STUDIO.analytics || {}, id = String(a.id || '').trim(); if (cmsMode || !a.provider || !id || analyticsOn) return; analyticsOn = true;
    const add = (src, attrs = {}) => { const sc = document.createElement('script'); sc.defer = true; sc.src = src; for (const [k, v] of Object.entries(attrs)) sc.setAttribute(k, v); document.head.appendChild(sc); };
    if (a.provider === 'plausible') { window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); }; add(a.src || 'https://plausible.io/js/script.js', { 'data-domain': id }); }
    else if (a.provider === 'ga4') { window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); }; window.gtag('js', new Date()); window.gtag('config', id); add('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id)); }
    else if (a.provider === 'umami') add(a.src || 'https://cloud.umami.is/script.js', { 'data-website-id': id });
  }
  // Analytics always wait for the visitor's yes, remembered in this browser ('miras.consent' = 'yes' | 'no').
  // Whenever a provider is set the bar is required, whatever studio.consent says.
  let consentBar = null;
  function askConsent() {
    const a = STUDIO.analytics || {}; if (cmsMode || !a.provider || !String(a.id || '').trim()) return;
    let c = null; try { c = localStorage.getItem('miras.consent'); } catch (e) {}
    if (c === 'yes') return injectAnalytics(); if (c === 'no') return;
    if (consentBar) return paintConsent();
    consentBar = document.createElement('div');
    consentBar.className = 'consent'; consentBar.id = 'consent'; consentBar.setAttribute('role', 'region'); consentBar.setAttribute('aria-labelledby', 'consText');
    consentBar.innerHTML = '<p id="consText"></p><div class="acts"><button type="button" class="pill flare" id="consOk"></button><button type="button" class="pill ghost" id="consNo"></button><a id="consMore" target="_blank" rel="noopener" hidden></a></div>';
    document.body.append(consentBar); paintConsent();
    const choose = yes => { try { localStorage.setItem('miras.consent', yes ? 'yes' : 'no'); } catch (e) {}
      // the focused button is about to disappear: hand focus to the page content so a keyboard user keeps their place
      const m = document.getElementById('main') || document.querySelector('main');
      if (m && consentBar.contains(document.activeElement)) { if (!m.hasAttribute('tabindex')) m.tabIndex = -1; m.focus({ preventScroll: true }); }
      consentBar.remove(); consentBar = null; if (yes) injectAnalytics(); M.track('consent', { on: yes, page: PAGE }); };
    $('#consOk').onclick = () => choose(true); $('#consNo').onclick = () => choose(false);
  }
  M.consent = askConsent; // runs once on load; tests call it again after changing M.studio
  function paintConsent() {
    if (!consentBar) return;
    $('#consText', consentBar).textContent = textOf(M.homeCopy('cons.text'));
    $('#consOk', consentBar).textContent = textOf(M.homeCopy('cons.ok'));
    $('#consNo', consentBar).textContent = textOf(M.homeCopy('cons.no'));
    const more = $('#consMore', consentBar), url = safeUrl(STUDIO.privacyUrl) || '';
    more.textContent = textOf(M.homeCopy('f.privacy')); more.hidden = !url; if (url) more.href = url; else more.removeAttribute('href');
  }

  // the pieces of the content layer that site.css doesn't style: consent bar, optional form fields, spam trap, inspect
  const css = document.createElement('style');
  css.textContent = `.consent{--ring:var(--foam);position:fixed;z-index:60;inset-inline-start:16px;bottom:16px;max-width:min(540px,calc(100vw - 32px));display:flex;flex-wrap:wrap;align-items:center;gap:14px 18px;padding:18px 20px;border-radius:2px;background:var(--deep);color:var(--shore);box-shadow:0 0 0 1px color-mix(in srgb,var(--shore) 16%,transparent);font:400 15px/1.5 var(--sans)}
.consent p{flex:1 1 240px}.consent .acts{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px}.consent .pill{min-height:44px;padding:0 20px}.consent .pill.ghost{color:var(--shore)}
.consent a{color:inherit;font-size:14px;text-underline-offset:.2em;text-decoration-thickness:1px}html[lang=ar] .consent{font-family:var(--ar)}
.hp{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.field select{font:400 20px/1.4 var(--sans);color:var(--fg);background:transparent;border:0;border-bottom:1.5px solid color-mix(in srgb,var(--fg) 55%,transparent);padding-block:8px;padding-inline:0 28px;border-radius:0;-webkit-appearance:none;appearance:none;cursor:pointer}
.field select:focus{outline:none;border-bottom-color:var(--fg);box-shadow:0 1px 0 var(--fg)}.field select option{color:var(--deep);background:var(--shore)}
.field.sel{position:relative}.field.sel::after{content:"";position:absolute;inset-inline-end:6px;bottom:22px;width:8px;height:8px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);pointer-events:none;opacity:.8}
html[lang=ar] .field select{font-family:var(--ar)}
html.cms-inspect [data-i18n],html.cms-inspect [data-cms]{outline:1.5px dashed color-mix(in srgb,var(--flare) 70%,transparent);outline-offset:3px;cursor:pointer!important;border-radius:2px}
html.cms-inspect [data-i18n]:hover,html.cms-inspect [data-cms]:hover{outline:2px solid var(--flare);background:color-mix(in srgb,var(--flare) 14%,transparent)}
.cms-flash{animation:cmsflash 1.2s ease-out}@keyframes cmsflash{0%,40%{outline:2px solid var(--flare);outline-offset:6px;background:color-mix(in srgb,var(--flare) 22%,transparent)}100%{outline:2px solid transparent;outline-offset:6px}}`;
  document.head.append(css);

  // browsers without field-sizing (Firefox, older Safari): every message box grows by script, so long text is never stuck
  // in its first rows. The CSS min-height is still the floor (nothing here hard-codes one), and max-height caps the growth.
  if (!(window.CSS && CSS.supports && CSS.supports('field-sizing', 'content'))) {
    const grow = t => { t.style.boxSizing = 'border-box'; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, innerHeight * .4) + 'px'; };
    const growAll = () => $$('.field textarea').forEach(grow);
    document.addEventListener('input', e => { if (e.target.matches && e.target.matches('.field textarea')) grow(e.target); });
    document.addEventListener('reset', () => setTimeout(growAll));
    addEventListener('resize', growAll, { passive: true });
    growAll();
  }
  // the skip link moves focus into the content as well as the scroll: <main id="main"> takes focus, so the next Tab starts there
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a.skip-link[href="#main"]'), m = a && document.getElementById('main');
    if (!m) return;
    if (!m.hasAttribute('tabindex')) m.tabIndex = -1;
    setTimeout(() => m.focus({ preventScroll: true }));
  });

  /* ---------- nav: solid after the hero, slips away on the way down ---------- */
  const nav = $('#nav'), dark = $('[data-nav-dark]'), heroEl = $('main > section, main > div, #main > *');
  let navY = scrollY, lastSy = NaN, lastBottom = NaN;
  // runs on every frame of the shared loop: it measures, compares with the last frame and writes a class only when it
  // changes, so a page at rest causes no style work at all
  const setCls = (c, on) => { if (nav.classList.contains(c) !== on) nav.classList.toggle(c, on); };
  // the hero's box is read only when the page moved, or its layout could have changed (a resize, or the hero's own size
  // changing): a page at rest reads no layout here, so the shared loop's frames cost nothing on an idle page
  let navLayoutDirty = true;
  addEventListener('resize', () => { navLayoutDirty = true; }, { passive: true });
  if (heroEl && 'ResizeObserver' in window) new ResizeObserver(() => { navLayoutDirty = true; }).observe(heroEl);
  function navFrame() {
    if (!nav) return;
    const sy = scrollY;
    if (sy === lastSy && !navLayoutDirty) return;
    const r = heroEl?.getBoundingClientRect(), bottom = r ? r.bottom : -1;
    navLayoutDirty = false;
    if (sy === lastSy && bottom === lastBottom) return;
    lastSy = sy; lastBottom = bottom;
    const solid = sy > 30, over = bottom > 60 && !solid;
    setCls('on-dark', over && !!dark && heroEl === dark);
    setCls('on-flare', over && !!heroEl && heroEl.classList.contains('t-flare'));
    setCls('solid', solid);
    const away = nav.classList.contains('away');
    if (sy < 200 || (away && sy < navY - 6)) { setCls('away', false); navY = sy; }
    else if (!away && sy > navY + 10) { setCls('away', true); navY = sy; }
    else navY = away ? Math.max(navY, sy) : Math.min(navY, sy);
  }
  navFrame(); setTimeout(() => nav?.classList.add('ready'), 50);
  withMotifs(MO => MO.onFrame(navFrame, { always: true }));
  const menuBtn = $('.menu-btn'), mnav = $('#mnav'), navBar = $('#nav');
  // while the menu is open the page behind it is inert: focus stays in the menu (and on its Close button) and nothing
  // behind the overlay can take focus or scroll the page. A shut menu is inert too, so its links stay out of the tab order.
  // The header (the logo, the language switch, the pill) is not behind it: it sits above the sheet and stays usable
  let inerted = [];
  function setMenuInert(open) {
    if (mnav) mnav.inert = !open;
    inerted.forEach(el => { el.inert = false; }); inerted = [];
    if (!open) return;
    // the header stays live: its language switch and Start a project pill work with the sheet open, as on the home page
    const behind = [...document.body.children].filter(el => el !== mnav && el !== navBar && el.tagName !== 'SCRIPT');
    inerted = behind.filter(el => !el.inert); inerted.forEach(el => { el.inert = true; });
  }
  setMenuInert(false);
  // the button names what it does: "Menu" while closed, "Close" while open (its key follows, so a language switch
  // with the menu open keeps the right word)
  menuBtn?.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') !== 'true', hadFocus = mnav.contains(document.activeElement);
    menuBtn.setAttribute('aria-expanded', open); mnav.classList.toggle('open', open); document.body.style.overflow = open ? 'hidden' : '';
    setMenuInert(open);
    // opening moves focus to the first link, so keyboard users start inside the menu (the overlay is fixed: no scroll)
    if (open) mnav.querySelector('a')?.focus({ preventScroll: true });
    // closing from inside the sheet (Close, a link, Escape) hands focus back to the Menu button, as the sheet goes out of the tab order
    else if (hadFocus) menuBtn.focus({ preventScroll: true });
    menuBtn.dataset.i18n = open ? 'n.close' : 'n.menu'; const v = pick(menuBtn.dataset.i18n, M.lang || 'en'); if (v != null) menuBtn.innerHTML = view(v);
  });
  mnav?.addEventListener('click', e => { if (e.target.closest('a')) { menuBtn.click(); } });
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuBtn?.getAttribute('aria-expanded') === 'true') { menuBtn.click(); menuBtn.focus(); } });
  // with the sheet open, Tab cycles through the header controls and the sheet's links in page order, as on the home page:
  // past the last link it goes to the logo, and Shift+Tab from the logo goes to the last link, so focus never reaches the page or the browser
  addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !mnav || menuBtn?.getAttribute('aria-expanded') !== 'true') return;
    const f = [...document.querySelectorAll('#nav a[href], #nav button, #mnav a[href], #mnav button')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey ? i <= 0 : i === f.length - 1 || i < 0) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus({ preventScroll: true }); }
  });
  // a sheet left open while the window grows past the phone width would cover the desktop page with the page inert (the
  // menu button is hidden there, so nothing else closes it): close it through the same click that restores the page
  matchMedia('(min-width:901px)').addEventListener?.('change', e => { if (e.matches && menuBtn?.getAttribute('aria-expanded') === 'true') menuBtn.click(); });
  // the menu marks the page you are on, and ends on the brand: the footer line in both languages and the studio email
  if (mnav) {
    const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('a', mnav).forEach(a => { const f = (a.getAttribute('href') || '').split(/[?#]/)[0].split('/').pop().toLowerCase(); if (f && f === here && !(a.getAttribute('href') || '').includes('#')) a.setAttribute('aria-current', 'page'); });
    if (!$('.mnav-foot', mnav)) {
      const foot = document.createElement('div'); foot.className = 'mnav-foot';
      foot.innerHTML = `<p class="foot-tag"><span lang="en" data-cms="tagline.en">${safe(TAGLINE.en)}</span> <span class="arx" lang="ar" dir="rtl" data-cms="tagline.ar">${safe(TAGLINE.ar)}</span></p>` +
        `<a data-cms="studio.email" dir="ltr" href="mailto:${escText(STUDIO.email)}">${escText(STUDIO.email)}</a>`;
      mnav.append(foot);
    }
  }
  // the service pages, one tap from anywhere: an indented list under Services in the phone menu and a hover/focus flyout
  // under Services on desktop (the words are shared keys, so the language switch translates them). Services itself opens
  // services.html. The four single-service pages come first, websites and SEO leading (.nav-p), then the four disciplines
  // (.nav-g; Digital is the monthly umbrella over the first four). [file, key]; data-page is the file's name
  const SERVICE_PAGES = [['websites', 's.websites'], ['seo', 's.seo'], ['social-media', 's.social'], ['advertising', 's.ads']];
  const DISCS = [['strategy', 's.strategy'], ['branding', 's.branding'], ['content', 's.content'], ['digital', 's.digital']];
  M.servicePages = [...SERVICE_PAGES, ...DISCS].map(([page, key]) => ({ page, file: page + '.html', key }));
  (() => {
    const link = cls => ([k, key]) => {
      const a = document.createElement('a'), svc = $('.nav-links a[data-i18n="n.services"], #mnav a[data-i18n="n.services"]');
      a.href = ((svc?.getAttribute('href') || '').startsWith('/') ? '/' : '') + k + '.html'; a.dataset.i18n = key; a.textContent = SHARED_EN[key]; a.className = cls;
      if (PAGE === k) a.setAttribute('aria-current', 'page');
      return a;
    };
    const links = () => [...SERVICE_PAGES.map(link('nav-p')), ...DISCS.map(link('nav-g'))];
    const ms = $('#mnav a[data-i18n="n.services"]');
    if (ms && !$('#mnav .mnav-sub')) { const sub = document.createElement('div'); sub.className = 'mnav-sub'; sub.append(...links()); ms.after(sub); }
    const ds = $('.nav-links a[data-i18n="n.services"]');
    if (ds && !ds.closest('.nav-svc')) {
      const wrap = document.createElement('span'), fly = document.createElement('span'); wrap.className = 'nav-svc'; fly.className = 'nav-fly'; fly.append(...links());
      ds.replaceWith(wrap); wrap.append(ds, fly);
      // Escape shuts it for keyboard users, and it stays shut (the .shut class, as on the home page) until the pointer leaves
      // or the focus moves out: the focus stays on the link, so :focus-within would bring a timed hide straight back
      // document-level, so a pointer resting on the flyout dismisses it too (:hover), not only focus inside the wrapper
      document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; const inside = wrap.contains(document.activeElement); if (inside || wrap.matches(':hover')) { wrap.classList.add('shut'); if (inside) ds.focus(); } });
      wrap.addEventListener('pointerleave', () => wrap.classList.remove('shut'), { passive: true });
      wrap.addEventListener('focusout', e => { if (!wrap.contains(e.relatedTarget)) wrap.classList.remove('shut'); });
    }
  })();

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  const watch = () => { $$('[data-settle].settle:not(.in)').forEach(el => io.observe(el)); showUploads(); };
  function splitWords(root) {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = []; let i = 0;
    while (tw.nextNode()) nodes.push(tw.currentNode);
    nodes.forEach(n => { const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) frag.append(w); else { const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = w; frag.append(s); } });
      n.replaceWith(frag); });
  }
  function settle(el) { if (reduce || !el.hasAttribute('data-settle')) return; if (!el.querySelector('.w')) splitWords(el); el.classList.add('settle'); if (!el.classList.contains('in')) io.observe(el); }
  M.watch = watch;

  /* ---------- the footer (MIRA + Mira) and the one loop: both live in motifs.js ---------- */
  withMotifs(MO => MO.footer($('#foot') || $('.foot')));
  // the admin pauses previews it isn't showing; a preview out of sight sleeps on its own
  let adminPaused = false, unseen = false;
  function wake() { withMotifs(MO => MO.pause(adminPaused || unseen)); }
  M.running = () => window.MOTIFS ? window.MOTIFS.running() : !adminPaused && !unseen;
  if (inAdmin && window.IntersectionObserver) try { new IntersectionObserver(es => { unseen = !es[es.length - 1].isIntersecting; wake(); }).observe(document.body); } catch (e) {}

  /* ================= start ================= */
  let inspecting = false;
  useContent(cmsMode === 'preview' && savedDraft() || window.MIRAS_CONTENT);
  try { askConsent(); } catch (e) {}
  let saved = null; try { saved = localStorage.getItem('miras-lang'); } catch (e) {}
  const asked = Q.get('lang');
  // an address that names its language is the visitor's choice (a link from the Arabic site, a shared ?lang=ar), so it is
  // remembered; English shown only because nothing was chosen is not, so the Arabic hint can still be offered later
  if (asked === 'ar' || asked === 'en') saveLang(asked);
  // a content problem never stops the page: drawing falls back to the defaults, and the admin always hears 'miras:ready'
  // (once the page's own scripts have run, so its first 'miras:content' redraws them too)
  // an Arabic visit is laid out right to left from its first paint (the head script in every page sets lang, dir and
  // html.pre-lang); its nav, main and footer stay hidden until the words are in, including those the page's own script
  // writes after this one, so the page is shown once, already in Arabic (site.css: html.pre-lang)
  // The canonical, og:url and the links are written once more then too, for what the page's own script drew.
  const reveal = () => { announce(); html.classList.remove('pre-lang'); try { syncHead(M.lang); linksLang(); } catch (e) {} };
  try { render(asked === 'ar' || asked === 'en' ? asked : saved === 'ar' ? 'ar' : 'en'); }
  finally { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal, { once: true }); else reveal(); }
  try { offerArabic(saved); } catch (e) {}
  $$('[data-settle]').forEach(settle);
  watch();
  wake();
  { let ref = ''; try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
    M.track('view', { ref, utm: Q.get('utm_source') || '', page: PAGE }); }
  document.addEventListener('click', e => { const a = !inspecting && e.target.closest?.('a.card[href]'); if (a) M.track('work', { to: a.getAttribute('href'), from: PAGE }); });
  // a dropped request gets one quiet retry instead of a broken image
  document.addEventListener('error', e => { const im = e.target; if (im.tagName !== 'IMG' || im.dataset.retried) return; im.dataset.retried = '1'; const s = im.getAttribute('src'); if (s && !/^(?:blob|data):/.test(s)) setTimeout(() => { im.src = s + (s.includes('?') ? '&' : '?') + 'retry=1'; }, 700); }, true);

  /* ================= Admin live preview (?cms=preview / ?cms=export) ================= */
  function announce() {
    if (!inAdmin || readySent) return; readySent = true;
    let content = null, published = null; try { content = exportContent(); } catch (e) {} try { published = clone(window.MIRAS_CONTENT ?? null); } catch (e) {}
    post({ type: 'miras:ready', page: PAGE, defaults: DEFAULTS, content, published, lang: M.lang, errors: pending.slice() });
    pending.splice(0).forEach(e => post({ type: 'miras:error', page: PAGE, ...e }));
  }
  // inspect keys: 'text.<key>' = this page's copy, 'shared.<key>' = copy shared by every inner page, else the element's data-cms
  const keyOf = el => { if (el.dataset.cms) return el.dataset.cms; const k = el.dataset.i18n ?? el.dataset.i18nAlt ?? el.dataset.i18nAria; return (SHARED.has(k) ? 'shared.' : 'text.') + k; };
  function flash(key) {
    const q = v => window.CSS?.escape ? CSS.escape(v) : String(v).replace(/["\\]/g, '\\$&'), m = /^(?:text|shared)\.(.+)$/.exec(key);
    const sel = m ? `[data-i18n="${q(m[1])}"], [data-i18n-aria="${q(m[1])}"], [data-i18n-alt="${q(m[1])}"], [data-cms="${q(key)}"]` : `[data-cms="${q(key)}"], [data-cms^="${q(key)}."]`;
    const el = $$(sel).find(x => x.getClientRects().length); if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    el.classList.remove('cms-flash'); void el.offsetWidth; el.classList.add('cms-flash');
  }
  if (inAdmin) {
    addEventListener('message', e => {
      if (e.source !== parent || e.origin !== location.origin) return; // only the admin that framed this page, on this origin
      const m = isObj(e.data) ? e.data : {};
      if (m.type === 'miras:content' && isObj(m.content)) { useContent(m.content, typeof m.at === 'string' ? Date.parse(m.at) : undefined); render(m.lang === 'ar' ? 'ar' : m.lang === 'en' ? 'en' : M.lang); }
      else if (m.type === 'miras:check' && isObj(m.content)) { const errs = useContent(m.content, Date.now(), true), r = render(M.lang, true); let out = null; try { out = exportContent(); } catch (e) {} post({ type: 'miras:checked', page: PAGE, id: m.id ?? null, errors: r ? [...errs, r] : errs, content: out }); }
      else if (m.type === 'miras:lang') render(m.lang === 'ar' ? 'ar' : 'en');
      else if (m.type === 'miras:pause' || m.type === 'miras:resume') { adminPaused = m.type === 'miras:pause'; wake(); }
      else if (m.type === 'miras:goto' && typeof m.id === 'string') { const el = document.getElementById(m.id); if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: 'instant' }); }
      else if (m.type === 'miras:inspect') { inspecting = !!m.on; html.classList.toggle('cms-inspect', inspecting); }
      else if (m.type === 'miras:flash' && typeof m.key === 'string') flash(m.key);
    });
    document.addEventListener('click', e => {
      if (!inspecting) return;
      const el = e.target.closest?.('[data-cms],[data-i18n],[data-i18n-alt],[data-i18n-aria]'); if (!el) return;
      e.preventDefault(); e.stopPropagation();
      post({ type: 'miras:pick', page: PAGE, key: keyOf(el), lang: M.lang });
    }, true);
  }
})();
