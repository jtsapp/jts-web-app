import { useLang } from '../i18n/LanguageContext.jsx'

// Кнопка нрава — та самая «18+» у имени тьютора.
//
// Не возрастной гейт: проверки возраста в приложении нет и не появилось. Это
// переключатель ХАРАКТЕРА: серая — жёсткий нрав выключен, тёмная — включён.
// Раньше на этом месте была статичная плашка у Декстера (единственного, кто
// матерился); теперь характеров два и у него, и у Спарка, поэтому плашка стала
// кнопкой. Отсутствие оси у тьютора (Луна, Джарвис) = кнопки нет вовсе.
//
// Живёт отдельным файлом, потому что мест три: карточка на экране выбора,
// мобильная карусель и «Управление тьютором». Разъехавшись, они дали бы разный
// вид одной и той же кнопки.
export default function TemperToggle({ tutor, temper, onToggle }) {
  const { t } = useLang()
  if (!tutor || !tutor.tempers) return null
  const on = temper === 'harsh'
  return (
    <button
      type="button"
      className={on ? 't-adult' : 't-adult t-adult--off'}
      aria-pressed={on}
      title={t(on ? 'tutor.adultHint' : 'tutor.adultHintOff')}
      onClick={(e) => {
        // Кнопка живёт внутри кликабельных карточек — свой клик наверх не пускаем.
        e.stopPropagation()
        onToggle && onToggle(tutor.key)
      }}
    >
      {t('tutor.adult')}
    </button>
  )
}
