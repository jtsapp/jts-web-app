// Навбар телефона по макету приложения (Figma «Mobile» → «Сервисы» → «Словарь»): стрелка 48 слева, название по
// центру. Рисуется только на телефонной ширине (usePhoneWidth у экрана): у компьютера над заголовком своя
// «← Назад», и вторая полоса ему не нужна. Без onBack стрелки нет — так выглядит итог практики («Результат»).
// right — правый слот 48 навбара макета (на главной словаря там «?» тура: кнопки угла экран на телефоне прячет).
export default function PhoneBar({ title, onBack, backLabel, right }) {
  return (
    <div className="vp-mbar">
      {onBack ? <button type="button" className="vp-mbar__back" onClick={onBack} aria-label={backLabel} /> : null}
      <b className="vp-mbar__title">{title}</b>
      {right ? <div className="vp-mbar__slot">{right}</div> : null}
    </div>
  )
}

/** «LESSON 3» каталога → «Lesson 3» навбара: в шапке урока макет пишет номер обычным регистром. */
export function lessonBarTitle(tag) {
  const s = String(tag || '').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}
