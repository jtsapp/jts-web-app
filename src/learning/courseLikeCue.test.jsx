// @vitest-environment jsdom
// Жалоба из чата учителей (урок A0 «Coffee — yes. Mondays — no.»): «I ___ rain.» с ответом «like» — «Неверный ответ».
// Ключ задания зафиксирован («don't like»), а «Разминка» прямо перед ним спрашивает личное: «Выберите то, что вам
// нравится. Здесь нет неправильного ответа». В исходном курсе у такого шага был значок («👎 rain → ___ rain.»), при
// сборке шагов он потерялся — и ученица, любящая дождь, не могла знать, какое слово ждёт задание.
//
// Здесь сторожим сами данные: у каждого шага этого урока, где верный ответ — like / don't like, в условии стоит значок,
// согласованный с ключом. Файл собирает scripts/extract-selfstudy-course.js из внешнего HTML курса; пересборка вернёт
// шаги без значков — тест тогда упадёт, а не промолчит.
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer, { stopStageAudio } from './CourseStepPlayer.jsx'

const UP = '\u{1F44D}' // 👍
const DOWN = '\u{1F44E}' // 👎

const lesson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/course/a0/steps-1.json'), 'utf8'))

// «like» / «I like music.» → за; «don't like» / «I don't like rain.» → против; всё остальное (favourite, True…) — не про отношение.
const stanceOf = (key) => {
  const k = String(key ?? '').trim()
  if (/^(?:I )?don['’]t like\b/i.test(k)) return 'no'
  if (/^(?:I )?like\b/i.test(k)) return 'yes'
  return null
}

// Шаги, где ответ определяется отношением к предмету, и текст условия, в котором должен стоять значок.
function stanceSteps() {
  const found = []
  lesson.steps.forEach((step, index) => {
    if (step.type === 'choice') {
      const stance = stanceOf(step.answer)
      if (stance) found.push({ index, step, stance, cue: step.prompt })
    }
    if (step.type === 'gap') {
      const stance = stanceOf((step.answers || [])[0])
      if (stance) found.push({ index, step, stance, cue: step.before })
    }
  })
  return found
}

const sign = (stance) => (stance === 'yes' ? UP : DOWN)
const otherSign = (stance) => (stance === 'yes' ? DOWN : UP)

function play(step) {
  return render(
    <I18nProvider>
      <CourseStepPlayer steps={[step]} title="Coffee — yes. Mondays — no." level="A0" onExit={() => {}} onDone={() => {}} />
    </I18nProvider>,
  )
}

afterEach(() => stopStageAudio())

describe('A0, урок 1: значок 👍/👎 в условии заданий «like / don\'t like»', () => {
  const steps = stanceSteps()

  it('таких заданий в уроке не меньше семи (сторож не должен проходить вхолостую)', () => {
    expect(steps.length).toBeGreaterThanOrEqual(7)
  })

  it('в условии каждого стоит значок, согласованный с ключом, и нет противоположного', () => {
    for (const { index, step, stance, cue } of steps) {
      const where = `шаг ${index} (${step.type}), ключ «${step.answer ?? step.answers?.[0]}»`
      expect(String(cue ?? ''), where).toContain(sign(stance))
      expect(String(cue ?? ''), where).not.toContain(otherSign(stance))
    }
  })

  it('значок — первым в строке задания: «👎 I ___ rain.», «👍 music»', () => {
    for (const { index, step, stance, cue } of steps) {
      expect(String(cue).startsWith(`${sign(stance)} `), `шаг ${index} (${step.type})`).toBe(true)
    }
  })

  it('ученица видит значок в крупной строке условия: «I ___ rain.» — «👎 I ___ rain.»', () => {
    const rain = lesson.steps.find((s) => s.type === 'choice' && s.answer === "don't like" && /rain/.test(s.prompt))
    play(rain)
    expect(document.querySelector('.cp-step__prompt').textContent).toBe(`${DOWN} I ___ rain.`)
  })

  it('выбор предложения: в строке условия — значок и предмет («👎 rain»), варианты — оба предложения', () => {
    const rain = lesson.steps.find((s) => s.type === 'choice' && s.answer === "I don't like rain.")
    play(rain)
    expect(document.querySelector('.cp-step__prompt').textContent).toBe(`${DOWN} rain`)
    expect([...document.querySelectorAll('.cp-choice')].map((b) => b.textContent).sort()).toEqual(["I don't like rain.", 'I like rain.'])
  })

  it('«впиши пропуск»: значок стоит перед предложением', () => {
    const coffee = lesson.steps.find((s) => s.type === 'gap' && (s.answers || [])[0] === 'like')
    play(coffee)
    expect(document.querySelector('.cp-step__prompt').textContent).toBe(`${UP} I ___ coffee.`)
  })
})
