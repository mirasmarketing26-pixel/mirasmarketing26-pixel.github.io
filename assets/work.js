/* MIRAS: concept projects for the Work pages. These are concepts made by MIRAS to show the craft, not client work.
   The list below is the DEFAULT. What visitors see is content.work from assets/content.js (published from the admin),
   applied by assets/site.js on the inner pages and by this file on the home page, which doesn't load site.js.

   content.work      [{ slug, discipline: 'strategy'|'branding'|'content'|'digital', year, cover, focal: 'x% y%', images: [],
                        motif: 'arches'|'oval'|'waves'|'dunes'|'rings', palette: [{ hex, en, ar }], fonts: { latin, arabic },
                        proto?: { en: [4], ar: [4], opts: { en: [[…]×3], ar: [[…]×3] }, next: { en, ar }, again: { en, ar } },
                        en: { name, client, tags: [], line, brief, idea, made: [] }, ar: { …same… } }]   (the whole list replaces the default)
                     motif, palette and fonts drive the code-drawn identity board (keyArt). A palette of fewer than four colours
                     draws the board in the MIRAS colours. fonts are Google Fonts family names, optionally with a weight
                     ("Fraunces 600"); empty means the MIRAS faces (Instrument Serif, IBM Plex Sans Arabic).
                     focal is where the cover photo's subject sits; the inset frames the photo around it (default the centre).
   content.workHome  [slug, …]   the projects on the home page, in order (the home page shows the first three)

   window.WORK        the projects on show (refilled in place, so pages that kept a reference see the change)
   window.MIRAS_WORK  { defaults, homeDefaults, normalize(list), normalizeHome(slugs), use(list, home), home(), src(v, slug, i),
                        resolve(content, at), keyArt, photo(path), ver(url), fonts(), faces(p), colours(p), focal(p), motifs }
   window.workCard(p, lang, cls)        one project card (wide | big | small | third | ''), shared by the home page, the work
                                        page and the discipline pages
   window.keyArt(p, lang, ratio, opts)  the project's identity board as an aria-hidden inline SVG; opts.plain = the pattern alone,
                                        opts.bare = the board without its name lockup */
(() => {
  // project.html's head preloads each default cover (slug → file and its DIMS width, below): a changed slug, cover or order
  // here is changed in that map too
  const DEFAULT_WORK = [
    { slug: 'halwa-lab', discipline: 'branding', year: 2026, cover: 'assets/work/halwa-1.jpg', focal: '50% 58%', images: ['assets/work/halwa-2.jpg', 'assets/work/halwa-4.jpg', 'assets/work/halwa-5.jpg', 'assets/work/halwa-6.jpg', 'assets/work/halwa-7.jpg'],
      motif: 'arches',
      palette: [{ hex: '#7A1E2C', en: 'Maroon', ar: 'عنّابي' }, { hex: '#E9B13A', en: 'Saffron', ar: 'زعفراني' }, { hex: '#F3E7CF', en: 'Cream', ar: 'كريمي' }, { hex: '#9DB46C', en: 'Pistachio', ar: 'فستقي' }],
      fonts: { latin: 'Fraunces', arabic: 'Reem Kufi' },
      en: { name: 'Halwa Lab', client: 'Artisan sweets', tags: ['Identity', 'Packaging'], line: 'Family recipes, packed for modern shelves.',
        brief: 'A family sweets kitchen wanted its gift boxes in big stores, still looking like the family shop.',
        idea: 'We drew a pattern from the arches of old Doha and gave every flavour its own colour, like stalls in a souq.',
        made: ['Brand identity', 'Packaging system', 'Gift bags and stickers', 'Pattern library'] },
      ar: { name: 'حلوى لاب', client: 'حلويات حِرفية', tags: ['هوية', 'تغليف'], line: 'وصفات عائلية، بتغليف يناسب المتاجر الحديثة.',
        brief: 'مطبخ حلويات عائلي أراد أن تدخل علب هداياه المتاجر الكبرى، وأن تبقى تشبه دكّان العائلة.',
        idea: 'استوحينا نقشاً من أقواس الدوحة القديمة، ومنحنا كل نكهة لونها، كدكاكين السوق.',
        made: ['الهوية البصرية', 'نظام التغليف', 'أكياس الهدايا والملصقات', 'مكتبة النقوش'] } },
    { slug: 'corniche-night-run', discipline: 'branding', year: 2026, cover: 'assets/work/run-2.jpg', focal: '55% 60%', images: ['assets/work/run-4.jpg', 'assets/work/run-5.jpg', 'assets/work/run-6.jpg', 'assets/work/run-7.jpg'],
      motif: 'oval',
      palette: [{ hex: '#0B1033', en: 'Night', ar: 'ليلي' }, { hex: '#1F4BFF', en: 'Electric blue', ar: 'أزرق كهربائي' }, { hex: '#C6F432', en: 'Lime', ar: 'ليموني' }, { hex: '#F5F7FF', en: 'White', ar: 'أبيض' }],
      fonts: { latin: 'Anton', arabic: 'Lalezar' },
      en: { name: 'Corniche Night Run', client: 'City sports event', tags: ['Campaign', 'Social media'], line: 'A city run that glows after sunset.',
        brief: 'A new evening race needed runners to sign up early.',
        idea: 'Electric blue and lime speed lines, taken from the Corniche at night, on billboards, bibs and phones.',
        made: ['Campaign idea', 'Outdoor and digital ads', 'Social content', 'Race kit design'] },
      ar: { name: 'سباق الكورنيش الليلي', client: 'فعالية رياضية', tags: ['حملة', 'سوشيال ميديا'], line: 'سباق في المدينة يتوهّج بعد الغروب.',
        brief: 'سباق مسائي جديد أراد أن يسجّل العدّاؤون فيه مبكراً.',
        idea: 'خطوط سرعة بالأزرق الكهربائي والأخضر الليموني، مأخوذة من ألوان الكورنيش ليلاً، على اللوحات وأرقام العدّائين والهواتف.',
        made: ['فكرة الحملة', 'الإعلانات الخارجية والرقمية', 'محتوى السوشيال ميديا', 'تصميم أطقم العدّائين'] } },
    { slug: 'bahr-kitchen', discipline: 'content', year: 2026, cover: 'assets/work/bahr-1.jpg', focal: '45% 52%', images: ['assets/work/bahr-2.jpg', 'assets/work/bahr-4.jpg', 'assets/work/bahr-5.jpg', 'assets/work/bahr-6.jpg', 'assets/work/bahr-7.jpg'],
      motif: 'waves',
      palette: [{ hex: '#1F8A8A', en: 'Sea teal', ar: 'فيروزي' }, { hex: '#FF7A59', en: 'Coral', ar: 'مرجاني' }, { hex: '#F2E3C6', en: 'Sand', ar: 'رملي' }, { hex: '#0E3B4A', en: 'Deep sea', ar: 'أزرق عميق' }],
      fonts: { latin: 'DM Serif Display', arabic: 'Aref Ruqaa' },
      en: { name: 'Bahr Kitchen', client: 'Seafood restaurant', tags: ['Content', 'Photography'], line: 'A month of content, ready before opening day.',
        brief: 'A new seafood restaurant had an opening date, but no photos and no posts.',
        idea: 'Shoot the day’s catch in bright daylight, then cut it into a launch video and a month of posts.',
        made: ['Launch video', 'Food photography', 'Social content', 'Menu design'] },
      ar: { name: 'مطبخ بحر', client: 'مطعم مأكولات بحرية', tags: ['محتوى', 'تصوير'], line: 'محتوى شهر كامل، جاهز قبل يوم الافتتاح.',
        brief: 'مطعم مأكولات بحرية جديد بلا صور ولا منشورات، وموعد افتتاحه محدّد.',
        idea: 'نصوّر صيد اليوم في ضوء النهار، ثم نصنع منه فيديو الإطلاق ومحتوى شهر كامل.',
        made: ['فيديو الإطلاق', 'تصوير الطعام', 'محتوى السوشيال ميديا', 'تصميم القائمة'] } },
    { slug: 'saffar', discipline: 'digital', year: 2026, cover: 'assets/work/saffar-1.jpg', focal: '60% 55%', images: ['assets/work/saffar-4.jpg', 'assets/work/saffar-5.jpg', 'assets/work/saffar-6.jpg', 'assets/work/saffar-7.jpg'],
      motif: 'dunes',
      palette: [{ hex: '#D98E4F', en: 'Dune', ar: 'لون الكثبان' }, { hex: '#B5523B', en: 'Terracotta', ar: 'طيني' }, { hex: '#F1DCC0', en: 'Sand', ar: 'رملي' }, { hex: '#2A1E3B', en: 'Desert night', ar: 'ليل الصحراء' }],
      fonts: { latin: 'Syne', arabic: 'Tajawal' },
      proto: { en: ['Where to?', 'When?', 'Who’s going?', 'Booked.'], ar: ['إلى أين؟', 'متى؟', 'من سيسافر؟', 'تمّ الحجز.'],
        opts: { en: [['Wadi Rum', 'Muscat', 'Salalah'], ['This weekend', 'Next month'], ['1', '2', '4+']], ar: [['وادي رم', 'مسقط', 'صلالة'], ['نهاية هذا الأسبوع', 'الشهر القادم'], ['1', '2', '4+']] },
        next: { en: 'Next', ar: 'التالي' }, again: { en: 'Start again', ar: 'ابدأ من جديد' } },
      en: { name: 'Saffar', client: 'Travel company', tags: ['Website', 'App'], line: 'Trips booked in three taps.',
        brief: 'A local travel company wanted customers to book on their phones instead of calling.',
        idea: 'Big photos, warm sand colours and one question per screen.',
        made: ['Website', 'Mobile app design', 'Booking flow', 'Launch ads'] },
      ar: { name: 'سفّار', client: 'شركة سفر', tags: ['موقع', 'تطبيق'], line: 'رحلات تُحجز بثلاث نقرات.',
        brief: 'شركة سفر محلية أرادت أن يحجز عملاؤها رحلاتهم من هواتفهم، بدل الاتصال بها.',
        idea: 'صور كبيرة، وألوان رملية دافئة، وسؤال واحد في كل شاشة.',
        made: ['الموقع الإلكتروني', 'تصميم التطبيق', 'مسار الحجز', 'إعلانات الإطلاق'] } },
    { slug: 'noor-clinics', discipline: 'strategy', year: 2026, cover: 'assets/work/noor-1.jpg', focal: '68% 45%', images: ['assets/work/noor-3.jpg', 'assets/work/noor-4.jpg', 'assets/work/noor-5.jpg', 'assets/work/noor-6.jpg', 'assets/work/noor-7.jpg'],
      motif: 'rings',
      palette: [{ hex: '#9FE3C9', en: 'Mint', ar: 'نعناعي' }, { hex: '#12285A', en: 'Navy', ar: 'كحلي' }, { hex: '#FFFFFF', en: 'White', ar: 'أبيض' }, { hex: '#3BA7A0', en: 'Teal', ar: 'تركوازي' }],
      fonts: { latin: 'Nunito', arabic: 'Almarai' },
      en: { name: 'Noor Clinics', client: 'Family clinics', tags: ['Strategy', 'Identity'], line: 'A clinic that feels calm before you walk in.',
        brief: 'A group of family clinics had grown fast, and every branch looked and sounded different.',
        idea: 'One promise, ‘care that explains itself’, carried into a mint-and-navy identity, clear signage and simple patient messages.',
        made: ['Brand strategy', 'Identity refresh', 'Wayfinding', 'Brand guidelines'] },
      ar: { name: 'عيادات نور', client: 'عيادات عائلية', tags: ['استراتيجية', 'هوية'], line: 'عيادة تشعرك بالطمأنينة قبل أن تدخلها.',
        brief: 'مجموعة عيادات عائلية نمت بسرعة، وصار لكل فرع شكل وصوت مختلف.',
        idea: 'وعد واحد: «رعاية واضحة من أول زيارة»، تحوّل إلى هوية بالنعناعي والكحلي، ولافتات واضحة، ورسائل بسيطة للمرضى.',
        made: ['استراتيجية العلامة', 'تحديث الهوية', 'نظام اللافتات', 'دليل الهوية'] } },
  ];
  const DISCIPLINES = {
    strategy: { page: 'strategy.html', en: 'Strategy', ar: 'الاستراتيجية' },
    branding: { page: 'branding.html', en: 'Branding', ar: 'العلامة التجارية' },
    content: { page: 'content.html', en: 'Content', ar: 'المحتوى' },
    digital: { page: 'digital.html', en: 'Digital', ar: 'التسويق الرقمي' },
  };
  // the three projects on the home page (index.html #work), in order
  const HOME = ['halwa-lab', 'bahr-kitchen', 'saffar'];
  const MOTIFS_KA = ['arches', 'oval', 'waves', 'dunes', 'rings'];
  const VER = 'r2';

  /* ---- small helpers (this file runs on the home page without site.js, so it carries its own) ---- */
  const clone = v => JSON.parse(JSON.stringify(v));
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const badKey = k => k === '__proto__' || k === 'constructor' || k === 'prototype';
  const str = v => typeof v === 'string' ? v : typeof v === 'number' && isFinite(v) ? String(v) : null;
  const sid = (v, fb) => String(str(v) ?? '').replace(/[^\w-]/g, '').slice(0, 64) || fb;
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const HEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
  // 'x% y%' (it goes into a style attribute, so nothing else passes)
  const FOCAL = /^(?:100|\d{1,2}(?:\.\d{1,2})?)% (?:100|\d{1,2}(?:\.\d{1,2})?)%$/;
  const focal = p => FOCAL.test(str(p?.focal) ?? '') ? p.focal : '50% 50%';
  // a Google Fonts family name, optionally with a weight: letters, digits and spaces only (it goes into CSS and a URL)
  const fontName = v => String(str(v) ?? '').replace(/[^A-Za-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 48);
  // image paths: this site, http(s), blob:, data:image or an admin upload ('media:<id>'); anything else is refused (null)
  function safeImg(v) {
    const s = (str(v) ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s) || s.startsWith('//') || !/^[a-z][\w+.-]*:/i.test(s)) return s;
    if (/^media:[\w-]+$/.test(s) || /^blob:/i.test(s) || /^data:image\/(?:png|jpe?g|gif|webp|avif|svg\+xml)[;,]/i.test(s)) return s;
    return null;
  }
  // the shape of `tpl`, filled from `v` where the types match (unknown extra keys pass through).
  // A list of objects (palette) or of lists (proto options) keeps its items, each shaped like the template item at its place.
  function conform(v, tpl) {
    if (typeof tpl === 'string') return str(v) ?? tpl;
    if (typeof tpl === 'number') return typeof v === 'number' && isFinite(v) ? v : tpl;
    if (typeof tpl === 'boolean') return typeof v === 'boolean' ? v : tpl;
    if (Array.isArray(tpl)) {
      if (!Array.isArray(v)) return clone(tpl);
      const t0 = tpl[0];
      if (isObj(t0) || Array.isArray(t0)) return v.filter(x => isObj(t0) ? isObj(x) : Array.isArray(x)).map((x, i) => conform(x, tpl[Math.min(i, tpl.length - 1)]));
      return v.map(str).filter(x => x != null);
    }
    if (isObj(tpl)) {
      const src = isObj(v) ? v : {}, o = {};
      for (const k of Object.keys(tpl)) o[k] = conform(src[k], tpl[k]);
      for (const k of Object.keys(src)) if (!(k in o) && !badKey(k)) o[k] = src[k];
      return o;
    }
    return v === undefined ? tpl : v;
  }
  const COPY = { name: '', client: '', tags: [], line: '', brief: '', idea: '', made: [] };
  const BLANK = { slug: '', discipline: 'branding', year: new Date().getFullYear(), cover: '', focal: '50% 50%', images: [],
    motif: 'rings', palette: [{ hex: '#2B3BF0', en: 'Tide', ar: 'أزرق المدّ' }], fonts: { latin: '', arabic: '' }, en: COPY, ar: COPY };

  /** A project list from content (an import, a hand-edited file…) in the default shape. Throws when it isn't a list. */
  function normalize(v) {
    if (!Array.isArray(v)) throw new TypeError('expected a list of projects');
    const seen = new Set();
    return v.map((x, i) => {
      if (!isObj(x)) return null;
      const tpl = DEFAULT_WORK.find(d => d.slug === x.slug) || BLANK;
      const y = typeof x.year === 'string' && /^\s*\d{1,4}\s*$/.test(x.year) ? +x.year : x.year;
      const p = conform({ ...x, year: y }, tpl);
      let slug = sid(p.slug, 'project-' + (i + 1)); while (seen.has(slug)) slug += '-' + (i + 1); seen.add(slug);
      p.slug = slug;
      if (!(p.discipline in DISCIPLINES)) p.discipline = tpl.discipline in DISCIPLINES ? tpl.discipline : 'branding';
      p.year = Math.round(p.year);
      p.cover = safeImg(p.cover) ?? tpl.cover ?? '';
      // a focal point given with the project, else the default's when the cover is the default's, else the centre
      p.focal = FOCAL.test(str(x.focal) ?? '') ? x.focal : p.cover === tpl.cover && FOCAL.test(tpl.focal || '') ? tpl.focal : '50% 50%';
      p.images = p.images.map(safeImg).filter(Boolean);
      if (!MOTIFS_KA.includes(p.motif)) p.motif = MOTIFS_KA.includes(tpl.motif) ? tpl.motif : 'rings';
      p.palette = p.palette.filter(c => HEX.test(c.hex));
      if (!p.palette.length) p.palette = clone(tpl.palette);
      p.fonts.latin = fontName(p.fonts.latin); p.fonts.arabic = fontName(p.fonts.arabic);
      return p;
    }).filter(Boolean);
  }
  /** The home page's projects: slugs, without repeats. Throws when it isn't a list. */
  function normalizeHome(v) {
    if (!Array.isArray(v)) throw new TypeError('expected a list of project slugs');
    return [...new Set(v.map(x => sid(x, '')).filter(Boolean))];
  }

  window.WORK = clone(DEFAULT_WORK);
  window.DISCIPLINES = DISCIPLINES;
  let home = [...HOME];
  /** Show these projects (already normalised). The array window.WORK is refilled in place. */
  function use(list, homeSlugs) {
    WORK.splice(0, WORK.length, ...list);
    if (Array.isArray(homeSlugs)) home = [...homeSlugs];
  }
  /** The projects for the home page, in order; the first three when none of the chosen ones exists. */
  function homeList() {
    const list = home.map(s => WORK.find(p => p.slug === s)).filter(Boolean);
    return list.length ? list : WORK.slice(0, 3);
  }
  /** An image for a project: an upload the page can't read yet ('media:<id>') shows the default picture of that slot. */
  function src(v, slug, i) {
    if (!/^media:/.test(v || '') && v) return v;
    const d = DEFAULT_WORK.find(p => p.slug === slug);
    return (i == null ? d?.cover : d?.images?.[i]) || d?.cover || '';
  }
  const upId = v => (/^media:([\w-]+)$/.exec(v || '') || [])[1] || '';
  /** A file of this site gets the cache key (?v=r2); other addresses are left alone. */
  const ver = u => /^(?:\/?assets\/)[^?#]*$/.test(u || '') ? `${u}?v=${VER}` : u || '';
  // the photos that ship with the site: their size, and WebPs beside them (assets/work/800/ and assets/work/1600/)
  const DIMS = { 'halwa-1': [1600, 1207], 'halwa-2': [1207, 1600], 'halwa-3': [1600, 900], 'run-1': [1600, 900], 'run-2': [1207, 1600],
    'run-3': [1600, 1207], 'bahr-1': [1600, 900], 'bahr-2': [1600, 1207], 'bahr-3': [1207, 1600], 'saffar-1': [1600, 900],
    'saffar-2': [1600, 1207], 'noor-1': [1600, 900], 'noor-2': [1600, 1207], 'noor-3': [1207, 1600],
    'halwa-4': [1600, 1207], 'halwa-5': [1207, 1600], 'halwa-6': [1600, 900], 'halwa-7': [1600, 1207],
    'run-4': [1600, 900], 'run-5': [1207, 1600], 'run-6': [1600, 1207], 'run-7': [1600, 900],
    'bahr-4': [1600, 1207], 'bahr-5': [1207, 1600], 'bahr-6': [1600, 900], 'bahr-7': [1600, 1207],
    'saffar-4': [1600, 900], 'saffar-5': [1207, 1600], 'saffar-6': [1600, 1207], 'saffar-7': [1600, 900],
    'noor-4': [1600, 900], 'noor-5': [1600, 1207], 'noor-6': [1207, 1600], 'noor-7': [1600, 1207] };
  /** { src, srcset, w, h } for a picture; srcset only for the default files. */
  function photo(path) {
    const m = /^assets\/work\/([\w-]+)\.jpg$/.exec(path || ''), d = m && DIMS[m[1]];
    if (!d) return { src: ver(path), srcset: '', w: 1600, h: 1200 };
    return { src: ver(path), srcset: `${ver(`assets/work/800/${m[1]}.webp`)} 800w, ${ver(`assets/work/1600/${m[1]}.webp`)} ${d[0]}w`, w: d[0], h: d[1] };
  }

  /* ================= the identity board (keyArt): pattern, palette, type, drawn from the project's own data ================= */
  const MC = { tide: '#2B3BF0', deep: '#0D0F2E', shore: '#F2EADB', flare: '#FF5A23', foam: '#BFF0DD', tide60: '#8098FD' };
  // the MIRAS colours a board uses when its project brings fewer than four colours (a new project from the admin)
  const ROLE = {
    arches: [MC.deep, MC.flare, MC.shore, MC.foam],   // ink, warm, ground, alternate
    oval: [MC.deep, MC.tide, MC.foam, MC.shore],      // ground, lanes, accent, light
    waves: [MC.tide, MC.flare, MC.shore, MC.deep],    // sea, coral, sand, deep
    dunes: [MC.flare, MC.tide60, MC.shore, MC.deep],  // dune, second dune, sand, night
    rings: [MC.foam, MC.deep, MC.shore, MC.tide],     // ground, ink, light, accent
  };
  function colours(p) {
    const own = (Array.isArray(p?.palette) ? p.palette : []).map(c => isObj(c) && HEX.test(c.hex || '') ? c.hex : null).filter(Boolean);
    return own.length >= 4 ? own.slice(0, 4) : [...ROLE[MOTIFS_KA.includes(p?.motif) ? p.motif : 'rings']];
  }
  // the faces the boards use: weight, and a rough advance per character (mixed case, capitals) to size names without measuring
  const FACES = { 'Fraunces': [600, .55, .72], 'Reem Kufi': [600, .5], 'Anton': [400, .42, .5], 'Lalezar': [400, .46],
    'DM Serif Display': [400, .5, .68], 'Aref Ruqaa': [700, .5], 'Syne': [700, .62, .86], 'Tajawal': [800, .48],
    'Nunito': [800, .57, .72], 'Almarai': [800, .52], 'Instrument Serif': [400, .44, .62], 'IBM Plex Sans Arabic': [600, .5] };
  const DESC = { 'Aref Ruqaa': .7, 'Lalezar': .6, 'Reem Kufi': .52 }; // deep Arabic descenders, so the next line clears them
  const LATIN = 'Instrument Serif', ARABIC = 'IBM Plex Sans Arabic';
  function face(v, fb) {
    const m = /^([A-Za-z][A-Za-z0-9 ]*?)(?: ([1-9]00))?$/.exec(fontName(v)), fam = m ? m[1] : fb, k = FACES[fam];
    const w = m?.[2] ? +m[2] : k ? k[0] : 400, adv = k?.[1] ?? (fb === ARABIC ? .5 : .56);
    return { fam, w, adv, cap: k?.[2] ?? adv * 1.3, ar: fb === ARABIC, desc: DESC[fam] ?? (fb === ARABIC ? .5 : .24),
      css: `'${fam}', ${fb === ARABIC ? `'${ARABIC}', sans-serif` : `'${LATIN}', Georgia, serif`}` };
  }
  const faces = p => ({ latin: face(p?.fonts?.latin, LATIN), arabic: face(p?.fonts?.arabic, ARABIC) });
  const n = v => Math.round(v * 10) / 10;
  const glyphs = s => String(s).replace(/[ً-ٰٟ]/g, '').length || 1;
  // the largest size (≤ max) at which `txt` fits `w` in face `f`
  const fit = (txt, f, w, max, caps) => Math.min(max, w / (glyphs(txt) * (caps ? f.cap : f.adv)));
  // two lines from a name, broken at the space nearest its middle
  function split2(s) {
    const t = String(s).trim(), sp = [...t.matchAll(/ /g)].map(m => m.index);
    if (!sp.length) return [t];
    const at = sp.reduce((a, b) => Math.abs(b - t.length / 2) < Math.abs(a - t.length / 2) ? b : a);
    return [t.slice(0, at), t.slice(at + 1)];
  }
  // a seed from a slug (FNV-1a), and a well-mixed 32-bit number from a seed and a tile's place: the same project always draws
  // the same field
  const seedOf = v => { let h = 2166136261; for (const ch of String(v)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const mix = (h, i) => { let x = Math.imul(h ^ Math.imul(i + 1, 0x9E3779B1), 0x85EBCA6B); x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35); return (x ^ x >>> 16) >>> 0; };
  /* A Truchet field as one path, from Smith's two-corner tile: `cols` × `rows` square tiles of side P from (x0, y0), each
     holding three concentric quarter arcs about two opposite corners, top-left and bottom-right (0) or top-right and
     bottom-left (1). Either way every edge carries its three line ends at .36, .5 and .64 of its length, the same seen from
     both tiles, so each line runs on into its neighbour and ends only where the field does. The radii keep one rhythm:
     the gap between a tile's two groups across its middle (√2 − 2 × .64 ≈ .13) is the gap inside a group (.14).
     The hash picks each tile's pair; a point that all four tiles round it would turn about (a closed ring, a target) is
     never made: the tile that would close it takes the other pair.
     `period`: the choice repeats every `period` columns, so a field drawn two periods wide can slide by one without a seam.
     `foot`: the field stands on a straight edge under its last row, where two tiles turning about one point of it would
     stand a lone arch on it; there a tile after one that turns about its bottom-right corner does the same.
     `box` [x0, y0, x1, y1]: the part on show. Three tiles turning about one point make a lane double back, and it leaves
     through the fourth; where the frame cuts that fourth tile away the turn reads as a ring, so one of the three takes
     its other pair (a periodic field only checks top and bottom: its columns all slide through the frame). */
  const RADII = [.36, .5, .64];
  // the four tiles round a point (row and column offsets from it) and the pair with which each turns about it
  const ROUND = [[-1, -1, 0], [-1, 0, 1], [0, -1, 1], [0, 0, 0]];
  function truchet(seed, x0, y0, cols, rows, P, period, foot, box) {
    const per = period || cols, o = [];
    // the pair chosen for the tile at (r, c); -1 outside the field or not chosen yet (a periodic field wraps across)
    const get = (r, c) => r < 0 || !period && (c < 0 || c >= per) ? -1 : o[r * per + ((c % per) + per) % per] ?? -1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < per; c++) {
      let v = mix(seed, r * 4099 + c) & 1;
      // the point at this tile's top-left: the tiles above-left (0), above (1) and to the left (1) already turn about it
      if (v === 0 && get(r - 1, c - 1) === 0 && get(r - 1, c) === 1 && get(r, c - 1) === 1) v = 1;
      // a periodic field: the last column's top-right point is the first column's top-left
      else if (period && c === per - 1 && v === 1 && get(r - 1, c) === 0 && get(r - 1, 0) === 1 && get(r, 0) === 0) v = 0;
      // (taking 0 here never closes a ring above: that needs the tile to the left to be 1)
      if (foot && r === rows - 1 && get(r, c - 1) === 0) v = 0;
      o[r * per + c] = v;
    }
    if (box) {
      const at = (r, c) => r * per + ((c % per) + per) % per, m = P / 4;
      // the tile whose middle is off the box, or within a quarter tile of its edge
      const off = (r, c) => { const x = x0 + (c + .5) * P, y = y0 + (r + .5) * P; return y < box[1] + m || y > box[3] - m || !period && (x < box[0] + m || x > box[2] - m); };
      // a point with all four tiles in the field that four turn about, or three with the fourth cut off
      const bad = (i, j) => {
        if (ROUND.some(([a, b]) => get(i + a, j + b) === -1)) return false;
        const miss = ROUND.filter(([a, b, v]) => get(i + a, j + b) !== v);
        return !miss.length || miss.length === 1 && off(i + miss[0][0], j + miss[0][1]);
      };
      for (let pass = 0; pass < 3; pass++) {
        let fixed = 0;
        for (let i = 1; i < rows; i++) for (let j = period ? 0 : 1; j < per; j++) {
          if (!bad(i, j)) continue;
          // the first of the three whose other pair leaves none of its four corners bad (the foot row keeps its order)
          for (const [a, b, v] of ROUND) {
            const r = i + a, c = j + b;
            if (get(r, c) !== v || foot && r === rows - 1) continue;
            o[at(r, c)] = 1 - v;
            if ([[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]].every(([y, x]) => !bad(y, x))) { fixed++; break; }
            o[at(r, c)] = v;
          }
        }
        if (!fixed) break;
      }
    }
    let d = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      for (const q of o[r * per + c % per] ? [1, 3] : [0, 2]) {
        const cx = x0 + (c + (q === 1 || q === 2 ? 1 : 0)) * P, cy = y0 + (r + (q > 1 ? 1 : 0)) * P;
        const a = q * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(a + Math.PI / 2), sb = Math.sin(a + Math.PI / 2);
        for (const f of RADII) {
          const R = f * P;
          d += `M${n(cx + R * ca)} ${n(cy + R * sa)}A${n(R)} ${n(R)} 0 0 1 ${n(cx + R * cb)} ${n(cy + R * sb)}`;
        }
      }
    }
    return d;
  }
  // a periodic line y(x) sampled from x0 to x1 (wave and dune edges)
  function edge(x0, x1, step, y) { let d = ''; for (let x = x0; x <= x1 + .01; x += step) d += (d ? 'L' : 'M') + n(x) + ' ' + n(y(x)); return d; }
  /* A block of names: the reader's language first and larger. items: [{ txt, f (face), fill, max, caps, lines (1|2) }].
     Placed in a column of width w starting at x (or ending at x when end), from `top` down or up from `bottom`. */
  function names(o) {
    const rows = [], sizes = [];
    o.items.forEach((it, j) => {
      const txt = it.caps ? String(it.txt).toUpperCase() : String(it.txt), lines = it.lines === 2 ? split2(txt) : [txt];
      const size = sizes[j] = Math.min(...lines.map(l => fit(l, it.f, o.w, it.max, it.caps)));
      lines.forEach((l, i) => rows.push({ ...it, l, size, first: i === 0 && j > 0 }));
    });
    const asc = r => r.size * (r.f.ar ? .9 : r.caps ? .76 : .8), desc = r => r.size * r.f.desc;
    const gap = r => r.first ? Math.max(r.size * .3, o.gap ?? 0) : r.size * (r.f.ar ? .1 : r.caps ? .02 : .06);
    const h = rows.reduce((a, r, i) => a + asc(r) + desc(r) + (i ? gap(r) : 0), 0);
    let y = o.top ?? o.bottom - h, out = '';
    rows.forEach((r, i) => {
      y += (i ? gap(r) : 0) + asc(r);
      const knock = o.knock ? ` stroke="${o.knock}" stroke-width="${n(r.size * .14)}" stroke-linejoin="round" paint-order="stroke"` : '';
      out += `<text x="${n(o.x)}" y="${n(y)}" font-family="${r.f.css}" font-weight="${r.f.w}" font-size="${n(r.size)}" fill="${r.fill}" text-anchor="${o.end ? 'end' : 'start'}"${r.caps ? ' letter-spacing=".01em"' : ''}${knock}>${esc(r.l)}</text>`;
      y += desc(r);
    });
    return { svg: out, h, sizes };
  }
  // a name block that must end above `limit` (the sea, the horizon): set smaller until it does
  function fitAbove(items, o, limit) {
    let t = names({ ...o, items });
    for (let i = 0; i < 3 && o.top + t.h > limit; i++) { const f = Math.max(.3, (limit - o.top) / t.h); items.forEach((it, j) => { it.max = t.sizes[j] * f; }); t = names({ ...o, items }); }
    return t;
  }
  /* the two names, the reader's language first at size `big`; the other one smaller (Arabic sets small for its size, so it gets more) */
  function pair(k, en, ar, big) {
    const [a, b] = k.rtl ? [ar, en] : [en, ar];
    a.max = big; b.max = big * (b.f.ar ? .78 : b.caps ? .42 : .6);
    return [a, b];
  }

  const ART = {
    /* Halwa: arch tiles in brick rows, a maroon/saffron checker, every third column pistachio; a cream name plate */
    arches(k) {
      const { W, H, C: [ink, warm, ground, alt], plain } = k;
      const u = plain ? Math.min(W / 7, k.s / 1.5) : W / 7, tw = u * .92, th = tw * 1.5, py = th + u * .08, r = tw / 2;
      const d = { ink: '', warm: '', alt: '' }, cols = Math.ceil(W / u) + 1;
      for (let row = -1; row < Math.ceil(H / py) + 3; row++) {
        const off = row & 1 ? u / 2 : 0, y = row * py + u * .04;
        for (let c = -1; c <= cols; c++) {
          const x = c * u + off + (u - tw) / 2, key = ((c % 3) + 3) % 3 === 0 ? 'alt' : (c + row) & 1 ? 'warm' : 'ink';
          d[key] += `M${n(x)} ${n(y + th)}V${n(y + r)}a${n(r)} ${n(r)} 0 0 1 ${n(tw)} 0V${n(y + th)}Z`;
        }
      }
      let out = `<rect width="${W}" height="${H}" fill="${ground}"/><g class="ka-pat" style="--ky:${n(-2 * py)}px"><path fill="${ink}" d="${d.ink}"/><path fill="${warm}" d="${d.warm}"/><path class="ka-alt" fill="${alt}" d="${d.alt}"/></g>`;
      if (plain || k.bare) return out;
      const pw = W * .46, pd = k.s * .05, items = pair(k, { txt: k.name.en, f: k.fl, fill: ink }, { txt: k.name.ar, f: k.fa, fill: ink }, Math.min(H * .17, 110));
      const t = names({ items, x: k.rtl ? W - pd : pd, end: k.rtl, w: pw - 2 * pd, top: 0 }), ph = t.h + pd * 1.8;
      const plate = names({ items, x: k.rtl ? W - pd : pd, end: k.rtl, w: pw - 2 * pd, top: H - ph + pd });
      return out + `<rect x="${n(k.rtl ? W - pw : 0)}" y="${n(H - ph)}" width="${n(pw)}" height="${n(ph + 1)}" fill="${ground}"/>` + plate.svg;
    },
    /* Corniche Night Run: eight stadium lanes (lane five in lime), lime speed strokes at −12°, the name stacked in white */
    oval(k) {
      const { W, H, C: [ground, lane, accent, light], plain, rtl, s } = k;
      // a stadium, wider than it is tall in any box (a tall tile or the phone board gets night above and below it)
      const cx = plain || k.bare ? W / 2 : rtl ? W * .42 : W * .58, cy = H * .5, w0 = W * 1.12, h0 = Math.min(H * .9, W * .8), g = s * .052;
      let out = `<rect width="${W}" height="${H}" fill="${ground}"/>`;
      for (let i = 0; i < 8; i++) {
        const w = w0 - 2 * i * g, h = h0 - 2 * i * g; if (h <= g * .6) break;
        out += `<rect x="${n(cx - w / 2)}" y="${n(cy - h / 2)}" width="${n(w)}" height="${n(h)}" rx="${n(h / 2)}" fill="none" stroke="${i === 4 ? accent : lane}" stroke-width="${i === 4 ? 4 : 3}" vector-effect="non-scaling-stroke"/>`;
      }
      // the strokes repeat every P across, so the pattern tile can slide by exactly one period
      const L = [.9, .5, .72, .36, .82, .58, .44, .96, .54, .4, .76, .3, .66, .5], tan = Math.tan(12 * Math.PI / 180);
      const P = plain ? Math.max(W / 2, s * .8) : W, top = plain ? H * .06 : H * .07, span = plain ? H * .88 : H * .34;
      const len = plain ? Math.min(P * .5, s * .5) : W * .24;
      let sd = '';
      for (let rep = plain ? -1 : 0; rep <= (plain ? Math.ceil(W / P) : 0); rep++) {
        L.forEach((f, i) => {
          const y = top + span * (i / 13) + len * f * tan, xe = plain ? rep * P + P * (.95 - (i % 4) * .08) : W * (.97 - (i % 3) * .05), xs = xe - len * f;
          const a = [xs, y], b = [xe, y - (xe - xs) * tan], m = x => rtl ? W - x : x;
          sd += `M${n(m(a[0]))} ${n(a[1])}L${n(m(b[0]))} ${n(b[1])}`;
        });
      }
      out += `<g class="ka-pat" style="--kx:${n(rtl ? P : -P)}px"><path d="${sd}" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" vector-effect="non-scaling-stroke"/></g>`;
      if (plain || k.bare) return out;
      const pd = s * .07, items = pair(k, { txt: k.name.en, f: k.fl, fill: light, caps: true }, { txt: k.name.ar, f: k.fa, fill: accent }, Math.min(H * .2, 150));
      items[0].lines = 2;
      return out + names({ items, x: rtl ? W - pd : pd, end: rtl, w: W * .42, bottom: H - pd, knock: ground }).svg;
    },
    /* Bahr Kitchen: the name set large on the sand (Aref Ruqaa sets small for its size, so the Arabic gets 1.2× the Latin),
       a coral fish across from it, then seven sine bands from just below the name to the foot
       (teal, deep sea, a thin coral stripe…) */
    waves(k) {
      const { W, H, C: [sea, coral, ground, deep], plain, rtl, s } = k;
      const lam = plain ? Math.min(W / 2.5, s * 1.6) : W / 2.5, a = Math.max(s * .028, 1.5), pd = s * .06;
      let y0 = H * (plain ? .3 : .42), title = null;
      if (!plain && !k.bare) {
        const big = Math.min(W * .09, H * .15);
        const en = { txt: k.name.en, f: k.fl, fill: deep, max: rtl ? big * .75 : big }, ar = { txt: k.name.ar, f: k.fa, fill: sea, max: big * 1.2 };
        // the sea starts below the name, never above 42% nor below 70% of the board (the name is set smaller first)
        title = fitAbove(rtl ? [ar, en] : [en, ar], { x: rtl ? W - pd : pd, end: rtl, w: W * .6, top: k.zone }, H * .7 - a - pd * .6);
        y0 = Math.max(H * .42, k.zone + title.h + a + pd * .6);
      }
      const seq = [sea, deep, coral, sea, deep, coral, sea], wt = [1.2, 1, .32, 1.2, 1, .32, 1.6], unit = (H - y0) / wt.reduce((p, q) => p + q, 0);
      let bands = '', cum = 0;
      seq.forEach((c, i) => {
        const top = y0 + cum * unit, ph = i * 1.3; cum += wt[i];
        bands += `<path fill="${c}" d="${edge(-lam, W + lam, lam / 12, x => top + a * Math.sin(2 * Math.PI * x / lam + ph))}V${n(H + 2)}H${n(-lam)}Z"/>`;
      });
      let out = `<rect width="${W}" height="${H}" fill="${ground}"/><g class="ka-pat" style="--kx:${n(rtl ? lam : -lam)}px">${bands}</g>`;
      if (plain) return out;
      // the fish: a lens and a tail, swimming with the reading direction, in the corner across from the name and above the
      // photo inset (which takes the lower 54%)
      const fl = Math.min(s * .5, W * .34), fh = fl * .36, fx = rtl ? W * .2 : W * .8, fy = (k.zone * .8 + H * .44) / 2;
      out += `<g transform="translate(${n(fx)} ${n(fy)}) scale(${rtl ? -1 : 1} 1) rotate(-9)" fill="${coral}"><path d="M${n(-fl * .3)} 0Q${n(fl * .1)} ${n(-fh * 1.05)} ${n(fl * .5)} 0Q${n(fl * .1)} ${n(fh * 1.05)} ${n(-fl * .3)} 0Z"/><path d="M${n(-fl * .27)} 0L${n(-fl * .5)} ${n(-fh * .46)}L${n(-fl * .45)} 0L${n(-fl * .5)} ${n(fh * .46)}Z"/><path fill="${ground}" d="M${n(fl * .3)} ${n(-fh * .22)}l${n(fh * .09)} ${n(fh * .09)}l${n(-fh * .09)} ${n(fh * .09)}l${n(-fh * .09)} ${n(-fh * .09)}Z"/></g>`;
      return out + (title ? title.svg : '');
    },
    /* Saffar: a desert-night sky, a sand dhow under a lateen sail on the first dune's crest, six dune bands lightest at the
       front, the name in the sky */
    dunes(k) {
      const { W, H, C: [dune, terra, sand, night], plain, rtl, s } = k;
      const hy = H * (plain ? .4 : .45), lam = plain ? Math.min(W / 1.6, s * 2.4) : W / 1.6, step = (H - hy) / 6.2;
      let out = `<rect width="${W}" height="${H}" fill="${night}"/>`;
      if (!plain) {
        // the bow points the way the page reads; L = hull length, sh = rig height, yd = the deck, on the crest under the boat.
        // It sails across from the name; on a bare board (no name) it takes the name's side, clear of the photo inset
        const sh = Math.min(s * .26, hy * .66), L = sh * .95, sx = rtl !== k.bare ? W * .3 : W * .7, m = x => rtl ? 2 * sx - x : x;
        const hd = sh * .13, yd = hy + s * .03 * (.65 * Math.sin(2 * Math.PI * sx / lam) + .35 * Math.sin(4 * Math.PI * sx / lam + 1)) - hd * .55;
        const P = (fx, fy) => `${n(m(sx + fx * L))} ${n(yd + fy * sh)}`, sw = Math.max(s * .007, 1.5);
        // the hull: a crescent, stern and bow raised
        out += `<path fill="${sand}" d="M${P(-.5, -.04)}Q${P(-.02, hd * 1.6 / sh)} ${P(.58, -.08)}Q${P(.02, hd * .3 / sh)} ${P(-.5, -.04)}Z"/>`;
        // the mast, and the yard: a long spar from the tack low at the bow to the peak high over the stern
        out += `<path fill="none" stroke="${sand}" stroke-width="${n(sw)}" stroke-linecap="round" d="M${P(.06, 0)}L${P(.06, -.74)}M${P(.6, -.08)}L${P(-.5, -1.04)}"/>`;
        // the sail: a straight luff along the yard, a gently convex leech down to the clew, a foot with a little belly
        out += `<path fill="${sand}" d="M${P(.52, -.15)}L${P(-.43, -.97)}Q${P(-.6, -.5)} ${P(-.3, -.13)}Q${P(.1, -.06)} ${P(.52, -.15)}Z"/>`;
      }
      const fills = [dune, terra, dune, terra, sand, sand];
      let dd = '';
      fills.forEach((c, i) => {
        const top = hy + i * step, a = s * .03 * (1 + i * .3), ph = i * 1.9;
        dd += `<path fill="${c}"${i === 4 ? ' fill-opacity=".6"' : ''} d="${edge(-lam, W + lam, lam / 16, x => top + a * (.65 * Math.sin(2 * Math.PI * x / lam + ph) + .35 * Math.sin(4 * Math.PI * x / lam + 2 * ph + 1)))}V${n(H + 2)}H${n(-lam)}Z"/>`;
      });
      out += `<g class="ka-pat" style="--kx:${n(rtl ? lam : -lam)}px">${dd}</g>`;
      if (plain || k.bare) return out;
      const pd = s * .06, items = pair(k, { txt: k.name.en, f: k.fl, fill: sand, caps: true }, { txt: k.name.ar, f: k.fa, fill: dune }, Math.min(H * .17, 130));
      return out + fitAbove(items, { x: rtl ? W - pd : pd, end: rtl, w: W * .5, top: k.zone }, hy * .94).svg;
    },
    /* Noor Clinics (and any new project): a Truchet field of three-line lanes over the mint, and a navy wayfinding plate
       with an arrow. Each square tile turns its lanes about two opposite corners, the pair picked by a hash of the slug
       and the tile's place, so the lanes run on from tile to tile, double back and run on again, like the coloured lines on
       a clinic floor, and never close into a ring (see truchet()). The plain tile repeats the field one period across for
       the drift. On the project page (bare) the field covers the whole board and runs off every edge, behind the photo
       inset and the plate. On a card it fills the top down to the inset's top edge (46%), where an ink rule takes the lanes'
       ends like a kerb, and the mint below is left to the sign. */
    rings(k) {
      const { W, H, C: [ground, ink, light, accent], plain, rtl, s } = k;
      let out = `<rect width="${W}" height="${H}" fill="${ground}"/>`;
      const mirror = d => rtl ? `<g transform="matrix(-1 0 0 1 ${W} 0)">${d}</g>` : d;
      const field = (d, w) => `<path fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="butt" vector-effect="non-scaling-stroke" d="${d}"/>`;
      if (plain) {
        // a thin strip gets two rows of tiles, a tile four across; the field repeats every `cols` tiles, and two periods are
        // drawn so the drift slides exactly one and loops without a seam
        const P = s < 200 ? H / 2 : s / 4, cols = Math.ceil(W / P) + 1, rows = Math.ceil(H / P) + 1;
        const d = truchet(k.seed, -P / 2, (H - rows * P) / 2, cols * 2, rows, P, cols, false, [0, 0, W, H]);
        return out + `<g class="ka-pat" style="--kx:${n(rtl ? cols * P : -cols * P)}px;--kt:${Math.round(cols * P / 30)}s">${mirror(field(d, s < 200 ? 1.5 : 3))}</g>`;
      }
      // tiles about a quarter of the board's short side, so a lane reads as a lane at any size; the field overhangs every
      // edge it runs off by part of a tile, so no line ends inside the board
      if (k.bare) {
        const P = s * .25, cols = Math.ceil(W / P) + 1, rows = Math.ceil(H / P) + 1;
        out += mirror(field(truchet(k.seed, (W - cols * P) / 2, (H - rows * P) / 2, cols, rows, P, 0, false, [0, 0, W, H]), 3));
      } else {
        const P = s * .2, cols = Math.ceil(W / P) + 1, fb = H * .46, rows = Math.ceil(fb / P);
        out += mirror(field(truchet(k.seed, (W - cols * P) / 2, fb - rows * P, cols, rows, P, 0, true, [0, 0, W, fb]), 3)) +
          `<path d="M0 ${n(fb)}H${W}" stroke="${ink}" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
      }
      let pw = W * .46;
      const pd = s * .05, items = pair(k, { txt: k.name.en, f: k.fl, fill: light }, { txt: k.name.ar, f: k.fa, fill: ground }, Math.min(H * .11, 76));
      const aw = Math.min(items[0].max * 1.05, pw * .2), tw = pw - 2 * pd - aw * 1.35;
      // bare: the sign carries its arrow alone, a square plate
      if (k.bare) pw = aw + 2 * pd;
      const probe = k.bare ? { h: 0 } : names({ items, x: 0, w: tw, top: 0 }), ph = Math.max(probe.h, aw) + pd * 2, py = H - ph;
      const ax = rtl ? W - pd - aw : pd, ay = py + pd + aw * .5, sw = aw * .16;
      // the arrow points the way the page reads
      const arrow = rtl ? `M${n(ax + aw)} ${n(ay)}H${n(ax + sw)}M${n(ax + aw * .48)} ${n(ay - aw * .42)}L${n(ax + sw * .4)} ${n(ay)}L${n(ax + aw * .48)} ${n(ay + aw * .42)}`
        : `M${n(ax)} ${n(ay)}H${n(ax + aw - sw)}M${n(ax + aw * .52)} ${n(ay - aw * .42)}L${n(ax + aw - sw * .4)} ${n(ay)}L${n(ax + aw * .52)} ${n(ay + aw * .42)}`;
      out += `<rect x="${n(rtl ? W - pw : 0)}" y="${n(py)}" width="${n(pw)}" height="${n(ph + 1)}" fill="${ink}"/><path d="${arrow}" fill="none" stroke="${light}" stroke-width="${n(sw)}" stroke-linecap="square"/>`;
      if (k.bare) return out;
      return out + names({ items, x: rtl ? W - pd - aw * 1.35 : pd + aw * 1.35, end: rtl, w: tw, top: py + pd }).svg;
    },
  };

  /** The project's identity board: an aria-hidden inline SVG, viewBox 1000 × 1000/ratio, sliced to fill its box.
      opts.plain: the pattern alone (the project page's tile). opts.bare: the whole board without the name lockup, for places
      where the name is already set large beside it (the project page's hero and its next band). */
  function keyArt(p, lang, ratio = 4 / 3, o = {}) {
    if (!isObj(p)) return '';
    const rtl = lang === 'ar', motif = MOTIFS_KA.includes(p.motif) ? p.motif : 'rings';
    const W = 1000, H = n(W / (ratio > 0 ? ratio : 4 / 3));
    const C = colours(p), F = faces(p), en = str(p.en?.name) || str(p.ar?.name) || '', ar = str(p.ar?.name) || en;
    const k = { W, H, rtl, C, fl: F.latin, fa: F.arabic, name: { en, ar }, plain: !!o.plain, bare: !!o.bare, s: Math.min(W, H), zone: W / H >= 2 ? H * .1 : H * .19,
      seed: seedOf(str(p.slug) || en) };
    fontsSoon();
    return `<svg class="ka ka-${motif}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" direction="ltr" aria-hidden="true" focusable="false" style="--ka-swap:${C[1]}">${ART[motif](k)}</svg>`;
  }

  /* ---- the board faces: one Google Fonts request for every family the projects use, only the letters the boards set ---- */
  let fontsAsked = '', fontTimer = 0, io = null;
  // display=block: a face that is on its way holds its text back rather than showing it in the fallback first
  const fontUrl = (list, text) => `https://fonts.googleapis.com/css2?${list.map(f => 'family=' + f.fam.replace(/ /g, '+') + (f.w === 400 ? '' : `:wght@${f.w}`)).join('&')}&text=${encodeURIComponent(text)}&display=block`;
  // the names on the boards (and the project page's type) stay hidden until html.ka-ready (see style())
  const fontsReady = () => document.documentElement.classList.add('ka-ready');
  /** Load the board faces now (the project page calls it at once; boards call it when one comes near). */
  function fonts() {
    if (!document.head) return;
    const all = [], seen = new Set(), chars = new Set('Aa أب 0123456789');
    for (const p of WORK) {
      const F = faces(p);
      for (const f of [F.latin, F.arabic]) if (f.fam !== LATIN && f.fam !== ARABIC && !seen.has(f.fam + f.w)) { seen.add(f.fam + f.w); all.push(f); }
      for (const s of [p.en?.name, p.ar?.name]) for (const ch of String(s ?? '') + String(s ?? '').toUpperCase()) chars.add(ch);
      // a booking-flow prototype is set in the project's faces too
      if (isObj(p.proto)) for (const ch of JSON.stringify(p.proto).replace(/["\\[\]{}:,]|\b(?:en|ar|opts|next|again)\b/g, '')) chars.add(ch);
    }
    // the faces the boards ship with go in one request; anything an editor typed gets its own, so a wrong name can't break the rest
    const ok = f => FACES[f.fam] && FACES[f.fam][0] === f.w, text = [...chars].sort().join(''), known = all.filter(ok), other = all.filter(f => !ok(f));
    const urls = [known.length ? fontUrl(known, text) : '', ...other.map(f => fontUrl([f], text))].filter(Boolean);
    const key = urls.join(' ');
    if (!key) return fontsReady();
    if (key === fontsAsked) return;
    fontsAsked = key;
    const sheets = [];
    for (const href of urls) {
      if (document.head.querySelector(`link[data-ka-font][href="${CSS.escape(href)}"]`)) continue;
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.dataset.kaFont = '';
      sheets.push(new Promise(r => { l.onload = l.onerror = r; })); document.head.append(l);
    }
    // the names show once every face is in, or after 1.2s whatever has arrived (a slow or missing face never hides them for long)
    const faced = Promise.all(sheets).then(() => document.fonts && Promise.all(all.map(f => document.fonts.load(`${f.w} 40px "${f.fam}"`, text).catch(() => null))));
    Promise.race([faced, new Promise(r => setTimeout(r, 1200))]).then(fontsReady, fontsReady);
  }
  // boards drawn into the page: the faces (only the letters the boards set) are asked for when a board comes within a
  // viewport of the screen, never before: a visitor who never scrolls to a board never downloads them
  function fontsSoon() {
    if (fontTimer || typeof document === 'undefined') return;
    fontTimer = setTimeout(() => {
      fontTimer = 0; style();
      const boards = [...document.querySelectorAll('svg.ka')];
      if (!boards.length) return;
      if (!('IntersectionObserver' in window)) return fonts();
      io ||= new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { fonts(); } }, { rootMargin: '100% 0px' });
      io.disconnect(); boards.forEach(b => io.observe(b));
    }, 0);
  }
  // the few board rules that must follow the boards onto every page (the home page has no site.css)
  function style() {
    if (document.getElementById('ka-css')) return;
    const s = document.createElement('style'); s.id = 'ka-css';
    /* the photo inset is the whole photo in miniature: scaled into the frame motifs.css draws (52–95% across, 46–95% down;
       the mirror in RTL) rather than a window onto one corner of it, and it grows to fill the board on hover or when opened.
       scale .49 = the frame's height; the origin is the point that stays put; the clip trims the sides to the frame's shape. */
    const ease = 'cubic-bezier(.2,.7,.2,1)';
    s.textContent = `html[dir] .board .inset{transform-origin:96.078% 90.196%;transform:scale(.49);clip-path:inset(0 6.1225%);transition:clip-path .5s ${ease},transform .5s ${ease}}` +
      'html[dir=rtl] .board .inset{transform-origin:3.922% 90.196%}' +
      'html[dir] .board.is-open .inset{transform:none;clip-path:inset(0)}' +
      '@media (hover:hover) and (pointer:fine){html[dir] .card:hover .board .inset,html[dir] .card:focus-visible .board .inset{transform:none;clip-path:inset(0)}}' +
      '.ka .ka-alt{transition:fill .45s cubic-bezier(.2,.7,.2,1)}' +
      '@media (hover:hover) and (pointer:fine){.card:hover .ka-alt,.card:focus-visible .ka-alt{fill:var(--ka-swap)}}' +
      '.ka-tile.is-live .ka-pat{animation:ka-drift var(--kt,12s) linear infinite}' +
      '@keyframes ka-drift{to{transform:translate(var(--kx,0px),var(--ky,0px))}}' +
      '@media (prefers-reduced-motion:reduce){.ka .ka-alt,html[dir] .board .inset{transition:none}.ka .ka-pat{animation:none!important}}' +
      // a board's names wait for its faces (fonts() sets ka-ready within 1.2s), so they never show in the fallback and jump
      'html:not(.ka-ready) .ka text{opacity:0}';
    document.head.append(s);
  }

  // a project card, shared by the home page, the work page and the discipline pages: the board, the photo inset, the badge
  const RATIO = { wide: 21 / 9, big: 5 / 4, small: 16 / 10, third: 4 / 5 };
  // the photo opens to the whole card, so it is picked for the card's width (a wide card is the full measure)
  const SIZES = { wide: '86vw', big: '50vw', small: '36vw', third: '30vw' };
  // a card's photo is drawn at .49 of its frame until it opens, and srcset cannot see a transform. A phone card is full width,
  // so on a phone (up to 520px) the photo asks for half the viewport and takes the 800w file. Above that a tablet can open a card
  // with a fine pointer, so it keeps the full frame.
  const SIZES_PHONE = '(max-width:520px) 49vw, (max-width:820px) 100vw';
  window.workCard = (p, lang, cls = '') => {
    if (lang !== 'en' && lang !== 'ar') { if (typeof lang === 'string' && !cls) cls = lang; lang = document.documentElement.lang === 'ar' ? 'ar' : 'en'; }
    const x = p[lang] || p.en, at = WORK.indexOf(p), M = window.MIRAS, cms = k => M && at >= 0 ? ` data-cms="work.${at}.${k}"` : '';
    const concept = M?.text ? M.text('c.concept') : lang === 'ar' ? 'مشروع مفاهيمي' : 'Concept', up = upId(p.cover);
    const size = String(cls).split(/\s+/).find(c => c in RATIO), phone = typeof matchMedia === 'function' && matchMedia('(max-width:820px)').matches;
    const img = photo(src(p.cover, p.slug)), own = !up && img.srcset && photo(p.cover).srcset;
    // a project without a cover photo shows its board alone
    return `<a class="card ${esc(cls)}" href="project.html?p=${encodeURIComponent(p.slug)}"><figure class="board">${keyArt(p, lang, phone ? 4 / 3 : RATIO[size] || 4 / 3)}` +
      (img.src ? `<img class="inset" src="${esc(img.src)}"${own ? ` srcset="${esc(img.srcset)}" sizes="${SIZES_PHONE}, ${SIZES[size] || '50vw'}"` : ''} width="${img.w}" height="${img.h}" style="object-position:${focal(p)}"${up ? ` data-up="${up}"` : ''} alt="" loading="lazy" decoding="async"${cms('cover')}>` : '') +
      `<span class="badge"${M ? ' data-cms="shared.c.concept"' : ''}>${esc(concept)}</span></figure>` +
      `<div class="meta"><h3${cms('name')}>${esc(x.name)}</h3><span class="tags"${cms('tags')}>${(x.tags || []).map(esc).join(' · ')}</span></div><p class="line"${cms('line')}>${esc(x.line)}</p></a>`;
  };
  window.keyArt = keyArt;

  /* ---- which projects to show: content.work (and the schedule entries that are due), or the draft in the admin preview ---- */
  // content → { work, home } as of `at` (ms). Arrays replace whole, so the last due schedule entry that sets them wins.
  function resolve(c, at = Date.now()) {
    let work = isObj(c) && c.work !== undefined ? c.work : undefined, hm = isObj(c) && c.workHome !== undefined ? c.workHome : undefined;
    const due = (isObj(c) && Array.isArray(c.schedule) ? c.schedule : []).map((x, i) => [x, i])
      .filter(([x]) => isObj(x) && isObj(x.overrides) && Date.parse(x.at) <= at).sort((a, b) => Date.parse(a[0].at) - Date.parse(b[0].at) || a[1] - b[1]);
    for (const [x] of due) { if (x.overrides.work !== undefined) work = x.overrides.work; if (x.overrides.workHome !== undefined) hm = x.overrides.workHome; }
    let list = clone(DEFAULT_WORK), slugs = [...HOME];
    if (work !== undefined) try { list = normalize(work); } catch (e) { console.warn('MIRAS: the "work" content couldn\'t be used, so the default projects are showing.', e.message); }
    if (hm !== undefined) try { slugs = normalizeHome(hm); } catch (e) { console.warn('MIRAS: the "workHome" content couldn\'t be used.', e.message); }
    return { work: list, home: slugs };
  }

  window.MIRAS_WORK = { get defaults() { return clone(DEFAULT_WORK); }, get homeDefaults() { return [...HOME]; }, disciplines: DISCIPLINES,
    normalize, normalizeHome, use, home: homeList, get homeSlugs() { return [...home]; }, src, upId, resolve,
    keyArt, photo, ver, fonts, faces, colours, focal, motifs: MOTIFS_KA };

  // the board rules go in now, before any card is drawn (an inset drawn first would animate into its frame)
  if (typeof document !== 'undefined' && document.head) style();

  // The inner pages (body[data-page]) get all of this from site.js. The home page doesn't run site.js, so it is done here:
  // the published projects on load, the saved draft in a standalone preview, and the admin's edits while it previews.
  if (document.body?.dataset.page) return;
  const cms = new URLSearchParams(location.search).get('cms');
  function savedDraft() {
    let d = null; try { d = JSON.parse(localStorage.getItem('miras.cms.draft') || 'null'); } catch (e) {}
    if (!isObj(d)) return null;
    if (d.v !== 2) return d;
    let local = null; try { local = JSON.parse(localStorage.getItem('miras.admin.published') || 'null'); } catch (e) {}
    const served = isObj(window.MIRAS_CONTENT) ? window.MIRAS_CONTENT : {}, base = (Date.parse(local?.at) || 0) > (Date.parse(served.meta?.publishedAt) || 0) && isObj(local?.overrides) ? local.overrides : served;
    const o = isObj(d.overrides) ? d.overrides : {};
    return { ...base, ...('work' in o ? { work: o.work } : {}), ...('workHome' in o ? { workHome: o.workHome } : {}) };
  }
  const apply = (c, at) => { const r = resolve(c, at); use(r.work, r.home); };
  try { apply(cms === 'preview' && savedDraft() || window.MIRAS_CONTENT, cms === 'preview' ? -Infinity : Date.now()); } catch (e) {}
  const inAdmin = !!cms && parent !== window && (() => { try { return parent.location.origin === location.origin; } catch (e) { return false; } })();
  // registered before the home page's own listener, so the projects are in place when it redraws
  if (inAdmin) addEventListener('message', e => {
    if (e.source !== parent || e.origin !== location.origin) return;
    const m = isObj(e.data) ? e.data : {};
    if ((m.type === 'miras:content' || m.type === 'miras:check') && isObj(m.content)) try { apply(m.content, m.type === 'miras:check' ? Date.now() : typeof m.at === 'string' ? Date.parse(m.at) : -Infinity); } catch (err) {}
  });
})();
