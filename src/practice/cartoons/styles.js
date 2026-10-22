// CSS Cartoon World для Shadow DOM — перенесён из прототипа. Отличия: :root → :host
// (переменные видны внутри тени), body → .ctw (корень раздела); тёмная тема — по
// теме приложения (атрибут data-theme хоста), а не по системной настройке ОС —
// блоки prefers-color-scheme убраны; шрифт — сайта (--cw-font ставит экран из
// вычисленного шрифта страницы; Onest, Inter, Gilroy и Druk прототипа не
// переносятся). Правки оформления — здесь и в прототипе одновременно.

export const CARTOONS_CSS = `
/*
 * Cartoons for English Learning — styles.
 * Library = filter bar + card shelves; watch = large video with the character game right below it.
 * Brand tokens follow jtstudy-english.kz (violet #6332FF). Every class is prefixed "ct-".
 */
:host {
  --ct-violet: #6332ff;
  --ct-violet-ink: #4a1fe0;
  --ct-violet-soft: #efeaff;
  --ct-pink: #ff2ac1;
  --ct-bg: #ffffff;
  --ct-surface: #f6f4fb;
  --ct-surface-2: #ece8f6;
  --ct-line: #e2ddef;
  --ct-ink: #0f0f0f;
  --ct-ink-2: #45424f;
  --ct-ink-3: #6f6b7c;
  --ct-on-violet: #ffffff;
  --ct-ok: #1d7a4f;
  --ct-ok-soft: #e3f4ec;
  --ct-warn: #8a5a00;
  --ct-warn-soft: #fff2d6;
  --ct-video-bg: #0f0f0f;
  --ct-focus: #6332ff;
  --ct-shadow: 0 1px 2px rgba(25, 10, 70, .06), 0 8px 24px rgba(25, 10, 70, .07);

  --ct-font-display: var(--cw-font, inherit);
  --ct-font-text: var(--cw-font, inherit);

  --ct-r-s: 6px;
  --ct-r-m: 12px;
  --ct-r-l: 20px;
  --ct-header-h: 64px;
  --ct-gutter: clamp(16px, 4vw, 40px);
  color-scheme: light;
}

:host([data-theme="dark"]) {
  --ct-violet: #8d6bff;
  --ct-violet-ink: #b4a0ff;
  --ct-violet-soft: #241a45;
  --ct-bg: #0f0f12;
  --ct-surface: #17161d;
  --ct-surface-2: #201e29;
  --ct-line: #2c2938;
  --ct-ink: #f3f1f8;
  --ct-ink-2: #c9c5d6;
  --ct-ink-3: #9a95ab;
  --ct-ok: #6fd3a2;
  --ct-ok-soft: #12291f;
  --ct-warn: #f0bf5a;
  --ct-warn-soft: #2b2210;
  --ct-focus: #b4a0ff;
  --ct-shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 8px 24px rgba(0, 0, 0, .35);
  color-scheme: dark;
}

.ctw { margin: 0; background: var(--ct-bg); color: var(--ct-ink); }

.ct {
  font-family: var(--ct-font-text);
  font-size: 16px;
  line-height: 1.5;
  color: var(--ct-ink);
  background: var(--ct-bg);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  -webkit-font-smoothing: antialiased;
}
.ct *, .ct *::before, .ct *::after { box-sizing: border-box; }
.ct a { color: var(--ct-violet-ink); }
.ct button, .ct select, .ct input { font: inherit; color: inherit; }
.ct :focus-visible { outline: 2px solid var(--ct-focus); outline-offset: 2px; border-radius: var(--ct-r-s); }
.ct [hidden] { display: none !important; }

.ct-visually-hidden {
  position: absolute !important; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0; padding: 0; margin: -1px;
}
.ct-skip {
  position: absolute; left: 12px; top: -48px; z-index: 50;
  background: var(--ct-violet); color: var(--ct-on-violet) !important;
  padding: 8px 14px; border-radius: var(--ct-r-s); text-decoration: none; font-weight: 700;
}
.ct-skip:focus { top: 12px; }

/* ---------- Header ---------- */
.ct-top {
  position: sticky; top: env(safe-area-inset-top, 0px); z-index: 20;
  background: var(--ct-bg);
  border-bottom: 1px solid var(--ct-line);
}
.ct-top__inner {
  max-width: 1360px; margin: 0 auto; min-height: var(--ct-header-h);
  padding-inline: var(--ct-gutter);
  display: flex; align-items: center; gap: 20px;
}
.ct-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--ct-ink) !important; }
.ct-brand__mark {
  font-family: var(--ct-font-display); font-weight: 700; font-size: 12px; letter-spacing: .04em;
  background: var(--ct-violet); color: var(--ct-on-violet);
  padding: 7px 8px 6px; border-radius: var(--ct-r-s); line-height: 1;
}
.ct-brand__name { font-weight: 800; font-size: 15px; white-space: nowrap; }
.ct-crumbs { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; font-size: 14px; color: var(--ct-ink-3); }
.ct-crumbs a { color: var(--ct-ink-2); text-decoration: none; font-weight: 600; }
.ct-crumbs a:hover { color: var(--ct-violet-ink); }
.ct-crumbs__current { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ct-ink); font-weight: 600; }
.ct-uilang { display: inline-flex; border: 1px solid var(--ct-line); border-radius: 999px; padding: 3px; }
.ct-uilang__btn {
  border: 0; background: transparent; padding: 4px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 700; letter-spacing: .06em; cursor: pointer; color: var(--ct-ink-3);
}
.ct-uilang__btn[aria-pressed="true"] { background: var(--ct-ink); color: var(--ct-bg); }

main { flex: 1; }
.ct-view { max-width: 1360px; margin: 0 auto; padding-inline: var(--ct-gutter); padding-block: 32px 56px; }

/* ---------- Type ---------- */
.ct-eyebrow {
  margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  color: var(--ct-violet-ink);
}
.ct-h1, .ct-h2 {
  font-family: var(--ct-font-display); font-weight: 700; text-transform: uppercase;
  letter-spacing: .005em; line-height: 1.08; margin: 0; text-wrap: balance;
}
.ct-h1 { font-size: clamp(28px, 4.4vw, 52px); max-width: 18ch; }
.ct-h2 { font-size: clamp(22px, 2.4vw, 30px); }
.ct-h3 { font-size: 16px; font-weight: 800; margin: 0; letter-spacing: .01em; }
.ct-lead { margin: 16px 0 0; font-size: 18px; color: var(--ct-ink-2); max-width: 60ch; }

/* ---------- Library ---------- */
.ct-hero { padding-block: 8px 28px; }

.ct-filters {
  display: grid; gap: 14px;
  padding: 16px; border-radius: var(--ct-r-l);
  background: var(--ct-surface); border: 1px solid var(--ct-line);
}
.ct-search { position: relative; }
.ct-search__icon { position: absolute; left: 14px; top: 50%; width: 18px; height: 18px; transform: translateY(-50%); color: var(--ct-ink-3); }
.ct-search input {
  width: 100%; height: 48px; padding: 0 16px 0 42px;
  border-radius: var(--ct-r-m); border: 1px solid var(--ct-line); background: var(--ct-bg);
  font-size: 16px;
}
.ct-search input:focus { border-color: var(--ct-violet); outline: none; box-shadow: 0 0 0 3px var(--ct-violet-soft); }
.ct-levels { border: 0; margin: 0; padding: 0; min-width: 0; }
.ct-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.ct-chip {
  border: 1px solid var(--ct-line); background: var(--ct-bg); border-radius: 999px;
  padding: 7px 14px; font-size: 14px; font-weight: 700; cursor: pointer; color: var(--ct-ink-2);
  display: inline-flex; gap: 6px; align-items: baseline;
}
.ct-chip small { font-weight: 600; font-size: 12px; color: var(--ct-ink-3); }
.ct-chip[aria-pressed="true"] { background: var(--ct-violet); border-color: var(--ct-violet); color: var(--ct-on-violet); }
.ct-chip[aria-pressed="true"] small { color: inherit; opacity: .8; }
.ct-chip:disabled { opacity: .45; cursor: not-allowed; }
.ct-seg { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; padding: 4px; border-radius: var(--ct-r-m); background: var(--ct-surface-2); max-width: 640px; }
.ct-seg__btn { border: 0; background: transparent; border-radius: var(--ct-r-s); padding: 9px 8px; font-size: 14px; font-weight: 800; cursor: pointer; color: var(--ct-ink-2); display: inline-flex; gap: 6px; align-items: baseline; justify-content: center; min-height: 40px; }
.ct-seg__btn small { font-size: 12px; font-weight: 600; color: var(--ct-ink-3); }
.ct-seg__btn[aria-pressed="true"] { background: var(--ct-violet); color: var(--ct-on-violet); }
.ct-seg__btn[aria-pressed="true"] small { color: inherit; opacity: .85; }
@media (max-width: 520px) { .ct-seg { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.ct-card__aud { position: absolute; left: 10px; bottom: 10px; background: rgba(15, 15, 15, .82); color: #fff; font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: var(--ct-r-s); }
.ct-warn { margin: 0; font-size: 13px; font-weight: 600; color: var(--ct-warn); background: var(--ct-warn-soft); border-radius: var(--ct-r-s); padding: 6px 10px; }
.ct-selects { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; }
.ct-select { display: grid; gap: 4px; font-size: 12px; font-weight: 700; color: var(--ct-ink-3); letter-spacing: .02em; }
.ct-select select {
  height: 40px; min-width: 150px; padding: 0 34px 0 12px; border-radius: var(--ct-r-m);
  border: 1px solid var(--ct-line); background-color: var(--ct-bg); font-size: 14px; font-weight: 600; color: var(--ct-ink);
  appearance: none; -webkit-appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 17px) 18px, calc(100% - 12px) 18px; background-size: 5px 5px; background-repeat: no-repeat;
}
.ct-select--inline { grid-auto-flow: column; align-items: center; gap: 8px; }
.ct-select--inline select { height: 34px; min-width: 0; }
.ct-clear { margin-left: auto; min-height: 40px; border: 0; background: none; padding: 0 4px; font-size: 14px; font-weight: 700; color: var(--ct-violet-ink); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }

.ct-shelves { display: grid; gap: 44px; }
.ct-shelf { display: grid; gap: 14px; min-width: 0; }
.ct-shelf__head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; padding-bottom: 10px; border-bottom: 1px solid var(--ct-line); }
.ct-shelf__title { margin: 0; font-family: var(--ct-font-display); font-size: clamp(17px, 1.8vw, 21px); font-weight: 700; text-transform: uppercase; letter-spacing: .01em; }
.ct-shelf__count { font-size: 13px; color: var(--ct-ink-3); font-weight: 600; font-variant-numeric: tabular-nums; }
.ct-card__title { display: grid; gap: 2px; }
.ct-card__series { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--ct-violet-ink); }
.ct-video__code { font-size: 13px; opacity: .85; }
.ct-video__code code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; background: var(--ct-surface-2); color: var(--ct-ink); padding: 1px 6px; border-radius: 4px; }
.ct-video__state .ct-video__code code { background: rgba(255, 255, 255, .14); color: #fff; }
.ct-count { margin: 24px 0 12px; font-size: 14px; color: var(--ct-ink-3); font-variant-numeric: tabular-nums; }

.ct-grid {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 290px), 1fr));
}
.ct-card { min-width: 0; }
.ct-card__link {
  display: flex; flex-direction: column; height: 100%; text-decoration: none; color: inherit !important;
  border-radius: var(--ct-r-l); background: var(--ct-bg); border: 1px solid var(--ct-line);
  overflow: hidden; transition: border-color .15s, box-shadow .15s, transform .15s;
}
.ct-card__link:hover { border-color: color-mix(in srgb, var(--ct-violet) 45%, var(--ct-line)); box-shadow: var(--ct-shadow); transform: translateY(-2px); }
.ct-card__thumb { position: relative; aspect-ratio: 16 / 9; max-width: 100%; background: var(--ct-video-bg); overflow: hidden; }
.ct-card__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ct-card__thumb-fallback { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; font-family: var(--ct-font-display); font-size: 18px; text-transform: uppercase; padding: 16px; text-align: center; }
.ct-card__dur {
  position: absolute; right: 10px; bottom: 10px; background: rgba(15, 15, 15, .82); color: #fff;
  font-size: 12px; font-weight: 700; padding: 3px 7px; border-radius: var(--ct-r-s); font-variant-numeric: tabular-nums;
}
.ct-card__level {
  position: absolute; left: 10px; top: 10px; background: var(--ct-violet); color: #fff;
  font-family: var(--ct-font-display); font-size: 12px; font-weight: 700; padding: 6px 8px 5px; border-radius: var(--ct-r-s); line-height: 1;
}
.ct-card__body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.ct-card__title { margin: 0; font-size: 19px; font-weight: 800; line-height: 1.25; }
.ct-card__meta { margin: 0; font-size: 13px; color: var(--ct-ink-3); font-weight: 600; }
.ct-card__desc { margin: 0; font-size: 14px; color: var(--ct-ink-2); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.ct-card__foot { margin-top: auto; padding-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; }

.ct-badge {
  display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700;
  padding: 4px 9px; border-radius: 999px; background: var(--ct-surface-2); color: var(--ct-ink-2); white-space: nowrap;
}
.ct-badge::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.ct-badge--ok { background: var(--ct-ok-soft); color: var(--ct-ok); }
.ct-badge--warn { background: var(--ct-warn-soft); color: var(--ct-warn); }
.ct-badge--plain::before { display: none; }

.ct-empty { text-align: center; padding: 48px 16px; color: var(--ct-ink-2); }
.ct-empty__title { font-weight: 800; font-size: 18px; color: var(--ct-ink); margin: 0 0 6px; }
.ct-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px;
  padding: 0 18px; border-radius: var(--ct-r-s); border: 0; font-weight: 700; font-size: 15px; cursor: pointer;
  background: var(--ct-violet); color: var(--ct-on-violet); text-decoration: none;
}
.ct-btn--ghost { background: transparent; color: var(--ct-violet-ink); border: 1px solid currentColor; margin-top: 12px; }

/* ---------- Watch page: big video, slim title, the game right below ---------- */
.ct-watch { max-width: 1100px; margin-inline: auto; display: grid; gap: 20px; }
.ct-video {
  position: relative; aspect-ratio: 16 / 9; max-width: 100%; width: 100%;
  background: var(--ct-video-bg); border-radius: var(--ct-r-l); overflow: hidden;
}
.ct-video iframe, .ct-video #ct-yt { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.ct-video__state {
  position: absolute; inset: 0; display: grid; place-content: center; gap: 12px; text-align: center;
  padding: 24px; color: #f3f1f8; background: var(--ct-video-bg); overflow: auto;
}
.ct-video__state p { margin: 0; max-width: 44ch; }
.ct-video__state strong { font-size: 17px; }
.ct-video__state .ct-btn { justify-self: center; }
.ct-spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid rgba(255, 255, 255, .25); border-top-color: #fff; justify-self: center; animation: ct-spin .9s linear infinite; }
@keyframes ct-spin { to { transform: rotate(360deg); } }
.ct-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; }
.ct-meta__title { flex: 1 1 320px; min-width: 0; display: grid; gap: 6px; }
.ct-meta .ct-eyebrow { margin: 0; }
.ct-tags { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.ct-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; }
.ct-yt-link { font-size: 14px; font-weight: 700; text-decoration: none; }
.ct-yt-link:hover { text-decoration: underline; }
.ct-credit { margin: 0; font-size: 12px; color: var(--ct-ink-3); }

/* ---------- Buttons shared with the watch page ---------- */
.ct-btn--lg { min-height: 52px; padding: 0 30px; font-size: 17px; border-radius: 999px; }
.ct-btn:disabled { opacity: .5; cursor: default; }
.ct-btn:hover:not(:disabled) { filter: brightness(1.08); }
.ct .ct-btn { color: var(--ct-on-violet); }
.ct .ct-btn--ghost { color: var(--ct-violet-ink); }
.ct-foot { border-top: 1px solid var(--ct-line); padding-inline: var(--ct-gutter); padding-block: 20px 28px; font-size: 13px; color: var(--ct-ink-3); }
.ct-foot p { max-width: 1360px; margin: 0 auto; }
.ct-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

/* ====================================================================
   Conversation missions: a themed story stage + a message device
   ==================================================================== */
.ct-mission { display: block; }

/* ---- teaser: an incoming message waiting under the video ---- */
.ct-mteaser {
  position: relative; isolation: isolate; overflow: hidden; color: #fff;
  display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; padding: 14px 18px;
  border-radius: var(--ct-r-l); background: #2a1d63 center / cover no-repeat;
}
.ct-mteaser::before { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgba(14, 8, 40, .9), rgba(14, 8, 40, .55)); }
.ct-mteaser__txt { display: grid; gap: 2px; min-width: 0; flex: 1 1 240px; }
.ct-mteaser__txt strong { font-size: 16px; }
.ct-mteaser__txt span { font-size: 14px; opacity: .92; }
.ct-mteaser .ct-btn { background: #fff; color: #2a1d63 !important; }
.ct-av2 {
  position: relative; flex: none; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center;
  font-family: var(--ct-font-display); font-weight: 700; font-size: 20px; color: #fff;
  background: linear-gradient(135deg, var(--ac1, #8d6bff), var(--ac2, #ff2ac1));
  box-shadow: 0 0 0 2px rgba(255, 255, 255, .8), 0 0 18px var(--ac1, #8d6bff);
}
.ct-av2--sm { width: 38px; height: 38px; font-size: 16px; }
.ct-mteaser .ct-av2::after { content: ""; position: absolute; right: -2px; top: -2px; width: 12px; height: 12px; border-radius: 50%; background: #ff4d6d; border: 2px solid #fff; animation: ct-ping 1.8s ease-out infinite; }
@keyframes ct-ping { 0% { box-shadow: 0 0 0 0 rgba(255, 77, 109, .6); } 100% { box-shadow: 0 0 0 10px rgba(255, 77, 109, 0); } }

/* ---- stage ---- */
.ct-stage {
  --ac1: #8d6bff; --ac2: #ff2ac1; --spark: #ffe08a;
  position: relative; isolation: isolate; overflow: hidden; color: #fff; background: #1a1240;
  border-radius: var(--ct-r-l); padding: clamp(12px, 2.6vw, 30px); box-shadow: var(--ct-shadow);
}
.ct-stage__bg { position: absolute; inset: 0; z-index: -3; background-size: cover; background-position: center; }
.ct-stage::after { content: ""; position: absolute; inset: 0; z-index: -2; pointer-events: none; background: radial-gradient(120% 95% at 50% 38%, rgba(8, 5, 24, .12), rgba(8, 5, 24, .74)); }
.ct-stage[data-theme="town"]::after, .ct-stage[data-theme="forest"]::after, .ct-stage[data-theme="underwater"]::after { background: radial-gradient(120% 95% at 50% 38%, rgba(8, 5, 24, .05), rgba(8, 5, 24, .6)); }
.ct-stage[data-theme="space"] { --ac1: #38d9ff; --ac2: #8d6bff; }
.ct-stage[data-theme="detective"] { --ac1: #f2a93b; --ac2: #c7512d; --spark: #ffd37a; }
.ct-stage[data-theme="fantasy"] { --ac1: #ff7ad9; --ac2: #7a6bff; }
.ct-stage[data-theme="library"] { --ac1: #f4c14d; --ac2: #2aa7a0; --spark: #ffe9a8; }
.ct-stage[data-theme="underwater"] { --ac1: #2ad0d8; --ac2: #3c7bff; --spark: #bff6ff; }
.ct-stage[data-theme="forest"] { --ac1: #6fcf4a; --ac2: #e6b43a; }
.ct-stage[data-theme="town"] { --ac1: #3f8cff; --ac2: #ff7a59; }
.ct-stage[data-theme="cozy"] { --ac1: #ff9a62; --ac2: #d9569b; }
.ct-stage[data-theme="office"] { --ac1: #3f6bff; --ac2: #29c0b0; }
.ct-stage[data-theme="control"] { --ac1: #8d6bff; --ac2: #38d9ff; }

/* floating letters (pure CSS; pauses when off-screen; static with reduced motion) */
.ct-letters { position: absolute; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; }
.ct-letters span {
  position: absolute; left: var(--l); bottom: -70px; font-family: var(--ct-font-display); font-weight: 700;
  font-size: var(--s); color: var(--c, #fff); opacity: 0; text-shadow: 0 0 12px var(--ac1), 0 0 26px var(--ac2);
  animation: ct-drift var(--d) linear infinite; animation-delay: var(--dl); will-change: transform, opacity;
}
.ct-stage.is-off .ct-letters span { animation-play-state: paused; }
@keyframes ct-drift {
  0% { transform: translate(0, 0) rotate(var(--r0)); opacity: 0; }
  12% { opacity: var(--o); }
  50% { transform: translate(calc(var(--x) * .5), -55vh) rotate(calc(var(--r0) + var(--rr) * .5)); }
  88% { opacity: var(--o); }
  100% { transform: translate(var(--x), -112vh) rotate(calc(var(--r0) + var(--rr))); opacity: 0; }
}

/* head: title letters assemble, briefing, objective, progress */
.ct-stage__head {
  max-width: 860px; margin: 0 auto; display: grid; gap: 10px; padding: clamp(12px, 2.4vw, 20px);
  border-radius: 18px; background: rgba(12, 8, 34, .62); border: 1px solid rgba(255, 255, 255, .16);
}
.ct-stage__tag { margin: 0; font-size: 12px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: var(--spark); }
.ct-stage__title { margin: 0; font-family: var(--ct-font-display); font-size: clamp(20px, 3.4vw, 32px); line-height: 1.18; text-shadow: 0 2px 14px rgba(0, 0, 0, .55); }
.ct-stage__title:focus { outline: none; }
.ct-w { display: inline-block; white-space: nowrap; margin-right: .3em; }
.ct-ch { display: inline-block; animation: ct-fly-in .85s cubic-bezier(.2, .85, .25, 1) both; animation-delay: calc(var(--i) * 26ms); }
@keyframes ct-fly-in {
  from { transform: translate(var(--dx), var(--dy)) rotate(var(--dr)) scale(.3); opacity: 0; filter: blur(3px); }
  60% { opacity: 1; filter: none; }
  to { transform: none; opacity: 1; }
}
.ct-stage__sub { margin: 0; font-size: 14px; opacity: .92; }
.ct-stage__brief { margin: 0; font-size: 16px; line-height: 1.55; }
.ct-goal { margin: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; padding: 10px 14px; border-radius: 12px; background: rgba(255, 255, 255, .1); border-left: 4px solid var(--ac1); }
.ct-goal__k { font-size: 11px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: var(--spark); }
.ct-goal__v { font-weight: 700; font-size: 16px; flex: 1 1 260px; }
.ct-goal__tr { flex: 1 1 100%; font-size: 13px; opacity: .85; }
.ct-meta2 { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.ct-meta2 li { font-size: 12px; padding: 3px 10px; border-radius: 99px; background: rgba(255, 255, 255, .12); }
.ct-pips { margin: 0; padding: 0; list-style: none; display: flex; align-items: center; gap: 8px; font-size: 12px; }
.ct-pips li { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; background: rgba(255, 255, 255, .14); border: 2px solid rgba(255, 255, 255, .35); }
.ct-pips li.is-now { border-color: var(--spark); box-shadow: 0 0 0 3px rgba(255, 224, 138, .25); }
.ct-pips li.is-done { background: linear-gradient(135deg, var(--ac1), var(--ac2)); border-color: #fff; animation: ct-pop .5s ease; }
@keyframes ct-pop { 40% { transform: scale(1.35); } }
.ct-pips__lab { opacity: .85; margin-right: 4px; }

/* ---- device: the message panel, skinned per theme ---- */
.ct-dev {
  --dv-bg: #14113a; --dv-ink: #eceaff; --dv-ink2: #b9b3e6; --dv-line: rgba(255, 255, 255, .14);
  --dv-bar: linear-gradient(90deg, #2b1f7a, #1b1458); --dv-bar-ink: #fff;
  --dv-char: #231d57; --dv-char-ink: #f3f1ff; --dv-char-bd: #5b4bd0;
  --dv-me: #6332ff; --dv-me-ink: #fff; --dv-input: #1d1948; --dv-font: inherit; --dv-chip: rgba(255, 255, 255, .1);
  position: relative; max-width: 860px; margin: 16px auto 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto;
  border-radius: 20px; overflow: hidden; background: var(--dv-bg); color: var(--dv-ink); border: 1px solid var(--dv-line);
  box-shadow: 0 22px 60px rgba(0, 0, 0, .5), 0 0 0 1px rgba(255, 255, 255, .05) inset; font-family: var(--dv-font);
}
.ct-dev[data-theme="space"] { --dv-bg: #0b1330; --dv-ink: #dff3ff; --dv-ink2: #8fb8d8; --dv-bar: linear-gradient(90deg, #0f2a55, #0b1c3d); --dv-char: #112349; --dv-char-bd: #38d9ff; --dv-me: #1f7ae0; --dv-input: #0f1d3f; --dv-font: "Trebuchet MS", "Segoe UI", system-ui, sans-serif; }
.ct-dev[data-theme="detective"] { --dv-bg: #f4e9cf; --dv-ink: #3b2a14; --dv-ink2: #7a6140; --dv-line: #cdb98e; --dv-bar: linear-gradient(90deg, #3a2a18, #5a4128); --dv-bar-ink: #f4e9cf; --dv-char: #fff8e4; --dv-char-ink: #3b2a14; --dv-char-bd: #b89a5c; --dv-me: #fffdf3; --dv-me-ink: #1b3a6b; --dv-input: #fffdf3; --dv-font: "Courier New", Courier, monospace; --dv-chip: rgba(58, 42, 24, .08); background-image: repeating-linear-gradient(transparent 0 27px, rgba(120, 90, 40, .16) 27px 28px); }
.ct-dev[data-theme="fantasy"] { --dv-bg: #f1dfb4; --dv-ink: #46280e; --dv-ink2: #7b5a2d; --dv-line: #d2b06a; --dv-bar: linear-gradient(90deg, #5b2a86, #7a3fb0); --dv-bar-ink: #ffe9a8; --dv-char: #fff3cf; --dv-char-ink: #46280e; --dv-char-bd: #d2a43a; --dv-me: #e5d0ff; --dv-me-ink: #2d1750; --dv-input: #fff8e2; --dv-font: Georgia, "Times New Roman", serif; --dv-chip: rgba(70, 40, 14, .08); background-image: radial-gradient(120% 100% at 50% 0, #f8ecc9, #ecd49c); }
.ct-dev[data-theme="library"] { --dv-bg: #0d2a33; --dv-ink: #fdf2d0; --dv-ink2: #c9b98a; --dv-bar: linear-gradient(90deg, #0a1f26, #123a45); --dv-bar-ink: #f4c14d; --dv-char: #14414d; --dv-char-bd: #f4c14d; --dv-me: #f4c14d; --dv-me-ink: #231a05; --dv-input: #0f333d; --dv-font: Georgia, "Times New Roman", serif; }
.ct-dev[data-theme="underwater"] { --dv-bg: #0b4f66; --dv-ink: #eafcff; --dv-ink2: #a6e4f0; --dv-bar: linear-gradient(90deg, #0a7ea4, #0b6a8e); --dv-char: #0f6f8c; --dv-char-bd: #5ce0ea; --dv-me: #ff7a59; --dv-input: #0a5b75; --dv-font: "Trebuchet MS", "Segoe UI", system-ui, sans-serif; }
.ct-dev[data-theme="forest"] { --dv-bg: #234d2f; --dv-ink: #f2f7e6; --dv-ink2: #bcd8a8; --dv-bar: linear-gradient(90deg, #3d7a3a, #2f6532); --dv-char: #315f3b; --dv-char-bd: #8fd16b; --dv-me: #e9b949; --dv-me-ink: #2b1d00; --dv-input: #1e4228; --dv-font: "Trebuchet MS", "Segoe UI", system-ui, sans-serif; }
.ct-dev[data-theme="town"] { --dv-bg: #f4f6fb; --dv-ink: #141824; --dv-ink2: #5a6275; --dv-line: #dfe3ee; --dv-bar: #ffffff; --dv-bar-ink: #141824; --dv-char: #ffffff; --dv-char-ink: #141824; --dv-char-bd: #dfe3ee; --dv-me: #2f7bff; --dv-input: #ffffff; --dv-chip: rgba(20, 24, 36, .06); }
.ct-dev[data-theme="cozy"] { --dv-bg: #fff7ea; --dv-ink: #4a3526; --dv-ink2: #8a6f58; --dv-line: #ecd9bf; --dv-bar: linear-gradient(90deg, #c97a5d, #d98f6f); --dv-char: #fffdf6; --dv-char-ink: #4a3526; --dv-char-bd: #ecd9bf; --dv-me: #fde3c8; --dv-me-ink: #4a3526; --dv-input: #fffdf6; --dv-font: Georgia, "Times New Roman", serif; --dv-chip: rgba(74, 53, 38, .07); background-image: repeating-linear-gradient(transparent 0 31px, rgba(201, 122, 93, .12) 31px 32px); }
.ct-dev[data-theme="office"] { --dv-bg: #ffffff; --dv-ink: #14161f; --dv-ink2: #596079; --dv-line: #dfe4f2; --dv-bar: linear-gradient(90deg, #1f3a8a, #2b4cb0); --dv-char: #eef2ff; --dv-char-ink: #14161f; --dv-char-bd: #c9d3f6; --dv-me: #1f3a8a; --dv-input: #f7f9ff; --dv-chip: rgba(20, 22, 31, .06); }

.ct-dev__bar { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--dv-bar); color: var(--dv-bar-ink); border-bottom: 1px solid var(--dv-line); }
.ct-dev__id { min-width: 0; flex: 1; display: grid; line-height: 1.2; }
.ct-dev__id strong { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ct-dev__id span { font-size: 12px; opacity: .85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ct-dev__id .is-typing { color: inherit; font-style: italic; }
.ct-dev__label { flex: none; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; opacity: .9; padding: 4px 10px; border: 1px solid currentColor; border-radius: 99px; }
.ct-dev[data-theme="town"] .ct-dev__bar .ct-av2 { box-shadow: none; }

.ct-dev__log {
  overflow-y: auto; overscroll-behavior: contain; padding: 16px 14px; display: flex; flex-direction: column; gap: 8px;
  min-height: clamp(170px, 24vh, 240px); max-height: clamp(280px, 50vh, 520px); scroll-behavior: smooth; cursor: default;
}
.ct-dev__log:focus-visible { outline-offset: -3px; }
.ct-msg { max-width: min(86%, 600px); display: grid; gap: 2px; }
.ct-msg--char { align-self: flex-start; }
.ct-msg--me { align-self: flex-end; }
.ct-msg__who { font-size: 12px; font-weight: 800; color: var(--dv-ink2); padding-left: 6px; }
.ct-msg__t { padding: 10px 14px; border-radius: 18px; font-size: 16px; line-height: 1.5; overflow-wrap: anywhere; white-space: pre-wrap; }
.ct-msg--char .ct-msg__t { background: var(--dv-char); color: var(--dv-char-ink); border: 1px solid var(--dv-char-bd); border-top-left-radius: 6px; box-shadow: 0 2px 10px rgba(0, 0, 0, .12); }
.ct-msg--me .ct-msg__t { background: var(--dv-me); color: var(--dv-me-ink); border-top-right-radius: 6px; box-shadow: 0 2px 10px rgba(0, 0, 0, .15); }
.ct-dev[data-theme="detective"] .ct-msg--me .ct-msg__t { font-family: Georgia, serif; font-style: italic; border: 1px dashed #1b3a6b; }
.ct-dev[data-theme="fantasy"] .ct-msg__t, .ct-dev[data-theme="library"] .ct-msg--char .ct-msg__t { border-radius: 10px; }
.ct-msg.is-in { animation: ct-msg-in .32s cubic-bezier(.2, .9, .3, 1) both; }
.ct-msg--char.is-in { animation-name: ct-card-in; animation-duration: .45s; }
@keyframes ct-msg-in { from { transform: translateY(12px) scale(.96); opacity: 0; } }
@keyframes ct-card-in { from { transform: translateY(-16px) rotate(-2.5deg) scale(.94); opacity: 0; } }
.ct-typing .ct-msg__t { display: inline-flex; gap: 5px; padding: 14px 16px; }
.ct-typing i { width: 8px; height: 8px; border-radius: 50%; background: var(--dv-ink2); animation: ct-dot 1s ease-in-out infinite; }
.ct-typing i:nth-child(2) { animation-delay: .15s; } .ct-typing i:nth-child(3) { animation-delay: .3s; }
@keyframes ct-dot { 0%, 80%, 100% { transform: translateY(0); opacity: .45; } 40% { transform: translateY(-5px); opacity: 1; } }

.ct-tools { padding: 12px 14px 4px; border-top: 1px solid var(--dv-line); display: grid; gap: 8px; }
.ct-tools__ask { margin: 0; font-size: 15px; line-height: 1.4; }
.ct-tools__ask b { color: var(--dv-ink); }
.ct-tools__prompts { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
.ct-tools__prompts li { font-size: 13px; padding: 3px 10px; border-radius: 99px; background: var(--dv-chip); color: var(--dv-ink2); }
.ct-tools__row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.ct-tbtn, .ct-chip2 {
  font: inherit; font-size: 14px; cursor: pointer; border-radius: 99px; padding: 7px 14px; min-height: 38px;
  color: var(--dv-ink); background: var(--dv-chip); border: 1px solid var(--dv-line);
}
.ct-tbtn:hover, .ct-chip2:hover { border-color: var(--ac1); }
.ct-chip2--start { border-style: dashed; text-align: left; }
.ct-tips { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.ct-tips li { padding: 8px 12px; border-radius: 12px; font-size: 14px; line-height: 1.4; background: var(--dv-chip); border-left: 3px solid var(--ac1); animation: ct-msg-in .25s both; }
.ct-vocab { font-size: 14px; }
.ct-vocab summary { cursor: pointer; list-style: none; display: inline-block; }
.ct-vocab[open] summary { margin-bottom: 8px; }
.ct-vocab__chips { display: flex; flex-wrap: wrap; gap: 6px; }

.ct-composer { display: grid; gap: 6px; padding: 8px 14px 12px; }
.ct-composer__row { display: flex; align-items: flex-end; gap: 10px; }
.ct-composer__text {
  flex: 1; min-width: 0; box-sizing: border-box; resize: none; padding: 12px 14px; max-height: 220px; min-height: 52px;
  font: inherit; font-size: 16px; line-height: 1.5; color: var(--dv-ink); background: var(--dv-input);
  border: 2px solid var(--dv-line); border-radius: 16px; font-family: var(--dv-font);
}
.ct-composer__text::placeholder { color: var(--dv-ink2); }
.ct-composer__text:focus { outline: none; border-color: var(--ac1); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ac1) 30%, transparent); }
.ct-send {
  flex: none; min-height: 52px; padding: 0 22px; border: 0; border-radius: 16px; font: inherit; font-weight: 800; font-size: 16px; cursor: pointer;
  color: #fff; background: linear-gradient(135deg, var(--ac1), var(--ac2)); text-shadow: 0 1px 2px rgba(0, 0, 0, .35);
}
.ct-send:disabled { opacity: .5; cursor: default; }
.ct-send:hover:not(:disabled) { filter: brightness(1.1); }
.ct-composer__foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; font-size: 12px; color: var(--dv-ink2); }
.ct-composer__note { margin: 0; min-height: 1.1em; font-size: 13px; color: #d97a00; font-weight: 700; }
.ct-dev[data-theme="town"] .ct-composer__note, .ct-dev[data-theme="office"] .ct-composer__note, .ct-dev[data-theme="cozy"] .ct-composer__note, .ct-dev[data-theme="detective"] .ct-composer__note, .ct-dev[data-theme="fantasy"] .ct-composer__note { color: #a35a00; }
@media (hover: none) { .ct-key { display: none; } }

/* completion */
.ct-done { padding: 18px 16px 20px; display: grid; gap: 12px; justify-items: center; text-align: center; border-top: 1px solid var(--dv-line); background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--ac1) 16%, transparent)); }
.ct-done:focus { outline: none; }
.ct-done__h { margin: 0; font-family: var(--ct-font-display); font-size: clamp(20px, 3.4vw, 28px); }
.ct-done__h .ct-ch { animation-delay: calc(var(--i) * 35ms); }
.ct-done__end { margin: 0; font-size: 16px; color: var(--dv-ink2); }
.ct-done__acts { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.ct-done .ct-btn--ghost { margin-top: 0; color: var(--dv-ink) !important; border-color: var(--dv-line); }
.ct-done .ct-composer__note { text-align: center; }

.ct-stage__note { max-width: 860px; margin: 12px auto 0; font-size: 12px; line-height: 1.45; opacity: .88; text-align: center; text-shadow: 0 1px 6px rgba(0, 0, 0, .6); }

/* effects layer (sparks, letters flying out of the message) */
.ct-fx { position: absolute; inset: 0; z-index: 6; pointer-events: none; overflow: hidden; }
.ct-spark { position: absolute; width: var(--sz, 8px); height: var(--sz, 8px); margin: -4px 0 0 -4px; border-radius: 50%; background: var(--spark); box-shadow: 0 0 10px var(--spark), 0 0 18px var(--ac1); animation: ct-spark .85s ease-out forwards; }
.ct-spark--star { border-radius: 2px; transform: rotate(45deg); }
@keyframes ct-spark { to { transform: translate(var(--tx), var(--ty)) scale(.2); opacity: 0; } }
.ct-flyl { position: absolute; font-family: var(--ct-font-display); font-weight: 700; font-size: var(--fs, 20px); color: #fff; text-shadow: 0 0 10px var(--ac1), 0 0 20px var(--ac2); animation: ct-flyl 1.2s ease-out forwards; }
@keyframes ct-flyl { to { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)); opacity: 0; } }

/* ---------- Watch page tail ---------- */
.ct-watch > * { min-width: 0; }
.ct-video__state code, .ct-meta__title { overflow-wrap: anywhere; }
.ct-tags li { min-width: 0; max-width: 100%; }
.ct-tags .ct-badge { white-space: normal; max-width: 100%; overflow-wrap: anywhere; }

/* ======== Scene layer: sharp backgrounds, dialogue living directly on the scene (no big panels, no blur) ======== */
.ct-stage { background: #0e1226; min-height: min(92vh, 880px); display: flex; flex-direction: column; gap: 14px; padding: clamp(12px, 2.4vw, 28px); }
.ct-stage__bg { background-size: cover; background-position: center; transform: translateZ(0); }
.ct-stage::after { content: none; }               /* no full-scene overlay: the picture stays crisp and unwashed */
.ct-stage > * { position: relative; width: 100%; max-width: 900px; margin-inline: auto; }
.ct-stage > .ct-stage__bg, .ct-stage > .ct-letters, .ct-stage > .ct-fx { position: absolute; max-width: none; margin: 0; width: auto; }
.ct-stage.is-enter { animation: ct-portal .62s cubic-bezier(.2, .8, .2, 1) both; }
@keyframes ct-portal { from { clip-path: circle(0% at 50% 18%); } to { clip-path: circle(150% at 50% 18%); } }

/* mission card: one small, readable scroll in the corner of the scene */
.ct-stage__head {
  margin: 0; max-width: min(100%, 640px); margin-inline: 0 auto; gap: 5px; padding: 12px 16px; border-radius: 16px; width: auto;
  background: rgba(8, 11, 32, .66); border: 1px solid rgba(255, 255, 255, .28); backdrop-filter: none; box-shadow: 0 8px 24px rgba(0, 0, 0, .3);
}
.ct-stage > .ct-stage__head { margin-inline: 0 auto; }
.ct-stage__tag { font-size: 11px; }
.ct-stage__title { font-size: clamp(21px, 3.2vw, 30px); text-shadow: 0 2px 8px rgba(0, 0, 0, .5); }
.ct-stage__brief { font-size: 14.5px; line-height: 1.45; opacity: .96; }
.ct-goal { background: transparent; border: 0; border-left: 3px solid var(--ac1); border-radius: 0; padding: 0 0 0 10px; margin: 2px 0 0; gap: 0 10px; }
.ct-goal__v { font-size: 15px; } .ct-goal__tr { font-size: 12.5px; opacity: .85; }

/* conversation: the device frame is gone; bubbles are cards sitting in the world */
.ct-dev, .ct-dev[data-theme] { background: none; background-image: none; border: 0; box-shadow: none; overflow: visible; backdrop-filter: none; margin: 0 auto; max-width: 900px; display: flex; flex-direction: column; gap: 10px; }
.ct-dev[data-theme] .ct-dev__bar {
  align-self: flex-start; display: inline-flex; gap: 10px; padding: 5px 12px 5px 5px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, .32);
  background: rgba(8, 11, 32, .66); color: #fff; box-shadow: 0 6px 18px rgba(0, 0, 0, .28);
}
.ct-dev__bar .ct-av2--sm { width: 34px; height: 34px; font-size: 15px; }
.ct-dev__id strong { font-size: 15px; } .ct-dev__id span { font-size: 11.5px; max-width: 36ch; }
.ct-dev__bar .ct-pips { flex: none; gap: 5px; margin-left: 4px; }
.ct-dev__bar .ct-pips li { width: 22px; height: 22px; font-size: 11px; }
.ct-dev__label { display: none; }
.ct-dev__log { background: transparent; padding: 4px 2px; min-height: clamp(120px, 18vh, 200px); max-height: clamp(260px, 46vh, 500px); gap: 10px; }
.ct-dev__log::-webkit-scrollbar { width: 8px; } .ct-dev__log::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, .4); border-radius: 8px; }
.ct-msg__who { color: #fff; text-shadow: 0 1px 4px rgba(0, 0, 0, .8); opacity: .95; }
.ct-dev[data-theme] .ct-msg--char .ct-msg__t { box-shadow: 0 6px 18px rgba(0, 0, 0, .32), 0 0 0 1px rgba(0, 0, 0, .08); }
.ct-dev[data-theme] .ct-msg--me .ct-msg__t { box-shadow: 0 6px 18px rgba(0, 0, 0, .32); }
.ct-dev[data-theme="town"] .ct-msg--char .ct-msg__t, .ct-dev[data-theme="office"] .ct-msg--char .ct-msg__t { border-color: rgba(20, 30, 70, .18); }
.ct-dev[data-theme="space"] .ct-msg--char .ct-msg__t { box-shadow: 0 0 0 1px #38d9ff, 0 0 18px rgba(56, 217, 255, .35), 0 6px 18px rgba(0, 0, 0, .4); }
.ct-dev[data-theme="fantasy"] .ct-msg--char .ct-msg__t, .ct-dev[data-theme="library"] .ct-msg--char .ct-msg__t { border-width: 2px; }
.ct-typing .ct-msg__t { background: var(--dv-char); }
.ct-typing i { background: var(--dv-ink2); }

/* answer area: one themed note card that holds the task, helpers and the writing field */
.ct-dev[data-theme] .ct-tools, .ct-dev[data-theme] .ct-composer {
  border: 1px solid var(--dv-line); background-color: color-mix(in srgb, var(--dv-bg) 92%, transparent); color: var(--dv-ink); box-shadow: 0 10px 28px rgba(0, 0, 0, .34);
}
.ct-dev[data-theme] .ct-tools { border-radius: 16px 16px 0 0; padding: 12px 14px 8px; border-bottom: 0; margin-bottom: -10px; position: relative; z-index: 1; }
.ct-dev[data-theme] .ct-composer { border-radius: 0 0 16px 16px; padding: 8px 14px 12px; border-top: 1px dashed var(--dv-line); }
.ct-dev[data-theme="detective"] .ct-tools, .ct-dev[data-theme="detective"] .ct-composer { background-image: repeating-linear-gradient(transparent 0 27px, rgba(120, 90, 40, .14) 27px 28px); }
.ct-dev[data-theme="fantasy"] .ct-tools, .ct-dev[data-theme="fantasy"] .ct-composer { background-image: radial-gradient(120% 100% at 50% 0, #f8ecc9, #ecd49c); }
.ct-tools__ask { font-size: 15px; text-shadow: none; } .ct-tools__ask b { color: var(--dv-ink); }
.ct-tools__prompts { font-size: 13px; color: var(--dv-ink2); display: block; }
.ct-tbtn, .ct-chip2, .ct-tips li { color: var(--dv-ink); background: var(--dv-chip); border: 1px solid var(--dv-line); text-shadow: none; backdrop-filter: none; }
.ct-tbtn:hover, .ct-chip2:hover { border-color: var(--ac1); }
.ct-composer__foot, .ct-dev[data-theme] .ct-composer__note { text-shadow: none; }
.ct-dev[data-theme] .ct-composer__note { color: #b35d00; }
.ct-dev[data-theme="space"] .ct-composer__note, .ct-dev[data-theme="library"] .ct-composer__note, .ct-dev[data-theme="underwater"] .ct-composer__note, .ct-dev[data-theme="forest"] .ct-composer__note { color: #ffd37a; }
.ct-send { border: 1px solid rgba(255, 255, 255, .45); box-shadow: 0 6px 18px color-mix(in srgb, var(--ac2) 40%, transparent); }
.ct-dev[data-theme] .ct-done { border: 1px solid var(--dv-line); border-radius: 16px; background: var(--dv-bg); box-shadow: 0 10px 28px rgba(0, 0, 0, .34); }
.ct-done__h, .ct-done__end { text-shadow: none; color: var(--dv-ink); }
.ct-stage__note { align-self: center; width: auto; max-width: min(100%, 760px); padding: 4px 12px; border-radius: 99px; background: rgba(8, 11, 32, .6); font-size: 11.5px; text-shadow: none; opacity: 1; margin-top: auto; }

/* ---- entry portal (replaces the plain teaser) ---- */
.ct-portal { position: relative; isolation: isolate; overflow: hidden; color: #fff; border-radius: var(--ct-r-l); min-height: clamp(280px, 40vw, 380px); background: #101531; display: grid; align-items: end; box-shadow: var(--ct-shadow); }
.ct-portal__bg { position: absolute; inset: 0; z-index: -3; background-size: cover; background-position: center; transform: translateZ(0); }
.ct-portal .ct-letters { z-index: -1; }
.ct-portal__row { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 18px 24px; padding: clamp(14px, 2.6vw, 26px); }
.ct-portal__ring { position: relative; flex: none; width: 112px; height: 112px; display: grid; place-items: center; }
.ct-portal__ring::before { content: ""; position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, var(--ac1), var(--ac2), var(--spark), var(--ac1)); animation: ct-spin 6s linear infinite; -webkit-mask: radial-gradient(circle, transparent 54%, #000 56%); mask: radial-gradient(circle, transparent 54%, #000 56%); filter: drop-shadow(0 0 10px var(--ac1)); }
.ct-portal__ring::after { content: ""; position: absolute; inset: 14px; border-radius: 50%; background: radial-gradient(circle at 50% 40%, rgba(255, 255, 255, .28), rgba(8, 11, 32, .55) 70%); box-shadow: 0 0 22px var(--ac2) inset; }
.ct-portal__ring .ct-av2 { position: relative; z-index: 1; width: 64px; height: 64px; font-size: 28px; }
@keyframes ct-spin { to { transform: rotate(360deg); } }
.ct-portal__txt { flex: 1 1 280px; min-width: 0; display: grid; gap: 6px; padding: 12px 16px; border-radius: 16px; background: rgba(8, 11, 32, .66); border: 1px solid rgba(255, 255, 255, .28); }
.ct-portal__tag { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: var(--spark); }
.ct-portal__title { margin: 0; font-family: var(--ct-font-display); font-size: clamp(22px, 3.4vw, 32px); line-height: 1.15; text-shadow: 0 2px 8px rgba(0, 0, 0, .5); }
.ct-portal__lead { margin: 0; font-size: 15px; line-height: 1.45; }
.ct-portal .ct-btn { justify-self: start; align-self: start; background: linear-gradient(135deg, var(--ac1), var(--ac2)); color: #fff !important; border: 1px solid rgba(255, 255, 255, .5); font-weight: 800; box-shadow: 0 8px 24px color-mix(in srgb, var(--ac2) 50%, transparent); animation: ct-nudge 2.4s ease-in-out infinite; }
@keyframes ct-nudge { 0%, 100% { transform: none; } 50% { transform: translateY(-2px) scale(1.03); } }
.ct-portal[data-theme="space"] { --ac1: #38d9ff; --ac2: #8d6bff; --spark: #fff; } .ct-portal[data-theme="detective"] { --ac1: #f2a93b; --ac2: #c7512d; --spark: #ffd37a; }
.ct-portal[data-theme="fantasy"] { --ac1: #ff7ad9; --ac2: #7a6bff; --spark: #ffe08a; } .ct-portal[data-theme="library"] { --ac1: #f4c14d; --ac2: #2aa7a0; --spark: #ffe9a8; }
.ct-portal[data-theme="underwater"] { --ac1: #2ad0d8; --ac2: #3c7bff; --spark: #bff6ff; } .ct-portal[data-theme="forest"] { --ac1: #6fcf4a; --ac2: #e6b43a; --spark: #ffe08a; }
.ct-portal[data-theme="town"] { --ac1: #3f8cff; --ac2: #ff7a59; --spark: #ffe08a; } .ct-portal[data-theme="cozy"] { --ac1: #ff9a62; --ac2: #d9569b; --spark: #ffe08a; }
.ct-portal[data-theme="office"] { --ac1: #3f6bff; --ac2: #29c0b0; --spark: #ffe08a; } .ct-portal[data-theme="control"] { --ac1: #8d6bff; --ac2: #38d9ff; --spark: #ffe08a; }
@media (max-width: 640px) {
  .ct-stage { padding: 10px; gap: 10px; min-height: 0; }
  .ct-stage__head { padding: 10px 12px; }
  .ct-portal__ring { width: 84px; height: 84px; } .ct-portal__ring .ct-av2 { width: 48px; height: 48px; font-size: 22px; }
  .ct-msg { max-width: 94%; }
  .ct-dev__id span { max-width: 22ch; }
}
@media (prefers-reduced-motion: reduce) { .ct-stage.is-enter, .ct-portal__ring::before, .ct-portal .ct-btn { animation: none; } }
.ct-dev .ct-send, .ct-dev[data-theme] .ct-send { color: #fff; text-shadow: 0 1px 3px rgba(0, 0, 0, .45); }

/* ======== Readability: larger dialogue, 10-step progress ======== */
.ct-pips { display: flex; align-items: center; gap: 8px; margin: 0; padding: 0; list-style: none; font-size: 13px; font-weight: 800; }
.ct-pips__n { white-space: nowrap; }
.ct-pips__bar { flex: none; width: clamp(54px, 12vw, 96px); height: 7px; border-radius: 99px; background: rgba(255, 255, 255, .28); overflow: hidden; }
.ct-pips__bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--ac1), var(--ac2)); transition: width .45s ease; }
.ct-dev__bar .ct-pips { margin-left: 4px; }
.ct-msg { max-width: min(92%, 680px); }
.ct-msg__who { font-size: 14px; }
.ct-msg__t { font-size: clamp(18px, 1.5vw + 12px, 21px); line-height: 1.55; padding: 12px 18px; border-radius: 20px; }
.ct-dev__log { gap: 12px; max-height: clamp(300px, 52vh, 560px); }
.ct-dev__id strong { font-size: 17px; } .ct-dev__id span { font-size: 13px; }
.ct-tools__ask { font-size: clamp(17px, 1vw + 12px, 19px); line-height: 1.45; }
.ct-tools__prompts { font-size: 14.5px; }
.ct-tbtn, .ct-chip2 { font-size: 15.5px; min-height: 42px; }
.ct-tips li { font-size: 15.5px; }
.ct-composer__text { font-size: 18px; line-height: 1.55; min-height: 88px; padding: 14px 16px; }
.ct-send { font-size: 18px; min-height: 56px; }
.ct-composer__foot { font-size: 13.5px; }
.ct-stage__brief { font-size: 16px; } .ct-goal__v { font-size: 16.5px; } .ct-goal__tr { font-size: 14px; }
.ct-stage__title { font-size: clamp(24px, 3.4vw, 34px); }
@media (max-width: 640px) { .ct-msg { max-width: 96%; } .ct-msg__t { font-size: 18px; padding: 11px 15px; } .ct-composer__text { min-height: 96px; } }

/* ---------- Responsive ---------- */
@media (max-width: 640px) {
  :host { --ct-header-h: 56px; }
  .ct-stage { border-radius: var(--ct-r-m); padding: 10px; }
  .ct-dev__log { min-height: 150px; max-height: clamp(240px, 42vh, 400px); padding: 12px 10px; }
  .ct-msg { max-width: 92%; }
  .ct-composer__row { flex-direction: column; align-items: stretch; }
  .ct-send { width: 100%; }
  .ct-dev__label { display: none; }
  .ct-composer__text { font-size: 16px; }
  .ct-letters span:nth-child(n+10) { display: none; }
  .ct-brand__name { display: none; }
  .ct-view { padding-block: 20px 40px; }
  .ct-lead { font-size: 16px; }
  .ct-select { flex: 1 1 140px; }
  .ct-select select { width: 100%; min-width: 0; }
  .ct-video { border-radius: var(--ct-r-m); }
}
@media (prefers-reduced-motion: reduce) {
  .ct *, .ct *::before, .ct *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
}
/* =====================================================================
   JUST TO STUDY — brand layer (loaded last, overrides earlier tokens).
   Source: Visual Guideline (palette 2.1, fonts 3.1–3.3, logo 1.x) and Logo Presentation.
   Purple #874BF8 · cyan #0AC7FF · green #00E641 · orange #FF7D1E · yellow #FFF805
   Neutrals #000 / #4E4B4B / #898787 / #C4C3C3 / #FFF
   Headings: PT Root UI (Onest is the embedded fallback). Body: SF Pro Display (Inter is the embedded fallback).
   ===================================================================== */
:host {
  /* palette */
  --jts-purple: #874bf8;
  --jts-purple-ink: #6a2fd8;      /* purple for text on white, contrast 7:1 */
  --jts-purple-deep: #5b26bf;
  --jts-purple-soft: #f3edff;
  --jts-purple-line: #e3d7fd;
  --jts-cyan: #0ac7ff;
  --jts-green: #00e641;
  --jts-orange: #ff7d1e;
  --jts-yellow: #fff805;
  --jts-black: #0b0910;
  --jts-grey-1: #4e4b4b;
  --jts-grey-2: #898787;
  --jts-grey-3: #c4c3c3;
  /* type */
  --jts-font-head: var(--cw-font, inherit);
  --jts-font-body: var(--cw-font, inherit);
  /* spacing (4-px scale), radii, shadow */
  --jts-s1: 4px; --jts-s2: 8px; --jts-s3: 12px; --jts-s4: 16px; --jts-s5: 24px; --jts-s6: 32px; --jts-s7: 48px;
  --jts-r-s: 10px; --jts-r-m: 16px; --jts-r-l: 24px; --jts-r-xl: 32px;
  --jts-shadow-1: 0 1px 2px rgba(60, 20, 140, .06), 0 6px 20px rgba(60, 20, 140, .08);
  --jts-shadow-2: 0 2px 4px rgba(60, 20, 140, .08), 0 16px 40px rgba(60, 20, 140, .16);
  /* logo colours: black + purple on light, white + cyan on purple/dark (Guide 2.2) */
  --logo-t: #000;
  --logo-o: var(--jts-purple);

  /* map the older component tokens onto the brand */
  --ct-violet: var(--jts-purple);
  --ct-violet-ink: var(--jts-purple-ink);
  --ct-violet-soft: var(--jts-purple-soft);
  --ct-pink: var(--jts-cyan);
  --ct-bg: #fff;
  --ct-surface: #f7f4ff;
  --ct-surface-2: #eee7ff;
  --ct-line: var(--jts-purple-line);
  --ct-ink: var(--jts-black);
  --ct-ink-2: var(--jts-grey-1);
  --ct-ink-3: #6b6868;
  --ct-on-violet: #fff;
  --ct-ok: #0a7a2c;
  --ct-ok-soft: #dcfbe5;
  --ct-warn: #8a4a00;
  --ct-warn-soft: #ffeedd;
  --ct-video-bg: #120b22;
  --ct-focus: var(--jts-purple);
  --ct-shadow: var(--jts-shadow-1);
  --ct-font-display: var(--cw-font, inherit);
  --ct-font-text: var(--cw-font, inherit);
  --ct-r-s: var(--jts-r-s);
  --ct-r-m: var(--jts-r-m);
  --ct-r-l: var(--jts-r-l);
  --ct-header-h: 68px;
}

:host([data-theme="dark"]) {
  --jts-purple-ink: #c2a4ff; --jts-purple-soft: #231a40; --jts-purple-line: #352a5c;
  --logo-t: #fff; --logo-o: var(--jts-cyan);
  --ct-violet: #8f55ff; --ct-violet-ink: #c2a4ff; --ct-violet-soft: #231a40;
  --ct-bg: #0f0a1c; --ct-surface: #181230; --ct-surface-2: #231a40; --ct-line: #352a5c;
  --ct-ink: #f6f3ff; --ct-ink-2: #cfc8e6; --ct-ink-3: #a39bbd;
  --ct-ok: #6be58e; --ct-ok-soft: #0f2a1a; --ct-warn: #ffb866; --ct-warn-soft: #2e1d08;
  --ct-focus: #c2a4ff;
}

/* ---------- Base typography ---------- */
.ct { font-family: var(--jts-font-body); font-size: 16px; line-height: 1.55; letter-spacing: 0; }
.ct-h1, .ct-h2, .ct-h3, .ct-shelf__title, .ct-card__title, .ct-stage__title, .ct-empty__title, .ct-meta__title h1 {
  font-family: var(--jts-font-head); text-transform: none; letter-spacing: -.012em;
}
.ct-h1 { font-size: clamp(32px, 4.6vw, 56px); font-weight: 700; line-height: 1.04; max-width: 14ch; }
.ct-h2 { font-size: clamp(24px, 2.6vw, 34px); font-weight: 700; line-height: 1.1; }
.ct-h3 { font-family: var(--jts-font-head); font-size: 17px; font-weight: 700; }
.ct-lead { font-size: clamp(17px, 1.5vw, 19px); line-height: 1.55; color: var(--ct-ink-2); max-width: 54ch; }
.ct-eyebrow {
  display: inline-flex; align-items: center; gap: 8px; margin: 0 0 14px; font-family: var(--jts-font-head);
  font-size: 13px; font-weight: 700; letter-spacing: .02em; text-transform: none; color: var(--jts-purple-ink);
  background: var(--jts-purple-soft); padding: 6px 14px 6px 12px; border-radius: 999px;
}
.ct-eyebrow::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--jts-purple); }
.ct-meta .ct-eyebrow { background: none; padding: 0; color: var(--jts-purple-ink); font-size: 14px; }
.ct-meta .ct-eyebrow::before { display: none; }
.ct a { color: var(--jts-purple-ink); }

/* ---------- Brand stripe + header with the real logo ---------- */
.ct-top { border-bottom: 1px solid var(--ct-line); background: color-mix(in srgb, var(--ct-bg) 96%, transparent); }
.ct-top::before {
  content: ""; display: block; height: 4px;
  background: linear-gradient(90deg, var(--jts-purple) 0 40%, var(--jts-cyan) 40% 60%, var(--jts-green) 60% 78%, var(--jts-orange) 78% 100%);
}
.ct-brand { gap: 0; padding-block: 6px; }
.ct-brand__logo { display: block; height: 30px; width: auto; aspect-ratio: 428 / 82; }
.ct-brand__logo .jts-t { fill: var(--logo-t); }
.ct-brand__logo .jts-o { fill: var(--logo-o); }
.ct-brand__mark, .ct-brand__name { display: none; }
.ct-crumbs { padding-left: 20px; margin-left: 4px; border-left: 1px solid var(--ct-line); font-size: 14.5px; }
.ct-crumbs a { color: var(--ct-ink-2); font-weight: 600; }
.ct-crumbs a:hover { color: var(--jts-purple-ink); }
.ct-uilang { background: var(--ct-surface); border: 0; padding: 4px; }
.ct-uilang__btn { padding: 6px 14px; font-family: var(--jts-font-head); font-size: 13px; font-weight: 700; letter-spacing: .03em; }
.ct-uilang__btn[aria-pressed="true"] { background: var(--jts-purple); color: #fff; }

/* ---------- Hero with brand speech bubbles ---------- */
.ct-hero { position: relative; padding-block: 12px 36px; }
.ct-hero > * { position: relative; z-index: 1; }
.ct-hero { min-height: 250px; }
.ct-bubbles { position: absolute; right: 0; top: 0; bottom: 28px; width: min(40%, 420px); z-index: 0; pointer-events: none; }
.ct-bubbles__main {
  position: absolute; right: 2%; top: 0; height: 80%; aspect-ratio: 1; border-radius: 50%;
  background: var(--jts-purple); display: grid; place-items: center; text-align: center;
  color: #fff; font-family: var(--jts-font-head); font-weight: 700; font-size: clamp(16px, 1.7vw, 22px); line-height: 1.15; padding: 12%;
}
.ct-bubbles__main::after {
  content: ""; position: absolute; left: 2%; bottom: 4%; width: 22%; aspect-ratio: 1; background: var(--jts-purple);
  clip-path: polygon(100% 0, 100% 100%, 0 100%); transform: translate(-30%, 22%);
}
.ct-bubbles__chip {
  position: absolute; display: inline-block; padding: 9px 16px; border-radius: 20px 20px 20px 4px; font-family: var(--jts-font-head);
  font-weight: 700; font-size: clamp(13px, 1.2vw, 16px); white-space: nowrap; box-shadow: var(--jts-shadow-1);
}
.ct-bubbles__chip--a { background: var(--jts-cyan); color: #00131a; left: 0; top: 18%; }
.ct-bubbles__chip--b { background: var(--jts-orange); color: #1d0d00; right: 0; top: 66%; border-radius: 20px 20px 4px 20px; }
.ct-bubbles__chip--c { background: var(--jts-green); color: #00180a; left: 12%; top: 62%; }
@media (max-width: 860px) { .ct-bubbles { display: none; } }

/* ---------- Filters ---------- */
.ct-filters { background: var(--ct-surface); border: 1px solid var(--ct-line); border-radius: var(--jts-r-xl); padding: 20px; gap: 16px; box-shadow: none; }
.ct-search input { height: 52px; border-radius: 999px; border: 2px solid var(--ct-line); padding-left: 48px; font-size: 16px; background: var(--ct-bg); }
.ct-search input:focus { border-color: var(--jts-purple); box-shadow: 0 0 0 4px color-mix(in srgb, var(--jts-purple) 22%, transparent); }
.ct-search__icon { left: 18px; color: var(--jts-purple); }
.ct-seg { background: var(--ct-bg); border: 1px solid var(--ct-line); border-radius: 999px; padding: 4px; gap: 4px; }
.ct-seg__btn { border-radius: 999px; font-family: var(--jts-font-head); font-size: 15px; font-weight: 700; padding: 10px 12px; }
.ct-seg__btn[aria-pressed="true"] { background: var(--jts-purple); color: #fff; box-shadow: 0 4px 12px color-mix(in srgb, var(--jts-purple) 40%, transparent); }
.ct-chip { border: 2px solid var(--ct-line); background: var(--ct-bg); border-radius: 999px; padding: 7px 16px; font-family: var(--jts-font-head); font-size: 14.5px; font-weight: 700; color: var(--ct-ink); }
.ct-chip:hover:not(:disabled) { border-color: var(--jts-purple); color: var(--jts-purple-ink); }
.ct-chip[aria-pressed="true"] { background: var(--jts-purple); border-color: var(--jts-purple); color: #fff; }
.ct-select { font-family: var(--jts-font-head); font-size: 13px; color: var(--ct-ink-2); }
.ct-select select { border: 2px solid var(--ct-line); border-radius: 999px; height: 44px; padding-left: 16px; font-weight: 600; }
.ct-select select:focus { border-color: var(--jts-purple); outline: none; }
.ct-clear { color: var(--jts-purple-ink); }
.ct-count { font-size: 14.5px; margin: 28px 0 8px; }

/* ---------- Shelves & cards ---------- */
.ct-shelves { gap: 56px; }
.ct-shelf__head { border-bottom: 0; padding-bottom: 0; align-items: center; gap: 10px 14px; }
.ct-shelf__title { font-size: clamp(22px, 2.2vw, 28px); font-weight: 700; }
.ct-shelf__count { font-family: var(--jts-font-head); font-size: 13px; font-weight: 700; color: var(--jts-purple-ink); background: var(--jts-purple-soft); padding: 4px 12px; border-radius: 999px; }
.ct-grid { gap: 24px; }
.ct-card__link { border-radius: var(--jts-r-l); border: 1px solid var(--ct-line); background: var(--ct-bg); box-shadow: none; }
.ct-card__link:hover { border-color: var(--jts-purple); box-shadow: var(--jts-shadow-2); transform: translateY(-3px); }
.ct-card__thumb { background: linear-gradient(135deg, #2a1659, #120b22); }
.ct-card__thumb-fallback { font-family: var(--jts-font-head); text-transform: none; font-size: 19px; font-weight: 700; letter-spacing: -.01em; }
.ct-card__body { padding: 16px 20px 20px; gap: 8px; }
.ct-card__series { font-family: var(--jts-font-head); font-size: 13px; font-weight: 700; letter-spacing: .01em; text-transform: none; color: var(--jts-purple-ink); }
.ct-card__title { font-size: 20px; font-weight: 700; line-height: 1.22; }
.ct-card__meta { font-size: 13.5px; }
.ct-card__desc { font-size: 14.5px; color: var(--ct-ink-2); }
.ct-card__dur, .ct-card__aud { background: rgba(18, 11, 34, .82); border-radius: 8px; font-family: var(--jts-font-head); font-weight: 700; }
/* CEFR level badges borrow the palette: one colour per level */
.ct-card__level, .ct-tag-level {
  font-family: var(--jts-font-head); font-size: 13px; font-weight: 700; padding: 6px 11px; border-radius: 999px 999px 999px 4px;
  background: var(--jts-purple); color: #fff; box-shadow: 0 2px 8px rgba(18, 11, 34, .25);
}
[data-lv="A0"] { background: var(--jts-cyan) !important; color: #00131a !important; }
[data-lv="A1"] { background: var(--jts-green) !important; color: #00180a !important; }
[data-lv="A2"] { background: var(--jts-yellow) !important; color: #1a1700 !important; }
[data-lv="B1"] { background: var(--jts-orange) !important; color: #1d0d00 !important; }
[data-lv="B2"] { background: var(--jts-purple) !important; color: #fff !important; }
[data-lv="C1"] { background: #0b0910 !important; color: #fff !important; }
.ct-badge { font-family: var(--jts-font-head); font-weight: 700; background: var(--jts-purple-soft); color: var(--jts-purple-ink); }
.ct-badge--ok { background: var(--ct-ok-soft); color: var(--ct-ok); }
.ct-badge--warn { background: var(--ct-warn-soft); color: var(--ct-warn); }

/* ---------- Buttons ---------- */
.ct-btn {
  background: var(--jts-purple); color: #fff; border-radius: 999px; min-height: 48px; padding: 0 26px;
  font-family: var(--jts-font-head); font-weight: 700; font-size: 16px; letter-spacing: 0;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--jts-purple) 35%, transparent); transition: transform .15s, box-shadow .15s, background .15s;
}
.ct .ct-btn { color: #fff; }
.ct-btn:hover:not(:disabled) { filter: none; background: #7a3cf0; transform: translateY(-1px); box-shadow: 0 10px 22px color-mix(in srgb, var(--jts-purple) 42%, transparent); }
.ct-btn--ghost { background: transparent; color: var(--jts-purple-ink) !important; border: 2px solid var(--jts-purple); box-shadow: none; }
.ct-btn--lg { min-height: 56px; padding: 0 34px; font-size: 18px; }

/* ---------- Watch page ---------- */
.ct-watch { gap: 24px; }
.ct-video { border-radius: var(--jts-r-xl); box-shadow: var(--jts-shadow-2); }
.ct-video__state { background: linear-gradient(160deg, #2a1659, #120b22); }
.ct-meta__title h1, .ct-meta h1 { font-family: var(--jts-font-head); font-weight: 700; text-transform: none; font-size: clamp(26px, 3.4vw, 38px); letter-spacing: -.015em; line-height: 1.1; }
.ct-tags .ct-badge { background: var(--ct-surface-2); color: var(--ct-ink); }
.ct-yt-link { color: var(--jts-purple-ink); }

/* ---------- Mission scene: scene art stays, the chat becomes brand ---------- */
.ct-stage { --ac1: var(--jts-purple); --ac2: var(--jts-cyan); --spark: var(--jts-yellow); border-radius: var(--jts-r-xl); box-shadow: var(--jts-shadow-2); }
.ct-stage[data-theme] { --ac1: var(--jts-purple); --spark: var(--jts-yellow); }
.ct-stage[data-theme="space"], .ct-stage[data-theme="underwater"], .ct-stage[data-theme="control"], .ct-stage[data-theme="office"] { --ac2: var(--jts-cyan); }
.ct-stage[data-theme="forest"], .ct-stage[data-theme="library"] { --ac2: var(--jts-green); }
.ct-stage[data-theme="cozy"], .ct-stage[data-theme="detective"], .ct-stage[data-theme="town"], .ct-stage[data-theme="fantasy"] { --ac2: var(--jts-orange); }
.ct-stage__head { background: rgba(18, 11, 34, .72); border-radius: var(--jts-r-l); border: 1px solid rgba(255, 255, 255, .14); }
.ct-stage__tag { font-family: var(--jts-font-head); letter-spacing: .02em; text-transform: none; font-size: 13px; color: var(--jts-cyan); }
.ct-stage__title { font-weight: 700; letter-spacing: -.012em; }
.ct-goal__k { font-family: var(--jts-font-head); text-transform: none; letter-spacing: .01em; font-size: 12.5px; color: var(--jts-yellow); }
.ct-goal { border-left-color: var(--jts-cyan); }

/* progress: counter pill + bar */
.ct-pips__n { font-family: var(--jts-font-head); font-weight: 700; background: var(--jts-purple); color: #fff; border-radius: 999px; padding: 4px 12px; }
.ct-pips__bar { background: rgba(255, 255, 255, .28); }
.ct-pips__bar i { background: linear-gradient(90deg, var(--jts-cyan), var(--jts-green)); }

/* chat bar (who is speaking) */
.ct-dev[data-theme] .ct-dev__bar, .ct-dev__bar { background: rgba(18, 11, 34, .78); color: #fff; border: 1px solid rgba(255, 255, 255, .16); border-radius: 999px; }
.ct-dev__id strong { font-family: var(--jts-font-head); font-weight: 700; }

/* speech bubbles: character = purple (left), student = light (right), small wedge tail like the logo's "to" */
.ct-msg__who { font-family: var(--jts-font-head); font-weight: 700; }
.ct-dev[data-theme] .ct-msg__t, .ct-msg__t { font-family: var(--jts-font-body); border: 0; box-shadow: 0 8px 22px rgba(10, 4, 30, .35); position: relative; isolation: isolate; }
.ct-dev[data-theme] .ct-msg--char .ct-msg__t, .ct-msg--char .ct-msg__t {
  background: var(--jts-purple); color: #fff; border: 0; border-radius: 24px 24px 24px 6px; box-shadow: 0 8px 22px rgba(10, 4, 30, .38);
}
.ct-dev[data-theme] .ct-msg--me .ct-msg__t, .ct-msg--me .ct-msg__t {
  background: #f6f3fb; color: var(--jts-purple-deep); border: 0; border-radius: 24px 24px 6px 24px; font-style: normal; font-family: var(--jts-font-body); font-weight: 500;
}
.ct-msg--char .ct-msg__t::after { content: ""; position: absolute; left: -17px; bottom: 0; width: 32px; height: 26px; background: var(--jts-purple); clip-path: path("M32 0 L32 26 L7 26 Q-2 26 5 17 Q22 9 32 0 Z"); z-index: -1; }
.ct-msg--me .ct-msg__t::after { content: ""; position: absolute; right: -17px; bottom: 0; width: 32px; height: 26px; background: #f6f3fb; clip-path: path("M0 0 L0 26 L25 26 Q34 26 27 17 Q10 9 0 0 Z"); z-index: -1; }
.ct-dev[data-theme="fantasy"] .ct-msg__t, .ct-dev[data-theme="library"] .ct-msg--char .ct-msg__t { border-radius: 24px 24px 24px 6px; }
.ct-dev[data-theme="space"] .ct-msg--char .ct-msg__t { box-shadow: 0 8px 22px rgba(10, 4, 30, .38); }
.ct-msg--char .ct-msg__t b, .ct-msg--char .ct-msg__t strong { color: var(--jts-yellow); }

/* the writing card: one clean white brand card on every scene */
.ct-dev[data-theme] .ct-tools, .ct-dev[data-theme] .ct-composer, .ct-tools, .ct-composer {
  background: #fff; background-image: none; color: var(--jts-black); border: 0; box-shadow: 0 12px 34px rgba(10, 4, 30, .35);
}
.ct-dev[data-theme] .ct-tools { border-radius: var(--jts-r-l) var(--jts-r-l) 0 0; }
.ct-dev[data-theme] .ct-composer { border-radius: 0 0 var(--jts-r-l) var(--jts-r-l); border-top: 1px solid var(--jts-purple-line); }
.ct-tools__ask { font-family: var(--jts-font-head); font-size: 17px; color: var(--jts-black); line-height: 1.4; }
.ct-tools__ask b { color: var(--jts-purple-ink); }
.ct-tools__prompts { color: var(--jts-grey-1); }
.ct-tools__prompts li { background: var(--jts-purple-soft); color: var(--jts-purple-deep); font-weight: 600; }
.ct-composer__text { border: 2px solid var(--jts-purple-line); border-radius: var(--jts-r-m); background: #fff; color: var(--jts-black); font-family: var(--jts-font-body); }
.ct-composer__text::placeholder { color: #7a7690; }
.ct-composer__text:focus { border-color: var(--jts-purple); box-shadow: 0 0 0 4px color-mix(in srgb, var(--jts-purple) 22%, transparent); }
.ct-composer__foot { color: #5f5a73; }
.ct-dev[data-theme] .ct-composer__note, .ct-composer__note { color: #b04a00; }
.ct-tools .ct-btn, .ct-tools button { font-family: var(--jts-font-head); }
.ct-send, .ct-dev .ct-send, .ct-dev[data-theme] .ct-send {
  background: var(--jts-purple); color: #fff; border: 0; border-radius: 999px; font-family: var(--jts-font-head); font-weight: 700;
  text-shadow: none; box-shadow: 0 8px 20px color-mix(in srgb, var(--jts-purple) 45%, transparent);
}
.ct-send:hover:not(:disabled) { filter: none; background: #7a3cf0; }

/* portal entry (the "your adventure begins" card) */
.ct-portal .ct-btn, .ct-portal .ct-btn--lg {
  background: var(--jts-purple); color: #fff; border: 3px solid #fff; border-radius: 999px; font-family: var(--jts-font-head);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--jts-cyan) 35%, transparent), 0 14px 34px rgba(10, 4, 30, .5);
}
.ct-portal .ct-btn:hover:not(:disabled) { background: #7a3cf0; }
.ct-portal__ring { background: conic-gradient(from 0deg, var(--jts-purple), var(--jts-cyan), var(--jts-green), var(--jts-orange), var(--jts-purple)); }

/* mobile */
@media (max-width: 640px) {
  :host { --ct-header-h: 60px; }
  .ct-brand__logo { height: 24px; }
  .ct-crumbs { display: none; }
  .ct-top__inner { justify-content: space-between; }
  .ct-h1 { font-size: 34px; }
  .ct-filters { padding: 14px; border-radius: var(--jts-r-l); }
  .ct-card__title { font-size: 19px; }
  .ct-shelves { gap: 40px; }
}
@media (max-width: 520px) { .ct-seg { border-radius: var(--jts-r-l); } }
@media (prefers-reduced-motion: reduce) { .ct-btn, .ct-card__link { transition: none !important; } }

/* the writing card and the finish card always read as brand-light: reset the per-scene colour variables inside them */
.ct-dev[data-theme] .ct-tools, .ct-dev[data-theme] .ct-composer, .ct-dev[data-theme] .ct-done {
  --dv-ink: #0b0910; --dv-ink2: #4e4b4b; --dv-chip: #f3edff; --dv-line: #e3d7fd; --dv-input: #fff;
}
.ct-tbtn, .ct-chip2 {
  font-family: var(--jts-font-head); font-weight: 600; font-size: 15px; min-height: 40px; padding: 8px 16px; border-radius: 999px;
  color: var(--jts-purple-deep) !important; background: var(--jts-purple-soft) !important; border: 2px solid var(--jts-purple-line) !important;
}
.ct-tbtn:hover, .ct-chip2:hover { border-color: var(--jts-purple) !important; background: #fff !important; }
.ct-chip2--start { border-style: solid !important; border-color: var(--jts-cyan) !important; background: #e6f9ff !important; color: #00536e !important; }
.ct-chip2--start:hover { background: var(--jts-cyan) !important; color: #00131a !important; }
.ct-tips li { background: var(--jts-purple-soft); border-left: 4px solid var(--jts-purple); color: var(--jts-black); border-radius: 12px; }
.ct-vocab summary { color: var(--jts-purple-ink); font-family: var(--jts-font-head); font-weight: 700; }
.ct-dev[data-theme] .ct-done {
  background: #fff; color: var(--jts-black); border: 0; border-radius: var(--jts-r-l); box-shadow: 0 12px 34px rgba(10, 4, 30, .35); padding: 24px 20px 26px;
}
.ct-done__h { font-family: var(--jts-font-head); font-weight: 700; letter-spacing: -.012em; color: var(--jts-black); }
.ct-done__end { color: #4e4b4b; }
.ct-dev[data-theme] .ct-done .ct-btn--ghost { color: var(--jts-purple-ink) !important; border: 2px solid var(--jts-purple); }
.ct-done .ct-btn, .ct-done__acts .ct-btn { font-family: var(--jts-font-head); font-weight: 700; font-size: 16px; }

/* ---------- Simplified: wordless hero bubbles, no stray text blocks ---------- */
.ct-bubbles__main { display: flex; gap: 8%; align-items: center; justify-content: center; padding: 0; }
.ct-bubbles__main i { width: 11%; aspect-ratio: 1; border-radius: 50%; background: #fff; animation: ct-dot 1.4s ease-in-out infinite; }
.ct-bubbles__main i:nth-child(2) { animation-delay: .18s; } .ct-bubbles__main i:nth-child(3) { animation-delay: .36s; }
@keyframes ct-dot { 0%, 70%, 100% { transform: translateY(0); opacity: .75; } 35% { transform: translateY(-22%); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .ct-bubbles__main i { animation: none; } }
.ct-bubbles__chip { width: 74px; height: 38px; padding: 0; }
.ct-bubbles__chip--b { width: 92px; } .ct-bubbles__chip--c { width: 62px; }
.ct-hero { min-height: 190px; padding-block: 8px 28px; }
.ct-h1 { font-size: clamp(40px, 6vw, 72px); max-width: none; letter-spacing: -.02em; }
.ct-count:empty { display: none; }
.ct-shelf__title { font-size: clamp(26px, 2.8vw, 36px); }
.ct-shelf__count { font-size: 14px; min-width: 34px; text-align: center; }
.ct-card__desc { -webkit-line-clamp: 2; }
.ct-card__body { gap: 6px; }
.ct-stage__head { gap: 8px; }
.ct-goal { border-left-color: var(--jts-cyan); }
.ct-goal__v { font-family: var(--jts-font-head); font-size: 16.5px; }
.ct-stage__note { font-size: 12px; opacity: .8; }
.ct-tools__ask { font-size: 18px; }
@media (max-width: 640px) { .ct-h1 { font-size: 40px; } .ct-hero { min-height: 0; padding-bottom: 20px; } }
.ct-shelves { margin-top: 36px; }

.ct-bubbles { display: none !important; }
.ct-hero { min-height: 0; padding-block: 8px 20px; }

`
