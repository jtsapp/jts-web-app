/**
 * «Добавить в календарь» у объявления-события (ТЗ кабинетов, раздел 7): дата и время вводятся строкой вроде
 * «30.10.2026 · 19:00 Алматы», из неё собирается файл .ics. Время — Алматы (UTC+5), в файл оно идёт в UTC.
 */
const ALMATY_OFFSET_HOURS = 5;
const EVENT_MINUTES = 60;
const WHEN = /(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\D{0,12}(\d{1,2})[:.](\d{2})/;
/** Разбирает «дд.мм[.гггг] … чч:мм»; год не указан — берётся год {@code today}. Не разобрали — {@code null}. */
export function parseEventStart(text, today = new Date()) {
    const match = WHEN.exec(text ?? '');
    if (!match)
        return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    let year = match[3] ? Number(match[3]) : today.getFullYear();
    if (year < 100)
        year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59)
        return null;
    const start = new Date(Date.UTC(year, month - 1, day, hour - ALMATY_OFFSET_HOURS, minute));
    return { start, end: new Date(start.getTime() + EVENT_MINUTES * 60000) };
}
const stamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const escape = (value) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
/** Содержимое файла .ics с одним событием. */
export function buildIcs(uid, title, description, event, now = new Date()) {
    return [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Just to Study//What\'s New//RU', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
        `UID:${uid}@justtostudy.kz`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(event.start)}`, `DTEND:${stamp(event.end)}`,
        `SUMMARY:${escape(title)}`, `DESCRIPTION:${escape(description)}`, 'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n') + '\r\n';
}
/** Отдаёт файл браузеру на скачивание. */
export function downloadIcs(fileName, content) {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
