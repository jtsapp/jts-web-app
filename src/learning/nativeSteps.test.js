import { describe, it, expect } from 'vitest'
import { tasksToSteps } from './nativeSteps.js'

// Уроки A0/A1 приходят кусками разметки исходного курса, и часть из них —
// не задания, а подписи к ним. Тесты держат именно эту границу: что становится
// экраном, что подписывает соседа, а что выбрасывается.
describe('nativeSteps — уроки A0/A1 в шаги', () => {
  it('инструкция перед заданием не даёт пустой экран, а подписывает его', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'info',
          sec: '1. Warm-up',
          html: '<div data-only="self"><div class="instruction">Tick the ones you like.</div><p class="subline">No right or wrong — just you.</p></div>',
        },
        { type: 'check', sec: '1. Warm-up', items: ['☕ coffee', '📅 Mondays'] },
      ],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({
      type: 'pick',
      stage: 'Warm-up',
      title: 'Tick the ones you like.',
      sub: 'No right or wrong — just you.',
    })
  })

  it('свой заголовок задания сильнее инструкции, подпись всё равно доезжает', () => {
    const steps = tasksToSteps({
      tasks: [
        { type: 'info', html: '<div class="instruction">Choose the right one.</div><p class="subline">Один вариант.</p>' },
        { type: 'choice', title: 'Своё название', options: ['a', 'b'], answer: 'a' },
      ],
    })

    expect(steps[0].title).toBe('Своё название')
    expect(steps[0].sub).toBe('Один вариант.')
  })

  it('блок с таблицей остаётся заметкой, а не подписью', () => {
    const steps = tasksToSteps({
      tasks: [{ type: 'info', html: '<div class="instruction">Form</div><table><tr><td>I like</td></tr></table>' }],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0].type).toBe('note')
  })

  it('плеер без звука выбрасывается: экстрактор потерял <audio>, осталась подпись дорожки', () => {
    const steps = tasksToSteps({
      tasks: [
        { type: 'info', html: '<div class="player"><div class="meta"><b>Track 6.2</b>Original coursebook recording</div></div>' },
        { type: 'choice', options: ['a', 'b'], answer: 'a' },
      ],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0].type).toBe('choice')
  })

  it('разминка с эмодзи идёт карточками, список «Я могу…» — строчками', () => {
    const warm = tasksToSteps({ tasks: [{ type: 'check', items: ['☕ coffee', '📅 Mondays'] }] })
    expect(warm[0]).toMatchObject({
      type: 'pick',
      options: [
        { emoji: '☕', label: 'coffee' },
        { emoji: '📅', label: 'Mondays' },
      ],
    })

    const canDo = tasksToSteps({ tasks: [{ type: 'check', items: ['say what I like', 'ask to repeat'] }] })
    expect(canDo[0].type).toBe('checklist')
  })

  it('у шага слушания остаётся абсолютный адрес дорожки — по нему играет плеер', () => {
    const steps = tasksToSteps({
      tasks: [{ type: 'listen', tracks: [{ src: 'https://files-dev.justtostudy.kz/a1/audio/A1_L1.mp3' }], options: ['a', 'b'], answer: 'a' }],
    })

    expect(steps[0]).toMatchObject({ type: 'listen', src: 'https://files-dev.justtostudy.kz/a1/audio/A1_L1.mp3' })
  })
})
