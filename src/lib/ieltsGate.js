// Прод-домены. Сборка и образ у дева и прода одни (NODE_ENV там и там production, TUTOR_ONLY одинаков в develop и main),
// поэтому единственное, что их различает на лету, — домен. Список короткий и явный: незнакомый адрес (дев, localhost,
// превью) прод-доменом не считается. IELTS и SAT на проде открыты (раньше скрывались по этому признаку); по нему же
// сейчас скрыт только звонок ассистента (lib/assistant/callGate.js).
export const PROD_HOSTS = ['ai-tutor.justtostudy.kz']

const clean = (v) => String(v ?? '').trim().toLowerCase().replace(/:\d+$/, '')

/** Прод-домен ли это (в любом регистре и с портом) — общая развилка для разделов, скрытых на проде. */
export const isProdHost = (hostname) => PROD_HOSTS.includes(clean(hostname))
