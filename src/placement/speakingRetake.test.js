import { describe, it, expect } from 'vitest'
import { retakeArgs, speakingMissing, withSpeakingResult } from './speakingRetake.js'
import { reportView } from './reportModel.js'
import { validateEnvelope } from './envelope.js'

// Конверт Мансура (03.11.2026): три навыка пройдены, говорение пропущено.
const ENV = {
  schemaVersion: 1,
  source: 'jts_general_english_placement',
  assessment: {
    attemptId: 'jts_1_x',
    overallCEFR: 'B1',
    overallStatus: 'partial',
    speakingStatus: 'error',
    flags: ['speaking_connection_error', 'audio_technical_skip'],
    skillResults: {
      LU: { level: 'B1', total: 12, correct: 8 },
      R: { level: 'A2', total: 10, correct: 7 },
      L: { level: 'B1', total: 6, correct: 6 },
      S: { status: 'error' },
    },
    rawResult: { overall: { level: 'B1', partial: true, preliminary: true }, levels: { LU: 'B1', R: 'A2', L: 'B1', S: null }, skills: { S: { status: 'error' } }, flags: ['speaking_connection_error'] },
  },
  host: { savedAt: '2026-11-02T18:29:00Z' },
}
const GRADED = { status: 'completed', speaking_level: 'A2', confidence: 'medium', subscores: { range: 2 }, summary: 'Хорошо', strengths: ['темп'], improvements: [] }

describe('пересдача говорения с «Главной»', () => {
  it('говорения нет — можно пересдать; оценено — нельзя', () => {
    expect(speakingMissing(ENV)).toBe(true)
    expect(speakingMissing(withSpeakingResult(ENV, GRADED))).toBe(false)
    expect(speakingMissing(null)).toBe(false)
  })

  it('тема выбирается по уровням трёх навыков, как в тесте', () => {
    expect(retakeArgs(ENV)).toEqual({ grammarLevel: 'B1', readingLevel: 'A2', listeningLevel: 'B1' })
  })

  it('оценка ложится в конверт так же, как её пишет тест: уровень, отзыв, без меток отказа, итог «предварительный»', () => {
    const next = withSpeakingResult(ENV, GRADED)
    expect(validateEnvelope(next).ok).toBe(true)
    const a = next.assessment
    expect(a.skillResults.S).toMatchObject({ status: 'completed', level: 'A2', confidence: 'medium', feedback: { summary: 'Хорошо' } })
    expect(a.speakingStatus).toBe('completed')
    expect(a.flags).toEqual(['audio_technical_skip'])
    expect(a.overallStatus).toBe('preliminary')
    expect(a.overallCEFR).toBe('B1')
    expect(a.rawResult.overall.partial).toBe(false)
    expect(a.rawResult.levels.S).toBe('A2')
    const view = reportView(next, 'ru')
    expect(view.skills.find((s) => s.id === 'S')).toMatchObject({ level: 'A2', assessed: true })
    expect(view.partial).toBe(false)
  })

  it('не все навыки пройдены — итог остаётся частичным', () => {
    const env = { ...ENV, assessment: { ...ENV.assessment, skillResults: { ...ENV.assessment.skillResults, L: { status: 'skipped' } } } }
    expect(withSpeakingResult(env, GRADED).assessment.overallStatus).toBe('partial')
  })

  it('уровень, выставленный вручную, остаётся ручным', () => {
    const env = { ...ENV, assessment: { ...ENV.assessment, overallStatus: 'manual', skillResults: {} } }
    expect(withSpeakingResult(env, GRADED).assessment.overallStatus).toBe('manual')
  })

  it('не оценка (слишком коротко, сбой) — конверт не трогаем', () => {
    expect(withSpeakingResult(ENV, { status: 'insufficient' })).toBeNull()
    expect(withSpeakingResult(ENV, { status: 'completed', speaking_level: 'Z9' })).toBeNull()
  })
})
