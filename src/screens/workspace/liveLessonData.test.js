// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'

// Метаданные урока подменяем: тест про конвейер, а не про сеть.
const getLiveLesson = vi.fn()
vi.mock('../../api.js', () => ({ getLiveLesson: (...a) => getLiveLesson(...a) }))

const { loadLiveLesson } = await import('./liveLessonData.js')

const RAW = {
  steps: [
    {
      id: 's1',
      title: 'Listening',
      blocks: [
        { type: 'info', html: '<p>Listen to the conversation.</p>', audio: { src: 'audio/track.mp3' } },
        { type: 'info', title: 'Meaning', html: '<p>Choose.</p><div class="row">She talked most. <select data-answer="most"><option value="">—</option><option value="rude">rude</option><option value="most">most</option></select></div>' },
      ],
    },
  ],
}

describe('живой урок проходит тот же конвейер, что урок каталога', () => {
  beforeEach(() => {
    getLiveLesson.mockReset()
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => JSON.parse(JSON.stringify(RAW)) }))
  })

  // Относительный путь к записи без конвейера остаётся относительным, и плеер
  // просит несуществующий адрес — запись молчит. Ровно это описали с урока:
  // «в живом уроке аудио не воспроизводится, а в домашке та же карточка играет».
  it('разворачивает относительный путь к записи относительно htmlUrl', async () => {
    getLiveLesson.mockResolvedValue({
      htmlUrl: 'https://files.example/lessons/a2/u7/lesson.html',
      jsonUrl: 'https://files.example/extracted/777.json',
    })

    const lesson = await loadLiveLesson(777, 'tok')
    const withAudio = lesson.steps[0].blocks.find((b) => b.audio)

    expect(withAudio.audio.src).toBe('https://files.example/lessons/a2/u7/audio/track.mp3')
  })

  // Без htmlUrl (старые уроки) база — сам jsonUrl: лучше, чем не разворачивать вовсе.
  it('без htmlUrl берёт за базу jsonUrl', async () => {
    getLiveLesson.mockResolvedValue({ jsonUrl: 'https://files.example/lessons/a2/u7/lesson.json' })

    const lesson = await loadLiveLesson(778, 'tok')
    const withAudio = lesson.steps[0].blocks.find((b) => b.audio)

    expect(withAudio.audio.src).toBe('https://files.example/lessons/a2/u7/audio/track.mp3')
  })

  // id вопросов считаются по дереву ПОСЛЕ подъёмов, а живой урок сводит
  // преподавателя и ученика именно по questionId. Сырой <select> задания не
  // давал вовсе.
  it('поднимает <select> в настоящий вопрос', async () => {
    getLiveLesson.mockResolvedValue({
      htmlUrl: 'https://files.example/l/lesson.html',
      jsonUrl: 'https://files.example/l/lesson.json',
    })

    const lesson = await loadLiveLesson(779, 'tok')
    const practice = lesson.steps[0].blocks.find((b) => b.type === 'practice')

    expect(practice?.questions?.length).toBe(1)
    expect(practice.questions[0].type).toBe('choice')
  })

  it('урока нет — отдаёт null, а не падает', async () => {
    getLiveLesson.mockResolvedValue({})
    expect(await loadLiveLesson(780, 'tok')).toBeNull()
  })
})
