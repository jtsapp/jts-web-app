// Тёмный слой «numbers» для Shadow DOM. СГЕНЕРИРОВАН scripts/practice/shadow-dark.js из styles.js раздела —
// руками не править: правки — в SECTIONS генератора. Кладётся в тень ПОСЛЕ светлых стилей.

export const NUMBERS_DARK_CSS = `:host([data-theme="dark"]) {
    --brand: var(--dk-acc);
    --brand-d: var(--dk-acc);
    --brand-l: var(--dk-acc-tint);
    --ink: var(--dk-text);
    --ink2: var(--dk-text-2);
    --bg: var(--dk-page);
    --card: var(--dk-card);
    --good: var(--dk-green);
    --good-l: var(--dk-green-tint);
    --bad: var(--dk-red);
    --bad-l: var(--dk-red-tint);
    --gold: var(--dk-yellow);
    --line: var(--dk-acc-line);
    --shadow: 0 10px 30px color-mix(in oklab, var(--dk-acc) 14%, transparent)
}
:host([data-theme="dark"]) .nw:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--ink);
    background: var(--bg)
}
:host([data-theme="dark"]) button:focus-visible:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)), :host([data-theme="dark"]) [tabindex]:focus-visible:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    outline: 3px solid var(--brand)
}
:host([data-theme="dark"]) .topbar:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: color-mix(in oklab, var(--dk-card) 92%, transparent);
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .logo:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .stat:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--bg)
}
:host([data-theme="dark"]) .bar:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--line)
}
:host([data-theme="dark"]) .bar>i:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: linear-gradient(90deg,var(--brand),var(--dk-acc))
}
:host([data-theme="dark"]) .icon-btn:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 0;
    background: var(--bg);
    color: var(--ink)
}
:host([data-theme="dark"]) .icon-btn:hover:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--brand-l)
}
:host([data-theme="dark"]) .hero-prog .bar:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: rgba(255,255,255,.3)
}
:host([data-theme="dark"]) .hero-prog .bar>i:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .btn:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 0
}
:host([data-theme="dark"]) .btn-primary:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--brand);
    color: var(--dk-on-acc);
    box-shadow: 0 4px 0 var(--brand-d)
}
:host([data-theme="dark"]) .btn-white:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-card);
    color: var(--brand);
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.36)
}
:host([data-theme="dark"]) .btn-ghost:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--bg);
    color: var(--ink)
}
:host([data-theme="dark"]) .btn-bad:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--bad);
    color: var(--dk-on-bright);
    box-shadow: 0 4px 0 var(--dk-red)
}
:host([data-theme="dark"]) .btn-gold:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: linear-gradient(180deg,var(--dk-yellow),var(--dk-yellow));
    color: var(--dk-on-bright);
    box-shadow: 0 4px 0 var(--dk-yellow)
}
:host([data-theme="dark"]) .mini:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--bg)
}
:host([data-theme="dark"]) .mini span:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .card:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 0;
    background: var(--card);
    box-shadow: 0 8px 24px color-mix(in oklab, var(--dk-acc) 12%, transparent);
    color: var(--ink)
}
:host([data-theme="dark"]) .card:hover:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    box-shadow: 0 20px 40px color-mix(in oklab, var(--dk-acc) 22%, transparent)
}
:host([data-theme="dark"]) .card.next:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    box-shadow: 0 0 0 3px var(--brand),0 16px 34px color-mix(in oklab, var(--dk-acc) 30%, transparent)
}
:host([data-theme="dark"]) .o.glass:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: linear-gradient(180deg,color-mix(in oklab, var(--dk-card) 97%, transparent),color-mix(in oklab, var(--dk-acc-tint) 97%, transparent));
    border: 3px solid var(--dk-line);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--dk-acc) 55%, transparent);
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .card-desc:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .card-foot:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .card-foot .cta:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--brand)
}
:host([data-theme="dark"]) .state:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--good);
    color: var(--dk-on-bright);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4)
}
:host([data-theme="dark"]) .tag-boss:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--gold);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .g-title:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--brand-d)
}
:host([data-theme="dark"]) .stone:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--line)
}
:host([data-theme="dark"]) .stone.cur:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-acc-soft);
    box-shadow: 0 0 0 2px var(--brand) inset
}
:host([data-theme="dark"]) .stone.gold:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: linear-gradient(90deg,var(--dk-yellow),var(--dk-yellow));
    box-shadow: 0 0 10px color-mix(in oklab, var(--dk-yellow) 60%, transparent)
}
:host([data-theme="dark"]) .stone.silver:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: linear-gradient(90deg,var(--dk-raised),var(--dk-acc))
}
:host([data-theme="dark"]) .stone.miss:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-red-soft)
}
:host([data-theme="dark"]) .vignette:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: radial-gradient(140% 100% at 50% 40%,transparent 70%,rgba(255, 255, 255, 0.28))
}
:host([data-theme="dark"]) .boss-tint .vignette:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: radial-gradient(140% 100% at 50% 40%,color-mix(in oklab, var(--dk-acc) 8%, transparent) 50%,rgba(30,0,50,.42))
}
:host([data-theme="dark"]) .mote:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-card);
    box-shadow: 0 0 10px 3px color-mix(in oklab, var(--dk-yellow) 80%, transparent)
}
:host([data-theme="dark"]) .isl:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 0;
    background: none
}
:host([data-theme="dark"]) .tab:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: linear-gradient(180deg,color-mix(in oklab, var(--dk-card) 96%, transparent),color-mix(in oklab, var(--dk-acc-tint) 96%, transparent));
    border: 3px solid var(--dk-line);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--dk-acc) 55%, transparent),0 10px 24px color-mix(in oklab, var(--dk-acc) 35%, transparent),0 0 28px color-mix(in oklab, var(--dk-acc) 60%, transparent);
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .tab:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *))::after {
    background: linear-gradient(var(--dk-acc),transparent)
}
:host([data-theme="dark"]) .isl:hover:not([disabled]) .tab:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)), :host([data-theme="dark"]) .isl:focus-visible .tab:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    box-shadow: 0 0 0 4px var(--dk-acc),0 14px 28px color-mix(in oklab, var(--dk-acc) 45%, transparent),0 0 36px color-mix(in oklab, var(--dk-acc) 90%, transparent)
}
:host([data-theme="dark"]) .isl .key:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: #fff;
    background: color-mix(in oklab, var(--dk-acc) 55%, transparent)
}
:host([data-theme="dark"]) .isl.glow .tab:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    box-shadow: 0 0 0 4px var(--gold),0 0 40px 8px color-mix(in oklab, var(--dk-yellow) 90%, transparent)
}
:host([data-theme="dark"]) .isl.wrongTab .tab:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-red-tint);
    box-shadow: 0 0 0 3px var(--bad)
}
:host([data-theme="dark"]) .dex .shadow:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: rgba(20,8,60,.35)
}
:host([data-theme="dark"]) .pill:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: color-mix(in oklab, var(--dk-card) 95%, transparent);
    box-shadow: 0 0 0 4px rgba(255,255,255,.35),0 12px 30px color-mix(in oklab, var(--dk-acc) 35%, transparent);
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .pill small:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--brand)
}
:host([data-theme="dark"]) .pill .listen i:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--brand)
}
:host([data-theme="dark"]) .rbtn:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 0;
    background: var(--dk-red);
    color: var(--dk-on-bright);
    box-shadow: 0 5px 0 var(--dk-red),0 10px 20px rgba(0, 0, 0, 0.5)
}
:host([data-theme="dark"]) .rbtn:active:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    box-shadow: 0 2px 0 var(--dk-red)
}
:host([data-theme="dark"]) .rbtn.slow:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3)
}
:host([data-theme="dark"]) .chip:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: color-mix(in oklab, var(--dk-card) 94%, transparent);
    color: var(--ink);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.5)
}
:host([data-theme="dark"]) .chip.combo:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: linear-gradient(180deg,var(--dk-yellow),var(--dk-yellow));
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .hbtn:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 0;
    background: color-mix(in oklab, var(--dk-card) 94%, transparent);
    color: var(--ink);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.5)
}
:host([data-theme="dark"]) .msg:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-card);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .msg.ok:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-green-tint);
    color: var(--dk-green);
    border: 2px solid var(--dk-green-line)
}
:host([data-theme="dark"]) .msg.no:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-page);
    color: var(--dk-red);
    border: 2px solid var(--dk-red-line)
}
:host([data-theme="dark"]) .msg.info:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-yellow-tint);
    color: var(--dk-yellow);
    border: 2px solid var(--dk-yellow-line)
}
:host([data-theme="dark"]) .pop:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: #fff;
    text-shadow: 0 2px 0 var(--dk-acc),0 0 14px color-mix(in oklab, var(--dk-acc) 90%, transparent)
}
:host([data-theme="dark"]) .g-note:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .lesson:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    --l-ink: var(--dk-text);
    --l-ink2: var(--dk-text-2);
    --l-ink3: var(--dk-text-2);
    --l-violet: var(--dk-acc-strong);
    --l-violet-t: var(--dk-acc-tint);
    --l-line: var(--dk-acc-line);
    --l-paper: var(--dk-card);
    --l-tr: var(--dk-green);
    --l-tr-bg: var(--dk-page);
    --l-tr-line: var(--dk-line);
    --l-note: var(--dk-yellow);
    --l-note-bg: var(--dk-yellow-tint);
    --l-bad: var(--dk-red);
    --l-bad-bg: var(--dk-page);
    --l-good: var(--dk-green);
    --l-good-bg: var(--dk-page);
    color: var(--l-ink)
}
:host([data-theme="dark"]) .lesson :is(h1,h2,h3):not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink)
}
:host([data-theme="dark"]) .lesson b:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink)
}
:host([data-theme="dark"]) .ls-top .crumb:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink2)
}
:host([data-theme="dark"]) .ls-world:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: rgba(255,255,255,.86)
}
:host([data-theme="dark"]) .ls-level:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 1px solid var(--dk-line);
    color: #fff
}
:host([data-theme="dark"]) .ls-langbar:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-bottom: 1px solid var(--l-line)
}
:host([data-theme="dark"]) .ls-seg:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .ls-seg button:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 0;
    background: transparent;
    color: var(--l-ink2)
}
:host([data-theme="dark"]) .ls-seg button:hover:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink)
}
:host([data-theme="dark"]) .ls-seg button[aria-pressed="true"]:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--l-paper);
    color: var(--l-ink);
    box-shadow: 0 1px 2px color-mix(in oklab, var(--dk-acc) 12%, transparent),0 0 0 1px color-mix(in oklab, var(--dk-acc) 6%, transparent)
}
:host([data-theme="dark"]) .ls-seg button[data-tr="kk"][aria-pressed="true"]:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)), :host([data-theme="dark"]) .ls-seg button[data-tr="ru"][aria-pressed="true"]:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-tr)
}
:host([data-theme="dark"]) .ls-seg .dot:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: currentColor
}
:host([data-theme="dark"]) .ls-langbar .hint:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink3)
}
:host([data-theme="dark"]) .ls-sheet:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--l-paper);
    box-shadow: 0 12px 32px color-mix(in oklab, var(--dk-acc) 7%, transparent)
}
:host([data-theme="dark"]) .ls-lead:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink)
}
:host([data-theme="dark"]) .ls-lead b:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-violet)
}
:host([data-theme="dark"]) .ls-rule:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-top: 1px solid var(--l-line)
}
:host([data-theme="dark"]) .ls-rn:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .ls-rule p b:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-violet)
}
:host([data-theme="dark"]) .ls-pat:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--l-violet-t)
}
:host([data-theme="dark"]) .ls-pat span:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-violet)
}
:host([data-theme="dark"]) .ls-pat strong:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink)
}
:host([data-theme="dark"]) .ls-x:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 0;
    border-bottom: 1px solid var(--l-line);
    background: none;
    color: var(--l-ink)
}
:host([data-theme="dark"]) .ls-x .fig:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .ls-x svg:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink3)
}
:host([data-theme="dark"]) .ls-x:hover:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .ls-x:hover svg:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-violet)
}
:host([data-theme="dark"]) .ls-line:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 0;
    background: none;
    border-bottom: 1px solid var(--l-line);
    color: var(--l-ink)
}
:host([data-theme="dark"]) .ls-line .who:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink3)
}
:host([data-theme="dark"]) .ls-line svg:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink3)
}
:host([data-theme="dark"]) .ls-line:hover svg:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-violet)
}
:host([data-theme="dark"]) .ls-hint:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink3)
}
:host([data-theme="dark"]) .ls-note:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-left: 3px solid var(--dk-yellow-line);
    background: var(--l-note-bg)
}
:host([data-theme="dark"]) .ls-note>span:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-note)
}
:host([data-theme="dark"]) .ls-tr:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 1px solid var(--l-tr-line);
    background: var(--l-tr-bg)
}
:host([data-theme="dark"]) .ls-tr .trh:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-tr)
}
:host([data-theme="dark"]) .ls-tr p:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .ls-tr p b:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .ls-tr .trt:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .ls-tr .trx:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-top: 1px dashed var(--l-tr-line)
}
:host([data-theme="dark"]) .ls-trs:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-tr)
}
:host([data-theme="dark"]) .ls-sec:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--l-paper);
    box-shadow: 0 12px 32px color-mix(in oklab, var(--dk-acc) 7%, transparent)
}
:host([data-theme="dark"]) .ls-mis li:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-top: 1px solid var(--l-line)
}
:host([data-theme="dark"]) .ls-mis li:first-child:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-top: 0
}
:host([data-theme="dark"]) .ls-pair .bad:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-bad);
    background: var(--l-bad-bg)
}
:host([data-theme="dark"]) .ls-pair .good:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-good);
    background: var(--l-good-bg)
}
:host([data-theme="dark"]) .ls-pair .arr:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink3)
}
:host([data-theme="dark"]) .ls-mis .why:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink2)
}
:host([data-theme="dark"]) .qc:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-top: 1px solid var(--l-line)
}
:host([data-theme="dark"]) .qc:first-of-type:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-top: 0
}
:host([data-theme="dark"]) .qc-o:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 1.5px solid var(--dk-line);
    background: var(--dk-card);
    color: var(--l-ink)
}
:host([data-theme="dark"]) .qc-o:hover:not([disabled]):not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-color: var(--l-violet)
}
:host([data-theme="dark"]) .qc-o.right:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-color: var(--l-good);
    background: var(--l-good-bg);
    color: var(--l-good)
}
:host([data-theme="dark"]) .qc-o.wrong:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-color: var(--l-bad);
    background: var(--l-bad-bg);
    color: var(--l-bad)
}
:host([data-theme="dark"]) .qc-fb.ok b:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-good)
}
:host([data-theme="dark"]) .qc-fb.no b:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-bad)
}
:host([data-theme="dark"]) .ls-start:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: color-mix(in oklab, var(--dk-card) 96%, transparent);
    box-shadow: 0 10px 30px color-mix(in oklab, var(--dk-acc) 18%, transparent)
}
:host([data-theme="dark"]) .ls-start span:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink2)
}
:host([data-theme="dark"]) .ls-src:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-ink2)
}
:host([data-theme="dark"]) .ls-src a:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--l-violet)
}
@media (max-width:720px) {
    :host([data-theme="dark"]) .ls-rn:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
        color: var(--l-violet)
    }
}
:host([data-theme="dark"]) .res-sub:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .res-note:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--brand)
}
:host([data-theme="dark"]) .res-tip:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .pips i:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--line)
}
:host([data-theme="dark"]) .pips i.on:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--brand)
}
:host([data-theme="dark"]) .pips b:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .rnum:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border: 1.5px solid var(--dk-line);
    background: var(--dk-card);
    color: var(--ink)
}
:host([data-theme="dark"]) .rnum.ok:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-color: var(--dk-green-line);
    background: var(--good-l);
    color: var(--dk-green)
}
:host([data-theme="dark"]) .rnum.cur:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-color: var(--brand);
    box-shadow: 0 0 0 2px var(--brand) inset;
    color: var(--brand-d)
}
:host([data-theme="dark"]) .rnum:hover:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-color: var(--brand)
}
:host([data-theme="dark"]) .res-rounds span:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--bg);
    color: var(--ink2)
}
:host([data-theme="dark"]) .res-rounds span.ok:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--good);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .res-rounds span.cur:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    box-shadow: 0 0 0 2px var(--brand)
}
:host([data-theme="dark"]) .res .panel:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-card);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .review-list:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .modal-bg:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: rgba(20,10,50,.45)
}
:host([data-theme="dark"]) .modal:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-card);
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .toast:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-acc-deep);
    color: #fff;
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .tab.sk:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: none;
    border: 0;
    box-shadow: none
}
:host([data-theme="dark"]) .isl:hover:not([disabled]) .tab.sk:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)), :host([data-theme="dark"]) .isl:focus-visible .tab.sk:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    box-shadow: none
}
:host([data-theme="dark"]) .isl.glow .tab.sk:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    box-shadow: none
}
:host([data-theme="dark"]) .isl.wrongTab .tab.sk:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: none;
    box-shadow: none
}
:host([data-theme="dark"]) .o.digi:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: linear-gradient(180deg,var(--dk-acc-deep),var(--dk-acc-deep));
    border: 4px solid var(--dk-acc);
    color: #7cf7e4;
    text-shadow: 0 0 10px color-mix(in oklab, var(--dk-green) 80%, transparent)
}
:host([data-theme="dark"]) .o.medal .disc:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: radial-gradient(circle at 35% 30%,var(--dk-yellow-tint),var(--dk-yellow) 45%,var(--dk-yellow));
    border: 4px solid var(--dk-yellow-line);
    box-shadow: inset 0 -6px 0 color-mix(in oklab, var(--dk-orange) 35%, transparent);
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .o.medal:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *))::before, :host([data-theme="dark"]) .o.medal:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *))::after {
    background: var(--dk-acc)
}
:host([data-theme="dark"]) .o.medal:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *))::after {
    background: var(--dk-red)
}
:host([data-theme="dark"]) .o.phone:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: linear-gradient(180deg,var(--dk-ink-bg),#0f0f1d);
    border: 4px solid var(--dk-line);
    color: #fff
}
:host([data-theme="dark"]) .o.phone:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *))::before {
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .o.tag:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: linear-gradient(180deg,var(--dk-yellow-tint),var(--dk-yellow));
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .o.tag:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *))::before {
    background: var(--dk-yellow);
    box-shadow: 0 0 0 2px var(--dk-yellow-tint)
}
:host([data-theme="dark"]) .o.cal:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-card);
    border: 3px solid var(--dk-line)
}
:host([data-theme="dark"]) .o.cal b:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: linear-gradient(180deg,var(--dk-red),var(--dk-red));
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .o.cal span:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .o.odo:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: linear-gradient(180deg,var(--dk-acc-deep),var(--dk-acc-deep));
    border: 4px solid var(--dk-yellow-line);
    color: #ffd34d;
    text-shadow: 0 0 12px color-mix(in oklab, var(--dk-yellow) 60%, transparent)
}
:host([data-theme="dark"]) .o.meas:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-card);
    border: 3px solid var(--dk-acc-line);
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .o.road:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-green);
    color: var(--dk-on-bright);
    border: 4px solid var(--dk-line);
    outline: 3px solid var(--dk-green)
}
:host([data-theme="dark"]) .o.pie:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: color-mix(in oklab, var(--dk-card) 96%, transparent);
    border: 3px solid var(--dk-line)
}
:host([data-theme="dark"]) .o.pie i:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .o.ticket:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    background: var(--dk-card);
    border-left: .32em solid var(--dk-acc)
}
:host([data-theme="dark"]) .o.ticket b:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .o.ticket span:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
    color: var(--dk-acc-text)
}
@media (max-width:820px) {
    :host([data-theme="dark"]) .prompt>.rbtn.slow:not(:is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner, .hero *, .world *, .lab-card *, .ls-head *, .cover *, .scene *, .banner *)) {
        box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3)
    }
}
:host([data-theme="dark"]) :is(.hero, .world, .lab-card, .ls-head, .cover, .scene, .banner) {
    color-scheme: light;
    --brand: #874BF8;
    --brand-d: #6a2fe0;
    --brand-l: #efe7ff;
    --ink: #1f1640;
    --ink2: #5b5478;
    --bg: #f6f3ff;
    --card: #fff;
    --good: #1fa65a;
    --good-l: #e3f7eb;
    --bad: #e2453c;
    --bad-l: #fde9e7;
    --gold: #f5b400;
    --line: #e4def5;
    --shadow: 0 10px 30px rgba(60,30,140,.14)
}
:host([data-theme="dark"]) .cover {
    color: var(--ink)
}
:host([data-theme="dark"]) .scene {
    color: var(--ink)
}
`
