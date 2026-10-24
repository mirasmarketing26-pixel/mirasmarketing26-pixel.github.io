/* =====================================================================
   MIRAS admin — SEO & sharing
   Content it edits (published with content.js): seo/{lang}/title, seo/{lang}/description, seo/themeColor, seo/ogImage.
   Admin-side settings (MA.db 'seo.cfg'): site address, Arabic address (empty = the site's own '<site>/?lang=ar'),
   link-preview language, structured-data type, profile links (sameAs), and whether the head tags include JSON-LD.
   Generates: head tags for index.html (hreflang en / ar / x-default), JSON-LD, robots.txt, sitemap.xml (both addresses).
   Audits all of it as you type. MA.seo exposes the generators for History's publish-to-folder.
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA;

  MA.i18n.add({
    en: {
      'seo.sub': 'How MIRAS shows up in Google and when someone shares the link. Every check updates as you type.',
      'seo.copyHead': 'Copy head tags', 'seo.moreActions': 'More actions',
      'seo.dlRobots': 'Download robots.txt', 'seo.dlSitemap': 'Download sitemap.xml', 'seo.copyLd': 'Copy structured data',
      'seo.s.search': 'Search result', 'seo.s.searchSub': 'The title and description Google shows, measured in pixels the way Google cuts them.',
      'seo.title': 'Title', 'seo.desc': 'Description',
      'seo.titleHint': 'Lead with the name, then what you do and where.', 'seo.descHint': 'One or two sentences that make someone want to click.',
      'seo.m.nums': '{px} px · {n} characters',
      'seo.m.good': 'Good length', 'seo.m.shortT': 'Short: there’s room for a few more words', 'seo.m.shortD': 'Short: Google may write its own snippet',
      'seo.m.over': 'Too long: Google shows about {n} characters', 'seo.m.emptyT': 'Empty: Google will make up a title', 'seo.m.emptyD': 'Empty: Google will pick a line from the page',
      'seo.googlePrev': 'Google result', 'seo.approx': 'Approximate preview', 'seo.desktop': 'Desktop', 'seo.mobile': 'Mobile', 'seo.arabic': 'Arabic',
      'seo.s.share': 'Sharing', 'seo.s.shareSub': 'What people see when the link is sent on WhatsApp or posted on LinkedIn, X and Facebook.',
      'seo.img': 'Sharing image', 'seo.imgHint': 'Recommended: 1200 × 630 px, JPG or PNG, under 300 KB. Choose it from Media, or put the file in assets/ and type its path.',
      'seo.pick': 'Choose from Media', 'seo.clearImg': 'Remove image', 'seo.imgRemoved': 'Sharing image removed.',
      'seo.noImg': 'No sharing image yet, so links show as plain text cards.', 'seo.noImgShort': 'No image',
      'seo.imgLoading': 'Checking the image…', 'seo.imgErr': 'Couldn’t load {path}. Check the path, and that the file is uploaded with the site.',
      'seo.imgUpload': 'This image is stored in this browser. Social apps need a public file: put it in assets/ and use that path.',
      'seo.okSize': 'Right size and weight for every app.', 'seo.small': 'Too small: use at least 1200 px wide.', 'seo.smallish': 'Under 1200 px wide: it may look soft on large screens.',
      'seo.crop': 'Not 1.91:1, so apps will crop it.', 'seo.heavy': 'Over 300 KB: WhatsApp often skips images this heavy.', 'seo.sizeUnknown': 'File size unknown',
      'seo.linkPrev': 'Link preview', 'seo.x': 'X', 'seo.li': 'LinkedIn', 'seo.wa': 'WhatsApp', 'seo.fb': 'Facebook', 'seo.from': 'From {host}',
      'seo.shownIn': 'Shown in {lang}, the language of the head tags.', 'seo.waSkipped': 'Image left out: WhatsApp skips images over 300 KB.',
      'seo.socialNote': 'Social apps read only the HTML head of index.html. They don’t run the site’s scripts, so publishing isn’t enough: paste the head tags below into index.html.',
      'seo.toHead': 'Go to head tags',
      'seo.s.theme': 'Theme colour', 'seo.s.themeSub': 'Tints the browser bar on phones while someone is on the site.', 'seo.themeLabel': 'Theme colour', 'seo.useBrand': 'Use a brand colour',
      'seo.c.tide': 'Tide', 'seo.c.deep': 'Deep', 'seo.c.shore': 'Shore', 'seo.c.flare': 'Flare', 'seo.c.foam': 'Foam',
      'seo.s.head': 'Head tags for index.html', 'seo.s.headSub': 'Title, description, Open Graph, X card, language alternates and theme colour, ready to paste.',
      'seo.site': 'Site address', 'seo.siteHint': 'Used in every link below.', 'seo.siteErr': 'Use a full address, like https://miras.qa',
      'seo.arUrl': 'Arabic address', 'seo.arUrlHint': 'The site opens in Arabic at {url}. Leave this empty to use that, or type another address if Arabic lives somewhere else.',
      'seo.urlErr': 'Use a full https:// address.',
      'seo.shareLang': 'Language of link previews', 'seo.shareLangHint': 'Apps read the head of index.html without running the site, so both addresses preview in this language.',
      'seo.structured': 'Structured data', 'seo.incLd': 'Include it in the head tags',
      'seo.why': 'Paste these into the <code>&lt;head&gt;</code> of index.html, replacing its title, description and theme-color lines. WhatsApp, LinkedIn, X and Facebook read only that file, not content.js.',
      'seo.sync.ok': 'index.html already has these tags.', 'seo.sync.diff': '{n} tags in index.html differ from this draft.', 'seo.sync.diffOne': '1 tag in index.html differs from this draft.',
      'seo.sync.missing': 'index.html has no sharing tags yet, so shared links show without a title card or image.', 'seo.sync.err': 'Couldn’t read index.html to compare.',
      'seo.sync.checking': 'Comparing with index.html…', 'seo.recheck': 'Check again',
      'seo.col.tag': 'Tag', 'seo.col.live': 'In index.html now', 'seo.col.want': 'In these tags', 'seo.absent': 'missing',
      'seo.copiedHead': 'Head tags copied. Paste them into index.html.',
      'seo.s.ld': 'Structured data', 'seo.s.ldSub': 'Tells Google the studio’s name, address, hours and contacts, for the business panel and Maps.',
      'seo.ldType': 'Type', 'seo.ldPro': 'Professional service', 'seo.ldLocal': 'Local business',
      'seo.sameAs': 'Profiles elsewhere', 'seo.sameAsHint': 'Instagram, LinkedIn, X, Behance… Google uses these to connect the brand.',
      'seo.addLink': 'Add link', 'seo.linkErr': 'That doesn’t look like a web address.', 'seo.linkDup': 'That link is already in the list.', 'seo.linkRemoved': 'Link removed.', 'seo.linkRemove': 'Remove link', 'seo.noLinks': 'No profiles yet.',
      'seo.noPhone': 'No phone number yet. Add a WhatsApp number in Settings to include one.', 'seo.noAddr': 'No address yet. Add it in Pages & copy, under Studio.',
      'seo.noDays': 'No opening days set, so hours are left out.', 'seo.fromContent': 'Name, address, email and hours come from the site’s content, so they stay in step with it.',
      'seo.openSettings': 'Open Settings', 'seo.test': 'Test with Google', 'seo.copiedLd': 'Structured data copied.',
      'seo.s.files': 'robots.txt and sitemap.xml', 'seo.s.filesSub': 'Upload both to the site’s root folder, next to index.html. robots.txt also keeps search engines out of /admin/.',
      'seo.download': 'Download', 'seo.copy': 'Copy', 'seo.downloaded': '{file} downloaded. Upload it next to index.html.',
      'seo.audit': 'Audit', 'seo.auditSub': 'Updates as you type',
      'seo.score.good': 'In good shape', 'seo.score.ok': 'A few fixes left', 'seo.score.bad': 'Needs work', 'seo.passN': { one: '{p} of 1 check passes', other: '{p} of {t} checks pass' },
      'seo.a.titleEn': 'English title length', 'seo.a.titleAr': 'Arabic title length', 'seo.a.descEn': 'English description length', 'seo.a.descAr': 'Arabic description length',
      'seo.a.langs': 'Both languages filled in', 'seo.a.img': 'Sharing image set and sized', 'seo.a.theme': 'Theme colour', 'seo.a.hreflang': 'Language alternates (hreflang)', 'seo.a.head': 'Tags pasted into index.html',
      'seo.d.langsOk': 'Title and description exist in English and Arabic.', 'seo.d.langsMiss': 'Missing: {list}.',
      'seo.d.themeOk': '{hex} tints the browser bar.', 'seo.d.themeBad': 'Not a valid colour, so browsers ignore it.',
      'seo.d.hrefOk': 'Arabic has its own address: {url}', 'seo.d.hrefShared': 'Arabic shares the English address, so Google can’t send Arabic searchers straight to Arabic.',
      'seo.d.pending': 'Checking…', 'seo.d.headOk': 'index.html matches this draft.',
      'seo.lang.en': 'English', 'seo.lang.ar': 'Arabic',
      'seo.f.titleEn': 'English title', 'seo.f.titleAr': 'Arabic title', 'seo.f.descEn': 'English description', 'seo.f.descAr': 'Arabic description',
      'seo.title.page': 'SEO & sharing',
      'seo.codeHead': 'Head tags for index.html', 'seo.codeLd': 'Structured data (JSON-LD)', 'seo.codeFile': '{file} contents',
      'seo.tm.live': 'Live', 'seo.tm.edited': 'Edited, not published yet',
      'seo.imgUploadTo': 'This image is an upload in this browser. Publishing to the site folder writes it to {path}, and the head tags already point there. If you download content.js instead, upload this file too.',
    },
    ar: {
      'seo.sub': 'كيف تظهر ميراس في Google وعند مشاركة رابطها. تتحدّث كل الفحوص أثناء الكتابة.',
      'seo.copyHead': 'انسخ وسوم الرأس', 'seo.moreActions': 'إجراءات أخرى',
      'seo.dlRobots': 'نزّل robots.txt', 'seo.dlSitemap': 'نزّل sitemap.xml', 'seo.copyLd': 'انسخ البيانات المنظّمة',
      'seo.s.search': 'نتيجة البحث', 'seo.s.searchSub': 'العنوان والوصف كما يعرضهما Google، مقيسة بالبكسل كما يقصّها Google.',
      'seo.title': 'العنوان', 'seo.desc': 'الوصف',
      'seo.titleHint': 'ابدأ بالاسم، ثم ما تقدّمه وأين.', 'seo.descHint': 'جملة أو جملتان تدفعان القارئ إلى النقر.',
      'seo.m.nums': '{px} بكسل · الأحرف: {n}',
      'seo.m.good': 'طول مناسب', 'seo.m.shortT': 'قصير: يتّسع لكلمات أخرى', 'seo.m.shortD': 'قصير: قد يكتب Google مقتطفاً من عنده',
      'seo.m.over': 'طويل: يعرض Google نحو {n} حرفاً فقط', 'seo.m.emptyT': 'فارغ: سيختار Google عنواناً بنفسه', 'seo.m.emptyD': 'فارغ: سيقتطف Google سطراً من الصفحة',
      'seo.googlePrev': 'نتيجة Google', 'seo.approx': 'معاينة تقريبية', 'seo.desktop': 'سطح المكتب', 'seo.mobile': 'الجوال', 'seo.arabic': 'العربية',
      'seo.s.share': 'المشاركة', 'seo.s.shareSub': 'ما يراه الناس حين يُرسَل الرابط في واتساب أو يُنشر على لينكدإن وX وفيسبوك.',
      'seo.img': 'صورة المشاركة', 'seo.imgHint': 'المقاس المقترح \u20661200 × 630\u2069 بكسل، بصيغة JPG أو PNG وبحجم أقل من 300 كيلوبايت. اختره من الوسائط، أو ضع الملف في مجلد assets واكتب مساره.',
      'seo.pick': 'اختر من الوسائط', 'seo.clearImg': 'أزل الصورة', 'seo.imgRemoved': 'أُزيلت صورة المشاركة.',
      'seo.noImg': 'لا صورة للمشاركة بعد، لذلك تظهر الروابط كبطاقات نصية فقط.', 'seo.noImgShort': 'بلا صورة',
      'seo.imgLoading': 'جارٍ فحص الصورة…', 'seo.imgErr': 'تعذّر تحميل {path}. تحقّق من المسار ومن رفع الملف مع الموقع.',
      'seo.imgUpload': 'هذه الصورة محفوظة في هذا المتصفح. تحتاج تطبيقات التواصل إلى ملف منشور: ضعه في assets واستخدم مساره.',
      'seo.okSize': 'المقاس والحجم مناسبان لكل التطبيقات.', 'seo.small': 'صغيرة جداً: استخدم عرضاً لا يقل عن 1200 بكسل.', 'seo.smallish': 'عرضها أقل من 1200 بكسل: قد تبدو باهتة على الشاشات الكبيرة.',
      'seo.crop': 'نسبتها ليست 1.91:1، لذلك ستقصّها التطبيقات.', 'seo.heavy': 'أكبر من 300 كيلوبايت: كثيراً ما يتجاهل واتساب الصور بهذا الحجم.', 'seo.sizeUnknown': 'حجم الملف غير معروف',
      'seo.linkPrev': 'معاينة الرابط', 'seo.x': 'X', 'seo.li': 'لينكدإن', 'seo.wa': 'واتساب', 'seo.fb': 'فيسبوك', 'seo.from': 'من {host}',
      'seo.shownIn': 'لغة المعاينة: {lang}، وهي لغة وسوم الرأس.', 'seo.waSkipped': 'أُسقطت الصورة: يتجاهل واتساب الصور الأكبر من 300 كيلوبايت.',
      'seo.socialNote': 'تقرأ تطبيقات التواصل رأس ملف index.html فقط، ولا تشغّل سكربتات الموقع، لذلك لا يكفي النشر: الصق وسوم الرأس أدناه في index.html.',
      'seo.toHead': 'إلى وسوم الرأس',
      'seo.s.theme': 'لون السمة', 'seo.s.themeSub': 'يلوّن شريط المتصفح على الجوال أثناء تصفّح الموقع.', 'seo.themeLabel': 'لون السمة', 'seo.useBrand': 'استخدم لوناً من الهوية',
      'seo.c.tide': 'المدّ', 'seo.c.deep': 'العمق', 'seo.c.shore': 'الشاطئ', 'seo.c.flare': 'الوهج', 'seo.c.foam': 'الزبد',
      'seo.s.head': 'وسوم الرأس لملف index.html', 'seo.s.headSub': 'العنوان والوصف ووسوم Open Graph وبطاقة X وبدائل اللغة ولون السمة، جاهزة للّصق.',
      'seo.site': 'رابط الموقع', 'seo.siteHint': 'يُستخدم في كل الروابط أدناه.', 'seo.siteErr': 'اكتب الرابط كاملاً، مثل https://miras.qa',
      'seo.arUrl': 'رابط النسخة العربية', 'seo.arUrlHint': 'يُفتح الموقع بالعربية على {url}. اترك الحقل فارغاً لاستخدامه، أو اكتب رابطاً آخر إن كانت النسخة العربية في مكان آخر.',
      'seo.urlErr': 'اكتب رابطاً كاملاً يبدأ بـ https://',
      'seo.shareLang': 'لغة معاينة الروابط', 'seo.shareLangHint': 'تقرأ التطبيقات رأس ملف index.html دون تشغيل الموقع، لذلك تظهر معاينة الرابطين بهذه اللغة.',
      'seo.structured': 'البيانات المنظّمة', 'seo.incLd': 'أدرجها ضمن وسوم الرأس',
      'seo.why': 'الصق هذه الوسوم داخل <code>&lt;head&gt;</code> في index.html مكان أسطر العنوان والوصف و theme-color. يقرأ واتساب ولينكدإن وX وفيسبوك هذا الملف وحده، لا ملف content.js.',
      'seo.sync.ok': 'ملف index.html يحتوي هذه الوسوم بالفعل.', 'seo.sync.diff': 'عدد الوسوم المختلفة بين index.html وهذه المسودة: {n}.', 'seo.sync.diffOne': 'وسم واحد في index.html يختلف عن هذه المسودة.',
      'seo.sync.missing': 'لا يحتوي index.html وسوم مشاركة بعد، لذلك تظهر الروابط بلا بطاقة عنوان أو صورة.', 'seo.sync.err': 'تعذّرت قراءة index.html للمقارنة.',
      'seo.sync.checking': 'جارٍ المقارنة مع index.html…', 'seo.recheck': 'افحص مجدداً',
      'seo.col.tag': 'الوسم', 'seo.col.live': 'في index.html الآن', 'seo.col.want': 'في هذه الوسوم', 'seo.absent': 'غير موجود',
      'seo.copiedHead': 'نُسخت وسوم الرأس. الصقها في index.html.',
      'seo.s.ld': 'البيانات المنظّمة', 'seo.s.ldSub': 'تعرّف Google باسم الاستوديو وعنوانه وساعات عمله ووسائل التواصل معه، للوحة النشاط التجاري والخرائط.',
      'seo.ldType': 'النوع', 'seo.ldPro': 'خدمة مهنية', 'seo.ldLocal': 'نشاط تجاري محلي',
      'seo.sameAs': 'الحسابات في مواقع أخرى', 'seo.sameAsHint': 'إنستغرام، لينكدإن، X، بيهانس… يستخدمها Google لربط العلامة بحساباتها.',
      'seo.addLink': 'أضف رابطاً', 'seo.linkErr': 'لا يبدو هذا رابطاً صالحاً.', 'seo.linkDup': 'هذا الرابط موجود في القائمة.', 'seo.linkRemoved': 'أُزيل الرابط.', 'seo.linkRemove': 'أزل الرابط', 'seo.noLinks': 'لا حسابات بعد.',
      'seo.noPhone': 'لا رقم هاتف بعد. أضف رقم واتساب من الإعدادات ليظهر هنا.', 'seo.noAddr': 'لا عنوان بعد. أضفه من «الصفحات والنصوص» في قسم الاستوديو.',
      'seo.noDays': 'لم تُحدَّد أيام عمل، لذلك أُغفلت الساعات.', 'seo.fromContent': 'الاسم والعنوان والبريد والساعات مأخوذة من محتوى الموقع، فتبقى متوافقة معه.',
      'seo.openSettings': 'افتح الإعدادات', 'seo.test': 'اختبرها في Google', 'seo.copiedLd': 'نُسخت البيانات المنظّمة.',
      'seo.s.files': 'ملفا robots.txt و sitemap.xml', 'seo.s.filesSub': 'ارفع الملفين إلى المجلد الرئيسي للموقع بجانب index.html. ويُبقي robots.txt محركات البحث بعيداً عن ‎/admin/‎ أيضاً.',
      'seo.download': 'تنزيل', 'seo.copy': 'نسخ', 'seo.downloaded': 'نُزّل {file}. ارفعه بجانب index.html.',
      'seo.audit': 'التدقيق', 'seo.auditSub': 'يتحدّث أثناء الكتابة',
      'seo.score.good': 'في حالة جيدة', 'seo.score.ok': 'بقيت إصلاحات قليلة', 'seo.score.bad': 'يحتاج إلى عمل',
      'seo.passN': { zero: 'لا فحوص بعد', one: 'نجح {p} من فحص واحد', two: 'نجح {p} من فحصين', few: 'نجح {p} من {t} فحوص', many: 'نجح {p} من {t} فحصاً', other: 'نجح {p} من {t} فحص' },
      'seo.a.titleEn': 'طول العنوان الإنجليزي', 'seo.a.titleAr': 'طول العنوان العربي', 'seo.a.descEn': 'طول الوصف الإنجليزي', 'seo.a.descAr': 'طول الوصف العربي',
      'seo.a.langs': 'اللغتان مكتملتان', 'seo.a.img': 'صورة المشاركة موجودة وبمقاس مناسب', 'seo.a.theme': 'لون السمة', 'seo.a.hreflang': 'بدائل اللغة (hreflang)', 'seo.a.head': 'الوسوم مضافة إلى index.html',
      'seo.d.langsOk': 'العنوان والوصف موجودان بالإنجليزية والعربية.', 'seo.d.langsMiss': 'ناقص: {list}.',
      'seo.d.themeOk': '{hex} يلوّن شريط المتصفح.', 'seo.d.themeBad': 'ليس لوناً صالحاً، فتتجاهله المتصفحات.',
      'seo.d.hrefOk': 'للنسخة العربية رابط خاص بها: {url}', 'seo.d.hrefShared': 'تشترك النسخة العربية في الرابط الإنجليزي، فلا يستطيع Google توجيه الباحثين بالعربية إليها مباشرة.',
      'seo.d.pending': 'جارٍ الفحص…', 'seo.d.headOk': 'ملف index.html مطابق لهذه المسودة.',
      'seo.lang.en': 'الإنجليزية', 'seo.lang.ar': 'العربية',
      'seo.f.titleEn': 'العنوان الإنجليزي', 'seo.f.titleAr': 'العنوان العربي', 'seo.f.descEn': 'الوصف الإنجليزي', 'seo.f.descAr': 'الوصف العربي',
      'seo.title.page': 'الظهور والمشاركة',
      'seo.codeHead': 'وسوم الرأس لملف index.html', 'seo.codeLd': 'البيانات المنظّمة (JSON-LD)', 'seo.codeFile': 'محتوى {file}',
      'seo.tm.live': 'منشور', 'seo.tm.edited': 'مُعدَّل ولم يُنشر بعد',
      'seo.imgUploadTo': 'هذه الصورة مرفوعة في هذا المتصفح. عند النشر إلى مجلد الموقع تُكتب في {path}، ووسوم الرأس تشير إليها مسبقاً. وإن نزّلت ملف content.js بدلاً من ذلك، فارفع هذا الملف أيضاً.',
    },
    fa: {
      'seo.sub': 'میراس در گوگل و هنگام اشتراک‌گذاری پیوندش چگونه دیده می‌شود. همهٔ بررسی‌ها هم‌زمان با نوشتن به‌روز می‌شوند.',
      'seo.copyHead': 'کپی تگ‌های head', 'seo.moreActions': 'کارهای بیشتر',
      'seo.dlRobots': 'دانلود robots.txt', 'seo.dlSitemap': 'دانلود sitemap.xml', 'seo.copyLd': 'کپی دادهٔ ساختاریافته',
      'seo.s.search': 'نتیجهٔ جست‌وجو', 'seo.s.searchSub': 'عنوان و توضیحی که گوگل نشان می‌دهد، بر حسب پیکسل و همان‌طور که گوگل کوتاهشان می‌کند.',
      'seo.title': 'عنوان', 'seo.desc': 'توضیح',
      'seo.titleHint': 'با نام شروع کنید، بعد بگویید چه می‌کنید و کجا.', 'seo.descHint': 'یکی دو جمله که خواننده را به کلیک ترغیب کند.',
      'seo.m.nums': '{px} پیکسل · {n} نویسه',
      'seo.m.good': 'طول مناسب', 'seo.m.shortT': 'کوتاه: جا برای چند واژهٔ دیگر هست', 'seo.m.shortD': 'کوتاه: شاید گوگل خودش متنی بنویسد',
      'seo.m.over': 'بلند: گوگل حدود {n} نویسه را نشان می‌دهد', 'seo.m.emptyT': 'خالی: گوگل خودش عنوانی می‌سازد', 'seo.m.emptyD': 'خالی: گوگل سطری از صفحه برمی‌دارد',
      'seo.googlePrev': 'نتیجهٔ گوگل', 'seo.approx': 'پیش‌نمایش تقریبی', 'seo.desktop': 'دسکتاپ', 'seo.mobile': 'موبایل', 'seo.arabic': 'عربی',
      'seo.s.share': 'اشتراک‌گذاری', 'seo.s.shareSub': 'آنچه مردم می‌بینند وقتی پیوند در واتس‌اپ فرستاده یا در لینکدین، ایکس و فیسبوک منتشر می‌شود.',
      'seo.img': 'تصویر اشتراک‌گذاری', 'seo.imgHint': 'پیشنهاد: ‎۱۲۰۰ × ۶۳۰‎ پیکسل، JPG یا PNG، کمتر از ۳۰۰ کیلوبایت. از «رسانه» انتخاب کنید، یا فایل را در assets بگذارید و مسیرش را بنویسید.',
      'seo.pick': 'انتخاب از رسانه', 'seo.clearImg': 'برداشتن تصویر', 'seo.imgRemoved': 'تصویر اشتراک‌گذاری برداشته شد.',
      'seo.noImg': 'هنوز تصویری برای اشتراک‌گذاری نیست، پس پیوندها به شکل کارت متنی دیده می‌شوند.', 'seo.noImgShort': 'بی‌تصویر',
      'seo.imgLoading': 'در حال بررسی تصویر…', 'seo.imgErr': '{path} بارگذاری نشد. مسیر را بررسی کنید و مطمئن شوید فایل همراه سایت بارگذاری شده است.',
      'seo.imgUpload': 'این تصویر در همین مرورگر ذخیره شده است. شبکه‌های اجتماعی فایل عمومی لازم دارند: آن را در assets بگذارید و مسیرش را به کار ببرید.',
      'seo.imgUploadTo': 'این تصویر در همین مرورگر بارگذاری شده است. انتشار در پوشهٔ سایت آن را در {path} می‌نویسد و تگ‌های head از همین حالا به آنجا اشاره می‌کنند. اگر به‌جای آن content.js را دانلود می‌کنید، این فایل را هم بارگذاری کنید.',
      'seo.okSize': 'اندازه و حجم برای همهٔ برنامه‌ها مناسب است.', 'seo.small': 'خیلی کوچک: دست‌کم ۱۲۰۰ پیکسل عرض بگذارید.', 'seo.smallish': 'عرض کمتر از ۱۲۰۰ پیکسل: شاید روی صفحه‌های بزرگ تار دیده شود.',
      'seo.crop': 'نسبتش ۱٫۹۱:۱ نیست، پس برنامه‌ها آن را برش می‌دهند.', 'seo.heavy': 'بیش از ۳۰۰ کیلوبایت: واتس‌اپ اغلب تصویرهای به این سنگینی را نشان نمی‌دهد.', 'seo.sizeUnknown': 'حجم فایل نامعلوم',
      'seo.linkPrev': 'پیش‌نمایش پیوند', 'seo.x': 'ایکس', 'seo.li': 'لینکدین', 'seo.wa': 'واتس‌اپ', 'seo.fb': 'فیسبوک', 'seo.from': 'از {host}',
      'seo.shownIn': 'به {lang} نمایش داده می‌شود، زبان تگ‌های head.', 'seo.waSkipped': 'تصویر حذف شد: واتس‌اپ تصویرهای بزرگ‌تر از ۳۰۰ کیلوبایت را نشان نمی‌دهد.',
      'seo.socialNote': 'شبکه‌های اجتماعی فقط head فایل index.html را می‌خوانند و اسکریپت‌های سایت را اجرا نمی‌کنند؛ پس انتشار کافی نیست: تگ‌های head زیر را در index.html بچسبانید.',
      'seo.toHead': 'رفتن به تگ‌های head',
      'seo.s.theme': 'رنگ پوسته', 'seo.s.themeSub': 'نوار مرورگر را روی موبایل، وقتی کسی در سایت است، رنگی می‌کند.', 'seo.themeLabel': 'رنگ پوسته', 'seo.useBrand': 'استفاده از رنگ برند',
      'seo.c.tide': 'مد', 'seo.c.deep': 'ژرفا', 'seo.c.shore': 'ساحل', 'seo.c.flare': 'شعله', 'seo.c.foam': 'کف',
      'seo.s.head': 'تگ‌های head برای index.html', 'seo.s.headSub': 'عنوان، توضیح، Open Graph، کارت ایکس، جایگزین‌های زبانی و رنگ پوسته، آمادهٔ چسباندن.',
      'seo.site': 'نشانی سایت', 'seo.siteHint': 'در همهٔ پیوندهای زیر به کار می‌رود.', 'seo.siteErr': 'نشانی کامل بنویسید، مثل https://miras.qa',
      'seo.arUrl': 'نشانی نسخهٔ عربی', 'seo.arUrlHint': 'سایت در {url} به عربی باز می‌شود. برای استفاده از همین نشانی خالی‌اش بگذارید، یا اگر نسخهٔ عربی جای دیگری است نشانی‌اش را بنویسید.',
      'seo.urlErr': 'نشانی کاملی بنویسید که با https://‎ شروع شود.',
      'seo.shareLang': 'زبان پیش‌نمایش پیوند', 'seo.shareLangHint': 'برنامه‌ها head فایل index.html را بدون اجرای سایت می‌خوانند، پس پیش‌نمایش هر دو نشانی به همین زبان است.',
      'seo.structured': 'دادهٔ ساختاریافته', 'seo.incLd': 'در تگ‌های head بیاید',
      'seo.why': 'این‌ها را در <code>&lt;head&gt;</code> فایل index.html بچسبانید و سطرهای title، description و theme-color را با آن‌ها جایگزین کنید. واتس‌اپ، لینکدین، ایکس و فیسبوک فقط همین فایل را می‌خوانند، نه content.js.',
      'seo.sync.ok': 'index.html همین حالا این تگ‌ها را دارد.', 'seo.sync.diff': '{n} تگ در index.html با این پیش‌نویس فرق دارد.', 'seo.sync.diffOne': 'یک تگ در index.html با این پیش‌نویس فرق دارد.',
      'seo.sync.missing': 'index.html هنوز تگ اشتراک‌گذاری ندارد، پس پیوندهای به‌اشتراک‌گذاشته بدون کارت عنوان یا تصویر دیده می‌شوند.', 'seo.sync.err': 'خواندن index.html برای مقایسه ممکن نشد.',
      'seo.sync.checking': 'در حال مقایسه با index.html…', 'seo.recheck': 'بررسی دوباره',
      'seo.col.tag': 'تگ', 'seo.col.live': 'اکنون در index.html', 'seo.col.want': 'در این تگ‌ها', 'seo.absent': 'نیست',
      'seo.copiedHead': 'تگ‌های head کپی شد. آن‌ها را در index.html بچسبانید.',
      'seo.s.ld': 'دادهٔ ساختاریافته', 'seo.s.ldSub': 'نام، نشانی، ساعت کاری و راه‌های تماس استودیو را برای پنل کسب‌وکار و نقشهٔ گوگل می‌گوید.',
      'seo.ldType': 'نوع', 'seo.ldPro': 'خدمات حرفه‌ای', 'seo.ldLocal': 'کسب‌وکار محلی',
      'seo.sameAs': 'حساب‌ها در جاهای دیگر', 'seo.sameAsHint': 'اینستاگرام، لینکدین، ایکس، بیهنس… گوگل از این‌ها برای پیوند دادن برند استفاده می‌کند.',
      'seo.addLink': 'افزودن پیوند', 'seo.linkErr': 'این به نشانی وب شبیه نیست.', 'seo.linkDup': 'این پیوند در فهرست هست.', 'seo.linkRemoved': 'پیوند برداشته شد.', 'seo.linkRemove': 'برداشتن پیوند', 'seo.noLinks': 'هنوز حسابی نیست.',
      'seo.noPhone': 'هنوز شماره تلفنی نیست. برای افزودنش شمارهٔ واتس‌اپ را در «تنظیمات» وارد کنید.', 'seo.noAddr': 'هنوز نشانی‌ای نیست. آن را در «صفحه‌ها و متن‌ها» بخش استودیو بیفزایید.',
      'seo.noDays': 'روز کاری تعیین نشده، پس ساعت‌ها حذف شده‌اند.', 'seo.fromContent': 'نام، نشانی، ایمیل و ساعت‌ها از محتوای سایت می‌آیند، پس با آن هماهنگ می‌مانند.',
      'seo.openSettings': 'باز کردن تنظیمات', 'seo.test': 'آزمون با گوگل', 'seo.copiedLd': 'دادهٔ ساختاریافته کپی شد.',
      'seo.s.files': 'robots.txt و sitemap.xml', 'seo.s.filesSub': 'هر دو را در پوشهٔ اصلی سایت، کنار index.html، بارگذاری کنید. robots.txt موتورهای جست‌وجو را از ‎/admin/‎ هم دور نگه می‌دارد.',
      'seo.download': 'دانلود', 'seo.copy': 'کپی', 'seo.downloaded': '{file} دانلود شد. آن را کنار index.html بارگذاری کنید.',
      'seo.audit': 'بازبینی', 'seo.auditSub': 'هم‌زمان با نوشتن به‌روز می‌شود',
      'seo.score.good': 'در وضعیت خوب', 'seo.score.ok': 'چند اصلاح مانده', 'seo.score.bad': 'کار لازم دارد', 'seo.passN': '{p} از {t} بررسی قبول شد',
      'seo.a.titleEn': 'طول عنوان انگلیسی', 'seo.a.titleAr': 'طول عنوان عربی', 'seo.a.descEn': 'طول توضیح انگلیسی', 'seo.a.descAr': 'طول توضیح عربی',
      'seo.a.langs': 'هر دو زبان پر شده', 'seo.a.img': 'تصویر اشتراک‌گذاری با اندازهٔ درست', 'seo.a.theme': 'رنگ پوسته', 'seo.a.hreflang': 'جایگزین‌های زبانی (hreflang)', 'seo.a.head': 'تگ‌ها در index.html چسبانده شده',
      'seo.d.langsOk': 'عنوان و توضیح به انگلیسی و عربی هست.', 'seo.d.langsMiss': 'کم است: {list}.',
      'seo.d.themeOk': '{hex} نوار مرورگر را رنگ می‌کند.', 'seo.d.themeBad': 'رنگ معتبری نیست، پس مرورگرها نادیده‌اش می‌گیرند.',
      'seo.d.hrefOk': 'نسخهٔ عربی نشانی خودش را دارد: {url}', 'seo.d.hrefShared': 'عربی با نشانی انگلیسی یکی است، پس گوگل نمی‌تواند جست‌وجوکنندگان عرب‌زبان را مستقیم به عربی بفرستد.',
      'seo.d.pending': 'در حال بررسی…', 'seo.d.headOk': 'index.html با این پیش‌نویس یکی است.',
      'seo.lang.en': 'انگلیسی', 'seo.lang.ar': 'عربی',
      'seo.f.titleEn': 'عنوان انگلیسی', 'seo.f.titleAr': 'عنوان عربی', 'seo.f.descEn': 'توضیح انگلیسی', 'seo.f.descAr': 'توضیح عربی',
      'seo.title.page': 'سئو و اشتراک‌گذاری',
      'seo.codeHead': 'تگ‌های head برای index.html', 'seo.codeLd': 'دادهٔ ساختاریافته (JSON-LD)', 'seo.codeFile': 'محتوای {file}',
      'seo.tm.live': 'منتشرشده', 'seo.tm.edited': 'ویرایش شده، هنوز منتشر نشده',
    },
  });

  /* ================= settings that live in the admin (not on the site) ================= */
  const CFG_KEY = 'seo.cfg';
  const CFG_DEF = { site: 'https://miras.qa', arUrl: '', shareLang: 'en', ldType: 'ProfessionalService', headLd: true, sameAs: [] };
  const cfg = () => ({ ...CFG_DEF, ...(MA.db.get(CFG_KEY, {}) || {}) });
  const setCfg = patch => MA.db.set(CFG_KEY, { ...cfg(), ...patch });

  const get = p => MA.content.get(p);
  const plain = v => MA.strip(v ?? '').replace(/\s+/g, ' ').trim();
  const can = () => MA.can('content.edit');
  const esc = MA.esc;
  const S = { serp: 'desktop', net: 'wa' }; // remembered while the admin is open
  let V = null;

  /* ================= addresses ================= */
  const normSite = s => { s = String(s || '').trim(); if (!s) return ''; if (!/^https?:\/\//i.test(s)) s = 'https://' + s; return s.replace(/\/+$/, ''); };
  const validUrl = s => { try { const u = new URL(s); return /^https?:$/.test(u.protocol) && u.hostname.includes('.') && !/\s/.test(s); } catch (e) { return false; } };
  const base = (c = cfg()) => { const s = normSite(c.site); return validUrl(s) ? s : CFG_DEF.site; };
  const host = (c = cfg()) => { try { return new URL(base(c)).host; } catch (e) { return 'miras.qa'; } };
  const home = (c = cfg()) => base(c) + '/';
  /** The site opens in Arabic at ?lang=ar (SITE-CONTRACT §6), so that is the Arabic address unless another one is set. */
  const arAuto = (c = cfg()) => home(c) + '?lang=ar';
  const arHome = (c = cfg()) => { const a = String(c.arUrl || '').trim(); return !a ? arAuto(c) : validUrl(a) && a !== home(c) ? a : ''; };
  const isHex = v => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v || '').trim());
  /** Absolute URL of the sharing image for tags ('' when it isn't a public file). */
  function absImg(v, c = cfg()) {
    v = String(v || '').trim(); if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    if (/^media:/i.test(v)) { const tp = uploadTarget(v); return tp ? base(c) + '/' + tp : ''; }
    if (/^(data:|blob:)/i.test(v)) return '';
    return base(c) + '/' + v.replace(/^\.?\/+/, '');
  }
  /** Where publishing will write an upload ('media:<id>' → 'assets/uploads/<file>'), via MA.media when the Media module is there. */
  function uploadTarget(v) {
    try { return typeof MA.media?.referenced === 'function' ? (MA.media.referenced({ seo: { ogImage: v } })[0]?.targetPath || '') : ''; } catch (e) { return ''; }
  }
  /** URL the admin can load to show / measure the image. Uploads ('media:<id>') resolve through MA.media when it exists. */
  function previewSrc(v) {
    v = String(v || '').trim(); if (!v) return '';
    if (/^(https?:|data:|blob:)/i.test(v)) return v;
    if (/^media:/i.test(v)) {
      try { const m = MA.media, r = m?.url?.(v) ?? m?.src?.(v) ?? m?.resolve?.(v); if (typeof r === 'string' && r) return r; } catch (e) {}
      try { const r = MA.content.forPreview()?.seo?.ogImage; if (typeof r === 'string' && r && r !== v) return r; } catch (e) {}
      return '';
    }
    return '../' + v.replace(/^\.?\/+/, '');
  }

  /* ================= measuring (pixels, the way Google cuts) ================= */
  const cv = document.createElement('canvas').getContext('2d');
  const px = (t, font) => { cv.font = font; return cv.measureText(t).width; };
  const SPEC = { title: { font: '20px Arial, sans-serif', max: 600, min: 300 }, desc: { font: '14px Arial, sans-serif', max: 920, min: 400 } };
  function fit(t, maxPx, font, ell = ' …') {
    if (px(t, font) <= maxPx) return t;
    let lo = 0, hi = t.length;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (px(t.slice(0, mid).trimEnd() + ell, font) <= maxPx) lo = mid; else hi = mid - 1; }
    const sp = t.lastIndexOf(' ', lo); // Google cuts at a word boundary when it can
    return t.slice(0, sp > lo * .7 ? sp : lo).replace(/[\s,;:.\-—–]+$/, '') + ell;
  }
  function measure(text, kind) {
    const s = SPEC[kind], t = plain(text), w = Math.round(px(t, s.font));
    const state = !t ? 'empty' : w > s.max ? 'over' : w < s.min ? 'short' : 'good';
    return { t, w, n: [...t].length, state, shown: state === 'over' ? [...fit(t, s.max, s.font, '')].length : [...t].length, max: s.max };
  }
  const stateText = (m, kind) => m.state === 'good' ? MA.t('seo.m.good')
    : m.state === 'short' ? MA.t(kind === 'title' ? 'seo.m.shortT' : 'seo.m.shortD')
    : m.state === 'over' ? MA.t('seo.m.over', { n: MA.num(m.shown) })
    : MA.t(kind === 'title' ? 'seo.m.emptyT' : 'seo.m.emptyD');
  const lenState = m => (m.state === 'good' ? 'pass' : m.state === 'empty' ? 'fail' : 'warn');

  /* ================= the sharing image: dimensions + file size ================= */
  const IMG = new Map(); // src → Promise<info>
  let IMG_NOW = null;    // last checked {raw, src, w, h, bytes, type, state}
  function inspectImage(src) {
    if (!IMG.has(src)) IMG.set(src, new Promise(res => {
      const info = { src, w: 0, h: 0, bytes: null, type: '', state: 'loading' };
      const im = new Image();
      const sized = new Promise(r => { im.onload = () => { info.w = im.naturalWidth; info.h = im.naturalHeight; r(true); }; im.onerror = () => r(false); });
      im.src = src;
      const fetched = fetch(src, { cache: 'no-store' }).then(r => (r.ok ? r.blob() : null)).then(b => { if (b) { info.bytes = b.size; info.type = b.type || ''; } }).catch(() => {});
      const timeout = new Promise(r => setTimeout(() => r('timeout'), 9000));
      Promise.race([Promise.all([sized, fetched]), timeout]).then(v => { info.state = v !== 'timeout' && v[0] ? 'ok' : 'error'; res(info); });
    }));
    return IMG.get(src);
  }
  async function ensureImg() {
    const raw = String(get('seo/ogImage') || '').trim(), src = previewSrc(raw);
    if (!raw) { IMG_NOW = null; return null; }
    if (!src) { IMG_NOW = { raw, src: '', state: 'unresolved' }; return IMG_NOW; }
    if (IMG_NOW?.raw === raw && IMG_NOW.state !== 'loading') return IMG_NOW;
    const info = await inspectImage(src);
    if (String(get('seo/ogImage') || '').trim() === raw) IMG_NOW = { raw, ...info };
    return IMG_NOW;
  }
  const HEAVY = 300 * 1024;
  function imgIssues(info) {
    const out = [];
    if (!info || info.state !== 'ok') return out;
    if (info.w < 600) out.push({ tone: 'bad', key: 'seo.small' });
    else if (info.w < 1200) out.push({ tone: 'warn', key: 'seo.smallish' });
    if (info.h && Math.abs(info.w / info.h - 1.91) > 0.12) out.push({ tone: 'warn', key: 'seo.crop' });
    if (info.bytes != null && info.bytes > HEAVY) out.push({ tone: 'warn', key: 'seo.heavy' });
    return out;
  }

  /* ================= generators ================= */
  const siteName = l => (plain(get(`seo/${l}/title`)).split(/\s+[—–|-]\s+/)[0] || 'MIRAS').trim();
  const xHandle = c => { for (const u of c.sameAs || []) { const m = /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/@?([A-Za-z0-9_]{1,15})\/?$/i.exec(u); if (m) return '@' + m[1]; } return ''; };
  /** Everything the tags need, from the draft + settings. */
  function pack() {
    const c = cfg(), L = c.shareLang === 'ar' ? 'ar' : 'en';
    const title = plain(get(`seo/${L}/title`)) || plain(get('seo/en/title')) || 'MIRAS';
    const desc = plain(get(`seo/${L}/description`)) || plain(get('seo/en/description'));
    const theme = String(get('seo/themeColor') || '').trim(), raw = String(get('seo/ogImage') || '').trim();
    const img = absImg(raw, c), h = home(c), a = arHome(c);
    return { c, L, title, desc, theme, raw, img, home: h, ar: a, url: L === 'ar' && a ? a : h, site: siteName('en'), x: xHandle(c),
      twCard: img ? 'summary_large_image' : 'summary', hreflang: [`en ${h}`, ...(a ? [`ar ${a}`] : []), `x-default ${h}`].sort() };
  }

  function headTags() {
    const p = pack(), lines = [];
    lines.push(`<title>${esc(p.title)}</title>`, `<meta name="description" content="${esc(p.desc)}">`);
    // one static head serves every address of index.html, so a canonical only makes sense while there is one address
    if (!p.ar) lines.push(`<link rel="canonical" href="${esc(p.home)}">`);
    lines.push(`<link rel="alternate" hreflang="en" href="${esc(p.home)}">`);
    if (p.ar) lines.push(`<link rel="alternate" hreflang="ar" href="${esc(p.ar)}">`);
    lines.push(`<link rel="alternate" hreflang="x-default" href="${esc(p.home)}">`);
    if (isHex(p.theme)) lines.push(`<meta name="theme-color" content="${esc(p.theme.toUpperCase())}">`);
    lines.push('', '<!-- Open Graph: WhatsApp, LinkedIn, Facebook -->',
      '<meta property="og:type" content="website">', `<meta property="og:site_name" content="${esc(p.site)}">`, `<meta property="og:url" content="${esc(p.url)}">`,
      `<meta property="og:title" content="${esc(p.title)}">`, `<meta property="og:description" content="${esc(p.desc)}">`,
      `<meta property="og:locale" content="${p.L === 'ar' ? 'ar_AR' : 'en_GB'}">`, `<meta property="og:locale:alternate" content="${p.L === 'ar' ? 'en_GB' : 'ar_AR'}">`);
    const info = IMG_NOW?.raw === p.raw ? IMG_NOW : null;
    if (p.img) {
      lines.push(`<meta property="og:image" content="${esc(p.img)}">`);
      if (info?.state === 'ok' && info.w) lines.push(`<meta property="og:image:width" content="${info.w}">`, `<meta property="og:image:height" content="${info.h}">`);
      if (info?.state === 'ok' && /^image\//.test(info.type)) lines.push(`<meta property="og:image:type" content="${esc(info.type)}">`);
      lines.push(`<meta property="og:image:alt" content="${esc(p.title)}">`);
    } else if (p.raw) lines.push('<!-- og:image left out: the sharing image is an upload this browser can’t resolve. Put the file in assets/ and set that path in SEO & sharing. -->');
    lines.push('', '<!-- X (Twitter) -->', `<meta name="twitter:card" content="${p.twCard}">`);
    if (p.x) lines.push(`<meta name="twitter:site" content="${esc(p.x)}">`);
    lines.push(`<meta name="twitter:title" content="${esc(p.title)}">`, `<meta name="twitter:description" content="${esc(p.desc)}">`);
    if (p.img) lines.push(`<meta name="twitter:image" content="${esc(p.img)}">`);
    if (p.c.headLd) lines.push('', '<!-- Structured data for Google -->', '<script type="application/ld+json">', ldText(), '</script>');
    return lines.join('\n');
  }

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const COUNTRY = { qatar: 'QA', 'saudi arabia': 'SA', ksa: 'SA', uae: 'AE', 'united arab emirates': 'AE', kuwait: 'KW', bahrain: 'BH', oman: 'OM', egypt: 'EG', jordan: 'JO', lebanon: 'LB' };
  /** PostalAddress from the studio address on the site (text st.addr, English): "Tower, Locality, Country". */
  function address() {
    const raw = plain(get('text/en/st.addr')); if (!raw) return null;
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean), adr = { '@type': 'PostalAddress' }, last = parts.at(-1), cc = COUNTRY[last.toLowerCase()] || last;
    if (parts.length >= 3) Object.assign(adr, { streetAddress: parts.slice(0, -2).join(', '), addressLocality: parts.at(-2), addressCountry: cc });
    else if (parts.length === 2) Object.assign(adr, { addressLocality: parts[0], addressCountry: cc });
    else adr.streetAddress = parts[0];
    return adr;
  }
  const phone = v => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 7 ? '+' + d : ''; };
  function ld() {
    const p = pack(), st = get('studio') || {};
    const o = { '@context': 'https://schema.org', '@type': p.c.ldType === 'LocalBusiness' ? 'LocalBusiness' : 'ProfessionalService', name: siteName('en') };
    const arName = siteName('ar'); if (arName && arName !== o.name) o.alternateName = arName;
    o.url = p.home;
    const d = plain(get('seo/en/description')); if (d) o.description = d;
    if (p.img) o.image = p.img;
    if (st.email) o.email = st.email;
    const tel = phone(st.whatsapp); if (tel) o.telephone = tel;
    const adr = address(); if (adr) o.address = adr;
    const days = [...new Set((st.days || []).map(Number).filter(n => n >= 0 && n <= 6))].sort((a, b) => a - b);
    if (days.length && st.open && st.close) o.openingHoursSpecification = [{ '@type': 'OpeningHoursSpecification', dayOfWeek: days.map(n => DAYS[n]), opens: st.open, closes: st.close }];
    o.knowsLanguage = ['en', 'ar'];
    const same = (p.c.sameAs || []).filter(validUrl); if (same.length) o.sameAs = same;
    return o;
  }
  const ldText = () => JSON.stringify(ld(), null, 2).replace(/</g, '\\u003c');
  const robots = () => { const p = pack(); return `# robots.txt for ${p.home}\n# Made in the MIRAS admin. The admin itself stays out of search.\nUser-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${p.home}sitemap.xml\n`; };
  function sitemap() {
    const p = pack(), at = Date.parse(MA.content.publishedMeta?.at || '') || Date.now(), day = MA.qDay ? MA.qDay(at) : new Date(at).toISOString().slice(0, 10);
    const alt = [`    <xhtml:link rel="alternate" hreflang="en" href="${esc(p.home)}"/>`, ...(p.ar ? [`    <xhtml:link rel="alternate" hreflang="ar" href="${esc(p.ar)}"/>`] : []), `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(p.home)}"/>`];
    const url = loc => `  <url>\n    <loc>${esc(loc)}</loc>\n    <lastmod>${day}</lastmod>\n${alt.join('\n')}\n  </url>`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${[p.home, ...(p.ar ? [p.ar] : [])].map(url).join('\n')}\n</urlset>\n`;
  }
  const FILES = { robots: { name: 'robots.txt', type: 'text/plain', make: robots }, sitemap: { name: 'sitemap.xml', type: 'application/xml', make: sitemap } };
  function dl(kind) { const f = FILES[kind]; MA.download(f.name, f.make(), f.type); MA.toast(MA.t('seo.downloaded', { file: `<b>${f.name}</b>` }), { icon: 'download' }); }
  async function copyHead() { await ensureImg().catch(() => {}); MA.copy(headTags(), MA.t('seo.copiedHead')); }
  const copyLd = () => MA.copy(ldText(), MA.t('seo.copiedLd'));

  /* ================= what index.html has right now ================= */
  let LIVE = null; // { state: 'loading' | 'ok' | 'error', head }
  async function readLive(force) {
    if (LIVE && !force && LIVE.state !== 'error') return LIVE;
    LIVE = { state: 'loading' }; V && refresh();
    try {
      const r = await fetch(MA.site.url + '?seo-check=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw new Error(r.status);
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      const meta = s => doc.querySelector(s)?.getAttribute('content') ?? null;
      LIVE = { state: 'ok', head: {
        title: doc.querySelector('title')?.textContent ?? null, description: meta('meta[name="description"]'), theme: meta('meta[name="theme-color"]'),
        ogTitle: meta('meta[property="og:title"]'), ogDesc: meta('meta[property="og:description"]'), ogImage: meta('meta[property="og:image"]'), twCard: meta('meta[name="twitter:card"]'),
        hreflang: [...doc.querySelectorAll('link[rel="alternate"][hreflang]')].map(l => `${l.getAttribute('hreflang')} ${l.getAttribute('href')}`).sort(),
        ld: !!doc.querySelector('script[type="application/ld+json"]') } };
    } catch (e) { LIVE = { state: 'error' }; }
    V && refresh();
    return LIVE;
  }
  const norm = v => String(v ?? '').replace(/\s+/g, ' ').trim();
  function headDiffs() {
    if (LIVE?.state !== 'ok') return null;
    const p = pack(), h = LIVE.head, out = [];
    const cmp = (tag, live, want) => { if (norm(live).toLowerCase() !== norm(want).toLowerCase()) out.push({ tag, live, want }); };
    cmp('<title>', h.title, p.title); cmp('description', h.description, p.desc);
    if (isHex(p.theme)) cmp('theme-color', h.theme, p.theme.toUpperCase());
    cmp('og:title', h.ogTitle, p.title); cmp('og:description', h.ogDesc, p.desc);
    if (p.img) cmp('og:image', h.ogImage, p.img);
    cmp('twitter:card', h.twCard, p.twCard);
    cmp('hreflang', h.hreflang.join(', ') || null, p.hreflang.join(', '));
    if (p.c.headLd) cmp('JSON-LD', h.ld ? 'application/ld+json' : null, 'application/ld+json');
    return { diffs: out, missing: !h.ogTitle && !h.ogImage && !h.twCard };
  }

  /* ================= audit ================= */
  function audit() {
    const items = [];
    for (const [kind, key] of [['title', 'title'], ['desc', 'description']]) for (const l of ['en', 'ar']) {
      const m = measure(get(`seo/${l}/${key}`), kind);
      items.push({ id: `${kind}-${l}`, sec: 'search', field: `seo/{lang}/${key}`, lang: l, state: lenState(m),
        title: MA.t(`seo.a.${kind}${l === 'en' ? 'En' : 'Ar'}`), detail: stateText(m, kind) });
    }
    const miss = [];
    for (const l of ['en', 'ar']) { if (!plain(get(`seo/${l}/title`))) miss.push(MA.t(`seo.f.title${l === 'en' ? 'En' : 'Ar'}`)); if (!plain(get(`seo/${l}/description`))) miss.push(MA.t(`seo.f.desc${l === 'en' ? 'En' : 'Ar'}`)); }
    items.push({ id: 'langs', sec: 'search', field: 'seo/{lang}/title', state: miss.length ? 'fail' : 'pass', title: MA.t('seo.a.langs'), detail: miss.length ? MA.t('seo.d.langsMiss', { list: miss.join(MA.isRTL() ? '، ' : ', ') }) : MA.t('seo.d.langsOk') });
    const raw = String(get('seo/ogImage') || '').trim(), info = IMG_NOW?.raw === raw ? IMG_NOW : null;
    let img;
    if (!raw) img = { state: 'fail', detail: MA.t('seo.noImg') };
    else if (!info || info.state === 'loading') img = { state: 'pending', detail: MA.t('seo.d.pending') };
    else if (info.state === 'unresolved') img = { state: 'warn', detail: MA.t('seo.imgUpload') };
    else if (info.state === 'error') img = { state: 'fail', detail: MA.t('seo.imgErr', { path: raw }) };
    else { const is = imgIssues(info); img = { state: is.some(x => x.tone === 'bad') ? 'fail' : is.length ? 'warn' : 'pass', detail: is.length ? is.map(x => MA.t(x.key)).join(' ') : `${MA.num(info.w)} × ${MA.num(info.h)} px · ${kb(info.bytes)}` }; }
    items.push({ id: 'img', sec: 'share', field: 'seo/ogImage', title: MA.t('seo.a.img'), ...img });
    const th = String(get('seo/themeColor') || '').trim();
    items.push({ id: 'theme', sec: 'theme', field: 'seo/themeColor', state: isHex(th) ? 'pass' : 'warn', title: MA.t('seo.a.theme'), detail: isHex(th) ? MA.t('seo.d.themeOk', { hex: th.toUpperCase() }) : MA.t('seo.d.themeBad') });
    items.push({ id: 'hreflang', sec: 'head', state: arHome() ? 'pass' : 'warn', title: MA.t('seo.a.hreflang'), detail: arHome() ? MA.t('seo.d.hrefOk', { url: '\u2066' + arHome() + '\u2069' }) : MA.t('seo.d.hrefShared') });
    const hd = headDiffs();
    items.push({ id: 'head', sec: 'head', title: MA.t('seo.a.head'),
      ...(LIVE?.state === 'error' ? { state: 'warn', detail: MA.t('seo.sync.err') }
        : !hd ? { state: 'pending', detail: MA.t('seo.d.pending') }
        : hd.missing ? { state: 'fail', detail: MA.t('seo.sync.missing') }
        : hd.diffs.length ? { state: 'warn', detail: hd.diffs.length === 1 ? MA.t('seo.sync.diffOne') : MA.t('seo.sync.diff', { n: hd.diffs.length }) }
        : { state: 'pass', detail: MA.t('seo.d.headOk') }) });
    return items;
  }
  const scoreOf = items => { const c = items.filter(i => i.state !== 'pending'); return { score: c.length ? Math.round(100 * c.reduce((s, i) => s + (i.state === 'pass' ? 1 : i.state === 'warn' ? .5 : 0), 0) / c.length) : 0, pass: c.filter(i => i.state === 'pass').length, warn: c.filter(i => i.state === 'warn').length, fail: c.filter(i => i.state === 'fail').length, total: c.length }; };
  const kb = b => (b == null ? MA.t('seo.sizeUnknown') : `${MA.num(Math.round(b / 1024))} KB`);

  /* ================= previews ================= */
  const favicon = '../assets/favicon.svg';
  function serpHTML(variant) {
    const L = variant === 'ar' ? 'ar' : 'en', mobile = variant === 'mobile';
    const title = plain(get(`seo/${L}/title`)), desc = plain(get(`seo/${L}/description`));
    const t = title ? (mobile ? title : fit(title, SPEC.title.max, SPEC.title.font)) : host();
    const d = desc ? (mobile ? desc : fit(desc, SPEC.desc.max, SPEC.desc.font)) : '';
    return `<div class="g-res${mobile ? ' g-mobile' : ''}" dir="${L === 'ar' ? 'rtl' : 'ltr'}" lang="${L}">
      <div class="g-site"><span class="g-fav"><img src="${favicon}" alt=""></span><span class="g-src"><span class="g-name">${esc(siteName(L) || 'MIRAS')}</span><span class="g-url">https://${esc(host())}</span></span><span class="g-more" aria-hidden="true">⋮</span></div>
      <h3 class="g-title${title ? '' : ' made'}">${esc(t)}</h3>${d ? `<p class="g-desc">${esc(d)}</p>` : ''}</div>`;
  }
  function imgBox(cls = '') {
    const i = IMG_NOW, raw = String(get('seo/ogImage') || '').trim();
    if (raw && i?.raw === raw && i.src && i.state !== 'error') return `<div class="sx-img ${cls}"><img src="${esc(i.src)}" alt=""></div>`;
    return '';
  }
  function socialHTML(net) {
    const p = pack(), dir = p.L === 'ar' ? 'rtl' : 'ltr', h = esc(host()), t = esc(p.title), d = esc(p.desc);
    const img = imgBox(), noimg = `<div class="sx-img none">${MA.icon('image', 'lg')}<span>${esc(MA.t('seo.noImgShort'))}</span></div>`;
    if (net === 'x') return `<div class="sx sx-x" dir="${dir}" lang="${p.L}">${img
      ? `<div class="x-card"><div class="x-media">${img}<span class="x-cap">${t}</span></div></div><div class="x-from">${esc(MA.t('seo.from', { host: host() }))}</div>`
      : `<div class="x-card x-sum"><div class="x-sq">${MA.icon('file', 'lg')}</div><div class="x-sumt"><span class="x-dom">${h}</span><b>${t}</b><span class="x-d">${d}</span></div></div>`}</div>`;
    if (net === 'li') return `<div class="sx sx-li" dir="${dir}" lang="${p.L}"><div class="li-card${img ? '' : ' li-small'}">${img || `<div class="li-sq">${MA.icon('image')}</div>`}<div class="li-meta"><b>${t}</b><span>${h}</span></div></div></div>`;
    if (net === 'fb') return `<div class="sx sx-fb" dir="${dir}" lang="${p.L}"><div class="fb-card">${img || noimg}<div class="fb-meta"><span class="fb-dom">${h.toUpperCase()}</span><b>${t}</b><span class="fb-d">${d}</span></div></div></div>`;
    // WhatsApp: very heavy images are often dropped
    const heavy = IMG_NOW?.bytes != null && IMG_NOW.bytes > HEAVY;
    return `<div class="sx sx-wa" dir="${dir}" lang="${p.L}"><div class="wa-bubble"><div class="wa-prev">${heavy ? '' : img}<div class="wa-txt"><b>${t}</b><span class="wa-d">${d}</span><span class="wa-dom">${h}</span></div></div>
      <div class="wa-msg"><span class="wa-link" dir="ltr">${esc(p.url)}</span><span class="wa-time">${esc(MA.time(Date.now()))}</span></div></div></div>`;
  }

  /* ================= page building blocks ================= */
  /** Content paths each section publishes with content.js (its tide mark says whether they differ from the live site). */
  const SEC_PATHS = { search: ['seo/en/title', 'seo/ar/title', 'seo/en/description', 'seo/ar/description'], share: ['seo/ogImage'], theme: ['seo/themeColor'] };
  const section = (id, title, sub, ...kids) => MA.h('section.card.se-sec', { id: 'se-' + id, dataset: { sec: id } },
    MA.h('header.se-sec-head', MA.h('h2.h3', SEC_PATHS[id] ? MA.h('span.se-tm', { dataset: { sec: id } }) : null, title), sub ? MA.h('p.small.muted', sub) : null), MA.h('div.se-sec-body', kids));
  function drawMarks() {
    V.root.querySelectorAll('.se-tm').forEach(el => {
      const st = SEC_PATHS[el.dataset.sec].some(p => MA.content.isChanged(p)) ? 'edited' : 'live';
      if (el.dataset.state === st) return;
      el.dataset.state = st; el.title = MA.t('seo.tm.' + st); el.innerHTML = ''; el.append(MA.ui.tideMark(st, MA.t('seo.tm.' + st)));
    });
  }
  const dropEye = box => box.querySelectorAll('.tools .icon-btn').forEach(b => { if (b.getAttribute('aria-label') === MA.t('showInPreview')) b.remove(); });
  function meter(kind) {
    const el = MA.h('div.se-meter', { dataset: { kind } }, MA.h('div.se-track', MA.h('i'), MA.h('b.se-limit')), MA.h('div.se-mline', MA.h('span.se-state'), MA.h('span.se-nums.num')));
    el.update = text => {
      const m = measure(text, kind), span = m.max * 1.25;
      el.dataset.state = m.state;
      el.querySelector('i').style.inlineSize = Math.min(100, m.w / span * 100).toFixed(1) + '%';
      el.querySelector('.se-limit').style.insetInlineStart = (m.max / span * 100).toFixed(1) + '%';
      el.querySelector('.se-state').textContent = stateText(m, kind);
      el.querySelector('.se-nums').innerHTML = MA.t('seo.m.nums', { px: `<bdi dir="ltr">${MA.num(m.w)} / ${MA.num(m.max)}</bdi>`, n: MA.num(m.n) });
    };
    return el;
  }
  function goSec(id, field, lang) {
    const el = id === 'audit' ? V?.root.querySelector('.se-audit') : V?.root.querySelector('#se-' + id); if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: MA.reducedMotion() ? 'auto' : 'smooth' });
    if (field) setTimeout(() => MA.form.focus(field, lang), 220);
  }
  function cfgInput(key, { label, hint, placeholder, validate }) {
    const inp = MA.h('input.input', { value: cfg()[key] || '', placeholder, dir: 'ltr', spellcheck: false, autocomplete: 'off', readOnly: !can(), dataset: { cfg: key } });
    const err = MA.h('p.err', { hidden: true });
    const save = MA.debounce(() => { const v = inp.value.trim(), e = validate?.(v) || ''; err.textContent = e; err.hidden = !e; inp.setAttribute('aria-invalid', String(!!e)); if (!e) setCfg({ [key]: v }); }, 220);
    inp.addEventListener('input', save);
    const f = MA.ui.field(esc(label), inp, { hint: hint ? esc(hint) : ' ' });
    err.id = inp.id + '-err'; inp.setAttribute('aria-describedby', [inp.getAttribute('aria-describedby'), err.id].filter(Boolean).join(' ')); // the error is read with the field
    f.append(err); return f;
  }

  function secSearch() {
    const t = MA.form.bi('seo/{lang}/title', { label: MA.t('seo.title'), kind: 'text', pick: '', hint: esc(MA.t('seo.titleHint')) });
    const d = MA.form.bi('seo/{lang}/description', { label: MA.t('seo.desc'), kind: 'textarea', pick: '', hint: esc(MA.t('seo.descHint')) });
    V.meters = [];
    for (const [box, kind, key] of [[t, 'title', 'title'], [d, 'desc', 'description']]) {
      dropEye(box);
      box.querySelectorAll('.cf-lang').forEach((w, k) => { const m = meter(kind); V.meters.push({ m, path: `seo/${['en', 'ar'][k]}/${key}` }); w.append(m); });
    }
    const seg = MA.ui.seg([{ value: 'desktop', icon: 'monitor', label: MA.t('seo.desktop') }, { value: 'mobile', icon: 'mobile', label: MA.t('seo.mobile') }, { value: 'ar', icon: 'language', label: MA.t('seo.arabic') }],
      S.serp, v => { S.serp = v; drawSerp(); }, { size: 'sm', label: MA.t('seo.googlePrev') });
    V.serpWell = MA.h('div.se-well.se-serp');
    return section('search', MA.t('seo.s.search'), MA.t('seo.s.searchSub'), t, d,
      MA.h('div.se-prevhead', MA.h('span.label', MA.t('seo.googlePrev')), MA.ui.badge(MA.t('seo.approx'), 'outline'), MA.h('span.grow'), seg), V.serpWell);
  }

  function secShare() {
    const field = MA.form.one('seo/ogImage', { label: MA.t('seo.img'), kind: 'text', placeholder: 'assets/share.jpg', dir: 'ltr', hint: esc(MA.t('seo.imgHint')) });
    V.thumb = MA.h('div.se-thumb');
    V.imgInfo = MA.h('div.se-imginfo');
    const btns = MA.h('div.btn-row.se-imgbtns');
    if (can() && typeof MA.media?.picker === 'function') btns.append(MA.ui.btn(MA.t('seo.pick'), { icon: 'image', size: 'sm', onclick: pickImage }));
    if (can()) { V.clearBtn = MA.ui.btn(MA.t('seo.clearImg'), { icon: 'trash', size: 'sm', kind: 'ghost', onclick: clearImage }); btns.append(V.clearBtn); }
    const net = MA.ui.seg([{ value: 'wa', label: MA.t('seo.wa') }, { value: 'li', label: MA.t('seo.li') }, { value: 'x', label: MA.t('seo.x') }, { value: 'fb', label: MA.t('seo.fb') }],
      S.net, v => { S.net = v; drawSocial(); }, { size: 'sm', label: MA.t('seo.linkPrev') });
    V.socialWell = MA.h('div.se-well.se-social');
    V.shownIn = MA.h('p.se-prevfoot.tiny.faint');
    const note = MA.h('div.callout.se-socialnote', MA.frag(MA.icon('info')), MA.h('span.grow', MA.t('seo.socialNote')),
      MA.ui.btn(MA.t('seo.toHead'), { size: 'sm', kind: 'ghost', icon: 'arrowRight', onclick: () => goSec('head') }));
    return section('share', MA.t('seo.s.share'), MA.t('seo.s.shareSub'),
      MA.h('div.se-imgrow', V.thumb, MA.h('div.se-imgside', field, btns, V.imgInfo)),
      MA.h('div.se-prevhead', MA.h('span.label', MA.t('seo.linkPrev')), MA.ui.badge(MA.t('seo.approx'), 'outline'), MA.h('span.grow'), net), V.socialWell, V.shownIn, note);
  }
  async function pickImage() {
    try {
      const r = await MA.media.picker({ title: MA.t('seo.img'), hint: MA.t('seo.imgHint'), value: String(get('seo/ogImage') || '') || undefined });
      const v = typeof r === 'string' ? r : (r?.ref || r?.value || r?.path || (r?.id ? 'media:' + r.id : ''));
      if (v) MA.content.set('seo/ogImage', v, { coalesce: false });
    } catch (e) { console.warn('[seo] media picker', e); }
  }
  function clearImage() {
    const before = get('seo/ogImage'); if (!before) return;
    MA.content.set('seo/ogImage', '', { coalesce: false });
    MA.toast(MA.t('seo.imgRemoved'), { undo: () => MA.content.set('seo/ogImage', before, { coalesce: false }) });
  }

  function secTheme() {
    const f = MA.form.one('seo/themeColor', { label: MA.t('seo.themeLabel'), kind: 'color' });
    V.swatches = MA.h('div.se-swatches', { role: 'group', 'aria-label': MA.t('seo.useBrand') });
    V.browser = MA.h('div.se-browser', { 'aria-hidden': 'true' });
    return section('theme', MA.t('seo.s.theme'), MA.t('seo.s.themeSub'),
      MA.h('div.se-theme', MA.h('div.se-theme-ctl', f, can() ? MA.h('div.se-brand', MA.h('span.small.muted', MA.t('seo.useBrand')), V.swatches) : null), V.browser));
  }

  function secHead() {
    const c = cfg();
    const site = cfgInput('site', { label: MA.t('seo.site'), hint: MA.t('seo.siteHint'), placeholder: 'https://miras.qa', validate: v => (validUrl(normSite(v)) ? '' : MA.t('seo.siteErr')) });
    const ar = cfgInput('arUrl', { label: MA.t('seo.arUrl'), hint: '', placeholder: arAuto(c), validate: v => (!v || validUrl(v) ? '' : MA.t('seo.urlErr')) });
    V.arField = ar;
    const langSeg = MA.ui.seg([{ value: 'en', label: MA.t('seo.lang.en') }, { value: 'ar', label: MA.t('seo.lang.ar') }], c.shareLang, v => setCfg({ shareLang: v }), { size: 'sm', label: MA.t('seo.shareLang') });
    const ldSw = MA.ui.switch(c.headLd, v => setCfg({ headLd: v }), esc(MA.t('seo.incLd')));
    const settings = MA.h('fieldset.se-settings', { disabled: !can() }, site, ar,
      MA.ui.field(esc(MA.t('seo.shareLang')), langSeg, { hint: esc(MA.t('seo.shareLangHint')) }),
      MA.h('div.field', MA.h('span.field-label', MA.t('seo.structured')), ldSw));
    V.sync = MA.h('div.se-sync');
    V.headCode = MA.h('pre.code.se-code', { tabindex: '0', role: 'region', 'aria-label': MA.t('seo.codeHead'), dir: 'ltr' });
    return section('head', MA.t('seo.s.head'), MA.t('seo.s.headSub'), settings,
      MA.h('div.callout.se-why', MA.frag(MA.icon('info')), MA.h('span', { html: MA.t('seo.why') })), V.sync,
      MA.h('div.se-codewrap', MA.h('div.se-codebar', MA.h('span.mono.tiny.faint', 'index.html · <head>'), MA.h('span.grow'), MA.ui.btn(MA.t('seo.copyHead'), { icon: 'copy', size: 'sm', kind: 'primary', onclick: copyHead })), V.headCode));
  }

  function secLd() {
    const typeSeg = MA.ui.seg([{ value: 'ProfessionalService', label: MA.t('seo.ldPro') }, { value: 'LocalBusiness', label: MA.t('seo.ldLocal') }], cfg().ldType, v => setCfg({ ldType: v }), { size: 'sm', label: MA.t('seo.ldType') });
    V.links = MA.h('ul.se-links');
    const inp = MA.h('input.input', { type: 'url', placeholder: 'https://www.instagram.com/…', dir: 'ltr', spellcheck: false, 'aria-label': MA.t('seo.sameAs') });
    const err = MA.h('p.err', { hidden: true });
    const add = () => {
      let u = inp.value.trim(); if (!u) return;
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
      const list = cfg().sameAs || [];
      const e = !validUrl(u) ? MA.t('seo.linkErr') : list.includes(u) ? MA.t('seo.linkDup') : '';
      err.textContent = e; err.hidden = !e; if (e) return;
      setCfg({ sameAs: [...list, u] }); inp.value = ''; inp.focus();
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    inp.addEventListener('input', () => { err.hidden = true; });
    V.ldNotes = MA.h('div.se-ldnotes');
    V.ldCode = MA.h('pre.code.se-code', { tabindex: '0', role: 'region', 'aria-label': MA.t('seo.codeLd'), dir: 'ltr' });
    return section('ld', MA.t('seo.s.ld'), MA.t('seo.s.ldSub'),
      MA.h('div.se-ldgrid',
        MA.ui.field(esc(MA.t('seo.ldType')), MA.h('div', typeSeg)),
        MA.h('div.field', MA.h('span.field-label', MA.t('seo.sameAs')), V.links, can() ? MA.h('div.se-addlink', inp, MA.ui.btn(MA.t('seo.addLink'), { icon: 'plus', size: 'sm', onclick: add })) : null, err, MA.h('p.hint', MA.t('seo.sameAsHint')))),
      V.ldNotes,
      MA.h('div.se-codewrap', MA.h('div.se-codebar', MA.h('span.mono.tiny.faint', 'application/ld+json'), MA.h('span.grow'),
        MA.h('a.btn.sm.ghost', { href: 'https://search.google.com/test/rich-results', target: '_blank', rel: 'noopener', html: MA.icon('external') + `<span>${esc(MA.t('seo.test'))}</span>` }),
        MA.ui.btn(MA.t('seo.copy'), { icon: 'copy', size: 'sm', onclick: copyLd })), V.ldCode));
  }

  function secFiles() {
    V.files = {};
    const box = kind => { const f = FILES[kind], code = MA.h('pre.code.se-code.se-file', { tabindex: '0', role: 'region', 'aria-label': MA.t('seo.codeFile', { file: f.name }), dir: 'ltr' }); V.files[kind] = code;
      return MA.h('div.se-filebox', MA.h('div.se-codebar', MA.h('span.mono.small', f.name), MA.h('span.grow'),
        MA.ui.btn(MA.t('seo.copy'), { icon: 'copy', size: 'sm', kind: 'ghost', onclick: () => MA.copy(f.make()) }),
        MA.ui.btn(MA.t('seo.download'), { icon: 'download', size: 'sm', onclick: () => dl(kind) })), code); };
    return section('files', MA.t('seo.s.files'), MA.t('seo.s.filesSub'), MA.h('div.se-files', box('robots'), box('sitemap')));
  }

  function auditCard() {
    V.ring = MA.h('div.se-ring'); V.scoreN = MA.h('div.se-score-n.num'); V.scoreL = MA.h('div.se-score-l'); V.scoreP = MA.h('div.se-score-p');
    V.checks = MA.h('ol.se-checks');
    return MA.h('section.card.se-audit', { id: 'se-audit' },
      MA.h('div.card-head', MA.h('h2.h3', MA.t('seo.audit')), MA.h('span.sub', MA.t('seo.auditSub'))),
      MA.h('div.card-body', MA.h('div.se-score', V.ring, MA.h('div', V.scoreN, V.scoreL, V.scoreP)), V.checks));
  }

  /* ================= drawing (cheap; runs once per frame after any change) ================= */
  function drawMeters() { V.meters.forEach(({ m, path }) => m.update(get(path))); }
  function drawSerp() { V.serpWell.dataset.variant = S.serp; V.serpWell.innerHTML = serpHTML(S.serp); }
  function drawSocial() {
    V.socialWell.dataset.net = S.net; V.socialWell.innerHTML = socialHTML(S.net);
    const heavy = S.net === 'wa' && IMG_NOW?.bytes != null && IMG_NOW.bytes > HEAVY;
    V.shownIn.textContent = MA.t('seo.shownIn', { lang: MA.t('seo.lang.' + (cfg().shareLang === 'ar' ? 'ar' : 'en')) }) + (heavy ? '  ' + MA.t('seo.waSkipped') : '');
  }
  function drawImg() {
    const raw = String(get('seo/ogImage') || '').trim(), i = IMG_NOW?.raw === raw ? IMG_NOW : null;
    V.thumb.className = 'se-thumb' + (raw && i?.src && i.state !== 'error' ? '' : ' none');
    V.thumb.innerHTML = raw && i?.src && i.state !== 'error' ? `<img src="${esc(i.src)}" alt="">` : MA.icon('image', 'lg');
    if (V.clearBtn) V.clearBtn.hidden = !raw;
    const msg = (tone, text) => MA.h('p', { class: 'se-msg ' + tone, html: MA.icon(tone === 'good' ? 'check' : tone === 'info' ? 'info' : 'warn', 'sm') + `<span>${esc(text)}</span>` });
    V.imgInfo.innerHTML = '';
    if (!raw) { V.imgInfo.append(msg('warn', MA.t('seo.noImg'))); return; }
    if (!i || i.state === 'loading') { V.imgInfo.append(msg('info', MA.t('seo.imgLoading'))); return; }
    if (i.state === 'unresolved') { V.imgInfo.append(msg('warn', MA.t('seo.imgUpload'))); return; }
    if (i.state === 'error') { V.imgInfo.append(msg('bad', MA.t('seo.imgErr', { path: raw }))); return; }
    const is = imgIssues(i), r = i.h ? i.w / i.h : 0;
    V.imgInfo.append(MA.h('div.se-chips',
      MA.ui.badge(`${MA.num(i.w)} × ${MA.num(i.h)} px`, i.w >= 1200 ? 'good' : i.w >= 600 ? 'warn' : 'bad'),
      MA.ui.badge(`${MA.num(r, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}:${MA.num(1)}`, Math.abs(r - 1.91) <= .12 ? 'good' : 'warn'),
      MA.ui.badge(kb(i.bytes), i.bytes == null ? '' : i.bytes > HEAVY ? 'warn' : 'good')));
    if (!is.length) V.imgInfo.append(msg('good', MA.t('seo.okSize')));
    is.forEach(x => V.imgInfo.append(msg(x.tone, MA.t(x.key))));
    if (/^media:/i.test(raw)) { const tp = uploadTarget(raw); V.imgInfo.append(msg('info', tp ? MA.t('seo.imgUploadTo', { path: tp }) : MA.t('seo.imgUpload'))); }
  }
  function contrastInk(hex) {
    let h = String(hex || '').replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h, 16); if (isNaN(n)) return '#0D0F2E';
    const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    const L = .2126 * lin(n >> 16 & 255) + .7152 * lin(n >> 8 & 255) + .0722 * lin(n & 255);
    return L > .4 ? '#0D0F2E' : '#FFFFFF';
  }
  function drawTheme() {
    const th = String(get('seo/themeColor') || '').trim(), ok = isHex(th), theme = get('theme') || {};
    V.swatches.innerHTML = '';
    for (const k of ['tide', 'deep', 'shore', 'flare', 'foam']) {
      const hex = String(theme[k] || '').toUpperCase(); if (!isHex(hex)) continue;
      V.swatches.append(MA.h('button', { type: 'button', style: `--c:${hex}`, 'aria-pressed': String(ok && th.toUpperCase() === hex), 'aria-label': `${MA.t('seo.c.' + k)} ${hex}`, 'data-tip': `${MA.t('seo.c.' + k)} · ${hex}`, disabled: !can(),
        onclick: () => MA.content.set('seo/themeColor', hex, { coalesce: false }) }));
    }
    const bg = ok ? th : 'var(--panel3)', ink = ok ? contrastInk(th) : 'var(--ink2)';
    V.browser.innerHTML = `<div class="se-browser-top" style="--tc:${esc(bg)};--tink:${ink}"><div class="se-browser-status"><span>${esc(MA.time(Date.now()))}</span><span class="se-dots"><i></i><i></i><i></i></span></div>
      <div class="se-browser-url">${MA.icon('lock', 'sm')}<span dir="ltr">${esc(host())}</span></div></div>
      <div class="se-browser-page"><i style="inline-size:62%"></i><i style="inline-size:88%"></i><i style="inline-size:74%"></i></div>`;
  }
  function drawHead() {
    V.headCode.textContent = headTags();
    // the Arabic address field shows the address the site answers on, and follows the site address
    const arIn = V.arField?.querySelector('input'), arHint = V.arField?.querySelector('.hint');
    if (arIn) arIn.placeholder = arAuto();
    if (arHint) { const html = esc(MA.t('seo.arUrlHint', { url: '\u0001' })).replace('\u0001', `<bdi dir="ltr">${esc(arAuto())}</bdi>`); if (arHint.innerHTML !== html) arHint.innerHTML = html; }
    const hd = headDiffs(), box = V.sync; box.innerHTML = '';
    const again = MA.ui.btn(MA.t('seo.recheck'), { icon: 'refresh', size: 'sm', kind: 'ghost', onclick: () => readLive(true) });
    const call = (tone, icon, text) => MA.h('div', { class: 'callout ' + tone }, MA.frag(MA.icon(icon)), MA.h('span.grow', text), again);
    if (!LIVE || LIVE.state === 'loading') { box.append(MA.h('p.small.faint.se-checking', { html: MA.icon('clock', 'sm') + `<span>${esc(MA.t('seo.sync.checking'))}</span>` })); return; }
    if (LIVE.state === 'error') { box.append(call('warn', 'warn', MA.t('seo.sync.err'))); return; }
    if (!hd.diffs.length) { box.append(call('good', 'check', MA.t('seo.sync.ok'))); return; }
    box.append(call(hd.missing ? 'bad' : 'warn', 'warn', hd.missing ? MA.t('seo.sync.missing') : hd.diffs.length === 1 ? MA.t('seo.sync.diffOne') : MA.t('seo.sync.diff', { n: hd.diffs.length })));
    const cell = v => (v == null || v === '' ? `<span class="se-absent">${esc(MA.t('seo.absent'))}</span>` : `<span class="v"${MA.siteText ? MA.siteText.attrs('auto', String(v)) : ' dir="auto"'} title="${esc(v)}">${esc(v)}</span>`);
    box.append(MA.h('div.table-wrap.se-diff', MA.h('table.table', { html:
      `<thead><tr><th>${esc(MA.t('seo.col.tag'))}</th><th>${esc(MA.t('seo.col.live'))}</th><th>${esc(MA.t('seo.col.want'))}</th></tr></thead><tbody>` +
      hd.diffs.map(x => `<tr><td class="shrink"><code class="mono tiny">${esc(x.tag)}</code></td><td>${cell(x.live)}</td><td>${cell(x.want)}</td></tr>`).join('') + '</tbody>' })));
  }
  function drawLd() {
    const c = cfg(), st = get('studio') || {};
    V.links.innerHTML = '';
    const list = c.sameAs || [];
    if (!list.length) V.links.append(MA.h('li.se-nolinks.small.faint', MA.t('seo.noLinks')));
    list.forEach(u => {
      let hostname = u, rest = ''; try { const x = new URL(u); hostname = x.host.replace(/^www\./, ''); rest = (x.pathname + x.search).replace(/\/$/, ''); } catch (e) {}
      V.links.append(MA.h('li', MA.frag(MA.icon('link', 'sm')), MA.h('span.u', { title: u }, MA.h('b', hostname), rest),
        can() ? MA.ui.iconBtn('close', { tip: MA.t('seo.linkRemove'), size: 'sm', onclick: () => { const before = cfg().sameAs; setCfg({ sameAs: before.filter(x => x !== u) }); MA.toast(MA.t('seo.linkRemoved'), { undo: () => setCfg({ sameAs: before }) }); } }) : null));
    });
    V.ldNotes.innerHTML = '';
    const note = (icon, text, action) => MA.h('p.se-note', MA.frag(MA.icon(icon, 'sm')), MA.h('span', text), action || null);
    V.ldNotes.append(note('info', MA.t('seo.fromContent')));
    if (!phone(st.whatsapp)) V.ldNotes.append(note('warn', MA.t('seo.noPhone'), MA.h('a.se-inline', { href: '#/settings' }, MA.t('seo.openSettings'))));
    if (!address()) V.ldNotes.append(note('warn', MA.t('seo.noAddr')));
    if (!(st.days || []).length) V.ldNotes.append(note('warn', MA.t('seo.noDays')));
    V.ldCode.textContent = ldText();
  }
  function drawFiles() { for (const k of Object.keys(FILES)) V.files[k].textContent = FILES[k].make(); }
  function drawAudit() {
    const items = audit(), s = scoreOf(items);
    V.ring.innerHTML = MA.chart.ring([
      { label: `${MA.num(s.pass)} ✓`, value: s.pass, color: 'var(--good)' }, { label: `${MA.num(s.warn)} !`, value: s.warn, color: 'var(--warn)' }, { label: `${MA.num(s.fail)} ×`, value: s.fail, color: 'var(--bad)' },
    ], { size: 84, thick: 8 });
    V.scoreN.innerHTML = `${MA.num(s.score)}<small>/${MA.num(100)}</small>`;
    V.scoreL.textContent = MA.t(s.score >= 90 ? 'seo.score.good' : s.score >= 60 ? 'seo.score.ok' : 'seo.score.bad');
    V.scoreP.textContent = MA.t('seo.passN', { count: s.total, p: MA.num(s.pass), t: MA.num(s.total) });
    V.root.dataset.score = s.score;
    V.checks.innerHTML = '';
    const ICON = { pass: 'check', warn: 'warn', fail: 'close', pending: 'clock' };
    items.forEach(it => V.checks.append(MA.h('li', MA.h('button.se-check', { type: 'button', dataset: { state: it.state, id: it.id }, onclick: () => goSec(it.sec, it.field, it.lang) },
      MA.frag(MA.icon(ICON[it.state])), MA.h('b', it.title), MA.h('span', it.detail)))));
  }
  /** Redraw everything that depends on the draft, once per burst of changes (microtask, so it also runs in background tabs). */
  function refresh() {
    if (!V || V.pending) return;
    V.pending = true;
    queueMicrotask(() => {
      if (!V) return;
      V.pending = false;
      for (const fn of [drawMeters, drawSerp, drawImg, drawSocial, drawTheme, drawHead, drawLd, drawFiles, drawAudit, drawMarks]) { try { fn(); } catch (e) { console.error('[seo]', fn.name, e); } }
    });
  }
  let imgSeq = 0;
  function checkImage() {
    const raw = String(get('seo/ogImage') || '').trim(), seq = ++imgSeq;
    if (!raw) { IMG_NOW = null; refresh(); return; }
    const src = previewSrc(raw);
    if (!src) { IMG_NOW = { raw, src: '', state: 'unresolved' }; refresh(); return; }
    if (IMG_NOW?.raw !== raw || IMG_NOW?.src !== src) IMG_NOW = { raw, src, state: 'loading' };
    refresh();
    inspectImage(src).then(info => { if (seq !== imgSeq) return; IMG_NOW = { raw, ...info }; refresh(); });
  }

  /* ================= the page ================= */
  function render(view, ctx) {
    IMG.clear(); IMG_NOW = null; // measure the image afresh on every visit (the file may have been replaced)
    const root = MA.h('div.m-seo');
    view.append(root);
    V = { root, pending: false };
    MA.cleanup(() => { if (V?.root === root) V = null; });
    const more = MA.ui.iconBtn('more', { tip: MA.t('seo.moreActions'), onclick: e => MA.ui.menu(e.currentTarget, [
      { label: MA.t('seo.copyLd'), icon: 'code', run: copyLd },
      '-',
      { label: MA.t('seo.dlRobots'), icon: 'download', run: () => dl('robots') },
      { label: MA.t('seo.dlSitemap'), icon: 'download', run: () => dl('sitemap') },
    ], { align: 'end' }) });
    root.append(MA.ui.pageHead({ title: esc(MA.t('seo.title.page')), sub: esc(MA.t('seo.sub')),
      actions: [more, MA.ui.btn(MA.t('seo.copyHead'), { icon: 'code', kind: 'primary', onclick: copyHead })] }));
    const main = MA.h('div.se-main'), side = MA.h('aside.se-side');
    root.append(MA.h('div.se-layout', main, side));
    main.append(secSearch(), secShare(), secTheme(), secHead(), secLd(), secFiles());
    side.append(auditCard());

    const onImg = MA.debounce(checkImage, 350);
    MA.onView('content:change', ({ path = '' } = {}) => {
      if (path === '' || path.startsWith('seo/ogImage') || path === 'seo') onImg();
      if (path === '' || /^(seo|studio|theme|text)(\/|$)/.test(path)) refresh();
    });
    MA.onView('db:' + CFG_KEY, refresh);
    MA.onView('prefs', refresh);

    checkImage();
    // uploads ('media:<id>') resolve once the Media module has read its files from IndexedDB
    MA.media?.ready?.then?.(() => { if (V?.root === root) { IMG.clear(); IMG_NOW = null; checkImage(); } });
    readLive(true);
    refresh();
    const s = ctx.query.get('s'); if (s) setTimeout(() => goSec(s), 180);
  }

  const PAGE = { en: 'SEO & sharing', ar: 'الظهور والمشاركة', fa: 'سئو و اشتراک‌گذاری' };
  MA.module({
    id: 'seo', group: 'site', order: 90, icon: 'globe', shortcut: 'g e',
    title: PAGE,
    keywords: 'seo google search meta open graph og image share whatsapp linkedin twitter x facebook robots sitemap json-ld schema بحث مشاركة',
    render,
    update(ctx) {
      if (!V?.root?.isConnected) return false;
      const s = ctx.query.get('s'); if (s) goSec(s);
      return true;
    },
    search(q) {
      const ql = q.trim().toLowerCase(); if (!ql) return [];
      const SECTIONS = [
        { id: 'search', en: 'Search title and description', ar: 'العنوان والوصف في نتائج البحث', fa: 'عنوان و توضیح در نتیجهٔ جست‌وجو', k: 'google title description meta serp snippet عنوان وصف توضیح' },
        { id: 'share', en: 'Sharing image and link previews', ar: 'صورة المشاركة ومعاينات الروابط', fa: 'تصویر اشتراک‌گذاری و پیش‌نمایش پیوندها', k: 'og open graph image whatsapp linkedin x twitter facebook واتساب صورة' },
        { id: 'theme', en: 'Theme colour', ar: 'لون السمة', fa: 'رنگ پوسته', k: 'theme-color browser bar colour color لون' },
        { id: 'head', en: 'Head tags for index.html', ar: 'وسوم الرأس لملف index.html', fa: 'تگ‌های head برای index.html', k: 'meta tags head hreflang canonical وسوم' },
        { id: 'ld', en: 'Structured data (JSON-LD)', ar: 'البيانات المنظّمة (JSON-LD)', fa: 'دادهٔ ساختاریافته (JSON-LD)', k: 'schema json-ld local business address hours sameAs profiles بيانات' },
        { id: 'files', en: 'robots.txt and sitemap.xml', ar: 'ملفا robots.txt و sitemap.xml', fa: 'robots.txt و sitemap.xml', k: 'robots sitemap crawl index خريطة' },
        { id: 'audit', en: 'SEO audit and score', ar: 'تدقيق الظهور والنتيجة', fa: 'بازبینی سئو و امتیاز', k: 'audit score check تدقيق' },
      ];
      return SECTIONS.filter(x => `${x.en} ${x.ar} ${x.k}`.toLowerCase().includes(ql))
        .map(x => ({ title: MA.L(x), sub: MA.L(PAGE), icon: 'globe', score: 45, run: () => MA.go('#/seo?s=' + x.id) }));
    },
  });

  MA.commands.add({ id: 'seo.head', title: { en: 'Copy head tags for index.html', ar: 'انسخ وسوم الرأس لملف index.html', fa: 'کپی تگ‌های head برای index.html' }, sub: PAGE, icon: 'code', keywords: 'meta og open graph twitter hreflang head seo', run: copyHead });
  MA.commands.add({ id: 'seo.ld', title: { en: 'Copy structured data (JSON-LD)', ar: 'انسخ البيانات المنظّمة (JSON-LD)', fa: 'کپی دادهٔ ساختاریافته (JSON-LD)' }, sub: PAGE, icon: 'code', keywords: 'schema json-ld local business seo', run: copyLd });
  MA.commands.add({ id: 'seo.robots', title: { en: 'Download robots.txt', ar: 'نزّل ملف robots.txt', fa: 'دانلود robots.txt' }, sub: PAGE, icon: 'download', keywords: 'robots crawl seo', run: () => dl('robots') });
  MA.commands.add({ id: 'seo.sitemap', title: { en: 'Download sitemap.xml', ar: 'نزّل ملف sitemap.xml', fa: 'دانلود sitemap.xml' }, sub: PAGE, icon: 'download', keywords: 'sitemap seo google', run: () => dl('sitemap') });

  /** The language alternates the head tags and the sitemap list: [{lang:'en'|'ar'|'x-default', href}]. */
  const alternates = () => { const p = pack(); return [{ lang: 'en', href: p.home }, ...(p.ar ? [{ lang: 'ar', href: p.ar }] : []), { lang: 'x-default', href: p.home }]; };
  /** The two root files, ready to write next to index.html (History's publish-to-folder): [{name, type, text}]. */
  const files = () => Object.values(FILES).map(f => ({ name: f.name, type: f.type, text: f.make() }));
  // the generators, for History's publish-to-folder and for tests
  MA.seo = { headTags, ld, ldText, robots, sitemap, files, alternates, urls: () => ({ home: home(), ar: arHome() }), audit: () => scoreOf(audit()), measure, cfg, setCfg };
})();
