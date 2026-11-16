// Правила обучения школы — вкладка «Правила» в «Уроках».
//
// Источник — документ школы «Правила обучения — Just to Study» (прислан владельцем
// 15.11.2026). Русский текст — как в документе, казахский и английский — перевод
// (смысл и цифры те же; казахский показать носителю до прода). Правите правило —
// правьте все три языка: тест сверяет, что структура у них одна.
//
// Данные, а не html документа: три копии разметки разъехались бы, а стили документа
// спорили бы со стилями сайта. Блок раздела — абзац (`p`), список (`list`), плашка
// (`note`, тон ok / warn / bad) или таблица (`table`); `**…**` — выделение.
//
// Та же суть есть у Луны (lib/assistant/knowledge.js, «Правила обучения школы») —
// пересказом. Поменялось правило — поменяйте и её статью.

const ru = {
  tag: 'Just to Study',
  title: 'Правила обучения',
  lead: 'Перенос, отмена и заморозка уроков, а также случаи, когда уроки или абонемент сгорают. Пожалуйста, ознакомьтесь с правилами до начала занятий.',
  stats: [
    { num: '3 часа', label: 'минимум до начала урока, чтобы перенести или отменить его' },
    { num: '4 раза', label: 'в месяц — общий лимит переносов и отмен' },
    { num: '7 дней', label: 'максимальная заморозка за абонемент' },
    { num: '15 минут', label: 'ожидания студента — затем урок считается проведённым' },
  ],
  toc: 'Содержание',
  sections: [
    {
      id: 'general',
      title: 'Общие положения',
      blocks: [
        {
          type: 'list',
          items: [
            'Обучение проходит на собственной платформе школы в **индивидуальном** или **групповом** формате. Уроки длятся **30, 60 или 90 минут** в зависимости от выбранного тарифа.',
            'Расписание уроков согласовывается со студентом заранее и фиксируется в личном кабинете.',
            'Количество уроков и срок действия абонемента указаны в договоре и в личном кабинете студента.',
            '**Вся коммуникация в процессе обучения ведётся в общем чате, где есть студент, преподаватель и менеджер.** Это позволяет менеджеру видеть фактическую историю посещений и при необходимости подтвердить, когда и о чём было сообщено. Договорённости, сделанные устно, по телефону или в сторонних мессенджерах, не учитываются.',
            'О переносе или отмене индивидуального урока необходимо сообщать в **общем чате с менеджером и преподавателем**. Сообщение, отправленное в личные сообщения только менеджеру или только преподавателю, не считается заявкой.',
            'О **заморозке** нужно предупредить **лично менеджера** в чате.',
            'Время в правилах указано по времени начала урока в расписании.',
          ],
        },
      ],
    },
    {
      id: 'manager',
      title: 'Сопровождение менеджера',
      blocks: [
        { type: 'p', text: 'За каждым студентом закреплён менеджер, который сопровождает его на протяжении всего обучения. В рамках своей работы менеджер:' },
        {
          type: 'list',
          items: [
            'периодически **запрашивает обратную связь** об обучении: как проходят уроки, всё ли устраивает в работе с преподавателем, есть ли пожелания;',
            'напоминает об **остатке уроков** на балансе, чтобы вы заранее знали, сколько занятий осталось, и могли спокойно спланировать продолжение обучения.',
          ],
        },
        { type: 'note', tone: 'ok', text: 'Пожалуйста, не воспринимайте такие сообщения как давление или навязчивость. Это обычный регламент работы менеджера, одинаковый для всех студентов. Ваша обратная связь помогает нам делать обучение лучше, а напоминания о балансе помогают не прерывать занятия в неудобный момент.' },
      ],
    },
    {
      id: 'reschedule',
      title: 'Перенос урока',
      blocks: [
        { type: 'p', italic: true, text: 'Правила переноса действуют только для индивидуальных уроков. Групповые уроки не переносятся — см. раздел «Групповые уроки».' },
        {
          type: 'list',
          items: [
            'Урок можно перенести, если сообщить об этом в общем чате **не позднее чем за 3 часа** до его начала.',
            'Перенос и отмена урока считаются **одним и тем же действием**, поэтому для них действует общий лимит — **не более 4 раз в месяц**. Например: 2 переноса и 2 отмены за месяц — лимит исчерпан.',
            'Новое время урока согласовывается в общем чате с менеджером и преподавателем с учётом свободных слотов.',
            'Перенесённый урок должен быть проведён в пределах срока действия абонемента.',
          ],
        },
        { type: 'note', tone: 'warn', text: 'Если лимит переносов и отмен в текущем месяце исчерпан, урок проводится по расписанию. При отсутствии студента урок сгорает.' },
      ],
    },
    {
      id: 'cancel',
      title: 'Отмена урока',
      blocks: [
        { type: 'p', italic: true, text: 'Правила отмены действуют только для индивидуальных уроков. Групповые уроки не отменяются — см. раздел «Групповые уроки».' },
        {
          type: 'list',
          items: [
            'Отмена урока **не позднее чем за 3 часа** до начала — урок сохраняется на балансе и не списывается. Отмена входит в общий лимит — **не более 4 переносов и отмен в месяц**.',
            'Отмена **менее чем за 3 часа** до начала урока — урок **списывается** как проведённый.',
            'Отмена без предупреждения приравнивается к неявке.',
          ],
        },
        { type: 'note', tone: 'bad', text: 'Преподаватель резервирует время под каждого студента, поэтому поздняя отмена считается проведённым уроком.' },
      ],
    },
    {
      id: 'group',
      title: 'Групповые уроки',
      blocks: [
        { type: 'p', text: 'Групповая программа строится вокруг общего темпа: каждый урок опирается на предыдущий, а расписание составлено так, чтобы подходить всем участникам группы. Поэтому правила для групповых уроков отличаются от индивидуальных.' },
        {
          type: 'list',
          items: [
            'Групповые уроки **нельзя перенести или отменить**: урок проходит в назначенное время для всей группы, независимо от присутствия отдельного студента.',
            'Пропущенный групповой урок **считается проведённым** и не восполняется отдельным занятием.',
            'Если студент пропустил урок, рекомендуем самостоятельно проработать пройденную тему до следующего занятия, чтобы прийти на него подготовленным.',
          ],
        },
        { type: 'note', tone: 'ok', text: '**Почему важно не отставать от группы.** Программа рассчитана на то, что все студенты продвигаются вместе: каждая новая тема опирается на уже пройденную, а преподаватель выстраивает урок, исходя из уровня группы в целом. Каждый пропуск создаёт пробел, который со временем растёт: становится сложнее понимать новый материал, участвовать в обсуждениях и работать в парах. Регулярное посещение и выполнение заданий — главное условие того, чтобы к концу курса вы достигли ожидаемого результата вместе с группой.' },
      ],
    },
    {
      id: 'late',
      title: 'Опоздание и неявка',
      blocks: [
        {
          type: 'list',
          items: [
            'Если студент подключился к уроку в течение первых **15 минут**, он проходит только **оставшееся время урока**. Урок не продлевается, так как после вас у преподавателя занимается другой студент.',
            'Если студент не зашёл на урок в течение **15 минут** от его начала, урок **сгорает и считается проведённым**.',
            'Неявка без предупреждения — урок **списывается**.',
          ],
        },
      ],
    },
    {
      id: 'freeze',
      title: 'Заморозка обучения',
      blocks: [
        {
          type: 'list',
          items: [
            'Обучение можно заморозить **не более чем на 7 дней** за один абонемент.',
            'Заморозку можно активировать, только если студент **ранее не отменял уроки в текущем месяце**.',
            '**Исключение:** заморозка по состоянию здоровья при наличии **медицинского заключения** оформляется даже при отменах в этом месяце.',
            'О заморозке нужно предупредить **лично менеджера** в чате **заранее**, до начала периода заморозки. Задним числом заморозка не оформляется.',
            'На время заморозки срок действия абонемента продлевается на количество дней заморозки.',
            'Уроки, запланированные на период заморозки, сохраняются на балансе.',
          ],
        },
        { type: 'note', tone: 'warn', text: 'Если по окончании заморозки студент не выходит на связь и не посещает уроки, занятия по расписанию списываются на общих основаниях.' },
      ],
    },
    {
      id: 'school',
      title: 'Перенос или отмена со стороны школы',
      blocks: [
        {
          type: 'list',
          items: [
            'Если урок отменяет или переносит преподаватель или школа, урок **не списывается** и не считается в лимит переносов студента.',
            'Школа предлагает новое удобное время либо урок с другим преподавателем.',
            'Смена преподавателя возможна по согласованию с менеджером, с учётом пожеланий студента.',
          ],
        },
        { type: 'note', tone: 'ok', text: 'Такие уроки всегда сохраняются на балансе студента.' },
      ],
    },
    {
      id: 'tech',
      title: 'Технические неполадки',
      blocks: [
        {
          type: 'list',
          items: [
            'Если урок не состоялся из-за неполадок на стороне платформы или преподавателя — урок **переносится без списания**.',
            'Если урок не состоялся из-за проблем на стороне студента (интернет, устройство, микрофон) — действуют общие правила отмены и неявки.',
            'Рекомендуем проверять соединение и устройство за несколько минут до начала урока.',
          ],
        },
      ],
    },
    {
      id: 'burn',
      title: 'Когда сгорают уроки и абонемент',
      blocks: [
        { type: 'p', text: '**Урок сгорает (списывается), если:**' },
        {
          type: 'list',
          items: [
            'урок отменён или перенесён **менее чем за 3 часа** до начала;',
            'студент не пришёл на урок или не зашёл в течение **15 минут**;',
            'студент пропустил **групповой урок** — такие уроки не переносятся и не отменяются;',
            'лимит из 4 переносов и отмен в месяц исчерпан, а студент не пришёл на урок по расписанию;',
            'урок не состоялся из-за технических проблем на стороне студента.',
          ],
        },
        { type: 'p', text: '**Абонемент сгорает, если:**' },
        {
          type: 'list',
          items: [
            'истёк срок действия абонемента — все неиспользованные уроки **аннулируются** и не переносятся на новый абонемент;',
            'студент прекратил посещать занятия и не оформил заморозку — срок абонемента продолжает идти.',
          ],
        },
        { type: 'note', tone: 'bad', text: 'Сгоревшие уроки и неиспользованный остаток просроченного абонемента не возвращаются и не компенсируются.' },
      ],
    },
    {
      id: 'table',
      title: 'Сводная таблица',
      blocks: [
        {
          type: 'table',
          head: ['Ситуация', 'Что происходит с уроком'],
          rows: [
            { text: 'Перенос или отмена индивидуального урока за 3 часа и более (в пределах 4 раз в месяц)', result: 'Сохраняется', tone: 'ok' },
            { text: 'Перенос или отмена сверх лимита 4 раз в месяц', result: 'Урок по расписанию', tone: 'warn' },
            { text: 'Перенос или отмена менее чем за 3 часа', result: 'Списывается', tone: 'bad' },
            { text: 'Пропуск группового урока', result: 'Считается проведённым', tone: 'bad' },
            { text: 'Подключился в течение первых 15 минут', result: 'Только оставшееся время', tone: 'warn' },
            { text: 'Неявка / не зашёл в течение 15 минут', result: 'Сгорает', tone: 'bad' },
            { text: 'Заморозка до 7 дней, оформленная заранее (без отмен в этом месяце)', result: 'Сохраняется, срок продлевается', tone: 'ok' },
            { text: 'Заморозка после отмены урока в этом месяце', result: 'Недоступна', tone: 'bad' },
            { text: 'Заморозка по болезни с медицинским заключением', result: 'Доступна всегда', tone: 'ok' },
            { text: 'Отмена со стороны преподавателя или школы', result: 'Сохраняется', tone: 'ok' },
            { text: 'Техническая проблема у школы', result: 'Переносится', tone: 'ok' },
            { text: 'Техническая проблема у студента', result: 'По общим правилам', tone: 'bad' },
            { text: 'Истёк срок абонемента', result: 'Остаток сгорает', tone: 'bad' },
          ],
        },
      ],
    },
  ],
  closing: {
    title: 'Вместе к вашему результату ✨',
    text: 'Эти правила созданы не для того, чтобы ограничивать, а для того, чтобы обучение было честным, понятным и результативным для каждого. Когда все участники процесса соблюдают договорённости, преподаватель может полностью посвятить себя вашему прогрессу, а вы — уверенно двигаться к своей цели.',
    items: [
      'Сообщайте о переносе или отмене заранее — минимум за 3 часа, в общем чате.',
      'Приходите на уроки вовремя: каждая минута занятия работает на ваш результат.',
      'В группе держите общий темп — так результат будет у всех.',
      'Планируйте заморозку заранее и предупреждайте менеджера лично.',
      'Делитесь обратной связью — она помогает нам становиться лучше для вас.',
    ],
    outro: 'Регулярность — главный секрет успеха в изучении языка. Мы рядом на каждом этапе и искренне рады, что вы учитесь с нами.',
    sign: 'С заботой о вашем результате, команда Just to Study 💙',
  },
  footer: 'По всем вопросам обращайтесь к вашему менеджеру.',
}

const kk = {
  tag: 'Just to Study',
  title: 'Оқу ережелері',
  lead: 'Сабақты ауыстыру, болдырмау және мұздату, сондай-ақ сабақтар мен абонемент күйіп кететін жағдайлар. Сабақтар басталмас бұрын ережелермен танысып шығыңыз.',
  stats: [
    { num: '3 сағат', label: 'сабақ басталғанға дейін кемінде — оны ауыстыру немесе болдырмау үшін' },
    { num: '4 рет', label: 'айына — ауыстыру мен болдырмаудың ортақ лимиті' },
    { num: '7 күн', label: 'бір абонементке мұздатудың ең ұзақ мерзімі' },
    { num: '15 минут', label: 'студентті күтеміз — содан кейін сабақ өткізілген болып саналады' },
  ],
  toc: 'Мазмұны',
  sections: [
    {
      id: 'general',
      title: 'Жалпы ережелер',
      blocks: [
        {
          type: 'list',
          items: [
            'Оқу мектептің өз платформасында **жеке** немесе **топтық** форматта өтеді. Сабақ таңдалған тарифке қарай **30, 60 немесе 90 минутқа** созылады.',
            'Сабақ кестесі студентпен алдын ала келісіліп, жеке кабинетте бекітіледі.',
            'Сабақтар саны мен абонементтің жарамдылық мерзімі шартта және студенттің жеке кабинетінде көрсетілген.',
            '**Оқу барысындағы барлық байланыс студент, мұғалім және менеджер бар ортақ чатта жүргізіледі.** Бұл менеджерге сабаққа қатысудың нақты тарихын көруге және қажет болса, қашан және не туралы хабарланғанын растауға мүмкіндік береді. Ауызша, телефонмен немесе басқа мессенджерлерде жасалған келісімдер есепке алынбайды.',
            'Жеке сабақты ауыстыру немесе болдырмау туралы **менеджер мен мұғалім бар ортақ чатта** хабарлау керек. Тек менеджерге немесе тек мұғалімге жеке хабарлама жіберу өтінім болып саналмайды.',
            '**Мұздату** туралы чатта **менеджердің өзіне** ескерту керек.',
            'Ережелердегі уақыт кестедегі сабақтың басталу уақыты бойынша көрсетілген.',
          ],
        },
      ],
    },
    {
      id: 'manager',
      title: 'Менеджердің сүйемелдеуі',
      blocks: [
        { type: 'p', text: 'Әр студентке оқудың басынан аяғына дейін сүйемелдейтін менеджер бекітіледі. Өз жұмысы аясында менеджер:' },
        {
          type: 'list',
          items: [
            'мезгіл-мезгіл оқу туралы **кері байланыс сұрайды**: сабақтар қалай өтіп жатыр, мұғаліммен жұмыс көңіліңізден шыға ма, тілектеріңіз бар ма;',
            'балансыңызда **қалған сабақтар** туралы еске салады — қанша сабақ қалғанын алдын ала біліп, оқуды жалғастыруды асықпай жоспарлай аласыз.',
          ],
        },
        { type: 'note', tone: 'ok', text: 'Мұндай хабарламаларды қысым немесе мазалау деп қабылдамаңызшы. Бұл — барлық студентке бірдей, менеджер жұмысының әдеттегі тәртібі. Сіздің кері байланысыңыз оқуды жақсартуға көмектеседі, ал баланс туралы еске салу сабақтың ыңғайсыз сәтте үзіліп қалмауына көмектеседі.' },
      ],
    },
    {
      id: 'reschedule',
      title: 'Сабақты ауыстыру',
      blocks: [
        { type: 'p', italic: true, text: 'Ауыстыру ережелері тек жеке сабақтарға қолданылады. Топтық сабақтар ауыстырылмайды — «Топтық сабақтар» бөлімін қараңыз.' },
        {
          type: 'list',
          items: [
            'Сабақ басталуына **кемінде 3 сағат** қалғанда ортақ чатта хабарласаңыз, оны ауыстыруға болады.',
            'Сабақты ауыстыру мен болдырмау **бір әрекет** болып саналады, сондықтан оларға ортақ лимит қолданылады — **айына 4 реттен артық емес**. Мысалы: бір айда 2 ауыстыру және 2 болдырмау — лимит таусылды.',
            'Сабақтың жаңа уақыты бос уақыттарды ескере отырып, менеджер мен мұғалім бар ортақ чатта келісіледі.',
            'Ауыстырылған сабақ абонементтің жарамдылық мерзімі ішінде өтуі тиіс.',
          ],
        },
        { type: 'note', tone: 'warn', text: 'Ағымдағы айда ауыстыру мен болдырмау лимиті таусылса, сабақ кесте бойынша өтеді. Студент келмесе, сабақ күйіп кетеді.' },
      ],
    },
    {
      id: 'cancel',
      title: 'Сабақты болдырмау',
      blocks: [
        { type: 'p', italic: true, text: 'Болдырмау ережелері тек жеке сабақтарға қолданылады. Топтық сабақтар болдырылмайды — «Топтық сабақтар» бөлімін қараңыз.' },
        {
          type: 'list',
          items: [
            'Сабақ басталуына **кемінде 3 сағат** қалғанда болдырмау — сабақ балансқа сақталады және есептен шығарылмайды. Болдырмау ортақ лимитке кіреді — **айына 4 ауыстыру мен болдырмаудан артық емес**.',
            'Сабақ басталуына **3 сағаттан аз** қалғанда болдырмау — сабақ өткізілген ретінде **есептен шығарылады**.',
            'Ескертусіз болдырмау сабаққа келмей қалумен тең.',
          ],
        },
        { type: 'note', tone: 'bad', text: 'Мұғалім әр студентке уақыт бөліп қояды, сондықтан кеш болдырмау өткізілген сабақ болып саналады.' },
      ],
    },
    {
      id: 'group',
      title: 'Топтық сабақтар',
      blocks: [
        { type: 'p', text: 'Топтық бағдарлама ортақ қарқынға құрылған: әр сабақ алдыңғысына сүйенеді, ал кесте топтың барлық қатысушысына ыңғайлы болатындай құрылған. Сондықтан топтық сабақтардың ережелері жеке сабақтардан өзгеше.' },
        {
          type: 'list',
          items: [
            'Топтық сабақтарды **ауыстыруға немесе болдырмауға болмайды**: жеке студенттің қатысуына қарамастан, сабақ бүкіл топ үшін белгіленген уақытта өтеді.',
            'Жіберіп алынған топтық сабақ **өткізілген болып саналады** және бөлек сабақпен толықтырылмайды.',
            'Сабақты жіберіп алсаңыз, келесі сабаққа дайын келу үшін өтілген тақырыпты өз бетіңізше пысықтап алуды ұсынамыз.',
          ],
        },
        { type: 'note', tone: 'ok', text: '**Неге топтан қалмау маңызды.** Бағдарлама барлық студент бірге алға жылжиды деп есептелген: әр жаңа тақырып өтілген тақырыпқа сүйенеді, ал мұғалім сабақты жалпы топтың деңгейіне қарай құрады. Әр жіберілген сабақ уақыт өте келе ұлғая беретін олқылық қалдырады: жаңа материалды түсіну, талқылауларға қатысу және жұппен жұмыс істеу қиындай түседі. Курстың соңында топпен бірге күткен нәтижеге жетудің басты шарты — сабаққа тұрақты қатысу және тапсырмаларды орындау.' },
      ],
    },
    {
      id: 'late',
      title: 'Кешігу және келмей қалу',
      blocks: [
        {
          type: 'list',
          items: [
            'Студент сабақтың алғашқы **15 минуты** ішінде қосылса, ол тек **сабақтың қалған уақытын** өтеді. Сабақ ұзартылмайды, себебі сізден кейін мұғалімде басқа студент оқиды.',
            'Студент сабақ басталғаннан кейін **15 минут** ішінде кірмесе, сабақ **күйіп кетеді және өткізілген болып саналады**.',
            'Ескертусіз келмей қалу — сабақ **есептен шығарылады**.',
          ],
        },
      ],
    },
    {
      id: 'freeze',
      title: 'Оқуды мұздату',
      blocks: [
        {
          type: 'list',
          items: [
            'Оқуды бір абонементке **7 күннен аспайтын** мерзімге мұздатуға болады.',
            'Мұздатуды студент **ағымдағы айда бұрын сабақ болдырмаған** жағдайда ғана іске қосуға болады.',
            '**Ерекшелік:** **медициналық қорытынды** болса, денсаулыққа байланысты мұздату осы айда болдырмаулар болса да рәсімделеді.',
            'Мұздату туралы чатта **менеджердің өзіне** **алдын ала**, мұздату кезеңі басталғанға дейін ескерту керек. Мұздату өткен күнмен рәсімделмейді.',
            'Мұздату кезінде абонементтің жарамдылық мерзімі мұздату күндерінің санына ұзартылады.',
            'Мұздату кезеңіне жоспарланған сабақтар балансқа сақталады.',
          ],
        },
        { type: 'note', tone: 'warn', text: 'Мұздату аяқталғаннан кейін студент хабарласпаса және сабаққа келмесе, кестедегі сабақтар жалпы негізде есептен шығарылады.' },
      ],
    },
    {
      id: 'school',
      title: 'Мектеп тарапынан ауыстыру немесе болдырмау',
      blocks: [
        {
          type: 'list',
          items: [
            'Сабақты мұғалім немесе мектеп болдырмаса не ауыстырса, сабақ **есептен шығарылмайды** және студенттің ауыстыру лимитіне кірмейді.',
            'Мектеп жаңа ыңғайлы уақыт немесе басқа мұғаліммен сабақ ұсынады.',
            'Мұғалімді ауыстыру студенттің тілегін ескере отырып, менеджермен келісім бойынша мүмкін.',
          ],
        },
        { type: 'note', tone: 'ok', text: 'Мұндай сабақтар әрқашан студенттің балансында сақталады.' },
      ],
    },
    {
      id: 'tech',
      title: 'Техникалық ақаулар',
      blocks: [
        {
          type: 'list',
          items: [
            'Сабақ платформа немесе мұғалім тарапындағы ақаулар салдарынан өтпесе — сабақ **есептен шығарылмай ауыстырылады**.',
            'Сабақ студент тарапындағы ақаулар (интернет, құрылғы, микрофон) салдарынан өтпесе — болдырмау мен келмей қалудың жалпы ережелері қолданылады.',
            'Сабақ басталардан бірнеше минут бұрын байланыс пен құрылғыны тексеруді ұсынамыз.',
          ],
        },
      ],
    },
    {
      id: 'burn',
      title: 'Сабақтар мен абонемент қашан күйеді',
      blocks: [
        { type: 'p', text: '**Сабақ күйіп кетеді (есептен шығарылады), егер:**' },
        {
          type: 'list',
          items: [
            'сабақ басталуына **3 сағаттан аз** уақыт қалғанда болдырылса немесе ауыстырылса;',
            'студент сабаққа келмесе немесе **15 минут** ішінде кірмесе;',
            'студент **топтық сабақты** жіберіп алса — мұндай сабақтар ауыстырылмайды және болдырылмайды;',
            'айына 4 ауыстыру мен болдырмау лимиті таусылып, студент кестедегі сабаққа келмесе;',
            'сабақ студент тарапындағы техникалық ақаулар салдарынан өтпесе.',
          ],
        },
        { type: 'p', text: '**Абонемент күйіп кетеді, егер:**' },
        {
          type: 'list',
          items: [
            'абонементтің жарамдылық мерзімі өтсе — пайдаланылмаған барлық сабақ **жойылады** және жаңа абонементке ауыстырылмайды;',
            'студент сабаққа қатысуды тоқтатып, мұздатуды рәсімдемесе — абонемент мерзімі өте береді.',
          ],
        },
        { type: 'note', tone: 'bad', text: 'Күйіп кеткен сабақтар мен мерзімі өткен абонементтің пайдаланылмаған қалдығы қайтарылмайды және өтелмейді.' },
      ],
    },
    {
      id: 'table',
      title: 'Жиынтық кесте',
      blocks: [
        {
          type: 'table',
          head: ['Жағдай', 'Сабаққа не болады'],
          rows: [
            { text: 'Жеке сабақты 3 сағат және одан көп бұрын ауыстыру немесе болдырмау (айына 4 рет шегінде)', result: 'Сақталады', tone: 'ok' },
            { text: 'Айына 4 рет лимитінен тыс ауыстыру немесе болдырмау', result: 'Сабақ кесте бойынша', tone: 'warn' },
            { text: '3 сағаттан аз қалғанда ауыстыру немесе болдырмау', result: 'Есептен шығарылады', tone: 'bad' },
            { text: 'Топтық сабақты жіберіп алу', result: 'Өткізілген болып саналады', tone: 'bad' },
            { text: 'Алғашқы 15 минут ішінде қосылды', result: 'Тек қалған уақыт', tone: 'warn' },
            { text: 'Келмей қалу / 15 минут ішінде кірмеді', result: 'Күйіп кетеді', tone: 'bad' },
            { text: 'Алдын ала рәсімделген 7 күнге дейін мұздату (осы айда болдырмаусыз)', result: 'Сақталады, мерзім ұзартылады', tone: 'ok' },
            { text: 'Осы айда сабақты болдырмағаннан кейін мұздату', result: 'Қолжетімсіз', tone: 'bad' },
            { text: 'Медициналық қорытындымен ауруға байланысты мұздату', result: 'Әрқашан қолжетімді', tone: 'ok' },
            { text: 'Мұғалім немесе мектеп тарапынан болдырмау', result: 'Сақталады', tone: 'ok' },
            { text: 'Мектеп тарапындағы техникалық ақау', result: 'Ауыстырылады', tone: 'ok' },
            { text: 'Студент тарапындағы техникалық ақау', result: 'Жалпы ережелер бойынша', tone: 'bad' },
            { text: 'Абонемент мерзімі өтті', result: 'Қалдығы күйіп кетеді', tone: 'bad' },
          ],
        },
      ],
    },
  ],
  closing: {
    title: 'Нәтижеңізге бірге ✨',
    text: 'Бұл ережелер шектеу үшін емес, оқу әркім үшін әділ, түсінікті және нәтижелі болуы үшін жасалған. Процестің барлық қатысушысы келісімдерді сақтағанда, мұғалім өзін толықтай сіздің прогресіңізге арнай алады, ал сіз мақсатыңызға сенімді түрде қадам басасыз.',
    items: [
      'Ауыстыру немесе болдырмау туралы алдын ала — кемінде 3 сағат бұрын, ортақ чатта хабарлаңыз.',
      'Сабаққа уақытында келіңіз: сабақтың әр минуты сіздің нәтижеңіз үшін жұмыс істейді.',
      'Топта ортақ қарқынды ұстаңыз — сонда нәтиже барлығында болады.',
      'Мұздатуды алдын ала жоспарлап, менеджердің өзіне ескертіңіз.',
      'Кері байланыспен бөлісіңіз — ол бізге сіз үшін жақсара түсуге көмектеседі.',
    ],
    outro: 'Тұрақтылық — тіл үйренудегі табыстың басты құпиясы. Біз әр кезеңде қасыңыздамыз және сіздің бізбен оқып жатқаныңызға шын жүректен қуаныштымыз.',
    sign: 'Нәтижеңізге қамқорлықпен, Just to Study командасы 💙',
  },
  footer: 'Барлық сұрақ бойынша менеджеріңізге хабарласыңыз.',
}

const en = {
  tag: 'Just to Study',
  title: 'Study rules',
  lead: 'Rescheduling, cancelling and freezing lessons, and the cases when lessons or a package are forfeited. Please read the rules before your classes start.',
  stats: [
    { num: '3 hours', label: 'minimum notice before a lesson to reschedule or cancel it' },
    { num: '4 times', label: 'a month — the shared limit for reschedules and cancellations' },
    { num: '7 days', label: 'maximum freeze per package' },
    { num: '15 minutes', label: 'we wait for the student — then the lesson counts as held' },
  ],
  toc: 'Contents',
  sections: [
    {
      id: 'general',
      title: 'General',
      blocks: [
        {
          type: 'list',
          items: [
            'Classes take place on the school’s own platform in an **individual** or **group** format. Lessons last **30, 60 or 90 minutes**, depending on your plan.',
            'The lesson schedule is agreed with the student in advance and recorded in the personal account.',
            'The number of lessons and the package validity period are stated in the contract and in the student’s personal account.',
            '**All communication during your studies takes place in a shared chat with the student, the teacher and the manager.** This lets the manager see the actual attendance history and, if needed, confirm when and what was communicated. Agreements made verbally, by phone or in other messengers are not taken into account.',
            'Rescheduling or cancelling an individual lesson must be reported in the **shared chat with the manager and the teacher**. A private message to only the manager or only the teacher does not count as a request.',
            'A **freeze** must be requested from **the manager personally** in the chat.',
            'All times in these rules refer to the lesson start time in the schedule.',
          ],
        },
      ],
    },
    {
      id: 'manager',
      title: 'Manager support',
      blocks: [
        { type: 'p', text: 'Every student has a dedicated manager who supports them throughout their studies. As part of their work, the manager:' },
        {
          type: 'list',
          items: [
            'periodically **asks for feedback** on your studies: how lessons are going, whether you are happy working with your teacher, and whether you have any requests;',
            'reminds you of the **lessons left** on your balance, so you know in advance how many classes remain and can calmly plan to continue.',
          ],
        },
        { type: 'note', tone: 'ok', text: 'Please don’t take these messages as pressure or intrusion. This is the manager’s standard routine, the same for every student. Your feedback helps us make learning better, and balance reminders help you avoid a break in classes at an inconvenient moment.' },
      ],
    },
    {
      id: 'reschedule',
      title: 'Rescheduling a lesson',
      blocks: [
        { type: 'p', italic: true, text: 'Rescheduling rules apply to individual lessons only. Group lessons cannot be rescheduled — see “Group lessons”.' },
        {
          type: 'list',
          items: [
            'A lesson can be rescheduled if you report it in the shared chat **at least 3 hours** before it starts.',
            'Rescheduling and cancelling count as **the same action**, so they share one limit — **no more than 4 times a month**. For example: 2 reschedules and 2 cancellations in a month — the limit is used up.',
            'The new lesson time is agreed in the shared chat with the manager and the teacher, based on available slots.',
            'A rescheduled lesson must take place within the package validity period.',
          ],
        },
        { type: 'note', tone: 'warn', text: 'If the reschedule and cancellation limit for the current month is used up, the lesson goes ahead as scheduled. If the student does not attend, the lesson is forfeited.' },
      ],
    },
    {
      id: 'cancel',
      title: 'Cancelling a lesson',
      blocks: [
        { type: 'p', italic: true, text: 'Cancellation rules apply to individual lessons only. Group lessons cannot be cancelled — see “Group lessons”.' },
        {
          type: 'list',
          items: [
            'Cancelling **at least 3 hours** before the start — the lesson stays on your balance and is not deducted. A cancellation counts toward the shared limit — **no more than 4 reschedules and cancellations a month**.',
            'Cancelling **less than 3 hours** before the lesson — the lesson is **deducted** as held.',
            'Cancelling without notice is treated as a no-show.',
          ],
        },
        { type: 'note', tone: 'bad', text: 'The teacher reserves time for each student, so a late cancellation counts as a held lesson.' },
      ],
    },
    {
      id: 'group',
      title: 'Group lessons',
      blocks: [
        { type: 'p', text: 'The group programme is built around a shared pace: each lesson builds on the previous one, and the schedule is set to suit all group members. That is why the rules for group lessons differ from individual ones.' },
        {
          type: 'list',
          items: [
            'Group lessons **cannot be rescheduled or cancelled**: the lesson takes place at the scheduled time for the whole group, whether or not an individual student attends.',
            'A missed group lesson **counts as held** and is not made up with a separate class.',
            'If you miss a lesson, we recommend studying the topic on your own before the next class so that you come prepared.',
          ],
        },
        { type: 'note', tone: 'ok', text: '**Why keeping up with the group matters.** The programme assumes that all students progress together: each new topic builds on the previous ones, and the teacher plans the lesson around the level of the group as a whole. Every absence leaves a gap that grows over time: it gets harder to understand new material, take part in discussions and work in pairs. Regular attendance and homework are the key to reaching the expected result together with your group by the end of the course.' },
      ],
    },
    {
      id: 'late',
      title: 'Lateness and no-shows',
      blocks: [
        {
          type: 'list',
          items: [
            'If the student joins within the first **15 minutes**, they only get **the remaining lesson time**. The lesson is not extended, because the teacher has another student right after you.',
            'If the student does not join within **15 minutes** of the start, the lesson is **forfeited and counts as held**.',
            'A no-show without notice — the lesson is **deducted**.',
          ],
        },
      ],
    },
    {
      id: 'freeze',
      title: 'Freezing your studies',
      blocks: [
        {
          type: 'list',
          items: [
            'Studies can be frozen for **no more than 7 days** per package.',
            'A freeze can be activated only if the student **has not cancelled any lessons earlier in the current month**.',
            '**Exception:** a freeze for health reasons with a **medical certificate** is granted even if there were cancellations this month.',
            'A freeze must be requested from **the manager personally** in the chat **in advance**, before the freeze period starts. Freezes cannot be backdated.',
            'During a freeze, the package validity period is extended by the number of frozen days.',
            'Lessons scheduled during the freeze stay on your balance.',
          ],
        },
        { type: 'note', tone: 'warn', text: 'If the student does not get in touch or attend lessons after the freeze ends, scheduled lessons are deducted as usual.' },
      ],
    },
    {
      id: 'school',
      title: 'Rescheduling or cancellation by the school',
      blocks: [
        {
          type: 'list',
          items: [
            'If a lesson is cancelled or rescheduled by the teacher or the school, it is **not deducted** and does not count toward the student’s reschedule limit.',
            'The school offers a new convenient time or a lesson with another teacher.',
            'Changing the teacher is possible by agreement with the manager, taking the student’s wishes into account.',
          ],
        },
        { type: 'note', tone: 'ok', text: 'Such lessons always stay on the student’s balance.' },
      ],
    },
    {
      id: 'tech',
      title: 'Technical problems',
      blocks: [
        {
          type: 'list',
          items: [
            'If a lesson did not take place because of problems on the platform’s or the teacher’s side, it is **rescheduled without being deducted**.',
            'If a lesson did not take place because of problems on the student’s side (internet, device, microphone), the general cancellation and no-show rules apply.',
            'We recommend checking your connection and device a few minutes before the lesson starts.',
          ],
        },
      ],
    },
    {
      id: 'burn',
      title: 'When lessons and packages are forfeited',
      blocks: [
        { type: 'p', text: '**A lesson is forfeited (deducted) if:**' },
        {
          type: 'list',
          items: [
            'it is cancelled or rescheduled **less than 3 hours** before the start;',
            'the student did not come to the lesson or did not join within **15 minutes**;',
            'the student missed a **group lesson** — such lessons cannot be rescheduled or cancelled;',
            'the limit of 4 reschedules and cancellations a month is used up and the student did not attend the scheduled lesson;',
            'the lesson did not take place because of technical problems on the student’s side.',
          ],
        },
        { type: 'p', text: '**A package is forfeited if:**' },
        {
          type: 'list',
          items: [
            'its validity period has ended — all unused lessons are **cancelled** and do not carry over to a new package;',
            'the student stopped attending classes without arranging a freeze — the package period keeps running.',
          ],
        },
        { type: 'note', tone: 'bad', text: 'Forfeited lessons and the unused balance of an expired package are not refunded or compensated.' },
      ],
    },
    {
      id: 'table',
      title: 'Summary table',
      blocks: [
        {
          type: 'table',
          head: ['Situation', 'What happens to the lesson'],
          rows: [
            { text: 'Rescheduling or cancelling an individual lesson 3 or more hours ahead (within 4 times a month)', result: 'Kept', tone: 'ok' },
            { text: 'Rescheduling or cancelling beyond the limit of 4 times a month', result: 'Lesson as scheduled', tone: 'warn' },
            { text: 'Rescheduling or cancelling less than 3 hours ahead', result: 'Deducted', tone: 'bad' },
            { text: 'Missing a group lesson', result: 'Counts as held', tone: 'bad' },
            { text: 'Joined within the first 15 minutes', result: 'Remaining time only', tone: 'warn' },
            { text: 'No-show / did not join within 15 minutes', result: 'Forfeited', tone: 'bad' },
            { text: 'Freeze of up to 7 days arranged in advance (no cancellations this month)', result: 'Kept, period extended', tone: 'ok' },
            { text: 'Freeze after cancelling a lesson this month', result: 'Not available', tone: 'bad' },
            { text: 'Sick-leave freeze with a medical certificate', result: 'Always available', tone: 'ok' },
            { text: 'Cancellation by the teacher or the school', result: 'Kept', tone: 'ok' },
            { text: 'Technical problem on the school’s side', result: 'Rescheduled', tone: 'ok' },
            { text: 'Technical problem on the student’s side', result: 'General rules apply', tone: 'bad' },
            { text: 'Package period has ended', result: 'Remaining lessons forfeited', tone: 'bad' },
          ],
        },
      ],
    },
  ],
  closing: {
    title: 'Together toward your result ✨',
    text: 'These rules are not here to restrict you — they make learning fair, clear and effective for everyone. When everyone keeps to the agreements, the teacher can focus fully on your progress, and you can move confidently toward your goal.',
    items: [
      'Report a reschedule or cancellation in advance — at least 3 hours ahead, in the shared chat.',
      'Come to lessons on time: every minute of class works toward your result.',
      'In a group, keep the shared pace — that way everyone gets results.',
      'Plan a freeze in advance and tell your manager personally.',
      'Share your feedback — it helps us get better for you.',
    ],
    outro: 'Regular practice is the main secret of success in learning a language. We are with you at every step and truly glad you are learning with us.',
    sign: 'With care for your result, the Just to Study team 💙',
  },
  footer: 'For any questions, contact your manager.',
}

export const RULES = { ru, kk, en }

// Язык без своего текста — русский: так же откатывается весь словарь интерфейса.
export function rulesFor(lang) {
  return RULES[lang] ?? RULES.ru
}

// «Текст **выделение** текст» → куски [{ text, bold }]. Разметка — только жирный:
// больше в документе школы ничего нет, и полноценный markdown тут был бы лишним.
export function splitBold(text) {
  return String(text)
    .split('**')
    .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
    .filter((part) => part.text !== '')
}
