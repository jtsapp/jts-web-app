import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { startMaterialAssignment, materialAssignmentRenderUrl } from '../../api.js'
import { isInteractiveMaterial, isLessonCard, isWholeCatalogLesson } from './materialAssignments.js'
import { catalogLessonIdFor } from '../live/catalogLessonByUrl.js'

/**
 * «Открыть задание» у назначенного материала — общая логика для отдельного
 * экрана выдачи (MaterialAssignmentDetail) и части-материала внутри ленты
 * домашней работы (HomeworkMaterialPart, привязанные материалы). Куда ведёт
 * нажатие, решают одни и те же три пути:
 *
 * - задана одна карточка живого урока — в сам урок кабинета (у неё бывает
 *   аудио с относительным путём и картинки из словарной колоды того же
 *   урока, вне урока они не работают);
 * - урок каталога целиком — туда же, с начала урока (в файле курса нет
 *   скрипта заданий, вариант ответа там не нажимается);
 * - интерактив/файл каталога — рамкой render-эндпоинта прямо на странице
 *   (мост внутри сохраняет ответы и знает выданный блок);
 * - обычный файл (PDF/видео/чужая ссылка) — новой вкладкой, встроить чужой
 *   сайт нечем: X-Frame-Options отдаст пустую рамку.
 *
 * Раньше это жило только в MaterialAssignmentDetail; вынесено сюда, чтобы
 * часть-материал внутри ленты не копировала тот же код вторым экземпляром.
 */
export default function useMaterialOpen(a, token, onOpenCard) {
  const { t } = useI18n()
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState(null)
  // Адрес встроенной рамки — null, пока ученик не открыл задание. Держим именно
  // адрес, а не флаг: у материала с проверкой в него входит id стартованной
  // сессии, и пересобрать его из пропсов потом нечем.
  const [frameSrc, setFrameSrc] = useState(null)

  // Урок каталога, заданный целиком, ищем в каталоге по ссылке на его файл —
  // заранее, а не по нажатию. Не нашёлся — остаётся открыть файл в новой
  // вкладке, а window.open после await Safari гасит как всплывающее окно:
  // жест к тому моменту уже сгорел, и кнопка молча не делала бы ничего.
  const wholeLesson = isWholeCatalogLesson(a)
  const [lookup, setLookup] = useState({ url: null, id: null })
  useEffect(() => {
    if (!wholeLesson || a.catalogLessonId != null) return undefined
    let alive = true
    catalogLessonIdFor(a.fileUrl, token).then((id) => {
      if (alive) setLookup({ url: a.fileUrl, id })
    })
    return () => { alive = false }
  }, [wholeLesson, a.catalogLessonId, a.fileUrl, token])
  const lessonId = a.catalogLessonId ?? (lookup.url === a.fileUrl ? lookup.id : null)
  // lookingUp — пока ищем урок каталога по ссылке: нажатие до ответа увело бы
  // ученика открывать файл, а не урок.
  const lookingUp = wholeLesson && a.catalogLessonId == null && lookup.url !== a.fileUrl

  const open = async () => {
    setOpenError(null)
    if (isLessonCard(a)) {
      onOpenCard?.({ catalogLessonId: a.catalogLessonId, cardId: a.cardId })
      return
    }
    // Проверка стоит ВЫШЕ интерактива намеренно: у обоих путей приметы похожи
    // (ссылка на файл каталога), но урок целиком ученику нужен разобранным на
    // шаги, а выданный из него блок — самим файлом с мостом и автоуказкой.
    if (wholeLesson && lessonId != null) {
      onOpenCard?.({ catalogLessonId: lessonId, cardId: null })
      return
    }
    if (!isInteractiveMaterial(a)) {
      if (a.fileUrl) window.open(a.fileUrl, '_blank', 'noopener')
      return
    }
    // Интерактив — ПРЯМО ЗДЕСЬ, рамкой на этой же странице, а не новой вкладкой.
    // Для материала с проверкой сначала стартует сессия — иначе ответы не
    // дойдут до преподавателя; повторный старт возвращает ту же.
    setOpening(true)
    try {
      const session = a.isGraded ? await startMaterialAssignment(token, a.id) : null
      setFrameSrc(materialAssignmentRenderUrl(a.materialId, a.id, token, session?.id))
    } catch {
      setOpenError(t('homework.openFailed'))
    } finally {
      setOpening(false)
    }
  }

  return { frameSrc, opening, openError, open, lookingUp }
}
