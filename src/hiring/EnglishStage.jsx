"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { fmtDate } from "./screening.js";
import { ProctorNote } from "./ProctorNote.jsx";
/** Часы устройства — для поправки таймера на расхождение с сервером (вызывается только из обработчиков). */
const clockNow = () => Date.now();
function EnglishStage({ token, cfg, state, onState, onTestActive }) {
  const [test, setTest] = useState(null);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(0);
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const skew = useRef(0);
  const finishing = useRef(false);
  const result = state.english && !test ? state.english : null;
  const adopt = useCallback((t) => {
    skew.current = t.serverNow - Date.now();
    setTest(t);
    onTestActive(true);
  }, [onTestActive]);
  useEffect(() => {
    let alive = true;
    if (state.view === "english" && (!state.english || state.retakeMode)) {
      api.testCurrent(token).then((t) => {
        if (alive) adopt(t);
      }).catch(() => {
      }).finally(() => alive && setLoading(false));
    } else setLoading(false);
    return () => {
      alive = false;
    };
  }, [token, state.view, state.english, state.retakeMode, adopt]);
  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    try {
      const s = await api.testSubmit(token);
      setTest(null);
      onTestActive(false);
      onState(s);
    } catch (x) {
      setErr(x.message);
      try {
        onState(await api.state(token));
        setTest(null);
        onTestActive(false);
      } catch {
      }
    }
    finishing.current = false;
  }, [token, onState, onTestActive]);
  useEffect(() => {
    if (!test) return;
    const tick = () => {
      const ms = Math.max(0, test.deadline - (Date.now() + skew.current));
      setLeft(ms);
      if (ms <= 0) finish();
    };
    tick();
    const t = setInterval(tick, 1e3);
    return () => clearInterval(t);
  }, [test, finish]);
  const start = async () => {
    setErr("");
    try {
      adopt(await api.testStart(token));
      setI(0);
    } catch (x) {
      setErr(x.message);
    }
  };
  if (loading) return <p className="hr-lead">Загрузка…</p>;
  if (test) {
    const n = test.questions.length, q = test.questions[i];
    const has = (k) => (test.answers[String(k)] || []).length > 0;
    const answered = test.questions.filter((_, k) => has(k)).length;
    const mine = test.answers[String(i)] || [];
    const pickOpt = async (k) => {
      let next = mine.slice();
      if (q.pick > 1) {
        const at = next.indexOf(k);
        if (at >= 0) next.splice(at, 1);
        else {
          next.push(k);
          if (next.length > q.pick) next.shift();
        }
      } else next = [k];
      setTest({ ...test, answers: { ...test.answers, [String(i)]: next } });
      setConfirm(false);
      try {
        const t = await api.testAnswer(token, i, next);
        skew.current = t.serverNow - clockNow();
        setTest((cur) => cur ? { ...cur, answers: t.answers } : cur);
      } catch (x) {
        setErr(x.message);
        if (x.status === 400) finish();
      }
      if (next.length === q.pick && i < n - 1) setTimeout(() => setI((v) => Math.min(v + 1, n - 1)), q.pick > 1 ? 300 : 220);
    };
    const submit = () => {
      const miss = test.questions.findIndex((qq, k) => (test.answers[String(k)] || []).length < qq.pick);
      if (miss >= 0 && !confirm) {
        setErr(`\u0415\u0441\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u0431\u0435\u0437 \u043E\u0442\u0432\u0435\u0442\u0430 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u2116${miss + 1}). \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437, \u0447\u0442\u043E\u0431\u044B \u0432\u0441\u0451 \u0440\u0430\u0432\u043D\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C.`);
        setConfirm(true);
        return;
      }
      finish();
    };
    const m = Math.floor(left / 6e4), s = Math.floor(left / 1e3) % 60;
    return <><div className="hr-tbar"><span>Вопрос {i + 1} из {n} · отвечено {answered}</span><span className={`hr-timer ${left < 12e4 ? "hr-low" : ""}`}>{m}:{String(s).padStart(2, "0")}</span></div><div className="hr-prog"><i style={{ width: `${answered / n * 100}%` }} /></div><p className="hr-q">{q.q}</p>{q.pick > 1 && <p className="hr-note" style={{ margin: "-8px 0 12px" }}>Выберите {q.pick} ответа</p>}<div className="hr-opts">{q.options.map((o, k) => <button key={k} className={`hr-opt ${mine.includes(k) ? "hr-sel" : ""}`} onClick={() => pickOpt(k)}>{String.fromCharCode(65 + k)}. {o}</button>)}</div><div className="hr-actions"><button className="hr-btn hr-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← Назад</button>{i < n - 1 ? <button className="hr-btn" onClick={() => setI(i + 1)}>Далее →</button> : <button className="hr-btn" onClick={submit}>Отправить тест</button>}</div><p className="hr-err" role="alert">{err}</p></>;
  }
  if (result) {
    const retakeInfo = state.retake && !state.retakeMode ? state.retake : null;
    return <><h1>Тест завершён</h1><p className="hr-lead">Спасибо! Результат сохранён и будет передан рекрутеру.</p><div className="hr-result"><div className="hr-big">{result.score}/{result.total}</div><div><b>Ориентировочный уровень: {result.level}</b><div className="hr-note">{result.percent}% правильных ответов</div></div></div>{state.retakeMode ? <p className="hr-note">Это пересдача — после неё вы вернётесь туда, где остановились.</p> : retakeInfo && !retakeInfo.can ? <p className="hr-note" style={{ marginTop: 14 }}>Если результат теста ниже ожидаемого, пересдать его можно с {fmtDate(retakeInfo.from)}.</p> : null}<div className="hr-actions"><span className="hr-err">{err}</span><button className="hr-btn" onClick={async () => {
      try {
        onState(await api.testContinue(token));
      } catch (x) {
        setErr(x.message);
      }
    }}>{state.retakeMode ? "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u2192" : "\u0414\u0430\u043B\u0435\u0435: \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E \u2192"}</button></div></>;
  }
  return <><h1>Тест на знание английского</h1><p className="hr-lead">{cfg.content.englishCount} вопросов с одним правильным ответом. На всё — {cfg.settings.englishMinutes} минут. Таймер запустится после нажатия «Начать» и не остановится, если закрыть страницу. Вернуться к предыдущим вопросам можно до отправки.</p><ul className="hr-note" style={{ paddingLeft: 18, margin: "0 0 10px" }}><li>Не пользуйтесь переводчиками — результат влияет на уровень ставки.</li><li>Когда время выйдет, тест отправится автоматически.</li></ul><ProctorNote />{cfg.settings.webcamProctoring && <p className="hr-note">Во время теста камера будет делать редкие снимки для рекрутера — разрешите доступ к камере.</p>}<div className="hr-actions"><span className="hr-err" role="alert">{err}</span><button className="hr-btn" onClick={start}>Начать тест</button></div></>;
}
export {
  EnglishStage
};
