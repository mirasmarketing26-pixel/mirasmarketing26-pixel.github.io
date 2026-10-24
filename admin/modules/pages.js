/* =====================================================================
   MIRAS admin — Pages & copy (the content studio)
   Every line of site copy, with one live preview that stays loaded while you move between sections.

   Three panes: the section list ("tide chart") · the field inspector · the live preview.
   Schema-driven: sections are the text-key groups found in MA.content.defaults (MA.content.groupOf), so
   keys and sections the site adds later show up here with no code change. Group order follows the site:
   a heuristic from the key order first, then the real DOM order once the preview has loaded (cached).

   Routes: #/pages/<group>            one section
           #/pages?field=<tpl>        click-to-edit / ⌘K: selects the field's section; the core focuses it
   Storage (MA.db): pages.group · pages.langs · pages.site (preview scan cache); the preview pane keeps its own state
   (open, width, device) in MA.db 'pvPanes'.pages through MA.ui.previewPane.
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA;
  const esc = MA.esc;
  const T = (k, v) => MA.t('pages.' + k, v);
  const DB = { group: 'pages.group', langs: 'pages.langs', site: 'pages.site' };
  const PV_KEY = 'pages';

  /* Groups that are not one place on the page: listed after the page sections, in this order. */
  const TAIL = ['nav', 'cons', 'tag', 'ui', 'aria'];
  /* JavaScript messages (ui keys) that belong to a section. They also stay listed under Messages.
     A message whose section isn't on the site any more goes where the preview shows it (learned by the scan), else only under Messages. */
  const RELATED = {
    top: ['stage', 'get', 'getMine'],
    plan: ['none', 'some', 'allTitle', 'planOne', 'planFirst', 'planThen', 'planComma', 'planAnd', 'planAdded', 'addBrief', 'inBrief'],
    make: ['added'],
    studio: ['open', 'today', 'tomorrow', 'weekend', 'closedFor', 'hoursFor'],
    contact: ['budgets', 'subject', 'bodyName', 'bodyEmail', 'bodyCo', 'bodyPhone', 'bodyBudget', 'bodyWaves', 'bodySvc', 'bodyWords', 'sending', 'opening', 'copied', 'copyFail'],
  };
  /* Where a section's messages go when that section isn't on the site any more (the stage beats now live in the opening film). */
  const MOVED = { process: 'top', swells: 'top' };
  /* Sections whose lists are edited on another page (the copy around them stays here). */
  const ELSEWHERE = { top: 'process', swells: 'services', plan: 'services', process: 'process', studio: 'settings', faq: 'faq', cons: 'settings' };

  /* ---- what the site does with each line (SITE-CONTRACT.md §1, index.html fmt() calls) ----
     Tokens the site fills in, per field. Text lines (data-i18n) get {email}; attributes (aria labels, alt text) get nothing.
     The studio clock fills {day} {open} {close} {label} into whichever status line is showing, but only some of them mean
     something in each line (USEFUL). Anything else reaches visitors as typed. */
  const CLOCK = ['day', 'open', 'close', 'label'];
  const UI_TOKENS = { stage: ['n', 'total'], planOne: ['x'], planFirst: ['x'], planThen: ['x'], added: ['w'], copied: ['email'], copyFail: ['email'],
    open: CLOCK, today: CLOCK, tomorrow: CLOCK, weekend: CLOCK, closedFor: CLOCK, hoursFor: CLOCK };
  const USEFUL = { open: ['close'], today: ['open', 'close'], tomorrow: ['day', 'open'], weekend: ['day', 'open'], closedFor: ['label', 'day', 'open'], hoursFor: ['label', 'open', 'close'] };
  /* Messages nothing on the site reads (ui.wave), and lines only screen readers hear (the stage beats' hidden text). */
  const UNUSED_UI = ['wave'];
  const SR_UI = ['stage', 'get'];
  /* Lists separated by | where every item shows at once (a select), and joiners whose spaces matter. */
  const LIST_UI = ['budgets'];
  const JOIN_UI = ['planComma', 'planAnd'];
  /* Width of the editor (list + inspector) at which the preview sits beside it as a third pane. */
  const WIDE = 980, MID = 560;

  MA.i18n.add({
    en: {
      'pages.sub': 'Every line on the site, in English and Arabic. Edits show in the preview as you type.',
      'pages.search': 'Search the copy', 'pages.clearSearch': 'Clear search', 'pages.langMode': 'Languages to edit', 'pages.both': 'Both', 'pages.arabic': 'عربي',
      'pages.sections': 'Sections', 'pages.onPage': 'On the page', 'pages.around': 'Across the site', 'pages.messages': 'Messages',
      'pages.arCount': 'AR {a}/{b}', 'pages.arTip': '{a} of {b} lines have their own Arabic',
      'pages.unpubN': '{n} unpublished', 'pages.hidden': 'Hidden', 'pages.hideSec': 'Hide this section', 'pages.showSec': 'Show this section',
      'pages.secHidden': '{name} is hidden on the site.', 'pages.secShown': '{name} is back on the site.', 'pages.shownOnSite': 'Shown on the site',
      'pages.lblHide': 'Hide section · {name}', 'pages.lblShow': 'Show section · {name}',
      'pages.hiddenCallout': 'This section is hidden, so visitors don’t see it and the menu skips it. The preview can’t scroll to it either.',
      'pages.tm.live': 'Live', 'pages.tm.edited': 'Live, {n} edits waiting', 'pages.tm.draft': 'Hidden on the live site',
      'pages.all': 'All', 'pages.needsAr': 'Needs Arabic', 'pages.unpub': 'Unpublished',
      'pages.fill': 'Fill empty Arabic ({n})', 'pages.fillTip': 'Copies the English into the Arabic fields that are empty in this section. One undo puts them back.',
      'pages.filled': 'Filled {n} empty Arabic fields with the English.', 'pages.filledOne': 'Filled 1 empty Arabic field with the English.',
      'pages.fillLabel': 'Fill empty Arabic · {name}', 'pages.nothingToFill': 'No empty Arabic in this section.',
      'pages.secOf': 'Section {i} of {n}', 'pages.aroundOne': 'Used across the site',
      'pages.desc.nav': 'The menu and the main button. They show on every screen.',
      'pages.desc.tag': 'Small credits on images and in the opening film. They show wherever one of those appears.',
      'pages.desc.cons': 'The bar that asks visitors to allow analytics. It shows only when consent is on in Settings and an analytics service is set up.',
      'pages.desc.ui': 'Short lines the site writes as people use it: status lines, toasts and the email draft. Lines that belong to a section also appear in that section.',
      'pages.desc.aria': 'Read aloud by screen readers. Visitors never see these, but people who can’t see the page rely on them.',
      'pages.msgsHere': 'Messages in this section', 'pages.msgsHint': 'The site writes these with code as people use the page, so they don’t show until the moment comes.',
      'pages.words': 'Floating words', 'pages.wordsHint': 'Words that drift across What we make. Tapping one adds its swell to the visitor’s brief.',
      'pages.row': 'Row {n}', 'pages.word': 'Word {n}', 'pages.rowWord': 'Row {r} · Word {n}', 'pages.addWord': 'Add a word', 'pages.emptyRow': 'No words in this row yet.',
      'pages.removeWord': 'Remove word', 'pages.wordRemoved': 'Removed “{w}”.', 'pages.wordAdded': 'Floating words · add', 'pages.reorder': 'Floating words · reorder', 'pages.wordDel': 'Floating words · remove',
      'pages.moveUp': 'Move up', 'pages.moveDown': 'Move down', 'pages.moveRow': 'Move to row {n}', 'pages.wordActions': 'Move or remove this word (Alt + ↑ / ↓ moves it)',
      'pages.linkedSwell': 'Adds the swell', 'pages.missingSwell': 'Missing swell ({id})', 'pages.noSwell': 'No swell',
      'pages.results': { one: '{n} matches in 1 section', other: '{n} matches in {s} sections' }, 'pages.resultsOne': '1 match', 'pages.searchEyebrow': 'Search',
      'pages.noMatch': 'No copy matches “{q}”', 'pages.noMatchText': 'Try a shorter word, or search in Arabic.',
      'pages.allAr': 'Every line here has its Arabic', 'pages.allArText': 'Nothing left to translate in this view.',
      'pages.noUnpub': 'Nothing waiting to publish here', 'pages.noUnpubText': 'Edits you make show up here until you publish them.',
      'pages.showAll': 'Show all lines',
      'pages.arEmpty': 'Empty in Arabic, so the Arabic page shows nothing here.', 'pages.copyEn': 'Copy the English',
      'pages.arSame': 'Same as the English, so it isn’t counted as translated.',
      'pages.tokLead': 'The site fills in', 'pages.tokMissing': 'The Arabic is missing {t}.', 'pages.tokExtra': 'The Arabic has {t}, but the English doesn’t.',
      'pages.tokNone': 'The site doesn’t fill {t} in this line, so visitors would see it exactly as typed.',
      'pages.tokUseless': '{t} has no value in this message, so visitors would see the wrong time or nothing.',
      'pages.tok.open': 'the opening time ({v})', 'pages.tok.day': 'the day you reopen, like Sunday', 'pages.tok.email': 'the studio email ({v})', 'pages.tok.close': 'the closing time ({v})',
      'pages.tok.label': 'the special day’s name from Settings', 'pages.tok.x': 'the services the visitor picked', 'pages.tok.total': 'the number of stages ({b})',
      'pages.tok.n': 'the stage number, {a} to {b}', 'pages.tok.w': 'the word or service the visitor tapped',
      'pages.parts': '{n} choices, separated by |. Keep the same number in English and Arabic: they’re matched by position.', 'pages.partsDiff': 'The Arabic has {a} choices and the English has {b}.',
      'pages.spaces': 'Spaces count: the site puts this between the names exactly as typed.',
      'pages.unused': 'The current site doesn’t use this line, so editing it changes nothing.',
      'pages.srOnly': 'Read aloud to screen-reader users. It isn’t shown on screen.',
      'pages.when.phone': 'Hidden on the site for now: the phone field is off in Settings.', 'pages.when.budget': 'Hidden on the site for now: the budget field is off in Settings.',
      'pages.when.privacy': 'Hidden on the site for now: no privacy link is set in Settings.', 'pages.when.consent': 'Hidden on the site for now: the consent bar is off in Settings, or no analytics service is set up.',
      'pages.when.special': 'Shows only on special days, and none are set in Settings yet.', 'pages.openSettings': 'Open Settings',
      'pages.lbl.tagline': 'Tagline', 'pages.taglineHint': 'The footer shows the English and the Arabic line side by side, whatever the page language.',
      'pages.elsewhere': 'The rest of this section is edited in', 'pages.alsoIn': 'Also shown in', 'pages.readOnly': 'Your role can read the copy but not change it.',
      'pages.inspectOn': 'Click-to-edit is on. Click any text in the preview to edit it.', 'pages.inspectOff': 'Click-to-edit is off.',
      'pages.k.next': 'Next section', 'pages.k.prev': 'Previous section',
      'pages.wholeSite': 'Whole site', 'pages.hiddenN': '{n} hidden', 'pages.inPreview': 'Showing in the preview', 'pages.siteSection': 'Site section',
      'pages.noFields': 'No copy in this section', 'pages.noFieldsText': 'The site doesn’t use any text keys here.',
      // labels for keys the core can't name (built from the key's parts)
      'pages.lbl.scene': 'Scene {n}', 'pages.lbl.item': 'Item {n}', 'pages.lbl.label': 'Eyebrow', 'pages.lbl.desc': 'Description', 'pages.lbl.sub': 'Intro', 'pages.lbl.btn': 'Button',
      'pages.lbl.alt': 'Image description', 'pages.lbl.note': 'Note', 'pages.lbl.err': 'Error', 'pages.lbl.c': 'Column heading', 'pages.lbl.add': 'Add button', 'pages.lbl.text': 'Text',
      // ui message labels
      'pages.ui.none': 'Plan intro, nothing picked', 'pages.ui.some': 'Plan intro, swells picked', 'pages.ui.allTitle': 'Plan headline, nothing picked',
      'pages.ui.planAdded': 'Toast: plan added', 'pages.ui.addBrief': 'Chip: add to brief', 'pages.ui.inBrief': 'Chip: in the brief',
      'pages.ui.get': 'Stage list heading', 'pages.ui.getMine': 'Stage list heading, personal', 'pages.ui.stage': 'Stage announcement',
      'pages.ui.open': 'Status: open now', 'pages.ui.today': 'Status: opens later today', 'pages.ui.tomorrow': 'Status: opens tomorrow', 'pages.ui.weekend': 'Status: closed for the weekend',
      'pages.ui.subject': 'Email subject', 'pages.ui.bodyName': 'Email body: name', 'pages.ui.bodyEmail': 'Email body: email', 'pages.ui.bodyCo': 'Email body: company', 'pages.ui.bodyWaves': 'Email body: picks', 'pages.ui.bodyWords': 'Email body: words',
      'pages.ui.sending': 'While sending', 'pages.ui.opening': 'While opening the email app', 'pages.ui.copied': 'After copying the brief', 'pages.ui.copyFail': 'If copying fails',
      'pages.ui.added': 'Toast: added to the brief', 'pages.ui.away': 'Browser tab while the visitor is away', 'pages.ui.wave': 'Stage number in the film', 'pages.ui.bodySvc': 'Email body: services',
      'pages.ui.planOne': 'Plan headline, one stage picked', 'pages.ui.planFirst': 'Plan headline, first stage', 'pages.ui.planThen': 'Plan headline, each next stage',
      'pages.ui.planComma': 'Plan headline: between names', 'pages.ui.planAnd': 'Plan headline: before the last name',
      'pages.ui.closedFor': 'Status: closed for a special day', 'pages.ui.hoursFor': 'Status: special hours today',
      'pages.ui.budgets': 'Brief form: budget choices', 'pages.ui.bodyPhone': 'Email body: phone', 'pages.ui.bodyBudget': 'Email body: budget',
    },
    ar: {
      'pages.sub': 'كل سطر في الموقع بالعربية والإنجليزية. تظهر تعديلاتك في المعاينة فور كتابتها.',
      'pages.search': 'ابحث في النصوص', 'pages.clearSearch': 'مسح البحث', 'pages.langMode': 'لغات التحرير', 'pages.both': 'معاً', 'pages.arabic': 'عربي',
      'pages.sections': 'الأقسام', 'pages.onPage': 'على الصفحة', 'pages.around': 'في أنحاء الموقع', 'pages.messages': 'الرسائل',
      'pages.arCount': 'عربي {a}/{b}', 'pages.arTip': 'الأسطر التي لها نص عربي خاص بها: {a} من {b}',
      'pages.unpubN': 'غير منشورة: {n}', 'pages.hidden': 'مخفي', 'pages.hideSec': 'إخفاء هذا القسم', 'pages.showSec': 'إظهار هذا القسم',
      'pages.secHidden': 'أُخفي قسم «{name}» من الموقع.', 'pages.secShown': 'عاد قسم «{name}» إلى الموقع.', 'pages.shownOnSite': 'ظاهر في الموقع',
      'pages.lblHide': 'إخفاء قسم · {name}', 'pages.lblShow': 'إظهار قسم · {name}',
      'pages.hiddenCallout': 'هذا القسم مخفي، فلا يراه الزوار وتتجاوزه القائمة، ولا تستطيع المعاينة الانتقال إليه.',
      'pages.tm.live': 'منشور', 'pages.tm.edited': 'منشور، وتعديلات بانتظار النشر: {n}', 'pages.tm.draft': 'مخفي في الموقع المنشور',
      'pages.all': 'الكل', 'pages.needsAr': 'يحتاج إلى العربية', 'pages.unpub': 'غير منشور',
      'pages.fill': 'املأ العربية الفارغة ({n})', 'pages.fillTip': 'ينسخ النص الإنجليزي إلى الحقول العربية الفارغة في هذا القسم، وتراجع واحد يعيدها كما كانت.',
      'pages.filled': 'مُلئت الحقول العربية الفارغة بالنص الإنجليزي: {n}', 'pages.filledOne': 'مُلئ حقل عربي فارغ بالنص الإنجليزي.',
      'pages.fillLabel': 'ملء العربية الفارغة · {name}', 'pages.nothingToFill': 'لا حقول عربية فارغة في هذا القسم.',
      'pages.secOf': 'القسم {i} من {n}', 'pages.aroundOne': 'يُستخدم في أنحاء الموقع',
      'pages.desc.nav': 'القائمة والزر الرئيسي، ويظهران في كل الشاشات.',
      'pages.desc.tag': 'إشارات صغيرة على الصور وفي الفيلم الافتتاحي، وتظهر أينما ظهر شيء منها.',
      'pages.desc.cons': 'الشريط الذي يطلب من الزوار السماح بالتحليلات. لا يظهر إلا حين تكون الموافقة مفعّلة في الإعدادات وخدمة التحليلات مضبوطة.',
      'pages.desc.ui': 'جُمل قصيرة يكتبها الموقع أثناء التصفح: سطور الحالة والإشعارات ونص رسالة البريد. وما يخص قسماً منها يظهر في ذلك القسم أيضاً.',
      'pages.desc.aria': 'تقرؤها برامج قراءة الشاشة بصوت مسموع. لا يراها الزوار، لكن من لا يرى الصفحة يعتمد عليها.',
      'pages.msgsHere': 'رسائل هذا القسم', 'pages.msgsHint': 'يكتبها الموقع برمجياً أثناء التصفح، فلا تظهر إلا حين يحين وقتها.',
      'pages.words': 'الكلمات العائمة', 'pages.wordsHint': 'كلمات تطفو في قسم «ما نصنعه». لمسُ أي منها يضيف موجتها إلى طلب الزائر.',
      'pages.row': 'الصف {n}', 'pages.word': 'الكلمة {n}', 'pages.rowWord': 'الصف {r} · الكلمة {n}', 'pages.addWord': 'إضافة كلمة', 'pages.emptyRow': 'لا كلمات في هذا الصف بعد.',
      'pages.removeWord': 'حذف الكلمة', 'pages.wordRemoved': 'حُذفت «{w}».', 'pages.wordAdded': 'الكلمات العائمة · إضافة', 'pages.reorder': 'الكلمات العائمة · إعادة ترتيب', 'pages.wordDel': 'الكلمات العائمة · حذف',
      'pages.moveUp': 'نقل للأعلى', 'pages.moveDown': 'نقل للأسفل', 'pages.moveRow': 'نقل إلى الصف {n}', 'pages.wordActions': 'نقل الكلمة أو حذفها (Alt مع ↑ / ↓ للنقل)',
      'pages.linkedSwell': 'تضيف الموجة', 'pages.missingSwell': 'موجة غير موجودة ({id})', 'pages.noSwell': 'بلا موجة',
      'pages.results': { one: 'النتائج: {n} في قسم واحد', two: 'النتائج: {n} في قسمين', few: 'النتائج: {n} في {s} أقسام', many: 'النتائج: {n} في {s} قسماً', other: 'النتائج: {n} في {s} قسم' }, 'pages.resultsOne': 'نتيجة واحدة', 'pages.searchEyebrow': 'البحث',
      'pages.noMatch': 'لا نصوص تطابق «{q}»', 'pages.noMatchText': 'جرّب كلمة أقصر، أو ابحث بالإنجليزية.',
      'pages.allAr': 'لكل سطر هنا نصه العربي', 'pages.allArText': 'لم يبقَ ما يحتاج إلى ترجمة في هذا العرض.',
      'pages.noUnpub': 'لا شيء بانتظار النشر هنا', 'pages.noUnpubText': 'تظهر هنا تعديلاتك إلى أن تنشرها.',
      'pages.showAll': 'عرض كل الأسطر',
      'pages.arEmpty': 'الحقل العربي فارغ، فلن يظهر شيء هنا في الصفحة العربية.', 'pages.copyEn': 'انسخ النص الإنجليزي',
      'pages.arSame': 'مطابق للنص الإنجليزي، فلا يُحسب مترجماً.',
      'pages.tokLead': 'يملأ الموقع', 'pages.tokMissing': 'ينقص النصَّ العربي {t}.', 'pages.tokExtra': 'في النص العربي {t} وليس في الإنجليزي.',
      'pages.tokNone': 'لا يملأ الموقع {t} في هذا السطر، فسيراه الزوار كما كُتب تماماً.',
      'pages.tokUseless': 'لا قيمة لـ{t} في هذه الرسالة، فقد يرى الزوار وقتاً خاطئاً أو لا شيء.',
      'pages.tok.open': 'وقت الفتح ({v})', 'pages.tok.day': 'يوم العودة، مثل الأحد', 'pages.tok.email': 'بريد الاستوديو ({v})', 'pages.tok.close': 'وقت الإغلاق ({v})',
      'pages.tok.label': 'اسم اليوم الخاص كما في الإعدادات', 'pages.tok.x': 'الخدمات التي اختارها الزائر', 'pages.tok.total': 'عدد المراحل ({b})',
      'pages.tok.n': 'رقم المرحلة من {a} إلى {b}', 'pages.tok.w': 'الكلمة أو الخدمة التي لمسها الزائر',
      'pages.parts': 'الخيارات: {n}، تفصل بينها |. أبقِ العدد نفسه في الإنجليزية والعربية، فهي تتطابق حسب ترتيبها.', 'pages.partsDiff': 'عدد الخيارات في النص العربي {a}، وفي الإنجليزي {b}.',
      'pages.spaces': 'المسافات مهمة: يضع الموقع هذا النص بين الأسماء كما كُتب تماماً.',
      'pages.unused': 'لا يستخدم الموقع الحالي هذا السطر، فلن يغيّر تعديله شيئاً.',
      'pages.srOnly': 'تقرؤه برامج قراءة الشاشة لمستخدميها، ولا يظهر على الشاشة.',
      'pages.when.phone': 'مخفي في الموقع حالياً: حقل الهاتف متوقف في الإعدادات.', 'pages.when.budget': 'مخفي في الموقع حالياً: حقل الميزانية متوقف في الإعدادات.',
      'pages.when.privacy': 'مخفي في الموقع حالياً: لم يُضبط رابط الخصوصية في الإعدادات.', 'pages.when.consent': 'مخفي في الموقع حالياً: شريط الموافقة متوقف في الإعدادات، أو لم تُضبط خدمة التحليلات.',
      'pages.when.special': 'يظهر في الأيام الخاصة فقط، ولم تُضبط أي أيام خاصة في الإعدادات بعد.', 'pages.openSettings': 'افتح الإعدادات',
      'pages.lbl.tagline': 'الشعار', 'pages.taglineHint': 'يعرض التذييل السطرين الإنجليزي والعربي جنباً إلى جنب، أياً كانت لغة الصفحة.',
      'pages.elsewhere': 'يُحرَّر باقي هذا القسم في', 'pages.alsoIn': 'يظهر أيضاً في', 'pages.readOnly': 'دورك يسمح بقراءة النصوص دون تعديلها.',
      'pages.inspectOn': 'النقر للتعديل مفعّل. انقر أي نص في المعاينة لتعديله.', 'pages.inspectOff': 'أُوقف النقر للتعديل.',
      'pages.k.next': 'القسم التالي', 'pages.k.prev': 'القسم السابق',
      'pages.wholeSite': 'الموقع كله', 'pages.hiddenN': 'مخفية: {n}', 'pages.inPreview': 'ظاهر في المعاينة', 'pages.siteSection': 'قسم في الموقع',
      'pages.noFields': 'لا نصوص في هذا القسم', 'pages.noFieldsText': 'لا يستخدم الموقع أي مفاتيح نصية هنا.',
      'pages.lbl.scene': 'المشهد {n}', 'pages.lbl.item': 'العنصر {n}', 'pages.lbl.label': 'العنوان الصغير', 'pages.lbl.desc': 'الوصف', 'pages.lbl.sub': 'المقدمة', 'pages.lbl.btn': 'الزر',
      'pages.lbl.alt': 'وصف الصورة', 'pages.lbl.note': 'ملاحظة', 'pages.lbl.err': 'رسالة الخطأ', 'pages.lbl.c': 'عنوان العمود', 'pages.lbl.add': 'زر الإضافة', 'pages.lbl.text': 'النص',
      'pages.ui.none': 'مقدمة الخطة قبل الاختيار', 'pages.ui.some': 'مقدمة الخطة بعد الاختيار', 'pages.ui.allTitle': 'عنوان الخطة قبل الاختيار',
      'pages.ui.planAdded': 'إشعار: أُضيفت الخطة', 'pages.ui.addBrief': 'زر: أضِف إلى الطلب', 'pages.ui.inBrief': 'زر: في طلبك',
      'pages.ui.get': 'عنوان قائمة المرحلة', 'pages.ui.getMine': 'عنوان قائمة المرحلة المخصصة', 'pages.ui.stage': 'إعلان المرحلة',
      'pages.ui.open': 'الحالة: مفتوح الآن', 'pages.ui.today': 'الحالة: يفتح لاحقاً اليوم', 'pages.ui.tomorrow': 'الحالة: يفتح غداً', 'pages.ui.weekend': 'الحالة: مغلق لعطلة نهاية الأسبوع',
      'pages.ui.subject': 'موضوع الرسالة', 'pages.ui.bodyName': 'نص الرسالة: الاسم', 'pages.ui.bodyEmail': 'نص الرسالة: البريد', 'pages.ui.bodyCo': 'نص الرسالة: الشركة', 'pages.ui.bodyWaves': 'نص الرسالة: الاختيارات', 'pages.ui.bodyWords': 'نص الرسالة: الكلمات',
      'pages.ui.sending': 'أثناء الإرسال', 'pages.ui.opening': 'أثناء فتح تطبيق البريد', 'pages.ui.copied': 'بعد نسخ الطلب', 'pages.ui.copyFail': 'إذا تعذّر النسخ',
      'pages.ui.added': 'إشعار: أُضيف إلى الطلب', 'pages.ui.away': 'عنوان التبويب حين يغادره الزائر', 'pages.ui.wave': 'رقم المرحلة في الفيلم', 'pages.ui.bodySvc': 'نص الرسالة: الخدمات',
      'pages.ui.planOne': 'عنوان الخطة عند اختيار مرحلة واحدة', 'pages.ui.planFirst': 'عنوان الخطة: المرحلة الأولى', 'pages.ui.planThen': 'عنوان الخطة: كل مرحلة تالية',
      'pages.ui.planComma': 'عنوان الخطة: الفاصل بين الأسماء', 'pages.ui.planAnd': 'عنوان الخطة: قبل الاسم الأخير',
      'pages.ui.closedFor': 'الحالة: مغلق ليوم خاص', 'pages.ui.hoursFor': 'الحالة: ساعات خاصة اليوم',
      'pages.ui.budgets': 'نموذج الطلب: خيارات الميزانية', 'pages.ui.bodyPhone': 'نص الرسالة: الهاتف', 'pages.ui.bodyBudget': 'نص الرسالة: الميزانية',
    },
    fa: {
      'pages.sub': 'همهٔ متن‌های سایت، به انگلیسی و عربی. ویرایش‌ها همان لحظه در پیش‌نمایش دیده می‌شوند.',
      'pages.search': 'جست‌وجو در متن‌ها', 'pages.clearSearch': 'پاک کردن جست‌وجو', 'pages.langMode': 'زبان‌های ویرایش', 'pages.both': 'هر دو', 'pages.arabic': 'عربی',
      'pages.sections': 'بخش‌ها', 'pages.onPage': 'روی صفحه', 'pages.around': 'در سراسر سایت', 'pages.messages': 'پیام‌ها',
      'pages.arCount': 'عربی {a}/{b}', 'pages.arTip': '{a} سطر از {b} سطر ترجمهٔ عربی دارند',
      'pages.unpubN': '{n} تغییر منتشرنشده', 'pages.hidden': 'پنهان', 'pages.hideSec': 'پنهان کردن این بخش', 'pages.showSec': 'نمایش این بخش',
      'pages.secHidden': 'بخش «{name}» در سایت پنهان شد.', 'pages.secShown': 'بخش «{name}» دوباره در سایت دیده می‌شود.', 'pages.shownOnSite': 'نمایش در سایت',
      'pages.lblHide': 'پنهان کردن بخش · {name}', 'pages.lblShow': 'نمایش بخش · {name}',
      'pages.hiddenCallout': 'این بخش پنهان است؛ بازدیدکنندگان آن را نمی‌بینند و منو هم از رویش رد می‌شود. پیش‌نمایش هم نمی‌تواند به آن برود.',
      'pages.tm.live': 'منتشرشده', 'pages.tm.edited': 'منتشرشده، {n} ویرایش در انتظار انتشار', 'pages.tm.draft': 'در سایت منتشرشده پنهان است',
      'pages.all': 'همه', 'pages.needsAr': 'نیازمند عربی', 'pages.unpub': 'منتشرنشده',
      'pages.fill': 'پر کردن عربی‌های خالی ({n})', 'pages.fillTip': 'متن انگلیسی را در فیلدهای عربیِ خالیِ این بخش می‌گذارد. با یک بار واگرد همه به حالت قبل برمی‌گردند.',
      'pages.filled': '{n} فیلد عربیِ خالی با متن انگلیسی پر شد.', 'pages.filledOne': 'یک فیلد عربیِ خالی با متن انگلیسی پر شد.',
      'pages.fillLabel': 'پر کردن عربی‌های خالی · {name}', 'pages.nothingToFill': 'در این بخش فیلد عربیِ خالی‌ای نیست.',
      'pages.secOf': 'بخش {i} از {n}', 'pages.aroundOne': 'در سراسر سایت به کار می‌رود',
      'pages.desc.nav': 'منو و دکمهٔ اصلی که در همهٔ صفحه‌ها دیده می‌شوند.',
      'pages.desc.tag': 'برچسب‌های کوچکی روی تصاویر و در فیلم آغازین. هر جا یکی از آن‌ها بیاید، دیده می‌شوند.',
      'pages.desc.cons': 'نواری که از بازدیدکنندگان اجازهٔ آمار می‌خواهد. فقط وقتی دیده می‌شود که رضایت در «تنظیمات» روشن باشد و سرویس آمار تنظیم شده باشد.',
      'pages.desc.ui': 'جمله‌های کوتاهی که سایت هنگام استفاده می‌نویسد: سطرهای وضعیت، اعلان‌ها و متن ایمیل. پیام‌هایی که به یک بخش تعلق دارند در همان بخش هم آمده‌اند.',
      'pages.desc.aria': 'صفحه‌خوان‌ها این‌ها را بلند می‌خوانند. بازدیدکنندگان آن‌ها را نمی‌بینند، اما کسانی که صفحه را نمی‌بینند به آن‌ها تکیه می‌کنند.',
      'pages.msgsHere': 'پیام‌های این بخش', 'pages.msgsHint': 'سایت این پیام‌ها را هنگام استفاده از صفحه می‌نویسد، پس تا زمانشان نرسد دیده نمی‌شوند.',
      'pages.words': 'واژه‌های شناور', 'pages.wordsHint': 'واژه‌هایی که در بخش «آنچه می‌سازیم» شناورند. لمس هر کدام، موجِ آن را به درخواست بازدیدکننده اضافه می‌کند.',
      'pages.row': 'ردیف {n}', 'pages.word': 'واژهٔ {n}', 'pages.rowWord': 'ردیف {r} · واژهٔ {n}', 'pages.addWord': 'افزودن واژه', 'pages.emptyRow': 'هنوز واژه‌ای در این ردیف نیست.',
      'pages.removeWord': 'حذف واژه', 'pages.wordRemoved': '«{w}» حذف شد.', 'pages.wordAdded': 'واژه‌های شناور · افزودن', 'pages.reorder': 'واژه‌های شناور · جابه‌جایی', 'pages.wordDel': 'واژه‌های شناور · حذف',
      'pages.moveUp': 'انتقال به بالا', 'pages.moveDown': 'انتقال به پایین', 'pages.moveRow': 'انتقال به ردیف {n}', 'pages.wordActions': 'جابه‌جایی یا حذف این واژه (Alt همراه ↑ / ↓ جابه‌جا می‌کند)',
      'pages.linkedSwell': 'موجی که اضافه می‌کند', 'pages.missingSwell': 'موج ناموجود ({id})', 'pages.noSwell': 'بدون موج',
      'pages.results': '{n} نتیجه در {s} بخش', 'pages.resultsOne': 'یک نتیجه', 'pages.searchEyebrow': 'جست‌وجو',
      'pages.noMatch': 'متنی با «{q}» پیدا نشد', 'pages.noMatchText': 'واژهٔ کوتاه‌تری را امتحان کنید، یا به انگلیسی یا عربی جست‌وجو کنید.',
      'pages.allAr': 'همهٔ سطرهای این‌جا عربی دارند', 'pages.allArText': 'در این نما چیزی برای ترجمه نمانده است.',
      'pages.noUnpub': 'این‌جا چیزی در انتظار انتشار نیست', 'pages.noUnpubText': 'ویرایش‌هایتان تا وقتی منتشرشان نکنید این‌جا دیده می‌شوند.',
      'pages.showAll': 'نمایش همهٔ سطرها',
      'pages.arEmpty': 'عربیِ این سطر خالی است، پس صفحهٔ عربی این‌جا چیزی نشان نمی‌دهد.', 'pages.copyEn': 'کپی متن انگلیسی',
      'pages.arSame': 'با متن انگلیسی یکی است، پس ترجمه‌شده به حساب نمی‌آید.',
      'pages.tokLead': 'سایت خودش پر می‌کند:', 'pages.tokMissing': 'در متن عربی {t} نیامده است.', 'pages.tokExtra': 'متن عربی {t} دارد، اما متن انگلیسی ندارد.',
      'pages.tokNone': 'سایت {t} را در این سطر پر نمی‌کند، پس بازدیدکنندگان آن را همان‌طور که نوشته شده می‌بینند.',
      'pages.tokUseless': '{t} در این پیام مقداری ندارد، پس بازدیدکنندگان ممکن است ساعت نادرست یا هیچ چیز نبینند.',
      'pages.tok.open': 'ساعت باز شدن ({v})', 'pages.tok.day': 'روز بازگشایی، مثلاً یکشنبه', 'pages.tok.email': 'ایمیل استودیو ({v})', 'pages.tok.close': 'ساعت بسته شدن ({v})',
      'pages.tok.label': 'نام روز ویژه، همان‌که در «تنظیمات» آمده', 'pages.tok.x': 'خدمت‌هایی که بازدیدکننده انتخاب کرده', 'pages.tok.total': 'تعداد مرحله‌ها ({b})',
      'pages.tok.n': 'شمارهٔ مرحله، از {a} تا {b}', 'pages.tok.w': 'واژه یا خدمتی که بازدیدکننده لمس کرده',
      'pages.parts': '{n} گزینه، جداشده با |. تعدادشان را در انگلیسی و عربی یکی نگه دارید؛ به ترتیب با هم جفت می‌شوند.', 'pages.partsDiff': 'متن عربی {a} گزینه دارد و متن انگلیسی {b} گزینه.',
      'pages.spaces': 'فاصله‌ها مهم‌اند: سایت این متن را دقیقاً همان‌طور که نوشته شده میان نام‌ها می‌گذارد.',
      'pages.unused': 'سایت فعلی از این سطر استفاده نمی‌کند، پس ویرایشش چیزی را تغییر نمی‌دهد.',
      'pages.srOnly': 'صفحه‌خوان‌ها آن را برای کاربرانشان بلند می‌خوانند و روی صفحه دیده نمی‌شود.',
      'pages.when.phone': 'فعلاً در سایت پنهان است: فیلد تلفن در «تنظیمات» خاموش است.', 'pages.when.budget': 'فعلاً در سایت پنهان است: فیلد بودجه در «تنظیمات» خاموش است.',
      'pages.when.privacy': 'فعلاً در سایت پنهان است: پیوند حریم خصوصی در «تنظیمات» تعیین نشده.', 'pages.when.consent': 'فعلاً در سایت پنهان است: نوار رضایت در «تنظیمات» خاموش است یا سرویس آمار تنظیم نشده.',
      'pages.when.special': 'فقط در روزهای ویژه دیده می‌شود و هنوز روز ویژه‌ای در «تنظیمات» تعیین نشده.', 'pages.openSettings': 'باز کردن تنظیمات',
      'pages.lbl.tagline': 'شعار', 'pages.taglineHint': 'پانویس سطر انگلیسی و عربی را کنار هم نشان می‌دهد، به هر زبانی که صفحه باشد.',
      'pages.elsewhere': 'بقیهٔ این بخش این‌جا ویرایش می‌شود:', 'pages.alsoIn': 'همچنین در', 'pages.readOnly': 'نقش شما فقط اجازهٔ خواندن متن‌ها را می‌دهد، نه تغییرشان.',
      'pages.inspectOn': 'ویرایش با کلیک روشن است. روی هر متنی در پیش‌نمایش کلیک کنید تا ویرایشش کنید.', 'pages.inspectOff': 'ویرایش با کلیک خاموش شد.',
      'pages.k.next': 'بخش بعدی', 'pages.k.prev': 'بخش قبلی',
      'pages.wholeSite': 'کل سایت', 'pages.hiddenN': '{n} بخش پنهان', 'pages.inPreview': 'اکنون در پیش‌نمایش', 'pages.siteSection': 'بخش سایت',
      'pages.noFields': 'این بخش متنی ندارد', 'pages.noFieldsText': 'سایت این‌جا از هیچ کلید متنی استفاده نمی‌کند.',
      'pages.lbl.scene': 'صحنهٔ {n}', 'pages.lbl.item': 'مورد {n}', 'pages.lbl.label': 'روتیتر', 'pages.lbl.desc': 'توضیح', 'pages.lbl.sub': 'مقدمه', 'pages.lbl.btn': 'دکمه',
      'pages.lbl.alt': 'توضیح تصویر', 'pages.lbl.note': 'یادداشت', 'pages.lbl.err': 'پیام خطا', 'pages.lbl.c': 'عنوان ستون', 'pages.lbl.add': 'دکمهٔ افزودن', 'pages.lbl.text': 'متن',
      'pages.ui.none': 'مقدمهٔ برنامه، پیش از انتخاب', 'pages.ui.some': 'مقدمهٔ برنامه، پس از انتخاب موج‌ها', 'pages.ui.allTitle': 'عنوان برنامه، پیش از انتخاب',
      'pages.ui.planAdded': 'اعلان: برنامه اضافه شد', 'pages.ui.addBrief': 'دکمه: افزودن به درخواست', 'pages.ui.inBrief': 'دکمه: در درخواست',
      'pages.ui.get': 'عنوان فهرست مرحله', 'pages.ui.getMine': 'عنوان فهرست مرحله، شخصی', 'pages.ui.stage': 'اعلام مرحله',
      'pages.ui.open': 'وضعیت: الان باز است', 'pages.ui.today': 'وضعیت: امروز دیرتر باز می‌شود', 'pages.ui.tomorrow': 'وضعیت: فردا باز می‌شود', 'pages.ui.weekend': 'وضعیت: تعطیل آخر هفته',
      'pages.ui.subject': 'موضوع ایمیل', 'pages.ui.bodyName': 'متن ایمیل: نام', 'pages.ui.bodyEmail': 'متن ایمیل: ایمیل', 'pages.ui.bodyCo': 'متن ایمیل: شرکت', 'pages.ui.bodyWaves': 'متن ایمیل: انتخاب‌ها', 'pages.ui.bodyWords': 'متن ایمیل: واژه‌ها',
      'pages.ui.sending': 'هنگام ارسال', 'pages.ui.opening': 'هنگام باز شدن برنامهٔ ایمیل', 'pages.ui.copied': 'پس از کپی درخواست', 'pages.ui.copyFail': 'اگر کپی نشد',
      'pages.ui.added': 'اعلان: به درخواست اضافه شد', 'pages.ui.away': 'عنوان زبانه وقتی بازدیدکننده رفته است', 'pages.ui.wave': 'شمارهٔ مرحله در فیلم', 'pages.ui.bodySvc': 'متن ایمیل: خدمات',
      'pages.ui.planOne': 'عنوان برنامه، وقتی یک مرحله انتخاب شده', 'pages.ui.planFirst': 'عنوان برنامه: مرحلهٔ اول', 'pages.ui.planThen': 'عنوان برنامه: هر مرحلهٔ بعدی',
      'pages.ui.planComma': 'عنوان برنامه: جداکنندهٔ نام‌ها', 'pages.ui.planAnd': 'عنوان برنامه: پیش از نام آخر',
      'pages.ui.closedFor': 'وضعیت: تعطیل برای روز ویژه', 'pages.ui.hoursFor': 'وضعیت: ساعت کاری ویژهٔ امروز',
      'pages.ui.budgets': 'فرم درخواست: گزینه‌های بودجه', 'pages.ui.bodyPhone': 'متن ایمیل: تلفن', 'pages.ui.bodyBudget': 'متن ایمیل: بودجه',
    },
  });

  /* ================= small helpers ================= */
  /** What the last preview scan learned (order, sections, attribute keys); read once from MA.db, then kept in memory. */
  let siteCache;
  const siteInfo = () => siteCache === undefined ? (siteCache = MA.db.get(DB.site, null)) : siteCache;
  const plain = v => MA.strip(v ?? '').replace(/\s+/g, ' ').trim();
  const hasLetters = s => /\p{L}/u.test(s);
  const titleCase = s => String(s).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._-]+/g, ' ').trim().replace(/^\w/, c => c.toUpperCase());
  const known = (key, vars) => { const v = MA.t(key, vars); return v === key ? null : v; };
  const toks = s => new Set([...String(s ?? '').matchAll(/\{(\w+)\}/g)].map(m => m[1]));
  /** Site copy shown inside the admin: Arabic when the admin is in Arabic, English otherwise (MA.siteLang). */
  const siteL = o => (MA.siteLang() === 'ar' ? o?.ar || o?.en : o?.en) || '';
  const swellName = s => siteL({ en: s?.en?.service || s?.id || '', ar: s?.ar?.service });
  /** Search folding (Arabic/Persian letter variants, digits, case), so a Persian keyboard finds Arabic copy. */
  const fold = s => (MA.fold ? MA.fold(s) : String(s ?? '').toLowerCase());

  /** Section (group) name: the core's name (sec.<g>), then the page section the copy sits in (from the preview scan),
      then the key prefix title-cased. */
  const groupName = g => {
    const real = known('sec.' + g) || (MA.content.GROUP_NAMES?.[g] ? MA.content.groupName(g) : null);
    if (real) return real;
    const dom = siteInfo()?.sec?.[g];
    if (dom && dom !== g) { const host = known('sec.' + dom); return host ? `${host} · ${titleCase(g)}` : titleCase(dom); }
    return titleCase(g);
  };

  /** A label for a key the core can't name, built from its parts: j3.note → "Scene 4 · Note", ab.2c → "Item 2 · Column heading".
      null when a part isn't a word we know. */
  const guessLabel = k => {
    const parts = String(k).split('.'), pre = parts[0], rest = parts.slice(1).join('.'), bits = [], word = w => known('pages.lbl.' + w);
    let m = pre.match(/^j(\d+)$/);
    if (m) bits.push(T('lbl.scene', { n: MA.num(+m[1] + 1) }));
    if (!rest) return null;
    if ((m = rest.match(/^(\d+)([a-zA-Z]*)$/))) { bits.push(T('lbl.item', { n: MA.num(+m[1]) })); if (m[2]) { const w = word(m[2]); if (!w) return null; bits.push(w); } }
    else if ((m = rest.match(/^([a-zA-Z]+?)(\d+)$/))) { const w = word(m[1]); if (!w) return null; bits.push(`${w} ${MA.num(+m[2])}`); }
    else { const w = word(rest); if (!w) return null; bits.push(w); }
    return bits.join(' · ');
  };
  /** Keys the site uses as attributes (alt text, aria-label), learned from the preview scan. */
  const attrOf = k => siteInfo()?.attr?.[k] || null;
  /** Field label: the core's (trilingual) label, else ours from the key's parts, else the key title-cased. */
  const keyLabel = k => {
    const c = MA.content.keyLabel(k);
    if (c && c !== k) return String(c);
    if (attrOf(k) === 'alt') { const n = String(k).match(/(\d+)$/)?.[1]; return T('lbl.alt') + (n ? ' ' + MA.num(+n) : ''); }
    return guessLabel(k) || titleCase(String(k).split('.').slice(1).join(' ') || k);
  };
  const uiLabel = k => known('pages.ui.' + k) || titleCase(k);

  /* ================= model: groups, fields, stats ================= */
  /** Groups in site order, each { id, tail, keys:[text keys], ui:[ui keys], make, target (preview section), secKey (content.sections key) }. */
  function buildModel() {
    const D = MA.content.defaults || {}, keys = Object.keys(D.text?.en || {}), groupOf = MA.content.groupOf;
    const uiKeys = Object.keys(D.ui?.en || {}), map = new Map();
    keys.forEach(k => { const g = groupOf(k); if (!map.has(g)) map.set(g, []); map.get(g).push(k); });
    if (Array.isArray(D.make) && D.make.length && !map.has('make')) map.set('make', []);
    const SITE = MA.metrics?.sectionOrder?.() || ['top', ...Object.keys(D.sections || {}), 'foot'];
    const site = siteInfo();
    const ids = [...map.keys()].filter(g => !TAIL.includes(g));
    // without a preview scan yet: known sections in the site's order; a new prefix sits next to the section its keys follow
    const heur = g => {
      const si = SITE.indexOf(g); if (si >= 0) return si * 10 + 5;
      const first = keys.findIndex(k => groupOf(k) === g);
      for (let i = first - 1; i >= 0; i--) { const gi = SITE.indexOf(groupOf(keys[i])); if (gi >= 0) return gi * 10 + 6 + first / 1e4; }
      for (let i = first + 1; i < keys.length; i++) { const gi = SITE.indexOf(groupOf(keys[i])); if (gi >= 0) return gi * 10 + 4 + first / 1e4; }
      return 1e3 + first;
    };
    const domOk = Array.isArray(site?.order) && ids.every(g => site.order.includes(g));
    ids.sort((a, b) => domOk ? site.order.indexOf(a) - site.order.indexOf(b) : heur(a) - heur(b));
    const tail = TAIL.filter(g => g === 'ui' ? uiKeys.length > 0 : map.has(g));
    // visibility switches only for the sections the current site has (a draft saved before a redesign may still carry old ones)
    const sections = Object.keys(D.sections || MA.content.get('sections') || {});
    // which section each message belongs to: our list first, then where the preview shows it
    const relOf = {};
    for (const [g0, list] of Object.entries(RELATED)) {
      const g = ids.includes(g0) ? g0 : ids.includes(MOVED[g0]) ? MOVED[g0] : null; if (!g) continue;
      list.forEach(k => { if (uiKeys.includes(k) && !relOf[k]) relOf[k] = g; });
    }
    for (const [k, sid] of Object.entries(site?.uiSec || {})) {
      if (relOf[k] || !uiKeys.includes(k) || !sid || UNUSED_UI.includes(k)) continue;
      const g = ids.includes(sid) ? sid : ids.find(x => (site.sec?.[x] || MA.content.sectionOf(x)) === sid);
      if (g) relOf[k] = g;
    }
    // the footer tagline ({en, ar}, both shown at once) sits with the footer copy
    const tagG = D.tagline && typeof D.tagline === 'object' ? (ids.includes('foot') ? 'foot' : ids.find(g => MA.content.sectionOf(g) === 'foot') || ids.at(-1)) : null;
    return [...ids, ...tail].map(id => {
      const isTail = TAIL.includes(id), s = MA.content.sectionOf(id), domSec = site?.sec?.[id];
      return {
        id, tail: isTail,
        keys: id === 'ui' ? [] : (map.get(id) || []),
        ui: id === 'ui' ? [...uiKeys.filter(k => !UNUSED_UI.includes(k)), ...uiKeys.filter(k => UNUSED_UI.includes(k))] : uiKeys.filter(k => relOf[k] === id),
        make: id === 'make' && Array.isArray(D.make),
        tagline: id === tagG,
        target: id === 'ui' ? null : (!site?.ids || site.ids.includes(s) ? s : domSec || s),
        secKey: isTail ? null : sections.includes(s) ? s : domSec && sections.includes(domSec) ? domSec : sections.includes(id) ? id : null,
      };
    });
  }
  const spec = (type, tpl, key, group, label) => ({ type, tpl, key, group, label });
  /** Every editable line in a group: text keys, related ui messages, and the floating words for 'make'. */
  function specsOf(g) {
    const out = [];
    g.keys.forEach(k => out.push(spec('text', `text/{lang}/${k}`, k, g.id, keyLabel(k))));
    if (g.tagline) out.push(spec('tagline', 'tagline/{lang}', 'tagline', g.id, T('lbl.tagline')));
    g.ui.forEach(k => out.push(spec('ui', `ui/{lang}/${k}`, k, g.id, uiLabel(k))));
    if (g.make) (MA.content.get('make') || []).forEach((row, r) => (row || []).forEach((w, i) =>
      out.push(Object.assign(spec('make', `make/${r}/${i}/{lang}`, `make.${r}.${i}`, g.id, T('rowWord', { r: MA.num(r + 1), n: MA.num(i + 1) })), { row: r, i }))));
    return out;
  }
  const val = (sp, l) => String(MA.content.get(MA.path.lang(sp.tpl, l)) ?? '');
  /** A line nothing on the site reads: listed honestly, but never counted or flagged. */
  const unused = sp => sp.type === 'ui' && UNUSED_UI.includes(sp.key);
  const countable = sp => !unused(sp) && hasLetters(plain(val(sp, 'en')));
  /** Counts as translated when the Arabic is non-empty and differs from the English. */
  const needsAr = sp => { if (unused(sp)) return false; const en = plain(val(sp, 'en')), ar = plain(val(sp, 'ar')); return hasLetters(en) && (!ar || ar === en); };
  const emptyAr = sp => !unused(sp) && !!plain(val(sp, 'en')) && !plain(val(sp, 'ar'));
  const changed = sp => MA.content.isChanged(MA.path.lang(sp.tpl, 'en')) || MA.content.isChanged(MA.path.lang(sp.tpl, 'ar')) || (sp.type === 'make' && MA.content.isChanged(`make/${sp.row}/${sp.i}/swell`));
  const matches = (sp, ql) => fold(sp.label + ' ' + sp.key + ' ' + plain(val(sp, 'en')) + ' ' + plain(val(sp, 'ar'))).includes(fold(ql));
  function stats(g) {
    const sps = specsOf(g); let total = 0, done = 0, empty = 0, ch = 0, ar = 0;
    for (const sp of sps) { if (countable(sp)) { total++; if (needsAr(sp)) ar++; else done++; } if (emptyAr(sp)) empty++; if (changed(sp)) ch++; }
    const sk = g.secKey, secPath = sk ? 'sections/' + sk : null;
    return { sps, total, done, ar, empty, fieldsChanged: ch, changed: ch + (secPath && MA.content.isChanged(secPath) ? 1 : 0),
      hidden: !!secPath && MA.content.get(secPath) === false, pubHidden: !!secPath && MA.content.pub(secPath) === false };
  }
  const tmState = st => st.pubHidden ? 'draft' : st.changed ? 'edited' : 'live';
  const tmTip = st => st.pubHidden ? T('tm.draft') : st.changed ? T('tm.edited', { n: MA.num(st.changed) }) : T('tm.live');

  /** Which group a field template belongs to (for ?field= from click-to-edit or ⌘K). */
  function groupForTpl(tpl, groups) {
    const p = String(tpl).split('/');
    if (p[0] === 'text') return MA.content.groupOf(p.slice(2).join('/'));
    if (p[0] === 'ui') return groups.find(g => !g.tail && g.ui.includes(p[2]))?.id || 'ui';
    if (p[0] === 'make') return 'make';
    if (p[0] === 'tagline') return groups.find(g => g.tagline)?.id || null;
    if (p[0] === 'sections') return groups.find(g => g.secKey === p[1])?.id || null;
    return null;
  }
  function groupFromCtx(ctx, groups = buildModel()) {
    const ids = groups.map(g => g.id), f = ctx?.query?.get('field');
    if (f) { const g = groupForTpl(f, groups); if (ids.includes(g)) return g; }
    const s = ctx?.sub?.[0]; if (s && ids.includes(s)) return s;
    const last = MA.db.get(DB.group, ''); if (ids.includes(last)) return last;
    return ids[0] || null;
  }

  /* ================= page state ================= */
  let S = null;              // the mounted page; null while another page is open
  let pendingInspect = false; // "Toggle click-to-edit" from elsewhere: turn inspect on once the page mounts
  const mounted = () => !!S?.root?.isConnected;
  const cur = () => S.groups.find(g => g.id === S.group) || S.groups[0];
  const relatedGroup = k => S.groups.find(g => !g.tail && g.ui.includes(k))?.id || null;
  /** A click-to-edit pick asks for one language; if the language mode hides it, show both for this visit (not remembered). */
  function langFor(want) {
    if (!want?.lang || S.langs === 'both' || want.lang === S.langs) return false;
    S.langs = 'both'; S.langSeg.set('both'); return true;
  }

  function render(view, ctx) {
    view.classList.add('full');
    const langs = MA.db.get(DB.langs, 'both');
    S = { groups: buildModel(), q: '', filter: 'all', langs: ['en', 'ar', 'both'].includes(langs) ? langs : 'both',
      listOpen: false, mode: '', inView: null, makeEl: null, res: null, wideOpen: true };
    S.group = groupFromCtx(ctx, S.groups);
    if (S.group) MA.db.set(DB.group, S.group);
    migratePrefs();

    // header: search, language mode, preview toggle (the shared preview pane's)
    S.searchInp = MA.h('input.input.sm', { type: 'search', placeholder: T('search') + '…', 'aria-label': T('search'), autocomplete: 'off', spellcheck: false });
    S.clearQ = MA.h('button.pg-clear', { type: 'button', hidden: true, 'aria-label': T('clearSearch'), title: T('clearSearch'), html: MA.icon('close', 'sm'), onclick: () => { setQuery(''); S.searchInp.focus(); } });
    S.searchInp.addEventListener('input', MA.debounce(() => setQuery(S.searchInp.value, true), 140));
    S.searchInp.addEventListener('keydown', e => {
      if (e.key === 'Escape' && S.searchInp.value) { e.preventDefault(); e.stopPropagation(); setQuery(''); }
      if (e.key === 'Enter') { e.preventDefault(); setQuery(S.searchInp.value, true); S.body.querySelector('[data-path]')?.focus(); }
    });
    const search = MA.h('div.pg-search', MA.iconEl('search', 'sm'), S.searchInp, S.clearQ);
    S.langSeg = MA.ui.seg([{ value: 'en', label: 'EN' }, { value: 'ar', label: T('arabic') }, { value: 'both', label: T('both') }], S.langs, setLangs, { size: 'sm', label: T('langMode') });
    S.langSeg.classList.add('pg-langs');
    // the Arabic choice is written in Arabic in the English admin: tag it so screen readers say it in Arabic
    const arBtn = S.langSeg.querySelectorAll('button')[1], arL = MA.langOf?.(T('arabic'));
    if (arBtn && arL && arL !== MA.lang()) arBtn.lang = arL;

    // the root goes in first (empty), so the layout mode is known before the preview pane decides whether to load
    S.root = MA.h('div.m-pages');
    view.append(S.root);
    const mode0 = modeFor(S.root.clientWidth - padX(S.root));
    if (mode0 !== 'wide') { S.wideOpen = pvSaved().open !== false; S.softHidden = true; pvKeep(false); } // narrow: the preview starts as a closed panel
    S.pane = MA.ui.previewPane({ key: PV_KEY, section: cur()?.target || null, device: 'auto', width: 480, min: 320, max: 900 });
    if (mode0 !== 'wide') pvKeep(S.wideOpen);
    S.pane.toggle.classList.add('pg-pvbtn');
    const head = MA.ui.pageHead({ title: esc(MA.L(MOD.title)), sub: esc(T('sub')), actions: [search, S.langSeg, S.pane.toggle] });

    // the panes: section list + inspector (the editor), then the shared preview pane
    S.rowsEl = MA.h('nav.pg-rows', { 'aria-label': T('sections') });
    S.listFoot = MA.h('div.pg-list-foot');
    S.list = MA.h('aside.pg-list',
      MA.h('div.pg-list-head', MA.h('span.label', T('sections')), MA.h('span.grow'),
        MA.ui.iconBtn('close', { tip: MA.t('close'), size: 'sm', onclick: () => { S.listOpen = false; applyLayout(); } })),
      S.rowsEl, S.listFoot);
    S.head = MA.h('div.pg-head'); S.body = MA.h('div.pg-scroll');
    S.insp = MA.h('section.pg-insp', S.head, S.body);
    const scrim = MA.h('div.pg-scrim', { onpointerdown: () => { S.listOpen = false; if (S.mode !== 'wide' && S.pane.visible) S.pane.hide(); applyLayout(); } });
    S.bodyEl = MA.h('div.pg-body', S.list, S.insp);
    S.split = MA.ui.previewPane.split(S.bodyEl, S.pane);
    S.split.classList.add('pg-split');
    S.split.append(scrim);
    S.root.append(head, S.split);

    // the pane hides and shows itself (its toggle, its ×, the p key): keep the layout in step, and keep a panel opened in a
    // narrow window from changing what the wide layout remembers
    const mo = new MutationObserver(onPane); mo.observe(S.pane.el, { attributes: true, attributeFilter: ['hidden'] });
    S.root.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (S.mode !== 'wide' && (S.pane.visible || S.listOpen)) { e.preventDefault(); S.listOpen = false; if (S.pane.visible) S.pane.hide(); applyLayout(); }
    });

    if (ctx?.query?.get('field')) langFor(MA.content.focusAfterRoute);
    applyLayout();
    if (pendingInspect) { pendingInspect = false; showPreview(); S.pane.frame?.set({ inspect: true }); }
    syncFrame();
    drawList(); drawInspector();
    setTimeout(fitHeight); requestAnimationFrame(fitHeight);
    const ro = new ResizeObserver(() => applyLayout()); ro.observe(S.root);
    const onResize = () => { applyLayout(); fitHeight(); }; addEventListener('resize', onResize);
    MA.cleanup(() => { ro.disconnect(); mo.disconnect(); removeEventListener('resize', onResize); });

    // live state: batch redraws of the list and the header (a timer, not rAF, so it also runs while the tab isn't painting)
    let timer = 0;
    const refresh = () => { if (timer) return; timer = setTimeout(() => { timer = 0; if (!mounted()) return; drawList(); drawHead(S.q ? S.res : undefined); drawNotice(); }, 32); };
    MA.cleanup(() => clearTimeout(timer));
    MA.onView('content:change', ({ path = '' } = {}) => {
      if (!mounted()) return;
      if (S.makeEl && (path === '' || path === 'make' || path === 'swells' || path.startsWith('swells/'))) S.makeEl._draw();
      if (path === '' || path === 'sections' || path.startsWith('sections/')) S.groups = buildModel();
      // settings that decide whether a line shows (form fields, privacy link, consent, special days) change the notes
      if (path === '' || path === 'studio' || path.startsWith('studio/')) S.body.querySelectorAll('.pg-f').forEach(b => b._refresh?.());
      refresh();
    });
    MA.onView('prefs', () => setTimeout(fitHeight));
    MA.onView('site:frameReady', fr => { if (mounted() && fr === S.pane.frame) { syncFrame(); scanSite(); } });
    MA.onView('site:section', ({ id, frame } = {}) => { if (mounted() && frame === S.pane.frame) { S.inView = id; markInView(); } });
    // page keys (p, the preview, is bound by the pane); they go away with the page
    MA.keys.bindView('j', () => step(1), () => T('k.next'));
    MA.keys.bindView('k', () => step(-1), () => T('k.prev'));
  }

  function step(d) {
    if (!mounted() || !S.groups.length) return;
    const i = S.groups.findIndex(g => g.id === S.group), n = S.groups.length;
    MA.go('#/pages/' + encodeURIComponent(S.groups[(i + d + n) % n].id));
  }

  /** Sub-route change (#/pages/<group>, ?field=…): swap the inspector in place, keep the preview loaded. */
  function update(ctx) {
    if (!mounted()) return false;
    const field = ctx.query.get('field');
    S.groups = buildModel();
    const g = groupFromCtx(ctx, S.groups);
    let reset = false;
    if (field) {
      if (S.q || S.filter !== 'all') { S.q = ''; S.searchInp.value = ''; S.clearQ.hidden = true; S.filter = 'all'; reset = true; }
      if (langFor(MA.content.focusAfterRoute)) reset = true;
      if (S.listOpen) { S.listOpen = false; applyLayout(); }
    }
    select(g, { goto: !field, force: reset });
    return true;
  }
  function select(g, { goto = true, force = false } = {}) {
    if (!g) return;
    const changedG = g !== S.group;
    S.group = g; MA.db.set(DB.group, g);
    if (S.q && !force) {
      const h = S.body.querySelector(`.pg-res-head[data-g="${CSS.escape(g)}"]`);
      if (h) { h.scrollIntoView({ block: 'start' }); drawList(); if (goto) gotoPreview(); return; }
      S.q = ''; S.searchInp.value = ''; S.clearQ.hidden = true; force = true;
    }
    if (changedG || force) drawInspector();
    drawList();
    S.rowsEl.querySelector('.pg-row.on')?.scrollIntoView({ block: 'nearest' });
    if (goto) gotoPreview();
  }
  /** Aim the preview at the section (a preview built later starts there too). */
  function gotoPreview() { const g = cur(); if (g?.target) S.pane.goto(g.target); }

  /* ================= layout: modes, preview pane, height ================= */
  const modeFor = w => w >= WIDE ? 'wide' : w >= MID ? 'mid' : 'narrow';
  const padX = el => { const cs = getComputedStyle(el); return (parseFloat(cs.paddingInlineStart) || 0) + (parseFloat(cs.paddingInlineEnd) || 0); };
  /** The pane remembers open/width/device per page in MA.db 'pvPanes' (MA.ui.previewPane). */
  const pvSaved = () => MA.db.get('pvPanes', {})?.[PV_KEY] || {};
  const pvKeep = open => { const a = MA.db.get('pvPanes', {}) || {}; a[PV_KEY] = { ...a[PV_KEY], open }; MA.db.set('pvPanes', a); };
  /** Older versions kept the preview's open state and width under pages.preview / pages.pvw: carry them over once. */
  function migratePrefs() {
    const old = MA.db.get('pages.preview', null), w = +MA.db.get('pages.pvw', 0) || 0;
    if (old == null && !w) return;
    const a = MA.db.get('pvPanes', {}) || {};
    if (!a[PV_KEY]) { a[PV_KEY] = { open: old !== false, ...(w ? { width: w } : {}) }; MA.db.set('pvPanes', a); }
    ['pages.preview', 'pages.pvw', 'pages.device'].forEach(k => MA.db.del(k));
  }
  /** Wide: list · inspector · preview side by side. Mid and narrow: the preview (and, when narrow, the list) open as panels. */
  function applyLayout() {
    if (!mounted()) return;
    const w = S.split.clientWidth || (S.root.clientWidth - padX(S.root));
    if (!w) return;
    const mode = modeFor(w);
    if (mode !== S.mode) {
      S.mode = mode; S.listOpen = false;
      S.root.dataset.mode = mode;
      if (mode === 'wide') {
        // back to three panes: bring back a preview we closed for the narrow layout; one opened as a panel stays open
        if (S.pane.visible) { S.wideOpen = true; pvKeep(true); }
        else if (S.softHidden && S.wideOpen) S.pane.show();
        S.softHidden = false;
      } else {
        if (S.pane.visible) { S.wideOpen = true; S.pane.hide(); }
        S.softHidden = true;
      }
    }
    Object.assign(S.root.dataset, { mode, pv: S.pane.visible ? 'on' : 'off', list: S.listOpen ? 'open' : 'shut' });
  }
  /** The pane was shown or hidden (toggle, ×, p, or us). */
  function onPane() {
    if (!mounted()) return;
    if (S.mode === 'wide') S.wideOpen = S.pane.visible;
    else { pvKeep(S.wideOpen); if (S.pane.visible) S.listOpen = false; } // a panel opened in a narrow window isn't the wide layout's choice
    applyLayout(); syncFrame();
  }
  function showPreview() { if (!S.pane.visible) S.pane.show(); applyLayout(); }
  /** A freshly built preview follows the page: the language mode, and the section being edited. */
  function syncFrame() {
    const fr = S?.pane?.frame; if (!fr) return;
    if (S.langs !== 'both' && fr.state.lang !== S.langs) fr.set({ lang: S.langs }, { remember: false });
  }
  /** The page fills the window under the top bar; the panes scroll on their own. */
  function fitHeight() { if (mounted()) S.root.style.height = Math.max(480, innerHeight - (S.root.getBoundingClientRect().top + scrollY)) + 'px'; }

  /** Read the loaded preview: where each group's copy sits on the page (site order, section ids). Cached for the next visit. */
  function scanSite() {
    let doc; try { doc = S.pane.frame?.iframe.contentDocument; } catch (e) { return; }
    if (!doc?.body) return;
    const groupOf = MA.content.groupOf, first = {}, sec = {}, attr = {}, inner = new Set(), uiSec = {};
    const secOf = el => (el.closest('main > section[id], header[id], footer[id]') || el.closest('section[id]'))?.id || null;
    let i = 0;
    for (const el of doc.querySelectorAll('[data-i18n],[data-i18n-aria],[data-i18n-alt]')) {
      if (el.dataset.i18n) inner.add(el.dataset.i18n);
      if (el.dataset.i18nAlt) attr[el.dataset.i18nAlt] = 'alt';
      if (el.dataset.i18nAria) attr[el.dataset.i18nAria] = 'aria';
      for (const k of [el.dataset.i18n, el.dataset.i18nAria, el.dataset.i18nAlt]) {
        if (!k) continue;
        const g = groupOf(k); if (first[g] != null) continue;
        first[g] = i; sec[g] = secOf(el);
      }
      i++;
    }
    inner.forEach(k => delete attr[k]); // a key that is also shown as text stays a text field
    // messages the site has written into the page so far (click-to-edit marks them data-cms="ui.<key>")
    for (const el of doc.querySelectorAll('[data-cms^="ui."]')) { const k = el.dataset.cms.slice(3); if (!(k in uiSec)) uiSec[k] = secOf(el); }
    const next = { order: Object.keys(first).sort((a, b) => first[a] - first[b]), sec, attr, uiSec, ids: [...doc.querySelectorAll('[id]')].map(e => e.id).slice(0, 600) };
    const before = siteInfo();
    if (MA.eq(before, next)) return;
    siteCache = next; MA.db.set(DB.site, next);
    S.groups = buildModel();
    drawList(); drawHead(S.q ? S.res : undefined);
    // labels or field kinds learned from the page: redraw the fields unless someone is typing in them
    if (!MA.eq(before?.attr, next.attr) && !S.body.contains(document.activeElement)) { const top = S.body.scrollTop; drawInspector(); S.body.scrollTop = top; }
  }

  /* ================= the section list (tide chart) ================= */
  function drawList() {
    const act = document.activeElement, keep = S.rowsEl.contains(act) ? { g: act.closest('[data-g]')?.dataset.g, eye: act.classList.contains('pg-eye') } : null;
    const top = S.rowsEl.scrollTop;
    S.rowsEl.innerHTML = '';
    let tail = false;
    S.rowsEl.append(MA.h('div.pg-sub.label', T('onPage')));
    for (const g of S.groups) {
      if (g.tail && !tail) { tail = true; S.rowsEl.append(MA.h('div.pg-sub.label', T('around'))); }
      S.rowsEl.append(rowEl(g));
    }
    S.rowsEl.scrollTop = top;
    if (keep?.g) S.rowsEl.querySelector(`[data-g="${CSS.escape(keep.g)}"] ${keep.eye ? '.pg-eye' : '.pg-row-main'}`)?.focus({ preventScroll: true });
    drawFoot(); markInView();
  }
  const arBar = st => MA.h('span.pg-bar', { 'aria-hidden': 'true' }, MA.h('i', { style: `inline-size:${((st.total ? st.done / st.total : 1) * 100).toFixed(1)}%` }));
  const arCount = st => MA.h('span', { class: 'pg-arn num' + (st.done < st.total ? ' todo' : ''), title: T('arTip', { a: MA.num(st.done), b: MA.num(st.total) }) }, T('arCount', { a: MA.num(st.done), b: MA.num(st.total) }));
  const arMeter = st => MA.h('span.pg-ar', arBar(st), arCount(st));
  function rowEl(g) {
    const st = stats(g), on = g.id === S.group, can = MA.can('content.edit'), name = groupName(g.id);
    const hits = S.q ? st.sps.filter(sp => matches(sp, S.q.toLowerCase())).length : null;
    const row = MA.h('div', { class: 'pg-row' + (on ? ' on' : '') + (st.hidden ? ' off' : '') + (st.done < st.total ? ' todo' : '') + (hits === 0 ? ' nohit' : ''), dataset: { g: g.id } });
    const meta = MA.h('span.pg-meta');
    if (hits) meta.append(MA.h('span.pg-hits.num', MA.num(hits)));
    if (st.hidden) meta.append(MA.h('span.pg-hidden', T('hidden')));
    if (st.changed) meta.append(MA.h('span.pg-dot', { title: T('unpubN', { n: MA.num(st.changed) }), role: 'img', 'aria-label': T('unpubN', { n: MA.num(st.changed) }) }));
    meta.append(arCount(st));
    const a = MA.h('a.pg-row-main', { href: '#/pages/' + encodeURIComponent(g.id), 'aria-current': on ? 'true' : null,
      onclick: () => { if (S.mode === 'narrow') { S.listOpen = false; applyLayout(); } } },
      MA.h('span.pg-tm', { title: tmTip(st) }, MA.ui.tideMark(tmState(st))), MA.h('span.pg-name', { title: name }, name), meta, arBar(st));
    row.append(a);
    if (g.secKey && can) {
      const tip = T(st.hidden ? 'showSec' : 'hideSec');
      row.append(MA.h('button.icon-btn.sm.pg-eye', { type: 'button', title: tip, 'aria-label': `${tip}: ${name}`, 'aria-pressed': String(!st.hidden), html: MA.icon(st.hidden ? 'eyeOff' : 'eye', 'sm'), onclick: () => setVisible(g, st.hidden) }));
    } else if (can && S.groups.some(x => x.secKey)) row.append(MA.h('span.pg-eye-slot', { 'aria-hidden': 'true' })); // keeps every row the same width
    return row;
  }
  function drawFoot() {
    const seen = new Set(), secs = new Set(); let total = 0, done = 0;
    for (const g of S.groups) {
      for (const sp of specsOf(g)) { if (seen.has(sp.tpl)) continue; seen.add(sp.tpl); if (countable(sp)) { total++; if (!needsAr(sp)) done++; } }
      if (g.secKey && MA.content.get('sections/' + g.secKey) === false) secs.add(g.secKey);
    }
    S.listFoot.innerHTML = '';
    S.listFoot.append(MA.h('div.pg-foot-row', MA.h('span.pg-foot-l', T('wholeSite')), arMeter({ done, total })));
    if (secs.size) S.listFoot.append(MA.h('div.pg-foot-row.faint', MA.iconEl('eyeOff', 'sm'), MA.h('span', T('hiddenN', { n: MA.num(secs.size) }))));
  }
  function markInView() {
    const site = siteInfo();
    for (const row of S.rowsEl.querySelectorAll('.pg-row')) {
      const g = S.groups.find(x => x.id === row.dataset.g), sec = g && !g.tail ? (site?.sec?.[g.id] || g.target) : null;
      const on = !!S.inView && sec === S.inView;
      row.classList.toggle('inview', on);
      if (on) row.title = T('inPreview'); else row.removeAttribute('title');
    }
  }
  function setVisible(g, on) {
    if (!g.secKey || !MA.can('content.edit')) return;
    const name = groupName(g.id);
    if (MA.content.set('sections/' + g.secKey, !!on, { coalesce: false, label: T(on ? 'lblShow' : 'lblHide', { name }) }))
      MA.toast(esc(T(on ? 'secShown' : 'secHidden', { name })), { icon: on ? 'eye' : 'eyeOff', undo: () => MA.content.undo() });
  }

  /* ================= the inspector ================= */
  const filterFn = () => S.filter === 'ar' ? needsAr : S.filter === 'unpub' ? changed : () => true;
  const sectionTitle = t => MA.h('div.section-title', MA.h('span.label', t));
  const callout = (icon, html, action, tone = '') => MA.h('div', { class: 'callout pg-callout ' + tone }, MA.iconEl(icon),
    MA.h('div.grow', MA.h('p', { html }), action ? MA.h('div.pg-callout-act', action) : null));

  /** Notices above the fields (read-only role, hidden section); redrawn on every content change. */
  function drawNotice() {
    const N = S.notice; if (!N) return;
    const g = cur(), can = MA.can('content.edit'), hidden = !!g?.secKey && MA.content.get('sections/' + g.secKey) === false;
    const key = `${can}|${hidden}|${g?.id}`;
    if (N.dataset.key === key) return;
    N.dataset.key = key; N.innerHTML = '';
    if (!can) N.append(callout('lock', esc(T('readOnly'))));
    if (hidden) N.append(callout('eyeOff', esc(T('hiddenCallout')), can ? MA.ui.btn(T('showSec'), { size: 'sm', icon: 'eye', onclick: () => setVisible(g, true) }) : null, 'warn'));
  }
  function drawInspector() {
    S.body.innerHTML = ''; S.body.scrollTop = 0; S.makeEl?._destroy?.(); S.makeEl = null; S.res = null; S.notice = null;
    if (S.q) return drawResults();
    drawHead();
    const g = cur(); if (!g) return;
    const st = stats(g), B = S.body;
    S.notice = MA.h('div.pg-notice'); B.append(S.notice); drawNotice();
    const sps = st.sps.filter(filterFn());
    if (!sps.length) return B.append(emptyFor(st.sps.length));
    const text = sps.filter(s => s.type === 'text' || s.type === 'tagline'), ui = sps.filter(s => s.type === 'ui'), mk = sps.filter(s => s.type === 'make');
    if (text.length) B.append(MA.h('div.pg-fields', text.map(sp => fieldEl(sp))));
    if (ui.length) {
      if (g.id !== 'ui') B.append(sectionTitle(T('msgsHere')), MA.h('p.pg-hint', T('msgsHint')));
      B.append(MA.h('div.pg-fields', ui.map(sp => fieldEl(sp, { also: g.id === 'ui' }))));
    }
    if (g.make && S.filter === 'all') { S.makeEl = makeEditor(); B.append(S.makeEl); }
    else if (mk.length) B.append(sectionTitle(T('words')), MA.h('div.pg-fields', mk.map(sp => fieldEl(sp))));
  }
  function emptyFor(any) {
    const all = MA.ui.btn(T('showAll'), { size: 'sm', onclick: () => setFilter('all') });
    if (!any) return MA.ui.empty({ title: esc(T('noFields')), text: esc(T('noFieldsText')), pose: 'present', compact: true });
    if (S.filter === 'ar') return MA.ui.empty({ title: esc(T('allAr')), text: esc(T('allArText')), pose: 'arrive', compact: true, actions: [all] });
    return MA.ui.empty({ title: esc(T('noUnpub')), text: esc(T('noUnpubText')), pose: 'ride', compact: true, actions: [all] });
  }
  function setFilter(f) { S.filter = f; drawInspector(); }
  function setQuery(v, fromInput) {
    if (!mounted()) return;
    const q = String(v || '').trim();
    if (!fromInput) S.searchInp.value = v;
    S.clearQ.hidden = !q;
    if (q === S.q) return;
    S.q = q; drawInspector(); drawList();
  }
  function setLangs(v) {
    S.langs = v; MA.db.set(DB.langs, v);
    const top = S.body.scrollTop; drawInspector(); S.body.scrollTop = top;
    syncFrame();
  }

  function chips(all, nAr, nUnpub) {
    const chip = (f, label, n) => MA.h('button.tag.pg-chip', { type: 'button', dataset: { f, n: n ? 'some' : 'none' }, 'aria-pressed': String(S.filter === f), onclick: () => setFilter(S.filter === f && f !== 'all' ? 'all' : f) },
      MA.h('span', label), MA.h('span.pg-c.num', MA.num(n)));
    return [chip('all', T('all'), all), chip('ar', T('needsAr'), nAr), chip('unpub', T('unpub'), nUnpub)];
  }
  function drawHead(res) {
    const H = S.head; H.innerHTML = '';
    const listBtn = MA.h('button.btn.sm.pg-listbtn', { type: 'button', onclick: () => { S.listOpen = true; if (S.mode !== 'wide' && S.pane.visible) S.pane.hide(); applyLayout(); S.rowsEl.querySelector('.pg-row.on .pg-row-main')?.focus(); }, html: MA.icon('list', 'sm') + `<span>${esc(T('sections'))}</span>` });
    if (S.q) {
      const r = res || { n: 0, s: 0, ar: 0, unpub: 0 };
      H.append(
        MA.h('div.pg-titlerow', MA.h('div.grow', MA.h('p.pg-eyebrow', listBtn, MA.iconEl('search', 'sm'), MA.h('span', T('searchEyebrow'))), MA.h('h2.h2.pg-title', { dir: 'auto', lang: MA.langOf ? MA.langOf(S.q) : null }, `“${S.q}”`)),
          MA.ui.btn(T('clearSearch'), { size: 'sm', kind: 'ghost', icon: 'close', onclick: () => setQuery('') })),
        MA.h('p.pg-desc', r.n === 1 ? T('resultsOne') : T('results', { count: r.s, n: MA.num(r.n), s: MA.num(r.s) })),
        MA.h('div.pg-filters', chips(r.n, r.ar, r.unpub)));
      return;
    }
    const g = cur(); if (!g) return;
    const st = stats(g), can = MA.can('content.edit'), siteGroups = S.groups.filter(x => !x.tail);
    const eyebrow = MA.h('p.pg-eyebrow', listBtn, MA.h('span.pg-tm', { title: tmTip(st) }, MA.ui.tideMark(tmState(st))),
      MA.h('span', g.tail ? T('aroundOne') : T('secOf', { i: MA.num(siteGroups.indexOf(g) + 1), n: MA.num(siteGroups.length) })),
      g.target && !g.tail ? MA.h('code.pg-id', '#' + g.target) : null);
    let side = null;
    if (g.secKey) side = can ? MA.h('div.pg-vis', MA.ui.switch(!st.hidden, v => setVisible(g, v), esc(T('shownOnSite')))) : st.hidden ? MA.ui.badge(T('hidden'), 'warn') : null;
    H.append(MA.h('div.pg-titlerow', MA.h('div.grow', eyebrow, MA.h('h2.h2.pg-title', groupName(g.id))), side));
    const desc = known('pages.desc.' + g.id);
    if (desc) H.append(MA.h('p.pg-desc', desc));
    const mod = MA.modules().find(m => m.id === ELSEWHERE[g.id] && m.id !== 'pages');
    if (mod && (!mod.perm || MA.can(mod.perm)))
      H.append(MA.h('p.pg-else', MA.iconEl('link', 'sm'), MA.h('span', T('elsewhere')), MA.h('a.pg-link', { href: '#/' + mod.id }, MA.L(mod.title))));
    const fill = can && st.empty ? MA.ui.btn(T('fill', { n: MA.num(st.empty) }), { size: 'sm', icon: 'language', title: T('fillTip'), onclick: () => fillEmpty(g) }) : null;
    if (fill) fill.classList.add('pg-fill');
    H.append(MA.h('div.pg-filters', chips(st.sps.length, st.ar, st.fieldsChanged), MA.h('span.grow'), fill));
  }

  function drawResults() {
    const ql = S.q.toLowerCase(), f = filterFn(), seen = new Set(), blocks = [];
    const res = { n: 0, s: 0, ar: 0, unpub: 0 };
    for (const g of S.groups) {
      const found = specsOf(g).filter(sp => !seen.has(sp.tpl) && matches(sp, ql));
      found.forEach(sp => seen.add(sp.tpl));
      if (!found.length) continue;
      res.n += found.length; res.s++; res.ar += found.filter(needsAr).length; res.unpub += found.filter(changed).length;
      const shown = found.filter(f);
      if (!shown.length) continue;
      const st = stats(g);
      blocks.push(MA.h('button.pg-res-head', { type: 'button', dataset: { g: g.id }, onclick: () => { setQuery(''); MA.go('#/pages/' + encodeURIComponent(g.id)); } },
        MA.h('span.pg-tm', MA.ui.tideMark(tmState(st))), MA.h('span.h4', groupName(g.id)), MA.h('span.pg-c.num', MA.num(shown.length)), MA.h('span.grow'), MA.iconEl('chevRight', 'sm flip')));
      blocks.push(MA.h('div.pg-fields', shown.map(sp => fieldEl(sp))));
    }
    S.res = res;
    drawHead(res);
    if (!res.n) {
      S.body.append(MA.ui.empty({ title: esc(T('noMatch', { q: S.q })), text: esc(T('noMatchText')), pose: 'present', compact: true,
        actions: [MA.ui.btn(T('clearSearch'), { size: 'sm', onclick: () => { setQuery(''); S.searchInp.focus(); } })] }));
      return;
    }
    if (!blocks.length) return S.body.append(emptyFor(res.n));
    S.body.append(...blocks);
  }

  /** Kind of input: rich for headlines and anything holding markup (<em>, <span dir>, entities); attributes stay plain text. */
  function kindOf(sp, en, ar) {
    if (sp.type === 'make') return 'text';
    const attr = sp.group === 'aria' || /\.(alt|a\d+)$/.test(sp.key) || !!attrOf(sp.key);
    if (!attr && (/<[a-z]|&[#\w]+;/i.test(en + ar) || /(^|\.)(t|title|endT)$/.test(sp.key) || /Title$/.test(sp.key))) return 'rich';
    return Math.max(plain(en).length, plain(ar).length) > 64 ? 'textarea' : 'text';
  }
  /** Text set as an attribute (aria-label, alt): the site writes it as is, with no tokens. */
  const isAttr = sp => sp.type === 'text' && (sp.group === 'aria' || /\.(alt|a\d+)$/.test(sp.key) || !!attrOf(sp.key));
  /** Tokens the site replaces in this field, and the ones that mean something there. */
  const fills = sp => sp.type === 'text' ? (isAttr(sp) ? [] : ['email']) : sp.type === 'ui' && !UNUSED_UI.includes(sp.key) ? (UI_TOKENS[sp.key] || []) : [];
  const useful = sp => (sp.type === 'ui' && USEFUL[sp.key]) || fills(sp);
  const tokText = t => known('pages.tok.' + t, {
    v: t === 'open' ? (MA.content.get('studio/open') || '09:00') : t === 'close' ? (MA.content.get('studio/close') || '18:00') : t === 'email' ? (MA.content.get('studio/email') || '') : '',
    a: MA.num(1), b: MA.num(Math.max(1, (MA.content.get('stages') || []).length || 4)),
  }) || '';
  const warnP = html => `<p class="pg-warn">${MA.icon('warn', 'sm')}<span>${html}</span></p>`;
  const codes = a => a.map(t => `<code>{${esc(t)}}</code>`).join(', ');
  const withCodes = (key, list) => esc(T(key, { t: '\u0001' })).replace('\u0001', codes(list));
  const nParts = s => String(s).split('|').length;
  /** Lines the site only shows when a setting allows it: which setting is off right now (null when the line can show). */
  function whenOff(sp) {
    const D = MA.content.defaults?.studio || {}, st = MA.content.get('studio') || {}, k = sp.type + ':' + sp.key;
    if ('formFields' in D) {
      if (['text:f.phone', 'ui:bodyPhone'].includes(k) && !st.formFields?.phone) return 'phone';
      if (['text:f.budget', 'ui:budgets', 'ui:bodyBudget'].includes(k) && !st.formFields?.budget) return 'budget';
    }
    if ('privacyUrl' in D && k === 'text:f.privacy' && !String(st.privacyUrl || '').trim()) return 'privacy';
    if ('consent' in D && sp.type === 'text' && MA.content.groupOf(sp.key) === 'cons' && !(st.consent && st.analytics?.provider && st.analytics?.id)) return 'consent';
    if ('exceptions' in D && sp.type === 'ui' && ['closedFor', 'hoursFor'].includes(sp.key) && !(st.exceptions || []).length) return 'special';
    return null;
  }
  const hasSettings = () => MA.modules().some(m => m.id === 'settings' && (!m.perm || MA.can(m.perm)));

  /** One bilingual field (MA.form.bi) plus our notes: tokens the site fills in, token mismatches, |-lists, empty or untranslated Arabic. */
  function fieldEl(sp, { also = false } = {}) {
    const langs = S.langs === 'both' ? ['en', 'ar'] : [S.langs];
    const box = MA.form.bi(sp.tpl, { label: sp.label, kind: kindOf(sp, val(sp, 'en'), val(sp, 'ar')), langs, hint: sp.type === 'tagline' ? esc(T('taglineHint')) : undefined });
    box.classList.add('pg-f');
    const ref = S.langs === 'ar' ? MA.h('p.pg-ref', { lang: 'en', dir: 'ltr' }) : null;
    if (ref) box.querySelector('.cf-langs')?.before(ref);
    const note = MA.h('div.pg-note', { hidden: true });
    note.addEventListener('click', e => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      if (b.dataset.act === 'copy') MA.content.set(MA.path.lang(sp.tpl, 'ar'), MA.content.get(MA.path.lang(sp.tpl, 'en')), { coalesce: false, by: 'copy' });
      if (b.dataset.act === 'go') MA.go('#/pages/' + encodeURIComponent(b.dataset.g));
    });
    box.append(note);
    const can = MA.can('content.edit');
    const extra = () => {
      const en = val(sp, 'en'), ar = val(sp, 'ar'), enP = plain(en), arP = plain(ar), bits = [];
      if (ref) ref.innerHTML = `<span class="pg-ref-tag">EN</span><span>${esc(enP) || '—'}</span>`;
      const info = (icon, html, cls = 'pg-toks') => bits.push(`<p class="${cls}">${MA.icon(icon, 'sm')}<span>${html}</span></p>`);
      if (unused(sp)) info('info', esc(T('unused')), 'pg-same');
      else if (sp.type === 'ui' && SR_UI.includes(sp.key)) info('info', esc(T('srOnly')), 'pg-same');
      const off = whenOff(sp);
      if (off) info('eyeOff', esc(T('when.' + off)) + (hasSettings() ? ` <a class="pg-link" href="#/settings">${esc(T('openSettings'))}</a>` : ''), 'pg-when');
      // tokens: what the site fills in here (messages list everything they can use), and warnings for the rest
      const tE = toks(en), tA = toks(ar), used = [...new Set([...tE, ...tA])], fill = fills(sp), avail = useful(sp);
      const help = (sp.type === 'ui' ? avail : avail.filter(t => used.includes(t))).filter(t => tokText(t));
      if (help.length) info('code', `${esc(T('tokLead'))} ${help.map(t => `<code>{${esc(t)}}</code> ${esc(tokText(t))}`).join(' · ')}`);
      const none = used.filter(t => !fill.includes(t)), useless = used.filter(t => fill.includes(t) && !avail.includes(t));
      if (none.length && !unused(sp)) bits.push(warnP(withCodes('tokNone', none)));
      if (useless.length) bits.push(warnP(withCodes('tokUseless', useless)));
      const list = sp.type === 'ui' && LIST_UI.includes(sp.key);
      if (list) info('list', esc(T('parts', { n: MA.num(nParts(en)) })));
      if (sp.type === 'ui' && JOIN_UI.includes(sp.key)) info('info', esc(T('spaces')));
      if (enP && arP && !unused(sp)) {
        const miss = [...tE].filter(t => !tA.has(t)), extraT = [...tA].filter(t => !tE.has(t));
        if (miss.length) bits.push(warnP(withCodes('tokMissing', miss)));
        if (extraT.length) bits.push(warnP(withCodes('tokExtra', extraT)));
        if (list && nParts(en) !== nParts(ar)) bits.push(warnP(esc(T('partsDiff', { a: MA.num(nParts(ar)), b: MA.num(nParts(en)) }))));
      }
      if (unused(sp)) { /* nothing to translate */ }
      else if (enP && !arP) bits.push(warnP(esc(T('arEmpty')) + (can ? ` <button type="button" class="pg-link" data-act="copy">${esc(T('copyEn'))}</button>` : '')));
      else if (enP && arP === enP && hasLetters(enP)) bits.push(`<p class="pg-same">${MA.icon('info', 'sm')}<span>${esc(T('arSame'))}</span></p>`);
      if (also && sp.type === 'ui') { const rel = relatedGroup(sp.key); if (rel) bits.push(`<p class="pg-also">${MA.icon('link', 'sm')}<span>${esc(T('alsoIn'))} <button type="button" class="pg-link" data-act="go" data-g="${esc(rel)}">${esc(groupName(rel))}</button></span></p>`); }
      const html = bits.join('');
      if (note.innerHTML !== html) note.innerHTML = html;
      note.hidden = !bits.length;
    };
    const base = box._refresh;
    box._refresh = () => { base?.(); extra(); };
    extra();
    return box;
  }

  /** Fill empty Arabic fields in a group with the English: one undo step for the whole group. */
  function fillEmpty(g) {
    if (!MA.can('content.edit')) return;
    const list = stats(g).sps.filter(emptyAr);
    if (!list.length) { MA.toast(esc(T('nothingToFill'))); return; }
    const full = MA.clone(MA.content.draft);
    list.forEach(sp => MA.path.set(full, MA.path.lang(sp.tpl, 'ar'), MA.content.get(MA.path.lang(sp.tpl, 'en'))));
    MA.content.load(full, T('fillLabel', { name: groupName(g.id) }));
    MA.toast(esc(list.length === 1 ? T('filledOne') : T('filled', { n: MA.num(list.length) })), { icon: 'language', undo: () => MA.content.undo() });
  }

  /* ================= floating words (group 'make') ================= */
  function makeEditor() {
    const wrap = MA.h('div.pg-make'), can = MA.can('content.edit');
    wrap.append(sectionTitle(T('words')), MA.h('p.pg-hint', T('wordsHint')));
    const rowsBox = MA.h('div.pg-mrows'); wrap.append(rowsBox);
    let lists = [];
    const drop = () => { lists.forEach(l => l.sort?.destroy()); lists = []; };
    const draw = () => {
      const make = MA.content.get('make') || [], swells = MA.content.get('swells') || [];
      if (lists.length !== make.length) {
        drop(); rowsBox.innerHTML = '';
        lists = make.map((_, r) => {
          const list = MA.h('div.pg-words', { dataset: { row: r } }), head = MA.h('div.pg-mrow-head');
          rowsBox.append(MA.h('div.pg-mrow', head, list));
          const sort = can ? MA.ui.sortable(list, { item: '.pg-word', handle: '.pg-handle', onEnd: ids => reorderRow(r, ids.map(Number)) }) : null;
          return { list, head, sort };
        });
      }
      make.forEach((row, r) => {
        const { list, head } = lists[r], words = row || [];
        head.innerHTML = '';
        head.append(MA.h('span.h4', T('row', { n: MA.num(r + 1) })), MA.h('span.pg-c.num', MA.num(words.length)), MA.h('span.grow'),
          can ? MA.ui.btn(T('addWord'), { icon: 'plus', size: 'sm', kind: 'ghost', onclick: () => addWord(r) }) : null);
        list.innerHTML = '';
        words.forEach((w, i) => list.append(wordEl(r, i, w, swells, can, make)));
        if (!words.length) list.append(MA.h('p.pg-hint.pg-emptyrow', T('emptyRow')));
      });
    };
    wrap._draw = draw; wrap._destroy = drop; draw();
    return wrap;
  }
  function wordEl(r, i, w, swells, can, make) {
    const sp = Object.assign(spec('make', `make/${r}/${i}/{lang}`, `make.${r}.${i}`, 'make', T('word', { n: MA.num(i + 1) })), { row: r, i });
    const box = fieldEl(sp);
    const opts = swells.map(s => ({ value: s.id, label: swellName(s) }));
    if (!w?.swell) opts.unshift({ value: '', label: T('noSwell') });
    else if (!swells.some(s => s.id === w.swell)) opts.push({ value: w.swell, label: T('missingSwell', { id: w.swell }) });
    const sel = MA.form.input(`make/${r}/${i}/swell`, { kind: 'select', options: opts });
    sel.classList.add('sm'); sel.setAttribute('aria-label', `${T('linkedSwell')} · ${sp.label}`); sel.lang = MA.siteLang(); sel.dir = 'auto'; // swell names are site copy
    box.querySelector('.pg-note').before(MA.h('label.pg-swell', MA.h('span', T('linkedSwell')), sel));
    const el = MA.h('div.pg-word', { dataset: { id: String(i) } });
    if (can) {
      const n = make[r].length;
      const handle = MA.h('button.drag-handle.pg-handle', { type: 'button', title: T('wordActions'), 'aria-label': `${T('wordActions')} · ${sp.label}`, html: MA.icon('drag', 'sm'),
        onclick: e => MA.ui.menu(e.currentTarget, [
          { label: T('moveUp'), icon: 'chevUp', disabled: i === 0, run: () => moveWord(r, i, r, i - 1) },
          { label: T('moveDown'), icon: 'chevDown', disabled: i === n - 1, run: () => moveWord(r, i, r, i + 1) },
          ...make.map((_, k) => k === r ? null : { label: T('moveRow', { n: MA.num(k + 1) }), icon: 'layers', run: () => moveWord(r, i, k, make[k].length) }),
          '-', { label: T('removeWord'), icon: 'trash', danger: true, run: () => removeWord(r, i) },
        ].filter(Boolean)) });
      handle.addEventListener('keydown', e => {
        if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
        e.preventDefault();
        const j = i + (e.key === 'ArrowUp' ? -1 : 1); if (j < 0 || j >= n) return;
        moveWord(r, i, r, j);
        requestAnimationFrame(() => S?.body.querySelector(`.pg-words[data-row="${r}"] .pg-word[data-id="${j}"] .pg-handle`)?.focus());
      });
      el.append(handle);
    }
    el.append(box);
    return el;
  }
  const makeCopy = () => MA.clone(MA.content.get('make') || []);
  function moveWord(r, i, toR, toI) {
    const make = makeCopy(); if (!make[r]?.[i] || !make[toR]) return;
    const [w] = make[r].splice(i, 1); make[toR].splice(MA.clamp(toI, 0, make[toR].length), 0, w);
    MA.content.replace('make', make, T('reorder'));
  }
  function reorderRow(r, order) {
    const make = makeCopy(), row = make[r] || [];
    if (order.length !== row.length) return S?.makeEl?._draw();
    make[r] = order.map(i => row[i]);
    if (!MA.content.replace('make', make, T('reorder'))) S?.makeEl?._draw();
  }
  function addWord(r) {
    const make = makeCopy(), swells = MA.content.get('swells') || [];
    make[r] = make[r] || [];
    make[r].push({ swell: make[r][0]?.swell || swells[0]?.id || '', en: '', ar: '' });
    if (MA.content.replace('make', make, T('wordAdded'))) setTimeout(() => MA.form.focus(`make/${r}/${make[r].length - 1}/{lang}`, S?.langs === 'ar' ? 'ar' : 'en'), 30);
  }
  function removeWord(r, i) {
    const make = makeCopy(); if (!make[r]?.[i]) return;
    const [w] = make[r].splice(i, 1);
    if (MA.content.replace('make', make, T('wordDel')))
      MA.toast(esc(T('wordRemoved', { w: '\u0001' })).replace('\u0001', `<span${MA.siteText.attrs(MA.siteLang())}>${esc(siteL(w) || '…')}</span>`), { icon: 'trash', undo: () => MA.content.undo() });
  }

  /* ================= commands, palette search ================= */
  function toggleInspect() {
    if (!mounted()) { pendingInspect = true; MA.go('#/pages'); return; }
    showPreview();
    const fr = S.pane.frame; if (!fr) return;
    const on = !fr.state.inspect;
    fr.set({ inspect: on });
    MA.toast(esc(T(on ? 'inspectOn' : 'inspectOff')), { icon: 'cursor' });
  }
  MA.commands.add({ id: 'pages.edit', title: { en: 'Edit site copy', ar: 'تعديل نصوص الموقع', fa: 'ویرایش متن‌های سایت' }, icon: 'pages',
    keywords: 'copy text words content pages headline translate arabic نصوص ترجمة متن ترجمه', run: () => MA.go('#/pages') });
  MA.commands.add({ id: 'pages.inspect', title: { en: 'Toggle click-to-edit', ar: 'تشغيل النقر للتعديل أو إيقافه', fa: 'روشن یا خاموش کردن ویرایش با کلیک' }, icon: 'cursor',
    keywords: 'inspect click edit preview pick select النقر کلیک', run: toggleInspect });
  MA.commands.add({ id: 'pages.fill', title: { en: 'Fill empty Arabic from English', ar: 'ملء العربية الفارغة من الإنجليزية', fa: 'پر کردن عربی‌های خالی از انگلیسی' }, icon: 'language',
    keywords: 'arabic translate fill empty عربي عربی', when: () => mounted() && !S.q && MA.can('content.edit') && stats(cur()).empty > 0, run: () => mounted() && fillEmpty(cur()) });

  const MOD = {
    id: 'pages', group: 'site', order: 40, icon: 'pages', shortcut: 'g c',
    title: { en: 'Pages & copy', ar: 'الصفحات والنصوص', fa: 'صفحه‌ها و متن‌ها' },
    keywords: 'copy text words headline translation arabic نصوص متن',
    render, update,
    crumbs(ctx) {
      if (!MA.content.defaults) return [];
      const g = mounted() ? S.group : groupFromCtx(ctx);
      return g ? [{ label: groupName(g), href: '#/pages/' + encodeURIComponent(g) }] : [];
    },
    /** ⌘K: sections by name, then fields by label, then lines by what they say. */
    search(q) {
      if (!MA.content.draft) return [];
      const ql = fold(String(q || '').trim()); if (!ql) return [];
      const groups = buildModel(), byName = [], byLabel = [], byText = [], seen = new Set();
      const open = (g, sp) => () => { MA.content.focusAfterRoute = { tpl: sp.tpl, lang: 'en' }; MA.go(`#/pages/${encodeURIComponent(g.id)}?field=${encodeURIComponent(sp.tpl)}`); };
      for (const g of groups) {
        const name = groupName(g.id);
        if (fold(name).includes(ql) || g.id.toLowerCase() === ql) byName.push({ title: name, sub: T('siteSection'), icon: 'pages', run: () => MA.go('#/pages/' + encodeURIComponent(g.id)) });
        for (const sp of specsOf(g)) {
          if (seen.has(sp.tpl)) continue;
          if (fold(sp.label).includes(ql)) { seen.add(sp.tpl); byLabel.push({ title: sp.label, sub: groupName(g.id), icon: 'type', run: open(g, sp) }); continue; }
          if (ql.length < 3) continue;
          const en = plain(val(sp, 'en')), ar = plain(val(sp, 'ar')), hit = fold(en).includes(ql) ? en : fold(ar).includes(ql) ? ar : null;
          if (hit) { seen.add(sp.tpl); byText.push({ title: hit.length > 64 ? hit.slice(0, 63) + '…' : hit, sub: `${groupName(g.id)} · ${sp.label}`, icon: 'type', run: open(g, sp) }); }
        }
      }
      return [...byName, ...byLabel, ...byText].slice(0, 10);
    },
    destroy() { S?.makeEl?._destroy?.(); S = null; },
  };
  MA.module(MOD);
})();
