/* =====================================================================
   MIRAS admin — Questions (the site's FAQ)
   Edits text/{lang}/q.title and the faq list [{en:{q,a}, ar:{q,a}}].
   Every list change goes through MA.content.replace('faq', arr), so it is one undo step.
   Opens per question come from MA.metrics (sum of faq[i] over the last 30 days).
   The live preview is the shared MA.ui.previewPane (key 'faq'): one toggle, hideable, phone layout in a narrow pane.
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA;

  // placeholders are site copy, so they stay English / Arabic whatever the admin language is
  const PH = {
    q: { en: 'Write the question a client actually asks', ar: 'اكتب السؤال كما يطرحه العميل فعلاً' },
    a: { en: 'Answer the way you would on a call: short, plain and specific', ar: 'أجب كما تجيب في مكالمة: باختصار ووضوح ودقة' },
  };
  /* strings: key → [English, Arabic, Persian] */
  const I = {
    'faq.title': ['Questions', 'الأسئلة', 'پرسش‌ها'],
    'faq.sub': ['The questions clients ask before they write to you. The order here is the order on the site.', 'الأسئلة التي يطرحها العملاء قبل أن يراسلوك. ترتيبها هنا هو ترتيبها في الموقع.', 'پرسش‌هایی که مشتری‌ها پیش از نوشتن به شما می‌پرسند. ترتیب اینجا همان ترتیب سایت است.'],
    'faq.show': ['Show on the site', 'إظهار في الموقع', 'نمایش در سایت'],
    'faq.hiddenNote': ['This section is hidden on the site, so visitors don’t see these questions and the menu skips them.', 'هذا القسم مخفي في الموقع، فلا يرى الزوّار هذه الأسئلة ولا تظهر في القائمة.', 'این بخش در سایت پنهان است؛ بازدیدکنندگان این پرسش‌ها را نمی‌بینند و منو هم از آن می‌گذرد.'],
    'faq.showNow': ['Show the section', 'أظهِر القسم', 'نمایش بخش'],
    'faq.headline': ['Section headline', 'عنوان القسم', 'تیتر بخش'],
    'faq.headlineHint': ['Select a word and press ⌘I to set it in the accent colour.', 'حدّد كلمة واضغط ⌘I لتظهر باللون المميّز.', 'واژه‌ای را انتخاب کنید و ⌘I را بزنید تا با رنگ تأکید نمایش داده شود.'],
    'faq.question': ['Question', 'السؤال', 'پرسش'], 'faq.answer': ['Answer', 'الجواب', 'پاسخ'],
    'faq.add': ['Add question', 'أضف سؤالاً', 'افزودن پرسش'], 'faq.addFirst': ['Add the first question', 'أضف السؤال الأول', 'افزودن نخستین پرسش'],
    'faq.empty': ['No questions yet', 'لا أسئلة بعد', 'هنوز پرسشی نیست'], 'faq.emptyText': ['Start with the one clients ask on every first call.', 'ابدأ بالسؤال الذي يتكرّر في كل مكالمة أولى.', 'با همان پرسشی شروع کنید که مشتری‌ها در هر تماس اول می‌پرسند.'],
    'faq.search': ['Search questions', 'ابحث في الأسئلة', 'جست‌وجو در پرسش‌ها'], 'faq.noMatch': ['No question mentions “{q}”.', 'لا يوجد سؤال يذكر «{q}».', 'هیچ پرسشی به «{q}» اشاره نمی‌کند.'], 'faq.clear': ['Clear search', 'امسح البحث', 'پاک کردن جست‌وجو'],
    'faq.count': ['{n} questions', 'عدد الأسئلة: {n}', '{n} پرسش'], 'faq.countOne': ['1 question', 'سؤال واحد', '{n} پرسش'], 'faq.countOf': ['{n} of {t}', '{n} من {t}', '{n} از {t}'],
    'faq.order': ['Page order', 'ترتيب الصفحة', 'ترتیب صفحه'], 'faq.byOpens': ['Most opened', 'الأكثر فتحاً', 'پربازدیدترین'], 'faq.sortedNote': ['Sorted by opens. Switch back to page order to drag.', 'مرتّبة حسب مرات الفتح. عُد إلى ترتيب الصفحة لتتمكّن من السحب.', 'بر اساس دفعات باز شدن مرتب شده. برای کشیدن به ترتیب صفحه برگردید.'],
    'faq.opens': ['Opens · last {n} days', 'مرات الفتح · آخر {n} يوماً', 'دفعات باز شدن · {n} روز گذشته'], 'faq.opensWord': ['opens', 'مرة فتح', 'بار باز شدن'], 'faq.perVisitors': ['{n} per {h} visitors', '{n} لكل {h} زائر', '{n} در هر {h} بازدیدکننده'], 'faq.topLabel': ['Most opened', 'الأكثر فتحاً', 'پربازدیدترین'],
    'faq.noOpens': ['No opens recorded yet. They show here once analytics is connected in Settings, or when you click through the site in this browser.', 'لم تُسجَّل أي مرة فتح بعد. ستظهر هنا بعد ربط التحليلات من الإعدادات، أو عند تصفّح الموقع من هذا المتصفح.', 'هنوز باز شدنی ثبت نشده. پس از اتصال آمار در «تنظیمات»، یا وقتی سایت را در همین مرورگر مرور کنید، اینجا نمایش داده می‌شود.'],
    'faq.slotNote': ['The site counts opens by position, so after a reorder the history stays with the slot, not the question.', 'يحسب الموقع مرات الفتح حسب الموضع، فإذا أعدت الترتيب بقي السجل مع الموضع لا مع السؤال.', 'سایت دفعات باز شدن را بر اساس جایگاه می‌شمارد؛ پس از تغییر ترتیب، سابقه با جایگاه می‌ماند نه با پرسش.'],
    'faq.opensTip': [{ one: 'Opened once in the last {d} days', other: '{n} opens in the last {d} days' },
      { zero: 'لم يُفتح في آخر {d} يوماً', one: 'فُتح مرة واحدة في آخر {d} يوماً', two: 'فُتح مرتين في آخر {d} يوماً', few: 'فُتح {n} مرات في آخر {d} يوماً', many: 'فُتح {n} مرة في آخر {d} يوماً', other: 'فُتح {n} مرة في آخر {d} يوماً' },
      '{n} بار در {d} روز گذشته باز شده'],
    'faq.untitled': ['Untitled question', 'سؤال بلا عنوان', 'پرسش بی‌عنوان'], 'faq.missAr': ['Arabic missing', 'العربية ناقصة', 'عربی ناقص است'], 'faq.missEn': ['English missing', 'الإنجليزية ناقصة', 'انگلیسی ناقص است'], 'faq.blank': ['Blank on the site', 'فارغ في الموقع', 'در سایت خالی است'],
    'faq.dup': ['Duplicate', 'تكرار', 'تکثیر'], 'faq.del': ['Delete', 'حذف', 'حذف'], 'faq.up': ['Move up', 'انقل للأعلى', 'انتقال به بالا'], 'faq.down': ['Move down', 'انقل للأسفل', 'انتقال به پایین'], 'faq.showPrev': ['Show in preview', 'أظهِره في المعاينة', 'نمایش در پیش‌نمایش'], 'faq.actions': ['Question actions', 'إجراءات السؤال', 'کارهای پرسش'],
    'faq.duped': ['Question duplicated.', 'كُرّر السؤال.', 'پرسش تکثیر شد.'], 'faq.deleted': ['Question deleted.', 'حُذف السؤال.', 'پرسش حذف شد.'], 'faq.moved': ['Question moved to position {n}.', 'نُقل السؤال إلى الموضع {n}.', 'پرسش به جایگاه {n} رفت.'],
    'faq.drag': ['Drag to reorder, or Alt + ↑ / ↓', 'اسحب لإعادة الترتيب، أو Alt مع ↑ / ↓', 'برای تغییر ترتیب بکشید، یا Alt + ↑ / ↓'], 'faq.pos': ['Question {n}', 'السؤال {n}', 'پرسش {n}'],
    'faq.lAdd': ['Questions · add', 'الأسئلة · إضافة', 'پرسش‌ها · افزودن'], 'faq.lDup': ['Questions · duplicate', 'الأسئلة · تكرار', 'پرسش‌ها · تکثیر'], 'faq.lDel': ['Questions · delete', 'الأسئلة · حذف', 'پرسش‌ها · حذف'], 'faq.lMove': ['Questions · reorder', 'الأسئلة · إعادة ترتيب', 'پرسش‌ها · تغییر ترتیب'],
    'faq.k.add': ['Add a question', 'أضف سؤالاً', 'افزودن پرسش'], 'faq.k.next': ['Next question', 'السؤال التالي', 'پرسش بعدی'], 'faq.k.prev': ['Previous question', 'السؤال السابق', 'پرسش قبلی'],
    'faq.readonly': ['Your role can read these questions but not change them.', 'يستطيع دورك قراءة هذه الأسئلة لا تغييرها.', 'نقش شما می‌تواند این پرسش‌ها را بخواند اما نمی‌تواند تغییرشان دهد.'],
    'faq.pvHidden': ['Hidden on the site', 'مخفي في الموقع', 'در سایت پنهان'],
    'faq.pvHiddenTip': ['The section is hidden, so the preview can’t show these questions. Switch on “Show on the site” to see them.', 'القسم مخفي، فلا تستطيع المعاينة عرض هذه الأسئلة. فعّل «إظهار في الموقع» لتراها.', 'این بخش پنهان است، پس پیش‌نمایش نمی‌تواند این پرسش‌ها را نشان دهد. برای دیدنشان «نمایش در سایت» را روشن کنید.'],
    'faq.tm.live': ['Live', 'منشور', 'منتشرشده'], 'faq.tm.edited': ['Edited, not published yet', 'مُعدَّل ولم يُنشر بعد', 'ویرایش شده، هنوز منتشر نشده'], 'faq.tm.new': ['New, not on the live site yet', 'جديد، وليس في الموقع المنشور بعد', 'تازه، هنوز در سایت منتشرشده نیست'],
  };
  const DICT = { en: {}, ar: {}, fa: {} };
  for (const [k, [en, ar, fa]] of Object.entries(I)) { DICT.en[k] = en; DICT.ar[k] = ar; DICT.fa[k] = fa; }
  MA.i18n.add(DICT);
  const LL = k => ({ en: I[k][0], ar: I[k][1], fa: I[k][2] });

  /* ---------- state that survives re-renders (while the admin is open) ---------- */
  const S = { open: new Set(), q: '', sort: 'page', pendingAdd: false };
  let V = null; // the mounted view

  const items = () => MA.content.get('faq') || [];
  const can = () => MA.can('content.edit');
  const other = l => (l === 'ar' ? 'en' : 'ar');
  /** Site copy inside the admin: Arabic when the admin is in Arabic, English otherwise (the site has no Persian). */
  const cl = () => MA.siteLang();
  /** Search folding: Arabic/Persian letter variants, digits and case, so a Persian keyboard finds Arabic questions. */
  const fold = v => (MA.fold ? MA.fold(v) : String(v ?? '').toLowerCase());
  const hit = (it, q) => !q || ['en', 'ar'].some(l => fold(qText(it, l)).includes(q) || fold(aText(it, l)).includes(q));
  const DAYS = 30;
  const qText = (it, l) => MA.strip(it?.[l]?.q || '').trim();
  const aText = (it, l) => MA.strip(it?.[l]?.a || '').trim();
  const blank = () => ({ en: { q: '', a: '' }, ar: { q: '', a: '' } });
  const missing = (it, l) => !qText(it, l) || !aText(it, l);
  const hasAny = it => ['en', 'ar'].some(l => qText(it, l) || aText(it, l));
  const navSoon = MA.debounce(() => MA.renderNav?.(), 500); // the sidebar badge counts questions missing a language
  /** Change state of one question against the live site: live, edited, or new (not published yet). */
  const tmState = i => i >= (MA.content.pub('faq') || []).length ? 'new' : MA.content.isChanged(`faq/${i}`) ? 'edited' : 'live';

  /** Opens per question, last 30 days, and where the numbers come from. */
  function opensData() {
    const src = MA.metrics.source(), p = MA.metrics.period(DAYS + 'd'), by = p.cur.faq || {}, n = items().length;
    const list = Array.from({ length: n }, (_, i) => by[i] || 0);
    return { src, list, total: list.reduce((a, b) => a + b, 0), visitors: p.cur.visitors || 0, sample: src === 'sample' || src === 'mixed', none: src === 'none' };
  }

  /* ---------- list mutations: each is one undo step, reversible from its toast ---------- */
  function commit(next, { label, remap, open, msg, after } = {}) {
    const before = MA.clone(items()), openBefore = new Set(S.open);
    if (remap) S.open = new Set([...S.open].map(remap).filter(x => x >= 0 && x < next.length));
    if (open != null) S.open.add(open);
    if (!MA.content.replace('faq', next, label)) { S.open = openBefore; return false; }
    if (msg) MA.toast(msg, { undo: () => { S.open = openBefore; MA.content.replace('faq', before, label); } });
    after?.();
    return true;
  }
  function addQuestion() {
    if (!can() || !V) return;
    const arr = MA.clone(items()); arr.push(blank());
    const i = arr.length - 1;
    if (S.q) { S.q = ''; V.search.value = ''; MA.setQuery({ q: null }); }
    if (S.sort !== 'page') { S.sort = 'page'; V.sortSeg.set('page'); }
    commit(arr, { label: MA.t('faq.lAdd'), open: i, after: () => focusField(i) });
  }
  function duplicate(i) {
    const arr = MA.clone(items()); if (!arr[i]) return;
    arr.splice(i + 1, 0, MA.clone(arr[i]));
    commit(arr, { label: MA.t('faq.lDup'), remap: x => (x > i ? x + 1 : x), open: i + 1, msg: MA.t('faq.duped'), after: () => focusToggle(i + 1) });
  }
  function remove(i) {
    const arr = MA.clone(items()); if (!arr[i]) return;
    arr.splice(i, 1);
    commit(arr, { label: MA.t('faq.lDel'), remap: x => (x === i ? -1 : x > i ? x - 1 : x), msg: MA.t('faq.deleted'), after: () => arr.length && focusToggle(Math.min(i, arr.length - 1)) });
  }
  function move(i, to) {
    const cur = items(); if (to < 0 || to >= cur.length || to === i) return;
    const order = cur.map((_, k) => k); const [o] = order.splice(i, 1); order.splice(to, 0, o);
    commit(order.map(k => MA.clone(cur[k])), { label: MA.t('faq.lMove'), remap: x => order.indexOf(x), msg: MA.t('faq.moved', { n: MA.num(to + 1) }), after: () => focusToggle(to) });
  }
  /** Drag result: ids = old indices in their new order. */
  function reorder(ids) {
    const cur = items(), order = ids.map(Number).filter(n => n >= 0 && n < cur.length);
    if (order.length !== cur.length || order.every((v, k) => v === k)) { renderRows(); return; }
    let to = 0, best = -1; // the dragged question is the one that travelled furthest
    order.forEach((v, k) => { const d = Math.abs(v - k); if (d > best) { best = d; to = k; } });
    commit(order.map(k => MA.clone(cur[k])), { label: MA.t('faq.lMove'), remap: x => order.indexOf(x), msg: MA.t('faq.moved', { n: MA.num(to + 1) }), after: () => focusToggle(to) });
  }

  /* ---------- preview helpers ---------- */
  const flashQ = i => MA.site.flash(`faq.${i}.q`);
  /** Open the answer in our preview (same-origin iframe), so the answer being edited is visible. */
  function openAnswer(i) {
    try {
      const d = V?.pane?.frame?.iframe?.contentDocument, b = d?.querySelector(`[data-cms="faq.${i}.q"]`)?.closest('button');
      if (b && b.getAttribute('aria-expanded') !== 'true') b.click();
    } catch (e) { /* preview not ready yet */ }
  }

  /* ---------- rows ---------- */
  // the list re-renders synchronously on content:change, so these can run right away
  function focusField(i, part = 'q', lang = 'en') {
    const inp = V?.list.querySelector(`.cf[data-tpl="faq/${i}/{lang}/${part}"] [lang="${lang}"]`); if (!inp) return;
    inp.focus({ preventScroll: true }); inp.scrollIntoView({ block: 'center', behavior: MA.reducedMotion() ? 'auto' : 'smooth' });
  }
  function focusToggle(i) { V?.list.querySelector(`.fq-row[data-i="${i}"] .fq-toggle`)?.focus(); }

  function setOpen(i, on, { flash = true } = {}) {
    on ? S.open.add(i) : S.open.delete(i);
    const li = V?.list.querySelector(`.fq-row[data-i="${i}"]`); if (!li) return;
    li.classList.toggle('open', on);
    li.querySelector('.fq-toggle').setAttribute('aria-expanded', String(on));
    const body = li.querySelector('.fq-body');
    if (on && !body.childElementCount) fillBody(body, i);
    body.hidden = !on;
    if (on && flash) flashQ(i);
  }
  function refreshOpen() { V?.list.querySelectorAll('.fq-row').forEach(li => setOpen(+li.dataset.i, S.open.has(+li.dataset.i), { flash: false })); }

  function fillBody(body, i) {
    body.append(
      MA.form.bi(`faq/${i}/{lang}/q`, { label: MA.t('faq.question'), kind: 'text', placeholder: PH.q }),
      MA.form.bi(`faq/${i}/{lang}/a`, { label: MA.t('faq.answer'), kind: 'rich', placeholder: PH.a }));
  }

  function rowMenu(anchor, i) {
    const n = items().length, ed = can(), paged = S.sort === 'page' && !S.q;
    MA.ui.menu(anchor, [
      { label: MA.t('faq.showPrev'), icon: 'eye', run: () => { flashQ(i); openAnswer(i); } },
      ed ? '-' : null,
      ed ? { label: MA.t('faq.up'), icon: 'chevUp', meta: '<kbd>Alt</kbd><kbd>↑</kbd>', disabled: i === 0 || !paged, run: () => move(i, i - 1) } : null,
      ed ? { label: MA.t('faq.down'), icon: 'chevDown', meta: '<kbd>Alt</kbd><kbd>↓</kbd>', disabled: i === n - 1 || !paged, run: () => move(i, i + 1) } : null,
      ed ? { label: MA.t('faq.dup'), icon: 'copy', run: () => duplicate(i) } : null,
      ed ? '-' : null,
      ed ? { label: MA.t('faq.del'), icon: 'trash', danger: true, run: () => remove(i) } : null,
    ].filter(Boolean), { align: 'end' });
  }

  function row(i, max) {
    const O = V.opens, n = O.list[i] || 0, ed = can();
    const li = MA.h('li.fq-row', { dataset: { id: String(i), i: String(i) } });
    const toggle = MA.h('button.fq-toggle', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'fq-body-' + i, onclick: () => setOpen(i, !S.open.has(i)) },
      MA.h('span.fq-num.num', MA.num(i + 1, { minimumIntegerDigits: 2, useGrouping: false })),
      MA.h('span.fq-tm'),
      MA.h('span.fq-titles', MA.h('span.fq-q'), MA.h('span.fq-q2')));
    const opens = O.none ? null : MA.h('span', { class: 'fq-opens' + (O.sample ? ' is-sample' : ''), 'data-tip': MA.t('faq.opensTip', { count: n, n: MA.num(n), d: MA.num(DAYS) }) },
      MA.h('span', { class: 'fq-bar' + (O.sample ? ' hatched' : '') }, MA.h('i', { style: `inline-size:${Math.round(n / max * 100)}%` })),
      MA.h('span.fq-n.num', MA.num(n)));
    const acts = MA.h('span.fq-acts',
      ed ? MA.ui.iconBtn('copy', { tip: MA.t('faq.dup'), size: 'sm', onclick: () => duplicate(i) }) : null,
      ed ? MA.ui.iconBtn('trash', { tip: MA.t('faq.del'), size: 'sm', onclick: () => remove(i) }) : null,
      MA.ui.iconBtn('more', { tip: MA.t('faq.actions'), size: 'sm', onclick: e => rowMenu(e.currentTarget, i) }));
    const head = MA.h('div.fq-head',
      ed ? MA.h('span.drag-handle', { 'aria-hidden': 'true', title: MA.t('faq.drag'), html: MA.icon('drag', 'sm') }) : null,
      toggle, MA.h('span.fq-flags'), opens, acts,
      MA.h('span.fq-chev', { html: MA.icon('chevDown', 'sm'), 'aria-hidden': 'true' }));
    head.addEventListener('click', e => { if (e.target === head || e.target.closest('.fq-chev,.fq-flags,.fq-opens')) setOpen(i, !S.open.has(i)); });
    li.append(head, MA.h('div.fq-body', { id: 'fq-body-' + i, hidden: true }));
    fillRow(li, i);
    return li;
  }

  /** Summary of a row: the question in the admin language, the other language under it, and flags. */
  function fillRow(li, i) {
    const it = items()[i]; if (!it || !li) return;
    const L = cl(), O = other(L), main = qText(it, L), sub = qText(it, O);
    const q = li.querySelector('.fq-q'), q2 = li.querySelector('.fq-q2');
    q.textContent = main || sub || MA.t('faq.untitled'); q.classList.toggle('untitled', !main && !sub); q.dir = 'auto';
    // site copy carries its language, so screen readers switch voice (an untitled row is admin text)
    if (main || sub) q.lang = main ? L : O; else q.removeAttribute('lang');
    q2.textContent = main && sub ? sub : ''; q2.dir = 'auto'; q2.lang = O; q2.hidden = !(main && sub);
    const st = tmState(i), tm = li.querySelector('.fq-tm');
    if (tm && tm.dataset.state !== st) { tm.dataset.state = st; tm.title = MA.t('faq.tm.' + st); tm.innerHTML = ''; tm.append(MA.ui.tideMark(st === 'new' ? 'draft' : st, MA.t('faq.tm.' + st))); }
    const flags = li.querySelector('.fq-flags'); flags.innerHTML = '';
    if (!hasAny(it)) flags.append(MA.ui.badge(MA.t('faq.blank'), 'bad'));
    if (hasAny(it) && missing(it, 'ar')) flags.append(MA.ui.badge(MA.t('faq.missAr'), 'warn'));
    if (hasAny(it) && missing(it, 'en')) flags.append(MA.ui.badge(MA.t('faq.missEn'), 'warn'));
  }

  function renderRows() {
    if (!V) return;
    const arr = items(), O = V.opens = opensData();
    V.list.innerHTML = '';
    const order = arr.map((_, i) => i);
    if (S.sort === 'opens') order.sort((a, b) => (O.list[b] || 0) - (O.list[a] || 0) || a - b);
    const max = Math.max(1, ...O.list);
    order.forEach(i => V.list.append(row(i, max)));
    refreshOpen();
    V.list.hidden = !arr.length;
    V.addRow.hidden = !arr.length || !can();
    V.emptyAll.hidden = !!arr.length;
    V.toolbar.hidden = !arr.length;
    V.foot.hidden = !arr.length || O.none;
    renderStats(); applyFilter();
    navSoon();
  }

  function applyFilter() {
    if (!V) return;
    const q = fold(S.q.trim()), arr = items();
    let shown = 0;
    V.list.querySelectorAll('.fq-row').forEach(li => {
      const ok = hit(arr[+li.dataset.i], q);
      li.hidden = !ok; if (ok) shown++;
    });
    V.count.textContent = q ? MA.t('faq.countOf', { n: MA.num(shown), t: MA.num(arr.length) }) : arr.length === 1 ? MA.t('faq.countOne', { n: MA.num(1) }) : MA.t('faq.count', { n: MA.num(arr.length) });
    V.noMatch.hidden = !(q && !shown && arr.length);
    V.noMatchText.textContent = MA.t('faq.noMatch', { q: S.q.trim() });
    V.root.classList.toggle('no-drag', !!q || S.sort !== 'page' || !can());
    V.sortNote.hidden = S.sort === 'page' || !arr.length;
  }

  function renderStats() {
    const O = V.opens, box = V.stats; box.innerHTML = '';
    box.hidden = !items().length;
    box.classList.toggle('hatched', O.sample);
    const head = MA.h('div.fq-stats-head', MA.h('span.label', MA.t('faq.opens', { n: MA.num(DAYS) })), O.sample ? MA.ui.sample() : null);
    if (O.none) { box.append(head, MA.h('p.small.muted', MA.t('faq.noOpens'))); return; }
    const arr = items(), L = cl();
    const top = O.list.reduce((b, v, i) => (v > (O.list[b] ?? -1) ? i : b), 0);
    const topQ = arr[top] ? (qText(arr[top], L) || qText(arr[top], other(L)) || MA.t('faq.untitled')) : '';
    const per = O.visitors ? O.total / O.visitors * 100 : 0;
    box.append(head, MA.h('div.fq-stats-line',
      MA.h('span.fq-total', MA.h('b.num', MA.num(O.total)), MA.h('span', MA.t('faq.opensWord'))),
      O.visitors ? MA.h('span.fq-stat', MA.t('faq.perVisitors', { n: MA.num(per, { maximumFractionDigits: 1 }), h: MA.num(100) })) : null,
      O.total && topQ ? MA.h('button.fq-stat.fq-toplink', { type: 'button', onclick: () => { setOpen(top, true); focusToggle(top); } },
        MA.h('span.faint', MA.t('faq.topLabel')), MA.h('b.truncate', { dir: 'auto', lang: MA.langOf(topQ) }, topQ), MA.h('span.faint.num', MA.pct(O.list[top] / Math.max(1, O.total)))) : null));
  }

  /* ---------- the page ---------- */
  function render(view, ctx) {
    const root = MA.h('div.m-faq');
    view.append(root);
    V = { root, pane: null, activeAns: null };
    MA.cleanup(() => { if (V?.root === root) V = null; });

    // open the question we were sent to (?field=faq/2/{lang}/q, or a click in a preview)
    const want = MA.content.focusAfterRoute?.tpl || ctx.query.get('field');
    const m = want && /^faq\/(\d+)\//.exec(want);
    if (m) S.open.add(+m[1]);
    S.q = m ? '' : (ctx.query.get('q') ?? S.q);

    // the live preview: the shared pane, aimed at the Questions section (hideable; a narrow pane previews the phone layout)
    V.pvBadge = MA.h('span.fq-pvbadge', { title: MA.t('faq.pvHiddenTip') }, MA.ui.badge(MA.t('faq.pvHidden'), 'warn'));
    V.pane = MA.ui.previewPane({ key: 'faq', section: 'faq', device: 'auto', head: [V.pvBadge] });

    // header
    const showSw = MA.form.input('sections/faq', { kind: 'switch' });
    showSw.classList.add('fq-show'); showSw.append(MA.h('span', MA.t('faq.show')));
    const actions = can() ? [showSw] : [];
    actions.push(V.pane.toggle);
    if (can()) actions.push(MA.ui.btn(MA.t('faq.add'), { icon: 'plus', kind: 'primary', onclick: addQuestion }));
    root.append(MA.ui.pageHead({ title: MA.esc(MA.L(LL('faq.title'))), sub: MA.esc(MA.t('faq.sub')), actions }));

    const main = MA.h('div.fq-main');
    root.append(MA.ui.previewPane.split(main, V.pane));

    // notices
    if (!can()) main.append(MA.h('div.callout', { html: MA.icon('lock') + `<span>${MA.esc(MA.t('faq.readonly'))}</span>` }));
    V.hiddenNote = MA.h('div.callout.warn.fq-hidden', MA.frag(MA.icon('eyeOff')), MA.h('span.grow', MA.t('faq.hiddenNote')),
      can() ? MA.ui.btn(MA.t('faq.showNow'), { size: 'sm', onclick: () => MA.content.set('sections/faq', true, { coalesce: false }) }) : null);
    const syncHidden = () => { const off = MA.content.get('sections/faq') === false; V.hiddenNote.hidden = !off; V.pvBadge.hidden = !off; };
    syncHidden();
    main.append(V.hiddenNote);

    // headline
    main.append(MA.h('section.card.fq-headline', MA.form.bi('text/{lang}/q.title', { label: MA.t('faq.headline'), kind: 'rich', hint: MA.esc(MA.t('faq.headlineHint')) })));

    // opens strip
    V.stats = MA.h('div.fq-stats');
    main.append(V.stats);

    // toolbar: search, order, count
    V.search = MA.h('input.input', { type: 'search', placeholder: MA.t('faq.search'), 'aria-label': MA.t('faq.search'), value: S.q,
      oninput: e => { S.q = e.target.value; applyFilter(); MA.setQuery({ q: S.q.trim() || null }); },
      onkeydown: e => { if (e.key === 'Escape' && S.q) { e.preventDefault(); e.stopPropagation(); S.q = ''; e.target.value = ''; applyFilter(); MA.setQuery({ q: null }); } } });
    V.count = MA.h('span.fq-count.small.faint.num');
    V.sortSeg = MA.ui.seg([{ value: 'page', label: MA.t('faq.order') }, { value: 'opens', label: MA.t('faq.byOpens') }], S.sort, v => { S.sort = v; renderRows(); }, { size: 'sm', label: MA.t('faq.order') });
    V.toolbar = MA.h('div.toolbar.fq-toolbar', MA.h('label.search', MA.frag(MA.icon('search', 'sm')), V.search), V.sortSeg, MA.h('span.grow'), V.count);
    V.sortNote = MA.h('p.fq-note.small.faint', { hidden: true }, MA.t('faq.sortedNote'));
    main.append(V.toolbar, V.sortNote);

    // the list
    V.list = MA.h('ol.fq-list', { 'aria-label': MA.L(LL('faq.title')) });
    V.noMatchText = MA.h('p');
    V.noMatch = MA.h('div.fq-nomatch', { hidden: true }, MA.frag(MA.icon('search', 'lg')), V.noMatchText,
      MA.ui.btn(MA.t('faq.clear'), { kind: 'ghost', size: 'sm', onclick: () => { S.q = ''; V.search.value = ''; applyFilter(); MA.setQuery({ q: null }); V.search.focus(); } }));
    V.emptyAll = MA.ui.empty({ title: MA.esc(MA.t('faq.empty')), text: MA.esc(MA.t('faq.emptyText')), pose: 'present', actions: can() ? [MA.ui.btn(MA.t('faq.addFirst'), { icon: 'plus', kind: 'primary', onclick: addQuestion })] : [] });
    V.emptyAll.classList.add('card', 'fq-empty');
    V.addRow = MA.h('button.fq-addrow', { type: 'button', onclick: addQuestion, html: MA.icon('plus', 'sm') + `<span>${MA.esc(MA.t('faq.add'))}</span><kbd>N</kbd>` });
    V.foot = MA.h('p.fq-foot.tiny.faint', { html: MA.icon('info', 'sm') + `<span>${MA.esc(MA.t('faq.slotNote'))}</span>` });
    main.append(V.list, V.noMatch, V.emptyAll, V.addRow, V.foot);

    // drag to reorder (one sortable for the life of this list element)
    MA.ui.sortable(V.list, { item: '.fq-row', handle: '.drag-handle', onEnd: ids => { if (S.sort === 'page' && !S.q && can()) reorder(ids); else renderRows(); } });
    // keyboard reorder on a focused row: Alt + ↑ / ↓
    V.list.addEventListener('keydown', e => {
      const up = e.code === 'ArrowUp' || e.key === 'ArrowUp', down = e.code === 'ArrowDown' || e.key === 'ArrowDown';
      if (!e.altKey || !(up || down) || e.target.closest('input,textarea,[contenteditable=true]')) return;
      const li = e.target.closest('.fq-row'); if (!li || !can() || S.sort !== 'page' || S.q) return;
      e.preventDefault(); const i = +li.dataset.i; move(i, i + (up ? -1 : 1));
    });
    // editing an answer opens it in the preview
    root.addEventListener('focusin', e => {
      const tpl = e.target.closest?.('.cf')?.dataset.tpl || '', a = /^faq\/(\d+)\/\{lang\}\/a$/.exec(tpl);
      if (!V) return; V.activeAns = a ? +a[1] : null; if (a) setTimeout(() => openAnswer(+a[1]), 90);
    });

    renderRows();

    // stay in sync with the draft (undo, other editors, restores)
    const reopen = MA.debounce(() => { if (V?.activeAns != null) openAnswer(V.activeAns); }, 240);
    MA.onView('content:change', ({ path = '' } = {}) => {
      if (!V) return;
      if (path === '' || path === 'faq' || /^faq\/\d+$/.test(path)) { renderRows(); reopen(); }
      else if (/^faq\/\d+\//.test(path)) { const k = +path.split('/')[1]; fillRow(V.list.querySelector(`.fq-row[data-i="${k}"]`), k); if (/\/a$/.test(path)) reopen(); navSoon(); }
      if (path === '' || path.startsWith('sections')) syncHidden();
    });
    MA.onView('metrics', renderRows);
    MA.onView('sample', renderRows);

    // keys while mounted
    // page-scoped keys: the core removes them when the route leaves this page
    MA.keys.bindView('j', () => step(1), () => MA.t('faq.k.next'));
    MA.keys.bindView('k', () => step(-1), () => MA.t('faq.k.prev'));
    if (can()) MA.keys.bindView('n', addQuestion, () => MA.t('faq.k.add')); // not 'c': a single-key binding would swallow the 'g c' chord

    if (S.pendingAdd) { S.pendingAdd = false; setTimeout(addQuestion, 30); }
  }

  /** j / k: move focus between the visible rows (Enter then opens the focused one). */
  function step(d) {
    if (!V) return;
    const rows = [...V.list.querySelectorAll('.fq-row:not([hidden]) .fq-toggle')]; if (!rows.length) return;
    const cur = rows.indexOf(document.activeElement);
    const next = rows[cur < 0 ? (d > 0 ? 0 : rows.length - 1) : Math.min(rows.length - 1, Math.max(0, cur + d))];
    next.focus({ preventScroll: true }); next.scrollIntoView({ block: 'nearest' });
  }

  MA.module({
    id: 'faq', group: 'site', order: 60, icon: 'faq', shortcut: 'g f',
    title: LL('faq.title'),
    keywords: 'faq questions answers أسئلة أجوبة پرسش پاسخ',
    /** Quiet count of questions that are missing one language. */
    badge() {
      const n = items().filter(it => hasAny(it) && (missing(it, 'ar') || missing(it, 'en'))).length;
      return n ? { n, quiet: true } : null;
    },
    render,
    update(ctx) {
      if (!V?.root?.isConnected) return false;
      const want = MA.content.focusAfterRoute?.tpl || ctx.query.get('field');
      const m = want && /^faq\/(\d+)\//.exec(want);
      if (m) { if (S.q) { S.q = ''; V.search.value = ''; applyFilter(); } setOpen(+m[1], true); }
      return true;
    },
    search(q) {
      const ql = fold(q.trim()); if (!ql) return [];
      const L = cl();
      return items().map((it, i) => ({ it, i }))
        .filter(({ it }) => hit(it, ql))
        .slice(0, 6)
        .map(({ it, i }) => ({ title: qText(it, L) || qText(it, other(L)) || MA.t('faq.untitled'), sub: MA.t('faq.pos', { n: MA.num(i + 1) }), icon: 'faq',
          run: () => { MA.content.focusAfterRoute = { tpl: `faq/${i}/{lang}/q`, lang: L }; MA.go('#/faq?field=' + encodeURIComponent(`faq/${i}/{lang}/q`)); } }));
    },
  });

  MA.commands.add({ id: 'faq.add', title: LL('faq.k.add'), sub: LL('faq.title'), icon: 'faq', keywords: 'faq new question سؤال جديد',
    when: () => MA.can('content.edit'),
    run: () => { if (V?.root?.isConnected) addQuestion(); else { S.pendingAdd = true; MA.go('#/faq'); } } });
})();
