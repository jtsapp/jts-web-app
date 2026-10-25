import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMatchingCase,
  saveMatchingPreferences,
  askMatchingManager,
  getMatchingCandidates,
  sendMatchingRequests,
  confirmMatchingSchedule,
  requestTeacherChange,
  getMatchingHandoffs,
  chooseMatchingHandoff,
} from "../api.js";
import { localSlot, sameSlot, slotLabel } from "./slots.js";
import styles from "./TeacherMatchingPanel.module.css";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const TIMES = Array.from(
  { length: 48 },
  (_, i) =>
    String(Math.floor(i / 2)).padStart(2, "0") + ":" + (i % 2 ? "30" : "00"),
);
const errorText = (e) =>
  e?.serverMessage || e?.message || "Не удалось выполнить действие";
export default function TeacherMatchingPanel(props) {
  return <MatchingPanel key={props.token || 'anonymous'} {...props} />;
}

function MatchingPanel({
  token,
  compact = false,
  onOpen,
}) {
  const activeToken = useRef(token);
  useEffect(() => {
    activeToken.current = token;
    return () => { activeToken.current = null; };
  }, [token]);
  const [card, setCard] = useState(null);
  const [slots, setSlots] = useState([]);
  const [interests, setInterests] = useState("");
  const [wish, setWish] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState([]);
  const [handoffs, setHandoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [change, setChange] = useState(false);
  const [reason, setReason] = useState("");
  const [text, setText] = useState("");
  const refresh = useCallback(
    async (initial = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const next = await getMatchingCase(token);
        if (activeToken.current !== token) return;
        setCard(next);
        if (initial) {
          setSlots(next.availableSlots || []);
          setInterests((next.interests || []).join(", "));
          setWish(next.wish || "");
        }
        if (!compact) {
          const list = await getMatchingHandoffs(token);
          if (activeToken.current === token) setHandoffs(list);
        }
      } catch (e) {
        if (activeToken.current !== token) return;
        if (e.status === 404) setCard(null);
        else setError(errorText(e));
      } finally {
        if (activeToken.current === token) setLoading(false);
      }
    },
    [token, compact],
  );
  useEffect(() => {
    let active = true;
    // Each component owns its request lifetime; late replies after logout are ignored.
    const load = async () => {
      try {
        if (!token) {
          if (active) setLoading(false);
          return;
        }
        const next = await getMatchingCase(token);
        if (!active) return;
        setCard(next);
        setSlots(next.availableSlots || []);
        setInterests((next.interests || []).join(", "));
        setWish(next.wish || "");
        if (!compact) {
          const list = await getMatchingHandoffs(token);
          if (active) setHandoffs(list);
        }
      } catch (e) {
        if (active && e.status !== 404) setError(errorText(e));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const timer = setInterval(async () => {
      if (!active || !token) return;
      try {
        const next = await getMatchingCase(token);
        if (active) setCard(next);
      } catch {
        /* preserve the last visible state during a temporary connection failure */
      }
    }, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [token, compact]);
  async function run(action, success) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      if (activeToken.current !== token) return;
      setNotice(success);
      await refresh();
    } catch (e) {
      if (activeToken.current === token) setError(errorText(e));
    } finally {
      if (activeToken.current === token) setBusy(false);
    }
  }
  const preferences = () => ({
    slots,
    interests: interests
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    wish,
  });
  async function find() {
    await run(async () => {
      await saveMatchingPreferences(token, preferences());
      const list = await getMatchingCandidates(token);
      if (activeToken.current !== token) return;
      setCandidates(list);
      setSelected([]);
    }, "Удобное время сохранено");
  }
  function toggle(day, time) {
    const slot = localSlot(day, time);
    setSlots((list) =>
      list.some((s) => sameSlot(s, slot))
        ? list.filter((s) => !sameSlot(s, slot))
        : [...list, slot],
    );
  }
  function choose(id) {
    setSelected((list) =>
      list.includes(id)
        ? list.filter((x) => x !== id)
        : list.length < 3
          ? [...list, id]
          : list,
    );
  }
  if (loading) return null;
  if (!card)
    return error && !compact ? (
      <p className={styles.error} role="alert">
        {error}
      </p>
    ) : null;
  const title =
    card.matchStatus === "confirm"
      ? "Подтвердите расписание"
      : card.matchStatus === "done"
        ? "Мой преподаватель"
        : "Подбор преподавателя";
  if (compact) {
    if (card.matchStatus === "done") return null;
    return (
      <section className={styles.panel}>
        <h2>{title}</h2>
        <p>
          {card.tariff} · {card.lessonDuration} мин · {card.lessonsPerWeek}×/нед
        </p>
        <button className={styles.primary} onClick={onOpen}>
          Открыть подбор
        </button>
      </section>
    );
  }
  const editing = ["tariff", "self", "help", "ask"].includes(card.matchStatus);
  return (
    <section className={styles.panel} aria-label="Подбор преподавателя">
      <h2>{title}</h2>
      <p>
        <b>
          {card.tariff} · {card.lessonDuration} мин · {card.lessonsPerWeek}×/нед
          {card.guarantee ? " · гарантия" : ""}
        </b>
      </p>
      <p>
        Тариф подтверждает менеджер. Удобное время показано в вашем часовом
        поясе.
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!card.tariffConfirmed && (
        <p>
          Менеджер ещё не подтвердил тариф. Пока можно попросить его подобрать
          преподавателя.
        </p>
      )}
      {editing && (
        <>
          {card.matchStatus === "ask" && (
            <p>
              Менеджер получил просьбу подобрать преподавателя. Срок — 24
              рабочих часа.
            </p>
          )}
          {card.matchReason && (
            <p className={styles.error}>{card.matchReason}</p>
          )}
          <details open={card.matchStatus !== "ask"}>
            <summary>Удобное время и интересы</summary>
            <div className={styles.grid}>
              {DAYS.map((day, index) => (
                <div key={day}>
                  <h3>{day}</h3>
                  {TIMES.map((time) => (
                    <button
                      key={time}
                      type="button"
                      aria-pressed={slots.some((s) =>
                        sameSlot(s, localSlot(index + 1, time)),
                      )}
                      className={
                        slots.some((s) =>
                          sameSlot(s, localSlot(index + 1, time)),
                        )
                          ? styles.on
                          : ""
                      }
                      disabled={busy}
                      onClick={() => toggle(index + 1, time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <label>
              Интересы через запятую
              <input
                value={interests}
                maxLength={1000}
                onChange={(e) => setInterests(e.target.value)}
              />
            </label>
            <label>
              Пожелание менеджеру
              <textarea
                value={wish}
                maxLength={500}
                onChange={(e) => setWish(e.target.value)}
              />
            </label>
          </details>
          <div className={styles.actions}>
            <button
              className={styles.primary}
              disabled={busy || !card.tariffConfirmed || !slots.length}
              onClick={find}
            >
              Выбрать преподавателя
            </button>
            <button
              disabled={busy}
              onClick={() =>
                run(
                  () => askMatchingManager(token, preferences()),
                  "Просьба отправлена менеджеру",
                )
              }
            >
              Пусть менеджер подберёт
            </button>
          </div>
          {candidates.map((t) => (
            <article className={styles.candidate} key={t.id}>
              <h3>{t.name}</h3>
              <p>
                {t.matchPercent}% совпадение · {t.interests.join(", ")}
              </p>
              <p>{t.suggestedSlots.map(slotLabel).join(", ")}</p>
              <button
                aria-pressed={selected.includes(t.id)}
                className={selected.includes(t.id) ? styles.on : ""}
                onClick={() => choose(t.id)}
                disabled={
                  busy || (!selected.includes(t.id) && selected.length >= 3)
                }
              >
                {selected.includes(t.id)
                  ? "Выбран (" + (selected.indexOf(t.id) + 1) + ")"
                  : "Выбрать"}
              </button>
            </article>
          ))}
          {!!candidates.length && (
            <button
              className={styles.primary}
              disabled={busy || !selected.length}
              onClick={() =>
                run(
                  () => sendMatchingRequests(token, selected),
                  "Заявки отправлены. Преподаватели ответят в течение 12 часов.",
                )
              }
            >
              Отправить заявки ({selected.length}/3)
            </button>
          )}
        </>
      )}
      {card.matchStatus === "sent" && (
        <>
          <p>
            Заявки отправлены. Ответ до{" "}
            {new Date(card.deadline).toLocaleString("ru-RU")}.
          </p>
          {card.requests
            .filter((r) => r.status === "sent")
            .map((r) => (
              <p key={r.id}>
                {r.priority}. {r.teacherName}
              </p>
            ))}
        </>
      )}
      {card.matchStatus === "confirm" && (
        <>
          <h3>{card.assignedTeacherName}</h3>
          <p>{card.proposedSlots.map(slotLabel).join(", ")}</p>
          <p>
            Время закреплено до{" "}
            {new Date(card.deadline).toLocaleString("ru-RU")}.
          </p>
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() =>
              run(
                () => confirmMatchingSchedule(token),
                "Расписание подтверждено. Уроки созданы.",
              )
            }
          >
            Подтвердить расписание
          </button>
        </>
      )}
      {card.matchStatus === "done" && (
        <>
          <h3>{card.assignedTeacherName}</h3>
          <p>{card.finalSlots.map(slotLabel).join(", ")}</p>
          <button onClick={() => setChange((v) => !v)} disabled={busy}>
            Сменить учителя
          </button>
        </>
      )}
      {card.matchStatus === "change" && (
        <p>
          Запрос на смену отправлен менеджеру. До решения уроки идут по
          расписанию.
        </p>
      )}
      {change && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await requestTeacherChange(token, reason, text);
              setChange(false);
            }, "Запрос на смену отправлен");
          }}
        >
          <label>
            Причина
            <input
              value={reason}
              maxLength={100}
              required
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label>
            Комментарий
            <textarea
              value={text}
              maxLength={1000}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button className={styles.primary} disabled={busy || !reason.trim()}>
            Отправить запрос
          </button>
        </form>
      )}
      {handoffs.map((h) => (
        <article key={h.id} className={styles.candidate}>
          <h3>Перерыв преподавателя</h3>
          <p>
            {h.teacherName}: {h.dateFrom} — {h.dateTo}
          </p>
          <p>Выберите, как продолжить обучение:</p>
          <div className={styles.actions}>
            {[
              ["pause", "Пауза"],
              ["temp_teacher", "Временный преподаватель"],
              ["wait", "Ждать"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={h.studentChoice === key ? styles.on : ""}
                disabled={busy}
                onClick={() =>
                  run(
                    () => chooseMatchingHandoff(token, h.id, key),
                    "Выбор передан менеджеру",
                  )
                }
              >
                {label}
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
