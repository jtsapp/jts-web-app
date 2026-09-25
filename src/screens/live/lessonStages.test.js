import { describe, it, expect } from 'vitest'
import { stageSteps, stageStatusById, parseStageMessage, parseStageListMessage, gotoStageMessage } from './lessonStages.js'

// Эталон снят с файла A0 · Урок 05 (ответ ручки …/lesson-view/stages).
const STAGES = [
  { index: 0, title: 'Warm-up', taskCount: 1 },
  { index: 1, title: 'Vocabulary', taskCount: 2 },
  { index: 2, title: 'Grammar', taskCount: 1 },
  { index: 3, title: 'Practice', taskCount: 5 },
]

describe('lessonStages — стадии файла в «Темах» ученика', () => {
  it('стадии становятся строками маршрута: id — индекс стадии, номер — с единицы', () => {
    expect(stageSteps(STAGES)).toEqual([
      { id: '0', order: 1, title: 'Warm-up' },
      { id: '1', order: 2, title: 'Vocabulary' },
      { id: '2', order: 3, title: 'Grammar' },
      { id: '3', order: 4, title: 'Practice' },
    ])
  })

  // Стадия без data-stage и без заголовка на сервере получает «Stage N» — та же
  // подпись и здесь, чтобы строка не оказалась пустой.
  it('стадия без названия подписывается по номеру', () => {
    expect(stageSteps([{ index: 0, title: '' }, { index: 1 }])).toEqual([
      { id: '0', order: 1, title: 'Stage 1' },
      { id: '1', order: 2, title: 'Stage 2' },
    ])
    expect(stageSteps(null)).toEqual([])
  })

  it('статусы: до текущей — пройдено, текущая, дальше — впереди', () => {
    expect(stageStatusById(STAGES, 2)).toEqual({ 0: 'done', 1: 'done', 2: 'current', 3: 'upcoming' })
    // До первого сообщения рамки ученик стоит на первой стадии.
    expect(stageStatusById(STAGES, 0)).toEqual({ 0: 'current', 1: 'upcoming', 2: 'upcoming', 3: 'upcoming' })
  })

  it('parseStageMessage принимает только stage от jts-lesson с целым индексом', () => {
    expect(parseStageMessage({ source: 'jts-lesson', type: 'stage', index: 3, total: 7 })).toEqual({ index: 3, total: 7 })
    // total рамка может не прислать — позиция от этого не теряется.
    expect(parseStageMessage({ source: 'jts-lesson', type: 'stage', index: 0 })).toEqual({ index: 0, total: null })
    expect(parseStageMessage({ source: 'jts-bridge', type: 'stage', index: 3 })).toBeNull()
    expect(parseStageMessage({ source: 'jts-lesson', type: 'mirror', index: 3 })).toBeNull()
    expect(parseStageMessage({ source: 'jts-lesson', type: 'stage', index: 'x' })).toBeNull()
    expect(parseStageMessage({ source: 'jts-lesson', type: 'stage', index: -1 })).toBeNull()
    expect(parseStageMessage(null)).toBeNull()
  })

  it('parseStageListMessage принимает названия разделов открытого урока', () => {
    expect(parseStageListMessage({ source: 'jts-lesson', type: 'stage-list', titles: ['Warm-up', 'Vocabulary'] }))
      .toEqual(['Warm-up', 'Vocabulary'])
    expect(parseStageListMessage({ source: 'jts-lesson', type: 'stage', titles: ['Warm-up'] })).toBeNull()
    expect(parseStageListMessage({ source: 'jts-lesson', type: 'stage-list', titles: [] })).toBeNull()
  })

  it('gotoStageMessage — сообщение рабочей области, которое ждёт скрипт в файле', () => {
    expect(gotoStageMessage(4)).toEqual({ source: 'jts-workspace', type: 'goto-stage', index: 4 })
  })
})
