// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { saveLivePosition, rememberedPlace } from './livePosition.js'

// Плитка — строка раздела (id ссылки), а не материал: у двух уроков одного файла в одном разделе материал один
// (прод 16.11.2026), и место «материал 11» после перезагрузки открывало бы первую из них.
const SECTIONS = [
  { id: 3, materials: [{ id: 51, materialId: 11 }, { id: 52, materialId: 11 }] },
  { id: 4, materials: [{ id: 61, materialId: 12 }] },
]

beforeEach(() => sessionStorage.clear())

describe('livePosition — место ученика на занятии', () => {
  it('возвращает раздел, материал и плитку, если плитка ещё в разделе', () => {
    saveLivePosition(14, { sectionId: 3, materialId: 11, tileId: 52 })
    expect(rememberedPlace(14, SECTIONS)).toEqual({ sectionId: 3, materialId: 11, tileId: 52 })
  })

  it('плитку, которой в разделе больше нет, забывает, а материал оставляет', () => {
    saveLivePosition(14, { sectionId: 3, materialId: 11, tileId: 99 })
    expect(rememberedPlace(14, SECTIONS)).toEqual({ sectionId: 3, materialId: 11, tileId: null })
  })

  it('место, записанное до плиток (без tileId), читается как прежде', () => {
    sessionStorage.setItem('jts_live_pos_14', JSON.stringify({ sectionId: 4, materialId: 12 }))
    expect(rememberedPlace(14, SECTIONS)).toEqual({ sectionId: 4, materialId: 12, tileId: null })
  })
})
