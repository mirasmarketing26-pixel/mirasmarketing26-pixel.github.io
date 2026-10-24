/* =====================================================================
   MIRAS admin — Publish & history (module "history")
   Defined at load, because the shell calls them before this page is ever opened:
     MA.publish.open()       the three-step publish flow (Review → Where → Confirm) used by the top-bar button and ⇧⌘P
     MA.publish.autosave(f)  'auto' version at most every 10 minutes while the draft changes (registered globally)
     MA.publish.diff(a, b)   word-level diff element between two full contents (reused by Compare)
   The page (#/history) has three tabs: Versions | Activity | Live status (?tab=activity|live), plus draft tools.
   Publishing: images that can't be found block it; the file is dry-run in a hidden ?cms=export frame (miras:check) first;
   'now' or 'at' a Qatar time (content.js `schedule`); a folder publish can also write robots.txt, sitemap.xml and the
   SEO tags in index.html (<!-- miras:head --> block, index.previous.html kept) and back admin data up to a private folder.
   After a publish the draft equals what went out, without an undo step (uploads point at their site files).
   Storage it owns (MA.db): 'history.autoAt' (last autosave time), 'history.lastPublish' ({at, method, folder, uploads, schedule}),
   'history.pubOpts' ({files, head, backup}: the folder-publish switches).
   IndexedDB store 'handles': key 'site' (the site folder) and 'backup' (the private backup folder).
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA, ID = 'history', h = MA.h, ui = MA.ui, esc = MA.esc;
  const TITLE = { en: 'Publish & history', ar: 'النشر والسجل', fa: 'انتشار و تاریخچه' };
  const C = () => MA.content;
  const AUTO_MS = 10 * 60e3, AUTO_FIRST_MS = 60e3, AUTO_KEEP = 30;

  /* ================= strings (en · ar · fa) ================= */
  const S = {
    pageTitle: ['Publish &amp; <em>history</em>', 'النشر <em>والسجل</em>', 'انتشار و <em>تاریخچه</em>'],
    lead: ['Every publish, checkpoint and autosave made in this browser. Restoring an older version always saves your current draft first.', 'كل عملية نشر ونقطة استرجاع وحفظ تلقائي جرت في هذا المتصفح. عند استعادة نسخة سابقة تُحفظ مسودتك الحالية أولاً.', 'هر انتشار، نقطهٔ بازگشت و ذخیرهٔ خودکاری که در این مرورگر انجام شده است. پیش از بازگرداندن هر نسخهٔ قدیمی، پیش‌نویس فعلی‌تان ذخیره می‌شود.'],
    tabVersions: ['Versions', 'النسخ', 'نسخه‌ها'], tabActivity: ['Activity', 'النشاط', 'فعالیت‌ها'], tabLive: ['Live status', 'حالة الموقع', 'وضعیت سایت'],
    checkpoint: ['Save a checkpoint', 'حفظ نقطة استرجاع', 'ذخیرهٔ نقطهٔ بازگشت'], publishDots: ['Publish…', 'نشر…', 'انتشار…'], review: ['Review changes', 'مراجعة التعديلات', 'بررسی تغییرها'],
    nChanges: [{ one: '1 unpublished change', other: '{n} unpublished changes' },
      { one: 'تعديل واحد غير منشور', two: 'تعديلان غير منشورين', few: '{n} تعديلات غير منشورة', many: '{n} تعديلاً غير منشور', other: '{n} تعديل غير منشور' },
      { one: 'یک تغییر منتشرنشده', other: '{n} تغییر منتشرنشده' }],
    clean: ['The draft matches the last publish', 'المسودة مطابقة لآخر نشر', 'پیش‌نویس با آخرین انتشار یکی است'], cleanNever: ['No unpublished changes', 'لا تعديلات غير منشورة', 'تغییر منتشرنشده‌ای نیست'],
    lastPub: ['Last published {when} by {by}', 'آخر نشر {when} بواسطة {by}', 'آخرین انتشار {when} توسط {by}'],
    neverPub: ['Nothing published from this browser yet', 'لم يُنشر شيء من هذا المتصفح بعد', 'هنوز چیزی از این مرورگر منتشر نشده است'],
    isLive: ['live on the site', 'ظاهر على الموقع', 'روی سایت فعال است'], waiting: ['waiting for upload', 'بانتظار الرفع', 'در انتظار بارگذاری'],
    // kinds
    k_publish: ['Published', 'نُشر', 'منتشر شد'], k_checkpoint: ['Checkpoint', 'نقطة استرجاع', 'نقطهٔ بازگشت'], k_auto: ['Autosave', 'حفظ تلقائي', 'ذخیرهٔ خودکار'], k_import: ['Imported', 'استيراد', 'وارد شد'],
    autos: [{ one: '1 autosave by {who}', other: '{n} autosaves by {who}' },
      { one: 'حفظ تلقائي واحد بواسطة {who}', two: 'حفظان تلقائيان بواسطة {who}', few: '{n} عمليات حفظ تلقائي بواسطة {who}', many: '{n} عملية حفظ تلقائي بواسطة {who}', other: '{n} عملية حفظ تلقائي بواسطة {who}' },
      { other: '{n} ذخیرهٔ خودکار توسط {who}' }],
    changes: [{ one: '1 change', other: '{n} changes' },
      { one: 'تعديل واحد', two: 'تعديلان', few: '{n} تعديلات', many: '{n} تعديلاً', other: '{n} تعديل' },
      { one: 'یک تغییر', other: '{n} تغییر' }],
    changeNone: ['No changes', 'بلا تعديلات', 'بدون تغییر'],
    aPreview: ['Preview', 'معاينة', 'پیش‌نمایش'], aCompare: ['Compare with draft', 'قارن بالمسودة', 'مقایسه با پیش‌نویس'], aRestore: ['Restore as draft', 'استعِدها كمسودة', 'بازگرداندن به‌عنوان پیش‌نویس'],
    aDownload: ['Download as content.js', 'نزّلها كملف content.js', 'دانلود به‌صورت content.js'], aDelete: ['Delete checkpoint', 'حذف نقطة الاسترجاع', 'حذف نقطهٔ بازگشت'], aNote: ['Edit note', 'تعديل الملاحظة', 'ویرایش یادداشت'],
    restored: ['Restored {name} as the draft. Your previous draft is kept as an autosave.', 'استُعيدت {name} كمسودة، وحُفظت مسودتك السابقة تلقائياً.', '{name} به‌عنوان پیش‌نویس بازگردانده شد. پیش‌نویس قبلی‌تان به‌صورت خودکار ذخیره شد.'],
    deletedV: ['Checkpoint deleted.', 'حُذفت نقطة الاسترجاع.', 'نقطهٔ بازگشت حذف شد.'], notePrompt: ['Note for this version', 'ملاحظة لهذه النسخة', 'یادداشت این نسخه'],
    emptyVT: ['Nothing published yet', 'لم يُنشر شيء بعد', 'هنوز چیزی منتشر نشده'],
    emptyVX: ['Your first publish becomes v1. Checkpoints and autosaves you make along the way show up here too.', 'أول عملية نشر تصبح النسخة v1، وتظهر هنا أيضاً نقاط الاسترجاع وعمليات الحفظ التلقائي.', 'نخستین انتشار شما نسخهٔ v1 می‌شود. نقطه‌های بازگشت و ذخیره‌های خودکار هم اینجا نمایش داده می‌شوند.'],
    previewOf: ['Preview · {name}', 'معاينة · {name}', 'پیش‌نمایش · {name}'],
    previewNote: ['You’re looking at {name}, not your draft. Edits made elsewhere won’t change this preview.', 'أنت تشاهد {name} وليس مسودتك. التعديلات التي تجريها في مكان آخر لا تغيّر هذه المعاينة.', 'این {name} است، نه پیش‌نویس شما. ویرایش‌هایی که جای دیگر انجام می‌دهید این پیش‌نمایش را تغییر نمی‌دهد.'],
    cmpTitle: ['Compare: {pair}', 'مقارنة: {pair}', 'مقایسه: {pair}'], draftName: ['Draft', 'المسودة', 'پیش‌نویس'], liveName: ['Live site', 'الموقع المنشور', 'سایت منتشرشده'],
    same: ['They match. Nothing differs.', 'متطابقتان، ولا فرق بينهما.', 'یکسان‌اند و هیچ تفاوتی ندارند.'],
    cmpSummary: [{ one: '1 difference', other: '{n} differences' }, { one: 'فرق واحد', two: 'فرقان', few: '{n} فروق', many: '{n} فرقاً', other: '{n} فرق' }, { one: 'یک تفاوت', other: '{n} تفاوت' }],
    // draft card
    draftT: ['Draft', 'المسودة', 'پیش‌نویس'], draftSub: ['Unpublished edits, kept in this browser', 'تعديلات غير منشورة محفوظة في هذا المتصفح', 'ویرایش‌های منتشرنشده که در همین مرورگر نگه داشته می‌شوند'],
    unpub: ['unpublished', 'غير منشورة', 'منتشرنشده'], cmpLive: ['Compare with live', 'قارن بالموقع المنشور', 'مقایسه با سایت منتشرشده'], tools: ['Draft tools', 'أدوات المسودة', 'ابزارهای پیش‌نویس'],
    exportD: ['Export draft (JSON)', 'تصدير المسودة (JSON)', 'خروجی پیش‌نویس (JSON)'], importD: ['Import JSON…', 'استيراد JSON…', 'وارد کردن JSON…'], discardAll: ['Discard all unpublished changes', 'تجاهل كل التعديلات غير المنشورة', 'کنار گذاشتن همهٔ تغییرهای منتشرنشده'],
    autoNote: ['Autosaves at most every {n} minutes while you edit.', 'يُحفظ تلقائياً مرة كل {n} دقائق على الأكثر أثناء التعديل.', 'هنگام ویرایش، حداکثر هر {n} دقیقه یک بار خودکار ذخیره می‌شود.'],
    lastAuto: ['Last autosave {when}.', 'آخر حفظ تلقائي {when}.', 'آخرین ذخیرهٔ خودکار {when}.'],
    importHint: ['Import takes a draft exported here or an assets/content.js file. Your current draft is saved first.', 'يقبل الاستيراد مسودة صُدّرت من هنا أو ملف assets/content.js، وتُحفظ مسودتك الحالية أولاً.', 'می‌توانید پیش‌نویسی را که از همین‌جا گرفته‌اید یا فایل assets/content.js را وارد کنید. پیش‌نویس فعلی‌تان اول ذخیره می‌شود.'],
    discarded: [{ one: 'Discarded 1 unpublished change.', other: 'Discarded {n} unpublished changes.' },
      { one: 'جرى تجاهل تعديل واحد غير منشور.', two: 'جرى تجاهل تعديلين غير منشورين.', few: 'جرى تجاهل {n} تعديلات غير منشورة.', many: 'جرى تجاهل {n} تعديلاً غير منشور.', other: 'جرى تجاهل {n} تعديل غير منشور.' },
      { one: 'یک تغییر منتشرنشده کنار گذاشته شد.', other: '{n} تغییر منتشرنشده کنار گذاشته شد.' }],
    nothingDiscard: ['Nothing to discard. The draft matches the last publish.', 'لا شيء لتجاهله، فالمسودة مطابقة لآخر نشر.', 'چیزی برای کنار گذاشتن نیست. پیش‌نویس با آخرین انتشار یکی است.'],
    exported: ['Draft saved as {name}.', 'حُفظت المسودة باسم {name}.', 'پیش‌نویس با نام {name} ذخیره شد.'],
    imported: ['Imported {name}. Your previous draft is kept as an autosave.', 'استُورد {name}، وحُفظت مسودتك السابقة تلقائياً.', '{name} وارد شد. پیش‌نویس قبلی‌تان به‌صورت خودکار ذخیره شد.'],
    impBadT: ['This file isn’t MIRAS content', 'هذا الملف ليس محتوى ميراس', 'این فایل محتوای میراس نیست'],
    impNotJson: ['It isn’t valid JSON, and it isn’t an assets/content.js file.', 'ليس JSON صالحاً، وليس ملف assets/content.js.', 'نه JSON معتبر است و نه فایل assets/content.js.'],
    impNotObj: ['It doesn’t hold a content object.', 'لا يحتوي على كائن محتوى.', 'شیء محتوایی در آن نیست.'],
    impSchema: ['It describes “{schema}”, not MIRAS site content.', 'يصف «{schema}» وليس محتوى موقع ميراس.', 'دربارهٔ «{schema}» است، نه محتوای سایت میراس.'],
    impNoKeys: ['None of the expected parts (text, swells, questions, SEO…) are in it.', 'لا يحتوي على أي من الأجزاء المتوقعة (النصوص، الموجات، الأسئلة، الظهور…).', 'هیچ‌کدام از بخش‌های مورد انتظار (متن‌ها، موج‌ها، پرسش‌ها، سئو…) در آن نیست.'],
    impShape: ['“{key}” has the wrong shape.', 'الجزء «{key}» بشكل غير صحيح.', 'بخش «{key}» ساختار درستی ندارد.'], impRead: ['Couldn’t read the file.', 'تعذّرت قراءة الملف.', 'خواندن فایل ممکن نشد.'],
    beforeRestore: ['Before restoring {name}', 'قبل استعادة {name}', 'پیش از بازگرداندن {name}'], beforeImport: ['Before importing {name}', 'قبل استيراد {name}', 'پیش از وارد کردن {name}'],
    beforeDiscard: ['Before discarding changes', 'قبل تجاهل التعديلات', 'پیش از کنار گذاشتن تغییرها'], liveBefore: ['Live before this publish', 'المنشور قبل هذا النشر', 'نسخهٔ منتشرشده پیش از این انتشار'],
    // publish flow
    pubTitle: ['Publish changes', 'نشر التعديلات', 'انتشار تغییرها'], stReview: ['Review', 'المراجعة', 'بررسی'], stWhere: ['Where', 'الوجهة', 'مقصد'], stConfirm: ['Confirm', 'التأكيد', 'تأیید'],
    next: ['Next', 'التالي', 'بعدی'], stepOf: ['Step {n} of {m}', 'الخطوة {n} من {m}', 'گام {n} از {m}'],
    reviewLead: [{ one: '1 change since the last publish.', other: '{n} changes since the last publish. Discard any you don’t want to go live.' },
      { one: 'تعديل واحد منذ آخر نشر.', two: 'تعديلان منذ آخر نشر. تجاهل ما لا تريد نشره.', few: '{n} تعديلات منذ آخر نشر. تجاهل ما لا تريد نشره.', many: '{n} تعديلاً منذ آخر نشر. تجاهل ما لا تريد نشره.', other: '{n} تعديل منذ آخر نشر. تجاهل ما لا تريد نشره.' },
      { one: 'یک تغییر از آخرین انتشار.', other: '{n} تغییر از آخرین انتشار. هر کدام را که نمی‌خواهید منتشر شود کنار بگذارید.' }],
    discardOne: ['Discard this change', 'تجاهل هذا التعديل', 'کنار گذاشتن این تغییر'], discardedOne: ['Discarded: {what}', 'تم تجاهل: {what}', 'کنار گذاشته شد: {what}'],
    pubEmptyT: ['Nothing to publish', 'لا شيء للنشر', 'چیزی برای انتشار نیست'],
    pubEmptyX: ['Your draft matches what was last published. Edit the site copy, then come back.', 'مسودتك مطابقة لآخر ما نُشر. عدّل نصوص الموقع ثم عد إلى هنا.', 'پیش‌نویس شما با آخرین انتشار یکی است. متن‌های سایت را ویرایش کنید و دوباره برگردید.'],
    showMore: [{ one: 'Show 1 more', other: 'Show {n} more' }, { one: 'عرض تعديل آخر', two: 'عرض تعديلين آخرين', few: 'عرض {n} تعديلات أخرى', many: 'عرض {n} تعديلاً آخر', other: 'عرض {n} تعديل آخر' }, { other: 'نمایش {n} مورد دیگر' }],
    vShown: ['Shown', 'ظاهر', 'نمایان'], vHidden: ['Hidden', 'مخفي', 'پنهان'], vEmpty: ['(empty)', '(فارغ)', '(خالی)'],
    vItems: [{ one: '1 item', other: '{n} items' }, { zero: 'لا عناصر', one: 'عنصر واحد', two: 'عنصران', few: '{n} عناصر', many: '{n} عنصراً', other: '{n} عنصر' }, { one: 'یک مورد', other: '{n} مورد' }],
    vAdded: ['Added', 'أُضيف', 'افزوده شد'], vRemoved: ['Removed', 'أُزيل', 'حذف شد'], vReordered: ['Order changed', 'تغيّر الترتيب', 'ترتیب تغییر کرد'],
    wFolder: ['Write to the site folder', 'الكتابة في مجلد الموقع', 'نوشتن در پوشهٔ سایت'],
    wFolderSub: ['Saves assets/content.js straight into the site folder on this computer. The old file is kept as content.previous.js.', 'يحفظ assets/content.js مباشرة في مجلد الموقع على هذا الجهاز، ويُحتفظ بالملف القديم باسم content.previous.js.', 'فایل assets/content.js را مستقیم در پوشهٔ سایت روی همین رایانه ذخیره می‌کند. فایل قبلی با نام content.previous.js نگه داشته می‌شود.'],
    wDownload: ['Download content.js', 'تنزيل content.js', 'دانلود content.js'],
    wDownloadSub: ['Then upload it to the site’s assets folder, replacing the old file.', 'ثم ارفعه إلى مجلد assets في الموقع مكان الملف القديم.', 'سپس آن را به‌جای فایل قبلی در پوشهٔ assets سایت بارگذاری کنید.'],
    wCopy: ['Copy the file contents', 'نسخ محتوى الملف', 'کپی محتوای فایل'],
    wCopySub: ['Paste them into assets/content.js yourself, replacing everything in it.', 'الصقه بنفسك في assets/content.js مكان كل ما فيه.', 'خودتان آن را به‌جای همهٔ محتوای assets/content.js بچسبانید.'],
    noFsT: ['This browser can’t write to folders', 'هذا المتصفح لا يستطيع الكتابة في المجلدات', 'این مرورگر نمی‌تواند در پوشه‌ها بنویسد'],
    noFsX: ['Publishing straight into the site folder needs Chrome or Edge on a computer. Download the file instead and upload it with the site.', 'النشر مباشرة في مجلد الموقع يحتاج إلى Chrome أو Edge على جهاز كمبيوتر. نزّل الملف بدلاً من ذلك وارفعه مع الموقع.', 'انتشار مستقیم در پوشهٔ سایت به Chrome یا Edge روی رایانه نیاز دارد. به‌جای آن فایل را دانلود کنید و همراه سایت بارگذاری کنید.'],
    chooseFolder: ['Choose the site folder…', 'اختر مجلد الموقع…', 'انتخاب پوشهٔ سایت…'], changeFolder: ['Change folder', 'تغيير المجلد', 'تغییر پوشه'],
    folderOk: ['index.html and assets/ found', 'وُجد index.html ومجلد assets', 'index.html و پوشهٔ assets پیدا شد'],
    folderAsk: ['The browser asks for permission when you publish', 'سيطلب المتصفح الإذن عند النشر', 'مرورگر هنگام انتشار اجازه می‌خواهد'], folderNone: ['No folder chosen yet.', 'لم يُختر مجلد بعد.', 'هنوز پوشه‌ای انتخاب نشده.'],
    badFolder: ['That folder doesn’t look like the MIRAS site. It needs index.html and an assets folder.', 'لا يبدو هذا المجلد مجلد موقع ميراس، إذ يجب أن يحتوي على index.html ومجلد assets.', 'این پوشه به پوشهٔ سایت میراس شبیه نیست. باید index.html و پوشهٔ assets داشته باشد.'],
    noteL: ['Note (optional)', 'ملاحظة (اختيارية)', 'یادداشت (اختیاری)'], notePh: ['What changed, in a few words', 'ما الذي تغيّر، بكلمات قليلة', 'چه چیزی تغییر کرد، در چند کلمه'],
    upFolder: [{ one: '1 uploaded image goes with this publish. It’s written to assets/uploads/.', other: '{n} uploaded images go with this publish. They’re written to assets/uploads/.' },
      { one: 'ترافق هذا النشر صورة مرفوعة واحدة، وتُكتب في assets/uploads/.', two: 'ترافق هذا النشر صورتان مرفوعتان، وتُكتبان في assets/uploads/.', few: 'ترافق هذا النشر {n} صور مرفوعة، وتُكتب في assets/uploads/.', many: 'ترافق هذا النشر {n} صورةً مرفوعة، وتُكتب في assets/uploads/.', other: 'ترافق هذا النشر {n} صورة مرفوعة، وتُكتب في assets/uploads/.' },
      { one: 'یک تصویر بارگذاری‌شده همراه این انتشار است و در assets/uploads/ نوشته می‌شود.', other: '{n} تصویر بارگذاری‌شده همراه این انتشار است و در assets/uploads/ نوشته می‌شود.' }],
    upManual: [{ one: '1 uploaded image goes with this publish. Upload it to assets/uploads/ along with content.js.', other: '{n} uploaded images go with this publish. Upload them to assets/uploads/ along with content.js.' },
      { one: 'ترافق هذا النشر صورة مرفوعة واحدة. ارفعها إلى assets/uploads/ مع content.js.', two: 'ترافق هذا النشر صورتان مرفوعتان. ارفعهما إلى assets/uploads/ مع content.js.', few: 'ترافق هذا النشر {n} صور مرفوعة. ارفعها إلى assets/uploads/ مع content.js.', many: 'ترافق هذا النشر {n} صورةً مرفوعة. ارفعها إلى assets/uploads/ مع content.js.', other: 'ترافق هذا النشر {n} صورة مرفوعة. ارفعها إلى assets/uploads/ مع content.js.' },
      { one: 'یک تصویر بارگذاری‌شده همراه این انتشار است. آن را همراه content.js در assets/uploads/ بارگذاری کنید.', other: '{n} تصویر بارگذاری‌شده همراه این انتشار است. آن‌ها را همراه content.js در assets/uploads/ بارگذاری کنید.' }],
    conf: [{ one: '1 change in {areas} will be published.', other: '{n} changes across {areas} will be published.' },
      { one: 'سيُنشر تعديل واحد في {areas}.', two: 'سيُنشر تعديلان في {areas}.', few: 'ستُنشر {n} تعديلات في {areas}.', many: 'سيُنشر {n} تعديلاً في {areas}.', other: 'سيُنشر {n} تعديل في {areas}.' },
      { one: 'یک تغییر در {areas} منتشر می‌شود.', other: '{n} تغییر در {areas} منتشر می‌شود.' }],
    confKeep: ['The current version stays in history.', 'وتبقى النسخة الحالية في السجل.', 'نسخهٔ فعلی در تاریخچه می‌ماند.'],
    andMore: [{ one: '1 more', other: '{n} more' }, { one: 'واحد آخر', two: 'اثنان آخران', few: '{n} أخرى', many: '{n} أخرى', other: '{n} أخرى' }, { other: '{n} مورد دیگر' }],
    dest: ['Destination', 'الوجهة', 'مقصد'], noteK: ['Note', 'الملاحظة', 'یادداشت'], files: ['Files', 'الملفات', 'فایل‌ها'],
    backupNote: ['Before writing, the current assets/content.js is copied to assets/content.previous.js.', 'قبل الكتابة يُنسخ assets/content.js الحالي إلى assets/content.previous.js.', 'پیش از نوشتن، فایل فعلی assets/content.js در assets/content.previous.js کپی می‌شود.'],
    btnFolder: ['Publish to the site folder', 'انشر في مجلد الموقع', 'انتشار در پوشهٔ سایت'], btnDownload: ['Publish and download', 'انشر ونزّل الملف', 'انتشار و دانلود'], btnCopy: ['Publish and copy', 'انشر وانسخ الملف', 'انتشار و کپی'],
    working: ['Publishing…', 'جارٍ النشر…', 'در حال انتشار…'],
    errPerm: ['The browser didn’t allow writing to that folder. Choose it again and allow editing.', 'لم يسمح المتصفح بالكتابة في هذا المجلد. اختره مجدداً واسمح بالتعديل.', 'مرورگر اجازهٔ نوشتن در این پوشه را نداد. دوباره آن را انتخاب کنید و اجازهٔ ویرایش بدهید.'],
    errWrite: ['Couldn’t write the files: {msg}', 'تعذّرت كتابة الملفات: {msg}', 'نوشتن فایل‌ها ممکن نشد: {msg}'],
    errMissing: ['{name} is no longer stored in this browser, so it can’t be published. Pick another image for it first.', 'لم تعد {name} محفوظة في هذا المتصفح، لذا لا يمكن نشرها. اختر صورة أخرى مكانها أولاً.', '{name} دیگر در این مرورگر نیست و نمی‌توان آن را منتشر کرد. اول تصویر دیگری به‌جایش انتخاب کنید.'],
    errNoFolder: ['Choose the site folder first.', 'اختر مجلد الموقع أولاً.', 'اول پوشهٔ سایت را انتخاب کنید.'],
    doneT: ['Published', 'تم النشر', 'منتشر شد'],
    doneFolder: ['assets/content.js is now in “{name}”. The previous file is kept as content.previous.js.', 'أصبح assets/content.js الآن في «{name}»، ويُحتفظ بالملف السابق باسم content.previous.js.', 'فایل assets/content.js اکنون در «{name}» است. فایل قبلی با نام content.previous.js نگه داشته شده است.'],
    doneVerified: ['Checked: the site now serves this version.', 'تحققنا: الموقع يعرض هذه النسخة الآن.', 'بررسی شد: سایت اکنون همین نسخه را نمایش می‌دهد.'],
    doneUnverified: ['The site this admin reads doesn’t serve it yet. If “{name}” is a local copy, upload assets/content.js to your host.', 'الموقع الذي تقرأ منه لوحة الإدارة لا يعرضها بعد. إن كان «{name}» نسخة محلية فارفع assets/content.js إلى الاستضافة.', 'سایتی که این پنل از آن می‌خواند هنوز این نسخه را نمایش نمی‌دهد. اگر «{name}» نسخه‌ای محلی است، assets/content.js را روی میزبان بارگذاری کنید.'],
    doneDownload: ['content.js is in your downloads. Upload it to the site’s assets folder, replacing the old file. Until then, visitors see the previous version.', 'الملف content.js في مجلد التنزيلات. ارفعه إلى مجلد assets في الموقع مكان الملف القديم. وإلى أن تفعل، يرى الزوار النسخة السابقة.', 'فایل content.js در پوشهٔ دانلودهاست. آن را به‌جای فایل قبلی در پوشهٔ assets سایت بارگذاری کنید. تا آن موقع بازدیدکنندگان نسخهٔ قبلی را می‌بینند.'],
    doneCopy: ['The file is on your clipboard. Paste it into assets/content.js, replacing everything, then upload it with the site.', 'الملف في الحافظة. الصقه في assets/content.js مكان كل ما فيه، ثم ارفعه مع الموقع.', 'فایل در کلیپ‌بورد است. آن را به‌جای همهٔ محتوای assets/content.js بچسبانید و همراه سایت بارگذاری کنید.'],
    doneUploads: ['Also upload these images to assets/uploads/:', 'وارفع هذه الصور أيضاً إلى assets/uploads/:', 'این تصویرها را هم در assets/uploads/ بارگذاری کنید:'],
    openHistory: ['Open history', 'افتح السجل', 'باز کردن تاریخچه'],
    noPerm: ['Your role can’t publish. Ask an owner or an admin.', 'دورك لا يسمح بالنشر. اطلب ذلك من المالك أو المدير.', 'نقش شما اجازهٔ انتشار ندارد. از مالک یا مدیر بخواهید.'],
    copiedFile: ['File contents copied.', 'نُسخ محتوى الملف.', 'محتوای فایل کپی شد.'],
    // live status
    lSite: ['On the site now', 'على الموقع الآن', 'اکنون روی سایت'],
    lSiteDefaults: ['Built-in content. The site has no content.js yet, so it shows the defaults in index.html.', 'المحتوى الأصلي. لا يوجد content.js بعد، لذا يعرض الموقع النصوص المضمّنة في index.html.', 'محتوای پیش‌فرض. سایت هنوز content.js ندارد و متن‌های داخل index.html را نشان می‌دهد.'],
    lSiteMeta: ['Published {when} by {by}', 'نُشر {when} بواسطة {by}', 'منتشرشده {when} توسط {by}'],
    lSiteErr: ['Couldn’t read assets/content.js from the site.', 'تعذّرت قراءة assets/content.js من الموقع.', 'خواندن assets/content.js از سایت ممکن نشد.'], lCheck: ['Check again', 'تحقّق مجدداً', 'بررسی دوباره'],
    lLocal: ['Last publish from this browser', 'آخر نشر من هذا المتصفح', 'آخرین انتشار از این مرورگر'], lLocalNone: ['None yet.', 'لا شيء بعد.', 'هنوز هیچ.'],
    lLive: ['Live', 'منشور', 'فعال'], lWaiting: ['Waiting for upload', 'بانتظار الرفع', 'در انتظار بارگذاری'],
    mFolder: ['written to “{name}”', 'كُتب في «{name}»', 'در «{name}» نوشته شد'], mDownload: ['downloaded', 'نُزّل الملف', 'دانلود شد'], mCopy: ['copied', 'نُسخ الملف', 'کپی شد'],
    stLive: ['The site is up to date.', 'الموقع محدّث.', 'سایت به‌روز است.'],
    stEdited: [{ one: 'Live, with 1 edit waiting.', other: 'Live, with {n} edits waiting.' },
      { one: 'منشور، وهناك تعديل واحد بانتظار النشر.', two: 'منشور، وهناك تعديلان بانتظار النشر.', few: 'منشور، وهناك {n} تعديلات بانتظار النشر.', many: 'منشور، وهناك {n} تعديلاً بانتظار النشر.', other: 'منشور، وهناك {n} تعديل بانتظار النشر.' },
      { other: 'منتشرشده، با {n} ویرایش در انتظار.' }],
    stDraft: ['Draft only. Nothing has been published yet.', 'مسودة فقط. لم يُنشر شيء بعد.', 'فقط پیش‌نویس. هنوز چیزی منتشر نشده.'],
    stWaiting: ['Published here, but the site still serves an older version.', 'نُشر من هنا، لكن الموقع ما زال يعرض نسخة أقدم.', 'از اینجا منتشر شد، اما سایت هنوز نسخهٔ قدیمی‌تری را نشان می‌دهد.'],
    upT: ['Upload to go live', 'ارفع الملفات لتظهر على الموقع', 'برای فعال شدن بارگذاری کنید'],
    upX: ['The site doesn’t serve your last publish yet. Upload these files with the site:', 'لا يعرض الموقع آخر نشر بعد. ارفع هذه الملفات مع الموقع:', 'سایت هنوز آخرین انتشار شما را نشان نمی‌دهد. این فایل‌ها را همراه سایت بارگذاری کنید:'],
    reDl: ['Download again', 'نزّله مجدداً', 'دانلود دوباره'], dl: ['Download', 'تنزيل', 'دانلود'],
    allGood: ['The site serves your last publish. Nothing to upload.', 'الموقع يعرض آخر نشر، ولا شيء لرفعه.', 'سایت آخرین انتشار شما را نشان می‌دهد. چیزی برای بارگذاری نیست.'],
    fT: ['Site folder', 'مجلد الموقع', 'پوشهٔ سایت'], fNone: ['Not connected. Connect the site folder to publish straight into it.', 'غير متصل. اربط مجلد الموقع للنشر فيه مباشرة.', 'متصل نیست. پوشهٔ سایت را وصل کنید تا مستقیم در آن منتشر کنید.'],
    fOk: ['Connected to “{name}”', 'متصل بـ«{name}»', 'متصل به «{name}»'], fAsk: ['Connected to “{name}”. The browser asks for permission again when you publish.', 'متصل بـ«{name}». سيطلب المتصفح الإذن مجدداً عند النشر.', 'متصل به «{name}». مرورگر هنگام انتشار دوباره اجازه می‌خواهد.'],
    fConnect: ['Connect folder…', 'اربط مجلداً…', 'وصل کردن پوشه…'], fReconnect: ['Reconnect', 'أعد الربط', 'وصل دوباره'], fForget: ['Forget folder', 'انسَ المجلد', 'فراموش کردن پوشه'], fForgot: ['Folder forgotten.', 'لن يُتذكّر المجلد بعد الآن.', 'پوشه فراموش شد.'],
    fConnected: ['Connected to “{name}”.', 'تم الربط بـ«{name}».', 'به «{name}» وصل شد.'],
    mkLive: ['Live', 'منشور', 'فعال'], mkEdited: ['Live, edits waiting', 'منشور مع تعديلات بانتظار النشر', 'فعال، با ویرایش‌های در انتظار'], mkDraft: ['Draft', 'مسودة', 'پیش‌نویس'],
    // activity
    aSearch: ['Search activity', 'ابحث في النشاط', 'جست‌وجو در فعالیت‌ها'], aAnyone: ['Everyone', 'الجميع', 'همه'], aAnyPage: ['All pages', 'كل الصفحات', 'همهٔ صفحه‌ها'], aAnyAction: ['All actions', 'كل الإجراءات', 'همهٔ کارها'],
    aExport: ['Export CSV', 'تصدير CSV', 'خروجی CSV'], aShowing: ['{n} of {total}', '{n} من {total}', '{n} از {total}'],
    aEmptyT: ['No activity yet', 'لا نشاط بعد', 'هنوز فعالیتی نیست'],
    aEmptyX: ['Publishes, checkpoints, briefs and uploads show up here as people work.', 'تظهر هنا عمليات النشر ونقاط الاسترجاع والطلبات والصور المرفوعة أثناء العمل.', 'انتشارها، نقطه‌های بازگشت، درخواست‌ها و بارگذاری‌ها هنگام کار اینجا نمایش داده می‌شوند.'],
    aNone: ['Nothing matches these filters.', 'لا شيء يطابق هذه الفلاتر.', 'هیچ موردی با این فیلترها جور نیست.'], aClear: ['Clear filters', 'مسح الفلاتر', 'پاک کردن فیلترها'], aSaved: ['Saved {name}.', 'حُفظ {name}.', '{name} ذخیره شد.'],
    cTime: ['Time', 'الوقت', 'زمان'], cPerson: ['Person', 'الشخص', 'شخص'], cAction: ['Action', 'الإجراء', 'کار'], cTarget: ['Details', 'التفاصيل', 'جزئیات'], cPage: ['Page', 'الصفحة', 'صفحه'], cLink: ['Link', 'الرابط', 'پیوند'],
    // commands + keys
    cmdPublish: ['Publish…', 'نشر…', 'انتشار…'], cmdDiscard: ['Discard unpublished changes', 'تجاهل التعديلات غير المنشورة', 'کنار گذاشتن تغییرهای منتشرنشده'], cmdCompare: ['Compare draft with live', 'قارن المسودة بالموقع المنشور', 'مقایسهٔ پیش‌نویس با سایت منتشرشده'],
    kNext: ['Next version', 'النسخة التالية', 'نسخهٔ بعدی'], kPrev: ['Previous version', 'النسخة السابقة', 'نسخهٔ قبلی'], kOpen: ['Preview the selected version', 'معاينة النسخة المحددة', 'پیش‌نمایش نسخهٔ انتخاب‌شده'],
    // areas + field labels
    arTheme: ['Brand colours', 'ألوان الهوية', 'رنگ‌های برند'], arSeo: ['SEO & sharing', 'الظهور والمشاركة', 'سئو و اشتراک‌گذاری'], arStudio: ['Studio & contact', 'الاستوديو والتواصل', 'استودیو و تماس'],
    arMedia: ['Images', 'الصور', 'تصویرها'], arSections: ['Sections', 'الأقسام', 'بخش‌ها'], arServices: ['Services', 'الخدمات', 'خدمات'], arOther: ['Other', 'أخرى', 'سایر'],
    question: ['Question {n}', 'السؤال {n}', 'پرسش {n}'], stage: ['Stage {n}', 'المحطة {n}', 'مرحلهٔ {n}'], swellN: ['Swell {n}', 'الموجة {n}', 'موج {n}'], serviceN: ['Service {n}', 'الخدمة {n}', 'خدمت {n}'],
    groupN: ['Group {n}', 'المجموعة {n}', 'گروه {n}'], stepLabel: ['Step label {n}', 'تسمية الخطوة {n}', 'برچسب گام {n}'], rowWord: ['Row {n} · word {k}', 'الصف {n} · الكلمة {k}', 'ردیف {n} · واژهٔ {k}'], rowN: ['Row {n}', 'الصف {n}', 'ردیف {n}'],
    f_q: ['Question', 'السؤال', 'پرسش'], f_a: ['Answer', 'الإجابة', 'پاسخ'], f_problem: ['What the visitor taps', 'ما ينقره الزائر', 'آنچه بازدیدکننده لمس می‌کند'], f_service: ['Service', 'الخدمة', 'خدمت'],
    f_desc: ['Description', 'الوصف', 'توضیح'], f_noun: ['Plan noun', 'اسم الخطة', 'اسم برنامه'], f_steps: ['Personal step {n}', 'الخطوة الشخصية {n}', 'گام شخصی {n}'], f_title: ['Title', 'العنوان', 'عنوان'],
    f_gets: ['You get · item {n}', 'ما تحصل عليه · العنصر {n}', 'دریافتی · مورد {n}'], f_getsAll: ['You get', 'ما تحصل عليه', 'دریافتی‌ها'], f_tags: ['Service tag {n}', 'وسم الخدمة {n}', 'برچسب خدمت {n}'], f_tagsAll: ['Service tags', 'وسوم الخدمات', 'برچسب‌های خدمات'],
    f_name: ['Name', 'الاسم', 'نام'], f_line: ['Line', 'السطر', 'سطر'], f_icon: ['Icon', 'الأيقونة', 'آیکون'], f_tint: ['Colours', 'الألوان', 'رنگ‌ها'], f_phase: ['Plan phase', 'مرحلة الخطة', 'مرحلهٔ برنامه'],
    f_id: ['ID', 'المعرّف', 'شناسه'], f_for: ['Shown for', 'يظهر مع', 'نمایش برای'], f_group: ['Group', 'المجموعة', 'گروه'], f_img: ['Picture', 'الصورة', 'تصویر'], f_swell: ['Linked swell', 'الموجة المرتبطة', 'موج مرتبط'],
    f_word: ['Word', 'الكلمة', 'واژه'], f_whole: ['Whole list', 'القائمة كاملة', 'کل فهرست'], f_stepsAll: ['Personal steps', 'الخطوات الشخصية', 'گام‌های شخصی'],
    s_title: ['Search title', 'عنوان البحث', 'عنوان جست‌وجو'], s_description: ['Search description', 'وصف البحث', 'توضیح جست‌وجو'], s_themeColor: ['Theme colour', 'لون المتصفح', 'رنگ پوسته'], s_ogImage: ['Sharing image', 'صورة المشاركة', 'تصویر اشتراک‌گذاری'],
    o_email: ['Email', 'البريد', 'ایمیل'], o_whatsapp: ['WhatsApp', 'واتساب', 'واتس‌اپ'], o_phoneLabel: ['Phone label', 'تسمية الهاتف', 'برچسب تلفن'], o_timezone: ['Time zone', 'المنطقة الزمنية', 'منطقهٔ زمانی'],
    o_open: ['Opens', 'وقت الفتح', 'ساعت باز شدن'], o_close: ['Closes', 'وقت الإغلاق', 'ساعت بسته شدن'], o_days: ['Open days', 'أيام العمل', 'روزهای کاری'], o_formEndpoint: ['Form service', 'خدمة النماذج', 'سرویس فرم'],
    o_provider: ['Analytics provider', 'مزوّد التحليلات', 'سرویس آمار'], o_analyticsId: ['Analytics ID', 'معرّف التحليلات', 'شناسهٔ آمار'], o_src: ['Analytics script', 'سكربت التحليلات', 'اسکریپت آمار'],
    m_studioMira: ['Studio Mira', 'ميرا في الاستوديو', 'میرا در استودیو'], m_doneMira: ['Mira after sending', 'ميرا بعد الإرسال', 'میرا پس از ارسال'], m_footMira: ['Footer Mira', 'ميرا في التذييل', 'میرا در پانویس'],
    c_shore: ['Shore', 'الشاطئ', 'ساحل'], c_tide60: ['Tide {n}', 'المدّ {n}', 'مد {n}'],
    // activity actions
    'act.publish': ['published the site', 'نشر الموقع', 'سایت را منتشر کرد'], 'act.checkpoint': ['saved a checkpoint', 'حفظ نقطة استرجاع', 'نقطهٔ بازگشت ذخیره کرد'],
    'act.restore': ['restored a version', 'استعاد نسخة', 'نسخه‌ای را بازگرداند'], 'act.draft.discard': ['discarded unpublished changes', 'تجاهل التعديلات غير المنشورة', 'تغییرهای منتشرنشده را کنار گذاشت'],
    'act.draft.import': ['imported content', 'استورد محتوى', 'محتوا وارد کرد'], 'act.version.delete': ['deleted a checkpoint', 'حذف نقطة استرجاع', 'نقطهٔ بازگشتی را حذف کرد'],
    'act.lead.add': ['added a brief', 'أضاف طلباً', 'درخواستی افزود'], 'act.lead.import': ['imported briefs', 'استورد طلبات', 'درخواست‌هایی وارد کرد'], 'act.lead.stage': ['moved a brief', 'نقل طلباً إلى مرحلة أخرى', 'مرحلهٔ درخواستی را تغییر داد'],
    'act.lead.delete': ['deleted briefs', 'حذف طلبات', 'درخواست‌هایی را حذف کرد'], 'act.media.upload': ['uploaded images', 'رفع صوراً', 'تصویر بارگذاری کرد'], 'act.media.replace': ['replaced an image', 'استبدل صورة', 'تصویری را جایگزین کرد'],
    'act.media.delete': ['deleted an image', 'حذف صورة', 'تصویری را حذف کرد'], 'act.swell.add': ['added a swell', 'أضاف موجة', 'موجی افزود'], 'act.swell.delete': ['deleted a swell', 'حذف موجة', 'موجی را حذف کرد'],
    'act.swell.duplicate': ['duplicated a swell', 'كرّر موجة', 'موجی را تکثیر کرد'], 'act.settings.export': ['exported a backup', 'صدّر نسخة احتياطية', 'نسخهٔ پشتیبان گرفت'], 'act.settings.formTest': ['sent a test brief', 'أرسل طلباً تجريبياً', 'درخواست آزمایشی فرستاد'],
    'act.settings.clearEvents': ['cleared site events', 'مسح أحداث الموقع', 'رویدادهای سایت را پاک کرد'], 'act.settings.clearSamples': ['cleared sample data', 'مسح البيانات التجريبية', 'داده‌های نمونه را پاک کرد'],
    'act.settings.restore': ['restored a backup', 'استعاد نسخة احتياطية', 'نسخهٔ پشتیبان را بازگرداند'],
    'act.analytics.clear': ['cleared this browser’s events', 'مسح أحداث هذا المتصفح', 'رویدادهای این مرورگر را پاک کرد'],
    'act.draft.prune': ['removed edits the site no longer has', 'أزال تعديلات لم تعد في الموقع', 'ویرایش‌هایی را که دیگر در سایت نیستند حذف کرد'],
    'act.service.add': ['added a service', 'أضاف خدمة', 'خدمتی افزود'], 'act.service.delete': ['deleted a service', 'حذف خدمة', 'خدمتی را حذف کرد'],
    'act.team.role': ['changed a role', 'غيّر دوراً', 'نقشی را تغییر داد'], 'act.team.joined': ['joined the team', 'انضم إلى الفريق', 'به تیم پیوست'],
    'act.team.invite': ['added a teammate', 'أضاف عضواً إلى الفريق', 'هم‌تیمی‌ای افزود'], 'act.team.remove': ['removed a teammate', 'أزال عضواً من الفريق', 'هم‌تیمی‌ای را حذف کرد'],
    'act.schedule': ['scheduled a change', 'جدول تغييراً', 'تغییری را زمان‌بندی کرد'], 'act.schedule.cancel': ['cancelled a scheduled change', 'ألغى تغييراً مجدولاً', 'تغییر زمان‌بندی‌شده‌ای را لغو کرد'],
    'act.other': ['made a change', 'أجرى تعديلاً', 'تغییری داد'],
    // when: publish now or at a time (Qatar)
    when: ['When', 'التوقيت', 'زمان'], whenNow: ['Publish now', 'انشر الآن', 'همین حالا منتشر شود'], whenLater: ['Schedule for…', 'جدولة لوقت لاحق…', 'زمان‌بندی برای…'],
    atDate: ['Date', 'التاريخ', 'تاریخ'], atTime: ['Time in Qatar', 'الوقت بتوقيت قطر', 'ساعت به وقت قطر'],
    atHint: ['The site switches on its own at this time, Qatar time (UTC+3). The file still has to be on the site before then.', 'يتحوّل الموقع تلقائياً في هذا الوقت بتوقيت قطر (UTC+3)، بشرط أن يكون الملف على الموقع قبل ذلك.', 'سایت در این زمان، به وقت قطر (UTC+3)، خودش تغییر می‌کند. فایل باید پیش از آن روی سایت باشد.'],
    atPast: ['Pick a time at least {n} minutes from now.', 'اختر وقتاً بعد {n} دقائق على الأقل من الآن.', 'زمانی را انتخاب کنید که دست‌کم {n} دقیقه بعد از حالا باشد.'],
    atBad: ['Enter a date and a time.', 'أدخل التاريخ والوقت.', 'تاریخ و ساعت را وارد کنید.'], nowK: ['Now', 'الآن', 'همین حالا'],
    atK: ['{when} (Qatar time)', '{when} (بتوقيت قطر)', '{when} (به وقت قطر)'],
    confAt: [{ one: '1 change in {areas} will go live on {when}.', other: '{n} changes across {areas} will go live on {when}.' },
      { one: 'سيظهر تعديل واحد في {areas} على الموقع في {when}.', two: 'سيظهر تعديلان في {areas} على الموقع في {when}.', few: 'ستظهر {n} تعديلات في {areas} على الموقع في {when}.', many: 'سيظهر {n} تعديلاً في {areas} على الموقع في {when}.', other: 'سيظهر {n} تعديل في {areas} على الموقع في {when}.' },
      { one: 'یک تغییر در {areas} در {when} روی سایت می‌آید.', other: '{n} تغییر در {areas} در {when} روی سایت می‌آید.' }],
    confAtKeep: ['Until then the site shows the current version. The scheduled changes leave your draft, so you can keep working on other things.', 'حتى ذلك الحين يعرض الموقع النسخة الحالية، وتخرج التعديلات المجدولة من مسودتك لتواصل العمل على أمور أخرى.', 'تا آن زمان سایت نسخهٔ فعلی را نشان می‌دهد. تغییرهای زمان‌بندی‌شده از پیش‌نویس شما بیرون می‌روند تا بتوانید روی چیزهای دیگر کار کنید.'],
    btnFolderAt: ['Schedule in the site folder', 'جدوِل في مجلد الموقع', 'زمان‌بندی در پوشهٔ سایت'], btnDownloadAt: ['Schedule and download', 'جدوِل ونزّل الملف', 'زمان‌بندی و دانلود'], btnCopyAt: ['Schedule and copy', 'جدوِل وانسخ الملف', 'زمان‌بندی و کپی'],
    doneAtT: ['Scheduled', 'تمت الجدولة', 'زمان‌بندی شد'],
    doneAt: ['The site switches to these changes on {when} (Qatar time).', 'يتحوّل الموقع إلى هذه التعديلات في {when} (بتوقيت قطر).', 'سایت در {when} (به وقت قطر) به این تغییرها می‌رود.'],
    doneAtUpload: ['Upload content.js before then, replacing the old file.', 'ارفع content.js قبل ذلك مكان الملف القديم.', 'پیش از آن، content.js را به‌جای فایل قبلی بارگذاری کنید.'],
    // images that can't be found
    mmT: ['Some images aren’t in this browser', 'بعض الصور غير موجودة في هذا المتصفح', 'برخی تصویرها در این مرورگر نیستند'],
    mmX: ['These slots point at uploads this browser doesn’t have, so the site would show broken images. Choose another image or go back to the default. Publishing waits until every image is found.', 'تشير هذه الخانات إلى صور مرفوعة غير موجودة في هذا المتصفح، فسيعرض الموقع صوراً معطوبة. اختر صورة أخرى أو عد إلى الصورة الأصلية. ينتظر النشر حتى تتوفر كل الصور.', 'این جایگاه‌ها به بارگذاری‌هایی اشاره می‌کنند که در این مرورگر نیستند و سایت تصویر خراب نشان می‌دهد. تصویر دیگری انتخاب کنید یا به تصویر پیش‌فرض برگردید. انتشار تا پیدا شدن همهٔ تصویرها صبر می‌کند.'],
    mmRow: ['Image missing: {slot}', 'صورة مفقودة: {slot}', 'تصویر پیدا نمی‌شود: {slot}'], mmChoose: ['Choose another…', 'اختر صورة أخرى…', 'انتخاب تصویر دیگر…'], mmReset: ['Use the default', 'استخدم الصورة الأصلية', 'استفاده از پیش‌فرض'],
    mmAfter: [{ one: '1 image here isn’t stored in this browser. Choose another before publishing.', other: '{n} images here aren’t stored in this browser. Choose others before publishing.' },
      { one: 'صورة واحدة هنا غير محفوظة في هذا المتصفح. اختر غيرها قبل النشر.', two: 'صورتان هنا غير محفوظتين في هذا المتصفح. اختر غيرهما قبل النشر.', few: '{n} صور هنا غير محفوظة في هذا المتصفح. اختر غيرها قبل النشر.', many: '{n} صورةً هنا غير محفوظة في هذا المتصفح. اختر غيرها قبل النشر.', other: '{n} صورة هنا غير محفوظة في هذا المتصفح. اختر غيرها قبل النشر.' },
      { one: 'یک تصویر در این مرورگر ذخیره نشده است. پیش از انتشار تصویر دیگری انتخاب کنید.', other: '{n} تصویر در این مرورگر ذخیره نشده‌اند. پیش از انتشار تصویرهای دیگری انتخاب کنید.' }],
    mmReview: ['Review', 'مراجعة', 'بررسی'],
    errMissingAny: ['An image in this file isn’t stored in this browser, so the site would show a broken picture. Nothing was published.', 'صورة في هذا الملف غير محفوظة في هذا المتصفح، فسيعرض الموقع صورة معطوبة. لم يُنشر شيء.', 'یکی از تصویرهای این فایل در این مرورگر نیست و سایت تصویر خراب نشان می‌دهد. چیزی منتشر نشد.'],
    // dry run in the site
    ckRun: ['Checking the content with the site…', 'جارٍ فحص المحتوى مع الموقع…', 'در حال بررسی محتوا با سایت…'], ckOk: ['Checked: the site can show all of it.', 'تم الفحص: يستطيع الموقع عرضه كله.', 'بررسی شد: سایت می‌تواند همه را نشان دهد.'],
    ckBad: ['The site couldn’t use part of this content: {parts}. Fix it before publishing.', 'لم يستطع الموقع استخدام جزء من هذا المحتوى: {parts}. أصلحه قبل النشر.', 'سایت نتوانست بخشی از این محتوا را به کار ببرد: {parts}. پیش از انتشار درستش کنید.'],
    ckSkip: ['Couldn’t check with the site this time. The content was still checked here.', 'تعذّر الفحص مع الموقع هذه المرة، لكن المحتوى فُحص هنا.', 'این بار بررسی با سایت ممکن نشد، اما محتوا اینجا بررسی شد.'],
    errCheck: ['The site couldn’t use part of this content: {parts}. Nothing was published.', 'لم يستطع الموقع استخدام جزء من هذا المحتوى: {parts}. لم يُنشر شيء.', 'سایت نتوانست بخشی از این محتوا را به کار ببرد: {parts}. چیزی منتشر نشد.'],
    // copy that didn't work
    cfT: ['Copy didn’t work, so nothing is published yet', 'لم ينجح النسخ، لذا لم يُنشر شيء بعد', 'کپی انجام نشد و هنوز چیزی منتشر نشده است'],
    cfX: ['The browser didn’t allow copying. Select all the text below, copy it, paste it into assets/content.js, then confirm here.', 'لم يسمح المتصفح بالنسخ. حدّد كل النص أدناه وانسخه والصقه في assets/content.js، ثم أكّد هنا.', 'مرورگر اجازهٔ کپی نداد. همهٔ متن زیر را انتخاب و کپی کنید، در assets/content.js بچسبانید و بعد اینجا تأیید کنید.'],
    cfLabel: ['File contents', 'محتوى الملف', 'محتوای فایل'], cfRetry: ['Try copying again', 'حاول النسخ مجدداً', 'دوباره کپی کنید'], cfDone: ['I copied it: mark as published', 'نسختُه: اعتبره منشوراً', 'کپی کردم: منتشرشده ثبت شود'],
    // extra files on a folder publish
    exT: ['Also on this publish', 'ومع هذا النشر', 'همراه این انتشار'],
    exFiles: ['Update robots.txt and sitemap.xml', 'حدّث robots.txt و sitemap.xml', 'به‌روزرسانی robots.txt و sitemap.xml'],
    exFilesSub: ['Missing files are created. An existing robots.txt is kept; an existing sitemap only gets today’s date on the home page.', 'تُنشأ الملفات غير الموجودة. يبقى robots.txt الحالي كما هو، ولا يتغيّر في sitemap الحالي سوى تاريخ الصفحة الرئيسية.', 'فایل‌های ناموجود ساخته می‌شوند. robots.txt فعلی دست نمی‌خورد و در sitemap فعلی فقط تاریخ صفحهٔ اصلی به‌روز می‌شود.'],
    exHead: ['Write the SEO tags into index.html', 'اكتب وسوم الظهور في index.html', 'نوشتن تگ‌های سئو در index.html'],
    exHeadSub: ['Puts the title, description and sharing tags from SEO & sharing into the page head, so link previews match. index.html is copied to index.previous.html first.', 'يضع العنوان والوصف ووسوم المشاركة من «الظهور والمشاركة» في رأس الصفحة لتطابق معاينات الروابط، بعد نسخ index.html إلى index.previous.html.', 'عنوان، توضیح و تگ‌های اشتراک‌گذاری را از «سئو و اشتراک‌گذاری» در head صفحه می‌گذارد تا پیش‌نمایش پیوندها درست باشد. پیش از آن index.html در index.previous.html کپی می‌شود.'],
    exHeadLater: ['A scheduled publish leaves index.html alone: its tags would go live before the content does.', 'النشر المجدول لا يغيّر index.html، لأن وسومه كانت ستظهر قبل المحتوى.', 'انتشار زمان‌بندی‌شده به index.html دست نمی‌زند، چون تگ‌ها پیش از محتوا فعال می‌شدند.'],
    exBackup: ['Back up admin data to “{name}”', 'انسخ بيانات لوحة الإدارة احتياطياً إلى «{name}»', 'پشتیبان‌گیری از داده‌های پنل در «{name}»'],
    exBackupSub: ['Briefs, team, history and uploads, as one dated file in backups/.', 'الطلبات والفريق والسجل والصور المرفوعة، في ملف واحد مؤرَّخ داخل backups/.', 'درخواست‌ها، تیم، تاریخچه و بارگذاری‌ها، در یک فایل تاریخ‌دار داخل backups/.'],
    rRobotsNew: ['robots.txt created', 'أُنشئ robots.txt', 'robots.txt ساخته شد'], rRobotsKept: ['robots.txt kept as it was', 'بقي robots.txt كما هو', 'robots.txt دست‌نخورده ماند'],
    rMapNew: ['sitemap.xml created', 'أُنشئ sitemap.xml', 'sitemap.xml ساخته شد'], rMapDate: ['sitemap.xml: the home page is dated today', 'sitemap.xml: صار تاريخ الصفحة الرئيسية اليوم', 'sitemap.xml: تاریخ صفحهٔ اصلی امروز شد'], rMapKept: ['sitemap.xml kept as it was', 'بقي sitemap.xml كما هو', 'sitemap.xml دست‌نخورده ماند'],
    rHead: ['SEO tags written into index.html. The old file is index.previous.html.', 'كُتبت وسوم الظهور في index.html، والملف القديم باسم index.previous.html.', 'تگ‌های سئو در index.html نوشته شد. فایل قبلی index.previous.html است.'],
    rHeadSame: ['index.html already had these tags.', 'كانت وسوم index.html مطابقة أصلاً.', 'index.html همین تگ‌ها را داشت.'], rHeadFail: ['index.html was left alone: its head couldn’t be read.', 'لم يُغيَّر index.html، لتعذّر قراءة رأسه.', 'index.html تغییری نکرد، چون head آن خوانده نشد.'],
    rBackup: ['Admin data backed up to “{name}”.', 'نُسخت بيانات لوحة الإدارة احتياطياً إلى «{name}».', 'از داده‌های پنل در «{name}» پشتیبان گرفته شد.'],
    rBackupFail: ['The backup couldn’t be written: {msg}', 'تعذّرت كتابة النسخة الاحتياطية: {msg}', 'نوشتن نسخهٔ پشتیبان ممکن نشد: {msg}'],
    rBackupPerm: ['The backup folder needs your permission again.', 'مجلد النسخ الاحتياطية يحتاج إلى إذنك مجدداً.', 'پوشهٔ پشتیبان دوباره به اجازهٔ شما نیاز دارد.'], rBackupAllow: ['Allow and back up', 'اسمح وانسخ احتياطياً', 'اجازه بده و پشتیبان بگیر'],
    bkSuggest: ['Keep a copy of briefs, team and history with every publish.', 'احتفظ بنسخة من الطلبات والفريق والسجل مع كل نشر.', 'با هر انتشار یک نسخه از درخواست‌ها، تیم و تاریخچه نگه دارید.'],
    // automatic backups (Live status)
    bT: ['Automatic backups', 'النسخ الاحتياطية التلقائية', 'پشتیبان‌گیری خودکار'],
    bX: ['Each publish to the site folder also saves briefs, team, history and uploads to backups/ in this folder. Pick a private folder such as iCloud Drive or Dropbox, never the website folder: backups hold client details.', 'كل نشر في مجلد الموقع يحفظ أيضاً الطلبات والفريق والسجل والصور المرفوعة في backups/ داخل هذا المجلد. اختر مجلداً خاصاً مثل iCloud Drive أو Dropbox، لا مجلد الموقع أبداً، فالنسخ الاحتياطية تحوي بيانات العملاء.', 'هر انتشار در پوشهٔ سایت، درخواست‌ها، تیم، تاریخچه و بارگذاری‌ها را هم در backups/ داخل این پوشه ذخیره می‌کند. یک پوشهٔ خصوصی مثل iCloud Drive یا Dropbox انتخاب کنید، هرگز پوشهٔ سایت را، چون پشتیبان‌ها اطلاعات مشتری‌ها را دارند.'],
    bNone: ['No backup folder yet.', 'لا مجلد للنسخ الاحتياطية بعد.', 'هنوز پوشهٔ پشتیبانی انتخاب نشده.'], bChoose: ['Choose a backup folder…', 'اختر مجلداً للنسخ الاحتياطية…', 'انتخاب پوشهٔ پشتیبان…'],
    bLast: ['Last backup {when}', 'آخر نسخة احتياطية {when}', 'آخرین پشتیبان {when}'], bNever: ['No backup yet', 'لا نسخة احتياطية بعد', 'هنوز پشتیبانی گرفته نشده'], bNow: ['Back up now', 'انسخ احتياطياً الآن', 'همین حالا پشتیبان بگیر'],
    bSite: ['That’s the website folder. Anything in it can end up online, and backups hold client details. Choose a private folder.', 'هذا مجلد الموقع، وكل ما فيه قد يصل إلى الإنترنت، والنسخ الاحتياطية تحوي بيانات العملاء. اختر مجلداً خاصاً.', 'این پوشهٔ سایت است و هر چه در آن باشد ممکن است آنلاین شود، و پشتیبان‌ها اطلاعات مشتری‌ها را دارند. یک پوشهٔ خصوصی انتخاب کنید.'],
    // scheduled changes (Live status)
    sT: ['Scheduled changes', 'التغييرات المجدولة', 'تغییرهای زمان‌بندی‌شده'], sPending: ['Goes live {when}', 'يظهر {when}', '{when} فعال می‌شود'], sDue: ['Live since {when}', 'ظاهر منذ {when}', 'از {when} فعال است'],
    sCancel: ['Cancel schedule', 'ألغِ الجدولة', 'لغو زمان‌بندی'], sCancelQ: ['Cancel this scheduled change?', 'هل تلغي هذا التغيير المجدول؟', 'این تغییر زمان‌بندی‌شده لغو شود؟'],
    sCancelFolder: ['A new assets/content.js without it is written to “{name}”. Its changes stay in history.', 'يُكتب assets/content.js جديد من دونه في «{name}»، وتبقى تعديلاته في السجل.', 'یک assets/content.js تازه بدون آن در «{name}» نوشته می‌شود. تغییرهایش در تاریخچه می‌مانند.'],
    sCancelDl: ['You’ll get a new content.js without it, to upload to the site. Its changes stay in history.', 'ستحصل على content.js جديد من دونه لترفعه إلى الموقع، وتبقى تعديلاته في السجل.', 'یک content.js تازه بدون آن دریافت می‌کنید تا روی سایت بارگذاری کنید. تغییرهایش در تاریخچه می‌مانند.'],
    sCancelled: ['Scheduled change cancelled.', 'أُلغي التغيير المجدول.', 'تغییر زمان‌بندی‌شده لغو شد.'], sCancelledDl: ['Scheduled change cancelled. Upload the new content.js to the site.', 'أُلغي التغيير المجدول. ارفع content.js الجديد إلى الموقع.', 'تغییر زمان‌بندی‌شده لغو شد. content.js تازه را روی سایت بارگذاری کنید.'],
    sCancelNote: ['Cancelled a scheduled change', 'إلغاء تغيير مجدول', 'لغو تغییر زمان‌بندی‌شده'], sPvName: ['Scheduled for {when}', 'مجدول في {when}', 'زمان‌بندی‌شده برای {when}'], sNext: ['Next scheduled change: {when}', 'التغيير المجدول التالي: {when}', 'تغییر زمان‌بندی‌شدهٔ بعدی: {when}'],
    nowLive: ['The site now serves your last publish.', 'الموقع يعرض الآن آخر نشر لك.', 'سایت اکنون آخرین انتشار شما را نشان می‌دهد.'],
    // imports with problems
    impFixT: ['Some of this file needs repairs', 'جزء من هذا الملف يحتاج إلى إصلاح', 'بخشی از این فایل باید اصلاح شود'],
    impFixX: [{ one: '1 problem in {name} is repaired on import, usually by keeping the current value:', other: '{n} problems in {name} are repaired on import, usually by keeping the current value:' },
      { one: 'مشكلة واحدة في {name} تُصلَح عند الاستيراد، غالباً بإبقاء القيمة الحالية:', two: 'مشكلتان في {name} تُصلَحان عند الاستيراد، غالباً بإبقاء القيمة الحالية:', few: '{n} مشكلات في {name} تُصلَح عند الاستيراد، غالباً بإبقاء القيمة الحالية:', many: '{n} مشكلةً في {name} تُصلَح عند الاستيراد، غالباً بإبقاء القيمة الحالية:', other: '{n} مشكلة في {name} تُصلَح عند الاستيراد، غالباً بإبقاء القيمة الحالية:' },
      { one: 'یک مشکل در {name} هنگام وارد کردن اصلاح می‌شود، معمولاً با نگه داشتن مقدار فعلی:', other: '{n} مشکل در {name} هنگام وارد کردن اصلاح می‌شود، معمولاً با نگه داشتن مقدار فعلی:' }],
    impFixGo: ['Import with repairs', 'استورد مع الإصلاح', 'وارد کردن با اصلاح'],
    repaired: [{ one: '1 problem was repaired.', other: '{n} problems were repaired.' }, { one: 'وأُصلحت مشكلة واحدة.', two: 'وأُصلحت مشكلتان.', few: 'وأُصلحت {n} مشكلات.', many: 'وأُصلحت {n} مشكلةً.', other: 'وأُصلحت {n} مشكلة.' }, { one: 'یک مشکل اصلاح شد.', other: '{n} مشکل اصلاح شد.' }],
  };
  {
    const d = { en: {}, ar: {}, fa: {} };
    // file paths inside Arabic and Persian sentences stay one left-to-right run ("assets/uploads/", not "/assets/uploads")
    const ltr = v => typeof v === 'string' ? v.replace(/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]*|[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.(?:js|html|txt|xml|json))/g, '\u2066$1\u2069')
      : MA.isObj(v) ? Object.fromEntries(Object.entries(v).map(([f, x]) => [f, ltr(x)])) : v;
    for (const [k, [en, ar, fa]] of Object.entries(S)) { d.en['history.' + k] = en; d.ar['history.' + k] = ltr(ar); d.fa['history.' + k] = ltr(fa); }
    MA.i18n.add(d);
  }
  const t = (k, v) => MA.t('history.' + k, v);
  const n$ = n => MA.num(n);
  /** A counted phrase in the right plural form ('changes' → "1 change", "تعديلان", "۳ تغییر"); `none` for zero. */
  const count = (n, key, none) => n === 0 && none ? t(none) : t(key, { n });
  const cl = () => MA.siteLang(); // site content is EN + AR only: show Arabic copy in the Arabic admin, English otherwise
  /** "a → b" in LTR, "a ← b" in RTL, each side isolated so mixed scripts don't reorder the line. */
  const arrow = (a, b) => MA.activity?.arrow ? MA.activity.arrow(a, b) : `⁨${a}⁩${MA.isRTL() ? ' ← ' : ' → '}⁨${b}⁩`;
  const noIso = s => String(s ?? '').replace(/[⁦-⁩]/g, '');
  /** A moment in Qatar time, in the admin language and digits: "Tue 14 Oct, 09:00". */
  const qWhen = at => MA.date(at, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Qatar' });
  const whoOf = x => (x?.byId && MA.team?.name?.(x.byId)) || x?.by || 'MIRAS';
  const listFmt = arr => { try { return new Intl.ListFormat({ en: 'en-GB', ar: 'ar', fa: 'fa' }[MA.lang()] || 'en-GB', { type: 'conjunction' }).format(arr); } catch (e) { return arr.join(', '); } };
  const stripMeta = o => { if (!MA.isObj(o)) return o || {}; const { meta, schema, version, exportedAt, by, ...rest } = o; return rest; };
  /** Plain text of an html string. Unlike MA.strip (innerHTML on a live <div>, which loads <img> and runs onerror),
      a <template> is inert, so text that came from site visitors (lead names in activity) can't run anything. */
  const strip = v => { const tp = document.createElement('template'); tp.innerHTML = String(v ?? ''); return tp.content.textContent; };
  const fsOK = () => typeof window.showDirectoryPicker === 'function';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  /** IndexedDB can stall (private windows, blocked storage): never wait on it for long. Resolves to `fallback` on error or timeout. */
  const idb = (p, fallback = null, ms = 1500) => Promise.race([Promise.resolve(p).catch(() => fallback), wait(ms).then(() => fallback)]);

  /* ================= what changed, and where it lives ================= */
  const AREA_ORDER = ['top', 'swells', 'plan', 'services', 'process', 'make', 'why', 'studio', 'faq', 'contact', 'foot', 'nav', 'aria', 'tag', 'ui', 'theme', 'media', 'seo', 'sections', 'contactInfo'];
  const AREA_NAME = { theme: 'arTheme', seo: 'arSeo', contactInfo: 'arStudio', media: 'arMedia', sections: 'arSections', services: 'arServices', other: 'arOther' };
  function areaName(a) {
    if (AREA_NAME[a]) return t(AREA_NAME[a]);
    if (a === 'ui') return MA.t('sec.ui');
    return MA.content.groupName(a);
  }
  const fieldL = (k, vars) => MA.i18n.has('history.f_' + k, 'en') ? t('f_' + k, vars) : k;
  const itemName = (o, lang = cl()) => {
    if (o == null) return '';
    if (typeof o === 'string') return strip(o);
    const L = o[lang] || o.en || {};
    if (typeof L === 'string') return strip(L);
    return strip(L.service || L.name || L.title || L.q || L.problem || o.id || '');
  };
  /** path → { area, label, lang } — labels name the thing (swell's service, stage title…) using `src` for names */
  function describe(path, src) {
    const p = String(path).split('/'), top = p[0], lang = p.includes('ar') ? 'ar' : p.includes('en') ? 'en' : null;
    const rest = p.filter((x, i) => i > 0 && x !== 'en' && x !== 'ar');
    const at = (...k) => MA.path.get(src, k.join('/'));
    const num = i => n$(+i + 1);
    let area = top, label = '';
    switch (top) {
      case 'text': { const key = p.slice(2).join('/'); area = key ? MA.content.groupOf(key) : 'other'; label = key ? MA.content.keyLabel(key) : fieldL('whole'); break; }
      case 'ui': area = 'ui'; label = p[2] || fieldL('whole'); break;
      case 'swells': {
        area = 'swells';
        if (p[1] == null) { label = fieldL('whole'); break; }
        const nm = itemName(at('swells', p[1])) || t('swellN', { n: num(p[1]) });
        const f = rest.slice(1); label = nm + (f.length ? ' · ' + (f[0] === 'steps' ? (f[1] != null ? fieldL('steps', { n: num(f[1]) }) : fieldL('stepsAll')) : fieldL(f[0])) : '');
        break;
      }
      case 'faq': area = 'faq'; label = p[1] == null ? fieldL('whole') : t('question', { n: num(p[1]) }) + (rest[1] ? ' · ' + fieldL(rest[1]) : ''); break;
      case 'stages': {
        area = 'process';
        if (p[1] == null) { label = fieldL('whole'); break; }
        const nm = itemName(at('stages', p[1])); const f = rest.slice(1);
        label = t('stage', { n: num(p[1]) }) + (nm ? ' · ' + nm : '') + (f[0] ? ' · ' + (f[0] === 'gets' || f[0] === 'tags' ? (f[1] != null ? fieldL(f[0], { n: num(f[1]) }) : fieldL(f[0] + 'All')) : fieldL(f[0])) : '');
        break;
      }
      case 'steps': area = 'process'; label = rest[0] != null ? t('stepLabel', { n: num(rest[0]) }) : fieldL('whole'); break;
      case 'make': area = 'make'; label = p[1] == null ? fieldL('whole') : p[2] == null ? t('rowN', { n: num(p[1]) }) : t('rowWord', { n: num(p[1]), k: num(p[2]) }) + (rest[2] ? ' · ' + fieldL(rest[2]) : ''); break;
      case 'services': {
        area = 'services';
        if (p[1] == null) { label = fieldL('whole'); break; }
        const nm = itemName(at('services', p[1])) || t('serviceN', { n: num(p[1]) }); label = nm + (rest[1] ? ' · ' + fieldL(rest[1]) : ''); break;
      }
      case 'sgroups': {
        area = 'services';
        const k = rest[0]; const nm = k != null ? strip(MA.path.get(src, `sgroups/${cl()}/${k}/name`) || '') : '';
        label = k == null ? fieldL('whole') : (nm || t('groupN', { n: num(k) })) + (rest[1] ? ' · ' + fieldL(rest[1]) : ''); break;
      }
      case 'theme': { const c = p[1]; label = c ? (MA.i18n.has('history.c_' + c, 'en') ? t('c_' + c, { n: 60 }) : MA.i18n.has('acc.' + c, 'en') ? MA.t('acc.' + c) : c) : fieldL('whole'); break; }
      case 'seo': label = p[1] === 'en' || p[1] === 'ar' ? (p[2] ? (MA.i18n.has('history.s_' + p[2], 'en') ? t('s_' + p[2]) : p[2]) : fieldL('whole')) : p[1] ? (MA.i18n.has('history.s_' + p[1], 'en') ? t('s_' + p[1]) : p[1]) : fieldL('whole'); break;
      case 'studio': area = 'contactInfo'; { const k = p[1] === 'analytics' ? (p[2] === 'id' ? 'analyticsId' : p[2] || 'provider') : p[1]; label = k && MA.i18n.has('history.o_' + k, 'en') ? t('o_' + k) : (k || fieldL('whole')); } break;
      case 'media': label = p[1] ? (MA.i18n.has('history.m_' + p[1], 'en') ? t('m_' + p[1]) : p[1].replace(/([a-z])([A-Z])/g, '$1 $2')) : fieldL('whole'); break;
      case 'sections': label = p[1] ? MA.content.groupName(p[1]) : fieldL('whole'); break;
      default: area = AREA_ORDER.includes(top) ? top : 'other'; label = MA.content.label(path);
    }
    return { area, label, lang };
  }
  /** group a leaf-change list by area, in site order */
  function groupChanges(list, src) {
    const m = new Map();
    for (const c of list) { const d = describe(c.path, src); (m.get(d.area) || m.set(d.area, []).get(d.area)).push({ ...c, ...d }); }
    const rank = a => { const i = AREA_ORDER.indexOf(a); return i < 0 ? 99 : i; };
    return [...m.entries()].sort((a, b) => rank(a[0]) - rank(b[0])).map(([area, items]) => ({ area, name: areaName(area), items }));
  }
  const areasOf = list => groupChanges(list, MA.content.draft).map(g => g.name);

  /* ---- word diff ---- */
  const tok = s => String(s).match(/\s+|[^\s]+/g) || [];
  function wordOps(a, b) {
    const A = tok(a), B = tok(b);
    let s = 0; while (s < A.length && s < B.length && A[s] === B[s]) s++;
    let e = 0; while (e < A.length - s && e < B.length - s && A[A.length - 1 - e] === B[B.length - 1 - e]) e++;
    const a1 = A.slice(s, A.length - e), b1 = B.slice(s, B.length - e), out = [];
    const push = (op, v) => { if (!v) return; const last = out.at(-1); if (last && last[0] === op) last[1] += v; else out.push([op, v]); };
    push('=', A.slice(0, s).join(''));
    if (a1.length * b1.length > 90000) { push('-', a1.join('')); push('+', b1.join('')); }
    else {
      const n = a1.length, m = b1.length, dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a1[i] === b1[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      let i = 0, j = 0;
      while (i < n && j < m) { if (a1[i] === b1[j]) { push('=', a1[i]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) push('-', a1[i++]); else push('+', b1[j++]); }
      while (i < n) push('-', a1[i++]); while (j < m) push('+', b1[j++]);
    }
    push('=', A.slice(A.length - e).join(''));
    // a lone space between two edits belongs to the edit: "-big red +small blue" reads better than "-big +small = -red +blue"
    for (let k = 1; k < out.length - 1; k++) if (out[k][0] === '=' && /^\s+$/.test(out[k][1]) && out[k - 1][0] !== '=' && out[k + 1][0] !== '=') out[k] = ['~', out[k][1]];
    // collect each run of edits: removed words first, then added
    const res = []; let run = null;
    for (const [op, v] of out) {
      if (op === '=') { if (run) { res.push(['-', run.d], ['+', run.a]); run = null; } res.push(['=', v]); continue; }
      run ||= { d: '', a: '' };
      if (op === '-') run.d += v; else if (op === '+') run.a += v; else { run.d += v; run.a += v; }
    }
    if (run) res.push(['-', run.d], ['+', run.a]);
    return res.filter(x => x[1]);
  }
  /** html for a word diff; long unchanged stretches are shortened around the edits */
  function wordDiffHtml(a, b, { context = true } = {}) {
    const ops = wordOps(strip(a ?? ''), strip(b ?? '')), long = (String(a).length + String(b).length) > 280;
    return ops.map(([op, v], i) => {
      if (op === '-') return `<del>${esc(v)}</del>`;
      if (op === '+') return `<ins>${esc(v)}</ins>`;
      if (context && long && v.length > 130) {
        if (i === 0) return '…' + esc(v.slice(-70));
        if (i === ops.length - 1) return esc(v.slice(0, 70)) + '…';
        return esc(v.slice(0, 55)) + ' … ' + esc(v.slice(-55));
      }
      return esc(v);
    }).join('');
  }
  const isHex = v => typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v);
  const sw = v => `<span class="hs-sw" style="background:${esc(v)}"></span><span class="mono">${esc(v)}</span>`;
  function valueHtml(v, path) {
    if (v === undefined || v === null || v === '') return `<span class="faint">${t('vEmpty')}</span>`;
    if (typeof v === 'boolean') return String(path).startsWith('sections/') ? t(v ? 'vShown' : 'vHidden') : MA.t(v ? 'yes' : 'no');
    if (isHex(v)) return sw(v);
    if (typeof v === 'number') return esc(n$(v));
    if (typeof v === 'string') return esc(strip(v));
    if (Array.isArray(v)) return esc(v.map(x => itemName(x)).filter(Boolean).join(' · ')) || t('vItems', { n: v.length });
    return `<span class="mono tiny">${esc(JSON.stringify(v).slice(0, 120))}</span>`;
  }
  /** html describing one change */
  function changeHtml(c) {
    const { before: a, after: b, path } = c;
    if (typeof a === 'string' && typeof b === 'string' && !isHex(a) && !isHex(b)) return wordDiffHtml(a, b);
    if (Array.isArray(a) && Array.isArray(b)) {
      const simple = arr => arr.every(x => typeof x === 'string' || typeof x === 'number');
      if (simple(a) && simple(b)) {
        const A = a.map(String), B = b.map(String);
        const removed = A.filter(x => !B.includes(x)), added = B.filter(x => !A.includes(x));
        const chips = [...A.map(x => removed.includes(x) ? `<del class="chip">${esc(strip(x))}</del>` : `<span class="chip">${esc(strip(x))}</span>`), ...added.map(x => `<ins class="chip">${esc(strip(x))}</ins>`)];
        return `<span class="hs-chips">${chips.join('')}</span>` + (!removed.length && !added.length ? ` <span class="faint small">${t('vReordered')}</span>` : '');
      }
      const key = x => JSON.stringify(x), KA = a.map(key), KB = b.map(key);
      const gone = a.filter((x, i) => !KB.includes(KA[i])), fresh = b.filter((x, i) => !KA.includes(KB[i]));
      const parts = [`<span class="faint small">${esc(arrow(t('vItems', { n: a.length }), t('vItems', { n: b.length })))}</span>`];
      gone.forEach(x => parts.push(`<del class="chip">${esc(itemName(x) || '…')}</del>`));
      fresh.forEach(x => parts.push(`<ins class="chip">${esc(itemName(x) || '…')}</ins>`));
      if (!gone.length && !fresh.length) parts.push(`<span class="faint small">${t('vReordered')}</span>`);
      return `<span class="hs-chips">${parts.join('')}</span>`;
    }
    if (a === undefined) return `<span class="faint small">${t('vAdded')}</span> <ins>${valueHtml(b, path)}</ins>`;
    if (b === undefined) return `<span class="faint small">${t('vRemoved')}</span> <del>${valueHtml(a, path)}</del>`;
    return `<del>${valueHtml(a, path)}</del><span class="hs-arrow" aria-hidden="true">${MA.icon('arrowRight', 'sm flip')}</span><ins>${valueHtml(b, path)}</ins>`;
  }
  /** Diff element between two full contents. opts: { discard: per-change Discard button (publish review), limit: rows per area before "Show more" } */
  function diffView(before, after, { discard = false, limit = 12, expanded = new Set() } = {}) {
    const list = MA.diffContent(before, after), wrap = h('div.hs-difflist');
    if (!list.length) { wrap.append(h('p.muted.hs-same', t('same'))); return wrap; }
    for (const g of groupChanges(list, after)) {
      const sec = h('section.hs-area', { dataset: { area: g.area } }, h('header.hs-area-head', h('h3.h4', g.name), h('span.hs-count.mono', n$(g.items.length))));
      const shown = expanded.has(g.area) ? g.items : g.items.slice(0, limit);
      for (const c of shown) {
        sec.append(h('div.hs-chg', { dataset: { path: c.path } },
          h('div.hs-chg-head', h('span.hs-chg-label', c.label), c.lang ? h('span.hs-lang.mono', c.lang.toUpperCase()) : null,
            discard && MA.can('content.edit') ? ui.iconBtn('undo', { tip: t('discardOne'), size: 'sm', onclick: () => discardOne(c) }) : null),
          h('div.hs-diff', { html: changeHtml(c), dir: c.lang === 'ar' ? 'rtl' : c.lang === 'en' ? 'ltr' : null, lang: c.lang || null })));
      }
      if (shown.length < g.items.length) sec.append(h('button.btn.ghost.sm.hs-more', { type: 'button', onclick: () => { expanded.add(g.area); wrap.replaceWith(diffView(before, after, { discard, limit, expanded })); } }, t('showMore', { n: g.items.length - shown.length })));
      wrap.append(sec);
    }
    return wrap;
  }
  function discardOne(c) {
    const was = MA.clone(C().get(c.path));
    if (!C().reset(c.path, 'published')) return;
    MA.toast(t('discardedOne', { what: esc(c.label) + (c.lang ? ` (${c.lang.toUpperCase()})` : '') }), { undo: () => C().set(c.path, was, { coalesce: false }) });
  }

  /* ================= versions helpers ================= */
  const kindLabel = k => t('k_' + (['publish', 'checkpoint', 'auto', 'import'].includes(k) ? k : 'checkpoint'));
  function pubNumbers(list = MA.versions.list()) { const m = new Map(); list.filter(v => v.kind === 'publish').reverse().forEach((v, i) => m.set(v.id, i + 1)); return m; }
  function vName(v, nums = pubNumbers()) {
    if (v.kind === 'publish' && nums.has(v.id)) return `v${n$(nums.get(v.id))}`;
    return `${kindLabel(v.kind)} · ${MA.date(v.at, { day: 'numeric', month: 'short' })} ${MA.time(v.at)}`;
  }
  const FULL = new Map();
  /** Site content of a version (a publish also carries meta and the schedule: those aren't content). */
  const contentOf = full => { const { meta, schedule, schema, version, ...rest } = full || {}; return rest; };
  const fullOf = v => { if (!v) return contentOf(C().defaults); const k = v.id + '|' + JSON.stringify(v.content || {}).length; if (!FULL.has(k)) { if (FULL.size > 120) FULL.clear(); FULL.set(k, contentOf(MA.versions.full(v))); } return FULL.get(k); };
  const DIFFN = new Map();
  /** Changes a version holds vs the one before it; a publish is measured against the previous publish (what went live). */
  function changedSince(list, i) {
    const v = list[i], prev = v.kind === 'publish' ? list.slice(i + 1).find(x => x.kind === 'publish') : list[i + 1], k = v.id + '|' + (prev?.id || '0');
    // a scheduled publish counts the changes it scheduled
    const sched = v.kind === 'publish' ? (Array.isArray(v.content?.schedule) ? v.content.schedule : []).filter(e => !(prev?.content?.schedule || []).some(x => x?.id === e?.id)).reduce((n, e) => n + leavesOf(e?.overrides).length, 0) : 0;
    if (!DIFFN.has(k)) DIFFN.set(k, MA.diffContent(fullOf(prev), fullOf(v)).length + sched);
    return DIFFN.get(k);
  }
  const overNow = () => MA.overridesOf(C().defaults, C().draft) || {};
  function saveVersions(list) { MA.db.set('versions', list); MA.emit('versions'); }
  function pruneAutos() {
    const list = MA.versions.list(); let n = 0;
    const keep = list.filter(v => v.kind !== 'auto' || ++n <= AUTO_KEEP);
    if (keep.length !== list.length) saveVersions(keep);
  }
  /** An 'auto' version of the current draft, unless the newest version already holds exactly this draft. */
  function saveAuto(note = '') {
    if (!C().draft) return null;
    const latest = MA.versions.list()[0];
    if (latest && MA.eq(latest.content || {}, overNow())) return null;
    const v = MA.versions.save({ kind: 'auto', note });
    MA.db.set('history.autoAt', Date.now()); pruneAutos(); return v;
  }

  /* ---- automatic checkpoints (global, at most every 10 minutes while the draft changes) ---- */
  let autoTimer = 0;
  function scheduleAuto() {
    if (autoTimer) return;
    const last = MA.db.get('history.autoAt', 0), ms = Math.max(AUTO_FIRST_MS, last + AUTO_MS - Date.now());
    autoTimer = setTimeout(() => { autoTimer = 0; autosave(); }, ms);
  }
  /** Save an 'auto' version if the draft changed and 10 minutes passed since the last one (force skips the wait). */
  function autosave(force = false) {
    clearTimeout(autoTimer); autoTimer = 0;
    if (!C().draft) return null;
    const last = MA.db.get('history.autoAt', 0);
    if (!force && Date.now() - last < AUTO_MS) { scheduleAuto(); return null; }
    return saveAuto();
  }
  MA.on('content:change', ({ by } = {}) => { if (by !== 'publish' && C().draft) scheduleAuto(); });
  addEventListener('pagehide', () => { if (autoTimer && Date.now() - MA.db.get('history.autoAt', 0) >= AUTO_MS) autosave(); });

  /* ================= live site + folder ================= */
  /** Read assets/content.js as the site serves it right now. → {content|null, meta|null, missing?, error?} */
  async function fetchServed() {
    try {
      const r = await fetch(new URL('../assets/content.js?t=' + Date.now(), location.href), { cache: 'no-store' });
      if (r.status === 404) return { content: null, meta: null, missing: true };
      if (!r.ok) return { error: true };
      const txt = await r.text(), m = txt.match(/MIRAS_CONTENT\s*=\s*([\s\S]*?);?\s*$/);
      if (!m) return { content: null, meta: null, missing: !txt.trim() };
      const s = m[1].trim(); if (s === 'null' || s === '') return { content: null, meta: null, missing: true };
      const content = JSON.parse(s); return { content, meta: content?.meta || null };
    } catch (e) { return { error: true }; }
  }
  const liveFull = (served = MA.content.served) => contentOf(MA.mergeContent(C().defaults, contentOf(served || {})));
  let folderMem; // handle chosen this session (also kept in IndexedDB so it survives reloads)
  async function getFolder() {
    if (folderMem !== undefined) return folderMem;
    // IndexedDB can stall (private windows, blocked storage): never let the page wait on it for long
    const got = await idb(MA.idb.get('handles', 'site').then(x => x || null), undefined, 1200);
    if (got === undefined) return null;
    if (folderMem === undefined) folderMem = got;
    return folderMem;
  }
  async function checkFolder(dir) {
    try { await dir.getFileHandle('index.html'); await dir.getDirectoryHandle('assets'); return true; } catch (e) { return false; }
  }
  async function permOf(dir) { try { return dir.queryPermission ? await dir.queryPermission({ mode: 'readwrite' }) : 'granted'; } catch (e) { return 'prompt'; } }
  const userErr = (msg, cause = msg) => Object.assign(new Error(String(cause)), { userMsg: msg });
  /** Ask for a folder, check it is the site, remember it. → handle | null (cancelled); throws {userMsg} if it isn't the site */
  async function chooseFolder() {
    let dir;
    try { dir = await window.showDirectoryPicker({ id: 'miras-site', mode: 'readwrite' }); } catch (e) { if (e?.name === 'AbortError') return null; throw userErr(t('errWrite', { msg: esc(e?.message || '') })); }
    if (!(await checkFolder(dir))) throw userErr(t('badFolder'));
    folderMem = dir;
    idb(MA.idb.put('handles', 'site', dir)); // not cloneable (tests) or storage blocked: it is still kept for this session
    return dir;
  }
  async function forgetFolder() { folderMem = null; await idb(MA.idb.del('handles', 'site')); }
  async function writeFile(dir, name, data) { const fh = await dir.getFileHandle(name, { create: true }); const w = await fh.createWritable(); await w.write(data); await w.close(); }
  async function readFile(dir, name) { try { return await (await (await dir.getFileHandle(name)).getFile()).text(); } catch (e) { return null; } }

  /* ---- index.html head, robots.txt, sitemap.xml (folder publish) ---- */
  const HEAD_RE = /<!-- miras:head\b[^>]*-->[\s\S]*?<!-- \/miras:head -->/;
  /**
   * index.html with the SEO tags in one marked block in its head (`<!-- miras:head -->` … `<!-- /miras:head -->`).
   * The first time, the tags the block takes over (title, description, theme-color, canonical, hreflang alternates,
   * Open Graph, X, JSON-LD) are taken out of the head; nothing outside the head changes. → html | null (no head)
   */
  function patchHead(html, tags) {
    html = String(html ?? '');
    const m = /<head\b[^>]*>/i.exec(html), end = html.search(/<\/head\s*>/i);
    if (!m || end < 0 || end < m.index) return null;
    const open = m.index + m[0].length; let head = html.slice(open, end);
    const block = `<!-- miras:head: written by the MIRAS admin when you publish. Change these in SEO & sharing. -->\n${String(tags ?? '').trim()}\n<!-- /miras:head -->`;
    if (HEAD_RE.test(head)) head = head.replace(HEAD_RE, () => block);
    else {
      for (const re of [/<title\b[^>]*>[\s\S]*?<\/title>[ \t]*\r?\n?/gi,
        /<meta\b[^>]*\b(?:name|property)\s*=\s*["'](?:description|theme-color|og:[\w:-]+|twitter:[\w:-]+)["'][^>]*>[ \t]*\r?\n?/gi,
        /<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>[ \t]*\r?\n?/gi,
        /<link\b(?=[^>]*\brel\s*=\s*["']alternate["'])(?=[^>]*\bhreflang\s*=)[^>]*>[ \t]*\r?\n?/gi,
        /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>[ \t]*\r?\n?/gi]) head = head.replace(re, '');
      const at = /<meta\b[^>]*\bname\s*=\s*["']viewport["'][^>]*>[ \t]*\r?\n?/i.exec(head) || /<meta\b[^>]*\bcharset\b[^>]*>[ \t]*\r?\n?/i.exec(head);
      const i = at ? at.index + at[0].length : 0;
      head = head.slice(0, i) + (at && !/\n$/.test(at[0]) ? '\n' : '') + block + '\n' + head.slice(i);
    }
    return html.slice(0, open) + head + html.slice(end);
  }
  /** robots.txt and sitemap.xml next to index.html. Missing files are created from SEO & sharing; existing ones are respected
      (an existing sitemap only gets today's date on the home page entries). → { robots, sitemap: 'new'|'date'|'kept'|null } */
  async function writeSeoFiles(dir) {
    const r = { robots: null, sitemap: null }, seo = MA.seo;
    if (typeof seo?.robots !== 'function' || typeof seo?.sitemap !== 'function') return r;
    const day = MA.qDay(Date.now());
    if ((await readFile(dir, 'robots.txt')) == null) { await writeFile(dir, 'robots.txt', seo.robots()); r.robots = 'new'; } else r.robots = 'kept';
    const fresh = String(seo.sitemap()).replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${day}</lastmod>`), map = await readFile(dir, 'sitemap.xml');
    if (map == null) { await writeFile(dir, 'sitemap.xml', fresh); r.sitemap = 'new'; return r; }
    const homes = [...fresh.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(x => x[1]);
    const next = map.replace(/<url>([\s\S]*?)<\/url>/g, (all, body) => {
      const loc = /<loc>\s*([^<]+?)\s*<\/loc>/.exec(body)?.[1];
      return loc && homes.includes(loc) ? all.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${day}</lastmod>`) : all;
    });
    if (next !== map) { await writeFile(dir, 'sitemap.xml', next); r.sitemap = 'date'; } else r.sitemap = 'kept';
    return r;
  }
  /**
   * Uploads first, then index.html / robots / sitemap, then the backup of content.js, and content.js last,
   * so the live file never points at a missing image. opts: { files: robots + sitemap, head: SEO tags (string) for index.html }
   * → { robots, sitemap, head: 'done'|'same'|'fail'|null }
   */
  async function writeToFolder(dir, text, uploads, { files = false, head = '' } = {}) {
    let p = await permOf(dir);
    if (p !== 'granted' && dir.requestPermission) p = await dir.requestPermission({ mode: 'readwrite' });
    if (p !== 'granted') throw userErr(t('errPerm'));
    if (!(await checkFolder(dir))) throw userErr(t('badFolder'));
    const assets = await dir.getDirectoryHandle('assets'), rep = { robots: null, sitemap: null, head: null };
    if (uploads.length) { const up = await assets.getDirectoryHandle('uploads', { create: true }); for (const u of uploads) await writeFile(up, u.targetPath.split('/').pop(), u.blob); }
    if (head) {
      const html = await readFile(dir, 'index.html'), next = html == null ? null : patchHead(html, head);
      if (next == null) rep.head = 'fail';
      else if (next === html) rep.head = 'same';
      else { await writeFile(dir, 'index.previous.html', html); await writeFile(dir, 'index.html', next); rep.head = 'done'; }
    }
    if (files) Object.assign(rep, await writeSeoFiles(dir));
    const prev = await readFile(assets, 'content.js');
    if (prev != null) await writeFile(assets, 'content.previous.js', prev);
    await writeFile(assets, 'content.js', text);
    return rep;
  }

  /* ---- automatic backups: a private folder, never the site folder (backups hold client details) ---- */
  let backupMem;
  async function getBackupDir() {
    if (backupMem !== undefined) return backupMem;
    const got = await idb(MA.idb.get('handles', 'backup').then(x => x || null), undefined, 1200);
    if (got === undefined) return null;
    if (backupMem === undefined) backupMem = got;
    return backupMem;
  }
  async function chooseBackupDir() {
    let dir;
    try { dir = await window.showDirectoryPicker({ id: 'miras-backups', mode: 'readwrite' }); } catch (e) { if (e?.name === 'AbortError') return null; throw userErr(t('errWrite', { msg: esc(e?.message || '') })); }
    const site = await getFolder();
    let same = false; try { same = !!(site && dir.isSameEntry && await dir.isSameEntry(site)); } catch (e) {}
    let page = false; try { await dir.getFileHandle('index.html'); page = true; } catch (e) {}
    if (same || page) throw userErr(t('bSite'));
    backupMem = dir; idb(MA.idb.put('handles', 'backup', dir));
    return dir;
  }
  async function forgetBackupDir() { backupMem = null; await idb(MA.idb.del('handles', 'backup')); }
  const toDataURL = async b => { const u8 = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return `data:${b.type || 'application/octet-stream'};base64,${btoa(s)}`; };
  /** The same file as Settings › Export a backup (schema 'miras.admin.backup'), so Settings › Restore reads it. */
  async function buildBackup() {
    if (typeof MA.settings?.buildBackup === 'function') return MA.settings.buildBackup();
    const ls = {}; try { for (const k of Object.keys(localStorage)) if (k.startsWith('miras.admin.') || k === 'miras.cms.draft') ls[k] = localStorage.getItem(k); } catch (e) {}
    const files = {}; let filesOk = true;
    const keys = await idb(MA.idb.keys('files'), null, 4000);
    if (!Array.isArray(keys)) filesOk = false;
    else for (const k of keys) {
      const v = await idb(MA.idb.get('files', k), undefined, 4000);
      if (v === undefined) { filesOk = false; continue; }
      if (v instanceof Blob) { try { files[String(k)] = { __blob: await toDataURL(v), type: v.type, name: v instanceof File ? v.name : undefined }; } catch (e) { filesOk = false; } } else files[String(k)] = v;
    }
    return { schema: 'miras.admin.backup', version: 1, exportedAt: new Date().toISOString(), by: MA.team?.me?.()?.name || 'MIRAS', origin: location.origin, localStorage: ls, files, ...(filesOk ? {} : { filesMissing: true }) };
  }
  /** Write today's backup into <dir>/backups/. ask: request permission (needs a click). → {ok, file} | {perm: true} | {err} */
  async function backupTo(dir, { ask = false } = {}) {
    try {
      let p = await permOf(dir);
      if (p !== 'granted' && ask && dir.requestPermission) p = await dir.requestPermission({ mode: 'readwrite' });
      if (p !== 'granted') return { perm: true };
      const data = await buildBackup(), file = `miras-admin-backup-${MA.qDay(Date.now())}.json`;
      const sub = await dir.getDirectoryHandle('backups', { create: true });
      await writeFile(sub, file, JSON.stringify(data, null, 1));
      MA.backup?.mark?.();
      return { ok: true, file: `${dir.name}/backups/${file}` };
    } catch (e) { return { err: String(e?.message || e?.name || '') }; }
  }
  const backupToast = r => r.ok ? MA.toast(esc(t('rBackup', { name: r.file })), { icon: 'check' }) : MA.toast(esc(r.perm ? t('rBackupPerm') : t('rBackupFail', { msg: r.err })), { tone: 'bad' });

  /* ---- uploaded images ('media:<id>' in the draft until they are published as site files) ---- */
  const MEDIA_RE = /^media:([\w-]+)$/;
  /** Every 'media:<id>' string in a value, with its path. → [{path, id}] */
  function mediaRefs(v, pre = '', out = []) {
    if (typeof v === 'string') { const m = MEDIA_RE.exec(v.trim()); if (m) out.push({ path: pre, id: m[1] }); }
    else if (Array.isArray(v)) v.forEach((x, i) => mediaRefs(x, pre ? pre + '/' + i : String(i), out));
    else if (MA.isObj(v)) for (const [k, x] of Object.entries(v)) mediaRefs(x, pre ? pre + '/' + k : k, out);
    return out;
  }
  /** Uploaded images ('media:<id>') a payload references, with their blobs. */
  async function uploadsFor(payload) {
    if (typeof MA.media?.referenced !== 'function') return [];
    if (MA.media.ready) await Promise.race([MA.media.ready, wait(1500)]).catch(() => {});
    let list = []; try { list = MA.media.referenced(payload) || []; } catch (e) { list = []; }
    for (const u of list) if (!u.blob) u.blob = await idb(MA.idb.get('files', u.id));
    return list;
  }
  const rewrite = payload => typeof MA.media?.rewrite === 'function' ? MA.media.rewrite(payload) : payload;
  /** 'media:<id>' values that can't be published: no upload with that id here, or its file is gone from this browser. → [{path, id}] */
  async function missingMedia(src) {
    const refs = mediaRefs(src); if (!refs.length) return [];
    const have = new Set((await uploadsFor(src)).filter(u => u.blob).map(u => u.id));
    return refs.filter(r => !have.has(r.id));
  }
  async function warnMissing() {
    const miss = await missingMedia(C().draft); if (!miss.length) return;
    MA.toast(esc(t('mmAfter', { n: miss.length })), { tone: 'bad', ms: 12000, action: MA.can('content.publish') ? { label: t('mmReview'), run: () => openPublish() } : undefined });
  }
  /** Replace the draft without an undo step. Used only to keep the draft equal to what was just published:
      ⌘Z must not bring back a change that is already live. (MA.content.adopt, when the core has it.) */
  function adopt(next) {
    if (typeof C().adopt === 'function') return C().adopt(next);
    C().draft = C().normalize(MA.clone(next), C().published);
  }
  /** A draft can hold 'media:<id>' where the live site already has that upload's file ('assets/uploads/…'): the same picture,
      left behind by an older Download or Copy publish. Point the draft at the file, quietly. → number fixed */
  function healMedia() {
    if (!C().draft || !MA.can('content.edit') || typeof MA.media?.rewrite !== 'function') return 0;
    let fix = []; try { fix = C().changes().filter(c => typeof c.after === 'string' && MEDIA_RE.test(c.after) && typeof c.before === 'string' && /^assets\/uploads\//.test(c.before) && MA.media.rewrite({ v: c.after }).v === c.before); } catch (e) { return 0; }
    if (!fix.length) return 0;
    const next = MA.clone(C().draft); fix.forEach(c => MA.path.set(next, c.path, c.before));
    adopt(next); C().save();
    MA.site?.broadcast?.({ type: 'miras:content', content: C().forPreview() });
    MA.emit('content:change', { path: '', by: 'sync' }); MA.updateStatus?.();
    return fix.length;
  }
  MA.on('content:ready', () => setTimeout(healMedia, 0));
  MA.on('content:rebase', () => setTimeout(healMedia, 0));
  MA.on('media', MA.debounce(() => healMedia(), 300));
  MA.on('content:change', MA.debounce(() => healMedia(), 300)); // a redo, or picking an upload that is already published

  /* ---- scheduled changes (content.js `schedule`, applied by the site once `at` has passed) ---- */
  const MIN_AHEAD = 5; // minutes
  /** 'YYYY-MM-DD' + 'HH:MM' read as Qatar time (UTC+3 all year) → ms, or NaN */
  const atOf = (date, time) => /^\d{4}-\d{2}-\d{2}$/.test(date || '') && /^\d{2}:\d{2}$/.test(time || '') ? Date.parse(`${date}T${time}:00+03:00`) : NaN;
  /** Leaves of an overrides object; an array counts as one value (the site replaces arrays whole). → [[path, value]] */
  function leavesOf(o, pre = '', out = []) { for (const [k, v] of Object.entries(MA.isObj(o) ? o : {})) { const p = pre ? pre + '/' + k : k; if (MA.isObj(v)) leavesOf(v, p, out); else out.push([p, v]); } return out; }
  const sameVal = (a, b) => MA.eq(a, b) || (typeof a === 'string' && typeof b === 'string' && MA.eq(rewrite({ v: a }).v, rewrite({ v: b }).v));
  const schedOf = () => (C().schedule || []).filter(e => MA.isObj(e) && Number.isFinite(Date.parse(e.at))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  /** The schedule for the next file. Pending entries stay. A due entry is already on the site: keep only the parts your draft
      doesn't hold and you haven't changed since, so a publish never quietly undoes it and never overrules your newer edits. */
  function keptSchedule(now = Date.now()) {
    const out = [];
    for (const e of schedOf()) {
      if (!MA.isObj(e.overrides)) continue;
      if (Date.parse(e.at) > now) { out.push(e); continue; }
      const keep = {};
      for (const [p, v] of leavesOf(e.overrides)) { const d = MA.path.get(C().draft, p); if (sameVal(d, v) || !MA.eq(d, MA.path.get(C().published, p))) continue; MA.path.set(keep, p, MA.clone(v)); }
      if (Object.keys(keep).length) out.push({ ...e, overrides: keep });
    }
    return out;
  }
  /** content.js for "now" (the draft) or "later" (what is live, plus the draft's changes as a schedule entry). */
  function payloadFor({ later, at, note }) {
    const sched = keptSchedule();
    if (!later) return C().publishPayload(note, { schedule: sched });
    const entry = { ...C().schedulePayload(at, note), overrides: MA.overridesOf(C().published, C().draft) || {} };
    return C().publishPayload(note, { from: 'published', schedule: [...sched, entry] });
  }

  /* ---- dry run: the site applies the file in a hidden ?cms=export frame, the way the live site would ---- */
  const partsText = errors => listFmt([...new Set(errors.map(x => x.part).filter(Boolean))].map(p => MA.site?.partName ? MA.site.partName(p) : p));
  /** → { state: 'ok'|'bad'|'unknown', errors: [{part, message}] }. 'unknown' = the site didn't answer in time. */
  function siteCheck(contents, ms = 12000) {
    return new Promise(resolve => {
      if (!MA.site?.url || !contents.length) { resolve({ state: 'unknown', errors: [] }); return; }
      const f = h('iframe', { src: MA.site.url + '?cms=export', title: 'publish check', 'aria-hidden': 'true', tabindex: '-1', style: 'position:fixed;left:-3000px;top:0;width:1280px;height:800px;border:0;visibility:hidden;pointer-events:none' });
      const errors = [], id = MA.uid('chk'); let i = 0, done = false;
      const finish = state => { if (done) return; done = true; removeEventListener('message', on); clearTimeout(timer); setTimeout(() => f.remove(), 30); resolve({ state, errors }); };
      const send = () => { try { f.contentWindow.postMessage({ type: 'miras:check', id: id + ':' + i, content: contents[i] }, location.origin); } catch (e) { finish('unknown'); } };
      const on = e => {
        if (e.source !== f.contentWindow || e.origin !== location.origin || !MA.isObj(e.data)) return;
        if (e.data.type === 'miras:ready') { send(); return; }
        if (e.data.type !== 'miras:checked' || e.data.id !== id + ':' + i) return;
        for (const x of Array.isArray(e.data.errors) ? e.data.errors : []) { const part = String(x?.part || '').slice(0, 60); if (part && !errors.some(y => y.part === part)) errors.push({ part, message: String(x?.message || '').slice(0, 300) }); }
        if (++i < contents.length) send(); else finish(errors.length ? 'bad' : 'ok');
      };
      const timer = setTimeout(() => finish(errors.length ? 'bad' : 'unknown'), ms);
      addEventListener('message', on); document.body.append(f);
    });
  }

  /* ---- after a Download or Copy publish: watch the served file until it is the new one ---- */
  let liveTimer = 0, liveSince = 0;
  function watchLive(first = 20e3) {
    clearTimeout(liveTimer); liveTimer = 0;
    const meta = C().publishedMeta; if (!meta?.at || meta.live) { liveSince = 0; return; }
    if (!liveSince) liveSince = Date.now();
    liveTimer = setTimeout(checkLive, first);
  }
  async function checkLive() {
    clearTimeout(liveTimer); liveTimer = 0;
    const meta = C().publishedMeta; if (!meta?.at || meta.live) { liveSince = 0; return false; }
    const sv = document.hidden ? null : await fetchServed();
    if (sv?.meta?.publishedAt && sv.meta.publishedAt === C().publishedMeta?.at) { markLive(sv); return true; }
    if (liveSince && Date.now() - liveSince < 8 * 3600e3) liveTimer = setTimeout(checkLive, 60e3); else liveSince = 0;
    return false;
  }
  function markLive(sv) {
    clearTimeout(liveTimer); liveTimer = 0; liveSince = 0;
    MA.content.served = sv.content; if (C().publishedMeta) C().publishedMeta.live = true;
    MA.updateStatus?.(); MA.emit('history:live', sv.meta); MA.toast(t('nowLive'), { icon: 'check' });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && liveSince) { clearTimeout(liveTimer); liveTimer = setTimeout(checkLive, 1500); } });
  MA.on('content:ready', () => { if (C().publishedMeta?.at && C().publishedMeta.live === false) watchLive(5e3); });

  /* ================= publish flow (MA.publish.open) ================= */
  let pubOpen = null;
  const PUB_OPTS = 'history.pubOpts';
  /** SEO tags for index.html as they will be after this publish (uploads already pointing at their site files). */
  function tagsFor(draft) {
    if (typeof MA.seo?.headTags !== 'function') return '';
    const keep = C().draft;
    try { C().draft = draft; return MA.seo.headTags(); } catch (e) { return ''; } finally { C().draft = keep; }
  }
  const planKey = o => MA.hash([o.later, o.at, o.note, C().overrides(), C().schedule, C().publishedMeta?.at || null]);
  /** Everything a publish writes, prepared before the click (so Copy runs inside the click). */
  async function makePlan(o) {
    const key = planKey(o), payload = payloadFor(o), ups = await uploadsFor(payload), filePayload = rewrite(payload);
    const missing = [...new Set([...mediaRefs(filePayload).map(r => r.id), ...ups.filter(u => !u.blob).map(u => u.id)])];
    return { ...o, key, payload, filePayload, ups, missing, tags: o.later ? '' : tagsFor(rewrite(C().draft)), text: '' };
  }
  /** Fresh timestamp at the moment of publishing, and the file text. */
  function stamp(plan) {
    const at = new Date().toISOString();
    plan.payload.meta.publishedAt = at; plan.filePayload.meta.publishedAt = at;
    plan.text = C().fileText(plan.filePayload);
    return plan;
  }
  function openPublish() {
    if (!C().draft) { MA.toast(MA.t('loading')); return null; }
    if (!MA.can('content.publish')) { MA.toast(t('noPerm'), { tone: 'bad' }); return null; }
    if (pubOpen) return pubOpen;
    const saved = MA.db.get(PUB_OPTS, {}) || {}, today = MA.qDay(Date.now());
    const st = { step: 0, method: null, note: '', folder: null, folderPerm: '', busy: false, err: '', done: null, ups: [], expanded: new Set(),
      when: 'now', date: MA.addDays ? MA.addDays(today, 1) : today, time: '09:00', files: saved.files !== false, head: !!saved.head, backup: saved.backup !== false,
      backupDir: null, missing: [], missingKey: '', plan: null, check: null, copyFail: null };
    const offs = [];
    const L = ui.modal({ title: t('pubTitle'), size: 'wide', body: () => {}, onClose: () => { offs.forEach(f => f()); pubOpen = null; } });
    pubOpen = L;
    L.el.classList.add('m-history', 'hs-pub');
    const steps = h('ol.hs-steps', { 'aria-label': t('pubTitle') }), main = h('div.hs-pub-main'), foot = h('div.modal-foot.hs-pub-foot');
    L.body.append(steps, main); L.el.append(foot);
    const STEPS = ['stReview', 'stWhere', 'stConfirm'];
    const changes = () => C().changes();
    const saveOpts = () => MA.db.set(PUB_OPTS, { files: st.files, head: st.head, backup: st.backup });
    const later = () => st.when === 'later';
    const atMs = () => atOf(st.date, st.time);
    const atErr = () => !later() ? '' : !Number.isFinite(atMs()) ? t('atBad') : atMs() - Date.now() < MIN_AHEAD * 60e3 ? t('atPast', { n: MIN_AHEAD }) : '';
    const opts = () => ({ later: later(), at: later() && Number.isFinite(atMs()) ? new Date(atMs()).toISOString() : null, note: st.note.trim() });
    const headOn = () => st.method === 'folder' && st.head && !later() && typeof MA.seo?.headTags === 'function';
    const filesOn = () => st.method === 'folder' && st.files && typeof MA.seo?.robots === 'function';
    const go = s => { st.step = s; st.err = ''; draw(); L.body.scrollTop = 0; };
    const canNext = () => st.missing.length ? false : st.step === 0 ? changes().length > 0 : st.step === 1 ? !!st.method && (st.method !== 'folder' || !!st.folder) && !atErr() : true;

    /* the images check runs again whenever the draft changes */
    let mmRun = 0;
    async function refreshMissing() {
      const run = ++mmRun, list = await missingMedia(C().draft);
      if (run !== mmRun || pubOpen !== L) return;
      const key = list.map(r => r.path + '=' + r.id).join('|'); if (key === st.missingKey) return;
      const had = st.missing.length; st.missing = list; st.missingKey = key;
      if (list.length && !had) MA.announce?.(t('mmT'));
      if (!st.busy && !st.done && !st.copyFail) draw();
    }
    /* the plan (payload, uploads, file) and the site's dry run, ready before the publish click */
    let planP = null;
    function ensurePlan() {
      const o = opts(), key = planKey(o);
      if (st.plan?.key === key) return Promise.resolve(st.plan);
      if (planP?.key === key) return planP.p;
      const p = makePlan(o).then(pl => {
        if (planP?.p === p) planP = null;
        if (planKey(opts()) !== pl.key) return pl; // the draft changed meanwhile: a newer plan is on its way
        st.plan = pl; st.ups = pl.ups; checkFor(pl);
        if (pubOpen === L && st.step === 2 && !st.busy && !st.done && !st.copyFail) draw();
        return pl;
      });
      planP = { key, p };
      return p;
    }
    function checkFor(plan) {
      if (st.check?.key === plan.key) return st.check.p;
      const fp = plan.filePayload, contents = [fp];
      if (fp.schedule?.length) contents.push({ ...fp, schedule: fp.schedule.map(e => ({ ...e, at: new Date(0).toISOString() })) }); // every scheduled change applied too
      const c = st.check = { key: plan.key, state: 'run', errors: [] };
      c.p = siteCheck(contents).then(r => { Object.assign(c, r); if (st.check === c && pubOpen === L && st.step === 2 && !st.busy && !st.done && !st.copyFail) draw(); return c; });
      return c.p;
    }

    function drawSteps() {
      steps.innerHTML = '';
      STEPS.forEach((k, i) => {
        const state = st.done || i < st.step ? 'done' : i === st.step ? 'now' : 'next';
        steps.append(h('li', { class: 'hs-step ' + state, 'aria-current': state === 'now' ? 'step' : null },
          h('button', { type: 'button', disabled: !!st.done || st.busy || !!st.copyFail || i >= st.step, onclick: () => go(i) },
            h('span.hs-step-n', { html: state === 'done' ? MA.icon('check', 'sm') : esc(n$(i + 1)) }), h('span', t(k)))));
      });
    }
    function pickImage(path) {
      if (!MA.media?.picker) { L.close(); MA.go('#/media'); return; }
      MA.media.picker({ value: C().get(path) }).then(v => { if (v) C().set(path, v, { coalesce: false }); });
    }
    function resetImage(path) {
      const was = MA.clone(C().get(path)), label = describe(path, C().draft).label;
      if (C().reset(path, 'default')) MA.toast(t('discardedOne', { what: esc(label) }), { undo: () => C().set(path, was, { coalesce: false }) });
    }
    function drawMissing() {
      if (!st.missing.length) return;
      const can = MA.can('content.edit');
      main.append(h('div.callout.bad.hs-missing', MA.frag(MA.icon('warn')), h('div.grow', h('b', t('mmT')), h('p.small', t('mmX')),
        h('ul.hs-mm-list', st.missing.map(r => h('li', { dataset: { path: r.path } }, h('span.grow', t('mmRow', { slot: describe(r.path, C().draft).label })),
          can ? ui.btn(t('mmChoose'), { size: 'sm', kind: 'ghost', onclick: () => pickImage(r.path) }) : null,
          can ? ui.btn(t('mmReset'), { size: 'sm', kind: 'ghost', onclick: () => resetImage(r.path) }) : null))))));
    }
    function drawReview() {
      const list = changes();
      if (!list.length) { main.append(ui.empty({ title: t('pubEmptyT'), text: esc(t('pubEmptyX')), pose: 'present', compact: true })); return; }
      main.append(h('p.muted.hs-pub-lead', t('reviewLead', { n: list.length })),
        diffView(C().published, C().draft, { discard: true, expanded: st.expanded }));
    }
    function folderLine() {
      const box = h('div.hs-folder');
      box.append(h('span.hs-folder-ic', { html: MA.icon('folder', 'sm') }));
      if (st.folder) box.append(h('div.grow', h('b.hs-folder-name', st.folder.name || '—'), h('span.small.faint', st.folderPerm === 'granted' ? t('folderOk') : t('folderAsk'))));
      else box.append(h('span.grow.small.faint', t('folderNone')));
      const b = ui.btn(st.folder ? t('changeFolder') : t('chooseFolder'), { size: 'sm', kind: st.folder ? 'ghost' : '', onclick: async e => {
        e.stopPropagation(); st.err = '';
        try { const d = await chooseFolder(); if (d) { st.folder = d; st.folderPerm = await permOf(d); st.method = 'folder'; } } catch (err) { st.err = err.userMsg || t('errWrite', { msg: esc(err.message) }); }
        draw();
      } });
      b.classList.add('hs-choose'); box.append(b);
      return box;
    }
    const extraRow = (on, set, label, sub, disabled, cls) => {
      const id = MA.uid('hx'), sw = ui.switch(on, set, '', { disabled, labelledby: id + '-l', describedby: id + '-d' });
      return h('div', { class: 'hs-extra' + (cls ? ' ' + cls : '') + (disabled ? ' off' : '') }, h('div.grow', h('b', { id: id + '-l' }, label), h('span.small.muted', { id: id + '-d' }, sub)), sw);
    };
    function drawWhen() {
      const lid = MA.uid('hw'), box = h('div.hs-when', h('p.label', { id: lid }, t('when')));
      const seg = ui.seg([{ value: 'now', label: t('whenNow') }, { value: 'later', label: t('whenLater') }], st.when, v => { st.when = v; st.err = ''; draw(); }, { labelledby: lid });
      seg.classList.add('hs-when-seg'); box.append(seg);
      if (later()) {
        const err = h('p.err.hs-at-err', { id: lid + '-e', role: 'alert' });
        const sync = () => {
          const m = atErr(); err.textContent = m; err.hidden = !m;
          [dIn, tIn].forEach(x => { x.toggleAttribute('aria-invalid', !!m); x.setAttribute('aria-describedby', [lid + '-h', m ? lid + '-e' : ''].filter(Boolean).join(' ')); });
          const nb = foot.querySelector('.hs-next'); if (nb) nb.disabled = !canNext();
        };
        const dIn = h('input.input.hs-at-date', { type: 'date', value: st.date, min: today, oninput: e => { st.date = e.target.value; sync(); } });
        const tIn = h('input.input.mono.hs-at-time', { type: 'time', value: st.time, step: 300, oninput: e => { st.time = e.target.value; sync(); } });
        box.append(h('div.hs-at', ui.field(esc(t('atDate')), dIn), ui.field(esc(t('atTime')), tIn)), h('p.hint.hs-at-hint', { id: lid + '-h' }, t('atHint')), err);
        sync();
      }
      return box;
    }
    function drawWhere() {
      const opts = [
        { id: 'folder', icon: 'folder', title: t('wFolder'), sub: t('wFolderSub'), disabled: !fsOK() },
        { id: 'download', icon: 'download', title: t('wDownload'), sub: t('wDownloadSub') },
        { id: 'copy', icon: 'copy', title: t('wCopy'), sub: t('wCopySub') },
      ];
      const live = opts.filter(x => !x.disabled);
      const pick = id => { st.method = id; st.err = ''; draw(); main.querySelector(`.hs-opt[data-m="${id}"]`)?.focus({ preventScroll: true }); };
      const grp = h('div.hs-opts', { role: 'radiogroup', 'aria-label': t('dest') });
      opts.forEach(o => {
        const on = st.method === o.id;
        grp.append(h('div', { class: 'hs-opt' + (on ? ' on' : '') + (o.disabled ? ' off' : ''), role: 'radio', tabindex: o.disabled ? '-1' : (on || (!st.method && o.id === live[0].id)) ? '0' : '-1', 'aria-checked': String(on), 'aria-disabled': o.disabled ? 'true' : null, dataset: { m: o.id },
          onclick: e => { if (o.disabled || e.target.closest('.hs-folder')) return; pick(o.id); },
          onkeydown: e => {
            if (e.target.closest('.hs-folder')) return;
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!o.disabled) pick(o.id); }
            if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
              e.preventDefault(); const i = live.findIndex(x => x.id === (st.method || o.id)); const back = e.key === 'ArrowUp' || e.key === (MA.isRTL() ? 'ArrowRight' : 'ArrowLeft');
              pick(live[(i + (back ? -1 : 1) + live.length) % live.length].id);
            }
          } },
          h('span.hs-radio', { 'aria-hidden': 'true' }), h('span.hs-opt-ic', { html: MA.icon(o.icon) }),
          h('div.hs-opt-text', h('b', o.title), h('span.small.muted', o.sub), o.id === 'folder' && on ? folderLine() : null)));
      });
      main.append(grp);
      if (!fsOK()) main.append(h('div.callout.hs-nofs', { html: MA.icon('info') + `<div><b>${esc(t('noFsT'))}</b><br>${esc(t('noFsX'))}</div>` }));
      main.append(drawWhen());
      if (st.method === 'folder') {
        const ex = h('div.hs-extras', h('p.label', t('exT')));
        if (typeof MA.seo?.robots === 'function') ex.append(extraRow(st.files, v => { st.files = v; saveOpts(); }, t('exFiles'), t('exFilesSub'), false, 'hs-x-files'));
        if (typeof MA.seo?.headTags === 'function') ex.append(extraRow(st.head && !later(), v => { st.head = v; saveOpts(); }, t('exHead'), later() ? t('exHeadLater') : t('exHeadSub'), later(), 'hs-x-head'));
        if (st.backupDir) ex.append(extraRow(st.backup, v => { st.backup = v; saveOpts(); }, t('exBackup', { name: st.backupDir.name }), t('exBackupSub'), false, 'hs-x-backup'));
        if (ex.children.length > 1) main.append(ex);
      }
      const note = h('input.input.hs-noteinp', { value: st.note, placeholder: t('notePh'), maxLength: 140, oninput: e => { st.note = e.target.value; } });
      main.append(ui.field(esc(t('noteL')), note));
      if (st.ups.length) main.append(h('div.callout', { html: MA.icon('image') + `<span>${esc(t(st.method === 'folder' ? 'upFolder' : 'upManual', { n: st.ups.length }))}</span>` }));
      if (st.err) main.append(h('div.callout.bad', { role: 'alert', html: MA.icon('warn') + `<span>${st.err}</span>` }));
    }
    function confirmSentence() {
      const list = changes(), names = areasOf(list), shown = names.length > 4 ? [...names.slice(0, 3), t('andMore', { n: names.length - 3 })] : names, areas = listFmt(shown);
      return later() ? t('confAt', { n: list.length, areas, when: qWhen(atMs()) }) : t('conf', { n: list.length, areas }) + ' ' + t('confKeep');
    }
    function drawCheck() {
      const pl = st.plan?.key === planKey(opts()) ? st.plan : null, ck = pl && st.check?.key === pl.key ? st.check : null, state = ck ? ck.state : 'run';
      const text = state === 'ok' ? t('ckOk') : state === 'bad' ? t('ckBad', { parts: partsText(ck.errors) }) : state === 'unknown' ? t('ckSkip') : t('ckRun');
      return h('p', { class: 'small hs-check', dataset: { state }, role: state === 'bad' ? 'alert' : 'status' }, MA.frag(MA.icon(state === 'ok' ? 'check' : state === 'bad' ? 'warn' : state === 'unknown' ? 'info' : 'refresh', 'sm')), h('span', text));
    }
    function drawConfirm() {
      ensurePlan();
      main.append(h('p.hs-sentence', confirmSentence()));
      if (later()) main.append(h('p.small.muted.hs-at-keep', t('confAtKeep')));
      const dest = st.method === 'folder' ? `${t('wFolder')} · ${st.folder?.name || ''}` : st.method === 'download' ? t('wDownload') : t('wCopy');
      const files = ['assets/content.js', ...st.ups.map(u => u.targetPath)];
      if (filesOn()) files.push('robots.txt', 'sitemap.xml');
      if (headOn()) files.push('index.html');
      main.append(h('dl.kv.hs-kv', h('dt', t('dest')), h('dd', dest), h('dt', t('when')), h('dd', later() ? t('atK', { when: qWhen(atMs()) }) : t('nowK')),
        h('dt', t('noteK')), h('dd', st.note.trim() || MA.t('none')), h('dt', t('files')), h('dd', h('span.hs-files', files.map(f => h('code', f))))));
      if (st.method === 'folder') main.append(h('p.small.faint.hs-backup', t('backupNote')));
      main.append(drawCheck());
      if (st.err) main.append(h('div.callout.bad', { role: 'alert', html: MA.icon('warn') + `<span>${st.err}</span>` }));
    }
    function drawCopyFail() {
      const ta = h('textarea.input.mono.hs-cf-text', { readOnly: true, rows: 10, spellcheck: false, dir: 'ltr', onfocus: e => e.target.select() });
      ta.value = st.copyFail.text;
      main.append(h('div.callout.bad.hs-cf', { role: 'alert' }, MA.frag(MA.icon('warn')), h('div', h('b', t('cfT')), h('p.small', t('cfX')))), ui.field(esc(t('cfLabel')), ta));
      setTimeout(() => { if (ta.isConnected) { ta.focus({ preventScroll: true }); ta.select(); } }, 0);
    }
    function drawDone() {
      const d = st.done, lines = [];
      if (d.later) lines.push(t('doneAt', { when: qWhen(d.at) }));
      if (d.method === 'folder') { lines.push(t('doneFolder', { name: d.folder })); lines.push(d.verified ? t('doneVerified') : t('doneUnverified', { name: d.folder })); }
      else if (d.later && d.method === 'download') lines.push(t('doneAtUpload'));
      else lines.push(t(d.method === 'download' ? 'doneDownload' : 'doneCopy'));
      const box = h('div.hs-done', MA.frag(MA.mira('ride')), h('h2.h2', t(d.later ? 'doneAtT' : 'doneT')), ...lines.map(l => h('p.muted', l)));
      if (d.method !== 'folder' && d.ups.length) {
        box.append(h('p.small', t('doneUploads')), h('div.hs-uplist', d.ups.map(u => h('div.hs-up', h('code', u.targetPath), u.blob ? ui.btn(t('dl'), { size: 'sm', kind: 'ghost', icon: 'download', onclick: () => MA.download(u.targetPath.split('/').pop(), u.blob) }) : null))));
      }
      const r = d.rep, rep = [];
      if (r?.robots) rep.push(t(r.robots === 'new' ? 'rRobotsNew' : 'rRobotsKept'));
      if (r?.sitemap) rep.push(t(r.sitemap === 'new' ? 'rMapNew' : r.sitemap === 'date' ? 'rMapDate' : 'rMapKept'));
      if (r?.head) rep.push(t(r.head === 'done' ? 'rHead' : r.head === 'same' ? 'rHeadSame' : 'rHeadFail'));
      if (rep.length) box.append(h('ul.hs-rep.small.muted', rep.map(x => h('li', x))));
      if (d.method === 'folder') {
        const b = d.backup, bl = h('div.hs-bk.small');
        if (b?.ok) bl.append(MA.frag(MA.icon('check', 'sm')), h('span', t('rBackup', { name: b.file })));
        else if (b?.perm) bl.append(h('span', t('rBackupPerm')), ui.btn(t('rBackupAllow'), { size: 'sm', kind: 'ghost', onclick: async () => { d.backup = await backupTo(st.backupDir, { ask: true }); draw(); } }));
        else if (b?.err != null) bl.append(h('span', t('rBackupFail', { msg: b.err })));
        else if (!st.backupDir && fsOK()) bl.append(h('span.muted', t('bkSuggest')), ui.btn(t('bChoose'), { size: 'sm', kind: 'ghost', icon: 'folder', onclick: async () => {
          try { const x = await chooseBackupDir(); if (x) { st.backupDir = x; d.backup = await backupTo(x, { ask: true }); } } catch (e) { d.backup = { err: e.userMsg || e.message || '' }; }
          draw();
        } }));
        if (bl.childNodes.length) box.append(bl);
      }
      main.append(box);
    }
    function drawFoot() {
      foot.innerHTML = '';
      if (st.done) {
        foot.append(h('span.grow'));
        if (MA.ctx().id !== ID) foot.append(ui.btn(t('openHistory'), { kind: 'ghost', onclick: () => { L.close(); MA.go('#/history'); } }));
        foot.append(ui.btn(MA.t('done'), { kind: 'primary', onclick: () => L.close() }));
        return;
      }
      if (st.copyFail) {
        foot.append(h('span.grow'), ui.btn(MA.t('back'), { kind: 'ghost', disabled: st.busy, onclick: () => { st.copyFail = null; draw(); } }));
        const rb = ui.btn(t('cfRetry'), { kind: 'ghost', icon: 'copy', disabled: st.busy, onclick: async () => { const pl = st.copyFail; if (await MA.copy(pl.text, t('copiedFile')) === true) await finishNow(pl, 'copy'); } }); rb.classList.add('hs-cf-retry');
        const db = ui.btn(t('cfDone'), { kind: 'primary', icon: 'publish', disabled: st.busy, onclick: () => finishNow(st.copyFail, 'copy') }); db.classList.add('hs-cf-done');
        foot.append(rb, db);
        return;
      }
      foot.append(h('span.grow.small.faint.hs-stepof', t('stepOf', { n: n$(st.step + 1), m: n$(3) })));
      if (st.step > 0) foot.append(ui.btn(MA.t('back'), { kind: 'ghost', disabled: st.busy, onclick: () => go(st.step - 1) }));
      else foot.append(ui.btn(MA.t('cancel'), { kind: 'ghost', onclick: () => L.close() }));
      if (st.step < 2) { const nb = ui.btn(t('next'), { kind: 'primary', disabled: !canNext(), onclick: () => next() }); nb.classList.add('hs-next'); foot.append(nb); }
      else {
        const k = st.method === 'folder' ? 'btnFolder' : st.method === 'download' ? 'btnDownload' : 'btnCopy';
        const bad = st.plan && st.check?.key === st.plan.key && st.check.state === 'bad';
        const pb = ui.btn(st.busy ? t('working') : t(later() ? k + 'At' : k), { kind: 'primary', icon: 'publish', disabled: st.busy || !changes().length || !!st.missing.length || !!bad, onclick: () => doPublish() }); pb.classList.add('hs-go'); foot.append(pb);
      }
    }
    function draw() {
      if (!L.el.isConnected) return;
      const top = L.body.scrollTop;
      drawSteps(); main.innerHTML = '';
      if (st.done) drawDone();
      else if (st.copyFail) drawCopyFail();
      else { drawMissing(); [drawReview, drawWhere, drawConfirm][st.step](); }
      drawFoot();
      L.body.scrollTop = top;
    }
    async function next() {
      if (!canNext()) { if (st.step === 1 && st.method === 'folder' && !st.folder) { st.err = t('errNoFolder'); draw(); } return; }
      if (st.step === 0) {
        if (!st.method) st.method = st.folder && fsOK() ? 'folder' : 'download';
        // which uploaded images travel with this publish (only redraw if there are some, so typing in the note isn't disturbed)
        uploadsFor(C().publishPayload('')).then(u => { const had = st.ups.length; st.ups = u; if ((u.length || had) && pubOpen === L && !st.busy && !st.done && st.step > 0) draw(); });
      }
      go(st.step + 1);
    }
    /** Record a publish that reached its destination. */
    async function finish(plan, method) {
      // keep the draft equal to what went out, without an undo step:
      //  · later: the changes now live in the file's schedule, so the draft goes back to what is live
      //  · now, with uploads: the images are site files now (same pictures), so ⌘Z or a reload never shows a phantom change
      keepLiveInHistory();
      if (plan.later) adopt(MA.clone(C().published)); else if (plan.ups.length) adopt(rewrite(C().draft));
      C().markPublished(plan.filePayload, { live: method === 'folder' });
      MA.site?.broadcast?.({ type: 'miras:content', content: C().forPreview() });
      if (plan.later) MA.activity.log({ action: 'schedule', target: plan.note, module: ID, href: '#/history?tab=live', meta: { at: plan.at } });
      MA.db.set('history.lastPublish', { at: plan.filePayload.meta.publishedAt, method, folder: method === 'folder' ? st.folder?.name || '' : '', uploads: plan.ups.map(u => ({ id: u.id, name: u.name, targetPath: u.targetPath })), schedule: plan.later ? plan.at : null });
      let verified = false, backup = null;
      if (method === 'folder') {
        const sv = await fetchServed(); verified = !!sv.meta && sv.meta.publishedAt === plan.filePayload.meta.publishedAt;
        if (verified) MA.content.served = sv.content;
        if (st.backupDir && st.backup) backup = await backupTo(st.backupDir);
      } else watchLive();
      st.copyFail = null; st.plan = null;
      st.done = { method, verified, ups: plan.ups, folder: st.folder?.name || '', later: plan.later, at: plan.at, rep: plan.rep || null, backup };
    }
    async function finishNow(plan, method) {
      if (st.busy) return;
      st.busy = true; draw();
      try { await finish(plan, method); } catch (e) { st.err = t('errWrite', { msg: esc(e.message || '') }); console.warn('[history] publish failed', e); }
      finally { st.busy = false; draw(); }
    }
    async function doPublish() {
      if (st.busy) return;
      st.busy = true; st.err = ''; draw();
      try {
        // nothing is awaited here when the plan and the check are ready, so Copy still runs inside the click
        const key = planKey(opts()), plan = st.plan?.key === key ? st.plan : await ensurePlan();
        if (plan.missing.length || st.missing.length) throw userErr(t('errMissingAny'));
        const ck = st.check?.key === plan.key && st.check.state !== 'run' ? st.check : await checkFor(plan);
        if (ck.state === 'bad') throw userErr(t('errCheck', { parts: esc(partsText(ck.errors)) }));
        stamp(plan);
        if (mediaRefs(plan.filePayload).length) throw userErr(t('errMissingAny')); // never write 'media:' into content.js
        if (st.method === 'folder') {
          if (!st.folder) throw userErr(t('errNoFolder'));
          try { plan.rep = await writeToFolder(st.folder, plan.text, plan.ups, { files: filesOn(), head: headOn() ? plan.tags : '' }); }
          catch (e) { throw e.userMsg ? e : userErr(t('errWrite', { msg: esc(e.message || e.name || '') }), e.message); }
        } else if (st.method === 'download') MA.download('content.js', plan.text, 'text/javascript');
        else if (await MA.copy(plan.text, t('copiedFile')) !== true) { st.copyFail = plan; return; } // nothing is marked published
        await finish(plan, st.method);
      } catch (e) { st.err = e.userMsg || t('errWrite', { msg: esc(e.message || '') }); if (!e.userMsg) console.warn('[history] publish failed', e); }
      finally { st.busy = false; draw(); }
    }
    // keep the review honest while it is open (discard, undo, edits in another tab)
    offs.push(MA.on('content:change', () => { refreshMissing(); if (!st.busy && !st.done && !st.copyFail && st.step !== 1) draw(); }));
    offs.push(MA.on('media', () => refreshMissing()));
    L.el.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !st.done && !st.copyFail) { e.preventDefault(); st.step < 2 ? next() : doPublish(); } });
    L.st = st; L.next = next; L.publish = doPublish; L.plan = ensurePlan;
    draw(); refreshMissing();
    Promise.all([getFolder(), fsOK() ? getBackupDir() : null]).then(async ([d, b]) => {
      if (d && fsOK()) { st.folder = d; st.folderPerm = await permOf(d); }
      if (b) st.backupDir = b;
      if (pubOpen === L && !st.busy && (d || b) && st.step !== 1) draw();
    });
    return L;
  }
  /** Before a publish replaces it, make sure what is live now can be found in history. */
  function keepLiveInHistory() {
    const pubOver = stripMeta(MA.overridesOf(C().defaults, C().published) || {});
    if (!Object.keys(pubOver).length) return;
    const has = MA.versions.list().some(v => (v.kind === 'publish' || v.note === t('liveBefore')) && MA.eq(v.content || {}, pubOver));
    if (!has) MA.versions.save({ kind: 'checkpoint', note: t('liveBefore'), content: pubOver });
  }

  /** Cancel a scheduled change: a new content.js without it (written to the site folder, or downloaded). */
  async function cancelSchedule(e) {
    if (!MA.can('content.publish') || !e) return false;
    const dir = fsOK() ? await getFolder() : null;
    if (!(await ui.confirm(t('sCancelQ'), esc(dir ? t('sCancelFolder', { name: dir.name }) : t('sCancelDl')), { ok: t('sCancel'), danger: true }))) return false;
    keepLiveInHistory();
    const payload = rewrite(C().publishPayload(t('sCancelNote'), { from: 'published', schedule: (C().schedule || []).filter(x => x !== e && x.id !== e.id) }));
    if (mediaRefs(payload).length) { MA.toast(esc(t('errMissingAny')), { tone: 'bad' }); return false; }
    const text = C().fileText(payload);
    try { if (dir) await writeToFolder(dir, text, []); else MA.download('content.js', text, 'text/javascript'); }
    catch (err) { MA.toast(err.userMsg || esc(t('errWrite', { msg: err.message || '' })), { tone: 'bad' }); return false; }
    C().markPublished(payload, { live: !!dir });
    MA.db.set('history.lastPublish', { at: payload.meta.publishedAt, method: dir ? 'folder' : 'download', folder: dir?.name || '', uploads: [] });
    MA.activity.log({ action: 'schedule.cancel', target: e.note || '', module: ID, href: '#/history?tab=live', meta: { at: e.at } });
    MA.toast(esc(t(dir ? 'sCancelled' : 'sCancelledDl')), { icon: 'check' });
    if (!dir) watchLive();
    return true;
  }

  /* ================= actions on versions + draft ================= */
  function restore(v) {
    if (!MA.can('content.edit')) { MA.toast(MA.t('readOnly'), { tone: 'bad' }); return; }
    const name = vName(v), prev = MA.clone(C().draft);
    let problems = []; try { problems = C().validate(v.content || {}) || []; } catch (e) {}
    saveAuto(t('beforeRestore', { name }));
    C().load(MA.versions.full(v), t('aRestore'));
    MA.activity.log({ action: 'restore', target: name, module: ID, href: '#/history', meta: { vid: v.id, kind: v.kind, at: v.at } });
    MA.toast(t('restored', { name: esc(name) }) + (problems.length ? ' ' + esc(t('repaired', { n: problems.length })) : ''), { undo: () => C().load(prev, MA.t('undo')) });
    warnMissing();
  }
  function deleteVersion(v) {
    if (!MA.can('content.edit') || v.kind === 'publish') return;
    const list = MA.versions.list(), i = list.findIndex(x => x.id === v.id); if (i < 0) return;
    list.splice(i, 1); saveVersions(list);
    MA.activity.log({ action: 'version.delete', target: vName(v), module: ID, href: '#/history', meta: { kind: v.kind, at: v.at } });
    MA.toast(t('deletedV'), { undo: () => { const l = MA.versions.list(); if (l.some(x => x.id === v.id)) return; l.splice(Math.min(i, l.length), 0, v); saveVersions(l); } });
  }
  async function editNote(v) {
    const val = await ui.prompt(t('notePrompt'), { value: v.note || '', label: t('noteK') });
    if (val == null) return;
    saveVersions(MA.versions.list().map(x => x.id === v.id ? { ...x, note: val.trim() } : x));
  }
  /** Download a file the site can use: uploads point at their site files; a file that would still say 'media:' is refused. */
  function downloadFile(over, meta) {
    const payload = rewrite({ ...MA.clone(stripMeta(over || {})), ...(Array.isArray(over?.schedule) ? { schedule: MA.clone(over.schedule) } : {}), meta });
    const miss = mediaRefs(payload);
    if (miss.length) { MA.toast(esc(t('mmAfter', { n: new Set(miss.map(m => m.id)).size })), { tone: 'bad' }); return false; }
    MA.download('content.js', C().fileText(payload), 'text/javascript');
    return true;
  }
  const downloadVersion = v => downloadFile(v.content, { publishedAt: v.at, by: v.by, note: v.note || '', schema: 'miras.content', version: 1 });
  function saveCheckpoint() {
    const v = MA.versions.save({ kind: 'checkpoint' });
    MA.activity.log({ action: 'checkpoint', module: ID, href: '#/history' });
    MA.toast(MA.t('checkpointSaved'), { action: { label: t('aNote'), run: () => editNote(MA.versions.get(v.id) || v) } });
    return v;
  }
  function discardAll() {
    if (!MA.can('content.edit')) return;
    const n = C().changes().length;
    if (!n) { MA.toast(t('nothingDiscard')); return; }
    const prev = MA.clone(C().draft);
    saveAuto(t('beforeDiscard'));
    C().load(MA.clone(C().published), t('discardAll'));
    MA.activity.log({ action: 'draft.discard', target: '', module: ID, href: '#/history', meta: { n } });
    MA.toast(esc(t('discarded', { n })), { undo: () => C().load(prev, MA.t('undo')) });
  }
  function exportDraft() {
    const name = `miras-draft-${MA.qDay(Date.now())}.json`;
    MA.download(name, JSON.stringify(C().exportDraft(), null, 2), 'application/json');
    MA.toast(t('exported', { name: esc(name) }));
  }
  /** Read a draft export (any version) or an assets/content.js file, checked against the site's shape (MA.content.parse).
      → { content (full, normalised), problems: [{path, kind, message}], kind } | { err } */
  function parseImport(raw) {
    const s0 = String(raw ?? '').replace(/^﻿/, '').trim(), js = s0.match(/MIRAS_CONTENT\s*=\s*([\s\S]*?);?\s*$/);
    let o = null; try { o = JSON.parse(js ? js[1].trim() : s0); } catch (e) {}
    const r = C().parse(s0);
    if (r.err) {
      if (r.err === 'schema') return { err: t('impSchema', { schema: esc(String(o?.schema || o?.meta?.schema || '').slice(0, 40)) }) };
      return { err: t({ json: 'impNotJson', object: 'impNotObj', empty: 'impNoKeys' }[r.err] || 'impNotObj') };
    }
    const problems = Array.isArray(r.problems) ? r.problems : [];
    // a file whose every part has the wrong type holds nothing usable: say so instead of "importing" nothing
    const body = MA.isObj(o) ? (o.v === 2 && MA.isObj(o.overrides) ? o.overrides : o) : {};
    const keys = Object.keys(body).filter(k => k in (C().defaults || {}));
    const bad = k => problems.some(p => p.path === k && p.kind === 'type');
    if (keys.length && keys.every(bad)) return { err: t('impShape', { key: esc(keys[0]) }) };
    return { content: r.content, problems, kind: r.kind };
  }
  function confirmRepairs(name, problems) {
    return new Promise(res => {
      let ok = false;
      const shown = problems.slice(0, 8);
      const L = ui.modal({ title: esc(t('impFixT')),
        body: el => el.append(h('p.hs-fix-lead', t('impFixX', { n: problems.length, name })), h('ul.hs-fixlist', shown.map(p => h('li', p.message || C().problemText(p)))),
          problems.length > shown.length ? h('p.small.faint', t('andMore', { n: problems.length - shown.length })) : ''),
        actions: [{ label: MA.t('cancel'), kind: 'ghost' }, { label: t('impFixGo'), kind: 'primary', run: () => { ok = true; } }], onClose: () => res(ok) });
      L.el.classList.add('m-history', 'hs-impfix');
    });
  }
  async function importDraft() {
    if (!MA.can('content.edit')) return;
    const [file] = await MA.pickFile({ accept: '.json,.js,application/json,text/javascript' });
    if (!file) return;
    let txt; try { txt = await MA.readText(file); } catch (e) { MA.toast(t('impRead'), { tone: 'bad' }); return; }
    const r = parseImport(txt);
    if (r.err) { ui.modal({ title: esc(t('impBadT')), body: h('div.callout.bad', { html: MA.icon('warn') + `<span>${r.err}</span>` }), actions: [{ label: MA.t('close'), kind: 'primary' }] }).el.classList.add('m-history', 'hs-impbad'); return; }
    if (r.problems.length && !(await confirmRepairs(file.name, r.problems))) return;
    const prev = MA.clone(C().draft);
    saveAuto(t('beforeImport', { name: file.name }));
    C().load(r.content, MA.t('import'));
    MA.versions.save({ kind: 'import', note: file.name });
    MA.activity.log({ action: 'draft.import', target: file.name, module: ID, href: '#/history' });
    MA.toast(t('imported', { name: esc(file.name) }), { undo: () => C().load(prev, MA.t('undo')) });
    warnMissing();
  }

  /* ---- preview a version or a scheduled change (the frame keeps that content, not the draft) ---- */
  function previewContent(name, full, footFn) {
    let fr = null; const offs = [];
    const content = () => { let c = full(); for (const fn of C().previewHooks) { try { c = fn(c) || c; } catch (e) {} } return c; };
    const send = () => fr?.post({ type: 'miras:content', content: content(), lang: fr.state.lang });
    const L = ui.drawer({ title: esc(t('previewOf', { name })), width: Math.min(1180, Math.round(innerWidth * .72)), onClose: () => { offs.forEach(f => f()); fr?.destroy(); },
      render: body => {
        body.classList.add('hs-pv-body');
        body.append(h('div.callout.hs-pv-note', { html: MA.icon('history') + `<span>${esc(t('previewNote', { name }))}</span>` }));
        fr = MA.site.frame({ bar: true, live: false }); fr.el.classList.add('hs-pv'); body.append(fr.el);
      },
      foot: footFn });
    L.el.classList.add('m-history', 'hs-drawer');
    offs.push(MA.on('site:frameReady', api => { if (api === fr) send(); }));
    // draft edits are broadcast to every live preview; this frame opted out (live: false), but put this content back anyway
    offs.push(MA.on('content:change', () => setTimeout(send, 60)));
    L.frame = fr; L.send = send;
    return L;
  }
  function previewVersion(v) {
    return previewContent(vName(v), () => MA.versions.full(v), (f, L) => {
      f.append(ui.btn(t('aCompare'), { kind: 'ghost', icon: 'columns', onclick: () => compare(v) }));
      if (MA.can('content.edit')) f.append(ui.btn(t('aRestore'), { kind: 'primary', icon: 'undo', onclick: () => { L.close(); restore(v); } }));
    });
  }
  const previewSchedule = e => previewContent(t('sPvName', { when: qWhen(e.at) }), () => C().normalize(MA.mergeContent(C().published, e.overrides || {}), C().published), (f, L) => {
    f.append(ui.btn(MA.t('close'), { kind: 'ghost', onclick: () => L.close() }));
  });
  function compareModal(title, before, after, { version } = {}) {
    const n = MA.diffContent(before, after).length;
    const L = ui.modal({ title: esc(title), size: 'xwide', body: el => { el.append(h('p.small.faint.hs-cmp-sum', t('cmpSummary', { n })), diffView(before, after)); },
      actions: [version && MA.can('content.edit') ? { label: t('aRestore'), kind: 'ghost', icon: 'undo', run: () => restore(version) } : null, { label: MA.t('close'), kind: 'primary' }].filter(Boolean) });
    L.el.classList.add('m-history', 'hs-cmp');
    return L;
  }
  const compare = v => compareModal(t('cmpTitle', { pair: arrow(vName(v), t('draftName')) }), contentOf(MA.versions.full(v)), C().draft, { version: v });
  async function compareLive() {
    const sv = await fetchServed();
    return compareModal(t('cmpTitle', { pair: arrow(t('liveName'), t('draftName')) }), liveFull(sv.error ? MA.content.served : sv.content), C().draft);
  }

  /* ================= the page ================= */
  const TABS = ['versions', 'activity', 'live'];
  const tabOf = ctx => TABS.includes(ctx.query.get('tab')) ? ctx.query.get('tab') : 'versions';
  const tabLabel = k => t({ versions: 'tabVersions', activity: 'tabActivity', live: 'tabLive' }[k]);
  let P = null;

  function render(view, ctx) {
    const root = h('div.m-history'); view.append(root);
    P = { root, tab: tabOf(ctx), sel: ctx.query.get('v') || null, expanded: new Set(), served: null,
      act: { q: ctx.query.get('q') || '', who: ctx.query.get('who') || '', mod: ctx.query.get('mod') || '', act: ctx.query.get('act') || '' } };
    const actions = [];
    if (MA.can('content.edit')) { const cb = ui.btn(t('checkpoint'), { kind: 'ghost', icon: 'flag', onclick: () => saveCheckpoint() }); cb.classList.add('hs-cpbtn'); actions.push(cb); }
    if (MA.can('content.publish')) { P.pubBtn = ui.btn(t('publishDots'), { kind: 'primary', icon: 'publish', onclick: () => openPublish() }); P.pubBtn.classList.add('hs-pubbtn'); actions.push(P.pubBtn); }
    root.append(ui.pageHead({ title: t('pageTitle'), sub: esc(t('lead')), actions }));
    P.strip = h('div.hs-strip'); root.append(P.strip);
    P.panel = h('div.hs-panel', { id: MA.uid('hsp') });
    P.tabs = ui.tabs(tabItems(), P.tab, v => setTab(v), { label: MA.L(TITLE), panel: P.panel }); P.tabs.classList.add('hs-tabs'); root.append(P.tabs, P.panel);
    drawStrip(); drawPanel();
    const refresh = MA.debounce(() => { if (!P?.root.isConnected) return; drawStrip(); if (P.tab === 'versions') drawDraftCard(); if (P.tab === 'live') drawPanel(); }, 120);
    MA.onView('content:change', refresh);
    MA.onView('content:published', () => { P.served = null; drawStrip(); drawPanel(); }); // re-read what the site serves
    MA.onView('history:live', () => { P.served = null; drawStrip(); if (P.tab === 'live') drawPanel(); });
    MA.onView('backup', () => { if (P.tab === 'live') drawPanel(); });
    MA.onView('versions', () => { redrawTabs(); if (P.tab === 'versions') drawPanel(); });
    MA.onView('activity', () => { redrawTabs(); if (P.tab === 'activity') drawPanel(); });
    MA.onView('team', () => drawPanel());
    MA.keys.bindView('j', () => move(1), () => t('kNext'));
    MA.keys.bindView('k', () => move(-1), () => t('kPrev'));
    MA.keys.bindView('enter', () => { const v = P.sel && MA.versions.get(P.sel); if (v && P.tab === 'versions') previewVersion(v); }, () => t('kOpen'));
    if (ctx.query.get('tab') === 'publish') setTimeout(() => { MA.setQuery({ tab: null }); openPublish(); }, 0);
    if (P.sel) setTimeout(() => P.root.querySelector(`.hs-v[data-id="${CSS.escape(P.sel)}"]`)?.scrollIntoView({ block: 'center' }), 60);
  }
  function update(ctx) {
    if (!P?.root.isConnected || ctx.sub.length) return false;
    if (ctx.query.get('tab') === 'publish') { MA.setQuery({ tab: null }); openPublish(); return true; }
    const tab = tabOf(ctx), sel = ctx.query.get('v');
    if (sel) P.sel = sel;
    if (tab !== P.tab) { P.tab = tab; P.tabs.set(tab); }
    drawPanel();
    if (sel) setTimeout(() => P.root.querySelector(`.hs-v[data-id="${CSS.escape(sel)}"]`)?.scrollIntoView({ block: 'center' }), 30);
    return true;
  }
  const tabItems = () => [
    { value: 'versions', label: t('tabVersions'), count: n$(MA.versions.list().length) },
    { value: 'activity', label: t('tabActivity'), count: n$(MA.activity.list().length) },
    { value: 'live', label: t('tabLive') },
  ];
  function redrawTabs() {
    if (!P?.root.isConnected) return;
    if (typeof P.tabs.setCount === 'function') { for (const it of tabItems()) if (it.count != null) P.tabs.setCount(it.value, it.count); return; }
    const nt = ui.tabs(tabItems(), P.tab, v => setTab(v), { label: MA.L(TITLE), panel: P.panel }); nt.classList.add('hs-tabs'); P.tabs.replaceWith(nt); P.tabs = nt;
  }
  function setTab(v) { P.tab = v; MA.setQuery({ tab: v === 'versions' ? null : v, v: null }); MA.setCrumbs([{ label: tabLabel(v) }]); drawPanel(); }

  const pendingNext = () => schedOf().find(e => Date.parse(e.at) > Date.now()) || null;
  function stateNow() {
    const n = C().changes().length, meta = C().publishedMeta || {}, any = !!(meta.at || MA.content.served);
    return { n, meta, mark: !any ? 'draft' : n ? 'edited' : 'live' };
  }
  function drawStrip() {
    const { n, meta, mark } = stateNow(), s = P.strip; s.innerHTML = '';
    s.className = 'hs-strip' + (n ? ' dirty' : '');
    s.append(h('span.hs-strip-mark', ui.tideMark(mark)),
      h('div.hs-strip-text', h('b', n ? count(n, 'nChanges') : t(mark === 'draft' ? 'cleanNever' : 'clean')),
        h('span.small.muted', [meta.at ? `${t('lastPub', { when: MA.ago(meta.at), by: meta.by || 'MIRAS' })} · ${meta.live ? t('isLive') : t('waiting')}` : t('neverPub'),
          pendingNext() ? t('sNext', { when: qWhen(pendingNext().at) }) : ''].filter(Boolean).join(' · '))));
    if (n && MA.can('content.publish')) s.append(ui.btn(t('review'), { kind: 'ghost', size: 'sm', onclick: () => openPublish() }), h('kbd.hs-kbd', MA.keys.label('shift+mod+p')));
    if (P.pubBtn) P.pubBtn.disabled = !n;
  }
  function drawPanel() {
    if (!P?.root.isConnected) return;
    const p = P.panel; p.innerHTML = ''; p.dataset.tab = P.tab;
    if (P.tab === 'versions') drawVersions(p); else if (P.tab === 'activity') drawActivity(p); else drawLive(p);
  }
  function move(d) {
    if (P.tab !== 'versions') return;
    const rows = [...P.root.querySelectorAll('.hs-v[data-id]')].filter(r => r.offsetParent);
    if (!rows.length) return;
    const i = rows.findIndex(r => r.dataset.id === P.sel), nx = rows[MA.clamp(i < 0 ? (d > 0 ? 0 : rows.length - 1) : i + d, 0, rows.length - 1)];
    select(nx.dataset.id, true);
  }
  function select(id, focus) {
    P.sel = id;
    P.root.querySelectorAll('.hs-v[data-id]').forEach(r => r.classList.toggle('active', r.dataset.id === id));
    const r = P.root.querySelector(`.hs-v[data-id="${CSS.escape(id)}"]`);
    if (r && focus) { r.focus({ preventScroll: true }); r.scrollIntoView({ block: 'nearest' }); }
  }

  /* ---- Versions tab ---- */
  function markEl(kind) {
    const m = h('span', { class: 'hs-mark ' + kind, 'aria-hidden': 'true' });
    if (kind === 'publish') m.append(ui.tideMark('live')); else if (kind === 'auto') m.append(ui.tideMark('draft'));
    else m.innerHTML = MA.icon(kind === 'import' ? 'download' : 'flag', 'sm');
    return m;
  }
  function dayLabel(at) {
    const d = MA.qDay(at), today = MA.qDay(Date.now()), yest = MA.qDay(Date.now() - 864e5);
    if (d === today) return MA.t('today'); if (d === yest) return MA.t('yesterday');
    const sameYear = d.slice(0, 4) === today.slice(0, 4);
    return MA.date(at, sameYear ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function personEl(x) { const m = MA.team?.get?.(x.byId), a = ui.avatar(m ? { ...m, name: whoOf(x) } : { name: x.by || 'MIRAS', color: 'var(--tide60)' }); a.classList.add('hs-av'); return a; }
  function vRow(v, list, i, nums) {
    const n = changedSince(list, i), canEdit = MA.can('content.edit');
    return h('div', { class: 'hs-v' + (P.sel === v.id ? ' active' : ''), tabindex: '0', dataset: { id: v.id, kind: v.kind }, role: 'listitem',
      onclick: e => { if (e.target.closest('button,a')) return; select(v.id); }, ondblclick: e => { if (!e.target.closest('button,a')) previewVersion(v); } },
      markEl(v.kind),
      h('div.hs-v-main',
        h('div.hs-v-title', h('b', kindLabel(v.kind)), nums.has(v.id) ? h('span.hs-vnum.mono', 'v' + n$(nums.get(v.id))) : null, v.note ? h('span.hs-note', v.note) : null),
        h('div.hs-v-meta', personEl(v), h('bdi.hs-who', whoOf(v)), h('span.hs-sep', '·'), h('time.mono', { datetime: v.at, title: MA.date(v.at, { dateStyle: 'full', timeStyle: 'short' }) }, MA.time(v.at)), h('span.hs-sep', '·'), h('span.hs-n', count(n, 'changes', 'changeNone')))),
      h('div.hs-v-acts',
        ui.iconBtn('eye', { tip: t('aPreview'), size: 'sm', onclick: () => previewVersion(v) }),
        ui.iconBtn('columns', { tip: t('aCompare'), size: 'sm', onclick: () => compare(v) }),
        canEdit ? ui.iconBtn('undo', { tip: t('aRestore'), size: 'sm', onclick: () => restore(v) }) : null,
        ui.iconBtn('more', { tip: MA.t('more'), size: 'sm', onclick: e => ui.menu(e.currentTarget, [
          { label: t('aDownload'), icon: 'download', run: () => downloadVersion(v) },
          canEdit ? { label: t('aNote'), icon: 'edit', run: () => editNote(v) } : null,
          canEdit && v.kind !== 'publish' ? '-' : null,
          canEdit && v.kind !== 'publish' ? { label: t('aDelete'), icon: 'trash', danger: true, run: () => deleteVersion(v) } : null,
        ].filter(Boolean), { align: 'end' }) })));
  }
  function drawVersions(p) {
    const list = MA.versions.list(), nums = pubNumbers(list);
    const grid = h('div.hs-vgrid'), main = h('div.hs-vmain', { role: 'list', 'aria-label': t('tabVersions') }), side = h('div.hs-vside');
    grid.append(main, side); p.append(grid); P.side = side;
    drawDraftCard();
    if (!list.length) { main.removeAttribute('role'); main.append(ui.empty({ title: t('emptyVT'), text: esc(t('emptyVX')), pose: 'arrive' })); return; }
    const days = new Map(); list.forEach((v, i) => { const d = MA.qDay(v.at); (days.get(d) || days.set(d, []).get(d)).push(i); });
    for (const [, idxs] of days) {
      const day = h('section.hs-day', h('h3.hs-day-h.label', dayLabel(list[idxs[0]].at))), rail = h('div.hs-rail');
      for (let k = 0; k < idxs.length;) {
        let e = k; while (e < idxs.length && list[idxs[e]].kind === 'auto') e++;
        if (e - k >= 2) {
          const run = idxs.slice(k, e), key = list[run[0]].id, open = P.expanded.has(key) || run.some(i => list[i].id === P.sel);
          const who = listFmt([...new Set(run.map(i => whoOf(list[i])))]);
          const total = run.reduce((s, i) => s + changedSince(list, i), 0);
          const grp = h('div', { class: 'hs-autos' + (open ? ' open' : ''), role: 'listitem' });
          grp.append(h('button.hs-v.hs-autos-head', { type: 'button', 'aria-expanded': String(open), onclick: () => { open ? P.expanded.delete(key) : P.expanded.add(key); drawPanel(); } },
            markEl('auto'), h('div.hs-v-main', h('div.hs-v-title', h('b', t('autos', { n: run.length, who }))),
              h('div.hs-v-meta', h('time.mono', `⁨${MA.time(list[run.at(-1)].at)}⁩ – ⁨${MA.time(list[run[0]].at)}⁩`), h('span.hs-sep', '·'), h('span', count(total, 'changes', 'changeNone')))),
            h('span.hs-chev', { html: MA.icon('chevDown', 'sm') })));
          if (open) grp.append(h('div.hs-autos-body', { role: 'list' }, run.map(i => vRow(list[i], list, i, nums))));
          rail.append(grp); k = e;
        } else { rail.append(vRow(list[idxs[k]], list, idxs[k], nums)); k++; }
      }
      day.append(rail); main.append(day);
    }
  }
  function drawDraftCard() {
    const side = P?.side; if (!side?.isConnected) return;
    side.innerHTML = '';
    const { n, mark } = stateNow(), canEdit = MA.can('content.edit'), canPub = MA.can('content.publish');
    const areas = n ? areasOf(C().changes()) : [], autoAt = MA.db.get('history.autoAt', 0);
    side.append(h('section.card.hs-draft',
      h('div.hs-draft-head', h('div', h('h2.h3', t('draftT')), h('p.small.faint', t('draftSub'))), h('span.hs-draft-mark', ui.tideMark(n ? 'edited' : mark))),
      h('div.hs-draft-num', h('span.hs-big.num', n$(n)), h('span.muted', t('unpub'))),
      areas.length ? h('div.hs-draft-areas', areas.slice(0, 6).map(a => h('span.badge.outline', a)), areas.length > 6 ? h('span.small.faint', t('andMore', { n: areas.length - 6 })) : null) : null,
      h('div.hs-draft-acts',
        canPub ? ui.btn(t('review'), { kind: 'primary', icon: 'publish', disabled: !n, onclick: () => openPublish() }) : null,
        ui.btn(t('cmpLive'), { kind: 'ghost', icon: 'columns', onclick: () => compareLive() })),
      h('div.hs-draft-tools', h('p.label', t('tools')),
        ui.btn(t('exportD'), { kind: 'ghost', size: 'sm', icon: 'download', onclick: () => exportDraft() }),
        canEdit ? ui.btn(t('importD'), { kind: 'ghost', size: 'sm', icon: 'upload', onclick: () => importDraft() }) : null,
        canEdit ? ui.btn(t('discardAll'), { kind: 'ghost danger', size: 'sm', icon: 'trash', disabled: !n, onclick: () => discardAll() }) : null),
      h('p.tiny.faint.hs-draft-note', t('autoNote', { n: n$(10) }) + (autoAt ? ' ' + t('lastAuto', { when: MA.ago(autoAt) }) : '') + (canEdit ? ' ' + t('importHint') : ''))));
  }

  /* ---- Activity tab ---- */
  /** Every action anyone logs reads as words in the admin language; an unknown one says "made a change", never its id. */
  const actionLabel = a => t(MA.i18n.has('history.act.' + a, 'en') ? 'act.' + a : 'act.other');
  /** The details of an entry, rendered now (language, digits, direction) from its meta when it has one. */
  function actTarget(a) {
    const m = a?.meta || {};
    if ((a?.action === 'restore' || a?.action === 'version.delete') && m.at) {
      const v = m.vid && MA.versions.get(m.vid);
      return v ? vName(v) : `${kindLabel(m.kind)} · ${MA.date(m.at, { day: 'numeric', month: 'short' })} ${MA.time(m.at)}`;
    }
    if (a?.action === 'draft.discard' && typeof m.n === 'number') return count(m.n, 'changes');
    if ((a?.action === 'schedule' || a?.action === 'schedule.cancel') && m.at) return [t('atK', { when: qWhen(m.at) }), a.target].filter(Boolean).join(' · ');
    return MA.activity?.text ? MA.activity.text(a) : String(a?.target ?? '');
  }
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const modName = id => { const m = MA.modules().find(x => x.id === id); return m ? MA.L(m.title) : id || '—'; };
  function filteredActivity() {
    const f = P.act, q = f.q.trim().toLowerCase();
    const fold = s => MA.fold ? MA.fold(s) : String(s).toLowerCase(), fq = fold(q);
    return MA.activity.list().filter(a => (!f.who || (a.byId || a.by) === f.who) && (!f.mod || a.module === f.mod) && (!f.act || a.action === f.act)
      && (!q || fold([whoOf(a), a.by, actionLabel(a.action), a.action, noIso(actTarget(a)), a.target, modName(a.module)].join(' ')).includes(fq)));
  }
  function drawActivity(p) {
    const all = MA.activity.list();
    if (!all.length) { p.append(ui.empty({ title: t('aEmptyT'), text: esc(t('aEmptyX')), pose: 'present' })); return; }
    const f = P.act, sync = () => MA.setQuery({ q: f.q || null, who: f.who || null, mod: f.mod || null, act: f.act || null });
    const people = new Map(); all.forEach(a => people.set(a.byId || a.by, whoOf(a)));
    const mods = [...new Set(all.map(a => a.module).filter(Boolean))], acts = [...new Set(all.map(a => a.action).filter(Boolean))];
    const list = h('div.hs-actlist'), countEl = h('span.small.faint.hs-act-count');
    const search = h('input.input.sm', { type: 'search', value: f.q, placeholder: t('aSearch'), 'aria-label': t('aSearch'), oninput: MA.debounce(e => { f.q = e.target.value; sync(); drawList(); }, 140) });
    const bar = h('div.toolbar.hs-act-bar',
      h('div.search', MA.frag(MA.icon('search', 'sm')), search),
      ui.select([{ value: '', label: t('aAnyone') }, ...[...people].map(([v, l]) => ({ value: v, label: l }))], f.who, v => { f.who = v; sync(); drawList(); }, { cls: 'sm hs-f-who', label: t('cPerson') }),
      ui.select([{ value: '', label: t('aAnyPage') }, ...mods.map(m => ({ value: m, label: modName(m) }))], f.mod, v => { f.mod = v; sync(); drawList(); }, { cls: 'sm hs-f-mod', label: t('cPage') }),
      ui.select([{ value: '', label: t('aAnyAction') }, ...acts.map(a => ({ value: a, label: cap(actionLabel(a)) })).sort((x, y) => x.label.localeCompare(y.label, MA.locale?.() || undefined))], f.act, v => { f.act = v; sync(); drawList(); }, { cls: 'sm hs-f-act', label: t('cAction') }),
      h('span.grow'), countEl,
      ui.btn(t('aExport'), { kind: 'ghost', size: 'sm', icon: 'download', onclick: () => exportActivity() }));
    p.append(bar, list);
    function drawList() {
      const rows = filteredActivity(); list.innerHTML = '';
      countEl.textContent = t('aShowing', { n: n$(rows.length), total: n$(all.length) });
      if (!rows.length) { list.append(h('div.hs-act-none', h('p.muted', t('aNone')), ui.btn(t('aClear'), { kind: 'ghost', size: 'sm', onclick: () => { Object.assign(f, { q: '', who: '', mod: '', act: '' }); sync(); drawPanel(); } }))); return; }
      const days = new Map(); rows.forEach(a => { const d = MA.qDay(a.at); (days.get(d) || days.set(d, []).get(d)).push(a); });
      for (const [, arr] of days) {
        const card = h('div.card.flat.hs-actday');
        arr.forEach(a => {
          const href = a.href && /^#\//.test(a.href) ? a.href : null;
          card.append(h(href ? 'a' : 'div', { class: 'hs-act', href },
            personEl(a),
            h('div.hs-act-main', h('p', h('bdi.hs-act-who', whoOf(a)), ' ', h('span', actionLabel(a.action)), (x => x ? h('span.hs-act-target', h('bdi', x)) : null)(actTarget(a))),
              h('span.tiny.faint', modName(a.module))),
            h('time.mono.tiny.faint', { datetime: a.at, title: MA.date(a.at, { dateStyle: 'full', timeStyle: 'short' }) }, MA.time(a.at))));
        });
        list.append(h('section.hs-day', h('h3.hs-day-h.label', dayLabel(arr[0].at)), card));
      }
    }
    drawList();
  }
  function exportActivity() {
    const rows = filteredActivity(), name = `miras-activity-${MA.qDay(Date.now())}.csv`;
    MA.download(name, MA.csv.stringify(rows, [
      { label: t('cTime'), get: a => a.at }, { label: t('cPerson'), get: a => whoOf(a) }, { label: t('cAction'), get: a => actionLabel(a.action) },
      { label: t('cTarget'), get: a => noIso(actTarget(a)) }, { label: t('cPage'), get: a => modName(a.module) }, { label: t('cLink'), get: a => a.href ? new URL(a.href, location.href).href : '' },
    ]), 'text/csv');
    MA.toast(t('aSaved', { name: esc(name) }));
  }

  /* ---- Live status tab ---- */
  function drawLive(p) {
    const { n } = stateNow(), local = MA.db.get('published', null), lastPub = MA.db.get('history.lastPublish', null);
    const sv = P.served, served = sv && !sv.error ? sv.content : MA.content.served;
    const servedAt = served?.meta?.publishedAt || null, isLive = !!(local?.at && servedAt === local.at);
    const overall = !servedAt && !local?.at ? 'draft' : local?.at && !isLive && Date.parse(local.at) > Date.parse(servedAt || 0) ? 'waiting' : n ? 'edited' : 'live';
    const rowsEl = h('div.hs-tide');
    const tideRow = (mark, title, body, extra) => h('div.hs-tide-row', { dataset: { mark } }, h('span.hs-tide-mark', ui.tideMark(mark)), h('div.hs-tide-text', h('b', title), body), extra ? h('div.hs-tide-extra', extra) : null);
    // 1. the site
    const siteText = sv?.error ? t('lSiteErr') : servedAt ? t('lSiteMeta', { when: `${MA.date(servedAt)} · ${MA.time(servedAt)}`, by: served.meta.by || 'MIRAS' }) + (served.meta.note ? ` · “${served.meta.note}”` : '') : t('lSiteDefaults');
    const check = h('button.btn.ghost.sm.hs-check-again', { type: 'button', onclick: async e => {
      e.currentTarget.disabled = true; P.served = await fetchServed();
      const meta = C().publishedMeta;
      if (P.served?.meta?.publishedAt && meta?.at && !meta.live && P.served.meta.publishedAt === meta.at) markLive(P.served); else drawPanel();
    } }, MA.frag(MA.icon('refresh', 'sm')), h('span', t('lCheck')));
    rowsEl.append(tideRow(servedAt ? 'live' : 'draft', t('lSite'), h('div.small.muted', siteText), check));
    // 2. last publish here
    const how = lastPub && lastPub.at === local?.at ? (lastPub.method === 'folder' ? t('mFolder', { name: lastPub.folder || '…' }) : t(lastPub.method === 'copy' ? 'mCopy' : 'mDownload')) : '';
    rowsEl.append(tideRow(local?.at ? (isLive ? 'live' : 'edited') : 'draft', t('lLocal'),
      h('div.small.muted', local?.at ? `${MA.date(local.at)} · ${MA.time(local.at)} · ${local.by || 'MIRAS'}${how ? ' · ' + how : ''}` : t('lLocalNone')),
      local?.at ? ui.badge(isLive ? t('lLive') : t('lWaiting'), isLive ? 'good' : 'warn') : null));
    // 3. draft
    rowsEl.append(tideRow(n ? 'edited' : (servedAt || local?.at ? 'live' : 'draft'), t('draftT'), h('div.small.muted', n ? count(n, 'nChanges') : t('clean')),
      n && MA.can('content.publish') ? ui.btn(t('review'), { kind: 'ghost', size: 'sm', onclick: () => openPublish() }) : null));
    const head = h('div.hs-live-state', { dataset: { state: overall } }, h('span.hs-big-mark', ui.tideMark(overall === 'waiting' ? 'edited' : overall)),
      h('p.h3', overall === 'draft' ? t('stDraft') : overall === 'waiting' ? t('stWaiting') : overall === 'edited' ? t('stEdited', { n }) : t('stLive')));
    const legend = h('div.hs-legend', [['live', 'mkLive'], ['edited', 'mkEdited'], ['draft', 'mkDraft']].map(([m, k]) => h('span', ui.tideMark(m), t(k))));
    const grid = h('div.hs-live'), col = h('div.hs-live-col');
    col.append(h('section.card.hs-live-main', h('div.card-body', head, rowsEl, legend)));
    // scheduled changes (what content.js holds besides the live overrides)
    const sched = schedOf();
    if (sched.length) {
      const canPub = MA.can('content.publish');
      col.append(h('section.card.hs-sched', h('div.card-head', h('h3.h4', t('sT'))), h('div.card-body', h('ul.hs-sched-list', sched.map(e => {
        const due = Date.parse(e.at) <= Date.now(), n2 = leavesOf(e.overrides).length;
        const meta = [due ? t('sDue', { when: MA.date(e.at) }) : t('sPending', { when: MA.ago(e.at) }), count(n2, 'changes')];
        return h('li.hs-sched-row', { dataset: { id: String(e.id || ''), due: String(due) } },
          h('span.hs-sched-ic', { html: MA.icon(due ? 'check' : 'clock', 'sm') }),
          h('div.hs-sched-text', h('b', t('atK', { when: qWhen(e.at) })), h('span.small.muted', meta.join(' · ')), e.note ? h('bdi.small.hs-sched-note', e.note) : null),
          h('div.hs-sched-acts', ui.iconBtn('eye', { tip: t('aPreview'), size: 'sm', onclick: () => previewSchedule(e) }),
            !due && canPub ? (b => (b.classList.add('hs-sched-cancel'), b))(ui.btn(t('sCancel'), { size: 'sm', kind: 'ghost danger', onclick: async () => { if (await cancelSchedule(e)) drawPanel(); } })) : null));
      })))));
    }
    const side = h('div.hs-live-side');
    if (local?.at && !isLive && overall === 'waiting') {
      const ups = lastPub?.at === local.at ? (lastPub.uploads || []) : [];
      side.append(h('section.card.hs-upload', h('div.card-head', h('h3.h4', t('upT'))), h('div.card-body', h('p.small.muted', t('upX')),
        h('div.hs-uplist',
          h('div.hs-up', h('code', 'assets/content.js'), ui.btn(t('reDl'), { size: 'sm', kind: 'ghost', icon: 'download', onclick: () => downloadFile(local.overrides, local.overrides?.meta || { publishedAt: local.at, by: local.by, schema: 'miras.content', version: 1 }) })),
          ...ups.map(u => h('div.hs-up', h('code', u.targetPath), ui.btn(t('dl'), { size: 'sm', kind: 'ghost', icon: 'download', onclick: async () => {
            const b = await idb(MA.idb.get('files', u.id));
            if (b) MA.download(u.targetPath.split('/').pop(), b); else MA.toast(t('errMissing', { name: esc(u.name) }), { tone: 'bad' });
          } })))))));
    } else if (local?.at || servedAt) side.append(h('div.callout.good', { html: MA.icon('check') + `<span>${esc(t('allGood'))}</span>` }));
    const fBody = h('div.card-body'), bBody = h('div.card-body');
    side.append(h('section.card.hs-fcard', h('div.card-head', h('h3.h4', t('fT'))), fBody));
    side.append(h('section.card.hs-bcard', h('div.card-head', h('h3.h4', t('bT'))), bBody));
    grid.append(col, side); p.append(grid);
    drawFolderCard(fBody); drawBackupCard(bBody);
    if (!P.served) fetchServed().then(r => { if (!P?.root.isConnected || P.tab !== 'live' || P.served) return; P.served = r; drawPanel(); });
  }
  async function drawFolderCard(body) {
    if (!fsOK()) { body.append(h('div.callout', { html: MA.icon('info') + `<div><b>${esc(t('noFsT'))}</b><br>${esc(t('noFsX'))}</div>` })); return; }
    const d = await getFolder(); if (!body.isConnected) return;
    const canPub = MA.can('content.publish');
    const connect = async () => { try { const x = await chooseFolder(); if (x) MA.toast(t('fConnected', { name: esc(x.name) })); } catch (e) { MA.toast(e.userMsg || t('errWrite', { msg: esc(e.message) }), { tone: 'bad' }); } drawPanel(); };
    if (!d) { body.append(h('p.small.muted', t('fNone'))); if (canPub) body.append(h('div.btn-row', ui.btn(t('fConnect'), { size: 'sm', icon: 'folder', onclick: connect }))); return; }
    const perm = await permOf(d); if (!body.isConnected) return;
    body.append(h('div.hs-folder', h('span.hs-folder-ic', { html: MA.icon('folder', 'sm') }), h('div.grow', h('b.hs-folder-name', d.name || '—'), h('span.small.faint', perm === 'granted' ? t('fOk', { name: d.name }) : t('fAsk', { name: d.name })))));
    if (canPub) body.append(h('div.btn-row',
        perm !== 'granted' ? ui.btn(t('fReconnect'), { size: 'sm', onclick: async () => { try { await d.requestPermission?.({ mode: 'readwrite' }); } catch (e) {} drawPanel(); } }) : null,
        ui.btn(t('changeFolder'), { size: 'sm', kind: 'ghost', onclick: connect }),
        ui.btn(t('fForget'), { size: 'sm', kind: 'ghost danger', onclick: async () => { await forgetFolder(); MA.toast(t('fForgot')); drawPanel(); } })));
  }
  /** Automatic backups: where they go, when the last one was, and a way to make one now. */
  async function drawBackupCard(body) {
    const s = MA.backup?.status?.() || {};
    body.append(h('p.small.muted', t('bX')), h('p.small.hs-blast', s.at ? t('bLast', { when: MA.ago(s.at) }) : t('bNever')));
    if (!fsOK()) return; // the folder card already says why this browser can't write to folders
    const d = await getBackupDir(); if (!body.isConnected) return;
    const can = MA.can('settings.edit');
    const choose = async () => {
      try { const x = await chooseBackupDir(); if (x) backupToast(await backupTo(x, { ask: true })); }
      catch (e) { MA.toast(e.userMsg ? esc(e.userMsg) : esc(t('rBackupFail', { msg: e.message || '' })), { tone: 'bad' }); }
      drawPanel();
    };
    if (!d) { body.append(h('p.small.faint', t('bNone'))); if (can) body.append(h('div.btn-row', ui.btn(t('bChoose'), { size: 'sm', icon: 'folder', onclick: choose }))); return; }
    body.append(h('div.hs-folder', h('span.hs-folder-ic', { html: MA.icon('archive', 'sm') }), h('div.grow', h('b.hs-folder-name', d.name || '—'), h('span.small.faint', 'backups/'))));
    if (can) body.append(h('div.btn-row',
      ui.btn(t('bNow'), { size: 'sm', icon: 'download', onclick: async () => { backupToast(await backupTo(d, { ask: true })); drawPanel(); } }),
      ui.btn(t('changeFolder'), { size: 'sm', kind: 'ghost', onclick: choose }),
      ui.btn(t('fForget'), { size: 'sm', kind: 'ghost danger', onclick: async () => { await forgetBackupDir(); MA.toast(t('fForgot')); drawPanel(); } })));
  }

  /* ================= registration ================= */
  // the shell only refreshes the top-bar Publish button on content changes; "View as" changes the role too
  MA.on('prefs', () => { try { MA.updateStatus?.(); } catch (e) {} });
  MA.publish = { open: openPublish, autosave, diff: diffView, compareLive, restore, parseImport, wordOps, writeToFolder, describe, fetchServed, saveCheckpoint, discardAll,
    patchHead, writeSeoFiles, siteCheck, downloadFile, missingMedia, mediaRefs, keptSchedule, cancelSchedule, healMedia, checkLive, buildBackup, backupTo, actionLabel, actTarget,
    /** Is a backup folder connected? (Live status › Automatic backups) */ backupDir: () => getBackupDir() };
  // ⌘S: same checkpoint as the button (logged in activity, with a quick "Edit note")
  MA.keys.bind('mod+s', () => { if (C().draft) saveCheckpoint(); }, () => MA.t('k.checkpoint'), { global: true });
  MA.commands.add({ id: 'publish', title: { en: S.cmdPublish[0], ar: S.cmdPublish[1], fa: S.cmdPublish[2] }, icon: 'publish', shortcut: 'shift+mod+p', keywords: 'publish go live release نشر انتشار', when: () => MA.can('content.publish'), run: () => openPublish() });
  MA.commands.add({ id: 'checkpoint', title: { en: S.checkpoint[0], ar: S.checkpoint[1], fa: S.checkpoint[2] }, icon: 'flag', shortcut: 'mod+s', keywords: 'checkpoint save version snapshot نقطة استرجاع نقطه بازگشت', run: () => saveCheckpoint() });
  MA.commands.add({ id: 'history-discard', title: { en: S.cmdDiscard[0], ar: S.cmdDiscard[1], fa: S.cmdDiscard[2] }, icon: 'trash', keywords: 'discard revert reset draft unpublished تجاهل کنار', when: () => MA.can('content.edit') && !!C().draft && C().changes().length > 0, run: () => discardAll() });
  MA.commands.add({ id: 'history-compare', title: { en: S.cmdCompare[0], ar: S.cmdCompare[1], fa: S.cmdCompare[2] }, icon: 'columns', keywords: 'compare diff live draft مقارنة مقایسه', when: () => !!C().draft, run: () => compareLive() });

  MA.module({
    id: ID, group: 'system', order: 120, icon: 'history', shortcut: 'g h',
    title: TITLE,
    keywords: 'publish history versions restore checkpoint autosave activity audit log live upload نشر سجل نسخ انتشار تاریخچه نسخه',
    render, update,
    crumbs: ctx => [{ label: tabLabel(tabOf(ctx)), href: '#/history' + (tabOf(ctx) === 'versions' ? '' : '?tab=' + tabOf(ctx)) }],
    search(q) {
      const ql = q.toLowerCase(), list = MA.versions.list(), nums = pubNumbers(list);
      return list.filter(v => [v.note, v.by, kindLabel(v.kind), nums.has(v.id) ? 'v' + nums.get(v.id) : ''].join(' ').toLowerCase().includes(ql)).slice(0, 6)
        .map(v => ({ title: vName(v, nums) + (v.note ? ` · ${v.note}` : ''), sub: `${MA.date(v.at)} · ${v.by || 'MIRAS'}`, icon: 'history', run: () => MA.go('#/history?v=' + encodeURIComponent(v.id)) }));
    },
  });
})();
