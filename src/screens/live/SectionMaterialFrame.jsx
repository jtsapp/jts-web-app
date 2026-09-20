import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useI18n } from '../../i18n.jsx'
import { lessonMaterialRenderUrl } from '../../api.js'
import { parseStageMessage, gotoStageMessage } from './lessonStages.js'

const BRIDGE = 'jts-bridge'
const BRIDGE_HOST = 'jts-bridge-host'

// Встраивает активный материал раздела прямо в страницу (никогда в новую
// вкладку) — как web-admin. INTERACTIVE_HTML идёт через рендер-эндпоинт с
// внедрённым бэкендом бридж-скриптом (сохранение/восстановление ответов +
// живой follow-me); остальные типы (видео/pdf/ссылка) — просто их fileUrl,
// ровно как в Angular (там тоже без спец-обработки по типу).
//
// Бридж общается через window.postMessage: студент постит наверх 'mirror' на
// каждый свой клик/ввод (проксируем наружу через onMirror → STOMP), учитель —
// 'present-event' / 'snapshot' пока идёт «Внимание на упражнение» (проксируем
// через onPresentEvent). Обратно в iframe шлём { source: 'jts-bridge-host',
// type: 'present', events } — реплей потока учителя у догоняющего студента.
// Тем же каналом уходит { type: 'hidden-blocks', keys } (setHiddenKeys) — сервер
// прячет CSS'ом только то, что скрыто на момент рендера файла, а этим сообщением
// уже открытая рамка узнаёт о скрытии/возврате без полной перезагрузки.
//
// Второй, независимый от бриджа канал — стадии файлового урока (lessonStages.js):
// скрипт в файле сообщает 'jts-lesson'/'stage' на каждом переходе (→ onStage),
// а gotoStage просит его перейти на стадию от имени 'jts-workspace'. Ходит
// мимо BRIDGE_HOST намеренно: это разговор с движком урока, а не с мостом.
const SectionMaterialFrame = forwardRef(function SectionMaterialFrame(
  { lessonId, token, material, isStaff, reviewStudentId, follow, reloadToken, presenting, onMirror, onPresentEvent, onStage, className = '' },
  ref
) {
  const { t } = useI18n()
  const iframeRef = useRef(null)
  const loadedRef = useRef(false)
  const pendingRef = useRef([])

  useEffect(() => {
    loadedRef.current = false
    pendingRef.current = []
  }, [material?.id, reloadToken])

  useImperativeHandle(ref, () => ({
    replay(events) {
      if (!events?.length) return
      if (loadedRef.current) {
        post({ type: 'present', events })
      } else {
        pendingRef.current.push(...events)
      }
    },
    requestSnapshot() {
      post({ type: 'request-snapshot' })
    },
    // Teacher watching a student review page: one live action (click/input/change/
    // scroll) arrived over the socket — replay it here so the teacher's own iframe
    // stays in sync with what the student is doing right now. Unlike `replay`,
    // dropped events aren't queued: a mirror event describes the student's CURRENT
    // position, and applying a stale one after a reload would be wrong, not late.
    mirror(event) {
      if (!loadedRef.current) return
      post({ type: 'mirror', selector: event.selector, eventType: event.eventType, value: event.value ?? null })
    },
    // Переход на стадию файлового урока. Скрипт в файле кликает рельс стадий, и
    // этот клик уходит собеседнику тем же мостом, что и настоящие, — класс идёт
    // следом сам, здесь ничего досылать не нужно.
    gotoStage(index) {
      iframeRef.current?.contentWindow?.postMessage(gotoStageMessage(index), '*')
    },
    // Скрытие вживую: преподаватель прячет задание/блок PATCH'ом .../visibility,
    // но CSS для этого вшивается только при рендере файла на сервере — уже
    // открытая рамка ученика ничего не знает до следующей полной перезагрузки.
    // keys — список как есть (голые id заданий и ключи `block@s:b` вперемешку,
    // формат см. visibleSteps.js) — здесь его не фильтруют и не переупаковывают,
    // это уже сделано на сервере.
    setHiddenKeys(keys) {
      post({ type: 'hidden-blocks', keys })
    },
  }), [])

  function post(payload) {
    iframeRef.current?.contentWindow?.postMessage({ source: BRIDGE_HOST, ...payload }, '*')
  }

  function handleLoad() {
    loadedRef.current = true
    // Дать собственной инициализации страницы (и восстановлению бриджа) чуть
    // осесть перед реплеем накопленного — как в Angular (350мс).
    setTimeout(() => {
      if (pendingRef.current.length) {
        post({ type: 'present', events: pendingRef.current })
        pendingRef.current = []
      }
    }, 350)
  }

  useEffect(() => {
    function handleMessage(e) {
      const data = e.data
      // Стадия — свой источник и обеим ролям: ученику она двигает «Темы»,
      // преподавателю (если он ведёт урок отсюда) — то же самое.
      const stage = parseStageMessage(data)
      if (stage) {
        onStage?.(stage)
        return
      }
      if (!data || data.source !== BRIDGE) return
      if (!isStaff) {
        if (data.type === 'mirror') {
          onMirror?.({ selector: data.selector, eventType: data.eventType, value: data.value ?? null })
        }
        return
      }
      if (!presenting) return
      // Catch-up batch after «Внимание на упражнение» (reply to request-snapshot).
      if (data.type === 'snapshot' && Array.isArray(data.events)) {
        onPresentEvent?.(data.events)
        return
      }
      if (data.type === 'present-event') {
        onPresentEvent?.([{ selector: data.selector, eventType: data.eventType, value: data.value ?? null }])
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isStaff, presenting, onMirror, onPresentEvent, onStage])

  if (!material) {
    return <div className="lw-material-empty">{t('lesson.ws.noMaterial')}</div>
  }

  // "Урок из каталога" attaches as a LINK material pointing at the catalog's own storage, not an
  // uploaded INTERACTIVE_HTML file - but it's still an HTML page and the backend can now fetch and
  // bridge it the same way (see TeachingMaterialService.getRawHtmlForRender). Without this, it fell
  // back to the plain iframe below: no mirror to the teacher, no saved answers/stop position.
  // The backend is the actual gatekeeper (only its own catalog URLs get fetched server-side) -
  // this is just routing, so a loose match here is fine.
  const isCatalogHtml = material.materialType === 'LINK' && /\/course-catalog\/.*\.html?(?:[?#]|$)/i.test(material.fileUrl || '')

  if (material.materialType !== 'INTERACTIVE_HTML' && !isCatalogHtml) {
    return (
      <div className={`lw-material-frame${className}`}>
        <iframe
          key={`${material.id}-plain`}
          src={material.fileUrl}
          title={material.title}
          className="lw-material-iframe"
          allow="autoplay"
        />
      </div>
    )
  }

  const src = lessonMaterialRenderUrl(lessonId, material.materialId, token, {
    mode: isStaff ? 'review' : 'live',
    follow: !isStaff && follow,
    forceReload: reloadToken || undefined,
    studentId: isStaff ? reviewStudentId : undefined,
  })

  return (
    <div className={`lw-material-frame${className}`}>
      {/* allow="autoplay" — не украшение, а условие работы трансляции.
          Разрешение на автовоспроизведение выдаётся ДОКУМЕНТУ, а материал живёт
          в своём iframe: клики ученика по нашей странице этому документу ничего
          не дают. Преподаватель нажимает «Проиграть» у себя, действие доезжает
          сюда реплеем — а синтетический клик жестом пользователя не считается, и
          звук у ученика молчал, пока он сам не ткнёт в материал. Атрибут
          делегирует разрешение родителя внутрь, и ученику не нужно нажимать
          ничего. */}
      <iframe
        ref={iframeRef}
        key={`${material.id}-${reloadToken || 0}`}
        src={src}
        title={material.title}
        className="lw-material-iframe"
        allow="autoplay"
        onLoad={handleLoad}
      />
    </div>
  )
})

export default SectionMaterialFrame
