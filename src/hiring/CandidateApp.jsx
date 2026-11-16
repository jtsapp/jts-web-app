"use client";
import { useCallback, useEffect, useState } from "react";
import { api, saveToken } from "./api.js";
import { useProctor, useWebcamSnapshots } from "./proctor.js";
import { ConsentGate } from "./ConsentGate.jsx";
import { DoneStage } from "./DoneStage.jsx";
import { EnglishStage } from "./EnglishStage.jsx";
import { InterviewStage } from "./InterviewStage.jsx";
import { ProctorWarn } from "./ProctorNote.jsx";
import { ResumeStage } from "./ResumeStage.jsx";
import { Shell } from "./Shell.jsx";
import { TermsStage } from "./TermsStage.jsx";
const STAGE_OF = { resume: 1, english: 2, interview: 3, terms: 4, done: 5 };
function CandidateApp({ token }) {
  const [cfg, setCfg] = useState(null);
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [testActive, setTestActive] = useState(false);
  const [note, setNote] = useState("");
  const load = useCallback(async () => {
    try {
      setState(await api.state(token));
      setError("");
    } catch (x) {
      setError(x.message);
    }
  }, [token]);
  useEffect(() => {
    saveToken(token);
    api.config().then(setCfg).catch(() => setError("\u0421\u0435\u0440\u0432\u0435\u0440 \u043E\u0442\u0431\u043E\u0440\u0430 \u043D\u0435 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443."));
    load();
    if (new URLSearchParams(window.location.search).get("unsubscribe") === "1") {
      api.unsubscribe(token).then(() => setNote("\u0412\u044B \u043E\u0442\u043F\u0438\u0441\u0430\u043B\u0438\u0441\u044C \u043E\u0442 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439. \u041F\u0438\u0441\u044C\u043C\u0430 \u043E \u0440\u0435\u0448\u0435\u043D\u0438\u0438 \u043F\u043E \u0437\u0430\u044F\u0432\u043A\u0435 \u043F\u0440\u0438\u0434\u0443\u0442 \u043A\u0430\u043A \u043E\u0431\u044B\u0447\u043D\u043E.")).catch(() => {
      });
    }
  }, [token, load]);
  useEffect(() => {
    if (state?.view !== "done") return;
    const t = setInterval(load, 3e4);
    const onVis = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [state?.view, load]);
  const view = state?.view;
  const proctorStage = view === "english" && testActive ? "english" : view === "interview" ? "interview" : null;
  const proctor = useProctor(
    token,
    proctorStage,
    cfg?.settings.proctorWarnAfter ?? 2,
    proctorStage ? state?.proctorLeaves?.[proctorStage] ?? 0 : 0
  );
  useWebcamSnapshots(token, view === "english" && testActive ? "english" : null, !!cfg?.settings.webcamProctoring);
  if (error && !state) return <Shell stage={1} showSteps={false} hero={false}><h1>Ссылка не открылась</h1><p className="hr-lead">{error}</p><a className="hr-btn" href="/hr/apply">Начать отбор</a></Shell>;
  if (!state || !cfg) return <Shell stage={1} showSteps={false} hero={false}><p className="hr-lead">Загрузка…</p></Shell>;
  const stage = STAGE_OF[state.view];
  const props = { token, cfg, state, onState: (s) => {
    setState(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } };
  return <Shell stage={stage} showSteps hero={state.view === "resume"} note={note || "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438. \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043C\u043E\u0436\u043D\u043E \u043F\u043E \u043B\u0438\u0447\u043D\u043E\u0439 \u0441\u0441\u044B\u043B\u043A\u0435 \u0438\u0437 \u043F\u0438\u0441\u044C\u043C\u0430."}>{!state.pdConsent && <ConsentGate token={token} onState={props.onState} />}{state.pdConsent && state.view === "resume" && <ResumeStage {...props} />}{state.view === "english" && <EnglishStage {...props} onTestActive={setTestActive} />}{state.view === "interview" && <InterviewStage {...props} />}{state.view === "terms" && <TermsStage {...props} />}{state.view === "done" && <DoneStage token={token} state={state} onState={props.onState} />}{proctor.warn && proctorStage && <ProctorWarn n={proctor.leaves} stage={proctorStage} onClose={proctor.dismiss} />}</Shell>;
}
export {
  CandidateApp
};
