import { studentSectionStatus } from '../lib/studentSectionRules.js'
import { lazyScreen } from '../lib/lazyScreen.js'

// Закрытый раздел видят редко, а статический импорт тянул бы оболочку кабинета в стартовый бандл даже гостю.
const SectionClosedPage = lazyScreen(() => import('../screens/SectionClosedPage.jsx'))

/** Вызываем render только после проверки: закрытый экран не монтируется и не отправляет запросы. */
export default function StudentSectionGate({ required, access, exams, render, ...pageProps }) {
  const status = required ? studentSectionStatus(access, pageProps.active, exams) : 'open'
  return status === 'open' ? render() : <SectionClosedPage {...pageProps} status={status} />
}
