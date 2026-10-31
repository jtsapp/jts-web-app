import { studentSectionStatus } from '../lib/studentSectionRules.js'
import SectionClosedPage from '../screens/SectionClosedPage.jsx'

/** Вызываем render только после проверки: закрытый экран не монтируется и не отправляет запросы. */
export default function StudentSectionGate({ required, access, exams, render, ...pageProps }) {
  const status = required ? studentSectionStatus(access, pageProps.active, exams) : 'open'
  return status === 'open' ? render() : <SectionClosedPage {...pageProps} status={status} />
}
