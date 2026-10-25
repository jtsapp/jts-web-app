// Собирает тест уровня v16 методиста (data/jtsplacement-v16.html) в public/placement/v16/ — страницу, которую
// приложение открывает в iframe (экран ?screen=placement, см. src/screens/PlacementPage.jsx).
//
// Тест встраивается КАК ЕСТЬ (спека docs/superpowers/specs/2026-10-14-placement-v16-first-login-design.md):
// логику и разметку автора не переписываем, своё подключаем через его же крючки (JTSPlacementConfig,
// JTSSpeakingBuddy). Сборка делает только то, без чего страницу нельзя отдавать ученику:
//   1. вшитые base64 (картинки, шрифты, видео — 8 из 8.6 МБ файла) выносит файлами в media/: браузер кэширует их
//      отдельно, а html перестаёт весить как фильм;
//   2. записи аудирования с CloudFront чужого аккаунта Higgsfield скачивает в audio/ — аккаунт может исчезнуть
//      вместе с записями (та же причина, что у fetch-words-assets.js);
//   3. накладывает точечные патчи (PATCHES). Каждый обязан найтись РОВНО ОДИН раз: новая версия автора, где
//      строка поменялась, роняет сборку, а не уезжает к ученикам без патча.
//
// Запуск: node scripts/build-placement-v16.js [путь-к-html] [--force]
//   --force — перекачать записи, даже если они уже лежат.

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const ROOT = path.join(__dirname, '..')
const DEFAULT_SRC = path.join(ROOT, 'data', 'jtsplacement-v16.html')
const OUT_DIR = path.join(ROOT, 'public', 'placement', 'v16')

// Мелочь (иконки-SVG на сотню байт) оставляем внутри: отдельный запрос за ней дороже самой картинки.
const MIN_EXTRACT_BYTES = 2048

const EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'font/woff2': 'woff2',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
}

const CLOUDFRONT_RE = /https:\/\/d8j0ntlcm91z4\.cloudfront\.net\/[A-Za-z0-9_\-/.]+?\.mp3/g

// Прелюдия: страница узнаёт язык и «пространство» профиля из своего адреса (?lang=ru&ns=<id>). Отдельным скриптом
// ДО скрипта автора — его переменные объявляются при первом же исполнении.
const PRELUDE =
  '<script>/* jts host prelude (scripts/build-placement-v16.js) */' +
  "(function(){try{var q=new URLSearchParams(location.search);var l=q.get('lang');" +
  "window.JTS_HOST={lang:['ru','kk','en'].indexOf(l)>=0?l:null,ns:(q.get('ns')||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,64)}" +
  '}catch(e){window.JTS_HOST={lang:null,ns:\'\'}}' +
  // Картинки макета по позам экрана (патч skin-images): остальные позы рисует автор.
  "window.JTS_SKIN_IMG={welcome:'skin/intro.webp',result:'skin/result.webp'};})();</script>"

// Скин макета — после стилей автора, чтобы перекрывать их без !important. Отдельным файлом: правится руками, а
// браузер кэширует его отдельно от страницы.
const SKIN_LINK = '<link rel="stylesheet" href="skin.css"/>'

// Казахский интерфейс — на Inter, как во всём приложении (src/kk-font.css). Правила приложения в iframe не доходят: у
// теста свой документ и своя вшитая гарнитура «JTS Manrope». Тест сам ставит <html lang="kk"> при казахском (chrome()
// автора, и при переключении языка внутри теста тоже), поэтому правило висит на атрибуте. Гарнитур у теста только две —
// «JTS Manrope» и Inter, моноширинных и иконочных нет, — так что * с !important ничего чужого не задевает. Inter — той же
// ссылкой Google Fonts, что в layout.jsx: файлы шрифта браузер качает, только когда гарнитура реально нужна. Логотип
// (.wordmark) автор сам задал на Inter на всех языках — без этой ссылки он падал на системный шрифт.
const KK_FONT =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap"/>' +
  '<style id="jts-host-kk-font">html[lang="kk"] *{font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif!important}</style>'

// [что ищем, на что меняем, зачем]. Строки — точные куски исходника.
const PATCHES = [
  [
    "const STORAGE='jts_placement_ui_v11';",
    "const STORAGE='jts_placement_ui_v11'+(window.JTS_HOST&&window.JTS_HOST.ns?':'+window.JTS_HOST.ns:'');",
    // Прогон автора живёт в localStorage устройства и принадлежит не аккаунту, а устройству: второй ученик на
    // том же компьютере продолжил бы чужой тест. Ключ с пространством профиля разводит их.
    'storage-namespace',
  ],
  [
    "let app=null;let lang='ru';",
    "let app=null;let lang=(window.JTS_HOST&&window.JTS_HOST.lang)||'ru';",
    // Стартовый язык — язык интерфейса приложения; переключатель самого теста по-прежнему работает и запоминается.
    'start-language',
  ],
  [
    "appUrl:'https://dev-tutor.justtostudy.kz/',",
    "appUrl:'/',",
    // Запасная навигация автора открывала дев-стенд в новой вкладке даже с прода. Основной путь — наш navigate.
    'app-url',
  ],
  [
    "practiceUrl:'https://dev-tutor.justtostudy.kz/?screen=practice',",
    "practiceUrl:'/?screen=practice',",
    'practice-url',
  ],
  [
    "subscores:raw.subscores||null}:{status:'not_assessed'}}",
    "subscores:raw.subscores||null,feedback:raw.feedback||null}:{status:'not_assessed'}}",
    // Отзыв о говорении (summary/strengths/improvements грейдера) автор выбрасывал вместе со всем, кроме уровня. Окно
    // говорения поэтому показывало его само, сразу после записи — раньше остальных результатов (жалоба 16.10.2026).
    // Теперь он хранится с уровнем в состоянии теста и едет в конверт (skillResults.S.feedback) — до итога.
    'speaking-feedback-keep',
  ],
  [
    '${evidence(p,r)}${goalsHTML(g)}',
    "${evidence(p,r)}${window.JTSHostSpeakingFeedback?window.JTSHostSpeakingFeedback(p.skills.S,lang):''}${goalsHTML(g)}",
    // Отзыв о говорении — на экране итога рядом с остальными навыками. Разметку рисует хост (src/placement/
    // speakingFeedback.js): у автора панели отзыва нет, а текст модели надо экранировать.
    'speaking-feedback-result',
  ],
  ...skinPatches(),
]

// Скин по макету «Регистрация → 2 · Цели и маршрут, 3 · Тест уровня» (Figma, 21.10.2026). Вид задаёт skin.css (рядом
// со страницей, пишется руками — сборка его только подключает), а патчи ниже — то, чего стилями не сделать: текст
// заголовка приветствия, кнопка «назад» в шапке, картинки макета вместо маскотов автора, панель «Твои цели» у анкеты
// и строка кнопок вопроса под карточкой. Логику автора (подсчёт, адаптив, итог) патчи не трогают.
function skinPatches() {
  // Панель «Твои цели» справа от анкеты (у автора её нет). Функция встаёт внутрь installStudentGoals, рядом с
  // renderGoals, — там видны помощники анкеты (state, displayGoal, prefLabel, answerLabel). repaint автора
  // перерисовывает анкету целиком на каждый клик, поэтому панель живая без своих слушателей.
  const goalsPanel =
    'function jtsGoalsPanel(){try{const {g,d}=state();' +
    "const T9={ru:['Твои цели','Главная цель','Роль сейчас','Мотивация','Формат занятий','Время в день','Обратная связь','Пока не выбрано','из','Уровень определит сам тест']," +
    "kk:['Сенің мақсаттарың','Негізгі мақсат','Қазіргі рөлің','Мотивация','Сабақ форматы','Күніне уақыт','Кері байланыс','Әлі таңдалмаған','/','Деңгейді тесттің өзі анықтайды']," +
    "en:['Your goals','Main goal','Current role','Motivation','Learning format','Time per day','Feedback','Not chosen yet','of','The test itself will set your level']};" +
    'const L=T9[lang]||T9.ru;const has=v=>Array.isArray(v)?v.length>0:!!v;' +
    'const role=(d.followUpDrafts||{}).career_role||(g.followUpAnswers||{}).career_role;' +
    "const pref=k=>has(g[k])?prefLabel(k):'';" +
    "const items=[['goal',g.primaryGoal?displayGoal(g.primaryGoal):''],['role',role&&has(role.value)?answerLabel('career_role',role):'']," +
    "['motivation',pref('motivationFactors')],['format',pref('preferredActivities')],['time',pref('studyAvailability')],['feedback',pref('feedbackPreference')]];" +
    'const n=items.filter(i=>i[1]).length;' +
    'return `<aside class="jts-goals-plan" aria-label="${esc(L[0])}"><div class="jts-gp-head"><span class="jts-gp-plate jts-ico-my_location"></span>' +
    '<b>${esc(L[0])}</b><span class="jts-gp-count">${n} ${esc(L[8])} 6</span></div><div class="jts-gp-track"><i style="width:${Math.max(n,0.5)/6*100}%"></i></div>' +
    "${items.map(([k,v],i)=>`<div class=\"jts-gp-item${v?' is-set':''}\"><span class=\"jts-gp-plate jts-ico-${k}\"></span>" +
    "<span class=\"jts-gp-text\"><small>${esc(L[i+1])}</small><b>${esc(v||L[7])}</b></span></div>`).join('')}" +
    '<div class="jts-gp-note"><span class="jts-ico-info"></span><span>${esc(L[9])}</span></div></aside>`' +
    "}catch(e){return ''}}"
  return [
    [
      // Язык — названием, как в макете («Русский ⌄»), а не кодом.
      '<option value="ru" ${lang===\'ru\'?\'selected\':\'\'}>RU</option><option value="en" ${lang===\'en\'?\'selected\':\'\'}>EN</option><option value="kk" ${lang===\'kk\'?\'selected\':\'\'}>KZ</option>',
      '<option value="ru" ${lang===\'ru\'?\'selected\':\'\'}>Русский</option><option value="en" ${lang===\'en\'?\'selected\':\'\'}>English</option><option value="kk" ${lang===\'kk\'?\'selected\':\'\'}>Қазақша</option>',
      'skin-language-names',
    ],
    [
      // Круглая «назад» слева от логотипа: выход из теста в приложение (JTSHostExit ставит bridge.js). Своя полоса
      // «← На главную» над iframe ушла — у макета одна шапка.
      '<header class="topbar"><a href="#" class="wordmark" data-home aria-label="JTS">just to study<span>.</span></a>',
      '<header class="topbar"><div class="jts-brand"><button type="button" class="jts-back" data-jts-back aria-label="${lang===\'ru\'?\'Назад\':lang===\'kk\'?\'Артқа\':\'Back\'}"></button><a href="#" class="wordmark" data-home aria-label="JTS">just to study<span>.</span></a></div>',
      'skin-back-button',
    ],
    [
      // Нота «♫» в чипе — значок динамика макета рисует skin.css.
      "${lang==='ru'?'♫ Проверить звук':lang==='kk'?'♫ Дыбысты тексеру':'♫ Sound check'}",
      "${lang==='ru'?'Проверить звук':lang==='kk'?'Дыбысты тексеру':'Sound check'}",
      'skin-sound-chip',
    ],
    [
      "document.querySelector('#language').onchange=e=>{stopCurrentMedia();lang=e.target.value;save();render()};",
      "document.querySelector('#language').onchange=e=>{stopCurrentMedia();lang=e.target.value;save();render()};" +
        "document.querySelectorAll('[data-jts-back]').forEach(el=>el.onclick=()=>{stopCurrentMedia();if(window.JTSHostExit)window.JTSHostExit();else{app.screen='welcome';save();render()}});",
      'skin-back-bind',
    ],
    [
      "<h1>${t('welcome')}<br><span>JTS Placement Test</span></h1>",
      "<h1>${lang==='ru'?'Давайте определим<br>ваш уровень':lang==='kk'?'Деңгейіңізді<br>анықтайық':'Let’s find<br>your level'}</h1>",
      'skin-welcome-title',
    ],
    [
      // Картинки макета (маскот с линейкой, с микрофоном, Декстер итога) — по позе экрана, остальные позы — авторские.
      'src="${visual[pose]||POSES[pose]||POSES.welcome}"',
      'src="${(window.JTS_SKIN_IMG||{})[pose]||visual[pose]||POSES[pose]||POSES.welcome}"',
      'skin-images',
    ],
    [
      // Поздняя обёртка автора («approved existing assets») подменяет маскота приветствия мимо img() — и её туда же.
      'if(poseName()===\'welcome\')return `<img class="mascot ${cls||\'\'}" data-pose="welcome" src="${PHASE1_STANDING_MASCOT}"',
      'if(poseName()===\'welcome\')return `<img class="mascot ${cls||\'\'}" data-pose="welcome" src="${(window.JTS_SKIN_IMG||{}).welcome||PHASE1_STANDING_MASCOT}"',
      'skin-images-welcome',
    ],
    // Глифы автора в чипах («◖», «▤», «◎», «✦») — у макета на их месте значки (рисует skin.css) или ничего.
    ['<span class="eyebrow">◖ ${t(\'soundTitle\')}</span>', '<span class="eyebrow jts-chip-sound">${t(\'soundTitle\')}</span>', 'skin-chip-sound'],
    ['<span class="eyebrow">▤ ${esc(st(\'readingTitle\'))}</span>', '<span class="eyebrow">${esc(st(\'readingTitle\'))}</span>', 'skin-chip-reading'],
    ['<span class="eyebrow">◎ ${t(\'speaking\')}</span>', '<span class="eyebrow jts-chip-mic">${t(\'speaking\')}</span>', 'skin-chip-speaking'],
    ['<span class="eyebrow">✦ ${esc(st(\'eyebrow\'))}</span>', '<span class="eyebrow">${esc(st(\'eyebrow\'))}</span>', 'skin-chip-self'],
    [
      '<div class="sound-art" aria-hidden="true">',
      '<div class="sound-art" aria-hidden="true"><img class="jts-sound-art" src="skin/sound.webp" alt="" draggable="false">',
      'skin-sound-art',
    ],
    [
      // «Вопрос 3 из 14» над карточкой, как в макете (у автора — «Вопрос 3 · 2 завершено»).
      '<div class="tiny">${t(\'q\')} ${questionNum} · ${totalAnswered(skill)} ${t(\'completed\').toLowerCase()}</div>',
      '<div class="tiny">${t(\'q\')} ${questionNum} ${lang===\'en\'?\'of\':lang===\'kk\'?\'/\':\'из\'} ${skillCountLimit(skill)}</div>',
      'skin-question-count',
    ],
    [
      // Кнопки вопроса — под карточкой одной строкой «Назад · Не знаю · Далее» и подсказка под ними (макет). Обработчики
      // автор вешает по id — они переезжают вместе с кнопками.
      '<div class="question-bottom"><button class="question-skip" id="skip" ${readonly?\'disabled\':\'\'}>${t(\'dontKnow\')}</button><span class="tiny">${t(\'q\')} ${questionNum}</span></div><div class="question-buttons"><button class="ghostbtn" id="previous">← ${t(\'prev\')}</button><button class="gradbtn" id="nextButton" ${!readonly&&String(draft).trim()===\'\'?\'disabled\':\'\'}>${t(\'next\')} →</button></div></article></div>',
      '</article><div class="question-buttons"><button class="ghostbtn" id="previous">← ${t(\'prev\')}</button><button class="question-skip" id="skip" ${readonly?\'disabled\':\'\'}>${t(\'dontKnow\')}</button><button class="gradbtn" id="nextButton" ${!readonly&&String(draft).trim()===\'\'?\'disabled\':\'\'}>${t(\'next\')} →</button></div><p class="jts-hint">${t(\'hint\')}</p></div>',
      'skin-question-buttons',
    ],
    [
      // Одиночный выбор у макета — строки-радио в две колонки, множественный — пилюли: метка решает, как рисовать.
      '<div class="go-choice-grid" role="group">',
      '<div class="go-choice-grid${single?\' is-single\':\'\'}" role="group">',
      'skin-goals-single',
    ],
    [
      // Группы целей у макета раскрыты все (у автора — только первая).
      '<details class="go-category-group" ${index===0||g.selectedCategories.length===1?\'open\':\'\'}>',
      '<details class="go-category-group" open>',
      'skin-goals-groups-open',
    ],
    [
      '<span>${esc(u(\'step\'))} ${d.step+1} / 6</span>',
      '<span>${esc(u(\'step\'))} ${d.step+1} ${lang===\'en\'?\'of\':lang===\'kk\'?\'/\':\'из\'} 6</span>',
      'skin-goals-step',
    ],
    ['function renderGoals(focusHeading=false){', goalsPanel + 'function renderGoals(focusHeading=false){', 'skin-goals-panel-fn'],
    [
      'chrome(`<section class="goals-shell"><div class="go-topline">',
      'chrome(`<section class="goals-shell"><div class="jts-goals-main"><div class="go-topline">',
      'skin-goals-columns',
    ],
    [
      '<small>${esc(u(\'saveNote\'))}</small></footer></section>`,u(\'goalsLabel\'));',
      '<small>${esc(u(\'saveNote\'))}</small></footer></div>${jtsGoalsPanel()}</section>`,u(\'goalsLabel\'));',
      'skin-goals-panel',
    ],
  ]
}

function count(haystack, needle) {
  let n = 0
  let i = -1
  while ((i = haystack.indexOf(needle, i + 1)) >= 0) n++
  return n
}

/** Накладывает PATCHES; бросает, если кусок не найден или найден не один раз. */
function applyPatches(html, patches = PATCHES) {
  let out = html
  for (const [from, to, name] of patches) {
    const n = count(out, from)
    if (n !== 1) throw new Error(`[build-placement-v16] патч «${name}»: найдено ${n} вхождений вместо одного`)
    out = out.replace(from, () => to)
  }
  return out
}

/** Вставляет прелюдию перед первым <script> страницы. */
function injectPrelude(html) {
  const at = html.indexOf('<script')
  if (at < 0) throw new Error('[build-placement-v16] в странице нет <script>')
  return html.slice(0, at) + PRELUDE + html.slice(at)
}

/** Inter для казахского — в конец <head>, после стилей автора. */
function injectKkFont(html) {
  const at = html.indexOf('</head>')
  if (at < 0) throw new Error('[build-placement-v16] в странице нет </head>')
  return html.slice(0, at) + SKIN_LINK + KK_FONT + html.slice(at)
}

/**
 * Выносит base64 крупнее MIN_EXTRACT_BYTES в файлы. Имя — sha1 содержимого: одинаковые картинки ложатся одним
 * файлом, а повторная сборка не плодит копий. Возвращает { html, files: [{ name, bytes }] }.
 */
function extractMedia(html, minBytes = MIN_EXTRACT_BYTES) {
  const files = new Map()
  const out = html.replace(/data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/g, (whole, mime, b64) => {
    const ext = EXT[mime]
    if (!ext) return whole
    const bytes = Buffer.from(b64, 'base64')
    if (bytes.length < minBytes) return whole
    const name = `${crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 16)}.${ext}`
    files.set(name, bytes)
    return `media/${name}`
  })
  return { html: out, files: [...files].map(([name, bytes]) => ({ name, bytes })) }
}

/** Адреса записей CloudFront → локальные имена (последний сегмент пути). */
function cloudfrontMap(html) {
  const map = new Map()
  for (const url of html.match(CLOUDFRONT_RE) || []) map.set(url, `audio/${url.split('/').pop()}`)
  return map
}

function rewriteUrls(html, map) {
  let out = html
  for (const [from, to] of map) out = out.split(from).join(to)
  return out
}

async function download(url, dest, force) {
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 0) return 'kept'
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 1024) throw new Error(`подозрительно мало: ${buf.length} байт`)
      fs.writeFileSync(dest, buf)
      return 'fetched'
    } catch (e) {
      if (attempt === 3) throw new Error(`[build-placement-v16] не скачать ${url}: ${e.message}`)
    }
  }
  return 'failed'
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const src = args.find((a) => !a.startsWith('--')) || DEFAULT_SRC
  const raw = fs.readFileSync(src, 'utf8')

  const patched = injectKkFont(injectPrelude(applyPatches(raw)))
  const { html: lean, files } = extractMedia(patched)
  const audio = cloudfrontMap(lean)
  const html = rewriteUrls(lean, audio)
  if (/cloudfront\.net/.test(html)) throw new Error('[build-placement-v16] после замены остались адреса CloudFront')

  fs.mkdirSync(path.join(OUT_DIR, 'media'), { recursive: true })
  fs.mkdirSync(path.join(OUT_DIR, 'audio'), { recursive: true })
  // Медиа пересобираем начисто: старые файлы прошлой версии иначе копились бы в репозитории.
  for (const f of fs.readdirSync(path.join(OUT_DIR, 'media'))) fs.unlinkSync(path.join(OUT_DIR, 'media', f))
  for (const f of files) fs.writeFileSync(path.join(OUT_DIR, 'media', f.name), f.bytes)

  const stats = { kept: 0, fetched: 0 }
  for (const [url, local] of audio) {
    stats[await download(url, path.join(OUT_DIR, local), force)]++
  }

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html)
  const kb = (n) => `${Math.round(n / 1024)} КБ`
  console.log(
    `[build-placement-v16] index.html ${kb(Buffer.byteLength(html))} (было ${kb(Buffer.byteLength(raw))}), ` +
      `media ${files.length} файлов ${kb(files.reduce((s, f) => s + f.bytes.length, 0))}, ` +
      `audio ${audio.size} (скачано ${stats.fetched}, уже было ${stats.kept})`,
  )
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message || e)
    process.exit(1)
  })
}

module.exports = { applyPatches, injectPrelude, injectKkFont, extractMedia, cloudfrontMap, rewriteUrls, PATCHES, PRELUDE }
