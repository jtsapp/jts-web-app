import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useI18n } from '../../i18n.jsx'
import { lessonMaterialRenderUrl } from '../../api.js'
import { parseStageMessage, parseStageListMessage, gotoStageMessage } from './lessonStages.js'

const BRIDGE = 'jts-bridge'
const BRIDGE_HOST = 'jts-bridge-host'
// Дать собственной инициализации страницы (и восстановлению бриджа) чуть
// осесть перед реплеем накопленного — как в Angular. Экспортируется, чтобы
// тесты ждали то же самое число, а не дублировали его отдельной магической
// константой (см. LiveLessonPage.hiddenBlocks.test.jsx и
// SectionMaterialFrame.hiddenBlocks.test.jsx).
export const LOAD_SETTLE_MS = 350

// Действия, которые мост пересылает только доверенными (isTrusted). Прокрутку
// isTrusted от программной не отличает — её роняют и переходы, проигранные
// мостом, — поэтому действием преподавателя она не считается.
const OWN_ACTIONS = new Set(['click', 'input', 'change'])
// Своя стадия — только сразу за своим действием: отчёт движка о переходе
// приходит следом за кликом, а всё, что позже, — уже проигрывание или зеркало.
const OWN_STAGE_MS = 500
// Отголосок доводки (мост передаёт её синтетический клик по рельсу наверх)
// приходит сразу за ней; позже — уже настоящий клик.
const RESTORE_ECHO_MS = 1000

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
//
// `stage` — стадия класса, за которой идёт следующий ученик (состояние занятия,
// спека live-lesson-server-state §7). Уходит тем же goto-stage, но только в
// загруженную и осевшую рамку: пока она грузится, сообщение потерялось бы
// молча. Поэтому стадия отправляется после каждой загрузки заново — явная
// указка перезагружает рамку, и новая страница о стадии ничего не знает.
//
// Стадию в рамке преподавателя двигает не только он: страница сама сообщает,
// где открылась, мост проигрывает сохранённую работу просматриваемого ученика
// и зеркалит его клики, а restoreStage доводит рамку до нужной стадии. onStage
// получает вторым аргументом { own } — это переход самого преподавателя:
// разовый признак взводят его доверенный клик или ввод и свой gotoStage, гасит
// первый же отчёт о стадии, и через OWN_STAGE_MS он истекает (правило S).
// Только такую стадию ведущему можно отдавать классу: иначе F5, «Внимание»,
// смена ученика для просмотра или его клики по рельсу двигали бы весь класс.
//
// Снимок рамки преподавателя (ответ на request-snapshot) уходит в onSnapshot,
// отдельно от живых действий (onPresentEvent): кому его отдать — классу после
// «Внимания» или одному догоняющему ученику — решает страница.
const SectionMaterialFrame = forwardRef(function SectionMaterialFrame(
  { lessonId, token, material, isStaff, reviewStudentId, follow, reloadToken, presenting, stage = null, onMirror, onPresentEvent, onSnapshot, onStage, onStageList, className = '' },
  ref
) {
  const { t } = useI18n()
  const iframeRef = useRef(null)
  const loadedRef = useRef(false)
  // true только ПОСЛЕ окна осадки (LOAD_SETTLE_MS), в отличие от loadedRef —
  // см. использование в setHiddenKeys ниже про то, зачем это разделение.
  const settledRef = useRef(false)
  const pendingRef = useRef([])
  // Последний setHiddenKeys(keys), пришедший до загрузки — не очередь, а
  // «снимок» (подробности у самого метода ниже). null отдельно от 'нет
  // ключей': setHiddenKeys всегда зовут с массивом (LiveLessonPage передаёт
  // hiddenStepIds || []), а null здесь однозначно читается как «нечего
  // накатывать при следующей загрузке».
  const pendingHiddenKeysRef = useRef(null)
  // Запрос снимка, пришедший до осадки: слушателя на той стороне ещё нет, и
  // сообщение пропало бы молча, а очередь ответов ждала бы его до истечения.
  // Флаг, а не очередь — ответ один на любое число просьб. В сброс по смене
  // документа не входит: ответ — поток, дошедший до рамки сейчас, и новая
  // страница ответит на него так же, как ответила бы прежняя.
  const snapshotRequestedRef = useRef(false)
  // Последняя стадия класса — для отправки после осадки, которая наступает уже
  // вне рендера (таймер в handleLoad).
  const stageRef = useRef(stage)
  // Когда взведён признак «моя стадия» (null — не взведён). Сбрасывается
  // вместе с документом, а не в onLoad: мост шлёт начальную стадию, как только
  // в разметке появились стадии, — это может случиться раньше события load.
  const ownStageAtRef = useRef(null)
  // До какого момента первый клик — отголосок доводки: мост передаёт её
  // синтетический клик по рельсу наверх тем же present-event, что и настоящий.
  const restoreEchoUntilRef = useRef(0)
  // Переход по стадии, ждущий осадки: { index, own } — свой (gotoStage) или
  // доводка (restoreStage). Последний перекрывает прежний. Как и запрос снимка,
  // в сброс по смене документа не входит: он для рамки, которая откроется.
  const pendingGotoRef = useRef(null)
  const settleTimerRef = useRef(null)
  // Какой документ открыт в рамке. Адрес зависит не только от материала и
  // перезагрузки: у ученика — от страницы следования, у преподавателя — от
  // ученика, чей экран он смотрит (studentId в адресе). Сменилось любое из них —
  // браузер грузит новую страницу, и отметки загрузки прошлой к ней не
  // относятся: иначе действие преподавателя на прошлой странице засчитывалось бы
  // новой, а реплей ушёл бы в перезагружающуюся страницу. Поэтому тот же ключ и
  // у iframe, и у сброса ниже.
  const documentKey = [
    material?.id,
    reloadToken || 0,
    !isStaff && follow ? 'follow' : 'own',
    isStaff ? (reviewStudentId ?? '') : '',
  ].join(':')

  useEffect(() => {
    loadedRef.current = false
    settledRef.current = false
    ownStageAtRef.current = null
    restoreEchoUntilRef.current = 0
    pendingRef.current = []
    // pendingHiddenKeysRef сюда намеренно НЕ входит. pendingRef — очередь
    // конкретной загрузки (реплей событий учителя, потерявших смысл, если эта
    // рамка уже не досмотрит до конца), а тут — последнее известное состояние
    // «что сейчас скрыто», не привязанное к конкретному циклу загрузки. Если
    // документ сменился раньше, чем успел сработать onLoad предыдущего,
    // значение всё ещё правда и должно докатиться в
    // СЛЕДУЮЩУЮ — родитель не обязан звать setHiddenKeys повторно только
    // потому что рамка перезагрузилась (эффект в LiveLessonPage.jsx висит на
    // hiddenStepIds, а не на reloadToken). Стереть его здесь — вернуть тот же
    // баг, который чинит этот ref, просто с другим триггером потери.
    //
    // Осадка прошлой страницы, сработав после смены, отметила бы новую
    // осевшей до её загрузки.
    return () => clearTimeout(settleTimerRef.current)
  }, [documentKey])

  // Стоит ПОСЛЕ сброса выше: сменились и стадия, и рамка в одном рендере —
  // сброс уже отметил рамку незагруженной, и стадия дождётся её загрузки.
  useEffect(() => {
    stageRef.current = stage
    if (stage != null && settledRef.current) postStage(stage)
  }, [stage])

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
      if (settledRef.current) {
        post({ type: 'request-snapshot' })
      } else {
        snapshotRequestedRef.current = true
      }
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
    // следом сам, здесь ничего досылать не нужно. Это переход самого
    // преподавателя из «Тем» — его действие. До осадки goto-stage пропал бы, а
    // признак остался бы стоять и засчитал бы своей стадию открытия страницы:
    // поэтому переход ждёт осадки, а признак взводится в момент отправки.
    gotoStage(index) {
      if (settledRef.current) {
        ownStageAtRef.current = Date.now()
        postStage(index)
      } else {
        pendingGotoRef.current = { index, own: true }
      }
    },
    // Довести рамку до стадии (класса после F5, своей после «Внимания») — не
    // действие преподавателя. Ждёт осадки так же.
    restoreStage(index) {
      if (settledRef.current) {
        restoreEchoUntilRef.current = Date.now() + RESTORE_ECHO_MS
        postStage(index)
      } else {
        pendingGotoRef.current = { index, own: false }
      }
    },
    // Скрытие вживую: преподаватель прячет задание/блок PATCH'ом .../visibility,
    // но CSS для этого вшивается только при рендере файла на сервере — уже
    // открытая рамка ученика ничего не знает до следующей полной перезагрузки.
    // keys — список как есть (голые id заданий и ключи `block@s:b` вперемешку,
    // формат см. visibleSteps.js) — здесь его не фильтруют и не переупаковывают,
    // это уже сделано на сервере.
    //
    // Как и replay, не постим напрямую, пока рамка не осела: слушателя на той
    // стороне ещё нет, и postMessage молча теряется без единой ошибки — тот же
    // класс бага, что уже был у replay. Но, в отличие от replay, копить
    // очередь не нужно: скрытие — не поток дискретных событий, а всегда ПОЛНОЕ
    // желаемое состояние целиком («что скрыто прямо сейчас»), и повторная
    // отправка того же набора уже загруженной рамке идемпотентна на бэкенде
    // (MaterialBridgeScriptInjector сверяет текущий список и просто добавляет/
    // снимает класс по разнице — независимо проверено). Значит последний
    // вызов до осадки полностью перекрывает все промежуточные, и вместо
    // массива достаточно хранить один снимок — pendingHiddenKeysRef.
    //
    // Проверяем settledRef, а не loadedRef: между onLoad и концом осадки
    // (LOAD_SETTLE_MS) скрипт внутри файла может ещё не закончить свой разбор
    // блоков, и «рамка загрузилась» не значит «внутри уже есть кого искать по
    // ключам» — вызов, попавший в это окно, рисковал молча найти пустое
    // множество целей и потеряться без единого сигнала об ошибке, вплоть до
    // следующего случайного sections-changed.
    //
    // Если рамки нет вовсе (materialFrameRef.current === null — view ещё
    // 'loading'/'denied'/'hidden', или активного материала нет) и вызов гаснет
    // опциональной цепочкой в LiveLessonPage.jsx, даже не добравшись до этого
    // метода, — это тоже безопасно: когда рамка всё же смонтируется, она
    // начнёт с настоящего GET /render, а он уже несёт актуальный список
    // скрытого в вшитом на сервере CSS. Событие не потеряно, а перекрыто
    // свежим полным состоянием.
    setHiddenKeys(keys) {
      if (settledRef.current) {
        post({ type: 'hidden-blocks', keys })
      } else {
        pendingHiddenKeysRef.current = keys
      }
    },
  }), [])

  function post(payload) {
    iframeRef.current?.contentWindow?.postMessage({ source: BRIDGE_HOST, ...payload }, '*')
  }

  function postStage(index) {
    iframeRef.current?.contentWindow?.postMessage(gotoStageMessage(index), '*')
  }

  /** Отголосок доводки — первый клик в окне после неё. */
  function takeRestoreEcho(eventType) {
    if (eventType !== 'click' || Date.now() >= restoreEchoUntilRef.current) return false
    restoreEchoUntilRef.current = 0
    return true
  }

  function handleLoad() {
    loadedRef.current = true
    clearTimeout(settleTimerRef.current)
    settleTimerRef.current = setTimeout(() => {
      settledRef.current = true
      if (pendingRef.current.length) {
        post({ type: 'present', events: pendingRef.current })
        pendingRef.current = []
      }
      // Снимок скрытия, накопленный, пока рамка ещё грузилась или не осела —
      // см. комментарий у setHiddenKeys/pendingHiddenKeysRef. null значит
      // «вызовов не было», и тогда слать нечего (совпадает с сегодняшним
      // поведением первой загрузки без единого setHiddenKeys).
      if (pendingHiddenKeysRef.current !== null) {
        post({ type: 'hidden-blocks', keys: pendingHiddenKeysRef.current })
        pendingHiddenKeysRef.current = null
      }
      if (stageRef.current != null) postStage(stageRef.current)
      const pendingGoto = pendingGotoRef.current
      if (pendingGoto) {
        pendingGotoRef.current = null
        if (pendingGoto.own) ownStageAtRef.current = Date.now()
        else restoreEchoUntilRef.current = Date.now() + RESTORE_ECHO_MS
        postStage(pendingGoto.index)
      }
      if (snapshotRequestedRef.current) {
        snapshotRequestedRef.current = false
        post({ type: 'request-snapshot' })
      }
    }, LOAD_SETTLE_MS)
  }

  useEffect(() => {
    function handleMessage(e) {
      const data = e.data
      // Стадия — свой источник и обеим ролям: ученику она двигает «Темы»,
      // преподавателю (если он ведёт урок отсюда) — то же самое.
      const stageList = parseStageListMessage(data)
      if (stageList) {
        onStageList?.(stageList)
        return
      }
      const stage = parseStageMessage(data)
      if (stage) {
        const armedAt = ownStageAtRef.current
        ownStageAtRef.current = null
        onStage?.(stage, { own: armedAt != null && Date.now() - armedAt <= OWN_STAGE_MS })
        return
      }
      if (!data || data.source !== BRIDGE) return
      if (!isStaff) {
        if (data.type === 'mirror') {
          onMirror?.({ selector: data.selector, eventType: data.eventType, value: data.value ?? null })
        }
        return
      }
      if (data.type === 'present-event') {
        // Отголосок доводки классу не пересылается: класс уже на этой стадии.
        if (takeRestoreEcho(data.eventType)) return
        if (OWN_ACTIONS.has(data.eventType)) ownStageAtRef.current = Date.now()
      }
      if (!presenting) return
      // Ответ на request-snapshot: весь поток, дошедший до рамки преподавателя.
      if (data.type === 'snapshot' && Array.isArray(data.events)) {
        onSnapshot?.(data.events)
        return
      }
      if (data.type === 'present-event') {
        onPresentEvent?.([{ selector: data.selector, eventType: data.eventType, value: data.value ?? null }])
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isStaff, presenting, onMirror, onPresentEvent, onSnapshot, onStage, onStageList])

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
        key={documentKey}
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
