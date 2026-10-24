/* =====================================================================
   MIRAS admin — Brand colours
   Edits the site palette theme/* (tide, deep, shore, flare, foam, tide60). These are the public
   site's colours, separate from the admin's own theme. Every edit is a draft change (MA.content),
   so it shows in the live preview straight away and goes live on publish.
   Also: WCAG contrast for the pairs the site really uses, section theme mockups that follow the
   site's accent-word rule, a read-only type specimen and the logo files.
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA, ID = 'brand';
  const t = (k, v) => MA.t('brand.' + k, v);
  const C = () => MA.content;
  const h = (...a) => MA.h(...a), esc = MA.esc;
  const vars = (el, o) => { for (const [k, v] of Object.entries(o)) el.style.setProperty(k, v); return el; };

  MA.i18n.add({
    en: {
      'brand.sub': 'The six colours the public site is painted with. Edits show in the preview straight away and go live when you publish.',
      'brand.palette': 'Site palette', 'brand.paletteSub': 'Separate from the admin’s own theme. Focus a colour and press ↑ or ↓ to nudge its lightness (⇧ for bigger steps).',
      'brand.resetAll': 'Reset all colours', 'brand.resetOne': 'Reset {name} to the brand colour',
      'brand.resetDone': '{name} is back to {hex}.', 'brand.resetAllDone': 'All six colours are back to the brand palette.', 'brand.lResetAll': 'Brand colours · reset', 'brand.lColour': 'Colour · {name}',
      'brand.lighter': 'Lighter', 'brand.darker': 'Darker', 'brand.hex': 'Hex code for {name}', 'brand.picker': 'Pick a colour for {name}', 'brand.hexErr': 'Use a 6-digit hex code, like #2B3BF0.',
      'brand.original': 'Brand original {hex}', 'brand.changed': 'Changed from the brand palette', 'brand.unpub': 'Unpublished', 'brand.live': 'Live',
      'brand.nUnpub': { one: '1 colour unpublished', other: '{n} colours unpublished' }, 'brand.allLive': 'Matches the live site',
      'brand.readonly': 'Your role can look at the palette but not change it.',
      'brand.contrast': 'Contrast check', 'brand.contrastSub': 'Only the pairs the site actually uses. WCAG 2: body text needs 4.5:1, headlines and lines need 3:1.',
      'brand.pair': '{fg} on {bg}', 'brand.colPair': 'Pair', 'brand.colRatio': 'Ratio', 'brand.colBody': 'Body text', 'brand.colLarge': 'Headlines',
      'brand.fail': 'Fail', 'brand.passN': '{n} of {t} pass', 'brand.summaryAll': 'Every pair passes for how the site uses it.', 'brand.summarySome': '{n} of {t} pairs pass for how the site uses them.',
      'brand.forHead': 'Used for headlines, so 3:1 is enough.', 'brand.forLine': 'Used for lines and large labels, so 3:1 is enough.',
      'brand.suggest': 'Try {hex} for {name}: {ratio} on {bg}. Same hue, only the lightness changes.',
      'brand.noSuggest': 'No shade of {name} reaches {need} on {bg}. Change {bg} instead, or keep this pair to large headlines.',
      'brand.apply': 'Use this shade', 'brand.applied': '{name} changed to {hex}.', 'brand.copyHex': 'Copy hex',
      'brand.themes': 'Section themes', 'brand.themesSub': 'Each section is painted in one colour. Accent words change colour with it, so every colour gets used. Click one to find it in the preview.',
      'brand.accentRule': 'Accent words in {c}', 'brand.accentNone': 'Accent words stay {c}',
      'brand.type': 'Typography', 'brand.typeSub': 'The four brand fonts, set the way the site sets them. Read only: fonts are part of the site’s code, not its content.',
      'brand.fSerif': 'Headlines and big numbers', 'brand.fSans': 'Body text, buttons and menus', 'brand.fMono': 'Small labels, times and codes', 'brand.fAr': 'Arabic text',
      'brand.wSerif': 'Regular · Italic', 'brand.wSans': 'Light to Semibold', 'brand.wMono': 'Regular · Medium', 'brand.wAr': 'Light to Semibold',
      'brand.logos': 'Logo files', 'brand.logosSub': 'The site draws these as masks, so they take the colour of each section. Never retype the wordmark.',
      'brand.onBg': 'Show on', 'brand.download': 'Download', 'brand.copyPath': 'Copy path', 'brand.pathCopied': 'Path copied.',
      'brand.monogram': 'Monogram', 'brand.wordmark': 'Wordmark', 'brand.arabic': 'Arabic wordmark',
      'brand.k.next': 'Next colour', 'brand.k.prev': 'Previous colour',
      'brand.w.text': 'Text in {where}', 'brand.w.accent': 'Accent words in {where}', 'brand.w.lines': 'Tide lines and soft labels in {where}',
      'brand.w.btns': 'Flare buttons', 'brand.w.none': 'Not on the site right now: its sections are hidden', 'brand.thOff': 'Hidden on the site',
    },
    ar: {
      'brand.sub': 'الألوان الستة التي يُرسم بها الموقع العام. تظهر تعديلاتك في المعاينة فوراً، وتصبح مباشرة عند النشر.',
      'brand.palette': 'لوحة ألوان الموقع', 'brand.paletteSub': 'منفصلة عن ألوان لوحة الإدارة نفسها. ركّز على لون واضغط ↑ أو ↓ لتعديل سطوعه قليلاً (مع ⇧ لخطوات أكبر).',
      'brand.resetAll': 'أعد كل الألوان', 'brand.resetOne': 'أعد {name} إلى لون الهوية',
      'brand.resetDone': 'عاد {name} إلى {hex}.', 'brand.resetAllDone': 'عادت الألوان الستة إلى لوحة الهوية.', 'brand.lResetAll': 'ألوان الهوية · إعادة ضبط', 'brand.lColour': 'لون · {name}',
      'brand.lighter': 'أفتح', 'brand.darker': 'أغمق', 'brand.hex': 'رمز اللون لـ{name}', 'brand.picker': 'اختر لوناً لـ{name}', 'brand.hexErr': 'اكتب رمزاً من 6 خانات، مثل ‎#2B3BF0.',
      'brand.original': 'لون الهوية الأصلي {hex}', 'brand.changed': 'مختلف عن لوحة الهوية', 'brand.unpub': 'غير منشور', 'brand.live': 'منشور',
      'brand.nUnpub': { one: 'لون واحد غير منشور', two: 'لونان غير منشورين', few: '{n} ألوان غير منشورة', many: '{n} لوناً غير منشور', other: '{n} لون غير منشور' }, 'brand.allLive': 'مطابقة للموقع المنشور',
      'brand.readonly': 'دورك يسمح بالاطلاع على الألوان دون تعديلها.',
      'brand.contrast': 'فحص التباين', 'brand.contrastSub': 'الأزواج التي يستخدمها الموقع فعلاً فقط. وفق WCAG 2: النص العادي يحتاج 4.5:1، والعناوين والخطوط 3:1.',
      'brand.pair': '{fg} على {bg}', 'brand.colPair': 'الزوج', 'brand.colRatio': 'النسبة', 'brand.colBody': 'النص العادي', 'brand.colLarge': 'العناوين',
      'brand.fail': 'لا يجتاز', 'brand.passN': '{n} من {t} تجتاز', 'brand.summaryAll': 'كل الأزواج تجتاز الفحص بحسب استخدامها في الموقع.', 'brand.summarySome': '{n} من {t} أزواج تجتاز الفحص بحسب استخدامها في الموقع.',
      'brand.forHead': 'يُستخدم في العناوين، فتكفي نسبة 3:1.', 'brand.forLine': 'يُستخدم للخطوط والتسميات الكبيرة، فتكفي نسبة 3:1.',
      'brand.suggest': 'جرّب {hex} لـ{name}: نسبة {ratio} على {bg}. الدرجة اللونية نفسها، ويتغير السطوع فقط.',
      'brand.noSuggest': 'لا توجد درجة من {name} تبلغ {need} على {bg}. غيّر {bg} بدلاً منه، أو استخدم هذا الزوج للعناوين الكبيرة فقط.',
      'brand.apply': 'استخدم هذه الدرجة', 'brand.applied': 'تغيّر {name} إلى {hex}.', 'brand.copyHex': 'انسخ الرمز',
      'brand.themes': 'ألوان الأقسام', 'brand.themesSub': 'كل قسم يُرسم بلون واحد، ولون الكلمات المميّزة يتغير معه، فيُستخدم كل لون. انقر أياً منها لتجده في المعاينة.',
      'brand.accentRule': 'الكلمات المميّزة بلون {c}', 'brand.accentNone': 'الكلمات المميّزة تبقى بلون {c}',
      'brand.type': 'الخطوط', 'brand.typeSub': 'خطوط الهوية الأربعة كما يستخدمها الموقع. للاطلاع فقط: الخطوط جزء من شيفرة الموقع لا من محتواه.',
      'brand.fSerif': 'العناوين والأرقام الكبيرة', 'brand.fSans': 'النصوص والأزرار والقوائم', 'brand.fMono': 'التسميات الصغيرة والأوقات والرموز', 'brand.fAr': 'النص العربي',
      'brand.wSerif': 'عادي · مائل', 'brand.wSans': 'من الخفيف إلى شبه العريض', 'brand.wMono': 'عادي · متوسط', 'brand.wAr': 'من الخفيف إلى شبه العريض',
      'brand.logos': 'ملفات الشعار', 'brand.logosSub': 'يرسمها الموقع كأقنعة، فتأخذ لون كل قسم. لا تُعِد كتابة الشعار النصي بخط آخر أبداً.',
      'brand.onBg': 'اعرض على', 'brand.download': 'تنزيل', 'brand.copyPath': 'انسخ المسار', 'brand.pathCopied': 'نُسخ المسار.',
      'brand.monogram': 'الرمز', 'brand.wordmark': 'الشعار النصي', 'brand.arabic': 'الشعار العربي',
      'brand.k.next': 'اللون التالي', 'brand.k.prev': 'اللون السابق',
      'brand.w.text': 'النص في {where}', 'brand.w.accent': 'الكلمات المميّزة في {where}', 'brand.w.lines': 'خطوط المدّ والتسميات الخفيفة في {where}',
      'brand.w.btns': 'أزرار الوهج', 'brand.w.none': 'غير ظاهر في الموقع الآن: أقسامه مخفية', 'brand.thOff': 'مخفي في الموقع',
    },
    fa: {
      'brand.sub': 'شش رنگی که سایت عمومی با آن‌ها رنگ‌آمیزی شده است. تغییرها بی‌درنگ در پیش‌نمایش دیده می‌شوند و با انتشار روی سایت می‌روند.',
      'brand.palette': 'پالت سایت', 'brand.paletteSub': 'جدا از رنگ‌های خود پنل مدیریت. روی یک رنگ فوکوس کنید و با ↑ یا ↓ روشنایی‌اش را کمی تغییر دهید (با ⇧ گام‌ها بزرگ‌تر می‌شوند).',
      'brand.resetAll': 'بازگرداندن همهٔ رنگ‌ها', 'brand.resetOne': 'بازگرداندن {name} به رنگ برند',
      'brand.resetDone': '{name} به {hex} برگشت.', 'brand.resetAllDone': 'هر شش رنگ به پالت برند برگشتند.', 'brand.lResetAll': 'رنگ‌های برند · بازنشانی', 'brand.lColour': 'رنگ · {name}',
      'brand.lighter': 'روشن‌تر', 'brand.darker': 'تیره‌تر', 'brand.hex': 'کد رنگ {name}', 'brand.picker': 'انتخاب رنگ برای {name}', 'brand.hexErr': 'یک کد شش‌رقمی بنویسید، مثل ‎#2B3BF0.',
      'brand.original': 'رنگ اصلی برند {hex}', 'brand.changed': 'با پالت برند فرق دارد', 'brand.unpub': 'منتشرنشده', 'brand.live': 'منتشرشده',
      'brand.nUnpub': { one: 'یک رنگ منتشرنشده', other: '{n} رنگ منتشرنشده' }, 'brand.allLive': 'همانند سایت منتشرشده',
      'brand.readonly': 'نقش شما اجازهٔ دیدن پالت را می‌دهد، نه تغییر آن.',
      'brand.contrast': 'بررسی کنتراست', 'brand.contrastSub': 'فقط جفت‌هایی که سایت واقعاً به کار می‌برد. طبق WCAG 2: متن عادی ۴٫۵:۱ و عنوان‌ها و خطوط ۳:۱ لازم دارند.',
      'brand.pair': '{fg} روی {bg}', 'brand.colPair': 'جفت رنگ', 'brand.colRatio': 'نسبت', 'brand.colBody': 'متن عادی', 'brand.colLarge': 'عنوان‌ها',
      'brand.fail': 'رد', 'brand.passN': '{n} از {t} قبول', 'brand.summaryAll': 'همهٔ جفت‌ها برای کاربردشان در سایت قبول‌اند.', 'brand.summarySome': '{n} از {t} جفت برای کاربردشان در سایت قبول‌اند.',
      'brand.forHead': 'برای عنوان‌ها به کار می‌رود، پس ۳:۱ کافی است.', 'brand.forLine': 'برای خطوط و برچسب‌های بزرگ به کار می‌رود، پس ۳:۱ کافی است.',
      'brand.suggest': '{hex} را برای {name} امتحان کنید: نسبت {ratio} روی {bg}. همان فام، فقط روشنایی تغییر می‌کند.',
      'brand.noSuggest': 'هیچ سایه‌ای از {name} روی {bg} به {need} نمی‌رسد. به‌جایش {bg} را تغییر دهید، یا این جفت را فقط برای عنوان‌های بزرگ نگه دارید.',
      'brand.apply': 'استفاده از این سایه', 'brand.applied': '{name} به {hex} تغییر کرد.', 'brand.copyHex': 'کپی کد',
      'brand.themes': 'رنگ بخش‌ها', 'brand.themesSub': 'هر بخش با یک رنگ رنگ‌آمیزی شده و رنگ واژه‌های تأکیدی همراه آن عوض می‌شود تا همهٔ رنگ‌ها به کار بروند. روی هرکدام کلیک کنید تا در پیش‌نمایش پیدایش کنید.',
      'brand.accentRule': 'واژه‌های تأکیدی به رنگ {c}', 'brand.accentNone': 'واژه‌های تأکیدی {c} می‌مانند',
      'brand.type': 'حروف‌نگاری', 'brand.typeSub': 'چهار قلم برند، همان‌طور که سایت به کار می‌برد. فقط خواندنی: قلم‌ها بخشی از کد سایت‌اند، نه محتوای آن.',
      'brand.fSerif': 'عنوان‌ها و عددهای بزرگ', 'brand.fSans': 'متن، دکمه‌ها و منوها', 'brand.fMono': 'برچسب‌های کوچک، ساعت‌ها و کدها', 'brand.fAr': 'متن عربی',
      'brand.wSerif': 'معمولی · ایتالیک', 'brand.wSans': 'نازک تا نیمه‌ضخیم', 'brand.wMono': 'معمولی · متوسط', 'brand.wAr': 'نازک تا نیمه‌ضخیم',
      'brand.logos': 'فایل‌های لوگو', 'brand.logosSub': 'سایت این‌ها را به‌صورت ماسک می‌کشد تا رنگ هر بخش را بگیرند. هرگز لوگوی نوشتاری را با قلم دیگری بازنویسی نکنید.',
      'brand.onBg': 'نمایش روی', 'brand.download': 'دانلود', 'brand.copyPath': 'کپی مسیر', 'brand.pathCopied': 'مسیر کپی شد.',
      'brand.monogram': 'مونوگرام', 'brand.wordmark': 'لوگوی نوشتاری', 'brand.arabic': 'لوگوی عربی',
      'brand.k.next': 'رنگ بعدی', 'brand.k.prev': 'رنگ قبلی',
      'brand.w.text': 'متن در {where}', 'brand.w.accent': 'واژه‌های تأکیدی در {where}', 'brand.w.lines': 'خطوط موج و برچسب‌های کم‌رنگ در {where}',
      'brand.w.btns': 'دکمه‌های شعله', 'brand.w.none': 'فعلاً در سایت نیست: بخش‌هایش پنهان‌اند', 'brand.thOff': 'در سایت پنهان است',
    },
  });

  /* ---------- the palette ---------- */
  const KEYS = ['tide', 'deep', 'shore', 'flare', 'foam', 'tide60'];
  const INFO = {
    tide: { name: { en: 'Tide', ar: 'المدّ', fa: 'مد' }, section: 'contact',
      role: { en: 'Contact background, accent words on Shore, buttons and links', ar: 'خلفية قسم التواصل، والكلمات المميّزة على الشاطئ، والأزرار والروابط', fa: 'پس‌زمینهٔ بخش تماس، واژه‌های تأکیدی روی ساحل، دکمه‌ها و پیوندها' } },
    deep: { name: { en: 'Deep', ar: 'العمق', fa: 'ژرفا' }, section: 'why',
      role: { en: 'Text on light sections; background of Why MIRAS and the footer', ar: 'النص في الأقسام الفاتحة، وخلفية «لماذا ميراس» والتذييل', fa: 'متن بخش‌های روشن؛ پس‌زمینهٔ «چرا میراس» و پانویس' } },
    shore: { name: { en: 'Shore', ar: 'الشاطئ', fa: 'ساحل' }, section: 'plan',
      role: { en: 'Background of Services and Questions; text on Tide and Deep', ar: 'خلفية الخدمات والأسئلة، والنص على المدّ والعمق', fa: 'پس‌زمینهٔ خدمات و پرسش‌ها؛ متن روی مد و ژرفا' } },
    flare: { name: { en: 'Flare', ar: 'الوهج', fa: 'شعله' }, section: 'make',
      role: { en: 'Accent words on Deep and the Flare buttons; background of What we make', ar: 'الكلمات المميّزة على العمق وأزرار الوهج، وخلفية «ما نصنعه»', fa: 'واژه‌های تأکیدی روی ژرفا و دکمه‌های شعله؛ پس‌زمینهٔ «آنچه می‌سازیم»' } },
    foam: { name: { en: 'Foam', ar: 'الزبد', fa: 'کف' }, section: 'work',
      role: { en: 'Background of Selected work and Studio; accent words on Tide', ar: 'خلفية «أعمال مختارة» والاستوديو، والكلمات المميّزة على المدّ', fa: 'پس‌زمینهٔ «نمونه‌کارها» و استودیو؛ واژه‌های تأکیدی روی مد' } },
    tide60: { name: { en: 'Tide 60', ar: 'المدّ 60', fa: 'مد ۶۰' }, section: 'why',
      role: { en: 'Tide lines and soft labels on Deep, in Why MIRAS', ar: 'خطوط المدّ والتسميات الخفيفة على العمق في «لماذا ميراس»', fa: 'خطوط موج و برچسب‌های کم‌رنگ روی ژرفا در «چرا میراس»' } },
  };
  const nameOf = k => MA.L(INFO[k].name);
  /** use: 'body' → 4.5:1 · 'head' (accent words, always headline size) → 3:1 · 'line' (graphics, large labels) → 3:1. w: what it paints, where. */
  const PAIRS = [
    { fg: 'shore', bg: 'tide', use: 'body', w: 'text' },
    { fg: 'deep', bg: 'shore', use: 'body', w: 'text' },
    { fg: 'shore', bg: 'deep', use: 'body', w: 'text' },
    { fg: 'deep', bg: 'foam', use: 'body', w: 'text' },
    { fg: 'deep', bg: 'flare', use: 'body', w: 'text', btns: true },
    { fg: 'tide', bg: 'shore', use: 'head', w: 'accent' },
    { fg: 'flare', bg: 'deep', use: 'head', w: 'accent' },
    { fg: 'foam', bg: 'tide', use: 'head', w: 'accent' },
    { fg: 'tide60', bg: 'deep', use: 'line', w: 'lines', only: ['why'] },
  ];
  /**
   * The site's section themes and its accent-word rule (index.html: .t-deep em → flare, .t-tide em → foam, .t-shore/.t-foam em → tide).
   * `at`: the sections painted in that colour, in page order, with the copy a mockup shows. The first one the site shows is used;
   * sections the draft hides (sections/<id> = false) are skipped, and copy paths the site doesn't have are ignored.
   */
  const THEMES = [
    { bg: 'tide', fg: 'shore', em: 'foam', at: [{ sec: 'contact', h: 'text/{l}/c.title', p: 'text/{l}/c.lead' }] },
    { bg: 'shore', fg: 'deep', em: 'tide', at: [{ sec: 'plan', h: 'ui/{l}/allTitle', p: 'sgroups/{l}/0/line' }, { sec: 'faq', h: 'text/{l}/q.title', p: 'faq/0/{l}/q' }] },
    { bg: 'deep', fg: 'shore', em: 'flare', at: [{ sec: 'why', h: 'text/{l}/hr.h', p: 'text/{l}/hr.1d' }] },
    { bg: 'foam', fg: 'deep', em: 'tide', at: [{ sec: 'work', h: 'text/{l}/wk.t', p: 'text/{l}/wk.note' }, { sec: 'studio', h: 'text/{l}/hr.4', p: 'text/{l}/st.text' }] },
    { bg: 'flare', fg: 'deep', em: null, at: [{ sec: 'make', h: 'text/{l}/mk.title', p: 'text/{l}/mk.lead' }] },
  ];
  const shown = sec => C().get('sections/' + sec) !== false; // the footer (no switch) is always shown
  const hasPath = tpl => C().def(tpl.replace('{l}', 'en')) !== undefined;
  /** Where a theme shows now: { sec, h, p, off } (off: every section in that colour is hidden). */
  const placeOf = th => { const ok = th.at.filter(a => hasPath(a.h)); const vis = ok.find(a => shown(a.sec)); return vis ? { ...vis, off: false } : ok[0] ? { ...ok[0], off: true } : { ...th.at[0], off: true }; };
  /** The sections painted in a colour that the site shows now. */
  const sectionsIn = (bg, only) => (THEMES.find(x => x.bg === bg)?.at || []).map(a => a.sec).filter(sec => (!only || only.includes(sec)) && shown(sec));
  /** The section to aim the preview at for a palette colour. */
  const sectionFor = k => { const th = THEMES.find(x => x.bg === k); if (th) return placeOf(th).sec; const own = INFO[k]?.section; return own && shown(own) ? own : placeOf(THEMES[0]).sec; };
  const listFmt = arr => { try { return new Intl.ListFormat(MA.locale(), { type: 'conjunction' }).format(arr); } catch (e) { return arr.join(', '); } };
  const pairWhere = p => {
    const names = sectionsIn(p.bg, p.only).map(sec => MA.content.groupName(sec));
    if (p.btns) names.push(t('w.btns'));
    return names.length ? t('w.' + p.w, { where: listFmt(names) }) : t('w.none');
  };
  const LOGOS = [
    { id: 'monogram', file: 'monogram.png', ratio: 943 / 727 },
    { id: 'wordmark', file: 'wordmark.png', ratio: 1483 / 470 },
    { id: 'arabic', file: 'arabic.png', ratio: 1217 / 525 },
  ];

  /* ---------- colour maths: sRGB ⇄ OKLCH, WCAG contrast ---------- */
  const normHex = v => { const m = String(v ?? '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i); if (!m) return null; let x = m[1]; if (x.length === 3) x = [...x].map(c => c + c).join(''); return '#' + x.toUpperCase(); };
  const rgb = hex => { const n = parseInt(normHex(hex).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255); };
  const lin = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  const delin = c => c <= .0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - .055;
  const toHex = arr => '#' + arr.map(v => Math.round(MA.clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  const toOklch = hex => {
    const [r, g, b] = rgb(hex).map(lin);
    const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    const L = .2104542553 * l + .793617785 * m - .0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, B = .0259040371 * l + .7827717662 * m - .808675766 * s;
    const c = Math.hypot(A, B); let hh = Math.atan2(B, A) * 180 / Math.PI; if (hh < 0) hh += 360;
    return { l: L, c, h: c < 1e-4 ? 0 : hh };
  };
  const oklchLin = (L, c, hh) => {
    const A = c * Math.cos(hh * Math.PI / 180), B = c * Math.sin(hh * Math.PI / 180);
    const l = (L + .3963377774 * A + .2158037573 * B) ** 3, m = (L - .1055613458 * A - .0638541728 * B) ** 3, s = (L - .0894841775 * A - 1.291485548 * B) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s];
  };
  const inGamut = v => v.every(x => x >= -1e-4 && x <= 1 + 1e-4);
  /** OKLCH → hex, keeping lightness and hue and reducing chroma until the colour fits sRGB. */
  const fromOklch = (L, c, hh) => {
    L = MA.clamp(L, 0, 1);
    let v = oklchLin(L, c, hh);
    if (!inGamut(v)) { let lo = 0, hi = c; for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (inGamut(oklchLin(L, mid, hh))) lo = mid; else hi = mid; } v = oklchLin(L, lo, hh); }
    return toHex(v.map(x => delin(MA.clamp(x, 0, 1))));
  };
  const lum = hex => { const [r, g, b] = rgb(hex).map(lin); return .2126 * r + .7152 * g + .0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  /** Move a colour's OKLCH lightness by d, always landing on a different 8-bit hex if one exists that way. */
  const nudge = (hex, d) => {
    const o = toOklch(hex); let out = hex;
    for (let i = 1; i <= 8 && out === hex; i++) { const L = o.l + d * i; if (L < -.001 || L > 1.001) break; out = fromOklch(L, o.c, o.h); }
    return out;
  };
  /** Nearest shade of `fg` (same hue, other lightness) that reaches `need` on `bg`. */
  const suggest = (fg, bg, need) => {
    const o = toOklch(fg), dir = lum(bg) > lum(fg) ? -1 : 1;
    for (let L = o.l; L >= 0 && L <= 1; L += dir * .004) { const hx = fromOklch(L, o.c, o.h), r = ratio(hx, bg); if (r >= need + .02) return { hex: hx, ratio: r }; }
    return null;
  };
  // WCAG ratios are never rounded up: 4.49 shows as 4.4, not 4.5
  const fmtRatio = r => `${MA.num(Math.floor(r * 10) / 10, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}:${MA.num(1)}`;
  const oklchText = hex => { const o = toOklch(hex); return `oklch(${(o.l * 100).toFixed(1)}% ${o.c.toFixed(3)} ${o.h.toFixed(1)})`; };
  const grade = (r, large) => large ? (r >= 4.5 ? 'AAA' : r >= 3 ? 'AA' : '') : (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : '');
  const need = use => use === 'body' ? 4.5 : 3;

  const col = k => normHex(C().get('theme/' + k)) || normHex(C().def('theme/' + k)) || '#0D0F2E';
  const defCol = k => normHex(C().def('theme/' + k));
  const isCustom = k => col(k) !== defCol(k);
  /** Readable ink for text on a colour: whichever of Deep / Shore contrasts more. */
  const inkOn = hex => { const d = col('deep'), s = col('shore'); return ratio(d, hex) >= ratio(s, hex) ? d : s; };
  const db = { get: (k, f) => MA.db.get('brand.' + k, f), set: (k, v) => MA.db.set('brand.' + k, v) };

  /* ---------- page ---------- */
  let S = null; // state of the mounted page (null when away)

  function render(view, ctx) {
    const can = MA.can('content.edit');
    const root = h('div.m-brand'); view.append(root);
    const me = S = { root, can, bands: {}, lastSec: null, logoBg: db.get('logoBg', 'shore') };
    MA.cleanup(() => { if (S === me) S = null; });

    // the shared live preview: one toggle, head row, grip and device rule for every editor page
    S.lastSec = sectionFor('tide');
    S.pane = MA.ui.previewPane({ key: ID, section: S.lastSec });
    S.resetAllBtn = can ? MA.ui.btn(t('resetAll'), { icon: 'undo', kind: 'ghost', onclick: resetAll }) : null;
    S.resetAllBtn?.classList.add('br-resetall');
    root.append(MA.ui.pageHead({ title: esc(MA.L(mod.title)), sub: esc(t('sub')), actions: [S.resetAllBtn, S.pane.toggle].filter(Boolean) }));
    if (!can) root.append(h('div.callout.br-ro', { html: MA.icon('lock') + `<span>${esc(t('readonly'))}</span>` }));

    const grid = h('div.br-grid'); root.append(MA.ui.previewPane.split(grid, S.pane));

    // 1 · palette bands
    S.status = h('span.br-status');
    const bandsBox = h('div.br-bands');
    const palette = h('section.card.br-palette#br-palette', { 'aria-labelledby': 'brPalH' },
      h('div.card-head', h('div.grow', h('h2.h3#brPalH', t('palette')), h('p.sub', t('paletteSub'))), S.status),
      bandsBox);
    KEYS.forEach(k => bandsBox.append(band(k)));

    // 3 · contrast
    S.contrastHead = h('div.card-head', h('div.grow', h('h2.h3', t('contrast')), h('p.sub', t('contrastSub'))));
    S.contrastBody = h('div.br-contrast');
    const contrast = h('section.card.br-contrast-card#br-contrast', S.contrastHead, S.contrastBody);

    // 4 · section themes
    S.themesBody = h('div.br-themes');
    const themes = h('section.card.br-themes-card#br-themes', h('div.card-head', h('div.grow', h('h2.h3', t('themes')), h('p.sub', t('themesSub')))), h('div.card-body', S.themesBody));

    // 5 · type specimen
    const type = h('section.card.br-type-card#br-type', h('div.card-head', h('div.grow', h('h2.h3', t('type')), h('p.sub', t('typeSub')))), typeSpecimen());

    // 6 · logos
    S.logosBody = h('div.br-logos');
    const bgSeg = MA.ui.seg(['shore', 'deep', 'tide'].map(k => ({ value: k, label: nameOf(k) })), S.logoBg, v => { S.logoBg = v; db.set('logoBg', v); paintLogos(); }, { size: 'sm', label: t('onBg') });
    const logos = h('section.card.br-logos-card#br-logos',
      h('div.card-head', h('div.grow', h('h2.h3', t('logos')), h('p.sub', t('logosSub'))), h('div.row.br-onbg', h('span.small.faint', t('onBg')), bgSeg)),
      h('div.card-body', S.logosBody));
    LOGOS.forEach(L => S.logosBody.append(logoTile(L)));

    grid.append(palette, contrast, themes, type, logos);
    refresh();

    MA.onView('content:change', ({ path }) => { const p = String(path || ''); if (!p || /^(theme|text|faq|ui|sgroups|tagline|sections)(\/|$)/.test(p)) refresh(); });
    MA.onView('prefs', () => markNear()); // the admin's own theme changed (already applied): re-check which swatches melt into the panel
    MA.keys.bindView('j', () => moveFocus(1), () => t('k.next'));
    MA.keys.bindView('k', () => moveFocus(-1), () => t('k.prev'));
    handleQuery(ctx);
  }

  function band(k) {
    const can = S.can;
    const orig = h('button.br-orig', { type: 'button', hidden: true, tabindex: '-1', onclick: () => can && resetOne(k) });
    const chip = h('div.br-chip', h('div.br-chip-text', h('b.br-name', nameOf(k)), h('span.br-role', MA.L(INFO[k].role))), orig);
    const picker = h('input', { type: 'color', value: col(k).toLowerCase(), disabled: !can, 'aria-label': t('picker', { name: nameOf(k) }) });
    const hex = h('input.input.mono.br-hex', { value: col(k), maxLength: 7, readOnly: !can, spellcheck: false, autocomplete: 'off', dir: 'ltr', 'aria-label': t('hex', { name: nameOf(k) }) });
    const err = h('p.err.br-err', { hidden: true, role: 'alert' }, t('hexErr'));
    picker.addEventListener('input', () => setColour(k, picker.value));
    hex.addEventListener('input', () => {
      const raw = hex.value.trim(), v = /^#?[0-9a-f]{6}$/i.test(raw) ? normHex(raw) : null;
      err.hidden = !raw || !!v || raw.replace('#', '').length < 6;
      if (v) setColour(k, v);
    });
    hex.addEventListener('blur', () => { const v = normHex(hex.value); if (v) setColour(k, v); hex.value = col(k); err.hidden = true; });
    hex.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); hex.blur(); } if (e.key === 'Escape') { hex.value = col(k); err.hidden = true; } });
    const darker = can ? MA.ui.iconBtn('minus', { tip: t('darker'), size: 'sm', onclick: () => setColour(k, nudge(col(k), -.01)) }) : null;
    const lighter = can ? MA.ui.iconBtn('plus', { tip: t('lighter'), size: 'sm', onclick: () => setColour(k, nudge(col(k), .01)) }) : null;
    const reset = can ? MA.ui.iconBtn('undo', { tip: t('resetOne', { name: nameOf(k) }), size: 'sm', onclick: () => resetOne(k) }) : null;
    if (reset) reset.classList.add('br-reset');
    const ok = h('span.mono.br-ok', { dir: 'ltr' }), state = h('span.br-state');
    const ctl = h('div.br-ctl',
      h('div.br-ctl-row', h('span.br-pick', picker), hex, can ? h('div.br-nudge', { role: 'group' }, darker, lighter) : null, h('span.grow'), reset),
      err, h('div.br-ctl-meta', ok, state));
    const el = h('div.br-band', { tabindex: '0', role: 'group', dataset: { k } }, chip, ctl);
    el.addEventListener('keydown', e => {
      if (e.target !== el || !can) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setColour(k, nudge(col(k), (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? .05 : .01))); }
    });
    el.addEventListener('focusin', () => aim(sectionFor(k)));
    S.bands[k] = { el, chip, picker, hex, err, ok, state, reset, orig };
    return el;
  }

  function setColour(k, v) {
    const hex = normHex(v); if (!hex || !S?.can || hex === col(k)) return;
    C().set('theme/' + k, hex, { label: t('lColour', { name: nameOf(k) }) });
  }
  function resetOne(k) {
    if (!isCustom(k)) return;
    C().reset('theme/' + k, 'default');
    MA.toast(esc(t('resetDone', { name: nameOf(k), hex: defCol(k) })), { undo: () => C().undo() });
    S?.bands[k]?.el.focus({ preventScroll: true });
  }
  function resetAll() {
    if (!KEYS.some(isCustom)) return;
    const next = MA.clone(C().get('theme') || {}); KEYS.forEach(k => { next[k] = C().def('theme/' + k); });
    C().replace('theme', next, t('lResetAll'));
    MA.toast(esc(t('resetAllDone')), { undo: () => C().undo() });
  }

  /** Update everything that depends on the palette, in place (focus and scroll stay put). */
  function refresh() {
    if (!S) return;
    KEYS.forEach(k => {
      const b = S.bands[k], v = col(k), custom = isCustom(k), changed = C().isChanged('theme/' + k);
      vars(b.chip, { '--c': v, '--on': inkOn(v) });
      if (document.activeElement !== b.hex) b.hex.value = v;
      if (document.activeElement !== b.picker) b.picker.value = v.toLowerCase();
      b.ok.textContent = oklchText(v);
      b.el.setAttribute('aria-label', `${nameOf(k)}, ${v}`);
      b.el.classList.toggle('custom', custom);
      if (b.reset) b.reset.hidden = !custom;
      b.orig.hidden = !custom;
      if (custom) { const d = defCol(k); vars(b.orig, { '--o': d }); b.orig.dataset.tip = t('original', { hex: d }); b.orig.setAttribute('aria-label', t('original', { hex: d })); }
      b.state.innerHTML = '';
      b.state.append(MA.ui.tideMark(changed ? 'edited' : 'live'), h('span', changed ? t('unpub') : custom ? t('changed') : t('live')));
    });
    const n = KEYS.filter(k => C().isChanged('theme/' + k)).length;
    S.status.innerHTML = '';
    S.status.append(MA.ui.tideMark(n ? 'edited' : 'live'), h('span', n ? t('nUnpub', { n }) : t('allLive')));
    if (S.resetAllBtn) S.resetAllBtn.hidden = !KEYS.some(isCustom);
    drawContrast(); drawThemes(); paintLogos(); markNear();
  }
  /**
   * Swatches as dark as the admin's dark panel (Deep) or as light as the light one (Shore) melt into it: give those a ring.
   * Depth comes from a visible edge, not from changing the brand colour.
   */
  function markNear() {
    if (!S) return;
    // the token itself, not the card's computed colour (which may still be mid-transition after a theme switch)
    let panel = normHex(getComputedStyle(document.documentElement).getPropertyValue('--panel'));
    if (!panel) { const m = getComputedStyle(S.root.querySelector('.card') || document.body).backgroundColor.match(/[\d.]+/g); if (!m) return; panel = toHex(m.slice(0, 3).map(v => +v / 255)); }
    const near = hex => !!normHex(hex) && ratio(hex, panel) < 1.35;
    KEYS.forEach(k => { const on = near(col(k)); S.bands[k]?.chip.classList.toggle('is-near', on); S.bands[k]?.el.querySelector('.br-pick')?.classList.toggle('is-near', on); });
    S.themesBody?.querySelectorAll('.br-theme').forEach(b => b.classList.toggle('is-near', near(col(b.dataset.theme))));
    S.contrastBody?.querySelectorAll('.br-aa').forEach(x => x.classList.toggle('is-near', near(col(x.dataset.bg))));
    S.logosBody?.classList.toggle('is-near', near(col(S.logoBg)));
  }

  /* ---------- contrast ---------- */
  function drawContrast() {
    const rows = PAIRS.map(p => { const fg = col(p.fg), bg = col(p.bg), r = ratio(fg, bg); return { ...p, fgHex: fg, bgHex: bg, r, ok: r >= need(p.use) }; });
    const pass = rows.filter(x => x.ok).length, all = pass === rows.length;
    S.contrastHead.querySelector('.br-pass')?.remove();
    S.contrastHead.append(h('span', { class: 'badge br-pass ' + (all ? 'good' : 'warn'), html: MA.icon(all ? 'check' : 'warn', 'sm') + esc(t('passN', { n: MA.num(pass), t: MA.num(rows.length) })) }));
    const badge = g => g ? h('span', { class: 'badge good', html: MA.icon('check', 'sm') + esc(g) }) : h('span', { class: 'badge bad', html: MA.icon('close', 'sm') + esc(t('fail')) });
    const tbody = h('tbody');
    rows.forEach(x => {
      const sample = h('span.br-aa', { class: x.use === 'body' ? '' : 'serif', style: { background: x.bgHex, color: x.fgHex }, dataset: { bg: x.bg }, 'aria-hidden': 'true' });
      if (x.use === 'line') sample.innerHTML = '<svg viewBox="0 0 36 14" aria-hidden="true"><path d="M2 5c4-3.5 8 3.5 12 0s8-3.5 12 0 6 2 8 0"/><path d="M2 10c4-3 8 3 12 0s8-3 12 0 6 1.8 8 0"/></svg>';
      else sample.textContent = 'Aa';
      const note = x.use === 'head' ? t('forHead') : x.use === 'line' ? t('forLine') : '';
      tbody.append(h('tr', { dataset: { pair: x.fg + '-' + x.bg, ok: String(x.ok) }, class: x.ok ? '' : 'fails' },
        h('td.shrink', sample),
        h('td', h('div.br-pairname', t('pair', { fg: nameOf(x.fg), bg: nameOf(x.bg) })), h('div.small.faint', pairWhere(x)), note ? h('div.tiny.faint.br-note', note) : null),
        h('td.shrink.num.br-ratio', h('span.ltr', fmtRatio(x.r))),
        h('td.shrink', { class: x.use === 'body' ? 'br-use' : 'br-off' }, badge(grade(x.r, false))),
        h('td.shrink', { class: x.use !== 'body' ? 'br-use' : 'br-off' }, badge(grade(x.r, true)))));
      if (!x.ok) tbody.append(h('tr.br-sug', h('td', { colspan: 5 }, suggestionBox(x))));
    });
    const table = h('table.table.br-table',
      h('thead', h('tr', h('th', { colspan: 2 }, t('colPair')), h('th.shrink', t('colRatio')), h('th.shrink', t('colBody')), h('th.shrink', t('colLarge')))), tbody);
    S.contrastBody.innerHTML = '';
    S.contrastBody.append(h('div.br-table-scroll', table));
    S.contrastHead.querySelector('.sub').textContent = `${t('contrastSub')} ${all ? t('summaryAll') : t('summarySome', { n: MA.num(pass), t: MA.num(rows.length) })}`;
  }
  function suggestionBox(x) {
    const want = need(x.use), s = suggest(x.fgHex, x.bgHex, want);
    if (!s) return h('div.callout.warn.br-sugbox', { html: MA.icon('warn') + `<span>${esc(t('noSuggest', { name: nameOf(x.fg), bg: nameOf(x.bg), need: fmtRatio(want) }))}</span>` });
    const txt = esc(t('suggest', { hex: '\u0001', name: nameOf(x.fg), ratio: fmtRatio(s.ratio), bg: nameOf(x.bg) })).replace('\u0001', `<b class="mono ltr">${s.hex}</b>`);
    return h('div.callout.warn.br-sugbox',
      h('span.br-sugsw', { style: { background: s.hex } }),
      h('span.grow', { html: txt }),
      h('div.btn-row',
        MA.ui.btn(t('copyHex'), { icon: 'copy', size: 'sm', kind: 'ghost', onclick: () => MA.copy(s.hex) }),
        S.can ? MA.ui.btn(t('apply'), { size: 'sm', onclick: () => { setColour(x.fg, s.hex); MA.toast(esc(t('applied', { name: nameOf(x.fg), hex: s.hex })), { undo: () => C().undo() }); } }) : null));
  }

  /* ---------- section themes ---------- */
  function drawThemes() {
    const l = MA.siteLang(), dir = l === 'ar' ? 'rtl' : 'ltr';
    S.themesBody.innerHTML = '';
    THEMES.forEach(th => {
      const at = placeOf(th), name = MA.content.groupName(at.sec);
      const path = tpl => { const p = tpl.replace('{l}', l); return C().get(p) ? p : tpl.replace('{l}', 'en'); };
      const hp = path(at.h), pp = path(at.p);
      const head = MA.form.sanitize(String(C().get(hp) || '')), body = MA.strip(String(C().get(pp) || ''));
      const emCol = th.em ? col(th.em) : col(th.fg);
      const rule = th.em ? t('accentRule', { c: nameOf(th.em) }) : t('accentNone', { c: nameOf(th.fg) });
      const b = h('button.br-theme', { type: 'button', class: at.off ? 'is-off' : null, dataset: { theme: th.bg, sec: at.sec, h: hp }, onclick: () => aim(at.sec, true), 'aria-label': `${name} · ${nameOf(th.bg)}${at.off ? ' (' + t('thOff') + ')' : ''}. ${rule}` },
        h('span.br-th-label', `${name} · ${nameOf(th.bg)}`, at.off ? h('span.br-th-off', t('thOff')) : null),
        h('span.br-th-h', { lang: l, dir, html: head }),
        h('span.br-th-p', { lang: l, dir }, body),
        h('span.br-th-rule', h('i'), rule));
      vars(b, { '--tb': col(th.bg), '--tf': col(th.fg), '--te': emCol });
      S.themesBody.append(b);
    });
  }

  /* ---------- type specimen (read-only) ---------- */
  function typeSpecimen() {
    const g = tpl => MA.form.sanitize(String(C().get(tpl) || C().def(tpl) || ''));
    // the first copy key the site still has (keys come and go with redesigns)
    const firstOf = (tpls, get) => tpls.map(get).find(v => v) || '';
    const rows = [
      { font: 'Instrument Serif', cls: 'f-serif', role: t('fSerif'), w: t('wSerif'), html: g('text/en/j0.t'), dir: 'ltr' },
      { font: 'Bricolage Grotesque', cls: 'f-sans', role: t('fSans'), w: t('wSans'), html: esc(MA.strip(g('text/en/hr.1d'))), dir: 'ltr' },
      { font: 'Martian Mono', cls: 'f-mono', role: t('fMono'), w: t('wMono'), html: esc(MA.strip(firstOf(['text/en/c.label', 'text/en/st.where', 'text/en/f.name'], g))) + ' · 09:00–18:00', dir: 'ltr' },
      { font: 'IBM Plex Sans Arabic', cls: 'f-ar', role: t('fAr'), w: t('wAr'), html: g('text/ar/j0.t'), dir: 'rtl' },
    ];
    return h('div.br-type', rows.map(r => h('div.br-type-row',
      h('div.br-type-meta', h('b', { dir: 'ltr' }, r.font), h('span.small.muted', r.role), h('span.tiny.faint', r.w)),
      h('div', { class: 'br-type-sample ' + r.cls, dir: r.dir, lang: r.dir === 'rtl' ? 'ar' : 'en', html: r.html }))));
  }

  /* ---------- logos ---------- */
  function logoTile(L) {
    const path = 'assets/' + L.file, url = '../' + path;
    const meta = h('span.tiny.faint.mono.br-logo-meta', { dir: 'ltr' }, L.file);
    const art = vars(h('div.br-logo-art', { role: 'img', 'aria-label': t(L.id) }), { '--src': `url("${new URL(url, location.href).href}")` });
    const fig = h('figure.br-logo', { dataset: { logo: L.id } }, h('div.br-logo-stage', art),
      h('figcaption',
        h('div.br-logo-top', h('b.br-logo-name.grow', t(L.id)),
          h('a.icon-btn.sm', { href: url, download: 'miras-' + L.file, 'aria-label': t('download'), 'data-tip': t('download'), html: MA.icon('download') }),
          MA.ui.iconBtn('copy', { tip: t('copyPath'), size: 'sm', onclick: () => MA.copy(path, esc(t('pathCopied'))) })),
        meta));
    // real dimensions and size, read from the file itself
    const fill = () => { meta.textContent = [L.file, meta.dataset.dim ? meta.dataset.dim.split('x').map(n => MA.num(+n, { useGrouping: false })).join(' × ') : '', meta.dataset.kb ? `${MA.num(+meta.dataset.kb)} KB` : ''].filter(Boolean).join(' · '); };
    const img = new Image(); img.onload = () => { meta.dataset.dim = `${img.naturalWidth}x${img.naturalHeight}`; fill(); }; img.src = url;
    fetch(url).then(r => r.ok ? r.blob() : null).then(b => { if (b) { meta.dataset.kb = String(Math.max(1, Math.round(b.size / 1024))); fill(); } }).catch(() => {});
    return fig;
  }
  function paintLogos() {
    if (!S) return;
    vars(S.logosBody, { '--lb': col(S.logoBg), '--li': S.logoBg === 'shore' ? col('deep') : col('shore') });
    markNear();
  }

  /* ---------- preview (MA.ui.previewPane) ---------- */
  function aim(sec, reveal) {
    if (!S || !sec) return;
    if (reveal && !S.pane.visible) S.pane.show();
    if (sec !== S.lastSec || reveal) S.pane.goto(sec);
    S.lastSec = sec;
    if (reveal && innerWidth <= 1100) S.pane.el.scrollIntoView({ block: 'nearest', behavior: MA.reducedMotion() ? 'auto' : 'smooth' });
  }
  function moveFocus(d) {
    if (!S) return;
    const i = KEYS.findIndex(k => S.bands[k].el.contains(document.activeElement));
    const next = KEYS[i < 0 ? (d > 0 ? 0 : KEYS.length - 1) : MA.clamp(i + d, 0, KEYS.length - 1)];
    S.bands[next].el.focus();
  }
  function handleQuery(ctx) {
    const c = ctx?.query?.get('c'), sec = ctx?.query?.get('sec');
    if (c && KEYS.includes(c)) setTimeout(() => S?.bands[c]?.el.focus(), 60);
    if (sec) setTimeout(() => S?.root.querySelector('#br-' + MA.slug(sec))?.scrollIntoView({ block: 'start', behavior: MA.reducedMotion() ? 'auto' : 'smooth' }), 60);
  }

  const mod = {
    id: ID, group: 'site', order: 80, icon: 'palette', shortcut: 'g b',
    title: { en: 'Brand colours', ar: 'ألوان الهوية', fa: 'رنگ‌های برند' },
    keywords: 'brand colours colors palette theme contrast logo fonts typography',
    render,
    update(ctx) { if (!S) return false; handleQuery(ctx); return true; },
    search(q) {
      const s = String(q).trim().toLowerCase(); if (!s || !MA.content?.draft) return [];
      return KEYS.filter(k => Object.values(INFO[k].name).some(n => n.toLowerCase().includes(s)) || (s.length > 2 && col(k).toLowerCase().includes(s.replace(/^#?/, '#'))))
        .map(k => ({ title: nameOf(k), sub: `${col(k)} · ${MA.L(INFO[k].role)}`, icon: 'palette', run: () => MA.go('#/brand?c=' + k) }));
    },
  };
  MA.module(mod);

  const anyCustom = () => !!MA.content?.draft && KEYS.some(k => normHex(MA.content.get('theme/' + k)) !== normHex(MA.content.def('theme/' + k)));
  MA.commands.add({ id: 'brand.open', title: { en: 'Edit brand colours', ar: 'تعديل ألوان الهوية', fa: 'ویرایش رنگ‌های برند' }, icon: 'palette', keywords: 'brand palette colours colors theme', run: () => MA.go('#/brand') });
  MA.commands.add({ id: 'brand.contrast', title: { en: 'Check colour contrast', ar: 'فحص تباين الألوان', fa: 'بررسی کنتراست رنگ‌ها' }, icon: 'eye', keywords: 'contrast wcag accessibility a11y aa aaa', run: () => MA.go('#/brand?sec=contrast') });
  MA.commands.add({ id: 'brand.reset', title: { en: 'Reset brand colours', ar: 'إعادة ألوان الهوية', fa: 'بازگرداندن رنگ‌های برند' }, icon: 'undo', keywords: 'palette original default',
    when: () => MA.can('content.edit') && anyCustom(),
    run: () => { const next = MA.clone(MA.content.get('theme') || {}); KEYS.forEach(k => { next[k] = MA.content.def('theme/' + k); }); MA.content.replace('theme', next, t('lResetAll')); MA.toast(esc(t('resetAllDone')), { undo: () => MA.content.undo() }); } });

  // pure helpers, exposed for tests and other modules (no page state)
  MA.brand = { ratio, toOklch, fromOklch, nudge, suggest, normHex, PAIRS, KEYS };
})();
