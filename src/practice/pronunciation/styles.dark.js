// Тёмный слой «pronunciation» для Shadow DOM. СГЕНЕРИРОВАН scripts/practice/shadow-dark.js из styles.js раздела —
// руками не править: правки — в SECTIONS генератора. Кладётся в тень ПОСЛЕ светлых стилей.

export const PRONUNCIATION_DARK_CSS = `:host([data-theme="dark"]) {
    --violet: var(--dk-acc);
    --cyan: var(--dk-blue);
    --cyan-2: var(--dk-blue);
    --green: var(--dk-green);
    --orange: var(--dk-orange);
    --yellow: var(--dk-yellow);
    --night: var(--dk-acc-deep);
    --night-2: var(--dk-acc-deep);
    --night-3: var(--dk-acc-strong);
    --paper: var(--dk-page);
    --surface: var(--dk-card);
    --ink: var(--dk-text);
    --ink-2: var(--dk-text-2);
    --line: var(--dk-acc-line);
    --soft: var(--dk-acc-tint);
    --accent: var(--dk-acc);
    --accent-ink: #FFFFFF;
    --accent-deep: var(--dk-acc);
    --voiced: var(--dk-green);
    --voiceless: var(--dk-orange);
    --good: var(--dk-green);
    --bad: var(--dk-red);
    --air: var(--dk-blue);
    --tongue: var(--dk-red);
    --tongue-l: var(--dk-red);
    --lip: var(--dk-red-soft);
    --shadow: 0 10px 30px color-mix(in oklab, var(--dk-acc) 10%, transparent),0 2px 6px color-mix(in oklab, var(--dk-acc) 6%, transparent)
}
:host([data-theme="dark"]) .pron:not(:is(.game, .game *)) {
    background: var(--paper);
    color: var(--ink)
}
:host([data-theme="dark"]) a:not(:is(.game, .game *)) {
    color: var(--accent-deep)
}
:host([data-theme="dark"]) :focus-visible:not(:is(.game, .game *)) {
    outline: 3px solid var(--cyan)
}
:host([data-theme="dark"]) main:focus:not(:is(.game, .game *)), :host([data-theme="dark"]) main:focus-visible:not(:is(.game, .game *)) {
    outline: none
}
:host([data-theme="dark"]) .sup:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .fine:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .muted:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) button:not(:is(.game, .game *)) {
    color: inherit
}
:host([data-theme="dark"]) .alert:not(:is(.game, .game *)) {
    background: var(--dk-page);
    color: var(--dk-orange);
    border: 1px solid var(--bad)
}
:host([data-theme="dark"]) .btn:not(:is(.game, .game *)) {
    border: 1.5px solid var(--line);
    background: var(--surface);
    color: var(--ink)
}
:host([data-theme="dark"]) .btn:hover:not(:is(.game, .game *)) {
    border-color: var(--accent)
}
:host([data-theme="dark"]) .btn.primary:not(:is(.game, .game *)) {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
    box-shadow: 0 6px 18px color-mix(in oklab, var(--dk-acc) 32%, transparent)
}
:host([data-theme="dark"]) .btn.primary:hover:not(:is(.game, .game *)) {
    background: var(--accent-deep);
    border-color: var(--accent-deep)
}
:host([data-theme="dark"]) .btn.ghost:not(:is(.game, .game *)) {
    background: transparent
}
:host([data-theme="dark"]) .btn.glow:not(:is(.game, .game *)) {
    background: var(--cyan);
    border: 0;
    color: var(--night);
    box-shadow: 0 8px 26px color-mix(in oklab, var(--dk-blue) 45%, transparent)
}
:host([data-theme="dark"]) .btn.glow:hover:not(:is(.game, .game *)) {
    background: var(--dk-blue)
}
:host([data-theme="dark"]) .linkbtn:not(:is(.game, .game *)) {
    background: none;
    border: 0;
    color: var(--accent-deep)
}
:host([data-theme="dark"]) .say:not(:is(.game, .game *)) {
    border: 1.5px solid var(--line);
    background: var(--surface)
}
:host([data-theme="dark"]) .say svg:not(:is(.game, .game *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .say:hover:not(:is(.game, .game *)) {
    border-color: var(--accent);
    box-shadow: 0 0 0 4px color-mix(in srgb,var(--accent) 14%,transparent)
}
:host([data-theme="dark"]) .say .ipa:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .say.us svg:not(:is(.game, .game *)) {
    color: var(--dk-red)
}
:host([data-theme="dark"]) .says-b:not(:is(.game, .game *)) {
    background: var(--surface);
    border: 1px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .says-b:not(:is(.game, .game *))::before {
    background: var(--surface);
    border-left: 1px solid var(--line);
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .says-n:not(:is(.game, .game *)) {
    color: var(--accent-deep)
}
:host([data-theme="dark"]) .kicker:not(:is(.game, .game *)) {
    color: var(--accent-deep)
}
:host([data-theme="dark"]) .goal:not(:is(.game, .game *)) {
    border-left: 4px solid var(--cyan)
}
:host([data-theme="dark"]) .goal small:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .visual:not(:is(.game, .game *)) {
    background: var(--surface);
    border: 1px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .visual:not(:is(.game, .game *))::before {
    background: linear-gradient(90deg,var(--cyan),var(--violet),var(--orange))
}
:host([data-theme="dark"]) .pairbtn:not(:is(.game, .game *)) {
    background: var(--soft)
}
:host([data-theme="dark"]) .pairbtn .both:not(:is(.game, .game *)) {
    border: 0;
    background: none;
    color: var(--accent-deep)
}
:host([data-theme="dark"]) .l-watch:not(:is(.game, .game *)) {
    background: var(--surface);
    border: 1px solid var(--line);
    border-top: 6px solid var(--voiceless)
}
:host([data-theme="dark"]) .wicon:not(:is(.game, .game *)) {
    background: var(--voiceless);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .tryit:not(:is(.game, .game *)) {
    background: var(--surface);
    border: 1px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .tryit h2 svg:not(:is(.game, .game *)) {
    color: var(--bad)
}
:host([data-theme="dark"]) .rec:not(:is(.game, .game *)) {
    border: 1.5px solid var(--bad);
    background: var(--surface);
    color: var(--bad)
}
:host([data-theme="dark"]) .rec .dot:not(:is(.game, .game *)) {
    background: var(--bad)
}
:host([data-theme="dark"]) .trycheck:not(:is(.game, .game *)) {
    background: var(--soft)
}
:host([data-theme="dark"]) .yn .sel:not(:is(.game, .game *)) {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink)
}
:host([data-theme="dark"]) .av:not(:is(.game, .game *)) {
    background: var(--soft)
}
:host([data-theme="dark"]) .m-face:not(:is(.game, .game *)), :host([data-theme="dark"]) .m-wall:not(:is(.game, .game *)) {
    fill: none;
    stroke: var(--ink-2)
}
:host([data-theme="dark"]) .m-palate:not(:is(.game, .game *)) {
    fill: none;
    stroke: var(--ink)
}
:host([data-theme="dark"]) .m-velum:not(:is(.game, .game *)) {
    fill: none;
    stroke: var(--ink)
}
:host([data-theme="dark"]) .m-nasal:not(:is(.game, .game *)) {
    fill: none;
    stroke: var(--line)
}
:host([data-theme="dark"]) .m-nasal.on:not(:is(.game, .game *)) {
    stroke: var(--air)
}
:host([data-theme="dark"]) .m-tooth:not(:is(.game, .game *)) {
    fill: var(--surface);
    stroke: var(--ink-2)
}
:host([data-theme="dark"]) .m-lip:not(:is(.game, .game *)) {
    fill: var(--lip);
    stroke: var(--tongue-l)
}
:host([data-theme="dark"]) .m-tongue:not(:is(.game, .game *)) {
    fill: var(--tongue);
    stroke: var(--tongue-l)
}
:host([data-theme="dark"]) .m-contact:not(:is(.game, .game *)) {
    fill: none;
    stroke: var(--accent)
}
:host([data-theme="dark"]) .m-flow:not(:is(.game, .game *)) {
    fill: none;
    stroke: var(--air)
}
:host([data-theme="dark"]) .m-burst:not(:is(.game, .game *)) {
    fill: none;
    stroke: var(--air)
}
:host([data-theme="dark"]) .m-voice .vib:not(:is(.game, .game *)) {
    fill: none;
    stroke: var(--voiced)
}
:host([data-theme="dark"]) .m-voice .novib:not(:is(.game, .game *)) {
    stroke: var(--voiceless)
}
:host([data-theme="dark"]) .m-lbl text:not(:is(.game, .game *)) {
    fill: var(--ink-2)
}
:host([data-theme="dark"]) .l-lip:not(:is(.game, .game *)) {
    fill: var(--lip);
    stroke: var(--tongue-l)
}
:host([data-theme="dark"]) .l-in:not(:is(.game, .game *)) {
    fill: var(--dk-text)
}
:host([data-theme="dark"]) .l-teeth:not(:is(.game, .game *)) {
    fill: #fff
}
:host([data-theme="dark"]) .l-tng:not(:is(.game, .game *)) {
    fill: var(--dk-red)
}
:host([data-theme="dark"]) .l-gauge .g-box:not(:is(.game, .game *)) {
    fill: var(--soft);
    stroke: var(--line)
}
:host([data-theme="dark"]) .l-gauge text:not(:is(.game, .game *)) {
    fill: var(--ink-2)
}
:host([data-theme="dark"]) .l-gauge .g-dot:not(:is(.game, .game *)) {
    fill: var(--accent)
}
:host([data-theme="dark"]) .l-cap:not(:is(.game, .game *)) {
    fill: var(--ink)
}
:host([data-theme="dark"]) .vtrap:not(:is(.game, .game *)) {
    fill: none;
    stroke: var(--line)
}
:host([data-theme="dark"]) .vax:not(:is(.game, .game *)) {
    fill: var(--ink-2)
}
:host([data-theme="dark"]) .vd circle:not(:is(.game, .game *)) {
    fill: var(--surface);
    stroke: var(--line)
}
:host([data-theme="dark"]) .vd text:not(:is(.game, .game *)) {
    fill: var(--ink-2)
}
:host([data-theme="dark"]) .vd.on circle:not(:is(.game, .game *)) {
    fill: var(--accent);
    stroke: var(--accent)
}
:host([data-theme="dark"]) .vd.on text:not(:is(.game, .game *)) {
    fill: var(--accent-ink)
}
:host([data-theme="dark"]) .vg:not(:is(.game, .game *)) {
    stroke: var(--accent);
    fill: none
}
:host([data-theme="dark"]) .vgl:not(:is(.game, .game *)) {
    fill: var(--accent)
}
:host([data-theme="dark"]) .vgd:not(:is(.game, .game *)) {
    fill: var(--accent)
}
:host([data-theme="dark"]) .vc:not(:is(.game, .game *)) {
    background: var(--soft)
}
:host([data-theme="dark"]) .vc .thr:not(:is(.game, .game *)) {
    fill: none;
    stroke: var(--ink-2)
}
:host([data-theme="dark"]) .vc .vib:not(:is(.game, .game *)) {
    fill: none;
    stroke: var(--voiced)
}
:host([data-theme="dark"]) .vc .air:not(:is(.game, .game *)) {
    stroke: var(--voiceless)
}
:host([data-theme="dark"]) .vc small:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pc .pboth:not(:is(.game, .game *)) {
    border: 0;
    background: none;
    color: var(--accent)
}
:host([data-theme="dark"]) .pw:not(:is(.game, .game *)) {
    border: 1.5px solid var(--line);
    background: var(--surface)
}
:host([data-theme="dark"]) .pw:hover:not(:is(.game, .game *)) {
    border-color: var(--accent)
}
:host([data-theme="dark"]) .pw svg:not(:is(.game, .game *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .pw .ipa:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pw mark:not(:is(.game, .game *)) {
    background: none;
    color: var(--accent);
    border-bottom: 3px solid var(--accent)
}
:host([data-theme="dark"]) .vs:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .sw:not(:is(.game, .game *)), :host([data-theme="dark"]) .st:not(:is(.game, .game *)) {
    border: 1.5px solid var(--line);
    background: var(--surface)
}
:host([data-theme="dark"]) .blocks i:not(:is(.game, .game *)) {
    background: var(--soft)
}
:host([data-theme="dark"]) .sw small:not(:is(.game, .game *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .dots i:not(:is(.game, .game *)) {
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .dots i.P:not(:is(.game, .game *)) {
    background: var(--accent)
}
:host([data-theme="dark"]) .dots i.S:not(:is(.game, .game *)) {
    background: var(--accent)
}
:host([data-theme="dark"]) .st b .P:not(:is(.game, .game *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .st .ipa:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .er:not(:is(.game, .game *)) {
    background: var(--soft)
}
:host([data-theme="dark"]) .eipa:not(:is(.game, .game *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .sl:not(:is(.game, .game *)) {
    background: var(--dk-ink-bg);
    color: var(--paper)
}
:host([data-theme="dark"]) .sarr:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .sws mark:not(:is(.game, .game *)) {
    background: none;
    color: var(--accent)
}
:host([data-theme="dark"]) .lt:not(:is(.game, .game *)) {
    border: 1.5px solid var(--line);
    background: var(--surface)
}
:host([data-theme="dark"]) .lt:hover:not(:is(.game, .game *)) {
    border-color: var(--accent)
}
:host([data-theme="dark"]) .lp:not(:is(.game, .game *)), :host([data-theme="dark"]) .gl:not(:is(.game, .game *)), :host([data-theme="dark"]) .pl:not(:is(.game, .game *)) {
    border: 1.5px solid var(--line);
    background: var(--surface)
}
:host([data-theme="dark"]) .lp svg:not(:is(.game, .game *)), :host([data-theme="dark"]) .gl>svg:not(:is(.game, .game *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .lp .arc:not(:is(.game, .game *)) {
    border: 2.5px solid var(--accent);
    border-top: 0
}
:host([data-theme="dark"]) .lp .ipa:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lp mark.lk:not(:is(.game, .game *)) {
    background: none;
    color: var(--accent)
}
:host([data-theme="dark"]) .chunk:not(:is(.game, .game *)) {
    background: var(--soft)
}
:host([data-theme="dark"]) .pause:not(:is(.game, .game *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .pl .pc:not(:is(.game, .game *)) {
    fill: none;
    stroke: var(--accent)
}
:host([data-theme="dark"]) .pl .nd:not(:is(.game, .game *)) {
    fill: var(--accent)
}
:host([data-theme="dark"]) .pl text:not(:is(.game, .game *)) {
    fill: var(--ink)
}
:host([data-theme="dark"]) .pl text.nuc:not(:is(.game, .game *)) {
    fill: var(--accent)
}
:host([data-theme="dark"]) .pl .arr:not(:is(.game, .game *)) {
    fill: var(--accent)
}
:host([data-theme="dark"]) .ah b:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .v-weak th:not(:is(.game, .game *)), :host([data-theme="dark"]) .v-weak td:not(:is(.game, .game *)), :host([data-theme="dark"]) .v-table th:not(:is(.game, .game *)), :host([data-theme="dark"]) .v-table td:not(:is(.game, .game *)) {
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .v-weak thead th:not(:is(.game, .game *)), :host([data-theme="dark"]) .v-table thead th:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .v-weak td.w:not(:is(.game, .game *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .term:not(:is(.game, .game *)) {
    background: var(--surface);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .term dt:not(:is(.game, .game *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .steps h3:not(:is(.game, .game *)), :host([data-theme="dark"]) .listenfor h3:not(:is(.game, .game *)), :host([data-theme="dark"]) .note h3:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .steps li:not(:is(.game, .game *))::before {
    background: var(--accent);
    color: var(--accent-ink)
}
:host([data-theme="dark"]) .listenfor:not(:is(.game, .game *)) {
    background: var(--soft)
}
:host([data-theme="dark"]) .listenfor h3 svg:not(:is(.game, .game *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .note:not(:is(.game, .game *)) {
    border: 1px solid var(--line);
    border-left: 5px solid var(--accent);
    background: var(--surface)
}
:host([data-theme="dark"]) .note .ni:not(:is(.game, .game *)) {
    background: var(--accent);
    color: var(--accent-ink)
}
:host([data-theme="dark"]) .note.n-exception:not(:is(.game, .game *)) {
    border-left-color: var(--voiceless)
}
:host([data-theme="dark"]) .note.n-exception .ni:not(:is(.game, .game *)) {
    background: var(--voiceless);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .note.n-mistake:not(:is(.game, .game *)) {
    border-left-color: var(--bad)
}
:host([data-theme="dark"]) .note.n-mistake .ni:not(:is(.game, .game *)) {
    background: var(--bad);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .note.n-tip:not(:is(.game, .game *)) {
    border-left-color: var(--good)
}
:host([data-theme="dark"]) .note.n-tip .ni:not(:is(.game, .game *)) {
    background: var(--good);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .mcard:not(:is(.game, .game *)) {
    border: 1px solid var(--line);
    background: var(--surface)
}
:host([data-theme="dark"]) .mf:not(:is(.game, .game *)) {
    background: var(--soft)
}
:host([data-theme="dark"]) .mm small:not(:is(.game, .game *)), :host([data-theme="dark"]) .mf small:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .mi:not(:is(.game, .game *)) {
    color: #fff
}
:host([data-theme="dark"]) .mi.bad:not(:is(.game, .game *)) {
    background: var(--bad)
}
:host([data-theme="dark"]) .mi.good:not(:is(.game, .game *)) {
    background: var(--good)
}
:host([data-theme="dark"]) .ck-q:not(:is(.game, .game *)) {
    background: var(--surface);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .ck-n:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .btn.opt.right:not(:is(.game, .game *)) {
    border-color: var(--good);
    background: color-mix(in srgb,var(--good) 14%,var(--surface))
}
:host([data-theme="dark"]) .btn.opt.wrong:not(:is(.game, .game *)) {
    border-color: var(--bad)
}
:host([data-theme="dark"]) .ck-fb .good b:not(:is(.game, .game *)) {
    color: var(--good)
}
:host([data-theme="dark"]) .ck-fb .bad b:not(:is(.game, .game *)) {
    color: var(--bad)
}
:host([data-theme="dark"]) .iconb.say:not(:is(.game, .game *)) {
    border: 1.5px solid var(--line)
}
:host([data-theme="dark"]) .ck-end:not(:is(.game, .game *)) {
    background: var(--surface);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .remember:not(:is(.game, .game *)) {
    background: var(--surface);
    border: 1px solid var(--line);
    border-top: 6px solid var(--good)
}
:host([data-theme="dark"]) .btn.glowb:not(:is(.game, .game *)) {
    border-color: var(--accent);
    color: var(--accent)
}
:host([data-theme="dark"]) .a-tip:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .at:not(:is(.game, .game *)) {
    border: 1.5px solid var(--line);
    background: var(--surface)
}
:host([data-theme="dark"]) .at:hover:not(:is(.game, .game *)) {
    border-color: var(--accent)
}
:host([data-theme="dark"]) .at-l small:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .at-i:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .at.diff:not(:is(.game, .game *))::after {
    color: var(--voiceless)
}
:host([data-theme="dark"]) .at.sel:not(:is(.game, .game *)) {
    border-color: var(--accent);
    background: color-mix(in srgb,var(--accent) 12%,var(--surface));
    box-shadow: 0 0 0 2px var(--accent) inset
}
:host([data-theme="dark"]) .at.ok:not(:is(.game, .game *)) {
    border-color: var(--good);
    background: color-mix(in srgb,var(--good) 22%,var(--surface))
}
:host([data-theme="dark"]) .at.bad:not(:is(.game, .game *)) {
    border-color: var(--bad);
    background: color-mix(in srgb,var(--bad) 18%,var(--surface))
}
:host([data-theme="dark"]) .a-detail:not(:is(.game, .game *)) {
    background: var(--soft)
}
:host([data-theme="dark"]) .ad-big b+b:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .ad-k:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .ad-note:not(:is(.game, .game *)) {
    background: var(--surface);
    border-left: 4px solid var(--voiceless)
}
:host([data-theme="dark"]) .a-quiz:not(:is(.game, .game *)) {
    background: var(--soft);
    border: 2px solid var(--accent)
}
:host([data-theme="dark"]) .q-msg .good:not(:is(.game, .game *)) {
    color: var(--good)
}
:host([data-theme="dark"]) .anat .a-pin circle:not(:is(.game, .game *)) {
    fill: var(--accent);
    stroke: var(--surface)
}
:host([data-theme="dark"]) .anat .a-pin text:not(:is(.game, .game *)) {
    fill: var(--accent-ink)
}
:host([data-theme="dark"]) .anat .a-pin.hi circle:not(:is(.game, .game *)) {
    fill: var(--bad)
}
:host([data-theme="dark"]) .anat .m-vf:not(:is(.game, .game *)) {
    stroke: var(--ink-2)
}
:host([data-theme="dark"]) .anat .hi:not(.a-pin):not(:is(.game, .game *)) {
    stroke: var(--bad) !important
}
:host([data-theme="dark"]) .anat .m-tongue.hi:not(:is(.game, .game *)), :host([data-theme="dark"]) .anat .m-lip.hi:not(:is(.game, .game *)), :host([data-theme="dark"]) .anat .m-tooth.hi:not(:is(.game, .game *)) {
    fill: color-mix(in srgb,var(--bad) 45%,var(--surface))
}
:host([data-theme="dark"]) .a-part:not(:is(.game, .game *)) {
    background: none;
    border: 0
}
:host([data-theme="dark"]) .a-part[aria-expanded="true"] b:not(:is(.game, .game *)) {
    color: var(--bad)
}
:host([data-theme="dark"]) .a-desc:not(:is(.game, .game *)) {
    background: var(--soft)
}
:host([data-theme="dark"]) .g-note.warn:not(:is(.game, .game *)) {
    background: var(--dk-orange-tint);
    color: var(--dk-red);
    border: 1px solid var(--bad)
}
:host([data-theme="dark"]) .at:not(:is(.game, .game *)) {
    --tx: var(--dk-card);
    border: 0;
    background: linear-gradient(160deg,color-mix(in srgb,var(--tc) 78%,var(--dk-card)) 0%,var(--tc) 55%,color-mix(in srgb,var(--tc) 80%,#000) 100%);
    color: var(--tx);
    box-shadow: 0 6px 0 color-mix(in srgb,var(--tc) 65%,#000),0 10px 20px color-mix(in oklab, var(--dk-acc) 18%, transparent)
}
:host([data-theme="dark"]) .at:nth-child(5n+2):not(:is(.game, .game *)) {
    --tc: var(--dk-blue);
    --tx: var(--dk-blue-deep)
}
:host([data-theme="dark"]) .at:nth-child(5n+3):not(:is(.game, .game *)) {
    --tc: var(--dk-green);
    --tx: var(--dk-green-deep)
}
:host([data-theme="dark"]) .at:nth-child(5n+4):not(:is(.game, .game *)) {
    --tc: var(--dk-orange);
    --tx: var(--dk-orange-deep)
}
:host([data-theme="dark"]) .at:nth-child(5n+5):not(:is(.game, .game *)) {
    --tc: var(--dk-yellow);
    --tx: var(--dk-yellow-deep)
}
:host([data-theme="dark"]) .at:active:not(:is(.game, .game *)) {
    box-shadow: 0 2px 0 color-mix(in srgb,var(--tc) 65%,#000)
}
:host([data-theme="dark"]) .at .at-l small:not(:is(.game, .game *)), :host([data-theme="dark"]) .at .at-i:not(:is(.game, .game *)) {
    color: inherit
}
:host([data-theme="dark"]) .at.sel:not(:is(.game, .game *)) {
    box-shadow: 0 0 0 3px var(--dk-card),0 0 0 6px var(--tc),0 10px 24px color-mix(in srgb,var(--tc) 50%,transparent)
}
:host([data-theme="dark"]) .at.diff:not(:is(.game, .game *))::after {
    color: #fff;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .at.ok:not(:is(.game, .game *)) {
    background: linear-gradient(160deg,var(--dk-green),var(--dk-green));
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .at.bad:not(:is(.game, .game *)) {
    background: linear-gradient(160deg,var(--dk-orange-soft),var(--dk-red));
    color: var(--dk-text)
}
:host([data-theme="dark"]) .ad-big:not(:is(.game, .game *)) {
    background: linear-gradient(160deg,var(--dk-acc),var(--violet));
    color: var(--dk-on-acc);
    box-shadow: 0 10px 26px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .ad-big b+b:not(:is(.game, .game *)) {
    color: var(--dk-acc-on)
}
:host([data-theme="dark"]) .at:not(:is(.game, .game *)) {
    background: linear-gradient(160deg,color-mix(in srgb,var(--tc) 88%,var(--dk-card)) 0%,var(--tc) 50%,color-mix(in srgb,var(--tc) 82%,#000) 100%)
}
:host([data-theme="dark"]) {
    --paper: var(--dk-page);
    --line: var(--dk-acc-line);
    --soft: var(--dk-acc-tint);
    --ink-2: var(--dk-text-2);
    --glass: color-mix(in oklab, var(--dk-card) 78%, transparent);
    --glass-2: color-mix(in oklab, var(--dk-card) 92%, transparent);
    --sky: radial-gradient(900px 520px at 6% -8%,var(--dk-blue-tint) 0,color-mix(in oklab, var(--dk-blue-tint) 0%, transparent) 62%),radial-gradient(820px 520px at 100% -4%,var(--dk-acc-tint) 0,color-mix(in oklab, var(--dk-acc-tint) 0%, transparent) 60%),radial-gradient(760px 520px at 50% 108%,var(--dk-yellow-tint) 0,color-mix(in oklab, var(--dk-yellow-tint) 0%, transparent) 62%),var(--dk-page);
    --lift: 0 14px 34px color-mix(in oklab, var(--dk-acc) 13%, transparent),0 2px 6px color-mix(in oklab, var(--dk-acc) 6%, transparent);
    --violet-ink: var(--dk-acc-text);
    --cyan-ink: var(--dk-blue)
}
:host([data-theme="dark"]) .pron:not(:is(.game, .game *)) {
    background: var(--sky);
    background-color: var(--paper)
}
:host([data-theme="dark"]) .top:not(:is(.game, .game *)) {
    background: var(--glass);
    border-bottom: 1px solid color-mix(in oklab, var(--dk-acc) 12%, transparent);
    color: var(--ink)
}
:host([data-theme="dark"]) .brand:not(:is(.game, .game *)) {
    color: inherit
}
:host([data-theme="dark"]) .logo .lo-w:not(:is(.game, .game *)) {
    fill: var(--ink)
}
:host([data-theme="dark"]) .logo .lo-to:not(:is(.game, .game *)) {
    fill: var(--violet)
}
:host([data-theme="dark"]) .brand-sep:not(:is(.game, .game *)) {
    background: currentColor
}
:host([data-theme="dark"]) .foot:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .trbar:not(:is(.game, .game *)) {
    background: var(--dk-card);
    border: 1px solid var(--line);
    box-shadow: 0 2px 10px color-mix(in oklab, var(--dk-acc) 7%, transparent)
}
:host([data-theme="dark"]) .tr-cap:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .tr-cap svg:not(:is(.game, .game *)) {
    color: var(--violet)
}
:host([data-theme="dark"]) .trb:not(:is(.game, .game *)) {
    border: 0;
    background: transparent;
    color: var(--ink)
}
:host([data-theme="dark"]) .trb:hover:not(:is(.game, .game *)) {
    background: var(--soft)
}
:host([data-theme="dark"]) .trb[aria-pressed="true"]:not(:is(.game, .game *)) {
    color: #fff;
    box-shadow: 0 3px 10px color-mix(in oklab, var(--dk-acc) 22%, transparent)
}
:host([data-theme="dark"]) .trb[data-trbtn="kk"][aria-pressed="true"]:not(:is(.game, .game *)) {
    background: var(--dk-blue)
}
:host([data-theme="dark"]) .trb[data-trbtn="ru"][aria-pressed="true"]:not(:is(.game, .game *)) {
    background: var(--dk-acc)
}
:host([data-theme="dark"]) .tr-ru:not(:is(.game, .game *)) {
    --trc: var(--dk-acc);
    --trbg: var(--dk-acc-tint);
    --trbg2: color-mix(in oklab, var(--dk-acc-tint) 35%, transparent);
    --trink: var(--dk-acc-text)
}
:host([data-theme="dark"]) .tr-kk:not(:is(.game, .game *)) {
    --trc: var(--dk-blue);
    --trbg: var(--dk-page);
    --trbg2: rgba(234,247,255,.35);
    --trink: var(--dk-blue)
}
:host([data-theme="dark"]) .sup.tr:not(.tr-cy):not(:is(.game, .game *)) {
    background: linear-gradient(100deg,var(--trbg),var(--trbg2));
    box-shadow: inset 3px 0 0 var(--trc);
    color: var(--dk-text)
}
:host([data-theme="dark"]) .sup.tr:not(.tr-cy):not(:is(.game, .game *))::before {
    color: var(--trink)
}
:host([data-theme="dark"]) .tr-cy:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .xpl :is(h1,h2)+.sup.tr:not(.tr-cy):not(:is(.game, .game *)), :host([data-theme="dark"]) .xpl :is(h1,h2)+.tr+.sup.tr:not(.tr-cy):not(:is(.game, .game *)) {
    background: none;
    box-shadow: none;
    color: var(--trink)
}
:host([data-theme="dark"]) .xpl :is(h1,h2)+.sup.tr:not(.tr-cy):not(:is(.game, .game *))::before, :host([data-theme="dark"]) .xpl :is(h1,h2)+.tr+.sup.tr:not(.tr-cy):not(:is(.game, .game *))::before {
    background: var(--trbg)
}
:host([data-theme="dark"]) .pv .sup.tr:not(:is(.game, .game *)) {
    color: var(--dk-text);
    background: color-mix(in oklab, var(--dk-card) 82%, transparent)
}
:host([data-theme="dark"]) .floaters span:not(:is(.game, .game *)) {
    color: var(--violet);
    text-shadow: 0 0 14px var(--dk-card),0 0 2px var(--dk-card)
}
:host([data-theme="dark"]) .floaters span:nth-child(4n+2):not(:is(.game, .game *)) {
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .floaters span:nth-child(4n+3):not(:is(.game, .game *)) {
    color: var(--dk-orange)
}
:host([data-theme="dark"]) .floaters span:nth-child(4n+4):not(:is(.game, .game *)) {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .wave path:not(:is(.game, .game *)) {
    fill: none
}
:host([data-theme="dark"]) .wave .w1:not(:is(.game, .game *)) {
    stroke: var(--cyan)
}
:host([data-theme="dark"]) .wave .w2:not(:is(.game, .game *)) {
    stroke: var(--orange)
}
:host([data-theme="dark"]) .btn.glow:not(:is(.game, .game *)) {
    background: linear-gradient(135deg,var(--dk-blue),var(--dk-blue));
    border: 0;
    color: var(--dk-on-bright);
    box-shadow: 0 8px 22px color-mix(in oklab, var(--dk-blue) 38%, transparent)
}
:host([data-theme="dark"]) .btn.glow:hover:not(:is(.game, .game *)) {
    background: linear-gradient(135deg,var(--dk-blue-soft),var(--dk-blue))
}
:host([data-theme="dark"]) .btn.primary:not(:is(.game, .game *)) {
    background: linear-gradient(135deg,var(--dk-acc),var(--violet) 55%,var(--dk-acc));
    border: 0
}
:host([data-theme="dark"]) .btn.primary:hover:not(:is(.game, .game *)) {
    background: linear-gradient(135deg,var(--dk-acc),var(--dk-acc))
}
:host([data-theme="dark"]) .say:not(:is(.game, .game *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 3px 10px color-mix(in oklab, var(--dk-acc) 7%, transparent)
}
:host([data-theme="dark"]) .say svg:not(:is(.game, .game *)), :host([data-theme="dark"]) .pw svg:not(:is(.game, .game *)), :host([data-theme="dark"]) .chip svg:not(:is(.game, .game *)), :host([data-theme="dark"]) .pv-play svg:not(:is(.game, .game *)), :host([data-theme="dark"]) .q-play svg:not(:is(.game, .game *)) {
    color: #fff;
    background: radial-gradient(circle at 34% 28%,var(--dk-card) 0,var(--dk-blue-tint) 16%,var(--dk-blue) 46%,var(--dk-acc) 100%);
    box-shadow: inset 0 -3px 6px color-mix(in oklab, var(--dk-acc) 25%, transparent),0 2px 6px color-mix(in oklab, var(--dk-blue) 35%, transparent)
}
:host([data-theme="dark"]) .say:hover:not(:is(.game, .game *)) {
    border-color: var(--dk-blue-line);
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--dk-blue) 12%, transparent),0 6px 16px color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .say .ipa:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .say.us svg:not(:is(.game, .game *)) {
    background: radial-gradient(circle at 34% 28%,var(--dk-card) 0,var(--dk-orange-tint) 16%,var(--dk-orange) 48%,var(--dk-red) 100%)
}
:host([data-theme="dark"]) [data-say].playing:not(:is(.game, .game *)), :host([data-theme="dark"]) [data-pair].playing:not(:is(.game, .game *)), :host([data-theme="dark"]) .pv-play.playing:not(:is(.game, .game *)), :host([data-theme="dark"]) .gate-spk.playing:not(:is(.game, .game *)), :host([data-theme="dark"]) .q-play.playing:not(:is(.game, .game *)), :host([data-theme="dark"]) #mine.playing:not(:is(.game, .game *)), :host([data-theme="dark"]) #fb-both.playing:not(:is(.game, .game *)) {
    border-color: var(--dk-blue) !important;
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--dk-blue) 20%, transparent),0 10px 26px color-mix(in oklab, var(--dk-blue) 28%, transparent) !important
}
:host([data-theme="dark"]) .say.playing:not(:is(.game, .game *))::after, :host([data-theme="dark"]) .pw.playing:not(:is(.game, .game *))::after, :host([data-theme="dark"]) .pv-play.playing:not(:is(.game, .game *))::after, :host([data-theme="dark"]) .gate-spk.playing:not(:is(.game, .game *))::after, :host([data-theme="dark"]) .iconb.say.playing:not(:is(.game, .game *))::after {
    border: 2px solid color-mix(in oklab, var(--dk-blue) 70%, transparent)
}
:host([data-theme="dark"]) [data-say].err:not(:is(.game, .game *)), :host([data-theme="dark"]) [data-pair].err:not(:is(.game, .game *)), :host([data-theme="dark"]) .pv-play.err:not(:is(.game, .game *)), :host([data-theme="dark"]) .gate-spk.err:not(:is(.game, .game *)), :host([data-theme="dark"]) .q-play.err:not(:is(.game, .game *)) {
    border-color: var(--bad) !important
}
:host([data-theme="dark"]) .err svg:not(:is(.game, .game *)) {
    background: radial-gradient(circle at 34% 28%,var(--dk-card),var(--dk-chip) 40%,var(--dk-raised)) !important
}
:host([data-theme="dark"]) .pw:not(:is(.game, .game *)) {
    border: 1.5px solid var(--line);
    background: linear-gradient(170deg,var(--dk-card) 0%,var(--dk-page) 100%);
    box-shadow: 0 6px 16px color-mix(in oklab, var(--dk-acc) 8%, transparent)
}
:host([data-theme="dark"]) .pw:hover:not(:is(.game, .game *)) {
    border-color: var(--dk-blue-line)
}
:host([data-theme="dark"]) .pboth.playing:not(:is(.game, .game *)), :host([data-theme="dark"]) .both.playing:not(:is(.game, .game *)) {
    color: var(--cyan-ink) !important
}
:host([data-theme="dark"]) .sw.playing:not(:is(.game, .game *)), :host([data-theme="dark"]) .st.playing:not(:is(.game, .game *)), :host([data-theme="dark"]) .lp.playing:not(:is(.game, .game *)), :host([data-theme="dark"]) .gl.playing:not(:is(.game, .game *)), :host([data-theme="dark"]) .pl.playing:not(:is(.game, .game *)), :host([data-theme="dark"]) .lt.playing:not(:is(.game, .game *)) {
    border-color: var(--dk-blue) !important;
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--dk-blue) 18%, transparent),0 10px 24px color-mix(in oklab, var(--dk-blue) 22%, transparent) !important
}
:host([data-theme="dark"]) .btn.playing:not(:is(.game, .game *)) {
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--dk-blue) 30%, transparent),0 10px 24px color-mix(in oklab, var(--dk-blue) 30%, transparent)
}
:host([data-theme="dark"]) .says-b:not(:is(.game, .game *)) {
    background: var(--dk-card);
    border: 1px solid var(--dk-acc-line);
    box-shadow: var(--lift)
}
:host([data-theme="dark"]) .says-b:not(:is(.game, .game *))::before {
    background: var(--dk-card);
    border-color: var(--dk-acc-line)
}
:host([data-theme="dark"]) .world:not(:is(.game, .game *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .world .foot:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .w-hero:not(:is(.game, .game *)) {
    background: var(--dk-blue-tint) var(--img) 70% center/cover no-repeat
}
:host([data-theme="dark"]) .w-hero:not(:is(.game, .game *))::before {
    background: linear-gradient(90deg,color-mix(in oklab, var(--dk-card) 95%, transparent) 0%,color-mix(in oklab, var(--dk-card) 82%, transparent) 30%,color-mix(in oklab, var(--dk-card) 20%, transparent) 54%,color-mix(in oklab, var(--dk-card) 0%, transparent) 68%),linear-gradient(0deg,var(--dk-card) 0%,color-mix(in oklab, var(--dk-card) 0%, transparent) 22%)
}
:host([data-theme="dark"]) .w-kick:not(:is(.game, .game *)) {
    background: var(--dk-card);
    color: var(--violet-ink);
    border: 1px solid var(--line);
    box-shadow: 0 6px 18px color-mix(in oklab, var(--dk-acc) 10%, transparent)
}
:host([data-theme="dark"]) .w-kick:not(:is(.game, .game *))::before {
    background: var(--green);
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--dk-green) 20%, transparent)
}
:host([data-theme="dark"]) .w-hero h1:not(:is(.game, .game *)) {
    background: linear-gradient(100deg,var(--dk-acc-text) 0%,var(--dk-acc-text) 46%,var(--dk-blue) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent
}
:host([data-theme="dark"]) .w-lead:not(:is(.game, .game *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .w-stages li:not(:is(.game, .game *)) {
    background: color-mix(in oklab, var(--dk-card) 86%, transparent);
    border: 1px solid var(--dk-line);
    box-shadow: 0 6px 18px color-mix(in oklab, var(--dk-acc) 10%, transparent)
}
:host([data-theme="dark"]) .w-stages li svg:not(:is(.game, .game *)) {
    color: var(--violet)
}
:host([data-theme="dark"]) .w-stages .sn:not(:is(.game, .game *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .w-stages .st2 .sn:not(:is(.game, .game *)) {
    background: var(--dk-blue);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .w-stages .st2 svg:not(:is(.game, .game *)) {
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .w-stages small:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .w-cta:not(:is(.game, .game *)) {
    background: linear-gradient(135deg,var(--dk-acc),var(--dk-acc));
    color: var(--dk-on-acc);
    box-shadow: 0 14px 34px color-mix(in oklab, var(--dk-acc) 38%, transparent)
}
:host([data-theme="dark"]) .w-cta:hover:not(:is(.game, .game *)) {
    box-shadow: 0 18px 40px color-mix(in oklab, var(--dk-acc) 45%, transparent)
}
:host([data-theme="dark"]) .w-cta small:not(:is(.game, .game *)) {
    color: var(--dk-acc-on)
}
:host([data-theme="dark"]) .w-cta .go:not(:is(.game, .game *)) {
    background: var(--dk-card);
    color: var(--violet)
}
:host([data-theme="dark"]) .rg:not(:is(.game, .game *)) {
    color: var(--ink);
    background: var(--dk-blue-tint) var(--img) center 40%/cover;
    border: 3px solid var(--dk-line);
    box-shadow: 0 12px 28px color-mix(in oklab, var(--dk-acc) 16%, transparent)
}
:host([data-theme="dark"]) .rg:not(:is(.game, .game *))::before {
    background: linear-gradient(0deg,color-mix(in oklab, var(--dk-card) 97%, transparent) 0%,color-mix(in oklab, var(--dk-card) 82%, transparent) 32%,color-mix(in oklab, var(--dk-card) 0%, transparent) 64%)
}
:host([data-theme="dark"]) .rg:hover:not(:is(.game, .game *)) {
    box-shadow: 0 18px 34px color-mix(in oklab, var(--dk-acc) 22%, transparent)
}
:host([data-theme="dark"]) .rg.on:not(:is(.game, .game *)) {
    border-color: var(--violet);
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--dk-acc) 22%, transparent),0 18px 34px color-mix(in oklab, var(--dk-acc) 25%, transparent)
}
:host([data-theme="dark"]) .rg-lv:not(:is(.game, .game *)) {
    background: var(--violet);
    color: var(--dk-on-acc);
    box-shadow: 0 3px 8px color-mix(in oklab, var(--dk-acc) 30%, transparent)
}
:host([data-theme="dark"]) .rg.on .rg-lv:not(:is(.game, .game *)) {
    background: var(--dk-blue);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .rg-s:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .rg-s svg:not(:is(.game, .game *)) {
    color: #F5A300
}
:host([data-theme="dark"]) .rg-band:not(:is(.game, .game *)) {
    background: var(--dk-blue-tint) var(--img) center 55%/cover;
    border: 3px solid var(--dk-line);
    box-shadow: var(--lift)
}
:host([data-theme="dark"]) .rg-band:not(:is(.game, .game *))::before {
    background: linear-gradient(90deg,color-mix(in oklab, var(--dk-card) 96%, transparent) 0%,color-mix(in oklab, var(--dk-card) 82%, transparent) 38%,color-mix(in oklab, var(--dk-card) 10%, transparent) 75%)
}
:host([data-theme="dark"]) .rg-kick:not(:is(.game, .game *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .rg-band h2:not(:is(.game, .game *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .rg-line:not(:is(.game, .game *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .lvmeta:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lvmeta svg:not(:is(.game, .game *)) {
    color: #F5A300
}
:host([data-theme="dark"]) .t-path:not(:is(.game, .game *))::before {
    background: linear-gradient(180deg,var(--cyan),var(--violet) 50%,var(--orange))
}
:host([data-theme="dark"]) .topic:not(:is(.game, .game *)) {
    background: var(--dk-card);
    color: var(--ink);
    border: 1px solid var(--dk-acc-line);
    box-shadow: 0 8px 22px color-mix(in oklab, var(--dk-acc) 9%, transparent)
}
:host([data-theme="dark"]) .topic:hover:not(:is(.game, .game *)) {
    box-shadow: 0 14px 30px color-mix(in oklab, var(--dk-acc) 15%, transparent)
}
:host([data-theme="dark"]) .topic.next-up:not(:is(.game, .game *)) {
    box-shadow: 0 0 0 3px var(--dk-blue),0 14px 30px color-mix(in oklab, var(--dk-blue) 22%, transparent)
}
:host([data-theme="dark"]) .stop .bubble:not(:is(.game, .game *)) {
    fill: var(--violet)
}
:host([data-theme="dark"]) .stop b:not(:is(.game, .game *)) {
    color: #fff
}
:host([data-theme="dark"]) .topic.done .stop .bubble:not(:is(.game, .game *)) {
    fill: #00C83A
}
:host([data-theme="dark"]) .topic.done .stop b:not(:is(.game, .game *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .topic.next-up .stop .bubble:not(:is(.game, .game *)) {
    fill: var(--dk-blue)
}
:host([data-theme="dark"]) .topic.next-up .stop b:not(:is(.game, .game *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .tid:not(:is(.game, .game *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .tout:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .btn.learn:not(:is(.game, .game *)) {
    background: var(--soft);
    border-color: transparent;
    color: var(--ink)
}
:host([data-theme="dark"]) .btn.learn svg:not(:is(.game, .game *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .btn.learn .ok:not(:is(.game, .game *)) {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .btn.playb:not(:is(.game, .game *)) {
    background: linear-gradient(135deg,var(--dk-acc),var(--dk-acc));
    color: var(--dk-on-acc);
    border: 0;
    box-shadow: 0 6px 16px color-mix(in oklab, var(--dk-acc) 30%, transparent)
}
:host([data-theme="dark"]) .btn.playb svg:not(:is(.game, .game *)) {
    color: #CFF4FF
}
:host([data-theme="dark"]) .stars i:not(:is(.game, .game *)) {
    color: rgba(255,255,255,.35)
}
:host([data-theme="dark"]) .stars i.on:not(:is(.game, .game *)) {
    color: var(--yellow)
}
:host([data-theme="dark"]) .lbar:not(:is(.game, .game *)) {
    color: var(--ink);
    background: var(--dk-blue-tint) var(--img) center 55%/cover;
    border-bottom: 1px solid color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .lbar:not(:is(.game, .game *))::before {
    background: linear-gradient(90deg,color-mix(in oklab, var(--dk-card) 95%, transparent),color-mix(in oklab, var(--dk-card) 84%, transparent) 55%,color-mix(in oklab, var(--dk-card) 45%, transparent))
}
:host([data-theme="dark"]) .iconb:not(:is(.game, .game *)) {
    color: var(--ink);
    background: var(--dk-card);
    border: 1px solid var(--line);
    box-shadow: 0 4px 12px color-mix(in oklab, var(--dk-acc) 10%, transparent)
}
:host([data-theme="dark"]) .ltitle small:not(:is(.game, .game *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .lprog i:not(:is(.game, .game *)) {
    background: rgba(255, 255, 255, 0.14)
}
:host([data-theme="dark"]) .lprog i.on:not(:is(.game, .game *)) {
    background: var(--violet)
}
:host([data-theme="dark"]) .lprog i.now:not(:is(.game, .game *)) {
    background: linear-gradient(90deg,var(--violet),var(--dk-blue));
    box-shadow: 0 0 10px color-mix(in oklab, var(--dk-acc) 50%, transparent)
}
:host([data-theme="dark"]) .lnav:not(:is(.game, .game *)) {
    background: var(--glass);
    border-top: 1px solid color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .visual:not(:is(.game, .game *)), :host([data-theme="dark"]) .tryit:not(:is(.game, .game *)), :host([data-theme="dark"]) .remember:not(:is(.game, .game *)), :host([data-theme="dark"]) .ck-q:not(:is(.game, .game *)), :host([data-theme="dark"]) .ck-end:not(:is(.game, .game *)), :host([data-theme="dark"]) .l-watch:not(:is(.game, .game *)), :host([data-theme="dark"]) .mcard:not(:is(.game, .game *)), :host([data-theme="dark"]) .term:not(:is(.game, .game *)), :host([data-theme="dark"]) .note:not(:is(.game, .game *)) {
    box-shadow: var(--lift);
    border-color: var(--dk-acc-line)
}
:host([data-theme="dark"]) .visual:not(:is(.game, .game *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .l-intro h1:not(:is(.game, .game *)) {
    background: linear-gradient(100deg,var(--dk-acc-text),var(--dk-acc-text) 60%,var(--dk-blue));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent
}
:host([data-theme="dark"]) .plan:not(:is(.game, .game *)) {
    background: var(--dk-card);
    border: 1px solid var(--dk-acc-line);
    box-shadow: var(--lift)
}
:host([data-theme="dark"]) .plan-top:not(:is(.game, .game *)) {
    background: var(--dk-blue-tint) var(--img) center 50%/cover
}
:host([data-theme="dark"]) .plan-k:not(:is(.game, .game *)) {
    color: var(--ink);
    background: color-mix(in oklab, var(--dk-card) 92%, transparent);
    box-shadow: 0 4px 12px color-mix(in oklab, var(--dk-acc) 15%, transparent)
}
:host([data-theme="dark"]) .plan .plan-game a:not(:is(.game, .game *)) {
    background: linear-gradient(135deg,var(--dk-acc),var(--dk-acc));
    color: var(--dk-on-acc);
    box-shadow: 0 6px 16px color-mix(in oklab, var(--dk-acc) 30%, transparent)
}
:host([data-theme="dark"]) .plan .plan-game svg:not(:is(.game, .game *)) {
    color: #CFF4FF
}
:host([data-theme="dark"]) .toplay:not(:is(.game, .game *)) {
    color: var(--ink);
    background: var(--dk-blue-tint) var(--img) center/cover;
    border: 3px solid var(--dk-line);
    box-shadow: 0 20px 44px color-mix(in oklab, var(--dk-acc) 20%, transparent)
}
:host([data-theme="dark"]) .toplay:not(:is(.game, .game *))::before {
    background: linear-gradient(90deg,color-mix(in oklab, var(--dk-card) 96%, transparent),color-mix(in oklab, var(--dk-card) 84%, transparent) 50%,color-mix(in oklab, var(--dk-card) 15%, transparent))
}
:host([data-theme="dark"]) .tp-k:not(:is(.game, .game *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .tp-done:not(:is(.game, .game *)) {
    background: var(--dk-green);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .practise:not(:is(.game, .game *)) {
    background: linear-gradient(135deg,var(--dk-acc) 0%,var(--dk-acc) 45%,var(--dk-acc-strong) 100%);
    color: var(--dk-on-acc);
    box-shadow: 0 14px 34px color-mix(in oklab, var(--dk-acc) 42%, transparent),inset 0 1px 0 rgba(255,255,255,.35)
}
:host([data-theme="dark"]) .practise:not(:is(.game, .game *))::after {
    background: linear-gradient(110deg,transparent 30%,color-mix(in oklab, var(--dk-card) 35%, transparent) 45%,transparent 60%)
}
:host([data-theme="dark"]) .practise:hover:not(:is(.game, .game *)) {
    box-shadow: 0 20px 44px color-mix(in oklab, var(--dk-acc) 50%, transparent)
}
:host([data-theme="dark"]) .practise:focus-visible:not(:is(.game, .game *)) {
    outline: 3px solid var(--dk-blue)
}
:host([data-theme="dark"]) .pr-orb:not(:is(.game, .game *)) {
    background: radial-gradient(circle at 34% 28%,var(--dk-card) 0,var(--dk-blue-tint) 30%,var(--dk-blue-soft) 100%);
    color: var(--violet);
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--dk-blue) 70%, transparent)
}
:host([data-theme="dark"]) .pr-t small:not(:is(.game, .game *)) {
    color: var(--dk-acc-on)
}
:host([data-theme="dark"]) .pr-go:not(:is(.game, .game *)) {
    background: rgba(255,255,255,.2)
}
:host([data-theme="dark"]) .g-bg:not(:is(.game, .game *)) {
    background: var(--dk-blue-tint) var(--img) center 60%/cover no-repeat
}
:host([data-theme="dark"]) .g-bg:not(:is(.game, .game *))::before {
    background: linear-gradient(180deg,color-mix(in oklab, var(--dk-card) 70%, transparent) 0%,color-mix(in oklab, var(--dk-card) 25%, transparent) 20%,color-mix(in oklab, var(--dk-card) 0%, transparent) 40%,color-mix(in oklab, var(--dk-card) 5%, transparent) 68%,color-mix(in oklab, var(--dk-card) 60%, transparent) 100%),
  radial-gradient(60% 40% at 50% 22%,rgba(10,199,255,calc(var(--p,0) * .25)),transparent 70%),
  radial-gradient(50% 35% at 22% 18%,rgba(0,230,65,calc(var(--p,0) * .16)),transparent 70%),
  radial-gradient(50% 35% at 80% 18%,rgba(255,125,29,calc(var(--p,0) * .14)),transparent 70%)
}
:host([data-theme="dark"]) .g-top:not(:is(.game, .game *)) {
    background: var(--glass);
    border-bottom: 1px solid color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .g-icon:not(:is(.game, .game *)) {
    background: var(--dk-card);
    color: var(--ink);
    border: 1px solid var(--line);
    box-shadow: 0 4px 12px color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .g-topic:not(:is(.game, .game *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .g-rtab:not(:is(.game, .game *)) {
    border: 1.5px solid var(--dk-acc-line);
    background: var(--dk-card);
    color: var(--ink)
}
:host([data-theme="dark"]) .g-rtab.on:not(:is(.game, .game *)) {
    background: var(--violet);
    border-color: var(--violet);
    color: var(--dk-on-acc);
    box-shadow: 0 4px 12px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .g-rtab.star:not(:is(.game, .game *)) {
    color: var(--dk-yellow);
    border-color: var(--dk-yellow-line)
}
:host([data-theme="dark"]) .g-rtab.star.on:not(:is(.game, .game *)) {
    background: var(--yellow);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .g-modal:not(:is(.game, .game *)) {
    background: color-mix(in oklab, var(--dk-acc) 18%, transparent)
}
:host([data-theme="dark"]) .g-card:not(:is(.game, .game *)) {
    background: color-mix(in oklab, var(--dk-card) 96%, transparent);
    color: var(--ink);
    border: 1px solid var(--dk-line);
    box-shadow: 0 26px 60px color-mix(in oklab, var(--dk-acc) 24%, transparent)
}
:host([data-theme="dark"]) .g-kicker:not(:is(.game, .game *)) {
    color: var(--cyan-ink)
}
:host([data-theme="dark"]) .g-kicker.bad:not(:is(.game, .game *)) {
    color: var(--dk-red)
}
:host([data-theme="dark"]) .g-note:not(:is(.game, .game *)) {
    background: var(--dk-yellow-tint);
    border-left: 3px solid var(--dk-yellow-line);
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .g-card .says-b:not(:is(.game, .game *)) {
    background: var(--dk-page);
    border-color: transparent;
    box-shadow: none
}
:host([data-theme="dark"]) .g-card .says-b:not(:is(.game, .game *))::before {
    background: var(--dk-page);
    border-color: transparent
}
:host([data-theme="dark"]) .pv:not(:is(.game, .game *)) {
    background: linear-gradient(170deg,color-mix(in srgb,var(--gc) 70%,var(--dk-card)),var(--gc));
    color: var(--dk-text);
    box-shadow: 0 8px 18px color-mix(in srgb,var(--gc) 35%,transparent)
}
:host([data-theme="dark"]) .pv small:not(:is(.game, .game *)) {
    color: color-mix(in oklab, var(--dk-text) 85%, transparent)
}
:host([data-theme="dark"]) .pv-play:not(:is(.game, .game *)) {
    border: 1.5px solid var(--dk-line);
    background: var(--dk-card);
    color: var(--ink)
}
:host([data-theme="dark"]) .g-link:not(:is(.game, .game *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .g-dots i:not(:is(.game, .game *)) {
    background: color-mix(in oklab, var(--dk-card) 85%, transparent);
    box-shadow: inset 0 0 0 1.5px color-mix(in oklab, var(--dk-acc) 30%, transparent)
}
:host([data-theme="dark"]) .g-dots i.on:not(:is(.game, .game *)) {
    background: var(--violet);
    box-shadow: 0 0 0 2px var(--dk-card),0 0 10px color-mix(in oklab, var(--dk-acc) 70%, transparent)
}
:host([data-theme="dark"]) .g-streak:not(:is(.game, .game *)) {
    color: var(--dk-on-bright);
    background: linear-gradient(135deg,var(--dk-orange),var(--dk-orange));
    box-shadow: 0 4px 12px color-mix(in oklab, var(--dk-orange) 35%, transparent)
}
:host([data-theme="dark"]) .g-hint:not(:is(.game, .game *)) {
    color: var(--ink);
    background: color-mix(in oklab, var(--dk-card) 82%, transparent);
    box-shadow: 0 6px 16px color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .echo:not(:is(.game, .game *)) {
    border: 0;
    background: none
}
:host([data-theme="dark"]) .echo-core:not(:is(.game, .game *)) {
    background: radial-gradient(circle at 34% 28%,var(--dk-card) 0,var(--dk-blue-tint) 18%,var(--dk-blue) 48%,var(--dk-acc) 100%);
    box-shadow: 0 0 0 3px var(--dk-card),0 10px 24px color-mix(in oklab, var(--dk-acc) 30%, transparent),0 0 30px 8px color-mix(in oklab, var(--dk-blue) 40%, transparent)
}
:host([data-theme="dark"]) .echo-ring:not(:is(.game, .game *)) {
    border: 2.5px solid color-mix(in oklab, var(--dk-blue) 85%, transparent)
}
:host([data-theme="dark"]) .echo.sel .echo-core:not(:is(.game, .game *)) {
    box-shadow: 0 0 0 4px var(--dk-card),0 0 0 7px var(--violet),0 0 30px 10px color-mix(in oklab, var(--dk-blue) 55%, transparent)
}
:host([data-theme="dark"]) .echo.card:not(:is(.game, .game *)) {
    background: var(--dk-card);
    border: 2.5px solid var(--dk-blue);
    color: var(--ink);
    box-shadow: 0 12px 28px color-mix(in oklab, var(--dk-acc) 22%, transparent)
}
:host([data-theme="dark"]) .echo.card.sel:not(:is(.game, .game *)) {
    border-color: var(--violet);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--dk-acc) 30%, transparent),0 14px 30px color-mix(in oklab, var(--dk-acc) 25%, transparent)
}
:host([data-theme="dark"]) .g-wave:not(:is(.game, .game *)) {
    border: 2px solid color-mix(in oklab, var(--dk-blue) 75%, transparent)
}
:host([data-theme="dark"]) .gate-hit:not(:is(.game, .game *)) {
    border: 0;
    background: none;
    color: var(--dk-text)
}
:host([data-theme="dark"]) .gate-arch:not(:is(.game, .game *)) {
    background: linear-gradient(180deg,color-mix(in srgb,var(--gc) 62%,var(--dk-card)),var(--gc));
    box-shadow: 0 0 0 3px var(--dk-card),0 14px 30px color-mix(in srgb,var(--gc) 45%,transparent),inset 0 -10px 20px rgba(0, 0, 0, 0.2)
}
:host([data-theme="dark"]) .gate-arch:not(:is(.game, .game *))::after {
    background: var(--gc)
}
:host([data-theme="dark"]) .gate:hover .gate-arch:not(:is(.game, .game *)), :host([data-theme="dark"]) .gate.hover .gate-arch:not(:is(.game, .game *)) {
    box-shadow: 0 0 0 3px var(--dk-card),0 0 0 7px color-mix(in srgb,var(--gc) 45%,transparent),0 18px 40px color-mix(in srgb,var(--gc) 55%,transparent)
}
:host([data-theme="dark"]) .gate-ripple:not(:is(.game, .game *)) {
    border: 3px solid var(--gc)
}
:host([data-theme="dark"]) .gate.sounding .gate-arch:not(:is(.game, .game *)) {
    box-shadow: 0 0 0 3px var(--dk-card),0 0 0 8px color-mix(in srgb,var(--gc) 40%,transparent),0 18px 40px color-mix(in srgb,var(--gc) 55%,transparent)
}
:host([data-theme="dark"]) .gate-key:not(:is(.game, .game *)) {
    color: color-mix(in oklab, var(--dk-text) 60%, transparent)
}
:host([data-theme="dark"]) .gate-hint:not(:is(.game, .game *)) {
    color: color-mix(in oklab, var(--dk-text) 80%, transparent)
}
:host([data-theme="dark"]) .gate-spk:not(:is(.game, .game *)) {
    border: 0;
    background: var(--dk-card);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4)
}
:host([data-theme="dark"]) .gate-spk svg:not(:is(.game, .game *)) {
    color: #fff;
    background: radial-gradient(circle at 34% 28%,var(--dk-card) 0,var(--dk-blue-tint) 16%,var(--dk-blue) 46%,var(--dk-acc) 100%)
}
:host([data-theme="dark"]) .gate-pop:not(:is(.game, .game *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 8px 20px color-mix(in oklab, var(--dk-acc) 20%, transparent)
}
:host([data-theme="dark"]) .gate-pop .ipa:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .g-glyph:not(:is(.game, .game *)) {
    color: color-mix(in srgb,var(--gc) 55%,var(--dk-text));
    text-shadow: 0 0 10px var(--dk-card),0 0 3px var(--dk-card)
}
:host([data-theme="dark"]) .g-toast:not(:is(.game, .game *)) {
    background: var(--yellow);
    color: var(--dk-on-bright);
    box-shadow: 0 6px 16px color-mix(in oklab, var(--dk-yellow) 35%, transparent)
}
:host([data-theme="dark"]) .g-mate-ring:not(:is(.game, .game *)) {
    border: 3px solid color-mix(in oklab, var(--dk-blue) 0%, transparent)
}
:host([data-theme="dark"]) .g-mate-b:not(:is(.game, .game *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 10px 24px color-mix(in oklab, var(--dk-acc) 20%, transparent)
}
:host([data-theme="dark"]) .fb .fb-word .ipa:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .fb-g:not(:is(.game, .game *)) {
    border: 2px solid var(--gc);
    background: color-mix(in srgb,var(--gc) 14%,var(--dk-card))
}
:host([data-theme="dark"]) .fb-g small:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .g-card .btn.ghost:not(:is(.game, .game *)), :host([data-theme="dark"]) .btn.ghost.sm:not(:is(.game, .game *)) {
    color: var(--ink);
    border-color: var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .fb-g .btn svg:not(:is(.game, .game *)) {
    color: #fff;
    background: radial-gradient(circle at 34% 28%,var(--dk-card) 0,var(--dk-blue-tint) 16%,var(--dk-blue) 46%,var(--dk-acc) 100%)
}
:host([data-theme="dark"]) .fb-why:not(:is(.game, .game *)) {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .tut-orb:not(:is(.game, .game *)) {
    background: radial-gradient(circle at 34% 28%,var(--dk-card),var(--dk-blue-tint) 18%,var(--dk-blue) 48%,var(--dk-acc));
    box-shadow: 0 0 0 3px var(--dk-card),0 4px 12px color-mix(in oklab, var(--dk-blue) 40%, transparent)
}
:host([data-theme="dark"]) .tut-gate:not(:is(.game, .game *)) {
    background: var(--cyan)
}
:host([data-theme="dark"]) .tut-back:not(:is(.game, .game *)), :host([data-theme="dark"]) .tut-spk:not(:is(.game, .game *)) {
    background: var(--soft);
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .tut-keys:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .res-star:not(:is(.game, .game *)) {
    color: var(--dk-acc-on)
}
:host([data-theme="dark"]) .res-star.on:not(:is(.game, .game *)) {
    color: var(--yellow)
}
:host([data-theme="dark"]) .res-note:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .chip:not(:is(.game, .game *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card);
    color: var(--ink)
}
:host([data-theme="dark"]) .chip small:not(:is(.game, .game *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .portal-fx:not(:is(.game, .game *)) {
    background: rgba(255,255,255,0)
}
:host([data-theme="dark"]) .portal-fx .pfx:not(:is(.game, .game *)) {
    fill: #fff;
    stroke: var(--pc)
}
:host([data-theme="dark"]) .portal-fx.go:not(:is(.game, .game *)) {
    background: color-mix(in oklab, var(--dk-page) 75%, transparent)
}
:host([data-theme="dark"]) .l1:not(:is(.game, .game *)) {
    color: var(--dk-acc-text)
}
@container pron (max-width:820px) {
    :host([data-theme="dark"]) .w-hero:not(:is(.game, .game *)) {
        background-color: var(--dk-page)
    }
    :host([data-theme="dark"]) .w-hero:not(:is(.game, .game *))::before {
        background: linear-gradient(180deg,color-mix(in oklab, var(--dk-card) 0%, transparent) 0px,color-mix(in oklab, var(--dk-card) 0%, transparent) 170px,color-mix(in oklab, var(--dk-card) 90%, transparent) 290px,var(--dk-card) 330px,var(--dk-card) 100%)
    }
    :host([data-theme="dark"]) .rg-band:not(:is(.game, .game *))::before {
        background: linear-gradient(0deg,color-mix(in oklab, var(--dk-card) 97%, transparent) 0%,color-mix(in oklab, var(--dk-card) 85%, transparent) 55%,color-mix(in oklab, var(--dk-card) 30%, transparent) 100%)
    }
    :host([data-theme="dark"]) .toplay:not(:is(.game, .game *))::before {
        background: linear-gradient(180deg,color-mix(in oklab, var(--dk-card) 95%, transparent),color-mix(in oklab, var(--dk-card) 86%, transparent) 70%,color-mix(in oklab, var(--dk-card) 60%, transparent))
    }
}
:host([data-theme="dark"]) .gate.nope .gate-arch:not(:is(.game, .game *))::before {
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--dk-acc) 45%, transparent)
}
:host([data-theme="dark"]) .echo.retry .echo-core:not(:is(.game, .game *)) {
    box-shadow: 0 0 0 3px var(--dk-card),0 0 0 7px color-mix(in oklab, var(--dk-yellow) 75%, transparent),0 0 30px 10px color-mix(in oklab, var(--dk-blue) 45%, transparent)
}
:host([data-theme="dark"]) .g-why:not(:is(.game, .game *)) {
    border: 1.5px solid var(--dk-acc-line);
    background: var(--dk-card);
    color: var(--violet-ink);
    box-shadow: 0 4px 12px color-mix(in oklab, var(--dk-acc) 14%, transparent)
}
:host([data-theme="dark"]) .g-why b:not(:is(.game, .game *)) {
    background: var(--soft);
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .g-why:hover:not(:is(.game, .game *)) {
    border-color: var(--violet)
}
:host([data-theme="dark"]) :is(.game) {
    color-scheme: light;
    --violet: #874BF8;
    --cyan: #0AC7FF;
    --cyan-2: #0AAFFF;
    --green: #00E641;
    --orange: #FF7D1D;
    --yellow: #FFD60A;
    --night: #140B3A;
    --night-2: #24125E;
    --night-3: #3B1C8F;
    --paper: #F6F3FF;
    --surface: #FFFFFF;
    --ink: #1A1033;
    --ink-2: #5C5670;
    --line: #E4DDF7;
    --soft: #EFE9FF;
    --accent: #874BF8;
    --accent-ink: #FFFFFF;
    --accent-deep: #6A2FE0;
    --voiced: #0B7A6E;
    --voiceless: #A14A00;
    --good: #0B7A3E;
    --bad: #C2410C;
    --air: #0A8FD0;
    --tongue: #E58C8C;
    --tongue-l: #B65F55;
    --lip: #E7A9A0;
    --shadow: 0 10px 30px rgba(52,24,140,.10),0 2px 6px rgba(52,24,140,.06);
    --paper: #F7F5FF;
    --line: #E4DDF7;
    --soft: #F1ECFF;
    --ink-2: #554E6B;
    --glass: rgba(255,255,255,.78);
    --glass-2: rgba(255,255,255,.92);
    --sky: radial-gradient(900px 520px at 6% -8%,#D4EFFF 0,rgba(212,239,255,0) 62%),radial-gradient(820px 520px at 100% -4%,#EADFFF 0,rgba(234,223,255,0) 60%),radial-gradient(760px 520px at 50% 108%,#FFE9D6 0,rgba(255,233,214,0) 62%),#F7F5FF;
    --lift: 0 14px 34px rgba(76,44,170,.13),0 2px 6px rgba(76,44,170,.06);
    --violet-ink: #5B25D6;
    --cyan-ink: #0A6E9E
}
`
