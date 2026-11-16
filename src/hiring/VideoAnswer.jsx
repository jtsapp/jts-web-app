"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { canRecord, fmtTime, openCamera, pickMime } from "./recorder.js";
import { ignoreLeaves } from "./proctor.js";
function VideoAnswer({ token, index, maxSeconds, maxMb, answer, onState, onError, busy, setBusy }) {
  const [stream, setStream] = useState(null);
  const [secs, setSecs] = useState(0);
  const [progress, setProgress] = useState(null);
  const rec = useRef(null);
  const chunks = useRef([]);
  const started = useRef(0);
  const live = useRef(null);
  const file = useRef(null);
  useEffect(() => {
    if (stream && live.current) live.current.srcObject = stream;
  }, [stream]);
  useEffect(() => () => {
    stream?.getTracks().forEach((t) => t.stop());
  }, [stream]);
  const send = async (blob, name, seconds, mode) => {
    if (blob.size > maxMb * 1024 * 1024) {
      onError(`\u0412\u0438\u0434\u0435\u043E \u043A \u0432\u043E\u043F\u0440\u043E\u0441\u0443 ${index + 1} \u0431\u043E\u043B\u044C\u0448\u0435 ${maxMb} \u041C\u0411. \u0421\u043D\u0438\u043C\u0438\u0442\u0435 \u043F\u043E\u043A\u043E\u0440\u043E\u0447\u0435 \u0438\u043B\u0438 \u0432 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0435 720p.`);
      return;
    }
    setProgress(0);
    setBusy(true);
    try {
      onState(await api.video(token, index, blob, name, seconds, mode, setProgress));
      onError("");
    } catch (x) {
      onError(x.message);
    }
    setProgress(null);
    setBusy(false);
  };
  const record = async () => {
    if (rec.current || busy) return;
    api.open(token, index).catch(() => {
    });
    ignoreLeaves(15e3);
    if (!canRecord()) {
      ignoreLeaves(6e5);
      file.current?.click();
      return;
    }
    let s;
    try {
      s = await openCamera();
    } catch {
      onError("\u041A\u0430\u043C\u0435\u0440\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0432 \u044D\u0442\u043E\u043C \u043E\u043A\u043D\u0435 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u2014 \u043E\u0442\u043A\u0440\u043E\u0435\u0442\u0441\u044F \u0437\u0430\u043F\u0438\u0441\u044C \u0447\u0435\u0440\u0435\u0437 \u043A\u0430\u043C\u0435\u0440\u0443 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 \u0438\u043B\u0438 \u0432\u044B\u0431\u043E\u0440 \u0444\u0430\u0439\u043B\u0430.");
      ignoreLeaves(6e5);
      file.current?.click();
      return;
    }
    const mime = pickMime();
    const mr = new MediaRecorder(s, mime ? { mimeType: mime, videoBitsPerSecond: 9e5 } : { videoBitsPerSecond: 9e5 });
    chunks.current = [];
    mr.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    mr.onstop = () => {
      s.getTracks().forEach((t) => t.stop());
      setStream(null);
      rec.current = null;
      const type = mr.mimeType || "video/webm";
      const blob = new Blob(chunks.current, { type });
      send(blob, `answer-${index + 1}.${type.includes("mp4") ? "mp4" : "webm"}`, Math.round((Date.now() - started.current) / 1e3), "camera");
    };
    rec.current = mr;
    started.current = Date.now();
    setSecs(0);
    setStream(s);
    mr.start(1e3);
  };
  useEffect(() => {
    if (!stream) return;
    const t = setInterval(() => {
      const s = Math.round((Date.now() - started.current) / 1e3);
      setSecs(s);
      if (s >= maxSeconds) rec.current?.stop();
    }, 500);
    return () => clearInterval(t);
  }, [stream, maxSeconds]);
  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) send(f, f.name, null, "upload");
  };
  return <>{!stream && <button className={`hr-btn ${answer ? "hr-ghost" : ""}`} disabled={busy || progress !== null} onClick={record}>{answer ? "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u043E\u0442\u0432\u0435\u0442" : "\u25CF \u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u043E\u0442\u0432\u0435\u0442"}</button>}<input ref={file} type="file" accept="video/*" capture="user" hidden onChange={onFile} />{stream && <div className="hr-recbox"><video ref={live} autoPlay muted playsInline /><div className="hr-recbar"><span className="hr-recdot" /><span>{fmtTime(secs)} / {fmtTime(maxSeconds)}</span><button className="hr-btn" onClick={() => rec.current?.stop()}>■ Закончить ответ</button></div></div>}{progress !== null && <><p className="hr-note">Загрузка ответа… не закрывайте страницу</p><div className="hr-upbar"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div></>}{answer && progress === null && <span className="hr-note" style={{ marginLeft: 10 }}>{answer.videoName} · {answer.videoMb} МБ{answer.videoSeconds ? ` \xB7 ${answer.videoSeconds} \u0441` : ""}</span>}</>;
}
export {
  VideoAnswer
};
