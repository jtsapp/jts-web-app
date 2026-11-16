"use client";
import { useEffect, useRef, useState } from "react";
import { api, API } from "./api.js";
import { DeviceCheck } from "./DeviceCheck.jsx";
import { ProctorNote } from "./ProctorNote.jsx";
import { VideoAnswer } from "./VideoAnswer.jsx";
const TYPE_LABEL = { video: "\u{1F3A5} \u0412\u0438\u0434\u0435\u043E\u043E\u0442\u0432\u0435\u0442", text: "\u270D\uFE0F \u041F\u0438\u0441\u044C\u043C\u0435\u043D\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442", choice: "\u2611\uFE0F \u0412\u044B\u0431\u043E\u0440" };
const CHECK_KEY = "jts-hiring-devcheck";
function InterviewStage({ token, cfg, state, onState }) {
  const qs = cfg.content.interview;
  const byIndex = Object.fromEntries(state.interview.map((a) => [a.index, a]));
  const [texts, setTexts] = useState(() => Object.fromEntries(state.interview.filter((a) => a.text).map((a) => [a.index, a.text])));
  const [choices, setChoices] = useState(() => Object.fromEntries(state.interview.filter((a) => a.choice).map((a) => [a.index, a.choice])));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(true);
  const timers = useRef({});
  const opened = useRef(/* @__PURE__ */ new Set());
  useEffect(() => {
    try {
      setChecked(localStorage.getItem(CHECK_KEY) === "1");
    } catch {
      setChecked(true);
    }
  }, []);
  useEffect(() => {
    const onPaste = () => setErr("\u0412\u0441\u0442\u0430\u0432\u043A\u0430 \u0442\u0435\u043A\u0441\u0442\u0430 \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u2014 \u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043E\u0442\u0432\u0435\u0442 \u0441\u0430\u043C\u0438.");
    window.addEventListener("proctor-paste", onPaste);
    return () => window.removeEventListener("proctor-paste", onPaste);
  }, []);
  const open = (i) => {
    if (!opened.current.has(i)) {
      opened.current.add(i);
      api.open(token, i).catch(() => {
      });
    }
  };
  const ok = (i) => {
    const q = qs[i];
    if (q.type === "video") return !!byIndex[i]?.videoName;
    if (q.type === "text") return (texts[i] || "").trim().length >= 3;
    return !!choices[i];
  };
  const done = qs.filter((_, i) => ok(i)).length;
  const onText = (i, v) => {
    setTexts({ ...texts, [i]: v });
    clearTimeout(timers.current[i]);
    timers.current[i] = setTimeout(() => api.answer(token, i, { text: v }).catch((x) => setErr(x.message)), 1200);
  };
  const onChoice = (i, v) => {
    open(i);
    setChoices({ ...choices, [i]: v });
    api.answer(token, i, { choice: v }).catch((x) => setErr(x.message));
  };
  const next = async () => {
    for (const [i, t] of Object.entries(timers.current)) {
      clearTimeout(t);
      await api.answer(token, +i, { text: texts[+i] || "" }).catch(() => {
      });
    }
    try {
      onState(await api.interviewFinish(token));
    } catch (x) {
      setErr(x.message);
    }
  };
  const nVideo = qs.filter((q) => q.type === "video").length;
  return <><h1>Интервью</h1><ProctorNote /><p className="hr-lead">{qs.length} вопросов на английском языке. Отвечайте на английском. На {nVideo} вопросов нужен видеоответ — записывается прямо здесь: нажмите «Записать ответ», ответьте и нажмите «Закончить». Обычный ответ — до {Math.round(cfg.settings.videoSeconds / 60)} минут, видеоурок в последнем задании — до 3 минут. На телефоне откроется камера.</p>{!checked && <DeviceCheck onOk={() => {
    setChecked(true);
    try {
      localStorage.setItem(CHECK_KEY, "1");
    } catch {
    }
  }} />}{qs.map((q, i) => <div className="hr-vq" key={i}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><h3>Question {i + 1} <span className="hr-note" style={{ fontWeight: 500 }}>· {TYPE_LABEL[q.type]}</span></h3><span className={`hr-pill ${ok(i) ? "hr-ok" : ""}`}>{ok(i) ? "\u2713 \u0413\u043E\u0442\u043E\u0432\u043E" : "\u041D\u0435\u0442 \u043E\u0442\u0432\u0435\u0442\u0430"}</span></div><div className="hr-qtext">{q.q}</div>{q.type === "video" && <><VideoAnswer
    token={token}
    index={i}
    maxSeconds={q.seconds || cfg.settings.videoSeconds}
    maxMb={cfg.settings.videoMaxMB}
    answer={byIndex[i]?.videoName ? byIndex[i] : void 0}
    onState={onState}
    onError={setErr}
    busy={busy}
    setBusy={setBusy}
  />{byIndex[i]?.videoUrl && <video controls preload="metadata" src={API + byIndex[i].videoUrl} />}</>}{q.type === "text" && <textarea className="hr-tans" placeholder="Type your answer in English…" value={texts[i] || ""} onFocus={() => open(i)} onChange={(e) => onText(i, e.target.value)} />}{q.type === "choice" && <div className="hr-chips">{(q.o || []).map((o) => <button key={o} className={`hr-chip ${choices[i] === o ? "hr-sel" : ""}`} aria-pressed={choices[i] === o} onClick={() => onChoice(i, o)}>{o}</button>)}</div>}</div>)}<div className="hr-actions"><span className="hr-note">Отвечено {done} из {qs.length}</span><button className="hr-btn" disabled={done < qs.length || busy} onClick={next}>Далее: условия работы →</button></div><p className="hr-err" role="alert">{err}</p></>;
}
export {
  InterviewStage
};
