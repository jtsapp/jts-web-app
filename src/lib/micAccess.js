// Доступ к микрофону: что именно не так и что ученику с этим делать.
//
// Жалоба 03.11.2026: в говорении теста уровня запись не начиналась, а ученик видел «Не получилось оценить запись» —
// любая ошибка браузера сливалась в одну. Здесь причина различается по имени ошибки getUserMedia, а проверка
// окружения (micEnvironment) отвечает ДО записи, не спрашивая разрешения: можно ли вообще записать звук.

import { isMediaRecordingSupported } from './ielts-audio.js'

/**
 * Причина по ошибке getUserMedia:
 *   denied   — запрещено (сайту в браузере или браузеру в системе);
 *   nodevice — микрофона нет (частый случай на ПК);
 *   busy     — микрофон есть, но не открывается: держит другая программа, драйвер или гарнитура отвалилась;
 *   failed   — всё остальное.
 */
export function micErrorKind(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'nodevice'
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'busy'
    default:
      return 'failed'
  }
}

/**
 * Открыть микрофон. Если с обработкой звука он не открылся (NotReadableError, OverconstrainedError — так бывает у
 * драйверов Windows и Bluetooth-гарнитур), пробуем второй раз без неё: запись хуже, но она есть.
 */
export async function openMic(audio = { echoCancellation: true, noiseSuppression: true }, md = globalThis.navigator?.mediaDevices) {
  try {
    return await md.getUserMedia({ audio })
  } catch (e) {
    const retry = audio !== true && (e?.name === 'NotReadableError' || e?.name === 'OverconstrainedError' || e?.name === 'TrackStartError')
    if (!retry) throw e
    return md.getUserMedia({ audio: true })
  }
}

/**
 * Можно ли записать звук — без запроса разрешения. issue: unsupported | insecure | denied | nodevice | null.
 * permission: granted | denied | prompt | unknown (Safari и Firefox не всегда отвечают про микрофон).
 */
export async function micEnvironment(win = globalThis.window) {
  if (!win) return { issue: 'unsupported', permission: 'unknown', devices: null }
  if (win.isSecureContext === false) return { issue: 'insecure', permission: 'unknown', devices: null }
  if (!isMediaRecordingSupported()) return { issue: 'unsupported', permission: 'unknown', devices: null }
  const nav = win.navigator
  let permission = 'unknown'
  try {
    const st = await nav.permissions?.query?.({ name: 'microphone' })
    if (st?.state) permission = st.state
  } catch {
    /* браузер не знает имени «microphone» — узнаем при записи */
  }
  let devices = null
  try {
    const list = await nav.mediaDevices.enumerateDevices?.()
    if (Array.isArray(list)) devices = list.filter((d) => d.kind === 'audioinput').length
  } catch {
    /* без списка устройств проверка просто не скажет «нет микрофона» */
  }
  const issue = permission === 'denied' ? 'denied' : devices === 0 ? 'nodevice' : null
  return { issue, permission, devices }
}

/** Платформа для инструкции «как включить»: шаги на iPhone, Android и Windows разные. */
export function micPlatform(ua = globalThis.navigator?.userAgent || '') {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac'
  if (/Windows/i.test(ua)) return 'windows'
  return 'other'
}

/**
 * Разрешение на микрофон без запроса: granted | denied | prompt | unknown. unknown — браузер про микрофон не
 * отвечает (старый Safari и Firefox) или Permissions API нет вовсе.
 */
export async function queryMicPermission(nav = globalThis.navigator) {
  try {
    const st = await nav?.permissions?.query?.({ name: 'microphone' })
    return st?.state || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Что делать перед микрофоном по нажатию (просьба Луны, задача 202 от 16.11.2026):
 *   go      — открывать сразу: разрешение уже есть, или браузер не говорит — тогда объяснит его собственный запрос;
 *   ask     — сначала объяснить, зачем микрофон, и попросить, как Speaking Buddy;
 *   blocked — браузер уже запретил и сам не спросит: объяснить, где снять запрет.
 */
export function micGate(permission) {
  if (permission === 'prompt') return 'ask'
  if (permission === 'denied') return 'blocked'
  return 'go'
}

/**
 * Где снять запрет — шаги по порядку. Запрет бывает двух видов: сайту в браузере (разрешение denied) и браузеру в
 * системе — тогда браузер разрешение помнит (granted), а getUserMedia всё равно отказывает. Не знаем, какой
 * (unknown), — оба шага. Последний шаг — «нажми снова, не помогло — обнови страницу».
 * Ответ — id шагов: site | ios | android | windows | mac | iosSystem | androidSystem | retry.
 */
export function blockedSteps({ permission, platform = micPlatform() }) {
  // На телефоне значка замка нет: в Safari — «аА», в Chrome Android — значок настроек сайта.
  const site = platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'site'
  const system = { windows: 'windows', mac: 'mac', ios: 'iosSystem', android: 'androidSystem' }[platform]
  const steps = permission === 'denied' || !system ? [site] : permission === 'granted' ? [system] : [site, system]
  return [...steps, 'retry']
}
