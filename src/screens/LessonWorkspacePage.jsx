'use client'

import { SAMPLE_LESSON } from './workspace/sampleLesson.js'

export default function LessonWorkspacePage({ onExit }) {
  const lesson = SAMPLE_LESSON
  return (
    <div className="lw" data-testid="lesson-workspace">
      <div className="lw__body">
        <div className="lw__main">
          <div className="lw-card" style={{ padding: 20 }}>{lesson.unit}</div>
        </div>
      </div>
    </div>
  )
}
