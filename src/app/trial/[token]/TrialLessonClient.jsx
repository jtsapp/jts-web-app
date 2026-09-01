'use client'

import dynamic from 'next/dynamic'

// Урок грузится динамически: банк заданий и движок нужны только здесь, и в
// общий бандл приложения им попадать незачем.
const TrialLessonPage = dynamic(() => import('../../../screens/trial/TrialLessonPage.jsx'), {
  ssr: false,
  loading: () => (
    <div className="trial">
      <div className="trial-card trial-card--center">
        <div className="spinner" />
      </div>
    </div>
  ),
})

export default function TrialLessonClient({ token, teacherMode }) {
  return <TrialLessonPage token={token} teacherMode={teacherMode} />
}
