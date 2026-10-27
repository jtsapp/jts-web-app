import { useRef, useState } from 'react'
import TutorShell from '../tutor/TutorShell.jsx'
import TutorThumb from '../tutor/TutorThumb.jsx'
import { VolumeIcon } from '../tutor/TutorIcons.jsx'
import { PICK_TUTORS, TUTOR_GREETING, sampleKey, temperFor } from '../tutor/tutors.js'
import { playTutorSample } from '../lib/ielts-audio.js'
import { useLang } from '../i18n/LanguageContext.jsx'
// Имя раздела — из словаря приложения: там оно «Speaking Buddy», как во вкладке и меню.
import { useI18n } from '../i18n.jsx'
// Что есть только на телефоне — разметка, а не только стили, поэтому порог
// мобильного слоя нужен и в JS (до гидратации — десктоп, см. useMediaQuery).
import { useMediaQuery, MOBILE_QUERY } from '../lib/useMediaQuery.js'

// Приветствие и выбор тьютора — один экран (макет «Speaking Buddy», Figma
// 5316:1238 — никто не выбран, 5316:1427 — выбрана Айзере). Раньше это были два
// экрана с выбором языка между ними; теперь сверху баннер-приветствие, под ним
// ряд фигурок, клик по фигурке выделяет тьютора, а «Начать обучение» в баннере
// ведёт дальше с выделенным.
//
// На телефоне (≤560) — тот же экран по кадру мобильного приложения (Figma
// «pitch JTS (Copy)», страница «Mobile», 6132:5848, 27.10.2026): заголовок
// раздела, баннер и сетка карточек 2×2 с подписью под именем. Двух шагов
// «баннер → карусель» (макет «Web Адаптивка») больше нет. Карусель давала то,
// чего у карточки нет, — описание и «Послушать голос»; в кадре их нет, но
// описание Декстера и есть его «контракт характера» (см. dict.js), поэтому на
// телефоне оба живут под сеткой у выделенного тьютора. Кнопки 18+ нет ни там,
// ни там: нрав переключается в «Управлении тьютором», а отсюда уходит тот, что у
// ученика уже сохранён для этого тьютора, иначе дефолтный (temperFor).
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
  const { t: tApp } = useI18n()
  const [picked, setPicked] = useState(selected)
  const phone = useMediaQuery(MOBILE_QUERY)
  const rowRef = useRef(null)
  const current = PICK_TUTORS.find((tt) => tt.key === picked) || null
  const soon = Boolean(current?.comingSoon)

  const temperOf = (tt) => temperFor(tt.key, tt.key === tutorKey ? temper : null)

  // Строка словаря, которой может не быть: у dev-only тьюторов подписи и
  // описания нет, и сырой ключ на экране хуже пустого места.
  const tOpt = (key) => {
    const s = t(key)
    return s === key ? '' : s
  }

  function choose(tt) {
    if (!tt || tt.comingSoon) return
    onChoose && onChoose(tt.key, temperOf(tt))
  }

  function start() {
    // Кнопка в баннере выше ряда, и нажать её можно, никого не выбрав. Молча
    // ничего не делать нельзя — показываем ряд, где выбирать.
    if (!current) {
      rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      rowRef.current?.querySelector('button')?.focus({ preventScroll: true })
      return
    }
    choose(current)
  }

  // Описание и визитка выделенного — только телефону (см. шапку). Описание — по
  // нраву, как было в карусели; визитка — готовый файл public/tutor/voice/<ключ>.mp3,
  // его источник TUTOR_GREETING: нет строки — нет и файла (Айзере).
  const about = phone && current
  const desc = about
    ? tOpt(temperOf(current) === 'harsh' ? `tutor.${current.key}.desc18` : `tutor.${current.key}.desc`)
    : ''
  const sample = about ? sampleKey(current.key, temperOf(current)) : ''
  const listenable = Boolean(sample && TUTOR_GREETING[sample])

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
        {/* Заголовок раздела из кадра — только телефону: на компьютере раздел назван в сайдбаре. */}
        {phone && <div className="t-pick__page">{tApp('nav.tutor')}</div>}

        <section className="t-pick__hero">
          <img className="t-pick__art" src="/tutor/pick/banner.webp" alt="" />
          <div className="t-pick__intro">
            <div className="t-pick__text">
              <h1 className="t-pick__title">{t('welcome.title')}</h1>
              <p className="t-pick__sub">{t('welcome.sub')}</p>
            </div>
            <button className="t-pick__start" type="button" onClick={start} disabled={soon}>
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
            const tag = phone ? tOpt(`tutor.${tt.key}.tagline`) : ''
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
                  {/* Черты — десктопу; на телефоне в кадре одна строка подписи. */}
                  {on && !phone && (
                    <span className="t-pick__chips">
                      {tt.traitColors.map((color, i) => (
                        <span className="t-pick__chip" key={color} style={{ background: color }}>
                          {t(`tutor.${tt.key}.trait${i + 1}`)}
                        </span>
                      ))}
                    </span>
                  )}
                  {tag && <span className="t-pick__tag">{tag}</span>}
                </span>
                {on && phone && <span className="t-pick__check" aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        {about && (desc || listenable) && (
          <div className="t-pick__about">
            {desc && <p className="t-pick__desc">{desc}</p>}
            {listenable && (
              <button className="t-pick__listen" type="button" onClick={() => playTutorSample(sample)}>
                {t(`tutor.${current.key}.listen`)}
                <VolumeIcon size={20} />
              </button>
            )}
          </div>
        )}
      </div>
    </TutorShell>
  )
}
