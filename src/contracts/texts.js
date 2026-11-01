import { useCallback } from 'react'
import { useI18n } from '../i18n.jsx'

// Тексты раздела «Договоры» ученика — свой словарь, как у «Выбрать группу» (src/groups/texts.js). Русский — по ТЗ кабинетов,
// раздел 14а; ключи одинаковы во всех языках (сторож — contracts.test.js). Названия самих договоров приходят с сервера на языке
// кабинета, поэтому здесь только подписи экрана.

const ru = {
  title: 'Договоры',
  lead: 'Договоры подписываются здесь, без бумаги и пересылки файлов: форма, код из SMS — и готово. Подписанный PDF остаётся в этом разделе.',
  loading: 'Загружаем…',
  empty: 'Договоров пока нет.',
  unavailable: 'Раздел скоро появится.',
  'error.generic': 'Не удалось выполнить действие. Попробуйте ещё раз.',
  'status.PENDING': 'Нужно подписать',
  'status.CLIENT_SIGNED': 'Вы подписали, ждём подпись школы',
  'status.SIGNED': 'Подписан с двух сторон',
  'status.UNAVAILABLE': 'Готовится',
  'row.number': '№ {number}',
  'row.signed': 'подписан {date}',
  'row.sign': 'Подписать',
  'row.read': 'Читать договор (PDF)',
  'row.pdf': 'Скачать PDF',
  'row.preparing': 'Текст договора утверждается — подписать его пока нельзя.',
  'offer.title': 'Публичная оферта',
  'offer.accept': 'Принимаю условия оферты',
  'offer.button': 'Принять оферту',
  'offer.done': 'Оферта принята',
  'form.title': 'Подписание договора',
  'form.sub': 'Данные подставлены из профиля — проверьте их.',
  'form.fullName': 'ФИО',
  'form.iin': 'ИИН (12 цифр)',
  'form.phone': 'Телефон',
  'form.phoneHint': 'Код придёт SMS на номер из вашего профиля.',
  'form.email': 'E-mail',
  'form.learner': 'Кто будет учиться',
  'form.learner.SELF': 'Я сам(а)',
  'form.learner.CHILD': 'Ребёнок',
  'form.learner.OTHER': 'Другой человек',
  'form.learnerName': 'ФИО обучаемого',
  'form.learnerIin': 'ИИН обучаемого (12 цифр)',
  'form.tariffVariant': 'Вариант тарифа из таблицы договора',
  'form.photoConsent': 'Согласен(на) на использование фото и отзыва (необязательно)',
  'form.idNumber': 'Удостоверение личности, №',
  'form.idIssuedBy': 'Кем выдано',
  'form.idIssuedAt': 'Когда выдано',
  'form.address': 'Адрес проживания',
  'form.agreed': 'Ознакомлен(а) с полным текстом договора и согласен(на) на обработку персональных данных',
  'form.getCode': 'Получить SMS-код',
  'form.cancel': 'Отмена',
  'code.title': 'Введите код из SMS',
  'code.sent': 'Код отправлен на {phone}. Он действует 5 минут.',
  'code.label': 'Код (4 цифры)',
  'code.sign': 'Подписать',
  'code.resend': 'Получить новый код',
  'code.resendIn': 'Новый код через {n} с',
  'code.back': '← Изменить данные',
  'done.title': 'Договор подписан',
  'done.text': 'Номер {number}. После подписи школы он появится в разделе с готовым PDF.',
  'done.close': 'Готово',
}

const kk = {
  title: 'Шарттар',
  lead: 'Шарттар осында қол қойылады, қағазсыз және файл жібермей: форма, SMS-тағы код — және дайын. Қол қойылған PDF осы бөлімде қалады.',
  loading: 'Жүктелуде…',
  empty: 'Шарттар әзірге жоқ.',
  unavailable: 'Бөлім жақында қосылады.',
  'error.generic': 'Әрекетті орындау мүмкін болмады. Қайталап көріңіз.',
  'status.PENDING': 'Қол қою керек',
  'status.CLIENT_SIGNED': 'Сіз қол қойдыңыз, мектептің қолын күтеміз',
  'status.SIGNED': 'Екі жақты қол қойылған',
  'status.UNAVAILABLE': 'Дайындалуда',
  'row.number': '№ {number}',
  'row.signed': '{date} қол қойылды',
  'row.sign': 'Қол қою',
  'row.read': 'Шартты оқу (PDF)',
  'row.pdf': 'PDF жүктеу',
  'row.preparing': 'Шарт мәтіні бекітілуде — әзірге қол қоюға болмайды.',
  'offer.title': 'Жария оферта',
  'offer.accept': 'Оферта талаптарын қабылдаймын',
  'offer.button': 'Офертаны қабылдау',
  'offer.done': 'Оферта қабылданды',
  'form.title': 'Шартқа қол қою',
  'form.sub': 'Деректер профильден қойылды — тексеріп шығыңыз.',
  'form.fullName': 'Аты-жөні',
  'form.iin': 'ЖСН (12 сан)',
  'form.phone': 'Телефон',
  'form.phoneHint': 'Код профильдегі нөмірге SMS болып келеді.',
  'form.email': 'E-mail',
  'form.learner': 'Кім оқиды',
  'form.learner.SELF': 'Өзім',
  'form.learner.CHILD': 'Бала',
  'form.learner.OTHER': 'Басқа адам',
  'form.learnerName': 'Оқушының аты-жөні',
  'form.learnerIin': 'Оқушының ЖСН (12 сан)',
  'form.tariffVariant': 'Шарт кестесіндегі тариф нұсқасы',
  'form.photoConsent': 'Фото мен пікірді қолдануға келісемін (міндетті емес)',
  'form.idNumber': 'Жеке куәлік, №',
  'form.idIssuedBy': 'Кім берген',
  'form.idIssuedAt': 'Қашан берілген',
  'form.address': 'Тұрғылықты мекенжайы',
  'form.agreed': 'Шарттың толық мәтінімен таныстым және дербес деректерді өңдеуге келісемін',
  'form.getCode': 'SMS-код алу',
  'form.cancel': 'Бас тарту',
  'code.title': 'SMS-тағы кодты енгізіңіз',
  'code.sent': 'Код {phone} нөміріне жіберілді. Ол 5 минут жарамды.',
  'code.label': 'Код (4 сан)',
  'code.sign': 'Қол қою',
  'code.resend': 'Жаңа код алу',
  'code.resendIn': 'Жаңа код {n} с кейін',
  'code.back': '← Деректерді өзгерту',
  'done.title': 'Шартқа қол қойылды',
  'done.text': 'Нөмірі {number}. Мектеп қол қойған соң ол осы бөлімде дайын PDF болып шығады.',
  'done.close': 'Дайын',
}

const en = {
  title: 'Contracts',
  lead: 'Contracts are signed right here, with no paper or file exchange: a form, an SMS code — and done. The signed PDF stays in this section.',
  loading: 'Loading…',
  empty: 'No contracts yet.',
  unavailable: 'This section is coming soon.',
  'error.generic': 'Could not complete the action. Please try again.',
  'status.PENDING': 'Needs your signature',
  'status.CLIENT_SIGNED': 'You signed, waiting for the school',
  'status.SIGNED': 'Signed by both sides',
  'status.UNAVAILABLE': 'In preparation',
  'row.number': 'No. {number}',
  'row.signed': 'signed {date}',
  'row.sign': 'Sign',
  'row.read': 'Read the contract (PDF)',
  'row.pdf': 'Download PDF',
  'row.preparing': 'The contract text is being approved — it cannot be signed yet.',
  'offer.title': 'Public offer',
  'offer.accept': 'I accept the terms of the offer',
  'offer.button': 'Accept the offer',
  'offer.done': 'Offer accepted',
  'form.title': 'Signing the contract',
  'form.sub': 'The details come from your profile — please check them.',
  'form.fullName': 'Full name',
  'form.iin': 'IIN (12 digits)',
  'form.phone': 'Phone',
  'form.phoneHint': 'The code is sent by SMS to the number in your profile.',
  'form.email': 'E-mail',
  'form.learner': 'Who will study',
  'form.learner.SELF': 'Myself',
  'form.learner.CHILD': 'My child',
  'form.learner.OTHER': 'Another person',
  'form.learnerName': 'Learner’s full name',
  'form.learnerIin': 'Learner’s IIN (12 digits)',
  'form.tariffVariant': 'Plan option from the contract table',
  'form.photoConsent': 'I agree to the use of photos and my review (optional)',
  'form.idNumber': 'ID document No.',
  'form.idIssuedBy': 'Issued by',
  'form.idIssuedAt': 'Issued on',
  'form.address': 'Home address',
  'form.agreed': 'I have read the full text of the contract and agree to the processing of personal data',
  'form.getCode': 'Get SMS code',
  'form.cancel': 'Cancel',
  'code.title': 'Enter the code from the SMS',
  'code.sent': 'The code was sent to {phone}. It is valid for 5 minutes.',
  'code.label': 'Code (4 digits)',
  'code.sign': 'Sign',
  'code.resend': 'Get a new code',
  'code.resendIn': 'New code in {n} s',
  'code.back': '← Edit details',
  'done.title': 'Contract signed',
  'done.text': 'Number {number}. Once the school signs, the finished PDF appears in this section.',
  'done.close': 'Done',
}

Object.assign(ru,{
  "paper.title": "Бумажный договор",
  "paper.steps": "Заполните данные, скачайте договор и подпишите его от руки. Загрузите скан всех страниц — ответственный сотрудник проверит его.",
  "paper.prepare": "Подготовить и скачать PDF",
  "paper.upload": "Загрузить подписанный скан",
  "paper.files": "Сфотографируйте каждую страницу и выберите все фото по порядку — они соберутся в один документ. Или загрузите один PDF. JPG, PNG или PDF, до 15 МБ каждый файл.",
  "paper.more": "Можно добавить ещё фото: они встанут следующими страницами.",
  "paper.remove": "Убрать",
  "paper.pdfAlone": "PDF загрузите одним файлом. Несколько файлов — только фото страниц в JPG или PNG",
  "paper.tooMany": "Не более 20 фото за раз",
  "paper.tooBig": "Все фото вместе — не более 80 МБ",
  "paper.fileError": "Загрузите PDF, JPG или PNG размером до 15 МБ",
  "paper.signedOn": "Дата подписи на бумаге",
  "paper.confirm": "Загружены все страницы договора с собственноручными подписями",
  "paper.submit": "Отправить скан на проверку",
  "paper.readScan": "Открыть скан",
  "paper.version": "Версия",
  "paper.back": "Назад",
  "paper.error": "Не удалось подготовить договор",
  "scan.REVIEW": "Скан на проверке",
  "scan.APPROVED": "Скан принят",
  "scan.REJECTED": "Скан возвращён",
  "status.SCAN_REVIEW": "Скан на проверке",
  "status.SCAN_REJECTED": "Скан возвращён",
  "status.SIGNED": "Договор принят",
  "row.sign": "Открыть договор",
  "lead": "Заполните данные, скачайте договор и подпишите его от руки. Затем загрузите скан для проверки сотрудником школы."
});
Object.assign(kk,{
  "paper.title": "Қағаз шарт",
  "paper.steps": "Деректерді толтырып, шартты жүктеп алып, қолмен қол қойыңыз. Барлық беттің сканын жүктеңіз — жауапты қызметкер тексереді.",
  "paper.prepare": "PDF дайындау және жүктеп алу",
  "paper.upload": "Қол қойылған сканды жүктеу",
  "paper.files": "Әр бетті суретке түсіріп, барлық суретті ретімен таңдаңыз — олар бір құжатқа жиналады. Немесе бір PDF жүктеңіз. JPG, PNG немесе PDF, әр файл 15 МБ-қа дейін.",
  "paper.more": "Тағы сурет қосуға болады: олар келесі беттер болады.",
  "paper.remove": "Алып тастау",
  "paper.pdfAlone": "PDF-ті бір файлмен жүктеңіз. Бірнеше файл — тек беттердің JPG немесе PNG суреттері",
  "paper.tooMany": "Бір жолы 20 суреттен артық емес",
  "paper.tooBig": "Барлық сурет бірге — 80 МБ-тан аспауы тиіс",
  "paper.fileError": "15 МБ-қа дейінгі PDF, JPG немесе PNG жүктеңіз",
  "paper.signedOn": "Қағазға қол қойылған күн",
  "paper.confirm": "Шарттың қолмен қол қойылған барлық беті жүктелді",
  "paper.submit": "Сканды тексеруге жіберу",
  "paper.readScan": "Сканды ашу",
  "paper.version": "Нұсқа",
  "paper.back": "Артқа",
  "paper.error": "Шартты дайындау мүмкін болмады",
  "scan.REVIEW": "Скан тексерілуде",
  "scan.APPROVED": "Скан қабылданды",
  "scan.REJECTED": "Скан қайтарылды",
  "status.SCAN_REVIEW": "Скан тексерілуде",
  "status.SCAN_REJECTED": "Скан қайтарылды",
  "status.SIGNED": "Шарт қабылданды",
  "row.sign": "Шартты ашу",
  "lead": "Деректерді толтырып, шартты жүктеп алып, қолмен қол қойыңыз. Содан кейін мектеп қызметкеріне тексеруге скан жүктеңіз."
});
Object.assign(en,{
  "paper.title": "Paper contract",
  "paper.steps": "Fill in your details, download the contract and sign it by hand. Upload a scan of every page for staff review.",
  "paper.prepare": "Prepare and download PDF",
  "paper.upload": "Upload signed scan",
  "paper.files": "Take a photo of each page and select all photos in order — they will be combined into one document. Or upload a single PDF. JPG, PNG or PDF, up to 15 MB per file.",
  "paper.more": "You can add more photos: they will become the next pages.",
  "paper.remove": "Remove",
  "paper.pdfAlone": "Upload a PDF as a single file. Several files can only be JPG or PNG photos of the pages",
  "paper.tooMany": "No more than 20 photos at once",
  "paper.tooBig": "All photos together — up to 80 MB",
  "paper.fileError": "Upload PDF, JPG or PNG, up to 15 MB",
  "paper.signedOn": "Date signed on paper",
  "paper.confirm": "All contract pages with handwritten signatures are included",
  "paper.submit": "Submit scan for review",
  "paper.readScan": "Open scan",
  "paper.version": "Version",
  "paper.back": "Back",
  "paper.error": "Could not prepare the contract",
  "scan.REVIEW": "Scan under review",
  "scan.APPROVED": "Scan approved",
  "scan.REJECTED": "Scan returned",
  "status.SCAN_REVIEW": "Scan under review",
  "status.SCAN_REJECTED": "Scan returned",
  "status.SIGNED": "Contract accepted",
  "row.sign": "Open contract",
  "lead": "Fill in your details, download the contract and sign it by hand. Then upload the scan for staff review."
});

const PAPER_ERRORS={
  "Сначала заполните данные и скачайте договор": [
    "Алдымен деректерді толтырып, шартты жүктеп алыңыз",
    "Fill in your details and download the contract first"
  ],
  "Подтвердите, что загрузили все страницы подписанного договора": [
    "Қол қойылған шарттың барлық бетін жүктегеніңізді растаңыз",
    "Confirm that you uploaded all signed contract pages"
  ],
  "Укажите дату подписи на бумажном договоре": [
    "Қағаз шартқа қол қойылған күнді көрсетіңіз",
    "Enter the date the paper contract was signed"
  ],
  "Скан не найден": [
    "Скан табылмады",
    "Scan not found"
  ],
  "Это не ваш договор": [
    "Бұл сіздің шартыңыз емес",
    "This contract does not belong to you"
  ],
  "Договор не найден": [
    "Шарт табылмады",
    "Contract not found"
  ],
  "По этому скану решение уже принято": [
    "Бұл скан бойынша шешім қабылданған",
    "This scan has already been reviewed"
  ],
  "Комментарий — до 2000 символов": [
    "Пікір 2000 таңбадан аспауы керек",
    "The comment must be at most 2,000 characters"
  ],
  "Подтвердите проверку всех страниц, данных и собственноручных подписей": [
    "Барлық бетті, деректерді және қолмен қойылған қолдарды тексергеніңізді растаңыз",
    "Confirm that all pages, details and handwritten signatures have been checked"
  ],
  "Укажите причину возврата скана (от 5 символов)": [
    "Сканды қайтару себебін жазыңыз (кемінде 5 таңба)",
    "Enter a reason for returning the scan (at least 5 characters)"
  ],
  "Договор уже на проверке или принят": [
    "Шарт тексерілуде немесе қабылданды",
    "The contract is already under review or accepted"
  ],
  "Шаблон договора ещё не утверждён": [
    "Шарт үлгісі әлі бекітілмеген",
    "The contract template has not been approved yet"
  ],
  "Редакция договора изменилась. Обновите раздел договоров": [
    "Шарттың нұсқасы өзгерді. Шарттар бөлімін жаңартыңыз",
    "The contract revision changed. Refresh Contracts"
  ],
  "Скан: от 1 байта до 15 МБ": [
    "Скан: 1 байттан 15 МБ-қа дейін",
    "The scan must be between 1 byte and 15 MB"
  ],
  "Загрузите скан в PDF, JPG или PNG": [
    "Сканды PDF, JPG немесе PNG форматында жүктеңіз",
    "Upload a PDF, JPG or PNG scan"
  ],
  "PDF должен содержать от 1 до 40 страниц и открываться без пароля": [
    "PDF 1–40 беттен тұрып, құпиясөзсіз ашылуы керек",
    "The PDF must have 1–40 pages and open without a password"
  ],
  "Слишком большое разрешение страниц скана": [
    "Скан беттерінің ажыратымдылығы тым жоғары",
    "The scan pages have too high a resolution"
  ],
  "Слишком большое разрешение изображения скана": [
    "Скан суретінің ажыратымдылығы тым жоғары",
    "The scan image has too high a resolution"
  ],
  "Не удалось прочитать скан. Проверьте файл и попробуйте снова": [
    "Сканды оқу мүмкін болмады. Файлды тексеріп, қайталап көріңіз",
    "Could not read the scan. Check the file and try again"
  ],
  "Заполните данные договора": [
    "Шарт деректерін толтырыңыз",
    "Fill in the contract details"
  ],
  "Укажите ФИО": [
    "Толық аты-жөніңізді көрсетіңіз",
    "Enter your full name"
  ],
  "ИИН — 12 цифр": [
    "ЖСН — 12 сан",
    "The IIN must have 12 digits"
  ],
  "Укажите телефон": [
    "Телефонды көрсетіңіз",
    "Enter a phone number"
  ],
  "Подтвердите, что ознакомлены с текстом договора и согласны на обработку персональных данных": [
    "Шарт мәтінімен танысқаныңызды және дербес деректерді өңдеуге келісетініңізді растаңыз",
    "Confirm that you have read the contract and consent to personal data processing"
  ],
  "Обучаемый — сам, ребёнок или другой человек": [
    "Оқушы — өзіңіз, балаңыз немесе басқа адам",
    "Choose yourself, a child or another person as the learner"
  ],
  "Укажите ФИО обучаемого": [
    "Оқушының толық аты-жөнін көрсетіңіз",
    "Enter the learner’s full name"
  ],
  "Укажите e-mail": [
    "E-mail көрсетіңіз",
    "Enter an email address"
  ],
  "Укажите номер удостоверения личности": [
    "Жеке куәлік нөмірін көрсетіңіз",
    "Enter the identity document number"
  ],
  "Укажите, кем выдано удостоверение": [
    "Куәлікті берген органды көрсетіңіз",
    "Enter the identity document’s issuing authority"
  ],
  "Укажите адрес проживания": [
    "Тұрғылықты мекенжайыңызды көрсетіңіз",
    "Enter your residential address"
  ],
  "Укажите, когда выдано удостоверение": [
    "Куәлік берілген күнді көрсетіңіз",
    "Enter the identity document’s issue date"
  ],
  "Дата выдачи удостоверения не может быть в будущем": [
    "Куәлік берілген күн болашақта болмауы керек",
    "The identity document’s issue date cannot be in the future"
  ],
  "Выберите вариант тарифа из договора": [
    "Шарттағы тариф нұсқасын таңдаңыз",
    "Select a tariff option from the contract"
  ],
  "ИИН обучаемого — 12 цифр": [
    "Оқушының ЖСН-і — 12 сан",
    "The learner’s IIN must have 12 digits"
  ],
  "Не удалось открыть PDF": [
    "PDF ашу мүмкін болмады",
    "Could not open the PDF"
  ]
};
for(const [ruMessage,[kkMessage,enMessage]] of Object.entries(PAPER_ERRORS)){ru[ruMessage]=ruMessage;kk[ruMessage]=kkMessage;en[ruMessage]=enMessage;}

export function contractError(error){return error?.serverMessage || 'error.generic';}

export const TEXTS = { ru, kk, en }

export function contractText(lang, key, vars) {
  let s = (TEXTS[lang] && TEXTS[lang][key]) ?? TEXTS.ru[key] ?? key
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k])
  return s
}

export function useContractT() {
  const { lang } = useI18n()
  const t = useCallback((key, vars) => contractText(lang, key, vars), [lang])
  return { t, lang }
}
