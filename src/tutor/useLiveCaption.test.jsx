// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { useEffect, useState } from 'react'
import { act, render, screen } from '@testing-library/react'
import { useLiveCaption } from './useLiveCaption.js'

// В звонке рядом с подписью тикает таймер остатка сессии (useCountdown), и он
// дёргает setState на ТОМ ЖЕ фибере раз в секунду. Это не мелочь для теста:
// React считает новое состояние прямо в setState только пока у фибера нет
// незакрытых обновлений, иначе апдейтер выполняется отложенно — уже на
// следующем рендере. Поэтому в стенде тикающий сосед обязателен: без него баг
// прячется за быстрым путём React и тест зеленеет на сломанном коде.
function Stage({ tutorCaption, userCaption }) {
  const [tick, setTick] = useState(0)
  // Эффект таймера объявлен ДО хука подписи — как useCountdown в CallStage.
  // Порядок важен: он оставляет на фибере незакрытое обновление, и к моменту
  // setLive быстрый путь React уже недоступен.
  useEffect(() => {
    setTick((v) => v + 1)
  }, [tutorCaption, userCaption])
  const live = useLiveCaption(tutorCaption, userCaption)
  return (
    <div>
      <span data-testid="cap">{live.text}</span>
      <span data-testid="who">{live.isUser ? 'me' : 'tutor'}</span>
      <span data-testid="tick">{tick}</span>
    </div>
  )
}

const cap = () => screen.getByTestId('cap').textContent
const who = () => screen.getByTestId('who').textContent

describe('useLiveCaption', () => {
  it('показывает реплику тьютора и держит её после того, как он договорил', async () => {
    const { rerender } = render(<Stage tutorCaption="" userCaption="" />)
    expect(cap()).toBe('')

    await act(async () => {
      rerender(<Stage tutorCaption="How are you doing today?" userCaption="" />)
    })
    expect(cap()).toBe('How are you doing today?')
    expect(who()).toBe('tutor')

    // Тьютор замолчал, новых транскрипций нет — подпись обязана остаться.
    await act(async () => {
      rerender(<Stage tutorCaption="How are you doing today?" userCaption="" />)
    })
    expect(cap()).toBe('How are you doing today?')
  })

  it('перекидывает подпись на ученика и обратно на тьютора', async () => {
    const { rerender } = render(<Stage tutorCaption="How are you doing today?" userCaption="" />)
    await act(async () => {
      rerender(<Stage tutorCaption="How are you doing today?" userCaption="i am fine" />)
    })
    expect(cap()).toBe('i am fine')
    expect(who()).toBe('me')

    // Ровно этот переход и был сломан: реплика ученика уже лежала в seen, и
    // новая фраза тьютора не доезжала до экрана — подпись застревала.
    await act(async () => {
      rerender(<Stage tutorCaption="Great, tell me more." userCaption="i am fine" />)
    })
    expect(cap()).toBe('Great, tell me more.')
    expect(who()).toBe('tutor')

    await act(async () => {
      rerender(<Stage tutorCaption="Great, tell me more." userCaption="i went to the cinema" />)
    })
    expect(cap()).toBe('i went to the cinema')
    expect(who()).toBe('me')
  })

  it('обе стороны обновились разом — на экране ученик (перебивание)', async () => {
    const { rerender } = render(<Stage tutorCaption="One." userCaption="one" />)
    await act(async () => {
      rerender(<Stage tutorCaption="Two." userCaption="two" />)
    })
    expect(cap()).toBe('two')
    expect(who()).toBe('me')
  })

  it('пустые транскрипции не гасят подпись', async () => {
    const { rerender } = render(<Stage tutorCaption="Say it again." userCaption="" />)
    await act(async () => {
      rerender(<Stage tutorCaption="" userCaption="" />)
    })
    expect(cap()).toBe('Say it again.')
  })
})
