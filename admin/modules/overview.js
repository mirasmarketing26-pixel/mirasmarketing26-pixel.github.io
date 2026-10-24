/* =====================================================================
   MIRAS admin — Overview: the customizable home of the admin.
   · Header: greeting by first name, the date in Lusail, and a live studio status line
     computed from the draft's studio hours with the same rules as the site's clock.
   · Sea band: an MA.sea canvas whose roughness is today's visitors vs the usual for this weekday
     (same weekday over the last 4 weeks, at this hour), plus one plain sentence.
   · Widget board: 4-column grid, sizes S 1×1 · M 2×1 · L 2×2 · W 4×1, container queries per tile.
     Arrange mode (E): drag with pointer events + FLIP reflow, keyboard lift/move/drop with live
     announcements, size menu, remove with undo, Esc restores, Done saves.
   · Add-widget drawer with search, categories and live previews; layout presets (undoable).
   Layout is saved per person: MA.db 'overview.v1:<memberId>'. Notes: 'overview.notes.v1:<memberId>'.
   Admin UI copy is English / Arabic / Persian; site copy shown here is Arabic in an Arabic admin, English otherwise.
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA, h = MA.h, esc = MA.esc, DAY = 864e5;
  const tt = (k, v) => MA.t('overview.' + k, v);

  /* =================== copy: [English, Arabic, Persian] =================== */
  const COPY = {
    'greet.morning': ['Good morning', 'صباح الخير', 'صبح بخیر'],
    'greet.afternoon': ['Good afternoon', 'مساء الخير', 'عصر بخیر'],
    'greet.evening': ['Good evening', 'مساء الخير', 'شب بخیر'],
    'greet.late': ['Working late', 'ما زلت هنا', 'هنوز این‌جایید'],
    greetName: ['{g}, {name}.', '{g} يا {name}.', '{g}، {name}.'],
    greetBare: ['{g}.', '{g}.', '{g}.'],
    lusail: ['Lusail', 'لوسيل', 'لوسیل'],
    listSep: [', ', '، ', '، '],
    'st.open': ['Studio open · closes at {close}', 'الاستوديو مفتوح · يغلق الساعة {close}', 'استودیو باز است · ساعت {close} می‌بندد'],
    'st.today': ['Closed · opens at {open} today', 'مغلق الآن · يفتح اليوم الساعة {open}', 'بسته است · امروز ساعت {open} باز می‌شود'],
    'st.tomorrow': ['Closed for the night · back tomorrow at {open}', 'أغلقنا لهذا اليوم · نعود غداً الساعة {open}', 'امشب بسته است · فردا ساعت {open} برمی‌گردیم'],
    'st.weekend': ['Closed for the weekend · back {day} at {open}', 'مغلق في عطلة نهاية الأسبوع · نعود يوم {day} الساعة {open}', 'آخر هفته تعطیل است · {day} ساعت {open} برمی‌گردیم'],
    'st.nohours': ['No opening hours set yet', 'لم تُحدَّد ساعات العمل بعد', 'هنوز ساعت کاری تعیین نشده'],
    'st.in': ['in {place}', 'بتوقيت {place}', 'به وقت {place}'],
    'dur.hm': ['{h} h {m} min', '{h} س و{m} د', '{h} ساعت و {m} دقیقه'],
    'dur.m': ['{m} min', '{m} د', '{m} دقیقه'],
    layout: ['Layout', 'التخطيط', 'چیدمان'],
    addWidget: ['Add widget', 'إضافة أداة', 'افزودن ابزارک'],
    arrange: ['Arrange', 'ترتيب', 'مرتب‌سازی'],
    barTitle: ['Arranging', 'وضع الترتيب', 'حالت مرتب‌سازی'],
    barText: ['Drag tiles to move them, or focus one and press Space.', 'اسحب البطاقات لنقلها، أو اختر واحدة واضغط المسافة.', 'کارت‌ها را بکشید تا جابه‌جا شوند، یا روی یکی بروید و Space را بزنید.'],
    more: ['Widget options', 'خيارات الأداة', 'گزینه‌های ابزارک'],
    resize: ['Change size', 'تغيير الحجم', 'تغییر اندازه'],
    drag: ['Drag to move', 'اسحب للنقل', 'برای جابه‌جایی بکشید'],
    size: ['Size', 'الحجم', 'اندازه'],
    sizeS: ['Small', 'صغير', 'کوچک'], sizeM: ['Medium', 'متوسط', 'متوسط'], sizeL: ['Large', 'كبير', 'بزرگ'], sizeW: ['Wide', 'عريض', 'پهن'],
    removeTile: ['Remove from board', 'إزالة من اللوحة', 'برداشتن از تابلو'],
    removed: ['Removed {name} from your board.', 'أُزيلت بطاقة «{name}» من لوحتك.', '«{name}» از تابلوی شما برداشته شد.'],
    added: ['Added {name} to your board.', 'أُضيفت بطاقة «{name}» إلى لوحتك.', '«{name}» به تابلوی شما اضافه شد.'],
    openMod: ['Open {name}', 'فتح {name}', 'باز کردن {name}'],
    widgetFailed: ["This widget couldn't load: {msg}", 'تعذّر تحميل هذه الأداة: {msg}', 'این ابزارک بارگذاری نشد: {msg}'],
    andMore: ['{n} more', 'و{n} غيرها', '{n} مورد دیگر'],
    boardLabel: ['Your widgets', 'أدواتك', 'ابزارک‌های شما'],
    unread: ['Unread', 'غير مقروء', 'خوانده‌نشده'],
    savedAt: ['Saved at {t}', 'حُفظت الساعة {t}', 'ساعت {t} ذخیره شد'],
    'opt.range': ['Date range', 'الفترة', 'بازهٔ زمانی'],
    'opt.rows': ['Rows', 'عدد الصفوف', 'تعداد ردیف‌ها'],
    'opt.nRows': ['{n} rows', '{n} صفوف', '{n} ردیف'],
    'opt.measure': ['Show', 'العرض حسب', 'نمایش بر اساس'],
    'opt.value': ['Value (QAR)', 'القيمة (ر.ق)', 'ارزش (ریال قطر)'],
    'opt.count': ['Number of briefs', 'عدد الطلبات', 'تعداد درخواست‌ها'],
    'a11y.help': ['Arrange mode. Press Space to lift a tile, the arrow keys to move it and Space again to drop it. Delete removes a tile. Escape cancels.',
      'وضع الترتيب. اضغط المسافة لرفع البطاقة، ثم الأسهم لتحريكها، ثم المسافة مرة أخرى لإفلاتها. زر الحذف يزيلها، وEscape يلغي.',
      'حالت مرتب‌سازی. برای برداشتن کارت Space را بزنید، با کلیدهای جهت جابه‌جایش کنید و دوباره Space را بزنید تا رها شود. Delete کارت را برمی‌دارد و Escape لغو می‌کند.'],
    'a11y.on': ['Arrange mode on. Drag tiles, or focus one and press Space. Press E or Done to save, Escape to cancel.',
      'وضع الترتيب مفعّل. اسحب البطاقات، أو اختر واحدة واضغط المسافة. اضغط E أو «تم» للحفظ، وEscape للإلغاء.',
      'حالت مرتب‌سازی روشن است. کارت‌ها را بکشید، یا روی یکی بروید و Space را بزنید. برای ذخیره E یا «تمام» و برای لغو Escape را بزنید.'],
    'a11y.tile': ['movable tile', 'بطاقة قابلة للنقل', 'کارت جابه‌جاشدنی'],
    'a11y.pos': ['{name}, position {pos} of {n}', '«{name}»، الموضع {pos} من {n}', '«{name}»، جایگاه {pos} از {n}'],
    'a11y.lifted': ['{name} lifted. Position {pos} of {n}. Use the arrow keys to move it and Space to drop it.', 'رُفعت بطاقة «{name}». الموضع {pos} من {n}. استخدم الأسهم لتحريكها والمسافة لإفلاتها.', '«{name}» برداشته شد. جایگاه {pos} از {n}. با کلیدهای جهت جابه‌جایش کنید و با Space رهایش کنید.'],
    'a11y.dropped': ['{name} dropped at position {pos} of {n}.', 'أُفلتت بطاقة «{name}» في الموضع {pos} من {n}.', '«{name}» در جایگاه {pos} از {n} رها شد.'],
    'a11y.cancelLift': ['Move cancelled. {name} is back at position {pos}.', 'أُلغي النقل. عادت بطاقة «{name}» إلى الموضع {pos}.', 'جابه‌جایی لغو شد. «{name}» به جایگاه {pos} برگشت.'],
    'a11y.saved': ['Layout saved.', 'حُفظ التخطيط.', 'چیدمان ذخیره شد.'],
    'a11y.discarded': ['Changes discarded. Your board is back as it was.', 'أُلغيت التغييرات، وعادت لوحتك كما كانت.', 'تغییرات کنار گذاشته شد. تابلوی شما به حالت قبل برگشت.'],
    'a11y.sized': ['{name} is now {size}.', 'أصبحت بطاقة «{name}» بحجم {size}.', 'اندازهٔ «{name}» حالا {size} است.'],
    'a11y.removed': ['{name} removed.', 'أُزيلت بطاقة «{name}».', '«{name}» برداشته شد.'],
    addTitle: ['Add a widget', 'إضافة أداة', 'افزودن ابزارک'],
    addSearch: ['Search widgets', 'ابحث في الأدوات', 'جست‌وجوی ابزارک‌ها'],
    'cat.all': ['All', 'الكل', 'همه'], 'cat.leads': ['Leads', 'الطلبات', 'درخواست‌ها'], 'cat.traffic': ['Traffic', 'الزيارات', 'بازدیدها'],
    'cat.content': ['Content', 'المحتوى', 'محتوا'], 'cat.studio': ['Studio', 'الاستوديو', 'استودیو'], 'cat.notes': ['Notes', 'الملاحظات', 'یادداشت‌ها'],
    onBoard: ['On board', 'على اللوحة', 'روی تابلو'],
    showMe: ['Show me', 'أرني', 'نشانم بده'],
    addOne: ['Add', 'أضِف', 'افزودن'],
    addAnother: ['Add another', 'أضِف أخرى', 'یکی دیگر'],
    noMatch: ['No widget matches “{q}”.', 'لا توجد أداة تطابق «{q}».', 'هیچ ابزارکی با «{q}» جور نیست.'],
    sizes: ['Sizes', 'الأحجام', 'اندازه‌ها'],
    presetsHead: ['Start from a layout', 'ابدأ من تخطيط جاهز', 'شروع از یک چیدمان آماده'],
    nWidgets: ['{n} widgets', 'الأدوات: {n}', '{n} ابزارک'],
    startEmpty: ['Start empty', 'ابدأ من الصفر', 'شروع از صفر'],
    presetApplied: ['Switched to the {name} layout.', 'انتقلت إلى تخطيط «{name}».', 'چیدمان «{name}» اعمال شد.'],
    blankT: ['A clear horizon', 'أفق صافٍ', 'افقی صاف'],
    blankX: ['Add the widgets you check every day, or start from a ready-made layout.', 'أضِف الأدوات التي تراجعها كل يوم، أو ابدأ من تخطيط جاهز.', 'ابزارک‌هایی را که هر روز سر می‌زنید اضافه کنید، یا از یک چیدمان آماده شروع کنید.'],
    useFounder: ['Use the Founder layout', 'استخدم تخطيط المؤسس', 'استفاده از چیدمان بنیان‌گذار'],
    'k.arrange': ['Arrange the overview', 'ترتيب النظرة العامة', 'مرتب‌سازی نمای کلی'],
    prevPeriod: ['Previous period', 'الفترة السابقة', 'دورهٔ قبل'],
    noDataT: ['Waiting for the first visit', 'بانتظار أول زيارة', 'در انتظار نخستین بازدید'],
    noDataX: ['Connect analytics in Settings, or turn on sample data in Customize.', 'اربط أداة التحليلات من الإعدادات، أو فعّل البيانات التجريبية من التخصيص.', 'ابزار آمار را در «تنظیمات» وصل کنید، یا دادهٔ نمونه را در «شخصی‌سازی» روشن کنید.'],
    's.onBoard': ['Overview widget · on your board', 'أداة في النظرة العامة · على لوحتك', 'ابزارک نمای کلی · روی تابلوی شما'],
    's.add': ['Overview widget · add to your board', 'أداة في النظرة العامة · أضِفها إلى لوحتك', 'ابزارک نمای کلی · افزودن به تابلو'],
    's.preset': ['Layout: {name}', 'تخطيط: {name}', 'چیدمان: {name}'],
    's.presetSub': ['Apply to your overview', 'طبّقه على نظرتك العامة', 'اعمال روی نمای کلی شما'],
    'sea.label': ['Sea state', 'حالة البحر', 'وضع دریا'],
    'sea.glassy': ['Glassy', 'ساكن', 'آینه‌ای'], 'sea.calm': ['Calm', 'هادئ', 'آرام'], 'sea.steady': ['Steady', 'معتدل', 'معتدل'],
    'sea.lively': ['Lively', 'نشِط', 'پرجنب‌وجوش'], 'sea.choppy': ['Choppy', 'متلاطم', 'متلاطم'],
    'sea.busier': ['Busier than a usual {day}: {n} visitors so far, {pct} above normal for this time of day.',
      'حركة أكثر من يوم {day} المعتاد، بنسبة {pct} في مثل هذا الوقت. الزوار حتى الآن: {n}.',
      'شلوغ‌تر از یک {day} معمولی: تا این لحظه {n} بازدیدکننده، {pct} بیشتر از معمولِ این ساعت.'],
    'sea.quieter': ['Quieter than a usual {day}: {n} visitors so far, {pct} below normal for this time of day.',
      'حركة أقل من يوم {day} المعتاد، بنسبة {pct} في مثل هذا الوقت. الزوار حتى الآن: {n}.',
      'آرام‌تر از یک {day} معمولی: تا این لحظه {n} بازدیدکننده، {pct} کمتر از معمولِ این ساعت.'],
    'sea.usual': ['A usual {day} so far: {n} visitors, close to normal for this time of day.',
      'يوم {day} عادي حتى الآن، والحركة قريبة من المعتاد في مثل هذا الوقت. الزوار حتى الآن: {n}.',
      'تا این‌جا یک {day} معمولی: {n} بازدیدکننده، نزدیک به معمولِ این ساعت.'],
    'sea.early': ['Early in the day: {n} visitors so far. A usual {day} has about {exp} by now.',
      'ما زال الوقت مبكراً. الزوار حتى الآن: {n}، ويوم {day} المعتاد يكون فيه نحو {exp} في مثل هذا الوقت.',
      'هنوز اول روز است: تا این لحظه {n} بازدیدکننده. یک {day} معمولی تا این ساعت حدود {exp} بازدیدکننده دارد.'],
    'sea.nobase': ['Nothing on the same weekday in the last {w} weeks to compare with yet. {n} visitors so far today.',
      'لا زيارات في اليوم نفسه خلال الأسابيع الـ{w} الماضية لنقارن بها بعد. الزوار اليوم حتى الآن: {n}.',
      'هنوز در همین روزِ هفته طی {w} هفتهٔ گذشته داده‌ای برای مقایسه نداریم. امروز تا این لحظه {n} بازدیدکننده.'],
    'sea.none': ['No visitor data yet. Connect analytics in Settings, or open the site in this browser, and the sea will start to move.',
      'لا بيانات عن الزوار بعد. اربط أداة التحليلات من الإعدادات، أو افتح الموقع في هذا المتصفح، وسيبدأ البحر بالحركة.',
      'هنوز دادهٔ بازدیدی نداریم. ابزار آمار را در «تنظیمات» وصل کنید یا سایت را در همین مرورگر باز کنید تا دریا به حرکت درآید.'],
    'sea.basis': ['Compared with the same weekday over the last {w} weeks, at this hour in Lusail.', 'مقارنةً باليوم نفسه خلال الأسابيع الـ{w} الماضية، في مثل هذه الساعة بتوقيت لوسيل.', 'در مقایسه با همین روزِ هفته در {w} هفتهٔ گذشته، در همین ساعت به وقت لوسیل.'],
    'sea.sofar': ['So far today', 'حتى الآن اليوم', 'امروز تا این لحظه'],
    'sea.usualNow': ['Usual by now', 'المعتاد حتى الآن', 'معمولِ این ساعت'],
    'sea.usualDay': ['A usual {day}', 'يوم {day} المعتاد', 'یک {day} معمولی'],
    'w.waiting.emptyT': ['Calm water', 'مياه هادئة', 'آب آرام'],
    'w.waiting.emptyX': ['Every brief has a reply.', 'كل طلب حصل على ردّ.', 'به همهٔ درخواست‌ها پاسخ داده‌ایم.'],
    'w.newest.emptyT': ['No briefs yet', 'لا طلبات بعد', 'هنوز درخواستی نرسیده'],
    'w.newest.emptyX': ['Briefs sent from the site land here, along with any you add by hand.', 'تصل هنا الطلبات المرسلة من الموقع، وأي طلب تضيفه بنفسك.', 'درخواست‌هایی که از سایت می‌رسند، و هر درخواستی که خودتان اضافه کنید، این‌جا می‌آیند.'],
    'w.newest.unread': ['{n} unread', 'غير مقروءة: {n}', '{n} خوانده‌نشده'],
    'w.pipe.emptyT': ['No open briefs', 'لا طلبات مفتوحة', 'درخواست بازی نیست'],
    'w.pipe.emptyX': ['New briefs start in the first stage.', 'تبدأ الطلبات الجديدة في المرحلة الأولى.', 'درخواست‌های تازه از مرحلهٔ اول شروع می‌شوند.'],
    'w.pipe.capV': ['in {n} open briefs', 'في الطلبات المفتوحة ({n})', 'در {n} درخواست باز'],
    'w.pipe.capN': ['open briefs', 'طلبات مفتوحة', 'درخواست باز'],
    'w.won.zero': ['No projects signed since {date}.', 'لم يُوقَّع أي مشروع منذ {date}.', 'از {date} تا حالا قراردادی بسته نشده.'],
    'w.won.one': ['1 project signed since {date}', 'مشروع واحد وُقّع منذ {date}', 'از {date} یک قرارداد بسته شده'],
    'w.won.n': ['{n} projects signed since {date}', 'مشاريع وُقّعت منذ {date}: {n}', 'از {date} {n} قرارداد بسته شده'],
    'w.won.both0': ['Nothing signed by this day last month either.', 'ولم يُوقَّع شيء حتى هذا اليوم من الشهر الماضي أيضاً.', 'ماه گذشته هم تا همین روز قراردادی بسته نشده بود.'],
    'w.live.n': ['people on the site in the last {m} minutes', 'على الموقع خلال آخر {m} دقائق', 'نفر در {m} دقیقهٔ گذشته روی سایت'],
    'w.live.one': ['person on the site in the last {m} minutes', 'على الموقع خلال آخر {m} دقائق', 'نفر در {m} دقیقهٔ گذشته روی سایت'],
    'w.live.zero': ['Nobody on the site in the last {m} minutes.', 'لا أحد على الموقع خلال آخر {m} دقائق.', 'در {m} دقیقهٔ گذشته کسی روی سایت نبوده.'],
    'w.live.note': ['The live count comes from visits logged in this browser.', 'يُحتسب العدد المباشر من الزيارات المسجّلة في هذا المتصفح.', 'شمار زنده از بازدیدهایی می‌آید که در همین مرورگر ثبت شده‌اند.'],
    'w.live.recent': ['Recent', 'الأحدث', 'تازه‌ترین‌ها'],
    'w.swells.cap': [{ one: '{n} tap · {range}', other: '{n} taps · {range}' }, 'النقرات: {n} · {range}', '{n} انتخاب · {range}'],
    'w.swells.emptyT': ['No swell taps yet', 'لا نقرات على الموجات بعد', 'هنوز موجی انتخاب نشده'],
    'w.swells.emptyX': ['Taps on the swells show up here, ranked.', 'تظهر هنا النقرات على الموجات مرتّبة.', 'انتخاب موج‌ها این‌جا به ترتیب نمایش داده می‌شود.'],
    'w.reach.cap': ['Share of visitors who reached each section · {range}', 'نسبة الزوار الذين وصلوا إلى كل قسم · {range}', 'سهم بازدیدکنندگانی که به هر بخش رسیدند · {range}'],
    'w.reach.hidden': ['Hidden', 'مخفي', 'پنهان'],
    'w.reach.hiddenNote': ['Hidden on the site, so not counted: {list}.', 'مخفية في الموقع فلا تُحتسب: {list}.', 'در سایت پنهان است و شمرده نمی‌شود: {list}.'],
    'w.funnel.leak': ['Biggest drop: {pct} leave between “{from}” and “{to}”.', 'أكبر تسرّب: {pct} يغادرون بين «{from}» و«{to}».', 'بیشترین ریزش: {pct} بین «{from}» و «{to}» می‌روند.'],
    'w.lang.en': ['English', 'الإنجليزية', 'انگلیسی'],
    'w.lang.ar': ['Arabic', 'العربية', 'عربی'],
    'w.lang.cap': ['Language visitors browsed in · {range}', 'اللغة التي تصفّح بها الزوار · {range}', 'زبانی که بازدیدکنندگان سایت را با آن دیدند · {range}'],
    'w.clock.closesIn': ['Closes in {d}', 'يغلق بعد {d}', '{d} دیگر می‌بندد'],
    'w.clock.opensIn': ['Opens in {d}', 'يفتح بعد {d}', '{d} دیگر باز می‌شود'],
    'w.clock.edit': ['Edit opening hours', 'تعديل ساعات العمل', 'ویرایش ساعت کاری'],
    'w.changes.one': ['change waiting to publish', 'تعديل بانتظار النشر', 'تغییر در انتظار انتشار'],
    'w.changes.n': ['changes waiting to publish', 'تعديلات بانتظار النشر', 'تغییر در انتظار انتشار'],
    'w.changes.none': ['Everything is live', 'كل شيء منشور', 'همه‌چیز منتشر شده'],
    'w.changes.last': ['Last published {ago} by {by}.', 'آخر نشر {ago} بواسطة {by}.', 'آخرین انتشار {ago} توسط {by}.'],
    'w.changes.never': ['Nothing published from this admin yet.', 'لم يُنشر شيء من هذه اللوحة بعد.', 'هنوز چیزی از این پنل منتشر نشده.'],
    'w.changes.publish': ['Publish changes', 'نشر التعديلات', 'انتشار تغییرات'],
    'w.changes.review': ['Review changes', 'مراجعة التعديلات', 'بازبینی تغییرات'],
    'w.changes.kind.publish': ['Published', 'نُشر', 'منتشر شد'],
    'w.changes.kind.checkpoint': ['Checkpoint', 'نقطة استرجاع', 'نقطهٔ بازگشت'],
    'w.ar.noneT': ['All Arabic is in place', 'كل النصوص العربية مكتملة', 'همهٔ متن‌های عربی کامل است'],
    'w.ar.noneX': ['Fields checked: {n}, across copy, swells, services, process, “What we make” and questions.', 'الحقول التي فحصناها: {n}، في النصوص والموجات والخدمات والمراحل و«ما نصنعه» والأسئلة.', '{n} فیلد در متن‌ها، موج‌ها، خدمت‌ها، روش کار، «آنچه می‌سازیم» و پرسش‌ها بررسی شد.'],
    'w.svc.cap': [{ one: '{n} add · {range}', other: '{n} adds · {range}' }, 'الإضافات: {n} · {range}', '{n} بار افزوده شد · {range}'],
    'w.svc.emptyT': ['No services added yet', 'لم تُضف خدمات بعد', 'هنوز خدمتی افزوده نشده'],
    'w.svc.emptyX': ['When visitors tap + on a service, it lands here.', 'حين يضغط الزائر + على خدمة، تظهر هنا.', 'وقتی بازدیدکننده روی + یک خدمت بزند، این‌جا دیده می‌شود.'],
    'w.svc.note': ['Counted from visits logged in this browser. Sample data has no service picks.', 'تُحتسب من الزيارات المسجّلة في هذا المتصفح. البيانات التجريبية لا تشمل اختيار الخدمات.', 'از بازدیدهای ثبت‌شده در همین مرورگر شمرده می‌شود. دادهٔ نمونه انتخاب خدمت ندارد.'],
    'w.svc.noteLocal': ['Counted from visits logged in this browser.', 'تُحتسب من الزيارات المسجّلة في هذا المتصفح.', 'از بازدیدهای ثبت‌شده در همین مرورگر شمرده می‌شود.'],
    'w.ar.fix': ['Fix the first field', 'أصلح الحقل الأول', 'اصلاح نخستین فیلد'],
    'w.ar.empty': ['Empty', 'فارغ', 'خالی'],
    'w.ar.same': ['Same as English', 'مطابق للإنجليزية', 'همان انگلیسی'],
    'w.ar.cap': ['fields need Arabic', 'حقول تحتاج إلى العربية', 'فیلد به عربی نیاز دارد'],
    'w.ar.capOne': ['field needs Arabic', 'حقل يحتاج إلى العربية', 'فیلد به عربی نیاز دارد'],
    'w.act.emptyT': ['Nothing has happened yet', 'لم يحدث شيء بعد', 'هنوز اتفاقی نیفتاده'],
    'w.act.emptyX': ['Edits, publishes and brief updates show up here.', 'تظهر هنا التعديلات وعمليات النشر وتحديثات الطلبات.', 'ویرایش‌ها، انتشارها و به‌روزرسانی درخواست‌ها این‌جا نمایش داده می‌شوند.'],
    'act.publish': ['published', 'نشر', 'منتشر کرد'],
    'act.checkpoint': ['saved a checkpoint', 'حفظ نقطة استرجاع', 'نقطهٔ بازگشت ذخیره کرد'],
    'act.lead.stage': ['moved a brief', 'نقل طلباً', 'درخواستی را جابه‌جا کرد'],
    'act.lead.add': ['added a brief', 'أضاف طلباً', 'درخواستی افزود'],
    'act.lead.note': ['added a note', 'أضاف ملاحظة', 'یادداشتی افزود'],
    'act.lead.delete': ['deleted a brief', 'حذف طلباً', 'درخواستی را حذف کرد'],
    'act.lead.import': ['imported briefs', 'استورد طلبات', 'درخواست‌هایی را وارد کرد'],
    'act.restore': ['restored a version', 'استرجع نسخة', 'نسخه‌ای را بازگرداند'],
    'act.swell.add': ['added a swell', 'أضاف موجة', 'موجی افزود'],
    'act.swell.delete': ['deleted a swell', 'حذف موجة', 'موجی را حذف کرد'],
    'act.swell.duplicate': ['duplicated a swell', 'كرّر موجة', 'از موجی نسخه گرفت'],
    'act.analytics.clear': ['cleared local visit data', 'مسح بيانات الزيارات المحلية', 'دادهٔ بازدید محلی را پاک کرد'],
    'act.other': ['made a change', 'أجرى تعديلاً', 'تغییری داد'],
    'w.team.people': [{ one: '{n} person', other: '{n} people' }, 'الأعضاء: {n}', '{n} نفر'],
    'w.team.invited': ['Invited', 'مدعو', 'دعوت‌شده'],
    'w.team.nInvited': ['{n} invited', 'مدعوون: {n}', '{n} دعوت‌شده'],
    'w.notes.ph': ["A note for yourself: today's focus, a client to call back…", 'ملاحظة لنفسك: تركيز اليوم، عميل يجب معاودة الاتصال به…', 'یادداشتی برای خودتان: کار مهم امروز، مشتری‌ای که باید با او تماس بگیرید…'],
    'w.notes.private': ['Saved in this browser, only for you.', 'تُحفظ في هذا المتصفح، ولك وحدك.', 'در همین مرورگر ذخیره می‌شود و فقط شما آن را می‌بینید.'],
    'qa.preview': ['Preview the site', 'معاينة الموقع', 'پیش‌نمایش سایت'], 'qa.previewS': ['Preview', 'معاينة', 'پیش‌نمایش'],
    'qa.publish': ['Publish changes', 'نشر التعديلات', 'انتشار تغییرات'], 'qa.publishS': ['Publish', 'نشر', 'انتشار'],
    'qa.brief': ['Add a brief', 'إضافة طلب', 'افزودن درخواست'], 'qa.briefS': ['Add brief', 'طلب جديد', 'درخواست تازه'],
    'qa.site': ['Open the site', 'فتح الموقع', 'باز کردن سایت'], 'qa.siteS': ['Open site', 'الموقع', 'سایت'],
    'qa.customize': ['Customize the admin', 'تخصيص اللوحة', 'شخصی‌سازی پنل'], 'qa.customizeS': ['Customize', 'تخصيص', 'شخصی‌سازی'],
    'qa.arrange': ['Arrange this board', 'ترتيب هذه اللوحة', 'مرتب‌سازی این تابلو'], 'qa.arrangeS': ['Arrange', 'ترتيب', 'مرتب‌سازی'],
    'brief.title': ['Add a brief', 'إضافة طلب', 'افزودن درخواست'],
    'brief.name': ['Name', 'الاسم', 'نام'], 'brief.email': ['Email', 'البريد الإلكتروني', 'ایمیل'], 'brief.company': ['Company', 'الشركة', 'شرکت'],
    'brief.value': ['Budget (QAR)', 'الميزانية (ر.ق)', 'بودجه (ریال قطر)'], 'brief.source': ['Came from', 'المصدر', 'منبع'],
    'brief.message': ['What they need', 'ما يحتاجونه', 'چه می‌خواهند'], 'brief.add': ['Add brief', 'أضِف الطلب', 'افزودن درخواست'],
    'brief.need': ['Add a name or an email.', 'أضِف اسماً أو بريداً إلكترونياً.', 'یک نام یا ایمیل وارد کنید.'],
    'brief.badEmail': ["That email doesn't look right.", 'يبدو أن البريد الإلكتروني غير صحيح.', 'این ایمیل درست به نظر نمی‌رسد.'],
    'brief.added': ['Added a brief from {name}.', 'أُضيف طلب من {name}.', 'درخواستی از {name} اضافه شد.'],
    'f.problem': ['Problem', 'المشكلة', 'مسئله'], 'f.service': ['Service name', 'اسم الخدمة', 'نام خدمت'], 'f.desc': ['Description', 'الوصف', 'توضیح'],
    'f.noun': ['Noun', 'الاسم', 'اسم'], 'f.title': ['Title', 'العنوان', 'عنوان'], 'f.q': ['Question', 'السؤال', 'پرسش'], 'f.a': ['Answer', 'الإجابة', 'پاسخ'],
    'f.steps': ['Step', 'الخطوة', 'گام'], 'f.gets': ['Deliverable', 'ما يحصل عليه', 'خروجی'], 'f.tags': ['Service tag', 'وسم الخدمة', 'برچسب خدمت'],
    'f.name': ['Name', 'الاسم', 'نام'], 'f.line': ['Line', 'السطر', 'سطر'], sgroupN: ['Service group {n}', 'مجموعة الخدمات {n}', 'گروه خدمات {n}'], serviceN: ['Service {n}', 'الخدمة {n}', 'خدمت {n}'],
    'f.img': ['Photo', 'الصورة', 'عکس'], 'f.icon': ['Icon', 'الأيقونة', 'آیکون'], 'f.tint': ['Colours', 'الألوان', 'رنگ‌ها'], 'f.phase': ['Phase', 'المرحلة', 'مرحله'], 'f.id': ['ID', 'المعرّف', 'شناسه'],
    questionN: ['Question {n}', 'سؤال {n}', 'پرسش {n}'], stageN: ['Stage {n}', 'المرحلة {n}', 'مرحلهٔ {n}'],
    makeWord: ['What we make', 'ما نصنعه', 'آنچه می‌سازیم'], stepLabel: ['Step label', 'تسمية الخطوة', 'برچسب گام'],
    'area.copy': ['Site copy', 'نصوص الموقع', 'متن‌های سایت'], 'area.swells': ['Swells', 'الموجات', 'موج‌ها'], 'area.process': ['Process', 'طريقتنا', 'روش کار'], 'area.services': ['Services', 'الخدمات', 'خدمت‌ها'],
    'area.make': ['What we make', 'ما نصنعه', 'آنچه می‌سازیم'], 'area.faq': ['Questions', 'الأسئلة', 'پرسش‌ها'],
    'w.ar.covLabel': ['Arabic done, by area', 'اكتمال العربية حسب القسم', 'پیشرفت عربی به تفکیک بخش'],
    'cmd.arrange': ['Arrange overview', 'ترتيب النظرة العامة', 'مرتب‌سازی نمای کلی'],
    'cmd.add': ['Add a widget', 'إضافة أداة', 'افزودن ابزارک'],
    'cmd.preset': ['Apply layout preset…', 'تطبيق تخطيط جاهز…', 'اعمال چیدمان آماده…'],
    // a connected analytics service: never "connect analytics" once there is one
    noDataOnT: ['Real visitors are counted in {name}', 'يُحتسب الزوار الحقيقيون في {name}', 'بازدیدکنندگان واقعی در {name} شمرده می‌شوند'],
    noDataOnX: ['No visits are logged in this browser yet. Open {name} to see every visitor, or turn on sample data in Customize.', 'لا زيارات مسجّلة في هذا المتصفح بعد. افتح {name} لترى كل الزوار، أو فعّل البيانات التجريبية من التخصيص.', 'هنوز بازدیدی در این مرورگر ثبت نشده. {name} را باز کنید تا همهٔ بازدیدکنندگان را ببینید، یا دادهٔ نمونه را در «شخصی‌سازی» روشن کنید.'],
    openDash: ['Open the {name} dashboard', 'افتح لوحة {name}', 'باز کردن داشبورد {name}'],
    'sea.noneOn': ['No visits are logged in this browser yet. Real visitors are counted in {name}.', 'لا زيارات مسجّلة في هذا المتصفح بعد. يُحتسب الزوار الحقيقيون في {name}.', 'هنوز بازدیدی در این مرورگر ثبت نشده. بازدیدکنندگان واقعی در {name} شمرده می‌شوند.'],
    // visitors over time: a named chart, and every value as a table
    'tbl.show': ['Table', 'جدول', 'جدول'], 'tbl.tip': ['Show the numbers as a table', 'اعرض الأرقام في جدول', 'نمایش عددها به‌صورت جدول'], 'tbl.date': ['Date', 'التاريخ', 'تاریخ'],
    'w.vc.label': ['Visitors per day, {range}', 'الزوار يومياً، {range}', 'بازدیدکنندگان روزانه، {range}'],
    'w.vc.desc': ['{total} visitors in all; the busiest day was {day} with {v}.', 'مجموع الزوار: {total}، وأكثر الأيام زيارةً {day} ({v}).', 'در مجموع {total} بازدیدکننده؛ پربازدیدترین روز {day} با {v} بود.'],
    'w.won.prevV': ['Same days last month: {v}', 'الأيام نفسها من الشهر الماضي: {v}', 'همین روزها در ماه گذشته: {v}'],
    // where briefs come from
    'opt.by': ['Group by', 'التجميع حسب', 'گروه‌بندی بر اساس'], 'opt.bySource': ['Source', 'المصدر', 'منبع'], 'opt.byCampaign': ['Campaign', 'الحملة', 'کمپین'],
    'w.ch.cap': ['Briefs received · {range}', 'الطلبات التي وصلت · {range}', 'درخواست‌های رسیده · {range}'],
    'w.ch.briefs': [{ one: '{n} brief', other: '{n} briefs' }, 'الطلبات: {n}', '{n} درخواست'],
    'w.ch.won': ['{v} won', 'المُوقَّع: {v}', 'قرارداد: {v}'],
    'w.ch.emptyT': ['No briefs in this range', 'لا طلبات في هذه الفترة', 'در این بازه درخواستی نرسیده'],
    'w.ch.emptyX': ['Briefs from the site land here with their source and campaign.', 'تظهر هنا طلبات الموقع مع مصدرها وحملتها.', 'درخواست‌های سایت همراه با منبع و کمپینشان این‌جا دیده می‌شوند.'],
    'w.ch.noUtm': ['Tag the links you share with utm_campaign to see campaigns here.', 'أضف utm_campaign إلى الروابط التي تشاركها لترى الحملات هنا.', 'برای دیدن کمپین‌ها، به پیوندهایی که هم‌رسانی می‌کنید utm_campaign بیفزایید.'],
    // backups + a draft that can't be saved
    'w.bk.last': [{ zero: 'Last backup today', one: 'Last backup yesterday', other: 'Last backup {n} days ago' },
      { zero: 'آخر نسخة احتياطية اليوم', one: 'آخر نسخة احتياطية أمس', two: 'آخر نسخة احتياطية قبل يومين', few: 'آخر نسخة احتياطية قبل {n} أيام', many: 'آخر نسخة احتياطية قبل {n} يوماً', other: 'آخر نسخة احتياطية قبل {n} يوم' },
      { zero: 'آخرین پشتیبان: امروز', one: 'آخرین پشتیبان: دیروز', other: 'آخرین پشتیبان: {n} روز پیش' }],
    'w.bk.never': ['No backup yet', 'لا نسخة احتياطية بعد', 'هنوز پشتیبانی گرفته نشده'],
    'w.bk.why': ['Briefs, drafts and history live only in this browser. A backup is one file you keep somewhere safe.', 'الطلبات والمسودات والسجل محفوظة في هذا المتصفح فقط. النسخة الاحتياطية ملف واحد تحفظه في مكان آمن.', 'درخواست‌ها، پیش‌نویس‌ها و تاریخچه فقط در همین مرورگرند. نسخهٔ پشتیبان یک فایل است که جای امنی نگهش می‌دارید.'],
    'w.bk.due': ['Due', 'حان وقتها', 'وقتش رسیده'],
    'w.bk.kept': ['This browser keeps the data even when space runs low.', 'يحتفظ هذا المتصفح بالبيانات حتى عند امتلاء المساحة.', 'این مرورگر داده‌ها را حتی وقتی فضا کم شود نگه می‌دارد.'],
    // real visitors: the provider, and its shared dashboard
    'w.rv.offT': ['Count every visitor', 'احسب كل زائر', 'همهٔ بازدیدکنندگان را بشمارید'],
    'w.rv.offX': ['Connect Plausible, GA4 or Umami in Settings: the site then sends every visit there, from every device.', 'اربط Plausible أو GA4 أو Umami من الإعدادات، وسيرسل الموقع كل زيارة إلى هناك من كل الأجهزة.', 'Plausible یا GA4 یا Umami را در «تنظیمات» وصل کنید تا سایت هر بازدید را از هر دستگاهی به آنجا بفرستد.'],
    'w.rv.id': ['Site ID', 'معرّف الموقع', 'شناسهٔ سایت'],
    'w.rv.pending': ['Not live yet: publish to start counting.', 'لم يُفعَّل بعد: انشر ليبدأ الإحصاء.', 'هنوز فعال نیست: منتشر کنید تا شمارش شروع شود.'],
    'w.rv.addShare': ['Add a shared dashboard link and it shows here.', 'أضف رابط لوحة مشتركة لتظهر هنا.', 'پیوند یک داشبورد اشتراکی اضافه کنید تا این‌جا دیده شود.'],
    'w.rv.big': ['Make this tile Large or Wide to see the dashboard here.', 'اجعل هذه البطاقة كبيرة أو عريضة لترى اللوحة هنا.', 'این کارت را بزرگ یا پهن کنید تا داشبورد این‌جا دیده شود.'],
    'w.rv.frame': ['{name}: shared dashboard', '{name}: لوحة مشتركة', '{name}: داشبورد اشتراکی'],
    'w.rv.settings': ['Open settings', 'افتح الإعدادات', 'باز کردن تنظیمات'],
    'w.rv.embed': ['Embed a dashboard', 'اعرض لوحة', 'نمایش داشبورد'],
  };
  const dict = i => Object.fromEntries(Object.entries(COPY).map(([k, v]) => ['overview.' + k, v[i] ?? v[0]]));
  MA.i18n.add({ en: dict(0), ar: dict(1), fa: dict(2) });
  const tri = k => ({ en: COPY[k][0], ar: COPY[k][1], fa: COPY[k][2] });

  /* =================== small helpers =================== */
  const pad2 = n => String(n).padStart(2, '0');
  const n2 = n => MA.num(n, { minimumIntegerDigits: 2, useGrouping: false });
  /** '09:00' → '09:00' / '۰۹:۰۰' following the digit preference. */
  const clockStr = v => { const [a, b] = String(v || '0:0').split(':').map(Number); return `${n2(a || 0)}:${n2(b || 0)}`; };
  const dfmt = (ds, o = { day: 'numeric', month: 'short' }) => MA.date(Date.parse(ds + 'T12:00:00Z'), { ...o, timeZone: 'UTC' });
  /** Site copy shown inside the admin: Arabic in an Arabic admin, English otherwise (the site has no Persian). */
  const siteLang = () => MA.lang() === 'ar' ? 'ar' : 'en';
  const firstName = n => { n = String(n || '').trim(); return !n || /^studio owner$/i.test(n) ? '' : n.split(/\s+/)[0]; };
  const meId = () => MA.team?.me?.()?.id || 'me';
  const KEY = () => 'overview.v1:' + meId();
  const NOTES = () => 'overview.notes.v1:' + meId();
  const modOk = id => { const m = MA.modules().find(x => x.id === id); return m && (!m.perm || MA.can(m.perm)) ? m : null; };
  const big = (txt, cls = '') => h('div', { class: ('ov-big num ' + cls).trim() }, txt);
  /** Bar labels are site copy (English in a Persian admin): let each pick its own direction. */
  const autoDir = (el, lang) => { el?.querySelectorAll?.('.b .truncate').forEach(x => { x.dir = 'auto'; if (lang) x.lang = lang; }); return el; };
  const emptyMini = o => { const e = MA.ui.empty({ ...o, compact: true }); e.classList.add('ov-empty'); return e; };
  let memo = new Map();
  /** Tiles showing their numbers as a table instead of a chart (this visit only). */
  const tables = new Set();
  const period = k => { if (!memo.has(k)) memo.set(k, MA.metrics.period(k)); return memo.get(k); };
  const noData = () => MA.metrics.source() === 'none';
  /** The analytics service that counts real visitors, when one is set up (from the Analytics page: MA.analytics). */
  const prov = () => MA.analytics?.provider?.() || null;
  const dashLink = (pv, cls = 'btn sm') => h('a', { class: cls + ' ov-dash', href: pv.url, target: '_blank', rel: 'noopener noreferrer', html: MA.icon('external', 'sm') + `<span>${esc(tt('openDash', { name: pv.name }))}</span>` });
  /** No visit data here. With a provider connected, say where real visitors are counted (and link there), never "connect analytics". */
  const noDataEmpty = () => { const pv = prov(); return pv ? emptyMini({ icon: 'chart', title: tt('noDataOnT', { name: pv.name }), text: tt('noDataOnX', { name: pv.name }), actions: [dashLink(pv)] }) : emptyMini({ icon: 'chart', title: tt('noDataT'), text: tt('noDataX') }); };
  /** Money in the admin language (Persian names the currency in words: ۱۵۰٬۰۰۰ ریال قطر). */
  const money = n => MA.analytics?.money ? MA.analytics.money(n) : MA.money(n);
  /** "▲ 12% vs 13 Aug – 11 Sep": the core's one grammar for change. */
  const deltaP = (cur, prev, label) => h('p.ov-cmp', MA.ui.delta(cur, prev, { label }));

  /* ---- studio clock: the same rules as the site (index.html tickClock) ---- */
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const mins = v => { const [a, b] = String(v || '0:0').split(':').map(Number); return (a || 0) * 60 + (b || 0); };
  const studio = () => MA.content.draft?.studio || {};
  const tz = () => { const z = studio().timezone || 'Asia/Qatar'; try { new Intl.DateTimeFormat('en', { timeZone: z }); return z; } catch (e) { return 'Asia/Qatar'; } };
  const clockAt = (zone = tz()) => {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(new Date()), g = k => p.find(x => x.type === k)?.value;
    return { h: +g('hour') % 24, m: +g('minute') || 0, wd: WD[g('weekday')] ?? 0 };
  };
  // 7 Jan 2024 was a Sunday, so weekday d is the 7th + d
  const dayName = (d, style = 'long') => MA.date(Date.UTC(2024, 0, 7 + d, 12), { weekday: style, timeZone: 'UTC' });
  const placeName = () => { const z = tz(); return z === 'Asia/Qatar' ? tt('lusail') : z.split('/').pop().replace(/_/g, ' '); };
  function studioState() {
    const st = studio(), days = Array.isArray(st.days) ? st.days.map(Number) : [], c0 = clockAt(), now = c0.h * 60 + c0.m;
    const o = mins(st.open || '09:00'), c = mins(st.close || '18:00'), isDay = d => days.includes(d);
    const base = { h: c0.h, m: c0.m, time: `${pad2(c0.h)}:${pad2(c0.m)}`, open: st.open || '09:00', close: st.close || '18:00', isOpen: false };
    if (!days.length) return { ...base, state: 'nohours' };
    if (isDay(c0.wd) && now >= o && now < c) return { ...base, state: 'open', isOpen: true, left: c - now };
    if (isDay(c0.wd) && now < o) return { ...base, state: 'today', left: o - now };
    let next = 1; while (next < 7 && !isDay((c0.wd + next) % 7)) next++;
    if (isDay(c0.wd) && isDay((c0.wd + 1) % 7)) return { ...base, state: 'tomorrow' };
    return { ...base, state: 'weekend', day: dayName((c0.wd + next) % 7) };
  }
  const statusText = s => s.state === 'nohours' ? tt('st.nohours') : tt('st.' + s.state, { open: clockStr(s.open), close: clockStr(s.close), day: s.day });
  function hoursSummary() {
    const st = studio(), days = [...new Set((st.days || []).map(Number))].filter(d => d >= 0 && d <= 6).sort((a, b) => a - b);
    if (!days.length) return tt('st.nohours');
    const groups = []; days.forEach(d => { const g = groups.at(-1); if (g && d === g[1] + 1) g[1] = d; else groups.push([d, d]); });
    const nm = d => dayName(d, 'short');
    return `${groups.map(([a, z]) => a === z ? nm(a) : `${nm(a)}–${nm(z)}`).join(tt('listSep'))} · ${clockStr(st.open || '09:00')}–${clockStr(st.close || '18:00')}`;
  }
  const dur = m => { const a = Math.floor(m / 60), b = m % 60; return a ? tt('dur.hm', { h: MA.num(a), m: MA.num(b) }) : tt('dur.m', { m: MA.num(b) }); };
  const daypart = () => { const x = clockAt().h; return x < 5 ? 'late' : x < 12 ? 'morning' : x < 17 ? 'afternoon' : x < 22 ? 'evening' : 'late'; };

  /** "▲ 12% vs 13 Aug – 11 Sep": every change names what it is compared with (MA.ui.delta, the same on every page). */
  const cmpLine = (cur, prev, R) => deltaP(cur, prev, `${dfmt(R.prev.from)} – ${dfmt(R.prev.to)}`);

  /* ---- leads ---- */
  const leadHref = l => '#/inbox/' + encodeURIComponent(l.id);
  // swell names are site copy, so they are joined the way the site language joins them
  const swellsOf = l => (l.waves || []).map(w => MA.leads.waveLabel(w, siteLang())).filter(Boolean).join(siteLang() === 'ar' ? '، ' : ', ');
  /** Relative time that keeps counting in days/weeks (MA.ago switches to a date after a week). */
  const since = d => {
    const s = (Date.now() - Date.parse(d)) / 1000;
    if (!isFinite(s)) return '';
    if (s < 3600) return MA.ago(d);
    const rtf = new Intl.RelativeTimeFormat(MA.locale(), { numeric: 'always', style: 'short' });
    if (s < 86400 * 2) return rtf.format(-Math.round(s / 3600), 'hour');
    return s < 86400 * 70 ? rtf.format(-Math.round(s / 86400), 'day') : rtf.format(-Math.round(s / 86400 / 7), 'week');
  };
  function leadRow(l, { stage = false } = {}) {
    const sw = swellsOf(l);
    return h('a.ov-row', { href: leadHref(l), dataset: { lead: l.id } },
      h('span', { class: 'ov-ud' + (l.read ? '' : ' on'), title: l.read ? null : tt('unread') }),
      // names and companies are what people typed: tag their language so screen readers switch voice
      h('span.ov-row-main', h('b.truncate', { lang: MA.langOf(l.name || l.email || ''), dir: 'auto' }, l.name || l.email || '—'), h('span.ov-sub.truncate', l.company ? h('span', { lang: MA.langOf(l.company), dir: 'auto' }, l.company) : '', sw ? h('span.ov-sw-in', { lang: siteLang() }, (l.company ? ' · ' : '') + sw) : null)),
      sw ? h('span.ov-col.ov-swcol.truncate', { lang: siteLang() }, sw) : null,
      h('span.ov-col.num', l.value ? money(l.value) : '—'),
      stage ? h('span.ov-col', MA.ui.badge(MA.L(MA.leads.stage(l.stage)), 'outline')) : null,
      h('time.ov-when', { datetime: l.at, title: MA.date(l.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }, since(l.at)));
  }
  const waitingList = () => {
    const now = Date.now();
    return MA.leads.all().filter(l => !l.archived && !MA.leads.stage(l.stage).closed && (!l.read || l.stage === 'new') && !l.lastContact
      && now - Date.parse(l.at) > DAY && !(l.snoozeUntil && Date.parse(l.snoozeUntil) > now)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  };

  /* ---- content: where a field lives ---- */
  const ROUTE_OF = { text: 'pages', ui: 'pages', make: 'pages', sections: 'pages', swells: 'services', services: 'services', sgroups: 'services', stages: 'process', steps: 'process', faq: 'faq', studio: 'settings', theme: 'brand', seo: 'seo', media: 'media' };
  function fieldLoc(path) {
    const p = String(path).split('/'), lang = p.includes('ar') ? 'ar' : p.includes('en') ? 'en' : null;
    const tpl = lang ? p.map(s => s === lang ? '{lang}' : s).join('/') : path;
    const route = ROUTE_OF[p[0]] || 'history';
    return { route: modOk(route) ? route : 'history', tpl, lang: lang || 'en' };
  }
  /** A readable name for a changed content path; list items get their own name (swell service, stage title, question number). */
  function pathLabel(path) {
    const p = String(path).split('/'), D = MA.content.draft || {}, cl = siteLang(), n = i => MA.num(+i + 1);
    const fname = f => COPY['f.' + f] ? tt('f.' + f) : f;
    const field = (i0) => { const isL = p[i0] === 'en' || p[i0] === 'ar', f = isL ? p[i0 + 1] : p[i0], j = isL ? p[i0 + 2] : p[i0 + 1]; return f == null ? '' : ` · ${fname(f)}${j != null && /^\d+$/.test(j) ? ' ' + n(j) : ''}`; };
    if (p[0] === 'faq' && p.length > 2) return tt('questionN', { n: n(p[1]) }) + field(2);
    if (p[0] === 'swells' && p.length > 2) { const it = D.swells?.[+p[1]]; return (MA.strip(it?.[cl]?.service || it?.en?.service || it?.id || '') || `${tt('area.swells')} ${n(p[1])}`) + field(2); }
    if (p[0] === 'services' && p.length > 2) { const it = D.services?.[+p[1]]; return (MA.strip(it?.[cl]?.name || it?.en?.name || it?.id || '') || tt('serviceN', { n: n(p[1]) })) + field(2); }
    if (p[0] === 'sgroups' && p.length > 3) { const g = D.sgroups?.[cl]?.[+p[2]] || D.sgroups?.en?.[+p[2]]; return (MA.strip(g?.name || '') || tt('sgroupN', { n: n(p[2]) })) + ` · ${fname(p[3])}`; }
    if (p[0] === 'stages' && p.length > 2) { const it = D.stages?.[+p[1]]; return (MA.strip(it?.[cl]?.title || it?.en?.title || '') || tt('stageN', { n: n(p[1]) })) + field(2); }
    if (p[0] === 'make' && p.length > 2) { const w = D.make?.[+p[1]]?.[+p[2]]; return `${tt('makeWord')} · ${MA.strip(w?.[cl] || w?.en || '') || n(p[2])}`; }
    if (p[0] === 'steps' && p.length > 2) return `${tt('stepLabel')} ${n(p[2])}`;
    return MA.content.label(path).replace(/ \((EN|AR)\)$/, '');
  }
  const fieldHref = loc => `#/${loc.route}?field=${encodeURIComponent(loc.tpl)}`;
  const goField = (loc, lang) => { MA.content.focusAfterRoute = { tpl: loc.tpl, lang: lang || loc.lang }; MA.go(fieldHref(loc)); };
  /** Fields whose Arabic is empty or still identical to the English. Values with nothing to translate (numbers, symbols) are skipped. */
  function missingArabic() {
    const D = MA.content.draft || {}, out = [], cl = siteLang(), areas = {}; let checked = 0, area = 'copy';
    const txt = v => MA.strip(v ?? '').replace(/\s+/g, ' ').trim();
    const check = (en, ar, route, tpl, label) => {
      if (typeof en !== 'string') return;
      const e = txt(en); if (!e || !/[A-Za-z]/.test(e.replace(/\{\w+\}/g, ''))) return;
      const A = areas[area] ||= { n: 0, miss: 0, first: null };
      checked++; A.n++;
      const a = txt(ar); if (!a || a === e) { const it = { route, tpl, label, reason: a ? 'same' : 'empty' }; out.push(it); A.miss++; A.first ||= it; }
    };
    for (const sect of ['text', 'ui']) { const en = D[sect]?.en || {}, ar = D[sect]?.ar || {}; for (const k of Object.keys(en)) check(en[k], ar[k], 'pages', `${sect}/{lang}/${k}`, MA.content.label(`${sect}/en/${k}`).replace(/ \((EN|AR)\)$/, '')); }
    const lists = [
      ['swells', 'services', (s, i) => MA.strip(s[cl]?.service || s.en?.service || s.id || '') || tt('questionN', { n: MA.num(i + 1) })],
      ['services', 'services', (s, i) => MA.strip(s[cl]?.name || s.en?.name || s.id || '') || tt('serviceN', { n: MA.num(i + 1) })],
      ['stages', 'process', (s, i) => MA.strip(s[cl]?.title || s.en?.title || '') || tt('stageN', { n: MA.num(i + 1) })],
      ['faq', 'faq', (s, i) => tt('questionN', { n: MA.num(i + 1) })],
    ];
    const fname = f => COPY['f.' + f] ? tt('f.' + f) : f;
    for (const [key, route, nameOf] of lists) (D[key] || []).forEach((item, i) => {
      area = key === 'stages' ? 'process' : key;
      if (!MA.isObj(item?.en)) return;
      const en = item?.en || {}, ar = item?.ar || {}, nm = nameOf(item, i);
      for (const [f, v] of Object.entries(en)) {
        if (Array.isArray(v)) v.forEach((x, j) => check(x, ar[f]?.[j], route, `${key}/${i}/{lang}/${f}/${j}`, `${nm} · ${fname(f)} ${MA.num(j + 1)}`));
        else check(v, ar[f], route, `${key}/${i}/{lang}/${f}`, `${nm} · ${fname(f)}`);
      }
    });
    area = 'services';
    (D.sgroups?.en || []).forEach((g, k) => { const nm = MA.strip(D.sgroups?.[cl]?.[k]?.name || g?.name || '') || tt('sgroupN', { n: MA.num(k + 1) });
      for (const f of Object.keys(g || {})) check(g[f], D.sgroups?.ar?.[k]?.[f], 'services', `sgroups/{lang}/${k}/${f}`, `${nm} · ${fname(f)}`); });
    area = 'make';
    (D.make || []).forEach((row, r) => (row || []).forEach((w, i) => check(w?.en, w?.ar, 'pages', `make/${r}/${i}/{lang}`, `${tt('makeWord')} · ${MA.strip(w?.[cl] || w?.en || '')}`)));
    area = 'process';
    (D.steps?.en || []).forEach((v, j) => check(v, D.steps?.ar?.[j], 'process', `steps/{lang}/${j}`, `${tt('stepLabel')} ${MA.num(j + 1)}`));
    const fix = x => x && ({ ...x, route: modOk(x.route) ? x.route : 'pages' });
    Object.values(areas).forEach(A => { A.first = fix(A.first); });
    return { items: out.map(fix), checked, areas };
  }

  /* =================== widget catalog =================== */
  const CATS = ['leads', 'traffic', 'content', 'studio', 'notes'];
  const SZ = { S: [1, 1], M: [2, 1], L: [2, 2], W: [4, 1] };
  const szMeta = z => `${MA.num(SZ[z][0])}×${MA.num(SZ[z][1])}`;
  /** Language-free size mark: the tile's footprint on the 4-column grid. */
  const szGlyph = z => { const [w, hh] = SZ[z]; let r = ''; for (let y = 0; y < 2; y++) for (let x = 0; x < 4; x++) r += `<rect x="${x * 5.6}" y="${y * 5.6}" width="4.4" height="4.4" rx="1"${x < w && y < hh ? ' class="on"' : ''}/>`; return `<svg class="ov-szg" viewBox="0 0 21.2 10" aria-hidden="true">${r}</svg>`; };
  // columns × rows reads left to right in every language
  const szMenuMeta = z => `${szGlyph(z)}<bdi class="num" dir="ltr">${esc(szMeta(z))}</bdi>`;
  const W = {}, ORDER = [];
  const widget = d => { W[d.id] = d; ORDER.push(d.id); };
  const RANGE_KEYS = ['7d', '30d', '90d', 'mtd'];
  const optRange = (def = '30d') => ({ key: 'range', def, label: () => tt('opt.range'), choices: () => RANGE_KEYS.map(v => ({ value: v, label: MA.L(MA.metrics.RANGES[v]) })) });
  const optRows = (def = 5, list = [3, 5, 8]) => ({ key: 'rows', def, label: () => tt('opt.rows'), choices: () => list.map(v => ({ value: v, label: tt('opt.nRows', { n: MA.num(v) }) })) });
  const settingsOf = t => { const s = {}; (W[t.w].opts || []).forEach(o => { const v = t.s?.[o.key], ok = o.choices().some(c => String(c.value) === String(v)); s[o.key] = ok ? (typeof o.def === 'number' ? +v : v) : o.def; }); return s; };
  const catalog = () => ORDER.map(id => W[id]).filter(d => !d.perm || MA.can(d.perm));
  const LIVE_MINS = 5;

  widget({ id: 'waiting', cat: 'leads', icon: 'inbox', perm: 'leads.view', sizes: ['W', 'L', 'M'], size: 'W', on: ['leads', 'content:change'], opts: [optRows(5)], link: 'inbox',
    title: { en: 'Waiting on us', ar: 'بانتظار ردّنا', fa: 'منتظر پاسخ ما' },
    desc: { en: 'Briefs with no reply for more than a day, oldest first.', ar: 'طلبات لم نردّ عليها منذ أكثر من يوم، الأقدم أولاً.', fa: 'درخواست‌هایی که بیش از یک روز بی‌پاسخ مانده‌اند، قدیمی‌ترین اول.' },
    render(b, x) {
      const all = waitingList(), list = all.slice(0, x.s.rows);
      if (!all.length) { b.append(emptyMini({ pose: 'ride', title: tt('w.waiting.emptyT'), text: tt('w.waiting.emptyX') })); return {}; }
      const rows = h('div.ov-rows', list.map(l => leadRow(l)));
      if (all.length > list.length) rows.append(h('a.ov-morelink', { href: '#/inbox' }, tt('andMore', { n: MA.num(all.length - list.length) })));
      b.append(rows);
      return { sample: list.some(l => l.sample), badge: [MA.num(all.length), 'warn'] };
    } });

  widget({ id: 'newest', cat: 'leads', icon: 'mail', perm: 'leads.view', sizes: ['M', 'L', 'S'], size: 'M', on: ['leads', 'content:change'], opts: [optRows(5)], link: 'inbox',
    title: { en: 'Newest briefs', ar: 'أحدث الطلبات', fa: 'تازه‌ترین درخواست‌ها' },
    desc: { en: 'The latest briefs from the site and everywhere else.', ar: 'آخر الطلبات من الموقع ومن أي مصدر آخر.', fa: 'آخرین درخواست‌ها از سایت و هر جای دیگر.' },
    render(b, x) {
      const all = MA.leads.all().filter(l => !l.archived).sort((a, c) => String(c.at).localeCompare(String(a.at)));
      const list = all.slice(0, x.size === 'S' ? Math.min(3, x.s.rows) : x.s.rows), unread = all.filter(l => !l.read).length;
      if (!list.length) { b.append(emptyMini({ pose: 'arrive', title: tt('w.newest.emptyT'), text: tt('w.newest.emptyX') })); return {}; }
      b.append(h('div.ov-rows', list.map(l => leadRow(l, { stage: true }))));
      return { sample: list.some(l => l.sample), badge: unread ? [tt('w.newest.unread', { n: MA.num(unread) }), 'accent'] : null };
    } });

  widget({ id: 'pipeline', cat: 'leads', icon: 'board', perm: 'leads.view', sizes: ['M', 'L', 'W'], size: 'M', on: ['leads'], link: 'inbox',
    opts: [{ key: 'measure', def: 'value', label: () => tt('opt.measure'), choices: () => [{ value: 'value', label: tt('opt.value') }, { value: 'count', label: tt('opt.count') }] }],
    title: { en: 'Pipeline', ar: 'مسار المشاريع', fa: 'مسیر پروژه‌ها' },
    desc: { en: 'Open briefs by stage, with their value in QAR.', ar: 'الطلبات المفتوحة حسب المرحلة، مع قيمتها بالريال.', fa: 'درخواست‌های باز به تفکیک مرحله، با ارزششان به ریال قطر.' },
    render(b, x) {
      const open = MA.leads.all().filter(l => !l.archived && !MA.leads.stage(l.stage).closed);
      if (!open.length) { b.append(emptyMini({ icon: 'board', title: tt('w.pipe.emptyT'), text: tt('w.pipe.emptyX') })); return {}; }
      const byV = x.s.measure !== 'count';
      const rows = MA.leads.STAGES.filter(s => !s.closed).map(s => { const ls = open.filter(l => l.stage === s.id); return { s, n: ls.length, v: ls.reduce((a, l) => a + (+l.value || 0), 0) }; });
      const totV = rows.reduce((a, r) => a + r.v, 0), m = r => byV ? r.v : r.n;
      const bar = h('div.ov-stack', { role: 'img', 'aria-label': rows.map(r => `${MA.L(r.s)}: ${byV ? money(r.v) : MA.num(r.n)}`).join(tt('listSep')) },
        rows.filter(r => m(r) > 0).map(r => h('i', { style: `flex-grow:${m(r)};background:${r.s.color}`, title: `${MA.L(r.s)} · ${byV ? money(r.v) : MA.num(r.n)}` })));
      const leg = h('div.ov-legrows', rows.map(r => h('div.ov-legrow', h('span.ov-sw', { style: `background:${r.s.color}` }), h('span.truncate', MA.L(r.s)), h('span.ov-legn.num', MA.num(r.n)), h('span.ov-legv.num', money(r.v)))));
      b.append(h('div.ov-headline', big(byV ? money(totV) : MA.num(open.length), 'sm'), h('span.ov-cap', byV ? tt('w.pipe.capV', { n: MA.num(open.length) }) : tt('w.pipe.capN'))), bar, leg);
      return { sample: open.some(l => l.sample) };
    } });

  widget({ id: 'won', cat: 'leads', icon: 'star', perm: 'leads.view', sizes: ['S', 'M'], size: 'S', on: ['leads'], link: 'inbox',
    title: { en: 'Won this month', ar: 'المُوقَّع هذا الشهر', fa: 'قراردادهای این ماه' },
    desc: { en: 'Projects signed since the 1st, compared with last month.', ar: 'المشاريع الموقّعة منذ بداية الشهر، مقارنةً بالشهر الماضي.', fa: 'پروژه‌هایی که از اول ماه قراردادشان بسته شده، در مقایسه با ماه گذشته.' },
    render(b, x) {
      // "this month" starts on day 1 of the chosen calendar's month (Gregorian, Solar Hijri or Hijri); the comparison is the same days of the month before
      const R = MA.metrics.range('mtd');
      const all = MA.leads.all(), won = (a, z) => all.filter(l => l.stage === 'won' && l.stageAt && (d => d >= a && d <= z)(MA.qDay(l.stageAt)));
      const cur = won(R.from, R.to), prev = won(R.prev.from, R.prev.to), sum = ls => ls.reduce((s, l) => s + (+l.value || 0), 0), cv = sum(cur), pv = sum(prev);
      const from = dfmt(R.from);
      b.append(big(money(cv)), h('p.ov-cap', !cur.length ? tt('w.won.zero', { date: from }) : cur.length === 1 ? tt('w.won.one', { date: from }) : tt('w.won.n', { n: MA.num(cur.length), date: from })));
      if (!cv && !pv) b.append(h('p.ov-cmp', tt('w.won.both0')));
      else { b.append(deltaP(cv, pv, R.prev.from === R.prev.to ? dfmt(R.prev.from) : `${dfmt(R.prev.from)} – ${dfmt(R.prev.to)}`)); if (x.size !== 'S') b.append(h('p.ov-cap', tt('w.won.prevV', { v: money(pv) }))); }
      if (x.size !== 'S' && cur.length) b.append(h('div.ov-rows.tight', cur.slice(0, 3).map(l => h('a.ov-row', { href: leadHref(l) }, h('span.ov-row-main', h('b.truncate', l.company || l.name)), h('span.num.small', l.value ? money(l.value) : '—')))));
      return { sample: all.some(l => l.sample) };
    } });

  /** Where briefs come from: site briefs split by first-touch channel (ref / utm_source), the rest by their Inbox source; or by utm campaign.
      Briefs received in the range, with open pipeline and won value (MA.analytics.attribution). */
  widget({ id: 'channels', cat: 'leads', icon: 'globe', perm: 'leads.view', sizes: ['M', 'L', 'W', 'S'], size: 'M', on: ['leads'], link: 'analytics',
    opts: [optRange('90d'), { key: 'by', def: 'sources', label: () => tt('opt.by'), choices: () => [{ value: 'sources', label: tt('opt.bySource') }, { value: 'campaigns', label: tt('opt.byCampaign') }] }],
    title: { en: 'Where briefs come from', ar: 'من أين تأتي الطلبات', fa: 'درخواست‌ها از کجا می‌آیند' },
    desc: { en: 'Briefs, open pipeline and won value by source or campaign.', ar: 'الطلبات وقيمة المفتوح والمُوقَّع حسب المصدر أو الحملة.', fa: 'درخواست‌ها، ارزش باز و ارزش قرارداد به تفکیک منبع یا کمپین.' },
    render(b, x) {
      const A = MA.analytics?.attribution?.(x.s.range, x.s.by);
      if (!A || !A.total) { b.append(emptyMini({ icon: 'globe', title: tt('w.ch.emptyT'), text: tt('w.ch.emptyX') })); return {}; }
      const max = x.size === 'S' ? 3 : x.size === 'L' ? 8 : 5, top = Math.max(1, ...A.rows.map(r => r.n));
      b.append(h('p.ov-cap', tt('w.ch.cap', { range: MA.L(MA.metrics.RANGES[x.s.range]) || A.R.label })),
        h('div.ov-chrows', { role: 'list' }, A.rows.slice(0, max).map(r => h('div.ov-chrow', { role: 'listitem' },
          h('span.ov-chname', h('bdi.truncate', { dir: x.s.by === 'campaigns' ? 'auto' : null }, r.label), h('i.ov-chbar', { style: `inline-size:${(r.n / top * 100).toFixed(1)}%`, 'aria-hidden': 'true' })),
          h('span.ov-chn.num', tt('w.ch.briefs', { n: MA.num(r.n) })),
          x.size === 'S' ? null : h('span.ov-chw.num', r.won ? tt('w.ch.won', { v: money(r.won) }) : '—')))));
      if (A.rows.length > max) b.append(h('a.ov-morelink', { href: '#/analytics?focus=attribution' }, tt('andMore', { n: MA.num(A.rows.length - max) })));
      if (x.s.by === 'campaigns' && !A.tagged && x.size !== 'S') b.append(h('p.ov-note', tt('w.ch.noUtm')));
      return { sample: A.sample };
    } });

  widget({ id: 'visitors', cat: 'traffic', icon: 'eye', perm: 'analytics.view', sizes: ['S', 'M'], size: 'S', on: ['metrics'], opts: [optRange('30d')], link: 'analytics',
    title: { en: 'Visitors', ar: 'الزوار', fa: 'بازدیدکنندگان' },
    desc: { en: 'Unique visitors, compared with the period before.', ar: 'الزوار الفريدون، مقارنةً بالفترة التي قبلها.', fa: 'بازدیدکنندگان یکتا، در مقایسه با دورهٔ قبل.' },
    render(b, x) {
      if (noData()) { b.append(noDataEmpty()); return {}; }
      const p = period(x.s.range);
      b.append(h('p.ov-cap', p.R.label), big(MA.num(p.cur.visitors)), cmpLine(p.cur.visitors, p.prev.visitors, p.R),
        h('div.ov-spark', { html: MA.chart.spark(p.rows.map(r => r.visitors), { color: 'var(--accent-text)', w: 240, h: 40 }) }));
      return { sample: MA.metrics.sampleOn() };
    } });

  widget({ id: 'visitorsChart', cat: 'traffic', icon: 'chart', perm: 'analytics.view', sizes: ['M', 'L', 'W'], size: 'L', on: ['metrics'], opts: [optRange('30d')], link: 'analytics', measure: true, fill: true,
    title: { en: 'Visitors over time', ar: 'الزوار عبر الوقت', fa: 'روند بازدیدکنندگان' },
    desc: { en: 'Daily visitors, with the previous period dashed.', ar: 'الزوار يومياً، والفترة السابقة بخط متقطّع.', fa: 'بازدیدکنندگان روزانه، با دورهٔ قبل به‌صورت خط‌چین.' },
    render(b, x) {
      if (noData()) { b.append(noDataEmpty()); return {}; }
      const p = period(x.s.range), col = 'var(--accent-text)', id = x.tile.id, asTable = !x.preview && tables.has(id);
      // every day's number without hovering: a Table toggle (the chart itself is named and described)
      const tbtn = x.preview ? null : h('button', { type: 'button', class: 'btn sm ghost ov-tbtn', 'aria-pressed': String(asTable), title: tt('tbl.tip'), dataset: { act: 'table' },
        onclick: () => { asTable ? tables.delete(id) : tables.add(id); x.repaint?.(); b.querySelector('[data-act=table]')?.focus({ preventScroll: true }); } }, MA.iconEl('list', 'sm'), h('span', tt('tbl.show')));
      b.append(h('div.ov-headline', big(MA.num(p.cur.visitors), 'sm'), cmpLine(p.cur.visitors, p.prev.visitors, p.R), tbtn));
      if (asTable) {
        const long = ds => dfmt(ds, { weekday: 'short', day: 'numeric', month: 'short' });
        b.append(h('div.ov-tblwrap', h('table.table.ov-table',
          h('thead', h('tr', h('th', { scope: 'col' }, tt('tbl.date')), h('th.num-col', { scope: 'col' }, p.R.label), h('th.num-col', { scope: 'col' }, `${tt('prevPeriod')} · ${dfmt(p.R.prev.from)} – ${dfmt(p.R.prev.to)}`))),
          h('tbody', p.rows.map((r, i) => h('tr', h('td', long(r.date)), h('td.num-col.num', MA.num(r.visitors)), h('td.num-col.num', p.prevRows[i] ? `${dfmt(p.prevRows[i].date)} · ${MA.num(p.prevRows[i].visitors)}` : '—')))))));
        return { sample: MA.metrics.sampleOn() };
      }
      const w = Math.max(240, Math.round(x.width || 480)), hh = x.size === 'L' ? MA.clamp(Math.round((x.height || 320) - 96), 150, 520) : x.size === 'W' ? 150 : 118;
      // Arabic-script month names are long: use day/month numbers there so the axis stays readable
      const lab = MA.isRTL() ? { day: 'numeric', month: 'numeric' } : undefined;
      let best = null; p.rows.forEach(r => { if (!best || r.visitors > best.visitors) best = r; });
      const desc = best ? tt('w.vc.desc', { total: MA.num(p.cur.visitors), day: dfmt(best.date, { weekday: 'long', day: 'numeric', month: 'long' }), v: MA.num(best.visitors) }) : '';
      b.append(MA.chart.lines([{ label: p.R.label, values: p.rows.map(r => r.visitors), color: col }, { label: tt('prevPeriod'), values: p.prevRows.map(r => r.visitors), color: 'var(--ink3)', dashed: true }],
        p.rows.map(r => dfmt(r.date, lab).replace(/[\u200e\u200f\u061c]/g, '')), { w, h: hh, xEvery: Math.ceil(p.rows.length / Math.max(2, Math.floor(w / 92))), yFmt: v => MA.compact(Math.round(v)),
          label: tt('w.vc.label', { range: p.R.label }), desc }));
      b.append(MA.chart.legend([{ label: p.R.label, color: col }, { label: `${tt('prevPeriod')} · ${dfmt(p.R.prev.from)} – ${dfmt(p.R.prev.to)}`, color: 'var(--ink3)' }]));
      return { sample: MA.metrics.sampleOn() };
    } });

  /** Real visitors: the analytics service that counts every visit, and its shared dashboard framed (Large or Wide) once a link is added. */
  widget({ id: 'realVisitors', cat: 'traffic', icon: 'globe', perm: 'analytics.view', sizes: ['W', 'L', 'M'], size: 'W', on: ['content:change', 'content:published', 'db:analytics.shareUrl'], link: 'analytics', fill: true,
    title: { en: 'Real visitors', ar: 'الزوار الحقيقيون', fa: 'بازدیدکنندگان واقعی' },
    desc: { en: 'Where every visitor is counted, with its shared dashboard once you add one.', ar: 'حيث يُحتسب كل زائر، مع لوحته المشتركة حين تضيفها.', fa: 'جایی که همهٔ بازدیدکنندگان شمرده می‌شوند، همراه با داشبورد اشتراکی‌اش وقتی اضافه کنید.' },
    render(b, x) {
      const pv = prov(), canSet = MA.can('settings.edit');
      if (!pv) {
        const acts = canSet && modOk('settings') ? [MA.ui.btn(tt('w.rv.settings'), { size: 'sm', icon: 'settings', onclick: () => { if (!x.preview) MA.go('#/settings'); } })] : [];
        b.append(emptyMini({ icon: 'globe', title: tt('w.rv.offT'), text: tt('w.rv.offX'), actions: acts }));
        return {};
      }
      const src = MA.analytics?.embedUrl?.() || '';
      if (src && !x.preview && x.size !== 'M') {
        b.classList.add('ov-embedbody');
        b.append(h('iframe.ov-embed', { sandbox: 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms', referrerpolicy: 'no-referrer', loading: 'lazy', title: tt('w.rv.frame', { name: pv.name }), src }));
        return { badge: [pv.name, 'good'] };
      }
      b.append(h('div.ov-ok', MA.ui.tideMark(pv.live ? 'live' : 'edited'), h('b', tt('noDataOnT', { name: pv.name }))),
        h('p.ov-cap', h('span', tt('w.rv.id') + ' '), h('code.ov-code', pv.id)));
      if (!pv.live) b.append(h('p.ov-cap', tt('w.rv.pending')));
      else if (!src) b.append(h('p.ov-cap', tt('w.rv.addShare')));
      else b.append(h('p.ov-cap', tt('w.rv.big')));
      const foot = h('div.ov-foot', dashLink(pv, 'btn sm primary'));
      if (!src && canSet && MA.analytics?.editShare && !x.preview) { const eb = MA.ui.btn(tt('w.rv.embed'), { size: 'sm', kind: 'ghost', icon: 'chart', onclick: () => MA.analytics.editShare() }); eb.dataset.act = 'embed'; foot.append(eb); }
      b.append(foot);
      return {};
    } });

  widget({ id: 'live', cat: 'traffic', icon: 'bolt', perm: 'analytics.view', sizes: ['S', 'M'], size: 'S', on: ['metrics'], link: 'analytics',
    title: { en: 'Live now', ar: 'الآن على الموقع', fa: 'هم‌اکنون روی سایت' },
    desc: { en: 'Who is on the site right now, and what they just did.', ar: 'من على الموقع الآن، وماذا فعل للتو.', fa: 'چه کسی همین حالا روی سایت است و چه کرد.' },
    render(b, x) {
      const L = MA.metrics.live(LIVE_MINS), n = L.sessions, feed = MA.metrics.feed(x.size === 'S' ? 2 : 5), m = MA.num(LIVE_MINS);
      b.append(h('div.ov-live', h('span', { class: 'ov-livedot' + (n ? ' on' : '') }), big(MA.num(n), 'sm'), h('span.ov-cap', n ? (n === 1 ? tt('w.live.one', { m }) : tt('w.live.n', { m })) : tt('w.live.zero', { m }))));
      if (feed.length) b.append(h('ul.ov-feed', { 'aria-label': tt('w.live.recent') }, feed.map(e => h('li', { class: e.sample ? 'is-sample' : '' }, h('span.truncate', MA.metrics.describe(e)), h('time.ov-when', { datetime: new Date(e.t).toISOString() }, MA.ago(e.t))))));
      b.append(h('p.ov-note', tt('w.live.note')));
      return { sample: feed.some(e => e.sample) };
    } });

  widget({ id: 'swells', cat: 'traffic', icon: 'swell', perm: 'analytics.view', sizes: ['M', 'L', 'S'], size: 'M', on: ['metrics', 'content:change'], opts: [optRange('30d')], link: 'analytics',
    title: { en: 'Swell taps', ar: 'النقرات على الموجات', fa: 'انتخاب موج‌ها' },
    desc: { en: 'Which swells visitors tap most.', ar: 'أيّ الموجات ينقر عليها الزوار أكثر.', fa: 'بازدیدکنندگان کدام موج‌ها را بیشتر انتخاب می‌کنند.' },
    render(b, x) {
      if (noData()) { b.append(noDataEmpty()); return {}; }
      const p = period(x.s.range), picks = p.cur.picks || {}, l = siteLang();
      const items = (MA.content.draft?.swells || []).map(s => ({ label: MA.strip(s[l]?.service || s.en?.service || s.id), value: picks[s.id] || 0 })).sort((a, c) => c.value - a.value);
      const total = items.reduce((a, i) => a + i.value, 0);
      if (!total) { b.append(emptyMini({ icon: 'swell', title: tt('w.swells.emptyT'), text: tt('w.swells.emptyX') })); return { sample: MA.metrics.sampleOn() }; }
      b.append(h('p.ov-cap', tt('w.swells.cap', { n: MA.num(total), range: p.R.label })), autoDir(MA.chart.barlist(items.slice(0, x.size === 'S' ? 3 : 6), { total }), siteLang()));
      return { sample: MA.metrics.sampleOn() };
    } });

  /** 'service' events (+ Add to brief on the site's Services list). Daily rows don't aggregate them yet, so real events are read
      through MA.metrics.live(); a future `services` total on the rows wins. Sample data has none. */
  function serviceAdds(p) {
    if (p.cur.services) return p.cur.services;
    const R = p.R, out = {};
    for (const e of MA.metrics.live(Math.ceil((Date.now() - Date.parse(R.from + 'T00:00:00+03:00')) / 6e4) + 1).events) {
      if (e?.e !== 'service' || !e.p?.on || !e.p.id) continue;
      const d = MA.qDay(e.t); if (d >= R.from && d <= R.to) out[e.p.id] = (out[e.p.id] || 0) + 1;
    }
    return out;
  }
  widget({ id: 'services', cat: 'traffic', icon: 'plus', perm: 'analytics.view', sizes: ['M', 'L', 'S'], size: 'M', on: ['metrics', 'content:change'], opts: [optRange('30d')], link: 'analytics',
    title: { en: 'Services added', ar: 'الخدمات المضافة', fa: 'خدمت‌های افزوده‌شده' },
    desc: { en: 'Which services visitors add to their brief.', ar: 'أيّ الخدمات يضيفها الزوار إلى طلباتهم.', fa: 'بازدیدکنندگان کدام خدمت‌ها را به درخواستشان می‌افزایند.' },
    render(b, x) {
      if (noData()) { b.append(noDataEmpty()); return {}; }
      const p = period(x.s.range), adds = serviceAdds(p), l = siteLang(), note = tt(MA.metrics.sampleOn() ? 'w.svc.note' : 'w.svc.noteLocal');
      const items = (MA.content.draft?.services || []).map(s => ({ label: MA.strip(s[l]?.name || s.en?.name || s.id), value: adds[s.id] || 0 })).filter(i => i.value).sort((a, c) => c.value - a.value);
      const total = items.reduce((a, i) => a + i.value, 0);
      if (!total) { b.append(emptyMini({ icon: 'plus', title: tt('w.svc.emptyT'), text: tt('w.svc.emptyX') }), h('p.ov-note', note)); return {}; }
      b.append(h('p.ov-cap', tt('w.svc.cap', { n: MA.num(total), range: p.R.label })), autoDir(MA.chart.barlist(items.slice(0, x.size === 'S' ? 3 : x.size === 'L' ? 10 : 5), { total }), siteLang()), h('p.ov-note', note));
      return {};
    } });

  const secName = id => MA.content.groupName ? MA.content.groupName(id) : MA.t('sec.' + id);
  /** One tide line per section; length = share of visitors who reached it. Lines are stacked, so they never cross. */
  function tideSvg(w, share, dashed) {
    const H = 12, mid = 6, len = Math.max(3, share * (w - 6)), n = Math.max(1, Math.round(len / 7)), step = len / n;
    let d = `M2 ${mid}`; for (let i = 0; i < n; i++) d += ` q${(step / 2).toFixed(2)} ${i % 2 ? 2.4 : -2.4} ${step.toFixed(2)} 0`;
    return `<svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" aria-hidden="true"><line class="ov-rtrack" x1="2" x2="${w - 2}" y1="${mid}" y2="${mid}"/><path class="ov-rwave${dashed ? ' dashed' : ''}" d="${d}"/><circle class="ov-rend" cx="${(2 + len).toFixed(1)}" cy="${mid}" r="2.4"/></svg>`;
  }
  widget({ id: 'reach', cat: 'traffic', icon: 'tide', perm: 'analytics.view', sizes: ['M', 'L', 'W'], size: 'M', on: ['metrics', 'content:change'], opts: [optRange('30d')], link: 'analytics', measure: true,
    title: { en: 'Section reach', ar: 'الوصول إلى الأقسام', fa: 'رسیدن به بخش‌ها' },
    desc: { en: 'How far down the page visitors get, one tide line per section.', ar: 'إلى أين يصل الزوار في الصفحة، بخط مدّ لكل قسم.', fa: 'بازدیدکنندگان تا کجای صفحه پیش می‌روند؛ برای هر بخش یک خط موج.' },
    render(b, x) {
      if (noData()) { b.append(noDataEmpty()); return {}; }
      const p = period(x.s.range), v = p.cur.visitors, on = MA.content.draft?.sections || {};
      if (!v) { b.append(noDataEmpty()); return {}; }
      // page order follows the site's layout; sections hidden on the site can't be reached, so they are named underneath instead of drawn
      const order = MA.metrics.sectionOrder(), ids = order.filter(id => on[id] !== false), off = order.filter(id => on[id] === false);
      const rows = ids.map(id => {
        const n = p.cur.sections?.[id] || 0, share = MA.clamp(n / v, 0, 1), hidden = on[id] === false, name = secName(id), line = h('span.ov-rline');
        const row = h('div', { class: 'ov-rrow' + (hidden ? ' is-hidden' : ''), role: 'listitem', title: `${name}: ${MA.num(n)} · ${MA.pct(share)}${hidden ? ' · ' + tt('w.reach.hidden') : ''}` },
          h('span.ov-rlab.truncate', name, hidden ? h('span.ov-hid', ' · ' + tt('w.reach.hidden')) : null), line, h('span.ov-rpct.num', MA.pct(share)));
        return { row, line, share, hidden };
      });
      b.append(h('p.ov-cap', tt('w.reach.cap', { range: p.R.label })), h('div.ov-reach', { role: 'list' }, rows.map(r => r.row)));
      if (off.length && x.size !== 'M') b.append(h('p.ov-note.ov-reach-off', tt('w.reach.hiddenNote', { list: off.map(secName).join(tt('listSep')) })));
      rows.forEach(r => { r.line.innerHTML = tideSvg(Math.max(40, Math.round(r.line.clientWidth || 200)), r.share, r.hidden); });
      return { sample: MA.metrics.sampleOn() };
    } });

  widget({ id: 'funnel', cat: 'traffic', icon: 'funnel', perm: 'analytics.view', sizes: ['M', 'L', 'W'], size: 'M', on: ['metrics', 'content:change'], opts: [optRange('30d')], link: 'analytics',
    title: { en: 'Funnel', ar: 'مسار التحويل', fa: 'قیف تبدیل' },
    desc: { en: 'From landing to the brief, and where people drop off.', ar: 'من الوصول إلى الطلب، وأين يتوقف الزوار.', fa: 'از ورود تا درخواست، و این‌که بازدیدکنندگان کجا می‌روند.' },
    render(b, x) {
      if (noData()) { b.append(noDataEmpty()); return {}; }
      const p = period(x.s.range), steps = MA.metrics.funnelSteps(p.cur);
      if (!steps[0].value) { b.append(noDataEmpty()); return {}; }
      b.append(h('p.ov-cap', p.R.label), MA.chart.funnel(steps));
      let worst = null; steps.forEach((s, i) => { const pv = i ? steps[i - 1].value : 0; if (!pv) return; const drop = 1 - s.value / pv; if (!worst || drop > worst.drop) worst = { i, drop }; });
      if (worst && worst.drop > 0) b.append(h('p.ov-note', tt('w.funnel.leak', { pct: MA.pct(worst.drop), from: steps[worst.i - 1].label, to: steps[worst.i].label })));
      return { sample: MA.metrics.sampleOn() };
    } });

  widget({ id: 'languages', cat: 'traffic', icon: 'language', perm: 'analytics.view', sizes: ['S', 'M'], size: 'S', on: ['metrics'], opts: [optRange('30d')], link: 'analytics',
    title: { en: 'Languages', ar: 'اللغات', fa: 'زبان‌ها' },
    desc: { en: 'How many visitors browse in English and in Arabic.', ar: 'كم زائراً يتصفّح بالإنجليزية وكم بالعربية.', fa: 'چند بازدیدکننده سایت را به انگلیسی و چند نفر به عربی می‌بینند.' },
    render(b, x) {
      if (noData()) { b.append(noDataEmpty()); return {}; }
      const p = period(x.s.range), en = p.cur.lang?.en || 0, ar = p.cur.lang?.ar || 0, tot = en + ar;
      if (!tot) { b.append(noDataEmpty()); return {}; }
      const C = { en: 'var(--accent-text)', ar: 'var(--flare)' };
      const ring = h('div.ov-ring', { role: 'img', 'aria-label': `${tt('w.lang.en')} ${MA.pct(en / tot)}${tt('listSep')}${tt('w.lang.ar')} ${MA.pct(ar / tot)}`, html: MA.chart.ring([{ label: tt('w.lang.en'), value: en, color: C.en }, { label: tt('w.lang.ar'), value: ar, color: C.ar }], { size: x.size === 'S' ? 88 : 112, thick: 11, center: MA.pct(ar / tot) }) });
      const leg = h('div.ov-lang-leg', [['en', en], ['ar', ar]].map(([k, v]) => h('div', h('span.ov-sw', { style: `background:${C[k]}` }), h('span.grow', tt('w.lang.' + k)), h('b.num', MA.pct(v / tot)), x.size === 'S' ? null : h('span.num.faint.small', MA.num(v)))));
      b.append(h('div.ov-lang', ring, leg), h('p.ov-note', tt('w.lang.cap', { range: p.R.label })));
      return { sample: MA.metrics.sampleOn() };
    } });

  widget({ id: 'clock', cat: 'studio', icon: 'clock', sizes: ['S', 'M'], size: 'S', on: ['content:change'],
    title: { en: 'Studio clock', ar: 'ساعة الاستوديو', fa: 'ساعت استودیو' },
    desc: { en: 'Lusail time, and whether the studio is open.', ar: 'التوقيت في لوسيل، وهل الاستوديو مفتوح.', fa: 'ساعت لوسیل، و این‌که استودیو باز است یا نه.' },
    extra: () => modOk('settings') && MA.can('settings.edit') ? [{ label: tt('w.clock.edit'), icon: 'clock', run: () => MA.go('#/settings') }] : [],
    render(b, x) {
      const s = studioState();
      b.append(h('div.ov-clock', h('time', { class: 'ov-big num', datetime: s.time }, clockStr(s.time)), h('span.ov-cap', placeName())),
        h('p.ov-st', h('span', { class: 'ov-pulse' + (s.isOpen ? ' on' : '') }), h('span', statusText(s))));
      if (x.size !== 'S' && s.left) b.append(h('p.ov-cmp', tt(s.isOpen ? 'w.clock.closesIn' : 'w.clock.opensIn', { d: dur(s.left) })));
      b.append(h('p.ov-note', hoursSummary()));
      return {};
    } });

  /** A draft that can't be saved (storage full): say so plainly, with the way out. Shown in Unpublished changes and Backups. */
  function notSaved(b) {
    if (!MA.content.saveError) return false;
    const free = MA.ui.btn(MA.t('save.free'), { size: 'sm', kind: 'primary', onclick: () => MA.storage?.free?.() }); free.dataset.act = 'free';
    b.append(h('div.ov-warn', { dataset: { state: 'notSaved' } }, MA.ui.tideMark('bad'), h('div.grow', h('b', MA.t('save.notSaved')), h('p.ov-cap', MA.t('save.full')), h('div.ov-foot', free))));
    return true;
  }
  widget({ id: 'changes', cat: 'content', icon: 'publish', sizes: ['S', 'M', 'L'], size: 'S', on: ['content:change', 'content:published', 'versions', 'content:saveError'], link: 'history',
    title: { en: 'Unpublished changes', ar: 'تعديلات غير منشورة', fa: 'تغییرات منتشرنشده' },
    desc: { en: 'Edits waiting to go live, and a way to publish them.', ar: 'تعديلات تنتظر النشر، مع زر لنشرها.', fa: 'ویرایش‌هایی که منتظر انتشارند، با دکمه‌ای برای انتشارشان.' },
    render(b, x) {
      const ch = MA.content.changes(), n = ch.length;
      if (!x.preview && notSaved(b)) return { badge: [MA.t('save.notSaved'), 'bad'] };
      if (!n) {
        const vs = MA.versions.list(), lastPub = vs.find(v => v.kind === 'publish'), meta = MA.content.publishedMeta;
        const at = lastPub?.at || meta?.at, by = lastPub?.by || meta?.by;
        b.append(h('div.ov-ok', MA.ui.tideMark('live'), h('b', tt('w.changes.none'))), h('p.ov-cap', at ? tt('w.changes.last', { ago: MA.ago(at), by: by || 'MIRAS' }) : tt('w.changes.never')));
        if (x.size !== 'S' && vs.length) b.append(h('div.ov-rows.tight', vs.slice(0, x.size === 'L' ? 6 : 2).map(v => h(modOk('history') ? 'a' : 'div', { class: 'ov-row', href: modOk('history') ? '#/history' : null },
          MA.ui.tideMark(v.kind === 'publish' ? 'live' : 'draft'), h('span.ov-row-main', h('span.truncate', v.note || tt('w.changes.kind.' + (v.kind === 'publish' ? 'publish' : 'checkpoint'))), h('span.ov-sub.truncate', v.by || '')), h('time.ov-when', { datetime: v.at }, since(v.at))))));
        return {};
      }
      b.append(h('div.ov-headline', big(MA.num(n), 'sm'), h('span.ov-cap', n === 1 ? tt('w.changes.one') : tt('w.changes.n'))));
      const max = x.size === 'S' ? 0 : x.size === 'L' ? 8 : 3;
      if (max) {
        const rows = h('div.ov-rows.tight', ch.slice(0, max).map(c => { const loc = fieldLoc(c.path), p = c.path.split('/'); return h('a.ov-row', { href: fieldHref(loc), onclick: e => { e.preventDefault(); goField(loc); } },
          MA.ui.tideMark('edited'), h('span.ov-row-main', h('span.truncate', pathLabel(c.path))), p.includes('ar') ? h('span.ov-lt', 'AR') : p.includes('en') ? h('span.ov-lt', 'EN') : null); }));
        if (n > max) rows.append(h('a.ov-morelink', { href: modOk('history') ? '#/history' : '#/overview' }, tt('andMore', { n: MA.num(n - max) })));
        b.append(rows);
      }
      const foot = h('div.ov-foot');
      if (MA.can('content.publish')) { const pb = MA.ui.btn(tt('w.changes.publish'), { icon: 'publish', kind: 'primary', size: 'sm', onclick: () => MA.openPublish() }); pb.dataset.act = 'publish'; foot.append(pb); }
      if (modOk('history') && x.size !== 'S') foot.append(MA.ui.btn(tt('w.changes.review'), { kind: 'ghost', size: 'sm', href: '#/history' }));
      if (foot.children.length) b.append(foot);
      return {};
    } });

  widget({ id: 'arabic', cat: 'content', icon: 'type', sizes: ['M', 'L', 'S'], size: 'M', on: ['content:change'], opts: [optRows(5)],
    title: { en: 'Missing Arabic', ar: 'نصوص عربية ناقصة', fa: 'عربیِ جاافتاده' },
    desc: { en: 'Fields where the Arabic is empty or still the English.', ar: 'حقول عربيتها فارغة أو ما زالت بالإنجليزية.', fa: 'فیلدهایی که عربی‌شان خالی است یا هنوز همان انگلیسی است.' },
    render(b, x) {
      const { items, checked, areas } = missingArabic(), n = items.length;
      // "AR 14/18" per area: a 2px line for how much of the Arabic is done; areas with gaps link to their first gap
      const coverage = () => h('div.ov-cov', { role: 'list', 'aria-label': tt('w.ar.covLabel') }, ['copy', 'swells', 'services', 'process', 'make', 'faq'].filter(a => areas[a]?.n).map(a => {
        const A = areas[a], done = A.n - A.miss, go = A.first;
        return h(go ? 'a' : 'div', { class: 'ov-covrow' + (A.miss ? ' is-miss' : ''), role: 'listitem', href: go ? fieldHref(go) : null, dataset: { area: a }, onclick: go ? e => { e.preventDefault(); goField(go, 'ar'); } : null },
          h('span.ov-covlab.truncate', tt('area.' + a)), h('span.ov-covbar', h('i', { style: `inline-size:${(done / A.n * 100).toFixed(1)}%` })), h('span.ov-covn.num', `${MA.num(done)}/${MA.num(A.n)}`));
      }));
      if (!n) {
        b.append(h('div.ov-ok', MA.iconEl('check', 'sm good'), h('b', tt('w.ar.noneT'))));
        if (x.size === 'S') b.append(h('p.ov-cap', tt('w.ar.noneX', { n: MA.num(checked) })));
        else b.append(coverage());
        return {};
      }
      b.append(h('div.ov-headline', big(MA.num(n), 'sm'), h('span.ov-cap', n === 1 ? tt('w.ar.capOne') : tt('w.ar.cap'))));
      if (x.size === 'S') { const f = MA.ui.btn(tt('w.ar.fix'), { size: 'sm', icon: 'edit', onclick: () => goField(items[0], 'ar') }); f.dataset.act = 'fix'; b.append(h('div.ov-foot', f)); }
      else {
        const max = x.preview ? 2 : x.s.rows;
        const rows = h('div.ov-rows.tight', items.slice(0, max).map(it => h('a.ov-row', { href: fieldHref(it), dataset: { tpl: it.tpl }, onclick: e => { e.preventDefault(); goField(it, 'ar'); } },
          h('span.ov-row-main', h('span.truncate', it.label)), MA.ui.badge(tt(it.reason === 'same' ? 'w.ar.same' : 'w.ar.empty'), it.reason === 'same' ? 'outline' : 'warn'))));
        if (n > max) rows.append(h('span.ov-morenote', tt('andMore', { n: MA.num(n - max) })));
        b.append(rows);
        if (x.size === 'L') b.append(coverage());
      }
      return { badge: [MA.num(n), 'warn'] };
    } });

  const actLabel = a => COPY['act.' + a] ? tt('act.' + a) : tt('act.other');
  widget({ id: 'activity', cat: 'studio', icon: 'history', sizes: ['M', 'L', 'S'], size: 'M', on: ['activity', 'team'], opts: [optRows(5, [4, 5, 8])], link: 'history',
    title: { en: 'Recent activity', ar: 'آخر النشاطات', fa: 'فعالیت‌های اخیر' },
    desc: { en: 'Edits, publishes and brief updates from the team.', ar: 'تعديلات الفريق وعمليات النشر وتحديثات الطلبات.', fa: 'ویرایش‌ها، انتشارها و به‌روزرسانی درخواست‌ها از سوی تیم.' },
    render(b, x) {
      const list = MA.activity.list().slice(0, x.size === 'S' ? 3 : x.s.rows);
      if (!list.length) { b.append(emptyMini({ icon: 'history', title: tt('w.act.emptyT'), text: tt('w.act.emptyX') })); return {}; }
      b.append(h('div.ov-rows', list.map(a => h(a.href ? 'a' : 'div', { class: 'ov-row', href: a.href || null },
        MA.ui.avatar(MA.team.get(a.byId) || { name: a.by }, 'sm'),
        h('span.ov-row-main', h('span.truncate', { html: `<b>${esc(a.by || 'MIRAS')}</b> ${esc(actLabel(a.action))}` }), a.target ? h('span.ov-sub.truncate', a.target) : null),
        h('time.ov-when', { datetime: a.at }, MA.ago(a.at))))));
      return {};
    } });

  widget({ id: 'team', cat: 'studio', icon: 'team', sizes: ['S', 'M'], size: 'S', on: ['team'], link: 'team',
    title: { en: 'Team', ar: 'الفريق', fa: 'تیم' },
    desc: { en: 'Who has access, and their roles.', ar: 'من لديه صلاحية الدخول، وأدوارهم.', fa: 'چه کسانی دسترسی دارند و نقششان چیست.' },
    render(b, x) {
      const all = MA.team.all(), inv = all.filter(m => m.status === 'invited').length, href = m => modOk('team') ? '#/team/' + encodeURIComponent(m.id) : null;
      if (x.size === 'S') {
        b.append(h('div.avatars.ov-avs', all.slice(0, 6).map(m => MA.ui.avatar(m))), h('p.ov-cap', tt('w.team.people', { n: MA.num(all.length) }) + (inv ? ' · ' + tt('w.team.nInvited', { n: MA.num(inv) }) : '')),
          h('div.ov-rows.tight', all.slice(0, 2).map(m => h(href(m) ? 'a' : 'div', { class: 'ov-row', href: href(m) }, h('span.ov-row-main', h('b.truncate', m.name), h('span.ov-sub', MA.t('role.' + m.role)))))));
      } else b.append(h('div.ov-rows.tight', all.map(m => h(href(m) ? 'a' : 'div', { class: 'ov-row', href: href(m) }, MA.ui.avatar(m, 'sm'),
        h('span.ov-row-main', h('b.truncate', m.name), h('span.ov-sub.truncate', m.title || '')),
        m.status === 'invited' ? MA.ui.badge(tt('w.team.invited'), 'outline') : MA.ui.badge(MA.t('role.' + m.role), m.role === 'owner' ? 'accent' : '')))));
      return { sample: all.some(m => m.sample) };
    } });

  /** Backups: when the last backup file was saved, and a button to make one (owner/admin). Warns when the draft can't be saved. */
  const backupNow = () => { const c = MA.commands.list().find(k => k.id === 'settings.export'); if (c && (!c.when || c.when())) c.run(); else MA.go('#/settings/data'); };
  widget({ id: 'backup', cat: 'studio', icon: 'download', perm: 'settings.edit', sizes: ['S', 'M'], size: 'S', on: ['backup', 'content:saveError', 'activity'],
    title: { en: 'Backups', ar: 'النسخ الاحتياطية', fa: 'نسخه‌های پشتیبان' },
    desc: { en: 'When you last saved a backup file, and a button to make one.', ar: 'متى حفظت آخر نسخة احتياطية، وزر لإنشاء واحدة.', fa: 'آخرین باری که فایل پشتیبان گرفتید، و دکمه‌ای برای گرفتن یکی.' },
    render(b, x) {
      if (!x.preview && notSaved(b)) return { badge: [MA.t('save.notSaved'), 'bad'] };
      const s = MA.backup?.status?.() || { at: null, days: null, due: false }, due = !!s.due;
      b.append(h('div', { class: 'ov-ok' + (due ? ' is-due' : '') }, due ? MA.iconEl('warn', 'sm warn') : s.days == null ? MA.iconEl('info', 'sm faint') : MA.iconEl('check', 'sm good'),
        h('b', s.days == null ? tt('w.bk.never') : tt('w.bk.last', { count: s.days, n: s.days }))));
      b.append(h('p.ov-cap', tt('w.bk.why')));
      if (s.persisted === true && x.size !== 'S') b.append(h('p.ov-note', tt('w.bk.kept')));
      const btn = MA.ui.btn(MA.t('bk.now'), { size: 'sm', icon: 'download', kind: due ? 'primary' : '', onclick: () => { if (!x.preview) backupNow(); } }); btn.dataset.act = 'backup';
      b.append(h('div.ov-foot', btn));
      return { badge: due ? [tt('w.bk.due'), 'warn'] : null };
    } });

  widget({ id: 'notes', cat: 'notes', icon: 'note', multi: true, sizes: ['S', 'M', 'L'], size: 'M', on: [],
    title: { en: 'Notes', ar: 'ملاحظات', fa: 'یادداشت‌ها' },
    desc: { en: 'A private scratchpad that stays on your board.', ar: 'مسودة خاصة تبقى على لوحتك.', fa: 'یادداشتی خصوصی که روی تابلوی شما می‌ماند.' },
    render(b, x) {
      const all = MA.db.get(NOTES(), {}), cur = all[x.tile.id] || {};
      const ta = h('textarea.ov-note-ta', { dir: 'auto', placeholder: tt('w.notes.ph'), 'aria-label': MA.L(this.title), spellcheck: 'true' });
      ta.value = cur.text || '';
      const stamp = h('p.ov-note', cur.at ? tt('savedAt', { t: MA.time(cur.at) }) : tt('w.notes.private'));
      if (!x.preview) ta.addEventListener('input', MA.debounce(() => {
        const store = MA.db.get(NOTES(), {}), at = new Date().toISOString(); store[x.tile.id] = { text: ta.value, at }; MA.db.set(NOTES(), store); stamp.textContent = tt('savedAt', { t: MA.time(at) });
      }, 400));
      b.append(ta, stamp);
      return {};
    } });

  widget({ id: 'quick', cat: 'studio', icon: 'command', sizes: ['M', 'S', 'W'], size: 'M', on: ['content:change', 'content:published'],
    title: { en: 'Quick actions', ar: 'إجراءات سريعة', fa: 'کارهای سریع' },
    desc: { en: 'Preview, publish, add a brief and more, one click away.', ar: 'المعاينة والنشر وإضافة طلب وغيرها، بنقرة واحدة.', fa: 'پیش‌نمایش، انتشار، افزودن درخواست و بیشتر، با یک کلیک.' },
    render(b, x) {
      const n = MA.content.changes().length, go = fn => () => { if (!x.preview) fn(); };
      const acts = [
        { id: 'preview', icon: 'eye', k: 'preview', kbd: 'P', run: () => MA.preview.open() },
        MA.can('content.publish') ? { id: 'publish', icon: 'publish', k: 'publish', count: n, run: () => MA.openPublish() } : null,
        MA.can('leads.edit') ? { id: 'brief', icon: 'plus', k: 'brief', run: () => addBrief() } : null,
        { id: 'site', icon: 'external', k: 'site', href: MA.site.url },
        { id: 'customize', icon: 'sliders', k: 'customize', run: () => MA.customize() },
        x.page ? { id: 'arrange', icon: 'grid', k: 'arrange', kbd: 'E', run: () => x.page.enterArrange() } : null,
      ].filter(Boolean);
      b.append(h('div.ov-qa', acts.map(a => {
        const inner = [MA.iconEl(a.icon, 'sm'), h('span.ov-qa-l.truncate', tt('qa.' + a.k)), h('span.ov-qa-s.truncate', tt('qa.' + a.k + 'S')), a.count ? h('span.ov-qn', MA.num(a.count)) : a.kbd ? h('kbd', a.kbd) : null];
        return a.href ? h('a', { href: a.href, target: '_blank', rel: 'noopener', dataset: { act: a.id }, title: tt('qa.' + a.k) }, inner) : h('button', { type: 'button', dataset: { act: a.id }, title: tt('qa.' + a.k), onclick: go(a.run) }, inner);
      })));
      return {};
    } });

  /* =================== presets =================== */
  const PRESETS = {
    // each number once: the sea band is the one "visitors today" summary and the header line is the one studio clock
    founder: { en: 'Founder', ar: 'المؤسس', fa: 'بنیان‌گذار', tiles: [['waiting', 'W'], ['pipeline', 'M'], ['won', 'S'], ['changes', 'S'], ['visitorsChart', 'L'], ['channels', 'M'], ['reach', 'M'], ['activity', 'M'], ['live', 'S'], ['backup', 'S']] },
    producer: { en: 'Producer', ar: 'المنتج', fa: 'تهیه‌کننده', tiles: [['changes', 'M'], ['clock', 'S'], ['quick', 'S'], ['arabic', 'L'], ['activity', 'M'], ['notes', 'M'], ['newest', 'M'], ['swells', 'M']] },
    content: { en: 'Content editor', ar: 'محرّر المحتوى', fa: 'ویراستار محتوا', tiles: [['changes', 'M'], ['arabic', 'M'], ['activity', 'L'], ['reach', 'M'], ['quick', 'M'], ['notes', 'M'], ['languages', 'S'], ['clock', 'S']] },
    sales: { en: 'Sales', ar: 'المبيعات', fa: 'فروش', tiles: [['waiting', 'W'], ['pipeline', 'M'], ['won', 'S'], ['live', 'S'], ['newest', 'L'], ['channels', 'M'], ['funnel', 'M'], ['swells', 'S'], ['services', 'M'], ['notes', 'M'], ['quick', 'M']] },
    blank: { en: 'Blank', ar: 'لوحة فارغة', fa: 'تابلوی خالی', tiles: [] },
  };
  const presetLayout = id => ({ v: 1, preset: id, tiles: PRESETS[id].tiles.map(([w, size]) => ({ id: w, w, size, s: {} })) });
  function loadLayout() {
    const raw = MA.db.get(KEY(), null);
    if (!raw || !Array.isArray(raw.tiles)) return presetLayout('founder');
    const seen = new Set();
    return { v: 1, preset: raw.preset || '', tiles: raw.tiles.filter(t => t && W[t.w] && t.id && !seen.has(t.id) && seen.add(t.id))
      .map(t => ({ id: String(t.id), w: t.w, size: W[t.w].sizes.includes(t.size) ? t.size : W[t.w].size, s: MA.isObj(t.s) ? t.s : {} })) };
  }

  /* =================== add a brief (quick action) =================== */
  function addBrief() {
    if (!MA.can('leads.edit')) return;
    const f = { name: h('input.input', { autocomplete: 'off', dir: 'auto' }), email: h('input.input', { type: 'email', dir: 'ltr', autocomplete: 'off' }), company: h('input.input', { autocomplete: 'off', dir: 'auto' }),
      value: h('input.input', { type: 'number', min: '0', step: '1000', dir: 'ltr' }), message: h('textarea.textarea', { rows: 3, dir: 'auto' }) };
    const src = MA.ui.select(MA.leads.SOURCES.filter(s => !['site', 'import'].includes(s.id)).map(s => ({ value: s.id, label: MA.L(s) })), 'manual', () => {}, { label: tt('brief.source') });
    const err = h('p.err.small', { hidden: true, role: 'alert' });
    const body = h('div.stack', h('div.grid.c2', MA.ui.field(tt('brief.name'), f.name), MA.ui.field(tt('brief.email'), f.email), MA.ui.field(tt('brief.company'), f.company), MA.ui.field(tt('brief.value'), f.value)),
      MA.ui.field(tt('brief.source'), src), MA.ui.field(tt('brief.message'), f.message), err);
    MA.ui.modal({ title: tt('brief.title'), body, actions: [{ label: MA.t('cancel'), kind: 'ghost' }, { label: tt('brief.add'), kind: 'primary', run: () => {
      const name = f.name.value.trim(), email = f.email.value.trim();
      const fail = (msg, el) => { err.hidden = false; err.textContent = msg; el.focus(); return false; };
      if (!name && !email) return fail(tt('brief.need'), f.name);
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(tt('brief.badEmail'), f.email);
      const l = MA.leads.add({ name, email, company: f.company.value.trim(), message: f.message.value.trim(), value: +f.value.value || null, source: src.value, read: true });
      MA.activity.log({ action: 'lead.add', target: name || email, module: 'inbox', href: leadHref(l) });
      MA.toast(tt('brief.added', { name: esc(name || email) }), modOk('inbox') ? { action: { label: MA.t('open'), run: () => MA.go(leadHref(l)) } } : {});
    } }] });
  }

  /* =================== sea state =================== */
  const SEA_WEEKS = 4;
  function seaState() {
    const M = MA.metrics, src = M.source(), today = MA.qDay(Date.now()), wd = new Date(today + 'T12:00:00Z').getUTCDay(), day = dayName(wd);
    if (src === 'none') return { kind: 'none', rough: .05, day };
    const t0 = Date.parse(today + 'T12:00:00Z');
    const todayRow = M.days(today, today)[0], past = M.days(MA.qDay(t0 - SEA_WEEKS * 7 * DAY), MA.qDay(t0 - DAY)).filter(r => new Date(r.date + 'T12:00:00Z').getUTCDay() === wd);
    const q = clockAt('Asia/Qatar'), frac = Math.max(.04, (q.h + q.m / 60) / 24);
    // Sample days are generated linearly through the day, so they compare linearly. Real events compare against the hourly profile of past weeks.
    let share = frac;
    if (src === 'local') { let tot = 0, by = 0; past.forEach(r => (r.hours || []).forEach((v, hr) => { tot += v; if (hr < q.h) by += v; else if (hr === q.h) by += v * q.m / 60; })); if (tot > 0) share = by / tot; }
    const avg = past.length ? past.reduce((a, r) => a + r.visitors, 0) / past.length : 0, so = todayRow?.visitors || 0, exp = avg * share, sample = M.sampleOn();
    if (!avg) return { kind: 'nobase', so, rough: so ? .26 : .07, day, sample };
    if (exp < 5 && so < 5) return { kind: 'early', so, exp, avg, rough: .14, day, sample, word: 'calm' };
    const ratio = so / Math.max(exp, .5), rough = MA.clamp(.14 + (ratio - .5) * .44, .08, .92);
    const word = ratio < .6 ? 'glassy' : ratio < .85 ? 'calm' : ratio < 1.15 ? 'steady' : ratio < 1.5 ? 'lively' : 'choppy';
    return { kind: ratio >= 1.1 ? 'busier' : ratio <= .9 ? 'quieter' : 'usual', so, exp, avg, ratio, rough, word, day, sample, pct: Math.abs(ratio - 1) };
  }
  function seaSentence(s) {
    const n = `<b class="num">${MA.num(s.so)}</b>`, day = esc(s.day), w = MA.num(SEA_WEEKS);
    if (s.kind === 'none') { const pv = prov(); return esc(pv ? tt('sea.noneOn', { name: pv.name }) : tt('sea.none')); }
    if (s.kind === 'nobase') return tt('sea.nobase', { n, w });
    if (s.kind === 'early') return tt('sea.early', { n, day, exp: MA.num(Math.max(1, Math.round(s.exp))) });
    if (s.kind === 'busier' || s.kind === 'quieter') return tt('sea.' + s.kind, { n, day, pct: `<b class="num">${MA.pct(s.pct)}</b>` });
    return tt('sea.usual', { n, day });
  }

  /* =================== the page =================== */
  let page = null, pending = null;
  const PH_SVG = '<svg viewBox="0 0 120 22" aria-hidden="true"><path d="M2 8c10-6 19 6 29 0s19-6 29 0 19 6 29 0 19-6 29 0"/><path d="M2 15c10-6 19 6 29 0s19-6 29 0 19 6 29 0 19-6 29 0"/></svg>';

  function mount(view, ctx) {
    const P = { layout: loadLayout(), me: meId(), arranging: false, snap: null, lift: null, drag: null, pend: null, drawer: null, part: daypart() };
    let alive = true, presetBtn = null, arrangeBtn = null, statusEl = null;
    const root = h('div.m-overview.ov-page');
    const head = h('header.ov-head');
    const sea = h('section.ov-sea', { 'aria-label': tt('sea.label') });
    const board = h('div.ov-board', { role: 'list', 'aria-label': tt('boardLabel') });
    const bar = h('div.bulkbar.ov-bar', { hidden: true });
    const live = h('div.sr-only', { role: 'status', 'aria-live': 'assertive' });
    const help = h('p.sr-only', { id: 'ovArrangeHelp' }, tt('a11y.help'));
    root.append(head, sea, h('div.ov-boardwrap', board), bar, live, help);
    view.append(root);
    const announce = msg => { live.textContent = msg; };
    const tileEls = () => [...board.querySelectorAll(':scope > .ov-tile')];
    const tileOf = id => tileEls().find(e => e.dataset.id === id);
    const nameOf = el => MA.L(W[el.dataset.w]?.title);
    const posMsg = (key, el, pos, n, extra = {}) => tt(key, { name: nameOf(el), pos: MA.num(pos), n: MA.num(n), ...extra });
    const save = () => { if (!P.arranging) MA.db.set(KEY(), P.layout); };
    const visible = () => P.layout.tiles.filter(t => W[t.w] && (!W[t.w].perm || MA.can(W[t.w].perm)));

    /* ---------- header ---------- */
    function drawHead() {
      const me = MA.team.me(), first = firstName(me?.name), g = tt('greet.' + daypart());
      const date = MA.date(Date.now(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz() });
      statusEl = h('p.ov-status', { 'aria-live': 'off' });
      presetBtn = MA.ui.btn(tt('layout'), { icon: 'layers', kind: 'ghost', onclick: e => presetMenu(e.currentTarget) });
      presetBtn.append(MA.iconEl('chevDown', 'sm')); presetBtn.setAttribute('aria-haspopup', 'menu'); presetBtn.dataset.act = 'presets';
      const addBtn = MA.ui.btn(tt('addWidget'), { icon: 'plus', onclick: () => openAdd() }); addBtn.dataset.act = 'add';
      arrangeBtn = MA.ui.btn(tt('arrange'), { icon: 'grid', onclick: () => enterArrange() }); arrangeBtn.dataset.act = 'arrange'; arrangeBtn.append(h('kbd', 'E')); arrangeBtn.hidden = P.arranging;
      head.innerHTML = '';
      head.append(h('div.ov-hello', h('p.label.ov-eyebrow', `${date} · ${placeName()}`),
        h('h1.h1', { html: first ? tt('greetName', { g: esc(g), name: `<em>${esc(first)}</em>` }) : tt('greetBare', { g: esc(g) }) }), statusEl),
        h('div.ov-actions', presetBtn, addBtn, arrangeBtn));
      drawStatus();
    }
    function drawStatus() {
      if (!statusEl) return;
      // the clock shows once: a Studio clock tile on the board takes over from this line
      const clockTile = P.layout.tiles.some(t => t.w === 'clock');
      statusEl.hidden = clockTile;
      if (clockTile) { statusEl.innerHTML = ''; return; }
      const s = studioState();
      statusEl.innerHTML = '';
      statusEl.append(h('span', { class: 'ov-pulse' + (s.isOpen ? ' on' : '') }), h('span', statusText(s)), h('span.ov-dim', { 'aria-hidden': 'true' }, '·'), h('span', h('time.ov-now', { datetime: s.time }, clockStr(s.time)), ' ', tt('st.in', { place: placeName() })));
    }

    /* ---------- sea band ---------- */
    const S = { eye: h('p.ov-sea-eye'), sent: h('p.ov-sea-sent'), basis: h('p.ov-sea-basis'), stats: h('dl.ov-sea-stats'), cv: h('canvas.ov-sea-cv', { 'aria-hidden': 'true' }) };
    sea.append(h('div.ov-sea-text', S.eye, S.sent, S.basis), S.stats, S.cv);
    let seaApi = null;
    function drawSea() {
      if (!MA.can('analytics.view')) { sea.hidden = true; return; }
      const s = seaState(); sea.hidden = false; sea.dataset.kind = s.kind;
      S.eye.innerHTML = ''; S.eye.append(...[h('span.label', tt('sea.label')), s.word ? h('b.ov-sea-word', tt('sea.' + s.word)) : null, s.sample ? MA.ui.sample() : null].filter(Boolean));
      S.sent.innerHTML = seaSentence(s);
      S.basis.textContent = s.kind === 'none' || s.kind === 'nobase' ? '' : tt('sea.basis', { w: MA.num(SEA_WEEKS) });
      S.stats.innerHTML = '';
      const stat = (k, v) => S.stats.append(h('div', h('dt', k), h('dd.num', v)));
      if (s.kind !== 'none') { stat(tt('sea.sofar'), MA.num(s.so)); if (s.avg) { stat(tt('sea.usualNow'), MA.num(Math.round(s.exp))); stat(tt('sea.usualDay', { day: s.day }), MA.num(Math.round(s.avg))); } }
      if (!seaApi) seaApi = MA.sea(S.cv, { lines: 11, rough: s.rough, alpha: .62, width: 1.1, calm: .95, speed: .7 }); else seaApi.set(s.rough);
      try { MA.siteSea?.set(MA.clamp(s.rough * .9, .08, .8)); } catch (e) {}
    }

    /* ---------- tiles ---------- */
    function tileEl(t, i) {
      const d = W[t.w], title = MA.L(d.title), badges = h('span.ov-badges');
      const more = MA.ui.iconBtn('more', { tip: tt('more'), size: 'sm', onclick: e => moreMenu(e.currentTarget, el) });
      more.classList.add('ov-ctrl-n'); more.dataset.act = 'more'; more.setAttribute('aria-haspopup', 'menu');
      const sizeBtn = d.sizes.length > 1 ? h('button.ov-sizebtn', { type: 'button', 'aria-label': `${tt('resize')}: ${tt('size' + t.size)}`, 'aria-haspopup': 'menu', title: tt('resize'), dataset: { act: 'size' }, onclick: e => sizeMenu(e.currentTarget, el) }, h('span.ov-sizeg', { html: szGlyph(t.size) }), MA.iconEl('chevDown', 'sm')) : null;
      const rm = MA.ui.iconBtn('close', { tip: tt('removeTile'), size: 'sm', onclick: () => removeTile(t.id) }); rm.dataset.act = 'remove';
      const body = h('div.ov-tb');
      const card = h('div.ov-card', { style: `--i:${i}` },
        h('header.ov-th', h('span.ov-grip', { html: MA.icon('drag', 'sm'), title: tt('drag'), 'aria-hidden': 'true' }), h('h2.ov-tt.truncate', title), badges, h('div.ov-ctrls', more, h('div.ov-ctrl-a', sizeBtn, rm))), body);
      const el = h('article.ov-tile', { role: 'listitem', tabindex: P.arranging ? '0' : '-1', 'aria-label': title, dataset: { id: t.id, w: t.w, size: t.size } }, card);
      el._t = t; el._body = body; el._badges = badges; el._sizeBtn = sizeBtn;
      return el;
    }
    function paint(el) { paintBody(el._body, el._t, { badges: el._badges, api }); el._w = el._body.clientWidth; }
    function drawBoard() {
      memo = new Map(); board.innerHTML = '';
      const vis = visible();
      if (!vis.length) { board.append(blankState()); labelTiles(); return; }
      vis.forEach((t, i) => board.append(tileEl(t, i)));
      const els = tileEls();
      const rank = e => W[e._t.w].fill ? 2 : W[e._t.w].measure ? 1 : 0;
      [0, 1, 2].forEach(r => els.filter(e => rank(e) === r).forEach(paint));
      labelTiles();
    }
    function blankState() {
      const add = MA.ui.btn(tt('addWidget'), { icon: 'plus', kind: 'primary', onclick: () => openAdd() }); add.dataset.act = 'blank-add';
      return h('div.ov-blank', { role: 'listitem' }, MA.ui.empty({ title: tt('blankT'), text: tt('blankX'), pose: 'present', actions: [add, MA.ui.btn(tt('useFounder'), { kind: 'ghost', onclick: () => applyPreset('founder') })] }));
    }
    function labelTiles() {
      const els = tileEls(), n = els.length;
      els.forEach((el, i) => {
        el.tabIndex = P.arranging ? 0 : -1;
        el.style.setProperty('--i', i);
        if (P.arranging) { el.setAttribute('aria-roledescription', tt('a11y.tile')); el.setAttribute('aria-label', posMsg('a11y.pos', el, i + 1, n)); el.setAttribute('aria-describedby', 'ovArrangeHelp'); }
        else { el.removeAttribute('aria-roledescription'); el.removeAttribute('aria-describedby'); el.setAttribute('aria-label', nameOf(el)); }
      });
      drawStatus();
    }
    /** DOM order (after a drag or a keyboard move) → layout order. Tiles hidden by permissions keep their place at the end. */
    function syncOrder() {
      const ids = tileEls().map(e => e.dataset.id), rest = P.layout.tiles.filter(t => !ids.includes(t.id));
      P.layout.tiles = [...ids.map(id => P.layout.tiles.find(t => t.id === id)).filter(Boolean), ...rest];
    }
    /** FLIP: measure, mutate, then animate every tile from where it was to where it now is. */
    function flip(mutate) {
      const els = [...board.children].filter(e => (e.classList.contains('ov-tile') && !e.classList.contains('ov-dragging')) || e.classList.contains('ov-ph'));
      if (MA.reducedMotion()) { mutate(); return; }
      const first = new Map(els.map(e => [e, e.getBoundingClientRect()]));
      mutate();
      const moved = [];
      els.forEach(e => { if (e.isConnected) { e.style.transition = 'none'; e.style.transform = ''; } });
      els.forEach(e => {
        if (!e.isConnected) return;
        const a = first.get(e), b = e.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) { e.style.transition = ''; return; }
        e.style.transform = `translate(${dx}px,${dy}px)`; moved.push(e);
      });
      if (!moved.length) return;
      board.getBoundingClientRect();
      moved.forEach(e => {
        e.style.transition = 'transform .26s var(--ease)'; e.style.transform = '';
        const done = ev => { if (ev && ev.propertyName !== 'transform') return; e.style.transition = ''; e.removeEventListener('transitionend', done); };
        e.addEventListener('transitionend', done); setTimeout(done, 400);
      });
    }

    /* ---------- tile actions ---------- */
    function moreMenu(anchor, el) {
      const t = el._t, d = W[t.w], s = settingsOf(t), items = [];
      (d.opts || []).forEach(o => { items.push({ heading: o.label() }); o.choices().forEach(c => items.push({ label: c.label, checked: String(s[o.key]) === String(c.value), run: () => setOpt(el, o.key, c.value) })); });
      if (d.sizes.length > 1) { items.push({ heading: tt('size') }); d.sizes.forEach(z => items.push({ label: tt('size' + z), meta: szMenuMeta(z), checked: t.size === z, run: () => setSize(el, z) })); }
      const mod = d.link && modOk(d.link), extra = d.extra?.() || [];
      if (mod || extra.length) items.push('-');
      if (mod) items.push({ label: tt('openMod', { name: MA.L(mod.title) }), icon: mod.icon, run: () => MA.go('#/' + mod.id) });
      items.push(...extra, '-', { label: tt('removeTile'), icon: 'trash', danger: true, run: () => removeTile(t.id) });
      MA.ui.menu(anchor, items, { align: 'end' });
    }
    function sizeMenu(anchor, el) {
      const t = el._t;
      MA.ui.menu(anchor, [{ heading: tt('size') }, ...W[t.w].sizes.map(z => ({ label: tt('size' + z), meta: szMenuMeta(z), checked: t.size === z, run: () => setSize(el, z) }))], { align: 'end' });
    }
    function setSize(el, z) {
      const t = el._t; if (t.size === z || !W[t.w].sizes.includes(z)) return;
      flip(() => { t.size = z; el.dataset.size = z; if (el._sizeBtn) { el._sizeBtn.firstChild.innerHTML = szGlyph(z); el._sizeBtn.setAttribute('aria-label', `${tt('resize')}: ${tt('size' + z)}`); } paint(el); });
      save(); announce(tt('a11y.sized', { name: nameOf(el), size: tt('size' + z) }));
    }
    function setOpt(el, key, v) { el._t.s = { ...(el._t.s || {}), [key]: v }; memo = new Map(); paint(el); save(); }
    function removeTile(id) {
      const i = P.layout.tiles.findIndex(t => t.id === id); if (i < 0) return;
      const [t] = P.layout.tiles.splice(i, 1), name = MA.L(W[t.w].title), el = tileOf(id), idx = tileEls().indexOf(el);
      if (el) flip(() => el.remove());
      if (!tileEls().length) drawBoard();
      save(); labelTiles(); announce(tt('a11y.removed', { name }));
      if (P.arranging) (tileEls()[idx] || tileEls()[idx - 1])?.focus({ preventScroll: true });
      MA.toast(tt('removed', { name: esc(name) }), { undo: () => {
        if (!alive) { const L = loadLayout(); if (!L.tiles.some(x => x.id === t.id)) { L.tiles.splice(Math.min(i, L.tiles.length), 0, t); MA.db.set(KEY(), L); } return; }
        if (P.layout.tiles.some(x => x.id === t.id)) return;
        P.layout.tiles.splice(Math.min(i, P.layout.tiles.length), 0, t); save(); drawBoard(); showMe(t.id, { quiet: true });
      } });
    }
    function addWidget(wid) {
      const d = W[wid]; if (!d || (d.perm && !MA.can(d.perm))) return null;
      const t = { id: P.layout.tiles.some(x => x.id === wid) ? MA.uid('t-') : wid, w: wid, size: d.size, s: {} };
      P.layout.tiles.push(t); save();
      if (!tileEls().length) drawBoard();
      else { const el = tileEl(t, tileEls().length); flip(() => { board.append(el); paint(el); }); labelTiles(); }
      announce(tt('added', { name: MA.L(d.title) }));
      MA.toast(tt('added', { name: esc(MA.L(d.title)) }), { undo: () => {
        if (!alive) { const L = loadLayout(); L.tiles = L.tiles.filter(x => x.id !== t.id); MA.db.set(KEY(), L); return; }
        P.layout.tiles = P.layout.tiles.filter(x => x.id !== t.id); save();
        const el = tileOf(t.id); if (el) flip(() => el.remove()); if (!tileEls().length) drawBoard(); labelTiles(); P.drawer?.redraw?.();
      } });
      return t;
    }
    function showMe(key, { quiet } = {}) {
      const el = tileOf(key) || tileEls().find(e => e.dataset.w === key); if (!el) return false;
      if (P.drawer) P.drawer.close(true);
      el.scrollIntoView({ block: 'center', behavior: MA.reducedMotion() || quiet ? 'auto' : 'smooth' });
      el.classList.remove('ov-flash'); void el.offsetWidth; el.classList.add('ov-flash'); setTimeout(() => el.classList.remove('ov-flash'), 1700);
      el.focus({ preventScroll: true });
      return true;
    }
    function applyPreset(id) {
      if (!PRESETS[id]) return;
      const prev = MA.clone(P.layout), keepNotes = P.layout.tiles.filter(t => t.w === 'notes');
      P.layout = presetLayout(id);
      // a note tile in the preset keeps the text of the first note you already had
      const pn = P.layout.tiles.find(t => t.w === 'notes'); if (pn && keepNotes[0]) pn.id = keepNotes[0].id;
      save(); drawBoard(); setChrome();
      const name = MA.L(PRESETS[id]);
      announce(tt('presetApplied', { name }));
      MA.toast(tt('presetApplied', { name: esc(name) }), { undo: () => { if (!alive) { MA.db.set(KEY(), prev); return; } P.layout = prev; save(); drawBoard(); setChrome(); } });
    }
    function presetMenu(anchor) {
      anchor = anchor && anchor.isConnected ? anchor : presetBtn;
      const sig = JSON.stringify(P.layout.tiles.map(t => [t.w, t.size]));
      MA.ui.menu(anchor, [{ heading: tt('presetsHead') }, ...Object.entries(PRESETS).map(([id, p]) => ({
        label: MA.L(p), meta: esc(p.tiles.length ? tt('nWidgets', { n: MA.num(p.tiles.length) }) : tt('startEmpty')), checked: sig === JSON.stringify(p.tiles), run: () => applyPreset(id) }))], { align: 'end' });
    }

    /* ---------- arrange mode ---------- */
    function setChrome() {
      root.classList.toggle('is-arranging', P.arranging);
      root.classList.toggle('bob', P.arranging && !MA.reducedMotion());
      if (arrangeBtn) arrangeBtn.hidden = P.arranging;
      bar.hidden = !P.arranging; bar.innerHTML = '';
      if (P.arranging) {
        const cancel = MA.ui.btn(MA.t('cancel'), { size: 'sm', onclick: () => exitArrange(false) }); cancel.dataset.act = 'cancel'; cancel.append(h('kbd', 'Esc'));
        const done = MA.ui.btn(MA.t('done'), { size: 'sm', icon: 'check', onclick: () => exitArrange(true) }); done.classList.add('ov-done'); done.dataset.act = 'done';
        bar.append(h('span.ov-bar-t', MA.iconEl('grid', 'sm'), h('b', tt('barTitle')), h('span.ov-bar-hint', tt('barText'))), cancel, done);
      }
      labelTiles();
    }
    function enterArrange() {
      if (!alive || P.arranging) return;
      if (P.drawer) P.drawer.close(true);
      P.arranging = true; P.snap = MA.clone(P.layout);
      setChrome(); announce(tt('a11y.on'));
      tileEls()[0]?.focus({ preventScroll: true });
    }
    function exitArrange(keep) {
      if (!P.arranging) return;
      if (P.drag) endDrag(keep);
      if (P.lift) keep ? drop() : cancelLift();
      const changed = !MA.eq(P.snap, P.layout);
      P.arranging = false;
      if (!keep) { P.layout = P.snap; if (changed) drawBoard(); }
      P.snap = null;
      if (keep) save();
      setChrome();
      announce(keep ? tt('a11y.saved') : tt('a11y.discarded'));
      arrangeBtn?.focus({ preventScroll: true });
    }
    const idxOf = el => tileEls().indexOf(el);
    function lift(el) { P.lift = { el, from: idxOf(el) }; el.classList.add('ov-lifted'); announce(posMsg('a11y.lifted', el, idxOf(el) + 1, tileEls().length)); }
    function drop() {
      const { el } = P.lift; P.lift = null; el.classList.remove('ov-lifted');
      syncOrder(); labelTiles(); el.focus({ preventScroll: true }); announce(posMsg('a11y.dropped', el, idxOf(el) + 1, tileEls().length));
    }
    function cancelLift() {
      const { el, from } = P.lift; P.lift = null; el.classList.remove('ov-lifted');
      const others = tileEls().filter(x => x !== el);
      flip(() => others[from] ? others[from].before(el) : board.append(el));
      syncOrder(); labelTiles(); el.focus({ preventScroll: true }); announce(posMsg('a11y.cancelLift', el, from + 1, tileEls().length));
    }
    function moveBy(el, delta) {
      const els = tileEls(), i = els.indexOf(el), j = MA.clamp(i + delta, 0, els.length - 1); if (i === j) return;
      flip(() => j > i ? els[j].after(el) : els[j].before(el));
      el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      syncOrder(); labelTiles(); announce(posMsg('a11y.pos', el, j + 1, els.length));
    }
    const cols = () => getComputedStyle(board).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    // the arrow keys follow what you see: in RTL, ArrowLeft moves forward in the board's order
    const step = k => { const rtl = document.dir === 'rtl'; return k === 'ArrowRight' ? (rtl ? -1 : 1) : k === 'ArrowLeft' ? (rtl ? 1 : -1) : k === 'ArrowUp' ? -cols() : cols(); };
    board.addEventListener('keydown', e => {
      if (!P.arranging) return;
      const el = e.target.closest?.('.ov-tile'); if (!el || e.target !== el) return;
      const k = e.key, arrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k);
      if (k === ' ' || k === 'Spacebar' || e.code === 'Space' || k === 'Enter') { e.preventDefault(); if (P.lift) drop(); else lift(el); return; }
      if (arrow && P.lift) { e.preventDefault(); moveBy(el, step(k)); return; }
      if (arrow) { e.preventDefault(); const els = tileEls(), j = MA.clamp(els.indexOf(el) + step(k), 0, els.length - 1); els[j]?.focus(); return; }
      if (!P.lift && (k === 'Delete' || k === 'Backspace')) { e.preventDefault(); removeTile(el.dataset.id); }
    });
    const onKey = e => {
      if (!P.arranging || e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('.scrim, .palette-wrap')) return;
      e.preventDefault();
      if (P.drag) endDrag(false); else if (P.lift) cancelLift(); else exitArrange(false);
    };
    addEventListener('keydown', onKey);

    /* ---------- pointer drag (arrange mode) ---------- */
    const unlisten = () => { removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onCancel); };
    board.addEventListener('pointerdown', e => {
      if (!P.arranging || P.lift || P.drag || e.button !== 0) return;
      const el = e.target.closest('.ov-tile'); if (!el || el.parentElement !== board || e.target.closest('button,a,input,textarea,select')) return;
      P.pend = { el, x: e.clientX, y: e.clientY, id: e.pointerId };
      unlisten(); addEventListener('pointermove', onMove, { passive: false }); addEventListener('pointerup', onUp); addEventListener('pointercancel', onCancel);
    });
    function startDrag() {
      const { el, x, y, id } = P.pend, r = el.getBoundingClientRect(), br = board.getBoundingClientRect();
      const ph = h('div.ov-ph', { dataset: { size: el.dataset.size }, style: `min-height:${Math.round(r.height)}px`, html: PH_SVG });
      el.before(ph);
      const from = [...board.children].filter(c => c !== el).indexOf(ph);
      el.classList.add('ov-dragging');
      Object.assign(el.style, { width: r.width + 'px', height: r.height + 'px', left: (r.left - br.left) + 'px', top: (r.top - br.top) + 'px', transform: '', transition: '' });
      P.drag = { el, ph, id, ox: x - r.left, oy: y - r.top, from, over: null };
      P.pend = null; root.classList.add('is-dragging');
      announce(posMsg('a11y.lifted', el, from + 1, tileEls().length));
    }
    function onMove(e) {
      if (P.pend && e.pointerId === P.pend.id && !P.drag) { if (Math.hypot(e.clientX - P.pend.x, e.clientY - P.pend.y) < 5) return; startDrag(); }
      const d = P.drag; if (!d || e.pointerId !== d.id) return;
      e.preventDefault();
      const br = board.getBoundingClientRect();
      d.el.style.left = (e.clientX - br.left - d.ox) + 'px'; d.el.style.top = (e.clientY - br.top - d.oy) + 'px';
      reorderAt(e.clientX, e.clientY);
      if (e.clientY < 64) scrollBy(0, -14); else if (e.clientY > innerHeight - 64) scrollBy(0, 14);
    }
    function reorderAt(x, y) {
      const d = P.drag, sibs = [...board.children].filter(c => c !== d.el && (c.classList.contains('ov-tile') || c === d.ph));
      const hit = c => { const r = c.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
      const over = sibs.find(c => c !== d.ph && hit(c));
      if (!over) {
        d.over = null;
        const bottom = Math.max(...sibs.map(c => c.getBoundingClientRect().bottom));
        if (y > bottom && sibs.at(-1) !== d.ph) { flip(() => board.append(d.ph)); announce(posMsg('a11y.pos', d.el, sibs.length, sibs.length)); }
        return;
      }
      if (over === d.over) return;
      d.over = over;
      const a = sibs.indexOf(d.ph), b = sibs.indexOf(over);
      flip(() => a < b ? over.after(d.ph) : over.before(d.ph));
      announce(posMsg('a11y.pos', d.el, [...board.children].filter(c => c !== d.el).indexOf(d.ph) + 1, sibs.length));
    }
    function onUp(e) {
      if (P.pend && e.pointerId === P.pend.id) { P.pend = null; unlisten(); return; }
      if (P.drag && e.pointerId === P.drag.id) { unlisten(); endDrag(true); }
    }
    function onCancel() { if (P.pend) P.pend = null; unlisten(); if (P.drag) endDrag(false); }
    function endDrag(commit) {
      const d = P.drag; if (!d) return; P.drag = null; root.classList.remove('is-dragging'); unlisten();
      if (!commit) { const rest = [...board.children].filter(c => c !== d.el && c !== d.ph); flip(() => rest[d.from] ? rest[d.from].before(d.ph) : board.append(d.ph)); }
      const a = d.el.getBoundingClientRect();
      d.ph.replaceWith(d.el);
      d.el.classList.remove('ov-dragging');
      Object.assign(d.el.style, { width: '', height: '', left: '', top: '' });
      if (!MA.reducedMotion()) {
        const b = d.el.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
        if (Math.abs(dx) + Math.abs(dy) > 1) {
          d.el.style.transition = 'none'; d.el.style.transform = `translate(${dx}px,${dy}px)`; d.el.getBoundingClientRect();
          d.el.style.transition = 'transform .28s var(--ease)'; d.el.style.transform = '';
          setTimeout(() => { d.el.style.transition = ''; }, 420);
        }
      }
      syncOrder(); labelTiles();
      announce(commit ? posMsg('a11y.dropped', d.el, idxOf(d.el) + 1, tileEls().length) : posMsg('a11y.cancelLift', d.el, d.from + 1, tileEls().length));
      d.el.focus({ preventScroll: true });
      const swallow = ev => { ev.stopPropagation(); ev.preventDefault(); };
      addEventListener('click', swallow, { capture: true, once: true }); setTimeout(() => removeEventListener('click', swallow, { capture: true }), 60);
    }

    /* ---------- add-widget drawer ---------- */
    function openAdd(cat0 = 'all') {
      if (P.drawer) return P.drawer;
      let q = '', cat = cat0;
      const L = MA.ui.drawer({ title: tt('addTitle'), width: 400, onClose: () => { P.drawer = null; }, render(body, LL) {
        body.classList.add('m-overview', 'ov-drawer');
        // the catalog (with its live previews) is built once; search and the category chips only show or hide items, so typing never re-renders a preview
        const filterSoon = MA.debounce(() => filter(), 100);
        const search = h('input.input', { type: 'search', placeholder: tt('addSearch'), 'aria-label': tt('addSearch'), autocomplete: 'off', spellcheck: false, oninput: () => { q = search.value.trim().toLowerCase(); filterSoon(); } });
        const chips = h('div.ov-chips', { role: 'group', 'aria-label': tt('addTitle') }), list = h('div.ov-cat-list'), none = h('p.ov-cap.ov-nomatch', { hidden: true });
        ['all', ...CATS].forEach(c => chips.append(h('button.tag', { type: 'button', 'aria-pressed': String(cat === c), dataset: { cat: c }, onclick: () => { cat = c; chips.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.cat === c))); filter(); } }, tt('cat.' + c))));
        const hay = d => MA.fold([d.title.en, d.title.ar, d.title.fa, d.desc.en, d.desc.ar, d.desc.fa, d.id, tt('cat.' + d.cat)].join(' '));
        const filter = () => {
          const fq = q ? MA.fold(q) : '';
          let shown = 0;
          list.querySelectorAll(':scope > .ov-cat').forEach(el => { const ok = (cat === 'all' || el.dataset.cat === cat) && (!fq || el._hay.includes(fq)); el.hidden = !ok; if (ok) shown++; });
          none.hidden = !!shown; none.textContent = shown ? '' : tt('noMatch', { q });
        };
        const refocus = id => list.querySelector(`.ov-cat[data-w="${CSS.escape(id)}"] :is([data-act=show],[data-act=add-w])`)?.focus({ preventScroll: true });
        const add = id => { addWidget(id); build(); filter(); refocus(id); };
        const build = () => {
          list.innerHTML = '';
          const onBoard = new Set(P.layout.tiles.map(t => t.w)), paints = [];
          catalog().forEach(d => {
            const on = onBoard.has(d.id), act = h('div.ov-cat-act');
            if (on) {
              act.append(MA.ui.badge(tt('onBoard'), 'good'));
              const sm = MA.ui.btn(tt('showMe'), { size: 'sm', kind: 'ghost', onclick: () => showMe(d.id) }); sm.dataset.act = 'show'; act.append(sm);
              if (d.multi) { const more = MA.ui.btn(tt('addAnother'), { size: 'sm', icon: 'plus', onclick: () => add(d.id) }); more.dataset.act = 'add-w'; act.append(more); }
            } else { const ad = MA.ui.btn(tt('addOne'), { size: 'sm', icon: 'plus', kind: 'primary', onclick: () => add(d.id) }); ad.dataset.act = 'add-w'; act.append(ad); }
            const prevBody = h('div.ov-tb'), stamp = h('span.ov-badges');
            const item = h('article.ov-cat', { dataset: { w: d.id, cat: d.cat } },
              h('div.ov-cat-head', h('div.grow', h('div.ov-cat-title', h('h3.h4', MA.L(d.title)), stamp), h('p.ov-cat-desc', MA.L(d.desc))), act),
              h('div.ov-prev', { inert: '', 'aria-hidden': 'true' }, prevBody),
              h('p.ov-cat-meta', `${tt('cat.' + d.cat)} · ${tt('sizes')}: ${d.sizes.map(z => tt('size' + z)).join(tt('listSep'))}`));
            item._hay = hay(d);
            list.append(item); paints.push([prevBody, d, stamp]);
          });
          list.append(none);
          paints.forEach(([pb, d, stamp]) => { const res = paintBody(pb, { id: 'preview-' + d.id, w: d.id, size: d.size, s: {} }, { preview: true }); if (res.sample) stamp.append(MA.ui.sample()); });
        };
        LL.redraw = () => { build(); filter(); };
        body.append(h('div.ov-search', MA.iconEl('search', 'sm'), search), chips, list);
        build(); filter(); setTimeout(() => search.focus({ preventScroll: true }), 40);
      } });
      P.drawer = L;
      return L;
    }

    /* ---------- refresh on data changes ---------- */
    const queue = new Set(); let qt = 0;
    const want = evt => { queue.add(evt); clearTimeout(qt); qt = setTimeout(flush, 120); };
    function flush() {
      if (!alive) return;
      if (P.drag) { qt = setTimeout(flush, 300); return; }
      const ev = [...queue]; queue.clear(); memo = new Map();
      const all = ev.includes('prefs') || ev.includes('sample');
      if (ev.includes('prefs') && meId() !== P.me) { P.me = meId(); P.layout = loadLayout(); P.arranging = false; P.snap = null; drawHead(); drawSea(); drawBoard(); setChrome(); return; }
      if (all || ev.includes('metrics') || ev.includes('content:change')) drawSea(); // content: a provider connected changes the empty sea's sentence
      if (all || ev.includes('team') || ev.includes('content:change')) drawHead();
      tileEls().forEach(el => {
        const d = W[el._t.w]; if (!(all || d.on?.some(x => ev.includes(x)))) return;
        if (el.contains(document.activeElement) && document.activeElement.matches('textarea,input,[contenteditable=true]')) return;
        paint(el);
      });
      P.drawer?.redraw?.();
    }
    ['leads', 'metrics', 'content:published', 'activity', 'prefs', 'sample', 'team', 'versions', 'backup', 'content:saveError', 'db:analytics.shareUrl'].forEach(evt => MA.onView(evt, () => want(evt)));
    // connecting an analytics service changes what the traffic widgets say when there is no data: repaint them as for new metrics
    MA.onView('content:change', ({ path } = {}) => { want('content:change'); if (!path || /^studio\/analytics/.test(path)) want('metrics'); });

    const t15 = setInterval(() => { if (!alive) return; drawStatus(); tileEls().filter(e => e.dataset.w === 'clock').forEach(paint); }, 15000);
    const t10 = setInterval(() => { if (!alive || P.drag) return; tileEls().filter(e => e.dataset.w === 'live').forEach(paint); }, 10000);
    const t60 = setInterval(() => { if (!alive) return; memo = new Map(); drawSea(); if (daypart() !== P.part) { P.part = daypart(); drawHead(); } }, 60000);
    const ro = new ResizeObserver(MA.debounce(() => {
      if (!alive || P.drag) return;
      tileEls().forEach(el => { if (W[el._t.w].measure && Math.abs(el._body.clientWidth - (el._w || 0)) > 8) paint(el); });
    }, 140));
    ro.observe(board);

    /* ---------- keyboard: E toggles arrange mode (page-scoped, removed on route change) ---------- */
    MA.keys.bindView('e', () => { if (!alive) return; P.arranging ? exitArrange(true) : enterArrange(); }, () => tt('k.arrange'));

    const api = { enterArrange, exitArrange, openAdd, presetMenu, applyPreset, addWidget, showMe, removeTile };
    page = api;
    MA.cleanup(() => {
      alive = false; if (page === api) page = null;
      clearInterval(t15); clearInterval(t10); clearInterval(t60); clearTimeout(qt); ro.disconnect(); unlisten();
      removeEventListener('keydown', onKey); seaApi?.destroy();
    });

    drawHead(); drawSea(); drawBoard(); setChrome();
    if (ctx?.query?.get('arrange') === '1') setTimeout(() => alive && enterArrange(), 60);
    else if (ctx?.query?.get('add') === '1') setTimeout(() => alive && openAdd(), 60);
    if (pending) { const f = pending; pending = null; setTimeout(() => alive && f(api), 80); }
  }

  /** Render a widget body. Used for board tiles and for the live previews in the add drawer. */
  function paintBody(body, t, { preview = false, badges = null, api = null } = {}) {
    const d = W[t.w]; body.innerHTML = '';
    const cs = getComputedStyle(body), padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const x = { s: settingsOf(t), size: t.size, tile: t, width: body.clientWidth - padX, height: body.clientHeight - padY, preview, page: preview ? null : api,
      repaint: () => paintBody(body, t, { preview, badges, api }) };
    if (preview && x.s.rows) x.s.rows = 2; // previews are small: two rows are enough to show what the widget is
    let res = {};
    try { res = d.render(body, x) || {}; }
    catch (e) { console.error('[overview] ' + t.w, e); body.innerHTML = ''; body.append(h('p.ov-err', tt('widgetFailed', { msg: String(e?.message || e) }))); }
    if (badges) { badges.innerHTML = ''; if (res.badge) badges.append(MA.ui.badge(res.badge[0], res.badge[1])); if (res.sample) badges.append(MA.ui.sample()); }
    return res;
  }

  /* =================== palette: commands + search =================== */
  const goThen = fn => { if (page && MA.ctx().id === 'overview') fn(page); else { pending = fn; MA.go('#/overview'); } };
  MA.commands.add({ id: 'overview.arrange', title: tri('cmd.arrange'), icon: 'grid', shortcut: 'e', keywords: 'arrange layout widgets tiles dashboard home move resize ترتيب تخطيط بطاقات چیدمان مرتب‌سازی ابزارک', run: () => goThen(p => p.enterArrange()) });
  MA.commands.add({ id: 'overview.add', title: tri('cmd.add'), icon: 'plus', keywords: 'widget tile dashboard overview add أداة إضافة افزودن ابزارک', run: () => goThen(p => p.openAdd()) });
  MA.commands.add({ id: 'overview.preset', title: tri('cmd.preset'), icon: 'layers', keywords: 'layout preset founder producer sales content blank تخطيط جاهز چیدمان آماده', run: () => goThen(p => p.presetMenu()) });

  MA.module({
    id: 'overview', group: 'work', order: 10, icon: 'tide', shortcut: 'g o', keywords: 'home dashboard widgets الرئيسية نمای کلی خانه',
    title: { en: 'Overview', ar: 'نظرة عامة', fa: 'نمای کلی' },
    render(view, ctx) { mount(view, ctx); },
    search(q) {
      const ql = String(q).toLowerCase().trim(); if (!ql) return [];
      const on = new Set(loadLayout().tiles.map(t => t.w)), out = [];
      catalog().forEach(d => {
        if (![d.title.en, d.title.ar, d.title.fa, d.desc.en, d.id].join(' ').toLowerCase().includes(ql)) return;
        const has = on.has(d.id);
        out.push({ title: MA.L(d.title), sub: tt(has ? 's.onBoard' : 's.add'), icon: d.icon, score: 45, run: () => goThen(p => has ? p.showMe(d.id) : p.addWidget(d.id)) });
      });
      Object.entries(PRESETS).forEach(([id, p]) => {
        if (![p.en, p.ar, p.fa, 'layout preset'].join(' ').toLowerCase().includes(ql)) return;
        out.push({ title: tt('s.preset', { name: MA.L(p) }), sub: tt('s.presetSub'), icon: 'layers', score: 40, run: () => goThen(pg => pg.applyPreset(id)) });
      });
      return out;
    },
  });
})();
