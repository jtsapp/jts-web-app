// Тёмный слой «partsofspeech» для Shadow DOM. СГЕНЕРИРОВАН scripts/practice/shadow-dark.js из styles.js раздела —
// руками не править: правки — в SECTIONS генератора. Кладётся в тень ПОСЛЕ светлых стилей.

export const PARTSOFSPEECH_DARK_CSS = `:host([data-theme="dark"]) {
    --brand: var(--dk-acc);
    --brand-ink: var(--dk-acc-text);
    --brand-soft: var(--dk-acc-tint);
    --brand-mist: var(--dk-page);
    --cyan: var(--dk-blue);
    --cyan-2: var(--dk-blue);
    --cyan-ink: var(--dk-blue);
    --cyan-soft: var(--dk-blue-tint);
    --green: var(--dk-green);
    --green-2: var(--dk-green);
    --green-ink: var(--dk-green);
    --green-soft: var(--dk-green-tint);
    --orange: var(--dk-orange);
    --orange-2: var(--dk-orange);
    --orange-ink: var(--dk-red);
    --orange-soft: var(--dk-orange-tint);
    --yellow: var(--dk-yellow-tint);
    --amber: var(--dk-yellow);
    --amber-ink: var(--dk-yellow);
    --amber-soft: var(--dk-yellow-tint);
    --black: var(--dk-text);
    --g70: var(--dk-text-2);
    --g50: var(--dk-raised);
    --g25: var(--dk-raised);
    --bg: var(--dk-page);
    --paper: var(--dk-card);
    --ink: var(--dk-text);
    --ink2: var(--dk-text-2);
    --ink3: var(--dk-text-2);
    --line: var(--dk-line);
    --line2: var(--dk-line);
    --night: var(--dk-acc-deep);
    --night-2: var(--dk-acc-deep);
    --night-3: var(--dk-acc-deep);
    --good-line: var(--dk-green-line);
    --bad-line: var(--dk-orange-line);
    --c-n: var(--dk-blue);
    --c-pr: var(--dk-acc);
    --c-det: var(--dk-green);
    --c-v: var(--dk-red);
    --c-aux: var(--dk-red);
    --c-adj: var(--dk-green);
    --c-adv: var(--dk-orange);
    --c-p: var(--dk-yellow);
    --c-cj: var(--dk-text-2);
    --c-i: var(--dk-red);
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.08),0 8px 24px -12px color-mix(in oklab, var(--dk-acc) 14%, transparent);
    --shadow-up: 0 2px 4px rgba(0, 0, 0, 0.1),0 18px 40px -18px color-mix(in oklab, var(--dk-acc) 30%, transparent)
}
:host([data-theme="dark"]) .posw:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--bg);
    color: var(--ink)
}
:host([data-theme="dark"]) a:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) a:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand)
}
:host([data-theme="dark"]) button:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: inherit
}
:host([data-theme="dark"]) :not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::selection {
    background: var(--dk-acc-soft)
}
:host([data-theme="dark"]) :focus-visible:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    outline: 3px solid var(--cyan-2)
}
:host([data-theme="dark"]) .top:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in oklab, var(--dk-card) 88%, transparent);
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .brand:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .brand-rule:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line)
}
:host([data-theme="dark"]) .menu-btn:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1px solid var(--line);
    background: var(--paper)
}
:host([data-theme="dark"]) .langs:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line2)
}
:host([data-theme="dark"]) .langs button:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 0;
    background: transparent;
    color: var(--ink2)
}
:host([data-theme="dark"]) .langs button:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .langs button[aria-pressed="true"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    color: var(--brand-ink);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16),0 2px 8px -2px color-mix(in oklab, var(--dk-acc) 18%, transparent)
}
:host([data-theme="dark"]) .posw.full nav.side:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.6);
    border-right: 1px solid var(--line)
}
:host([data-theme="dark"]) .side h2:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .side a:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .side a:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line2);
    color: var(--ink)
}
:host([data-theme="dark"]) .side a[aria-current="page"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-soft);
    color: var(--ink)
}
:host([data-theme="dark"]) .side a[aria-current="page"] .num:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .side .num:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--g50)
}
:host([data-theme="dark"]) .side .lv:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .side .done .num:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--green-ink)
}
:host([data-theme="dark"]) .side .done .num:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::after {
    background: var(--green-2)
}
:host([data-theme="dark"]) .side-top a:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .side-top a .num:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand)
}
:host([data-theme="dark"]) .g-navlink:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--night);
    color: #fff !important
}
:host([data-theme="dark"]) .g-navlink:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--night-2) !important
}
:host([data-theme="dark"]) .g-navlink .num:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--yellow) !important
}
:host([data-theme="dark"]) .g-navlink small:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.62)
}
:host([data-theme="dark"]) .side a.g-navlink[aria-current="page"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--night-3)
}
:host([data-theme="dark"]) .kicker:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .lede:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .chip:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1px solid var(--line);
    background: var(--paper);
    color: var(--ink2)
}
:host([data-theme="dark"]) a.chip:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--brand);
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .u-num:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .u-num b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .u-num span:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) details.plan:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) details.plan[open]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) details.plan summary:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    background: var(--brand-soft) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10 7l5 5-5 5' fill='none' stroke='%23874BF8' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/16px no-repeat
}
:host([data-theme="dark"]) .plan-grid h4:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .plan-grid ul:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .tag:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) table:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) table thead th:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-mist);
    color: var(--ink)
}
:host([data-theme="dark"]) th:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) td:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom: 1px solid var(--line2)
}
:host([data-theme="dark"]) tbody tr:last-child td:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom: 0
}
:host([data-theme="dark"]) tbody tr:hover td:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .exs:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .exs:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    background: var(--paper);
    border-left: 1px solid var(--line);
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .exs .s:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .exs .note:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .note-box.warn:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--amber-soft);
    border: 1px solid var(--dk-yellow-line)
}
:host([data-theme="dark"]) .note-box.info:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-mist);
    border: 1px solid var(--dk-acc-line)
}
:host([data-theme="dark"]) .note-box.warn b:first-child:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--amber-ink)
}
:host([data-theme="dark"]) .note-box.info b:first-child:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .cite:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .x:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--bad)
}
:host([data-theme="dark"]) .ok:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--good)
}
:host([data-theme="dark"]) .w:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom: 2.5px solid currentColor
}
:host([data-theme="dark"]) .w-n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--c-n)
}
:host([data-theme="dark"]) .w-pr:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--c-pr)
}
:host([data-theme="dark"]) .w-det:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--c-det)
}
:host([data-theme="dark"]) .w-v:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--c-v)
}
:host([data-theme="dark"]) .w-aux:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--c-aux)
}
:host([data-theme="dark"]) .w-adj:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--c-adj)
}
:host([data-theme="dark"]) .w-adv:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--c-adv)
}
:host([data-theme="dark"]) .w-p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--c-p)
}
:host([data-theme="dark"]) .w-cj:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--c-cj)
}
:host([data-theme="dark"]) .w-i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--c-i)
}
:host([data-theme="dark"]) .w-f:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink);
    border-bottom: 2px dotted var(--ink3)
}
:host([data-theme="dark"]) .legend:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .legend b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .tree:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .tree .cst:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid var(--line);
    background: var(--brand-mist)
}
:host([data-theme="dark"]) .tree .fn:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .tree .ph:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .practice-head:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .practice-head:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    background: var(--brand)
}
:host([data-theme="dark"]) .practice-head p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .act:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .act-h:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom: 1px solid var(--line2)
}
:host([data-theme="dark"]) .act-h .tag:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .act-h p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .prog:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .q-s mark:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-acc-tint);
    color: inherit;
    box-shadow: inset 0 -2px 0 var(--brand)
}
:host([data-theme="dark"]) .opt:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid var(--line);
    background: var(--paper);
    color: var(--ink)
}
:host([data-theme="dark"]) .opt:hover:not([disabled]):not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--brand);
    background: var(--brand-mist)
}
:host([data-theme="dark"]) .opt[aria-pressed="true"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--brand);
    background: var(--brand-soft);
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .opt.right:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--green-2);
    background: var(--good-soft);
    color: var(--good)
}
:host([data-theme="dark"]) .opt.wrong:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--orange-2);
    background: var(--bad-soft);
    color: var(--bad)
}
:host([data-theme="dark"]) .tok:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid transparent;
    background: transparent;
    color: var(--ink)
}
:host([data-theme="dark"]) .tok:hover:not([disabled]):not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line2)
}
:host([data-theme="dark"]) .tok[aria-pressed="true"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-soft);
    border-color: var(--brand)
}
:host([data-theme="dark"]) .tok.right:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--good-soft);
    border-color: var(--green-2)
}
:host([data-theme="dark"]) .tok.wrong:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--bad-soft);
    border-color: var(--orange-2)
}
:host([data-theme="dark"]) .tok.missed:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--green-2)
}
:host([data-theme="dark"]) input.txt:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) textarea.txt:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid var(--line);
    background: var(--paper);
    color: var(--ink)
}
:host([data-theme="dark"]) input.txt:focus:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) textarea.txt:focus:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    outline: none;
    border-color: var(--brand);
    box-shadow: 0 0 0 4px var(--brand-soft)
}
:host([data-theme="dark"]) .base:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .base b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .tiles:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px dashed var(--g25);
    background: var(--brand-mist)
}
:host([data-theme="dark"]) .tile:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid var(--line);
    background: var(--paper);
    box-shadow: 0 2px 0 var(--line)
}
:host([data-theme="dark"]) .tile:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--brand)
}
:host([data-theme="dark"]) .btn:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 0;
    background: var(--brand);
    color: var(--dk-on-acc);
    box-shadow: 0 6px 16px -8px color-mix(in oklab, var(--dk-acc) 70%, transparent)
}
:host([data-theme="dark"]) .btn:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-ink);
    color: #fff
}
:host([data-theme="dark"]) .btn.ghost:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: transparent;
    color: var(--ink);
    border: 1.5px solid var(--line);
    box-shadow: none
}
:host([data-theme="dark"]) .btn.ghost:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--brand);
    color: var(--brand-ink);
    background: var(--brand-mist)
}
:host([data-theme="dark"]) .fb.good:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--good-soft);
    border: 1px solid var(--good-line)
}
:host([data-theme="dark"]) .fb.bad:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--bad-soft);
    border: 1px solid var(--bad-line)
}
:host([data-theme="dark"]) .fb.neutral:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-mist);
    border: 1px solid var(--dk-acc-line)
}
:host([data-theme="dark"]) .fb.good strong:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--good)
}
:host([data-theme="dark"]) .fb.bad strong:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--bad)
}
:host([data-theme="dark"]) .done-card .big:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand)
}
:host([data-theme="dark"]) .check input:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    accent-color: var(--brand)
}
:host([data-theme="dark"]) .wc:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2);
    border-left: 2px solid var(--tl-c,var(--line))
}
:host([data-theme="dark"]) .trl[lang=kk]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    --tl-c: var(--dk-blue-soft)
}
:host([data-theme="dark"]) .trl[lang=ru]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    --tl-c: var(--dk-orange-soft)
}
:host([data-theme="dark"]) .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    color: var(--ink3)
}
:host([data-theme="dark"]) .note-box .trl b:first-child:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .hero .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .door-play .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.8)
}
:host([data-theme="dark"]) .hero .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before, :host([data-theme="dark"]) .door-play .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    color: rgba(255,255,255,.6)
}
:host([data-theme="dark"]) .hero .trl[lang=kk]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .door-play .trl[lang=kk]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    --tl-c: color-mix(in oklab, var(--dk-blue) 70%, transparent)
}
:host([data-theme="dark"]) .hero .trl[lang=ru]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .door-play .trl[lang=ru]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    --tl-c: color-mix(in oklab, var(--dk-orange) 75%, transparent)
}
:host([data-theme="dark"]) .langs button[aria-pressed="true"][data-lang="kk"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--cyan-ink)
}
:host([data-theme="dark"]) .langs button[aria-pressed="true"][data-lang="ru"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--orange-ink)
}
:host([data-theme="dark"]) .pager:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .pager a:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1px solid var(--line);
    background: var(--paper);
    color: var(--ink)
}
:host([data-theme="dark"]) .pager a:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--brand);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .pager a small:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .foot:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-top: 1px solid var(--line);
    color: var(--ink3)
}
:host([data-theme="dark"]) .foot .slogan:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .foot nav a:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .foot nav a:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .hero:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .hero:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    background: radial-gradient(closest-side,color-mix(in oklab, var(--dk-card) 14%, transparent),color-mix(in oklab, var(--dk-card) 0%, transparent))
}
:host([data-theme="dark"]) .hero-mark:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    --logo-k: var(--dk-card);
    --logo-a: var(--dk-card)
}
:host([data-theme="dark"]) .hero .kicker:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.78)
}
:host([data-theme="dark"]) .hero .kicker:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    background: currentColor
}
:host([data-theme="dark"]) .hero h1:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff
}
:host([data-theme="dark"]) .hero h1 em:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--cyan)
}
:host([data-theme="dark"]) .hero .lede:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.88)
}
:host([data-theme="dark"]) .hero .btn:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    color: var(--brand-ink);
    box-shadow: 0 12px 28px -14px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .hero .btn:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-mist);
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .hero .btn.ghost:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: transparent;
    color: #fff;
    border-color: rgba(255,255,255,.45)
}
:host([data-theme="dark"]) .hero .btn.ghost:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: rgba(255,255,255,.1);
    border-color: var(--dk-line);
    color: #fff
}
:host([data-theme="dark"]) .hero-meta:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.75)
}
:host([data-theme="dark"]) .hero-meta b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff
}
:host([data-theme="dark"]) .lw-bub:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff
}
:host([data-theme="dark"]) .lw-core:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .lw-cap:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .lw-cls:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff;
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .lw-says:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    color: var(--ink);
    box-shadow: 0 14px 30px -14px rgba(0, 0, 0, 0.6);
    border: 0
}
:host([data-theme="dark"]) .lw-says small:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .lw-says .k:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom: 2.5px solid currentColor
}
:host([data-theme="dark"]) .lw-dots button:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 0;
    background: rgba(255,255,255,.35)
}
:host([data-theme="dark"]) .lw-dots button[aria-pressed="true"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .door:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink);
    background: var(--paper);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .door:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    box-shadow: var(--shadow-up);
    color: var(--ink)
}
:host([data-theme="dark"]) .door p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .door .go:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .door .go i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .door-read .stats div:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .door-read .stats b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .door-play:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--night);
    color: #fff;
    border-color: var(--night)
}
:host([data-theme="dark"]) .door-play:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff
}
:host([data-theme="dark"]) .door-play .kicker:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--yellow)
}
:host([data-theme="dark"]) .door-play p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.74)
}
:host([data-theme="dark"]) .door-play .go:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff
}
:host([data-theme="dark"]) .door-play .go i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--yellow);
    color: var(--night)
}
:host([data-theme="dark"]) .sec-h p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .toc-g:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .toc-g h3:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .toc-g h3 .sn:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand)
}
:host([data-theme="dark"]) .toc-r:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .toc-r + .toc-r:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-top: 1px solid var(--line2)
}
:host([data-theme="dark"]) .toc-r:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    box-shadow: var(--shadow);
    color: var(--ink)
}
:host([data-theme="dark"]) .toc-r .n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--g25)
}
:host([data-theme="dark"]) .toc-r:hover .n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand)
}
:host([data-theme="dark"]) .toc-r small:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .toc-r .lv:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .toc-r .ar:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand);
    background: var(--brand-soft)
}
:host([data-theme="dark"]) .toc-r.done .n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--green-2)
}
:host([data-theme="dark"]) .sw div:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1px solid rgba(255, 255, 255, 0.084)
}
:host([data-theme="dark"]) .spec:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1px solid var(--line);
    background: var(--paper)
}
:host([data-theme="dark"]) .spec .l:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) {
    --g-on: var(--dk-card);
    --g-sky: var(--dk-acc-tint);
    --g-road: var(--dk-acc-soft)
}
:host([data-theme="dark"]) .g-unitcase:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff;
    background: var(--night)
}
:host([data-theme="dark"]) .g-unitcase:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    box-shadow: var(--shadow-up);
    color: #fff
}
:host([data-theme="dark"]) .g-unitcase:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    background: var(--g-acc);
    color: var(--g-on)
}
:host([data-theme="dark"]) .g-unitcase .kicker:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--yellow)
}
:host([data-theme="dark"]) .g-unitcase span:not(.kicker):not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.7)
}
:host([data-theme="dark"]) .g-unitcase em:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff
}
:host([data-theme="dark"]) .g-hero:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--night);
    color: #fff
}
:host([data-theme="dark"]) .g-hero .kicker:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--yellow)
}
:host([data-theme="dark"]) .g-hero h1:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff
}
:host([data-theme="dark"]) .g-hero .lede:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.78)
}
:host([data-theme="dark"]) .g-stn:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    outline: none
}
:host([data-theme="dark"]) .g-stn:focus-visible .b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    stroke: var(--cyan)
}
:host([data-theme="dark"]) .g-hub-bar:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.75);
    border-top: 1px solid rgba(255,255,255,.08)
}
:host([data-theme="dark"]) .g-hub-bar > span:first-child b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff
}
:host([data-theme="dark"]) .g-hub-bar .btn.ghost:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff;
    border-color: rgba(255,255,255,.28)
}
:host([data-theme="dark"]) .g-hub-bar .btn.ghost:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: rgba(255,255,255,.08);
    border-color: var(--dk-line);
    color: #fff
}
:host([data-theme="dark"]) .g-switch input:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    accent-color: var(--yellow)
}
:host([data-theme="dark"]) .g-case:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1px solid var(--line);
    background: var(--paper);
    color: var(--ink)
}
:host([data-theme="dark"]) .g-case:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    box-shadow: var(--shadow-up);
    border-color: transparent;
    color: var(--ink)
}
:host([data-theme="dark"]) .g-case-e:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--g-acc);
    color: var(--g-on)
}
:host([data-theme="dark"]) .g-case-n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .g-case-p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .g-case-s:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line2);
    color: var(--ink2)
}
:host([data-theme="dark"]) .g-case.closed .g-case-s:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--good-soft);
    color: var(--good)
}
:host([data-theme="dark"]) .g-case.locked:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: transparent;
    box-shadow: none
}
:host([data-theme="dark"]) .g-case.locked:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--g25)
}
:host([data-theme="dark"]) .g-case.locked .g-case-e:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line2);
    color: var(--g50)
}
:host([data-theme="dark"]) .g-case.locked b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .g-back:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .g-back:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .g-who span:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .g-brief-t:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .g-steps button:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1.5px solid var(--line);
    color: var(--ink)
}
:host([data-theme="dark"]) .g-steps button:hover:not([disabled]):not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--g-acc)
}
:host([data-theme="dark"]) .g-steps button[disabled]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: transparent
}
:host([data-theme="dark"]) .g-steps small:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .g-sn:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line2);
    color: var(--ink2)
}
:host([data-theme="dark"]) .g-steps li.on button:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--g-acc);
    box-shadow: 0 0 0 3px color-mix(in srgb,var(--g-acc) 22%,transparent)
}
:host([data-theme="dark"]) .g-steps li.on .g-sn:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--g-acc);
    color: var(--g-on)
}
:host([data-theme="dark"]) .g-steps li.done .g-sn:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--green-2);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .g-stage:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .g-stage-h .kicker:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--g-ink)
}
:host([data-theme="dark"]) .g-intro:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .g-prog:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .g-prog-b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line2)
}
:host([data-theme="dark"]) .g-prog-b i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--g-acc)
}
:host([data-theme="dark"]) .g-tag:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--amber-soft);
    color: var(--amber-ink)
}
:host([data-theme="dark"]) .g-task:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .g-task mark:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .g-doc mark:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-soft);
    color: var(--brand-ink);
    box-shadow: inset 0 -2px 0 var(--brand)
}
:host([data-theme="dark"]) .g-count:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--g-ink)
}
:host([data-theme="dark"]) .g-doc:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-mist);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .g-w:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .g-cand:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: transparent;
    border: 0;
    color: inherit
}
:host([data-theme="dark"]) .g-w:hover:not([disabled]):not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .g-cand:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .g-w.found:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--good-soft);
    color: var(--good);
    box-shadow: inset 0 -2px 0 var(--green-2)
}
:host([data-theme="dark"]) .g-w.wrong:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .g-cand.wrong:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--bad-soft)
}
:host([data-theme="dark"]) .g-cand:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom: 2px dotted var(--g50)
}
:host([data-theme="dark"]) .g-cand.right:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--good-soft);
    border-bottom-color: var(--green-2)
}
:host([data-theme="dark"]) .g-note.ok:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--good-soft)
}
:host([data-theme="dark"]) .g-note.bad:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--bad-soft)
}
:host([data-theme="dark"]) .g-card:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1.5px solid var(--line);
    box-shadow: var(--shadow-up)
}
:host([data-theme="dark"]) .g-card-c:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .g-bin:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px dashed var(--g25);
    background: var(--paper);
    color: var(--ink)
}
:host([data-theme="dark"]) .g-bin:hover:not([disabled]):not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .g-bin.over:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--g-acc);
    background: var(--brand-mist)
}
:host([data-theme="dark"]) .g-bin.right:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--green-2);
    background: var(--good-soft);
    color: var(--good)
}
:host([data-theme="dark"]) .g-bin.wrong:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--orange-2);
    background: var(--bad-soft);
    color: var(--bad)
}
:host([data-theme="dark"]) .g-sent mark:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-acc-tint);
    box-shadow: inset 0 -2px 0 var(--brand)
}
:host([data-theme="dark"]) .g-slot:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom: 2.5px solid var(--g-acc);
    color: var(--g-ink)
}
:host([data-theme="dark"]) .g-slot.ok:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--good);
    border-color: var(--green-2)
}
:host([data-theme="dark"]) .g-slot.fix:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--bad);
    border-color: var(--orange-2)
}
:host([data-theme="dark"]) .g-base:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .g-base b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .g-chip:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid var(--line);
    background: var(--paper)
}
:host([data-theme="dark"]) .g-chip:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--g-acc)
}
:host([data-theme="dark"]) .g-hint:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: none;
    border: 0;
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .g-hinttext:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2);
    background: var(--brand-mist)
}
:host([data-theme="dark"]) .g-faultline .g-w:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom: 1px dashed transparent
}
:host([data-theme="dark"]) .g-faultline .g-w:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom-color: var(--g50)
}
:host([data-theme="dark"]) .g-line:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line2)
}
:host([data-theme="dark"]) .g-line b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .g-line.me:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .g-line.me b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.72)
}
:host([data-theme="dark"]) .g-strip:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px dashed var(--g25);
    background: var(--brand-mist)
}
:host([data-theme="dark"]) .g-strip.ok:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--green-2);
    background: var(--good-soft)
}
:host([data-theme="dark"]) .g-strip.bad:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--orange-2);
    background: var(--bad-soft)
}
:host([data-theme="dark"]) .g-fb.good:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--good-soft);
    border: 1px solid var(--good-line)
}
:host([data-theme="dark"]) .g-fb.bad:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--bad-soft);
    border: 1px solid var(--bad-line)
}
:host([data-theme="dark"]) .g-fb.good strong:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--good)
}
:host([data-theme="dark"]) .g-fb.bad strong:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--bad)
}
:host([data-theme="dark"]) .g-again:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .g-plan:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .g-spot:hover rect:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .g-spot:focus rect:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    stroke: var(--g-acc)
}
:host([data-theme="dark"]) .g-spot.right rect:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    fill: var(--good-soft);
    stroke: var(--green-2)
}
:host([data-theme="dark"]) .g-spot.wrong rect:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    fill: var(--bad-soft);
    stroke: var(--orange-2)
}
:host([data-theme="dark"]) .g-brief-mini:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .g-ph:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid var(--line);
    background: var(--paper)
}
:host([data-theme="dark"]) .g-ph:hover:not([disabled]):not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--g-acc)
}
:host([data-theme="dark"]) .g-ph-l:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--g-ink)
}
:host([data-theme="dark"]) .g-ph-w:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .g-ph.right:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--green-2);
    background: var(--good-soft)
}
:host([data-theme="dark"]) .g-ph.wrong:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--orange-2);
    background: var(--bad-soft)
}
:host([data-theme="dark"]) .g-legend:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .g-learned:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-mist);
    border: 1px solid var(--dk-acc-line)
}
:host([data-theme="dark"]) .g-sum:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .g-closed .kicker:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--green-ink)
}
@container posw (max-width:1180px) {
    :host([data-theme="dark"]) .toc-g h3 .sn:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
        color: var(--brand-ink)
    }
}
@container posw (max-width:980px) {
    :host([data-theme="dark"]) nav.side:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
        background: var(--paper);
        box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.6);
        border-right: 1px solid var(--line)
    }
}
:host([data-theme="dark"]) .tabs:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line2)
}
:host([data-theme="dark"]) .tabs a:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .tabs a:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .tabs a[aria-current="page"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand);
    color: var(--dk-on-acc);
    box-shadow: 0 4px 12px -6px color-mix(in oklab, var(--dk-acc) 80%, transparent)
}
:host([data-theme="dark"]) .tabs a[data-tab="play"][aria-current="page"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--night);
    box-shadow: 0 4px 12px -6px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .u-num em:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .ls-head p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .ls-stage:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1px solid var(--line);
    border-bottom: 0;
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .ls-strip:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line);
    border-top: 0;
    border-bottom: 0
}
:host([data-theme="dark"]) .ls-w:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 0;
    background: transparent;
    color: var(--ink);
    border-bottom: 3px solid var(--wc)
}
:host([data-theme="dark"]) .ls-w small:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--wc)
}
:host([data-theme="dark"]) .ls-w:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-mist)
}
:host([data-theme="dark"]) .ls-w.on:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in srgb,var(--wc) 14%,var(--dk-card))
}
:host([data-theme="dark"]) .ls-w.rel:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line2)
}
:host([data-theme="dark"]) .ls-cap:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line);
    border-top: 1px solid var(--line2)
}
:host([data-theme="dark"]) .ls-wall-b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    fill: var(--dk-acc-text)
}
:host([data-theme="dark"]) .ls-scene.is-old .ls-wall-b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    fill: var(--dk-acc-text)
}
:host([data-theme="dark"]) .ls-scene.fx-wall .ls-wall-b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    fill: #FFAD00
}
:host([data-theme="dark"]) .g-go:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--yellow);
    color: var(--night);
    box-shadow: 0 10px 26px -12px color-mix(in oklab, var(--dk-yellow) 60%, transparent)
}
:host([data-theme="dark"]) .g-go:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    color: var(--night)
}
:host([data-theme="dark"]) .g-snd:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: transparent;
    border: 1.5px solid rgba(255,255,255,.28);
    color: #fff
}
:host([data-theme="dark"]) .g-snd:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--dk-line)
}
:host([data-theme="dark"]) .g-case.next:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--g-acc);
    box-shadow: 0 0 0 3px color-mix(in srgb,var(--g-acc) 20%,transparent)
}
:host([data-theme="dark"]) .g-case.next .g-case-s:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--g-acc);
    color: var(--g-on)
}
:host([data-theme="dark"]) .g-crumbs a:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink);
    background: var(--paper);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .g-crumbs a:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--brand);
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .g-clue:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 0;
    background: transparent
}
:host([data-theme="dark"]) .g-clue span:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-yellow-tint);
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--dk-yellow) 60%, transparent)
}
:host([data-theme="dark"]) .g-clue.got span:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-green)
}
:host([data-theme="dark"]) .g-clue-n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff;
    background: rgba(20,12,43,.7)
}
:host([data-theme="dark"]) .g-clue-pop:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: var(--shadow-up)
}
:host([data-theme="dark"]) .g-clue-pop b:first-child:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .g-clue-x:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 0;
    background: transparent;
    color: var(--ink3)
}
:host([data-theme="dark"]) .g-clue-x:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line2)
}
:host([data-theme="dark"]) .g-howbtn:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid var(--line);
    background: var(--paper);
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .g-howbtn:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--brand)
}
:host([data-theme="dark"]) .g-do:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .g-tip:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .g-tip b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--amber-ink);
    background: var(--amber-soft)
}
:host([data-theme="dark"]) .g-how.g-how-float:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in oklab, var(--dk-page) 92%, transparent)
}
:host([data-theme="dark"]) .g-how-card:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-up)
}
:host([data-theme="dark"]) .g-how-steps li:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::marker {
    color: var(--brand)
}
:host([data-theme="dark"]) .g-demo:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-mist);
    border: 1px solid var(--dk-acc-line)
}
:host([data-theme="dark"]) .dm-ptr:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in oklab, var(--dk-acc) 45%, transparent);
    border: 2px solid var(--dk-acc)
}
:host([data-theme="dark"]) .dm-card:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    border: 1.5px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .dm-bin:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px dashed var(--g25);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .dm-gap:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom: 2.5px solid var(--brand)
}
:host([data-theme="dark"]) .dm-bad:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--bad)
}
:host([data-theme="dark"]) .dm-fix:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--good)
}
:host([data-theme="dark"]) .dm-pill:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .g-demo mark:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-acc-tint);
    box-shadow: inset 0 -2px 0 var(--brand)
}
:host([data-theme="dark"]) .dm-b1:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .dm-b2:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .dm-b2:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand);
    color: var(--dk-on-acc);
    border: 0
}
:host([data-theme="dark"]) .dm-tile:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    border: 1.5px solid var(--line);
    box-shadow: 0 2px 0 var(--line)
}
:host([data-theme="dark"]) .dm-house:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    border: 1.5px solid var(--g25)
}
:host([data-theme="dark"]) .dm-pin:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--orange-2)
}
:host([data-theme="dark"]) .dm-ph:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    border: 1.5px solid var(--line)
}
:host([data-theme="dark"]) .dm-ph b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .g-hunt-bar:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .g-hunt-bar .g-count:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .g-hunt-bar b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--g-ink)
}
:host([data-theme="dark"]) .g-lights:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid var(--line);
    background: var(--paper)
}
:host([data-theme="dark"]) .g-item:has(.g-torch):not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--night)
}
:host([data-theme="dark"]) .g-item:has(.g-torch) .g-hunt-bar:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.75)
}
:host([data-theme="dark"]) .g-item:has(.g-torch) .g-hunt-bar b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--yellow)
}
:host([data-theme="dark"]) .g-item:has(.g-torch) .g-count:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.8)
}
:host([data-theme="dark"]) .g-item:has(.g-torch) .g-lights:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: transparent;
    color: #fff;
    border-color: rgba(255,255,255,.3)
}
:host([data-theme="dark"]) .g-pin:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--green-2);
    border: 3px solid var(--dk-line);
    box-shadow: 0 6px 12px -4px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .g-pin.bad:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--orange-2)
}
:host([data-theme="dark"]) .g-typing i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--g50)
}
:host([data-theme="dark"]) .g-strip:empty:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    color: var(--ink3)
}
:host([data-theme="dark"]) .g-stamp:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--green-ink);
    border: 3px solid var(--green-2)
}
:host([data-theme="dark"]) .sp-bright:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    fill: var(--dk-acc-text)
}
:host([data-theme="dark"]) .sp-darken:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    fill: var(--dk-text)
}
:host([data-theme="dark"]) .g-plan:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) {
    --dusk: var(--dk-acc-deep);
    --dusk-2: var(--dk-acc-strong);
    --dusk-3: var(--dk-acc-strong);
    --mist: var(--dk-page);
    --mist-2: var(--dk-acc-tint);
    --bg: var(--dk-page);
    --line: var(--dk-acc-line);
    --line2: var(--dk-acc-line);
    --shadow: 0 1px 2px color-mix(in oklab, var(--dk-acc) 5%, transparent),0 10px 30px -14px color-mix(in oklab, var(--dk-acc) 22%, transparent);
    --shadow-up: 0 2px 6px color-mix(in oklab, var(--dk-acc) 6%, transparent),0 26px 50px -22px color-mix(in oklab, var(--dk-acc) 42%, transparent);
    --guide-c: var(--dk-acc)
}
:host([data-theme="dark"]) .posw:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--bg);
    background-image: radial-gradient(1200px 500px at 85% -10%,color-mix(in oklab, var(--dk-acc) 10%, transparent),transparent 60%),radial-gradient(900px 500px at -10% 30%,color-mix(in oklab, var(--dk-blue) 6%, transparent),transparent 60%)
}
:host([data-theme="dark"]) .top:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in oklab, var(--dk-card) 82%, transparent);
    border-bottom: 1px solid color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .brand-name:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .brand-name em:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand)
}
:host([data-theme="dark"]) .tabs:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--mist-2)
}
:host([data-theme="dark"]) .tabs a[data-tab="play"][aria-current="page"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dusk)
}
:host([data-theme="dark"]) .langs:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--mist-2)
}
:host([data-theme="dark"]) .nav-world:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line);
    color: var(--ink) !important
}
:host([data-theme="dark"]) .nav-world-i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .nav-r.here:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .nav-r-h:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .nav-r-h small:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .nav-r-img:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12)
}
:host([data-theme="dark"]) .side a[aria-current="page"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand-soft)
}
:host([data-theme="dark"]) .btn.glass:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: rgba(255,255,255,.16);
    color: #fff;
    border: 1.5px solid var(--dk-line);
    box-shadow: none
}
:host([data-theme="dark"]) .btn.glass:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: rgba(255,255,255,.28);
    color: #fff
}
:host([data-theme="dark"]) .w-tile:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in oklab, var(--dk-card) 93%, transparent);
    color: var(--wc);
    box-shadow: 0 12px 26px -12px rgba(0, 0, 0, 0.6),0 0 0 1px rgba(255,255,255,.6)
}
:host([data-theme="dark"]) .w-tile b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom: 2.5px solid currentColor
}
:host([data-theme="dark"]) .w-tile:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .w-tile.flip:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .w-route:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    background: repeating-linear-gradient(180deg,var(--brand) 0 12px,transparent 12px 24px)
}
:host([data-theme="dark"]) .w-stop-n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    color: var(--brand-ink);
    box-shadow: 0 8px 20px -10px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .w-stop.done .w-stop-n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--green-2);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .w-stop-guide:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    box-shadow: 0 0 0 4px rgba(255,255,255,.7),0 12px 24px -10px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .w-here:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--yellow);
    color: var(--night);
    box-shadow: 0 8px 20px -10px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .w-stop-t .kicker:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--rc)
}
:host([data-theme="dark"]) .w-stop-p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .w-stop-u a:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line);
    color: var(--ink)
}
:host([data-theme="dark"]) .w-stop-u a:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--brand);
    box-shadow: var(--shadow);
    color: var(--ink)
}
:host([data-theme="dark"]) .w-stop-u .n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--g25)
}
:host([data-theme="dark"]) .w-stop-u a.done .n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--green-2)
}
:host([data-theme="dark"]) .w-stop-u .lv:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .u-hero-shade:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: linear-gradient(90deg,color-mix(in oklab, var(--dk-acc) 82%, transparent),color-mix(in oklab, var(--dk-acc) 45%, transparent) 50%,color-mix(in oklab, var(--dk-acc) 5%, transparent) 80%),linear-gradient(0deg,color-mix(in oklab, var(--dk-acc) 45%, transparent),transparent 50%)
}
:host([data-theme="dark"]) .u-crumbs a:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.86);
    background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.22)
}
:host([data-theme="dark"]) .u-crumbs a:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: rgba(255,255,255,.26);
    color: #fff
}
:host([data-theme="dark"]) .u-crumbs span:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.6)
}
:host([data-theme="dark"]) .u-say:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 18px 40px -18px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .u-say b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--guide-c)
}
:host([data-theme="dark"]) .u-say .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .u-rail:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in oklab, var(--dk-card) 88%, transparent);
    border: 1px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .u-rail-k:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .u-rail a:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .u-rail a span:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .u-rail a:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--line2);
    color: var(--ink)
}
:host([data-theme="dark"]) .u-rail a.on:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .u-rail a.on span:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.75)
}
:host([data-theme="dark"]) .u-rail a.u-rail-p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dusk);
    color: #fff
}
:host([data-theme="dark"]) .u-rail a.u-rail-p.on:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand)
}
:host([data-theme="dark"]) details.plan:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper)
}
:host([data-theme="dark"]) .legend:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .legend-top>b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .lg-k:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid var(--line);
    background: var(--paper);
    color: var(--ink)
}
:host([data-theme="dark"]) .lg-k i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--wc)
}
:host([data-theme="dark"]) .lg-k:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .lg-k[aria-pressed="true"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--wc);
    background: color-mix(in srgb,var(--wc) 9%,var(--dk-card))
}
:host([data-theme="dark"]) .legend-hint:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .lbl-sw:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .sw-ui:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--g25)
}
:host([data-theme="dark"]) .sw-ui:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::after {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .lbl-sw input:checked+.sw-ui:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand)
}
:host([data-theme="dark"]) .lbl-sw input:focus-visible+.sw-ui:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    outline: 3px solid var(--cyan-2)
}
:host([data-theme="dark"]) [data-hl="n"] .w-n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) [data-hl="pr"] .w-pr:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) [data-hl="det"] .w-det:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) [data-hl="v"] .w-v:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) [data-hl="aux"] .w-aux:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) [data-hl="adj"] .w-adj:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) [data-hl="adv"] .w-adv:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) [data-hl="p"] .w-p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) [data-hl="cj"] .w-cj:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) [data-hl="i"] .w-i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) [data-hl="f"] .w-f:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in srgb,currentColor 12%,transparent)
}
:host([data-theme="dark"]) .isle-x:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .isle-x figcaption p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .isle-x .isle-all[aria-pressed="true"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand);
    color: var(--dk-on-acc);
    border-color: var(--brand)
}
:host([data-theme="dark"]) .isle-pt:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 0;
    background: transparent
}
:host([data-theme="dark"]) .isle-dot:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    box-shadow: 0 0 0 4px color-mix(in srgb,var(--wc) 55%,transparent),0 0 18px 6px rgba(255,255,255,.65)
}
:host([data-theme="dark"]) .isle-w:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    color: var(--wc);
    box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .isle-w b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom: 2.5px solid currentColor
}
:host([data-theme="dark"]) .isle-pt.on .isle-dot:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--wc);
    box-shadow: 0 0 0 5px var(--dk-card),0 0 22px 8px rgba(255,255,255,.7)
}
:host([data-theme="dark"]) .isle-cap:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-top: 1px solid var(--line2)
}
:host([data-theme="dark"]) .isle-face:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--mist)
}
:host([data-theme="dark"]) .isle-says:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .isle-ex:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .isle-ex b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--wc,var(--brand));
    border-bottom: 2.5px solid currentColor
}
:host([data-theme="dark"]) .isle-cls:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff;
    background: var(--wc)
}
:host([data-theme="dark"]) .ex-n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink);
    background: var(--brand-soft)
}
:host([data-theme="dark"]) .exs:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    box-shadow: var(--shadow);
    border-color: var(--line);
    background: linear-gradient(180deg,var(--dk-card),var(--dk-card))
}
:host([data-theme="dark"]) .note-box.info:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--mist);
    border-color: var(--dk-acc-line)
}
:host([data-theme="dark"]) table:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .practice-head:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 0;
    background: linear-gradient(135deg,var(--dusk),var(--dusk-3));
    color: #fff
}
:host([data-theme="dark"]) .practice-head .kicker:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--yellow)
}
:host([data-theme="dark"]) .practice-head h2:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff
}
:host([data-theme="dark"]) .practice-head h2 .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.8)
}
:host([data-theme="dark"]) .practice-head p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.82)
}
:host([data-theme="dark"]) .practice-head .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.78)
}
:host([data-theme="dark"]) .practice-head .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    color: rgba(255,255,255,.55)
}
:host([data-theme="dark"]) .ph-face:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in oklab, var(--dk-card) 95%, transparent);
    box-shadow: 0 0 0 4px rgba(255,255,255,.25)
}
:host([data-theme="dark"]) .act:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--line)
}
:host([data-theme="dark"]) .act:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .q-s mark:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .g-sent mark:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .fb:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before, :host([data-theme="dark"]) .g-fb:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
    background: var(--dk-card) var(--guide-face) center 30%/cover no-repeat;
    box-shadow: 0 0 0 3px var(--dk-card),0 6px 14px -6px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .u-quest-t>span:not(.kicker):not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.75)
}
:host([data-theme="dark"]) .foot-face:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--mist);
    border: 2px solid var(--dk-line);
    box-shadow: 0 4px 10px -6px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .q-hero-shade:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: linear-gradient(90deg,rgba(20,12,43,.9),rgba(30,20,66,.72) 45%,rgba(255, 255, 255, 0.2) 75%),linear-gradient(0deg,rgba(20,12,43,.6),transparent 50%)
}
:host([data-theme="dark"]) .q-go:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.78)
}
:host([data-theme="dark"]) .q-meter:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: rgba(255,255,255,.18)
}
:host([data-theme="dark"]) .q-meter span:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--yellow)
}
:host([data-theme="dark"]) .q-say:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 18px 40px -18px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .q-say b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--guide-c)
}
:host([data-theme="dark"]) .q-isle:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .q-isle-face:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    box-shadow: 0 0 0 3px rgba(255,255,255,.7)
}
:host([data-theme="dark"]) .q-isle-t .kicker:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--rc)
}
:host([data-theme="dark"]) .g-case-p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .q-dossier a:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .g-scene:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::after {
    background: linear-gradient(0deg,var(--dusk),transparent)
}
:host([data-theme="dark"]) .g-mate:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--mist);
    border: 1px solid var(--dk-acc-line)
}
:host([data-theme="dark"]) .g-mate img:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .g-mate p:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .g-mate b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--guide-c)
}
@container posw (max-width:980px) {
    :host([data-theme="dark"]) .w-stop:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
        background: var(--paper);
        border: 4px solid var(--brand)
    }
    :host([data-theme="dark"]) .w-stop.done:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *))::before {
        background: var(--green-2);
        border-color: var(--green-2)
    }
}
:host([data-theme="dark"]) .w-hero-shade:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: linear-gradient(90deg,color-mix(in oklab, var(--dk-acc) 78%, transparent) 0%,color-mix(in oklab, var(--dk-acc) 55%, transparent) 26%,color-mix(in oklab, var(--dk-acc) 0%, transparent) 50%)
}
:host([data-theme="dark"]) .w-prog:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.85)
}
:host([data-theme="dark"]) .w-prog span:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: rgba(255,255,255,.25)
}
:host([data-theme="dark"]) .w-prog i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--yellow)
}
:host([data-theme="dark"]) .w-tile:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in oklab, var(--dk-card) 94%, transparent);
    color: var(--wc);
    box-shadow: 0 12px 26px -12px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .w-tile b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-bottom: 2.5px solid currentColor
}
@container posw (max-width:900px) {
    :host([data-theme="dark"]) .w-hero-t:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
        background: var(--dusk)
    }
}
:host([data-theme="dark"]) .w-stop-u .go:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand)
}
:host([data-theme="dark"]) .w-stop-u a.done .go:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--green-2)
}
:host([data-theme="dark"]) .w-stop-u a.next:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px var(--brand-soft)
}
:host([data-theme="dark"]) .u-back:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff;
    background: rgba(255,255,255,.16);
    border: 1px solid rgba(255,255,255,.3)
}
:host([data-theme="dark"]) .u-back:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: rgba(255,255,255,.3);
    color: #fff
}
:host([data-theme="dark"]) .u-lv:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff;
    border: 1px solid rgba(255,255,255,.45)
}
:host([data-theme="dark"]) .isle-all:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 0;
    background: color-mix(in oklab, var(--dk-card) 92%, transparent);
    color: var(--brand-ink);
    box-shadow: 0 8px 20px -10px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .isle-all[aria-pressed="true"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .q-stat:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.85)
}
:host([data-theme="dark"]) .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2);
    border-left: 2px solid var(--tl-c)
}
:host([data-theme="dark"]) .trl[lang=kk]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    --tl-c: var(--dk-blue)
}
:host([data-theme="dark"]) .trl[lang=ru]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    --tl-c: var(--dk-orange)
}
:host([data-theme="dark"]) h1 .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) h2 .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) h3 .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .trl.trl-h:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-left: 0;
    color: var(--ink2)
}
:host([data-theme="dark"]) .term-tl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .topic-ico:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    color: var(--tc);
    box-shadow: 0 12px 26px -12px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .topic-ico svg:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    fill: none;
    stroke: currentColor
}
:host([data-theme="dark"]) .w-stop-u a:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-left: 0
}
:host([data-theme="dark"]) .t-ico:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in srgb,var(--tc) 11%,var(--dk-card));
    color: var(--tc)
}
:host([data-theme="dark"]) .t-ico svg:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .n-ico svg:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    fill: none;
    stroke: currentColor
}
:host([data-theme="dark"]) .w-stop-u .t:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .w-stop-u a.is-pos .t .term-en:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--tc)
}
:host([data-theme="dark"]) .w-stop-u a:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--tc)
}
:host([data-theme="dark"]) .n-ico:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: color-mix(in srgb,var(--tc) 11%,var(--dk-card));
    color: var(--tc)
}
:host([data-theme="dark"]) .nt:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .side a[aria-current="page"] .nt:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .lg-t .term-en:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--wc)
}
:host([data-theme="dark"]) .pg-t:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .u-hero-shade:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: linear-gradient(90deg,color-mix(in oklab, var(--dk-acc) 88%, transparent),color-mix(in oklab, var(--dk-acc) 62%, transparent) 48%,color-mix(in oklab, var(--dk-acc) 12%, transparent) 80%),linear-gradient(0deg,color-mix(in oklab, var(--dk-acc) 50%, transparent),transparent 55%)
}
:host([data-theme="dark"]) .u-def:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.93);
    text-shadow: 0 1px 10px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .u-def .trl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.8);
    border-left-color: var(--dk-line)
}
:host([data-theme="dark"]) .btn svg:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    fill: none;
    stroke: currentColor
}
:host([data-theme="dark"]) .btn:disabled:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    box-shadow: none
}
:host([data-theme="dark"]) .btn:focus-visible:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .mode-b:focus-visible:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)), :host([data-theme="dark"]) .step:focus-visible:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    outline: 3px solid var(--cyan-2,#0AC7FF)
}
:host([data-theme="dark"]) .mode-b:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid var(--line);
    background: color-mix(in oklab, var(--dk-card) 60%, transparent);
    color: var(--ink2)
}
:host([data-theme="dark"]) .mode-b:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border-color: var(--brand);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .mode-i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--mist-2);
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .mode-i svg:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    fill: none;
    stroke: currentColor
}
:host([data-theme="dark"]) .mode-n .term-en:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .mode-t small:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .mode-l[aria-selected="true"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    border-color: var(--brand);
    box-shadow: 0 0 0 4px var(--brand-soft),var(--shadow);
    color: var(--ink)
}
:host([data-theme="dark"]) .mode-l[aria-selected="true"] .mode-i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .mode-p .mode-i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-yellow-tint);
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .mode-p[aria-selected="true"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dusk);
    border-color: var(--dusk);
    box-shadow: 0 18px 36px -18px color-mix(in oklab, var(--dk-acc) 70%, transparent)
}
:host([data-theme="dark"]) .mode-p[aria-selected="true"] .mode-i:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--yellow);
    color: var(--night)
}
:host([data-theme="dark"]) .mode-p[aria-selected="true"] .mode-n .term-en:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff
}
:host([data-theme="dark"]) .mode-p[aria-selected="true"] .mode-n .term-tl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.8)
}
:host([data-theme="dark"]) .mode-p[aria-selected="true"] .mode-t small:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.7)
}
:host([data-theme="dark"]) .ready:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--paper);
    border: 1px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .ready-list>span:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--mist);
    color: var(--ink)
}
:host([data-theme="dark"]) .a-ico:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .a-ico svg:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    fill: none;
    stroke: currentColor
}
:host([data-theme="dark"]) .btn-practice:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dusk);
    color: #fff
}
:host([data-theme="dark"]) .btn-practice:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--brand);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .btn-practice svg:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--yellow)
}
:host([data-theme="dark"]) .mv-practice:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: linear-gradient(160deg,var(--dusk) 0%,var(--dk-acc-strong) 60%,var(--dk-acc-strong) 100%);
    color: #fff;
    box-shadow: 0 30px 60px -36px color-mix(in oklab, var(--dk-acc) 80%, transparent)
}
:host([data-theme="dark"]) .pr-head .ph-face:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .pr-k:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--yellow)
}
:host([data-theme="dark"]) .pr-topic:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: #fff
}
:host([data-theme="dark"]) .pr-topic .term-tl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: rgba(255,255,255,.82)
}
:host([data-theme="dark"]) .step:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    border: 1.5px solid rgba(255,255,255,.18);
    background: rgba(255,255,255,.07);
    color: #fff
}
:host([data-theme="dark"]) .step:hover:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: rgba(255,255,255,.14)
}
:host([data-theme="dark"]) .step[aria-selected="true"]:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    color: var(--ink);
    border-color: var(--dk-line);
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--dk-yellow) 55%, transparent)
}
:host([data-theme="dark"]) .step-n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: rgba(255,255,255,.16)
}
:host([data-theme="dark"]) .step[aria-selected="true"] .step-n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dusk);
    color: #fff
}
:host([data-theme="dark"]) .step.done .step-n:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--green-2);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .step .a-ico:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: rgba(255,255,255,.14);
    color: #fff
}
:host([data-theme="dark"]) .step[aria-selected="true"] .a-ico:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--mist);
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .step-do .term-tl:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: inherit
}
:host([data-theme="dark"]) .mv-practice .act:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--dk-card);
    color: var(--ink);
    border: 0;
    box-shadow: 0 24px 50px -30px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .act-do:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    background: var(--mist);
    color: var(--brand-ink)
}
:host([data-theme="dark"]) .act-in:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .side .lv:not(:is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch), .w-hero *, .q-hero *, .u-hero *, .g-banner *, .w-stop-art *, .q-isle-art *, .isle-stage *, .u-quest *, .w-stop-q *, .g-item:has(.g-torch) *)) {
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) :is(.w-hero, .q-hero, .u-hero, .g-banner, .w-stop-art, .q-isle-art, .isle-stage, .u-quest, .w-stop-q, .g-item:has(.g-torch)) {
    color-scheme: light;
    --brand: #874BF8;
    --brand-ink: #6E35E8;
    --brand-soft: #F2ECFF;
    --brand-mist: #F8F5FF;
    --cyan: #0AC7FF;
    --cyan-2: #0AAFFF;
    --cyan-ink: #0070A8;
    --cyan-soft: #E2F7FF;
    --green: #00E641;
    --green-2: #00D441;
    --green-ink: #08773A;
    --green-soft: #E3FAEA;
    --orange: #FF7D1D;
    --orange-2: #FF631E;
    --orange-ink: #BF3E0B;
    --orange-soft: #FFEEE3;
    --yellow: #FFF805;
    --amber: #FFAD00;
    --amber-ink: #875600;
    --amber-soft: #FFF5D9;
    --black: #000;
    --g70: #4E4B4B;
    --g50: #8B8787;
    --g25: #C4C3C3;
    --bg: #FAF9FD;
    --paper: #FFFFFF;
    --ink: #121017;
    --ink2: #4E4B4B;
    --ink3: #716D6D;
    --line: #E8E5F0;
    --line2: #F1EFF6;
    --night: #140C2B;
    --night-2: #1E1442;
    --night-3: #2B1C5E;
    --good-line: #9BE3B4;
    --bad-line: #FFC4A1;
    --c-n: #1D5FC4;
    --c-pr: #7A3FC7;
    --c-det: #0B7F7A;
    --c-v: #C8293E;
    --c-aux: #8E2A63;
    --c-adj: #1E7F34;
    --c-adv: #B85A00;
    --c-p: #6B5634;
    --c-cj: #4B5563;
    --c-i: #C2367D;
    --shadow: 0 1px 2px rgba(18,16,23,.04),0 8px 24px -12px rgba(46,24,110,.14);
    --shadow-up: 0 2px 4px rgba(18,16,23,.05),0 18px 40px -18px rgba(46,24,110,.30);
    --g-on: #fff;
    --g-sky: #EDE6FF;
    --g-road: #D6C6FF;
    --dusk: #2A1670;
    --dusk-2: #3B1F94;
    --dusk-3: #5B33D6;
    --mist: #F4F0FE;
    --mist-2: #ECE5FD;
    --bg: #F7F4FE;
    --line: #E6DFF7;
    --line2: #F0EBFB;
    --shadow: 0 1px 2px rgba(42,22,112,.05),0 10px 30px -14px rgba(42,22,112,.22);
    --shadow-up: 0 2px 6px rgba(42,22,112,.06),0 26px 50px -22px rgba(42,22,112,.42);
    --guide-c: #874BF8
}
:host([data-theme="dark"]) .g-item:has(.g-torch) {
    color: var(--ink)
}
:host([data-theme="dark"]){--yellow:var(--dk-yellow)}
`
