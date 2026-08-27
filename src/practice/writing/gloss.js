// Встроенный словарь-подстрочник — порт из data/jtswriting.html (10042–10131).
// Прототип держал один глобальный GLOSS на все уровни и лениво его кешировал;
// здесь словарь собирается из ОДНОГО уровня (его JSON и так грузится целиком
// для тренажёра) — кеширование отдаёт вызывающий код. Регексы нормализации —
// дословно из прототипа: они согласованы с тем, какими ключами словарь
// наполнялся, менять их можно только парой.

// Прототип 10042–10084 — дословно: [ru, kk] для строк интерфейса, чтобы
// перевод подписей не ходил в сеть.
export var UI_GLOSS = {
  "levels": ["уровни", "деңгейлер"],
  "genres": ["жанры", "жанрлар"],
  "writing pad": ["блокнот", "блокнот"],
  "my work": ["мои работы", "менің жұмыстарым"],
  "check": ["проверить", "тексеру"],
  "check it": ["проверить", "тексеру"],
  "next": ["дальше", "әрі қарай"],
  "back": ["назад", "артқа"],
  "why this matters": ["зачем это нужно", "бұл не үшін керек"],
  "the model text": ["модельный текст", "үлгі мәтін"],
  "words and phrases": ["лексика и фразы", "сөздер мен тіркестер"],
  "linking words": ["связки", "байланыстырғыш сөздер"],
  "sentence practice": ["микро-задания", "сөйлем деңгейі"],
  "paragraph practice": ["уровень абзаца", "абзац деңгейі"],
  "planning": ["планирование", "жоспарлау"],
  "your own text": ["свой текст", "өз мәтінің"],
  "your task": ["твоя задача", "сенің тапсырмаң"],
  "correct": ["верно", "дұрыс"],
  "not quite": ["не совсем", "толық емес"],
  "checklist": ["чек-лист", "тізім"],
  "phrase bank": ["банк фраз", "тіркестер банкі"],
  "my words": ["мои слова", "менің сөздерім"],
  "plan": ["план", "жоспар"],
  "save draft": ["сохранить черновик", "жобаны сақтау"],
  "version history": ["история версий", "нұсқалар тарихы"],
  "timer": ["таймер", "таймер"],
  "download .txt": ["скачать .txt", ".txt жүктеу"],
  "copy": ["копировать", "көшіру"],
  "words": ["слова", "сөздер"],
  "sentences": ["предложения", "сөйлемдер"],
  "characters": ["знаки", "таңбалар"],
  "score yourself": ["оцени себя", "өзіңді бағала"],
  "task achieved": ["задание раскрыто", "тапсырма орындалды"],
  "organisation": ["структура", "құрылым"],
  "vocabulary": ["лексика", "сөздік қор"],
  "grammar": ["грамматика", "грамматика"],
  "three steps to the next level": ["три шага к следующему уровню", "келесі деңгейге үш қадам"],
  "what worked": ["что получилось", "не сәтті шықты"],
  "what to fix": ["что поправить", "нені түзету керек"],
  "before": ["было", "бұрын"],
  "after": ["стало", "кейін"]
};

// Порт buildGloss (прототип 10086–10105) на данные одного уровня: UI-строки,
// затем words-тройки и phr-тройки каждого сида. Порядок важен — первый
// положивший ключ выигрывает (как в прототипе). Ключ нормализуется как в
// прототипе: lowercase, срез хвостовых точек/многоточий (фразы банка
// оканчиваются на «…»), trim. HOWTO-подсказки прототипа сюда не переносим —
// их в данных уровня нет.
export function buildGloss(levelData) {
  var gloss = {};
  function put(en, ru, kk, src) {
    var key = String(en).toLowerCase().replace(/[….]+$/, "").trim();
    if (!key || gloss[key]) return;
    gloss[key] = { ru: ru, kk: kk, src: src };
  }
  Object.keys(UI_GLOSS).forEach(function (k) { put(k, UI_GLOSS[k][0], UI_GLOSS[k][1], "ui"); });
  ((levelData && levelData.seeds) || []).forEach(function (seed) {
    (seed.words || []).forEach(function (w) { put(w[0], w[1], w[2], "word"); });
    (seed.phr || []).forEach(function (grp) {
      (grp[1] || []).forEach(function (p) { put(p[0], p[1], p[2], "phrase"); });
    });
  });
  return gloss;
}

// Порт glossLookup (прототип 10107–10116): точный ключ → срез пунктуации по
// краям → грубое единственное число (ies→y, -s). Каскад дословный — он
// подобран под то, как слова встречаются в живом тексте.
export function glossLookup(gloss, text) {
  var key = String(text).toLowerCase().replace(/[….]+$/, "").trim();
  if (gloss[key]) return gloss[key];
  var stripped = key.replace(/^[^a-zа-яё0-9]+|[^a-zа-яё0-9]+$/gi, "");
  if (gloss[stripped]) return gloss[stripped];
  var singular = stripped.replace(/(ies)$/, "y").replace(/([^s])s$/, "$1");
  if (gloss[singular]) return gloss[singular];
  return null;
}

// Порт wordByWord (прототип 10119–10131): подстрочник по словам, честно
// помеченный src:"gloss" как приблизительный. Незнакомые слова остаются
// как есть, пробельные прогоны схлопываются в один пробел (так в исходнике);
// если не нашлось ни одного слова — null, чтобы UI не показывал «перевод»,
// совпадающий с оригиналом.
export function wordByWord(gloss, text) {
  var tokens = String(text).split(/(\s+)/);
  var ru = [], kk = [], hits = 0;
  tokens.forEach(function (t) {
    if (/^\s+$/.test(t)) { ru.push(" "); kk.push(" "); return; }
    var found = glossLookup(gloss, t);
    if (found) { hits++; ru.push(found.ru); kk.push(found.kk); }
    else { ru.push(t); kk.push(t); }
  });
  if (!hits) return null;
  return { ru: ru.join(""), kk: kk.join(""), src: "gloss" };
}
