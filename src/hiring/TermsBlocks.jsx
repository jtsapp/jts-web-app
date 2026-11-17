function md(t) {
  return t.split(/(\*\*.+?\*\*)/g).map((p, i) => p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>);
}
function TermsBlock({ b }) {
  if (b.type === "table") return <>{b.caption && <p className="hr-cap">{md(b.caption)}</p>}<div style={{ overflowX: "auto" }}><table className="hr-fines"><thead><tr>{b.head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, k) => <td key={k} className={b.money && k === r.length - 1 ? "sum" : ""}>{md(c)}</td>)}</tr>)}</tbody></table></div></>;
  if (b.type === "list") return <>{b.caption && <p className="hr-cap">{md(b.caption)}</p>}<ul>{b.items.map((x, i) => <li key={i}>{md(x)}</li>)}</ul></>;
  if (b.type === "cards") return <div className="hr-tcards">{b.items.map(([h, t]) => <div className="hr-tcard" key={h}><b>{h}</b><span>{md(t)}</span></div>)}</div>;
  return <div className={`hr-tnote ${b.warn ? "hr-warn" : ""}`}>{md(b.text)}</div>;
}
export {
  TermsBlock
};
