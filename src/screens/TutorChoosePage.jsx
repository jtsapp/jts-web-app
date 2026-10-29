import { useRef, useState } from 'react'
import TutorShell from '../tutor/TutorShell.jsx'
import TutorThumb from '../tutor/TutorThumb.jsx'
import TutorCarousel from '../tutor/TutorCarousel.jsx'
import { PlayIcon } from '../tutor/TutorIcons.jsx'
import { PICK_TUTORS, TUTOR_GREETING, sampleKey, temperFor } from '../tutor/tutors.js'
import { playTutorSample } from '../lib/ielts-audio.js'
import { useLang } from '../i18n/LanguageContext.jsx'
// Имя раздела — из словаря приложения: там оно «Speaking Buddy», как во вкладке и меню.
import { useI18n } from '../i18n.jsx'
// Карусель и ряд — разная разметка, а не только стили, поэтому порог
// мобильного слоя нужен и в JS (до гидратации — десктоп, см. useMediaQuery).
import { useMediaQuery, MOBILE_QUERY } from '../lib/useMediaQuery.js'

// Выбор тьютора по макету 29.10.2026 (Figma «pitch JTS (Copy)» → «Mobile» →
// «AI-тьютор», кадры 7248:17411 — Декстер, 7248:17705 — Декстер с 18+,
// 7248:18891 — Луна). На телефоне — карусель карточек: фигурка на цветной
// сцене, имя и «Послушать», подпись, черты, описание; внизу «Выбрать <имя>».
// Компьютерного кадра нет — та же карточка рядом из четырёх (раскладка узла
// 7248:18479 «Tutor carousel» 1324×564), выбранная в фиолетовой рамке.
//
// Баннер-приветствие прежнего макета («Speaking Buddy», сентябрь 2026) ушёл:
// в новом его нет ни на телефоне, ни в раскладке ряда.
//
// Кнопка 18+ вернулась на карточку (в макете переключатель на сцене у Декстера
// и Спарка). Нрав, выбранный здесь, уходит вместе с тьютором; без выбора — тот,
// что у ученика уже сохранён для этого тьютора, иначе дефолтный (temperFor).
export default function TutorChoosePage({
  user,
  onNavigate,
  onProfile,
  onBack,
  onChoose,
  // Нрав каждого тьютора ({ dexter: 'harsh' }) — чтобы смена тьютора
  // туда-обратно не сбрасывала выбранный ранее характер.
  tempers = {},
  // Кого выделить сразу. Пусто при первом проходе — тогда первый из ряда
  // (Декстер, как в кадре); при смене тьютора — текущий.
  selected = '',
}) {
  const { t } = useLang()
  const { t: tApp } = useI18n()
  const phone = useMediaQuery(MOBILE_QUERY)
  const [picked, setPicked] = useState(() => (PICK_TUTORS.some((tt) => tt.key === selected) ? selected : PICK_TUTORS[0].key))
  // Нрав, переключённый на карточке, — только этого экрана, пока не нажали «Выбрать».
  const [localTempers, setLocalTempers] = useState(tempers)
  const ctaRef = useRef(null)
  const current = PICK_TUTORS.find((tt) => tt.key === picked) || PICK_TUTORS[0]
  const soon = Boolean(current.comingSoon)

  const temperOf = (tt) => temperFor(tt.key, localTempers[tt.key])
  const toggleTemper = (tt) =>
    setLocalTempers((prev) => ({ ...prev, [tt.key]: temperOf(tt) === 'harsh' ? 'calm' : 'harsh' }))

  // Строка словаря, которой может не быть: у dev-only тьюторов подписи и
  // описания нет, и сырой ключ на экране хуже пустого места.
  const tOpt = (key) => {
    const s = t(key)
    return s === key ? '' : s
  }

  function choose() {
    if (soon) return
    onChoose && onChoose(current.key, temperOf(current))
  }

  function pickOnDesktop(tt) {
    setPicked(tt.key)
    // Кнопка под рядом; на низком окне её может не быть видно — показываем.
    ctaRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  }

  const renderCard = (tt, on) => (
    <TutorCard
      tutor={tt}
      on={on}
      temper={temperOf(tt)}
      onToggleTemper={() => toggleTemper(tt)}
      tOpt={tOpt}
      t={t}
    />
  )

  return (
    <TutorShell active="tutor" user={user} onNavigate={onNavigate} onProfile={onProfile} onBack={onBack} layout="flow">
      <div className="t-pick">
        <h1 className="t-pick__title">{phone ? tApp('nav.tutor') : t('choose.title')}</h1>

        {phone ? (
          <TutorCarousel tutors={PICK_TUTORS} startKey={picked} onActive={setPicked} renderCard={renderCard} />
        ) : (
          <div className="t-pick__row" role="radiogroup" aria-label={t('choose.title')}>
            {PICK_TUTORS.map((tt) => {
              const on = tt.key === picked
              return (
                <div
                  key={tt.key}
                  className={'t-pick__slot' + (on ? ' is-picked' : '')}
                  role="radio"
                  aria-checked={on}
                  aria-label={tt.name}
                  tabIndex={0}
                  onClick={() => pickOnDesktop(tt)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return
                    e.preventDefault()
                    pickOnDesktop(tt)
                  }}
                >
                  {renderCard(tt, true)}
                </div>
              )
            })}
          </div>
        )}

        <button ref={ctaRef} className="t-pick__start" type="button" onClick={choose} disabled={soon}>
          {soon ? t('choose.soon') : tOpt(`tutor.${current.key}.choose`) || current.name}
        </button>
      </div>
    </TutorShell>
  )
}

// Карточка тьютора (узел «Tutor Декстер» 322×564): сцена с фигуркой и 18+,
// имя с «Послушать», подпись, черты, описание. on — карточка в фокусе: только
// у неё живые кнопки (у соседей в карусели они под прозрачностью и не жмутся).
function TutorCard({ tutor: tt, on, temper, onToggleTemper, tOpt, t }) {
  const harsh = temper === 'harsh'
  const desc = tOpt(harsh ? `tutor.${tt.key}.desc18` : `tutor.${tt.key}.desc`)
  const tag = tOpt(`tutor.${tt.key}.tagline`)
  const traits = (tt.traitColors || []).map((_, i) => tOpt(`tutor.${tt.key}.trait${i + 1}`)).filter(Boolean)
  // Визитка — готовый файл public/tutor/voice/<ключ>.mp3, его источник
  // TUTOR_GREETING: нет строки — нет и файла (Айзере, dev-only тьюторы).
  const sample = sampleKey(tt.key, temper)
  const listenable = Boolean(TUTOR_GREETING[sample])
  const tab = on ? 0 : -1
  const art = tt.card || tt.figure
  return (
    <div className={'t-pick__card' + (on ? ' is-picked' : '') + (harsh ? ' is-harsh' : '')}>
      <div className="t-pick__stage" style={tt.stage ? { background: tt.stage } : undefined}>
        <span className="t-pick__glow" aria-hidden="true" />
        {art ? (
          <img className="t-pick__figure" src={art} alt="" draggable={false} />
        ) : (
          // Картинки нет только у тьютора с орбом вместо лица (dev-only).
          <TutorThumb tutor={tt} className="t-pick__figure t-pick__figure--orb" />
        )}
        {tt.tempers && (
          <button
            className={'t-pick__adult' + (harsh ? ' is-on' : '')}
            type="button"
            tabIndex={tab}
            aria-pressed={harsh}
            title={t(harsh ? 'tutor.adultHint' : 'tutor.adultHintOff')}
            onClick={(e) => {
              // Кнопка живёт внутри выбираемой карточки — свой клик наверх не пускаем.
              e.stopPropagation()
              onToggleTemper()
            }}
          >
            {t('tutor.adult')}
            <span className="t-pick__switch" aria-hidden="true" />
          </button>
        )}
        {tt.comingSoon && <span className="t-pick__soon">{t('choose.soon')}</span>}
      </div>
      <div className="t-pick__head">
        <div className="t-pick__namerow">
          <span className="t-pick__name">{tt.name}</span>
          {listenable && (
            <button
              className="t-pick__listen"
              type="button"
              tabIndex={tab}
              aria-label={tOpt(`tutor.${tt.key}.listen`) || t('choose.listen')}
              onClick={(e) => {
                e.stopPropagation()
                playTutorSample(sample)
              }}
            >
              <PlayIcon size={20} />
              {t('choose.listen')}
            </button>
          )}
        </div>
        {tag && <span className="t-pick__tag">{tag}</span>}
      </div>
      {traits.length > 0 && (
        <div className="t-pick__traits">
          {traits.map((trait) => (
            <span className="t-pick__trait" key={trait}>
              {trait}
            </span>
          ))}
        </div>
      )}
      {desc && <p className="t-pick__desc">{desc}</p>}
    </div>
  )
}
