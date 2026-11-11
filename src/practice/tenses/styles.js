// CSS «Tenses World» для Shadow DOM. СГЕНЕРИРОВАН scripts/tenses/extract-styles.js
// из <style> прототипа — руками не править: правки — в PATCHES/APP_CSS/DARK_APP_CSS
// генератора (там же — что и почему отличается от прототипа).

export const TENSES_CSS = `:host {
  --brand: #874BF8;
  --brand-2: #6E33E6;
  --brand-soft: #F1EAFF;
  --cyan: #0AC7FF;
  --blue: #0AAFFF;
  --green: #00D441;
  --orange: #FF7D1D;
  --orange-2: #FF631E;
  --yellow: #FFAD00;
  --red: #E5484D;

  --g-past: #FF631E;
  --g-past-soft: #FFF0E6;
  --g-present: #874BF8;
  --g-present-soft: #F1EAFF;
  --g-future: #0AAFFF;
  --g-future-soft: #E3F6FF;

  --k-s: #874BF8;   
  --k-a: #0A9EE6;   
  --k-n: #E5484D;   
  --k-v: #00B23A;   
  --k-o: #6B6B7B;   
  --k-t: #E68A00;   

  --bg: #F5F5F9;
  --card: #FFFFFF;
  --ink: #16151C;
  --ink-2: #4E4B5C;
  --ink-3: #8A879A;
  --line: #ECEAF3;
  --line-strong: #CFCBDD;
  --ok: #00B23A;
  --ok-soft: #E3FBEA;
  --bad: #E5484D;
  --bad-soft: #FFECEC;

  --r-xl: 28px;
  --r-l: 22px;
  --r-m: 16px;
  --r-s: 12px;
  --shadow: 0 1px 2px rgba(22, 21, 28, .04), 0 8px 24px rgba(80, 60, 160, .07);
  --shadow-lift: 0 2px 4px rgba(22, 21, 28, .05), 0 16px 40px rgba(80, 60, 160, .14);

  --font-head: var(--tw-font, inherit);
  --font-body: var(--tw-font, inherit);
}

* { box-sizing: border-box; }

.tws { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font-body); font-size: 16px; line-height: 1.55; }
button, input { font: inherit; color: inherit; }
button { cursor: pointer; }
img { max-width: 100%; display: block; }
h1, h2, h3, h4 { font-family: var(--font-head); line-height: 1.12; margin: 0; letter-spacing: -.01em; }
p { margin: 0; }
.en { font-weight: 600; color: var(--ink); }
em.en { font-style: normal; background: linear-gradient(transparent 58%, rgba(135, 75, 248, .16) 0); padding: 0 1px; }
:focus-visible { outline: 3px solid rgba(135, 75, 248, .45); outline-offset: 2px; border-radius: 8px; }

.tw { max-width: 1180px; margin: 0 auto; padding: 0 24px 80px; }
.topbar { position: sticky; top: 0; z-index: 30; background: rgba(245, 245, 249, .86); backdrop-filter: saturate(1.4) blur(14px); -webkit-backdrop-filter: saturate(1.4) blur(14px); border-bottom: 1px solid transparent; transition: border-color .2s; }
.topbar.scrolled { border-color: var(--line); }
.topbar-in { max-width: 1180px; margin: 0 auto; padding: 12px 24px; display: flex; align-items: center; gap: 12px; }
.logo { font-family: var(--font-head); font-weight: 800; font-size: 22px; letter-spacing: -.02em; color: var(--ink); text-decoration: none; white-space: nowrap; }
.logo b { color: var(--brand); font-weight: 800; }
.logo small { display: block; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); margin-top: -2px; }
.topbar .spacer { flex: 1; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 999px; padding: 10px 18px; font-weight: 600; font-size: 15px; background: var(--card); color: var(--ink); box-shadow: inset 0 0 0 1.5px var(--line); transition: transform .15s, box-shadow .15s, background .15s; text-decoration: none; white-space: nowrap; }
.btn:hover { box-shadow: inset 0 0 0 1.5px var(--line-strong); }
.btn:active { transform: scale(.97); }
.btn.primary { background: var(--brand); color: #fff; box-shadow: 0 6px 16px rgba(135, 75, 248, .32); }
.btn.primary:hover { background: var(--brand-2); }
.btn.ghost { background: transparent; box-shadow: none; }
.btn.ghost:hover { background: rgba(135, 75, 248, .08); }
.btn.sm { padding: 7px 14px; font-size: 14px; }
.btn[disabled] { opacity: .45; pointer-events: none; }
.btn svg { width: 18px; height: 18px; flex: none; }
.icon-btn { width: 42px; height: 42px; padding: 0; }

.switcher { position: relative; }
.switcher-pop { position: absolute; right: 0; top: calc(100% + 10px); width: min(560px, calc(100cqw - 32px)); background: var(--card); border-radius: var(--r-l); box-shadow: var(--shadow-lift); padding: 16px; display: none; z-index: 40; }
.switcher.open .switcher-pop { display: block; animation: pop .18s ease-out; }
@keyframes pop { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
.mini-map { display: grid; grid-template-columns: 92px repeat(3, 1fr); gap: 6px; font-size: 13px; }
.mini-map .h { font-weight: 700; color: var(--ink-3); font-size: 11px; text-transform: uppercase; letter-spacing: .06em; align-self: end; padding: 0 4px 2px; }
.mini-map .rl { font-weight: 600; color: var(--ink-2); align-self: center; font-size: 12px; line-height: 1.2; }
.mini-map a { display: block; padding: 8px 10px; border-radius: 10px; text-decoration: none; color: var(--ink); background: var(--bg); font-weight: 600; line-height: 1.2; transition: background .15s; }
.mini-map a:hover { background: var(--brand-soft); }
.mini-map a.cur { background: var(--brand); color: #fff; }
.mini-map a[data-g="past"].cur { background: var(--g-past); }
.mini-map a[data-g="future"].cur { background: var(--g-future); }

.hub-hero { position: relative; margin-top: 18px; border-radius: 36px; overflow: hidden; background: var(--brand); color: #fff; padding: 48px 48px 40px; isolation: isolate; }
.hub-hero::before { content: ""; position: absolute; inset: 0; z-index: -1;
  background: radial-gradient(600px 300px at 0% 100%, rgba(255, 125, 29, .55), transparent 60%),
              radial-gradient(520px 320px at 100% 0%, rgba(10, 199, 255, .6), transparent 60%),
              radial-gradient(400px 260px at 60% 120%, rgba(0, 230, 65, .25), transparent 60%); }
.hub-hero .eyebrow { display: inline-flex; gap: 8px; align-items: center; background: rgba(255, 255, 255, .16); padding: 6px 14px; border-radius: 999px; font-weight: 600; font-size: 14px; }
.hub-hero h1 { font-size: clamp(36px, 6cqw, 68px); font-weight: 800; margin: 18px 0 12px; max-width: 760px; }
.hub-hero h1 span { color: #FFF805; }
.hub-hero p.lead { font-size: clamp(16px, 1.6cqw, 19px); max-width: 620px; opacity: .92; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
.hero-actions .btn { background: #fff; color: var(--brand); box-shadow: none; }
.hero-actions .btn.alt { background: rgba(255, 255, 255, .16); color: #fff; }

.section-title { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin: 52px 0 18px; }
.section-title h2 { font-size: clamp(26px, 3cqw, 36px); font-weight: 800; }
.section-title p { color: var(--ink-2); max-width: 560px; }
.kicker { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--brand); margin-bottom: 6px; display: block; }

.time-axis { display: grid; grid-template-columns: 170px repeat(3, 1fr); gap: 14px; align-items: end; margin-bottom: 10px; }
.time-axis .zone { position: relative; padding: 12px 16px 14px; border-radius: var(--r-m); color: #fff; font-family: var(--font-head); }
.time-axis .zone b { display: block; font-size: 22px; font-weight: 800; }
.time-axis .zone span { font-size: 13px; opacity: .9; }
.zone.past { background: var(--g-past); }
.zone.present { background: var(--g-present); }
.zone.future { background: var(--g-future); }
.time-axis .arrow { grid-column: 2 / -1; height: 0; }
.map { display: grid; grid-template-columns: 170px repeat(3, 1fr); gap: 14px; }
.map .aspect-label { align-self: stretch; display: flex; flex-direction: column; justify-content: center; padding: 6px 4px; }
.map .aspect-label b { font-family: var(--font-head); font-size: 18px; font-weight: 800; }
.map .aspect-label span { font-size: 13px; color: var(--ink-3); line-height: 1.35; }
.tile { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 16px 16px 12px; border-radius: var(--r-l); background: var(--card); box-shadow: var(--shadow); text-decoration: none; color: var(--ink); overflow: hidden; transition: transform .2s, box-shadow .2s; min-height: 168px; }
.tile:hover { transform: translateY(-3px); box-shadow: var(--shadow-lift); }
.tile .num { position: absolute; right: 14px; top: 12px; font-family: var(--font-head); font-weight: 800; font-size: 13px; color: var(--ink-3); }
.tile h3 { font-size: 19px; font-weight: 800; padding-right: 26px; }
.tile .tg { font-size: 13.5px; color: var(--ink-2); line-height: 1.35; }
.tile .tl { margin-top: auto; width: 100%; height: auto; }
.tile::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: var(--gc); }
.tile[data-g="past"] { --gc: var(--g-past); --gs: var(--g-past-soft); }
.tile[data-g="present"] { --gc: var(--g-present); --gs: var(--g-present-soft); }
.tile[data-g="future"] { --gc: var(--g-future); --gs: var(--g-future-soft); }
.tile .badge-video { position: absolute; left: 18px; bottom: 12px; font-size: 11.5px; font-weight: 700; color: var(--gc); background: var(--gs); border-radius: 999px; padding: 2px 9px; }
.tile.visited h3::after { content: " ✓"; color: var(--ok); font-size: 15px; }

.how { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.how .card { padding: 22px; }
.how .card h3 { font-size: 19px; margin: 10px 0 6px; font-weight: 800; }
.how .card p { color: var(--ink-2); font-size: 15px; }
.how .step-n { width: 34px; height: 34px; border-radius: 50%; background: var(--brand-soft); color: var(--brand); font-weight: 800; display: grid; place-items: center; font-family: var(--font-head); }

.card { background: var(--card); border-radius: var(--r-l); box-shadow: var(--shadow); }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }

.t-hero { position: relative; margin-top: 18px; border-radius: 36px; padding: 36px 40px; background: var(--gc); color: #fff; overflow: hidden; display: grid; grid-template-columns: 1.15fr .85fr; gap: 28px; align-items: center; isolation: isolate; }
.t-hero::before { content: ""; position: absolute; inset: 0; z-index: -1; background: radial-gradient(500px 280px at 100% 0%, rgba(255, 255, 255, .22), transparent 60%), radial-gradient(380px 240px at 0% 110%, rgba(0, 0, 0, .14), transparent 60%); }
.t-hero[data-g="past"] { --gc: var(--g-past); }
.t-hero[data-g="present"] { --gc: var(--g-present); }
.t-hero[data-g="future"] { --gc: var(--g-future); }
.t-hero .chips { display: flex; flex-wrap: wrap; gap: 8px; }
.t-hero .chip { background: rgba(255, 255, 255, .18); border-radius: 999px; padding: 5px 13px; font-size: 13.5px; font-weight: 600; }
.t-hero h1 { font-size: clamp(38px, 5.6cqw, 64px); font-weight: 800; margin: 14px 0 4px; }
.t-hero .ru { font-size: 18px; opacity: .9; }
.t-hero .key { margin-top: 18px; font-family: var(--font-head); font-size: clamp(18px, 2cqw, 23px); font-weight: 600; line-height: 1.3; max-width: 560px; }
.t-hero .tl-card { background: #fff; color: var(--ink); border-radius: var(--r-l); padding: 14px 14px 8px; box-shadow: 0 18px 40px rgba(0, 0, 0, .14); }
.t-hero .tl-card .cap { font-size: 13px; color: var(--ink-3); font-weight: 600; padding: 0 6px; }
.t-hero .tl { width: 100%; height: auto; }

.stepnav { position: sticky; top: 82px; z-index: 20; margin: 18px 0 0; display: flex; gap: 6px; overflow-x: auto; padding: 6px; background: var(--card); border-radius: 999px; box-shadow: var(--shadow); scrollbar-width: none; }
.stepnav::-webkit-scrollbar { display: none; }
.stepnav a { flex: none; display: flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; text-decoration: none; color: var(--ink-2); font-weight: 600; font-size: 14.5px; transition: background .15s, color .15s; }
.stepnav a i { font-style: normal; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; background: var(--bg); color: var(--ink-3); font-weight: 800; }
.stepnav a:hover { background: var(--bg); }
.stepnav a.on { background: var(--gc, var(--brand)); color: #fff; }
.stepnav a.on i { background: rgba(255, 255, 255, .25); color: #fff; }

.block { scroll-margin-top: 150px; margin-top: 56px; }
.block-head { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.block-head .n { width: 44px; height: 44px; flex: none; border-radius: 14px; display: grid; place-items: center; font-family: var(--font-head); font-weight: 800; font-size: 19px; color: #fff; background: var(--gc, var(--brand)); }
.block-head h2 { font-size: clamp(24px, 2.8cqw, 32px); font-weight: 800; }
.block-head p { color: var(--ink-3); font-size: 14.5px; }

.video-wrap { border-radius: var(--r-xl); overflow: hidden; background: #0E0D14; box-shadow: var(--shadow-lift); }
.video-wrap video { display: block; width: 100%; height: auto; max-height: 78vh; background: #000; }
.video-meta { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 6px 0; color: var(--ink-3); font-size: 14px; flex-wrap: wrap; }
.video-pending { border-radius: var(--r-xl); aspect-ratio: 16 / 9; background: var(--card); box-shadow: var(--shadow); display: grid; place-items: center; text-align: center; padding: 24px; position: relative; overflow: hidden; }
.video-pending::before { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(-45deg, transparent 0 22px, rgba(135, 75, 248, .04) 22px 44px); }
.video-pending > div { position: relative; max-width: 420px; }
.video-pending .play { width: 74px; height: 74px; border-radius: 50%; margin: 0 auto 16px; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand); }
.video-pending h3 { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
.video-pending p { color: var(--ink-2); font-size: 15px; }
.video-error { padding: 28px; color: #fff; text-align: center; }

.usage-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.usage { padding: 20px 20px 18px; display: flex; flex-direction: column; gap: 10px; }
.usage .ic { width: 30px; height: 30px; border-radius: 10px; background: var(--gs); color: var(--gc); display: grid; place-items: center; font-weight: 800; font-family: var(--font-head); font-size: 15px; }
.usage h4 { font-size: 17.5px; font-weight: 800; }
.usage p { color: var(--ink-2); font-size: 15px; }
.ex { border-left: 3px solid var(--gc); padding: 2px 0 2px 12px; }
.ex .e { font-weight: 600; }
.ex .r { color: var(--ink-3); font-size: 14px; }
.ex + .ex { margin-top: 8px; }

.sub-h { font-size: 21px; font-weight: 800; margin: 36px 0 14px; display: flex; align-items: center; gap: 10px; }

.forms-tabs { display: inline-flex; background: var(--card); border-radius: 999px; padding: 5px; box-shadow: var(--shadow); gap: 4px; margin-bottom: 14px; }
.forms-tabs button { border: 0; background: transparent; border-radius: 999px; padding: 9px 18px; font-weight: 700; color: var(--ink-2); display: flex; align-items: center; gap: 8px; }
.forms-tabs button .sg { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-size: 16px; background: var(--bg); }
.forms-tabs button.on { background: var(--ink); color: #fff; }
.forms-tabs button.on .sg { background: rgba(255, 255, 255, .18); }
.formula-card { padding: 26px; display: grid; grid-template-columns: 1.1fr .9fr; gap: 28px; align-items: start; }
.formula { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
.chipk { display: inline-flex; align-items: center; padding: 9px 14px; border-radius: 14px; font-weight: 700; font-size: 17px; font-family: var(--font-head); color: #fff; line-height: 1.15; }
.chipk.s { background: var(--k-s); }
.chipk.a { background: var(--k-a); }
.chipk.n { background: var(--k-n); }
.chipk.v { background: var(--k-v); }
.chipk.o { background: #EDEBF4; color: var(--ink-2); }
.chipk.t { background: #FFF1D6; color: #8A5300; }
.plus { color: var(--ink-3); font-weight: 800; }
.formula-card .note { color: var(--ink-2); font-size: 15px; }
.formula-card .short { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 8px; }
.formula-card .short span { background: var(--bg); padding: 6px 12px; border-radius: 10px; font-weight: 600; font-size: 14.5px; }
.legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 13px; color: var(--ink-3); margin-top: 10px; }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }

.extras { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
.extra { padding: 20px; }
.extra h4 { font-size: 17px; font-weight: 800; margin-bottom: 10px; }
.extra ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.extra li { position: relative; padding-left: 18px; font-size: 15px; color: var(--ink-2); }
.extra li::before { content: ""; position: absolute; left: 2px; top: 9px; width: 7px; height: 7px; border-radius: 50%; background: var(--gc); }

.signals { padding: 22px; }
.signal-words { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.signal-words span { background: #FFF1D6; color: #8A5300; font-weight: 700; padding: 7px 13px; border-radius: 999px; font-size: 14.5px; }
.signals .note { display: flex; gap: 10px; color: var(--ink-2); font-size: 15px; background: var(--bg); padding: 12px 14px; border-radius: 14px; }

.mistakes { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.mistake { padding: 18px 20px; }
.mistake .w, .mistake .c { display: flex; gap: 10px; align-items: flex-start; font-weight: 600; font-size: 16px; }
.mistake .w { color: var(--bad); text-decoration: line-through; text-decoration-thickness: 2px; text-decoration-color: rgba(229, 72, 77, .55); }
.mistake .c { color: var(--ok); margin-top: 6px; }
.mistake .w::before, .mistake .c::before { flex: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; color: #fff; text-decoration: none; margin-top: 1px; }
.mistake .w::before { content: "✕"; background: var(--bad); }
.mistake .c::before { content: "✓"; background: var(--ok); }
.mistake p { margin-top: 10px; color: var(--ink-2); font-size: 14.5px; }

.compare { padding: 22px; }
.compare + .compare { margin-top: 14px; }
.compare h4 { font-size: 18px; font-weight: 800; margin-bottom: 8px; }
.compare h4 a { color: inherit; }
.compare > p { color: var(--ink-2); font-size: 15px; margin-bottom: 16px; }
.cmp-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.cmp-col { border-radius: 16px; padding: 14px; background: var(--bg); }
.cmp-col .lbl { font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
.cmp-col .tl { width: 100%; height: auto; margin: 4px 0; }
.cmp-col .e { font-weight: 700; }
.cmp-col .r { color: var(--ink-3); font-size: 14px; }

.sources { margin-top: 22px; font-size: 13.5px; color: var(--ink-3); }

.lab { padding: 26px; }
.lab-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.lab-row .lab-lbl { width: 92px; font-size: 13px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: .05em; }
.pill { border: 0; background: var(--bg); border-radius: 999px; padding: 8px 15px; font-weight: 600; font-size: 14.5px; transition: background .15s, color .15s; }
.pill:hover { background: var(--brand-soft); }
.pill.on { background: var(--ink); color: #fff; }
.lab-out { margin: 18px 0 6px; padding: 22px; border-radius: 20px; background: var(--bg); min-height: 92px; }
.lab-sentence { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; font-family: var(--font-head); font-size: clamp(20px, 2.8cqw, 30px); font-weight: 700; }
.lab-sentence span { padding: 2px 8px; border-radius: 10px; animation: rise .35s both; }
.lab-sentence span.p { padding: 0; margin-left: -6px; }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.k-s { color: var(--k-s); background: rgba(135, 75, 248, .1); }
.k-a { color: var(--k-a); background: rgba(10, 158, 230, .1); }
.k-an { color: var(--k-a); background: linear-gradient(90deg, rgba(10, 158, 230, .1), rgba(229, 72, 77, .12)); }
.k-n { color: var(--k-n); background: rgba(229, 72, 77, .1); }
.k-v { color: var(--k-v); background: rgba(0, 178, 58, .1); }
.k-o { color: var(--ink-2); }
.k-t { color: var(--k-t); background: rgba(230, 138, 0, .1); }
.lab-contr { margin-top: 10px; color: var(--ink-2); font-size: 15px; }
.lab-contr b { color: var(--ink); }
.machine { margin-top: 18px; }
.machine-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.machine-grid button { text-align: left; border: 0; background: var(--bg); border-radius: 14px; padding: 10px 12px; transition: background .15s, transform .15s; }
.machine-grid button:hover { background: var(--brand-soft); }
.machine-grid button small { display: block; font-size: 11.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--gc); }
.machine-grid button span { font-size: 14px; font-weight: 600; line-height: 1.35; display: block; }
.machine-grid button.cur { background: var(--ink); color: #fff; }
.machine-grid button.cur small { color: #fff; opacity: .8; }
.machine-grid [data-g="past"] { --gc: var(--g-past); }
.machine-grid [data-g="present"] { --gc: var(--g-present); }
.machine-grid [data-g="future"] { --gc: var(--g-future); }

.review { padding: 28px; display: grid; grid-template-columns: 1.2fr .8fr; gap: 28px; }
.review ol { margin: 0; padding: 0; list-style: none; counter-reset: r; display: grid; gap: 12px; }
.review li { counter-increment: r; position: relative; padding-left: 44px; font-size: 16px; }
.review li::before { content: counter(r); position: absolute; left: 0; top: -2px; width: 30px; height: 30px; border-radius: 10px; background: var(--gs); color: var(--gc); font-weight: 800; display: grid; place-items: center; font-family: var(--font-head); }
.review .recap { background: var(--bg); border-radius: 20px; padding: 18px; display: grid; gap: 12px; align-content: start; }
.review .recap .formula { margin: 0; }
.review .recap .chipk { font-size: 14px; padding: 6px 10px; border-radius: 10px; }
.review .recap .lbl { font-size: 12.5px; font-weight: 800; color: var(--ink-3); text-transform: uppercase; letter-spacing: .05em; }
.next-tense { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.next-tense a { display: flex; flex-direction: column; gap: 2px; padding: 18px 20px; border-radius: 20px; background: var(--card); box-shadow: var(--shadow); text-decoration: none; color: var(--ink); transition: transform .15s; }
.next-tense a:hover { transform: translateY(-2px); }
.next-tense a small { color: var(--ink-3); font-weight: 600; font-size: 13px; }
.next-tense a b { font-family: var(--font-head); font-size: 20px; font-weight: 800; }
.next-tense a.nx { text-align: right; }

[data-g="past"] { --gc: var(--g-past); --gs: var(--g-past-soft); }
[data-g="present"] { --gc: var(--g-present); --gs: var(--g-present-soft); }
[data-g="future"] { --gc: var(--g-future); --gs: var(--g-future-soft); }

.tl-t { font-size: 11.5px; fill: var(--ink-3); font-weight: 600; font-family: var(--font-body); }
.tl-strong { fill: var(--ink); font-weight: 800; }
.tl-now { font-size: 11px; fill: #fff; font-weight: 800; letter-spacing: .06em; font-family: var(--font-body); }
.anim .tl-draw { stroke-dasharray: 600; stroke-dashoffset: 600; animation: draw 1.2s .2s ease-out forwards; }
.anim .tl-pop { opacity: 0; animation: fade .4s .9s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes fade { to { opacity: 1; } }

.footer-note { margin-top: 64px; color: var(--ink-3); font-size: 13.5px; text-align: center; }
.toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: var(--ink); color: #fff; border-radius: 999px; padding: 10px 18px; font-weight: 600; font-size: 14.5px; z-index: 50; animation: rise .25s both; }

@container tws (max-width: 1020px) {
  .t-hero { grid-template-columns: 1fr; }
  .formula-card, .review { grid-template-columns: 1fr; }
}
@container tws (max-width: 820px) {
  .time-axis, .map { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .time-axis .corner, .map .aspect-label { display: none; }
  .map .row-h { display: block; grid-column: 1 / -1; margin-top: 12px; }
  .tile { min-height: 0; padding: 12px 10px 10px; }
  .tile h3 { font-size: 15px; padding-right: 0; }
  .tile .tg, .tile .num, .tile .badge-video { display: none; }
  .time-axis .zone { padding: 10px; } .time-axis .zone b { font-size: 16px; } .time-axis .zone span { display: none; }
  .how { grid-template-columns: 1fr; }
  .machine-grid { grid-template-columns: repeat(2, 1fr); }
  .tl-choices { grid-template-columns: 1fr; }
  .tl-choice .tl { max-height: 110px; }
}
@container tws (min-width: 821px) { .map .row-h { display: none; } }
@container tws (max-width: 640px) {
  .tw { padding: 0 16px 64px; }
  .topbar-in { padding: 10px 16px; gap: 8px; }
  .topbar .btn .lbl { display: none; }
  .hub-hero, .t-hero { padding: 28px 22px; border-radius: 28px; }
  .grid-2, .grid-3, .cmp-cols, .next-tense { grid-template-columns: 1fr; }
  .stepnav { top: 70px; border-radius: 18px; }
  .stepnav a { padding: 8px 12px; font-size: 13.5px; }
  .stage, .lab, .formula-card, .review { padding: 18px; }
  .usage-grid, .mistakes { grid-template-columns: 1fr; }
  .lab-row .lab-lbl { width: 100%; }
  .line .msg { font-size: 16px; }
  .chipk { font-size: 15px; padding: 7px 11px; }
  .machine-grid { grid-template-columns: 1fr; }
  .block { margin-top: 44px; }
  .next-tense a.nx { text-align: left; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-delay: 0s !important; transition-duration: .001ms !important; }
  .anim .tl-draw { stroke-dashoffset: 0; } .anim .tl-pop { opacity: 1; }
}
.signals .note svg { width: 22px; height: 22px; flex: none; color: var(--yellow); margin-top: 1px; }
.cmp-col .tl { max-height: 120px; }
@container tws (max-width: 640px) {
  .forms-tabs { display: flex; width: 100%; }
  .forms-tabs button { flex: 1; justify-content: center; padding: 9px 6px; font-size: 13.5px; gap: 5px; }
  .forms-tabs button .sg { width: 20px; height: 20px; font-size: 14px; }
}
@container tws (max-width: 380px) { .forms-tabs button .sg { display: none; } }
@container tws (max-width: 820px) {
  .section-title { flex-direction: column; align-items: flex-start; gap: 8px; margin-top: 40px; }
}

.langs { display: inline-flex; background: var(--card); border-radius: 999px; padding: 4px; gap: 2px; box-shadow: inset 0 0 0 1.5px var(--line); }
.langs button { border: 0; background: transparent; border-radius: 999px; padding: 6px 11px; font-weight: 800; font-size: 13px; letter-spacing: .04em; color: var(--ink-3); transition: background .15s, color .15s; }
.langs button:hover { color: var(--ink); }
.langs button.on { background: var(--ink); color: #fff; }
.langs button[data-lang="kz"].on { background: #00A8E8; }
.langs button[data-lang="ru"].on { background: var(--brand); }
.xlat { display: block; color: var(--ink-3); font-size: .9em; font-weight: 500; }
.xlat[hidden] { display: none !important; }
.tile .tile-local { font-size: 12px; margin-top: -4px; }
.badges { position: absolute; left: 18px; bottom: 12px; display: flex; gap: 6px; }
.badges .badge-video { position: static; }

.lesson { margin-top: 22px !important; }
.lesson-head { display: grid; grid-template-columns: auto 1fr; gap: 12px 40px; align-items: end; margin-bottom: 14px; }
.lesson-head .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.lesson-head .chip { background: var(--card); box-shadow: inset 0 0 0 1.5px var(--line); border-radius: 999px; padding: 4px 12px; font-size: 13px; font-weight: 700; color: var(--ink-2); }
.lesson-head .chip.g { background: var(--gc); color: #fff; box-shadow: none; }
.lesson-head h1 { font-size: clamp(34px, 4.6cqw, 56px); font-weight: 800; letter-spacing: -.02em; }
.lesson-head .local-name { font-size: 15px; margin-top: 4px; }
.lesson-head .key { font-family: var(--font-head); font-size: clamp(16px, 1.6cqw, 20px); font-weight: 600; color: var(--ink-2); line-height: 1.4; max-width: 620px; justify-self: end; padding-bottom: 6px; border-left: 4px solid var(--gc); padding-left: 16px; }

.cinema { position: relative; margin: 0 auto; width: min(100%, calc((100vh - 250px) * 16 / 9)); min-width: min(100%, 640px); padding: 10px; border-radius: 34px;
  background: linear-gradient(135deg, var(--gc), color-mix(in srgb, var(--gc) 55%, #0AC7FF)); box-shadow: 0 30px 70px -20px color-mix(in srgb, var(--gc) 60%, transparent), 0 8px 24px rgba(22, 21, 28, .12); }
.cinema-screen { position: relative; aspect-ratio: 16 / 9; border-radius: 26px; overflow: hidden; background: #0B0A12; }
.cinema-screen video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #000; display: block; }
.cinema.pending .cinema-screen { background: radial-gradient(circle at 30% 20%, rgba(255,255,255,.14), transparent 50%), #1B1830; display: grid; place-items: center; }
.pending-in { text-align: center; color: #fff; padding: 24px; max-width: 460px; margin: auto; position: relative; top: 50%; transform: translateY(-50%); }
.cinema.pending .pending-in { top: 0; transform: none; }
.pending-in .play { width: 76px; height: 76px; border-radius: 50%; margin: 0 auto 16px; display: grid; place-items: center; background: rgba(255,255,255,.12); color: #fff; }
.pending-in .play svg { width: 30px; height: 30px; }
.pending-in h3 { font-size: clamp(19px, 2.2cqw, 26px); font-weight: 800; margin-bottom: 8px; }
.pending-in p { opacity: .8; font-size: 15px; }
.lesson-below { margin-top: 22px; }
.lesson-below .tl-card { display: grid; grid-template-columns: minmax(260px, 440px) 1fr; gap: 6px 28px; align-items: center; }
.lesson-below .tl-card .cap { grid-column: 1 / -1; }
.lab-tip { color: var(--ink-2); margin: 0 0 14px; max-width: 780px; }
.lesson-below .tl-card { padding: 16px 18px; }
.lesson-below .tl-card .cap { font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); }
.lesson-below .tl { width: 100%; max-width: 460px; height: auto; display: block; margin: 0 auto; }
.lesson-below .intro { color: var(--ink-2); font-size: 15px; margin-top: 6px; }
.stepnav { margin-top: 30px; }

@container tws (max-width: 1020px) {
  .lesson-head { grid-template-columns: 1fr; }
  .lesson-head .key { justify-self: start; }
  .lesson-below .tl-card { grid-template-columns: 1fr; }
}
@container tws (max-width: 640px) {
  .cinema { width: auto; min-width: 0; margin: 0 -10px; padding: 6px; border-radius: 22px; }
  .cinema-screen { border-radius: 17px; }
  .langs button { padding: 6px 8px; font-size: 12px; }
  .topbar .map-btn, .topbar .nav-arrow { display: none; }
  .topbar .switcher .btn { padding: 7px 10px; }
  .logo { font-size: 19px; }
}
.cinema { background-color: var(--gc); }

.pr-lesson { padding: 22px; border-top: 5px solid var(--gc); }
.pr-lesson .pl-main { display: grid; grid-template-columns: 170px 1fr auto; gap: 22px; align-items: center; }
.pr-lesson .pl-tl { background: var(--gs); border-radius: 16px; padding: 6px 8px; }
.pr-lesson .pl-tl .tl { width: 100%; height: auto; display: block; }
.pr-lesson h3 { font-size: 22px; font-weight: 800; }
.pr-lesson .pl-covers { color: var(--ink-2); font-size: 15px; margin-top: 4px; }
.pr-lesson .pl-meta { color: var(--ink-3); font-size: 14px; font-weight: 600; margin-top: 6px; }
.best { color: #0E7A3A; }
.pr-lesson .pl-start { padding: 14px 24px; font-size: 16px; }
.pr-lesson .pl-more { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 14px; }
.pr-lesson .pl-more > span { color: var(--ink-3); font-weight: 600; margin-right: 2px; }
.pl-chip { text-decoration: none; color: var(--ink); background: var(--bg); border-radius: 999px; padding: 6px 12px; font-weight: 600; box-shadow: inset 0 0 0 1.5px var(--line); }
.pl-chip:hover { box-shadow: inset 0 0 0 1.5px var(--gc); }
.pl-all { margin-left: auto; color: var(--brand); font-weight: 700; text-decoration: none; }
.pl-all:hover { text-decoration: underline; }

.pr-hero { margin-top: 22px; background: var(--card); border-radius: 32px; padding: 34px 36px; box-shadow: var(--shadow); }
.pr-hero h1 { font-size: clamp(30px, 4.4cqw, 48px); font-weight: 800; letter-spacing: -.02em; margin: 6px 0 10px; }
.pr-hero > p { color: var(--ink-2); max-width: 680px; font-size: 17px; }
.pr-steps { list-style: none; padding: 0; margin: 24px 0 22px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; counter-reset: s; }
.pr-steps a { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 16px; background: var(--bg); text-decoration: none; color: var(--ink); height: 100%; transition: background .15s; }
.pr-steps a:hover { background: var(--brand-soft); }
.pr-steps i { font-style: normal; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--card); font-weight: 800; font-size: 13px; box-shadow: inset 0 0 0 1.5px var(--line-strong); margin-bottom: 4px; }
.pr-steps span { font-weight: 700; font-size: 14.5px; line-height: 1.25; }
.pr-steps small { color: var(--ink-3); font-weight: 600; font-size: 12.5px; }
.pr-steps li.part i { background: var(--yellow); color: #fff; box-shadow: none; }
.pr-steps li.full i { background: var(--ok); color: #fff; box-shadow: none; }
.pr-stage-sec { margin-top: 44px; scroll-margin-top: 90px; }
.pr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.pr-grid.twelve { grid-template-columns: repeat(4, 1fr); }
.pr-setcard { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; border-radius: 20px; background: var(--card); box-shadow: var(--shadow); text-decoration: none; color: var(--ink); border-top: 4px solid var(--gc); transition: transform .15s, box-shadow .15s; }
.pr-setcard:hover { transform: translateY(-2px); box-shadow: var(--shadow-lift); }
.pr-setcard b { font-family: var(--font-head); font-size: 17px; font-weight: 800; line-height: 1.2; }
.pr-setcard small { color: var(--ink-2); font-size: 13.5px; line-height: 1.35; }
.pr-setcard .pr-tl .tl { width: 100%; height: auto; max-height: 58px; display: block; }
.pr-setcard .pr-meta { color: var(--ink-3); font-size: 13px; font-weight: 600; margin-top: auto; padding-top: 6px; }
.pr-setcard.cur b { padding-right: 76px; }
.pr-setcard.cur { box-shadow: 0 0 0 2.5px var(--brand), var(--shadow-lift); }
.pr-setcard .pr-next { position: absolute; top: 12px; right: 12px; background: var(--brand); color: #fff; font-size: 12px; font-weight: 700; border-radius: 999px; padding: 3px 9px; }
.pr-sources { margin-top: 48px; padding: 18px 22px; }
.pr-sources summary { cursor: pointer; font-weight: 700; }
.pr-sources p { color: var(--ink-2); font-size: 14.5px; margin: 10px 0; }
.pr-sources ul { margin: 0; padding-left: 18px; display: grid; gap: 8px; font-size: 14px; }
.pr-sources li span { display: block; color: var(--ink-3); font-size: 13px; }
.pr-sources a { color: var(--brand); font-weight: 600; }

.pr-shell { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; background: var(--bg); }
.pr-top { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 14px; padding: 12px 20px; background: rgba(245, 245, 249, .92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
.pr-x { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--ink-2); flex: none; text-decoration: none; }
.pr-x:hover { background: var(--line); color: var(--ink); }
.pr-x svg { width: 22px; height: 22px; }
.pr-top-mid { flex: 1; min-width: 0; max-width: 760px; margin: 0 auto; }
.pr-set { font-weight: 700; font-size: 14px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px; }
.pr-bar { height: 8px; border-radius: 99px; background: var(--line); overflow: hidden; }
.pr-bar i { display: block; height: 100%; width: 0; background: var(--gc); border-radius: inherit; transition: width .35s ease; }
.pr-count { font-weight: 700; font-size: 14px; color: var(--ink-3); min-width: 48px; text-align: right; font-variant-numeric: tabular-nums; }
.pr-stage { flex: 1; width: 100%; max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
.pr-card { background: var(--card); border-radius: 28px; box-shadow: var(--shadow); padding: 30px 32px; }
.pr-card.in { animation: prIn .28s ease-out both; }
@keyframes prIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.pr-instr { font-size: 13.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-3); margin-bottom: 14px; }
.pr-instr.sub { margin: 22px 0 0; }
.pr-q { font-family: var(--font-head); font-size: clamp(21px, 2.8cqw, 27px); font-weight: 700; line-height: 1.5; color: var(--ink); }
.pr-q mark { background: var(--gs); color: var(--gc); border-radius: 8px; padding: 1px 6px; font-weight: 800; }
.pr-src { background: var(--bg); border-radius: 16px; padding: 14px 18px; font-size: clamp(19px, 2.4cqw, 23px); }
.pr-blank { display: inline-block; min-width: 82px; border-bottom: 3px solid var(--line-strong); margin: 0 4px; text-align: center; line-height: 1.25; transition: color .2s, border-color .2s; }
.pr-blank.wide { min-width: 120px; }
.pr-blank.ok { color: #0E7A3A; border-color: var(--ok); }
.pr-blank.fix { color: var(--ink); border-color: var(--ok); background: var(--ok-soft); border-radius: 6px 6px 0 0; padding: 0 4px; }
.pr-hint { color: var(--ink-3); font-weight: 600; font-size: .78em; white-space: nowrap; }
.pr-opts { display: grid; gap: 10px; margin-top: 22px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.pr-opts.col, .pr-err2 .pr-opts { grid-template-columns: 1fr; }
.pr-opts.grid2 { grid-template-columns: 1fr 1fr; }
.pr-opts.tls { grid-template-columns: repeat(3, 1fr); }
.pr-opt { display: flex; align-items: center; gap: 12px; text-align: left; border: 0; background: var(--card); border-radius: 16px; padding: 14px 16px; font-weight: 600; font-size: 17px; box-shadow: inset 0 0 0 2px var(--line); transition: box-shadow .15s, background .15s, transform .1s; color: var(--ink); }
.pr-opt:hover:not([disabled]) { box-shadow: inset 0 0 0 2px var(--gc); }
.pr-opt:active:not([disabled]) { transform: scale(.985); }
.pr-opt kbd { flex: none; width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; font: 700 12px var(--font-body); color: var(--ink-3); box-shadow: inset 0 0 0 1.5px var(--line-strong); }
.pr-opt[disabled] { cursor: default; }
.pr-opt.ok { background: var(--ok-soft); box-shadow: inset 0 0 0 2px var(--ok); }
.pr-opt.ok kbd { background: var(--ok); color: #fff; box-shadow: none; }
.pr-opt.bad { background: var(--bad-soft); box-shadow: inset 0 0 0 2px var(--bad); }
.pr-opt.bad kbd { background: var(--bad); color: #fff; box-shadow: none; }
.pr-opt[disabled]:not(.ok):not(.bad) { opacity: .55; }
.pr-opts.tls .pr-opt { flex-direction: column; align-items: stretch; padding: 10px 10px 12px; position: relative; }
.pr-opts.tls kbd { position: absolute; top: 8px; left: 8px; }
.pr-opts.tls .tlw .tl { width: 100%; height: auto; display: block; }
.pr-opts.tls .tln { display: block; text-align: center; font-size: 14px; font-weight: 700; visibility: hidden; }
.pr-opts.tls .pr-opt[disabled] .tln { visibility: visible; }
.pr-type { display: flex; gap: 10px; margin-top: 22px; align-items: stretch; flex-wrap: wrap; }
.pr-type.col .pr-input { flex-basis: 100%; }
.pr-type .pr-check { margin-left: auto; }
.pr-input { flex: 1; min-width: 0; border: 2px solid var(--line); border-radius: 16px; padding: 13px 16px; font-size: 19px; background: var(--card); transition: border-color .15s, background .15s; }
.pr-input:focus { outline: none; border-color: var(--gc); box-shadow: 0 0 0 4px var(--gs); }
.pr-input.ok { border-color: var(--ok); background: var(--ok-soft); }
.pr-input.bad { border-color: var(--bad); background: var(--bad-soft); text-decoration: line-through; text-decoration-color: rgba(229, 72, 77, .5); }
.pr-check { padding: 12px 26px; font-size: 16px; }

.pr-build { display: flex; align-items: flex-end; gap: 6px; }
.pr-slot { flex: 1; min-height: 64px; border-radius: 18px; border: 2px dashed var(--line-strong); padding: 9px; display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start; }
.pr-slot.empty::before { content: attr(data-ph); color: var(--ink-3); font-size: 15px; align-self: center; padding: 0 6px; }
.pr-slot.ok { border: 2px solid var(--ok); background: var(--ok-soft); }
.pr-slot.bad { border: 2px solid var(--bad); background: var(--bad-soft); animation: shake .35s; }
@keyframes shake { 0%, 100% { transform: none; } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
.pr-punct { font-family: var(--font-head); font-weight: 800; font-size: 26px; color: var(--ink-3); padding-bottom: 12px; }
.pr-bank { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; min-height: 48px; }
.pr-tile { border: 0; border-radius: 13px; padding: 10px 15px; font-weight: 700; font-size: 17px; background: var(--card); color: var(--ink); box-shadow: inset 0 0 0 2px var(--line), 0 3px 0 var(--line); transition: transform .1s, box-shadow .15s; }
.pr-tile:hover { box-shadow: inset 0 0 0 2px var(--gc), 0 3px 0 var(--gs); }
.pr-tile:active { transform: translateY(2px); }
.pr-tile.in { background: var(--gs); box-shadow: inset 0 0 0 2px transparent; }
.pr-tile.used { visibility: hidden; }

.pr-err-q { line-height: 1.9; }
.pr-tok { border: 0; background: transparent; font: inherit; color: inherit; padding: 1px 4px; margin: 0 -2px; border-radius: 8px; transition: background .15s; }
.pr-tok:hover:not([disabled]) { background: var(--gs); }
.pr-tok[disabled] { cursor: default; }
.pr-tok.miss { background: var(--line); text-decoration: line-through; }
.pr-tok.err { background: var(--bad-soft); color: #C42A30; box-shadow: inset 0 -3px 0 var(--bad); }
.pr-tok.fixed, .pr-tok.fix { background: var(--ok-soft); color: #0E7A3A; box-shadow: inset 0 -3px 0 var(--ok); }

.pr-text { background: var(--bg); border-radius: 20px; padding: 18px 20px; font-size: 18px; line-height: 2.5; }
.pr-text-h { font-family: var(--font-head); font-weight: 800; font-size: 15px; line-height: 1.3; color: var(--gc); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
.pr-tgap { display: inline-flex; flex-direction: column; vertical-align: top; margin: 0 3px; line-height: 1.2; position: relative; top: 4px; }
.pr-input.sm { flex: none; font-size: 17px; padding: 5px 9px; border-radius: 10px; width: auto; min-width: 7em; max-width: 100%; }
.pr-tgap small { font-size: 11.5px; color: var(--ink-3); text-align: center; margin-top: 2px; }
.pr-tfix { font-size: 14px; color: #0E7A3A; text-align: center; margin-top: 2px; }
.pr-tgap .pr-input.bad + small { display: none; }

.pr-fb-slot:empty { display: none; }
.pr-fb { margin-top: 22px; border-radius: 20px; padding: 16px 18px; display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: center; animation: prIn .22s ease-out both; }
.pr-fb.ok { background: var(--ok-soft); }
.pr-fb.bad { background: var(--bad-soft); }
.pr-fb-h { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pr-fb-h .ic { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 15px; flex: none; }
.pr-fb.ok .ic { background: var(--ok); }
.pr-fb.bad .ic { background: var(--bad); }
.pr-fb-h b { font-family: var(--font-head); font-size: 19px; }
.pr-fb.ok .pr-fb-h b { color: #0E7A3A; }
.pr-fb.bad .pr-fb-h b { color: #C42A30; }
.pr-fb-ans { margin-top: 8px; font-size: 16px; color: var(--ink-2); }
.pr-fb-ans b { color: var(--ink); }
.pr-fb-why { margin-top: 6px; font-size: 15.5px; color: var(--ink-2); }
.pr-fb-list { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.pr-fb-list li { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 15px; }
.pr-fb-tl { width: 150px; background: rgba(255, 255, 255, .7); border-radius: 14px; padding: 4px 6px; }
.pr-fb-tl .tl { width: 100%; height: auto; display: block; }
.pr-rule { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin-top: 10px; font-size: 13.5px; text-decoration: none; color: var(--ink-2); background: rgba(255, 255, 255, .75); border-radius: 12px; padding: 6px 10px; box-shadow: inset 3px 0 0 var(--gc); }
.pr-fb-list .pr-rule { margin-top: 0; }
.pr-rule .tn { font-weight: 800; color: var(--gc); }
.pr-rule .go { color: var(--brand); font-weight: 700; }
.pr-rule:hover .go { text-decoration: underline; }
.pr-listen { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; border: 0; background: rgba(255, 255, 255, .8); border-radius: 999px; padding: 6px 12px; font-weight: 600; font-size: 14px; color: var(--ink-2); }
.pr-listen svg { width: 18px; height: 18px; }
.pr-listen:hover, .pr-listen.on { color: var(--brand); box-shadow: inset 0 0 0 1.5px var(--brand); }
.pr-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.pr-actions:not(:empty) { margin-top: 18px; }
.pr-actions.center { justify-content: center; }
.pr-go { padding: 13px 30px; font-size: 16px; }

.pr-results { text-align: center; padding: 8px 0; }
.pr-ring { --p: 0; width: 132px; height: 132px; border-radius: 50%; margin: 0 auto 16px; display: grid; place-items: center; background: conic-gradient(var(--gc) calc(var(--p) * 1%), var(--line) 0); }
.pr-ring span { width: 106px; height: 106px; border-radius: 50%; background: var(--card); display: flex; align-items: center; justify-content: center; font-family: var(--font-head); font-weight: 800; font-size: 34px; }
.pr-ring small { font-size: 18px; color: var(--ink-3); }
.pr-results h2 { font-size: 28px; font-weight: 800; }
.pr-results > p { color: var(--ink-2); margin-top: 4px; font-size: 17px; }
.pr-muted { color: var(--ink-3) !important; }
.pr-rev-h { text-align: left; font-size: 17px; font-weight: 800; margin: 26px 0 10px; }
.pr-rev { list-style: none; margin: 0; padding: 0; text-align: left; display: grid; gap: 8px; }
.pr-rev li { background: var(--bg); border-radius: 14px; padding: 12px 14px; }
.pr-rev .s { display: block; font-weight: 600; }
.pr-rev .pr-rule { margin-top: 6px; background: var(--card); }
.pr-results .pr-actions { margin-top: 26px; }

.badge-prac { font-size: 11.5px; font-weight: 700; color: #0E7A3A; background: var(--ok-soft); border-radius: 999px; padding: 2px 9px; }
.hub-practice { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.hub-practice a { display: flex; flex-direction: column; gap: 4px; padding: 18px; border-radius: 20px; background: var(--card); box-shadow: var(--shadow); text-decoration: none; color: var(--ink); transition: transform .15s; }
.hub-practice a:hover { transform: translateY(-2px); }
.hub-practice i { font-style: normal; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand); font-weight: 800; font-size: 14px; margin-bottom: 4px; }
.hub-practice b { font-family: var(--font-head); font-size: 17px; font-weight: 800; }
.hub-practice span { color: var(--ink-2); font-size: 13.5px; line-height: 1.4; }

@container tws (max-width: 1020px) {
  .pr-grid.twelve { grid-template-columns: repeat(3, 1fr); }
  .hub-practice { grid-template-columns: repeat(3, 1fr); }
}
@container tws (max-width: 760px) {
  .pr-lesson .pl-main { grid-template-columns: 1fr; gap: 14px; }
  .pr-lesson .pl-tl { max-width: 220px; }
  .pr-lesson .pl-start { justify-self: start; }
  .pl-all { margin-left: 0; }
  .pr-steps { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
  .pr-steps a { padding: 10px 8px; }
  .pr-steps span { font-size: 12.5px; }
  .pr-grid.twelve { grid-template-columns: repeat(2, 1fr); }
  .hub-practice { grid-template-columns: 1fr 1fr; }
  .pr-hero { padding: 26px 22px; border-radius: 26px; }
}
@container tws (max-width: 640px) {
  .pr-top { padding: 10px 12px; gap: 8px; }
  .pr-top .pr-langs { display: none; }
  .pr-stage { padding: 16px 12px 48px; }
  .pr-card { padding: 22px 18px; border-radius: 22px; }
  .pr-opts.grid2, .pr-opts.tls { grid-template-columns: 1fr; }
  .pr-opts.tls .pr-opt { flex-direction: row; align-items: center; }
  .pr-opts.tls .tlw { flex: 1; }
  .pr-opts.tls kbd { position: static; }
  .pr-opts.tls .tln { width: 0; overflow: hidden; }
  .pr-opts.tls .pr-opt[disabled] .tln { width: auto; }
  .pr-fb { grid-template-columns: 1fr; }
  .pr-fb-tl { width: 140px; }
  .pr-type .pr-check { flex: 1; }
  .pr-text { padding: 14px; font-size: 17px; }
  .pr-steps small { display: none; }
  .pr-grid.twelve { grid-template-columns: 1fr 1fr; }
  .pr-setcard { padding: 14px; }
  .pr-setcard b { font-size: 15.5px; }
  .hub-practice a:last-child { grid-column: 1 / -1; }
}
@media (prefers-reduced-motion: reduce) {
  .pr-card.in, .pr-fb, .pr-slot.bad { animation: none; }
  .pr-bar i { transition: none; }
}
.tws { container: tws / inline-size; overflow-wrap: break-word; }
.tws[lang="kk"] { --font-head: 'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; --font-body: 'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
@container tws (max-width: 400px) { .tile h3 { font-size: 13px; letter-spacing: -.01em; } }
:host([data-theme="dark"]) {
    --brand: var(--dk-acc);
    --brand-2: var(--dk-acc);
    --brand-soft: var(--dk-acc-tint);
    --cyan: var(--dk-blue);
    --blue: var(--dk-blue);
    --green: var(--dk-green);
    --orange: var(--dk-orange);
    --orange-2: var(--dk-orange);
    --yellow: var(--dk-yellow);
    --red: var(--dk-red);
    --g-past: var(--dk-orange);
    --g-past-soft: var(--dk-orange-tint);
    --g-present: var(--dk-acc);
    --g-present-soft: var(--dk-acc-tint);
    --g-future: var(--dk-blue);
    --g-future-soft: var(--dk-blue-tint);
    --k-s: var(--dk-acc);
    --k-a: var(--dk-blue);
    --k-n: var(--dk-red);
    --k-v: var(--dk-green);
    --k-o: var(--dk-text-2);
    --k-t: var(--dk-yellow);
    --bg: var(--dk-page);
    --card: var(--dk-card);
    --ink: var(--dk-text);
    --ink-2: var(--dk-text-2);
    --ink-3: var(--dk-muted);
    --line: var(--dk-line);
    --line-strong: var(--dk-line);
    --ok: var(--dk-green);
    --ok-soft: var(--dk-green-tint);
    --bad: var(--dk-red);
    --bad-soft: var(--dk-red-tint);
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 8px 24px color-mix(in oklab, var(--dk-acc) 7%, transparent);
    --shadow-lift: 0 2px 4px rgba(0, 0, 0, 0.1), 0 16px 40px color-mix(in oklab, var(--dk-acc) 14%, transparent)
}
:host([data-theme="dark"]) .tws {
    background: var(--bg);
    color: var(--ink)
}
:host([data-theme="dark"]) button, :host([data-theme="dark"]) input {
    color: inherit
}
:host([data-theme="dark"]) .en {
    color: var(--ink)
}
:host([data-theme="dark"]) em.en {
    background: linear-gradient(transparent 58%, color-mix(in oklab, var(--dk-acc) 16%, transparent) 0)
}
:host([data-theme="dark"]) :focus-visible {
    outline: 3px solid color-mix(in oklab, var(--dk-acc) 45%, transparent)
}
:host([data-theme="dark"]) .topbar {
    background: color-mix(in oklab, var(--dk-page) 86%, transparent);
    border-bottom: 1px solid transparent
}
:host([data-theme="dark"]) .topbar.scrolled {
    border-color: var(--line)
}
:host([data-theme="dark"]) .logo {
    color: var(--ink)
}
:host([data-theme="dark"]) .logo b {
    color: var(--brand)
}
:host([data-theme="dark"]) .logo small {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .btn {
    border: 0;
    background: var(--card);
    color: var(--ink);
    box-shadow: inset 0 0 0 1.5px var(--line)
}
:host([data-theme="dark"]) .btn:hover {
    box-shadow: inset 0 0 0 1.5px var(--line-strong)
}
:host([data-theme="dark"]) .btn.primary {
    background: var(--brand);
    color: var(--dk-on-acc);
    box-shadow: 0 6px 16px color-mix(in oklab, var(--dk-acc) 32%, transparent)
}
:host([data-theme="dark"]) .btn.primary:hover {
    background: var(--brand-2)
}
:host([data-theme="dark"]) .btn.ghost {
    background: transparent;
    box-shadow: none
}
:host([data-theme="dark"]) .btn.ghost:hover {
    background: color-mix(in oklab, var(--dk-acc) 8%, transparent)
}
:host([data-theme="dark"]) .switcher-pop {
    background: var(--card);
    box-shadow: var(--shadow-lift)
}
:host([data-theme="dark"]) .mini-map .h {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .mini-map .rl {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .mini-map a {
    color: var(--ink);
    background: var(--bg)
}
:host([data-theme="dark"]) .mini-map a:hover {
    background: var(--brand-soft)
}
:host([data-theme="dark"]) .mini-map a.cur {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .mini-map a[data-g="past"].cur {
    background: var(--g-past)
}
:host([data-theme="dark"]) .mini-map a[data-g="future"].cur {
    background: var(--g-future)
}
:host([data-theme="dark"]) .hub-hero {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .hub-hero::before {
    background: radial-gradient(600px 300px at 0% 100%, color-mix(in oklab, var(--dk-orange) 55%, transparent), transparent 60%),
              radial-gradient(520px 320px at 100% 0%, color-mix(in oklab, var(--dk-blue) 60%, transparent), transparent 60%),
              radial-gradient(400px 260px at 60% 120%, color-mix(in oklab, var(--dk-green) 25%, transparent), transparent 60%)
}
:host([data-theme="dark"]) .hub-hero .eyebrow {
    background: rgba(255, 255, 255, .16)
}
:host([data-theme="dark"]) .hub-hero h1 span {
    color: #FFF805
}
:host([data-theme="dark"]) .hero-actions .btn {
    background: var(--dk-card);
    color: var(--brand);
    box-shadow: none
}
:host([data-theme="dark"]) .hero-actions .btn.alt {
    background: rgba(255, 255, 255, .16);
    color: #fff
}
:host([data-theme="dark"]) .section-title p {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .kicker {
    color: var(--brand)
}
:host([data-theme="dark"]) .time-axis .zone {
    color: #fff
}
:host([data-theme="dark"]) .zone.past {
    background: var(--g-past)
}
:host([data-theme="dark"]) .zone.present {
    background: var(--g-present)
}
:host([data-theme="dark"]) .zone.future {
    background: var(--g-future)
}
:host([data-theme="dark"]) .map .aspect-label span {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .tile {
    background: var(--card);
    box-shadow: var(--shadow);
    color: var(--ink)
}
:host([data-theme="dark"]) .tile:hover {
    box-shadow: var(--shadow-lift)
}
:host([data-theme="dark"]) .tile .num {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .tile .tg {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .tile::before {
    background: var(--gc)
}
:host([data-theme="dark"]) .tile .badge-video {
    color: var(--gc);
    background: var(--gs)
}
:host([data-theme="dark"]) .tile.visited h3::after {
    color: var(--ok)
}
:host([data-theme="dark"]) .how .card p {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .how .step-n {
    background: var(--brand-soft);
    color: var(--brand)
}
:host([data-theme="dark"]) .card {
    background: var(--card);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .t-hero {
    background: var(--gc);
    color: #fff
}
:host([data-theme="dark"]) .t-hero::before {
    background: radial-gradient(500px 280px at 100% 0%, rgba(255, 255, 255, .22), transparent 60%), radial-gradient(380px 240px at 0% 110%, rgba(255, 255, 255, 0.14), transparent 60%)
}
:host([data-theme="dark"]) .t-hero .chip {
    background: rgba(255, 255, 255, .18)
}
:host([data-theme="dark"]) .t-hero .tl-card {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28)
}
:host([data-theme="dark"]) .t-hero .tl-card .cap {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .stepnav {
    background: var(--card);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .stepnav a {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .stepnav a i {
    background: var(--bg);
    color: var(--ink-3)
}
:host([data-theme="dark"]) .stepnav a:hover {
    background: var(--bg)
}
:host([data-theme="dark"]) .stepnav a.on {
    background: var(--gc, var(--brand));
    color: #fff
}
:host([data-theme="dark"]) .stepnav a.on i {
    background: rgba(255, 255, 255, .25);
    color: #fff
}
:host([data-theme="dark"]) .block-head .n {
    color: #fff;
    background: var(--gc, var(--brand))
}
:host([data-theme="dark"]) .block-head p {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .video-wrap {
    background: #0E0D14;
    box-shadow: var(--shadow-lift)
}
:host([data-theme="dark"]) .video-wrap video {
    background: #000
}
:host([data-theme="dark"]) .video-meta {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .video-pending {
    background: var(--card);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .video-pending::before {
    background: repeating-linear-gradient(-45deg, transparent 0 22px, color-mix(in oklab, var(--dk-acc) 4%, transparent) 22px 44px)
}
:host([data-theme="dark"]) .video-pending .play {
    background: var(--brand-soft);
    color: var(--brand)
}
:host([data-theme="dark"]) .video-pending p {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .video-error {
    color: #fff
}
:host([data-theme="dark"]) .usage .ic {
    background: var(--gs);
    color: var(--gc)
}
:host([data-theme="dark"]) .usage p {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .ex {
    border-left: 3px solid var(--gc)
}
:host([data-theme="dark"]) .ex .r {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .forms-tabs {
    background: var(--card);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .forms-tabs button {
    border: 0;
    background: transparent;
    color: var(--ink-2)
}
:host([data-theme="dark"]) .forms-tabs button .sg {
    background: var(--bg)
}
:host([data-theme="dark"]) .forms-tabs button.on {
    background: var(--dk-ink-bg);
    color: #fff
}
:host([data-theme="dark"]) .forms-tabs button.on .sg {
    background: rgba(255, 255, 255, .18)
}
:host([data-theme="dark"]) .chipk {
    color: #fff
}
:host([data-theme="dark"]) .chipk.s {
    background: var(--k-s)
}
:host([data-theme="dark"]) .chipk.a {
    background: var(--k-a)
}
:host([data-theme="dark"]) .chipk.n {
    background: var(--k-n)
}
:host([data-theme="dark"]) .chipk.v {
    background: var(--k-v)
}
:host([data-theme="dark"]) .chipk.o {
    background: var(--dk-chip);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .chipk.t {
    background: var(--dk-yellow-tint);
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .plus {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .formula-card .note {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .formula-card .short span {
    background: var(--bg)
}
:host([data-theme="dark"]) .legend {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .extra li {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .extra li::before {
    background: var(--gc)
}
:host([data-theme="dark"]) .signal-words span {
    background: var(--dk-yellow-tint);
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .signals .note {
    color: var(--ink-2);
    background: var(--bg)
}
:host([data-theme="dark"]) .mistake .w {
    color: var(--bad);
    text-decoration-color: color-mix(in oklab, var(--dk-red) 55%, transparent)
}
:host([data-theme="dark"]) .mistake .c {
    color: var(--ok)
}
:host([data-theme="dark"]) .mistake .w::before, :host([data-theme="dark"]) .mistake .c::before {
    color: #fff
}
:host([data-theme="dark"]) .mistake .w::before {
    background: var(--bad)
}
:host([data-theme="dark"]) .mistake .c::before {
    background: var(--ok)
}
:host([data-theme="dark"]) .mistake p {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .compare h4 a {
    color: inherit
}
:host([data-theme="dark"]) .compare > p {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .cmp-col {
    background: var(--bg)
}
:host([data-theme="dark"]) .cmp-col .r {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .sources {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .lab-row .lab-lbl {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .pill {
    border: 0;
    background: var(--bg)
}
:host([data-theme="dark"]) .pill:hover {
    background: var(--brand-soft)
}
:host([data-theme="dark"]) .pill.on {
    background: var(--dk-ink-bg);
    color: #fff
}
:host([data-theme="dark"]) .lab-out {
    background: var(--bg)
}
:host([data-theme="dark"]) .k-s {
    color: var(--k-s);
    background: color-mix(in oklab, var(--dk-acc) 10%, transparent)
}
:host([data-theme="dark"]) .k-a {
    color: var(--k-a);
    background: color-mix(in oklab, var(--dk-blue) 10%, transparent)
}
:host([data-theme="dark"]) .k-an {
    color: var(--k-a);
    background: linear-gradient(90deg, color-mix(in oklab, var(--dk-blue) 10%, transparent), color-mix(in oklab, var(--dk-red) 12%, transparent))
}
:host([data-theme="dark"]) .k-n {
    color: var(--k-n);
    background: color-mix(in oklab, var(--dk-red) 10%, transparent)
}
:host([data-theme="dark"]) .k-v {
    color: var(--k-v);
    background: color-mix(in oklab, var(--dk-green) 10%, transparent)
}
:host([data-theme="dark"]) .k-o {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .k-t {
    color: var(--k-t);
    background: color-mix(in oklab, var(--dk-yellow) 10%, transparent)
}
:host([data-theme="dark"]) .lab-contr {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lab-contr b {
    color: var(--ink)
}
:host([data-theme="dark"]) .machine-grid button {
    border: 0;
    background: var(--bg)
}
:host([data-theme="dark"]) .machine-grid button:hover {
    background: var(--brand-soft)
}
:host([data-theme="dark"]) .machine-grid button small {
    color: var(--gc)
}
:host([data-theme="dark"]) .machine-grid button.cur {
    background: var(--dk-ink-bg);
    color: #fff
}
:host([data-theme="dark"]) .machine-grid button.cur small {
    color: #fff
}
:host([data-theme="dark"]) .review li::before {
    background: var(--gs);
    color: var(--gc)
}
:host([data-theme="dark"]) .review .recap {
    background: var(--bg)
}
:host([data-theme="dark"]) .review .recap .lbl {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .next-tense a {
    background: var(--card);
    box-shadow: var(--shadow);
    color: var(--ink)
}
:host([data-theme="dark"]) .next-tense a small {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .tl-t {
    fill: var(--ink-3)
}
:host([data-theme="dark"]) .tl-strong {
    fill: var(--ink)
}
:host([data-theme="dark"]) .tl-now {
    fill: #fff
}
:host([data-theme="dark"]) .footer-note {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .toast {
    background: var(--dk-ink-bg);
    color: #fff
}
:host([data-theme="dark"]) .signals .note svg {
    color: var(--yellow)
}
:host([data-theme="dark"]) .langs {
    background: var(--card);
    box-shadow: inset 0 0 0 1.5px var(--line)
}
:host([data-theme="dark"]) .langs button {
    border: 0;
    background: transparent;
    color: var(--ink-3)
}
:host([data-theme="dark"]) .langs button:hover {
    color: var(--ink)
}
:host([data-theme="dark"]) .langs button.on {
    background: var(--dk-ink-bg);
    color: #fff
}
:host([data-theme="dark"]) .langs button[data-lang="kz"].on {
    background: var(--dk-blue)
}
:host([data-theme="dark"]) .langs button[data-lang="ru"].on {
    background: var(--brand)
}
:host([data-theme="dark"]) .xlat {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .lesson-head .chip {
    background: var(--card);
    box-shadow: inset 0 0 0 1.5px var(--line);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lesson-head .chip.g {
    background: var(--gc);
    color: #fff;
    box-shadow: none
}
:host([data-theme="dark"]) .lesson-head .key {
    color: var(--ink-2);
    border-left: 4px solid var(--gc)
}
:host([data-theme="dark"]) .cinema {
    background: linear-gradient(135deg, var(--gc), color-mix(in srgb, var(--gc) 55%, var(--dk-blue)));
    box-shadow: 0 30px 70px -20px color-mix(in srgb, var(--gc) 60%, transparent), 0 8px 24px rgba(0, 0, 0, 0.24)
}
:host([data-theme="dark"]) .cinema-screen {
    background: #0B0A12
}
:host([data-theme="dark"]) .cinema-screen video {
    background: #000
}
:host([data-theme="dark"]) .cinema.pending .cinema-screen {
    background: radial-gradient(circle at 30% 20%, rgba(255,255,255,.14), transparent 50%), var(--dk-acc-deep)
}
:host([data-theme="dark"]) .pending-in {
    color: #fff
}
:host([data-theme="dark"]) .pending-in .play {
    background: rgba(255,255,255,.12);
    color: #fff
}
:host([data-theme="dark"]) .lab-tip {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lesson-below .tl-card .cap {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .lesson-below .intro {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .cinema {
    background-color: var(--gc)
}
:host([data-theme="dark"]) .pr-lesson {
    border-top: 5px solid var(--gc)
}
:host([data-theme="dark"]) .pr-lesson .pl-tl {
    background: var(--gs)
}
:host([data-theme="dark"]) .pr-lesson .pl-covers {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pr-lesson .pl-meta {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .best {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .pr-lesson .pl-more {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .pr-lesson .pl-more > span {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .pl-chip {
    color: var(--ink);
    background: var(--bg);
    box-shadow: inset 0 0 0 1.5px var(--line)
}
:host([data-theme="dark"]) .pl-chip:hover {
    box-shadow: inset 0 0 0 1.5px var(--gc)
}
:host([data-theme="dark"]) .pl-all {
    color: var(--brand)
}
:host([data-theme="dark"]) .pr-hero {
    background: var(--card);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .pr-hero > p {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pr-steps a {
    background: var(--bg);
    color: var(--ink)
}
:host([data-theme="dark"]) .pr-steps a:hover {
    background: var(--brand-soft)
}
:host([data-theme="dark"]) .pr-steps i {
    background: var(--card);
    box-shadow: inset 0 0 0 1.5px var(--line-strong)
}
:host([data-theme="dark"]) .pr-steps small {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .pr-steps li.part i {
    background: var(--yellow);
    color: var(--dk-on-bright);
    box-shadow: none
}
:host([data-theme="dark"]) .pr-steps li.full i {
    background: var(--ok);
    color: var(--dk-on-bright);
    box-shadow: none
}
:host([data-theme="dark"]) .pr-setcard {
    background: var(--card);
    box-shadow: var(--shadow);
    color: var(--ink);
    border-top: 4px solid var(--gc)
}
:host([data-theme="dark"]) .pr-setcard:hover {
    box-shadow: var(--shadow-lift)
}
:host([data-theme="dark"]) .pr-setcard small {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pr-setcard .pr-meta {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .pr-setcard.cur {
    box-shadow: 0 0 0 2.5px var(--brand), var(--shadow-lift)
}
:host([data-theme="dark"]) .pr-setcard .pr-next {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .pr-sources p {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pr-sources li span {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .pr-sources a {
    color: var(--brand)
}
:host([data-theme="dark"]) .pr-shell {
    background: var(--bg)
}
:host([data-theme="dark"]) .pr-top {
    background: color-mix(in oklab, var(--dk-page) 92%, transparent);
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .pr-x {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pr-x:hover {
    background: var(--line);
    color: var(--ink)
}
:host([data-theme="dark"]) .pr-set {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pr-bar {
    background: var(--line)
}
:host([data-theme="dark"]) .pr-bar i {
    background: var(--gc)
}
:host([data-theme="dark"]) .pr-count {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .pr-card {
    background: var(--card);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .pr-instr {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .pr-q {
    color: var(--ink)
}
:host([data-theme="dark"]) .pr-q mark {
    background: var(--gs);
    color: var(--gc)
}
:host([data-theme="dark"]) .pr-src {
    background: var(--bg)
}
:host([data-theme="dark"]) .pr-blank {
    border-bottom: 3px solid var(--line-strong)
}
:host([data-theme="dark"]) .pr-blank.ok {
    color: var(--dk-green);
    border-color: var(--ok)
}
:host([data-theme="dark"]) .pr-blank.fix {
    color: var(--ink);
    border-color: var(--ok);
    background: var(--ok-soft)
}
:host([data-theme="dark"]) .pr-hint {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .pr-opt {
    border: 0;
    background: var(--card);
    box-shadow: inset 0 0 0 2px var(--line);
    color: var(--ink)
}
:host([data-theme="dark"]) .pr-opt:hover:not([disabled]) {
    box-shadow: inset 0 0 0 2px var(--gc)
}
:host([data-theme="dark"]) .pr-opt kbd {
    color: var(--ink-3);
    box-shadow: inset 0 0 0 1.5px var(--line-strong)
}
:host([data-theme="dark"]) .pr-opt.ok {
    background: var(--ok-soft);
    box-shadow: inset 0 0 0 2px var(--ok)
}
:host([data-theme="dark"]) .pr-opt.ok kbd {
    background: var(--ok);
    color: var(--dk-on-bright);
    box-shadow: none
}
:host([data-theme="dark"]) .pr-opt.bad {
    background: var(--bad-soft);
    box-shadow: inset 0 0 0 2px var(--bad)
}
:host([data-theme="dark"]) .pr-opt.bad kbd {
    background: var(--bad);
    color: var(--dk-on-bright);
    box-shadow: none
}
:host([data-theme="dark"]) .pr-input {
    border: 2px solid var(--line);
    background: var(--card)
}
:host([data-theme="dark"]) .pr-input:focus {
    outline: none;
    border-color: var(--gc);
    box-shadow: 0 0 0 4px var(--gs)
}
:host([data-theme="dark"]) .pr-input.ok {
    border-color: var(--ok);
    background: var(--ok-soft)
}
:host([data-theme="dark"]) .pr-input.bad {
    border-color: var(--bad);
    background: var(--bad-soft);
    text-decoration-color: color-mix(in oklab, var(--dk-red) 50%, transparent)
}
:host([data-theme="dark"]) .pr-slot {
    border: 2px dashed var(--line-strong)
}
:host([data-theme="dark"]) .pr-slot.empty::before {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .pr-slot.ok {
    border: 2px solid var(--ok);
    background: var(--ok-soft)
}
:host([data-theme="dark"]) .pr-slot.bad {
    border: 2px solid var(--bad);
    background: var(--bad-soft)
}
:host([data-theme="dark"]) .pr-punct {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .pr-tile {
    border: 0;
    background: var(--card);
    color: var(--ink);
    box-shadow: inset 0 0 0 2px var(--line), 0 3px 0 var(--line)
}
:host([data-theme="dark"]) .pr-tile:hover {
    box-shadow: inset 0 0 0 2px var(--gc), 0 3px 0 var(--gs)
}
:host([data-theme="dark"]) .pr-tile.in {
    background: var(--gs);
    box-shadow: inset 0 0 0 2px transparent
}
:host([data-theme="dark"]) .pr-tok {
    border: 0;
    background: transparent;
    color: inherit
}
:host([data-theme="dark"]) .pr-tok:hover:not([disabled]) {
    background: var(--gs)
}
:host([data-theme="dark"]) .pr-tok.miss {
    background: var(--line)
}
:host([data-theme="dark"]) .pr-tok.err {
    background: var(--bad-soft);
    color: var(--dk-red);
    box-shadow: inset 0 -3px 0 var(--bad)
}
:host([data-theme="dark"]) .pr-tok.fixed, :host([data-theme="dark"]) .pr-tok.fix {
    background: var(--ok-soft);
    color: var(--dk-green);
    box-shadow: inset 0 -3px 0 var(--ok)
}
:host([data-theme="dark"]) .pr-text {
    background: var(--bg)
}
:host([data-theme="dark"]) .pr-text-h {
    color: var(--gc)
}
:host([data-theme="dark"]) .pr-tgap small {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .pr-tfix {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .pr-fb.ok {
    background: var(--ok-soft)
}
:host([data-theme="dark"]) .pr-fb.bad {
    background: var(--bad-soft)
}
:host([data-theme="dark"]) .pr-fb-h .ic {
    color: #fff
}
:host([data-theme="dark"]) .pr-fb.ok .ic {
    background: var(--ok)
}
:host([data-theme="dark"]) .pr-fb.bad .ic {
    background: var(--bad)
}
:host([data-theme="dark"]) .pr-fb.ok .pr-fb-h b {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .pr-fb.bad .pr-fb-h b {
    color: var(--dk-red)
}
:host([data-theme="dark"]) .pr-fb-ans {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pr-fb-ans b {
    color: var(--ink)
}
:host([data-theme="dark"]) .pr-fb-why {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pr-fb-tl {
    background: color-mix(in oklab, var(--dk-card) 70%, transparent)
}
:host([data-theme="dark"]) .pr-rule {
    color: var(--ink-2);
    background: color-mix(in oklab, var(--dk-card) 75%, transparent);
    box-shadow: inset 3px 0 0 var(--gc)
}
:host([data-theme="dark"]) .pr-rule .tn {
    color: var(--gc)
}
:host([data-theme="dark"]) .pr-rule .go {
    color: var(--brand)
}
:host([data-theme="dark"]) .pr-listen {
    border: 0;
    background: color-mix(in oklab, var(--dk-card) 80%, transparent);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pr-listen:hover, :host([data-theme="dark"]) .pr-listen.on {
    color: var(--brand);
    box-shadow: inset 0 0 0 1.5px var(--brand)
}
:host([data-theme="dark"]) .pr-ring {
    background: conic-gradient(var(--gc) calc(var(--p) * 1%), var(--line) 0)
}
:host([data-theme="dark"]) .pr-ring span {
    background: var(--card)
}
:host([data-theme="dark"]) .pr-ring small {
    color: var(--ink-3)
}
:host([data-theme="dark"]) .pr-results > p {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pr-muted {
    color: var(--ink-3) !important
}
:host([data-theme="dark"]) .pr-rev li {
    background: var(--bg)
}
:host([data-theme="dark"]) .pr-rev .pr-rule {
    background: var(--card)
}
:host([data-theme="dark"]) .badge-prac {
    color: var(--dk-green);
    background: var(--ok-soft)
}
:host([data-theme="dark"]) .hub-practice a {
    background: var(--card);
    box-shadow: var(--shadow);
    color: var(--ink)
}
:host([data-theme="dark"]) .hub-practice i {
    background: var(--brand-soft);
    color: var(--brand)
}
:host([data-theme="dark"]) .hub-practice span {
    color: var(--ink-2)
}
:host([data-theme="dark"]) { color-scheme: dark; --line-strong: var(--dk-line-strong); --brand-2: var(--dk-acc-strong); }
:host([data-theme="dark"]) .chipk.a, :host([data-theme="dark"]) .chipk.n, :host([data-theme="dark"]) .chipk.v { color: var(--dk-on-bright); }
`
