// @vitest-environment jsdom
// Регрессия по жалобе из урока A0 «Coffee — yes. Mondays — no.»: верные ответы
// шли в «Неверный ответ». Здесь проверяются оба плеера целиком — сборка шага из
// данных уровня, клик «Проверить» и итоговая плашка.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer from './CourseStepPlayer.jsx'
import LessonPlayer from './LessonPlayer.jsx'
import { tasksToSteps } from './nativeSteps.js'

const RIGHT = /молодец|верно|правильн/i
const WRONG = /неверный ответ/i

function playSteps(steps) {
  return render(
    <I18nProvider>
      <CourseStepPlayer steps={steps} title="Coffee — yes. Mondays — no." level="A0" onExit={() => {}} onDone={() => {}} />
    </I18nProvider>
  )
}

function click(name) {
  fireEvent.click(screen.getByRole('button', { name }))
}

// Слово в банке и то же слово в собранной фразе — две кнопки с одним именем,
// поэтому в банк тыкаем адресно.
function tapWord(word) {
  const bank = document.querySelector('.cp-order__bank')
  const chip = [...bank.querySelectorAll('button')].find((b) => b.textContent === word && !b.disabled)
  fireEvent.click(chip)
}

describe('CourseStepPlayer — собери предложение (A0/A1)', () => {
  // В данных уровня ответ лежит списком слов; без склейки плеер сравнивал фразу
  // со строкой «I,like,coffee» и браковал все 233 таких задания.
  const steps = tasksToSteps(
    { tasks: [{ sec: '4. Practice', type: 'order', words: ['coffee', 'I', 'like'], answer: ['I', 'like', 'coffee'] }] },
    'ru'
  )

  it('засчитывает правильный порядок слов', () => {
    playSteps(steps)
    tapWord('I')
    tapWord('like')
    tapWord('coffee')
    click(/проверить/i)
    expect(screen.queryByText(WRONG)).toBeNull()
    expect(screen.getByText(RIGHT)).toBeTruthy()
  })

  it('тап по слову в собранной фразе убирает его', () => {
    playSteps(steps)
    tapWord('coffee')
    tapWord('I')
    // Задание обещает «tap a word above to remove it» — убираем лишнее слово из
    // середины, не откатывая всю фразу.
    fireEvent.click(document.querySelector('.cp-order__line .cp-chip'))
    tapWord('like')
    tapWord('coffee')
    click(/проверить/i)
    expect(screen.queryByText(WRONG)).toBeNull()
  })

  it('неправильный порядок остаётся ошибкой', () => {
    playSteps(steps)
    tapWord('coffee')
    tapWord('I')
    tapWord('like')
    click(/проверить/i)
    expect(screen.getByText(WRONG)).toBeTruthy()
  })
})

describe('CourseStepPlayer — впиши пропущенное', () => {
  const steps = tasksToSteps(
    {
      tasks: [
        { sec: '4. Practice', type: 'gap', gapBefore: 'I ___ like Mondays. (negative) ', gapAfter: '', answers: ["don't"] },
      ],
    },
    'ru'
  )

  it('принимает полную форму «do not» там, где в данных «don’t»', () => {
    playSteps(steps)
    fireEvent.change(screen.getByPlaceholderText('Введите ответ'), { target: { value: 'do not' } })
    click(/проверить/i)
    expect(screen.queryByText(WRONG)).toBeNull()
  })

  it('чужой ответ остаётся ошибкой', () => {
    playSteps(steps)
    fireEvent.change(screen.getByPlaceholderText('Введите ответ'), { target: { value: 'does' } })
    click(/проверить/i)
    expect(screen.getByText(WRONG)).toBeTruthy()
  })
})

describe('LessonPlayer — пропуск в уроке B2/C1', () => {
  // В данных B2/C1 апостроф типографский, на клавиатуре — обычный.
  const lesson = {
    code: 'L01',
    title: 'Test',
    tasks: [{ sec: '3. Grammar', type: 'gap', gapBefore: 'He ', gapAfter: ' me.', answers: ['’s always interrupting'] }],
  }

  function playLesson() {
    return render(
      <I18nProvider>
        <LessonPlayer lesson={lesson} level="B2" token={null} onExit={() => {}} onDone={vi.fn()} />
      </I18nProvider>
    )
  }

  it('принимает обычный апостроф с клавиатуры', () => {
    playLesson()
    fireEvent.change(screen.getByPlaceholderText('…'), { target: { value: "'s always interrupting" } })
    click(/проверить/i)
    expect(screen.queryByText(WRONG)).toBeNull()
  })
})

// Полоса урока в макете «Обучение» (JTS Адаптивка) несёт пилюлю языка между
// названием шага и словарём: урок — самый длинный сценарий приложения, и
// менять язык, не теряя шаг, нужно прямо здесь.
describe('CourseStepPlayer — язык прямо в полосе урока', () => {
  const steps = tasksToSteps(
    { tasks: [{ sec: '4. Practice', type: 'order', words: ['I', 'like'], answer: ['I', 'like'] }] },
    'ru'
  )

  it('в полосе стоит компактная пилюля языка — флаг без подписи', () => {
    const { container } = playSteps(steps)
    const pill = container.querySelector('.cp-bar .lang-selector')
    expect(pill).not.toBeNull()
    expect(pill.classList.contains('lang-selector--compact')).toBe(true)
    // Подпись языка скрыта, но кнопка остаётся названной для скринридера.
    expect(pill.textContent.trim()).toBe('')
    expect(pill.getAttribute('aria-label')).toBe('Русский')
  })

  it('выбор языка перерисовывает урок, не выбрасывая из шага', () => {
    playSteps(steps)
    fireEvent.click(screen.getByRole('button', { name: 'Русский' }))
    fireEvent.click(screen.getByRole('option', { name: /English/ }))
    expect(screen.getByRole('button', { name: /check/i })).toBeTruthy()
    expect(document.querySelector('.cp-order__bank')).not.toBeNull()
  })
})

// Словарь в уроке — макет «Обучение», кадр 4108:1689. Раньше кнопка в полосе
// уводила в раздел словаря прямо посреди шага; теперь она открывает лист, а
// уйти в раздел можно с вкладки «Сохранено».
describe('CourseStepPlayer — лист словаря', () => {
  const steps = [
    {
      stage: 'Vocabulary',
      type: 'cards',
      title: 'Слова урока',
      words: [
        { en: 'like', ru: 'нравится', kk: 'ұнайды' },
        // Тот же en другим регистром: одно слово встречается в нескольких
        // стадиях, в списке оно должно остаться одним.
        { en: 'Like', ru: 'нравится' },
        { en: 'listen', ru: 'слушать' },
      ],
    },
  ]

  function openDict(onVocab = vi.fn()) {
    const view = render(
      <I18nProvider>
        <CourseStepPlayer steps={steps} title="Coffee" level="A0" onExit={() => {}} onVocab={onVocab} onDone={() => {}} />
      </I18nProvider>
    )
    fireEvent.click(view.container.querySelector('.cp-bar__dict'))
    return { ...view, onVocab }
  }

  it('кнопка в полосе открывает лист, а не уводит из урока', () => {
    const { container, onVocab } = openDict()
    expect(container.querySelector('.cp-dict')).not.toBeNull()
    expect(onVocab).not.toHaveBeenCalled()
    // Шаг остаётся под листом — вернувшись, студент продолжает с того же места.
    expect(container.querySelector('.cp-step')).not.toBeNull()
  })

  it('на вкладке «Практика» — слова урока без повторов', () => {
    const { container } = openDict()
    const rows = [...container.querySelectorAll('.cp-dict__word b')].map((b) => b.textContent)
    expect(rows).toEqual(['like', 'listen'])
    expect(container.querySelector('.cp-dict__word span').textContent).toBe('нравится · ұнайды')
  })

  it('«Сохранено» — заглушка с переходом в раздел словаря', () => {
    const { container, onVocab } = openDict()
    const [saved] = container.querySelectorAll('.cp-dict__tab')
    fireEvent.click(saved)
    expect(saved.getAttribute('aria-selected')).toBe('true')
    expect(container.querySelector('.cp-dict__list')).toBeNull()
    fireEvent.click(container.querySelector('.cp-dict__link'))
    expect(onVocab).toHaveBeenCalled()
  })

  it('крестик закрывает лист и возвращает к шагу', () => {
    const { container } = openDict()
    fireEvent.click(container.querySelector('.cp-dict__close'))
    expect(container.querySelector('.cp-dict')).toBeNull()
    expect(container.querySelector('.cp-step')).not.toBeNull()
  })
})
