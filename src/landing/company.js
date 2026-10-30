// Реквизиты и контакты исполнителя — дословно из документов владельца
// (оферта и «Безопасность онлайн-платежей», редакция 26.10.2026,
// public/legal/2026-10-29). Поменялись реквизиты — сначала новая редакция
// документов, потом эта таблица: на сайте и в оферте они должны совпадать.
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'

export const COMPANY = {
  email: 'justtostudy01@gmail.com',
  phone: '+7 747 163 41 18',
  phoneHref: 'tel:+77471634118',
  whatsappUrl: SUPPORT_WHATSAPP_URL,
  site: 'https://justtostudy-english.kz',
  iin: '920522400731',
  registration: 'KZ25TWQ01823196',
  registrationDate: '21.02.2022',
  bik: 'CASPKZKA',
  iik: 'KZ38722S000012861552',
  kbe: '19',
}

// То, что зависит от языка: название, адрес, банк, подпись регистрации.
export const COMPANY_TEXT = {
  ru: {
    name: 'ИП «JTS», руководитель СЕРІКҚЫЗЫ АРДАҚ',
    address: 'Республика Казахстан, Алматы, микрорайон Ожет, улица Рафикова, дом 18',
    bank: 'АО Kaspi Bank',
    registration: `Уведомление о начале деятельности в качестве индивидуального предпринимателя № ${COMPANY.registration} от ${COMPANY.registrationDate}`,
  },
  kz: {
    name: '«JTS» ДК, басшысы СЕРІКҚЫЗЫ АРДАҚ',
    address: 'Қазақстан Республикасы, Алматы қ., Өжет шағын ауданы, Рафиков көшесі, 18-үй',
    bank: '«Kaspi Bank» АҚ',
    registration: `Жеке кәсіпкер ретінде қызметтің басталуы туралы хабарлама № ${COMPANY.registration}, ${COMPANY.registrationDate} ж.`,
  },
}
