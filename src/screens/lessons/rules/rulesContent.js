// Правила обучения школы — вкладка «Правила» в «Уроках».
//
// Источник — PDF школы «Правила для студентов» (5 страниц) через прототип и ТЗ
// «обновление страницы „Правила обучения“» (задача 83 в prod-admin, 16.11.2026).
// Русский текст — слово в слово из прототипа, порядок разделов — как в PDF; три
// последних раздела (школа, техника, таблица) PDF не знает — их школа оставила с
// прошлой редакции. Казахский и английский — перевод (смысл и цифры те же;
// казахский показать носителю). Правите правило — правьте все три языка: тест
// сверяет, что структура и цифры у них одни.
//
// Данные, а не html прототипа: три копии разметки разъехались бы, а стили прототипа
// спорили бы со стилями сайта. Блок раздела:
//   p — абзац; sub — подзаголовок внутри карточки; list — список;
//   note — плашка (tone ok / warn / bad); table — сводная таблица;
//   facts — карточки-факты (k — метка, v — крупное значение, sub — заголовок,
//     d — описание; `{offer}` в sub — ссылка на публичную оферту);
//   tariffs — лимит переносов по тарифу (id тарифа, none — «нельзя»);
//   split — две колонки (h — заголовок колонки, items — пункты).
// `**…**` — выделение.
//
// Тариф ученика здесь НЕ подсвечивается, хотя ТЗ это допускает: сайт знает его
// только как `myTariff` блока токенов, а бэкенд (PracticeTokenRules.tariffOf) там
// всё неизвестное, включая парное и «нет абонемента», отдаёт как General, а
// «IELTS Group» — как индивидуальный. Ученик увидел бы чужой лимит переносов.
//
// Та же суть есть у Луны (lib/assistant/knowledge.js, «Правила обучения школы») —
// пересказом. Поменялось правило — поменяйте и её статью.

const ru = {
  tag: 'Для студентов',
  title: 'Правила обучения JTS',
  lead: 'Назначение преподавателя, бонусы, возврат, перенос и отмена уроков, опоздание и заморозка. Пожалуйста, ознакомьтесь с правилами до начала занятий.',
  stats: [
    { num: '3 часа', label: 'минимум до начала урока, чтобы перенести или отменить его' },
    { num: '3–4 раза', label: 'в месяц — лимит переносов и отмен в зависимости от тарифа' },
    { num: '7 дней', label: 'максимальная заморозка за абонемент' },
    { num: '15 минут', label: 'ожидания студента — затем урок сгорает' },
  ],
  toc: 'Содержание',
  offer: 'Публичной оферте',
  sections: [
    {
      id: 'general',
      title: 'Общие положения',
      blocks: [
        { type: 'sub', text: 'Платформа и формат' },
        { type: 'p', text: 'Обучение проходит на собственной платформе школы в **индивидуальном**, **парном** или **групповом** формате. Уроки длятся **30, 60 или 90 минут** в зависимости от тарифа. Расписание и количество уроков — в личном кабинете.' },
        { type: 'sub', text: 'Общий чат' },
        { type: 'p', text: 'Вся коммуникация ведётся в **общем чате**, где есть студент, преподаватель и менеджер. Договорённости устно, по телефону или в других мессенджерах не учитываются. Сообщение в личку только менеджеру или только преподавателю не считается заявкой на перенос или отмену.' },
        { type: 'note', tone: 'warn', text: '**Важно:** всё время в правилах указано по времени начала урока в расписании.' },
      ],
    },
    {
      id: 'teacher',
      title: 'Назначение преподавателя',
      blocks: [
        { type: 'p', text: 'Подбор преподавателя выполняет ваш ответственный менеджер:' },
        {
          type: 'facts',
          items: [
            { k: 'Индивидуальный курс', v: 'от 1 до 3 дней' },
            { k: 'Групповой или парный курс', v: 'от 3 до 10 дней' },
          ],
        },
      ],
    },
    {
      id: 'bonus',
      title: 'Бонусы',
      blocks: [
        {
          type: 'facts',
          items: [
            { k: '01', sub: 'Бонусные приложения', d: 'Доступы к бонусным приложениям **общие для всех студентов**.' },
            { k: '02', sub: 'SELF-STUDY', d: 'На некоторых тарифах доступен бонус SELF-STUDY: курс выбранного уровня для самостоятельной практики без преподавателя. Занимайтесь когда и где удобно, доступ действует **3 месяца**.' },
          ],
        },
        { type: 'note', tone: 'ok', text: 'Если пароль от приложения не подходит, напишите своему ответственному менеджеру — он обновит данные.' },
      ],
    },
    {
      id: 'refund',
      title: 'Возврат',
      blocks: [
        {
          type: 'facts',
          items: [
            { v: '80%', sub: 'Возврат по {offer}', d: 'Если вы передумали участвовать в онлайн-обучении, оплата/предоплата возвращается в размере 80% в течение **14 рабочих дней**.' },
            { v: '20%', sub: 'Что удерживается', d: 'Из суммы удерживается комиссия 20% и вычитается **стоимость уже пройденных уроков**.' },
          ],
        },
        { type: 'note', tone: 'warn', text: '**Важно:** по любым вопросам пишите своему ответственному менеджеру — он на связи на всём протяжении обучения.' },
      ],
    },
    {
      id: 'manager',
      title: 'Сопровождение менеджера',
      blocks: [
        { type: 'p', text: 'За каждым студентом закреплён ответственный менеджер. Он периодически спрашивает обратную связь и напоминает об остатке уроков — это обычный регламент, одинаковый для всех.' },
      ],
    },
    {
      id: 'reschedule',
      title: 'Перенос и отмена',
      blocks: [
        { type: 'sub', text: 'Лимит переносов и отмен в месяц — по тарифу' },
        {
          type: 'tariffs',
          items: [
            { id: 'sub', k: 'Абонемент', plans: 'General, Kids', v: '3 раза', d: 'переносов и отмен в месяц' },
            { id: 'ind', k: 'Индивидуальный', plans: 'Premium, IELTS, Business, SAT', v: '4 раза', d: 'переносов и отмен в месяц' },
            { id: 'pair', k: 'Парное обучение', plans: 'Пара студентов', v: '3 раза', d: 'переносов и отмен в месяц' },
            { id: 'group', none: true, k: 'Групповой', plans: 'Группа', v: 'Нельзя', d: 'урок проходит для всей группы по расписанию, пропуск считается проведённым' },
          ],
        },
        { type: 'sub', text: 'Как переносить и отменять' },
        {
          type: 'list',
          items: [
            'Напишите в общем чате **не позднее чем за 3 часа** до начала урока.',
            'Перенос и отмена — **одно действие**, лимит общий.',
            'Менее чем за 3 часа или без предупреждения — урок **списывается**.',
            'Лимит исчерпан — урок проходит по расписанию, при отсутствии студента сгорает.',
            'Перенесённый урок проводится в пределах срока абонемента.',
          ],
        },
      ],
    },
    {
      id: 'late',
      title: 'Опоздание',
      blocks: [
        {
          type: 'split',
          cols: [
            {
              h: 'Индивидуальный, абонемент, парное',
              items: [
                'Ждём студента **15 минут**. Подключился позже начала — занимается **оставшееся время**, урок не продлевается.',
                'Не зашёл за 15 минут, но написал, что может подключиться, — проводим **оставшееся время до конца**.',
                'Не пришёл и не написал — урок **сгорает**.',
              ],
            },
            {
              h: 'Групповой',
              items: [
                'Урок начинается по расписанию для всей группы.',
                'Опоздавший подключается к идущему уроку.',
                'Пропущенный урок **считается проведённым** и не восполняется.',
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'freeze',
      title: 'Заморозка',
      blocks: [
        {
          type: 'split',
          cols: [
            {
              h: 'Индивидуальный, абонемент, парное',
              items: [
                'Не более **7 дней** за абонемент.',
                'Только если в этом месяце **не было отмен**. Исключение — болезнь с медицинским заключением.',
                'Заранее предупредите **лично менеджера**. Задним числом не оформляется.',
                'Срок абонемента продлевается, уроки сохраняются.',
              ],
            },
            {
              h: 'Групповой',
              items: [
                'Группа **не будет ждать** студента.',
                'После заморозки вы продолжите обучение **с другой группой**.',
                'О заморозке заранее предупредите лично менеджера.',
              ],
            },
          ],
        },
        { type: 'note', tone: 'warn', text: '**Важно:** если после заморозки студент не выходит на связь и не посещает уроки, занятия по расписанию списываются на общих основаниях.' },
      ],
    },
    {
      id: 'burn',
      title: 'Когда сгорают уроки',
      blocks: [
        {
          type: 'split',
          cols: [
            {
              h: 'Урок сгорает, если:',
              items: [
                'урок отменён или перенесён **менее чем за 3 часа**;',
                'студент не пришёл и не зашёл в течение **15 минут**;',
                'студент пропустил **групповой урок**;',
                'лимит переносов и отмен исчерпан, а студент не пришёл по расписанию.',
              ],
            },
            {
              h: 'Абонемент сгорает, если:',
              items: [
                'истёк срок абонемента — неиспользованные уроки **аннулируются**;',
                'студент перестал посещать занятия без заморозки — срок продолжает идти.',
              ],
            },
          ],
        },
        { type: 'note', tone: 'bad', text: '**Важно:** сгоревшие уроки и остаток просроченного абонемента не возвращаются и не компенсируются.' },
      ],
    },
    {
      id: 'school',
      title: 'Перенос или отмена со стороны школы',
      blocks: [
        {
          type: 'list',
          items: [
            'Если урок отменяет или переносит преподаватель или школа, урок не списывается и не считается в лимит переносов студента.',
            'Школа предлагает новое удобное время либо урок с другим преподавателем.',
            'Смена преподавателя возможна по согласованию с менеджером, с учётом пожеланий студента.',
          ],
        },
      ],
    },
    {
      id: 'tech',
      title: 'Технические неполадки',
      blocks: [
        {
          type: 'list',
          items: [
            'Если урок не состоялся из-за неполадок на стороне платформы или преподавателя — урок переносится без списания.',
            'Если урок не состоялся из-за проблем на стороне студента (интернет, устройство, микрофон) — действуют общие правила отмены и неявки.',
          ],
        },
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
            { text: 'Перенос или отмена за 3 часа и более, в пределах лимита тарифа', result: 'Сохраняется', tone: 'ok' },
            { text: 'Лимит переносов и отмен исчерпан', result: 'Урок по расписанию', tone: 'warn' },
            { text: 'Перенос или отмена менее чем за 3 часа', result: 'Списывается', tone: 'bad' },
            { text: 'Пропуск группового урока', result: 'Считается проведённым', tone: 'bad' },
            { text: 'Опоздал или не зашёл за 15 минут, но написал', result: 'Оставшееся время', tone: 'warn' },
            { text: 'Не пришёл и не написал', result: 'Сгорает', tone: 'bad' },
            { text: 'Заморозка до 7 дней, без отмен в этом месяце', result: 'Срок продлевается, уроки сохраняются', tone: 'ok' },
            { text: 'Заморозка по болезни с медицинским заключением', result: 'Доступна', tone: 'ok' },
            { text: 'Заморозка в групповом курсе', result: 'Обучение с другой группой', tone: 'warn' },
            { text: 'Истёк срок абонемента', result: 'Уроки аннулируются', tone: 'bad' },
          ],
        },
      ],
    },
  ],
  closing: {
    title: 'Вместе к вашему результату',
    items: [
      'Сообщайте о переносе или отмене минимум за 3 часа, в общем чате.',
      'Приходите на уроки вовремя: каждая минута работает на ваш результат.',
      'В группе держите общий темп — так результат будет у всех.',
      'Планируйте заморозку заранее и предупреждайте менеджера лично.',
    ],
    sign: 'С заботой о вашем результате, команда Just to Study',
  },
  footer: 'По всем вопросам обращайтесь к вашему ответственному менеджеру · Just to Study',
}

const kk = {
  tag: 'Студенттер үшін',
  title: 'JTS оқу ережелері',
  lead: 'Мұғалімді тағайындау, бонустар, ақшаны қайтару, сабақты ауыстыру және болдырмау, кешігу және мұздату. Сабақтар басталмас бұрын ережелермен танысып шығыңыз.',
  stats: [
    { num: '3 сағат', label: 'сабақ басталғанға дейін кемінде — оны ауыстыру немесе болдырмау үшін' },
    { num: '3–4 рет', label: 'айына — тарифке қарай ауыстыру мен болдырмау лимиті' },
    { num: '7 күн', label: 'бір абонементке мұздатудың ең ұзақ мерзімі' },
    { num: '15 минут', label: 'студентті күтеміз — содан кейін сабақ күйіп кетеді' },
  ],
  toc: 'Мазмұны',
  offer: 'Жария оферта',
  sections: [
    {
      id: 'general',
      title: 'Жалпы ережелер',
      blocks: [
        { type: 'sub', text: 'Платформа және формат' },
        { type: 'p', text: 'Оқу мектептің өз платформасында **жеке**, **жұптық** немесе **топтық** форматта өтеді. Сабақ тарифке қарай **30, 60 немесе 90 минутқа** созылады. Кесте мен сабақтар саны — жеке кабинетте.' },
        { type: 'sub', text: 'Ортақ чат' },
        { type: 'p', text: 'Барлық байланыс студент, мұғалім және менеджер бар **ортақ чатта** жүргізіледі. Ауызша, телефонмен немесе басқа мессенджерлерде жасалған келісімдер есепке алынбайды. Тек менеджерге немесе тек мұғалімге жеке хабарлама жіберу ауыстыруға немесе болдырмауға өтінім болып саналмайды.' },
        { type: 'note', tone: 'warn', text: '**Маңызды:** ережелердегі барлық уақыт кестедегі сабақтың басталу уақыты бойынша көрсетілген.' },
      ],
    },
    {
      id: 'teacher',
      title: 'Мұғалімді тағайындау',
      blocks: [
        { type: 'p', text: 'Мұғалімді сіздің жауапты менеджеріңіз таңдайды:' },
        {
          type: 'facts',
          items: [
            { k: 'Жеке курс', v: '1 күннен 3 күнге дейін' },
            { k: 'Топтық немесе жұптық курс', v: '3 күннен 10 күнге дейін' },
          ],
        },
      ],
    },
    {
      id: 'bonus',
      title: 'Бонустар',
      blocks: [
        {
          type: 'facts',
          items: [
            { k: '01', sub: 'Бонустық қосымшалар', d: 'Бонустық қосымшаларға кіру деректері **барлық студентке ортақ**.' },
            { k: '02', sub: 'SELF-STUDY', d: 'Кейбір тарифтерде SELF-STUDY бонусы бар: таңдалған деңгейдегі курс, мұғалімсіз өз бетіңізше жаттығуға арналған. Қашан және қай жерде ыңғайлы болса, сонда оқыңыз, кіру мүмкіндігі **3 ай** жарамды.' },
          ],
        },
        { type: 'note', tone: 'ok', text: 'Қосымшаның құпиясөзі сәйкес келмесе, жауапты менеджеріңізге жазыңыз — ол деректерді жаңартады.' },
      ],
    },
    {
      id: 'refund',
      title: 'Ақшаны қайтару',
      blocks: [
        {
          type: 'facts',
          items: [
            { v: '80%', sub: '{offer} бойынша қайтару', d: 'Онлайн оқуға қатысу ойыңыздан айныған болсаңыз, төлем/алдын ала төлем 80% мөлшерінде **14 жұмыс күні** ішінде қайтарылады.' },
            { v: '20%', sub: 'Не ұсталады', d: 'Сомадан 20% комиссия ұсталады және **өтілген сабақтардың құны** шегеріледі.' },
          ],
        },
        { type: 'note', tone: 'warn', text: '**Маңызды:** кез келген сұрақ бойынша жауапты менеджеріңізге жазыңыз — ол оқудың басынан аяғына дейін байланыста.' },
      ],
    },
    {
      id: 'manager',
      title: 'Менеджердің сүйемелдеуі',
      blocks: [
        { type: 'p', text: 'Әр студентке жауапты менеджер бекітіледі. Ол мезгіл-мезгіл кері байланыс сұрап, қалған сабақтар туралы еске салады — бұл барлығына бірдей әдеттегі тәртіп.' },
      ],
    },
    {
      id: 'reschedule',
      title: 'Ауыстыру және болдырмау',
      blocks: [
        { type: 'sub', text: 'Айына ауыстыру мен болдырмау лимиті — тарифке қарай' },
        {
          type: 'tariffs',
          items: [
            { id: 'sub', k: 'Абонемент', plans: 'General, Kids', v: '3 рет', d: 'айына ауыстыру мен болдырмау' },
            { id: 'ind', k: 'Жеке', plans: 'Premium, IELTS, Business, SAT', v: '4 рет', d: 'айына ауыстыру мен болдырмау' },
            { id: 'pair', k: 'Жұптық оқу', plans: 'Екі студент', v: '3 рет', d: 'айына ауыстыру мен болдырмау' },
            { id: 'group', none: true, k: 'Топтық', plans: 'Топ', v: 'Болмайды', d: 'сабақ бүкіл топ үшін кесте бойынша өтеді, жіберіп алған сабақ өткізілген болып саналады' },
          ],
        },
        { type: 'sub', text: 'Қалай ауыстыруға және болдырмауға болады' },
        {
          type: 'list',
          items: [
            'Сабақ басталуына **кемінде 3 сағат** қалғанда ортақ чатқа жазыңыз.',
            'Ауыстыру мен болдырмау — **бір әрекет**, лимит ортақ.',
            '3 сағаттан аз қалғанда немесе ескертусіз — сабақ **есептен шығарылады**.',
            'Лимит таусылса — сабақ кесте бойынша өтеді, студент келмесе, күйіп кетеді.',
            'Ауыстырылған сабақ абонемент мерзімі ішінде өткізіледі.',
          ],
        },
      ],
    },
    {
      id: 'late',
      title: 'Кешігу',
      blocks: [
        {
          type: 'split',
          cols: [
            {
              h: 'Жеке, абонемент, жұптық',
              items: [
                'Студентті **15 минут** күтеміз. Сабақ басталғаннан кейін қосылса — **қалған уақытта** оқиды, сабақ ұзартылмайды.',
                '15 минут ішінде кірмесе, бірақ қосыла алатынын жазса — **соңына дейін қалған уақытта** өткіземіз.',
                'Келмесе және жазбаса — сабақ **күйіп кетеді**.',
              ],
            },
            {
              h: 'Топтық',
              items: [
                'Сабақ бүкіл топ үшін кесте бойынша басталады.',
                'Кешіккен студент жүріп жатқан сабаққа қосылады.',
                'Жіберіп алған сабақ **өткізілген болып саналады** және толықтырылмайды.',
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'freeze',
      title: 'Мұздату',
      blocks: [
        {
          type: 'split',
          cols: [
            {
              h: 'Жеке, абонемент, жұптық',
              items: [
                'Бір абонементке **7 күннен** аспайды.',
                'Тек осы айда **болдырмау болмаса**. Ерекшелік — медициналық қорытындысы бар ауру.',
                '**Менеджердің өзіне** алдын ала ескертіңіз. Өткен күнмен рәсімделмейді.',
                'Абонемент мерзімі ұзартылады, сабақтар сақталады.',
              ],
            },
            {
              h: 'Топтық',
              items: [
                'Топ студентті **күтпейді**.',
                'Мұздатудан кейін оқуды **басқа топпен** жалғастырасыз.',
                'Мұздату туралы менеджердің өзіне алдын ала ескертіңіз.',
              ],
            },
          ],
        },
        { type: 'note', tone: 'warn', text: '**Маңызды:** мұздатудан кейін студент хабарласпаса және сабаққа келмесе, кестедегі сабақтар жалпы негізде есептен шығарылады.' },
      ],
    },
    {
      id: 'burn',
      title: 'Сабақтар қашан күйеді',
      blocks: [
        {
          type: 'split',
          cols: [
            {
              h: 'Сабақ күйіп кетеді, егер:',
              items: [
                'сабақ **3 сағаттан аз** уақыт қалғанда болдырылса немесе ауыстырылса;',
                'студент келмесе және **15 минут** ішінде кірмесе;',
                'студент **топтық сабақты** жіберіп алса;',
                'ауыстыру мен болдырмау лимиті таусылып, студент кесте бойынша келмесе.',
              ],
            },
            {
              h: 'Абонемент күйіп кетеді, егер:',
              items: [
                'абонемент мерзімі өтсе — пайдаланылмаған сабақтар **жойылады**;',
                'студент мұздатусыз сабаққа келуді тоқтатса — мерзім өте береді.',
              ],
            },
          ],
        },
        { type: 'note', tone: 'bad', text: '**Маңызды:** күйіп кеткен сабақтар мен мерзімі өткен абонементтің қалдығы қайтарылмайды және өтелмейді.' },
      ],
    },
    {
      id: 'school',
      title: 'Мектеп тарапынан ауыстыру немесе болдырмау',
      blocks: [
        {
          type: 'list',
          items: [
            'Сабақты мұғалім немесе мектеп болдырмаса не ауыстырса, сабақ есептен шығарылмайды және студенттің ауыстыру лимитіне кірмейді.',
            'Мектеп жаңа ыңғайлы уақыт немесе басқа мұғаліммен сабақ ұсынады.',
            'Мұғалімді ауыстыру студенттің тілегін ескере отырып, менеджермен келісім бойынша мүмкін.',
          ],
        },
      ],
    },
    {
      id: 'tech',
      title: 'Техникалық ақаулар',
      blocks: [
        {
          type: 'list',
          items: [
            'Сабақ платформа немесе мұғалім тарапындағы ақаулар салдарынан өтпесе — сабақ есептен шығарылмай ауыстырылады.',
            'Сабақ студент тарапындағы ақаулар (интернет, құрылғы, микрофон) салдарынан өтпесе — болдырмау мен келмей қалудың жалпы ережелері қолданылады.',
          ],
        },
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
            { text: '3 сағат және одан көп бұрын, тариф лимиті шегінде ауыстыру немесе болдырмау', result: 'Сақталады', tone: 'ok' },
            { text: 'Ауыстыру мен болдырмау лимиті таусылды', result: 'Сабақ кесте бойынша', tone: 'warn' },
            { text: '3 сағаттан аз қалғанда ауыстыру немесе болдырмау', result: 'Есептен шығарылады', tone: 'bad' },
            { text: 'Топтық сабақты жіберіп алу', result: 'Өткізілген болып саналады', tone: 'bad' },
            { text: 'Кешікті немесе 15 минут ішінде кірмеді, бірақ жазды', result: 'Қалған уақыт', tone: 'warn' },
            { text: 'Келмеді және жазбады', result: 'Күйіп кетеді', tone: 'bad' },
            { text: 'Осы айда болдырмаусыз 7 күнге дейін мұздату', result: 'Мерзім ұзартылады, сабақтар сақталады', tone: 'ok' },
            { text: 'Медициналық қорытындымен ауруға байланысты мұздату', result: 'Қолжетімді', tone: 'ok' },
            { text: 'Топтық курста мұздату', result: 'Басқа топпен оқу', tone: 'warn' },
            { text: 'Абонемент мерзімі өтті', result: 'Сабақтар жойылады', tone: 'bad' },
          ],
        },
      ],
    },
  ],
  closing: {
    title: 'Нәтижеңізге бірге',
    items: [
      'Ауыстыру немесе болдырмау туралы кемінде 3 сағат бұрын, ортақ чатта хабарлаңыз.',
      'Сабаққа уақытында келіңіз: әр минут сіздің нәтижеңіз үшін жұмыс істейді.',
      'Топта ортақ қарқынды ұстаңыз — сонда нәтиже барлығында болады.',
      'Мұздатуды алдын ала жоспарлап, менеджердің өзіне ескертіңіз.',
    ],
    sign: 'Нәтижеңізге қамқорлықпен, Just to Study командасы',
  },
  footer: 'Барлық сұрақ бойынша жауапты менеджеріңізге хабарласыңыз · Just to Study',
}

const en = {
  tag: 'For students',
  title: 'JTS study rules',
  lead: 'Teacher assignment, bonuses, refunds, rescheduling and cancelling lessons, lateness and freezes. Please read the rules before your classes start.',
  stats: [
    { num: '3 hours', label: 'minimum notice before a lesson to reschedule or cancel it' },
    { num: '3–4 times', label: 'a month — the reschedule and cancellation limit, depending on your plan' },
    { num: '7 days', label: 'maximum freeze per package' },
    { num: '15 minutes', label: 'we wait for the student — then the lesson is forfeited' },
  ],
  toc: 'Contents',
  offer: 'Public Offer',
  sections: [
    {
      id: 'general',
      title: 'General',
      blocks: [
        { type: 'sub', text: 'Platform and format' },
        { type: 'p', text: 'Classes take place on the school’s own platform in an **individual**, **pair** or **group** format. Lessons last **30, 60 or 90 minutes**, depending on your plan. Your schedule and number of lessons are in your personal account.' },
        { type: 'sub', text: 'Shared chat' },
        { type: 'p', text: 'All communication takes place in a **shared chat** with the student, the teacher and the manager. Agreements made verbally, by phone or in other messengers are not taken into account. A private message to only the manager or only the teacher does not count as a request to reschedule or cancel.' },
        { type: 'note', tone: 'warn', text: '**Important:** all times in these rules refer to the lesson start time in the schedule.' },
      ],
    },
    {
      id: 'teacher',
      title: 'Teacher assignment',
      blocks: [
        { type: 'p', text: 'Your dedicated manager selects your teacher:' },
        {
          type: 'facts',
          items: [
            { k: 'Individual course', v: '1 to 3 days' },
            { k: 'Group or pair course', v: '3 to 10 days' },
          ],
        },
      ],
    },
    {
      id: 'bonus',
      title: 'Bonuses',
      blocks: [
        {
          type: 'facts',
          items: [
            { k: '01', sub: 'Bonus apps', d: 'Access to the bonus apps is **shared by all students**.' },
            { k: '02', sub: 'SELF-STUDY', d: 'Some plans include a SELF-STUDY bonus: a course at your chosen level for independent practice without a teacher. Study whenever and wherever suits you; access is valid for **3 months**.' },
          ],
        },
        { type: 'note', tone: 'ok', text: 'If the app password doesn’t work, message your dedicated manager — they will update your details.' },
      ],
    },
    {
      id: 'refund',
      title: 'Refunds',
      blocks: [
        {
          type: 'facts',
          items: [
            { v: '80%', sub: 'Refund under the {offer}', d: 'If you change your mind about online learning, your payment or prepayment is refunded at 80% within **14 business days**.' },
            { v: '20%', sub: 'What is withheld', d: 'A 20% fee is withheld and **the cost of lessons already taken** is deducted.' },
          ],
        },
        { type: 'note', tone: 'warn', text: '**Important:** for any questions, message your dedicated manager — they are in touch throughout your studies.' },
      ],
    },
    {
      id: 'manager',
      title: 'Manager support',
      blocks: [
        { type: 'p', text: 'Every student has a dedicated manager. They periodically ask for feedback and remind you of your remaining lessons — this is a standard routine, the same for everyone.' },
      ],
    },
    {
      id: 'reschedule',
      title: 'Rescheduling and cancellation',
      blocks: [
        { type: 'sub', text: 'Monthly reschedule and cancellation limit — by plan' },
        {
          type: 'tariffs',
          items: [
            { id: 'sub', k: 'Package', plans: 'General, Kids', v: '3 times', d: 'reschedules and cancellations a month' },
            { id: 'ind', k: 'Individual', plans: 'Premium, IELTS, Business, SAT', v: '4 times', d: 'reschedules and cancellations a month' },
            { id: 'pair', k: 'Pair lessons', plans: 'Two students', v: '3 times', d: 'reschedules and cancellations a month' },
            { id: 'group', none: true, k: 'Group', plans: 'Group', v: 'Not allowed', d: 'the lesson goes ahead for the whole group as scheduled; a missed lesson counts as held' },
          ],
        },
        { type: 'sub', text: 'How to reschedule or cancel' },
        {
          type: 'list',
          items: [
            'Write in the shared chat **at least 3 hours** before the lesson starts.',
            'Rescheduling and cancelling are **one action** with a shared limit.',
            'Less than 3 hours ahead or without notice — the lesson is **deducted**.',
            'Limit used up — the lesson goes ahead as scheduled and is forfeited if the student is absent.',
            'A rescheduled lesson takes place within the package period.',
          ],
        },
      ],
    },
    {
      id: 'late',
      title: 'Lateness',
      blocks: [
        {
          type: 'split',
          cols: [
            {
              h: 'Individual, package, pair',
              items: [
                'We wait **15 minutes** for the student. Joined after the start — you study for **the remaining time**; the lesson is not extended.',
                'Didn’t join within 15 minutes but wrote that you can connect — we hold **the remaining time until the end**.',
                'Didn’t come and didn’t write — the lesson is **forfeited**.',
              ],
            },
            {
              h: 'Group',
              items: [
                'The lesson starts on schedule for the whole group.',
                'A late student joins the lesson in progress.',
                'A missed lesson **counts as held** and is not made up.',
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'freeze',
      title: 'Freeze',
      blocks: [
        {
          type: 'split',
          cols: [
            {
              h: 'Individual, package, pair',
              items: [
                'No more than **7 days** per package.',
                'Only if there were **no cancellations** this month. Exception — illness with a medical certificate.',
                'Tell **your manager personally** in advance. Freezes cannot be backdated.',
                'The package period is extended and your lessons are kept.',
              ],
            },
            {
              h: 'Group',
              items: [
                'The group **will not wait** for the student.',
                'After the freeze you continue studying **with another group**.',
                'Tell your manager personally about the freeze in advance.',
              ],
            },
          ],
        },
        { type: 'note', tone: 'warn', text: '**Important:** if after a freeze the student does not get in touch or attend lessons, scheduled lessons are deducted as usual.' },
      ],
    },
    {
      id: 'burn',
      title: 'When lessons are forfeited',
      blocks: [
        {
          type: 'split',
          cols: [
            {
              h: 'A lesson is forfeited if:',
              items: [
                'it is cancelled or rescheduled **less than 3 hours** ahead;',
                'the student did not come and did not join within **15 minutes**;',
                'the student missed a **group lesson**;',
                'the limit is used up and the student did not attend as scheduled.',
              ],
            },
            {
              h: 'A package is forfeited if:',
              items: [
                'the package period has ended — unused lessons are **cancelled**;',
                'the student stopped attending without a freeze — the period keeps running.',
              ],
            },
          ],
        },
        { type: 'note', tone: 'bad', text: '**Important:** forfeited lessons and the balance of an expired package are not refunded or compensated.' },
      ],
    },
    {
      id: 'school',
      title: 'Rescheduling or cancellation by the school',
      blocks: [
        {
          type: 'list',
          items: [
            'If a lesson is cancelled or rescheduled by the teacher or the school, it is not deducted and does not count toward the student’s reschedule limit.',
            'The school offers a new convenient time or a lesson with another teacher.',
            'Changing the teacher is possible by agreement with the manager, taking the student’s wishes into account.',
          ],
        },
      ],
    },
    {
      id: 'tech',
      title: 'Technical problems',
      blocks: [
        {
          type: 'list',
          items: [
            'If a lesson did not take place because of problems on the platform’s or the teacher’s side, it is rescheduled without being deducted.',
            'If a lesson did not take place because of problems on the student’s side (internet, device, microphone), the general cancellation and no-show rules apply.',
          ],
        },
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
            { text: 'Rescheduling or cancelling 3 or more hours ahead, within your plan’s limit', result: 'Kept', tone: 'ok' },
            { text: 'Reschedule and cancellation limit used up', result: 'Lesson as scheduled', tone: 'warn' },
            { text: 'Rescheduling or cancelling less than 3 hours ahead', result: 'Deducted', tone: 'bad' },
            { text: 'Missing a group lesson', result: 'Counts as held', tone: 'bad' },
            { text: 'Late or didn’t join within 15 minutes, but wrote', result: 'Remaining time', tone: 'warn' },
            { text: 'Didn’t come and didn’t write', result: 'Forfeited', tone: 'bad' },
            { text: 'Freeze of up to 7 days, no cancellations this month', result: 'Period extended, lessons kept', tone: 'ok' },
            { text: 'Sick-leave freeze with a medical certificate', result: 'Available', tone: 'ok' },
            { text: 'Freeze in a group course', result: 'Continue with another group', tone: 'warn' },
            { text: 'Package period has ended', result: 'Lessons cancelled', tone: 'bad' },
          ],
        },
      ],
    },
  ],
  closing: {
    title: 'Together toward your result',
    items: [
      'Report a reschedule or cancellation at least 3 hours ahead, in the shared chat.',
      'Come to lessons on time: every minute works toward your result.',
      'In a group, keep the shared pace — that way everyone gets results.',
      'Plan a freeze in advance and tell your manager personally.',
    ],
    sign: 'With care for your result, the Just to Study team',
  },
  footer: 'For any questions, contact your dedicated manager · Just to Study',
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

// Все тексты блока — для теста цифр и выделения у переводов.
export function blockTexts(block) {
  switch (block.type) {
    case 'list': return block.items
    case 'table': return block.rows.map((row) => row.text)
    case 'facts': return block.items.flatMap((f) => [f.k, f.v, f.sub, f.d].filter(Boolean))
    case 'tariffs': return block.items.flatMap((t) => [t.v, t.d])
    case 'split': return block.cols.flatMap((col) => [col.h, ...col.items])
    default: return [block.text]
  }
}
