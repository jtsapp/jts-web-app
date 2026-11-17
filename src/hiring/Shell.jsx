const STEPS = ["\u0420\u0435\u0437\u044E\u043C\u0435", "\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439", "\u0418\u043D\u0442\u0435\u0440\u0432\u044C\u044E", "\u0423\u0441\u043B\u043E\u0432\u0438\u044F"];
function Shell({ stage, showSteps, hero, children, note }) {
  return <div className="hr-wrap"><header className="hr-top"><div className="hr-brand"><span className="hr-wordmark">just to study</span><span className="hr-tag">Отбор преподавателей</span></div></header>{hero && <section className="hr-hero"><h1 className="hr-display">Стань<br />преподавателем<br />JTS</h1><p>Весь отбор — на одной странице: анкета, тест, интервью и условия работы.</p></section>}{showSteps && <nav className="hr-steps" aria-label="Этапы отбора">{STEPS.map((s, i) => <div key={s} className={`hr-step ${i + 1 === stage ? "hr-on" : ""} ${i + 1 < stage || stage === 5 ? "hr-done" : ""}`}><b>Этап {i + 1}</b>{s}</div>)}</nav>}<main className="hr-card">{children}</main>{note && <p className="hr-note" style={{ textAlign: "center", marginTop: 16, color: "rgba(255,255,255,.85)" }}>{note}</p>}</div>;
}
export {
  Shell
};
