import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { CollapseIcon, ExpandIcon } from '../../components/icons.jsx'
import usePracticeUnitCredit from '../../practice/usePracticeUnitCredit.js'

/**
 * Рамка открытого задания в домашней работе — общая для отдельной выдачи
 * (MaterialAssignmentDetail) и части-материала в ленте (HomeworkMaterialPart).
 *
 * На странице рамка живёт в правой колонке за списком работ и внутри двух
 * карточек с отступами: урок, свёрстанный под экран, там тесный — на ноутбуке
 * ему достаётся полэкрана, на телефоне меньше 300px. Поэтому у рамки есть
 * «Во весь экран»: та же рамка встаёт fixed поверх всего кабинета.
 *
 * Разворачиваем классом на том же узле, а не порталом и не Fullscreen API:
 * перенос iframe в другое место DOM перезагружает документ, и ученик терял бы
 * всё решённое в уроке; Fullscreen API на iOS Safari нет, а в настоящем полном
 * экране пропадает шапка с кнопкой «Свернуть» — выход только по Esc, о котором
 * ученик не знает.
 *
 * `frameRef` — узел iframe для владельца: часть-материал слушает по нему мост
 * рамки (event.source === frame.contentWindow).
 *
 * Задания, перенесённые в урок из «Практики», засчитывают свой юнит и там
 * (usePracticeUnitCredit): домашка — работа ученика, в том числе открытая уже
 * сданной — её ответы тоже его.
 */
export default function HomeworkFrame({ src, title, frameRef }) {
  const { t } = useI18n()
  const [full, setFull] = useState(false)
  const ownRef = useRef(null)
  const iframeRef = frameRef ?? ownRef
  usePracticeUnitCredit(iframeRef)

  // Оверлей закрывает кабинет целиком: прокрутка страницы под ним только уводит
  // её туда, куда из-под оверлея не вернуться. Esc — привычный выход, пока фокус
  // на странице (внутри чужого документа рамки клавиши до нас не доходят, для
  // этого и кнопка «Свернуть» в шапке).
  useEffect(() => {
    if (!full) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') setFull(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [full])

  const label = full ? t('homework.frameExit') : t('homework.frameFull')

  return (
    <div className={`hw-frame${full ? ' hw-frame--full' : ''}`}>
      <div className="hw-frame__bar">
        {/* Заголовок нужен только в развёрнутом виде: на странице над рамкой и
            так стоит название задания. */}
        {full && <span className="hw-frame__title">{title}</span>}
        <button
          type="button"
          className="hw-frame__toggle"
          aria-pressed={full}
          onClick={() => setFull((value) => !value)}
        >
          {full ? <CollapseIcon size={16} /> : <ExpandIcon size={16} />}
          <span>{label}</span>
        </button>
      </div>
      {/* allow="autoplay" — разрешение выдаётся документу, а материал живёт в
          своём iframe; у заданий на слух без этого молчала бы запись. fullscreen —
          для встроенных в задание активностей вроде Wordwall: их кнопка «на весь
          экран» работает, только если право выдано по всей цепочке рамок сверху
          вниз (своя кнопка «Во весь экран» от него не зависит). */}
      <iframe ref={iframeRef} src={src} title={title} className="hw-frame__iframe" allow="autoplay; fullscreen" />
    </div>
  )
}
