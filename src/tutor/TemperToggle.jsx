import { useLang } from '../i18n/LanguageContext.jsx'

// Кнопка нрава — та самая «18+» у имени тьютора.
//
// Переключатель ХАРАКТЕРА: серая — жёсткий нрав выключен, тёмная — включён.
// С появлением обязательной даты рождения у неё есть и третье состояние:
// locked — ученику нет 18, кнопка не нажимается (сервер такой нрав всё равно
// не сохранит, см. /api/profile и выдачу LiveKit-токена).
// Раньше на этом месте была статичная плашка у Декстера (единственного, кто
// матерился); теперь характеров два и у него, и у Спарка, поэтому плашка стала
// кнопкой. Отсутствие оси у тьютора (Луна, Джарвис) = кнопки нет вовсе.
//
// Живёт отдельным файлом, потому что мест три: карточка на экране выбора,
// мобильная карусель и «Управление тьютором». Разъехавшись, они дали бы разный
// вид одной и той же кнопки.
export default function TemperToggle({ tutor, temper, onToggle, locked = false }) {
  const { t } = useLang()
  if (!tutor || !tutor.tempers) return null
  const on = temper === 'harsh'
  return (
    <button
      type="button"
      className={`t-adult${on ? '' : ' t-adult--off'}${locked ? ' t-adult--locked' : ''}`}
      aria-pressed={on}
      // disabled нельзя: кнопка внутри кликабельной карточки, и её клик тогда
      // всплывёт как выбор тьютора — заперев нрав, мы бы выбирали тьютора.
      aria-disabled={locked}
      title={t(locked ? 'tutor.adultLocked' : on ? 'tutor.adultHint' : 'tutor.adultHintOff')}
      onClick={(e) => {
        // Кнопка живёт внутри кликабельных карточек — свой клик наверх не пускаем.
        e.stopPropagation()
        if (locked) return
        onToggle && onToggle(tutor.key)
      }}
    >
      {t('tutor.adult')}
    </button>
  )
}
