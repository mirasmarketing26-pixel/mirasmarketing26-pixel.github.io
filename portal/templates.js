/*
 * Ready project templates for the Miras portal. Shared by the admin and the client portal.
 * Local mode (api.js) reads window.PORTAL_TEMPLATES when a project is created with a templateKey.
 * The Worker keeps a copy in portal/worker/src/templates.js; portal/worker/test/worker.test.js fails when the two differ.
 * Edit this file first, then copy the array across.
 *
 * Shape: { key, name: {en, ar}, summary: {en, ar}, steps: [ { title: {en, ar}, description: {en, ar},
 *          deliverables: [ { title: {en, ar}, kind, description: {en, ar} } ] } ] }
 * kind is image | video | post | document | link. Suggested deliverables start as drafts with no file,
 * so the team fills them in. There is no Persian text yet; only en and ar are read.
 */
window.PORTAL_TEMPLATES = [
  {
    key: 'video',
    name: { en: 'Video production', ar: 'إنتاج فيديو' },
    summary: {
      en: 'From brief to final films. The client approves the story before filming and sees a rough cut before the fine cut.',
      ar: 'من الموجز إلى الأفلام النهائية. يعتمد العميل القصة قبل التصوير، ويرى المونتاج الأولي قبل الضبط النهائي.'
    },
    steps: [
      {
        title: { en: 'Brief', ar: 'الموجز' },
        description: { en: 'Goal, audience, and the messages that must appear.', ar: 'الهدف والجمهور والرسائل التي يجب أن تظهر.' },
        deliverables: [
          { title: { en: 'Creative brief', ar: 'الموجز الإبداعي' }, kind: 'document',
            description: { en: 'The one-page brief the client signs before work starts.', ar: 'الموجز المكوّن من صفحة واحدة الذي يوقّعه العميل قبل بدء العمل.' } }
        ]
      },
      {
        title: { en: 'Script and storyboard', ar: 'النص وسير اللقطات' },
        description: { en: 'The client approves the story before anything is filmed.', ar: 'يعتمد العميل القصة قبل تصوير أي مشهد.' },
        deliverables: [
          { title: { en: 'Script', ar: 'النص' }, kind: 'document',
            description: { en: 'Spoken words and on-screen text, scene by scene.', ar: 'الكلام والنصوص على الشاشة، مشهداً بمشهد.' } },
          { title: { en: 'Storyboard', ar: 'سير اللقطات' }, kind: 'image',
            description: { en: 'Sketches or frames that show each shot.', ar: 'رسومات أو إطارات توضح كل لقطة.' } }
        ]
      },
      {
        title: { en: 'Production', ar: 'التصوير' },
        description: { en: 'Shoot or animate the scenes, and keep reference stills.', ar: 'تصوير المشاهد أو تحريكها، والاحتفاظ بصور مرجعية.' },
        deliverables: [
          { title: { en: 'Reference stills', ar: 'صور مرجعية' }, kind: 'image',
            description: { en: 'Frames from the shoot, to check against the storyboard.', ar: 'لقطات من التصوير للمقارنة مع سير اللقطات.' } }
        ]
      },
      {
        title: { en: 'Rough cut', ar: 'المونتاج الأولي' },
        description: { en: 'The first edit, for notes.', ar: 'المونتاج الأول لجمع الملاحظات.' },
        deliverables: [
          { title: { en: 'Rough cut', ar: 'المونتاج الأولي' }, kind: 'video',
            description: { en: 'The first edit, sent to the client for notes.', ar: 'المونتاج الأول، يرسل إلى العميل لإبداء الملاحظات.' } }
        ]
      },
      {
        title: { en: 'Fine cut', ar: 'المونتاج النهائي' },
        description: { en: 'Notes applied and timing locked.', ar: 'تطبيق الملاحظات وتثبيت التوقيت.' },
        deliverables: [
          { title: { en: 'Fine cut', ar: 'المونتاج الدقيق' }, kind: 'video',
            description: { en: 'The edit with notes applied, ready for final sound and colour.', ar: 'المونتاج بعد تطبيق الملاحظات، جاهز للصوت والتلوين النهائيين.' } }
        ]
      },
      {
        title: { en: 'Delivery', ar: 'التسليم' },
        description: { en: 'Every size, with captions.', ar: 'كل المقاسات مع الترجمة المكتوبة.' },
        deliverables: [
          { title: { en: 'Final films, 16:9 and 9:16', ar: 'الأفلام النهائية بنسبة 16:9 و9:16' }, kind: 'video',
            description: { en: 'The film in landscape and vertical sizes.', ar: 'الفيلم بالمقاس الأفقي والعمودي.' } },
          { title: { en: 'Captions', ar: 'ملفات الترجمة المكتوبة' }, kind: 'document',
            description: { en: 'The caption file for each size.', ar: 'ملف الترجمة لكل مقاس.' } }
        ]
      }
    ]
  },
  {
    key: 'social',
    name: { en: 'Monthly social media', ar: 'إدارة التواصل الاجتماعي الشهرية' },
    summary: {
      en: 'One month of posts: planned, approved as a batch, scheduled and reported.',
      ar: 'شهر كامل من المنشورات: تخطيط، ثم اعتماد دفعة واحدة، ثم جدولة وتقرير.'
    },
    steps: [
      {
        title: { en: 'Plan', ar: 'الخطة' },
        description: { en: 'Goals, themes and key dates for the month.', ar: 'أهداف الشهر وموضوعاته وتواريخه المهمة.' },
        deliverables: [
          { title: { en: 'Monthly plan', ar: 'الخطة الشهرية' }, kind: 'document',
            description: { en: 'Goals, content themes and the posting calendar in one document.', ar: 'الأهداف والمحاور وتقويم النشر في مستند واحد.' } },
          { title: { en: 'Content calendar', ar: 'تقويم المحتوى' }, kind: 'link',
            description: { en: 'A shared calendar the client can open.', ar: 'تقويم مشترك يمكن للعميل فتحه.' } }
        ]
      },
      {
        title: { en: 'Concepts', ar: 'الأفكار' },
        description: { en: 'Post ideas and visual directions.', ar: 'أفكار المنشورات والاتجاهات البصرية.' },
        deliverables: [
          { title: { en: 'Concept boards', ar: 'لوحات الأفكار' }, kind: 'image',
            description: { en: 'Visual directions for the main post types.', ar: 'اتجاهات بصرية لأنواع المنشورات الرئيسية.' } }
        ]
      },
      {
        title: { en: 'Copy', ar: 'النصوص' },
        description: { en: 'Arabic and English captions, with hashtags.', ar: 'نصوص بالعربية والإنجليزية مع الهاشتاغات.' },
        deliverables: [
          { title: { en: 'Captions', ar: 'نصوص المنشورات' }, kind: 'document',
            description: { en: 'Every caption for the month, in both languages.', ar: 'كل نص للشهر بالعربية والإنجليزية.' } }
        ]
      },
      {
        title: { en: 'Design', ar: 'التصميم' },
        description: { en: 'Graphics and short videos.', ar: 'الجرافيك والفيديوهات القصيرة.' },
        deliverables: [
          { title: { en: 'Graphics', ar: 'الجرافيك' }, kind: 'image',
            description: { en: 'Finished post graphics in every size.', ar: 'تصاميم المنشورات النهائية بكل المقاسات.' } },
          { title: { en: 'Short videos', ar: 'فيديوهات قصيرة' }, kind: 'video',
            description: { en: 'Reels and short clips for the month.', ar: 'ريلز ومقاطع قصيرة للشهر.' } }
        ]
      },
      {
        title: { en: 'Client approval', ar: 'اعتماد العميل' },
        description: { en: 'The client approves the whole month before anything is scheduled.', ar: 'يعتمد العميل الشهر كاملاً قبل جدولة أي منشور.' },
        deliverables: [
          { title: { en: 'Post batch', ar: 'دفعة المنشورات' }, kind: 'post',
            description: { en: 'The month’s posts together, for one approval.', ar: 'منشورات الشهر معاً لاعتماد واحد.' } }
        ]
      },
      {
        title: { en: 'Schedule and report', ar: 'الجدولة والتقرير' },
        description: { en: 'Posts scheduled, published and reported.', ar: 'جدولة المنشورات ونشرها ورفع التقرير.' },
        deliverables: [
          { title: { en: 'Monthly report', ar: 'التقرير الشهري' }, kind: 'document',
            description: { en: 'Reach, engagement, and what to change next month.', ar: 'الوصول والتفاعل وما يجب تغييره الشهر القادم.' } }
        ]
      }
    ]
  },
  {
    key: 'brand',
    name: { en: 'Brand identity', ar: 'الهوية البصرية' },
    summary: {
      en: 'From discovery to the files: name, logo, visual system and guidelines.',
      ar: 'من الاستكشاف حتى الملفات: الاسم والشعار والنظام البصري والدليل.'
    },
    steps: [
      {
        title: { en: 'Discovery', ar: 'الاستكشاف' },
        description: { en: 'Interviews and a review of competitors.', ar: 'مقابلات ومراجعة للمنافسين.' },
        deliverables: [
          { title: { en: 'Discovery notes', ar: 'ملاحظات الاستكشاف' }, kind: 'document',
            description: { en: 'What we heard, and where the brand stands today.', ar: 'ما سمعناه، وأين تقف العلامة اليوم.' } }
        ]
      },
      {
        title: { en: 'Positioning and naming', ar: 'التموضع والتسمية' },
        description: { en: 'The message, the tone, and the name options.', ar: 'الرسالة والنبرة وخيارات الاسم.' },
        deliverables: [
          { title: { en: 'Brand platform', ar: 'منصة العلامة' }, kind: 'document',
            description: { en: 'Positioning, tone of voice and the chosen name.', ar: 'التموضع ونبرة الصوت والاسم المختار.' } }
        ]
      },
      {
        title: { en: 'Logo concepts', ar: 'مفاهيم الشعار' },
        description: { en: 'Three directions, then one refined.', ar: 'ثلاثة اتجاهات، ثم اتجاه واحد مطوّر.' },
        deliverables: [
          { title: { en: 'Logo concepts', ar: 'مفاهيم الشعار' }, kind: 'image',
            description: { en: 'Three directions, in colour and in black and white.', ar: 'ثلاثة اتجاهات بالألوان وبالأبيض والأسود.' } },
          { title: { en: 'Final logo', ar: 'الشعار النهائي' }, kind: 'image',
            description: { en: 'The chosen logo, refined, in its main versions.', ar: 'الشعار المختار بعد التطوير، بنسخه الرئيسية.' } }
        ]
      },
      {
        title: { en: 'Visual system', ar: 'النظام البصري' },
        description: { en: 'Colour, type and icons.', ar: 'الألوان والخطوط والأيقونات.' },
        deliverables: [
          { title: { en: 'Visual guidelines', ar: 'الإرشادات البصرية' }, kind: 'document',
            description: { en: 'Colour palette, typefaces and the rules for using them.', ar: 'لوحة الألوان والخطوط وقواعد استخدامها.' } },
          { title: { en: 'Pattern set', ar: 'مجموعة الأنماط' }, kind: 'image',
            description: { en: 'Patterns and icons built from the brand.', ar: 'أنماط وأيقونات مستمدة من العلامة.' } }
        ]
      },
      {
        title: { en: 'Applications', ar: 'التطبيقات' },
        description: { en: 'Mock-ups on the key items.', ar: 'نماذج تطبيق على العناصر الأساسية.' },
        deliverables: [
          { title: { en: 'Applications', ar: 'التطبيقات' }, kind: 'image',
            description: { en: 'The logo and system on key items, such as stationery and signage.', ar: 'الشعار والنظام على العناصر الأساسية مثل المطبوعات واللافتات.' } }
        ]
      },
      {
        title: { en: 'Handover', ar: 'التسليم' },
        description: { en: 'Guidelines and the full file package.', ar: 'الدليل ومجموعة الملفات الكاملة.' },
        deliverables: [
          { title: { en: 'Brand guidelines', ar: 'دليل الهوية' }, kind: 'document',
            description: { en: 'The full guidelines, as a PDF.', ar: 'دليل الهوية الكامل بصيغة PDF.' } },
          { title: { en: 'File package', ar: 'حزمة الملفات' }, kind: 'link',
            description: { en: 'A shared link to every logo file and format.', ar: 'رابط مشترك لكل ملفات الشعار وصيغه.' } }
        ]
      }
    ]
  },
  {
    key: 'web',
    name: { en: 'Website', ar: 'موقع إلكتروني' },
    summary: {
      en: 'Structure first, then design, content, build and launch.',
      ar: 'البنية أولاً، ثم التصميم والمحتوى والتطوير والإطلاق.'
    },
    steps: [
      {
        title: { en: 'Sitemap', ar: 'خريطة الموقع' },
        description: { en: 'Pages, goals, and who owns each page’s content.', ar: 'الصفحات والأهداف ومن يملك محتوى كل صفحة.' },
        deliverables: [
          { title: { en: 'Sitemap', ar: 'خريطة الموقع' }, kind: 'document',
            description: { en: 'The list of pages and how they connect.', ar: 'قائمة الصفحات وطريقة ترابطها.' } }
        ]
      },
      {
        title: { en: 'Wireframes', ar: 'الهيكل' },
        description: { en: 'Layouts without visuals.', ar: 'تخطيطات بلا عناصر بصرية.' },
        deliverables: [
          { title: { en: 'Wireframes', ar: 'الهياكل السلكية' }, kind: 'image',
            description: { en: 'Layouts of the key pages, in black and white.', ar: 'تخطيطات الصفحات الأساسية بالأبيض والأسود.' } }
        ]
      },
      {
        title: { en: 'Design', ar: 'التصميم' },
        description: { en: 'Desktop and mobile designs.', ar: 'تصاميم للكمبيوتر والجوال.' },
        deliverables: [
          { title: { en: 'Page designs', ar: 'تصاميم الصفحات' }, kind: 'image',
            description: { en: 'Home page and inner pages, desktop and mobile.', ar: 'الصفحة الرئيسية والصفحات الداخلية، للكمبيوتر والجوال.' } }
        ]
      },
      {
        title: { en: 'Content', ar: 'المحتوى' },
        description: { en: 'Copy and images, checked.', ar: 'النصوص والصور بعد مراجعتها.' },
        deliverables: [
          { title: { en: 'Copy deck', ar: 'ملف النصوص' }, kind: 'document',
            description: { en: 'The text of every page, for the client to check.', ar: 'نصوص كل صفحة ليراجعها العميل.' } }
        ]
      },
      {
        title: { en: 'Build and test', ar: 'التطوير والاختبار' },
        description: { en: 'Staging review and fixes.', ar: 'مراجعة نسخة التجربة وإصلاح الملاحظات.' },
        deliverables: [
          { title: { en: 'Staging site', ar: 'موقع التجربة' }, kind: 'link',
            description: { en: 'A private test address for review.', ar: 'عنوان تجريبي خاص للمراجعة.' } }
        ]
      },
      {
        title: { en: 'Launch', ar: 'الإطلاق' },
        description: { en: 'Live site, redirects and analytics.', ar: 'الموقع منشور، مع التحويلات والتحليلات.' },
        deliverables: [
          { title: { en: 'Live site', ar: 'الموقع المنشور' }, kind: 'link',
            description: { en: 'The public address, after launch.', ar: 'العنوان العام بعد الإطلاق.' } }
        ]
      }
    ]
  },
  {
    key: 'campaign',
    name: { en: 'Campaign and ads', ar: 'حملة وإعلانات' },
    summary: {
      en: 'One message across channels, approved before launch and reported after.',
      ar: 'رسالة واحدة عبر القنوات، تُعتمد قبل الإطلاق وتُقيَّم بعده.'
    },
    steps: [
      {
        title: { en: 'Objectives', ar: 'الأهداف' },
        description: { en: 'Goal, budget, KPIs and dates.', ar: 'الهدف والميزانية ومؤشرات الأداء والتواريخ.' },
        deliverables: [
          { title: { en: 'Campaign brief', ar: 'موجز الحملة' }, kind: 'document',
            description: { en: 'The goal, budget, measures of success and dates.', ar: 'الهدف والميزانية ومقاييس النجاح والتواريخ.' } }
        ]
      },
      {
        title: { en: 'Audiences and channels', ar: 'الجماهير والقنوات' },
        description: { en: 'Who we reach, where, and how the budget is split.', ar: 'من نصل إليه، وأين، وكيف تُوزَّع الميزانية.' },
        deliverables: [
          { title: { en: 'Media plan', ar: 'الخطة الإعلامية' }, kind: 'document',
            description: { en: 'Channels, audiences and the budget for each.', ar: 'القنوات والجماهير والميزانية لكل منها.' } }
        ]
      },
      {
        title: { en: 'Concepts', ar: 'الأفكار' },
        description: { en: 'One message, two or three directions.', ar: 'رسالة واحدة، واتجاهان أو ثلاثة.' },
        deliverables: [
          { title: { en: 'Concept boards', ar: 'لوحات الأفكار' }, kind: 'image',
            description: { en: 'The directions, shown as layouts.', ar: 'الاتجاهات معروضة كتخطيطات.' } }
        ]
      },
      {
        title: { en: 'Production', ar: 'الإنتاج' },
        description: { en: 'Every size and language.', ar: 'كل المقاسات واللغات.' },
        deliverables: [
          { title: { en: 'Ad set', ar: 'مجموعة الإعلانات' }, kind: 'image',
            description: { en: 'Static ads in every placement size.', ar: 'إعلانات ثابتة بكل مقاسات المواضع.' } },
          { title: { en: 'Cut-downs', ar: 'المقاطع المختصرة' }, kind: 'video',
            description: { en: 'Short video versions of the main film.', ar: 'نسخ قصيرة من الفيلم الرئيسي.' } }
        ]
      },
      {
        title: { en: 'Client approval', ar: 'اعتماد العميل' },
        description: { en: 'Copy, visuals and links, approved together.', ar: 'النصوص والتصاميم والروابط، تُعتمد معاً.' },
        deliverables: [
          { title: { en: 'Ad copy', ar: 'نصوص الإعلانات' }, kind: 'document',
            description: { en: 'Headlines, body text and calls to action.', ar: 'العناوين والنصوص الأساسية ودعوات الإجراء.' } }
        ]
      },
      {
        title: { en: 'Launch and report', ar: 'الإطلاق والتقرير' },
        description: { en: 'Monitored, then reported.', ar: 'متابعة الحملة ثم رفع التقرير.' },
        deliverables: [
          { title: { en: 'Ad library', ar: 'مكتبة الإعلانات' }, kind: 'link',
            description: { en: 'Where the live ads can be viewed.', ar: 'المكان الذي يمكن فيه الاطلاع على الإعلانات المنشورة.' } },
          { title: { en: 'Results', ar: 'النتائج' }, kind: 'document',
            description: { en: 'Reach, clicks, results and what we learned.', ar: 'الوصول والنقرات والنتائج وما تعلمناه.' } }
        ]
      }
    ]
  },
  {
    key: 'photo',
    name: { en: 'Photo shoot', ar: 'جلسة تصوير' },
    summary: {
      en: 'Plan the shoot, capture it, choose images together, retouch and deliver.',
      ar: 'تخطيط الجلسة وتنفيذها، ثم الاختيار المشترك للصور والتعديل والتسليم.'
    },
    steps: [
      {
        title: { en: 'Shot list', ar: 'قائمة اللقطات' },
        description: { en: 'Shots, locations and talent.', ar: 'اللقطات والمواقع والمشاركون.' },
        deliverables: [
          { title: { en: 'Shot list', ar: 'قائمة اللقطات' }, kind: 'document',
            description: { en: 'Each shot, its location and who appears in it.', ar: 'كل لقطة وموقعها ومن يظهر فيها.' } }
        ]
      },
      {
        title: { en: 'Call sheet', ar: 'جدول الجلسة' },
        description: { en: 'Time, place, crew and props.', ar: 'الوقت والمكان والفريق والأدوات.' },
        deliverables: [
          { title: { en: 'Call sheet', ar: 'جدول يوم التصوير' }, kind: 'document',
            description: { en: 'The shoot-day plan for the whole crew.', ar: 'خطة يوم التصوير لكامل الفريق.' } }
        ]
      },
      {
        title: { en: 'Shoot day', ar: 'يوم التصوير' },
        description: { en: 'Capture, with a log of every set-up.', ar: 'التصوير مع سجل لكل تجهيز.' },
        deliverables: [
          { title: { en: 'Behind the scenes', ar: 'خلف الكواليس' }, kind: 'image',
            description: { en: 'Photos from the set, for the record and for social media.', ar: 'صور من موقع التصوير للتوثيق ولوسائل التواصل.' } }
        ]
      },
      {
        title: { en: 'Selects', ar: 'الاختيار' },
        description: { en: 'The client picks from the contact sheet.', ar: 'يختار العميل من ورقة المعاينة.' },
        deliverables: [
          { title: { en: 'Contact sheet', ar: 'ورقة المعاينة' }, kind: 'link',
            description: { en: 'A gallery of all the shots, for choosing.', ar: 'معرض بكل اللقطات للاختيار.' } }
        ]
      },
      {
        title: { en: 'Retouch', ar: 'التعديل' },
        description: { en: 'Final edits in the agreed style.', ar: 'التعديلات النهائية بالأسلوب المتفق عليه.' },
        deliverables: [
          { title: { en: 'Final images', ar: 'الصور النهائية' }, kind: 'image',
            description: { en: 'The chosen images after retouching.', ar: 'الصور المختارة بعد التعديل.' } }
        ]
      },
      {
        title: { en: 'Delivery', ar: 'التسليم' },
        description: { en: 'The full set and social crops.', ar: 'المجموعة كاملة وقصّات لوسائل التواصل.' },
        deliverables: [
          { title: { en: 'Full set', ar: 'المجموعة كاملة' }, kind: 'link',
            description: { en: 'Every approved image in high resolution.', ar: 'كل الصور المعتمدة بدقة عالية.' } },
          { title: { en: 'Social crops', ar: 'قصّات وسائل التواصل' }, kind: 'image',
            description: { en: 'Images cropped for each social platform.', ar: 'صور مقصوصة لكل منصة تواصل.' } }
        ]
      }
    ]
  },
  {
    key: 'blank',
    name: { en: 'Blank', ar: 'مشروع فارغ' },
    summary: {
      en: 'Three stages to start from. Add, rename or remove any of them.',
      ar: 'ثلاث مراحل للبدء، ويمكن إضافة أي منها أو تغيير اسمه أو حذفه.'
    },
    steps: [
      {
        title: { en: 'Brief', ar: 'الموجز' },
        description: { en: 'What the client needs, and why.', ar: 'ما يحتاجه العميل، ولماذا.' },
        deliverables: []
      },
      {
        title: { en: 'Work', ar: 'العمل' },
        description: { en: 'The main work.', ar: 'العمل الأساسي.' },
        deliverables: []
      },
      {
        title: { en: 'Client review', ar: 'مراجعة العميل' },
        description: { en: 'The client reviews and answers.', ar: 'يراجع العميل ويرد.' },
        deliverables: []
      }
    ]
  }
];

/** The template with this key, or null. */
window.PORTAL_TEMPLATE_BY_KEY = function (key) {
  var list = window.PORTAL_TEMPLATES || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].key === key) return list[i];
  }
  return null;
};
