'use client'

import { SKILL_TITLES, strengthsAndGrowth, vocabMatchScore } from '../../trial/report.js'
import { START_LEVELS } from '../../trial/content.generated.js'

// Экран результата: уровень, сильные стороны и зоны роста, разбивка по
// блокам. Для A0 — отдельный, бережный сценарий: полному новичку показывать
// «ваш уровень A0» вместе с полосой уровней незачем, он и так это знает.

const ALL_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const nextLevelOf = (lvl) => ALL_LEVELS[Math.min(ALL_LEVELS.length - 1, ALL_LEVELS.indexOf(lvl) + 1)]

export default function TrialResultScreen({ result, log, levelDesc, startCando, teacherMode, saveFailed, onNext }) {
  const vocab = vocabMatchScore(log)
  const { strengths, growth } = strengthsAndGrowth(result, vocab)
  const isA0 = result.level === 'A0'

  return (
    <div className="trial">
      <div className="trial-card">
        {isA0 ? (
          <>
            <p className="trial-hint">Спасибо — мы поняли, откуда стартовать 💚</p>
            <div className="trial-lvlhero">
              <h1 className="trial-lvl">Start</h1>
              <p className="trial-lvl__desc">
                Вы в самом начале пути — и это отличная новость: прогресс будет заметен уже с первых уроков.
              </p>
            </div>
            <h3 className="trial-h3">Ваши первые шаги</h3>
            <ol className="trial-roadmap">
              <li>Первые фразы: поздороваться, представиться, рассказать о себе.</li>
              <li>Уверенный Present Simple, вопросы и первые 500 слов — фундамент всего остального.</li>
              <li>Простые живые диалоги: знакомство, кафе, поездки.</li>
            </ol>
            <div className="trial-bridge">
              Первая ступень — уверенный <b>A1</b>. Преподаватель покажет, как к ней прийти по программе Just to Study.
            </div>
          </>
        ) : (
          <>
            <h2 className="trial-h2">Поздравляем!</h2>
            <p className="trial-hint">Ваш уровень английского:</p>
            <div className="trial-lvlhero">
              <h1 className={`trial-lvl trial-lvl--${result.level}`}>{result.level}</h1>
              <p className="trial-lvl__desc">{levelDesc[result.level] || ''}</p>
            </div>
            <div className="trial-cols">
              <div className="trial-col trial-col--strong">
                <div className="trial-col__t">🔥 Вы круто справились</div>
                <ul>
                  {strengths.length ? (
                    strengths.map((s) => <li key={s.name}>{s.name}</li>)
                  ) : (
                    <li>Смелость начать — уже сильная сторона!</li>
                  )}
                </ul>
              </div>
              <div className="trial-col trial-col--grow">
                <div className="trial-col__t">⚙️ Надо прокачать</div>
                <ul>
                  {growth.length ? growth.map((s) => <li key={s.name}>{s.name}</li>) : <li>Ровный профиль по всем блокам</li>}
                </ul>
              </div>
            </div>
            <div className="trial-bridge">
              Следующая ступень — <b>{nextLevelOf(result.level)}</b>. Преподаватель покажет, как к ней прийти по программе
              Just to Study.
            </div>
            <details className="trial-details">
              <summary>Подробные результаты по разделам</summary>
              {Object.entries(result.skills || {})
                .filter(([, stat]) => stat && stat.n)
                .map(([key, stat]) => (
                  <div key={key} className="trial-skrow">
                    <span>{SKILL_TITLES[key] || key}</span>
                    <b>
                      {stat.score != null && stat.score !== stat.correct ? stat.score : stat.correct} / {stat.n}
                    </b>
                  </div>
                ))}
              {vocab && (
                <div className="trial-skrow">
                  <span>{SKILL_TITLES.vocab_match}</span>
                  <b>{vocab.score} / {vocab.n}</b>
                </div>
              )}
              {result.lex && (
                <div className="trial-skrow">
                  <span>Словарь</span>
                  <b>{result.lex.score100}/100</b>
                </div>
              )}
            </details>
          </>
        )}

        {teacherMode && (
          <TeacherCard result={result} startCando={startCando} strengths={strengths} growth={growth} saveFailed={saveFailed} />
        )}

        <button className="trial-primary" onClick={onNext}>
          {isA0 ? 'Как я начну учиться →' : 'Мой план обучения →'}
        </button>
      </div>
    </div>
  )
}

/** Карточка урока для преподавателя: цифры оценки и скрипт разговора.
 *  Показывается только в режиме преподавателя (?teacher=1) — ученик видит
 *  экран без неё. */
function TeacherCard({ result, startCando, strengths, growth, saveFailed }) {
  const start = START_LEVELS.find((x) => x.cando === startCando)
  const script = [
    ['Приветствие', '«Рад(а) знакомству! Сегодня просто разберём ваш английский и наметим план — без оценок и экзаменов.»'],
    ['Знакомство', 'Слайд Introduction: имя, возраст, занятие, хобби — устно, помогайте с фразами.'],
    ['Цели', '«Why would you like to learn English? What is your goal?» — ответ понадобится на шаге про тариф.'],
    ['Результат', `Уровень ${result.level}. Начните с сильного: ${strengths.map((s) => s.name).join(', ') || 'смелость и мотивация'}.`],
    ['Зоны роста', growth.length ? `Мягко: «прокачаем ${growth.map((s) => s.name).join(', ')}»` : 'Ровный профиль — хвалим за баланс.'],
    ['Школа', 'Покажите платформу: программа A0 → C1 (24/7), AI-тьютор с голосом, ∞ practice, личный словарь, менеджер.'],
    ['Тариф', 'Аргументируйте от цели и результата, не от цены. Остальные форматы — как альтернатива.'],
    ['Закрытие', '«Предлагаю забронировать место и консультацию прямо сейчас» — форма на следующем экране.'],
  ]
  return (
    <div className="trial-tcard">
      <div className="trial-tcard__t">Карточка пробного урока</div>
      <div className="trial-tcard__row">
        Старт: {start ? start.label : '—'} · Уровень: <b>{result.level}</b> · θ̂ {Number(result.theta).toFixed(2)} · SE{' '}
        {Number(result.se).toFixed(2)}
      </div>
      {result.cutsProvisional && (
        <div className="trial-tcard__row trial-tcard__warn">
          Пороги уровней предварительные — банк заданий ещё не откалиброван. Уровень — ориентир для разговора, не измерение.
        </div>
      )}
      {result.flags?.length > 0 && <div className="trial-tcard__row">Флаги: {result.flags.join(', ')}</div>}
      {saveFailed && (
        <div className="trial-tcard__row trial-tcard__warn">
          Результат не сохранился на сервере — перепишите уровень вручную, ссылка ещё действует.
        </div>
      )}
      <ol className="trial-tcard__script">
        {script.map(([step, text]) => (
          <li key={step}>
            <b>{step}.</b> {text}
          </li>
        ))}
      </ol>
    </div>
  )
}
