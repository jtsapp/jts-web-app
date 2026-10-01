// Темы раундов по сложностям: чем
// выше сложность, тем абстрактнее и оценочнее ответ. У Easy и Medium есть
// русский и казахский перевод в том же порядке, у Hard и Very Hard — только
// английский, как в исходнике: на этих уровнях тему читают по-английски.
// Отвечает ученик всегда по-английски.

export const TOPICS = [
  {
    en: [
      'Describe your favourite food.',
      'Describe your home.',
      'Describe a friend you like to spend time with.',
      'Describe your daily routine.',
      'Describe a place where you feel relaxed.',
      'Describe a hobby you enjoy.',
    ],
    ru: [
      'Опишите свою любимую еду.',
      'Опишите свой дом.',
      'Опишите друга, с которым вам нравится проводить время.',
      'Опишите свой обычный день.',
      'Опишите место, где вы чувствуете себя спокойно.',
      'Опишите хобби, которое вам нравится.',
    ],
    kk: [
      'Сүйікті тағамыңызды сипаттаңыз.',
      'Үйіңізді сипаттаңыз.',
      'Бірге уақыт өткізгенді ұнататын досыңызды сипаттаңыз.',
      'Күнделікті тәртібіңізді сипаттаңыз.',
      'Өзіңізді жайлы сезінетін орынды сипаттаңыз.',
      'Өзіңізге ұнайтын хоббиді сипаттаңыз.',
    ],
  },
  {
    en: [
      'Describe a skill you would like to learn.',
      'Describe a time you helped someone.',
      'Describe a memorable journey you took.',
      'Describe a person who inspires you.',
      'Describe a useful piece of technology.',
      'Describe a book or film that made you think.',
    ],
    ru: [
      'Опишите навык, которому вы хотели бы научиться.',
      'Расскажите о случае, когда вы кому-то помогли.',
      'Опишите запомнившееся вам путешествие.',
      'Опишите человека, который вас вдохновляет.',
      'Опишите полезное технологическое устройство.',
      'Опишите книгу или фильм, которые заставили вас задуматься.',
    ],
    kk: [
      'Үйренгіңіз келетін бір дағдыны сипаттаңыз.',
      'Біреуге көмектескен кезіңіз туралы айтып беріңіз.',
      'Есіңізде қалған бір саяхатыңызды сипаттаңыз.',
      'Сізге шабыт беретін адамды сипаттаңыз.',
      'Пайдалы бір технологиялық құрылғыны сипаттаңыз.',
      'Сізді ойландырған кітапты немесе фильмді сипаттаңыз.',
    ],
  },
  {
    en: [
      'Describe a change in your city that you think was not for the better.',
      'Describe a decision you made that others disagreed with.',
      'Describe a rule at school or work you would change, and explain why.',
      'Describe a piece of advice that changed the way you think.',
      'Describe a problem in your community and how it could be solved.',
      'Describe a time you had to adapt quickly to something unexpected.',
    ],
  },
  {
    en: [
      'Should governments limit how much time people spend online? Explain your view.',
      'Describe how technology has changed the way people form friendships.',
      'Is it more important to be happy or to be successful? Explain your view.',
      'Describe a tradition in your country that you think should change.',
      'How far should individuals be responsible for protecting the environment?',
      'Describe the qualities a good leader needs in a time of crisis.',
    ],
  },
]

/** Тема на языке интерфейса; на уровнях без перевода — английская. */
export function topicText(level, index, lang) {
  const set = TOPICS[level]
  return (set[lang] || set.en)[index]
}

/** Переведена ли тема уровня на этот язык (у английского перевода нет вовсе). */
export const topicTranslated = (level, lang) => lang !== 'en' && !!TOPICS[level][lang]

// Новая тема при каждом старте — не та, что была в прошлый раз на этом уровне.
export function nextTopic(level, previous, random = Math.random) {
  const count = TOPICS[level].en.length
  const pick = Math.floor(random() * (previous === null ? count : count - 1))
  return previous !== null && pick >= previous ? pick + 1 : pick
}
