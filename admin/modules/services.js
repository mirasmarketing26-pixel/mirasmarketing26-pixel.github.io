/* =====================================================================
   MIRAS admin — Swells & services (#/services)
   The two lists the site builds its Services story from.
   · Swells: the problems visitors tap in the opening film's swell picker ("Our brand feels scattered").
     List in site order (drag or ⌥↑ ⌥↓), duplicate, delete with undo, add. Detail editor at #/services/<id>
     (updated in place): words, plan phase, the four personal steps, the services that answer it, icon/tint, id, taps.
   · Services (?tab=services): the services on the site's Services list (#plan), in four groups (sgroups).
     Group name + line per group; per service: name, description, group, the swells it answers ("for").
     Add, duplicate, delete with undo, reorder within a group (drag or ⌥↑ ⌥↓). All list edits go through
     MA.content.replace('services', …), so each is one undo step. Deleting a swell (and its undo) is one MA.content.batch:
     the swell, the make words that pointed at it and the services that answered it change together.
   The shared live preview (MA.ui.previewPane, key 'services') sits beside both, aimed at the swell picker (#swells) or the
   Services list (#plan). MA.swells (tile, tint and theme helpers) is shared with Process.
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA, h = MA.h, esc = MA.esc;
  const ID = 'services';
  const TOKENS = ['tide', 'deep', 'shore', 'flare', 'foam', 'tide60'];
  const BRAND = { tide: '#2B3BF0', deep: '#0D0F2E', shore: '#F2EADB', flare: '#FF5A23', foam: '#BFF0DD', tide60: '#8098FD' };
  const GROUP_TINT = ['tide', 'flare', 'foam', 'deep']; // the colour of each group's column on the site
  const TOKEN_L = { tide: { en: 'Tide', ar: 'المدّ', fa: 'مد' }, deep: { en: 'Deep', ar: 'العمق', fa: 'ژرفا' }, shore: { en: 'Shore', ar: 'الشاطئ', fa: 'ساحل' }, flare: { en: 'Flare', ar: 'الوهج', fa: 'شعله' }, foam: { en: 'Foam', ar: 'الزبد', fa: 'کف' }, tide60: { en: 'Tide 60', ar: 'المدّ الفاتح', fa: 'مد روشن' } };
  const ICON_L = {
    brand: { en: 'Brand mark', ar: 'علامة', fa: 'نشان' }, film: { en: 'Film camera', ar: 'كاميرا فيديو', fa: 'دوربین فیلم‌برداری' }, ai: { en: 'Spark', ar: 'شرارة', fa: 'جرقه' }, web: { en: 'Website', ar: 'موقع', fa: 'وب‌سایت' },
    social: { en: 'Social post', ar: 'منشور', fa: 'پست شبکهٔ اجتماعی' }, campaign: { en: 'Megaphone', ar: 'مكبّر صوت', fa: 'بلندگو' }, photo: { en: 'Camera', ar: 'كاميرا', fa: 'دوربین عکاسی' }, strategy: { en: 'Compass', ar: 'بوصلة', fa: 'قطب‌نما' },
    voice: { en: 'Microphone', ar: 'ميكروفون', fa: 'میکروفون' }, pack: { en: 'Package', ar: 'تغليف', fa: 'بسته‌بندی' }, event: { en: 'Event', ar: 'فعالية', fa: 'رویداد' }, growth: { en: 'Growth', ar: 'نمو', fa: 'رشد' },
  };
  const FIELDS = ['problem', 'service', 'desc', 'noun'];
  const MAX = { problem: 34, service: 30, desc: 130, noun: 24, step: 50, svcName: 40, svcDesc: 110, grpName: 24, grpLine: 60 };
  const RANGES = ['7d', '30d', '90d'];
  // placeholders are site copy, so they stay English / Arabic whatever the admin language is
  const PH = {
    problem: { en: 'In the visitor’s words: “Our website is old”', ar: 'بكلمات الزائر: «موقعنا قديم»' },
    service: { en: 'The service that solves it: “Website”', ar: 'الخدمة التي تحلّها: «الموقع الإلكتروني»' },
    desc: { en: 'One sentence on what they get, in plain words', ar: 'جملة واحدة عمّا سيحصل عليه، بكلمات بسيطة' },
    noun: { en: 'Reads after “Let’s start with”: “the website”', ar: 'تأتي بعد «لنبدأ بـ»: «الموقع»' },
    svcName: { en: 'The service, plainly: “Brand identity”', ar: 'الخدمة بوضوح: «الهوية البصرية»' },
    svcDesc: { en: 'One sentence on what the client gets', ar: 'جملة واحدة عمّا يحصل عليه العميل' },
    grpName: { en: 'One or two words: “Strategy”', ar: 'كلمة أو كلمتان: «الاستراتيجية»' },
    grpLine: { en: 'One short line under the name', ar: 'سطر قصير تحت الاسم' },
  };
  const stepPh = (en, ar) => ({ en: `What “${en}” means for this swell`, ar: `ماذا تعني «${ar}» لهذه الموجة` });

  /* ---------------- strings: key → [English, Arabic, Persian] ---------------- */
  const I = {
    'services.title': ['Swells & services', 'الموجات والخدمات', 'موج‌ها و خدمات'],
    'services.sub': ['The problems visitors tap in the opening film, and the services on the Services list. A visitor’s picks light up the services that answer them, write the plan headline and add personal steps to the four stages.',
      'المشكلات التي ينقر عليها الزائر في الفيلم الافتتاحي، والخدمات في قائمة الخدمات. اختيارات الزائر تُبرز الخدمات التي تجيب عنها، وتكتب عنوان الخطة، وتضيف خطوات خاصة إلى المراحل الأربع.',
      'مشکل‌هایی که بازدیدکننده در فیلم آغازین انتخاب می‌کند، و خدمات فهرست خدمات. انتخاب‌های بازدیدکننده خدماتی را که پاسخ آن‌هاست برجسته می‌کنند، تیتر برنامه را می‌نویسند و به چهار مرحله گام‌های شخصی می‌افزایند.'],
    'services.tab.swells': ['Swells', 'الموجات', 'موج‌ها'],
    'services.tab.services': ['Services', 'الخدمات', 'خدمات'],
    'services.add': ['Add swell', 'إضافة موجة', 'افزودن موج'],
    'services.count': ['{n} swells, in site order', 'عدد الموجات: {n}، بترتيب ظهورها في الموقع', '{n} موج، به ترتیب سایت'],
    'services.dragHint': ['Drag, or press ⌥↑ ⌥↓, to reorder. The swell picker in the opening film shows them in this order.', 'اسحب أو اضغط ⌥↑ ⌥↓ لإعادة الترتيب. يعرضها منتقي الموجات في الفيلم الافتتاحي بهذا الترتيب.', 'برای تغییر ترتیب بکشید یا ⌥↑ ⌥↓ را بزنید. انتخاب موج در فیلم آغازین آن‌ها را به همین ترتیب نشان می‌دهد.'],
    'services.col.swell': ['Swell', 'الموجة', 'موج'],
    'services.col.phase': ['Plan phase', 'مرحلة الخطة', 'مرحلهٔ برنامه'],
    'services.col.taps': ['Taps', 'النقرات', 'انتخاب‌ها'],
    'services.r.7d': ['{n} days', '{n} أيام', '{n} روز'], 'services.r.30d': ['{n} days', '{n} يوماً', '{n} روز'], 'services.r.90d': ['{n} days', '{n} يوماً', '{n} روز'],
    'services.range': ['Period for taps', 'فترة النقرات', 'بازهٔ انتخاب‌ها'],
    'services.noData': ['No taps yet', 'لا نقرات بعد', 'هنوز انتخابی نیست'],
    'services.noDataTip': ['Taps show up once the site gets visits on this browser, or once analytics is connected in Settings.', 'تظهر النقرات بعد أن يزور أحد الموقع من هذا المتصفح، أو بعد ربط التحليلات من الإعدادات.', 'انتخاب‌ها وقتی نمایش داده می‌شوند که سایت در همین مرورگر بازدید شود، یا آمار در «تنظیمات» وصل شود.'],
    'services.connect': ['Connect analytics', 'ربط التحليلات', 'اتصال آمار'],
    'services.edited': ['Unpublished changes', 'تعديلات غير منشورة', 'تغییرات منتشرنشده'],
    'services.new': ['New', 'جديدة', 'جدید'],
    'services.orderChanged': ['New order, not published yet', 'ترتيب جديد لم يُنشر بعد', 'ترتیب تازه، هنوز منتشر نشده'],
    'services.emptyN': ['{n} empty', 'فارغة: {n}', '{n} خالی'],
    'services.emptyTip': ['Empty: {list}', 'حقول فارغة: {list}', 'خالی: {list}'],
    'services.open': ['Open swell', 'فتح الموجة', 'باز کردن موج'],
    'services.duplicate': ['Duplicate swell', 'تكرار الموجة', 'تکثیر موج'],
    'services.moveUp': ['Move up', 'نقل إلى الأعلى', 'انتقال به بالا'],
    'services.moveDown': ['Move down', 'نقل إلى الأسفل', 'انتقال به پایین'],
    'services.delete': ['Delete swell', 'حذف الموجة', 'حذف موج'],
    'services.showPreview': ['Show in preview', 'أظهرها في المعاينة', 'نمایش در پیش‌نمایش'],
    'services.actions': ['Swell actions', 'إجراءات الموجة', 'کارهای موج'],
    'services.duplicated': ['Duplicated “{name}”.', 'كُرّرت «{name}».', '«{name}» تکثیر شد.'],
    'services.deleted': ['Deleted “{name}”.', 'حُذفت «{name}».', '«{name}» حذف شد.'],
    'services.deletedRelinked': [{ one: 'Deleted “{name}” and moved its word to “{to}”.', other: 'Deleted “{name}” and moved {n} words to “{to}”.' },
      { zero: 'حُذفت «{name}».', one: 'حُذفت «{name}» ونُقلت كلمتها إلى «{to}».', two: 'حُذفت «{name}» ونُقلت كلمتاها إلى «{to}».', few: 'حُذفت «{name}» ونُقلت {n} كلمات إلى «{to}».', many: 'حُذفت «{name}» ونُقلت {n} كلمةً إلى «{to}».', other: 'حُذفت «{name}» ونُقلت {n} كلمة إلى «{to}».' },
      '«{name}» حذف شد و {n} واژه به «{to}» منتقل شد.'],
    'services.deletedFor': [{ one: 'The service that answered it lets go of it.', other: 'The {n} services that answered it let go of it.' },
      { zero: '', one: 'وأُزيلت من الخدمة التي كانت تجيب عنها.', two: 'وأُزيلت من الخدمتين اللتين كانتا تجيبان عنها.', few: 'وأُزيلت من {n} خدمات كانت تجيب عنها.', many: 'وأُزيلت من {n} خدمةً كانت تجيب عنها.', other: 'وأُزيلت من {n} خدمة كانت تجيب عنها.' },
      'از {n} خدمتی که به آن پاسخ می‌دادند هم برداشته شد.'],
    'services.moved': ['Moved “{name}”.', 'نُقلت «{name}».', '«{name}» جابه‌جا شد.'],
    'services.reordered': ['New order saved to the draft.', 'حُفظ الترتيب الجديد في المسودة.', 'ترتیب تازه در پیش‌نویس ذخیره شد.'],
    'services.lbl.reorder': ['Reorder swells', 'إعادة ترتيب الموجات', 'تغییر ترتیب موج‌ها'],
    'services.lbl.delete': ['Delete swell', 'حذف موجة', 'حذف موج'],
    'services.lbl.add': ['Add swell', 'إضافة موجة', 'افزودن موج'],
    'services.lbl.duplicate': ['Duplicate swell', 'تكرار موجة', 'تکثیر موج'],
    'services.lbl.relink': ['Relink make words', 'نقل كلمات «ما نصنعه»', 'پیوند دوبارهٔ واژه‌های «آنچه می‌سازیم»'],
    'services.lbl.restore': ['Restore swells', 'استرجاع الموجات', 'بازگرداندن موج‌ها'],
    'services.relink.title': ['Move its words first', 'انقل كلماتها أولاً', 'اول واژه‌هایش را منتقل کنید'],
    'services.relink.text': [{ one: 'One word in “What we make” opens {name} when a visitor taps it. Choose the swell it should open instead.', other: '{n} words in “What we make” open {name} when a visitor taps them. Choose the swell they should open instead.' },
      { zero: 'لا كلمات في قسم «ما نصنعه» تفتح {name}.', one: 'عند النقر على كلمة في قسم «ما نصنعه» تُفتح {name}. اختر الموجة التي ستفتحها بدلاً منها.', two: 'عند النقر على كلمتين في قسم «ما نصنعه» تُفتح {name}. اختر الموجة التي ستفتحانها بدلاً منها.', few: 'عند النقر على {n} كلمات في قسم «ما نصنعه» تُفتح {name}. اختر الموجة التي ستفتحها بدلاً منها.', many: 'عند النقر على {n} كلمةً في قسم «ما نصنعه» تُفتح {name}. اختر الموجة التي ستفتحها بدلاً منها.', other: 'عند النقر على {n} كلمة في قسم «ما نصنعه» تُفتح {name}. اختر الموجة التي ستفتحها بدلاً منها.' }, '{n} واژه در «آنچه می‌سازیم» با انتخاب بازدیدکننده {name} را باز می‌کنند. موجی را که باید به‌جایش باز کنند انتخاب کنید.'],
    'services.relink.to': ['Move them to', 'انقلها إلى', 'انتقال به'],
    'services.relink.ok': ['Move words and delete', 'انقل الكلمات واحذف', 'انتقال واژه‌ها و حذف'],
    'services.relink.none': ['There is no other swell to move them to. Delete anyway and those words open nothing until you relink them in Pages & copy.', 'لا توجد موجة أخرى تُنقل إليها. إن حذفتها فلن تفتح تلك الكلمات شيئاً حتى تربطها من جديد في «الصفحات والنصوص».', 'موج دیگری برای انتقال نیست. اگر با این حال حذف کنید، این واژه‌ها تا وقتی در «صفحه‌ها و متن‌ها» دوباره پیوند نخورند چیزی باز نمی‌کنند.'],
    'services.relink.anyway': ['Delete anyway', 'احذف على أي حال', 'با این حال حذف کن'],
    'services.addTitle': ['Add a swell', 'إضافة موجة', 'افزودن موج'],
    'services.addName': ['Service name in English', 'اسم الخدمة بالإنجليزية', 'نام خدمت به انگلیسی'],
    'services.addNameAr': ['Service name in Arabic', 'اسم الخدمة بالعربية', 'نام خدمت به عربی'],
    'services.addProblem': ['What the visitor taps, in English', 'ما ينقر عليه الزائر، بالإنجليزية', 'آنچه بازدیدکننده انتخاب می‌کند، به انگلیسی'],
    'services.addId': ['Its id will be', 'سيكون معرّفها', 'شناسهٔ آن می‌شود'],
    'services.addIdHint': ['Made from the English name. It never changes, so briefs and numbers stay attached.', 'يُشتق من الاسم الإنجليزي ولا يتغيّر أبداً، كي تبقى الطلبات والأرقام مرتبطة بها.', 'از نام انگلیسی ساخته می‌شود و هرگز تغییر نمی‌کند تا درخواست‌ها و آمار به آن وصل بمانند.'],
    'services.addErr': ['Give it an English name first. The id is made from it.', 'اكتب اسماً بالإنجليزية أولاً، فالمعرّف يُشتق منه.', 'اول یک نام انگلیسی بنویسید؛ شناسه از آن ساخته می‌شود.'],
    'services.addOk': ['Create swell', 'إنشاء الموجة', 'ساختن موج'],
    'services.added': ['Added “{name}”. Fill in the rest, then publish.', 'أُضيفت «{name}». أكمل بقية الحقول ثم انشر.', '«{name}» افزوده شد. بقیهٔ فیلدها را پر کنید و منتشر کنید.'],
    'services.optional': ['optional', 'اختياري', 'اختیاری'],
    'services.crowded': ['The opening film has room for about six swells. With {n}, the buttons crowd together on phones.', 'يتّسع الفيلم الافتتاحي لنحو ست موجات. مع هذا العدد ({n}) تتزاحم الأزرار على الجوال.', 'فیلم آغازین برای حدود شش موج جا دارد. با {n} موج، دکمه‌ها روی موبایل به هم فشرده می‌شوند.'],
    'services.emptyTitle': ['No swells yet', 'لا توجد موجات بعد', 'هنوز موجی نیست'],
    'services.emptyText': ['Swells are the problems visitors recognise in the opening film. Add the first one so they have something to tap.', 'الموجات هي المشكلات التي يتعرّف عليها الزائر في الفيلم الافتتاحي. أضف الأولى ليجد ما ينقر عليه.', 'موج‌ها مشکل‌هایی‌اند که بازدیدکننده در فیلم آغازین خودش را در آن‌ها می‌بیند. اولی را بیفزایید تا چیزی برای انتخاب داشته باشد.'],
    'services.pv.film': ['Swell picker', 'منتقي الموجات', 'انتخاب موج'],
    'services.pv.plan': ['Services list', 'قائمة الخدمات', 'فهرست خدمات'],
    'services.pv.aim': ['Part of the site to preview', 'الجزء المعروض من الموقع', 'بخشی از سایت که پیش‌نمایش می‌شود'],
    'services.back': ['All swells', 'كل الموجات', 'همهٔ موج‌ها'],
    'services.eyebrow': ['Swell {n} of {total}', 'الموجة {n} من {total}', 'موج {n} از {total}'],
    'services.prev': ['Previous swell (K)', 'الموجة السابقة (K)', 'موج قبلی (K)'],
    'services.next': ['Next swell (J)', 'الموجة التالية (J)', 'موج بعدی (J)'],
    'services.sec.words': ['What visitors read', 'ما يقرؤه الزائر', 'آنچه بازدیدکننده می‌خواند'],
    'services.sec.wordsSub': ['Each field has an English and an Arabic version.', 'لكل حقل نسخة إنجليزية وأخرى عربية.', 'هر فیلد یک نسخهٔ انگلیسی و یک نسخهٔ عربی دارد.'],
    'services.f.problem': ['What the visitor taps', 'ما ينقر عليه الزائر', 'آنچه بازدیدکننده انتخاب می‌کند'],
    'services.f.problemHint': ['A problem in the client’s own words. It’s a button in the opening film and in the contact form, and the services that answer it quote it.', 'مشكلة بكلمات العميل نفسه. تظهر زراً في الفيلم الافتتاحي وفي نموذج التواصل، وتقتبسها الخدمات التي تجيب عنها.', 'مشکلی به زبان خود مشتری. دکمه‌ای در فیلم آغازین و فرم تماس است و خدماتی که به آن پاسخ می‌دهند نقلش می‌کنند.'],
    'services.f.service': ['Service name', 'اسم الخدمة', 'نام خدمت'],
    'services.f.serviceHint': ['What we make to solve it. It goes into the brief a visitor sends, and the “What we make” section lists it when that section is on.', 'ما نصنعه لحلّها. يُكتب في الطلب الذي يرسله الزائر، ويظهر في قائمة قسم «ما نصنعه» حين يكون القسم ظاهراً.', 'آنچه برای حلش می‌سازیم. در درخواستی که بازدیدکننده می‌فرستد نوشته می‌شود و وقتی بخش «آنچه می‌سازیم» روشن باشد در فهرستش می‌آید.'],
    'services.f.serviceOff': ['The “What we make” section is hidden on the site right now.', 'قسم «ما نصنعه» مخفي في الموقع الآن.', 'بخش «آنچه می‌سازیم» اکنون در سایت پنهان است.'],
    'services.f.desc': ['Description', 'الوصف', 'توضیح'],
    'services.f.descHint': ['One or two sentences about it. The current site doesn’t show this; it stays with the swell for the team.', 'جملة أو جملتان عنها. لا يعرضها الموقع الحالي، لكنها تبقى مع الموجة للفريق.', 'یکی دو جمله دربارهٔ آن. سایت فعلی این را نشان نمی‌دهد؛ برای تیم کنار موج می‌ماند.'],
    'services.f.noun': ['Plan headline word', 'كلمة عنوان الخطة', 'واژهٔ تیتر برنامه'],
    'services.f.nounHint': ['Used in the plan headline when this swell is picked: “Let’s start with ___.”', 'تُستخدم في عنوان الخطة عند اختيار هذه الموجة: «لنبدأ بـ___».', 'وقتی این موج انتخاب شود در تیتر برنامه می‌آید: «Let’s start with ___.»'],
    'services.f.nounReads': ['Reads as', 'تُقرأ هكذا', 'این‌طور خوانده می‌شود'],
    'services.sec.steps': ['Four personal steps', 'أربع خطوات خاصة', 'چهار گام شخصی'],
    'services.stepsSub': ['When a visitor picks this swell, each of the four stages in the opening film shows its step under “{mine}”, next to the stage’s services. With several picks, a stage shows at most two steps, in plan order.', 'عندما يختار الزائر هذه الموجة، تعرض كل مرحلة من المراحل الأربع في الفيلم الافتتاحي خطوتها تحت «{mine}» بجانب خدمات المرحلة. وإن اختار أكثر من موجة، تعرض كل مرحلة خطوتين على الأكثر بترتيب الخطة.', 'وقتی بازدیدکننده این موج را انتخاب کند، هر یک از چهار مرحلهٔ فیلم آغازین گام آن را زیر «{mine}» کنار خدمات آن مرحله نشان می‌دهد. اگر چند موج انتخاب شود، هر مرحله حداکثر دو گام را به ترتیب برنامه نشان می‌دهد.'],
    'services.stepLabel': ['Stage {n} · {title}', 'المرحلة {n} · {title}', 'مرحلهٔ {n} · {title}'],
    'services.editStops': ['Edit the stages', 'تعديل المراحل', 'ویرایش مرحله‌ها'],
    'services.sec.look': ['Icon and colours', 'الأيقونة والألوان', 'آیکون و رنگ‌ها'],
    'services.lookSub': ['The tile tells swells apart here in the admin, in two brand colours. The current site doesn’t show it.', 'تميّز هذه البطاقة الموجات هنا في لوحة الإدارة بلونين من ألوان الهوية. لا يعرضها الموقع الحالي.', 'این کاشی موج‌ها را در پنل با دو رنگ برند از هم جدا می‌کند. سایت فعلی آن را نشان نمی‌دهد.'],
    'services.icon': ['Icon', 'الأيقونة', 'آیکون'],
    'services.tintBg': ['Tile', 'الخلفية', 'کاشی'],
    'services.tintFg': ['Icon colour', 'لون الأيقونة', 'رنگ آیکون'],
    'services.contrast': ['Contrast {r}', 'التباين {r}', 'کنتراست {r}'],
    'services.cStrong': ['Clear', 'واضح', 'واضح'],
    'services.cOk': ['Fine for icons', 'مناسب للأيقونات', 'برای آیکون مناسب'],
    'services.cWeak': ['Too faint', 'باهت جداً', 'بیش از حد کم‌رنگ'],
    'services.weakText': ['The icon will be hard to see on this tile ({r}). Icons need at least {min}.', 'سيصعب رؤية الأيقونة على هذه الخلفية ({r})، والأيقونات تحتاج {min} على الأقل.', 'آیکون روی این کاشی ({r}) به‌سختی دیده می‌شود. آیکون‌ها دست‌کم {min} لازم دارند.'],
    'services.useFg': ['Use {name} instead', 'استخدم {name} بدلاً منه', 'به‌جایش {name} را بگذارید'],
    'services.sec.plan': ['Place in the plan', 'مكانها في الخطة', 'جایگاه در برنامه'],
    'services.planSub': ['When a visitor picks several swells, the plan headline names them in this order: “Identity first. Then the website.” Swells in the same phase are named together.', 'عندما يختار الزائر أكثر من موجة، يذكرها عنوان الخطة بهذا الترتيب: «أولاً الهوية. ثم الموقع.» والموجات التي تتشارك مرحلة واحدة تُذكر معاً.', 'وقتی بازدیدکننده چند موج انتخاب کند، تیتر برنامه آن‌ها را به این ترتیب نام می‌برد: «اول هویت. بعد وب‌سایت.» موج‌های یک مرحله با هم نام برده می‌شوند.'],
    'services.inPhase': ['With {list}', 'مع {list}', 'همراه با {list}'],
    'services.phaseEmpty': ['On its own', 'وحدها', 'به‌تنهایی'],
    'services.sec.answers': ['Services that answer it', 'الخدمات التي تجيب عنها', 'خدماتی که به آن پاسخ می‌دهند'],
    'services.answersSub': ['When a visitor picks this swell, these services get a dot on the Services list and quote “{problem}”.', 'عندما يختار الزائر هذه الموجة، تُعلَّم هذه الخدمات بنقطة في قائمة الخدمات وتقتبس «{problem}».', 'وقتی بازدیدکننده این موج را انتخاب کند، این خدمات در فهرست خدمات نقطه می‌گیرند و «{problem}» را نقل می‌کنند.'],
    'services.answersNone': ['No service answers this swell yet, so picking it lights up nothing on the Services list.', 'لا تجيب أي خدمة عن هذه الموجة بعد، لذا لا يُبرز اختيارها شيئاً في قائمة الخدمات.', 'هنوز هیچ خدمتی به این موج پاسخ نمی‌دهد، پس انتخابش چیزی را در فهرست خدمات برجسته نمی‌کند.'],
    'services.answersN': ['{n} of {total} services answer it', 'تجيب عنها {n} من {total} خدمة', '{n} خدمت از {total} به آن پاسخ می‌دهند'],
    'services.editServices': ['Edit services', 'تعديل الخدمات', 'ویرایش خدمات'],
    'services.sec.id': ['Link id', 'معرّف الربط', 'شناسهٔ پیوند'],
    'services.idHint': ['Make words, services, briefs and analytics point to this id. It never changes, so older briefs and numbers stay attached.', 'تشير إلى هذا المعرّف كلمات «ما نصنعه» والخدمات والطلبات والتحليلات. لا يتغيّر أبداً، كي تبقى الطلبات والأرقام السابقة مرتبطة به.', 'واژه‌های «آنچه می‌سازیم»، خدمات، درخواست‌ها و آمار به این شناسه اشاره می‌کنند. هرگز تغییر نمی‌کند تا درخواست‌ها و آمار قبلی وصل بمانند.'],
    'services.copyId': ['Copy id', 'نسخ المعرّف', 'کپی شناسه'],
    'services.idCopied': ['Copied the id.', 'نُسخ المعرّف.', 'شناسه کپی شد.'],
    'services.usedMake': [{ one: 'One word in “What we make” opens it', other: '{n} words in “What we make” open it' }, 'كلمات في «ما نصنعه» تفتحها: {n}', '{n} واژه در «آنچه می‌سازیم» آن را باز می‌کنند'],
    'services.usedMakeNone': ['No words in “What we make” open it yet', 'لا تفتحها أي كلمة في «ما نصنعه» بعد', 'هنوز هیچ واژه‌ای در «آنچه می‌سازیم» آن را باز نمی‌کند'],
    'services.usedBriefs': ['Picked in {n} briefs', 'اختيرت في طلبات عددها {n}', 'در {n} درخواست انتخاب شده'],
    'services.editWords': ['Edit the words', 'تعديل الكلمات', 'ویرایش واژه‌ها'],
    'services.perf': ['Performance', 'الأداء', 'عملکرد'],
    'services.perf.taps': ['Taps', 'النقرات', 'انتخاب‌ها'],
    'services.perf.share': ['Share of all taps', 'حصتها من كل النقرات', 'سهم از همهٔ انتخاب‌ها'],
    'services.perf.rank': ['#{n} of {total} swells', 'الترتيب {n} من {total}', 'رتبهٔ {n} از {total} موج'],
    'services.missing': ['{n} fields are still empty. The site shows a blank there until they are filled.', 'حقول ما زالت فارغة: {n}. سيظهر مكانها فارغاً في الموقع حتى تُملأ.', '{n} فیلد هنوز خالی است. سایت تا پر شدنشان جای خالی نشان می‌دهد.'],
    'services.missingOne': ['One field is still empty. The site shows a blank there until it is filled.', 'حقل واحد ما زال فارغاً، وسيظهر مكانه فارغاً في الموقع حتى يُملأ.', 'یک فیلد هنوز خالی است. سایت تا پر شدنش جای خالی نشان می‌دهد.'],
    'services.notFound': ['That swell isn’t here', 'هذه الموجة غير موجودة', 'این موج اینجا نیست'],
    'services.notFoundText': ['It may have been deleted. Its id was {id}.', 'ربما حُذفت. كان معرّفها {id}.', 'شاید حذف شده باشد. شناسه‌اش {id} بود.'],
    'services.k.next': ['Next item', 'العنصر التالي', 'مورد بعدی'],
    'services.k.prev': ['Previous item', 'العنصر السابق', 'مورد قبلی'],
    'services.k.new': ['Add a swell or a service', 'إضافة موجة أو خدمة', 'افزودن موج یا خدمت'],
    /* services tab */
    'services.svc.count': ['{n} services in four groups', 'عدد الخدمات: {n}، في أربع مجموعات', '{n} خدمت در چهار گروه'],
    'services.svc.hint': ['The Services list shows each group as a column, with its services in this order. Drag, or press ⌥↑ ⌥↓, to reorder within a group.', 'تعرض قائمة الخدمات كل مجموعة في عمود، وخدماتها بهذا الترتيب. اسحب أو اضغط ⌥↑ ⌥↓ لإعادة الترتيب داخل المجموعة.', 'فهرست خدمات هر گروه را در یک ستون و خدماتش را به همین ترتیب نشان می‌دهد. برای تغییر ترتیب در هر گروه بکشید یا ⌥↑ ⌥↓ را بزنید.'],
    'services.svc.add': ['Add service', 'إضافة خدمة', 'افزودن خدمت'],
    'services.svc.addTo': ['Add a service to {group}', 'إضافة خدمة إلى {group}', 'افزودن خدمت به {group}'],
    'services.grp': ['Group {n}', 'المجموعة {n}', 'گروه {n}'],
    'services.grp.edit': ['Edit name and line', 'تعديل الاسم والسطر', 'ویرایش نام و سطر'],
    'services.grp.done': ['Close', 'إغلاق', 'بستن'],
    'services.grp.name': ['Group name', 'اسم المجموعة', 'نام گروه'],
    'services.grp.nameHint': ['The heading of this column on the Services list.', 'عنوان هذا العمود في قائمة الخدمات.', 'عنوان این ستون در فهرست خدمات.'],
    'services.grp.line': ['Line under the name', 'السطر تحت الاسم', 'سطر زیر نام'],
    'services.grp.lineHint': ['One short sentence.', 'جملة قصيرة واحدة.', 'یک جملهٔ کوتاه.'],
    'services.grp.n': ['{n} services', 'الخدمات: {n}', '{n} خدمت'],
    'services.grp.one': ['1 service', 'خدمة واحدة', '{n} خدمت'],
    'services.grp.none': ['No services in this group yet. Its column shows only the name and line.', 'لا خدمات في هذه المجموعة بعد، ويعرض عمودها الاسم والسطر فقط.', 'هنوز خدمتی در این گروه نیست و ستونش فقط نام و سطر را نشان می‌دهد.'],
    'services.grp.colour': ['Its column on the site is {c}.', 'لون عمودها في الموقع: {c}.', 'رنگ ستونش در سایت: {c}.'],
    'services.grp.orphans': ['Not in a group', 'خارج المجموعات', 'بدون گروه'],
    'services.grp.orphansText': ['These services have no valid group, so the site doesn’t show them. Pick a group for each.', 'ليست لهذه الخدمات مجموعة صالحة، لذلك لا يعرضها الموقع. اختر مجموعة لكل منها.', 'این خدمات گروه معتبری ندارند و سایت نشانشان نمی‌دهد. برای هرکدام گروهی انتخاب کنید.'],
    'services.svc.name': ['Service name', 'اسم الخدمة', 'نام خدمت'],
    'services.svc.nameHint': ['The service’s heading on the Services list. Also used in briefs.', 'عنوان الخدمة في قائمة الخدمات، ويُستخدم أيضاً في الطلبات.', 'عنوان خدمت در فهرست خدمات؛ در درخواست‌ها هم به کار می‌رود.'],
    'services.svc.desc': ['Description', 'الوصف', 'توضیح'],
    'services.svc.descHint': ['One sentence under the name.', 'جملة واحدة تحت الاسم.', 'یک جمله زیر نام.'],
    'services.svc.group': ['Group', 'المجموعة', 'گروه'],
    'services.svc.for': ['Answers these swells', 'تجيب عن هذه الموجات', 'پاسخ به این موج‌ها'],
    'services.svc.forHint': ['When a visitor has picked one of these, the service gets a dot and quotes their problem.', 'عندما يختار الزائر إحداها، تُعلَّم الخدمة بنقطة وتقتبس مشكلته.', 'وقتی بازدیدکننده یکی از این‌ها را انتخاب کرده باشد، این خدمت نقطه می‌گیرد و مشکل او را نقل می‌کند.'],
    'services.svc.forNone': ['Answers no swell yet, so a visitor’s picks never light it up.', 'لا تجيب عن أي موجة بعد، فلا تُبرزها اختيارات الزائر أبداً.', 'هنوز به هیچ موجی پاسخ نمی‌دهد، پس انتخاب‌های بازدیدکننده هرگز برجسته‌اش نمی‌کنند.'],
    'services.svc.forShort': ['Answers no swell', 'لا تجيب عن موجة', 'بدون موج'],
    'services.svc.idHint': ['Briefs and analytics point to this id. It never changes.', 'تشير الطلبات والتحليلات إلى هذا المعرّف، ولا يتغيّر أبداً.', 'درخواست‌ها و آمار به این شناسه اشاره می‌کنند و هرگز تغییر نمی‌کند.'],
    'services.svc.untitled': ['Untitled service', 'خدمة بلا اسم', 'خدمت بی‌نام'],
    'services.svc.drag': ['Drag to reorder, or ⌥↑ ⌥↓', 'اسحب لإعادة الترتيب، أو ⌥↑ ⌥↓', 'برای تغییر ترتیب بکشید، یا ⌥↑ ⌥↓'],
    'services.svc.moveTo': ['Move to {name}', 'انقلها إلى {name}', 'انتقال به {name}'],
    'services.svc.dup': ['Duplicate service', 'تكرار الخدمة', 'تکثیر خدمت'],
    'services.svc.del': ['Delete service', 'حذف الخدمة', 'حذف خدمت'],
    'services.svc.actions': ['Service actions', 'إجراءات الخدمة', 'کارهای خدمت'],
    'services.svc.duped': ['Duplicated “{name}”.', 'كُرّرت «{name}».', '«{name}» تکثیر شد.'],
    'services.svc.deleted': ['Deleted “{name}”.', 'حُذفت «{name}».', '«{name}» حذف شد.'],
    'services.svc.moved': ['Moved “{name}”.', 'نُقلت «{name}».', '«{name}» جابه‌جا شد.'],
    'services.svc.movedGrp': ['Moved “{name}” to {group}.', 'نُقلت «{name}» إلى {group}.', '«{name}» به {group} منتقل شد.'],
    'services.svc.added': ['Added “{name}” to {group}.', 'أُضيفت «{name}» إلى {group}.', '«{name}» به {group} افزوده شد.'],
    'services.svc.lbl.reorder': ['Reorder services', 'إعادة ترتيب الخدمات', 'تغییر ترتیب خدمات'],
    'services.svc.lbl.add': ['Add service', 'إضافة خدمة', 'افزودن خدمت'],
    'services.svc.lbl.dup': ['Duplicate service', 'تكرار خدمة', 'تکثیر خدمت'],
    'services.svc.lbl.del': ['Delete service', 'حذف خدمة', 'حذف خدمت'],
    'services.svc.lbl.group': ['Service group', 'مجموعة الخدمة', 'گروه خدمت'],
    'services.svc.lbl.for': ['Swells a service answers', 'الموجات التي تجيب عنها الخدمة', 'موج‌هایی که خدمت به آن‌ها پاسخ می‌دهد'],
    'services.svc.lbl.restore': ['Restore services', 'استرجاع الخدمات', 'بازگرداندن خدمات'],
    'services.svc.addTitle': ['Add a service', 'إضافة خدمة', 'افزودن خدمت'],
    'services.svc.addName': ['Name in English', 'الاسم بالإنجليزية', 'نام به انگلیسی'],
    'services.svc.addNameAr': ['Name in Arabic', 'الاسم بالعربية', 'نام به عربی'],
    'services.svc.addOk': ['Create service', 'إنشاء الخدمة', 'ساختن خدمت'],
    'services.planHidden': ['The Services section is hidden on the site right now, so visitors don’t see this list.', 'قسم الخدمات مخفي في الموقع الآن، فلا يرى الزوار هذه القائمة.', 'بخش خدمات اکنون در سایت پنهان است و بازدیدکنندگان این فهرست را نمی‌بینند.'],
    'services.unhide': ['Show it on the site', 'أظهره في الموقع', 'نمایش در سایت'],
    'services.shown': ['The Services section is back on the site.', 'عاد قسم الخدمات إلى الموقع.', 'بخش خدمات به سایت برگشت.'],
    'services.cmd.add': ['Add a swell', 'إضافة موجة', 'افزودن موج'],
    'services.cmd.addSvc': ['Add a service', 'إضافة خدمة', 'افزودن خدمت'],
    'services.cmd.groups': ['Edit service groups', 'تعديل مجموعات الخدمات', 'ویرایش گروه‌های خدمات'],
    'services.cmd.preview': ['Preview the swell picker', 'معاينة منتقي الموجات', 'پیش‌نمایش انتخاب موج'],
    'services.cmd.plan': ['Preview the Services list', 'معاينة قائمة الخدمات', 'پیش‌نمایش فهرست خدمات'],
  };
  const DICT = { en: {}, ar: {}, fa: {} };
  for (const [k, [en, ar, fa]] of Object.entries(I)) { DICT.en[k] = en; DICT.ar[k] = ar; DICT.fa[k] = fa; }
  MA.i18n.add(DICT);
  const LL = k => ({ en: I[k][0], ar: I[k][1], fa: I[k][2] });
  const t = (k, v) => MA.t('services.' + k, v);

  /* ---------------- data helpers ---------------- */
  const C = () => MA.content;
  const list = () => C().get('swells') || [];
  const indexOf = id => list().findIndex(s => s.id === id);
  const cl = MA.siteLang; // site copy shown inside the admin (the site has English and Arabic only)
  const txt = (s, k, l = cl()) => MA.strip(s?.[l]?.[k] || s?.en?.[k] || s?.ar?.[k] || '');
  const nameOf = s => txt(s, 'service') || s?.id || '';
  const quote = v => cl() === 'ar' ? `«${v}»` : `“${v}”`; // quotes follow the language of the quoted site copy
  /** Site copy quoted inside an admin sentence: escaped and isolated with its language, so it reads right in RTL. */
  const quoteSite = v => `<span${MA.siteText.attrs(cl())}>${esc(v)}</span>`;
  const sep = () => MA.isRTL() ? '، ' : ', ';
  const pad2 = n => MA.num(n, { minimumIntegerDigits: 2, useGrouping: false });
  const steps = (l = cl()) => C().get(`steps/${l}`) || C().get('steps/en') || [];
  const stageTitle = (k, l = cl()) => MA.strip(C().get(`stages/${k}/${l}/title`) || C().get(`stages/${k}/en/title`) || '');
  const ratioText = r => `${MA.num(Math.floor(r * 10) / 10, { maximumFractionDigits: 1 })}:${MA.num(1)}`;
  const rangeLabel = r => t('r.' + r, { n: MA.num(parseInt(r, 10)) });
  /** The period a change is compared with, as dates ("13 Aug – 11 Sep"). */
  const prevLabel = r => { const p = MA.metrics.range(r).prev, d = x => MA.date(x + 'T12:00', { day: 'numeric', month: 'short' }); return p ? `${d(p.from)} – ${d(p.to)}` : ''; };
  const uiPrefs = () => Object.assign({ range: '30d' }, MA.db.get('services.ui', {}));
  const setUi = patch => MA.db.set('services.ui', { ...uiPrefs(), ...patch });
  /* swell tiles: the two theme colours of a swell's tint, with its icon. Shared with Process through MA.swells. */
  const hexOk = v => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(v || '').trim());
  const hex = tk => { const v = (C()?.get('theme') || {})[tk]; return hexOk(v) ? v : BRAND[tk] || '#888888'; };
  const lum = hx => { let v = hx.trim().slice(1); if (v.length === 3) v = v.split('').map(c => c + c).join(''); const [r, g, b] = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  /** The card surface tiles sit on, in the current admin theme. */
  let surf = ['', ''];
  const surface = () => {
    const k = document.documentElement.dataset.theme || ''; if (surf[0] === k && surf[1]) return surf[1];
    const v = getComputedStyle(document.documentElement).getPropertyValue('--panel');
    surf = [k, hexOk(v) ? v.trim() : MA.isDark() ? '#11143A' : '#FFFDF8']; return surf[1];
  };
  /** A tile whose colour is close to the surface (Deep in the dark theme, Shore or Foam in the light one) gets a visible hairline. */
  const near = tk => ratio(hex(tk), surface()) < 1.5;
  const tintOf = s => { const tt = Array.isArray(s?.tint) ? s.tint : []; return [TOKENS.includes(tt[0]) ? tt[0] : 'tide', TOKENS.includes(tt[1]) ? tt[1] : 'shore']; };
  const iconSvg = name => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MA.site.info?.icons?.[name] || ''}</svg>`;
  const tile = (s, cls = '', base = 'sw-tile') => { const [bg, fg] = tintOf(s); return h('span', { class: [base, cls, near(bg) ? 'near' : ''].filter(Boolean).join(' '), dataset: { bg }, style: `--tb:var(--st-${bg});--tf:var(--st-${fg})`, html: iconSvg(s?.icon) }); };
  /** After the admin theme or the brand colours change: re-check which tiles need the hairline. */
  const refreshNear = root => root && MA.$$('[data-bg]', root).forEach(el => el.classList.toggle('near', near(el.dataset.bg)));
  const applyThemeTo = el => { TOKENS.forEach(tk => el?.style.setProperty('--st-' + tk, hex(tk))); refreshNear(el); };
  MA.swells = { TOKENS, BRAND, hex, ratio, near, tintOf, icon: iconSvg, tile, refreshNear, applyTheme: applyThemeTo };
  const uniqueIn = (taken, base, fallback) => { base = String(base || '').slice(0, 40).replace(/-+$/, '') || fallback; let id = base, n = 2; while (taken.has(id)) id = `${base.slice(0, 36)}-${n++}`; return id; };
  const uniqueId = base => uniqueIn(new Set(list().map(s => s.id)), base, 'swell');
  const emptyFields = s => {
    const out = [];
    for (const l of ['en', 'ar']) {
      FIELDS.forEach(k => { if (!MA.strip(s?.[l]?.[k] || '').trim()) out.push({ k, l, tpl: `{lang}/${k}` }); });
      [0, 1, 2, 3].forEach(k => { if (!MA.strip(s?.[l]?.steps?.[k] || '').trim()) out.push({ k: 'step', n: k, l, tpl: `{lang}/steps/${k}` }); });
    }
    return out;
  };
  const fieldLabel = f => f.k === 'step' ? t('stepLabel', { n: MA.num(f.n + 1), title: stageTitle(f.n) }) : t('f.' + f.k);
  const pubState = s => { const p = (C().published?.swells || []).find(x => x.id === s.id); return !p ? 'new' : MA.eq(p, s) ? 'live' : 'edited'; };
  const linkedWords = id => (C().get('make') || []).flatMap((row, r) => (row || []).map((w, k) => ({ ...w, r, k }))).filter(w => w?.swell === id);
  const rail = p => `<svg class="sw-rail" viewBox="0 0 46 10" aria-hidden="true"><path d="M4 5h38"/>${[0, 1, 2, 3].map(k => `<circle cx="${(4 + k * 12.67).toFixed(2)}" cy="5" r="${k === p ? 3.6 : 2.1}"${k === p ? ' class="on"' : ''}/>`).join('')}</svg>`;

  /* services + groups */
  const svcs = () => C().get('services') || [];
  const svcIndex = id => svcs().findIndex(s => s.id === id);
  const gOf = s => { const g = Number(s?.group); return Number.isInteger(g) && g >= 0 && g <= 3 ? g : -1; };
  const grpName = (g, l = cl()) => { const G = C().get('sgroups') || {}; return MA.strip(G[l]?.[g]?.name || G.en?.[g]?.name || '') || t('grp', { n: MA.num(g + 1) }); };
  const grpLine = (g, l = cl()) => { const G = C().get('sgroups') || {}; return MA.strip(G[l]?.[g]?.line || G.en?.[g]?.line || ''); };
  const svcName = (s, l = cl()) => txt(s, 'name', l) || t('svc.untitled');
  const svcEmpty = s => ['en', 'ar'].flatMap(l => ['name', 'desc'].filter(k => !MA.strip(s?.[l]?.[k] || '').trim()).map(k => ({ k, l })));
  const svcPub = s => { const p = (C().published?.services || []).find(x => x.id === s.id); return !p ? 'new' : MA.eq(p, s) ? 'live' : 'edited'; };
  const answering = swId => svcs().filter(s => (s.for || []).includes(swId));

  /** Taps per swell for a range, straight from MA.metrics (sample-stamped when the generator is on). */
  function taps(rangeKey) {
    const p = MA.metrics.period(rangeKey), by = {}; let total = 0;
    for (const s of list()) {
      const vals = p.rows.map(r => r.picks?.[s.id] || 0), cur = vals.reduce((a, b) => a + b, 0), prev = p.prevRows.reduce((a, r) => a + (r.picks?.[s.id] || 0), 0);
      by[s.id] = { vals, cur, prev }; total += cur;
    }
    const src = MA.metrics.source();
    return { by, total, n: p.rows.length, src, sample: src === 'sample' || src === 'mixed', none: src === 'none' };
  }

  /* ---------------- swell actions (reversible ones run at once and offer undo) ---------------- */
  const can = () => MA.can('content.edit');
  const replaceSwells = (arr, label) => C().replace('swells', arr, label);
  /** Put swells (and, after a delete, the make words and services that pointed at one) back: one undo step. */
  function restore(beforeSwells, beforeMake, beforeSvcs) {
    C().batch(t('lbl.restore'), () => {
      replaceSwells(beforeSwells, t('lbl.restore'));
      if (beforeMake) C().replace('make', beforeMake, t('lbl.restore'));
      if (beforeSvcs) C().replace('services', beforeSvcs, t('lbl.restore'));
    });
  }
  function move(id, delta) {
    if (!can()) return;
    const arr = MA.clone(list()), i = arr.findIndex(s => s.id === id), j = i + delta;
    if (i < 0 || j < 0 || j >= arr.length) return;
    const before = MA.clone(arr);
    [arr[i], arr[j]] = [arr[j], arr[i]];
    S.focusId = id;
    replaceSwells(arr, t('lbl.reorder'));
    MA.toast(t('moved', { name: esc(nameOf(arr[j])) }), { undo: () => restore(before) });
  }
  function reorder(ids) {
    if (!can()) return;
    const arr = list(), before = MA.clone(arr);
    if (MA.eq(ids, arr.map(s => s.id))) return;
    const next = ids.map(id => arr.find(s => s.id === id)).filter(Boolean);
    arr.forEach(s => { if (!next.includes(s)) next.push(s); });
    replaceSwells(MA.clone(next), t('lbl.reorder'));
    MA.toast(t('reordered'), { undo: () => restore(before) });
  }
  function duplicate(id) {
    if (!can()) return null;
    const arr = MA.clone(list()), i = arr.findIndex(s => s.id === id); if (i < 0) return null;
    const before = MA.clone(arr), s = arr[i], copy = MA.clone(s);
    copy.id = uniqueId(MA.slug((MA.strip(s.en?.service) || s.id) + ' copy'));
    copy.en = { ...copy.en, service: (MA.strip(s.en?.service || '') + ' (copy)').trim() };
    copy.ar = { ...copy.ar, service: (MA.strip(s.ar?.service || '') + ' (نسخة)').trim() };
    arr.splice(i + 1, 0, copy);
    replaceSwells(arr, t('lbl.duplicate'));
    MA.activity.log({ action: 'swell.duplicate', target: nameOf(copy), module: ID, href: '#/services/' + copy.id });
    MA.toast(t('duplicated', { name: esc(nameOf(s)) }), { undo: () => { if (S.mode === 'detail' && S.id === copy.id) MA.go('#/services/' + encodeURIComponent(id)); restore(before); } });
    return copy.id;
  }
  function remove(id) {
    if (!can()) return;
    const arr = list(), s = arr.find(x => x.id === id); if (!s) return;
    const name = nameOf(s), linked = linkedWords(id), others = arr.filter(x => x.id !== id);
    const beforeSwells = MA.clone(arr), beforeMake = MA.clone(C().get('make') || []), beforeSvcs = MA.clone(svcs());
    const run = to => {
      if (S.mode === 'detail' && S.id === id) MA.go('#/services');
      // services that answered it would otherwise point at nothing
      const nFor = beforeSvcs.filter(x => (x.for || []).includes(id)).length;
      // one undo step (⌘Z, the toast, History) for the swell, its make words and the services that answered it
      C().batch(t('lbl.delete'), () => {
        if (to) C().replace('make', beforeMake.map(row => (row || []).map(w => w?.swell === id ? { ...w, swell: to } : w)), t('lbl.relink'));
        if (nFor) C().replace('services', beforeSvcs.map(x => (x.for || []).includes(id) ? { ...x, for: x.for.filter(f => f !== id) } : x), t('lbl.delete'));
        replaceSwells(MA.clone(others), t('lbl.delete'));
      });
      MA.activity.log({ action: 'swell.delete', target: name, module: ID, href: '#/services' });
      const toName = to ? nameOf(others.find(x => x.id === to)) : '';
      const msg = (to ? t('deletedRelinked', { name: esc(name), count: linked.length, n: MA.num(linked.length), to: esc(toName) }) : t('deleted', { name: esc(name) })) + (nFor ? ' ' + t('deletedFor', { count: nFor, n: MA.num(nFor) }) : '');
      MA.toast(msg, { undo: () => restore(beforeSwells, to ? beforeMake : null, nFor ? beforeSvcs : null) });
    };
    if (!linked.length) return run(null);
    // words in "What we make" open this swell: decide where they point before it goes
    let target = others[0]?.id || '';
    const body = h('div.m-services.sw-modal.stack.sw-relink',
      h('p.muted', { html: t('relink.text', { count: linked.length, n: MA.num(linked.length), name: `<b${MA.siteText.attrs(cl())}>${esc(name)}</b>` }) }),
      h('div.row.wrap.sw-chips', linked.map(w => h('span.tag', { dir: 'auto', lang: cl() }, MA.strip(w[cl()] || w.en || '')))),
      others.length ? MA.ui.field(esc(t('relink.to')), MA.ui.select(others.map(o => ({ value: o.id, label: nameOf(o) })), target, v => { target = v; }, { label: t('relink.to') }))
        : h('div.callout.warn', { html: MA.icon('warn') + `<span>${esc(t('relink.none'))}</span>` }));
    MA.ui.modal({ title: esc(t('relink.title')), body, actions: [
      { label: MA.t('cancel'), kind: 'ghost' },
      others.length ? { label: t('relink.ok'), kind: 'primary', run: () => run(target) } : { label: t('relink.anyway'), kind: 'danger solid', run: () => run(null) },
    ] });
  }
  function create({ name, nameAr = '', problem = '' }) {
    const arr = MA.clone(list()), before = MA.clone(arr), icons = Object.keys(MA.site.info?.icons || {}), used = new Set(arr.map(s => s.icon));
    const s = { id: uniqueId(MA.slug(name)), icon: icons.find(k => !used.has(k)) || icons[0] || 'strategy', phase: 2, tint: ['tide', 'shore'],
      en: { problem, service: name, desc: '', noun: '', steps: ['', '', '', ''] }, ar: { problem: '', service: nameAr, desc: '', noun: '', steps: ['', '', '', ''] } };
    arr.push(s);
    replaceSwells(arr, t('lbl.add'));
    MA.activity.log({ action: 'swell.add', target: name, module: ID, href: '#/services/' + s.id });
    MA.toast(t('added', { name: esc(name) }), { undo: () => { if (S.mode === 'detail' && S.id === s.id) MA.go('#/services'); restore(before); } });
    return s;
  }
  function openAdd() {
    if (!can() || document.querySelector('.sw-add')) return;
    const nameEn = h('input.input', { placeholder: PH.service.en, 'aria-label': t('addName'), maxLength: 80, lang: 'en', dir: 'ltr' });
    const nameAr = h('input.input', { dir: 'rtl', lang: 'ar', placeholder: PH.service.ar, 'aria-label': t('addNameAr'), maxLength: 80 });
    const probEn = h('input.input', { placeholder: PH.problem.en, 'aria-label': t('addProblem'), maxLength: 80, lang: 'en', dir: 'ltr' });
    const idOut = h('code.sw-idout'), err = h('p.err', { hidden: true, role: 'alert' });
    const sync = () => { idOut.textContent = uniqueId(MA.slug(nameEn.value)); };
    nameEn.addEventListener('input', () => { sync(); err.hidden = true; }); sync();
    const opt = v => `${esc(v)} <span class="faint" style="font-weight:400">· ${esc(t('optional'))}</span>`;
    const go = () => {
      const name = nameEn.value.trim();
      if (!name) { err.textContent = t('addErr'); err.hidden = false; nameEn.focus(); return false; }
      const s = create({ name, nameAr: nameAr.value.trim(), problem: probEn.value.trim() });
      C().focusAfterRoute = { tpl: `swells/${indexOf(s.id)}/{lang}/${probEn.value.trim() ? 'noun' : 'problem'}`, lang: 'en' };
      MA.go('#/services/' + encodeURIComponent(s.id));
    };
    const L = MA.ui.modal({ title: esc(t('addTitle')), body: h('div.m-services.sw-modal.stack.sw-add',
      MA.ui.field(esc(t('addName')), h('div.stack.tight', nameEn, err)),
      MA.ui.field(opt(t('addNameAr')), nameAr),
      MA.ui.field(opt(t('addProblem')), probEn),
      h('div.sw-idrow', h('div.row', h('span.small.muted', t('addId')), idOut), h('p.hint.small.faint', t('addIdHint')))),
      actions: [{ label: MA.t('cancel'), kind: 'ghost' }, { label: t('addOk'), kind: 'primary', icon: 'plus', run: go }] });
    [nameEn, nameAr, probEn].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (go() !== false) L.close(true); } }));
  }

  /* ---------------- service actions ---------------- */
  const replaceSvcs = (arr, label) => C().replace('services', arr, label);
  const restoreSvcs = before => replaceSvcs(before, t('svc.lbl.restore'));
  const uniqueSvcId = base => uniqueIn(new Set(svcs().map(s => s.id)), base, 'service');
  function svcCreate({ name, nameAr = '', group = 0 }) {
    const arr = MA.clone(svcs()), before = MA.clone(arr);
    const s = { id: uniqueSvcId(MA.slug(name)), group, for: [], en: { name, desc: '' }, ar: { name: nameAr, desc: '' } };
    let at = -1; arr.forEach((x, i) => { if (gOf(x) === group) at = i; });
    arr.splice(at < 0 ? arr.length : at + 1, 0, s);
    replaceSvcs(arr, t('svc.lbl.add'));
    MA.activity.log({ action: 'service.add', target: name, module: ID, href: '#/services?tab=services' });
    MA.toast(t('svc.added', { name: esc(name), group: esc(grpName(group)) }), { undo: () => restoreSvcs(before) });
    return s;
  }
  function svcDuplicate(id) {
    if (!can()) return null;
    const arr = MA.clone(svcs()), i = arr.findIndex(s => s.id === id); if (i < 0) return null;
    const before = MA.clone(arr), s = arr[i], copy = MA.clone(s);
    copy.id = uniqueSvcId(MA.slug(s.id + ' copy'));
    copy.en = { ...copy.en, name: (MA.strip(s.en?.name || '') + ' (copy)').trim() };
    copy.ar = { ...copy.ar, name: (MA.strip(s.ar?.name || '') + ' (نسخة)').trim() };
    arr.splice(i + 1, 0, copy);
    S.open.add(copy.id); S.pendingFocus = { tpl: `services/${i + 1}/{lang}/name`, lang: 'en' };
    replaceSvcs(arr, t('svc.lbl.dup'));
    MA.toast(t('svc.duped', { name: esc(svcName(s)) }), { undo: () => restoreSvcs(before) });
    return copy.id;
  }
  function svcRemove(id) {
    if (!can()) return;
    const arr = svcs(), s = arr.find(x => x.id === id); if (!s) return;
    const before = MA.clone(arr), i = arr.indexOf(s);
    S.open.delete(id);
    replaceSvcs(MA.clone(arr.filter(x => x.id !== id)), t('svc.lbl.del'));
    MA.activity.log({ action: 'service.delete', target: svcName(s, 'en'), module: ID, href: '#/services?tab=services' });
    MA.toast(t('svc.deleted', { name: esc(svcName(s)) }), { undo: () => restoreSvcs(before) });
    // keep the keyboard somewhere sensible
    S.focusAfter = { id: (arr[i + 1] && gOf(arr[i + 1]) === gOf(s) ? arr[i + 1] : arr[i - 1])?.id, sel: '.sv-toggle' };
  }
  /** Swap with the previous / next service of the same group (the site lists each group in array order). */
  function svcMove(id, d) {
    if (!can()) return;
    const arr = MA.clone(svcs()), i = arr.findIndex(s => s.id === id); if (i < 0) return;
    const g = gOf(arr[i]), same = arr.map((s, k) => ({ s, k })).filter(x => gOf(x.s) === g), p = same.findIndex(x => x.k === i), q = same[p + d];
    if (!q) return;
    const before = MA.clone(arr);
    [arr[i], arr[q.k]] = [arr[q.k], arr[i]];
    S.focusAfter = { id, sel: '.sv-toggle' };
    replaceSvcs(arr, t('svc.lbl.reorder'));
    MA.toast(t('svc.moved', { name: esc(svcName(arr[q.k])) }), { undo: () => restoreSvcs(before) });
  }
  function svcReorderGroup(g, ids) {
    if (!can()) return;
    const arr = svcs(), cur = arr.filter(s => gOf(s) === g);
    if (MA.eq(ids, cur.map(s => s.id))) return;
    const queue = ids.map(id => cur.find(s => s.id === id)).filter(Boolean);
    cur.forEach(s => { if (!queue.includes(s)) queue.push(s); });
    const before = MA.clone(arr), next = arr.map(s => gOf(s) === g ? queue.shift() : s);
    replaceSvcs(MA.clone(next), t('svc.lbl.reorder'));
    MA.toast(t('reordered'), { undo: () => restoreSvcs(before) });
  }
  function svcSetGroup(id, g) {
    if (!can()) return;
    const arr = MA.clone(svcs()), i = arr.findIndex(s => s.id === id); if (i < 0 || gOf(arr[i]) === g) return;
    const before = MA.clone(arr), s = arr.splice(i, 1)[0];
    s.group = g;
    // land at the end of its new group, so it shows up where the eye expects it
    let at = -1; arr.forEach((x, k) => { if (gOf(x) === g) at = k; });
    arr.splice(at < 0 ? arr.length : at + 1, 0, s);
    S.focusAfter = { id, sel: '.sv-groupsel' };
    replaceSvcs(arr, t('svc.lbl.group'));
    MA.toast(t('svc.movedGrp', { name: esc(svcName(s)), group: esc(grpName(g)) }), { undo: () => restoreSvcs(before) });
  }
  function svcToggleFor(id, swId) {
    if (!can()) return;
    const n = svcIndex(id); if (n < 0) return;
    const cur = new Set(svcs()[n].for || []), order = list().map(s => s.id);
    cur.has(swId) ? cur.delete(swId) : cur.add(swId);
    // keep the swells in site order; ids of swells that no longer exist are dropped
    const next = [...cur].filter(x => order.includes(x)).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    C().set(`services/${n}/for`, next, { label: t('svc.lbl.for'), coalesce: false });
  }
  function openSvcAdd(group = 0) {
    if (!can() || document.querySelector('.sv-add')) return;
    const nameEn = h('input.input', { placeholder: PH.svcName.en, 'aria-label': t('svc.addName'), maxLength: 80, lang: 'en', dir: 'ltr' });
    const nameAr = h('input.input', { dir: 'rtl', lang: 'ar', placeholder: PH.svcName.ar, 'aria-label': t('svc.addNameAr'), maxLength: 80 });
    let g = MA.clamp(+group || 0, 0, 3);
    const sel = MA.ui.select([0, 1, 2, 3].map(k => ({ value: k, label: `${pad2(k + 1)} · ${grpName(k)}` })), g, v => { g = +v; }, { label: t('svc.group') });
    const idOut = h('code.sw-idout'), err = h('p.err', { hidden: true, role: 'alert' });
    const sync = () => { idOut.textContent = uniqueSvcId(MA.slug(nameEn.value)); };
    nameEn.addEventListener('input', () => { sync(); err.hidden = true; }); sync();
    const opt = v => `${esc(v)} <span class="faint" style="font-weight:400">· ${esc(t('optional'))}</span>`;
    const go = () => {
      const name = nameEn.value.trim();
      if (!name) { err.textContent = t('addErr'); err.hidden = false; nameEn.focus(); return false; }
      const s = svcCreate({ name, nameAr: nameAr.value.trim(), group: g });
      S.open.add(s.id); S.pendingFocus = { tpl: `services/${svcIndex(s.id)}/{lang}/desc`, lang: 'en' };
      if (S.mode !== 'services') MA.go('#/services?tab=services'); else schedule();
    };
    const L = MA.ui.modal({ title: esc(t('svc.addTitle')), body: h('div.m-services.sw-modal.stack.sv-add',
      MA.ui.field(esc(t('svc.addName')), h('div.stack.tight', nameEn, err)),
      MA.ui.field(opt(t('svc.addNameAr')), nameAr),
      MA.ui.field(esc(t('svc.group')), sel),
      h('div.sw-idrow', h('div.row', h('span.small.muted', t('addId')), idOut), h('p.hint.small.faint', t('svc.idHint')))),
      actions: [{ label: MA.t('cancel'), kind: 'ghost' }, { label: t('svc.addOk'), kind: 'primary', icon: 'plus', run: go }] });
    [nameEn, nameAr].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (go() !== false) L.close(true); } }));
  }

  /* ---------------- page state ---------------- */
  const S = { root: null, main: null, pane: null, pvSec: null, viewSec: null, seg: null, mode: 'list', id: null, i: -1, focusId: null, listEl: null, refs: {}, sorts: [],
    open: new Set(), gOpen: new Set(), pendingFocus: null, focusAfter: null };
  const applyTheme = () => applyThemeTo(S.root);
  const destroySorts = () => { S.sorts.splice(0).forEach(x => x.destroy()); };

  function mount(view) {
    S.root = h('div.m-services');
    S.main = h('div.sw-main');
    // the shared preview pane: one toggle (in each page head), hideable, resizable, phone layout when narrow, `p` toggles it
    adoptOldPrefs();
    S.pvSec = S.viewSec = pvSection();
    S.seg = MA.ui.seg([{ value: 'swells', label: t('pv.film') }, { value: 'plan', label: t('pv.plan') }], S.pvSec, v => { S.pvSec = v; S.pane?.goto(v); }, { size: 'sm', label: t('pv.aim') });
    S.pane = MA.ui.previewPane({ key: ID, section: S.pvSec, device: 'auto', head: [S.seg] });
    S.root.append(MA.ui.previewPane.split(S.main, S.pane));
    view.append(S.root);
    applyTheme();
    // page keys: page-scoped, removed by the core when the route leaves this module
    MA.keys.bindView('j', () => nav(1), () => t('k.next'));
    MA.keys.bindView('k', () => nav(-1), () => t('k.prev'));
    MA.keys.bindView('n', () => (S.mode === 'services' ? openSvcAdd(S.lastGroup || 0) : openAdd()), () => t('k.new'));
    MA.cleanup(() => { destroySorts(); S.root = S.pane = S.listEl = S.seg = null; clearTimeout(pending); pending = 0; });
    MA.onView('content:change', onContent);
    MA.onView('content:published', () => schedule());
    MA.onView('metrics', () => { if (S.mode !== 'services') schedule(); });
    MA.onView('sample', () => { if (S.mode !== 'services') schedule(); });
    MA.onView('prefs', () => refreshNear(S.root)); // light / dark: Deep tiles need their hairline on a dark card
  }
  let pending = 0;
  const schedule = () => { if (pending) return; pending = setTimeout(() => { pending = 0; if (S.root?.isConnected) draw(MA.ctx(), true); }, 0); };
  let badgeN = -1;
  function onContent({ path = '' } = {}) {
    if (!S.root?.isConnected) return;
    const p = String(path).split('/'), top = p[0];
    if (top === 'swells' || top === 'services' || path === '') { const n = badgeCount(); if (n !== badgeN) { badgeN = n; MA.renderNav?.(); } }
    if (top === 'theme' || path === '') applyTheme();
    if (path === '') return schedule();
    if (S.mode === 'list') { if (['swells', 'steps', 'make'].includes(top)) schedule(); return; }
    if (S.mode === 'services') {
      if (top === 'services') {
        if (p.length <= 2 || p[2] === 'group' || p[2] === 'id') return schedule();
        const li = S.main.querySelector(`.sv-row[data-n="${+p[1]}"]`); if (li) fillSvcRow(li);
        return;
      }
      if (top === 'sgroups') return refreshGroupHeads();
      if (['swells', 'sections', 'theme'].includes(top)) return schedule();
      return;
    }
    if (path === 'swells' || top === 'make') { if (indexOf(S.id) !== S.i) schedule(); else refreshDetail(); }
    else if (['swells', 'steps', 'stages', 'theme', 'ui', 'services', 'sgroups', 'sections'].includes(top)) refreshDetail();
  }
  const badgeCount = () => list().filter(s => emptyFields(s).length).length + svcs().filter(s => svcEmpty(s).length).length;

  /* ---------------- preview (MA.ui.previewPane, kept alive across list / detail / tabs: moving an iframe reloads it) ---------------- */
  const pvSection = () => S.mode === 'services' ? 'plan' : 'swells';
  /** This page kept its own preview settings before the shared pane: carry "hidden" and the width over once. */
  function adoptOldPrefs() {
    const old = MA.db.get('services.ui', {}), all = MA.db.get('pvPanes', {});
    if (all[ID] || !('preview' in old || 'width' in old)) return;
    all[ID] = { open: old.preview !== false, ...(+old.width ? { width: +old.width } : {}) };
    MA.db.set('pvPanes', all);
    const { preview, width, device, ...rest } = old; MA.db.set('services.ui', rest);
  }
  /** Point the preview at the part of the site this view edits (only when the view changes, so a manual choice sticks). */
  function aimPreview() {
    const sec = pvSection(); if (sec === S.viewSec) return;
    S.viewSec = sec; if (sec === S.pvSec) return;
    S.pvSec = sec; S.pane?.goto(sec); S.seg?.set(sec);
  }
  /** Show a field in the preview (opening it if hidden), aimed at the right part of the site. */
  function showInPreview(key, sec) {
    if (!S.pane) return;
    if (sec && sec !== S.pvSec) { S.pvSec = sec; S.pane.goto(sec); S.seg?.set(sec); }
    S.pane.flash(key);
  }

  /* ---------------- routing inside the page ---------------- */
  function draw(ctx, soft) {
    const field = ctx.query.get('field') || '';
    let id = ctx.sub[0] || null, tab = ctx.query.get('tab') === 'services' ? 'services' : 'swells';
    const m = !id && field.match(/^swells\/(\d+)\//);
    if (m && list()[+m[1]]) { // a click in the preview or a search hit: open that swell's editor
      id = list()[+m[1]].id;
      history.replaceState(null, '', `#/${ID}/${encodeURIComponent(id)}?field=${encodeURIComponent(field)}`);
    }
    if (!id && /^(services|sgroups)\//.test(field)) {
      tab = 'services';
      const n = field.match(/^services\/(\d+)\//); if (n && svcs()[+n[1]]) S.open.add(svcs()[+n[1]].id);
      const g = field.match(/^sgroups\/\{lang\}\/(\d)\//); if (g) S.gOpen.add(+g[1]);
    }
    const y = scrollY;
    if (id) renderDetail(id); else if (tab === 'services') renderServices(); else renderList();
    MA.setCrumbs(crumbsFor(id, tab));
    aimPreview();
    if (soft) scrollTo(0, y); else if (!field) scrollTo(0, 0);
  }
  const crumbsFor = (id, tab) => {
    const s = id && list().find(x => x.id === id);
    if (s) return [{ label: nameOf(s), href: '#/services/' + encodeURIComponent(id) }];
    return tab === 'services' && !id ? [{ label: t('tab.services'), href: '#/services?tab=services' }] : [];
  };
  function nav(d) {
    if (!S.root?.isConnected) return;
    if (S.mode === 'detail') { const n = list()[indexOf(S.id) + d]; if (n) MA.go('#/services/' + encodeURIComponent(n.id)); return; }
    const rows = S.mode === 'services' ? MA.$$('.sv-row:not([hidden]) .sv-toggle', S.main) : MA.$$('.sw-row', S.main); if (!rows.length) return;
    const cur = rows.findIndex(r => r === document.activeElement || r.contains(document.activeElement));
    const next = rows[MA.clamp(cur < 0 ? (d > 0 ? 0 : rows.length - 1) : cur + d, 0, rows.length - 1)];
    next.focus(); next.scrollIntoView({ block: 'nearest' });
  }
  function header(tab) {
    const editable = can();
    const add = tab === 'services' ? MA.ui.btn(t('svc.add'), { icon: 'plus', kind: 'primary', onclick: () => openSvcAdd(S.lastGroup || 0) }) : MA.ui.btn(t('add'), { icon: 'plus', kind: 'primary', onclick: openAdd });
    S.main.append(MA.ui.pageHead({ title: esc(MA.L(def.title)), sub: esc(t('sub')), actions: [S.pane.toggle, editable ? add : MA.ui.badge(MA.t('readOnly'), 'outline')] }));
    const tabs = MA.ui.tabs([{ value: 'swells', label: t('tab.swells'), icon: 'swell', count: MA.num(list().length) }, { value: 'services', label: t('tab.services'), icon: 'grid', count: MA.num(svcs().length) }], tab,
      v => { MA.setQuery({ tab: v === 'services' ? 'services' : null, field: null }); draw(MA.ctx()); });
    tabs.classList.add('sw-tabs');
    S.main.append(tabs);
  }

  /* ---------------- swells list ---------------- */
  function renderList() {
    S.mode = 'list'; S.id = null; S.i = -1; S.refs = {};
    destroySorts(); S.listEl = null;
    const arr = list(), T = taps(uiPrefs().range), editable = can();
    const hadFocus = document.activeElement?.closest?.('.sw-row')?.dataset.id || S.focusId;
    S.main.innerHTML = '';
    header('swells');
    if (!arr.length) {
      S.main.append(h('div.card', MA.ui.empty({ title: esc(t('emptyTitle')), text: esc(t('emptyText')), pose: 'present',
        actions: editable ? [MA.ui.btn(t('add'), { icon: 'plus', kind: 'primary', onclick: openAdd })] : [] })));
      return;
    }
    if (arr.length > 8) S.main.append(h('div.callout.sw-callout', { html: MA.icon('info') + `<span>${esc(t('crowded', { n: MA.num(arr.length) }))}</span>` }));

    const pubIds = (C().published?.swells || []).map(s => s.id), curIds = arr.map(s => s.id);
    const orderChanged = !MA.eq(pubIds.filter(x => curIds.includes(x)), curIds.filter(x => pubIds.includes(x)));
    const rangeSeg = MA.ui.seg(RANGES.map(r => ({ value: r, label: rangeLabel(r) })), uiPrefs().range, v => { setUi({ range: v }); schedule(); }, { size: 'sm', label: t('range') });
    S.main.append(h('div.sw-toolbar',
      h('div.grow', h('p.h4', t('count', { n: MA.num(arr.length) })), editable ? h('p.small.faint', t('dragHint')) : null),
      orderChanged ? h('span.sw-ordered.small', MA.ui.tideMark('edited'), h('span', t('orderChanged'))) : null,
      T.none ? null : rangeSeg));

    const card = h('div.card.sw-card');
    const head = h('div.sw-head.sw-grid', h('span'), h('span.label', t('col.swell')), h('span.label.sw-c-phase', t('col.phase')),
      h('span.label.sw-c-taps', h('span', t('col.taps')), T.none ? null : h('span.sw-hrange', '· ' + rangeLabel(uiPrefs().range)), T.sample ? MA.ui.sample() : null), h('span'));
    S.listEl = h('div.sw-list', { role: 'list', 'aria-label': t('tab.swells') });
    if (editable) S.sorts.push(MA.ui.sortable(S.listEl, { item: '.sw-row', handle: '.drag-handle', onEnd: ids => reorder(ids) }));
    S.listEl.addEventListener('keydown', onRowKey);
    S.listEl.addEventListener('focusin', e => { const r = e.target.closest('.sw-row'); if (!r) return; S.focusId = r.dataset.id; const i = indexOf(r.dataset.id); if (i >= 0) MA.site.flash(`swells.${i}.problem`); });
    arr.forEach((s, i) => S.listEl.append(row(s, i, arr.length, T, editable)));
    card.append(head, S.listEl);
    if (editable) card.append(h('button.sw-addrow', { type: 'button', onclick: openAdd, html: MA.icon('plus', 'sm') + `<span>${esc(t('add'))}</span><kbd>N</kbd>` }));
    S.main.append(card);
    if (T.none) S.main.append(h('p.small.faint.sw-nodata', MA.frag(MA.icon('info', 'sm')), h('span', t('noDataTip')), MA.can('settings.edit') ? h('a', { href: '#/settings' }, t('connect')) : null));
    if (hadFocus) {
      const r = S.listEl.querySelector(`.sw-row[data-id="${CSS.escape(hadFocus)}"]`), a = document.activeElement;
      if (r && (!a || a === document.body || !a.isConnected)) r.focus({ preventScroll: true });
    }
  }
  function row(s, i, total, T, editable) {
    const st = pubState(s), empties = emptyFields(s), tp = T.by[s.id] || { vals: [], cur: 0 };
    const phase = MA.clamp(+s.phase || 0, 0, 3);
    const tip = [...new Set(empties.map(f => `${fieldLabel(f)} (${f.l.toUpperCase()})`))];
    const el = h('div.sw-row.sw-grid', { role: 'listitem', tabindex: '0', dataset: { id: s.id }, 'aria-label': `${nameOf(s)}: ${quote(txt(s, 'problem'))}`,
      onclick: e => { if (e.target.closest('button,a,.drag-handle')) return; MA.go('#/services/' + encodeURIComponent(s.id)); } });
    el.append(
      editable ? h('span.drag-handle', { html: MA.icon('drag', 'sm'), 'aria-hidden': 'true' }) : h('span.sw-n.mono.tiny', pad2(i + 1)),
      h('span.sw-who', tile(s),
        h('span.sw-words',
          h('span.sw-chip', { dir: 'auto', lang: cl() }, txt(s, 'problem') || '—'),
          h('span.sw-name', h('b.truncate', { dir: 'auto', lang: cl() }, nameOf(s)),
            st === 'new' ? MA.ui.badge(t('new'), 'info') : st === 'edited' ? h('span.sw-dot', { 'data-tip': t('edited'), 'aria-label': t('edited'), role: 'img' }) : null,
            empties.length ? h('span.badge.warn.sw-empty', { title: t('emptyTip', { list: tip.slice(0, 5).join(sep()) + (tip.length > 5 ? '…' : '') }) }, t('emptyN', { n: MA.num(empties.length) })) : null))),
      h('span.sw-c-phase.sw-phase', { html: rail(phase) + `<span class="truncate"${MA.siteText.attrs(cl())}>${esc(MA.strip(steps()[phase] || ''))}</span>` }),
      h('span.sw-c-taps.sw-taps', T.none ? h('span.faint.small.sw-nodata-cell', t('noData')) : [
        h('span.sw-spark', { html: MA.chart.spark(tp.vals, { w: 90, h: 24, fill: false }) }),
        h('b.num.sw-num', MA.num(tp.cur)),
        h('span.num.faint.tiny.sw-share', T.total ? MA.pct(tp.cur / T.total) : '—')]),
      h('span.sw-more', MA.ui.iconBtn('more', { tip: t('actions'), size: 'sm', onclick: e => { e.stopPropagation(); rowMenu(e.currentTarget, s, i, total); } })));
    return el;
  }
  function rowMenu(anchor, s, i, total) {
    const editable = can();
    MA.ui.menu(anchor, [
      { label: t('open'), icon: 'edit', meta: '<kbd>↵</kbd>', run: () => MA.go('#/services/' + encodeURIComponent(s.id)) },
      { label: t('showPreview'), icon: 'eye', run: () => showInPreview(`swells.${i}.problem`, 'swells') },
      editable ? '-' : null,
      editable ? { label: t('moveUp'), icon: 'chevUp', meta: '<kbd>⌥↑</kbd>', disabled: i === 0, run: () => move(s.id, -1) } : null,
      editable ? { label: t('moveDown'), icon: 'chevDown', meta: '<kbd>⌥↓</kbd>', disabled: i === total - 1, run: () => move(s.id, 1) } : null,
      editable ? { label: t('duplicate'), icon: 'copy', run: () => duplicate(s.id) } : null,
      editable ? '-' : null,
      editable ? { label: t('delete'), icon: 'trash', danger: true, run: () => remove(s.id) } : null,
    ].filter(Boolean), { align: 'end' });
  }
  function onRowKey(e) {
    const r = e.target.closest('.sw-row'); if (!r || e.target !== r) return;
    if (e.key === 'Enter') { e.preventDefault(); MA.go('#/services/' + encodeURIComponent(r.dataset.id)); }
    else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); move(r.dataset.id, e.key === 'ArrowUp' ? -1 : 1); }
  }

  /* ---------------- services board ---------------- */
  function renderServices() {
    S.mode = 'services'; S.id = null; S.i = -1; S.refs = {};
    destroySorts(); S.listEl = null;
    const arr = svcs(), editable = can();
    const hadFocus = document.activeElement?.closest?.('.sv-row')?.dataset.id;
    S.main.innerHTML = '';
    header('services');
    if (C().get('sections/plan') === false) S.main.append(h('div.callout.warn.sw-callout', MA.frag(MA.icon('eyeOff')), h('span.grow', t('planHidden')),
      editable ? MA.ui.btn(t('unhide'), { size: 'sm', onclick: () => { C().set('sections/plan', true, { label: MA.t('sec.plan') }); MA.toast(t('shown'), { undo: () => C().set('sections/plan', false, { label: MA.t('sec.plan') }) }); } }) : null));
    const pubIds = (C().published?.services || []).map(s => s.id), curIds = arr.map(s => s.id);
    const orderChanged = !MA.eq(pubIds.filter(x => curIds.includes(x)), curIds.filter(x => pubIds.includes(x)));
    S.main.append(h('div.sw-toolbar',
      h('div.grow', h('p.h4', t('svc.count', { n: MA.num(arr.length) })), editable ? h('p.small.faint', t('svc.hint')) : null),
      orderChanged ? h('span.sw-ordered.small', MA.ui.tideMark('edited'), h('span', t('orderChanged'))) : null));
    const board = h('div.sv-board');
    [0, 1, 2, 3].forEach(g => board.append(groupCard(g, arr, editable)));
    const orphans = arr.map((s, n) => ({ s, n })).filter(x => gOf(x.s) < 0);
    if (orphans.length) board.append(h('section.card.sv-group.sv-orphans', h('div.card-head', h('div.grow', h('h2.h3', t('grp.orphans')), h('p.sub', t('grp.orphansText')))),
      h('ol.sv-list', orphans.map(x => svcRow(x.s, x.n, editable)))));
    S.main.append(board);
    board.addEventListener('keydown', onSvcKey);
    // restore the keyboard / open a requested field
    const want = S.focusAfter; S.focusAfter = null;
    const focusId = want?.id || hadFocus;
    if (focusId) {
      const li = board.querySelector(`.sv-row[data-id="${CSS.escape(focusId)}"]`), a = document.activeElement;
      const el = li?.querySelector(want?.sel || '.sv-toggle');
      if (el && (want || !a || a === document.body || !a.isConnected)) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); }
    }
    if (S.pendingFocus) { const f = S.pendingFocus; S.pendingFocus = null; setTimeout(() => MA.form.focus(f.tpl, f.lang), 30); }
  }
  function groupCard(g, arr, editable) {
    const items = arr.map((s, n) => ({ s, n })).filter(x => gOf(x.s) === g);
    const changed = ['en', 'ar'].some(l => C().isChanged(`sgroups/${l}/${g}`));
    const count = h('span.small.faint.num.sv-gcount', items.length === 1 ? t('grp.one', { n: MA.num(1) }) : t('grp.n', { n: MA.num(items.length) }));
    const tint = GROUP_TINT[g];
    // name + line are edited in place, behind a toggle so the services stay the focus (open when empty or asked for)
    const empty = ['en', 'ar'].some(l => ['name', 'line'].some(k => !MA.strip(C().get(`sgroups/${l}/${g}/${k}`) || '').trim()));
    const open = S.gOpen.has(g) || empty;
    const fields = h('div.sv-gfields', { id: 'sv-gf' + g, hidden: !open },
      MA.form.bi(`sgroups/{lang}/${g}/name`, { label: t('grp.name'), hint: esc(t('grp.nameHint')), kind: 'text', max: MAX.grpName, placeholder: PH.grpName }),
      MA.form.bi(`sgroups/{lang}/${g}/line`, { label: t('grp.line'), hint: esc(t('grp.lineHint')), kind: 'text', max: MAX.grpLine, placeholder: PH.grpLine }));
    const editBtn = MA.ui.btn(t(open ? 'grp.done' : 'grp.edit'), { size: 'sm', kind: 'ghost', icon: open ? 'chevUp' : 'edit' });
    editBtn.classList.add('sv-gedit'); editBtn.setAttribute('aria-expanded', String(open)); editBtn.setAttribute('aria-controls', 'sv-gf' + g);
    editBtn.addEventListener('click', () => {
      const on = fields.hidden; fields.hidden = !on; on ? S.gOpen.add(g) : S.gOpen.delete(g);
      editBtn.setAttribute('aria-expanded', String(on)); editBtn.innerHTML = MA.icon(on ? 'chevUp' : 'edit') + `<span>${esc(t(on ? 'grp.done' : 'grp.edit'))}</span>`;
      if (on) fields.querySelector('input')?.focus({ preventScroll: true });
    });
    const card = h('section.card.sv-group', { id: 'sv-g' + g, dataset: { g }, style: `--gc:var(--st-${tint})` },
      h('div.card-head.sv-ghead',
        h('span.sv-gnum.mono', { 'aria-hidden': 'true' }, pad2(g + 1)),
        h('div.grow.sv-gtitles', h('h2.h3.sv-gname', h('span.sv-gswatch', { 'data-tip': t('grp.colour', { c: MA.L(TOKEN_L[tint]) }), 'aria-label': t('grp.colour', { c: MA.L(TOKEN_L[tint]) }), role: 'img' }), h('span.sv-gtext', { dir: 'auto', lang: cl() }, grpName(g))),
          h('p.small.muted.sv-gline', { dir: 'auto', lang: cl() }, grpLine(g))),
        changed ? h('span.sw-dot', { 'data-tip': t('edited'), 'aria-label': t('edited'), role: 'img' }) : null,
        count, editBtn),
      fields);
    const ol = h('ol.sv-list', { dataset: { g }, 'aria-label': grpName(g) });
    items.forEach(x => ol.append(svcRow(x.s, x.n, editable)));
    if (!items.length) ol.append(h('li.sv-none.small.faint', t('grp.none')));
    if (editable && items.length > 1) S.sorts.push(MA.ui.sortable(ol, { item: '.sv-row', handle: '.drag-handle', onEnd: ids => svcReorderGroup(g, ids) }));
    card.append(ol);
    if (editable) card.append(h('button.sw-addrow.sv-addrow', { type: 'button', 'aria-label': t('svc.addTo', { group: grpName(g) }), onclick: () => { S.lastGroup = g; openSvcAdd(g); },
      html: MA.icon('plus', 'sm') + `<span>${esc(t('svc.add'))}</span>` }));
    return card;
  }
  function svcRow(s, n, editable) {
    const open = S.open.has(s.id);
    const li = h('li.sv-row', { dataset: { id: s.id, n: String(n) }, class: open ? 'open' : '' });
    const toggle = h('button.sv-toggle', { type: 'button', 'aria-expanded': String(open), 'aria-controls': 'sv-body-' + s.id, onclick: () => setSvcOpen(s.id, !S.open.has(s.id)) },
      h('span.sv-titles', h('b.sv-name', { dir: 'auto', lang: cl() }), h('span.sv-desc', { dir: 'auto', lang: cl() })));
    const acts = h('span.sv-acts',
      editable ? MA.ui.iconBtn('copy', { tip: t('svc.dup'), size: 'sm', onclick: () => svcDuplicate(s.id) }) : null,
      editable ? MA.ui.iconBtn('trash', { tip: t('svc.del'), size: 'sm', onclick: () => svcRemove(s.id) }) : null,
      MA.ui.iconBtn('more', { tip: t('svc.actions'), size: 'sm', onclick: e => svcMenu(e.currentTarget, s.id) }));
    const head = h('div.sv-head',
      editable ? h('span.drag-handle', { 'aria-hidden': 'true', title: t('svc.drag'), html: MA.icon('drag', 'sm') }) : null,
      toggle, h('span.sv-meta'), acts,
      h('span.sv-chev', { html: MA.icon('chevDown', 'sm'), 'aria-hidden': 'true' }));
    head.addEventListener('click', e => { if (e.target === head || e.target.closest('.sv-chev,.sv-meta')) setSvcOpen(s.id, !S.open.has(s.id)); });
    const body = h('div.sv-body', { id: 'sv-body-' + s.id, hidden: !open });
    if (open) fillSvcBody(body, n, editable);
    li.append(head, body);
    fillSvcRow(li);
    li.addEventListener('focusin', () => { S.lastGroup = Math.max(0, gOf(svcs()[+li.dataset.n])); });
    return li;
  }
  /** Summary line of a service row: name, description, the swells it answers, flags. */
  function fillSvcRow(li) {
    const n = +li.dataset.n, s = svcs()[n]; if (!s) return;
    const name = txt(s, 'name');
    const nm = li.querySelector('.sv-name'); nm.textContent = name || t('svc.untitled'); nm.classList.toggle('untitled', !name);
    li.querySelector('.sv-desc').textContent = txt(s, 'desc');
    const meta = li.querySelector('.sv-meta'); meta.innerHTML = '';
    const fors = (s.for || []).map(id => list().find(x => x.id === id)).filter(Boolean);
    if (fors.length) meta.append(h('span.sv-fortiles', { 'aria-label': t('svc.for') + ': ' + fors.map(x => txt(x, 'problem')).join(sep()) }, fors.slice(0, 5).map(x => h('span', { 'data-tip': quote(txt(x, 'problem')) }, tile(x, 'xs')))));
    else meta.append(h('span.tiny.faint.sv-nofor', t('svc.forShort')));
    const st = svcPub(s), empties = svcEmpty(s);
    if (st === 'new') meta.append(MA.ui.badge(t('new'), 'info'));
    else if (st === 'edited') meta.append(h('span.sw-dot', { 'data-tip': t('edited'), 'aria-label': t('edited'), role: 'img' }));
    if (empties.length) meta.append(h('span.badge.warn.sw-empty', { title: t('emptyTip', { list: empties.map(f => `${t('svc.' + f.k)} (${f.l.toUpperCase()})`).join(sep()) }) }, t('emptyN', { n: MA.num(empties.length) })));
    // the editor's "answers" chips follow the draft (undo, other editors)
    const set = new Set(s.for || []);
    li.querySelectorAll('.sv-forchip').forEach(b => b.setAttribute('aria-pressed', String(set.has(b.dataset.sw))));
    const fh = li.querySelector('.sv-forhint'); if (fh) { fh.textContent = set.size ? t('svc.forHint') : t('svc.forNone'); fh.classList.toggle('warn', !set.size); }
  }
  function fillSvcBody(body, n, editable) {
    const s = svcs()[n]; if (!s) return;
    const g = gOf(s);
    const sel = MA.ui.select([...(g < 0 ? [{ value: '', label: '—' }] : []), ...[0, 1, 2, 3].map(k => ({ value: k, label: `${pad2(k + 1)} · ${grpName(k)}` }))], g < 0 ? '' : g,
      v => { if (v !== '') svcSetGroup(s.id, +v); }, { label: t('svc.group'), cls: 'sv-groupsel' });
    sel.disabled = !editable;
    const chips = h('div.sv-for', { role: 'group', 'aria-label': t('svc.for') }, list().map(sw => h('button.sv-forchip', { type: 'button', 'aria-pressed': String((s.for || []).includes(sw.id)), dataset: { sw: sw.id }, disabled: !editable,
      onclick: () => svcToggleFor(s.id, sw.id) }, tile(sw, 'xs'), h('span', { dir: 'auto', lang: cl() }, txt(sw, 'problem') || sw.id))));
    body.append(
      MA.form.bi(`services/${n}/{lang}/name`, { label: t('svc.name'), hint: esc(t('svc.nameHint')), kind: 'text', max: MAX.svcName, placeholder: PH.svcName }),
      MA.form.bi(`services/${n}/{lang}/desc`, { label: t('svc.desc'), hint: esc(t('svc.descHint')), kind: 'textarea', max: MAX.svcDesc, placeholder: PH.svcDesc }),
      h('div.sv-forbox', h('p.sw-lbl', t('svc.for')), chips, h('p.small.faint.sv-forhint')),
      h('div.sv-props',
        h('div.sv-prop', h('p.sw-lbl', t('svc.group')), sel),
        h('div.sv-prop', h('p.sw-lbl', t('sec.id')), h('div.row.sv-idline', h('code.sw-id', s.id), MA.ui.iconBtn('copy', { tip: t('copyId'), size: 'sm', onclick: () => MA.copy(s.id, t('idCopied')) })), h('p.small.faint.sv-idhint', t('svc.idHint')))));
  }
  function setSvcOpen(id, on) {
    on ? S.open.add(id) : S.open.delete(id);
    const li = S.main?.querySelector(`.sv-row[data-id="${CSS.escape(id)}"]`); if (!li) return;
    li.classList.toggle('open', on);
    li.querySelector('.sv-toggle').setAttribute('aria-expanded', String(on));
    const body = li.querySelector('.sv-body');
    if (on && !body.childElementCount) { fillSvcBody(body, +li.dataset.n, can()); fillSvcRow(li); }
    body.hidden = !on;
    if (on && S.pane?.visible) { aimPreview(); S.pane.flash(`services.${li.dataset.n}.name`); }
  }
  function svcMenu(anchor, id) {
    const n = svcIndex(id), s = svcs()[n]; if (!s) return;
    const editable = can(), g = gOf(s), same = svcs().filter(x => gOf(x) === g), p = same.indexOf(s);
    MA.ui.menu(anchor, [
      { label: t('svc.edit'), icon: 'edit', meta: '<kbd>↵</kbd>', run: () => { setSvcOpen(id, true); MA.form.focus(`services/${n}/{lang}/name`, 'en'); } },
      { label: t('showPreview'), icon: 'eye', run: () => showInPreview(`services.${n}.name`, 'plan') },
      editable ? '-' : null,
      editable ? { label: t('moveUp'), icon: 'chevUp', meta: '<kbd>⌥↑</kbd>', disabled: p <= 0, run: () => svcMove(id, -1) } : null,
      editable ? { label: t('moveDown'), icon: 'chevDown', meta: '<kbd>⌥↓</kbd>', disabled: p < 0 || p === same.length - 1, run: () => svcMove(id, 1) } : null,
      editable ? { heading: t('svc.group') } : null,
      ...(editable ? [0, 1, 2, 3].map(k => ({ label: t('svc.moveTo', { name: grpName(k) }), icon: 'arrowRight', checked: k === g, run: () => svcSetGroup(id, k) })) : []),
      editable ? '-' : null,
      editable ? { label: t('svc.dup'), icon: 'copy', run: () => svcDuplicate(id) } : null,
      editable ? { label: t('svc.del'), icon: 'trash', danger: true, run: () => svcRemove(id) } : null,
    ].filter(Boolean), { align: 'end' });
  }
  function onSvcKey(e) {
    const tg = e.target.closest?.('.sv-toggle'); if (!tg) return;
    const li = tg.closest('.sv-row');
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.code === 'ArrowUp' || e.code === 'ArrowDown')) { e.preventDefault(); svcMove(li.dataset.id, (e.key === 'ArrowUp' || e.code === 'ArrowUp') ? -1 : 1); }
  }
  function refreshGroupHeads() {
    MA.$$('.sv-group[data-g]', S.main).forEach(c => {
      const g = +c.dataset.g; if (!(g >= 0)) return;
      const n = c.querySelector('.sv-gtext'), l = c.querySelector('.sv-gline');
      if (n) n.textContent = grpName(g); if (l) l.textContent = grpLine(g);
    });
  }

  /* ---------------- swell detail ---------------- */
  function renderDetail(id) {
    destroySorts(); S.listEl = null;
    const arr = list(), i = arr.findIndex(s => s.id === id);
    S.mode = 'detail'; S.id = id; S.i = i; S.refs = {};
    S.main.innerHTML = '';
    if (i < 0) {
      S.main.append(h('div.card', MA.ui.empty({ title: esc(t('notFound')), text: t('notFoundText', { id: `<code class="mono">${esc(id)}</code>` }), pose: 'present',
        actions: [MA.ui.btn(t('back'), { icon: 'arrowLeft', href: '#/services' })] })));
      return;
    }
    const s = arr[i], base = `swells/${i}`, editable = can();
    const back = h('a.sw-back.small', { href: '#/services', html: MA.icon('arrowLeft', 'sm flip') + `<span>${esc(t('back'))}</span>` });
    const prev = MA.ui.iconBtn('chevLeft', { tip: t('prev'), onclick: () => nav(-1) }), next = MA.ui.iconBtn('chevRight', { tip: t('next'), onclick: () => nav(1) });
    prev.querySelector('svg').classList.add('flip'); next.querySelector('svg').classList.add('flip');
    prev.disabled = i === 0; next.disabled = i === arr.length - 1;
    const more = MA.ui.iconBtn('more', { tip: t('actions'), onclick: e => MA.ui.menu(e.currentTarget, [
      { label: t('showPreview'), icon: 'eye', run: () => showInPreview(`swells.${indexOf(id)}.problem`, 'swells') },
      editable ? { label: t('moveUp'), icon: 'chevUp', disabled: indexOf(id) === 0, run: () => move(id, -1) } : null,
      editable ? { label: t('moveDown'), icon: 'chevDown', disabled: indexOf(id) === list().length - 1, run: () => move(id, 1) } : null,
      editable ? '-' : null,
      editable ? { label: t('delete'), icon: 'trash', danger: true, run: () => remove(id) } : null,
    ].filter(Boolean), { align: 'end' }) });
    const head = MA.ui.pageHead({ title: esc(nameOf(s)), sub: esc(quote(txt(s, 'problem'))),
      actions: [h('div.sw-pager', prev, next), S.pane.toggle, editable ? MA.ui.btn(MA.t('duplicate'), { icon: 'copy', onclick: () => { const nid = duplicate(id); if (nid) MA.go('#/services/' + encodeURIComponent(nid)); } }) : MA.ui.badge(MA.t('readOnly'), 'outline'), more] });
    const eyebrow = h('p.label.eyebrow.sw-eyebrow');
    head.firstElementChild.prepend(eyebrow);
    S.refs.eyebrow = eyebrow; S.refs.title = head.querySelector('.h1'); S.refs.lead = head.querySelector('.lead');
    for (const el of [S.refs.title, S.refs.lead]) { el.setAttribute('dir', 'auto'); el.setAttribute('lang', cl()); } // site copy
    S.refs.missing = h('div.sw-missing');
    S.main.append(back, head, S.refs.missing, h('div.sw-sections', perfCard(s), wordsCard(base), planCard(editable), answersCard(editable), stepsCard(base), lookCard(editable), idCard(s)));
    refreshDetail();
  }
  const card = (cls, title, sub, ...body) => h('section.card.sw-sec' + cls, h('div.card-head', h('div.grow', h('h2.h3', title), sub ? h('p.sub', sub) : null)), h('div.card-body', ...body));
  function perfCard(s) {
    const T = taps(uiPrefs().range), tp = T.by[s.id] || { vals: [], cur: 0, prev: 0 };
    const rank = Object.values(T.by).filter(x => x.cur > tp.cur).length + 1;
    const rangeSeg = MA.ui.seg(RANGES.map(r => ({ value: r, label: rangeLabel(r) })), uiPrefs().range,
      v => { setUi({ range: v }); const cur = list()[indexOf(s.id)]; if (cur) S.refs.perf.replaceWith(perfCard(cur)); }, { size: 'sm', label: t('range') });
    const body = T.none
      ? h('div.sw-perf-none', h('p.small.muted.row', MA.frag(MA.icon('info', 'sm')), h('span', t('noDataTip'))), MA.can('settings.edit') ? MA.ui.btn(t('connect'), { size: 'sm', href: '#/settings' }) : null)
      : h('div.sw-perf-grid' + (T.sample ? '.hatched' : ''),
        MA.ui.kpi({ label: t('perf.taps') + ' · ' + rangeLabel(uiPrefs().range), value: MA.num(tp.cur), cur: tp.cur, prev: tp.prev, goodWhen: 'up', vs: prevLabel(uiPrefs().range), spark: tp.vals }),
        h('div.kpi', h('div.k-label', h('span.label', t('perf.share'))), h('div.k-value', T.total ? MA.pct(tp.cur / T.total) : '—'),
          h('span.small.faint', t('perf.rank', { n: MA.num(rank), total: MA.num(list().length) }))));
    const el = card('.sw-perf', t('perf'), '', body);
    if (!T.none) el.querySelector('.card-head').append(T.sample ? MA.ui.sample() : '', rangeSeg);
    S.refs.perf = el; return el;
  }
  function wordsCard(base) {
    const f = (k, kind) => MA.form.bi(`${base}/{lang}/${k}`, { label: t('f.' + k), hint: esc(t(`f.${k}Hint`)), max: MAX[k], placeholder: PH[k], kind });
    const noun = f('noun', 'text');
    S.refs.say = h('div.sw-say', { 'aria-live': 'polite' });
    noun.append(S.refs.say);
    // the service name is listed in "What we make", which the site may hide: say so where the name is edited
    const service = f('service', 'text');
    S.refs.makeOff = h('p.small.sw-makeoff', { hidden: true }, MA.frag(MA.icon('eyeOff', 'sm')), h('span', t('f.serviceOff')),
      MA.can('content.edit') ? h('a', { href: '#/pages/make' }, MA.t('sec.make')) : null);
    service.append(S.refs.makeOff);
    return card('', t('sec.words'), t('sec.wordsSub'), f('problem', 'text'), service, noun, f('desc', 'textarea'));
  }
  function lookCard(editable) {
    const icons = Object.keys(MA.site.info?.icons || {});
    S.refs.bigTile = h('div.sw-bigtile'); S.refs.contrast = h('div.sw-contrast'); S.refs.weak = h('div.sw-weak');
    const label = k => MA.L(ICON_L[k] || { en: k });
    S.refs.icons = h('div.sw-icons', { role: 'radiogroup', 'aria-label': t('icon') }, icons.map(k => h('button.sw-ico', { type: 'button', role: 'radio', dataset: { icon: k }, title: label(k), 'aria-label': label(k),
      html: iconSvg(k), onclick: () => C().set(`swells/${indexOf(S.id)}/icon`, k, { label: t('icon') }) })));
    const sw = which => h('div.sw-swatches', { role: 'radiogroup', 'aria-label': t(which ? 'tintFg' : 'tintBg') }, TOKENS.map(tk => h('button.sw-swatch', { type: 'button', role: 'radio', dataset: { t: tk }, style: `--c:var(--st-${tk})`, title: MA.L(TOKEN_L[tk]), 'aria-label': MA.L(TOKEN_L[tk]),
      onclick: () => { const cur = tintOf(list()[indexOf(S.id)]); cur[which] = tk; C().set(`swells/${indexOf(S.id)}/tint`, cur, { label: t('sec.look') }); } })));
    S.refs.swBg = sw(0); S.refs.swFg = sw(1);
    const fs = h('fieldset.sw-fs', { disabled: !editable },
      h('div.sw-look',
        h('div.sw-look-tile', S.refs.bigTile, S.refs.contrast),
        h('div.sw-look-pick',
          h('p.sw-lbl', t('icon')), S.refs.icons,
          h('div.sw-tints', h('div', h('p.sw-lbl', t('tintBg')), S.refs.swBg), h('div', h('p.sw-lbl', t('tintFg')), S.refs.swFg)),
          S.refs.weak)));
    return card('.sw-lookcard', t('sec.look'), t('lookSub'), fs);
  }
  function planCard(editable) {
    S.refs.phases = h('div.sw-phases', { role: 'radiogroup', 'aria-label': t('sec.plan') });
    return card('', t('sec.plan'), t('planSub'), h('fieldset.sw-fs', { disabled: !editable }, S.refs.phases));
  }
  function answersCard(editable) {
    S.refs.answers = h('div.sw-answers');
    S.refs.answersSub = h('p.sub');
    const c = h('section.card.sw-sec', h('div.card-head', h('div.grow', h('h2.h3', t('sec.answers')), S.refs.answersSub),
      MA.ui.btn(t('editServices'), { size: 'sm', kind: 'ghost', icon: 'grid', href: '#/services?tab=services' })), h('div.card-body', h('fieldset.sw-fs', { disabled: !editable }, S.refs.answers)));
    return c;
  }
  function stepsCard(base) {
    const mine = MA.strip(C().get(`ui/${cl()}/getMine`) || C().get('ui/en/getMine') || '');
    S.refs.stepFields = [0, 1, 2, 3].map(k => MA.form.bi(`${base}/{lang}/steps/${k}`, { label: t('stepLabel', { n: MA.num(k + 1), title: stageTitle(k) }), max: MAX.step, kind: 'text',
      placeholder: stepPh(stageTitle(k, 'en'), stageTitle(k, 'ar')) }));
    const c = card('', t('sec.steps'), h('span', { html: t('stepsSub', { mine: quoteSite(mine) }) }), ...S.refs.stepFields);
    c.querySelector('.card-head').append(MA.ui.btn(t('editStops'), { size: 'sm', kind: 'ghost', icon: 'process', href: '#/process' }));
    return c;
  }
  function idCard(s) {
    const words = linkedWords(s.id), briefs = MA.can('leads.view') ? MA.leads.all().filter(l => (l.waves || []).includes(s.id)) : [];
    return card('', t('sec.id'), t('idHint'),
      h('div.row.wrap.sw-idline', h('code.sw-id', s.id), MA.ui.btn(t('copyId'), { size: 'sm', kind: 'ghost', icon: 'copy', onclick: () => MA.copy(s.id, t('idCopied')) })),
      h('ul.sw-used',
        h('li', h('div.row.between', h('span', words.length ? t('usedMake', { count: words.length, n: MA.num(words.length) }) : t('usedMakeNone')), h('a.small', { href: '#/pages/make' }, t('editWords'))),
          words.length ? h('div.row.wrap.sw-chips', words.map(w => h('span.tag', { dir: 'auto', lang: cl() }, MA.strip(w[cl()] || w.en || '')))) : null),
        MA.can('leads.view') ? h('li', h('div.row', h('span', t('usedBriefs', { n: MA.num(briefs.length) })), briefs.some(l => l.sample) ? MA.ui.sample() : null)) : null));
  }
  /** Repaint everything in the detail that isn't a bound field (bound fields sync themselves). */
  function refreshDetail() {
    if (S.mode !== 'detail' || !S.refs.eyebrow) return;
    const i = indexOf(S.id), s = list()[i]; if (!s) return;
    const st = pubState(s), [bg, fg] = tintOf(s), r = ratio(hex(bg), hex(fg)), phase = MA.clamp(+s.phase || 0, 0, 3);
    S.refs.eyebrow.innerHTML = '';
    S.refs.eyebrow.append(MA.ui.tideMark(st === 'new' ? 'draft' : st === 'edited' ? 'edited' : 'live', MA.t(st === 'live' ? 'published' : st === 'new' ? 'draft' : 'services.edited')), h('span', t('eyebrow', { n: MA.num(i + 1), total: MA.num(list().length) })), h('span.sw-eid', s.id));
    S.refs.title.textContent = nameOf(s);
    S.refs.lead.textContent = quote(txt(s, 'problem') || '…');
    MA.setCrumbs(crumbsFor(S.id));
    // fields still empty
    const empties = emptyFields(s);
    S.refs.missing.innerHTML = '';
    if (empties.length) S.refs.missing.append(h('div.callout.warn', MA.frag(MA.icon('warn')), h('div.grow.stack.tight', h('p', empties.length === 1 ? t('missingOne') : t('missing', { n: MA.num(empties.length) })),
      h('div.row.wrap.sw-chips', empties.slice(0, 12).map(f => h('button.tag', { type: 'button', onclick: () => MA.form.focus(`swells/${indexOf(S.id)}/${f.tpl}`, f.l) }, `${fieldLabel(f)} · ${f.l.toUpperCase()}`))))));
    // tile, pickers, contrast
    S.refs.bigTile.innerHTML = ''; S.refs.bigTile.append(tile(s, 'lg'));
    MA.$$('.sw-ico', S.refs.icons).forEach(b => b.setAttribute('aria-checked', String(b.dataset.icon === s.icon)));
    MA.$$('.sw-swatch', S.refs.swBg).forEach(b => b.setAttribute('aria-checked', String(b.dataset.t === bg)));
    MA.$$('.sw-swatch', S.refs.swFg).forEach(b => b.setAttribute('aria-checked', String(b.dataset.t === fg)));
    const rs = ratioText(r);
    S.refs.contrast.innerHTML = '';
    S.refs.contrast.append(h('span.small.num', t('contrast', { r: rs })), MA.ui.badge(t(r >= 4.5 ? 'cStrong' : r >= 3 ? 'cOk' : 'cWeak'), r >= 4.5 ? 'good' : r >= 3 ? 'info' : 'bad'));
    S.refs.weak.innerHTML = '';
    if (r < 3) {
      const best = TOKENS.filter(x => x !== bg).sort((a, b) => ratio(hex(bg), hex(b)) - ratio(hex(bg), hex(a)))[0];
      S.refs.weak.append(h('div.callout.bad', MA.frag(MA.icon('warn')), h('p.grow', t('weakText', { r: rs, min: ratioText(3) })),
        can() ? MA.ui.btn(t('useFg', { name: MA.L(TOKEN_L[best]) }), { size: 'sm', onclick: () => C().set(`swells/${indexOf(S.id)}/tint`, [bg, best], { label: t('sec.look') }) }) : null));
    }
    // phases: four columns, each showing which swells already sit there
    S.refs.phases.innerHTML = '';
    [0, 1, 2, 3].forEach(p => {
      const others = list().filter(x => x.id !== s.id && MA.clamp(+x.phase || 0, 0, 3) === p);
      S.refs.phases.append(h('button.sw-phasebtn', { type: 'button', role: 'radio', 'aria-checked': String(p === phase), onclick: () => C().set(`swells/${indexOf(S.id)}/phase`, p, { label: t('sec.plan') }) },
        h('span.sw-ph-top', h('span.mono.tiny', pad2(p + 1)), h('span.sw-ph-mark')),
        h('b.sw-ph-name', { dir: 'auto', lang: cl() }, MA.strip(steps()[p] || '')),
        h('span.sw-ph-tiles', p === phase ? tile(s, 'xs me') : null, others.map(o => h('span', { title: nameOf(o) }, tile(o, 'xs')))),
        h('span.tiny.faint.sw-ph-who', p === phase ? (others.length ? t('inPhase', { list: others.map(nameOf).join(sep()) }) : t('phaseEmpty')) : others.map(nameOf).join(sep()))));
    });
    // services that answer this swell, by group (toggle to add / remove it from their "for")
    const all = svcs(), mineSvcs = all.filter(x => (x.for || []).includes(s.id));
    S.refs.answersSub.innerHTML = mineSvcs.length ? `${t('answersSub', { problem: quoteSite(txt(s, 'problem') || '…') })} ${esc(t('answersN', { n: MA.num(mineSvcs.length), total: MA.num(all.length) }))}` : esc(t('answersNone'));
    S.refs.answersSub.classList.toggle('warn', !mineSvcs.length);
    const hadFocus = document.activeElement?.closest?.('.sw-answers') ? document.activeElement.dataset.svc : null;
    S.refs.answers.innerHTML = '';
    [0, 1, 2, 3].forEach(g => {
      const inG = all.filter(x => gOf(x) === g); if (!inG.length) return;
      S.refs.answers.append(h('div.sw-agroup', h('p.sw-lbl', { dir: 'auto', lang: cl() }, grpName(g)),
        h('div.sv-for', inG.map(x => h('button.sv-forchip.sw-achip', { type: 'button', 'aria-pressed': String((x.for || []).includes(s.id)), dataset: { svc: x.id }, onclick: () => svcToggleFor(x.id, s.id) },
          h('span.sw-acheck', { 'aria-hidden': 'true', html: MA.icon('check', 'sm') }), h('span', { dir: 'auto', lang: cl() }, svcName(x)))))));
    });
    if (hadFocus) S.refs.answers.querySelector(`[data-svc="${CSS.escape(hadFocus)}"]`)?.focus({ preventScroll: true });
    // the plan headline this noun feeds
    const nEn = esc(MA.strip(C().get(`swells/${i}/en/noun`) || '')), nAr = esc(MA.strip(C().get(`swells/${i}/ar/noun`) || ''));
    S.refs.say.innerHTML = `<span class="label">${esc(t('f.nounReads'))}</span><span class="sw-say-l" lang="en" dir="ltr">Let’s start with <em>${nEn || '___'}.</em></span><span class="sw-say-l" lang="ar" dir="rtl">لنبدأ <em>ب${nAr || '___'}.</em></span>`;
    if (S.refs.makeOff) S.refs.makeOff.hidden = C().get('sections/make') !== false;
    // step labels follow the stage names
    S.refs.stepFields?.forEach((f, k) => { const n = f.querySelector('.cf-head .name'); if (n) n.textContent = t('stepLabel', { n: MA.num(k + 1), title: stageTitle(k) }); });
  }

  /* ---------------- module ---------------- */
  const def = {
    id: ID, group: 'site', order: 50, icon: 'swell', shortcut: 'g w',
    title: LL('services.title'), keywords: 'services swells problems groups plan خدمات موجات مجموعات خدمات موج‌ها',
    badge() { try { const n = badgeCount(); return n ? { n, quiet: true } : null; } catch (e) { return null; } },
    render(view, ctx) {
      S.listEl = null; S.pane = null; S.focusId = null; S.sorts = [];
      // aim the new preview at the right part of the site from the start
      S.mode = !ctx.sub[0] && (ctx.query.get('tab') === 'services' || /^(services|sgroups)\//.test(ctx.query.get('field') || '')) ? 'services' : 'list';
      mount(view); draw(ctx);
    },
    update(ctx) { if (!S.root?.isConnected) return false; draw(ctx); return true; },
    crumbs: ctx => crumbsFor(ctx.sub[0] || null, ctx.query.get('tab') === 'services' ? 'services' : 'swells'),
    search(q) {
      const ql = q.toLowerCase().trim(); if (!ql) return [];
      const out = list().map(s => {
        const title = nameOf(s), sub = quote(txt(s, 'problem'));
        const hay = [s.id, ...['en', 'ar'].flatMap(l => [...FIELDS.map(k => MA.strip(s[l]?.[k] || '')), ...(s[l]?.steps || []).map(x => MA.strip(x))])].join(' ').toLowerCase();
        const score = title.toLowerCase().includes(ql) ? 95 : sub.toLowerCase().includes(ql) ? 80 : hay.includes(ql) ? 55 : 0;
        return score ? { title, sub, icon: 'swell', score, run: () => MA.go('#/services/' + encodeURIComponent(s.id)) } : null;
      });
      const open = (tpl, l) => () => { C().focusAfterRoute = { tpl, lang: l }; MA.go(`#/services?tab=services&field=${encodeURIComponent(tpl)}`); };
      svcs().forEach((s, n) => {
        const name = svcName(s), hay = [s.id, ...['en', 'ar'].flatMap(l => [s[l]?.name, s[l]?.desc].map(x => MA.strip(x || '')))].join(' ').toLowerCase();
        const score = name.toLowerCase().includes(ql) ? 90 : hay.includes(ql) ? 52 : 0;
        if (score) out.push({ title: name, sub: `${t('tab.services')} · ${grpName(Math.max(0, gOf(s)))}`, icon: 'grid', score, run: open(`services/${n}/{lang}/name`, cl()) });
      });
      [0, 1, 2, 3].forEach(g => {
        const hay = ['en', 'ar'].flatMap(l => [grpName(g, l), grpLine(g, l)]).join(' ').toLowerCase();
        if (hay.includes(ql)) out.push({ title: grpName(g), sub: `${t('tab.services')} · ${t('grp', { n: MA.num(g + 1) })}`, icon: 'grid', score: 60, run: open(`sgroups/{lang}/${g}/name`, cl()) });
      });
      return out.filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 8);
    },
  };
  MA.module(def);
  const sub = LL('services.title');
  MA.commands.add({ id: 'services.add', title: LL('services.cmd.add'), sub, icon: 'plus', keywords: 'new swell problem موجة جديدة موج تازه',
    when: () => MA.can('content.edit'), run: () => { if (MA.ctx().id !== ID || MA.ctx().sub.length) MA.go('#/services'); setTimeout(openAdd, 120); } });
  MA.commands.add({ id: 'services.addSvc', title: LL('services.cmd.addSvc'), sub, icon: 'plus', keywords: 'new service خدمة جديدة خدمت تازه',
    when: () => MA.can('content.edit'), run: () => { if (MA.ctx().id !== ID || MA.ctx().query.get('tab') !== 'services') MA.go('#/services?tab=services'); setTimeout(() => openSvcAdd(0), 120); } });
  MA.commands.add({ id: 'services.groups', title: LL('services.cmd.groups'), sub, icon: 'grid', keywords: 'service groups disciplines sgroups strategy branding content digital مجموعات گروه',
    run: () => { C().focusAfterRoute = { tpl: 'sgroups/{lang}/0/name', lang: cl() }; MA.go('#/services?tab=services&field=' + encodeURIComponent('sgroups/{lang}/0/name')); } });
  MA.commands.add({ id: 'services.preview', title: LL('services.cmd.preview'), sub, icon: 'eye', keywords: 'swells chips opening film picker',
    run: () => MA.preview.open({ section: 'swells' }) });
  MA.commands.add({ id: 'services.plan', title: LL('services.cmd.plan'), sub, icon: 'eye', keywords: 'services list plan groups',
    run: () => MA.preview.open({ section: 'plan' }) });
})();
