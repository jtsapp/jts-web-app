import { describe, expect, it } from 'vitest'
import { shellNavOf } from './screenShell.js'

describe('оболочка заглушки экрана', () => {
  it('разделы Практики горят пунктом «Практика», пока грузится чанк', () => {
    for (const s of ['listen', 'cartoons', 'video-dictation']) expect(shellNavOf(s), s).toBe('practice')
  })
})
