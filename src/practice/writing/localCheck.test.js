/* Тесты — поведенческий контракт с прототипом data/jtswriting.html:
   проверяем не «красоту» правил, а что порт даёт те же находки и те же
   тексты исправлений, что и оригинал. */
import { describe, it, expect } from "vitest";
import {
  L1_RULES, ANALYSERS, capitalStarts, analyseText, applyFindings,
  goldHits, localAssess
} from "./localCheck.js";
import { validateAssessment } from "./assessContract.js";

/* Одно предложение-триггер на каждое из 20 правил L1, в порядке L1_RULES. */
const L1_CASES = [
  ["Well, I am agree with you.", "I agree"],
  ["They very like this film.", "really like"],
  ["He sent me some informations.", "information"],
  ["Thank you for your advices.", "advice"],
  ["Many peoples came to the party.", "people"],
  ["Sadly, I didn't saw him.", "I didn't see"],
  ["This one is more better.", "better"],
  ["I don't have no money.", "don't have any"],
  ["I want that you come.", "I would like you to"],
  ["I wait your answer.", "I look forward to your answer"],
  ["In the last time I was busy.", "recently"],
  ["I feel myself great.", "I feel"],
  ["I can to swim.", "can"],
  ["The service was very bad.", "unacceptable"],
  ["The food was very good.", "excellent"],
  ["Please write me soon.", "write to me"],
  ["I am writing you about the order.", "I am writing to you"],
  ["Thanks a lot for your help.", "Thank you in advance"],
  ["Hi guys, I need help.", "Dear Sir or Madam"],
  ["Nowadays in the modern world we use phones.", "today"]
];

describe("L1_RULES", () => {
  it("в списке ровно 20 правил, как в прототипе", () => {
    expect(L1_RULES.length).toBe(20);
  });

  L1_CASES.forEach(([sentence, fix], i) => {
    it(`правило #${i + 1} срабатывает: "${sentence}" -> "${fix}"`, () => {
      const findings = analyseText(sentence);
      expect(findings.some((f) => f.id === "l1" && f.corrected === fix)).toBe(true);
    });
  });
});

describe("ANALYSERS", () => {
  it("modal-to: регекс и fix дают 'can send' на 'I can to send it'", () => {
    /* Через analyseText это место забирает L1-правило can-to, поэтому сам
       анализатор проверяем напрямую — как отдельную единицу поведения. */
    const rule = ANALYSERS.find((r) => r.id === "modal-to");
    const m = new RegExp(rule.rx.source, rule.rx.flags).exec("I can to send it");
    expect(m[0]).toBe("can to send");
    expect(rule.fix.apply(null, m)).toBe("can send");
  });

  it("modal-to через analyseText: 'must to sign' -> 'must sign', why из opts.rules", () => {
    const withRules = analyseText("You must to sign the form.", { rules: { modal: "MODAL RULE" } });
    const f = withRules.find((x) => x.id === "modal-to");
    expect(f).toBeTruthy();
    expect(f.corrected).toBe("must sign");
    expect(f.why).toBe("MODAL RULE");
    /* Без словаря правил объяснение пустое — прототип брал его из RULES. */
    const bare = analyseText("You must to sign the form.");
    expect(bare.find((x) => x.id === "modal-to").why).toBe("");
  });

  it("third-s: 'He go to school every day' -> 'He goes'", () => {
    const findings = analyseText("He go to school every day.");
    const f = findings.find((x) => x.id === "third-s");
    expect(f).toBeTruthy();
    expect(f.corrected).toBe("He goes");
  });

  it("dbl-neg: регекс и fix дают 'don't have any' на 'I don't have no time'", () => {
    const rule = ANALYSERS.find((r) => r.id === "dbl-neg");
    const m = new RegExp(rule.rx.source, rule.rx.flags).exec("I don't have no time");
    expect(m[0]).toBe("don't have no");
    expect(rule.fix.apply(null, m)).toBe("don't have any");
  });

  it("dbl-neg через analyseText там, где L1 не перекрывает: 'does not know nothing'", () => {
    const findings = analyseText("She does not know nothing.");
    const f = findings.find((x) => x.id === "dbl-neg");
    expect(f).toBeTruthy();
    expect(f.corrected).toBe("does not know anything");
  });

  it("a-vowel: 'a email' -> 'an email'", () => {
    const findings = analyseText("She got a email yesterday.");
    const f = findings.find((x) => x.id === "a-vowel");
    expect(f).toBeTruthy();
    expect(f.corrected).toBe("an email");
  });

  it("a-vowel исключения: 'a university' не помечается", () => {
    expect(analyseText("He studies at a university.")).toHaveLength(0);
  });

  it("an-cons: 'an letter' -> 'a letter', а 'an hour' — исключение", () => {
    const f = analyseText("He wrote an letter.").find((x) => x.id === "an-cons");
    expect(f).toBeTruthy();
    expect(f.corrected).toBe("a letter");
    expect(analyseText("I waited for an hour.")).toHaveLength(0);
  });

  it("'a hour' прототип НЕ помечает: a-vowel смотрит на букву, не на звук", () => {
    /* Отклонение от текста задания: правило a-vowel ловит только гласные
       БУКВЫ, а «hour» начинается с h; исключение hour живёт в an-cons.
       Фиксируем фактическое поведение прототипа, а не желаемое. */
    expect(analyseText("She stayed for a hour.")).toHaveLength(0);
  });

  it("if-will: 'If it will rain, I stay' -> 'If it rains'", () => {
    const findings = analyseText("If it will rain, I stay.");
    const f = findings.find((x) => x.id === "if-will");
    expect(f).toBeTruthy();
    expect(f.corrected).toBe("If it rains");
  });
});

describe("analyseText: подавление пересечений и мелочи", () => {
  it("L1 и анализатор на одном месте дают одну находку (L1 первее)", () => {
    const findings = analyseText("I can to send it.");
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe("l1");
    expect(findings[0].original).toBe("can to");
    expect(findings[0].corrected).toBe("can");
  });

  it("capitalStarts отдаёт не больше 5 находок", () => {
    const text = "one fish. two fish. red fish. blue fish. old fish. new fish. sad fish.";
    expect(capitalStarts(text)).toHaveLength(5);
  });

  it("end-stop добавляется без точки и отключается wholeSentence:false", () => {
    expect(analyseText("I like green tea").some((f) => f.id === "end-stop")).toBe(true);
    expect(analyseText("I like green tea", { wholeSentence: false }).some((f) => f.id === "end-stop")).toBe(false);
  });

  it("applyFindings собирает исправленный текст", () => {
    const src = "He go to school every day.";
    expect(applyFindings(src, analyseText(src))).toBe("He goes to school every day.");
  });
});

describe("goldHits", () => {
  it("считает вхождения переданного списка слов", () => {
    expect(goldHits("i want a refund and my receipt", ["refund", "receipt", "warranty"])).toBe(2);
    expect(goldHits("nothing here", [])).toBe(0);
  });
});

describe("localAssess", () => {
  const TEXT =
    "I am writing to complain about the service in your shop. Last week I bought a phone, but it does not work. I didn't saw any warning about problems, and the staff was very bad.\n\n" +
    "However, I believe this can be fixed quickly. I don't have no time to visit the shop again, so I would like to request a refund. Moreover, the delivery was late and nobody answered my calls.\n\n" +
    "Therefore, I would be grateful if you could send me a new phone or return my money. I look forward to your answer.";

  const PAYLOAD = { level: "B1", genre: "Complaint letter", targetWords: [80, 180], task: "Write a complaint.", text: TEXT };
  const CTX = {
    wordlist: ["refund", "delivery", "receipt", "warranty", "faulty", "complaint"],
    checklist: [
      { text: "opening", auto: ["i am writing"] },
      { text: "refund", auto: ["refund"] },
      { text: "missing", auto: ["zzz-never-there"] }
    ],
    myWords: ["quickly"]
  };

  it("возвращает офлайн-оценку, проходящую общий контракт", () => {
    const res = localAssess(PAYLOAD, CTX);
    expect(res.mode).toBe("offline");
    Object.values(res.scores).forEach((s) => {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(5);
      expect(Number.isInteger(s * 2)).toBe(true); // только половинные шаги
    });
    expect(res.corrections.length).toBeGreaterThanOrEqual(1);
    expect(res.corrections.length).toBeLessThanOrEqual(12);
    expect(res.nextSteps.length).toBeGreaterThanOrEqual(1);
    expect(res.nextSteps.length).toBeLessThanOrEqual(3);
    expect(validateAssessment(res, TEXT)).not.toBeNull();
  });

  it("без ctx деградирует как прототип без жанра и всё равно валиден", () => {
    const res = localAssess(PAYLOAD, {});
    expect(res.mode).toBe("offline");
    expect(validateAssessment(res, TEXT)).not.toBeNull();
  });

  it("исправления обрезаются ровно до 12", () => {
    /* 6 правил × по 3 разрешённых срабатывания = 18 кандидатов -> slice(0,12). */
    const spam = "I am agree. I feel myself bad. I didn't saw it. I don't have no time. This is more better. Thanks a lot. ".repeat(4);
    const res = localAssess({ level: "B1", genre: "Free", targetWords: [80, 180], task: "", text: spam }, {});
    expect(res.corrections.length).toBe(12);
    expect(validateAssessment(res, spam)).not.toBeNull();
  });
});
