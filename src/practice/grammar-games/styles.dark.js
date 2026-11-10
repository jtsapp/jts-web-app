// Тёмный слой «grammar-games» для Shadow DOM. СГЕНЕРИРОВАН scripts/practice/shadow-dark.js из styles.js раздела —
// руками не править: правки — в SECTIONS генератора. Кладётся в тень ПОСЛЕ светлых стилей.

export const GRAMMAR_GAMES_DARK_CSS = `:host([data-theme="dark"]) .gg {
    --acc: var(--dk-acc);
    --acc2: var(--dk-acc-strong);
    --ink: var(--dk-text);
    --muted: var(--dk-text-2);
    --line: var(--dk-line);
    --bg: var(--dk-card);
    --ok: var(--dk-green);
    --okbg: var(--dk-green-tint);
    --bad: var(--dk-red);
    --badbg: var(--dk-page);
    --ks: var(--dk-blue);
    --ka: var(--dk-acc);
    --kv: var(--dk-green);
    --kn: var(--dk-red);
    --kq: var(--dk-orange);
    --ko: var(--dk-text-2);
    --ksb: var(--dk-blue-tint);
    --kab: var(--dk-acc-tint);
    --kvb: var(--dk-green-tint);
    --knb: var(--dk-red-tint);
    --kqb: var(--dk-yellow-tint);
    --kob: var(--dk-page);
    background: var(--bg);
    color: var(--ink)
}
:host([data-theme="dark"]) button {
    color: inherit
}
:host([data-theme="dark"]) .icon-btn {
    border: 1px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .sub {
    color: var(--muted)
}
:host([data-theme="dark"]) .back {
    border: 0;
    background: none;
    color: var(--muted)
}
:host([data-theme="dark"]) .btn {
    border: 0;
    background: var(--acc);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .btn:hover {
    background: var(--acc2)
}
:host([data-theme="dark"]) .btn.line {
    background: var(--dk-card);
    color: var(--ink);
    border: 1.5px solid var(--line)
}
:host([data-theme="dark"]) .btn.line:hover {
    background: var(--dk-page);
    border-color: var(--dk-acc-line)
}
:host([data-theme="dark"]) .pill {
    background: var(--dk-card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .hero {
    background: linear-gradient(110.8deg,var(--dk-acc) 15.5%,var(--dk-acc-strong) 94.2%);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .hero:after {
    background-image: radial-gradient(color-mix(in oklab, var(--dk-card) 18%, transparent) 1px,transparent 1px)
}
:host([data-theme="dark"]) .hero h1 {
    color: #fff
}
:host([data-theme="dark"]) .hero .stat {
    background: rgba(255,255,255,.16)
}
:host([data-theme="dark"]) .lvcard {
    border: 0;
    color: var(--dk-on-acc);
    background: linear-gradient(140deg,var(--dk-acc),var(--dk-acc-strong))
}
:host([data-theme="dark"]) .lvcard:before {
    background-image: radial-gradient(color-mix(in oklab, var(--dk-card) 20%, transparent) 1px,transparent 1px)
}
:host([data-theme="dark"]) .lvcard .bar {
    background: rgba(255,255,255,.25)
}
:host([data-theme="dark"]) .lvcard .bar i {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .lvcard.on {
    box-shadow: 0 14px 30px color-mix(in oklab, var(--dk-acc) 30%, transparent),0 0 0 3px var(--dk-card) inset,0 0 0 5px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .stk span {
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.16)
}
:host([data-theme="dark"]) .stk span:nth-child(1) {
    background: var(--dk-card);
    color: var(--acc);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .stk span:nth-child(2) {
    background: var(--dk-blue);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .stk span:nth-child(3) {
    background: var(--dk-red);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .tcard {
    background: var(--dk-card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .tcard:hover {
    box-shadow: 0 12px 28px color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .tcard .num {
    color: var(--acc)
}
:host([data-theme="dark"]) .tcard p {
    color: var(--muted)
}
:host([data-theme="dark"]) .tcard .prog {
    color: var(--muted)
}
:host([data-theme="dark"]) .tcard .prog .bar {
    background: var(--dk-chip)
}
:host([data-theme="dark"]) .tcard.soon:hover {
    box-shadow: none
}
:host([data-theme="dark"]) .thead {
    background: var(--dk-card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .thead .lvb {
    background: var(--dk-chip);
    color: var(--acc)
}
:host([data-theme="dark"]) .tabs button {
    border: 1px solid var(--dk-acc-line);
    background: var(--dk-card);
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) .tabs button.on {
    background: var(--acc);
    border-color: var(--acc);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .c3d {
    background: linear-gradient(160deg,var(--dk-card) 0%,var(--dk-page) 100%);
    border: 1px solid var(--dk-line);
    box-shadow: 0 2px 0 var(--dk-chip),0 9px 0 -2px var(--dk-acc-tint),0 16px 28px color-mix(in oklab, var(--dk-acc) 10%, transparent)
}
:host([data-theme="dark"]) .c3d:hover {
    box-shadow: 0 2px 0 var(--dk-acc-tint),0 12px 0 -2px var(--dk-acc-soft),0 26px 40px color-mix(in oklab, var(--dk-acc) 22%, transparent)
}
:host([data-theme="dark"]) .c3d .no {
    color: var(--dk-acc-on)
}
:host([data-theme="dark"]) .c3d .ex1 {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .c3d .more-hint {
    color: var(--acc)
}
:host([data-theme="dark"]) .brick {
    border: 1.5px solid transparent;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12),0 8px 16px color-mix(in oklab, var(--dk-acc) 8%, transparent)
}
:host([data-theme="dark"]) .brick.s {
    background: var(--ksb);
    color: var(--ks);
    border-color: var(--dk-acc-line)
}
:host([data-theme="dark"]) .brick.a {
    background: var(--kab);
    color: var(--ka);
    border-color: var(--dk-acc-line)
}
:host([data-theme="dark"]) .brick.v {
    background: var(--kvb);
    color: var(--kv);
    border-color: var(--dk-green-line)
}
:host([data-theme="dark"]) .brick.n {
    background: var(--knb);
    color: var(--kn);
    border-color: var(--dk-red-line)
}
:host([data-theme="dark"]) .brick.q {
    background: var(--kqb);
    color: var(--kq);
    border-color: var(--dk-yellow-line)
}
:host([data-theme="dark"]) .brick.o {
    background: var(--kob);
    color: var(--ko);
    border-color: var(--dk-line)
}
:host([data-theme="dark"]) .plus {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .legend {
    color: var(--muted)
}
:host([data-theme="dark"]) .ov {
    background: rgba(25,20,49,.55)
}
:host([data-theme="dark"]) .modal {
    background: var(--dk-card);
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .exl {
    border: 1px solid var(--line);
    background: var(--dk-page)
}
:host([data-theme="dark"]) .spk {
    border: 0;
    background: var(--dk-acc-tint);
    color: var(--acc)
}
:host([data-theme="dark"]) .spk:hover {
    background: var(--acc);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .gtable {
    background: var(--dk-card);
    border: 1px solid var(--line);
    box-shadow: 0 10px 24px color-mix(in oklab, var(--dk-acc) 6%, transparent)
}
:host([data-theme="dark"]) .gtable .cap {
    background: linear-gradient(90deg,var(--dk-acc-tint),var(--dk-card));
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .gt th {
    background: var(--dk-page);
    color: var(--muted);
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .gt th .hc.p {
    background: var(--dk-green-tint);
    color: var(--dk-green)
}
:host([data-theme="dark"]) .gt th .hc.m {
    background: var(--dk-page);
    color: var(--dk-red)
}
:host([data-theme="dark"]) .gt th .hc.q {
    background: var(--dk-yellow-tint);
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .gt td {
    border-bottom: 1px solid var(--dk-line)
}
:host([data-theme="dark"]) .gt tr:last-child td {
    border-bottom: 0
}
:host([data-theme="dark"]) .gt td:first-child {
    color: var(--acc)
}
:host([data-theme="dark"]) .gt tbody tr:hover td {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .mist {
    background: var(--dk-card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .mist .b {
    color: var(--dk-red)
}
:host([data-theme="dark"]) .mist .g {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .mist .why {
    color: var(--muted)
}
:host([data-theme="dark"]) .w {
    border-bottom: 1.5px dotted color-mix(in oklab, var(--dk-acc) 45%, transparent)
}
:host([data-theme="dark"]) .w:hover, :host([data-theme="dark"]) .w.sel {
    background: var(--dk-acc-tint);
    border-bottom-color: var(--acc)
}
:host([data-theme="dark"]) .pop {
    background: var(--dk-card);
    box-shadow: 0 16px 40px color-mix(in oklab, var(--dk-acc) 25%, transparent);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .pop .tr b {
    background: var(--dk-chip);
    color: var(--acc)
}
:host([data-theme="dark"]) .pop .acts button {
    border: 0;
    background: var(--dk-chip);
    color: var(--acc)
}
:host([data-theme="dark"]) .pop .acts button:hover {
    background: var(--acc);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .cta {
    background: linear-gradient(110.8deg,var(--dk-acc) 15.5%,var(--dk-acc-strong) 94.2%);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .cta .btn {
    background: var(--dk-card);
    color: var(--acc)
}
:host([data-theme="dark"]) .cta .btn:hover {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .gcard {
    --gb: var(--dk-page);
    --gc: var(--dk-acc);
    background: var(--gb);
    border: 1.5px solid transparent
}
:host([data-theme="dark"]) .gcard:hover {
    box-shadow: 0 12px 26px color-mix(in oklab, var(--dk-acc) 12%, transparent);
    border-color: color-mix(in oklab, var(--dk-acc) 25%, transparent)
}
:host([data-theme="dark"]) .gcard b {
    color: var(--gc)
}
:host([data-theme="dark"]) .gcard>span {
    color: var(--ink)
}
:host([data-theme="dark"]) .gcard .stars {
    color: color-mix(in oklab, var(--dk-text) 13%, transparent)
}
:host([data-theme="dark"]) .gcard .stars .y {
    color: #FFB400
}
:host([data-theme="dark"]) .gcard.done {
    border-color: var(--dk-yellow-line)
}
:host([data-theme="dark"]) .g-pick {
    --gb: var(--dk-acc-tint);
    --gc: var(--dk-acc)
}
:host([data-theme="dark"]) .g-match {
    --gb: var(--dk-red-tint);
    --gc: var(--dk-red)
}
:host([data-theme="dark"]) .g-sort {
    --gb: var(--dk-yellow-tint);
    --gc: var(--dk-orange)
}
:host([data-theme="dark"]) .g-build {
    --gb: var(--dk-blue-tint);
    --gc: var(--dk-blue)
}
:host([data-theme="dark"]) .g-trans {
    --gb: var(--dk-green-tint);
    --gc: var(--dk-green)
}
:host([data-theme="dark"]) .g-fix {
    --gb: var(--dk-red-tint);
    --gc: var(--dk-red)
}
:host([data-theme="dark"]) .g-place {
    --gb: var(--dk-yellow-tint);
    --gc: var(--dk-orange)
}
:host([data-theme="dark"]) .g-type {
    --gb: var(--dk-blue-tint);
    --gc: var(--dk-blue)
}
:host([data-theme="dark"]) .g-dialog {
    --gb: var(--dk-acc-tint);
    --gc: var(--dk-acc)
}
:host([data-theme="dark"]) .g-listen {
    --gb: var(--dk-green-tint);
    --gc: var(--dk-green)
}
:host([data-theme="dark"]) .g-race {
    --gb: var(--dk-red-tint);
    --gc: var(--dk-red)
}
:host([data-theme="dark"]) .g-catch {
    --gb: var(--dk-blue-tint);
    --gc: var(--dk-blue)
}
:host([data-theme="dark"]) .gcard.boss {
    --gb: linear-gradient(110.8deg,var(--dk-acc) 15.5%,var(--dk-acc-strong) 94.2%);
    --gc: var(--dk-card);
    color: #fff
}
:host([data-theme="dark"]) .gcard.boss>span {
    color: #fff
}
:host([data-theme="dark"]) .gcard.boss .stars {
    color: rgba(255,255,255,.3)
}
:host([data-theme="dark"]) .pbar {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .pbar i {
    background: linear-gradient(90deg,var(--dk-acc),var(--dk-acc))
}
:host([data-theme="dark"]) .stage {
    background: var(--dk-card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .ginst {
    color: var(--muted)
}
:host([data-theme="dark"]) .q .hint {
    color: var(--muted)
}
:host([data-theme="dark"]) .blank {
    border-bottom: 3px solid var(--acc);
    color: var(--acc)
}
:host([data-theme="dark"]) .opt {
    border: 1.5px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .opt:hover {
    border-color: var(--dk-acc-line);
    background: var(--dk-page)
}
:host([data-theme="dark"]) .opt.ok {
    background: var(--okbg);
    border-color: var(--ok);
    color: var(--dk-green)
}
:host([data-theme="dark"]) .opt.bad {
    background: var(--badbg);
    border-color: var(--bad);
    color: var(--dk-red)
}
:host([data-theme="dark"]) .fb.ok {
    color: var(--ok)
}
:host([data-theme="dark"]) .fb.bad {
    color: var(--bad)
}
:host([data-theme="dark"]) .explain {
    color: var(--muted)
}
:host([data-theme="dark"]) .answer {
    border: 2px dashed var(--dk-acc-line);
    background: var(--dk-page)
}
:host([data-theme="dark"]) .answer.ok {
    border-color: var(--ok);
    background: var(--okbg)
}
:host([data-theme="dark"]) .answer.bad {
    border-color: var(--bad);
    background: var(--badbg)
}
:host([data-theme="dark"]) .bub {
    border: 0;
    color: var(--dk-on-acc);
    background: linear-gradient(110.8deg,var(--dk-acc) 15.5%,var(--dk-acc-strong) 94.2%);
    box-shadow: 0 6px 14px color-mix(in oklab, var(--dk-acc) 25%, transparent)
}
:host([data-theme="dark"]) .word {
    background: var(--dk-card);
    border: 1.5px solid var(--dk-acc-line)
}
:host([data-theme="dark"]) .solution {
    color: var(--muted)
}
:host([data-theme="dark"]) .tfrom {
    background: var(--dk-acc-tint);
    border: 2px solid var(--dk-acc-line)
}
:host([data-theme="dark"]) .ttask {
    background: var(--dk-yellow-tint);
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .arrow {
    color: var(--acc)
}
:host([data-theme="dark"]) .mc .f {
    background: linear-gradient(110.8deg,var(--dk-acc) 15.5%,var(--dk-acc-strong) 94.2%);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .mc .b {
    background: var(--dk-card);
    border: 2px solid var(--dk-acc-line)
}
:host([data-theme="dark"]) .mc.done .b {
    background: var(--okbg);
    border-color: var(--ok)
}
:host([data-theme="dark"]) .chip2 {
    border: 1.5px solid var(--dk-acc-line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .chip2.sel {
    border-color: var(--acc);
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .chip2.bad {
    border-color: var(--bad)
}
:host([data-theme="dark"]) .bucket {
    border: 2px dashed var(--dk-acc-line);
    background: var(--dk-page)
}
:host([data-theme="dark"]) .bucket:hover {
    border-color: var(--acc);
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .bucket h5 {
    color: var(--acc)
}
:host([data-theme="dark"]) .bucket .in span {
    background: var(--okbg);
    border: 1px solid var(--dk-green-line);
    color: var(--dk-green)
}
:host([data-theme="dark"]) .tin input {
    border: 2px solid var(--dk-acc-line);
    outline: none
}
:host([data-theme="dark"]) .tin input:focus {
    border-color: var(--acc)
}
:host([data-theme="dark"]) .tin input.ok {
    border-color: var(--ok);
    background: var(--okbg)
}
:host([data-theme="dark"]) .tin input.bad {
    border-color: var(--bad);
    background: var(--badbg)
}
:host([data-theme="dark"]) .msg .bb {
    background: var(--dk-chip)
}
:host([data-theme="dark"]) .msg.B .bb {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .msg .bb .fill {
    color: var(--acc)
}
:host([data-theme="dark"]) .track {
    background: var(--dk-acc-strong)
}
:host([data-theme="dark"]) .lane {
    border-bottom: 2px dashed rgba(255,255,255,.25)
}
:host([data-theme="dark"]) .lane:last-child {
    border-bottom: 0
}
:host([data-theme="dark"]) .lane .fin {
    background: repeating-linear-gradient(0deg,var(--dk-card) 0 7px,#111 7px 14px)
}
:host([data-theme="dark"]) .lane .nm {
    color: rgba(255,255,255,.75)
}
:host([data-theme="dark"]) .lbtn {
    border: 0;
    background: linear-gradient(110.8deg,var(--dk-acc) 15.5%,var(--dk-acc-strong) 94.2%);
    color: var(--dk-on-acc);
    box-shadow: 0 14px 30px color-mix(in oklab, var(--dk-acc) 30%, transparent)
}
:host([data-theme="dark"]) .sky {
    background: linear-gradient(var(--dk-blue-tint),var(--dk-acc-tint))
}
:host([data-theme="dark"]) .cloud {
    background: var(--dk-card);
    box-shadow: 0 8px 20px color-mix(in oklab, var(--dk-acc) 18%, transparent)
}
:host([data-theme="dark"]) .cloud:before, :host([data-theme="dark"]) .cloud:after {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .cloud.ok {
    background: var(--ok);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .cloud.bad {
    background: var(--bad);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .sentence .word:hover {
    border-color: var(--acc)
}
:host([data-theme="dark"]) .sentence .word.sel {
    border-color: var(--bad);
    background: var(--badbg)
}
:host([data-theme="dark"]) .sentence .word.fixed {
    border-color: var(--ok);
    background: var(--okbg)
}
:host([data-theme="dark"]) .sentence .word.miss {
    border-color: var(--dk-red-line)
}
:host([data-theme="dark"]) .scene {
    background: linear-gradient(var(--dk-page) 0 82%,var(--dk-chip) 82%)
}
:host([data-theme="dark"]) .boxA {
    border: 4px solid var(--dk-yellow);
    background: color-mix(in oklab, var(--dk-yellow) 28%, transparent)
}
:host([data-theme="dark"]) .boxA:before {
    border: 4px solid var(--dk-yellow);
    border-bottom: 0;
    background: color-mix(in oklab, var(--dk-yellow) 45%, transparent)
}
:host([data-theme="dark"]) .legA {
    background: var(--dk-yellow)
}
:host([data-theme="dark"]) .boxB {
    background: linear-gradient(var(--dk-yellow-soft),var(--dk-yellow))
}
:host([data-theme="dark"]) .boxB:after {
    background: rgba(255,255,255,.25)
}
:host([data-theme="dark"]) .zone {
    border: 3px dashed color-mix(in oklab, var(--dk-acc) 35%, transparent);
    background: color-mix(in oklab, var(--dk-acc) 6%, transparent)
}
:host([data-theme="dark"]) .zone:hover {
    border-color: var(--acc);
    background: color-mix(in oklab, var(--dk-acc) 16%, transparent)
}
:host([data-theme="dark"]) .zone.ok {
    border-color: var(--ok);
    background: color-mix(in oklab, var(--dk-green) 18%, transparent)
}
:host([data-theme="dark"]) .zone.bad {
    border-color: var(--bad);
    background: color-mix(in oklab, var(--dk-red) 18%, transparent)
}
:host([data-theme="dark"]) .arena {
    background: linear-gradient(var(--dk-acc-deep),var(--dk-acc-strong));
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .hp {
    background: rgba(255,255,255,.2)
}
:host([data-theme="dark"]) .hp i {
    background: linear-gradient(90deg,var(--dk-red),var(--dk-yellow))
}
:host([data-theme="dark"]) .result .big .y {
    color: #FFB400
}
:host([data-theme="dark"]) .result .big span {
    color: var(--dk-acc-on)
}
:host([data-theme="dark"]) .rtrack {
    background: linear-gradient(180deg,var(--dk-acc-soft) 0%,var(--dk-acc-tint) 52%,var(--dk-page) 100%)
}
:host([data-theme="dark"]) .rclouds {
    background: radial-gradient(28px 14px at 60px 26px,var(--dk-card) 98%,transparent),radial-gradient(40px 18px at 92px 22px,var(--dk-card) 98%,transparent),radial-gradient(26px 12px at 330px 30px,var(--dk-card) 98%,transparent),radial-gradient(38px 16px at 365px 24px,var(--dk-card) 98%,transparent),radial-gradient(30px 13px at 620px 28px,var(--dk-card) 98%,transparent)
}
:host([data-theme="dark"]) .rhills {
    background: radial-gradient(120px 40px at 100px 40px,var(--dk-acc) 98%,transparent),radial-gradient(160px 46px at 380px 44px,var(--dk-acc) 98%,transparent),radial-gradient(110px 36px at 610px 40px,var(--dk-acc) 98%,transparent)
}
:host([data-theme="dark"]) .rlane {
    background: var(--dk-acc-strong);
    background-image: linear-gradient(90deg,color-mix(in oklab, var(--dk-card) 50%, transparent) 50%,transparent 0);
    box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.24)
}
:host([data-theme="dark"]) .rnm {
    color: rgba(255,255,255,.8)
}
:host([data-theme="dark"]) .rfin {
    background: repeating-conic-gradient(var(--dk-card) 0 25%,var(--dk-ink-bg) 0 50%) 0 0/12px 12px
}
:host([data-theme="dark"]) .sky {
    background: linear-gradient(180deg,var(--dk-acc-tint) 0%,var(--dk-acc-tint) 55%,var(--dk-blue-tint) 100%) !important
}
:host([data-theme="dark"]) .arena2 {
    background: linear-gradient(110.8deg,var(--dk-acc) 15.5%,var(--dk-acc-strong) 94.2%)
}
:host([data-theme="dark"]) .arena2:before {
    background-image: radial-gradient(color-mix(in oklab, var(--dk-card) 18%, transparent) 1px,transparent 1px)
}
:host([data-theme="dark"]) .ar-lights {
    background: radial-gradient(ellipse 45% 60% at 25% 0%,color-mix(in oklab, var(--dk-card) 22%, transparent),transparent 70%),radial-gradient(ellipse 45% 60% at 75% 0%,color-mix(in oklab, var(--dk-card) 18%, transparent),transparent 70%)
}
:host([data-theme="dark"]) .ar-ring {
    background: radial-gradient(ellipse at center,color-mix(in oklab, var(--dk-card) 35%, transparent),color-mix(in oklab, var(--dk-card) 6%, transparent) 60%,transparent 72%)
}
:host([data-theme="dark"]) .ar-hud {
    color: #fff
}
:host([data-theme="dark"]) .hp2 {
    background: rgba(255,255,255,.25)
}
:host([data-theme="dark"]) .hp2 i {
    background: linear-gradient(90deg,var(--dk-green),var(--dk-green))
}
:host([data-theme="dark"]) .hp2.sp i {
    background: linear-gradient(90deg,var(--dk-red),var(--dk-yellow))
}
:host([data-theme="dark"]) .ar-vs {
    color: #fff;
    text-shadow: 0 3px 0 rgba(0, 0, 0, 0.36)
}
:host([data-theme="dark"]) .pow {
    color: #FFE14D;
    text-shadow: 0 5px 0 var(--dk-acc-strong)
}
:host([data-theme="dark"]) .toast {
    background: var(--dk-ink-bg);
    color: #fff
}
:host([data-theme="dark"]) .pop .acts button:disabled {
    background: var(--dk-chip);
    color: var(--acc)
}
`
