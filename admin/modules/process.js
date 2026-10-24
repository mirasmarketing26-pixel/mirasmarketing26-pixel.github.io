/* =====================================================================
   MIRAS admin — Process (#/process)
   The four stages of a MIRAS project. On the site they are four beats of the opening film (the first beat is #how):
   each stage's title rides the wave, with its description and its services as tags; the "you get" lines are read
   aloud to screen-reader users only. A visitor's picked swells add their personal steps under "For you".
   · Stages tab: a map of the four stages (01–04, the one numbering used on this page), then one card per stage:
     title, what happens, the services shown as tags, and the "you get" lines (both lists: add, remove, reorder;
     EN and AR stay paired). Plus the plan phase names (steps).
   · Personal steps tab: a swells × stages matrix of each swell's step at each stage, editable in EN or AR.
   · The shared live preview (MA.ui.previewPane, key 'process') sits beside the stages, aimed at the stage beats.
   Swell tiles come from MA.swells (services.js). Stage copy and defaults are read from the site, never hard-coded.
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA, h = MA.h, esc = MA.esc;
  const ID = 'process';
  const STAGES = [0, 1, 2, 3];
  const LISTS = ['tags', 'gets'];
  const MAX = { title: 18, desc: 170, tags: 28, gets: 48, step: 20 };
  // placeholders are site copy, so they stay English / Arabic whatever the admin language is
  const PH = {
    desc: { en: 'What we do in this stage, in a sentence or two', ar: 'ما نفعله في هذه المرحلة، في جملة أو جملتين' },
    tags: { en: 'A service in this stage: “Brand audit”', ar: 'خدمة في هذه المرحلة: «تدقيق العلامة»' },
    gets: { en: 'Something the client can hold: “A launch plan for every channel”', ar: 'شيء ملموس يحصل عليه العميل: «خطة إطلاق لكل القنوات»' },
  };

  /* ---------------- strings: key → [English, Arabic, Persian] ---------------- */
  const I = {
    'process.title': ['Process', 'طريقتنا', 'روش کار'],
    'process.sub': ['The four stages of a project, from the first conversation to launch day. On the site they scroll past in the opening film as Mira rides to shore: each stage’s title rides the wave, with what happens and the services involved.',
      'المراحل الأربع للمشروع، من أول حديث حتى يوم الإطلاق. تمرّ في الموقع ضمن الفيلم الافتتاحي بينما تركب ميرا الموج نحو الشاطئ: يركب عنوان كل مرحلة الموجة، ومعه ما يحدث فيها والخدمات المعنية.',
      'چهار مرحلهٔ یک پروژه، از نخستین گفت‌وگو تا روز رونمایی. در سایت، این مرحله‌ها در فیلم آغازین و هم‌زمان با موج‌سواری میرا تا ساحل می‌گذرند: عنوان هر مرحله روی موج می‌آید، همراه با آنچه در آن انجام می‌شود و خدمات مرتبط.'],
    'process.tab.stages': ['Stages', 'المراحل', 'مرحله‌ها'],
    'process.tab.matrix': ['Personal steps', 'الخطوات الخاصة', 'گام‌های شخصی'],
    'process.fixed': ['<b>Four stages, always.</b> The opening film has exactly four stage beats, so you can rename them and change what each one says, but not add or remove one.', '<b>أربع مراحل دائماً.</b> في الفيلم الافتتاحي أربعة مقاطع للمراحل بالضبط، لذا يمكنك تغيير أسمائها وما تقوله كل منها، لكن لا يمكن إضافة مرحلة أو حذفها.', '<b>همیشه چهار مرحله.</b> فیلم آغازین دقیقاً چهار بخش برای مرحله‌ها دارد؛ پس می‌توانید نام و متن هر مرحله را تغییر دهید، اما نمی‌توانید مرحله‌ای بیفزایید یا حذف کنید.'],
    'process.stage': ['Stage {n}', 'المرحلة {n}', 'مرحلهٔ {n}'],
    'process.map': ['The four stages in the film', 'المراحل الأربع في الفيلم', 'چهار مرحله در فیلم'],
    'process.mapHint': ['Click a stage to jump to it here and in the preview.', 'انقر على مرحلة للانتقال إليها هنا وفي المعاينة.', 'روی هر مرحله کلیک کنید تا اینجا و در پیش‌نمایش به آن بروید.'],
    'process.metaTags': [{ one: '{n} tag', other: '{n} tags' }, 'الوسوم: {n}', '{n} برچسب'],
    'process.metaGets': [{ one: '{n} line', other: '{n} lines' }, 'الأسطر: {n}', '{n} سطر'],
    'process.st.live': ['Published', 'منشورة', 'منتشرشده'],
    'process.st.edited': ['Unpublished changes', 'تعديلات غير منشورة', 'تغییرات منتشرنشده'],
    'process.readAloud': ['Read aloud to screen-reader users', 'تُقرأ لمستخدمي قارئات الشاشة', 'برای کاربران صفحه‌خوان خوانده می‌شود'],
    'process.f.title': ['Title', 'العنوان', 'عنوان'],
    'process.f.titleHint': ['The stage’s headline in the film, and its name in the film’s progress bar.', 'عنوان المرحلة في الفيلم، واسمها في شريط تقدّم الفيلم.', 'تیتر مرحله در فیلم و نامش در نوار پیشرفت فیلم.'],
    'process.f.desc': ['What happens', 'ما يحدث', 'چه اتفاقی می‌افتد'],
    'process.f.descHint': ['Shown under the title when the film reaches this stage.', 'يظهر تحت العنوان حين يصل الفيلم إلى هذه المرحلة.', 'وقتی فیلم به این مرحله می‌رسد زیر عنوان نمایش داده می‌شود.'],
    'process.tags': ['Services in this stage', 'الخدمات في هذه المرحلة', 'خدمات این مرحله'],
    'process.tagsHint': ['Short tags under the description, one per service.', 'وسوم قصيرة تحت الوصف، واحد لكل خدمة.', 'برچسب‌های کوتاه زیر توضیح، یکی برای هر خدمت.'],
    'process.gets': ['What the client gets', 'ما يحصل عليه العميل', 'آنچه مشتری می‌گیرد'],
    'process.getsHint': ['Not shown on screen: screen readers read them after the services, under “{get}”. Visitors who picked swells see their personal steps on screen, under “{mine}”.', 'لا تظهر على الشاشة: تقرؤها قارئات الشاشة بعد الخدمات، تحت «{get}». ومن اختار موجات يرى خطواته الخاصة على الشاشة تحت «{mine}».', 'روی صفحه نمایش داده نمی‌شوند: صفحه‌خوان‌ها آن‌ها را پس از خدمات و زیر «{get}» می‌خوانند. بازدیدکننده‌ای که موج‌هایی انتخاب کرده، گام‌های شخصی‌اش را روی صفحه زیر «{mine}» می‌بیند.'],
    'process.tag': ['Tag {n}', 'الوسم {n}', 'برچسب {n}'],
    'process.item': ['Line {n}', 'السطر {n}', 'سطر {n}'],
    'process.add.tags': ['Add a tag', 'إضافة وسم', 'افزودن برچسب'],
    'process.add.gets': ['Add a line', 'إضافة سطر', 'افزودن سطر'],
    'process.remove.tags': ['Remove tag', 'إزالة الوسم', 'برداشتن برچسب'],
    'process.remove.gets': ['Remove line', 'إزالة السطر', 'برداشتن سطر'],
    'process.moveItem': ['Drag, or use ↑ ↓, to move', 'اسحب أو استخدم ↑ ↓ للنقل', 'برای جابه‌جایی بکشید یا ↑ ↓ را بزنید'],
    'process.none.tags': ['No tags yet. The stage shows no services.', 'لا وسوم بعد، فلا تعرض المرحلة أي خدمة.', 'هنوز برچسبی نیست؛ این مرحله هیچ خدمتی نشان نمی‌دهد.'],
    'process.none.gets': ['Nothing listed yet. Add what the client walks away with.', 'لا شيء بعد. أضف ما يخرج به العميل من هذه المرحلة.', 'هنوز چیزی فهرست نشده. آنچه مشتری از این مرحله می‌برد را بیفزایید.'],
    'process.removed.tags': ['Removed a tag from “{stage}”.', 'أُزيل وسم من «{stage}».', 'برچسبی از «{stage}» برداشته شد.'],
    'process.removed.gets': ['Removed a line from “{stage}”.', 'أُزيل سطر من «{stage}».', 'سطری از «{stage}» برداشته شد.'],
    'process.moved': ['Moved an item in “{stage}”.', 'نُقل عنصر في «{stage}».', 'موردی در «{stage}» جابه‌جا شد.'],
    'process.lbl.tags': ['Stage tags', 'وسوم المرحلة', 'برچسب‌های مرحله'],
    'process.lbl.gets': ['“You get” lines', 'أسطر «ما تحصل عليه»', 'سطرهای «آنچه می‌گیرید»'],
    'process.uneven': ['English has {en} and Arabic has {ar}. Fill the empty ones so both languages show the same list.', 'في الإنجليزية {en} وفي العربية {ar}. املأ الفارغ ليعرض الموقع القائمة نفسها باللغتين.', 'انگلیسی {en} و عربی {ar} مورد دارد. موارد خالی را پر کنید تا هر دو زبان یک فهرست نشان دهند.'],
    'process.blankItems': ['{n} empty: the site shows an empty tag or line until it is filled or removed.', 'فارغة: {n}. يعرض الموقع وسماً أو سطراً فارغاً حتى يُملأ أو يُزال.', '{n} مورد خالی: سایت تا پر یا حذف شدنش برچسب یا سطری خالی نشان می‌دهد.'],
    'process.labels': ['Plan phase names', 'أسماء مراحل الخطة', 'نام مرحله‌های برنامه'],
    'process.labelsSub': ['Each swell sits in one of four plan phases, and the plan headline names a visitor’s picks in this order. The site doesn’t show these names right now; the admin uses them to label each swell’s phase.', 'تقع كل موجة في واحدة من أربع مراحل للخطة، ويذكر عنوان الخطة اختيارات الزائر بهذا الترتيب. لا يعرض الموقع هذه الأسماء حالياً، وتستخدمها لوحة الإدارة لتسمية مرحلة كل موجة.', 'هر موج در یکی از چهار مرحلهٔ برنامه قرار دارد و تیتر برنامه انتخاب‌های بازدیدکننده را به همین ترتیب نام می‌برد. سایت فعلاً این نام‌ها را نشان نمی‌دهد؛ پنل از آن‌ها برای نام‌گذاری مرحلهٔ هر موج استفاده می‌کند.'],
    'process.phase': ['Phase {n}', 'المرحلة {n}', 'مرحلهٔ {n}'],
    'process.usedBy': ['Used by {list}', 'تستخدمها: {list}', 'موج‌ها: {list}'],
    'process.usedNone': ['No swell is in this phase yet', 'لا موجة في هذه المرحلة بعد', 'هنوز موجی در این مرحله نیست'],
    'process.matrixSub': ['What each stage means for each swell. When a visitor picks a swell, its step shows at every stage under “{mine}”, next to the stage’s services. With several picks, a stage shows at most two steps, in plan order.', 'ما تعنيه كل مرحلة لكل موجة. عندما يختار الزائر موجة، تظهر خطوتها في كل مرحلة تحت «{mine}» بجانب خدمات المرحلة. وإن اختار أكثر من موجة، تعرض كل مرحلة خطوتين على الأكثر بترتيب الخطة.', 'معنای هر مرحله برای هر موج. وقتی بازدیدکننده موجی را انتخاب کند، گام آن در هر مرحله زیر «{mine}» کنار خدمات آن مرحله نمایش داده می‌شود. اگر چند موج انتخاب شود، هر مرحله حداکثر دو گام را به ترتیب برنامه نشان می‌دهد.'],
    'process.filled': ['{n} of {total} filled', 'المكتمل {n} من {total}', '{n} از {total} پر شده'],
    'process.cellEmpty': ['Empty', 'فارغ', 'خالی'],
    'process.openSwell': ['Open {name}', 'فتح {name}', 'باز کردن {name}'],
    'process.lang': ['Language to edit', 'لغة التعديل', 'زبان ویرایش'],
    'process.lang.en': ['English', 'الإنجليزية', 'انگلیسی'],
    'process.lang.ar': ['Arabic', 'العربية', 'عربی'],
    'process.swell': ['Swell', 'الموجة', 'موج'],
    'process.noSwells': ['No swells to plan for', 'لا موجات لنخطط لها', 'موجی برای برنامه‌ریزی نیست'],
    'process.noSwellsText': ['Personal steps belong to swells. Add a swell first, then come back to write its four steps.', 'الخطوات الخاصة تابعة للموجات. أضف موجة أولاً، ثم عد لتكتب خطواتها الأربع.', 'گام‌های شخصی متعلق به موج‌ها هستند. اول یک موج بیفزایید، بعد برگردید و چهار گامش را بنویسید.'],
    'process.addSwell': ['Go to Swells', 'الذهاب إلى الموجات', 'رفتن به موج‌ها'],
    'process.showStage': ['Show this stage in the preview', 'أظهر هذه المرحلة في المعاينة', 'نمایش این مرحله در پیش‌نمایش'],
    'process.cmd.matrix': ['Edit personal steps', 'تعديل الخطوات الخاصة', 'ویرایش گام‌های شخصی'],
    'process.cmd.labels': ['Edit plan phase names', 'تعديل أسماء مراحل الخطة', 'ویرایش نام مرحله‌های برنامه'],
    'process.cmd.tags': ['Edit stage tags', 'تعديل وسوم المراحل', 'ویرایش برچسب‌های مرحله‌ها'],
    'process.cmd.preview': ['Preview the stages', 'معاينة المراحل', 'پیش‌نمایش مرحله‌ها'],
  };
  const DICT = { en: {}, ar: {}, fa: {} };
  for (const [k, [en, ar, fa]] of Object.entries(I)) { DICT.en[k] = en; DICT.ar[k] = ar; DICT.fa[k] = fa; }
  MA.i18n.add(DICT);
  const LL = k => ({ en: I[k][0], ar: I[k][1], fa: I[k][2] });
  const t = (k, v) => MA.t('process.' + k, v);

  /* ---------------- helpers ---------------- */
  const C = () => MA.content;
  const cl = MA.siteLang; // site copy shown inside the admin (the site has English and Arabic only)
  const can = () => MA.can('content.edit');
  const swells = () => C().get('swells') || [];
  const stageTitle = (k, l = cl()) => MA.strip(C().get(`stages/${k}/${l}/title`) || C().get(`stages/${k}/en/title`) || '');
  const uiMsg = (k, l = cl()) => MA.strip(C().get(`ui/${l}/${k}`) || C().get(`ui/en/${k}`) || '');
  const pad2 = n => MA.num(n, { minimumIntegerDigits: 2, useGrouping: false });
  const sep = () => MA.isRTL() ? '، ' : ', ';
  const pvSection = () => C().sectionOf?.('process') || 'how';
  const uiPrefs = () => Object.assign({ mlang: 'en' }, MA.db.get('process.ui', {}));
  const setUi = patch => MA.db.set('process.ui', { ...uiPrefs(), ...patch });
  /** Swell tiles, tints and theme colours are shared with Swells & services (MA.swells, services.js). */
  const tile = s => MA.swells?.tile(s, '', 'pr-tile') || h('span.pr-tile');
  const nameOf = (s, l = cl()) => MA.strip(s?.[l]?.service || s?.en?.service || s?.id || '');
  const listOf = (i, kind, l) => C().get(`stages/${i}/${l}/${kind}`) || [];
  const listLen = (i, kind) => Math.max(listOf(i, kind, 'en').length, listOf(i, kind, 'ar').length);
  const count = (k, n) => t(k, { count: n, n: MA.num(n) });
  /** Site copy quoted inside an admin sentence: escaped and isolated with its language, so «For you» reads right in RTL. */
  const quoteSite = v => `<span${MA.siteText.attrs(cl())}>${esc(v)}</span>`;
  const stageMeta = i => `${count('metaTags', listLen(i, 'tags'))} · ${count('metaGets', listLen(i, 'gets'))}`;
  /** Edited since the last publish? One tide mark per stage, in the map and on its card. */
  const stageState = i => C().isChanged(`stages/${i}`) ? 'edited' : 'live';
  // in the map the mark is drawn for the eye and its state is read after the stage name (see .pr-stop-state)
  const stageMark = (i, deco = false) => { const st = stageState(i), lbl = t('st.' + st); return h('span.pr-mark', { ...(deco ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': lbl }), dataset: { state: st } }, MA.ui.tideMark(st, lbl)); };
  /** Placeholders are site copy (English / Arabic whatever the admin language); the example is the site's own default title. */
  const titlePh = i => { const d = l => MA.strip(C().def(`stages/${i}/${l}/title`) || ''); return { en: `One or two words, like “${d('en')}”`, ar: `كلمة أو كلمتان، مثل «${d('ar')}»` }; };
  const cellsFilled = l => swells().reduce((n, s) => n + STAGES.filter(k => MA.strip(s?.[l]?.steps?.[k] || '').trim()).length, 0);

  /** Edit both languages' list (tags or gets) of a stage as one undo step. fn(en[], ar[]) mutates; the two stay paired. */
  function editList(i, kind, fn) {
    const st = MA.clone(C().get(`stages/${i}`) || {}), before = MA.clone(st);
    for (const l of ['en', 'ar']) { st[l] = st[l] || {}; st[l][kind] = [...(st[l][kind] || [])]; }
    const n = Math.max(st.en[kind].length, st.ar[kind].length);
    for (const l of ['en', 'ar']) while (st[l][kind].length < n) st[l][kind].push('');
    fn(st.en[kind], st.ar[kind]);
    C().replace(`stages/${i}`, st, t('lbl.' + kind));
    return before;
  }
  const restoreStage = (i, kind, before) => C().replace(`stages/${i}`, before, t('lbl.' + kind));
  function addItem(i, kind) {
    if (!can()) return;
    S.focusTpl = `stages/${i}/{lang}/${kind}/${listLen(i, kind)}`; // set first: the replace below re-renders the list synchronously
    editList(i, kind, (en, ar) => { en.push(''); ar.push(''); });
  }
  function removeItem(i, kind, k) {
    if (!can()) return;
    const n = listLen(i, kind);
    S.focusAfter = { i, kind, k: Math.min(k, n - 2) };
    const before = editList(i, kind, (en, ar) => { en.splice(k, 1); ar.splice(k, 1); });
    MA.toast(t('removed.' + kind, { stage: esc(stageTitle(i)) }), { undo: () => restoreStage(i, kind, before) });
  }
  function moveItem(i, kind, k, d) {
    if (!can()) return;
    const n = listLen(i, kind), j = k + d; if (j < 0 || j >= n) return;
    S.focusHandle = { i, kind, k: j };
    const before = editList(i, kind, (en, ar) => { [en[k], en[j]] = [en[j], en[k]]; [ar[k], ar[j]] = [ar[j], ar[k]]; });
    MA.toast(t('moved', { stage: esc(stageTitle(i)) }), { undo: () => restoreStage(i, kind, before) });
  }
  function reorderItems(i, kind, order) {
    if (!can() || MA.eq(order, order.slice().sort((a, b) => a - b))) return;
    const before = editList(i, kind, (en, ar) => { const e = order.map(k => en[k]), a = order.map(k => ar[k]); en.splice(0, en.length, ...e); ar.splice(0, ar.length, ...a); });
    MA.toast(t('moved', { stage: esc(stageTitle(i)) }), { undo: () => restoreStage(i, kind, before) });
  }

  /* ---------------- page ---------------- */
  const S = { root: null, main: null, pane: null, parked: null, tab: 'stages', cards: [], strip: null, focusTpl: null, focusHandle: null, focusAfter: null, refs: {}, sorts: [] };
  const applyTheme = () => MA.swells?.applyTheme(S.root);
  let pending = 0;
  const schedule = () => { if (pending) return; pending = setTimeout(() => { pending = 0; if (S.root?.isConnected) draw(MA.ctx(), true); }, 0); };
  const destroySorts = () => { S.sorts.splice(0).forEach(x => x.destroy()); };

  function mount(view) {
    S.root = h('div.m-process');
    S.main = h('div.pr-main');
    // the shared preview pane (one toggle, hideable, resizable, phone layout when narrow). It sits out the matrix tab
    // (parked: hidden, its iframe dropped, your open/closed choice kept), so `p` is bound here and only acts on the stages tab.
    adoptOldPrefs();
    S.pane = MA.ui.previewPane({ key: ID, section: pvSection(), device: 'auto', bindKey: false });
    S.root.append(MA.ui.previewPane.split(S.main, S.pane));
    view.append(S.root);
    applyTheme();
    MA.keys.bindView('p', () => { if (S.tab === 'stages') S.pane?.toggleOpen(); }, () => MA.t('k.preview'));
    MA.cleanup(() => { destroySorts(); clearTimeout(pending); pending = 0; S.root = S.pane = null; S.cards = []; });
    MA.onView('content:change', onContent);
    MA.onView('content:published', () => schedule());
    MA.onView('prefs', () => MA.swells?.refreshNear(S.root));
  }
  function onContent({ path = '' } = {}) {
    if (!S.root?.isConnected) return;
    const p = String(path).split('/'), top = p[0];
    if (top === 'theme' || path === '') applyTheme();
    if (path === '' || path === 'stages') return schedule();
    if (S.tab === 'matrix') {
      if (path === 'swells' || (top === 'swells' && p.length <= 2) || top === 'theme') return schedule();
      if (top === 'swells' || top === 'stages' || top === 'ui') refreshMatrix();
      return;
    }
    if (top === 'stages' && p.length === 2) { LISTS.forEach(kind => renderItems(+p[1], kind)); refreshStages(); return; }
    if (top === 'stages' && LISTS.includes(p[3]) && p.length === 4) { renderItems(+p[1], p[3]); refreshMarks(); return; }
    if (top === 'stages') { refreshStages(); if (LISTS.includes(p[3])) S.cards[+p[1]]?.refreshWarn(p[3]); return; }
    if (top === 'swells' || top === 'steps') refreshLabels();
    if (top === 'ui') S.cards.forEach(c => c?.refreshHints());
  }

  /* ---------------- preview (MA.ui.previewPane) ---------------- */
  /** This page kept its own preview settings before the shared pane: carry "hidden" and the width over once. */
  function adoptOldPrefs() {
    const old = MA.db.get('process.ui', {}), all = MA.db.get('pvPanes', {});
    if (all[ID] || !('preview' in old || 'width' in old)) return;
    all[ID] = { open: old.preview !== false, ...(+old.width ? { width: +old.width } : {}) };
    MA.db.set('pvPanes', all);
    const { preview, width, device, ...rest } = old; MA.db.set('process.ui', rest);
  }
  /** The matrix needs the full width: park the pane there without changing the open/closed choice remembered for this page. */
  function park(on) {
    if (!S.pane) return;
    if (on && !S.parked) {
      S.parked = { open: S.pane.visible };
      if (S.parked.open) { S.pane.hide(); const all = MA.db.get('pvPanes', {}); all[ID] = { ...all[ID], open: true }; MA.db.set('pvPanes', all); }
    } else if (!on && S.parked) { const was = S.parked.open; S.parked = null; if (was) S.pane.show(); }
  }
  /** Show stage i in the preview (opening it if hidden): the site scrolls the film to the beat that holds the key. */
  const flashStage = (i, key) => S.pane?.flash(key || `stages.${i}.title`);

  /* ---------------- drawing ---------------- */
  function draw(ctx, soft) {
    const field = ctx.query.get('field') || '';
    S.tab = field ? 'stages' : ctx.query.get('tab') === 'matrix' ? 'matrix' : 'stages';
    const y = scrollY;
    destroySorts();
    S.root.classList.toggle('pr-wide', S.tab === 'matrix');
    park(S.tab === 'matrix');
    S.main.innerHTML = ''; S.cards = []; S.refs = {};
    S.main.append(MA.ui.pageHead({ title: esc(MA.L(def.title)), sub: esc(t('sub')), actions: [S.tab === 'stages' ? S.pane.toggle : null, can() ? null : MA.ui.badge(MA.t('readOnly'), 'outline')].filter(Boolean) }));
    const empty = swells().length * 4 * 2 - cellsFilled('en') - cellsFilled('ar');
    S.main.append(MA.ui.tabs([{ value: 'stages', label: t('tab.stages'), icon: 'process' }, { value: 'matrix', label: t('tab.matrix'), icon: 'grid', count: empty ? MA.num(empty) : null }], S.tab,
      v => { MA.setQuery({ tab: v === 'matrix' ? 'matrix' : null, field: null }); draw(MA.ctx()); }));
    if (S.tab === 'matrix') drawMatrix(); else drawStages();
    if (soft) scrollTo(0, y); else if (!field) scrollTo(0, 0);
  }

  /* ---- stages ---- */
  function drawStages() {
    S.main.append(h('div.callout.pr-callout', MA.frag(MA.icon('info')), h('span', { html: t('fixed') })));
    // the four stages on one tide line, in film order
    S.strip = h('nav.pr-voyage', { 'aria-label': t('map') });
    S.strip.innerHTML = `<svg class="pr-water" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true"><path d="M0 14 C 25 6, 50 22, 75 14 S 125 6, 150 14 S 200 22, 225 14 S 275 6, 300 14 S 350 22, 400 14"/><path d="M0 20 C 25 13, 50 27, 75 20 S 125 13, 150 20 S 200 27, 225 20 S 275 13, 300 20 S 350 27, 400 20"/></svg>`;
    const stops = h('ol.pr-stops');
    STAGES.forEach(i => stops.append(h('li', h('button.pr-stop', { type: 'button', dataset: { i }, onclick: () => { S.cards[i]?.el.scrollIntoView({ behavior: MA.reducedMotion() ? 'auto' : 'smooth', block: 'start' }); flashStage(i); } },
      h('span.pr-dot'), h('span.pr-stop-top', h('span.pr-idx', { 'aria-hidden': 'true' }, pad2(i + 1)), h('span.sr-only', t('stage', { n: MA.num(i + 1) }) + ': '), stageMark(i, true)),
      h('b.pr-stop-name', { dir: 'auto', lang: cl() }, stageTitle(i)),
      h('span.tiny.faint.num.pr-stop-meta', stageMeta(i)), h('span.sr-only.pr-stop-state', ' · ' + t('st.' + stageState(i)))))));
    S.strip.append(stops);
    S.main.append(h('div.card.pr-voyage-card', h('div.pr-voyage-head', h('span.label', t('map')), h('span.tiny.faint', t('mapHint'))), S.strip));
    const wrap = h('div.pr-cards');
    STAGES.forEach(i => { const c = stageCard(i); S.cards[i] = c; wrap.append(c.el); });
    S.main.append(wrap, labelsCard());
    STAGES.forEach(i => LISTS.forEach(kind => renderItems(i, kind)));
  }
  function stageCard(i) {
    // one numbering for a stage: the mono 01–04 index, as in the map (and the site's own "01 / 04" label)
    const name = h('span.pr-ttl', { dir: 'auto', lang: cl() }, stageTitle(i));
    const title = h('h2.h3.pr-card-title', h('span.sr-only', t('stage', { n: MA.num(i + 1) }) + ': '), name);
    const mark = h('span.pr-cardmark', stageMark(i));
    const lists = {}, warns = {}, hints = {};
    const block = kind => {
      lists[kind] = h('div.pr-items', { role: 'list', dataset: { kind }, class: 'pr-items is-' + kind });
      warns[kind] = h('div.pr-warn');
      hints[kind] = h('p.hint.small.faint');
      const add = can() ? MA.ui.btn(t('add.' + kind), { size: 'sm', kind: 'ghost', icon: 'plus', onclick: () => addItem(i, kind) }) : null;
      // "you get" lines are only read aloud on the site (screen-reader text), so say so where they are edited
      const head = h('p.h4', t(kind), kind === 'gets' ? MA.ui.badge(t('readAloud'), 'outline') : null);
      return h('div.pr-list-wrap', { dataset: { kind } }, h('div.pr-list-head', h('div.grow', head, hints[kind]), add), warns[kind], lists[kind]);
    };
    const el = h('section.card.pr-card', { id: 'pr-stage-' + i, dataset: { i } },
      h('div.card-head',
        h('span.pr-idx.pr-card-idx', { 'aria-hidden': 'true' }, pad2(i + 1)),
        h('div.grow', title), mark,
        MA.ui.iconBtn('eye', { tip: t('showStage'), size: 'sm', onclick: () => flashStage(i) })),
      h('div.card-body',
        MA.form.bi(`stages/${i}/{lang}/title`, { label: t('f.title'), hint: esc(t('f.titleHint')), kind: 'text', max: MAX.title, placeholder: titlePh(i) }),
        MA.form.bi(`stages/${i}/{lang}/desc`, { label: t('f.desc'), hint: esc(t('f.descHint')), kind: 'textarea', max: MAX.desc, placeholder: PH.desc }),
        block('tags'), block('gets')));
    const refreshHints = () => {
      hints.tags.textContent = t('tagsHint');
      hints.gets.innerHTML = t('getsHint', { get: quoteSite(uiMsg('get')), mine: quoteSite(uiMsg('getMine')) });
    };
    /** Paired lists can still drift (an import, an older draft): say so, and flag empty items the site would show. */
    const refreshWarn = kind => {
      const w = warns[kind]; w.innerHTML = '';
      const en = listOf(i, kind, 'en'), ar = listOf(i, kind, 'ar');
      const blanks = [...en, ...ar].filter(x => !MA.strip(x || '').trim()).length;
      if (en.length !== ar.length) w.append(h('div.callout.warn', MA.frag(MA.icon('warn')), h('span', t('uneven', { en: MA.num(en.length), ar: MA.num(ar.length) }))));
      else if (blanks) w.append(h('div.callout.warn', MA.frag(MA.icon('warn')), h('span', t('blankItems', { n: MA.num(blanks) }))));
    };
    refreshHints();
    return { el, lists, name, mark, refreshWarn, refreshHints };
  }
  function renderItems(i, kind) {
    const c = S.cards[i], box = c?.lists[kind]; if (!box?.isConnected) return;
    const n = listLen(i, kind), editable = can();
    box.innerHTML = '';
    if (!n) box.append(h('p.small.faint.pr-noitems', t('none.' + kind)));
    for (let k = 0; k < n; k++) {
      const handle = editable ? h('button.drag-handle.pr-handle', { type: 'button', 'aria-label': t('moveItem'), title: t('moveItem'), html: MA.icon('drag', 'sm'),
        onkeydown: e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); moveItem(i, kind, k, e.key === 'ArrowUp' ? -1 : 1); } } }) : null;
      const field = MA.form.bi(`stages/${i}/{lang}/${kind}/${k}`, { label: t(kind === 'tags' ? 'tag' : 'item', { n: MA.num(k + 1) }), kind: 'text', max: MAX[kind], showKey: false, placeholder: PH[kind] });
      box.append(h('div.pr-item', { role: 'listitem', dataset: { id: String(k) } }, handle, field,
        editable ? MA.ui.iconBtn('trash', { tip: t('remove.' + kind), size: 'sm', onclick: () => removeItem(i, kind, k) }) : null));
    }
    // one sortable per list element; the list element lives as long as the card
    if (editable && !box._sortable) { box._sortable = MA.ui.sortable(box, { item: '.pr-item', handle: '.pr-handle', onEnd: ids => reorderItems(i, kind, ids.map(Number)) }); S.sorts.push(box._sortable); }
    c.refreshWarn(kind);
    const meta = S.strip?.querySelector(`.pr-stop[data-i="${i}"] .pr-stop-meta`); if (meta) meta.textContent = stageMeta(i);
    if (S.focusTpl?.startsWith(`stages/${i}/{lang}/${kind}/`)) { const tp = S.focusTpl; S.focusTpl = null; setTimeout(() => MA.form.focus(tp, 'en'), 0); }
    if (S.focusHandle?.i === i && S.focusHandle.kind === kind) { const k = S.focusHandle.k; S.focusHandle = null; box.querySelector(`.pr-item[data-id="${k}"] .pr-handle`)?.focus(); }
    if (S.focusAfter?.i === i && S.focusAfter.kind === kind) { const k = S.focusAfter.k; S.focusAfter = null; (box.querySelector(`.pr-item[data-id="${k}"] .pr-handle`) || c.el.querySelector(`.pr-list-wrap[data-kind="${kind}"] .btn`))?.focus(); }
  }
  function refreshStages() {
    STAGES.forEach(i => {
      const b = S.strip?.querySelector(`.pr-stop[data-i="${i}"] .pr-stop-name`); if (b) b.textContent = stageTitle(i);
      if (S.cards[i]) S.cards[i].name.textContent = stageTitle(i);
    });
    refreshMarks();
  }
  /** Tide marks follow the draft: edited since the last publish, or live. */
  function refreshMarks() {
    STAGES.forEach(i => {
      const st = stageState(i);
      const inMap = S.strip?.querySelector(`.pr-stop[data-i="${i}"] .pr-mark`), onCard = S.cards[i]?.mark.querySelector('.pr-mark');
      if (inMap && inMap.dataset.state !== st) { inMap.replaceWith(stageMark(i, true)); S.strip.querySelector(`.pr-stop[data-i="${i}"] .pr-stop-state`).textContent = ' · ' + t('st.' + st); }
      if (onCard && onCard.dataset.state !== st) onCard.replaceWith(stageMark(i));
    });
  }
  function labelsCard() {
    S.refs.labelFields = STAGES.map(k => MA.form.bi(`steps/{lang}/${k}`, { label: t('phase', { n: MA.num(k + 1) }), kind: 'text', max: MAX.step, pick: '' }));
    const el = h('section.card.pr-labels', { id: 'pr-labels' },
      h('div.card-head', h('div.grow', h('h2.h3', t('labels')), h('p.sub', t('labelsSub')))),
      h('div.card-body', h('div.pr-labels-grid', S.refs.labelFields)));
    refreshLabels();
    return el;
  }
  function refreshLabels() {
    S.refs.labelFields?.forEach((f, k) => {
      const users = swells().filter(s => MA.clamp(+s.phase || 0, 0, 3) === k).map(s => nameOf(s));
      let hint = f.querySelector('.pr-usedby'); if (!hint) { hint = h('p.hint.pr-usedby'); f.append(hint); }
      // swell names are site copy inside an admin sentence: tag their language
      hint.innerHTML = users.length ? t('usedBy', { list: users.map(n => `<span${MA.siteText.attrs(cl())}>${esc(n)}</span>`).join(sep()) }) : esc(t('usedNone'));
    });
  }

  /* ---- matrix: swells × stages ---- */
  const langSegLabel = (x, total) => `${t('lang.' + x)} · ${MA.num(cellsFilled(x))}/${MA.num(total)}`;
  function drawMatrix() {
    const arr = swells(), l = uiPrefs().mlang === 'ar' ? 'ar' : 'en';
    if (!arr.length) {
      S.main.append(h('div.card', MA.ui.empty({ title: esc(t('noSwells')), text: esc(t('noSwellsText')), pose: 'present',
        actions: [MA.ui.btn(t('addSwell'), { kind: 'primary', icon: 'swell', href: '#/services' })] })));
      return;
    }
    const total = arr.length * 4;
    S.refs.langSeg = MA.ui.seg(['en', 'ar'].map(x => ({ value: x, label: langSegLabel(x, total) })), l,
      v => { setUi({ mlang: v }); draw(MA.ctx(), true); }, { size: 'sm', label: t('lang') });
    S.refs.filled = h('span.small.faint.num', t('filled', { n: MA.num(cellsFilled(l)), total: MA.num(total) }));
    S.refs.mtext = h('p.small.muted.grow', { html: t('matrixSub', { mine: quoteSite(uiMsg('getMine')), get: quoteSite(uiMsg('get')) }) });
    S.main.append(h('div.pr-mtools', S.refs.mtext, S.refs.filled, S.refs.langSeg));
    const table = h('table.table.pr-matrix', { lang: l });
    const head = h('tr', h('th.pr-corner', t('swell')), STAGES.map(k => h('th', h('span.pr-th-n', h('span.pr-idx', { 'aria-hidden': 'true' }, pad2(k + 1)), h('span.sr-only', t('stage', { n: MA.num(k + 1) }) + ': ')), h('span.pr-th-t', { dir: l === 'ar' ? 'rtl' : 'ltr', lang: l }, stageTitle(k, l)))));
    const body = h('tbody');
    arr.forEach((s, i) => {
      const cells = STAGES.map(k => {
        const path = `swells/${i}/${l}/steps/${k}`;
        const inp = MA.form.input(path, { kind: 'textarea', rows: 2, dir: l === 'ar' ? 'rtl' : 'ltr', placeholder: t('cellEmpty') });
        inp.setAttribute('lang', l); inp.setAttribute('aria-label', `${nameOf(s, l)} · ${stageTitle(k, l)}`);
        return h('td', { class: 'pr-cell' + (MA.strip(C().get(path) || '').trim() ? '' : ' is-empty'), dataset: { path } }, inp);
      });
      body.append(h('tr', h('th.pr-rowh', { scope: 'row' }, h('a.pr-swell', { href: '#/services/' + encodeURIComponent(s.id), title: t('openSwell', { name: nameOf(s) }) }, tile(s),
        h('span.pr-swell-t', h('b', { dir: l === 'ar' ? 'rtl' : 'ltr', lang: l }, nameOf(s, l)), h('span.mono.tiny.faint', s.id)))), cells));
    });
    table.append(h('thead', head), body);
    S.main.append(h('div.table-wrap.pr-matrix-wrap', table));
  }
  function refreshMatrix() {
    if (S.tab !== 'matrix' || !S.refs.filled) return;
    const l = uiPrefs().mlang === 'ar' ? 'ar' : 'en', total = swells().length * 4;
    S.refs.filled.textContent = t('filled', { n: MA.num(cellsFilled(l)), total: MA.num(total) });
    S.refs.mtext.innerHTML = t('matrixSub', { mine: quoteSite(uiMsg('getMine')), get: quoteSite(uiMsg('get')) });
    MA.$$('.pr-cell', S.main).forEach(td => td.classList.toggle('is-empty', !MA.strip(C().get(td.dataset.path) || '').trim()));
    MA.$$('button', S.refs.langSeg).forEach((b, k) => { b.querySelector('span').textContent = langSegLabel(k ? 'ar' : 'en', total); });
    const thT = MA.$$('.pr-th-t', S.main); STAGES.forEach(k => { if (thT[k]) thT[k].textContent = stageTitle(k, l); });
  }

  /* ---------------- module ---------------- */
  const def = {
    id: ID, group: 'site', order: 55, icon: 'process', shortcut: 'g r',
    title: LL('process.title'), keywords: 'process stages how we work tags gets steps phases مراحل طريقتنا مرحله روش کار',
    badge() {
      try { const n = STAGES.reduce((a, i) => a + LISTS.reduce((b, kind) => b + [...listOf(i, kind, 'en'), ...listOf(i, kind, 'ar')].filter(x => !MA.strip(x || '').trim()).length, 0), 0); return n ? { n, quiet: true } : null; } catch (e) { return null; }
    },
    render(view, ctx) { S.pane = S.parked = null; S.sorts = []; mount(view); draw(ctx); },
    update(ctx) { if (!S.root?.isConnected) return false; draw(ctx); return true; },
    crumbs: ctx => ctx.query.get('tab') === 'matrix' ? [{ label: t('tab.matrix'), href: '#/process?tab=matrix' }] : [],
    search(q) {
      const ql = q.toLowerCase().trim(); if (!ql) return [];
      const out = [], open = (tpl, l) => () => { C().focusAfterRoute = { tpl, lang: l }; MA.go(`#/process?field=${encodeURIComponent(tpl)}`); };
      STAGES.forEach(i => {
        for (const l of ['en', 'ar']) {
          const st = C().get(`stages/${i}/${l}`) || {};
          const tagHit = (st.tags || []).findIndex(x => MA.strip(x || '').toLowerCase().includes(ql));
          const hay = [st.title, st.desc, ...(st.gets || [])].map(x => MA.strip(x || '')).join(' ').toLowerCase();
          if (tagHit >= 0) { out.push({ title: MA.strip(st.tags[tagHit]), sub: `${t('stage', { n: MA.num(i + 1) })} · ${t('tags')}`, icon: 'tag', score: 72, run: open(`stages/${i}/{lang}/tags/${tagHit}`, l) }); break; }
          if (hay.includes(ql)) { out.push({ title: `${t('stage', { n: MA.num(i + 1) })} · ${stageTitle(i)}`, sub: MA.strip(st.desc || ''), icon: 'process', score: MA.strip(st.title || '').toLowerCase().includes(ql) ? 92 : 60, run: open(`stages/${i}/{lang}/title`, l) }); break; }
        }
      });
      STAGES.forEach(k => {
        for (const l of ['en', 'ar']) {
          const v = MA.strip(C().get(`steps/${l}/${k}`) || '');
          if (v.toLowerCase().includes(ql)) { out.push({ title: v, sub: `${t('labels')} · ${t('phase', { n: MA.num(k + 1) })}`, icon: 'tag', score: 50, run: open(`steps/{lang}/${k}`, l) }); break; }
        }
      });
      return out.sort((a, b) => b.score - a.score).slice(0, 8);
    },
  };
  MA.module(def);
  const sub = LL('process.title');
  MA.commands.add({ id: 'process.matrix', title: LL('process.cmd.matrix'), sub, icon: 'grid', keywords: 'matrix swells stages steps for you', run: () => MA.go('#/process?tab=matrix') });
  MA.commands.add({ id: 'process.tags', title: LL('process.cmd.tags'), sub, icon: 'tag', keywords: 'stage tags services in this stage',
    run: () => { C().focusAfterRoute = { tpl: 'stages/0/{lang}/tags/0', lang: 'en' }; MA.go('#/process?field=' + encodeURIComponent('stages/0/{lang}/tags/0')); } });
  MA.commands.add({ id: 'process.labels', title: LL('process.cmd.labels'), sub, icon: 'tag', keywords: 'first then alongside launch day steps labels phase',
    run: () => { C().focusAfterRoute = { tpl: 'steps/{lang}/0', lang: 'en' }; MA.go('#/process?field=' + encodeURIComponent('steps/{lang}/0')); } });
  MA.commands.add({ id: 'process.preview', title: LL('process.cmd.preview'), sub, icon: 'eye', keywords: 'stages film how we work', run: () => MA.preview.open({ section: pvSection() }) });
})();
