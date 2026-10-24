/* =====================================================================
   MIRAS admin — Inbox: the briefs CRM.
   One set of briefs (MA.leads), three layouts: List (a multi-select listbox + reading pane), Board (pipeline by stage), Table.
   Filters and the queue tab live in the URL (?tab=&stage=&channel=…); layout, sort, columns, saved views and reply templates in MA.db.
   Lead fields this page adds: nextStep (text), due ('YYYY-MM-DD', studio day), lostReason (a LOST id or free text).
   Keys while mounted: j/k · Enter · x · e · s · a (only with a real team) · r · ⌫ · / · Esc · ⌘B, bound with MA.keys.bindView.
   On a focused row (roving tabindex): ↑/↓/Home/End move, Space selects, Enter opens (focus goes to the brief's heading; Esc returns it).
   The core mutes single keys while any layer is open, so a small listener replays the key map while only our non-modal drawer is open.
   A changed brief patches its own row (and the open brief); only a change in the list's shape redraws the page.
   Admin UI: English, Arabic, Persian. Lead content (message, reply drafts) stays in the lead's own language (en/ar),
   tagged with lang (MA.langOf); site copy (swells, services, budgets) is shown in MA.siteLang().
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA, L = MA.leads, ui = MA.ui, h = MA.h, esc = MA.esc;
  const DAY = 864e5, HOUR = 36e5;
  const t = (k, v) => MA.t('inbox.' + k, v);

  // every key is registered as 'inbox.<key>'
  const P = o => Object.fromEntries(Object.entries(o).map(([k, v]) => ['inbox.' + k, v]));
  MA.i18n.add({
    en: P({
      searchPh: 'Search briefs', filter: 'Filter', filterBy: 'Filter by', clear: 'Clear', clearFilters: 'Clear filters',
      saveView: 'Save view', viewName: 'Save this view', viewNameLabel: 'Name', viewSaved: 'View saved.', viewRemoved: 'Removed the “{name}” view.', removeView: 'Remove view', removeFilter: 'Remove filter',
      vList: 'List', vBoard: 'Board', vTable: 'Table', viewLabel: 'Layout', newBrief: 'New brief',
      'tab.reply': 'Needs reply', 'tab.open': 'All open', 'tab.starred': 'Starred', 'tab.won': 'Won', 'tab.lost': 'Lost', 'tab.archived': 'Archived',
      headSub: '<b>{reply}</b> need a reply · <b>{open}</b> open · <b>{value}</b> in the pipeline', headEmpty: 'Briefs from the site, and anything you add by hand.',
      'f.stage': 'Stage', 'f.swell': 'Swell', 'f.source': 'Source', 'f.owner': 'Owner', 'f.lang': 'Language', 'f.tag': 'Tag', 'f.value': 'Value', 'f.snoozed': 'Snoozed',
      min: 'At least', max: 'At most', qarHint: 'In QAR. Leave a box empty for no limit.', noOptions: 'Nothing to filter by yet.', from: 'From {v}', upTo: 'Up to {v}', only: 'Only',
      unassigned: 'Unassigned', formerMember: 'Former member', you: 'you', someone: 'Someone', now: 'now', langEn: 'English', langAr: 'Arabic',
      nSnoozed: '{n} snoozed', backToQueue: 'Back to the queue', queue: 'Briefs',
      reply: 'Reply by email', whatsapp: 'WhatsApp', copyBrief: 'Copy brief', copiedBrief: 'Brief copied.', copyEmail: 'Copy email', noEmail: 'This brief has no email address.',
      stage: 'Stage', moveTo: 'Move to', moveNTo: 'Move {n} briefs to', assign: 'Assign', assignTo: 'Assign to',
      snooze: 'Snooze', snoozedUntil: 'Snoozed until {when}', unsnooze: 'Unsnooze', snLater: 'Later today', snTomorrow: 'Tomorrow, {time}', snSunday: 'Sunday, {time}', snPick: 'Pick a date…',
      snPickTitle: 'Snooze until', date: 'Date', time: 'Time', qatarTime: 'Qatar time ({gmt}). The brief comes back to the queue then.', snPast: 'Pick a time in the future.',
      snoozedOne: 'Snoozed until {when}.', snoozedN: 'Snoozed {n} briefs until {when}.', unsnoozed: 'Back in the queue.',
      archive: 'Archive', unarchive: 'Move to inbox', archivedOne: 'Archived “{name}”.', archivedN: 'Archived {n} briefs.', unarchivedOne: 'Moved “{name}” back to the inbox.', unarchivedN: 'Moved {n} briefs back to the inbox.',
      deletedOne: 'Deleted “{name}”.', deletedN: 'Deleted {n} briefs.',
      movedOne: 'Moved “{name}” to {stage}.', movedN: 'Moved {n} briefs to {stage}.', signed: 'Signed — {name}{svc}', signedN: 'Signed {n} briefs.',
      assignedOne: 'Assigned “{name}” to {owner}.', assignedN: 'Assigned {n} briefs to {owner}.', unassignedOne: 'Unassigned “{name}”.', unassignedN: 'Unassigned {n} briefs.',
      star: 'Star', unstar: 'Remove star', pos: '{i} of {n}', prev: 'Previous brief · K', next: 'Next brief · J', back: 'All briefs', briefTitle: 'Brief',
      'hl.value': 'Value', 'hl.swells': 'Swells requested', 'hl.stage': 'Stage', 'hl.source': 'Source', 'hl.received': 'Received', 'hl.last': 'Last contact',
      addValue: 'Add a value', editValue: 'Edit the value', noSwells: 'None picked', notYet: 'Not yet', inStage: '{d} in this stage', pastTarget: 'past the {d} target', closedOn: 'Since {date}', lessDay: 'Less than a day', dZero: '<1d',
      logReply: 'Log reply', logged: 'Logged a reply.', draftOpened: 'Email draft opened. Log it as a reply once it’s sent.',
      message: 'Brief', noMessage: 'No message came with this brief.', words: 'Words they caught on the site', tags: 'Tags', addTag: 'Add tag', removeTag: 'Remove {tag}', tagRemoved: 'Removed the “{tag}” tag.', tagPh: 'Tag name',
      activity: 'Activity', notePh: 'Add a note for the team…', addNote: 'Add note',
      'ev.site': 'Brief sent from the website', 'ev.added': 'Added by hand', 'ev.imported': 'Imported', 'ev.stage': 'Moved to {stage}', 'ev.assign': 'Assigned to {name}', 'ev.unassign': 'Unassigned',
      'ev.archive': 'Archived', 'ev.unarchive': 'Moved back to the inbox', 'ev.snooze': 'Snoozed until {when}', 'ev.unsnooze': 'Unsnoozed', 'ev.contact': 'Logged a reply', 'ev.value': 'Value set to {value}', 'ev.valueClear': 'Value cleared',
      pickTitle: 'Pick a brief', pickText: 'Press <kbd>J</kbd> and <kbd>K</kbd> to move through the queue.',
      emptyAllTitle: 'No briefs yet', emptyAllText: 'Briefs from the site reach you by email or through your form service. Import them here, add one by hand, or see how to receive them automatically.',
      calmTitle: 'Every brief has a reply.', calmText: 'Calm water. New briefs from the site land here first.',
      noMatchTitle: 'No briefs match', noMatchText: 'Try fewer filters, or clear them.',
      'e.title': 'Nothing here', 'e.open': 'No open briefs right now.', 'e.starred': 'Star a brief to keep it close.', 'e.won': 'Signed briefs gather here.', 'e.lost': 'Briefs that didn’t go ahead land here.', 'e.archived': 'Press <kbd>E</kbd> on a brief to archive it.', 'e.snoozed': 'Nothing is snoozed.',
      dropHere: 'Drop briefs here', collapse: 'Collapse column', expand: 'Expand column',
      'col.name': 'Name', 'col.company': 'Company', 'col.stage': 'Stage', 'col.swells': 'Swells', 'col.value': 'Value', 'col.days': 'In stage', 'col.owner': 'Owner', 'col.source': 'Source',
      'col.lang': 'Language', 'col.tags': 'Tags', 'col.email': 'Email', 'col.phone': 'Phone', 'col.at': 'Received', 'col.last': 'Last contact',
      columns: 'Columns', select: 'Select', selectAll: 'Select all shown',
      sort: 'Sort', sortNew: 'Newest first', sortOld: 'Oldest first', sortValue: 'Highest value', sortDays: 'Longest in stage', sortName: 'Name, A to Z',
      nSelected: '{n} selected', clearSel: 'Clear selection', exportCsv: 'Export CSV',
      importBriefs: 'Import briefs…', exportShown: 'Export {n} as CSV', checkSite: 'Check the site for new briefs', clearSamples: 'Clear sample briefs', samplesCleared: 'Cleared {n} sample briefs.',
      shortcuts: 'Keyboard shortcuts', showNote: 'How briefs arrive', exported: { one: 'Exported one brief.', other: 'Exported {n} briefs.' }, siteNew: '{n} new briefs from the site.', siteOne: 'One new brief from the site.', siteNone: 'No new briefs. Briefs sent from this browser show up on their own.',
      noteMailto: '<b>Briefs from the site open the visitor’s email app</b> and land at {email}, not here. Only briefs sent from this browser appear automatically. To collect every brief in one place, set up form delivery.',
      noteEndpoint: '<b>Form delivery is on.</b> Briefs go to your form service. The admin can’t read that service, so export them there and import the CSV here.',
      setupForm: 'Set up form delivery', checkNow: 'Check for new briefs', hideNote: 'Hide this note',
      newTitle: 'New brief', name: 'Name', email: 'Email', phone: 'Phone or WhatsApp', company: 'Company', lang: 'They wrote in', swells: 'Swells', valueQar: 'Value (QAR)', source: 'Source', owner: 'Owner',
      messageL: 'Brief', messagePh: 'What did they ask for?', errName: 'Add a name.', errEmail: 'That email doesn’t look right.', addBrief: 'Add brief', added: 'Added “{name}”.',
      importTitle: 'Import briefs', dropTitle: 'Drop a CSV or JSON file here', dropHint: 'or click to choose one. Columns are matched by name: name, email, phone, company, message, value or budget, swell or service, received or date.',
      willAdd: '{n} briefs will be added', willAddOne: 'One brief will be added', willAddNone: 'No briefs to add', skippedRows: { one: 'One row has no name or email, so it’ll be skipped.', other: '{n} rows have no name or email, so they’ll be skipped.' },
      dupes: 'Skip {n} already in the inbox (same email)', inInbox: 'Already here', readFail: 'Couldn’t read that file. Use a CSV with a header row, or a JSON array.', importCount: 'Import {n}', imported: { one: 'Imported one brief.', other: 'Imported {n} briefs.' }, moreRows: '+ {n} more',
      'k.next': 'Next brief', 'k.prev': 'Previous brief', 'k.open': 'Open the brief', 'k.select': 'Select the brief', 'k.archive': 'Archive and go to the next', 'k.stage': 'Move to a stage', 'k.assign': 'Assign the brief', 'k.reply': 'Reply by email',
      'k.delete': 'Delete (with undo)', 'k.search': 'Search briefs', 'k.esc': 'Clear the selection, then filters', 'k.view': 'Switch layout', 'k.note': 'Add the note',
      'f.service': 'Service', 'f.word': 'Word caught', services: 'Services they added', servicesL: 'Services', 'col.services': 'Services', 'col.words': 'Words caught', svcGone: 'No longer on the site',
      wordsShort: 'Words', noPicks: 'They didn’t add services or catch words on the site.',
    }),
    ar: P({
      searchPh: 'ابحث في الطلبات', filter: 'تصفية', filterBy: 'التصفية حسب', clear: 'مسح', clearFilters: 'مسح عوامل التصفية',
      saveView: 'حفظ العرض', viewName: 'احفظ هذا العرض', viewNameLabel: 'الاسم', viewSaved: 'حُفظ العرض.', viewRemoved: 'أُزيل عرض «{name}».', removeView: 'إزالة العرض', removeFilter: 'إزالة عامل التصفية',
      vList: 'قائمة', vBoard: 'لوحة', vTable: 'جدول', viewLabel: 'طريقة العرض', newBrief: 'طلب جديد',
      'tab.reply': 'بانتظار الرد', 'tab.open': 'كل المفتوحة', 'tab.starred': 'المميّزة', 'tab.won': 'تم الاتفاق', 'tab.lost': 'لم يتم', 'tab.archived': 'المؤرشفة',
      headSub: '<b>{reply}</b> بانتظار الرد · <b>{open}</b> مفتوحة · <b>{value}</b> في مسار المبيعات', headEmpty: 'الطلبات القادمة من الموقع، وكل ما تضيفه يدوياً.',
      'f.stage': 'المرحلة', 'f.swell': 'الموجة', 'f.source': 'المصدر', 'f.owner': 'المسؤول', 'f.lang': 'اللغة', 'f.tag': 'الوسم', 'f.value': 'القيمة', 'f.snoozed': 'المؤجّلة',
      min: 'لا تقل عن', max: 'لا تزيد على', qarHint: 'بالريال القطري. اترك الخانة فارغة لعدم وضع حد.', noOptions: 'لا يوجد ما تتم التصفية به بعد.', from: 'من {v}', upTo: 'حتى {v}', only: 'فقط',
      unassigned: 'غير مُسند', formerMember: 'عضو سابق', you: 'أنت', someone: 'أحد الفريق', now: 'الآن', langEn: 'الإنجليزية', langAr: 'العربية',
      nSnoozed: 'المؤجّلة: {n}', backToQueue: 'العودة إلى القائمة', queue: 'الطلبات',
      reply: 'الرد بالبريد', whatsapp: 'واتساب', copyBrief: 'نسخ الطلب', copiedBrief: 'نُسخ الطلب.', copyEmail: 'نسخ البريد', noEmail: 'لا يوجد بريد إلكتروني لهذا الطلب.',
      stage: 'المرحلة', moveTo: 'نقل إلى', moveNTo: 'نقل الطلبات المحدّدة ({n}) إلى', assign: 'إسناد', assignTo: 'إسناد إلى',
      snooze: 'تأجيل', snoozedUntil: 'مؤجّل حتى {when}', unsnooze: 'إلغاء التأجيل', snLater: 'لاحقاً اليوم', snTomorrow: 'غداً، {time}', snSunday: 'الأحد، {time}', snPick: 'اختر موعداً…',
      snPickTitle: 'تأجيل حتى', date: 'التاريخ', time: 'الوقت', qatarTime: 'بتوقيت قطر ({gmt}). يعود الطلب إلى القائمة في هذا الموعد.', snPast: 'اختر وقتاً في المستقبل.',
      snoozedOne: 'أُجّل حتى {when}.', snoozedN: 'أُجّلت الطلبات ({n}) حتى {when}.', unsnoozed: 'عاد إلى القائمة.',
      archive: 'أرشفة', unarchive: 'إعادة إلى الوارد', archivedOne: 'أُرشف طلب «{name}».', archivedN: 'أُرشفت الطلبات ({n}).', unarchivedOne: 'أُعيد طلب «{name}» إلى الوارد.', unarchivedN: 'أُعيدت الطلبات ({n}) إلى الوارد.',
      deletedOne: 'حُذف طلب «{name}».', deletedN: 'حُذفت الطلبات ({n}).',
      movedOne: 'نُقل «{name}» إلى {stage}.', movedN: 'نُقلت الطلبات ({n}) إلى {stage}.', signed: 'تم الاتفاق — {name}{svc}', signedN: 'تم الاتفاق على الطلبات ({n}).',
      assignedOne: 'أُسند «{name}» إلى {owner}.', assignedN: 'أُسندت الطلبات ({n}) إلى {owner}.', unassignedOne: 'أُلغي إسناد «{name}».', unassignedN: 'أُلغي إسناد الطلبات ({n}).',
      star: 'تمييز بنجمة', unstar: 'إزالة النجمة', pos: '{i} من {n}', prev: 'الطلب السابق · K', next: 'الطلب التالي · J', back: 'كل الطلبات', briefTitle: 'الطلب',
      'hl.value': 'القيمة', 'hl.swells': 'الموجات المطلوبة', 'hl.stage': 'المرحلة', 'hl.source': 'المصدر', 'hl.received': 'تاريخ الاستلام', 'hl.last': 'آخر تواصل',
      addValue: 'أضف قيمة', editValue: 'تعديل القيمة', noSwells: 'لم يختر شيئاً', notYet: 'ليس بعد', inStage: '{d} في هذه المرحلة', pastTarget: 'تجاوز الهدف ({d})', closedOn: 'منذ {date}', lessDay: 'أقل من يوم', dZero: 'اليوم',
      logReply: 'تسجيل الرد', logged: 'سُجّل الرد.', draftOpened: 'فُتحت مسودة البريد. سجّلها كردّ بعد إرسالها.',
      message: 'الطلب', noMessage: 'لم تصل رسالة مع هذا الطلب.', words: 'كلمات التقطها في الموقع', tags: 'الوسوم', addTag: 'إضافة وسم', removeTag: 'إزالة {tag}', tagRemoved: 'أُزيل وسم «{tag}».', tagPh: 'اسم الوسم',
      activity: 'النشاط', notePh: 'أضف ملاحظة للفريق…', addNote: 'إضافة ملاحظة',
      'ev.site': 'أُرسل الطلب من الموقع', 'ev.added': 'أُضيف يدوياً', 'ev.imported': 'استُورد', 'ev.stage': 'نُقل إلى {stage}', 'ev.assign': 'أُسند إلى {name}', 'ev.unassign': 'أُلغي الإسناد',
      'ev.archive': 'أُرشف', 'ev.unarchive': 'أُعيد إلى الوارد', 'ev.snooze': 'أُجّل حتى {when}', 'ev.unsnooze': 'أُلغي التأجيل', 'ev.contact': 'سُجّل رد', 'ev.value': 'حُدّدت القيمة: {value}', 'ev.valueClear': 'مُسحت القيمة',
      pickTitle: 'اختر طلباً', pickText: 'اضغط <kbd>J</kbd> و<kbd>K</kbd> للتنقل بين الطلبات.',
      emptyAllTitle: 'لا طلبات بعد', emptyAllText: 'تصل طلبات الموقع إلى بريدك أو إلى خدمة النماذج لديك. استوردها هنا، أو أضف طلباً يدوياً، أو اطّلع على طريقة استلامها تلقائياً.',
      calmTitle: 'كل الطلبات حصلت على رد.', calmText: 'المياه هادئة. تصل الطلبات الجديدة من الموقع إلى هنا أولاً.',
      noMatchTitle: 'لا طلبات مطابقة', noMatchText: 'جرّب عوامل تصفية أقل، أو امسحها.',
      'e.title': 'لا شيء هنا', 'e.open': 'لا طلبات مفتوحة الآن.', 'e.starred': 'ميّز طلباً بنجمة ليبقى قريباً منك.', 'e.won': 'تجتمع هنا الطلبات التي تم الاتفاق عليها.', 'e.lost': 'تصل إلى هنا الطلبات التي لم تتم.', 'e.archived': 'اضغط <kbd>E</kbd> على أي طلب لأرشفته.', 'e.snoozed': 'لا شيء مؤجّل.',
      dropHere: 'أفلت الطلبات هنا', collapse: 'طيّ العمود', expand: 'توسيع العمود',
      'col.name': 'الاسم', 'col.company': 'الشركة', 'col.stage': 'المرحلة', 'col.swells': 'الموجات', 'col.value': 'القيمة', 'col.days': 'في المرحلة', 'col.owner': 'المسؤول', 'col.source': 'المصدر',
      'col.lang': 'اللغة', 'col.tags': 'الوسوم', 'col.email': 'البريد', 'col.phone': 'الهاتف', 'col.at': 'الاستلام', 'col.last': 'آخر تواصل',
      columns: 'الأعمدة', select: 'تحديد', selectAll: 'تحديد كل المعروض',
      sort: 'الترتيب', sortNew: 'الأحدث أولاً', sortOld: 'الأقدم أولاً', sortValue: 'الأعلى قيمة', sortDays: 'الأطول في مرحلته', sortName: 'الاسم أبجدياً',
      nSelected: 'المحدّد: {n}', clearSel: 'إلغاء التحديد', exportCsv: 'تصدير CSV',
      importBriefs: 'استيراد طلبات…', exportShown: 'تصدير {n} بصيغة CSV', checkSite: 'التحقق من طلبات جديدة من الموقع', clearSamples: 'مسح الطلبات التجريبية', samplesCleared: 'مُسحت الطلبات التجريبية ({n}).',
      shortcuts: 'اختصارات لوحة المفاتيح', showNote: 'كيف تصل الطلبات', exported: 'صُدّرت الطلبات ({n}).', siteNew: 'وصلت طلبات جديدة من الموقع ({n}).', siteOne: 'وصل طلب جديد من الموقع.', siteNone: 'لا طلبات جديدة. تظهر الطلبات المرسلة من هذا المتصفح تلقائياً.',
      noteMailto: '<b>طلبات الموقع تفتح تطبيق البريد لدى الزائر</b> وتصل إلى {email}، لا إلى هنا. لا يظهر هنا تلقائياً إلا ما يُرسل من هذا المتصفح. لجمع كل الطلبات في مكان واحد، فعّل استلام النموذج.',
      noteEndpoint: '<b>استلام النموذج مفعّل.</b> تذهب الطلبات إلى خدمة النماذج لديك، ولا تستطيع لوحة الإدارة قراءتها. صدّرها من هناك واستورد ملف CSV هنا.',
      setupForm: 'إعداد استلام النموذج', checkNow: 'التحقق من طلبات جديدة', hideNote: 'إخفاء الملاحظة',
      newTitle: 'طلب جديد', name: 'الاسم', email: 'البريد الإلكتروني', phone: 'الهاتف أو واتساب', company: 'الشركة', lang: 'لغة المراسلة', swells: 'الموجات', valueQar: 'القيمة (ر.ق)', source: 'المصدر', owner: 'المسؤول',
      messageL: 'نص الطلب', messagePh: 'ماذا طلبوا؟', errName: 'أضف اسماً.', errEmail: 'يبدو أن البريد الإلكتروني غير صحيح.', addBrief: 'إضافة الطلب', added: 'أُضيف طلب «{name}».',
      importTitle: 'استيراد طلبات', dropTitle: 'أفلت ملف CSV أو JSON هنا', dropHint: 'أو انقر لاختيار ملف. تُطابَق الأعمدة بأسمائها: name وemail وphone وcompany وmessage وvalue أو budget وswell أو service وreceived أو date.',
      willAdd: 'عدد الطلبات التي ستُضاف: {n}', willAddOne: 'سيُضاف طلب واحد', willAddNone: 'لا طلبات لإضافتها', skippedRows: 'سيتم تخطي صفوف بلا اسم أو بريد ({n}).',
      dupes: 'تخطّي الموجود في الوارد مسبقاً بالبريد نفسه ({n})', inInbox: 'موجود مسبقاً', readFail: 'تعذّرت قراءة الملف. استخدم CSV بصف عناوين، أو مصفوفة JSON.', importCount: 'استيراد {n}', imported: 'استُوردت الطلبات ({n}).', moreRows: '+ {n} أخرى',
      'k.next': 'الطلب التالي', 'k.prev': 'الطلب السابق', 'k.open': 'فتح الطلب', 'k.select': 'تحديد الطلب', 'k.archive': 'أرشفة والانتقال للتالي', 'k.stage': 'نقل إلى مرحلة', 'k.assign': 'إسناد الطلب', 'k.reply': 'الرد بالبريد',
      'k.delete': 'حذف (مع إمكانية التراجع)', 'k.search': 'البحث في الطلبات', 'k.esc': 'إلغاء التحديد ثم عوامل التصفية', 'k.view': 'تبديل طريقة العرض', 'k.note': 'إضافة الملاحظة',
      'f.service': 'الخدمة', 'f.word': 'الكلمة الملتقطة', services: 'الخدمات التي أضافها', servicesL: 'الخدمات', 'col.services': 'الخدمات', 'col.words': 'الكلمات الملتقطة', svcGone: 'لم تعد في الموقع',
      wordsShort: 'الكلمات', noPicks: 'لم يُضف خدمات ولم يلتقط كلمات في الموقع.',
    }),
    fa: P({
      searchPh: 'جست‌وجوی درخواست‌ها', filter: 'فیلتر', filterBy: 'فیلتر بر اساس', clear: 'پاک کردن', clearFilters: 'پاک کردن فیلترها',
      saveView: 'ذخیرهٔ نما', viewName: 'ذخیرهٔ این نما', viewNameLabel: 'نام', viewSaved: 'نما ذخیره شد.', viewRemoved: 'نمای «{name}» حذف شد.', removeView: 'حذف نما', removeFilter: 'برداشتن فیلتر',
      vList: 'فهرست', vBoard: 'تابلو', vTable: 'جدول', viewLabel: 'چیدمان', newBrief: 'درخواست جدید',
      'tab.reply': 'منتظر پاسخ', 'tab.open': 'همهٔ بازها', 'tab.starred': 'ستاره‌دار', 'tab.won': 'موفق', 'tab.lost': 'ناموفق', 'tab.archived': 'بایگانی‌شده',
      headSub: '<b>{reply}</b> منتظر پاسخ · <b>{open}</b> باز · <b>{value}</b> در جریان فروش', headEmpty: 'درخواست‌هایی که از سایت می‌رسند، و هر چه خودتان اضافه می‌کنید.',
      'f.stage': 'مرحله', 'f.swell': 'موج', 'f.source': 'منبع', 'f.owner': 'مسئول', 'f.lang': 'زبان', 'f.tag': 'برچسب', 'f.value': 'ارزش', 'f.snoozed': 'به تعویق افتاده',
      min: 'دست‌کم', max: 'حداکثر', qarHint: 'به ریال قطر. برای نداشتن محدودیت، خانه را خالی بگذارید.', noOptions: 'هنوز چیزی برای فیلتر کردن نیست.', from: 'از {v}', upTo: 'تا {v}', only: 'فقط',
      unassigned: 'بدون مسئول', formerMember: 'عضو پیشین', you: 'شما', someone: 'یکی از اعضا', now: 'اکنون', langEn: 'انگلیسی', langAr: 'عربی',
      nSnoozed: '{n} به تعویق افتاده', backToQueue: 'بازگشت به صف', queue: 'درخواست‌ها',
      reply: 'پاسخ با ایمیل', whatsapp: 'واتس‌اپ', copyBrief: 'کپی درخواست', copiedBrief: 'درخواست کپی شد.', copyEmail: 'کپی ایمیل', noEmail: 'این درخواست نشانی ایمیل ندارد.',
      stage: 'مرحله', moveTo: 'انتقال به', moveNTo: 'انتقال {n} درخواست به', assign: 'واگذاری', assignTo: 'واگذاری به',
      snooze: 'تعویق', snoozedUntil: 'به تعویق افتاده تا {when}', unsnooze: 'لغو تعویق', snLater: 'امروز، کمی بعدتر', snTomorrow: 'فردا، {time}', snSunday: 'یکشنبه، {time}', snPick: 'انتخاب تاریخ…',
      snPickTitle: 'تعویق تا', date: 'تاریخ', time: 'ساعت', qatarTime: 'به وقت قطر ({gmt}). درخواست در این زمان به صف برمی‌گردد.', snPast: 'زمانی در آینده انتخاب کنید.',
      snoozedOne: 'تا {when} به تعویق افتاد.', snoozedN: '{n} درخواست تا {when} به تعویق افتاد.', unsnoozed: 'به صف برگشت.',
      archive: 'بایگانی', unarchive: 'بازگرداندن به صندوق', archivedOne: '«{name}» بایگانی شد.', archivedN: '{n} درخواست بایگانی شد.', unarchivedOne: '«{name}» به صندوق ورودی برگشت.', unarchivedN: '{n} درخواست به صندوق ورودی برگشت.',
      deletedOne: '«{name}» حذف شد.', deletedN: '{n} درخواست حذف شد.',
      movedOne: '«{name}» به مرحلهٔ «{stage}» رفت.', movedN: '{n} درخواست به مرحلهٔ «{stage}» رفت.', signed: 'قرارداد بسته شد — {name}{svc}', signedN: 'قرارداد {n} درخواست بسته شد.',
      assignedOne: '«{name}» به {owner} واگذار شد.', assignedN: '{n} درخواست به {owner} واگذار شد.', unassignedOne: 'واگذاری «{name}» لغو شد.', unassignedN: 'واگذاری {n} درخواست لغو شد.',
      star: 'ستاره زدن', unstar: 'برداشتن ستاره', pos: '{i} از {n}', prev: 'درخواست قبلی · K', next: 'درخواست بعدی · J', back: 'همهٔ درخواست‌ها', briefTitle: 'درخواست',
      'hl.value': 'ارزش', 'hl.swells': 'موج‌های درخواستی', 'hl.stage': 'مرحله', 'hl.source': 'منبع', 'hl.received': 'تاریخ دریافت', 'hl.last': 'آخرین تماس',
      addValue: 'افزودن ارزش', editValue: 'ویرایش ارزش', noSwells: 'چیزی انتخاب نشده', notYet: 'هنوز نه', inStage: '{d} در این مرحله', pastTarget: 'فراتر از هدف {d}', closedOn: 'از {date}', lessDay: 'کمتر از یک روز', dZero: 'امروز',
      logReply: 'ثبت پاسخ', logged: 'پاسخ ثبت شد.', draftOpened: 'پیش‌نویس ایمیل باز شد. پس از فرستادن، آن را به‌عنوان پاسخ ثبت کنید.',
      message: 'متن درخواست', noMessage: 'این درخواست پیامی همراه نداشت.', words: 'واژه‌هایی که در سایت گرفت', tags: 'برچسب‌ها', addTag: 'افزودن برچسب', removeTag: 'برداشتن {tag}', tagRemoved: 'برچسب «{tag}» برداشته شد.', tagPh: 'نام برچسب',
      activity: 'فعالیت‌ها', notePh: 'یادداشتی برای تیم بنویسید…', addNote: 'افزودن یادداشت',
      'ev.site': 'درخواست از سایت فرستاده شد', 'ev.added': 'به‌صورت دستی افزوده شد', 'ev.imported': 'از فایل وارد شد', 'ev.stage': 'به مرحلهٔ «{stage}» رفت', 'ev.assign': 'به {name} واگذار شد', 'ev.unassign': 'واگذاری لغو شد',
      'ev.archive': 'بایگانی شد', 'ev.unarchive': 'به صندوق ورودی برگشت', 'ev.snooze': 'تا {when} به تعویق افتاد', 'ev.unsnooze': 'تعویق لغو شد', 'ev.contact': 'پاسخ ثبت شد', 'ev.value': 'ارزش روی {value} گذاشته شد', 'ev.valueClear': 'ارزش پاک شد',
      pickTitle: 'یک درخواست را انتخاب کنید', pickText: 'با <kbd>J</kbd> و <kbd>K</kbd> در صف جابه‌جا شوید.',
      emptyAllTitle: 'هنوز درخواستی نرسیده', emptyAllText: 'درخواست‌های سایت به ایمیل شما یا به سرویس فرم‌تان می‌رسند. آن‌ها را اینجا وارد کنید، یکی را دستی اضافه کنید یا ببینید چطور خودکار دریافتشان کنید.',
      calmTitle: 'به همهٔ درخواست‌ها پاسخ داده‌اید.', calmText: 'دریا آرام است. درخواست‌های تازهٔ سایت اول اینجا می‌رسند.',
      noMatchTitle: 'درخواستی پیدا نشد', noMatchText: 'فیلترهای کمتری امتحان کنید یا آن‌ها را پاک کنید.',
      'e.title': 'اینجا خالی است', 'e.open': 'فعلاً درخواست بازی نیست.', 'e.starred': 'به درخواستی ستاره بزنید تا دم دست بماند.', 'e.won': 'درخواست‌هایی که قراردادشان بسته شده اینجا جمع می‌شوند.', 'e.lost': 'درخواست‌هایی که به نتیجه نرسیدند اینجا می‌آیند.', 'e.archived': 'برای بایگانی یک درخواست، <kbd>E</kbd> را بزنید.', 'e.snoozed': 'چیزی به تعویق نیفتاده.',
      dropHere: 'درخواست‌ها را اینجا رها کنید', collapse: 'جمع کردن ستون', expand: 'باز کردن ستون',
      'col.name': 'نام', 'col.company': 'شرکت', 'col.stage': 'مرحله', 'col.swells': 'موج‌ها', 'col.value': 'ارزش', 'col.days': 'در این مرحله', 'col.owner': 'مسئول', 'col.source': 'منبع',
      'col.lang': 'زبان', 'col.tags': 'برچسب‌ها', 'col.email': 'ایمیل', 'col.phone': 'تلفن', 'col.at': 'دریافت', 'col.last': 'آخرین تماس',
      columns: 'ستون‌ها', select: 'انتخاب', selectAll: 'انتخاب همهٔ موارد نمایان',
      sort: 'مرتب‌سازی', sortNew: 'تازه‌ترین‌ها اول', sortOld: 'قدیمی‌ترین‌ها اول', sortValue: 'بیشترین ارزش', sortDays: 'طولانی‌ترین ماندن در مرحله', sortName: 'نام، به ترتیب الفبا',
      nSelected: '{n} انتخاب‌شده', clearSel: 'لغو انتخاب', exportCsv: 'خروجی CSV',
      importBriefs: 'وارد کردن درخواست‌ها…', exportShown: 'خروجی CSV از {n} درخواست', checkSite: 'بررسی سایت برای درخواست‌های تازه', clearSamples: 'پاک کردن درخواست‌های نمونه', samplesCleared: '{n} درخواست نمونه پاک شد.',
      shortcuts: 'میان‌برهای صفحه‌کلید', showNote: 'درخواست‌ها چطور می‌رسند', exported: 'خروجی {n} درخواست گرفته شد.', siteNew: '{n} درخواست تازه از سایت رسید.', siteOne: 'یک درخواست تازه از سایت رسید.', siteNone: 'درخواست تازه‌ای نیست. درخواست‌هایی که از همین مرورگر فرستاده شوند خودشان اینجا می‌آیند.',
      noteMailto: '<b>درخواست‌های سایت برنامهٔ ایمیلِ بازدیدکننده را باز می‌کنند</b> و به {email} می‌رسند، نه اینجا. فقط درخواست‌هایی که از همین مرورگر فرستاده شوند خودکار اینجا دیده می‌شوند. برای جمع کردن همهٔ درخواست‌ها در یک جا، تحویل فرم را راه بیندازید.',
      noteEndpoint: '<b>تحویل فرم روشن است.</b> درخواست‌ها به سرویس فرم شما می‌روند. پنل نمی‌تواند آن سرویس را بخواند؛ از آنجا خروجی بگیرید و فایل CSV را اینجا وارد کنید.',
      setupForm: 'راه‌اندازی تحویل فرم', checkNow: 'بررسی درخواست‌های تازه', hideNote: 'پنهان کردن این یادداشت',
      newTitle: 'درخواست جدید', name: 'نام', email: 'ایمیل', phone: 'تلفن یا واتس‌اپ', company: 'شرکت', lang: 'زبان مکاتبه', swells: 'موج‌ها', valueQar: 'ارزش (ریال قطر)', source: 'منبع', owner: 'مسئول',
      messageL: 'متن درخواست', messagePh: 'چه خواسته‌اند؟', errName: 'نامی وارد کنید.', errEmail: 'این ایمیل درست به نظر نمی‌رسد.', addBrief: 'افزودن درخواست', added: '«{name}» افزوده شد.',
      importTitle: 'وارد کردن درخواست‌ها', dropTitle: 'فایل CSV یا JSON را اینجا رها کنید', dropHint: 'یا کلیک کنید و فایلی برگزینید. ستون‌ها با نامشان شناخته می‌شوند: name، email، phone، company، message، value یا budget، swell یا service، received یا date.',
      willAdd: '{n} درخواست افزوده می‌شود', willAddOne: 'یک درخواست افزوده می‌شود', willAddNone: 'درخواستی برای افزودن نیست', skippedRows: '{n} ردیف نام یا ایمیل ندارد و کنار گذاشته می‌شود.',
      dupes: 'رد کردن {n} مورد که از قبل در صندوق هست (ایمیل یکسان)', inInbox: 'از قبل هست', readFail: 'این فایل خوانده نشد. از CSV با ردیف عنوان یا آرایهٔ JSON استفاده کنید.', importCount: 'وارد کردن {n}', imported: '{n} درخواست وارد شد.', moreRows: '+ {n} مورد دیگر',
      'k.next': 'درخواست بعدی', 'k.prev': 'درخواست قبلی', 'k.open': 'باز کردن درخواست', 'k.select': 'انتخاب درخواست', 'k.archive': 'بایگانی و رفتن به بعدی', 'k.stage': 'انتقال به یک مرحله', 'k.assign': 'واگذاری درخواست', 'k.reply': 'پاسخ با ایمیل',
      'k.delete': 'حذف (با امکان واگرد)', 'k.search': 'جست‌وجوی درخواست‌ها', 'k.esc': 'لغو انتخاب، سپس پاک کردن فیلترها', 'k.view': 'تغییر چیدمان', 'k.note': 'افزودن یادداشت',
      'f.service': 'خدمت', 'f.word': 'واژهٔ گرفته‌شده', services: 'خدمت‌هایی که افزود', servicesL: 'خدمت‌ها', 'col.services': 'خدمت‌ها', 'col.words': 'واژه‌های گرفته‌شده', svcGone: 'دیگر در سایت نیست',
      wordsShort: 'واژه‌ها', noPicks: 'نه خدمتی افزوده و نه واژه‌ای در سایت گرفته است.',
    }),
  });

  // follow-ups, lost reasons, reply templates, attribution, Recently deleted, the "how briefs arrive" panel
  MA.i18n.add({
    en: P({
      tabsL: 'Queues', 'tab.due': 'Due', 'e.due': 'Nothing is due. Give a brief a next step and a date, and it lands here on that day.',
      unread: 'Unread', sampleRow: 'Sample brief', sampleKey: 'Sample data. Rows with a dotted edge are sample briefs.', showMore: 'Show {n} more',
      listHint: 'Arrow keys move through the briefs, Enter opens one, Space selects it.',
      boardHint: 'Arrow keys move between briefs, Enter opens one, and {key} moves it to another stage.', boardHintOff: 'Arrow keys move between briefs and Enter opens one. Move a brief to another stage from the Stage button inside it.',
      'k.arrows': 'Move through the list', 'k.space': 'Select the brief',
      next: 'Next step', nextAdd: 'Add a next step', nextEdit: 'Edit the next step', nextPh: 'Send the proposal, call back…', dueL: 'Due',
      dueToday: 'Due today', dueTomorrow: 'Due tomorrow', dueOn: 'Due {date}', overdue: 'Overdue', dToday: 'Today', dTomorrow: 'Tomorrow', dWeek: 'In a week',
      nextSave: 'Save', nextDone: 'Mark the next step done', nextSaved: 'Next step saved.', nextCleared: 'Next step cleared.', nextDoneT: 'Done: {text}', nextNeed: 'Write the next step or pick a date.',
      'ev.next': 'Next step: {text}', 'ev.nextDue': 'due {date}', 'ev.nextClear': 'Next step cleared', 'col.due': 'Next step', sortDue: 'Due soonest',
      lostWhy: 'Why didn’t it go ahead?', 'lost.budget': 'Budget', 'lost.timing': 'Timing', 'lost.competitor': 'Chose another studio', 'lost.silent': 'Stopped replying',
      'lost.fit': 'Not a fit for us', 'lost.scope': 'Project cancelled', 'lost.other': 'Something else…', lostReasonL: 'Reason', lostAdd: 'Add a reason', lostChange: 'Change the reason',
      lostSaved: 'Reason saved: {reason}.', 'ev.lost': 'Reason: {text}',
      tpls: 'Reply templates', tplsEdit: 'Edit reply templates…', tplPick: 'Reply with a template', tplEmail: 'By email', tplWa: 'On WhatsApp',
      tplName: 'Template name', tplSubject: 'Subject', tplBody: 'Email', tplWaL: 'WhatsApp message', tplVarsL: 'Insert', tplInsert: 'Insert {v}',
      tplHint: 'Variables are filled in from the brief. A line whose {company}, {services} or {swells} is empty is left out of the email.',
      tplNew: 'New template', tplDel: 'Delete template', tplDeleted: 'Deleted the “{name}” template.', tplFirst: 'Use for Reply', tplIsFirst: 'Reply by email uses this template.',
      tplReset: 'Restore the starter templates', tplResetDone: 'Starter templates restored.', tplUntitled: 'Untitled',
      'tpl.first': 'First reply', 'tpl.follow': 'Follow-up', 'tpl.decline': 'Not a fit',
      attr: 'How they found you', 'attr.channel': 'Channel', 'attr.ref': 'Came from', 'attr.campaign': 'Campaign', 'attr.landing': 'First page', budget: 'Their budget',
      'f.channel': 'Channel', 'f.campaign': 'Campaign',
      'ch.direct': 'Direct', 'ch.search': 'Search', 'ch.instagram': 'Instagram', 'ch.linkedin': 'LinkedIn', 'ch.whatsapp': 'WhatsApp', 'ch.email': 'Email', 'ch.x': 'X',
      'ch.social': 'Other social', 'ch.referral': 'Another website', 'ch.none': 'Not tracked',
      rep: 'Where briefs come from', repMenu: 'Where briefs come from…', repBy: 'Group by', 'rep.briefs': 'Briefs', 'rep.open': 'Open', 'rep.pipe': 'In the pipeline',
      'rep.wonValue': 'Won value', 'rep.rate': 'Win rate', 'rep.total': 'All', 'rep.cap': 'Briefs, pipeline and won value by {by}',
      'rep.note': 'Win rate counts closed briefs only (won or lost). Values are in QAR. Archived briefs count as briefs, not as open.', 'rep.empty': 'No briefs to count yet.', 'rep.sample': 'Includes the sample briefs while sample data is on.',
      wonStrip: 'Won in the last {n} days', wonTop: 'Most won value: {source}, {value}', bySource: 'By source',
      trash: 'Recently deleted', trashN: 'Recently deleted ({n})', trashText: 'Deleted briefs stay here for {n} days, then they’re removed for good. A deleted brief from the site never comes back on its own.',
      restore: 'Restore', purge: 'Delete for good', purgeAll: 'Empty Recently deleted', purgeQ: 'Delete “{name}” for good?',
      purgeAllQ: { one: 'Delete one brief for good?', other: 'Delete {n} briefs for good?' }, purgeText: 'This can’t be undone.',
      restoredOne: 'Restored “{name}”.', purgedOne: 'Deleted “{name}” for good.', purgedN: { one: 'Deleted one brief for good.', other: 'Deleted {n} briefs for good.' },
      deletedAgo: 'Deleted {ago}', goneIn: 'gone for good in {d}', trashEmpty: 'Nothing was deleted in the last {n} days.', backInbox: 'Back to the inbox',
      how: 'How to receive every brief', howTitle: 'Receive briefs automatically',
      'how.mailto': '<b>Right now</b> the site’s Send button opens the visitor’s email app, so each brief reaches you as an email at {email}.',
      'how.endpoint': '<b>Right now</b> the site sends each brief to your form service ({host}), together with where the visitor came from.',
      'how.limit': 'This admin is a static page with no server behind it. It can’t fetch briefs from your form service or from other people’s browsers on its own. Only briefs sent from this browser appear here by themselves, which is handy for testing the form.',
      'how.s1': '<b>Set up form delivery.</b> Paste your form service’s address (Formspree, Basin, Getform…) in Settings › Form delivery. Every brief then lands in one place, with where the visitor came from.',
      'how.s2': '<b>Bring the briefs in here.</b> Export the submissions from that service as a CSV and import it (More › Import briefs). Briefs already here with the same email are skipped.',
      'how.s3': '<b>Ask for a phone number.</b> The form’s optional phone and budget fields let you reply on WhatsApp and see what clients plan to spend. Phone: {phone} · Budget: {budget}.',
      'how.on': 'on', 'how.off': 'off', 'how.open': 'Open Form delivery', 'how.import': 'Import a CSV',
      'notify.due': 'Follow-up due: {name}', 'notify.snooze': 'Back from snooze: {name}',
    }),
    ar: P({
      tabsL: 'قوائم الطلبات', 'tab.due': 'المستحقة', 'e.due': 'لا شيء مستحق. أضف خطوة تالية وموعداً لأي طلب، وسيظهر هنا في يومه.',
      unread: 'غير مقروء', sampleRow: 'طلب تجريبي', sampleKey: 'بيانات تجريبية. الصفوف ذات الحافة المنقّطة طلبات تجريبية.', showMore: 'عرض المزيد ({n})',
      listHint: 'تنقّل بين الطلبات بمفاتيح الأسهم، وافتح الطلب بمفتاح Enter، وحدّده بمفتاح المسافة.',
      boardHint: 'تنقّل بين الطلبات بمفاتيح الأسهم، وافتح الطلب بمفتاح Enter، وانقله إلى مرحلة أخرى بمفتاح {key}.', boardHintOff: 'تنقّل بين الطلبات بمفاتيح الأسهم، وافتح الطلب بمفتاح Enter. ولنقله إلى مرحلة أخرى استخدم زر المرحلة داخله.',
      'k.arrows': 'التنقل في القائمة', 'k.space': 'تحديد الطلب',
      next: 'الخطوة التالية', nextAdd: 'أضف خطوة تالية', nextEdit: 'تعديل الخطوة التالية', nextPh: 'إرسال العرض، معاودة الاتصال…', dueL: 'الموعد',
      dueToday: 'مستحق اليوم', dueTomorrow: 'مستحق غداً', dueOn: 'الموعد {date}', overdue: 'متأخر', dToday: 'اليوم', dTomorrow: 'غداً', dWeek: 'بعد أسبوع',
      nextSave: 'حفظ', nextDone: 'وضع علامة «تمّت» على الخطوة التالية', nextSaved: 'حُفظت الخطوة التالية.', nextCleared: 'مُسحت الخطوة التالية.', nextDoneT: 'تمّت: {text}', nextNeed: 'اكتب الخطوة التالية أو اختر موعداً.',
      'ev.next': 'الخطوة التالية: {text}', 'ev.nextDue': 'موعدها {date}', 'ev.nextClear': 'مُسحت الخطوة التالية', 'col.due': 'الخطوة التالية', sortDue: 'الأقرب موعداً',
      lostWhy: 'لماذا لم يتم؟', 'lost.budget': 'الميزانية', 'lost.timing': 'التوقيت', 'lost.competitor': 'اختاروا جهة أخرى', 'lost.silent': 'توقّفوا عن الرد',
      'lost.fit': 'لا يناسبنا', 'lost.scope': 'أُلغي المشروع', 'lost.other': 'سبب آخر…', lostReasonL: 'السبب', lostAdd: 'أضف السبب', lostChange: 'تغيير السبب',
      lostSaved: 'حُفظ السبب: {reason}.', 'ev.lost': 'السبب: {text}',
      tpls: 'قوالب الرد', tplsEdit: 'تعديل قوالب الرد…', tplPick: 'الرد بقالب', tplEmail: 'بالبريد', tplWa: 'عبر واتساب',
      tplName: 'اسم القالب', tplSubject: 'الموضوع', tplBody: 'نص البريد', tplWaL: 'رسالة واتساب', tplVarsL: 'إدراج', tplInsert: 'إدراج {v}',
      tplHint: 'تُملأ المتغيّرات من الطلب. ويُحذف من البريد كل سطر يكون فيه {company} أو {services} أو {swells} فارغاً.',
      tplNew: 'قالب جديد', tplDel: 'حذف القالب', tplDeleted: 'حُذف قالب «{name}».', tplFirst: 'استخدامه للرد', tplIsFirst: 'يستخدم زر «الرد بالبريد» هذا القالب.',
      tplReset: 'استعادة القوالب الأولى', tplResetDone: 'استُعيدت القوالب الأولى.', tplUntitled: 'بلا اسم',
      'tpl.first': 'الرد الأول', 'tpl.follow': 'متابعة', 'tpl.decline': 'اعتذار لطيف',
      attr: 'كيف وصلوا إليكم', 'attr.channel': 'القناة', 'attr.ref': 'جاؤوا من', 'attr.campaign': 'الحملة', 'attr.landing': 'أول صفحة', budget: 'ميزانيتهم',
      'f.channel': 'القناة', 'f.campaign': 'الحملة',
      'ch.direct': 'زيارة مباشرة', 'ch.search': 'محركات البحث', 'ch.instagram': 'إنستغرام', 'ch.linkedin': 'لينكدإن', 'ch.whatsapp': 'واتساب', 'ch.email': 'البريد الإلكتروني', 'ch.x': 'إكس',
      'ch.social': 'منصات تواصل أخرى', 'ch.referral': 'موقع آخر', 'ch.none': 'غير مُتتبَّع',
      rep: 'من أين تأتي الطلبات', repMenu: 'من أين تأتي الطلبات…', repBy: 'التجميع حسب', 'rep.briefs': 'الطلبات', 'rep.open': 'مفتوحة', 'rep.pipe': 'في مسار المبيعات',
      'rep.wonValue': 'قيمة ما تم الاتفاق عليه', 'rep.rate': 'نسبة الفوز', 'rep.total': 'الكل', 'rep.cap': 'الطلبات ومسار المبيعات وقيمة ما تم الاتفاق عليه حسب {by}',
      'rep.note': 'تُحسب نسبة الفوز من الطلبات المغلقة فقط (تم الاتفاق أو لم يتم). القيم بالريال القطري. تُعدّ الطلبات المؤرشفة ضمن الطلبات لا ضمن المفتوحة.', 'rep.empty': 'لا طلبات لحسابها بعد.', 'rep.sample': 'يشمل الطلبات التجريبية ما دامت البيانات التجريبية مفعّلة.',
      wonStrip: 'تم الاتفاق خلال آخر {n} يوماً', wonTop: 'أعلى قيمة من: {source}، {value}', bySource: 'حسب المصدر',
      trash: 'المحذوفة مؤخراً', trashN: 'المحذوفة مؤخراً ({n})', trashText: 'تبقى الطلبات المحذوفة هنا {n} يوماً، ثم تُحذف نهائياً. ولا يعود طلب محذوف من الموقع من تلقاء نفسه.',
      restore: 'استعادة', purge: 'حذف نهائي', purgeAll: 'إفراغ المحذوفة مؤخراً', purgeQ: 'حذف «{name}» نهائياً؟',
      purgeAllQ: 'حذف الطلبات المحذوفة ({n}) نهائياً؟', purgeText: 'لا يمكن التراجع عن ذلك.',
      restoredOne: 'استُعيد «{name}».', purgedOne: 'حُذف «{name}» نهائياً.', purgedN: 'حُذفت الطلبات نهائياً ({n}).',
      deletedAgo: 'حُذف {ago}', goneIn: 'يُحذف نهائياً بعد {d}', trashEmpty: 'لم يُحذف شيء خلال آخر {n} يوماً.', backInbox: 'العودة إلى الوارد',
      how: 'كيف تستلم كل الطلبات', howTitle: 'استلام الطلبات تلقائياً',
      'how.mailto': '<b>حالياً</b> يفتح زر الإرسال في الموقع تطبيق البريد لدى الزائر، فيصلك كل طلب رسالةً على {email}.',
      'how.endpoint': '<b>حالياً</b> يرسل الموقع كل طلب إلى خدمة النماذج لديك ({host})، ومعه مصدر الزيارة.',
      'how.limit': 'لوحة الإدارة صفحة ثابتة بلا خادم خلفها، فلا تستطيع جلب الطلبات من خدمة النماذج أو من متصفحات الآخرين بنفسها. لا يظهر هنا تلقائياً إلا ما يُرسل من هذا المتصفح، وهذا مفيد لتجربة النموذج.',
      'how.s1': '<b>فعّل استلام النموذج.</b> الصق عنوان خدمة النماذج لديك (Formspree أو Basin أو Getform…) في الإعدادات › استلام النموذج، فتجتمع كل الطلبات في مكان واحد مع مصدر كل زيارة.',
      'how.s2': '<b>أدخِل الطلبات إلى هنا.</b> صدّرها من الخدمة بصيغة CSV واستوردها (المزيد › استيراد طلبات). يُتخطّى ما هو موجود هنا بالبريد نفسه.',
      'how.s3': '<b>اطلب رقم الهاتف.</b> يتيح لك حقلا الهاتف والميزانية الاختياريان في النموذج الرد عبر واتساب ومعرفة ما ينوي العملاء إنفاقه. الهاتف: {phone} · الميزانية: {budget}.',
      'how.on': 'مفعّل', 'how.off': 'متوقف', 'how.open': 'فتح استلام النموذج', 'how.import': 'استيراد ملف CSV',
      'notify.due': 'متابعة مستحقة: {name}', 'notify.snooze': 'انتهى التأجيل: {name}',
    }),
    fa: P({
      tabsL: 'صف‌ها', 'tab.due': 'سررسیدشده', 'e.due': 'چیزی سررسید نشده. برای یک درخواست گام بعدی و تاریخ بگذارید تا همان روز اینجا بیاید.',
      unread: 'خوانده‌نشده', sampleRow: 'درخواست نمونه', sampleKey: 'دادهٔ نمونه. ردیف‌هایی که لبهٔ نقطه‌چین دارند درخواست نمونه‌اند.', showMore: 'نمایش {n} مورد دیگر',
      listHint: 'با کلیدهای جهت بین درخواست‌ها بروید، با Enter یکی را باز کنید و با Space انتخابش کنید.',
      boardHint: 'با کلیدهای جهت بین درخواست‌ها بروید، با Enter یکی را باز کنید و با {key} آن را به مرحلهٔ دیگری ببرید.', boardHintOff: 'با کلیدهای جهت بین درخواست‌ها بروید و با Enter یکی را باز کنید. برای بردن به مرحلهٔ دیگر، از دکمهٔ مرحله در خود درخواست استفاده کنید.',
      'k.arrows': 'جابه‌جایی در فهرست', 'k.space': 'انتخاب درخواست',
      next: 'گام بعدی', nextAdd: 'افزودن گام بعدی', nextEdit: 'ویرایش گام بعدی', nextPh: 'فرستادن پیشنهاد، تماس دوباره…', dueL: 'موعد',
      dueToday: 'موعدش امروز است', dueTomorrow: 'موعدش فرداست', dueOn: 'موعد {date}', overdue: 'عقب‌افتاده', dToday: 'امروز', dTomorrow: 'فردا', dWeek: 'یک هفته بعد',
      nextSave: 'ذخیره', nextDone: 'علامت‌گذاری گام بعدی به‌عنوان انجام‌شده', nextSaved: 'گام بعدی ذخیره شد.', nextCleared: 'گام بعدی پاک شد.', nextDoneT: 'انجام شد: {text}', nextNeed: 'گام بعدی را بنویسید یا تاریخی انتخاب کنید.',
      'ev.next': 'گام بعدی: {text}', 'ev.nextDue': 'موعد {date}', 'ev.nextClear': 'گام بعدی پاک شد', 'col.due': 'گام بعدی', sortDue: 'نزدیک‌ترین موعد',
      lostWhy: 'چرا به نتیجه نرسید؟', 'lost.budget': 'بودجه', 'lost.timing': 'زمان‌بندی', 'lost.competitor': 'استودیوی دیگری را انتخاب کردند', 'lost.silent': 'دیگر پاسخ ندادند',
      'lost.fit': 'مناسب ما نبود', 'lost.scope': 'پروژه لغو شد', 'lost.other': 'دلیل دیگر…', lostReasonL: 'دلیل', lostAdd: 'افزودن دلیل', lostChange: 'تغییر دلیل',
      lostSaved: 'دلیل ذخیره شد: {reason}.', 'ev.lost': 'دلیل: {text}',
      tpls: 'قالب‌های پاسخ', tplsEdit: 'ویرایش قالب‌های پاسخ…', tplPick: 'پاسخ با قالب', tplEmail: 'با ایمیل', tplWa: 'در واتس‌اپ',
      tplName: 'نام قالب', tplSubject: 'موضوع', tplBody: 'متن ایمیل', tplWaL: 'پیام واتس‌اپ', tplVarsL: 'درج', tplInsert: 'درج {v}',
      tplHint: 'متغیرها از روی درخواست پر می‌شوند. سطری که {company}، {services} یا {swells} آن خالی باشد از ایمیل حذف می‌شود.',
      tplNew: 'قالب تازه', tplDel: 'حذف قالب', tplDeleted: 'قالب «{name}» حذف شد.', tplFirst: 'استفاده برای پاسخ', tplIsFirst: 'دکمهٔ «پاسخ با ایمیل» از این قالب استفاده می‌کند.',
      tplReset: 'بازگرداندن قالب‌های آغازین', tplResetDone: 'قالب‌های آغازین بازگردانده شد.', tplUntitled: 'بی‌نام',
      'tpl.first': 'پاسخ نخست', 'tpl.follow': 'پیگیری', 'tpl.decline': 'پاسخ منفی محترمانه',
      attr: 'چطور پیدایتان کردند', 'attr.channel': 'کانال', 'attr.ref': 'آمده از', 'attr.campaign': 'کمپین', 'attr.landing': 'نخستین صفحه', budget: 'بودجهٔ آن‌ها',
      'f.channel': 'کانال', 'f.campaign': 'کمپین',
      'ch.direct': 'مستقیم', 'ch.search': 'جست‌وجو', 'ch.instagram': 'اینستاگرام', 'ch.linkedin': 'لینکدین', 'ch.whatsapp': 'واتس‌اپ', 'ch.email': 'ایمیل', 'ch.x': 'ایکس',
      'ch.social': 'شبکه‌های اجتماعی دیگر', 'ch.referral': 'وب‌سایت دیگر', 'ch.none': 'ثبت نشده',
      rep: 'درخواست‌ها از کجا می‌آیند', repMenu: 'درخواست‌ها از کجا می‌آیند…', repBy: 'گروه‌بندی بر اساس', 'rep.briefs': 'درخواست‌ها', 'rep.open': 'باز', 'rep.pipe': 'در جریان فروش',
      'rep.wonValue': 'ارزش قراردادها', 'rep.rate': 'نرخ موفقیت', 'rep.total': 'همه', 'rep.cap': 'درخواست‌ها، جریان فروش و ارزش قراردادها بر اساس {by}',
      'rep.note': 'نرخ موفقیت فقط از درخواست‌های بسته‌شده (موفق یا ناموفق) حساب می‌شود. ارزش‌ها به ریال قطر است. درخواست‌های بایگانی‌شده جزو درخواست‌ها شمرده می‌شوند، نه جزو بازها.', 'rep.empty': 'هنوز درخواستی برای شمردن نیست.', 'rep.sample': 'تا وقتی دادهٔ نمونه روشن است، درخواست‌های نمونه هم شمرده می‌شوند.',
      wonStrip: 'قراردادهای {n} روز گذشته', wonTop: 'بیشترین ارزش از: {source}، {value}', bySource: 'بر اساس منبع',
      trash: 'حذف‌شده‌های اخیر', trashN: 'حذف‌شده‌های اخیر ({n})', trashText: 'درخواست‌های حذف‌شده {n} روز اینجا می‌مانند و بعد برای همیشه پاک می‌شوند. درخواستی که از سایت آمده و حذف شده، خودبه‌خود برنمی‌گردد.',
      restore: 'بازگرداندن', purge: 'حذف برای همیشه', purgeAll: 'خالی کردن حذف‌شده‌ها', purgeQ: '«{name}» برای همیشه حذف شود؟',
      purgeAllQ: '{n} درخواست برای همیشه حذف شود؟', purgeText: 'این کار برگشت‌پذیر نیست.',
      restoredOne: '«{name}» بازگردانده شد.', purgedOne: '«{name}» برای همیشه حذف شد.', purgedN: '{n} درخواست برای همیشه حذف شد.',
      deletedAgo: 'حذف‌شده {ago}', goneIn: '{d} دیگر برای همیشه پاک می‌شود', trashEmpty: 'در {n} روز گذشته چیزی حذف نشده.', backInbox: 'بازگشت به صندوق ورودی',
      how: 'چطور همهٔ درخواست‌ها را دریافت کنید', howTitle: 'دریافت خودکار درخواست‌ها',
      'how.mailto': '<b>اکنون</b> دکمهٔ ارسالِ سایت برنامهٔ ایمیل بازدیدکننده را باز می‌کند و هر درخواست به‌صورت ایمیل به {email} می‌رسد.',
      'how.endpoint': '<b>اکنون</b> سایت هر درخواست را همراه با منبع بازدید به سرویس فرم شما ({host}) می‌فرستد.',
      'how.limit': 'این پنل یک صفحهٔ ایستا و بدون سرور است و نمی‌تواند خودش درخواست‌ها را از سرویس فرم یا از مرورگر دیگران بگیرد. فقط درخواست‌هایی که از همین مرورگر فرستاده شوند خودکار اینجا می‌آیند که برای آزمودن فرم مفید است.',
      'how.s1': '<b>تحویل فرم را راه بیندازید.</b> نشانی سرویس فرم خود (Formspree، Basin، Getform…) را در تنظیمات › تحویل فرم بگذارید تا همهٔ درخواست‌ها همراه با منبع بازدید در یک جا جمع شوند.',
      'how.s2': '<b>درخواست‌ها را اینجا بیاورید.</b> از آن سرویس خروجی CSV بگیرید و واردش کنید (بیشتر › وارد کردن درخواست‌ها). درخواست‌هایی که با همان ایمیل اینجا هستند کنار گذاشته می‌شوند.',
      'how.s3': '<b>شمارهٔ تلفن بخواهید.</b> فیلدهای اختیاری تلفن و بودجه در فرم به شما امکان می‌دهند در واتس‌اپ پاسخ دهید و ببینید مشتری چقدر می‌خواهد خرج کند. تلفن: {phone} · بودجه: {budget}.',
      'how.on': 'روشن', 'how.off': 'خاموش', 'how.open': 'باز کردن تحویل فرم', 'how.import': 'وارد کردن فایل CSV',
      'notify.due': 'موعد پیگیری رسید: {name}', 'notify.snooze': 'تعویق تمام شد: {name}',
    }),
  });

  /* ================= state ================= */
  const LIMIT = 150; // list and table rows drawn at once ("Show more" adds the next batch)
  const S = { mounted: false, root: null, els: {}, view: 'list', f: null, openId: null, cursor: null, sel: new Set(), keep: new Set(),
    drafts: {}, drawer: null, quiet: false, pending: false, full: false, after: [], drag: null, refocus: null, reveal: false, want: null, last: null, limit: LIMIT, team: false };
  const store = { get: (k, d) => MA.db.get('inbox.' + k, d), set: (k, v) => MA.db.set('inbox.' + k, v), del: k => MA.db.del('inbox.' + k) };
  const VIEWS = ['list', 'board', 'table'];
  const TABS = ['reply', 'due', 'open', 'starred', 'won', 'lost', 'archived'];
  const FK = ['stage', 'swell', 'service', 'word', 'source', 'channel', 'campaign', 'owner', 'lang', 'tag'];
  const STAGE_ICON = { new: 'inbox', call: 'phone', proposal: 'file', negotiating: 'chat', won: 'star', lost: 'close' };
  const EV_ICON = { created: 'inbox', stage: 'flag', assign: 'user', archive: 'archive', unarchive: 'inbox', snooze: 'clock', contact: 'reply', value: 'tag', next: 'calendar', lost: 'close' };
  const TINT = { tide: 'var(--tide)', flare: 'var(--flare)', deep: 'var(--ink)', foam: 'var(--foam)', shore: 'var(--bg2)' };
  const DEF_COLS = ['company', 'stage', 'due', 'swells', 'value', 'days', 'owner', 'at'];
  const LOST = ['budget', 'timing', 'competitor', 'silent', 'fit', 'scope'];
  const CHANNELS = ['instagram', 'linkedin', 'whatsapp', 'search', 'email', 'x', 'social', 'referral', 'direct'];
  const TRASH_DAYS = 30;

  /* ================= helpers ================= */
  const canEdit = () => MA.can('leads.edit');
  const now = () => Date.now();
  const ts = d => (d ? Date.parse(d) : 0) || 0;
  const isSnoozed = l => !!l.snoozeUntil && ts(l.snoozeUntil) > now();
  const isClosed = l => !!L.stage(l.stage).closed;
  const needsReply = l => !l.archived && !isClosed(l) && (!l.read || (l.stage === 'new' && !l.lastContact && now() - ts(l.at) > DAY));
  const daysIn = l => Math.max(0, Math.floor((now() - ts(l.stageAt || l.at)) / DAY));
  const isLate = l => { const s = L.stage(l.stage); return !s.closed && s.target != null && daysIn(l) > s.target; };
  const swells = () => MA.content.draft?.swells || [];
  // site copy exists in English and Arabic only: Arabic for an Arabic admin, English otherwise (ADMIN.md rule 3)
  const cl = () => MA.siteLang();
  // language of parts (WCAG 3.1.2): visitor text is detected, site copy is in the language shown
  const vAttrs = (s, extra) => ({ dir: 'auto', lang: MA.langOf(s), ...extra });
  const sAttrs = (lang = cl(), extra) => ({ dir: 'auto', lang, ...extra });
  const swellName = (id, lang = cl()) => L.waveLabel(id, lang);
  // how a reply names a swell: English uses the site's noun ("your brand"); the Arabic nouns carry a singular "your" (هويتك),
  // so Arabic replies use the service name and stay in the polite plural
  const SWELL_WORD = { en: 'noun', ar: 'service' };
  const swellWord = (id, lang) => { const s = swells().find(x => x.id === id); return s ? MA.strip(s[lang]?.[SWELL_WORD[lang]] || s[lang]?.service || s.en.service) : id; };
  const swellTint = id => TINT[swells().find(s => s.id === id)?.tint?.[0]] || 'var(--ink4)';
  // services (content.services): grouped 0–3 like the site's Services list, which paints the groups tide, flare, foam, deep
  const services = () => MA.content.draft?.services || [];
  const svcOf = id => services().find(x => x.id === id);
  const svcName = (id, lang = cl()) => { const s = svcOf(id); return s ? MA.strip(s[lang]?.name || s.en?.name || id) : id; };
  const GROUP_TINT = ['var(--tide)', 'var(--flare)', 'var(--foam)', 'var(--ink)'];
  const svcTint = id => { const s = svcOf(id); return s ? GROUP_TINT[+s.group] || 'var(--ink4)' : 'var(--ink4)'; };
  const svcGroup = id => { const s = svcOf(id); return s ? MA.strip(MA.content.draft?.sgroups?.[cl()]?.[+s.group]?.name || MA.content.draft?.sgroups?.en?.[+s.group]?.name || '') : ''; };
  // words caught in "What we make" arrive in the visitor's language; compare them case-insensitively
  const wordKey = w => String(w || '').trim().toLowerCase().replace(/[\s,]+/g, ' ');
  const wordsOf = l => [...new Set((l.words || []).map(wordKey).filter(Boolean))];
  const stageName = id => MA.L(L.stage(id));
  const sourceName = id => MA.L(L.source(id));
  const ownerName = id => !id ? t('unassigned') : (MA.team.get(id)?.name || t('formerMember'));
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
  const display = l => l.name || l.email || l.company || '—';
  const hasVal = v => v != null && v !== '' && isFinite(+v);
  const langName = lang => lang === 'ar' ? t('langAr') : t('langEn');
  const SEP = { en: ', ', ar: '، ', fa: '، ' };
  const joinL = arr => arr.join(MA.L(SEP));
  // per-language formatting styles go through MA.L (never a lang === 'ar' branch), so Persian gets its own
  const CUR = { en: 'symbol', ar: 'symbol', fa: 'name' };            // "QAR 85,000" · "85,000 ر.ق." · "۸۵٬۰۰۰ ریال قطر"
  const DAY_UNIT = { en: 'narrow', ar: 'long', fa: 'long' };         // "5d" · "5 أيام" · "۵ روز"
  const AGO = { en: 'compact', ar: 'relative', fa: 'relative' };     // "3h" · "قبل 3 ساعات" · "۳ ساعت پیش"
  const qar = (v, o = {}) => MA.num(+v, { style: 'currency', currency: 'QAR', maximumFractionDigits: 0, currencyDisplay: MA.L(CUR), ...o });
  const money = v => hasVal(v) ? qar(v) : '—';
  const moneyShort = v => hasVal(v) ? qar(v, { notation: 'compact', maximumFractionDigits: 1 }) : '';
  const daysLabel = n => n === 0 ? t('lessDay') : MA.num(n, { style: 'unit', unit: 'day', unitDisplay: 'long' });
  const daysShort = n => n === 0 ? t('dZero') : MA.num(n, { style: 'unit', unit: 'day', unitDisplay: MA.L(DAY_UNIT) });
  const ago = d => {
    const s = Math.max(0, (now() - ts(d)) / 1000);
    if (s >= 7 * 86400) return MA.date(d, { day: 'numeric', month: 'short' });
    if (MA.L(AGO) !== 'compact') return MA.ago(d);
    if (s < 60) return t('now');
    const [n, unit] = s < 3600 ? [Math.round(s / 60), 'minute'] : s < 86400 ? [Math.round(s / 3600), 'hour'] : [Math.round(s / 86400), 'day'];
    return MA.num(n, { style: 'unit', unit, unitDisplay: 'narrow' });
  };
  const qDate = (d, o = {}) => MA.date(d, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Qatar', ...o });
  const qTime = d => MA.date(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Qatar' });
  const whenFmt = d => MA.date(d, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Qatar' });
  const fullWhen = d => `${qDate(d)}, ${qTime(d)}`;
  const qWeekday = ds => new Date(ds + 'T12:00:00Z').getUTCDay();
  const addDays = (ds, n) => MA.qDay(Date.parse(ds + 'T12:00:00Z') + n * DAY);
  const atQatar = (ds, hm = '09:00') => new Date(`${ds}T${hm}:00+03:00`);
  // follow-ups: lead.nextStep (text) and lead.due ('YYYY-MM-DD', a day in the studio's time zone)
  const today = () => MA.qDay(now());
  const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
  const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / DAY);
  const hasNext = l => !!(l.nextStep || isDay(l.due));
  const dueIn = l => isDay(l.due) ? dayDiff(today(), l.due) : null;
  const isDue = l => !l.archived && !isClosed(l) && isDay(l.due) && l.due <= today();
  const dayFmt = (ds, o = {}) => MA.date(ds + 'T12:00:00Z', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC', ...o });
  const dueText = l => { const d = dueIn(l); return d == null ? '' : d < 0 ? t('overdue') : d === 0 ? t('dueToday') : d === 1 ? t('dueTomorrow') : t('dueOn', { date: dayFmt(l.due) }); };
  const lostLabel = r => LOST.includes(r) ? t('lost.' + r) : String(r || '');
  // attribution (site briefs carry ref + utm since the 13 Oct site contract; CSV imports may carry them as text)
  function utmOf(l) {
    const u = l.utm, out = { source: '', medium: '', campaign: '' };
    if (MA.isObj(u)) return { source: String(u.source || ''), medium: String(u.medium || ''), campaign: String(u.campaign || '') };
    const s = String(u || '').trim(); if (!s) return out;
    if (!s.includes('=')) return { ...out, campaign: s };
    s.split(/[;&]/).forEach(p => { const [k, v] = p.split('='); const key = String(k || '').trim().replace(/^utm_/, ''); if (key in out && v) out[key] = v.trim(); });
    return out;
  }
  const campaignOf = l => utmOf(l).campaign;
  const channelOf = l => { if (l.channel) return l.channel; const u = utmOf(l); return l.ref || u.source || u.medium ? L.channelOf({ ref: l.ref, utm: u }) : ''; };
  const channelName = c => t('ch.' + (CHANNELS.includes(c) ? c : 'none'));
  const budgets = lang => String(MA.content.draft?.ui?.[lang]?.budgets || '').split('|').map(s => s.trim());
  /** The budget a visitor picked, shown in the site language when it is one of the site's ranges. → {text, lang} | null */
  function budgetOf(l) {
    const b = l.budget; if (b == null || b === '') return null;
    if (typeof b === 'number') return { text: qar(b), lang: null };
    const i = budgets('en').indexOf(String(b).trim()), loc = budgets(cl())[i];
    return i >= 0 && loc ? { text: loc, lang: cl() } : { text: String(b), lang: MA.langOf(b) };
  }
  // the team is real only once a second real (non-sample) person exists: until then nothing offers to assign
  const teamOn = () => MA.team.raw().filter(m => !m.sample).length > 1;
  function snoozePresets() {
    const td = MA.qDay(now()), toSun = (7 - qWeekday(td)) % 7 || 7;
    return [
      { id: 'later', label: t('snLater'), at: new Date(now() + 3 * HOUR) },
      { id: 'tomorrow', label: t('snTomorrow', { time: qTime(atQatar(td)) }), at: atQatar(addDays(td, 1)) },
      { id: 'sunday', label: t('snSunday', { time: qTime(atQatar(td)) }), at: atQatar(addDays(td, toSun)) },
    ];
  }
  const allTags = () => [...new Set(L.all().flatMap(l => l.tags || []))].sort((a, b) => a.localeCompare(b));
  const leadsOf = ids => [].concat(ids).map(id => L.get(id)).filter(Boolean);
  const snap = (l, keys) => ({ id: l.id, patch: Object.fromEntries(keys.map(k => [k, MA.clone(l[k] ?? null)])) });
  const unsnap = snaps => snaps.forEach(s => { if (L.get(s.id)) L.update(s.id, s.patch); });
  const rankKey = l => typeof l.rank === 'number' ? l.rank : -ts(l.at);
  const colLeads = (list, stage) => list.filter(l => l.stage === stage).sort((a, b) => rankKey(a) - rankKey(b));
  const collapsedCols = () => { const c = store.get('collapsed', ['lost']); return Array.isArray(c) ? c : ['lost']; };
  const isTrash = () => S.f?.tab === 'deleted';

  /* ================= filters (URL) ================= */
  function readF(query) {
    const tab = query.get('tab');
    const f = { tab: TABS.includes(tab) || tab === 'deleted' ? tab : 'reply', q: query.get('q') || '', min: query.get('min') || '', max: query.get('max') || '', snoozed: query.get('snoozed') === '1' };
    FK.forEach(k => { f[k] = (query.get(k) || '').split(',').map(s => s.trim()).filter(Boolean); });
    return f;
  }
  function fQuery(f) {
    const o = { tab: f.tab === 'reply' ? null : f.tab, q: f.q || null, min: f.min || null, max: f.max || null, snoozed: f.snoozed ? '1' : null };
    FK.forEach(k => { o[k] = f[k].length ? f[k].join(',') : null; });
    return o;
  }
  function fString(f) { const q = fQuery(f), p = new URLSearchParams(); for (const k of ['tab', ...FK, 'min', 'max', 'snoozed', 'q']) if (q[k] != null) p.set(k, q[k]); return p.toString(); }
  const hasFilters = f => !!(f.q || f.min || f.max || FK.some(k => f[k].length));
  const syncUrl = () => MA.setQuery(fQuery(S.f));
  const baseHash = () => { const q = fString(S.f); return '#/inbox' + (q ? '?' + q : ''); };
  function match(l, f, skip) {
    if (skip !== 'stage' && f.stage.length && !f.stage.includes(l.stage)) return false;
    if (skip !== 'swell' && f.swell.length && !(l.waves || []).some(w => f.swell.includes(w))) return false;
    if (skip !== 'service' && f.service.length && !(l.services || []).some(x => f.service.includes(x))) return false;
    if (skip !== 'word' && f.word.length && !wordsOf(l).some(x => f.word.includes(x))) return false;
    if (skip !== 'source' && f.source.length && !f.source.includes(l.source)) return false;
    if (skip !== 'channel' && f.channel.length && !f.channel.includes(channelOf(l) || 'none')) return false;
    if (skip !== 'campaign' && f.campaign.length && !f.campaign.includes(campaignOf(l) || 'none')) return false;
    if (skip !== 'owner' && f.owner.length && !f.owner.includes(l.owner || 'none')) return false;
    if (skip !== 'lang' && f.lang.length && !f.lang.includes(l.lang === 'ar' ? 'ar' : 'en')) return false;
    if (skip !== 'tag' && f.tag.length && !(l.tags || []).some(x => f.tag.includes(x))) return false;
    if (skip !== 'value') {
      if (f.min !== '' && !(hasVal(l.value) && +l.value >= +f.min)) return false;
      if (f.max !== '' && !(hasVal(l.value) && +l.value <= +f.max)) return false;
    }
    if (f.q) {
      // folded: Arabic and Persian letter variants, digits, case and accents don't matter
      const hay = MA.fold([l.name, l.company, l.email, l.phone, l.message, l.nextStep, campaignOf(l), ...(l.tags || []), ...(l.words || []), ...(l.services || []).flatMap(x => [svcName(x, 'en'), svcName(x, 'ar')])].join(' '));
      if (!MA.fold(f.q).split(/\s+/).filter(Boolean).every(w => hay.includes(w))) return false;
    }
    return true;
  }
  function inTab(l, tab) {
    switch (tab) {
      case 'reply': return !l.archived && needsReply(l);
      case 'due': return isDue(l);
      case 'open': return !l.archived && !isClosed(l);
      case 'starred': return !l.archived && !!l.starred;
      case 'won': return !l.archived && l.stage === 'won';
      case 'lost': return !l.archived && l.stage === 'lost';
      case 'archived': return !!l.archived;
    }
    return false;
  }
  const snoozeOk = (l, f) => (f.tab === 'archived' && S.view !== 'board') || (f.snoozed ? isSnoozed(l) : !isSnoozed(l));
  const inBase = (l, f = S.f) => S.view === 'board' ? !l.archived : inTab(l, f.tab);
  const SORTS = {
    at: l => ts(l.at), name: l => display(l).toLowerCase(), company: l => (l.company || '').toLowerCase(), stage: l => L.STAGES.findIndex(s => s.id === l.stage),
    value: l => +l.value || 0, days: l => isClosed(l) ? -1 : daysIn(l), source: l => sourceName(l.source), owner: l => ownerName(l.owner), lang: l => l.lang || 'en',
    lastContact: l => ts(l.lastContact), services: l => (l.services || []).map(x => svcName(x)).join(','), words: l => wordsOf(l).join(','), tags: l => (l.tags || []).join(','), swells: l => (l.waves || []).map(w => swellName(w)).join(','), email: l => l.email || '', phone: l => l.phone || '',
    due: l => isDay(l.due) && !isClosed(l) ? Date.parse(l.due) : Infinity,
  };
  const ASC_FIRST = ['name', 'company', 'owner', 'source', 'lang', 'tags', 'swells', 'services', 'words', 'email', 'phone', 'stage', 'due'];
  const sortState = () => { const s = store.get('sort', { key: 'at', dir: 'desc' }); return s && SORTS[s.key] ? s : { key: 'at', dir: 'desc' }; };
  function sortLeads(list) {
    const { key, dir } = sortState(), fn = SORTS[key], m = dir === 'asc' ? 1 : -1;
    return list.slice().sort((a, b) => { const x = fn(a), y = fn(b); return ((x < y ? -1 : x > y ? 1 : 0) * m) || (ts(b.at) - ts(a.at)); });
  }
  function visible() {
    const f = S.f; if (isTrash()) return [];
    return sortLeads(L.all().filter(l => (inTab(l, f.tab) || (S.keep.has(l.id) && !l.archived && f.tab !== 'archived')) && snoozeOk(l, f) && match(l, f)));
  }
  const boardLeads = () => L.all().filter(l => !l.archived && snoozeOk(l, S.f) && match(l, S.f));
  function navIds() {
    if (isTrash()) return [];
    if (S.view === 'board') { const list = boardLeads(), col = collapsedCols(); return L.STAGES.filter(s => !col.includes(s.id)).flatMap(s => colLeads(list, s.id).map(l => l.id)); }
    return visible().map(l => l.id);
  }
  function counts() {
    const all = L.all().filter(l => match(l, S.f)), c = {};
    TABS.forEach(tb => { c[tb] = all.filter(l => inTab(l, tb) && (tb === 'archived' || (S.f.snoozed ? isSnoozed(l) : !isSnoozed(l)))).length; });
    return c;
  }
  const currentList = () => S.f && !isTrash() ? (S.view === 'board' ? boardLeads() : visible()) : L.all().filter(l => !l.archived);

  /* ================= filter fields ================= */
  const FIELDS = () => [
    { k: 'stage', label: t('f.stage'), icon: 'flag', opts: () => L.STAGES.map(s => ({ v: s.id, label: MA.L(s), color: s.color })), of: l => [l.stage] },
    { k: 'swell', label: t('f.swell'), icon: 'swell', site: true, opts: () => swells().map(s => ({ v: s.id, label: swellName(s.id), color: swellTint(s.id), lang: cl() })), of: l => l.waves || [] },
    { k: 'service', label: t('f.service'), icon: 'layers', site: true, of: l => l.services || [], opts: () => {
      const known = services().map(x => ({ v: x.id, label: svcName(x.id), color: svcTint(x.id), lang: cl() }));
      const gone = [...new Set(L.all().flatMap(l => l.services || []))].filter(id => !svcOf(id)).map(id => ({ v: id, label: id, color: 'var(--ink4)' }));
      return [...known, ...gone];
    } },
    { k: 'word', label: t('f.word'), icon: 'type', of: wordsOf, opts: () => [...new Set(L.all().flatMap(wordsOf))].sort((a, b) => a.localeCompare(b)).map(w => ({ v: w, label: w, lang: MA.langOf(w) })) },
    { k: 'source', label: t('f.source'), icon: 'globe', opts: () => L.SOURCES.map(s => ({ v: s.id, label: MA.L(s), icon: s.icon })), of: l => [l.source] },
    { k: 'channel', label: t('f.channel'), icon: 'link', of: l => [channelOf(l) || 'none'], opts: () => {
      const have = new Set(L.all().map(l => channelOf(l) || 'none'));
      return [...CHANNELS, 'none'].filter(c => have.has(c)).map(c => ({ v: c, label: channelName(c) }));
    } },
    { k: 'campaign', label: t('f.campaign'), icon: 'bolt', of: l => [campaignOf(l) || 'none'], opts: () => {
      const list = [...new Set(L.all().map(campaignOf).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      return list.length ? [...list.map(v => ({ v, label: v, lang: MA.langOf(v) })), { v: 'none', label: t('ch.none') }] : [];
    } },
    { k: 'owner', label: t('f.owner'), icon: 'user', of: l => [l.owner || 'none'], opts: () => {
      const team = MA.team.all(), extra = [...new Set(L.all().map(l => l.owner).filter(id => id && !team.some(m => m.id === id)))];
      return [{ v: 'none', label: t('unassigned') }, ...team.map(m => ({ v: m.id, label: m.name })), ...extra.map(id => ({ v: id, label: ownerName(id) }))];
    } },
    { k: 'lang', label: t('f.lang'), icon: 'language', opts: () => [{ v: 'en', label: langName('en') }, { v: 'ar', label: langName('ar') }], of: l => [l.lang === 'ar' ? 'ar' : 'en'] },
    { k: 'tag', label: t('f.tag'), icon: 'tag', opts: () => allTags().map(x => ({ v: x, label: x, lang: MA.langOf(x) })), of: l => l.tags || [] },
    { k: 'value', label: t('f.value'), icon: 'target', range: true },
  ];

  /* ================= small components ================= */
  const stagePill = id => h('span.ib-stage', { style: `--sc:${L.stage(id).color}` }, h('i'), stageName(id));
  function daysChip(l) {
    if (isClosed(l)) return null;
    const late = isLate(l), d = daysIn(l), st = L.stage(l.stage);
    return h('span', { class: 'ib-days' + (late ? ' late' : ''), title: t('inStage', { d: daysLabel(d) }) + (late ? ' · ' + t('pastTarget', { d: daysLabel(st.target) }) : '') }, daysShort(d));
  }
  /** "Due today" / "Overdue" / "Due Thu 16 Oct" for an open brief with a next step date. */
  function dueChip(l) {
    if (!isDay(l.due) || isClosed(l) || l.archived) return null;
    const d = dueIn(l);
    return h('span', { class: 'ib-due' + (d < 0 ? ' late' : d === 0 ? ' today' : ''), title: [l.nextStep, dayFmt(l.due, { year: 'numeric' })].filter(Boolean).join(' · ') }, MA.frag(MA.icon('calendar', 'sm')), h('span', dueText(l)));
  }
  const lostChip = l => l.stage === 'lost' && l.lostReason ? h('span.ib-lostr', LOST.includes(l.lostReason) ? {} : vAttrs(l.lostReason), lostLabel(l.lostReason)) : null;
  function swellChips(waves, max = 9) {
    const box = h('span.ib-sws'), list = waves || [];
    list.slice(0, max).forEach(w => box.append(h('span.ib-sw', { style: `--sc:${swellTint(w)}` }, h('i'), h('span', sAttrs(), swellName(w)))));
    if (list.length > max) box.append(h('span.ib-sw.more', '+' + MA.num(list.length - max)));
    return box;
  }
  function svcChips(ids, max = 99) {
    const box = h('span.ib-sws.ib-svcs'), list = ids || [];
    list.slice(0, max).forEach(id => box.append(h('span', { class: 'ib-sw ib-svc' + (svcOf(id) ? '' : ' gone'), dataset: { svc: id }, style: `--sc:${svcTint(id)}`, title: svcOf(id) ? svcGroup(id) : t('svcGone') }, h('i'), h('span', svcOf(id) ? sAttrs() : vAttrs(id), svcName(id)))));
    if (list.length > max) box.append(h('span.ib-sw.more', '+' + MA.num(list.length - max)));
    return box;
  }
  const langBadge = lang => h('span.badge.outline.ib-lang', { title: langName(lang), 'aria-label': langName(lang) }, lang === 'ar' ? 'AR' : 'EN');
  const avatarOf = (id, size = 'sm') => { const m = id && MA.team.get(id); return m ? ui.avatar(m, size) : null; };
  const starIcon = () => h('span.ib-staricon', { html: MA.icon('star', 'sm'), title: t('star') });
  // screen-reader-only facts the dots and dotted edges show visually
  const srFacts = l => [!l.read ? t('unread') : '', l.sample ? t('sampleRow') : ''].filter(Boolean).join(', ');

  /* ================= reply templates (MA.db 'inbox.templates'; starters until edited) ================= */
  // Client-facing copy stays in the brief's language. Arabic addresses the client in the polite plural (طلبكم، تفكّرون، أخبرونا).
  const VARS = ['name', 'company', 'services', 'swells', 'me', 'studioEmail'];
  const DROP = ['company', 'services', 'swells'];          // a body line whose variable is empty is left out
  const NAME_FALLBACK = { en: 'there', ar: '' }, ME_FALLBACK = { en: 'The MIRAS team', ar: 'فريق ميراس' };
  const SIGN = { en: 'Warm regards,\n{me}\nMIRAS · Lusail, Qatar\n{studioEmail}', ar: 'مع أطيب التحيات،\n{me}\nميراس · لوسيل، قطر\n{studioEmail}' };
  const STARTERS = () => [
    { id: 'first', nameKey: 'first',
      en: { subject: 'Your brief for MIRAS · {company}',
        body: `Hi {name},\n\nThank you for sending us your brief. We’ve read it closely, and we’d love to hear more about what you have in mind.\n\nYou wrote to us about {swells}.\nWe’ve noted the services you picked: {services}.\n\nWould a 20-minute call this week suit you? Reply with a time that works and we’ll send an invite.\n\n${SIGN.en}`,
        wa: 'Hi {name}, this is {me} from MIRAS. Thank you for your brief. Is today a good time to talk?' },
      ar: { subject: 'طلبكم لدى ميراس · {company}',
        body: `مرحباً {name}،\n\nشكراً لإرسال طلبكم. قرأناه باهتمام، ويسعدنا أن نعرف المزيد عمّا تفكّرون فيه.\n\nكتبتم إلينا بخصوص {swells}.\nودوّنّا الخدمات التي اخترتموها: {services}.\n\nهل تناسبكم مكالمة قصيرة مدتها 20 دقيقة هذا الأسبوع؟ أخبرونا بالوقت المناسب لكم، وسنرسل إليكم دعوة.\n\n${SIGN.ar}`,
        wa: 'مرحباً {name}، معكم {me} من ميراس. شكراً لطلبكم. هل يناسبكم أن نتحدث اليوم؟' } },
    { id: 'follow', nameKey: 'follow',
      en: { subject: 'Following up on your brief · {company}',
        body: `Hi {name},\n\nJust following up on the brief you sent us. We’re still keen to help, and happy to work around your schedule.\n\nWould a short call this week or next suit you? If the timing has changed, a quick reply to let us know is perfect.\n\n${SIGN.en}`,
        wa: 'Hi {name}, {me} from MIRAS again. Just checking in on your brief. Would a short call this week suit you?' },
      ar: { subject: 'متابعة طلبكم · {company}',
        body: `مرحباً {name}،\n\nنودّ متابعة الطلب الذي أرسلتموه إلينا. ما زلنا متحمّسين للعمل معكم، ويسعدنا أن نرتّب الوقت بما يناسبكم.\n\nهل تناسبكم مكالمة قصيرة هذا الأسبوع أو الأسبوع المقبل؟ وإن تغيّر التوقيت لديكم، يكفينا ردّ سريع لنعرف.\n\n${SIGN.ar}`,
        wa: 'مرحباً {name}، معكم {me} من ميراس مرة أخرى. نودّ متابعة طلبكم، فهل تناسبكم مكالمة قصيرة هذا الأسبوع؟' } },
    { id: 'decline', nameKey: 'decline',
      en: { subject: 'About your brief · {company}',
        body: `Hi {name},\n\nThank you for thinking of MIRAS. We’ve looked at your brief carefully, and we don’t think we’re the right studio for it at the moment.\n\nWe’d rather tell you now than slow you down. If your plans change, or something new comes up, we’d be glad to hear from you again.\n\n${SIGN.en}`,
        wa: 'Hi {name}, {me} from MIRAS. Thank you for your brief. We don’t think we’re the right fit for it right now, but we’d be glad to hear from you again.' },
      ar: { subject: 'بخصوص طلبكم · {company}',
        body: `مرحباً {name}،\n\nشكراً لتفكيركم في ميراس. اطّلعنا على طلبكم بعناية، ونرى أننا لسنا الاستوديو الأنسب له في الوقت الحالي.\n\nفضّلنا أن نخبركم الآن حتى لا نؤخّركم. وإن تغيّرت خططكم أو استجدّ أمر آخر، يسعدنا أن نسمع منكم مجدداً.\n\n${SIGN.ar}`,
        wa: 'مرحباً {name}، معكم {me} من ميراس. شكراً لطلبكم. نرى أننا لسنا الأنسب له حالياً، ويسعدنا أن نسمع منكم مجدداً.' } },
  ];
  /** [{ id, nameKey?, name?, en:{subject, body, wa}, ar:{…} }]: the first one is what "Reply by email" uses. */
  function templates() { const s = store.get('templates', null); return Array.isArray(s) && s.length ? s : STARTERS(); }
  const tplName = tp => tp.name || (tp.nameKey ? t('tpl.' + tp.nameKey) : t('tplUntitled'));
  const joinList = (arr, lang) => arr.length < 2 ? (arr[0] || '') : lang === 'ar' ? arr.slice(0, -1).join('، ') + ' و' + arr.at(-1) : arr.slice(0, -1).join(', ') + ' and ' + arr.at(-1);
  function tplVars(l, lang) {
    const studio = MA.content.draft?.studio || {}, meM = MA.team.me();
    return { name: firstName(l.name) || NAME_FALLBACK[lang], company: l.company || '', me: (meM && meM.name) || ME_FALLBACK[lang],
      swells: joinList((l.waves || []).map(w => swellWord(w, lang)).filter(Boolean), lang),
      services: joinList((l.services || []).map(x => svcName(x, lang)).filter(Boolean), lang),
      studioEmail: studio.email || MA.content.defaults?.studio?.email || '' };
  }
  /** Fill a template text. lines: drop a line whose {company}/{services}/{swells} is empty (the email body). */
  function fillTpl(text, vars, { lines = false } = {}) {
    let s = String(text || '');
    if (lines) s = s.split('\n').filter(line => !DROP.some(k => line.includes('{' + k + '}') && !vars[k])).join('\n');
    s = s.replace(/\{(\w+)\}/g, (m, k) => k in vars ? vars[k] : m);
    // tidy what an empty value leaves behind: "Hi ," · "مرحباً ،" · "Your brief · "
    s = s.split('\n').map(x => x.replace(/[ \t]+([,.،؛:!?؟])/g, '$1').replace(/\s*·\s*$/, '').replace(/^\s*·\s*/, '').replace(/ {2,}/g, ' ').trimEnd()).join('\n');
    return s.replace(/\n{3,}/g, '\n\n').trim();
  }
  /** → { subject, body, wa, id, lang } for the brief, in its own language (template `id`, or the first one). */
  function replyParts(l, id) {
    const lang = l.lang === 'ar' ? 'ar' : 'en', list = templates(), tp = list.find(x => x.id === id) || list[0];
    const own = tp[lang], c = own && (own.subject || own.body || own.wa) ? own : tp.en || {}, cLang = c === own ? lang : 'en', v = tplVars(l, cLang);
    return { subject: fillTpl(c.subject, v), body: fillTpl(c.body, v, { lines: true }), wa: fillTpl(c.wa, v), id: tp.id, lang: cLang };
  }
  const mailtoOf = (l, id) => { const p = replyParts(l, id); return `mailto:${encodeURIComponent(l.email || '').replace(/%40/g, '@')}?subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(p.body)}`; };
  function waOf(l, id) {
    let d = String(l.phone || '').replace(/[^\d+]/g, ''); if (!d) return null;
    d = d.replace(/^\+/, '').replace(/^00/, ''); if (d.length === 8) d = '974' + d;
    return d.length >= 8 ? `https://wa.me/${d}?text=${encodeURIComponent(replyParts(l, id).wa)}` : null;
  }
  function briefText(l) {
    const u = utmOf(l), ch = channelOf(l), b = budgetOf(l);
    return [[l.name, l.company].filter(Boolean).join(' · '), [l.email, l.phone].filter(Boolean).join(' · '),
      `${t('hl.swells')}: ${joinL((l.waves || []).map(w => swellName(w))) || '—'}`, `${t('hl.value')}: ${money(l.value)}`,
      b ? `${t('budget')}: ${b.text}` : null,
      `${t('hl.stage')}: ${stageName(l.stage)}${isClosed(l) ? '' : ` (${daysLabel(daysIn(l))})`}`, `${t('hl.source')}: ${sourceName(l.source)} · ${t('hl.received')}: ${fullWhen(l.at)}`,
      ch ? `${t('attr.channel')}: ${channelName(ch)}${u.campaign ? ' · ' + u.campaign : ''}` : null,
      hasNext(l) ? `${t('next')}: ${[l.nextStep, isDay(l.due) ? dayFmt(l.due) : ''].filter(Boolean).join(' · ')}` : null,
      (l.services || []).length ? `${t('services')}: ${joinL(l.services.map(x => svcName(x)))}` : null,
      (l.words || []).length ? `${t('words')}: ${joinL(l.words)}` : null,
    ].filter(Boolean).join('\n') + (l.message ? '\n\n' + l.message : '');
  }
  function reply(l, id) {
    if (!l) return;
    if (!l.email) { MA.toast(t('noEmail'), { tone: 'bad' }); return; }
    const a = h('a', { href: mailtoOf(l, id), style: 'display:none' }); document.body.append(a); a.click(); a.remove(); afterReply(l.id);
  }
  function afterReply(id) { if (canEdit()) setTimeout(() => MA.toast(t('draftOpened'), { icon: 'mail', ms: 8000, action: { label: t('logReply'), run: () => logContact(id) } }), 250); }
  function tplMenu(anchor, l) {
    const list = templates(), items = [], wa = !!waOf(l);
    if (l.email) items.push({ heading: t('tplEmail') }, ...list.map(tp => ({ label: tplName(tp), icon: 'mail', href: mailtoOf(l, tp.id), run: () => afterReply(l.id) })));
    if (wa) items.push(...(items.length ? ['-'] : []), { heading: t('tplWa') }, ...list.map(tp => ({ label: tplName(tp), icon: 'whatsapp', href: waOf(l, tp.id), target: '_blank' })));
    if (canEdit()) items.push(...(items.length ? ['-'] : []), { label: t('tplsEdit'), icon: 'edit', run: () => tplEditor() });
    ui.menu(anchor, items, { label: t('tplPick') });
  }
  function tplEditor() {
    if (!canEdit()) return null;
    let list = MA.clone(templates()), cur = list[0]?.id, lastField = null;
    const saveNow = () => store.set('templates', list), save = MA.debounce(saveNow, 250);
    const host = h('div.m-inbox.ib-tpl');
    function insertVar(v) {
      const f = lastField; if (!f?.isConnected) return;
      const tok = `{${v}}`, a = f.selectionStart ?? f.value.length, b = f.selectionEnd ?? a;
      f.setRangeText(tok, a, b, 'end'); f.dispatchEvent(new Event('input', { bubbles: true })); f.focus();
    }
    function draw(focusSel) {
      const tp = list.find(x => x.id === cur) || list[0]; cur = tp.id;
      const idx = list.indexOf(tp), panel = h('div.ib-tpl-panel');
      const tabs = ui.tabs(list.map(x => ({ value: x.id, label: tplName(x) })), cur, v => { cur = v; draw('[role=tab][aria-selected=true]'); }, { label: t('tpls'), panel });
      const name = h('input.input', { maxLength: 60, dataset: { k: 'tplname' } }); name.value = tplName(tp);
      name.addEventListener('input', () => {
        const v = name.value.trim();
        if (tp.nameKey && (!v || v === t('tpl.' + tp.nameKey))) delete tp.name; else tp.name = v;
        const tb = tabs.querySelector('[role=tab][aria-selected=true]'); if (tb) tb.textContent = tplName(tp);
        save();
      });
      const col = lg => {
        const c = tp[lg] ||= { subject: '', body: '', wa: '' }, ln = `<span class="sr-only"> (${esc(langName(lg))})</span>`;
        const mk = (k, rows) => {
          const el = h(rows ? 'textarea.textarea' : 'input.input', { lang: lg, dir: lg === 'ar' ? 'rtl' : 'ltr', rows: rows || null, dataset: { k: `tpl-${lg}-${k}` } });
          el.value = c[k] || ''; el.addEventListener('input', () => { c[k] = el.value; save(); }); el.addEventListener('focus', () => { lastField = el; });
          return el;
        };
        return h('div.ib-tpl-col', { dataset: { lang: lg } }, h('p.label.ib-tpl-lang', langName(lg)),
          ui.field(esc(t('tplSubject')) + ln, mk('subject')), ui.field(esc(t('tplBody')) + ln, mk('body', 11)), ui.field(esc(t('tplWaL')) + ln, mk('wa', 3)));
      };
      const vars = h('div.ib-tpl-vars', h('span.small.muted', t('tplVarsL')),
        VARS.map(v => h('button.tag.ib-var', { type: 'button', 'aria-label': t('tplInsert', { v: `{${v}}` }), dataset: { v }, onmousedown: e => e.preventDefault(), onclick: () => insertVar(v) }, h('span.ltr', `{${v}}`))));
      const del = ui.btn(t('tplDel'), { size: 'sm', kind: 'ghost', icon: 'trash', disabled: list.length < 2, onclick: () => {
        const i = list.indexOf(tp), gone = list.splice(i, 1)[0]; cur = list[Math.max(0, i - 1)].id; saveNow(); draw('[role=tab][aria-selected=true]');
        MA.toast(t('tplDeleted', { name: esc(tplName(gone)) }), { icon: 'trash', undo: () => {
          const now2 = MA.clone(templates()); now2.splice(Math.min(i, now2.length), 0, gone); store.set('templates', now2);
          if (host.isConnected) { list = now2; cur = gone.id; draw(); }
        } });
      } });
      del.dataset.k = 'tpldel';
      const first = idx === 0 ? h('span.small.muted.ib-tpl-first', t('tplIsFirst'))
        : ui.btn(t('tplFirst'), { size: 'sm', kind: 'ghost', icon: 'reply', onclick: () => { list.splice(idx, 1); list.unshift(tp); saveNow(); draw('[data-k=tplname]'); } });
      panel.append(ui.field(t('tplName'), name), h('div.ib-tpl-cols', col('en'), col('ar')), vars, h('p.hint', { html: esc(t('tplHint')).replace(/\{(\w+)\}/g, '<code class="ltr">{$1}</code>') }), h('div.ib-tpl-foot', first, h('span.grow'), del));
      const add = ui.btn(t('tplNew'), { size: 'sm', kind: 'ghost', icon: 'plus', onclick: () => {
        const n = { id: MA.uid('tpl'), name: '', en: { subject: '', body: '', wa: '' }, ar: { subject: '', body: '', wa: '' } };
        list.push(n); cur = n.id; saveNow(); draw('[data-k=tplname]');
      } });
      add.dataset.k = 'tplnew';
      host.replaceChildren(h('div.ib-tpl-bar', tabs, add), panel);
      if (focusSel) host.querySelector(focusSel)?.focus();
    }
    draw();
    const M = ui.modal({ title: esc(t('tpls')), size: 'xwide', body: host, onClose: () => { save.cancel?.(); saveNow(); },
      initial: () => host.querySelector('[role=tab][aria-selected=true]'),
      actions: [{ label: t('tplReset'), kind: 'ghost', run: () => {
        const before = MA.clone(list); list = STARTERS(); cur = list[0].id; store.del('templates'); draw('[role=tab][aria-selected=true]');
        MA.toast(t('tplResetDone'), { icon: 'refresh', undo: () => { store.set('templates', before); if (host.isConnected) { list = MA.clone(before); cur = list[0].id; draw(); } } });
        return false;
      } }, { label: MA.t('done'), kind: 'primary' }] });
    return M;
  }

  /* ================= actions (reversible ones run at once and offer Undo) ================= */
  const openHash = id => { const q = fString(S.f); return `#/inbox/${encodeURIComponent(id)}${q ? '?' + q : ''}`; };
  const want = (kind, id) => { S.want = { kind, id, at: now() }; };
  /** Open a brief. focus: 'detail' (its heading; a click or Enter) or 'row' (stay on the list; j/k and arrows). */
  function open(id, { replace = false, focus } = {}) { if (!id) return; S.cursor = id; if (focus) want(focus, id); MA.go(openHash(id), { replace }); }
  function closeOpen() { S.openId = null; MA.go(baseHash(), { replace: true }); }
  function markRead(id) { const l = L.get(id); if (l && !l.read) { if (!l.archived && S.f && inTab(l, S.f.tab)) S.keep.add(id); L.update(id, { read: true }); } }
  function nextAfter(ids) {
    const order = navIds(), set = new Set(ids); let last = -1;
    order.forEach((id, i) => { if (set.has(id)) last = Math.max(last, i); });
    if (last < 0) return null;
    for (let i = last + 1; i < order.length; i++) if (!set.has(order[i])) return order[i];
    for (let i = last - 1; i >= 0; i--) if (!set.has(order[i])) return order[i];
    return null;
  }
  /** Briefs `ids` just left the current list: move the cursor and the reading pane along. */
  function leaving(ids, next) {
    ids.forEach(id => { S.sel.delete(id); S.keep.delete(id); });
    if (ids.includes(S.cursor)) S.cursor = next;
    if (S.openId && ids.includes(S.openId)) { if (next && (S.view === 'list' || S.drawer)) open(next, { replace: true }); else closeOpen(); }
  }
  function archiveIds(ids) {
    if (!canEdit()) return; const leads = leadsOf(ids); if (!leads.length) return;
    const on = !leads.every(l => l.archived), next = nextAfter(leads.map(l => l.id)), snaps = leads.map(l => snap(l, ['archived', 'timeline']));
    leads.forEach(l => L.update(l.id, { archived: on }, { log: { type: on ? 'archive' : 'unarchive', text: '' } }));
    leaving(leads.map(l => l.id), next);
    const one = leads.length === 1, nm = esc(display(leads[0]));
    MA.toast(on ? (one ? t('archivedOne', { name: nm }) : t('archivedN', { n: MA.num(leads.length) })) : (one ? t('unarchivedOne', { name: nm }) : t('unarchivedN', { n: MA.num(leads.length) })), { icon: 'archive', undo: () => unsnap(snaps) });
  }
  function deleteIds(ids) {
    if (!canEdit()) return; const leads = leadsOf(ids); if (!leads.length) return;
    const next = nextAfter(leads.map(l => l.id)), gone = L.remove(leads.map(l => l.id)), one = leads.length === 1;
    leaving(leads.map(l => l.id), next);
    MA.activity.log({ action: 'lead.delete', target: one ? display(leads[0]) : `${leads.length}`, module: 'inbox', href: '#/inbox' });
    // to Recently deleted (30 days); a site brief stays deleted (MA.leads keeps a tombstone, so "Check for new briefs" never brings it back)
    MA.toast(one ? t('deletedOne', { name: esc(display(leads[0])) }) : t('deletedN', { n: MA.num(leads.length) }), { icon: 'trash', undo: () => L.restore(gone) });
  }
  function setStage(ids, stage, extra, { anchor } = {}) {
    if (!canEdit()) return; const leads = leadsOf(ids); if (!leads.length) return;
    const moving = leads.filter(l => l.stage !== stage), snaps = leads.map(l => snap(l, ['stage', 'stageAt', 'owner', 'timeline', 'rank']));
    if (S.openId && S.view !== 'board' && moving.some(l => l.id === S.openId)) S.keep.add(S.openId); // don't yank the brief you're reading out of the queue
    moving.forEach(l => L.move(l.id, stage));
    if (extra) leads.forEach(l => L.update(l.id, extra));
    if (!moving.length) return;
    const undo = () => unsnap(snaps), one = moving.length === 1, l = moving[0];
    if (stage === 'won') {
      const svc = l.services?.length ? svcName(l.services[0]) : l.waves?.length ? swellName(l.waves[0]) : '';
      MA.toast(one ? t('signed', { name: esc(display(l)), svc: svc ? ' · ' + esc(svc) : '' }) : t('signedN', { n: MA.num(moving.length) }), { icon: 'star', undo });
      if (S.view === 'board') S.after.push(() => ripple('won'));
    } else MA.toast(one ? t('movedOne', { name: esc(display(l)), stage: esc(stageName(stage)) }) : t('movedN', { n: MA.num(moving.length), stage: esc(stageName(stage)) }), { icon: STAGE_ICON[stage] || 'flag', undo });
    // Lost asks why, once the page has redrawn (Esc skips it)
    if (stage === 'lost') { const lostIds = moving.map(x => x.id); S.after.push(() => lostMenu(lostAnchor(anchor), lostIds)); }
  }
  const lostAnchor = a => (a?.isConnected && a) || scopeEls('.ib-detail [data-act=stage]')[0] || S.root?.querySelector('.ib-col[data-stage=lost] .ib-col-h') || S.els.search;
  function lostMenu(anchor, ids) {
    if (!canEdit() || !S.mounted || !anchor) return;
    const leads = leadsOf(ids).filter(l => l.stage === 'lost'); if (!leads.length) return;
    const cur = leads.length === 1 ? leads[0].lostReason || '' : null;
    ui.menu(anchor, [{ heading: t('lostWhy') }, ...LOST.map(r => ({ label: t('lost.' + r), checked: cur == null ? null : cur === r, run: () => setLost(ids, r) })), '-',
      { label: t('lost.other'), icon: 'edit', run: async () => { const v = await ui.prompt(t('lostWhy'), { label: t('lostReasonL'), value: cur && !LOST.includes(cur) ? cur : '' }); if (v && v.trim()) setLost(ids, v.trim().slice(0, 120)); } }], { label: t('lostWhy') });
  }
  function setLost(ids, reason) {
    if (!canEdit()) return; const leads = leadsOf(ids).filter(l => l.stage === 'lost' && l.lostReason !== reason); if (!leads.length) return;
    const snaps = leads.map(l => snap(l, ['lostReason', 'timeline']));
    leads.forEach(l => L.update(l.id, { lostReason: reason }, { log: { type: 'lost', text: reason } }));
    MA.toast(t('lostSaved', { reason: esc(lostLabel(reason)) }), { icon: 'flag', undo: () => unsnap(snaps) });
  }
  function setOwner(ids, owner) {
    if (!canEdit()) return; const leads = leadsOf(ids).filter(l => (l.owner || '') !== owner); if (!leads.length) return;
    const snaps = leads.map(l => snap(l, ['owner', 'timeline'])), one = leads.length === 1, nm = esc(display(leads[0]));
    leads.forEach(l => L.update(l.id, { owner }, { log: { type: 'assign', text: owner } }));
    MA.toast(owner ? (one ? t('assignedOne', { name: nm, owner: esc(ownerName(owner)) }) : t('assignedN', { n: MA.num(leads.length), owner: esc(ownerName(owner)) })) : (one ? t('unassignedOne', { name: nm }) : t('unassignedN', { n: MA.num(leads.length) })), { icon: 'user', undo: () => unsnap(snaps) });
  }
  function snooze(ids, at) {
    if (!canEdit()) return; const leads = leadsOf(ids); if (!leads.length) return;
    const iso = new Date(at).toISOString(), next = S.f.snoozed ? null : nextAfter(leads.map(l => l.id)), snaps = leads.map(l => snap(l, ['snoozeUntil', 'timeline']));
    leads.forEach(l => L.update(l.id, { snoozeUntil: iso }, { log: { type: 'snooze', text: iso } }));
    if (!S.f.snoozed) leaving(leads.map(l => l.id), next);
    MA.toast(leads.length === 1 ? t('snoozedOne', { when: esc(whenFmt(iso)) }) : t('snoozedN', { n: MA.num(leads.length), when: esc(whenFmt(iso)) }), { icon: 'clock', undo: () => unsnap(snaps) });
  }
  function unsnooze(ids) {
    if (!canEdit()) return; const leads = leadsOf(ids).filter(isSnoozed); if (!leads.length) return;
    const next = S.f.snoozed ? nextAfter(leads.map(l => l.id)) : null, snaps = leads.map(l => snap(l, ['snoozeUntil', 'timeline']));
    leads.forEach(l => L.update(l.id, { snoozeUntil: null }, { log: { type: 'snooze', text: '' } }));
    if (S.f.snoozed) leaving(leads.map(l => l.id), next);
    MA.toast(t('unsnoozed'), { icon: 'inbox', undo: () => unsnap(snaps) });
  }
  /** Next step + due day. done: the step happened (logged, then cleared). */
  function setNext(id, text, due, { done = false } = {}) {
    const l = L.get(id); if (!l || !canEdit()) return;
    text = String(text || '').trim().slice(0, 200); due = isDay(due) ? due : null;
    if (!done && (l.nextStep || '') === text && (isDay(l.due) ? l.due : null) === due) return;
    const snaps = [snap(l, ['nextStep', 'due', 'timeline'])];
    if (S.f && !l.archived && inTab(l, S.f.tab)) S.keep.add(id); // the brief you're working on stays put
    S.refocus = 'next';
    const log = done ? { type: 'next', text: l.nextStep || (isDay(l.due) ? dayFmt(l.due) : ''), done: true } : text || due ? { type: 'next', text, due } : { type: 'next', text: '', clear: true };
    L.update(id, { nextStep: text, due }, { log });
    MA.toast(done ? t('nextDoneT', { text: esc(log.text) }) : text || due ? t('nextSaved') : t('nextCleared'), { icon: done ? 'check' : 'calendar', undo: () => unsnap(snaps) });
  }
  function nextPop(anchor, id) {
    const l = L.get(id); if (!l || !canEdit()) return;
    const txt = h('input.input.sm', { maxLength: 200, placeholder: t('nextPh'), dir: 'auto', autocomplete: 'off' }); txt.value = l.nextStep || '';
    const date = h('input.input.sm', { type: 'date', dir: 'ltr' }); date.value = isDay(l.due) ? l.due : '';
    const err = h('p.err', { hidden: true }, t('nextNeed'));
    let P = null;
    const save = () => { const v = txt.value.trim(), d = isDay(date.value) ? date.value : null; if (!v && !d) { err.hidden = false; txt.focus(); return; } P?.close(true); setNext(id, v, d); };
    [txt, date].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }));
    const quick = h('div.ib-quick', [['dToday', 0], ['dTomorrow', 1], ['dWeek', 7]].map(([k, n]) => h('button.btn.sm.ghost', { type: 'button', dataset: { days: n }, onclick: () => { date.value = MA.addDays(today(), n); } }, t(k))));
    const box = h('div.m-inbox.ib-nextpop', ui.field(t('next'), txt), ui.field(t('dueL'), date), quick, err,
      h('div.ib-nextpop-f', hasNext(l) ? ui.btn(t('clear'), { size: 'sm', kind: 'ghost', onclick: () => { P?.close(true); setNext(id, '', null); } }) : null, h('span.grow'), ui.btn(t('nextSave'), { size: 'sm', kind: 'primary', onclick: save })));
    P = ui.pop(anchor, box, { width: 330, label: t('next') });
    return P;
  }
  function toggleStar(id) { const l = L.get(id); if (l && canEdit()) L.update(id, { starred: !l.starred }); }
  function logContact(id) { if (!canEdit() || !L.get(id)) return; L.update(id, { lastContact: new Date().toISOString(), read: true }, { log: { type: 'contact', text: 'email' } }); MA.toast(t('logged'), { icon: 'reply' }); }
  function removeTag(id, tag) {
    const l = L.get(id); if (!l || !canEdit()) return; const before = [...(l.tags || [])];
    L.update(id, { tags: before.filter(x => x !== tag) });
    MA.toast(t('tagRemoved', { tag: esc(tag) }), { icon: 'tag', undo: () => { if (L.get(id)) L.update(id, { tags: before }); } });
  }
  function toggleSel(id) { if (!id) return; if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); S.cursor = id; syncMarks(); }
  const targets = () => S.sel.size ? [...S.sel] : (S.cursor || S.openId) ? [S.cursor || S.openId] : [];

  /* ================= Recently deleted (MA.leads.trash / untrash / purge) ================= */
  function restoreTrash(ids, i) {
    if (!canEdit()) return; const back = L.untrash(ids); if (!back.length) return;
    S.refocus = 'trash-' + Math.max(0, i || 0);
    MA.toast(t('restoredOne', { name: esc(display(back[0])) }), { icon: 'undo', undo: () => L.remove(back.map(l => l.id)) });
  }
  async function purgeOne(l, i) {
    if (!canEdit()) return;
    if (!await ui.confirm(t('purgeQ', { name: esc(display(l)) }), esc(t('purgeText')), { danger: true, ok: t('purge') })) return;
    S.refocus = 'trash-' + Math.max(0, i || 0);
    L.purge([l.id]); MA.toast(t('purgedOne', { name: esc(display(l)) }), { icon: 'trash' });
  }
  async function purgeAll() {
    const ids = L.trash().map(l => l.id); if (!canEdit() || !ids.length) return;
    if (!await ui.confirm(t('purgeAllQ', { n: MA.num(ids.length) }), esc(t('purgeText')), { danger: true, ok: t('purge') })) return;
    S.refocus = 'trashback';
    const n = L.purge(ids); MA.toast(t('purgedN', { n: MA.num(n) }), { icon: 'trash' });
  }
  function trashView() {
    const list = L.trash(), edit = canEdit(), box = h('section.ib-trash');
    box.append(h('div.ib-trash-h',
      h('button.ib-link', { type: 'button', dataset: { k: 'trashback' }, onclick: () => { S.f.tab = 'reply'; changed(); } }, MA.frag(MA.icon('arrowLeft', 'sm flip')), h('span', t('backInbox'))),
      h('div.ib-trash-t', h('h2.h3', t('trash'), list.some(l => l.sample) ? ui.sample() : null), h('p.small.muted', t('trashText', { n: MA.num(TRASH_DAYS) }))),
      edit && list.length ? ui.btn(t('purgeAll'), { size: 'sm', kind: 'ghost', icon: 'trash', onclick: purgeAll }) : null));
    if (!list.length) { box.append(ui.empty({ title: t('trashEmpty', { n: MA.num(TRASH_DAYS) }), icon: 'trash', compact: true })); return box; }
    const ul = h('ul.ib-trash-list', { 'aria-label': t('trash') });
    list.forEach((l, i) => {
      const left = Math.max(0, TRASH_DAYS - Math.floor((now() - ts(l.deletedAt)) / DAY)), nm = display(l);
      const rb = edit ? ui.btn(t('restore'), { size: 'sm', icon: 'undo', onclick: () => restoreTrash([l.id], i) }) : null;
      if (rb) { rb.dataset.k = 'trash-' + i; rb.setAttribute('aria-label', `${t('restore')}: ${nm}`); }
      const pb = edit ? ui.btn(t('purge'), { size: 'sm', kind: 'ghost', onclick: () => purgeOne(l, i) }) : null;
      if (pb) pb.setAttribute('aria-label', `${t('purge')}: ${nm}`);
      ul.append(h('li.ib-trow', { dataset: { id: l.id }, class: l.sample ? 'is-sample' : null },
        h('div.ib-trow-m', h('b.truncate', vAttrs(nm), nm), l.company && l.name ? h('span.truncate.ib-trow-co', vAttrs(l.company), l.company) : null, l.sample ? h('span.sr-only', t('sampleRow')) : null),
        h('span.ib-trow-when', h('time', { datetime: l.deletedAt, title: fullWhen(l.deletedAt) }, t('deletedAgo', { ago: MA.ago(l.deletedAt) })), ' · ', t('goneIn', { d: daysLabel(left) })),
        edit ? h('div.ib-trow-acts', rb, pb) : null));
    });
    box.append(ul);
    return box;
  }

  /* ================= where briefs come from (source · channel · campaign) ================= */
  function reportRows(by, list = L.all()) {
    const key = by === 'channel' ? l => channelOf(l) || 'none' : by === 'campaign' ? l => campaignOf(l) || 'none' : l => l.source || 'manual';
    const m = new Map();
    for (const l of list) {
      const k = key(l); let r = m.get(k);
      if (!r) m.set(k, r = { key: k, briefs: 0, open: 0, pipe: 0, won: 0, wonValue: 0, lost: 0, sample: false });
      const v = hasVal(l.value) ? +l.value : 0; r.briefs++; if (l.sample) r.sample = true;
      if (l.stage === 'won') { r.won++; r.wonValue += v; } else if (l.stage === 'lost') r.lost++; else if (!l.archived) { r.open++; r.pipe += v; }
    }
    return [...m.values()].sort((a, b) => b.wonValue - a.wonValue || b.pipe - a.pipe || b.briefs - a.briefs || String(a.key).localeCompare(String(b.key)));
  }
  const groupLabel = (by, k) => by === 'channel' ? channelName(k) : by === 'campaign' ? (k === 'none' ? t('ch.none') : k) : sourceName(k);
  const BY = () => [{ value: 'source', label: t('f.source') }, { value: 'channel', label: t('f.channel') }, { value: 'campaign', label: t('f.campaign') }];
  function reportDlg() {
    let by = ['source', 'channel', 'campaign'].includes(store.get('repBy')) ? store.get('repBy') : 'source';
    const out = h('div.ib-rep-out');
    const rate = r => r.won + r.lost ? MA.pct(r.won / (r.won + r.lost)) : '—';
    const draw = () => {
      const all = L.all(), rows = reportRows(by, all);
      if (!rows.length) { out.replaceChildren(ui.empty({ title: t('rep.empty'), icon: 'chart', compact: true })); return; }
      const tot = rows.reduce((a, r) => ({ briefs: a.briefs + r.briefs, open: a.open + r.open, pipe: a.pipe + r.pipe, won: a.won + r.won, wonValue: a.wonValue + r.wonValue, lost: a.lost + r.lost }), { briefs: 0, open: 0, pipe: 0, won: 0, wonValue: 0, lost: 0 });
      const byLabel = BY().find(x => x.value === by).label, num = v => h('td.ib-num', v);
      const tr = r => h('tr', { dataset: { key: r.key } }, h('th', { scope: 'row' }, by === 'campaign' && r.key !== 'none' ? h('span', vAttrs(r.key), r.key) : groupLabel(by, r.key)),
        num(MA.num(r.briefs)), num(MA.num(r.open)), num(money(r.pipe)), num(MA.num(r.won)), num(money(r.wonValue)), num(rate(r)));
      out.replaceChildren(
        all.some(l => l.sample) ? h('p.small.muted.ib-rep-sample', ui.sample(), ' ', t('rep.sample')) : '',
        h('div.table-wrap', h('table.table.ib-rep-table',
          h('caption.sr-only', t('rep.cap', { by: byLabel })),
          h('thead', h('tr', h('th', { scope: 'col' }, byLabel), ...[t('rep.briefs'), t('rep.open'), t('rep.pipe'), t('tab.won'), t('rep.wonValue'), t('rep.rate')].map(x => h('th.ib-num', { scope: 'col' }, x)))),
          h('tbody', rows.map(tr)),
          h('tfoot', h('tr', h('th', { scope: 'row' }, t('rep.total')), num(MA.num(tot.briefs)), num(MA.num(tot.open)), num(money(tot.pipe)), num(MA.num(tot.won)), num(money(tot.wonValue)), num(rate(tot)))))),
        h('p.hint', t('rep.note')));
    };
    const seg = ui.seg(BY(), by, v => { by = v; store.set('repBy', v); draw(); }, { size: 'sm', label: t('repBy') });
    draw();
    return ui.modal({ title: esc(t('rep')), size: 'wide', body: h('div.m-inbox.ib-rep', h('div.ib-rep-bar', h('span.label', { 'aria-hidden': 'true' }, t('repBy')), seg), out), actions: [{ label: MA.t('done'), kind: 'primary' }] });
  }
  /** The Won tab's one-line summary: won value in the last 30 days against the 30 before, and the strongest source. */
  function paintStrip() {
    const el = S.els.strip; if (!el) return; el.innerHTML = ''; el.hidden = true;
    if (!S.f || S.f.tab !== 'won' || S.view === 'board') return;
    const won = L.all().filter(l => l.stage === 'won'); if (!won.length) return;
    const N = 30, t0 = now() - N * DAY, t1 = now() - 2 * N * DAY, at = l => ts(l.stageAt || l.at);
    const sum = arr => arr.reduce((s, l) => s + (hasVal(l.value) ? +l.value : 0), 0);
    const cur = sum(won.filter(l => at(l) >= t0)), prev = sum(won.filter(l => at(l) >= t1 && at(l) < t0));
    const range = `${MA.date(new Date(t1), { day: 'numeric', month: 'short' })} – ${MA.date(new Date(t0 - DAY), { day: 'numeric', month: 'short' })}`;
    const top = reportRows('source', won)[0];
    el.hidden = false;
    el.append(h('div.ib-strip',
      h('span.ib-strip-k', t('wonStrip', { n: MA.num(N) })), h('b.ib-strip-v', money(cur)), ui.delta(cur, prev, { label: range }),
      top && top.wonValue ? h('span.ib-strip-top', t('wonTop', { source: sourceName(top.key), value: money(top.wonValue) })) : null,
      h('span.grow'), won.some(l => l.sample) ? ui.sample() : null,
      ui.btn(t('bySource'), { size: 'sm', kind: 'ghost', icon: 'chart', onclick: reportDlg })));
  }

  /* ================= menus ================= */
  function stageMenu(anchor, ids) {
    if (!canEdit() || !ids.length) return;
    const one = ids.length === 1 ? L.get(ids[0]) : null;
    ui.menu(anchor, [{ heading: ids.length > 1 ? t('moveNTo', { n: MA.num(ids.length) }) : t('moveTo') },
      ...L.STAGES.map(s => ({ label: MA.L(s), icon: STAGE_ICON[s.id], checked: one ? one.stage === s.id : null, run: () => setStage(ids, s.id, null, { anchor }) }))]);
  }
  function assignMenu(anchor, ids) {
    if (!canEdit() || !ids.length || !teamOn()) return;
    const one = ids.length === 1 ? L.get(ids[0]) : null, me = MA.team.me()?.id;
    ui.menu(anchor, [{ heading: t('assignTo') }, { label: t('unassigned'), icon: 'user', checked: one ? !one.owner : null, run: () => setOwner(ids, '') },
      ...MA.team.all().map(m => ({ label: m.name + (m.id === me ? ` (${t('you')})` : ''), icon: 'user', checked: one ? one.owner === m.id : null, run: () => setOwner(ids, m.id) }))]);
  }
  function snoozeMenu(anchor, ids) {
    if (!canEdit() || !ids.length) return;
    const one = ids.length === 1 ? L.get(ids[0]) : null, items = [{ heading: t('snooze') }];
    if (one && isSnoozed(one)) items.push({ label: t('unsnooze'), icon: 'refresh', run: () => unsnooze(ids) }, '-');
    snoozePresets().forEach(p => items.push({ label: p.label, icon: 'clock', meta: esc(p.id === 'later' ? qTime(p.at) : whenFmt(p.at)), run: () => snooze(ids, p.at) }));
    items.push('-', { label: t('snPick'), icon: 'calendar', run: () => pickSnooze(ids) });
    ui.menu(anchor, items);
  }
  function pickSnooze(ids) {
    const d = h('input.input', { type: 'date', min: MA.qDay(now()), value: addDays(MA.qDay(now()), 1), dir: 'ltr' }), tm = h('input.input', { type: 'time', value: '09:00', dir: 'ltr' }), err = h('p.err', { hidden: true }, t('snPast'));
    ui.modal({ title: t('snPickTitle'), body: h('div.m-inbox.ib-form', ui.field(t('date'), d), ui.field(t('time'), tm), h('p.hint.span2', t('qatarTime', { gmt: 'GMT+' + MA.num(3) })), h('div.span2', err)),
      actions: [{ label: MA.t('cancel'), kind: 'ghost' }, { label: t('snooze'), kind: 'primary', icon: 'clock', run: () => {
        const at = atQatar(d.value, tm.value || '09:00');
        if (!d.value || isNaN(at) || at.getTime() <= now()) { err.hidden = false; return false; }
        snooze(ids, at);
      } }] });
  }
  function rowMenu(anchor, id) {
    const l = L.get(id); if (!l) return;
    ui.menu(anchor, [
      { label: MA.t('open'), icon: 'arrowRight', meta: '<kbd>↵</kbd>', run: () => open(id, { focus: 'detail' }) },
      l.email ? { label: t('reply'), icon: 'reply', meta: '<kbd>R</kbd>', run: () => reply(l) } : null,
      { label: t('copyBrief'), icon: 'copy', run: () => MA.copy(briefText(l), t('copiedBrief')) },
      ...(canEdit() ? ['-',
        { label: l.starred ? t('unstar') : t('star'), icon: 'star', run: () => toggleStar(id) },
        { label: (hasNext(l) ? t('nextEdit') : t('nextAdd')) + '…', icon: 'calendar', run: () => nextPop(anchor, id) },
        { label: t('stage') + '…', icon: 'flag', meta: '<kbd>S</kbd>', run: () => stageMenu(anchor, [id]) },
        l.stage === 'lost' ? { label: (l.lostReason ? t('lostChange') : t('lostAdd')) + '…', icon: 'close', run: () => lostMenu(anchor, [id]) } : null,
        S.team ? { label: t('assign') + '…', icon: 'user', meta: '<kbd>A</kbd>', run: () => assignMenu(anchor, [id]) } : null,
        { label: t('snooze') + '…', icon: 'clock', run: () => snoozeMenu(anchor, [id]) },
        { label: l.archived ? t('unarchive') : t('archive'), icon: 'archive', meta: '<kbd>E</kbd>', run: () => archiveIds([id]) },
        '-', { label: MA.t('delete'), icon: 'trash', danger: true, meta: '<kbd>⌫</kbd>', run: () => deleteIds([id]) }] : []),
    ].filter(Boolean));
  }
  function moreMenu(anchor) {
    const n = currentList().length, samples = L.raw().some(l => l.sample) && MA.prefs.get('sampleData'), nt = L.trash().length;
    ui.menu(anchor, [
      canEdit() ? { label: t('importBriefs'), icon: 'upload', run: importDlg } : null,
      { label: t('exportShown', { n: MA.num(n) }), icon: 'download', disabled: !n, run: () => exportCsv() },
      { label: t('checkSite'), icon: 'refresh', run: checkSite },
      '-',
      { label: t('repMenu'), icon: 'chart', run: reportDlg },
      canEdit() ? { label: t('tplsEdit'), icon: 'mail', run: () => tplEditor() } : null,
      { label: t('trash'), icon: 'trash', meta: nt ? esc(MA.num(nt)) : null, run: openTrash },
      '-',
      { label: t('how'), icon: 'info', run: howDlg },
      noteHidden() ? { label: t('showNote'), icon: 'info', run: showNote } : null,
      { label: t('shortcuts'), icon: 'keyboard', run: () => keysPop(anchor) },
      canEdit() && samples ? '-' : null,
      canEdit() && samples ? { label: t('clearSamples'), icon: 'trash', danger: true, run: clearSamples } : null,
    ].filter(Boolean), { align: 'end' });
  }
  function openTrash() { if (!S.mounted) { MA.go('#/inbox?tab=deleted'); return; } S.f.tab = 'deleted'; S.openId = null; MA.go(baseHash()); }
  function sortMenu(anchor) {
    const s = sortState(), is = (k, d) => s.key === k && s.dir === d;
    const set = (key, dir) => { store.set('sort', { key, dir }); paint(); };
    ui.menu(anchor, [{ heading: t('sort') },
      { label: t('sortNew'), icon: 'sort', checked: is('at', 'desc'), run: () => set('at', 'desc') },
      { label: t('sortOld'), icon: 'sort', checked: is('at', 'asc'), run: () => set('at', 'asc') },
      { label: t('sortDue'), icon: 'sort', checked: is('due', 'asc'), run: () => set('due', 'asc') },
      { label: t('sortValue'), icon: 'sort', checked: is('value', 'desc'), run: () => set('value', 'desc') },
      { label: t('sortDays'), icon: 'sort', checked: is('days', 'desc'), run: () => set('days', 'desc') },
      { label: t('sortName'), icon: 'sort', checked: is('name', 'asc'), run: () => set('name', 'asc') }], { align: 'end' });
  }
  function keysPop(anchor) {
    // the same map the keys are bound from, so the sheet can't drift from what actually works
    const rows = keymap().filter(k => k[2]).map(([combo, , desc]) => [MA.keys.label(MA.keys.effective(combo)), t(desc)])
      .concat([['↑ ↓', t('k.arrows')], [MA.L({ en: 'Space', ar: 'مسافة', fa: 'فاصله' }), t('k.space')], [MA.keys.label('mod') + ' ' + MA.keys.label('enter'), t('k.note')]]);
    const box = h('div.m-inbox.ib-keys', h('p.label.ib-keys-h', t('shortcuts')));
    rows.forEach(([k, d]) => box.append(h('span', d), h('span.ib-kbds', { html: k.split(' ').map(x => `<kbd>${esc(x)}</kbd>`).join('') })));
    ui.pop(anchor, box, { align: 'end' });
  }

  /* ================= filters UI ================= */
  function fieldMenu(anchor) {
    ui.menu(anchor, [{ heading: t('filterBy') }, ...FIELDS().map(fd => ({ label: fd.label, icon: fd.icon, run: () => filterPop(anchor, fd) }))]);
  }
  function filterPop(anchor, fd) {
    let P;
    const box = h('div.m-inbox.ib-fpop', h('p.label.ib-fpop-h', fd.label));
    if (fd.range) {
      const mn = h('input.input.sm', { type: 'number', min: '0', step: '1000', placeholder: '0', dir: 'ltr', 'aria-label': t('min') }), mx = h('input.input.sm', { type: 'number', min: '0', step: '1000', placeholder: '∞', dir: 'ltr', 'aria-label': t('max') });
      mn.value = S.f.min; mx.value = S.f.max;
      const take = () => { S.f.min = mn.value.trim(); S.f.max = mx.value.trim(); changed(); };
      const apply = MA.debounce(take, 260);
      mn.addEventListener('input', apply); mx.addEventListener('input', apply);
      [mn, mx].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); take(); P?.close(); } }));
      box.append(h('div.ib-range', ui.field(t('min'), mn), ui.field(t('max'), mx)), h('p.hint.tiny.faint', t('qarHint')));
    } else {
      const opts = fd.opts();
      if (!opts.length) box.append(h('p.small.faint.ib-fpop-none', t('noOptions')));
      const pool = L.all().filter(l => inBase(l) && snoozeOk(l, S.f) && match(l, S.f, fd.k));
      opts.forEach(o => {
        const n = pool.filter(l => fd.of(l).includes(o.v)).length;
        const cb = h('input.check', { type: 'checkbox', checked: S.f[fd.k].includes(o.v), dataset: { v: o.v } });
        cb.addEventListener('change', () => { const s = new Set(S.f[fd.k]); if (cb.checked) s.add(o.v); else s.delete(o.v); S.f[fd.k] = [...s]; changed(); });
        const only = h('button.ib-only', { type: 'button', 'aria-label': `${t('only')}: ${o.label}`, onclick: e => { e.preventDefault(); S.f[fd.k] = [o.v]; changed(); P?.close(); } }, t('only'));
        box.append(h('label.ib-optrow', cb, o.color ? h('i.ib-odot', { style: `--sc:${o.color}` }) : o.icon ? h('span.ib-oico', { html: MA.icon(o.icon, 'sm') }) : null,
          h('span.grow.truncate', o.lang ? { dir: 'auto', lang: o.lang } : { dir: 'auto' }, o.label), only, h('span.ib-on', MA.num(n))));
      });
    }
    P = ui.pop(anchor, box, { width: 300, label: fd.label });
    return P;
  }
  function changed({ keepSearch } = {}) {
    S.keep.clear(); S.sel.clear(); S.limit = LIMIT; syncUrl();
    if (!keepSearch && S.els.search && S.els.search.value !== S.f.q) S.els.search.value = S.f.q;
    paint();
  }
  function clearFilters() { S.f = readF(new URLSearchParams(S.f.tab === 'reply' ? '' : 'tab=' + S.f.tab)); changed(); }
  const rangeText = () => { const a = S.f.min, b = S.f.max; return a && b ? `${money(a)} – ${money(b)}` : a ? t('from', { v: money(a) }) : t('upTo', { v: money(b) }); };
  function chipLabel(fd) {
    if (fd.range) return rangeText();
    const opts = fd.opts(); return joinL(S.f[fd.k].map(v => opts.find(o => o.v === v)?.label || v));
  }
  function paintChips() {
    const c = S.els.chips; if (!c) return; c.innerHTML = '';
    for (const fd of FIELDS()) {
      const on = fd.range ? !!(S.f.min || S.f.max) : S.f[fd.k].length > 0; if (!on) continue;
      const chip = h('div.ib-chip', { dataset: { k: fd.k } });
      chip.append(h('button.ib-chip-main', { type: 'button', onclick: () => filterPop(chip, fd) }, h('span.ib-chip-k', fd.label), h('span.ib-chip-v', fd.site ? sAttrs() : { dir: 'auto' }, chipLabel(fd))),
        h('button.ib-chip-x', { type: 'button', 'aria-label': `${t('removeFilter')}: ${fd.label}`, html: MA.icon('close', 'sm'), onclick: () => { if (fd.range) { S.f.min = ''; S.f.max = ''; } else S.f[fd.k] = []; changed(); } }));
      c.append(chip);
    }
    if (S.f.snoozed) c.append(h('div.ib-chip', { dataset: { k: 'snoozed' } }, h('span.ib-chip-main', h('span.ib-chip-k', { html: MA.icon('clock', 'sm') }), h('span.ib-chip-v', t('f.snoozed'))),
      h('button.ib-chip-x', { type: 'button', 'aria-label': `${t('removeFilter')}: ${t('f.snoozed')}`, html: MA.icon('close', 'sm'), onclick: () => { S.f.snoozed = false; changed(); } })));
    if (hasFilters(S.f)) c.append(ui.btn(t('clear'), { size: 'sm', kind: 'ghost', onclick: clearFilters }));
    const views = store.get('views', []), cur = fString(S.f);
    if (views.length && (hasFilters(S.f) || S.f.snoozed)) c.append(h('span.ib-vsep'));
    views.forEach(v => c.append(h('span', { class: 'ib-pill' + (v.qs === cur ? ' on' : ''), dataset: { view: v.id } },
      h('button.ib-pill-b', { type: 'button', onclick: () => applyView(v), title: v.name, 'aria-pressed': String(v.qs === cur) }, h('span', { html: MA.icon('pin', 'sm') }), h('span.truncate', vAttrs(v.name), v.name)),
      h('button.ib-pill-x', { type: 'button', 'aria-label': `${t('removeView')}: ${v.name}`, html: MA.icon('close', 'sm'), onclick: () => removeView(v.id) }))));
    if (hasFilters(S.f) && !views.some(v => v.qs === cur)) c.append(ui.btn(t('saveView'), { icon: 'plus', size: 'sm', kind: 'ghost', onclick: saveView }));
  }
  async function saveView() {
    const guess = FIELDS().filter(fd => fd.range ? (S.f.min || S.f.max) : S.f[fd.k].length).map(chipLabel).concat(S.f.q ? [`“${S.f.q}”`] : []).join(' · ').slice(0, 40);
    const name = await ui.prompt(t('viewName'), { label: t('viewNameLabel'), value: guess });
    if (!name || !name.trim()) return;
    store.set('views', [...store.get('views', []), { id: MA.uid('v'), name: name.trim().slice(0, 48), qs: fString(S.f) }]);
    paint(); MA.toast(t('viewSaved'), { icon: 'pin' });
  }
  function applyView(v) { S.f = readF(new URLSearchParams(v.qs)); changed(); }
  function removeView(id) {
    const views = store.get('views', []), v = views.find(x => x.id === id); if (!v) return;
    store.set('views', views.filter(x => x.id !== id)); paint();
    MA.toast(t('viewRemoved', { name: esc(v.name) }), { icon: 'pin', undo: () => { store.set('views', [...store.get('views', []), v]); paint(); } });
  }

  /* ================= how briefs arrive (honest: no server, nothing fetched for you) ================= */
  const noteKey = () => 'note.' + (MA.content.draft?.studio?.formEndpoint ? 'endpoint' : 'mailto');
  const noteHidden = () => !!store.get(noteKey(), false);
  function showNote() { store.set(noteKey(), false); paint(); }
  const hostOf = u => { try { return new URL(u).host; } catch (e) { return String(u || ''); } };
  function paintNote() {
    const el = S.els.note; if (!el) return; el.innerHTML = '';
    if (noteHidden() || isTrash()) return;
    const studio = MA.content.draft?.studio || {}, ep = !!studio.formEndpoint;
    const text = ep ? t('noteEndpoint') : t('noteMailto', { email: `<b class="ltr">${esc(studio.email || MA.content.defaults?.studio?.email || '')}</b>` });
    const acts = h('div.ib-note-acts');
    if (ep) { if (canEdit()) acts.append(ui.btn(t('importBriefs'), { size: 'sm', icon: 'upload', onclick: importDlg })); }
    else {
      if (MA.can('settings.edit')) acts.append(ui.btn(t('setupForm'), { size: 'sm', href: '#/settings/form' }));
      acts.append(ui.btn(t('checkNow'), { size: 'sm', kind: 'ghost', icon: 'refresh', onclick: checkSite }));
    }
    const how = ui.btn(t('how'), { size: 'sm', kind: 'ghost', onclick: howDlg }); how.dataset.k = 'how'; acts.append(how);
    acts.append(ui.iconBtn('close', { tip: t('hideNote'), size: 'sm', onclick: () => { store.set(noteKey(), true); paint(); } }));
    el.append(h('div.callout.ib-note', { dataset: { mode: ep ? 'endpoint' : 'mailto' } }, MA.frag(MA.icon('info')), h('p.grow', { html: text }), acts));
  }
  function howDlg() {
    const studio = MA.content.draft?.studio || {}, ep = String(studio.formEndpoint || ''), ff = studio.formFields || {};
    const onoff = v => t(v ? 'how.on' : 'how.off');
    const body = h('div.m-inbox.ib-how', { dataset: { mode: ep ? 'endpoint' : 'mailto' } },
      h('p.ib-how-now', { html: ep ? t('how.endpoint', { host: `<span class="ltr">${esc(hostOf(ep))}</span>` }) : t('how.mailto', { email: `<b class="ltr">${esc(studio.email || MA.content.defaults?.studio?.email || '')}</b>` }) }),
      h('ol.ib-how-steps', h('li', { html: t('how.s1') }), h('li', { html: t('how.s2') }), h('li', { html: t('how.s3', { phone: esc(onoff(ff.phone)), budget: esc(onoff(ff.budget)) }) })),
      h('div.callout.ib-how-limit', MA.frag(MA.icon('info')), h('p', t('how.limit'))));
    const acts = [{ label: MA.t('close'), kind: 'ghost' }];
    if (canEdit()) acts.push({ label: t('how.import'), icon: 'upload', run: () => { setTimeout(importDlg, 0); } });
    if (MA.can('settings.edit')) acts.push({ label: t('how.open'), kind: 'primary', run: () => { MA.go('#/settings/form'); } });
    return ui.modal({ title: esc(t('howTitle')), body, actions: acts });
  }

  /* ================= list layout: a multi-select listbox with roving focus ================= */
  function row(l, rid) {
    S.last?.objs.set(l.id, l);
    const sel = S.sel.has(l.id), op = S.openId === l.id;
    const cls = (l.read ? '' : ' unread') + (sel ? ' sel' : '') + (S.cursor === l.id ? ' cur' : '') + (op ? ' open' : '') + (l.sample ? ' is-sample' : '');
    const r = h('div.ib-row', { role: 'option', id: 'ib-o-' + l.id.replace(/[^\w-]/g, '_'), tabindex: l.id === rid ? '0' : '-1', 'aria-selected': String(sel), 'aria-current': op ? 'true' : null, dataset: { id: l.id }, class: cls });
    // the checkbox is a pointer shortcut for the option's own selection (Space or X); it never takes focus
    const cb = h('input.check.ib-cb', { type: 'checkbox', checked: sel, tabindex: '-1', 'aria-hidden': 'true', onmousedown: e => e.preventDefault() });
    const nm = display(l), facts = srFacts(l);
    r.append(h('div.ib-gut', h('i.ib-udot'), cb),
      h('div.ib-rmain',
        h('div.ib-r1', h('b.ib-rname.truncate', vAttrs(nm), nm), facts ? h('span.sr-only', ', ' + facts) : null, l.starred ? starIcon() : null, h('time.ib-when', { datetime: l.at, title: fullWhen(l.at) }, ago(l.at))),
        l.company && l.name ? h('div.ib-r2.truncate', vAttrs(l.company), l.company) : null,
        l.message ? h('div.ib-r3.truncate', vAttrs(l.message), l.message) : null,
        h('div.ib-r4', stagePill(l.stage), lostChip(l), dueChip(l), daysChip(l), hasVal(l.value) ? h('span.ib-val', moneyShort(l.value)) : null,
          isSnoozed(l) ? h('span.ib-snz', { html: MA.icon('clock', 'sm'), title: t('snoozedUntil', { when: whenFmt(l.snoozeUntil) }) }) : null,
          h('span.grow'), avatarOf(l.owner, 'xs'))));
    return r;
  }
  function emptyFor() {
    if (!L.all().length) return ui.empty({ title: t('emptyAllTitle'), text: t('emptyAllText'), pose: 'arrive', actions: [
      canEdit() ? ui.btn(t('newBrief'), { kind: 'primary', icon: 'plus', onclick: newBrief }) : null, canEdit() ? ui.btn(t('importBriefs'), { icon: 'upload', onclick: importDlg }) : null,
      ui.btn(t('how'), { icon: 'info', kind: 'ghost', onclick: howDlg })].filter(Boolean) });
    if (hasFilters(S.f)) return ui.empty({ title: t('noMatchTitle'), text: t('noMatchText'), icon: 'search', compact: true, actions: [ui.btn(t('clearFilters'), { onclick: clearFilters })] });
    if (S.f.snoozed) return ui.empty({ title: t('e.snoozed'), icon: 'clock', compact: true, actions: [ui.btn(t('backToQueue'), { onclick: () => { S.f.snoozed = false; changed(); } })] });
    if (S.view !== 'board' && S.f.tab === 'reply') return ui.empty({ title: t('calmTitle'), text: t('calmText'), pose: 'ride' });
    const tab = S.view === 'board' ? 'open' : S.f.tab;
    return ui.empty({ title: t('e.title'), text: t('e.' + tab), icon: { open: 'inbox', due: 'calendar', starred: 'star', won: 'star', lost: 'close', archived: 'archive' }[tab] || 'inbox', compact: true });
  }
  const limitFor = all => { const at = id => all.findIndex(l => l.id === id) + 1; return Math.min(all.length, Math.max(S.limit, at(S.cursor), at(S.openId))); };
  const rovingId = ids => [S.cursor, S.openId].find(x => x && ids.includes(x)) || ids[0];
  /** What the body shows right now, and a signature of its shape (a change in shape → full paint; otherwise rows are patched). */
  function viewData() {
    if (isTrash()) return { kind: 'trash', sig: 'trash' };
    const any = L.all().length ? 1 : 0;
    if (S.view === 'board') {
      const list = boardLeads(), col = collapsedCols(), groups = L.STAGES.map(s => colLeads(list, s.id));
      return { kind: 'board', list, groups, sig: `b|${any}|${col.join(',')}|` + groups.map(g => g.map(l => l.id).join(',')).join('|') };
    }
    const all = visible(), list = all.slice(0, limitFor(all)), has = S.view === 'list' && !!(S.openId && L.get(S.openId));
    const ns = S.view === 'list' ? L.all().filter(l => !l.archived && isSnoozed(l) && match(l, S.f)).length : 0;
    return { kind: S.view, all, list, sig: `${S.view}|${any}|${has ? 'o' : ''}|${ns}|${all.length}|${S.view === 'table' ? visCols().join(',') : ''}|` + list.map(l => l.id).join(',') };
  }
  function listView(vd) {
    const { list, all } = vd, has = !!(S.openId && L.get(S.openId)), rid = rovingId(list.map(l => l.id));
    const split = h('div.ib-split', { class: has ? 'has-open' : '', dataset: { fit: 'h' } });
    const scroll = h('div.ib-q-scroll', { role: 'listbox', 'aria-label': t('queue'), 'aria-multiselectable': 'true', 'aria-describedby': 'ib-list-hint', dataset: { scroll: 'q' } });
    if (!list.length) { scroll.removeAttribute('role'); scroll.removeAttribute('aria-multiselectable'); scroll.removeAttribute('aria-describedby'); scroll.append(emptyFor()); }
    else list.forEach(l => scroll.append(row(l, rid)));
    scroll.addEventListener('click', e => {
      const r = e.target.closest('.ib-row'); if (!r) return;
      if (e.target.closest('.ib-cb')) { toggleSel(r.dataset.id); return; }
      if (e.metaKey || e.ctrlKey) { e.preventDefault(); toggleSel(r.dataset.id); return; }
      if (e.shiftKey && S.cursor) { e.preventDefault(); rangeSel(S.cursor, r.dataset.id); return; }
      open(r.dataset.id, { focus: 'detail' });
    });
    scroll.addEventListener('contextmenu', e => { const r = e.target.closest('.ib-row'); if (!r) return; e.preventDefault(); rowMenu(r, r.dataset.id); });
    const queue = h('section.ib-queue', h('p.sr-only', { id: 'ib-list-hint' }, t('listHint')), scroll);
    const ns = L.all().filter(l => !l.archived && isSnoozed(l) && match(l, S.f)).length, more = all.length - list.length;
    if (ns || S.f.snoozed || more > 0) {
      const foot = h('div.ib-q-foot');
      if (more > 0) foot.append(h('button.ib-link.ib-more', { type: 'button', dataset: { k: 'more' }, onclick: showMore }, t('showMore', { n: MA.num(Math.min(more, LIMIT)) })));
      if (ns || S.f.snoozed) foot.append(S.f.snoozed
        ? h('button.ib-link', { type: 'button', onclick: () => { S.f.snoozed = false; changed(); } }, MA.frag(MA.icon('arrowLeft', 'sm flip')), h('span', t('backToQueue')))
        : h('button.ib-link.ib-snzlink', { type: 'button', onclick: () => { S.f.snoozed = true; changed(); } }, MA.frag(MA.icon('clock', 'sm')), h('span', t('nSnoozed', { n: MA.num(ns) }))));
      queue.append(foot);
    }
    // nothing in the queue and nothing open: one calm panel, not an empty queue beside a "pick a brief" pane
    if (!list.length && !has) { split.classList.add('is-solo'); split.append(queue); return split; }
    const pane = h('section.ib-pane', { dataset: { scroll: 'd-' + (S.openId || ''), lead: has ? S.openId : '' } });
    if (has) pane.append(detail(L.get(S.openId)));
    else pane.append(h('div.ib-pick', ui.empty({ title: t('pickTitle'), text: t('pickText'), icon: 'inbox', compact: true })));
    split.append(queue, pane);
    return split;
  }
  function showMore() { S.limit += LIMIT; S.refocus = 'more'; paint(); }
  function rangeSel(a, b) {
    const ids = navIds(), i = ids.indexOf(a), j = ids.indexOf(b); if (i < 0 || j < 0) return toggleSel(b);
    ids.slice(Math.min(i, j), Math.max(i, j) + 1).forEach(id => S.sel.add(id)); S.cursor = b; syncMarks();
  }

  /* ================= the brief (reading pane / drawer) ================= */
  function detail(l) {
    if (S.last) S.last.open = l;
    const edit = canEdit(), lang = l.lang === 'ar' ? 'ar' : 'en', ids = navIds(), i = ids.indexOf(l.id), st = L.stage(l.stage);
    const el = h('article.ib-detail', { dataset: { id: l.id } });
    el.append(h('div.ib-d-nav',
      h('button.btn.ghost.sm.ib-back', { type: 'button', onclick: () => { S.cursor = l.id; want('row', l.id); closeOpen(); }, html: MA.icon('arrowLeft', 'sm flip') + `<span>${esc(t('back'))}</span>` }),
      isSnoozed(l) ? h('span.badge.info', { html: MA.icon('clock', 'sm') + esc(t('snoozedUntil', { when: whenFmt(l.snoozeUntil) })) }) : null,
      l.archived ? h('span.badge', { html: MA.icon('archive', 'sm') + esc(t('tab.archived')) }) : null,
      h('span.grow'),
      i >= 0 ? h('span.ib-pos', t('pos', { i: MA.num(i + 1), n: MA.num(ids.length) })) : null,
      ui.iconBtn('chevUp', { tip: t('prev'), size: 'sm', onclick: () => move(-1, l.id) }),
      ui.iconBtn('chevDown', { tip: t('next'), size: 'sm', onclick: () => move(1, l.id) })));
    const nm = display(l);
    // the heading takes focus when a brief opens (Enter or a click); Esc goes back to its row
    const title = h('div.ib-d-title', h('h2.h2', vAttrs(nm, { tabindex: '-1' }), nm), langBadge(l.lang), l.sample ? ui.sample() : null);
    if (edit) { const sb = ui.iconBtn('star', { tip: l.starred ? t('unstar') : t('star'), pressed: !!l.starred, onclick: () => toggleStar(l.id) }); sb.classList.add('ib-starbtn'); sb.dataset.act = 'star'; title.append(sb); }
    else if (l.starred) title.append(starIcon());
    el.append(title);
    const sub = h('div.ib-d-sub');
    if (l.company && l.name) sub.append(h('span', vAttrs(l.company), l.company));
    if (l.email) sub.append(h('button.ib-copy.ltr', { type: 'button', 'data-tip': t('copyEmail'), onclick: () => MA.copy(l.email) }, l.email));
    if (l.phone) sub.append(h('span.ltr', { lang: 'en' }, l.phone));
    if (sub.childNodes.length) el.append(sub);
    // actions: reply (first template), WhatsApp when there's a phone, the template menu, then the pipeline controls
    const acts = h('div.ib-d-actions');
    if (l.email) { const a = h('a.btn.primary.sm', { href: mailtoOf(l), dataset: { act: 'reply' }, html: MA.icon('reply') + `<span>${esc(t('reply'))}</span>` }); a.addEventListener('click', () => afterReply(l.id)); acts.append(a); }
    const wa = waOf(l); if (wa) acts.append(h('a.btn.sm', { href: wa, target: '_blank', rel: 'noopener', dataset: { act: 'wa' }, html: MA.icon('whatsapp') + `<span>${esc(t('whatsapp'))}</span>` }));
    if (l.email || wa) { const tb = ui.iconBtn('chevDown', { tip: t('tplPick'), size: 'sm', menu: true, onclick: e => tplMenu(e.currentTarget, l) }); tb.dataset.act = 'tpl'; acts.append(tb); }
    const cp = ui.iconBtn('copy', { tip: t('copyBrief'), onclick: () => MA.copy(briefText(l), t('copiedBrief')) }); cp.dataset.act = 'copy'; acts.append(cp);
    if (edit) {
      const m = MA.team.get(l.owner);
      const arch = ui.iconBtn('archive', { tip: (l.archived ? t('unarchive') : t('archive')) + ' · E', onclick: () => archiveIds([l.id]) }); arch.dataset.act = 'archive';
      const del = ui.iconBtn('trash', { tip: MA.t('delete') + ' · ⌫', onclick: () => deleteIds([l.id]) }); del.dataset.act = 'delete';
      acts.append(...[h('span.ib-vsep'),
        h('button.btn.sm.ib-stagebtn', { type: 'button', dataset: { act: 'stage' }, 'aria-haspopup': 'menu', 'aria-expanded': 'false', style: `--sc:${st.color}`, onclick: e => stageMenu(e.currentTarget, [l.id]), html: `<i class="ib-sdot"></i><span>${esc(stageName(l.stage))}</span>${MA.icon('chevDown', 'sm')}` }),
        S.team ? h('button.btn.sm', { type: 'button', dataset: { act: 'assign' }, 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: e => assignMenu(e.currentTarget, [l.id]) }, m ? ui.avatar(m, 'xs') : MA.frag(MA.icon('user', 'sm')), h('span', m ? m.name : t('assign')), MA.frag(MA.icon('chevDown', 'sm'))) : null,
        h('button.btn.sm.ghost', { type: 'button', dataset: { act: 'snooze' }, 'aria-label': t('snooze'), 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: e => snoozeMenu(e.currentTarget, [l.id]), html: MA.icon('clock', 'sm') + `<span>${esc(t('snooze'))}</span>` }),
        h('span.grow'), arch, del].filter(Boolean));
    }
    el.append(acts);
    const nb = nextBar(l, edit); if (nb) el.append(nb);
    // highlights strip
    const cell = (label, value, subEl, cls = '') => h('div', { class: 'ib-hc ' + cls }, h('span.label', label), h('div.ib-hv', value), subEl ? h('div.ib-hs', subEl) : null);
    const late = isLate(l), bud = budgetOf(l), ch = channelOf(l);
    const stSub = st.closed ? h('span', t('closedOn', { date: qDate(l.stageAt || l.at, { year: undefined }) }),
        l.stage === 'lost' ? [' · ', l.lostReason ? h('span.ib-lostr-t', LOST.includes(l.lostReason) ? {} : vAttrs(l.lostReason), lostLabel(l.lostReason)) : null,
          edit ? h('button.ib-link.ib-lostbtn', { type: 'button', dataset: { act: 'lost' }, 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: e => lostMenu(e.currentTarget, [l.id]) }, l.lostReason ? t('lostChange') : t('lostAdd')) : null] : null)
      : h('span', { class: late ? 'ib-late' : '' }, t('inStage', { d: daysLabel(daysIn(l)) }) + (late ? ' · ' + t('pastTarget', { d: daysLabel(st.target) }) : ''));
    el.append(h('div.ib-hl',
      cell(t('hl.value'), valueEditor(l, edit), bud ? h('span.ib-budget', t('budget') + ': ', h('span', bud.lang ? sAttrs(bud.lang) : {}, bud.text)) : null, 'ib-hc-value'),
      cell(t('hl.swells'), (l.waves || []).length ? swellChips(l.waves) : h('span.faint', t('noSwells'))),
      cell(t('hl.stage'), stagePill(l.stage), stSub, late ? 'is-late' : ''),
      cell(t('hl.source'), h('span.ib-src', { html: MA.icon(L.source(l.source).icon, 'sm') + `<span>${esc(sourceName(l.source))}</span>` }), ch ? h('span', channelName(ch)) : null),
      cell(t('hl.received'), qDate(l.at), h('time', { datetime: l.at }, `${qTime(l.at)} · ${MA.ago(l.at)}`)),
      cell(t('hl.last'), l.lastContact ? MA.ago(l.lastContact) : h('span.faint', t('notYet')), edit ? h('button.ib-link', { type: 'button', dataset: { act: 'log' }, onclick: () => logContact(l.id) }, t('logReply')) : null)));
    // message, then what they picked on the site: services from the Services list and words caught in "What we make"
    const svcs = l.services || [], words = (l.words || []).map(w => String(w)).filter(w => w.trim()), msgLang = l.message ? MA.langOf(l.message) : lang;
    const picks = svcs.length || words.length ? h('dl.ib-picks',
      svcs.length ? [h('dt', t('services')), h('dd', svcChips(svcs))] : null,
      words.length ? [h('dt', t('words')), h('dd.ib-words-v', words.map(w => h('span.tag.ib-word', vAttrs(w), w)))] : null) : null;
    el.append(h('section.ib-sec', h('div.ib-sec-h', h('span.label', t('message'))),
      l.message ? h('div.ib-msg', { dir: msgLang === 'en' ? 'ltr' : 'rtl', lang: msgLang }, l.message) : h('p.faint.small', t('noMessage')), picks));
    const attr = attribution(l); if (attr) el.append(attr);
    if (edit || (l.tags || []).length) el.append(h('section.ib-sec', h('div.ib-sec-h', h('span.label', t('tags'))), tagEditor(l, edit)));
    const tl = h('div.ib-tl');
    (l.timeline || []).slice().sort((a, b) => ts(b.at) - ts(a.at)).forEach(ev => tl.append(ev.type === 'note' ? noteItem(ev) : evLine(ev)));
    el.append(h('section.ib-sec', h('div.ib-sec-h', h('span.label', t('activity'))), edit ? composer(l) : null, tl));
    return el;
  }
  /** Where a site brief came from: channel, referrer, UTM campaign and the first page. Nothing shows when the brief carried none. */
  function attribution(l) {
    const u = utmOf(l), ch = channelOf(l), camp = [u.source, u.medium, u.campaign].filter(Boolean);
    if (!l.ref && !camp.length && !l.landing) return null;
    const row2 = (k, v) => [h('dt', t(k)), h('dd', v)];
    return h('section.ib-sec.ib-attr-sec', h('div.ib-sec-h', h('span.label', t('attr'))), h('dl.ib-attr',
      ch ? row2('attr.channel', channelName(ch)) : null,
      l.ref ? row2('attr.ref', h('span.ltr', { lang: 'en' }, l.ref)) : null,
      camp.length ? row2('attr.campaign', h('span', vAttrs(camp.join(' · ')), camp.join(' · '))) : null,
      l.landing ? row2('attr.landing', h('span.ltr', { lang: 'en' }, l.landing)) : null));
  }
  function nextBar(l, edit) {
    const has = hasNext(l), closed = isClosed(l);
    if (!has && (!edit || closed)) return null;
    const d = dueIn(l), bar = h('div', { class: 'ib-next' + (!closed && d != null ? d < 0 ? ' late' : d === 0 ? ' today' : '' : '') });
    bar.append(h('span.ib-next-i', { html: MA.icon('calendar', 'sm') }));
    if (!has) { bar.append(h('button.ib-link.ib-next-add', { type: 'button', dataset: { k: 'next' }, onclick: e => nextPop(e.currentTarget, l.id) }, t('nextAdd'))); return bar; }
    const parts = [h('span.label.ib-next-l', t('next')), l.nextStep ? h('span.ib-next-t', vAttrs(l.nextStep), l.nextStep) : null, isDay(l.due) ? h('span.ib-next-d', closed ? dayFmt(l.due) : dueText(l)) : null];
    bar.append(edit ? h('button.ib-next-main', { type: 'button', dataset: { k: 'next' }, title: t('nextEdit'), onclick: e => nextPop(e.currentTarget, l.id) }, ...parts) : h('div.ib-next-main', ...parts));
    if (edit) { const dn = ui.iconBtn('check', { tip: t('nextDone'), size: 'sm', onclick: () => setNext(l.id, '', null, { done: true }) }); dn.dataset.act = 'nextdone'; bar.append(dn); }
    return bar;
  }
  function valueEditor(l, edit) {
    const show = h(edit ? 'button' : 'span', { class: 'ib-valbtn' + (hasVal(l.value) ? '' : ' is-empty'), type: edit ? 'button' : null, 'data-tip': edit ? t('editValue') : null, dataset: { k: 'valbtn' } },
      hasVal(l.value) ? money(l.value) : (edit ? t('addValue') : '—'));
    if (!edit) return show;
    show.addEventListener('click', () => {
      const inp = h('input.input.sm.ib-valin', { type: 'number', min: '0', step: '1000', inputmode: 'numeric', dir: 'ltr', 'aria-label': t('hl.value'), dataset: { k: 'value' } });
      inp.value = hasVal(l.value) ? String(l.value) : '';
      show.replaceWith(inp); inp.focus(); inp.select();
      let done = false;
      const commit = save => {
        if (done) return; done = true;
        const raw = inp.value.trim(), v = raw === '' ? null : Math.max(0, Math.round(+raw));
        if (save && (v === null || isFinite(v)) && v !== (hasVal(l.value) ? +l.value : null)) { S.refocus = 'valbtn'; L.update(l.id, { value: v }, { log: { type: 'value', text: v == null ? '' : String(v) } }); }
        else if (inp.isConnected) { inp.replaceWith(show); show.focus(); }
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); commit(false); } });
      inp.addEventListener('blur', () => commit(true));
    });
    return show;
  }
  function tagEditor(l, edit) {
    const box = h('div.ib-tags'), tags = l.tags || [];
    tags.forEach(tg => box.append(h('span.tag', { dataset: { tag: tg } }, h('span', vAttrs(tg), tg), edit ? h('button', { type: 'button', 'aria-label': t('removeTag', { tag: tg }), html: MA.icon('close', 'sm'), onclick: () => removeTag(l.id, tg) }) : null)));
    if (!edit) return box;
    const add = h('button.tag.ib-tagadd', { type: 'button', dataset: { k: 'tagadd' }, html: MA.icon('plus', 'sm') + `<span>${esc(t('addTag'))}</span>` });
    add.addEventListener('click', () => {
      const dl = h('datalist', { id: 'ib-tag-dl' }, allTags().filter(x => !tags.includes(x)).map(x => h('option', { value: x })));
      const inp = h('input.input.sm.ib-tagin', { list: 'ib-tag-dl', placeholder: t('tagPh'), maxLength: 32, 'aria-label': t('addTag'), dataset: { k: 'tag' } });
      add.replaceWith(inp, dl); inp.focus();
      let done = false;
      const commit = save => {
        if (done) return; done = true;
        const v = inp.value.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 32);
        if (save && v && !tags.includes(v)) { S.refocus = 'tagadd'; L.update(l.id, { tags: [...tags, v] }); }
        else { dl.remove(); if (inp.isConnected) { inp.replaceWith(add); if (!save) add.focus(); } }
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); commit(false); } });
      inp.addEventListener('blur', () => commit(true));
    });
    box.append(add);
    return box;
  }
  function composer(l) {
    const ta = h('textarea.textarea.ib-note-in', { rows: 2, placeholder: t('notePh'), dir: 'auto', 'aria-label': t('notePh'), dataset: { k: 'note' } });
    ta.value = S.drafts[l.id] || '';
    const btn = ui.btn(t('addNote'), { kind: 'primary', size: 'sm', icon: 'note' });
    const sync = () => { btn.disabled = !ta.value.trim(); ta.style.height = 'auto'; ta.style.height = Math.min(260, Math.max(64, ta.scrollHeight + 2)) + 'px'; };
    const submit = () => { const v = ta.value.trim(); if (!v || !canEdit()) return; delete S.drafts[l.id]; S.refocus = 'note'; L.note(l.id, v); };
    btn.addEventListener('click', submit);
    ta.addEventListener('input', () => { S.drafts[l.id] = ta.value; sync(); });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } });
    btn.disabled = !ta.value.trim(); requestAnimationFrame(sync);
    return h('div.ib-composer', ta, h('div.ib-composer-f', h('span.ib-kbds', { html: `<kbd>${esc(MA.keys.label('mod'))}</kbd><kbd>↵</kbd>` }), btn));
  }
  function noteItem(ev) {
    const m = ev.by && MA.team.get(ev.by);
    return h('div.ib-noteitem', m ? ui.avatar(m, 'sm') : h('span.avatar.sm', { style: '--av:var(--ink4)' }, '·'),
      h('div.grow', h('div.ib-noteitem-h', h('b', m?.name || t('someone')), h('time', { datetime: ev.at, title: fullWhen(ev.at) }, ago(ev.at))), h('div.ib-noteitem-t', vAttrs(ev.text || ''), ev.text || '')));
  }
  function evText(ev) {
    switch (ev.type) {
      case 'created': return ev.text === 'Imported' ? t('ev.imported') : /website/i.test(ev.text || '') ? t('ev.site') : t('ev.added');
      case 'stage': return t('ev.stage', { stage: stageName(ev.text) });
      case 'assign': return ev.text ? t('ev.assign', { name: ownerName(ev.text) }) : t('ev.unassign');
      case 'archive': return t('ev.archive');
      case 'unarchive': return t('ev.unarchive');
      case 'snooze': return ev.text ? t('ev.snooze', { when: whenFmt(ev.text) }) : t('ev.unsnooze');
      case 'contact': return t('ev.contact');
      case 'value': return ev.text ? t('ev.value', { value: money(+ev.text) }) : t('ev.valueClear');
      case 'next': return ev.done ? t('nextDoneT', { text: ev.text || '' }) : ev.clear || (!ev.text && !isDay(ev.due)) ? t('ev.nextClear')
        : t('ev.next', { text: [ev.text, isDay(ev.due) ? t('ev.nextDue', { date: dayFmt(ev.due) }) : ''].filter(Boolean).join(' · ') });
      case 'lost': return t('ev.lost', { text: lostLabel(ev.text) });
      default: return String(ev.text || ev.type || '');
    }
  }
  function evLine(ev) {
    const who = ev.by ? MA.team.get(ev.by)?.name : '';
    return h('div.ib-ev', { dataset: { type: ev.type || '' } }, h('span.ib-ev-i', { html: MA.icon(EV_ICON[ev.type] || 'clock', 'sm') }),
      h('span.ib-ev-t.truncate', evText(ev) + (who ? ' · ' + who : '')), h('time', { datetime: ev.at, title: fullWhen(ev.at) }, ago(ev.at)));
  }

  /* ================= board ================= */
  function cardLabel(l) {
    return [display(l), l.company && l.name ? l.company : '', hasVal(l.value) ? money(l.value) : '', dueText(l) && !isClosed(l) ? dueText(l) : '', l.stage === 'lost' && l.lostReason ? lostLabel(l.lostReason) : '', srFacts(l)].filter(Boolean).join(', ');
  }
  function card(l, rid) {
    S.last?.objs.set(l.id, l);
    const cls = (S.cursor === l.id ? ' cur' : '') + (S.sel.has(l.id) ? ' sel' : '') + (S.openId === l.id ? ' open' : '') + (l.read ? '' : ' unread') + (l.sample ? ' is-sample' : '');
    const head = l.company || display(l);
    return h('article.ib-card', { tabindex: l.id === rid ? '0' : '-1', dataset: { id: l.id }, class: cls, 'aria-label': cardLabel(l), 'aria-current': S.openId === l.id ? 'true' : null },
      h('div.ib-c1', h('i.ib-udot'), h('b.truncate', vAttrs(head), head), l.starred ? starIcon() : null),
      l.company && l.name ? h('div.ib-c2.truncate', vAttrs(l.name), l.name) : null,
      l.stage === 'lost' && l.lostReason ? h('div.ib-c2.truncate', lostChip(l)) : null,
      (l.waves || []).length ? h('div.ib-c3', swellChips(l.waves, 2)) : null,
      h('div.ib-c4', hasVal(l.value) ? h('span.ib-val', moneyShort(l.value)) : h('span.faint', '—'), h('span.grow'), dueChip(l), daysChip(l),
        isSnoozed(l) ? h('span.ib-snz', { html: MA.icon('clock', 'sm') }) : null, avatarOf(l.owner, 'xs')));
  }
  // one sample stamp per column header (only when the sum includes sample values); cards carry a dotted edge instead
  const colSum = items => { const sum = items.reduce((s, l) => s + (hasVal(l.value) ? +l.value : 0), 0); return h('div.ib-col-sum', sum ? h('span', money(sum)) : h('span.faint', '—'), items.some(l => l.sample && hasVal(l.value)) ? ui.sample() : null); };
  function boardView(vd) {
    const collapsed = collapsedCols();
    const sk = MA.keys.singleOn() && canEdit() ? MA.keys.label(MA.keys.effective('s')) : null;
    const board = h('div.ib-board', { dataset: { fit: 'h', scroll: 'b' }, role: 'list', 'aria-label': t('vBoard'), 'aria-describedby': 'ib-board-hint' });
    if (!L.all().length) { board.classList.add('ib-board-empty'); board.removeAttribute('aria-describedby'); board.removeAttribute('role'); board.append(emptyFor()); return board; }
    const rid = rovingId(L.STAGES.filter(s => !collapsed.includes(s.id)).flatMap((s, i) => vd.groups[L.STAGES.indexOf(s)].map(l => l.id)));
    L.STAGES.forEach((st, i) => {
      const items = vd.groups[i], isCol = collapsed.includes(st.id);
      const col = h('section.ib-col', { class: isCol ? 'collapsed' : '', dataset: { stage: st.id }, style: `--sc:${st.color}`, role: 'listitem', 'aria-label': `${MA.L(st)}, ${MA.num(items.length)}` });
      const tog = h('button.icon-btn.sm.ib-col-x', { type: 'button', 'aria-label': `${isCol ? t('expand') : t('collapse')}: ${MA.L(st)}`, 'aria-expanded': String(!isCol), 'data-tip': isCol ? t('expand') : t('collapse'), html: MA.icon(isCol ? 'chevRight' : 'chevLeft', 'sm flip'), onclick: e => { e.stopPropagation(); toggleCollapse(st.id); } });
      const cards = h('div.ib-cards', { dataset: { scroll: 'c-' + st.id, empty: t('dropHere') } });
      if (!isCol) items.forEach(l => cards.append(card(l, rid)));
      col.append(h('header.ib-col-h', h('i.ib-sdot'), h('span.ib-col-name', MA.L(st)), h('span.ib-col-n', MA.num(items.length)), h('span.grow'), tog), colSum(items), cards);
      if (isCol) col.addEventListener('click', () => toggleCollapse(st.id));
      board.append(col);
    });
    board.addEventListener('click', e => {
      const c = e.target.closest('.ib-card'); if (!c) return;
      if (e.metaKey || e.ctrlKey) { toggleSel(c.dataset.id); return; }
      open(c.dataset.id, { focus: 'detail' });
    });
    board.addEventListener('contextmenu', e => { const c = e.target.closest('.ib-card'); if (!c) return; e.preventDefault(); rowMenu(c, c.dataset.id); });
    return h('div.ib-board-wrap', h('p.sr-only', { id: 'ib-board-hint' }, sk ? t('boardHint', { key: sk }) : t('boardHintOff')), board);
  }
  function toggleCollapse(id) { const c = new Set(collapsedCols()); if (c.has(id)) c.delete(id); else c.add(id); store.set('collapsed', [...c]); paint(); }
  /** The only celebration: one short Foam line across the Won column. */
  function ripple(stage) {
    const col = S.root?.querySelector(`.ib-col[data-stage="${stage}"]`); if (!col || col.classList.contains('collapsed') || MA.reducedMotion()) return;
    const w = Math.max(60, col.clientWidth), H = 28, pts = [];
    for (let x = 0; x <= w; x += 4) pts.push(`${x},${(H / 2 + Math.sin(x / w * Math.PI * 5) * 7 * Math.sin(x / w * Math.PI)).toFixed(1)}`);
    const svg = MA.frag(`<svg class="ib-ripple" viewBox="0 0 ${w} ${H}" preserveAspectRatio="none" aria-hidden="true"><path pathLength="100" d="M${pts.join(' L')}"/></svg>`);
    col.append(svg); setTimeout(() => svg.remove(), 1000);
  }
  // pointer drag between columns; the placeholder keeps the card's real height. Keyboard path: S (or the Stage button) on a card.
  function bindDrag() {
    const down = e => {
      if (S.view !== 'board' || e.button !== 0 || !canEdit()) return;
      const c = e.target.closest?.('.ib-card'); if (!c || !S.root?.contains(c) || e.target.closest('button,a,input,label')) return;
      S.drag = { card: c, id: c.dataset.id, x: e.clientX, y: e.clientY, pid: e.pointerId, on: false };
    };
    const moveH = e => {
      const d = S.drag; if (!d || e.pointerId !== d.pid) return;
      if (!d.on) { if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return; startDrag(d); }
      d.lx = e.clientX; d.ly = e.clientY;
      d.ghost.style.transform = `translate(${e.clientX - d.ox}px,${e.clientY - d.oy}px)`;
      place(e.clientX, e.clientY); e.preventDefault();
    };
    const up = e => { const d = S.drag; if (!d || e.pointerId !== d.pid) return; if (!d.on) { S.drag = null; return; } endDrag(true); };
    const cancel = e => { const d = S.drag; if (!d || e.pointerId !== d.pid) return; if (d.on) endDrag(false); else S.drag = null; };
    S.root.addEventListener('pointerdown', down);
    addEventListener('pointermove', moveH, { passive: false }); addEventListener('pointerup', up); addEventListener('pointercancel', cancel);
    MA.cleanup(() => { removeEventListener('pointermove', moveH); removeEventListener('pointerup', up); removeEventListener('pointercancel', cancel); if (S.drag?.on) endDrag(false); S.drag = null; });
  }
  function startDrag(d) {
    const r = d.card.getBoundingClientRect();
    d.on = true; d.ox = d.x - r.left; d.oy = d.y - r.top;
    d.ghost = d.card.cloneNode(true); d.ghost.classList.add('ib-ghost'); d.ghost.classList.remove('cur', 'open', 'sel'); d.ghost.removeAttribute('tabindex');
    Object.assign(d.ghost.style, { width: r.width + 'px', transform: `translate(${r.left}px,${r.top}px)` });
    d.gw = h('div.m-inbox.ib-ghostwrap', { 'aria-hidden': 'true' }, d.ghost); document.body.append(d.gw);
    d.ph = h('div.ib-ph', { style: `height:${r.height}px` });
    d.card.after(d.ph); d.card.classList.add('ib-hidden');
    d.to = d.card.closest('.ib-col')?.dataset.stage;
    S.root.classList.add('ib-dragging');
    const tick = () => {
      if (S.drag !== d) return;
      const board = S.root?.querySelector('.ib-board');
      if (board && d.lx != null) {
        const br = board.getBoundingClientRect(), edge = 64;
        if (d.lx < br.left + edge) board.scrollBy({ left: -14 }); else if (d.lx > br.right - edge) board.scrollBy({ left: 14 });
        const list = S.root.querySelector('.ib-col.over:not(.collapsed) .ib-cards');
        if (list) { const lr = list.getBoundingClientRect(); if (d.ly < lr.top + 40) list.scrollBy({ top: -10 }); else if (d.ly > lr.bottom - 40) list.scrollBy({ top: 10 }); }
      }
      d.raf = requestAnimationFrame(tick);
    };
    d.raf = requestAnimationFrame(tick);
  }
  function place(x, y) {
    const d = S.drag, cols = [...S.root.querySelectorAll('.ib-col')];
    const col = cols.find(c => { const r = c.getBoundingClientRect(); return x >= r.left && x <= r.right; });
    cols.forEach(c => c.classList.toggle('over', c === col));
    if (!col) return;
    d.to = col.dataset.stage;
    if (col.classList.contains('collapsed')) { d.ph.hidden = true; return; }
    d.ph.hidden = false;
    const list = col.querySelector('.ib-cards'), cards = [...list.querySelectorAll('.ib-card:not(.ib-hidden)')];
    const before = cards.find(c => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
    if (before) { if (d.ph.nextElementSibling !== before) list.insertBefore(d.ph, before); }
    else if (list.lastElementChild !== d.ph) list.append(d.ph);
  }
  function endDrag(commit) {
    const d = S.drag; S.drag = null; if (!d) return;
    cancelAnimationFrame(d.raf); d.gw?.remove(); S.root?.classList.remove('ib-dragging');
    S.root?.querySelectorAll('.ib-col.over').forEach(c => c.classList.remove('over'));
    const swallow = ev => { ev.stopPropagation(); ev.preventDefault(); };
    addEventListener('click', swallow, { capture: true, once: true }); setTimeout(() => removeEventListener('click', swallow, { capture: true }), 60);
    const l = L.get(d.id);
    if (!commit || !d.to || !l) { d.ph?.remove(); d.card.classList.remove('ib-hidden'); return; }
    const near = dir => { let n = d.ph[dir]; while (n && !(n.classList?.contains('ib-card') && !n.classList.contains('ib-hidden'))) n = n[dir]; return n ? L.get(n.dataset.id) : null; };
    let rank;
    if (d.ph.hidden || !d.ph.isConnected) { const rest = colLeads(boardLeads(), d.to).filter(x => x.id !== d.id); rank = rest.length ? rankKey(rest.at(-1)) + 6e4 : -now(); }
    else { const a = near('previousElementSibling'), b = near('nextElementSibling'); rank = a && b ? (rankKey(a) + rankKey(b)) / 2 : a ? rankKey(a) + 6e4 : b ? rankKey(b) - 6e4 : -now(); }
    if (d.ph.isConnected && !d.ph.hidden) d.ph.replaceWith(d.card); else d.ph.remove();
    d.card.classList.remove('ib-hidden');
    S.cursor = l.id;
    if (d.to !== l.stage) setStage([l.id], d.to, { rank });
    else if (rank !== l.rank) L.update(l.id, { rank });
  }

  /* ================= table ================= */
  const COLS = () => [
    { id: 'name', label: t('col.name'), lock: true, sort: 'name', cell: l => { const nm = display(l), f = srFacts(l); return h('span.ib-tname', h('i.ib-udot'), h('b.truncate', vAttrs(nm), nm), f ? h('span.sr-only', ', ' + f) : null); } },
    { id: 'company', label: t('col.company'), sort: 'company', cell: l => l.company ? h('span.truncate.ib-tco', vAttrs(l.company), l.company) : '—' },
    { id: 'stage', label: t('col.stage'), sort: 'stage', cell: l => h('span.ib-tstage', stagePill(l.stage), lostChip(l)) },
    { id: 'due', label: t('col.due'), sort: 'due', cell: l => hasNext(l) && !isClosed(l) ? h('span.ib-tdue', dueChip(l), l.nextStep ? h('span.truncate', vAttrs(l.nextStep), l.nextStep) : null) : h('span.faint', '—') },
    { id: 'swells', label: t('col.swells'), sort: 'swells', cell: l => (l.waves || []).length ? swellChips(l.waves, 1) : '—' },
    { id: 'services', label: t('col.services'), sort: 'services', cell: l => (l.services || []).length ? svcChips(l.services, 1) : '—' },
    { id: 'words', label: t('col.words'), sort: 'words', cell: l => (l.words || []).length ? h('span.truncate.ib-twords', vAttrs(joinL(l.words)), joinL(l.words)) : '—' },
    { id: 'value', label: t('col.value'), sort: 'value', num: true, cell: l => money(l.value) },
    { id: 'days', label: t('col.days'), sort: 'days', num: true, cell: l => daysChip(l) || '—' },
    { id: 'owner', label: t('col.owner'), sort: 'owner', cell: l => l.owner ? h('span.ib-towner', avatarOf(l.owner, 'xs'), h('span', ownerName(l.owner))) : h('span.faint', t('unassigned')) },
    { id: 'source', label: t('col.source'), sort: 'source', cell: l => { const ch = channelOf(l); return sourceName(l.source) + (ch ? ' · ' + channelName(ch) : ''); } },
    { id: 'lang', label: t('col.lang'), sort: 'lang', cell: l => langBadge(l.lang) },
    { id: 'tags', label: t('col.tags'), sort: 'tags', cell: l => (l.tags || []).length ? h('span', vAttrs(joinL(l.tags)), joinL(l.tags)) : '—' },
    { id: 'email', label: t('col.email'), sort: 'email', cell: l => h('span.ltr', l.email || '—') },
    { id: 'phone', label: t('col.phone'), sort: 'phone', cell: l => h('span.ltr', l.phone || '—') },
    { id: 'at', label: t('col.at'), sort: 'at', cell: l => h('time.ib-tdate', { datetime: l.at, title: fullWhen(l.at) }, qDate(l.at, { year: undefined })) },
    { id: 'lastContact', label: t('col.last'), sort: 'lastContact', cell: l => l.lastContact ? MA.ago(l.lastContact) : h('span.faint', '—') },
  ];
  const visCols = () => { const v = store.get('cols', DEF_COLS); return Array.isArray(v) ? v : DEF_COLS; };
  const tableCols = () => { const vis = visCols(); return COLS().filter(c => c.lock || vis.includes(c.id)); };
  function setSort(key) {
    const s = sortState();
    store.set('sort', s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: ASC_FIRST.includes(key) ? 'asc' : 'desc' }); paint();
  }
  function trOf(l, cols, rid) {
    S.last?.objs.set(l.id, l);
    const sel = S.sel.has(l.id), cb = h('input.check.ib-cb', { type: 'checkbox', checked: sel, tabindex: '-1', 'aria-label': `${t('select')}: ${display(l)}` });
    const tr = h('tr', { tabindex: l.id === rid ? '0' : '-1', 'aria-current': S.openId === l.id ? 'true' : null, dataset: { id: l.id, href: '1' }, class: (S.cursor === l.id ? 'cur ' : '') + (sel ? 'sel ' : '') + (S.openId === l.id ? 'open ' : '') + (l.read ? '' : 'unread ') + (l.sample ? 'is-sample' : '') });
    tr.append(h('td.shrink', cb), h('td.shrink.ib-tstar', l.starred ? starIcon() : null), ...cols.map(c => h('td', { class: c.num ? 'ib-num' : '', dataset: { col: c.id } }, c.cell(l))));
    return tr;
  }
  function tableView(vd) {
    const { list, all } = vd, cols = tableCols(), s = sortState(), rid = rovingId(list.map(l => l.id));
    if (!list.length) return h('div.ib-tempty', emptyFor());
    const allCb = h('input.check', { type: 'checkbox', 'aria-label': t('selectAll'), checked: list.every(l => S.sel.has(l.id)) });
    allCb.indeterminate = !allCb.checked && list.some(l => S.sel.has(l.id));
    allCb.addEventListener('change', () => { if (allCb.checked) list.forEach(l => S.sel.add(l.id)); else list.forEach(l => S.sel.delete(l.id)); syncMarks(); });
    const head = h('tr', h('th.shrink', allCb), h('th.shrink', { 'aria-label': t('star') }),
      cols.map(c => h('th', { class: c.num ? 'ib-num' : '', 'aria-sort': s.key === c.sort ? (s.dir === 'asc' ? 'ascending' : 'descending') : null },
        h('button', { type: 'button', class: 'ib-th' + (s.key === c.sort ? ' on' : ''), onclick: () => setSort(c.sort), dataset: { sort: c.sort, k: 'th-' + c.sort } }, h('span', c.label), h('span', { html: MA.icon(s.key === c.sort && s.dir === 'asc' ? 'chevUp' : 'chevDown', 'sm') })))));
    const body = h('tbody');
    list.forEach(l => body.append(trOf(l, cols, rid)));
    body.addEventListener('click', e => {
      const tr = e.target.closest('tr[data-id]'); if (!tr) return;
      if (e.target.closest('.ib-cb')) { toggleSel(tr.dataset.id); return; }
      if (e.metaKey || e.ctrlKey) { toggleSel(tr.dataset.id); return; }
      if (e.shiftKey && S.cursor) { rangeSel(S.cursor, tr.dataset.id); return; }
      open(tr.dataset.id, { focus: 'detail' });
    });
    body.addEventListener('contextmenu', e => { const tr = e.target.closest('tr[data-id]'); if (!tr) return; e.preventDefault(); rowMenu(tr, tr.dataset.id); });
    const wrap = h('div.table-wrap.ib-twrap', { dataset: { fit: 'max', scroll: 't' } }, h('table.table.ib-table', { 'aria-label': t('queue'), 'aria-describedby': 'ib-list-hint' }, h('thead', head), body));
    const more = all.length - list.length;
    return h('div.ib-tbox', h('p.sr-only', { id: 'ib-list-hint' }, t('listHint')), wrap, more > 0 ? h('div.ib-tmore', h('button.ib-link.ib-more', { type: 'button', dataset: { k: 'more' }, onclick: showMore }, t('showMore', { n: MA.num(Math.min(more, LIMIT)) }))) : null);
  }
  function colsPop(anchor) {
    const box = h('div.m-inbox.ib-fpop', h('p.label.ib-fpop-h', t('columns')));
    COLS().filter(c => !c.lock).forEach(c => {
      const cb = h('input.check', { type: 'checkbox', checked: visCols().includes(c.id) });
      cb.addEventListener('change', () => { const v = new Set(visCols()); if (cb.checked) v.add(c.id); else v.delete(c.id); store.set('cols', COLS().map(x => x.id).filter(id => v.has(id))); paint(); });
      box.append(h('label.ib-optrow', { dataset: { col: c.id } }, cb, h('span.grow', c.label)));
    });
    ui.pop(anchor, box, { align: 'end', width: 240, label: t('columns') });
  }

  /* ================= drawer (board + table) ================= */
  function syncDrawer() {
    const l = S.openId && L.get(S.openId);
    if (S.view === 'list' || !l || isTrash()) { closeDrawer(); return; }
    if (!S.drawer) {
      S.drawer = ui.drawer({ title: esc(t('briefTitle')), width: 640, modal: false, onClose: () => {
        S.drawer = null;
        if (S.quiet || !S.mounted) return;
        if (S.openId) { S.cursor = S.openId; want('row', S.openId); S.openId = null; MA.go(baseHash()); }
      } });
      S.drawer.el.classList.add('ib-drawer');
    }
    const body = S.drawer.body, same = body.dataset.lead === l.id, top = body.scrollTop;
    body.innerHTML = ''; body.append(h('div.m-inbox.ib-dhost', detail(l)));
    body.dataset.lead = l.id; body.scrollTop = same ? top : 0;
  }
  function closeDrawer() { if (!S.drawer) return; const d = S.drawer; S.quiet = true; try { d.close(true); } finally { S.quiet = false; } S.drawer = null; }

  /* ================= header, toolbar, tabs, bulk bar ================= */
  function setView(v) {
    if (!VIEWS.includes(v) || v === S.view) return;
    S.view = v; store.set('view', v); S.sel.clear(); S.limit = LIMIT;
    if (v !== 'list' && S.openId) { S.cursor = S.openId; S.openId = null; MA.go(baseHash(), { replace: true }); return; }
    paint();
  }
  const cycleView = () => setView(VIEWS[(VIEWS.indexOf(S.view) + 1) % VIEWS.length]);
  function paintHead() {
    const el = S.els.head;
    const all = L.all(), openL = all.filter(l => !l.archived && !isClosed(l)), reply = all.filter(l => !l.archived && !isSnoozed(l) && needsReply(l)).length;
    const pipe = openL.reduce((s, l) => s + (hasVal(l.value) ? +l.value : 0), 0), samp = openL.some(l => l.sample && hasVal(l.value));
    const sub = all.length ? t('headSub', { reply: MA.num(reply), open: MA.num(openL.length), value: esc(money(pipe)) }) : t('headEmpty');
    const key = [sub, samp, S.view, canEdit(), MA.lang()].join('|');
    if (el.dataset.key === key && el.firstChild) return; // nothing changed: keep the buttons (and focus) as they are
    el.dataset.key = key; el.innerHTML = '';
    const k = MA.keys.label('mod+b');
    const seg = ui.seg([{ value: 'list', icon: 'list', label: t('vList'), title: `${t('vList')} · ${k}` }, { value: 'board', icon: 'board', label: t('vBoard'), title: `${t('vBoard')} · ${k}` }, { value: 'table', icon: 'pages', label: t('vTable'), title: `${t('vTable')} · ${k}` }],
      S.view, v => setView(v), { size: 'sm', label: t('viewLabel') });
    seg.classList.add('ib-viewseg');
    const head = ui.pageHead({ title: esc(MA.L(MOD.title)), sub, actions: [seg, canEdit() ? ui.btn(t('newBrief'), { icon: 'plus', kind: 'primary', onclick: newBrief }) : null,
      ui.iconBtn('more', { tip: MA.t('more'), menu: true, onclick: e => moreMenu(e.currentTarget) })].filter(Boolean) });
    head.querySelector('.actions [data-tip]')?.setAttribute('data-tip-pos', 'bottom');
    if (samp) head.querySelector('.lead')?.append(' ', ui.sample());
    el.append(head);
  }
  function toolbar() {
    const inp = h('input.input.ib-search-in', { type: 'search', placeholder: t('searchPh'), 'aria-label': t('searchPh'), autocomplete: 'off', spellcheck: false });
    inp.value = S.f.q;
    const onInput = MA.debounce(() => { if (S.f.q === inp.value.trim()) return; S.f.q = inp.value.trim(); changed({ keepSearch: true }); }, 140);
    inp.addEventListener('input', onInput);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); if (inp.value) { inp.value = ''; S.f.q = ''; changed({ keepSearch: true }); } else inp.blur(); }
      else if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); inp.blur(); const ids = navIds(); if (!S.cursor || !ids.includes(S.cursor)) move(1); else { want('row', S.cursor); focusCur(); } }
    });
    S.els.search = inp; S.els.chips = h('div.ib-chips'); S.els.tools = h('div.ib-tools');
    return h('div.toolbar.ib-bar',
      h('div.search.ib-search', MA.frag(MA.icon('search', 'sm')), inp, h('kbd', { 'aria-hidden': 'true' }, '/')),
      ui.btn(t('filter'), { icon: 'filter', size: 'sm', kind: 'ghost', onclick: e => fieldMenu(e.currentTarget) }),
      S.els.chips, S.els.tools);
  }
  function paintTools() {
    const el = S.els.tools; el.innerHTML = '';
    if (S.view !== 'board') el.append(ui.btn(t('sort'), { icon: 'sort', size: 'sm', kind: 'ghost', onclick: e => sortMenu(e.currentTarget) }));
    if (S.view === 'table') el.append(ui.btn(t('columns'), { icon: 'columns', size: 'sm', kind: 'ghost', onclick: e => colsPop(e.currentTarget) }));
    if (noteHidden()) el.append(ui.iconBtn('info', { tip: t('showNote'), size: 'sm', onclick: showNote }));
    const nt = L.trash().length;
    if (nt) { const tb = ui.iconBtn('trash', { tip: t('trashN', { n: MA.num(nt) }), size: 'sm', onclick: openTrash }); tb.dataset.k = 'trashbtn'; el.append(tb); }
    el.append(ui.iconBtn('keyboard', { tip: t('shortcuts'), size: 'sm', onclick: e => keysPop(e.currentTarget) }));
  }
  function paintTabs() {
    const el = S.els.tabs, body = S.els.body; el.innerHTML = ''; S.els.tablist = null;
    const off = S.view === 'board' || isTrash(); el.hidden = off;
    if (off) { ['role', 'aria-labelledby', 'tabindex'].forEach(a => body.removeAttribute(a)); return; }
    const c = counts();
    if (!body.hasAttribute('tabindex')) body.tabIndex = -1; // the rows are the Tab stop, not the panel
    const tl = S.els.tablist = ui.tabs(TABS.map(k => ({ value: k, label: t('tab.' + k), count: MA.num(c[k]) })), S.f.tab, v => { S.f.tab = v; changed(); }, { label: t('tabsL'), panel: body });
    el.append(tl);
    // one sample stamp for the whole queue; the rows themselves carry a quiet dotted edge
    const samp = h('span.ib-tabs-samp'); el.append(samp); paintSampleStamp();
  }
  function paintSampleStamp() {
    const slot = S.els.tabs?.querySelector('.ib-tabs-samp'); if (!slot) return;
    const on = !!S.last && [...S.last.objs.values()].some(l => l.sample);
    if (on === !!slot.firstChild) return;
    slot.innerHTML = ''; if (on) { const b = ui.sample(); b.title = t('sampleKey'); slot.append(b); }
  }
  function patchTabs() {
    const tl = S.els.tablist; if (!tl) return;
    const c = counts(); TABS.forEach(k => tl.setCount(k, MA.num(c[k])));
    paintSampleStamp();
  }
  function paintBulk() {
    const bar = S.els.bulk; if (!bar) return;
    const ids = [...S.sel], key = ids.join(',') + '|' + S.team + '|' + canEdit();
    if (bar.dataset.key === key) return;
    const had = bar.contains(document.activeElement);
    bar.dataset.key = key; bar.innerHTML = ''; bar.hidden = !ids.length;
    if (!ids.length) return;
    const edit = canEdit();
    bar.append(...[h('span.ib-bulk-n', { role: 'status' }, t('nSelected', { n: MA.num(ids.length) })),
      edit && S.team ? ui.btn(t('assign'), { icon: 'user', size: 'sm', onclick: e => assignMenu(e.currentTarget, ids) }) : null,
      edit ? ui.btn(t('stage'), { icon: 'flag', size: 'sm', onclick: e => stageMenu(e.currentTarget, ids) }) : null,
      edit ? ui.btn(t('archive'), { icon: 'archive', size: 'sm', onclick: () => archiveIds(ids) }) : null,
      edit ? ui.btn(MA.t('delete'), { icon: 'trash', size: 'sm', onclick: () => deleteIds(ids) }) : null,
      ui.btn(t('exportCsv'), { icon: 'download', size: 'sm', onclick: () => exportCsv(leadsOf(ids)) }),
      ui.iconBtn('close', { tip: t('clearSel'), size: 'sm', onclick: () => { S.sel.clear(); syncMarks(); want('row', S.cursor); focusCur(); } })].filter(Boolean));
    if (had) bar.querySelector('button')?.focus();
  }

  /* ================= paint (full) · patch (one brief changed) · focus ================= */
  const scopeEls = sel => [...(S.root?.querySelectorAll(sel) || []), ...(S.drawer?.el.querySelectorAll(sel) || [])];
  const ITEM = '.ib-row,.ib-card,tbody tr[data-id]';
  const itemEl = id => id ? S.els.body?.querySelector(`[data-id="${CSS.escape(id)}"]:is(.ib-row,.ib-card,tr)`) : null;
  function schedule(full) { if (full === true) S.full = true; if (S.pending) return; S.pending = true; queueMicrotask(() => { if (S.pending) refresh(); }); }
  function refresh() { const full = S.full; S.pending = false; S.full = false; if (!S.mounted || !S.root?.isConnected) return; if (full || !S.last) paint(); else patch(); }
  /** What had focus before a redraw, so the same thing has it after. */
  function focusMemo() {
    const a = document.activeElement, inside = a && (S.root?.contains(a) || S.drawer?.el.contains(a));
    if (!inside) return { k: S.refocus };
    return { k: S.refocus || a.dataset?.k || (a.dataset?.act ? 'act:' + a.dataset.act : null), item: a.matches(ITEM), detail: a.closest('.ib-detail')?.dataset.id || null };
  }
  function focusCur() { const el = itemEl(S.cursor); if (el) { el.focus({ preventScroll: true }); el.scrollIntoView?.({ block: 'nearest' }); } return el; }
  function restoreFocus(m) {
    S.refocus = null;
    const w = S.want && now() - S.want.at < 4000 ? S.want : (S.want = null);
    if (w?.kind === 'detail') {
      const hd = scopeEls(`.ib-detail[data-id="${CSS.escape(w.id)}"] .ib-d-title h2`)[0];
      if (hd) { S.want = null; hd.focus({ preventScroll: true }); return; }
      if (S.openId === w.id) return; // the brief isn't drawn yet: keep the wish for the next paint
    }
    if (w?.kind === 'row' || m.item) { if (w?.kind === 'row') S.want = null; if (focusCur()) return; }
    if (m.k) {
      const sel = m.k.startsWith('act:') ? `[data-act="${CSS.escape(m.k.slice(4))}"]` : `[data-k="${CSS.escape(m.k)}"]`;
      const el = (m.detail ? scopeEls(`.ib-detail[data-id="${CSS.escape(m.detail)}"] ${sel}`)[0] : null) || scopeEls(sel)[0];
      if (el) { el.focus({ preventScroll: true }); if (m.k === 'note') { try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} } }
      else if (m.k.startsWith('trash-')) scopeEls('[data-k^="trash-"]').at(-1)?.focus() || scopeEls('[data-k=trashback]')[0]?.focus();
    }
  }
  const runAfter = () => S.after.splice(0).forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  function paint() {
    S.pending = false; S.full = false;
    if (!S.mounted || !S.root?.isConnected) return;
    const ids = new Set(L.all().map(l => l.id));
    [...S.sel].forEach(id => { if (!ids.has(id)) S.sel.delete(id); });
    if (S.openId && !ids.has(S.openId)) S.openId = null;
    const scroll = {}; scopeEls('[data-scroll]').forEach(el => { scroll[el.dataset.scroll] = [el.scrollTop, el.scrollLeft]; });
    const memo = focusMemo();
    S.team = teamOn();
    const vd = viewData();
    S.last = { sig: vd.sig, view: S.view, objs: new Map(), open: null };
    paintHead(); paintNote(); S.els.bar.hidden = isTrash(); paintChips(); paintTools();
    const body = S.els.body; body.innerHTML = ''; body.className = 'ib-body ib-v-' + vd.kind;
    body.append(vd.kind === 'trash' ? trashView() : vd.kind === 'board' ? boardView(vd) : vd.kind === 'table' ? tableView(vd) : listView(vd));
    paintTabs(); paintStrip();
    S.root.classList.toggle('ib-selecting', S.sel.size > 0);
    syncDrawer(); paintBulk();
    scopeEls('[data-scroll]').forEach(el => { const v = scroll[el.dataset.scroll]; if (v) { el.scrollTop = v[0]; el.scrollLeft = v[1]; } });
    restoreFocus(memo);
    if (S.reveal) { S.reveal = false; itemEl(S.cursor)?.scrollIntoView?.({ block: 'nearest' }); }
    fit();
    runAfter();
  }
  /** A brief changed but the list kept its shape: swap that row (and the open brief), update counts. No full redraw. */
  function patch() {
    const vd = viewData();
    if (!S.last || vd.sig !== S.last.sig || S.last.view !== S.view || S.team !== teamOn()) return paint();
    const byId = new Map(L.all().map(l => [l.id, l]));
    if (S.openId && !byId.has(S.openId)) return paint();
    [...S.sel].forEach(id => { if (!byId.has(id)) S.sel.delete(id); });
    const memo = focusMemo(), cols = vd.kind === 'table' ? tableCols() : null, rid = rovingId([...S.last.objs.keys()]);
    for (const [id, old] of [...S.last.objs]) {
      const l = byId.get(id); if (!l) return paint(); if (l === old) continue;
      const el = itemEl(id); if (!el) continue;
      el.replaceWith(vd.kind === 'board' ? card(l, rid) : vd.kind === 'table' ? trOf(l, cols, rid) : row(l, rid));
    }
    if (vd.kind === 'board') vd.groups.forEach((items, i) => {
      const col = S.els.body.querySelector(`.ib-col[data-stage="${L.STAGES[i].id}"]`); if (!col) return;
      col.querySelector('.ib-col-sum')?.replaceWith(colSum(items)); const n = col.querySelector('.ib-col-n'); if (n) n.textContent = MA.num(items.length);
    });
    const ol = S.openId ? byId.get(S.openId) : null;
    if (ol && ol !== S.last.open) {
      if (S.view === 'list') {
        const pane = S.els.body.querySelector('.ib-pane');
        if (pane) { const same = pane.dataset.lead === ol.id, top = pane.scrollTop; pane.replaceChildren(detail(ol)); pane.dataset.lead = ol.id; pane.dataset.scroll = 'd-' + ol.id; pane.scrollTop = same ? top : 0; }
      } else syncDrawer();
    } else if (!ol && S.drawer) closeDrawer();
    paintHead(); patchTabs(); paintStrip(); syncMarks();
    restoreFocus(memo);
    if (S.reveal) { S.reveal = false; itemEl(S.cursor)?.scrollIntoView?.({ block: 'nearest' }); }
    runAfter();
  }
  /** Cursor, selection and "open" marks on the drawn rows, plus the one Tab stop (roving tabindex). */
  function syncMarks() {
    const body = S.els.body; if (!body || !S.root) return;
    const items = [...body.querySelectorAll(ITEM)], rid = rovingId(items.map(x => x.dataset.id));
    items.forEach(el => {
      const id = el.dataset.id, sel = S.sel.has(id), op = S.openId === id;
      el.classList.toggle('cur', S.cursor === id); el.classList.toggle('sel', sel); el.classList.toggle('open', op);
      el.tabIndex = id === rid ? 0 : -1;
      if (el.classList.contains('ib-row')) el.setAttribute('aria-selected', String(sel));
      if (op) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
      const cb = el.querySelector('.ib-cb'); if (cb) cb.checked = sel;
    });
    const all = body.querySelector('thead .check');
    if (all) { const ids = items.map(x => x.dataset.id); all.checked = ids.length > 0 && ids.every(id => S.sel.has(id)); all.indeterminate = !all.checked && ids.some(id => S.sel.has(id)); }
    S.root.classList.toggle('ib-selecting', S.sel.size > 0);
    paintBulk();
  }
  function fit() {
    if (!S.root) return;
    const el = S.root.querySelector('[data-fit]');
    S.root.classList.toggle('ib-fit', !!el && el.dataset.fit === 'h');
    if (!el) return;
    const vh = document.documentElement.clientHeight || innerHeight, top = el.getBoundingClientRect().top + scrollY, avail = Math.max(440, vh - top - 18);
    if (el.dataset.fit === 'h') el.style.height = avail + 'px'; else el.style.maxHeight = avail + 'px';
  }

  /* ================= keyboard ================= */
  /** j/k, ↑/↓: the cursor moves and takes focus; in the list (or with the drawer open) the brief opens alongside. */
  function move(d, from, { extend } = {}) {
    const ids = navIds(); if (!ids.length) return;
    const cur = [from, S.cursor, S.openId].find(x => x && ids.includes(x));
    const i = cur ? MA.clamp(ids.indexOf(cur) + d, 0, ids.length - 1) : (d >= 0 ? 0 : ids.length - 1);
    goTo(ids[i], { extend });
  }
  function goTo(id, { extend } = {}) {
    if (!id) return;
    if (extend) { if (S.cursor) S.sel.add(S.cursor); S.sel.add(id); }
    S.cursor = id; S.reveal = true; want('row', id);
    if ((S.view === 'list' || S.drawer) && id !== S.openId) open(id, { replace: true });
    else { if (!itemEl(id)) { paint(); return; } syncMarks(); restoreFocus({}); }
  }
  /** Keys on a focused row, card or table row: the listbox / grid keys (not single-key shortcuts, so they always work). */
  function onItemKey(e) {
    const it = e.target.closest?.(ITEM); if (!it || e.target !== it || e.altKey || e.metaKey || e.ctrlKey || e.defaultPrevented) return;
    const k = e.key, id = it.dataset.id;
    if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); move(k === 'ArrowDown' ? 1 : -1, id, { extend: e.shiftKey }); }
    else if (k === 'Home' || k === 'End') { e.preventDefault(); const ids = navIds(); goTo(k === 'Home' ? ids[0] : ids.at(-1)); }
    else if ((k === 'ArrowLeft' || k === 'ArrowRight') && S.view === 'board') {
      e.preventDefault();
      const cols = [...S.els.body.querySelectorAll('.ib-col:not(.collapsed)')], col = it.closest('.ib-col'), i = cols.indexOf(col), at = [...col.querySelectorAll('.ib-card')].indexOf(it);
      const dir = (k === 'ArrowRight') !== (document.dir === 'rtl') ? 1 : -1;
      for (let j = i + dir; j >= 0 && j < cols.length; j += dir) { const cards = cols[j].querySelectorAll('.ib-card'); if (cards.length) { goTo(cards[Math.min(at, cards.length - 1)].dataset.id); break; } }
    }
    else if (k === ' ') { e.preventDefault(); toggleSel(id); }
    else if (k === 'Enter') { e.preventDefault(); keyEnter(e); }
  }
  function onItemFocus(e) { const it = e.target.closest?.(ITEM); if (it && e.target === it && it.dataset.id !== S.cursor) { S.cursor = it.dataset.id; syncMarks(); } }
  function anchorFor(act) {
    const id = targets()[0];
    return scopeEls(`.ib-detail[data-id="${CSS.escape(id || '')}"] [data-act="${act}"]`)[0] || itemEl(id) || S.els.search;
  }
  /** Enter on a focused control means "press it", not "open the brief" (bindView has already taken the default action). */
  const CONTROL = 'button,a[href],[role=button],summary,label';
  function keyEnter(e) {
    const c = e?.target?.closest?.(CONTROL); if (c && c !== document.body) { c.click(); return; }
    const it = e?.target?.closest?.(ITEM), list = navIds(), id = it?.dataset.id || (S.cursor && list.includes(S.cursor) ? S.cursor : list[0]);
    if (!id) return;
    if (id === S.openId && (S.view === 'list' || S.drawer)) { want('detail', id); restoreFocus({}); return; }
    open(id, { focus: 'detail' });
  }
  function keyEsc() {
    if (S.drag?.on) endDrag(false);
    else if (S.sel.size) { S.sel.clear(); syncMarks(); }
    else if (hasFilters(S.f) || S.f.snoozed) clearFilters();
    else if (S.openId && S.view === 'list') { S.cursor = S.openId; want('row', S.openId); closeOpen(); }
  }
  const editOn = fn => () => { const ids = targets(); if (canEdit() && ids.length) fn(ids); };
  const del = editOn(ids => deleteIds(ids));
  /** One key map: bound through the core (bindView) and replayed by onDrawerKey while the brief drawer is open. A is there only with a real team. */
  const keymap = () => [
    ['j', () => move(1), 'k.next'], ['k', () => move(-1), 'k.prev'], ['enter', keyEnter, 'k.open'],
    ['x', () => toggleSel(S.cursor || S.openId), 'k.select'],
    ['e', editOn(ids => archiveIds(ids)), 'k.archive'],
    ['s', editOn(ids => stageMenu(anchorFor('stage'), ids)), 'k.stage'],
    ...(S.team ? [['a', editOn(ids => assignMenu(anchorFor('assign'), ids)), 'k.assign']] : []),
    ['r', () => { const l = L.get(S.openId || S.cursor); if (l) reply(l); }, 'k.reply'],
    ['backspace', del, 'k.delete'], ['delete', del, null],
    ['/', () => focusSearch(), 'k.search'], ['escape', keyEsc, 'k.esc'], ['mod+b', () => cycleView(), 'k.view'],
  ];
  const runKey = fn => e => { if (!S.mounted) return; if (S.drag?.on && fn !== keyEsc) return; fn(e); };
  function bindKeys() { keymap().forEach(([combo, fn, desc]) => MA.keys.bindView(combo, runKey(fn), desc ? () => t(desc) : null)); }
  // the same physical-key reading as the core (event.code), so the keys work on an Arabic or Persian layout
  const comboOf = e => {
    let key = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : e.code === 'Slash' ? '/' : String(e.key || '').toLowerCase();
    if (e.shiftKey && key === '/') key = '?';
    return (e.shiftKey && key !== '?' ? 'shift+' : '') + (e.metaKey || e.ctrlKey ? 'mod+' : '') + (e.altKey ? 'alt+' : '') + key;
  };
  /** The core ignores single keys while a layer is open; our brief drawer is non-modal, so keys keep working there. */
  function onDrawerKey(e) {
    if (!S.mounted || !S.drawer || e.defaultPrevented || e.isComposing) return;
    if (!MA.keys.singleOn()) return; // single-key shortcuts are off (Customize › Keyboard)
    if (document.querySelector('.scrim')) return; // a dialog, menu or the palette sits on top
    if (e.target.closest?.('input,textarea,select,[contenteditable=true]')) return;
    const combo = comboOf(e); if (combo.includes('mod+') || combo === 'escape') return; // the core still handles these
    const k = keymap().find(x => MA.keys.effective(x[0]) === combo); if (!k) return;
    e.preventDefault(); runKey(k[1])(e);
  }
  const focusSearch = () => { if (!S.els.search) return; S.els.search.focus(); S.els.search.select(); };

  /* ================= new brief ================= */
  function newBrief() {
    if (!canEdit()) return;
    if (!S.mounted) { MA.go('#/inbox'); setTimeout(newBrief, 80); return; }
    const st = { lang: 'en', waves: new Set(), source: 'manual', owner: MA.team.me()?.id || '' };
    const name = h('input.input', { autocomplete: 'off', dir: 'auto', autofocus: true, name: 'name' }), email = h('input.input', { type: 'email', dir: 'ltr', autocomplete: 'off', name: 'email' });
    const phone = h('input.input', { type: 'tel', dir: 'ltr', autocomplete: 'off', name: 'phone' }), company = h('input.input', { dir: 'auto', autocomplete: 'off', name: 'company' });
    const value = h('input.input', { type: 'number', min: '0', step: '1000', dir: 'ltr', inputmode: 'numeric', name: 'value' }), msg = h('textarea.textarea', { rows: 4, placeholder: t('messagePh'), dir: 'ltr', name: 'message' });
    const errName = h('p.err', { hidden: true }, t('errName')), errEmail = h('p.err', { hidden: true }, t('errEmail'));
    const chips = h('div.ib-chipset', { role: 'group' }), svcBox = h('div.ib-chipset.ib-svcset', { role: 'group' });
    st.services = new Set();
    services().forEach(x => {
      const b = h('button.tag', { type: 'button', 'aria-pressed': 'false', dataset: { svc: x.id }, title: svcGroup(x.id) }, h('i.ib-odot', { style: `--sc:${svcTint(x.id)}` }), h('span', sAttrs(), svcName(x.id)));
      b.addEventListener('click', () => { if (st.services.has(x.id)) st.services.delete(x.id); else st.services.add(x.id); b.setAttribute('aria-pressed', String(st.services.has(x.id))); });
      svcBox.append(b);
    });
    swells().forEach(s => {
      const b = h('button.tag', { type: 'button', 'aria-pressed': 'false', dataset: { id: s.id } }, h('i.ib-odot', { style: `--sc:${swellTint(s.id)}` }), h('span', sAttrs(), swellName(s.id)));
      b.addEventListener('click', () => { if (st.waves.has(s.id)) st.waves.delete(s.id); else st.waves.add(s.id); b.setAttribute('aria-pressed', String(st.waves.has(s.id))); });
      chips.append(b);
    });
    const f = (label, ctl, extra, cls = '') => { const fe = ui.field(label, ctl); if (extra) { fe.append(extra); if (!extra.id) extra.id = MA.uid('err'); const c = fe.querySelector('input,textarea,select'); c?.setAttribute('aria-describedby', [c.getAttribute('aria-describedby'), extra.id].filter(Boolean).join(' ')); } if (cls) fe.classList.add(cls); return fe; };
    const group = (label, box, cls) => { const lid = MA.uid('grp'); box.setAttribute('aria-labelledby', lid); return h('div.field' + (cls ? '.' + cls : ''), h('span.field-label', { id: lid }, label), box); };
    const body = h('div.m-inbox.ib-form',
      f(t('name'), name, errName), f(t('company'), company), f(t('email'), email, errEmail), f(t('phone'), phone),
      f(t('lang'), ui.seg([{ value: 'en', label: langName('en') }, { value: 'ar', label: langName('ar') }], 'en', v => { st.lang = v; msg.dir = v === 'ar' ? 'rtl' : 'ltr'; msg.lang = v; }, { size: 'sm', label: t('lang') })),
      f(t('valueQar'), value),
      group(t('swells'), chips, 'span2'),
      services().length ? group(t('servicesL'), svcBox, 'span2') : null,
      f(t('source'), ui.select(L.SOURCES.filter(s => s.id !== 'import').map(s => ({ value: s.id, label: MA.L(s) })), st.source, v => { st.source = v; })),
      teamOn() ? f(t('owner'), ui.select([{ value: '', label: t('unassigned') }, ...MA.team.all().map(m => ({ value: m.id, label: m.name }))], st.owner, v => { st.owner = v; })) : null,
      f(t('messageL'), msg, null, 'span2'));
    ui.modal({ title: t('newTitle'), body, size: 'wide', actions: [{ label: MA.t('cancel'), kind: 'ghost' }, { label: t('addBrief'), kind: 'primary', icon: 'plus', run: () => {
      const nm = name.value.trim(), em = email.value.trim();
      errName.hidden = !!nm; errEmail.hidden = !em || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
      name.toggleAttribute('aria-invalid', !errName.hidden); email.toggleAttribute('aria-invalid', !errEmail.hidden);
      if (!errName.hidden) { name.focus(); return false; }
      if (!errEmail.hidden) { email.focus(); return false; }
      const v = value.value.trim();
      const l = L.add({ name: nm, email: em, phone: phone.value.trim(), company: company.value.trim(), lang: st.lang, waves: swells().map(s => s.id).filter(id => st.waves.has(id)), services: services().map(x => x.id).filter(id => st.services.has(id)), words: [],
        value: v === '' ? null : (Math.max(0, Math.round(+v)) || null), source: st.source, owner: st.owner, message: msg.value.trim() });
      MA.activity.log({ action: 'lead.add', target: nm, module: 'inbox', href: '#/inbox/' + l.id });
      S.keep.add(l.id);
      MA.toast(t('added', { name: esc(nm) }), { icon: 'plus', undo: () => { L.remove([l.id]); if (S.openId === l.id) closeOpen(); } });
      open(l.id, { focus: 'detail' });
    } }] });
  }

  /* ================= import · export · site ================= */
  function parseImport(text, name) {
    text = String(text || '').replace(/^﻿/, '').trim();
    let raw;
    if (/\.json$/i.test(name || '') || /^[[{]/.test(text)) {
      const j = JSON.parse(text);
      raw = Array.isArray(j) ? j : Array.isArray(j?.leads) ? j.leads : Array.isArray(j?.briefs) ? j.briefs : null;
      if (!raw) throw new Error('not a list');
      raw = raw.filter(r => r && typeof r === 'object').map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Array.isArray(v) ? v.join(';') : MA.isObj(v) ? Object.entries(v).map(([a, b]) => `${a}=${b}`).join('; ') : (v ?? '')])));
    } else raw = MA.csv.parse(text);
    // MA.leads.fromRows knows the classic columns; services, words, next step and due (our own CSV export, or JSON from the site) are read here
    const col = (r, re) => { for (const k of Object.keys(r)) if (re.test(k.toLowerCase().replace(/[^a-z]/g, ''))) return r[k]; return ''; };
    const list = v => String(v || '').split(';').map(x => x.trim()).filter(Boolean);
    const svcId = x => services().find(sv => sv.id === x || ['en', 'ar'].some(lg => MA.strip(sv[lg]?.name || '').toLowerCase() === x.toLowerCase()))?.id;
    const leads = raw.map(r => {
      const l = L.fromRows([r])[0]; if (!l) return null;
      const sv = [...new Set(list(col(r, /^services$/)).map(svcId).filter(Boolean))], wd = list(col(r, /^(words|wordscaught)$/));
      const nx = String(col(r, /^nextstep$/) || '').trim(), due = String(col(r, /^due$/) || '').trim(), ld = String(col(r, /^(landing|landingpage)$/) || '').trim();
      return { ...l, ...(sv.length ? { services: sv } : {}), ...(wd.length ? { words: wd } : {}), ...(nx ? { nextStep: nx.slice(0, 200) } : {}), ...(isDay(due) ? { due } : {}), ...(ld ? { landing: ld.slice(0, 300) } : {}) };
    }).filter(Boolean);
    return { total: raw.length, leads };
  }
  function importDlg() {
    if (!canEdit()) return null;
    if (!S.mounted) { MA.go('#/inbox'); setTimeout(importDlg, 80); return null; }
    let rows = [], skipDupes = true, dupes = new Set();
    const pending = () => skipDupes ? rows.filter(r => !dupes.has(r)) : rows;
    const prev = h('div.ib-imp', { 'aria-live': 'polite' });
    const zone = h('div.dropzone.ib-zone', { tabindex: '0', role: 'button', 'aria-label': t('dropTitle') }, MA.frag(MA.icon('upload', 'lg')), h('b', t('dropTitle')), h('p.small.faint', t('dropHint')));
    const fail = () => { rows = []; prev.innerHTML = ''; prev.append(h('div.callout.bad', MA.frag(MA.icon('warn')), h('p', t('readFail')))); updateBtn(); };
    const load = file => (M.reading = (async () => { try { show(parseImport(await (file.text ? file.text() : MA.readText(file)), file.name), file.name); } catch (e) { fail(); } })());
    zone.addEventListener('click', async () => { const [file] = await MA.pickFile({ accept: '.csv,.json,.txt,text/csv,application/json' }); if (file) load(file); });
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zone.click(); } });
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('over'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('over'); const file = e.dataTransfer?.files?.[0]; if (file) load(file); });
    const M = ui.modal({ title: t('importTitle'), size: 'wide', body: h('div.m-inbox.ib-import', zone, prev), actions: [{ label: MA.t('cancel'), kind: 'ghost' },
      { label: t('importCount', { n: 0 }), kind: 'primary', icon: 'upload', disabled: true, run: () => { const list = pending(); if (!list.length) return false; doImport(list); } }] });
    const okBtn = M.el.querySelector('.modal-foot .btn.primary');
    function updateBtn() { const n = pending().length; okBtn.disabled = !n; okBtn.querySelector('span').textContent = t('importCount', { n: MA.num(n) }); }
    function show(res, fileName) {
      rows = res.leads;
      const have = new Set(L.raw().map(l => (l.email || '').toLowerCase()).filter(Boolean));
      dupes = new Set(rows.filter(r => r.email && have.has(r.email.toLowerCase())));
      prev.innerHTML = ''; zone.classList.add('compact');
      const big = h('p.h2.ib-imp-n');
      const drawBig = () => { const k = pending().length; big.textContent = k === 1 ? t('willAddOne') : k ? t('willAdd', { n: MA.num(k) }) : t('willAddNone'); };
      drawBig();
      prev.append(h('div.ib-imp-file', MA.frag(MA.icon('file', 'sm')), h('span.ltr.truncate', fileName || '')), big);
      if (res.total > rows.length) prev.append(h('p.small.muted', t('skippedRows', { n: MA.num(res.total - rows.length) })));
      if (dupes.size) {
        const cb = h('input.check', { type: 'checkbox', checked: true });
        cb.addEventListener('change', () => { skipDupes = cb.checked; drawBig(); drawRows(); updateBtn(); });
        prev.append(h('label.ib-optrow.ib-dupes', cb, h('span', t('dupes', { n: MA.num(dupes.size) }))));
      }
      // the rows that will be added first; skipped duplicates stay visible but faded and labelled
      const tb = h('tbody'), more = h('p.tiny.faint');
      function drawRows() {
        const skip = r => skipDupes && dupes.has(r), order = [...rows.filter(r => !skip(r)), ...rows.filter(skip)];
        tb.innerHTML = '';
        order.slice(0, 6).forEach(r => tb.append(h('tr', { class: skip(r) ? 'is-skip' : '' }, h('td', h('span.ib-impname', h('b', vAttrs(r.name || ''), r.name || '—'), skip(r) ? h('span.badge.ib-impskip', t('inInbox')) : null)), h('td', h('span.ltr', r.email || '—')), h('td', vAttrs(r.company || ''), r.company || '—'),
          h('td', (r.waves || []).length ? swellChips(r.waves, 2) : '—'), h('td.ib-num', money(r.value)), h('td', h('time.ib-tdate', qDate(r.at, { year: undefined }))))));
        more.textContent = rows.length > 6 ? t('moreRows', { n: MA.num(rows.length - 6) }) : '';
      }
      if (rows.length) {
        drawRows();
        prev.append(h('div.table-wrap.ib-imp-table', h('table.table', h('thead', h('tr', [t('col.name'), t('col.email'), t('col.company'), t('col.swells'), t('col.value'), t('col.at')].map((x, i) => h('th', { class: i === 4 ? 'ib-num' : '' }, x)))), tb)), more);
      }
      updateBtn();
    }
    M.importText = (text, name) => { try { show(parseImport(text, name), name); } catch (e) { fail(); } };
    return M;
  }
  function doImport(list) {
    const me = MA.team.me(), ids = [];
    list.slice().reverse().forEach(r => { const l = L.add({ ...r, stageAt: r.at, timeline: [{ at: r.at, type: 'created', text: 'Imported', by: me?.id || '' }] }); ids.push(l.id); });
    MA.activity.log({ action: 'lead.import', target: String(ids.length), module: 'inbox', href: '#/inbox' });
    MA.toast(t('imported', { n: MA.num(ids.length) }), { icon: 'upload', undo: () => L.remove(ids) });
  }
  // the core's columns, plus what the inbox adds (follow-ups and lost reasons) when the core doesn't list them yet
  function csvColumns() {
    const base = L.csvColumns(), have = new Set(base.map(c => c.key));
    return [...base, ...[{ key: 'nextStep', label: 'Next step' }, { key: 'due', label: 'Due' }, { key: 'lostReason', label: 'Lost reason', get: l => l.lostReason ? (LOST.includes(l.lostReason) ? MA.t('inbox.lost.' + l.lostReason) : l.lostReason) : '' }].filter(c => !have.has(c.key))];
  }
  function exportCsv(list) {
    list = list || currentList();
    MA.download(`miras-briefs-${MA.qDay(now())}.csv`, MA.csv.stringify(sortLeads(list), csvColumns()), 'text/csv');
    MA.toast(t('exported', { n: MA.num(list.length) }), { icon: 'download' });
  }
  function checkSite() { const n = L.importSite(); MA.toast(n === 1 ? t('siteOne') : n ? t('siteNew', { n: MA.num(n) }) : t('siteNone'), { icon: 'inbox' }); }
  function clearSamples() {
    if (!canEdit()) return;
    const gone = L.raw().filter(l => l.sample); if (!gone.length) return;
    const goneIds = gone.map(l => l.id);
    goneIds.forEach(id => { S.sel.delete(id); S.keep.delete(id); });
    L.clearSamples();
    if (S.openId && goneIds.includes(S.openId)) closeOpen();
    MA.toast(t('samplesCleared', { n: MA.num(gone.length) }), { icon: 'trash', undo: () => L.restore(gone) });
  }

  /* ================= module ================= */
  // only edits that change what the inbox shows (labels, the studio email, budgets) redraw it
  const CONTENT_PATHS = /^(swells|services|sgroups|studio|ui)(\/|$)/;
  const MOD = {
    id: 'inbox', group: 'work', order: 20, icon: 'inbox', shortcut: 'g i', perm: 'leads.view',
    title: { en: 'Inbox', ar: 'الوارد', fa: 'صندوق ورودی' }, keywords: 'briefs leads clients crm pipeline board follow-up templates طلبات عملاء متابعة قوالب درخواست مشتری پیگیری قالب',
    badge() { if (!MA.can('leads.view')) return null; const n = L.unread(); return n || null; },
    render(view, ctx) {
      S.mounted = true; S.view = VIEWS.includes(store.get('view', 'list')) ? store.get('view', 'list') : 'list';
      S.f = readF(ctx.query); S.sel = new Set(); S.keep = new Set(); S.drawer = null; S.after = []; S.drag = null; S.last = null; S.want = null; S.limit = LIMIT; S.pending = false; S.full = false;
      S.team = teamOn();
      S.openId = ctx.sub[0] && L.get(ctx.sub[0]) ? ctx.sub[0] : null; S.cursor = S.openId;
      const root = S.root = h('div.m-inbox.ib-page');
      S.els = { head: h('div.ib-head'), note: h('div.ib-note-slot') };
      S.els.bar = toolbar();
      S.els.tabs = h('div.ib-tabs'); S.els.strip = h('div.ib-strip-slot', { hidden: true }); S.els.body = h('div.ib-body');
      S.els.bulk = h('div.bulkbar.ib-bulk', { role: 'toolbar', 'aria-label': t('select'), hidden: true });
      S.els.body.addEventListener('keydown', onItemKey); S.els.body.addEventListener('focusin', onItemFocus);
      root.append(S.els.head, S.els.note, S.els.bar, S.els.tabs, S.els.strip, S.els.body, S.els.bulk);
      view.append(root);
      ['leads', 'db:leads'].forEach(evt => MA.onView(evt, () => schedule()));
      MA.onView('leads.trash', () => { if (isTrash()) schedule(true); else paintTools(); });
      MA.onView('content:change', e => { if (!e?.path || CONTENT_PATHS.test(e.path) || !['edit', 'undo', 'reset'].includes(e.by)) schedule(true); });
      MA.onView('content:published', () => schedule(true));
      MA.onView('team', () => { if (teamOn() !== S.team) MA.rerender(); else schedule(true); });
      MA.onView('db:inbox.templates', () => { if (S.last) S.last.open = null; schedule(); }); // reply links in the open brief
      MA.onView('prefs', () => requestAnimationFrame(fit));
      // relative times + snoozes and due days that run out: refresh once a minute, but never while someone is typing in the page
      const tick = setInterval(() => { const a = document.activeElement; if (!(a && (S.root?.contains(a) || S.drawer?.el.contains(a)) && a.matches('input:not(.ib-search-in),textarea'))) schedule(true); }, 60e3);
      const onResize = MA.debounce(fit, 60);
      addEventListener('keydown', onDrawerKey); addEventListener('resize', onResize);
      // the list/board fills the window below the header; the header can grow (note, chips wrapping), so watch it
      const ro = new ResizeObserver(() => fit()); [S.els.head, S.els.note, S.els.bar, S.els.tabs, S.els.strip].forEach(el => ro.observe(el));
      bindKeys();
      bindDrag();
      MA.cleanup(() => {
        S.mounted = false; clearInterval(tick); ro.disconnect(); removeEventListener('keydown', onDrawerKey); removeEventListener('resize', onResize);
        closeDrawer(); S.root = null; S.last = null;
      });
      if (S.openId) markRead(S.openId);
      paint();
      requestAnimationFrame(fit);
    },
    update(ctx) {
      if (!S.mounted) return false;
      const nf = readF(ctx.query); let full = false;
      if (fString(nf) !== fString(S.f)) { S.f = nf; S.keep.clear(); S.sel.clear(); S.limit = LIMIT; full = true; if (S.els.search) S.els.search.value = S.f.q; }
      const id = ctx.sub[0] && L.get(ctx.sub[0]) ? ctx.sub[0] : null;
      S.openId = id; if (id) { S.cursor = id; markRead(id); }
      if (full) paint(); else refresh();
      return true;
    },
    crumbs(ctx) { const l = ctx.sub[0] && L.get(ctx.sub[0]); return l ? [{ label: display(l), href: '#/inbox/' + encodeURIComponent(l.id) }] : []; },
    search(q) {
      if (!MA.can('leads.view')) return [];
      const s = MA.fold(q).trim(); if (!s) return [];
      return L.all().filter(l => [l.name, l.company, l.email, l.phone].some(x => MA.fold(x).includes(s))).slice(0, 8)
        .map(l => ({ title: display(l), sub: [l.company, stageName(l.stage)].filter(Boolean).join(' · '), icon: 'inbox', run: () => MA.go('#/inbox/' + encodeURIComponent(l.id)) }));
    },
  };
  MA.module(MOD);

  /* ================= ⌘K commands ================= */
  const when = perm => () => MA.can(perm);
  MA.commands.add({ id: 'inbox.new', title: { en: 'New brief', ar: 'طلب جديد', fa: 'درخواست جدید' }, icon: 'plus', keywords: 'add lead brief client إضافة طلب افزودن درخواست', when: when('leads.edit'), run: newBrief });
  MA.commands.add({ id: 'inbox.import', title: { en: 'Import briefs from CSV or JSON', ar: 'استيراد طلبات من CSV أو JSON', fa: 'وارد کردن درخواست‌ها از CSV یا JSON' }, icon: 'upload', keywords: 'import csv json leads استيراد وارد کردن', when: when('leads.edit'), run: importDlg });
  MA.commands.add({ id: 'inbox.export', title: { en: 'Export briefs as CSV', ar: 'تصدير الطلبات بصيغة CSV', fa: 'خروجی CSV از درخواست‌ها' }, icon: 'download', keywords: 'export csv download leads تصدير خروجی', when: when('leads.view'), run: () => exportCsv() });
  MA.commands.add({ id: 'inbox.check', title: { en: 'Check the site for new briefs', ar: 'التحقق من طلبات جديدة من الموقع', fa: 'بررسی سایت برای درخواست‌های تازه' }, icon: 'refresh', keywords: 'site briefs sync refresh مزامنة همگام', when: when('leads.view'), run: checkSite });
  MA.commands.add({ id: 'inbox.board', title: { en: 'Open the pipeline board', ar: 'فتح لوحة مراحل البيع', fa: 'باز کردن تابلوی مراحل فروش' }, icon: 'board', keywords: 'pipeline kanban stages لوحة مراحل تابلو', when: when('leads.view'), run: () => { if (S.mounted) setView('board'); else { store.set('view', 'board'); MA.go('#/inbox'); } } });
  MA.commands.add({ id: 'inbox.needsReply', title: { en: 'Show briefs that need a reply', ar: 'عرض الطلبات التي تنتظر الرد', fa: 'نمایش درخواست‌های منتظر پاسخ' }, icon: 'reply', keywords: 'reply waiting unread رد پاسخ', when: when('leads.view'), run: () => MA.go('#/inbox') });
  MA.commands.add({ id: 'inbox.due', title: { en: 'Show follow-ups that are due', ar: 'عرض المتابعات المستحقة', fa: 'نمایش پیگیری‌های سررسیدشده' }, icon: 'calendar', keywords: 'due overdue follow up next step today مستحق متأخر متابعة سررسید پیگیری', when: when('leads.view'), run: () => MA.go('#/inbox?tab=due') });
  MA.commands.add({ id: 'inbox.sources', title: { en: 'Where briefs come from', ar: 'من أين تأتي الطلبات', fa: 'درخواست‌ها از کجا می‌آیند' }, icon: 'chart', keywords: 'source channel campaign utm won value attribution مصدر قناة حملة منبع کانال کمپین', when: when('leads.view'), run: reportDlg });
  MA.commands.add({ id: 'inbox.templates', title: { en: 'Edit reply templates', ar: 'تعديل قوالب الرد', fa: 'ویرایش قالب‌های پاسخ' }, icon: 'mail', keywords: 'reply templates email whatsapp قوالب رد قالب پاسخ', when: when('leads.edit'), run: () => tplEditor() });
  MA.commands.add({ id: 'inbox.trash', title: { en: 'Recently deleted briefs', ar: 'الطلبات المحذوفة مؤخراً', fa: 'درخواست‌های حذف‌شدهٔ اخیر' }, icon: 'trash', keywords: 'trash deleted restore bin محذوفة استعادة حذف بازگرداندن', when: when('leads.view'), run: openTrash });
  MA.commands.add({ id: 'inbox.how', title: { en: 'How to receive every brief', ar: 'كيف تستلم كل الطلبات', fa: 'چطور همهٔ درخواست‌ها را دریافت کنید' }, icon: 'info', keywords: 'form delivery endpoint receive briefs automatically استلام النموذج تحویل فرم', when: when('leads.view'), run: howDlg });
  const ctxLead = () => S.mounted && S.openId ? L.get(S.openId) : null;
  const ctxName = fallback => ctxLead() ? display(ctxLead()) : fallback;
  MA.commands.add({ id: 'inbox.ctx.reply', title: { get en() { return 'Reply to ' + ctxName('the brief'); }, get ar() { return 'الرد على ' + ctxName('الطلب'); }, get fa() { return 'پاسخ به ' + ctxName('درخواست'); } }, icon: 'reply', keywords: 'reply email mail پاسخ', when: () => !!ctxLead()?.email, run: () => reply(ctxLead()) });
  MA.commands.add({ id: 'inbox.ctx.stage', title: { en: 'Move this brief to a stage…', ar: 'نقل هذا الطلب إلى مرحلة…', fa: 'انتقال این درخواست به یک مرحله…' }, icon: 'flag', keywords: 'stage won lost proposal call مرحلة مرحله', when: () => !!ctxLead() && canEdit(), run: () => setTimeout(() => stageMenu(anchorFor('stage'), [S.openId]), 30) });
  MA.commands.add({ id: 'inbox.ctx.next', title: { en: 'Set the next step for this brief…', ar: 'تحديد الخطوة التالية لهذا الطلب…', fa: 'تعیین گام بعدی این درخواست…' }, icon: 'calendar', keywords: 'next step due follow up خطوة تالية موعد گام بعدی موعد', when: () => !!ctxLead() && canEdit(), run: () => setTimeout(() => { const a = scopeEls(`.ib-detail[data-id="${CSS.escape(S.openId || '')}"] [data-k=next]`)[0] || anchorFor('stage'); nextPop(a, S.openId); }, 30) });
  MA.commands.add({ id: 'inbox.ctx.assign', title: { en: 'Assign this brief…', ar: 'إسناد هذا الطلب…', fa: 'واگذاری این درخواست…' }, icon: 'user', keywords: 'assign owner إسناد واگذاری', when: () => !!ctxLead() && canEdit() && teamOn(), run: () => setTimeout(() => assignMenu(anchorFor('assign'), [S.openId]), 30) });
  MA.commands.add({ id: 'inbox.ctx.snooze', title: { en: 'Snooze this brief…', ar: 'تأجيل هذا الطلب…', fa: 'به تعویق انداختن این درخواست…' }, icon: 'clock', keywords: 'snooze later remind تأجيل تعویق', when: () => !!ctxLead() && canEdit(), run: () => setTimeout(() => snoozeMenu(anchorFor('snooze'), [S.openId]), 30) });
  MA.commands.add({ id: 'inbox.ctx.archive', title: { en: 'Archive this brief', ar: 'أرشفة هذا الطلب', fa: 'بایگانی این درخواست' }, icon: 'archive', keywords: 'archive done أرشفة بایگانی', when: () => !!ctxLead() && canEdit(), run: () => archiveIds([S.openId]) });

  /* ================= reminders: a follow-up comes due, a snooze runs out (real briefs only, once each) ================= */
  function remind() {
    if (!MA.can('leads.view')) return 0;
    const t0 = now(); let n = 0;
    for (const l of L.raw()) {
      if (l.sample || l.archived) continue;
      const patch = {}, href = '#/inbox/' + encodeURIComponent(l.id);
      if (isDue(l) && l.dueNotified !== l.due) { MA.notify.push({ key: 'inbox.notify.due', vars: { name: display(l) }, text: l.nextStep || '', icon: 'calendar', href: href + '?tab=due' }); patch.dueNotified = l.due; }
      if (l.snoozeUntil && ts(l.snoozeUntil) <= t0 && l.snoozeNotified !== l.snoozeUntil) { MA.notify.push({ key: 'inbox.notify.snooze', vars: { name: display(l) }, text: l.company || '', icon: 'clock', href }); patch.snoozeNotified = l.snoozeUntil; }
      if (Object.keys(patch).length) { L.update(l.id, patch); n++; }
    }
    return n;
  }
  MA.on('boot', () => { setTimeout(remind, 1500); setInterval(remind, 15 * 60e3); });

  // handles for the headless tests (tests/inbox.test.js) and for other pages (Overview: due follow-ups, sources)
  MA.inbox = { state: S, TABS, parseImport, mailtoOf, waOf, replyParts, fillTpl, templates, tplEditor, needsReply, isDue, importDlg, exportCsv, briefText,
    reportRows, reportDlg, howDlg, teamOn, channelOf, campaignOf, budgetOf, setNext, nextPop, remind };
})();
