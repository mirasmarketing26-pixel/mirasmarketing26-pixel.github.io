/* MIRAS admin — Plan (plan)
   The team's own work: content calendar posts, production shoots, tasks and campaigns, on one calendar.
   Store: MA.plan (list/get/save/remove, overdue, mine, STATUS, KINDS), kept in MA.db 'plan' (items) and 'plan.depts' (departments),
   so the Settings backup carries it. A server can replace the store later: the page only talks to MA.plan.
   Events: 'plan' { type: 'add'|'update'|'remove'|'depts', item, before } after every change.
   Roles: 'plan.edit' (owner, admin, editor) adds, moves and changes anything. Everyone else sees the whole plan, starts on "Mine",
   and may change only the status and notes of items they are assigned to.
   Dates are Qatar calendar days ('YYYY-MM-DD'); times are Doha wall-clock 'HH:MM'. An item is overdue when its date (a campaign's
   end date, if it has one) is before today in Qatar and its status is not Done or Published. Weeks start on Sunday. */
(() => {
  const ID = 'plan', h = MA.h, esc = MA.esc, ui = MA.ui;
  const t = (k, v) => MA.t('plan.' + k, v);

  const DICT = {
    en: {
      'plan.title': 'Plan', 'plan.add': 'Add', 'plan.new': 'New item', 'plan.edit': 'Edit item', 'plan.view': 'View item', 'plan.open': 'Open',
      'plan.k.post': 'Post', 'plan.k.shoot': 'Shoot', 'plan.k.task': 'Task', 'plan.k.campaign': 'Campaign',
      'plan.s.idea': 'Idea', 'plan.s.writing': 'Writing', 'plan.s.production': 'Production', 'plan.s.editing': 'Editing', 'plan.s.review': 'Review', 'plan.s.scheduled': 'Scheduled', 'plan.s.published': 'Published',
      'plan.s.planned': 'Planned', 'plan.s.progress': 'In progress', 'plan.s.done': 'Done', 'plan.s.hold': 'On hold',
      'plan.v.label': 'View', 'plan.v.month': 'Month', 'plan.v.week': 'Week', 'plan.v.list': 'List', 'plan.prev': 'Previous', 'plan.next': 'Next',
      'plan.f.mine': 'Mine', 'plan.f.overdue': 'Overdue', 'plan.f.filter': 'Filter', 'plan.f.person': 'Person', 'plan.f.dept': 'Department', 'plan.f.status': 'Status', 'plan.f.kind': 'Kind', 'plan.f.clear': 'Clear', 'plan.f.label': 'Filters', 'plan.f.remove': 'Remove filter {name}',
      'plan.search': 'Search the plan', 'plan.nodate': 'No date', 'plan.overdue': 'Overdue', 'plan.tentative': 'Tentative', 'plan.confirmed': 'Confirmed',
      'plan.markConfirmed': 'Mark confirmed', 'plan.markTentative': 'Mark tentative',
      'plan.fl.title': 'Title', 'plan.fl.date': 'Date', 'plan.fl.time': 'Time', 'plan.fl.doha': 'Doha', 'plan.fl.end': 'End date', 'plan.fl.location': 'Location', 'plan.fl.channel': 'Channel', 'plan.fl.people': 'People',
      'plan.fl.dept': 'Department', 'plan.fl.client': 'Client or project', 'plan.fl.notes': 'Notes', 'plan.fl.links': 'Links', 'plan.fl.addLink': 'Add link', 'plan.fl.status': 'Status', 'plan.fl.kind': 'Kind', 'plan.fl.more': 'More details',
      'plan.fl.tentHint': 'Not confirmed yet.', 'plan.fl.cal': 'In your calendar: {date}', 'plan.fl.removeLink': 'Remove link', 'plan.fl.link': 'Link',
      'plan.ch.website': 'Website', 'plan.ch.other': 'Other',
      'plan.moveTo': 'Move to date', 'plan.moveTitle': 'Move to which date?', 'plan.move': 'Move', 'plan.moved': 'Moved to {date}.', 'plan.unscheduled': 'Moved to No date.',
      'plan.saved': 'Saved.', 'plan.added': 'Added to the plan.', 'plan.deleted': '“{name}” deleted.', 'plan.statusSet': 'Status: {status}.',
      'plan.err.title': 'Add a title.', 'plan.err.link': 'Use a full link, like https://…', 'plan.err.end': 'The end date is before the start.', 'plan.err.denied': 'Your role can’t change this item.',
      'plan.csv': 'Export CSV', 'plan.exported': { one: 'Exported 1 item.', other: 'Exported {n} items.' },
      'plan.depts': 'Departments', 'plan.deptAdd': 'Add department', 'plan.deptName': 'Department name', 'plan.deptRemove': 'Remove {name}', 'plan.deptSaved': 'Departments saved.',
      'plan.empty': 'Nothing planned yet.', 'plan.emptyText': 'Add a post, shoot, task or campaign.', 'plan.noMatch': 'Nothing matches.', 'plan.noMatchText': 'Try fewer filters.',
      'plan.addOn': 'Add on {date}', 'plan.moreN': '+{n}', 'plan.moreDay': '{n} more on {date}',
      'plan.limited': 'You can change the status and notes of your own items.', 'plan.viewOnly': 'View only',
      'plan.noone': 'No one', 'plan.none': 'None', 'plan.badge': { one: '1 overdue', other: '{n} overdue' },
      'plan.col.title': 'Title', 'plan.col.kind': 'Kind', 'plan.col.date': 'Date', 'plan.col.people': 'People', 'plan.col.status': 'Status', 'plan.col.tent': 'Tentative', 'plan.col.actions': 'Actions',
      'plan.csv.time': 'Time', 'plan.csv.people': 'Assignees', 'plan.csv.notes': 'Notes',
      'plan.sort': 'Sort by {name}', 'plan.itemMenu': 'Actions for {name}',
      'team.p.plan.edit': 'Edit the plan', 'team.pd.plan.edit': 'Add, move and change any item in the Plan.',
    },
    ar: {
      'plan.title': 'الخطة', 'plan.add': 'إضافة', 'plan.new': 'عنصر جديد', 'plan.edit': 'تعديل العنصر', 'plan.view': 'عرض العنصر', 'plan.open': 'فتح',
      'plan.k.post': 'منشور', 'plan.k.shoot': 'تصوير', 'plan.k.task': 'مهمة', 'plan.k.campaign': 'حملة',
      'plan.s.idea': 'فكرة', 'plan.s.writing': 'كتابة', 'plan.s.production': 'إنتاج', 'plan.s.editing': 'مونتاج', 'plan.s.review': 'مراجعة', 'plan.s.scheduled': 'مجدول', 'plan.s.published': 'نُشر',
      'plan.s.planned': 'مخطط', 'plan.s.progress': 'قيد التنفيذ', 'plan.s.done': 'تم', 'plan.s.hold': 'معلّق',
      'plan.v.label': 'العرض', 'plan.v.month': 'شهر', 'plan.v.week': 'أسبوع', 'plan.v.list': 'قائمة', 'plan.prev': 'السابق', 'plan.next': 'التالي',
      'plan.f.mine': 'لي', 'plan.f.overdue': 'متأخر', 'plan.f.filter': 'تصفية', 'plan.f.person': 'الشخص', 'plan.f.dept': 'القسم', 'plan.f.status': 'الحالة', 'plan.f.kind': 'النوع', 'plan.f.clear': 'مسح', 'plan.f.label': 'عوامل التصفية', 'plan.f.remove': 'إزالة التصفية {name}',
      'plan.search': 'ابحث في الخطة', 'plan.nodate': 'بلا تاريخ', 'plan.overdue': 'متأخر', 'plan.tentative': 'مبدئي', 'plan.confirmed': 'مؤكد',
      'plan.markConfirmed': 'اجعله مؤكداً', 'plan.markTentative': 'اجعله مبدئياً',
      'plan.fl.title': 'العنوان', 'plan.fl.date': 'التاريخ', 'plan.fl.time': 'الوقت', 'plan.fl.doha': 'الدوحة', 'plan.fl.end': 'تاريخ الانتهاء', 'plan.fl.location': 'الموقع', 'plan.fl.channel': 'القناة', 'plan.fl.people': 'الأشخاص',
      'plan.fl.dept': 'القسم', 'plan.fl.client': 'العميل أو المشروع', 'plan.fl.notes': 'ملاحظات', 'plan.fl.links': 'روابط', 'plan.fl.addLink': 'أضف رابطاً', 'plan.fl.status': 'الحالة', 'plan.fl.kind': 'النوع', 'plan.fl.more': 'تفاصيل أكثر',
      'plan.fl.tentHint': 'لم يتأكد بعد.', 'plan.fl.cal': 'في تقويمك: {date}', 'plan.fl.removeLink': 'إزالة الرابط', 'plan.fl.link': 'رابط',
      'plan.ch.website': 'الموقع الإلكتروني', 'plan.ch.other': 'أخرى',
      'plan.moveTo': 'انقل إلى تاريخ', 'plan.moveTitle': 'إلى أي تاريخ؟', 'plan.move': 'انقل', 'plan.moved': 'نُقل إلى {date}.', 'plan.unscheduled': 'نُقل إلى «بلا تاريخ».',
      'plan.saved': 'حُفظ.', 'plan.added': 'أُضيف إلى الخطة.', 'plan.deleted': 'حُذف «{name}».', 'plan.statusSet': 'الحالة: {status}.',
      'plan.err.title': 'أضف عنواناً.', 'plan.err.link': 'استخدم رابطاً كاملاً، مثل https://…', 'plan.err.end': 'تاريخ الانتهاء قبل البداية.', 'plan.err.denied': 'دورك لا يسمح بتغيير هذا العنصر.',
      'plan.csv': 'تصدير CSV', 'plan.exported': 'صُدّرت العناصر: {n}.',
      'plan.depts': 'الأقسام', 'plan.deptAdd': 'أضف قسماً', 'plan.deptName': 'اسم القسم', 'plan.deptRemove': 'إزالة {name}', 'plan.deptSaved': 'حُفظت الأقسام.',
      'plan.empty': 'لا شيء في الخطة بعد.', 'plan.emptyText': 'أضف منشوراً أو تصويراً أو مهمة أو حملة.', 'plan.noMatch': 'لا نتائج مطابقة.', 'plan.noMatchText': 'جرّب تصفية أقل.',
      'plan.addOn': 'أضف في {date}', 'plan.moreN': '+{n}', 'plan.moreDay': 'المزيد في {date}: {n}',
      'plan.limited': 'يمكنك تغيير الحالة والملاحظات لعناصرك فقط.', 'plan.viewOnly': 'للعرض فقط',
      'plan.noone': 'لا أحد', 'plan.none': 'لا شيء', 'plan.badge': 'متأخرة: {n}',
      'plan.col.title': 'العنوان', 'plan.col.kind': 'النوع', 'plan.col.date': 'التاريخ', 'plan.col.people': 'الأشخاص', 'plan.col.status': 'الحالة', 'plan.col.tent': 'مبدئي', 'plan.col.actions': 'إجراءات',
      'plan.csv.time': 'الوقت', 'plan.csv.people': 'المكلّفون', 'plan.csv.notes': 'ملاحظات',
      'plan.sort': 'رتّب حسب {name}', 'plan.itemMenu': 'إجراءات {name}',
      'team.p.plan.edit': 'تعديل الخطة', 'team.pd.plan.edit': 'إضافة أي عنصر في الخطة ونقله وتغييره.',
    },
    fa: {
      'plan.title': 'برنامه', 'plan.add': 'افزودن', 'plan.new': 'مورد جدید', 'plan.edit': 'ویرایش مورد', 'plan.view': 'مشاهدهٔ مورد', 'plan.open': 'باز کردن',
      'plan.k.post': 'پست', 'plan.k.shoot': 'فیلم‌برداری', 'plan.k.task': 'کار', 'plan.k.campaign': 'کمپین',
      'plan.s.idea': 'ایده', 'plan.s.writing': 'نوشتن', 'plan.s.production': 'تولید', 'plan.s.editing': 'تدوین', 'plan.s.review': 'بازبینی', 'plan.s.scheduled': 'زمان‌بندی‌شده', 'plan.s.published': 'منتشرشده',
      'plan.s.planned': 'برنامه‌ریزی‌شده', 'plan.s.progress': 'در جریان', 'plan.s.done': 'انجام شد', 'plan.s.hold': 'متوقف',
      'plan.v.label': 'نما', 'plan.v.month': 'ماه', 'plan.v.week': 'هفته', 'plan.v.list': 'فهرست', 'plan.prev': 'قبلی', 'plan.next': 'بعدی',
      'plan.f.mine': 'مال من', 'plan.f.overdue': 'عقب‌افتاده', 'plan.f.filter': 'فیلتر', 'plan.f.person': 'فرد', 'plan.f.dept': 'بخش', 'plan.f.status': 'وضعیت', 'plan.f.kind': 'نوع', 'plan.f.clear': 'پاک کردن', 'plan.f.label': 'فیلترها', 'plan.f.remove': 'برداشتن فیلتر {name}',
      'plan.search': 'جست‌وجو در برنامه', 'plan.nodate': 'بدون تاریخ', 'plan.overdue': 'عقب‌افتاده', 'plan.tentative': 'احتمالی', 'plan.confirmed': 'قطعی',
      'plan.markConfirmed': 'قطعی کن', 'plan.markTentative': 'احتمالی کن',
      'plan.fl.title': 'عنوان', 'plan.fl.date': 'تاریخ', 'plan.fl.time': 'ساعت', 'plan.fl.doha': 'دوحه', 'plan.fl.end': 'تاریخ پایان', 'plan.fl.location': 'مکان', 'plan.fl.channel': 'کانال', 'plan.fl.people': 'افراد',
      'plan.fl.dept': 'بخش', 'plan.fl.client': 'مشتری یا پروژه', 'plan.fl.notes': 'یادداشت', 'plan.fl.links': 'پیوندها', 'plan.fl.addLink': 'افزودن پیوند', 'plan.fl.status': 'وضعیت', 'plan.fl.kind': 'نوع', 'plan.fl.more': 'جزئیات بیشتر',
      'plan.fl.tentHint': 'هنوز قطعی نشده.', 'plan.fl.cal': 'در تقویم شما: {date}', 'plan.fl.removeLink': 'برداشتن پیوند', 'plan.fl.link': 'پیوند',
      'plan.ch.website': 'وب‌سایت', 'plan.ch.other': 'سایر',
      'plan.moveTo': 'انتقال به تاریخ', 'plan.moveTitle': 'به چه تاریخی؟', 'plan.move': 'انتقال', 'plan.moved': 'به {date} منتقل شد.', 'plan.unscheduled': 'به «بدون تاریخ» منتقل شد.',
      'plan.saved': 'ذخیره شد.', 'plan.added': 'به برنامه اضافه شد.', 'plan.deleted': '«{name}» حذف شد.', 'plan.statusSet': 'وضعیت: {status}.',
      'plan.err.title': 'یک عنوان بنویسید.', 'plan.err.link': 'یک پیوند کامل بنویسید، مثل https://…', 'plan.err.end': 'تاریخ پایان پیش از شروع است.', 'plan.err.denied': 'نقش شما اجازهٔ تغییر این مورد را ندارد.',
      'plan.csv': 'خروجی CSV', 'plan.exported': '{n} مورد خروجی گرفته شد.',
      'plan.depts': 'بخش‌ها', 'plan.deptAdd': 'افزودن بخش', 'plan.deptName': 'نام بخش', 'plan.deptRemove': 'برداشتن {name}', 'plan.deptSaved': 'بخش‌ها ذخیره شد.',
      'plan.empty': 'هنوز چیزی برنامه‌ریزی نشده.', 'plan.emptyText': 'یک پست، فیلم‌برداری، کار یا کمپین اضافه کنید.', 'plan.noMatch': 'موردی پیدا نشد.', 'plan.noMatchText': 'فیلترهای کمتری را امتحان کنید.',
      'plan.addOn': 'افزودن در {date}', 'plan.moreN': '+{n}', 'plan.moreDay': '{n} مورد دیگر در {date}',
      'plan.limited': 'فقط وضعیت و یادداشتِ موردهای خودتان را می‌توانید تغییر دهید.', 'plan.viewOnly': 'فقط مشاهده',
      'plan.noone': 'هیچ‌کس', 'plan.none': 'هیچ', 'plan.badge': '{n} عقب‌افتاده',
      'plan.col.title': 'عنوان', 'plan.col.kind': 'نوع', 'plan.col.date': 'تاریخ', 'plan.col.people': 'افراد', 'plan.col.status': 'وضعیت', 'plan.col.tent': 'احتمالی', 'plan.col.actions': 'کارها',
      'plan.csv.time': 'ساعت', 'plan.csv.people': 'مسئولان', 'plan.csv.notes': 'یادداشت',
      'plan.sort': 'مرتب‌سازی بر اساس {name}', 'plan.itemMenu': 'کارهای {name}',
      'team.p.plan.edit': 'ویرایش برنامه', 'team.pd.plan.edit': 'افزودن، جابه‌جایی و تغییر هر مورد در برنامه.',
    },
  };
  MA.i18n.add(DICT);

  Object.assign(MA.icons, {
    'pl-post': '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M4.5 15.5l4-3.6 3.6 3 2.6-2.2 4.8 4"/><circle cx="15.3" cy="8.7" r="1.4"/>',
    'pl-shoot': '<path d="M3.5 8.8a2 2 0 0 1 2-2h2.2l1.6-2.3h5.4l1.6 2.3h2.2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><circle cx="12" cy="13.2" r="3.6"/>',
    'pl-task': '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8.3 12.3l2.6 2.6 4.8-5.2"/>',
    'pl-campaign': '<path d="M4 10v4a1 1 0 0 0 1 1h2.2l6.3 4V5L7.2 9H5a1 1 0 0 0-1 1z"/><path d="M16.6 9.2a4 4 0 0 1 0 5.6"/><path d="M19 6.8a7.4 7.4 0 0 1 0 10.4"/>',
  });

  /* ================= store ================= */
  const KINDS = ['post', 'shoot', 'task', 'campaign'];
  const WORK = ['planned', 'progress', 'review', 'done', 'hold'];
  const STATUS = { post: ['idea', 'writing', 'production', 'editing', 'review', 'scheduled', 'published'], shoot: WORK, task: WORK, campaign: WORK };
  const DONE = new Set(['done', 'published']);
  const CHANNELS = ['instagram', 'tiktok', 'linkedin', 'x', 'youtube', 'website', 'other'];
  const CH_NAME = { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', x: 'X', youtube: 'YouTube' };
  const KIND_ICON = { post: 'pl-post', shoot: 'pl-shoot', task: 'pl-task', campaign: 'pl-campaign' };
  const DEFAULT_DEPTS = [
    { id: 'mkt', name: { en: 'MIRAS Marketing', ar: 'ميراس للتسويق', fa: 'میراس مارکتینگ' } },
    { id: 're', name: { en: 'MIRAS Real Estate', ar: 'ميراس العقارية', fa: 'میراس املاک' } },
  ];
  const KEY = 'plan', DEPT_KEY = 'plan.depts', VIEW_KEY = 'plan.view';
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const str = (v, max = 400) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const okUrl = s => { try { const u = new URL(String(s || '').trim()); return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname; } catch (e) { return false; } };
  const qToday = () => MA.qDay(Date.now());
  const sampleOn = () => !!MA.prefs.get('sampleData');
  const myId = () => MA.team?.me?.()?.id || '';
  const canEdit = () => MA.can('plan.edit');
  const isMine = it => !!it && (it.assignees || []).includes(myId());
  const canPatch = it => canEdit() || isMine(it);

  const normClient = c => {
    if (typeof c === 'string') return c.trim() ? { label: c.trim().slice(0, 200) } : null;
    if (!MA.isObj(c)) return null;
    const o = { label: str(c.label, 200) }; if (str(c.projectId)) o.projectId = str(c.projectId); if (str(c.clientId)) o.clientId = str(c.clientId);
    return o.label || o.projectId ? o : null;
  };
  /** Any stored or incoming record → a clean item. Unknown fields are kept (a newer build or a server may add some). */
  function norm(x) {
    const kind = KINDS.includes(x.kind) ? x.kind : 'task';
    const out = {
      id: String(x.id), title: str(x.title, 200), kind, status: STATUS[kind].includes(x.status) ? x.status : STATUS[kind][0],
      date: DATE_RE.test(x.date) ? x.date : '', time: TIME_RE.test(x.time) ? x.time : '', end: DATE_RE.test(x.end) ? x.end : '',
      location: str(x.location, 200), channel: CHANNELS.includes(x.channel) ? x.channel : '',
      assignees: Array.isArray(x.assignees) ? [...new Set(x.assignees.filter(a => typeof a === 'string' && a))] : [],
      dept: str(x.dept, 80), client: normClient(x.client), tentative: !!x.tentative, notes: str(x.notes, 4000),
      links: Array.isArray(x.links) ? x.links.map(s => String(s || '').trim()).filter(okUrl).slice(0, 20) : [],
      createdBy: str(x.createdBy, 80), createdAt: str(x.createdAt, 40), updatedAt: str(x.updatedAt, 40),
    };
    if (x.sample) out.sample = true;
    return { ...x, ...out };
  }
  /** What is stored, as clean items (anything unreadable is skipped, never thrown). */
  const raw = () => { const v = MA.db.get(KEY, []); return Array.isArray(v) ? v.filter(x => MA.isObj(x) && typeof x.id === 'string' && x.id).map(norm) : []; };
  const write = list => MA.db.set(KEY, list);

  /** Demo items, relative to today, when the sample data is on (like the briefs and the team). */
  function sampleItems() {
    const d = n => MA.addDays(qToday(), n), at = new Date().toISOString();
    return [
      { id: 'pl-s1', kind: 'post', title: 'Lusail skyline reel', channel: 'instagram', status: 'writing', date: d(1), time: '18:00', assignees: ['u-noor'], dept: 'mkt', tentative: false },
      { id: 'pl-s2', kind: 'shoot', title: 'Villa walkthrough shoot', location: 'Lusail Marina', date: d(3), time: '09:30', status: 'planned', assignees: ['u-noor', 'u-owner'], dept: 're', tentative: true },
      { id: 'pl-s3', kind: 'task', title: 'Cityscape follow-ups', date: d(-2), status: 'progress', assignees: ['u-rami'], dept: 're', tentative: false },
      { id: 'pl-s4', kind: 'campaign', title: 'National Day campaign', date: d(5), end: d(19), status: 'planned', assignees: ['u-owner'], dept: 'mkt', tentative: true },
      { id: 'pl-s5', kind: 'post', title: 'Behind the scenes carousel', channel: 'linkedin', status: 'idea', date: '', assignees: [], dept: 'mkt', tentative: true },
      { id: 'pl-s6', kind: 'task', title: 'Brand film edit v2', date: d(-1), status: 'review', assignees: ['u-owner'], dept: 'mkt', tentative: false },
      { id: 'pl-s7', kind: 'post', title: 'Client testimonial', channel: 'tiktok', status: 'published', date: d(-3), assignees: ['u-lina'], dept: 'mkt', tentative: false },
    ].map(x => norm({ ...x, sample: true, createdBy: 'u-owner', createdAt: at, updatedAt: at }));
  }
  /* Seed the demo items once ('plan.samplesSeeded'), so deleting them sticks; turning the sample data off and on again clears the flag. */
  const SEEDED = 'plan.samplesSeeded';
  let sampleWas = null;
  MA.on('prefs', p => { const on = !!p?.sampleData; if (on && sampleWas === false) MA.db.del(SEEDED); sampleWas = on; });
  const ensureSamples = () => {
    if (sampleWas == null) sampleWas = sampleOn();
    if (!sampleOn() || MA.db.get(SEEDED, false)) return;
    const list = raw(); if (!list.some(x => x.sample)) write(list.concat(sampleItems()));
    MA.db.set(SEEDED, true);
  };
  /** Stored items this browser shows now (sample items only while the sample data is on). */
  const visible = () => { ensureSamples(); return raw().filter(x => !x.sample || sampleOn()); };
  const dueOf = it => (it.kind === 'campaign' && it.end) || it.date;
  const isOverdue = (it, today = qToday()) => { const d = dueOf(it); return !!d && d < today && !DONE.has(it.status); };
  const byDate = (a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || String(a.date).localeCompare(String(b.date)) || String(a.time || '99').localeCompare(String(b.time || '99')) || a.title.localeCompare(b.title);

  const P = MA.plan = {
    KINDS, STATUS, DONE: [...DONE], CHANNELS, strings: () => Object.keys(DICT.en),
    /** filter: { kind | kinds: [], person: 'me'|member id, dept, status, overdue: bool, q, from, to (dates, inclusive), dated: true|false } */
    list(f = {}) {
      const kinds = f.kinds?.length ? f.kinds : f.kind ? [f.kind] : null, me = myId(), today = qToday(), q = MA.fold(f.q || '').trim();
      return visible().filter(it => (!kinds || kinds.includes(it.kind))
        && (!f.person || it.assignees.includes(f.person === 'me' ? me : f.person))
        && (!f.dept || it.dept === f.dept) && (!f.status || it.status === f.status)
        && (!f.overdue || isOverdue(it, today))
        && (f.dated == null || !!it.date === !!f.dated)
        && (!f.from || (it.date && it.date >= f.from)) && (!f.to || (it.date && it.date <= f.to))
        && (!q || [it.title, it.notes, it.location, it.client?.label, ...it.assignees.map(a => MA.team.name(a))].some(s => MA.fold(s || '').includes(q)))).sort(byDate);
    },
    get: id => visible().find(x => x.id === id) || null,
    /**
     * Add (no id, or an id that isn't stored: a restore) or change an item. A change merges into what is stored, so a patch can be partial.
     * Needs a title. 'plan.edit' may change anything; others may change only status and notes of items assigned to them.
     * → the saved item, or null (no title, or not allowed). Emits 'plan'.
     */
    save(input) {
      if (!MA.isObj(input)) return null;
      const list = raw(), i = input.id ? list.findIndex(x => x.id === input.id) : -1, before = i >= 0 ? list[i] : null, now = new Date().toISOString();
      let next;
      if (before) {
        if (canEdit()) next = { ...before, ...input };
        else if (isMine(before)) next = { ...before, ...('status' in input ? { status: input.status } : {}), ...('notes' in input ? { notes: input.notes } : {}) };
        else return null;
      } else {
        if (!canEdit()) return null;
        next = { tentative: true, createdBy: myId(), createdAt: now, ...input, id: input.id || MA.uid('pl-') };
      }
      if (!str(next.title, 200)) return null;
      next = norm({ ...next, updatedAt: now });
      if (before) { const strip = o => { const { updatedAt, ...r } = o; return r; }; if (MA.eq(strip(before), strip(next))) return before; }
      if (before) list[i] = next; else list.push(next);
      if (!write(list)) return null;
      MA.emit('plan', { type: before ? 'update' : 'add', item: next, before });
      return next;
    },
    /** → the removed item (keep it for an undo: save() puts it back), or null. Needs 'plan.edit'. */
    remove(id) {
      if (!canEdit()) return null;
      const list = raw(), it = list.find(x => x.id === id); if (!it) return null;
      write(list.filter(x => x.id !== id)); MA.emit('plan', { type: 'remove', item: it }); return it;
    },
    isOverdue,
    /** Overdue items, today = a Qatar day 'YYYY-MM-DD' (default: today in Qatar). */
    overdue: (today = qToday()) => visible().filter(it => isOverdue(it, today)).sort(byDate),
    /** Items assigned to the current person. */
    mine: () => { const me = myId(); return visible().filter(it => it.assignees.includes(me)).sort(byDate); },
    canEdit, canPatch, isMine, today: qToday,
    statusName: s => t('s.' + s), kindName: k => t('k.' + k),
    channelName: c => CH_NAME[c] || (c ? t('ch.' + c) : ''),
    depts() { const v = MA.db.get(DEPT_KEY, null); return Array.isArray(v) && v.every(d => MA.isObj(d) && typeof d.id === 'string') ? v : MA.clone(DEFAULT_DEPTS); },
    deptName(id) { const d = P.depts().find(x => x.id === id); return d ? MA.L(d.name) : ''; },
    /** Replace the department list: [{ id?, name }]. Needs 'plan.edit'. */
    saveDepts(list) {
      if (!canEdit() || !Array.isArray(list)) return false;
      const clean = list.map(d => ({ id: str(d.id, 80) || MA.uid('d-'), name: MA.isObj(d.name) ? d.name : str(d.name, 80) })).filter(d => MA.isObj(d.name) || d.name);
      MA.db.set(DEPT_KEY, clean); MA.emit('plan', { type: 'depts' }); return true;
    },
    /** CSV of items (UTF-8 with a byte order mark, so Excel shows Arabic and Persian). */
    csv(items) {
      return MA.csv.stringify(items, [
        { label: t('col.title'), key: 'title' }, { label: t('col.kind'), get: it => t('k.' + it.kind) }, { label: t('col.status'), get: it => t('s.' + it.status) },
        { label: t('col.date'), key: 'date' }, { label: t('csv.time'), key: 'time' }, { label: t('csv.people'), get: it => it.assignees.map(a => MA.team.name(a)).filter(Boolean).join('; ') },
        { label: t('fl.dept'), get: it => P.deptName(it.dept) }, { label: t('col.tent'), get: it => MA.t(it.tentative ? 'yes' : 'no') }, { label: t('csv.notes'), key: 'notes' },
      ]);
    },
  };
  // the sidebar count (my overdue items) follows every change
  MA.on('plan', () => MA.renderNav?.());

  /* ================= dates ================= */
  const add = (ds, n) => MA.addDays(ds, n);
  const wd = ds => new Date(ds + 'T12:00:00Z').getUTCDay(); // 0 = Sunday (the week starts on Sunday in Qatar)
  const fmt = (ds, o) => MA.date(ds + 'T12:00:00Z', { ...o, timeZone: 'UTC' });
  const calStart = ds => MA.metrics?.calStart ? MA.metrics.calStart(ds, 'month') : ds.slice(0, 8) + '01';
  const calEnd = ds => add(calStart(add(calStart(ds), 32)), -1);
  const dayNum = ds => new Intl.DateTimeFormat(MA.locale(), { day: 'numeric', timeZone: 'UTC' }).format(new Date(ds + 'T12:00:00Z'));
  const fmtTime = hm => { const [H, M] = hm.split(':').map(Number); return new Intl.DateTimeFormat(MA.locale(), { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hourCycle: 'h23' }).format(Date.UTC(2000, 0, 1, H, M)); };
  const shortDate = ds => fmt(ds, ds.slice(0, 4) === qToday().slice(0, 4) ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  function monthYear(ds) {
    const parts = new Intl.DateTimeFormat(MA.locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).formatToParts(new Date(ds + 'T12:00:00Z'));
    const m = parts.find(p => p.type === 'month')?.value, y = parts.filter(p => p.type === 'year' || p.type === 'era').map(p => p.value).join(' ');
    return m && y ? `${m} ${y}` : fmt(ds, { month: 'long', year: 'numeric' });
  }

  /* ================= page state (kept while the admin is open) ================= */
  const VIEWS = ['month', 'week', 'list'];
  const ST = { view: VIEWS.includes(MA.db.get(VIEW_KEY, 'month')) ? MA.db.get(VIEW_KEY, 'month') : 'month', anchor: qToday(), q: '', sort: { k: 'date', d: 1 }, tray: true,
    f: { mine: false, overdue: false, kinds: [], person: '', dept: '', status: '' }, role: null };
  /** "Mine" is where someone who can't edit starts; set again whenever the role changes. */
  const initFilters = () => { const r = MA.role(); if (ST.role === r) return; ST.role = r; ST.f = { mine: !canEdit(), overdue: false, kinds: [], person: '', dept: '', status: '' }; };
  const filterObj = () => ({ kinds: ST.f.kinds, person: ST.f.mine ? 'me' : ST.f.person, dept: ST.f.dept, status: ST.f.status, overdue: ST.f.overdue, q: ST.q });
  function period() {
    if (ST.view === 'week') { const s = add(ST.anchor, -wd(ST.anchor)); return { from: s, to: add(s, 6), ms: s, me: add(s, 6) }; }
    const ms = calStart(ST.anchor), me = calEnd(ST.anchor);
    return { from: add(ms, -wd(ms)), to: add(me, 6 - wd(me)), ms, me };
  }
  /** The items the page shows now (CSV exports exactly these): filtered, and for Month/Week the days on screen plus the No date tray. */
  function viewItems() {
    const all = P.list(filterObj()); if (ST.view === 'list') return sortList(all);
    const p = period(); return all.filter(it => !it.date || (it.date >= p.from && it.date <= p.to));
  }
  const memberName = id => MA.team.name(id) || '';

  let S = null; // the mounted page
  let dragEndAt = 0;

  /* ================= page ================= */
  function render(view, ctx) {
    initFilters();
    const root = h('div.m-plan');
    view.append(root);
    const actions = [ui.iconBtn('download', { tip: t('csv'), onclick: () => exportCsv() })];
    if (canEdit()) actions.push(ui.iconBtn('settings', { tip: t('depts'), onclick: () => deptsModal() }), ui.btn(t('add'), { icon: 'plus', kind: 'primary', onclick: () => openForm(null, { date: '' }) }));
    root.append(ui.pageHead({ title: esc(t('title')), actions }));
    if (!canEdit()) root.append(h('p.pl-note', { html: MA.icon('info', 'sm') }, h('span', t('limited'))));

    const seg = ui.seg(VIEWS.map(v => ({ value: v, label: t('v.' + v), icon: { month: 'calendar', week: 'columns', list: 'list' }[v] })), ST.view, v => { ST.view = v; MA.db.set(VIEW_KEY, v); draw(); }, { label: t('v.label') });
    seg.classList.add('pl-views');
    const label = h('h2.pl-period', { 'aria-live': 'polite' });
    const step = dir => { const p = period(); ST.anchor = ST.view === 'week' ? add(p.from, dir * 7) : dir < 0 ? calStart(add(p.ms, -1)) : add(p.me, 1); draw(); };
    const nav = h('div.pl-nav', ui.iconBtn('chevLeft', { tip: t('prev'), size: 'sm', onclick: () => step(-1) }), ui.btn(MA.t('today'), { size: 'sm', kind: 'ghost', onclick: () => { ST.anchor = qToday(); draw(); } }), ui.iconBtn('chevRight', { tip: t('next'), size: 'sm', onclick: () => step(1) }), label);
    const search = h('input.input.sm.pl-search', { type: 'search', placeholder: t('search'), 'aria-label': t('search'), value: ST.q, oninput: MA.debounce(e => { ST.q = e.target.value; draw(); }, 120) });
    const bar = h('div.pl-bar', seg, nav, search);
    const filters = h('div.pl-filters', { role: 'group', 'aria-label': t('f.label') });
    const body = h('div.pl-body');
    root.append(bar, filters, body);
    S = { root, body, filters, label, nav };
    let queued = false;
    const schedule = () => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; if (S?.root.isConnected) draw(); }); };
    MA.onView('plan', schedule); MA.onView('db:plan', schedule); MA.onView('team', schedule);
    MA.cleanup(() => { S = null; });
    draw();
    handleQuery(ctx);
  }
  function handleQuery(ctx) {
    const q = ctx.query;
    if (VIEWS.includes(q.get('view')) && q.get('view') !== ST.view) { ST.view = q.get('view'); MA.db.set(VIEW_KEY, ST.view); S?.root.querySelector('.pl-views')?.set(ST.view); draw(); }
    if (q.get('f') === 'overdue') { ST.f = { mine: q.get('mine') === '1', overdue: true, kinds: [], person: '', dept: '', status: '' }; draw(); }
    const id = q.get('item');
    if (id) { const it = P.get(id); if (it) setTimeout(() => openForm(it), 30); }
    else if (q.has('new') && canEdit()) setTimeout(() => openForm(null, { date: q.get('date') || '' }), 30);
    if (q.has('item') || q.has('new') || q.has('f') || q.has('view') || q.has('mine')) MA.setQuery({ item: null, new: null, f: null, date: null, view: null, mine: null });
  }
  /** Redraw what depends on the data, keeping keyboard focus on the same control (chips, filters and rows carry data-fk). */
  function draw() {
    if (!S) return;
    const fk = document.activeElement?.closest?.('[data-fk]')?.dataset.fk;
    drawFilters(); drawBody();
    S.nav.hidden = ST.view === 'list';
    if (fk && (!document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected)) S.root.querySelector(`[data-fk="${CSS.escape(fk)}"]`)?.focus({ preventScroll: true });
  }

  /* ---- filter chips ---- */
  function chipBtn(label, on, onclick, { fk, icon, kind, count } = {}) {
    const b = h('button.tag.pl-fchip', { type: 'button', 'aria-pressed': String(!!on), dataset: kind ? { fk, kind } : { fk }, onclick, html: (icon ? MA.icon(icon, 'sm') : '') + `<span>${esc(label)}</span>` + (count ? `<span class="pl-fn">${esc(MA.num(count))}</span>` : '') });
    return b;
  }
  function drawFilters() {
    const F = ST.f, el = S.filters; el.innerHTML = '';
    const toggle = k => () => { F[k] = !F[k]; if (k === 'mine' && F.mine) F.person = ''; draw(); };
    const nOver = P.list({ ...filterObj(), overdue: true }).length;
    el.append(chipBtn(t('f.mine'), F.mine, toggle('mine'), { fk: 'f:mine', icon: 'user' }), chipBtn(t('f.overdue'), F.overdue, toggle('overdue'), { fk: 'f:overdue', icon: 'warn', count: nOver }));
    for (const k of KINDS) el.append(chipBtn(t('k.' + k), F.kinds.includes(k), () => { F.kinds = F.kinds.includes(k) ? F.kinds.filter(x => x !== k) : [...F.kinds, k]; draw(); }, { fk: 'f:k:' + k, icon: KIND_ICON[k], kind: k }));
    const more = ui.btn(t('f.filter'), { icon: 'filter', size: 'sm', kind: 'ghost' }); more.dataset.fk = 'f:more'; more.setAttribute('aria-haspopup', 'menu'); more.setAttribute('aria-expanded', 'false');
    more.addEventListener('click', e => filterMenu(e.currentTarget));
    el.append(more);
    // active extra filters as removable chips
    const extra = [];
    if (F.person) extra.push(['person', memberName(F.person) || F.person]);
    if (F.dept) extra.push(['dept', P.deptName(F.dept) || F.dept]);
    if (F.status) extra.push(['status', t('s.' + F.status)]);
    for (const [k, name] of extra) el.append(h('span.tag.on.pl-xchip', h('span', name), h('button', { type: 'button', 'aria-label': t('f.remove', { name }), dataset: { fk: 'fx:' + k }, html: MA.icon('close', 'sm'), onclick: () => { F[k] = ''; draw(); S?.filters.querySelector('[data-fk="f:more"]')?.focus(); } })));
    if (F.mine || F.overdue || F.kinds.length || extra.length) el.append(ui.btn(t('f.clear'), { size: 'sm', kind: 'ghost', onclick: () => { ST.f = { mine: false, overdue: false, kinds: [], person: '', dept: '', status: '' }; draw(); S?.filters.querySelector('[data-fk="f:mine"]')?.focus(); } }));
  }
  function filterMenu(anchor) {
    const F = ST.f, items = [{ heading: t('f.person') }];
    items.push({ label: t('f.mine'), checked: F.mine, run: () => { F.mine = !F.mine; F.person = ''; draw(); } });
    for (const m of MA.team.all()) if (m.id !== myId()) items.push({ label: MA.team.display(m), checked: !F.mine && F.person === m.id, run: () => { F.mine = false; F.person = F.person === m.id ? '' : m.id; draw(); } });
    items.push('-', { heading: t('f.dept') });
    for (const d of P.depts()) items.push({ label: MA.L(d.name), checked: F.dept === d.id, run: () => { F.dept = F.dept === d.id ? '' : d.id; draw(); } });
    items.push('-', { heading: t('f.status') });
    const sts = [...new Set((F.kinds.length ? F.kinds : KINDS).flatMap(k => STATUS[k]))];
    for (const s of sts) items.push({ label: t('s.' + s), checked: F.status === s, run: () => { F.status = F.status === s ? '' : s; draw(); } });
    ui.menu(anchor, items, { label: t('f.filter') });
  }

  /* ---- body ---- */
  function drawBody() {
    const body = S.body; body.innerHTML = '';
    body.dataset.view = ST.view;
    const all = P.list(filterObj()), any = visible().length > 0;
    if (ST.view === 'list') {
      S.label.textContent = '';
      if (!all.length) { body.append(emptyState(any)); return; }
      body.append(listView(sortList(all)));
      return;
    }
    const p = period();
    S.label.textContent = ST.view === 'week' ? `${fmt(p.from, { day: 'numeric', month: 'short' })} – ${fmt(p.to, { day: 'numeric', month: 'short', year: 'numeric' })}` : monthYear(p.ms);
    const dated = all.filter(it => it.date && it.date >= p.from && it.date <= p.to), undated = all.filter(it => !it.date);
    body.append(calendar(p, dated));
    body.append(tray(undated));
    if (!any) body.append(h('div.pl-empty-note', h('b', t('empty')), ' ', h('span', t('emptyText'))));
  }
  const emptyState = any => ui.empty({ title: esc(t(any ? 'noMatch' : 'empty')), text: esc(t(any ? 'noMatchText' : 'emptyText')), icon: 'calendar', compact: true,
    actions: !any && canEdit() ? [ui.btn(t('add'), { icon: 'plus', onclick: () => openForm(null, { date: '' }) })] : [] });

  /** An item on the calendar: kind icon + title (+ time, Overdue, Tentative in the week view). Click → its menu. Drag → another day. */
  function chip(it, long = false) {
    const over = isOverdue(it), done = DONE.has(it.status);
    const parts = [it.title, t('k.' + it.kind), t('s.' + it.status)];
    if (it.time) parts.push(fmtTime(it.time)); if (it.tentative) parts.push(t('tentative')); if (over) parts.push(t('overdue'));
    const b = h('button.pl-chip', { type: 'button', class: [it.tentative && 'tent', over && 'over', done && 'done'].filter(Boolean).join(' ') || null,
      dataset: { id: it.id, kind: it.kind, fk: 'chip:' + it.id }, 'aria-label': parts.join(', '), title: parts.join(' · '), 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      onclick: e => itemMenu(e.currentTarget, it) });
    b.append(h('span.pl-ki', { html: MA.icon(KIND_ICON[it.kind], 'sm') }));
    if (long && it.time) b.append(h('span.pl-time', fmtTime(it.time)));
    b.append(MA.siteText(it.title, 'auto', { cls: 'pl-ct' }));
    if (over) b.append(h('span.pl-over', { html: MA.icon('warn', 'sm') }, long ? h('span', t('overdue')) : null));
    if (long && it.tentative) b.append(h('span.pl-tw', t('tentative')));
    if (done) b.append(h('span.pl-dn', { html: MA.icon('check', 'sm') }));
    return b;
  }
  function calendar(p, items) {
    const today = qToday(), byDay = new Map();
    for (const it of items) (byDay.get(it.date) || byDay.set(it.date, []).get(it.date)).push(it);
    const cal = h('div.pl-cal', { class: ST.view === 'week' ? 'week' : 'month' });
    const head = h('div.pl-wds', { 'aria-hidden': 'true' });
    for (let i = 0; i < 7; i++) head.append(h('span', fmt(add('2023-01-01', i), { weekday: 'short' }))); // 1 Jan 2023 was a Sunday
    cal.append(head);
    const grid = h('div.pl-grid');
    const limit = ST.view === 'week' ? 99 : 3;
    for (let ds = p.from; ds <= p.to; ds = add(ds, 1)) {
      const list = byDay.get(ds) || [], out = ST.view === 'month' && (ds < p.ms || ds > p.me);
      const cell = h('div.pl-day', { role: 'group', 'aria-label': fmt(ds, { weekday: 'long', day: 'numeric', month: 'long' }) + (ds === today ? ' · ' + MA.t('today') : ''), class: [out && 'out', ds === today && 'today'].filter(Boolean).join(' ') || null,
        dataset: { date: ds, drop: ds }, 'aria-current': ds === today ? 'date' : null });
      cell.append(h('div.pl-dh', h('span.pl-dn-num', dayNum(ds)), ST.view === 'week' ? h('span.pl-wdn', fmt(ds, { weekday: 'short' })) : null));
      const box = h('div.pl-items');
      list.slice(0, limit).forEach(it => box.append(chip(it, ST.view === 'week')));
      if (list.length > limit) {
        const n = list.length - limit, more = h('button.pl-moreday', { type: 'button', dataset: { fk: 'more:' + ds }, 'aria-label': t('moreDay', { n: MA.num(n), date: fmt(ds, { day: 'numeric', month: 'long' }) }) }, t('moreN', { n: MA.num(n) }));
        more.addEventListener('click', e => { const pop = h('div.pl-daypop', h('p.label', fmt(ds, { weekday: 'long', day: 'numeric', month: 'long' })), list.map(it => chip(it, true))); ui.pop(e.currentTarget, pop, { width: 280, label: fmt(ds, { day: 'numeric', month: 'long' }) }); });
        box.append(more);
      }
      cell.append(box);
      // a click on the day's empty space adds an item on that day
      if (canEdit()) cell.addEventListener('click', e => { if (Date.now() - dragEndAt < 400 || e.target.closest('button,a,input')) return; openForm(null, { date: ds }); });
      grid.append(cell);
    }
    cal.append(grid);
    dragChips(cal);
    return cal;
  }
  function tray(items) {
    const id = MA.uid('pltray'), open = ST.tray;
    const btn = h('button.pl-trayhead', { type: 'button', 'aria-expanded': String(open), 'aria-controls': id, dataset: { fk: 'tray' },
      html: `${MA.icon('chevDown', 'sm chev')}<span>${esc(t('nodate'))}</span><span class="pl-fn">${esc(MA.num(items.length))}</span>`,
      onclick: () => { ST.tray = !ST.tray; draw(); } });
    const list = h('div.pl-trayitems', { id, hidden: !open }, items.map(it => chip(it, true)));
    const box = h('section.pl-tray', { dataset: { drop: '' }, class: open ? 'open' : null }, btn, list);
    dragChips(box);
    return box;
  }

  /* ---- drag a chip to another day (or to No date). The keyboard way is "Move to date" in the chip's menu. ---- */
  function dragChips(root) {
    root.addEventListener('pointerdown', e => {
      const c = e.target.closest('.pl-chip'); if (!c || !root.contains(c) || e.button !== 0 || !canEdit()) return;
      const d = { c, id: c.dataset.id, x: e.clientX, y: e.clientY, pid: e.pointerId, on: false, over: null };
      const hit = ev => document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop]');
      const move = ev => {
        if (ev.pointerId !== d.pid) return;
        if (!d.on) { if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 6) return; d.on = true; c.classList.add('dragging'); c.style.pointerEvents = 'none'; document.body.classList.add('pl-dragging'); }
        c.style.transform = `translate(${ev.clientX - d.x}px,${ev.clientY - d.y}px)`;
        const tgt = hit(ev); if (tgt !== d.over) { d.over?.classList.remove('drop'); d.over = tgt; tgt?.classList.add('drop'); }
      };
      const up = ev => {
        if (ev.pointerId !== d.pid) return;
        removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); off();
        if (!d.on) return;
        dragEndAt = Date.now(); d.over?.classList.remove('drop'); document.body.classList.remove('pl-dragging');
        c.classList.remove('dragging'); c.style.transform = ''; c.style.pointerEvents = '';
        const tgt = ev.type === 'pointerup' ? hit(ev) : null; if (!tgt) return;
        moveItem(P.get(d.id), tgt.dataset.drop || '');
      };
      addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
      const off = MA.cleanup(() => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); document.body.classList.remove('pl-dragging'); });
    });
    // the click that ends a drag never opens a menu or the add form
    root.addEventListener('click', e => { if (Date.now() - dragEndAt < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
  }
  function moveItem(it, date) {
    if (!it || it.date === date) return;
    const was = it.date, res = P.save({ id: it.id, title: it.title, date });
    if (!res) { MA.toast(esc(t('err.denied')), { tone: 'bad' }); return; }
    MA.toast(esc(date ? t('moved', { date: shortDate(date) }) : t('unscheduled')), { undo: () => P.save({ id: it.id, title: it.title, date: was }) });
  }

  /* ---- list ---- */
  const SORTS = { title: it => MA.fold(it.title), kind: it => KINDS.indexOf(it.kind), date: it => it.date ? it.date + (it.time || '99') : '9999', status: it => STATUS[it.kind].indexOf(it.status) + (DONE.has(it.status) ? 100 : 0), tent: it => it.tentative ? 0 : 1, people: it => it.assignees.map(memberName).join() };
  function sortList(items) {
    const k = ST.sort.k, f = SORTS[k] || SORTS.date, d = ST.sort.d;
    return [...items].sort((a, b) => { const x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * d || byDate(a, b); });
  }
  function listView(items) {
    const th = (k, label) => { const on = ST.sort.k === k; return h('th', { 'aria-sort': on ? (ST.sort.d > 0 ? 'ascending' : 'descending') : null, scope: 'col' },
      h('button', { type: 'button', dataset: { fk: 'sort:' + k }, 'aria-label': t('sort', { name: label }), onclick: () => { ST.sort = { k, d: on ? -ST.sort.d : 1 }; draw(); },
        html: `<span>${esc(label)}</span>` + (on ? MA.icon(ST.sort.d > 0 ? 'chevUp' : 'chevDown', 'sm') : '') })); };
    const table = h('table.table.pl-table', h('thead', h('tr', th('title', t('col.title')), th('kind', t('col.kind')), th('date', t('col.date')), th('people', t('col.people')), th('status', t('col.status')), th('tent', t('col.tent')), h('th.shrink', h('span.sr-only', t('col.actions'))))));
    const tb = h('tbody');
    for (const it of items) {
      const over = isOverdue(it), people = it.assignees.map(id => MA.team.get(id)).filter(Boolean);
      tb.append(h('tr', { dataset: { id: it.id, kind: it.kind }, class: it.tentative ? 'tent' : null },
        h('td.pl-tt', { dataset: { label: t('col.title') } }, h('button.pl-rowtitle', { type: 'button', dataset: { fk: 'row:' + it.id }, onclick: () => openForm(it) }, MA.siteText(it.title, 'auto')), it.sample ? ui.sample() : null),
        h('td', { dataset: { label: t('col.kind') } }, h('span.pl-kind', { dataset: { kind: it.kind }, html: MA.icon(KIND_ICON[it.kind], 'sm') }, h('span', t('k.' + it.kind)))),
        h('td.num', { dataset: { label: t('col.date') } }, it.date ? h('span', shortDate(it.date) + (it.time ? ' · ' + fmtTime(it.time) : '') + (it.kind === 'campaign' && it.end ? ' – ' + shortDate(it.end) : '')) : h('span.faint', t('nodate')),
          over ? h('span.pl-over', { html: MA.icon('warn', 'sm') }, h('span', t('overdue'))) : null),
        h('td', { dataset: { label: t('col.people') } }, people.length ? h('span.avatars', people.map(m => ui.avatar(m, 'sm'))) : h('span.faint', '—'), people.length ? h('span.sr-only', people.map(m => MA.team.display(m)).join(', ')) : null),
        h('td', { dataset: { label: t('col.status') } }, h('span', { class: 'badge ' + (DONE.has(it.status) ? 'good' : it.status === 'hold' ? 'warn' : over ? 'bad' : '') }, t('s.' + it.status))),
        h('td', { dataset: { label: t('col.tent') } }, it.tentative ? h('span.pl-tw', t('tentative')) : h('span.faint', t('confirmed'))),
        h('td.shrink', ui.iconBtn('more', { tip: t('itemMenu', { name: it.title }), size: 'sm', menu: true, onclick: e => itemMenu(e.currentTarget, it) }))));
      tb.lastChild.querySelector('.icon-btn').dataset.fk = 'rowmenu:' + it.id;
    }
    table.append(tb);
    return h('div.table-wrap.pl-listwrap', table);
  }

  /* ---- an item's menu: open, status, move, tentative, delete ---- */
  function itemMenu(anchor, it) {
    if (Date.now() - dragEndAt < 400) return;
    it = P.get(it.id) || it;
    const edit = canEdit(), items = [{ label: edit ? MA.t('edit') : t('open'), icon: edit ? 'edit' : 'eye', run: () => openForm(it) }];
    if (canPatch(it)) { items.push('-', { heading: t('fl.status') }); STATUS[it.kind].forEach(s => items.push({ label: t('s.' + s), checked: it.status === s, run: () => setStatus(it, s) })); }
    if (edit) items.push('-', { label: t('moveTo'), icon: 'calendar', run: () => moveDialog(it) },
      { label: it.tentative ? t('markConfirmed') : t('markTentative'), icon: it.tentative ? 'check' : 'flag', run: () => { const was = it.tentative; P.save({ id: it.id, title: it.title, tentative: !was }); MA.toast(esc(t('saved')), { undo: () => P.save({ id: it.id, title: it.title, tentative: was }) }); } },
      { label: MA.t('delete'), icon: 'trash', danger: true, run: () => del(it) });
    ui.menu(anchor, items, { label: it.title });
  }
  function setStatus(it, s) {
    if (it.status === s) return;
    const was = it.status, res = P.save({ id: it.id, title: it.title, status: s });
    if (!res) { MA.toast(esc(t('err.denied')), { tone: 'bad' }); return; }
    MA.toast(esc(t('statusSet', { status: t('s.' + s) })), { undo: () => P.save({ id: it.id, title: it.title, status: was }) });
  }
  function del(it) {
    const gone = P.remove(it.id); if (!gone) { MA.toast(esc(t('err.denied')), { tone: 'bad' }); return; }
    MA.activity?.log?.({ action: 'plan.delete', target: gone.title, module: ID, href: '#/plan' });
    MA.toast(esc(t('deleted', { name: gone.title })), { undo: () => P.save(gone) });
  }
  function moveDialog(it) {
    const inp = h('input.input', { type: 'date', value: it.date || qToday() });
    ui.modal({ title: esc(t('moveTitle')), body: ui.field(t('fl.date'), inp), initial: () => inp,
      actions: [{ label: MA.t('cancel'), kind: 'ghost' }, { label: t('move'), kind: 'primary', run: () => { if (inp.value && !DATE_RE.test(inp.value)) return false; moveItem(P.get(it.id), inp.value || ''); } }] });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.target.closest('.modal')?.querySelector('.modal-foot .btn.primary')?.click(); } });
  }

  /* ---- add / edit panel ---- */
  let projCache = null;
  async function projects() {
    const api = window.PortalAPI?.admin; if (!api?.listProjects) return null;
    if (projCache) return projCache;
    try {
      const [ps, cs] = await Promise.race([Promise.all([api.listProjects(), api.listClients ? api.listClients() : []]), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500))]);
      const cname = id => { const c = (cs || []).find(x => x.id === id); return c ? (c.company || c.name || '') : ''; };
      projCache = (ps || []).map(p => ({ projectId: p.id, clientId: p.clientId || '', label: [p.title, cname(p.clientId)].filter(Boolean).join(' · ') }));
      setTimeout(() => { projCache = null; }, 30000);
      return projCache;
    } catch (e) { return null; }
  }
  function openForm(it, preset = {}) {
    it = it ? (P.get(it.id) || it) : null;
    const edit = canEdit(), patch = it ? canPatch(it) : edit, full = edit; // full: every field; patch: status + notes only
    const F = { kind: it?.kind || preset.kind || 'post' };
    const dis = !full;
    const errs = {};
    const errEl = k => (errs[k] = h('p.err', { hidden: true, id: MA.uid('ple'), role: 'alert' }));
    // kind: four big icon choices (a radio group)
    const kinds = h('div.pl-kinds', { role: 'radiogroup', 'aria-label': t('fl.kind') });
    const kindBtns = KINDS.map(k => h('button.pl-kindbtn', { type: 'button', role: 'radio', dataset: { kind: k }, disabled: dis, html: `<span class="pl-kbi">${MA.icon(KIND_ICON[k])}</span><span>${esc(t('k.' + k))}</span>`, onclick: () => setKind(k) }));
    kinds.append(...kindBtns);
    kinds.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return; e.preventDefault();
      const rtl = getComputedStyle(kinds).direction === 'rtl', fwd = e.key === 'ArrowDown' || (e.key === 'ArrowRight') !== rtl;
      const i = KINDS.indexOf(F.kind), k = KINDS[(i + (fwd ? 1 : -1) + 4) % 4]; setKind(k); kindBtns[KINDS.indexOf(k)].focus();
    });
    const title = h('input.input.pl-title', { value: it?.title || '', maxlength: 200, disabled: dis, autofocus: !dis, 'aria-describedby': null });
    const date = h('input.input', { type: 'date', value: it ? it.date : (preset.date || ''), disabled: dis });
    const calHint = h('p.hint.pl-calhint');
    const syncCal = () => { const v = date.value, cal = MA.prefs.get('calendar'); calHint.hidden = !(v && DATE_RE.test(v) && cal && cal !== 'gregory'); if (!calHint.hidden) calHint.textContent = t('fl.cal', { date: fmt(v, { day: 'numeric', month: 'long', year: 'numeric' }) }); };
    date.addEventListener('input', syncCal); date.addEventListener('change', syncCal);
    // more details
    const status = h('select.select', { disabled: !patch });
    const fillStatus = keep => { status.innerHTML = ''; STATUS[F.kind].forEach(s => status.append(h('option', { value: s, selected: s === keep }, t('s.' + s)))); if (!STATUS[F.kind].includes(keep)) status.value = STATUS[F.kind][0]; };
    const time = h('input.input', { type: 'time', value: it?.time || '', disabled: dis });
    const end = h('input.input', { type: 'date', value: it?.end || '', disabled: dis });
    const location = h('input.input', { value: it?.location || '', maxlength: 200, disabled: dis });
    const channel = ui.select([{ value: '', label: t('none') }, ...CHANNELS.map(c => ({ value: c, label: P.channelName(c) }))], it?.channel || '', () => {}); channel.disabled = dis;
    const people = h('div.pl-people', { role: 'group' });
    const chosen = new Set(it?.assignees || []);
    for (const m of MA.team.all()) people.append(h('label.pl-person', h('input.check', { type: 'checkbox', value: m.id, checked: chosen.has(m.id), disabled: dis }), ui.avatar(m, 'sm'), h('span', MA.team.display(m))));
    const dept = ui.select([{ value: '', label: t('none') }, ...P.depts().map(d => ({ value: d.id, label: MA.L(d.name) }))], it?.dept || (it ? '' : P.depts()[0]?.id || ''), () => {}); dept.disabled = dis;
    const clientBox = h('div.pl-client');
    let clientVal = () => normClient(it?.client || null);
    const clientText = h('input.input', { value: it?.client?.label || '', maxlength: 200, disabled: dis });
    clientBox.append(clientText); clientVal = () => normClient(clientText.value);
    if (full) projects().then(list => {
      if (!list?.length || !clientBox.isConnected) return;
      const cur = it?.client;
      const opts = [{ value: '', label: t('none') }, ...list.map(p => ({ value: p.projectId, label: p.label }))];
      if (cur?.label && !list.some(p => p.projectId === cur.projectId)) opts.push({ value: '__text', label: cur.label });
      const sel = ui.select(opts, cur?.projectId || (cur?.label ? '__text' : ''), () => {});
      sel.id = clientText.id; clientText.replaceWith(sel);
      clientVal = () => { if (!sel.value) return null; if (sel.value === '__text') return cur; const p = list.find(x => x.projectId === sel.value); return p ? { ...p } : null; };
    });
    const tent = ui.switch(it ? it.tentative : true, () => {}, esc(t('tentative')), { disabled: dis });
    const notes = h('textarea.textarea', { rows: 3, disabled: !patch, maxlength: 4000 }); notes.value = it?.notes || '';
    const linksBox = h('div.pl-links');
    const linkRow = v => { const inp = h('input.input', { type: 'url', value: v || '', placeholder: 'https://', disabled: dis, 'aria-label': t('fl.link') });
      const row = h('div.pl-linkrow', inp, dis ? null : ui.iconBtn('close', { tip: t('fl.removeLink'), size: 'sm', onclick: () => { row.remove(); } })); return row; };
    (it?.links || []).forEach(u => linksBox.append(dis ? h('a.pl-linkout.ltr', { href: u, target: '_blank', rel: 'noopener noreferrer' }, u) : linkRow(u)));
    const addLink = dis ? null : ui.btn(t('fl.addLink'), { icon: 'link', size: 'sm', kind: 'ghost', onclick: () => { const r = linkRow(''); linksBox.append(r); r.querySelector('input').focus(); } });

    const fld = (label, ctl, opts = {}) => { const f = ui.field(esc(label), ctl, opts); if (opts.kinds) f.dataset.kinds = opts.kinds.join(' '); return f; };
    const titleF = fld(t('fl.title'), title); titleF.append(errEl('title')); title.setAttribute('aria-describedby', errs.title.id);
    const dateF = fld(t('fl.date'), date); dateF.append(calHint);
    const endF = fld(t('fl.end'), end, { kinds: ['campaign'] }); endF.append(errEl('end'));
    const timeF = fld(t('fl.time'), h('div.input-group', time, h('span.addon', t('fl.doha'))));
    const linksF = h('div.field', h('span.field-label', t('fl.links')), linksBox, addLink, errEl('links'));
    const peopleF = h('div.field', h('span.field-label', { id: MA.uid('plp') }, t('fl.people')), people); people.setAttribute('aria-labelledby', peopleF.firstChild.id);
    const moreId = MA.uid('plmore'), openMore = !!it;
    const moreSec = h('div.pl-moresec', { id: moreId, hidden: !openMore },
      fld(t('fl.status'), status), h('div.pl-2', timeF, endF), fld(t('fl.location'), location, { kinds: ['shoot'] }), fld(t('fl.channel'), channel, { kinds: ['post'] }),
      peopleF, h('div.pl-2', fld(t('fl.dept'), dept), fld(t('fl.client'), clientBox)), h('div.field.pl-tentf', tent, h('p.hint', t('fl.tentHint'))), fld(t('fl.notes'), notes), linksF);
    const moreBtn = h('button.pl-morebtn', { type: 'button', 'aria-expanded': String(openMore), 'aria-controls': moreId, html: `${MA.icon('chevDown', 'sm chev')}<span>${esc(t('fl.more'))}</span>`,
      onclick: () => { const o = moreSec.hidden; moreSec.hidden = !o; moreBtn.setAttribute('aria-expanded', String(o)); } });
    function setKind(k) {
      F.kind = k; kindBtns.forEach(b => { const on = b.dataset.kind === k; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
      fillStatus(status.value || it?.status);
      moreSec.querySelectorAll('[data-kinds]').forEach(el => { el.hidden = !el.dataset.kinds.split(' ').includes(k); });
    }
    fillStatus(it?.status || ''); setKind(F.kind); syncCal();

    const submit = L => {
      Object.values(errs).forEach(e => { e.hidden = true; e.textContent = ''; }); title.removeAttribute('aria-invalid');
      const fail = (k, msg, focusEl) => { errs[k].textContent = msg; errs[k].hidden = false; if (k === 'title') title.setAttribute('aria-invalid', 'true'); if (moreSec.contains(errs[k]) && moreSec.hidden) moreBtn.click(); focusEl?.focus(); return false; };
      if (!full) {
        if (!it || !patch) return L.close();
        const res = P.save({ id: it.id, title: it.title, status: status.value, notes: notes.value });
        if (!res) { MA.toast(esc(t('err.denied')), { tone: 'bad' }); return; }
        L.close(); MA.toast(esc(t('saved'))); return;
      }
      const ttl = title.value.trim(); if (!ttl) return fail('title', t('err.title'), title);
      if (F.kind === 'campaign' && end.value && date.value && end.value < date.value) return fail('end', t('err.end'), end);
      const urls = [...linksBox.querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean), bad = urls.find(u => !okUrl(u));
      if (bad) return fail('links', t('err.link'), [...linksBox.querySelectorAll('input')].find(i => i.value.trim() === bad));
      const data = { title: ttl, kind: F.kind, date: date.value, status: status.value, time: time.value, end: F.kind === 'campaign' ? end.value : (it?.end || ''),
        location: location.value, channel: channel.value, assignees: [...people.querySelectorAll('input:checked')].map(i => i.value).concat((it?.assignees || []).filter(a => !MA.team.get(a))),
        dept: dept.value, client: clientVal(), tentative: tent.input.checked, notes: notes.value, links: urls };
      const res = P.save(it ? { ...data, id: it.id } : data);
      if (!res) { MA.toast(esc(t('err.denied')), { tone: 'bad' }); return; }
      if (!it) MA.activity?.log?.({ action: 'plan.add', target: res.title, module: ID, href: '#/plan?item=' + res.id });
      L.close(); MA.toast(esc(t(it ? 'saved' : 'added')));
      if (res.date && ST.view !== 'list') { const p = period(); if (res.date < p.from || res.date > p.to) { ST.anchor = res.date; draw(); } }
    };
    title.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); submit(L); } });
    const L = ui.drawer({ title: esc(it ? (full ? t('edit') : t('view')) : t('new')), width: 500,
      initial: () => full ? title : (patch ? status : null),
      render: body => {
        body.classList.add('pl-form');
        if (!full) body.append(h('p.pl-note', { html: MA.icon(patch ? 'info' : 'eye', 'sm') }, h('span', patch ? t('limited') : t('viewOnly'))));
        if (it && isOverdue(it)) body.append(h('p.pl-over.pl-overline', { html: MA.icon('warn', 'sm') }, h('span', t('overdue'))));
        body.append(kinds, titleF, dateF, moreBtn, moreSec);
      },
      foot: (foot, Lr) => {
        if (it && edit) foot.append(ui.btn(MA.t('delete'), { icon: 'trash', kind: 'ghost danger', onclick: () => { Lr.close(); del(it); } }));
        foot.append(h('span.grow'));
        if (full || patch) foot.append(ui.btn(MA.t('cancel'), { kind: 'ghost', onclick: () => Lr.close() }), ui.btn(MA.t('save'), { kind: 'primary', icon: 'check', onclick: () => submit(Lr) }));
        else foot.append(ui.btn(MA.t('close'), { onclick: () => Lr.close() }));
      } });
    L.el.classList.add('pl-drawer');
    return L;
  }

  /* ---- departments (a small settings menu on the page) ---- */
  function deptsModal() {
    if (!canEdit()) return;
    const orig = P.depts(), rows = orig.map(d => ({ id: d.id, name: MA.L(d.name), orig: d.name }));
    const list = h('div.pl-depts'), err = h('p.err', { hidden: true, role: 'alert' });
    const drawRows = () => {
      list.innerHTML = '';
      rows.forEach((r, i) => {
        const inp = h('input.input', { value: r.name, maxlength: 80, 'aria-label': t('deptName'), oninput: e => { r.name = e.target.value; } });
        list.append(h('div.pl-deptrow', inp, ui.iconBtn('trash', { tip: t('deptRemove', { name: r.name || '…' }), size: 'sm', onclick: () => { rows.splice(i, 1); drawRows(); list.querySelector('input')?.focus(); } })));
      });
    };
    drawRows();
    const addBtn = ui.btn(t('deptAdd'), { icon: 'plus', size: 'sm', kind: 'ghost', onclick: () => { rows.push({ id: '', name: '' }); drawRows(); [...list.querySelectorAll('input')].pop()?.focus(); } });
    ui.modal({ title: esc(t('depts')), body: h('div.pl-deptbox', list, addBtn, err),
      actions: [{ label: MA.t('cancel'), kind: 'ghost' }, { label: MA.t('save'), kind: 'primary', run: () => {
        const clean = rows.map(r => ({ id: r.id, name: r.orig && r.name.trim() === MA.L(r.orig) ? r.orig : r.name.trim() })).filter(r => MA.isObj(r.name) || r.name);
        P.saveDepts(clean); MA.toast(esc(t('deptSaved')));
      } }] });
  }

  /* ---- CSV of what is on screen ---- */
  function exportCsv(items = S ? viewItems() : P.list({})) {
    MA.download(`miras-plan-${qToday()}.csv`, P.csv(items), 'text/csv');
    MA.toast(esc(t('exported', { n: items.length, count: items.length })), { icon: 'download' });
    return items.length;
  }

  /* ================= register ================= */
  MA.module({
    id: ID, group: 'work', order: 22, icon: 'calendar', shortcut: 'g p',
    title: { en: 'Plan', ar: 'الخطة', fa: 'برنامه' },
    keywords: 'plan calendar content posts shoots tasks campaigns schedule production team الخطة تقويم محتوى تصوير مهام حملات برنامه تقویم محتوا فیلم‌برداری کمپین',
    needsSite: false,
    badge() { const me = myId(); const n = P.overdue().filter(it => it.assignees.includes(me)).length; return n ? { n, label: t('badge', { n: MA.num(n), count: n }) } : null; },
    render,
    update(ctx) { if (!S?.root.isConnected) return false; handleQuery(ctx); return true; },
    search(q) {
      const fq = MA.fold(q).trim(); if (!fq) return [];
      return visible().filter(it => [it.title, it.notes, it.location, it.client?.label].some(s => MA.fold(s || '').includes(fq))).slice(0, 8)
        .map(it => ({ title: it.title, sub: [t('k.' + it.kind), it.date ? shortDate(it.date) : t('nodate'), t('s.' + it.status)].join(' · '), icon: KIND_ICON[it.kind], key: 'plan:' + it.id, run: () => MA.go('#/plan?item=' + encodeURIComponent(it.id)) }));
    },
    exportCsv, viewItems,
  });
  MA.commands.add({ id: 'plan.add', title: { en: 'Add to the plan', ar: 'أضف إلى الخطة', fa: 'افزودن به برنامه' }, icon: 'plus', keywords: 'plan new post shoot task campaign calendar', when: () => canEdit(), run: () => MA.go('#/plan?new=1') });
  MA.commands.add({ id: 'plan.overdue', title: { en: 'Show overdue in the plan', ar: 'اعرض المتأخر في الخطة', fa: 'نمایش عقب‌افتاده‌ها در برنامه' }, icon: 'warn', keywords: 'plan overdue late tasks', run: () => MA.go('#/plan?f=overdue') });
  MA.commands.add({ id: 'plan.export', title: { en: 'Export the plan as CSV', ar: 'صدّر الخطة CSV', fa: 'خروجی CSV برنامه' }, icon: 'download', keywords: 'plan csv export excel spreadsheet', run: () => exportCsv() });
})();
