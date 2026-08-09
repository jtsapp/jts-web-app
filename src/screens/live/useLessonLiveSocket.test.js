// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

let lastClient
vi.mock('@stomp/stompjs', () => {
  class Client {
    constructor(cfg) { this.cfg = cfg; this.subs = {}; this.published = []; this.connected = false; lastClient = this }
    activate() { this.connected = true; this.cfg.onConnect && this.cfg.onConnect() }
    subscribe(dest, cb) { this.subs[dest] = cb; return { unsubscribe() {} } }
    publish(frame) { this.published.push(frame) }
    deactivate() { this.connected = false; this.deactivated = true }
  }
  return { Client }
})

import { useLessonLiveSocket } from './useLessonLiveSocket.js'

beforeEach(() => { lastClient = undefined })

describe('useLessonLiveSocket', () => {
  it('connects with wss brokerURL + Bearer and subscribes all live topics', () => {
    renderHook(() => useLessonLiveSocket(7, 'TOK', 1, {}))
    expect(lastClient.cfg.brokerURL).toMatch(/^wss?:\/\/.+\/ws$/)
    expect(lastClient.cfg.connectHeaders.Authorization).toBe('Bearer TOK')
    expect(Object.keys(lastClient.subs)).toEqual(expect.arrayContaining([
      '/topic/lesson/7/focus',
      '/topic/lesson/7/material-mirror',
      '/topic/lesson/7/present',
      '/topic/lesson/7/sections-changed',
      '/topic/lesson/7/step-progress',
    ]))
  })

  // Работа ученика идёт не в общий топик урока: иначе в групповом занятии
  // браузер каждого ученика получал бы ответы всех остальных.
  it('на учительский канал шагов подписан только преподаватель', () => {
    renderHook(() => useLessonLiveSocket(7, 'TOK', 1, {}))
    expect(Object.keys(lastClient.subs)).not.toContain('/topic/lesson/7/step-progress/staff')

    renderHook(() => useLessonLiveSocket(7, 'TOK', 1, { isStaff: true }))
    expect(Object.keys(lastClient.subs)).toEqual(expect.arrayContaining([
      '/topic/lesson/7/step-progress',
      '/topic/lesson/7/step-progress/staff',
    ]))
  })

  it('ответы ученика доходят до преподавателя учительским каналом', () => {
    const onStepProgress = vi.fn()
    renderHook(() => useLessonLiveSocket(7, 'TOK', 1, { onStepProgress, isStaff: true }))

    const evt = { senderUserId: 9, senderRole: 'STUDENT', questionId: 's2-c0', value: 'busy' }
    act(() => {
      lastClient.subs['/topic/lesson/7/step-progress/staff']({ body: JSON.stringify(evt) })
    })
    expect(onStepProgress).toHaveBeenCalledWith(evt)
  })

  // Трансляция урока, открытого шагами: собеседник виден, своё эхо — нет.
  // Вернувшийся к себе же ответ перетёр бы то, что ученик печатает сейчас.
  it('доставляет шаги собеседника, но глушит собственное эхо', () => {
    const onStepProgress = vi.fn()
    renderHook(() => useLessonLiveSocket(7, 'TOK', 1, { onStepProgress }))

    act(() => {
      lastClient.subs['/topic/lesson/7/step-progress']({
        body: JSON.stringify({ senderUserId: 1, stepId: 's2' }),
      })
    })
    expect(onStepProgress).not.toHaveBeenCalled()

    const fromStudent = { senderUserId: 9, senderRole: 'STUDENT', senderName: 'Ученик', stepId: 's2', questionId: 's2-c0', value: 'busy' }
    act(() => {
      lastClient.subs['/topic/lesson/7/step-progress']({ body: JSON.stringify(fromStudent) })
    })
    expect(onStepProgress).toHaveBeenCalledWith(fromStudent)
  })

  it('sendStepProgress шлёт только те поля, что описывают событие', async () => {
    const { result } = renderHook(() => useLessonLiveSocket(7, 'TOK', 1, {}))
    await waitFor(() => expect(lastClient.connected).toBe(true))

    act(() => { result.current.sendStepProgress({ stepId: 's3' }) })
    expect(lastClient.published.at(-1)).toEqual({
      destination: '/app/lesson/7/step-progress', body: JSON.stringify({ stepId: 's3' }),
    })

    act(() => { result.current.sendStepProgress({ stepId: 's3', questionId: 's3-c0', value: 'commutes' }) })
    expect(lastClient.published.at(-1)).toEqual({
      destination: '/app/lesson/7/step-progress',
      body: JSON.stringify({ stepId: 's3', questionId: 's3-c0', value: 'commutes' }),
    })
  })

  it('drops focus/present echoes from itself but delivers events from others', () => {
    const onFocus = vi.fn()
    const onPresent = vi.fn()
    renderHook(() => useLessonLiveSocket(7, 'TOK', 1, { onFocus, onPresent }))

    act(() => {
      lastClient.subs['/topic/lesson/7/focus']({ body: JSON.stringify({ sectionId: 2, materialId: 5, senderUserId: 1 }) })
    })
    expect(onFocus).not.toHaveBeenCalled()

    act(() => {
      lastClient.subs['/topic/lesson/7/focus']({ body: JSON.stringify({ sectionId: 2, materialId: 5, senderUserId: 9 }) })
    })
    expect(onFocus).toHaveBeenCalledWith({ sectionId: 2, materialId: 5, senderUserId: 9 })

    act(() => {
      lastClient.subs['/topic/lesson/7/present']({ body: JSON.stringify({ materialId: 5, events: [], senderUserId: 1 }) })
    })
    expect(onPresent).not.toHaveBeenCalled()
  })

  it('passes mirror events through unconditionally and fires onSectionsChanged', () => {
    const onMirror = vi.fn()
    const onSectionsChanged = vi.fn()
    renderHook(() => useLessonLiveSocket(7, 'TOK', 1, { onMirror, onSectionsChanged }))

    act(() => {
      lastClient.subs['/topic/lesson/7/material-mirror']({ body: JSON.stringify({ materialId: 5, studentId: 1, selector: '#a', eventType: 'click', value: null }) })
    })
    expect(onMirror).toHaveBeenCalledWith({ materialId: 5, studentId: 1, selector: '#a', eventType: 'click', value: null })

    act(() => { lastClient.subs['/topic/lesson/7/sections-changed']() })
    expect(onSectionsChanged).toHaveBeenCalled()
  })

  it('sendFocus/sendMirror/sendPresent publish to the right destinations', async () => {
    const { result } = renderHook(() => useLessonLiveSocket(7, 'TOK', 1, {}))
    await waitFor(() => expect(lastClient.connected).toBe(true))

    act(() => { result.current.sendFocus(2, 5) })
    expect(lastClient.published.at(-1)).toEqual({
      destination: '/app/lesson/7/focus', body: JSON.stringify({ sectionId: 2, materialId: 5, stepId: null }),
    })

    act(() => { result.current.sendFocus(2, 5, 's3') })
    expect(lastClient.published.at(-1)).toEqual({
      destination: '/app/lesson/7/focus', body: JSON.stringify({ sectionId: 2, materialId: 5, stepId: 's3' }),
    })

    act(() => { result.current.sendMirror(5, { selector: '#a', eventType: 'click', value: null }) })
    expect(lastClient.published.at(-1)).toEqual({
      destination: '/app/lesson/7/material-mirror', body: JSON.stringify({ materialId: 5, selector: '#a', eventType: 'click', value: null }),
    })

    act(() => { result.current.sendPresent(5, [{ selector: '#a', eventType: 'click', value: null }]) })
    expect(lastClient.published.at(-1)).toEqual({
      destination: '/app/lesson/7/present', body: JSON.stringify({ materialId: 5, events: [{ selector: '#a', eventType: 'click', value: null }] }),
    })
  })
})
