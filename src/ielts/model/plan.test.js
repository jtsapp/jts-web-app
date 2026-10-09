import { describe, it, expect } from 'vitest'
import { planTaskView, taskTarget } from './plan.js'
import { dashboardFrom } from './useIeltsDashboard.js'

const t = (k, v) => (v ? `${k}|${Object.values(v).join(',')}` : k)

describe('план дня IELTS', () => {
  it('слабый тип ведёт в задания своей секции и подписан секцией и типом', () => {
    const v = planTaskView({ id: 'weakType-reading-tfng', kind: 'weakType', section: 'reading', type: 'tfng', minutes: 20, done: false, params: { acc: 33 } }, t)
    expect(v.title).toBe('ieltsDash.p.today.task.weakType|Reading,ieltsOb.p.diag.types.tfng')
    expect(v.reason).toBe('ieltsDash.p.today.task.weakTypeWhy')
    expect(v.target).toEqual({ hub: { tab: 'learn', view: 'types' } })
    expect(taskTarget({ kind: 'weakType', section: 'listening' }).hub.view).toBe('listening-tasks')
  })

  it('диагностика — экран, mock — вкладка «Пробные тесты»', () => {
    expect(taskTarget({ kind: 'diagnostic' })).toEqual({ screen: 'ielts-diagnostic' })
    expect(taskTarget({ kind: 'mock' })).toEqual({ hub: { tab: 'mocks' } })
  })

  it('ответ бэкенда без профиля и профиль без ответа бэкенда', () => {
    const d = dashboardFrom({ xp: 1240, level: 2, overall: 6.5, bands: { listening: 6.5, reading: 6.5, writing: null, speaking: null }, plan: { tasks: [] } }, null)
    expect(d).toMatchObject({ xp: 1240, level: 2, overall: 6.5 })
    const p = dashboardFrom(null, { targetBand: 7, bands: { overall: 6, listening: 6, reading: 6 } })
    expect(p).toMatchObject({ xp: null, targetBand: 7, overall: 6 })
  })
})
