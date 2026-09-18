'use client'

// Звук раздела — один на вкладку, как и сам AudioContext (beat.js).
//
// Раньше бит и записи создавались на каждый заход на экран, и после первого
// звука их цепочки узлов (gate → mix → компрессор → выход, gain → выход)
// оставались висеть на общем контексте навсегда: N заходов — N мёртвых цепочек.
// Одни на вкладку — и цепочка одна, и разобранные записи не качаются заново,
// когда человек вернулся в раздел.

import { createBeat } from './beat.js'
import { createClips } from './clips.js'

let shared = null

export function sectionSound() {
  if (!shared) shared = { beat: createBeat(), clips: createClips() }
  return shared
}
