"use client";
import { useEffect, useRef, useState } from "react";
import { canRecord, micLevel, openCamera } from "./recorder.js";
import { ignoreLeaves } from "./proctor.js";
function DeviceCheck({ onOk }) {
  const [stream, setStream] = useState(null);
  const [level, setLevel] = useState(0);
  const [err, setErr] = useState("");
  const video = useRef(null);
  useEffect(() => {
    if (!stream) return;
    if (video.current) video.current.srcObject = stream;
    const stop = micLevel(stream, setLevel);
    return () => {
      stop();
    };
  }, [stream]);
  useEffect(() => () => {
    stream?.getTracks().forEach((t) => t.stop());
  }, [stream]);
  const start = async () => {
    setErr("");
    if (!canRecord()) {
      setErr("\u042D\u0442\u043E\u0442 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u0443\u043C\u0435\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0442\u044C \u0432\u0438\u0434\u0435\u043E \u2014 \u043E\u0442\u0432\u0435\u0442\u044B \u043C\u043E\u0436\u043D\u043E \u0431\u0443\u0434\u0435\u0442 \u0441\u043D\u044F\u0442\u044C \u043A\u0430\u043C\u0435\u0440\u043E\u0439 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 \u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B\u043E\u043C.");
      return;
    }
    ignoreLeaves(15e3);
    try {
      setStream(await openCamera());
    } catch {
      setErr("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u043A\u0430\u043C\u0435\u0440\u0435 \u0438\u043B\u0438 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D\u0443. \u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0434\u043E\u0441\u0442\u0443\u043F \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u0438\u043B\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043E\u0442\u0432\u0435\u0442\u044B \u0444\u0430\u0439\u043B\u043E\u043C.");
    }
  };
  const done = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    onOk();
  };
  return <div className="hr-devcheck"><b>Проверка камеры и микрофона</b><p className="hr-note" style={{ margin: "4px 0 10px" }}>Убедитесь, что вас видно и слышно. Скажите несколько слов — полоска должна двигаться.</p>{stream ? <><video ref={video} autoPlay muted playsInline /><div className="hr-meter" aria-label="Уровень звука"><i style={{ width: `${Math.round(level * 100)}%` }} /></div><div className="hr-actions" style={{ marginTop: 12 }}><span className="hr-note">{level > 0.05 ? "\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u2713" : "\u0421\u043A\u0430\u0436\u0438\u0442\u0435 \u0447\u0442\u043E-\u043D\u0438\u0431\u0443\u0434\u044C\u2026"}</span><button className="hr-btn hr-sm" onClick={done}>Всё работает</button></div></> : <div className="hr-actions" style={{ marginTop: 0 }}><span className="hr-err">{err}</span><div style={{ display: "flex", gap: 8 }}><button className="hr-btn hr-ghost hr-sm" onClick={onOk}>Пропустить</button><button className="hr-btn hr-sm" onClick={start}>Проверить</button></div></div>}</div>;
}
export {
  DeviceCheck
};
