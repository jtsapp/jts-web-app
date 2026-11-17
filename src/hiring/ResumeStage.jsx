"use client";
import { useState } from "react";
import { api, ApiError } from "./api.js";
import { blockReason, num, reqHint } from "./screening.js";
const OTHER = "\u0414\u0440\u0443\u0433\u043E\u0435";
function ResumeStage({ token, cfg, state, onState }) {
  const r = state.resume;
  const C = cfg.content;
  const [f, setF] = useState({
    name: r.name || "",
    phone: r.phone || "",
    email: r.email || "",
    city: r.city || "",
    age: r.age?.toString() || "",
    ielts: r.ielts?.toString() || "",
    sat: r.sat?.toString() || "",
    certs: r.certs || "",
    years: r.years?.toString() || "",
    education: r.education || "",
    about: r.about || ""
  });
  const [positions, setPositions] = useState(r.positions || []);
  const [source, setSource] = useState(r.source || "");
  const [sourceOther, setSourceOther] = useState(r.sourceOther || "");
  const [fileName, setFileName] = useState(r.fileName || "");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setErr("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 20 \u041C\u0411.");
      return;
    }
    setUploading(true);
    setErr("");
    try {
      setFileName((await api.resumeFile(token, file)).fileName);
    } catch (x) {
      setErr(x.message);
    }
    setUploading(false);
  };
  const submit = async (e) => {
    e.preventDefault();
    let msg = "";
    if (!f.name.trim() || !f.phone.trim() || !f.email.trim() || !f.age.trim()) msg = "\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043F\u043E\u043B\u044F (*).";
    else if (!positions.length) msg = "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435.";
    else if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) msg = "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 email.";
    else if (!source) msg = "\u0423\u043A\u0430\u0436\u0438\u0442\u0435, \u043E\u0442\u043A\u0443\u0434\u0430 \u0432\u044B \u0443\u0437\u043D\u0430\u043B\u0438 \u043E \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438.";
    else if (source === OTHER && !sourceOther.trim()) msg = "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A.";
    if (!msg) msg = blockReason(num(f.age), num(f.ielts), num(f.sat), positions, C.requirements, C.minAgeAll);
    if (msg) {
      setErr(msg);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      onState(await api.saveResume(token, { ...f, positions, source, sourceOther }));
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442.");
    }
    setBusy(false);
  };
  return <><h1>Добро пожаловать!</h1><p className="hr-lead">Весь отбор проходит на этом сайте: анкета → тест по английскому → интервью → ознакомление с условиями работы. Это займёт около 60 минут. Прогресс сохраняется — можно вернуться позже по личной ссылке из письма.</p><form onSubmit={submit} noValidate><div className="hr-grid"><label className="hr-f">ФИО *<input type="text" value={f.name} onChange={set("name")} autoComplete="name" /></label><label className="hr-f">Телефон *<input type="tel" value={f.phone} onChange={set("phone")} placeholder="+7 ___ ___ __ __" autoComplete="tel" /></label><label className="hr-f">Email * <small style={{ fontWeight: 400, color: "var(--muted)" }}>— сюда придут напоминания и решение</small><input type="email" value={f.email} onChange={set("email")} autoComplete="email" /></label><label className="hr-f">Город<input type="text" value={f.city} onChange={set("city")} /></label><div className="hr-f hr-full">Направления * <span className="hr-h">можно выбрать несколько, например General English и IELTS</span><div className="hr-chips">{C.positions.map((p) => <button
    type="button"
    key={p}
    className={`hr-chip ${positions.includes(p) ? "hr-sel" : ""}`}
    aria-pressed={positions.includes(p)}
    onClick={() => setPositions(positions.includes(p) ? positions.filter((x) => x !== p) : [...positions, p])}
  >{p}</button>)}</div><span className="hr-h">{reqHint(positions, C.requirements)}</span></div><label className="hr-f">Возраст *<input type="text" value={f.age} onChange={set("age")} inputMode="numeric" /></label><label className="hr-f">Ваш балл IELTS<span className="hr-h">если есть, например 7.5</span><input type="text" value={f.ielts} onChange={set("ielts")} inputMode="decimal" /></label><label className="hr-f">Ваш балл SAT<span className="hr-h">если есть, например 1480</span><input type="text" value={f.sat} onChange={set("sat")} inputMode="numeric" /></label><label className="hr-f">Сертификаты преподавателя<span className="hr-h">CELTA, TESOL, TEFL, TKT — если есть</span><input type="text" value={f.certs} onChange={set("certs")} /></label><label className="hr-f">Опыт работы (лет)<input type="text" value={f.years} onChange={set("years")} inputMode="numeric" /></label><label className="hr-f">Образование<input type="text" value={f.education} onChange={set("education")} placeholder="ВУЗ, специальность" /></label><label className="hr-f hr-full">Коротко о себе и опыте<span className="hr-h">Где работали, с какими возрастами и уровнями, сертификаты (CELTA, IELTS и т.д.)</span><textarea value={f.about} onChange={set("about")} /></label><div className="hr-full"><label className="hr-f" style={{ marginBottom: 6 }}>Файл резюме<span className="hr-h">PDF, DOC или фото — до 20 МБ</span></label><label className={`hr-drop ${fileName ? "hr-ok" : ""}`}><input type="file" accept=".pdf,.doc,.docx,image/*" onChange={onFile} /><span>{uploading ? "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026" : fileName ? `\u2713 ${fileName} \u2014 \u0437\u0430\u043C\u0435\u043D\u0438\u0442\u044C` : "\u041D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435"}</span></label></div></div><h2>Откуда вы узнали о вакансии? *</h2>{r.sourceAuto ? <p className="hr-note" style={{ marginTop: -4 }}>Источник определён по ссылке: <b>{r.source}</b></p> : <div className="hr-chips">{C.sources.map((s) => <button type="button" key={s} className={`hr-chip ${source === s ? "hr-sel" : ""}`} aria-pressed={source === s} onClick={() => setSource(s)}>{s}</button>)}</div>}{source === OTHER && !r.sourceAuto && <input type="text" style={{ marginTop: 10 }} placeholder="Укажите источник" value={sourceOther} onChange={(e) => setSourceOther(e.target.value)} />}<div className="hr-actions"><span className="hr-err" role="alert">{err}</span><button className="hr-btn" type="submit" disabled={busy || uploading}>{busy ? "\u0421\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u2026" : "\u0414\u0430\u043B\u0435\u0435: \u0442\u0435\u0441\u0442 \u043F\u043E \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u043E\u043C\u0443 \u2192"}</button></div></form></>;
}
export {
  ResumeStage
};
