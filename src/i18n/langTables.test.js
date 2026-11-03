import { describe, expect, it } from 'vitest'
// Настоящий загрузчик: алиас vitest подменяет только путь './i18n/langTables.js' из самого i18n.jsx.
import { EAGER_LANGS, loadLangTable } from './langTables.js'

describe('langTables', () => {
  it('в стартовый бандл языки не кладёт', () => {
    expect(EAGER_LANGS).toEqual({})
  })

  it('отдаёт таблицу языка', async () => {
    expect((await loadLangTable('en'))['common.back']).toBe('Back')
    expect((await loadLangTable('kk'))['common.back']).toBeTruthy()
  })

  it('на неизвестный язык — null: русский лежит в i18n.jsx, а не в чанке', async () => {
    expect(await loadLangTable('ru')).toBeNull()
    expect(await loadLangTable('de')).toBeNull()
  })
})
