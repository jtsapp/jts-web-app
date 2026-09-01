// СГЕНЕРИРОВАНО scripts/extract-trial-content.js — не править руками.
// Источник: слой пробного урока в бандле школы (index.html). Меняется контент
// урока — правь бандл и прогоняй скрипт заново, иначе правка потеряется при
// следующей выгрузке.
/* eslint-disable */

export const START_LEVELS = [
    { cando: 0, label: '🌱 Beginner', sub: 'Начинающий — почти с нуля' },
    { cando: 1, label: '📗 Elementary – Pre-Intermediate', sub: 'Продолжающий' },
    { cando: 3, label: '🚀 Intermediate – Upper-Intermediate', sub: 'Уверенный' }
  ]

export const LEVEL_DESC = {
    A1: 'Вы понимаете простые фразы и можете рассказать о себе. Отличная точка старта!',
    A2: 'Вы объясняетесь в бытовых ситуациях и понимаете знакомые темы.',
    B1: 'Вы уверенно общаетесь на повседневные темы и понимаете суть большинства текстов.',
    B2: 'Вы свободно обсуждаете широкий круг тем и хорошо понимаете живую речь.',
    C1: 'Вы бегло говорите на сложные темы — пора шлифовать нюансы и стиль.',
    C2: 'Уровень, близкий к носителю, — вам подойдут самые продвинутые программы.'
  }

export const ROUTING_A1 = [
    { stem: 'I ___ from Kazakhstan.', options: ['am', 'is', 'are', 'be'], key: 0 },
    { stem: 'This is my brother. ___ name is Timur.', options: ['His', 'Her', 'Their', 'He'], key: 0 },
    { stem: 'I have two ___.', options: ['brothers', 'brother', 'a brother', 'the brother'], key: 0 }
  ]

export const VOCAB_MATCH = {
    A1: { name: 'Словарь', intro: 'Соедините слова с переводом: нажмите слово слева, затем его пару справа.',
      pairs: [['семья', 'family'], ['бабушка', 'grandmother'], ['чай', 'tea'],
        ['машина', 'car'], ['сумка', 'bag'], ['помидор', 'tomato']] },
    A2: { name: 'Словарь', intro: 'Соедините слова и фразы с переводом: нажмите фразу слева, затем её пару справа.',
      pairs: [['Добро пожаловать!', 'Welcome!'], ['До свидания!', 'Good bye!'], ['умный', 'smart'],
        ['люди', 'people'], ['улыбаться', 'to smile'], ['Я опоздал.', 'I am late.']] },
    B1: { name: 'Словарь', intro: 'Соедините фразы и слова с переводом: нажмите элемент слева, затем его пару справа.',
      pairs: [['Сегодня погода прекрасна!', 'The weather is wonderful today!'],
        ['Он не понял.', "He didn't understand."], ['Я соглашусь.', 'I agree.'],
        ['совет', 'advice'], ['усилие', 'effort'], ['честный', 'honest']] },
    B2: { name: 'Идиомы', intro: 'Соедините идиомы с их значениями: нажмите идиому слева, затем её значение справа.',
      pairs: [['To be over the moon', 'to be extremely happy or excited'],
        ["It's not my cup of tea", "something that you don't really like or enjoy"],
        ['To have mixed feelings', 'to feel both positive and negative emotions about something'],
        ['To get along with', 'to have a good relationship with someone'],
        ['To call it a day', "to stop working on something, usually because it's time to finish"],
        ['Once in a blue moon', 'something that happens very rarely']] }
  }

export const TOBE_MCQ = [
    { stem: 'She ___ in Canada.', options: ['is', 'am', 'are'], key: 0 },
    { stem: 'Ann and Sam ___ good tennis players.', options: ['are', 'am', 'is'], key: 0 },
    { stem: '___ the weather nice today?', options: ['Is', 'Am', 'Are'], key: 0 },
    { stem: 'Jacob ___ a taxi driver.', options: ['is', 'am', 'are'], key: 0 },
    { stem: 'Diamonds ___ cheap.', options: ["aren't", 'am not', "isn't"], key: 0 },
    { stem: 'I ___ a student.', options: ['am', 'is', 'are'], key: 0 },
    { stem: 'My friends ___ funny.', options: ['are', 'is', 'am'], key: 0 },
    { stem: 'This film ___ interesting.', options: ['is', 'are', 'am'], key: 0 },
    { stem: 'They ___ at school.', options: ['are', 'am', 'is'], key: 0 }
  ]

export const READING = {
    A1: {
      title: 'My Wonderful Family',
      text: `I live in a house near the mountains. I have two brothers and one sister. My father is a teacher, and my mother is a doctor at a big hospital. My brothers are very funny. My sister is a smart and beautiful girl.
My family is very important to me. We do lots of things together. My brothers and I like to go on long walks in the mountains. My sister likes to cook with our mother. On the weekends we all play volleyball. We laugh and always have a good time. I love my family very much.`,
      qs: [
        { stem: 'How many brothers and sisters does the writer have?',
          options: ['Two brothers and one sister', 'One brother and two sisters', 'Two sisters and no brothers', 'Three brothers'], key: 0 },
        { stem: "What is the mother's job?",
          options: ['She is a doctor', 'She is a teacher', 'She is a cook', 'She is a nurse'], key: 0 },
        { stem: 'What do the writer and the brothers like to do?',
          options: ['Go on long walks in the mountains', 'Cook with their mother', 'Play chess', 'Watch films'], key: 0 },
        { stem: 'What does the family do on the weekends?',
          options: ['They all play volleyball', 'They go to the hospital', 'They work in the garden', 'They read books'], key: 0 }
      ]
    },
    A2: {
      title: 'Meet my family',
      text: `Meet my family. There are five of us — my parents, my elder brother, my baby sister and me. My mum enjoys reading and my dad enjoys playing chess with my brother Ken. My sister is very small and funny. She sleeps, eats and sometimes cries. My father is a doctor. He is tall and handsome. He has short dark hair and gray eyes. He is a very hardworking man. My name is Jessica. I am eleven. I have long dark hair and brown eyes. I am not as clever as my brother, though I try to do my best at school too. I am fond of dancing.`,
      qs: [
        { stem: "How many people are there in Jessica's family?",
          options: ['Five', 'Four', 'Three', 'Six'], key: 0 },
        { stem: "What does Jessica's dad enjoy?",
          options: ['Playing chess with Ken', 'Reading books', 'Dancing', 'Cooking'], key: 0 },
        { stem: "What is Jessica's father's job?",
          options: ['He is a doctor', 'He is a teacher', 'He is an engineer', 'He is a playwright'], key: 0 },
        { stem: 'What is Jessica fond of?',
          options: ['Dancing', 'Singing', 'Chess', 'Football'], key: 0 }
      ]
    },
    B1: {
      title: 'Reasons for travelling',
      text: `People enjoy traveling, but what are their reasons they leave their homes? There are several of them. First comes curiosity. Films about far-off places, books and friends' stories encourage us to undertake our own trips.
Education comes next. Learning through traveling is very popular. It does not mean only visiting museums and admiring architectural ensembles. It also means to get a glimpse of another life style. You can never get that sort of knowledge from books.
And besides, there are people who just change places. Probably they have problems at home and that is their way — rather to escape than to solve. Others look for adventures. We are all different and have different motives for traveling.`,
      qs: [
        { stem: 'What reason for travelling comes first in the text?',
          options: ['Curiosity', 'Education', 'Adventure', 'Escaping problems'], key: 0 },
        { stem: 'According to the text, what does learning through travelling mean?',
          options: ['Getting a glimpse of another lifestyle, not only visiting museums', 'Only visiting museums', 'Reading books about far-off places', 'Studying architecture at university'], key: 0 },
        { stem: 'Why do some people «just change places»?',
          options: ['They probably have problems at home and prefer to escape', 'They want to solve their problems at home', 'They are looking for a new job', 'They want to study abroad'], key: 0 },
        { stem: 'What is the main idea of the text?',
          options: ['People have different motives for travelling', 'Everyone travels only for education', 'Travelling is dangerous', 'Books teach more than trips'], key: 0 }
      ]
    },
    B2: {
      title: "Emma's presentation",
      text: `Last Monday, Emma had to give an important presentation at work. Before it started, she felt extremely nervous because she was afraid of making mistakes in front of her colleagues. Her hands were shaking, and she found it difficult to concentrate. Her friend noticed that Emma was worried and tried to encourage her. She told Emma to take a deep breath and think positively. During the first few minutes of the presentation, Emma still felt uncomfortable, but she slowly became more confident. When she finished, everyone smiled and applauded. Emma felt relieved, proud, and grateful for her friend's support.
Later that evening, Emma reflected on her experience and realised that trying to suppress her anxiety had only made her feel more overwhelmed. She understood that uncomfortable emotions are not necessarily signs of weakness; they can also show that something is genuinely important to us. By acknowledging her fear instead of avoiding it, Emma managed to regain her composure and perform successfully. The experience gave her a strong sense of accomplishment and taught her a valuable lesson about emotional resilience. She now believes that people can become more self-aware when they accept their feelings and learn how to cope with them in a healthy way.`,
      qs: [
        { stem: 'Why did Emma feel extremely nervous before the presentation?',
          options: ['She was afraid of making mistakes in front of her colleagues', 'She had not prepared her slides', 'Her friend had criticised her', 'She was late for work'], key: 0 },
        { stem: "What did Emma's friend advise her to do?",
          options: ['Take a deep breath and think positively', 'Cancel the presentation', 'Ask a colleague to present instead', 'Practise the speech once more'], key: 0 },
        { stem: 'What did Emma realise about suppressing her anxiety?',
          options: ['It only made her feel more overwhelmed', 'It helped her stay calm', 'It impressed her colleagues', 'It had no effect on her'], key: 0 },
        { stem: 'According to the text, what helps people become more self-aware?',
          options: ['Accepting their feelings and learning to cope with them in a healthy way', 'Avoiding uncomfortable emotions', 'Working harder than others', 'Hiding weakness from colleagues'], key: 0 },
        { stem: '«Emma felt relieved, proud, and grateful…» — что здесь значит relieved?',
          options: ['Почувствовавшая облегчение', 'Гордая', 'Благодарная', 'Испуганная'], key: 0 },
        { stem: '«…learn how to cope with them in a healthy way» — что значит to cope with?',
          options: ['Справляться с чем-либо', 'Подавлять', 'Обдумывать, анализировать', 'Признавать существование чего-либо'], key: 0 }
      ]
    }
  }

export const PREREAD_VOCAB = [
    { id: 'prv-b1', level: 'B1', title: 'Эмоции',
      pairs: [['nervous', 'нервный, взволнованный'], ['afraid', 'испуганный'],
        ['concentrate', 'концентрироваться'], ['encourage', 'поддерживать, подбадривать'],
        ['confident', 'уверенный'], ['relieved', 'почувствовавший облегчение'],
        ['proud', 'гордый'], ['grateful', 'благодарный'], ['support', 'поддержка']] },
    { id: 'prv-b2', level: 'B2', title: 'Фразы об эмоциях',
      pairs: [['reflect on', 'обдумывать, анализировать'], ['suppress emotions', 'подавлять эмоции'],
        ['anxiety', 'тревога'], ['overwhelmed', 'эмоционально перегруженный'],
        ['acknowledge', 'признать, принять существование чего-либо'],
        ['regain your composure', 'снова взять себя в руки'],
        ['sense of accomplishment', 'чувство достижения'],
        ['emotional resilience', 'эмоциональная устойчивость'],
        ['self-aware', 'понимающий собственные чувства и поведение'],
        ['cope with', 'справляться с чем-либо']] }
  ]

export const VIDEO_FILL = {
    low: [
      { id: 'vf-clip1', file: 'clips/clip1.mp4', level: 'A2',
        text: 'Look at the __1__.', bank: ['stars', 'cars', 'store', 'dress'], answers: ['stars'] },
      { id: 'vf-clip2', file: 'clips/clip2.mp4', level: 'B1',
        text: 'I hunt for __1__, eat, and __2__.', bank: ['food', 'rest', 'west', 'sleep'], answers: ['food', 'rest'] }
    ],
    high: [
      { id: 'vf-clip5', file: 'clips/clip5.mp4', level: 'B2',
        text: "I think that's the __1__ time I've ever __2__ a meal.", bank: ['first', 'missed', 'last', 'made'], answers: ['first', 'missed'] },
      { id: 'vf-clip7', file: 'clips/clip7.mp4', level: 'C1',
        text: "You're not going to get any __1__ hanging around here. What do you __2__?", bank: ['younger', 'want', 'hungrier', 'need'], answers: ['younger', 'want'] }
    ]
  }
