// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import LessonPlayer from './LessonPlayer.jsx'
import { recordSkill } from '../practice/skillStats.js'

// Рейтинг навыков пишется в localStorage и на бэкенд — в тестах плеера нас
// интересует только, какой навык плеер засчитал за ответ.
vi.mock('../practice/skillStats.js', () => ({ recordSkill: vi.fn() }))

function renderLesson(tasks, props = {}) {
  const lesson = { code: 'L01-1', title: 'Тест', tasks }
  return render(
    <I18nProvider>
      <LessonPlayer lesson={lesson} level="a0" token="t" onExit={() => {}} onDone={() => {}} {...props} />
    </I18nProvider>,
  )
}

const orderTask = {
  type: 'order',
  sec: '4. Practice',
  word: 'Собери предложение',
  words: ['coffee', 'I', 'like'],
  answer: ['I', 'like', 'coffee'],
  why: 'подлежащее, глагол, дополнение',
}

describe('LessonPlayer — задание order', () => {
  it('кнопка проверки недоступна, пока собраны не все слова', () => {
    renderLesson([orderTask])
    const check = screen.getByRole('button', { name: /проверить/i })
    expect(check.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'I' }))
    expect(screen.getByRole('button', { name: /проверить/i }).disabled).toBe(true)
  })

  it('верный порядок засчитывается и даёт монеты', () => {
    const onDone = vi.fn()
    renderLesson([orderTask], { onDone })
    for (const word of ['I', 'like', 'coffee']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/верно/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }))
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'success', correct: 1, wrong: 0, points: 10 }))
  })

  it('неверный порядок показывает правильный ответ', () => {
    renderLesson([orderTask])
    for (const word of ['coffee', 'I', 'like']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/неверно/i)).toBeTruthy()
    expect(screen.getByText(/I like coffee/)).toBeTruthy()
  })

  it('повторный клик по слову возвращает его в банк', () => {
    renderLesson([orderTask])
    const word = screen.getByRole('button', { name: 'I' })
    fireEvent.click(word)
    fireEvent.click(screen.getByRole('button', { name: 'I' }))
    expect(screen.getByRole('button', { name: /проверить/i }).disabled).toBe(true)
  })

  // Находка 1 (Important): строка ответа должна показывать верно/неверно теми же
  // цветами и в той же манере, что choice (correct/wrong) и chips (ok/no) — не
  // одинаковой рамкой независимо от правильности.
  it('верный порядок красит строку ответа классом ok, как у соседних типов', () => {
    const { container } = renderLesson([orderTask])
    for (const word of ['I', 'like', 'coffee']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    const line = container.querySelector('.kl-order__line')
    expect(line.classList.contains('ok')).toBe(true)
    expect(line.classList.contains('no')).toBe(false)
  })

  it('неверный порядок красит строку ответа классом no, а не тем же стилем, что верный', () => {
    const { container } = renderLesson([orderTask])
    for (const word of ['coffee', 'I', 'like']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    const line = container.querySelector('.kl-order__line')
    expect(line.classList.contains('no')).toBe(true)
    expect(line.classList.contains('ok')).toBe(false)
  })

  // Находка 2 (Minor): слово может повторяться в банке (реальные данные,
  // public/learning/a0.json → L07-4.tasks[16]). Кнопки не шафлятся (в отличие от
  // choice/chips), поэтому порядок в DOM совпадает с порядком words — это и есть
  // устойчивый способ адресоваться к конкретной из двух одинаковых кнопок.
  it('слово, повторяющееся в банке дважды, собирается в правильном порядке по индексу', () => {
    const onDone = vi.fn()
    const dupTask = {
      type: 'order',
      sec: '4. Practice',
      word: 'Собери предложение',
      words: ['What', 'do', 'do', 'you'],
      answer: ['What', 'do', 'you', 'do'],
    }
    renderLesson([dupTask], { onDone })
    const dos = screen.getAllByRole('button', { name: 'do' })
    fireEvent.click(screen.getByRole('button', { name: 'What' }))
    fireEvent.click(dos[0]) // words[1] — первое «do»
    fireEvent.click(screen.getByRole('button', { name: 'you' }))
    fireEvent.click(dos[1]) // words[2] — второе «do»
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/верно/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }))
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'success', correct: 1, wrong: 0 }))
  })

  // Находка 3 (Minor): пустой список слов не должен засчитывать ответ без клика —
  // 0 === 0 совпадает по длине сразу же, если не проверить words.length явно.
  it('пустой список слов не активирует кнопку проверки сразу', () => {
    renderLesson([{ ...orderTask, words: [], answer: [] }])
    expect(screen.getByRole('button', { name: /проверить/i }).disabled).toBe(true)
  })

  // Находка 4 (Minor): kl-order на банке слов был мёртвым классом — без единого
  // правила в styles.css и без использования как селектора. Банк order должен
  // выглядеть и размечаться так же, как обычный kl-bank у соседних типов.
  it('банк слов не несёт мёртвый класс kl-order', () => {
    const { container } = renderLesson([orderTask])
    const bank = container.querySelector('.kl-bank')
    expect(bank.classList.contains('kl-order')).toBe(false)
  })
})

const multiTask = {
  type: 'multi',
  sec: '5. Listening',
  word: 'Отметь всё, что услышал',
  options: ['read', 'cook', 'travel'],
  answer: [0, 2],
  why: '',
}

describe('LessonPlayer — задание multi', () => {
  it('проверка недоступна, пока ничего не отмечено', () => {
    renderLesson([multiTask])
    expect(screen.getByRole('button', { name: /проверить/i }).disabled).toBe(true)
  })

  it('точное совпадение набора — верно', () => {
    const onDone = vi.fn()
    renderLesson([multiTask], { onDone })
    fireEvent.click(screen.getByRole('button', { name: 'read' }))
    fireEvent.click(screen.getByRole('button', { name: 'travel' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/верно/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }))
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: 1, wrong: 0 }))
  })

  it('лишний отмеченный вариант — неверно, показан эталон', () => {
    renderLesson([multiTask])
    for (const option of ['read', 'cook', 'travel']) fireEvent.click(screen.getByRole('button', { name: option }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/неверно/i)).toBeTruthy()
    expect(screen.getByText(/read, travel/)).toBeTruthy()
  })

  // Находка (Important, Task 8): этот случай раньше проверялся только временным
  // тестом, который удалили — повторный клик должен снимать отметку (a не
  // только добавлять её), иначе с одним отмеченным вариантом кнопка проверки
  // навсегда остаётся доступной даже после его отмены.
  it('повторный клик по отмеченному варианту снимает отметку и блокирует проверку', () => {
    renderLesson([multiTask])
    const readBtn = screen.getByRole('button', { name: 'read' })
    fireEvent.click(readBtn)
    expect(readBtn.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /проверить/i }).disabled).toBe(false)

    fireEvent.click(readBtn)
    expect(readBtn.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: /проверить/i }).disabled).toBe(true)
  })

  // Находка (Important, Task 8): второй удалённый временный случай — неполный
  // набор. Отмечена только часть верных вариантов ('read' из ['read', 'travel']),
  // сравнение длин в bind() должно засчитать это как неверный ответ и показать
  // полный эталон, а не засчитать частичное совпадение.
  it('отмечена только часть верных вариантов — неверно, показан полный эталон', () => {
    renderLesson([multiTask])
    fireEvent.click(screen.getByRole('button', { name: 'read' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/неверно/i)).toBeTruthy()
    expect(screen.getByText(/read, travel/)).toBeTruthy()
  })

  // Находка (Minor, Task 8): kl-multi на контейнере вариантов — мёртвый класс,
  // без единого правила в styles.css (та же находка, что раньше закрывалась
  // для kl-order на банке слов — тем же способом, удалением).
  it('контейнер вариантов не несёт мёртвый класс kl-multi', () => {
    const { container } = renderLesson([multiTask])
    const opts = container.querySelector('.kl-opts')
    expect(opts.classList.contains('kl-multi')).toBe(false)
  })
})

describe('LessonPlayer — пояснение why', () => {
  it('показывает пояснение после неверного ответа', () => {
    renderLesson([orderTask])
    for (const word of ['coffee', 'I', 'like']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/подлежащее, глагол, дополнение/)).toBeTruthy()
  })

  it('показывает пояснение и после верного ответа', () => {
    renderLesson([orderTask])
    for (const word of ['I', 'like', 'coffee']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/подлежащее, глагол, дополнение/)).toBeTruthy()
  })

  it('без why лишней строки нет', () => {
    renderLesson([{ ...orderTask, why: '' }])
    for (const word of ['I', 'like', 'coffee']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(document.querySelector('.kl-fb__why')).toBeNull()
  })
})

// Находка ревью: 274 задания A0 «Listen. Choose the word you hear.» отвечать
// было нечем — слово озвучивал синтезатор речи исходного курса, а до плеера
// оно не доезжало. Теперь слово приходит в task.say и читается по кнопке.
describe('LessonPlayer — озвучка слова (task.say)', () => {
  const sayTask = {
    type: 'choice',
    sec: '2. Vocabulary',
    word: '',
    say: 'repeat',
    options: ['repeat', 'listen', 'match', 'answer'],
    answer: 'repeat',
    why: '',
  }

  // jsdom синтеза речи не реализует, поэтому «поддерживаемый» случай собираем
  // вручную — заодно это ровно тот контракт Web Speech API, на который
  // рассчитывает плеер: объекты, список голосов и событие voiceschanged.
  function stubSpeech({ voices = [{ lang: 'en-GB', name: 'Daniel' }] } = {}) {
    const spoken = []
    const cancel = vi.fn()
    const listeners = {}
    let voiceList = voices
    class Utterance {
      constructor(text) {
        this.text = text
      }
    }
    window.SpeechSynthesisUtterance = Utterance
    window.speechSynthesis = {
      cancel,
      speak: (u) => spoken.push(u),
      getVoices: () => voiceList,
      addEventListener: (type, fn) => {
        listeners[type] = fn
      },
      removeEventListener: (type) => {
        delete listeners[type]
      },
    }
    // Голоса появляются позже — так это и происходит в Chrome: первый
    // getVoices() пуст, список приезжает событием.
    const arriveVoices = (list) => {
      voiceList = list
      act(() => listeners.voiceschanged && listeners.voiceschanged())
    }
    return { spoken, cancel, arriveVoices }
  }

  afterEach(() => {
    delete window.SpeechSynthesisUtterance
    delete window.speechSynthesis
  })

  it('нажатие на кнопку озвучивает слово британским голосом в замедленном темпе', () => {
    const { spoken } = stubSpeech()
    renderLesson([sayTask])
    fireEvent.click(screen.getByRole('button', { name: /прослушать слово/i }))
    expect(spoken).toHaveLength(1)
    expect(spoken[0]).toMatchObject({ text: 'repeat', lang: 'en-GB', rate: 0.85 })
  })

  it('повторное нажатие переозвучивает, отменив предыдущую реплику', () => {
    const { spoken, cancel } = stubSpeech()
    renderLesson([sayTask])
    const play = screen.getByRole('button', { name: /прослушать слово/i })
    fireEvent.click(play)
    fireEvent.click(play)
    expect(spoken).toHaveLength(2)
    expect(cancel).toHaveBeenCalledTimes(2)
  })

  it('слово не показывается текстом — оно и есть ответ', () => {
    stubSpeech()
    const { container } = renderLesson([sayTask])
    expect(container.querySelector('.kl-word')).toBeNull()
    // Единственный «repeat» на экране — вариант ответа, а не подсказка.
    expect(screen.getAllByText('repeat')).toHaveLength(1)
  })

  it('с синтезом задание остаётся оценочным: неверный ответ снимает сердце', () => {
    stubSpeech()
    const { container } = renderLesson([sayTask])
    fireEvent.click(screen.getByRole('button', { name: 'listen' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(container.querySelector('.kl__hearts b').textContent).toBe('2')
  })

  // Синтеза может не быть (WebView без голосов, отключённый TTS). Без него
  // задание нельзя оставлять оценочным: студент угадывал бы один к четырём и
  // терял сердце за промах.
  it('без синтеза слово показывается текстом и кнопки озвучки нет', () => {
    renderLesson([sayTask])
    expect(screen.queryByRole('button', { name: /прослушать слово/i })).toBeNull()
    expect(screen.getByText('repeat', { selector: '.kl-word' })).toBeTruthy()
  })

  // Находка (Minor): раньше без синтеза варианты оставались кликабельными, а
  // клик не делал ничего — ни проверки, ни фидбэка. Упражнение с подсказанным
  // ответом остаётся упражнением, поэтому проверка и фидбэк сохраняются, а
  // снимаются только монеты и сердца.
  it('без синтеза проверка и фидбэк остаются, но монет и сердец нет', () => {
    const onDone = vi.fn()
    const { container } = renderLesson([sayTask], { onDone })
    fireEvent.click(screen.getByRole('button', { name: 'listen' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/неверно/i)).toBeTruthy()
    expect(container.querySelector('.kl__hearts b').textContent).toBe('3')
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }))
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'success', correct: 0, wrong: 0, points: 0 }))
  })

  it('без синтеза верный ответ не приносит монет — ответ был подсказан на экране', () => {
    const { container } = renderLesson([sayTask])
    fireEvent.click(screen.getByRole('button', { name: 'repeat' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(screen.getByText(/верно/i)).toBeTruthy()
    expect(container.querySelector('.kl-reward')).toBeNull()
  })

  it('без синтеза ответ не идёт в рейтинг навыков', () => {
    recordSkill.mockClear()
    renderLesson([sayTask])
    fireEvent.click(screen.getByRole('button', { name: 'repeat' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(recordSkill).not.toHaveBeenCalled()
  })

  it('ответ на задание со слова засчитывается в listening, даже если стадия называется иначе', () => {
    stubSpeech()
    recordSkill.mockClear()
    renderLesson([sayTask])
    fireEvent.click(screen.getByRole('button', { name: 'repeat' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(recordSkill).toHaveBeenCalledWith('listening', true)
  })
})

// Находка ревью: новые типы order и multi не засчитывались ни в один навык —
// у gap есть writing, у listen listening, а эти два опирались только на имя
// стадии, и при нейтральном названии («Practice», «Recall») ответ студента
// не попадал в рейтинг вообще.
describe('LessonPlayer — навыки за новые типы заданий', () => {
  const answerOrder = () => {
    for (const word of ['I', 'like', 'coffee']) fireEvent.click(screen.getByRole('button', { name: word }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
  }

  it('order на нейтральной стадии засчитывается в грамматику', () => {
    recordSkill.mockClear()
    renderLesson([{ ...orderTask, sec: '4. Practice' }])
    answerOrder()
    expect(recordSkill).toHaveBeenCalledWith('grammar', true)
  })

  it('multi на нейтральной стадии засчитывается в лексику', () => {
    recordSkill.mockClear()
    renderLesson([{ ...multiTask, sec: '4. Recall' }])
    fireEvent.click(screen.getByRole('button', { name: 'read' }))
    fireEvent.click(screen.getByRole('button', { name: 'travel' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(recordSkill).toHaveBeenCalledWith('vocab', true)
  })

  it('навык стадии сохраняется рядом с навыком типа', () => {
    recordSkill.mockClear()
    renderLesson([multiTask]) // sec = «5. Listening»
    fireEvent.click(screen.getByRole('button', { name: 'read' }))
    fireEvent.click(screen.getByRole('button', { name: 'travel' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    const skills = recordSkill.mock.calls.map(([skill]) => skill)
    expect(skills).toContain('listening')
    expect(skills).toContain('vocab')
  })
})

// Находка ревью (Important): проверка доступности синтеза ловила только наличие
// объектов API. В Android WebView без голосовых данных, в части сборок Linux и
// при отключённом голосовом движке объекты есть, getVoices() пуст, а speak()
// молчит — кнопка рисовалась, звука не было, задание оставалось оцениваемым, и
// студент терял сердце на угадайке один к четырём. Плюс у реплики не было
// обработчика ошибки: тихий отказ движка ничем не ловился.
describe('LessonPlayer — доступность синтеза речи', () => {
  const sayTask = {
    type: 'choice',
    sec: '2. Vocabulary',
    word: '',
    say: 'repeat',
    options: ['repeat', 'listen', 'match', 'answer'],
    answer: 'repeat',
    why: '',
  }

  function stubSpeech({ voices = [{ lang: 'en-GB', name: 'Daniel' }] } = {}) {
    const spoken = []
    const cancel = vi.fn()
    const listeners = {}
    let voiceList = voices
    class Utterance {
      constructor(text) {
        this.text = text
      }
    }
    window.SpeechSynthesisUtterance = Utterance
    window.speechSynthesis = {
      cancel,
      speak: (u) => spoken.push(u),
      getVoices: () => voiceList,
      addEventListener: (type, fn) => {
        listeners[type] = fn
      },
      removeEventListener: (type) => {
        delete listeners[type]
      },
    }
    const arriveVoices = (list) => {
      voiceList = list
      act(() => listeners.voiceschanged && listeners.voiceschanged())
    }
    return { spoken, cancel, arriveVoices }
  }

  afterEach(() => {
    delete window.SpeechSynthesisUtterance
    delete window.speechSynthesis
  })

  it('объекты API есть, а голосов нет — кнопки озвучки нет, слово показано текстом', () => {
    stubSpeech({ voices: [] })
    renderLesson([sayTask])
    expect(screen.queryByRole('button', { name: /прослушать слово/i })).toBeNull()
    expect(screen.getByText('repeat', { selector: '.kl-word' })).toBeTruthy()
  })

  it('голосов нет — верный ответ не приносит монет и сердце за промах цело', () => {
    stubSpeech({ voices: [] })
    const { container } = renderLesson([sayTask])
    fireEvent.click(screen.getByRole('button', { name: 'listen' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(container.querySelector('.kl__hearts b').textContent).toBe('3')
  })

  it('голоса приезжают событием voiceschanged — кнопка появляется, задание снова оценивается', () => {
    const { arriveVoices } = stubSpeech({ voices: [] })
    const { container } = renderLesson([sayTask])
    expect(screen.queryByRole('button', { name: /прослушать слово/i })).toBeNull()

    arriveVoices([{ lang: 'en-GB', name: 'Daniel' }])
    expect(screen.getByRole('button', { name: /прослушать слово/i })).toBeTruthy()
    expect(container.querySelector('.kl-word')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'listen' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(container.querySelector('.kl__hearts b').textContent).toBe('2')
  })

  it('ошибка произнесения переключает урок в текстовый режим', () => {
    const { spoken } = stubSpeech()
    const { container } = renderLesson([sayTask])
    fireEvent.click(screen.getByRole('button', { name: /прослушать слово/i }))
    act(() => spoken[0].onerror({ error: 'synthesis-failed' }))

    expect(screen.queryByRole('button', { name: /прослушать слово/i })).toBeNull()
    expect(screen.getByText('repeat', { selector: '.kl-word' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'listen' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    expect(container.querySelector('.kl__hearts b').textContent).toBe('3')
  })

  it('отмена предыдущей реплики отказом синтеза не считается', () => {
    const { spoken } = stubSpeech()
    renderLesson([sayTask])
    const play = screen.getByRole('button', { name: /прослушать слово/i })
    fireEvent.click(play)
    fireEvent.click(play)
    // Второе нажатие снимает первую реплику, и та сообщает об этом через error.
    act(() => spoken[0].onerror({ error: 'interrupted' }))
    expect(screen.getByRole('button', { name: /прослушать слово/i })).toBeTruthy()
  })

  it('уход с урока останавливает речь — иначе голос говорит поверх карты', () => {
    const { cancel } = stubSpeech()
    const { unmount } = renderLesson([sayTask])
    fireEvent.click(screen.getByRole('button', { name: /прослушать слово/i }))
    cancel.mockClear()
    unmount()
    expect(cancel).toHaveBeenCalled()
  })
})

// Находка ревью (Important): в A1 уроках 16 и 25 текст для чтения жил только в
// атрибуте data-say кнопки курса. Теперь он доезжает до узла info-блоком, а
// поле say даёт ему ту же озвучку, что и словам заданий на слух.
describe('LessonPlayer — озвучка текста для чтения', () => {
  const passageTask = {
    type: 'info',
    sec: '7. Read',
    html: '<p>Phone battery dying? First, open Settings.</p>',
    say: 'Phone battery dying? First, open Settings.',
  }

  function stubSpeech() {
    const spoken = []
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text
      }
    }
    window.speechSynthesis = {
      cancel: vi.fn(),
      speak: (u) => spoken.push(u),
      getVoices: () => [{ lang: 'en-GB' }],
      addEventListener: () => {},
      removeEventListener: () => {},
    }
    return spoken
  }

  afterEach(() => {
    delete window.SpeechSynthesisUtterance
    delete window.speechSynthesis
  })

  it('кнопка озвучивает весь абзац и называется «прослушать текст», а не «слово»', () => {
    const spoken = stubSpeech()
    renderLesson([passageTask])
    fireEvent.click(screen.getByRole('button', { name: /прослушать текст/i }))
    expect(spoken).toHaveLength(1)
    expect(spoken[0]).toMatchObject({ text: passageTask.say, lang: 'en-GB' })
  })

  it('без синтеза текст не дублируется подсказкой — он и так напечатан на экране', () => {
    const { container } = renderLesson([passageTask])
    expect(container.querySelector('.kl-word')).toBeNull()
    expect(container.querySelector('.kl-note')).toBeNull()
    expect(screen.getByText(/Phone battery dying/)).toBeTruthy()
  })

  it('info с озвучкой остаётся информационным: сразу «Продолжить», без проверки', () => {
    stubSpeech()
    renderLesson([passageTask])
    expect(screen.queryByRole('button', { name: /^проверить$/i })).toBeNull()
    expect(screen.getByRole('button', { name: /продолжить/i })).toBeTruthy()
  })
})

// Находка ревью (Minor): чек-лист сообщал отметку только классом и символом ✓ —
// вспомогательным технологиям состояние не доезжало, а волна заводит в этот
// компонент 47 новых заданий.
describe('LessonPlayer — доступность чек-листа', () => {
  const checkTask = { type: 'check', sec: '1. Warm-up', items: ['☕ coffee', '🎵 music'] }

  it('пункт сообщает состояние отметки через aria-pressed', () => {
    renderLesson([checkTask])
    const item = screen.getByRole('button', { name: /coffee/ })
    expect(item.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(item)
    expect(item.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(item)
    expect(item.getAttribute('aria-pressed')).toBe('false')
  })

  it('декоративная галочка не читается как часть подписи пункта', () => {
    const { container } = renderLesson([checkTask])
    expect(container.querySelector('.kl-check__box').getAttribute('aria-hidden')).toBe('true')
  })
})
