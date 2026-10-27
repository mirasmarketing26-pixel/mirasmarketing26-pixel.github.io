/* =====================================================================
   MIRAS admin — Team
   Members (MA.team, stored in this browser), invites, roles, removal, "use the admin as",
   the roles × permissions matrix with a "View as" switch, and a profile page #/team/<id>
   (name, title, colour, avatar ≤160px, their recent activity).
   Accounts live in this browser (no sign-in): the page says so, "Add a teammate" never promises access by email,
   "View as" never goes above your own role, and a card explains how to protect /admin (host password, Cloudflare Access, own origin).
   ===================================================================== */
(() => {
  'use strict';
  const MA = window.MA, ID = 'team';
  const t = (k, v) => MA.t('team.' + k, v);
  const h = (...a) => MA.h(...a), esc = MA.esc;

  MA.i18n.add({
    en: {
      'team.sub': 'Who uses the admin on this computer, and what each role can change.',
      'team.honest': 'Teammates and roles live in this browser only. There are no sign-ins yet, so anyone at this computer can switch roles: roles keep people in their lane, they don’t keep anyone out.',
      'team.invite': 'Add a teammate', 'team.members': 'Members', 'team.nMembers': '{n} people', 'team.oneMember': '1 person', 'team.nInvited': '{n} not started',
      'team.colPerson': 'Person', 'team.colRole': 'Role', 'team.colTitle': 'Title', 'team.colStatus': 'Status',
      'team.active': 'Active', 'team.invited': 'Not started', 'team.invitedAgo': 'Invited {ago}', 'team.you': 'You', 'team.noTitle': 'No title yet',
      'team.lastOwner': 'The last owner keeps the Owner role, so the admin always has someone in charge.',
      'team.actions': 'Actions for {name}', 'team.openProfile': 'Open profile', 'team.useAs': 'Use the admin as this person', 'team.markJoined': 'Mark as active', 'team.emailInvite': 'Email them a note', 'team.copyEmail': 'Copy email', 'team.remove': 'Remove from the team',
      'team.roleChanged': '{name} is now {role}.', 'team.joined': '{name} is now active.', 'team.removed': '{name} was removed from the team.',
      'team.usingAs': 'You’re now using the admin as {name}.', 'team.switchBack': 'Switch back to {name}', 'team.usingNote': 'You’re using the admin as {name}, to see what they see.',
      'team.empty': 'Just you so far', 'team.emptyText': 'Add the people who write the site, answer briefs or keep an eye on the numbers on this computer.', 'team.emptyRO': 'No one else is on the team yet.',
      'team.inv.title': 'Add a teammate to this browser', 'team.inv.name': 'Name', 'team.inv.email': 'Email', 'team.inv.role': 'Role', 'team.inv.jobTitle': 'Title', 'team.inv.jobHint': 'Optional. Shown next to their name, like “Producer”.',
      'team.inv.send': 'Add to the team', 'team.inv.nameErr': 'Add their name.', 'team.inv.emailErr': 'Use a full email address, like noor@mirasmarketing.com.', 'team.inv.dupErr': '{name} already uses this email.',
      'team.inv.done': '{name} is on the team as {role}.', 'team.inv.phName': 'Noor Al-Kuwari', 'team.inv.phTitle': 'Producer',
      'team.inv.subject': 'You’re on the MIRAS studio admin', 'team.inv.body': 'Hi {name},\n\nI’ve added you to the MIRAS studio admin as {role}.\nFor now the admin keeps everything in one browser, so there’s no sign-in and no link: use it on the studio computer where I added you.\n\n{me}',
      'team.rm.title': 'Remove {name}?', 'team.rm.text': 'They’re taken off the team in this browser. Their past activity stays in the history.', 'team.rm.type': 'Type <b>{name}</b> to confirm',
      'team.rm.briefs': 'They own {n} briefs. Give them to', 'team.rm.unassigned': 'Nobody (unassigned)', 'team.rm.ok': 'Remove {name}',
      'team.rm.self': 'You can’t remove yourself. Ask another owner or admin.',
      'team.roles': 'Roles and permissions', 'team.rolesSub': 'What each role can do. Actions a role can’t use are hidden from it, not greyed out.',
      'team.viewAs': 'View the admin as', 'team.viewAsHint': 'Only changes what you see in this browser, to check what a role sees. Your own role stays {role}.',
      'team.yes': 'Allowed', 'team.no': 'Not allowed', 'team.nRole': '{n} people', 'team.oneRole': '1 person', 'team.noneRole': 'Nobody',
      'team.r.owner': 'Everything, including the team. Can’t be locked out.', 'team.r.admin': 'Everything an owner can do, day to day.', 'team.r.editor': 'Writes the site and manages images, but can’t publish.', 'team.r.sales': 'Works the briefs and reads the numbers.', 'team.r.viewer': 'Reads briefs and numbers. Changes nothing.',
      'team.p.content.edit': 'Edit the site', 'team.pd.content.edit': 'Copy, swells, questions, colours and images in the draft.',
      'team.p.content.publish': 'Publish', 'team.pd.content.publish': 'Put the draft live on mirasmarketing.com.',
      'team.p.leads.view': 'See briefs', 'team.pd.leads.view': 'Open the inbox and read what clients sent.',
      'team.p.leads.edit': 'Work on briefs', 'team.pd.leads.edit': 'Reply, move stages, assign and archive.',
      'team.p.analytics.view': 'See analytics', 'team.pd.analytics.view': 'Visitors, sources and what people tapped.',
      'team.p.media.edit': 'Manage media', 'team.pd.media.edit': 'Upload, replace and delete images.',
      'team.p.settings.edit': 'Change settings', 'team.pd.settings.edit': 'Contact details, hours, form delivery and admin data.',
      'team.p.team.manage': 'Manage the team', 'team.pd.team.manage': 'Add people, change roles and remove members.',
      'team.profile': 'Profile', 'team.profileSub': 'How they appear across the admin: on briefs they own, in history and in the sidebar.', 'team.profileRO': 'Only {name} or someone who manages the team can change this profile.',
      'team.name': 'Name', 'team.jobTitle': 'Title', 'team.email': 'Email', 'team.colour': 'Colour', 'team.customColour': 'Custom colour', 'team.photo': 'Photo',
      'team.upload': 'Upload a photo', 'team.replacePhoto': 'Replace photo', 'team.removePhoto': 'Remove photo', 'team.photoHint': 'Square works best. It’s shrunk to 160 px and kept in this browser.',
      'team.photoBad': 'That file isn’t an image this browser can read. Try a JPG or PNG.', 'team.saved': 'Saved', 'team.nameErr': 'A name is needed.',
      'team.access': 'Access', 'team.accessSub': 'What their role lets them do.', 'team.owns': 'Owns {n} open briefs', 'team.ownsOne': 'Owns 1 open brief', 'team.ownsNone': 'Owns no open briefs', 'team.openInbox': 'Open in the inbox',
      'team.activity': 'Recent activity', 'team.activitySub': 'What they did in this browser, newest first.', 'team.noActivity': 'Nothing yet', 'team.noActivityText': 'Their publishes, briefs and uploads will show here.',
      'team.notFound': 'This person isn’t on the team', 'team.notFoundText': 'They may have been removed, or the link is old.', 'team.back': 'Back to the team',
      'team.k.invite': 'Add a teammate', 'team.k.next': 'Next person', 'team.k.prev': 'Previous person', 'team.k.open': 'Open profile',
      'team.cmd.roles': 'Roles and permissions',
      'team.a.publish': 'Published the site', 'team.a.checkpoint': 'Saved a checkpoint', 'team.a.lead.add': 'Added a brief', 'team.a.lead.delete': 'Deleted briefs', 'team.a.lead.import': 'Imported briefs', 'team.a.lead.stage': 'Moved a brief',
      'team.a.media.upload': 'Uploaded images', 'team.a.media.replace': 'Replaced an image', 'team.a.media.delete': 'Deleted an image', 'team.a.swell.add': 'Added a swell', 'team.a.swell.delete': 'Deleted a swell', 'team.a.swell.duplicate': 'Duplicated a swell',
      'team.a.settings.restore': 'Restored a backup', 'team.a.settings.export': 'Exported a backup', 'team.a.settings.clearEvents': 'Cleared site events', 'team.a.settings.clearSamples': 'Cleared sample data', 'team.a.settings.formTest': 'Sent a test brief', 'team.a.analytics.clear': 'Cleared analytics events',
      'team.a.team.invite': 'Added a teammate', 'team.a.team.role': 'Changed a role', 'team.a.team.remove': 'Removed', 'team.a.team.joined': 'Marked as active',
      'team.inv.local': 'They’ll use the admin on this computer. Nothing is sent to them, and the admin can’t give them access anywhere else.',
      'team.namePh': 'Your name', 'team.nameYou': 'Until you add your name, the admin calls you “{you}”.', 'team.badge': 'Teammates who haven’t started: {n}',
      'team.sec.title': 'Keep the admin private', 'team.sec.sub': 'The admin has no sign-in of its own. Before it goes online, put a lock in front of it.',
      'team.sec.here': 'Right now the admin runs at {origin}.', 'team.sec.local': 'That address only works on this computer, so nobody else can reach it.', 'team.sec.public': 'Anyone who knows the address can open it, unless it’s protected.',
      'team.sec.1': 'Turn on your host’s password protection for {path}. Netlify, Vercel and most hosts have it.',
      'team.sec.2': 'Or put Cloudflare Access in front of {path}: people sign in with a code sent to their email. It’s free for small teams.',
      'team.sec.3': 'Best of all, serve the admin from its own address, like {host}. Client details then never share a home with the public site and its analytics scripts.',
      'team.sec.guide': 'Read the guide', 'team.sec.more': 'How to keep the admin private',
    },
    ar: {
      'team.sub': 'من يستخدم لوحة الإدارة على هذا الجهاز، وما الذي يستطيع كل دور تغييره.',
      'team.honest': 'الزملاء والأدوار محفوظون في هذا المتصفح فقط. ولا يوجد تسجيل دخول بعد، فمن يجلس إلى هذا الجهاز يستطيع تغيير الدور: الأدوار تنظّم العمل ولا تمنع أحداً من الدخول.',
      'team.invite': 'أضف زميلاً', 'team.members': 'الأعضاء', 'team.nMembers': 'عدد الأعضاء: {n}', 'team.oneMember': 'عضو واحد', 'team.nInvited': 'لم يبدؤوا بعد: {n}',
      'team.colPerson': 'الشخص', 'team.colRole': 'الدور', 'team.colTitle': 'المسمّى', 'team.colStatus': 'الحالة',
      'team.active': 'نشط', 'team.invited': 'لم يبدأ بعد', 'team.invitedAgo': 'دُعي {ago}', 'team.you': 'أنت', 'team.noTitle': 'بلا مسمّى بعد',
      'team.lastOwner': 'آخر مالك يحتفظ بدور المالك، كي يبقى للوحة الإدارة مسؤول دائماً.',
      'team.actions': 'إجراءات {name}', 'team.openProfile': 'افتح الملف الشخصي', 'team.useAs': 'استخدم لوحة الإدارة بصفته', 'team.markJoined': 'اعتبره نشطاً', 'team.emailInvite': 'راسله بالبريد', 'team.copyEmail': 'انسخ البريد', 'team.remove': 'أزله من الفريق',
      'team.roleChanged': 'أصبح دور {name}: {role}.', 'team.joined': 'أصبح {name} نشطاً.', 'team.removed': 'أُزيل {name} من الفريق.',
      'team.usingAs': 'تستخدم لوحة الإدارة الآن بصفة {name}.', 'team.switchBack': 'عُد إلى {name}', 'team.usingNote': 'تستخدم لوحة الإدارة بصفة {name}، لترى ما يراه.',
      'team.empty': 'أنت وحدك حتى الآن', 'team.emptyText': 'أضف من يكتب نصوص الموقع أو يردّ على الطلبات أو يتابع الأرقام على هذا الجهاز.', 'team.emptyRO': 'لا يوجد أحد آخر في الفريق بعد.',
      'team.inv.title': 'أضف زميلاً إلى هذا المتصفح', 'team.inv.name': 'الاسم', 'team.inv.email': 'البريد الإلكتروني', 'team.inv.role': 'الدور', 'team.inv.jobTitle': 'المسمّى', 'team.inv.jobHint': 'اختياري. يظهر بجانب الاسم، مثل «منتِجة».',
      'team.inv.send': 'أضفه إلى الفريق', 'team.inv.nameErr': 'أضف الاسم.', 'team.inv.emailErr': 'اكتب بريداً كاملاً، مثل noor@mirasmarketing.com.', 'team.inv.dupErr': 'هذا البريد مستخدم لدى {name}.',
      'team.inv.done': 'انضم {name} إلى الفريق بدور {role}.', 'team.inv.phName': 'نور الكواري', 'team.inv.phTitle': 'منتِجة',
      'team.inv.subject': 'أُضفت إلى لوحة إدارة استوديو ميراس', 'team.inv.body': 'مرحباً {name}،\n\nأضفتك إلى لوحة إدارة استوديو ميراس بدور {role}.\nتحفظ اللوحة كل شيء في متصفح واحد حالياً، فلا يوجد تسجيل دخول ولا رابط: استخدمها على جهاز الاستوديو الذي أضفتك عليه.\n\n{me}',
      'team.rm.title': 'إزالة {name}؟', 'team.rm.text': 'سيُزال من الفريق في هذا المتصفح، ويبقى نشاطه السابق في السجل.', 'team.rm.type': 'اكتب <b>{name}</b> للتأكيد',
      'team.rm.briefs': 'عدد طلباته المفتوحة: {n}. انقلها إلى', 'team.rm.unassigned': 'لا أحد (بلا مسؤول)', 'team.rm.ok': 'أزل {name}',
      'team.rm.self': 'لا يمكنك إزالة نفسك. اطلب ذلك من مالك أو مدير آخر.',
      'team.roles': 'الأدوار والصلاحيات', 'team.rolesSub': 'ما يستطيعه كل دور. الإجراءات غير المسموحة تُخفى عن الدور ولا تظهر معطّلة.',
      'team.viewAs': 'اعرض لوحة الإدارة كـ', 'team.viewAsHint': 'يغيّر ما تراه أنت في هذا المتصفح فقط، لتتحقق مما يراه كل دور. يبقى دورك {role}.',
      'team.yes': 'مسموح', 'team.no': 'غير مسموح', 'team.nRole': 'عددهم {n}', 'team.oneRole': 'شخص واحد', 'team.noneRole': 'لا أحد',
      'team.r.owner': 'كل شيء، بما فيه الفريق. لا يمكن إقفال اللوحة عليه.', 'team.r.admin': 'كل ما يفعله المالك في العمل اليومي.', 'team.r.editor': 'يكتب الموقع ويدير الصور، دون النشر.', 'team.r.sales': 'يتابع الطلبات ويطّلع على الأرقام.', 'team.r.viewer': 'يقرأ الطلبات والأرقام ولا يغيّر شيئاً.',
      'team.p.content.edit': 'تعديل الموقع', 'team.pd.content.edit': 'النصوص والموجات والأسئلة والألوان والصور في المسودة.',
      'team.p.content.publish': 'النشر', 'team.pd.content.publish': 'نشر المسودة على mirasmarketing.com.',
      'team.p.leads.view': 'رؤية الطلبات', 'team.pd.leads.view': 'فتح صندوق الوارد وقراءة ما أرسله العملاء.',
      'team.p.leads.edit': 'العمل على الطلبات', 'team.pd.leads.edit': 'الرد ونقل المراحل والإسناد والأرشفة.',
      'team.p.analytics.view': 'رؤية التحليلات', 'team.pd.analytics.view': 'الزوّار والمصادر وما نقر عليه الناس.',
      'team.p.media.edit': 'إدارة الوسائط', 'team.pd.media.edit': 'رفع الصور واستبدالها وحذفها.',
      'team.p.settings.edit': 'تغيير الإعدادات', 'team.pd.settings.edit': 'بيانات التواصل وساعات العمل وتسليم النموذج وبيانات اللوحة.',
      'team.p.team.manage': 'إدارة الفريق', 'team.pd.team.manage': 'إضافة الأشخاص وتغيير الأدوار وإزالة الأعضاء.',
      'team.profile': 'الملف الشخصي', 'team.profileSub': 'كيف يظهر في لوحة الإدارة: على الطلبات التي يتولاها، وفي السجل، وفي الشريط الجانبي.', 'team.profileRO': 'لا يغيّر هذا الملف إلا {name} أو من يدير الفريق.',
      'team.name': 'الاسم', 'team.jobTitle': 'المسمّى', 'team.email': 'البريد الإلكتروني', 'team.colour': 'اللون', 'team.customColour': 'لون مخصّص', 'team.photo': 'الصورة',
      'team.upload': 'ارفع صورة', 'team.replacePhoto': 'استبدل الصورة', 'team.removePhoto': 'أزل الصورة', 'team.photoHint': 'الصورة المربّعة أفضل. تُصغَّر إلى 160 بكسل وتُحفظ في هذا المتصفح.',
      'team.photoBad': 'لا يستطيع هذا المتصفح قراءة هذا الملف كصورة. جرّب JPG أو PNG.', 'team.saved': 'حُفظ', 'team.nameErr': 'الاسم مطلوب.',
      'team.access': 'الصلاحيات', 'team.accessSub': 'ما يسمح به دوره.', 'team.owns': 'الطلبات المفتوحة التي يتولاها: {n}', 'team.ownsOne': 'يتولى طلباً مفتوحاً واحداً', 'team.ownsNone': 'لا يتولى طلبات مفتوحة', 'team.openInbox': 'افتحها في صندوق الوارد',
      'team.activity': 'آخر النشاط', 'team.activitySub': 'ما فعله في هذا المتصفح، الأحدث أولاً.', 'team.noActivity': 'لا شيء بعد', 'team.noActivityText': 'سيظهر هنا ما ينشره من تعديلات وطلبات وصور.',
      'team.notFound': 'هذا الشخص ليس في الفريق', 'team.notFoundText': 'ربما أُزيل، أو أن الرابط قديم.', 'team.back': 'عد إلى الفريق',
      'team.k.invite': 'أضف زميلاً', 'team.k.next': 'الشخص التالي', 'team.k.prev': 'الشخص السابق', 'team.k.open': 'افتح الملف الشخصي',
      'team.cmd.roles': 'الأدوار والصلاحيات',
      'team.a.publish': 'نشر الموقع', 'team.a.checkpoint': 'حفظ نقطة استرجاع', 'team.a.lead.add': 'أضاف طلباً', 'team.a.lead.delete': 'حذف طلبات', 'team.a.lead.import': 'استورد طلبات', 'team.a.lead.stage': 'نقل طلباً',
      'team.a.media.upload': 'رفع صوراً', 'team.a.media.replace': 'استبدل صورة', 'team.a.media.delete': 'حذف صورة', 'team.a.swell.add': 'أضاف موجة', 'team.a.swell.delete': 'حذف موجة', 'team.a.swell.duplicate': 'كرّر موجة',
      'team.a.settings.restore': 'استعاد نسخة احتياطية', 'team.a.settings.export': 'صدّر نسخة احتياطية', 'team.a.settings.clearEvents': 'مسح أحداث الموقع', 'team.a.settings.clearSamples': 'مسح البيانات التجريبية', 'team.a.settings.formTest': 'أرسل طلباً تجريبياً', 'team.a.analytics.clear': 'مسح أحداث التحليلات',
      'team.a.team.invite': 'أضاف زميلاً', 'team.a.team.role': 'غيّر دوراً', 'team.a.team.remove': 'أزال', 'team.a.team.joined': 'اعتبره نشطاً',
      'team.inv.local': 'سيستخدم اللوحة على هذا الجهاز. لا يُرسل إليه شيء، ولا تستطيع اللوحة منحه وصولاً من أي مكان آخر.',
      'team.namePh': 'اسمك', 'team.nameYou': 'إلى أن تضيف اسمك، تسمّيك اللوحة «{you}».', 'team.badge': 'زملاء لم يبدؤوا بعد: {n}',
      'team.sec.title': 'أبقِ لوحة الإدارة خاصة', 'team.sec.sub': 'لا تملك اللوحة تسجيل دخول خاصاً بها. قبل أن تضعها على الإنترنت، ضع قفلاً أمامها.',
      'team.sec.here': 'تعمل اللوحة الآن على {origin}.', 'team.sec.local': 'هذا العنوان يعمل على هذا الجهاز وحده، فلا يصل إليه أحد غيرك.', 'team.sec.public': 'يستطيع أي شخص يعرف العنوان فتحها، ما لم تكن محمية.',
      'team.sec.1': 'فعّل حماية كلمة المرور لدى مزوّد الاستضافة للمسار {path}. تتوفر في Netlify وVercel ومعظم المزوّدين.',
      'team.sec.2': 'أو ضع Cloudflare Access أمام {path}: يسجّل الأشخاص الدخول برمز يصل إلى بريدهم، ومجاناً للفرق الصغيرة.',
      'team.sec.3': 'والأفضل أن تقدّم اللوحة من عنوان خاص بها مثل {host}، فلا تتشارك بيانات العملاء المكان نفسه مع الموقع العام وسكربتات التحليلات فيه.',
      'team.sec.guide': 'اقرأ الدليل', 'team.sec.more': 'كيف تبقي لوحة الإدارة خاصة',
    },
    fa: {
      'team.sub': 'چه کسانی روی این رایانه از پنل استفاده می‌کنند و هر نقش چه چیزی را می‌تواند تغییر دهد.',
      'team.honest': 'هم‌تیمی‌ها و نقش‌ها فقط در همین مرورگر نگه‌داری می‌شوند. هنوز ورود با حساب وجود ندارد، پس هر کس پشت این رایانه باشد می‌تواند نقش را عوض کند: نقش‌ها کار را مرتب می‌کنند، جلوی ورود کسی را نمی‌گیرند.',
      'team.invite': 'افزودن هم‌تیمی', 'team.members': 'اعضا', 'team.nMembers': '{n} نفر', 'team.oneMember': 'یک نفر', 'team.nInvited': 'شروع‌نکرده: {n}',
      'team.colPerson': 'فرد', 'team.colRole': 'نقش', 'team.colTitle': 'عنوان شغلی', 'team.colStatus': 'وضعیت',
      'team.active': 'فعال', 'team.invited': 'هنوز شروع نکرده', 'team.invitedAgo': 'دعوت {ago}', 'team.you': 'شما', 'team.noTitle': 'هنوز عنوانی ندارد',
      'team.lastOwner': 'آخرین مالک نقش مالک را نگه می‌دارد تا پنل همیشه یک مسئول داشته باشد.',
      'team.actions': 'کارهای مربوط به {name}', 'team.openProfile': 'باز کردن نمایه', 'team.useAs': 'استفاده از پنل به‌جای این فرد', 'team.markJoined': 'علامت‌گذاری به‌عنوان فعال', 'team.emailInvite': 'فرستادن یادداشت با ایمیل', 'team.copyEmail': 'کپی ایمیل', 'team.remove': 'حذف از تیم',
      'team.roleChanged': 'نقش {name} اکنون {role} است.', 'team.joined': '{name} اکنون فعال است.', 'team.removed': '{name} از تیم حذف شد.',
      'team.usingAs': 'اکنون پنل را به‌جای {name} استفاده می‌کنید.', 'team.switchBack': 'بازگشت به {name}', 'team.usingNote': 'پنل را به‌جای {name} استفاده می‌کنید تا ببینید او چه می‌بیند.',
      'team.empty': 'فعلاً فقط شما', 'team.emptyText': 'کسانی را که متن سایت را می‌نویسند، به درخواست‌ها پاسخ می‌دهند یا عددها را دنبال می‌کنند، روی همین رایانه اضافه کنید.', 'team.emptyRO': 'هنوز کس دیگری در تیم نیست.',
      'team.inv.title': 'افزودن هم‌تیمی به این مرورگر', 'team.inv.name': 'نام', 'team.inv.email': 'ایمیل', 'team.inv.role': 'نقش', 'team.inv.jobTitle': 'عنوان شغلی', 'team.inv.jobHint': 'اختیاری. کنار نامش نمایش داده می‌شود، مثل «تهیه‌کننده».',
      'team.inv.send': 'افزودن به تیم', 'team.inv.nameErr': 'نامش را بنویسید.', 'team.inv.emailErr': 'یک ایمیل کامل بنویسید، مثل noor@mirasmarketing.com.', 'team.inv.dupErr': 'این ایمیل را {name} استفاده می‌کند.',
      'team.inv.done': '{name} با نقش {role} به تیم اضافه شد.', 'team.inv.phName': 'نور الکواری', 'team.inv.phTitle': 'تهیه‌کننده',
      'team.inv.subject': 'شما به پنل استودیو میراس اضافه شدید', 'team.inv.body': 'سلام {name}،\n\nشما را با نقش {role} به پنل استودیو میراس اضافه کردم.\nفعلاً پنل همه‌چیز را در یک مرورگر نگه می‌دارد، پس ورود یا پیوندی در کار نیست: روی رایانهٔ استودیو که شما را در آن اضافه کردم از آن استفاده کنید.\n\n{me}',
      'team.rm.title': '{name} حذف شود؟', 'team.rm.text': 'از تیم در این مرورگر برداشته می‌شود. فعالیت‌های گذشته‌اش در تاریخچه می‌ماند.', 'team.rm.type': 'برای تأیید <b>{name}</b> را بنویسید',
      'team.rm.briefs': '{n} درخواست به او سپرده شده. واگذار شود به', 'team.rm.unassigned': 'هیچ‌کس (بدون مسئول)', 'team.rm.ok': 'حذف {name}',
      'team.rm.self': 'نمی‌توانید خودتان را حذف کنید. از مالک یا مدیر دیگری بخواهید.',
      'team.roles': 'نقش‌ها و دسترسی‌ها', 'team.rolesSub': 'هر نقش چه کاری می‌تواند بکند. کارهایی که مجاز نیست از آن نقش پنهان می‌شود، نه این‌که کم‌رنگ شود.',
      'team.viewAs': 'نمایش پنل به‌عنوان', 'team.viewAsHint': 'فقط چیزی را که شما در این مرورگر می‌بینید تغییر می‌دهد تا ببینید هر نقش چه می‌بیند. نقش خودتان {role} می‌ماند.',
      'team.yes': 'مجاز', 'team.no': 'غیرمجاز', 'team.nRole': '{n} نفر', 'team.oneRole': 'یک نفر', 'team.noneRole': 'هیچ‌کس',
      'team.r.owner': 'همه‌چیز، از جمله تیم. هرگز از پنل بیرون نمی‌ماند.', 'team.r.admin': 'هر کاری که مالک در کار روزانه می‌کند.', 'team.r.editor': 'سایت را می‌نویسد و تصویرها را مدیریت می‌کند، ولی منتشر نمی‌کند.', 'team.r.sales': 'روی درخواست‌ها کار می‌کند و عددها را می‌بیند.', 'team.r.viewer': 'درخواست‌ها و عددها را می‌خواند و چیزی را تغییر نمی‌دهد.',
      'team.p.content.edit': 'ویرایش سایت', 'team.pd.content.edit': 'متن‌ها، موج‌ها، پرسش‌ها، رنگ‌ها و تصویرها در پیش‌نویس.',
      'team.p.content.publish': 'انتشار', 'team.pd.content.publish': 'منتشر کردن پیش‌نویس روی mirasmarketing.com.',
      'team.p.leads.view': 'دیدن درخواست‌ها', 'team.pd.leads.view': 'باز کردن صندوق ورودی و خواندن پیام مشتری‌ها.',
      'team.p.leads.edit': 'کار روی درخواست‌ها', 'team.pd.leads.edit': 'پاسخ دادن، تغییر مرحله، واگذاری و بایگانی.',
      'team.p.analytics.view': 'دیدن آمار', 'team.pd.analytics.view': 'بازدیدکنندگان، منبع‌ها و این‌که روی چه چیزهایی زدند.',
      'team.p.media.edit': 'مدیریت رسانه', 'team.pd.media.edit': 'بارگذاری، جایگزینی و حذف تصویرها.',
      'team.p.settings.edit': 'تغییر تنظیمات', 'team.pd.settings.edit': 'اطلاعات تماس، ساعت کاری، ارسال فرم و داده‌های پنل.',
      'team.p.team.manage': 'مدیریت تیم', 'team.pd.team.manage': 'افزودن افراد، تغییر نقش‌ها و حذف اعضا.',
      'team.profile': 'نمایه', 'team.profileSub': 'این‌که در پنل چطور دیده می‌شود: روی درخواست‌هایی که به او سپرده شده، در تاریخچه و در نوار کناری.', 'team.profileRO': 'فقط خود {name} یا کسی که تیم را مدیریت می‌کند می‌تواند این نمایه را تغییر دهد.',
      'team.name': 'نام', 'team.jobTitle': 'عنوان شغلی', 'team.email': 'ایمیل', 'team.colour': 'رنگ', 'team.customColour': 'رنگ دلخواه', 'team.photo': 'عکس',
      'team.upload': 'بارگذاری عکس', 'team.replacePhoto': 'جایگزینی عکس', 'team.removePhoto': 'حذف عکس', 'team.photoHint': 'عکس مربعی بهتر است. به ۱۶۰ پیکسل کوچک و در همین مرورگر نگه‌داری می‌شود.',
      'team.photoBad': 'این مرورگر نمی‌تواند این فایل را به‌عنوان تصویر بخواند. JPG یا PNG را امتحان کنید.', 'team.saved': 'ذخیره شد', 'team.nameErr': 'نام لازم است.',
      'team.access': 'دسترسی', 'team.accessSub': 'نقشش به او اجازهٔ چه کارهایی را می‌دهد.', 'team.owns': '{n} درخواست باز به او سپرده شده', 'team.ownsOne': 'یک درخواست باز به او سپرده شده', 'team.ownsNone': 'درخواست بازی به او سپرده نشده', 'team.openInbox': 'باز کردن در صندوق ورودی',
      'team.activity': 'فعالیت‌های اخیر', 'team.activitySub': 'کارهایی که در این مرورگر انجام داده، تازه‌ترین در بالا.', 'team.noActivity': 'هنوز چیزی نیست', 'team.noActivityText': 'انتشارها، درخواست‌ها و بارگذاری‌هایش اینجا نمایش داده می‌شود.',
      'team.notFound': 'این فرد در تیم نیست', 'team.notFoundText': 'شاید حذف شده باشد، یا پیوند قدیمی است.', 'team.back': 'بازگشت به تیم',
      'team.k.invite': 'افزودن هم‌تیمی', 'team.k.next': 'فرد بعدی', 'team.k.prev': 'فرد قبلی', 'team.k.open': 'باز کردن نمایه',
      'team.cmd.roles': 'نقش‌ها و دسترسی‌ها',
      'team.a.publish': 'سایت را منتشر کرد', 'team.a.checkpoint': 'نقطهٔ بازگشت ذخیره کرد', 'team.a.lead.add': 'درخواستی افزود', 'team.a.lead.delete': 'درخواست‌هایی را حذف کرد', 'team.a.lead.import': 'درخواست‌هایی وارد کرد', 'team.a.lead.stage': 'مرحلهٔ درخواستی را تغییر داد',
      'team.a.media.upload': 'تصویر بارگذاری کرد', 'team.a.media.replace': 'تصویری را جایگزین کرد', 'team.a.media.delete': 'تصویری را حذف کرد', 'team.a.swell.add': 'موجی افزود', 'team.a.swell.delete': 'موجی را حذف کرد', 'team.a.swell.duplicate': 'موجی را تکثیر کرد',
      'team.a.settings.restore': 'یک پشتیبان را بازگردانی کرد', 'team.a.settings.export': 'نسخهٔ پشتیبان گرفت', 'team.a.settings.clearEvents': 'رویدادهای سایت را پاک کرد', 'team.a.settings.clearSamples': 'دادهٔ نمونه را پاک کرد', 'team.a.settings.formTest': 'درخواست آزمایشی فرستاد', 'team.a.analytics.clear': 'رویدادهای آمار را پاک کرد',
      'team.a.team.invite': 'هم‌تیمی افزود', 'team.a.team.role': 'نقشی را تغییر داد', 'team.a.team.remove': 'حذف کرد', 'team.a.team.joined': 'به‌عنوان فعال علامت زد',
      'team.inv.local': 'او روی همین رایانه از پنل استفاده می‌کند. چیزی برایش فرستاده نمی‌شود و پنل نمی‌تواند از جای دیگری به او دسترسی بدهد.',
      'team.namePh': 'نام شما', 'team.nameYou': 'تا نامتان را ننویسید، پنل شما را «{you}» صدا می‌زند.', 'team.badge': 'هم‌تیمی‌هایی که شروع نکرده‌اند: {n}',
      'team.sec.title': 'پنل را خصوصی نگه دارید', 'team.sec.sub': 'پنل ورود اختصاصی ندارد. پیش از آنلاین شدن، قفلی جلویش بگذارید.',
      'team.sec.here': 'پنل الان روی {origin} اجرا می‌شود.', 'team.sec.local': 'این نشانی فقط روی همین رایانه کار می‌کند، پس کس دیگری به آن دسترسی ندارد.', 'team.sec.public': 'هر کس نشانی را بداند می‌تواند بازش کند، مگر این‌که محافظت شده باشد.',
      'team.sec.1': 'محافظت با رمز عبورِ میزبان را برای {path} روشن کنید. Netlify، Vercel و بیشتر میزبان‌ها آن را دارند.',
      'team.sec.2': 'یا Cloudflare Access را جلوی {path} بگذارید: افراد با کدی که به ایمیلشان می‌آید وارد می‌شوند. برای تیم‌های کوچک رایگان است.',
      'team.sec.3': 'از همه بهتر، پنل را از نشانی جداگانه‌ای مثل {host} ارائه کنید تا اطلاعات مشتری‌ها هرگز با سایت عمومی و اسکریپت‌های آمارش هم‌خانه نباشند.',
      'team.sec.guide': 'خواندن راهنما', 'team.sec.more': 'چطور پنل را خصوصی نگه داریم',
    },
  });

  const ROLES = () => Object.keys(MA.ROLES);
  const roleName = r => MA.t('role.' + r);
  const COLOURS = ['#2B3BF0', '#FF5A23', '#1E9E6E', '#0D0F2E', '#8098FD', '#A35F00'];
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
  const real = () => MA.team.me() || {};
  const manage = () => MA.can('team.manage');
  const owners = () => MA.team.raw().filter(m => m.role === 'owner');
  const isLastOwner = m => m?.role === 'owner' && owners().length <= 1;
  const openBriefs = id => (MA.leads?.raw?.() || []).filter(l => l.owner === id && !l.archived && !['won', 'lost'].includes(l.stage));
  const actIcon = a => ({ publish: 'publish', checkpoint: 'flag' })[a] || ({ lead: 'inbox', media: 'image', swell: 'swell', settings: 'settings', analytics: 'chart', team: 'team' })[String(a).split('.')[0]] || 'bolt';
  const actLabel = a => { const k = 'team.a.' + a; return MA.i18n.has(k, 'en') ? MA.t(k) : String(a).replace(/[._-]+/g, ' ').replace(/^\w/, c => c.toUpperCase()); };
  /** The current person's name as the UI shows it: a localised "You" until the owner adds a name. */
  const myName = () => MA.team.display(real());
  /** Stored record (the unnamed owner keeps name ''). */
  const stored = id => MA.team.raw().find(x => x.id === id);
  const isUnnamed = id => { const r = stored(id); return !!(r && r.unnamed && !r.name); };
  /** Roles you may preview with "View as": never more than your own role can do. */
  const permsOf = r => MA.ROLES[r] || [];
  const within = (r, mine) => permsOf(mine).includes('*') || (!permsOf(r).includes('*') && permsOf(r).every(p => permsOf(mine).includes(p)));
  const viewable = () => { const mine = real().role || 'owner'; return ROLES().filter(r => within(r, mine)); };

  /* ---------- actions (shared by list, profile, palette) ---------- */
  function changeRole(m, role) {
    if (!manage() || !m || m.role === role || !MA.ROLES[role]) return false;
    if (isLastOwner(m)) { MA.toast(esc(t('lastOwner')), { tone: 'bad' }); return false; }
    const before = m.role;
    MA.team.update(m.id, { role });
    MA.activity.log({ action: 'team.role', target: MA.activity.arrow(m.name, roleName(role)), module: ID, href: '#/team/' + m.id, meta: { id: m.id, role, from: before } });
    afterSelf(m.id);
    MA.toast(esc(t('roleChanged', { name: m.name, role: roleName(role) })), { undo: () => { MA.team.update(m.id, { role: before }); afterSelf(m.id); } });
    return true;
  }
  /** The current person's role decides what the shell shows: refresh it when they change. */
  function afterSelf(id) { if (id === real().id) { MA.renderMe(); MA.renderNav(); MA.renderRibbon?.(); } }
  function markJoined(m) {
    if (!manage()) return;
    MA.team.update(m.id, { status: 'active', joinedAt: new Date().toISOString() });
    MA.activity.log({ action: 'team.joined', target: m.name, module: ID, href: '#/team/' + m.id });
    MA.toast(esc(t('joined', { name: m.name })), { undo: () => MA.team.update(m.id, { status: 'invited' }) });
  }
  /** A plain note to a teammate: no link and no promise of access, because accounts live in this browser (see team.sec.*). */
  function inviteHref(m) {
    const sub = t('inv.subject'), body = t('inv.body', { name: String(m.name || '').split(' ')[0], role: roleName(m.role), me: real().name || 'MIRAS' });
    return `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
  }
  function useAs(m) {
    const me = real(); if (!m || m.id === me.id) return;
    if (!MA.db.get('team.prevMe', '')) MA.db.set('team.prevMe', me.id);
    MA.prefs.set({ me: m.id, viewAs: '' });
    MA.renderMe(); MA.renderNav(); MA.renderRibbon?.(); MA.rerender();
    const prev = MA.team.get(MA.db.get('team.prevMe', ''));
    MA.toast(esc(t('usingAs', { name: m.name })), prev ? { action: { label: t('switchBack', { name: prev.name }), run: switchBack } } : {});
  }
  function switchBack() {
    const prev = MA.team.get(MA.db.get('team.prevMe', ''));
    MA.db.del('team.prevMe');
    MA.prefs.set({ me: prev?.id || '', viewAs: '' });
    MA.renderMe(); MA.renderNav(); MA.renderRibbon?.(); MA.rerender();
  }
  function invite() {
    if (!manage()) return;
    const f = { name: h('input.input', { placeholder: t('inv.phName'), autocomplete: 'off', autofocus: true }), email: h('input.input', { type: 'email', placeholder: 'name@mirasmarketing.com', dir: 'ltr', autocomplete: 'off' }),
      role: MA.ui.select(ROLES().filter(r => r !== 'owner' || MA.role() === 'owner').map(r => ({ value: r, label: roleName(r) })), 'editor', () => {}, { label: t('inv.role') }), title: h('input.input', { placeholder: t('inv.phTitle') }) };
    const err = { name: h('p.err', { hidden: true }), email: h('p.err', { hidden: true }) };
    const roleHint = h('p.hint', t('r.editor'));
    f.role.addEventListener('change', () => { roleHint.textContent = t('r.' + f.role.value); });
    const field = (label, ctl, e, hint) => { const x = MA.ui.field(label, ctl); if (hint) x.append(hint); if (e) x.append(e); return x; };
    const body = h('div.tm-form', h('p.muted.tm-local', t('inv.local')), field(t('inv.name'), f.name, err.name), field(t('inv.email'), f.email, err.email), h('div.tm-form-2', field(t('inv.role'), f.role, null, roleHint), field(t('inv.jobTitle'), f.title, null, h('p.hint', t('inv.jobHint')))));
    MA.ui.modal({ title: esc(t('inv.title')), body, actions: [{ label: MA.t('cancel'), kind: 'ghost' }, { label: t('inv.send'), kind: 'primary', icon: 'plus', run: () => {
      const name = f.name.value.trim(), email = f.email.value.trim().toLowerCase();
      const dup = MA.team.raw().find(m => (m.email || '').toLowerCase() === email);
      err.name.textContent = name ? '' : t('inv.nameErr'); err.name.hidden = !!name;
      err.email.textContent = !emailOk(email) ? t('inv.emailErr') : dup ? t('inv.dupErr', { name: dup.name }) : ''; err.email.hidden = !err.email.textContent;
      if (!name || err.email.textContent) { (name ? f.email : f.name).focus(); return false; }
      const m = MA.team.add({ name, email, role: f.role.value, title: f.title.value.trim(), invitedBy: real().id });
      MA.activity.log({ action: 'team.invite', target: `${name} · ${roleName(m.role)}`, module: ID, href: '#/team/' + m.id });
      MA.toast(esc(t('inv.done', { name, role: roleName(m.role) })), { action: { label: t('emailInvite'), run: () => { location.href = inviteHref(m); } } });
    } }] });
    [f.name, f.email].forEach(x => x.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); [...document.querySelectorAll('.modal-foot .btn.primary')].pop()?.click(); } }));
  }
  function remove(m) {
    if (!manage() || !m) return;
    if (m.id === real().id) { MA.toast(esc(t('rm.self')), { tone: 'bad' }); return; }
    if (isLastOwner(m)) { MA.toast(esc(t('lastOwner')), { tone: 'bad' }); return; }
    const briefs = openBriefs(m.id);
    const typed = h('input.input', { dir: 'auto', autocomplete: 'off', spellcheck: false, 'aria-label': MA.strip(t('rm.type', { name: esc(m.name) })) });
    const others = MA.team.all().filter(x => x.id !== m.id && x.status !== 'invited');
    const who = x => x.id !== real().id ? x.name : isUnnamed(x.id) ? t('you') : `${x.name} (${t('you')})`;
    const to = briefs.length ? MA.ui.select([...others.map(x => ({ value: x.id, label: who(x) })), { value: '', label: t('rm.unassigned') }], real().id, () => {}) : null;
    const body = h('div.tm-form', h('p.muted', t('rm.text')),
      to ? MA.ui.field(t('rm.briefs', { n: MA.num(briefs.length) }), to) : null,
      MA.ui.field(t('rm.type', { name: esc(m.name) }), typed));
    const L = MA.ui.modal({ title: esc(t('rm.title', { name: m.name })), body, actions: [{ label: MA.t('cancel'), kind: 'ghost' }, { label: t('rm.ok', { name: m.name }), kind: 'danger solid', icon: 'trash', run: () => {
      if (!match()) { typed.focus(); return false; }
      const snapLeads = MA.clone(MA.leads?.raw?.() || []), snap = MA.clone(MA.team.get(m.id)), dest = to ? to.value : '';
      briefs.forEach(l => MA.leads.update(l.id, { owner: dest }));
      MA.team.remove(m.id);
      MA.activity.log({ action: 'team.remove', target: m.name, module: ID, href: '#/team' });
      if (MA.ctx().id === ID && MA.ctx().sub[0] === m.id) MA.go('#/team');
      MA.toast(esc(t('removed', { name: m.name })), { undo: () => { MA.team.restore(snap); if (briefs.length) MA.leads.save(snapLeads); } });
    } }] });
    const okBtn = [...L.el.querySelectorAll('.modal-foot .btn')].pop();
    const match = () => typed.value.trim().toLowerCase() === m.name.trim().toLowerCase();
    okBtn.disabled = true;
    typed.addEventListener('input', () => { okBtn.disabled = !match(); });
    typed.addEventListener('keydown', e => { if (e.key === 'Enter' && match()) { e.preventDefault(); okBtn.click(); } });
    setTimeout(() => typed.focus(), 40);
  }
  function memberMenu(anchor, m) {
    const me = real(), mg = manage();
    MA.ui.menu(anchor, [
      { label: t('openProfile'), icon: 'user', run: () => MA.go('#/team/' + m.id) },
      mg && m.id !== me.id ? { label: t('useAs'), icon: 'eye', run: () => useAs(m) } : null,
      mg && m.status === 'invited' ? { label: t('markJoined'), icon: 'check', run: () => markJoined(m) } : null,
      mg && m.status === 'invited' && m.email ? { label: t('emailInvite'), icon: 'mail', href: inviteHref(m) } : null,
      m.email ? { label: t('copyEmail'), icon: 'copy', run: () => MA.copy(m.email) } : null,
      mg && m.id !== me.id && !isLastOwner(m) ? '-' : null,
      mg && m.id !== me.id && !isLastOwner(m) ? { label: t('remove'), icon: 'trash', danger: true, run: () => remove(m) } : null,
    ].filter(Boolean), { align: 'end' });
  }

  /* ---------- page ---------- */
  let S = null;
  function render(view, ctx) {
    const root = h('div.m-team'); view.append(root);
    const st = S = { root, sel: -1, quiet: false, ctx };
    MA.cleanup(() => { if (S === st) S = null; });
    draw();
    const redraw = () => { if (S === st && !st.quiet) draw(); };
    ['sample', 'activity', 'leads', 'content:ready'].forEach(e => MA.onView(e, redraw));
    MA.onView('team', () => { MA.renderNav(); redraw(); });
    MA.keys.bindView('j', () => move(1), () => t('k.next'));
    MA.keys.bindView('k', () => move(-1), () => t('k.prev'));
    MA.keys.bindView('enter', () => { const r = rows()[S?.sel]; if (r) MA.go('#/team/' + r.dataset.id); }, () => t('k.open'));
    MA.keys.bindView('i', () => invite(), () => t('k.invite'));
  }
  const rows = () => S ? [...S.root.querySelectorAll('.tm-table tbody tr[data-id]')] : [];
  function move(d) {
    if (!S || S.ctx.sub[0]) return;
    const r = rows(); if (!r.length) return;
    S.sel = MA.clamp(S.sel < 0 ? (d > 0 ? 0 : r.length - 1) : S.sel + d, 0, r.length - 1);
    r.forEach((x, i) => x.classList.toggle('sel', i === S.sel));
    r[S.sel].scrollIntoView({ block: 'nearest' }); r[S.sel].querySelector('.tm-name')?.focus({ preventScroll: true });
  }
  function draw() {
    if (!S) return;
    S.root.innerHTML = '';
    const id = S.ctx.sub[0];
    if (id) drawProfile(id); else drawList();
  }

  function usingBanner() {
    const prev = MA.team.get(MA.db.get('team.prevMe', ''));
    if (!prev || prev.id === real().id) return null;
    return h('div.callout.tm-using', h('span', { html: MA.icon('eye') }), h('span.grow', t('usingNote', { name: myName() })), MA.ui.btn(t('switchBack', { name: prev.name }), { size: 'sm', onclick: switchBack }));
  }

  function drawList() {
    const R = S.root, mg = manage(), me = real();
    const list = MA.team.all();
    const invitedN = list.filter(m => m.status === 'invited').length;
    R.append(MA.ui.pageHead({ title: esc(MA.L(mod.title)), sub: esc(t('sub')), actions: mg ? [MA.ui.btn(t('invite'), { icon: 'plus', kind: 'primary', onclick: invite })] : [] }));
    const banner = usingBanner(); if (banner) R.append(banner);
    R.append(h('div.callout.tm-honest', MA.iconEl('info'), h('div.grow', h('span', t('honest')), ' ', h('a.tm-inline', { href: '#/team?sec=access', onclick: e => { e.preventDefault(); S?.root.querySelector('#tm-access')?.scrollIntoView({ block: 'start', behavior: MA.reducedMotion() ? 'auto' : 'smooth' }); S?.root.querySelector('#tm-access h2')?.focus({ preventScroll: true }); } }, t('sec.more')))));

    // members
    const tbody = h('tbody');
    list.forEach(m => tbody.append(memberRow(m, me, mg)));
    const count = list.length === 1 ? t('oneMember') : t('nMembers', { n: MA.num(list.length) });
    const card = h('section.card.tm-members',
      h('div.card-head', h('h2.h3', t('members')), h('span.small.faint.tm-count', count + (invitedN ? ` · ${t('nInvited', { n: MA.num(invitedN) })}` : ''))),
      h('div.tm-scroll', h('table.table.tm-table',
        h('thead', h('tr', h('th', t('colPerson')), h('th', t('colRole')), h('th.tm-c-title', t('colTitle')), h('th', t('colStatus')), h('th.shrink', h('span.sr-only', MA.t('more'))))),
        tbody)));
    if (list.length <= 1) card.append(MA.ui.empty({ title: t('empty'), text: mg ? t('emptyText') : t('emptyRO'), pose: 'arrive', compact: true, actions: mg ? [MA.ui.btn(t('invite'), { icon: 'plus', kind: 'primary', onclick: invite })] : [] }));
    R.append(card);
    R.append(matrix());
    R.append(privacyCard());
    if (S.sel >= 0) { const r = rows(); if (r[S.sel]) r[S.sel].classList.add('sel'); else S.sel = -1; }
  }

  function memberRow(m, me, mg) {
    const roleCell = h('td.tm-role');
    if (mg && !isLastOwner(m)) {
      const opts = ROLES().filter(r => r !== 'owner' || MA.role() === 'owner' || m.role === 'owner').map(r => ({ value: r, label: roleName(r) }));
      const sel = MA.ui.select(opts, m.role, v => { if (!changeRole(m, v)) sel.value = m.role; }, { cls: 'sm', label: `${t('colRole')} · ${m.name}` });
      roleCell.append(sel);
    } else {
      roleCell.append(h('span.tm-rolename', roleName(m.role)));
      if (isLastOwner(m) && mg) roleCell.append(h('span.tm-lock', { 'data-tip': t('lastOwner'), 'aria-label': t('lastOwner'), tabindex: '0', html: MA.icon('lock', 'sm') }));
    }
    const status = m.status === 'invited'
      ? h('span.tm-status', h('span.badge.warn', { html: `<span class="d"></span>${esc(t('invited'))}` }), m.invitedAt ? h('span.tiny.faint', MA.ago(m.invitedAt)) : null)
      : h('span.tm-status', h('span.badge.good', { html: `<span class="d"></span>${esc(t('active'))}` }));
    const tr = h('tr', { dataset: { id: m.id, href: '#/team/' + m.id }, class: m.id === me.id ? 'is-me' : '' },
      h('td', h('div.tm-person', MA.ui.avatar(m),
        h('div.tm-who',
          h('div.row', { style: { gap: '6px' } }, h('a.tm-name', { href: '#/team/' + m.id }, m.name || '—'), m.id === me.id && !isUnnamed(m.id) ? MA.ui.badge(t('you'), 'outline') : null, m.sample ? MA.ui.sample() : null),
          h('span.tm-email.small.faint', { dir: 'ltr' }, m.email || '')))),
      roleCell,
      h('td.tm-c-title', m.title ? h('span', m.title) : h('span.faint', t('noTitle'))),
      h('td', status),
      h('td.shrink', MA.ui.iconBtn('more', { tip: t('actions', { name: m.name }), size: 'sm', onclick: e => { e.stopPropagation(); memberMenu(e.currentTarget, m); } })));
    tr.addEventListener('click', e => { if (e.target.closest('a,button,select,input,.tm-lock')) return; MA.go('#/team/' + m.id); });
    return tr;
  }

  function matrix() {
    const cur = MA.role(), mine = real().role || 'owner', all = MA.team.all(), roles = viewable();
    // "View as" previews a role; it never lets you step above your own (a viewer can't preview Owner)
    const seg = roles.length > 1 ? MA.ui.seg(roles.map(r => ({ value: r, label: roleName(r) })), roles.includes(cur) ? cur : mine, r => {
      MA.prefs.set('viewAs', r === mine ? '' : r);
      MA.renderMe(); MA.renderNav(); MA.renderRibbon?.(); MA.rerender();
    }, { size: 'sm', label: t('viewAs') }) : null;
    const head = h('tr', h('th', h('span.sr-only', t('roles'))), ROLES().map(r => {
      const n = all.filter(m => m.role === r).length;
      return h('th', { class: 'tm-rc' + (r === cur ? ' cur' : ''), scope: 'col' }, h('span.tm-rn', roleName(r)), h('span.tm-rcount', n ? (n === 1 ? t('oneRole') : t('nRole', { n: MA.num(n) })) : t('noneRole')));
    }));
    const desc = h('tr.tm-desc', h('td'), ROLES().map(r => h('td', { class: 'tm-rc' + (r === cur ? ' cur' : '') }, t('r.' + r))));
    const body = h('tbody', desc, MA.PERMS.map(p => h('tr', { dataset: { perm: p } },
      h('th', { scope: 'row' }, h('span.tm-pn', t('p.' + p)), h('span.tm-pd', t('pd.' + p))),
      ROLES().map(r => { const on = (MA.ROLES[r] || []).includes('*') || (MA.ROLES[r] || []).includes(p);
        return h('td', { class: 'tm-cell tm-rc' + (on ? ' on' : '') + (r === cur ? ' cur' : '') }, h('span', { html: on ? MA.icon('check', 'sm') : '<i class="tm-dash"></i>' }), h('span.sr-only', on ? t('yes') : t('no'))); }))));
    return h('section.card.tm-roles#tm-roles',
      h('div.card-head', h('div.grow', h('h2.h3', t('roles')), h('p.sub', t('rolesSub')))),
      h('div.card-body',
        seg ? h('div.tm-viewas', h('span.h4', t('viewAs')), seg, h('p.hint.small.faint', t('viewAsHint', { role: roleName(mine) }))) : null,
        h('div.tm-scroll', h('table.tm-matrix', h('thead', head), body))));
  }

  /** Accounts are local and there's no sign-in: say how to put a real lock in front of /admin (host password, Cloudflare Access, own origin). */
  function privacyCard() {
    const local = /^(localhost|127\.0\.0\.1|\[::1\]|.*\.localhost|.*\.test)$/i.test(location.hostname) || location.protocol === 'file:';
    const path = new URL('.', location.href).pathname.replace(/\/$/, '') || '/admin';
    // an example address for the admin's own origin, from the studio's email domain (falls back to this host)
    const dom = (String(MA.content?.get?.('studio/email') || MA.content?.defaults?.studio?.email || '').split('@')[1] || '').trim() || (local ? '' : location.hostname.replace(/^www\./, ''));
    const host = 'admin.' + (dom || 'example.com');
    const ltr = v => `<code class="ltr">${esc(v)}</code>`;
    const li = (k, vars) => h('li', h('span', { html: MA.icon(k === '3' ? 'globe' : 'lock', 'sm') }), h('span', { html: t('sec.' + k, vars) }));
    return h('section.card.tm-access-card#tm-access', { 'aria-labelledby': 'tm-access-h' },
      h('div.card-head', h('div.grow', h('h2.h3', { id: 'tm-access-h', tabindex: '-1' }, t('sec.title')), h('p.sub', t('sec.sub')))),
      h('div.card-body',
        h('p.tm-here', { html: `${t('sec.here', { origin: ltr(location.origin) })} ${esc(t(local ? 'sec.local' : 'sec.public'))}` }),
        h('ol.tm-steps', li('1', { path: ltr(path + '/') }), li('2', { path: ltr(path + '/') }), li('3', { host: ltr(host) })),
        h('a.tm-guide', { href: 'GUIDE.md', target: '_blank', rel: 'noopener', html: `<span>${esc(t('sec.guide'))}</span>${MA.icon('external', 'sm')}` })));
  }

  /* ---------- profile #/team/<id> ---------- */
  function drawProfile(id) {
    const R = S.root, m = MA.team.get(id), me = real(), mg = manage();
    if (!m || (m.sample && !MA.prefs.get('sampleData'))) {
      R.append(MA.ui.empty({ title: t('notFound'), text: t('notFoundText'), pose: 'present', actions: [MA.ui.btn(t('back'), { icon: 'arrowLeft', kind: 'primary', href: '#/team' })] }));
      return;
    }
    const canEdit = mg || m.id === me.id;
    const banner = usingBanner(); if (banner) R.append(banner);
    const avatar = MA.ui.avatar(m, 'xl');
    const nameH = h('h1.h1.tm-pname', m.name);
    const statusB = m.status === 'invited' ? h('span.badge.warn', { html: `<span class="d"></span>${esc(t('invited'))}` }) : h('span.badge.good', { html: `<span class="d"></span>${esc(t('active'))}` });
    const titleLine = h('p.tm-pline', h('span.tm-ptitle', m.title || t('noTitle')), h('span.faint', '·'), h('span', roleName(m.role)), statusB, m.id === me.id && !isUnnamed(m.id) ? MA.ui.badge(t('you'), 'outline') : null, m.sample ? MA.ui.sample() : null);
    const acts = [];
    if (mg && m.id !== me.id) acts.push(MA.ui.btn(t('useAs'), { icon: 'eye', kind: 'ghost', onclick: () => useAs(m) }));
    if (mg && m.status === 'invited') acts.push(MA.ui.btn(t('emailInvite'), { icon: 'mail', href: inviteHref(m) }));
    if (mg && m.id !== me.id && !isLastOwner(m)) acts.push(MA.ui.btn(t('remove'), { icon: 'trash', kind: 'ghost danger', onclick: () => remove(m) }));
    R.append(h('header.tm-phead', avatar, h('div.grow', nameH, titleLine, m.email ? h('a.tm-pmail.small', { href: 'mailto:' + m.email, dir: 'ltr' }, m.email) : null), acts.length ? h('div.btn-row', acts) : null));

    // --- profile form
    const savedEl = h('span.tm-saved', { 'aria-live': 'polite' });
    const save = (patch) => {
      S.quiet = true; MA.team.update(m.id, patch); S.quiet = false;
      Object.assign(m, patch);
      savedEl.textContent = t('saved'); savedEl.classList.add('on'); clearTimeout(save.tm); save.tm = setTimeout(() => savedEl.classList.remove('on'), 1600);
      Object.assign(m, MA.team.get(m.id) || {}); // what the UI shows (a named owner stops being "You")
      const fresh = MA.ui.avatar(m, 'xl'); avatarRef.el.replaceWith(fresh); avatarRef.el = fresh; prevAv.replaceChildren(MA.ui.avatar(m, 'lg'));
      nameH.textContent = m.name; titleLine.querySelector('.tm-ptitle').textContent = m.title || t('noTitle');
      if (nameHint && !isUnnamed(m.id)) nameHint.hidden = true;
      if (m.id === me.id) MA.renderMe();
      MA.setCrumbs?.([{ label: m.name }]);
    };
    const avatarRef = { el: avatar };
    const unnamed = isUnnamed(m.id);
    const nameIn = h('input.input', { value: unnamed ? '' : m.name || '', placeholder: unnamed ? t('namePh') : null, readOnly: !canEdit, autocomplete: 'off' }), nameErr = h('p.err', { hidden: true }, t('nameErr'));
    const nameHint = unnamed ? h('p.hint', t('nameYou', { you: MA.t('core.you') })) : null;
    const titleIn = h('input.input', { value: m.title || '', readOnly: !canEdit, placeholder: t('inv.phTitle') });
    const emailIn = h('input.input', { type: 'email', value: m.email || '', readOnly: !mg, dir: 'ltr' }), emailErr = h('p.err', { hidden: true }, t('inv.emailErr'));
    const deb = MA.debounce(fn => fn(), 380);
    nameIn.addEventListener('input', () => { const v = nameIn.value.trim(); nameErr.hidden = !!v || isUnnamed(m.id); if (v) deb(() => save({ name: v })); });
    titleIn.addEventListener('input', () => deb(() => save({ title: titleIn.value.trim() })));
    emailIn.addEventListener('input', () => { const v = emailIn.value.trim(); const ok = emailOk(v); emailErr.hidden = ok || !v; if (ok) deb(() => save({ email: v.toLowerCase() })); });
    const swatches = h('div.tm-swatches', { role: 'radiogroup', 'aria-label': t('colour') });
    const custom = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(m.color || '') ? m.color : '#2B3BF0', disabled: !canEdit, 'aria-label': t('customColour') });
    const drawSw = () => { swatches.innerHTML = ''; COLOURS.forEach(c => swatches.append(h('button', { type: 'button', role: 'radio', 'aria-checked': String((m.color || '').toUpperCase() === c), 'aria-label': c, disabled: !canEdit, onclick: () => { save({ color: c }); drawSw(); } }))); swatches.lastElementChild && [...swatches.children].forEach((b, i) => b.style.setProperty('--sw', COLOURS[i])); swatches.append(h('label.tm-custom', { 'data-tip': t('customColour') }, custom)); };
    custom.addEventListener('input', () => deb(() => { save({ color: custom.value.toUpperCase() }); drawSw(); }));
    drawSw();
    const prevAv = h('span.tm-avprev', MA.ui.avatar(m, 'lg'));
    const photoBtns = h('div.btn-row');
    const drawPhoto = () => {
      photoBtns.innerHTML = '';
      if (!canEdit) return;
      photoBtns.append(MA.ui.btn(m.avatar ? t('replacePhoto') : t('upload'), { icon: 'upload', size: 'sm', onclick: async () => {
        const [file] = await MA.pickFile({ accept: 'image/*' }); if (!file) return;
        try { const url = await resizeAvatar(file); save({ avatar: url }); drawPhoto(); } catch (e) { MA.toast(esc(t('photoBad')), { tone: 'bad' }); }
      } }));
      if (m.avatar) photoBtns.append(MA.ui.btn(t('removePhoto'), { icon: 'trash', size: 'sm', kind: 'ghost', onclick: () => { save({ avatar: '' }); drawPhoto(); } }));
    };
    drawPhoto();
    const profile = h('section.card.tm-profile',
      h('div.card-head', h('div.grow', h('h2.h3', t('profile')), h('p.sub', t('profileSub'))), savedEl),
      h('div.card-body.tm-form',
        canEdit ? null : h('div.callout', { html: MA.icon('lock') + `<span>${esc(t('profileRO', { name: m.name }))}</span>` }),
        h('div.tm-form-2', MA.ui.field(t('name'), h('div', nameIn, nameErr, nameHint)), MA.ui.field(t('jobTitle'), titleIn)),
        MA.ui.field(t('email'), h('div', emailIn, emailErr)),
        MA.ui.field(t('colour'), swatches),
        MA.ui.field(t('photo'), h('div.tm-photo', prevAv, h('div', photoBtns, h('p.hint', t('photoHint')))))));

    // --- access
    const perms = MA.PERMS.filter(p => { const r = MA.ROLES[m.role] || []; return r.includes('*') || r.includes(p); });
    const roleCtl = mg && !isLastOwner(m)
      ? MA.ui.select(ROLES().filter(r => r !== 'owner' || MA.role() === 'owner' || m.role === 'owner').map(r => ({ value: r, label: roleName(r) })), m.role, v => { if (!changeRole(m, v)) roleCtl.value = m.role; }, { label: t('colRole') })
      : h('b', roleName(m.role));
    const nb = openBriefs(m.id).length;
    const access = h('section.card.tm-access',
      h('div.card-head', h('div.grow', h('h2.h3', t('access')), h('p.sub', t('accessSub')))),
      h('div.card-body',
        h('div.tm-access-role', roleCtl, h('p.small.muted', t('r.' + m.role)), isLastOwner(m) ? h('p.tiny.faint', t('lastOwner')) : null),
        h('ul.tm-perms', MA.PERMS.map(p => h('li', { class: perms.includes(p) ? 'on' : '' }, h('span', { html: perms.includes(p) ? MA.icon('check', 'sm') : '<i class="tm-dash"></i>' }), h('span', t('p.' + p)), h('span.sr-only', perms.includes(p) ? t('yes') : t('no'))))),
        MA.can('leads.view') ? h('div.tm-owns', h('span', nb === 0 ? t('ownsNone') : nb === 1 ? t('ownsOne') : t('owns', { n: MA.num(nb) })), nb ? h('a.small', { href: '#/inbox?owner=' + encodeURIComponent(m.id) }, t('openInbox')) : null) : null));

    // --- activity
    const acts2 = MA.activity.list().filter(a => a.byId === m.id).slice(0, 25);
    const actBody = h('div.card-body');
    if (!acts2.length) actBody.append(MA.ui.empty({ title: t('noActivity'), text: t('noActivityText'), pose: 'arrive', compact: true }));
    else actBody.append(h('ol.tm-acts', acts2.map(a => h('li', h('span.tm-act-i', { html: MA.icon(actIcon(a.action), 'sm') }),
      h('span.grow', h(a.href ? 'a' : 'span', { href: a.href || null, class: 'tm-act-t' }, actLabel(a.action)), a.target ? h('span.muted', ' · ' + a.target) : null),
      h('time.tiny.faint', { datetime: a.at, title: MA.date(a.at, { dateStyle: 'medium', timeStyle: 'short' }) }, MA.ago(a.at))))));
    const activity = h('section.card.tm-activity', h('div.card-head', h('div.grow', h('h2.h3', t('activity')), h('p.sub', t('activitySub')))), actBody);

    R.append(h('div.tm-pgrid', h('div.stack', profile), h('div.stack', access, activity)));
  }

  /** Shrink an image to a ≤160px square (centre crop) as a data URL. */
  async function resizeAvatar(file, size = 160) {
    const url = await MA.readDataURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(img.naturalWidth, img.naturalHeight); if (!s) throw new Error('empty image');
    const out = Math.min(size, s), cv = document.createElement('canvas'); cv.width = cv.height = out;
    const cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, out, out);
    const webp = cv.toDataURL('image/webp', .86);
    return webp.startsWith('data:image/webp') ? webp : cv.toDataURL('image/jpeg', .86);
  }

  const mod = {
    id: ID, group: 'system', order: 110, icon: 'team', shortcut: 'g t',
    title: { en: 'Team', ar: 'الفريق', fa: 'تیم' },
    keywords: 'team members people roles permissions invite users access',
    badge() { if (!manage()) return null; const n = MA.team.all().filter(m => m.status === 'invited').length; return n ? { n, quiet: true, label: t('badge', { n: MA.num(n) }) } : null; },
    render(view, ctx) { render(view, ctx); const sec = { roles: '#tm-roles', access: '#tm-access' }[ctx.query.get('sec')]; if (sec) setTimeout(() => S?.root.querySelector(sec)?.scrollIntoView({ block: 'start', behavior: MA.reducedMotion() ? 'auto' : 'smooth' }), 80); },
    crumbs(ctx) { const m = ctx.sub[0] && MA.team.get(ctx.sub[0]); return m ? [{ label: m.name }] : []; },
    search(q) {
      const s = String(q).trim().toLowerCase(); if (!s) return [];
      return MA.team.all().filter(m => [m.name, m.email, m.title, roleName(m.role)].some(x => String(x || '').toLowerCase().includes(s)))
        .map(m => ({ title: m.name, sub: `${roleName(m.role)}${m.title ? ' · ' + m.title : ''}`, icon: 'user', run: () => MA.go('#/team/' + m.id) }));
    },
    resizeAvatar,
  };
  MA.module(mod);
  MA.commands.add({ id: 'team.invite', title: { en: 'Add a teammate to this browser', ar: 'أضف زميلاً إلى هذا المتصفح', fa: 'افزودن هم‌تیمی به این مرورگر' }, icon: 'plus', keywords: 'invite add member user person team', when: () => MA.can('team.manage'), run: () => { if (MA.ctx().id !== ID) MA.go('#/team'); setTimeout(invite, 60); } });
  MA.commands.add({ id: 'team.roles', title: { en: 'Roles and permissions', ar: 'الأدوار والصلاحيات', fa: 'نقش‌ها و دسترسی‌ها' }, icon: 'lock', keywords: 'roles permissions access view as', run: () => MA.go('#/team?sec=roles') });
  MA.commands.add({ id: 'team.private', title: { en: 'Keep the admin private', ar: 'أبقِ لوحة الإدارة خاصة', fa: 'پنل را خصوصی نگه دارید' }, icon: 'lock', keywords: 'security password protect sign in login access cloudflare origin private', run: () => MA.go('#/team?sec=access') });
})();
