// @vitest-environment jsdom
// Шаг «послушайте, затем запишите себя». Образец был строкой, и записи
// прописать было некуда — его читал только браузерный синтез: чужой голос
// посреди урока, а на Android без английского голоса — тишина. Теперь запись
// лежит рядом, в step.itemAudio; строки без записи работают как раньше.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer from './CourseStepPlayer.jsx'

function play(items, extra = {}) {
  return render(
    <I18nProvider>
      <CourseStepPlayer
        steps={[{ stage: 'Speaking', type: 'record', title: 'Произнесите предложения.', sub: '', items, ...extra }]}
        title="Weather"
        level="A0"
        onExit={() => {}}
        onDone={() => {}}
      />
    </I18nProvider>,
  )
}

// Что плеер попросил проиграть: адреса созданных Audio и тексты синтеза.
let played
let spoken

beforeEach(() => {
  played = []
  spoken = []
  vi.stubGlobal(
    'Audio',
    class {
      constructor(src) {
        this.src = src
        played.push(src)
      }
      play() {
        return Promise.resolve()
      }
      pause() {}
    },
  )
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text } })
  window.speechSynthesis = { speak: (u) => spoken.push(u.text), cancel: () => {} }
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.speechSynthesis
})

describe('CourseStepPlayer — образцы в шаге record', () => {
  it('запись из itemAudio играет файл, а не синтез', () => {
    play(["What's the weather like?", 'No audio.'], { itemAudio: ['/learning/audio/a0/abc.mp3', null] })
    fireEvent.click(screen.getByRole('button', { name: "What's the weather like?" }))
    fireEvent.click(screen.getByRole('button', { name: 'No audio.' }))
    expect(played).toEqual(['/learning/audio/a0/abc.mp3'])
    expect(spoken).toEqual(['No audio.'])
  })

  it('образец с записью играет файл, а не синтез', () => {
    play([{ text: "What's the weather like?", src: '/learning/audio/a0/abc.mp3' }])
    fireEvent.click(screen.getByRole('button', { name: "What's the weather like?" }))
    expect(played).toEqual(['/learning/audio/a0/abc.mp3'])
    expect(spoken).toEqual([])
  })

  it('образец-строка работает как раньше — через синтез', () => {
    play(["It's sunny and warm."])
    fireEvent.click(screen.getByRole('button', { name: "It's sunny and warm." }))
    expect(played).toEqual([])
    expect(spoken).toEqual(["It's sunny and warm."])
  })

  it('объект без записи — тоже синтез, а не падение', () => {
    play([{ text: 'Look! It is raining.', src: null }])
    fireEvent.click(screen.getByRole('button', { name: 'Look! It is raining.' }))
    expect(played).toEqual([])
    expect(spoken).toEqual(['Look! It is raining.'])
  })

  it('вперемешку — каждый образец показан своим текстом', () => {
    play([{ text: 'One.', src: '/a.mp3' }, 'Two.', { text: 'Three.' }])
    expect(screen.getByRole('button', { name: 'One.' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Two.' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Three.' })).toBeTruthy()
  })

  // Половина строк record у B1 — не образцы, а задания по-русски («Ответьте
  // вслух: кто ваш самый давний друг?»). Кнопкой «послушать» они были зря:
  // синтез с английским голосом читал кириллицу мусором, а записи у задания
  // нет и не будет — говорит здесь студент.
  it('задание по-русски — текст, а не кнопка «послушать»', () => {
    const task = 'Кто ваш самый давний друг? Как давно вы знакомы?'
    play([task, 'My closest friend is … .'])
    expect(screen.queryByRole('button', { name: task })).toBeNull()
    fireEvent.click(screen.getByText(task))
    expect(spoken).toEqual([])
    expect(played).toEqual([])
    expect(screen.getByRole('button', { name: 'My closest friend is … .' })).toBeTruthy()
  })
})
