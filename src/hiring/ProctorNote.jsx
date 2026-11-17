function ProctorNote() {
  return <div className="hr-banner" style={{ margin: "0 0 16px" }}>🔒 Включён прокторинг: фиксируются переключения на другие вкладки и приложения, копирование и вставка текста отключены. Отчёт передаётся рекрутеру.</div>;
}
function ProctorWarn({ n, stage, onClose }) {
  return <div className="hr-pwarn"><b>Вы покинули страницу {n} раз.</b> Во время {stage === "english" ? "\u0442\u0435\u0441\u0442\u0430" : "\u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E"} не переключайтесь на другие вкладки и приложения — это фиксируется и передаётся рекрутеру.{" "}<button className="hr-linkbtn" onClick={onClose}>Понятно</button></div>;
}
export {
  ProctorNote,
  ProctorWarn
};
