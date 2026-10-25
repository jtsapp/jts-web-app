// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { clickAllowed, forbiddenButton, forbiddenLabel } from './clickPolicy.js'

describe('forbiddenLabel', () => {
  it.each([
    'Выйти', 'Выход из аккаунта', 'Log out', 'Шығу', 'Удалить слово', 'Delete', 'Оплатить', 'Купить тариф', 'Оформить подписку',
    'Pay now', 'Төлеу', 'Сдать тест', 'Отправить работу', 'Submit', 'Завершить урок', 'Тапсыру', 'Сбросить прогресс', 'Reset', 'Сменить пароль',
  ])('опасное: %s', (label) => expect(forbiddenLabel(label)).toBe(true))
  it.each(['Проверить', 'Далее', 'Послушать', 'Начать урок', 'Подсказка', 'Play', 'like', 'Тарифы'])('можно: %s', (label) =>
    expect(forbiddenLabel(label)).toBe(false),
  )
})

it('forbiddenButton — и по метке data-assistant-noclick у предка', () => {
  document.body.innerHTML = '<div data-assistant-noclick><button id="a">Далее</button></div><button id="b">Далее</button>'
  expect(forbiddenButton(document.getElementById('a'), 'Далее')).toBe(true)
  expect(forbiddenButton(document.getElementById('b'), 'Далее')).toBe(false)
})

describe('clickAllowed — честность', () => {
  const task = 'I ___ rain.\n[кнопка #1 «like»]\n[кнопка #2 «don\'t like»]\n[кнопка #3 «Проверить»]'
  const checked = `${task}\nНеверный ответ`
  it('непроверенное задание: только названная учеником кнопка', () => {
    expect(clickAllowed('like', { screenText: task, userText: 'выбери like' })).toBe(true)
    expect(clickAllowed("don't like", { screenText: task, userText: 'выбери сама' })).toBe(false)
    expect(clickAllowed('Проверить', { screenText: task, userText: 'проверь' })).toBe(true)
    expect(clickAllowed('Проверить', { screenText: task, userText: 'нажми что-нибудь' })).toBe(false)
  })
  it('после проверки и вне задания — любая не опасная', () => {
    expect(clickAllowed('Далее', { screenText: checked, userText: 'жми' })).toBe(true)
    expect(clickAllowed('Начать урок', { screenText: 'Урок 3\n[кнопка #1 «Начать урок»]', userText: 'давай' })).toBe(true)
  })
  it('опасное — никогда', () => {
    expect(clickAllowed('Выйти', { screenText: 'Профиль', userText: 'нажми выйти' })).toBe(false)
  })
})
