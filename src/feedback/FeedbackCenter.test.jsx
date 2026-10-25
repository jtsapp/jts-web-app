// @vitest-environment jsdom
import {render, screen, fireEvent, waitFor, cleanup} from '@testing-library/react'
import {beforeEach, afterEach, describe, expect, it, vi} from 'vitest'
import FeedbackCenter from './FeedbackCenter.jsx'
import * as api from '../api.js'
const language=vi.hoisted(()=>({value:'ru'}))
vi.mock('../i18n.jsx',()=>({useI18n:()=>({lang:language.value})}))
vi.mock('../api.js',()=>({getCabinetFeedback:vi.fn(),getCabinetFeedbackMessages:vi.fn(),getCabinetFeedbackTargets:vi.fn(),getCabinetFeedbackHistory:vi.fn(),replyCabinetFeedback:vi.fn(),submitCabinetFeedback:vi.fn(),uploadCabinetFeedbackFile:vi.fn()}))
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();language.value='ru';api.getCabinetFeedback.mockResolvedValue([]);api.getCabinetFeedbackTargets.mockResolvedValue({targets:[{id:9,name:'Teacher Name'}]});api.getCabinetFeedbackMessages.mockResolvedValue([]);api.getCabinetFeedbackHistory.mockResolvedValue([])})
describe('Student feedback RU/KZ/EN',()=>{
  it.each([['ru','Обратная связь','Хороший урок'],['kk','Кері байланыс','Жақсы сабақ'],['en','Feedback','Great lesson']])('renders %s labels while preserving API option values',async(lang,title,category)=>{language.value=lang;render(<FeedbackCenter token="token" onBack={()=>{}}/>);await waitFor(()=>expect(api.getCabinetFeedbackTargets).toHaveBeenCalled());expect(screen.getByRole('heading',{level:1}).textContent).toBe(title);const option=screen.getByRole('option',{name:category});expect(option.value).toBe('Хороший урок');expect(screen.getByRole('option',{name:'Teacher Name'}).value).toBe('9')})
  it('shows a translated decision timeline with unchanged author comments',async()=>{
    language.value='kk';api.getCabinetFeedback.mockResolvedValue([{id:17,category:'Другое',status:'Решена',createdAt:'2026-10-23T10:00:00',body:'My original body',decisionComment:'Решение написано пользователем'}]);api.getCabinetFeedbackHistory.mockResolvedValue([{id:2,fromStatus:'На рассмотрении',toStatus:'Решена',createdAt:'2026-10-26T10:00:00',comment:'Проверили запись урока'}]);render(<FeedbackCenter token="token" onBack={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:/Басқа/}));expect(await screen.findByText('Тарих және шешімдер')).toBeTruthy();expect(screen.getByText('Решение написано пользователем')).toBeTruthy();expect(screen.getByText('Проверили запись урока')).toBeTruthy();expect(api.getCabinetFeedbackHistory).toHaveBeenCalledWith('token',17)
  })
})
