// Сценарий пробного урока: какие блоки и в каком порядке показать.
//
// Урок ведёт преподаватель, и порядок здесь не такой, как в тесте: стартовую
// точку выбирает он на первом слайде, а дальше ветвление идёт от неё
// (Beginner получает мини-урок TO BE вместо интерактивной грамматики,
// Int–Upper — словарь перед чтением). Расчёты и оценка — тот же движок, что у
// теста (practice/placement): здесь только выбор заданий.
//
// Соответствие бандлу школы (index.html, JTS TRIAL LESSON LAYER): каждая
// функция ниже — один section* оттуда, с теми же наборами заданий.

import { seededShuffle, levelFromTheta } from '../practice/placement/engine.generated.js'
import {
  ROUTING_A1,
  TOBE_MCQ,
  VOCAB_MATCH,
  PREREAD_VOCAB,
  READING,
  VIDEO_FILL,
} from './content.generated.js'

/** Стартовые точки первого слайда: 0 — Beginner, 1 — Elementary–Pre-Int,
 *  3 — Int–Upper. Это индекс can-do движка, он же задаёт стартовую θ. */
export const BEGINNER = 0
export const ELEMENTARY = 1
export const INTERMEDIATE = 3

/** Порядок блоков урока. Ветка A0 (мост) вклинивается после разминки, если
 *  движок сочтёт, что уровень ниже стартового — как в бандле. */
export function trialPlan(startCando) {
  return [
    'routing',
    'vocab_match',
    startCando === BEGINNER ? 'tobe' : 'uoe2',
    'reading',
    'listening',
    'clip',
  ]
}

/** Разминка. Beginner получает облегчённый набор (A2×3 + A1×3) вместо
 *  лестницы A2..C1: логика вердикта A0-ветки при этом не меняется —
 *  заданий столько же. */
export function buildRouting(session, startCando) {
  if (startCando !== BEGINNER) {
    return { key: 'routing', items: session.buildRouting() }
  }
  const easy = seededShuffle(session.itemsOf('routing', 'A2'), session.rnd)
    .slice(0, 3)
    .concat(
      ROUTING_A1.map((q, i) => ({
        id: 'tr-r-a1-' + (i + 1),
        block: 'routing',
        level: 'A1',
        stem: q.stem,
        options: q.options.map((t) => ({ t })),
        key: q.key,
        construct: 'grammar.basic',
      })),
    )
  return { key: 'routing', items: seededShuffle(easy, session.rnd) }
}

/** A0-мост кликами: те же два задания движка, но вместо ввода — выбор слова.
 *  Ответ всё равно уходит текстом, поэтому checkOpenAnswer и вердикт ветки
 *  работают ровно как в тесте.
 *
 *  [optionsById] приходит с сервера (/api/placement/a0-options): верное слово
 *  лежит в ключах, а их в браузере нет. Собирать варианты здесь, как раньше,
 *  больше нельзя — `it.answer` в публичном банке пуст, и на экране получались
 *  четыре кнопки без единой верной.
 *
 *  Вариантов не пришло — задание остаётся как есть, и экран покажет обычное
 *  поле ввода (TrialLessonPage ветвится по наличию a0options): мост станет
 *  строже, но пройти его можно. */
export function buildA0Bridge(session, optionsById = {}) {
  const items = session.bridgeItems().map((it) => {
    if (it.a0options) return it
    const opts = optionsById?.[it.id]
    return Array.isArray(opts) && opts.length ? { ...it, a0options: opts } : it
  })
  return { key: 'a0_bridge', items }
}

/** Словарь: набор зависит от выбора преподавателя. Beginner — простые слова,
 *  Int–Upper — идиомы, между ними — по текущей оценке движка. */
export function buildVocabMatch(session, startCando) {
  const level =
    startCando <= BEGINNER
      ? 'A1'
      : startCando >= INTERMEDIATE
        ? 'B2'
        : session.clampLevel(levelFromTheta(session.est.theta), ['A2', 'B1'])
  const set = VOCAB_MATCH[level]
  return {
    key: 'vocab_match',
    title: set.name,
    hint: set.intro,
    items: [
      {
        id: 'vm-' + level.toLowerCase(),
        block: 'vocab_match',
        type: 'match',
        level,
        pairs: set.pairs,
        construct: 'vocab.match',
      },
    ],
  }
}

/** Мини-урок TO BE — только для Beginner. */
export function buildTobe() {
  return {
    key: 'tobe',
    items: TOBE_MCQ.map((q, i) => ({
      id: 'tobe-mcq-' + (i + 1),
      block: 'uoe2',
      level: 'A1',
      stem: q.stem,
      options: q.options.map((t) => ({ t })),
      key: q.key,
      construct: 'grammar.to_be',
    })),
  }
}

/** Интерактивная грамматика: только кликабельные форматы (порядок слов, банк
 *  слов, пары) — на пробном уроке ученик ничего не печатает. */
export function buildGrammar2(session) {
  const near = ['A1', 'A2', 'B1', 'B2', 'C1']
  const level = session.clampLevel(levelFromTheta(session.est.theta), near)
  const li = near.indexOf(level)
  const byDistance = (pool) =>
    pool
      .slice()
      .sort((a, b) => Math.abs(near.indexOf(a.level) - li) - Math.abs(near.indexOf(b.level) - li))
  const take = (type, n) =>
    byDistance(
      session.bank.items.filter(
        (it) => it.block === 'uoe2' && it.type === type && !session.used.has(it.id),
      ),
    ).slice(0, n)
  return { key: 'uoe2', items: [...take('order', 2), ...take('bankfill', 1), ...take('match', 1)] }
}

/** Слова перед чтением — лексика текста «Emma» для Int–Upper. */
export function buildPreRead() {
  return {
    key: 'preread',
    items: PREREAD_VOCAB.map((v) => ({
      id: v.id,
      block: 'vocab_match',
      type: 'match',
      level: v.level,
      title: v.title,
      pairs: v.pairs,
      construct: 'vocab.match',
    })),
  }
}

/** Какие тексты читаем: Elementary–Pre-Int выбирает преподаватель (один, оба
 *  или пропустить), остальным текст подбирается по оценке. */
export function readingLevels(session, startCando, teacherPick) {
  if (startCando === ELEMENTARY) return teacherPick || []
  if (startCando >= INTERMEDIATE) return ['B2']
  return [session.clampLevel(levelFromTheta(session.est.theta), ['A1', 'A2', 'B1', 'B2'])]
}

/** Уровень текста, предлагаемый преподавателю по умолчанию. */
export function suggestedReadingLevel(session) {
  return session.clampLevel(levelFromTheta(session.est.theta), ['A2', 'B1'])
}

/** Текст с вопросами: и текст, и вопросы — на одном экране, как в бандле. */
export function buildReading(level) {
  const text = READING[level]
  return {
    key: 'reading',
    level,
    title: text.title,
    text: text.text,
    items: text.qs.map((q, i) => ({
      id: 'tr-read-' + level.toLowerCase() + '-' + (i + 1),
      block: 'reading',
      level,
      stem: q.stem,
      options: q.options.map((t) => ({ t })),
      key: q.key,
      construct: 'reading.detail',
    })),
  }
}

/**
 * Аудирование: записи те же, что в тесте, но порядок источников другой.
 * При равной близости к уровню предпочитаем американских дикторов, а для
 * стартовых точек Elementary и Int–Upper — записи из присланных уроков
 * (просьба школы: на пробном уроке звучит тот же материал, что на занятии).
 */
export function listeningSources(session, manifest, startCando) {
  const near = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  const level = session.clampLevel(levelFromTheta(session.est.theta), near)
  const li = near.indexOf(level)
  const sourceOf = (id) => (manifest.sources || []).find((s) => s.id === id) || {}
  const levelOf = (id) => (session.bank.items.find((it) => it.source === id) || {}).level
  const isUs = (id) => ((sourceOf(id).lines || []).some((l) => /_US/i.test(l.speaker || '')) ? 1 : 0)
  const distance = (id) => Math.abs(near.indexOf(levelOf(id)) - li)

  let ids = [
    ...new Set(
      session.bank.items
        .filter((it) => it.block === 'listening' && !session.used.has(it.id))
        .map((it) => it.source),
    ),
  ]
  if (session.requireLines) ids = ids.filter((id) => (sourceOf(id).lines || []).length > 0)
  ids.sort((a, b) => distance(a) - distance(b) || isUs(b) - isUs(a))

  const LV = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  const at = (l) => LV.indexOf(levelFromTheta(session.est.theta)) >= LV.indexOf(l)
  let preferred = null
  if (startCando === ELEMENTARY) {
    preferred = at('B1')
      ? ['src-l-a2-03', 'src-l-a2-04', 'src-l-a2-01', 'src-l-a2-02']
      : ['src-l-a1-04', 'src-l-a1-02', 'src-l-a1-01', 'src-l-a1-03']
  } else if (startCando >= INTERMEDIATE) {
    preferred = at('B2') ? ['src-l-b2-05', 'src-l-b1-01'] : ['src-l-b1-01', 'src-l-b2-05']
  }
  if (preferred) {
    const provided = preferred.filter((id) => ids.includes(id))
    if (provided.length >= 2) ids = provided
  }
  return ids.slice(0, session.cfg.listenSources || 2)
}

export function buildListening(session, manifest, startCando) {
  const sources = listeningSources(session, manifest, startCando)
  const items = sources
    .flatMap((src) => session.bank.items.filter((it) => it.source === src && !session.used.has(it.id)))
    .slice(0, session.cfg.listenMax || 6)
  const groups = sources
    .map((id) => ({
      src: (manifest.sources || []).find((m) => m.id === id) || { id },
      items: items.filter((q) => q.source === id),
    }))
    .filter((g) => g.items.length)
  return { key: 'listening', groups }
}

/** Клипы с пропусками: до трёх просмотров, ответы — словами из набора. */
export function buildClips(startCando) {
  const set = startCando >= INTERMEDIATE ? VIDEO_FILL.high : VIDEO_FILL.low
  return {
    key: 'clip',
    items: set.map((v) => ({
      id: v.id,
      block: 'clip',
      type: 'bankfill',
      level: v.level,
      file: v.file,
      text: v.text,
      bankWords: v.bank,
      answers: v.answers,
      construct: 'listening.decoding',
    })),
  }
}
