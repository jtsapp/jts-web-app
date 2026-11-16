"use client";
import { useState } from "react";
import { api } from "./api.js";
import { ConsentText } from "./ConsentText.jsx";
function ConsentGate({ token, onState }) {
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  return <><h1>Добро пожаловать!</h1><p className="hr-lead">Спасибо за отклик на hh.ru. Мы уже перенесли данные из вашего резюме в анкету — проверьте их на следующем шаге. Весь отбор: анкета → тест по английскому → интервью → условия работы, около 60 минут. Прогресс сохраняется.</p><label className="hr-consent"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><ConsentText /></label><div className="hr-actions"><span className="hr-err" role="alert">{err}</span><button className="hr-btn" disabled={!agree} onClick={async () => {
    try {
      onState(await api.consent(token));
    } catch (x) {
      setErr(x.message);
    }
  }}>Продолжить →</button></div></>;
}
export {
  ConsentGate
};
