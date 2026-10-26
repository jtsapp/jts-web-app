// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://dev-tutor.justtostudy.kz/"}
import {describe,it,expect,vi} from 'vitest'
import {render,screen} from '@testing-library/react'
import {I18nProvider} from '../i18n.jsx'
import Sidebar from './Sidebar.jsx'
vi.mock('../api.js',async(load)=>({...await load(),
  getBalance:vi.fn().mockResolvedValue({coins:0,streak:0}),getDemoAccess:vi.fn().mockResolvedValue({isDemo:false}),
  getIeltsMe:vi.fn().mockResolvedValue({}),getSatMeCached:vi.fn().mockResolvedValue({})}))
describe('Development sidebar rewards',()=>{
  it('shows tokens and prizes on the development domain',()=>{
    render(<I18nProvider><Sidebar onNav={()=>{}} onProfile={()=>{}} /></I18nProvider>)
    expect(screen.getByText('Мои токены')).toBeTruthy()
    expect(screen.getByText('Призы')).toBeTruthy()
    expect(screen.getByText('Главная')).toBeTruthy()
    expect(screen.getByText('Уроки')).toBeTruthy()
  })
})
