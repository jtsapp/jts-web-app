import { describe, it, expect } from 'vitest'
import { trackSources, ownSource, courseSource, videoSource } from './audioSrc.js'

describe('audioSrc', () => {
  it('свой файл раздела идёт первым', () => {
    expect(trackSources('a0', '01_08')[0]).toBe('/practice/workbook/audio/a0/Track_01_08.mp3')
    expect(ownSource('a0', '02_13')).toBe('/practice/workbook/audio/a0/Track_02_13.mp3')
  })

  it('id воркбука ложится на имена аудио курса', () => {
    // 47 из 49 треков A2 и 53 из 56 у B1 сходятся именно так
    expect(courseSource('a2', '01_03')).toBe('/course/a2/audio/Track_1.3.mp3')
    expect(courseSource('b1', '10_12')).toBe('/course/b1/audio/Track_10.12.mp3')
  })

  it('у B2 имя слитное', () => {
    expect(courseSource('b2', '10.7')).toBe('/course/b2/audio/a107.mp3')
    expect(courseSource('b2', '1.1')).toBe('/course/b2/audio/a11.mp3')
  })

  it('без трека кандидатов нет — задание читает синтез', () => {
    expect(trackSources('a0', null)).toEqual([])
    expect(trackSources('a0', '')).toEqual([])
  })

  it('видео-репортаж юнита есть только у B2', () => {
    // Юнит N воркбука — тот же ролик, что и у курса (уроки 4→v1, 48→v12).
    expect(videoSource('b2', 1)).toBe('/course/b2/video/v1.mp4')
    expect(videoSource('b2', 12)).toBe('/course/b2/video/v12.mp4')
    expect(videoSource('b1', 1)).toBe(null)
    expect(videoSource('b2', null)).toBe(null)
  })

  it('непонятный id не превращается в мусорный путь', () => {
    expect(courseSource('a0', 'intro')).toBe(null)
    expect(trackSources('a0', 'intro')).toEqual(['/practice/workbook/audio/a0/Track_intro.mp3'])
  })
})
