"use client";
import { useEffect, useState } from "react";
import { api, savedToken, saveToken } from "./api.js";
import { ConsentText } from "./ConsentText.jsx";
import { Shell } from "./Shell.jsx";
function ApplyStart() {
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setSrc(p.get("src") || (window.location.hash ? window.location.hash.slice(1) : null));
    const t = savedToken();
    if (t && p.get("new") !== "1") window.location.replace(`/hr/c/${t}`);
  }, []);
  const start = async () => {
    setBusy(true);
    setErr("");
    try {
      const { token } = await api.start(src);
      saveToken(token);
      window.location.assign(`/hr/c/${token}`);
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  };
  return <Shell stage={1} showSteps hero><h1>Добро пожаловать!</h1><p className="hr-lead">Весь отбор проходит на этом сайте: анкета → тест по английскому → интервью → ознакомление с условиями работы. Это займёт около 60 минут. Прогресс сохраняется — можно вернуться позже.</p><label className="hr-consent"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><ConsentText /></label><div className="hr-actions"><span className="hr-err" role="alert">{err}</span><button className="hr-btn" disabled={!agree || busy} onClick={start}>{busy ? "\u041C\u0438\u043D\u0443\u0442\u043A\u0443\u2026" : "\u041D\u0430\u0447\u0430\u0442\u044C \u043E\u0442\u0431\u043E\u0440 \u2192"}</button></div></Shell>;
}
export {
  ApplyStart
};
