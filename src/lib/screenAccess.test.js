import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STUDENT_ONLY_SCREENS, isStudentOnlyScreen } from './screenAccess.js'

const lib = dirname(fileURLToPath(import.meta.url))
const app = readFileSync(join(lib, '..', 'App.jsx'), 'utf8')

/** Все экраны приложения — из самого switch, как это делает screenRoutes.test.js. */
const ЭКРАНЫ = [...new Set([...app.matchAll(/case '([a-z0-9-]+)':/g)].map((m) => m[1]))]

describe('ученические экраны закрыты преподавателю', () => {
  it('«Обучение», ученическая «Главная» и домашка ученика — закрыты', () => {
    expect(isStudentOnlyScreen('kingdom')).toBe(true)
    expect(isStudentOnlyScreen('kingdom-interior')).toBe(true)
    expect(isStudentOnlyScreen('home')).toBe(true)
    expect(isStudentOnlyScreen('homework')).toBe(true)
  })

  it('тест уровня и IELTS — закрыты', () => {
    expect(isStudentOnlyScreen('test-intro')).toBe(true)
    expect(isStudentOnlyScreen('test')).toBe(true)
    expect(isStudentOnlyScreen('speaking-test')).toBe(true)
    expect(isStudentOnlyScreen('ielts')).toBe(true)
    expect(isStudentOnlyScreen('ielts-writing')).toBe(true)
  })

  // Экранов тьютора два десятка, и они добавляются: перечислять их поштучно
  // значит однажды забыть новый. Закрыты префиксом — как persistsInUrl в
  // App.jsx решает, кого писать в адрес.
  it('вся зона тьютора закрыта префиксом, а не перечислением', () => {
    const тьюторские = ЭКРАНЫ.filter((s) => s.startsWith('tutor-'))
    expect(тьюторские.length).toBeGreaterThan(10)
    for (const экран of тьюторские) expect(isStudentOnlyScreen(экран)).toBe(true)
  })

  it('пустое и не-строка ничего не закрывают', () => {
    expect(isStudentOnlyScreen('')).toBe(false)
    expect(isStudentOnlyScreen(null)).toBe(false)
    expect(isStudentOnlyScreen(undefined)).toBe(false)
  })
})

describe('собственные экраны преподавателя остаются открытыми', () => {
  // Это и есть настоящая регрессия: гейт, закрывший лишнее, выглядит как
  // «нажал кнопку в своём интерфейсе — выкинуло на Уроки». Каждый экран здесь
  // достижим у преподавателя кнопкой, и рядом сказано какой.
  const РАБОЧИЕ = {
    lessons: 'домашний экран преподавателя (homeScreen.js)',
    'live-lesson': 'ведёт занятие',
    'lesson-workspace': 'из «Уроков», вкладка «Самостоятельно»',
    'course-catalog': 'кнопка каталога в «Уроках», только у преподавателя',
    vocab: 'кнопка словаря внутри рабочего пространства урока (onVocab)',
    profile: 'onProfile есть на каждом его экране',
    pricing: 'onOpenPricing в «Уроках»',
  }

  // «Практика» целиком: это его раздел в сайдбаре (TEACHER_SECTIONS) и цель
  // кнопки «Открыть» в админке — она ведёт в раздел выданного юнита
  // (web-admin, practice-unit-url.util.ts SCREEN_BY_AREA).
  const ПРАКТИКА = ['practice', 'reading', 'writing', 'listening', 'workbook', 'shadowing']

  for (const [экран, откуда] of Object.entries(РАБОЧИЕ)) {
    it(`${экран} открыт — ${откуда}`, () => {
      expect(isStudentOnlyScreen(экран)).toBe(false)
    })
  }

  it('все разделы «Практики» открыты: туда ведёт «Открыть» из админки', () => {
    for (const экран of ПРАКТИКА) expect(isStudentOnlyScreen(экран)).toBe(false)
  })

  // Вход и регистрация к роли отношения не имеют: на этих экранах токена ещё
  // нет вовсе, и закрытый вход означал бы, что преподаватель не может войти.
  it('экраны входа и регистрации не закрыты ни для кого', () => {
    for (const экран of ['welcome', 'chat', 'phone', 'otp', 'login-password',
      'reg-phone', 'reg-email', 'reg-birth', 'set-password',
      'complete-registration', 'success']) {
      expect(isStudentOnlyScreen(экран)).toBe(false)
    }
  })
})

describe('список не расходится с приложением', () => {
  // Переименовали экран в App.jsx — запись в списке осталась бы висеть и молча
  // перестала бы что-либо закрывать. Ровно так уже разъезжались ссылки в
  // джавадоках, поэтому сверяем с самим switch.
  it('каждый закрытый экран существует в App.jsx', () => {
    const пропавшие = [...STUDENT_ONLY_SCREENS].filter((s) => !ЭКРАНЫ.includes(s))
    expect(пропавшие).toEqual([])
  })

  // Обратная сторона: экран, который приложение само пишет в адрес, на
  // перезагрузке вернётся тем же диплинком. Для закрытых это и нужно
  // (преподавателя уведёт на «Уроки»), но список PERSISTABLE_SCREENS обязан
  // содержать оба его собственных раздела — иначе F5 будет выбрасывать его с
  // рабочего экрана.
  it('«Уроки» и «Практика» переживают перезагрузку', () => {
    const persistable = app.slice(app.indexOf('const PERSISTABLE_SCREENS'), app.indexOf('function persistsInUrl'))
    expect(persistable).toContain("'lessons'")
    expect(persistable).toContain("'practice'")
  })
})
