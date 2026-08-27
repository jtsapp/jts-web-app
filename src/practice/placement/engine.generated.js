/* eslint-disable */
// СГЕНЕРИРОВАНО scripts/extract-placement.js — руками не править.
//
// Расчётная часть теста на определение уровня, перенесённая из бандла школы
// один в один: IRT-оценка (3PL + EAP по сетке), отбор заданий по блокам,
// ветвление на A0, LexTALE со скорингом и инвалидацией, проверка открытых
// ответов, оценка письма и говорения. Формулы не тронуты — расхождение с
// источником ловит placementParity.test.js, который гоняет обе реализации
// на одних сидах.
//
// Данные (BANK / BANK2 / MANIFEST / VOCAB) сюда не вшиты: их отдаёт
// public/practice/placement/bank.json через createEngine().
// ============================================================
// JTS Placement — самодостаточный офлайн-раннер.
// Банк: items.json v0.1 (2026-08-24), 167 заданий.
// Аудио: относительные пути к папке jts-bank/ рядом с файлом.
// Никакого localStorage/sessionStorage, никаких внешних зависимостей.
// ============================================================

// ============================================================
// BANK_PATCHES — результат ручного аудита дистракторов (см. PLACEMENT_SPEC.md,
// раздел «Аудит дистракторов»). Банк items.json вшит без изменений; патчи
// применяются при загрузке функцией applyBankPatches() и перечислены в экспорте
// сессии. Ничего не переписано молча.
// ============================================================
const BANK_PATCHES = [
  // --- A. Семантические кластеры (два дистрактора снимаются разом) ---
  {
    id: 'r-a2-01a', kind: 'option', optIndex: null, // индекс ищется по тексту
    findText: 'The canteen will be open longer in the evening.',
    replace: { t: 'The kitchen will take orders later.', m: 'Взял деталь последнего абзаца и перевернул её' },
    reason: 'Кластер с «The canteen will close later» — оба означают «дольше/позже», снимаются одним решением'
  },
  {
    id: 'l-c1-03a', kind: 'option', optIndex: null,
    findText: 'Employment data rule a recession out.',
    replace: { t: 'Consumer spending will decide whether there is a recession.', m: 'Возвёл пример индикатора в критерий ответа' },
    reason: 'Кластер с «A recession is unlikely» — оба читаются как «нет», снимаются разом'
  },
  // --- C. Грамматически неправдоподобный дистрактор ---
  {
    id: 'rt-b2-01', kind: 'option', optIndex: null,
    findText: 'have known',
    replace: { t: 'to have known', m: 'Перфектный инфинитив после глагола, требующего герундий' },
    reason: '«She denied have known» не производится студентами — балласт; «to have known» — реальная ошибка'
  },
  // --- D. Пропущенные допустимые ответы (верный ответ не должен считаться ошибкой) ---
  { id: 'u-a2-01', kind: 'answer', add: ['less'], reason: '«less expensive than» полностью корректно' },
  { id: 'u-a2-05', kind: 'answer', add: ['may', 'can'], reason: '«You may not smoke» / «You can not smoke» корректны' },
  { id: 'u-b1-05', kind: 'answer', add: ['calling', 'booking', 'ordering', 'hiring', 'sharing', 'catching'], reason: 'suggest + любой уместный герундий' },
  { id: 'u-b1-06', kind: 'answer', add: ['little'], reason: '«There is little point» корректно' },
  { id: 'u-b1-12', kind: 'answer', add: ['upon'], reason: 'depend upon' },
  { id: 'u-b2-03', kind: 'answer', add: ['Nonetheless', 'Yet'], reason: 'уступительные коннекторы того же слота' },
  { id: 'u-c1-02', kind: 'answer', add: ['however', 'nevertheless', 'nonetheless', 'still'], reason: 'слот после «;» принимает и обычные уступительные — отклонять верное нельзя; сужение конструкта решается на пилоте' },
  { id: 'u-c1-04', kind: 'answer', add: ['despite', 'notwithstanding'], reason: '«taken despite the objections» корректно' },
  { id: 'u-c1-08', kind: 'answer', add: ['is little likelihood that', 'is little likelihood'], reason: 'эквивалентная реализация с LITTLE' },
  // --- D*. Стем без сигнала отрицания ---
  {
    id: 'u-a1-04', kind: 'stem',
    findText: 'He ___ like coffee.',
    replace: 'He ___ like coffee. He never drinks it.',
    reason: 'Без контекста «does/would/might» тоже грамматичны; вторая фраза мотивирует отрицание, конструкт сохранён'
  }
];

function applyBankPatches(bank) {
  const applied = [];
  const byId = {};
  bank.items.forEach(it => { byId[it.id] = it; });
  BANK_PATCHES.forEach(p => {
    const it = byId[p.id];
    if (!it) return;
    if (p.kind === 'option' && it.options) {
      const i = it.options.findIndex(o => o.t === p.findText);
      if (i >= 0 && i !== it.key) { it.options[i] = { t: p.replace.t, m: p.replace.m }; applied.push(p.id); }
    } else if (p.kind === 'answer' && Array.isArray(it.answer)) {
      p.add.forEach(a => { if (!it.answer.includes(a)) it.answer.push(a); });
      applied.push(p.id);
    } else if (p.kind === 'stem' && it.stem === p.findText) {
      it.stem = p.replace; applied.push(p.id);
    }
  });
  return applied;
}




// Раздел слов: слово -> значения на ru/kk/en (по диапазонам Zipf-частоты банка)

// Дополнительный банк v2: minimal pairs, видеоклипы, listening из материалов
// владельца, интерактивная грамматика (см. PLACEMENT_SPEC, раздел v2)


// ============================================================
// ЯДРО: чистая логика, без DOM. Работает и в браузере, и в node
// (валидационные прогоны). Всё состояние сессии — в объекте Session.
// ============================================================

// ---------- CUTS: ВРЕМЕННЫЕ cut-scores до пилота ----------
// Меняются одной правкой здесь. Совпадают с levelLadder банка.
const CUTS = {
  provisional: true, // показывается в UI как «временные»
  bounds: [ // [нижняя граница θ, бакет]
    [-Infinity, 'A0'],
    [-2.5, 'A1'],
    [-1.8, 'A2'],
    [-1.0, 'B1'],
    [0.0, 'B2'],
    [1.0, 'C1'],
    [2.0, 'C2']
  ]
};

// Временные якоря трудности для pilot mode: середины зон levelLadder.
// НЕ записываются в items[].irt.b и НЕ выдаются за калибровку.
// После пилота selectNext()/provisionalB() заменяются на калиброванные b и MFI.
const PROVISIONAL_B = { A1: -2.15, A2: -1.4, B1: -0.5, B2: 0.5, C1: 1.5, C2: 2.5 };
const PROVISIONAL_A = 1.0;

// Целевой хронометраж (справочно, ~15 минут). Обратного отсчёта и
// принудительных переходов в UI НЕТ — студент идёт в своём темпе,
// время на задание пишется в лог для калибровки.
const TARGET_TIME = { totalMin: 15 };

const THETA0_BY_CANDO = [-2.0, -1.2, -0.4, 0.4, 1.2];

// ---------- Два варианта теста ----------
// express ~15 мин: адаптивное ядро, ориентировочный общий уровень.
// full 35–45 мин: больше заданий в каждом разделе + видеоклипы + говорение,
// профиль по навыкам (аудирование/грамматика/чтение отдельно).
const VARIANTS = {
  express: {
    label: '15', minpair: 6, listenSources: 2, listenMax: 6, clips: 0, readTexts: 1,
    uoe: 8, uoeOrder: 1, uoeBankfill: 1, uoeMatch: 0, speaking: 0, skillProfile: false
  },
  full: {
    label: '40', minpair: 10, listenSources: 4, listenMax: 12, clips: 4, readTexts: 2,
    uoe: 12, uoeOrder: 2, uoeBankfill: 2, uoeMatch: 1, speaking: 2, skillProfile: true
  }
};

// ---------- Слияние дополнительного банка v2 (материалы владельца) ----------
// Ничего в исходном BANK не перезаписывается — только добавление новых
// элементов с собственными id. Обратимо удалением bank2.
function mergeBank2(bank, manifest, bank2) {
  if (!bank2 || bank._bank2merged) return;
  bank._bank2merged = true;
  const S2O = arr => arr.map(t => ({ t }));
  // 1) listening2: mcq/who -> обычные listening-задания; tfns/order — со своим type
  (bank2.listening2.sources || []).forEach(s => {
    manifest.sources.push({
      id: s.id, level: s.level, file: s.file,
      playsAllowed: ['A1', 'A2', 'B1'].includes(s.level) ? 2 : 1,
      durationSec: s.durationSec || null, lines: s.lines || null,
      lineTimecodes: null, reconstructed: false, owner: true
    });
  });
  (bank2.listening2.items || []).forEach(q => {
    const it = { id: q.id, block: 'listening', level: q.level, source: q.source, type: q.type };
    if (q.type === 'mcq' || q.type === 'who') {
      it.stem = q.stem; it.options = S2O(q.options); it.key = q.key;
      it.construct = q.type === 'who' ? 'listening.who' : 'listening.detail';
    } else if (q.type === 'tfns') {
      it.stem = ''; it.statements = q.statements; it.construct = 'listening.tfns';
    } else if (q.type === 'order') {
      it.stem = q.stem; it.steps = q.steps; it.construct = 'listening.sequence';
    }
    bank.items.push(it);
  });
  // 2) видеоклипы: block 'clip'
  (bank2.clips.sources || []).forEach(s => {
    manifest.sources.push({
      id: s.id, level: s.level, file: s.file, video: true,
      playsAllowed: 2, durationSec: s.durationSec || null,
      lines: [{ i: 0, speaker: '', text: s.transcript }], reconstructed: false, owner: true
    });
  });
  (bank2.clips.items || []).forEach(q => {
    bank.items.push({ id: q.id, block: 'clip', level: q.level, source: q.source,
      stem: '', options: S2O(q.options), key: q.key, construct: 'listening.decoding' });
  });
  // 3) minimal pairs: block 'minpair'; аудио pairs/<id>.mp3, фоллбэк — TTS
  (bank2.minpairs || []).forEach(p => {
    bank.items.push({ id: p.id, block: 'minpair', level: p.level,
      word: p.word, distractor: p.distractor, sentence: p.sentence || null,
      file: 'pairs/' + p.id + '.mp3', construct: 'listening.phoneme' });
  });
  // 4) интерактивная грамматика: block 'uoe2'
  (bank2.interactive.order || []).forEach(o => {
    bank.items.push({ id: o.id, block: 'uoe2', type: 'order', level: o.level,
      answer: o.answer, construct: 'grammar.word_order', constructFamily: 'word_order' });
  });
  (bank2.interactive.bankfill || []).forEach(b => {
    bank.items.push({ id: b.id, block: 'uoe2', type: 'bankfill', level: b.level,
      text: b.text, bankWords: b.bank, answers: b.answers, construct: 'grammar.bankfill', constructFamily: 'cohesion' });
  });
  (bank2.interactive.match || []).forEach(m => {
    bank.items.push({ id: m.id, block: 'uoe2', type: 'match', level: m.level,
      pairs: m.pairs, kind: m.kind, construct: 'pragmatics.match', constructFamily: 'pragmatics' });
  });
}

// ---------- Оценка интерактивных форматов (частичный зачёт 0..1) ----------
// Порядок слов: точное совпадение = 1; иначе доля верных биграмм × 0.5
// (собранное «почти верно» — это всё ещё не верная фраза).
function scoreOrderWords(words, arr) {
  // words: эталонная последовательность, arr: собранная
  if (!arr || arr.length !== words.length) return 0;
  if (words.every((w, i) => arr[i] === w)) return 1;
  let good = 0;
  for (let i = 0; i + 1 < words.length; i++) {
    for (let j = 0; j + 1 < arr.length; j++) {
      if (arr[j] === words[i] && arr[j + 1] === words[i + 1]) { good++; break; }
    }
  }
  return 0.5 * good / (words.length - 1);
}
function scoreBankfill(item, answers) {
  const n = item.answers.length;
  let c = 0;
  for (let i = 0; i < n; i++) if ((answers || [])[i] === item.answers[i]) c++;
  return n ? c / n : 0;
}
function scoreMatch(item, mapping) {
  // mapping: для каждой левой части — индекс выбранной правой (или null)
  const n = item.pairs.length;
  let c = 0;
  for (let i = 0; i < n; i++) if ((mapping || [])[i] === i) c++;
  return n ? c / n : 0;
}
function scoreTfns(item, answers) {
  const n = item.statements.length;
  let c = 0;
  for (let i = 0; i < n; i++) if ((answers || [])[i] === item.statements[i].key) c++;
  return n ? c / n : 0;
}

// ---------- RNG: mulberry32, seed фиксируется на сессию ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- θ: EAP по сетке, 3PL ----------
const GRID = (() => { const g = []; for (let i = 0; i <= 160; i++) g.push(-4 + i * 0.05); return g; })();

function p3pl(theta, a, b, c) {
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}
function itemB(item) {
  // pilot mode: b == null -> временный якорь по уровню
  return (item.irt && item.irt.b != null) ? item.irt.b : PROVISIONAL_B[item.level];
}
function itemA(item) {
  return (item.irt && item.irt.a != null) ? item.irt.a : PROVISIONAL_A;
}
function itemC(item) {
  return (item.irt && item.irt.c != null) ? item.irt.c : (item.options ? 1 / item.options.length : 0);
}

// Апостериор из списка ответов. responses: [{item, correct(0..1)}], lex: {thetaEquiv, sigma}|null
function eapEstimate(theta0, responses, lex) {
  const w = new Array(GRID.length);
  let sum = 0;
  for (let i = 0; i < GRID.length; i++) {
    const t = GRID[i];
    let lw = -((t - theta0) * (t - theta0)) / 2; // приор N(theta0, 1.0), лог
    for (const r of responses) {
      const P = Math.min(0.9999, Math.max(0.0001, p3pl(t, itemA(r.item), itemB(r.item), itemC(r.item))));
      // для градуированных (writing 0..1) — псевдоправдоподобие P^s (1-P)^(1-s)
      lw += r.correct * Math.log(P) + (1 - r.correct) * Math.log(1 - P);
    }
    if (lex) lw += -((t - lex.thetaEquiv) * (t - lex.thetaEquiv)) / (2 * lex.sigma * lex.sigma);
    w[i] = lw;
  }
  const m = Math.max(...w);
  for (let i = 0; i < GRID.length; i++) { w[i] = Math.exp(w[i] - m); sum += w[i]; }
  let eap = 0;
  for (let i = 0; i < GRID.length; i++) eap += GRID[i] * w[i] / sum;
  let v = 0;
  for (let i = 0; i < GRID.length; i++) { const d = GRID[i] - eap; v += d * d * w[i] / sum; }
  return { theta: eap, se: Math.sqrt(v) };
}

function levelFromTheta(theta) {
  let lvl = 'A0';
  for (const [lo, name] of CUTS.bounds) if (theta >= lo) lvl = name;
  return lvl;
}

// ---------- Ответы на безвариантные ----------
function normAns(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '')
    .replace(/[‘’]/g, "'");
}
function checkOpenAnswer(item, text) {
  const t = normAns(text);
  if (!t) return false;
  return (item.answer || []).some(a => normAns(a) === t);
}

// ---------- Раздел слов: слово -> выбор значения ----------
// Вместо yes/no-признания (LexTALE) — matching по значениям (запрос владельца).
// Дистракторы — значения других слов того же/соседнего диапазона.
// Кнопка «Не знаю» отделяет незнание от неудачной догадки.
// Псевдослов больше нет, поэтому флаг yea_saying в этом формате не детектируется
// (честная догадка неотличима); вместо него — поправка на угадывание в балле.
function vocabDraw(vocab, theta0, rnd) {
  // vocab: {word: {band, ru, kk, en}}
  const words = Object.keys(vocab);
  const byBand = {};
  words.forEach(w => { (byBand[vocab[w].band] = byBand[vocab[w].band] || []).push(w); });
  const low = theta0 < -1.0;
  const plan = low
    ? [['B1', 4], ['B2', 4], ['B3', 4]]
    : [['B1', 2], ['B2', 2], ['B3', 2], ['B4', 2], ['B5', 2], ['B6', 2], ['B7', 2]];
  const bands = Object.keys(byBand).sort();
  const items = [];
  plan.forEach(([band, n]) => {
    seededShuffle(byBand[band] || [], rnd).slice(0, n).forEach(w => {
      // дистракторы: слова того же диапазона, при нехватке — соседние
      let pool = (byBand[band] || []).filter(x => x !== w);
      const bi = bands.indexOf(band);
      for (const d of [1, -1, 2, -2]) {
        if (pool.length >= 3) break;
        pool = pool.concat(byBand[bands[bi + d]] || []);
      }
      const distractors = seededShuffle(pool.filter(x => x !== w), rnd).slice(0, 3);
      const options = seededShuffle([w].concat(distractors), rnd);
      items.push({ w, band, options, correctIndex: options.indexOf(w) });
    });
  });
  return seededShuffle(items, rnd);
}
function vocabScore(items, answers) {
  // answers[i]: индекс опции | -1 («не знаю») | null (нет ответа)
  let correct = 0, idk = 0, guessed = 0;
  items.forEach((it, i) => {
    const a = answers[i];
    if (a === -1 || a == null) { idk++; return; }
    guessed++;
    if (a === it.correctIndex) correct++;
  });
  // поправка на угадывание при 4 опциях: c - wrong/3
  const corrected = Math.max(0, correct - (guessed - correct) / 3);
  const p = items.length ? corrected / items.length : 0;
  return {
    n: items.length, correct, idk, guessed,
    score100: Math.round(100 * p),
    invalid: false
  };
}
// Врем. отображение балла в θ-эквивалент (провизорно, калибруется на пилоте)
function lexThetaEquiv(score100) { return -3 + 5 * (score100 / 100); }
const LEX_SIGMA = 0.9;

// ---------- Оценка writing (машинное приближение рубрики 0–9) ----------
const WRITING_FORM_RX = {
  'w-a1-01': /\bi\s+(usually\s+)?(get|go|have|wake|drink|eat|start|make|take)\b/i,
  'w-a2-01': /\b(went|was|were|had|did|saw|stayed|visited|played|watched|\w{3,}ed)\b/i,
  'w-b1-01': /(\bif\b[^.!?]*\b(will|'ll|won't)\b)|(\b(will|'ll)\b[^.!?]*\bif\b)/i,
  'w-b1-02': /\b(i'?d rather|would rather|i would (choose|prefer|pick))\b/i,
  'w-b2-01': /\b(although|though|while|whereas)\b/i,
  'w-c1-01': /\b(on balance|provided( that)?|unless|would recommend|i('| wou)ld suggest)\b/i
};
function scoreWriting(item, text) {
  const t = String(text || '').trim();
  if (!t) return { task: 0, form: 0, range: 0, total: 0 };
  const supports = (item.support || []).flatMap(s => s.split('/').map(x => x.trim().toLowerCase())).filter(Boolean);
  const low = t.toLowerCase();
  const used = supports.filter(s => low.includes(s.replace(/\s+/g, ' ')));
  const task = used.length >= supports.length ? 3 : used.length >= 1 ? 2 : 1;
  const rx = WRITING_FORM_RX[item.id];
  const words = low.replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const own = words.filter(w => !supports.some(s => s.includes(w)));
  const form = rx ? (rx.test(t) ? 3 : (words.length >= (item.minWords || 5) ? 1 : 0)) : (words.length >= 5 ? 2 : 1);
  const range = own.length >= 3 ? 3 : own.length >= 1 ? 2 : (words.length ? 1 : 0);
  return { task, form, range, total: task + form + range };
}

// ---------- Оценка speaking (без ASR-accuracy) ----------
function scoreSpeaking(item, rec) {
  // rec: {durationSec, voicedSec, transcript|null}
  if (!rec) return null;
  const fluency = rec.voicedSec >= 12 ? 2 : rec.voicedSec >= 6 ? 1 : 0;
  const extension = rec.durationSec >= 20 ? 2 : rec.durationSec >= 10 ? 1 : 0;
  let construction = null; // null = ASR недоступен, критерий исключается
  if (rec.transcript != null) {
    const tr = rec.transcript.toLowerCase();
    construction = (item.expectKeywords || []).some(k => tr.includes(k.toLowerCase())) ? 1 : 0;
  }
  const max = 4 + (construction == null ? 0 : 1);
  const got = fluency + extension + (construction || 0);
  return { construction, fluency, extension, got, max };
}

// ============================================================
// Session — конечный автомат теста
// ============================================================
const BLOCK_SEQ = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'result'];

class Session {
  constructor(bank, manifest, seed, variant) {
    this.bank = bank;
    this.manifest = manifest;
    this.setVariant(variant || 'express');
    this.seed = seed >>> 0;
    this.rnd = mulberry32(this.seed);
    this.lang = 'ru';
    this.theta0 = null;
    this.responses = [];   // входят в θ
    this.log = [];         // всё, включая late и не влияющие
    this.flags = [];
    this.thetaTrace = [];
    this.used = new Set();
    this.blockIdx = 0;
    this.a0 = { branched: false, bridgePassed: null };
    this.lex = null;       // {items, result}
    this.production = { writing: null, speaking: [] };
    this.pilotMode = this.bank.items.some(it => it.irt && it.irt.b == null);
    this.est = { theta: 0, se: 1 };
    this.audioAvailable = true;
    this.micAvailable = true;
  }

  addFlag(f) { if (!this.flags.includes(f)) this.flags.push(f); }

  setVariant(v) { this.variant = v; this.cfg = VARIANTS[v] || VARIANTS.express; }

  setCanDo(idx) {
    this.theta0 = THETA0_BY_CANDO[idx];
    this.est = { theta: this.theta0, se: 1.0 };
    this.thetaTrace.push({ step: 'start', theta: this.est.theta, se: this.est.se });
  }

  updateTheta(stepLabel) {
    const lex = (this.lex && this.lex.result && !this.lex.result.invalid)
      ? { thetaEquiv: lexThetaEquiv(this.lex.result.score100), sigma: LEX_SIGMA } : null;
    this.est = eapEstimate(this.theta0, this.responses, lex);
    this.thetaTrace.push({ step: stepLabel, theta: this.est.theta, se: this.est.se });
  }

  itemsOf(block, level) {
    return this.bank.items.filter(it => it.block === block && (!level || it.level === level) && !this.used.has(it.id));
  }
  pick(arr) { return arr.length ? arr[Math.floor(this.rnd() * arr.length)] : null; }

  // --- Блок 2: роутинг — 6 из пула 12 (2×A2, 2×B1, 1×B2, 1×C1) ---
  buildRouting() {
    const plan = [['A2', 2], ['B1', 2], ['B2', 1], ['C1', 1]];
    const items = [];
    plan.forEach(([lvl, n]) => {
      const pool = seededShuffle(this.itemsOf('routing', lvl), this.rnd);
      items.push(...pool.slice(0, n));
    });
    return seededShuffle(items, this.rnd);
  }

  // --- Блок 3: listening — 2 источника ~5 ответов на текущем уровне ---
  buildListening() {
    const lvl = this.clampLevel(levelFromTheta(this.est.theta), ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    let srcIds = [...new Set(this.bank.items.filter(it => it.block === 'listening').map(it => it.source))];
    if (this.requireLines) {
      // mp3 недоступны, работаем через TTS — только источники с транскриптом
      const hasLines = id => (((this.manifest.sources || []).find(s => s.id === id) || {}).lines || []).length > 0;
      srcIds = srcIds.filter(hasLines);
      if (!srcIds.length) return { sources: [], items: [] };
    }
    const srcLevel = id => (this.bank.items.find(it => it.source === id) || {}).level;
    const near = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const li = near.indexOf(lvl);
    const ordered = srcIds.slice().sort((a, b) =>
      Math.abs(near.indexOf(srcLevel(a)) - li) - Math.abs(near.indexOf(srcLevel(b)) - li));
    const atLevel = ordered.filter(s => srcLevel(s) === lvl);
    const cnt = id => this.bank.items.filter(it => it.source === id).length;
    const nSrc = this.cfg.listenSources || 2;
    let chosen;
    if (nSrc <= 2) {
      // экспресс: предпочитаем 3+2 = 5 ответов на текущем уровне
      const threes = atLevel.filter(s => cnt(s) === 3), twos = atLevel.filter(s => cnt(s) === 2);
      if (threes.length && twos.length) chosen = [this.pick(threes), this.pick(twos)];
      else if (atLevel.length >= 2) chosen = seededShuffle(atLevel, this.rnd).slice(0, 2);
      else chosen = ordered.slice(0, 2);
    } else {
      // полный: лестница уровней — 2 источника на уровне + 1 ступенью ниже +
      // 1 выше (с зажимом на краях); материалы владельца (owner) в приоритете
      const isOwner = id => !!((this.manifest.sources || []).find(s => s.id === id) || {}).owner;
      const want = [lvl, lvl, near[Math.max(0, li - 1)], near[Math.min(near.length - 1, li + 1)]].slice(0, nSrc);
      const used = new Set();
      chosen = [];
      want.forEach(wl => {
        const cand = srcIds.filter(s => !used.has(s) && srcLevel(s) === wl)
          .sort((a, b) => (isOwner(a) ? 0 : 1) - (isOwner(b) ? 0 : 1));
        const p = cand[0] || ordered.find(s => !used.has(s));
        if (p) { used.add(p); chosen.push(p); }
      });
    }
    chosen = chosen.filter(Boolean);
    const items = [];
    chosen.forEach(s => items.push(...this.bank.items.filter(it => it.source === s && !this.used.has(it.id))));
    return { sources: chosen, items: items.slice(0, this.cfg.listenMax || 6) };
  }

  // --- Minimal pairs: лестница вокруг текущего уровня (A1..B2) ---
  buildMinpairs() {
    const n = this.cfg.minpair;
    if (!n) return [];
    const avail = ['A1', 'A2', 'B1', 'B2'];
    const lvl = this.clampLevel(levelFromTheta(this.est.theta), avail);
    const li = avail.indexOf(lvl);
    const seq = [];
    for (let k = 0; k < Math.ceil(n / 2); k++) seq.push(li);
    for (let k = 0; k < Math.ceil(n / 4); k++) seq.push(Math.min(avail.length - 1, li + 1));
    for (let k = 0; k < Math.ceil(n / 4); k++) seq.push(Math.max(0, li - 1));
    const picked = [];
    seq.forEach(idx => {
      const pool = this.itemsOf('minpair', avail[idx]).filter(it => !picked.includes(it));
      const it = this.pick(pool);
      if (it) picked.push(it);
    });
    // добор из любых уровней
    while (picked.length < n) {
      const it = this.pick(this.bank.items.filter(x => x.block === 'minpair' && !this.used.has(x.id) && !picked.includes(x)));
      if (!it) break;
      picked.push(it);
    }
    return seededShuffle(picked.slice(0, n), this.rnd);
  }

  // --- Видеоклипы (только полный вариант) ---
  buildClips() {
    const n = this.cfg.clips;
    if (!n) return [];
    const near = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const lvl = this.clampLevel(levelFromTheta(this.est.theta), near);
    const li = near.indexOf(lvl);
    let pool = this.bank.items.filter(it => it.block === 'clip' && !this.used.has(it.id));
    // clip1 используется в стартовой видео-проверке: показанный заранее
    // фрагмент из теста исключается
    if (this.probeClipSeen) pool = pool.filter(it => it.source !== 'src-v-01');
    return pool.slice().sort((a, b) =>
      Math.abs(near.indexOf(a.level) - li) - Math.abs(near.indexOf(b.level) - li)).slice(0, n);
  }

  // --- Интерактивная грамматика: порядок слов / банк слов / пары ---
  buildInteractive() {
    const near = ['A1', 'A2', 'B1', 'B2', 'C1'];
    const lvl = this.clampLevel(levelFromTheta(this.est.theta), near);
    const li = near.indexOf(lvl);
    const byDist = pool => pool.slice().sort((a, b) =>
      Math.abs(near.indexOf(a.level) - li) - Math.abs(near.indexOf(b.level) - li));
    const takeType = (type, n) =>
      byDist(this.bank.items.filter(it => it.block === 'uoe2' && it.type === type && !this.used.has(it.id))).slice(0, n);
    return [].concat(
      takeType('order', this.cfg.uoeOrder || 0),
      takeType('bankfill', this.cfg.uoeBankfill || 0),
      takeType('match', this.cfg.uoeMatch || 0)
    );
  }

  // --- Блок 5: reading — текст на уровне (2 задания) + 1 с соседнего ---
  buildReading() {
    const avail = ['A2', 'B1', 'B2', 'C1'];
    const lvl = this.clampLevel(levelFromTheta(this.est.theta), avail);
    const texts = this.bank.readingTexts.filter(t => t.level === lvl);
    const main = this.pick(texts);
    let picked = [main];
    let items = this.bank.items.filter(it => it.source === main.id);
    const li = avail.indexOf(lvl);
    // полный вариант: второй текст (тот же уровень, при нехватке — любой другой)
    if ((this.cfg.readTexts || 1) >= 2) {
      const second = this.pick(this.bank.readingTexts.filter(t => t.level === lvl && t.id !== main.id))
        || this.pick(this.bank.readingTexts.filter(t => t.id !== main.id));
      if (second) {
        picked.push(second);
        items = items.concat(this.bank.items.filter(it => it.source === second.id));
      }
    }
    const adjLvl = avail[Math.min(avail.length - 1, li + 1)] === lvl ? avail[Math.max(0, li - 1)] : avail[Math.min(avail.length - 1, li + 1)];
    const adjText = this.pick(this.bank.readingTexts.filter(t => t.level === adjLvl && !picked.some(p => p.id === t.id)));
    const adjItem = adjText ? this.bank.items.filter(it => it.source === adjText.id)[0] : null;
    if (adjText) picked.push(adjText);
    const cap = (this.cfg.readTexts || 1) >= 2 ? 6 : 3;
    return { texts: picked, items: items.concat(adjItem ? [adjItem] : []).slice(0, cap) };
  }

  clampLevel(lvl, avail) {
    if (avail.includes(lvl)) return lvl;
    const all = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    let i = all.indexOf(lvl);
    // ближайший доступный
    let best = avail[0], bd = 99;
    avail.forEach(a => { const d = Math.abs(all.indexOf(a) - i); if (d < bd) { bd = d; best = a; } });
    return best;
  }

  // --- Блок 6: UoE — батч из 10 под текущую θ̂ (навигация вперёд/назад) ---
  // ВРЕМЕННАЯ схема (pilot mode): лестница уровней вокруг θ̂, случайно внутри
  // уровня, ≤2 заданий на constructFamily, квоты форматов 4/3/3.
  // После калибровки b заменяется на maximum-information-отбор здесь же.
  buildUoeBatch(n) {
    n = n || this.cfg.uoe || this.bank.blocks.itemsPerSession;
    const avail = ['A1', 'A2', 'B1', 'B2', 'C1'];
    const lvl = this.clampLevel(levelFromTheta(this.est.theta), avail);
    const li = avail.indexOf(lvl);
    // 4 на уровне, 3 уровнем выше, 3 ниже (с зажимом на краях)
    const seq = [];
    for (let k = 0; k < 4; k++) seq.push(li);
    for (let k = 0; k < 3; k++) seq.push(Math.min(avail.length - 1, li + 1));
    for (let k = 0; k < 3; k++) seq.push(Math.max(0, li - 1));
    const famCount = {}, quota = Object.assign({}, this.bank.blocks.formatMix);
    const picked = [];
    const take = (pool) => {
      const c = pool.filter(it => !picked.includes(it) &&
        (famCount[it.constructFamily] || 0) < 2 && (quota[it.format] || 0) > 0);
      const c2 = c.length ? c : pool.filter(it => !picked.includes(it) && (famCount[it.constructFamily] || 0) < 2);
      const c3 = c2.length ? c2 : pool.filter(it => !picked.includes(it));
      if (!c3.length) return null;
      const it = c3[Math.floor(this.rnd() * c3.length)];
      picked.push(it);
      famCount[it.constructFamily] = (famCount[it.constructFamily] || 0) + 1;
      if (quota[it.format] > 0) quota[it.format]--;
      return it;
    };
    seq.forEach(idx => take(this.itemsOf('uoe', avail[idx])));
    while (picked.length < n) {
      const it = take(this.bank.items.filter(x => x.block === 'uoe' && !this.used.has(x.id)));
      if (!it) break;
    }
    return picked.slice(0, n);
  }

  // --- Блоки 7/8: writing/speaking на уровне ---
  pickAtLevel(block, n) {
    const avail = [...new Set(this.bank.items.filter(it => it.block === block).map(it => it.level))];
    const lvl = this.clampLevel(levelFromTheta(this.est.theta), avail);
    let pool = this.itemsOf(block, lvl);
    const all = ['A1', 'A2', 'B1', 'B2', 'C1'];
    let li = all.indexOf(lvl), d = 1;
    while (pool.length < n && d < 5) {
      if (all[li - d]) pool = pool.concat(this.itemsOf(block, all[li - d]));
      if (all[li + d]) pool = pool.concat(this.itemsOf(block, all[li + d]));
      d++;
    }
    return seededShuffle(pool, this.rnd).slice(0, n);
  }

  // --- Запись ответа ---
  answer(item, payload) {
    // payload: {optIndex|null, text|null, tMs, shownOrder, playsUsed}
    let correct = null;
    if (item.options) correct = payload.optIndex === item.key ? 1 : 0;
    else if (item.answer) correct = checkOpenAnswer(item, payload.text) ? 1 : 0;
    const entry = {
      id: item.id, block: item.block, level: item.level,
      optIndex: payload.optIndex != null ? payload.optIndex : null,
      text: payload.text != null ? payload.text : null,
      correct, tMs: payload.tMs || 0,
      shownOrder: payload.shownOrder || null, playsUsed: payload.playsUsed || null
    };
    this.log.push(entry);
    this.used.add(item.id);
    if (correct != null && item.affectsLevel !== false) {
      this.responses.push({ item, correct });
      this.updateTheta(item.id);
    }
    return correct;
  }

  // Градуированный ответ (tfns/order/bankfill/match): correct ∈ [0..1]
  answerGraded(item, fraction, meta) {
    const entry = Object.assign({
      id: item.id, block: item.block, level: item.level, type: item.type || null,
      correct: Math.max(0, Math.min(1, fraction))
    }, meta || {});
    this.log.push(entry);
    this.used.add(item.id);
    if (item.affectsLevel !== false) {
      this.responses.push({ item, correct: entry.correct });
      this.updateTheta(item.id);
    }
    return entry.correct;
  }

  // Профиль по навыкам (полный вариант): отдельная EAP-оценка по подмножествам
  skillProfile() {
    const groups = {
      listening: ['listening', 'minpair', 'clip'],
      grammar: ['uoe', 'uoe2', 'routing'],
      reading: ['reading']
    };
    const out = {};
    Object.keys(groups).forEach(k => {
      const rs = this.responses.filter(r => groups[k].includes(r.item.block));
      if (rs.length >= 4) {
        const est = eapEstimate(this.theta0, rs, null);
        out[k] = { theta: est.theta, se: est.se, level: levelFromTheta(est.theta), n: rs.length };
      } else out[k] = null;
    });
    return out;
  }

  answerWriting(item, text) {
    const sc = scoreWriting(item, text);
    this.production.writing = { id: item.id, text, score: sc };
    this.log.push({ id: item.id, block: 'writing', text, score: sc });
    this.used.add(item.id);
    if (item.affectsLevel !== false) {
      this.responses.push({ item, correct: sc.total / 9 });
      this.updateTheta(item.id);
    }
    return sc;
  }

  answerSpeaking(item, rec) {
    const sc = scoreSpeaking(item, rec);
    this.production.speaking.push({ id: item.id, rec: rec ? { durationSec: rec.durationSec, voicedSec: rec.voicedSec, transcript: rec.transcript } : null, score: sc });
    this.log.push({ id: item.id, block: 'speaking', score: sc });
    this.used.add(item.id);
    // affectsLevel: false — в θ не входит
    return sc;
  }

  finishVocab(answers) {
    this.lex.result = vocabScore(this.lex.items, answers);
    this.updateTheta('vocab');
    this.log.push({ block: 'vocab', answers: answers.slice(), words: this.lex.items.map(i => i.w), result: this.lex.result });
  }

  // --- A0-ветка ---
  routingVerdict() {
    const r = this.log.filter(e => e.block === 'routing');
    const wrong = r.filter(e => e.correct === 0).length + (6 - r.length); // без ответа = провал
    if (wrong >= 4) { this.a0.branched = true; this.addFlag('a0_branch'); }
    return this.a0.branched;
  }
  bridgeItems() { return this.bank.items.filter(it => it.block === 'a0_bridge').slice(0, 2); }
  bridgeVerdict() {
    const b = this.log.filter(e => e.block === 'a0_bridge');
    this.a0.bridgePassed = b.length >= 2 && b.every(e => e.correct === 1);
    if (this.a0.bridgePassed) {
      // возврат в основной тест со старта A1: сбрасываем приор на A1
      this.theta0 = PROVISIONAL_B.A1;
      this.responses = [];
      this.updateTheta('bridge_return');
    }
    return this.a0.bridgePassed;
  }

  // --- Финал ---
  computeFlags() {
    const t = this.est.theta;
    const w = this.production.writing ? this.production.writing.score.total : 0;
    const wMax = this.production.writing ? 9 : 0;
    let s = 0, sMax = 0;
    this.production.speaking.forEach(x => { if (x.score) { s += x.score.got; sMax += x.score.max; } });
    const prodMax = wMax + sMax;
    const prodRatio = prodMax > 0 ? (w + s) / prodMax : null;
    if (prodRatio != null && prodRatio < 0.45 && t >= -1.0) this.addFlag('recognition_gap');
    if (prodRatio != null && prodRatio >= 0.75 && t < -1.8) this.addFlag('underestimated');
    if (this.est.se > 0.6) this.addFlag('unresolved');
    return { prodRatio };
  }

  result() {
    const extras = this.computeFlags();
    const skills = {};
    ['routing', 'listening', 'minpair', 'clip', 'reading', 'uoe', 'uoe2'].forEach(b => {
      const e = this.log.filter(x => x.block === b && x.correct != null);
      // для градуированных «верно» = ≥0.99; частичный зачёт виден в сумме score
      skills[b] = e.length ? {
        n: e.length,
        correct: e.filter(x => x.correct >= 0.99).length,
        score: Math.round(e.reduce((a, x) => a + x.correct, 0) * 10) / 10
      } : null;
    });
    return {
      variant: this.variant,
      skillProfile: this.cfg.skillProfile ? this.skillProfile() : null,
      level: this.a0.branched && !this.a0.bridgePassed ? 'A0' : levelFromTheta(this.est.theta),
      theta: this.est.theta, se: this.est.se,
      cutsProvisional: CUTS.provisional, pilotMode: this.pilotMode,
      flags: this.flags.slice(), skills,
      lex: this.lex && this.lex.result,
      writing: this.production.writing,
      speaking: this.production.speaking,
      prodRatio: extras.prodRatio,
      pronunciation: null // отдельное поле; на уровень не влияет; в этой версии не оценивается
    };
  }

  exportJson() {
    return {
      version: this.bank.version, generated: new Date().toISOString(),
      seed: this.seed, lang: this.lang, theta0: this.theta0,
      pilotMode: this.pilotMode, cuts: CUTS,
      appliedPatches: this.appliedPatches || [],
      flags: this.flags, thetaTrace: this.thetaTrace,
      log: this.log, result: this.result(),
      audioAvailable: this.audioAvailable, micAvailable: this.micAvailable
    };
  }
}

// ---------- Симуляция (используется валидационным прогоном; в браузере не вызывается) ----------
function simulateSession(bank, manifest, vocab, seed, pattern, variant) {
  const s = new Session(bank, manifest, seed, variant || 'express');
  const rnd = mulberry32(seed ^ 0x9E3779B9);
  const pc = {
    random:   { mcq: () => Math.floor(rnd() * 4), openP: 0.05, vocabP: 0.25, idkP: 0.0, cando: 2 },
    position: { mcq: () => 1, openP: 0.0, vocabP: null, idkP: 0.0, cando: 2 }, // vocab: тоже позиция 1
    strong:   { mcqP: 0.92, openP: 0.9, vocabP: 0.93, idkP: 0.05, cando: 4 },
    weak:     { mcqP: 0.25, openP: 0.02, vocabP: 0.3, idkP: 0.3, cando: 0 },
    mid:      { mcqP: 0.6, openP: 0.45, vocabP: 0.6, idkP: 0.1, cando: 2 }
  }[pattern];

  const answerMcq = (item, shown) => {
    let optIndex;
    if (pc.mcq) optIndex = shown[Math.min(pc.mcq(), shown.length - 1)];
    else optIndex = rnd() < pc.mcqP ? item.key : shown.filter(i => i !== item.key)[Math.floor(rnd() * 3)];
    s.answer(item, { optIndex, tMs: 4000, shownOrder: shown });
  };
  const answerOpen = (item) => {
    const ok = rnd() < pc.openP;
    s.answer(item, { text: ok ? item.answer[0] : 'xx', tMs: 6000 });
  };
  const shownOrder = (item) => item.fixedOrder ? item.options.map((_, i) => i) : seededShuffle(item.options.map((_, i) => i), s.rnd);

  s.setCanDo(pc.cando);
  // роутинг
  const routing = s.buildRouting();
  routing.forEach(it => answerMcq(it, shownOrder(it)));
  if (s.routingVerdict()) {
    s.bridgeItems().forEach(it => answerOpen(it));
    if (!s.bridgeVerdict()) return s; // результат A0
  }
  // minimal pairs: бинарные, вероятность как у mcq (но 2 опции)
  s.buildMinpairs().forEach(it => {
    const ok = pc.mcq ? true : rnd() < (pc.mcqP + (1 - pc.mcqP) / 2); // угадывание 50%
    s.answerGraded(it, ok ? 1 : 0, { playsUsed: 1 });
  });
  // listening (mcq/who — как обычные; tfns/order — градуированные)
  const L = s.buildListening();
  L.items.forEach(it => {
    if (it.type === 'tfns') {
      const ans = it.statements.map(st => (pc.mcq ? 'T' : (rnd() < pc.mcqP ? st.key : (st.key === 'T' ? 'F' : 'T'))));
      s.answerGraded(it, scoreTfns(it, ans), { answers: ans });
    } else if (it.type === 'order') {
      const ok = pc.mcq ? false : rnd() < pc.mcqP;
      s.answerGraded(it, ok ? 1 : 0.25, {});
    } else if (it.options) answerMcq(it, shownOrder(it));
  });
  // видеоклипы (full)
  s.buildClips().forEach(it => answerMcq(it, shownOrder(it)));
  // раздел слов (по значениям)
  s.lex = { items: vocabDraw(vocab, s.theta0, s.rnd) };
  const answers = s.lex.items.map(it => {
    if (pc.vocabP == null) return Math.min(1, it.options.length - 1); // «всегда позиция B»
    if (rnd() < pc.idkP) return -1;
    if (rnd() < pc.vocabP) return it.correctIndex;
    const wrong = it.options.map((_, i) => i).filter(i => i !== it.correctIndex);
    return wrong[Math.floor(rnd() * wrong.length)];
  });
  s.finishVocab(answers);
  // reading
  const R = s.buildReading();
  R.items.forEach(it => answerMcq(it, shownOrder(it)));
  // uoe — батч под вариант
  s.buildUoeBatch().forEach(it => answerOpen(it));
  // интерактивная грамматика: порядок слов / банк слов / пары
  s.buildInteractive().forEach(it => {
    const p = pc.mcq ? 0.2 : pc.openP;
    if (it.type === 'order') {
      const words = it.answer.replace(/\.$/, '').split(' ');
      const arr = rnd() < p ? words : seededShuffle(words, s.rnd);
      s.answerGraded(it, scoreOrderWords(words, arr), {});
    } else if (it.type === 'bankfill') {
      const ans = it.answers.map(a => rnd() < p ? a : it.bankWords[0]);
      s.answerGraded(it, scoreBankfill(it, ans), {});
    } else if (it.type === 'match') {
      const map = it.pairs.map((_, i) => rnd() < p ? i : (i + 1) % it.pairs.length);
      s.answerGraded(it, scoreMatch(it, map), {});
    }
  });
  // writing
  const wIt = s.pickAtLevel('writing', 1)[0];
  if (wIt) {
    const good = 'Although I usually get up at seven and have coffee because I like mornings, if you are late I will start without you unless you call before nine, so on balance I would suggest meeting earlier rather than later, provided that everyone agrees.';
    s.answerWriting(wIt, (pc.openP > 0.5) ? good : (pattern === 'position' ? '' : 'i like tea'));
  }
  // speaking (только в полном варианте)
  s.pickAtLevel('speaking', s.cfg.speaking || 0).forEach(it => {
    if (pattern === 'position') { s.answerSpeaking(it, null); return; }
    const strongRec = pc.openP > 0.5;
    s.answerSpeaking(it, { durationSec: strongRec ? 28 : 8, voicedSec: strongRec ? 20 : 4, transcript: null });
  });
  return s;
}

// node-экспорт для валидационного прогона

export {
  Session, simulateSession, CUTS, TARGET_TIME, GRID, VARIANTS, mergeBank2, applyBankPatches,
  scoreOrderWords, scoreBankfill, scoreMatch, scoreTfns, eapEstimate, levelFromTheta,
  vocabDraw, vocabScore, scoreWriting, scoreSpeaking, checkOpenAnswer, mulberry32,
  seededShuffle, lexThetaEquiv, THETA0_BY_CANDO, BLOCK_SEQ,
}
