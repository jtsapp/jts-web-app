import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useI18n } from '../../i18n.jsx'
import { lessonMaterialRenderUrl } from '../../api.js'

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
// 'present-event' пока идёт «Внимание на упражнение» (проксируем через
// onPresentEvent). Обратно в iframe шлём { source: 'jts-bridge-host', type:
// 'present', events } — реплей потока учителя у догоняющего студента.
// replay() экспортируется через ref, чтобы родитель мог применить события,
// пришедшие по STOMP, к уже открытому материалу.
const SectionMaterialFrame = forwardRef(function SectionMaterialFrame(
  { lessonId, token, material, isStaff, reviewStudentId, follow, reloadToken, presenting, onMirror, onPresentEvent },
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
      if (!data || data.source !== BRIDGE) return
      if (!isStaff) {
        if (data.type === 'mirror') {
          onMirror?.({ selector: data.selector, eventType: data.eventType, value: data.value ?? null })
        }
        return
      }
      if (presenting && data.type === 'present-event') {
        onPresentEvent?.([{ selector: data.selector, eventType: data.eventType, value: data.value ?? null }])
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isStaff, presenting, onMirror, onPresentEvent])

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
      <div className="lw-material-frame">
        <iframe
          key={`${material.id}-plain`}
          src={material.fileUrl}
          title={material.title}
          className="lw-material-iframe"
        />
      </div>
    )
  }

  const src = lessonMaterialRenderUrl(lessonId, material.materialId, token, {
    mode: isStaff ? 'review' : 'live',
    follow: !isStaff && follow,
    forceReload: !!reloadToken,
    studentId: isStaff ? reviewStudentId : undefined,
  })

  return (
    <div className="lw-material-frame">
      <iframe
        ref={iframeRef}
        key={`${material.id}-${reloadToken || 0}`}
        src={src}
        title={material.title}
        className="lw-material-iframe"
        onLoad={handleLoad}
      />
    </div>
  )
})

export default SectionMaterialFrame
