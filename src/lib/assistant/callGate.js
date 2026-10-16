// Звонок Луне на проде скрыт, на деве и локально виден — та же развилка по
// домену, что у IELTS и SAT (lib/ieltsGate.js): сборка у дева и прода одна.
//
// Почему не сразу везде: агент LiveKit катится отдельно от сайта (`lk agent
// deploy`), и агент старой версии режима `assistant` не знает — в комнату
// звонка помощнику он зашёл бы обычной Луной-тьютором и начал бы урок
// английского. Звонок открывают на проде, когда агент выкачен и звонок проверен
// на деве: переменной сборки NEXT_PUBLIC_ENABLE_LUNA_CALL=1 или снятием этого гейта.
import { isProdHost } from '../ieltsGate.js'

export function assistantCallHiddenFor(hostname, forced = process.env.NEXT_PUBLIC_ENABLE_LUNA_CALL) {
  if (String(forced ?? '').trim() === '1') return false
  return isProdHost(hostname)
}

/** Скрыта ли кнопка звонка у этого посетителя (на сервере — нет: окно рисуется только в браузере). */
export function assistantCallHidden() {
  if (typeof window === 'undefined') return false
  return assistantCallHiddenFor(window.location.hostname)
}
