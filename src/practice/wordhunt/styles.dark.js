// Тёмный слой «wordhunt» для Shadow DOM. СГЕНЕРИРОВАН scripts/practice/shadow-dark.js из styles.js раздела —
// руками не править: правки — в SECTIONS генератора. Кладётся в тень ПОСЛЕ светлых стилей.

export const WORDHUNT_DARK_CSS = `:host([data-theme="dark"]) {
    --ink: var(--dk-text);
    --ink-2: var(--dk-acc-text);
    --mut: var(--dk-acc-strong);
    --mut-2: var(--dk-acc);
    --violet: var(--dk-acc);
    --violet-dk: var(--dk-acc);
    --violet-lt: var(--dk-acc-tint);
    --violet-sky: var(--dk-acc);
    --cyan: var(--dk-blue);
    --cyan-dk: var(--dk-blue);
    --cyan-lt: var(--dk-blue-tint);
    --green: var(--dk-green);
    --green-dk: var(--dk-green);
    --green-lt: var(--dk-green-tint);
    --orange: var(--dk-orange);
    --orange-lt: var(--dk-orange-tint);
    --amber: var(--dk-yellow);
    --amber-dk: var(--dk-yellow);
    --amber-lt: var(--dk-yellow-tint);
    --gold: var(--dk-yellow);
    --gold-lt: var(--dk-yellow-tint);
    --grey: var(--dk-text-2);
    --line: var(--dk-acc-line);
    --line-2: var(--dk-acc-line);
    --canvas: var(--dk-page);
    --white: var(--dk-card);
    --glass: color-mix(in oklab, var(--dk-card) 70%, transparent);
    --glass-hi: color-mix(in oklab, var(--dk-card) 86%, transparent);
    --glass-b: color-mix(in oklab, var(--dk-card) 95%, transparent);
    --sh: 0 10px 30px color-mix(in oklab, var(--dk-acc) 14%, transparent),0 2px 6px color-mix(in oklab, var(--dk-acc) 6%, transparent);
    --sh-lg: 0 18px 50px color-mix(in oklab, var(--dk-acc) 22%, transparent)
}
:host([data-theme="dark"]) .wh:not(:is(.art, .art *)) {
    color: var(--ink);
    background: radial-gradient(720px 440px at 90% -80px,color-mix(in oklab, var(--dk-acc) 55%, transparent),transparent 70%) no-repeat,
    radial-gradient(640px 440px at -10% 240px,color-mix(in oklab, var(--dk-blue) 45%, transparent),transparent 70%) no-repeat,
    radial-gradient(760px 560px at 106% 860px,color-mix(in oklab, var(--dk-red) 40%, transparent),transparent 70%) no-repeat,
    radial-gradient(640px 500px at -8% 1500px,color-mix(in oklab, var(--dk-green) 30%, transparent),transparent 70%) no-repeat,
    linear-gradient(180deg,var(--dk-blue-tint) 0%,var(--dk-acc-tint) 34%,var(--dk-acc-tint) 70%,var(--dk-acc-tint) 100%)
}
:host([data-theme="dark"]) button:not(:is(.art, .art *)) {
    color: inherit
}
:host([data-theme="dark"]) h1:not(:is(.art, .art *)), :host([data-theme="dark"]) h2:not(:is(.art, .art *)), :host([data-theme="dark"]) h3:not(:is(.art, .art *)), :host([data-theme="dark"]) h4:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) :focus-visible:not(:is(.art, .art *)) {
    outline: 3px solid var(--violet)
}
:host([data-theme="dark"]) .sky.stage:not(:is(.art, .art *))::before {
    background: var(--zimg) 70% center/cover no-repeat
}
:host([data-theme="dark"]) .sky.stage:not(:is(.art, .art *))::after {
    background: linear-gradient(180deg,color-mix(in oklab, var(--dk-blue-tint) 55%, transparent) 0%,color-mix(in oklab, var(--dk-acc-tint) 62%, transparent) 50%,color-mix(in oklab, var(--dk-acc-tint) 72%, transparent) 100%)
}
:host([data-theme="dark"]) .fw:not(:is(.art, .art *)) {
    color: color-mix(in oklab, var(--dk-acc-text) 22%, transparent);
    text-shadow: 0 0 14px rgba(255,255,255,.95),0 0 2px rgba(255,255,255,.9)
}
:host([data-theme="dark"]) .fw:nth-child(3n):not(:is(.art, .art *)) {
    color: color-mix(in oklab, var(--dk-blue) 22%, transparent)
}
:host([data-theme="dark"]) .fw:nth-child(4n):not(:is(.art, .art *)) {
    color: color-mix(in oklab, var(--dk-red) 20%, transparent)
}
:host([data-theme="dark"]) .fw.new:not(:is(.art, .art *)) {
    color: color-mix(in oklab, var(--dk-acc-text) 50%, transparent)
}
:host([data-theme="dark"]) .spk:not(:is(.art, .art *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .spk:nth-child(3n):not(:is(.art, .art *)) {
    background: var(--dk-yellow-tint)
}
:host([data-theme="dark"]) .spk:nth-child(4n):not(:is(.art, .art *)) {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .flyword:not(:is(.art, .art *)) {
    color: #fff;
    background: var(--fc,var(--violet));
    box-shadow: 0 0 0 4px rgba(255,255,255,.6),0 0 28px var(--fc,var(--violet))
}
:host([data-theme="dark"]) .twk:not(:is(.art, .art *)) {
    background: var(--dk-yellow-tint)
}
:host([data-theme="dark"]) .mz:not(:is(.art, .art *)) {
    background: var(--img) center bottom/contain no-repeat
}
:host([data-theme="dark"]) .av:not(:is(.art, .art *)) {
    background: var(--img) var(--hp,50% 14%)/var(--hz,190%) auto no-repeat,radial-gradient(circle at 50% 35%,var(--dk-card),var(--dk-acc-soft));
    border: 2px solid var(--dk-line);
    box-shadow: 0 4px 12px color-mix(in oklab, var(--dk-acc) 25%, transparent)
}
:host([data-theme="dark"]) .spr:not(:is(.art, .art *)) {
    background: var(--sp) center/contain no-repeat
}
:host([data-theme="dark"]) .top:not(:is(.art, .art *)) {
    background: color-mix(in oklab, var(--dk-card) 74%, transparent);
    border-bottom: 1px solid var(--dk-line);
    box-shadow: 0 4px 20px color-mix(in oklab, var(--dk-acc) 8%, transparent)
}
:host([data-theme="dark"]) .brand:not(:is(.art, .art *)) {
    border: 0;
    background: none
}
:host([data-theme="dark"]) .jts-logo .w:not(:is(.art, .art *)) {
    fill: var(--dk-text)
}
:host([data-theme="dark"]) .jts-logo .t:not(:is(.art, .art *)) {
    fill: var(--violet)
}
:host([data-theme="dark"]) .brand .sep:not(:is(.art, .art *)) {
    background: var(--line-2)
}
:host([data-theme="dark"]) .brand .desc:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .brand .desc b:not(:is(.art, .art *)) {
    color: var(--violet)
}
:host([data-theme="dark"]) .pill:not(:is(.art, .art *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 3px color-mix(in oklab, var(--dk-acc) 12%, transparent);
    color: var(--ink)
}
:host([data-theme="dark"]) .pill.star svg:not(:is(.art, .art *)) {
    color: var(--amber)
}
:host([data-theme="dark"]) .pill.fire svg:not(:is(.art, .art *)) {
    color: var(--orange)
}
:host([data-theme="dark"]) .lang:not(:is(.art, .art *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 3px color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .lang button:not(:is(.art, .art *)) {
    border: 0;
    background: none;
    color: var(--mut)
}
:host([data-theme="dark"]) .lang button.on:not(:is(.art, .art *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .iconbtn:not(:is(.art, .art *)) {
    border: 0;
    background: var(--dk-card);
    box-shadow: 0 1px 4px color-mix(in oklab, var(--dk-acc) 16%, transparent);
    color: var(--ink)
}
:host([data-theme="dark"]) .iconbtn:hover:not(:is(.art, .art *)) {
    color: var(--violet-dk)
}
:host([data-theme="dark"]) .cta:not(:is(.art, .art *)) {
    border: 0;
    color: var(--dk-on-acc);
    background: linear-gradient(180deg,var(--dk-acc),var(--dk-acc));
    box-shadow: 0 8px 20px color-mix(in oklab, var(--dk-acc) 35%, transparent),inset 0 1px 0 rgba(255,255,255,.3)
}
:host([data-theme="dark"]) .cta:hover:not(:is(.art, .art *)) {
    box-shadow: 0 10px 26px color-mix(in oklab, var(--dk-acc) 45%, transparent),inset 0 1px 0 rgba(255,255,255,.3)
}
:host([data-theme="dark"]) .cta.cy:not(:is(.art, .art *)) {
    background: linear-gradient(180deg,var(--dk-blue),var(--dk-blue));
    box-shadow: 0 8px 20px color-mix(in oklab, var(--dk-blue) 32%, transparent),inset 0 1px 0 rgba(255,255,255,.3)
}
:host([data-theme="dark"]) .cta.sm:not(:is(.art, .art *)) {
    box-shadow: 0 4px 12px color-mix(in oklab, var(--dk-acc) 28%, transparent)
}
:host([data-theme="dark"]) .ghost:not(:is(.art, .art *)) {
    border: 0;
    background: var(--dk-card);
    color: var(--violet-dk);
    box-shadow: 0 2px 8px color-mix(in oklab, var(--dk-acc) 14%, transparent)
}
:host([data-theme="dark"]) .ghost:hover:not(:is(.art, .art *)) {
    box-shadow: 0 6px 16px color-mix(in oklab, var(--dk-acc) 20%, transparent)
}
:host([data-theme="dark"]) .cb:not(:is(.art, .art *)) {
    color: var(--ink);
    background: var(--dk-card);
    box-shadow: 0 6px 18px color-mix(in oklab, var(--dk-acc) 18%, transparent)
}
:host([data-theme="dark"]) .cb:not(:is(.art, .art *))::after {
    background: inherit
}
:host([data-theme="dark"]) .cb.gr:not(:is(.art, .art *)) {
    background: var(--green);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .hero:not(:is(.art, .art *)) {
    box-shadow: var(--sh-lg);
    border: 3px solid var(--dk-line)
}
:host([data-theme="dark"]) .hero-art:not(:is(.art, .art *)) {
    background: var(--hero) center/cover no-repeat
}
:host([data-theme="dark"]) .hero:not(:is(.art, .art *))::before {
    background: linear-gradient(90deg,color-mix(in oklab, var(--dk-acc) 62%, transparent) 0%,color-mix(in oklab, var(--dk-acc) 34%, transparent) 34%,color-mix(in oklab, var(--dk-acc) 0%, transparent) 56%)
}
:host([data-theme="dark"]) .hero-in:not(:is(.art, .art *)) {
    color: #fff
}
:host([data-theme="dark"]) .hero .eyebrow:not(:is(.art, .art *)) {
    color: rgba(255,255,255,.88)
}
:host([data-theme="dark"]) .hero h1:not(:is(.art, .art *)) {
    color: #fff;
    text-shadow: 0 4px 22px color-mix(in oklab, var(--dk-acc) 45%, transparent)
}
:host([data-theme="dark"]) .hero h1 b:not(:is(.art, .art *)) {
    color: var(--gold-lt)
}
:host([data-theme="dark"]) .hero p:not(:is(.art, .art *)) {
    color: #fff;
    text-shadow: 0 2px 10px color-mix(in oklab, var(--dk-acc) 45%, transparent)
}
:host([data-theme="dark"]) .hero .nextl:not(:is(.art, .art *)) {
    color: #fff;
    background: color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .sec-h p:not(:is(.art, .art *)) {
    color: var(--mut)
}
:host([data-theme="dark"]) .lvl:not(:is(.art, .art *)) {
    background: var(--glass-hi);
    border: 2px solid var(--dk-line);
    box-shadow: var(--sh);
    color: var(--ink)
}
:host([data-theme="dark"]) .lvl:hover:not(:is(.art, .art *)) {
    box-shadow: var(--sh-lg),0 0 0 3px var(--zc)
}
:host([data-theme="dark"]) .lvl .code:not(:is(.art, .art *)) {
    background: color-mix(in oklab, var(--dk-card) 92%, transparent);
    color: var(--zd)
}
:host([data-theme="dark"]) .lvl .nm:not(:is(.art, .art *)) {
    color: var(--mut)
}
:host([data-theme="dark"]) .lvl .nm b:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .lvl .pct:not(:is(.art, .art *)) {
    color: var(--zd)
}
:host([data-theme="dark"]) .lvl .meta:not(:is(.art, .art *)) {
    color: var(--mut)
}
:host([data-theme="dark"]) .cat-h:not(:is(.art, .art *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .cat-h i:not(:is(.art, .art *)) {
    background: var(--zc);
    box-shadow: 0 0 8px var(--zc)
}
:host([data-theme="dark"]) .fld:not(:is(.art, .art *)) {
    background: var(--glass);
    border: 1.5px solid var(--dk-line);
    border-left: 4px solid var(--zc);
    color: var(--ink);
    box-shadow: 0 2px 8px color-mix(in oklab, var(--dk-acc) 8%, transparent)
}
:host([data-theme="dark"]) .fld:hover:not(:is(.art, .art *)) {
    box-shadow: var(--sh)
}
:host([data-theme="dark"]) .fld .fi:not(:is(.art, .art *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 3px color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .fld small:not(:is(.art, .art *)) {
    color: var(--mut)
}
:host([data-theme="dark"]) .ring2:not(:is(.art, .art *)) {
    background: conic-gradient(var(--zd) calc(var(--p) * 1%),var(--line) 0)
}
:host([data-theme="dark"]) .comet:not(:is(.art, .art *)) {
    background: linear-gradient(90deg,var(--dk-yellow-tint),color-mix(in oklab, var(--dk-card) 80%, transparent));
    border: 2px solid var(--dk-yellow-line);
    box-shadow: var(--sh)
}
:host([data-theme="dark"]) .comet .t b:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .comet .t span:not(:is(.art, .art *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .legend:not(:is(.art, .art *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lg-d:not(:is(.art, .art *)) {
    background: radial-gradient(circle,var(--dk-card) 30%,var(--gold));
    box-shadow: 0 0 0 2px var(--gold),0 0 8px var(--gold)
}
:host([data-theme="dark"]) .lg-n:not(:is(.art, .art *)) {
    background: var(--dk-card);
    box-shadow: 0 0 0 3px var(--zc),0 0 10px var(--zc)
}
:host([data-theme="dark"]) .lg-u:not(:is(.art, .art *)) {
    background: var(--dk-chip);
    box-shadow: 0 0 0 1px var(--line-2)
}
:host([data-theme="dark"]) .j-base:not(:is(.art, .art *)) {
    fill: none;
    stroke: rgba(255,255,255,.85)
}
:host([data-theme="dark"]) .j-dust:not(:is(.art, .art *)) {
    fill: none;
    stroke: var(--violet-sky)
}
:host([data-theme="dark"]) .j-lit:not(:is(.art, .art *)) {
    fill: none
}
:host([data-theme="dark"]) .marks .s:not(:is(.art, .art *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .marks .s.on:not(:is(.art, .art *)) {
    color: var(--amber)
}
:host([data-theme="dark"]) .marks .h:not(:is(.art, .art *)) {
    background: var(--dk-chip)
}
:host([data-theme="dark"]) .marks .h.on:not(:is(.art, .art *)) {
    background: var(--cyan-dk)
}
:host([data-theme="dark"]) .scrim:not(:is(.art, .art *)) {
    background: color-mix(in oklab, var(--dk-acc) 28%, transparent)
}
:host([data-theme="dark"]) .sheet:not(:is(.art, .art *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 30px 80px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .sheet-h .orb:not(:is(.art, .art *)) {
    background: radial-gradient(circle,var(--dk-acc-tint),var(--dk-card) 70%)
}
:host([data-theme="dark"]) .sheet-h .orb .num:not(:is(.art, .art *)) {
    background: var(--zd);
    color: #fff
}
:host([data-theme="dark"]) .sheet-h small:not(:is(.art, .art *)) {
    color: var(--zd)
}
:host([data-theme="dark"]) .sheet-h p:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .sheet-h .iconbtn:not(:is(.art, .art *)) {
    background: var(--canvas);
    box-shadow: none
}
:host([data-theme="dark"]) .tabs:not(:is(.art, .art *)) {
    background: var(--canvas)
}
:host([data-theme="dark"]) .tab:not(:is(.art, .art *)) {
    border: 0;
    background: none;
    color: var(--grey)
}
:host([data-theme="dark"]) .tab.on:not(:is(.art, .art *)) {
    background: var(--dk-card);
    color: var(--violet-dk);
    box-shadow: 0 1px 4px color-mix(in oklab, var(--dk-acc) 16%, transparent)
}
:host([data-theme="dark"]) .tab.ws.on:not(:is(.art, .art *)) {
    color: var(--cyan-dk)
}
:host([data-theme="dark"]) .game .gd:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .chip:not(:is(.art, .art *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card);
    color: var(--ink)
}
:host([data-theme="dark"]) .chip b:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .chip>span:last-child:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .chip .st:not(:is(.art, .art *)) {
    color: var(--violet-dk)
}
:host([data-theme="dark"]) .game.hunt .chip .st:not(:is(.art, .art *)) {
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .chip .ok:not(:is(.art, .art *)) {
    color: var(--amber)
}
:host([data-theme="dark"]) .game.hunt .chip .ok:not(:is(.art, .art *)) {
    color: var(--green-dk)
}
:host([data-theme="dark"]) .chip:hover:not(:disabled):not(:is(.art, .art *)) {
    border-color: var(--violet-sky)
}
:host([data-theme="dark"]) .chip.on:not(:is(.art, .art *)) {
    border-color: var(--violet);
    background: var(--violet-lt)
}
:host([data-theme="dark"]) .game.hunt .chip:hover:not(:disabled):not(:is(.art, .art *)) {
    border-color: var(--cyan)
}
:host([data-theme="dark"]) .game.hunt .chip.on:not(:is(.art, .art *)) {
    border-color: var(--cyan-dk);
    background: var(--cyan-lt)
}
:host([data-theme="dark"]) .game .row small:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .tog:not(:is(.art, .art *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card);
    color: var(--ink)
}
:host([data-theme="dark"]) .tog i:not(:is(.art, .art *)) {
    background: var(--line-2)
}
:host([data-theme="dark"]) .tog i:not(:is(.art, .art *))::after {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .tog.on i:not(:is(.art, .art *)) {
    background: var(--cyan-dk)
}
:host([data-theme="dark"]) .hud:not(:is(.art, .art *)) {
    background: var(--glass-hi);
    border: 1.5px solid var(--dk-line);
    box-shadow: var(--sh)
}
:host([data-theme="dark"]) .hud .t small:not(:is(.art, .art *)) {
    color: var(--violet-dk)
}
:host([data-theme="dark"]) .hud.cy .t small:not(:is(.art, .art *)) {
    color: var(--cyan-dk)
}
:host([data-theme="dark"]) .hud .t b:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .ring span:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .timer:not(:is(.art, .art *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 1px 4px color-mix(in oklab, var(--dk-acc) 14%, transparent)
}
:host([data-theme="dark"]) .timer.low:not(:is(.art, .art *)) {
    color: var(--dk-red);
    box-shadow: 0 0 0 2px var(--orange)
}
:host([data-theme="dark"]) .buddy .bub:not(:is(.art, .art *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 10px 28px color-mix(in oklab, var(--dk-acc) 28%, transparent)
}
:host([data-theme="dark"]) .buddy .bub:not(:is(.art, .art *))::before {
    background: inherit
}
:host([data-theme="dark"]) .buddy .bub b:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .buddy .bub .tr:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .buddy .bub .plus:not(:is(.art, .art *)) {
    color: var(--amber-dk)
}
:host([data-theme="dark"]) .buddy .bub.ask:not(:is(.art, .art *)) {
    box-shadow: 0 0 0 2.5px var(--gold),0 10px 28px color-mix(in oklab, var(--dk-acc) 28%, transparent)
}
:host([data-theme="dark"]) .bub-b:not(:is(.art, .art *)) {
    border: 0;
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .hud.cy .bub-b:not(:is(.art, .art *)) {
    background: var(--cyan-dk)
}
:host([data-theme="dark"]) .bub-x:not(:is(.art, .art *)) {
    border: 0;
    background: var(--canvas);
    color: var(--grey)
}
:host([data-theme="dark"]) .floaters i:not(:is(.art, .art *)) {
    color: color-mix(in oklab, var(--dk-acc-text) 35%, transparent);
    background: rgba(255,255,255,.45);
    box-shadow: 0 0 18px rgba(255,255,255,.8)
}
:host([data-theme="dark"]) .clue:not(:is(.art, .art *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: var(--sh);
    border: 2px solid transparent
}
:host([data-theme="dark"]) .clue:not(:is(.art, .art *))::after {
    background: inherit
}
:host([data-theme="dark"]) .clue.ok:not(:is(.art, .art *)) {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--dk-yellow) 25%, transparent),var(--sh)
}
:host([data-theme="dark"]) .clue .nav:not(:is(.art, .art *)) {
    border: 0;
    background: var(--canvas);
    color: var(--ink)
}
:host([data-theme="dark"]) .clue .nav:hover:not(:is(.art, .art *)) {
    background: var(--violet-lt);
    color: var(--violet-dk)
}
:host([data-theme="dark"]) .clue .lab:not(:is(.art, .art *)) {
    color: var(--violet-dk)
}
:host([data-theme="dark"]) .clue.ok .lab:not(:is(.art, .art *)) {
    color: var(--amber-dk)
}
:host([data-theme="dark"]) .clue .tx:not(:is(.art, .art *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .clue .msg:not(:is(.art, .art *)) {
    color: var(--green-dk)
}
:host([data-theme="dark"]) .clue .msg.bad:not(:is(.art, .art *)) {
    color: var(--dk-orange)
}
:host([data-theme="dark"]) .enum:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .gap:not(:is(.art, .art *)) {
    border-bottom: 2px solid var(--violet)
}
:host([data-theme="dark"]) .form:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .hint2:not(:is(.art, .art *)) {
    background: var(--amber-lt);
    color: var(--ink)
}
:host([data-theme="dark"]) .hint2 b:not(:is(.art, .art *)) {
    color: var(--amber-dk)
}
:host([data-theme="dark"]) .ref:not(:is(.art, .art *)) {
    background: var(--cyan-lt);
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .refw:not(:is(.art, .art *)) {
    color: var(--green-dk)
}
:host([data-theme="dark"]) .board-w:not(:is(.art, .art *)) {
    background: radial-gradient(ellipse 70% 62% at 50% 50%,color-mix(in oklab, var(--dk-card) 90%, transparent),color-mix(in oklab, var(--dk-card) 55%, transparent) 55%,color-mix(in oklab, var(--dk-card) 0%, transparent) 78%)
}
:host([data-theme="dark"]) .tl.L:not(:is(.art, .art *)) {
    background: linear-gradient(180deg,var(--dk-card),var(--dk-acc-tint));
    border: 1.5px solid var(--dk-acc-line);
    box-shadow: 0 3px 0 var(--dk-acc-soft),0 6px 14px color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .tl .n:not(:is(.art, .art *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .tl .v:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .tl.f:not(:is(.art, .art *)) {
    background: linear-gradient(180deg,var(--dk-card),var(--dk-acc-tint))
}
:host([data-theme="dark"]) .tl.hl:not(:is(.art, .art *)) {
    background: linear-gradient(180deg,var(--dk-acc-tint),var(--dk-acc-soft));
    border-color: var(--dk-acc);
    box-shadow: 0 3px 0 var(--dk-acc),0 0 12px color-mix(in oklab, var(--dk-acc) 25%, transparent)
}
:host([data-theme="dark"]) .tl.cur:not(:is(.art, .art *)) {
    background: linear-gradient(180deg,var(--dk-acc),var(--dk-acc));
    border-color: var(--dk-acc);
    box-shadow: 0 3px 0 var(--dk-acc-strong),0 0 0 3px color-mix(in oklab, var(--dk-acc) 45%, transparent),0 0 20px color-mix(in oklab, var(--dk-acc) 55%, transparent)
}
:host([data-theme="dark"]) .tl.cur .v:not(:is(.art, .art *)), :host([data-theme="dark"]) .tl.cur .n:not(:is(.art, .art *)) {
    color: #fff
}
:host([data-theme="dark"]) .tl.ok:not(:is(.art, .art *)) {
    background: linear-gradient(180deg,var(--dk-yellow-tint),var(--dk-yellow-tint));
    border-color: var(--dk-yellow-line);
    box-shadow: 0 3px 0 var(--dk-yellow),0 0 14px color-mix(in oklab, var(--dk-yellow) 55%, transparent)
}
:host([data-theme="dark"]) .tl.ok .v:not(:is(.art, .art *)) {
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .tl.ok .n:not(:is(.art, .art *)) {
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .tl.ok.cur:not(:is(.art, .art *)) {
    background: linear-gradient(180deg,var(--dk-yellow),var(--dk-yellow));
    border-color: var(--dk-yellow-line)
}
:host([data-theme="dark"]) .tl.ok.cur .v:not(:is(.art, .art *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .tl.bad:not(:is(.art, .art *)) {
    background: linear-gradient(180deg,var(--dk-page),var(--dk-orange-tint));
    border-color: var(--orange);
    box-shadow: 0 3px 0 var(--dk-orange)
}
:host([data-theme="dark"]) .tl.bad .v:not(:is(.art, .art *)) {
    color: var(--dk-orange)
}
:host([data-theme="dark"]) .tl.rv:not(:is(.art, .art *))::after {
    background: var(--cyan)
}
:host([data-theme="dark"]) .key:not(:is(.art, .art *)) {
    border: 0;
    background: transparent;
    color: transparent;
    caret-color: transparent
}
:host([data-theme="dark"]) .tool:not(:is(.art, .art *)) {
    border: 0;
    background: var(--dk-card);
    color: var(--ink-2);
    box-shadow: 0 2px 8px color-mix(in oklab, var(--dk-acc) 14%, transparent)
}
:host([data-theme="dark"]) .tool:hover:not(:is(.art, .art *)) {
    color: var(--violet-dk)
}
:host([data-theme="dark"]) .tool svg:not(:is(.art, .art *)) {
    color: var(--violet)
}
:host([data-theme="dark"]) .hp .tool svg:not(:is(.art, .art *)) {
    color: var(--cyan-dk)
}
:host([data-theme="dark"]) .keys:not(:is(.art, .art *)) {
    color: var(--mut)
}
:host([data-theme="dark"]) .clues:not(:is(.art, .art *)), :host([data-theme="dark"]) .wlist:not(:is(.art, .art *)) {
    background: color-mix(in oklab, var(--dk-card) 92%, transparent);
    color: var(--ink);
    box-shadow: var(--sh);
    border: 1.5px solid var(--dk-line)
}
:host([data-theme="dark"]) .clues h4:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .cl:not(:is(.art, .art *)) {
    border-left: 3px solid transparent;
    color: var(--ink)
}
:host([data-theme="dark"]) .cl:hover:not(:is(.art, .art *)) {
    background: var(--canvas)
}
:host([data-theme="dark"]) .cl .no:not(:is(.art, .art *)) {
    color: var(--violet-dk)
}
:host([data-theme="dark"]) .cl.on:not(:is(.art, .art *)) {
    background: var(--violet-lt);
    border-left-color: var(--violet)
}
:host([data-theme="dark"]) .cl.x:not(:is(.art, .art *)) {
    background: var(--canvas)
}
:host([data-theme="dark"]) .cl.ok .no:not(:is(.art, .art *)) {
    color: var(--amber-dk)
}
:host([data-theme="dark"]) .cl.ok .ct:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .cl .ans:not(:is(.art, .art *)) {
    color: var(--amber-dk)
}
:host([data-theme="dark"]) .cl .ans em:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .strip .fx:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .snd:not(:is(.art, .art *)) {
    border: 0;
    background: var(--violet-lt);
    color: var(--violet-dk)
}
:host([data-theme="dark"]) .snd:hover:not(:is(.art, .art *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .ktag:not(:is(.art, .art *)) {
    background: var(--canvas);
    color: var(--ink)
}
:host([data-theme="dark"]) .ktag.k-tr:not(:is(.art, .art *)) {
    background: var(--amber-lt);
    color: var(--amber-dk)
}
:host([data-theme="dark"]) .ktag.k-def:not(:is(.art, .art *)) {
    background: var(--violet-lt);
    color: var(--violet-dk)
}
:host([data-theme="dark"]) .ktag.k-ctx:not(:is(.art, .art *)) {
    background: var(--cyan-lt);
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .ktag.k-col:not(:is(.art, .art *)) {
    background: var(--green-lt);
    color: var(--green-dk)
}
:host([data-theme="dark"]) .supl:not(:is(.art, .art *)) {
    color: var(--amber-dk)
}
:host([data-theme="dark"]) .hboard-w:not(:is(.art, .art *)) {
    background: color-mix(in oklab, var(--dk-card) 62%, transparent);
    border: 2px solid var(--dk-line);
    box-shadow: var(--sh-lg),0 0 40px color-mix(in oklab, var(--dk-blue) 15%, transparent)
}
:host([data-theme="dark"]) .hc:not(:is(.art, .art *)) {
    color: var(--ink);
    background: color-mix(in oklab, var(--dk-card) 92%, transparent);
    box-shadow: 0 2px 0 var(--dk-acc-soft)
}
:host([data-theme="dark"]) .hc.sel:not(:is(.art, .art *)) {
    color: var(--dk-on-bright);
    background: linear-gradient(180deg,var(--dk-blue),var(--dk-blue));
    box-shadow: 0 0 0 2px rgba(255,255,255,.9),0 0 16px color-mix(in oklab, var(--dk-blue) 85%, transparent)
}
:host([data-theme="dark"]) .hc.fd:not(:is(.art, .art *)) {
    background: rgba(255,255,255,.4);
    box-shadow: none
}
:host([data-theme="dark"]) .hc.kb:not(:is(.art, .art *)) {
    box-shadow: 0 0 0 2.5px var(--cyan-dk) inset
}
:host([data-theme="dark"]) .hc.anc:not(:is(.art, .art *)) {
    box-shadow: 0 0 0 2.5px var(--amber) inset,0 0 12px color-mix(in oklab, var(--dk-yellow) 50%, transparent);
    background: var(--amber-lt)
}
:host([data-theme="dark"]) .hc.miss:not(:is(.art, .art *)) {
    color: var(--dk-orange)
}
:host([data-theme="dark"]) .wlist h4:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .wc:not(:is(.art, .art *)) {
    background: var(--canvas);
    border: 1.5px solid transparent
}
:host([data-theme="dark"]) .wc .wb:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .wc .ans b:not(:is(.art, .art *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .wc .ans small:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .wc.fd:not(:is(.art, .art *)) {
    background: var(--dk-card);
    border-color: var(--wc);
    box-shadow: 0 0 12px color-mix(in srgb,var(--wc) 35%,transparent)
}
:host([data-theme="dark"]) .wc.fd .wb:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .wc.miss:not(:is(.art, .art *)) {
    background: var(--orange-lt)
}
:host([data-theme="dark"]) .peek:not(:is(.art, .art *)) {
    border: 1px solid var(--line-2);
    background: var(--dk-card);
    color: var(--grey)
}
:host([data-theme="dark"]) .peek:hover:not(:is(.art, .art *)) {
    color: var(--cyan-dk);
    border-color: var(--cyan-dk)
}
:host([data-theme="dark"]) .wlist .note:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .res-top:not(:is(.art, .art *))::before {
    background: radial-gradient(ellipse,color-mix(in oklab, var(--dk-card) 95%, transparent),color-mix(in oklab, var(--dk-card) 0%, transparent) 65%)
}
:host([data-theme="dark"]) .res .big:not(:is(.art, .art *)) {
    color: var(--violet)
}
:host([data-theme="dark"]) .res.ws .big:not(:is(.art, .art *)) {
    color: var(--cyan-dk)
}
:host([data-theme="dark"]) .res.to .big:not(:is(.art, .art *)) {
    color: var(--dk-orange)
}
:host([data-theme="dark"]) .res .big .num:not(:is(.art, .art *)) {
    color: #fff
}
:host([data-theme="dark"]) .res .big .lbl:not(:is(.art, .art *)) {
    color: #fff
}
:host([data-theme="dark"]) .res .sub:not(:is(.art, .art *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .gain>span:not(:is(.art, .art *)) {
    background: var(--dk-card);
    box-shadow: 0 2px 8px color-mix(in oklab, var(--dk-acc) 12%, transparent);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .gain span b:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .gain .steps svg:not(:is(.art, .art *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .gain .steps svg.on:not(:is(.art, .art *)) {
    color: var(--amber)
}
:host([data-theme="dark"]) .gain .steps .h:not(:is(.art, .art *)) {
    background: var(--dk-chip)
}
:host([data-theme="dark"]) .gain .steps .h.on:not(:is(.art, .art *)) {
    background: var(--cyan-dk);
    box-shadow: 0 0 6px color-mix(in oklab, var(--dk-blue) 60%, transparent)
}
:host([data-theme="dark"]) .reslist:not(:is(.art, .art *)) {
    background: color-mix(in oklab, var(--dk-card) 92%, transparent);
    color: var(--ink);
    box-shadow: var(--sh)
}
:host([data-theme="dark"]) .reslist h4:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .reslist.cm:not(:is(.art, .art *)) {
    background: var(--dk-yellow-tint);
    box-shadow: var(--sh),inset 0 0 0 1.5px var(--amber)
}
:host([data-theme="dark"]) .reslist.cm h4:not(:is(.art, .art *)) {
    color: var(--amber-dk)
}
:host([data-theme="dark"]) .rw:not(:is(.art, .art *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .reslist.cm .rw:not(:is(.art, .art *)) {
    border-top-color: color-mix(in oklab, var(--dk-yellow) 18%, transparent)
}
:host([data-theme="dark"]) .rw:first-of-type:not(:is(.art, .art *)) {
    border-top: 0
}
:host([data-theme="dark"]) .rw b:not(:is(.art, .art *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .rw span:not(:is(.art, .art *)) {
    color: var(--grey)
}
:host([data-theme="dark"]) .toast:not(:is(.art, .art *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: var(--sh-lg),0 0 0 2px var(--gold)
}
:host([data-theme="dark"]) .toast .bd:not(:is(.art, .art *)) {
    background: linear-gradient(160deg,var(--dk-yellow-tint),var(--dk-yellow));
    color: #fff
}
:host([data-theme="dark"]) .toast small:not(:is(.art, .art *)) {
    color: var(--amber-dk)
}
:host([data-theme="dark"]) .toast b:not(:is(.art, .art *)) {
    color: var(--dk-text)
}
@media (max-width:760px) {
    :host([data-theme="dark"]) .hero:not(:is(.art, .art *)) {
        background: color-mix(in oklab, var(--dk-card) 88%, transparent)
    }
    :host([data-theme="dark"]) .hero-in:not(:is(.art, .art *)) {
        color: var(--ink)
    }
    :host([data-theme="dark"]) .hero .eyebrow:not(:is(.art, .art *)) {
        color: var(--violet-dk)
    }
    :host([data-theme="dark"]) .hero h1:not(:is(.art, .art *)) {
        color: var(--ink);
        text-shadow: none
    }
    :host([data-theme="dark"]) .hero h1 b:not(:is(.art, .art *)) {
        color: var(--violet)
    }
    :host([data-theme="dark"]) .hero p:not(:is(.art, .art *)) {
        color: var(--ink-2);
        text-shadow: none
    }
    :host([data-theme="dark"]) .hero .nextl:not(:is(.art, .art *)) {
        color: var(--ink-2);
        background: var(--canvas)
    }
}
@media (max-width:700px) {
    :host([data-theme="dark"]) .hud:not(:is(.art, .art *)) {
        background: color-mix(in oklab, var(--dk-card) 94%, transparent)
    }
    :host([data-theme="dark"]) .buddy .bub:not(:is(.art, .art *))::before {
        background: var(--img) var(--hp)/var(--hz) auto no-repeat,radial-gradient(circle at 50% 35%,var(--dk-card),var(--dk-acc-soft))
    }
}
:host([data-theme="dark"]) .lvl .bar:not(:is(.art, .art *)), :host([data-theme="dark"]) .zcap .bar:not(:is(.art, .art *)) {
    background: var(--line)
}
:host([data-theme="dark"]) .zcap .bar i:not(:is(.art, .art *)) {
    background: linear-gradient(90deg,var(--zc),var(--gold-lt));
    box-shadow: 0 0 8px var(--zc)
}
:host([data-theme="dark"]) .zhead:not(:is(.art, .art *)) {
    box-shadow: var(--sh-lg);
    border: 3px solid var(--dk-line)
}
:host([data-theme="dark"]) .zart:not(:is(.art, .art *)) {
    background: var(--zimg) center/cover no-repeat
}
:host([data-theme="dark"]) .zcap:not(:is(.art, .art *)) {
    background: color-mix(in oklab, var(--dk-card) 88%, transparent);
    box-shadow: var(--sh)
}
:host([data-theme="dark"]) .zcap small:not(:is(.art, .art *)) {
    color: var(--zd)
}
:host([data-theme="dark"]) .zcap p:not(:is(.art, .art *)) {
    color: var(--mut)
}
:host([data-theme="dark"]) .mapbar:not(:is(.art, .art *)) {
    background: color-mix(in oklab, var(--dk-card) 82%, transparent);
    border: 1.5px solid var(--dk-line);
    box-shadow: var(--sh)
}
:host([data-theme="dark"]) .stab:not(:is(.art, .art *)) {
    border: 0;
    background: transparent;
    color: var(--ink)
}
:host([data-theme="dark"]) .stab:hover:not(:is(.art, .art *)) {
    background: var(--canvas)
}
:host([data-theme="dark"]) .stab .n:not(:is(.art, .art *)) {
    background: var(--line);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .stab .cnt:not(:is(.art, .art *)) {
    color: var(--mut)
}
:host([data-theme="dark"]) .stab.done .n:not(:is(.art, .art *)) {
    background: var(--green);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .stab.here:not(:is(.art, .art *)) {
    background: var(--dk-card);
    box-shadow: 0 0 0 2px var(--zc)
}
:host([data-theme="dark"]) .stab.here .n:not(:is(.art, .art *)) {
    background: var(--zc);
    color: var(--ink);
    box-shadow: 0 0 10px var(--zc)
}
:host([data-theme="dark"]) .legend:not(:is(.art, .art *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lg-s:not(:is(.art, .art *)) {
    background: var(--dk-card);
    box-shadow: 0 0 0 2px var(--zd)
}
:host([data-theme="dark"]) .j-base:not(:is(.art, .art *)) {
    fill: none;
    stroke: rgba(255,255,255,.85)
}
:host([data-theme="dark"]) .j-dust:not(:is(.art, .art *)) {
    fill: none;
    stroke: var(--violet-sky)
}
:host([data-theme="dark"]) .j-lit:not(:is(.art, .art *)) {
    fill: none
}
:host([data-theme="dark"]) .sector:not(:is(.art, .art *)) {
    background: color-mix(in oklab, var(--dk-card) 92%, transparent);
    box-shadow: var(--sh),0 0 0 3px rgba(255,255,255,.6)
}
:host([data-theme="dark"]) .sector .n:not(:is(.art, .art *)) {
    color: #fff;
    background: var(--zd);
    box-shadow: 0 0 0 3px var(--zc),0 0 12px var(--zc)
}
:host([data-theme="dark"]) .sector small:not(:is(.art, .art *)) {
    color: var(--zd)
}
:host([data-theme="dark"]) .sector b:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .deco:not(:is(.art, .art *)) {
    background: var(--sp) center/contain no-repeat
}
:host([data-theme="dark"]) .node:not(:is(.art, .art *)) {
    border: 0;
    background: none;
    color: var(--ink)
}
:host([data-theme="dark"]) .node .orb:not(:is(.art, .art *))::before {
    background: radial-gradient(circle,color-mix(in oklab, var(--dk-card) 95%, transparent) 0,color-mix(in oklab, var(--dk-card) 55%, transparent) 45%,color-mix(in oklab, var(--dk-card) 0%, transparent) 70%)
}
:host([data-theme="dark"]) .node .num:not(:is(.art, .art *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 2px 6px color-mix(in oklab, var(--dk-acc) 28%, transparent)
}
:host([data-theme="dark"]) .node.any .num:not(:is(.art, .art *)) {
    background: var(--zd);
    color: #fff
}
:host([data-theme="dark"]) .node.done .orb:not(:is(.art, .art *)) {
    background: radial-gradient(circle,color-mix(in oklab, var(--dk-yellow-tint) 90%, transparent),color-mix(in oklab, var(--dk-yellow-tint) 0%, transparent) 70%)
}
:host([data-theme="dark"]) .node.done .orb:not(:is(.art, .art *))::after {
    border: 3px solid var(--gold);
    box-shadow: 0 0 18px color-mix(in oklab, var(--dk-yellow) 85%, transparent),inset 0 0 14px color-mix(in oklab, var(--dk-yellow) 50%, transparent)
}
:host([data-theme="dark"]) .node .ck:not(:is(.art, .art *)) {
    background: var(--green);
    color: var(--dk-on-bright);
    border: 2px solid var(--dk-line);
    box-shadow: 0 2px 6px color-mix(in oklab, var(--dk-green) 30%, transparent)
}
:host([data-theme="dark"]) .node.next .orb:not(:is(.art, .art *))::after {
    border: 3px solid var(--zc);
    box-shadow: 0 0 22px var(--zc)
}
:host([data-theme="dark"]) .node .lab:not(:is(.art, .art *)) {
    background: color-mix(in oklab, var(--dk-card) 90%, transparent);
    box-shadow: 0 4px 14px color-mix(in oklab, var(--dk-acc) 14%, transparent)
}
:host([data-theme="dark"]) .node .lab em:not(:is(.art, .art *)) {
    color: var(--zd)
}
:host([data-theme="dark"]) .node .lab b:not(:is(.art, .art *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .node.new .lab b:not(:is(.art, .art *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .node.next .lab:not(:is(.art, .art *)) {
    background: var(--dk-card);
    box-shadow: 0 0 0 2.5px var(--zc),0 6px 18px color-mix(in oklab, var(--dk-acc) 20%, transparent)
}
:host([data-theme="dark"]) .node:hover .lab:not(:is(.art, .art *)) {
    background: var(--dk-card)
}
@media (max-width:760px) {
    :host([data-theme="dark"]) .zcap:not(:is(.art, .art *)) {
        box-shadow: none;
        background: color-mix(in oklab, var(--dk-card) 94%, transparent)
    }
}
:host([data-theme="dark"]) .fl:not(:is(.art, .art *)) {
    color: #fff;
    text-shadow: 0 0 8px var(--zc),0 0 20px var(--zc)
}
:host([data-theme="dark"]) .fl:not(:is(.art, .art *))::before {
    background: linear-gradient(90deg,color-mix(in oklab, var(--dk-card) 0%, transparent),var(--zc))
}
:host([data-theme="dark"]) .fl.up:not(:is(.art, .art *))::before {
    background: linear-gradient(0deg,color-mix(in oklab, var(--dk-card) 0%, transparent),var(--zc))
}
:host([data-theme="dark"]) .risel:not(:is(.art, .art *)) {
    color: #fff;
    text-shadow: 0 0 8px var(--fc),0 0 20px var(--fc),0 0 2px var(--dk-card)
}
:host([data-theme="dark"]) .risel:not(:is(.art, .art *))::after {
    background: linear-gradient(180deg,var(--fc),color-mix(in oklab, var(--dk-card) 0%, transparent))
}
:host([data-theme="dark"]) :is(.art) {
    color-scheme: light;
    --ink: #1F1650;
    --ink-2: #463F7C;
    --mut: #5A538C;
    --mut-2: #7C76A8;
    --violet: #874BF8;
    --violet-dk: #6A2FE3;
    --violet-lt: #EFE7FE;
    --violet-sky: #B48CFF;
    --cyan: #0AC7FF;
    --cyan-dk: #0079BF;
    --cyan-lt: #E2F5FF;
    --green: #00C23C;
    --green-dk: #0E7A38;
    --green-lt: #E1FAEB;
    --orange: #FF631E;
    --orange-lt: #FFEBE2;
    --amber: #FFAD00;
    --amber-dk: #8F6100;
    --amber-lt: #FFF4DC;
    --gold: #FFC93D;
    --gold-lt: #FFE27A;
    --grey: #5F5974;
    --line: #E4DEF5;
    --line-2: #CDC5E6;
    --canvas: #F5F2FD;
    --white: #fff;
    --glass: rgba(255,255,255,.7);
    --glass-hi: rgba(255,255,255,.86);
    --glass-b: rgba(255,255,255,.95);
    --sh: 0 10px 30px rgba(84,58,190,.14),0 2px 6px rgba(84,58,190,.06);
    --sh-lg: 0 18px 50px rgba(84,58,190,.22)
}
:host([data-theme="dark"]){--gold-lt:var(--dk-yellow)}
`
