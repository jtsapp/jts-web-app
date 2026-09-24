// @vitest-environment jsdom
// Рамки с пропуском («Would you mind …ing?») синтезом не озвучиваются: он
// читал их кашей («Would you mind, De Qing?»). У такой строки без записи нет
// кнопки «послушать», и браузерный синтез её тоже не читает.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer, { stopStageAudio } from './CourseStepPlayer.jsx'

const PHRASES = {
  stage: 'Говорение',
  type: 'phrases',
  title: 'Listen to each phrase.',
  items: [
    { text: 'Would you mind …ing?', src: null },
    { text: 'How about …?', src: '/course/a2/audio/aaaaaaaaaaaa.mp3' },
    { text: 'Good idea!', src: '/learning/audio/a2/bbbbbbbbbbbb.mp3' },
  ],
}

const RECORD = {
  stage: 'Говорение',
  type: 'record',
  title: 'Say it, then record yourself.',
  items: ['My closest friend is … .', 'We met at school.'],
  itemAudio: [null, '/learning/audio/b1/cccccccccccc.mp3'],
}

function play(step) {
  return render(
    <I18nProvider>
      <CourseStepPlayer steps={[step]} title="Frames" level="A2" onExit={() => {}} onDone={() => {}} />
    </I18nProvider>,
  )
}

afterEach(() => {
  stopStageAudio()
  vi.restoreAllMocks()
})

describe('CourseStepPlayer — рамки с пропуском', () => {
  it('фраза-рамка без записи — текст без кнопки; с записью диктора — кнопка', () => {
    play(PHRASES)
    const rows = [...document.querySelectorAll('.cp-phrases__row')]
    expect(rows.map((r) => r.tagName)).toEqual(['DIV', 'BUTTON', 'BUTTON'])
    expect(rows[0].querySelector('.cp-phrases__spk')).toBeNull()
  })

  it('рамку без записи браузерный синтез не читает', () => {
    const speak = vi.fn()
    window.speechSynthesis = { speak, cancel: () => {} }
    play(PHRASES)
    fireEvent.click(document.querySelector('.cp-phrases__row.is-frame'))
    expect(speak).not.toHaveBeenCalled()
  })

  it('образец-рамка для записи голоса — текстом, законченный образец — кнопкой', () => {
    play(RECORD)
    const lines = [...document.querySelectorAll('.cp-rec__line')]
    expect(lines.map((l) => l.tagName)).toEqual(['P', 'BUTTON'])
  })
})
