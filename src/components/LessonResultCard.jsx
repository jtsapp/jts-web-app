import AssetImage from './AssetImage.jsx'

// Итоги пройденного урока (Figma «Обучение» → Wrap, Screen 4024:46748;
// онлайн-урок — та же карточка, Screen 4065:30498).
//
// Общая часть — процент, заголовок по проценту, подпись и два счётчика
// ответов. Различаются только действия внизу, поэтому они приходят детьми:
// у урока «Обучения» это «следующий урок» (или объяснение лимита), у живого
// занятия следующего урока нет — его назначает преподаватель в расписании.
//
// Маскот — цельный экспорт группы из макета: персонаж там выходит за
// скруглённый фон сверху и снизу, поэтому фон нельзя рисовать на CSS, а
// персонажа накладывать сверху — напуски и подрезка кадра потеряются.

// Streamline Ultimate «Smiley-Wrong» и Streamline Plump «Check-Thick». Рисуем
// разметкой, а не картинками: они однотонные и должны попадать в цвет карточки.
function WrongIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" aria-hidden="true">
      <g stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0.65625 10.5C0.65625 13.1107 1.69335 15.6145 3.53942 17.4606C5.38548 19.3066 7.88927 20.3438 10.5 20.3438C13.1107 20.3438 15.6145 19.3066 17.4606 17.4606C19.3066 15.6145 20.3438 13.1107 20.3438 10.5C20.3438 7.88927 19.3066 5.38548 17.4606 3.53942C15.6145 1.69335 13.1107 0.65625 10.5 0.65625C7.88927 0.65625 5.38548 1.69335 3.53942 3.53942C1.69335 5.38548 0.65625 7.88927 0.65625 10.5Z" />
        <path d="M5.90625 7.21875H8.53125" />
        <path d="M7.21875 8.53125V5.90625" />
        <path d="M12.4688 7.21875H15.0938" />
        <path d="M13.7812 8.53125V5.90625" />
        <path d="M5.90625 15.0941C5.90625 12.8506 6.94925 11.9922 8.41225 11.9922C10.9498 11.9922 10.0494 15.0941 12.5877 15.0941C14.0525 15.0941 15.0938 14.2348 15.0938 11.9922" />
      </g>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.2067 3.80546C18.615 4.36213 18.5242 5.11171 18.1442 5.68796C14.5879 11.0755 12.0267 14.3484 10.6096 16.0421C9.90667 16.8817 8.68583 16.9434 7.89083 16.1896C5.8202 14.2207 3.87435 12.1245 2.06458 9.91338C1.56042 9.29546 1.45625 8.42338 1.94708 7.79463C2.37375 7.24796 2.86083 6.7788 3.30125 6.40713C4.03167 5.79046 5.08625 5.93046 5.74292 6.62546C7.76917 8.77213 8.99042 10.2713 8.99042 10.2713C8.99042 10.2713 10.9979 7.33796 14.2188 2.82546C14.7175 2.12671 15.6063 1.8013 16.3571 2.21755C16.96 2.55213 17.6608 3.0613 18.2067 3.80505V3.80546Z"
        fill="#fff"
      />
    </svg>
  )
}

/** Заголовок итогов по доле верных ответов — общий для обоих уроков. */
export function resultTitle(accuracy) {
  if (accuracy >= 80) return 'Отличный результат'
  if (accuracy >= 50) return 'Хорошая работа'
  return 'Урок пройден'
}

export default function LessonResultCard({ accuracy = 100, correct = 0, wrong = 0, subtitle, children }) {
  return (
    <div className="le-over le-over--ok">
      <div className="le-card">
        <AssetImage className="le-art le-art--win" src="/assets/learning/result-win.webp" alt="" />
        <div className="le-info">
          <div className="le-pct">{accuracy}%</div>
          <div className="le-head">
            <h2 className="le-title">{resultTitle(accuracy)}</h2>
            <p className="le-sub">{subtitle}</p>
          </div>
          <div className="le-bottom">
            <div className="le-stats">
              <div className="le-stat le-stat--wrong">
                <div className="le-stat__row">
                  <span className="le-stat__ic" aria-hidden="true">
                    <WrongIcon />
                  </span>
                  <b>{wrong}</b>
                </div>
                <span>Неверных ответов</span>
              </div>
              <div className="le-stat le-stat--right">
                <div className="le-stat__row">
                  <span className="le-stat__ic" aria-hidden="true">
                    <CheckIcon />
                  </span>
                  <b>{correct}</b>
                </div>
                <span>Верных ответов</span>
              </div>
            </div>
            <div className="le-acts">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
