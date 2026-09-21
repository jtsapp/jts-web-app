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

export function clearAccountLeftovers() {
  clearLocalLessonProgress()
  clearLocalSkillStats()
  clearWeeklySnapshot()
}
