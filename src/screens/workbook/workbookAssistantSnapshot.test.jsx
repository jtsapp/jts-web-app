// @vitest-environment jsdom
// Что про ответ узнаёт помощник по сайту (снимок экрана) в воркбуке. Правило владельца: до проверки Луна даёт только
// подсказки. В воркбуке неверный пункт остаётся живым и его пересдают — ключ появляется только после «Показать ответ»,
// и никогда на зачётном уроке. Уроки настоящие (public/practice/workbook).
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { I18nProvider } from '../../i18n.jsx'
import WorkbookAct from './WorkbookAct.jsx'
import WorkbookReview from './WorkbookReview.jsx'
import { snapshotScreen } from '../../lib/assistant/screenSnapshot.js'

const read = (level, file) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/practice/workbook', level, file), 'utf8'))
const lessonOf = (level, n) => read(level, `lesson-${n}.json`)
const metaOf = (level) => read(level, 'meta.json')

const KEY = 'верный ответ по заданию'

function play(level, lesson, type) {
  const index = lesson.acts.findIndex((a) => a.t === type)
  const props = {
    level,
    lesson,
    index,
    meta: metaOf(level),
    progress: { prog: {} },
    slow: false,
    onSlow: () => {},
    onBack: () => {},
    onMenu: () => {},
    onDone: () => {},
    draft: '',
    onDraft: () => {},
  }
  const utils = render(
    <I18nProvider>
      <WorkbookAct {...props} />
    </I18nProvider>,
  )
  return { ...utils, act: lesson.acts[index] }
}

const button = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent))
const reveal = () => fireEvent.click(button(/Показать ответ/))
// Неверный вариант первого пункта выбора: любой, кроме ключа.
function pickWrong(act) {
  const it = act.items[0]
  const wrong = it.o.find((_, k) => k !== it.a)
  const item = document.querySelector('.wb-item')
  fireEvent.click([...item.querySelectorAll('.wb-opt')].find((b) => b.textContent === wrong))
  return { wrong, right: it.o[it.a] }
}

afterEach(() => cleanup())

describe('воркбук: ключ для помощника', () => {
  it('выбор: после промаха снимок видит неверный вариант, но ключа нет; после «Показать ответ» — ключ', () => {
    const { container, act } = play('a1', lessonOf('a1', 23), 'choose')
    expect(snapshotScreen(container)).not.toContain(KEY)

    const { wrong, right } = pickWrong(act)
    let snap = snapshotScreen(container)
    expect(snap).toContain(`[кнопка «${wrong}» (отмечено как неверное)]`)
    // Пункт живой: его пересдают, и Луна здесь только подсказывает.
    expect(snap).not.toContain(KEY)

    reveal()
    snap = snapshotScreen(container)
    expect(snap).toContain(`[${KEY}: «1) ${right};`)
    expect(snap).toContain(`(верный ответ показал сайт)`)
  })

  it('впиши слово: после «Показать ответ» ввод ученика не путается с ключом в поле', () => {
    const { container, act } = play('a1', lessonOf('a1', 23), 'type')
    const input = container.querySelector('input.wb-tin')
    fireEvent.change(input, { target: { value: 'boiled' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(snapshotScreen(container)).not.toContain(KEY)

    reveal()
    const snap = snapshotScreen(container)
    const first = act.items[0].a
    expect(snap).toContain(`ученик ввёл «boiled»`)
    expect(snap).toContain(`в поле сайт показал верный ответ «${first}»`)
    expect(snap).not.toContain(`ученик ввёл «${first}»`)
    // Пункты, которые ученик не трогал, — не «пустые»: ключ стоит и в них.
    expect(snap).toContain('ученик ничего не ввёл; в поле сайт показал верный ответ')
    expect(snap).toContain(`[${KEY}: «1) ${first}; 2) ${act.items[1].a}`)
  })

  it('верный ответ с первой попытки — ключа нет', () => {
    const { container, act } = play('a1', lessonOf('a1', 23), 'choose')
    const it0 = act.items[0]
    fireEvent.click([...document.querySelector('.wb-item').querySelectorAll('.wb-opt')].find((b) => b.textContent === it0.o[it0.a]))
    expect(snapshotScreen(container)).not.toContain(KEY)
  })

  it('зачётный урок: ключа нет и после «Показать ответ»', () => {
    const lesson = lessonOf('a2', 101)
    expect(lesson.test).toBe(true)
    const { container, act } = play('a2', lesson, 'choose')
    pickWrong(act)
    reveal()
    expect(snapshotScreen(container)).not.toContain(KEY)
  })

  it('разбор ошибок зачётного урока — пересдача, а не зачёт: после «Показать ответ» ключ есть', () => {
    const level = 'a2'
    const lesson = lessonOf(level, 101)
    const index = lesson.acts.findIndex((a) => a.t === 'choose')
    const { container } = render(
      <I18nProvider>
        <WorkbookReview
          level={level}
          lesson={lesson}
          index={index}
          missed={[0]}
          meta={metaOf(level)}
          slow={false}
          onSlow={() => {}}
          onBack={() => {}}
          onNext={() => {}}
          left={1}
        />
      </I18nProvider>,
    )
    const it0 = lesson.acts[index].items[0]
    const wrong = it0.o.find((_, k) => k !== it0.a)
    fireEvent.click([...container.querySelectorAll('.wb-opt')].find((b) => b.textContent === wrong))
    expect(snapshotScreen(container)).not.toContain(KEY)
    reveal()
    // Экран сужен до промаха — в ключе один пункт.
    expect(snapshotScreen(container)).toContain(`[${KEY}: «1) ${it0.o[it0.a]}»]`)
  })
})
