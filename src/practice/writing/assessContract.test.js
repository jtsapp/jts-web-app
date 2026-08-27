/* Контракт оценки: гоняется и на сервере, и на клиенте, поэтому тесты
   фиксируют каждую ветку нормализации — любое расхождение с прототипом
   развалит UI, который верит этой форме. */
import { describe, it, expect } from "vitest";
import { validateAssessment, validateCheckRequest, CHECK_LEVELS } from "./assessContract.js";

const TEXT = "I am writing to complain about my order. It was late and the box was damaged.";

function rawBase(over) {
  return Object.assign({
    scores: { task: 3, organisation: 3.4, vocabulary: 7, grammar: -1 },
    cefr: "b1",
    summary: "Solid attempt with a clear opening.",
    strengths: [],
    corrections: [],
    rewrite: "rewrite",
    nextSteps: ["Do this."]
  }, over || {});
}

describe("validateAssessment", () => {
  it("баллы зажимаются в 0..5 и округляются до половинок", () => {
    const out = validateAssessment(rawBase({
      scores: { task: "4.26", organisation: 3.4, vocabulary: 7, grammar: -1 }
    }), TEXT);
    expect(out.scores.task).toBe(4.5);
    expect(out.scores.organisation).toBe(3.5);
    expect(out.scores.vocabulary).toBe(5);
    expect(out.scores.grammar).toBe(0);
  });

  it("нечисловой балл превращается в 0, cefr нормализуется до двух букв", () => {
    const out = validateAssessment(rawBase({
      scores: { task: "abc", organisation: 1, vocabulary: 1, grammar: 1 },
      cefr: "c1plus"
    }), TEXT);
    expect(out.scores.task).toBe(0);
    expect(out.cefr).toBe("C1");
    expect(validateAssessment(rawBase({ cefr: 42 }), TEXT).cefr).toBe("B1");
  });

  it("wordCount считается по тексту работы, не по ответу модели", () => {
    expect(validateAssessment(rawBase(), TEXT).wordCount).toBe(16);
  });

  it("сильная сторона без дословной цитаты из текста выбрасывается", () => {
    const out = validateAssessment(rawBase({
      strengths: [
        { quote: "I am writing to complain", why: "good opening" },
        { quote: "this is not in the text", why: "x" }
      ]
    }), TEXT);
    expect(out.strengths).toHaveLength(1);
    expect(out.strengths[0].quote).toBe("I am writing to complain");
  });

  it("исправлений не больше 12, original обязан встречаться в тексте", () => {
    const many = [];
    for (let i = 0; i < 15; i++) many.push({ original: "order", corrected: "x", type: "grammar", severity: "low", explanation: "" });
    many.unshift({ original: "never-there", corrected: "x", type: "grammar", severity: "low", explanation: "" });
    const out = validateAssessment(rawBase({ corrections: many }), TEXT);
    expect(out.corrections).toHaveLength(11); // slice(0,12) идёт ДО фильтра, фальшивка съедает слот
    out.corrections.forEach((c) => expect(TEXT.indexOf(c.original)).toBeGreaterThanOrEqual(0));
  });

  it("неизвестные type/severity падают в grammar/medium", () => {
    const out = validateAssessment(rawBase({
      corrections: [{ original: "order", corrected: "x", type: "weird", severity: "weird", explanation: "" }]
    }), TEXT);
    expect(out.corrections[0].type).toBe("grammar");
    expect(out.corrections[0].severity).toBe("medium");
  });

  it("nextSteps не больше 3, пустые выбрасываются", () => {
    const out = validateAssessment(rawBase({ nextSteps: ["a", "b", "c", "d", "e"] }), TEXT);
    expect(out.nextSteps).toEqual(["a", "b", "c"]);
    expect(validateAssessment(rawBase({ nextSteps: ["  ", "a"] }), TEXT).nextSteps).toEqual(["a"]);
  });

  it("null без summary и без nextSteps", () => {
    expect(validateAssessment(rawBase({ summary: "" }), TEXT)).toBeNull();
    expect(validateAssessment(rawBase({ nextSteps: [] }), TEXT)).toBeNull();
    expect(validateAssessment(null, TEXT)).toBeNull();
    expect(validateAssessment({ cefr: "B1" }, TEXT)).toBeNull();
  });

  it("серверные потолки длины: summary 600, rewrite 8000, шаг 200, объяснения 300", () => {
    const out = validateAssessment(rawBase({
      summary: "s".repeat(700),
      rewrite: "r".repeat(9000),
      nextSteps: ["n".repeat(300)],
      strengths: [{ quote: "order", why: "w".repeat(400) }],
      corrections: [{ original: "order", corrected: "c".repeat(400), type: "grammar", severity: "low", explanation: "e".repeat(400) }]
    }), TEXT);
    expect(out.summary).toHaveLength(600);
    expect(out.rewrite).toHaveLength(8000);
    expect(out.nextSteps[0]).toHaveLength(200);
    expect(out.strengths[0].why).toHaveLength(300);
    expect(out.corrections[0].corrected).toHaveLength(300);
    expect(out.corrections[0].explanation).toHaveLength(300);
  });
});

describe("validateCheckRequest", () => {
  const GOOD = "This text has more than five words inside.";

  it("отклоняет пустой текст и не-строку", () => {
    expect(validateCheckRequest({}).ok).toBe(false);
    expect(validateCheckRequest({ text: "   " }).ok).toBe(false);
    expect(validateCheckRequest({ text: 42 }).ok).toBe(false);
    expect(validateCheckRequest(null).ok).toBe(false);
  });

  it("отклоняет текст из 4 слов, принимает из 5", () => {
    expect(validateCheckRequest({ text: "one two three four" }).ok).toBe(false);
    expect(validateCheckRequest({ text: "one two three four five" }).ok).toBe(true);
  });

  it("отклоняет текст длиннее 6000 символов", () => {
    const long = "word ".repeat(1300); // ~6500 символов
    expect(validateCheckRequest({ text: long }).ok).toBe(false);
  });

  it("уровень приводится к верхнему регистру по whitelist, иначе B1", () => {
    expect(validateCheckRequest({ text: GOOD, level: "a2p" }).value.level).toBe("A2P");
    expect(validateCheckRequest({ text: GOOD, level: "Z9" }).value.level).toBe("B1");
    expect(validateCheckRequest({ text: GOOD }).value.level).toBe("B1");
  });

  it("targetWords: валидная пара проходит, мусор падает в [80,180]", () => {
    expect(validateCheckRequest({ text: GOOD, targetWords: [50, 120] }).value.targetWords).toEqual([50, 120]);
    expect(validateCheckRequest({ text: GOOD, targetWords: ["50", "120"] }).value.targetWords).toEqual([50, 120]);
    expect(validateCheckRequest({ text: GOOD, targetWords: [0, 100] }).value.targetWords).toEqual([80, 180]);
    expect(validateCheckRequest({ text: GOOD, targetWords: [200, 100] }).value.targetWords).toEqual([80, 180]);
    expect(validateCheckRequest({ text: GOOD, targetWords: [100, 2500] }).value.targetWords).toEqual([80, 180]);
    expect(validateCheckRequest({ text: GOOD, targetWords: "nope" }).value.targetWords).toEqual([80, 180]);
  });

  it("uiLang по whitelist, иначе ru", () => {
    expect(validateCheckRequest({ text: GOOD, uiLang: "en" }).value.uiLang).toBe("en");
    expect(validateCheckRequest({ text: GOOD, uiLang: "kk" }).value.uiLang).toBe("kk");
    expect(validateCheckRequest({ text: GOOD, uiLang: "de" }).value.uiLang).toBe("ru");
    expect(validateCheckRequest({ text: GOOD }).value.uiLang).toBe("ru");
  });

  it("genre/task обрезаются и получают дефолты", () => {
    const v = validateCheckRequest({ text: GOOD, genre: "g".repeat(200), task: "t".repeat(700) }).value;
    expect(v.genre).toHaveLength(120);
    expect(v.task).toHaveLength(600);
    const d = validateCheckRequest({ text: GOOD }).value;
    expect(d.genre).toBe("Free writing");
    expect(d.task).toBe("Free writing with no set task.");
  });

  it("текст в value приходит обрезанным по краям", () => {
    expect(validateCheckRequest({ text: "  " + GOOD + "  " }).value.text).toBe(GOOD);
  });

  it("CHECK_LEVELS — фиксированный список уровней", () => {
    expect(CHECK_LEVELS).toEqual(["A1", "A2", "A2P", "B1", "B2", "C1"]);
  });
});
