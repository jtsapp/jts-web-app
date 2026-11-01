import { describe, it, expect } from 'vitest'
import { TEXTS, contractText } from './texts.js'
import {
  addScanFiles, cleanCode, cleanIin, codeReady, formFrom, isOffer, missingFields, requestBody, resendLeft, signable, toSignCount,
} from './contractLogic.js'

const filledStudent = () => ({
  ...formFrom({ fullName: 'Айдана Серикова', iin: '040101500123', phone: '+7 701 111 22 33' }, 'STUDENT'),
  agreed: true,
})

describe('форма подписи', () => {
  it('подставляет данные профиля, а согласие всегда пустое: его ставит человек', () => {
    const form = formFrom({ fullName: 'Айдана', phone: '77011112233', agreed: true }, 'STUDENT')

    expect(form.fullName).toBe('Айдана')
    expect(form.learner).toBe('SELF')
    expect(form.agreed).toBe(false)
    expect(formFrom(null, 'TEACHER').fullName).toBe('')
  })

  it('чистит ИИН и код: только цифры, не больше нужного', () => {
    expect(cleanIin('0401 0150-0123 99')).toBe('040101500123')
    expect(cleanIin(null)).toBe('')
    expect(cleanCode('12-34-56')).toBe('1234')
    expect(codeReady('123')).toBe(false)
    expect(codeReady('1234')).toBe(true)
  })

  it('ученик готов к отправке, когда заполнены ФИО, ИИН из 12 цифр, телефон и стоит согласие', () => {
    expect(missingFields(filledStudent())).toEqual([])
    expect(missingFields({ ...filledStudent(), iin: '123' })).toEqual(['iin'])
    expect(missingFields({ ...filledStudent(), fullName: ' ' })).toEqual(['fullName'])
    expect(missingFields({ ...filledStudent(), agreed: false })).toEqual(['agreed'])
  })

  it('обучаемый — ребёнок или другой человек: нужно его ФИО', () => {
    expect(missingFields({ ...filledStudent(), learner: 'CHILD' })).toEqual(['learnerName','learnerIin'])
    expect(missingFields({ ...filledStudent(), learner: 'CHILD', learnerName: 'Дана',learnerIin:'160101500123' })).toEqual([])
  })

  it('преподаватель: ещё e-mail, удостоверение, дата выдачи и адрес', () => {
    const teacher = { ...formFrom({ fullName: 'Мадина Ким', iin: '900101300456', phone: '77022223344' }, 'TEACHER'), agreed: true }

    expect(missingFields(teacher)).toEqual(['email', 'idNumber', 'idIssuedBy', 'idIssuedAt', 'address'])
    expect(missingFields({ ...teacher, email: 'm@k.kz', idNumber: 'N1', idIssuedBy: 'МВД', idIssuedAt: '2020-05-14', address: 'Алматы' })).toEqual([])
    expect(missingFields({ ...teacher, email: 'm@k.kz', idNumber: 'N1', idIssuedBy: 'МВД', idIssuedAt: '14.05.2020', address: 'Алматы' })).toEqual(['idIssuedAt'])
  })

  it('тело запроса кода: без служебного поля, ИИН цифрами, у «сам» имя обучаемого пустое', () => {
    const body = requestBody({ ...filledStudent(), iin: '0401 0150 0123', learnerName: 'Остаток', fullName: ' Айдана ' })

    expect(body).not.toHaveProperty('party')
    expect(body.iin).toBe('040101500123')
    expect(body.fullName).toBe('Айдана')
    expect(body.learnerName).toBe('')
    expect(body.agreed).toBe(true)
  })
})

describe('список и счётчик', () => {
  it('подписать можно только документ, который уже создан и ждёт подписи', () => {
    expect(signable({ id: 5, canSign: true })).toBe(true)
    expect(signable({ id: null, canSign: false, status: 'UNAVAILABLE' })).toBe(false)
    expect(signable({ id: 5, canSign: false })).toBe(false)
    expect(signable(null)).toBe(false)
    expect(isOffer({ kind: 'OFFER' })).toBe(true)
    expect(isOffer({ kind: 'GROUP_GENERAL' })).toBe(false)
  })

  it('счётчик у пункта меню — ноль без ответа сервера и никогда не отрицательный', () => {
    expect(toSignCount({ toSign: 3 })).toBe(3)
    expect(toSignCount(null)).toBe(0)
    expect(toSignCount({ toSign: -2 })).toBe(0)
    expect(toSignCount({ toSign: 'x' })).toBe(0)
  })

  it('пауза до нового кода считается по часам и не уходит ниже нуля', () => {
    expect(resendLeft(1000, 1000, 30)).toBe(30)
    expect(resendLeft(1000, 21_000, 30)).toBe(10)
    expect(resendLeft(1000, 99_000, 30)).toBe(0)
  })
})

describe('тексты договоров', () => {
  it('ru, kk и en совпадают по ключам и подстановкам', () => {
    const keys = (o) => Object.keys(o).sort()
    expect(keys(TEXTS.kk)).toEqual(keys(TEXTS.ru))
    expect(keys(TEXTS.en)).toEqual(keys(TEXTS.ru))
    const holes = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',')
    for (const key of Object.keys(TEXTS.ru)) {
      expect(holes(TEXTS.en[key]), key).toBe(holes(TEXTS.ru[key]))
      expect(holes(TEXTS.kk[key]), key).toBe(holes(TEXTS.ru[key]))
    }
  })

  it('подписи статусов есть для каждого состояния договора', () => {
    for (const lang of ['ru', 'kk', 'en']) {
      for (const status of ['PENDING', 'CLIENT_SIGNED', 'SIGNED', 'UNAVAILABLE']) expect(TEXTS[lang]['status.' + status], `${lang}:${status}`).toBeTruthy()
    }
    expect(contractText('ru', 'code.sent', { phone: '+7 *** *** 22 33' })).toBe('Код отправлен на +7 *** *** 22 33. Он действует 5 минут.')
    expect(contractText('de', 'title')).toBe('Договоры')
  })
})

describe('файлы скана', () => {
  const file = (name, size = 10) => { const f = new File(['x'], name); Object.defineProperty(f, 'size', { value: size }); return f }
  const names = r => r.files.map(f => f.name)

  it('фото добавляются к уже выбранным по порядку', () => {
    expect(names(addScanFiles(addScanFiles([], [file('1.jpg'), file('2.jpg')]).files, [file('3.png')]))).toEqual(['1.jpg', '2.jpg', '3.png'])
  })
  it('PDF идёт одним файлом и заменяет фото, а фото заменяют PDF', () => {
    const pdf = addScanFiles([file('1.jpg')], [file('signed.pdf')])
    expect(names(pdf)).toEqual(['signed.pdf'])
    expect(names(addScanFiles(pdf.files, [file('1.jpg')]))).toEqual(['1.jpg'])
    expect(addScanFiles([], [file('a.pdf'), file('1.jpg')]).error).toBe('paper.pdfAlone')
  })
  it('при ошибке выбранное не теряется', () => {
    const current = [file('1.jpg')]
    expect(addScanFiles(current, [file('doc.heic')])).toEqual({ files: current, error: 'paper.fileError' })
    expect(addScanFiles(current, [file('big.jpg', 16 * 1024 * 1024)]).error).toBe('paper.fileError')
    expect(addScanFiles(current, Array.from({ length: 20 }, (_, i) => file(i + '.jpg'))).error).toBe('paper.tooMany')
    expect(addScanFiles(current, Array.from({ length: 6 }, (_, i) => file(i + '.jpg', 14 * 1024 * 1024))).error).toBe('paper.tooBig')
  })
  it('у новых подсказок есть перевод на все языки', () => {
    for (const key of ['paper.pdfAlone', 'paper.tooMany', 'paper.tooBig', 'paper.more', 'paper.remove']) for (const lang of Object.keys(TEXTS)) expect(TEXTS[lang][key], `${lang}:${key}`).toBeTruthy()
  })
})
