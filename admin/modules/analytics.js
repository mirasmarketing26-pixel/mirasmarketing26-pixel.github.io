/* MIRAS admin — Analytics
   Everything here reads MA.metrics (sample generator and/or this browser's own event log). Nothing is invented.
   Layout: range control → source banner (names the provider that counts real visitors, once one is connected) → the provider's
   shared dashboard, framed (MA.db 'analytics.shareUrl') → metric strip (tabs drive the main chart) → breakdowns, live panel,
   section reach (tide lines, in the site's layout order), funnel, where briefs come from (source / campaign → briefs, pipeline, won),
   swell taps, small moments, when visitors come, opening film, FAQ, services added to briefs, and where the numbers come from.
   Every chart is a <figure> with a one-sentence summary and a Table toggle. Every change is written by MA.ui.delta.
   Months and years (month to date, ← →) follow the calendar chosen in Customize.
   Keys while mounted (MA.keys.bindView): D W T Q Y M (ranges) · ←/→ previous/next period (mirrored in RTL) · X comparison.
   Admin UI in English, Arabic or Persian; site copy (swells, questions, services) is shown in Arabic for an Arabic admin, English otherwise. */
(() => {
  'use strict';
  const MA = window.MA;
  const DAY = 864e5, SVGNS = 'http://www.w3.org/2000/svg';
  const esc = MA.esc;
  const T = (k, v) => MA.t('analytics.' + k, v);
  const M = () => MA.metrics;

  MA.i18n.add({
    en: {
      'analytics.title': 'Analytics',
      'analytics.sub': 'Who came to mirasmarketing.com, what they tapped, and where they drifted off.',
      'analytics.metricsLabel': 'Metrics',
      'analytics.range.prev': 'Previous period', 'analytics.range.next': 'Next period', 'analytics.range.pick': 'Change the date range',
      'analytics.range.custom': 'Custom range', 'analytics.range.from': 'From', 'analytics.range.to': 'To', 'analytics.range.apply': 'Show this range',
      'analytics.range.tz': 'Times in Doha ({gmt})', 'analytics.range.keys': '← → step · X compare',
      'analytics.range.badDates': 'Pick a start date on or before the end date.', 'analytics.range.future': "The range can't end after today.", 'analytics.range.tooLong': 'Pick a range of two years or less.',
      'analytics.compare': 'Compare', 'analytics.compareTip': 'Compare with the previous period (X)',
      'analytics.announce': 'Showing {range}.', 'analytics.announce.cmpOn': 'Comparison on.', 'analytics.announce.cmpOff': 'Comparison off.',
      'analytics.ph.1d': 'so far today', 'analytics.ph.7d': 'in the last {n} days', 'analytics.ph.30d': 'in the last {n} days', 'analytics.ph.90d': 'in the last {n} days',
      'analytics.ph.12m': 'in the last {n} months', 'analytics.ph.mtd': 'so far this month', 'analytics.ph.ytd': 'so far this year', 'analytics.ph.on': 'on {d}', 'analytics.ph.in': 'in {d}',
      'analytics.src.sample.title': 'Sample data — connect analytics to see real visitors',
      'analytics.src.sample.text': 'These numbers are generated so you can see how this page reads. They stay the same on every reload and carry a Sample stamp wherever they appear.',
      'analytics.src.local.title': 'Live from this browser',
      'analytics.src.local.text': "These are your own visits to the site from this browser: the site keeps a private log while the admin is open here. Visitors on other devices show up in your analytics service once it's connected.",
      'analytics.src.mixed.title': 'Sample data plus visits from this browser',
      'analytics.src.mixed.text': { one: 'Charts add generated sample numbers to the {n} event this browser logged. Hide sample data to see only your own visits.', other: 'Charts add generated sample numbers to the {n} events this browser logged. Hide sample data to see only your own visits.' },
      'analytics.src.connect': 'Connect analytics', 'analytics.src.hideSample': 'Hide sample data', 'analytics.src.showSample': 'Show sample data',
      'analytics.src.hidden': 'Sample data hidden.', 'analytics.src.shown': 'Sample data is back.', 'analytics.src.last': 'Last event logged {ago}.',
      'analytics.none.title': 'Waiting for the first visit…',
      'analytics.none.text': 'Open the site in this browser and look around; your visits show up here within seconds. To count real visitors, connect Plausible, GA4 or Umami in Settings.',
      'analytics.none.openSite': 'Open the site',
      'analytics.emptyRange.title': 'Nothing in this range', 'analytics.emptyRange.text': 'No visits were logged {range}. Try a longer range.', 'analytics.emptyRange.btn': 'Show the last {n} days',
      'analytics.m.visitors': 'Visitors', 'analytics.m.views': 'Page views', 'analytics.m.taps': 'Swell taps', 'analytics.m.conv': 'Conversion', 'analytics.m.film': 'Watched half the film',
      'analytics.d.fullDay': 'on {range} (full day)', 'analytics.c.fullDay': ', against {v} on {range} (a full day)',
      'analytics.c.up': ', up {amt} on {range}', 'analytics.c.down': ', down {amt} on {range}', 'analytics.c.flat': ', about the same as {range}', 'analytics.c.new': ', with none in {range}',
      'analytics.sum.total': '{metric}: {v} {range}', 'analytics.sum.peak': '; busiest day {day} ({v})', 'analytics.sum.best': '; best day {day} ({v})',
      'analytics.sum.hourly': 'Page views by hour {range}, Doha time', 'analytics.sum.peakHour': '; busiest at {h} ({v})',
      'analytics.note.hourlyOnly': 'Hourly detail exists for page views only, so the chart shows page views.', 'analytics.note.weekly': 'Each point is the daily average for one week.', 'analytics.note.today': 'The dotted end is today, still in progress.',
      'analytics.legend.publish': 'Published', 'analytics.pub.list': 'Published in this range', 'analytics.pub.tip': 'v{n} published {when}',
      'analytics.table': 'Table', 'analytics.tableTip': 'Show the numbers as a table',
      'analytics.col.date': 'Date', 'analytics.col.week': 'Week from', 'analytics.col.hour': 'Hour', 'analytics.col.change': 'Change', 'analytics.col.visits': 'Visits', 'analytics.col.share': 'Share',
      'analytics.col.ofVisitors': 'Of visitors', 'analytics.col.step': 'Step', 'analytics.col.ofPrev': 'Of previous step', 'analytics.col.section': 'Section', 'analytics.col.reached': 'Reached',
      'analytics.col.day': 'Day', 'analytics.col.peak': 'Busiest hour', 'analytics.col.views': 'Page views', 'analytics.col.swell': 'Swell', 'analytics.col.taps': 'Taps', 'analytics.col.question': 'Question',
      'analytics.col.opens': 'Opens', 'analytics.col.milestone': 'Milestone', 'analytics.col.event': 'Event', 'analytics.col.when': 'Sent when', 'analytics.col.props': 'Details', 'analytics.col.previous': 'Previous', 'analytics.col.here': 'Logged here',
      'analytics.bd.title': 'Where visitors come from', 'analytics.bd.sources': 'Sources', 'analytics.bd.countries': 'Countries', 'analytics.bd.languages': 'Languages', 'analytics.bd.devices': 'Devices',
      'analytics.bd.direct': 'Direct or unknown', 'analytics.bd.other': 'Other', 'analytics.bd.viewAll': 'View all', 'analytics.bd.sum': { one: '{top} leads with {share} of {total} visit.', other: '{top} leads with {share} of {total} visits.' },
      'analytics.bd.none': 'Nothing to break down in this range.', 'analytics.bd.export': 'Export CSV', 'analytics.bd.all': '{n} rows {range}',
      'analytics.lang.en': 'English', 'analytics.lang.ar': 'Arabic',
      'analytics.live.title': 'Right now', 'analytics.live.now': 'in the last {n} minutes · this browser', 'analytics.live.updated': 'Updated {time} · every {n} s',
      'analytics.live.quiet': 'Quiet right now', 'analytics.live.quietText': 'Visits from this browser appear here as they happen.', 'analytics.live.feed': 'Latest activity',
      'analytics.sw.title': 'Swell taps', 'analytics.sw.edit': 'Edit swells', 'analytics.sw.sum': '{top} drew the most taps: {share} of {total}.', 'analytics.sw.none': 'No swell was tapped in this range.',
      'analytics.reach.title': 'How far down the page people get', 'analytics.reach.sum': '{lastShare} of visitors make it to {last}; the biggest drop comes after {after} ({drop}).',
      'analytics.reach.drop': 'Biggest drop', 'analytics.reach.noDrop': '{lastShare} of visitors make it to {last}, with no drop along the way.', 'analytics.reach.dropAfter': 'Biggest drop: {drop} after {after}', 'analytics.reach.hidden': 'Hidden on the site', 'analytics.reach.pts': { one: '−{n} pt', other: '−{n} pts' }, 'analytics.reach.none': 'No sections were reached in this range.',
      'analytics.fn.title': 'From landing to brief', 'analytics.fn.leak': 'Biggest leak', 'analytics.fn.ofPrev': '{p} of previous', 'analytics.fn.left': '{p} left here',
      'analytics.fn.sum': '{rate} of visitors got to “{last}”; the biggest leak is from “{a}” to “{b}”, where {lost} drop off.',
      'analytics.fn.noLeak': '{rate} of visitors got to “{last}”, and no step lost anyone.',
      'analytics.film.title': 'Opening film', 'analytics.film.mark': 'Reached {p}', 'analytics.film.sum': '{half} of visitors watched past halfway and {done} saw the end.',
      'analytics.heat.title': 'When visitors come', 'analytics.heat.sum': 'Busiest on {day}s around {hour}; {quiet} is the quietest day (Doha time).', 'analytics.heat.none': 'No page views in this range.',
      'analytics.faq.title': 'Questions opened', 'analytics.faq.edit': 'Edit questions', 'analytics.faq.sum': { one: '“{top}” is opened most ({v} time).', other: '“{top}” is opened most ({v} times).' }, 'analytics.faq.none': 'Nobody opened a question in this range.',
      'analytics.sv.title': 'Services added to briefs', 'analytics.sv.edit': 'Edit services', 'analytics.sv.how': 'Visitors add a service with the + beside it in the Services list on the site. Each add shows up here.', 'analytics.sv.sum': '{top} was added most: {v} of {total} adds {range}.', 'analytics.sv.none': 'No service was added to a brief {range}.',
      'analytics.sv.noteSample': 'Counted from visits logged in this browser. Sample data does not include service picks, so this card only shows real ones.', 'analytics.sv.note': 'Counted from visits logged in this browser.',
      'analytics.sv.briefs': 'Briefs in this range that named services: {n}', 'analytics.col.service': 'Service', 'analytics.col.group': 'Group', 'analytics.col.adds': 'Added', 'analytics.col.inBriefs': 'In briefs',
      'analytics.ev.service': 'Added a service to the brief, or took it out', 'analytics.s.service': 'Services added · {v}',
      'analytics.mo.title': 'Small moments', 'analytics.mo.lang': 'Switched language', 'analytics.mo.plan': 'Added the plan to a brief', 'analytics.mo.copy': 'Copied the brief', 'analytics.mo.words': 'Caught a word in What we make', 'analytics.mo.ofVisitors': '{p} of visitors',
      'analytics.cx.connected': 'Connected to {name}', 'analytics.cx.tracking': 'What the site tracks', 'analytics.cx.siteId': 'Site ID',
      'analytics.cx.notText': 'Right now the admin only sees this browser. Pick Plausible, GA4 or Umami in Settings and the site sends these same events there, from every visitor.',
      'analytics.cx.open': 'Open {name}', 'analytics.cx.notLive': 'Not live yet: publish to start sending events.', 'analytics.cx.publish': 'Review and publish', 'analytics.cx.noId': 'Add the site ID in Settings so events reach {name}.',
      'analytics.cx.settings': 'Open settings', 'analytics.cx.events': 'Custom events the site sends',
      'analytics.cx.hint.plausible': 'In Plausible, add each event as a custom event goal to see it in the dashboard.',
      'analytics.cx.hint.ga4': 'In GA4 they appear under Reports › Engagement › Events, usually within a day.',
      'analytics.cx.hint.umami': "In Umami they appear on the website's Events tab.",
      'analytics.ev.view': 'Page opened (with the referring site)', 'analytics.ev.lang': 'Switched between English and Arabic', 'analytics.ev.swell': 'Tapped a swell',
      'analytics.ev.plan_to_brief': 'Added the plan to the brief', 'analytics.ev.make': 'Caught a word in What we make',
      'analytics.ev.brief': 'Opened the email draft or sent the brief', 'analytics.ev.brief_copy': 'Copied the brief text', 'analytics.ev.faq': 'Opened a question',
      'analytics.ev.section': 'Reached a section', 'analytics.ev.journey': 'Opening film passed {list}',
      'analytics.export': 'Export CSV', 'analytics.exported': { one: 'Exported {n} day as CSV.', other: 'Exported {n} days as CSV.' }, 'analytics.clear': "Clear this browser's events",
      'analytics.clear.title': { one: 'Clear {n} event from this browser?', other: 'Clear {n} events from this browser?' },
      'analytics.clear.text': "This removes the visit log the site kept in this browser. It can't be undone. Sample data and your analytics service are not affected.",
      'analytics.clear.ok': 'Clear events', 'analytics.cleared': "Cleared this browser's events.",
      'analytics.foot': 'Times in Doha ({gmt}). A day runs midnight to midnight, Qatar time.',
      'analytics.k.range': 'Analytics: {range}', 'analytics.k.prev': 'Analytics: previous period', 'analytics.k.next': 'Analytics: next period', 'analytics.k.compare': 'Analytics: comparison on or off',
      'analytics.s.item': { one: '{tab} · {v} visit', other: '{tab} · {v} visits' }, 'analytics.s.swell': 'Swell taps · {v}', 'analytics.s.section': 'Section reach · {p}', 'analytics.s.faq': 'Question opens · {v}',
    },
    ar: {
      'analytics.title': 'التحليلات',
      'analytics.sub': 'من زار mirasmarketing.com، وماذا اختار، وأين توقّف.',
      'analytics.metricsLabel': 'المقاييس',
      'analytics.range.prev': 'الفترة السابقة', 'analytics.range.next': 'الفترة التالية', 'analytics.range.pick': 'تغيير الفترة',
      'analytics.range.custom': 'فترة مخصّصة', 'analytics.range.from': 'من', 'analytics.range.to': 'إلى', 'analytics.range.apply': 'اعرض هذه الفترة',
      'analytics.range.tz': 'الأوقات بتوقيت الدوحة ({gmt})', 'analytics.range.keys': '← → للتنقّل · X للمقارنة',
      'analytics.range.badDates': 'اختر تاريخ بداية يسبق تاريخ النهاية أو يساويه.', 'analytics.range.future': 'لا يمكن أن تنتهي الفترة بعد اليوم.', 'analytics.range.tooLong': 'اختر فترة لا تتجاوز سنتين.',
      'analytics.compare': 'مقارنة', 'analytics.compareTip': 'قارن بالفترة السابقة (X)',
      'analytics.announce': 'تعرض الآن {range}.', 'analytics.announce.cmpOn': 'المقارنة مفعّلة.', 'analytics.announce.cmpOff': 'المقارنة متوقفة.',
      'analytics.ph.1d': 'اليوم حتى الآن', 'analytics.ph.7d': 'خلال آخر {n} أيام', 'analytics.ph.30d': 'خلال آخر {n} يوماً', 'analytics.ph.90d': 'خلال آخر {n} يوماً',
      'analytics.ph.12m': 'خلال آخر {n} شهراً', 'analytics.ph.mtd': 'منذ بداية الشهر', 'analytics.ph.ytd': 'منذ بداية السنة', 'analytics.ph.on': 'يوم {d}', 'analytics.ph.in': 'خلال {d}',
      'analytics.src.sample.title': 'بيانات تجريبية — اربط خدمة التحليلات لترى الزوّار الحقيقيين',
      'analytics.src.sample.text': 'هذه أرقام مولّدة لتوضيح شكل الصفحة، لا تتغيّر عند إعادة التحميل وتحمل علامة «تجريبي» أينما ظهرت.',
      'analytics.src.local.title': 'مباشرة من هذا المتصفح',
      'analytics.src.local.text': 'هذه زياراتك للموقع من هذا المتصفح، إذ يحتفظ الموقع بسجلّ خاص ما دامت لوحة الإدارة مفتوحة هنا. يظهر زوّار الأجهزة الأخرى في خدمة التحليلات بعد ربطها.',
      'analytics.src.mixed.title': 'بيانات تجريبية مع زيارات من هذا المتصفح',
      'analytics.src.mixed.text': 'تجمع الرسوم بين أرقام تجريبية والأحداث التي سجّلها هذا المتصفح ({n}). أخفِ البيانات التجريبية لترى زياراتك وحدها.',
      'analytics.src.connect': 'اربط خدمة التحليلات', 'analytics.src.hideSample': 'إخفاء البيانات التجريبية', 'analytics.src.showSample': 'عرض البيانات التجريبية',
      'analytics.src.hidden': 'أُخفيت البيانات التجريبية.', 'analytics.src.shown': 'عادت البيانات التجريبية.', 'analytics.src.last': 'آخر حدث سُجّل {ago}.',
      'analytics.none.title': 'بانتظار الزيارة الأولى…',
      'analytics.none.text': 'افتح الموقع في هذا المتصفح وتجوّل فيه، وستظهر زياراتك هنا خلال ثوانٍ. ولإحصاء الزوّار الحقيقيين، اربط Plausible أو GA4 أو Umami من الإعدادات.',
      'analytics.none.openSite': 'افتح الموقع',
      'analytics.emptyRange.title': 'لا شيء في هذه الفترة', 'analytics.emptyRange.text': 'لم تُسجَّل أي زيارة {range}. جرّب فترة أطول.', 'analytics.emptyRange.btn': 'اعرض آخر {n} يوماً',
      'analytics.m.visitors': 'الزوّار', 'analytics.m.views': 'مشاهدات الصفحة', 'analytics.m.taps': 'نقرات الموجات', 'analytics.m.conv': 'نسبة التحويل', 'analytics.m.film': 'شاهدوا نصف الفيلم',
      'analytics.d.fullDay': 'يوم {range} (يوم كامل)', 'analytics.c.fullDay': '، مقابل {v} يوم {range} (يوم كامل)',
      'analytics.c.up': '، بزيادة {amt} عن فترة {range}', 'analytics.c.down': '، بانخفاض {amt} عن فترة {range}', 'analytics.c.flat': '، وهو قريب من فترة {range}', 'analytics.c.new': '، ولم يُسجَّل شيء في فترة {range}',
      'analytics.sum.total': '{metric}: {v} {range}', 'analytics.sum.peak': '؛ أكثر الأيام نشاطاً {day} ({v})', 'analytics.sum.best': '؛ أفضل الأيام {day} ({v})',
      'analytics.sum.hourly': 'مشاهدات الصفحة حسب الساعة {range} بتوقيت الدوحة', 'analytics.sum.peakHour': '؛ الذروة عند {h} ({v})',
      'analytics.note.hourlyOnly': 'التفصيل بالساعة متاح لمشاهدات الصفحة فقط، لذا يعرضها الرسم.', 'analytics.note.weekly': 'كل نقطة تمثّل المتوسط اليومي لأسبوع.', 'analytics.note.today': 'الجزء المنقّط هو اليوم، ولم ينتهِ بعد.',
      'analytics.legend.publish': 'نُشر', 'analytics.pub.list': 'ما نُشر في هذه الفترة', 'analytics.pub.tip': 'الإصدار {num} نُشر {when}',
      'analytics.table': 'جدول', 'analytics.tableTip': 'اعرض الأرقام في جدول',
      'analytics.col.date': 'التاريخ', 'analytics.col.week': 'أسبوع يبدأ', 'analytics.col.hour': 'الساعة', 'analytics.col.change': 'التغيّر', 'analytics.col.visits': 'الزيارات', 'analytics.col.share': 'الحصة',
      'analytics.col.ofVisitors': 'من الزوّار', 'analytics.col.step': 'الخطوة', 'analytics.col.ofPrev': 'من الخطوة السابقة', 'analytics.col.section': 'القسم', 'analytics.col.reached': 'وصلوا',
      'analytics.col.day': 'اليوم', 'analytics.col.peak': 'ساعة الذروة', 'analytics.col.views': 'المشاهدات', 'analytics.col.swell': 'الموجة', 'analytics.col.taps': 'النقرات', 'analytics.col.question': 'السؤال',
      'analytics.col.opens': 'مرات الفتح', 'analytics.col.milestone': 'المرحلة', 'analytics.col.event': 'الحدث', 'analytics.col.when': 'يُرسل عندما', 'analytics.col.props': 'التفاصيل', 'analytics.col.previous': 'السابقة', 'analytics.col.here': 'سُجّل هنا',
      'analytics.bd.title': 'من أين يأتي الزوّار', 'analytics.bd.sources': 'المصادر', 'analytics.bd.countries': 'الدول', 'analytics.bd.languages': 'اللغات', 'analytics.bd.devices': 'الأجهزة',
      'analytics.bd.direct': 'مباشر أو غير معروف', 'analytics.bd.other': 'أخرى', 'analytics.bd.viewAll': 'عرض الكل', 'analytics.bd.sum': { one: 'يتصدّر {top} بنسبة {share} من زيارة واحدة.', two: 'يتصدّر {top} بنسبة {share} من زيارتين.', few: 'يتصدّر {top} بنسبة {share} من {total} زيارات.', many: 'يتصدّر {top} بنسبة {share} من {total} زيارة.', other: 'يتصدّر {top} بنسبة {share} من {total} زيارة.' },
      'analytics.bd.none': 'لا توجد بيانات لتفصيلها في هذه الفترة.', 'analytics.bd.export': 'تصدير CSV', 'analytics.bd.all': 'عدد الصفوف: {n}، {range}',
      'analytics.lang.en': 'الإنجليزية', 'analytics.lang.ar': 'العربية',
      'analytics.live.title': 'الآن', 'analytics.live.now': 'خلال آخر {n} دقائق · هذا المتصفح', 'analytics.live.updated': 'حُدّث {time} · كل {n} ثوانٍ',
      'analytics.live.quiet': 'هدوء الآن', 'analytics.live.quietText': 'تظهر هنا زيارات هذا المتصفح لحظة حدوثها.', 'analytics.live.feed': 'آخر النشاطات',
      'analytics.sw.title': 'نقرات الموجات', 'analytics.sw.edit': 'تعديل الموجات', 'analytics.sw.sum': 'نالت {top} أكثر النقرات: {share} من {total}.', 'analytics.sw.none': 'لم تُنقر أي موجة في هذه الفترة.',
      'analytics.reach.title': 'إلى أين يصل الزوّار في الصفحة', 'analytics.reach.sum': 'يصل {lastShare} من الزوّار إلى {last}، وأكبر تراجع بعد {after} ({drop}).',
      'analytics.reach.drop': 'أكبر تراجع', 'analytics.reach.noDrop': 'يصل {lastShare} من الزوّار إلى {last} دون أي تراجع في الطريق.', 'analytics.reach.dropAfter': 'أكبر تراجع: {drop} بعد {after}', 'analytics.reach.hidden': 'مخفي في الموقع', 'analytics.reach.pts': { one: '−{n} نقطة', two: '−{n} نقطة', few: '−{n} نقاط', many: '−{n} نقطة', other: '−{n} نقطة' }, 'analytics.reach.none': 'لم يصل أحد إلى أي قسم في هذه الفترة.',
      'analytics.fn.title': 'من الوصول إلى الطلب', 'analytics.fn.leak': 'أكبر تسرّب', 'analytics.fn.ofPrev': '{p} من السابقة', 'analytics.fn.left': 'غادر هنا {p}',
      'analytics.fn.sum': 'وصل {rate} من الزوّار إلى «{last}»، وأكبر تسرّب بين «{a}» و«{b}» حيث يغادر {lost}.',
      'analytics.fn.noLeak': 'وصل {rate} من الزوّار إلى «{last}»، ولم تفقد أي خطوة أحداً.',
      'analytics.film.title': 'الفيلم الافتتاحي', 'analytics.film.mark': 'وصلوا إلى {p}', 'analytics.film.sum': 'شاهد {half} من الزوّار أكثر من نصف الفيلم، وأكمله {done}.',
      'analytics.heat.title': 'متى يأتي الزوّار', 'analytics.heat.sum': 'الذروة يوم {day} نحو الساعة {hour}، وأهدأ الأيام {quiet} (بتوقيت الدوحة).', 'analytics.heat.none': 'لا مشاهدات في هذه الفترة.',
      'analytics.faq.title': 'الأسئلة التي فُتحت', 'analytics.faq.edit': 'تعديل الأسئلة', 'analytics.faq.sum': { one: 'أكثر سؤال فُتح: «{top}» (مرة واحدة).', two: 'أكثر سؤال فُتح: «{top}» (مرتين).', few: 'أكثر سؤال فُتح: «{top}» ({v} مرات).', many: 'أكثر سؤال فُتح: «{top}» ({v} مرة).', other: 'أكثر سؤال فُتح: «{top}» ({v} مرة).' }, 'analytics.faq.none': 'لم يفتح أحد سؤالاً في هذه الفترة.',
      'analytics.sv.title': 'الخدمات المضافة إلى الطلبات', 'analytics.sv.edit': 'تعديل الخدمات', 'analytics.sv.how': 'يضيف الزائر خدمة بالضغط على + بجانبها في قائمة الخدمات على الموقع، وتظهر كل إضافة هنا.', 'analytics.sv.sum': 'أكثر خدمة أُضيفت {range}: {top} ({v} من {total} إضافة).', 'analytics.sv.none': 'لم تُضف أي خدمة إلى طلب {range}.',
      'analytics.sv.noteSample': 'تُحتسب من الزيارات المسجّلة في هذا المتصفح. البيانات التجريبية لا تشمل اختيار الخدمات، لذا تعرض هذه البطاقة الاختيارات الحقيقية فقط.', 'analytics.sv.note': 'تُحتسب من الزيارات المسجّلة في هذا المتصفح.',
      'analytics.sv.briefs': 'طلبات هذه الفترة التي ذكرت خدمات: {n}', 'analytics.col.service': 'الخدمة', 'analytics.col.group': 'المجموعة', 'analytics.col.adds': 'الإضافات', 'analytics.col.inBriefs': 'في الطلبات',
      'analytics.ev.service': 'أضاف خدمة إلى الطلب أو أزالها', 'analytics.s.service': 'إضافات الخدمة · {v}',
      'analytics.mo.title': 'لحظات صغيرة', 'analytics.mo.lang': 'بدّلوا اللغة', 'analytics.mo.plan': 'أضافوا الخطة إلى الطلب', 'analytics.mo.copy': 'نسخوا الطلب', 'analytics.mo.words': 'التقطوا كلمة من «ما نصنعه»', 'analytics.mo.ofVisitors': '{p} من الزوّار',
      'analytics.cx.connected': 'مرتبط بـ{name}', 'analytics.cx.tracking': 'ما يتتبّعه الموقع', 'analytics.cx.siteId': 'معرّف الموقع',
      'analytics.cx.notText': 'لا ترى لوحة الإدارة الآن إلا هذا المتصفح. اختر Plausible أو GA4 أو Umami من الإعدادات، وسيرسل الموقع الأحداث نفسها إلى هناك من كل زائر.',
      'analytics.cx.open': 'افتح {name}', 'analytics.cx.notLive': 'لم يُفعَّل بعد: انشر التعديلات ليبدأ إرسال الأحداث.', 'analytics.cx.publish': 'راجع وانشر', 'analytics.cx.noId': 'أضف معرّف الموقع في الإعدادات لتصل الأحداث إلى {name}.',
      'analytics.cx.settings': 'افتح الإعدادات', 'analytics.cx.events': 'الأحداث المخصّصة التي يرسلها الموقع',
      'analytics.cx.hint.plausible': 'في Plausible، أضف كل حدث هدفاً مخصّصاً ليظهر في اللوحة.',
      'analytics.cx.hint.ga4': 'في GA4 تظهر ضمن التقارير › التفاعل › الأحداث، عادةً خلال يوم.',
      'analytics.cx.hint.umami': 'في Umami تظهر في تبويب الأحداث الخاص بالموقع.',
      'analytics.ev.view': 'فُتحت الصفحة (مع الموقع المُحيل)', 'analytics.ev.lang': 'بدّل الزائر بين الإنجليزية والعربية', 'analytics.ev.swell': 'نقر إحدى الموجات',
      'analytics.ev.plan_to_brief': 'أضاف الخطة إلى الطلب', 'analytics.ev.make': 'التقط كلمة من «ما نصنعه»',
      'analytics.ev.brief': 'فتح مسودة البريد أو أرسل الطلب', 'analytics.ev.brief_copy': 'نسخ نص الطلب', 'analytics.ev.faq': 'فتح سؤالاً',
      'analytics.ev.section': 'وصل إلى قسم', 'analytics.ev.journey': 'تجاوز الفيلم الافتتاحي {list}',
      'analytics.export': 'تصدير CSV', 'analytics.exported': { one: 'صُدّر ملف CSV ليوم واحد.', two: 'صُدّر ملف CSV ليومين.', few: 'صُدّر ملف CSV يضم {n} أيام.', many: 'صُدّر ملف CSV يضم {n} يوماً.', other: 'صُدّر ملف CSV يضم {n} يوم.' }, 'analytics.clear': 'مسح أحداث هذا المتصفح',
      'analytics.clear.title': 'مسح أحداث هذا المتصفح ({n})؟',
      'analytics.clear.text': 'سيُحذف سجلّ الزيارات الذي احتفظ به الموقع في هذا المتصفح، ولا يمكن التراجع عن ذلك. لا تتأثر البيانات التجريبية ولا خدمة التحليلات.',
      'analytics.clear.ok': 'امسح الأحداث', 'analytics.cleared': 'مُسحت أحداث هذا المتصفح.',
      'analytics.foot': 'الأوقات بتوقيت الدوحة ({gmt}). يبدأ اليوم وينتهي عند منتصف الليل بتوقيت قطر.',
      'analytics.k.range': 'التحليلات: {range}', 'analytics.k.prev': 'التحليلات: الفترة السابقة', 'analytics.k.next': 'التحليلات: الفترة التالية', 'analytics.k.compare': 'التحليلات: تشغيل المقارنة أو إيقافها',
      'analytics.s.item': { one: '{tab} · زيارة واحدة', two: '{tab} · زيارتان', few: '{tab} · {v} زيارات', many: '{tab} · {v} زيارة', other: '{tab} · {v} زيارة' }, 'analytics.s.swell': 'نقرات الموجات · {v}', 'analytics.s.section': 'الوصول إلى القسم · {p}', 'analytics.s.faq': 'مرات فتح السؤال · {v}',
    },
    fa: {
      'analytics.title': 'آمار',
      'analytics.sub': 'چه کسانی به mirasmarketing.com آمدند، روی چه چیزی زدند و کجا صفحه را رها کردند.',
      'analytics.metricsLabel': 'شاخص‌ها',
      'analytics.range.prev': 'بازهٔ قبلی', 'analytics.range.next': 'بازهٔ بعدی', 'analytics.range.pick': 'تغییر بازهٔ زمانی',
      'analytics.range.custom': 'بازهٔ دلخواه', 'analytics.range.from': 'از', 'analytics.range.to': 'تا', 'analytics.range.apply': 'نمایش این بازه',
      'analytics.range.tz': 'زمان‌ها به وقت دوحه ({gmt})', 'analytics.range.keys': '← → جابه‌جایی · X مقایسه',
      'analytics.range.badDates': 'تاریخ شروع باید پیش از تاریخ پایان یا همان روز باشد.', 'analytics.range.future': 'بازه نمی‌تواند بعد از امروز تمام شود.', 'analytics.range.tooLong': 'بازه‌ای حداکثر دوساله انتخاب کنید.',
      'analytics.compare': 'مقایسه', 'analytics.compareTip': 'مقایسه با بازهٔ قبلی (X)',
      'analytics.announce': 'در حال نمایش: {range}.', 'analytics.announce.cmpOn': 'مقایسه روشن شد.', 'analytics.announce.cmpOff': 'مقایسه خاموش شد.',
      'analytics.ph.1d': 'امروز تا این لحظه', 'analytics.ph.7d': 'در {n} روز گذشته', 'analytics.ph.30d': 'در {n} روز گذشته', 'analytics.ph.90d': 'در {n} روز گذشته',
      'analytics.ph.12m': 'در {n} ماه گذشته', 'analytics.ph.mtd': 'از ابتدای این ماه تا امروز', 'analytics.ph.ytd': 'از ابتدای امسال تا امروز', 'analytics.ph.on': 'در {d}', 'analytics.ph.in': 'در بازهٔ {d}',
      'analytics.src.sample.title': 'دادهٔ نمونه — سرویس آمار را وصل کنید تا بازدیدکنندگان واقعی را ببینید',
      'analytics.src.sample.text': 'این عددها ساختگی‌اند تا ببینید این صفحه چطور خوانده می‌شود. با هر بارگذاری ثابت می‌مانند و هر جا ظاهر شوند برچسب «نمونه» دارند.',
      'analytics.src.local.title': 'زنده از همین مرورگر',
      'analytics.src.local.text': 'این‌ها بازدیدهای خودتان از سایت در همین مرورگر است؛ تا وقتی پنل اینجا باز است، سایت گزارشی خصوصی نگه می‌دارد. بازدیدکنندگانِ دستگاه‌های دیگر پس از اتصال سرویس آمار، در همان سرویس دیده می‌شوند.',
      'analytics.src.mixed.title': 'دادهٔ نمونه به‌همراه بازدیدهای این مرورگر',
      'analytics.src.mixed.text': 'نمودارها عددهای نمونه را با {n} رویدادی که این مرورگر ثبت کرده جمع می‌زنند. دادهٔ نمونه را پنهان کنید تا فقط بازدیدهای خودتان را ببینید.',
      'analytics.src.connect': 'اتصال سرویس آمار', 'analytics.src.hideSample': 'پنهان کردن دادهٔ نمونه', 'analytics.src.showSample': 'نمایش دادهٔ نمونه',
      'analytics.src.hidden': 'دادهٔ نمونه پنهان شد.', 'analytics.src.shown': 'دادهٔ نمونه برگشت.', 'analytics.src.last': 'آخرین رویداد {ago} ثبت شد.',
      'analytics.none.title': 'در انتظار نخستین بازدید…',
      'analytics.none.text': 'سایت را در همین مرورگر باز کنید و کمی بگردید؛ بازدیدهایتان در چند ثانیه اینجا دیده می‌شود. برای شمارش بازدیدکنندگان واقعی، Plausible یا GA4 یا Umami را از «تنظیمات» وصل کنید.',
      'analytics.none.openSite': 'باز کردن سایت',
      'analytics.emptyRange.title': 'در این بازه چیزی نیست', 'analytics.emptyRange.text': 'هیچ بازدیدی {range} ثبت نشده است. بازهٔ بلندتری را امتحان کنید.', 'analytics.emptyRange.btn': 'نمایش {n} روز گذشته',
      'analytics.m.visitors': 'بازدیدکنندگان', 'analytics.m.views': 'بازدید صفحه', 'analytics.m.taps': 'انتخاب موج‌ها', 'analytics.m.conv': 'نرخ تبدیل', 'analytics.m.film': 'نیمی از فیلم را دیدند',
      'analytics.d.fullDay': 'در {range} (روز کامل)', 'analytics.c.fullDay': '، در برابر {v} در {range} (یک روز کامل)',
      'analytics.c.up': '، {amt} بیشتر از {range}', 'analytics.c.down': '، {amt} کمتر از {range}', 'analytics.c.flat': '، تقریباً برابر با {range}', 'analytics.c.new': '، در حالی که در {range} هیچ نبود',
      'analytics.sum.total': '{metric}: {v} {range}', 'analytics.sum.peak': '؛ پربازدیدترین روز {day} ({v})', 'analytics.sum.best': '؛ بهترین روز {day} ({v})',
      'analytics.sum.hourly': 'بازدید صفحه به تفکیک ساعت {range}، به وقت دوحه', 'analytics.sum.peakHour': '؛ اوج در ساعت {h} ({v})',
      'analytics.note.hourlyOnly': 'جزئیات ساعتی فقط برای بازدید صفحه هست، برای همین نمودار بازدید صفحه را نشان می‌دهد.', 'analytics.note.weekly': 'هر نقطه میانگین روزانهٔ یک هفته است.', 'analytics.note.today': 'بخش نقطه‌چین امروز است که هنوز تمام نشده.',
      'analytics.legend.publish': 'انتشار', 'analytics.pub.list': 'انتشارهای این بازه', 'analytics.pub.tip': 'نسخهٔ {num} در {when} منتشر شد',
      'analytics.table': 'جدول', 'analytics.tableTip': 'نمایش عددها به‌صورت جدول',
      'analytics.col.date': 'تاریخ', 'analytics.col.week': 'هفته از', 'analytics.col.hour': 'ساعت', 'analytics.col.change': 'تغییر', 'analytics.col.visits': 'بازدید', 'analytics.col.share': 'سهم',
      'analytics.col.ofVisitors': 'از بازدیدکنندگان', 'analytics.col.step': 'مرحله', 'analytics.col.ofPrev': 'از مرحلهٔ قبل', 'analytics.col.section': 'بخش', 'analytics.col.reached': 'رسیدند',
      'analytics.col.day': 'روز', 'analytics.col.peak': 'ساعت اوج', 'analytics.col.views': 'بازدید صفحه', 'analytics.col.swell': 'موج', 'analytics.col.taps': 'انتخاب', 'analytics.col.question': 'پرسش',
      'analytics.col.opens': 'دفعات باز شدن', 'analytics.col.milestone': 'مرحله', 'analytics.col.event': 'رویداد', 'analytics.col.when': 'فرستاده می‌شود وقتی', 'analytics.col.props': 'جزئیات', 'analytics.col.previous': 'قبلی', 'analytics.col.here': 'ثبت‌شده اینجا',
      'analytics.bd.title': 'بازدیدکنندگان از کجا می‌آیند', 'analytics.bd.sources': 'منبع‌ها', 'analytics.bd.countries': 'کشورها', 'analytics.bd.languages': 'زبان‌ها', 'analytics.bd.devices': 'دستگاه‌ها',
      'analytics.bd.direct': 'مستقیم یا نامشخص', 'analytics.bd.other': 'سایر', 'analytics.bd.viewAll': 'دیدن همه', 'analytics.bd.sum': '{top} با {share} از {total} بازدید در صدر است.',
      'analytics.bd.none': 'در این بازه چیزی برای تفکیک نیست.', 'analytics.bd.export': 'خروجی CSV', 'analytics.bd.all': '{n} ردیف {range}',
      'analytics.lang.en': 'انگلیسی', 'analytics.lang.ar': 'عربی',
      'analytics.live.title': 'همین حالا', 'analytics.live.now': 'در {n} دقیقهٔ گذشته · همین مرورگر', 'analytics.live.updated': 'به‌روزرسانی {time} · هر {n} ثانیه',
      'analytics.live.quiet': 'فعلاً آرام است', 'analytics.live.quietText': 'بازدیدهای این مرورگر همان لحظه اینجا دیده می‌شوند.', 'analytics.live.feed': 'آخرین فعالیت‌ها',
      'analytics.sw.title': 'انتخاب موج‌ها', 'analytics.sw.edit': 'ویرایش موج‌ها', 'analytics.sw.sum': '«{top}» بیشترین انتخاب را داشت: {share} از {total}.', 'analytics.sw.none': 'در این بازه هیچ موجی انتخاب نشد.',
      'analytics.reach.title': 'بازدیدکنندگان تا کجای صفحه پیش می‌روند', 'analytics.reach.sum': '{lastShare} از بازدیدکنندگان به «{last}» می‌رسند؛ بیشترین ریزش بعد از «{after}» است ({drop}).',
      'analytics.reach.drop': 'بیشترین ریزش', 'analytics.reach.noDrop': '{lastShare} از بازدیدکنندگان به «{last}» می‌رسند و در مسیر هیچ ریزشی نیست.', 'analytics.reach.dropAfter': 'بیشترین ریزش: {drop} بعد از «{after}»', 'analytics.reach.hidden': 'در سایت پنهان است', 'analytics.reach.pts': '−{n} واحد درصد', 'analytics.reach.none': 'در این بازه کسی به هیچ بخشی نرسید.',
      'analytics.fn.title': 'از ورود تا درخواست', 'analytics.fn.leak': 'بزرگ‌ترین نشت', 'analytics.fn.ofPrev': '{p} از مرحلهٔ قبل', 'analytics.fn.left': '{p} همین‌جا رفتند',
      'analytics.fn.sum': '{rate} از بازدیدکنندگان به «{last}» رسیدند؛ بزرگ‌ترین نشت از «{a}» به «{b}» است که {lost} در آن از دست می‌روند.',
      'analytics.fn.noLeak': '{rate} از بازدیدکنندگان به «{last}» رسیدند و هیچ مرحله‌ای کسی را از دست نداد.',
      'analytics.film.title': 'فیلم آغازین', 'analytics.film.mark': 'رسیدن به {p}', 'analytics.film.sum': '{half} از بازدیدکنندگان بیش از نیمی از فیلم را دیدند و {done} تا پایان تماشا کردند.',
      'analytics.heat.title': 'بازدیدکنندگان کِی می‌آیند', 'analytics.heat.sum': 'بیشترین بازدید {day}‌ها حدود ساعت {hour} است؛ {quiet} خلوت‌ترین روز است (به وقت دوحه).', 'analytics.heat.none': 'در این بازه بازدید صفحه‌ای ثبت نشد.',
      'analytics.faq.title': 'پرسش‌های بازشده', 'analytics.faq.edit': 'ویرایش پرسش‌ها', 'analytics.faq.sum': '«{top}» بیش از همه باز شده است ({v} بار).', 'analytics.faq.none': 'در این بازه کسی پرسشی را باز نکرد.',
      'analytics.sv.title': 'خدمت‌هایی که به درخواست افزوده شد', 'analytics.sv.edit': 'ویرایش خدمت‌ها', 'analytics.sv.how': 'بازدیدکننده با زدن + کنار هر خدمت در فهرست خدمت‌های سایت آن را می‌افزاید و هر افزودن این‌جا دیده می‌شود.', 'analytics.sv.sum': '«{top}» {range} بیش از همه افزوده شد: {v} از {total} بار.', 'analytics.sv.none': 'هیچ خدمتی {range} به درخواست افزوده نشد.',
      'analytics.sv.noteSample': 'از بازدیدهای ثبت‌شده در همین مرورگر شمرده می‌شود. دادهٔ نمونه انتخاب خدمت‌ها را ندارد، پس این کارت فقط انتخاب‌های واقعی را نشان می‌دهد.', 'analytics.sv.note': 'از بازدیدهای ثبت‌شده در همین مرورگر شمرده می‌شود.',
      'analytics.sv.briefs': 'درخواست‌های این بازه که خدمتی را نام بردند: {n}', 'analytics.col.service': 'خدمت', 'analytics.col.group': 'گروه', 'analytics.col.adds': 'دفعات افزودن', 'analytics.col.inBriefs': 'در درخواست‌ها',
      'analytics.ev.service': 'خدمتی را به درخواست افزود یا از آن برداشت', 'analytics.s.service': 'افزودن خدمت · {v}',
      'analytics.mo.title': 'لحظه‌های کوچک', 'analytics.mo.lang': 'زبان را عوض کردند', 'analytics.mo.plan': 'برنامه را به درخواست افزودند', 'analytics.mo.copy': 'متن درخواست را کپی کردند', 'analytics.mo.words': 'واژه‌ای را در «آنچه می‌سازیم» گرفتند', 'analytics.mo.ofVisitors': '{p} از بازدیدکنندگان',
      'analytics.cx.connected': 'متصل به {name}', 'analytics.cx.tracking': 'سایت چه چیزهایی را ثبت می‌کند', 'analytics.cx.siteId': 'شناسهٔ سایت',
      'analytics.cx.notText': 'فعلاً پنل فقط همین مرورگر را می‌بیند. در «تنظیمات» Plausible یا GA4 یا Umami را انتخاب کنید تا سایت همین رویدادها را از همهٔ بازدیدکنندگان به آنجا بفرستد.',
      'analytics.cx.open': 'باز کردن {name}', 'analytics.cx.notLive': 'هنوز فعال نیست: منتشر کنید تا ارسال رویدادها شروع شود.', 'analytics.cx.publish': 'بازبینی و انتشار', 'analytics.cx.noId': 'شناسهٔ سایت را در «تنظیمات» وارد کنید تا رویدادها به {name} برسند.',
      'analytics.cx.settings': 'باز کردن تنظیمات', 'analytics.cx.events': 'رویدادهای سفارشی‌ای که سایت می‌فرستد',
      'analytics.cx.hint.plausible': 'در Plausible هر رویداد را به‌عنوان هدف سفارشی (Custom event goal) اضافه کنید تا در داشبورد دیده شود.',
      'analytics.cx.hint.ga4': 'در GA4 این رویدادها معمولاً ظرف یک روز در Reports › Engagement › Events دیده می‌شوند.',
      'analytics.cx.hint.umami': 'در Umami این رویدادها در زبانهٔ Events همان وب‌سایت دیده می‌شوند.',
      'analytics.ev.view': 'صفحه باز شد (همراه با سایتِ ارجاع‌دهنده)', 'analytics.ev.lang': 'بین انگلیسی و عربی جابه‌جا شد', 'analytics.ev.swell': 'موجی را انتخاب کرد',
      'analytics.ev.plan_to_brief': 'برنامه را به درخواست افزود', 'analytics.ev.make': 'واژه‌ای را در «آنچه می‌سازیم» گرفت',
      'analytics.ev.brief': 'پیش‌نویس ایمیل را باز کرد یا درخواست را فرستاد', 'analytics.ev.brief_copy': 'متن درخواست را کپی کرد', 'analytics.ev.faq': 'پرسشی را باز کرد',
      'analytics.ev.section': 'به یکی از بخش‌ها رسید', 'analytics.ev.journey': 'فیلم آغازین از {list} گذشت',
      'analytics.export': 'خروجی CSV', 'analytics.exported': 'دادهٔ {n} روز در قالب CSV ذخیره شد.', 'analytics.clear': 'پاک کردن رویدادهای این مرورگر',
      'analytics.clear.title': '{n} رویداد از این مرورگر پاک شود؟',
      'analytics.clear.text': 'گزارش بازدیدی که سایت در این مرورگر نگه داشته پاک می‌شود و برگشت‌پذیر نیست. دادهٔ نمونه و سرویس آمار شما تغییری نمی‌کنند.',
      'analytics.clear.ok': 'پاک کردن رویدادها', 'analytics.cleared': 'رویدادهای این مرورگر پاک شد.',
      'analytics.foot': 'زمان‌ها به وقت دوحه ({gmt}). هر روز از نیمه‌شب تا نیمه‌شب به وقت قطر حساب می‌شود.',
      'analytics.k.range': 'آمار: {range}', 'analytics.k.prev': 'آمار: بازهٔ قبلی', 'analytics.k.next': 'آمار: بازهٔ بعدی', 'analytics.k.compare': 'آمار: روشن یا خاموش کردن مقایسه',
      'analytics.s.item': '{tab} · {v} بازدید', 'analytics.s.swell': 'انتخاب موج · {v}', 'analytics.s.section': 'رسیدن به بخش · {p}', 'analytics.s.faq': 'باز شدن پرسش · {v}',
    },
  });

  /* real visitors (a connected provider), the shared dashboard, and where briefs come from */
  MA.i18n.add({
    en: {
      'analytics.src.sample.titleOn': 'Sample data · real visitors are counted in {name}',
      'analytics.src.realIn': 'Real visitors, on every device, are counted in {name}.',
      'analytics.src.local.textOn': 'These are your own visits to the site from this browser. Real visitors, on every device, are counted in {name}.',
      'analytics.src.pending': '{name} starts counting once you publish.',
      'analytics.src.openDash': 'Open the {name} dashboard', 'analytics.src.settings': 'Analytics settings',
      'analytics.none.titleOn': 'Real visitors are counted in {name}',
      'analytics.none.textOn': 'This page shows the visits logged in this browser, and sample data when you turn it on. Every visitor, on every device, is counted in {name}.',
      'analytics.sh.title': 'Shared dashboard', 'analytics.sh.titleOf': '{name} dashboard', 'analytics.sh.frame': '{name}: shared dashboard', 'analytics.sh.real': 'Real data',
      'analytics.sh.note': 'Shown live from {host}. If it stays blank, {host} does not allow embedding here: open it in a new tab.',
      'analytics.sh.open': 'Open in a new tab', 'analytics.sh.add': 'Embed a shared dashboard', 'analytics.sh.change': 'Change link', 'analytics.sh.remove': 'Remove the embed',
      'analytics.sh.removed': 'Removed the shared dashboard.', 'analytics.sh.saved': 'The shared dashboard now shows on this page.', 'analytics.sh.prompt': 'Shared dashboard link',
      'analytics.sh.hint': 'Paste a share link from Plausible (Site settings › Visibility › Shared links), Umami (Website › Share URL) or Looker Studio for GA4 (Share › Embed report). It must start with https://.',
      'analytics.sh.bad': "That link can't be shown here. Use an https:// share link from your analytics service.",
      'analytics.reach.off': 'Hidden on the site, so not counted: {list}.',
      'analytics.at.title': 'Where briefs come from', 'analytics.at.sources': 'Sources', 'analytics.at.campaigns': 'Campaigns', 'analytics.at.inbox': 'Open inbox',
      'analytics.at.col.source': 'Source', 'analytics.at.col.campaign': 'Campaign', 'analytics.at.col.briefs': 'Briefs', 'analytics.at.col.open': 'Open pipeline', 'analytics.at.col.won': 'Won',
      'analytics.at.site': 'Website · {ch}', 'analytics.at.noCampaign': 'No campaign',
      'analytics.ch.instagram': 'Instagram', 'analytics.ch.linkedin': 'LinkedIn', 'analytics.ch.whatsapp': 'WhatsApp', 'analytics.ch.search': 'search', 'analytics.ch.email': 'email link',
      'analytics.ch.x': 'X', 'analytics.ch.social': 'social media', 'analytics.ch.referral': 'another website', 'analytics.ch.direct': 'direct',
      'analytics.at.sumWon': '{top} brought the most won value {range}: {v}.',
      'analytics.at.sumBriefs': '{top} brought the most briefs {range}: {n} of {total}.',
      'analytics.at.none': 'No briefs arrived {range}.',
      'analytics.at.note': 'Counts the briefs received {range}. Open pipeline and won value are what those briefs are worth now.',
      'analytics.at.noUtm': 'None of these briefs came from a tagged link. Add utm_source and utm_campaign to the links you share (for example ?utm_source=instagram&utm_campaign=ramadan) and each campaign shows up here.',
    },
    ar: {
      'analytics.src.sample.titleOn': 'بيانات تجريبية · يُحتسب الزوّار الحقيقيون في {name}',
      'analytics.src.realIn': 'يُحتسب الزوّار الحقيقيون، من كل الأجهزة، في {name}.',
      'analytics.src.local.textOn': 'هذه زياراتك للموقع من هذا المتصفح. أما الزوّار الحقيقيون، من كل الأجهزة، فيُحتسبون في {name}.',
      'analytics.src.pending': 'يبدأ {name} الإحصاء بعد النشر.',
      'analytics.src.openDash': 'افتح لوحة {name}', 'analytics.src.settings': 'إعدادات التحليلات',
      'analytics.none.titleOn': 'يُحتسب الزوّار الحقيقيون في {name}',
      'analytics.none.textOn': 'تعرض هذه الصفحة الزيارات المسجّلة في هذا المتصفح، والبيانات التجريبية إن فعّلتها. أما كل زائر، من أي جهاز، فيُحتسب في {name}.',
      'analytics.sh.title': 'لوحة مشتركة', 'analytics.sh.titleOf': 'لوحة {name}', 'analytics.sh.frame': '{name}: لوحة مشتركة', 'analytics.sh.real': 'بيانات حقيقية',
      'analytics.sh.note': 'تُعرض مباشرةً من {host}. إن بقيت فارغة فهذا يعني أن {host} لا يسمح بعرضها هنا، فافتحها في نافذة جديدة.',
      'analytics.sh.open': 'افتح في نافذة جديدة', 'analytics.sh.add': 'اعرض لوحة مشتركة هنا', 'analytics.sh.change': 'تغيير الرابط', 'analytics.sh.remove': 'إزالة اللوحة',
      'analytics.sh.removed': 'أُزيلت اللوحة المشتركة.', 'analytics.sh.saved': 'صارت اللوحة المشتركة تظهر في هذه الصفحة.', 'analytics.sh.prompt': 'رابط اللوحة المشتركة',
      'analytics.sh.hint': 'الصق رابط مشاركة من Plausible (إعدادات الموقع › الظهور › الروابط المشتركة) أو Umami (الموقع › رابط المشاركة) أو Looker Studio لـGA4 (مشاركة › تضمين التقرير). يجب أن يبدأ بـ https://.',
      'analytics.sh.bad': 'لا يمكن عرض هذا الرابط هنا. استخدم رابط مشاركة يبدأ بـ https:// من خدمة التحليلات.',
      'analytics.reach.off': 'مخفية في الموقع فلا تُحتسب: {list}.',
      'analytics.at.title': 'من أين تأتي الطلبات', 'analytics.at.sources': 'المصادر', 'analytics.at.campaigns': 'الحملات', 'analytics.at.inbox': 'افتح صندوق الطلبات',
      'analytics.at.col.source': 'المصدر', 'analytics.at.col.campaign': 'الحملة', 'analytics.at.col.briefs': 'الطلبات', 'analytics.at.col.open': 'قيمة المفتوح', 'analytics.at.col.won': 'قيمة المُوقَّع',
      'analytics.at.site': 'الموقع · {ch}', 'analytics.at.noCampaign': 'بلا حملة',
      'analytics.ch.instagram': 'إنستغرام', 'analytics.ch.linkedin': 'لينكدإن', 'analytics.ch.whatsapp': 'واتساب', 'analytics.ch.search': 'البحث', 'analytics.ch.email': 'رابط في بريد',
      'analytics.ch.x': 'X', 'analytics.ch.social': 'شبكات التواصل', 'analytics.ch.referral': 'موقع آخر', 'analytics.ch.direct': 'مباشر',
      'analytics.at.sumWon': 'جاءت أعلى قيمة مُوقَّعة {range} من {top}: {v}.',
      'analytics.at.sumBriefs': 'جاء أكثر الطلبات {range} من {top}: {n} من {total}.',
      'analytics.at.none': 'لم تصل طلبات {range}.',
      'analytics.at.note': 'تُحتسب الطلبات التي وصلت {range}، وقيمة المفتوح والمُوقَّع هي قيمة هذه الطلبات الآن.',
      'analytics.at.noUtm': 'لم يأتِ أي من هذه الطلبات من رابط موسوم. أضف utm_source وutm_campaign إلى الروابط التي تشاركها (مثل ?utm_source=instagram&utm_campaign=ramadan) لتظهر كل حملة هنا.',
    },
    fa: {
      'analytics.src.sample.titleOn': 'دادهٔ نمونه · بازدیدکنندگان واقعی در {name} شمرده می‌شوند',
      'analytics.src.realIn': 'بازدیدکنندگان واقعی، از همهٔ دستگاه‌ها، در {name} شمرده می‌شوند.',
      'analytics.src.local.textOn': 'این‌ها بازدیدهای خودتان از سایت در همین مرورگر است. بازدیدکنندگان واقعی، از همهٔ دستگاه‌ها، در {name} شمرده می‌شوند.',
      'analytics.src.pending': '{name} پس از انتشار شروع به شمارش می‌کند.',
      'analytics.src.openDash': 'باز کردن داشبورد {name}', 'analytics.src.settings': 'تنظیمات آمار',
      'analytics.none.titleOn': 'بازدیدکنندگان واقعی در {name} شمرده می‌شوند',
      'analytics.none.textOn': 'این صفحه بازدیدهای ثبت‌شده در همین مرورگر را نشان می‌دهد و اگر بخواهید دادهٔ نمونه را. هر بازدیدکننده، از هر دستگاهی، در {name} شمرده می‌شود.',
      'analytics.sh.title': 'داشبورد اشتراکی', 'analytics.sh.titleOf': 'داشبورد {name}', 'analytics.sh.frame': '{name}: داشبورد اشتراکی', 'analytics.sh.real': 'دادهٔ واقعی',
      'analytics.sh.note': 'به‌طور زنده از {host} نمایش داده می‌شود. اگر خالی ماند، {host} اجازهٔ نمایش در اینجا را نمی‌دهد؛ آن را در زبانهٔ تازه باز کنید.',
      'analytics.sh.open': 'باز کردن در زبانهٔ تازه', 'analytics.sh.add': 'نمایش یک داشبورد اشتراکی', 'analytics.sh.change': 'تغییر پیوند', 'analytics.sh.remove': 'برداشتن داشبورد',
      'analytics.sh.removed': 'داشبورد اشتراکی برداشته شد.', 'analytics.sh.saved': 'داشبورد اشتراکی حالا در این صفحه دیده می‌شود.', 'analytics.sh.prompt': 'پیوند داشبورد اشتراکی',
      'analytics.sh.hint': 'پیوند اشتراکی را از Plausible (Site settings › Visibility › Shared links)، Umami (Website › Share URL) یا Looker Studio برای GA4 (Share › Embed report) بچسبانید. باید با https:// شروع شود.',
      'analytics.sh.bad': 'این پیوند را نمی‌شود اینجا نشان داد. از یک پیوند اشتراکیِ https:// از سرویس آمار استفاده کنید.',
      'analytics.reach.off': 'در سایت پنهان است و شمرده نمی‌شود: {list}.',
      'analytics.at.title': 'درخواست‌ها از کجا می‌آیند', 'analytics.at.sources': 'منبع‌ها', 'analytics.at.campaigns': 'کمپین‌ها', 'analytics.at.inbox': 'باز کردن صندوق درخواست‌ها',
      'analytics.at.col.source': 'منبع', 'analytics.at.col.campaign': 'کمپین', 'analytics.at.col.briefs': 'درخواست‌ها', 'analytics.at.col.open': 'ارزش باز', 'analytics.at.col.won': 'ارزش قرارداد',
      'analytics.at.site': 'سایت · {ch}', 'analytics.at.noCampaign': 'بدون کمپین',
      'analytics.ch.instagram': 'اینستاگرام', 'analytics.ch.linkedin': 'لینکدین', 'analytics.ch.whatsapp': 'واتس‌اپ', 'analytics.ch.search': 'جست‌وجو', 'analytics.ch.email': 'پیوند ایمیل',
      'analytics.ch.x': 'X', 'analytics.ch.social': 'شبکه‌های اجتماعی', 'analytics.ch.referral': 'سایتی دیگر', 'analytics.ch.direct': 'مستقیم',
      'analytics.at.sumWon': 'بیشترین ارزش قرارداد {range} از «{top}» آمد: {v}.',
      'analytics.at.sumBriefs': 'بیشترین درخواست {range} از «{top}» آمد: {n} از {total}.',
      'analytics.at.none': 'هیچ درخواستی {range} نرسید.',
      'analytics.at.note': 'درخواست‌هایی که {range} رسیدند شمرده می‌شوند. ارزش باز و ارزش قرارداد، ارزشِ امروزِ همین درخواست‌هاست.',
      'analytics.at.noUtm': 'هیچ‌یک از این درخواست‌ها از پیوند برچسب‌دار نیامده‌اند. utm_source و utm_campaign را به پیوندهایی که هم‌رسانی می‌کنید بیفزایید (مثلاً ?utm_source=instagram&utm_campaign=nowruz) تا هر کمپین اینجا دیده شود.',
    },
  });

  /* ---------------- constants ---------------- */
  const KEY_PRESETS = [['d', '1d'], ['w', '7d'], ['t', '30d'], ['q', '90d'], ['y', '12m'], ['m', 'mtd']];
  const PRESET_ORDER = ['1d', '7d', '30d', '90d', '12m', 'mtd', 'ytd'];
  const PROVIDERS = { plausible: 'Plausible', ga4: 'GA4', umami: 'Umami' };
  const EVENTS = [['view', 'ref, utm'], ['lang', 'to'], ['swell', 'id, on'], ['plan_to_brief', 'n'], ['service', 'id, on'], ['make', 'id, w'], ['brief', 'waves, n'], ['brief_copy', ''], ['faq', 'i'], ['section', 'id'], ['journey', 'p']];
  const DEV_ICON = { mobile: 'mobile', tablet: 'tablet', desktop: 'monitor' };
  const evText = id => id === 'journey' ? T('ev.journey', { list: orList([25, 50, 75, 100].map(p => MA.pct(p / 100))) }) : T('ev.' + id);
  const sumObj = o => Object.values(o || {}).reduce((s, v) => s + (+v || 0), 0);

  const METRICS = [
    { id: 'visitors', label: () => T('m.visitors'), get: t => t.visitors },
    { id: 'views', label: () => T('m.views'), get: t => t.views },
    { id: 'taps', label: () => T('m.taps'), get: t => sumObj(t.picks) },
    { id: 'briefs', label: () => M().briefLabel(), get: t => t.briefs },
    { id: 'conv', label: () => T('m.conv'), get: t => M().conversion(t), rate: true },
    { id: 'film', label: () => T('m.film'), get: t => t.funnel.film50 },
  ];
  const METRIC = Object.fromEntries(METRICS.map(m => [m.id, m]));
  const fmtVal = (m, v) => m.rate ? MA.pct(v, 1) : MA.num(Math.round(v));

  /** Site copy exists in English and Arabic only: Arabic for an Arabic admin, English otherwise (Persian included). */
  const cl = () => MA.lang() === 'ar' ? 'ar' : 'en';
  const siteText = (o, k) => MA.strip(o?.[cl()]?.[k] || o?.en?.[k] || '');
  /** Isolate a name dropped into a sentence, so English copy keeps its punctuation inside Arabic or Persian text (FSI … PDI). */
  const iso = v => '\u2068' + v + '\u2069';
  /** Bar labels can be site copy in the other script: let each one pick its own direction. */
  const autoDir = (el, lang) => { el?.querySelectorAll?.('.b .truncate').forEach(x => { x.dir = 'auto'; if (lang) x.lang = lang; }); return el; };
  const countryName = code => {
    if (code === 'other') return T('bd.other');
    try { return new Intl.DisplayNames([MA.lang()], { type: 'region' }).of(code) || code; } catch (e) { return code; }
  };
  const TABS = [
    { id: 'sources', label: () => T('bd.sources'), key: 'ref', name: k => k === 'direct' || !k ? T('bd.direct') : k },
    { id: 'countries', label: () => T('bd.countries'), key: 'country', name: countryName },
    { id: 'languages', label: () => T('bd.languages'), key: 'lang', name: k => (k === 'en' || k === 'ar') ? T('lang.' + k) : k },
    { id: 'devices', label: () => T('bd.devices'), key: 'device', name: k => DEV_ICON[k] ? MA.t(k) : k, icon: k => DEV_ICON[k] },
  ];
  const TAB = Object.fromEntries(TABS.map(t => [t.id, t]));
  const itemsOf = (tab, cur, prev) => Object.entries(cur?.[tab.key] || {}).filter(([, v]) => v > 0)
    .map(([k, v]) => ({ k, label: tab.name(k), v, pv: prev?.[tab.key]?.[k] || 0, icon: tab.icon?.(k) })).sort((a, b) => b.v - a.v);

  /* ---------------- dates (Qatar days, 'YYYY-MM-DD') ---------------- */
  const today = () => MA.qDay(Date.now());
  const noon = ds => Date.parse(ds + 'T12:00:00Z');
  const addDays = (ds, k) => MA.qDay(noon(ds) + k * DAY);
  const daysBetween = (a, b) => Math.round((noon(b) - noon(a)) / DAY);
  const validDs = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
  const fmtDay = ds => MA.date(ds + 'T12:00:00Z', { day: 'numeric', month: 'short' });
  const fmtDayLong = ds => MA.date(ds + 'T12:00:00Z', { weekday: 'short', day: 'numeric', month: 'short' });
  const hh = h => MA.num(h, { minimumIntegerDigits: 2 }) + ':' + MA.num(0, { minimumIntegerDigits: 2 });
  const weekdays = style => Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(MA.locale(), { weekday: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + i)))); // 1 Jan 2023 was a Sunday
  const andList = items => { try { return new Intl.ListFormat(MA.locale(), { type: 'conjunction' }).format(items); } catch (e) { return items.join(', '); } };
  const orList = items => { try { return new Intl.ListFormat(MA.locale(), { type: 'disjunction' }).format(items); } catch (e) { return items.join(' / '); } };
  /* Months and years follow the calendar chosen in Customize (Gregorian, Solar Hijri or Hijri): MA.metrics.calStart finds day 1. */
  const calStart = (ds, unit) => M().calStart(ds, unit);
  /** Last day of the month or year containing ds, in the chosen calendar (no month is longer than 31 days, no year than 366). */
  const calEnd = (ds, unit) => addDays(calStart(addDays(calStart(ds, unit), unit === 'year' ? 370 : 32), unit), -1);
  const isWhole = (from, to, unit) => from === calStart(from, unit) && to === calEnd(from, unit);
  /** "October 2026" / "مهر ۱۴۰۵": the month name first, in every language and calendar. */
  function monthYear(ds) {
    const parts = new Intl.DateTimeFormat(MA.locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).formatToParts(new Date(ds + 'T12:00:00Z'));
    const m = parts.find(p => p.type === 'month')?.value, y = parts.filter(p => p.type === 'year' || p.type === 'era').map(p => p.value).join(' ');
    return m && y ? `${m} ${y}` : MA.date(ds + 'T12:00:00Z', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  /** "GMT+3" in the admin's digits. */
  const gmt = () => 'GMT+' + MA.num(3);

  function rangeText(from, to) {
    const y = today().slice(0, 4), o = from.slice(0, 4) !== y || to.slice(0, 4) !== y ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' };
    if (from === to) return MA.date(from + 'T12:00:00Z', { weekday: 'short', ...o });
    if (isWhole(from, to, 'month')) return monthYear(from);
    return `${MA.date(from + 'T12:00:00Z', o)} – ${MA.date(to + 'T12:00:00Z', o)}`;
  }
  const rangeName = R => typeof R.key === 'string' ? MA.L(M().RANGES[R.key]) : rangeText(R.from, R.to);
  const rangePhrase = R => typeof R.key === 'string' ? T('ph.' + R.key, { n: MA.num(R.key === '12m' ? 12 : M().RANGES[R.key]?.days || R.n) }) : T(R.from === R.to ? 'ph.on' : 'ph.in', { d: rangeText(R.from, R.to) });
  const presetDays = k => k === 'mtd' || k === 'ytd' ? null : M().RANGES[k]?.days;

  /** A stored range → a preset key or a clean {from, to}. A custom range that ends today and matches a preset becomes that preset. */
  function normRange(r, prefer = 'day') {
    if (typeof r === 'string') return M().RANGES[r] ? r : '30d';
    if (!r || !validDs(r.from) || !validDs(r.to)) return '30d';
    let { from, to } = r; const t = today();
    if (from > to) [from, to] = [to, from];
    if (to > t) to = t;
    if (from > to) from = to;
    if (to === t) {
      const n = daysBetween(from, to) + 1, monthStart = calStart(t, 'month'), yearStart = calStart(t, 'year');
      const preset = Object.keys(M().RANGES).find(k => presetDays(k) === n);
      if (prefer !== 'day' && from === monthStart) return 'mtd';
      if (prefer !== 'day' && from === yearStart) return 'ytd';
      if (preset) return preset;
      if (from === monthStart) return 'mtd';
      if (from === yearStart) return 'ytd';
    }
    return { from, to };
  }
  const calUnit = R => {
    if (R.key === 'mtd' || (R.from !== R.to && isWhole(R.from, R.to, 'month'))) return 'month';
    if (R.key === 'ytd' || (R.from !== R.to && isWhole(R.from, R.to, 'year'))) return 'year';
    return 'day';
  };

  /* ---------------- state ---------------- */
  const S = { range: '30d', compare: true, metric: 'visitors', tab: 'sources', attr: 'sources', tables: {} };
  function loadState() {
    const v = MA.db.get('analytics.view', {}) || {};
    S.compare = v.compare !== false;
    S.metric = METRIC[v.metric] ? v.metric : 'visitors';
    S.tab = TAB[v.tab] ? v.tab : 'sources';
    S.attr = v.attr === 'campaigns' ? 'campaigns' : 'sources';
    S.range = normRange(MA.prefs.get('dateRange'));
  }
  const saveState = () => MA.db.set('analytics.view', { compare: S.compare, metric: S.metric, tab: S.tab, attr: S.attr });
  const sigOf = () => JSON.stringify([normRange(MA.prefs.get('dateRange')), !!MA.prefs.get('sampleData')]);

  let ver = 0, cache = null;
  const period = (range = S.range) => {
    const key = JSON.stringify([range, M().sampleOn(), ver, today(), M().hasLocal(), M().sectionOrder().join()]); // sample reach follows the site's sections
    if (cache?.key !== key || Date.now() - cache.at > 60e3) cache = { key, at: Date.now(), P: M().period(range) };
    return cache.P;
  };
  const localEvents = () => { try { const v = JSON.parse(localStorage.getItem('miras.events') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const localCount = () => localEvents().length;
  const lastLocalAt = () => localEvents().reduce((m, e) => Math.max(m, +e?.t || 0), 0);
  /** Section label (the core's group names: 'Selected work', 'Services'…); sections the site adds later fall back to a readable id. */
  const secLabel = id => { if (MA.content.groupName) return MA.content.groupName(id); const k = 'sec.' + id, v = MA.t(k); return v === k ? String(id).replace(/[-_]/g, ' ').replace(/^./, c => c.toUpperCase()) : v; };
  /** Money in the admin's language. Persian names the currency in words (۱۵۰٬۰۰۰ ریال قطر) instead of a Latin code next to Persian digits. */
  const money = n => MA.lang() === 'fa' ? MA.num(n, { style: 'currency', currency: 'QAR', currencyDisplay: 'name', maximumFractionDigits: 0 }) : MA.money(n);
  const canOpen = id => { const m = MA.modules().find(x => x.id === id); return !!m && (!m.perm || MA.can(m.perm)); };

  /* ---------------- deltas: one grammar for the whole admin (MA.ui.delta) ---------------- */
  /** True while the range is just today: the day isn't over, so a % change against a full day would mislead. */
  let partialDay = false;
  /** MA.ui.delta.info plus `clause`, the same change written into a summary sentence (", up 12% on 13 Aug – 11 Sep"). */
  function deltaInfo(m, cur, prev, pr) {
    const range = rangeText(pr.from, pr.to);
    if (partialDay) { const v = m ? fmtVal(m, prev) : MA.num(prev), vs = T('d.fullDay', { range }); return { dir: 'flat', tone: '', amt: v, vs, text: `${v} ${vs}`, clause: T('c.fullDay', { v, range }) }; }
    const d = MA.ui.delta.info(cur, prev, { label: range, rate: !!m?.rate });
    if (d.dir === 'flat') return { ...d, clause: T('c.flat', { range }) };
    if (d.dir === 'new') return { ...d, clause: T('c.new', { range }) };
    const diff = Math.abs(cur - prev), pts = Math.round(diff * 1000) / 10;
    const amt = m?.rate ? MA.t('d.pts', { count: pts, n: MA.num(pts, { maximumFractionDigits: 1 }) }) : cur < 10 && prev < 10 ? MA.num(diff) : MA.pct(diff / prev);
    return { ...d, clause: T(d.dir === 'up' ? 'c.up' : 'c.down', { amt, range }) };
  }
  /** The change under a headline number: MA.ui.delta, or today's plain "against a full day" figure. */
  function deltaEl(m, cur, prev, pr) {
    if (partialDay) { const d = deltaInfo(m, cur, prev, pr); return MA.h('span.delta.flat.an-delta', { title: d.text }, MA.h('b', d.amt), ' ', MA.h('span.vs', d.vs)); }
    const el = MA.ui.delta(cur, prev, { label: rangeText(pr.from, pr.to), rate: !!m?.rate });
    el.classList.add('an-delta');
    return el;
  }
  /** Short change cell for tables: ▲ 12% · ▼ 3 more · ≈ flat · New (MA.ui.delta without the "vs" part; the column head names the period). */
  function chg(cur, prev, { rate } = {}) {
    if (partialDay) return MA.h('span.delta.flat.an-chg', { title: T('d.fullDay', { range: rangeText(M().range(S.range).prev.from, M().range(S.range).prev.to) }) }, rate ? MA.pct(prev, 1) : MA.num(prev));
    const el = MA.ui.delta(cur, prev, { rate, short: true, label: rangeText(M().range(S.range).prev.from, M().range(S.range).prev.to) });
    el.classList.add('an-chg');
    return el;
  }

  /* ---------------- small builders ---------------- */
  /** cols: [{k, label, get(row) → Node|string, num}] */
  function tableEl(cols, rows, { sort, onSort } = {}) {
    const head = MA.h('tr', cols.map(c => {
      const th = MA.h('th', { scope: 'col', class: c.num ? 'num-col' : '', dataset: { k: c.k || '' } });
      if (onSort) {
        const on = sort?.k === c.k;
        th.setAttribute('aria-sort', on ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none');
        th.append(MA.h('button', { type: 'button', onclick: () => onSort(c.k), html: esc(c.label) + (on ? MA.icon(sort.dir > 0 ? 'chevUp' : 'chevDown', 'sm') : '') }));
      } else th.textContent = c.label;
      return th;
    }));
    const body = MA.h('tbody', rows.map(r => MA.h('tr', cols.map(c => { const v = c.get(r); return MA.h('td', { class: c.num ? 'num-col num' : '' }, v instanceof Node ? v : c.num ? String(v ?? '') : MA.h('bdi', String(v ?? ''))); }))));
    return MA.h('div.table-wrap', MA.h('table.table', MA.h('thead', head), body));
  }
  function tableBtn(id) {
    const on = !!S.tables[id];
    const b = MA.h('button', { type: 'button', class: 'btn sm ghost an-tbtn', 'aria-pressed': String(on), title: T('tableTip'), dataset: { fk: 'tbl-' + id }, html: MA.icon('list', 'sm') + `<span>${esc(T('table'))}</span>` });
    b.addEventListener('click', () => {
      const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); S.tables[id] = v;
      b.closest('[data-card]')?.querySelector('.an-fig')?._toggle?.(v);
    });
    return b;
  }
  /** <figure>: one-sentence summary first, then the chart (or the table, lazily built). */
  function figure(id, { summary, viz, table, note, tools }) {
    const on = !!S.tables[id] && !!table;
    const vizBox = MA.h('div.an-viz', { hidden: on }, viz), tblBox = MA.h('div.an-tbl', { hidden: !on }, on ? table() : null);
    const fig = MA.h('figure.an-fig', MA.h('figcaption.an-cap', summary), tools || null, vizBox, table ? tblBox : null, note ? MA.h('p.an-note', note) : null);
    fig._toggle = v => { vizBox.hidden = v; tblBox.hidden = !v; if (v && !tblBox.firstChild && table) tblBox.append(table()); };
    return fig;
  }
  function card(id, { title, sample, extra = [], table = true, cls = '' }, ...body) {
    return MA.h('section', { class: ('card an-card ' + cls).trim(), dataset: { card: id } },
      MA.h('div.card-head', MA.h('h2.h3', title), sample ? MA.ui.sample() : null, ...extra, table ? tableBtn(id) : null),
      MA.h('div.card-body', body));
  }
  const linkBtn = (id, label) => canOpen(id) ? MA.h('a.btn.sm.ghost.an-link', { href: '#/' + id, html: `<span>${esc(label)}</span>` + MA.icon('arrowRight', 'sm flip') }) : null;
  const callout = (tone, text, ...kids) => MA.h('div', { class: ('callout ' + tone).trim() }, MA.iconEl(tone === 'warn' ? 'warn' : 'info'), MA.h('div.grow', MA.h('span', text), ...kids));

  /* ---------------- mount ---------------- */
  let root = null, wrap = null, liveEl = null, liveRefresh = null, sig = '';

  function draw() {
    if (!root?.isConnected) return;
    const fk = document.activeElement?.closest?.('[data-fk]')?.dataset.fk, y = scrollY;
    wrap.innerHTML = '';
    const src = M().source(), sample = src === 'sample' || src === 'mixed';
    wrap.append(head(src));
    const pv = provider();
    if (src === 'none') {
      const e = pv ? { title: esc(T('none.titleOn', { name: pv.name })), text: esc(T('none.textOn', { name: pv.name }) + (pv.live ? '' : ' ' + T('src.pending', { name: pv.name }))) }
        : { title: esc(T('none.title')), text: esc(T('none.text')) };
      wrap.append(MA.h('div.card.an-none', { dataset: { provider: pv?.provider || '' } }, MA.ui.empty({ ...e, pose: 'arrive', actions: noneActions(pv) })), ...[sharedCard(), attrCard(period())].filter(Boolean), connectionCard(), foot());
      return restore(fk, y);
    }
    wrap.append(banner(src, pv));
    const shared = sharedCard(); if (shared) wrap.append(shared);
    const P = period();
    partialDay = P.R.n === 1 && P.R.to === today();
    if (!P.cur.visitors && !P.cur.views) {
      wrap.append(MA.h('div.card.an-none', MA.ui.empty({ title: esc(T('emptyRange.title')), text: esc(T('emptyRange.text', { range: rangePhrase(P.R) })), icon: 'calendar', compact: true,
        actions: [MA.ui.btn(T('emptyRange.btn', { n: MA.num(90) }), { kind: 'primary', onclick: () => setRange('90d') })] })), MA.h('div.an-row', liveCard(), connectionCard()), foot());
      return restore(fk, y);
    }
    const main = mainCard(P, sample);
    wrap.append(main);
    main._fill();
    wrap.append(
      MA.h('div.an-row', breakdownCard(P, sample), liveCard()),
      MA.h('div.an-row.even', reachCard(P, sample), funnelCard(P, sample)),
      ...[attrCard(P)].filter(Boolean),
      MA.h('div.an-row', swellsCard(P, sample), momentsCard(P, sample)),
      MA.h('div.an-row', heatCard(P, sample), filmCard(P, sample)),
      MA.h('div.an-row.even', faqCard(P, sample), servicesCard(P)),
      connectionCard(), foot());
    restore(fk, y);
  }
  function restore(fk, y) {
    if (Math.abs(scrollY - y) > 1) scrollTo(0, y);
    if (fk) wrap.querySelector(`[data-fk="${fk}"]`)?.focus({ preventScroll: true });
  }
  const redrawSoon = MA.debounce(() => draw(), 250);
  const announce = msg => { if (liveEl) { liveEl.textContent = ''; setTimeout(() => { if (liveEl) liveEl.textContent = msg; }, 30); } };

  /* ---------------- header: title, range control, compare, export ---------------- */
  function head(src) {
    const actions = [];
    if (src !== 'none') {
      const R = M().range(S.range), t = today();
      const prev = MA.ui.iconBtn('chevLeft', { tip: T('range.prev'), onclick: () => step(-1) });
      const next = MA.ui.iconBtn('chevRight', { tip: T('range.next'), onclick: () => step(1) });
      prev.querySelector('svg').classList.add('flip'); next.querySelector('svg').classList.add('flip');
      prev.dataset.fk = 'prev'; next.dataset.fk = 'next'; next.disabled = R.to >= t;
      const isPreset = typeof R.key === 'string';
      const btn = MA.h('button.an-range-btn', { type: 'button', 'aria-haspopup': 'dialog', 'aria-label': `${T('range.pick')}: ${rangeName(R)}`, dataset: { fk: 'range' }, onclick: e => openPicker(e.currentTarget) },
        MA.iconEl('calendar', 'sm'), MA.h('b', rangeName(R)), isPreset ? MA.h('span.d', rangeText(R.from, R.to)) : null, MA.iconEl('chevDown', 'sm'));
      actions.push(MA.h('div.an-range', prev, btn, next));
      const sw = MA.ui.switch(S.compare, v => setCompare(v), esc(T('compare')));
      sw.classList.add('an-cmp'); sw.title = T('compareTip'); sw.querySelector('input').dataset.fk = 'cmp';
      actions.push(sw);
      const ex = MA.ui.btn(T('export'), { icon: 'download', title: T('export'), onclick: () => exportCSV() }); ex.classList.add('an-export'); ex.setAttribute('aria-label', T('export'));
      actions.push(ex);
    }
    const more = MA.ui.iconBtn('more', { tip: MA.t('more'), onclick: e => moreMenu(e.currentTarget) }); more.dataset.fk = 'more'; more.classList.add('an-more');
    actions.push(more);
    return MA.ui.pageHead({ title: esc(T('title')), sub: esc(T('sub')), actions });
  }
  function moreMenu(anchor) {
    const canSet = MA.can('settings.edit') && canOpen('settings'), pv = provider();
    const items = [];
    if (M().source() !== 'none') items.push({ label: T('export'), icon: 'download', run: () => exportCSV() });
    items.push(M().sampleOn() ? { label: T('src.hideSample'), icon: 'eyeOff', run: () => setSample(false) } : { label: T('src.showSample'), icon: 'eye', run: () => setSample(true) });
    if (pv) items.push({ label: T('src.openDash', { name: pv.name }), icon: 'external', run: () => open(pv.url, '_blank', 'noopener,noreferrer') });
    if (canSet) items.push({ label: T(pv ? 'src.settings' : 'src.connect'), icon: 'settings', run: () => MA.go('#/settings') });
    items.push('-', { label: MA.t('shortcuts'), icon: 'keyboard', meta: '<kbd>?</kbd>', run: () => MA.showShortcuts?.() });
    if (M().hasLocal() && MA.can('settings.edit')) items.push('-', { label: T('clear'), icon: 'trash', danger: true, run: () => clearEvents() });
    MA.ui.menu(anchor, items, { align: 'end' });
  }
  /** "Open the Plausible dashboard": a real link (new tab), never a "connect" nudge once a provider is set up. */
  const dashBtn = (pv, { size = 'sm', primary = false } = {}) => MA.h('a', { class: `btn${size ? ' ' + size : ''}${primary ? ' primary' : ''} an-dash`, href: pv.url, target: '_blank', rel: 'noopener noreferrer',
    html: MA.icon('external', 'sm') + `<span>${esc(T('src.openDash', { name: pv.name }))}</span>` });
  function noneActions(pv) {
    const site = MA.h('a', { class: 'btn' + (pv ? '' : ' primary'), href: MA.site.url, target: '_blank', rel: 'noopener', html: MA.icon('external') + `<span>${esc(T('none.openSite'))}</span>` });
    const a = pv ? [dashBtn(pv, { size: '', primary: true }), site] : [site];
    if (!pv && MA.can('settings.edit') && canOpen('settings')) a.push(MA.ui.btn(T('src.connect'), { icon: 'settings', onclick: () => MA.go('#/settings') }));
    a.push(MA.ui.btn(T('src.showSample'), { kind: 'ghost', onclick: () => setSample(true) }));
    return a;
  }
  /** Where the numbers on this page come from. With a provider connected it says where real visitors are counted (and links there);
      without one it offers to connect. Sample data is always named as such. */
  function banner(src, pv = provider()) {
    const canSet = MA.can('settings.edit') && canOpen('settings');
    const btns = [];
    if (pv) btns.push(dashBtn(pv));
    else if (canSet) btns.push(MA.ui.btn(T('src.connect'), { size: 'sm', icon: 'settings', onclick: () => MA.go('#/settings') }));
    if (src !== 'local') btns.push(MA.ui.btn(T('src.hideSample'), { size: 'sm', kind: 'ghost', onclick: () => setSample(false) }));
    const n = localCount();
    let title = T(`src.${src}.title`), text = src === 'mixed' ? T('src.mixed.text', { n }) : T(`src.${src}.text`);
    if (pv) {
      if (src === 'sample') title = T('src.sample.titleOn', { name: pv.name });
      text = src === 'local' ? T('src.local.textOn', { name: pv.name }) : `${text} ${T('src.realIn', { name: pv.name })}`;
      if (!pv.live) text += ' ' + T('src.pending', { name: pv.name });
    }
    const last = src === 'sample' ? 0 : lastLocalAt();
    if (last) text += ' ' + T('src.last', { ago: MA.ago(last) });
    return MA.h('div', { class: 'an-banner ' + (src === 'local' ? 'local' : 'hatched'), role: 'note', dataset: { src, provider: pv?.provider || '' } },
      MA.iconEl(src === 'local' ? 'bolt' : 'info'), MA.h('div.txt', MA.h('b', title), MA.h('p', text)), btns.length ? MA.h('div.btn-row', btns) : null);
  }
  function foot() {
    return MA.h('p.an-foot', MA.h('span', { html: MA.icon('clock', 'sm') + esc(T('foot', { gmt: gmt() })) }),
      MA.h('span.keys', { html: [...KEY_PRESETS.map(([k]) => k), '←', '→', 'x'].map(k => `<kbd>${esc(k.toUpperCase())}</kbd>`).join('') }));
  }

  /* ---------------- range picker ---------------- */
  function openPicker(anchor) {
    const R = M().range(S.range), t = today();
    const presets = MA.h('div.an-presets', { role: 'group', 'aria-label': T('range.pick') });
    let L;
    PRESET_ORDER.forEach(k => {
      const key = KEY_PRESETS.find(([, r]) => r === k)?.[0];
      presets.append(MA.h('button.menu-item', { type: 'button', role: 'menuitemradio', 'aria-checked': String(S.range === k), dataset: { range: k },
        onclick: () => { L.close(); setRange(k); }, html: `<span>${esc(MA.L(M().RANGES[k]))}</span>` + (key ? `<span class="meta"><kbd>${key.toUpperCase()}</kbd></span>` : '') }));
    });
    const from = MA.h('input.input.sm', { type: 'date', value: R.from, max: t, name: 'from', required: true });
    const to = MA.h('input.input.sm', { type: 'date', value: R.to, max: t, name: 'to', required: true });
    const err = MA.h('p.an-err', { role: 'alert', hidden: true });
    const fail = msg => { err.textContent = msg; err.hidden = false; };
    const form = MA.h('form.an-custom', { novalidate: true, onsubmit: e => {
      e.preventDefault();
      const f = from.value, tt = to.value;
      if (!validDs(f) || !validDs(tt) || f > tt) return fail(T('range.badDates'));
      if (tt > t) return fail(T('range.future'));
      if (daysBetween(f, tt) > 730) return fail(T('range.tooLong'));
      L.close(); setRange({ from: f, to: tt });
    } },
      MA.h('p.label', T('range.custom')),
      MA.h('div.an-dates', MA.h('label', MA.h('span', T('range.from')), from), MA.h('label', MA.h('span', T('range.to')), to)),
      err, MA.h('button.btn.sm.primary', { type: 'submit' }, T('range.apply')));
    const footEl = MA.h('div.an-pick-foot', MA.h('span', { html: MA.icon('clock', 'sm') + esc(T('range.tz', { gmt: gmt() })) }), MA.h('span.k', T('range.keys')));
    L = MA.ui.pop(anchor, MA.h('div.an-picker', presets, MA.h('div.menu-sep'), form, footEl), { width: 300 });
    (presets.querySelector('[aria-checked=true]') || presets.firstElementChild)?.focus({ preventScroll: true });
  }

  function setRange(r, prefer) {
    S.range = normRange(r, prefer);
    MA.prefs.set('dateRange', S.range);
    sig = sigOf();
    draw();
    announce(T('announce', { range: rangeName(M().range(S.range)) }));
  }
  /** dir: -1 previous period, +1 next. Months and years step by the chosen calendar's months and years; everything else by the range length. */
  function step(dir) {
    const R = M().range(S.range), t = today();
    if (dir > 0 && R.to >= t) return;
    const unit = calUnit(R);
    let from, to;
    if (unit === 'month' || unit === 'year') { from = dir < 0 ? calStart(addDays(R.from, -1), unit) : addDays(calEnd(R.from, unit), 1); to = calEnd(from, unit); }
    else { from = addDays(R.from, dir * R.n); to = addDays(R.to, dir * R.n); }
    if (to >= t) { to = t; if (unit === 'day') from = addDays(t, -(R.n - 1)); }
    setRange({ from, to }, unit);
  }
  function setCompare(v) {
    S.compare = !!v; saveState(); draw();
    announce(T(S.compare ? 'announce.cmpOn' : 'announce.cmpOff'));
  }
  function setMetric(id) {
    if (!METRIC[id]) return;
    S.metric = id; saveState();
    try { MA.setQuery({ metric: id === 'visitors' ? null : id }); } catch (e) {}
    const main = wrap?.querySelector('.an-main'); if (!main) return;
    MA.$$('.an-tab', main).forEach(b => { const on = b.dataset.metric === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    main._fill?.();
  }
  function setSample(v) {
    const was = !!MA.prefs.get('sampleData');
    MA.prefs.set('sampleData', v); MA.emit('sample'); MA.renderNav?.();
    MA.toast(T(v ? 'src.shown' : 'src.hidden'), { undo: () => { MA.prefs.set('sampleData', was); MA.emit('sample'); MA.renderNav?.(); } });
  }
  /** Arrow keys inside a tablist move between tabs (mirrored in RTL) and never reach the range shortcuts. */
  function tabKeys(e, list, sel, activate) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const items = MA.$$(sel, list), i = items.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); e.stopPropagation();
    const fwd = (e.key === 'ArrowRight') !== (document.dir === 'rtl');
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (fwd ? 1 : -1) + items.length) % items.length;
    activate(items[j]);
  }

  /* ---------------- main card: metric strip + chart ---------------- */
  function mainCard(P, sample) {
    const strip = MA.h('div.an-strip', { role: 'tablist', 'aria-label': T('metricsLabel') });
    for (const m of METRICS) {
      const cur = m.get(P.cur), sel = m.id === S.metric;
      strip.append(MA.h('button.an-tab', { type: 'button', role: 'tab', id: 'an-tab-' + m.id, 'aria-selected': String(sel), 'aria-controls': 'an-main-panel', tabindex: sel ? '0' : '-1', dataset: { metric: m.id, fk: 'tab-' + m.id }, onclick: () => setMetric(m.id) },
        MA.h('span.an-tab-l', m.label()), MA.h('span.an-tab-v.num', fmtVal(m, cur)), S.compare ? deltaEl(m, cur, m.get(P.prev), P.R.prev) : null));
    }
    strip.addEventListener('keydown', e => tabKeys(e, strip, '.an-tab', b => { b.focus(); setMetric(b.dataset.metric); }));
    const body = MA.h('div.an-main-body', { id: 'an-main-panel', role: 'tabpanel' });
    const el = MA.h('section.card.an-main', { dataset: { card: 'main' } }, strip, body);
    el._fill = () => fillMain(body, P, sample);
    return el;
  }
  function series(rows, m, mode) {
    if (mode === 'hourly') { const r = rows[0] || { hours: Array(24).fill(0) }; return { keys: r.hours.map((_, h) => h), labels: r.hours.map((_, h) => hh(h)), values: r.hours.slice() }; }
    if (mode === 'daily') return { keys: rows.map(r => r.date), labels: rows.map(r => fmtDay(r.date)), values: rows.map(r => m.get(r)) };
    const groups = []; // weekly: count back from the end so the latest weeks are whole; plot the daily average so a short first week isn't a fake dip
    for (let end = rows.length; end > 0; end -= 7) groups.unshift(rows.slice(Math.max(0, end - 7), end));
    return { keys: groups.map(g => g[0].date), groups, labels: groups.map(g => fmtDay(g[0].date)), values: groups.map(g => { const t = M().sum(g); return m.rate ? m.get(t) : +(m.get(t) / g.length).toFixed(1); }) };
  }
  function publishes(from, to) {
    const all = MA.versions.list().filter(v => v.kind === 'publish').sort((a, b) => String(a.at).localeCompare(String(b.at)));
    return all.map((v, i) => ({ ...v, n: i + 1, day: MA.qDay(v.at), hour: MA.qHour(v.at) })).filter(v => v.day >= from && v.day <= to);
  }
  const pubTip = p => T('pub.tip', { n: p.n, num: MA.num(p.n), when: `${fmtDayLong(p.day)} ${MA.time(p.at)}` }) + (p.note ? ' — ' + p.note : '');
  function markPublishes(chart, pubs, cur, mode) {
    const svg = chart.querySelector('svg'), gl = svg ? svg.querySelectorAll('.grid line') : [];
    if (!pubs.length || !gl.length) return 0;
    const x0 = +gl[0].getAttribute('x1'), x1 = +gl[0].getAttribute('x2'), yb = +gl[0].getAttribute('y1'), yt = +gl[gl.length - 1].getAttribute('y1'), n = cur.values.length;
    const X = i => x0 + (n <= 1 ? (x1 - x0) / 2 : i / (n - 1) * (x1 - x0));
    const idx = p => mode === 'hourly' ? p.hour : mode === 'daily' ? cur.keys.indexOf(p.day) : cur.groups.findIndex(g => g.some(r => r.date === p.day));
    const at = new Map();
    pubs.forEach(p => { const i = idx(p); if (i >= 0 && i < n) (at.get(i) || at.set(i, []).get(i)).push(p); });
    let html = '';
    for (const [i, list] of at) {
      const x = X(i), label = 'v' + list.at(-1).n, w = 8 + label.length * 6;
      html += `<g class="an-pub"><title>${esc(list.map(pubTip).join('\n'))}</title><line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${yt}" y2="${yb}"/><rect x="${(x - w / 2).toFixed(1)}" y="${yt - 15}" width="${w}" height="13" rx="3"/><text x="${x.toFixed(1)}" y="${yt - 5.5}" text-anchor="middle">${esc(label)}</text></g>`;
    }
    const g = document.createElementNS(SVGNS, 'g'); g.setAttribute('class', 'an-pubs-g'); g.innerHTML = html;
    svg.insertBefore(g, svg.querySelector('.hover-line'));
    return at.size;
  }
  /** RTL: time runs right to left (as ←/→ do). CSS flips the SVG and un-flips each label; here pointer x is mirrored
      before the core's hover handler sees it, and the tooltip is placed back under the cursor. */
  function mirrorTime(chart) {
    const svg = chart.querySelector('svg'), tip = chart.querySelector('.chart-tip'); if (!svg) return;
    chart.classList.add('an-rtl-time');
    let relay = false;
    chart.addEventListener('pointermove', e => {
      if (relay || e.target === tip) return;
      e.stopPropagation();
      const r = svg.getBoundingClientRect();
      relay = true;
      try { svg.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + r.right - e.clientX, clientY: e.clientY, bubbles: true, pointerId: e.pointerId })); } finally { relay = false; }
      if (tip && !tip.hidden) tip.style.left = (r.width - parseFloat(tip.style.left || 0)) + 'px';
    }, true);
  }
  /** Clip the current line at the second-to-last point and redraw the rest dotted. */
  function dotTail(chart, n) {
    const svg = chart.querySelector('svg'), gl = svg?.querySelector('.grid line');
    const line = svg && [...svg.querySelectorAll('path')].find(p => p.getAttribute('stroke') === 'var(--an-line)');
    if (!gl || !line) return;
    const x0 = +gl.getAttribute('x1'), x1 = +gl.getAttribute('x2'), xs = (x0 + (n - 2) / (n - 1) * (x1 - x0)).toFixed(1);
    const vb = svg.viewBox.baseVal, id = 'an-cut-' + Math.random().toString(36).slice(2, 7);
    const defs = document.createElementNS(SVGNS, 'defs');
    defs.innerHTML = `<clipPath id="${id}-a"><rect x="0" y="0" width="${xs}" height="${vb.height}"/></clipPath><clipPath id="${id}-b"><rect x="${xs}" y="0" width="${(vb.width - xs).toFixed(1)}" height="${vb.height}"/></clipPath>`;
    svg.prepend(defs);
    const tail = line.cloneNode();
    tail.setAttribute('clip-path', `url(#${id}-b)`); tail.setAttribute('stroke-dasharray', '0.5 5'); tail.setAttribute('stroke-width', '2.4'); tail.classList.add('an-partial');
    line.setAttribute('clip-path', `url(#${id}-a)`);
    line.after(tail);
  }
  function fillMain(body, P, sample) {
    body.innerHTML = '';
    body.setAttribute('aria-labelledby', 'an-tab-' + S.metric);
    const R = P.R, t = today(), mode = R.n <= 1 ? 'hourly' : R.n > 92 ? 'weekly' : 'daily';
    const m = mode === 'hourly' ? METRIC.views : METRIC[S.metric];
    let cur = series(P.rows, m, mode), prev = series(P.prevRows, m, mode);
    if (mode === 'hourly' && R.to === t) {
      const cut = MA.qHour(Date.now()) + 1, sl = s => ({ ...s, keys: s.keys.slice(0, cut), labels: s.labels.slice(0, cut), values: s.values.slice(0, cut) });
      cur = sl(cur); prev = sl(prev);
    }
    const yFmt = m.rate ? v => MA.pct(v / 100, 2) : v => MA.compact(v);
    if (m.rate) { cur = { ...cur, values: cur.values.map(v => +(v * 100).toFixed(3)) }; prev = { ...prev, values: prev.values.map(v => +(v * 100).toFixed(3)) }; }
    const curLabel = mode === 'hourly' ? rangeText(R.from, R.to) : rangeName(R), prevLabel = rangeText(R.prev.from, R.prev.to);
    const ser = [{ label: curLabel, values: cur.values, color: 'var(--an-line)' }];
    if (S.compare) ser.push({ label: prevLabel, values: prev.values, color: 'var(--an-prev)', dashed: true });
    const pad = parseFloat(getComputedStyle(body).paddingInlineStart) || 22;
    const w = Math.max(300, Math.round((body.clientWidth || 900) - 2 * pad)), h = w < 560 ? 220 : 270;
    const n = cur.values.length, k = Math.max(2, Math.floor(w / 92));
    let xEvery = Math.max(1, Math.ceil((n - 1) / k)); // keep the forced last label clear of the one before it
    while (xEvery < n - 1 && (n - 1) % xEvery && (n - 1) % xEvery < xEvery * .6) xEvery++;

    // summary: one sentence; context notes go underneath
    let summary;
    if (mode === 'hourly') {
      let best = -1; cur.values.forEach((v, i) => { if (best < 0 || v > cur.values[best]) best = i; });
      summary = T('sum.hourly', { range: rangePhrase(R) }) + (best >= 0 && cur.values[best] > 0 ? T('sum.peakHour', { h: cur.labels[best], v: MA.num(cur.values[best]) }) : '') + '.';
    } else {
      const total = m.get(P.cur), d = deltaInfo(m, total, m.get(P.prev), R.prev);
      let best = null;
      for (const r of P.rows) { if (m.rate && r.visitors < 5) continue; const v = m.get(r); if (!best || v > best.v) best = { v, date: r.date }; }
      summary = T('sum.total', { metric: m.label(), v: fmtVal(m, total), range: rangePhrase(R) }) + (S.compare ? d.clause : '') +
        (best && best.v > 0 ? T(m.rate ? 'sum.best' : 'sum.peak', { day: fmtDayLong(best.date), v: fmtVal(m, best.v) }) : '') + '.';
    }
    // the drawing is named by what it plots and described by the summary (the Table button gives every value)
    const chart = MA.chart.lines(ser, cur.labels, { w, h, yFmt, xEvery, label: `${m.label()} · ${curLabel}`, desc: summary });
    if (!m.rate) { const ys = [...chart.querySelectorAll('.axis text')].slice(0, 5) /* the core draws the 5 y ticks first */, frac = t => /[.٫][0-9٠-٩۰-۹]/.test(t.textContent); if (ys.length && !frac(ys.at(-1))) ys.forEach(t => { if (frac(t)) t.textContent = ''; }); }
    const pubs = publishes(R.from, R.to), marked = markPublishes(chart, pubs, cur, mode);
    const partial = R.to === t && n >= 2; // today (or this hour, or this week) isn't over: draw the last stretch dotted
    if (partial) dotTail(chart, n);
    if (MA.isRTL()) mirrorTime(chart);
    const notes = [];
    if (mode === 'hourly' && S.metric !== 'views') notes.push(T('note.hourlyOnly'));
    if (mode === 'weekly') notes.push(T('note.weekly'));
    if (partial) notes.push(T('note.today'));

    const legendItems = [{ label: curLabel, color: 'var(--an-line)' }];
    if (S.compare) legendItems.push({ label: prevLabel, color: 'var(--an-prev)' });
    if (marked) legendItems.push({ label: T('legend.publish'), color: 'var(--flare)' });
    const legend = MA.chart.legend(legendItems); legend.classList.add('an-legend');
    if (S.compare) legend.children[1]?.classList.add('dash');
    if (marked) legend.lastElementChild?.classList.add('pub');
    const tools = MA.h('div.an-tools', legend, sample ? MA.ui.sample() : null, tableBtn('main'));

    const table = () => {
      const keyLabel = mode === 'hourly' ? T('col.hour') : mode === 'weekly' ? T('col.week') : T('col.date');
      const cols = [{ k: 'x', label: keyLabel, get: r => r.label }, { k: 'c', label: curLabel, num: true, get: r => yFmtFull(m, r.v) }];
      if (S.compare) cols.push({ k: 'p', label: prevLabel, num: true, get: r => yFmtFull(m, r.pv) }, { k: 'd', label: T('col.change'), num: true, get: r => chg(r.v, r.pv, { rate: m.rate }) });
      const un = v => m.rate ? v / 100 : v;
      return tableEl(cols, cur.values.map((v, i) => ({ label: mode === 'daily' ? fmtDayLong(cur.keys[i]) : cur.labels[i], v: un(v), pv: un(prev.values[i] ?? 0) })));
    };
    body.append(figure('main', { summary, viz: chart, table, tools, note: notes.join(' ') }));
    if (pubs.length) {
      const hist = canOpen('history');
      body.append(MA.h('div.an-pubs', MA.h('span.label', T('pub.list')), ...pubs.slice(-6).reverse().map(p => MA.h(hist ? 'a' : 'span', { class: 'an-pub-i', href: hist ? '#/history' : null, title: pubTip(p) },
        MA.ui.tideMark('live'), MA.h('b', 'v' + p.n), MA.h('span', fmtDay(p.day)), p.note ? MA.h('span.truncate.n', p.note) : null))));
    }
  }
  const yFmtFull = (m, v) => m.rate ? MA.pct(v, 1) : MA.num(v, { maximumFractionDigits: 1 });

  /* ---------------- breakdown: sources, countries, languages, devices ---------------- */
  function breakdownCard(P, sample) {
    const box = MA.h('div.an-bd-body');
    const el = card('breakdown', { title: T('bd.title'), sample, extra: [MA.ui.btn(T('bd.viewAll'), { size: 'sm', kind: 'ghost', icon: 'list', onclick: () => openAll(P) })], table: false });
    el.querySelector('.card-head .btn').classList.add('an-viewall');
    // MA.ui.tabs handles ←/→/Home/End itself (and stops them reaching the range keys)
    const tabs = MA.ui.tabs(TABS.map(t => ({ value: t.id, label: t.label() })), S.tab, v => { S.tab = v; saveState(); fill(); }, { label: T('bd.title'), panel: box });
    const fill = () => {
      const tab = TAB[S.tab], items = itemsOf(tab, P.cur, P.prev), total = items.reduce((s, i) => s + i.v, 0);
      const top = items[0];
      const summary = top ? T('bd.sum', { top: iso(top.label), share: MA.pct(top.v / (total || 1)), total: MA.num(total), count: total }) : T('bd.none');
      const viz = autoDir(MA.chart.barlist(items.slice(0, 7).map(i => ({ label: i.label, value: i.v, icon: i.icon })), { total, empty: T('bd.none') }));
      const table = () => tableEl([{ label: tab.label(), get: r => r.label }, { label: T('col.visits'), num: true, get: r => MA.num(r.v) }, { label: T('col.share'), num: true, get: r => MA.pct(r.v / (total || 1), 1) },
        ...(S.compare ? [{ label: T('col.change'), num: true, get: r => chg(r.v, r.pv) }] : [])], items);
      box.innerHTML = '';
      box.append(figure('breakdown', { summary, viz, table }));
    };
    el.querySelector('.card-head').append(tableBtn('breakdown'));
    el.querySelector('.card-body').append(tabs, box);
    fill();
    return el;
  }
  function openAll(P) {
    const tab = TAB[S.tab], items = itemsOf(tab, P.cur, P.prev), total = items.reduce((s, i) => s + i.v, 0) || 1;
    let sort = { k: 'v', dir: -1 };
    const box = MA.h('div.an-all');
    const cols = [
      { k: 'label', label: tab.label(), get: r => r.label },
      { k: 'v', label: T('col.visits'), num: true, get: r => MA.num(r.v) },
      { k: 'share', label: T('col.share'), num: true, get: r => MA.pct(r.v / total, 1) },
      ...(S.compare ? [{ k: 'pv', label: T('col.previous'), num: true, get: r => MA.num(r.pv) }, { k: 'chg', label: T('col.change'), num: true, get: r => chg(r.v, r.pv) }] : []),
    ];
    const val = (r, k) => k === 'label' ? r.label : k === 'chg' ? (r.pv ? (r.v - r.pv) / r.pv : (r.v ? Infinity : 0)) : k === 'pv' ? r.pv : r.v;
    const fill = () => {
      const rows = [...items].sort((a, b) => { const x = val(a, sort.k), y = val(b, sort.k); return (typeof x === 'string' ? x.localeCompare(y, MA.lang()) : x === y ? 0 : x > y ? 1 : -1) * sort.dir; });
      box.innerHTML = '';
      box.append(tableEl(cols, rows, { sort, onSort: k => { sort = sort.k === k ? { k, dir: -sort.dir } : { k, dir: k === 'label' ? 1 : -1 }; fill(); box.querySelector(`th[data-k="${k}"] button`)?.focus(); } }));
    };
    fill();
    const L = MA.ui.modal({ title: esc(`${T('bd.title')} · ${tab.label()}`), size: 'wide',
      body: MA.h('div', MA.h('p.small.muted.an-all-sub', T('bd.all', { n: MA.num(items.length), range: rangePhrase(P.R) })), box),
      actions: [{ label: T('bd.export'), icon: 'download', kind: 'ghost', run: () => { exportBreakdown(tab, items, P); return false; } }, { label: MA.t('done'), kind: 'primary' }] });
    L.el.classList.add('an-modal');
  }
  function exportBreakdown(tab, items, P) {
    const total = items.reduce((s, i) => s + i.v, 0) || 1;
    const cols = [{ key: 'k', label: 'Key' }, { key: 'label', label: 'Name' }, { key: 'v', label: 'Visits' }, { label: 'Share', get: r => (r.v / total * 100).toFixed(1) + '%' },
      { key: 'pv', label: `Previous (${P.R.prev.from} to ${P.R.prev.to})` }, { label: 'Sample', get: () => M().sampleOn() ? 'yes' : 'no' }];
    MA.download(`miras-${tab.id}-${P.R.from}_${P.R.to}.csv`, MA.csv.stringify(items, cols), 'text/csv');
    MA.toast(T('exported', { n: P.rows.length }), { icon: 'download' });
  }

  /* ---------------- live panel ---------------- */
  function liveCard() {
    const el = MA.h('section.card.an-card.an-live', { dataset: { card: 'live' } });
    const fill = () => {
      const L = M().live(5), feed = M().feed(8);
      el.innerHTML = '';
      const head = MA.h('div.card-head', MA.h('h2.h3', T('live.title')), feed.some(e => e.sample) ? MA.ui.sample() : null, MA.h('span.an-upd', T('live.updated', { time: MA.time(Date.now()), n: MA.num(10) })));
      const now = MA.h('div.an-now', MA.h('span', { class: 'pulse' + (L.sessions ? ' on' : ''), 'aria-hidden': 'true' }), MA.h('b.num', MA.num(L.sessions)), MA.h('span.small.muted', T('live.now', { n: MA.num(5) })));
      const list = feed.length
        ? MA.h('ol.an-feed', { 'aria-label': T('live.feed') }, feed.map(e => MA.h('li', { class: e.sample ? 'sample' : '' },
          MA.h('time.t', { datetime: new Date(e.t).toISOString(), title: `${MA.date(e.t)} ${MA.time(e.t)}` }, MA.ago(e.t)),
          MA.h('span.what', M().describe(e), e.sample ? MA.h('span.sr-only', ` (${MA.ui.sample().textContent})`) : null),
          MA.h('span.meta', MA.h('span', { html: MA.icon(DEV_ICON[e.d] || 'monitor', 'sm'), title: MA.t(DEV_ICON[e.d] ? e.d : 'desktop') }), MA.h('span.lg', e.l === 'ar' ? 'ع' : 'EN')))))
        : MA.ui.empty({ title: esc(T('live.quiet')), text: esc(T('live.quietText')), icon: 'clock', compact: true });
      el.append(head, MA.h('div.card-body', now, feed.length ? MA.h('p.label.an-feed-l', T('live.feed')) : null, list));
    };
    fill();
    liveRefresh = () => { if (el.isConnected) fill(); };
    return el;
  }

  /* ---------------- swells ---------------- */
  function swellsCard(P, sample) {
    const draft = MA.content.draft?.swells || [], picks = P.cur.picks || {}, prevPicks = P.prev.picks || {};
    const ids = [...draft.map(s => s.id), ...Object.keys(picks).filter(id => !draft.some(s => s.id === id))];
    const items = ids.map(id => ({ id, label: MA.leads.waveLabel(id), v: picks[id] || 0, pv: prevPicks[id] || 0 })).sort((a, b) => b.v - a.v);
    const total = items.reduce((s, i) => s + i.v, 0);
    const summary = total ? T('sw.sum', { top: iso(items[0].label), share: MA.pct(items[0].v / total), total: MA.num(total) }) : T('sw.none');
    const viz = autoDir(MA.chart.barlist(items.map(i => ({ label: i.label, value: i.v })), { total, empty: T('sw.none') }), cl());
    const table = () => tableEl([{ label: T('col.swell'), get: r => r.label }, { label: T('col.taps'), num: true, get: r => MA.num(r.v) }, { label: T('col.share'), num: true, get: r => MA.pct(r.v / (total || 1), 1) },
      ...(S.compare ? [{ label: T('col.change'), num: true, get: r => chg(r.v, r.pv) }] : [])], items);
    return card('swells', { title: T('sw.title'), sample, extra: [linkBtn('services', T('sw.edit'))] }, figure('swells', { summary, viz, table }));
  }

  /* ---------------- section reach: one tide line per section, never crossing ---------------- */
  const wave = W => { let d = 'M0 8'; for (let x = 0, k = 0; x < W; x += 12, k++) { const nx = Math.min(W, x + 12); d += ` Q${((x + nx) / 2).toFixed(1)} ${k % 2 ? 10.8 : 5.2} ${nx.toFixed(1)} 8`; } return d; };
  function reachCard(P, sample) {
    const vis = P.cur.visitors || 0, pvis = P.prev.visitors || 0, secs = MA.content.draft?.sections || {};
    // page order follows the site's layout; sections hidden on the site can't be reached, so they are named in a note instead of drawn
    const all = M().sectionOrder().map(id => {
      const v = P.cur.sections?.[id] || 0, pv = P.prev.sections?.[id] || 0;
      return { id, label: secLabel(id), v, share: vis ? Math.min(1, v / vis) : 0, pshare: pvis ? Math.min(1, pv / pvis) : 0, hidden: secs[id] === false };
    });
    const rows = all.filter(r => !r.hidden), shown = rows, off = all.filter(r => r.hidden);
    let drop = -1, dropPts = 0;
    shown.forEach((r, i) => { if (!i) return; const dd = shown[i - 1].share - r.share; if (dd > dropPts) { dropPts = dd; drop = i; } });
    const pts = n => MA.num(n * 100, { maximumFractionDigits: 0 }), ptsN = n => Math.round(n * 100);
    const any = rows.some(r => r.v > 0), last = [...shown].reverse().find(r => r.id !== 'foot') || shown.at(-1) || rows.at(-1);
    const summary = !any ? T('reach.none') : drop < 0 ? T('reach.noDrop', { lastShare: MA.pct(last.share), last: iso(last.label) })
      : T('reach.sum', { lastShare: MA.pct(last.share), last: iso(last.label), after: iso(drop > 0 ? rows[drop - 1].label : rows[0].label), drop: T('reach.pts', { n: pts(dropPts), count: ptsN(dropPts) }) });
    const viz = MA.h('div.an-reach', { role: 'list' });
    rows.forEach((r, i) => {
      const W = Math.round(r.share * 1000), isDrop = i === drop;
      const svg = W > 0 ? `<svg viewBox="0 0 ${W} 16" preserveAspectRatio="none" style="width:${(r.share * 100).toFixed(2)}%" aria-hidden="true"><path d="${wave(W)}" vector-effect="non-scaling-stroke"/></svg>` : '';
      const lost = isDrop ? `<i class="lost" style="inset-inline-start:${(r.share * 100).toFixed(2)}%;width:${((rows[i - 1].share - r.share) * 100).toFixed(2)}%"></i>` : '';
      viz.append(MA.h('div', { class: 'r' + (isDrop ? ' drop' : '') + (r.hidden ? ' hid' : ''), role: 'listitem', dataset: { sec: r.id }, title: r.hidden ? T('reach.hidden') : null, 'aria-label': `${r.label}: ${MA.pct(r.share)}${r.hidden ? ' · ' + T('reach.hidden') : ''}` },
        MA.h('span.nm', r.label), MA.h('span.tr', { html: svg + lost }), MA.h('span.v.num', MA.pct(r.share))));
      if (isDrop) viz.append(MA.h('div.r.note', { 'aria-hidden': 'true' }, MA.h('span'), MA.h('span.flag', T('reach.dropAfter', { drop: T('reach.pts', { n: pts(dropPts), count: ptsN(dropPts) }), after: rows[i - 1].label })), MA.h('span')));
    });
    const table = () => tableEl([{ label: T('col.section'), get: r => r.label + (r.hidden ? ` (${T('reach.hidden')})` : '') }, { label: T('col.reached'), num: true, get: r => MA.num(r.v) }, { label: T('col.ofVisitors'), num: true, get: r => MA.pct(r.share) },
      ...(S.compare ? [{ label: T('col.change'), num: true, get: r => chg(r.share, r.pshare, { rate: true }) }] : [])], rows);
    const note = off.length ? T('reach.off', { list: andList(off.map(r => r.label)) }) : '';
    return card('reach', { title: T('reach.title'), sample }, figure('reach', { summary, viz, table, note }));
  }

  /* ---------------- funnel ---------------- */
  function funnelCard(P, sample) {
    const steps = M().funnelSteps(P.cur), top = Math.max(1, steps[0]?.value || 0);
    let leak = -1, worst = 0;
    steps.forEach((s, i) => { if (!i) return; const p = steps[i - 1].value; if (p > 0) { const lost = 1 - s.value / p; if (lost > worst) { worst = lost; leak = i; } } });
    const viz = MA.h('div.an-funnel', { role: 'list' });
    steps.forEach((s, i) => {
      const p = s.value / top, pp = i ? steps[i - 1].value / top : p, ofPrev = i && steps[i - 1].value ? s.value / steps[i - 1].value : 1;
      const mix = Math.max(30, 100 - i * 15);
      viz.append(MA.h('div', { class: 'st' + (i === leak ? ' leak' : ''), role: 'listitem' },
        MA.h('span.nm', MA.h('span.truncate', s.label), i === leak ? MA.ui.badge(T('fn.leak'), 'flare') : null),
        MA.h('span.bar', { html: (i ? `<i class="lost" style="width:${(Math.min(1, pp) * 100).toFixed(2)}%"></i>` : '') + `<i class="fill" style="width:${(Math.min(1, p) * 100).toFixed(2)}%;background:color-mix(in srgb,var(--an-line) ${mix}%,var(--panel3))"></i>` }),
        MA.h('span.v.num', MA.h('b', MA.num(s.value)), MA.h('small', !i ? MA.pct(1) : !steps[i - 1].value ? '—' : i === leak ? T('fn.left', { p: MA.pct(1 - ofPrev) }) : T('fn.ofPrev', { p: MA.pct(ofPrev) })))));
    });
    const lastStep = steps.at(-1);
    const summary = leak < 0 ? T('fn.noLeak', { rate: MA.pct(lastStep.value / top, 1), last: iso(lastStep.label) }) : T('fn.sum', { rate: MA.pct(lastStep.value / top, 1), last: iso(lastStep.label), a: iso(steps[Math.max(0, leak - 1)].label), b: iso(steps[Math.max(1, leak)]?.label || ''), lost: MA.pct(worst) });
    const table = () => tableEl([{ label: T('col.step'), get: r => r.label }, { label: T('m.visitors'), num: true, get: r => MA.num(r.value) },
      { label: T('col.ofPrev'), num: true, get: r => r.i ? MA.pct(steps[r.i - 1].value ? r.value / steps[r.i - 1].value : 0, 1) : '—' }, { label: T('col.ofVisitors'), num: true, get: r => MA.pct(r.value / top, 1) }], steps.map((s, i) => ({ ...s, i })));
    return card('funnel', { title: T('fn.title'), sample }, figure('funnel', { summary, viz, table }));
  }

  /* ---------------- opening film ---------------- */
  function filmCard(P, sample) {
    const vis = P.cur.visitors || 0, j = P.cur.journey || {};
    const items = [25, 50, 75, 100].map(p => ({ p, label: T('film.mark', { p: MA.pct(p / 100) }), value: j[p] || 0, pv: P.prev.journey?.[p] || 0 }));
    const summary = T('film.sum', { half: MA.pct(vis ? (j[50] || 0) / vis : 0), done: MA.pct(vis ? (j[100] || 0) / vis : 0) });
    const viz = MA.chart.barlist(items.map(i => ({ label: i.label, value: i.value })), { total: vis || 1, max: vis || 1 });
    const table = () => tableEl([{ label: T('col.milestone'), get: r => r.label }, { label: T('m.visitors'), num: true, get: r => MA.num(r.value) }, { label: T('col.ofVisitors'), num: true, get: r => MA.pct(vis ? r.value / vis : 0, 1) },
      ...(S.compare ? [{ label: T('col.change'), num: true, get: r => chg(r.value, r.pv) }] : [])], items);
    return card('film', { title: T('film.title'), sample }, figure('film', { summary, viz, table }));
  }

  /* ---------------- when visitors come ---------------- */
  function heatCard(P, sample) {
    const m = M().heat(P.rows), wd = weekdays('short'), wdl = weekdays('long');
    const rowSum = m.map(r => r.reduce((s, v) => s + v, 0)), total = rowSum.reduce((s, v) => s + v, 0);
    let best = { d: 0, h: 0, v: -1 }; m.forEach((r, d) => r.forEach((v, h) => { if (v > best.v) best = { d, h, v }; }));
    const quiet = rowSum.indexOf(Math.min(...rowSum));
    const summary = total ? T('heat.sum', { day: wdl[best.d], hour: hh(best.h), quiet: wdl[quiet] }) : T('heat.none');
    const grid = MA.chart.heat(m, { rowLabels: wd, color: 'var(--an-line)' });
    // the core grid prints raw digits; re-label hours and cell tips in the admin's digits (rows: label + 24 cells, then a 25-cell hour axis)
    const cells = [...grid.children];
    if (cells.length === 200) {
      for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) cells[d * 25 + 1 + h].title = `${wdl[d]} ${hh(h)} · ${MA.num(m[d][h])}`;
      for (let h = 0; h < 24; h += 6) cells[175 + 1 + h].textContent = MA.num(h);
    }
    grid.setAttribute('role', 'img'); grid.setAttribute('aria-label', T('heat.title'));
    if (MA.isRTL()) grid.style.direction = 'rtl';
    const viz = MA.h('div.an-heat', grid);
    const table = () => tableEl([{ label: T('col.day'), get: r => wdl[r] }, { label: T('col.views'), num: true, get: r => MA.num(rowSum[r]) },
      { label: T('col.peak'), num: true, get: r => { const row = m[r], mx = Math.max(...row); return mx ? `${hh(row.indexOf(mx))} · ${MA.num(mx)}` : '—'; } }], [0, 1, 2, 3, 4, 5, 6]);
    return card('heat', { title: T('heat.title'), sample }, figure('heat', { summary, viz, table }));
  }

  /* ---------------- small moments ---------------- */
  function momentsCard(P, sample) {
    const vis = P.cur.visitors || 0;
    const rows = [
      { label: T('mo.lang'), v: P.cur.langSwitch || 0, pv: P.prev.langSwitch || 0, share: true },
      { label: T('mo.plan'), v: P.cur.planToBrief || 0, pv: P.prev.planToBrief || 0 },
      { label: T('mo.copy'), v: P.cur.copies || 0, pv: P.prev.copies || 0 },
    ];
    const words = sumObj(P.cur.make), pwords = sumObj(P.prev.make);
    if (words || pwords) rows.push({ label: T('mo.words'), v: words, pv: pwords, share: true });
    const list = MA.h('dl.an-moments', rows.map(r => MA.h('div',
      MA.h('dt', MA.h('span', r.label), r.share && vis ? MA.h('small', T('mo.ofVisitors', { p: MA.pct(r.v / vis, 1) })) : null),
      MA.h('dd', MA.h('b.num', MA.num(r.v)), S.compare ? chg(r.v, r.pv) : null))));
    return card('moments', { title: T('mo.title'), sample, table: false }, list);
  }

  /* ---------------- FAQ + services added to briefs ---------------- */
  function faqCard(P, sample) {
    const vis = P.cur.visitors || 0, faq = MA.content.draft?.faq || [], f = P.cur.faq || {};
    const idx = [...new Set([...faq.map((_, i) => i), ...Object.keys(f).map(Number)])];
    const items = idx.map(i => ({ label: siteText(faq[i], 'q') || '#' + MA.num(i + 1), v: f[i] || 0, pv: P.prev.faq?.[i] || 0 })).sort((a, b) => b.v - a.v);
    const summary = items[0]?.v ? T('faq.sum', { top: iso(items[0].label), v: MA.num(items[0].v), count: items[0].v }) : T('faq.none');
    const viz = autoDir(MA.chart.barlist(items.filter(i => i.v).map(i => ({ label: i.label, value: i.v })), { total: vis || 1, max: Math.max(1, ...items.map(i => i.v)), empty: T('faq.none') }), cl());
    const table = () => tableEl([{ label: T('col.question'), get: r => r.label }, { label: T('col.opens'), num: true, get: r => MA.num(r.v) }, { label: T('col.ofVisitors'), num: true, get: r => MA.pct(vis ? r.v / vis : 0, 1) },
      ...(S.compare ? [{ label: T('col.change'), num: true, get: r => chg(r.v, r.pv) }] : [])], items);
    return card('faq', { title: T('faq.title'), sample, extra: [linkBtn('faq', T('faq.edit'))] }, figure('faq', { summary, viz, table }));
  }
  /** Services added on the site ('service' events, from the Services list's "Add to brief"). The core's daily rows don't
      aggregate them yet, so real events from this browser are read through MA.metrics.live(); rows that carry `services` win. */
  function serviceAdds(P) {
    if (P.cur.services || P.prev.services) return { cur: P.cur.services || {}, prev: P.prev.services || {} };
    const R = P.R, out = { cur: {}, prev: {} };
    const mins = Math.ceil((Date.now() - noon(R.prev.from) + DAY) / 60e3);
    for (const e of M().live(mins).events) {
      if (e?.e !== 'service' || !e.p?.on || !e.p.id) continue;
      const d = MA.qDay(e.t), bucket = d >= R.from && d <= R.to ? out.cur : d >= R.prev.from && d <= R.prev.to ? out.prev : null;
      if (bucket) bucket[e.p.id] = (bucket[e.p.id] || 0) + 1;
    }
    return out;
  }
  function servicesCard(P) {
    const R = P.R, list = MA.content.draft?.services || [], groups = MA.content.draft?.sgroups?.[cl()] || MA.content.draft?.sgroups?.en || [];
    const adds = serviceAdds(P), inBriefs = {};
    let briefs = 0;
    if (MA.can('leads.view')) MA.leads.all().forEach(l => { const d = l.at ? MA.qDay(l.at) : ''; if (!l.services?.length || d < R.from || d > R.to) return; briefs++; l.services.forEach(id => inBriefs[id] = (inBriefs[id] || 0) + 1); });
    const ids = [...new Set([...list.map(s => s.id), ...Object.keys(adds.cur), ...Object.keys(inBriefs)])];
    const items = ids.map(id => { const s = list.find(x => x.id === id); return { id, label: siteText(s, 'name') || id, group: s ? MA.strip(groups[s.group]?.name || '') : '', v: adds.cur[id] || 0, pv: adds.prev[id] || 0, b: inBriefs[id] || 0 }; })
      .sort((a, b) => b.v - a.v || b.b - a.b);
    const total = items.reduce((s, i) => s + i.v, 0), top = items[0];
    const summary = total ? T('sv.sum', { top: iso(top.label), v: MA.num(top.v), total: MA.num(total), range: rangePhrase(R) }) : T('sv.none', { range: rangePhrase(R) });
    const viz = total ? autoDir(MA.chart.barlist(items.filter(i => i.v).slice(0, 8).map(i => ({ label: i.label, value: i.v })), { total }), cl()) : MA.h('div.an-sv-empty', MA.iconEl('plus', 'sm'), MA.h('p', T('sv.how')));
    const table = () => tableEl([{ label: T('col.service'), get: r => r.label }, { label: T('col.group'), get: r => r.group || '—' }, { label: T('col.adds'), num: true, get: r => MA.num(r.v) },
      ...(S.compare ? [{ label: T('col.change'), num: true, get: r => chg(r.v, r.pv) }] : []), { label: T('col.inBriefs'), num: true, get: r => r.b ? MA.num(r.b) : '—' }], items);
    const note = (M().sampleOn() ? T('sv.noteSample') : T('sv.note')) + (briefs ? ' ' + T('sv.briefs', { n: MA.num(briefs) }) + '.' : '');
    return card('services', { title: T('sv.title'), extra: [linkBtn('services', T('sv.edit'))] }, figure('services', { summary, viz, table, note }));
  }

  /* ---------------- where the numbers come from ---------------- */
  function dashUrl(a) {
    const id = String(a.id || '').trim(); let origin = '';
    try { if (a.src) { const u = new URL(a.src, location.href); if (/^https?:$/.test(u.protocol)) origin = u.origin; } } catch (e) {}
    if (a.provider === 'plausible') return (origin || 'https://plausible.io') + '/' + encodeURIComponent(id);
    if (a.provider === 'umami') return (origin || 'https://cloud.umami.is') + '/websites/' + encodeURIComponent(id);
    if (a.provider === 'ga4') return 'https://analytics.google.com/analytics/web/';
    return '';
  }
  /** The analytics service the draft points at, once it has a site ID: { provider, name, id, live (published as is), url (its dashboard) }, else null. */
  function provider() {
    const a = MA.content.draft?.studio?.analytics || {}, name = PROVIDERS[a.provider], id = String(a.id || '').trim();
    if (!name || !id) return null;
    const live = MA.content.pub('studio/analytics/provider') === a.provider && String(MA.content.pub('studio/analytics/id') || '').trim() === id;
    return { provider: a.provider, name, id, live, url: dashUrl(a) };
  }

  /* ---------------- shared dashboard (MA.db 'analytics.shareUrl', set here or in Settings) ---------------- */
  const SHARE_KEY = 'analytics.shareUrl';
  const isDevHost = host => /^(localhost|127\.0\.0\.1|\[::1\])$|\.(localhost|test)$/.test(host);
  /** A share link the admin may frame: https (http only on a local dev host), not this admin's own origin, no credentials in it.
      Plausible shared links get &embed=true and the admin's theme. → the URL to load, or '' when it can't be shown. */
  function embedUrl(raw = MA.db.get(SHARE_KEY, '')) {
    const s = String(raw || '').trim(); if (!s) return '';
    let u; try { u = new URL(s); } catch (e) { return ''; }
    if (!(u.protocol === 'https:' || (u.protocol === 'http:' && isDevHost(u.hostname)))) return '';
    if (u.origin === location.origin || u.username || u.password) return '';
    if (/\/share\//.test(u.pathname) && (/plausible/i.test(u.hostname) || MA.content.draft?.studio?.analytics?.provider === 'plausible')) {
      u.searchParams.set('embed', 'true'); u.searchParams.set('theme', MA.isDark() ? 'dark' : 'light'); u.searchParams.set('background', 'transparent');
    }
    return u.href;
  }
  /** Ask for the share link (owner/admin). Saving and removing both undo. */
  async function editShare() {
    if (!MA.can('settings.edit')) return;
    const was = MA.db.get(SHARE_KEY, '') || '';
    const v = await MA.ui.prompt(esc(T('sh.prompt')), { value: was, label: T('sh.prompt'), hint: esc(T('sh.hint')) });
    if (v == null) return;
    const next = v.trim();
    if (next && !embedUrl(next)) { MA.toast(T('sh.bad'), { tone: 'bad' }); return; }
    if (next === was) return;
    if (next) MA.db.set(SHARE_KEY, next); else MA.db.del(SHARE_KEY);
    MA.toast(T(next ? 'sh.saved' : 'sh.removed'), { undo: () => { if (was) MA.db.set(SHARE_KEY, was); else MA.db.del(SHARE_KEY); } });
  }
  function removeShare() {
    const was = MA.db.get(SHARE_KEY, ''); if (!was || !MA.can('settings.edit')) return;
    MA.db.del(SHARE_KEY);
    MA.toast(T('sh.removed'), { undo: () => MA.db.set(SHARE_KEY, was) });
  }
  /** The provider's own shared dashboard, framed: real numbers from every visitor, read-only. Sandboxed; no access to this admin. */
  function sharedCard() {
    const src = embedUrl(); if (!src) return null;
    const pv = provider(), host = new URL(src).host, name = pv?.name || host;
    const btns = [MA.h('a.btn.sm.ghost.an-sh-open', { href: src, target: '_blank', rel: 'noopener noreferrer', html: MA.icon('external', 'sm') + `<span>${esc(T('sh.open'))}</span>` })];
    if (MA.can('settings.edit')) btns.push(MA.ui.iconBtn('more', { tip: MA.t('more'), menu: true, onclick: e => MA.ui.menu(e.currentTarget, [
      { label: T('sh.change'), icon: 'edit', run: () => editShare() }, { label: T('sh.remove'), icon: 'trash', danger: true, run: () => removeShare() }], { align: 'end' }) }));
    const frame = MA.h('iframe.an-embed', { sandbox: 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms', referrerpolicy: 'no-referrer', loading: 'lazy', title: T('sh.frame', { name }), src });
    return MA.h('section.card.an-card.an-shared', { dataset: { card: 'shared' } },
      MA.h('div.card-head', MA.ui.tideMark('live'), MA.h('h2.h3', pv ? T('sh.titleOf', { name: pv.name }) : T('sh.title')), MA.ui.badge(T('sh.real'), 'good'), ...btns),
      MA.h('div.an-embed-wrap', frame),
      MA.h('p.an-note.an-sh-note', T('sh.note', { host })));
  }

  /* ---------------- attribution: briefs, open pipeline and won value by source or campaign (leads' ref + utm) ---------------- */
  const CHANNELS = ['instagram', 'linkedin', 'whatsapp', 'search', 'email', 'x', 'social', 'referral', 'direct'];
  const chName = c => CHANNELS.includes(c) ? T('ch.' + c) : String(c);
  const campaignOf = l => String((MA.isObj(l.utm) ? l.utm.campaign : typeof l.utm === 'string' ? l.utm : '') || '').trim();
  /** Site briefs split by the channel their first touch came from (instagram.com, ?utm_source=…); the rest by the source you set in the Inbox. */
  function sourceOf(l) {
    if (!l.source || l.source === 'site') { const c = l.channel || MA.leads.channelOf?.({ ref: l.ref, utm: l.utm }) || 'direct'; return { key: 'site:' + c, label: T('at.site', { ch: chName(c) }) }; }
    return { key: l.source, label: MA.L(MA.leads.source(l.source)) };
  }
  /** Briefs received in a range, grouped by source ('sources') or by utm campaign ('campaigns'):
      → { R, total, sample, tagged, rows: [{ key, label, n (briefs), open (open pipeline value), won (won value), wonN, sample }] }, best first. */
  function attribution(range = S.range, dim = 'sources') {
    const R = M().range(range), rows = new Map();
    let total = 0, sample = false, tagged = 0;
    for (const l of MA.leads.all()) {
      const d = l.at ? MA.qDay(l.at) : ''; if (!d || d < R.from || d > R.to) continue;
      total++; if (l.sample) sample = true;
      const camp = campaignOf(l); if (camp) tagged++;
      const k = dim === 'campaigns' ? (camp ? { key: 'c:' + camp.toLowerCase(), label: camp } : { key: '', label: T('at.noCampaign') }) : sourceOf(l);
      let r = rows.get(k.key); if (!r) rows.set(k.key, r = { key: k.key, label: k.label, n: 0, open: 0, won: 0, wonN: 0, sample: false });
      const v = +l.value || 0;
      r.n++; if (l.sample) r.sample = true;
      if (l.stage === 'won') { r.won += v; r.wonN++; } else if (!MA.leads.stage(l.stage)?.closed) r.open += v;
    }
    const list = [...rows.values()].sort((a, b) => b.won - a.won || b.n - a.n || b.open - a.open || String(a.label).localeCompare(b.label));
    return { R, rows: list, total, sample, tagged };
  }
  function attrCard(P) {
    if (!MA.can('leads.view')) return null;
    const box = MA.h('div.an-at-body');
    const el = card('attribution', { title: T('at.title'), table: false, extra: [linkBtn('inbox', T('at.inbox'))] });
    const tabs = MA.ui.tabs([{ value: 'sources', label: T('at.sources') }, { value: 'campaigns', label: T('at.campaigns') }], S.attr, v => { S.attr = v; saveState(); fill(); }, { label: T('at.title'), panel: box });
    const head = el.querySelector('.card-head');
    const fill = () => {
      const A = attribution(P.R.key ?? S.range, S.attr), ph = rangePhrase(A.R), byCamp = S.attr === 'campaigns';
      head.querySelector('.badge.sample')?.remove();
      if (A.sample) head.querySelector('.h3').after(MA.ui.sample());
      const top = A.rows.find(r => r.won > 0);
      const summary = !A.total ? T('at.none', { range: ph }) : top ? T('at.sumWon', { top: iso(top.label), v: money(top.won), range: ph })
        : T('at.sumBriefs', { top: iso(A.rows[0].label), n: MA.num(A.rows[0].n), total: MA.num(A.total), range: ph });
      const maxN = Math.max(1, ...A.rows.map(r => r.n));
      // the numbers are the chart: a small table with a bar for each row's share of briefs (no hover needed, nothing hidden)
      const viz = !A.total ? null : tableEl([
        { label: T(byCamp ? 'at.col.campaign' : 'at.col.source'), get: r => MA.h('span.an-at-name', MA.h('bdi', { dir: byCamp ? 'auto' : null }, r.label), MA.h('i.an-at-bar', { style: `inline-size:${(r.n / maxN * 100).toFixed(1)}%`, 'aria-hidden': 'true' })) },
        { label: T('at.col.briefs'), num: true, get: r => MA.num(r.n) },
        { label: T('at.col.open'), num: true, get: r => r.open ? money(r.open) : '—' },
        { label: T('at.col.won'), num: true, get: r => r.won ? money(r.won) : '—' },
      ], A.rows);
      if (viz) viz.classList.add('an-at-table');
      const note = A.total ? T('at.note', { range: ph }) + (byCamp && !A.tagged ? ' ' + T('at.noUtm') : '') : '';
      box.innerHTML = '';
      box.append(figure('attribution', { summary, viz, note }));
    };
    el.querySelector('.card-body').append(tabs, box);
    fill();
    return el;
  }

  function connectionCard() {
    const a = MA.content.draft?.studio?.analytics || {}, name = PROVIDERS[a.provider], id = String(a.id || '').trim();
    const canSet = MA.can('settings.edit') && canOpen('settings');
    const info = MA.h('div.an-cx-info'), btns = [];
    let title;
    if (name) {
      const live = MA.content.pub('studio/analytics/provider') === a.provider && String(MA.content.pub('studio/analytics/id') || '').trim() === id;
      title = MA.h('div.an-cx-title', MA.ui.tideMark(live && id ? 'live' : 'edited'), MA.h('h2.h3', T('cx.connected', { name })), id ? MA.h('span.an-cx-id', T('cx.siteId') + ' ', MA.h('code.an-code', id)) : null);
      if (!id) info.append(callout('warn', T('cx.noId', { name })));
      else if (!live) info.append(callout('', T('cx.notLive'), MA.can('content.publish') ? MA.h('div.an-cx-pub', MA.ui.btn(T('cx.publish'), { size: 'sm', icon: 'publish', onclick: () => MA.openPublish?.() })) : null));
      info.append(MA.h('p.small.muted', T('cx.hint.' + a.provider)));
      if (id || a.provider === 'ga4') btns.push(MA.h('a.btn.sm.an-dash', { href: dashUrl(a), target: '_blank', rel: 'noopener noreferrer', html: MA.icon('external', 'sm') + `<span>${esc(T('cx.open', { name }))}</span>` }));
      if (MA.can('settings.edit') && id && !embedUrl()) { const eb = MA.ui.btn(T('sh.add'), { size: 'sm', kind: 'ghost', icon: 'chart', onclick: () => editShare() }); eb.dataset.act = 'embed'; btns.push(eb); }
      if (canSet) btns.push(MA.ui.btn(T('cx.settings'), { size: 'sm', kind: 'ghost', icon: 'settings', onclick: () => MA.go('#/settings') }));
    } else {
      title = MA.h('div.an-cx-title', MA.ui.tideMark('draft'), MA.h('h2.h3', T('cx.tracking')));
      info.append(MA.h('p.small.muted', T('cx.notText')));
      if (canSet) btns.push(MA.ui.btn(T('src.connect'), { size: 'sm', icon: 'settings', onclick: () => MA.go('#/settings') }));
    }
    // how many of each this browser logged (real events only), so you can check tracking while you test the site
    const seen = {}, here = M().hasLocal();
    if (here) { try { JSON.parse(localStorage.getItem('miras.events') || '[]').forEach(e => { seen[e.e] = (seen[e.e] || 0) + 1; }); } catch (e) {} }
    const cols = [{ label: T('col.event'), get: r => MA.h('code.an-code', r[0]) }, { label: T('col.when'), get: r => evText(r[0]) }, { label: T('col.props'), get: r => r[1] ? MA.h('code.an-code.faint', r[1]) : '—' }];
    if (here) cols.push({ label: T('col.here'), num: true, get: r => seen[r[0]] ? MA.num(seen[r[0]]) : '—' });
    return MA.h('section.card.an-card.an-cx-card', { dataset: { card: 'connection', provider: a.provider || '' } },
      MA.h('div.card-body.an-cx',
        MA.h('div.an-cx-top', MA.h('div.grow', title, info), btns.length ? MA.h('div.btn-row', btns) : null),
        MA.h('div.an-cx-events', MA.h('p.label', T('cx.events')), tableEl(cols, EVENTS))));
  }

  /* ---------------- exports + clearing ---------------- */
  function exportCSV() {
    const P = period(root?.isConnected ? S.range : normRange(MA.prefs.get('dateRange')));
    const brief = MA.content.draft?.studio?.formEndpoint ? 'Briefs sent' : 'Opened email draft';
    const cols = [
      { key: 'date', label: 'Date (Doha)' }, { label: 'Sample', get: r => r.sample ? 'yes' : 'no' }, { label: 'Partial day', get: r => r.partial ? 'yes' : 'no' },
      { key: 'visitors', label: 'Visitors' }, { key: 'views', label: 'Page views' }, { label: 'Swell taps', get: r => sumObj(r.picks) },
      { label: 'Watched half the film', get: r => r.funnel.film50 }, { label: 'Reached contact', get: r => r.funnel.contact }, { label: brief, get: r => r.briefs },
      { label: 'Conversion', get: r => (M().conversion(r) * 100).toFixed(2) + '%' }, { label: 'Language switches', get: r => r.langSwitch }, { label: 'Plan to brief', get: r => r.planToBrief }, { label: 'Brief copies', get: r => r.copies },
    ];
    MA.download(`miras-analytics-${P.R.from}_${P.R.to}.csv`, MA.csv.stringify(P.rows, cols), 'text/csv');
    MA.toast(T('exported', { n: P.rows.length }), { icon: 'download' });
  }
  async function clearEvents() {
    const n = localCount();
    if (!n || !MA.can('settings.edit')) return;
    if (!(await MA.ui.confirm(esc(T('clear.title', { n })), esc(T('clear.text')), { danger: true, ok: T('clear.ok') }))) return;
    M().clearLocal();
    MA.activity.log({ action: 'analytics.clear', target: `${n} events`, module: 'analytics', href: '#/analytics' });
    MA.toast(T('cleared'), { icon: 'trash' });
  }

  /* ---------------- keys (page-scoped: MA.keys.bindView removes them when you leave) ---------------- */
  function bindKeys() {
    KEY_PRESETS.forEach(([k, r]) => MA.keys.bindView(k, () => setRange(r), () => T('k.range', { range: MA.L(M().RANGES[r]) })));
    // ← is "back in time" in LTR and "forward" in RTL, where time reads right to left
    MA.keys.bindView('arrowleft', () => step(MA.isRTL() ? 1 : -1), () => T(MA.isRTL() ? 'k.next' : 'k.prev'));
    MA.keys.bindView('arrowright', () => step(MA.isRTL() ? -1 : 1), () => T(MA.isRTL() ? 'k.prev' : 'k.next'));
    MA.keys.bindView('x', () => setCompare(!S.compare), () => T('k.compare'));
  }

  /* ---------------- query (?metric=, ?tab=, ?focus=, ?range=) ---------------- */
  function applyQuery(q, live) {
    let redraw = false;
    const metric = q.get('metric'), tab = q.get('tab'), range = q.get('range');
    if (metric && METRIC[metric] && metric !== S.metric) { if (live) setMetric(metric); else { S.metric = metric; saveState(); } }
    if (tab && TAB[tab] && tab !== S.tab) { S.tab = tab; saveState(); redraw = true; }
    if (range && M().RANGES[range] && range !== S.range) { S.range = range; MA.prefs.set('dateRange', range); sig = sigOf(); redraw = true; }
    if (live && redraw) draw();
  }
  function focusCard(id) {
    if (!id) return;
    setTimeout(() => {
      const c = wrap?.querySelector(`[data-card="${CSS.escape(id)}"]`); if (!c) return;
      c.scrollIntoView({ block: 'start', behavior: MA.reducedMotion() ? 'auto' : 'smooth' });
      c.classList.remove('an-flash'); void c.offsetWidth; c.classList.add('an-flash');
      try { MA.setQuery({ focus: null }); } catch (e) {}
    }, 60);
  }

  /* ---------------- palette search ---------------- */
  let searchCache = null;
  function search(q) {
    if (!MA.can('analytics.view') || M().source() === 'none') return [];
    const ql = q.toLowerCase().trim(); if (!ql) return [];
    const range = normRange(MA.prefs.get('dateRange'));
    if (!searchCache || searchCache.range !== JSON.stringify(range) || Date.now() - searchCache.at > 15e3) searchCache = { range: JSON.stringify(range), at: Date.now(), P: M().period(range) };
    const P = searchCache.P, ph = rangePhrase(P.R), out = [], has = s => String(s).toLowerCase().includes(ql);
    const go = qs => () => MA.go('#/analytics?' + qs);
    METRICS.forEach(m => { if (has(m.label())) out.push({ title: m.label(), sub: `${fmtVal(m, m.get(P.cur))} ${ph}`, icon: 'chart', run: go('metric=' + m.id) }); });
    TABS.forEach(tab => itemsOf(tab, P.cur).slice(0, 30).forEach(it => { if (has(it.label) || has(it.k)) out.push({ title: it.label, sub: T('s.item', { tab: tab.label(), v: MA.num(it.v), count: it.v }), icon: 'globe', run: go(`tab=${tab.id}&focus=breakdown`) }); }));
    (MA.content.draft?.swells || []).forEach(s => { const l = MA.leads.waveLabel(s.id); if (has(l)) out.push({ title: l, sub: T('s.swell', { v: MA.num(P.cur.picks?.[s.id] || 0) }), icon: 'swell', run: go('focus=swells') }); });
    M().sectionOrder().forEach(id => { const l = secLabel(id); if (has(l)) out.push({ title: l, sub: T('s.section', { p: MA.pct(P.cur.visitors ? Math.min(1, (P.cur.sections?.[id] || 0) / P.cur.visitors) : 0) }), icon: 'layers', run: go('focus=reach') }); });
    const sv = MA.content.draft?.services?.length ? serviceAdds(P).cur : {};
    (MA.content.draft?.services || []).forEach(s => { const l = siteText(s, 'name'); if (l && has(l)) out.push({ title: l, sub: T('s.service', { v: MA.num(sv[s.id] || 0) }), icon: 'swell', run: go('focus=services') }); });
    (MA.content.draft?.faq || []).forEach((f, i) => { const l = siteText(f, 'q'); if (l && has(l)) out.push({ title: l, sub: T('s.faq', { v: MA.num(P.cur.faq?.[i] || 0) }), icon: 'faq', run: go('focus=faq') }); });
    return out.slice(0, 8);
  }

  /* ---------------- commands ---------------- */
  const cmdRange = k => () => {
    if (root?.isConnected) setRange(k);
    else { MA.prefs.set('dateRange', k); MA.go('#/analytics'); }
  };
  PRESET_ORDER.forEach(k => MA.commands.add({ id: 'analytics.range.' + k, icon: 'calendar', keywords: 'analytics traffic range period date visitors تحليلات زيارات فترة آمار بازدید بازه',
    title: { en: 'Show traffic: ' + M().RANGES[k].en.toLowerCase(), ar: 'اعرض الزيارات: ' + M().RANGES[k].ar, fa: 'نمایش بازدید: ' + M().RANGES[k].fa }, when: () => MA.can('analytics.view'), run: cmdRange(k) }));
  MA.commands.add({ id: 'analytics.export', icon: 'download', keywords: 'analytics csv export download traffic تصدير خروجی', title: { en: 'Export traffic as CSV', ar: 'تصدير الزيارات بصيغة CSV', fa: 'خروجی CSV از بازدیدها' }, when: () => MA.can('analytics.view') && M().source() !== 'none', run: () => exportCSV() });
  MA.commands.add({ id: 'analytics.compare', icon: 'chart', shortcut: 'x', keywords: 'analytics compare previous period مقارنة مقایسه', title: { en: 'Turn traffic comparison on or off', ar: 'تشغيل مقارنة الزيارات أو إيقافها', fa: 'روشن یا خاموش کردن مقایسهٔ بازدید' }, when: () => !!root?.isConnected, run: () => setCompare(!S.compare) });
  MA.commands.add({ id: 'analytics.clear', icon: 'trash', keywords: 'analytics events clear local browser مسح پاک کردن رویداد', title: { en: "Clear this browser's site events…", ar: 'مسح أحداث الموقع من هذا المتصفح…', fa: 'پاک کردن رویدادهای سایت در این مرورگر…' }, when: () => MA.can('settings.edit') && M().hasLocal(), run: () => clearEvents() });
  MA.commands.add({ id: 'analytics.sample', icon: 'eye', keywords: 'analytics sample data demo hide show تجريبي نمونه', title: { en: 'Show or hide sample traffic data', ar: 'إظهار بيانات الزيارات التجريبية أو إخفاؤها', fa: 'نمایش یا پنهان کردن دادهٔ نمونهٔ بازدید' }, when: () => !!root?.isConnected, run: () => setSample(!M().sampleOn()) });

  /** Shared with the Overview (and anyone else): where real visitors are counted, the shared dashboard, attribution. */
  MA.analytics = {
    /** → { provider, name, id, live, url } | null (no provider, or no site ID yet) */
    provider,
    /** → the shared dashboard URL ready to frame, or '' (MA.db 'analytics.shareUrl'; pass a raw link to check one) */
    embedUrl,
    /** Ask for (or change) the shared dashboard link, with undo. */
    editShare,
    /** (range = the page's range, 'sources' | 'campaigns') → { R, total, sample, tagged, rows: [{ key, label, n, open, won, wonN, sample }] } */
    attribution,
    /** Money in the admin language (Persian names the currency in words). */
    money,
  };

  /* ---------------- module ---------------- */
  MA.module({
    id: 'analytics', group: 'work', order: 30, icon: 'chart', shortcut: 'g a', perm: 'analytics.view',
    title: { en: 'Analytics', ar: 'التحليلات', fa: 'آمار' }, keywords: 'traffic visitors stats funnel reach analytics تحليلات زوار زيارات آمار بازدید تحلیل',
    render(view, ctx) {
      loadState();
      root = MA.h('div.m-analytics');
      liveEl = MA.h('p.sr-only', { 'aria-live': 'polite' });
      wrap = MA.h('div.an-wrap');
      root.append(liveEl, wrap);
      view.append(root);
      applyQuery(ctx.query, false);
      sig = sigOf();
      draw();
      bindKeys();
      MA.onView('metrics', () => { ver++; redrawSoon(); });
      MA.onView('versions', redrawSoon);
      MA.onView('content:published', redrawSoon);
      MA.onView('content:change', ({ path } = {}) => { if (!path || /^(swells|services|sgroups|faq|studio|sections|layout)/.test(path)) redrawSoon(); });
      MA.onView('leads', redrawSoon); // where briefs come from
      MA.onView('db:' + SHARE_KEY, redrawSoon); // the shared dashboard link (here or in Settings)
      MA.onView('prefs', () => { const s = sigOf(); if (s !== sig) { sig = s; S.range = normRange(MA.prefs.get('dateRange')); draw(); } });
      const timer = setInterval(() => liveRefresh?.(), 10000);
      MA.cleanup(() => clearInterval(timer));
      let lastW = wrap.clientWidth;
      const ro = new ResizeObserver(MA.debounce(() => { const w = wrap?.clientWidth || 0; if (w && Math.abs(w - lastW) > 24) { lastW = w; wrap.querySelector('.an-main')?._fill?.(); } }, 150));
      ro.observe(wrap);
      MA.cleanup(() => { ro.disconnect(); root = wrap = liveEl = null; liveRefresh = null; });
      focusCard(ctx.query.get('focus'));
    },
    update(ctx) {
      if (!root?.isConnected) return false;
      applyQuery(ctx.query, true);
      focusCard(ctx.query.get('focus'));
      return true;
    },
    search,
  });
})();
