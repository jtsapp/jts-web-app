import { CandidateApp } from '../../../../hiring/CandidateApp.jsx'

// Личная ссылка кандидата: прогресс хранится на сервере, токен знает только кандидат.
export const metadata = { robots: { index: false, follow: false } }

export default async function CandidatePage({ params }) {
  const { token } = await params
  return <CandidateApp token={token} />
}
