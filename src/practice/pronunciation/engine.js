'use client'

// Pronunciation World — движок курса произношения, перенесённый из прототипа
// методиста почти дословно (как «Числа» и Prepositions World): главная-карта
// уровней A0–C1, объяснение темы экранами (схемы рта, губ, гласных, слоги,
// ударение, интонация; «Ваша очередь» — запись себя) и игра на слух Echo Gates.
// Экран PronunciationPage монтирует его в Shadow DOM: классы прототипа (.top,
// .btn, .topic, .game) совпадают с глобальными классами сайта.
//
// Тело — пять чанков движка прототипа (core, world, visuals, Echo Gates,
// home/learn/router) в том же порядке и почти без правок. Отличия — только
// связь с приложением (спека 2026-10-28-pronunciation-world-design.md, Часть 3):
// - данные — cfg.bundle с бэкенда (/mobile/pronunciation), а не глобальный
//   реестр, который наполняли чанки данных; записи и картинки — ссылками
//   бакета; объект PRON — свой у каждого монтажа;
// - роутер — переменная HASH вместо адреса страницы, клики по <a href="#/…">
//   перехватываются в корне, адрес раунда (replaceState прототипа) — тоже в HASH;
// - атрибуты data-tr/data-audio, живой регион для чтеца, вспышка портала и
//   слушатели клавиш — на корне раздела, а не на <html>/<body>/document;
// - звук: записи — cfg.playUrl (один <audio> приложения), прогрев —
//   cfg.prefetch, текст без записи — cfg.speak (Soniox, запасной — голос
//   устройства); Web Audio — только тоны ответа (см. P.play);
// - прогресс — cfg.progress()/cfg.onProgress(state) (синк с аккаунтом),
//   перечитывается перед каждым экраном; перевод — sessionStorage вкладки, как
//   у прототипа;
// - шапка без логотипа (у экрана своя шапка приложения), на главной раздела —
//   «назад» из раздела (cfg.onExit); кнопки «Сбросить прогресс» нет: прогресс
//   общий с аккаунтом, а прототип спрашивал «удалить на этом устройстве»;
// - первый ответ на вопрос проверки, букву теста алфавита и эхо раунда —
//   в cfg.onAnswer(ok) (навык «слушание»);
// - запись голоса — только в памяти: прошлая запись отпускается (revoke),
//   как только есть новая, и в destroy();
// - таймеры и кадры — через обёртки ниже, слушатели — через AbortController:
//   destroy() снимает всё, и ничего не сработает на снятом разделе.
// Правило переноса: правка поведения — здесь и в прототипе одновременно, иначе
// следующая заливка прототипа предупредит «движок отличается» уже ложно.

/**
 * @param {HTMLElement} root  корень раздела (в Shadow DOM), внутри — <div id="app">
 * @param {{ bundle: object, progress?: () => object, onProgress?: (state: object) => void,
 *   onAnswer?: (ok: boolean) => void, playUrl: Function, prefetch?: (url: string) => void,
 *   speak: (text: string, opts: { accent?: string, slow?: boolean, onStart: Function, onEnd: Function }) => void,
 *   stopSpeech?: () => void, onExit?: () => void, onRoute?: (hash: string) => void, fast?: boolean }} cfg
 */
export function mountPronunciation(root, cfg) {
const { bundle, progress = () => null, onProgress = () => {}, onAnswer = () => {}, playUrl, prefetch = () => {}, speak, stopSpeech = () => {}, onExit = null, onRoute = () => {} } = cfg
const ROOT = root
let dead = false
const ac = new AbortController()
const on = (target, type, fn, opts = {}) => target.addEventListener(type, fn, { ...opts, signal: ac.signal })
const timers = new Set()
const setTimeout = (fn, ms) => { const id = globalThis.setTimeout(() => { timers.delete(id); if (!dead) fn() }, ms); timers.add(id); return id }
const clearTimeout = (id) => { timers.delete(id); globalThis.clearTimeout(id) }
const requestAnimationFrame = (fn) => globalThis.requestAnimationFrame((ts) => { if (!dead) fn(ts) })
const bus = new EventTarget() // события звука «pron-audio» — свои у монтажа, а не на window
const answered = (ok) => { try { onAnswer(!!ok) } catch (e) { /* навык — не повод ронять игру */ } }
const activeEl = () => { const r = ROOT.getRootNode(); return (r && r.activeElement) || null }
let HASH = '#/'
const navHooks = new Set()
function go(h) {
  h = String(h || '#/')
  if (dead || h === HASH) return
  HASH = h
  for (const f of [...navHooks]) { navHooks.delete(f); f() }
  PRON.route()
  // прокрутку решает экран: прототип был страницей, его игра — fixed на весь экран, у нас — блок в колонке
  try { onRoute(HASH) } catch (e) { /* прокрутка — не повод ронять переход */ }
}
const copy = (x, empty) => (x == null ? empty : JSON.parse(JSON.stringify(x)))
const PRON = {
  levels: copy(bundle.levels, []), v2: copy(bundle.topics, {}), audioFiles: {},
  gameAudio: { ...(bundle.gameAudio || {}) }, ASSETS: { ...(bundle.assets || {}) },
  sounds: copy(bundle.sounds, []), soundLex: copy(bundle.soundLex, {}), featureText: copy(bundle.featureText, {}), soundTips: copy(bundle.soundTips, {}),
  _fast: !!cfg.fast,
};

/* JTS Pronunciation v2 — core: strings, storage, audio, recorder, helpers */
(function () {
  const P = PRON;
  P.T = {
    app: { en: "Pronunciation", ru: "Произношение", kk: "Айтылым" },
    learn: { en: "Learn", ru: "Объяснение", kk: "Түсіндірме" },
    play: { en: "Play", ru: "Игра", kk: "Ойын" },
    next: { en: "Next", ru: "Далее", kk: "Әрі қарай" },
    back: { en: "Back", ru: "Назад", kk: "Артқа" },
    start: { en: "Start", ru: "Начать", kk: "Бастау" },
    close: { en: "Close", ru: "Закрыть", kk: "Жабу" },
    hear: { en: "Hear", ru: "Слушать", kk: "Тыңдау" },
    both: { en: "Hear both", ru: "Оба", kk: "Екеуі" },
    slow: { en: "Slow", ru: "Медленно", kk: "Баяу" },
    continueTo: { en: "Up next", ru: "Дальше", kk: "Келесі" },
    goal: { en: "You will be able to", ru: "Вы научитесь", kk: "Сіз үйренесіз" },
    watch: { en: "Watch out", ru: "Обратите внимание", kk: "Назар аударыңыз" },
    tryit: { en: "Your turn", ru: "Ваша очередь", kk: "Сіздің кезегіңіз" },
    tryText: { en: "Record yourself, then compare with the model.", ru: "Запишите себя и сравните с образцом.", kk: "Өзіңізді жазып, үлгімен салыстырыңыз." },
    record: { en: "Record", ru: "Записать", kk: "Жазу" },
    stop: { en: "Stop", ru: "Стоп", kk: "Тоқтату" },
    mine: { en: "My voice", ru: "Мой голос", kk: "Менің дауысым" },
    model: { en: "Model", ru: "Образец", kk: "Үлгі" },
    yes: { en: "Yes", ru: "Да", kk: "Иә" },
    notYet: { en: "Not yet", ru: "Пока нет", kk: "Әзірге жоқ" },
    selfNote: { en: "Only you judge this part: the app does not score your speech. Your recording stays on this device.", ru: "Эту часть оцениваете только вы: приложение не оценивает речь. Запись остаётся на устройстве.", kk: "Бұл бөлікті тек сіз бағалайсыз: қолданба сөйлеуіңізді бағаламайды. Жазба осы құрылғыда қалады." },
    tryYes: { en: "Great. Keep that sound in the game.", ru: "Отлично. Сохраняйте этот звук в игре.", kk: "Керемет. Ойында да осылай айтыңыз." },
    tryNo: { en: "Play the model slowly, copy it, and record again. It often takes a few tries.", ru: "Послушайте образец медленно, повторите и запишите снова. Обычно нужно несколько попыток.", kk: "Үлгіні баяу тыңдап, қайталап, қайта жазыңыз. Әдетте бірнеше рет керек." },
    noMic: { en: "No microphone here. Say it aloud after the model instead.", ru: "Микрофон недоступен. Просто повторите вслух за образцом.", kk: "Микрофон жоқ. Үлгіден кейін дауыстап қайталаңыз." },
    letsPractise: { en: "Let's practise!", ru: "Давайте практиковаться!", kk: "Жаттығайық!" },
    enterWorld: { en: "Enter the Sound World", ru: "Войти в Мир звуков", kk: "Дыбыстар әлеміне кіру" },
    explDone: { en: "Explanation complete", ru: "Объяснение завершено", kk: "Түсіндірме аяқталды" },
    trHint: { en: "Show a translation under the English text", ru: "Показать перевод под английским текстом", kk: "Ағылшын мәтінінің астынан аударманы көрсету" },
    playing: { en: "Playing", ru: "Звучит", kk: "Ойнатылуда" },
    playGame: { en: "Play the game", ru: "Играть", kk: "Ойнау" },
    learnedIt: { en: "You have the idea. Now train your ear.", ru: "Идея понятна. Теперь тренируйте слух.", kk: "Түсіндіңіз. Енді құлағыңызды жаттықтырыңыз." },
    round: { en: "Round", ru: "Раунд", kk: "Раунд" },
    howTitle: { en: "How to play", ru: "Как играть", kk: "Қалай ойнау керек" },
    how1: { en: "Each glowing echo says a word. Tap it to hear it again.", ru: "Каждое светящееся эхо произносит слово. Нажмите на него, чтобы услышать снова.", kk: "Әр жарқыраған жаңғырық бір сөз айтады. Қайта есту үшін оны басыңыз." },
    how2: { en: "Send it through the gate that matches the sound: tap the gate, or drag the echo onto it.", ru: "Отправьте его в ворота с тем же звуком: нажмите на ворота или перетащите эхо.", kk: "Оны сол дыбысқа сәйкес қақпаға жіберіңіз: қақпаны басыңыз немесе жаңғырықты сүйреңіз." },
    how3: { en: "Wrong gate? The echo floats back up and says its word again: just try another gate. Tap “Why?” when you want an explanation.", ru: "Не те ворота? Эхо поднимется и повторит слово — просто попробуйте другие ворота. Нажмите «Why?», если нужно объяснение.", kk: "Қате қақпа ма? Жаңғырық жоғары көтеріліп, сөзді қайталайды — басқа қақпаны таңдап көріңіз. Түсіндірме керек болса, «Why?» батырмасын басыңыз." },
    tryAgain: { en: "Listen again!", ru: "Послушайте ещё раз!", kk: "Тағы тыңдаңыз!" },
    tryAgainLive: { en: "Not this gate. Listen again and try another one.", ru: "Не эти ворота. Послушайте ещё раз и выберите другие.", kk: "Бұл қақпа емес. Тағы тыңдап, басқасын таңдаңыз." },
    whyBtn: { en: "Why?", ru: "Почему?", kk: "Неге?" },
    whyLabel: { en: "Why was that gate wrong? Show the explanation", ru: "Почему ворота не те? Показать объяснение", kk: "Неге қақпа қате? Түсіндірмені көрсету" },
    how4: { en: "Tap 🔊 on a gate to hear its example sound.", ru: "Нажмите 🔊 на воротах, чтобы услышать пример звука.", kk: "Қақпадағы 🔊 белгісін басып, дыбыс үлгісін тыңдаңыз." },
    gotIt: { en: "Let's play", ru: "Играем", kk: "Ойнайық" },
    youHeard: { en: "You heard", ru: "Звучало", kk: "Естілген" },
    goesTo: { en: "It goes to", ru: "Это ворота", kk: "Бұл қақпа" },
    yourGate: { en: "Your gate", ru: "Ваши ворота", kk: "Сіздің қақпаңыз" },
    goOn: { en: "Continue", ru: "Продолжить", kk: "Жалғастыру" },
    missed: { en: "Too slow — it will come back.", ru: "Не успели — эхо вернётся.", kk: "Үлгермедіңіз — жаңғырық қайта келеді." },
    pause: { en: "Pause", ru: "Пауза", kk: "Үзіліс" },
    paused: { en: "Paused", ru: "Пауза", kk: "Үзіліс" },
    resume: { en: "Resume", ru: "Продолжить", kk: "Жалғастыру" },
    quit: { en: "Leave game", ru: "Выйти", kk: "Шығу" },
    roundDone: { en: "Round complete", ru: "Раунд пройден", kk: "Раунд аяқталды" },
    firstTry: { en: "right first time", ru: "верно с первого раза", kk: "бірінші реттен дұрыс" },
    starWon: { en: "Star earned: 85% or more right first time.", ru: "Звезда получена: 85% и больше с первого раза.", kk: "Жұлдыз алынды: бірінші реттен 85% не одан көп." },
    starHint: { en: "Get 85% right first time to earn the star. Play again — new order, new voice.", ru: "Наберите 85% с первого раза, чтобы получить звезду. Сыграйте ещё — новый порядок, новый голос.", kk: "Жұлдыз үшін бірінші реттен 85% жинаңыз. Қайта ойнаңыз — жаңа рет, жаңа дауыс." },
    mixups: { en: "Your mix-ups — hear them again", ru: "Ваши ошибки — послушайте ещё раз", kk: "Шатастырғандарыңыз — қайта тыңдаңыз" },
    again: { en: "Play again", ru: "Ещё раз", kk: "Қайта ойнау" },
    nextRound: { en: "Next round", ru: "Следующий раунд", kk: "Келесі раунд" },
    toTopics: { en: "All topics", ru: "Все темы", kk: "Барлық тақырып" },
    topicDone: { en: "Topic complete!", ru: "Тема пройдена!", kk: "Тақырып аяқталды!" },
    nextTopic: { en: "Next topic", ru: "Следующая тема", kk: "Келесі тақырып" },
    reviewLearn: { en: "Review the explanation", ru: "Повторить объяснение", kk: "Түсіндірмені қайталау" },
    locked: { en: "Finish the previous round first", ru: "Сначала пройдите предыдущий раунд", kk: "Алдымен алдыңғы раундты өтіңіз" },
    synth: { en: "Audio: synthetic British voice (to be replaced by recordings).", ru: "Звук: синтезированный британский голос (будет заменён записями дикторов).", kk: "Дыбыс: синтезделген британ дауысы (кейін диктор жазбасымен ауыстырылады)." },
    noAudioShort: { en: "No sound played. Check the volume or open the page in Chrome, Edge or Safari.", ru: "Звук не воспроизвёлся. Проверьте громкость или откройте страницу в Chrome, Edge или Safari.", kk: "Дыбыс шықпады. Дыбыс деңгейін тексеріңіз немесе бетті Chrome, Edge не Safari-де ашыңыз." },
    noVoice: { en: "This browser has no English voice, so audio cannot play. Open the section in Chrome, Edge or Safari.", ru: "В этом браузере нет английского голоса. Откройте раздел в Chrome, Edge или Safari.", kk: "Бұл браузерде ағылшын дауысы жоқ. Бөлімді Chrome, Edge немесе Safari-де ашыңыз." },
    ttsNote: { en: "The synthetic voice may not make the tune clearly: the marks in the text show the answer.", ru: "Синтезированный голос может передать мелодию неточно: ответ подсказывают пометки в тексте.", kk: "Синтезделген дауыс әуенді дәл бермеуі мүмкін: жауапты мәтіндегі белгілер көрсетеді." },
    british: { en: "British", ru: "Британский", kk: "Британдық" },
    american: { en: "American", ru: "Американский", kk: "Америкалық" },
    reset: { en: "Reset my progress", ru: "Сбросить прогресс", kk: "Прогресті өшіру" },
    resetQ: { en: "Delete all progress on this device?", ru: "Удалить весь прогресс на этом устройстве?", kk: "Осы құрылғыдағы прогресті өшіру керек пе?" },
    lang: { en: "Explanations also in", ru: "Пояснения также на", kk: "Түсіндірме тілі" },
    topics: { en: "topics", ru: "тем", kk: "тақырып" },
    stars: { en: "stars", ru: "звёзд", kk: "жұлдыз" },
    terms: { en: "Words you need", ru: "Нужные термины", kk: "Қажетті терминдер" },
    inLesson: { en: "In this lesson", ru: "В этом уроке", kk: "Осы сабақта" },
    howTo: { en: "How to do it", ru: "Как это сделать", kk: "Қалай жасау керек" },
    listenFor: { en: "Listen for", ru: "Что слушать", kk: "Неге құлақ салу керек" },
    note_exception: { en: "Exception", ru: "Исключение", kk: "Ерекшелік" },
    note_mistake: { en: "Common mistake", ru: "Частая ошибка", kk: "Жиі қате" },
    note_tip: { en: "Tip", ru: "Совет", kk: "Кеңес" },
    note_accent: { en: "British and American", ru: "Британский и американский", kk: "Британдық және америкалық" },
    mistakes: { en: "Common mistakes", ru: "Частые ошибки", kk: "Жиі кездесетін қателер" },
    mistIntro: { en: "Learners often make these mistakes. Each one has a fix you can do alone.", ru: "Учащиеся часто делают эти ошибки. Каждую можно исправить самостоятельно.", kk: "Үйренушілер осы қателерді жиі жібереді. Әрқайсысын өз бетіңізше түзете аласыз." },
    mistake: { en: "Mistake", ru: "Ошибка", kk: "Қате" },
    fixIt: { en: "Fix it yourself", ru: "Как исправить самому", kk: "Өзіңіз қалай түзетесіз" },
    check: { en: "Check yourself", ru: "Проверьте себя", kk: "Өзіңізді тексеріңіз" },
    checkIntro: { en: "A few quick questions before the game. If you get one wrong, try another answer and read why.", ru: "Несколько коротких вопросов перед игрой. Если ошиблись, выберите другой ответ и прочитайте объяснение.", kk: "Ойын алдында бірнеше қысқа сұрақ. Қателессеңіз, басқа жауапты таңдап, түсіндірмені оқыңыз." },
    question: { en: "Question", ru: "Вопрос", kk: "Сұрақ" },
    right: { en: "Right!", ru: "Верно!", kk: "Дұрыс!" },
    notQuite: { en: "Not quite.", ru: "Не совсем.", kk: "Дәл емес." },
    tryOther: { en: "Listen again and try another answer.", ru: "Послушайте ещё раз и выберите другой ответ.", kk: "Қайта тыңдап, басқа жауапты таңдаңыз." },
    nextQ: { en: "Next question", ru: "Следующий вопрос", kk: "Келесі сұрақ" },
    results: { en: "See my result", ru: "Мой результат", kk: "Нәтижем" },
    checkGood: { en: "All right first time. You are ready for the game.", ru: "Всё верно с первого раза. Вы готовы к игре.", kk: "Бәрі бірінші реттен дұрыс. Ойынға дайынсыз." },
    checkReview: { en: "Read the sections again for the questions you missed, or go to the game and learn by playing.", ru: "Перечитайте разделы по вопросам с ошибками или переходите к игре и учитесь в процессе.", kk: "Қате кеткен сұрақтар бойынша бөлімдерді қайта оқыңыз немесе ойынға өтіп, ойнай жүріп үйреніңіз." },
    checkAgain: { en: "Answer again", ru: "Ответить заново", kk: "Қайта жауап беру" },
    strong: { en: "strong", ru: "сильная", kk: "күшті" },
    weak: { en: "weak", ru: "слабая", kk: "әлсіз" },
    noUS: { en: "This device has no American English voice, so American examples will be played with a British voice. Use another browser (Chrome or Edge usually have one) for this part.", ru: "На этом устройстве нет американского голоса, поэтому американские примеры прозвучат британским голосом. Для этой части откройте другой браузер (обычно он есть в Chrome или Edge).", kk: "Бұл құрылғыда америкалық дауыс жоқ, сондықтан америкалық мысалдар британ дауысымен айтылады. Бұл бөлік үшін басқа браузерді ашыңыз (әдетте Chrome не Edge-те бар)." },
    world: { en: "Pronunciation World", ru: "Мир произношения", kk: "Айтылым әлемі" },
    worldKick: { en: "Just To Study · English pronunciation A0–C1", ru: "Just To Study · английское произношение A0–C1", kk: "Just To Study · ағылшын айтылымы A0–C1" },
    worldLead: { en: "Every topic has two steps: learn how the sounds work in the Sound Lab, then train your ear at the Echo Gates.", ru: "В каждой теме два шага: разберитесь, как устроены звуки, в Звуковой лаборатории, затем тренируйте слух у Эхо-ворот.", kk: "Әр тақырып екі қадамнан тұрады: Дыбыс зертханасында дыбыстардың қалай жұмыс істейтінін түсініп, сосын Жаңғырық қақпаларында құлағыңызды жаттықтырыңыз." },
    twoStages: { en: "Two steps", ru: "Два шага", kk: "Екі қадам" },
    labName: { en: "Sound Lab", ru: "Звуковая лаборатория", kk: "Дыбыс зертханасы" },
    stage2: { en: "Step 2 · Echo Gates", ru: "Шаг 2 · Эхо-ворота", kk: "2-қадам · Жаңғырық қақпалары" },
    regions: { en: "Regions of the world", ru: "Области мира", kk: "Әлем аймақтары" },
    seen: { en: "explanation done", ru: "объяснение пройдено", kk: "түсіндірме өтілді" },
    guideHome: { en: "Pick a topic. Read the explanation first, then play the game. I'll be with you in the lab.", ru: "Выберите тему. Сначала прочитайте объяснение, затем играйте. Я буду с вами в лаборатории.", kk: "Тақырыпты таңдаңыз. Алдымен түсіндірмені оқып, сосын ойнаңыз. Мен зертханада бірге боламын." },
    streak3: { en: "Three in a row!", ru: "Три подряд!", kk: "Қатарынан үшеу!" },
    streak5: { en: "Five in a row — brilliant ears!", ru: "Пять подряд — отличный слух!", kk: "Қатарынан бесеу — керемет есту!" },
    wrongCoach: { en: "Listen to both sounds once more. The difference is small, and your ear is learning it.", ru: "Послушайте оба звука ещё раз. Разница маленькая, но ваш слух её запоминает.", kk: "Екі дыбысты тағы бір рет тыңдаңыз. Айырмашылық кішкентай, бірақ құлағыңыз оны үйреніп жатыр." },
    roundCoach: { en: "Listen to each gate first. Then send every echo to the gate that sounds the same.", ru: "Сначала послушайте каждые ворота. Потом отправляйте каждое эхо в ворота с тем же звучанием.", kk: "Алдымен әр қақпаны тыңдаңыз. Сосын әр жаңғырықты дыбысы бірдей қақпаға жіберіңіз." },
    remember: { en: "Remember", ru: "Запомните", kk: "Есте сақтаңыз" }
  };

  // ---------- storage ----------
  // Порт: прогресс — общее хранилище «Практики» (cfg.progress читает, cfg.onProgress пишет; синк с аккаунтом), а не
  // localStorage прототипа (jts-pron-v2). Форма та же, без tr: перевод живёт только во вкладке.
  const blank = () => ({ tr: "en", learned: {}, rounds: {}, tutorial: false, level: null, last: null });
  const load = () => { try { const s = progress(); return s && s.rounds ? Object.assign(blank(), s) : blank(); } catch (e) { return blank(); } };
  P.state = load();
  // Every visit opens in English. A translation the student turned on is kept only for this browser tab (so moving between
  // screens or reloading keeps it), never restored from earlier visits — older versions stored a required language choice
  // under the same key, and that must not open a translation by itself.
  const TRK = "jts-pron-tr";
  P.state.tr = (() => { try { const v = sessionStorage.getItem(TRK); return v === "ru" || v === "kk" ? v : "en"; } catch (e) { return "en"; } })();
  try { ROOT.dataset.tr = P.state.tr; } catch (e) {}
  P.save = () => { try { const s = Object.assign({}, P.state); delete s.tr; onProgress(s); } catch (e) {} };
  // Порт: роутер перечитывает прогресс перед каждым экраном — снимок сервера приезжает позже первого кадра.
  P.reload = () => { const tr = P.state.tr; P.state = load(); P.state.tr = tr; };
  P.reset = () => { const tr = P.state.tr; P.state = blank(); P.state.tr = tr; P.save(); };
  P.tx = (o) => (o == null ? "" : typeof o === "string" ? o : o.en || "");
  P.t = (k) => P.tx(P.T[k]);
  P.sup = () => ""; // v5: no automatic translation line — see P.trs / P.setTr
  P.esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // English is always shown first. Russian and Kazakh translations are rendered too, hidden, and revealed instantly by the
  // Қазақша / Русский buttons (html[data-tr]), so switching never re-renders the screen or loses the student's progress.
  // Translations are optional and only ever appear inside an explanation (an element with class "xpl"), right after the
  // English, when the student presses Қазақша or Русский there. The interface itself (menus, buttons, titles, messages) stays English.
  P.trs = (o, tag = "span", cls = "sup") => !o || typeof o !== "object" ? "" : ["ru", "kk"].filter((k) => o[k]).map((k) => `<${tag} class="${cls} tr tr-${k}" lang="${k}">${P.ipaWrap(P.esc(o[k]))}</${tag}>`).join("");
  // phonetic transcriptions inside running text (/ʃɪp/, /iː/) get the IPA font so every symbol comes from one typeface
  const IPA_IN = /(^|[\s(«"“'—–-])\/((?=[^\/<>\n]*[a-zæðŋθɐ-˿̀-ͯ‿])[^\s\/<>\n](?:[^\/<>\n]{0,38}[^\s\/<>\n])?)\/(?=$|[\s.,;:!?)»"”'—–-])/g;
  P.ipaWrap = (html) => String(html).replace(IPA_IN, (m, pre, inner) => `${pre}<span class="ipa">/${inner}/</span>`);
  P.en = (o, cls = "") => `<p class="en ${cls}" lang="en">${P.ipaWrap(P.l1(P.esc(P.tx(o))))}</p>`; // English only (interface text)
  // Cyrillic letters quoted inside the English text (contrast with Russian/Kazakh sounds) get their own lang for screen readers
  P.l1 = (html) => String(html).replace(/[\u0400-\u04FF][\u0400-\u04FF\u0301-]*/g, (m) => `<span class="l1" lang="${/[әғқңөұүһіӘҒҚҢӨҰҮҺІ]/.test(m) ? "kk" : "ru"}">${m}</span>`);
  P.bi = (o, cls = "") => `<p class="en ${cls}" lang="en">${P.ipaWrap(P.l1(P.esc(o && o.en)))}</p>${P.trs(o, "p", "sup " + cls)}`;
  // Showing or hiding a translation changes the height of the text, so the page is held still around what the student is
  // looking at: the button they pressed if it is on screen, otherwise the first English line in view (the browser's own
  // scroll anchoring is switched off for this moment because it can jump to an unrelated place).
  const onScreen = (e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
  P.setTr = (v, from) => { v = v === "ru" || v === "kk" ? v : "en"; P.state.tr = v; try { sessionStorage.setItem(TRK, v); } catch (e) {}
    const root = ROOT;
    const keep = from && root.contains(from) && onScreen(from) ? from : [...ROOT.querySelectorAll(".xpl p.en, .xpl :is(h1,h2,h3), .xpl .trbar")].find((e) => onScreen(e) && e.getBoundingClientRect().top >= 0);
    const t0 = keep ? keep.getBoundingClientRect().top : 0, oa = root.style.overflowAnchor; root.style.overflowAnchor = "none";
    root.dataset.tr = v;
    if (keep) { const d = keep.getBoundingClientRect().top - t0; if (Math.abs(d) > 1) window.scrollBy(0, d); }
    root.style.overflowAnchor = oa;
    ROOT.querySelectorAll("[data-trbtn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.trbtn === v)));
    if (P.announce) P.announce(v === "kk" ? "Kazakh translation shown" : v === "ru" ? "Russian translation shown" : "Translation hidden"); };
  // the translation control that sits at the top of an explanation (never in the site header)
  P.trBar = (cls = "") => `<div class="trbar ${cls}" role="group" aria-label="${/trbar-top/.test(cls) ? "Translate the explanations" : "Translate this explanation"}" title="${P.esc(P.T.trHint.en)}"><span class="tr-cap" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 5h10M8 3v2m3 0c-1 4-4 7-8 9m3-6c1 2 3 4 6 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 21l4.5-10L21 21m-7.5-3h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="tr-lbl">Translate</span></span>${[["kk", "Қазақша"], ["ru", "Русский"]].map(([k, l]) => `<button type="button" class="trb" data-trbtn="${k}" lang="${k}" aria-pressed="${P.state.tr === k}">${l}</button>`).join("")}</div>`;
  P.bindTrBar = (root = ROOT) => root.querySelectorAll("[data-trbtn]").forEach((b) => (b.onclick = () => P.setTr(P.state.tr === b.dataset.trbtn ? "en" : b.dataset.trbtn, b)));

  // round results: P.state.rounds[id] = [{done, best, plays}, ...]
  P.rs = (id) => (P.state.rounds[id] = P.state.rounds[id] || [{}, {}, {}]);
  P.stars = (id) => P.rs(id).filter((r) => r.best >= 0.85).length;
  P.topicDone = (id) => P.rs(id).every((r) => r.done);

  // ---------- topics ----------
  P.topicsList = () => {
    const out = [];
    for (const L of P.levels) for (const M of L.modules) {
      const T = P.v2[M.id]; if (!T) continue;
      out.push(Object.assign({}, T, { id: M.id, level: L.id, title: M.title, title_t: M.title_t, outcome: M.outcome, sounds: M.sounds || [], lex: Object.assign({}, M.lex || {}, T.lex || {}) }));
    }
    return out;
  };
  const NO_IPA = new Set([]); // v3: IPA shown from A0.1 (A0.1 explains the slashes)
  P.noIpa = (T) => !!(T && NO_IPA.has(T.id));
  P.ipa = (T, w) => (P.noIpa(T) ? "" : (T && T.lex && T.lex[w]) || (P.soundLex && P.soundLex[w]) || "");

  // ---------- audio: recorded file if provided, else synthetic voice ----------
  // Порт: запись — общим <audio> приложения (cfg.playUrl, src/lib/speech.js), текст без записи — cfg.speak (Soniox
  // через /api/tts, запасной — голос устройства). Прототип читал записи fetch + decodeAudioData в Web Audio и говорил
  // speechSynthesis: у бакета MinIO нет CORS — fetch записи не прочитал бы, а свой источник звука на iPhone молчит без
  // жеста (разрешение живёт на одном элементе приложения). Web Audio осталось только тонам ответа (P.tone).
  P.audioFiles = P.audioFiles || {};
  P.audioId = (text, accent) => (accent === "GA" ? "ga-" : "") + String(text).toLowerCase().replace(/[^a-z0-9']+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  // голос есть всегда: Soniox говорит и британским, и американским голосом, устройство — запасной
  P.voiceCount = () => 1;
  P.hasUS = () => true;
  P.hasAudio = () => true;
  let SEQ = 0;
  P.stopAudio = () => { SEQ++; stopNow(); };
  const stopNow = () => { try { stopSpeech(); } catch (e) {} [...pending].forEach((f) => f()); };
  P.gameAudio = P.gameAudio || {};          // id → ссылка на запись (бандл бэкенда)
  let actx0 = null; const pending = new Set();
  P.actx = () => { if (!actx0) { try { actx0 = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return actx0; };
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {} // iPhone: play even when the ring switch is on silent
  const unlock = () => { const ac = P.actx(); if (ac && ac.state === "suspended") ac.resume().catch(() => {}); };
  ["pointerdown", "keydown", "touchend"].forEach((ev) => on(ROOT, ev, unlock, { capture: true, passive: true }));
  // прогрев: записи экрана — в HTTP-кэш браузера заранее, чтобы первое нажатие зазвучало сразу
  P.preloadGameAudio = (ids) => ids.forEach((id) => { if (P.gameAudio[id]) prefetch(P.gameAudio[id]); });
  // opts: {accent:'GA', slow, voice:int, keep:bool (don't cancel current)}
  // labelled lexicon keys ("record (noun)") are spoken in a short cue phrase that forces the intended reading
  const CUE = { noun: (w) => (/^[aeiou]/i.test(w) ? "an " : "a ") + w, verb: (w) => "to " + w, adjective: (w) => (w === "live" ? "live music" : w),
    present: (w) => (w === "read" ? "I read every day." : w), past: (w) => (w === "read" ? "I read it yesterday." : w) };
  P.cue = (text) => { const m = String(text).match(/^(.+?)\s*\((noun|verb|adjective|present|past|n|v|adj)\)\s*$/); if (!m) return text;
    const k = { n: "noun", v: "verb", adj: "adjective" }[m[2]] || m[2]; return CUE[k](m[1]); };
  // playback events: visuals follow the real audio ("load" → "start" → "end"), never a timer of their own
  let PID = 0, live = 0;
  const emit = (type, d) => {
    if (type === "start") live++; if (type === "end" && d.started) live = Math.max(0, live - 1);
    try { ROOT.dataset.audio = live ? "on" : "off"; bus.dispatchEvent(new CustomEvent("pron-audio", { detail: Object.assign({ type }, d) })); } catch (e) {}
  };
  P.play = (text, opts = {}) => new Promise((resolve0) => {
    const pid = ++PID; let started = false;
    const start = () => { if (started || fin0) return; started = true; emit("start", { pid, text }); if (opts.onstart) try { opts.onstart(); } catch (e) {} };
    let fin0 = false; const resolve = () => { if (fin0) return; fin0 = true; emit("end", { pid, text, started }); resolve0(started); };
    if (!text) return resolve();
    text = P.cue(text);
    if (!opts.keep) { if (!opts._seq) SEQ++; stopNow(); }
    emit("load", { pid, text });
    const id = P.audioId(text, opts.accent);
    // natural recordings (whole app since v5.4): the "Slow" button has its own slowly spoken clip ("slow-<id>")
    const sid = opts.slow && P.gameAudio["slow-" + id] ? "slow-" + id : id;
    const cancel = () => resolve(); pending.add(cancel);
    // звук, который начался и так и не кончился (встал поток), не держит очередь эха вечно
    let guard = null;
    const end = () => { clearTimeout(guard); pending.delete(cancel); resolve(); };
    const begin = () => { start(); clearTimeout(guard); guard = setTimeout(end, 25000); };
    const voice = () => speak(String(text).replace(/[↘↗|]/g, " "), { accent: opts.accent, slow: !!opts.slow, onStart: begin, onEnd: end });
    if (!opts.noFile && P.gameAudio[sid]) {
      // missing or broken file: say it with the voice instead of staying silent
      playUrl(P.gameAudio[sid], { onStart: begin, onEnd: end, onCancel: end, onFail: () => { if (!fin0) voice(); } });
      return;
    }
    voice();
  });
  // tie a control to playback: .loading until sound starts, .playing while it sounds, .err (and a spoken-for-screen-readers note) if nothing played
  let owner = null, tokN = 0, ownTok = 0;
  const clear = (b) => { b.classList.remove("loading", "playing"); b.removeAttribute("aria-busy"); const g = b.closest("[data-sound-host]"); if (g) g.classList.remove("sounding"); };
  P.announce = (msg) => { let r = ROOT.querySelector("#sr-live"); if (!r) { r = document.createElement("div"); r.id = "sr-live"; r.className = "vh"; r.setAttribute("aria-live", "polite"); ROOT.appendChild(r); } r.textContent = ""; setTimeout(() => (r.textContent = msg), 30); };
  P.sound = (btn, fn) => {
    if (!btn) return Promise.resolve(fn());
    if (owner && owner !== btn) clear(owner);
    const tok = ++tokN; owner = btn; ownTok = tok; clear(btn); btn.classList.remove("err"); btn.classList.add("loading"); btn.setAttribute("aria-busy", "true");
    let started = false;
    const on = (ev) => { if (ownTok !== tok || ev.detail.type !== "start") return; started = true; btn.classList.remove("loading"); btn.classList.add("playing"); const g = btn.closest("[data-sound-host]"); if (g) g.classList.add("sounding"); };
    bus.addEventListener("pron-audio", on);
    const done = () => {
      bus.removeEventListener("pron-audio", on);
      const latest = ownTok === tok; // a newer press (same or other control) took over: this one is simply superseded, not an error
      if (latest) { clear(btn); owner = null; }
      if (latest && !started && !btn.dataset.quiet) { btn.classList.add("err"); P.announce(P.tx(P.T.noAudioShort)); setTimeout(() => btn.classList.remove("err"), 1800); }
    };
    return Promise.resolve(fn()).then((r) => { done(); return r; }, (er) => { done(); throw er; });
  };
  // a sequence stops as soon as anything else is played or audio is stopped
  P.playSeq = async (list, opts = {}, gap = 450) => { const my = ++SEQ; let any = false;
    for (let i = 0; i < list.length; i++) { if (SEQ !== my) break; any = (await P.play(list[i], Object.assign({}, opts, { _seq: true }))) || any;
      if (i < list.length - 1) await new Promise((r) => setTimeout(r, gap)); }
    return any; };

  // short UI tones (Web Audio) — feedback that never masks speech for long
  let actx = null;
  P.tone = (kind) => {
    try {
      actx = (P.actx && P.actx()) || actx || new (window.AudioContext || window.webkitAudioContext)(); // one shared context (unlocked on iOS by the first tap)
      if (actx.state === "suspended") actx.resume().catch(() => {});
      const now = actx.currentTime; const g = actx.createGain(); g.connect(actx.destination);
      const notes = kind === "good" ? [660, 990] : kind === "bad" ? [220, 185] : kind === "soft" ? [494, 415] : kind === "win" ? [523, 659, 784, 1047] : [440];
      g.gain.setValueAtTime(0.0001, now);
      notes.forEach((f, i) => { const o = actx.createOscillator(); o.type = kind === "bad" ? "triangle" : "sine"; o.frequency.value = f; o.connect(g); o.start(now + i * 0.09); o.stop(now + i * 0.09 + 0.16); });
      g.gain.exponentialRampToValueAtTime(kind === "soft" ? 0.035 : 0.09, now + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12 + notes.length * 0.09); // "soft": a quiet two-note hint for a wrong gate
    } catch (e) {}
  };

  // ---------- recorder (memory only) ----------
  P.rec = {
    stream: null, ok: !!(navigator.mediaDevices && window.MediaRecorder),
    async start() {
      if (!this.ok) throw new Error("unsupported");
      this.cancel();
      this.stream = this.stream || await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = []; const r = new MediaRecorder(this.stream); this.r = r;
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      // запись — только в памяти вкладки: прошлую отпускаем, как только есть новая (и в destroy)
      this.done = new Promise((res) => (r.onstop = () => { this.release(); if (r._discard) return res(null); this.forget(); this.url = URL.createObjectURL(new Blob(chunks, { type: r.mimeType || "audio/webm" })); res(this.url); }));
      r.start(); this.timer = setTimeout(() => this.stop(), 8000); return this.done;
    },
    stop() { clearTimeout(this.timer); if (this.r && this.r.state === "recording") this.r.stop(); return this.done; },
    // the microphone is switched off after every recording and when the learner leaves the screen
    release() { try { if (this.stream) this.stream.getTracks().forEach((t) => t.stop()); } catch (e) {} this.stream = null; },
    cancel() { clearTimeout(this.timer); if (this.r && this.r.state === "recording") { this.r._discard = true; this.r.stop(); } else this.release(); },
    forget() { try { if (this.url) URL.revokeObjectURL(this.url); } catch (e) {} this.url = null; },
    play(url) { P.stopAudio(); return new Promise((res) => { const fin = () => res(); playUrl(url, { onEnd: fin, onCancel: fin, onFail: fin }); }); }
  };
  on(window, "pagehide", () => { try { P.rec.stream && P.rec.stream.getTracks().forEach((t) => t.stop()); } catch (e) {} });

  P.shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  P.icon = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 6v13" stroke="currentColor" stroke-width="1.8"/></svg>',
    game: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c4.8 0 8.5 3.5 8.5 8s-3.7 8-8.5 8H4.6c-.8 0-1.2-1-.6-1.5l1.6-1.4c.4-.4.5-1 .1-1.4A7.7 7.7 0 0 1 3.5 11.5c0-4.5 3.7-8 8.5-8z" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M8.5 11.6c1.1-1.6 2.2-1.6 3.3 0s2.2 1.6 3.3 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.6 5.6 6.1.7-4.5 4.2 1.2 6.1L12 16.8 6.6 19.8l1.2-6.1-4.5-4.2 6.1-.7z" fill="currentColor"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3.5" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>'
  };
})();
;
/* JTS Pronunciation — "Pronunciation World" layer: brand marks, regions, mascots, floating symbols, transitions.
   Images come from P.ASSETS (filled by build2.py: data: URIs, or relative files with --external-assets). */
(function () {
  const P = PRON, e = P.esc;
  P.ASSETS = P.ASSETS || {};
  // embedded images arrive as data: URIs; turn them into short blob: URLs once, so the DOM never carries megabytes of text
  try {
    for (const [k, v] of Object.entries(P.ASSETS)) {
      const m = /^data:([^;]+);base64,(.*)$/.exec(v || ""); if (!m) continue;
      const bin = atob(m[2]); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      P.ASSETS[k] = URL.createObjectURL(new Blob([u8], { type: m[1] }));
    }
  } catch (err) { /* keep data: URIs */ }
  P.asset = (name) => P.ASSETS[name] || "";
  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  P.reducedMotion = reduced;
  // SVG (SMIL) teaching animations are paused under reduced motion; the first frame still shows the idea
  P.calmSvg = (root) => { if (!reduced()) return; (root || ROOT).querySelectorAll("svg").forEach((s) => { try { s.pauseAnimations && s.pauseAnimations(); s.setCurrentTime && s.setCurrentTime(0); } catch (e) {} }); };

  // ---------------------------------------------------------------- brand
  // logo paths are injected by the build from brand/logo.svg (vector from the JTS Visual Guideline)
  P.logo = (cls = "") => (P.LOGO_SVG ? P.LOGO_SVG.replace("<svg ", `<svg class="logo ${cls}" `) : `<b class="logo-txt ${cls}">just to study</b>`);
  // the brand symbol: speech bubble (round, tail bottom-left)
  P.BUBBLE_PATH = "M 422.8 404.6 L 307.8 404.6 C 302 404.6 299.3 397.4 303.7 393.5 L 326.9 373.4 C 330.9 369.8 331.2 363.8 327.9 359.6 C 311.9 339.5 303.6 315.9 303.6 288.8 C 303.6 256.5 315.2 229.2 337.5 206.8 C 360.7 184.5 388.9 173.7 422.8 173.7 C 455 173.7 483.1 184.5 505.5 206.8 C 528.7 229.2 540.3 256.5 540.3 288.8 C 540.3 321 528.7 348.3 505.5 370.6 C 483.1 393.4 455 404.6 422.8 404.6 Z";
  P.bubbleSvg = (cls = "", inner = "") => `<svg class="bubble ${cls}" viewBox="299 173 242 232" aria-hidden="true"><path d="${P.BUBBLE_PATH}"/>${inner}</svg>`;

  // ---------------------------------------------------------------- regions (one per CEFR level)
  P.REGIONS = {
    A0: { img: "w-a0", name: { en: "Alphabet Garden", ru: "Сад алфавита", kk: "Әліпби бағы" },
      line: { en: "Letters, their names and their sounds.", ru: "Буквы, их названия и звуки.", kk: "Әріптер, олардың атаулары мен дыбыстары." } },
    A1: { img: "w-a1", name: { en: "Sound Springs", ru: "Звуковые источники", kk: "Дыбыс бұлақтары" },
      line: { en: "Vowels, consonants, endings and first stress.", ru: "Гласные, согласные, окончания и первое ударение.", kk: "Дауыстылар, дауыссыздар, жалғаулар және алғашқы екпін." } },
    A2: { img: "w-a2", name: { en: "Syllable Steps", ru: "Ступени слогов", kk: "Буын баспалдақтары" },
      line: { en: "Strong and weak beats, clusters, spelling and linking.", ru: "Сильные и слабые доли, сочетания согласных, написание и связывание.", kk: "Күшті және әлсіз буындар, дауыссыз тіркестері, жазылу және байланыстыру." } },
    B1: { img: "w-b1", name: { en: "Rhythm River", ru: "Река ритма", kk: "Ырғақ өзені" },
      line: { en: "Connected speech: weak forms, linking, thought groups, focus.", ru: "Связная речь: слабые формы, связывание, смысловые группы, фокус.", kk: "Байланыстырып сөйлеу: әлсіз формалар, байланыстыру, мағыналық топтар, фокус." } },
    B2: { img: "w-b2", name: { en: "Melody Mountains", ru: "Горы мелодии", kk: "Әуен таулары" },
      line: { en: "Intonation, emphasis, fast speech and accents.", ru: "Интонация, выделение, быстрая речь и акценты.", kk: "Интонация, екпінмен бөлу, жылдам сөйлеу және акценттер." } },
    C1: { img: "w-c1", name: { en: "Sky Observatory", ru: "Небесная обсерватория", kk: "Аспан обсерваториясы" },
      line: { en: "Advanced stress, discourse intonation and clear international speech.", ru: "Сложное ударение, интонация в речи и понятность для всех.", kk: "Күрделі екпін, сөйлеу интонациясы және бәріне түсінікті сөйлеу." } }
  };
  P.region = (lv) => P.REGIONS[lv] || P.REGIONS.A0;

  // ---------------------------------------------------------------- mascots
  // name → pose files (m-<name>-<pose>.webp). Roles: Dexter guides, Luna listens, Aizere explains mistakes, Spark cheers.
  P.MASCOTS = {
    dexter: { name: "Dexter", poses: ["guide", "think", "front", "cheer"] },
    luna: { name: "Luna", poses: ["listen", "kind", "front", "cheer"] },
    aizere: { name: "Aizere", poses: ["wave", "explain", "front", "cheer"] },
    spark: { name: "Spark", poses: ["fist", "jump", "thumb", "front"] }
  };
  P.mascot = (who, pose, cls = "") => { const src = P.asset(`m-${who}-${pose}`); return src ? `<img class="mascot ${cls}" src="${src}" alt="" aria-hidden="true" decoding="async" draggable="false">` : ""; };
  // a mascot with a speech bubble (text is real, translated text)
  P.says = (who, pose, text, cls = "", enOnly = false) => `<div class="says ${cls}">${P.mascot(who, pose)}<div class="says-b"><b class="says-n">${e(P.MASCOTS[who].name)}</b>${enOnly ? P.en(text) : P.bi(text)}</div></div>`;

  // ---------------------------------------------------------------- floating letters + IPA symbols (pure CSS animation)
  const GLYPHS = ["a", "b", "ʃ", "θ", "ə", "iː", "ŋ", "ð", "æ", "ʒ", "ˈ", "ɜː", "e", "k", "s", "uː", "aɪ", "r", "w", "əʊ", "t", "ɪ", "dʒ", "ʊ"];
  // glyphs: optional topic symbols (e.g. the round's gate labels) mixed with the general set; colours cycle through the brand palette in CSS
  P.floaters = (n = 14, seed = 1, cls = "", glyphs) => {
    let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    let out = ""; const own = (glyphs || []).filter(Boolean);
    for (let i = 0; i < n; i++) {
      const g = own.length && i % 3 !== 2 ? own[i % own.length] : GLYPHS[Math.floor(rnd() * GLYPHS.length)];
      out += `<span style="left:${(rnd() * 96 + 2).toFixed(1)}%;top:${(rnd() * 88 + 4).toFixed(1)}%;font-size:${(0.9 + rnd() * 1.6).toFixed(2)}rem;animation-delay:${(-rnd() * 14).toFixed(1)}s;animation-duration:${(10 + rnd() * 10).toFixed(1)}s;--dx:${(rnd() * 40 - 20).toFixed(0)}px">${e(g)}</span>`;
    }
    return `<div class="floaters ${cls}" aria-hidden="true">${out}</div>`;
  };
  // sound-wave ribbon (SVG), used in bands and on the home path
  P.waveSvg = (cls = "") => `<svg class="wave ${cls}" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0,30 C50,6 100,54 150,30 S250,6 300,30 S400,54 450,30 S550,6 600,30" class="w1"/>
    <path d="M0,30 C50,48 100,12 150,30 S250,48 300,30 S400,12 450,30 S550,48 600,30" class="w2"/></svg>`;

  // ---------------------------------------------------------------- portal transition between the stages
  P.portalTo = (hash, color) => {
    if (reduced()) { go(hash); return; }
    const el = document.createElement("div"); el.className = "portal-fx"; el.style.setProperty("--pc", color || "#0AC7FF");
    el.innerHTML = P.bubbleSvg("pfx");
    ROOT.appendChild(el);
    requestAnimationFrame(() => el.classList.add("go"));
    setTimeout(() => { go(hash); }, 380);
    setTimeout(() => el.classList.add("out"), 480);
    setTimeout(() => el.remove(), 1000);
  };
})();
;
/* JTS Pronunciation v2 — teaching visuals for the Learn stage (SVG/HTML, animated where it teaches) */
(function () {
  const P = PRON, e = P.esc, tx = P.tx;
  const snd = (s) => P.sounds.find((x) => x.sym === s);
  const VOW = ["eɪ", "aɪ", "ɔɪ", "əʊ", "aʊ", "ɪə", "eə", "ʊə", "iː", "ɑː", "ɔː", "uː", "ɜː", "ɪ", "e", "æ", "ʌ", "ɒ", "ʊ", "ə", "i", "u"];
  const SEG = ["eɪ", "aɪ", "ɔɪ", "əʊ", "aʊ", "ɪə", "eə", "ʊə", "iː", "ɑː", "ɔː", "uː", "ɜː", "tʃ", "dʒ"];
  const segs = (ipa) => { const out = []; const s = String(ipa); let i = 0; while (i < s.length) { const m = SEG.find((x) => s.startsWith(x, i)); if (m) { out.push(m); i += m.length; } else { out.push(s[i]); i++; } } return out; };
  const ipaSpan = (T, w) => { const i = P.ipa(T, w); return i ? `<span class="ipa">/${e(i)}/</span>` : ""; };
  const hearBtn = (w, label, extra = "") => `<button class="say" data-say="${e(w)}" ${extra}>${P.icon.speaker}<span>${e(label || w)}</span></button>`;

  // spelled syllables from v1 stress items (verified), for syllable and stress visuals
  P.sylMap = {};
  for (const L of P.levels) for (const M of L.modules) for (const S of M.steps) if (S.type === "stress") for (const it of S.items) if (!P.sylMap[it.word]) P.sylMap[it.word] = it.syl;
  P.stressPattern = (ipa) => { const out = []; let mark = null; const s = String(ipa); let i = 0;
    while (i < s.length) { const c = s[i]; if (c === "ˈ") { mark = "P"; i++; continue; } if (c === "ˌ") { mark = "S"; i++; continue; } if (c === " ") { mark = null; i++; continue; }
      const v = VOW.find((x) => s.startsWith(x, i)); if (v) { out.push(mark || "o"); mark = null; i += v.length; } else i++; }
    const plain = s.replace(/[ˈˌ]/g, ""); if (/[^aeiouɪʊəæʌɒɜɑɔ:ː][lnm]$/.test(plain) && out.length) out.push("o"); // final syllabic consonant (e.g. table /ˈteɪbl/)
    return out; };

  // ---------------------------------------------------------------- consonants: mouth cross-section
  const TONGUE = {
    rest: "M182,198 C182,160 172,124 146,116 C120,108 92,114 76,124 C66,130 62,138 70,142 C92,150 128,160 160,198 Z",
    dental: "M182,198 C182,160 172,126 146,118 C120,110 90,110 70,112 C60,113 54,116 58,121 C70,130 120,150 160,198 Z",
    alveolar: "M182,198 C182,160 172,124 146,116 C124,108 104,104 90,98 C84,95 79,94 80,99 C82,112 110,140 160,198 Z",
    postalveolar: "M182,198 C182,160 174,122 150,112 C128,102 110,94 98,95 C90,96 86,102 88,110 C96,128 126,156 160,198 Z",
    palatal: "M182,198 C182,156 176,112 148,98 C128,90 106,98 92,112 C84,120 80,130 86,136 C104,148 132,164 160,198 Z",
    velar: "M182,198 C184,152 180,106 158,96 C138,90 116,104 96,118 C84,126 76,134 82,140 C100,150 132,166 160,198 Z"
  };
  TONGUE["labial-velar"] = TONGUE.velar; TONGUE.bilabial = TONGUE.rest; TONGUE.labiodental = TONGUE.rest; TONGUE.glottal = TONGUE.rest;
  const CONTACT = { bilabial: [38, 110], labiodental: [54, 108], dental: [58, 114], alveolar: [82, 94], postalveolar: [97, 93], palatal: [124, 86], velar: [158, 96], "labial-velar": [158, 96], glottal: [186, 204] };
  const ORAL = "M186,212 C186,170 186,132 172,114 C150,100 110,104 70,112 L16,112";
  const NASAL = "M186,212 C186,160 186,112 178,92 C164,70 110,62 46,72 L18,70";
  let uid = 0;
  P.svgMouth = (sym, opts = {}) => {
    const s = snd(sym); if (!s || s.kind !== "consonant") return "";
    const id = "m" + uid++; const pl = s.place, mn = s.manner, nasal = mn === "nasal";
    let upper = "M44,94 C34,94 28,100 30,108 L50,108 C52,100 50,95 44,94 Z", lower = "M30,116 C28,124 34,130 44,130 C52,130 54,122 52,116 Z";
    if (pl === "bilabial") lower = "M30,108 C28,118 34,124 44,124 C52,124 54,116 52,108 Z";
    if (pl === "labiodental") lower = "M44,108 C40,114 44,122 52,122 C60,122 62,114 58,108 Z";
    if (pl === "postalveolar") { upper = "M42,94 C30,95 24,101 27,108 L48,108 C50,100 48,95 42,94 Z"; lower = "M27,115 C25,122 31,128 41,128 C49,128 51,121 49,115 Z"; } // lips slightly rounded and pushed forward
    if (pl === "labial-velar") { upper = "M40,94 C26,95 20,101 24,108 L46,108 C48,100 46,95 40,94 Z"; lower = "M24,114 C22,121 28,127 38,127 C46,127 48,120 46,114 Z"; }
    const velum = nasal ? "M146,82 C158,88 164,100 166,112" : "M146,82 C160,84 172,90 180,98";
    const [cx, cy] = CONTACT[pl];
    const flowPath = nasal ? NASAL : ORAL;
    const flowing = ["fricative", "affricate", "lateral", "approximant", "nasal"].includes(mn) || pl === "glottal";
    const burst = mn === "plosive" || mn === "affricate";
    const voice = s.voice;
    const lbl = opts.labels !== false;
    return `<svg class="mouth" viewBox="0 0 230 236" role="img" aria-label="/${sym}/: ${e(P.featureText.place[pl].en)}, ${e(P.featureText.manner[mn].en)}, ${voice ? "voiced" : "voiceless"}">
      <defs><marker id="${id}a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--air)"/></marker></defs>
      <path d="M70,8 C60,30 46,46 30,62 C24,68 26,74 34,76 C40,78 40,86 44,94" class="m-face"/>
      <path d="M44,130 C46,142 44,152 52,160 C70,174 112,182 140,200" class="m-face"/>
      <path d="M34,76 C60,64 104,58 150,66 C164,68 176,76 182,88" class="m-nasal ${nasal ? "on" : ""}"/>
      <path d="M52,94 L60,94 L62,108 L54,110 Z" class="m-tooth"/><path d="M54,118 L62,116 L63,128 L55,130 Z" class="m-tooth"/>
      <path d="M60,96 C66,90 74,88 82,90 C98,82 124,78 146,82" class="m-palate"/>
      <path d="${velum}" class="m-velum"/>
      <path d="M186,92 C188,130 188,170 188,214" class="m-wall"/>
      <path d="${upper}" class="m-lip"/><path d="${lower}" class="m-lip"/>
      <path d="${TONGUE[pl]}" class="m-tongue"/>
      ${flowing ? `<path d="${flowPath}" class="m-flow" marker-end="url(#${id}a)"/>` : ""}
      ${burst ? `<circle cx="${pl === "glottal" ? 30 : Math.max(cx - 6, 20)}" cy="${cy}" r="4" class="m-burst"><animate attributeName="r" values="3;16;3" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0;.9" dur="1.6s" repeatCount="indefinite"/></circle>` : ""}
      <circle cx="${cx}" cy="${cy}" r="7" class="m-contact"/>
      <g transform="translate(176,226)" class="m-voice ${voice ? "on" : ""}">${voice
        ? `<path d="M-14,0 q3.5,-6 7,0 t7,0 t7,0 t7,0" class="vib"><animateTransform attributeName="transform" type="translate" values="0,-1.5;0,1.5;0,-1.5" dur=".12s" repeatCount="indefinite"/></path>`
        : `<path d="M-14,0 h28" class="novib"/>`}</g>
      ${lbl ? `<g class="m-lbl"><text x="8" y="146">lips</text><text x="96" y="74">ridge</text><text x="66" y="144">teeth</text><text x="160" y="${nasal ? 120 : 74}">soft palate</text><text x="118" y="160">tongue</text><text x="150" y="232" text-anchor="end">${voice ? "voice on" : "voice off"}</text>${nasal ? `<text x="90" y="54">nose</text>` : ""}</g>` : ""}
    </svg>`;
  };
  P.consonantFacts = (sym) => { const s = snd(sym); if (!s) return ""; const F = P.featureText;
    return `<ul class="facts">${[F.place[s.place], F.manner[s.manner], F.voice[s.voice]].map((o) => `<li>${e(o.en)}${P.trs(o, "span", "sup")}</li>`).join("")}</ul>`; };

  // ---------------------------------------------------------------- vowels: lips (front view) + tongue position
  const LIPA = { spread: 54, loose: 49, neutral: 44, rounded: 27 }; // loose = slightly spread (Roach 2009: /ɪ e/)
  function lipGeom(pos, lips) { return { a: LIPA[lips] || 44, h: 3 + pos[1] * 30 + (lips === "rounded" ? 6 : 0), t: lips === "rounded" ? 15 : 11 }; }
  const f1 = (n) => Math.round(n * 10) / 10;
  function lipPaths({ a, h, t }) {
    const hh = h / 2;
    return {
      up: `M${-a},0 C${f1(-a * 0.7)},${f1(-(hh + t))} ${f1(-a * 0.3)},${f1(-(hh + t + 4))} 0,${f1(-(hh + t - 3))} C${f1(a * 0.3)},${f1(-(hh + t + 4))} ${f1(a * 0.7)},${f1(-(hh + t))} ${a},0 C${f1(a * 0.6)},${f1(-hh)} ${f1(-a * 0.6)},${f1(-hh)} ${-a},0 Z`,
      lo: `M${-a},0 C${f1(-a * 0.6)},${f1(hh)} ${f1(a * 0.6)},${f1(hh)} ${a},0 C${f1(a * 0.7)},${f1(hh + t + 3)} ${f1(-a * 0.7)},${f1(hh + t + 3)} ${-a},0 Z`,
      in: `M${-a},0 C${f1(-a * 0.6)},${f1(-hh)} ${f1(a * 0.6)},${f1(-hh)} ${a},0 C${f1(a * 0.6)},${f1(hh)} ${f1(-a * 0.6)},${f1(hh)} ${-a},0 Z`
    };
  }
  function lipsSvg(sym) {
    const s = snd(sym); if (!s || s.kind === "consonant") return "";
    const dip = s.kind === "diphthong"; const id = "lp" + uid++;
    const tA = dip ? s.from : s.pos, tB = dip ? s.to : s.pos;
    const A = lipPaths(lipGeom(tA, dip ? lipsOf(s.from) : s.lips)), B = lipPaths(lipGeom(tB, dip ? lipsOf(s.to) : s.lips));
    const anim = (attr, a, b) => (dip ? `<animate attributeName="${attr}" values="${a};${a};${b};${b};${a}" keyTimes="0;.2;.55;.85;1" dur="2.6s" repeatCount="indefinite"/>` : "");
    const gx = (p) => f1(14 + p[0] * 52), gy = (p) => f1(12 + p[1] * 76);
    return `<svg class="lips" viewBox="0 0 260 150" role="img" aria-label="/${sym}/: ${dip ? "glide" : e(s.lips) + " lips"}">
      <defs><clipPath id="${id}c"><path d="${A.in}">${anim("d", A.in, B.in)}</path></clipPath></defs>
      <g transform="translate(78,66)">
        <path d="${A.in}" class="l-in">${anim("d", A.in, B.in)}</path>
        <g clip-path="url(#${id}c)"><rect x="-30" y="${f1(-lipGeom(tA, "neutral").h / 2 - 34)}" width="60" height="40" class="l-teeth"/><ellipse cx="0" cy="30" rx="34" ry="22" class="l-tng"/></g>
        <path d="${A.up}" class="l-lip">${anim("d", A.up, B.up)}</path>
        <path d="${A.lo}" class="l-lip">${anim("d", A.lo, B.lo)}</path>
      </g>
      <g transform="translate(170,20)" class="l-gauge">
        <text x="40" y="-6" text-anchor="middle">tongue</text>
        <path d="M2,2 H78 L70,92 H18 Z" class="g-box"/>
        <text x="-4" y="12" text-anchor="end">high</text><text x="-4" y="92" text-anchor="end">low</text>
        <text x="4" y="106">front</text><text x="78" y="106" text-anchor="end">back</text>
        <circle cx="${gx(tA)}" cy="${gy(tA)}" r="7" class="g-dot">${anim("cx", gx(tA), gx(tB))}${anim("cy", gy(tA), gy(tB))}</circle>
      </g>
      <text x="78" y="142" text-anchor="middle" class="l-cap ipa">/${e(sym)}/</text>
    </svg>`;
  }
  function lipsOf(pos) { // lips for diphthong end points: back-close = rounded, front = spread, otherwise neutral
    if (pos[0] > 0.6 && pos[1] < 0.5) return "rounded"; if (pos[0] < 0.35 && pos[1] < 0.5) return "spread"; return "neutral"; }
  P.vowelFacts = (sym) => { const s = snd(sym); if (!s) return ""; const F = P.featureText;
    const list = s.kind === "vowel" ? [F.lips[s.lips], F.len[s.len]] : [{ en: "a glide from one vowel position to another", ru: "скольжение от одного положения к другому", kk: "бір қалыптан екіншісіне сырғу" }];
    return `<ul class="facts">${list.map((o) => `<li>${e(o.en)}${P.trs(o, "span", "sup")}</li>`).join("")}</ul>`; };

  // ---------------------------------------------------------------- vowel chart
  const VX = (x, y) => 44 + x * (250 - 44 * y) + 44 * y, VY = (y) => 26 + y * 168;
  P.svgVowels = (hi = [], opts = {}) => {
    const hs = new Set(hi); const id = "v" + uid++;
    const dots = P.sounds.filter((s) => s.kind === "vowel").map((s) => { const on = hs.has(s.sym);
      return `<g class="vd ${on ? "on" : ""}"><circle cx="${VX(...s.pos)}" cy="${VY(s.pos[1])}" r="${on ? 16 : 11}"/><text x="${VX(...s.pos)}" y="${VY(s.pos[1]) + 5}" text-anchor="middle" class="ipa">${s.sym}</text></g>`; }).join("");
    const glides = P.sounds.filter((s) => s.kind === "diphthong" && hs.has(s.sym)).map((s, k) => {
      const a = [VX(...s.from), VY(s.from[1])], b = [VX(...s.to), VY(s.to[1])];
      return `<path id="${id}p${k}" d="M${a[0]},${a[1]} L${b[0]},${b[1]}" class="vg" marker-end="url(#${id}m)"/>
        <text x="${a[0]}" y="${a[1] - 12}" text-anchor="middle" class="ipa vgl">${s.sym}</text>
        <circle r="7" class="vgd"><animateMotion dur="1.8s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;.15;.75;1" calcMode="linear"><mpath href="#${id}p${k}"/></animateMotion></circle>`; }).join("");
    return `<svg class="vchart" viewBox="0 0 320 222" role="img" aria-label="Vowel chart">
      <defs><marker id="${id}m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
      <path d="M${VX(0, 0)},${VY(0)} L${VX(1, 0)},${VY(0)} L${VX(1, 1)},${VY(1)} L${VX(0, 1)},${VY(1)} Z" class="vtrap"/>
      <text x="${VX(0, 0)}" y="14" class="vax">front</text><text x="${VX(1, 0)}" y="14" class="vax" text-anchor="end">back</text>
      <text x="4" y="${VY(0) + 4}" class="vax">high</text><text x="4" y="${VY(1) + 4}" class="vax">low</text>
      ${dots}${glides}</svg>`;
  };

  // ---------------------------------------------------------------- renderers per kind
  const R = {};
  R.mouth = (V) => `<div class="v-mouth">${P.svgMouth(V.sound)}<div class="v-side"><p class="v-sym ipa">/${e(V.sound)}/</p>${P.consonantFacts(V.sound)}${keyWords(V.sound)}</div></div>`;
  R.mouth2 = (V) => `<div class="v-two">${V.sounds.map((s) => `<figure>${P.svgMouth(s, { labels: false })}<figcaption><b class="ipa">/${e(s)}/</b>${keyWords(s)}${P.consonantFacts(s)}</figcaption></figure>`).join("")}</div>`;
  R.lips = (V) => `<div class="v-lips">${V.sounds.map((s) => `<figure>${lipsSvg(s)}<figcaption>${P.vowelFacts(s)}${keyWords(s)}</figcaption></figure>`).join("")}</div>`;
  R.vowels = (V) => `<div class="v-chart">${P.svgVowels(V.sounds)}<div class="v-keys">${V.sounds.map((s) => `<span class="ipa">/${e(s)}/</span>${keyWords(s)}`).join("")}</div></div>`;
  function keyWords(sym) { const s = snd(sym); if (!s) return ""; return `<span class="kws">${s.key.map((w) => hearBtn(w)).join("")}</span>`; }
  R.voicing = (V) => `<div class="v-voicing">${V.pairs.map(([a, b]) => `<div class="vp">${[a, b].map((x) => { const s = snd(x); const on = s && s.voice;
      return `<div class="vc ${on ? "on" : ""}"><svg viewBox="0 0 120 70" aria-hidden="true"><path d="M20,62 C20,40 30,20 60,14 C90,20 100,40 100,62" class="thr"/>${on
        ? `<path d="M36,46 q6,-9 12,0 t12,0 t12,0 t12,0" class="vib"><animateTransform attributeName="transform" type="translate" values="0,-2;0,2;0,-2" dur=".12s" repeatCount="indefinite"/></path>`
        : `<path d="M60,58 V18" class="air"><animate attributeName="stroke-dashoffset" values="24;0" dur=".8s" repeatCount="indefinite"/></path>`}</svg>
        <b class="ipa">/${e(x)}/</b><small>${((f) => `${e(f.en)}${P.trs(f, "span", "sup")}`)(on ? P.featureText.voice.true : P.featureText.voice.false)}</small>${s ? hearBtn(s.key[0]) : ""}</div>`; }).join("")}</div>`).join("")}</div>`;
  R.pair = (V, T) => `<div class="v-pairs">${V.pairs.map(([a, b]) => {
      const ia = P.ipa(T, a), ib = P.ipa(T, b); let ha = e(ia), hb = e(ib);
      if (ia && ib) { const A = segs(ia), B = segs(ib); if (A.length === B.length) { ha = A.map((x, i) => (x !== B[i] ? `<mark>${e(x)}</mark>` : e(x))).join(""); hb = B.map((x, i) => (x !== A[i] ? `<mark>${e(x)}</mark>` : e(x))).join(""); } }
      return `<div class="pc"><button class="pw" data-say="${e(a)}">${P.icon.speaker}<b>${e(a)}</b>${ia ? `<span class="ipa">/${ha}/</span>` : ""}</button><span class="vs">vs</span><button class="pw" data-say="${e(b)}">${P.icon.speaker}<b>${e(b)}</b>${ib ? `<span class="ipa">/${hb}/</span>` : ""}</button>
        <button class="pboth" data-pair="${e(a)}|${e(b)}" aria-label="${e(P.t("both"))}: ${e(a)}, ${e(b)}">${e(P.t("both"))}</button></div>`; }).join("")}</div>`;
  R.syllables = (V, T) => `<div class="v-syl">${V.words.map((w) => { const pat = P.stressPattern(P.ipa(T, w) || (T.lex[w] || "")); const sy = (V.syl && V.syl[w] ? V.syl[w].split("·") : null) || P.sylMap[w];
      const parts = sy && sy.length === pat.length ? sy : pat.map((_, i) => i + 1);
      return `<button class="sw" data-say="${e(w)}"><b>${e(w)}</b><span class="blocks">${parts.map((p) => `<i>${e(p)}</i>`).join("")}</span><small>${pat.length}</small></button>`; }).join("")}</div>`;
  R.stress = (V, T) => `<div class="v-stress">${V.words.map((w) => { const ip = (T.lex[w] || ""); const pat = P.stressPattern(ip); const sy = (V.syl && V.syl[w] ? V.syl[w].split("·") : null) || P.sylMap[w];
      const parts = sy && sy.length === pat.length ? sy.map((p, i) => (pat[i] === "P" ? p.toUpperCase() : p)) : null;
      return `<button class="st" data-say="${e(w)}" data-beats="${pat.join("")}"><span class="dots">${pat.map((p) => `<i class="${p}"></i>`).join("")}</span>
        <b>${parts ? parts.map((p, i) => `<span class="${pat[i]}">${e(p)}</span>`).join("·") : e(w)}</b>${P.noIpa(T) ? "" : `<span class="ipa">/${e(ip)}/</span>`}</button>`; }).join("")}</div>`;
  R.endings = (V, T) => { const s = V.type === "s";
    const rows = s ? [["s", { en: "after a voiceless sound: /p t k f θ/", ru: "после глухого звука: /p t k f θ/", kk: "қатаң дыбыстан кейін: /p t k f θ/" }, "s"],
                      ["z", { en: "after a voiced sound or a vowel", ru: "после звонкого звука или гласного", kk: "ұяң дыбыстан не дауыстыдан кейін" }, "z"],
                      ["ɪz", { en: "after /s z ʃ ʒ tʃ dʒ/ — an extra syllable", ru: "после /s z ʃ ʒ tʃ dʒ/ — добавляется слог", kk: "/s z ʃ ʒ tʃ dʒ/ дыбыстарынан кейін — қосымша буын" }, "iz"]]
                   : [["t", { en: "after a voiceless sound: /p k f s ʃ tʃ θ/", ru: "после глухого звука: /p k f s ʃ tʃ θ/", kk: "қатаң дыбыстан кейін: /p k f s ʃ tʃ θ/" }, "t"],
                      ["d", { en: "after a voiced sound or a vowel", ru: "после звонкого звука или гласного", kk: "ұяң дыбыстан не дауыстыдан кейін" }, "d"],
                      ["ɪd", { en: "after /t/ or /d/ — an extra syllable", ru: "после /t/ или /d/ — добавляется слог", kk: "/t/ не /d/ дыбысынан кейін — қосымша буын" }, "id"]];
    return `<div class="v-end">${rows.map(([ipa, rule, k]) => `<div class="er"><span class="eipa ipa">/${ipa}/</span><span class="erule">${e(rule.en)}${P.trs(rule, "span", "sup")}</span><span class="ews">${(V.examples[k] || []).map((w) => `<button class="say" data-say="${e(w)}">${P.icon.speaker}<span>${e(w)}</span>${ipaSpan(T, w)}</button>`).join("")}</span></div>`).join("")}</div>`; };
  // row label is letters ("ea") or a sound ("/k/"); optional marks:["c","k","ck"] = the letters to highlight in each word
  R.spell = (V, T) => `<div class="v-spell">${V.rows.map((r) => { const snd = /^\/.*\/$/.test(String(r.letters).trim());
      return `<div class="sr"><span class="sl ${snd ? "ipa" : ""}">${e(r.letters)}</span><span class="sarr" aria-hidden="true">→</span><span class="sws">${r.words.map((w, i) => `<button class="say" data-say="${e(w)}">${P.icon.speaker}<span>${r.marks && r.marks[i] ? hl(w, r.marks[i]) : snd ? e(w) : hl(w, r.letters)}</span>${ipaSpan(T, w)}</button>`).join("")}</span></div>`; }).join("")}</div>`;
  function hl(w, letters) { const i = w.toLowerCase().indexOf(String(letters).toLowerCase().replace(/[^a-z]/g, "")); if (i < 0 || !letters) return e(w); const L = letters.replace(/[^a-zA-Z]/g, "").length; return `${e(w.slice(0, i))}<mark>${e(w.slice(i, i + L))}</mark>${e(w.slice(i + L))}`; }
  R.letters = (V) => `<div class="v-letters">${V.groups.map(([k, ls]) => `<div class="lg"><button class="lk say" data-say="${e(k)}">${P.icon.speaker}<span>like <b>${e(k)}</b></span></button><span class="lls">${ls.split(/\s+/).map((l) => `<button class="lt" data-say="${e(l)}" aria-label="Letter ${e(l)}">${e(l)}</button>`).join("")}</span></div>`).join("")}</div>`;
  R.link = (V, T) => `<div class="v-link">${V.phrases.map((ph) => { const ip = T.lex[ph] || "";
      const shown = e(ip).replace(/‿/g, '<mark class="lk">‿</mark>');
      return `<button class="lp" data-say="${e(ph)}">${P.icon.speaker}<b>${e(ph).split(" ").join('<span class="arc" aria-hidden="true"></span>')}</b><span class="ipa">/${shown}/</span></button>`; }).join("")}</div>`;
  R.weak = (V, T) => `<table class="v-weak"><thead><tr><th></th><th>${e(P.t("strong"))}</th><th>${e(P.t("weak"))}</th><th></th></tr></thead><tbody>${V.rows.map((r) => `<tr><th>${e(r.word)}</th><td class="ipa">/${e(r.strong)}/</td><td class="ipa w">/${e(r.weak)}/</td><td>${r.example ? `<button class="say" data-say="${e(r.example)}">${P.icon.speaker}<span>${e(r.example)}</span></button>` : ""}</td></tr>`).join("")}</tbody></table>`;
  // the line is spoken with a comma at each | so the synthetic voice actually pauses between thought groups
  P.groupSay = (l) => l.split("|").map((c) => c.trim().replace(/[,;:]$/, "")).join(", ").replace(/\s+/g, " ").trim();
  R.groups = (V) => `<div class="v-groups">${V.lines.map((l) => { const plain = P.groupSay(l);
      return `<button class="gl" data-say="${e(plain)}">${P.icon.speaker}<span>${l.split("|").map((c) => `<span class="chunk">${e(c.trim())}</span>`).join('<span class="pause" aria-label="pause">‖</span>')}</span></button>`; }).join("")}</div>`;
  R.pitch = (V) => `<div class="v-pitch">${V.lines.map((l) => pitchLine(l)).join("")}</div>`;
  function pitchLine(l) {
    const words = l.text.split(/\s+/); const ctx = (pitchLine.c = pitchLine.c || document.createElement("canvas").getContext("2d")); ctx.font = "600 17px 'Noto Sans', sans-serif";
    const nIdx = Math.max(0, words.findIndex((w) => w.toLowerCase().replace(/[^a-z']/g, "") === String(l.nucleus || "").toLowerCase().replace(/[^a-z']/g, "")));
    let x = 8; const pos = words.map((w, i) => { const shown = i === nIdx ? w.toUpperCase() : w; ctx.font = i === nIdx ? "800 17px 'Noto Sans', sans-serif" : "600 17px 'Noto Sans', sans-serif"; const wd = ctx.measureText(shown).width; const p = { w, x, wd }; x += wd + 10; return p; });
    const W = Math.max(260, x + 8);
    const n = pos[nIdx] || pos[pos.length - 1]; const hi = 18, mid = 34, lo = 54;
    let d = `M${pos[0].x},${mid - 6}`; d += ` L${n.x - 2},${mid}`; const nx = n.x, ne = n.x + n.wd, end = x - 9;
    const tunes = { fall: ` L${nx + 4},${hi} C${nx + n.wd * 0.6},${hi} ${ne},${lo} ${Math.max(ne, end)},${lo}`,
      rise: ` L${nx + 4},${lo} C${nx + n.wd * 0.6},${lo} ${ne},${hi + 4} ${Math.max(ne, end)},${hi}`,
      fallrise: ` L${nx + 4},${hi} C${nx + n.wd * 0.5},${hi} ${ne},${lo} ${(ne + Math.max(ne, end)) / 2 + 6},${lo} L${Math.max(ne, end) + 4},${mid - 4}`,
      risefall: ` L${nx + 4},${lo} C${nx + n.wd * 0.4},${hi - 4} ${nx + n.wd * 0.6},${hi - 4} ${ne},${mid} L${Math.max(ne, end)},${lo}`,
      level: ` L${Math.max(ne, end)},${mid}` };
    d += tunes[l.tune] || tunes.fall;
    const arrow = { fall: "↘", rise: "↗", fallrise: "↘↗", risefall: "↗↘", level: "→" }[l.tune] || "";
    return `<button class="pl" data-say="${e(l.text)}"><svg viewBox="0 0 ${W} 92" style="width:min(100%,${Math.round(W * 1.6)}px)" role="img" aria-label="${e(l.text)}: ${e(l.tune)} on ${e(n.w)}">
      <path d="${d}" class="pc"/><path d="${d}" class="pc run"/><circle cx="${n.x + 4}" cy="${l.tune === "rise" || l.tune === "risefall" ? lo : l.tune === "level" ? mid : hi}" r="5" class="nd"/>
      ${pos.map((p, i) => `<text x="${p.x}" y="84" class="${i === nIdx ? "nuc" : ""}">${e(i === nIdx ? p.w.toUpperCase() : p.w)}</text>`).join("")}
      <text x="${Math.min(W - 6, end + 26)}" y="${hi + 4}" text-anchor="end" class="arr">${arrow}</text></svg></button>`;
  }
  R.accent = (V, T) => `<div class="v-accent">${P.hasUS() ? "" : `<p class="g-note warn">${e(P.t("noUS"))}</p>`}<div class="ah"><span></span><b>${e(P.t("british"))}</b><b>${e(P.t("american"))}</b></div>${V.words.map((w) => `<div class="ar"><b>${e(w.word)}</b>
      <button class="say" data-say="${e(w.word)}">${P.icon.speaker}<span class="ipa">/${e(T.lex[w.word] || "")}/</span></button>
      <button class="say us" data-say="${e(w.word)}" data-acc="GA">${P.icon.speaker}<span class="ipa">/${e(w.us)}/</span></button></div>`).join("")}</div>`;
  const cell = (c) => (c && typeof c === "object" ? `${e(c.en)}${P.trs(c, "span", "sup")}` : e(c)); // cells may be {en,ru,kk}
  R.table = (V) => `<table class="v-table"><thead><tr>${V.head.map((h) => `<th>${cell(h)}</th>`).join("")}</tr></thead><tbody>${V.rows.map((r) => `<tr>${r.map((c) => `<td>${cell(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  // ---------------------------------------------------------------- alphabet (A0.1): 26 letters, names, IPA, example words, quiz
  // [letter, guide en, guide ru/kk (rough Cyrillic), example word, sound of the letter in that word, note key or ""]
  P.ALPHA = [
    ["A", "ay (rhymes with day)", "эй", "apple", "æ", "vowelA"], ["B", "bee", "би", "book", "b", ""], ["C", "see", "си", "cat", "k", "C"],
    ["D", "dee", "ди", "dog", "d", ""], ["E", "ee (like see)", "и", "egg", "e", "vowelE"], ["F", "eff", "эф", "fish", "f", ""],
    ["G", "jee", "джи", "girl", "g", "G"], ["H", "aitch", "эйч", "hat", "h", "H"], ["I", "eye", "ай", "ink", "ɪ", "vowelI"],
    ["J", "jay", "джей", "jam", "dʒ", ""], ["K", "kay", "кей", "key", "k", ""], ["L", "el", "эл", "leg", "l", ""],
    ["M", "em", "эм", "map", "m", ""], ["N", "en", "эн", "nose", "n", ""], ["O", "oh", "оу", "orange", "ɒ", "vowelO"],
    ["P", "pee", "пи", "pen", "p", ""], ["Q", "kyoo", "кью", "queen", "k", "Q"], ["R", "ar (no r sound)", "а-а", "red", "r", "R"],
    ["S", "ess", "эс", "sun", "s", ""], ["T", "tee", "ти", "ten", "t", ""], ["U", "yoo", "ю", "up", "ʌ", "vowelU"],
    ["V", "vee", "ви", "van", "v", ""], ["W", "double-yoo", "дабл-ю", "water", "w", "W"], ["X", "eks", "экс", "box", "ks", "X"],
    ["Y", "why", "уай", "yes", "j", "Y"], ["Z", "zed", "зед", "zoo", "z", "Z"]
  ];
  const ANOTE = {
    vowelA: { en: "A is a vowel letter. In apple it has a short sound /æ/; in cake it says its name /eɪ/; in car it is /ɑː/.", ru: "A — гласная буква. В apple — короткий звук /æ/, в cake — как её название /eɪ/, в car — /ɑː/.", kk: "A — дауысты әріп. apple сөзінде қысқа /æ/, cake сөзінде өз атауындай /eɪ/, car сөзінде /ɑː/.", w: ["cake", "car"] },
    vowelE: { en: "E is a vowel letter: short /e/ in egg, its name /iː/ in me. At the end of cake or name, E is silent.", ru: "E — гласная буква: короткий /e/ в egg, как название /iː/ в me. В конце cake или name буква E не читается.", kk: "E — дауысты әріп: egg сөзінде қысқа /e/, me сөзінде атауындай /iː/. cake, name сөздерінің соңында E оқылмайды.", w: ["me", "name"] },
    vowelI: { en: "I is a vowel letter: short /ɪ/ in ink, its name /aɪ/ in ice.", ru: "I — гласная буква: короткий /ɪ/ в ink, как название /aɪ/ в ice.", kk: "I — дауысты әріп: ink сөзінде қысқа /ɪ/, ice сөзінде атауындай /aɪ/.", w: ["ice"] },
    vowelO: { en: "O is a vowel letter: short /ɒ/ in orange and hot, its name /əʊ/ in go.", ru: "O — гласная буква: короткий /ɒ/ в orange и hot, как название /əʊ/ в go.", kk: "O — дауысты әріп: orange пен hot сөздерінде қысқа /ɒ/, go сөзінде атауындай /əʊ/.", w: ["hot", "go"] },
    vowelU: { en: "U is a vowel letter: short /ʌ/ in up, its name /juː/ in use.", ru: "U — гласная буква: короткий /ʌ/ в up, как название /juː/ в use.", kk: "U — дауысты әріп: up сөзінде қысқа /ʌ/, use сөзінде атауындай /juː/.", w: ["use"] },
    C: { en: "C usually sounds /k/ (cat), but before e, i or y it usually sounds /s/ (city).", ru: "C обычно звучит как /k/ (cat), но перед e, i или y — обычно как /s/ (city).", kk: "C әдетте /k/ (cat), ал e, i не y алдында әдетте /s/ (city) болып естіледі.", w: ["city"] },
    G: { en: "G usually sounds /g/ (girl). Before e, i or y it often sounds /dʒ/ (gym), but not always: get and girl keep /g/.", ru: "G обычно звучит как /g/ (girl). Перед e, i или y часто звучит /dʒ/ (gym), но не всегда: в get и girl остаётся /g/.", kk: "G әдетте /g/ (girl). e, i не y алдында көбіне /dʒ/ (gym), бірақ әрдайым емес: get пен girl сөздерінде /g/ қалады.", w: ["gym", "get"] },
    H: { en: "The British name is /eɪtʃ/. Some speakers say /heɪtʃ/; /eɪtʃ/ is the safe choice. In hour, H is silent.", ru: "Британское название — /eɪtʃ/. Некоторые говорят /heɪtʃ/; надёжный вариант — /eɪtʃ/. В hour буква H не читается.", kk: "Британдық атауы — /eɪtʃ/. Кейбіреулер /heɪtʃ/ дейді; сенімді нұсқа — /eɪtʃ/. hour сөзінде H оқылмайды.", w: ["hour"] },
    Q: { en: "Q is almost always followed by u. Q itself is /k/, and qu together usually sounds /kw/: queen.", ru: "После Q почти всегда стоит u. Сама Q — это /k/, а qu вместе обычно звучит /kw/: queen.", kk: "Q әрпінен кейін әдетте u тұрады. Q өзі — /k/, ал qu бірге әдетте /kw/ болып естіледі: queen.", w: [] },
    R: { en: "British name: /ɑː/, with no r sound. American name: /ɑːr/. In British English, the letter r is pronounced only before a vowel sound: red, but not car said alone.", ru: "Британское название — /ɑː/, без звука r. Американское — /ɑːr/. В британском буква r звучит только перед гласным звуком: red, но не car, сказанное отдельно.", kk: "Британдық атауы — /ɑː/, r дыбысынсыз. Америкалық атауы — /ɑːr/. Британ тілінде r әрпі тек дауысты дыбыстың алдында айтылады: red, бірақ жеке айтылған car-да емес.", w: ["car"] },
    W: { en: "W has a long name: double-u /ˈdʌbəljuː/ (double + u). In words it is a short /w/ with round lips: water.", ru: "У W длинное название: double-u /ˈdʌbəljuː/ (double + u). В словах это короткий /w/ с округлёнными губами: water.", kk: "W атауы ұзын: double-u /ˈdʌbəljuː/ (double + u). Сөз ішінде дөңгелектенген ерінмен айтылатын қысқа /w/: water.", w: [] },
    X: { en: "Very few common words start with X. In words, x usually sounds /ks/: box, six.", ru: "Почти нет частых слов, которые начинаются с X. В словах x обычно звучит /ks/: box, six.", kk: "X-тен басталатын жиі қолданылатын сөз өте аз. Сөз ішінде x әдетте /ks/ болып естіледі: box, six.", w: ["six"] },
    Y: { en: "At the start of a word Y is the consonant /j/ (yes). In my it is /aɪ/, in happy it is /i/.", ru: "В начале слова Y — согласный /j/ (yes). В my это /aɪ/, в happy — /i/.", kk: "Сөз басында Y — дауыссыз /j/ (yes). my сөзінде /aɪ/, happy сөзінде /i/.", w: ["my", "happy"] },
    Z: { en: "British name: zed /zed/. American name: zee /ziː/. Both are correct in their accent.", ru: "Британское название — zed /zed/. Американское — zee /ziː/. Оба правильные, каждое в своём варианте.", kk: "Британдық атауы — zed /zed/. Америкалық атауы — zee /ziː/. Екеуі де өз нұсқасында дұрыс.", w: [] }
  };
  const SAME_SHAPE = new Set(["C", "O", "P", "S", "U", "V", "W", "X", "Z"]);
  const AT = {
    az: { en: "A to Z", ru: "От A до Z", kk: "A-дан Z-ке дейін" }, stop: { en: "Stop", ru: "Стоп", kk: "Тоқтату" },
    quiz: { en: "Mixed-order quiz", ru: "Тест вразброс", kk: "Аралас тест" }, name: { en: "Name", ru: "Название", kk: "Атауы" },
    guide: { en: "Say it like", ru: "Примерно как", kk: "Шамамен" }, inword: { en: "In a word", ru: "В слове", kk: "Сөз ішінде" },
    sound: { en: "sound", ru: "звук", kk: "дыбыс" }, diff: { en: "★ = the small letter has a different shape", ru: "★ = строчная буква выглядит иначе", kk: "★ = кіші әріптің пішіні басқа" },
    tap: { en: "Tap a letter to hear its name.", ru: "Нажмите на букву, чтобы услышать её название.", kk: "Атауын есту үшін әріпті басыңыз." },
    qhow: { en: "Listen to a letter name, then tap that letter. 10 letters, mixed order.", ru: "Послушайте название буквы и нажмите на эту букву. 10 букв вразброс.", kk: "Әріп атауын тыңдап, сол әріпті басыңыз. 10 әріп, аралас ретпен." },
    start: { en: "Start", ru: "Начать", kk: "Бастау" }, again: { en: "Listen again", ru: "Ещё раз", kk: "Қайта тыңдау" },
    right: { en: "Right!", ru: "Верно!", kk: "Дұрыс!" }, was: { en: "It was", ru: "Это была", kk: "Бұл" }, you: { en: "you tapped", ru: "вы нажали", kk: "сіз бастыңыз" },
    next: { en: "Next letter", ru: "Следующая", kk: "Келесі әріп" }, score: { en: "right first time", ru: "верно с первого раза", kk: "бірінші реттен дұрыс" },
    redo: { en: "New quiz", ru: "Новый тест", kk: "Жаңа тест" }, q: { en: "Letter", ru: "Буква", kk: "Әріп" }
  };
  const at = (k) => tx(AT[k]); const atb = (k) => `${e(AT[k].en)}${P.trs(AT[k], "span", "sup")}`;
  const aRow = (L) => P.ALPHA.find((r) => r[0] === L);
  function alphaDetail(T, L) {
    const r = aRow(L); const [, gEn, gCy, w, sw, nk] = r; const n = ANOTE[nk];
    const guide = `${e(gEn)}<span class="sup tr tr-cy"> · «${e(gCy)}»</span>`;
    return `<div class="ad-big" aria-hidden="true"><b>${L}</b><b>${L.toLowerCase()}</b></div>
      <div class="ad-info"><p class="ad-row"><span class="ad-k">${e(at("name"))}</span><button class="say" data-say="${L}">${P.icon.speaker}<span><b>${L}</b></span><span class="ipa">/${e(T.lex[L] || "")}/</span></button></p>
      <p class="ad-row"><span class="ad-k">${e(at("guide"))}</span><span class="ad-g">${guide}</span></p>
      <p class="ad-row"><span class="ad-k">${e(at("inword"))}</span><button class="say" data-say="${e(w)}">${P.icon.speaker}<span>${hlFirst(w, L)}</span><span class="ipa">/${e(T.lex[w] || "")}/</span></button><span class="ad-s">${L} → <span class="ipa">/${e(sw)}/</span></span></p>
      ${n ? `<p class="ad-note">${e(n.en)}${P.trs(n, "span", "sup")}${n.w.length ? `<span class="ad-nw">${n.w.map((x) => `<button class="say sm" data-say="${e(x)}">${P.icon.speaker}<span>${e(x)}</span><span class="ipa">/${e(T.lex[x] || "")}/</span></button>`).join("")}</span>` : ""}</p>` : ""}</div>`;
  }
  function hlFirst(w, L) { const i = w.toLowerCase().indexOf(L.toLowerCase()); return i < 0 ? e(w) : `${e(w.slice(0, i))}<mark>${e(w.slice(i, i + 1))}</mark>${e(w.slice(i + 1))}`; }
  R.alphabet = (V, T) => {
    const show = V.show || "names";
    const tiles = P.ALPHA.map(([L, , , , sw]) => `<button class="at ${show === "case" && !SAME_SHAPE.has(L) ? "diff" : ""}" data-l="${L}" aria-label="${L}">
        <span class="at-l">${L}<small>${L.toLowerCase()}</small></span>${show === "case" ? "" : ((ip) => `<span class="at-i ipa ${ip.length > 6 ? "long" : ""}">/${e(ip)}/</span>`)(show === "sounds" ? sw : T.lex[L] || "")}</button>`).join("");
    return `<div class="v-alpha" data-show="${show}" data-quiz="${V.quiz ? 1 : 0}">
      <div class="a-bar"><button class="btn sm a-az">${P.icon.play}<span>${e(at("az"))}</span></button>${V.quiz ? `<button class="btn sm glowb a-qz">${P.icon.speaker}<span>${e(at("quiz"))}</span></button>` : ""}
        <span class="a-tip">${show === "case" ? atb("diff") : atb("tap")}</span></div>
      <div class="a-grid">${tiles}</div>
      <div class="a-detail" aria-live="polite">${show === "case" ? "" : alphaDetail(T, "A")}</div>
      ${V.quiz ? `<div class="a-quiz" hidden></div>` : ""}</div>`;
  };
  P.bindAlphabet = (root, T) => {
    root.querySelectorAll(".v-alpha").forEach((box) => {
      const show = box.dataset.show, det = box.querySelector(".a-detail"), tiles = [...box.querySelectorAll(".at")];
      let az = null, quiz = null;
      const mark = (L) => tiles.forEach((t) => t.classList.toggle("sel", t.dataset.l === L));
      const select = (L, speak = true) => { mark(L); det.innerHTML = alphaDetail(T, L); P.bindSay(det); if (speak) { const tb = det.querySelector("[data-say]"); P.sound(tb, () => P.play(L)); } if (window.innerWidth < 720 && det.scrollIntoView) det.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
      tiles.forEach((t) => (t.onclick = () => { if (quiz) return quiz.answer(t.dataset.l, t); stopAz(); select(t.dataset.l); }));
      const azb = box.querySelector(".a-az");
      function stopAz() { if (az) { az.stop = true; az = null; azb.querySelector("span").textContent = at("az"); P.stopAudio(); } }
      azb.onclick = async () => {
        if (az) return stopAz(); if (quiz) endQuiz();
        az = { stop: false }; const me = az; azb.querySelector("span").textContent = at("stop");
        for (const [L] of P.ALPHA) { if (me.stop || !box.isConnected) return; mark(L); det.innerHTML = alphaDetail(T, L); P.bindSay(det); await P.play(L, { keep: true }); await new Promise((r) => setTimeout(r, 380)); }
        if (!me.stop) stopAz();
      };
      const qb = box.querySelector(".a-qz"), qp = box.querySelector(".a-quiz");
      if (!qb) return;
      function endQuiz() { quiz = null; P.stopAudio(); qp.hidden = true; box.classList.remove("quizzing"); det.hidden = false; tiles.forEach((t) => t.classList.remove("ok", "bad")); }
      function startQuiz() {
        stopAz(); det.hidden = true; box.classList.add("quizzing"); mark(null);
        const list = P.shuffle(P.ALPHA.map((r) => r[0])).slice(0, 10); let i = 0, first = 0, tried = false, lock = false;
        quiz = { answer(L, t) {
          if (lock) return; const target = list[i];
          if (!tried) answered(L === target); // порт: первый ответ на букву — в навык «слушание»
          if (L === target) { lock = true; t.classList.add("ok"); P.tone("good"); if (!tried) first++;
            qp.querySelector(".q-msg").innerHTML = `<b class="good">${e(at("right"))}</b> ${target} <span class="ipa">/${e(T.lex[target])}/</span>`;
            const me = quiz; setTimeout(() => { t.classList.remove("ok"); if (quiz !== me || !box.isConnected) return; i++; tried = false; lock = false; ask(); }, 900);
          } else { tried = true; t.classList.add("bad"); P.tone("soft"); setTimeout(() => t.classList.remove("bad"), 700);
            qp.querySelector(".q-msg").innerHTML = `${e(at("you"))} <b>${L}</b> <button class="say sm" data-say="${L}">${P.icon.speaker}<span class="ipa">/${e(T.lex[L])}/</span></button> · ${e(at("again"))}: <button class="say sm" data-say="${target}">${P.icon.speaker}<span>?</span></button>`;
            P.bindSay(qp); }
        } };
        function ask() {
          box.dataset.target = list[i] || "";
          if (i >= list.length) { qp.innerHTML = `<p class="q-end"><b>${first} / ${list.length}</b> ${e(at("score"))}</p><div class="q-act"><button class="btn sm primary q-redo">${e(at("redo"))}</button><button class="btn sm ghost q-close">${e(P.t("close"))}</button></div>`;
            quiz = null; qp.querySelector(".q-redo").onclick = startQuiz; qp.querySelector(".q-close").onclick = endQuiz; return; }
          qp.innerHTML = `<p class="q-top"><span>${e(at("q"))} ${i + 1} / ${list.length}</span><button class="btn sm primary q-play">${P.icon.speaker}<span>${e(at("again"))}</span></button><button class="iconb q-x" aria-label="${e(P.t("close"))}">×</button></p><p class="q-msg" aria-live="polite">${atb("qhow")}</p>`;
          const qpb = qp.querySelector(".q-play"); qpb.onclick = () => P.sound(qpb, () => P.play(list[i])); qp.querySelector(".q-x").onclick = endQuiz; P.sound(qpb, () => P.play(list[i]));
        }
        qp.hidden = false; ask();
      }
      qb.onclick = () => (quiz ? endQuiz() : startQuiz());
    });
  };

  // ---------------------------------------------------------------- anatomy: labelled speech organs
  const ORG = {
    lips: { en: "Lips: close (p, b, m), touch the teeth (f, v) or become round (w, oo).", ru: "Губы: смыкаются (p, b, m), касаются зубов (f, v) или округляются (w, oo).", kk: "Ерін: жабылады (p, b, m), тіске тиеді (f, v) немесе дөңгелектенеді (w, oo).", t: { en: "lips", ru: "губы", kk: "ерін" } },
    teeth: { en: "Teeth: the top teeth touch the lower lip for f and v; for th the tongue tip lightly touches the back or the edge of the top teeth.", ru: "Зубы: верхние зубы касаются нижней губы при f и v; при th кончик языка слегка касается верхних зубов сзади или их края.", kk: "Тіс: f пен v айтқанда үстіңгі тіс астыңғы ерінге тиеді; th айтқанда тіл ұшы үстіңгі тістің артына не жиегіне жеңіл тиеді.", t: { en: "teeth", ru: "зубы", kk: "тіс" } },
    ridge: { en: "Alveolar ridge: the hard bump just behind the top teeth. The tongue tip touches it for t, d, n, l and goes near it for s, z.", ru: "Альвеолы (бугорок): твёрдый бугорок сразу за верхними зубами. Кончик языка касается его при t, d, n, l и подходит близко при s, z.", kk: "Төмпешік (альвеола): үстіңгі тістің дәл артындағы қатты дөңес. t, d, n, l айтқанда тіл ұшы оған тиеді, s, z айтқанда жақындайды.", t: { en: "alveolar ridge", ru: "альвеолы", kk: "төмпешік" } },
    palate: { en: "Hard palate: the hard roof of the mouth. The middle of the tongue rises towards it for y in yes.", ru: "Твёрдое нёбо: твёрдый «потолок» рта. Средняя часть языка поднимается к нему при y в yes.", kk: "Қатты таңдай: ауыздың қатты «төбесі». yes сөзіндегі y айтқанда тілдің ортасы оған көтеріледі.", t: { en: "hard palate", ru: "твёрдое нёбо", kk: "қатты таңдай" } },
    velum: { en: "Soft palate: the soft back part of the roof. The back of the tongue touches it for k, g and ng. When it goes down, air goes out through the nose (m, n, ng).", ru: "Мягкое нёбо: мягкая задняя часть «потолка». Задняя часть языка касается его при k, g и ng. Когда оно опущено, воздух идёт через нос (m, n, ng).", kk: "Жұмсақ таңдай: таңдайдың жұмсақ артқы бөлігі. k, g, ng айтқанда тілдің арты оған тиеді. Ол түскенде ауа мұрыннан шығады (m, n, ng).", t: { en: "soft palate", ru: "мягкое нёбо", kk: "жұмсақ таңдай" } },
    tongue: { en: "Tongue: the tip, the middle and the back can each move up. Most sounds depend on where the tongue goes.", ru: "Язык: кончик, средняя и задняя часть поднимаются по отдельности. Большинство звуков зависит от положения языка.", kk: "Тіл: ұшы, ортасы және арты бөлек көтеріле алады. Дыбыстардың көбі тілдің қалпына байланысты.", t: { en: "tongue", ru: "язык", kk: "тіл" } },
    voice: { en: "Voice box (vocal folds): in the throat. When the folds vibrate, the sound is voiced (v, z, all vowels). When they are open, only air passes: voiceless (f, s).", ru: "Гортань (голосовые связки): в горле. Когда связки вибрируют, звук звонкий (v, z, все гласные). Когда они открыты, проходит только воздух — звук глухой (f, s).", kk: "Көмей (дауыс шымылдығы): тамақта. Шымылдық дірілдесе, дыбыс ұяң (v, z, барлық дауысты). Ашық тұрса, тек ауа өтеді — қатаң (f, s).", t: { en: "voice box", ru: "гортань", kk: "көмей" } },
    nose: { en: "Nose: for m, n and ng the air goes out through the nose. Close your nose with your fingers: you cannot hold a long mmm.", ru: "Нос: при m, n и ng воздух выходит через нос. Зажмите нос пальцами — долгое «ммм» не получится.", kk: "Мұрын: m, n, ng айтқанда ауа мұрыннан шығады. Мұрныңызды саусақпен қысыңыз — ұзақ «ммм» шықпайды.", t: { en: "nose", ru: "нос", kk: "мұрын" } }
  };
  const ORG_XY = { lips: [36, 112], teeth: [58, 104], ridge: [82, 92], palate: [120, 80], velum: [166, 92], tongue: [130, 140], voice: [188, 204], nose: [90, 66] };
  R.anatomy = (V) => {
    const parts = V.parts || Object.keys(ORG);
    return `<div class="v-anat"><svg class="mouth anat" viewBox="0 0 230 236" role="img" aria-label="Speech organs">
      <path d="M70,8 C60,30 46,46 30,62 C24,68 26,74 34,76 C40,78 40,86 44,94" class="m-face"/><path d="M44,130 C46,142 44,152 52,160 C70,174 112,182 140,200" class="m-face"/>
      <path d="M34,76 C60,64 104,58 150,66 C164,68 176,76 182,88" class="m-nasal" data-o="nose"/>
      <path d="M52,94 L60,94 L62,108 L54,110 Z" class="m-tooth" data-o="teeth"/><path d="M54,118 L62,116 L63,128 L55,130 Z" class="m-tooth" data-o="teeth"/>
      <path d="M60,96 C66,90 74,88 82,90" class="m-palate ridge" data-o="ridge"/><path d="M82,90 C98,82 124,78 146,82" class="m-palate" data-o="palate"/>
      <path d="M146,82 C160,84 172,90 180,98" class="m-velum" data-o="velum"/><path d="M186,92 C188,130 188,170 188,214" class="m-wall"/>
      <path d="M44,94 C34,94 28,100 30,108 L50,108 C52,100 50,95 44,94 Z" class="m-lip" data-o="lips"/><path d="M30,116 C28,124 34,130 44,130 C52,130 54,122 52,116 Z" class="m-lip" data-o="lips"/>
      <path d="${TONGUE.rest}" class="m-tongue" data-o="tongue"/><path d="M180,204 h16" class="m-vf" data-o="voice"/>
      ${parts.map((k, i) => `<g class="a-pin" data-o="${k}"><circle cx="${ORG_XY[k][0]}" cy="${ORG_XY[k][1]}" r="8"/><text x="${ORG_XY[k][0]}" y="${ORG_XY[k][1] + 3.5}" text-anchor="middle">${i + 1}</text></g>`).join("")}
    </svg><ol class="a-list">${parts.map((k) => `<li><button class="a-part" data-o="${k}"><b>${e(ORG[k].t.en)}</b>${P.trs(ORG[k].t, "span", "sup")}</button><p class="a-desc" hidden>${e(ORG[k].en)}${P.trs(ORG[k], "span", "sup")}</p></li>`).join("")}</ol></div>`;
  };
  P.bindAnatomy = (root) => root.querySelectorAll(".v-anat").forEach((box) => {
    const pick = (k) => { box.querySelectorAll("[data-o]").forEach((n) => n.classList.toggle("hi", n.dataset.o === k));
      box.querySelectorAll(".a-part").forEach((b) => { const on = b.dataset.o === k; b.setAttribute("aria-expanded", on); b.nextElementSibling.hidden = !on; }); };
    box.querySelectorAll(".a-part").forEach((b) => (b.onclick = () => pick(b.dataset.o)));
    box.querySelectorAll(".a-pin").forEach((g) => (g.onclick = () => pick(g.dataset.o)));
    const first = box.querySelector(".a-part"); if (first) pick(first.dataset.o);
  });

  P.renderVisual = (V, T) => (R[V.kind] ? R[V.kind](V, T) : "");
  // words already playable inside a visual (so the audio row does not repeat them)
  P.visualWords = (V) => {
    const s = new Set(); const add = (x) => x && s.add(x);
    (V.pairs || []).forEach((p) => p.forEach(add)); (V.words || []).forEach((w) => add(typeof w === "string" ? w : w.word));
    (V.phrases || []).forEach(add); (V.rows || []).forEach((r) => { (r.words || []).forEach(add); add(r.example); });
    Object.values(V.examples || {}).flat().forEach(add); (V.lines || []).forEach((l) => { if (typeof l === "string") { add(l.replace(/\s*\|\s*/g, " ").replace(/\s+/g, " ").trim()); add(P.groupSay(l)); } else add(l.text); });
    return s;
  };
  // wire playback inside a container
  P.bindSay = (root) => {
    root.querySelectorAll("[data-say]").forEach((b) => (b.onclick = () => {
      P.sound(b, () => P.play(b.dataset.say, { accent: b.dataset.acc || undefined, slow: b.classList.contains("slowp") }));
      if (b.dataset.beats) animateBeats(b);
      if (b.classList.contains("pl")) { const r = b.querySelector(".run"); if (r) { r.classList.remove("go"); void r.getBoundingClientRect(); r.classList.add("go"); } }
    }));
    root.querySelectorAll("[data-pair]").forEach((b) => (b.onclick = () => P.sound(b, () => P.playSeq(b.dataset.pair.split("|"), {}, 550))));
  };
  function animateBeats(b) { const dots = [...b.querySelectorAll(".dots i")]; dots.forEach((d, i) => setTimeout(() => { d.classList.add("hit"); setTimeout(() => d.classList.remove("hit"), 260); }, 300 + i * 260)); }
})();
;
/* JTS Pronunciation v2 — "Echo Gates": hear each echo, send it through the matching gate. */
(function () {
  const P = PRON, e = P.esc, t = P.t, tx = P.tx;
  const $ = (s, r = ROOT) => r.querySelector(s), $$ = (s, r = ROOT) => [...r.querySelectorAll(s)];
  const GATE_COLORS = ["#0AC7FF", "#FF7D1D", "#00E641", "#FFD60A"]; // brand palette (JTS Visual Guideline 2.1)
  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let G = null; // current game instance

  function ipaLine(T, w) { const i = P.ipa(T, w); return i ? ` <span class="ipa">/${e(i)}/</span>` : ""; }

  // ---------------------------------------------------------------- entry / round intro
  P.openGame = (T, ri) => {
    stop(); // a round tab or "next round" pressed during play must end the running round first
    const rs = P.rs(T.id);
    const open = (i) => i === 0 || rs[i - 1].done || rs[i].done;
    if (ri == null || !(ri >= 0 && ri < T.game.rounds.length) || !open(ri)) { ri = rs.findIndex((r) => !r.done); if (ri < 0) ri = 0; }
    HASH = `#/play/${T.id}/${ri}`; // the address always names the round on screen
    P.state.last = T.id; P.save();
    const R = T.game.rounds[ri];
    P.stopAudio();
    const app = $("#app");
    const img = P.asset(P.region(T.level).img);
    app.innerHTML = `<section class="game" aria-label="${e(T.title)}">
      <div class="g-bg" aria-hidden="true" ${img ? `style="--img:url('${img}')"` : ""}>${P.floaters(16, ri + 5, "g-float", R.gates.map((g) => g.label).filter((l) => l.length <= 6))}</div>
      <header class="g-top"><a class="g-icon" href="#/" aria-label="${e(t("toTopics"))}">${P.icon.back}</a>
        <div class="g-title"><span class="g-topic">${e(T.id)} · ${e(T.title)}</span><span class="g-round">${e(t("round"))} ${ri + 1} · ${e(R.title.en)}</span></div>
        <nav class="g-rounds" aria-label="${e(t("round"))}">${T.game.rounds.map((x, i) => {
          const open = i === 0 || rs[i - 1].done || rs[i].done;
          return `<button class="g-rtab ${i === ri ? "on" : ""} ${rs[i].best >= 0.85 ? "star" : ""}" data-r="${i}" ${open ? "" : "disabled"} aria-label="${e(t("round"))} ${i + 1}${open ? "" : " — " + e(t("locked"))}">${rs[i].best >= 0.85 ? P.icon.star : i + 1}</button>`; }).join("")}</nav>
        ${P.trBar("trbar-top g-trtop")}
      </header>
      <div class="g-intro">
        <div class="g-card g-introcard xpl">${P.says("dexter", "guide", P.T.roundCoach, "g-coach-intro")}
          <div class="xhead"><p class="g-kicker">${e(t("round"))} ${ri + 1} / 3</p>${P.trBar()}</div>
          <h1>${e(R.title.en)}</h1>${P.trs(R.title, "p", "sup")}
          ${P.bi(R.task, "g-task")}
          ${R.tts_risk ? `<p class="g-note">${e(t("ttsNote"))}</p>` : ""}
          ${(R.items.some((x) => x.accent === "GA") || R.gates.some((g) => g.anchorAccent === "GA")) && !P.hasUS() ? `<p class="g-note warn" role="alert">${e(t("noUS"))}</p>` : ""}
          <div class="g-preview">${R.gates.map((g, i) => `<div class="pv" style="--gc:${GATE_COLORS[i]}"><b>${e(g.label)}</b><small>${e(g.hint.en)}${P.trs(g.hint, "span", "sup")}</small>${g.anchor ? `<button class="pv-play" data-anchor="${e(g.anchor)}" data-acc="${g.anchorAccent || ""}" aria-label="${e(t("hear"))} ${e(g.anchor)}">${P.icon.speaker}<span>${e(g.anchor)}</span></button>` : ""}</div>`).join("")}</div>
          <button class="btn glow" id="g-go">${P.icon.play}<span>${e(t("start"))}</span></button>
          <a class="g-link" href="#/learn/${T.id}">${e(t("reviewLearn"))}</a>
        </div>
      </div></section>`;
    $$(".g-rtab").forEach((b) => (b.onclick = () => P.openGame(T, +b.dataset.r)));
    $$(".pv-play").forEach((b) => (b.onclick = () => P.sound(b, () => P.play(b.dataset.anchor, { accent: b.dataset.acc || undefined, game: true }))));
    P.bindTrBar(app);
    $("#g-go").onclick = () => (P.state.tutorial ? start(T, ri) : tutorial(() => start(T, ri)));
    $("#g-go").focus();
    setTimeout(() => { const c = $(".g-introcard"); if (c && !P.hasAudio() && !$(".g-noaudio", c)) c.insertAdjacentHTML("afterbegin", `<div class="alert g-noaudio" role="alert">${P.en(P.T.noVoice)}</div>`); }, 1500);
  };

  function tutorial(next) {
    const box = document.createElement("div"); box.className = "g-modal"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "tut-h"); box.innerHTML = `<div class="g-card tut xpl"><div class="xhead xh2"><h2 id="tut-h">${e(t("howTitle"))}</h2>${P.trBar()}</div>
      <ol class="tut-steps">
        <li><span class="tut-orb" aria-hidden="true"></span><div>${P.bi(P.T.how1)}</div></li>
        <li><span class="tut-gate" aria-hidden="true"></span><div>${P.bi(P.T.how2)}</div></li>
        <li><span class="tut-back" aria-hidden="true">↺</span><div>${P.bi(P.T.how3)}</div></li>
        <li><span class="tut-spk" aria-hidden="true">${P.icon.speaker}</span><div>${P.bi(P.T.how4)}</div></li>
      </ol><p class="tut-keys">1–4 · Space · P</p><button class="btn glow" id="tut-ok">${e(t("gotIt"))}</button></div>`;
    $(".game").appendChild(box); P.bindTrBar(box);
    $("#tut-ok").focus();
    $("#tut-ok").onclick = () => { P.state.tutorial = true; P.save(); box.remove(); next(); refocus(); };
  }

  // ---------------------------------------------------------------- play
  function start(T, ri) {
    const R = T.game.rounds[ri]; const rs = P.rs(T.id)[ri]; rs.plays = (rs.plays || 0) + 1; P.save(); parts.length = 0;
    const intro = $(".g-intro"); intro && intro.remove();
    const game = $(".game");
    game.insertAdjacentHTML("beforeend", `
      <div class="g-hud"><div class="g-dots" aria-hidden="true">${R.items.map(() => "<i></i>").join("")}</div>
        <span class="g-streak" id="g-streak" aria-hidden="true"></span><button class="g-why" id="g-why" hidden aria-label="${e(t("whyLabel"))}"><b aria-hidden="true">?</b><span>${e(t("whyBtn"))}</span></button><button class="g-icon g-pause" aria-label="${e(t("pause"))}">${P.icon.pause}</button></div>
      <p class="g-hint">${e(R.task.en)}</p>
      <svg class="g-hills" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true"><path d="M0,200 L0,120 L90,70 L170,110 L260,40 L350,100 L430,60 L520,115 L610,50 L700,105 L790,65 L880,120 L960,55 L1050,100 L1130,70 L1200,95 L1200,200 Z" class="h1"/><path d="M0,200 L0,150 L120,115 L240,150 L380,110 L520,155 L660,120 L800,158 L940,118 L1080,150 L1200,128 L1200,200 Z" class="h2"/></svg>
      <div class="g-sky" id="g-sky"></div>
      <canvas class="g-fx" id="g-fx" aria-hidden="true"></canvas>
      <div class="g-gates" style="--n:${R.gates.length}">${R.gates.map((g, i) => `
        <div class="gate" style="--gc:${GATE_COLORS[i]}" data-g="${i}" data-sound-host>
          <button class="gate-hit" data-g="${i}"><span class="gate-arch" aria-hidden="true"></span><span class="gate-ripple" aria-hidden="true"></span>
            <span class="gate-key" aria-hidden="true">${i + 1}</span><b class="gate-label">${e(g.label)}</b><small class="gate-hint">${e(g.hint.en)}</small></button>
          ${g.anchor ? `<button class="gate-spk" data-anchor="${e(g.anchor)}" data-acc="${g.anchorAccent || ""}" aria-label="${e(t("hear"))}: ${e(g.anchor)}">${P.icon.speaker}</button>` : ""}
        </div>`).join("")}</div>
      <div class="g-toast" id="g-toast" aria-hidden="true"></div>
      <div class="g-mate companion" id="g-mate" aria-hidden="true"><span class="g-mate-ring"></span>${P.mascot("luna", "listen", "idle")}<span class="g-mate-b"></span></div>
      <p class="vh" id="g-live" aria-live="assertive"></p>`);
    const sky = $("#g-sky"), fx = $("#g-fx");
    const items = P.shuffle(R.items.map((it, i) => ({ ...it, _i: i })));
    const voiceBase = ri + (rs.plays - 1) * 3;
    G = {
      T, R, ri, sky, fx, queue: items, live: [], done: new Set(), tries: new Map(), firstOk: 0, mixups: [],
      streak: 0, speed: 1, paused: false, last: performance.now(), spawnWait: 0.6, speaking: false, sayQ: [],
      fall: [12, 10.5, 9][ri], voice: (it) => (ri === 0 ? voiceBase : voiceBase + it._i), ended: false
    };
    fitFx();
    $$(".gate-hit").forEach((b) => (b.onclick = () => route(+b.dataset.g)));
    $$(".gate-spk").forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); if (G) { G.sayQ = []; G.speaking = false; } P.sound(b, () => P.play(b.dataset.anchor, { accent: b.dataset.acc || undefined, game: true })).then(() => { if (G && !G.paused) { const s = selected(); if (s && !G.speaking) say(s); } }); }));
    $(".g-pause").onclick = () => pause(true);
    $("#g-why").onclick = () => { if (G && G.lastWrong && !G.paused) explainPanel(G.lastWrong.item, G.lastWrong.gi); };
    P.preloadGameAudio(R.items.concat(R.gates.map((g) => ({ say: g.anchor, accent: g.anchorAccent }))).filter((x) => x.say).map((x) => P.audioId(P.cue(x.say), x.accent)));
    ROOT.addEventListener("keydown", onKey);
    window.addEventListener("resize", fitFx);
    navHooks.add(stop); // порт: уход со страницы раунда — по роутеру движка, а не hashchange
    requestAnimationFrame(loop);
  }

  function stop() { if (!G) return; G.ended = true; ROOT.removeEventListener("keydown", onKey); window.removeEventListener("resize", fitFx); P.stopAudio(); G = null; }
  function fitFx() { if (!G) return; const r = $(".game").getBoundingClientRect(); G.fx.width = r.width * devicePixelRatio; G.fx.height = r.height * devicePixelRatio; G.fx.style.width = r.width + "px"; G.fx.style.height = r.height + "px"; }

  function onKey(ev) {
    if (!G) return;
    const modal = $(".g-modal");
    if (modal) {
      const a = activeEl(), inside = a && modal.contains(a) && /^(BUTTON|A)$/.test(a.tagName);
      // Enter activates the focused control; only when nothing in the dialog has focus does it press the main button
      if (ev.key === "Enter" && !inside) { const b = $(".btn.glow", modal); if (b) { ev.preventDefault(); b.click(); } }
      if (ev.key === "Escape") { const r = $("#p-go", modal); if (r) { ev.preventDefault(); r.click(); } }
      if (ev.key === "Tab") { const f = [...modal.querySelectorAll("button:not([disabled]),a[href]")]; if (f.length) { const i = f.indexOf(a);
        if (ev.shiftKey && (i <= 0)) { ev.preventDefault(); f[f.length - 1].focus(); } else if (!ev.shiftKey && (i === f.length - 1 || i < 0)) { ev.preventDefault(); f[0].focus(); } } }
      return;
    }
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (/^[1-4]$/.test(ev.key)) { ev.preventDefault(); route(+ev.key - 1); }
    else if (ev.key === " ") { ev.preventDefault(); const s = selected(); if (s) say(s, true); }
    else if (ev.key === "p" || ev.key === "P" || ev.key === "Escape") { ev.preventDefault(); pause(true); }
    else if (ev.key === "Tab" && !ev.shiftKey && G.live.length > 1 && activeEl() && activeEl().classList.contains("echo")) { ev.preventDefault(); const s = selected(); const i = G.live.indexOf(s); setSel(G.live[(i + 1) % G.live.length]); }
  }

  // ---------- speaking queue: one voice at a time
  function say(echo, now) {
    if (!echo.item.say) return;
    if (now) { G.sayQ = G.sayQ.filter((x) => x !== echo); G.sayQ.unshift(echo); P.stopAudio(); G.speaking = false; }
    else if (!G.sayQ.includes(echo)) G.sayQ.push(echo);
    pump();
  }
  function pump() {
    if (!G || G.paused || G.ended || G.speaking || !G.sayQ.length) return;
    const echo = G.sayQ.shift(); if (!G.live.includes(echo)) return pump();
    G.speaking = true; echo.el.classList.add("wait");
    P.play(echo.item.say, { accent: echo.item.accent, voice: G.voice(echo.item), keep: true, game: true, onstart: () => { echo.el.classList.remove("wait"); echo.el.classList.add("talk"); echo.talkT = 0; } }).then(() => {
      echo.el.classList.remove("talk", "wait"); if (G) { G.speaking = false; setTimeout(pump, 120); }
    });
  }

  // ---------- echoes
  function maxLive() { if (reduced()) return 1; if (G.ri === 0) return 1; return G.streak >= (G.ri === 1 ? 4 : 3) ? 2 : 1; }
  function spawn() {
    const item = G.queue.shift(); if (!item) return;
    const el = document.createElement("button");
    const read = G.R.mode === "read" && item.show;
    el.className = "echo" + (read ? " card" : "");
    el.setAttribute("aria-label", read ? item.show : "Echo — " + t("hear"));
    el.innerHTML = read ? `<span class="echo-text">${e(item.show)}</span><span class="echo-ring" aria-hidden="true"></span>` : `<span class="echo-core" aria-hidden="true"></span><span class="echo-ring" aria-hidden="true"></span><span class="echo-ring r2" aria-hidden="true"></span>`;
    const others = G.live.map((x) => x.x);
    let x = 0.2 + Math.random() * 0.6; for (let k = 0; k < 6 && others.some((o) => Math.abs(o - x) < 0.28); k++) x = 0.15 + Math.random() * 0.7;
    const echo = { item, el, x, y: reduced() ? 0.38 : 0.04, drag: null, age: 0 };
    G.sky.appendChild(el); G.live.push(echo); place(echo);
    el.addEventListener("pointerdown", (ev) => grab(ev, echo));
    el.addEventListener("click", () => { if (echo.moved) { echo.moved = false; return; } setSel(echo); say(echo, true); });
    setSel(selected() || echo);
    say(echo);
  }
  function place(echo) { const r = G.sky.getBoundingClientRect(); echo.el.style.transform = `translate(${(echo.x + (echo.drag ? 0 : echo.sx || 0)) * r.width}px, ${echo.y * r.height}px) translate(-50%, -50%)`; }
  function selected() { return G.live.find((x) => x.sel) || null; }
  function setSel(echo) { G.live.forEach((x) => { x.sel = x === echo; x.el.classList.toggle("sel", x.sel); }); }
  function lowest() { return G.live.slice().sort((a, b) => b.y - a.y)[0] || null; }

  function grab(ev, echo) {
    if (G.paused) return; ev.preventDefault();
    const r = G.sky.getBoundingClientRect(); echo.drag = { dx: ev.clientX, dy: ev.clientY, x0: echo.x, y0: echo.y }; echo.moved = false;
    echo.el.setPointerCapture(ev.pointerId); echo.el.classList.add("drag"); setSel(echo);
    const move = (m) => { const dx = m.clientX - echo.drag.dx, dy = m.clientY - echo.drag.dy; if (Math.abs(dx) + Math.abs(dy) > 6) echo.moved = true;
      echo.x = echo.drag.x0 + dx / r.width; echo.y = echo.drag.y0 + dy / r.height; place(echo); hoverGate(m.clientX, m.clientY); };
    const up = (u) => {
      echo.el.removeEventListener("pointermove", move); echo.el.removeEventListener("pointerup", up); echo.el.removeEventListener("pointercancel", up);
      echo.el.classList.remove("drag"); hoverGate(-1, -1);
      const gi = gateAt(u.clientX, u.clientY); echo.drag = null;
      if (echo.moved && gi >= 0) route(gi, echo); else { echo.y = Math.min(echo.y, 0.9); place(echo); }
    };
    echo.el.addEventListener("pointermove", move); echo.el.addEventListener("pointerup", up); echo.el.addEventListener("pointercancel", up);
  }
  function gateAt(x, y) { const gs = $$(".gate"); for (const g of gs) { const r = g.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top - 30 && y <= r.bottom) return +g.dataset.g; } return -1; }
  function hoverGate(x, y) { const gi = gateAt(x, y); $$(".gate").forEach((g) => g.classList.toggle("hover", +g.dataset.g === gi)); }

  // ---------- main loop
  function loop(now) {
    if (!G || G.ended) return;
    const dt = Math.min(0.05, (now - G.last) / 1000); G.last = now;
    if (!G.paused) {
      G.spawnWait -= dt;
      if (G.live.length < maxLive() && G.queue.length && G.spawnWait <= 0) { spawn(); G.spawnWait = P._fast ? 0.05 : 1.6; }
      if (!reduced()) for (const echo of G.live.slice()) {
        if (echo.drag) continue;
        echo.age += dt; if (G.speaking && G.sayQ.length === 0 && echo.age < 1.2) continue; // let the first word be heard before it moves
        echo.y += dt / (G.fall * G.speed);
        echo.sx = Math.sin(echo.age * 1.3 + echo.x * 9) * 0.018;
        place(echo);
        if (echo.y >= 1) missed(echo);
      }
      if (!G.live.length && !G.queue.length) return finish();
    }
    // sound particles leave an echo only while its audio is really playing (class set by the playback events)
    if (!reduced()) for (const echo of G.live) if (echo.el.classList.contains("talk")) { echo.talkT = (echo.talkT || 0) - dt; if (echo.talkT <= 0) { echo.talkT = 0.16; waveFrom(echo); } }
    drawFx(dt);
    requestAnimationFrame(loop);
  }

  function removeEcho(echo) { G.live = G.live.filter((x) => x !== echo); G.sayQ = G.sayQ.filter((x) => x !== echo); if (echo.sel) { const n = lowest(); if (n) setSel(n); } }
  function requeue(item) { const pos = Math.min(G.queue.length, 2 + Math.floor(Math.random() * 3)); G.queue.splice(pos, 0, item); }
  function markTry(item, ok) {
    if (!G.tries.has(item._i)) { G.tries.set(item._i, ok); answered(ok); if (ok) G.firstOk++; else G.mixups.push(item); }
  }
  function missed(echo) {
    removeEcho(echo); echo.el.classList.add("fade"); setTimeout(() => echo.el.remove(), 500);
    markTry(echo.item, false); requeue(echo.item); G.streak = 0; G.speed = Math.min(1.45, G.speed * 1.15);
    toast(t("missed"), "warn");
  }

  function route(gi, echo) {
    if (!G || G.paused) return; echo = echo || selected() || lowest(); if (!echo || gi >= G.R.gates.length) return;
    const item = echo.item, ok = item.gate === gi;
    markTry(item, ok); if (ok) removeEcho(echo);
    const gate = $(`.gate[data-g="${gi}"]`), gr = gate.getBoundingClientRect(), sr = G.sky.getBoundingClientRect();
    if (ok) {
      G.done.add(item._i); G.streak++; if (G.streak >= 3) G.speed = Math.max(0.72, G.speed * 0.95);
      echo.el.classList.add("fly"); echo.el.style.transform = `translate(${gr.left + gr.width / 2 - sr.left}px, ${gr.top - sr.top + 20}px) translate(-50%,-50%) scale(.3)`;
      setTimeout(() => echo.el.remove(), 420);
      gate.classList.remove("good"); void gate.offsetWidth; gate.classList.add("good");
      burst(gr.left + gr.width / 2, gr.top + 10, GATE_COLORS[gi]);
      glyphBurst(gate, item);
      P.tone("good"); hop();
      const dots = $$(".g-dots i"); const k = G.done.size - 1; if (dots[k]) dots[k].classList.add("on");
      $(".game").style.setProperty("--p", (G.done.size / G.R.items.length).toFixed(2));
      const sk = $("#g-streak"); if (sk) { sk.textContent = G.streak >= 3 ? `${G.streak} ✓` : ""; sk.classList.toggle("on", G.streak >= 3); }
      if (G.streak === 3 || G.streak === 5 || (G.streak > 5 && G.streak % 5 === 0)) mate("spark", G.streak >= 5 ? "jump" : "fist", G.streak >= 5 ? P.T.streak5 : P.T.streak3);
      const word = item.show || item.say || "";
      gateToast(gate, `${e(word)}${item.say && !item.show ? ipaLine(G.T, item.say) : ""}`);
      $("#g-live").textContent = `${t("right")} ${word}`;
      if (G.lastWrong && G.lastWrong.item === item) whyChip(null);
    } else {
      // gentle feedback: no panel. The gate wobbles softly, the echo floats back up, says its word again and waits for another try;
      // the explanation stays one tap away ("Why?")
      G.streak = 0; G.speed = Math.min(1.45, G.speed * 1.12); const sk = $("#g-streak"); if (sk) { sk.textContent = ""; sk.classList.remove("on"); }
      gate.classList.remove("nope"); void gate.offsetWidth; gate.classList.add("nope");
      echo.y = Math.max(0.06, echo.y - 0.24); echo.age = 0; place(echo); setSel(echo);
      echo.el.classList.remove("retry"); void echo.el.offsetWidth; echo.el.classList.add("retry");
      P.tone("soft"); mate("luna", "kind", P.T.tryAgain, 1500); whyChip({ item, gi });
      $("#g-live").textContent = t("tryAgainLive");
      setTimeout(() => { if (G && !G.paused && G.live.includes(echo)) say(echo, true); }, 420);
    }
  }

  function whyChip(w) { if (!G) return; G.lastWrong = w; const b = $("#g-why"); if (!b) return; b.hidden = !w; if (w) { b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); } }
  // the full explanation, only when the learner asks for it ("Why?")
  function explainPanel(item, gi) {
    G.paused = true; P.stopAudio(); G.speaking = false;
    const R = G.R, right = R.gates[item.gate], chosen = R.gates[gi];
    const why = item.why || R.why;
    const box = document.createElement("div"); box.className = "g-modal low"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "fb-k");
    const heard = item.say || item.show;
    box.innerHTML = `<div class="g-card fb xpl">${P.says("luna", "kind", P.T.wrongCoach, "fb-coach")}
      <div class="xhead"><p class="g-kicker bad" id="fb-k">${e(t("youHeard"))}</p>${P.trBar()}</div>
      <p class="fb-word">${item.show ? `<span class="fb-show">${e(item.show)}</span>` : ""}${item.say && !item.show ? `<b>${e(item.say)}</b>${ipaLine(G.T, item.say)}` : ""}</p>
      <div class="fb-gates">
        <div class="fb-g ok" style="--gc:${GATE_COLORS[item.gate]}"><small>${e(t("goesTo"))}</small><b>${e(right.label)}</b>
          ${item.say ? `<button class="btn ghost sm" data-say="${e(item.say)}" data-acc="${item.accent || ""}">${P.icon.speaker}<span>${e(item.say)}</span></button>` : ""}</div>
        <div class="fb-g no" style="--gc:${GATE_COLORS[gi]}"><small>${e(t("yourGate"))}</small><b>${e(chosen.label)}</b>
          ${chosen.anchor ? `<button class="btn ghost sm" data-say="${e(chosen.anchor)}" data-acc="${chosen.anchorAccent || ""}">${P.icon.speaker}<span>${e(chosen.anchor)}</span></button>` : ""}</div>
      </div>
      ${why ? `<div class="fb-why">${P.bi(why)}</div>` : ""}
      <div class="fb-act">${item.say && chosen.anchor ? `<button class="btn ghost" id="fb-both">${e(t("both"))}</button>` : ""}<button class="btn glow" id="fb-go">${e(t("goOn"))}</button></div></div>`;
    $(".game").appendChild(box);
    $$("[data-say]", box).forEach((b) => (b.onclick = () => P.sound(b, () => P.play(b.dataset.say, { accent: b.dataset.acc || undefined, slow: true, game: true }))));
    const both = $("#fb-both"); if (both) both.onclick = () => P.sound(both, async () => { const a = await P.play(item.say, { accent: item.accent, slow: true, game: true, _seq: true }); await new Promise((r) => setTimeout(r, 600)); if (!box.isConnected || !both.classList.contains("playing")) return a; return (await P.play(chosen.anchor, { accent: chosen.anchorAccent, slow: true, game: true, _seq: true })) || a; });
    $("#g-live").textContent = `${t("youHeard")}: ${heard}. ${t("goesTo")}: ${right.label}.`;
    if (item.say) setTimeout(() => { const hb = box.querySelector(".fb-g.ok [data-say]"); if (box.isConnected) P.sound(hb, () => P.play(item.say, { accent: item.accent, slow: true, game: true })); }, 250);
    P.bindTrBar(box);
    const go = $("#fb-go"); go.focus();
    go.onclick = () => { P.stopAudio(); box.remove(); G.paused = false; G.last = performance.now(); G.spawnWait = P._fast ? 0.05 : 0.4; pump(); refocus(); };
  }

  function pause(on) {
    if (!G || G.ended || $(".g-modal")) return;
    G.paused = true; P.stopAudio(); G.speaking = false; G.live.forEach((x) => { if (!G.sayQ.includes(x)) {} });
    const box = document.createElement("div"); box.className = "g-modal"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "p-h");
    box.innerHTML = `<div class="g-card"><h2 id="p-h">${e(t("paused"))}</h2><button class="btn glow" id="p-go">${e(t("resume"))}</button><a class="g-link" href="#/">${e(t("quit"))}</a></div>`;
    $(".game").appendChild(box); $("#p-go").focus();
    $("#p-go").onclick = () => { box.remove(); G.paused = false; G.last = performance.now(); const s = selected(); if (s) say(s, true); else pump(); refocus(); };
  }

  // a mascot pops up beside the gates for a moment (encouragement on streaks); purely visual, text is mirrored to #g-live
  function mate(who, pose, text, ms = 2400) {
    const m = $("#g-mate"); if (!m) return;
    const src = P.asset(`m-${who}-${pose}`); const img = m.querySelector("img"); if (img && src) img.src = src;
    m.querySelector(".g-mate-b").textContent = text.en;
    m.classList.remove("show"); void m.offsetWidth; m.classList.add("show");
    m.classList.add("talking");
    clearTimeout(mate.t); mate.t = setTimeout(() => { m.classList.remove("show", "talking"); const s2 = P.asset("m-luna-listen"); if (img && s2) img.src = s2; m.querySelector(".g-mate-b").innerHTML = ""; }, ms);
  }
  function hop() { const m = $("#g-mate"); if (!m || m.classList.contains("talking")) return; m.classList.remove("hop"); void m.offsetWidth; m.classList.add("hop"); }
  // after a correct answer the word's own sound symbols rise out of the gate (the answer is already given, so this teaches, never hints)
  function glyphBurst(gate, item) {
    if (reduced()) return; const ipa = item.say ? P.ipa(G.T, item.say) : "";
    const syms = ipa ? (ipa.match(/[ˈˌ]?(?:tʃ|dʒ|eɪ|aɪ|ɔɪ|əʊ|aʊ|ɪə|eə|ʊə|[^\s.ˈˌ]ː?)/g) || []).slice(0, 8) : String(item.show || item.say || "").replace(/[^A-Za-z']/g, "").slice(0, 8).split("");
    syms.forEach((g, i) => { const s = document.createElement("span"); s.className = "g-glyph"; s.textContent = g; s.style.setProperty("--gx", ((i - (syms.length - 1) / 2) * 26 + (Math.random() * 12 - 6)).toFixed(0) + "px"); s.style.animationDelay = (i * 45) + "ms"; gate.appendChild(s); setTimeout(() => s.remove(), 1500); });
  }
  // a soft ring leaves the speaking echo (DOM, compositor-only animation)
  function waveFrom(echo) {
    const w = document.createElement("span"); w.className = "g-wave"; const r = echo.el.getBoundingClientRect(), sr = G.sky.getBoundingClientRect();
    w.style.left = (r.left + r.width / 2 - sr.left) + "px"; w.style.top = (r.top + r.height / 2 - sr.top) + "px"; G.sky.appendChild(w); setTimeout(() => w.remove(), 900);
  }
  function toast(msg, kind) { const el = $("#g-toast"); if (!el) return; el.textContent = msg; el.className = "g-toast show " + (kind || ""); clearTimeout(toast.t); toast.t = setTimeout(() => (el.className = "g-toast"), 1600); }
  function gateToast(gate, html) { const s = document.createElement("span"); s.className = "gate-pop"; s.innerHTML = html; gate.appendChild(s);
    const r = s.getBoundingClientRect(); const dx = r.left < 8 ? 8 - r.left : r.right > innerWidth - 8 ? innerWidth - 8 - r.right : 0; if (dx) s.style.marginLeft = dx + "px"; // keep it on screen
    setTimeout(() => s.remove(), 1500); }
  // after a dialog closes, focus goes back to the play area (selected echo or the pause button), never to <body>
  function refocus() { setTimeout(() => { if (!G) return; const s = selected(); (s && s.el.isConnected ? s.el : $(".g-pause"))?.focus({ preventScroll: true }); }, 30); }

  // ---------- particles
  const parts = [];
  function burst(x, y, color) {
    if (reduced() || !G) return; const r = $(".game").getBoundingClientRect();
    for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI - Math.PI; const v = 120 + Math.random() * 260; parts.push({ x: x - r.left, y: y - r.top, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.9, c: color.trim() || "#7fe3ff" }); }
  }
  function drawFx(dt) {
    const c = G.fx.getContext("2d"); const d = devicePixelRatio; c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, G.fx.width, G.fx.height);
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; c.globalAlpha = Math.max(0, p.life); c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, 2.6, 0, 7); c.fill(); }
    c.globalAlpha = 1;
  }

  // ---------- results
  function finish() {
    whyChip(null);
    const { T, R, ri } = G; const total = R.items.length; const acc = G.firstOk / total;
    const rs = P.rs(T.id)[ri]; const wasStar = rs.best >= 0.85; rs.done = true; rs.best = Math.max(rs.best || 0, acc); P.save();
    const star = acc >= 0.85; const last = ri === 2; const mix = G.mixups;
    P.tone(star ? "win" : "good");
    const topicDone = P.topicDone(T.id);
    const list = P.topicsList(); const idx = list.findIndex((x) => x.id === T.id); const nextT = list[idx + 1];
    const box = document.createElement("div"); box.className = "g-modal"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "r-h");
    box.innerHTML = `<div class="g-card result">
      <p class="g-kicker">${e(t("round"))} ${ri + 1} / 3</p><h2 id="r-h">${e(last && topicDone ? t("topicDone") : t("roundDone"))}</h2>
      <div class="res-cast ${star ? "win" : ""}" aria-hidden="true">${star ? `${P.mascot("dexter", "cheer")}${P.mascot("luna", "cheer")}<div class="res-star on">${P.icon.star}</div>${P.mascot("aizere", "cheer")}${P.mascot("spark", "jump")}` : `${P.mascot("luna", "kind")}<div class="res-star">${P.icon.star}</div>${P.mascot("spark", "thumb")}`}</div>
      <p class="res-num"><b>${Math.round(acc * 100)}%</b> ${e(t("firstTry"))}</p>
      <p class="res-note">${e(star ? t("starWon") : t("starHint"))}</p>
      ${mix.length ? `<h3>${e(t("mixups"))}</h3><div class="res-mix">${mix.map((it) => `<button class="chip" data-say="${e(it.say || "")}" data-acc="${it.accent || ""}" ${it.say ? "" : "disabled"}>${it.say ? P.icon.speaker : ""}<span>${e(it.show || it.say)}</span><small>→ ${e(R.gates[it.gate].label)}</small></button>`).join("")}</div>` : ""}
      <div class="fb-act">
        <button class="btn ghost" id="r-again">${e(t("again"))}</button>
        ${!last ? `<button class="btn glow" id="r-next">${e(t("nextRound"))}</button>` : nextT ? `<a class="btn glow" href="#/learn/${nextT.id}">${e(t("nextTopic"))}: ${e(nextT.id)}</a>` : ""}
      </div><a class="g-link" href="#/">${e(t("toTopics"))}</a></div>`;
    const game = $(".game"); game.appendChild(box);
    $$(".res-mix .chip").forEach((b) => (b.onclick = () => b.dataset.say && P.sound(b, () => P.play(b.dataset.say, { accent: b.dataset.acc || undefined, slow: true, game: true }))));
    $("#r-again").onclick = () => { stop(); P.openGame(T, ri); };
    const n = $("#r-next"); if (n) n.onclick = () => { stop(); P.openGame(T, ri + 1); };
    (n || $("#r-again")).focus();
    G.ended = true; ROOT.removeEventListener("keydown", onKey);
    if (star && !wasStar) { burst(innerWidth / 2, innerHeight / 3, "#ffd166"); const me = G; (function fl() { if (G !== me || !parts.length) return; drawFx(1 / 60); requestAnimationFrame(fl); })(); }
  }

  P._game = () => G; // test hook
  P.stopGame = stop; // порт: destroy() останавливает раунд
})();
;
/* JTS Pronunciation v2 — home, Learn stage, router */
(function () {
  const P = PRON, e = P.esc, t = P.t, tx = P.tx;
  const $ = (s, r = ROOT) => r.querySelector(s), $$ = (s, r = ROOT) => [...r.querySelectorAll(s)];
  const LV = ["A0", "A1", "A2", "B1", "B2", "C1"];
  P.levels.sort((a, b) => LV.indexOf(a.id) - LV.indexOf(b.id));
  const TOPICS = P.topicsList();
  const byId = (id) => TOPICS.find((x) => x.id === id);
  const app = $("#app");
  const LEVEL_NAME = {}; P.levels.forEach((L) => (LEVEL_NAME[L.id] = L));

  function header(dark, home) {
    // порт: без логотипа — шапка приложения уже есть; на главной раздела — «назад» из раздела (cfg.onExit)
    return `<header class="top ${dark ? "dark" : ""}"><span class="brand-row">${home && onExit ? `<button type="button" class="iconb brand-back" id="pr-exit" aria-label="${e(t("back"))}">${P.icon.back}</button>` : ""}<a class="brand" href="#/"><span class="brand-name">${e(t("world"))}</span></a></span>${P.trBar("trbar-top")}</header>`;
  }
  function bindHeader() { P.bindTrBar(app); const x = $("#pr-exit"); if (x) x.onclick = () => onExit(); }
  const bindPortals = (root) => root.querySelectorAll(".portal-go").forEach((pg) => (pg.onclick = (ev) => { ev.preventDefault(); P.portalTo(pg.getAttribute("href")); }));
  function voiceAlert() { setTimeout(() => { const m = $("main"); if (m && !P.hasAudio() && !$(".alert", m)) m.insertAdjacentHTML("afterbegin", `<div class="alert" role="alert">${P.en(P.T.noVoice)}</div>`); }, 1500); }
  const starRow = (n) => `<span class="stars" aria-label="${n}/3 ${e(t("stars"))}">${[0, 1, 2].map((i) => `<i class="${i < n ? "on" : ""}">${P.icon.star}</i>`).join("")}</span>`;
  const bgImg = (name) => (P.asset(name) ? `--img:url('${P.asset(name)}')` : "");
  
  // ---------------------------------------------------------------- home = the world map
  function nextTopic() {
    if (P.state.last) { const T = byId(P.state.last); if (T && !P.topicDone(T.id)) return T; }
    return TOPICS.find((T) => !P.topicDone(T.id)) || TOPICS[0];
  }
  function home(level) {
    const nt = nextTopic();
    level = [level, P.state.level, nt.level].find((x) => LV.includes(x)); P.state.level = level; P.save(); // unknown level ids (bad link, old storage) fall back safely
    const list = TOPICS.filter((T) => T.level === level); const L = LEVEL_NAME[level]; const RG = P.region(level);
    const totalStars = list.reduce((a, T) => a + P.stars(T.id), 0);
    const lvStars = (id) => TOPICS.filter((T) => T.level === id).reduce((a, T) => a + P.stars(T.id), 0);
    const lvMax = (id) => TOPICS.filter((T) => T.level === id).length * 3;
    app.innerHTML = `<div class="world">${header(true, true)}
      <section class="w-hero" style="${bgImg("w-hero")}">
        ${P.floaters(16, 3)}
        <div class="w-hero-in xpl">
          <p class="w-kick">${e(t("worldKick"))}</p>
          <h1>${e(P.T.world.en)}</h1>
          <div class="w-lead">${P.bi(P.T.worldLead)}</div>
          <ol class="w-stages" aria-label="${e(t("twoStages"))}">
            <li class="st1"><span class="sn">1</span>${P.icon.book}<span><b>${e(t("learn"))}</b><small>${e(t("labName"))}</small></span></li>
            <li class="st2"><span class="sn">2</span>${P.icon.game}<span><b>${e(t("play"))}</b><small>Echo Gates</small></span></li>
          </ol>
          <a class="w-cta" href="#/learn/${nt.id}"><span class="cta-t"><small>${e(t("continueTo"))}</small><b>${nt.id} · ${e(nt.title)}</b></span><span class="go">${P.icon.play}</span></a>
        </div>
      </section>
      <nav class="w-regions" aria-label="${e(t("regions"))}">${LV.map((id, i) => { const R = P.region(id);
        return `<a href="#/level/${id}" class="rg ${id === level ? "on" : ""}" aria-current="${id === level ? "page" : "false"}" style="${bgImg(R.img)}">
          <span class="rg-lv">${id}</span><span class="rg-n">${e(R.name.en)}</span><span class="rg-s">${P.icon.star}${lvStars(id)}/${lvMax(id)}</span></a>`; }).join("")}</nav>
      <main id="main" tabindex="-1" class="w-main xpl">
        <header class="rg-band" style="${bgImg(RG.img)}">
          <div class="rg-band-in"><p class="rg-kick">${level} · ${e(L.title)}</p><h2>${e(RG.name.en)}</h2><div class="rg-line">${P.bi(RG.line)}</div>
            <p class="lvmeta">${list.length} ${e(t("topics"))} · ${P.icon.star} ${totalStars}/${list.length * 3}</p></div>
          ${P.waveSvg("rg-wave")}
        </header>
        ${P.says("dexter", "guide", P.T.guideHome, "home-guide")}
        <ol class="topics t-path">${list.map((T, i) => { const st = P.stars(T.id); const learned = P.state.learned[T.id]; const done = P.topicDone(T.id);
          return `<li class="topic ${done ? "done" : ""} ${T.id === nt.id ? "next-up" : ""}"><span class="stop" aria-hidden="true">${P.bubbleSvg("stop-b")}<b>${i + 1}</b></span>
            <div class="tinfo"><span class="tid">${T.id}</span><div><h3>${e(T.title)}</h3>${P.trs(T.title_t, "p", "sup ttr")}<p class="tout">${e(T.outcome.en)}</p>${P.trs(T.outcome, "p", "sup tout")}</div></div>
            <div class="tact"><a class="btn learn ${learned ? "seen" : ""}" href="#/learn/${T.id}">${P.icon.book}<span>${e(t("learn"))}</span>${learned ? `<i class="ok" aria-label="${e(t("seen"))}">✓</i>` : ""}</a>
            <a class="btn playb" href="#/play/${T.id}">${P.icon.game}<span>${e(t("play"))}</span>${starRow(st)}</a></div></li>`; }).join("")}</ol>
      </main><footer class="foot"><p>${e(t("synth"))}</p></footer></div>`; // порт: без «Сбросить прогресс» — прогресс общий с аккаунтом
    bindHeader(); voiceAlert();
  }

  // ---------------------------------------------------------------- Learn stage (v3: complete explanation)
  const NOTE_ICON = { exception: "!", mistake: "✗", tip: "✓", accent: "⇄" };
  const NOTE_AV = { exception: ["dexter", "think"], mistake: ["aizere", "explain"], tip: ["spark", "thumb"], accent: ["luna", "front"] };
  const av = (who, pose) => `<span class="av">${P.mascot(who, pose)}</span>`;
  const audioRow = (T, list) => list.length ? `<div class="hearrow">${list.map((a) => Array.isArray(a)
      ? `<span class="pairbtn"><button class="say" data-say="${e(a[0])}">${P.icon.speaker}<span>${e(a[0])}</span></button><button class="say" data-say="${e(a[1])}">${P.icon.speaker}<span>${e(a[1])}</span></button><button class="both" data-pair="${e(a[0])}|${e(a[1])}">${e(t("both"))}</button></span>`
      : `<button class="say" data-say="${e(a)}">${P.icon.speaker}<span>${e(a)}</span>${P.ipa(T, a) && a.split(" ").length < 3 ? `<span class="ipa">/${e(P.ipa(T, a))}/</span>` : ""}</button>`).join("")}</div>` : "";
  const optText = (o) => (typeof o === "string" ? e(o) : `${e(o.en)}${P.trs(o, "span", "sup")}`);
  const WIDE = new Set(["alphabet", "anatomy"]);
  // the one button that leads from the explanation into the game (portal transition, progress already saved)
  const practiseBtn = (T, cls = "") => `<a class="practise portal-go ${cls}" href="#/play/${T.id}"><span class="pr-orb" aria-hidden="true">${P.icon.game}</span><span class="pr-t"><b>${e(t("letsPractise"))}</b><small>${e(t("enterWorld"))} · Echo Gates</small></span><span class="pr-go" aria-hidden="true">${P.icon.play}</span></a>`;
  P.practiseBtn = practiseBtn;
  function learn(T, idx = 0) {
    const L = T.learn; const hasMist = L.mistakes && L.mistakes.length, hasCheck = L.check && L.check.length;
    const screens = ["intro", ...L.beats.map((_, i) => "b" + i), ...(hasMist ? ["mist"] : L.watch ? ["watch"] : []), ...(hasCheck ? ["check"] : []), "end"];
    idx = Math.max(0, Math.min(idx, screens.length - 1)); const sc = screens[idx];
    P.state.last = T.id; if (sc === "end") P.state.learned[T.id] = true; P.save();
    let body = "";
    if (sc === "intro") {
      body = `<div class="l-introgrid"><div class="l-intro"><div class="xhead"><p class="kicker">${T.id} · ${e(LEVEL_NAME[T.level].title)}</p>${P.trBar()}</div><h1>${e(T.title)}</h1>${P.trs(T.title_t, "p", "sup big")}
        ${P.says("dexter", "guide", L.hook, "hook")}
        <div class="goal"><small>${e(t("goal"))}</small>${P.bi(T.outcome)}</div>
        ${L.terms && L.terms.length ? `<section class="terms"><h2>${e(t("terms"))}</h2><dl>${L.terms.map((x) => `<div class="term"><dt>${e(x.term)}</dt><dd>${P.bi(x.def)}</dd></div>`).join("")}</dl></section>` : ""}</div>
        <aside class="plan" style="${bgImg(P.region(T.level).img)}"><div class="plan-top"><span class="plan-k">${T.level} · ${e(P.region(T.level).name.en)}</span></div><div class="plan-in"><h2>${e(t("inLesson"))}</h2><ol>${L.beats.map((B, i) => `<li><a href="#/learn/${T.id}/${i + 1}">${e(B.title.en)}</a></li>`).join("")}
          ${hasMist ? `<li><a href="#/learn/${T.id}/${screens.indexOf("mist")}">${e(t("mistakes"))}</a></li>` : ""}${hasCheck ? `<li><a href="#/learn/${T.id}/${screens.indexOf("check")}">${e(t("check"))}</a></li>` : ""}
          <li class="plan-game"><a href="#/play/${T.id}">${P.icon.game}<span>${e(t("playGame"))} · Echo Gates</span></a></li></ol></div></aside></div>`;
    } else if (sc[0] === "b") {
      const bi = +sc.slice(1), B = L.beats[bi]; const vw = P.visualWords(B.visual);
      const extra = (B.audio || []).filter((a) => (Array.isArray(a) ? !(vw.has(a[0]) && vw.has(a[1])) : !vw.has(a)));
      const wide = WIDE.has(B.visual.kind);
      const head = `<div class="xhead"><p class="kicker">${bi + 1} / ${L.beats.length}</p>${P.trBar()}</div><h2>${e(B.title.en)}</h2>${P.trs(B.title, "p", "sup")}${P.bi(B.text, "lead")}`;
      const rest = `${B.steps && B.steps.length ? `<div class="steps"><h3>${av("dexter", "think")}${e(t("howTo"))}</h3><ol>${B.steps.map((s) => `<li>${P.bi(s)}</li>`).join("")}</ol></div>` : ""}
        ${B.listen ? `<div class="listenfor"><h3>${av("luna", "listen")}<span>${e(t("listenFor"))}</span></h3>${P.bi(B.listen)}</div>` : ""}
        ${audioRow(T, extra)}
        ${B.note ? `<aside class="note n-${e(B.note.kind)}"><h3>${av(...(NOTE_AV[B.note.kind] || ["dexter", "think"]))}<span class="ni" aria-hidden="true">${NOTE_ICON[B.note.kind] || "i"}</span>${e(t("note_" + B.note.kind))}</h3>${P.bi(B.note.text)}</aside>` : ""}`;
      const vis = `<div class="visual">${P.renderVisual(B.visual, T)}</div>`;
      body = wide
        ? `<article class="beat wide"><div class="btext">${head}</div>${vis}<div class="btext brest">${rest}</div></article>`
        : `<article class="beat">${vis}<div class="btext">${head}${rest}</div></article>`;
    } else if (sc === "mist") {
      body = `<div class="l-mist"><div class="xhead xh2"><h2>${e(t("mistakes"))}</h2>${P.trBar()}</div>${P.says("aizere", "explain", P.T.mistIntro, "mist-guide")}<ol class="mlist">${L.mistakes.map((m) => `<li class="mcard"><div class="mm"><span class="mi bad" aria-hidden="true">✗</span><div><small>${e(t("mistake"))}</small>${P.bi(m.mistake)}</div></div><div class="mf"><span class="mi good" aria-hidden="true">✓</span><div><small>${e(t("fixIt"))}</small>${P.bi(m.fix)}</div></div></li>`).join("")}</ol></div>`;
    } else if (sc === "watch") {
      body = `<div class="l-watch"><span class="wicon" aria-hidden="true">!</span><div class="xhead xh2"><h2>${e(t("watch"))}</h2>${P.trBar()}</div>${P.bi(L.watch, "lead")}</div>`;
    } else if (sc === "check") {
      body = `<div class="l-check"><div class="xhead xh2"><h2>${e(t("check"))}</h2>${P.trBar()}</div>${P.says("spark", "fist", P.T.checkIntro, "ck-guide")}<div id="ck"></div></div>`;
    } else {
      const ty = L.tryit;
      body = `<div class="l-end">${L.summary && L.summary.length ? `<section class="remember"><div class="xhead xh2"><h2>${e(t("remember"))}</h2>${P.trBar()}</div><ul>${L.summary.map((s) => `<li>${P.bi(s)}</li>`).join("")}</ul></section>` : ""}
        ${ty ? `<section class="tryit"><h2>${P.icon.mic}<span>${e(t("tryit"))}</span></h2><p class="muted">${e(t("tryText"))}</p>
          <p class="trysay">${e(ty.say)}</p>
          <div class="tryrow"><button class="say" data-say="${e(ty.say)}">${P.icon.speaker}<span>${e(t("model"))}</span></button><button class="say slowp" data-say="${e(ty.say)}">${e(t("slow"))}</button>
          <button class="rec" id="rec" aria-pressed="false"><span class="dot"></span><span class="rl">${e(t("record"))}</span></button><button class="say" id="mine" hidden>${P.icon.speaker}<span>${e(t("mine"))}</span></button></div>
          <div class="trycheck" id="tc" hidden>${P.bi(ty.listen, "q")}<div class="yn"><button class="btn sm" data-v="1">${e(t("yes"))}</button><button class="btn sm" data-v="0">${e(t("notYet"))}</button></div><p class="trymsg" id="tm" aria-live="polite"></p></div>
          <p class="fine">${e(t("selfNote"))}</p></section>` : ""}
        <section class="toplay" style="${bgImg(P.region(T.level).img)}">${P.floaters(10, 7, "tp-float")}<div class="tp-in"><p class="tp-k"><span class="tp-done">✓</span> ${e(t("explDone"))} · ${e(t("stage2"))}</p><p class="tp-l">${e(t("learnedIt"))}</p>
          ${practiseBtn(T)}</div><div class="tp-m">${P.mascot("spark", "jump")}${P.mascot("luna", "cheer")}</div></section></div>`;
    }
    const RG = P.region(T.level);
    app.innerHTML = `<div class="learnv">${header(true)}<div class="lbar" style="${bgImg(RG.img)}"><a class="iconb" href="#/level/${T.level}" aria-label="${e(t("close"))}">${P.icon.back}</a>
        <span class="ltitle"><small>${T.level} · ${e(RG.name.en)} · ${e(t("labName"))}</small><b>${T.id} · ${e(T.title)}</b></span>
        <span class="lprog" role="img" aria-label="${idx + 1} / ${screens.length}">${screens.map((_, i) => `<i class="${i < idx ? "on" : i === idx ? "on now" : ""}"></i>`).join("")}</span></div>
      <main id="main" tabindex="-1" class="lmain xpl">${body}</main>
      <nav class="lnav">${idx > 0 ? `<a class="btn ghost" href="#/learn/${T.id}/${idx - 1}">${P.icon.back}<span>${e(t("back"))}</span></a>` : "<span></span>"}
        ${sc !== "end" ? `<a class="btn primary" id="lnext" href="#/learn/${T.id}/${idx + 1}"><span>${e(idx === 0 ? t("start") : t("next"))}</span></a>` : `<span class="lnav-end"><a class="btn ghost" href="#/level/${T.level}">${e(t("toTopics"))}</a><a class="btn primary portal-go" href="#/play/${T.id}">${P.icon.game}<span>${e(t("letsPractise"))}</span></a></span>`}</nav></div>`;
    bindHeader(); voiceAlert(); P.bindSay(app); P.bindAlphabet(app, T); P.bindAnatomy(app);
    // fetch + decode this screen's recordings in the background, so the first tap plays at once (external-assets build)
    setTimeout(() => P.preloadGameAudio([...app.querySelectorAll("[data-say]")].map((b) => P.audioId(P.cue(b.dataset.say), b.dataset.acc || undefined)).slice(0, 40)), 300);
    bindPortals(app); P.calmSvg(app);
    $("#main").focus({ preventScroll: true });
    if (sc === "check") runCheck(T, screens);
    if (sc === "end" && L.tryit) bindTry();
  }
  // guided practice: one question at a time, immediate feedback with the reason; never blocks navigation
  function runCheck(T, screens) {
    const Q = T.learn.check, box = $("#ck"); let i = 0, first = 0;
    const ask = () => {
      if (i >= Q.length) {
        const all = first === Q.length;
        box.innerHTML = `<div class="ck-end">${all ? `<div class="ck-cheer">${P.mascot("spark", "jump")}${P.mascot("aizere", "cheer")}</div>` : ""}<p class="ck-score"><b>${first} / ${Q.length}</b> ${e(t("firstTry"))}</p><p>${e(all ? t("checkGood") : t("checkReview"))}</p>
          <div class="ck-act">${all ? "" : `<a class="btn ghost" href="#/learn/${T.id}/1">${e(t("reviewLearn"))}</a><button class="btn ghost" id="ckagain">${e(t("checkAgain"))}</button>`}</div>${practiseBtn(T, "sm")}</div>`;
        bindPortals(box); const ag = $("#ckagain"); if (ag) ag.onclick = () => { i = 0; first = 0; ask(); };
        return;
      }
      const q = Q[i]; let tried = false, done = false;
      box.innerHTML = `<div class="ck-q" data-i="${i}"><p class="ck-n">${e(t("question"))} ${i + 1} / ${Q.length}</p><div class="ck-text">${P.bi(q.q, "lead")}</div>
        ${q.say ? `<button class="say big" data-say="${e(q.say)}">${P.icon.speaker}<span>${e(t("hear"))}</span></button>` : ""}${q.show ? `<p class="ck-show">${e(q.show)}</p>` : ""}
        <div class="ck-opts">${q.options.map((o, k) => `<span class="ck-o"><button class="btn opt" data-k="${k}">${optText(o)}</button>${q.play && typeof o === "string" ? `<button class="iconb say" data-say="${e(o)}" aria-label="${e(t("hear"))}: ${e(o)}">${P.icon.speaker}</button>` : ""}</span>`).join("")}</div>
        <div class="ck-fb" aria-live="polite"></div></div>`;
      P.bindSay(box);
      if (q.say) setTimeout(() => { const hb = box.querySelector(".say.big"); if (hb && hb.isConnected) P.sound(hb, () => P.play(q.say)); }, 250);
      box.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
        if (done) return; const k = +b.dataset.k, ok = k === q.answer; const fb = box.querySelector(".ck-fb");
        if (!tried) answered(ok); // порт: первый ответ на вопрос — в навык «слушание»
        if (ok) { done = true; if (!tried) first++; b.classList.add("right"); P.tone("good");
          fb.innerHTML = `<div class="ck-say good">${P.mascot("spark", "thumb", "mini")}<div><p class="good"><b>${e(t("right"))}</b></p>${P.bi(q.why)}</div></div><button class="btn primary" id="cknext">${e(i + 1 < Q.length ? t("nextQ") : t("results"))}</button>`;
          box.querySelectorAll(".opt").forEach((x) => (x.disabled = true)); $("#cknext").onclick = () => { i++; ask(); }; $("#cknext").focus();
        } else { tried = true; b.classList.add("wrong"); b.disabled = true; P.tone("soft");
          fb.innerHTML = `<div class="ck-say bad">${P.mascot("luna", "kind", "mini")}<p class="bad"><b>${e(t("notQuite"))}</b> ${e(t("tryOther"))}</p></div>`; }
      }));
    };
    ask();
  }
  function bindTry() {
    const rb = $("#rec"); let url = null, on = false;
    rb.onclick = async () => {
      if (on) { P.rec.stop(); return; }
      try { on = true; rb.classList.add("on"); rb.setAttribute("aria-pressed", "true"); rb.querySelector(".rl").textContent = t("stop");
        url = await P.rec.start(); if (!rb.isConnected || !url) return; on = false; rb.classList.remove("on"); rb.setAttribute("aria-pressed", "false"); rb.querySelector(".rl").textContent = t("record");
        const m = $("#mine"); m.hidden = false; m.onclick = () => { m.classList.add("playing"); P.rec.play(url).then(() => m.classList.remove("playing")); }; $("#tc").hidden = false; P.rec.play(url); }
      catch (err) { on = false; rb.disabled = true; rb.classList.remove("on"); rb.querySelector(".rl").textContent = t("noMic"); }
    };
    $$("#tc [data-v]").forEach((b) => (b.onclick = () => { $$("#tc [data-v]").forEach((x) => x.classList.toggle("sel", x === b)); $("#tm").textContent = b.dataset.v === "1" ? t("tryYes") : t("tryNo"); }));
  }
  on(ROOT, "keydown", (ev) => {
    if (!$(".learnv") || /input|select|textarea/i.test(ev.target.tagName) || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    if (ev.key === "ArrowRight") { const n = $("#lnext"); if (n) { ev.preventDefault(); go(n.getAttribute("href")); } }
    if (ev.key === "ArrowLeft") { const b = $(".lnav .ghost"); if (b && b.getAttribute("href").includes("/learn/")) { ev.preventDefault(); go(b.getAttribute("href")); } }
  });

  // ---------------------------------------------------------------- router
  function route() {
    P.stopAudio(); P.rec.cancel(); P.reload();
    let h = HASH.replace(/^#/, ""); try { h = decodeURIComponent(h); } catch (e) {}
    let m;
    if ((m = h.match(/^\/learn\/([A-C]\d\.\d+)(?:\/(\d+))?/)) && byId(m[1])) return learn(byId(m[1]), m[2] ? +m[2] : 0);
    if ((m = h.match(/^\/play\/([A-C]\d\.\d+)(?:\/(\d))?/)) && byId(m[1])) return P.openGame(byId(m[1]), m[2] != null ? +m[2] : null);
    if ((m = h.match(/^\/level\/([A-C]\d)/))) return home(m[1]);
    home();
  }
  P.route = route; P.byId = byId;
  route();
})();
on(ROOT, 'click', (ev) => {
  if (ev.defaultPrevented) return // «портал» (.portal-go) сам ведёт роутер после вспышки
  const a = ev.target && ev.target.closest ? ev.target.closest('a[href^="#/"]') : null
  if (!a || !ROOT.contains(a)) return
  ev.preventDefault()
  go(a.getAttribute('href'))
})
return {
  go,
  P: PRON,
  /** Для экрана и тестов: адрес движка. */
  snapshot: () => ({ hash: HASH }),
  destroy() {
    if (dead) return
    try { PRON.stopGame && PRON.stopGame() } catch (e) { /* раунда нет */ }
    try { PRON.stopAudio() } catch (e) { /* звука нет */ }
    try { PRON.rec.cancel(); PRON.rec.release(); PRON.rec.forget() } catch (e) { /* микрофона нет */ }
    dead = true
    ac.abort()
    for (const id of timers) globalThis.clearTimeout(id)
    timers.clear()
    try { if (PRON.actx && PRON.actx() && PRON.actx().close) PRON.actx().close().catch(() => {}) } catch (e) { /* контекста нет */ }
    for (const u of Object.values(PRON.ASSETS)) if (typeof u === 'string' && u.startsWith('blob:')) try { URL.revokeObjectURL(u) } catch (e) { /* уже отпущен */ }
    ROOT.innerHTML = ''
    delete ROOT.dataset.tr
    delete ROOT.dataset.audio
  },
}
}
