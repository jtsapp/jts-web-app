// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { snapshotScreen } from './screenSnapshot.js'

const mount = (html) => {
  document.body.innerHTML = `<div id="root">${html}</div>`
  return document.getElementById('root')
}

describe('снимок экрана', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  // Ровно тот случай, ради которого снимок затевался: помощник должен увидеть
  // и задание, и что ученик ввёл, и что написал экран в ответ.
  it('видит задание, ответ ученика и разбор после проверки', () => {
    const root = mount(`
      <h2>Turn the statement into a question:</h2>
      <p>Clare is reading.</p>
      <input class="lw-gap-input is-wrong" aria-label="Ваш ответ" />
      <div class="kl-fb no"><b>Неверный ответ</b>
        <span>Правильный ответ: is clare reading. Put is first.</span></div>
      <button>Продолжить</button>`)
    root.querySelector('input').value = 'Is Cleare reading?'

    const snap = snapshotScreen(root)
    expect(snap).toContain('Turn the statement into a question:')
    expect(snap).toContain('Clare is reading.')
    expect(snap).toContain('[поле Ваш ответ: ученик ввёл «Is Cleare reading?» (отмечено как неверное)]')
    expect(snap).toContain('Правильный ответ: is clare reading.')
    expect(snap).toContain('[кнопка «Продолжить»]')
  })

  it('не выдаёт пароли, email и телефон — только что поле есть', () => {
    const root = mount(`
      <input type="password" value="secret123" />
      <input type="email" value="a@b.kz" />
      <input type="tel" value="+77010000000" />
      <input type="hidden" value="token" />`)
    const snap = snapshotScreen(root)
    expect(snap).not.toMatch(/secret123|a@b\.kz|77010000000|token/)
    expect(snap.match(/\[поле ввода\]/g)).toHaveLength(3)
  })

  it('пропускает скрытое и помеченное data-assistant-ignore', () => {
    const root = mount(`
      <p>видно</p>
      <p hidden>hidden-attr</p>
      <p style="display:none">inline-none</p>
      <p aria-hidden="true">aria</p>
      <div data-assistant-ignore><p>сам помощник</p></div>
      <script>var x = 1</script>`)
    const snap = snapshotScreen(root)
    expect(snap).toBe('видно')
  })

  it('разбивает блоки на строки и схлопывает пробелы', () => {
    const root = mount('<h1>  Заголовок  </h1><p>первая   строка</p><span>и</span> <span>хвост</span>')
    expect(snapshotScreen(root)).toBe('Заголовок\nпервая строка\nи хвост')
  })

  it('обрезает длинный снимок с пометкой', () => {
    const root = mount(`<p>${'a'.repeat(100)}</p>`)
    const snap = snapshotScreen(root, { maxChars: 20 })
    expect(snap).toBe(`${'a'.repeat(20)}\n…[снимок обрезан]`)
  })

  it('показывает пустое поле, выбор и отметки', () => {
    const root = mount(`
      <input placeholder="Введите ответ" />
      <select><option>A</option><option selected>B</option></select>
      <input type="checkbox" checked />
      <button disabled>Проверить</button>`)
    const snap = snapshotScreen(root)
    expect(snap).toContain('[пустое поле Введите ответ]')
    expect(snap).toContain('[выбор: «B»]')
    expect(snap).toContain('[отмечено]')
    expect(snap).toContain('[кнопка «Проверить» неактивна]')
  })

  it('без корня — пустая строка', () => {
    expect(snapshotScreen(null)).toBe('')
  })
})
