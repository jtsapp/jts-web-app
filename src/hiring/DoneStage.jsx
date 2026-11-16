"use client";
import { useState } from "react";
import { api } from "./api.js";
import { fmtDate } from "./screening.js";
const LOOK = { accepted: { ico: "\u{1F389}", title: "\u0412\u044B \u043F\u0440\u0438\u043D\u044F\u0442\u044B!" }, reserve: { ico: "\u23F3", title: "\u0412\u044B \u0432 \u0440\u0435\u0437\u0435\u0440\u0432\u0435" }, rejected: { ico: "\u2709\uFE0F", title: "\u0420\u0435\u0448\u0435\u043D\u0438\u0435 \u043F\u043E \u0432\u0430\u0448\u0435\u0439 \u0437\u0430\u044F\u0432\u043A\u0435" } };
function DoneStage({ token, state, onState }) {
  const [err, setErr] = useState("");
  const d = state.decision;
  const retake = state.english && !state.english.passed && state.retake ? state.retake : null;
  const retakeBlock = retake && d?.status !== "accepted" ? retake.can ? <div className="hr-subbox" style={{ textAlign: "left" }}><b>Можно пересдать тест по английскому</b><p className="hr-note" style={{ margin: "4px 0 8px" }}>Прошлый результат: {state.english.percent}%. Остальные этапы пересдавать не нужно.</p><button className="hr-btn" onClick={async () => {
    try {
      await api.testStart(token);
      onState(await api.state(token));
    } catch (x) {
      setErr(x.message);
    }
  }}>Пересдать тест</button></div> : <p className="hr-note" style={{ marginTop: 14 }}>Если результат теста ниже ожидаемого, пересдать его можно с {fmtDate(retake.from)}.</p> : null;
  if (d) {
    const look = LOOK[d.status];
    return <div className="hr-done-hero"><div className="hr-ico">{look.ico}</div><h1>{look.title}</h1><div className="hr-decmsg">{d.message}</div>{d.status === "accepted" && d.onboardingUrl && <><a className="hr-btn" href={d.onboardingUrl} target="_blank" rel="noopener" style={{ display: "inline-block", marginTop: 18 }}>Перейти к онбордингу →</a><p className="hr-note" style={{ marginTop: 10 }}>Если кнопка не открывается, скопируйте ссылку: {d.onboardingUrl}</p></>}<p className="hr-note" style={{ marginTop: 16 }}>{fmtDate(d.at)}</p>{retakeBlock}<p className="hr-err">{err}</p></div>;
  }
  const first = (state.resume.name || "").split(" ")[1] || state.resume.name || "";
  return <div className="hr-done-hero"><div className="hr-ico">✓</div><h1>Все этапы пройдены!</h1><p className="hr-lead" style={{ maxWidth: 540, margin: "8px auto 0" }}>Спасибо, {first}! Ваша анкета, результат теста ({state.english?.level || "\u2014"}) и ответы интервью переданы рекрутеру. Решение придёт <b>на ваш email {state.resume.email}</b> в течение 3 рабочих дней (проверьте и папку «Спам») и появится на этой странице. Мы также можем связаться с вами по телефону {state.resume.phone}.</p>{retakeBlock}<p className="hr-err">{err}</p></div>;
}
export {
  DoneStage
};
