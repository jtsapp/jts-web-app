import { describe, it, expect, beforeEach } from 'vitest'
import { addressLevel, practiceNavTarget } from './practiceTarget.js'
import { resetLessonsForTests, setRemoteLessons } from '../practice/shadowing/catalog.js'

/**
 * Куда ведёт задание «Практики» из домашней работы.
 *
 * Форма payload у каждого раздела своя — её диктует экран, и тест держит
 * именно её: перепутанная форма молча откроет раздел не на том месте.
 */
const задание = (over = {}) => ({
  practiceArea: 'grammar',
  practiceLevel: 'a1',
  practiceUnitId: 12,
  practiceUnitKey: null,
  ...over,
})

describe('practiceNavTarget — по разделу свой экран и своя форма цели', () => {
  it('грамматика открывает юнит по номеру', () => {
    expect(practiceNavTarget(задание())).toEqual({ key: 'practice', payload: { level: 'a1', unitId: 12 } })
  })

  it('чтение открывает текст, письмо — жанр', () => {
    expect(practiceNavTarget(задание({
      practiceArea: 'reading', practiceUnitId: null, practiceUnitKey: 'a1-sci-honey',
    }))).toEqual({ key: 'reading', payload: { level: 'a1', textId: 'a1-sci-honey' } })

    expect(practiceNavTarget(задание({
      practiceArea: 'writing', practiceLevel: 'a2p', practiceUnitId: null, practiceUnitKey: 'a2p-email-news',
    }))).toEqual({ key: 'writing', payload: { level: 'a2p', genreId: 'a2p-email-news' } })
  })

  // Уровня у раздела нет, а payload — голая строка: так его ждёт handleNav.
  it('шэдоуинг открывает урок строкой, без уровня', () => {
    expect(practiceNavTarget(задание({
      practiceArea: 'shadowing', practiceLevel: 'all', practiceUnitId: null, practiceUnitKey: 'sg',
    }))).toEqual({ key: 'shadowing', payload: 'sg' })
  })

  it('аудирование и воркбуки открывают уровень целиком', () => {
    expect(practiceNavTarget(задание({
      practiceArea: 'listening', practiceUnitId: null, practiceUnitKey: 'b1',
    }))).toEqual({ key: 'listening', payload: { level: 'b1' } })

    // Экран называется в единственном числе, раздел каталога — во множественном.
    expect(practiceNavTarget(задание({
      practiceArea: 'workbooks', practiceUnitId: null, practiceUnitKey: 'a0',
    }))).toEqual({ key: 'workbook', payload: { level: 'a0' } })
  })

  // Своего экрана у ситуаций нет — это оверлей поверх «Практики».
  it('разговорная практика открывается через «Практику» с пометкой раздела', () => {
    expect(practiceNavTarget(задание({
      practiceArea: 'situations', practiceUnitId: null, practiceUnitKey: 'b2',
    }))).toEqual({ key: 'practice', payload: { area: 'situations', level: 'b2' } })
  })
})

/**
 * Экраны на неизвестный адрес не ругаются, а подставляют своё: шэдоуинг —
 * первый урок списка, аудирование и ситуации — A1, воркбук — A0. Для домашней
 * работы это худший исход: ученик уверен, что решает заданное, а решает чужое.
 */
describe('practiceNavTarget — молча не уводит не туда', () => {
  beforeEach(() => resetLessonsForTests())

  it('чужой урок шэдоуинга не открывается вовсе', () => {
    // 'dream' лежит в public/shadowing, но в индексе уроков его нет: экран
    // подставил бы 'sg' — Selena Gomez вместо заданного.
    expect(practiceNavTarget(задание({
      practiceArea: 'shadowing', practiceUnitId: null, practiceUnitKey: 'dream',
    }))).toBeNull()
  })

  it('уровня, которого в разделе нет, не бывает', () => {
    // Аудирование начинается с A1, воркбуки заканчиваются на B2.
    expect(practiceNavTarget(задание({
      practiceArea: 'listening', practiceLevel: 'a0', practiceUnitId: null, practiceUnitKey: 'a0',
    }))).toBeNull()
    expect(practiceNavTarget(задание({
      practiceArea: 'workbooks', practiceLevel: 'c1', practiceUnitId: null, practiceUnitKey: 'c1',
    }))).toBeNull()
  })

  it('задание без адреса и незнакомый раздел никуда не ведут', () => {
    expect(practiceNavTarget(задание({ practiceUnitId: null }))).toBeNull()
    expect(practiceNavTarget(задание({ practiceArea: 'comics', practiceUnitId: null, practiceUnitKey: 'x' }))).toBeNull()
    expect(practiceNavTarget(задание({ practiceArea: '' }))).toBeNull()
    expect(practiceNavTarget(null)).toBeNull()
  })

  it('пустой ключ не считается адресом', () => {
    expect(practiceNavTarget(задание({
      practiceArea: 'reading', practiceUnitId: null, practiceUnitKey: '   ',
    }))).toBeNull()
  })
})

/**
 * Уроки, добавленные через админку, приезжают с сервера, и к моменту показа домашней работы список мог ещё не доехать.
 * Прятать кнопку «Открыть» у такого урока нельзя (ученик решил бы, что задание пропало), а подсовывать вместо
 * удалённого — первый вшитый урок, как раньше, тем более.
 */
describe('practiceNavTarget — шэдоуинг: урок из админки', () => {
  const lesson = (over = {}) => ({
    id: 5, slug: 'calm-talk-ab3k9', title: 'Calm Talk', speaker: 'Noa', video: 'CqgmozFr_GM', segCount: 31, ...over,
  })
  const homework = (key) => задание({ practiceArea: 'shadowing', practiceLevel: 'all', practiceUnitId: null, practiceUnitKey: key })

  beforeEach(() => resetLessonsForTests())

  it('пока список уроков не доехал, адрес из админки ведёт на экран урока — тот дождётся списка', () => {
    expect(practiceNavTarget(homework('calm-talk-ab3k9'))).toEqual({ key: 'shadowing', payload: 'calm-talk-ab3k9' })
  })

  it('список доехал, урок в нём есть — открывается', () => {
    setRemoteLessons([lesson()])

    expect(practiceNavTarget(homework('calm-talk-ab3k9'))).toEqual({ key: 'shadowing', payload: 'calm-talk-ab3k9' })
  })

  it('список доехал, а урока в нём нет (скрыли или удалили) — кнопки нет, подмены первым вшитым нет', () => {
    setRemoteLessons([lesson()])

    expect(practiceNavTarget(homework('gone-talk-zz9zz'))).toBeNull()
  })

  it('вшитые уроки открываются и без списка', () => {
    expect(practiceNavTarget(homework('sg'))).toEqual({ key: 'shadowing', payload: 'sg' })
  })
})

/**
 * Уровень приходит с бэкенда как есть, а экраны сверяют код точным
 * совпадением: «A1» для них чужой уровень, пустой — тем более.
 */
describe('addressLevel', () => {
  const reading = ['a1', 'a2', 'b1', 'b2', 'c1']
  const writing = ['a1', 'a2', 'a2p', 'b1', 'b2', 'c1']

  it('приводит регистр', () => {
    expect(addressLevel('A1', 'a1-sci-honey', reading)).toBe('a1')
  })

  it('достаёт уровень из ключа, когда его нет в поле', () => {
    expect(addressLevel('', 'b2-life-bus', reading)).toBe('b2')
    expect(addressLevel(null, 'c1', reading)).toBe('c1')
  })

  /* Двухсимвольным срезом это ломается: 'a2p-email-news' дал бы 'a2' —
     соседний уровень с другим содержимым. */
  it('половинный уровень не путается с соседним', () => {
    expect(addressLevel(null, 'a2p-email-news', writing)).toBe('a2p')
    expect(addressLevel(null, 'a2-note', writing)).toBe('a2')
  })

  it('чужой уровень — это null, а не первый попавшийся', () => {
    expect(addressLevel('a0', 'a0-something', reading)).toBeNull()
    expect(addressLevel('', '', reading)).toBeNull()
  })
})
