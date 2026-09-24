import { useRef, useState } from 'react'
import TutorShell from '../tutor/TutorShell.jsx'
import TutorThumb from '../tutor/TutorThumb.jsx'
import { PICK_TUTORS, temperFor } from '../tutor/tutors.js'
import { useLang } from '../i18n/LanguageContext.jsx'

// Приветствие и выбор тьютора — один экран (макет «Speaking Buddy», Figma
// 5316:1238 — никто не выбран, 5316:1427 — выбрана Айзере). Раньше это были два
// экрана с выбором языка между ними; теперь сверху баннер-приветствие, под ним
// ряд фигурок, клик по фигурке выделяет тьютора, а «Начать обучение» в баннере
// ведёт дальше с выделенным.
//
// Кнопки 18+, «Послушать голос» и описания на карточке больше нет — так в
// макете. Нрав переключается в «Управлении тьютором», а отсюда уходит тот, что
// у ученика уже сохранён для этого тьютора, иначе дефолтный (temperFor).
export default function TutorChoosePage({
  user,
  onNavigate,
  onProfile,
  onBack,
  onChoose,
  // Сохранённый тьютор и его нрав — чтобы смена тьютора туда-обратно не
  // сбрасывала выбранный ранее характер.
  tutorKey = '',
  temper = null,
  // Кого выделить сразу. Пусто при первом проходе (макет 5316:1238: ряд без
  // выделения); при смене тьютора из «Управления» — текущий.
  selected = '',
}) {
  const { t } = useLang()
  const [picked, setPicked] = useState(selected)
  const rowRef = useRef(null)
  const current = PICK_TUTORS.find((tt) => tt.key === picked) || null
  const soon = Boolean(current?.comingSoon)

  function start() {
    // Кнопка в баннере выше ряда, и нажать её можно, никого не выбрав. Молча
    // ничего не делать нельзя — показываем ряд, где выбирать.
    if (!current) {
      rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      rowRef.current?.querySelector('button')?.focus({ preventScroll: true })
      return
    }
    if (soon) return
    onChoose && onChoose(current.key, temperFor(current.key, current.key === tutorKey ? temper : null))
  }

  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      layout="flow"
    >
      <div className="t-pick">
        <section className="t-pick__hero">
          <img className="t-pick__art" src="/tutor/pick/banner.webp" alt="" />
          <div className="t-pick__intro">
            <div className="t-pick__text">
              <h1 className="t-pick__title">{t('welcome.title')}</h1>
              <p className="t-pick__sub">{t('welcome.sub')}</p>
            </div>
            <button
              className="t-pick__start"
              type="button"
              onClick={start}
              disabled={soon}
            >
              {soon ? t('choose.soon') : t('welcome.start')}
            </button>
          </div>
        </section>

        <h2 className="t-pick__heading">{t('choose.title')}</h2>

        <div
          className={'t-pick__row' + (current ? ' has-pick' : '')}
          ref={rowRef}
          role="radiogroup"
          aria-label={t('choose.title')}
        >
          {PICK_TUTORS.map((tt) => {
            const on = tt.key === picked
            return (
              <button
                key={tt.key}
                type="button"
                role="radio"
                aria-checked={on}
                className={'t-pick__card' + (on ? ' is-picked' : '')}
                onClick={() => setPicked(tt.key)}
              >
                {tt.figure ? (
                  <img className="t-pick__figure" src={tt.figure} alt="" />
                ) : (
                  // Фигурки нет только у KZ-теста (dev-only): у него орб вместо лица.
                  <TutorThumb tutor={tt} className="t-pick__figure t-pick__figure--orb" />
                )}
                <span className="t-pick__plate">
                  <span className="t-pick__name">{tt.name}</span>
                  {on && (
                    <span className="t-pick__chips">
                      {tt.traitColors.map((color, i) => (
                        <span className="t-pick__chip" key={color} style={{ background: color }}>
                          {t(`tutor.${tt.key}.trait${i + 1}`)}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </TutorShell>
  )
}
