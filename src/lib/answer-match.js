// Сверка текстового ответа студента с эталоном — одна на все плееры заданий
// («Обучение», грамматика, live-уроки).
//
// Почему отдельный модуль: у каждого плеера был свой norm(), и все они
// расходились с движком исходного курса (public/course/<level>/engine.js).
// Из-за этого урок A0 «Coffee — yes. Mondays — no.» браковал верные ответы:
//   • студент печатает «do not», в данных лежит «don't» — движок курса
//     принимает оба, наши плееры принимали только второе;
//   • в данных B2/C1 апостроф типографский (don’t, U+2019), а norm() вырезал
//     только ASCII-кавычку, так что «don't» с клавиатуры не совпадало ни с чем.
// Правила ниже — порт norm()/CONTRACT/extendsAnswer из движка курса.

// Стяжения и полные формы схлопываются в одну строку, поэтому «I don't like»
// и «I do not like» — один и тот же ответ.
const CONTRACTIONS = {
  dont: 'do not',
  doesnt: 'does not',
  didnt: 'did not',
  isnt: 'is not',
  arent: 'are not',
  wasnt: 'was not',
  werent: 'were not',
  havent: 'have not',
  hasnt: 'has not',
  hadnt: 'had not',
  wont: 'will not',
  wouldnt: 'would not',
  shouldnt: 'should not',
  couldnt: 'could not',
  mustnt: 'must not',
  cant: 'can not',
  cannot: 'can not',
  im: 'i am',
  ive: 'i have',
  youre: 'you are',
  youve: 'you have',
  weve: 'we have',
  theyre: 'they are',
  theyve: 'they have',
  thats: 'that is',
  theres: 'there is',
  heres: 'here is',
  lets: 'let us',
}

// «we're» в список не входит: без апострофа оно неотличимо от прошедшего
// «were», и приравняв их, мы засчитывали бы Past Continuous за Present.
const CONTRACTED = /\b(dont|doesnt|didnt|isnt|arent|wasnt|werent|havent|hasnt|hadnt|wont|wouldnt|shouldnt|couldnt|mustnt|cant|cannot|im|ive|youre|youve|weve|theyre|theyve|thats|theres|heres|lets)\b/g

export function normAnswer(value) {
  const raw = Array.isArray(value) ? value.join(' ') : value
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[‘’ʼ´`']/g, '') // апострофы: dont == don't == don’t
    .replace(/[‐-―−]/g, '-')
    .replace(/[.,!?;:"“”…()[\]{}\/\\|<>*_+=~^&%$#@]/g, ' ')
    .replace(/\s*-\s*/g, ' ') // дефис считаем пробелом: well-known == well known
    .replace(/\s+/g, ' ')
    .trim()
    .replace(CONTRACTED, (m) => CONTRACTIONS[m] || m)
}

// Эталонов может быть несколько: список и/или альтернативы через «|» в строке
// (так их пишет и экстрактор уроков, и движок курса в data-answer).
export function acceptedAnswers(accepted) {
  const list = Array.isArray(accepted) ? accepted : [accepted]
  return list
    .flatMap((a) => String(a ?? '').split('|'))
    .map(normAnswer)
    .filter(Boolean)
}

// Задание «перепиши предложение» ставит поле в конец строки: студент печатает
// весь остаток, а эталон часто хранит только его начало. Ответ засчитываем,
// если он начинается с эталона, а все лишние слова взяты из самой подсказки —
// целое предложение проходит, выдуманный хвост нет.
function extendsAnswer(value, list, cue) {
  if (!cue) return false
  const pool = cue.split(' ').filter(Boolean)
  return list.some((a) => {
    if (a.length < 2 || !value.startsWith(a + ' ')) return false
    const extra = value.slice(a.length).trim().split(' ').filter(Boolean)
    return extra.length > 0 && extra.every((w) => pool.includes(w))
  })
}

// Ответ без единой буквы: у заданий на артикль верный вариант — прочерк
// («Most people think — possessions are about money», банк «— / a / the»).
// Нормализация режет знаки препинания и превращает его в пустую строку, а
// пустой ответ мы не засчитываем никогда — задание становилось непроходимым.
// Поэтому такие эталоны сравниваем как есть, без нормализации.
const bare = (v) => String(v ?? '').trim()

// cue — текст задания вокруг пропуска (до/после), нужен только для «перепиши».
export function answerMatches(input, accepted, cue = '') {
  const raw = Array.isArray(accepted) ? accepted : [accepted]
  const symbolic = raw.flatMap((a) => String(a ?? '').split('|')).filter((a) => bare(a) && !normAnswer(a))
  if (symbolic.some((a) => bare(a) === bare(input))) return true

  const value = normAnswer(input)
  if (!value) return false
  const list = acceptedAnswers(accepted)
  if (list.includes(value)) return true
  return extendsAnswer(value, list, normAnswer(cue))
}
