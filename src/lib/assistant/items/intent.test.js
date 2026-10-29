import { describe, it, expect } from 'vitest'
import { GUESS_KINDS, itemIntent } from './intent.js'

const kinds = (text, opts) => itemIntent(text, opts)?.kinds ?? null

describe('просьба открыть конкретное', () => {
  it('урок курса: номер, тема, «следующий»', () => {
    expect(kinds('Луна, открой урок 5')).toEqual(['course'])
    expect(kinds('где урок про траты?')).toEqual(['course'])
    expect(kinds('давай следующий урок')).toEqual(['course'])
    expect(kinds('open lesson 3')).toEqual(['course'])
    expect(kinds('5-сабақты ашып бер')).toEqual(['course'])
  })

  it('урок с преподавателем — это расписание, а не курс', () => {
    expect(kinds('покажи мой урок с преподавателем')).toEqual(['live'])
    expect(kinds('когда моё следующее занятие? открой')).toEqual(['live'])
  })

  it('тема грамматики и игры', () => {
    expect(kinds('открой тему Present Perfect')).toEqual(['grammar', 'ggame'])
    expect(kinds('хочу грамматику про past simple')).toEqual(['grammar', 'ggame'])
    expect(kinds('открой игру по грамматике to be')).toEqual(['ggame', 'grammar'])
  })

  it('текст, ситуация, шэдоуинг, слова, воркбук, домашка', () => {
    expect(kinds('открой текст про космос')).toEqual(['reading'])
    expect(kinds('хочу ситуацию в ресторане')).toEqual(['situation'])
    expect(kinds('включи шэдоуинг с Обамой')).toEqual(['shadowing'])
    expect(kinds('открой слова в картинках, ферма')).toEqual(['words'])
    expect(kinds('открой воркбук')).toEqual(['workbook'])
    expect(kinds('покажи мою домашку')).toEqual(['homework'])
    expect(kinds('үй жұмысымды аш')).toEqual(['homework'])
  })

  it('книжка: по-русски, по-казахски, по-английски; «чтение» — только место', () => {
    expect(kinds('открой какую-нибудь книжку в практике чтение')).toEqual(['book', 'reading'])
    expect(kinds('открой книгу Питер Пэн')).toEqual(['book'])
    expect(kinds('Питер Пэн кітабын ашып бер')).toEqual(['book'])
    expect(kinds('open the book Treasure Island')).toEqual(['book'])
    expect(kinds('хочу аудиокнигу')).toEqual(['book'])
    // Воркбук — не книжка.
    expect(kinds('открой workbook')).toEqual(['workbook'])
  })

  it('комикс, караоке, сказка, мультфильм, предлоги, произношение, письмо, аркада, урок воркбука', () => {
    expect(kinds('открой комикс Maus')).toEqual(['comic'])
    expect(kinds('включи караоке Believer')).toEqual(['karaoke'])
    expect(kinds('открой сказку Снежная королева')).toEqual(['tale'])
    expect(kinds('включи мультик про Пеппу')).toEqual(['cartoon'])
    expect(kinds('открой урок предлогов in on at')).toEqual(['prep'])
    expect(kinds('открой произношение звука th')).toEqual(['pron'])
    expect(kinds('хочу письмо-жалобу')).toEqual(['writing'])
    expect(kinds('открой Word Rush')).toEqual(['arcade'])
    expect(kinds('открой скорочтение')).toEqual(['speedread'])
    expect(kinds('открой Just to Listen медицина')).toEqual(['listen'])
    expect(kinds('открой урок 5 воркбука')).toEqual(['workbook'])
  })

  // «Открой Остров сокровищ»: вид не назван, раздела нет — значит, вещь по имени.
  it('вещь по одному названию — guess со всеми видами с названиями', () => {
    for (const q of ['открой Остров сокровищ', 'включи Believer', 'Алиса в стране чудес ашып бер', 'open Peter Pan']) {
      expect(itemIntent(q)).toMatchObject({ kinds: GUESS_KINDS, guess: true })
    }
    // Раздел, кнопка экрана, «следующее», вопрос или пустое «открой это» — не вещь.
    for (const q of ['открой словарь', 'открой практику', 'открой Speaking Buddy', 'открой', 'открой это, пожалуйста', 'открой следующее задание', 'включи запись', 'включи звук', 'покажи, как это сделать', 'хочу отдохнуть']) {
      expect(itemIntent(q)).toBe(null)
    }
  })

  it('вопрос без просьбы открыть — не просьба', () => {
    expect(itemIntent('почему мой ответ в этом уроке неверный?')).toBe(null)
    expect(itemIntent('объясни правило этой темы')).toBe(null)
    expect(itemIntent('привет')).toBe(null)
    expect(itemIntent('')).toBe(null)
  })

  it('уровень: назван в реплике (и кириллицей) → иначе уровень ученика', () => {
    expect(itemIntent('открой текст B1 про науку').level).toBe('B1')
    expect(itemIntent('открой урок 3 уровня В1').level).toBe('B1')
    expect(itemIntent('открой урок 3 а2').level).toBe('A2')
    expect(itemIntent('открой урок 3', { userLevel: 'a1' }).level).toBe('A1')
    expect(itemIntent('открой урок 3').level).toBe(null)
  })
})
