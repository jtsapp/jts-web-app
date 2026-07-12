import { RuFlagIcon, ChevronRightIcon } from './icons.jsx'

export default function LangSelector() {
  return (
    <button className="lang-selector" type="button">
      <RuFlagIcon />
      <span>Русский</span>
      <ChevronRightIcon size={14} />
    </button>
  )
}
