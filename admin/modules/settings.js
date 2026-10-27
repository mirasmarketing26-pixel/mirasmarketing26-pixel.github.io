/* =====================================================================
   MIRAS admin — Settings
   One long page with a section menu and a search box that filters every setting.
   Content-backed values live in the draft and go live on publish:
     studio { email, whatsapp, phoneLabel, timezone, open, close (24-hour 'HH:MM'), days, formEndpoint, analytics:{provider, id, src},
              exceptions [{id, from, to, label{en,ar}, closed, open, close}], consent, privacyUrl, formFields{phone, budget} }
     sections { <id>: bool }, layout [ids in page order], ui.{en,ar}.budgets ('|' between ranges)
   studio.consent is locked on while an analytics provider is set (the site's privacy policy promises it).
   Admin data (backups, restore with undo, clear, reset) works on this browser's storage directly:
     MA.db 'analytics.shareUrl' (a provider's shared dashboard link, for the Analytics page), 'backup.auto' (last automatic backup),
     IndexedDB kv 'restore.snapshot' (what a restore replaced, for undo). The backup folder is Publish & history's (handles 'backup').
   Editing content-backed settings needs settings.edit + content.edit; admin data needs settings.edit.
   MA.settings exposes the pieces other pages and tests use (see the bottom of the file).
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA, h = MA.h, esc = MA.esc, ui = MA.ui;
  const ID = 'settings';
  const TITLE = { en: 'Settings', ar: 'الإعدادات', fa: 'تنظیمات' };
  const t = (k, v) => MA.t(ID + '.' + k, v);

  MA.i18n.add({
    en: {
      'settings.sub': 'Contact details, opening hours and the plumbing behind the site. Most of these are site content, so they go live when you publish.',
      'settings.search': 'Search settings', 'settings.noMatch': 'No setting matches “{q}”.', 'settings.noMatchText': 'Try a plainer word, like email, hours or backup.', 'settings.clear': 'Clear search',
      'settings.readonly': 'Your role can read these settings but not change them.',
      'settings.pending': '{n} settings changes aren’t live yet.', 'settings.pendingOne': 'One settings change isn’t live yet.', 'settings.pendingText': 'The live site keeps the published values until you publish.', 'settings.review': 'Review and publish',
      'settings.nav': 'Settings sections', 'settings.k.search': 'Search settings',
      'settings.s.studio': 'Studio & contact', 'settings.s.studio.d': 'How clients reach you. Shown in Contact and in the business details Google reads.',
      'settings.s.hours': 'Opening hours', 'settings.s.hours.d': 'Drives the Lusail clock in the Studio section and the open or closed message under it.',
      'settings.s.form': 'Form delivery', 'settings.s.form.d': 'Where a brief goes when someone presses Send on the site.',
      'settings.s.analytics': 'Analytics', 'settings.s.analytics.d': 'Send the site’s events to an analytics service you own.',
      'settings.s.sections': 'Sections on the site', 'settings.s.sections.d': 'Drag to change the order, or switch a section off to hide it and its menu link. Nothing is deleted.',
      'settings.s.data': 'Admin data', 'settings.s.data.d': 'Everything the admin keeps in this browser: back it up, restore it or clear it.',
      'settings.s.about': 'About this admin', 'settings.s.about.d': 'Getting started, what is stored where, and how a change reaches the live site.',
      // studio & contact
      'settings.email': 'Studio email', 'settings.emailHint': 'Shown in Contact. Briefs are addressed here when the form uses the email app.',
      'settings.emailBad': 'This doesn’t look like an email address.', 'settings.emailEmpty': 'The brief form needs an address here.', 'settings.emailTest': 'Send a test email',
      'settings.wa': 'WhatsApp number', 'settings.waHint': 'Digits only, with the country code: 974 5555 1234 becomes 97455551234. Leave it empty to hide WhatsApp.',
      'settings.waDigits': 'The site uses the digits only: {n}', 'settings.waShort': 'That looks short for a number with a country code.', 'settings.waOpen': 'Test the WhatsApp link',
      'settings.label': 'Number as shown', 'settings.labelHint': 'How the number reads on the site. Leave it empty to show {n}.', 'settings.labelHintNone': 'How the number reads on the site, for example +974 5555 1234. It shows once there is a WhatsApp number.',
      'settings.where': 'Where these appear', 'settings.showContact': 'Show Contact in the preview',
      'settings.w.contact': 'Contact section', 'settings.w.contactBoth': 'An email link and a WhatsApp link.', 'settings.w.contactEmail': 'An email link. WhatsApp stays hidden until you add a number.',
      'settings.w.form': 'Brief form', 'settings.w.formMailto': 'Briefs open in the visitor’s email app, addressed to {email}.', 'settings.w.formService': 'Briefs go to your form service. If it fails, the email app opens instead, addressed to {email}.',
      'settings.w.copy': 'Site copy', 'settings.w.copyD': 'These lines fill in the address wherever they say {email}:', 'settings.w.copyNone': 'No site copy mentions {email} right now.',
      'settings.w.seo': 'Search results', 'settings.w.seoD': 'Email, phone and opening hours in the business details Google reads.', 'settings.w.seoLink': 'Open SEO settings',
      // hours
      'settings.nowIn': 'Right now in Lusail', 'settings.now.open': 'Open · closes {close}', 'settings.now.today': 'Closed · opens today at {open}', 'settings.now.tomorrow': 'Closed · opens tomorrow at {open}',
      'settings.now.later': 'Closed · opens {day} at {open}', 'settings.now.never': 'Closed · no opening days set', 'settings.visitorsSee': 'Visitors see', 'settings.editMessages': 'Edit the status messages',
      'settings.days': 'Open on', 'settings.daysHint': 'The week starts on Sunday, as it does in Qatar.', 'settings.daysNone': 'No days selected, so the site always says the studio is closed.',
      'settings.preset.sunThu': 'Sun–Thu', 'settings.preset.monFri': 'Mon–Fri', 'settings.preset.all': 'Every day',
      'settings.times': 'Hours', 'settings.opens': 'Opens', 'settings.closes': 'Closes', 'settings.timesHint': 'The weekly hours for every open day, on the {h}-hour clock. Special days below can change them.', 'settings.timesBad': 'Closing time has to be after opening time, or the site never shows “open”.',
      'settings.tz': 'Time zone', 'settings.tzHint': 'The clock and the open or closed message use this zone, wherever the visitor is.', 'settings.week': 'This week', 'settings.closed': 'Closed',
      // form delivery
      'settings.mode': 'How briefs arrive', 'settings.mode.mailto': 'Email app', 'settings.mode.service': 'Form service',
      'settings.mode.mailtoD': 'The site opens the visitor’s email app with the brief filled in, addressed to {email}. Nobody can tell whether they then press Send.',
      'settings.mode.serviceD': 'The site posts each brief to your form service and tells the visitor it’s sent. If the service fails, the email app opens instead.',
      'settings.funnelNote': 'Analytics names the last step of the funnel “{label}”.',
      'settings.endpoint': 'Form service address', 'settings.endpointHint': 'The URL your service gives you for receiving form posts. It starts with https://.',
      'settings.endpointBad': 'Use a full address that starts with https://.', 'settings.endpointEmpty': 'Paste the address from your form service. Until then, briefs still open in the email app.',
      'settings.detected': 'Looks like {name}', 'settings.toMailto': 'Briefs will open in the email app again.',
      'settings.providers': 'Services that work with the site', 'settings.cors': 'The service has to accept posts from other websites (CORS). When a test fails with a network error, that’s the usual reason.',
      'settings.pv.formspree': 'Free plan available. Emails you each brief. Create a form and copy its endpoint.',
      'settings.pv.web3forms': 'Expects an access key inside every post, which the site doesn’t send. Route it through Make or Zapier, or have a developer add the key.',
      'settings.pv.getform': 'Keeps briefs in a dashboard and can forward them by email.', 'settings.pv.basin': 'Spam filtering built in. Emails each brief.',
      'settings.pv.hook': 'Send briefs anywhere: a sheet, Slack, a CRM. Set the webhook to accept JSON.', 'settings.pv.hookName': 'Make or Zapier webhook', 'settings.visit': 'Open {name}',
      'settings.test': 'Send a test brief', 'settings.testHint': 'Posts a sample brief, marked as a test, to the address in your draft. Nothing is published.', 'settings.testNeeds': 'Add a valid https:// address to send a test.', 'settings.sending': 'Sending…',
      'settings.res.ok': 'Delivered · {code}', 'settings.res.http': 'Refused · {code}', 'settings.res.network': 'Network error', 'settings.res.timeout': 'No answer after {s} s',
      'settings.res.okD': 'The service accepted the test brief. Check its inbox or dashboard.', 'settings.res.httpD': 'The service answered but refused the brief. Its reply:',
      'settings.res.networkD': 'The request never reached the service. Check the address, and whether the service accepts posts from other sites (CORS).',
      'settings.log': 'Integrations log', 'settings.logEmpty': 'No test briefs sent yet.', 'settings.log.time': 'Time', 'settings.log.id': 'Request ID', 'settings.log.to': 'Sent to', 'settings.log.result': 'Result', 'settings.log.took': 'Took',
      'settings.retry': 'Retry', 'settings.copyId': 'Copy request ID', 'settings.clearLog': 'Clear the log', 'settings.logCleared': 'Log cleared.',
      'settings.payload': 'What the site sends', 'settings.payloadHint': 'Each brief is posted as JSON with these fields. A test also carries "test": true.', 'settings.ms': '{n} ms',
      // analytics
      'settings.provider': 'Analytics service', 'settings.p.none': 'None',
      'settings.p.noneD': 'The site sends no analytics.', 'settings.p.plausibleD': 'Privacy-friendly and cookie-free.',
      'settings.p.ga4D': 'Google’s free analytics. It sets cookies.', 'settings.p.umamiD': 'Open source. Use Umami Cloud or your own server.',
      'settings.id.plausible': 'Site domain', 'settings.id.ga4': 'Measurement ID', 'settings.id.umami': 'Website ID', 'settings.i.aid': 'Analytics ID',
      'settings.idHint.plausible': 'The domain exactly as you added it in Plausible, without https://.', 'settings.idHint.ga4': 'Starts with G-. Find it in Google Analytics under Admin → Data streams.', 'settings.idHint.umami': 'From the website’s settings in Umami: {n} characters with dashes.',
      'settings.idBad.plausible': 'Use the domain only, like mirasmarketing.com: no https:// and no path.', 'settings.idBad.ga4': 'A GA4 measurement ID looks like G-AB12CD34EF.',
      'settings.idUA': 'UA- IDs belong to Universal Analytics, which stopped collecting data in {y}. Use the G- ID instead.', 'settings.idBad.umami': 'An Umami website ID has {n} characters with dashes, like 4f9c2a1e-….',
      'settings.idOk': 'Format looks right.', 'settings.idMissing': 'Add the ID to start sending events. Until then the site loads nothing.',
      'settings.src': 'Script address (optional)', 'settings.srcHint': 'Only if you host {name} yourself. Left empty, the site loads {def}.',
      'settings.snippet': 'What the site adds to every page', 'settings.copySnippet': 'Copy',
      'settings.events': 'Events the site sends', 'settings.eventsNote': 'Names, emails and brief text never go to analytics. In Plausible, add each event as a custom goal to see it.',
      'settings.ev.event': 'Event', 'settings.ev.when': 'When', 'settings.ev.props': 'Details',
      'settings.ev.view': 'Someone opens the page.', 'settings.ev.journey': 'They pass 25, 50, 75 or 100% of the opening film.', 'settings.ev.swell': 'They tap a swell on or off.', 'settings.ev.section': 'A section scrolls into view.',
      'settings.ev.plan_to_brief': 'They add their plan to the brief.', 'settings.ev.make': 'They catch a word in What we make.', 'settings.ev.stage': 'They drag Mira to a stop in the process.', 'settings.ev.faq': 'They open a question.',
      'settings.ev.lang': 'They switch between English and Arabic.', 'settings.ev.brief': 'They send the brief, or open the email draft.', 'settings.ev.brief_copy': 'They copy the brief instead.',
      'settings.openAnalytics': 'Open Analytics',
      // sections
      'settings.sec.plan': 'The Services list: four groups of services, each with “Add to brief”, plus the button that adds the visitor’s plan to the brief.',
      'settings.sec.make': 'Words float past and a tap catches one for the brief.', 'settings.sec.why': 'Four promises, from a brand that works in full sun to a studio down the road in Lusail.',
      'settings.ev.service': 'They add or remove a service in the Services list.', 'settings.secName.plan': 'Services', 'settings.secName.poster': 'Tagline',
      'settings.sec.studio': 'The Lusail clock, today’s open or closed message and the address.', 'settings.sec.faq': 'The questions clients ask before they write.',
      'settings.sec.contact': 'The brief form, the email link and WhatsApp.', 'settings.sec.poster': 'The tagline band, set in type that moves like the tide.', 'settings.sec.other': 'A section the site added recently.', 'settings.sec.hidden': 'Hidden',
      'settings.sec.contactWarn': 'Contact is hidden, so “Add this plan to my brief” and “Start a project” hide too, and visitors have no form to send a brief.', 'settings.sec.shown': '{n} of {t} sections shown',
      // admin data
      'settings.usage': 'This browser holds {size} of admin data in {n} entries.', 'settings.usageFiles': '{n} uploaded files are kept apart, in IndexedDB.', 'settings.usageNoFiles': 'No uploaded files.',
      'settings.export': 'Export a backup', 'settings.exportD': 'One JSON file with the draft, team, briefs, history, preferences and uploaded files. It holds client details, so keep it somewhere safe.', 'settings.exported': 'Backup saved as {name}.',
      'settings.import': 'Restore a backup', 'settings.importD': 'Replaces everything the admin keeps in this browser with the backup, then reloads. You can undo it afterwards.', 'settings.drop': 'Drop a backup file here', 'settings.choose': 'Choose a file',
      'settings.bad.title': 'That file isn’t a MIRAS admin backup.', 'settings.bad.json': 'It isn’t valid JSON.', 'settings.bad.schema': 'It doesn’t have the backup’s structure.', 'settings.bad.keys': 'It holds entries the admin doesn’t own: {k}.',
      'settings.bad.newer': 'A newer version of the admin made it.', 'settings.bad.value': 'One entry is damaged: {k}.',
      'settings.importTitle': 'Restore this backup?', 'settings.importSummary': 'Exported {date} by {by}: {n} entries and {f} files.',
      'settings.importWarn': 'Everything the admin keeps in this browser is replaced, unpublished edits included. The admin keeps a copy of how things are now, so you can undo the restore.',
      'settings.importOk': 'Replace and reload', 'settings.restored': 'Backup restored. Reloading…', 'settings.restoreFail': 'The backup couldn’t be written ({e}). Nothing was changed.',
      'settings.evt.title': 'Site events in this browser', 'settings.evt.d': 'When you browse the site here, it keeps a log so the admin can show real activity.', 'settings.evt.count': '{n} events kept now.', 'settings.evt.none': 'No events kept yet.',
      'settings.evt.clear': 'Clear site events', 'settings.evt.cleared': 'Cleared {n} site events.',
      'settings.smp.title': 'Sample data', 'settings.smp.d': 'Clearly marked examples that fill charts, the inbox and the team until real data arrives.',
      'settings.smp.briefs': 'Sample briefs', 'settings.smp.people': 'Sample teammates', 'settings.smp.traffic': 'Sample traffic', 'settings.smp.on': 'On', 'settings.smp.off': 'Off',
      'settings.smp.clear': 'Clear sample data', 'settings.smp.cleared': 'Sample data cleared.', 'settings.smp.none': 'No sample data left.', 'settings.smp.showTraffic': 'Show sample traffic again',
      'settings.reset.title': 'Reset the admin', 'settings.reset.d': 'Erases the draft, team, briefs, history, preferences and uploads kept in this browser. The live site isn’t touched.',
      'settings.reset.btn': 'Reset the admin…', 'settings.reset.modal': 'Reset the admin in this browser?', 'settings.reset.warn': 'This erases everything below and reloads. It can’t be undone. The live site and assets/content.js stay as they are.',
      'settings.reset.list': '{changes} unpublished changes · {people} people · {briefs} briefs · {versions} saved versions · {files} uploaded files · your preferences',
      'settings.reset.type': 'Type RESET to confirm', 'settings.reset.site': 'Also clear the briefs and events the site kept in this browser', 'settings.reset.ok': 'Erase and reload',
      'settings.reset.exportFirst': 'Export a backup first', 'settings.reset.done': 'Admin reset. Reloading…', 'settings.noDataPerm': 'Your role can’t change admin data.',
      'settings.kb': '{n} KB', 'settings.mb': '{n} MB', 'settings.filesSkipped': 'This browser wouldn’t let the admin read the uploaded files, so the backup has everything else but not them.',
      // about
      'settings.store': 'What is stored where', 'settings.store.what': 'What', 'settings.store.where': 'Where',
      'settings.st.draft': 'Unpublished edits (the draft)', 'settings.st.here': 'This browser', 'settings.st.pub': 'Published content', 'settings.st.pubW': 'assets/content.js, next to the site',
      'settings.st.admin': 'Team, history, notifications and preferences', 'settings.st.files': 'Uploaded images', 'settings.st.filesW': 'This browser, in IndexedDB',
      'settings.st.briefs': 'Briefs and site events', 'settings.st.briefsW': 'Your email or form service. Copies stay in this browser when you test the site here.',
      'settings.st.visits': 'Visitor analytics', 'settings.st.visitsW': 'Your analytics service, if one is connected above',
      'settings.how': 'How publishing works',
      'settings.how.1': 'You edit. Every change saves to the draft in this browser and shows in the preview straight away.',
      'settings.how.2': 'You publish. The admin writes assets/content.js, holding only what differs from the defaults built into index.html.',
      'settings.how.3': 'You upload that file with the site. Visitors see the change on their next visit.',
      'settings.lastPub': 'Last published {when} by {by}.', 'settings.lastLive': 'It’s the file the site serves now.', 'settings.lastLocal': 'Published from this browser. Upload assets/content.js for it to go live.',
      'settings.neverPub': 'Nothing has been published from the admin yet. The site shows the defaults built into index.html.',
      'settings.docs': 'Read the guide (GUIDE.md)', 'settings.help': 'Help', 'settings.openPublish': 'Open publishing',
      // commands
      'settings.cmd.hours': 'Edit opening hours', 'settings.cmd.form': 'Set up form delivery', 'settings.cmd.analytics': 'Connect analytics', 'settings.cmd.sections': 'Show or hide site sections', 'settings.cmd.export': 'Export an admin backup',
      // special days, 24-hour times
      'settings.tm.hint': 'Hours and minutes on the {h}-hour clock. The arrow keys move it by {m} minutes.', 'settings.tm.bad': 'Use the {h}-hour clock, like {a} or {b}.',
      'settings.now.openFor': 'Open · {label} hours, closes {close}', 'settings.now.todayFor': 'Closed · opens today at {open} for {label}', 'settings.now.closedFor': 'Closed today for {label} · opens {day} at {open}',
      'settings.x.title': 'Special days', 'settings.x.hint': 'Holidays and short days win over the weekly hours on their dates, in the studio’s time zone. The site names the day in its open or closed message.',
      'settings.x.add': 'Add a day', 'settings.x.presets': 'Add a holiday', 'settings.x.p.ramadan': 'Ramadan hours (you set the dates)', 'settings.x.p.fitr': 'Eid al-Fitr', 'settings.x.p.adha': 'Eid al-Adha',
      'settings.x.p.national': 'Qatar National Day', 'settings.x.p.sport': 'National Sport Day', 'settings.x.est': 'Estimated from the Umm al-Qura calendar. Change the dates once they’re announced.',
      'settings.x.name': 'Name on the site', 'settings.x.from': 'First day', 'settings.x.to': 'Last day', 'settings.x.toHint': 'Leave it empty for a single day.', 'settings.x.closed': 'Closed', 'settings.x.hours': 'Special hours', 'settings.x.kind': 'That day',
      'settings.x.remove': 'Remove {name}', 'settings.x.removed': '{name} removed.', 'settings.x.added': '{name} added.', 'settings.x.there': '{name} is already on the list.', 'settings.x.unnamed': 'Special day',
      'settings.x.empty': 'No special days yet. Add Eid, National Day or Ramadan hours, so the site never says you’re open when you’re not.',
      'settings.x.noFrom': 'Add the first day. Until then the site ignores this entry.', 'settings.x.noLabel': 'Add a name in English and Arabic, so the site can say why.', 'settings.x.past': 'Past', 'settings.x.now': 'Today',
      'settings.x.weekly': 'Usual hours',
      // form fields
      'settings.ff.title': 'Fields on the brief form', 'settings.ff.d': 'Name, email, company and message are always there. These two are optional for visitors, and stay off until you switch them on.',
      'settings.ff.phone': 'Phone or WhatsApp', 'settings.ff.phoneD': 'Lets you answer a brief on WhatsApp straight from the inbox.',
      'settings.ff.budget': 'Budget', 'settings.ff.budgetD': 'A short list of ranges to pick from. The brief keeps the English range, whatever language the visitor used.',
      'settings.ff.ranges': 'Budget ranges', 'settings.ff.add': 'Add a range', 'settings.ff.en': 'English', 'settings.ff.ar': 'Arabic', 'settings.ff.rangeN': 'Range {n}',
      'settings.ff.remove': 'Remove range {n}', 'settings.ff.move': 'Move range {n}. Use the up and down arrow keys.', 'settings.ff.moved': 'Range moved to position {n}.', 'settings.ff.removed': 'Range removed.',
      'settings.ff.empty': 'Fill in both languages, or remove the empty range.', 'settings.ff.none': 'No ranges yet, so the budget field stays hidden.', 'settings.ff.labels': 'Edit the field labels',
      // privacy & consent
      'settings.s.privacy': 'Privacy & consent', 'settings.s.privacy.d': 'What visitors are asked, what they can read, and how the form keeps spam out.',
      'settings.cs.title': 'Ask before analytics', 'settings.cs.what': 'When this is on, the site shows a small bar on a visitor’s first page: allow analytics, or no thanks. Analytics load only after they allow it, and their choice is remembered in their browser. People who say no aren’t counted, so your numbers read lower than real traffic.',
      'settings.cs.locked': 'Always on while an analytics service is connected: the site’s privacy and cookie policies promise that analytics run only after a visitor agrees.',
      'settings.cs.none': 'No analytics service is connected, so there’s nothing to ask about yet. This switches on by itself when you connect one.',
      'settings.cs.needsFix': 'Analytics load without asking until someone who can edit settings opens this page.', 'settings.cs.turnedOn': 'Visitors will be asked before analytics load, as the privacy policy promises.',
      'settings.cs.wording': 'Edit the bar’s wording', 'settings.cs.lock': 'Locked on',
      'settings.pv.title': 'Privacy notice link', 'settings.pv.hint': 'Shown under the Send button and in the consent bar. A page on the site, like {ex}, or a full https:// address.',
      'settings.pv.bad': 'Use a page on the site, like {ex}, or a full address that starts with https://.', 'settings.pv.empty': 'With no link, visitors can’t read how you handle their details before they send a brief.', 'settings.pv.open': 'Open the page',
      'settings.sp.title': 'Spam protection', 'settings.sp.on': 'Always on',
      'settings.sp.d': 'Every brief passes two quiet checks: a hidden field that only bots fill in, and at least {s} seconds between opening the page and pressing Send. A blocked brief sees the normal thank-you screen, and nothing is sent or kept.',
      'settings.sp.service': 'Your form service may filter more on its side (Basin and Formspree do).', 'settings.sp.blocked': 'Blocked in this browser so far: {n}',
      // analytics, honestly
      'settings.an.real': 'Real numbers live in {name}', 'settings.an.realD': 'The admin never fetches numbers from {name}. Its charts show sample data and visits made in this browser. Open {name} for the real count, or add a shared dashboard link below to see it on the Analytics page.',
      'settings.an.none': 'Nobody counts real visitors yet', 'settings.an.noneD': 'The admin’s charts show sample data and visits made in this browser only.',
      'settings.an.share': 'Shared dashboard link', 'settings.an.shareHint.plausible': 'In Plausible: {path}.', 'settings.an.shareHint.umami': 'In Umami: {path}.',
      'settings.an.shareHint.ga4': 'GA4 has no shared dashboard. A Looker Studio report works: {path}.',
      'settings.an.shareNote': 'Kept in this browser only and never published. Anyone with the link can see your numbers, so share it with care.', 'settings.an.shareOk': 'The Analytics page can show this dashboard.', 'settings.an.shareBad': 'Use the full link, starting with https://.',
      'settings.an.shareSaved': 'Shared dashboard link saved.', 'settings.an.shareCleared': 'Shared dashboard link removed.', 'settings.an.asked': 'Visitors are asked before analytics load.',
      'settings.ev.work': 'They open a project in the work section.', 'settings.ev.brief_blocked': 'Spam protection stops a brief.', 'settings.ev.consent': 'They allow analytics in the consent bar. A “no” is never sent.',
      // sections, order
      'settings.sec.work': 'Concept projects that show how the studio thinks, with a link to all work.', 'settings.sec.order': 'Section order', 'settings.sec.first': 'Always first', 'settings.sec.last': 'Always last',
      'settings.sec.filmD': 'The opening film, with the swell picker and how we work.', 'settings.sec.footD': 'Contact links, legal pages and the tagline.',
      'settings.sec.move': 'Move {name}. Use the up and down arrow keys.', 'settings.sec.moved': '{name} is now number {n} of {t}.', 'settings.sec.resetOrder': 'Reset the order', 'settings.sec.orderChanged': 'Order changed',
      // backups
      'settings.bk.title': 'Backups', 'settings.bk.last': 'Last backup {ago}.', 'settings.bk.never': 'No backup yet.', 'settings.bk.due': 'Due',
      'settings.bk.why': 'Everything here lives only in this browser. A backup is the copy that survives clearing the browser, a new laptop or a lost one.', 'settings.bk.now': 'Back up now',
      'settings.bk.folder': 'Automatic backups', 'settings.bk.folderD': 'Choose a folder that syncs, like iCloud Drive, Dropbox or Google Drive. Every publish saves a backup into its {dir} folder, and the admin adds one a day while it’s open.',
      'settings.bk.notSite': 'Don’t pick the website folder: everything in it is uploaded with the site, and a backup holds client details.',
      'settings.bk.choose': 'Choose a folder in Publish & history', 'settings.bk.on': 'On · saving to “{name}”', 'settings.bk.lastAuto': 'Last automatic backup {ago}.',
      'settings.bk.autoFail': 'The last automatic backup didn’t save: {why}', 'settings.bk.why.perm': 'the browser needs your permission again.', 'settings.bk.why.gone': 'the folder can’t be found.', 'settings.bk.why.error': 'the browser refused to write the file.',
      'settings.bk.allow': 'Allow and back up', 'settings.bk.saveNow': 'Save a backup there now', 'settings.bk.noFs': 'This browser can’t save to a folder by itself (Chrome and Edge can). Use Back up now and keep the file somewhere safe.',
      'settings.bk.saved': 'Backup saved to “{name}”.',
      'settings.bk.keep': 'Keep this data', 'settings.bk.kept': 'This browser has agreed to keep the admin’s data, even when space runs low.',
      'settings.bk.notKept': 'This browser may clear the admin’s data when space runs low. Ask it to keep the data. Some browsers only agree once the admin is bookmarked or installed.',
      'settings.bk.unknown': 'This browser doesn’t say whether it keeps the data, so back up regularly.', 'settings.bk.ask': 'Ask the browser to keep it', 'settings.bk.askNo': 'The browser said no for now, so backups matter all the more.',
      // restore, safely
      'settings.bad.shape': 'One entry has the wrong shape: {k}.', 'settings.bad.draft': 'The draft inside it can’t be read.', 'settings.bad.noTeam': 'It has no team, so nobody could open the admin.',
      'settings.snap.title': 'Restore without a way back?', 'settings.snap.text': 'This browser couldn’t keep a copy of how things are now, so this restore can’t be undone. Export a backup first if you might need it.',
      'settings.rs.undo': 'Undo restore', 'settings.rs.undone': 'Restore undone. The admin is back to how it was.', 'settings.rs.rolledBack': 'That backup couldn’t be opened, so the admin went back to how it was. Nothing was lost.',
      'settings.rs.done': 'Backup restored.', 'settings.rs.row': 'You restored a backup {ago}.', 'settings.rs.rowD': 'Undo it to go back to how the admin was before. Changes made since the restore are lost.',
      'settings.rs.confirm': 'Undo the restore?', 'settings.rs.keep': 'Keep the restored data', 'settings.rs.broken': 'The restored backup couldn’t be opened, and there is no copy to go back to.', 'settings.rs.clear': 'Clear it and start fresh',
      // getting started, help
      'settings.gs.title': 'Getting started', 'settings.gs.progress': '{done} of {total} done', 'settings.gs.banner': 'Getting started: {done} of {total} done.', 'settings.gs.see': 'See the checklist', 'settings.gs.hide': 'Hide', 'settings.gs.hidden': 'Checklist hidden. It stays in Settings › About.',
      'settings.gs.all': 'All set: the admin and the site are working for real.', 'settings.gs.done': 'Done', 'settings.gs.todo': 'To do',
      'settings.gs.folder': 'Connect the website folder', 'settings.gs.folderD': 'Publishing then writes assets/content.js straight into the site.',
      'settings.gs.email': 'Check the studio email', 'settings.gs.emailD': 'Briefs and the Contact section use it.', 'settings.gs.emailOk': 'It’s right', 'settings.gs.emailEdit': 'Edit the email',
      'settings.gs.form': 'Set up a form service', 'settings.gs.formD': 'So briefs arrive even when a visitor has no email app.', 'settings.gs.formDo': 'Set up the form',
      'settings.gs.analytics': 'Connect analytics', 'settings.gs.analyticsD': 'To count real visitors.',
      'settings.gs.publish': 'Publish for the first time', 'settings.gs.publishD': 'So your edits reach the live site.',
      'settings.gs.backup': 'Make a first backup', 'settings.gs.backupD': 'Everything here lives in this browser only.',
      'settings.docsD': 'How briefs arrive, how publishing works, backups, roles and limits. The guide is in English.', 'settings.cmd.start': 'Getting started checklist',
      'settings.bk.manage': 'Change it in Publish & history', 'settings.bk.none': 'No backup folder yet.',
    },
    ar: {
      'settings.sub': 'بيانات التواصل وساعات العمل وما يعمل خلف الموقع. معظمها جزء من محتوى الموقع، فتظهر للزوّار بعد النشر.',
      'settings.search': 'ابحث في الإعدادات', 'settings.noMatch': 'لا يوجد إعداد يطابق «{q}».', 'settings.noMatchText': 'جرّب كلمة أبسط، مثل البريد أو الساعات أو النسخة الاحتياطية.', 'settings.clear': 'امسح البحث',
      'settings.readonly': 'يستطيع دورك الاطلاع على هذه الإعدادات دون تغييرها.',
      'settings.pending': 'تعديلات في الإعدادات لم تُنشر بعد: {n}.', 'settings.pendingOne': 'تعديل واحد في الإعدادات لم يُنشر بعد.', 'settings.pendingText': 'يبقى الموقع على القيم المنشورة إلى أن تنشر.', 'settings.review': 'راجِع وانشر',
      'settings.nav': 'أقسام الإعدادات', 'settings.k.search': 'ابحث في الإعدادات',
      'settings.s.studio': 'الاستوديو والتواصل', 'settings.s.studio.d': 'كيف يصل إليك العملاء. يظهر في قسم التواصل وفي بيانات النشاط التي يقرؤها Google.',
      'settings.s.hours': 'ساعات العمل', 'settings.s.hours.d': 'تتحكم في ساعة لوسيل في قسم الاستوديو وفي رسالة «مفتوح» أو «مغلق» تحتها.',
      'settings.s.form': 'استلام الطلبات', 'settings.s.form.d': 'إلى أين يذهب الطلب عندما يضغط الزائر «إرسال» في الموقع.',
      'settings.s.analytics': 'التحليلات', 'settings.s.analytics.d': 'أرسل أحداث الموقع إلى خدمة تحليلات تملكها.',
      'settings.s.sections': 'أقسام الموقع', 'settings.s.sections.d': 'اسحب لتغيير الترتيب، أو أوقف قسماً لإخفائه مع رابطه في القائمة. لا يُحذف شيء.',
      'settings.s.data': 'بيانات لوحة الإدارة', 'settings.s.data.d': 'كل ما تحفظه لوحة الإدارة في هذا المتصفح: انسخه احتياطياً أو استعده أو امسحه.',
      'settings.s.about': 'عن لوحة الإدارة', 'settings.s.about.d': 'خطوات البداية، وما الذي يُحفظ وأين، وكيف يصل التعديل إلى الموقع.',
      'settings.email': 'بريد الاستوديو', 'settings.emailHint': 'يظهر في قسم التواصل، وتُوجَّه إليه الطلبات عندما يعتمد النموذج على تطبيق البريد.',
      'settings.emailBad': 'لا يبدو هذا عنوان بريد إلكتروني.', 'settings.emailEmpty': 'يحتاج نموذج الطلب إلى عنوان هنا.', 'settings.emailTest': 'أرسل بريداً تجريبياً',
      'settings.wa': 'رقم واتساب', 'settings.waHint': 'أرقام فقط مع رمز الدولة: ‎974 5555 1234‎ يصبح ‎97455551234‎. اتركه فارغاً لإخفاء واتساب.',
      'settings.waDigits': 'يستخدم الموقع الأرقام فقط: {n}', 'settings.waShort': 'يبدو الرقم قصيراً إذا كان يتضمن رمز الدولة.', 'settings.waOpen': 'جرّب رابط واتساب',
      'settings.label': 'الرقم كما يظهر', 'settings.labelHint': 'طريقة كتابة الرقم في الموقع. اتركه فارغاً ليظهر {n}.', 'settings.labelHintNone': 'طريقة كتابة الرقم في الموقع، مثل ‎+974 5555 1234‎. يظهر بعد إضافة رقم واتساب.',
      'settings.where': 'أين تظهر', 'settings.showContact': 'اعرض قسم التواصل في المعاينة',
      'settings.w.contact': 'قسم التواصل', 'settings.w.contactBoth': 'رابط للبريد ورابط لواتساب.', 'settings.w.contactEmail': 'رابط للبريد. يبقى واتساب مخفياً إلى أن تضيف رقماً.',
      'settings.w.form': 'نموذج الطلب', 'settings.w.formMailto': 'تُفتح الطلبات في تطبيق البريد لدى الزائر، موجّهة إلى {email}.', 'settings.w.formService': 'تذهب الطلبات إلى خدمة النماذج. وإن تعذّر ذلك يُفتح تطبيق البريد موجّهاً إلى {email}.',
      'settings.w.copy': 'نصوص الموقع', 'settings.w.copyD': 'تضع هذه النصوص العنوان مكان {email}:', 'settings.w.copyNone': 'لا يذكر أي نص في الموقع {email} حالياً.',
      'settings.w.seo': 'نتائج البحث', 'settings.w.seoD': 'البريد والهاتف وساعات العمل ضمن بيانات النشاط التي يقرؤها Google.', 'settings.w.seoLink': 'افتح إعدادات الظهور في البحث',
      'settings.nowIn': 'الآن في لوسيل', 'settings.now.open': 'مفتوح · يغلق الساعة {close}', 'settings.now.today': 'مغلق · يفتح اليوم الساعة {open}', 'settings.now.tomorrow': 'مغلق · يفتح غداً الساعة {open}',
      'settings.now.later': 'مغلق · يفتح يوم {day} الساعة {open}', 'settings.now.never': 'مغلق · لم تُحدَّد أيام عمل', 'settings.visitorsSee': 'يرى الزوّار', 'settings.editMessages': 'عدّل رسائل الحالة',
      'settings.days': 'أيام العمل', 'settings.daysHint': 'يبدأ الأسبوع يوم الأحد كما في قطر.', 'settings.daysNone': 'لم تختر أي يوم، فسيقول الموقع دائماً إن الاستوديو مغلق.',
      'settings.preset.sunThu': 'الأحد–الخميس', 'settings.preset.monFri': 'الاثنين–الجمعة', 'settings.preset.all': 'كل يوم',
      'settings.times': 'الساعات', 'settings.opens': 'يفتح', 'settings.closes': 'يغلق', 'settings.timesHint': 'ساعات الأسبوع لكل أيام العمل، بنظام {h} ساعة. ويمكن للأيام الخاصة أدناه أن تغيّرها.', 'settings.timesBad': 'يجب أن يأتي وقت الإغلاق بعد وقت الفتح، وإلا فلن يظهر «مفتوح» في الموقع أبداً.',
      'settings.tz': 'المنطقة الزمنية', 'settings.tzHint': 'تعتمد الساعة ورسالة الحالة على هذه المنطقة أينما كان الزائر.', 'settings.week': 'هذا الأسبوع', 'settings.closed': 'مغلق',
      'settings.mode': 'كيف تصل الطلبات', 'settings.mode.mailto': 'تطبيق البريد', 'settings.mode.service': 'خدمة نماذج',
      'settings.mode.mailtoD': 'يفتح الموقع تطبيق البريد لدى الزائر والطلب مكتوب، موجّهاً إلى {email}. ولا يمكن معرفة إن كان سيضغط «إرسال» بعدها.',
      'settings.mode.serviceD': 'يرسل الموقع كل طلب إلى خدمة النماذج ويخبر الزائر بأنه أُرسل. وإن تعذّر ذلك يُفتح تطبيق البريد بدلاً منها.',
      'settings.funnelNote': 'تسمّي صفحة التحليلات الخطوة الأخيرة في مسار التحويل «{label}».',
      'settings.endpoint': 'عنوان خدمة النماذج', 'settings.endpointHint': 'الرابط الذي تمنحك إياه الخدمة لاستقبال النماذج، ويبدأ بـ ‎https://‎.',
      'settings.endpointBad': 'استخدم عنواناً كاملاً يبدأ بـ ‎https://‎.', 'settings.endpointEmpty': 'الصق العنوان من خدمة النماذج. وإلى ذلك الحين تُفتح الطلبات في تطبيق البريد.',
      'settings.detected': 'يبدو أنه {name}', 'settings.toMailto': 'ستُفتح الطلبات في تطبيق البريد من جديد.',
      'settings.providers': 'خدمات تعمل مع الموقع', 'settings.cors': 'يجب أن تقبل الخدمة الطلبات من مواقع أخرى (CORS). وإذا فشل الاختبار بخطأ في الشبكة فهذا هو السبب غالباً.',
      'settings.pv.formspree': 'لديها خطة مجانية، وترسل إليك كل طلب بالبريد. أنشئ نموذجاً وانسخ عنوانه.',
      'settings.pv.web3forms': 'تتطلب مفتاح وصول داخل كل طلب، والموقع لا يرسله. مرّرها عبر Make أو Zapier، أو اطلب من مطوّر إضافة المفتاح.',
      'settings.pv.getform': 'تحفظ الطلبات في لوحة وتستطيع تحويلها بالبريد.', 'settings.pv.basin': 'فيها تصفية للرسائل المزعجة، وترسل كل طلب بالبريد.',
      'settings.pv.hook': 'أرسل الطلبات إلى أي مكان: جدول أو Slack أو نظام CRM. اضبط الـ webhook ليقبل JSON.', 'settings.pv.hookName': 'Webhook من Make أو Zapier', 'settings.visit': 'افتح {name}',
      'settings.test': 'أرسل طلباً تجريبياً', 'settings.testHint': 'يرسل طلباً تجريبياً واضح العلامة إلى العنوان الموجود في المسودة. لا يُنشر شيء.', 'settings.testNeeds': 'أضف عنوان ‎https://‎ صالحاً لإرسال اختبار.', 'settings.sending': 'جارٍ الإرسال…',
      'settings.res.ok': 'وصل · {code}', 'settings.res.http': 'رُفض · {code}', 'settings.res.network': 'خطأ في الشبكة', 'settings.res.timeout': 'لا ردّ بعد {s} ثانية',
      'settings.res.okD': 'قبلت الخدمة الطلب التجريبي. تحقّق من بريدها أو لوحتها.', 'settings.res.httpD': 'ردّت الخدمة لكنها رفضت الطلب. ردّها:',
      'settings.res.networkD': 'لم يصل الطلب إلى الخدمة. تحقّق من العنوان، ومن أن الخدمة تقبل الطلبات من مواقع أخرى (CORS).',
      'settings.log': 'سجل الربط', 'settings.logEmpty': 'لم تُرسل طلبات تجريبية بعد.', 'settings.log.time': 'الوقت', 'settings.log.id': 'معرّف الطلب', 'settings.log.to': 'أُرسل إلى', 'settings.log.result': 'النتيجة', 'settings.log.took': 'المدة',
      'settings.retry': 'أعد المحاولة', 'settings.copyId': 'انسخ معرّف الطلب', 'settings.clearLog': 'امسح السجل', 'settings.logCleared': 'مُسح السجل.',
      'settings.payload': 'ما يرسله الموقع', 'settings.payloadHint': 'يُرسل كل طلب بصيغة JSON بهذه الحقول، ويحمل الاختبار أيضاً "test": true.', 'settings.ms': '{n} ملّي ثانية',
      'settings.provider': 'خدمة التحليلات', 'settings.p.none': 'بلا',
      'settings.p.noneD': 'لا يرسل الموقع أي تحليلات.', 'settings.p.plausibleD': 'تحترم الخصوصية ولا تستخدم ملفات تعريف الارتباط.',
      'settings.p.ga4D': 'تحليلات Google المجانية، وتستخدم ملفات تعريف الارتباط.', 'settings.p.umamiD': 'مفتوحة المصدر. استخدم Umami Cloud أو خادمك الخاص.',
      'settings.id.plausible': 'نطاق الموقع', 'settings.id.ga4': 'معرّف القياس', 'settings.id.umami': 'معرّف الموقع', 'settings.i.aid': 'معرّف التحليلات',
      'settings.idHint.plausible': 'النطاق كما أضفته في Plausible تماماً، دون ‎https://‎.', 'settings.idHint.ga4': 'يبدأ بـ G-. تجده في Google Analytics ضمن ⁦Admin → Data streams⁩.', 'settings.idHint.umami': 'من إعدادات الموقع في Umami: {n} حرفاً مع شرطات.',
      'settings.idBad.plausible': 'استخدم النطاق وحده، مثل mirasmarketing.com، دون ‎https://‎ ودون مسار.', 'settings.idBad.ga4': 'معرّف القياس في GA4 يشبه G-AB12CD34EF.',
      'settings.idUA': 'معرّفات UA- تخص Universal Analytics التي توقفت عن جمع البيانات عام {y}. استخدم معرّف G- بدلاً منها.', 'settings.idBad.umami': 'معرّف الموقع في Umami من {n} حرفاً مع شرطات، مثل ‎4f9c2a1e-…‎.',
      'settings.idOk': 'الصيغة تبدو صحيحة.', 'settings.idMissing': 'أضف المعرّف لبدء إرسال الأحداث. وحتى ذلك الحين لا يحمّل الموقع شيئاً.',
      'settings.src': 'عنوان السكربت (اختياري)', 'settings.srcHint': 'فقط إذا كنت تستضيف {name} بنفسك. إن تركته فارغاً يحمّل الموقع {def}.',
      'settings.snippet': 'ما يضيفه الموقع إلى كل صفحة', 'settings.copySnippet': 'نسخ',
      'settings.events': 'الأحداث التي يرسلها الموقع', 'settings.eventsNote': 'لا تُرسل الأسماء ولا عناوين البريد ولا نص الطلب إلى التحليلات. في Plausible أضف كل حدث كهدف مخصّص لتراه.',
      'settings.ev.event': 'الحدث', 'settings.ev.when': 'متى', 'settings.ev.props': 'التفاصيل',
      'settings.ev.view': 'يفتح أحدهم الصفحة.', 'settings.ev.journey': 'يتجاوز ‎25‎ أو ‎50‎ أو ‎75‎ أو ‎100‎٪ من الفيلم الافتتاحي.', 'settings.ev.swell': 'يختار موجة أو يلغي اختيارها.', 'settings.ev.section': 'يظهر قسم على الشاشة.',
      'settings.ev.plan_to_brief': 'يضيف خطته إلى الطلب.', 'settings.ev.make': 'يلتقط كلمة في «ما نصنعه».', 'settings.ev.stage': 'يسحب ميرا إلى إحدى محطات طريقتنا.', 'settings.ev.faq': 'يفتح سؤالاً.',
      'settings.ev.lang': 'يبدّل بين الإنجليزية والعربية.', 'settings.ev.brief': 'يرسل الطلب، أو يفتح مسودة البريد.', 'settings.ev.brief_copy': 'ينسخ الطلب بدلاً من ذلك.',
      'settings.openAnalytics': 'افتح التحليلات',
      'settings.sec.plan': 'قائمة الخدمات: أربع مجموعات من الخدمات، لكل منها زر «أضف إلى الطلب»، إضافة إلى الزر الذي يضيف خطة الزائر إلى طلبه.',
      'settings.sec.make': 'كلمات تطفو، ونقرة تلتقط إحداها وتضيفها إلى الطلب.', 'settings.sec.why': 'أربعة وعود، من علامة تعمل تحت الشمس الساطعة إلى استوديو قريب منك في لوسيل.',
      'settings.ev.service': 'يضيف خدمة من قائمة الخدمات أو يزيلها.', 'settings.secName.plan': 'الخدمات', 'settings.secName.poster': 'الشعار',
      'settings.sec.studio': 'ساعة لوسيل، ورسالة اليوم بأن الاستوديو مفتوح أو مغلق، والعنوان.', 'settings.sec.faq': 'الأسئلة التي يطرحها العملاء قبل أن يراسلوك.',
      'settings.sec.contact': 'نموذج الطلب ورابط البريد وواتساب.', 'settings.sec.poster': 'شريط الشعار، بخط يتحرك مع المدّ.', 'settings.sec.other': 'قسم أضافه الموقع مؤخراً.', 'settings.sec.hidden': 'مخفي',
      'settings.sec.contactWarn': 'قسم التواصل مخفي، لذا يختفي زرّا «أضف هذه الخطة إلى طلبي» و«ابدأ مشروعاً» أيضاً، ولا يبقى للزائر نموذج يرسل منه طلبه.', 'settings.sec.shown': 'الأقسام الظاهرة: {n} من {t}',
      'settings.usage': 'حجم بيانات لوحة الإدارة في هذا المتصفح: {size}، في {n} من المُدخلات.', 'settings.usageFiles': 'الملفات المرفوعة محفوظة على حدة في IndexedDB، وعددها {n}.', 'settings.usageNoFiles': 'لا ملفات مرفوعة.',
      'settings.export': 'صدّر نسخة احتياطية', 'settings.exportD': 'ملف JSON واحد فيه المسودة والفريق والطلبات والسجل والتفضيلات والملفات المرفوعة. يحتوي بيانات العملاء، فاحفظه في مكان آمن.', 'settings.exported': 'حُفظت النسخة الاحتياطية باسم {name}.',
      'settings.import': 'استعد نسخة احتياطية', 'settings.importD': 'يستبدل كل ما تحفظه لوحة الإدارة في هذا المتصفح بمحتوى النسخة، ثم يعيد التحميل. ويمكنك التراجع عن ذلك بعدها.', 'settings.drop': 'أفلت ملف النسخة الاحتياطية هنا', 'settings.choose': 'اختر ملفاً',
      'settings.bad.title': 'هذا الملف ليس نسخة احتياطية من لوحة ميراس.', 'settings.bad.json': 'ليس ملف JSON صالحاً.', 'settings.bad.schema': 'لا يحمل بنية النسخة الاحتياطية.', 'settings.bad.keys': 'فيه مُدخلات لا تخص لوحة الإدارة: {k}.',
      'settings.bad.newer': 'أنشأه إصدار أحدث من لوحة الإدارة.', 'settings.bad.value': 'أحد المُدخلات تالف: {k}.',
      'settings.importTitle': 'استعادة هذه النسخة؟', 'settings.importSummary': 'صُدّرت في {date} بواسطة {by}: {n} من المُدخلات و{f} من الملفات.',
      'settings.importWarn': 'سيُستبدل كل ما تحفظه لوحة الإدارة في هذا المتصفح، بما فيه التعديلات غير المنشورة. وتحتفظ اللوحة بنسخة من الحالة الحالية لتتمكن من التراجع عن الاستعادة.',
      'settings.importOk': 'استبدل وأعد التحميل', 'settings.restored': 'استُعيدت النسخة. جارٍ إعادة التحميل…', 'settings.restoreFail': 'تعذّرت كتابة النسخة ({e}). لم يتغير شيء.',
      'settings.evt.title': 'أحداث الموقع في هذا المتصفح', 'settings.evt.d': 'عند تصفّح الموقع من هنا يحتفظ بسجل لتعرض لوحة الإدارة نشاطاً حقيقياً.', 'settings.evt.count': 'عدد الأحداث المحفوظة الآن: {n}.', 'settings.evt.none': 'لا أحداث محفوظة بعد.',
      'settings.evt.clear': 'امسح أحداث الموقع', 'settings.evt.cleared': 'مُسحت أحداث الموقع ({n}).',
      'settings.smp.title': 'البيانات التجريبية', 'settings.smp.d': 'أمثلة واضحة العلامة تملأ الرسوم وصندوق الوارد والفريق حتى تصل البيانات الحقيقية.',
      'settings.smp.briefs': 'طلبات تجريبية', 'settings.smp.people': 'أعضاء تجريبيون', 'settings.smp.traffic': 'زيارات تجريبية', 'settings.smp.on': 'مفعّلة', 'settings.smp.off': 'متوقفة',
      'settings.smp.clear': 'امسح البيانات التجريبية', 'settings.smp.cleared': 'مُسحت البيانات التجريبية.', 'settings.smp.none': 'لم تبقَ بيانات تجريبية.', 'settings.smp.showTraffic': 'أعد عرض الزيارات التجريبية',
      'settings.reset.title': 'إعادة ضبط لوحة الإدارة', 'settings.reset.d': 'يمحو المسودة والفريق والطلبات والسجل والتفضيلات والملفات المرفوعة في هذا المتصفح. ولا يمسّ الموقع المنشور.',
      'settings.reset.btn': 'أعد ضبط لوحة الإدارة…', 'settings.reset.modal': 'إعادة ضبط لوحة الإدارة في هذا المتصفح؟', 'settings.reset.warn': 'سيُمحى كل ما يلي ثم يُعاد التحميل. لا يمكن التراجع عن ذلك. يبقى الموقع وملف assets/content.js كما هما.',
      'settings.reset.list': 'تعديلات غير منشورة: {changes} · أشخاص: {people} · طلبات: {briefs} · إصدارات محفوظة: {versions} · ملفات مرفوعة: {files} · تفضيلاتك',
      'settings.reset.type': 'اكتب RESET للتأكيد', 'settings.reset.site': 'امسح أيضاً الطلبات والأحداث التي حفظها الموقع في هذا المتصفح', 'settings.reset.ok': 'امسح وأعد التحميل',
      'settings.reset.exportFirst': 'صدّر نسخة احتياطية أولاً', 'settings.reset.done': 'أُعيد ضبط اللوحة. جارٍ إعادة التحميل…', 'settings.noDataPerm': 'دورك لا يسمح بتغيير بيانات لوحة الإدارة.',
      'settings.kb': '{n} ك.ب', 'settings.mb': '{n} م.ب', 'settings.filesSkipped': 'لم يسمح هذا المتصفح بقراءة الملفات المرفوعة، فالنسخة الاحتياطية تضم كل شيء ما عداها.',
      'settings.store': 'ما الذي يُحفظ وأين', 'settings.store.what': 'ماذا', 'settings.store.where': 'أين',
      'settings.st.draft': 'التعديلات غير المنشورة (المسودة)', 'settings.st.here': 'هذا المتصفح', 'settings.st.pub': 'المحتوى المنشور', 'settings.st.pubW': 'ملف assets/content.js بجانب الموقع',
      'settings.st.admin': 'الفريق والسجل والإشعارات والتفضيلات', 'settings.st.files': 'الصور المرفوعة', 'settings.st.filesW': 'هذا المتصفح، في IndexedDB',
      'settings.st.briefs': 'الطلبات وأحداث الموقع', 'settings.st.briefsW': 'بريدك أو خدمة النماذج. وتبقى نسخ في هذا المتصفح عند تجربة الموقع منه.',
      'settings.st.visits': 'تحليلات الزوّار', 'settings.st.visitsW': 'خدمة التحليلات التي تربطها أعلاه، إن وُجدت',
      'settings.how': 'كيف يعمل النشر',
      'settings.how.1': 'تعدّل، فيُحفظ كل تغيير في المسودة داخل هذا المتصفح ويظهر في المعاينة فوراً.',
      'settings.how.2': 'تنشر، فتكتب لوحة الإدارة ملف assets/content.js الذي يحمل ما يختلف عن القيم الأصلية في index.html فقط.',
      'settings.how.3': 'ترفع هذا الملف مع الموقع، فيرى الزوّار التغيير في زيارتهم التالية.',
      'settings.lastPub': 'آخر نشر {when} بواسطة {by}.', 'settings.lastLive': 'وهو الملف الذي يعرضه الموقع الآن.', 'settings.lastLocal': 'نُشر من هذا المتصفح. ارفع ملف assets/content.js ليظهر في الموقع.',
      'settings.neverPub': 'لم يُنشر شيء من لوحة الإدارة بعد، ويعرض الموقع القيم الأصلية في index.html.',
      'settings.docs': 'اقرأ الدليل (GUIDE.md)', 'settings.help': 'المساعدة', 'settings.openPublish': 'افتح النشر',
      'settings.cmd.hours': 'عدّل ساعات العمل', 'settings.cmd.form': 'اضبط استلام الطلبات', 'settings.cmd.analytics': 'اربط التحليلات', 'settings.cmd.sections': 'أظهر أقسام الموقع أو أخفِها', 'settings.cmd.export': 'صدّر نسخة احتياطية من لوحة الإدارة',
      'settings.tm.hint': 'الساعات والدقائق بنظام {h} ساعة. وتحرّك مفاتيح الأسهم الوقت {m} دقيقة.', 'settings.tm.bad': 'استخدم نظام {h} ساعة، مثل {a} أو {b}.',
      'settings.now.openFor': 'مفتوح · دوام {label}، يغلق الساعة {close}', 'settings.now.todayFor': 'مغلق · يفتح اليوم الساعة {open} بدوام {label}', 'settings.now.closedFor': 'مغلق اليوم بمناسبة {label} · يفتح يوم {day} الساعة {open}',
      'settings.x.title': 'الأيام الخاصة', 'settings.x.hint': 'تتقدّم العطل والأيام القصيرة على ساعات الأسبوع في تواريخها، بتوقيت الاستوديو. ويذكر الموقع اسم المناسبة في رسالة «مفتوح» أو «مغلق».',
      'settings.x.add': 'أضف يوماً', 'settings.x.presets': 'أضف مناسبة', 'settings.x.p.ramadan': 'دوام رمضان (تحدّد التواريخ بنفسك)', 'settings.x.p.fitr': 'عيد الفطر', 'settings.x.p.adha': 'عيد الأضحى',
      'settings.x.p.national': 'اليوم الوطني لقطر', 'settings.x.p.sport': 'اليوم الرياضي للدولة', 'settings.x.est': 'تواريخ تقديرية من تقويم أم القرى. عدّلها عند الإعلان الرسمي.',
      'settings.x.name': 'الاسم في الموقع', 'settings.x.from': 'اليوم الأول', 'settings.x.to': 'اليوم الأخير', 'settings.x.toHint': 'اتركه فارغاً إن كان يوماً واحداً.', 'settings.x.closed': 'مغلق', 'settings.x.hours': 'ساعات خاصة', 'settings.x.kind': 'في ذلك اليوم',
      'settings.x.remove': 'أزل {name}', 'settings.x.removed': 'أُزيل {name}.', 'settings.x.added': 'أُضيف {name}.', 'settings.x.there': '{name} موجود في القائمة.', 'settings.x.unnamed': 'يوم خاص',
      'settings.x.empty': 'لا أيام خاصة بعد. أضف العيد أو اليوم الوطني أو دوام رمضان، كي لا يقول الموقع إنك مفتوح وأنت مغلق.',
      'settings.x.noFrom': 'أضف اليوم الأول، وإلى ذلك الحين يتجاهل الموقع هذا الإدخال.', 'settings.x.noLabel': 'أضف اسماً بالإنجليزية والعربية، كي يذكر الموقع السبب.', 'settings.x.past': 'انتهى', 'settings.x.now': 'اليوم',
      'settings.x.weekly': 'الساعات المعتادة',
      'settings.ff.title': 'حقول نموذج الطلب', 'settings.ff.d': 'الاسم والبريد والشركة والرسالة موجودة دائماً. أما هذان الحقلان فاختياريان للزائر، ويبقيان متوقفين إلى أن تفعّلهما.',
      'settings.ff.phone': 'الهاتف أو واتساب', 'settings.ff.phoneD': 'يتيح لك الرد على الطلب عبر واتساب من صندوق الوارد مباشرة.',
      'settings.ff.budget': 'الميزانية', 'settings.ff.budgetD': 'قائمة قصيرة من النطاقات يختار منها الزائر. ويحتفظ الطلب بالنطاق بالإنجليزية أياً كانت لغة الزائر.',
      'settings.ff.ranges': 'نطاقات الميزانية', 'settings.ff.add': 'أضف نطاقاً', 'settings.ff.en': 'بالإنجليزية', 'settings.ff.ar': 'بالعربية', 'settings.ff.rangeN': 'النطاق {n}',
      'settings.ff.remove': 'أزل النطاق {n}', 'settings.ff.move': 'انقل النطاق {n} بمفتاحي السهم للأعلى وللأسفل.', 'settings.ff.moved': 'نُقل النطاق إلى الموضع {n}.', 'settings.ff.removed': 'أُزيل النطاق.',
      'settings.ff.empty': 'املأ اللغتين، أو أزل النطاق الفارغ.', 'settings.ff.none': 'لا نطاقات بعد، لذا يبقى حقل الميزانية مخفياً.', 'settings.ff.labels': 'عدّل تسميات الحقول',
      'settings.s.privacy': 'الخصوصية والموافقة', 'settings.s.privacy.d': 'ما يُسأل عنه الزوّار، وما يمكنهم قراءته، وكيف يصدّ النموذج الرسائل المزعجة.',
      'settings.cs.title': 'اطلب الموافقة قبل التحليلات', 'settings.cs.what': 'عند تفعيله يعرض الموقع شريطاً صغيراً في أول صفحة يفتحها الزائر: السماح بالتحليلات أو الرفض. ولا تُحمَّل التحليلات إلا بعد السماح، ويُحفظ اختياره في متصفحه. ولا يُحتسب من يرفض، لذا تبدو أرقامك أقل من الزيارات الفعلية.',
      'settings.cs.locked': 'يبقى مفعّلاً ما دامت خدمة تحليلات مربوطة: فسياستا الخصوصية وملفات تعريف الارتباط في الموقع تَعِدان بألا تعمل التحليلات إلا بعد موافقة الزائر.',
      'settings.cs.none': 'لا توجد خدمة تحليلات مربوطة، فلا شيء يُسأل عنه بعد. ويتفعّل هذا الخيار تلقائياً عند ربط خدمة.',
      'settings.cs.needsFix': 'تُحمَّل التحليلات دون سؤال إلى أن يفتح هذه الصفحة من يملك صلاحية تعديل الإعدادات.', 'settings.cs.turnedOn': 'سيُسأل الزوّار قبل تحميل التحليلات، كما تَعِد سياسة الخصوصية.',
      'settings.cs.wording': 'عدّل نص الشريط', 'settings.cs.lock': 'مفعّل دائماً',
      'settings.pv.title': 'رابط إشعار الخصوصية', 'settings.pv.hint': 'يظهر تحت زر «إرسال» وفي شريط الموافقة. صفحة في الموقع مثل {ex}، أو عنوان كامل يبدأ بـ ‎https://‎.',
      'settings.pv.bad': 'استخدم صفحة في الموقع مثل {ex}، أو عنواناً كاملاً يبدأ بـ ‎https://‎.', 'settings.pv.empty': 'دون رابط لا يستطيع الزوّار قراءة طريقة تعاملك مع بياناتهم قبل إرسال الطلب.', 'settings.pv.open': 'افتح الصفحة',
      'settings.sp.title': 'الحماية من الرسائل المزعجة', 'settings.sp.on': 'مفعّلة دائماً',
      'settings.sp.d': 'يمرّ كل طلب بفحصين صامتين: حقل مخفي لا تملؤه إلا البرامج الآلية، ومدة لا تقل عن {s} ثوانٍ بين فتح الصفحة والضغط على «إرسال». ويرى الطلب المحجوب شاشة الشكر المعتادة، ولا يُرسل منه شيء ولا يُحفظ.',
      'settings.sp.service': 'وقد تضيف خدمة النماذج تصفية أخرى من جهتها، كما تفعل Basin وFormspree.', 'settings.sp.blocked': 'المحجوبة في هذا المتصفح حتى الآن: {n}',
      'settings.an.real': 'الأرقام الحقيقية في {name}', 'settings.an.realD': 'لا تجلب لوحة الإدارة الأرقام من {name}، وتعرض رسومها بيانات تجريبية وزيارات هذا المتصفح. افتح {name} لترى العدد الحقيقي، أو أضف رابط لوحة مشتركة أدناه لتراها في صفحة التحليلات.',
      'settings.an.none': 'لا أحد يحتسب الزوّار الحقيقيين بعد', 'settings.an.noneD': 'تعرض رسوم اللوحة بيانات تجريبية وزيارات هذا المتصفح فقط.',
      'settings.an.share': 'رابط اللوحة المشتركة', 'settings.an.shareHint.plausible': 'في Plausible: {path}.', 'settings.an.shareHint.umami': 'في Umami: {path}.',
      'settings.an.shareHint.ga4': 'لا يوفّر GA4 لوحة مشتركة، لكن تقرير Looker Studio يفي بالغرض: {path}.',
      'settings.an.shareNote': 'يُحفظ في هذا المتصفح فقط ولا يُنشر. ومن يملك الرابط يرى أرقامك، فشاركه بحذر.', 'settings.an.shareOk': 'تستطيع صفحة التحليلات عرض هذه اللوحة.', 'settings.an.shareBad': 'استخدم الرابط كاملاً، بدءاً بـ ‎https://‎.',
      'settings.an.shareSaved': 'حُفظ رابط اللوحة المشتركة.', 'settings.an.shareCleared': 'أُزيل رابط اللوحة المشتركة.', 'settings.an.asked': 'يُسأل الزوّار قبل تحميل التحليلات.',
      'settings.ev.work': 'يفتح مشروعاً من قسم الأعمال.', 'settings.ev.brief_blocked': 'تحجب الحماية من الرسائل المزعجة طلباً.', 'settings.ev.consent': 'يسمح بالتحليلات في شريط الموافقة. أما الرفض فلا يُرسل أبداً.',
      'settings.sec.work': 'مشاريع تخيّلية تُظهر طريقة تفكير الاستوديو، مع رابط إلى كل الأعمال.', 'settings.sec.order': 'ترتيب الأقسام', 'settings.sec.first': 'في البداية دائماً', 'settings.sec.last': 'في النهاية دائماً',
      'settings.sec.filmD': 'الفيلم الافتتاحي، مع اختيار الموجات وطريقة عملنا.', 'settings.sec.footD': 'روابط التواصل والصفحات القانونية والشعار.',
      'settings.sec.move': 'انقل {name} بمفتاحي السهم للأعلى وللأسفل.', 'settings.sec.moved': 'أصبح {name} في الموضع {n} من {t}.', 'settings.sec.resetOrder': 'أعد الترتيب الأصلي', 'settings.sec.orderChanged': 'تغيّر الترتيب',
      'settings.bk.title': 'النسخ الاحتياطية', 'settings.bk.last': 'آخر نسخة احتياطية {ago}.', 'settings.bk.never': 'لا نسخة احتياطية بعد.', 'settings.bk.due': 'حان وقتها',
      'settings.bk.why': 'كل ما هنا محفوظ في هذا المتصفح وحده. والنسخة الاحتياطية هي ما يبقى إن مُسحت بيانات المتصفح أو تغيّر الجهاز أو ضاع.', 'settings.bk.now': 'انسخ احتياطياً الآن',
      'settings.bk.folder': 'النسخ الاحتياطي التلقائي', 'settings.bk.folderD': 'اختر مجلداً متزامناً مثل iCloud Drive أو Dropbox أو Google Drive. يحفظ كل نشر نسخة احتياطية في المجلد {dir} داخله، وتضيف اللوحة نسخة كل يوم ما دامت مفتوحة.',
      'settings.bk.notSite': 'لا تختر مجلد الموقع: كل ما فيه يُرفع مع الموقع، والنسخة الاحتياطية تحوي بيانات العملاء.',
      'settings.bk.choose': 'اختر مجلداً من النشر والسجل', 'settings.bk.on': 'مفعّل · الحفظ في «{name}»', 'settings.bk.lastAuto': 'آخر نسخة تلقائية {ago}.',
      'settings.bk.autoFail': 'لم تُحفظ آخر نسخة تلقائية: {why}', 'settings.bk.why.perm': 'يحتاج المتصفح إلى إذنك من جديد.', 'settings.bk.why.gone': 'تعذّر العثور على المجلد.', 'settings.bk.why.error': 'رفض المتصفح كتابة الملف.',
      'settings.bk.allow': 'اسمح وانسخ احتياطياً', 'settings.bk.saveNow': 'احفظ نسخة فيه الآن', 'settings.bk.noFs': 'لا يستطيع هذا المتصفح الحفظ في مجلد تلقائياً (يستطيع ذلك Chrome وEdge). استخدم «انسخ احتياطياً الآن» واحفظ الملف في مكان آمن.',
      'settings.bk.saved': 'حُفظت النسخة في «{name}».',
      'settings.bk.keep': 'الاحتفاظ بالبيانات', 'settings.bk.kept': 'وافق هذا المتصفح على الاحتفاظ ببيانات اللوحة حتى عند امتلاء المساحة.',
      'settings.bk.notKept': 'قد يمسح هذا المتصفح بيانات اللوحة عند امتلاء المساحة. اطلب منه الاحتفاظ بها، فبعض المتصفحات لا توافق إلا بعد حفظ اللوحة في المفضلة أو تثبيتها.',
      'settings.bk.unknown': 'لا يذكر هذا المتصفح إن كان يحتفظ بالبيانات، فانسخ احتياطياً بانتظام.', 'settings.bk.ask': 'اطلب من المتصفح الاحتفاظ بها', 'settings.bk.askNo': 'رفض المتصفح الآن، فالنسخ الاحتياطية أهم من ذي قبل.',
      'settings.bad.shape': 'أحد المُدخلات بشكل غير صحيح: {k}.', 'settings.bad.draft': 'لا يمكن قراءة المسودة التي فيه.', 'settings.bad.noTeam': 'لا يحتوي فريقاً، فلن يستطيع أحد فتح اللوحة.',
      'settings.snap.title': 'استعادة دون طريق للعودة؟', 'settings.snap.text': 'لم يستطع هذا المتصفح الاحتفاظ بنسخة من الحالة الحالية، فلا يمكن التراجع عن هذه الاستعادة. صدّر نسخة احتياطية أولاً إن كنت قد تحتاجها.',
      'settings.rs.undo': 'تراجع عن الاستعادة', 'settings.rs.undone': 'أُلغيت الاستعادة، وعادت اللوحة كما كانت.', 'settings.rs.rolledBack': 'تعذّر فتح تلك النسخة، فعادت اللوحة كما كانت دون أن يضيع شيء.',
      'settings.rs.done': 'استُعيدت النسخة الاحتياطية.', 'settings.rs.row': 'استعدت نسخة احتياطية {ago}.', 'settings.rs.rowD': 'تراجع عنها لتعود اللوحة كما كانت قبلها، وتضيع التغييرات التي جرت بعد الاستعادة.',
      'settings.rs.confirm': 'التراجع عن الاستعادة؟', 'settings.rs.keep': 'احتفظ بالبيانات المستعادة', 'settings.rs.broken': 'تعذّر فتح النسخة المستعادة، ولا توجد نسخة سابقة للعودة إليها.', 'settings.rs.clear': 'امسحها وابدأ من جديد',
      'settings.gs.title': 'خطوات البداية', 'settings.gs.progress': 'أُنجز {done} من {total}', 'settings.gs.banner': 'خطوات البداية: أُنجز {done} من {total}.', 'settings.gs.see': 'اعرض القائمة', 'settings.gs.hide': 'أخفِها', 'settings.gs.hidden': 'أُخفيت القائمة، وتبقى في الإعدادات › عن لوحة الإدارة.',
      'settings.gs.all': 'كل شيء جاهز: تعمل اللوحة والموقع فعلياً.', 'settings.gs.done': 'تم', 'settings.gs.todo': 'لم يُنجز',
      'settings.gs.folder': 'اربط مجلد الموقع', 'settings.gs.folderD': 'فيكتب النشر الملف assets/content.js في الموقع مباشرة.',
      'settings.gs.email': 'تحقّق من بريد الاستوديو', 'settings.gs.emailD': 'تستخدمه الطلبات وقسم التواصل.', 'settings.gs.emailOk': 'العنوان صحيح', 'settings.gs.emailEdit': 'عدّل البريد',
      'settings.gs.form': 'اضبط خدمة نماذج', 'settings.gs.formD': 'كي تصل الطلبات حتى إن لم يكن لدى الزائر تطبيق بريد.', 'settings.gs.formDo': 'اضبط النموذج',
      'settings.gs.analytics': 'اربط التحليلات', 'settings.gs.analyticsD': 'لاحتساب الزوّار الحقيقيين.',
      'settings.gs.publish': 'انشر للمرة الأولى', 'settings.gs.publishD': 'كي تصل تعديلاتك إلى الموقع.',
      'settings.gs.backup': 'خذ أول نسخة احتياطية', 'settings.gs.backupD': 'كل ما هنا محفوظ في هذا المتصفح فقط.',
      'settings.docsD': 'كيف تصل الطلبات، وكيف يعمل النشر، والنسخ الاحتياطية، والأدوار والحدود. الدليل باللغة الإنجليزية.', 'settings.cmd.start': 'قائمة خطوات البداية',
      'settings.bk.manage': 'غيّره من النشر والسجل', 'settings.bk.none': 'لا مجلد للنسخ الاحتياطية بعد.',
    },
    fa: {
      'settings.sub': 'اطلاعات تماس، ساعت کاری و سازوکار پشت سایت. بیشتر این‌ها جزو محتوای سایت‌اند و پس از انتشار برای بازدیدکنندگان اعمال می‌شوند.',
      'settings.search': 'جست‌وجو در تنظیمات', 'settings.noMatch': 'هیچ تنظیمی با «{q}» جور نیست.', 'settings.noMatchText': 'واژهٔ ساده‌تری امتحان کنید، مثل ایمیل، ساعت یا پشتیبان.', 'settings.clear': 'پاک کردن جست‌وجو',
      'settings.readonly': 'نقش شما فقط اجازهٔ دیدن این تنظیمات را می‌دهد، نه تغییرشان.',
      'settings.pending': '{n} تغییر در تنظیمات هنوز منتشر نشده است.', 'settings.pendingOne': 'یک تغییر در تنظیمات هنوز منتشر نشده است.', 'settings.pendingText': 'سایت تا زمان انتشار، همان مقادیر منتشرشده را نشان می‌دهد.', 'settings.review': 'بازبینی و انتشار',
      'settings.nav': 'بخش‌های تنظیمات', 'settings.k.search': 'جست‌وجو در تنظیمات',
      'settings.s.studio': 'استودیو و تماس', 'settings.s.studio.d': 'راه‌های تماس مشتری‌ها با شما. در بخش تماس و در اطلاعات کسب‌وکاری که Google می‌خواند نمایش داده می‌شود.',
      'settings.s.hours': 'ساعت کاری', 'settings.s.hours.d': 'ساعت لوسیل در بخش استودیو و پیام «باز» یا «بسته» زیر آن را تعیین می‌کند.',
      'settings.s.form': 'تحویل فرم', 'settings.s.form.d': 'وقتی بازدیدکننده در سایت «ارسال» را می‌زند، درخواست کجا می‌رود.',
      'settings.s.analytics': 'آمار و تحلیل', 'settings.s.analytics.d': 'رویدادهای سایت را به سرویس آماری خودتان بفرستید.',
      'settings.s.sections': 'بخش‌های سایت', 'settings.s.sections.d': 'برای تغییر ترتیب بکشید، یا بخشی را خاموش کنید تا خودش و پیوندش در منو پنهان شود. چیزی حذف نمی‌شود.',
      'settings.s.data': 'داده‌های پنل', 'settings.s.data.d': 'هر چه پنل در این مرورگر نگه می‌دارد: از آن پشتیبان بگیرید، بازگردانی‌اش کنید یا پاکش کنید.',
      'settings.s.about': 'دربارهٔ این پنل', 'settings.s.about.d': 'شروع کار، این‌که چه چیزی کجا ذخیره می‌شود و تغییر چطور به سایت می‌رسد.',
      'settings.email': 'ایمیل استودیو', 'settings.emailHint': 'در بخش تماس نمایش داده می‌شود. وقتی فرم با برنامهٔ ایمیل کار می‌کند، درخواست‌ها به این نشانی فرستاده می‌شوند.',
      'settings.emailBad': 'این شبیه نشانی ایمیل نیست.', 'settings.emailEmpty': 'فرم درخواست به یک نشانی در این‌جا نیاز دارد.', 'settings.emailTest': 'ارسال ایمیل آزمایشی',
      'settings.wa': 'شمارهٔ واتس‌اپ', 'settings.waHint': 'فقط رقم، همراه با کد کشور: ‎974 5555 1234‎ می‌شود ‎97455551234‎. برای پنهان کردن واتس‌اپ خالی بگذارید.',
      'settings.waDigits': 'سایت فقط از رقم‌ها استفاده می‌کند: {n}', 'settings.waShort': 'برای شماره‌ای با کد کشور کوتاه به نظر می‌رسد.', 'settings.waOpen': 'آزمایش پیوند واتس‌اپ',
      'settings.label': 'شماره به شکل نمایشی', 'settings.labelHint': 'شماره در سایت این‌طور نوشته می‌شود. اگر خالی بماند، {n} نمایش داده می‌شود.', 'settings.labelHintNone': 'شماره در سایت این‌طور نوشته می‌شود، مثلاً ‎+974 5555 1234‎. وقتی شمارهٔ واتس‌اپ داشته باشید نمایش داده می‌شود.',
      'settings.where': 'کجا نمایش داده می‌شوند', 'settings.showContact': 'نمایش بخش تماس در پیش‌نمایش',
      'settings.w.contact': 'بخش تماس', 'settings.w.contactBoth': 'پیوند ایمیل و پیوند واتس‌اپ.', 'settings.w.contactEmail': 'پیوند ایمیل. واتس‌اپ تا وقتی شماره‌ای وارد نکنید پنهان می‌ماند.',
      'settings.w.form': 'فرم درخواست', 'settings.w.formMailto': 'درخواست‌ها در برنامهٔ ایمیل بازدیدکننده باز می‌شوند، با گیرندهٔ {email}.', 'settings.w.formService': 'درخواست‌ها به سرویس فرم می‌روند. اگر کار نکند، برنامهٔ ایمیل با گیرندهٔ {email} باز می‌شود.',
      'settings.w.copy': 'متن‌های سایت', 'settings.w.copyD': 'این متن‌ها نشانی را به‌جای {email} می‌گذارند:', 'settings.w.copyNone': 'فعلاً هیچ متنی در سایت به {email} اشاره نمی‌کند.',
      'settings.w.seo': 'نتایج جست‌وجو', 'settings.w.seoD': 'ایمیل، تلفن و ساعت کاری در اطلاعات کسب‌وکاری که Google می‌خواند.', 'settings.w.seoLink': 'باز کردن تنظیمات سئو',
      'settings.nowIn': 'همین حالا در لوسیل', 'settings.now.open': 'باز · ساعت {close} می‌بندد', 'settings.now.today': 'بسته · امروز ساعت {open} باز می‌شود', 'settings.now.tomorrow': 'بسته · فردا ساعت {open} باز می‌شود',
      'settings.now.later': 'بسته · {day} ساعت {open} باز می‌شود', 'settings.now.never': 'بسته · هیچ روز کاری‌ای تعیین نشده', 'settings.visitorsSee': 'بازدیدکنندگان می‌بینند', 'settings.editMessages': 'ویرایش پیام‌های وضعیت',
      'settings.days': 'روزهای کاری', 'settings.daysHint': 'هفته مثل قطر از یکشنبه شروع می‌شود.', 'settings.daysNone': 'هیچ روزی انتخاب نشده، پس سایت همیشه می‌گوید استودیو بسته است.',
      'settings.preset.sunThu': 'یکشنبه تا پنجشنبه', 'settings.preset.monFri': 'دوشنبه تا جمعه', 'settings.preset.all': 'همهٔ روزها',
      'settings.times': 'ساعت‌ها', 'settings.opens': 'باز می‌شود', 'settings.closes': 'بسته می‌شود', 'settings.timesHint': 'ساعت‌های هفتگی برای همهٔ روزهای کاری، به‌صورت {h} ساعته. روزهای خاص پایین می‌توانند تغییرشان دهند.', 'settings.timesBad': 'ساعت بستن باید بعد از ساعت باز شدن باشد، وگرنه سایت هیچ‌وقت «باز» نشان نمی‌دهد.',
      'settings.tz': 'منطقهٔ زمانی', 'settings.tzHint': 'ساعت و پیام باز یا بسته بودن، فارغ از محل بازدیدکننده، بر اساس همین منطقه است.', 'settings.week': 'این هفته', 'settings.closed': 'بسته',
      'settings.mode': 'درخواست‌ها چطور می‌رسند', 'settings.mode.mailto': 'برنامهٔ ایمیل', 'settings.mode.service': 'سرویس فرم',
      'settings.mode.mailtoD': 'سایت برنامهٔ ایمیل بازدیدکننده را با متن آمادهٔ درخواست و گیرندهٔ {email} باز می‌کند. نمی‌شود فهمید که بعد از آن «ارسال» را زده یا نه.',
      'settings.mode.serviceD': 'سایت هر درخواست را به سرویس فرم می‌فرستد و به بازدیدکننده می‌گوید ارسال شد. اگر سرویس کار نکند، برنامهٔ ایمیل باز می‌شود.',
      'settings.funnelNote': 'در بخش آمار، آخرین مرحلهٔ قیف «{label}» نام دارد.',
      'settings.endpoint': 'نشانی سرویس فرم', 'settings.endpointHint': 'نشانی‌ای که سرویس برای دریافت فرم‌ها به شما می‌دهد و با ‎https://‎ شروع می‌شود.',
      'settings.endpointBad': 'یک نشانی کامل وارد کنید که با ‎https://‎ شروع شود.', 'settings.endpointEmpty': 'نشانی سرویس فرم را این‌جا بچسبانید. تا آن موقع، درخواست‌ها همچنان در برنامهٔ ایمیل باز می‌شوند.',
      'settings.detected': 'به نظر {name} است', 'settings.toMailto': 'درخواست‌ها دوباره در برنامهٔ ایمیل باز می‌شوند.',
      'settings.providers': 'سرویس‌هایی که با سایت کار می‌کنند', 'settings.cors': 'سرویس باید ارسال از وب‌سایت‌های دیگر (CORS) را بپذیرد. اگر آزمایش با خطای شبکه شکست بخورد، معمولاً دلیلش همین است.',
      'settings.pv.formspree': 'پلن رایگان دارد و هر درخواست را برایتان ایمیل می‌کند. یک فرم بسازید و نشانی‌اش را کپی کنید.',
      'settings.pv.web3forms': 'در هر ارسال یک کلید دسترسی می‌خواهد که سایت نمی‌فرستد. آن را از طریق Make یا Zapier وصل کنید یا از یک برنامه‌نویس بخواهید کلید را اضافه کند.',
      'settings.pv.getform': 'درخواست‌ها را در یک داشبورد نگه می‌دارد و می‌تواند با ایمیل بفرستد.', 'settings.pv.basin': 'فیلتر هرزنامه دارد و هر درخواست را ایمیل می‌کند.',
      'settings.pv.hook': 'درخواست‌ها را به هر جا بفرستید: یک شیت، Slack یا CRM. وب‌هوک را طوری تنظیم کنید که JSON بپذیرد.', 'settings.pv.hookName': 'وب‌هوک Make یا Zapier', 'settings.visit': 'باز کردن {name}',
      'settings.test': 'ارسال درخواست آزمایشی', 'settings.testHint': 'یک درخواست نمونه با برچسب آزمایشی به نشانی موجود در پیش‌نویس می‌فرستد. چیزی منتشر نمی‌شود.', 'settings.testNeeds': 'برای ارسال آزمایشی یک نشانی معتبر ‎https://‎ وارد کنید.', 'settings.sending': 'در حال ارسال…',
      'settings.res.ok': 'تحویل شد · {code}', 'settings.res.http': 'رد شد · {code}', 'settings.res.network': 'خطای شبکه', 'settings.res.timeout': 'پس از {s} ثانیه پاسخی نیامد',
      'settings.res.okD': 'سرویس درخواست آزمایشی را پذیرفت. صندوق یا داشبوردش را ببینید.', 'settings.res.httpD': 'سرویس پاسخ داد ولی درخواست را نپذیرفت. پاسخش:',
      'settings.res.networkD': 'درخواست به سرویس نرسید. نشانی را بررسی کنید و ببینید سرویس ارسال از سایت‌های دیگر (CORS) را می‌پذیرد یا نه.',
      'settings.log': 'گزارش اتصال‌ها', 'settings.logEmpty': 'هنوز درخواست آزمایشی‌ای فرستاده نشده.', 'settings.log.time': 'زمان', 'settings.log.id': 'شناسهٔ درخواست', 'settings.log.to': 'ارسال به', 'settings.log.result': 'نتیجه', 'settings.log.took': 'مدت',
      'settings.retry': 'تلاش دوباره', 'settings.copyId': 'کپی شناسهٔ درخواست', 'settings.clearLog': 'پاک کردن گزارش', 'settings.logCleared': 'گزارش پاک شد.',
      'settings.payload': 'آنچه سایت می‌فرستد', 'settings.payloadHint': 'هر درخواست به‌صورت JSON با این فیلدها فرستاده می‌شود. درخواست آزمایشی "test": true هم دارد.', 'settings.ms': '{n} میلی‌ثانیه',
      'settings.provider': 'سرویس آمار', 'settings.p.none': 'هیچ',
      'settings.p.noneD': 'سایت هیچ آماری نمی‌فرستد.', 'settings.p.plausibleD': 'به حریم خصوصی احترام می‌گذارد و کوکی ندارد.',
      'settings.p.ga4D': 'آمار رایگان Google که کوکی ذخیره می‌کند.', 'settings.p.umamiD': 'متن‌باز است. از Umami Cloud یا سرور خودتان استفاده کنید.',
      'settings.id.plausible': 'دامنهٔ سایت', 'settings.id.ga4': 'شناسهٔ اندازه‌گیری', 'settings.id.umami': 'شناسهٔ وب‌سایت', 'settings.i.aid': 'شناسهٔ سرویس آمار',
      'settings.idHint.plausible': 'دامنه دقیقاً همان‌طور که در Plausible اضافه کرده‌اید، بدون ‎https://‎.', 'settings.idHint.ga4': 'با G- شروع می‌شود. در Google Analytics از مسیر ⁦Admin → Data streams⁩ پیدایش کنید.', 'settings.idHint.umami': 'از تنظیمات وب‌سایت در Umami: {n} نویسه با خط تیره.',
      'settings.idBad.plausible': 'فقط دامنه را بنویسید، مثل mirasmarketing.com، بدون ‎https://‎ و بدون مسیر.', 'settings.idBad.ga4': 'شناسهٔ اندازه‌گیری GA4 شبیه G-AB12CD34EF است.',
      'settings.idUA': 'شناسه‌های UA- مال Universal Analytics است که از {y} دیگر داده جمع نمی‌کند. به‌جایش شناسهٔ G- را وارد کنید.', 'settings.idBad.umami': 'شناسهٔ وب‌سایت Umami {n} نویسه با خط تیره دارد، مثل ‎4f9c2a1e-…‎.',
      'settings.idOk': 'قالبش درست به نظر می‌رسد.', 'settings.idMissing': 'شناسه را وارد کنید تا ارسال رویدادها شروع شود. تا آن موقع سایت چیزی بارگذاری نمی‌کند.',
      'settings.src': 'نشانی اسکریپت (اختیاری)', 'settings.srcHint': 'فقط اگر {name} را خودتان میزبانی می‌کنید. اگر خالی بماند، سایت {def} را بارگذاری می‌کند.',
      'settings.snippet': 'آنچه سایت به هر صفحه اضافه می‌کند', 'settings.copySnippet': 'کپی',
      'settings.events': 'رویدادهایی که سایت می‌فرستد', 'settings.eventsNote': 'نام‌ها، ایمیل‌ها و متن درخواست هیچ‌وقت به سرویس آمار نمی‌روند. در Plausible هر رویداد را به‌صورت هدف سفارشی اضافه کنید تا ببینیدش.',
      'settings.ev.event': 'رویداد', 'settings.ev.when': 'چه وقت', 'settings.ev.props': 'جزئیات',
      'settings.ev.view': 'کسی صفحه را باز می‌کند.', 'settings.ev.journey': 'از ۲۵، ۵۰، ۷۵ یا ۱۰۰ درصد فیلم آغازین می‌گذرد.', 'settings.ev.swell': 'موجی را انتخاب یا از انتخاب خارج می‌کند.', 'settings.ev.section': 'بخشی وارد صفحهٔ نمایش می‌شود.',
      'settings.ev.plan_to_brief': 'برنامه‌اش را به درخواست اضافه می‌کند.', 'settings.ev.make': 'واژه‌ای را در «آنچه می‌سازیم» می‌گیرد.', 'settings.ev.stage': 'میرا را تا یکی از ایستگاه‌های روش کار می‌کشد.', 'settings.ev.faq': 'پرسشی را باز می‌کند.',
      'settings.ev.lang': 'بین انگلیسی و عربی جابه‌جا می‌شود.', 'settings.ev.brief': 'درخواست را می‌فرستد یا پیش‌نویس ایمیل را باز می‌کند.', 'settings.ev.brief_copy': 'به‌جای آن، درخواست را کپی می‌کند.',
      'settings.openAnalytics': 'باز کردن آمار',
      'settings.sec.plan': 'فهرست خدمات: چهار گروه خدمت که هر کدام دکمهٔ «افزودن به درخواست» دارند، به‌اضافهٔ دکمه‌ای که برنامهٔ بازدیدکننده را به درخواستش اضافه می‌کند.',
      'settings.sec.make': 'واژه‌ها شناورند و با یک ضربه، یکی به درخواست اضافه می‌شود.', 'settings.sec.why': 'چهار قول، از برندی که زیر آفتاب تند هم کار می‌کند تا استودیویی همین نزدیکی در لوسیل.',
      'settings.ev.service': 'خدمتی را در فهرست خدمات اضافه یا حذف می‌کند.', 'settings.secName.plan': 'خدمات', 'settings.secName.poster': 'شعار',
      'settings.sec.studio': 'ساعت لوسیل، پیام امروز دربارهٔ باز یا بسته بودن، و نشانی.', 'settings.sec.faq': 'پرسش‌هایی که مشتری‌ها پیش از نوشتن می‌پرسند.',
      'settings.sec.contact': 'فرم درخواست، پیوند ایمیل و واتس‌اپ.', 'settings.sec.poster': 'نوار شعار، با نوشته‌ای که مانند موج تکان می‌خورد.', 'settings.sec.other': 'بخشی که اخیراً به سایت اضافه شده.', 'settings.sec.hidden': 'پنهان',
      'settings.sec.contactWarn': 'بخش تماس پنهان است، پس دکمه‌های «افزودن این برنامه به درخواست» و «شروع یک پروژه» هم پنهان می‌شوند و بازدیدکننده فرمی برای فرستادن درخواست ندارد.', 'settings.sec.shown': '{n} از {t} بخش نمایش داده می‌شود',
      'settings.usage': 'این مرورگر {size} دادهٔ پنل را در {n} مورد نگه می‌دارد.', 'settings.usageFiles': '{n} فایل بارگذاری‌شده جداگانه در IndexedDB نگه‌داری می‌شود.', 'settings.usageNoFiles': 'فایل بارگذاری‌شده‌ای نیست.',
      'settings.export': 'گرفتن نسخهٔ پشتیبان', 'settings.exportD': 'یک فایل JSON شامل پیش‌نویس، تیم، درخواست‌ها، تاریخچه، ترجیحات و فایل‌های بارگذاری‌شده. اطلاعات مشتری‌ها در آن است، پس جای امنی نگهش دارید.', 'settings.exported': 'نسخهٔ پشتیبان با نام {name} ذخیره شد.',
      'settings.import': 'بازگردانی نسخهٔ پشتیبان', 'settings.importD': 'هر چه پنل در این مرورگر نگه داشته با محتوای نسخهٔ پشتیبان جایگزین می‌شود و صفحه دوباره بارگذاری می‌شود. بعداً می‌توانید آن را برگردانید.', 'settings.drop': 'فایل پشتیبان را این‌جا رها کنید', 'settings.choose': 'انتخاب فایل',
      'settings.bad.title': 'این فایل نسخهٔ پشتیبان پنل میراس نیست.', 'settings.bad.json': 'JSON معتبری نیست.', 'settings.bad.schema': 'ساختار نسخهٔ پشتیبان را ندارد.', 'settings.bad.keys': 'مواردی دارد که مال پنل نیست: {k}.',
      'settings.bad.newer': 'نسخهٔ جدیدتری از پنل آن را ساخته است.', 'settings.bad.value': 'یکی از موارد خراب است: {k}.',
      'settings.importTitle': 'این نسخهٔ پشتیبان بازگردانی شود؟', 'settings.importSummary': 'در {date} توسط {by} گرفته شده: {n} مورد و {f} فایل.',
      'settings.importWarn': 'هر چه پنل در این مرورگر نگه می‌دارد جایگزین می‌شود، از جمله ویرایش‌های منتشرنشده. پنل نسخه‌ای از وضعیت فعلی نگه می‌دارد تا بتوانید بازگردانی را برگردانید.',
      'settings.importOk': 'جایگزینی و بارگذاری دوباره', 'settings.restored': 'نسخهٔ پشتیبان بازگردانی شد. در حال بارگذاری دوباره…', 'settings.restoreFail': 'نسخهٔ پشتیبان نوشته نشد ({e}). چیزی تغییر نکرد.',
      'settings.evt.title': 'رویدادهای سایت در این مرورگر', 'settings.evt.d': 'وقتی سایت را در همین مرورگر می‌گردید، گزارشی نگه می‌دارد تا پنل فعالیت واقعی را نشان دهد.', 'settings.evt.count': 'الان {n} رویداد نگه‌داری می‌شود.', 'settings.evt.none': 'هنوز رویدادی نگه‌داری نشده.',
      'settings.evt.clear': 'پاک کردن رویدادهای سایت', 'settings.evt.cleared': '{n} رویداد سایت پاک شد.',
      'settings.smp.title': 'دادهٔ نمونه', 'settings.smp.d': 'نمونه‌هایی با برچسب روشن که تا رسیدن دادهٔ واقعی، نمودارها، صندوق ورودی و تیم را پر می‌کنند.',
      'settings.smp.briefs': 'درخواست‌های نمونه', 'settings.smp.people': 'هم‌تیمی‌های نمونه', 'settings.smp.traffic': 'بازدید نمونه', 'settings.smp.on': 'روشن', 'settings.smp.off': 'خاموش',
      'settings.smp.clear': 'پاک کردن دادهٔ نمونه', 'settings.smp.cleared': 'دادهٔ نمونه پاک شد.', 'settings.smp.none': 'دادهٔ نمونه‌ای باقی نمانده.', 'settings.smp.showTraffic': 'نمایش دوبارهٔ بازدید نمونه',
      'settings.reset.title': 'بازنشانی پنل', 'settings.reset.d': 'پیش‌نویس، تیم، درخواست‌ها، تاریخچه، ترجیحات و فایل‌های بارگذاری‌شدهٔ این مرورگر را پاک می‌کند. به سایت منتشرشده دست نمی‌زند.',
      'settings.reset.btn': 'بازنشانی پنل…', 'settings.reset.modal': 'پنل در این مرورگر بازنشانی شود؟', 'settings.reset.warn': 'همهٔ موارد زیر پاک می‌شود و صفحه دوباره بارگذاری می‌شود. برگشت‌پذیر نیست. سایت و فایل assets/content.js دست‌نخورده می‌مانند.',
      'settings.reset.list': '{changes} تغییر منتشرنشده · {people} نفر · {briefs} درخواست · {versions} نسخهٔ ذخیره‌شده · {files} فایل بارگذاری‌شده · ترجیحات شما',
      'settings.reset.type': 'برای تأیید RESET را تایپ کنید', 'settings.reset.site': 'درخواست‌ها و رویدادهایی را هم که سایت در این مرورگر نگه داشته پاک کن', 'settings.reset.ok': 'پاک کردن و بارگذاری دوباره',
      'settings.reset.exportFirst': 'اول نسخهٔ پشتیبان بگیرید', 'settings.reset.done': 'پنل بازنشانی شد. در حال بارگذاری دوباره…', 'settings.noDataPerm': 'نقش شما اجازهٔ تغییر داده‌های پنل را نمی‌دهد.',
      'settings.kb': '{n} کیلوبایت', 'settings.mb': '{n} مگابایت', 'settings.filesSkipped': 'این مرورگر اجازه نداد پنل فایل‌های بارگذاری‌شده را بخواند، پس نسخهٔ پشتیبان همه‌چیز را جز آن‌ها دارد.',
      'settings.store': 'چه چیزی کجا ذخیره می‌شود', 'settings.store.what': 'چه', 'settings.store.where': 'کجا',
      'settings.st.draft': 'ویرایش‌های منتشرنشده (پیش‌نویس)', 'settings.st.here': 'همین مرورگر', 'settings.st.pub': 'محتوای منتشرشده', 'settings.st.pubW': 'فایل assets/content.js کنار سایت',
      'settings.st.admin': 'تیم، تاریخچه، اعلان‌ها و ترجیحات', 'settings.st.files': 'تصاویر بارگذاری‌شده', 'settings.st.filesW': 'همین مرورگر، در IndexedDB',
      'settings.st.briefs': 'درخواست‌ها و رویدادهای سایت', 'settings.st.briefsW': 'ایمیل یا سرویس فرم شما. وقتی سایت را در همین مرورگر آزمایش می‌کنید، نسخه‌ای این‌جا می‌ماند.',
      'settings.st.visits': 'آمار بازدیدکنندگان', 'settings.st.visitsW': 'سرویس آماری که بالاتر وصل کرده‌اید، اگر وصل باشد',
      'settings.how': 'انتشار چطور کار می‌کند',
      'settings.how.1': 'ویرایش می‌کنید. هر تغییر در پیش‌نویسِ همین مرورگر ذخیره می‌شود و بلافاصله در پیش‌نمایش دیده می‌شود.',
      'settings.how.2': 'منتشر می‌کنید. پنل فایل assets/content.js را می‌نویسد که فقط تفاوت‌ها با مقادیر پیش‌فرضِ index.html را دارد.',
      'settings.how.3': 'آن فایل را همراه سایت بارگذاری می‌کنید. بازدیدکنندگان در بازدید بعدی تغییر را می‌بینند.',
      'settings.lastPub': 'آخرین انتشار: {when} توسط {by}.', 'settings.lastLive': 'همان فایلی است که سایت الان نشان می‌دهد.', 'settings.lastLocal': 'از همین مرورگر منتشر شده. assets/content.js را بارگذاری کنید تا روی سایت بیاید.',
      'settings.neverPub': 'هنوز چیزی از پنل منتشر نشده و سایت مقادیر پیش‌فرض index.html را نشان می‌دهد.',
      'settings.docs': 'خواندن راهنما (GUIDE.md)', 'settings.help': 'راهنما', 'settings.openPublish': 'باز کردن انتشار',
      'settings.cmd.hours': 'ویرایش ساعت کاری', 'settings.cmd.form': 'تنظیم تحویل فرم', 'settings.cmd.analytics': 'اتصال سرویس آمار', 'settings.cmd.sections': 'نمایش یا پنهان کردن بخش‌های سایت', 'settings.cmd.export': 'گرفتن نسخهٔ پشتیبان از پنل',
      'settings.tm.hint': 'ساعت و دقیقه به‌صورت {h} ساعته. کلیدهای جهت‌نما آن را {m} دقیقه جابه‌جا می‌کنند.', 'settings.tm.bad': 'از ساعت {h} ساعته استفاده کنید، مثل {a} یا {b}.',
      'settings.now.openFor': 'باز · ساعت‌های {label}، ساعت {close} می‌بندد', 'settings.now.todayFor': 'بسته · امروز ساعت {open} با ساعت‌های {label} باز می‌شود', 'settings.now.closedFor': 'امروز به مناسبت {label} بسته است · {day} ساعت {open} باز می‌شود',
      'settings.x.title': 'روزهای خاص', 'settings.x.hint': 'تعطیلی‌ها و روزهای کوتاه در تاریخ خودشان بر ساعت‌های هفتگی مقدم‌اند، به وقت استودیو. سایت نام آن روز را در پیام باز یا بسته می‌آورد.',
      'settings.x.add': 'افزودن روز', 'settings.x.presets': 'افزودن مناسبت', 'settings.x.p.ramadan': 'ساعت‌های رمضان (تاریخ‌ها با شما)', 'settings.x.p.fitr': 'عید فطر', 'settings.x.p.adha': 'عید قربان',
      'settings.x.p.national': 'روز ملی قطر', 'settings.x.p.sport': 'روز ملی ورزش قطر', 'settings.x.est': 'تاریخ‌ها از تقویم ام‌القری تخمین زده شده‌اند. پس از اعلام رسمی اصلاحشان کنید.',
      'settings.x.name': 'نام در سایت', 'settings.x.from': 'روز اول', 'settings.x.to': 'روز آخر', 'settings.x.toHint': 'برای یک روز خالی بگذارید.', 'settings.x.closed': 'بسته', 'settings.x.hours': 'ساعت‌های خاص', 'settings.x.kind': 'آن روز',
      'settings.x.remove': 'حذف {name}', 'settings.x.removed': '{name} حذف شد.', 'settings.x.added': '{name} اضافه شد.', 'settings.x.there': '{name} از قبل در فهرست هست.', 'settings.x.unnamed': 'روز خاص',
      'settings.x.empty': 'هنوز روز خاصی نیست. عید، روز ملی یا ساعت‌های رمضان را اضافه کنید تا سایت هرگز نگوید باز هستید وقتی بسته‌اید.',
      'settings.x.noFrom': 'روز اول را وارد کنید. تا آن موقع سایت این مورد را نادیده می‌گیرد.', 'settings.x.noLabel': 'یک نام به انگلیسی و عربی بنویسید تا سایت بتواند دلیلش را بگوید.', 'settings.x.past': 'گذشته', 'settings.x.now': 'امروز',
      'settings.x.weekly': 'ساعت‌های معمول',
      'settings.ff.title': 'فیلدهای فرم درخواست', 'settings.ff.d': 'نام، ایمیل، شرکت و پیام همیشه هستند. این دو برای بازدیدکننده اختیاری‌اند و تا روشنشان نکنید خاموش می‌مانند.',
      'settings.ff.phone': 'تلفن یا واتساپ', 'settings.ff.phoneD': 'می‌توانید مستقیم از صندوق ورودی با واتساپ به درخواست پاسخ دهید.',
      'settings.ff.budget': 'بودجه', 'settings.ff.budgetD': 'فهرستی کوتاه از بازه‌ها برای انتخاب. درخواست، بازه را به انگلیسی نگه می‌دارد، به هر زبانی که بازدیدکننده نوشته باشد.',
      'settings.ff.ranges': 'بازه‌های بودجه', 'settings.ff.add': 'افزودن بازه', 'settings.ff.en': 'انگلیسی', 'settings.ff.ar': 'عربی', 'settings.ff.rangeN': 'بازهٔ {n}',
      'settings.ff.remove': 'حذف بازهٔ {n}', 'settings.ff.move': 'جابه‌جایی بازهٔ {n} با کلیدهای جهت‌نمای بالا و پایین.', 'settings.ff.moved': 'بازه به جایگاه {n} رفت.', 'settings.ff.removed': 'بازه حذف شد.',
      'settings.ff.empty': 'هر دو زبان را پر کنید یا بازهٔ خالی را حذف کنید.', 'settings.ff.none': 'هنوز بازه‌ای نیست، پس فیلد بودجه پنهان می‌ماند.', 'settings.ff.labels': 'ویرایش برچسب فیلدها',
      'settings.s.privacy': 'حریم خصوصی و رضایت', 'settings.s.privacy.d': 'از بازدیدکننده‌ها چه پرسیده می‌شود، چه چیزی می‌توانند بخوانند و فرم چطور هرزنامه را دور نگه می‌دارد.',
      'settings.cs.title': 'پیش از آمارگیری اجازه بگیر', 'settings.cs.what': 'وقتی روشن است، سایت در اولین صفحه‌ای که بازدیدکننده باز می‌کند نوار کوچکی نشان می‌دهد: اجازهٔ آمارگیری یا نه. آمار فقط پس از اجازه بارگذاری می‌شود و انتخابش در مرورگرش می‌ماند. کسانی که نه بگویند شمرده نمی‌شوند، پس عددهای شما از بازدید واقعی کمتر است.',
      'settings.cs.locked': 'تا وقتی یک سرویس آمار وصل است روشن می‌ماند: سیاست حریم خصوصی و کوکی‌های سایت قول می‌دهند آمار فقط پس از رضایت بازدیدکننده اجرا شود.',
      'settings.cs.none': 'هیچ سرویس آماری وصل نیست، پس فعلاً چیزی برای پرسیدن نیست. وقتی سرویسی وصل کنید این گزینه خودش روشن می‌شود.',
      'settings.cs.needsFix': 'تا وقتی کسی که اجازهٔ ویرایش تنظیمات دارد این صفحه را باز نکند، آمار بدون پرسیدن بارگذاری می‌شود.', 'settings.cs.turnedOn': 'پیش از بارگذاری آمار از بازدیدکننده‌ها پرسیده می‌شود، همان‌طور که سیاست حریم خصوصی قول داده است.',
      'settings.cs.wording': 'ویرایش متن نوار', 'settings.cs.lock': 'همیشه روشن',
      'settings.pv.title': 'پیوند اطلاعیهٔ حریم خصوصی', 'settings.pv.hint': 'زیر دکمهٔ «ارسال» و در نوار رضایت نمایش داده می‌شود. صفحه‌ای در سایت مثل {ex}، یا نشانی کامل با ‎https://‎.',
      'settings.pv.bad': 'صفحه‌ای در سایت مثل {ex}، یا نشانی کاملی که با ‎https://‎ شروع شود به کار ببرید.', 'settings.pv.empty': 'بدون پیوند، بازدیدکننده‌ها پیش از فرستادن درخواست نمی‌توانند بخوانند با اطلاعاتشان چه می‌کنید.', 'settings.pv.open': 'باز کردن صفحه',
      'settings.sp.title': 'محافظت در برابر هرزنامه', 'settings.sp.on': 'همیشه روشن',
      'settings.sp.d': 'هر درخواست از دو بررسی بی‌صدا می‌گذرد: فیلدی پنهان که فقط ربات‌ها پرش می‌کنند، و دست‌کم {s} ثانیه فاصله بین باز کردن صفحه و زدن «ارسال». درخواست مسدودشده همان صفحهٔ تشکر معمولی را می‌بیند و چیزی فرستاده یا نگه‌داری نمی‌شود.',
      'settings.sp.service': 'سرویس فرم شما هم ممکن است از سمت خودش بیشتر فیلتر کند، مثل Basin و Formspree.', 'settings.sp.blocked': 'مسدودشده در این مرورگر تا امروز: {n}',
      'settings.an.real': 'عددهای واقعی در {name} است', 'settings.an.realD': 'پنل هرگز عددها را از {name} نمی‌گیرد و نمودارهایش دادهٔ نمونه و بازدیدهای همین مرورگر را نشان می‌دهند. برای شمار واقعی {name} را باز کنید، یا پیوند داشبورد اشتراکی را پایین اضافه کنید تا در صفحهٔ آمار ببینیدش.',
      'settings.an.none': 'هنوز کسی بازدیدکننده‌های واقعی را نمی‌شمارد', 'settings.an.noneD': 'نمودارهای پنل فقط دادهٔ نمونه و بازدیدهای همین مرورگر را نشان می‌دهند.',
      'settings.an.share': 'پیوند داشبورد اشتراکی', 'settings.an.shareHint.plausible': 'در Plausible: {path}.', 'settings.an.shareHint.umami': 'در Umami: {path}.',
      'settings.an.shareHint.ga4': 'GA4 داشبورد اشتراکی ندارد، ولی گزارش Looker Studio کار می‌کند: {path}.',
      'settings.an.shareNote': 'فقط در همین مرورگر نگه‌داری می‌شود و منتشر نمی‌شود. هر کس پیوند را داشته باشد عددهای شما را می‌بیند، پس با احتیاط به اشتراک بگذارید.', 'settings.an.shareOk': 'صفحهٔ آمار می‌تواند این داشبورد را نشان دهد.', 'settings.an.shareBad': 'پیوند کامل را بنویسید که با ‎https://‎ شروع شود.',
      'settings.an.shareSaved': 'پیوند داشبورد اشتراکی ذخیره شد.', 'settings.an.shareCleared': 'پیوند داشبورد اشتراکی حذف شد.', 'settings.an.asked': 'پیش از بارگذاری آمار از بازدیدکننده‌ها پرسیده می‌شود.',
      'settings.ev.work': 'پروژه‌ای را از بخش نمونه‌کارها باز می‌کند.', 'settings.ev.brief_blocked': 'محافظت هرزنامه جلوی یک درخواست را می‌گیرد.', 'settings.ev.consent': 'در نوار رضایت اجازهٔ آمارگیری می‌دهد. «نه» هرگز فرستاده نمی‌شود.',
      'settings.sec.work': 'پروژه‌های مفهومی که نشان می‌دهند استودیو چطور فکر می‌کند، با پیوندی به همهٔ کارها.', 'settings.sec.order': 'ترتیب بخش‌ها', 'settings.sec.first': 'همیشه اول', 'settings.sec.last': 'همیشه آخر',
      'settings.sec.filmD': 'فیلم آغازین، با انتخاب موج‌ها و روش کار ما.', 'settings.sec.footD': 'پیوندهای تماس، صفحه‌های حقوقی و شعار.',
      'settings.sec.move': 'جابه‌جایی {name} با کلیدهای جهت‌نمای بالا و پایین.', 'settings.sec.moved': '{name} اکنون در جایگاه {n} از {t} است.', 'settings.sec.resetOrder': 'بازگرداندن ترتیب', 'settings.sec.orderChanged': 'ترتیب تغییر کرد',
      'settings.bk.title': 'پشتیبان‌ها', 'settings.bk.last': 'آخرین پشتیبان {ago}.', 'settings.bk.never': 'هنوز پشتیبانی نیست.', 'settings.bk.due': 'وقتش است',
      'settings.bk.why': 'همه‌چیز اینجا فقط در همین مرورگر است. پشتیبان نسخه‌ای است که بعد از پاک شدن مرورگر، لپ‌تاپ تازه یا گم‌شده باقی می‌ماند.', 'settings.bk.now': 'همین حالا پشتیبان بگیر',
      'settings.bk.folder': 'پشتیبان‌گیری خودکار', 'settings.bk.folderD': 'پوشه‌ای انتخاب کنید که همگام می‌شود، مثل iCloud Drive، Dropbox یا Google Drive. هر انتشار یک پشتیبان در پوشهٔ {dir} آن ذخیره می‌کند و پنل هم روزی یک پشتیبان اضافه می‌کند وقتی باز است.',
      'settings.bk.notSite': 'پوشهٔ وب‌سایت را انتخاب نکنید: هر چیزی در آن همراه سایت بارگذاری می‌شود و پشتیبان اطلاعات مشتری‌ها را دارد.',
      'settings.bk.choose': 'انتخاب پوشه در انتشار و تاریخچه', 'settings.bk.on': 'روشن · ذخیره در «{name}»', 'settings.bk.lastAuto': 'آخرین پشتیبان خودکار {ago}.',
      'settings.bk.autoFail': 'آخرین پشتیبان خودکار ذخیره نشد: {why}', 'settings.bk.why.perm': 'مرورگر دوباره به اجازهٔ شما نیاز دارد.', 'settings.bk.why.gone': 'پوشه پیدا نمی‌شود.', 'settings.bk.why.error': 'مرورگر اجازهٔ نوشتن فایل را نداد.',
      'settings.bk.allow': 'اجازه بده و پشتیبان بگیر', 'settings.bk.saveNow': 'همین حالا آنجا پشتیبان بگیر', 'settings.bk.noFs': 'این مرورگر خودش نمی‌تواند در پوشه ذخیره کند (Chrome و Edge می‌توانند). از «همین حالا پشتیبان بگیر» استفاده کنید و فایل را جای امنی نگه دارید.',
      'settings.bk.saved': 'پشتیبان در «{name}» ذخیره شد.',
      'settings.bk.keep': 'نگه‌داشتن داده‌ها', 'settings.bk.kept': 'این مرورگر پذیرفته است داده‌های پنل را حتی وقتی جا کم است نگه دارد.',
      'settings.bk.notKept': 'این مرورگر ممکن است وقتی جا کم شود داده‌های پنل را پاک کند. از آن بخواهید نگهشان دارد؛ بعضی مرورگرها فقط وقتی پنل نشانک یا نصب شده باشد می‌پذیرند.',
      'settings.bk.unknown': 'این مرورگر نمی‌گوید داده‌ها را نگه می‌دارد یا نه، پس مرتب پشتیبان بگیرید.', 'settings.bk.ask': 'از مرورگر بخواه نگهش دارد', 'settings.bk.askNo': 'مرورگر فعلاً نپذیرفت، پس پشتیبان‌ها مهم‌ترند.',
      'settings.bad.shape': 'یکی از ورودی‌ها ساختار نادرستی دارد: {k}.', 'settings.bad.draft': 'پیش‌نویس داخل آن خوانده نمی‌شود.', 'settings.bad.noTeam': 'تیمی در آن نیست، پس کسی نمی‌تواند پنل را باز کند.',
      'settings.snap.title': 'بازگردانی بدون راه برگشت؟', 'settings.snap.text': 'این مرورگر نتوانست نسخه‌ای از وضعیت فعلی نگه دارد، پس این بازگردانی برگشت‌پذیر نیست. اگر ممکن است لازمتان شود، اول یک پشتیبان بگیرید.',
      'settings.rs.undo': 'برگرداندن بازگردانی', 'settings.rs.undone': 'بازگردانی برگردانده شد و پنل به حالت قبل برگشت.', 'settings.rs.rolledBack': 'آن پشتیبان باز نشد، پس پنل به حالت قبل برگشت. چیزی از دست نرفت.',
      'settings.rs.done': 'نسخهٔ پشتیبان بازگردانی شد.', 'settings.rs.row': '{ago} یک پشتیبان را بازگردانی کردید.', 'settings.rs.rowD': 'با برگرداندن، پنل به حالت پیش از آن برمی‌گردد و تغییرات بعد از بازگردانی از دست می‌رود.',
      'settings.rs.confirm': 'بازگردانی برگردانده شود؟', 'settings.rs.keep': 'داده‌های بازگردانی‌شده بماند', 'settings.rs.broken': 'پشتیبانِ بازگردانی‌شده باز نشد و نسخهٔ قبلی هم برای برگشت نیست.', 'settings.rs.clear': 'پاکش کن و از نو شروع کن',
      'settings.gs.title': 'شروع کار', 'settings.gs.progress': '{done} از {total} انجام شد', 'settings.gs.banner': 'شروع کار: {done} از {total} انجام شد.', 'settings.gs.see': 'دیدن فهرست', 'settings.gs.hide': 'پنهان کن', 'settings.gs.hidden': 'فهرست پنهان شد و در تنظیمات › دربارهٔ پنل می‌ماند.',
      'settings.gs.all': 'همه‌چیز آماده است: پنل و سایت واقعاً کار می‌کنند.', 'settings.gs.done': 'انجام شد', 'settings.gs.todo': 'انجام‌نشده',
      'settings.gs.folder': 'وصل کردن پوشهٔ وب‌سایت', 'settings.gs.folderD': 'آن‌وقت انتشار، assets/content.js را مستقیم در سایت می‌نویسد.',
      'settings.gs.email': 'بررسی ایمیل استودیو', 'settings.gs.emailD': 'درخواست‌ها و بخش تماس از آن استفاده می‌کنند.', 'settings.gs.emailOk': 'درست است', 'settings.gs.emailEdit': 'ویرایش ایمیل',
      'settings.gs.form': 'راه‌اندازی سرویس فرم', 'settings.gs.formD': 'تا درخواست‌ها حتی وقتی بازدیدکننده برنامهٔ ایمیل ندارد هم برسند.', 'settings.gs.formDo': 'تنظیم فرم',
      'settings.gs.analytics': 'وصل کردن آمار', 'settings.gs.analyticsD': 'برای شمردن بازدیدکننده‌های واقعی.',
      'settings.gs.publish': 'اولین انتشار', 'settings.gs.publishD': 'تا ویرایش‌هایتان به سایت برسد.',
      'settings.gs.backup': 'گرفتن اولین پشتیبان', 'settings.gs.backupD': 'همه‌چیز اینجا فقط در همین مرورگر است.',
      'settings.docsD': 'درخواست‌ها چطور می‌رسند، انتشار چطور کار می‌کند، پشتیبان‌ها، نقش‌ها و محدودیت‌ها. راهنما به زبان انگلیسی است.', 'settings.cmd.start': 'فهرست شروع کار',
      'settings.bk.manage': 'تغییرش در انتشار و تاریخچه', 'settings.bk.none': 'هنوز پوشهٔ پشتیبانی انتخاب نشده.',
    },
  });

  /* ---------------- constants ---------------- */
  const SECTIONS = [
    { id: 'studio', icon: 'mail' }, { id: 'hours', icon: 'clock' }, { id: 'form', icon: 'inbox' }, { id: 'analytics', icon: 'chart' },
    { id: 'privacy', icon: 'lock' }, { id: 'sections', icon: 'layers' }, { id: 'data', icon: 'archive' }, { id: 'about', icon: 'info' },
  ];
  // which content paths belong to which section (for the unpublished dots in the menu)
  const SEC_PATHS = { studio: /^studio\/(email|whatsapp|phoneLabel)$/, hours: /^studio\/(days|open|close|timezone|exceptions)(\/|$)/, form: /^studio\/(formEndpoint|formFields)(\/|$)|^ui\/(en|ar)\/budgets$/,
    analytics: /^studio\/analytics(\/|$)/, privacy: /^studio\/(consent|privacyUrl)$/, sections: /^(sections|layout)(\/|$)/ };
  const PENDING_RE = /^(studio|sections|layout)(\/|$)|^ui\/(en|ar)\/budgets$/;
  const ZONES = [
    ['Asia/Qatar', { en: 'Doha · Lusail', ar: 'الدوحة · لوسيل', fa: 'دوحه · لوسیل' }], ['Asia/Riyadh', { en: 'Riyadh', ar: 'الرياض', fa: 'ریاض' }],
    ['Asia/Dubai', { en: 'Dubai', ar: 'دبي', fa: 'دبی' }], ['Asia/Kuwait', { en: 'Kuwait', ar: 'الكويت', fa: 'کویت' }], ['Asia/Bahrain', { en: 'Manama', ar: 'المنامة', fa: 'منامه' }],
    ['Asia/Muscat', { en: 'Muscat', ar: 'مسقط', fa: 'مسقط' }], ['Asia/Tehran', { en: 'Tehran', ar: 'طهران', fa: 'تهران' }], ['Africa/Cairo', { en: 'Cairo', ar: 'القاهرة', fa: 'قاهره' }],
    ['Europe/Istanbul', { en: 'Istanbul', ar: 'إسطنبول', fa: 'استانبول' }], ['Europe/London', { en: 'London', ar: 'لندن', fa: 'لندن' }], ['Europe/Paris', { en: 'Paris', ar: 'باريس', fa: 'پاریس' }],
    ['America/New_York', { en: 'New York', ar: 'نيويورك', fa: 'نیویورک' }], ['UTC', { en: 'UTC', ar: 'التوقيت العالمي', fa: 'زمان جهانی' }],
  ];
  // form services people actually use with a static site (matched by host)
  const SERVICES = [
    { id: 'formspree', name: 'Formspree', re: /(^|\.)formspree\.io$/i, pattern: 'https://formspree.io/f/…', url: 'https://formspree.io' },
    { id: 'web3forms', name: 'Web3Forms', re: /(^|\.)web3forms\.com$/i, pattern: 'https://api.web3forms.com/submit', url: 'https://web3forms.com' },
    { id: 'getform', name: 'Getform', re: /(^|\.)getform\.io$/i, pattern: 'https://getform.io/f/…', url: 'https://getform.io' },
    { id: 'basin', name: 'Basin', re: /(^|\.)usebasin\.com$/i, pattern: 'https://usebasin.com/f/…', url: 'https://usebasin.com' },
    { id: 'hook', name: null, re: /(^|\.)(make\.com|integromat\.com|zapier\.com)$/i, pattern: 'https://hook.eu1.make.com/…', url: 'https://www.make.com' },
  ];
  // analytics providers, mirroring injectAnalytics() in index.html
  const DOMAIN = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const AN = {
    plausible: { name: 'Plausible', ph: 'mirasmarketing.com', def: 'https://plausible.io/js/script.js', src: true },
    ga4: { name: 'Google Analytics 4', ph: 'G-AB12CD34EF', src: false },
    umami: { name: 'Umami', ph: '4f9c2a1e-0b7d-4c55-9a3e-2d1f6b8c7e90', def: 'https://cloud.umami.is/script.js', src: true },
  };
  // every event index.html sends with track(), and the details it attaches
  const EVENTS = [['view', 'ref, utm'], ['journey', 'p'], ['swell', 'id, on'], ['service', 'id, on'], ['section', 'id'], ['plan_to_brief', 'n'], ['make', 'id, w'], ['work', 'to'], ['faq', 'i'], ['lang', 'to'],
    ['brief', 'waves, n'], ['brief_copy', ''], ['brief_blocked', 'why'], ['consent', 'on']];
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const SUNDAY = Date.UTC(2024, 0, 7, 12); // 7 Jan 2024 was a Sunday, so day d is SUNDAY + d days
  const LOG_KEY = 'integrations.log';
  const TIMEOUT_S = 15;
  const SPAM_S = 3;                       // the site's minimum fill time (index.html submit handler)
  const STEP_MIN = 15;                    // ↑/↓ in a time field
  const SHARE_KEY = 'analytics.shareUrl'; // MA.db: a provider's shared dashboard link (the Analytics page can embed it)
  const AUTO_KEY = 'backup.auto';         // MA.db: { at, ok, why, file, trigger } of the last automatic backup
  const GS_HIDE = 'settings.gsHidden', GS_EMAIL = 'settings.gsEmailOk';
  const RESTORE_KEY = 'miras.restore';    // localStorage, outside the admin namespace: { at, phase: 'check'|'ok'|'undone'|'rolledBack', snap: 'idb'|'ls'|'' }
  const SNAP_LS = 'miras.restore.snapshot';
  const YMD = /^\d{4}-\d{2}-\d{2}$/, HM = /^([01]?\d|2[0-3]):[0-5]\d$/;
  // dashboards people open from here (honest: the admin itself never fetches provider numbers)
  const DASH = { plausible: id => 'https://plausible.io/' + encodeURIComponent(String(id).split(',')[0].trim()), ga4: () => 'https://analytics.google.com/', umami: () => 'https://cloud.umami.is/' };

  /* ---------------- helpers ---------------- */
  const C = () => MA.content;
  const studio = () => C().get('studio') || {};
  const canContent = () => MA.can('settings.edit') && MA.can('content.edit');
  const canData = () => MA.can('settings.edit');
  const siteLang = () => MA.siteLang(); // site copy exists in English and Arabic only (ADMIN.md rule 3)
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const isAdminKey = k => k.startsWith('miras.admin.') || k === 'miras.cms.draft';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const httpsOk = v => { try { const u = new URL(String(v || '').trim()); return u.protocol === 'https:' && /\./.test(u.hostname); } catch (e) { return false; } };
  const hostOf = v => { try { return new URL(v).host; } catch (e) { return String(v || ''); } };
  const digits = v => String(v || '').replace(/\D/g, '');
  const mins = v => { const [hh, mm] = String(v || '').split(':').map(Number); return (hh || 0) * 60 + (mm || 0); };
  const siteHHMM = v => { const [hh, mm] = String(v || '').split(':'); return `${+hh || 0}:${String(mm || '00').padStart(2, '0')}`; }; // exactly what the site prints for {open}
  const fmtHM = v => { const m = String(v || '').match(/^(\d{1,2}):(\d{2})$/); if (!m) return '—'; return MA.date(Date.UTC(2024, 0, 7, +m[1] % 24, +m[2]), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }); };
  const dayName = (d, style = 'long') => MA.date(SUNDAY + d * 864e5, { weekday: style, timeZone: 'UTC' });
  const siteDay = (d, l) => new Intl.DateTimeFormat(l === 'ar' ? 'ar' : 'en-GB', { weekday: 'long', timeZone: 'UTC' }).format(new Date(SUNDAY + d * 864e5));
  const tzOffset = z => { try { return new Intl.DateTimeFormat('en-US', { timeZone: z, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || ''; } catch (e) { return ''; } };
  const tzName = z => { const f = ZONES.find(x => x[0] === z); return f ? MA.L(f[1]) : z; };
  const fmtSize = b => b >= 1048576 ? t('mb', { n: MA.num(b / 1048576, { maximumFractionDigits: 1 }) }) : t('kb', { n: MA.num(b / 1024, { maximumFractionDigits: b < 10240 ? 1 : 0 }) });
  const norm = s => String(s || '').toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ً-ْ‌]/g, '');
  const reduced = () => MA.reducedMotion();
  const put = (el, ...kids) => el.append(...kids.filter(k => k != null && k !== false));
  const callout = (tone, icon, ...kids) => h('div', { class: 'callout ' + tone }, MA.iconEl(icon), h('div.grow', ...kids));
  const extLink = (href, label) => h('a.st-link', { href, target: '_blank', rel: 'noopener', html: `<span>${esc(label)}</span>${MA.icon('external', 'sm')}` });
  const serviceOf = v => { if (!httpsOk(v)) return null; const host = new URL(String(v).trim()).hostname, s = SERVICES.find(x => x.re.test(host)); if (!s) return null; return { ...s, name: s.name || (/zapier/i.test(host) ? 'Zapier' : 'Make') }; };

  /* ---- 24-hour times and dates (the studio's own calendar day, no time zone maths) ---- */
  const addYMD = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const ymdTime = ymd => Date.parse(ymd + 'T12:00:00Z');
  const dayDiff = (a, b) => Math.round((ymdTime(b) - ymdTime(a)) / 864e5);
  const fmtYMD = (ymd, o = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) => YMD.test(ymd) ? MA.date(ymdTime(ymd), { ...o, timeZone: 'UTC' }) : '—';
  /** '930', '9:30', '09.30', '۰۹:۳۰' → '09:30'; null when it isn't a 24-hour time. */
  const parseHM = raw => {
    const v = MA.fold(String(raw ?? '')).trim().replace(/[.\s٫،]/g, ':');
    const m = v.match(/^(\d{1,2}):(\d{2})$/) || v.match(/^(\d{1,2})(\d{2})$/) || (/^\d{1,2}$/.test(v) ? [v, v, '00'] : null);
    if (!m || +m[1] > 23 || +m[2] > 59) return null;
    return `${String(+m[1]).padStart(2, '0')}:${m[2]}`;
  };
  const hmOf = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

  /** The studio clock in its own time zone, computed exactly as index.html's studioNow(). */
  function clockIn(tz) {
    const opts = z => ({ timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false });
    let parts; try { parts = new Intl.DateTimeFormat('en-GB', opts(tz || 'Asia/Qatar')).formatToParts(new Date()); } catch (e) { parts = new Intl.DateTimeFormat('en-GB', opts('Asia/Qatar')).formatToParts(new Date()); }
    const get = k => parts.find(p => p.type === k)?.value;
    return { h: +get('hour') % 24, m: +get('minute'), wd: WD[get('weekday')] ?? 0, ymd: `${get('year')}-${get('month')}-${get('day')}` };
  }
  /** Special days the site will use: a valid first day; the last day defaults to the first. */
  const exceptionsOf = st => (Array.isArray(st?.exceptions) ? st.exceptions : []).filter(x => isObj(x) && YMD.test(x.from));
  const lastDay = x => YMD.test(x?.to) && x.to >= x.from ? x.to : x?.from;
  const isClosedX = x => typeof x?.closed === 'boolean' ? x.closed : !(HM.test(x?.open || '') && HM.test(x?.close || ''));
  const xLabel = (x, l = siteLang()) => { const lb = isObj(x?.label) ? x.label : {}; return MA.strip(String(lb[l] || lb.en || lb.ar || '')).trim(); };
  /** A day's hours, exactly as index.html's hoursOn(): a special day wins over the weekly hours. */
  function hoursOn(st, ymd, wd) {
    const x = exceptionsOf(st).find(e => ymd >= e.from && ymd <= lastDay(e));
    if (x) return isClosedX(x) ? { x, closed: true } : { x, open: HM.test(x.open || '') ? x.open : st.open, close: HM.test(x.close || '') ? x.close : st.close };
    return (st.days || []).map(Number).includes(wd) ? { open: st.open, close: st.close } : { closed: true };
  }
  /** What the site's clock says right now (mirrors tickClock(): closedFor / hoursFor / open / today / tomorrow / weekend). */
  function openState(st = studio()) {
    const c0 = clockIn(st.timezone), now = c0.h * 60 + c0.m, day = hoursOn(st, c0.ymd, c0.wd), label = day.x ? xLabel(day.x) : '';
    let n = 1, next = null; for (; n <= 21; n++) { const hh = hoursOn(st, addYMD(c0.ymd, n), (c0.wd + n) % 7); if (!hh.closed) { next = hh; break; } }
    const open = !day.closed && now >= mins(day.open) && now < mins(day.close);
    const key = day.closed && label ? 'closedFor' : !day.closed && label && now < mins(day.close) ? 'hoursFor'
      : open ? 'open' : !day.closed && now < mins(day.open) ? 'today' : !day.closed && n === 1 ? 'tomorrow' : 'weekend';
    const later = key === 'today' || key === 'hoursFor';
    return { open, key, c0, now, day, next, n, label, nextDay: (c0.wd + n) % 7, openAt: later ? day.open : next?.open || st.open, anyDay: open || !!next || (!day.closed && now < mins(day.open)) };
  }

  /* ---------------- page state ---------------- */
  const S = { root: null, q: '', formMode: null, provider: null, upd: {}, building: null, active: 'studio', lastEndpoint: '', lastTest: null, sending: false, counts: {}, cat: [] };
  const mounted = () => !!S.root?.isConnected;
  /** Register a function that refreshes part of the section being built whenever the draft changes. Runs once now. */
  const upd = fn => { (S.upd[S.building] ||= []).push(fn); fn(); };
  const runUpdaters = () => Object.values(S.upd).flat().forEach(fn => { try { fn(); } catch (e) { console.error(e); } });

  /** Searchable catalogue: [id, section, label, english keywords]. Items a mode hides point at their parent. */
  const PARENT = { endpoint: 'mode', providers: 'mode', test: 'mode', log: 'mode', payload: 'mode', aid: 'provider', src: 'provider', snippet: 'provider', share: 'provider', ranges: 'fields' };
  // the site's own section list (index.html defaults); keys left in an old draft by an earlier site version do nothing, so they aren't offered
  // the redesigned site titles the plan section "Services"; other names come from the core's section names
  const secName = id => MA.i18n.has('settings.secName.' + id, 'en') ? t('secName.' + id) : C().groupName(id);
  const sectionIds = () => Object.keys(C()?.defaults?.sections || C()?.get('sections') || {});
  const catalog = () => [
    ['email', 'studio', t('email'), 'email mail address contact'], ['whatsapp', 'studio', t('wa'), 'whatsapp phone number mobile wa.me'],
    ['phoneLabel', 'studio', t('label'), 'phone label display number'], ['where', 'studio', t('where'), 'where used appears contact seo google'],
    ['now', 'hours', t('nowIn'), 'now status open closed lusail clock message'], ['days', 'hours', t('days'), 'days week weekend sunday friday saturday working'],
    ['times', 'hours', t('times'), 'open close opening closing time hours 24'], ['exceptions', 'hours', t('x.title'), 'special days holiday holidays eid ramadan national day sport closed closure exceptions عيد رمضان عید'],
    ['tz', 'hours', t('tz'), 'timezone time zone qatar doha gmt utc'], ['week', 'hours', t('week'), 'week schedule'],
    ['mode', 'form', t('mode'), 'form delivery mailto email app service brief'], ['endpoint', 'form', t('endpoint'), 'endpoint url webhook address'],
    ['providers', 'form', t('providers'), 'formspree web3forms getform basin make zapier webhook cors'], ['test', 'form', t('test'), 'test send brief'],
    ['log', 'form', t('log'), 'integrations log request id retry'], ['payload', 'form', t('payload'), 'json payload fields'],
    ['fields', 'form', t('ff.title'), 'fields phone whatsapp budget optional form brief'], ['ranges', 'form', t('ff.ranges'), 'budget ranges options qar'],
    ['provider', 'analytics', t('provider'), 'analytics provider plausible ga4 google umami tracking'], ['aid', 'analytics', t('i.aid'), 'id domain measurement website'],
    ['src', 'analytics', t('src'), 'script src self hosted'], ['snippet', 'analytics', t('snippet'), 'snippet script head code'], ['events', 'analytics', t('events'), 'events tracked goals'],
    ['share', 'analytics', t('an.share'), 'shared dashboard link embed share url looker'],
    ['consent', 'privacy', t('cs.title'), 'consent cookie cookies banner gdpr bar ask'], ['privacyUrl', 'privacy', t('pv.title'), 'privacy policy notice link url'], ['spam', 'privacy', t('sp.title'), 'spam bots honeypot protection'],
    ['order', 'sections', t('sec.order'), 'order reorder drag move layout section'],
    ...sectionIds().map(id => ['sec-' + id, 'sections', secName(id), 'section show hide ' + id + (id === 'plan' ? ' services plan' : '')]),
    ['export', 'data', t('bk.title'), 'backup backups export download json'], ['autoBackup', 'data', t('bk.folder'), 'automatic backup folder icloud dropbox drive'], ['persist', 'data', t('bk.keep'), 'persist storage keep evict'],
    ['import', 'data', t('import'), 'import restore backup upload'],
    ['siteEvents', 'data', t('evt.title'), 'events clear local browser'], ['samples', 'data', t('smp.title'), 'sample demo data clear'], ['reset', 'data', t('reset.title'), 'reset erase wipe start over'],
    ['start', 'about', t('gs.title'), 'getting started checklist setup onboarding first steps'],
    ['stored', 'about', t('store'), 'storage stored localstorage indexeddb where'], ['publishing', 'about', t('how'), 'publish content.js how'], ['docs', 'about', t('help'), 'docs documentation help guide manual'],
  ];
  const hay = c => norm([c[2], t('s.' + c[1]), c[3]].join(' '));
  const matches = (c, q) => { const hs = hay(c); return norm(q).split(/\s+/).filter(Boolean).every(w => hs.includes(w)); };

  /** Wrap one setting so the search can find it. */
  const item = (id, ...kids) => h('div.st-item', { dataset: { item: id } }, ...kids);
  /** MA.form.one, read-only unless this role may edit settings. */
  function one(path, opts) {
    const box = MA.form.one(path, { ...opts, readonly: !canContent() });
    if (!canContent()) box.querySelector('.cf-head .tools')?.remove();
    const inp = box.querySelector('[data-path]');
    if (inp && opts.ltr) inp.setAttribute('dir', 'ltr');
    return box;
  }
  /** A field-like block for custom controls bound to content paths (shows "Unpublished" and a reset). The core calls _refresh on every draft change. */
  function bound(tpl, paths, label, body, sync, hint, { noReset } = {}) {
    const state = h('span.state'), tools = h('div.tools');
    if (canContent() && !noReset) tools.append(ui.iconBtn('refresh', { tip: MA.t('resetToDefault'), size: 'sm', onclick: () => paths.forEach(p => C().reset(p, 'default')) }));
    const box = h('div.cf.st-cf', { dataset: { tpl } }, h('div.cf-head', h('span.name', label), state, tools), body);
    if (hint) box.append(h('p.hint', hint));
    box._refresh = () => {
      const ch = paths.some(p => C().isChanged(p));
      state.className = 'state' + (ch ? ' changed' : ''); state.innerHTML = ch ? `${ui.tideMark.html('edited')}${esc(MA.t('changedField'))}` : '';
      sync?.();
    };
    box._refresh();
    return box;
  }
  /** A plain block (not a content field): name, optional actions, body. */
  const block = (name, actions, ...kids) => h('div.st-block', h('div.st-bhead', h('span.name', name), actions ? h('div.st-bacts', actions) : null), ...kids);
  /** A row with text on one side and actions on the other (admin data). */
  const drow = (title, desc, actions, extra) => h('div.st-drow', h('div.st-dtext', h('b', title), desc ? h('p', desc) : null, extra || null), h('div.st-dacts', actions));
  function previewAt(section) { const L = MA.preview.open({ section }); L?.frame?.goto?.(section); }

  /* =====================================================================
     STUDIO & CONTACT
     ===================================================================== */
  const BUILD = {};
  BUILD.studio = body => {
    // email
    const em = one('studio/email', { label: t('email'), kind: 'email', hint: esc(t('emailHint')), placeholder: 'hello@mirasmarketing.com', ltr: true });
    const emErr = h('p.err.st-err', { hidden: true });
    const emTest = h('a.btn.sm.ghost', { target: '_blank', rel: 'noopener', html: MA.icon('mail', 'sm') + `<span>${esc(t('emailTest'))}</span>` });
    em.append(emErr, h('div.st-acts', emTest));
    upd(() => {
      const v = String(studio().email || '').trim(), ok = EMAIL_RE.test(v);
      emErr.hidden = ok; emErr.textContent = v ? t('emailBad') : t('emailEmpty');
      emTest.hidden = !ok; emTest.href = `mailto:${v}?subject=${encodeURIComponent(MA.strip(C().get('ui/en/subject') || 'MIRAS') + ' (test)')}`;
    });
    // whatsapp digits
    const wa = one('studio/whatsapp', { label: t('wa'), hint: esc(t('waHint')), placeholder: '97455551234', ltr: true });
    wa.querySelector('[data-path]')?.setAttribute('inputmode', 'tel');
    const waNote = h('p.st-note'), waWarn = h('p.err.st-err', { hidden: true }, t('waShort'));
    const waOpen = h('a.btn.sm.ghost', { target: '_blank', rel: 'noopener', html: MA.icon('whatsapp', 'sm') + `<span>${esc(t('waOpen'))}</span>` });
    wa.append(waNote, waWarn, h('div.st-acts', waOpen));
    upd(() => {
      const raw = String(studio().whatsapp || ''), d = digits(raw);
      waNote.hidden = !raw || raw.trim() === d; waNote.innerHTML = d ? t('waDigits', { n: `<b class="mono ltr">${esc(d)}</b>` }) : '';
      waWarn.hidden = !d || d.length >= 8;
      waOpen.hidden = !d; waOpen.href = 'https://wa.me/' + d;
    });
    // the label shown on the site
    const lb = one('studio/phoneLabel', { label: t('label'), placeholder: '+974 5555 1234', ltr: true });
    const lbHint = h('p.hint'); lb.append(lbHint);
    upd(() => { const d = digits(studio().whatsapp); lbHint.textContent = d ? t('labelHint', { n: '⁦+' + d + '⁩' }) : t('labelHintNone'); });
    // where all this shows up
    const where = h('dl.st-where');
    upd(() => drawWhere(where));
    body.append(item('email', em), item('whatsapp', wa), item('phoneLabel', lb),
      item('where', block(t('where'), ui.btn(t('showContact'), { size: 'sm', kind: 'ghost', icon: 'eye', onclick: () => previewAt('contact') }), where)));
  };
  function drawWhere(dl) {
    const st = studio(), d = digits(st.whatsapp), email = `<b class="ltr">${esc(st.email || '—')}</b>`;
    const row = (k, ...v) => [h('dt', k), h('dd', ...v)];
    dl.innerHTML = '';
    dl.append(...row(t('w.contact'), d ? t('w.contactBoth') : t('w.contactEmail')));
    dl.append(...row(t('w.form'), h('span', { html: t(st.formEndpoint ? 'w.formService' : 'w.formMailto', { email }) })));
    // site copy that prints the address through {email}
    const hits = [];
    for (const grp of ['text', 'ui']) for (const l of ['en', 'ar']) for (const [k, v] of Object.entries(C().get(`${grp}/${l}`) || {})) if (String(v).includes('{email}') && !hits.some(x => x.grp === grp && x.k === k)) hits.push({ grp, k });
    const token = '<code class="mono">{email}</code>';
    const chips = h('div.st-chips', hits.map(({ grp, k }) => {
      const label = grp === 'text' ? `${C().groupName(C().groupOf(k))} · ${C().keyLabel(k)}` : `${MA.t('sec.ui')} · ${MA.i18n.has('pages.ui.' + k, 'en') ? MA.t('pages.ui.' + k) : k}`;
      return h('a.tag', { href: `#/pages?field=${encodeURIComponent(`${grp}/{lang}/${k}`)}` }, label);
    }));
    dl.append(...row(t('w.copy'), h('span', { html: t(hits.length ? 'w.copyD' : 'w.copyNone').replace('{email}', token) }), hits.length ? chips : null));
    if (MA.modules().some(m => m.id === 'seo')) dl.append(...row(t('w.seo'), h('span', t('w.seoD') + ' '), h('a.st-inline', { href: '#/seo' }, t('w.seoLink'))));
  }

  /* =====================================================================
     OPENING HOURS
     ===================================================================== */
  /** A 24-hour time field bound to a content path: 'HH:MM' in the draft whatever the browser's locale. 930, 9.30 and ۰۹:۳۰ all become 09:30; ↑/↓ move 15 minutes (⇧ an hour). */
  function timeField(path, label, { undoLabel, empty } = {}) {
    const can = canContent(), id = MA.uid('tm'), err = h('p.err.st-err', { id: id + '-e', hidden: true });
    const inp = h('input.input.st-time', { id, type: 'text', inputmode: 'numeric', autocomplete: 'off', spellcheck: false, dir: 'ltr', maxLength: 5, placeholder: '09:00', readOnly: !can, 'aria-describedby': [S.tmHint, id + '-e'].filter(Boolean).join(' ') });
    inp.value = C().get(path) || '';
    const opts = { label: undoLabel || label };
    const showErr = bad => { err.hidden = !bad; err.textContent = bad ? t('tm.bad', { h: MA.num(24), a: fmtHM('09:30'), b: fmtHM('18:00') }) : ''; bad ? inp.setAttribute('aria-invalid', 'true') : inp.removeAttribute('aria-invalid'); };
    inp.addEventListener('input', () => { const v = MA.fold(inp.value).trim(), hm = parseHM(v); if (hm && /^\d{1,2}[:.٫]\d{2}$/.test(v)) { showErr(false); C().set(path, hm, opts); } });
    inp.addEventListener('change', () => {
      const v = inp.value.trim(), hm = parseHM(v);
      if (!v && empty) { showErr(false); C().set(path, '', { ...opts, coalesce: false }); return; }
      if (!hm) { showErr(true); return; }
      showErr(false); inp.value = hm; C().set(path, hm, opts);
    });
    inp.addEventListener('keydown', e => {
      if (!can || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      const cur = parseHM(inp.value) || parseHM(C().get(path)) || '09:00', step = (e.shiftKey ? 60 : STEP_MIN) * (e.key === 'ArrowUp' ? 1 : -1);
      const v = hmOf(MA.clamp(mins(cur) + step, 0, 23 * 60 + 59));
      inp.value = v; showErr(false); C().set(path, v, opts);
    });
    inp.dataset.path = path; inp._get = () => parseHM(inp.value) || inp.value; inp._set = v => { inp.value = v || ''; showErr(false); }; // the core keeps it in step (undo, reset)
    const f = ui.field(label, inp); f.append(err);
    return f;
  }

  BUILD.hours = body => {
    // live status, same logic as the site
    const now = h('div.st-now', { 'aria-live': 'polite' });
    upd(() => drawNow(now));
    // one screen-reader hint shared by every time field on the page
    const tmHint = h('p.sr-only', { id: S.tmHint = MA.uid('tmh') }, t('tm.hint', { h: MA.num(24), m: MA.num(STEP_MIN) }));
    // days
    const daysNone = h('p.err.st-err', { hidden: true }, t('daysNone'));
    const dayBtns = Array.from({ length: 7 }, (_, d) => h('button.st-day', { type: 'button', disabled: !canContent(), 'aria-label': dayName(d), title: dayName(d), dataset: { d }, onclick: () => toggleDay(d) }, dayName(d, 'short')));
    const presets = canContent() ? h('div.st-presets', [['sunThu', [0, 1, 2, 3, 4]], ['monFri', [1, 2, 3, 4, 5]], ['all', [0, 1, 2, 3, 4, 5, 6]]].map(([k, ds]) => ui.btn(t('preset.' + k), { size: 'sm', kind: 'ghost', onclick: () => setDays(ds) }))) : null;
    const daysBox = bound('studio/days', ['studio/days'], t('days'), h('div.st-dayrow', h('div.st-days', { role: 'group', 'aria-label': t('days') }, dayBtns), presets), () => {
      const days = (studio().days || []).map(Number);
      dayBtns.forEach((b, d) => b.setAttribute('aria-pressed', String(days.includes(d))));
      daysNone.hidden = days.length > 0;
    }, t('daysHint'));
    daysBox.append(daysNone);
    // opening and closing time, on the 24-hour clock everywhere (no locale AM/PM)
    const timesErr = h('p.err.st-err.st-timeserr', { hidden: true }, t('timesBad'));
    const timesBox = bound('studio/open', ['studio/open', 'studio/close'], t('times'),
      h('div.st-times', timeField('studio/open', t('opens'), { undoLabel: `${t('times')} · ${t('opens')}` }), h('span.st-dash', { 'aria-hidden': 'true' }, '–'), timeField('studio/close', t('closes'), { undoLabel: `${t('times')} · ${t('closes')}` })),
      () => { timesErr.hidden = mins(studio().close) > mins(studio().open); }, t('timesHint', { h: MA.num(24) }));
    timesBox.append(timesErr);
    // special days (studio.exceptions)
    const xl = h('div.st-xlist');
    const presetBtn = canContent() ? ui.btn(t('x.presets'), { size: 'sm', icon: 'calendar', onclick: e => presetMenu(e.currentTarget) }) : null;
    if (presetBtn) { presetBtn.setAttribute('aria-haspopup', 'menu'); presetBtn.setAttribute('aria-expanded', 'false'); }
    const addBtn = canContent() ? ui.btn(t('x.add'), { size: 'sm', kind: 'ghost', icon: 'plus', onclick: () => addException() }) : null;
    const xState = h('span.state');
    const xBlock = h('div.st-block.st-xblock', h('div.st-bhead', h('span.name', { id: 'st-x-h' }, t('x.title')), xState, h('div.st-bacts', addBtn, presetBtn)), h('p.st-faint', t('x.hint')), xl);
    S.xSig = null;
    upd(() => {
      drawExceptions(xl);
      const ch = C().isChanged('studio/exceptions');
      xState.className = 'state' + (ch ? ' changed' : ''); xState.innerHTML = ch ? `${ui.tideMark.html('edited')}${esc(MA.t('changedField'))}` : '';
    });
    // time zone
    const cur = studio().timezone || 'Asia/Qatar';
    const zones = ZONES.some(z => z[0] === cur) ? ZONES : [[cur, { en: cur }], ...ZONES];
    const tz = one('studio/timezone', { label: t('tz'), kind: 'select', hint: esc(t('tzHint')), options: zones.map(([z]) => ({ value: z, label: `${tzName(z)} (${tzOffset(z) || 'GMT'})` })) });
    // a week at a glance
    const week = h('div.st-week');
    upd(() => drawWeek(week));
    S.tick = () => { if (mounted()) { drawNow(now); drawWeek(week); } };
    body.append(tmHint, item('now', now), item('days', daysBox), item('times', timesBox), item('exceptions', xBlock), item('tz', tz), item('week', block(t('week'), null, week)));
  };
  function setDays(ds) { C().set('studio/days', [...new Set(ds)].sort((a, b) => a - b), { label: t('days'), coalesce: false }); }
  function toggleDay(d) { const days = (studio().days || []).map(Number); setDays(days.includes(d) ? days.filter(x => x !== d) : [...days, d]); }
  function drawNow(el) {
    const st = studio(), s = openState(st), tz = st.timezone || 'Asia/Qatar', cl = siteLang();
    const lab = s.label ? `<span${MA.siteText.attrs(cl)}>${esc(s.label)}</span>` : '';
    const line = !s.anyDay ? esc(t('now.never'))
      : s.open ? (lab ? t('now.openFor', { label: lab, close: fmtHM(s.day.close) }) : esc(t('now.open', { close: fmtHM(s.day.close) })))
      : s.key === 'closedFor' ? (s.next ? t('now.closedFor', { label: lab, day: esc(dayName(s.nextDay)), open: fmtHM(s.openAt) }) : esc(t('now.never')))
      : s.key === 'hoursFor' ? t('now.todayFor', { label: lab, open: fmtHM(s.day.open) })
      : esc(s.key === 'today' ? t('now.today', { open: fmtHM(s.openAt) }) : s.key === 'tomorrow' ? t('now.tomorrow', { open: fmtHM(s.openAt) }) : t('now.later', { day: dayName(s.nextDay), open: fmtHM(s.openAt) }));
    // the message visitors see, filled in exactly as the site fills it
    const tpl = MA.strip(C().get(`ui/${cl}/${s.key}`) || '');
    const msg = tpl.replace(/\{open\}/g, siteHHMM(s.openAt)).replace(/\{day\}/g, siteDay(s.nextDay, cl)).replace(/\{close\}/g, s.day.close ? siteHHMM(s.day.close) : '').replace(/\{label\}/g, s.label);
    const clock = `${dayName(s.c0.wd)} ${fmtHM(`${s.c0.h}:${String(s.c0.m).padStart(2, '0')}`)} · ${tzName(tz)} (${tzOffset(tz) || 'GMT'})`;
    el.innerHTML = '';
    el.dataset.state = s.open ? 'open' : 'closed'; el.dataset.key = s.key;
    put(el,
      h('span', { class: 'st-pulse' + (s.open ? ' on' : '') }),
      h('div.grow',
        h('p.st-now-l', h('span.st-now-k', t('nowIn')), h('b.st-now-v', { html: line })),
        h('p.st-now-c', clock),
        msg ? h('p.st-visitor', h('span.st-vk', t('visitorsSee')), h('q', { lang: cl, dir: cl === 'ar' ? 'rtl' : 'ltr' }, msg)) : null),
      MA.modules().some(m => m.id === 'pages') && MA.can('content.edit') ? ui.btn(t('editMessages'), { size: 'sm', kind: 'ghost', icon: 'edit', href: '#/pages/studio' }) : null);
  }
  /** This week, Sunday to Saturday, with special days applied (the studio's dates, not the visitor's). */
  function drawWeek(el) {
    const st = studio(), s = openState(st), pct = m => (m / 14.4).toFixed(2) + '%';
    el.innerHTML = '';
    const grid = h('div.st-wk');
    for (let d = 0; d < 7; d++) {
      const ymd = addYMD(s.c0.ymd, d - s.c0.wd), hh = hoursOn(st, ymd, d), today = d === s.c0.wd, on = !hh.closed, o = on ? mins(hh.open) : 0, c = on ? mins(hh.close) : 0;
      const lab = hh.x ? xLabel(hh.x) || t('x.unnamed') : '';
      grid.append(h('div', { class: 'st-wk-row' + (today ? ' today' : '') + (on ? '' : ' off') + (hh.x ? ' special' : '') },
        h('span.st-wk-d', h('span', dayName(d, 'short')), h('span.st-wk-date', fmtYMD(ymd, { day: 'numeric', month: 'short' })), today ? h('span.sr-only', ' · ' + MA.t('today')) : null),
        h('span.st-wk-track', on && c > o ? h('i', { style: `inset-inline-start:${pct(o)};inline-size:${pct(c - o)}` }) : null,
          today ? h('b.st-wk-now', { style: `inset-inline-start:${pct(s.now)}`, title: MA.t('today') }) : null),
        h('span.st-wk-t', lab ? MA.siteText(lab, 'auto', { cls: 'st-wk-x' }) : null, on ? `${fmtHM(hh.open)}–${fmtHM(hh.close)}` : t('closed'))));
    }
    grid.append(h('span'), h('span.st-wk-axis', { 'aria-hidden': 'true' }, [0, 6, 12, 18, 24].map(n => h('span', MA.num(n)))), h('span'));
    el.append(grid);
  }

  /* ---- special days: list, presets (Hijri dates estimated with the Umm al-Qura calendar) ---- */
  const xListNow = () => (Array.isArray(studio().exceptions) ? studio().exceptions : []).map(x => MA.clone(x));
  const xName = x => xLabel(x) || t('x.unnamed');
  const xEst = () => MA.db.get('settings.xEst', []);
  function setExceptions(list, label) { return C().replace('studio/exceptions', list, label || t('x.title')); }
  let HIJRI = null;
  const hijri = ymd => {
    if (HIJRI === null) { try { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', timeZone: 'UTC' }); HIJRI = f.resolvedOptions().calendar === 'islamic-umalqura' ? f : false; } catch (e) { HIJRI = false; } }
    if (!HIJRI) return null;
    const p = HIJRI.formatToParts(new Date(ymdTime(ymd)));
    return { m: +p.find(x => x.type === 'month')?.value, d: +p.find(x => x.type === 'day')?.value };
  };
  /** The next Gregorian date (from `from`, within ~13 months) that is day d of Hijri month m, or ''. */
  const hijriNext = (m, d, from) => { for (let i = 0; i < 400; i++) { const y = addYMD(from, i), q = hijri(y); if (!q) return ''; if (q.m === m && q.d === d) return y; } return ''; };
  const nextYearly = (today, mmdd) => { const y = +today.slice(0, 4), d = `${y}-${mmdd}`; return d >= today ? d : `${y + 1}-${mmdd}`; };
  const secondTuesdayOfFeb = y => { const first = new Date(Date.UTC(y, 1, 1, 12)).getUTCDay(), day = 1 + ((2 - first + 7) % 7) + 7; return `${y}-02-${String(day).padStart(2, '0')}`; };
  const PRESETS = [
    { id: 'ramadan', key: 'x.p.ramadan', est: true, label: { en: 'Ramadan', ar: 'رمضان' }, dates(today) {
      const eid = hijriNext(10, 1, today); if (!eid) return { from: '', to: '' };
      let start = ''; for (let k = 29; k <= 30; k++) { const c = addYMD(eid, -k), q = hijri(c); if (q && q.m === 9 && q.d === 1) { start = c; break; } }
      return { from: start, to: addYMD(eid, -1) };
    }, hours: st => { const o = HM.test(st.open || '') ? st.open : '09:00'; return { closed: false, open: o, close: hmOf(Math.min(mins(o) + 6 * 60, HM.test(st.close || '') ? mins(st.close) : 15 * 60)) }; } },
    { id: 'eid-fitr', key: 'x.p.fitr', est: true, label: { en: 'Eid al-Fitr', ar: 'عيد الفطر' }, dates: today => { const f = hijriNext(10, 1, today); return { from: f, to: f ? addYMD(f, 2) : '' }; } },
    { id: 'eid-adha', key: 'x.p.adha', est: true, label: { en: 'Eid al-Adha', ar: 'عيد الأضحى' }, dates: today => { const f = hijriNext(12, 10, today); return { from: f, to: f ? addYMD(f, 3) : '' }; } },
    { id: 'national-day', key: 'x.p.national', label: { en: 'National Day', ar: 'اليوم الوطني' }, dates: today => { const f = nextYearly(today, '12-18'); return { from: f, to: '' }; } },
    { id: 'sport-day', key: 'x.p.sport', label: { en: 'National Sport Day', ar: 'اليوم الرياضي للدولة' }, dates: today => { const y = +today.slice(0, 4); let f = secondTuesdayOfFeb(y); if (f < today) f = secondTuesdayOfFeb(y + 1); return { from: f, to: '' }; } },
  ];
  function presetItem(p, today = clockIn(studio().timezone).ymd) {
    const st = studio(), dt = p.dates(today);
    return { id: `${p.id}-${(dt.from || today).slice(0, 4)}`, from: dt.from || '', to: dt.to && dt.to !== dt.from ? dt.to : '', label: { ...p.label }, closed: true, open: '', close: '', ...(p.hours ? p.hours(st) : {}) };
  }
  function presetMenu(anchor) {
    const today = clockIn(studio().timezone).ymd;
    ui.menu(anchor, PRESETS.map(p => { const x = presetItem(p, today); return { label: t(p.key), icon: 'calendar', meta: x.from ? fmtYMD(x.from, { day: 'numeric', month: 'short', year: 'numeric' }) : '', run: () => addException(x, p) }; }), { label: t('x.presets'), align: 'end' });
  }
  function addException(x, preset) {
    if (!canContent()) return;
    const list = xListNow();
    if (x && list.some(e => e.id === x.id)) { MA.toast(esc(t('x.there', { name: xName(x) }))); flashX(x.id); return; }
    const item = x || { id: MA.uid('day-'), from: '', to: '', label: { en: '', ar: '' }, closed: true, open: '', close: '' };
    // keep the list in date order as things are added (a row never jumps while you type in it)
    const at = list.findIndex(e => YMD.test(e.from) && YMD.test(item.from) && e.from > item.from);
    at < 0 ? list.push(item) : list.splice(at, 0, item);
    if (preset?.est) MA.db.set('settings.xEst', [...new Set([...xEst(), item.id])]);
    S.xFocus = item.id;
    setExceptions(list, x ? t('x.added', { name: xName(item) }) : t('x.add'));
    if (x) MA.toast(esc(t('x.added', { name: xName(item) })), { undo: () => setExceptions(xListNow().filter(e => e.id !== item.id), t('x.remove', { name: xName(item) })) });
  }
  function removeException(id) {
    if (!canContent()) return;
    const list = xListNow(), i = list.findIndex(e => e.id === id); if (i < 0) return;
    const [gone] = list.splice(i, 1), name = xName(gone);
    setExceptions(list, t('x.remove', { name }));
    setTimeout(() => (S.root?.querySelector('.st-xblock .st-bacts .btn') || S.root?.querySelector('#st-x-h'))?.focus?.(), 30);
    MA.toast(esc(t('x.removed', { name })), { undo: () => { const l = xListNow(); l.splice(Math.min(i, l.length), 0, gone); setExceptions(l, t('x.added', { name })); } });
  }
  function flashX(id) {
    const row = S.root?.querySelector(`.st-xrow[data-id="${CSS.escape(id)}"]`); if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    row.classList.remove('st-flash'); void row.offsetWidth; row.classList.add('st-flash');
  }
  /** Rows are rebuilt only when the list's shape changes (ids, order, closed or open); typing never rebuilds the row you're in. */
  function drawExceptions(el) {
    const list = Array.isArray(studio().exceptions) ? studio().exceptions : [];
    const sig = list.map(x => `${x?.id}:${isClosedX(x) ? 'c' : 'h'}`).join('|') + '#' + canContent();
    if (sig !== S.xSig) {
      S.xSig = sig; el.innerHTML = '';
      if (!list.length) el.append(h('p.st-xempty', t('x.empty')));
      list.forEach((x, i) => { if (isObj(x)) el.append(xRow(x, i)); });
      if (S.xFocus) { const id = S.xFocus; S.xFocus = null; setTimeout(() => { flashX(id); S.root?.querySelector(`.st-xrow[data-id="${CSS.escape(id)}"] input[type=date]`)?.focus({ preventScroll: true }); }, 40); }
    }
    MA.$$('.st-xrow', el).forEach(r => r._upd?.());
  }
  function xRow(x, i) {
    const can = canContent(), base = `studio/exceptions/${i}`, hid = MA.uid('xh');
    const title = h('b.st-x-name', { id: hid, dir: 'auto' }), sum = h('span.st-x-sum'), when = h('span.st-x-when');
    const rm = can ? ui.iconBtn('trash', { tip: t('x.remove', { name: xName(x) }), size: 'sm', onclick: () => removeException(x.id) }) : null;
    const names = h('div.cf-langs', ['en', 'ar'].map(l => {
      const inp = MA.form.input(`${base}/label/${l}`, { kind: 'text', dir: l === 'ar' ? 'rtl' : 'ltr', readonly: !can, placeholder: l === 'ar' ? 'عيد الفطر' : 'Eid al-Fitr' });
      inp.setAttribute('lang', l); inp.setAttribute('aria-label', `${t('x.name')} (${l.toUpperCase()})`);
      return h('div.cf-lang', h('span.lang-tag', { 'aria-hidden': 'true' }, l === 'ar' ? 'AR' : 'EN'), inp);
    }));
    const dateIn = (key, label) => {
      const inp = h('input.input.st-date', { type: 'date', dir: 'ltr', readOnly: !can, disabled: !can });
      inp.value = YMD.test(x[key]) ? x[key] : '';
      inp.dataset.path = `${base}/${key}`; inp._get = () => inp.value; inp._set = v => { inp.value = YMD.test(v) ? v : ''; };
      inp.addEventListener('change', () => {
        const v = inp.value; if (v && !YMD.test(v)) return;
        C().set(`${base}/${key}`, v, { label: `${t('x.title')} · ${label}`, coalesce: false });
        if (xEst().includes(x.id)) MA.db.set('settings.xEst', xEst().filter(id => id !== x.id)); // their own dates now
      });
      return inp;
    };
    const fromIn = dateIn('from', t('x.from')), toIn = dateIn('to', t('x.to'));
    const kind = ui.seg([{ value: 'closed', label: t('x.closed') }, { value: 'hours', label: t('x.hours') }], isClosedX(x) ? 'closed' : 'hours', v => setKind(i, v), { size: 'sm', label: `${xName(x)} · ${t('x.kind')}`, disabled: !can });
    const hours = isClosedX(x) ? null : h('div.st-times.st-xtimes',
      timeField(`${base}/open`, t('opens'), { undoLabel: `${t('x.title')} · ${t('opens')}`, empty: true }), h('span.st-dash', { 'aria-hidden': 'true' }, '–'),
      timeField(`${base}/close`, t('closes'), { undoLabel: `${t('x.title')} · ${t('closes')}`, empty: true }));
    const errs = h('div.st-xerrs'), est = h('p.st-note.st-xest', { hidden: true }, MA.iconEl('info', 'sm'), h('span', t('x.est')));
    const row = h('div.st-xrow', { dataset: { id: x.id }, role: 'group', 'aria-labelledby': hid },
      h('div.st-x-head', h('div.grow', h('div.st-x-title', title, when), sum), rm),
      h('div.st-x-grid',
        h('div.st-x-names', h('span.st-x-k', t('x.name')), names),
        h('div.st-x-line',
          h('div.st-x-dates', ui.field(t('x.from'), fromIn), ui.field(t('x.to'), toIn, { hint: esc(t('x.toHint')) })),
          h('div.st-x-kind', h('span.st-x-k', t('x.kind')), kind, hours))),
      est, errs);
    row._upd = () => {
      const st = studio(), cur = (st.exceptions || [])[i] || {}, today = clockIn(st.timezone).ymd, valid = YMD.test(cur.from), last = valid ? lastDay(cur) : '';
      const nm = xLabel(cur); title.textContent = nm || t('x.unnamed'); title.lang = nm ? MA.langOf(nm) : MA.lang();
      const range = !valid ? '' : last !== cur.from ? `${fmtYMD(cur.from)} – ${fmtYMD(last)}` : fmtYMD(cur.from);
      const what = isClosedX(cur) ? t('x.closed') : `${fmtHM(cur.open || st.open)}–${fmtHM(cur.close || st.close)}`;
      sum.textContent = [range, what].filter(Boolean).join(' · ');
      const past = valid && last < today, now = valid && cur.from <= today && today <= last;
      row.classList.toggle('past', past);
      when.innerHTML = '';
      if (past) when.append(ui.badge(t('x.past'), 'outline'));
      else if (now) when.append(ui.badge(t('x.now'), 'accent'));
      else if (valid) { try { when.textContent = new Intl.RelativeTimeFormat(MA.locale(), { numeric: 'auto' }).format(dayDiff(today, cur.from), 'day'); } catch (e) {} }
      toIn.min = valid ? cur.from : '';
      const lb = isObj(cur.label) ? cur.label : {}, bad = [];
      if (!valid) bad.push(t('x.noFrom'));
      if (!String(lb.en || '').trim() || !String(lb.ar || '').trim()) bad.push(t('x.noLabel'));
      if (!isClosedX(cur) && mins(cur.close || st.close) <= mins(cur.open || st.open)) bad.push(t('timesBad'));
      errs.innerHTML = ''; errs.append(...bad.map(b => h('p.err.st-err', b)));
      est.hidden = !xEst().includes(cur.id);
      rm?.setAttribute('aria-label', t('x.remove', { name: nm || t('x.unnamed') })); rm?.setAttribute('data-tip', t('x.remove', { name: nm || t('x.unnamed') }));
    };
    return row;
  }
  function setKind(i, v) {
    if (!canContent()) return;
    const st = studio(), cur = (st.exceptions || [])[i] || {};
    C().batch(`${t('x.title')} · ${t(v === 'closed' ? 'x.closed' : 'x.hours')}`, () => {
      C().set(`studio/exceptions/${i}/closed`, v === 'closed');
      if (v === 'hours') { if (!HM.test(cur.open || '')) C().set(`studio/exceptions/${i}/open`, st.open); if (!HM.test(cur.close || '')) C().set(`studio/exceptions/${i}/close`, st.close); }
    });
  }

  /* =====================================================================
     FORM DELIVERY
     ===================================================================== */
  BUILD.form = body => {
    const ep = String(studio().formEndpoint || '');
    const mode = S.formMode = ep ? 'service' : (S.formMode === 'service' ? 'service' : 'mailto');
    const seg = ui.seg([{ value: 'mailto', label: t('mode.mailto'), icon: 'mail' }, { value: 'service', label: t('mode.service'), icon: 'link' }], mode, v => setMode(v), { disabled: !canContent(), label: t('mode') });
    const desc = h('p.st-mode-d'), funnel = h('p.st-faint');
    upd(() => {
      desc.innerHTML = t(S.formMode === 'service' ? 'mode.serviceD' : 'mode.mailtoD', { email: `<b class="ltr">${esc(studio().email || '—')}</b>` });
      funnel.textContent = t('funnelNote', { label: MA.metrics.briefLabel() });
    });
    body.append(item('mode', block(t('mode'), null, seg, desc, funnel)));
    if (mode === 'service') buildService(body);
    buildFields(body);
  };
  function buildService(body) {
    // endpoint
    const epBox = one('studio/formEndpoint', { label: t('endpoint'), kind: 'url', hint: esc(t('endpointHint')), placeholder: 'https://formspree.io/f/…', ltr: true });
    const epErr = h('p.err.st-err', { hidden: true }, t('endpointBad')), epEmpty = h('p.st-note', { hidden: true }, t('endpointEmpty')), det = h('p.st-ok', { hidden: true });
    epBox.append(epErr, epEmpty, det);
    const tips = h('div.st-pv');
    // test + log
    const res = h('div.st-res', { 'aria-live': 'polite' });
    const testBtn = ui.btn(t('test'), { icon: 'publish', onclick: () => runTest() }); testBtn.classList.add('st-testbtn');
    const testNeeds = h('p.st-note', { hidden: true }, t('testNeeds'));
    const log = h('div.st-log');
    S.drawLog = () => drawLog(log); S.drawRes = () => drawRes(res); S.testBtn = testBtn;
    upd(() => {
      const v = String(studio().formEndpoint || '').trim(), ok = httpsOk(v), svc = serviceOf(v);
      epErr.hidden = !v || ok; epEmpty.hidden = !!v;
      det.hidden = !svc; det.innerHTML = svc ? MA.icon('check', 'sm') + `<span>${esc(t('detected', { name: svc.name }))}</span>` : '';
      drawTips(tips, svc?.id);
      testBtn.disabled = !ok || S.sending; testNeeds.hidden = ok;
    });
    S.drawLog(); S.drawRes();
    const clearBtn = S.clearBtn = canData() ? ui.btn(t('clearLog'), { size: 'sm', kind: 'ghost', icon: 'trash', onclick: clearLog }) : null;
    put(body, item('endpoint', epBox),
      item('providers', block(t('providers'), null, tips, h('p.st-faint', t('cors')))),
      canData() ? item('test', block(t('test'), null, h('p.st-faint', t('testHint')), h('div.st-acts', testBtn), testNeeds, res)) : null,
      item('log', block(t('log'), clearBtn, log)),
      item('payload', h('details.st-details', h('summary', t('payload')), h('p.st-faint', t('payloadHint')), h('pre.code', JSON.stringify(samplePayload('', true), null, 2)))));
  }

  /* ---- optional brief-form fields (studio.formFields) and the budget ranges (ui.{en,ar}.budgets, '|' between items) ---- */
  const budgetsOf = l => { const v = String(C().get(`ui/${l}/budgets`) ?? ''); return v.trim() === '' ? [] : v.split('|').map(x => x.trim()); };
  const budgetRows = () => { const en = budgetsOf('en'), ar = budgetsOf('ar'), n = Math.max(en.length, ar.length); return Array.from({ length: n }, (_, i) => ({ en: en[i] ?? '', ar: ar[i] ?? '' })); };
  const noPipe = v => String(v ?? '').replace(/\|/g, '/');
  /** One undo step for a change to the ranges in both languages (they're matched by position, so they always move together). */
  function setBudgets(rows, label) { C().batch(label || t('ff.ranges'), () => { C().set('ui/en/budgets', rows.map(r => noPipe(r.en).trim()).join('|'), { coalesce: false }); C().set('ui/ar/budgets', rows.map(r => noPipe(r.ar).trim()).join('|'), { coalesce: false }); }); }
  function buildFields(body) {
    const can = canContent();
    const labels = MA.modules().some(m => m.id === 'pages') && MA.can('content.edit') ? h('a.st-inline.st-small', { href: `#/pages?field=${encodeURIComponent('text/{lang}/f.phone')}` }, t('ff.labels')) : null;
    const phone = one('studio/formFields/phone', { label: t('ff.phone'), kind: 'switch', hint: esc(t('ff.phoneD')) });
    const budget = one('studio/formFields/budget', { label: t('ff.budget'), kind: 'switch', hint: esc(t('ff.budgetD')) });
    // budget ranges: EN and AR side by side, one row per range
    const list = h('div.st-ranges', { role: 'list', 'aria-label': t('ff.ranges') }), rangesErr = h('p.err.st-err', { hidden: true }, t('ff.empty')), none = h('p.st-faint', { hidden: true }, t('ff.none'));
    const addR = can ? ui.btn(t('ff.add'), { size: 'sm', kind: 'ghost', icon: 'plus', onclick: () => { const rows = budgetRows(); rows.push({ en: '', ar: '' }); S.rFocus = rows.length - 1; setBudgets(rows, t('ff.add')); } }) : null;
    const ranges = h('div.st-rangebox', h('div.st-bhead', h('span.name', t('ff.ranges')), h('div.st-bacts', addR)), list, none, rangesErr);
    const drawRanges = () => {
      const rows = budgetRows(), focusIn = list.contains(document.activeElement);
      const sig = rows.length + '#' + can;
      // rebuild when the number of rows changes, or when the values changed from elsewhere (undo) while nobody is typing here
      if (sig !== S.rSig || (!focusIn && MA.$$('input', list).some(inp => inp.value !== rows[+inp.dataset.i]?.[inp.lang]))) {
        S.rSig = sig; list.innerHTML = '';
        rows.forEach((r, i) => list.append(rangeRow(r, i, rows.length)));
        if (S.rFocus != null) { const i = S.rFocus, sel = S.rFocusLang === 'handle' ? `.drag-handle[data-i="${i}"]` : `input[data-i="${i}"][lang="en"]`; S.rFocus = null; S.rFocusLang = null; setTimeout(() => list.querySelector(sel)?.focus(), 30); }
      }
      rangesErr.hidden = !rows.some(r => !r.en.trim() || !r.ar.trim());
      none.hidden = rows.length > 0;
      ranges.hidden = studio().formFields?.budget !== true;
    };
    S.rSig = null;
    upd(drawRanges);
    if (can) { const so = ui.sortable(list, { item: '.st-range', handle: '.drag-handle', onEnd: ids => { const rows = budgetRows(); S.rSig = null; setBudgets(ids.map(i => rows[+i]).filter(Boolean), t('ff.ranges')); } }); MA.cleanup(() => so.destroy()); }
    put(body, item('fields', h('div.st-block', h('div.st-bhead', h('span.name', t('ff.title')), labels ? h('div.st-bacts', labels) : null), h('p.st-faint', t('ff.d')))),
      item('phoneField', phone), item('budgetField', budget), item('ranges', ranges));
  }
  function rangeRow(r, i, n) {
    const can = canContent(), num = MA.num(i + 1);
    const move = d => { const rows = budgetRows(), j = i + d; if (j < 0 || j >= rows.length) return; [rows[i], rows[j]] = [rows[j], rows[i]]; S.rFocus = j; S.rFocusLang = 'handle'; S.rSig = null; setBudgets(rows, t('ff.ranges')); MA.announce(t('ff.moved', { n: MA.num(j + 1) })); };
    const handle = can && n > 1 ? h('button.drag-handle', { type: 'button', dataset: { i }, 'aria-label': t('ff.move', { n: num }), html: MA.icon('drag', 'sm'),
      onkeydown: e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); move(e.key === 'ArrowUp' ? -1 : 1); } } }) : null;
    const field = l => {
      const inp = h('input.input', { value: r[l], lang: l, dir: l === 'ar' ? 'rtl' : 'ltr', readOnly: !can, dataset: { i }, 'aria-label': `${t('ff.rangeN', { n: num })} · ${t('ff.' + l)}`, placeholder: l === 'ar' ? 'من 20,000 إلى 50,000 ريال' : 'QAR 20,000–50,000' });
      inp.addEventListener('input', () => { const rows = budgetRows(); if (!rows[i]) return; rows[i][l] = noPipe(inp.value); C().set(`ui/${l}/budgets`, rows.map(x => noPipe(x[l]).trim()).join('|'), { label: t('ff.ranges') }); });
      return h('div.cf-lang', h('span.lang-tag', { 'aria-hidden': 'true' }, l === 'ar' ? 'AR' : 'EN'), inp);
    };
    const rm = can ? ui.iconBtn('trash', { tip: t('ff.remove', { n: num }), size: 'sm', onclick: () => {
      const rows = budgetRows(), before = MA.clone(rows); rows.splice(i, 1); S.rSig = null; setBudgets(rows, t('ff.remove', { n: num }));
      MA.toast(esc(t('ff.removed')), { undo: () => { S.rSig = null; setBudgets(before, t('ff.ranges')); } });
    } }) : null;
    return h('div.st-range', { role: 'listitem', dataset: { i, id: i } }, handle || h('span.st-range-n', { 'aria-hidden': 'true' }, num), h('div.cf-langs', field('en'), field('ar')), rm);
  }
  function setMode(v) {
    if (v === S.formMode || !canContent()) return;
    const ep = String(studio().formEndpoint || '');
    S.formMode = v;
    if (v === 'mailto' && ep) {
      S.lastEndpoint = ep;
      C().set('studio/formEndpoint', '', { label: t('endpoint'), coalesce: false });
      MA.toast(esc(t('toMailto')), { undo: () => { C().set('studio/formEndpoint', S.lastEndpoint, { label: t('endpoint'), coalesce: false }); } });
    }
    redraw('form');
    if (v === 'service') setTimeout(() => S.root?.querySelector('.cf[data-tpl="studio/formEndpoint"] input')?.focus(), 40);
  }
  function drawTips(el, current) {
    el.innerHTML = '';
    for (const s of SERVICES) {
      el.append(h('div.st-pv-row', { dataset: { id: s.id }, 'aria-current': current === s.id ? 'true' : null },
        h('div.st-pv-n', h('b', s.name || t('pv.hookName')), h('code', s.pattern)),
        h('p', t('pv.' + s.id)),
        extLink(s.url, t('visit', { name: s.name || 'Make' }))));
    }
  }
  /** A sample brief shaped exactly like the one index.html posts, marked as a test. */
  function samplePayload(requestId, forDisplay = false) {
    const sw = (C().get('swells') || []).slice(0, 2), sv = (C().get('services') || []).slice(0, 2), mk = (C().get('make')?.[0] || []).slice(0, 1);
    return {
      id: forDisplay ? 'site-…' : 'test-' + Date.now().toString(36), at: forDisplay ? '2026-10-12T09:30:00.000Z' : new Date().toISOString(),
      name: forDisplay ? 'Noor Al-Kuwari' : 'MIRAS test brief', email: forDisplay ? 'noor@example.qa' : (studio().email || 'hello@mirasmarketing.com'), company: forDisplay ? 'Dar Lusail' : 'MIRAS (test)',
      phone: studio().formFields?.phone ? (forDisplay ? '+974 5555 1234' : '') : '', budget: studio().formFields?.budget ? (budgetsOf('en')[1] || budgetsOf('en')[0] || '') : '',
      waves: sw.map(s => s.id), services: sv.map(x => x.id), words: mk.map(w => MA.strip(w.en || '')).filter(Boolean), message: forDisplay ? '…' : 'A test brief sent from the MIRAS admin to check form delivery. You can delete it.', lang: 'en', source: forDisplay ? 'site' : 'admin-test',
      ref: forDisplay ? 'instagram.com' : '', utm: { source: forDisplay ? 'instagram' : '', medium: forDisplay ? 'social' : '', campaign: '' }, landing: forDisplay ? '/?utm_source=instagram' : '',
      picks: sw.map(s => MA.strip(s.en?.problem || s.id)).join(', '), _subject: MA.strip(C().get('ui/en/subject') || 'New project brief') + (forDisplay ? '' : ' (test)'),
      ...(forDisplay ? {} : { test: true, requestId }),
    };
  }
  const logList = () => MA.db.get(LOG_KEY, []);
  /** POST a test brief to the form service and keep the result in the integrations log. */
  async function send(endpoint, retryOf = '') {
    const reqId = 'req_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const t0 = performance.now(), ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), TIMEOUT_S * 1000);
    const e = { id: reqId, at: new Date().toISOString(), endpoint, host: hostOf(endpoint), status: 0, statusText: '', ok: false, error: '', body: '', ms: 0, retryOf, by: MA.team?.me?.()?.id || '' };
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(samplePayload(reqId)), signal: ctrl.signal });
      e.status = r.status; e.statusText = r.statusText || ''; e.ok = r.ok;
      try { e.body = (await r.text()).slice(0, 300); } catch (x) {}
    } catch (err) { e.error = err?.name === 'AbortError' ? 'timeout' : 'network'; }
    clearTimeout(timer);
    e.ms = Math.round(performance.now() - t0);
    MA.db.set(LOG_KEY, [e, ...logList()].slice(0, 40));
    MA.activity.log({ action: 'settings.formTest', target: `${e.host} · ${e.status || e.error}`, module: ID, href: '#/settings/form' });
    return e;
  }
  async function runTest(endpoint, retryOf) {
    const ep = String(endpoint || studio().formEndpoint || '').trim();
    if (!canData() || !httpsOk(ep) || S.sending) return null;
    S.sending = true;
    if (S.testBtn) { S.testBtn.disabled = true; S.testBtn.querySelector('span').textContent = t('sending'); }
    const e = await send(ep, retryOf);
    S.sending = false; S.lastTest = e;
    if (mounted()) {
      S.drawRes?.(); S.drawLog?.();
      if (S.testBtn?.isConnected) { S.testBtn.disabled = !httpsOk(studio().formEndpoint); S.testBtn.querySelector('span').textContent = t('test'); }
    }
    return e;
  }
  const code = e => `${e.status} ${e.statusText}`.trim();
  const resLabel = e => e.ok ? t('res.ok', { code: code(e) }) : e.status ? t('res.http', { code: code(e) }) : e.error === 'timeout' ? t('res.timeout', { s: MA.num(TIMEOUT_S) }) : t('res.network');
  function drawRes(el) {
    const e = S.lastTest; el.innerHTML = ''; if (!e) return;
    el.dataset.ok = String(e.ok);
    put(el, h('div.st-res-line', ui.badge(resLabel(e), e.ok ? 'good' : 'bad'), h('span.st-faint.num', `${t('ms', { n: MA.num(e.ms) })} · ${MA.time(e.at)}`), h('code.st-id', e.id)),
      h('p.st-faint', e.ok ? t('res.okD') : e.status ? t('res.httpD') : t('res.networkD')),
      !e.ok && e.body ? h('pre.code.st-resbody', e.body) : null);
  }
  function drawLog(el) {
    const list = logList(); el.innerHTML = '';
    if (S.clearBtn) S.clearBtn.hidden = !list.length;
    if (!list.length) { el.append(h('p.st-faint', t('logEmpty'))); return; }
    const tbl = h('table.table.st-table', h('thead', h('tr', [t('log.time'), t('log.id'), t('log.to'), t('log.result'), t('log.took'), ''].map(x => h('th', x)))),
      h('tbody', list.slice(0, 12).map(e => h('tr', { dataset: { id: e.id } },
        h('td.num', { title: MA.date(e.at, { dateStyle: 'medium', timeStyle: 'medium' }) }, MA.ago(e.at)),
        h('td', h('span.st-idcell', h('code.st-id', e.id), ui.iconBtn('copy', { tip: t('copyId'), size: 'sm', onclick: () => MA.copy(e.id) }))),
        h('td', h('span.ltr.st-host', e.host)),
        h('td', ui.badge(resLabel(e), e.ok ? 'good' : 'bad')),
        h('td.num', t('ms', { n: MA.num(e.ms) })),
        h('td.shrink', canData() && httpsOk(e.endpoint) ? ui.btn(t('retry'), { size: 'sm', kind: 'ghost', icon: 'refresh', onclick: () => runTest(e.endpoint, e.id) }) : null)))));
    el.append(h('div.st-tw', tbl));
  }
  function clearLog() {
    const prev = logList(); if (!prev.length) return;
    MA.db.set(LOG_KEY, []); S.drawLog?.();
    MA.toast(esc(t('logCleared')), { undo: () => { MA.db.set(LOG_KEY, prev); S.drawLog?.(); } });
  }

  /* =====================================================================
     ANALYTICS
     ===================================================================== */
  function idCheck(p, raw) {
    const v = String(raw || '').trim();
    if (!v) return { tone: 'warn', msg: t('idMissing') };
    if (p === 'plausible') return !/^https?:|\//i.test(v) && v.split(',').map(s => s.trim()).every(d => DOMAIN.test(d)) ? { tone: 'good', msg: t('idOk') } : { tone: 'bad', msg: t('idBad.plausible') };
    if (p === 'ga4') return /^UA-/i.test(v) ? { tone: 'bad', msg: t('idUA', { y: MA.num(2024, { useGrouping: false }) }) } : /^G-[A-Z0-9]{6,14}$/.test(v) ? { tone: 'good', msg: t('idOk') } : { tone: 'bad', msg: t('idBad.ga4') };
    return UUID.test(v) ? { tone: 'good', msg: t('idOk') } : { tone: 'bad', msg: t('idBad.umami', { n: MA.num(36) }) };
  }
  /** The tags index.html injects for this provider (mirrors injectAnalytics()). */
  function snippetFor(a) {
    const p = a.provider, id = String(a.id || '').trim(), A = AN[p]; if (!A || !id) return '';
    if (p === 'plausible') return `<script defer data-domain="${id}" src="${a.src || A.def}"></script>`;
    if (p === 'umami') return `<script defer data-website-id="${id}" src="${a.src || A.def}"></script>`;
    return `<script defer src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){ dataLayer.push(arguments); }\n  gtag('js', new Date());\n  gtag('config', '${id}');\n</script>`;
  }
  /** Pick a provider. Connecting one also switches studio.consent on, in the same undo step: the privacy policy promises that analytics wait for consent. */
  function setProvider(v) {
    if (!canContent()) return;
    const wasOff = studio().consent !== true;
    C().batch(t('provider'), () => { C().set('studio/analytics/provider', v, { label: t('provider'), coalesce: false }); if (AN[v]) C().set('studio/consent', true, { label: t('cs.title'), coalesce: false }); });
    if (AN[v] && wasOff) MA.toast(esc(t('cs.turnedOn')), { icon: 'lock' });
  }
  /** Opening Settings repairs a draft where a provider is set but consent is off (an old import, a restored version). Once per render, so ⌘Z can still step past it. */
  function enforceConsent() {
    const st = studio();
    if (AN[st.analytics?.provider] && st.consent !== true && canContent()) C().set('studio/consent', true, { label: t('cs.title'), coalesce: false });
  }
  const shareOk = v => httpsOk(v);
  // where each provider hides its share link (their UI is in English)
  const SHARE_PATH = { plausible: 'Site settings → Visibility → Shared links → New link', umami: 'Settings → Websites → Edit → Share URL', ga4: 'File → Embed report → Embed URL' };
  BUILD.analytics = body => {
    const a = studio().analytics || {}, p = S.provider = AN[a.provider] ? a.provider : '';
    const seg = ui.seg([{ value: '', label: t('p.none') }, ...Object.entries(AN).map(([v, x]) => ({ value: v, label: x.name }))], p,
      v => setProvider(v), { disabled: !canContent(), label: t('provider') });
    const provBox = bound('studio/analytics/provider', ['studio/analytics/provider'], t('provider'), h('div.st-prov', seg, h('p.st-mode-d', t('p.' + (p || 'none') + 'D'))), () => seg.set(AN[studio().analytics?.provider] ? studio().analytics.provider : ''));
    body.append(item('provider', provBox));
    // honest: the admin never fetches a provider's numbers
    const real = h('div.callout.st-real', MA.iconEl(p ? 'chart' : 'info'), h('div.grow',
      h('b', p ? t('an.real', { name: AN[p].name }) : t('an.none')), ' ', h('span', p ? t('an.realD', { name: AN[p].name }) : t('an.noneD'))),
      p ? extLink(DASH[p](a.id || ''), t('visit', { name: AN[p].name })) : null);
    if (p) upd(() => { const l = real.querySelector('a.st-link'); if (l) l.href = DASH[p](studio().analytics?.id || ''); });
    body.append(real);
    if (p) {
      const A = AN[p];
      const idBox = one('studio/analytics/id', { label: t('id.' + p), hint: esc(t('idHint.' + p, { n: MA.num(36) })), placeholder: A.ph, ltr: true });
      const idMsg = h('p.st-check');
      idBox.append(idMsg);
      upd(() => { const r = idCheck(p, studio().analytics?.id); idMsg.dataset.tone = r.tone; idMsg.innerHTML = MA.icon(r.tone === 'good' ? 'check' : r.tone === 'bad' ? 'warn' : 'info', 'sm') + `<span>${esc(r.msg)}</span>`; });
      body.append(item('aid', idBox));
      if (A.src) {
        const srcBox = one('studio/analytics/src', { label: t('src'), kind: 'url', hint: esc(t('srcHint', { name: A.name, def: A.def })), placeholder: A.def, ltr: true });
        const srcErr = h('p.err.st-err', { hidden: true }, t('endpointBad'));
        srcBox.append(srcErr);
        upd(() => { const v = String(studio().analytics?.src || '').trim(); srcErr.hidden = !v || httpsOk(v); });
        body.append(item('src', srcBox));
      }
      const codeEl = h('pre.code.st-snippet');
      const snipBlock = block(t('snippet'), ui.btn(t('copySnippet'), { size: 'sm', kind: 'ghost', icon: 'copy', onclick: () => MA.copy(codeEl.textContent) }), codeEl);
      upd(() => { const s = snippetFor(studio().analytics || {}); codeEl.textContent = s; snipBlock.hidden = !s; });
      body.append(item('snippet', snipBlock));
      // consent is part of connecting a provider (see Privacy & consent)
      const asked = h('p.st-asked');
      upd(() => { asked.innerHTML = ''; asked.append(MA.iconEl(studio().consent ? 'lock' : 'warn', 'sm'), h('span', studio().consent ? t('an.asked') : t('cs.needsFix')), ' ', h('a.st-inline', { href: '#/settings/privacy', onclick: e => { e.preventDefault(); goTo('privacy', true); } }, t('s.privacy'))); asked.dataset.tone = studio().consent ? 'good' : 'warn'; });
      body.append(asked);
      body.append(item('share', shareBox(p)));
    }
    const rows = EVENTS.map(([e, props]) => h('tr', h('td', h('code.st-ev', e)), h('td', t('ev.' + e)), h('td', props ? h('code.st-props', props) : h('span.st-faint', '—'))));
    const goA = MA.modules().some(m => m.id === 'analytics') && MA.can('analytics.view') ? ui.btn(t('openAnalytics'), { size: 'sm', kind: 'ghost', icon: 'chart', href: '#/analytics' }) : null;
    body.append(item('events', block(t('events'), goA, h('p.st-faint', t('eventsNote')),
      h('div.st-tw', h('table.table.st-table.st-events', h('thead', h('tr', h('th', t('ev.event')), h('th', t('ev.when')), h('th', t('ev.props')))), h('tbody', rows))))));
  };

  /** A provider's shared dashboard link, kept in this browser (MA.db 'analytics.shareUrl') for the Analytics page to embed. Never published. */
  function shareBox(p) {
    const can = canData(), id = MA.uid('share'), msg = h('p.st-check', { id: id + '-m' });
    const inp = h('input.input', { id, type: 'url', dir: 'ltr', spellcheck: false, autocomplete: 'off', placeholder: p === 'plausible' ? 'https://plausible.io/share/mirasmarketing.com?auth=…' : p === 'umami' ? 'https://cloud.umami.is/share/…' : 'https://lookerstudio.google.com/embed/reporting/…', readOnly: !can, 'aria-describedby': id + '-h ' + id + '-m' });
    inp.value = MA.db.get(SHARE_KEY, '') || '';
    const check = () => { const v = inp.value.trim(); msg.hidden = !v; msg.dataset.tone = shareOk(v) ? 'good' : 'bad'; msg.innerHTML = v ? MA.icon(shareOk(v) ? 'check' : 'warn', 'sm') + `<span>${esc(shareOk(v) ? t('an.shareOk') : t('an.shareBad'))}</span>` : ''; };
    inp.addEventListener('input', check);
    inp.addEventListener('change', () => {
      const v = inp.value.trim(), prev = MA.db.get(SHARE_KEY, '') || '';
      if (v === prev || (v && !shareOk(v))) return;
      v ? MA.db.set(SHARE_KEY, v) : MA.db.del(SHARE_KEY);
      MA.toast(esc(t(v ? 'an.shareSaved' : 'an.shareCleared')), { undo: () => { prev ? MA.db.set(SHARE_KEY, prev) : MA.db.del(SHARE_KEY); if (inp.isConnected) { inp.value = prev; check(); } } });
    });
    check();
    const box = h('div.cf.st-cf', { dataset: { tpl: 'analytics.shareUrl' } }, h('div.cf-head', h('label.name', { for: id }, t('an.share'))), h('div.cf-langs.one', h('div.cf-lang', inp)),
      h('p.hint', { id: id + '-h', html: `${t('an.shareHint.' + p, { path: `<span class="ltr">${esc(SHARE_PATH[p] || '')}</span>` })} ${esc(t('an.shareNote'))}` }), msg);
    return box;
  }

  /* =====================================================================
     PRIVACY & CONSENT
     ===================================================================== */
  /** A link the site accepts for privacyUrl: a relative path (privacy.html, /legal/privacy) or http(s). */
  const linkOk = v => { v = String(v || '').trim(); if (!v) return false; if (/^https?:\/\//i.test(v)) return httpsOk(v) || /^http:\/\/localhost/i.test(v); return !/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^\/\//.test(v) && !/\s/.test(v); };
  BUILD.privacy = body => {
    const can = canContent();
    // ask before analytics (studio.consent), locked on while a provider is connected
    const swId = MA.uid('cs'), lockNote = h('p.st-cs-note'), fix = h('p.err.st-err', { hidden: true }, t('cs.needsFix'));
    const sw = ui.switch(!!studio().consent, v => { if (!can || provOn()) return; C().set('studio/consent', v, { label: t('cs.title'), coalesce: false }); }, '', { labelledby: swId, describedby: swId + '-d' });
    sw.input.dataset.path = 'studio/consent'; sw.input._get = () => sw.input.checked; sw.input._set = v => { sw.input.checked = !!v || provOn(); };
    const lock = h('span.badge.outline.st-lock', MA.iconEl('lock', 'sm'), h('span', t('cs.lock')));
    const wording = MA.modules().some(m => m.id === 'pages') && MA.can('content.edit') ? h('a.st-inline.st-small', { href: `#/pages?field=${encodeURIComponent('text/{lang}/cons.text')}` }, t('cs.wording')) : null;
    const csBox = bound('studio/consent', ['studio/consent'], t('cs.title'),
      h('div.st-cs', h('div.st-cs-row', sw, lock), h('p.st-cs-what', { id: swId + '-d' }, t('cs.what')), lockNote, fix, wording ? h('div.st-acts', wording) : null),
      () => {
        const on = provOn(), cur = studio().consent === true;
        sw.input.checked = cur || (on && !can); sw.input.disabled = !can || on;
        lock.hidden = !on; lockNote.textContent = on ? t('cs.locked') : t('cs.none');
        fix.hidden = !(on && !cur);
      }, null, { noReset: true });
    csBox.querySelector('.cf-head .name')?.setAttribute('id', swId); // the field's visible name labels the switch
    // privacy notice link (studio.privacyUrl)
    const ex = String(C().def('studio/privacyUrl') || 'privacy.html');
    const exC = `<code class="ltr">${esc(ex)}</code>`;
    const pv = one('studio/privacyUrl', { label: t('pv.title'), kind: 'url', hint: t('pv.hint', { ex: exC }), placeholder: ex, ltr: true });
    const pvErr = h('p.err.st-err', { hidden: true }), pvOpen = h('a.btn.sm.ghost', { target: '_blank', rel: 'noopener', html: MA.icon('external', 'sm') + `<span>${esc(t('pv.open'))}</span>` });
    pv.append(pvErr, h('div.st-acts', pvOpen));
    upd(() => {
      const v = String(studio().privacyUrl || '').trim(), ok = linkOk(v);
      pvErr.hidden = ok; pvErr.innerHTML = v ? t('pv.bad', { ex: exC }) : esc(t('pv.empty'));
      pvOpen.hidden = !ok; if (ok) pvOpen.href = /^https?:/i.test(v) ? v : new URL(v.replace(/^\//, ''), new URL('../', location.href)).href;
    });
    // spam protection is built into the site: always on, explained
    const blocked = (() => { try { const ev = JSON.parse(localStorage.getItem('miras.events') || '[]'); return Array.isArray(ev) ? ev.filter(e => e?.e === 'brief_blocked').length : 0; } catch (e) { return 0; } })();
    const spam = h('div.st-block',
      h('div.st-bhead', h('span.name', t('sp.title')), h('span.badge.good', { html: `<span class="d"></span>${esc(t('sp.on'))}` })),
      h('p.st-mode-d', t('sp.d', { s: MA.num(SPAM_S) })), h('p.st-faint', t('sp.service')),
      blocked ? h('p.st-faint.num', t('sp.blocked', { n: MA.num(blocked) })) : null);
    body.append(item('consent', csBox), item('privacyUrl', pv), item('spam', spam));
  };
  const provOn = () => !!AN[studio().analytics?.provider];

  /* =====================================================================
     SECTIONS ON THE SITE
     ===================================================================== */
  BUILD.sections = body => {
    const ids = sectionIds(), can = canContent(), rows = {};
    const shown = h('p.st-faint.st-shown');
    const warn = callout('warn', 'warn', t('sec.contactWarn'));
    const list = h('div.st-secs', { role: 'list', 'aria-label': t('sec.order') });
    const orderState = h('span.state'), resetBtn = can ? ui.btn(t('sec.resetOrder'), { size: 'sm', kind: 'ghost', icon: 'refresh', onclick: () => C().reset('layout', 'default') }) : null;
    const head = h('div.st-bhead.st-orderhead', h('span.name', t('sec.order')), orderState, resetBtn ? h('div.st-bacts', resetBtn) : null);
    // the opening film is always first and the footer always last (index.html never lists them in layout)
    const fixed = (g, sentence, badge, icon) => h('div.st-fixrow', { role: 'listitem', dataset: { fixed: g } },
      h('span.st-pin', { 'aria-hidden': 'true', html: MA.icon(icon, 'sm') }),
      h('div.grow', h('div.st-secname', h('b', C().groupName(g)), ui.badge(badge, 'outline')), h('p', sentence)),
      ui.iconBtn('eye', { tip: MA.t('showInPreview'), size: 'sm', onclick: () => previewAt(g === 'foot' ? 'foot' : 'top') }));
    const move = (id, d) => {
      const order = orderOf(), i = order.indexOf(id), j = i + d; if (i < 0 || j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]];
      S.secFocus = id;
      C().set('layout', order, { label: t('sec.order'), coalesce: false });
      MA.announce(t('sec.moved', { name: secName(id), n: MA.num(j + 1), t: MA.num(order.length) }));
    };
    const row = id => {
      const name = secName(id), sentence = MA.i18n.has('settings.sec.' + id, 'en') ? t('sec.' + id) : t('sec.other');
      const sw = MA.form.input('sections/' + id, { kind: 'switch', readonly: !can });
      sw.querySelector('input')?.setAttribute('aria-label', name);
      const handle = can ? h('button.drag-handle', { type: 'button', 'aria-label': t('sec.move', { name }), html: MA.icon('drag', 'sm'),
        onkeydown: e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); move(id, e.key === 'ArrowUp' ? -1 : 1); } } }) : null;
      const state = h('span.state'), hid = ui.badge(t('sec.hidden'), 'outline');
      const r = h('div.st-item.st-secrow', { role: 'listitem', dataset: { item: 'sec-' + id, id } }, handle,
        h('div.grow', h('div.st-secname', h('b', name), hid, state), h('p', sentence)),
        ui.iconBtn('eye', { tip: MA.t('showInPreview'), size: 'sm', onclick: () => previewAt(C().sectionOf(id)) }), sw);
      rows[id] = { row: r, hid, state };
      return r;
    };
    let drawn = '';
    const draw = () => {
      const order = orderOf(), sig = order.join('|');
      if (sig === drawn) return; drawn = sig;
      list.innerHTML = '';
      list.append(fixed('top', t('sec.filmD'), t('sec.first'), 'lock'), ...order.map(row), fixed('foot', t('sec.footD'), t('sec.last'), 'lock'));
      if (S.secFocus) { const id = S.secFocus; S.secFocus = null; list.querySelector(`.st-secrow[data-id="${CSS.escape(id)}"] .drag-handle`)?.focus(); }
      if (S.q) filter(S.q, { keep: true });
    };
    upd(() => {
      draw();
      const secs = C().get('sections') || {};
      let n = 0;
      for (const id of ids) {
        const on = secs[id] !== false; if (on) n++;
        const r = rows[id]; if (!r) continue;
        r.row.classList.toggle('off', !on); r.hid.hidden = on;
        const ch = C().isChanged('sections/' + id); r.state.className = 'state' + (ch ? ' changed' : ''); r.state.innerHTML = ch ? `${ui.tideMark.html('edited')}${esc(MA.t('changedField'))}` : '';
      }
      shown.textContent = t('sec.shown', { n: MA.num(n), t: MA.num(ids.length) });
      warn.hidden = secs.contact !== false;
      const och = C().isChanged('layout');
      orderState.className = 'state' + (och ? ' changed' : ''); orderState.innerHTML = och ? `${ui.tideMark.html('edited')}${esc(t('sec.orderChanged'))}` : '';
      if (resetBtn) resetBtn.hidden = !C().isCustom('layout');
    });
    if (can) { const so = ui.sortable(list, { item: '.st-secrow', handle: '.drag-handle', onEnd: order => C().set('layout', order, { label: t('sec.order'), coalesce: false }) }); MA.cleanup(() => so.destroy()); }
    body.append(shown, warn, item('order', head), list);
  };
  /** Section ids in page order, exactly as the site reads layout: unknown and repeated ids dropped, missing ones appended in default order. */
  function orderOf() {
    const ids = sectionIds(), lay = C().get('layout');
    if (!Array.isArray(lay)) return ids;
    const seen = new Set(), out = [];
    for (const id of lay) if (ids.includes(id) && !seen.has(id)) { seen.add(id); out.push(id); }
    return [...out, ...ids.filter(id => !seen.has(id))];
  }

  /* =====================================================================
     ADMIN DATA
     ===================================================================== */
  const adminKeys = () => { try { return Object.keys(localStorage).filter(isAdminKey); } catch (e) { return []; } };
  const eventCount = () => { try { return JSON.parse(localStorage.getItem('miras.events') || '[]').length; } catch (e) { return 0; } };
  const sampleCounts = () => ({ briefs: MA.leads.raw().filter(l => l.sample).length, people: MA.team.raw().filter(m => m.sample).length, traffic: MA.metrics.sampleOn() });
  BUILD.data = body => {
    const keys = adminKeys(); let bytes = 0;
    try { for (const k of keys) bytes += (k.length + (localStorage.getItem(k) || '').length) * 2; } catch (e) {}
    const files = h('span');
    MA.idb.keys('files').then(ks => { files.textContent = ks?.length ? t('usageFiles', { n: MA.num(ks.length) }) : t('usageNoFiles'); }).catch(() => {});
    body.append(h('p.st-usage', t('usage', { size: fmtSize(bytes), n: MA.num(keys.length) }), ' ', files));
    if (!canData()) { body.append(callout('info', 'lock', t('noDataPerm'))); return; }

    // a restore can be undone for a week
    const rf = restoreFlag();
    if (rf?.phase === 'ok' && rf.snap && Date.now() - (Date.parse(rf.at) || 0) < 7 * 864e5)
      body.append(item('restoreUndo', h('div.callout.st-restored', ui.tideMark('edited'), h('div.grow', h('b', t('rs.row', { ago: MA.ago(rf.at) })), ' ', h('span.muted', t('rs.rowD'))),
        h('div.st-dacts', ui.btn(t('rs.undo'), { size: 'sm', icon: 'undo', onclick: () => undoRestore() }), ui.btn(t('rs.keep'), { size: 'sm', kind: 'ghost', onclick: keepRestored })))));
    // backups: how old the last one is, and one click to make one
    const bk = MA.backup.status();
    const stat = h('p.st-meta.st-bkstat', ui.tideMark(bk.at && !bk.due ? 'live' : 'edited'), h('span', bk.at ? t('bk.last', { ago: MA.ago(bk.at) }) : t('bk.never')), bk.due ? ui.badge(t('bk.due'), 'warn') : null);
    body.append(item('export', drow(t('bk.title'), t('bk.why'), ui.btn(t('bk.now'), { icon: 'download', kind: bk.due ? 'primary' : '', onclick: () => exportBackup() }), stat)));
    // automatic backups to a folder that syncs (File System Access API)
    const auto = h('div.st-auto');
    body.append(item('autoBackup', h('div.st-drow.st-drow-col', h('div.st-dtext', h('b', t('bk.folder')), h('p', { html: t('bk.folderD', { dir: '<code class="ltr">backups/</code>' }) }), h('p.st-note', t('bk.notSite'))), auto)));
    drawAuto(auto);
    // ask the browser not to evict this origin's storage
    const keep = h('div.st-dtext');
    const keepActs = h('div.st-dacts');
    body.append(item('persist', h('div.st-drow', keep, keepActs)));
    drawPersist(keep, keepActs);
    // restore (drop or choose)
    const err = h('div.st-imperr');
    const pick = ui.btn(t('choose'), { size: 'sm', icon: 'upload', onclick: async e => { e.stopPropagation(); const [f] = await MA.pickFile({ accept: '.json,application/json' }); if (f) readBackup(f, err); } });
    const dz = h('div.dropzone.st-drop', { tabindex: '0', role: 'button', 'aria-label': t('import') }, MA.iconEl('upload'), h('span', t('drop')), pick);
    dz.addEventListener('click', e => { if (e.target === dz || !e.target.closest('button')) pick.click(); });
    dz.addEventListener('keydown', e => { if (e.target === dz && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick.click(); } });
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); const f = e.dataTransfer?.files?.[0]; if (f) readBackup(f, err); });
    body.append(item('import', h('div.st-drow.st-drow-col', h('div.st-dtext', h('b', t('import')), h('p', t('importD'))), dz, err)));
    // site events kept by this browser
    const n = eventCount();
    body.append(item('siteEvents', drow(t('evt.title'), t('evt.d'), n ? ui.btn(t('evt.clear'), { icon: 'trash', onclick: clearEvents }) : null, h('p.st-meta', n ? t('evt.count', { n: MA.num(n) }) : t('evt.none')))));
    // sample data
    const sc = sampleCounts(), any = sc.briefs || sc.people || sc.traffic;
    const kv = h('dl.st-kv', h('dt', t('smp.briefs')), h('dd.num', MA.num(sc.briefs)), h('dt', t('smp.people')), h('dd.num', MA.num(sc.people)), h('dt', t('smp.traffic')), h('dd', t(sc.traffic ? 'smp.on' : 'smp.off')));
    const smpActs = any ? ui.btn(t('smp.clear'), { icon: 'trash', onclick: clearSamples })
      : h('div.st-dacts', h('span.st-faint', t('smp.none')), ui.btn(t('smp.showTraffic'), { size: 'sm', kind: 'ghost', onclick: () => { MA.prefs.set('sampleData', true); MA.emit('sample'); MA.renderNav?.(); redraw('data'); } }));
    body.append(item('samples', drow(t('smp.title'), t('smp.d'), smpActs, kv)));
    // reset
    body.append(item('reset', h('div.st-danger', drow(t('reset.title'), t('reset.d'), ui.btn(t('reset.btn'), { kind: 'danger', icon: 'warn', onclick: openReset })))));
  };
  async function drawPersist(text, acts) {
    let p = MA.backup.status().persisted;
    if (p == null && navigator.storage?.persisted) p = await within(navigator.storage.persisted(), 1500, null);
    if (!text.isConnected) return;
    text.innerHTML = ''; acts.innerHTML = '';
    text.append(h('b', t('bk.keep')), h('p', { class: p ? 'st-okline' : '' }, p ? t('bk.kept') : p === false ? t('bk.notKept') : t('bk.unknown')));
    if (p === false && navigator.storage?.persist) acts.append(ui.btn(t('bk.ask'), { size: 'sm', icon: 'lock', onclick: async () => { const r = await MA.backup.persist(); if (!r) MA.toast(esc(t('bk.askNo'))); if (mounted()) redraw('data'); } }));
  }

  /* ---- automatic backups to a folder that syncs. Publish & history owns the folder (IndexedDB 'handles' / 'backup') and
     backs up during a folder publish; Settings shows it, saves on demand, covers other publishes and adds a daily copy. ---- */
  const fsOK = () => typeof window.showDirectoryPicker === 'function';
  const pub = () => MA.publish || {};
  let folderMem; // a folder set for this session only (tests, or when Publish & history isn't loaded)
  async function getBackupFolder() {
    if (folderMem !== undefined) return folderMem;
    if (typeof pub().backupDir === 'function') return (await within(pub().backupDir(), 1500, null)) || null;
    return (await idbWithin(MA.idb.get('handles', 'backup'), 1200, null)) || null;
  }
  async function setBackupFolder(dir) { folderMem = dir === undefined ? undefined : dir || null; }
  /** The website folder is never a backup folder: everything in it is uploaded with the site, and a backup holds client details. */
  async function isSiteFolder(dir) { try { await dir.getFileHandle('index.html'); await dir.getDirectoryHandle('assets'); return true; } catch (e) { return false; } }
  /** Write today's backup into <folder>/backups/ (the same place Publish & history writes). → { ok, file } | { perm: true } | { err } */
  async function writeToFolder(dir, ask) {
    if (typeof pub().backupTo === 'function' && folderMem === undefined) return pub().backupTo(dir, { ask });
    try {
      let p = dir.queryPermission ? await dir.queryPermission({ mode: 'readwrite' }) : 'granted';
      if (p !== 'granted' && ask && dir.requestPermission) p = await dir.requestPermission({ mode: 'readwrite' });
      if (p !== 'granted') return { perm: true };
      const data = await buildBackup(), name = `miras-admin-backup-${MA.qDay(Date.now())}.json`;
      const sub = await dir.getDirectoryHandle('backups', { create: true }), fh = await sub.getFileHandle(name, { create: true }), w = await fh.createWritable();
      await w.write(JSON.stringify(data, null, 1)); await w.close();
      MA.backup.mark();
      return { ok: true, file: `${dir.name}/backups/${name}` };
    } catch (e) { return { err: e?.name === 'NotFoundError' ? 'gone' : String(e?.message || e?.name || '') }; }
  }
  /** Save a backup into the folder. trigger: 'publish' | 'daily' | 'manual'. Only a click may ask for permission again. → the log record */
  async function autoBackup(trigger = 'manual', { dir, ask = trigger === 'manual' } = {}) {
    dir = dir || await getBackupFolder(); if (!dir) return null;
    const r = await writeToFolder(dir, ask) || {};
    const rec = { at: new Date().toISOString(), trigger, ok: !!r.ok, why: r.ok ? '' : r.perm ? 'perm' : r.err === 'gone' ? 'gone' : 'error', file: r.file || '' };
    MA.db.set(AUTO_KEY, rec);
    if (trigger === 'manual') MA.toast(esc(rec.ok ? t('bk.saved', { name: rec.file || dir.name }) : t('bk.autoFail', { why: t('bk.why.' + rec.why) })), rec.ok ? { icon: 'check' } : { tone: 'bad' });
    else if (!rec.ok && trigger === 'publish') MA.toast(esc(t('bk.autoFail', { why: t('bk.why.' + rec.why) })), rec.why === 'perm' ? { action: { label: t('bk.allow'), run: () => autoBackup('manual') } } : { tone: 'bad' });
    if (mounted()) redraw('data');
    return rec;
  }
  /** After any publish: Publish & history already backs up during a folder publish; this covers the others (download, copy). */
  async function backupAfterPublish() {
    const last = Date.parse(MA.backup.lastAt() || '') || 0;
    if (Date.now() - last < 2 * 60e3) return null;
    return autoBackup('publish');
  }
  /** Once a day while the admin is open (quietly: no permission prompt). */
  async function dailyBackup() {
    const last = Math.max(Date.parse(MA.db.get(AUTO_KEY, null)?.at || '') || 0, Date.parse(MA.backup.lastAt() || '') || 0);
    if (Date.now() - last < 20 * 3600e3) return null;
    if (!(await getBackupFolder())) return null;
    return autoBackup('daily');
  }
  async function drawAuto(el) {
    el.innerHTML = '';
    if (!fsOK() && folderMem === undefined) { el.append(h('p.st-faint', t('bk.noFs'))); return; }
    const dir = await getBackupFolder(); if (!el.isConnected) return;
    el.innerHTML = '';
    const last = MA.db.get(AUTO_KEY, null), acts = h('div.st-acts');
    const manage = MA.modules().some(m => m.id === 'history') ? ui.btn(dir ? t('bk.manage') : t('bk.choose'), { size: 'sm', kind: dir ? 'ghost' : '', icon: 'folder', href: '#/history?tab=live' }) : null;
    if (dir) {
      if (last && !last.ok && last.why === 'perm') acts.append(ui.btn(t('bk.allow'), { size: 'sm', kind: 'primary', icon: 'lock', onclick: () => autoBackup('manual') }));
      else acts.append(ui.btn(t('bk.saveNow'), { size: 'sm', icon: 'download', onclick: () => autoBackup('manual') }));
    }
    if (manage) acts.append(manage);
    put(el,
      dir ? h('p.st-ok', MA.iconEl('check', 'sm'), h('span', t('bk.on', { name: `${String(dir.name || '')}/backups` }))) : h('p.st-faint', t('bk.none')),
      dir && last?.ok && last.at ? h('p.st-faint', t('bk.lastAuto', { ago: MA.ago(last.at) })) : null,
      dir && last && !last.ok ? h('p.err.st-err', t('bk.autoFail', { why: t('bk.why.' + (last.why || 'error')) })) : null,
      acts.childNodes.length ? acts : null);
  }
  MA.on('content:published', () => setTimeout(() => backupAfterPublish().catch(() => {}), 1500));
  MA.on('boot', () => { setTimeout(() => dailyBackup().catch(() => {}), 8000); setInterval(() => dailyBackup().catch(() => {}), 3600e3); });


  /* ---- backup: localStorage keys + IndexedDB 'files' (blobs become data URLs) ---- */
  const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
  async function pack(v) {
    if (v instanceof Blob) return { __blob: await blobToDataURL(v), type: v.type, name: v instanceof File ? v.name : undefined };
    if (Array.isArray(v)) return Promise.all(v.map(pack));
    if (v && typeof v === 'object' && !(v instanceof Date)) { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = await pack(x); return o; }
    return v;
  }
  function unpack(v) {
    if (Array.isArray(v)) return v.map(unpack);
    if (v && typeof v === 'object') {
      if (typeof v.__blob === 'string') {
        const [head, data = ''] = v.__blob.split(','), type = v.type || head.match(/^data:([^;,]+)/)?.[1] || '';
        const bin = /;base64/.test(head) ? atob(data) : decodeURIComponent(data), arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return v.name ? new File([arr], v.name, { type }) : new Blob([arr], { type });
      }
      const o = {}; for (const [k, x] of Object.entries(v)) o[k] = unpack(x); return o;
    }
    return v;
  }
  /** IndexedDB can be missing or stuck (private windows, locked profiles): never wait on it forever. */
  const within = (p, ms, fallback) => Promise.race([Promise.resolve(p).catch(() => fallback), new Promise(r => setTimeout(() => r(fallback), ms))]);
  /** within() for IndexedDB: once it has stalled, later calls wait only briefly (a stuck store shouldn't add seconds to every backup). */
  let idbStalled = false;
  const idbWithin = (p, ms, fallback) => { let late = false; return Promise.race([Promise.resolve(p).catch(() => fallback), new Promise(r => setTimeout(() => { late = true; r(fallback); }, idbStalled ? Math.min(ms, 300) : ms))]).then(v => { if (late) idbStalled = true; return v; }); };
  async function buildBackup() {
    const ls = {}; for (const k of adminKeys()) ls[k] = localStorage.getItem(k);
    const files = {}; let filesOk = true;
    const keys = await idbWithin(MA.idb.keys('files'), 4000, null);
    if (!Array.isArray(keys)) filesOk = false;
    else for (const k of keys) { const v = await idbWithin(MA.idb.get('files', k), 4000, undefined); if (v === undefined) { filesOk = false; continue; } const packed = await within(pack(v), 3000, undefined); if (packed === undefined) { filesOk = false; continue; } files[String(k)] = packed; }
    return { schema: 'miras.admin.backup', version: 1, exportedAt: new Date().toISOString(), by: MA.team?.me?.()?.name || 'MIRAS', origin: location.origin, localStorage: ls, files, ...(filesOk ? {} : { filesMissing: true }) };
  }
  async function exportBackup() {
    if (!canData()) return null;
    const data = await buildBackup(), name = `miras-admin-backup-${MA.qDay(Date.now())}.json`;
    MA.download(name, JSON.stringify(data, null, 1), 'application/json');
    MA.activity.log({ action: 'settings.export', target: name, module: ID, href: '#/settings/data' });
    MA.backup.mark();
    MA.toast(esc(t('exported', { name })), { icon: 'download' });
    if (data.filesMissing) MA.toast(esc(t('filesSkipped')), { tone: 'bad', ms: 7000 });
    if (mounted()) redraw('data');
    return data;
  }

  /* ---- restore: every entry is checked for the shape the admin reads, so a damaged file can't leave a blank admin ---- */
  const sameType = (v, d) => Array.isArray(d) ? Array.isArray(v) : d !== null && typeof d === 'object' ? isObj(v) : typeof v === typeof d;
  const listOf = test => v => Array.isArray(v) && v.every(test);
  const withId = x => isObj(x) && typeof x.id === 'string' && !!x.id;
  const NS_ = 'miras.admin.';
  /** key → (parsed value) → true when the admin can read it. Keys not listed only need to be valid JSON. */
  const SHAPES = {
    [NS_ + 'prefs']: v => isObj(v) && Object.entries(MA.prefs.defaults).every(([k, d]) => !(k in v) || sameType(v[k], d)),
    [NS_ + 'team']: v => listOf(withId)(v),
    [NS_ + 'leads']: listOf(withId), [NS_ + 'versions']: listOf(isObj), [NS_ + 'activity']: listOf(isObj), [NS_ + 'notifications']: listOf(isObj),
    [NS_ + 'leads.trash']: listOf(isObj), [NS_ + 'leads.siteSeen']: v => Array.isArray(v), [NS_ + 'media']: v => Array.isArray(v), [NS_ + LOG_KEY]: listOf(isObj),
    [NS_ + 'pvPanes']: isObj, [NS_ + 'touched']: isObj, [NS_ + 'published']: v => v === null || isObj(v), [NS_ + SHARE_KEY]: v => typeof v === 'string',
    'miras.cms.draft': v => isObj(v) && (v.v !== 2 || isObj(v.overrides)),
  };
  function validateBackup(b) {
    if (!b || typeof b !== 'object' || b.schema !== 'miras.admin.backup' || !b.localStorage || typeof b.localStorage !== 'object' || Array.isArray(b.localStorage)) return t('bad.schema');
    if ((+b.version || 0) > 1) return t('bad.newer');
    const foreign = Object.keys(b.localStorage).filter(k => !isAdminKey(k));
    if (foreign.length) return t('bad.keys', { k: foreign.slice(0, 3).join(', ') });
    for (const [k, v] of Object.entries(b.localStorage)) {
      if (typeof v !== 'string') return t('bad.value', { k });
      let val; try { val = JSON.parse(v); } catch (e) { return t('bad.value', { k }); }
      const ok = SHAPES[k]; if (ok && !ok(val)) return k === 'miras.cms.draft' ? t('bad.draft') : t('bad.shape', { k });
    }
    const team = b.localStorage[NS_ + 'team'];
    if (team != null && !JSON.parse(team).length) return t('bad.noTeam');
    if (b.files != null && (typeof b.files !== 'object' || Array.isArray(b.files))) return t('bad.schema');
    return '';
  }
  async function readBackup(file, errEl) {
    errEl.innerHTML = '';
    let b = null, why = '';
    try { b = JSON.parse(await (file.text ? file.text() : MA.readText(file))); } catch (e) { why = t('bad.json'); }
    if (!why) why = validateBackup(b);
    if (why) { errEl.append(callout('bad', 'warn', h('b', t('bad.title')), ' ', h('span', why))); return false; }
    confirmRestore(b);
    return true;
  }
  function confirmRestore(b) {
    const nKeys = Object.keys(b.localStorage).length, nFiles = Object.keys(b.files || {}).length;
    ui.modal({ title: esc(t('importTitle')), body: el => el.append(
      h('p.st-sum', t('importSummary', { date: Date.parse(b.exportedAt) ? MA.date(b.exportedAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—', by: String(b.by || '—'), n: MA.num(nKeys), f: MA.num(nFiles) })),
      callout('warn', 'warn', t('importWarn')),
      h('div.st-acts', ui.btn(t('reset.exportFirst'), { size: 'sm', kind: 'ghost', icon: 'download', onclick: () => exportBackup() }))),
    actions: [{ label: MA.t('cancel'), kind: 'ghost' }, { label: t('importOk'), kind: 'danger solid', run: () => { applyBackup(b); } }] });
  }
  const restoreFlag = () => { try { return JSON.parse(localStorage.getItem(RESTORE_KEY) || 'null'); } catch (e) { return null; } };
  const setRestoreFlag = v => { try { v ? localStorage.setItem(RESTORE_KEY, JSON.stringify(v)) : localStorage.removeItem(RESTORE_KEY); } catch (e) {} };
  /** Keep what a restore replaces: IndexedDB first, localStorage (outside the admin's keys) when IndexedDB is unavailable. → 'idb' | 'ls' | '' */
  async function saveSnapshot(data) {
    if (await idbWithin(MA.idb.put('kv', 'restore.snapshot', data).then(() => true), 6000, false)) { try { localStorage.removeItem(SNAP_LS); } catch (e) {} return 'idb'; }
    try { localStorage.setItem(SNAP_LS, JSON.stringify(data)); return 'ls'; } catch (e) { return ''; }
  }
  async function loadSnapshot(where) {
    if (where === 'ls') { try { return JSON.parse(localStorage.getItem(SNAP_LS) || 'null'); } catch (e) { return null; } }
    return (await idbWithin(MA.idb.get('kv', 'restore.snapshot'), 4000, null)) || null;
  }
  async function dropSnapshot() { try { localStorage.removeItem(SNAP_LS); } catch (e) {} await idbWithin(MA.idb.del('kv', 'restore.snapshot'), 2000, null); }
  /** Replace this browser's admin data with a backup object. → '' or the reason it failed (nothing is changed then). */
  async function writeBackup(b) {
    const snap = {}; for (const k of adminKeys()) snap[k] = localStorage.getItem(k);
    try {
      for (const k of Object.keys(snap)) localStorage.removeItem(k);
      for (const [k, v] of Object.entries(b.localStorage)) localStorage.setItem(k, v);
    } catch (e) {
      for (const k of adminKeys()) localStorage.removeItem(k);
      for (const [k, v] of Object.entries(snap)) { try { localStorage.setItem(k, v); } catch (x) {} }
      return e?.name || String(e);
    }
    // a backup made where uploads couldn't be read keeps this browser's uploads instead of wiping them
    if (!b.filesMissing) await idbWithin((async () => { await MA.idb.clear('files'); for (const [k, v] of Object.entries(b.files || {})) await MA.idb.put('files', k, unpack(v)); })(), 8000, null);
    return '';
  }
  /** Restore: keep a snapshot of the current data (for undo), write the backup, reload. The next load checks the admin came up, else rolls back. */
  async function applyBackup(b, { reload = true } = {}) {
    if (!canData()) return false;
    const where = await saveSnapshot(await buildBackup());
    if (!where && !(await ui.confirm(t('snap.title'), esc(t('snap.text')), { danger: true, ok: t('importOk') }))) return false;
    const err = await writeBackup(b);
    if (err) { MA.toast(esc(t('restoreFail', { e: err })), { tone: 'bad' }); if (where) await dropSnapshot(); return false; }
    setRestoreFlag({ at: new Date().toISOString(), phase: 'check', snap: where });
    if (reload) { MA.toast(esc(t('restored'))); setTimeout(() => location.reload(), 350); }
    return true;
  }
  async function undoRestore({ confirm = true, reload = true } = {}) {
    if (!canData()) return false;
    const f = restoreFlag(); if (!f?.snap) return false;
    if (confirm && !(await ui.confirm(t('rs.confirm'), esc(t('rs.rowD')), { ok: t('rs.undo') }))) return false;
    const snap = await loadSnapshot(f.snap);
    const err = snap ? await writeBackup(snap) : 'missing';
    if (err) { MA.toast(esc(t('restoreFail', { e: err })), { tone: 'bad' }); return false; }
    await dropSnapshot(); setRestoreFlag({ at: new Date().toISOString(), phase: 'undone' });
    if (reload) setTimeout(() => location.reload(), 300);
    return true;
  }
  async function keepRestored() {
    const f = restoreFlag(), snap = f?.snap ? await loadSnapshot(f.snap) : null;
    await dropSnapshot(); setRestoreFlag(null); if (mounted()) redraw('data');
    MA.toast(esc(t('rs.keep')), snap ? { undo: async () => { const where = await saveSnapshot(snap); setRestoreFlag({ ...f, snap: where }); if (mounted()) redraw('data'); } } : {});
  }
  /** After a restore reloads the page: confirm the admin came up (nav rendered), else put the old data back. Runs before boot.
      Tests call it through MA.settings.checkRestore({ now: true, healthy, reload: false }). → a promise that settles with the outcome */
  function restoreGuard({ now = false, healthy, reload = true } = {}) {
    const f = restoreFlag(); if (!f) return Promise.resolve(null);
    let done; const result = new Promise(r => { done = r; });
    if (f.phase === 'undone' || f.phase === 'rolledBack') {
      const tell = () => { setRestoreFlag(null); MA.toast(esc(t(f.phase === 'undone' ? 'rs.undone' : 'rs.rolledBack')), f.phase === 'undone' ? { icon: 'check' } : { tone: 'bad', ms: 12000 }); done(f.phase); };
      now ? tell() : MA.on('boot', () => setTimeout(tell, 700));
      return result;
    }
    if (f.phase !== 'check') return Promise.resolve(null);
    let settled = false;
    const ok = () => {
      settled = true; setRestoreFlag({ ...f, phase: 'ok' });
      MA.activity.log({ action: 'settings.restore', module: ID, href: '#/settings/data' });
      MA.toast(esc(t('rs.done')), f.snap ? { icon: 'check', action: { label: t('rs.undo'), run: () => undoRestore({ confirm: false }) } } : { icon: 'check' });
      done('ok');
    };
    const fail = async () => {
      settled = true;
      const snap = f.snap ? await loadSnapshot(f.snap) : null;
      if (snap && !(await writeBackup(snap))) { await dropSnapshot(); setRestoreFlag({ at: new Date().toISOString(), phase: 'rolledBack' }); done('rolledBack'); if (reload) location.reload(); return; }
      setRestoreFlag(null); brokenPanel(); done('broken');
    };
    const check = () => { if (!settled) ((healthy ? healthy() : !!document.querySelector('#nav .nav-item')) ? ok() : fail()); };
    if (now) setTimeout(check, 0);
    else { MA.on('boot', () => setTimeout(check, 1500)); setTimeout(check, 10000); } // the second one: boot never finished
    return result;
  }
  /** Last resort when a restored backup breaks the admin and there is nothing to go back to: plain DOM, no shell needed. */
  function brokenPanel() {
    const btn = h('button.btn.danger', { type: 'button', onclick: () => { for (const k of adminKeys()) { try { localStorage.removeItem(k); } catch (e) {} } location.reload(); } }, t('rs.clear'));
    const box = h('div.st-broken', { role: 'alertdialog', 'aria-labelledby': 'st-broken-t', 'aria-modal': 'true' }, h('p', { id: 'st-broken-t' }, t('rs.broken')), btn);
    document.body.append(box); btn.focus();
  }
  restoreGuard();
  function clearEvents() {
    const n = eventCount(); if (!n || !canData()) return;
    let raw = null; try { raw = localStorage.getItem('miras.events'); } catch (e) {}
    MA.metrics.clearLocal();
    MA.activity.log({ action: 'settings.clearEvents', target: String(n), module: ID, href: '#/settings/data' });
    redraw('data');
    MA.toast(esc(t('evt.cleared', { n: MA.num(n) })), { icon: 'trash', undo: () => { try { localStorage.setItem('miras.events', raw); } catch (e) {} MA.emit('site:events'); redraw('data'); } });
  }
  function clearSamples() {
    if (!canData()) return;
    const leads = MA.clone(MA.leads.raw()), team = MA.clone(MA.team.raw()), was = { sampleData: MA.prefs.get('sampleData'), me: MA.prefs.get('me') };
    MA.leads.clearSamples();
    MA.db.set('team', team.filter(m => !m.sample)); MA.emit('team');
    MA.prefs.set({ sampleData: false, me: team.find(m => m.id === was.me)?.sample ? '' : was.me });
    MA.emit('sample'); MA.renderMe?.(); MA.renderNav?.();
    MA.activity.log({ action: 'settings.clearSamples', module: ID, href: '#/settings/data' });
    redraw('data');
    MA.toast(esc(t('smp.cleared')), { undo: () => { MA.leads.save(leads); MA.db.set('team', team); MA.emit('team'); MA.prefs.set(was); MA.emit('sample'); MA.renderMe?.(); MA.renderNav?.(); redraw('data'); } });
  }
  async function openReset() {
    if (!canData()) return null;
    const files = (await idbWithin(MA.idb.keys('files'), 1500, null))?.length || 0;
    const inp = h('input.input.st-reset-in', { placeholder: 'RESET', autocomplete: 'off', spellcheck: false, dir: 'ltr' });
    const site = ui.switch(true, () => {}, esc(t('reset.site')));
    const L = ui.modal({ title: esc(t('reset.modal')), body: el => el.append(
      callout('bad', 'warn', t('reset.warn')),
      h('p.st-reset-list', t('reset.list', { changes: MA.num(C().changes().length), people: MA.num(MA.team.raw().length), briefs: MA.num(MA.leads.raw().length), versions: MA.num(MA.versions.list().length), files: MA.num(files) })),
      h('div.st-acts', ui.btn(t('reset.exportFirst'), { size: 'sm', kind: 'ghost', icon: 'download', onclick: () => exportBackup() })),
      ui.field(t('reset.type'), inp), site),
    actions: [{ label: MA.t('cancel'), kind: 'ghost' }, { label: t('reset.ok'), kind: 'danger solid', disabled: true, run: () => { if (inp.value.trim() !== 'RESET') return false; doReset(site.querySelector('input').checked); } }] });
    L.el.classList.add('st-reset');
    const ok = L.el.querySelector('.modal-foot .btn.danger');
    inp.addEventListener('input', () => { ok.disabled = inp.value.trim() !== 'RESET'; });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !ok.disabled) ok.click(); });
    setTimeout(() => inp.focus(), 60);
    return L;
  }
  async function doReset(siteToo) {
    for (const k of [...adminKeys(), RESTORE_KEY, SNAP_LS]) { try { localStorage.removeItem(k); } catch (e) {} }
    if (siteToo) ['miras.events', 'miras.leads.inbox'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
    await idbWithin(Promise.all(['files', 'handles', 'kv'].map(s => MA.idb.clear(s))), 4000, null);
    MA.toast(esc(t('reset.done')));
    setTimeout(() => location.reload(), 300);
  }

  /* =====================================================================
     ABOUT
     ===================================================================== */
  /* ---- getting started: six things that make the admin and the site work for real, read from real state ---- */
  let siteFolder = null; // whether publishing has a website folder (history.js keeps it in IndexedDB 'handles' / 'site')
  const checkFolder = async () => { const got = await idbWithin(MA.idb.get('handles', 'site'), 1200, undefined); if (got !== undefined) siteFolder = !!got; return siteFolder; };
  function checklist() {
    const st = studio(), a = st.analytics || {}, email = String(st.email || '').trim(), pm = C()?.publishedMeta || {};
    const emailDone = EMAIL_RE.test(email) && (email !== String(C()?.def('studio/email') || '') || !!MA.db.get(GS_EMAIL, false));
    const go = (sec, find) => () => MA.go(`#/settings/${sec}${find ? '?find=' + find : ''}`);
    return [
      // only where the browser can write to a folder (Chrome, Edge); elsewhere publishing downloads content.js instead
      fsOK() ? { id: 'folder', done: !!siteFolder, act: MA.can('content.publish') ? { label: t('openPublish'), run: () => MA.openPublish() } : null } : null,
      { id: 'email', done: emailDone, act: { label: t('gs.emailEdit'), run: go('studio', 'email') }, also: !emailDone && EMAIL_RE.test(email) && canContent() ? { label: t('gs.emailOk'), run: () => { MA.db.set(GS_EMAIL, true); MA.toast(esc(t('gs.done')), { undo: () => MA.db.del(GS_EMAIL) }); } } : null },
      { id: 'form', done: httpsOk(st.formEndpoint), act: { label: t('gs.formDo'), run: () => { S.formMode = 'service'; redraw('form'); goTo('form', true); } } },
      { id: 'analytics', done: !!AN[a.provider] && idCheck(a.provider, a.id).tone === 'good', act: { label: t('cmd.analytics'), run: go('analytics') } },
      { id: 'publish', done: !!(pm.at || MA.db.get('published', null)), act: MA.can('content.publish') ? { label: t('openPublish'), run: () => MA.openPublish() } : null },
      { id: 'backup', done: !!MA.backup.lastAt(), act: canData() ? { label: t('bk.now'), run: () => exportBackup() } : null },
    ].filter(Boolean);
  }
  function drawChecklist(el) {
    const list = checklist(), done = list.filter(x => x.done).length;
    el.innerHTML = '';
    const bar = h('div.st-gsbar', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': list.length, 'aria-valuenow': done, 'aria-label': t('gs.title'), 'aria-valuetext': t('gs.progress', { done: MA.num(done), total: MA.num(list.length) }) }, h('i', { style: `inline-size:${(done / list.length * 100).toFixed(1)}%` }));
    el.append(h('div.st-gshead', h('span.st-gscount', t('gs.progress', { done: MA.num(done), total: MA.num(list.length) })), bar));
    if (done === list.length) el.append(h('p.st-okline', MA.iconEl('check', 'sm'), h('span', t('gs.all'))));
    el.append(h('ol.st-gs', list.map((x, i) => h('li', { class: x.done ? 'done' : '', dataset: { gs: x.id } },
      h('span.st-gsmark', { html: x.done ? MA.icon('check', 'sm') : `<span>${MA.num(i + 1)}</span>` }),
      h('div.grow', h('b', t('gs.' + x.id)), h('span.sr-only', ' · ' + t(x.done ? 'gs.done' : 'gs.todo')), h('p', t('gs.' + x.id + 'D'))),
      !x.done ? h('div.st-gsacts', x.also ? ui.btn(x.also.label, { size: 'sm', kind: 'ghost', onclick: x.also.run }) : null, x.act ? ui.btn(x.act.label, { size: 'sm', onclick: x.act.run }) : null) : null))));
  }
  BUILD.about = body => {
    // getting started
    const gs = h('div.st-gsbox');
    upd(() => drawChecklist(gs));
    checkFolder().then(() => { if (gs.isConnected) { drawChecklist(gs); drawBanners(); } });
    body.append(item('start', block(t('gs.title'), null, gs)));
    const rows = [['draft', 'here', 'miras.cms.draft'], ['pub', 'pubW', ''], ['admin', 'here', 'miras.admin.*'], ['files', 'filesW', 'files'], ['briefs', 'briefsW', 'miras.leads.inbox · miras.events'], ['visits', 'visitsW', '']];
    const tbl = h('table.table.st-table.st-store', h('thead', h('tr', h('th', t('store.what')), h('th', t('store.where')))),
      h('tbody', rows.map(([w, where, key]) => h('tr', h('td', t('st.' + w)), h('td', h('span', t('st.' + where)), key ? h('code.st-key', key) : null)))));
    const pm = C().publishedMeta || {};
    const last = pm.at ? h('p', t('lastPub', { when: MA.date(pm.at, { dateStyle: 'medium', timeStyle: 'short' }), by: pm.by || 'MIRAS' }), ' ', t(pm.live ? 'lastLive' : 'lastLocal')) : h('p', t('neverPub'));
    const steps = h('ol.st-steps', [1, 2, 3].map(n => h('li', h('span.st-stepn', MA.num(n)), h('span', t('how.' + n)))));
    body.append(item('stored', block(t('store'), null, h('div.st-tw', tbl))),
      item('publishing', block(t('how'), MA.can('content.publish') ? ui.btn(t('openPublish'), { size: 'sm', kind: 'ghost', icon: 'publish', onclick: () => MA.openPublish() }) : null, steps,
        h('div.st-last', ui.tideMark(pm.at ? (pm.live ? 'live' : 'edited') : 'draft'), last))),
      item('docs', block(t('help'), null, h('p.st-faint', t('docsD')), h('div.st-acts', extLink('GUIDE.md', t('docs')), ui.btn(MA.t('shortcuts'), { size: 'sm', kind: 'ghost', icon: 'keyboard', onclick: () => MA.showShortcuts() })))));
  };

  /* =====================================================================
     PAGE: layout, menu, search, scroll spy
     ===================================================================== */
  const pending = () => (C()?.draft ? C().changes().filter(c => PENDING_RE.test(c.path)) : []);
  function redraw(id) {
    const sec = S.root?.querySelector(`.st-sec[data-sec="${id}"]`); if (!sec) return;
    const body = sec.querySelector('.st-body');
    S.upd[id] = []; S.building = id; body.innerHTML = '';
    try { BUILD[id](body); } catch (e) { console.error(e); } finally { S.building = null; }
    if (S.q) filter(S.q, { keep: true });
  }
  function drawBanners() {
    const b = S.banners; if (!b) return; b.innerHTML = '';
    if (!MA.can('settings.edit')) b.append(callout('info', 'lock', t('readonly')));
    const n = pending().length;
    if (n) b.append(h('div.callout.st-pending', ui.tideMark('edited'), h('div.grow', h('b', n === 1 ? t('pendingOne') : t('pending', { n: MA.num(n) })), ' ', h('span.muted', t('pendingText'))),
      MA.can('content.publish') ? ui.btn(t('review'), { size: 'sm', icon: 'publish', onclick: () => MA.openPublish() }) : null));
    // getting started, until it's done or hidden
    const list = checklist(), done = list.filter(x => x.done).length;
    if (MA.can('settings.edit') && done < list.length && !MA.db.get(GS_HIDE, false))
      b.append(h('div.callout.st-gsbanner', MA.iconEl('flag'), h('div.grow', h('b', t('gs.banner', { done: MA.num(done), total: MA.num(list.length) }))),
        ui.btn(t('gs.see'), { size: 'sm', onclick: () => { goTo('about', true); setTimeout(() => flashItem('start'), 300); } }),
        ui.btn(t('gs.hide'), { size: 'sm', kind: 'ghost', onclick: () => { MA.db.set(GS_HIDE, true); drawBanners(); MA.toast(esc(t('gs.hidden')), { undo: () => { MA.db.del(GS_HIDE); drawBanners(); } }); } })));
  }
  function drawNav() {
    const nav = S.nav; if (!nav) return; nav.innerHTML = '';
    const ch = pending();
    for (const s of SECTIONS) {
      const n = S.counts[s.id] ?? 0, dirty = !!SEC_PATHS[s.id] && ch.some(c => SEC_PATHS[s.id].test(c.path));
      nav.append(h('a.st-nav-i', { href: '#/settings/' + s.id, dataset: { sec: s.id }, 'aria-current': S.active === s.id ? 'true' : null, hidden: !!S.q && !n, onclick: e => { e.preventDefault(); goTo(s.id, true); } },
        MA.iconEl(s.icon, 'sm'), h('span.grow', t('s.' + s.id)), dirty ? h('span.st-dirty', { title: MA.t('unpublished') }) : null, S.q ? h('span.st-cnt.num', MA.num(n)) : null));
    }
  }
  const markNav = () => S.nav && MA.$$('.st-nav-i', S.nav).forEach(a => a.dataset.sec === S.active ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
  function goTo(id, push) {
    const sec = S.root?.querySelector(`.st-sec[data-sec="${id}"]`); if (!sec) return;
    if (S.q) clearSearch();
    S.active = id; markNav(); S.lockSpy = Date.now();
    sec.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    if (push) history.replaceState(null, '', '#/settings/' + id);
  }
  function flashItem(id) {
    const el = S.root?.querySelector(`.st-item[data-item="${CSS.escape(id)}"]`) || (PARENT[id] && S.root?.querySelector(`.st-item[data-item="${PARENT[id]}"]`)); if (!el) return;
    el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('st-flash'); void el.offsetWidth; el.classList.add('st-flash');
  }
  function filter(q, { keep } = {}) {
    S.q = String(q || '').trim();
    if (!keep && S.search && S.search.value !== q) S.search.value = q;
    const want = new Set();
    if (S.q) for (const c of S.cat) if (matches(c, S.q)) { want.add(c[0]); if (PARENT[c[0]]) want.add(PARENT[c[0]]); }
    for (const el of MA.$$('.st-item', S.root)) el.hidden = !!S.q && !want.has(el.dataset.item);
    let total = 0;
    for (const sec of MA.$$('.st-sec', S.root)) { const n = MA.$$('.st-item:not([hidden])', sec).length; S.counts[sec.dataset.sec] = n; total += n; sec.hidden = !!S.q && !n; }
    S.nomatch.hidden = !S.q || total > 0;
    S.nomatch.innerHTML = '';
    if (!S.nomatch.hidden) S.nomatch.append(ui.empty({ title: esc(t('noMatch', { q: S.q })), text: esc(t('noMatchText')), pose: 'present', compact: true, actions: [ui.btn(t('clear'), { onclick: clearSearch })] }));
    drawNav();
  }
  function clearSearch() { if (S.search) S.search.value = ''; filter(''); }
  function onContent({ path } = {}) {
    if (!mounted()) return;
    runUpdaters();
    if (studio().formEndpoint && S.formMode !== 'service') { S.formMode = 'service'; redraw('form'); }
    if ((AN[studio().analytics?.provider] ? studio().analytics.provider : '') !== S.provider) redraw('analytics');
    if (!path) { redraw('about'); }
    drawBanners(); drawNav();
  }

  function render(view, ctx) {
    S.q = ''; S.upd = {}; S.counts = {}; S.lastTest = null; S.sending = false; S.cat = catalog(); S.active = 'studio'; S.xSig = null; S.rSig = null; S.xFocus = null; S.secFocus = null;
    if (ctx.query.get('field') === 'studio/formEndpoint') S.formMode = 'service';
    const root = S.root = h('div.m-settings');
    view.append(root);
    root.append(ui.pageHead({ title: esc(MA.L(TITLE)), sub: esc(t('sub')) }));
    enforceConsent(); // a provider without consent breaks the privacy policy's promise: fix the draft once on open
    root.append(S.banners = h('div.st-banners'));
    const search = S.search = h('input.input', { type: 'search', placeholder: t('search'), 'aria-label': t('search'), autocomplete: 'off', spellcheck: false });
    search.addEventListener('input', () => filter(search.value, { keep: true }));
    search.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (search.value) clearSearch(); else search.blur(); }
      else if (e.key === 'Enter') { const first = S.root.querySelector('.st-item:not([hidden])'); first?.scrollIntoView({ block: 'center' }); first?.querySelector('input:not([type=search]),select,textarea,button')?.focus({ preventScroll: true }); }
    });
    S.nav = h('nav.st-nav', { 'aria-label': t('nav') });
    const aside = h('aside.st-aside', h('div.st-search', MA.iconEl('search', 'sm'), search, h('kbd', '/')), S.nav);
    const main = h('div.st-main');
    root.append(h('div.st-layout', aside, main));
    for (const s of SECTIONS) {
      const body = h('div.st-body');
      main.append(h('section.card.st-sec', { id: 'st-' + s.id, dataset: { sec: s.id }, 'aria-labelledby': 'st-h-' + s.id },
        h('header.st-head', h('h2.h3', { id: 'st-h-' + s.id }, t('s.' + s.id)), h('p.st-sub', t('s.' + s.id + '.d'))), body));
      S.building = s.id;
      try { BUILD[s.id](body); } catch (e) { console.error(e); body.append(callout('bad', 'warn', String(e.message || e))); }
      S.building = null;
    }
    main.append(S.nomatch = h('div.st-nomatch', { hidden: true }));
    drawBanners(); drawNav();

    MA.onView('content:change', onContent);
    MA.onView('content:published', () => { drawBanners(); drawNav(); redraw('about'); });
    for (const evt of ['team', 'leads', 'metrics', 'sample', 'backup']) MA.onView(evt, () => mounted() && redraw('data'));
    MA.onView('backup', () => { if (mounted()) { redraw('about'); drawBanners(); } });
    MA.onView('db:' + GS_EMAIL, () => { if (mounted()) { redraw('about'); drawBanners(); } });
    MA.onView('db:' + LOG_KEY, () => S.drawLog?.());
    const timer = setInterval(() => S.tick?.(), 15000);
    // scroll spy: the section nearest the top is the current one
    const io = new IntersectionObserver(es => {
      if (Date.now() - (S.lockSpy || 0) < 900) return;
      const vis = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) { S.active = vis.target.dataset.sec; markNav(); }
    }, { rootMargin: '-12% 0px -70% 0px' });
    MA.$$('.st-sec', root).forEach(s => io.observe(s));
    MA.cleanup(() => { clearInterval(timer); io.disconnect(); S.root = null; S.tick = null; S.drawLog = null; S.drawRes = null; S.testBtn = null; S.clearBtn = null; S.nav = null; S.banners = null; });
    MA.keys.bindView('/', () => { search.focus(); search.select(); }, () => t('k.search'));

    const sec = ctx.sub[0], find = ctx.query.get('find');
    if (find) setTimeout(() => flashItem(find), 120);
    else if (sec && SECTIONS.some(s => s.id === sec) && !ctx.query.get('field')) { S.active = sec; markNav(); setTimeout(() => goTo(sec), 60); }
  }
  function update(ctx) {
    if (!mounted()) return false;
    if (ctx.query.get('field') === 'studio/formEndpoint' && S.formMode !== 'service') { S.formMode = 'service'; redraw('form'); }
    const find = ctx.query.get('find'), sec = ctx.sub[0];
    if (find) { if (S.q) clearSearch(); setTimeout(() => flashItem(find), 60); }
    else if (sec && !ctx.query.get('field')) goTo(sec);
    return true;
  }

  MA.module({
    id: ID, group: 'system', order: 100, icon: 'settings', shortcut: 'g s', title: TITLE,
    keywords: 'settings email whatsapp hours form analytics backup sections الإعدادات تنظیمات',
    render, update,
    crumbs: ctx => SECTIONS.some(s => s.id === ctx.sub[0]) ? [{ label: t('s.' + ctx.sub[0]) }] : [],
    search(q) {
      if (!MA.content?.draft) return [];
      return catalog().filter(c => matches(c, q)).slice(0, 8).map(c => ({ title: c[2], sub: t('s.' + c[1]), icon: SECTIONS.find(s => s.id === c[1])?.icon || 'settings', run: () => MA.go(`#/settings/${c[1]}?find=${encodeURIComponent(c[0])}`) }));
    },
  });

  /* ---- palette commands (titles are getters so they follow the admin language) ---- */
  const cmd = (id, key, icon, run, when, keywords) => MA.commands.add({ id: 'settings.' + id, get title() { return t(key); }, icon, run, when, keywords });
  cmd('hours', 'cmd.hours', 'clock', () => MA.go('#/settings/hours'), null, 'opening hours days open close time ساعات ساعت');
  cmd('form', 'cmd.form', 'inbox', () => MA.go('#/settings/form'), null, 'form delivery endpoint formspree mailto');
  cmd('test', 'test', 'publish', () => { MA.go('#/settings/form'); setTimeout(() => runTest(), 250); }, () => canData() && httpsOk(studio().formEndpoint), 'test brief form send');
  cmd('analytics', 'cmd.analytics', 'chart', () => MA.go('#/settings/analytics'), null, 'analytics plausible ga4 umami');
  cmd('sections', 'cmd.sections', 'layers', () => MA.go('#/settings/sections'), null, 'sections hide show');
  cmd('export', 'cmd.export', 'download', () => exportBackup(), () => canData(), 'backup export download');
  cmd('start', 'cmd.start', 'flag', () => { MA.go('#/settings/about?find=start'); }, () => MA.can('settings.edit'), 'getting started checklist setup onboarding');
  cmd('privacy', 's.privacy', 'lock', () => MA.go('#/settings/privacy'), null, 'privacy consent cookie spam policy');

  /** For other pages and tests. analytics.shareUrl is read with MA.db.get('analytics.shareUrl', '') (Analytics can embed it). */
  MA.settings = {
    exportBackup, buildBackup, validateBackup, applyBackup, undoRestore, restoreFlag, checkRestore: restoreGuard,
    hoursOn: (ymd, wd, st = studio()) => hoursOn(st, ymd, wd), openState: (st = studio()) => openState(st), parseHM, presets: () => PRESETS.map(p => presetItem(p)),
    checklist: () => checklist().map(({ id, done }) => ({ id, done })), shareUrl: () => MA.db.get(SHARE_KEY, '') || '',
    folder: { get: getBackupFolder, set: setBackupFolder, isSite: isSiteFolder }, autoBackup, dailyBackup, backupAfterPublish,
  };
})();
