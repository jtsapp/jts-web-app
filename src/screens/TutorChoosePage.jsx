import { useEffect, useRef, useState } from 'react'
import TutorShell from '../tutor/TutorShell.jsx'
import TutorCarousel from '../tutor/TutorCarousel.jsx'
import TutorThumb from '../tutor/TutorThumb.jsx'
import TemperToggle from '../tutor/TemperToggle.jsx'
import { WindowIcon, SpeakIcon, VolumeIcon } from '../tutor/TutorIcons.jsx'
import { TUTORS, temperFor, sampleKey } from '../tutor/tutors.js'
import { useLang } from '../i18n/LanguageContext.jsx'

// Отображаемые названия языков (для плашек «Язык интерфейса/объяснения»).
const LANG_LABEL = { kz: 'Қазақша', ru: 'Русский', en: 'English' }

// Короткий заголовок для мобильного топбара (Figma frame 91: «Выбор тьютора»).
// Десктоп прячет его через CSS и показывает длинный t('choose.title') как h1.
const CHOOSE_TITLE_SHORT = { ru: 'Выбор тьютора', kz: 'Тьютор таңдау', en: 'Choose a tutor' }

export default function TutorChoosePage({
  user,
  onNavigate,
  onProfile,
  onBack,
  onChoose,
  onListen,
  langExplain,
  // Что уже выбрано в профиле — чтобы кнопка 18+ открылась в том состоянии, в
  // каком ученик её оставил, а не в дефолтном.
  tutorKey = '',
  temper = null,
  // Ученику нет 18 — кнопка жёсткого нрава заперта во всех трёх местах, где
  // она встречается (сетка, карусель, «Управление тьютором»).
  adultLocked = false,
}) {
  const { lang, t } = useLang()
  // Состояние кнопок 18+ живёт ЗДЕСЬ, а не в карточке и не в карусели: сетка и
  // карусель показывают одних и тех же тьюторов, и разъехавшись, они дали бы
  // ученику разный характер в зависимости от того, где он нажал «выбрать».
  const [tempers, setTempers] = useState(() => {
    const seed = {}
    for (const tt of TUTORS) {
      if (!tt.tempers) continue
      seed[tt.key] = temperFor(tt.key, tt.key === tutorKey ? temper : null)
    }
    return seed
  })
  const toggleTemper = (key) =>
    setTempers((prev) => ({ ...prev, [key]: prev[key] === 'harsh' ? 'calm' : 'harsh' }))

  // Профиль грузится асинхронно, а на этот экран можно попасть диплинком
  // ?screen=tutor-choose — тогда на первом рендере сохранённого нрава ещё нет и
  // кнопки открываются в дефолте. Досеиваем их, когда профиль доехал, но РОВНО
  // один раз: иначе поздний ответ сети затирал бы то, что ученик уже нажал.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !tutorKey || !temper) return
    seeded.current = true
    setTempers((prev) => (prev[tutorKey] ? { ...prev, [tutorKey]: temper } : prev))
  }, [tutorKey, temper])
  const langUi = LANG_LABEL[lang] || LANG_LABEL.ru
  // Язык объяснения пока не выбирается отдельно — по умолчанию совпадает с интерфейсом.
  const explain = langExplain || langUi

  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      title={CHOOSE_TITLE_SHORT[lang] || CHOOSE_TITLE_SHORT.ru}
      layout="flow"
    >
      <div className="t-choose">
        <h1 className="t-choose__title">{t('choose.title')}</h1>

        {/* Мобильная coverflow-карусель (свайп + бесконечный цикл); десктоп — сетка ниже */}
        <TutorCarousel
          onChoose={onChoose}
          onListen={onListen}
          tempers={tempers}
          onToggleTemper={toggleTemper}
          adultLocked={adultLocked}
        />

        <div className="t-choose__pills">
          <span className="t-ipill">
            <WindowIcon size={18} />
            {t('choose.langUi')}: <b>{langUi}</b>
          </span>
          <span className="t-ipill">
            <SpeakIcon size={18} />
            {t('choose.langExplain')}: <b>{explain}</b>
          </span>
        </div>

        <div className="t-choose__grid">
          {TUTORS.map((tt) => (
            <div className="t-tcard" key={tt.key}>
              <TutorThumb tutor={tt} className="t-tcard__avatar" />
              <div className="t-tcard__name">
                {tt.name}
                <TemperToggle
                  tutor={tt}
                  temper={tempers[tt.key]}
                  onToggle={toggleTemper}
                  locked={adultLocked}
                />
              </div>
              <div className="t-tcard__chips">
                {tt.traitColors.map((color, i) => {
                  const label = t(`tutor.${tt.key}.trait${i + 1}`)
                  return (
                    <span className="t-chip" key={label} style={{ background: color }}>
                      {label}
                    </span>
                  )
                })}
              </div>
              <p className="t-tcard__desc">
                {t(tempers[tt.key] === 'harsh' ? `tutor.${tt.key}.desc18` : `tutor.${tt.key}.desc`)}
              </p>
              <div className="t-tcard__actions">
                <button
                  className="t-tcard__listen"
                  type="button"
                  onClick={() => onListen && onListen(sampleKey(tt.key, tempers[tt.key]))}
                >
                  {t(`tutor.${tt.key}.listen`)}
                  <VolumeIcon size={20} />
                </button>
                <button
                  className="t-tcard__choose"
                  type="button"
                  onClick={() => onChoose && onChoose(tt.key, tempers[tt.key] || null)}
                >
                  {t(`tutor.${tt.key}.choose`)}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TutorShell>
  )
}
