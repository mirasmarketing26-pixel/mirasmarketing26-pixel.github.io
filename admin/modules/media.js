/* =====================================================================
   MIRAS admin — Media
   The library: the site's own image files (read-only, served from ../assets) plus uploads kept in this browser
   (Blob in IndexedDB store 'files', metadata list in MA.db 'media'). Content points at an upload as 'media:<id>';
   publishing copies each one to assets/uploads/<file> and rewrites the reference (MA.media.referenced / rewrite).
   Also the content image slots (media/<slot> as listed in the site's defaults, and seo/ogImage).
   MA.media is defined at load: SEO and Publish use it before this page is ever opened.
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA;
  const h = MA.h, esc = MA.esc;

  MA.i18n.add({
    en: {
      'media.sub': 'Every image the site shows, plus the ones you upload. Drop images anywhere on this page to add them.',
      'media.upload': 'Upload images', 'media.dropTitle': 'Drop images to upload', 'media.dropText': 'Images only. Files over {max} can be compressed before they’re saved.',
      'media.f.all': 'All', 'media.f.used': 'In use', 'media.f.unused': 'Not used', 'media.f.noalt': 'Missing alt', 'media.f.uploads': 'Uploads', 'media.f.site': 'Site files',
      'media.search': 'Search name, alt text or tag', 'media.sort': 'Sort', 'media.sort.default': 'Uploads first', 'media.sort.name': 'Name', 'media.sort.size': 'Largest first',
      'media.view.grid': 'Grid', 'media.view.list': 'List', 'media.view': 'View',
      'media.kind.upload': 'Upload', 'media.kind.site': 'Site file', 'media.kind.film': 'Frame sequence',
      'media.frames': { one: '1 frame', other: '{n} frames' }, 'media.film.top': 'Opening film', 'media.film.other': '{name} frames', 'media.u.code': 'In the page’s code',
      'media.usedN': { one: 'Used in one place', other: 'Used in {n} places' }, 'media.noAlt': 'No alt',
      'media.missing': 'File not found', 'media.missingText': 'The site points at {path}, but the server doesn’t have that file.',
      'media.emptyUploads': 'No uploads yet', 'media.emptyUploadsText': 'Drop images on this page, or upload them, to use them in the image slots or as the sharing image.',
      'media.emptyAlt': 'Every image is described', 'media.emptyAltText': 'Each image has alt text in both languages, or is marked decorative.',
      'media.emptyFilter': 'Nothing in this view', 'media.emptyFilterText': 'No image fits this filter right now.',
      'media.noMatch': 'No image matches “{q}”.', 'media.clear': 'Clear the search',
      'media.footSite': { one: '1 site file', other: '{n} site files' }, 'media.footUp': { zero: 'no uploads', one: '1 upload', other: '{n} uploads' }, 'media.footBytes': '{bytes} stored in this browser',
      'media.bytes': { one: '{n} byte', other: '{n} bytes' },
      'media.storeNote': 'Uploads stay in this browser until you publish. Publishing copies them into assets/uploads/.',
      'media.slots': 'Image slots', 'media.slotsSub': 'The pictures the site lets you swap. Changes show in the preview and go live when you publish.',
      'media.sharing': 'Sharing',
      'media.og': 'Sharing image', 'media.ogD': 'The picture in link previews on WhatsApp, LinkedIn and X.', 'media.notSet': 'Not set',
      'media.change': 'Change', 'media.choose': 'Choose', 'media.resetSlot': 'Reset to default', 'media.showPrev': 'Show in preview', 'media.openImage': 'Open in the library',
      'media.isDefault': 'Default', 'media.isCustom': 'Custom', 'media.unpub': 'Unpublished',
      'media.slotSet': '{slot} now shows {name}.', 'media.slotReset': '{slot} is back to the default image.',
      'media.slot.doneMira': 'Brief sent', 'media.slot.doneMira.d': 'Beside the thank-you note once a brief is sent.',
      'media.slot.footMira': 'Footer Mira', 'media.slot.footMira.d': 'Rises out of the MIRAS wordmark in the footer as the S sinks.',
      'media.slot.studioMira': 'Studio Mira', 'media.slot.studioMira.d': 'Waves beside the studio clock and address.',
      'media.slot.other.d': 'Where the site uses “{key}”.',
      'media.u.headMark': 'Header mark', 'media.u.headWord': 'Header wordmark', 'media.u.footWord': 'Footer wordmark', 'media.u.headWordAr': 'Arabic header wordmark', 'media.u.footWordAr': 'Arabic footer wordmark',
      'media.u.favicon': 'Browser tab icon',
      'media.fixed': 'Built into the site', 'media.fixedTip': 'Set in the site’s code, so it can’t be swapped here.',
      'media.usedIn': 'Used in', 'media.usedNone': 'Not used on the site yet.',
      'media.details': 'Details', 'media.type': 'Type', 'media.dims': 'Dimensions', 'media.size': 'File size', 'media.added': 'Added', 'media.path': 'Path', 'media.pubPath': 'Path once published',
      'media.alt': 'Alt text', 'media.altHint': 'Say what the picture shows, as you would to someone on the phone.',
      'media.altPhEn': 'e.g. Mira riding a calm wave at dusk', 'media.altPhAr': 'مثال: ميرا تركب موجة هادئة عند الغروب',
      'media.decorative': 'Decorative', 'media.decorativeHint': 'Screen readers skip it. Use this for mood pictures that add nothing to the words.',
      'media.altSite': 'The site takes this alt text from its copy, so editing it here changes the page once you publish.',
      'media.altDeco': 'Decorative on the site: screen readers skip it.', 'media.altLogo': 'Drawn as a mask; screen readers hear “MIRAS” from the link.',
      'media.altLocal': 'Saved with the file. The site’s image slots are decorative today, so screen readers skip them there.',
      'media.name': 'Name', 'media.tags': 'Tags', 'media.tagsPh': 'Add a tag, then Enter', 'media.removeTag': 'Remove tag {tag}',
      'media.useAs': 'Use as…', 'media.copyPath': 'Copy path', 'media.download': 'Download', 'media.downloadFrame': 'Download this frame',
      'media.replace': 'Replace file', 'media.replaceSite': 'Swap for an upload', 'media.compress': 'Compress',
      'media.copiedUp': 'Copied. Publishing puts the file at this path.',
      'media.replaced': 'Replaced {name}. Every place that used it now shows the new file.', 'media.replacedSite': { one: 'Swapped {name} for {next} in one place.', other: 'Swapped {name} for {next} in {n} places.' },
      'media.replaceNone': 'Only the site’s code uses this file, so there’s no slot to swap.',
      'media.deleted': 'Deleted {name}.', 'media.blockedTitle': 'In use, so it can’t be deleted', 'media.blocked': 'Choose another image in these places first:',
      'media.blockedToast': 'Can’t delete {name}: it’s used in {where}.',
      'media.heavy': 'Over {max}: slow on phones.', 'media.ogHeavy': 'WhatsApp may skip the preview for sharing images over {max}.',
      'media.compressed': 'Compressed {name}: {from} → {to}.', 'media.renamed': 'Renamed to {name}.',
      'media.matte': 'Background', 'media.matte.checker': 'Checker', 'media.matte.light': 'Light', 'media.matte.dark': 'Dark',
      'media.prev': 'Previous image', 'media.next': 'Next image', 'media.pos': '{i} of {n}',
      'media.frame': 'Frame {i} of {n}', 'media.play': 'Play', 'media.pause': 'Pause', 'media.scrub': 'Scrub frames',
      'media.filmNote': 'The site plays these frames as visitors scroll. Phones get a portrait set. Hover the tile in the library to scrub.',
      'media.uploaded': { one: '1 image uploaded.', other: '{n} images uploaded.' }, 'media.uploaded1': 'Uploaded {name}.', 'media.skipped': { one: 'Skipped 1 file that isn’t an image.', other: 'Skipped {n} files that aren’t images.' },
      'media.readFail': 'Couldn’t read {name}. Try another file.', 'media.saveFail': 'This browser couldn’t store the image. Free some space and try again.', 'media.cancelled': 'Upload cancelled.',
      'media.big.title': 'Compress before saving?',
      'media.big.text': 'Images over {max} slow the site on phones. Compressing keeps the long side under {px} px and saves a lighter file.',
      'media.big.format': 'Format', 'media.big.measuring': 'Measuring…', 'media.big.saves': '{pct} smaller', 'media.big.lean': 'Already lean: kept as is',
      'media.big.yes': 'Compress and upload', 'media.big.yesOne': 'Compress', 'media.big.no': 'Keep originals', 'media.big.noOne': 'Keep original',
      'media.big.alpha': 'JPEG has no transparency: clear areas turn white.',
      'media.k.upload': 'Upload images', 'media.k.view': 'Switch grid / list', 'media.k.search': 'Search images', 'media.k.next': 'Next image', 'media.k.prev': 'Previous image',
      'media.pick.title': 'Choose an image', 'media.pick.use': 'Use this image', 'media.pick.current': 'Current', 'media.pick.hint': 'Double-click to choose straight away.',
      'media.col.name': 'Name', 'media.col.type': 'Type', 'media.col.dims': 'Dimensions', 'media.col.size': 'File size', 'media.col.used': 'Used in', 'media.col.alt': 'Alt text',
      'media.alt.ok': 'Both languages', 'media.alt.deco': 'Decorative', 'media.alt.none': 'Missing', 'media.alt.noEn': 'English missing', 'media.alt.noAr': 'Arabic missing',
      'media.readonly': 'Your role can browse the library but not upload or change files.', 'media.untitled': 'Untitled image',
      'overview.act.media.upload': 'uploaded images', 'overview.act.media.delete': 'deleted an image', 'overview.act.media.replace': 'replaced an image',
    },
    ar: {
      'media.sub': 'كل صورة يعرضها الموقع، إضافةً إلى الصور التي ترفعها. أفلت الصور في أي مكان من هذه الصفحة لإضافتها.',
      'media.upload': 'رفع صور', 'media.dropTitle': 'أفلت الصور لرفعها', 'media.dropText': 'الصور فقط. يمكن ضغط الملفات الأكبر من {max} قبل حفظها.',
      'media.f.all': 'الكل', 'media.f.used': 'مستخدمة', 'media.f.unused': 'غير مستخدمة', 'media.f.noalt': 'بلا نص بديل', 'media.f.uploads': 'المرفوعة', 'media.f.site': 'ملفات الموقع',
      'media.search': 'ابحث بالاسم أو النص البديل أو الوسم', 'media.sort': 'الترتيب', 'media.sort.default': 'المرفوعة أولاً', 'media.sort.name': 'الاسم', 'media.sort.size': 'الأكبر حجماً أولاً',
      'media.view.grid': 'شبكة', 'media.view.list': 'قائمة', 'media.view': 'طريقة العرض',
      'media.kind.upload': 'مرفوعة', 'media.kind.site': 'ملف الموقع', 'media.kind.film': 'تسلسل إطارات',
      'media.frames': { one: 'إطار واحد', two: 'إطاران', few: '{n} إطارات', many: '{n} إطاراً', other: '{n} إطار' }, 'media.film.top': 'الفيلم الافتتاحي', 'media.film.other': 'إطارات {name}', 'media.u.code': 'في شيفرة الصفحة',
      'media.usedN': { one: 'مستخدمة في موضع واحد', two: 'مستخدمة في موضعين', few: 'مستخدمة في {n} مواضع', many: 'مستخدمة في {n} موضعاً', other: 'مستخدمة في {n} موضع' }, 'media.noAlt': 'بلا نص بديل',
      'media.missing': 'الملف غير موجود', 'media.missingText': 'يشير الموقع إلى {path}، لكن هذا الملف غير موجود على الخادم.',
      'media.emptyUploads': 'لا صور مرفوعة بعد', 'media.emptyUploadsText': 'أفلت الصور على هذه الصفحة أو ارفعها، لتستخدمها في خانات الصور أو صورةً للمشاركة.',
      'media.emptyAlt': 'كل الصور موصوفة', 'media.emptyAltText': 'لكل صورة نص بديل باللغتين، أو هي مُعلَّمة كزخرفية.',
      'media.emptyFilter': 'لا شيء هنا', 'media.emptyFilterText': 'لا توجد صورة تطابق هذا التصنيف الآن.',
      'media.noMatch': 'لا صورة تطابق «{q}».', 'media.clear': 'امسح البحث',
      'media.footSite': { zero: 'لا ملفات من الموقع', one: 'ملف واحد من الموقع', two: 'ملفان من الموقع', few: '{n} ملفات من الموقع', many: '{n} ملفاً من الموقع', other: '{n} ملف من الموقع' },
      'media.footUp': { zero: 'لا صور مرفوعة', one: 'صورة مرفوعة واحدة', two: 'صورتان مرفوعتان', few: '{n} صور مرفوعة', many: '{n} صورةً مرفوعة', other: '{n} صورة مرفوعة' }, 'media.footBytes': '{bytes} محفوظة في هذا المتصفح',
      'media.bytes': { zero: '{n} بايت', one: 'بايت واحد', two: 'بايتان', few: '{n} بايتات', many: '{n} بايتاً', other: '{n} بايت' },
      'media.storeNote': 'تبقى الصور المرفوعة في هذا المتصفح حتى تنشر، وعند النشر تُنسخ إلى ‎assets/uploads/‎.',
      'media.slots': 'خانات الصور', 'media.slotsSub': 'الصور التي يتيح لك الموقع تبديلها. تظهر التغييرات في المعاينة وتصل إلى الزوّار عند النشر.',
      'media.sharing': 'المشاركة',
      'media.og': 'صورة المشاركة', 'media.ogD': 'الصورة التي تظهر في معاينة الروابط على واتساب ولينكدإن وإكس.', 'media.notSet': 'غير محددة',
      'media.change': 'تغيير', 'media.choose': 'اختر', 'media.resetSlot': 'استرجاع الصورة الافتراضية', 'media.showPrev': 'أظهرها في المعاينة', 'media.openImage': 'افتحها في المكتبة',
      'media.isDefault': 'افتراضية', 'media.isCustom': 'مخصّصة', 'media.unpub': 'غير منشورة',
      'media.slotSet': 'صارت «{slot}» تعرض {name}.', 'media.slotReset': 'عادت «{slot}» إلى الصورة الافتراضية.',
      'media.slot.doneMira': 'بعد إرسال الطلب', 'media.slot.doneMira.d': 'بجانب رسالة الشكر بعد إرسال الطلب.',
      'media.slot.footMira': 'ميرا في التذييل', 'media.slot.footMira.d': 'تصعد من شعار ميراس الكتابي في التذييل بينما يغرق حرف S.',
      'media.slot.studioMira': 'ميرا في الاستوديو', 'media.slot.studioMira.d': 'تلوّح بجانب ساعة الاستوديو والعنوان.',
      'media.slot.other.d': 'حيث يستخدم الموقع «{key}».',
      'media.u.headMark': 'شعار الترويسة', 'media.u.headWord': 'الشعار الكتابي في الترويسة', 'media.u.footWord': 'الشعار الكتابي في التذييل', 'media.u.headWordAr': 'الشعار الكتابي العربي في الترويسة', 'media.u.footWordAr': 'الشعار الكتابي العربي في التذييل',
      'media.u.favicon': 'أيقونة تبويب المتصفح',
      'media.fixed': 'مدمجة في الموقع', 'media.fixedTip': 'محددة في شيفرة الموقع، فلا يمكن تبديلها من هنا.',
      'media.usedIn': 'مستخدمة في', 'media.usedNone': 'غير مستخدمة في الموقع بعد.',
      'media.details': 'التفاصيل', 'media.type': 'النوع', 'media.dims': 'الأبعاد', 'media.size': 'حجم الملف', 'media.added': 'أُضيفت', 'media.path': 'المسار', 'media.pubPath': 'المسار بعد النشر',
      'media.alt': 'النص البديل', 'media.altHint': 'صِف ما تُظهره الصورة كما لو كنت تصفها لشخص على الهاتف.',
      'media.altPhEn': 'e.g. Mira riding a calm wave at dusk', 'media.altPhAr': 'مثال: ميرا تركب موجة هادئة عند الغروب',
      'media.decorative': 'زخرفية', 'media.decorativeHint': 'تتخطاها قارئات الشاشة. استخدمها لصور الأجواء التي لا تضيف شيئاً إلى النص.',
      'media.altSite': 'يأخذ الموقع هذا النص البديل من نصوصه، لذا فإن تعديله هنا يغيّر الصفحة بعد النشر.',
      'media.altDeco': 'زخرفية في الموقع: تتخطاها قارئات الشاشة.', 'media.altLogo': 'مرسومة كقناع، وتسمع قارئات الشاشة «MIRAS» من الرابط.',
      'media.altLocal': 'يُحفظ مع الملف. خانات الصور في الموقع زخرفية حالياً، فتتخطاها قارئات الشاشة هناك.',
      'media.name': 'الاسم', 'media.tags': 'الوسوم', 'media.tagsPh': 'أضف وسماً ثم اضغط Enter', 'media.removeTag': 'إزالة الوسم {tag}',
      'media.useAs': 'استخدمها في…', 'media.copyPath': 'نسخ المسار', 'media.download': 'تنزيل', 'media.downloadFrame': 'تنزيل هذا الإطار',
      'media.replace': 'استبدال الملف', 'media.replaceSite': 'استبدالها بصورة مرفوعة', 'media.compress': 'ضغط',
      'media.copiedUp': 'نُسخ. عند النشر يوضع الملف في هذا المسار.',
      'media.replaced': 'استُبدلت {name}. كل موضع كان يستخدمها يعرض الملف الجديد الآن.', 'media.replacedSite': { one: 'استُبدلت {name} بـ{next} في موضع واحد.', two: 'استُبدلت {name} بـ{next} في موضعين.', few: 'استُبدلت {name} بـ{next} في {n} مواضع.', many: 'استُبدلت {name} بـ{next} في {n} موضعاً.', other: 'استُبدلت {name} بـ{next} في {n} موضع.' },
      'media.replaceNone': 'لا يستخدم هذا الملفَ إلا شيفرةُ الموقع، فلا توجد خانة لتبديلها.',
      'media.deleted': 'حُذفت {name}.', 'media.blockedTitle': 'مستخدمة، فلا يمكن حذفها', 'media.blocked': 'اختر صورة أخرى في هذه المواضع أولاً:',
      'media.blockedToast': 'لا يمكن حذف {name}: إنها مستخدمة في {where}.',
      'media.heavy': 'أكبر من {max}: بطيئة على الجوال.', 'media.ogHeavy': 'قد لا يعرض واتساب معاينة صور المشاركة الأكبر من {max}.',
      'media.compressed': 'ضُغطت {name}: من {from} إلى {to}.', 'media.renamed': 'صار اسمها {name}.',
      'media.matte': 'الخلفية', 'media.matte.checker': 'مربعات', 'media.matte.light': 'فاتحة', 'media.matte.dark': 'داكنة',
      'media.prev': 'الصورة السابقة', 'media.next': 'الصورة التالية', 'media.pos': '{i} من {n}',
      'media.frame': 'الإطار {i} من {n}', 'media.play': 'تشغيل', 'media.pause': 'إيقاف مؤقت', 'media.scrub': 'تصفّح الإطارات',
      'media.filmNote': 'يعرض الموقع هذه الإطارات أثناء التمرير، وتحصل الجوالات على مجموعة عمودية. مرّر المؤشر فوق البطاقة في المكتبة لتتصفّحها.',
      'media.uploaded': { one: 'رُفعت صورة واحدة.', two: 'رُفعت صورتان.', few: 'رُفعت {n} صور.', many: 'رُفعت {n} صورةً.', other: 'رُفعت {n} صورة.' }, 'media.uploaded1': 'رُفعت {name}.', 'media.skipped': { one: 'لم يُرفع ملف واحد لأنه ليس صورة.', two: 'لم يُرفع ملفان لأنهما ليسا صورتين.', few: 'لم تُرفع {n} ملفات لأنها ليست صوراً.', many: 'لم يُرفع {n} ملفاً لأنها ليست صوراً.', other: 'لم يُرفع {n} ملف لأنها ليست صوراً.' },
      'media.readFail': 'تعذّرت قراءة {name}. جرّب ملفاً آخر.', 'media.saveFail': 'تعذّر على المتصفح حفظ الصورة. وفّر بعض المساحة وحاول مجدداً.', 'media.cancelled': 'أُلغي الرفع.',
      'media.big.title': 'ضغط الصور قبل حفظها؟',
      'media.big.text': 'الصور الأكبر من {max} تُبطئ الموقع على الجوال. يُبقي الضغطُ الضلعَ الأطول دون {px} بكسل ويحفظ ملفاً أخف.',
      'media.big.format': 'الصيغة', 'media.big.measuring': 'جارٍ القياس…', 'media.big.saves': 'أصغر بنسبة {pct}', 'media.big.lean': 'خفيفة أصلاً: تبقى كما هي',
      'media.big.yes': 'اضغطها وارفعها', 'media.big.yesOne': 'ضغط', 'media.big.no': 'أبقِ الأصلية', 'media.big.noOne': 'أبقِ الأصلية',
      'media.big.alpha': 'صيغة JPEG لا تدعم الشفافية: تصبح المناطق الشفافة بيضاء.',
      'media.k.upload': 'رفع صور', 'media.k.view': 'التبديل بين الشبكة والقائمة', 'media.k.search': 'ابحث في الصور', 'media.k.next': 'الصورة التالية', 'media.k.prev': 'الصورة السابقة',
      'media.pick.title': 'اختر صورة', 'media.pick.use': 'استخدم هذه الصورة', 'media.pick.current': 'الحالية', 'media.pick.hint': 'انقر مرتين للاختيار مباشرة.',
      'media.col.name': 'الاسم', 'media.col.type': 'النوع', 'media.col.dims': 'الأبعاد', 'media.col.size': 'حجم الملف', 'media.col.used': 'مستخدمة في', 'media.col.alt': 'النص البديل',
      'media.alt.ok': 'باللغتين', 'media.alt.deco': 'زخرفية', 'media.alt.none': 'غير موجود', 'media.alt.noEn': 'الإنجليزية ناقصة', 'media.alt.noAr': 'العربية ناقصة',
      'media.readonly': 'يستطيع دورك تصفّح المكتبة، لكن لا يمكنه رفع الملفات أو تغييرها.', 'media.untitled': 'صورة بلا اسم',
      'overview.act.media.upload': 'رفع صوراً', 'overview.act.media.delete': 'حذف صورة', 'overview.act.media.replace': 'استبدل صورة',
    },
    fa: {
      'media.sub': 'همهٔ تصویرهایی که سایت نشان می‌دهد، به‌علاوهٔ تصویرهایی که بارگذاری می‌کنید. برای افزودن، تصویرها را هر جای این صفحه رها کنید.',
      'media.upload': 'بارگذاری تصویر', 'media.dropTitle': 'تصویرها را رها کنید تا بارگذاری شوند', 'media.dropText': 'فقط تصویر. فایل‌های بزرگ‌تر از {max} را می‌توان پیش از ذخیره فشرده کرد.',
      'media.f.all': 'همه', 'media.f.used': 'در حال استفاده', 'media.f.unused': 'بدون استفاده', 'media.f.noalt': 'بدون متن جایگزین', 'media.f.uploads': 'بارگذاری‌شده‌ها', 'media.f.site': 'فایل‌های سایت',
      'media.search': 'جست‌وجو در نام، متن جایگزین یا برچسب', 'media.sort': 'مرتب‌سازی', 'media.sort.default': 'اول بارگذاری‌شده‌ها', 'media.sort.name': 'نام', 'media.sort.size': 'اول بزرگ‌ترها',
      'media.view.grid': 'شبکه', 'media.view.list': 'فهرست', 'media.view': 'نما',
      'media.kind.upload': 'بارگذاری‌شده', 'media.kind.site': 'فایل سایت', 'media.kind.film': 'دنبالهٔ فریم',
      'media.frames': { other: '{n} فریم' }, 'media.film.top': 'فیلم آغازین', 'media.film.other': 'فریم‌های {name}', 'media.u.code': 'در کد صفحه',
      'media.usedN': { one: 'در یک جا استفاده شده', other: 'در {n} جا استفاده شده' }, 'media.noAlt': 'بدون متن جایگزین',
      'media.missing': 'فایل پیدا نشد', 'media.missingText': 'سایت به {path} اشاره می‌کند، اما این فایل روی سرور نیست.',
      'media.emptyUploads': 'هنوز چیزی بارگذاری نشده', 'media.emptyUploadsText': 'تصویرها را روی این صفحه رها یا بارگذاری کنید تا در جایگاه‌های تصویر یا به‌عنوان تصویر اشتراک‌گذاری از آن‌ها استفاده کنید.',
      'media.emptyAlt': 'همهٔ تصویرها توضیح دارند', 'media.emptyAltText': 'هر تصویر به هر دو زبان متن جایگزین دارد یا تزئینی علامت خورده است.',
      'media.emptyFilter': 'اینجا چیزی نیست', 'media.emptyFilterText': 'فعلاً هیچ تصویری با این فیلتر جور نیست.',
      'media.noMatch': 'هیچ تصویری با «{q}» پیدا نشد.', 'media.clear': 'پاک کردن جست‌وجو',
      'media.footSite': { other: '{n} فایل سایت' }, 'media.footUp': { zero: 'بدون بارگذاری', other: '{n} بارگذاری' }, 'media.footBytes': '{bytes} در این مرورگر',
      'media.bytes': { other: '{n} بایت' },
      'media.storeNote': 'بارگذاری‌ها تا زمان انتشار در همین مرورگر می‌مانند؛ با انتشار در ‎assets/uploads/‎ کپی می‌شوند.',
      'media.slots': 'جایگاه‌های تصویر', 'media.slotsSub': 'تصویرهایی که سایت اجازهٔ عوض کردنشان را می‌دهد. تغییرها در پیش‌نمایش دیده می‌شوند و با انتشار روی سایت می‌روند.',
      'media.sharing': 'اشتراک‌گذاری',
      'media.og': 'تصویر اشتراک‌گذاری', 'media.ogD': 'تصویری که در پیش‌نمایش پیوند در واتس‌اپ، لینکدین و ایکس دیده می‌شود.', 'media.notSet': 'تعیین نشده',
      'media.change': 'تغییر', 'media.choose': 'انتخاب', 'media.resetSlot': 'بازگشت به تصویر پیش‌فرض', 'media.showPrev': 'نمایش در پیش‌نمایش', 'media.openImage': 'باز کردن در کتابخانه',
      'media.isDefault': 'پیش‌فرض', 'media.isCustom': 'سفارشی', 'media.unpub': 'منتشرنشده',
      'media.slotSet': '«{slot}» حالا {name} را نشان می‌دهد.', 'media.slotReset': '«{slot}» به تصویر پیش‌فرض برگشت.',
      'media.slot.doneMira': 'پس از ارسال درخواست', 'media.slot.doneMira.d': 'کنار پیام تشکر، بعد از ارسال درخواست.',
      'media.slot.footMira': 'میرا در پانویس', 'media.slot.footMira.d': 'از دل نوشتار MIRAS در پانویس بالا می‌آید، هم‌زمان که S فرو می‌رود.',
      'media.slot.studioMira': 'میرا در استودیو', 'media.slot.studioMira.d': 'کنار ساعت و نشانی استودیو دست تکان می‌دهد.',
      'media.slot.other.d': 'جایی که سایت از «{key}» استفاده می‌کند.',
      'media.u.headMark': 'نشان سرصفحه', 'media.u.headWord': 'نوشتار نشان در سرصفحه', 'media.u.footWord': 'نوشتار نشان در پانویس', 'media.u.headWordAr': 'نوشتار عربی نشان در سرصفحه', 'media.u.footWordAr': 'نوشتار عربی نشان در پانویس',
      'media.u.favicon': 'آیکون زبانهٔ مرورگر',
      'media.fixed': 'در کد سایت', 'media.fixedTip': 'در کد سایت تعیین شده و از اینجا عوض نمی‌شود.',
      'media.usedIn': 'استفاده‌شده در', 'media.usedNone': 'هنوز در سایت استفاده نشده.',
      'media.details': 'جزئیات', 'media.type': 'نوع', 'media.dims': 'ابعاد', 'media.size': 'حجم فایل', 'media.added': 'افزوده‌شده', 'media.path': 'مسیر', 'media.pubPath': 'مسیر پس از انتشار',
      'media.alt': 'متن جایگزین', 'media.altHint': 'بگویید تصویر چه نشان می‌دهد، همان‌طور که پشت تلفن برای کسی تعریف می‌کنید.',
      'media.altPhEn': 'e.g. Mira riding a calm wave at dusk', 'media.altPhAr': 'مثال: ميرا تركب موجة هادئة عند الغروب',
      'media.decorative': 'تزئینی', 'media.decorativeHint': 'صفحه‌خوان‌ها از آن می‌گذرند. برای تصویرهای فضاسازی که چیزی به متن اضافه نمی‌کنند.',
      'media.altSite': 'سایت این متن جایگزین را از متن‌های خودش می‌خواند؛ پس ویرایش آن در اینجا پس از انتشار صفحه را تغییر می‌دهد.',
      'media.altDeco': 'در سایت تزئینی است و صفحه‌خوان‌ها از آن می‌گذرند.', 'media.altLogo': 'به‌صورت ماسک کشیده می‌شود؛ صفحه‌خوان‌ها «MIRAS» را از پیوند می‌شنوند.',
      'media.altLocal': 'همراه فایل ذخیره می‌شود. جایگاه‌های تصویر سایت فعلاً تزئینی‌اند و صفحه‌خوان‌ها از آن‌ها می‌گذرند.',
      'media.name': 'نام', 'media.tags': 'برچسب‌ها', 'media.tagsPh': 'برچسب بنویسید و Enter بزنید', 'media.removeTag': 'حذف برچسب {tag}',
      'media.useAs': 'استفاده به‌عنوان…', 'media.copyPath': 'کپی مسیر', 'media.download': 'دانلود', 'media.downloadFrame': 'دانلود این فریم',
      'media.replace': 'جایگزینی فایل', 'media.replaceSite': 'جایگزینی با فایل بارگذاری‌شده', 'media.compress': 'فشرده‌سازی',
      'media.copiedUp': 'کپی شد. با انتشار، فایل در همین مسیر قرار می‌گیرد.',
      'media.replaced': '{name} جایگزین شد. هر جایی که از آن استفاده می‌کرد، حالا فایل تازه را نشان می‌دهد.', 'media.replacedSite': { one: '{name} در یک جا با {next} عوض شد.', other: '{name} در {n} جا با {next} عوض شد.' },
      'media.replaceNone': 'فقط کد سایت از این فایل استفاده می‌کند، پس جایگاهی برای عوض کردن نیست.',
      'media.deleted': '{name} حذف شد.', 'media.blockedTitle': 'در حال استفاده است و حذف نمی‌شود', 'media.blocked': 'اول در این جاها تصویر دیگری انتخاب کنید:',
      'media.blockedToast': '{name} حذف نمی‌شود: در {where} استفاده شده.',
      'media.heavy': 'بیش از {max}: روی موبایل کند است.', 'media.ogHeavy': 'واتس‌اپ ممکن است پیش‌نمایش تصویرهای اشتراک‌گذاری بزرگ‌تر از {max} را نشان ندهد.',
      'media.compressed': '{name} فشرده شد: از {from} به {to}.', 'media.renamed': 'نامش شد {name}.',
      'media.matte': 'پس‌زمینه', 'media.matte.checker': 'شطرنجی', 'media.matte.light': 'روشن', 'media.matte.dark': 'تیره',
      'media.prev': 'تصویر قبلی', 'media.next': 'تصویر بعدی', 'media.pos': '{i} از {n}',
      'media.frame': 'فریم {i} از {n}', 'media.play': 'پخش', 'media.pause': 'توقف', 'media.scrub': 'مرور فریم‌ها',
      'media.filmNote': 'سایت این فریم‌ها را هنگام اسکرول نشان می‌دهد و موبایل‌ها نسخهٔ عمودی می‌گیرند. برای مرور، نشانگر را روی کاشی آن در کتابخانه ببرید.',
      'media.uploaded': { one: 'یک تصویر بارگذاری شد.', other: '{n} تصویر بارگذاری شد.' }, 'media.uploaded1': '{name} بارگذاری شد.', 'media.skipped': { one: 'یک فایل که تصویر نبود کنار گذاشته شد.', other: '{n} فایل که تصویر نبودند کنار گذاشته شد.' },
      'media.readFail': '{name} خوانده نشد. فایل دیگری را امتحان کنید.', 'media.saveFail': 'مرورگر نتوانست تصویر را ذخیره کند. کمی فضا آزاد کنید و دوباره تلاش کنید.', 'media.cancelled': 'بارگذاری لغو شد.',
      'media.big.title': 'پیش از ذخیره فشرده شود؟',
      'media.big.text': 'تصویرهای بزرگ‌تر از {max} سایت را روی موبایل کند می‌کنند. فشرده‌سازی ضلع بلندتر را زیر {px} پیکسل نگه می‌دارد و فایل سبک‌تری ذخیره می‌کند.',
      'media.big.format': 'قالب', 'media.big.measuring': 'در حال اندازه‌گیری…', 'media.big.saves': '{pct} کوچک‌تر', 'media.big.lean': 'از قبل سبک است: همان‌طور می‌ماند',
      'media.big.yes': 'فشرده‌سازی و بارگذاری', 'media.big.yesOne': 'فشرده‌سازی', 'media.big.no': 'نگه داشتن نسخهٔ اصلی', 'media.big.noOne': 'نگه داشتن نسخهٔ اصلی',
      'media.big.alpha': 'JPEG شفافیت ندارد: بخش‌های شفاف سفید می‌شوند.',
      'media.k.upload': 'بارگذاری تصویر', 'media.k.view': 'جابه‌جایی شبکه و فهرست', 'media.k.search': 'جست‌وجوی تصویرها', 'media.k.next': 'تصویر بعدی', 'media.k.prev': 'تصویر قبلی',
      'media.pick.title': 'یک تصویر انتخاب کنید', 'media.pick.use': 'استفاده از این تصویر', 'media.pick.current': 'فعلی', 'media.pick.hint': 'برای انتخاب فوری دوبار کلیک کنید.',
      'media.col.name': 'نام', 'media.col.type': 'نوع', 'media.col.dims': 'ابعاد', 'media.col.size': 'حجم فایل', 'media.col.used': 'استفاده‌شده در', 'media.col.alt': 'متن جایگزین',
      'media.alt.ok': 'هر دو زبان', 'media.alt.deco': 'تزئینی', 'media.alt.none': 'ندارد', 'media.alt.noEn': 'انگلیسی ندارد', 'media.alt.noAr': 'عربی ندارد',
      'media.readonly': 'نقش شما می‌تواند کتابخانه را ببیند، اما نمی‌تواند فایلی بارگذاری یا تغییر دهد.', 'media.untitled': 'تصویر بی‌نام',
      'overview.act.media.upload': 'تصویر بارگذاری کرد', 'overview.act.media.delete': 'تصویری را حذف کرد', 'overview.act.media.replace': 'تصویری را جایگزین کرد',
    },
  });
  // missing uploads, versions that keep a file, preview, SVG safety, crop and focal point
  MA.i18n.add({
    en: {
      'media.gone': 'Image missing',
      'media.goneHead': 'Some slots point at images that aren’t in this browser',
      'media.goneText': 'They were deleted here, or came from another browser, so the site shows the default picture there. Choose another image or reset to the default before you publish.',
      'media.unresolved': 'Image missing in {slot}: choose another image or reset it to the default.',
      'media.u.version': 'Saved version · {when}', 'media.u.vPublish': 'Published version · {when}', 'media.u.live': 'What’s published now', 'media.u.schedule': 'Scheduled change · {when}',
      'media.heldTitle': 'Kept for saved versions', 'media.held': 'Restoring these needs this file, so it can’t be deleted while they use it:',
      'media.heldN': { one: 'Kept for 1 saved version', other: 'Kept for {n} saved versions' }, 'media.heldMore': { one: 'and 1 more', other: 'and {n} more' },
      'media.openPage': 'Open {page}',
      'media.pvHidden': '{slot} isn’t on the site right now: the {section} section is hidden.',
      'media.pvLater': '{slot} isn’t on screen yet, so the preview opens where it appears.',
      'media.secOff': 'Not on the site: {section} is hidden',
      'media.svgClean': 'Removed scripts and outside links from {name}, so it’s safe to publish.',
      'media.svgBad': 'Couldn’t read {name} as an SVG. Try another file.',
      'media.crop': 'Crop', 'media.crop.title': 'Crop {name}', 'media.crop.shape': 'Shape',
      'media.crop.r.1:1': 'Square', 'media.crop.r.4:5': 'Portrait', 'media.crop.r.16:9': 'Wide', 'media.crop.r.1.91:1': 'Link preview',
      'media.crop.size': 'Crop size', 'media.crop.area': 'Crop area', 'media.crop.areaHint': 'Drag it, or move it with the arrow keys (⇧ for bigger steps).',
      'media.crop.out': 'Saves a new image, {dims} px. The original stays as it is.',
      'media.crop.save': 'Save as new image', 'media.crop.saveUse': 'Save and use as {slot}',
      'media.crop.saved': 'Saved a {ratio} crop of {name}.', 'media.crop.fail': 'Couldn’t crop this image. Try another file.',
      'media.focal': 'Focal point', 'media.focalHint': 'Click the picture to mark what has to stay in frame. Crops start around it.',
      'media.focalAt': 'Focal point: {x} across, {y} down. The arrow keys move it.', 'media.focalReset': 'Centre the focal point',
      'media.ogRatio': 'Not 1.91:1, so link previews will crop it.', 'media.ogCrop': 'Crop to 1.91:1',
    },
    ar: {
      'media.gone': 'الصورة مفقودة',
      'media.goneHead': 'بعض الخانات تشير إلى صور غير موجودة في هذا المتصفح',
      'media.goneText': 'حُذفت من هنا أو جاءت من متصفح آخر، لذلك يعرض الموقع مكانها الصورة الافتراضية. اختر صورة أخرى أو استرجع الافتراضية قبل النشر.',
      'media.unresolved': 'صورة مفقودة في «{slot}»: اختر صورة أخرى أو استرجع الصورة الافتراضية.',
      'media.u.version': 'نسخة محفوظة · {when}', 'media.u.vPublish': 'نسخة منشورة · {when}', 'media.u.live': 'المنشور حالياً', 'media.u.schedule': 'تغيير مجدول · {when}',
      'media.heldTitle': 'محفوظة لأجل نسخ سابقة', 'media.held': 'استرجاع هذه النسخ يحتاج إلى هذا الملف، فلا يمكن حذفه ما دامت تستخدمه:',
      'media.heldN': { one: 'محفوظة لأجل نسخة سابقة واحدة', two: 'محفوظة لأجل نسختين سابقتين', few: 'محفوظة لأجل {n} نسخ سابقة', many: 'محفوظة لأجل {n} نسخةً سابقة', other: 'محفوظة لأجل {n} نسخة سابقة' },
      'media.heldMore': { one: 'وواحدة أخرى', two: 'واثنتان أخريان', few: 'و{n} أخرى', many: 'و{n} أخرى', other: 'و{n} أخرى' },
      'media.openPage': 'افتح {page}',
      'media.pvHidden': '«{slot}» لا تظهر في الموقع الآن: قسم «{section}» مخفي.',
      'media.pvLater': '«{slot}» لا تظهر على الشاشة بعد، لذلك تُفتح المعاينة حيث تظهر.',
      'media.secOff': 'غير ظاهرة في الموقع: قسم «{section}» مخفي',
      'media.svgClean': 'أُزيلت النصوص البرمجية والروابط الخارجية من {name}، فصار نشرها آمناً.',
      'media.svgBad': 'تعذّرت قراءة {name} كملف SVG. جرّب ملفاً آخر.',
      'media.crop': 'قصّ', 'media.crop.title': 'قصّ {name}', 'media.crop.shape': 'الشكل',
      'media.crop.r.1:1': 'مربع', 'media.crop.r.4:5': 'عمودي', 'media.crop.r.16:9': 'عريض', 'media.crop.r.1.91:1': 'معاينة الرابط',
      'media.crop.size': 'حجم القصّ', 'media.crop.area': 'منطقة القصّ', 'media.crop.areaHint': 'اسحبها، أو حرّكها بمفاتيح الأسهم (مع ⇧ لخطوات أكبر).',
      'media.crop.out': 'تُحفظ صورة جديدة بأبعاد {dims} بكسل، وتبقى الأصلية كما هي.',
      'media.crop.save': 'احفظها صورة جديدة', 'media.crop.saveUse': 'احفظها واستخدمها في «{slot}»',
      'media.crop.saved': 'حُفظ قصّ بنسبة {ratio} من {name}.', 'media.crop.fail': 'تعذّر قصّ هذه الصورة. جرّب ملفاً آخر.',
      'media.focal': 'نقطة التركيز', 'media.focalHint': 'انقر على الصورة لتحدد ما يجب أن يبقى ظاهراً، فيبدأ القصّ حوله.',
      'media.focalAt': 'نقطة التركيز: {x} أفقياً و{y} عمودياً. تحرّكها مفاتيح الأسهم.', 'media.focalReset': 'أعد نقطة التركيز إلى المنتصف',
      'media.ogRatio': 'نسبتها ليست 1.91:1، لذلك ستقصّها معاينات الروابط.', 'media.ogCrop': 'قصّها بنسبة 1.91:1',
    },
    fa: {
      'media.gone': 'تصویر پیدا نمی‌شود',
      'media.goneHead': 'چند جایگاه به تصویرهایی اشاره می‌کنند که در این مرورگر نیستند',
      'media.goneText': 'یا اینجا حذف شده‌اند یا از مرورگر دیگری آمده‌اند، پس سایت به‌جایشان تصویر پیش‌فرض را نشان می‌دهد. پیش از انتشار تصویر دیگری انتخاب کنید یا به پیش‌فرض برگردانید.',
      'media.unresolved': 'تصویرِ «{slot}» پیدا نمی‌شود: تصویر دیگری انتخاب کنید یا به پیش‌فرض برگردانید.',
      'media.u.version': 'نسخهٔ ذخیره‌شده · {when}', 'media.u.vPublish': 'نسخهٔ منتشرشده · {when}', 'media.u.live': 'آنچه اکنون منتشر شده', 'media.u.schedule': 'تغییر زمان‌بندی‌شده · {when}',
      'media.heldTitle': 'برای نسخه‌های ذخیره‌شده نگه داشته شده', 'media.held': 'بازگرداندن این نسخه‌ها به این فایل نیاز دارد، پس تا وقتی از آن استفاده می‌کنند حذف نمی‌شود:',
      'media.heldN': { other: 'برای {n} نسخهٔ ذخیره‌شده نگه داشته شده' }, 'media.heldMore': { other: 'و {n} مورد دیگر' },
      'media.openPage': 'باز کردن {page}',
      'media.pvHidden': '«{slot}» فعلاً در سایت نیست: بخش «{section}» پنهان است.',
      'media.pvLater': '«{slot}» هنوز روی صفحه نیست، پس پیش‌نمایش جایی باز می‌شود که ظاهر می‌شود.',
      'media.secOff': 'در سایت نیست: «{section}» پنهان است',
      'media.svgClean': 'اسکریپت‌ها و پیوندهای بیرونی از {name} حذف شد تا انتشارش امن باشد.',
      'media.svgBad': '{name} به‌عنوان SVG خوانده نشد. فایل دیگری را امتحان کنید.',
      'media.crop': 'برش', 'media.crop.title': 'برش {name}', 'media.crop.shape': 'شکل',
      'media.crop.r.1:1': 'مربع', 'media.crop.r.4:5': 'عمودی', 'media.crop.r.16:9': 'عریض', 'media.crop.r.1.91:1': 'پیش‌نمایش پیوند',
      'media.crop.size': 'اندازهٔ برش', 'media.crop.area': 'ناحیهٔ برش', 'media.crop.areaHint': 'آن را بکشید یا با کلیدهای جهت‌نما جابه‌جا کنید (با ⇧ گام‌ها بزرگ‌تر می‌شوند).',
      'media.crop.out': 'تصویر تازه‌ای با ابعاد {dims} پیکسل ذخیره می‌شود و نسخهٔ اصلی دست‌نخورده می‌ماند.',
      'media.crop.save': 'ذخیره به‌عنوان تصویر تازه', 'media.crop.saveUse': 'ذخیره و استفاده در «{slot}»',
      'media.crop.saved': 'برشی {ratio} از {name} ذخیره شد.', 'media.crop.fail': 'این تصویر برش نخورد. فایل دیگری را امتحان کنید.',
      'media.focal': 'نقطهٔ کانونی', 'media.focalHint': 'روی تصویر کلیک کنید تا مشخص شود چه چیزی باید در کادر بماند؛ برش‌ها از اطراف آن شروع می‌شوند.',
      'media.focalAt': 'نقطهٔ کانونی: {x} افقی، {y} عمودی. با کلیدهای جهت‌نما جابه‌جا می‌شود.', 'media.focalReset': 'بردن نقطهٔ کانونی به وسط',
      'media.ogRatio': 'نسبتش ۱٫۹۱:۱ نیست، پس پیش‌نمایش پیوندها آن را برش می‌دهند.', 'media.ogCrop': 'برش به ۱٫۹۱:۱',
    },
  });
  const t = (k, v) => MA.t('media.' + k, v);
  const TITLE = { en: 'Media', ar: 'الوسائط', fa: 'رسانه' };

  /* ================= constants ================= */
  const KB = 1024, HEAVY = 500 * KB, OG_HEAVY = 300 * KB, MAX_SIDE = 2400;
  const COMPRESSIBLE = /^image\/(jpeg|png|webp|bmp|avif)$/;
  const ALPHA = /^image\/(png|webp|gif|svg\+xml|avif)$/;
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif', 'image/bmp': 'bmp' };
  /** Where each content slot shows on the site, until the site itself has been read (scanSite finds the real section). */
  const SLOT_SECTION = { studioMira: 'studio', doneMira: 'contact', footMira: 'foot' };
  /**
   * Hints for site files we know (order, background, labels for uses set in the site's code, the text key holding the alt text).
   * The library itself comes from reading ../index.html, so files the redesign adds or drops show up (or go) on their own.
   */
  const KNOWN = [
    { path: 'assets/monogram.png', matte: 'dark', fixed: ['headMark'], alt: 'logo' },
    { path: 'assets/wordmark.png', matte: 'dark', fixed: ['headWord', 'footWord'], alt: 'logo' },
    { path: 'assets/arabic.png', matte: 'dark', fixed: ['headWordAr', 'footWordAr'], alt: 'logo' },
    { path: 'assets/favicon.svg', matte: 'light', fixed: ['favicon'] },
    { film: true },
    { path: 'assets/mira-arrive.png', matte: 'light' },
    { path: 'assets/mira-arrive-shore.png', matte: 'dark' },
  ];
  const KNOWN_BY = Object.fromEntries(KNOWN.filter(k => k.path).map(k => [k.path, k]));
  /** Frame-sequence folders the site plays as films. Others the site adds get a generic name. */
  const FILMS = { 'assets/film/': { key: 'top', section: 'top' } };

  /* ================= small helpers ================= */
  const can = () => MA.can('media.edit');
  const canContent = () => MA.can('content.edit');
  const draft = () => MA.content.draft || MA.content.defaults || {};
  /** A content path without its cache-buster: the site writes e.g. assets/x.png?v=r2, which is the same file. */
  const bareRef = v => String(v ?? '').replace(/[?#].*$/, '');
  const fmtBytes = n => {
    if (n == null || !isFinite(n)) return '';
    if (n < KB) return t('bytes', { n: Math.round(n) }); // "0 bytes", "بايتان", "١٢ بايتاً"
    if (n < KB * KB) return MA.num(n / KB, { style: 'unit', unit: 'kilobyte', unitDisplay: 'short', maximumFractionDigits: 0 });
    return MA.num(n / KB / KB, { style: 'unit', unit: 'megabyte', unitDisplay: 'short', maximumFractionDigits: 1 });
  };
  const fmtDims = (w, hh) => (w && hh ? `${MA.num(w, { useGrouping: false })} × ${MA.num(hh, { useGrouping: false })}` : '');
  const typeLabel = type => (EXT[type] || String(type || '').split('/').pop() || '').toUpperCase();
  const typeOfPath = p => ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif' })[String(p).split('.').pop().toLowerCase()] || 'image/*';
  const pad4 = i => String(i).padStart(4, '0');
  const mapStrings = (o, fn) => typeof o === 'string' ? fn(o) : Array.isArray(o) ? o.map(x => mapStrings(x, fn)) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, mapStrings(v, fn)])) : o;
  const eachString = (o, fn) => { if (typeof o === 'string') fn(o); else if (o && typeof o === 'object') for (const v of Object.values(o)) eachString(v, fn); };
  /** The same walks, with each string's path in the value ([key, key, index…]). */
  const eachStringAt = (o, fn, p = []) => { if (typeof o === 'string') fn(o, p); else if (Array.isArray(o)) o.forEach((v, i) => eachStringAt(v, fn, [...p, i])); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) eachStringAt(v, fn, [...p, k]); };
  const mapStringsAt = (o, fn, p = []) => typeof o === 'string' ? fn(o, p) : Array.isArray(o) ? o.map((x, i) => mapStringsAt(x, fn, [...p, i])) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, mapStringsAt(v, fn, [...p, k])])) : o;
  /** The content path a string sits at: scheduled changes and v2 drafts carry their own overrides. */
  const contentPath = p => { const s = p.map(String); if (s[0] === 'schedule' && s[2] === 'overrides') return s.slice(3).join('/'); if (s[0] === 'overrides') return s.slice(1).join('/'); return s.join('/'); };
  const MEDIA_RE = /^media:([\w-]+)$/;
  const SVG = 'image/svg+xml';
  /** Crop shapes, as [width, height]. */
  const RATIOS = { '1:1': [1, 1], '4:5': [4, 5], '16:9': [16, 9], '1.91:1': [1.91, 1] };
  const ratioText = r => { const [a, b] = RATIOS[r] || [1, 1]; return `${MA.num(a)}:${MA.num(b)}`; };
  const focalOf = m => { const f = m?.focal || {}, c = v => (typeof v === 'number' && isFinite(v) ? MA.clamp(v, 0, 1) : .5); return { x: c(f.x), y: c(f.y) }; };
  /** The largest w×h rectangle of shape `ratio` inside W×H, `scale` (0..1] of that, centred on the focal point and kept inside. */
  function cropRect(W, H, ratio, focal = { x: .5, y: .5 }, scale = 1) {
    const [a, b] = Array.isArray(ratio) ? ratio : RATIOS[ratio] || [1, 1], r = a / b;
    let w = W, hh = W / r; if (hh > H) { hh = H; w = H * r; }
    w *= MA.clamp(scale, .05, 1); hh *= MA.clamp(scale, .05, 1);
    const x = MA.clamp(focal.x * W - w / 2, 0, W - w), y = MA.clamp(focal.y * H - hh / 2, 0, H - hh);
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) };
  }

  /* ================= SVG safety: uploads are served from the site's own origin, so an SVG must not carry code ================= */
  const SVG_NS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink';
  const SVG_OK = new Set(('svg g defs symbol use path rect circle ellipse line polyline polygon text tspan textPath title desc linearGradient radialGradient stop clipPath mask pattern marker filter switch view image style ' +
    'feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur ' +
    'feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence animate animateTransform animateMotion mpath set').split(' '));
  const BAD_VALUE = /javascript:|vbscript:|data:(?!image\/(png|jpe?g|gif|webp|avif)[;,])|livescript:/i;
  const BAD_CSS = /@import|expression\s*\(|javascript:|behaviou?r\s*:|-moz-binding|url\s*\(\s*(?!['"]?\s*#)/i;
  /**
   * Keep only drawing: SVG elements on an allow list, no scripts, no foreignObject, no on* handlers, no links out
   * (href only to '#…', or an embedded raster image), no CSS that loads or runs anything. → { text, changed } | null (not an SVG).
   */
  function sanitizeSvg(text) {
    let doc; try { doc = new DOMParser().parseFromString(String(text || ''), SVG); } catch (e) { return null; }
    const root = doc?.documentElement;
    if (!root || root.localName !== 'svg' || root.namespaceURI !== SVG_NS || doc.getElementsByTagName('parsererror').length) return null;
    let changed = false;
    const drop = n => { n.remove(); changed = true; };
    const walk = el => {
      for (const n of [...el.childNodes]) {
        if (n.nodeType === 7 || n.nodeType === 8) { drop(n); continue; } // processing instructions, comments
        if (n.nodeType !== 1) continue;
        if (n.namespaceURI !== SVG_NS || !SVG_OK.has(n.localName)) { drop(n); continue; }
        if (/^(set|animate|animateTransform|animateMotion)$/.test(n.localName) && /^(on|href$|xlink:href$)/i.test(n.getAttribute('attributeName') || '')) { drop(n); continue; }
        if (n.localName === 'style' && BAD_CSS.test(n.textContent)) { drop(n); continue; }
        clean(n); walk(n);
      }
    };
    const clean = n => {
      for (const a of [...n.attributes]) {
        const name = a.localName.toLowerCase(), v = a.value, ns = a.namespaceURI;
        const nsOk = !ns || ns === XLINK || ns === 'http://www.w3.org/XML/1998/namespace' || ns === 'http://www.w3.org/2000/xmlns/';
        const hrefOk = name !== 'href' || /^\s*#/.test(v) || (n.localName === 'image' && /^\s*data:image\/(png|jpe?g|gif|webp|avif)[;,]/i.test(v));
        if (!nsOk || name.startsWith('on') || !hrefOk || BAD_VALUE.test(v) || ((name === 'style' || /url\s*\(/i.test(v)) && BAD_CSS.test(v))) { n.removeAttributeNode(a); changed = true; }
      }
    };
    for (const a of [...root.getElementsByTagNameNS(SVG_NS, 'a')]) { a.replaceWith(...a.childNodes); changed = true; } // links: keep what they wrap
    clean(root); walk(root);
    return { text: new XMLSerializer().serializeToString(root), changed };
  }
  /** A safe copy of an SVG file (same name), or null when it can't be read as SVG. */
  async function safeSvgFile(file) {
    let text = ''; try { text = await file.text(); } catch (e) { return null; }
    const r = sanitizeSvg(text); if (!r) return null;
    return { file: r.changed ? new File([r.text], file.name || 'image.svg', { type: SVG }) : file, changed: r.changed };
  }

  /* ================= uploads store (metadata in MA.db, blobs in IndexedDB) ================= */
  const uploads = () => { const l = MA.db.get('media', []); return Array.isArray(l) ? l : []; };
  const blobs = new Map(), urls = new Map();
  let readyResolve, loaded = false; const ready = new Promise(r => (readyResolve = r));
  function setBlob(id, blob) {
    const old = urls.get(id); if (old) URL.revokeObjectURL(old);
    if (!blob) { blobs.delete(id); urls.delete(id); return; }
    blobs.set(id, blob); urls.set(id, URL.createObjectURL(blob));
  }
  function saveUploads(list) { MA.db.set('media', list); MA.emit('media'); }
  function getUpload(id) { return uploads().find(m => m.id === id) || null; }
  function patchUpload(id, patch) { const list = uploads(), i = list.findIndex(m => m.id === id); if (i < 0) return null; list[i] = { ...list[i], ...patch }; saveUploads(list); return list[i]; }
  /** A file name that is safe in a URL and unique among uploads: 'night-sky.webp', 'night-sky-2.webp'… */
  function fileFor(m, list) {
    const ext = EXT[m.type] || String(m.name || '').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'img';
    const base = MA.slug(String(m.name || '').replace(/\.[^.]+$/, '')) || 'image';
    const taken = new Set(list.filter(x => x.id !== m.id).map(x => x.file));
    let f = `${base}.${ext}`, k = 2; while (taken.has(f)) f = `${base}-${k++}.${ext}`;
    return f;
  }
  const withExt = (name, type) => String(name || 'image').replace(/\.[^.]+$/, '') + '.' + (EXT[type] || 'img');
  const byFile = path => { const m = /^assets\/uploads\/(.+)$/.exec(String(path || '')); return m ? uploads().find(u => u.file === m[1]) || null : null; };
  async function loadCache() {
    const list = uploads(), want = new Set(list.map(m => m.id));
    for (const id of [...blobs.keys()]) if (!want.has(id)) setBlob(id, null);
    await Promise.all(list.filter(m => !blobs.has(m.id)).map(async m => { try { const b = await MA.idb.get('files', m.id); if (b && !blobs.has(m.id)) setBlob(m.id, b); } catch (e) { /* storage unavailable */ } }));
    // SVGs stored before uploads were cleaned: clean them now, before anything can publish them
    const fixed = new Map();
    for (const m of uploads().filter(x => x.type === SVG && !x.safe && blobs.has(x.id))) {
      try {
        const old = blobs.get(m.id), r = sanitizeSvg(await old.text()); if (!r) continue;
        const b = r.changed ? new Blob([r.text], { type: SVG }) : old;
        if (r.changed) { await MA.idb.put('files', m.id, b); setBlob(m.id, b); }
        fixed.set(m.id, b.size);
      } catch (e) { /* leave it unsafe: referenced() won't hand it to a publish */ }
    }
    if (fixed.size) MA.db.set('media', uploads().map(m => fixed.has(m.id) ? { ...m, safe: 1, size: fixed.get(m.id) } : m));
  }
  function repushPreview() { if (MA.content.draft) MA.site.broadcast({ type: 'miras:content', content: MA.content.forPreview() }); }
  loadCache().then(() => { loaded = true; readyResolve(); MA.emit('media'); repushPreview(); }, () => { loaded = true; readyResolve(); });
  MA.on('db:media', () => loadCache().then(() => { MA.emit('media'); repushPreview(); }));

  /** Displayable URL for a stored value: 'media:<id>' → blob URL; 'assets/…' → '../assets/…'. */
  function url(v) {
    v = String(v ?? '').trim(); if (!v) return '';
    const m = MEDIA_RE.exec(v); if (m) return urls.get(m[1]) || '';
    if (/^(https?:|data:|blob:)/i.test(v)) return v;
    const up = byFile(v); if (up && urls.get(up.id)) return urls.get(up.id);
    return '../' + v.replace(/^\.?\/+/, '');
  }
  // live previews show uploads before they are published (blob URLs work in the same-origin preview iframe)
  MA.content.previewHooks.push(c => mapStrings(c, s => {
    const m = MEDIA_RE.exec(s); if (m) return urls.get(m[1]) || s;
    if (s.startsWith('assets/uploads/')) { const up = byFile(s); if (up && urls.get(up.id)) return urls.get(up.id); }
    return s;
  }));

  /* ---------- references that can't be published ---------- */
  /** Readable name for a content path that holds an image. */
  const pathLabel = path => { const p = String(path).split('/'); if (p[0] === 'media' && p[1]) return slotName(p[1]); if (path === 'seo/ogImage') return t('og'); return MA.content.label(path); };
  /**
   * 'media:<id>' values that a publish can't deliver: the upload is gone (deleted here, or the content came from another
   * browser), this browser lost its file, or it is an SVG that hasn't been cleaned yet.
   * → [{ id, ref, path (content path), at (path in src), label, name, why: 'gone'|'noBlob'|'unsafe' }]
   */
  function unresolved(src) {
    const out = [], seen = new Set(), list = uploads();
    eachStringAt(src ?? MA.content.draft ?? {}, (s, p) => {
      const m = MEDIA_RE.exec(s); if (!m) return;
      const u = list.find(x => x.id === m[1]);
      const why = !u ? 'gone' : loaded && !blobs.has(u.id) ? 'noBlob' : u.type === SVG && !u.safe ? 'unsafe' : '';
      if (!why) return;
      const path = contentPath(p), at = p.join('/'); if (seen.has(at)) return; seen.add(at);
      out.push({ id: m[1], ref: s, path, at, label: pathLabel(path), name: u?.name || '', why });
    });
    return out;
  }
  /** What a missing upload is published as instead: the site's own default for that place (the live site shows it for 'media:…' anyway). */
  const fallbackFor = path => { const v = MA.content.def(path); return typeof v === 'string' && !MEDIA_RE.test(v) ? v : ''; };
  /** Saved versions, the published content and scheduled changes that still point at an upload: restoring them needs its file. */
  function heldBy(id) {
    const ref = 'media:' + id, has = o => { let f = false; eachString(o, s => { if (s === ref) f = true; }); return f; };
    const when = at => (at ? MA.date(at, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
    const out = [];
    for (const v of MA.versions?.list?.() || []) if (has(v.content)) out.push({ kind: 'version', id: v.id, label: t(v.kind === 'publish' ? 'u.vPublish' : 'u.version', { when: when(v.at) }) + (v.note ? ' · ' + v.note : ''), href: '#/history' });
    if (has(MA.content.published)) out.push({ kind: 'live', label: t('u.live'), href: '#/history' });
    for (const x of MA.content.schedule || []) if (has(x?.overrides)) out.push({ kind: 'schedule', label: t('u.schedule', { when: when(x.at) }), href: '#/history' });
    return out;
  }
  const listFmt = arr => { try { return new Intl.ListFormat(MA.locale(), { type: 'conjunction' }).format(arr); } catch (e) { return arr.join(', '); } };
  // (restoring a version or importing a draft that points at missing uploads is announced by History, which also blocks the
  // publish; this page marks the slots: see drawSide)

  /* ================= the library: site files + films + uploads ================= */
  const probe = new Map(); // path → {ok, w, h}
  const sizes = new Map(); // path → bytes | null (from a HEAD request)
  const fixedLabel = f => Array.isArray(f) ? t('u.' + f[0], { n: typeof f[1] === 'number' ? MA.num(f[1]) : f[1] }) : f.startsWith('film.') ? t(f) : t('u.' + f);

  /* ---------- read the live site: which images its code uses, and which folders hold frame-by-frame films ---------- */
  let scan = null, scanP = null; // scan = { files: Map(path → times referenced), films: [{dir, base, n, key, section}] }
  const head = u => fetch(u, { method: 'HEAD', cache: 'no-cache' }).then(r => r.ok).catch(() => false);
  async function countFrames(base) {
    const has = i => head(`../${base}f${pad4(i)}.jpg`);
    if (!(await has(1))) return 0;
    let lo = 1, hi = 2; while (hi < 4096 && (await has(hi))) { lo = hi; hi *= 2; }
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (await has(mid)) lo = mid; else hi = mid; }
    return lo;
  }
  function scanSite() {
    return scanP ||= fetch('../index.html', { cache: 'no-cache' }).then(r => (r.ok ? r.text() : '')).then(async html => {
      if (!html) throw new Error('no site');
      const files = new Map(), dirs = new Set();
      for (const m of html.matchAll(/assets\/[\w\-./]*/g)) {
        const p = m[0].replace(/\.+$/, '');
        if (p.endsWith('/')) { if (p !== 'assets/' && !p.startsWith('assets/uploads')) dirs.add(p); }
        else if (/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(p)) files.set(p, (files.get(p) || 0) + 1);
      }
      const films = [];
      for (const dir of dirs) {
        let base = dir + 'd/', n = await countFrames(base); // desktop set (the site swaps in a portrait set on phones)
        if (!n) { base = dir; n = await countFrames(base); }
        if (n > 1) films.push({ dir, base, n, ...(FILMS[dir] || { key: 'other', section: null }) });
      }
      // which section each image slot sits in: the site's SLOTS map gives the selector, its markup gives the section
      const slotSec = {};
      try {
        const sm = /\bSLOTS\s*=\s*\{([^}]*)\}/.exec(html);
        if (sm) {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          for (const [, k, , sel] of sm[1].matchAll(/(\w+)\s*:\s*(['"])(.*?)\2/g)) { const sec = doc.querySelector(sel)?.closest('section[id], footer[id]'); if (sec) slotSec[k] = sec.id; }
        }
      } catch (e) { /* keep the hints */ }
      scan = { files, films, slotSec };
      MA.emit('media');
      return scan;
    }).catch(() => { scan = { files: new Map(), films: [], failed: true }; return scan; });
  }
  /** How many content defaults point at a path (those references in index.html are slots, not fixed uses). */
  const defaultRefs = path => { const d = MA.content.defaults || {}; let n = 0; for (const v of Object.values(d.media || {})) if (bareRef(v) === path) n++; if (bareRef(d.seo?.ogImage) === path) n++; return n; };
  function codeUses(path) {
    const k = KNOWN_BY[path];
    if (!scan || scan.failed) return k?.fixed || [];
    const n = scan.files.get(path) || 0; if (!n) return [];
    if (k?.fixed) return k.fixed;
    return n > defaultRefs(path) ? ['code'] : [];
  }
  function filmItem(f) {
    const first = f.base + 'f0001.jpg', p = probe.get(first);
    return { id: 'film:' + f.dir, kind: 'film', value: null, name: f.key === 'other' ? t('film.other', { name: f.dir.split('/').filter(Boolean).pop() }) : t('film.' + f.key), path: f.dir, dir: f.base, n: f.n, section: f.section,
      type: 'image/jpeg', src: '../' + first, w: p?.w, h: p?.h, size: null, matte: 'none', fixed: [f.key === 'other' ? 'code' : 'film.' + f.key], missing: p?.ok === false };
  }
  function siteItem(path) {
    const k = KNOWN_BY[path] || {}, p = probe.get(path), type = typeOfPath(path);
    return { id: path, kind: 'site', value: path, name: path.split('/').pop(), path, type, src: '../' + path, w: p?.w, h: p?.h, size: sizes.get(path) ?? null,
      matte: k.matte || (ALPHA.test(type) ? 'checker' : 'none'), fixed: codeUses(path), altKey: k.altKey, altKind: k.alt || (k.altKey ? 'key' : 'deco'), missing: p?.ok === false };
  }
  function uploadItem(m) {
    return { id: m.id, kind: 'upload', value: 'media:' + m.id, name: m.name || t('untitled'), file: m.file, path: 'assets/uploads/' + m.file, type: m.type, src: urls.get(m.id) || '', w: m.w, h: m.h, size: m.size,
      matte: ALPHA.test(m.type) ? 'checker' : 'none', alt: m.alt || { en: '', ar: '' }, decorative: !!m.decorative, tags: m.tags || [], at: m.at, fixed: [] };
  }
  /** Every 'assets/…' path the content points at (so images the site adds later still show up). */
  function contentRefs() {
    const out = new Set(), d = draft();
    for (const k of slotKeys()) if (typeof d.media?.[k] === 'string') out.add(bareRef(d.media[k]));
    if (d.seo?.ogImage) out.add(bareRef(d.seo.ogImage));
    for (const v of Object.values(MA.content.defaults?.media || {})) if (typeof v === 'string') out.add(bareRef(v));
    return [...out].filter(v => /^assets\//.test(v) && !/^assets\/uploads\//.test(v));
  }
  function allItems() {
    const seen = new Set(), site = [], refs = contentRefs(), live = scan && !scan.failed;
    const add = p => { if (seen.has(p)) return; seen.add(p); site.push(siteItem(p)); };
    // known files first (logos, then the films, then the rest) — once the site is read, only the ones it still uses
    for (const k of KNOWN) {
      if (k.film) { (scan?.films || []).forEach(f => site.push(filmItem(f))); continue; }
      if (!live || scan.files.has(k.path) || refs.includes(k.path)) add(k.path);
    }
    if (live) for (const p of scan.files.keys()) add(p);
    refs.forEach(add);
    const ups = uploads().slice().sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))).map(uploadItem);
    const idx = usageIndex();
    // a file the server doesn't have only matters if something points at it
    return [...ups, ...site].map(it => { it.uses = usagesOf(it, idx); return it; }).filter(it => !it.missing || it.uses.some(u => u.kind !== 'fixed'));
  }
  const findItem = id => { const k = bareRef(id); return k ? allItems().find(it => it.id === k || it.value === k) || null : null; };

  /* ---------- usage: which content fields (and which parts of the site's code) use an image ---------- */
  /** The image slots the current site has: the keys of the defaults' media (a draft from before a redesign may carry old ones). */
  const slotKeys = () => Object.keys(MA.content.defaults?.media || draft().media || {});
  function slotName(k) { const key = 'media.slot.' + k; const s = MA.t(key); return s !== key ? s : String(k).replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()); }
  function slotDesc(k) { const key = 'media.slot.' + k + '.d'; const s = MA.t(key); return s !== key ? s : t('slot.other.d', { key: k }); }
  function usageIndex() {
    const idx = new Map(), d = draft();
    const add = (v, u) => { if (typeof v !== 'string' || !v) return; (idx.get(v) || idx.set(v, []).get(v)).push(u); };
    for (const k of slotKeys()) add(bareRef(d.media?.[k]), { kind: 'slot', key: k, path: `media/${k}`, label: slotName(k), section: slotSection(k) });
    add(bareRef(d.seo?.ogImage), { kind: 'seo', path: 'seo/ogImage', label: t('og'), href: '#/seo' });
    return idx;
  }
  function usagesOf(it, idx = usageIndex()) {
    const fixed = (it.fixed || []).map(f => ({ kind: 'fixed', label: fixedLabel(f), section: it.section || null }));
    if (it.kind === 'upload') return [...(idx.get(it.value) || []), ...(idx.get(it.path) || [])];
    if (it.kind === 'film') return fixed;
    return [...(idx.get(it.path) || []), ...fixed];
  }

  /* ---------- alt text ---------- */
  function altState(it) {
    const st = (en, ar) => (en && ar ? 'ok' : !en && !ar ? 'none' : !en ? 'noEn' : 'noAr');
    if (it.kind === 'upload') return it.decorative ? 'deco' : st(!!String(it.alt?.en || '').trim(), !!String(it.alt?.ar || '').trim());
    if (it.altKey && MA.content.def(`text/en/${it.altKey}`) !== undefined) return st(!!MA.strip(MA.content.get(`text/en/${it.altKey}`) || '').trim(), !!MA.strip(MA.content.get(`text/ar/${it.altKey}`) || '').trim());
    return 'deco';
  }
  const missingAlt = it => ['none', 'noEn', 'noAr'].includes(altState(it));

  /* ================= upload pipeline: read → (compress?) → store ================= */
  function readDims(blob) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(blob), img = new Image();
      img.onload = () => { res({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 }); URL.revokeObjectURL(u); };
      img.onerror = () => { rej(new Error('decode')); URL.revokeObjectURL(u); };
      img.src = u;
    });
  }
  const loadImg = blob => new Promise((res, rej) => {
    const u = URL.createObjectURL(blob), img = new Image();
    img.onload = () => { res(img); setTimeout(() => URL.revokeObjectURL(u), 0); };
    img.onerror = () => { rej(new Error('decode')); URL.revokeObjectURL(u); };
    img.src = u;
  });
  /** Canvas re-encode: long side ≤ MAX_SIDE, WebP (falls back to JPEG where the browser can't write WebP). */
  async function compress(blob, format = 'webp') {
    const img = await loadImg(blob), W = img.naturalWidth, H = img.naturalHeight;
    const s = Math.min(1, MAX_SIDE / Math.max(W, H)), w = Math.max(1, Math.round(W * s)), hh = Math.max(1, Math.round(H * s));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
    const ctx = cv.getContext('2d');
    if (format === 'jpeg') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, hh); }
    ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, w, hh);
    const out = await new Promise(r => cv.toBlob(r, 'image/' + format, format === 'webp' ? .8 : .82));
    if (!out || out.type !== 'image/' + format) return format === 'webp' ? compress(blob, 'jpeg') : { blob: out || blob, w, h: hh };
    return { blob: out, w, h: hh };
  }
  /** Ask once for every heavy file: compress (WebP / JPEG) or keep. Resolves {compress, results: Map(file → {blob,w,h})} or null (dismissed). */
  function askCompress(list) {
    return new Promise(res => {
      let fmt = 'webp', answered = false, results = new Map(), gen = 0;
      const rows = h('div.md-cz-rows');
      const alphaNote = h('p.hint.small.md-cz-alpha', { hidden: true }, t('big.alpha'));
      const one = list.length === 1;
      const seg = MA.ui.seg([{ value: 'webp', label: 'WebP' }, { value: 'jpeg', label: 'JPEG' }], fmt, v => { fmt = v; alphaNote.hidden = !(v === 'jpeg' && list.some(p => ALPHA.test(p.file.type))); measure(); }, { size: 'sm', label: t('big.format') });
      const L = MA.ui.modal({
        title: esc(t('big.title')), size: 'wide',
        body: h('div.md-cz', h('p.muted', t('big.text', { max: fmtBytes(HEAVY), px: MA.num(MAX_SIDE, { useGrouping: false }) })),
          h('div.row.md-cz-fmt', h('span.small.muted', t('big.format')), seg), alphaNote, rows),
        onClose: () => answered || res(null),
        actions: [
          { label: t(one ? 'big.noOne' : 'big.no'), kind: 'ghost', run: () => { answered = true; res({ compress: false, results }); } },
          { label: t(one ? 'big.yesOne' : 'big.yes'), kind: 'primary', run: () => { if (busy) return false; answered = true; res({ compress: true, results }); } },
        ],
      });
      L.el.classList.add('md-modal');
      let busy = false;
      const setBusy = b => { busy = b; const btn = L.el.querySelector('.modal-foot .btn.primary'); if (btn) btn.disabled = b; };
      async function measure() {
        const g = ++gen; results = new Map(); setBusy(true);
        rows.innerHTML = '';
        for (const p of list) {
          const out = h('span.md-cz-out.small.faint', t('big.measuring'));
          const th = h('span.md-cz-thumb'), u = URL.createObjectURL(p.file); th.append(h('img', { src: u, alt: '' })); setTimeout(() => URL.revokeObjectURL(u), 5000);
          rows.append(h('div.md-cz-row', th, h('div.grow', h('div.truncate.h4', p.file.name), h('div.small.muted', { html: `<span class="num" dir="ltr">${esc(fmtDims(p.w, p.h))}</span> · <span class="num">${esc(fmtBytes(p.file.size))}</span>` })), out));
          try {
            const r = await compress(p.file, fmt); if (g !== gen) return;
            results.set(p.file, r);
            if (r.blob.size >= p.file.size) out.textContent = t('big.lean');
            else out.innerHTML = `<b class="num">${esc(fmtBytes(r.blob.size))}</b> · <span class="num" dir="ltr">${esc(fmtDims(r.w, r.h))}</span><br><span class="good">${esc(t('big.saves', { pct: MA.pct(1 - r.blob.size / p.file.size) }))}</span>`;
          } catch (e) { if (g !== gen) return; out.textContent = t('big.lean'); }
        }
        if (g === gen) setBusy(false);
      }
      measure();
    });
  }
  /** Add image files to the library. Returns the new upload ids. */
  async function ingest(files) {
    if (!can()) { MA.toast(t('readonly'), { tone: 'bad' }); return []; }
    files = [...(files || [])];
    const imgs = files.filter(f => /^image\//.test(f.type));
    if (files.length > imgs.length) MA.toast(t('skipped', { n: files.length - imgs.length }), { tone: 'bad' });
    if (!imgs.length) return [];
    const prepared = [], cleaned = [];
    for (let f of imgs) {
      if (f.type === SVG) { const r = await safeSvgFile(f); if (!r) { MA.toast(t('svgBad', { name: esc(f.name) }), { tone: 'bad' }); continue; } if (r.changed) cleaned.push(f.name); f = r.file; }
      try { prepared.push({ file: f, ...(await readDims(f)) }); } catch (e) { MA.toast(t('readFail', { name: esc(f.name) }), { tone: 'bad' }); }
    }
    const heavy = prepared.filter(p => p.file.size > HEAVY && COMPRESSIBLE.test(p.file.type));
    let plan = null;
    if (heavy.length) { plan = await askCompress(heavy); if (!plan) { MA.toast(t('cancelled')); return []; } }
    const list = uploads(), added = [];
    for (const p of prepared) {
      let blob = p.file, w = p.w, hh = p.h;
      const r = plan?.compress ? plan.results.get(p.file) : null;
      if (r && r.blob.size < p.file.size) { blob = r.blob; w = r.w; hh = r.h; }
      const id = MA.uid('m');
      try { await MA.idb.put('files', id, blob); } catch (e) { MA.toast(t('saveFail'), { tone: 'bad' }); continue; }
      const m = { id, name: blob === p.file ? (p.file.name || t('untitled')) : withExt(p.file.name, blob.type), file: '', type: blob.type || p.file.type, size: blob.size, w, h: hh, alt: { en: '', ar: '' }, decorative: false, tags: [], at: new Date(Date.now() + added.length).toISOString() };
      if (m.type === SVG) m.safe = 1;
      m.file = fileFor(m, [...list, ...added]);
      added.push(m); setBlob(id, blob);
    }
    if (!added.length) return [];
    saveUploads([...list, ...added]);
    MA.activity.log({ action: 'media.upload', target: added.map(m => m.name).join(', ').slice(0, 120), module: 'media', href: '#/media?f=uploads' });
    const ids = added.map(m => m.id);
    if (cleaned.length) MA.toast(esc(t('svgClean', { name: listFmt(cleaned) })), { icon: 'lock' });
    MA.toast(added.length === 1 ? t('uploaded1', { name: esc(added[0].name) }) : t('uploaded', { n: added.length }), {
      undo: () => { const idx = usageIndex(); const gone = new Set(ids.filter(id => !idx.has('media:' + id) && !heldBy(id).length)); saveUploads(uploads().filter(m => !gone.has(m.id))); gone.forEach(id => { setBlob(id, null); MA.idb.del('files', id).catch(() => {}); }); },
    });
    return ids;
  }

  /* ---------- replace / compress / delete an upload ---------- */
  async function replaceUpload(id, file) {
    const old = getUpload(id); if (!old || !file) return false;
    if (!/^image\//.test(file.type)) { MA.toast(t('skipped', { n: 1 }), { tone: 'bad' }); return false; }
    let cleaned = false;
    if (file.type === SVG) { const r = await safeSvgFile(file); if (!r) { MA.toast(t('svgBad', { name: esc(file.name) }), { tone: 'bad' }); return false; } cleaned = r.changed; file = r.file; }
    let dims; try { dims = await readDims(file); } catch (e) { MA.toast(t('readFail', { name: esc(file.name) }), { tone: 'bad' }); return false; }
    let blob = file, w = dims.w, hh = dims.h;
    if (file.size > HEAVY && COMPRESSIBLE.test(file.type)) {
      const plan = await askCompress([{ file, ...dims }]); if (!plan) { MA.toast(t('cancelled')); return false; }
      const r = plan.compress && plan.results.get(file); if (r && r.blob.size < file.size) { blob = r.blob; w = r.w; hh = r.h; }
    }
    const oldBlob = blobs.get(id);
    try { await MA.idb.put('files', id, blob); } catch (e) { MA.toast(t('saveFail'), { tone: 'bad' }); return false; }
    const next = { ...old, name: blob === file ? file.name : withExt(file.name, blob.type), type: blob.type || file.type, size: blob.size, w, h: hh, replacedAt: new Date().toISOString() };
    if (next.type === SVG) next.safe = 1; else delete next.safe;
    if (cleaned) MA.toast(esc(t('svgClean', { name: file.name })), { icon: 'lock' });
    next.file = fileFor(next, uploads());
    setBlob(id, blob); patchUpload(id, next); repushPreview();
    MA.activity.log({ action: 'media.replace', target: old.name, module: 'media', href: '#/media/' + encodeURIComponent(id) });
    MA.toast(t('replaced', { name: esc(old.name) }), { undo: async () => { if (!oldBlob) return; await MA.idb.put('files', id, oldBlob).catch(() => {}); setBlob(id, oldBlob); patchUpload(id, old); repushPreview(); } });
    return true;
  }
  async function compressUpload(id) {
    const m = getUpload(id), blob = blobs.get(id); if (!m || !blob) return;
    const file = new File([blob], m.name, { type: m.type });
    const plan = await askCompress([{ file, w: m.w, h: m.h }]); if (!plan?.compress) return;
    const r = plan.results.get(file); if (!r || r.blob.size >= blob.size) { MA.toast(t('big.lean')); return; }
    try { await MA.idb.put('files', id, r.blob); } catch (e) { MA.toast(t('saveFail'), { tone: 'bad' }); return; }
    const next = { ...m, name: withExt(m.name, r.blob.type), type: r.blob.type, size: r.blob.size, w: r.w, h: r.h }; next.file = fileFor(next, uploads());
    setBlob(id, r.blob); patchUpload(id, next); repushPreview();
    MA.toast(t('compressed', { name: esc(m.name), from: fmtBytes(blob.size), to: fmtBytes(r.blob.size) }), { undo: async () => { await MA.idb.put('files', id, blob).catch(() => {}); setBlob(id, blob); patchUpload(id, m); repushPreview(); } });
  }
  /** Delete an upload unless something uses it. Reversible from the toast (the blob is held in memory until then). */
  function deleteUpload(id) {
    const m = getUpload(id); if (!m) return false;
    const uses = [...usagesOf(uploadItem(m)), ...heldBy(id)];
    if (uses.length) { MA.toast(t('blockedToast', { name: esc(m.name), where: esc(listFmt(uses.slice(0, 3).map(u => u.label))) }), { tone: 'bad' }); return false; }
    const blob = blobs.get(id), at = uploads().findIndex(x => x.id === id);
    setBlob(id, null); saveUploads(uploads().filter(x => x.id !== id)); MA.idb.del('files', id).catch(() => {});
    MA.activity.log({ action: 'media.delete', target: m.name, module: 'media', href: '#/media' });
    MA.toast(t('deleted', { name: esc(m.name) }), { undo: async () => { if (blob) { await MA.idb.put('files', id, blob).catch(() => {}); setBlob(id, blob); } const l = uploads(); l.splice(Math.max(0, at), 0, m); saveUploads(l); } });
    return true;
  }

  /* ---------- point content at an image ---------- */
  function setRef(path, value, label) {
    if (!canContent()) { MA.toast(MA.t('readOnly'), { tone: 'bad' }); return; }
    const before = MA.content.get(path); if (before === value) return;
    MA.content.set(path, value, { coalesce: false, label: MA.content.label(path) });
    const it = findItem(value) || findItem(byFile(value)?.id);
    MA.toast(t('slotSet', { slot: esc(label), name: esc(it?.name || value) }), { undo: () => MA.content.set(path, before, { coalesce: false }) });
  }
  function resetRef(path, label) {
    if (!canContent()) return;
    const before = MA.content.get(path); MA.content.reset(path, 'default');
    MA.toast(t('slotReset', { slot: esc(label) }), { undo: () => MA.content.set(path, before, { coalesce: false }) });
  }
  /** Every content place an image can go: the image slots and the sharing image. */
  function targets() {
    const d = draft(), out = [];
    for (const k of slotKeys()) out.push({ path: `media/${k}`, key: k, label: slotName(k), desc: slotDesc(k), section: slotSection(k), group: 'slots' });
    if (d.seo && 'ogImage' in d.seo) out.push({ path: 'seo/ogImage', label: t('og'), desc: t('ogD'), section: null, group: 'seo', href: '#/seo' });
    return out;
  }
  function showInPreview(section) { const L = MA.preview.open(); if (section) L?.frame?.goto(section); }
  const slotSection = k => scan?.slotSec?.[k] || SLOT_SECTION[k] || null;
  /** A section the draft hides (sections/<id> = false): its images aren't on the site. */
  const sectionOff = sec => !!sec && MA.content.get('sections/' + sec) === false;
  /**
   * "Show in preview" for an image slot: open the preview, wait for the site to paint the slot (data-cms="media.<slot>"),
   * then flash it. A slot that isn't on screen (its section is hidden, or it shows only after a brief is sent) says so.
   */
  async function previewSlot(k) {
    const label = slotName(k), sec = slotSection(k);
    if (sectionOff(sec)) { MA.toast(esc(t('pvHidden', { slot: label, section: MA.content.groupName(sec) }))); return; }
    const L = MA.preview.open(), fr = L?.frame; if (!fr) return;
    const key = 'media.' + k, find = () => { try { return fr.iframe.contentDocument?.querySelector(`[data-cms="${CSS.escape(key)}"]`) || null; } catch (e) { return null; } };
    let el = null;
    for (let i = 0; i < 60 && !(el = find()); i++) { await new Promise(r => setTimeout(r, 150)); if (!fr.iframe.isConnected) return; }
    if (el && el.getClientRects().length) { fr.flash(key); return; }
    const where = el?.closest('section[id], footer[id]')?.id || sec;
    if (where) fr.goto(where);
    MA.toast(esc(t('pvLater', { slot: label })), { icon: 'info' });
  }

  /* ================= thumbnails ================= */
  function probeSite(items, onDone) {
    for (const it of items) {
      if (it.kind === 'upload') continue;
      const key = it.kind === 'film' ? it.dir + 'f0001.jpg' : it.path;
      if (!probe.has(key)) {
        probe.set(key, { pending: true });
        const img = new Image();
        img.onload = () => { probe.set(key, { ok: true, w: img.naturalWidth, h: img.naturalHeight }); onDone(it.id); };
        img.onerror = () => { probe.set(key, { ok: false }); onDone(it.id, true); };
        img.src = '../' + key;
      }
      if (it.kind === 'site' && !sizes.has(it.path)) {
        sizes.set(it.path, null);
        fetch('../' + it.path, { method: 'HEAD' }).then(r => { const n = +r.headers.get('content-length'); if (r.ok && n) { sizes.set(it.path, n); onDone(it.id); } }).catch(() => {});
      }
    }
  }
  function thumb(it, { cls = '' } = {}) {
    const box = h('span', { class: `md-thumb matte-${it.matte || 'none'} ${cls}`.trim() });
    if (it.src) box.append(h('img', { src: it.src, alt: '', loading: 'lazy', decoding: 'async', draggable: false, class: it.matte && it.matte !== 'none' ? 'contain' : '' }));
    else box.append(h('span.md-thumb-ph', { html: MA.icon('image') }));
    return box;
  }
  /** Hovering a film tile scrubs through its frames (mirrored in RTL). */
  function bindScrub(tile, it) {
    const img = tile.querySelector('.md-thumb img'); if (!img) return;
    let last = -1;
    tile.addEventListener('pointermove', e => {
      const r = tile.getBoundingClientRect(); let f = MA.clamp((e.clientX - r.left) / r.width, 0, .9999); if (MA.isRTL()) f = .9999 - f;
      const i = Math.floor(f * it.n); if (i === last) return; last = i;
      img.src = '../' + it.dir + 'f' + pad4(i + 1) + '.jpg'; tile.style.setProperty('--p', ((i + 1) / it.n).toFixed(3));
      const m = tile.querySelector('.md-meta'); if (m) m.textContent = t('frame', { i: MA.num(i + 1), n: MA.num(it.n) });
    });
    tile.addEventListener('pointerleave', () => { last = -1; img.src = '../' + it.dir + 'f0001.jpg'; tile.style.setProperty('--p', '0'); const m = tile.querySelector('.md-meta'); if (m) m.innerHTML = metaLine(it); });
  }

  /* ================= page state ================= */
  const S = { f: 'all', q: '', sort: 'default', view: MA.db.get('media.view', 'grid') === 'list' ? 'list' : 'grid', cursor: null, open: null, drawer: null, matte: {} };
  let V = null;
  const FILTERS = ['all', 'used', 'unused', 'noalt', 'uploads', 'site'];
  const pass = (it, f) => f === 'used' ? it.uses.length > 0 : f === 'unused' ? !it.uses.length : f === 'noalt' ? missingAlt(it) : f === 'uploads' ? it.kind === 'upload' : f === 'site' ? it.kind !== 'upload' : true;
  function matchQ(it, q) {
    if (!q) return true; q = q.toLowerCase();
    return [it.name, it.path, it.alt?.en, it.alt?.ar, ...(it.tags || []), ...(it.uses || []).map(u => u.label)].join(' ').toLowerCase().includes(q);
  }
  function visible(all) {
    const list = all.filter(it => pass(it, S.f) && matchQ(it, S.q));
    if (S.sort === 'name') list.sort((a, b) => String(a.name).localeCompare(String(b.name), MA.lang()));
    else if (S.sort === 'size') list.sort((a, b) => (b.size ?? -1) - (a.size ?? -1));
    return list;
  }

  /* ================= render ================= */
  function render(view, ctx) {
    const root = h('div.m-media');
    view.append(root);
    const fq = ctx.query.get('f'); S.f = FILTERS.includes(fq) ? fq : 'all';
    S.q = ctx.query.get('q') || '';
    V = { root };

    const actions = [];
    if (can()) actions.push(MA.ui.btn(t('upload'), { icon: 'upload', kind: 'primary', onclick: pickAndUpload }));
    root.append(MA.ui.pageHead({ title: esc(MA.L(TITLE)), sub: esc(t('sub')), actions }));
    if (!can()) root.append(h('div.callout.md-ro', MA.frag(MA.icon('lock')), h('span', t('readonly'))));

    const lib = h('section.md-lib', { 'aria-label': MA.L(TITLE) });
    const side = h('aside.md-side', { 'aria-label': t('slots') });
    root.append(h('div.md-layout', lib, side));

    // toolbar
    V.tabs = h('div.md-tabs');
    V.search = h('input.input', { type: 'search', placeholder: t('search'), 'aria-label': t('search'), value: S.q });
    V.search.addEventListener('input', MA.debounce(() => { if (!V) return; S.q = V.search.value.trim(); MA.setQuery({ q: S.q }); drawLib(); }, 120));
    V.search.addEventListener('keydown', e => {
      if (e.key === 'Escape' && V.search.value) { e.preventDefault(); e.stopPropagation(); V.search.value = ''; S.q = ''; MA.setQuery({ q: '' }); drawLib(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    });
    const sort = MA.ui.select([{ value: 'default', label: t('sort.default') }, { value: 'name', label: t('sort.name') }, { value: 'size', label: t('sort.size') }], S.sort, v => { S.sort = v; drawLib(); }, { cls: 'sm', label: t('sort') });
    V.viewSeg = MA.ui.seg([{ value: 'grid', icon: 'grid', title: t('view.grid') }, { value: 'list', icon: 'list', title: t('view.list') }], S.view, v => setView(v), { size: 'sm', label: t('view') });
    lib.append(V.tabs, h('div.toolbar.md-toolbar', h('div.search', MA.frag(MA.icon('search', 'sm')), V.search), h('span.grow'), sort, V.viewSeg));
    V.body = h('div.md-body');
    V.foot = h('p.md-foot.tiny.faint');
    lib.append(V.body, V.foot);
    V.side = side;

    // drop anywhere on the page
    const drop = V.drop = h('div.md-drop', { hidden: true, 'aria-hidden': 'true' }, h('div.md-drop-in', MA.frag(MA.icon('upload', 'lg')), h('b.h3', t('dropTitle')), h('span.small', t('dropText', { max: fmtBytes(HEAVY) }))));
    document.body.append(drop);
    let depth = 0;
    const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
    const onEnter = e => { if (!hasFiles(e)) return; e.preventDefault(); depth++; if (can()) drop.hidden = false; };
    const onOver = e => { if (!hasFiles(e)) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = can() ? 'copy' : 'none'; };
    const onLeave = e => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) drop.hidden = true; };
    const onDrop = e => {
      if (!hasFiles(e)) return; e.preventDefault(); depth = 0; drop.hidden = true;
      if (!can()) { MA.toast(t('readonly'), { tone: 'bad' }); return; }
      const files = [...(e.dataTransfer?.files || [])]; if (files.length) uploadThenShow(files);
    };
    addEventListener('dragenter', onEnter); addEventListener('dragover', onOver); addEventListener('dragleave', onLeave); addEventListener('drop', onDrop);
    MA.cleanup(() => { drop.remove(); removeEventListener('dragenter', onEnter); removeEventListener('dragover', onOver); removeEventListener('dragleave', onLeave); removeEventListener('drop', onDrop); });

    drawLib(); drawSide();
    scanSite(); // reads ../index.html once; the library redraws when it lands

    const redraw = MA.debounce(() => { if (!V) return; drawLib(); drawSide(); refreshDrawer(); }, 80);
    MA.onView('media', redraw);
    MA.onView('content:change', ({ path = '' } = {}) => { if (!path || /^(media|seo|text)(\/|$)/.test(path)) redraw(); });

    MA.keys.bindView('j', () => step(1), () => t('k.next'));
    MA.keys.bindView('k', () => step(-1), () => t('k.prev'));
    MA.keys.bindView('/', () => { V?.search.focus(); V?.search.select(); }, () => t('k.search'));
    MA.keys.bindView('v', () => setView(S.view === 'grid' ? 'list' : 'grid'), () => t('k.view'));
    if (can()) MA.keys.bindView('u', pickAndUpload, () => t('k.upload'));

    if (ctx.sub[0]) setTimeout(() => V && openDrawer(ctx.sub[0]), 0);
    const slot = ctx.query.get('slot'); if (slot) setTimeout(() => flashSlot(slot), 250);
  }

  function setView(v) { S.view = v; MA.db.set('media.view', v); V?.viewSeg.set(v); drawLib(); }
  async function pickAndUpload() { if (!can()) return; const files = await MA.pickFile({ accept: 'image/*', multiple: true }); if (files.length) uploadThenShow(files); }
  async function uploadThenShow(files) {
    const ids = await ingest(files);
    if (ids.length && V) { if (S.f !== 'all' && S.f !== 'uploads') { S.f = 'all'; MA.setQuery({ f: '' }); } S.cursor = ids[0]; drawLib(); }
  }

  function drawTabs(all) {
    V.tabs.innerHTML = '';
    V.tabs.append(MA.ui.tabs(FILTERS.map(f => ({ value: f, label: t('f.' + f), count: MA.num(all.filter(it => pass(it, f)).length) })), S.f, v => { S.f = v; MA.setQuery({ f: v === 'all' ? '' : v }); drawLib(); }));
  }
  function drawLib() {
    if (!V) return;
    const all = allItems();
    drawTabs(all);
    const list = V.list = visible(all);
    V.body.innerHTML = '';
    probeSite(all, onProbe);
    if (!list.length) {
      if (S.q) V.body.append(MA.ui.empty({ title: esc(t('emptyFilter')), text: esc(t('noMatch', { q: S.q })), icon: 'search', compact: true, actions: [MA.ui.btn(t('clear'), { kind: 'ghost', onclick: () => { V.search.value = ''; S.q = ''; MA.setQuery({ q: '' }); drawLib(); } })] }));
      else if (S.f === 'uploads') V.body.append(MA.ui.empty({ title: esc(t('emptyUploads')), text: esc(t('emptyUploadsText')), pose: 'present', compact: true, actions: can() ? [MA.ui.btn(t('upload'), { icon: 'upload', kind: 'primary', onclick: pickAndUpload })] : [] }));
      else if (S.f === 'noalt') V.body.append(MA.ui.empty({ title: esc(t('emptyAlt')), text: esc(t('emptyAltText')), pose: 'arrive', compact: true }));
      else V.body.append(MA.ui.empty({ title: esc(t('emptyFilter')), text: esc(t('emptyFilterText')), icon: 'filter', compact: true }));
    } else V.body.append(S.view === 'list' ? drawTable(list) : drawGrid(list));
    const ups = all.filter(i => i.kind === 'upload');
    V.foot.innerHTML = '';
    const foot = [t('footSite', { n: all.length - ups.length }), t('footUp', { n: ups.length })];
    if (ups.length) foot.push(t('footBytes', { bytes: fmtBytes(ups.reduce((s, i) => s + (i.size || 0), 0)) }), t('storeNote'));
    V.foot.append(h('span', foot.join(' · ')));
    markCursor();
  }
  const onProbe = MA.debounce((id, failed) => { if (!V) return; if (failed) drawLib(); else refreshMeta(); }, 120);
  function refreshMeta() {
    if (!V) return;
    const byId = new Map(allItems().map(it => [it.id, it]));
    V.body.querySelectorAll('[data-id]').forEach(el => {
      const it = byId.get(el.dataset.id); if (!it) return;
      const m = el.querySelector('.md-meta'); if (m && !el.matches(':hover')) m.innerHTML = metaLine(it);
      const s = el.querySelector('.md-c-size'); if (s) s.innerHTML = sizeHtml(it);
      const d = el.querySelector('.md-c-dims'); if (d) d.textContent = fmtDims(it.w, it.h);
    });
  }
  const sizeHtml = it => it.size ? `<span class="num${it.size > HEAVY ? ' warn' : ''}">${esc(fmtBytes(it.size))}</span>` : '';
  function metaLine(it) {
    const bits = [];
    if (it.kind === 'film') bits.push(esc(t('frames', { n: it.n })));
    if (it.kind === 'upload') bits.push(esc(t('kind.upload')));
    if (it.w) bits.push(`<span class="num" dir="ltr">${esc(fmtDims(it.w, it.h))}</span>`);
    if (it.size) bits.push(sizeHtml(it));
    if (it.missing) bits.push(`<span class="bad">${esc(t('missing'))}</span>`);
    return bits.join(' · ');
  }
  const usedLabel = it => t('usedN', { n: it.uses.length });
  function flags(it) {
    const box = h('span.md-flags');
    if (missingAlt(it)) box.append(h('span.md-flag.noalt', { title: t('alt.' + altState(it)) }, MA.frag(MA.icon('warn', 'sm')), h('span', t('noAlt'))));
    return box;
  }
  /** One line under the name: where the image is used ("Case 00 background +1"), or "Not used". */
  function useLine(it) {
    if (!it.uses.length) return h('span.md-use-line.is-unused.tiny', t('f.unused'));
    return h('span.md-use-line.tiny', { title: it.uses.map(u => u.label).join(' · ') }, MA.ui.tideMark('live'), h('span.truncate', it.uses[0].label), it.uses.length > 1 ? h('span.md-more.num', '+' + MA.num(it.uses.length - 1)) : null);
  }
  function drawGrid(list) {
    const grid = h('div.md-grid');
    for (const it of list) {
      const th = thumb(it);
      if (it.kind === 'film') th.append(h('span.md-scrub', { 'aria-hidden': 'true' }));
      const tile = h('button.md-tile', { type: 'button', dataset: { id: it.id }, 'aria-label': `${it.name}${it.uses.length ? ' · ' + usedLabel(it) : ''}`, onclick: () => go(it.id), onfocus: () => { S.cursor = it.id; markCursor(); } },
        th, flags(it),
        h('span.md-cap', h('span.md-name.truncate', it.name), h('span.md-meta.tiny.faint', { html: metaLine(it) }), useLine(it)));
      if (it.kind === 'film') { tile.classList.add('is-film'); bindScrub(tile, it); }
      if (it.missing) tile.classList.add('is-missing');
      grid.append(tile);
    }
    return grid;
  }
  function altCell(it) { const st = altState(it); return h('span', { class: 'badge ' + (st === 'ok' ? 'good' : st === 'deco' ? '' : 'warn') }, t('alt.' + st)); }
  function drawTable(list) {
    const tb = h('tbody');
    for (const it of list) {
      tb.append(h('tr', { dataset: { id: it.id, href: '1' }, tabindex: '0', onclick: () => go(it.id), onkeydown: e => { if (e.key === 'Enter') go(it.id); }, onfocus: () => { S.cursor = it.id; markCursor(); } },
        h('td', h('div.md-c-name', thumb(it, { cls: 'sm' }), h('div.grow', h('div.truncate.md-name', it.name), h('div.tiny.faint.truncate', h('span.mono.ltr', it.kind === 'upload' ? it.path : it.kind === 'film' ? it.dir : it.path))))),
        h('td.shrink.small.muted', it.kind === 'film' ? t('frames', { n: it.n }) : typeLabel(it.type)),
        h('td.shrink.small', h('span.num.md-c-dims', { dir: 'ltr' }, fmtDims(it.w, it.h))),
        h('td.shrink.small.md-c-size', { html: sizeHtml(it) }),
        h('td.small.md-c-uses', it.uses.length ? h('span.truncate', it.uses.map(u => u.label).join(', ')) : h('span.faint', t('f.unused'))),
        h('td.shrink', altCell(it))));
    }
    return h('div.table-wrap.md-table', h('table.table', h('thead', h('tr', ['name', 'type', 'dims', 'size', 'used', 'alt'].map(c => h('th', t('col.' + c))))), tb));
  }
  function markCursor() { if (V) V.body.querySelectorAll('[data-id]').forEach(el => el.classList.toggle('is-cursor', el.dataset.id === S.cursor)); }
  function step(d) {
    if (!V?.list?.length) return;
    const ids = V.list.map(i => i.id), i = ids.indexOf(S.cursor);
    S.cursor = ids[i < 0 ? (d > 0 ? 0 : ids.length - 1) : MA.clamp(i + d, 0, ids.length - 1)];
    const el = V.body.querySelector(`[data-id="${CSS.escape(S.cursor)}"]`);
    el?.focus({ preventScroll: true }); el?.scrollIntoView({ block: 'nearest' });
    markCursor();
  }
  const hashFor = id => { const q = MA.ctx().query; q.delete('slot'); const qs = q.toString(); return '#/media' + (id ? '/' + encodeURIComponent(id) : '') + (qs ? '?' + qs : ''); };
  const go = id => MA.go(hashFor(id));

  /* ---------- slots panel ---------- */
  function drawSide() {
    if (!V) return;
    const side = V.side; side.innerHTML = '';
    const all = allItems(), tg = targets();
    const box = h('div.card.md-slots', h('div.md-slots-head', h('h2.h3', t('slots')), h('p.small.muted', t('slotsSub'))));
    // slots that point at uploads this browser doesn't have (a restored version, a draft from another browser)
    if (unresolved(draft()).some(u => u.why === 'gone')) box.append(h('div.callout.bad.md-gone', MA.frag(MA.icon('warn')), h('div.grow', h('b', t('goneHead')), h('p.small', t('goneText')))));
    for (const [g, title, sub] of [['slots', null, null], ['seo', t('sharing'), null]]) {
      const rows = tg.filter(x => x.group === g); if (!rows.length) continue;
      if (title) box.append(h('div.md-slot-group', h('span.label', title), sub ? h('span.tiny.faint', sub) : null));
      const list = h('div.md-slot-list'); rows.forEach(x => list.append(slotRow(x, all))); box.append(list);
    }
    side.append(box);
  }
  function slotRow(x, all) {
    const v = MA.content.get(x.path) || '', it = v ? all.find(i => i.value === v || i.path === v) : null;
    const mm = MEDIA_RE.exec(v), gone = !!mm && !getUpload(mm[1]);
    const custom = MA.content.isCustom(x.path), changed = MA.content.isChanged(x.path);
    const th = gone ? h('span.md-thumb.sm.is-empty.is-gone', { html: MA.icon('warn') }) : it ? thumb(it, { cls: 'sm' }) : v ? thumb({ src: url(v), matte: 'checker' }, { cls: 'sm' }) : h('span.md-thumb.sm.is-empty', { html: MA.icon('image') });
    const state = gone ? h('span.md-slot-state.tiny.is-bad', t('gone'))
      : h('span', { class: 'md-slot-state tiny' + (changed ? ' changed' : '') }, changed ? MA.ui.tideMark('edited') : null, changed ? t('unpub') : custom ? t('isCustom') : v ? t('isDefault') : t('notSet'));
    const tools = h('div.md-slot-tools');
    if (canContent()) {
      tools.append(MA.ui.btn(v && !gone ? t('change') : t('choose'), { size: 'sm', onclick: async () => { const r = await picker({ title: x.label, value: gone ? undefined : v }); if (r) setRef(x.path, r, x.label); } }));
      if (custom) tools.append(MA.ui.iconBtn('undo', { tip: t('resetSlot'), size: 'sm', onclick: () => resetRef(x.path, x.label) }));
    }
    if (x.key) tools.append(MA.ui.iconBtn('eye', { tip: t('showPrev'), size: 'sm', onclick: () => previewSlot(x.key) }));
    else if (x.href) tools.append(MA.ui.iconBtn('arrowRight', { tip: MA.t('open'), size: 'sm', onclick: () => MA.go(x.href) }));
    const pic = it ? h('button.md-slot-pic', { type: 'button', 'aria-label': `${t('openImage')}: ${it.name}`, onclick: () => go(it.id) }, th) : h('span.md-slot-pic', th);
    const off = sectionOff(x.section) ? h('div.tiny.md-slot-off', MA.frag(MA.icon('eyeOff', 'sm')), h('span', t('secOff', { section: MA.content.groupName(x.section) }))) : null;
    return h('div.md-slot', { class: gone ? 'is-gone' : null, dataset: { path: x.path } }, pic,
      h('div.md-slot-main', h('b.md-slot-name.truncate', x.label), x.desc ? h('div.tiny.faint.md-slot-desc', x.desc) : null, off,
        h('div.md-slot-file', h('span.tiny.muted.truncate', gone ? '' : it ? it.name : v || '—'), state)),
      tools);
  }
  function flashSlot(key) {
    const row = V?.side.querySelector(`.md-slot[data-path="${CSS.escape('media/' + key)}"]`) || V?.side.querySelector(`.md-slot[data-path="${CSS.escape(key)}"]`); if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: MA.reducedMotion() ? 'auto' : 'smooth' }); row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
  }

  /* ================= detail drawer ================= */
  function openDrawer(id) {
    const it = findItem(id); if (!it) { MA.go(hashFor(null), { replace: true }); return; }
    S.open = it.id; S.cursor = it.id; markCursor();
    if (S.drawer) { S.drawer.it = it; fillDrawer(); return; }
    const L = MA.ui.drawer({
      title: esc(it.name), width: 560, render: () => {}, foot: () => {},
      onClose: () => { S.drawer = null; S.open = null; stopPlay(); const c = MA.ctx(); if (V && c.id === 'media' && c.sub.length) MA.go(hashFor(null), { replace: true }); },
    });
    L.el.classList.add('md-drawer');
    S.drawer = L; L.it = it;
    fillDrawer();
  }
  function closeDrawer() { const L = S.drawer; S.drawer = null; S.open = null; stopPlay(); L?.close(true); }
  function refreshDrawer() {
    if (!S.drawer) return;
    const it = findItem(S.open); if (!it) { closeDrawer(); MA.go(hashFor(null), { replace: true }); return; }
    S.drawer.it = it;
    const act = document.activeElement;
    if (S.drawer.el.contains(act) && act.matches('input,textarea,[contenteditable=true],.md-focal')) { drawUses(); return; } // never redraw under the cursor
    fillDrawer();
  }
  let playTimer = 0;
  const stopPlay = () => { clearInterval(playTimer); playTimer = 0; };

  function fillDrawer() {
    const L = S.drawer; if (!L) return; const it = L.it;
    stopPlay();
    L.el.querySelector('.drawer-head .h3').textContent = it.name;
    const b = L.body, keepScroll = b.scrollTop; b.innerHTML = ''; b.classList.add('md-dr');
    // preview with a background switch (logos are light-on-transparent, Mira PNGs too)
    const matte = it.kind === 'film' ? 'none' : S.matte[it.id] || (it.matte === 'none' ? 'checker' : it.matte);
    const pv = h('div', { class: 'md-pv matte-' + matte });
    const img = it.src ? h('img', { src: it.src, alt: it.kind === 'upload' ? (it.alt?.[MA.siteLang()] || '') : '', draggable: false }) : h('span.md-thumb-ph', { html: MA.icon('image', 'lg') });
    // uploads carry a focal point: what crops keep in frame
    const fx = it.kind === 'upload' && !!it.src;
    const pic = fx ? h('span.md-pv-img', img) : img;
    pv.append(pic);
    const focal = fx ? focalUI(it, pic, img) : null;
    const mSeg = MA.ui.seg(['checker', 'light', 'dark'].map(v => ({ value: v, label: t('matte.' + v) })), matte, v => { S.matte[it.id] = v; pv.className = 'md-pv matte-' + v; }, { size: 'sm', label: t('matte') });
    // a film is opaque frames: no background switch
    b.append(h('div.md-pv-wrap', pv, it.kind === 'film' ? null : h('div.md-pv-tools', focal?.hint || null, h('span.grow'), focal?.reset || null, mSeg)));
    if (it.kind === 'film') b.append(filmControls(it, img));
    if (it.missing) b.append(h('div.callout.bad', MA.frag(MA.icon('warn')), h('span', t('missingText', { path: it.path }))));

    // name, badges, actions
    const head = h('div.md-dr-head');
    if (it.kind === 'upload' && can()) {
      const nameInp = h('input.input.md-name-input', { value: it.name, 'aria-label': t('name'), maxLength: 120 });
      const commit = () => {
        const v = nameInp.value.trim(); if (!v || v === it.name) { nameInp.value = it.name; return; }
        const m = getUpload(it.id); if (!m) return; const next = { ...m, name: v }; next.file = fileFor(next, uploads());
        patchUpload(it.id, next); MA.toast(t('renamed', { name: esc(v) }), { undo: () => patchUpload(it.id, m) });
      };
      nameInp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nameInp.blur(); } });
      nameInp.addEventListener('change', commit);
      head.append(MA.ui.field(esc(t('name')), nameInp));
    }
    head.append(h('div.row.wrap.md-dr-badges',
      MA.ui.badge(t(it.kind === 'upload' ? 'kind.upload' : it.kind === 'film' ? 'kind.film' : 'kind.site'), it.kind === 'upload' ? 'accent' : 'outline'),
      it.uses.length ? MA.ui.badge(usedLabel(it), 'good') : MA.ui.badge(t('f.unused')),
      missingAlt(it) ? MA.ui.badge(t('alt.' + altState(it)), 'warn') : null));
    b.append(head, actionRow(it));
    // weight warnings
    const compressBtn = () => (it.kind === 'upload' && can() && COMPRESSIBLE.test(it.type) ? MA.ui.btn(t('compress'), { size: 'sm', onclick: () => compressUpload(it.id) }) : null);
    if (it.size > HEAVY) b.append(h('div.callout.warn.md-heavy', MA.frag(MA.icon('warn')), h('span.grow', t('heavy', { max: fmtBytes(HEAVY) })), compressBtn()));
    else if (it.size > OG_HEAVY && it.uses.some(u => u.kind === 'seo')) b.append(h('div.callout.warn.md-heavy', MA.frag(MA.icon('warn')), h('span.grow', t('ogHeavy', { max: fmtBytes(OG_HEAVY) })), compressBtn()));
    // the sharing image wants 1.91:1: offer the crop that fixes it (starting at the focal point)
    if (it.w && it.h && it.uses.some(u => u.kind === 'seo') && Math.abs(it.w / it.h - 1.91) > .12) {
      b.append(h('div.callout.warn.md-ogratio', MA.frag(MA.icon('warn')), h('span.grow', t('ogRatio')),
        can() && canContent() ? MA.ui.btn(t('ogCrop'), { size: 'sm', onclick: () => cropItem(it, { ratio: '1.91:1', apply: 'seo/ogImage' }) }) : null));
    }
    b.append(L.blockedBox = h('div.md-blocked', { hidden: true }));
    // used in
    b.append(h('div.section-title', h('span.label', t('usedIn'))), L.usesBox = h('div.md-uses-list'));
    drawUses();
    // alt text
    if (it.kind !== 'film') b.append(h('div.section-title', h('span.label', t('alt'))), altSection(it));
    // details
    const kv = h('dl.kv.md-kv');
    const row = (k, v) => { if (v == null || v === '') return; kv.append(h('dt', k), h('dd', v)); };
    row(t('type'), it.kind === 'film' ? `${t('frames', { n: it.n })} · JPEG / AVIF` : typeLabel(it.type));
    row(t('dims'), it.w ? h('span.num', { dir: 'ltr' }, fmtDims(it.w, it.h)) : '');
    row(t('size'), it.size ? h('span', { html: sizeHtml(it) }) : '');
    if (it.at) row(t('added'), MA.date(it.at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
    row(it.kind === 'upload' ? t('pubPath') : t('path'), h('code.mono.tiny.ltr.md-path', it.kind === 'film' ? `${it.dir}f0001.jpg … f${pad4(it.n)}.jpg` : it.path));
    b.append(h('div.section-title', h('span.label', t('details'))), kv);
    if (it.kind === 'upload' && (can() || it.tags.length)) b.append(h('div.section-title', h('span.label', t('tags'))), tagEditor(it));
    b.scrollTop = keepScroll;

    // foot: step through the current list
    const f = L.foot; f.innerHTML = ''; f.classList.add('md-dr-foot');
    const list = V?.list || [], i = list.findIndex(x => x.id === it.id);
    // native append writes "null" for a missing node: filter first
    f.append(...[MA.ui.iconBtn(MA.isRTL() ? 'chevRight' : 'chevLeft', { tip: t('prev'), onclick: () => i > 0 && go(list[i - 1].id) }),
      MA.ui.iconBtn(MA.isRTL() ? 'chevLeft' : 'chevRight', { tip: t('next'), onclick: () => i >= 0 && i < list.length - 1 && go(list[i + 1].id) }),
      i >= 0 ? h('span.tiny.faint.num', t('pos', { i: MA.num(i + 1), n: MA.num(list.length) })) : null, h('span.grow'),
      MA.ui.btn(MA.t('done'), { onclick: () => L.close() })].filter(Boolean));
  }
  function drawUses() {
    const L = S.drawer; if (!L?.usesBox) return; const it = L.it, box = L.usesBox; box.innerHTML = '';
    // saved versions that still use an upload keep it (they need the file to be restored)
    const held = it.kind === 'upload' ? heldBy(it.id) : [], hist = historyTitle();
    const heldRow = held.length ? h('div.md-held', MA.frag(MA.icon('history', 'sm')), h('span.grow.small.muted', t('heldN', { n: held.length })),
      hist ? MA.ui.btn(t('openPage', { page: hist }), { size: 'sm', kind: 'ghost', onclick: () => MA.go('#/history') }) : null) : null;
    if (!it.uses.length) { box.append(...[h('p.small.faint', t('usedNone')), heldRow].filter(Boolean)); return; }
    for (const u of it.uses) {
      const tools = h('span.md-use-tools');
      if (u.kind === 'fixed') tools.append(h('span.badge.outline', { title: t('fixedTip') }, t('fixed')));
      if (u.kind === 'slot') tools.append(MA.ui.iconBtn('eye', { tip: t('showPrev'), size: 'sm', onclick: () => previewSlot(u.key) }));
      else if (u.section) tools.append(MA.ui.iconBtn('eye', { tip: t('showPrev'), size: 'sm', onclick: () => showInPreview(u.section) }));
      if (u.kind !== 'fixed' && canContent()) tools.append(MA.ui.iconBtn('edit', { tip: t('change'), size: 'sm', onclick: async () => { const r = await picker({ title: u.label, value: MA.content.get(u.path) }); if (r) setRef(u.path, r, u.label); } }));
      if (u.href) tools.append(MA.ui.iconBtn('arrowRight', { tip: MA.t('open'), size: 'sm', onclick: () => MA.go(u.href) }));
      box.append(h('div.md-use', h('span.md-use-ic', { html: MA.icon(u.kind === 'fixed' ? 'code' : u.kind === 'seo' ? 'globe' : 'image', 'sm') }), h('span.grow.small', u.label), tools));
    }
    if (heldRow) box.append(heldRow);
  }
  const historyTitle = () => { const m = MA.modules().find(x => x.id === 'history'); return m ? MA.L(m.title) : ''; };
  function actionRow(it) {
    const row = h('div.btn-row.md-actions');
    if (it.value && !it.missing && canContent()) row.append(MA.ui.btn(t('useAs'), { size: 'sm', icon: 'layers', onclick: e => MA.ui.menu(e.currentTarget, targets().map(x => ({ label: x.label, icon: x.group === 'seo' ? 'globe' : 'image', checked: MA.content.get(x.path) === it.value ? true : null, run: () => setRef(x.path, it.value, x.label) }))) }));
    if (it.kind !== 'film') row.append(MA.ui.btn(t('copyPath'), { size: 'sm', icon: 'copy', onclick: () => MA.copy(it.path, it.kind === 'upload' ? t('copiedUp') : undefined) }));
    if (it.kind === 'upload') row.append(MA.ui.btn(t('download'), { size: 'sm', icon: 'download', onclick: () => { const bl = blobs.get(it.id); if (bl) MA.download(withExt(it.name, it.type), bl); } }));
    else if (it.kind === 'site' && !it.missing) row.append(h('a.btn.sm', { href: it.src, download: it.name, html: MA.icon('download') + `<span>${esc(t('download'))}</span>` }));
    else if (it.kind === 'film') row.append(MA.ui.btn(t('downloadFrame'), { size: 'sm', icon: 'download', onclick: () => { const src = S.drawer?.body.querySelector('.md-pv img')?.getAttribute('src') || it.src; const a = h('a', { href: src, download: src.split('/').pop() }); document.body.append(a); a.click(); a.remove(); } }));
    if (can() && it.kind !== 'film' && !it.missing && it.src && it.w) row.append(MA.ui.btn(t('crop'), { size: 'sm', icon: 'grid', onclick: () => cropItem(it) }));
    if (can() && it.kind === 'upload') {
      row.append(MA.ui.btn(t('replace'), { size: 'sm', icon: 'refresh', onclick: async () => { const [f] = await MA.pickFile({ accept: 'image/*' }); if (f) replaceUpload(it.id, f); } }));
      row.append(MA.ui.btn(MA.t('delete'), { size: 'sm', icon: 'trash', kind: 'ghost danger', onclick: () => tryDelete(it) }));
    } else if (can() && canContent() && it.kind === 'site' && it.uses.some(u => u.kind !== 'fixed')) {
      row.append(MA.ui.btn(t('replaceSite'), { size: 'sm', icon: 'refresh', onclick: () => swapSite(it) }));
    }
    return row;
  }
  function tryDelete(it) {
    const m = getUpload(it.id); if (!m) return;
    const uses = usagesOf(uploadItem(m)), held = heldBy(it.id);
    if (!uses.length && !held.length) { if (deleteUpload(it.id)) { closeDrawer(); MA.go(hashFor(null), { replace: true }); } return; }
    const box = S.drawer?.blockedBox;
    if (box) {
      box.hidden = false; box.innerHTML = '';
      const parts = [];
      if (uses.length) parts.push(h('b', t('blockedTitle')), h('p.small', t('blocked')),
        h('ul.md-blocked-list', uses.map(u => h('li', h('span.grow', u.label), canContent() ? MA.ui.btn(t('change'), { size: 'sm', kind: 'ghost', onclick: async () => { const r = await picker({ title: u.label, value: it.value }); if (r && r !== it.value) setRef(u.path, r, u.label); } }) : null))));
      if (held.length) {
        const hist = historyTitle(), shown = held.slice(0, 3);
        parts.push(h('b', { class: uses.length ? 'md-held-title' : null }, t('heldTitle')), h('p.small', t('held')),
          h('ul.md-blocked-list', shown.map(u => h('li', h('span.grow', u.label))), held.length > shown.length ? h('li.faint', t('heldMore', { n: held.length - shown.length })) : null),
          hist ? h('div.btn-row', MA.ui.btn(t('openPage', { page: hist }), { size: 'sm', kind: 'ghost', onclick: () => MA.go('#/history') })) : null);
      }
      box.append(h('div.callout.bad', MA.frag(MA.icon('lock')), h('div.grow', ...parts)));
      box.scrollIntoView({ block: 'nearest', behavior: MA.reducedMotion() ? 'auto' : 'smooth' });
    }
    MA.toast(t('blockedToast', { name: esc(it.name), where: esc(listFmt([...uses, ...held].slice(0, 3).map(u => u.label))) }), { tone: 'bad' });
  }
  /** "Replace" for a site file: upload a new image and point every content slot that used this file at it. */
  async function swapSite(it) {
    const uses = (it.uses || []).filter(u => u.kind !== 'fixed');
    if (!uses.length) { MA.toast(t('replaceNone')); return; }
    const files = await MA.pickFile({ accept: 'image/*' }); if (!files.length) return;
    const [id] = await ingest(files.slice(0, 1)); if (!id) return;
    const before = uses.map(u => [u.path, MA.content.get(u.path)]);
    uses.forEach(u => MA.content.set(u.path, 'media:' + id, { coalesce: false, label: MA.content.label(u.path) }));
    MA.toast(t('replacedSite', { name: esc(it.name), next: esc(getUpload(id)?.name || ''), n: uses.length }), { undo: () => before.forEach(([p, v]) => MA.content.set(p, v, { coalesce: false })) });
    go(id);
  }
  function altSection(it) {
    const box = h('div.md-alt');
    if (it.kind === 'upload') {
      const ro = !can();
      const mk = l => {
        const inp = h('textarea.textarea.md-alt-inp', { rows: 2, dir: l === 'ar' ? 'rtl' : 'ltr', lang: l, placeholder: t(l === 'ar' ? 'altPhAr' : 'altPhEn'), readOnly: ro, 'aria-label': `${t('alt')} (${l.toUpperCase()})` });
        inp.value = it.alt?.[l] || ''; inp.disabled = !!it.decorative;
        inp.addEventListener('input', MA.debounce(() => { const m = getUpload(it.id); if (m) patchUpload(it.id, { alt: { ...(m.alt || {}), [l]: inp.value } }); }, 250));
        return h('div.cf-lang', h('span.lang-tag', l === 'ar' ? 'AR' : 'EN'), inp);
      };
      const grid = h('div.cf-langs.md-alt-langs', mk('en'), mk('ar'));
      const sw = MA.ui.switch(it.decorative, v => { patchUpload(it.id, { decorative: v }); grid.querySelectorAll('textarea').forEach(x => (x.disabled = v)); }, esc(t('decorative')), { disabled: ro });
      box.append(h('p.small.faint', t('altHint')), grid, h('div.md-deco', sw, h('p.tiny.faint', t('decorativeHint'))), h('p.tiny.faint.md-alt-note', MA.frag(MA.icon('info', 'sm')), h('span', t('altLocal'))));
      return box;
    }
    if (it.altKey && MA.content.def(`text/en/${it.altKey}`) !== undefined) {
      box.append(h('p.small.faint', t('altSite')), MA.form.bi(`text/{lang}/${it.altKey}`, { label: t('alt'), kind: 'textarea' }));
      return box;
    }
    box.append(h('p.small.muted', t(it.altKind === 'logo' ? 'altLogo' : 'altDeco')));
    return box;
  }
  function tagEditor(it) {
    const wrap = h('div.md-tags');
    const draw = () => {
      wrap.innerHTML = '';
      const tags = getUpload(it.id)?.tags || [];
      tags.forEach(tag => wrap.append(h('span.tag', tag, can() ? h('button', { type: 'button', 'aria-label': t('removeTag', { tag }), html: MA.icon('close', 'sm'), onclick: () => { patchUpload(it.id, { tags: tags.filter(x => x !== tag) }); draw(); } }) : null)));
      if (can()) {
        const inp = h('input.input.sm.md-tag-inp', { placeholder: t('tagsPh'), 'aria-label': t('tags'), maxLength: 40 });
        inp.addEventListener('keydown', e => {
          if (e.key !== 'Enter' && e.key !== ',') return; e.preventDefault();
          const v = inp.value.trim().replace(/,$/, ''); if (!v || tags.includes(v)) { inp.value = ''; return; }
          patchUpload(it.id, { tags: [...tags, v] }); draw(); wrap.querySelector('input')?.focus();
        });
        wrap.append(inp);
      }
    };
    draw(); return wrap;
  }
  function filmControls(it, img) {
    let i = 0;
    const lbl = h('span.tiny.faint.num.md-film-lbl', t('frame', { i: MA.num(1), n: MA.num(it.n) }));
    const range = h('input', { type: 'range', min: 0, max: it.n - 1, value: 0, 'aria-label': t('scrub'), dir: MA.isRTL() ? 'rtl' : 'ltr' });
    const show = k => { i = k; img.src = '../' + it.dir + 'f' + pad4(k + 1) + '.jpg'; range.value = k; lbl.textContent = t('frame', { i: MA.num(k + 1), n: MA.num(it.n) }); };
    const setBtn = playing => { playBtn.innerHTML = MA.icon(playing ? 'pause' : 'play'); playBtn.setAttribute('aria-label', t(playing ? 'pause' : 'play')); playBtn.dataset.tip = t(playing ? 'pause' : 'play'); };
    range.addEventListener('input', () => { stopPlay(); setBtn(false); show(+range.value); });
    const playBtn = MA.ui.iconBtn('play', { tip: t('play'), size: 'sm', onclick: () => {
      if (playTimer) { stopPlay(); setBtn(false); return; }
      setBtn(true); playTimer = setInterval(() => show((i + 1) % it.n), MA.reducedMotion() ? 250 : 1000 / 24);
    } });
    return h('div.md-film', h('div.row', playBtn, range, lbl), h('p.tiny.faint', t('filmNote')));
  }

  /* ================= focal point (uploads): what a crop keeps in frame ================= */
  /** The marker on the drawer preview. Click the picture to place it; when it has focus, arrows move it (⇧ bigger steps), Home centres it. */
  function focalUI(it, wrap, img) {
    let f = focalOf(getUpload(it.id));
    const dot = h('button.md-focal', { type: 'button', disabled: !can() }, h('span.md-focal-dot', { 'aria-hidden': 'true' }));
    const place = () => { dot.style.left = f.x * 100 + '%'; dot.style.top = f.y * 100 + '%'; dot.setAttribute('aria-label', t('focalAt', { x: MA.pct(f.x), y: MA.pct(f.y) })); }; // image coordinates: physical, not mirrored in RTL
    const save = MA.debounce(() => { if (getUpload(it.id)) patchUpload(it.id, { focal: { x: +f.x.toFixed(3), y: +f.y.toFixed(3) } }); }, 250);
    const set = (x, y) => { f = { x: MA.clamp(x, 0, 1), y: MA.clamp(y, 0, 1) }; place(); save(); };
    place(); wrap.append(dot);
    if (!can()) return null;
    img.classList.add('is-focal');
    img.addEventListener('click', e => { const r = img.getBoundingClientRect(); if (!r.width || !r.height) return; dot.focus({ preventScroll: true }); set((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
    dot.addEventListener('keydown', e => {
      const st = e.shiftKey ? .1 : .02, mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
      if (mv) { e.preventDefault(); e.stopPropagation(); set(f.x + mv[0], f.y + mv[1]); } else if (e.key === 'Home') { e.preventDefault(); set(.5, .5); }
    });
    const reset = MA.ui.iconBtn('target', { tip: t('focalReset'), size: 'sm', onclick: () => set(.5, .5) });
    return { hint: h('p.tiny.faint.md-focal-hint', t('focalHint')), reset };
  }

  /* ================= crop: saves a new upload, the original stays ================= */
  async function sourceBlob(it) {
    if (it.kind === 'upload') return blobs.get(it.id) || (await MA.idb.get('files', it.id).catch(() => null));
    try { const r = await fetch(it.src); return r.ok ? await r.blob() : null; } catch (e) { return null; }
  }
  const outType = type => (/^image\/(jpeg|png|webp)$/.test(type) ? type : 'image/png');
  /** Store a new upload from a blob (crops). → its metadata */
  async function addUpload(blob, { name, w, h: hh, alt, decorative, from } = {}) {
    const id = MA.uid('m');
    await MA.idb.put('files', id, blob);
    const list = uploads();
    const m = { id, name: withExt(name, blob.type), file: '', type: blob.type, size: blob.size, w, h: hh, alt: { en: alt?.en || '', ar: alt?.ar || '' }, decorative: !!decorative, tags: [], at: new Date().toISOString() };
    if (from) m.from = from;
    m.file = fileFor(m, list);
    setBlob(id, blob); saveUploads([...list, m]);
    return m;
  }
  function removeUpload(id) { setBlob(id, null); saveUploads(uploads().filter(x => x.id !== id)); MA.idb.del('files', id).catch(() => {}); }
  /** The crop dialog: shape presets, a crop area (drag, or arrow keys) that starts around the focal point, and a size slider. */
  function cropDialog(it, { ratio = '1:1', apply = null } = {}) {
    return new Promise(res => {
      const W = it.w, H = it.h; let shape = RATIOS[ratio] ? ratio : '1:1', scale = 1, done = false;
      const f = it.kind === 'upload' ? focalOf(getUpload(it.id)) : { x: .5, y: .5 };
      let r = cropRect(W, H, shape, f, scale);
      const hintId = MA.uid('mdc');
      const rect = h('div.md-crop-rect', { tabindex: '0', role: 'group', 'aria-label': t('crop.area'), 'aria-describedby': hintId });
      const fdot = h('span.md-crop-focal', { 'aria-hidden': 'true', style: { left: f.x * 100 + '%', top: f.y * 100 + '%' } });
      const box = h('div.md-crop-box', { style: { aspectRatio: `${W} / ${H}`, width: `min(100%, calc(min(52vh, 440px) * ${W / H}))` } }, h('img', { src: it.src, alt: '', draggable: false }), fdot, rect);
      const out = h('p.small.muted.md-crop-out', { 'aria-live': 'polite' });
      const size = h('input.md-crop-range', { type: 'range', min: 20, max: 100, step: 1, value: 100 });
      const place = () => {
        Object.assign(rect.style, { left: r.x / W * 100 + '%', top: r.y / H * 100 + '%', width: r.w / W * 100 + '%', height: r.h / H * 100 + '%' }); // image coordinates
        const k = Math.min(1, MAX_SIDE / Math.max(r.w, r.h));
        out.textContent = t('crop.out', { dims: '\u2066' + fmtDims(Math.max(1, Math.round(r.w * k)), Math.max(1, Math.round(r.h * k))) + '\u2069' }); // "W × H" stays in order in RTL
      };
      const centre = () => ({ x: (r.x + r.w / 2) / W, y: (r.y + r.h / 2) / H });
      const reshape = () => { r = cropRect(W, H, shape, centre(), scale); place(); };
      const seg = MA.ui.seg(Object.keys(RATIOS).map(k => ({ value: k, label: `${t('crop.r.' + k)} ${ratioText(k)}` })), shape, v => { shape = v; reshape(); }, { size: 'sm', label: t('crop.shape') });
      size.addEventListener('input', () => { scale = +size.value / 100; reshape(); });
      let drag = null;
      rect.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); rect.setPointerCapture?.(e.pointerId); rect.focus({ preventScroll: true }); drag = { x: e.clientX, y: e.clientY, r: { ...r }, k: W / (box.clientWidth || W) }; rect.classList.add('is-drag'); });
      rect.addEventListener('pointermove', e => { if (!drag) return; r.x = MA.clamp(drag.r.x + (e.clientX - drag.x) * drag.k, 0, W - r.w); r.y = MA.clamp(drag.r.y + (e.clientY - drag.y) * drag.k, 0, H - r.h); place(); });
      const end = () => { drag = null; rect.classList.remove('is-drag'); };
      rect.addEventListener('pointerup', end); rect.addEventListener('pointercancel', end);
      rect.addEventListener('keydown', e => {
        const st = e.shiftKey ? .1 : .01, mv = { ArrowLeft: [-st * W, 0], ArrowRight: [st * W, 0], ArrowUp: [0, -st * H], ArrowDown: [0, st * H] }[e.key];
        if (!mv) return; e.preventDefault(); e.stopPropagation();
        r.x = MA.clamp(r.x + mv[0], 0, W - r.w); r.y = MA.clamp(r.y + mv[1], 0, H - r.h); place();
      });
      const pick = () => ({ rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.max(1, Math.round(r.w)), h: Math.max(1, Math.round(r.h)) }, shape });
      const L = MA.ui.modal({
        title: esc(t('crop.title', { name: it.name })), size: 'wide',
        body: h('div.md-crop', h('div.row.wrap.md-crop-bar', h('span.small.muted', t('crop.shape')), seg),
          h('div.md-crop-stage', box), h('p.tiny.faint.md-crop-hint', { id: hintId }, t('crop.areaHint')),
          h('div.md-crop-size', MA.ui.field(esc(t('crop.size')), size)), out),
        onClose: () => { if (!done) { done = true; res(null); } },
        initial: () => rect,
        actions: [
          { label: MA.t('cancel'), kind: 'ghost', run: () => { done = true; res(null); } },
          { label: apply ? t('crop.saveUse', { slot: pathLabel(apply) }) : t('crop.save'), kind: 'primary', run: () => { done = true; res(pick()); } },
        ],
      });
      L.el.classList.add('md-modal', 'md-cropper');
      place();
    });
  }
  /** Crop an image into a new upload. opts.apply: a content path to point at the crop (e.g. 'seo/ogImage'). → 'media:<id>' | null */
  async function cropItem(it, { ratio, apply } = {}) {
    if (!can() || !it?.src || it.kind === 'film') return null;
    if (!it.w || !it.h) { const b = await sourceBlob(it); const d = b ? await readDims(b).catch(() => null) : null; if (!d?.w) { MA.toast(t('crop.fail'), { tone: 'bad' }); return null; } it = { ...it, w: d.w, h: d.h }; }
    const pick = await cropDialog(it, { ratio: ratio || (apply === 'seo/ogImage' ? '1.91:1' : '1:1'), apply });
    if (!pick) return null;
    let made;
    try {
      const src = await sourceBlob(it); if (!src) throw new Error('source');
      const im = await loadImg(src), kx = (im.naturalWidth || it.w) / it.w, ky = (im.naturalHeight || it.h) / it.h;
      const { x, y, w, h: hh } = pick.rect, k = Math.min(1, MAX_SIDE / Math.max(w, hh)), ow = Math.max(1, Math.round(w * k)), oh = Math.max(1, Math.round(hh * k));
      const cv = document.createElement('canvas'); cv.width = ow; cv.height = oh;
      const ctx = cv.getContext('2d'), type = outType(it.type);
      if (type === 'image/jpeg') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, ow, oh); }
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, x * kx, y * ky, w * kx, hh * ky, 0, 0, ow, oh);
      const blob = await new Promise(r2 => cv.toBlob(r2, type, type === 'image/png' ? undefined : .9));
      if (!blob) throw new Error('encode');
      made = await addUpload(blob, { name: `${String(it.name || 'image').replace(/\.[^.]+$/, '')} (${pick.shape})`, w: ow, h: oh, alt: it.alt, decorative: it.decorative, from: it.value || it.path });
    } catch (e) { MA.toast(t('crop.fail'), { tone: 'bad' }); return null; }
    MA.activity.log({ action: 'media.upload', target: made.name, module: 'media', href: '#/media/' + encodeURIComponent(made.id) });
    const v = 'media:' + made.id;
    if (apply && canContent()) setRef(apply, v, pathLabel(apply)); // that toast's undo puts the slot back
    else MA.toast(esc(t('crop.saved', { ratio: ratioText(pick.shape), name: it.name })), { undo: () => { if (!usageIndex().has(v) && !heldBy(made.id).length) removeUpload(made.id); } });
    if (V && MA.ctx().id === 'media') go(made.id);
    return v;
  }

  /* ================= picker (used here, by SEO, Services…) ================= */
  function picker({ title, hint, value } = {}) {
    return new Promise(res => {
      let chosen = null, done = false, f = 'all', q = '';
      const finish = v => { if (done) return; done = true; res(v); };
      const grid = h('div.md-grid.md-pick-grid', { role: 'listbox', 'aria-label': title || t('pick.title') });
      const choose = (v, el) => { chosen = v; grid.querySelectorAll('.md-tile').forEach(x => x.setAttribute('aria-selected', String(x === el))); const b = L.el.querySelector('.modal-foot .btn.primary'); if (b) b.disabled = !chosen; };
      const draw = focusId => {
        grid.innerHTML = '';
        const items = allItems().filter(it => it.value && !it.missing && (f === 'all' || (f === 'uploads' ? it.kind === 'upload' : it.kind !== 'upload')) && matchQ(it, q));
        probeSite(items, () => {});
        if (!items.length) { grid.append(h('p.small.faint.md-pick-empty', q ? t('noMatch', { q }) : t('emptyUploadsText'))); return; }
        for (const it of items) {
          const cur = value && (it.value === value || it.path === value);
          const tile = h('button.md-tile', { type: 'button', role: 'option', 'aria-selected': String(it.value === chosen), dataset: { v: it.value }, 'aria-label': it.name,
            onclick: e => choose(it.value, e.currentTarget), ondblclick: () => { chosen = it.value; finish(it.value); L.close(true); } },
          thumb(it), cur ? h('span.md-flags', h('span.md-flag.used', t('pick.current'))) : null, h('span.md-cap', h('span.md-name.truncate', it.name), h('span.md-meta.tiny.faint', { html: metaLine(it) })));
          grid.append(tile);
          if (focusId && it.value === 'media:' + focusId) { choose(it.value, tile); setTimeout(() => tile.focus(), 30); }
        }
      };
      const search = h('input.input.sm', { type: 'search', placeholder: t('search'), 'aria-label': t('search') });
      search.addEventListener('input', () => { q = search.value.trim(); draw(); });
      const seg = MA.ui.seg([{ value: 'all', label: t('f.all') }, { value: 'uploads', label: t('f.uploads') }, { value: 'site', label: t('f.site') }], f, v => { f = v; draw(); }, { size: 'sm' });
      const up = can() ? MA.ui.btn(t('upload'), { size: 'sm', icon: 'upload', onclick: async () => { const files = await MA.pickFile({ accept: 'image/*', multiple: true }); const ids = await ingest(files); if (ids.length) { f = 'all'; seg.set('all'); draw(ids[0]); } } }) : null;
      const body = h('div.md-pick', h('div.md-pick-bar', h('div.search.md-pick-search', MA.frag(MA.icon('search', 'sm')), search), seg, h('span.grow'), up), hint ? h('p.small.faint', hint) : null, grid, h('p.tiny.faint', t('pick.hint')));
      const L = MA.ui.modal({ title: esc(title || t('pick.title')), size: 'xwide', body, onClose: () => finish(null),
        actions: [{ label: MA.t('cancel'), kind: 'ghost', run: () => finish(null) }, { label: t('pick.use'), kind: 'primary', disabled: true, run: () => { if (!chosen) return false; finish(chosen); } }] });
      L.el.classList.add('md-modal', 'md-picker');
      // drop files onto the picker to upload and select them
      const wrap = L.el.parentElement, isFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
      wrap.addEventListener('dragover', e => { if (!isFiles(e)) return; e.preventDefault(); e.stopPropagation(); L.el.classList.add('is-over'); });
      wrap.addEventListener('dragleave', e => { if (!wrap.contains(e.relatedTarget)) L.el.classList.remove('is-over'); });
      wrap.addEventListener('drop', async e => { if (!isFiles(e)) return; e.preventDefault(); e.stopPropagation(); L.el.classList.remove('is-over'); const ids = await ingest([...e.dataTransfer.files]); if (ids.length) { f = 'all'; seg.set('all'); draw(ids[0]); } });
      grid.addEventListener('keydown', e => {
        const tiles = [...grid.querySelectorAll('.md-tile')], i = tiles.indexOf(document.activeElement); if (i < 0) return;
        const cols = Math.max(1, Math.round(grid.clientWidth / (tiles[0].offsetWidth || 1))), rtl = MA.isRTL();
        const mv = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
        if (mv) { e.preventDefault(); const n = tiles[MA.clamp(i + mv, 0, tiles.length - 1)]; n.focus(); choose(n.dataset.v, n); }
        if (e.key === 'Enter' && chosen) { e.preventDefault(); finish(chosen); L.close(true); }
      });
      draw();
      scanSite().then(() => { if (!done) draw(); });
      ready.then(() => { if (done) return; draw(); if (value) { const cur = grid.querySelector(`.md-tile[data-v="${CSS.escape(value)}"]`); if (cur) { choose(value, cur); cur.scrollIntoView({ block: 'nearest' }); } } });
    });
  }

  /* ================= public API (defined at load) ================= */
  MA.media = {
    /** Resolves once uploaded blobs are loaded from IndexedDB (url() and referenced() return blobs after this). */
    ready,
    /** Every library item: [{id, kind:'upload'|'site'|'film', value, name, path, type, w, h, size, alt, decorative, tags, uses:[{kind, label, path}]}] */
    list: () => allItems().map(it => ({ ...it, uses: it.uses.map(u => ({ kind: u.kind, label: u.label, path: u.path || null })) })),
    /** One item by upload id, 'media:<id>' or site path. */
    get: id => { const m = MEDIA_RE.exec(String(id || '')); return findItem(m ? m[1] : id); },
    url,
    picker,
    /**
     * Uploads referenced as 'media:<id>' anywhere in a content snapshot or publish payload (media/<slot>, seo/ogImage…),
     * with their blobs and the path publishing gives them. Only uploads this browser knows: see unresolved() for the rest.
     * An SVG that hasn't been cleaned yet comes back with blob: null, so a folder publish refuses it.
     */
    referenced(src) {
      const out = new Map(), list = uploads();
      eachString(src ?? MA.content.draft ?? {}, s => { const m = MEDIA_RE.exec(s); if (!m || out.has(m[1])) return; const u = list.find(x => x.id === m[1]); if (u) out.set(u.id, { id: u.id, name: u.name, type: u.type, blob: u.type === SVG && !u.safe ? null : blobs.get(u.id) || null, targetPath: 'assets/uploads/' + u.file }); });
      return [...out.values()];
    },
    /**
     * Deep copy with every 'media:<id>' replaced by the path that upload will have once published. Never returns 'media:':
     * an upload this browser doesn't have becomes the site's default for that place (what the live site would show anyway).
     */
    rewrite(payload) {
      const list = uploads();
      return mapStringsAt(MA.clone(payload), (s, p) => { const m = MEDIA_RE.exec(s); if (!m) return s; const u = list.find(x => x.id === m[1]); return u ? 'assets/uploads/' + u.file : fallbackFor(contentPath(p)); });
    },
    /**
     * 'media:<id>' values a publish can't deliver. Call it on the publish payload (or the draft) before publishing and block
     * while it isn't empty. → [{ id, ref, path, at, label, name, why: 'gone'|'noBlob'|'unsafe' }]. Accurate once `ready` has resolved.
     */
    unresolved: src => unresolved(src),
    /** The same, after waiting for the uploads to load (and re-checking IndexedDB for files not in memory yet). → Promise<[…]> */
    async check(src) {
      await Promise.race([ready, new Promise(r => setTimeout(r, 2500))]);
      const list = unresolved(src);
      for (const u of list.filter(x => x.why === 'noBlob')) { try { const b = await MA.idb.get('files', u.id); if (b) setBlob(u.id, b); } catch (e) {} }
      return unresolved(src);
    },
    /** One line for a problem from unresolved(): "Image missing in Brief sent: choose another image or reset it to the default." */
    problemText: u => t('unresolved', { slot: u?.label || pathLabel(u?.path || '') }),
    /** Saved versions, the published content and scheduled changes that still use an upload ('media:<id>' or the id). → [{kind:'version'|'live'|'schedule', id?, label, href}] */
    held: v => { const m = MEDIA_RE.exec(String(v || '')); return heldBy(m ? m[1] : String(v || '')); },
    /** Open the crop dialog for an image (upload, 'media:<id>' or site path). opts: { ratio: '1:1'|'4:5'|'16:9'|'1.91:1', apply: content path to point at the crop }. → Promise<'media:<id>' | null> */
    async crop(v, opts = {}) { await ready; await scanSite().catch(() => {}); const m = MEDIA_RE.exec(String(v || '')); const it = findItem(m ? m[1] : byFile(v)?.id || v); return it ? cropItem(it, opts) : null; },
    /** An upload's focal point { x, y } (0–1, from the top-left; centre when none is set). */
    focal: v => { const m = MEDIA_RE.exec(String(v || '')); return focalOf(m ? getUpload(m[1]) : byFile(v)); },
    /** The crop a shape would take from a w×h image around a focal point: cropRect(w, h, '1.91:1', {x, y}, scale?) → { x, y, w, h } in pixels. */
    cropRect,
    RATIOS: Object.keys(RATIOS),
    /** Clean SVG markup (allow-listed elements, no scripts, handlers or links out). → { text, changed } | null */
    sanitizeSvg,
    /** Add image files (the same flow as dropping them on the Media page). Resolves to the new upload ids. */
    add: files => ingest(files),
    /** Where an image is used: [{kind:'slot'|'seo'|'fixed', label, path}] */
    usages: v => { const m = MEDIA_RE.exec(String(v || '')); return findItem(m ? m[1] : v)?.uses || []; },
  };

  /* ================= module ================= */
  MA.commands.add({ id: 'media-upload', title: { en: 'Upload images', ar: 'رفع صور', fa: 'بارگذاری تصویر' }, icon: 'upload', keywords: 'media image upload photo picture صورة تصویر', when: () => can(),
    run: () => { MA.go('#/media'); setTimeout(pickAndUpload, 250); } });
  MA.commands.add({ id: 'media-noalt', title: { en: 'Find images missing alt text', ar: 'اعثر على الصور التي تنقصها نصوص بديلة', fa: 'پیدا کردن تصویرهای بدون متن جایگزین' }, icon: 'image', keywords: 'alt accessibility a11y media',
    run: () => MA.go('#/media?f=noalt') });
  MA.commands.add({ id: 'media-slots', title: { en: 'Change site images', ar: 'تغيير صور الموقع', fa: 'تغییر تصویرهای سایت' }, icon: 'image', keywords: 'slots background mira photo og image',
    run: () => MA.go('#/media') });

  MA.module({
    id: 'media', group: 'site', order: 70, icon: 'image', shortcut: 'g m',
    title: TITLE,
    keywords: 'images photos uploads library slots alt صور تصاویر',
    render(view, ctx) { render(view, ctx); },
    update(ctx) {
      if (!V?.root?.isConnected) return false;
      const id = ctx.sub[0] || null;
      if (id && id !== S.open) openDrawer(id);
      else if (!id && S.open) closeDrawer();
      const fq = ctx.query.get('f') || 'all'; if (FILTERS.includes(fq) && fq !== S.f) { S.f = fq; drawLib(); }
      const slot = ctx.query.get('slot'); if (slot) setTimeout(() => flashSlot(slot), 60);
      return true;
    },
    crumbs(ctx) { const it = ctx.sub[0] && findItem(ctx.sub[0]); return it ? [{ label: it.name, href: '#/media/' + encodeURIComponent(it.id) }] : []; },
    search(q) {
      const out = [], ql = q.toLowerCase();
      for (const it of allItems()) if (matchQ(it, ql)) out.push({ title: it.name, sub: it.uses.length ? it.uses.map(u => u.label).join(', ') : t('f.unused'), icon: 'image', run: () => MA.go('#/media/' + encodeURIComponent(it.id)) });
      for (const x of targets()) if (x.label.toLowerCase().includes(ql)) out.push({ title: x.label, sub: t('slots'), icon: 'image', run: () => MA.go('#/media?slot=' + encodeURIComponent(x.path.startsWith('media/') ? x.path.slice(6) : x.path)) });
      return out.slice(0, 12);
    },
    destroy() { stopPlay(); S.drawer = null; S.open = null; V = null; },
  });
})();
