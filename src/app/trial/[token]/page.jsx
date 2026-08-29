import TrialLessonClient from './TrialLessonClient.jsx'

// Пробный урок живёт отдельным маршрутом, а не экраном SPA: ссылку ученику
// отдаёт преподаватель, и она должна открываться сразу в уроке — без
// сайдбара, входа и остального приложения.

export const metadata = {
  title: 'Just to Study — пробный урок английского',
}

export default async function TrialLessonRoute({ params, searchParams }) {
  const { token } = await params
  const query = await searchParams
  return <TrialLessonClient token={token} teacherMode={query?.teacher === '1'} />
}
