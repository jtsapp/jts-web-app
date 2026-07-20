// Словарь интерфейса раздела «Тьютор». Ключи одинаковые для всех языков.
// {name}, {level}, {title}, {done}, {total} — подстановки через t(key, vars).
// Собственные имена тьюторов (Луна/Декстер/Спарк) и грамматические термины
// (Present Continious, Job Interview) намеренно не переводятся.
export const LANGS = ['kz', 'ru', 'en']
export const DEFAULT_LANG = 'ru'

export const DICT = {
  ru: {
    // Общее / навигация / оболочка
    'nav.learn': 'Обучение',
    'nav.practice': 'Практика',
    'nav.tutor': 'Тьютор',
    'nav.lessons': 'Уроки',
    'sidebar.profile': 'Профиль',
    'shell.back': 'Назад',
    'common.back': 'Назад',
    'kingdom.title': 'Королевство {name}',
    'kingdom.levelBadge': 'Уровень {label}',
    'kingdom.empty': 'Пока нет уроков',
    'role.tutor': 'Тьютор',
    'footer.privacy': 'Политика конфиденциальности',
    'footer.copy': '© Все права защищены',
    'common.continue': 'Продолжить',

    // Welcome
    'welcome.title': 'Добро пожаловать\nна обучение с твоим\nличным тьютором',
    'welcome.sub':
      'Здесь мы будем закреплять пройденное и болтать вживую — без учебников и зубрёжки',

    // Выбор языка
    'lang.title': 'Первым делом,\nвыбери язык\nразговора с тьютором',

    // Выбор тьютора
    'choose.title': 'Теперь необходимо выбрать себе тьютора',
    'choose.langUi': 'Язык интерфейса',
    'choose.langExplain': 'Язык объяснения',
    'tutor.luna.trait1': 'Нежная',
    'tutor.luna.trait2': 'Чуткая',
    'tutor.luna.trait3': 'Спокойная',
    'tutor.luna.desc':
      'Нежная мечтательница. Витает в облаках, видит красоту во всём, вдохновляет фантазировать. Мягкая, чуткая, поддерживает любую безумную идею.',
    'tutor.luna.listen': 'Послушать голос Луны',
    'tutor.luna.choose': 'Выбрать Луну',
    'tutor.dexter.trait1': 'Добрый',
    'tutor.dexter.trait2': 'Умный',
    'tutor.dexter.trait3': 'Тёплый',
    'tutor.dexter.desc':
      'Тёплый и любопытный гик-друг. Обожает учиться и делиться знаниями, но без занудства. Не строгий учитель, а заряжающий энтузиазмом товарищ, который превращает учёбу в приключение.',
    'tutor.dexter.listen': 'Послушать голос Декстера',
    'tutor.dexter.choose': 'Выбрать Декстера',
    'tutor.spark.trait1': 'Казахскоязычный',
    'tutor.spark.trait2': 'Энергичный',
    'tutor.spark.trait3': 'Свой',
    'tutor.spark.desc':
      'Тьютор специально для казахской аудитории. Объясняет по-казахски и свободно переключается между казахским и английским. Энергичный и свой в доску — подаёт английский через понятные примеры и заряжает «алға, сен істейсің!». С ним английский учится на родном языке.',
    'tutor.spark.listen': 'Послушать голос Спарка',
    'tutor.spark.choose': 'Выбрать Спарка',

    // Загрузка
    'loading.heading': '{name} собирает\nтебе обучение...',

    // Предложение теста уровня
    'offer.heading': '{name} подстраивается\nпод твой уровень...',
    'offer.title': '{name} не знает твоего уровня',
    'offer.sub': 'Это необходимо чтобы построить тебе обучение, под твои нужды',
    'offer.cta': 'Пройти короткий тест',
    'offer.ctaTime': '~3 минуты',
    'offer.later': 'Сдать тест позже',

    // Голосовое интро
    'voiceIntro.heading': '{name} хочет узнать твой уровень\nразговорного английского',
    'voiceIntro.start': 'Пройти короткий тест',
    'voiceIntro.decline': 'Не могу говорить сейчас',
    'voiceIntro.hint': 'Разговор на 3 минуты, чтобы понять твой разговорный уровень',
    'placeTest.heading': 'Ответь на задание — я определю твой уровень',
    'placeTest.hint':
      'Говори 2–3 минуты по-английски. Время не ограничено — заверши, когда будешь готов.',
    'placeTest.start': 'Начать запись',
    'placeTest.listen': 'Прослушать задание',
    'placeTest.recordingHeading': 'Идёт запись — говори',
    'placeTest.stop': 'Закончить и оценить',
    'placeTest.processing': 'Слушаю и определяю твой уровень…',
    'placeTest.retry': 'Записать заново',
    'placeTest.cancel': 'Не сейчас',
    'placeTest.errMic': 'Микрофон недоступен. Разреши доступ в браузере и попробуй снова.',
    'placeTest.errRecognize': 'Не удалось распознать речь. Проверь микрофон и попробуй снова.',
    'placeTest.errGrade': 'Не получилось определить уровень. Попробуй ещё раз.',
    'placeTest.errUnsupported': 'Запись с микрофона не поддерживается в этом браузере.',

    // Голосовой чат
    'voice.micOn': 'Выключить микрофон',
    'voice.micOff': 'Включить микрофон',
    'voice.permAllow': 'Разрешить, когда я на сайте',
    'voice.permHint': 'Дайте разрешение на использование микрофона в браузере',
    'voice.permDenied':
      'Доступ к микрофону запрещён. Разрешите его в настройках браузера и обновите страницу.',
    'voice.prompt': 'О чём хочешь поговорить со мной?',
    'voice.connecting': 'Соединяю с тьютором…',
    'voice.waiting': 'Ждём тьютора…',
    'voice.micDenied':
      'Доступ к микрофону запрещён. Разрешите его в настройках браузера и попробуйте снова.',
    'voice.unavailable': 'Голосовой режим временно недоступен. Попробуйте позже.',
    'voice.expired': 'Сессия истекла. Войдите заново, чтобы продолжить разговор.',
    'voice.limitDaily':
      'На сегодня лимит разговора исчерпан (10 минут в день на бесплатном тарифе). Возвращайся завтра!',
    'voice.limitMonthly':
      'Месячный лимит разговора исчерпан (300 минут). Лимит обновится в начале следующего месяца.',

    // Результат уровня
    'result.heading': 'Отлично!\nТвой уровень разговорного\nанглийского',
    'result.retry': 'Попробовать пройти тест снова',

    // Интересы
    'interests.heading': '{name} хочет узнать чем\nты увлекаешься',
    'interests.sub': 'Выбери интересные тебе темы',
    'interests.topic.code': '💻 Программирование',
    'interests.topic.football': '⚽️ Футбол',
    'interests.topic.sport': '🥏 Спорт',
    'interests.topic.psy': '🧠 Психология',
    'interests.topic.games': '🎮 Видеоигры',
    'interests.topic.esport': '🧌 Киберспорт',
    'interests.topic.art': '🎨 Искусство',
    'interests.topic.politics': '👨🏼‍⚖️ Политика',
    'interests.topic.movies': '🎥 Фильмы и сериалы',
    'interests.topic.fashion': '👔 Мода и стиль',

    // Профессия
    'prof.heading': '{name} хочет узнать кем ты\nработаешь, или на кого учишься',
    'prof.placeholder': 'Рассказать тут ...',
    'prof.or': 'Или выберите',
    'prof.skip': 'Пропустить вопрос',
    'prof.opt.it': 'IT/Разработка',
    'prof.opt.management': 'Менеджмент',
    'prof.opt.marketing': 'Маркетинг',
    'prof.opt.logist': 'Логист',
    'prof.opt.design': 'Дизайн',
    'prof.opt.actor': 'Актёр',

    // Анализ
    'analysis.heading': '{name} заканчивает\nс вашим анализом',
    'analysis.step.tutor': 'Сохраняем тьютора',
    'analysis.step.interests': 'Учитываем интересы',
    'analysis.step.profession': 'Думаем о твоей профессии',
    'analysis.step.level': 'Подстраиваемся под твой уровень',

    // Дашборд
    'dash.level': 'Уровень {level}',
    'dash.manage': 'Управление тьютором',
    'dash.ctaTitle': 'Нажмите, чтобы\nпоболтать с тьютором',
    'dash.suggestLabel': 'Советуем сегодня:',
    'dash.lessonsTitle': 'План уроков',
    'dash.seeAll': 'Посмотреть все',
    'dash.progress': '{done} из {total} пройдено',
    'dash.scenariosTitle': 'Сценарии',
    'dash.scenariosSub':
      'Протестируй свой Speaking в разных ситуациях, и получи личный разбор от тьютора',

    // Онбординг-тур
    'tour.skip': 'Пропустить',
    'tour.next': 'ОК',
    'tour.done': 'Готово',
    'tour.mic.title': 'Поговори с тьютором',
    'tour.mic.text':
      'Нажми на микрофон и общайся с тьютором голосом — как с живым собеседником.',
    'tour.plan.title': 'Твой план урока',
    'tour.plan.text':
      'Здесь тьютор собирает уроки под твой уровень. Отмечай пройденное и следи за прогрессом.',
    'tour.scenarios.title': 'Ролевые сценарии',
    'tour.scenarios.text':
      'Попробуй себя в реальных ситуациях — собеседование, разговор о семье и другое.',

    // Управление тьютором
    'manage.title': 'Управление тьютором',
    'manage.change': 'Поменять тьютора',
    'manage.history': 'История разговоров',
    'manage.historyEmpty': 'Здесь появится история ваших разговоров с тьютором',

    // Аналитика ошибок
    'erran.title': 'Аналитика ошибок в разговоре',
    'erran.by': 'Аналитику провёл ваш тьютор:',
    'erran.toPlan': 'Вернуться к плану уроков',
    'erran.retry': 'Попробовать ещё раз',

    // Сценарии
    'scen.title': 'Сценарии',
    'scen.heading':
      'Протестируй свой Speaking в разных ситуациях,\nи получи личный разбор ошибок от тьютора',
    'scen.adminHeading': 'Ещё сценарии',
    // По ключу на сценарий: 'scen.desc.<scenarioId>'.
    'scen.desc.visa-interview':
      'собеседование в посольстве США: визовый офицер, каверзные вопросы и вердикт в конце',
    'scen.desc.hotel-check-in':
      'заселение в отель: бронь, накладка с номером и вежливые просьбы на английском',
    'scen.desc.asking-directions':
      'спрашиваем дорогу у прохожего: предлоги места, ориентиры и пересказ маршрута',
    'scen.desc.ordering-coffee':
      'заказ в кофейне в час пик: вежливые формулировки, уточнения и исправление ошибки бариста',
    'scen.desc.job-interview':
      'практикуем собеседование на английском: рассказ о себе, вопросы рекрутёру и ответы на них',
    'scen.desc.household-store':
      'закупка для новой квартиры: как объяснить предмет, название которого не знаешь',
    'scen.desc.doctors-office':
      'приём у врача: описываем симптомы точно — ache, pain, hurt, sore — и говорим о длительности',
    'scen.start': 'Начать разговор',
    'scen.locked': 'Откроется, когда пройдёшь «{label}» — это следующий шаг истории',
    'scen.lockedBtn': 'Закрыто',
    'scen.verdictPass': 'Задача пройдена',
    'scen.verdictFail': 'Задача не пройдена',
    'scen.verdictDone': 'Готово',

    // План уроков
    'plan.title': 'План уроков',
    'plan.progress': '{done} из {total} пройдено',
    'plan.desc':
      'Разберём, как строится форма am/is/are + глагол с -ing, когда её использовать, а когда нет',

    // Результат практики
    'pract.headingFail': 'Нужно улучшить\nрезультат',
    'pract.headingPass': 'Отличный\nрезультат',
    'pract.subFail': '{title} — не пройдено',
    'pract.subPass': '{title} — пройден',
    'pract.stat.grammar': 'Грамматика речи',
    'pract.stat.accent': 'Акцент',
    'pract.stat.lesson': 'Результат урока',
    'pract.analytics': 'Аналитика ошибок',
    'pract.retry': 'Попробовать ещё раз',
    'pract.toPlan': 'Перейти к плану уроков',
  },

  kz: {
    'nav.learn': 'Оқыту',
    'nav.practice': 'Практика',
    'nav.tutor': 'Тьютор',
    'nav.lessons': 'Сабақтар',
    'sidebar.profile': 'Профиль',
    'shell.back': 'Артқа',
    'common.back': 'Артқа',
    'kingdom.title': '{name} корольдігі',
    'kingdom.levelBadge': '{label} деңгейі',
    'kingdom.empty': 'Әзірше сабақтар жоқ',
    'role.tutor': 'Тьютор',
    'footer.privacy': 'Құпиялылық саясаты',
    'footer.copy': '© Барлық құқықтар қорғалған',
    'common.continue': 'Жалғастыру',

    'welcome.title': 'Жеке тьюторыңмен\nоқуға қош\nкелдің',
    'welcome.sub':
      'Мұнда өткенді бекітіп, оқулықсыз әрі жаттаусыз тірі сөйлесеміз',

    'lang.title': 'Ең алдымен,\nтьютормен сөйлесу\nтілін таңда',

    'choose.title': 'Енді өзіңе тьютор таңдау керек',
    'choose.langUi': 'Интерфейс тілі',
    'choose.langExplain': 'Түсіндіру тілі',
    'tutor.luna.trait1': 'Нәзік',
    'tutor.luna.trait2': 'Сезімтал',
    'tutor.luna.trait3': 'Байсалды',
    'tutor.luna.desc':
      'Нәзік армандаушы. Бұлтта қалықтайды, бәрінен сұлулық көреді, қиялдауға шабыттандырады. Жұмсақ, сезімтал, кез келген батыл идеяны қолдайды.',
    'tutor.luna.listen': 'Луна дауысын тыңдау',
    'tutor.luna.choose': 'Луна таңдау',
    'tutor.dexter.trait1': 'Мейірімді',
    'tutor.dexter.trait2': 'Ақылды',
    'tutor.dexter.trait3': 'Жылы',
    'tutor.dexter.desc':
      'Жылы әрі қызығушыл гик-дос. Оқуды және білім бөлісуді жақсы көреді, бірақ жалықтырмайды. Қатал ұстаз емес, оқуды шытырман оқиғаға айналдыратын жігерлі жолдас.',
    'tutor.dexter.listen': 'Декстер дауысын тыңдау',
    'tutor.dexter.choose': 'Декстер таңдау',
    'tutor.spark.trait1': 'Қазақша',
    'tutor.spark.trait2': 'Жігерлі',
    'tutor.spark.trait3': 'Өзіміздікі',
    'tutor.spark.desc':
      'Қазақ аудиториясына арнайы жасалған тьютор. Ағылшынды қазақша түсіндіреді, қазақша мен ағылшынның арасында еркін ауысады. Жігерлі әрі өзіміздікі — ағылшынды таныс мысалдармен береді және «алға, сен істейсің!» деп жігерлендіреді. Онымен ағылшын ана тіліңде үйреніледі.',
    'tutor.spark.listen': 'Спарк дауысын тыңдау',
    'tutor.spark.choose': 'Спарк таңдау',

    'loading.heading': '{name} саған оқу\nжинап жатыр...',

    'offer.heading': '{name} сенің деңгейіңе\nбейімделіп жатыр...',
    'offer.title': '{name} сенің деңгейіңді білмейді',
    'offer.sub': 'Бұл сенің қажеттіліктеріңе сай оқу құру үшін керек',
    'offer.cta': 'Қысқа тест тапсыру',
    'offer.ctaTime': '~3 минут',
    'offer.later': 'Тестті кейінірек тапсыру',

    'voiceIntro.heading': '{name} сенің ауызша ағылшын\nдеңгейіңді білгісі келеді',
    'voiceIntro.start': 'Қысқа тест тапсыру',
    'voiceIntro.decline': 'Қазір сөйлей алмаймын',
    'voiceIntro.hint': 'Ауызша деңгейіңді түсіну үшін 3 минуттық әңгіме',
    'placeTest.heading': 'Тапсырманы орында — деңгейіңді анықтаймын',
    'placeTest.hint':
      'Ағылшынша 2–3 минут сөйле. Уақыт шектелмеген — дайын болғанда аяқта.',
    'placeTest.start': 'Жазуды бастау',
    'placeTest.listen': 'Тапсырманы тыңдау',
    'placeTest.recordingHeading': 'Жазылып жатыр — сөйле',
    'placeTest.stop': 'Аяқтап, бағалау',
    'placeTest.processing': 'Тыңдап, деңгейіңді анықтап жатырмын…',
    'placeTest.retry': 'Қайта жазу',
    'placeTest.cancel': 'Қазір емес',
    'placeTest.errMic': 'Микрофон қолжетімсіз. Браузерде рұқсат беріп, қайта көр.',
    'placeTest.errRecognize': 'Сөйлеу танылмады. Микрофонды тексеріп, қайта көр.',
    'placeTest.errGrade': 'Деңгейді анықтау мүмкін болмады. Қайта көр.',
    'placeTest.errUnsupported': 'Бұл браузерде микрофоннан жазу қолдау таппайды.',

    'voice.micOn': 'Микрофонды өшіру',
    'voice.micOff': 'Микрофонды қосу',
    'voice.permAllow': 'Сайтта болғанда рұқсат ету',
    'voice.permHint': 'Браузерде микрофонды пайдалануға рұқсат беріңіз',
    'voice.permDenied':
      'Микрофонға қолжетімділік бұғатталған. Оны браузер баптауларынан рұқсат етіп, бетті жаңартыңыз.',
    'voice.prompt': 'Немен туралы сөйлескің келеді?',
    'voice.connecting': 'Тьюторға қосылудамын…',
    'voice.waiting': 'Тьюторды күтудеміз…',
    'voice.micDenied':
      'Микрофонға қолжетімділік бұғатталған. Оны браузер баптауларынан рұқсат етіп, қайта көріңіз.',
    'voice.unavailable': 'Дауыстық режим уақытша қолжетімсіз. Кейінірек көріңіз.',
    'voice.expired': 'Сессия аяқталды. Әңгімені жалғастыру үшін қайта кіріңіз.',
    'voice.limitDaily':
      'Бүгінгі әңгіме лимиті бітті (тегін тарифте күніне 10 минут). Ертең қайта келіңіз!',
    'voice.limitMonthly':
      'Айлық лимит бітті (300 минут). Лимит келесі айдың басында жаңарады.',

    'result.heading': 'Тамаша!\nСенің ауызша ағылшын\nдеңгейің',
    'result.retry': 'Тестті қайта тапсырып көру',

    'interests.heading': '{name} немен айналысатыныңды\nбілгісі келеді',
    'interests.sub': 'Өзіңе қызық тақырыптарды таңда',
    'interests.topic.code': '💻 Бағдарламалау',
    'interests.topic.football': '⚽️ Футбол',
    'interests.topic.sport': '🥏 Спорт',
    'interests.topic.psy': '🧠 Психология',
    'interests.topic.games': '🎮 Видеоойындар',
    'interests.topic.esport': '🧌 Киберспорт',
    'interests.topic.art': '🎨 Өнер',
    'interests.topic.politics': '👨🏼‍⚖️ Саясат',
    'interests.topic.movies': '🎥 Фильмдер мен сериалдар',
    'interests.topic.fashion': '👔 Сән және стиль',

    'prof.heading': '{name} кім болып жұмыс істейтініңді\nнемесе оқитыныңды білгісі келеді',
    'prof.placeholder': 'Осы жерде айт ...',
    'prof.or': 'Немесе таңда',
    'prof.skip': 'Сұрақты өткізіп жіберу',
    'prof.opt.it': 'IT/Әзірлеу',
    'prof.opt.management': 'Менеджмент',
    'prof.opt.marketing': 'Маркетинг',
    'prof.opt.logist': 'Логист',
    'prof.opt.design': 'Дизайн',
    'prof.opt.actor': 'Актёр',

    'analysis.heading': '{name} талдауыңды\nаяқтап жатыр',
    'analysis.step.tutor': 'Тьюторды сақтаймыз',
    'analysis.step.interests': 'Қызығушылықтарды ескереміз',
    'analysis.step.profession': 'Мамандығың туралы ойлаймыз',
    'analysis.step.level': 'Деңгейіңе бейімделеміз',

    'dash.level': 'Деңгей {level}',
    'dash.manage': 'Тьюторды басқару',
    'dash.ctaTitle': 'Тьютормен сөйлесу\nүшін басыңыз',
    'dash.suggestLabel': 'Бүгін кеңес береміз:',
    'dash.lessonsTitle': 'Сабақ жоспары',
    'dash.seeAll': 'Барлығын көру',
    'dash.progress': '{total}-тен {done} өтілді',
    'dash.scenariosTitle': 'Сценарийлер',
    'dash.scenariosSub':
      'Speaking-іңді әртүрлі жағдайда сынап, тьютордан жеке талдау ал',

    // Онбординг-тур
    'tour.skip': 'Өткізу',
    'tour.next': 'ОК',
    'tour.done': 'Дайын',
    'tour.mic.title': 'Тьютормен сөйлес',
    'tour.mic.text':
      'Микрофонды бас та, тьютормен дауыспен сөйлес — тірі әңгімелесушідей.',
    'tour.plan.title': 'Сабақ жоспарың',
    'tour.plan.text':
      'Мұнда тьютор деңгейіңе сай сабақтар жинайды. Өткеніңді белгілеп, прогресті қадағала.',
    'tour.scenarios.title': 'Рөлдік сценарийлер',
    'tour.scenarios.text':
      'Нақты жағдайларда өзіңді сына — сұхбат, отбасы туралы әңгіме және т.б.',

    'manage.title': 'Тьюторды басқару',
    'manage.change': 'Тьюторды ауыстыру',
    'manage.history': 'Әңгімелер тарихы',
    'manage.historyEmpty': 'Мұнда тьютормен әңгімелеріңіздің тарихы пайда болады',

    'erran.title': 'Әңгімедегі қателер талдауы',
    'erran.by': 'Талдауды тьюторың жасады:',
    'erran.toPlan': 'Сабақ жоспарына оралу',
    'erran.retry': 'Қайта тырысып көру',

    'scen.title': 'Сценарийлер',
    'scen.heading':
      'Speaking-іңді әртүрлі жағдайда сынап,\nтьютордан қателердің жеке талдауын ал',
    'scen.adminHeading': 'Тағы сценарийлер',
    'scen.desc.visa-interview':
      'АҚШ елшілігіндегі сұхбат: виза офицері, қитұрқы сұрақтар және соңында шешім',
    'scen.desc.hotel-check-in':
      'қонақүйге тіркелу: брондау, нөмірмен шатасу және ағылшынша сыпайы өтініштер',
    'scen.desc.asking-directions':
      'жолды сұраймыз: орын предлогтары, бағдарлар және маршрутты қайталап айту',
    'scen.desc.ordering-coffee':
      'кофеханада тапсырыс: сыпайы тіркестер, нақтылау және бариста қатесін түзету',
    'scen.desc.job-interview':
      'ағылшынша сұхбатты жаттықтырамыз: өзің туралы әңгіме, рекрутёрге сұрақтар және оларға жауаптар',
    'scen.desc.household-store':
      'жаңа пәтерге керек-жарақ: атауын білмейтін затты қалай түсіндіру',
    'scen.desc.doctors-office':
      'дәрігер қабылдауы: симптомдарды дәл сипаттаймыз — ache, pain, hurt, sore — және ұзақтығы',
    'scen.start': 'Әңгімені бастау',
    'scen.locked': '«{label}» өткен соң ашылады — бұл әңгіменің келесі қадамы',
    'scen.lockedBtn': 'Жабық',
    'scen.verdictPass': 'Тапсырма орындалды',
    'scen.verdictFail': 'Тапсырма орындалмады',
    'scen.verdictDone': 'Дайын',

    'plan.title': 'Сабақ жоспары',
    'plan.progress': '{total}-тен {done} өтілді',
    'plan.desc':
      'am/is/are + -ing жалғаулы етістік формасының қалай құрылатынын, оны қашан қолданатынын талдаймыз',

    'pract.headingFail': 'Нәтижені\nжақсарту керек',
    'pract.headingPass': 'Тамаша\nнәтиже',
    'pract.subFail': '{title} — өтілмеді',
    'pract.subPass': '{title} — өтілді',
    'pract.stat.grammar': 'Сөйлеу грамматикасы',
    'pract.stat.accent': 'Акцент',
    'pract.stat.lesson': 'Сабақ нәтижесі',
    'pract.analytics': 'Қателер талдауы',
    'pract.retry': 'Қайта тырысып көру',
    'pract.toPlan': 'Сабақ жоспарына өту',
  },

  en: {
    'nav.learn': 'Learning',
    'nav.practice': 'Practice',
    'nav.tutor': 'Tutor',
    'nav.lessons': 'Lessons',
    'sidebar.profile': 'Profile',
    'shell.back': 'Back',
    'common.back': 'Back',
    'kingdom.title': '{name} Kingdom',
    'kingdom.levelBadge': 'Level {label}',
    'kingdom.empty': 'No lessons yet',
    'role.tutor': 'Tutor',
    'footer.privacy': 'Privacy policy',
    'footer.copy': '© All rights reserved',
    'common.continue': 'Continue',

    'welcome.title': 'Welcome to learning\nwith your personal\ntutor',
    'welcome.sub':
      'Here we reinforce what you have learned and chat live — no textbooks, no cramming',

    'lang.title': 'First of all,\nchoose the language\nto talk with your tutor',

    'choose.title': 'Now you need to choose a tutor',
    'choose.langUi': 'Interface language',
    'choose.langExplain': 'Explanation language',
    'tutor.luna.trait1': 'Gentle',
    'tutor.luna.trait2': 'Sensitive',
    'tutor.luna.trait3': 'Calm',
    'tutor.luna.desc':
      'A gentle dreamer. Has her head in the clouds, sees beauty in everything, inspires you to imagine. Soft, sensitive, supports any wild idea.',
    'tutor.luna.listen': "Listen to Luna's voice",
    'tutor.luna.choose': 'Choose Luna',
    'tutor.dexter.trait1': 'Kind',
    'tutor.dexter.trait2': 'Smart',
    'tutor.dexter.trait3': 'Warm',
    'tutor.dexter.desc':
      'A warm and curious geek friend. Loves learning and sharing knowledge, but without being dull. Not a strict teacher, but an enthusiastic buddy who turns study into an adventure.',
    'tutor.dexter.listen': "Listen to Dexter's voice",
    'tutor.dexter.choose': 'Choose Dexter',
    'tutor.spark.trait1': 'Kazakh-speaking',
    'tutor.spark.trait2': 'Energetic',
    'tutor.spark.trait3': 'One of us',
    'tutor.spark.desc':
      'A tutor built specifically for Kazakh learners. Explains English in Kazakh and switches freely between Kazakh and English. Energetic and down-to-earth, he teaches through familiar examples and cheers you on «алға, сен істейсің!». With him you learn English in your own language.',
    'tutor.spark.listen': "Listen to Spark's voice",
    'tutor.spark.choose': 'Choose Spark',

    'loading.heading': '{name} is putting\nyour lessons together...',

    'offer.heading': '{name} is adjusting\nto your level...',
    'offer.title': '{name} does not know your level',
    'offer.sub': 'This is needed to build your learning around your needs',
    'offer.cta': 'Take a short test',
    'offer.ctaTime': '~3 minutes',
    'offer.later': 'Take the test later',

    'voiceIntro.heading': '{name} wants to know your\nspoken English level',
    'voiceIntro.start': 'Take a short test',
    'voiceIntro.decline': "I can't talk right now",
    'voiceIntro.hint': 'A 3-minute conversation to gauge your spoken level',
    'placeTest.heading': 'Do the task — I’ll assess your level',
    'placeTest.hint':
      'Speak in English for 2–3 minutes. No time limit — finish when you’re ready.',
    'placeTest.start': 'Start recording',
    'placeTest.listen': 'Listen to the task',
    'placeTest.recordingHeading': 'Recording — keep talking',
    'placeTest.stop': 'Finish & assess',
    'placeTest.processing': 'Listening and assessing your level…',
    'placeTest.retry': 'Record again',
    'placeTest.cancel': 'Not now',
    'placeTest.errMic': 'Microphone unavailable. Allow access in your browser and try again.',
    'placeTest.errRecognize': 'Could not recognize speech. Check your mic and try again.',
    'placeTest.errGrade': 'Could not assess your level. Try again.',
    'placeTest.errUnsupported': 'Mic recording is not supported in this browser.',

    'voice.micOn': 'Turn off microphone',
    'voice.micOff': 'Turn on microphone',
    'voice.permAllow': 'Allow while on the site',
    'voice.permHint': 'Grant microphone permission in the browser',
    'voice.permDenied':
      'Microphone access is blocked. Allow it in your browser settings and reload the page.',
    'voice.prompt': 'What do you want to talk about?',
    'voice.connecting': 'Connecting to your tutor…',
    'voice.waiting': 'Waiting for the tutor…',
    'voice.micDenied':
      'Microphone access is blocked. Allow it in your browser settings and try again.',
    'voice.unavailable': 'Voice mode is temporarily unavailable. Please try later.',
    'voice.expired': 'Your session has expired. Sign in again to keep talking.',
    'voice.limitDaily':
      "You've used today's talk limit (10 minutes a day on the free plan). Come back tomorrow!",
    'voice.limitMonthly':
      "You've reached the monthly talk limit (300 minutes). It resets at the start of next month.",

    'result.heading': 'Great!\nYour spoken English\nlevel',
    'result.retry': 'Try the test again',

    'interests.heading': '{name} wants to know\nwhat you are into',
    'interests.sub': 'Pick topics that interest you',
    'interests.topic.code': '💻 Programming',
    'interests.topic.football': '⚽️ Football',
    'interests.topic.sport': '🥏 Sports',
    'interests.topic.psy': '🧠 Psychology',
    'interests.topic.games': '🎮 Video games',
    'interests.topic.esport': '🧌 Esports',
    'interests.topic.art': '🎨 Art',
    'interests.topic.politics': '👨🏼‍⚖️ Politics',
    'interests.topic.movies': '🎥 Movies and series',
    'interests.topic.fashion': '👔 Fashion and style',

    'prof.heading': '{name} wants to know what you\ndo or what you are studying',
    'prof.placeholder': 'Tell it here ...',
    'prof.or': 'Or choose',
    'prof.skip': 'Skip the question',
    'prof.opt.it': 'IT/Development',
    'prof.opt.management': 'Management',
    'prof.opt.marketing': 'Marketing',
    'prof.opt.logist': 'Logistics',
    'prof.opt.design': 'Design',
    'prof.opt.actor': 'Actor',

    'analysis.heading': '{name} is finishing\nyour analysis',
    'analysis.step.tutor': 'Saving the tutor',
    'analysis.step.interests': 'Taking interests into account',
    'analysis.step.profession': 'Thinking about your profession',
    'analysis.step.level': 'Adjusting to your level',

    'dash.level': 'Level {level}',
    'dash.manage': 'Manage tutor',
    'dash.ctaTitle': 'Tap to chat\nwith your tutor',
    'dash.suggestLabel': 'Recommended today:',
    'dash.lessonsTitle': 'Lesson plan',
    'dash.seeAll': 'See all',
    'dash.progress': '{done} of {total} completed',
    'dash.scenariosTitle': 'Scenarios',
    'dash.scenariosSub':
      'Test your speaking in different situations and get personal feedback from the tutor',

    // Onboarding tour
    'tour.skip': 'Skip',
    'tour.next': 'OK',
    'tour.done': 'Done',
    'tour.mic.title': 'Talk to your tutor',
    'tour.mic.text':
      'Tap the microphone and chat with your tutor by voice — like a real conversation partner.',
    'tour.plan.title': 'Your lesson plan',
    'tour.plan.text':
      'Here the tutor builds lessons for your level. Check off what you finish and track your progress.',
    'tour.scenarios.title': 'Role-play scenarios',
    'tour.scenarios.text':
      'Try yourself in real situations — a job interview, a chat about family and more.',

    'manage.title': 'Manage tutor',
    'manage.change': 'Change tutor',
    'manage.history': 'Conversation history',
    'manage.historyEmpty': 'Your conversation history with the tutor will appear here',

    'erran.title': 'Conversation mistakes analytics',
    'erran.by': 'The analysis was done by your tutor:',
    'erran.toPlan': 'Back to lesson plan',
    'erran.retry': 'Try again',

    'scen.title': 'Scenarios',
    'scen.heading':
      'Test your speaking in different situations\nand get personal mistake feedback from the tutor',
    'scen.adminHeading': 'More scenarios',
    'scen.desc.visa-interview':
      'a U.S. embassy interview: a consular officer, sharp follow-ups and a verdict at the end',
    'scen.desc.hotel-check-in':
      'checking into a hotel: your booking, a room mix-up and polite requests in English',
    'scen.desc.asking-directions':
      'asking a local the way: prepositions of place, landmarks and repeating the route back',
    'scen.desc.ordering-coffee':
      'ordering in a rush-hour coffee shop: polite frames, clarifying and fixing the barista’s mistake',
    'scen.desc.job-interview':
      'we practise a job interview in English: talking about yourself, questions from the recruiter and answers to them',
    'scen.desc.household-store':
      'stocking an empty apartment: how to describe an object when you don’t know its name',
    'scen.desc.doctors-office':
      'a doctor’s visit: describing symptoms precisely — ache, pain, hurt, sore — and how long',
    'scen.start': 'Start conversation',
    'scen.locked': 'Unlocks once you pass “{label}” — it’s the next step of the story',
    'scen.lockedBtn': 'Locked',
    'scen.verdictPass': 'Task complete',
    'scen.verdictFail': 'Task not passed',
    'scen.verdictDone': 'Done',

    'plan.title': 'Lesson plan',
    'plan.progress': '{done} of {total} completed',
    'plan.desc':
      'We break down how the am/is/are + verb with -ing form is built, when to use it and when not',

    'pract.headingFail': 'You need to improve\nthe result',
    'pract.headingPass': 'Excellent\nresult',
    'pract.subFail': '{title} — not passed',
    'pract.subPass': '{title} — passed',
    'pract.stat.grammar': 'Speech grammar',
    'pract.stat.accent': 'Accent',
    'pract.stat.lesson': 'Lesson result',
    'pract.analytics': 'Mistakes analytics',
    'pract.retry': 'Try again',
    'pract.toPlan': 'Go to lesson plan',
  },
}
