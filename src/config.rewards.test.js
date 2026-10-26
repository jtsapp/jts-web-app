import {afterEach,describe,expect,it,vi} from 'vitest'
import {areRewardsEnabled,isRewardsScreen} from './config.js'
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
describe('Rewards domain visibility',()=>{
  it('opens rewards on the exact development hostname',()=>{
    expect(areRewardsEnabled('dev-tutor.justtostudy.kz')).toBe(true)
    expect(areRewardsEnabled('DEV-TUTOR.JUSTTOSTUDY.KZ')).toBe(true)
  })
  it.each(['ai-tutor.justtostudy.kz','tutor.justtostudy.kz','justtostudy.kz','localhost','127.0.0.1','dev-tutor.justtostudy.kz.example.com','www.dev-tutor.justtostudy.kz',''])('hides rewards on %s',host=>{
    expect(areRewardsEnabled(host)).toBe(false)
  })
  it('uses the current hostname and ignores the build environment',()=>{
    vi.stubEnv('NODE_ENV','production');vi.stubEnv('NEXT_PUBLIC_APP_ENV','production')
    vi.stubGlobal('window',{location:{hostname:'dev-tutor.justtostudy.kz'}})
    expect(areRewardsEnabled()).toBe(true)
    window.location.hostname='ai-tutor.justtostudy.kz'
    expect(areRewardsEnabled()).toBe(false)
  })
  it('keeps server rendering hidden without window',()=>{
    vi.stubGlobal('window',undefined)
    expect(areRewardsEnabled()).toBe(false)
  })
  it('limits the gate to the two rewards screens',()=>{
    expect(isRewardsScreen('tokens')).toBe(true);expect(isRewardsScreen('prizes')).toBe(true)
    expect(isRewardsScreen('practice')).toBe(false);expect(isRewardsScreen('ielts')).toBe(false)
  })
})
