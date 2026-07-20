import TutorShell from '../tutor/TutorShell.jsx'
import TutorCarousel from '../tutor/TutorCarousel.jsx'
import { WindowIcon, SpeakIcon, VolumeIcon } from '../tutor/TutorIcons.jsx'
import { TUTORS } from '../tutor/tutors.js'
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
}) {
  const { lang, t } = useLang()
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
        <TutorCarousel onChoose={onChoose} onListen={onListen} />

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
              <img className="t-tcard__avatar" src={tt.avatar} alt="" />
              <div className="t-tcard__name">{tt.name}</div>
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
              <p className="t-tcard__desc">{t(`tutor.${tt.key}.desc`)}</p>
              <div className="t-tcard__actions">
                <button
                  className="t-tcard__listen"
                  type="button"
                  onClick={() => onListen && onListen(tt.key)}
                >
                  {t(`tutor.${tt.key}.listen`)}
                  <VolumeIcon size={20} />
                </button>
                <button
                  className="t-tcard__choose"
                  type="button"
                  onClick={() => onChoose && onChoose(tt.key)}
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
