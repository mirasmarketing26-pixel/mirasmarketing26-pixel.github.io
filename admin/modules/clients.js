/* =====================================================================
   MIRAS admin — Clients (a category, not one page)
   The team's side of the client portal (portal/API.md; PortalAPI in portal/api.js, local or remote).
   Pages under #/clients. The sidebar's Clients category lists the four top pages (navItems), so there is no in-page menu:
   · Directory  (#/clients): search and one table of clients. A client needs a name OR a company; nothing else. No clients yet:
                one big "Add your first client" button.
   · Client     (#/clients/<id>[/<tab>]): four tabs. Overview (what needs you, the latest activity, a folded Details section with the
                contacts and notes), Projects, Numbers (monthly social numbers), Share (link, sent mark, messages, code reset).
                The old addresses (social, contacts, access, activity) still open the tab that holds them now.
   · Projects   (#/clients/projects): every project across clients, as a sortable table or a board by status.
                A project opens in MA.clientsProject (clients-project.js): wizard(opts) starts one, render(view, ctx) shows one.
   · Approvals  (#/clients/approvals): deliverables waiting for a client decision, or with changes requested.
   · Inbox      (#/clients/inbox): what clients did. Each new unread item also goes to the bell once (MA.notify).
   Viewers (leads.view) read everything; changes need leads.edit. Text typed by the team or a client is shown as text.
   Light by design (owner feedback): one required field to add a client, extra details folded away, short lines, an icon on every tab,
   primary action and empty state.
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA, ID = 'clients';
  const t = (k, v) => MA.t('clients.' + k, v);
  const h = (...a) => MA.h(...a), esc = MA.esc;
  const api = () => window.PortalAPI;
  const canEdit = () => MA.can('leads.edit');

  /* ---------- text: English, Arabic and Persian (one line per key) ---------- */
  const DICT = { en: {}, ar: {}, fa: {} };
  const K = (k, en, ar, fa) => { DICT.en['clients.' + k] = en; DICT.ar['clients.' + k] = ar; DICT.fa['clients.' + k] = fa; };
  // sidebar items, page titles and common
  K('side.approvals', 'Approvals', 'الموافقات', 'تأییدها');
  K('side.inbox', 'Client inbox', 'وارد العملاء', 'صندوق ورودی مشتری‌ها');
  K('side.waiting', '{n} waiting', 'بانتظار المراجعة: {n}', 'در انتظار: {n}');
  K('nav.dir', 'Directory', 'الدليل', 'فهرست');
  K('nav.projects', 'Projects', 'المشاريع', 'پروژه‌ها');
  K('nav.approvals', 'Approvals', 'الموافقات', 'تأییدها');
  K('nav.inbox', 'Inbox', 'الوارد', 'صندوق ورودی');
  K('cancel', 'Cancel', 'إلغاء', 'انصراف');
  K('save', 'Save', 'حفظ', 'ذخیره');
  K('edit', 'Edit', 'تعديل', 'ویرایش');
  K('del', 'Delete', 'حذف', 'حذف');
  K('copy', 'Copy', 'نسخ', 'کپی');
  K('clear', 'Clear', 'مسح', 'پاک‌کردن');
  K('filter', 'Filter', 'تصفية', 'فیلتر');
  K('showing', '{n} of {total}', '{n} من {total}', '{n} از {total}');
  K('noMatch', 'No matches', 'لا توجد نتائج', 'نتیجه‌ای نیست');
  K('overdue', 'Overdue', 'متأخر', 'عقب‌افتاده');
  K('dueSoon', 'Due soon', 'قريب', 'به‌زودی');
  K('none', 'Not set', 'غير محدد', 'تعیین‌نشده');
  K('unknownClient', 'Unknown client', 'عميل غير معروف', 'مشتری ناشناس');
  K('theProject', 'project', 'المشروع', 'پروژه');
  K('linkCopied', 'Link copied', 'نُسخ الرابط', 'پیوند کپی شد');
  K('deleted', 'Deleted', 'حُذف', 'حذف شد');
  K('saved', 'Saved', 'حُفظ', 'ذخیره شد');
  K('keyNext', 'Next row', 'الصف التالي', 'ردیف بعدی');
  K('keyPrev', 'Previous row', 'الصف السابق', 'ردیف قبلی');
  K('keyOpen', 'Open the selected row', 'فتح الصف المحدد', 'باز کردن ردیف انتخاب‌شده');
  K('keySearch', 'Search clients', 'بحث في العملاء', 'جست‌وجوی مشتری‌ها');
  K('keyNew', 'New client', 'عميل جديد', 'مشتری جدید');
  K('keyBack', 'Back to the list', 'العودة إلى القائمة', 'بازگشت به فهرست');
  K('keyEdit', 'Edit the client', 'تعديل العميل', 'ویرایش مشتری');
  K('wizardMissing', 'The project wizard isn’t available in this copy of the admin.', 'معالج المشروع غير متاح في هذه النسخة من اللوحة.', 'ساز پروژه در این نسخه از پنل در دسترس نیست.');
  K('projectMissing', 'The project page isn’t available in this copy of the admin.', 'صفحة المشروع غير متاحة في هذه النسخة من اللوحة.', 'صفحهٔ پروژه در این نسخه از پنل در دسترس نیست.');
  // errors and load states
  K('err.unauthorised', 'Your session has ended. Reload the admin and try again.', 'انتهت جلستك. أعد تحميل اللوحة وحاول مرة أخرى.', 'نشستتان پایان یافته. پنل را دوباره بارگذاری کنید و تلاش کنید.');
  K('err.notFound', 'This item was deleted. Reload the page.', 'حُذف هذا العنصر. أعد تحميل الصفحة.', 'این مورد حذف شده. صفحه را دوباره بارگذاری کنید.');
  K('err.invalid', 'Check the fields and try again.', 'راجع الحقول وحاول مرة أخرى.', 'فیلدها را بررسی کنید و دوباره تلاش کنید.');
  K('err.conflict', 'That name or month is already used. Change it and try again.', 'هذا الاسم أو الشهر مستخدم من قبل. غيّره وحاول مرة أخرى.', 'این نام یا ماه قبلاً استفاده شده. آن را عوض کنید و دوباره تلاش کنید.');
  K('err.server', 'Something went wrong. Try again in a moment.', 'حدث خطأ ما. حاول مرة أخرى بعد قليل.', 'مشکلی پیش آمد. کمی بعد دوباره تلاش کنید.');
  K('loadFailed', 'Clients couldn’t load', 'تعذّر تحميل العملاء', 'مشتری‌ها بارگذاری نشدند');
  K('loadFailedText', 'Check the connection, then try again.', 'تحقّق من الاتصال ثم حاول مرة أخرى.', 'اتصال را بررسی کنید و دوباره تلاش کنید.');
  K('retry', 'Try again', 'حاول مرة أخرى', 'دوباره تلاش کنید');
  K('missing', 'This page isn’t here', 'هذه الصفحة غير موجودة', 'این صفحه اینجا نیست');
  K('missingText', 'The client may have been deleted.', 'ربما حُذف العميل.', 'شاید مشتری حذف شده باشد.');
  K('backToClients', 'Back to clients', 'العودة إلى العملاء', 'بازگشت به مشتری‌ها');
  K('fileEmpty', 'The file is empty.', 'الملف فارغ.', 'فایل خالی است.');
  K('fileImage', 'Use a PNG, JPEG, WebP, GIF or AVIF image.', 'استخدم صورة بصيغة PNG أو JPEG أو WebP أو GIF أو AVIF.', 'از تصویر PNG، JPEG، WebP، GIF یا AVIF استفاده کنید.');
  K('fileSize', 'The file is larger than 25 MB.', 'الملف أكبر من 25 ميغابايت.', 'فایل از ۲۵ مگابایت بزرگ‌تر است.');
  // portal states
  K('portal.not_sent', 'Link not sent', 'لم يُرسل الرابط', 'پیوند فرستاده نشده');
  K('portal.sent', 'Link sent', 'أُرسل الرابط', 'پیوند فرستاده شده');
  K('portal.used', 'In use', 'قيد الاستخدام', 'در حال استفاده');
  // statuses
  K('ps.planning', 'Planning', 'التخطيط', 'برنامه‌ریزی');
  K('ps.in_progress', 'In progress', 'قيد التنفيذ', 'در حال انجام');
  K('ps.review', 'In review', 'قيد المراجعة', 'در حال بازبینی');
  K('ps.live', 'Live', 'منشور', 'منتشرشده');
  K('ps.done', 'Done', 'مكتمل', 'تمام‌شده');
  K('pri.low', 'Low', 'منخفضة', 'کم');
  K('pri.normal', 'Normal', 'عادية', 'معمولی');
  K('pri.high', 'High', 'عالية', 'زیاد');
  K('ds.draft', 'Draft', 'مسودة', 'پیش‌نویس');
  K('ds.in_review', 'Waiting for client', 'بانتظار العميل', 'منتظر مشتری');
  K('ds.approved', 'Approved', 'معتمد', 'تأییدشده');
  K('ds.changes', 'Changes requested', 'تعديلات مطلوبة', 'اصلاح خواسته‌شده');
  K('ds.published', 'Published', 'منشور', 'منتشرشده');
  K('pf.instagram', 'Instagram', 'إنستغرام', 'اینستاگرام');
  K('pf.facebook', 'Facebook', 'فيسبوك', 'فیس‌بوک');
  K('pf.tiktok', 'TikTok', 'تيك توك', 'تیک‌تاک');
  K('pf.linkedin', 'LinkedIn', 'لينكدإن', 'لینکدین');
  K('pf.youtube', 'YouTube', 'يوتيوب', 'یوتیوب');
  K('pf.x', 'X', 'إكس', 'ایکس');
  K('pf.snapchat', 'Snapchat', 'سناب شات', 'اسنپ‌چت');
  K('pf.website', 'Website', 'الموقع الإلكتروني', 'وب‌سایت');
  K('pf.other', 'Other', 'أخرى', 'سایر');
  // directory
  K('dir.sub', 'Your clients, in one place.', 'عملاؤك في مكان واحد.', 'مشتری‌های شما در یک جا.');
  K('dir.new', 'New client', 'عميل جديد', 'مشتری جدید');
  K('dir.search', 'Search clients', 'بحث في العملاء', 'جست‌وجوی مشتری‌ها');
  K('dir.chipsIndustry', 'Industry', 'القطاع', 'صنعت');
  K('dir.hasActive', 'Active', 'نشط', 'فعال');
  K('dir.hasUnread', 'Unread', 'غير مقروء', 'خوانده‌نشده');
  K('dir.colName', 'Client', 'العميل', 'مشتری');
  K('dir.colActive', 'Active', 'نشطة', 'فعال');
  K('dir.colNext', 'Next due', 'الموعد التالي', 'سررسید بعدی');
  K('dir.colLast', 'Last activity', 'آخر نشاط', 'آخرین فعالیت');
  K('dir.colPortal', 'Portal', 'البوابة', 'پورتال');
  K('dir.colActions', 'Actions', 'الإجراءات', 'اقدام‌ها');
  K('dir.caption', 'Clients. Use a column heading to sort.', 'العملاء. استخدم عنوان العمود للترتيب.', 'مشتری‌ها. برای مرتب‌سازی روی عنوان ستون بزنید.');
  K('dir.copyLink', 'Copy link', 'نسخ الرابط', 'کپی پیوند');
  K('dir.empty.title', 'Add your first client', 'أضف أول عميل لك', 'اولین مشتری خود را اضافه کنید');
  K('dir.empty.ro', 'No clients yet.', 'لا يوجد عملاء بعد.', 'هنوز مشتری‌ای نیست.');
  // new client and edit client: one required field; the rest is folded away
  K('form.newTitle', 'New client', 'عميل جديد', 'مشتری جدید');
  K('form.editTitle', 'Client details', 'بيانات العميل', 'اطلاعات مشتری');
  K('form.nameOrCompany', 'Name or company', 'الاسم أو الشركة', 'نام یا شرکت');
  K('form.ph.nameOrCompany', 'For example Dar Lusail', 'مثلاً دار لوسيل', 'مثلاً دار لوسیل');
  K('form.more', 'More details', 'مزيد من التفاصيل', 'جزئیات بیشتر');
  K('form.name', 'Name', 'الاسم', 'نام');
  K('form.company', 'Company', 'الشركة', 'شرکت');
  K('form.email', 'Email', 'البريد الإلكتروني', 'ایمیل');
  K('form.phone', 'Phone', 'الهاتف', 'تلفن');
  K('form.whatsapp', 'WhatsApp', 'واتساب', 'واتس‌اپ');
  K('form.industry', 'Industry', 'القطاع', 'صنعت');
  K('form.website', 'Website', 'الموقع الإلكتروني', 'وب‌سایت');
  K('form.slug', 'Link name', 'اسم الرابط', 'نام پیوند');
  K('form.slugWarn', 'This link was already sent. The old link stops working.', 'أُرسل هذا الرابط من قبل. سيتوقف الرابط القديم عن العمل.', 'این پیوند قبلاً فرستاده شده. پیوند قبلی از کار می‌افتد.');
  K('form.notes', 'Notes', 'ملاحظات', 'یادداشت‌ها');
  K('form.contacts', 'Contacts', 'جهات الاتصال', 'مسئولان تماس');
  K('form.addContact', 'Add contact', 'أضف جهة اتصال', 'افزودن مسئول تماس');
  K('form.contactN', 'Contact {n}', 'جهة الاتصال {n}', 'مسئول تماس {n}');
  K('form.contactRole', 'Role', 'المسمى', 'سمت');
  K('form.remove', 'Remove', 'إزالة', 'حذف');
  K('form.errNeed', 'Add a name or a company.', 'اكتب اسماً أو شركة.', 'یک نام یا شرکت بنویسید.');
  K('form.errName', 'Add a name.', 'اكتب الاسم.', 'نام را بنویسید.');
  K('form.errEmail', 'Check the email address.', 'تحقّق من البريد الإلكتروني.', 'ایمیل را بررسی کنید.');
  K('form.errPhone', 'Check the phone number.', 'تحقّق من رقم الهاتف.', 'شماره تلفن را بررسی کنید.');
  K('form.errWebsite', 'Check the website address.', 'تحقّق من عنوان الموقع.', 'نشانی وب‌سایت را بررسی کنید.');
  K('form.errSlug', 'Use 3 to 40 lowercase letters, numbers or hyphens.', 'استخدم من 3 إلى 40 حرفاً إنجليزياً صغيراً أو أرقاماً أو شرطات.', '۳ تا ۴۰ حرف کوچک لاتین، عدد یا خط تیره بنویسید.');
  K('form.errSlugTaken', 'This link name is taken.', 'اسم الرابط هذا مستخدم.', 'این نام پیوند قبلاً استفاده شده.');
  K('form.create', 'Create', 'أنشئ', 'بساز');
  K('form.contactSaved', 'Contact saved', 'حُفظت جهة الاتصال', 'مسئول تماس ذخیره شد');
  K('form.contactPartial', 'The client was created, but a contact could not be saved.', 'أُنشئ العميل، لكن تعذّر حفظ إحدى جهات الاتصال.', 'مشتری ساخته شد، ولی یکی از مسئولان تماس ذخیره نشد.');
  K('form.slugChanged', 'The link name changed. Send the new link.', 'تغيّر اسم الرابط. أرسل الرابط الجديد.', 'نام پیوند عوض شد. پیوند تازه را بفرستید.');
  // the link and the code, shown once
  K('code.newTitle', 'Client created', 'أُنشئ العميل', 'مشتری ساخته شد');
  K('code.resetTitle', 'New code', 'رمز جديد', 'رمز تازه');
  K('code.note', 'Copy both now: the code is shown only once.', 'انسخ الاثنين الآن: يظهر الرمز مرة واحدة فقط.', 'هر دو را همین حالا کپی کنید: رمز فقط یک بار نشان داده می‌شود.');
  K('code.label', 'Code', 'الرمز', 'رمز');
  K('code.link', 'Link', 'الرابط', 'پیوند');
  K('code.copyCode', 'Copy code', 'نسخ الرمز', 'کپی رمز');
  K('code.copyLink', 'Copy link', 'نسخ الرابط', 'کپی پیوند');
  K('code.copied', 'Code copied', 'نُسخ الرمز', 'رمز کپی شد');
  K('code.done', 'Done', 'تم', 'انجام شد');
  // client workspace
  K('ws.newProject', 'New project', 'مشروع جديد', 'پروژه جدید');
  K('ws.share', 'Copy link', 'نسخ الرابط', 'کپی پیوند');
  K('ws.more', 'More', 'المزيد', 'بیشتر');
  K('ws.delete', 'Delete client', 'حذف العميل', 'حذف مشتری');
  K('ws.deleteTitle', 'Delete {name}?', 'حذف {name}؟', 'حذف {name}؟');
  K('ws.deleteText', 'Their projects, numbers, contacts and files are deleted too. This cannot be undone.', 'ستُحذف مشاريعه وأرقامه وجهات اتصاله وملفاته أيضاً. لا يمكن التراجع عن ذلك.', 'پروژه‌ها، عددها، مسئولان تماس و فایل‌هایش هم حذف می‌شوند. این کار برگشت‌پذیر نیست.');
  K('ws.tabs', 'Client sections', 'أقسام العميل', 'بخش‌های مشتری');
  K('ws.tab.overview', 'Overview', 'نظرة عامة', 'نمای کلی');
  K('ws.tab.projects', 'Projects', 'المشاريع', 'پروژه‌ها');
  K('ws.tab.numbers', 'Numbers', 'الأرقام', 'آمار');
  K('ws.tab.share', 'Share', 'مشاركة', 'اشتراک‌گذاری');
  K('ov.kActive', 'Active', 'نشطة', 'فعال');
  K('ov.kWaiting', 'Waiting', 'بالانتظار', 'منتظر');
  K('ov.kChanges', 'Changes', 'تعديلات', 'اصلاح‌ها');
  K('ov.kUnread', 'Unread', 'غير مقروءة', 'خوانده‌نشده');
  K('ov.attention', 'Needs you', 'بانتظارك', 'منتظر شماست');
  K('ov.clear', 'All clear', 'لا شيء ينتظرك', 'چیزی منتظر شما نیست');
  K('ov.waitFor', 'Waiting {ago}', 'ينتظر منذ {ago}', 'منتظر از {ago}');
  K('ov.noProjects', 'No projects yet', 'لا توجد مشاريع بعد', 'هنوز پروژه‌ای نیست');
  K('ov.details', 'Details', 'التفاصيل', 'جزئیات');
  K('ov.added', 'Added', 'أُضيف', 'افزوده شد');
  K('ov.linkName', 'Link name', 'اسم الرابط', 'نام پیوند');
  K('pr.title', 'Project', 'المشروع', 'پروژه');
  K('pr.client', 'Client', 'العميل', 'مشتری');
  K('pr.status', 'Status', 'الحالة', 'وضعیت');
  K('pr.priority', 'Priority', 'الأولوية', 'اولویت');
  K('pr.progress', 'Progress', 'التقدّم', 'پیشرفت');
  K('pr.progressVal', '{done} of {total}', '{done} من {total}', '{done} از {total}');
  K('pr.progressLabel', '{done} of {total} stages approved', 'اعتُمدت {done} من {total} مراحل', '{done} از {total} مرحله تأیید شده');
  K('pr.due', 'Due', 'الموعد', 'سررسید');
  K('pr.owner', 'Owner', 'المسؤول', 'مسئول');
  K('pr.updated', 'Updated', 'آخر تحديث', 'به‌روزرسانی');
  K('pr.emptyTitle', 'No projects yet', 'لا توجد مشاريع بعد', 'هنوز پروژه‌ای نیست');
  K('pr.sub', 'Every project, across clients.', 'كل المشاريع عبر العملاء.', 'همهٔ پروژه‌ها، در همهٔ مشتری‌ها.');
  K('pr.view', 'View', 'العرض', 'نما');
  K('pr.list', 'List', 'قائمة', 'فهرست');
  K('pr.board', 'Board', 'لوحة', 'تابلو');
  K('pr.fStatus', 'Status', 'الحالة', 'وضعیت');
  K('pr.fClient', 'Client', 'العميل', 'مشتری');
  K('pr.allStatus', 'Any status', 'أي حالة', 'هر وضعیتی');
  K('pr.allClients', 'Any client', 'أي عميل', 'هر مشتری‌ای');
  K('pr.boardEmpty', 'No projects', 'لا مشاريع', 'پروژه‌ای نیست');
  K('pr.new', 'New project', 'مشروع جديد', 'پروژه جدید');
  K('pr.caption', 'Projects. Use a column heading to sort.', 'المشاريع. استخدم عنوان العمود للترتيب.', 'پروژه‌ها. برای مرتب‌سازی روی عنوان ستون بزنید.');
  // numbers: one row per platform per month; only the month and the platform are needed
  K('soc.caption', 'Monthly numbers per platform.', 'الأرقام الشهرية لكل منصة.', 'عددهای ماهانه برای هر پلتفرم.');
  K('soc.add', 'Add numbers', 'أضف أرقاماً', 'افزودن عدد');
  K('soc.edit', 'Edit numbers', 'تعديل الأرقام', 'ویرایش عددها');
  K('soc.editRow', 'Edit the numbers for {row}', 'تعديل أرقام {row}', 'ویرایش عددهای {row}');
  K('soc.delRow', 'Delete the numbers for {row}', 'حذف أرقام {row}', 'حذف عددهای {row}');
  K('soc.saved', 'Numbers saved', 'حُفظت الأرقام', 'عددها ذخیره شد');
  K('soc.deleted', 'Numbers deleted', 'حُذفت الأرقام', 'عددها حذف شد');
  K('soc.delTitle', 'Delete these numbers?', 'حذف هذه الأرقام؟', 'این عددها حذف شوند؟');
  K('soc.delText', '{platform}, {month}. This cannot be undone.', '{platform}، {month}. لا يمكن التراجع عن ذلك.', '{platform}، {month}. این کار برگشت‌پذیر نیست.');
  K('soc.emptyTitle', 'No numbers yet', 'لا توجد أرقام بعد', 'هنوز عددی نیست');
  K('soc.colMonth', 'Month', 'الشهر', 'ماه');
  K('soc.colPlatform', 'Platform', 'المنصة', 'پلتفرم');
  K('soc.colFollowers', 'Followers', 'المتابعون', 'دنبال‌کنندگان');
  K('soc.colReach', 'Reach', 'الوصول', 'دسترسی');
  K('soc.colEngagement', 'Engagement', 'التفاعل', 'تعامل');
  K('soc.colImpressions', 'Impressions', 'المشاهدات', 'نمایش‌ها');
  K('soc.colShot', 'Screenshot', 'لقطة الشاشة', 'تصویر صفحه');
  K('soc.shotAlt', 'Screenshot of {row}', 'لقطة شاشة: {row}', 'تصویر صفحه: {row}');
  K('soc.shotOpen', 'Open the screenshot for {row}', 'افتح لقطة الشاشة: {row}', 'باز کردن تصویر صفحه: {row}');
  K('soc.shotFile', 'Open the original file', 'افتح الملف الأصلي', 'باز کردن فایل اصلی');
  K('soc.noShot', 'None', 'لا شيء', 'ندارد');
  K('soc.fMonth', 'Month', 'الشهر', 'ماه');
  K('soc.fPlatform', 'Platform', 'المنصة', 'پلتفرم');
  K('soc.fFollowers', 'Followers', 'المتابعون', 'دنبال‌کنندگان');
  K('soc.fReach', 'Reach', 'الوصول', 'دسترسی');
  K('soc.fEngagement', 'Engagement (%)', 'التفاعل (%)', 'تعامل (٪)');
  K('soc.fImpressions', 'Impressions', 'المشاهدات', 'نمایش‌ها');
  K('soc.fNote', 'Note', 'ملاحظة', 'یادداشت');
  K('soc.fShot', 'Screenshot', 'لقطة الشاشة', 'تصویر صفحه');
  K('soc.choose', 'Choose image', 'اختر صورة', 'انتخاب تصویر');
  K('soc.kept', 'Kept from before', 'محفوظة من قبل', 'از قبل نگه داشته شده');
  K('soc.errMonth', 'Choose a month.', 'اختر شهراً.', 'یک ماه انتخاب کنید.');
  K('soc.errNumber', 'Numbers can’t be negative, and must be numbers.', 'لا يمكن أن تكون الأرقام سالبة، ويجب أن تكون أرقاماً.', 'عدد نمی‌تواند منفی باشد و باید عدد باشد.');
  K('soc.errTaken', '{platform} already has numbers for {month}. Edit that row instead.', 'لدى {platform} أرقام لشهر {month} من قبل. عدّل ذلك الصف بدلاً من ذلك.', 'برای {platform} در {month} قبلاً عدد ثبت شده. همان ردیف را ویرایش کنید.');
  // contacts and notes (inside Details)
  K('ct.contacts', 'Contacts', 'جهات الاتصال', 'مسئولان تماس');
  K('ct.add', 'Add contact', 'أضف جهة اتصال', 'افزودن مسئول تماس');
  K('ct.empty', 'No contacts yet', 'لا توجد جهات اتصال بعد', 'هنوز مسئول تماسی نیست');
  K('ct.colName', 'Name', 'الاسم', 'نام');
  K('ct.colRole', 'Role', 'المسمى', 'سمت');
  K('ct.colEmail', 'Email', 'البريد الإلكتروني', 'ایمیل');
  K('ct.colPhone', 'Phone', 'الهاتف', 'تلفن');
  K('ct.max', 'Up to 20 contacts for each client.', 'حتى 20 جهة اتصال لكل عميل.', 'تا ۲۰ مسئول تماس برای هر مشتری.');
  K('ct.notes', 'Notes', 'ملاحظات', 'یادداشت‌ها');
  K('ct.notesSaved', 'Notes saved', 'حُفظت الملاحظات', 'یادداشت‌ها ذخیره شد');
  K('ct.contactEdit', 'Edit contact', 'تعديل جهة الاتصال', 'ویرایش مسئول تماس');
  K('ct.contactNew', 'New contact', 'جهة اتصال جديدة', 'مسئول تماس جدید');
  K('ct.delTitle', 'Remove {name}?', 'إزالة {name}؟', 'حذف {name}؟');
  K('ct.delText', 'This person is removed from the client. This cannot be undone.', 'تُزال هذه الجهة من العميل. لا يمكن التراجع عن ذلك.', 'این فرد از مشتری حذف می‌شود. این کار برگشت‌پذیر نیست.');
  K('ct.removed', 'Contact removed', 'أُزيلت جهة الاتصال', 'مسئول تماس حذف شد');
  // share: the link, the sent mark, the messages, the code
  K('acc.link', 'Portal link', 'رابط البوابة', 'پیوند پورتال');
  K('acc.copyLink', 'Copy link', 'نسخ الرابط', 'کپی پیوند');
  K('acc.copyEn', 'English message', 'الرسالة بالإنجليزية', 'پیام انگلیسی');
  K('acc.copyAr', 'Arabic message', 'الرسالة بالعربية', 'پیام عربی');
  K('acc.markSent', 'Mark as sent', 'علّم كمُرسَل', 'علامت فرستاده‌شد');
  K('acc.unmark', 'Clear the mark', 'أزِل العلامة', 'پاک‌کردن علامت');
  K('acc.sentOn', 'Sent {date}', 'أُرسل في {date}', 'فرستاده شد در {date}');
  K('acc.marked', 'Marked as sent', 'عُلّم كمُرسَل', 'علامت فرستاده‌شده خورد');
  K('acc.unmarked', 'Mark cleared', 'أُزيلت العلامة', 'علامت پاک شد');
  K('acc.reset', 'Reset code', 'إعادة تعيين الرمز', 'بازتنظیم رمز');
  K('acc.resetHelp', 'Makes a new code and stops the old one at once. Use it when a code is lost or sent to the wrong person.', 'يُنشئ رمزاً جديداً ويوقف القديم فوراً. استخدمه عند ضياع الرمز أو إرساله إلى الشخص الخطأ.', 'رمز تازه می‌سازد و رمز قبلی را همان لحظه از کار می‌اندازد. وقتی رمز گم شده یا به اشتباه فرستاده شده، از آن استفاده کنید.');
  K('acc.resetTitle', 'Reset the code for {name}?', 'إعادة تعيين رمز {name}؟', 'بازتنظیم رمز {name}؟');
  K('acc.copyFail', 'The link could not be copied. Copy it by hand from the field.', 'تعذّر نسخ الرابط. انسخه يدوياً من الحقل.', 'پیوند کپی نشد. آن را از کادر دستی کپی کنید.');
  K('acc.msgCopied', 'Message copied', 'نُسخت الرسالة', 'پیام کپی شد');
  K('preview.open', 'Preview', 'معاينة', 'پیش‌نمایش');
  K('preview.title', 'Open the client preview', 'فتح معاينة صفحة العميل', 'باز کردن پیش‌نمایش صفحهٔ مشتری');
  // activity: what the client did, newest first (on the overview)
  K('act.title', 'Activity', 'النشاط', 'فعالیت');
  K('act.filter', 'Project', 'المشروع', 'پروژه');
  K('act.all', 'All projects', 'كل المشاريع', 'همهٔ پروژه‌ها');
  K('act.showAll', 'Show all', 'عرض الكل', 'نمایش همه');
  K('act.showLess', 'Show less', 'عرض أقل', 'نمایش کمتر');
  K('act.empty', 'No activity yet', 'لا يوجد نشاط بعد', 'هنوز فعالیتی نیست');
  K('act.emptyText', 'Likes, comments and approvals appear here.', 'تظهر الإعجابات والتعليقات والموافقات هنا.', 'پسندها، دیدگاه‌ها و تأییدها اینجا می‌آیند.');
  K('act.started', 'Project started', 'بدأ المشروع', 'پروژه شروع شد');
  K('act.added', 'Added {title}', 'أُضيف {title}', '{title} اضافه شد');
  K('act.team', 'The team replied', 'ردّ الفريق', 'تیم پاسخ داد');
  K('act.comment', 'The client commented', 'علّق العميل', 'مشتری دیدگاه گذاشت');
  K('act.approved', 'The client approved {title}', 'وافق العميل على {title}', 'مشتری {title} را تأیید کرد');
  K('act.changes', 'The client asked for changes to {title}', 'طلب العميل تعديلات على {title}', 'مشتری برای {title} اصلاح خواست');
  K('act.liked', 'The client liked {title}', 'أعجب العميل بـ{title}', 'مشتری {title} را پسندید');
  K('act.disliked', 'The client disliked {title}', 'لم يُعجب العميل بـ{title}', 'مشتری {title} را نپسندید');
  K('act.reacted', 'The client reacted to {title}', 'تفاعل العميل مع {title}', 'مشتری به {title} واکنش نشان داد');
  // approvals and inbox
  K('apr.sub', 'Waiting for a client decision.', 'بانتظار قرار العميل.', 'منتظر تصمیم مشتری.');
  K('apr.f.all', 'All', 'الكل', 'همه');
  K('apr.f.waiting', 'Waiting', 'بالانتظار', 'منتظر');
  K('apr.f.changes', 'Changes', 'تعديلات', 'اصلاح‌ها');
  K('apr.colItem', 'Item', 'العنصر', 'مورد');
  K('apr.colClient', 'Client', 'العميل', 'مشتری');
  K('apr.colStage', 'Stage', 'المرحلة', 'مرحله');
  K('apr.colStatus', 'Status', 'الحالة', 'وضعیت');
  K('apr.colSince', 'Waiting since', 'منتظر منذ', 'منتظر از');
  K('apr.colVersion', 'Version', 'الإصدار', 'نسخه');
  K('apr.colNote', 'Client’s note', 'ملاحظة العميل', 'یادداشت مشتری');
  K('apr.caption', 'Items waiting for the client, or with changes requested.', 'عناصر تنتظر العميل، أو عليها طلب تعديلات.', 'مواردی که منتظر مشتری‌اند، یا اصلاح خواسته‌اند.');
  K('apr.version', 'Version {n}', 'الإصدار {n}', 'نسخهٔ {n}');
  K('apr.emptyTitle', 'Nothing is waiting', 'لا شيء ينتظر', 'چیزی منتظر نیست');
  K('apr.emptyFilter', 'Nothing matches this filter', 'لا شيء يطابق هذا الفلتر', 'با این فیلتر چیزی پیدا نشد');
  K('inb.sub', 'What clients did, newest first.', 'ما فعله العملاء، من الأحدث.', 'کارهای مشتری‌ها، از تازه به قدیمی.');
  K('inb.all', 'All', 'الكل', 'همه');
  K('inb.unread', 'Unread', 'غير مقروء', 'خوانده‌نشده');
  K('inb.markAll', 'Mark all as read', 'ضع الكل كمقروء', 'همه را خوانده علامت بزن');
  K('inb.markRead', 'Mark as read', 'ضع كمقروء', 'خوانده علامت بزن');
  K('inb.unreadLabel', 'Unread', 'غير مقروء', 'خوانده‌نشده');
  K('inb.allRead', 'All marked as read', 'وُضعت كل الرسائل كمقروءة', 'همه خوانده علامت خورد');
  K('inb.emptyTitle', 'Nothing from clients yet', 'لا شيء من العملاء بعد', 'هنوز چیزی از مشتری‌ها نیست');
  K('inb.noUnreadTitle', 'Nothing unread', 'لا شيء غير مقروء', 'چیز خوانده‌نشده‌ای نیست');
  K('bell.comment', '{who} commented on {what}', '{who} علّق على {what}', '{who} درباره {what} دیدگاه گذاشت');
  K('bell.approve', '{who} approved {what}', 'وافق {who} على {what}', '{who} {what} را تأیید کرد');
  K('bell.changes', '{who} asked for changes to {what}', 'طلب {who} تعديلات على {what}', '{who} برای {what} اصلاح خواست');
  K('bell.like', '{who} liked {what}', 'أعجب {who} بـ{what}', '{who} {what} را پسندید');
  K('bell.dislike', '{who} disliked {what}', 'لم يُعجب {who} بـ{what}', '{who} {what} را نپسندید');
  K('bell.reaction', '{who} reacted to {what}', 'تفاعل {who} مع {what}', '{who} به {what} واکنش نشان داد');
  K('bell.body', '{body}', '{body}', '{body}');
  K('bell.badge', 'New from clients: {n}', 'جديد من العملاء: {n}', 'تازه از مشتری‌ها: {n}');
  K('bell.open', 'Open', 'فتح', 'باز کردن');
  K('unreadBadge', '{n} unread', '{n} غير مقروء', '{n} خوانده‌نشده');
  // sample data (local mode)
  K('sample.load', 'Load sample data', 'تحميل بيانات تجريبية', 'بارگذاری دادهٔ نمونه');
  K('sample.banner', 'Sample data is loaded.', 'البيانات التجريبية محمّلة.', 'دادهٔ نمونه بارگذاری شده است.');
  K('sample.remove', 'Remove sample data', 'إزالة البيانات التجريبية', 'حذف دادهٔ نمونه');
  K('sample.removeTitle', 'Remove the sample data?', 'إزالة البيانات التجريبية؟', 'دادهٔ نمونه حذف شود؟');
  K('sample.removeText', 'The three sample clients, with their projects, files, comments and numbers, are removed. Your own clients stay.', 'تُزال الشركات التجريبية الثلاث مع مشاريعها وملفاتها وتعليقاتها وأرقامها. يبقى عملاؤك الحقيقيون.', 'سه مشتری نمونه با پروژه‌ها، فایل‌ها، دیدگاه‌ها و عددهایشان حذف می‌شوند. مشتری‌های واقعی شما می‌مانند.');
  K('sample.loaded', 'Sample data loaded.', 'تم تحميل البيانات التجريبية.', 'دادهٔ نمونه بارگذاری شد.');
  K('sample.removed', 'Sample data removed.', 'أُزيلت البيانات التجريبية.', 'دادهٔ نمونه حذف شد.');
  K('sample.conflict', 'A client already uses one of the sample link names. Rename or remove that client first.', 'يستخدم عميل ما أحد أسماء الروابط التجريبية. غيّر اسمه أو أزِله أولاً.', 'مشتری دیگری از یکی از نام‌های پیوند نمونه استفاده می‌کند. ابتدا آن را تغییر نام دهید یا حذف کنید.');
  DICT.en['clients.title'] = 'Clients'; DICT.ar['clients.title'] = 'العملاء'; DICT.fa['clients.title'] = 'مشتری‌ها';
  MA.i18n.add(DICT);

  /* ---------- constants and small helpers ---------- */
  const PSTAT = ['planning', 'in_progress', 'review', 'live', 'done'];
  const PRI = ['low', 'normal', 'high'];
  const DSTAT = ['draft', 'in_review', 'approved', 'changes', 'published'];
  const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'x', 'snapchat', 'website', 'other'];
  const TABS = ['overview', 'projects', 'numbers', 'share'];
  const TAB_ICON = { overview: 'grid', projects: 'board', numbers: 'chart', share: 'link' };
  /** The old tab addresses still work: each opens the tab that holds that content now. */
  const TAB_ALIAS = { social: 'numbers', access: 'share', contacts: 'overview', activity: 'overview' };
  const PTONE = { planning: 'outline', in_progress: 'info', review: 'warn', live: 'good', done: 'accent' };
  const DTONE = { draft: 'outline', in_review: 'warn', approved: 'good', changes: 'bad', published: 'accent' };
  const PORTAL_TONE = { not_sent: 'outline', sent: 'info', used: 'good' };
  const PRI_RANK = { low: 1, normal: 2, high: 3 };
  const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];
  const IMAGE_ACCEPT = IMAGE_TYPES.join(',');
  const MAX_BYTES = 25 * 1024 * 1024;
  const DAY = 864e5;
  const SEEN_KEY = 'clients.seen', SENT_KEY = 'clients.sent';
  const ERR_KEY = { unauthorised: 'err.unauthorised', not_found: 'err.notFound', invalid: 'err.invalid', conflict: 'err.conflict' };

  /** A client is shown as its name, else its company (either one is enough; the API keeps at least one). */
  const dn = c => (c && (c.name || c.company)) || '';
  /** The company to show beside the name: only when there is a name and the company says something else. */
  const coOf = c => (c && c.name && c.company && c.company !== c.name ? c.company : '');
  const pStatus = s => t('ps.' + s);
  const dStatus = s => t('ds.' + s);
  const platformLabel = p => t('pf.' + p);
  const ago = iso => (iso ? MA.ago(iso) : '');
  const ms = iso => (iso ? Date.parse(iso) || 0 : 0);
  const ymdDate = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const dateYmd = s => (s ? MA.date(ymdDate(s), { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const dateIso = iso => (iso ? MA.date(new Date(iso), { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const monthLabel = ym => { const [y, m] = String(ym).split('-').map(Number); return MA.date(new Date(y, m - 1, 1), { month: 'short', year: 'numeric' }); };
  const todayMs = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const daysFrom = s => Math.round((ymdDate(s).getTime() - todayMs()) / DAY);
  const thisMonth = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const emailOk = v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const phoneOk = v => { if (!v) return true; if (v.length > 30 || !/^\+?[\s\-.()0-9٠-٩۰-۹]+$/.test(v)) return false; const n = (v.match(/[0-9٠-٩۰-۹]/g) || []).length; return n >= 6 && n <= 15; };
  const slugOk = s => /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(s);
  const clientUrl = slug => location.origin + (api() && api().mode === 'remote' ? '/portal/' + slug : '/portal/?c=' + slug);
  /** The page the client sees, opened as the team's preview with no code: portal/index.html?preview=<slug> (local mode only). */
  const previewHref = slug => new URL('../portal/index.html?preview=' + encodeURIComponent(slug), location.href).href;
  /** A "Preview" link in a new tab. Local mode only (remote has no preview), and only for a client with a link name. */
  function previewBtn(c, opts) {
    if (!c || !c.slug || !api() || api().mode !== 'local') return null;
    const b = MA.ui.btn(t('preview.open'), { icon: 'external', href: previewHref(c.slug), title: t('preview.title'), ...(opts || {}) });
    b.target = '_blank';
    b.rel = 'noopener';
    return b;
  }
  /** A website typed by hand: a full http(s) address, or a bare domain that gets https://. */
  const websiteOf = v => {
    v = String(v || '').trim();
    if (!v) return { ok: true, value: null };
    if (v.length > 200) return { ok: false };
    if (/^https?:\/\/\S+$/i.test(v)) return { ok: true, value: v };
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v)) return { ok: true, value: 'https://' + v };
    return { ok: false };
  };
  const readNum = inp => { const s = inp.value.trim(); if (!s) return null; const n = Number(s); return Number.isFinite(n) && n >= 0 ? n : NaN; };
  const setBusy = (el, on) => { if (el) { el.disabled = !!on; el.setAttribute('aria-busy', String(!!on)); } };
  const showErr = (el, msg) => { if (!el) return false; el.textContent = msg || ''; el.hidden = !msg; return !!msg; };
  const fail = e => MA.toast(esc(t(ERR_KEY[e && e.code] || 'err.server')), { tone: 'bad' });
  const ico = (name, cls) => h('span.cl-ico', { 'aria-hidden': 'true', html: MA.icon(name, cls) });
  /** A file the browser can read and the metric screenshot accepts. Returns the message, or '' when it is fine. */
  function imageProblem(f) {
    if (!f || !f.size) return t('fileEmpty');
    if (!IMAGE_TYPES.includes(f.type)) return t('fileImage');
    if (f.size > MAX_BYTES) return t('fileSize');
    return '';
  }
  /** A folded section: a button that shows or hides its body. Keeps aria-expanded in step. Returns { btn, body }. */
  function foldable(label, body, open, k) {
    const id = MA.uid('cl-fold');
    body.id = id;
    body.hidden = !open;
    const btn = h('button.cl-more', { type: 'button', 'aria-expanded': String(!!open), 'aria-controls': id, dataset: k ? { k } : {},
      html: MA.icon('chevDown', 'sm') + '<span>' + esc(label) + '</span>' });
    btn.addEventListener('click', () => {
      const show = body.hidden;
      body.hidden = !show;
      btn.setAttribute('aria-expanded', String(show));
    });
    return { btn, body };
  }


  /* ---------- data ---------- */
  const C = { clients: [], projects: [], notes: [], metrics: [], unread: 0, ready: false, failed: false };
  const UI = { q: '', ind: new Set(), hasActive: false, hasUnread: false, sort: {}, status: 'all', client: 'all', view: 'list', apr: 'all', notes: 'all', act: 'all', open: {}, actAll: {} };
  let S = null;                       // the mounted module: { root, main, ctx, sel, focusK, tbody, count }
  let seq = 0, applied = 0, syncing = false;

  const clientById = id => C.clients.find(c => c.id === id) || null;
  const projectById = id => C.projects.find(p => p.id === id) || null;
  const projectsOf = cid => C.projects.filter(p => p.clientId === cid).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  const notesOf = cid => C.notes.filter(n => n.clientId === cid);
  const clientName = cid => dn(clientById(cid)) || t('unknownClient');
  const sentMap = () => MA.db.get(SENT_KEY, {}) || {};
  const linkOf = n => '#/clients/projects/' + n.projectId;
  const deliverableOf = (p, id) => (p && id ? p.deliverables.find(d => d.id === id) || null : null);
  const stepOf = (p, id) => (p && id ? p.steps.find(s => s.id === id) || null : null);
  const doneSteps = p => p.steps.filter(s => s.status === 'approved').length;

  /** Each client's numbers, computed once from the stored records. */
  function statsOf(c) {
    const ps = projectsOf(c.id), active = ps.filter(p => p.status !== 'done'), ns = notesOf(c.id);
    const dues = active.map(p => p.dueDate).filter(Boolean).sort();
    const times = [ms(c.createdAt), ...ps.map(p => ms(p.updatedAt)), ...ns.map(n => ms(n.createdAt))];
    ps.forEach(p => p.comments.forEach(x => times.push(ms(x.createdAt))));
    const sent = sentMap()[c.id] || null;
    const portal = ns.length ? 'used' : sent ? 'sent' : 'not_sent';
    return { projects: ps, active, due: dues[0] || null, last: Math.max(...times), unread: ns.filter(n => !n.readAt).length, portal, sentAt: sent };
  }

  /** Loads clients, every project (with steps, deliverables, approvals, reactions, comments), the inbox and every metric row. */
  async function load() {
    const my = ++seq;
    if (!api()) { C.failed = true; return C; }
    try {
      const [clients, projects, inbox, metrics] = await Promise.all([api().admin.listClients(), api().admin.listProjects(), api().admin.listNotifications(), api().admin.listMetrics()]);
      if (my > applied) {
        applied = my;
        Object.assign(C, { clients, projects, notes: inbox.items || [], unread: inbox.unread || 0, metrics: metrics || [], ready: true, failed: false });
      }
    } catch (e) {
      if (my > applied) C.failed = true;
      return C;
    }
    try { syncBell(); } catch (e) { console.error('[clients] bell sync failed', e); }
    MA.renderNav && MA.renderNav();
    return C;
  }

  /** The stored review items: deliverables waiting for the client, or with changes requested. */
  function reviewItems() {
    const out = [];
    C.projects.forEach(p => {
      p.deliverables.forEach(d => {
        if (d.status !== 'in_review' && d.status !== 'changes') return;
        const since = d.approval ? ms(d.approval.createdAt) : ms(d.createdAt);
        out.push({ d, p, c: clientById(p.clientId), step: stepOf(p, d.stepId), since, status: d.status });
      });
    });
    return out;
  }

  /* ---------- sorting: one column at a time; empty values last; ties by name ---------- */
  /** Sorts rows by a column definition { get, type: 'text'|'num', def: 'asc'|'desc' }. */
  function sortRows(rows, cols, sort, base) {
    const list = rows.slice();
    const c = sort && cols[sort.col];
    if (!c) return list.sort(base);
    const sign = sort.dir === 'desc' ? -1 : 1;
    return list.sort((a, b) => {
      const x = c.get(a), y = c.get(b);
      const ex = x === null || x === undefined || x === '', ey = y === null || y === undefined || y === '';
      if (ex || ey) return ex === ey ? base(a, b) : (ex ? 1 : -1);
      const r = c.type === 'text' ? MA.fold(String(x)).localeCompare(MA.fold(String(y))) : Number(x) - Number(y);
      return r ? r * sign : base(a, b);
    });
  }
  /** The sort for a table: the URL's ?sort=col-dir when the page has no choice yet. Keyed per table. */
  function sortOf(key) {
    if (Object.prototype.hasOwnProperty.call(UI.sort, key)) return UI.sort[key];
    const raw = MA.ctx().query.get('sort') || '';
    const m = raw.match(/^([a-z]+)-(asc|desc)$/);
    return m ? { col: m[1], dir: m[2] } : null;
  }
  /** One click: the column's default direction. Two: reversed. Three: no sort (the page's own order). */
  function nextSort(sort, col, def) {
    if (!sort || sort.col !== col) return { col, dir: def };
    if (sort.dir === def) return { col, dir: def === 'asc' ? 'desc' : 'asc' };
    return null;
  }
  /** A header that sorts. aria-sort says the state; the arrow shows it too. */
  function sortTh(key, col, label, cols, sort, cls = '') {
    const on = !!sort && sort.col === col, dir = on ? sort.dir : null;
    return h('th' + cls, { scope: 'col', 'aria-sort': on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none' },
      h('button.cl-sort', { type: 'button', dataset: { k: 'sort-' + col }, onclick: () => setSort(key, nextSort(sort, col, cols[col].def), col) },
        h('span', label), h('span.cl-arrow', { 'aria-hidden': 'true' }, on ? (dir === 'asc' ? '▲' : '▼') : '')));
  }
  /** Stores a sort, keeps it in the URL, and redraws the page with focus on the same header. */
  function setSort(key, next, col) {
    UI.sort[key] = next;
    MA.setQuery({ sort: next ? next.col + '-' + next.dir : null });
    if (S) { S.focusK = 'sort-' + col; paintMain(S); }
  }

  /* ---------- the bell: each new unread client item once ---------- */
  /** What a notification says, in the admin's language. The text comes from the record, not from the API's English. */
  function describe(n) {
    const c = clientById(n.clientId), p = projectById(n.projectId);
    const d = deliverableOf(p, n.deliverableId);
    const what = d && p ? d.title + ' · ' + p.title : p ? p.title : t('theProject');
    const vars = { who: c ? dn(c) : t('unknownClient'), what };
    if (n.kind === 'comment') {
      const cm = commentFor(n, p);
      return { key: 'clients.bell.comment', vars, icon: 'chat', tone: '', body: cm ? cm.body : '' };
    }
    if (n.kind === 'approval') {
      // New rows carry the decision (value) and the approval id (refId). Older rows fall back to the deliverable's latest approval.
      const latest = d ? d.approval : null;
      const ap = n.refId ? (latest && latest.id === n.refId ? latest : null) : latest;
      const decision = n.value === 'approve' || n.value === 'changes' ? n.value : (latest ? latest.decision : '');
      const changes = decision === 'changes';
      return { key: changes ? 'clients.bell.changes' : 'clients.bell.approve', vars, icon: changes ? 'warn' : 'flag', tone: changes ? 'bad' : 'good', body: ap && ap.note ? ap.note : '' };
    }
    const verb = n.value === 'like' || n.value === 'dislike' ? n.value : legacyVerb(n);
    return { key: verb ? 'clients.bell.' + verb : 'clients.bell.reaction', vars, icon: 'star', tone: '', body: '' };
  }
  /** Rows written before value existed: their English text is the only record of like or dislike. */
  function legacyVerb(n) {
    const text = String(n.body || '');
    return /disliked/i.test(text) ? 'dislike' : /liked/i.test(text) ? 'like' : '';
  }
  /** The client's comment for this notification: named by refId; older rows get the closest client comment a few seconds before it. */
  function commentFor(n, p) {
    if (!p) return null;
    const comments = p.comments || [];
    if (n.refId) return comments.find(c => c.id === n.refId) || null;
    let best = null, gap = Infinity;
    comments.forEach(c => {
      if (c.authorRole !== 'client' || (c.deliverableId || null) !== (n.deliverableId || null)) return;
      const g = Math.abs(ms(c.createdAt) - ms(n.createdAt));
      if (g < gap) { gap = g; best = c; }
    });
    return gap < 5000 ? best : null;
  }
  function syncBell() {
    const seen = MA.db.get(SEEN_KEY, {}) || {};
    const fresh = C.notes.filter(n => !n.readAt && !Object.prototype.hasOwnProperty.call(seen, n.id)).reverse();   // oldest first, so the newest ends on top
    if (!fresh.length) return;
    fresh.forEach(n => {
      const d = describe(n);
      MA.notify.push({ key: d.key, vars: d.vars, textKey: d.body ? 'clients.bell.body' : undefined, textVars: d.body ? { body: clip(d.body, 180) } : undefined,
        icon: d.icon, tone: d.tone || undefined, href: linkOf(n) });
      seen[n.id] = (MA.notify.list()[0] || {}).id || '';
    });
    const keys = Object.keys(seen);
    if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(k => { delete seen[k]; });
    MA.db.set(SEEN_KEY, seen);
  }
  /** Marks the bell entries of these notifications read too. */
  function bellRead(ids) {
    const seen = MA.db.get(SEEN_KEY, {}) || {};
    ids.forEach(id => { const b = seen[id]; if (typeof b === 'string' && b) MA.notify.read(b); });
  }
  /** Background refresh: keeps the bell and the sidebar counts current without redrawing the page under the user. */
  async function quietSync() {
    if (!api() || syncing) return;
    syncing = true;
    try { await load(); } finally { syncing = false; }
  }

  /* ---------- routing and mounting ---------- */
  /** The page a route shows. Client routes: #/clients/<id> (overview) or #/clients/<id>/<tab>.
   *  Project routes: #/clients/projects/<pid>[/<tab>] and #/clients/projects/new. clients-project.js reads the tab from ctx.sub. */
  function where(ctx) {
    const s = (ctx && ctx.sub) || [];
    if (!s.length) return { page: 'dir' };
    if (s[0] === 'projects') {
      if (s.length === 1) return { page: 'projects' };
      if (s.length <= 3) { const p = projectById(s[1]); return { page: 'project', pid: s[1], cid: p ? p.clientId : null }; }
      return { page: 'missing' };
    }
    if (s.length === 1 && s[0] === 'approvals') return { page: 'approvals' };
    if (s.length === 1 && s[0] === 'inbox') return { page: 'inbox' };
    if (s.length === 3 && s[1] === 'projects') return { page: 'legacy', cid: s[0], pid: s[2] };   // the old project address
    if (s.length === 1) return { page: 'client', cid: s[0], tab: 'overview' };
    if (s.length === 2 && TABS.includes(s[1])) return { page: 'client', cid: s[0], tab: s[1] };
    if (s.length === 2 && TAB_ALIAS[s[1]]) return { page: 'client', cid: s[0], tab: TAB_ALIAS[s[1]], from: s[1] };   // an old address: redirected to the tab that holds it now
    return { page: 'missing' };
  }

  /** The shell shows the module's name first, so these start below it. */
  function crumbsOf(ctx) {
    const w = where(ctx);
    if (w.page === 'projects') return [{ label: t('nav.projects') }];
    if (w.page === 'approvals') return [{ label: t('nav.approvals') }];
    if (w.page === 'inbox') return [{ label: t('nav.inbox') }];
    if (w.page === 'client' || w.page === 'project') {
      const c = clientById(w.cid);
      if (!c) return [];
      if (w.page === 'client') return w.tab === 'overview' ? [{ label: dn(c) }] : [{ label: dn(c), href: '#/clients/' + c.id }, { label: t('ws.tab.' + w.tab) }];
      const p = projectById(w.pid);
      return [{ label: dn(c), href: '#/clients/' + c.id }, { label: p ? p.title : '' }];
    }
    return [];
  }

  function render(view, ctx) {
    const root = h('div.m-clients');
    view.append(root);
    const main = h('div.cl-main');   // the page starts with its own title: the sidebar's Clients category is the only menu
    root.append(main);
    const st = S = { root, main, ctx, sel: -1, focusK: null };
    MA.cleanup(() => { if (S === st) S = null; });
    bindKeys();
    paintMain(st);                       // what we have now, at once
    load().then(() => { if (S === st) paintMain(st); });   // then the store, so nothing shown is older than the visit
  }

  /** A change of client tab or list page redraws the page in place. Project pages mount fresh. */
  function update(ctx) {
    if (!S || !S.root.isConnected) return false;
    const a = where(S.ctx).page, b = where(ctx).page;
    if (a === 'project' || b === 'project' || a === 'legacy' || b === 'legacy') return false;
    const act = document.activeElement, inMain = S.main.contains(act);
    const tab = inMain && act.getAttribute('role') === 'tab' ? act.dataset.value : null;
    S.ctx = ctx; S.sel = -1;
    paintMain(S);
    const next = tab ? S.main.querySelector('[role="tab"][data-value="' + tab + '"]') : null;
    if (next) next.focus({ preventScroll: true });
    else if (!S.main.contains(document.activeElement)) { const hd = S.main.querySelector('h1'); if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); } }
    refreshLater(S);
    return true;
  }
  /** What the page shows, as one string: a change in it means the page should be drawn again. */
  const sigOf = () => JSON.stringify([C.clients, C.projects, C.notes, C.unread, C.metrics]);
  /** Reloads the store after a move inside the module, and redraws only when something changed (focus stays put otherwise). */
  function refreshLater(st) {
    const before = sigOf();
    load().then(() => { if (S === st && sigOf() !== before) paintMain(st); });
  }

  function paintMain(st) {
    if (S !== st) return;
    const w = where(st.ctx);
    if (w.page === 'legacy') { MA.go('#/clients/projects/' + w.pid, { replace: true }); return; }
    if (w.page === 'client' && w.from) {   // an old tab address (social, contacts, access, activity): open the tab that holds it now
      if (w.from === 'contacts') UI.open[w.cid] = true;
      MA.go('#/clients/' + w.cid + (w.tab === 'overview' ? '' : '/' + w.tab), { replace: true });
      return;
    }
    const pages = { dir: pageDir, client: pageClient, projects: pageProjects, project: projectHost, approvals: pageApprovals, inbox: pageInbox };
    let body;
    if (C.failed && !C.ready) body = failedView();
    else if (!C.ready) body = skeleton();
    else body = pages[w.page] ? pages[w.page](st, w) : missingView();
    st.main.replaceChildren(body);
    st.root.dataset.edit = canEdit() ? '1' : '';
    resolveFiles(st.main);
    if (st.focusK) { const el = st.main.querySelector('[data-k="' + st.focusK + '"]'); st.focusK = null; if (el) el.focus({ preventScroll: true }); }
    if (w.page === 'dir' && C.ready && st.ctx.query && st.ctx.query.get('new') === '1') openNewFromLink(st);
    try { MA.setCrumbs && MA.setCrumbs(crumbsOf(st.ctx)); } catch (e) { /* crumbs are cosmetic */ }
  }
  /** #/clients?new=1 (the wizard's New client link, or a bookmark) opens the New client dialog once. The parameter is then dropped,
   *  so a redraw does not open it again. Viewers get no dialog. It waits for the site's first handshake: that can redraw the
   *  page, and a redraw closes open layers (core route()), so the dialog would vanish on a fresh load. */
  function openNewFromLink(st) {
    st.ctx.query.delete('new');
    MA.setQuery({ new: '' });
    if (!canEdit()) return;
    Promise.resolve(MA.site.ready).then(() => setTimeout(() => { if (S && where(S.ctx).page === 'dir' && canEdit()) clientDialog(null); }, 0));
  }

  function bindKeys() {
    const on = fn => () => MA.keys.singleOn() && fn();
    MA.keys.bindView('j', on(() => move(1)), () => t('keyNext'));
    MA.keys.bindView('k', on(() => move(-1)), () => t('keyPrev'));
    MA.keys.bindView('enter', on(openSel), () => t('keyOpen'));
    MA.keys.bindView('/', on(focusSearch), () => t('keySearch'));
    MA.keys.bindView('n', on(() => { if (S && where(S.ctx).page === 'dir' && canEdit()) clientDialog(null); }), () => t('keyNew'));
    MA.keys.bindView('e', on(() => { const w = S && where(S.ctx); if (w && w.page === 'client' && canEdit()) clientDialog(clientById(w.cid)); }), () => t('keyEdit'));
    MA.keys.bindView('escape', () => {
      if (MA.layers().length || !S) return;
      const el = document.activeElement;
      if (el && el.matches('input[type="search"]') && el.value) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); return; }
      const w = where(S.ctx);
      if (w.page === 'client' || w.page === 'project') MA.go(w.page === 'project' ? '#/clients/projects' : '#/clients');
    }, () => t('keyBack'));
    MA.keys.bindView('g d', () => MA.go('#/clients'), () => t('nav.dir'));
    MA.keys.bindView('g p', () => MA.go('#/clients/projects'), () => t('nav.projects'));
    MA.keys.bindView('g r', () => MA.go('#/clients/approvals'), () => t('nav.approvals'));
    MA.keys.bindView('g i', () => MA.go('#/clients/inbox'), () => t('nav.inbox'));
    MA.keys.bindView('g n', () => { if (canEdit()) clientDialog(null); }, () => t('keyNew'));
  }
  function rowEls() { return S ? [...S.main.querySelectorAll('[data-sel]')] : []; }
  function move(d) {
    const r = rowEls();
    if (!r.length) return;
    S.sel = MA.clamp(S.sel < 0 ? (d > 0 ? 0 : r.length - 1) : S.sel + d, 0, r.length - 1);
    r.forEach((x, i) => x.classList.toggle('sel', i === S.sel));
    r[S.sel].scrollIntoView({ block: 'nearest' });
    const a = r[S.sel].querySelector('a');
    if (a) a.focus({ preventScroll: true });
  }
  function openSel() {
    if (document.activeElement && document.activeElement.closest('button, a, select, input, textarea, [role="menuitem"]')) return;
    const r = rowEls()[S ? S.sel : -1];
    if (r) { const a = r.querySelector('a'); if (a) a.click(); }
  }
  function focusSearch() { const q = S && S.main.querySelector('[data-k="q"]'); if (q) { q.focus(); q.select && q.select(); } }

  /** Links to stored files (metric screenshots) are resolved after drawing, so the page never waits on them. */
  function resolveFiles(root) {
    root.querySelectorAll('[data-file]').forEach(el => {
      Promise.resolve(api().fileUrl(el.dataset.file, { team: true })).then(u => {
        if (!el.isConnected) return;
        if (!u) { if (el.tagName === 'A') { el.setAttribute('aria-disabled', 'true'); el.classList.add('is-off'); } else el.hidden = true; return; }
        if (el.tagName === 'IMG') el.src = u; else el.href = u;
      }).catch(() => {});
    });
  }
  const skeleton = () => h('div.stack', h('div.skel', { style: 'height:44px;width:40%' }), h('div.skel', { style: 'height:220px' }));
  const missingView = () => MA.ui.empty({ title: t('missing'), text: t('missingText'), icon: 'info', actions: [MA.ui.btn(t('backToClients'), { icon: 'arrowLeft', kind: 'primary', href: '#/clients' })] });
  function failedView() {
    return MA.ui.empty({ title: t('loadFailed'), text: t('loadFailedText'), icon: 'warn', actions: [MA.ui.btn(t('retry'), { icon: 'refresh', kind: 'primary', onclick: async () => { C.failed = false; await load(); if (S) paintMain(S); } })] });
  }
  /** Runs a change, reloads, redraws the page and says what happened. Returns the API result, or null on failure. */
  async function act(fn, ok = '') {
    try {
      const r = await fn();
      await load();
      if (ok) MA.toast(esc(ok));
      if (S) paintMain(S);
      return r || {};
    } catch (e) {
      fail(e);
      return null;
    }
  }

  /* ---------- sample data (local mode): load, remove, and the banner ---------- */
  let sampleBusy = false;
  async function loadSampleNow(btn) {
    if (!canEdit() || sampleBusy || !api()) return;
    sampleBusy = true;
    setBusy(btn, true);
    try {
      await api().loadSample();
      await load();
      MA.toast(esc(t('sample.loaded')));
    } catch (e) {
      console.error('[clients] sample data did not load', e);
      if (e && e.code === 'conflict') MA.toast(esc(t('sample.conflict')), { tone: 'bad' });
      else fail(e);
    } finally {
      sampleBusy = false;
    }
    if (S) paintMain(S);
  }
  async function removeSampleNow() {
    if (!canEdit() || !api()) return;
    const ok = await MA.ui.confirm(esc(t('sample.removeTitle')), esc(t('sample.removeText')), { ok: t('sample.remove'), danger: true });
    if (!ok) return;
    try {
      await api().clearSample();
      await load();
      MA.toast(esc(t('sample.removed')));
    } catch (e) { fail(e); }
    if (S) paintMain(S);
  }
  /** The banner on the directory while the sample is loaded. Viewers read it but cannot remove it. */
  function sampleBanner(can) {
    return h('div.callout.warn.cl-sample-banner', { role: 'status' },
      h('span.i', { 'aria-hidden': 'true', html: MA.icon('info', 'sm') }),
      h('div', h('p', h('strong', t('sample.banner')))),
      can ? MA.ui.btn(t('sample.remove'), { icon: 'trash', size: 'sm', onclick: removeSampleNow }) : null);
  }

  /* ---------- sharing and the one-time code ---------- */
  function markSent(cid, on) {
    const m = { ...sentMap() };
    if (on) m[cid] = new Date().toISOString(); else delete m[cid];
    MA.db.set(SENT_KEY, m);
    MA.toast(esc(t(on ? 'acc.marked' : 'acc.unmarked')));
    if (S) paintMain(S);
  }
  /** Copies the portal link (never the code), then offers to mark it as sent. Sending is still the team's act. */
  function shareLink(c) {
    MA.copy(clientUrl(c.slug), false).then(ok => {
      if (ok) MA.toast(esc(t('linkCopied')), { action: { label: t('acc.markSent'), run: () => markSent(c.id, true) } });
      else MA.toast(esc(t('acc.copyFail')), { tone: 'bad' });
    });
  }
  /** Shows the portal link and the client code once, each with a copy button. It stays until Done is pressed. */
  function codeModal(client, code, kind) {
    const link = clientUrl(client.slug);
    const copyCode = MA.ui.btn(t('copy'), { icon: 'copy', size: 'sm', onclick: () => MA.copy(code, t('code.copied')) });
    copyCode.setAttribute('aria-label', t('code.copyCode'));
    const codeBox = h('div.cl-codebox', h('code.cl-code', { dir: 'ltr' }, code), copyCode);
    const copyLink = MA.ui.btn(t('copy'), { icon: 'copy', size: 'sm', onclick: () => MA.copy(link, t('linkCopied')) });
    copyLink.setAttribute('aria-label', t('code.copyLink'));
    const linkRow = h('div.cl-copyrow', h('input.input', { value: link, readonly: true, dir: 'ltr', spellcheck: false, 'aria-label': t('code.link') }), copyLink);
    const body = h('div.stack.cl-form',
      h('p.cl-line', t('code.note')),
      h('div.field', h('span.field-label', t('code.label')), codeBox),
      MA.ui.field(t('code.link'), linkRow));
    MA.ui.modal({ title: esc(t(kind === 'reset' ? 'code.resetTitle' : 'code.newTitle')), body, size: 'cl-modal-sm', dismissable: false,
      // what opened the dialog was drawn again meanwhile, so focus goes to the page title instead of falling to the top of the page
      onClose: () => setTimeout(() => {
        if (document.activeElement && document.activeElement !== document.body) return;
        const hd = S && S.main.querySelector('h1');
        if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
      }, 0),
      actions: [{ label: t('code.done'), icon: 'check', kind: 'primary' }] });
  }
  async function resetCode(c) {
    if (!canEdit()) return;
    const ok = await MA.ui.confirm(esc(t('acc.resetTitle', { name: dn(c) })), esc(t('acc.resetHelp')), { ok: t('acc.reset'), danger: true });
    if (!ok) return;
    try {
      const r = await api().admin.resetCode(c.id);
      await load();
      codeModal(c, r.code, 'reset');
      if (S) paintMain(S);
    } catch (e) { fail(e); }
  }
  async function deleteClient(c) {
    if (!canEdit()) return;
    const ok = await MA.ui.confirm(esc(t('ws.deleteTitle', { name: dn(c) })), esc(t('ws.deleteText')), { ok: t('del'), danger: true });
    if (!ok) return;
    try {
      await api().admin.deleteClient(c.id);
      await load();
      MA.go('#/clients');
      MA.toast(esc(t('deleted')));
    } catch (e) { fail(e); }
  }



  /* ---------- the client dialog (new client, or edit the details) ---------- */
  /** One text control. */
  const textIn = (opts, val) => { const el = h('input.input', { autocomplete: 'off', spellcheck: false, ...opts }); el.value = val == null ? '' : String(val); return el; };
  /** A labelled field with its own error line (shown only when there is something to say). */
  function fieldWithErr(label, ctl, errs, key) {
    const e = h('p.err', { hidden: true });
    if (errs) errs[key] = e;
    const w = MA.ui.field(label, ctl);
    e.id = MA.uid('cl-err');
    ctl.setAttribute('aria-describedby', [ctl.getAttribute('aria-describedby'), e.id].filter(Boolean).join(' '));   // the error is read with the field
    w.append(e);
    return w;
  }
  /** Name, role, email and phone of one contact, in a two by two grid. A row that is completely empty is skipped by the caller. */
  function contactFields(k) {
    const errs = {};
    const name = textIn({ maxlength: 120 }, k && k.name), role = textIn({ maxlength: 80 }, k && k.role);
    const email = textIn({ type: 'email', dir: 'ltr', inputmode: 'email' }, k && k.email), phone = textIn({ type: 'tel', dir: 'ltr', maxlength: 30, inputmode: 'tel' }, k && k.phone);
    const node = h('div.cl-grid2', fieldWithErr(t('form.name'), name, errs, 'name'), fieldWithErr(t('form.contactRole'), role, errs, 'role'),
      fieldWithErr(t('form.email'), email, errs, 'email'), fieldWithErr(t('form.phone'), phone, errs, 'phone'));
    const read = () => ({ name: name.value.trim(), role: role.value.trim() || null, email: email.value.trim() || null, phone: phone.value.trim() || null });
    const blank = () => { const r = read(); return !r.name && !r.role && !r.email && !r.phone; };
    /** Shows the problems of this contact. Returns the first control to focus, or null. */
    const check = () => {
      const r = read();
      const bad = [[!r.name, 'name', name, t('form.errName')], [!emailOk(r.email), 'email', email, t('form.errEmail')], [!phoneOk(r.phone), 'phone', phone, t('form.errPhone')]];
      let first = null;
      bad.forEach(([isBad, key, ctl, msg]) => { showErr(errs[key], isBad ? msg : ''); ctl.setAttribute('aria-invalid', String(isBad)); if (isBad && !first) first = ctl; });
      return first;
    };
    return { node, read, blank, check, name };
  }

  /** New client: ONE required field (name or company) and a folded "More details" (email, phone, notes, contacts). Edit: name and
   *  company on top (one of the two is needed), everything else under More details, open. Editors only. */
  function clientDialog(c) {
    if (!canEdit()) return;
    const isNew = !c, errs = {}, F = {}, entries = [];
    const formId = MA.uid('cl-client-form');
    F.email = textIn({ type: 'email', dir: 'ltr', inputmode: 'email' }, c && c.email);
    F.phone = textIn({ type: 'tel', dir: 'ltr', maxlength: 30, inputmode: 'tel' }, c && c.phone);
    F.notes = h('textarea.textarea', { rows: 3, maxlength: 5000 });
    F.notes.value = c && c.notes ? c.notes : '';
    let main, more;
    if (isNew) {
      F.name = textIn({ maxlength: 120, placeholder: t('form.ph.nameOrCompany'), required: true, 'aria-required': 'true' }, '');
      main = [fieldWithErr(t('form.nameOrCompany'), F.name, errs, 'need')];
      const contactsBox = h('div.stack');
      const addBtn = MA.ui.btn(t('form.addContact'), { icon: 'plus', size: 'sm' });
      const renumber = () => entries.forEach((e, i) => { e.legend.textContent = t('form.contactN', { n: MA.num(i + 1) }); });
      const addEntry = () => {
        if (entries.length >= 20) return;
        const cf = contactFields(null), legend = h('legend');
        const e = { cf, legend, el: null };
        const remove = MA.ui.btn(t('form.remove'), { kind: 'ghost', size: 'sm', icon: 'close', onclick: () => {
          const i = entries.indexOf(e); if (i < 0) return;
          entries.splice(i, 1); e.el.remove(); renumber(); addBtn.disabled = entries.length >= 20;
          addBtn.focus();
        } });
        e.el = h('fieldset.cl-contact', legend, cf.node, h('div.cl-row-act', remove));
        entries.push(e);
        contactsBox.append(e.el);
        renumber();
        addBtn.disabled = entries.length >= 20;
        cf.name.focus();
      };
      addBtn.addEventListener('click', addEntry);
      more = h('div.cl-fold-body',
        h('div.cl-grid2', fieldWithErr(t('form.email'), F.email, errs, 'email'), fieldWithErr(t('form.phone'), F.phone, errs, 'phone')),
        MA.ui.field(t('form.notes'), F.notes),
        h('div.stack', h('h3.h3', t('form.contacts')), contactsBox, h('div.cl-row-act', addBtn)));
    } else {
      F.name = textIn({ maxlength: 120 }, c.name);
      F.company = textIn({ maxlength: 120 }, c.company);
      F.whatsapp = textIn({ type: 'tel', dir: 'ltr', maxlength: 30, inputmode: 'tel' }, c.whatsapp);
      F.industry = textIn({ maxlength: 80, list: 'cl-industries' }, c.industry);
      F.website = textIn({ dir: 'ltr', maxlength: 200, inputmode: 'url' }, c.website);
      F.slug = textIn({ dir: 'ltr', maxlength: 40, required: true, 'aria-required': 'true' }, c.slug);
      const sentNow = statsOf(c).portal !== 'not_sent';
      const slugNote = h('p.cl-line.cl-warn', { hidden: true }, t('form.slugWarn'));
      F.slug.addEventListener('input', () => { slugNote.hidden = !(sentNow && F.slug.value.trim() !== c.slug); });
      const dl = h('datalist', { id: 'cl-industries' }, [...new Set(C.clients.map(x => x.industry).filter(Boolean))].map(x => h('option', { value: x })));
      main = [h('div.cl-grid2', MA.ui.field(t('form.name'), F.name), MA.ui.field(t('form.company'), F.company)), (errs.need = h('p.err', { hidden: true }))];
      more = h('div.cl-fold-body',
        h('div.cl-grid2', fieldWithErr(t('form.email'), F.email, errs, 'email'), fieldWithErr(t('form.phone'), F.phone, errs, 'phone')),
        h('div.cl-grid2', fieldWithErr(t('form.whatsapp'), F.whatsapp, errs, 'whatsapp'), MA.ui.field(t('form.industry'), F.industry)),
        h('div.cl-grid2', fieldWithErr(t('form.website'), F.website, errs, 'website'), fieldWithErr(t('form.slug'), F.slug, errs, 'slug')), slugNote,
        MA.ui.field(t('form.notes'), F.notes), dl);
      c = { ...c, __sent: sentNow };
    }
    const fold = foldable(t('form.more'), more, !isNew, 'more');
    const formEl = h('form.cl-form', { id: formId, novalidate: true, 'aria-label': t(isNew ? 'form.newTitle' : 'form.editTitle'), onsubmit: e => { e.preventDefault(); submit(); } },
      ...main, fold.btn, fold.body);

    /** Shows every problem at once. Returns the first control to focus, or null when all is well. */
    function check(v) {
      let first = null;
      const mark = (key, ctl, msg) => {
        const bad = showErr(errs[key], msg);
        if (ctl) ctl.setAttribute('aria-invalid', String(!!bad));
        if (bad && !first) first = ctl;
      };
      if (isNew) mark('need', F.name, v.name ? '' : t('form.errNeed'));
      else { const bad = showErr(errs.need, v.name || v.company ? '' : t('form.errNeed')); F.name.setAttribute('aria-invalid', String(bad)); F.company.setAttribute('aria-invalid', String(bad)); if (bad) first = F.name; }
      mark('email', F.email, emailOk(v.email) ? '' : t('form.errEmail'));
      mark('phone', F.phone, phoneOk(v.phone) ? '' : t('form.errPhone'));
      if (!isNew) {
        mark('whatsapp', F.whatsapp, phoneOk(v.whatsapp) ? '' : t('form.errPhone'));
        mark('website', F.website, websiteOf(F.website.value).ok ? '' : t('form.errWebsite'));
        const slugErr = !slugOk(v.slug) ? t('form.errSlug') : C.clients.some(x => x.slug === v.slug && x.id !== c.id) ? t('form.errSlugTaken') : '';
        mark('slug', F.slug, slugErr);
      }
      entries.forEach(e => { if (!e.cf.blank()) { const f = e.cf.check(); if (f && !first) first = f; } });
      return first;
    }
    function read() {
      const base = { email: F.email.value.trim() || null, phone: F.phone.value.trim() || null, notes: F.notes.value.trim() || null };
      if (isNew) return { name: F.name.value.trim(), ...base };
      return { name: F.name.value.trim() || null, company: F.company.value.trim() || null, industry: F.industry.value.trim() || null,
        website: websiteOf(F.website.value).value, slug: F.slug.value.trim().toLowerCase(), whatsapp: F.whatsapp.value.trim() || null, ...base };
    }
    let L = null, save = null;
    async function submit() {
      const v = read(), first = check(v);
      if (first) {
        if (fold.body.hidden && fold.body.contains(first)) fold.btn.click();   // the problem is in the folded part: open it
        first.focus();
        return;
      }
      setBusy(save, true);
      try {
        if (!isNew) {
          await api().admin.updateClient(c.id, v);
          await load();
          MA.toast(esc(t('saved')));
          if (c.__sent && v.slug !== c.slug) MA.toast(esc(t('form.slugChanged')), { tone: 'bad' });
          if (S) paintMain(S);
          if (L) L.close();
          return;
        }
        const r = await api().admin.createClient(v);
        let failed = 0;
        for (const e of entries) {
          if (e.cf.blank()) continue;
          try { await api().admin.createContact({ clientId: r.client.id, ...e.cf.read() }); } catch (err) { failed++; }
        }
        await load();
        if (L) L.close(true);
        if (failed) MA.toast(esc(t('form.contactPartial')), { tone: 'bad' });
        codeModal(r.client, r.code, 'new');
        if (S) paintMain(S);
      } catch (e) {
        fail(e);
        setBusy(save, false);
      }
    }
    save = MA.ui.btn(t(isNew ? 'form.create' : 'save'), { icon: 'check', kind: 'primary' });
    save.type = 'submit';
    save.setAttribute('form', formId);
    L = MA.ui.modal({ title: esc(t(isNew ? 'form.newTitle' : 'form.editTitle')), body: formEl, actions: [{ label: t('cancel'), kind: 'ghost' }], initial: () => F.name });
    L.el.querySelector('.modal-foot')?.append(save);
  }

  /* ---------- the directory ---------- */
  const PORTAL_ORDER = ['used', 'sent', 'not_sent'];
  const DIR_COLS = {
    name: { type: 'text', def: 'asc', get: r => dn(r.c) },
    active: { type: 'num', def: 'desc', get: r => r.s.active.length },
    due: { type: 'num', def: 'asc', get: r => (r.s.due ? ms(r.s.due + 'T00:00:00') : null) },
    last: { type: 'num', def: 'desc', get: r => r.s.last },
    portal: { type: 'num', def: 'asc', get: r => PORTAL_ORDER.indexOf(r.s.portal) },
  };
  const byName = (a, b) => MA.fold(dn(a.c)).localeCompare(MA.fold(dn(b.c)));
  const byLastThenName = (a, b) => (b.s.last - a.s.last) || byName(a, b);
  const chip = (label, n, on, onclick, k, icon) => h('button.cl-chip', { type: 'button', 'aria-pressed': String(!!on), dataset: { k }, onclick },
    icon ? MA.frag(MA.icon(icon, 'sm')) : null, h('span', label), h('span.cl-chip-n', MA.num(n)));
  const toggleIn = (set, v) => { if (set.has(v)) set.delete(v); else set.add(v); };
  const clientHay = (c, s) => [c.name, c.company, c.industry, c.email, c.slug, ...(c.contacts || []).flatMap(k => [k.name, k.email]), ...s.projects.map(p => p.title)].filter(Boolean).join(' ');
  function dirMatch(r) {
    const q = MA.fold(UI.q.trim());
    if (q && !MA.fold(clientHay(r.c, r.s)).includes(q)) return false;
    if (UI.ind.size && !UI.ind.has(r.c.industry)) return false;
    if (UI.hasActive && !r.s.active.length) return false;
    if (UI.hasUnread && !r.s.unread) return false;
    return true;
  }
  /** A due date flagged when it has passed or is within a week. Done projects are never flagged. */
  function dueBadge(ymd, open = true) {
    if (!ymd || !open) return null;
    const d = daysFrom(ymd);
    if (d < 0) return MA.ui.badge(t('overdue'), 'bad');
    if (d <= 7) return MA.ui.badge(t('dueSoon'), 'warn');
    return null;
  }
  const dueCell = (ymd, open) => (ymd ? h('span', dateYmd(ymd), ' ', dueBadge(ymd, open)) : h('span.cl-muted', t('none')));

  function pageDir(st) {
    const can = canEdit();
    const sample = api() && api().sampleLoaded() ? sampleBanner(can) : null;
    if (!C.clients.length) return h('div.stack', MA.ui.pageHead({ title: esc(t('title')), sub: esc(t('dir.sub')) }), sample, dirStart(can));
    const head = MA.ui.pageHead({ title: esc(t('title')), sub: esc(t('dir.sub')),
      actions: can ? [MA.ui.btn(t('dir.new'), { icon: 'plus', kind: 'primary', onclick: () => clientDialog(null) })] : [] });
    const rows = C.clients.map(c => ({ c, s: statsOf(c) }));
    const industries = [...new Set(C.clients.map(c => c.industry).filter(Boolean))].sort((a, b) => MA.fold(a).localeCompare(MA.fold(b)));
    const count = fn => rows.filter(fn).length;
    const q = h('input.input', { type: 'search', autocomplete: 'off', spellcheck: false, placeholder: t('dir.search'), 'aria-label': t('dir.search'), dataset: { k: 'q' },
      oninput: e => { UI.q = e.target.value; fillDir(st); } });
    q.value = UI.q;
    const search = h('div.cl-search', MA.frag(MA.icon('search', 'sm')), q);
    const indChips = industries.length
      ? h('div.cl-chips', { role: 'group', 'aria-label': t('dir.chipsIndustry') },
        ...industries.map((v, i) => chip(MA.siteText(v, 'auto'), count(r => r.c.industry === v), UI.ind.has(v), () => { toggleIn(UI.ind, v); st.focusK = 'ind-' + i; paintMain(st); }, 'ind-' + i, 'tag')))
      : null;
    const flags = h('div.cl-chips', { role: 'group', 'aria-label': t('filter') },
      chip(t('dir.hasActive'), count(r => r.s.active.length), UI.hasActive, () => { UI.hasActive = !UI.hasActive; st.focusK = 'flag-active'; paintMain(st); }, 'flag-active', 'board'),
      chip(t('dir.hasUnread'), count(r => r.s.unread), UI.hasUnread, () => { UI.hasUnread = !UI.hasUnread; st.focusK = 'flag-unread'; paintMain(st); }, 'flag-unread', 'bell'));
    const anyFilter = UI.q.trim() || UI.ind.size || UI.hasActive || UI.hasUnread;
    const clear = anyFilter ? MA.ui.btn(t('clear'), { icon: 'close', kind: 'ghost', size: 'sm', onclick: () => { UI.q = ''; UI.ind.clear(); UI.hasActive = false; UI.hasUnread = false; st.focusK = 'q'; paintMain(st); } }) : null;
    st.count = h('p.cl-count', { 'aria-live': 'polite' });
    st.tbody = h('tbody');
    const sort = sortOf('dir');
    const th = (col, label, cls) => sortTh('dir', col, label, DIR_COLS, sort, cls);
    const table = h('div.table-wrap', h('table.table.cl-table.cl-dir', h('caption.sr-only', t('dir.caption')),
      h('thead', h('tr', th('name', t('dir.colName')), th('active', t('dir.colActive'), '.cl-num'), th('due', t('dir.colNext')), th('last', t('dir.colLast')), th('portal', t('dir.colPortal')),
        h('th.shrink', { scope: 'col' }, h('span.sr-only', t('dir.colActions'))))),
      st.tbody));
    fillDir(st);
    return h('div.stack', head, sample,
      h('div.cl-toolbar', search, indChips, flags, h('div.cl-toolbar-end', clear, st.count)), table);
  }

  function fillDir(st) {
    if (!st.tbody) return;
    const sort = sortOf('dir');
    const rows = sortRows(C.clients.map(c => ({ c, s: statsOf(c) })).filter(dirMatch), DIR_COLS, sort, sort ? byName : byLastThenName);
    st.tbody.replaceChildren(...(rows.length ? rows.map(dirRow) : [h('tr', h('td.cl-none', { colspan: 6 }, t('noMatch')))]));
    const filtering = UI.q.trim() || UI.ind.size || UI.hasActive || UI.hasUnread;
    st.count.textContent = filtering ? t('showing', { n: MA.num(rows.length), total: MA.num(C.clients.length) }) : '';
    st.sel = -1;
  }

  function dirRow({ c, s }) {
    const href = '#/clients/' + c.id;
    const unread = s.unread ? h('div', MA.ui.badge(t('unreadBadge', { n: MA.num(s.unread) }), 'flare')) : null;
    const nextDue = s.due ? h('span', dateYmd(s.due), ' ', dueBadge(s.due)) : h('span.cl-muted', t('none'));
    return h('tr', { dataset: { sel: '1', id: c.id }, onclick: e => { if (!e.target.closest('a,button,input,select,textarea')) MA.go(href); } },
      h('td.cl-name', h('a.cl-link', { href }, MA.siteText(dn(c), 'auto')), coOf(c) ? h('div.cl-muted', MA.siteText(coOf(c), 'auto')) : null, unread),
      h('td.cl-num', MA.num(s.active.length)),
      h('td', nextDue),
      h('td', h('time', { datetime: new Date(s.last).toISOString() }, MA.ago(new Date(s.last).toISOString()))),
      h('td', MA.ui.badge(t('portal.' + s.portal), PORTAL_TONE[s.portal])),
      h('td.shrink', h('div.cl-row-act', MA.ui.iconBtn('link', { tip: t('dir.copyLink'), onclick: () => shareLink(c) }))));
  }

  /** No clients yet: one big button, and (in local mode) a quiet way to look around with sample data. */
  function dirStart(can) {
    if (!can) return MA.ui.empty({ icon: 'team', title: t('dir.empty.ro'), compact: true });
    return h('section.cl-start',
      MA.ui.btn(t('dir.empty.title'), { icon: 'plus', kind: 'primary', size: 'lg', onclick: () => clientDialog(null) }),
      api() && api().mode === 'local' ? MA.ui.btn(t('sample.load'), { icon: 'sparkle', kind: 'ghost', size: 'sm', onclick: e => loadSampleNow(e.currentTarget) }) : null);
  }

  /* ---------- projects in tables (shared by a client, the projects page and the overview) ---------- */
  const dueKey = p => (p.dueDate ? ms(p.dueDate + 'T00:00:00') : Infinity);
  const byTitle = (a, b) => MA.fold(a.title).localeCompare(MA.fold(b.title));
  const byDueThenTitle = (a, b) => (dueKey(a) - dueKey(b)) || byTitle(a, b);
  const PROJ_COLS = {
    title: { type: 'text', def: 'asc', get: p => p.title },
    client: { type: 'text', def: 'asc', get: p => clientName(p.clientId) },
    status: { type: 'num', def: 'asc', get: p => PSTAT.indexOf(p.status) },
    priority: { type: 'num', def: 'desc', get: p => (p.priority ? PRI_RANK[p.priority] : null) },
    progress: { type: 'num', def: 'desc', get: p => (p.steps.length ? doneSteps(p) / p.steps.length : null) },
    due: { type: 'num', def: 'asc', get: p => (p.dueDate ? dueKey(p) : null) },
    owner: { type: 'text', def: 'asc', get: p => p.ownerName },
    updated: { type: 'num', def: 'desc', get: p => ms(p.updatedAt) },
  };
  /** A sortable table of projects. key keeps the sort per table. showClient adds the client column. */
  function projectTable(key, list, showClient) {
    const sort = sortOf(key);
    const th = (col, label, cls) => sortTh(key, col, label, PROJ_COLS, sort, cls);
    const rows = sortRows(list, PROJ_COLS, sort, sort ? byTitle : byDueThenTitle);
    return h('div.table-wrap', h('table.table.cl-table', h('caption.sr-only', t('pr.caption')),
      h('thead', h('tr', th('title', t('pr.title')), showClient ? th('client', t('pr.client')) : null, th('status', t('pr.status')),
        th('priority', t('pr.priority')), th('progress', t('pr.progress')), th('due', t('pr.due')), th('owner', t('pr.owner')), th('updated', t('pr.updated')))),
      h('tbody', rows.map(p => projectRow(p, showClient)))));
  }
  /** The stages approved, as a small bar and "2 of 6". The bar is decoration: the words carry the number. */
  function progressCell(p) {
    const total = p.steps.length, done = doneSteps(p);
    if (!total) return h('span.cl-muted', t('none'));
    return h('div.cl-prog', { title: t('pr.progressLabel', { done: MA.num(done), total: MA.num(total) }) },
      h('span.cl-meter', { 'aria-hidden': 'true' }, h('i', { style: { width: Math.round(done / total * 100) + '%' } })),
      h('span', t('pr.progressVal', { done: MA.num(done), total: MA.num(total) })));
  }
  function projectRow(p, showClient) {
    const href = '#/clients/projects/' + p.id;
    return h('tr', { dataset: { sel: '1', id: p.id }, onclick: e => { if (!e.target.closest('a,button,input,select,textarea')) MA.go(href); } },
      h('td', h('a.cl-link', { href }, MA.siteText(p.title, 'auto'))),
      showClient ? h('td', MA.siteText(clientName(p.clientId), 'auto')) : null,
      h('td', MA.ui.badge(pStatus(p.status), PTONE[p.status])),
      h('td', p.priority ? t('pri.' + p.priority) : h('span.cl-muted', t('none'))),
      h('td', progressCell(p)),
      h('td', dueCell(p.dueDate, p.status !== 'done')),
      h('td', p.ownerName ? MA.siteText(p.ownerName, 'auto') : h('span.cl-muted', t('none'))),
      h('td', h('time', { datetime: new Date(ms(p.updatedAt)).toISOString() }, ago(p.updatedAt))));
  }

  /* ---------- a client's workspace ---------- */
  /** Opens the project wizard from clients-project.js. Without it, the page says so. */
  function openWizard(cid) {
    const W = MA.clientsProject;
    if (!W || typeof W.wizard !== 'function') { MA.toast(esc(t('wizardMissing')), { tone: 'bad' }); return; }
    // The wizard resolves with the new project's id, or null when nothing was made. Then the page is drawn again, with focus back on New project.
    Promise.resolve(W.wizard({ clientId: cid || null })).then(made => {
      if (!made) return null;
      return load().then(() => { if (S) { S.focusK = 'new-project'; paintMain(S); } });
    }).catch(e => fail(e));
  }
  /** Marks an element so a redraw can put focus back on it. */
  const keyed = (el, k) => { el.dataset.k = k; return el; };
  const reviewHref = x => '#/clients/projects/' + x.p.id + '?deliverable=' + x.d.id;

  function pageClient(st, w) {
    const c = clientById(w.cid);
    if (!c) return missingView();
    const can = canEdit(), s = statsOf(c);
    const more = can ? MA.ui.iconBtn('moreV', { tip: t('ws.more'), menu: true, onclick: e => MA.ui.menu(e.currentTarget, [
      { label: t('acc.reset'), icon: 'refresh', run: () => resetCode(c) }, '-',
      { label: t('ws.delete'), icon: 'trash', danger: true, run: () => deleteClient(c) },
    ], { label: t('ws.more') }) }) : null;
    const sub = [coOf(c), c.industry].filter(Boolean).join(' · ');
    const head = MA.ui.pageHead({ title: esc(dn(c)), sub: esc(sub), actions: [
      can ? keyed(MA.ui.btn(t('ws.newProject'), { icon: 'plus', kind: 'primary', onclick: () => openWizard(c.id) }), 'new-project') : null,
      MA.ui.btn(t('ws.share'), { icon: 'link', onclick: () => shareLink(c) }),
      previewBtn(c),
      more,
    ].filter(Boolean) });
    head.querySelector('h1')?.setAttribute('dir', 'auto');
    const status = h('div.cl-status', MA.ui.badge(t('portal.' + s.portal), PORTAL_TONE[s.portal]));
    const panel = h('div.cl-panel', { id: 'cl-panel-' + c.id });
    const bodyFor = { overview: tabOverview, projects: tabProjects, numbers: tabNumbers, share: tabShare };
    panel.append(bodyFor[w.tab](c, s));
    const tabs = MA.ui.tabs(TABS.map(v => ({ value: v, label: t('ws.tab.' + v), icon: TAB_ICON[v], count: v === 'projects' ? MA.num(s.projects.length) : null })), w.tab,
      v => MA.go('#/clients/' + c.id + (v === 'overview' ? '' : '/' + v)), { label: t('ws.tabs'), panel });
    return h('div.stack', head, status, tabs, panel);
  }

  /** Overview: four figures, what needs the team, the latest activity, and the folded Details (info, contacts, notes). */
  function tabOverview(c, s) {
    const can = canEdit();
    const parts = [];
    if (!s.projects.length) {
      parts.push(MA.ui.empty({ icon: 'board', title: t('ov.noProjects'), compact: true,
        actions: can ? [MA.ui.btn(t('ws.newProject'), { icon: 'plus', kind: 'primary', size: 'sm', onclick: () => openWizard(c.id) })] : [] }));
    } else {
      const items = reviewItems().filter(x => x.p.clientId === c.id);
      const waiting = items.filter(x => x.status === 'in_review'), changes = items.filter(x => x.status === 'changes');
      const unread = notesOf(c.id).filter(n => !n.readAt);
      const due = s.active.filter(p => p.dueDate && daysFrom(p.dueDate) <= 14).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const kpi = (icon, label, n) => h('div.cl-kpi', ico(icon), h('strong.cl-kpi-n', MA.num(n)), h('span.cl-kpi-l', label));
      parts.push(h('div.cl-kpis', kpi('board', t('ov.kActive'), s.active.length), kpi('clock', t('ov.kWaiting'), waiting.length),
        kpi('edit', t('ov.kChanges'), changes.length), kpi('bell', t('ov.kUnread'), unread.length)));
      const row = (icon, link, meta, badge) => h('li', { dataset: { sel: '1' } }, ico(icon),
        h('div.cl-row-main', h('div', link, badge ? ' ' : null, badge), meta ? h('div.cl-muted', meta) : null));
      const reviewRow = (x, icon, tone) => row(icon, h('a.cl-link', { href: reviewHref(x) }, MA.siteText(x.d.title, 'auto')),
        [MA.siteText(x.p.title, 'auto'), ' · ', t('ov.waitFor', { ago: ago(new Date(x.since).toISOString()) })], MA.ui.badge(dStatus(x.status), tone));
      const dueRow = p => row('calendar', h('a.cl-link', { href: '#/clients/projects/' + p.id }, MA.siteText(p.title, 'auto')), dueCell(p.dueDate, true));
      const rows = [...changes.map(x => reviewRow(x, 'edit', 'bad')), ...waiting.map(x => reviewRow(x, 'clock', 'warn')), ...due.map(dueRow)];
      parts.push(h('section.cl-sec', h('h2.h3', t('ov.attention')),
        rows.length ? h('ul.cl-list.cl-rows', rows) : h('p.cl-clear', ico('check'), h('span', t('ov.clear')))));
      parts.push(sectionActivity(c, s));
    }
    parts.push(detailsSection(c, s));
    return h('div.stack', parts);
  }

  /** The latest things the client did (and the team's replies). Six show; "Show all" opens the rest. The project filter appears with two projects. */
  function sectionActivity(c, s) {
    const multi = s.projects.length > 1;
    const cur = !multi || UI.act === 'all' || !s.projects.some(p => p.id === UI.act) ? 'all' : UI.act;
    const items = activityOf(c.id, cur === 'all' ? null : cur);
    const all = !!UI.actAll[c.id], shown = all ? items : items.slice(0, 6);
    const sel = multi ? MA.ui.select([{ value: 'all', label: t('act.all') }, ...s.projects.map(p => ({ value: p.id, label: p.title }))], cur,
      v => { UI.act = v; if (S) { S.focusK = 'act-filter'; paintMain(S); } }, { label: t('act.filter') }) : null;
    if (sel) sel.dataset.k = 'act-filter';
    const list = shown.length
      ? h('ol.cl-activity', shown.map(x => h('li', { dataset: { sel: '1' } }, h('span.cl-act-ico', MA.frag(MA.icon(x.icon))),
        h('div.grow', h('strong', t(x.key, x.vars)), x.unread ? [' ', MA.ui.badge(t('inb.unreadLabel'), 'flare')] : null, x.body ? h('p.cl-note-body', MA.siteText(clip(x.body, 400), 'auto')) : null, h('div.cl-muted', ago(x.at))))))
      : MA.ui.empty({ icon: 'chat', title: t('act.empty'), text: t('act.emptyText'), compact: true });
    const toggle = items.length > 6 ? keyed(MA.ui.btn(t(all ? 'act.showLess' : 'act.showAll'), { icon: all ? 'chevUp' : 'chevDown', kind: 'ghost', size: 'sm',
      onclick: () => { UI.actAll[c.id] = !all; if (S) { S.focusK = 'act-more'; paintMain(S); } } }), 'act-more') : null;
    return h('section.cl-sec', h('div.cl-head', h('h2.h3', t('act.title')), sel), list, toggle ? h('div', toggle) : null);
  }

  /** Details, folded: what is known about the client, the contacts and the notes. Open state is kept while the page redraws. */
  function detailsSection(c, s) {
    const can = canEdit(), contacts = c.contacts || [];
    const row = (label, val) => (val ? [h('dt', label), h('dd', val)] : []);
    const web = c.website ? h('a', { href: c.website, target: '_blank', rel: 'noopener', dir: 'ltr' }, c.website) : null;
    const info = h('dl.cl-dl',
      ...row(t('form.name'), c.name ? MA.siteText(c.name, 'auto') : null), ...row(t('form.company'), coOf(c) || !c.name ? MA.siteText(c.company, 'auto') : null),
      ...row(t('form.industry'), c.industry ? MA.siteText(c.industry, 'auto') : null), ...row(t('form.website'), web),
      ...row(t('form.email'), c.email ? h('a', { href: 'mailto:' + c.email, dir: 'ltr' }, c.email) : null),
      ...row(t('form.phone'), c.phone ? h('span', { dir: 'ltr' }, c.phone) : null), ...row(t('form.whatsapp'), c.whatsapp ? h('span', { dir: 'ltr' }, c.whatsapp) : null),
      ...row(t('ov.linkName'), h('span.cl-mono', { dir: 'ltr' }, c.slug)), ...row(t('ov.added'), dateIso(c.createdAt)));
    const full = contacts.length >= 20;
    const addBtn = can ? MA.ui.btn(t('ct.add'), { icon: 'plus', size: 'sm', disabled: full, onclick: () => contactDialog(c, null) }) : null;
    const list = contacts.length
      ? h('div.table-wrap', h('table.table.cl-table', h('caption.sr-only', t('ct.contacts')),
        h('thead', h('tr', h('th', { scope: 'col' }, t('ct.colName')), h('th', { scope: 'col' }, t('ct.colRole')), h('th', { scope: 'col' }, t('ct.colEmail')),
          h('th', { scope: 'col' }, t('ct.colPhone')), h('th.shrink', { scope: 'col' }, h('span.sr-only', t('edit'))))),
        h('tbody', contacts.map(k => h('tr', h('td', MA.siteText(k.name, 'auto')), h('td', k.role ? MA.siteText(k.role, 'auto') : h('span.cl-muted', t('none'))),
          h('td', k.email ? h('span', { dir: 'ltr' }, k.email) : h('span.cl-muted', t('none'))), h('td', k.phone ? h('span', { dir: 'ltr' }, k.phone) : h('span.cl-muted', t('none'))),
          h('td.shrink', can ? h('div.cl-row-act', MA.ui.iconBtn('edit', { tip: t('ct.contactEdit'), onclick: () => contactDialog(c, k) }),
            MA.ui.iconBtn('trash', { tip: t('del'), onclick: () => deleteContact(c, k) })) : null))))))
      : h('p.cl-clear', ico('user'), h('span', t('ct.empty')));
    const notes = h('textarea.textarea', { rows: 4, maxlength: 5000, 'aria-label': t('ct.notes') });
    notes.value = c.notes || '';
    const saveNotes = MA.ui.btn(t('save'), { icon: 'check', kind: 'primary', size: 'sm', disabled: !can, onclick: async () => {
      setBusy(saveNotes, true);
      try { await api().admin.updateClient(c.id, { notes: notes.value.trim() || null }); await load(); MA.toast(esc(t('ct.notesSaved'))); if (S) paintMain(S); }
      catch (e) { fail(e); setBusy(saveNotes, false); }
    } });
    const el = h('details.cl-details', { open: !!UI.open[c.id] },
      h('summary', MA.frag(MA.icon('chevDown', 'sm')), h('span', t('ov.details'))),
      h('div.cl-details-body',
        h('div.cl-head.cl-info', info, can ? MA.ui.btn(t('edit'), { icon: 'edit', size: 'sm', onclick: () => clientDialog(c) }) : null),
        h('section.cl-sub', h('div.cl-head', h('h3.h3', t('ct.contacts')), addBtn), full ? h('p.cl-line', t('ct.max')) : null, list),
        h('section.cl-sub', h('h3.h3', t('ct.notes')), h('div.cl-notes-box', notes), can ? h('div', saveNotes) : null)));
    // remembered on the click (it runs before the browser flips `open`, and a keyboard press on the summary is a click too) and on toggle
    el.querySelector('summary').addEventListener('click', () => { UI.open[c.id] = !el.open; });
    el.addEventListener('toggle', () => { UI.open[c.id] = el.open; });
    return el;
  }

  function tabProjects(c, s) {
    const can = canEdit();
    if (!s.projects.length) {
      return MA.ui.empty({ icon: 'board', title: t('pr.emptyTitle'), compact: true,
        actions: can ? [MA.ui.btn(t('ws.newProject'), { icon: 'plus', kind: 'primary', size: 'sm', onclick: () => openWizard(c.id) })] : [] });
    }
    return h('div.stack', projectTable('projects' + c.id, s.projects, false));
  }

  /* ---------- numbers: monthly figures per platform ---------- */
  const numberCell = n => (n == null ? h('span.cl-muted', t('none')) : MA.num(n));
  function tabNumbers(c, s) {
    const can = canEdit();
    const mine = C.metrics.filter(m => m.clientId === c.id);
    const key = 'social' + c.id;
    const addBtn = can ? MA.ui.btn(t('soc.add'), { icon: 'plus', kind: 'primary', size: 'sm', onclick: () => metricDialog(c, null, mine) }) : null;
    if (!mine.length) {
      return MA.ui.empty({ icon: 'chart', title: t('soc.emptyTitle'), compact: true, actions: addBtn ? [addBtn] : [] });
    }
    const cols = {
      month: { type: 'text', def: 'desc', get: m => m.month },
      platform: { type: 'text', def: 'asc', get: m => platformLabel(m.platform) },
      followers: { type: 'num', def: 'desc', get: m => m.followers },
      reach: { type: 'num', def: 'desc', get: m => m.reach },
      engagement: { type: 'num', def: 'desc', get: m => m.engagement },
      impressions: { type: 'num', def: 'desc', get: m => m.impressions },
    };
    const sort = sortOf(key);
    const th = (col, label, cls) => sortTh(key, col, label, cols, sort, cls);
    const rows = sortRows(mine, cols, sort, (a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : MA.fold(platformLabel(a.platform)).localeCompare(MA.fold(platformLabel(b.platform)))));
    const numTh = (col, label) => th(col, label, '.cl-num');
    return h('div.stack', addBtn ? h('div.cl-head.end', addBtn) : null, h('div.table-wrap', h('table.table.cl-table.cl-metrics', h('caption.sr-only', t('soc.caption')),
      h('thead', h('tr', th('month', t('soc.colMonth')), th('platform', t('soc.colPlatform')), numTh('followers', t('soc.colFollowers')),
        numTh('reach', t('soc.colReach')), numTh('engagement', t('soc.colEngagement')), numTh('impressions', t('soc.colImpressions')),
        h('th', { scope: 'col' }, t('soc.colShot')), h('th.shrink', { scope: 'col' }, h('span.sr-only', t('edit'))))),
      h('tbody', rows.map(m => metricRow(c, m, mine, can))))));
  }

  /** A row action: its icon, its word (shown on wide screens), and an aria-label that always names the row. */
  function rowAct(icon, word, label, onclick, danger) {
    return h('button', { type: 'button', class: 'btn ghost sm cl-act' + (danger ? ' danger' : ''), 'aria-label': label, title: label, onclick,
      html: MA.icon(icon) + '<span class="cl-act-txt">' + esc(word) + '</span>' });
  }
  function metricRow(c, m, mine, can) {
    const row = platformLabel(m.platform) + ' · ' + monthLabel(m.month);
    const shot = m.screenshotUrl ? shotThumb(m, row) : h('span.cl-muted', t('soc.noShot'));
    const acts = can ? h('div.cl-row-act', rowAct('edit', t('edit'), t('soc.editRow', { row }), () => metricDialog(c, m, mine)),
      rowAct('trash', t('del'), t('soc.delRow', { row }), () => deleteMetric(c, m), true)) : null;
    return h('tr', { dataset: { sel: '1' } }, h('td', monthLabel(m.month)), h('td', platformLabel(m.platform)),
      h('td.cl-num', numberCell(m.followers)), h('td.cl-num', numberCell(m.reach)),
      h('td.cl-num', m.engagement == null ? h('span.cl-muted', t('none')) : MA.num(m.engagement, { maximumFractionDigits: 2 }) + '%'),
      h('td.cl-num', numberCell(m.impressions)), h('td', shot), h('td.shrink', acts));
  }
  /** A row's screenshot as a fixed thumbnail (a button). The picture is resolved after drawing (resolveFiles), so the row never waits on it.
   *  Without a picture the frame shows the image icon, so the row keeps its height. Clicking it opens the larger view. */
  function shotThumb(m, row) {
    const img = h('img.cl-thumb-img', { alt: t('soc.shotAlt', { row }), decoding: 'async', dataset: { file: m.screenshotUrl } });
    return h('button.cl-thumb', { type: 'button', 'aria-label': t('soc.shotOpen', { row }), onclick: () => viewShot(m, row) },
      h('span.cl-thumb-ph', { 'aria-hidden': 'true', html: MA.icon('image') }), img);
  }
  /** The larger view of a row's screenshot, in a dialog. The original file opens in a new tab from there. */
  function viewShot(m, row) {
    const img = h('img.cl-lb-img', { alt: t('soc.shotAlt', { row }), decoding: 'async', dataset: { file: m.screenshotUrl } });
    const open = h('a.cl-link', { href: '#', dataset: { file: m.screenshotUrl }, target: '_blank', rel: 'noopener' }, t('soc.shotFile'));
    const L = MA.ui.modal({ title: esc(row), size: 'wide', body: el => el.append(h('figure.cl-lb', img,
      m.note ? h('figcaption.small.muted', MA.siteText(m.note, 'auto')) : null, h('p.small', open))) });
    resolveFiles(L.el);
  }

  /** The fields for one row of numbers: month and platform, the four figures (all optional), and a folded note and screenshot. */
  function metricFields(m) {
    const month = h('input.input', { type: 'month', dir: 'ltr', required: true });
    month.value = m ? m.month : thisMonth();
    const platform = MA.ui.select(PLATFORMS.map(p => ({ value: p, label: platformLabel(p) })), m ? m.platform : 'instagram', () => {}, { label: t('soc.fPlatform') });
    const num = (key, step) => { const inp = h('input.input', { type: 'number', min: 0, step, inputmode: 'decimal', dir: 'ltr' }); inp.value = m && m[key] != null ? String(m[key]) : ''; return inp; };
    const followers = num('followers', 1), reach = num('reach', 1), engagement = num('engagement', 0.01), impressions = num('impressions', 1);
    const note = h('input.input', { maxlength: 500, autocomplete: 'off' });
    note.value = m && m.note ? m.note : '';
    let file = null;
    const shotName = h('span.cl-muted', m && m.screenshotUrl ? t('soc.kept') : t('soc.noShot'));
    const pick = MA.ui.btn(t('soc.choose'), { icon: 'image', size: 'sm' });
    pick.addEventListener('click', async () => {
      const [f] = await MA.pickFile({ accept: IMAGE_ACCEPT });
      if (!f) return;
      const why = imageProblem(f);
      if (why) { MA.toast(esc(why), { tone: 'bad' }); return; }
      file = f; shotName.textContent = f.name;
    });
    const extra = h('div.cl-fold-body', MA.ui.field(t('soc.fNote'), note),
      h('div.field', h('span.field-label', t('soc.fShot')), h('div.cl-shot', pick, shotName)));
    const fold = foldable(t('form.more'), extra, !!(m && (m.note || m.screenshotUrl)), 'more');
    const node = h('div.cl-fields',
      h('div.cl-grid2', MA.ui.field(t('soc.fMonth'), month), MA.ui.field(t('soc.fPlatform'), platform),
        MA.ui.field(t('soc.fFollowers'), followers), MA.ui.field(t('soc.fReach'), reach),
        MA.ui.field(t('soc.fEngagement'), engagement), MA.ui.field(t('soc.fImpressions'), impressions)),
      fold.btn, fold.body);
    return {
      node,
      read: () => ({ month: month.value, platform: platform.value, followers: readNum(followers), reach: readNum(reach),
        engagement: readNum(engagement), impressions: readNum(impressions), note: note.value.trim() || null }),
      file: () => file,
    };
  }

  /** '' when the row can be saved, else the message. */
  function metricProblem(v, mine, m) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.month || '')) return t('soc.errMonth');
    if (['followers', 'reach', 'engagement', 'impressions'].some(k => Number.isNaN(v[k]))) return t('soc.errNumber');
    if (mine.some(x => x.platform === v.platform && x.month === v.month && (!m || x.id !== m.id))) {
      return t('soc.errTaken', { platform: platformLabel(v.platform), month: monthLabel(v.month) });
    }
    return '';
  }
  async function saveMetric(c, v, file, m) {
    const body = { ...v };
    if (file) body.screenshotUrl = (await api().upload(file)).url;
    if (m) return api().admin.updateMetric(m.id, body);
    return api().admin.createMetric({ clientId: c.id, ...body });
  }

  function metricDialog(c, m, mine) {
    if (!canEdit()) return;
    const f = metricFields(m);
    const err = h('p.err', { hidden: true });
    let L = null;
    const save = MA.ui.btn(t('save'), { icon: 'check', kind: 'primary' });
    save.addEventListener('click', async () => {
      const v = f.read(), why = metricProblem(v, mine, m);
      if (showErr(err, why)) return;
      setBusy(save, true);
      try {
        await saveMetric(c, v, f.file(), m);
        await load();
        MA.toast(esc(t('soc.saved')));
        if (L) L.close();
        if (S) paintMain(S);
      } catch (e) { fail(e); setBusy(save, false); }
    });
    L = MA.ui.modal({ title: esc(t(m ? 'soc.edit' : 'soc.add')), body: h('div.stack.cl-form', f.node, err), actions: [{ label: t('cancel'), kind: 'ghost' }], dismissable: true });
    L.el.querySelector('.modal-foot')?.append(save);
  }

  async function deleteMetric(c, m) {
    if (!canEdit()) return;
    const ok = await MA.ui.confirm(esc(t('soc.delTitle')), esc(t('soc.delText', { platform: platformLabel(m.platform), month: monthLabel(m.month) })), { ok: t('del'), danger: true });
    if (!ok) return;
    try { await api().admin.deleteMetric(m.id); await load(); MA.toast(esc(t('soc.deleted'))); if (S) paintMain(S); } catch (e) { fail(e); }
  }


  /* ---------- contacts (inside Details) ---------- */
  function contactDialog(c, k) {
    if (!canEdit()) return;
    const cf = contactFields(k || null);
    const body = h('form.cl-form', { novalidate: true, 'aria-label': t(k ? 'ct.contactEdit' : 'ct.contactNew'), onsubmit: e => { e.preventDefault(); save.click(); } }, cf.node);
    let L = null;
    const save = MA.ui.btn(t('save'), { icon: 'check', kind: 'primary' });
    save.addEventListener('click', async () => {
      const first = cf.check();
      if (first) { first.focus(); return; }
      const v = cf.read();
      setBusy(save, true);
      try {
        if (k) await api().admin.updateContact(k.id, v); else await api().admin.createContact({ clientId: c.id, ...v });
        await load();
        MA.toast(esc(t('form.contactSaved')));
        if (L) L.close();
        if (S) paintMain(S);
      } catch (e) { fail(e); setBusy(save, false); }
    });
    L = MA.ui.modal({ title: esc(t(k ? 'ct.contactEdit' : 'ct.contactNew')), body, actions: [{ label: t('cancel'), kind: 'ghost' }], initial: () => cf.name });
    L.el.querySelector('.modal-foot')?.append(save);
  }

  async function deleteContact(c, k) {
    if (!canEdit()) return;
    const ok = await MA.ui.confirm(esc(t('ct.delTitle', { name: k.name })), esc(t('ct.delText')), { ok: t('del'), danger: true });
    if (!ok) return;
    try { await api().admin.deleteContact(k.id); await load(); MA.toast(esc(t('ct.removed'))); if (S) paintMain(S); } catch (e) { fail(e); }
  }


  /* ---------- share: the link, the sent mark, the messages and the code ---------- */
  function tabShare(c, s) {
    const can = canEdit(), link = clientUrl(c.slug);
    const msgEn = `Hello ${dn(c)}, here is your private MIRAS portal link: ${link}\nYou will receive your access code in a separate message.`;
    const msgAr = `مرحباً ${dn(c)}، هذا رابط بوابة ميراس الخاصة بكم: ${link}\nسيصلكم رمز الدخول في رسالة منفصلة.`;
    const copyMsg = text => MA.copy(text, t('acc.msgCopied'));
    const linkRow = h('div.cl-copyrow', h('input.input', { value: link, readonly: true, dir: 'ltr', spellcheck: false, 'aria-label': t('acc.link') }),
      MA.ui.btn(t('acc.copyLink'), { icon: 'copy', size: 'sm', onclick: () => MA.copy(link, t('linkCopied')) }));
    const sentOn = s.sentAt ? t('acc.sentOn', { date: dateIso(s.sentAt) }) : null;
    const markBtn = can ? MA.ui.btn(t(s.sentAt ? 'acc.unmark' : 'acc.markSent'), { icon: s.sentAt ? 'close' : 'check', size: 'sm', onclick: () => markSent(c.id, !s.sentAt) }) : null;
    return h('div.stack', h('section.cl-sec',
      h('div.cl-line-label', ico('link'), h('h2.h3', t('acc.link'))), linkRow,
      h('div.cl-status', MA.ui.badge(t('portal.' + s.portal), PORTAL_TONE[s.portal]), sentOn ? h('span.cl-muted', sentOn) : null, markBtn),
      h('div.cl-row-act.wrap', MA.ui.btn(t('acc.copyEn'), { icon: 'chat', size: 'sm', onclick: () => copyMsg(msgEn) }), MA.ui.btn(t('acc.copyAr'), { icon: 'chat', size: 'sm', onclick: () => copyMsg(msgAr) })),
      can ? h('div', MA.ui.btn(t('acc.reset'), { icon: 'refresh', kind: 'danger', size: 'sm', onclick: () => resetCode(c) })) : null));
  }

  /* ---------- activity: client events and team replies for this client (or one project), newest first ---------- */

  function activityOf(cid, pid) {
    const items = [];
    const add = (at, key, vars, body, icon, pid2, unread) => items.push({ at, key, vars, body, icon, pid: pid2, unread: !!unread });
    C.projects.filter(p => p.clientId === cid && (!pid || p.id === pid)).forEach(p => {
      add(p.createdAt, 'act.started', {}, '', 'flag', p.id);
      p.deliverables.forEach(d => add(d.createdAt, 'act.added', { title: d.title }, '', 'plus', p.id));
      p.comments.filter(x => x.authorRole === 'team').forEach(x => add(x.createdAt, 'act.team', {}, x.body, 'chat', p.id));
    });
    notesOf(cid).filter(n => !pid || n.projectId === pid).forEach(n => {
      const p = projectById(n.projectId), d = deliverableOf(p, n.deliverableId);
      const title = d ? d.title : (p ? p.title : '');
      if (n.kind === 'comment') { const cm = commentFor(n, p); add(n.createdAt, 'act.comment', {}, cm ? cm.body : '', 'chat', n.projectId, !n.readAt); return; }
      if (n.kind === 'approval') { add(n.createdAt, n.value === 'changes' ? 'act.changes' : 'act.approved', { title }, '', n.value === 'changes' ? 'warn' : 'flag', n.projectId, !n.readAt); return; }
      const k = n.value === 'like' ? 'act.liked' : n.value === 'dislike' ? 'act.disliked' : legacyVerb(n) === 'like' ? 'act.liked' : legacyVerb(n) === 'dislike' ? 'act.disliked' : 'act.reacted';
      add(n.createdAt, k, { title }, '', 'star', n.projectId, !n.readAt);
    });
    return items.sort((a, b) => ms(b.at) - ms(a.at));
  }


  /* ---------- projects, every client: a sortable list or a board by status ---------- */
  function pageProjects() {
    const can = canEdit();
    const head = MA.ui.pageHead({ title: esc(t('nav.projects')), sub: esc(t('pr.sub')),
      actions: can ? [keyed(MA.ui.btn(t('pr.new'), { icon: 'plus', kind: 'primary', onclick: () => openWizard(null) }), 'new-project')] : [] });
    const box = h('div.cl-pbody');
    const fill = () => box.replaceChildren(projectsBody());
    const status = MA.ui.select([{ value: 'all', label: t('pr.allStatus') }, ...PSTAT.map(v => ({ value: v, label: pStatus(v) }))], UI.status,
      v => { UI.status = v; fill(); }, { label: t('pr.fStatus') });
    const client = MA.ui.select([{ value: 'all', label: t('pr.allClients') }, ...C.clients.map(c => ({ value: c.id, label: dn(c) }))], UI.client,
      v => { UI.client = v; fill(); }, { label: t('pr.fClient') });
    const view = MA.ui.seg([{ value: 'list', label: t('pr.list'), icon: 'list' }, { value: 'board', label: t('pr.board'), icon: 'board' }], UI.view,
      v => { UI.view = v; fill(); }, { label: t('pr.view') });
    fill();
    return h('div.stack', head, h('div.cl-toolbar', status, client, view), box);
  }
  function projectsBody() {
    const list = C.projects.filter(p => (UI.status === 'all' || p.status === UI.status) && (UI.client === 'all' || p.clientId === UI.client));
    if (!C.projects.length) {
      return MA.ui.empty({ icon: 'board', title: t('pr.emptyTitle'), compact: true,
        actions: canEdit() ? [MA.ui.btn(t('pr.new'), { icon: 'plus', kind: 'primary', size: 'sm', onclick: () => openWizard(null) })] : [] });
    }
    if (!list.length) return MA.ui.empty({ icon: 'search', title: t('noMatch'), compact: true, actions: [MA.ui.btn(t('clear'), { icon: 'close', kind: 'ghost', size: 'sm', onclick: () => { UI.status = 'all'; UI.client = 'all'; if (S) paintMain(S); } })] });
    if (UI.view === 'board') return boardOf(list);
    return projectTable('pr', list, true);
  }

  function boardOf(list) {
    return h('div.cl-board', PSTAT.map(s => {
      const items = list.filter(p => p.status === s).sort(byDueThenTitle);
      return h('section.cl-col', { 'aria-labelledby': 'cl-col-' + s },
        h('h2.h3', { id: 'cl-col-' + s }, pStatus(s), ' ', h('span.cl-chip-n', MA.num(items.length))),
        items.length
          ? h('ul.cl-list', items.map(p => h('li', { dataset: { sel: '1' } }, h('a.cl-link', { href: '#/clients/projects/' + p.id }, MA.siteText(p.title, 'auto')),
            h('div.cl-muted', MA.siteText(clientName(p.clientId), 'auto'), ' · ', dueCell(p.dueDate, p.status !== 'done')))))
          : h('p.cl-muted', t('pr.boardEmpty')));
    }));
  }


  /* ---------- review queue: what the client has to decide, and what the team has to fix ---------- */
  function pageApprovals() {
    const head = MA.ui.pageHead({ title: esc(t('nav.approvals')), sub: esc(t('apr.sub')) });
    const all = reviewItems();
    const box = h('div.stack');
    const fill = () => {
      const list = all.filter(x => UI.apr === 'all' || x.status === UI.apr);
      box.replaceChildren(!all.length
        ? MA.ui.empty({ icon: 'check', title: t('apr.emptyTitle'), compact: true })
        : !list.length ? MA.ui.empty({ icon: 'search', title: t('apr.emptyFilter'), compact: true }) : reviewTable(list));
    };
    const seg = MA.ui.seg([{ value: 'all', label: t('apr.f.all'), icon: 'list' }, { value: 'in_review', label: t('apr.f.waiting'), icon: 'clock' }, { value: 'changes', label: t('apr.f.changes'), icon: 'edit' }],
      UI.apr, v => { UI.apr = v; fill(); }, { label: t('filter') });
    fill();
    return h('div.stack', head, h('div.cl-toolbar', seg), box);
  }
  function reviewTable(list) {
    const cols = {
      item: { type: 'text', def: 'asc', get: x => x.d.title },
      client: { type: 'text', def: 'asc', get: x => clientName(x.p.clientId) },
      stage: { type: 'text', def: 'asc', get: x => (x.step ? x.step.title : '') },
      status: { type: 'num', def: 'asc', get: x => (x.status === 'changes' ? 0 : 1) },
      since: { type: 'num', def: 'asc', get: x => (x.since || null) },
      version: { type: 'num', def: 'desc', get: x => x.d.version },
    };
    const sort = sortOf('apr');
    const th = (col, label, cls) => sortTh('apr', col, label, cols, sort, cls);
    const rows = sortRows(list, cols, sort, (a, b) => a.since - b.since);
    return h('div.table-wrap', h('table.table.cl-table', h('caption.sr-only', t('apr.caption')),
      h('thead', h('tr', th('item', t('apr.colItem')), th('client', t('apr.colClient')), th('stage', t('apr.colStage')), th('status', t('apr.colStatus')),
        th('since', t('apr.colSince')), th('version', t('apr.colVersion'), '.cl-num'), h('th', { scope: 'col' }, t('apr.colNote')))),
      h('tbody', rows.map(x => {
        const since = new Date(x.since).toISOString();
        const note = x.status === 'changes' && x.d.approval && x.d.approval.note ? x.d.approval.note : '';
        return h('tr', { dataset: { sel: '1' } },
          h('td', h('a.cl-link', { href: reviewHref(x) }, MA.siteText(x.d.title, 'auto')), h('div.cl-muted', MA.siteText(x.p.title, 'auto'))),
          h('td', MA.siteText(clientName(x.p.clientId), 'auto')),
          h('td', x.step ? MA.siteText(x.step.title, 'auto') : h('span.cl-muted', t('none'))),
          h('td', MA.ui.badge(dStatus(x.status), DTONE[x.status])),
          h('td', h('time', { datetime: since }, ago(since))),
          h('td.cl-num', t('apr.version', { n: MA.num(x.d.version) })),
          h('td', note ? MA.siteText(clip(note, 200), 'auto') : h('span.cl-muted', '—')));
      }))));
  }

  /* ---------- inbox: what clients did ---------- */
  function pageInbox() {
    const can = canEdit();
    const unread = C.notes.filter(n => !n.readAt).length;
    const markBtn = can && unread ? keyed(MA.ui.btn(t('inb.markAll'), { icon: 'check', onclick: markAll }), 'mark-all') : null;
    const head = MA.ui.pageHead({ title: esc(t('nav.inbox')), sub: esc(t('inb.sub')), actions: markBtn ? [markBtn] : [] });
    const box = h('div.cl-notes-wrap');
    const fill = () => {
      const list = UI.notes === 'unread' ? C.notes.filter(n => !n.readAt) : C.notes;
      if (!list.length) {
        box.replaceChildren(C.notes.length
          ? MA.ui.empty({ icon: 'check', title: t('inb.noUnreadTitle'), compact: true })
          : MA.ui.empty({ icon: 'inbox', title: t('inb.emptyTitle'), compact: true }));
        return;
      }
      box.replaceChildren(h('ul.cl-notes', list.map(n => noteRow(n, can))));
    };
    const seg = MA.ui.seg([{ value: 'all', label: t('inb.all'), icon: 'inbox' }, { value: 'unread', label: t('inb.unread'), icon: 'bell' }], UI.notes,
      v => { UI.notes = v; fill(); }, { label: t('filter') });
    fill();
    return h('div.stack', head, h('div.cl-toolbar', seg), box);
  }
  function noteRow(n, can) {
    const d = describe(n), p = projectById(n.projectId);
    const meta = [MA.siteText(clientName(n.clientId), 'auto')];
    if (p) meta.push(' · ', MA.siteText(p.title, 'auto'));
    meta.push(' · ', ago(n.createdAt));
    const open = h('a.cl-note-link', { href: linkOf(n), onclick: () => { if (!n.readAt && canEdit()) markIds([n.id], true); } },
      h('strong', { dir: 'auto' }, MA.t(d.key, d.vars)));
    const btn = !n.readAt && can ? keyed(MA.ui.btn(t('inb.markRead'), { icon: 'check', size: 'sm', kind: 'ghost', onclick: () => markIds([n.id]) }), 'read-' + n.id) : null;
    return h(n.readAt ? 'li.cl-note' : 'li.cl-note.is-new', { dataset: { sel: '1', id: n.id } },
      h('span.cl-note-ico', MA.frag(MA.icon(d.icon))),
      h('div.cl-note-main', open, h('div.cl-muted', ...meta), d.body ? h('p.cl-note-body', MA.siteText(clip(d.body, 400), 'auto')) : null),
      n.readAt ? null : h('span.cl-new', h('span.dot'), h('span.sr-only', t('inb.unreadLabel'))),
      btn);
  }
  async function markIds(ids, quiet = false) {
    try {
      await api().admin.markRead({ ids });
      bellRead(ids);
      await load();
      if (S && !quiet) { S.focusK = 'read-' + ids[0]; paintMain(S); }
      else if (S) paintMain(S);
    } catch (e) { fail(e); }
  }
  async function markAll() {
    try {
      await api().admin.markRead({ all: true });
      bellRead(C.notes.filter(n => !n.readAt).map(n => n.id));
      await load();
      MA.toast(esc(t('inb.allRead')));
      if (S) { S.focusK = 'mark-all'; paintMain(S); }
    } catch (e) { fail(e); }
  }

  /* ---------- one project: the clients-project module draws it ---------- */
  function projectHost(st, w) {
    const host = h('div.cl-project-host');
    const W = MA.clientsProject;
    if (W && typeof W.render === 'function') {
      try { W.render(host, { ...st.ctx, pid: w.pid, cid: w.cid }); }
      catch (e) { console.error('[clients] project page failed', e); host.append(MA.ui.empty({ icon: 'info', title: t('projectMissing'), compact: true })); }
    } else {
      host.append(MA.ui.empty({ icon: 'info', title: t('projectMissing'), compact: true }));
    }
    // The project header carries the same preview link as the client's workspace (local mode only). The project page draws
    // its header after its data loads and again after each change, so the link is kept there by an observer.
    const keepPreview = () => {
      const acts = host.querySelector('.cp-head .page-head .actions');
      if (!acts || acts.querySelector('[data-preview-link]')) return;
      const b = previewBtn(clientById(w.cid), { size: 'sm' });
      if (!b) return;
      b.dataset.previewLink = '1';
      acts.append(b);
    };
    keepPreview();
    if (typeof MutationObserver === 'function') new MutationObserver(keepPreview).observe(host, { childList: true, subtree: true });
    return host;
  }

  /* ---------- sidebar, search and the module ---------- */
  /** {en, ar, fa} for one dictionary key (the sidebar reads every language at once). */
  const L3 = k => ({ en: DICT.en['clients.' + k], ar: DICT.ar['clients.' + k], fa: DICT.fa['clients.' + k] });
  const mod = {
    id: ID, group: 'clients', order: 25, icon: 'team', perm: 'leads.view', shortcut: 'g k',
    title: { en: 'Clients', ar: 'العملاء', fa: 'مشتری‌ها' },
    keywords: 'clients client portal projects board approvals review queue inbox code link numbers social contacts notes activity العملاء المشاريع الموافقات الوارد مشتری پروژه‌ها',
    badge() { const n = C.unread; return n ? { n, quiet: false, label: t('bell.badge', { n: MA.num(n) }) } : null; },
    /** The Clients category in the sidebar: one link per top page, each marked while the route is on its page. */
    navItems() {
      const pageIs = key => ctx => !!ctx && ctx.id === ID && (ctx.sub || [])[0] === key;
      return [
        { key: 'dir', title: L3('nav.dir'), icon: 'team', href: '#/clients',
          match: ctx => !!ctx && ctx.id === ID && !['projects', 'approvals', 'inbox'].includes((ctx.sub || [])[0]) },
        { key: 'projects', title: L3('nav.projects'), icon: 'board', href: '#/clients/projects', match: pageIs('projects') },
        { key: 'approvals', title: L3('side.approvals'), icon: 'check', href: '#/clients/approvals', match: pageIs('approvals'),
          badge: () => { const n = reviewItems().length; return n ? { n, quiet: false, label: t('side.waiting', { n: MA.num(n) }) } : null; } },
        { key: 'inbox', title: L3('side.inbox'), icon: 'inbox', href: '#/clients/inbox', match: pageIs('inbox'),
          badge: () => { const n = C.unread; return n ? { n, quiet: false, label: t('bell.badge', { n: MA.num(n) }) } : null; } },
      ];
    },
    render(view, ctx) { render(view, ctx); },
    update(ctx) { return update(ctx); },
    crumbs(ctx) { return crumbsOf(ctx); },
    search(q) {
      const s = MA.fold(String(q || '').trim());
      if (!s) return [];
      if (!C.ready) quietSync();
      const rows = [];
      C.clients.forEach(c => {
        if (MA.fold([c.name, c.company, c.email, c.slug].join(' ')).includes(s)) {
          rows.push({ title: dn(c), sub: [coOf(c), c.slug].filter(Boolean).join(' · '), icon: 'user', run: () => MA.go('#/clients/' + c.id) });
        }
      });
      C.projects.forEach(p => {
        if (MA.fold(p.title).includes(s)) rows.push({ title: p.title, sub: clientName(p.clientId), icon: 'board', run: () => MA.go('#/clients/projects/' + p.id) });
      });
      return rows.slice(0, 8);
    },
  };
  MA.module(mod);

  // The bell and the sidebar counts follow the portal store: at boot, on request, when another tab changes it, and every 20 s.
  MA.on('boot', () => { quietSync(); });
  MA.on('clients.sync', () => { quietSync(); });
  addEventListener('storage', e => { if (e.key === 'miras.portal.v1') quietSync(); });
  addEventListener('focus', () => { quietSync(); });
  setInterval(() => { if (document.visibilityState === 'visible') quietSync(); }, 20000);
})();
