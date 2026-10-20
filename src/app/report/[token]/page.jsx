import ReportLinkClient from './ReportLinkClient.jsx'

// Отчёт о прогрессе по ссылке из WhatsApp/Telegram — отдельным маршрутом, а не
// экраном SPA: открывает родитель без аккаунта, и ему нужен один отчёт без
// сайдбара, входа и остального приложения (как /trial/<token>).
// noindex и no-referrer: в адресе секрет, и он не должен попасть ни в
// поисковик, ни в заголовок Referer чужого сайта.
export const metadata = {
  title: 'Just to Study — отчёт о прогрессе',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function ReportLinkRoute({ params }) {
  const { token } = await params
  return <ReportLinkClient token={token} />
}
