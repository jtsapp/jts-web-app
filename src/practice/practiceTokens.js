import { isStudentSectionHidden } from '../config.js'
import { useEffect, useState } from 'react'
import { getMyTokens } from '../api.js'
import { isTeacher } from '../lib/jwt.js'

// «+N токенов» на плитках практики и блоки токенов на главной ученика (ТЗ кабинетов, раздел 5). Имена действий — те же
// строки, по которым сервер начисляет (HomeworkAssignmentService.awardPracticeUnit → TokenAwardService.awardPractice),
// поэтому плитка обещает ровно то, что ученик получит.
const RULE_NAMES = {
  grammar: 'Юнит грамматики',
  shadowing: 'Шэдоуинг — видео до конца',
  tales: 'Сказка пройдена',
  karaoke: 'Караоке — песня целиком',
  memes: 'Мемы и рилсы — 5 штук',
  trainer: 'Тренажёр аудирования / чтения / письма / говорения',
  // Свои правила игр (backend V415, «полный каталог практики»): у мини-игры Listening и «Услышь детали» — секция
  // «Практика Listening».
  listeningGame: 'Listening мини-игра',
  listenchoose: 'Услышь детали — найди свою картинку',
  words: 'Слушай слово и находи на картинке',
  numbers: 'Мир чисел Декстера — уровень',
}

// Карточки практики, где действие реально начисляет токены, — по ключу `tokens` карточки (practiceCatalog.js).
// Правил бывает несколько: первое, что нашлось в ответе сервера. У мини-игры Listening своё правило появилось с
// V415, а до него она шла общим «Тренажёром» — стенд со старым бэкендом не должен потерять чип.
// `listenPair` / `writePair` — ключи плиток «Главной».
const SECTION_RULE = {
  grammar: 'grammar',
  shadowing: 'shadowing',
  tales: 'tales',
  karaoke: 'karaoke',
  memes: 'memes',
  listenPair: 'trainer',
  reading: 'trainer',
  writePair: 'trainer',
  writing: 'trainer',
  situations: 'trainer',
  listening: ['listeningGame', 'trainer'],
  listenchoose: 'listenchoose',
  words: 'words',
  numbers: 'numbers',
}

// Задачи плана дня («Сегодня» на главной): что из них реально начисляет токены — по тем же правилам, что и сервер.
const TASK_RULE_NAMES = {
  homework: 'Домашняя работа сдана',
  ai_tutor: 'Разговор голосом от 10 минут',
  shadowing: RULE_NAMES.shadowing,
}

const norm = (value) => String(value || '').trim().toLowerCase()

/** Сколько токенов даёт секция; 0 — ничего не обещаем (правила не пришли, выключено или секция не начисляет). */
export function sectionTokenPoints(rules, sectionId) {
  if (!Array.isArray(rules)) return 0
  // Запасное правило — только когда своего нет вовсе: своё с нулём значит «выключено», а не «спроси общее».
  for (const key of [].concat(SECTION_RULE[sectionId] || [])) {
    const rule = rules.find((item) => norm(item?.name) === norm(RULE_NAMES[key]))
    if (!rule) continue
    const points = Number(rule.points)
    return Number.isFinite(points) && points > 0 ? Math.floor(points) : 0
  }
  return 0
}

/**
 * Сколько токенов даёт задача плана: урок с преподавателем — по тарифу ученика, домашка и разговор со Speaking Buddy —
 * по своим правилам; остальное (урок курса, словарь) токенов не начисляет — 0.
 */
export function taskTokenPoints(data, task) {
  if (!data || !task) return 0
  if (task.kind === 'live') {
    const own = Number(data.myLessonPoints)
    const fallback = Number(data.lessonPoints?.gen)
    return Math.max(0, Number.isFinite(own) ? own : Number.isFinite(fallback) ? fallback : 0)
  }
  const key = task.kind === 'homework' ? 'homework' : task.kind === 'practice' ? task.module : null
  const name = TASK_RULE_NAMES[key]
  if (!name || !Array.isArray(data.practiceRules)) return 0
  const rule = data.practiceRules.find((item) => norm(item?.name) === norm(name))
  const points = Number(rule?.points)
  return Number.isFinite(points) && points > 0 ? Math.floor(points) : 0
}

/** Ближайший приз, на который токенов ещё не хватает; null — все призы периода открыты. */
export function nextPrizeOf(prizes, balance) {
  const closed = (Array.isArray(prizes) ? prizes : []).filter((prize) => Number(prize?.costTokens) > Number(balance))
  closed.sort((a, b) => Number(a.costTokens) - Number(b.costTokens))
  return closed[0] || null
}

/**
 * Границы монет периода: серебряная с нуля, фиолетовая с `silver`, золотая с `silver + purple`, максимум — `max`
 * (как CoinTier на сервере и легенда у учителя).
 */
export function coinLegend(period) {
  const silver = Math.max(0, Number(period?.silver) || 0)
  const purple = Math.max(0, Number(period?.purple) || 0)
  const max = Math.max(0, Number(period?.max) || 0)
  const goldFrom = silver + purple
  return [
    { key: 'silver', from: 0, to: Math.max(0, silver - 1) },
    { key: 'purple', from: silver, to: Math.max(silver, goldFrom - 1) },
    { key: 'gold', from: goldFrom, to: Math.max(goldFrom, max) },
  ]
}

let cache = null

/** Токены ученика одним запросом на всех, кто его просит; учителю и при ошибке сервера — null, блоки не рисуются. */
export function useStudentTokens(token) {
  const [data, setData] = useState(cache && cache.token === token ? cache.data : null)
  useEffect(() => {
    if (!token || isTeacher(token) || isStudentSectionHidden('tokens')) return undefined
    if (cache && cache.token === token && cache.data) {
      setData(cache.data)
      return undefined
    }
    let alive = true
    const request = cache && cache.token === token && cache.request
      ? cache.request
      : Promise.resolve().then(() => getMyTokens(token)).then((next) => {
        if (cache && cache.token === token) cache.data = next
        return next
      })
    if (!cache || cache.token !== token) cache = { token, request, data: null }
    request.then((next) => { if (alive) setData(next) }).catch(() => { if (cache && cache.request === request) cache = null })
    return () => { alive = false }
  }, [token])
  return isStudentSectionHidden('tokens') ? null : data
}

/** Правила токенов за практику; пусто, пока не пришли или у учителя. */
export function usePracticeTokenRules(token) {
  const data = useStudentTokens(token)
  return Array.isArray(data?.practiceRules) ? data.practiceRules : []
}

/** Для тестов: сбросить кэш между прогонами. */
export function resetPracticeTokenRulesCache() {
  cache = null
}
