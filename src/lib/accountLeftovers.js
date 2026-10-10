// Что стереть с устройства при выходе из аккаунта, кроме практики.
//
// clearLocalPractice (practice/practiceSync.js) зовётся и на входе, и на
// выходе, поэтому в нём только то, что после входа снова приезжает с сервера.
// Здесь — то, что нельзя трогать на входе: навыки гостя законно уезжают в его
// новый аккаунт первым флашем, а прогресс уроков и недельный снимок общие на
// браузер. Оставленные после выхода, они доставались следующему ученику на
// том же компьютере (класс, семья) — открытой чужой тропой, чужими навыками и
// «+N% за неделю» от чужого процента.
import { clearLocalLessonProgress } from '../learning/lessonProgress.js'
import { clearLocalSkillStats } from '../practice/skillStats.js'
import { clearWeeklySnapshot } from './levelProgress.js'
import { clearLocalPractice } from '../practice/practiceSync.js'
import { clearCatalogStorage } from './catalogCacheKeys.js'

export function clearAccountLeftovers() {
  clearLocalLessonProgress()
  clearLocalSkillStats()
  clearWeeklySnapshot()
  // Кэш каталогов — копия сервера, ключи по ученику: после выхода он только
  // занимал бы общую квоту localStorage (на ней же токен и черновики домашки).
  clearCatalogStorage()
  clearIeltsLocal()
}

// IELTS держит на устройстве черновики эссе, ответы диагностики и Reading, последние ответы Speaking и трек
// (jts_ielts_*) — без привязки к ученику. Оставленные после выхода, они доставались следующему: чужие эссе в «Моих
// работах» и чужая диагностика, которую можно было досдать. Всё нужное после входа снова приходит с бэкенда.
const IELTS_KEY_PREFIX = 'jts_ielts_'
function clearIeltsLocal() {
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(IELTS_KEY_PREFIX)) keys.push(key)
    }
    // Вторым проходом: removeItem сдвигает индексы.
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* хранилище недоступно — убирать нечего */
  }
}

// Сессия умерла сама (restoreSession: 401 и рефреш не прошёл) — это тот же
// выход, только без кнопки. Ученик, ушедший из-за общего компьютера не нажав
// «Выйти», иначе оставлял следующему свою тропу, навыки и — хуже всего —
// неотправленные дельты навыков, которые первый флаш увёз бы под чужим
// токеном. Флашить их некуда: токен уже мёртв.
export function forgetExpiredSession() {
  clearLocalPractice()
  clearAccountLeftovers()
}
