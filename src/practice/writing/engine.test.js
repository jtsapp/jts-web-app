// Оракульные тесты порта buildGenre: фикстуры сняты с самого прототипа
// (data/jtswriting.html), поэтому deep-equal с ними доказывает дословность
// порта. Плюс инварианты по всем 180 жанрам и точечные тесты хелперов.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildGenre, shuffle, textMatch, pickN, toNotes, keyWords, stripPunct,
  norm, wordsOf, sentencesOf, pct,
  STEPS, TASKS_PER_GENRE, MAX_TRIES, TRY_AGAIN_NOTE, LAST_TRY_NOTE,
  genreTimerMinutes, padTargetRange, LEVEL_TAG
} from './engine.js';
import { createTaskState, judgeItem, taskFinished, taskScore } from './taskCtl.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', '..', 'public', 'practice', 'writing');
const FIXTURES = path.join(__dirname, '__fixtures__');

const LEVELS = ['a1', 'a2', 'a2p', 'b1', 'b2', 'c1'];
const meta = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'meta.json'), 'utf8'));
const levelData = {};
for (const lv of LEVELS) {
  levelData[lv] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, lv + '.json'), 'utf8'));
}

describe('buildGenre — оракул против прототипа', () => {
  for (const lv of LEVELS) {
    it('genre-' + lv + '.json совпадает с выходом порта', () => {
      const { seeds, bank } = levelData[lv];
      const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'genre-' + lv + '.json'), 'utf8'));
      const built = JSON.parse(JSON.stringify(buildGenre(seeds[0], bank, meta)));
      expect(built).toEqual(fixture);
    });
  }
});

describe('buildGenre — инварианты по всем жанрам', () => {
  const TYPE_ORDER = ['word-order', 'transform', 'connectors', 'punctuation', 'expand',
    'register', 'idea-bank', 'outline-builder', 'guided-write', 'free-write', 'overall'];

  it('180 жанров: 11 заданий, порядок типов, 8 пунктов в дриллах, банк коннекторов, детерминизм', () => {
    let count = 0;
    for (const lv of LEVELS) {
      const { seeds, bank } = levelData[lv];
      for (const seed of seeds) {
        count++;
        const g = buildGenre(seed, bank, meta);
        expect(g.tasks).toHaveLength(TASKS_PER_GENRE);
        expect(g.tasks.map((t) => t.id)).toEqual(
          Array.from({ length: 11 }, (_, i) => 't' + (i + 1)));
        expect(g.tasks.map((t) => t.type)).toEqual(TYPE_ORDER);
        // дриллы t1–t6 всегда по 8 пунктов — pickN(…, 8) при полном банке
        for (let i = 0; i < 6; i++) expect(g.tasks[i].items).toHaveLength(8);
        // банк коннекторов: не длиннее 10 и без дублей
        const cb = g.tasks[2].bank;
        expect(cb.length).toBeLessThanOrEqual(10);
        expect(new Set(cb).size).toBe(cb.length);
        // детерминизм: повторная сборка байт-в-байт та же
        const again = buildGenre(seed, bank, meta);
        expect(JSON.parse(JSON.stringify(again))).toEqual(JSON.parse(JSON.stringify(g)));
      }
    }
    expect(count).toBe(180);
  });
});

describe('shuffle', () => {
  const arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  it('один seed — один порядок', () => {
    expect(shuffle(arr, 'seed-x')).toEqual(shuffle(arr, 'seed-x'));
  });
  it('разные seed — разные порядки (10 элементов)', () => {
    expect(shuffle(arr, 'seed-x')).not.toEqual(shuffle(arr, 'seed-y'));
  });
  it('один элемент возвращается как есть', () => {
    expect(shuffle(['only'], 'seed')).toEqual(['only']);
  });
  it('не мутирует вход', () => {
    const copy = arr.slice();
    shuffle(arr, 'seed-z');
    expect(arr).toEqual(copy);
  });
});

describe('textMatch', () => {
  it('точное совпадение с answers после нормализации (регистр, пунктуация)', () => {
    expect(textMatch('I live in Almaty.', { answers: ['I live in Almaty'] })).toBe(true);
    expect(textMatch('i LIVE, in almaty', { answers: ['I live in Almaty.'] })).toBe(true);
  });
  it('короче двух слов — отказ даже при совпадении', () => {
    expect(textMatch('Almaty', { answers: ['Almaty'] })).toBe(false);
    expect(textMatch('', { answers: [''] })).toBe(false);
  });
  it('must: все ключевые слова присутствуют — зачёт; не все — отказ', () => {
    const item = { answers: ['We visited the museum'], must: ['visited', 'museum'] };
    expect(textMatch('Yesterday we visited the city museum together', item)).toBe(true);
    expect(textMatch('Yesterday we saw the museum', item)).toBe(false);
  });
  it('avoid: запретное слово ломает must-зачёт', () => {
    const item = { must: ['sorry'], avoid: ['hey'] };
    expect(textMatch('I am sorry for the delay', item)).toBe(true);
    expect(textMatch('Hey, I am sorry for the delay', item)).toBe(false);
  });
});

describe('хелперы текста', () => {
  it('toNotes режет стоп-слова и клеит через " / " ("i" — не стоп-слово)', () => {
    expect(toNotes('I live in a big city with my family.')).toBe('i / live / big / city / family');
  });
  it('keyWords: длина > 3 и не стоп-слово', () => {
    expect(keyWords('We visited the museum yesterday.', 2)).toEqual(['visited', 'museum']);
  });
  it('stripPunct убирает пунктуацию и приводит к нижнему регистру', () => {
    expect(stripPunct('Hello, world! It\'s me.')).toBe('hello world its me');
  });
  it('sentencesOf/wordsOf/pct', () => {
    expect(sentencesOf('One. Two! Three?')).toHaveLength(3);
    expect(wordsOf("don't stop")).toEqual(["don't", 'stop']);
    expect(pct(1, 3)).toBe(33);
    expect(pct(1, 0)).toBe(0);
  });
  it('norm сводит кавычки, а затем выкидывает их вместе с пунктуацией', () => {
    expect(norm('“Hello” — it’s me!')).toBe('hello it s me');
  });
});

describe('константы и мелкие функции', () => {
  it('STEPS — шесть шагов тренажёра', () => {
    expect(STEPS.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('meta.levelTag совпадает с портированным LEVEL_TAG', () => {
    expect(meta.levelTag).toEqual(LEVEL_TAG);
  });
  it('genreTimerMinutes: минуты free-write → timerMinutes → 25', () => {
    expect(genreTimerMinutes({ tasks: [{ type: 'free-write', minutes: 12 }], timerMinutes: 30 })).toBe(12);
    expect(genreTimerMinutes({ tasks: [], timerMinutes: 30 })).toBe(30);
    expect(genreTimerMinutes({})).toBe(25);
  });
  it('padTargetRange: жанровый диапазон или дефолт 120–150', () => {
    expect(padTargetRange({ targetWords: [40, 60] })).toEqual([40, 60]);
    expect(padTargetRange(null)).toEqual([120, 150]);
  });
  it('заметки о попытках экспортированы', () => {
    expect(MAX_TRIES).toBe(3);
    expect(TRY_AGAIN_NOTE).toMatch(/answer is not shown/);
    expect(LAST_TRY_NOTE).toMatch(/stays unsolved/);
  });
});

describe('taskCtl — чистый редьюсер попыток', () => {
  const task = { items: [{ id: 'a' }, { id: 'b' }] };

  it('верный ответ с первой попытки: correct, firstTry, пункт закрыт', () => {
    const s0 = createTaskState(task);
    const r = judgeItem(s0, 'a', true);
    expect(r.verdict).toBe('correct');
    expect(r.firstTry).toBe(true);
    expect(r.state.answered.a).toBe(true);
    expect(r.state.correct).toBe(1);
    // исходное состояние не тронуто
    expect(s0.answered).toEqual({});
    expect(s0.correct).toBe(0);
  });

  it('неверно дважды — retry, на третьей — failed и пункт закрыт как неверный', () => {
    let s = createTaskState(task);
    let r = judgeItem(s, 'a', false);
    expect(r.verdict).toBe('retry');
    expect(r.firstTry).toBe(true);
    r = judgeItem(r.state, 'a', false);
    expect(r.verdict).toBe('retry');
    expect(r.firstTry).toBe(false);
    r = judgeItem(r.state, 'a', false);
    expect(r.verdict).toBe('failed');
    expect(r.state.answered.a).toBe(false);
    expect(r.state.correct).toBe(0);
  });

  it('верно после неверной попытки: correct, но не firstTry', () => {
    let r = judgeItem(createTaskState(task), 'a', false);
    r = judgeItem(r.state, 'a', true);
    expect(r.verdict).toBe('correct');
    expect(r.firstTry).toBe(false);
    expect(r.state.correct).toBe(1);
  });

  it('закрытый пункт не судится повторно (как "done" в прототипе)', () => {
    const r1 = judgeItem(createTaskState(task), 'a', true);
    const r2 = judgeItem(r1.state, 'a', false);
    expect(r2.verdict).toBe('done');
    expect(r2.state).toBe(r1.state);
  });

  it('taskFinished/taskScore: все пункты закрыты — задание закончено', () => {
    let s = createTaskState(task);
    expect(taskFinished(s, task)).toBe(false);
    s = judgeItem(s, 'a', true).state;
    expect(taskFinished(s, task)).toBe(false);
    s = judgeItem(s, 'b', false).state;
    s = judgeItem(s, 'b', false).state;
    s = judgeItem(s, 'b', false).state;
    expect(taskFinished(s, task)).toBe(true);
    expect(taskScore(s)).toEqual({ correct: 1, total: 2 });
  });

  it('задание без items считается за один пункт (free-write)', () => {
    const fw = { type: 'free-write' };
    let s = createTaskState(fw);
    expect(taskFinished(s, fw)).toBe(false);
    s = judgeItem(s, 'text', true).state;
    expect(taskFinished(s, fw)).toBe(true);
  });
});
