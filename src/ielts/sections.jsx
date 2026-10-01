import { HeadphonesIcon, MenuBookIcon, EditIcon, MicIcon, TranslateIcon } from './icons.jsx'

// Цвет и иконка каждой секции IELTS — одни на весь раздел: плитка задачи
// плана, точка в «Текущем балле», карточка во вкладке «Обучение». Значения из
// макета Screen MS. В CSS приходят переменными --ih-tone / --ih-tint.
export const SECTION_META = {
  listening: { Icon: HeadphonesIcon, tone: '#2f7bf5', tint: '#e8f1ff', name: 'Listening' },
  reading: { Icon: MenuBookIcon, tone: '#e57a12', tint: '#fff1e3', name: 'Reading' },
  writing: { Icon: EditIcon, tone: '#9047ff', tint: '#f2ebff', name: 'Writing' },
  speaking: { Icon: MicIcon, tone: '#1f9d55', tint: '#e6f6ec', name: 'Speaking' },
  vocab: { Icon: TranslateIcon, tone: '#b7791f', tint: '#fff4db', name: 'Vocabulary' },
}

export function sectionStyle(section) {
  const m = SECTION_META[section] || SECTION_META.reading
  return { '--ih-tone': m.tone, '--ih-tint': m.tint }
}

// Плитка с иконкой секции (40×40, радиус 12) — строка плана, карточка секции.
export function SectionTile({ section, size = 40, iconSize = 20 }) {
  const { Icon } = SECTION_META[section] || SECTION_META.reading
  return (
    <span className="ih-tile" style={{ ...sectionStyle(section), width: size, height: size }} aria-hidden="true">
      <Icon size={iconSize} />
    </span>
  )
}
