'use client'

import dynamic from 'next/dynamic'
import { recoverFromStaleImport } from '../../../lib/lazyModule.js'

// Урок грузится динамически: банк заданий и движок нужны только здесь, и в
// общий бандл приложения им попадать незачем.
// .catch: у вкладки, открытой до выката, этого чанка на сервере уже нет, и без
// обработки next/dynamic оставлял бы крутиться спиннер из loading навсегда.
// recoverFromStaleImport перезагружает страницу (однократно); если перезагрузка
// не помогла или причина другая — пробрасываем дальше, пусть падает видимо.
const TrialLessonPage = dynamic(() => import('../../../screens/trial/TrialLessonPage.jsx').catch((e) => {
  recoverFromStaleImport(e)
  throw e
}), {
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
