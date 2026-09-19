import { describe, it, expect } from 'vitest'
import { simulateSession } from '../practice/placement/engine.generated.js'
import { gradeAnswers, scoreGradedAnswers, scorePlacementSession, loadFullBank } from './placementScore.js'
import { decideRun, mergeGradedAnswers } from './placementSessionLogic.js'

// Полный банк = публичная часть (её видит браузер) + ключи, которые остались
// на сервере. Прогоны движка идут по нему, а пересчёт — из тех же ключей.
const source = loadFullBank()

/** Прогон движка (тот же, которым школа валидирует банк) → журнал сессии. */
const run = (pattern, seed = 7) =>
  simulateSession(source.bank, source.manifest, source.vocab, seed, pattern, 'express').exportJson()

describe('scorePlacementSession', () => {
  it('повторяет вердикт движка по сырым ответам: слабый прогон → A0', () => {
    const session = run('weak')
    const scored = scorePlacementSession(session, source)

    expect(session.result.level).toBe('A0')
    expect(scored.level).toBe('A0')
    expect(scored.flags).toContain('a0_branch')
  })

  it('сильный прогон пересчитывается в верхнюю полосу', () => {
    const session = run('strong')
    const scored = scorePlacementSession(session, source)

    expect(session.result.level).toBe('C2')
    expect(scored.level).toBe('C2')
  })

  it('средний прогон совпадает с клиентским уровнем', () => {
    const session = run('mid', 3)
    const scored = scorePlacementSession(session, source)

    expect(scored.level).toBe(session.result.level)
  })

  it('заявленный уровень не влияет на пересчёт: сервер смотрит только ответы', () => {
    // Клиент присылает журнал слабого прогона, но объявляет себе C2.
    const session = run('weak')
    session.result = { ...session.result, level: 'C2', theta: 3 }

    expect(scorePlacementSession(session, source).level).toBe('A0')
  })

  it('подделанная самооценка не поднимает уровень', () => {
    // theta0 из журнала — это самооценка; берём только допустимые значения.
    const session = run('weak')
    session.theta0 = 99

    const scored = scorePlacementSession(session, source)
    expect(Number.isFinite(scored.theta)).toBe(true)
    expect(scored.level).toBe('A0')
  })

  it('незнакомые задания в журнал не идут и уровень не двигают', () => {
    const session = run('mid', 5)
    const withJunk = { ...session, log: [...session.log, { id: 'no-such-item', optIndex: 0 }] }

    const scored = scorePlacementSession(withJunk, source)
    expect(scored.level).toBe(scorePlacementSession(session, source).level)
  })

  it('пустой журнал не роняет пересчёт', () => {
    const scored = scorePlacementSession({ log: [] }, source)
    expect(scored.level).toBe('A0') // без ответов разминка считается проваленной
    expect(scored.verified).toBe(0)
  })

  it('считает, сколько ответов удалось перепроверить', () => {
    const session = run('mid', 11)
    const scored = scorePlacementSession(session, source)

    expect(scored.verified).toBeGreaterThan(0)
    expect(scored.verified + scored.unverified).toBe(session.log.length)
  })
})

// Регресс на реальный случай: «тест всегда показывает A0». Причина была не в
// подсчёте (он проверен выше), а в резюмировании: mergeGradedAnswers отдаёт
// на повтор СТАРЫЙ вердикт по каждому заданию (см. её докстринг — это защита
// от подбора ключа), и без очистки журнала брошенная попытка с наспех
// кликнутой разминкой приклеивалась к профилю — вторая, уже честная попытка
// на те же вопросы не могла её перебить. decideRun теперь отдаёт restart,
// а openPlacementSession чистит answers в той же строке.
describe('брошенный прогон и вторая попытка (интеграционно)', () => {
  const routingIds = () => source.bank.items.filter((i) => i.block === 'routing').slice(0, 6).map((i) => i.id)

  /** Ответы на разминку: verdict='wrong' — намеренно неверный optIndex,
   *  verdict='right' — берётся из ключей. */
  const routingAnswers = (verdict) =>
    routingIds().map((id) => {
      const item = source.bank.items.find((i) => i.id === id)
      const key = source.keys[id]?.key ?? item.key
      const optIndex = verdict === 'right' ? key : (key + 1) % item.options.length
      return { id, optIndex }
    })

  it('без очистки журнала (старое поведение): верная вторая попытка не перебивает старый вердикт', () => {
    // Тот же сценарий, что уронил живой тест, — сохранён как документация
    // причины, а не как желаемое поведение.
    const firstTry = mergeGradedAnswers([], gradeAnswers(routingAnswers('wrong'), source), { max: 60 })
    const secondTry = mergeGradedAnswers(firstTry.answers, gradeAnswers(routingAnswers('right'), source), { max: 60 })

    expect(secondTry.added).toBe(0) // все id «известны» по первой попытке
    expect(scoreGradedAnswers(secondTry.answers, null, source).level).toBe('A0')
  })

  it('с restart: брошенная попытка не тащит старый журнал, вторая попытка честная', () => {
    const firstTry = mergeGradedAnswers([], gradeAnswers(routingAnswers('wrong'), source), { max: 60 })

    // Открывает тест заново: decideRun → restart, openPlacementSession чистит
    // answers — новый прогон начинается с пустого журнала.
    const decision = decideRun({ token: 'run-1', finished: false, level: null })
    expect(decision.action).toBe('restart')

    const freshAnswers = mergeGradedAnswers([], gradeAnswers(routingAnswers('right'), source), { max: 60 }).answers
    expect(scoreGradedAnswers(freshAnswers, null, source).flags).not.toContain('a0_branch')

    void firstTry // firstTry оставался в БД до restart; после очистки его нет
  })
})
