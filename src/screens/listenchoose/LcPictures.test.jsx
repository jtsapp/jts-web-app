// @vitest-environment jsdom
// Регрессия: ворота выбора ждали у всех четырёх фото статус 'loaded', и один
// отсутствующий файл держал их закрытыми навсегда — задание становилось
// тупиком, набор нельзя было закончить.
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import LcPictures from './LcPictures.jsx'

const QUESTION = { scene: 'park', answer: 2 }
const OPTIONS = ['a girl reading', 'a dog running', 'a man on a bench', 'two cyclists']
const ROUND = { order: [0, 1, 2, 3], wrong: [], resolved: false }

function renderPics(onReady) {
  return render(
    <LcPictures
      question={QUESTION}
      options={OPTIONS}
      round={ROUND}
      heard
      imagesReady={false}
      t={(k) => k}
      onPick={() => {}}
      onZoom={() => {}}
      onReady={onReady}
    />,
  )
}

const photos = () => [...document.querySelectorAll('.lc-opt img')]

describe('LcPictures — ворота выбора', () => {
  it('открываются, когда все четыре фото ответили, даже если одно не загрузилось', () => {
    const onReady = vi.fn()
    renderPics(onReady)
    const imgs = photos()

    fireEvent.load(imgs[0])
    fireEvent.load(imgs[1])
    fireEvent.error(imgs[2]) // файла нет
    expect(onReady).not.toHaveBeenCalledWith(true)

    fireEvent.load(imgs[3])
    expect(onReady).toHaveBeenLastCalledWith(true)
  })

  it('пока хоть одно фото молчит, ворота закрыты', () => {
    const onReady = vi.fn()
    renderPics(onReady)
    const imgs = photos()

    fireEvent.load(imgs[0])
    fireEvent.load(imgs[1])
    fireEvent.load(imgs[2])
    expect(onReady).not.toHaveBeenCalledWith(true)
  })

  it('«Try again» снова закрывает ворота до ответа фото', () => {
    const onReady = vi.fn()
    const view = renderPics(onReady)
    photos().forEach((img) => fireEvent.load(img))
    expect(onReady).toHaveBeenLastCalledWith(true)

    fireEvent.error(photos()[1])
    expect(onReady).toHaveBeenLastCalledWith(true) // «не смогло» — тоже ответ

    fireEvent.click(view.container.querySelector('.lc-imgretry button'))
    expect(onReady).toHaveBeenLastCalledWith(false)
  })
})
