// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within as scope } from '@testing-library/react'
import { I18nProvider, useI18n } from '../i18n.jsx'
import {contractText} from '../contracts/texts.js'

vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getSatMeCached: vi.fn(async () => null),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
  getMyContracts: vi.fn(),
  getContractDetail: vi.fn(),
  getPaperContract:vi.fn(),preparePaperContract:vi.fn(),submitContractScan:vi.fn(),getContractScanPdf:vi.fn(),
  acceptContractOffer: vi.fn(),
  requestContractCode: vi.fn(),
  signContract: vi.fn(),
  getContractPdf: vi.fn(),
  dropContractsCache: vi.fn(),
}))

import * as api from '../api.js'
import ContractsPage from './ContractsPage.jsx'

const offer = (over = {}) => ({ id: 1, kind: 'OFFER', title: 'Публичная оферта для клиентов', status: 'PENDING', number: null, lang: 'RU', clientSignedAt: null, schoolSignedAt: null, canSign: true, ...over })
const tariff = (over = {}) => ({ id: 2, kind: 'INDIVIDUAL_STANDARD', title: 'Индивидуальный Standard General English', status: 'PENDING', number: null, lang: 'RU', clientSignedAt: null, schoolSignedAt: null, canSign: true, ...over })
const preparing = { id: null, kind: 'GUARANTEE', title: 'Договор с гарантией результата', status: 'UNAVAILABLE', number: null, lang: 'RU', clientSignedAt: null, schoolSignedAt: null, canSign: false }

function draw() {
  return render(
    <I18nProvider>
      <Languages/>
      <ContractsPage token="TOK" userName="Аружан" userLevel="A2" onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>
  )
}
function Languages(){const {setLang}=useI18n();return <><button onClick={()=>setLang('en')}>Test English</button><button onClick={()=>setLang('ru')}>Test Russian</button></>}

describe('Договоры ученика', () => {
  beforeEach(() => {
    localStorage.removeItem('lang')
    vi.clearAllMocks()
    api.getMyContracts.mockResolvedValue({ items: [offer(), tariff(), preparing], toSign: 2 })
    URL.createObjectURL=vi.fn(()=>"blob:contract");URL.revokeObjectURL=vi.fn();
    api.getPaperContract.mockResolvedValue({
      contract: tariff(),
      body: 'Текст договора',
      prefill: { fullName: 'Айдана Серикова', iin: '', phone: '+7 701 111 22 33', learner: 'SELF', agreed: false },
    })
  })
  afterEach(()=>localStorage.removeItem('lang'))

  it('без ручки на стенде — «скоро появится»', async () => {
    api.getMyContracts.mockResolvedValue(null)
    draw()

    expect(await screen.findByTestId('contracts-unavailable')).toBeTruthy()
  })

  it('показывает оферту, договор по тарифу и «готовится» для договора без утверждённого текста', async () => {
    draw()

    expect(await screen.findByTestId('contract-OFFER')).toBeTruthy()
    expect(screen.getByTestId('contract-INDIVIDUAL_STANDARD').textContent).toContain('Нужно подписать')
    const waiting = screen.getByTestId('contract-GUARANTEE')
    expect(waiting.textContent).toContain('Готовится')
    expect(waiting.textContent).toContain('подписать его пока нельзя')
    expect(waiting.querySelector('button')).toBeNull()
  })

  it('оферта принимается галочкой: пока галочки нет, кнопка неактивна', async () => {
    api.acceptContractOffer.mockResolvedValue(offer({ status: 'SIGNED', number: 'JTS-2026-0001', canSign: false }))
    draw()
    await screen.findByTestId('contract-OFFER')
    const accept = screen.getByRole('button', { name: 'Принять оферту' })
    expect(accept.disabled).toBe(true)

    fireEvent.click(screen.getByTestId('offer-accept'))
    expect(accept.disabled).toBe(false)
    fireEvent.click(accept)

    await waitFor(() => expect(api.acceptContractOffer).toHaveBeenCalledWith('TOK'))
  })

  it('prepares a printable contract and previews it inside the platform with a Back button',async()=>{
    api.preparePaperContract.mockResolvedValue(tariff({number:'JTS-2026-0001'}));api.getContractPdf.mockResolvedValue(new Blob(['pdf'],{type:'application/pdf'}));draw();fireEvent.click(await within('contract-INDIVIDUAL_STANDARD','Открыть договор'));
    const dialog=await screen.findByTestId('paper-dialog');await waitFor(()=>expect(scope(dialog).getByLabelText('ИИН (12 цифр)')).toBeTruthy());
    const prepare=scope(dialog).getByRole('button',{name:'Подготовить и скачать PDF'});expect(prepare.disabled).toBe(true);
    fireEvent.change(scope(dialog).getByLabelText('ИИН (12 цифр)'),{target:{value:'040101500123'}});fireEvent.click(scope(dialog).getByLabelText(/Ознакомлен/));fireEvent.click(prepare);
    await waitFor(()=>expect(api.preparePaperContract).toHaveBeenCalledWith('TOK',2,expect.objectContaining({iin:'040101500123',agreed:true})));
    expect(await screen.findByRole('button',{name:'← Назад'})).toBeTruthy();expect(api.requestContractCode).not.toHaveBeenCalled();
  });
  it('requires a scan and confirmation before submission and shows the pending review',async()=>{
    api.getPaperContract.mockResolvedValue({prepared:true,contract:tariff({number:'JTS-2026-1'}),prefill:{fullName:'Айдана Серикова',iin:'040101500123',phone:'77011234567'},tariffVariants:[],scan:null});
    api.submitContractScan.mockResolvedValue({id:8,version:1,fileName:'signed.pdf',status:'REVIEW',signedOn:'2026-10-27'});draw();fireEvent.click(await within('contract-INDIVIDUAL_STANDARD','Открыть договор'));
    const input=await screen.findByLabelText('Загрузить подписанный скан'),submit=screen.getByRole('button',{name:'Отправить скан на проверку'});expect(submit.disabled).toBe(true);
    const file=new File(['pdf'],'signed.pdf',{type:'application/pdf'});fireEvent.change(input,{target:{files:[file]}});expect(submit.disabled).toBe(true);fireEvent.click(screen.getByLabelText(/Загружены все страницы/));fireEvent.click(submit);
    await waitFor(()=>expect(api.submitContractScan).toHaveBeenCalledWith('TOK',2,file,expect.any(String),true));expect((await screen.findByTestId('scan-status')).textContent).toContain('Скан на проверке');expect(api.signContract).not.toHaveBeenCalled();
  });
  it('shows a returned scan reason and allows a corrected upload',async()=>{
    api.getPaperContract.mockResolvedValue({prepared:true,contract:tariff({status:'SCAN_REJECTED',number:'JTS-2026-1'}),prefill:{iin:'040101500123'},tariffVariants:[],scan:{id:7,version:1,fileName:'scan.pdf',status:'REJECTED',note:'Нет последней страницы',signedOn:'2026-10-27'}});draw();fireEvent.click(await within('contract-INDIVIDUAL_STANDARD','Открыть договор'));expect(await screen.findByText('Нет последней страницы')).toBeTruthy();expect(screen.getByLabelText('Загрузить подписанный скан')).toBeTruthy();
  });
  it('keeps the form open on upload failure and rejects unsupported file types locally',async()=>{
    api.getPaperContract.mockResolvedValue({prepared:true,contract:tariff({number:'JTS-2026-1'}),prefill:null,tariffVariants:[],scan:null});draw();fireEvent.click(await within('contract-INDIVIDUAL_STANDARD','Открыть договор'));const input=await screen.findByLabelText('Загрузить подписанный скан');fireEvent.change(input,{target:{files:[new File(['x'],'unsafe.html')]}});expect((await screen.findByRole('alert')).textContent).toContain('PDF, JPG или PNG');expect(api.submitContractScan).not.toHaveBeenCalled();
  });
  it('accepted contracts remain available with their number and archived PDF',async()=>{
    api.getMyContracts.mockResolvedValue({items:[tariff({status:'SIGNED',number:'JTS-2026-0007',canSign:false})],toSign:0});draw();const row=await screen.findByTestId('contract-INDIVIDUAL_STANDARD');expect(row.textContent).toContain('Договор принят');expect(row.textContent).toContain('JTS-2026-0007');expect(scope(row).getByRole('button',{name:'Скачать PDF'})).toBeTruthy();
  });
  it('switches form labels without reloading the paper detail or discarding entered data',async()=>{
    draw();fireEvent.click(await within('contract-INDIVIDUAL_STANDARD','Открыть договор'));const input=await screen.findByLabelText('ИИН (12 цифр)');fireEvent.change(input,{target:{value:'040101500123'}});fireEvent.click(screen.getByRole('button',{name:'Test English'}));
    expect((await screen.findByLabelText('IIN (12 digits)')).value).toBe('040101500123');expect(api.getPaperContract).toHaveBeenCalledTimes(1);
    expect(contractText('en','Шаблон договора ещё не утверждён')).toBe('The contract template has not been approved yet');expect(contractText('kk','Шаблон договора ещё не утверждён')).toBe('Шарт үлгісі әлі бекітілмеген');
    expect(contractText('en','Не хватает страницы 3')).toBe('Не хватает страницы 3');
  });

  /** Кнопка внутри строки договора: на странице несколько «Подписать». */
  async function within(testId, name) {
    const row = await screen.findByTestId(testId)
    return Array.from(row.querySelectorAll('button')).find((button) => button.textContent === name)
  }
})
