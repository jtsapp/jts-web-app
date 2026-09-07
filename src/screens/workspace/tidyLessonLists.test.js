// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { tidyLessonLists } from './tidyLessonLists.js'

// Разметка — как в уроке каталога (A0, «You're not from here, are you?»):
// подпись «пузыря» и следом список, где она же повторена первым пунктом, а у
// остальных значок маркера вписан в текст.
const HOWTO = `<div class="bubble"><div class="blab">How to study this lesson</div><ul>` +
  `<li>How to study this lesson</li>` +
  `<li>• About 20–30 minutes. Work from top to bottom.</li>` +
  `<li>• Headphones on. Say your answers out loud.</li>` +
  `</ul></div>`

describe('списки урока', () => {
  it('снимает значок маркера из текста пункта', () => {
    // Маркер рисует браузер — свой в тексте даёт два подряд в одной строке.
    const out = tidyLessonLists(HOWTO)
    expect(out).toContain('<li>About 20–30 minutes. Work from top to bottom.</li>')
    expect(out).not.toContain('• About')
  })

  it('убирает пункт, дословно повторяющий подпись над списком', () => {
    const out = tidyLessonLists(HOWTO)
    expect(out).toContain('>How to study this lesson</div>')
    expect(out.match(/How to study this lesson/g)).toHaveLength(1)
  })

  it('похожий, но не совпадающий пункт оставляет', () => {
    // Снимаем ровно дубль: «How to study» под подписью «How to study this
    // lesson» — это уже другой текст, и решать за редакцию мы не вправе.
    const html = '<div class="blab">How to study this lesson</div><ul><li>How to study</li></ul>'
    expect(tidyLessonLists(html)).toContain('<li>How to study</li>')
  })

  it('дефис в начале пункта не трогает', () => {
    // «- 5 °C» и «— и всё» — это текст, а не маркер: снимаем только сам значок.
    const html = '<ul><li>- 5 °C утром</li><li>— и всё</li></ul>'
    const out = tidyLessonLists(html)
    expect(out).toContain('- 5 °C утром')
    expect(out).toContain('— и всё')
  })

  it('вложенные теги в пункте сохраняет', () => {
    const html = '<ul><li>• <b>Headphones</b> on</li></ul>'
    expect(tidyLessonLists(html)).toContain('<b>Headphones</b>')
  })

  it('html без списков возвращает как есть', () => {
    const html = '<p>Просто абзац</p>'
    expect(tidyLessonLists(html)).toBe(html)
  })

  it('пустое значение не роняет', () => {
    expect(tidyLessonLists('')).toBe('')
    expect(tidyLessonLists(null)).toBe(null)
  })
})
