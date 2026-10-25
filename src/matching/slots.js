// Weekly slots are stored in UTC. Convert the weekday together with the time.
export function localSlot(day, time) {
  const date = new Date(
    2026,
    0,
    5 + day - 1,
    Number(time.slice(0, 2)),
    Number(time.slice(3, 5)),
  );
  return {
    weekday: date.getUTCDay() || 7,
    start: date.toISOString().slice(11, 19),
  };
}
export function slotDate(slot) {
  return new Date(
    Date.UTC(
      2026,
      0,
      5 + slot.weekday - 1,
      Number(slot.start.slice(0, 2)),
      Number(slot.start.slice(3, 5)),
    ),
  );
}
export function slotLabel(slot) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(slotDate(slot));
}
export function sameSlot(a, b) {
  return a.weekday === b.weekday && a.start.slice(0, 5) === b.start.slice(0, 5);
}
