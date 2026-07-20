import { LANGS, useI18n } from '../i18n.jsx'

// Мобильная bottom-sheet выбора языка приложения (Figma iPhone 9): тёмный
// оверлей + белая шторка снизу с тремя языками. Активный — пурпурная пилюля.
const TITLE = {
  ru: 'Выбор языка приложения',
  kz: 'Қолданба тілін таңдау',
  en: 'App language',
}

export default function LangSheet({ onPick }) {
  const { lang, setLang } = useI18n()
  return (
    <div className="lsheet">
      <div className="lsheet__scrim" />
      <div className="lsheet__panel">
        <h3 className="lsheet__title">{TITLE[lang] || TITLE.ru}</h3>
        <div className="lsheet__list">
          {LANGS.map((l) => {
            const Flag = l.Flag
            const active = l.code === lang
            return (
              <button
                key={l.code}
                className={`lsheet__opt ${active ? 'lsheet__opt--active' : ''}`}
                type="button"
                onClick={() => {
                  setLang(l.code)
                  onPick?.(l.code)
                }}
              >
                <Flag />
                <span>{l.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
