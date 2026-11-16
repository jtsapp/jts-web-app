"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { TermsBlock } from "./TermsBlocks.jsx";
const norm = (x) => (x || "").toLowerCase().replace(/ё/g, "\u0435").replace(/\s+/g, " ").trim();
function TermsStage({ token, cfg, state, onState }) {
  const sections = cfg.content.sections, N = sections.length, T = state.terms;
  const firstUnread = sections.findIndex((_, k) => T.read[String(k)] === void 0);
  const [idx, setIdx] = useState(firstUnread >= 0 ? firstUnread : T.quizPassed ? "sign" : "quiz");
  const [back, setBack] = useState(false);
  const [left, setLeft] = useState(cfg.settings.sectionMinSeconds);
  const [quiz, setQuiz] = useState({});
  const [acks, setAcks] = useState(cfg.content.consents.map(() => false));
  const [sign, setSign] = useState("");
  const [err, setErr] = useState("");
  const shownAt = useRef(0);
  useEffect(() => {
    if (typeof idx !== "number") return;
    shownAt.current = Date.now();
    window.scrollTo({ top: 0 });
    if (T.read[String(idx)] !== void 0) {
      setLeft(0);
      return;
    }
    setLeft(cfg.settings.sectionMinSeconds);
    const t = setInterval(() => setLeft((v) => {
      if (v <= 1) {
        clearInterval(t);
        return 0;
      }
      return v - 1;
    }), 1e3);
    return () => clearInterval(t);
  }, [idx, T.read, cfg.settings.sectionMinSeconds]);
  const nav = (active) => <div className="hr-tnav">{sections.map((x, i) => {
    const read = T.read[String(i)] !== void 0;
    return <button
      key={i}
      className={`hr-tdot ${read ? "hr-ok" : ""} ${i === active ? "hr-on" : ""}`}
      disabled={!read && i !== active}
      title={x.title}
      onClick={() => {
        setBack(typeof active !== "number");
        setIdx(i);
      }}
    >{i + 1}</button>;
  })}<span className={`hr-tdot hr-q ${active === "quiz" ? "hr-on" : ""} ${T.quizPassed ? "hr-ok" : ""}`}>✓?</span></div>;
  if (typeof idx === "number") {
    const sec = sections[idx], already = T.read[String(idx)] !== void 0;
    const next = async () => {
      setErr("");
      try {
        const s = already ? state : await api.read(token, idx, Math.round((Date.now() - shownAt.current) / 1e3));
        onState(s);
        const unread = sections.findIndex((_, k) => s.terms.read[String(k)] === void 0);
        if (back) {
          setBack(false);
          setIdx(s.terms.quizPassed ? "sign" : "quiz");
        } else setIdx(unread >= 0 && unread > idx ? unread : idx + 1 < N ? idx + 1 : s.terms.quizPassed ? "sign" : "quiz");
      } catch (x) {
        setErr(x.message);
      }
    };
    return <><p className="hr-note" style={{ margin: "0 0 6px" }}>Условия работы JTS · раздел {idx + 1} из {N}</p>{nav(idx)}<div className={`hr-term ${sec.fines ? "hr-finesec" : ""}`}><h1 style={{ marginTop: 4 }}>{String(idx + 1).padStart(2, "0")}. {sec.title}</h1><p className="hr-lead" style={{ marginBottom: 16 }}>{sec.sub}</p>{sec.blocks.map((b, i) => <TermsBlock key={i} b={b} />)}</div><div className="hr-actions"><button className="hr-btn hr-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← Назад</button><button className="hr-btn" disabled={left > 0} onClick={next}>{already ? "\u0414\u0430\u043B\u0435\u0435 \u2192" : left > 0 ? `\u041E\u0437\u043D\u0430\u043A\u043E\u043C\u043B\u0435\u043D(\u0430) \xB7 ${left}` : idx === N - 1 ? "\u041E\u0437\u043D\u0430\u043A\u043E\u043C\u043B\u0435\u043D(\u0430) \u2192 \u043A \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435" : "\u041E\u0437\u043D\u0430\u043A\u043E\u043C\u043B\u0435\u043D(\u0430) \u2192 \u0434\u0430\u043B\u0435\u0435"}</button></div><p className="hr-err" role="alert">{err}</p></>;
  }
  if (idx === "quiz") {
    const Q = cfg.content.termsQuiz, wrong = T.quizWrong || [];
    const check = async () => {
      if (Q.some((_, i) => quiz[String(i)] === void 0)) {
        setErr("\u041E\u0442\u0432\u0435\u0442\u044C\u0442\u0435 \u043D\u0430 \u0432\u0441\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B.");
        return;
      }
      setErr("");
      try {
        const s = await api.quiz(token, quiz);
        onState(s);
        if (s.terms.quizPassed) setIdx("sign");
        else {
          const q2 = { ...quiz };
          s.terms.quizWrong.forEach((i) => delete q2[String(i)]);
          setQuiz(q2);
        }
      } catch (x) {
        setErr(x.message);
      }
    };
    return <><p className="hr-note" style={{ margin: "0 0 6px" }}>Условия работы JTS · проверка</p>{nav("quiz")}<h1>Проверка понимания условий</h1><p className="hr-lead">{Q.length} вопросов по ключевым пунктам. Нужно ответить правильно на все. Если ошибётесь, мы подскажем, какой раздел перечитать.</p>{Q.map((q, i) => <div key={i} className={`hr-vq ${wrong.includes(i) && quiz[String(i)] === void 0 ? "hr-bad" : ""}`}><h3>{i + 1}. {q.q}</h3>{wrong.includes(i) && quiz[String(i)] === void 0 && <p className="hr-err" style={{ margin: "2px 0 8px" }}>Неверно. <button className="hr-linkbtn" style={{ color: "var(--warn)" }} onClick={() => {
      setBack(true);
      setIdx(q.sec - 1);
    }}>Перечитать раздел {q.sec}: «{sections[q.sec - 1]?.title}»</button></p>}<div className="hr-opts">{q.o.map((o, k) => <button key={k} className={`hr-opt ${quiz[String(i)] === k ? "hr-sel" : ""}`} onClick={() => setQuiz({ ...quiz, [String(i)]: k })}>{o}</button>)}</div></div>)}<div className="hr-actions"><span className="hr-err" role="alert">{err}</span><button className="hr-btn" onClick={check}>Проверить ответы</button></div></>;
  }
  const name = state.resume.name || "";
  const okName = norm(sign) === norm(name);
  const all = acks.every(Boolean);
  const finish = async () => {
    setErr("");
    try {
      onState(await api.sign(token, sign.trim(), acks));
    } catch (x) {
      setErr(x.message);
    }
  };
  return <><p className="hr-note" style={{ margin: "0 0 6px" }}>Условия работы JTS · согласие</p>{nav("sign")}<h1>Согласие с условиями</h1><p className="hr-lead">Вы прочитали все {N} разделов и прошли проверку. Отметьте каждый пункт и подпишите согласие.</p>{cfg.content.consents.map((c, i) => <label key={i} className="hr-check" style={{ border: 0, padding: "8px 0" }}><input type="checkbox" checked={acks[i]} onChange={(e) => setAcks(acks.map((v, k) => k === i ? e.target.checked : v))} /> {c}</label>)}<h2>Подпись</h2><label className="hr-f">Введите ФИО полностью — так же, как в анкете
        <input type="text" value={sign} placeholder={name} autoComplete="off" onChange={(e) => setSign(e.target.value)} /></label><p className="hr-note">Дата подписания: {(/* @__PURE__ */ new Date()).toLocaleDateString("ru-RU")}. Согласие сохраняется вместе с временем прочтения каждого раздела.</p><div className="hr-actions"><span className="hr-err" role="alert">{err || (sign.length > 4 && !okName ? "\u0424\u0418\u041E \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0442\u044C \u0441 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u043C \u0432 \u0430\u043D\u043A\u0435\u0442\u0435." : "")}</span><button className="hr-btn" disabled={!(all && okName)} onClick={finish}>Подтвердить и завершить</button></div></>;
}
export {
  TermsStage
};
