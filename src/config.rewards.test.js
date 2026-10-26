import {afterEach,describe,expect,it,vi} from 'vitest'

afterEach(()=>{vi.unstubAllEnvs();vi.resetModules()})
describe('Rewards release visibility',()=>{
  it('hides rewards in production even when the full cabinet is enabled',async()=>{
    vi.stubEnv('NEXT_PUBLIC_APP_ENV','production');vi.resetModules()
    const config=await import('./config.js')
    expect(config.REWARDS_ENABLED).toBe(false)
    expect(config.isRewardsScreen('tokens')).toBe(true)
    expect(config.isRewardsScreen('prizes')).toBe(true)
    expect(config.isRewardsScreen('practice')).toBe(false)
  })
  it('keeps rewards available on the development stand, which also uses a production Next build',async()=>{
    vi.stubEnv('NODE_ENV','production');vi.stubEnv('NEXT_PUBLIC_APP_ENV','development');vi.resetModules()
    const config=await import('./config.js')
    expect(config.REWARDS_ENABLED).toBe(true)
  })
})
