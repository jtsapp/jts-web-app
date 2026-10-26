// Оракул Word Hunt: что строят САМИ ядра прототипа — задания уроков, сетки
// кроссворда на трёх шагах CEFR-политики, доски поиска слов на трёх
// сложностях, подсказки поиска и перевод чисел. Порт (src/practice/wordhunt/
// cores.js) сверяется с этим файлом (engine.test.js): красный тест значит, что
// порт разъехался с исходником.
//
// Ядра чистые (прототип сам гонял их в Node на аудите), поэтому исполняем их
// в node:vm как есть — скрипт данных и три скрипта ядер урезанной копии, без
// DOM. Сиды фиксированы, но sort-компаратор кроссворда потребляет RNG: другая
// версия V8 может вызвать его в другом порядке. Поэтому тест берёт оракул
// функцией extractOracle в том же Node, а статический снимок дополнительно
// удерживает стабильные данные, подсказки и доски поиска.
//
// Запуск: node scripts/wordhunt/extract-oracle.js

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { readPrototype, engineScript } = require('./read-prototype.js')

const DIR = path.join(__dirname, '..', '..', 'src', 'practice', 'wordhunt', '__fixtures__')
const DIFFS = ['easy', 'medium', 'hard']

function extractOracle(html) {
  const proto = readPrototype(html)
  const ctx = vm.createContext({})
  vm.runInContext(proto.dataBlock.body, ctx)
  for (const marker of ['Crosswords · core', 'Word Hunt engine (pure logic', 'CEFR clue policy']) {
    vm.runInContext(engineScript(proto, marker), ctx)
  }
  // Снимок — чистыми данными (без прототипов чужого контекста vm и без циклов).
  const snapshot = vm.runInContext(
    `(function () {
      var C = XWCore, out = { planets: [] };
      var areas = DB.levels.map(function (l) { return l.id; }).concat(FIELDS.map(function (f) { return f.id; })).filter(function (lv) { return DB[lv]; });
      function itemShape(it) {
        return { key: it.key, ids: it.ids, en: it.en, ans: it.ans, enumr: it.enumr, fit: it.fit, why: it.why, ru: it.ru, kk: it.kk,
                 clue: it.clue, form: it.form, card: it.card };
      }
      function entShape(e) {
        return { key: e.it.key, r: e.r == null ? null : e.r, c: e.c == null ? null : e.c, dir: e.dir || null, len: e.len || null, num: e.num,
                 why: e.why || null, kind: e.kind, hint: e.hint, amb: !!e.amb, refs: e.refs, pol: e.pol || null };
      }
      areas.forEach(function (lv) {
        var L = DB[lv];
        L.units.forEach(function (u) {
          u.lessons.forEach(function (n) {
            if (!L.lessons[String(n)]) return;
            var parts = C.parts(C.lessonItems(DB, lv, n));
            parts.forEach(function (items, ix) {
              var pid = lv + ':' + n + ':' + ix + ':' + C.hash(items.map(function (x) { return x.key; }).join(',')).toString(36);
              var pl = { pid: pid, items: items.map(itemShape), xw: [], ws: {}, wsClue: {}, tr: {} };
              for (var tier = 0; tier < 3; tier++) {
                var P = C.build(items, pid + ':' + tier + ':oracle', 'pol' + tier, LXClue.xwChooser(tier));
                pl.xw.push({ h: P.h, w: P.w, err: P.err || '', entries: P.entries.map(entShape), strips: P.strips.map(entShape) });
              }
              ${JSON.stringify(DIFFS)}.forEach(function (d) {
                var B = WSCore.build(items, d, pid + ':' + d + ':oracle');
                pl.ws[d] = B && { n: B.n, grid: B.grid.join(''), words: B.words.map(function (w) { return { key: w.it.key, cells: w.cells, dir: w.dir }; }),
                                 aside: B.aside.map(function (x) { return x.key; }), skipped: B.skipped.map(function (x) { return x.key; }),
                                 pick: WSCore.pick(items, d).map(function (x) { return x.key; }) };
              });
              items.forEach(function (it) {
                pl.wsClue[it.key] = LXClue.wsClue(it);
                pl.tr[it.key] = { ru: LXClue.trText(it, 'ru'), kk: LXClue.trText(it, 'kk'), band: LXClue.bandOf(it), give: LXClue.trGivesAway(it) };
              });
              out.planets.push(pl);
            });
          });
        });
      });
      out.tiers = LXClue.BANDS.map(function (b) { return { band: b, kinds: LXClue.tierKinds(b), sup: [0, 1, 2].map(function (i) { return LXClue.tierSup(b, i); }) }; });
      return JSON.stringify(out);
    })()`,
    ctx,
  )
  return JSON.parse(snapshot)
}

module.exports = { extractOracle }

if (require.main === module) {
  const data = extractOracle(fs.readFileSync(path.join(DIR, 'prototype-mini.html'), 'utf8'))
  fs.writeFileSync(path.join(DIR, 'oracle.json'), JSON.stringify(data))
  const kb = Math.round(fs.statSync(path.join(DIR, 'oracle.json')).size / 1024)
  const boards = data.planets.reduce((s, p) => s + DIFFS.filter((d) => p.ws[d]).length, 0)
  const grids = data.planets.reduce((s, p) => s + p.xw.filter((x) => x.entries.length).length, 0)
  console.log(`oracle.json ${kb} КБ: планет ${data.planets.length}, сеток ${grids}, досок ${boards}`)
}
