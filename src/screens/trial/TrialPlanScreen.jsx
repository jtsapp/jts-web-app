'use client'

import { useState } from 'react'
import { saveTrialLead } from '../../api.js'

// Форматы обучения и заявка на консультацию — финальный экран урока.
// Цен здесь нет намеренно: их называет менеджер, а карточки показывают, что
// входит в доступ к платформе.

const ACCESS = {
  group: [
    ['🎧', 'Личный менеджер', 'на связи всё обучение'],
    ['💻', 'Личная программа A0 → C1', 'доступ 24/7'],
    ['🤖', 'AI-тьютор', '300 минут разговора голосом'],
    ['♾️', '∞ practice', 'безлимитная отработка'],
    ['📖', 'Личный словарь', 'слова из любого урока'],
    ['🎓', 'Self Study Full Access', 'на целый уровень английского'],
  ],
  indiv: [
    ['👩‍🏫', 'Преподаватель с опытом', 'от 3 лет'],
    ['📅', 'Расписание', 'выбираете время и дни недели'],
    ['🎧', 'Личный менеджер', 'на связи всё обучение'],
    ['💻', 'Личная программа A0 → C1', 'доступ 24/7'],
    ['🤖', 'AI-тьютор', '300 минут разговора голосом'],
    ['♾️', '∞ practice', 'безлимитная отработка'],
  ],
  self: [
    ['🎧', 'Личный менеджер', 'на связи весь курс'],
    ['💻', 'Программа от нуля до C1', 'доступ 24/7'],
    ['🧠', 'Практика без ограничений', 'повторяйте темы сколько нужно'],
    ['🤖', 'AI-тьютор', 'с голосом'],
    ['📖', 'Личный словарь', 'слова из любого урока'],
    ['💬', 'Готовые диалоги для жизни', 'аэропорт, офис, собеседование'],
  ],
}

const CARDS = [
  {
    id: 'group',
    title: 'Групповой курс',
    sub: 'Живые уроки в мини-группе до 6 человек · пакет из 12 уроков',
    why: 'много разговорной практики в маленькой группе — быстрый прогресс в живой речи',
    bonus: 'доступ к платформам Netflix, Puzzle Movies',
  },
  {
    id: 'indiv',
    title: 'Индивидуальный',
    sub: 'Английский 1-на-1 · уроки по 60 или 30 минут · пакеты от 8 до 32 уроков',
    why: 'весь урок — только про вас: темп, темы и расписание под вашу цель',
    bonus: 'Duolingo Plus, Netflix, Puzzle English, Puzzle Movies',
  },
  {
    id: 'self',
    title: 'Self Study',
    sub: 'Учишься сам, но не в одиночку · пакеты на 1–4 уровня',
    why: 'полная свобода по времени и самый гибкий формат',
    bonus: '',
  },
]

/** Рекомендуемый формат. Пока всегда групповой — флагман школы; преподаватель
 *  на уроке может предложить другой. Отдельной функцией, чтобы правило было
 *  видно и его можно было поменять в одном месте. */
export function recommendedPlan() {
  return 'group'
}

/**
 * Проверка заявки — единственного коммерческого выхода всего урока.
 * Отдельной функцией: правило «телефон от шести цифр» должно проверяться
 * числами, а не кликом по экрану, и оно же определяет, дойдёт ли лид до
 * менеджера вообще.
 */
export function validateLead({ name, phone }) {
  if (!String(name || '').trim()) return 'Укажите имя'
  if (String(phone || '').replace(/\D/g, '').length < 6) return 'Укажите телефон или WhatsApp'
  return null
}

export default function TrialPlanScreen({ result, token, onBack }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState(null)
  const rec = recommendedPlan(result)
  const cards = [...CARDS].sort((a, b) => (a.id === rec ? -1 : 0) - (b.id === rec ? -1 : 0))

  const submit = async () => {
    const invalid = validateLead({ name, phone })
    if (invalid) return setError(invalid)
    setError(null)
    setState('sending')
    try {
      await saveTrialLead(token, name.trim(), phone.trim())
      setState('sent')
    } catch {
      // Заявку теряем только на экране: преподаватель рядом и запишет контакт
      // сам, поэтому честно говорим об ошибке, а не притворяемся успехом.
      setState('error')
    }
  }

  return (
    <div className="trial">
      <div className="trial-card">
        <h2 className="trial-h2">Ваш маршрут: {result.level === 'A0' ? 'с нуля' : result.level} и дальше</h2>
        <p className="trial-hint">Форматы обучения Just to Study:</p>

        {cards.map((card) => (
          <div key={card.id} className={`trial-pcard ${card.id === rec ? 'trial-pcard--rec' : ''}`}>
            {card.id === rec && <span className="trial-badge">Рекомендуем для вас</span>}
            <div className="trial-pcard__t">{card.title}</div>
            <div className="trial-pcard__sub">{card.sub}</div>
            {card.id === rec && <div className="trial-pcard__why">Почему вам: {card.why}.</div>}
            <div className="trial-feats">
              {ACCESS[card.id].map(([ico, b, s]) => (
                <div key={b} className="trial-feat">
                  <span className="trial-feat__ico">{ico}</span>
                  <span>
                    <b>{b}</b>
                    {s}
                  </span>
                </div>
              ))}
            </div>
            {card.bonus && <div className="trial-pcard__bonus">🎁 Бонус к курсу: {card.bonus}</div>}
          </div>
        ))}

        <p className="trial-hint">
          Точную стоимость по вашему уровню и формату подберёт менеджер на бесплатной консультации — вместе с расписанием.
        </p>

        {state === 'sent' ? (
          <div className="trial-leadok">
            <b>Спасибо, {name}! 🎉</b> Заявка принята — менеджер Just to Study свяжется с вами, подберёт тариф и расписание.
          </div>
        ) : (
          <div className="trial-lead">
            <div className="trial-col__t">Забронировать место и консультацию</div>
            <label className="trial-lbl" htmlFor="tl-name">Имя</label>
            <input
              id="tl-name"
              className="trial-inp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Имя студента"
              autoComplete="off"
            />
            <label className="trial-lbl" htmlFor="tl-phone">Телефон или WhatsApp</label>
            <input
              id="tl-phone"
              className="trial-inp"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              /* Пример нейтральный: +7 в подсказке читался как «другие не
                 принимаем», хотя форма берёт любой международный номер. */
              placeholder="+7 777 123 45 67 · +49 30 123456"
            />
            {error && <p className="trial-err">{error}</p>}
            {state === 'error' && <p className="trial-err">Не удалось отправить заявку — попробуйте ещё раз.</p>}
            <button className="trial-primary" disabled={state === 'sending'} onClick={submit}>
              {state === 'sending' ? 'Отправляем…' : 'Забронировать 🚀'}
            </button>
          </div>
        )}

        <button className="trial-ghost" onClick={onBack}>
          ← Вернуться к результату
        </button>
      </div>
    </div>
  )
}
