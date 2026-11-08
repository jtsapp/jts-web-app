// Память Луны (ТЗ v2.0, 8.1): что можно запомнить, что нельзя (решает код, а не модель), строка профиля.
import { describe, it, expect } from 'vitest'
import { FACT_MAX, REMEMBER_MARK, cleanFact, factKey, factToSave, factsLine, sensitiveFact } from './facts.js'

describe('factToSave', () => {
  it('учебное — пишем, чисто и коротко', () => {
    expect(factToSave('  Боится говорить на уроках.  ')).toBe('Боится говорить на уроках')
    expect(factToSave('готовится к поступлению осенью')).toBe('готовится к поступлению осенью')
    expect(factToSave('учится по вечерам после работы')).toBe('учится по вечерам после работы')
    expect(factToSave('долго учит новые слова')).toBe('долго учит новые слова')
    expect(factToSave('застрял на уроке номер 5')).toBe('застрял на уроке номер 5')
    expect(factToSave('сынақтан қорқады')).toBe('сынақтан қорқады')
    expect(factToSave('wants to pass IELTS 6.5 in spring')).toBe('wants to pass IELTS 6.5 in spring')
    expect(factToSave('x'.repeat(200))).toHaveLength(FACT_MAX)
    expect(factToSave('ок')).toBe(null)
  })

  it('здоровье, деньги, контакты, другие люди — не пишем', () => {
    for (const s of [
      'у неё депрессия',
      'принимает лекарства от тревоги',
      'беременна, скоро в декрет',
      'зарплата 300 тысяч',
      'долг по кредиту',
      'оплатит курс в декабре',
      'пиши в whatsapp',
      'мой номер 87011234567',
      'email aigerim@mail.kz',
      'мама против английского',
      'с сыном учит слова',
      'муж помогает с домашкой',
      'занимается по ночам, семья против',
      'учится по ночам, дома это не все поддерживают',
      'близкие против учёбы',
      'родители платят за курс',
      'отбасым қарсы',
      'my family wants me to study',
      'анам көмектеседі',
      'her boyfriend lives in London',
      'ходит в мечеть по пятницам',
    ]) {
      expect(sensitiveFact(s), s).toBe(true)
      expect(factToSave(s), s).toBe(null)
    }
  })

  it('похожие на людей слова — не люди', () => {
    for (const s of ['другой способ учить слова нравится больше', 'сынақ алдында уайымдайды', 'любит season finale сериалов']) {
      expect(sensitiveFact(s), s).toBe(false)
    }
  })
})

describe('метка и сравнение', () => {
  it('[[REMEMBER …]] — с двоеточием и без', () => {
    expect(REMEMBER_MARK.exec('[[REMEMBER боится говорения]]')?.[1]).toBe('боится говорения')
    expect(REMEMBER_MARK.exec('[[remember: учится по вечерам]]')?.[1]).toBe('учится по вечерам')
    expect(REMEMBER_MARK.exec('[[REMEMBER [x] ]]')).toBe(null)
  })

  it('один факт — без регистра и знаков', () => {
    expect(factKey('Боится говорения.')).toBe(factKey('боится говорения'))
    expect(cleanFact('«в кавычках» [и скобках]')).toBe('в кавычках и скобках')
  })

  it('строка профиля', () => {
    expect(factsLine([])).toBe(null)
    expect(factsLine([{ fact: 'боится говорения' }, 'учится по вечерам'])).toBe(
      'Память Луны (ученик сам рассказал, хранится 30 дней; опирайся, когда к месту, не пересказывай списком): «боится говорения»; «учится по вечерам».',
    )
  })
})
