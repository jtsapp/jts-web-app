// ПРОБНЫЕ (тестовые) короткие тренировки Writing — показываются, пока в банке IELTS нет ни одного дрилла
// (`skill: writing, kind: drill`). Формат — drillModel.js и backend docs/ielts/TEST_FORMAT.md §7; настоящие дриллы
// методист заводит JSON-импортом в web-admin тем же форматом, и тогда пробные пропадают из списка сами.
// Тексты свои, английский не переводится (язык экзамена); объяснения — ru / kk / en.

const sample = (doc) => ({ schemaVersion: '1.0', skill: 'writing', kind: 'drill', sample: true, ...doc })

export const SAMPLE_DRILLS = [
  sample({
    id: 'WD-SAMPLE-T1-OVERVIEW',
    module: 'academic',
    category: 'task1',
    title: 'Task 1 · Overview sentence',
    name: { ru: 'Task 1: общий вывод (overview)', kk: 'Task 1: жалпы шолу (overview)', en: 'Task 1: the overview sentence' },
    intro: {
      ru: 'Overview — 1–2 предложения о главных тенденциях без цифр. Без него Task Achievement выше 5 не поднимается.',
      kk: 'Overview — сандарсыз негізгі үрдістер туралы 1–2 сөйлем. Онсыз Task Achievement 5-тен жоғары көтерілмейді.',
      en: 'An overview is 1–2 sentences on the main trends, with no figures. Without it, Task Achievement stays at 5 or below.',
    },
    minutes: 4,
    asks: { choice: { ru: 'Выберите лучший overview', kk: 'Ең жақсы overview-ді таңдаңыз', en: 'Choose the best overview' } },
    rounds: [
      {
        kind: 'choice',
        text: 'The line graph shows visitors to three city museums, 2000–2020. Art: 200,000 → 650,000. Science: 400,000 → 420,000. History: 500,000 → 300,000.',
        options: [
          'Overall, visits to the Art museum more than tripled, while numbers at the Science museum stayed stable and the History museum lost visitors.',
          'In 2000, the History museum had 500,000 visitors and the Art museum had 200,000.',
          'Overall, all three museums became more popular over the period.',
          'The graph shows how many people visited three museums between 2000 and 2020.',
        ],
        key: 'A',
        why: {
          ru: 'Overview называет главные тенденции без цифр: рост Art, стабильность Science, спад History. Второй вариант — детали, третий неверен, четвёртый пересказывает задание.',
          kk: 'Overview негізгі үрдістерді сандарсыз атайды: Art өсті, Science тұрақты, History азайды. Екінші нұсқа — детальдар, үшіншісі қате, төртіншісі тапсырманы қайталайды.',
          en: 'The overview names the main trends without figures: Art rose, Science was stable, History fell. The second option is detail, the third is wrong, the fourth repeats the task.',
        },
      },
      {
        kind: 'choice',
        text: 'The bar chart compares the percentage of households owning a car, a bicycle and a motorbike in four countries in 2022. Cars: 60–85% everywhere; bicycles: 20–55%; motorbikes: under 15%.',
        options: [
          'Overall, cars were the most common vehicle in all four countries, whereas motorbikes were the least common.',
          'Overall, 85% of households owned a car.',
          'Overall, the number of cars increased in all four countries.',
          'In conclusion, people should use bicycles more often.',
        ],
        key: 'A',
        why: {
          ru: 'Данные за один год — значит, главное здесь сравнение, а не рост. Цифра — деталь для абзаца, а мнение в Task 1 не нужно.',
          kk: 'Деректер бір жылға ғана — демек, мұнда басты нәрсе өсу емес, салыстыру. Сан — абзацқа арналған деталь, ал Task 1-де пікір керек емес.',
          en: 'The data is for one year, so the key point is comparison, not growth. A figure is detail for a body paragraph, and Task 1 needs no opinion.',
        },
      },
      {
        kind: 'choice',
        text: 'The diagram shows how olive oil is produced, from harvesting the olives to bottling the oil, in eight stages.',
        options: [
          'Overall, there are eight stages in the process, beginning with harvesting the olives and ending with bottling the oil.',
          'First, the olives are harvested by hand.',
          'Overall, olive oil is very healthy and popular.',
          'Overall, olive oil production has increased dramatically.',
        ],
        key: 'A',
        why: {
          ru: 'У процесса overview — число этапов, начало и конец. Первый шаг — это уже деталь, а тенденций у процесса нет.',
          kk: 'Процестің overview-і — кезеңдер саны, басы мен соңы. Бірінші қадам — деталь, ал процесте үрдіс болмайды.',
          en: 'For a process, the overview gives the number of stages, the start and the end. The first step is detail, and a process has no trends.',
        },
      },
    ],
  }),

  sample({
    id: 'WD-SAMPLE-T1-TRENDS',
    module: 'academic',
    category: 'task1',
    title: 'Task 1 · Trends and comparisons',
    name: { ru: 'Task 1: лексика тенденций и сравнений', kk: 'Task 1: үрдіс пен салыстыру лексикасы', en: 'Task 1: trend and comparison language' },
    minutes: 3,
    rounds: [
      {
        kind: 'gap',
        text: 'Between 2010 and 2015, the price of rice ___ from $300 to $520 per tonne.',
        options: ['rose sharply', 'fell slightly', 'remained stable', 'fluctuated'],
        key: 'A',
        why: {
          ru: 'С 300 до 520 — резкий рост: rose sharply. Остальные варианты описывают спад, стабильность или колебания.',
          kk: '300-ден 520-ға дейін — күрт өсу: rose sharply. Қалған нұсқалар төмендеуді, тұрақтылықты не ауытқуды сипаттайды.',
          en: 'From 300 to 520 is a sharp rise: rose sharply. The other options describe a fall, stability or ups and downs.',
        },
      },
      {
        kind: 'type',
        ask: { ru: 'Впишите глагол тенденции (два слова)', kk: 'Үрдіс етістігін жазыңыз (екі сөз)', en: 'Type the trend verb (two words)' },
        text: 'Unemployment ___ at 4% for the whole decade, without any change.',
        accept: ['remained stable', 'stayed stable', 'remained steady', 'stayed steady', 'remained constant', 'stayed constant', 'remained unchanged', 'stayed the same', 'remained the same'],
        why: {
          ru: 'Без изменений — remained stable (steady, constant, unchanged). Глагол в прошедшем времени: десятилетие уже прошло.',
          kk: 'Өзгеріссіз — remained stable (steady, constant, unchanged). Етістік өткен шақта: онжылдық өтіп кеткен.',
          en: 'No change is remained stable (steady, constant, unchanged), in the past tense because the decade is over.',
        },
      },
      {
        kind: 'gap',
        text: 'In 2020, Japan produced twice ___ electricity from solar power as Korea.',
        options: ['as much', 'more', 'as many', 'much more'],
        key: 'A',
        why: {
          ru: 'Twice as much … as — «в два раза больше». Electricity неисчисляемое, поэтому much, а не many.',
          kk: 'Twice as much … as — «екі есе көп». Electricity саналмайтын зат есім, сондықтан many емес, much.',
          en: 'Twice as much … as means two times more. Electricity is uncountable, so much, not many.',
        },
      },
    ],
  }),

  sample({
    id: 'WD-SAMPLE-PARAPHRASE',
    module: 'both',
    category: 'both',
    title: 'Paraphrase the question',
    name: { ru: 'Перефразируйте задание', kk: 'Тапсырманы басқаша айту', en: 'Paraphrase the question' },
    intro: {
      ru: 'Первое предложение ответа пересказывает задание своими словами. Скопированные слова экзаменатор в счёт не берёт.',
      kk: 'Жауаптың бірінші сөйлемі тапсырманы өз сөзіңізбен береді. Көшірілген сөздерді емтихан алушы есепке алмайды.',
      en: 'The first sentence restates the task in your own words. Copied words are not counted by the examiner.',
    },
    minutes: 3,
    asks: { choice: { ru: 'Выберите лучшую перефразировку', kk: 'Ең жақсы басқаша айтылған нұсқаны таңдаңыз', en: 'Choose the best paraphrase' } },
    rounds: [
      {
        kind: 'choice',
        text: 'Some people believe that university education should be free for all students.',
        options: [
          'It is sometimes argued that higher education ought to cost students nothing.',
          'Some people believe that university education should be free for every student.',
          'Some people think that university is free for all students.',
          'Universities are the most important part of the education system.',
        ],
        key: 'A',
        why: {
          ru: 'Слова другие (university → higher education, free → cost nothing), смысл тот же. Второй вариант почти копия, в третьем «должно быть» стало «есть», четвёртый — другая мысль.',
          kk: 'Сөздер басқа (university → higher education, free → cost nothing), мағынасы сол. Екінші нұсқа — көшірме дерлік, үшіншісінде «болуы керек» «бар» болып кетті, төртіншісі — басқа ой.',
          en: 'The words change (university → higher education, free → cost nothing) but the meaning stays. The second is a near copy, the third turns "should be" into "is", the fourth is a different idea.',
        },
      },
      {
        kind: 'choice',
        text: 'In many countries, the number of people living alone is increasing.',
        options: [
          'Single-person households are becoming more common in a number of nations.',
          'In many countries, the number of people who live alone is increasing.',
          'Many people in different countries feel lonely.',
          'Living alone has more advantages than disadvantages.',
        ],
        key: 'A',
        why: {
          ru: 'Single-person households и a number of nations сохраняют смысл новыми словами. Lonely — уже не «живут одни», а последний вариант — мнение, а не пересказ.',
          kk: 'Single-person households және a number of nations мағынаны жаңа сөздермен сақтайды. Lonely — «жалғыз тұрады» емес, ал соңғы нұсқа — пікір, басқаша айту емес.',
          en: 'Single-person households and a number of nations keep the meaning in new words. Lonely is not the same as living alone, and the last option is an opinion, not a paraphrase.',
        },
      },
      {
        kind: 'choice',
        module: 'academic',
        text: 'The chart below shows the amount of money spent on books in Germany, France, Italy and Austria between 1995 and 2005.',
        options: [
          'The bar chart compares spending on books in four European countries over a ten-year period.',
          'The chart below shows the amount of money spent on books in four countries between 1995 and 2005.',
          'The chart compares how many books were read in Europe from 1995 to 2005.',
          'The bar chart shows that Germans spent the most money on books.',
        ],
        key: 'A',
        why: {
          ru: 'Spending вместо amount of money spent, four European countries вместо списка, ten-year period вместо дат. «Прочитанные книги» — другие данные, а кто потратил больше — это уже overview.',
          kk: 'Amount of money spent орнына spending, тізім орнына four European countries, жылдар орнына ten-year period. «Оқылған кітаптар» — басқа деректер, ал кім көп жұмсағаны — бұл overview.',
          en: 'Spending replaces amount of money spent, four European countries replaces the list, a ten-year period replaces the dates. Books read is different data, and who spent most belongs in the overview.',
        },
      },
    ],
  }),

  sample({
    id: 'WD-SAMPLE-LINKING',
    module: 'both',
    category: 'both',
    title: 'Linking words',
    name: { ru: 'Связки: контраст, следствие, пример', kk: 'Байланыстырушы сөздер: қарсы қою, салдар, мысал', en: 'Linking words: contrast, result, example' },
    minutes: 3,
    asks: { gap: { ru: 'Выберите связку для пропуска', kk: 'Бос орынға байланыстырушы сөзді таңдаңыз', en: 'Choose the linking word for the gap' } },
    rounds: [
      {
        kind: 'gap',
        text: 'Public transport in the city is cheap. ___, it is often overcrowded during rush hour.',
        options: ['However', 'Moreover', 'For instance', 'Therefore'],
        key: 'A',
        why: {
          ru: 'Второе предложение — минус после плюса, поэтому нужен контраст However.',
          kk: 'Екінші сөйлем — артықшылықтан кейінгі кемшілік, сондықтан қарсы қоятын However керек.',
          en: 'The second sentence gives a drawback after a benefit, so it needs the contrast linker However.',
        },
      },
      {
        kind: 'gap',
        text: 'Many young people cannot afford to buy a home. ___, they continue to live with their parents into their thirties.',
        options: ['As a result', 'In contrast', 'For example', 'Similarly'],
        key: 'A',
        why: {
          ru: 'Жить с родителями — следствие того, что жильё недоступно: As a result.',
          kk: 'Ата-анамен тұру — үй алуға шамасы келмеуінің салдары: As a result.',
          en: 'Living with parents is the result of not affording a home: As a result.',
        },
      },
      {
        kind: 'gap',
        text: 'Some jobs, ___ nursing and teaching, are poorly paid despite their importance.',
        options: ['such as', 'as a result', 'despite', 'although'],
        key: 'A',
        why: {
          ru: 'Перед существительными-примерами внутри предложения ставится such as; остальные связки здесь не грамматичны.',
          kk: 'Сөйлем ішінде мысал болатын зат есімдердің алдына such as қойылады. Қалған сөздер мұнда грамматикаға келмейді.',
          en: 'Before example nouns inside a sentence we use such as; the other linkers do not fit grammatically.',
        },
      },
    ],
  }),

  sample({
    id: 'WD-SAMPLE-T2-THESIS',
    module: 'both',
    category: 'task2',
    title: 'Task 2 · Thesis statement',
    name: { ru: 'Task 2: позиция во введении', kk: 'Task 2: кіріспедегі ұстаным', en: 'Task 2: the thesis statement' },
    intro: {
      ru: 'Тезис — последнее предложение введения: прямой ответ на вопрос задания и коротко — почему.',
      kk: 'Тезис — кіріспенің соңғы сөйлемі: тапсырма сұрағына тікелей жауап және қысқаша — неге.',
      en: 'The thesis is the last sentence of the introduction: a direct answer to the question and, briefly, why.',
    },
    minutes: 4,
    asks: { choice: { ru: 'Какой тезис лучше отвечает на задание?', kk: 'Қай тезис тапсырмаға жақсырақ жауап береді?', en: 'Which thesis answers the task best?' } },
    rounds: [
      {
        kind: 'choice',
        text: 'Some people think that children should start learning a foreign language at primary school rather than secondary school. To what extent do you agree or disagree?',
        options: [
          'I completely agree that languages should be taught from primary school, because young learners pick up pronunciation more easily and have more years to practise.',
          'There are many advantages and disadvantages of learning languages at different ages.',
          'Learning foreign languages is very important in today’s world.',
          'In this essay, I will discuss this question.',
        ],
        key: 'A',
        why: {
          ru: 'На To what extent нужен ответ «насколько согласен» и причины. Второй вариант не выбирает сторону, третий — общая фраза, четвёртый — пустое обещание.',
          kk: 'To what extent сұрағына «қаншалықты келісемін» деген жауап пен себептер керек. Екінші нұсқа жақ таңдамайды, үшіншісі — жалпы сөз, төртіншісі — бос уәде.',
          en: 'To what extent needs a clear degree of agreement and reasons. The second option takes no side, the third is a generality, the fourth is an empty promise.',
        },
      },
      {
        kind: 'choice',
        text: 'Some people believe that the best way to reduce traffic is to make public transport free. Others think that building more roads is more effective. Discuss both views and give your opinion.',
        options: [
          'While new roads may ease congestion in the short term, I believe free public transport is the more effective long-term solution.',
          'Both views have some advantages.',
          'Traffic is a serious problem in many big cities.',
          'I believe that everyone should buy an electric car.',
        ],
        key: 'A',
        why: {
          ru: 'Discuss both views + your opinion: тезис называет обе точки зрения и своё мнение. «У обеих есть плюсы» мнения не даёт, электромобили — не та тема.',
          kk: 'Discuss both views + your opinion: тезис екі көзқарасты да және өз пікіріңізді атайды. «Екеуінің де артықшылығы бар» пікір бермейді, электромобиль — басқа тақырып.',
          en: 'Discuss both views and give your opinion: the thesis names both views and your own. "Both have advantages" gives no opinion, and electric cars are off topic.',
        },
      },
      {
        kind: 'choice',
        text: 'Many people today do not get enough physical exercise. What are the causes of this problem? What solutions can be suggested?',
        options: [
          'This is mainly caused by desk-based jobs and screen-based leisure, and it could be tackled through workplace fitness schemes and safer cycle routes.',
          'I strongly agree that people should do more sport.',
          'There are many causes and solutions to this problem, which will be discussed below.',
          'Exercise is good for both physical and mental health.',
        ],
        key: 'A',
        why: {
          ru: 'Задание просит причины и решения — тезис коротко называет и то, и другое. «Согласен» — ответ на другой тип эссе, третий вариант ничего не называет.',
          kk: 'Тапсырма себептер мен шешімдерді сұрайды — тезис екеуін де қысқаша атайды. «Келісемін» — эссенің басқа түріне жауап, үшінші нұсқа ештеңе атамайды.',
          en: 'The task asks for causes and solutions, and the thesis briefly names both. "I agree" answers a different essay type, and the third option names nothing.',
        },
      },
    ],
  }),

  sample({
    id: 'WD-SAMPLE-GT-REGISTER',
    module: 'general',
    category: 'task1',
    title: 'GT letter · Formal or informal',
    name: { ru: 'Письмо GT: официально или нет', kk: 'GT хаты: ресми ме, бейресми ме', en: 'GT letter: formal or informal' },
    intro: {
      ru: 'Регистр письма задаёт адресат: незнакомый человек или организация — официально, друг — неофициально, знакомый руководитель — полуофициально.',
      kk: 'Хаттың регистрін алушы анықтайды: бейтаныс адам не ұйым — ресми, дос — бейресми, таныс басшы — жартылай ресми.',
      en: 'The reader sets the register: a stranger or an organisation means formal, a friend informal, a manager you know semi-formal.',
    },
    minutes: 4,
    asks: { sort: { ru: 'Разложите фразы: официально или неофициально', kk: 'Сөз тіркестерін бөліңіз: ресми ме, бейресми ме', en: 'Sort the phrases: formal or informal' } },
    rounds: [
      {
        kind: 'sort',
        bins: [
          { key: 'formal', label: { ru: 'Официально', kk: 'Ресми', en: 'Formal' } },
          { key: 'informal', label: { ru: 'Неофициально', kk: 'Бейресми', en: 'Informal' } },
        ],
        items: [
          { text: 'I am writing to complain about…', bin: 'formal' },
          { text: 'Just a quick note to say…', bin: 'informal' },
          { text: 'I would be grateful if you could…', bin: 'formal' },
          { text: 'Can’t wait to see you!', bin: 'informal' },
          { text: 'Yours faithfully,', bin: 'formal' },
          { text: 'Take care,', bin: 'informal' },
        ],
        why: {
          ru: 'Официальное письмо — полные формы, вежливые просьбы (I would be grateful) и Yours faithfully; дружеское — сокращения, восклицания и Take care.',
          kk: 'Ресми хатта — толық формалар, сыпайы өтініштер (I would be grateful) және Yours faithfully; достық хатта — қысқартулар, лепті сөйлемдер және Take care.',
          en: 'A formal letter uses full forms, polite requests (I would be grateful) and Yours faithfully; a friendly one uses contractions, exclamations and Take care.',
        },
      },
      {
        kind: 'sort',
        bins: [
          { key: 'formal', label: { ru: 'Официально', kk: 'Ресми', en: 'Formal' } },
          { key: 'informal', label: { ru: 'Неофициально', kk: 'Бейресми', en: 'Informal' } },
        ],
        items: [
          { text: 'I look forward to hearing from you.', bin: 'formal' },
          { text: 'Drop me a line soon.', bin: 'informal' },
          { text: 'I apologise for any inconvenience.', bin: 'formal' },
          { text: 'Guess what?', bin: 'informal' },
          { text: 'I have enclosed a copy of the receipt.', bin: 'formal' },
          { text: 'Sorry I haven’t written for ages.', bin: 'informal' },
        ],
        why: {
          ru: 'Drop me a line, Guess what? и Sorry I haven’t written — разговорные фразы для друга; look forward to hearing, apologise и enclosed — для организации.',
          kk: 'Drop me a line, Guess what? және Sorry I haven’t written — досқа арналған сөйлеу тілі; look forward to hearing, apologise және enclosed — ұйымға.',
          en: 'Drop me a line, Guess what? and Sorry I haven’t written are chatty phrases for a friend; look forward to hearing, apologise and enclosed are for an organisation.',
        },
      },
      {
        kind: 'choice',
        ask: { ru: 'Какое начало подходит письму руководителю с просьбой о выходном?', kk: 'Басшыға демалыс сұрап жазған хатқа қай бастама келеді?', en: 'Which opening suits a letter asking your manager for a day off?' },
        options: [
          'Dear Mr Collins, I am writing to ask whether I could take next Friday off.',
          'Hi mate! Any chance I could skip work on Friday?',
          'Dear Sir or Madam, I wish to formally request annual leave.',
          'To whom it may concern, give me Friday off.',
        ],
        key: 'A',
        why: {
          ru: 'Руководителя знают по имени: Dear Mr Collins и вежливая просьба — полуофициальный регистр. Dear Sir or Madam — для незнакомого адресата, Hi mate — для друга.',
          kk: 'Басшыны атымен білесіз: Dear Mr Collins және сыпайы өтініш — жартылай ресми регистр. Dear Sir or Madam — бейтаныс адамға, Hi mate — досқа.',
          en: 'You know your manager by name: Dear Mr Collins and a polite request make it semi-formal. Dear Sir or Madam is for a stranger, Hi mate for a friend.',
        },
      },
    ],
  }),

  // Новые виды банка writing-dev-pack (order / match / spot / pick / free) на одном графике — пример формата для методиста
  sample({
    id: 'WD-SAMPLE-T1-LINE',
    drillKey: 'SAMPLE-T1-LINE',
    part: 'T1',
    types: ['line'],
    guide: 't1ac.line',
    module: 'academic',
    category: 'task1',
    title: 'Task 1 · Line graph basics',
    name: { ru: 'Task 1: линейный график — от плана до введения', kk: 'Task 1: сызықтық график — жоспардан кіріспеге дейін', en: 'Task 1: line graph — from plan to introduction' },
    minutes: 6,
    rounds: [
      {
        id: 'SAMPLE-T1-LINE-001',
        kind: 'order',
        ty: 'line',
        items: ['Introduction: paraphrase of the task', 'Overview: main trends, no numbers', 'Body 1: the most noticeable features with figures', 'Body 2: the remaining features and comparisons'],
        why: {
          ru: 'Четыре абзаца. Conclusion не нужен — его роль играет overview.',
          kk: 'Төрт абзац. Conclusion керек емес — оның рөлін overview атқарады.',
          en: 'Four paragraphs. No conclusion — the overview does that job.',
        },
      },
      {
        id: 'SAMPLE-T1-LINE-002',
        kind: 'match',
        ty: 'line',
        pairs: [
          ['shows', 'illustrates'],
          ['the number of visitors', 'how many people visited'],
          ['between 2002 and 2022', 'over a twenty-year period'],
        ],
        why: {
          ru: 'Во введении меняйте и глагол, и существительные, и период.',
          kk: 'Кіріспеде етістікті де, зат есімдерді де, кезеңді де өзгертіңіз.',
          en: 'In the introduction, change the verb, the nouns and the time period.',
        },
      },
      {
        id: 'SAMPLE-T1-LINE-003',
        kind: 'spot',
        ty: 'line',
        tokens: ['The', 'number', 'of', 'cars', 'increased', 'from', '200', 'in', '2000', 'to', '500', 'at', '2010.'],
        wrong: 11,
        accept: ['in'],
        why: { ru: 'С годом — in: in 2010.', kk: 'Жылмен — in: in 2010.', en: 'With a year we use in: in 2010.' },
      },
      {
        id: 'SAMPLE-T1-LINE-004',
        kind: 'pick',
        ty: 'line',
        visual: { type: 'line', title: 'Cinema admissions (millions)', unit: 'm', x: ['2004', '2008', '2012', '2016', '2020', '2022'], series: [{ name: 'Admissions', values: [140, 150, 172, 168, 44, 120] }] },
        answer: [0, 2, 4, 5],
        why: {
          ru: 'Начало, пик (2012), обвал (2020) и конец. 2008 и 2016 можно пропустить.',
          kk: 'Басы, шыңы (2012), күрт құлдырау (2020) және соңы. 2008 бен 2016-ны өткізіп жіберуге болады.',
          en: 'Start, peak (2012), collapse (2020) and end. 2008 and 2016 can be skipped.',
        },
      },
      {
        id: 'SAMPLE-T1-LINE-005',
        kind: 'free',
        ty: 'line',
        ask: {
          ru: 'Напишите введение (1 предложение): «The graph below shows the number of visitors to a city zoo between 2015 and 2023.»',
          kk: 'Кіріспе жазыңыз (1 сөйлем): «The graph below shows the number of visitors to a city zoo between 2015 and 2023.»',
          en: 'Write an introduction (1 sentence): ‘The graph below shows the number of visitors to a city zoo between 2015 and 2023.’',
        },
        min: 12,
        max: 40,
        starts: ['The', 'This'],
        checklist: [
          { ru: 'Указан тип графика (line graph)', kk: 'График түрі аталған (line graph)', en: 'The chart type is named (line graph)' },
          { ru: 'Есть что измеряют, где и когда', kk: 'Не өлшенетіні, қайда және қашан екені бар', en: 'It says what is measured, where and when' },
          { ru: 'Глагол и существительные заменены синонимами', kk: 'Етістік пен зат есімдер синониммен ауыстырылған', en: 'The verb and nouns are replaced with synonyms' },
        ],
        model: 'The line graph illustrates how many people visited a city zoo over the eight years from 2015.',
        why: {
          ru: 'Автопроверка смотрит на длину и начало фразы; смысл проверьте сами по чек-листу.',
          kk: 'Автотексеру ұзындық пен бастамаға қарайды; мағынасын чек-лист бойынша өзіңіз тексеріңіз.',
          en: 'The auto-check looks at length and the first word; check the meaning yourself with the checklist.',
        },
      },
    ],
  }),
]

/** Пробный дрилл по id (без запроса к банку). */
export function sampleDrill(id) {
  return SAMPLE_DRILLS.find((d) => d.id === id) || null
}
