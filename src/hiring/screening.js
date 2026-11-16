function reqHint(selected, req) {
  const t = selected.map((p) => req[p] ? `${p}: ${req[p].text}` : null).filter(Boolean);
  return t.length ? "\u0422\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F \u2014 " + t.join("; ") : "";
}
function num(x) {
  const n = parseFloat(String(x ?? "").replace(",", ".").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}
function blockReason(age, ielts, sat, positions, req, minAgeAll) {
  if (age === null || age < 14 || age > 90) return "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0432\u043E\u0437\u0440\u0430\u0441\u0442 \u0447\u0438\u0441\u043B\u043E\u043C.";
  if (age < minAgeAll) return `\u041C\u044B \u0440\u0430\u0441\u0441\u043C\u0430\u0442\u0440\u0438\u0432\u0430\u0435\u043C \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u043E\u0432 \u043D\u0435 \u043C\u043B\u0430\u0434\u0448\u0435 ${minAgeAll}.`;
  const bad = [];
  positions.forEach((p) => {
    const rq = req[p] || {};
    if (rq.minAge && age < rq.minAge) bad.push(`\xAB${p}\xBB \u2014 \u0432\u043E\u0437\u0440\u0430\u0441\u0442 \u043D\u0435 \u043C\u043B\u0430\u0434\u0448\u0435 ${rq.minAge}`);
    else if (rq.minIelts && (ielts === null || ielts < rq.minIelts)) bad.push(`\xAB${p}\xBB \u2014 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 IELTS ${rq.minIelts} \u0438 \u0432\u044B\u0448\u0435 (\u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0431\u0430\u043B\u043B)`);
    else if (rq.minSat && (sat === null || sat < rq.minSat)) bad.push(`\xAB${p}\xBB \u2014 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 SAT ${rq.minSat} \u0438 \u0432\u044B\u0448\u0435 (\u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0431\u0430\u043B\u043B)`);
  });
  return bad.length ? `\u041D\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0442 \u0442\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F: ${bad.join("; ")}. \u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0431\u0430\u043B\u043B \u0438\u043B\u0438 \u0441\u043D\u0438\u043C\u0438\u0442\u0435 \u044D\u0442\u043E \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435.` : "";
}
const fmtDate = (t) => t ? new Date(t).toLocaleDateString("ru-RU") : "";
export {
  blockReason,
  fmtDate,
  num,
  reqHint
};
