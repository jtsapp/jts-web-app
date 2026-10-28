// CSS «Pronunciation World» для Shadow DOM. СГЕНЕРИРОВАН
// scripts/pronunciation/extract-styles.js из <style> прототипа — руками не
// править: правки — в PATCHES/APP_CSS генератора (там же — что и почему
// отличается от прототипа).

export const PRONUNCIATION_CSS = `:host{
  
  --violet:#874BF8; --cyan:#0AC7FF; --cyan-2:#0AAFFF; --green:#00E641; --orange:#FF7D1D; --yellow:#FFD60A;
  --night:#140B3A; --night-2:#24125E; --night-3:#3B1C8F;
  
  --paper:#F6F3FF; --surface:#FFFFFF; --ink:#1A1033; --ink-2:#5C5670; --line:#E4DDF7; --soft:#EFE9FF;
  --accent:#874BF8; --accent-ink:#FFFFFF; --accent-deep:#6A2FE0;
  --voiced:#0B7A6E; --voiceless:#A14A00; --good:#0B7A3E; --bad:#C2410C;
  --air:#0A8FD0; --tongue:#E58C8C; --tongue-l:#B65F55; --lip:#E7A9A0;
  --r-s:12px; --r-m:18px; --r-l:28px;
  
  --head:var(--pron-font,inherit);
  --ui:var(--pron-font,inherit);
  --ipa:"Charis SIL","Doulos SIL","Noto Serif",serif;
  --tr-size:.95em; --tr-lh:1.62; --cap:.66rem;
  --shadow:0 10px 30px rgba(52,24,140,.10),0 2px 6px rgba(52,24,140,.06);
  color-scheme:light;
}
*{box-sizing:border-box}

.pron{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 var(--ui);font-feature-settings:"kern","calt";text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
p,li,dd,small{text-wrap:pretty}

:lang(ru),:lang(kk){letter-spacing:0;hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word}
h1:lang(ru),h1:lang(kk),h2:lang(ru),h2:lang(kk){hyphens:manual}
h1,h2,h3,.btn,.brand-name{font-family:var(--head)}
a{color:var(--accent-deep)}
:focus-visible{outline:3px solid var(--cyan);outline-offset:2px;border-radius:8px}
main:focus,main:focus-visible{outline:none}
[hidden]{display:none!important}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ipa{font-family:var(--ipa);letter-spacing:.01em;font-variant-ligatures:none}
p .ipa,li .ipa,.sup .ipa{font-size:1.06em;line-height:1}
p{margin:0 0 .5em}
.sup{color:var(--ink-2);font-size:.92em;margin-top:-.25em}
.fine{font-size:.84rem;color:var(--ink-2)} .muted{color:var(--ink-2)}
svg{display:block}
button{font:inherit;color:inherit}
.alert{background:#FFF1E8;color:#6A2300;border:1px solid var(--bad);padding:10px 14px;border-radius:var(--r-s)}
img.mascot{display:block;height:auto;user-select:none;-webkit-user-drag:none;pointer-events:none}


.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:10px 20px;border-radius:999px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font-weight:700;text-decoration:none;cursor:pointer;white-space:nowrap;transition:transform .15s,box-shadow .2s,background .2s,border-color .2s}
.btn svg{width:20px;height:20px}
.btn:hover{border-color:var(--accent);transform:translateY(-1px)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);box-shadow:0 6px 18px rgba(135,75,248,.32)}
.btn.primary:hover{background:var(--accent-deep);border-color:var(--accent-deep)}
.btn.ghost{background:transparent}
.btn.sm{min-height:38px;padding:6px 14px;font-size:.92rem}
.btn.glow{background:var(--cyan);border:0;color:var(--night);box-shadow:0 8px 26px rgba(10,199,255,.45)}
.btn.glow:hover{background:#3DD5FF}
.btn.big{min-height:58px;padding:12px 28px;font-size:1.12rem}
.linkbtn{background:none;border:0;padding:0;color:var(--accent-deep);text-decoration:underline;cursor:pointer}
.say{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:6px 12px;border-radius:999px;border:1.5px solid var(--line);background:var(--surface);cursor:pointer;font-weight:600;transition:border-color .15s,box-shadow .2s}
.say svg{width:18px;height:18px;color:var(--accent);flex:none}
.say:hover{border-color:var(--accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 14%,transparent)}
.say .ipa{font-weight:400;color:var(--ink-2)}
.say.us svg{color:#C0392B}


.says{display:flex;align-items:flex-end;gap:12px;margin:14px 0}
.says img.mascot{width:78px;flex:none;filter:drop-shadow(0 8px 12px rgba(40,16,110,.25))}
.says-b{position:relative;flex:1;min-width:0;padding:14px 18px;border-radius:22px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow)}
.says-b::before{content:"";position:absolute;left:-9px;bottom:16px;width:18px;height:18px;background:var(--surface);border-left:1px solid var(--line);border-bottom:1px solid var(--line);transform:rotate(45deg);border-radius:0 0 0 4px}
.says-b p{margin:0 0 .2em}
.says-n{display:block;font-family:var(--head);font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--accent-deep);margin-bottom:2px}
.says.hook img.mascot{width:118px}
.says.hook .says-b{font-size:1.12rem;padding:18px 22px} .says.hook .says-b p.en{font-weight:600}



.kicker{font-size:.82rem;font-weight:800;color:var(--accent-deep);margin:0 0 6px;letter-spacing:.03em}
.l-intro{max-width:780px}
.l-intro h1{font-size:clamp(1.9rem,5cqw,2.9rem);line-height:1.05;margin:0 0 8px;letter-spacing:-.015em}
.l-intro .sup.big{font-size:1.1rem}
.goal{padding:4px 0 0 16px;border-left:4px solid var(--cyan)}
.goal small{display:block;color:var(--ink-2);font-weight:700;margin-bottom:2px}
.beat{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:30px;align-items:center}
.visual{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-l);padding:20px;min-height:240px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow)}
.visual::before{content:"";position:absolute;left:18px;right:18px;top:0;height:4px;border-radius:0 0 4px 4px;background:linear-gradient(90deg,var(--cyan),var(--violet),var(--orange));opacity:.85}
.visual>*{width:100%}
.btext h2{font-size:clamp(1.45rem,3.4cqw,2.05rem);line-height:1.12;margin:0 0 6px;letter-spacing:-.01em}
.btext .lead{font-size:1.12rem} .btext .sup.lead{font-size:.98rem}
.hearrow{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.pairbtn{display:inline-flex;gap:4px;align-items:center;padding:3px;border-radius:999px;background:var(--soft)}
.pairbtn .both{border:0;background:none;color:var(--accent-deep);font-weight:700;padding:6px 10px;cursor:pointer}
.l-watch{max-width:680px;padding:26px;border-radius:var(--r-l);background:var(--surface);border:1px solid var(--line);border-top:6px solid var(--voiceless)}
.wicon{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--voiceless);color:#fff;font-weight:900;font-size:1.3rem;margin-bottom:10px}
.l-end{display:grid;gap:18px;max-width:820px}
.tryit{padding:22px;border-radius:var(--r-l);background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow)}
.tryit h2{display:flex;align-items:center;gap:8px;margin:0 0 4px} .tryit h2 svg{width:24px;height:24px;color:var(--bad)}
.trysay{font-size:1.5rem;font-weight:700;margin:10px 0}
.tryrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.rec{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:8px 16px;border-radius:999px;border:1.5px solid var(--bad);background:var(--surface);color:var(--bad);font-weight:700;cursor:pointer}
.rec .dot{width:12px;height:12px;border-radius:50%;background:var(--bad)} .rec.on .dot{animation:blink 1s infinite}
@keyframes blink{50%{opacity:.2}}
.trycheck{margin-top:14px;padding:14px;border-radius:var(--r-m);background:var(--soft)}
.trycheck .q{font-weight:650}
.yn{display:flex;gap:8px;margin:8px 0}
.yn .sel{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.trymsg{margin:4px 0 0;font-weight:600}


.av{display:inline-grid;place-items:end center;width:34px;height:34px;border-radius:50%;background:var(--soft);overflow:hidden;flex:none;margin-right:2px}
.av img.mascot{width:34px;transform:translateY(3px)}
.steps h3,.listenfor h3,.note h3{align-items:center}
.ck-guide,.mist-guide{max-width:780px}
.ck-say{display:flex;align-items:flex-end;gap:10px}
.ck-say img.mini{width:54px;flex:none}
.ck-cheer{display:flex;gap:4px;justify-content:center;margin-bottom:6px} .ck-cheer img.mascot{width:86px}

.mouth{width:100%;max-width:300px;height:auto}
.m-face,.m-wall{fill:none;stroke:var(--ink-2);stroke-width:2;stroke-linecap:round}
.m-palate{fill:none;stroke:var(--ink);stroke-width:3.2;stroke-linecap:round}
.m-velum{fill:none;stroke:var(--ink);stroke-width:5.5;stroke-linecap:round}
.m-nasal{fill:none;stroke:var(--line);stroke-width:2;stroke-dasharray:4 4} .m-nasal.on{stroke:var(--air);stroke-dasharray:none}
.m-tooth{fill:var(--surface);stroke:var(--ink-2);stroke-width:1.5}
.m-lip{fill:var(--lip);stroke:var(--tongue-l);stroke-width:1.2}
.m-tongue{fill:var(--tongue);stroke:var(--tongue-l);stroke-width:1.4}
.m-contact{fill:none;stroke:var(--accent);stroke-width:3}
.m-flow{fill:none;stroke:var(--air);stroke-width:2.4;stroke-dasharray:6 7;animation:flow 1.1s linear infinite;opacity:.85}
@keyframes flow{to{stroke-dashoffset:-26}}
.m-burst{fill:none;stroke:var(--air);stroke-width:2.5}
.m-voice .vib{fill:none;stroke:var(--voiced);stroke-width:3;stroke-linecap:round} .m-voice .novib{stroke:var(--voiceless);stroke-width:3;stroke-dasharray:3 4}
.m-lbl text{font:11px var(--ui);fill:var(--ink-2)}
.v-mouth{display:grid;grid-template-columns:minmax(160px,300px) 1fr;gap:16px;align-items:center}
.v-side .v-sym{font-size:2.6rem;margin:0 0 6px;line-height:1}
.facts{margin:0 0 10px;padding-left:1.1em} .facts li{margin-bottom:4px} .facts .sup{display:block;font-size:.85rem;margin:0}
.kws{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.v-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.v-two figure,.v-lips figure{margin:0}
.v-two figcaption b{font-size:1.6rem}
.v-lips{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.lips{width:100%;max-width:260px;height:auto}
.l-lip{fill:var(--lip);stroke:var(--tongue-l);stroke-width:1.4}
.l-in{fill:#3B1622}
.l-teeth{fill:#fff}
.l-tng{fill:#C9656B}
.l-gauge .g-box{fill:var(--soft);stroke:var(--line);stroke-width:1.5} .l-gauge text{font:10px var(--ui);fill:var(--ink-2)}
.l-gauge .g-dot{fill:var(--accent)}
.l-cap{font-size:22px;fill:var(--ink)}
.vchart{width:100%;max-width:440px;height:auto}
.vtrap{fill:none;stroke:var(--line);stroke-width:1.6} .vax{font:11px var(--ui);fill:var(--ink-2)}
.vd circle{fill:var(--surface);stroke:var(--line);stroke-width:1.5} .vd text{font-size:14px;fill:var(--ink-2)}
.vd.on circle{fill:var(--accent);stroke:var(--accent)} .vd.on text{fill:var(--accent-ink);font-weight:700}
.vg{stroke:var(--accent);stroke-width:2.4;fill:none} .vgl{font-size:14px;fill:var(--accent)} .vgd{fill:var(--accent);opacity:.75}
.v-chart{display:grid;gap:8px} .v-keys{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px} .v-keys>.ipa{font-size:1.2rem}
.v-voicing{display:grid;gap:12px}
.vp{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.vc{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;border-radius:var(--r-m);background:var(--soft);text-align:center}
.vc>svg{width:110px;height:auto}
.vc .thr{fill:none;stroke:var(--ink-2);stroke-width:2.2}
.vc .vib{fill:none;stroke:var(--voiced);stroke-width:3.2;stroke-linecap:round}
.vc .air{stroke:var(--voiceless);stroke-width:3;stroke-dasharray:4 4}
.vc b{font-size:1.6rem} .vc small{color:var(--ink-2)}
.v-pairs{display:grid;gap:10px}
.pc{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:stretch}
.pc .pboth{grid-column:1/-1;justify-self:center;border:0;background:none;color:var(--accent);font-weight:700;cursor:pointer;padding:2px 10px}
.pw{display:flex;flex-direction:column;align-items:center;gap:2px;padding:14px 10px;border-radius:var(--r-m);border:1.5px solid var(--line);background:var(--surface);cursor:pointer}
.pw:hover{border-color:var(--accent)}
.pw svg{width:18px;height:18px;color:var(--accent)} .pw b{font-size:1.4rem} .pw .ipa{font-size:1.15rem;color:var(--ink-2)}
.pw mark{background:none;color:var(--accent);font-weight:700;border-bottom:3px solid var(--accent)}
.vs{align-self:center;color:var(--ink-2);font-weight:700}
.v-syl,.v-stress{display:grid;gap:10px}
.sw,.st{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 16px;border-radius:var(--r-m);border:1.5px solid var(--line);background:var(--surface);cursor:pointer;text-align:left;flex-wrap:wrap}
.sw b,.st b{font-size:1.3rem}
.blocks{display:flex;gap:4px} .blocks i{font-style:normal;padding:4px 10px;border-radius:8px;background:var(--soft);font-weight:700}
.sw small{font-size:1.5rem;font-weight:800;color:var(--accent)}
.dots{display:flex;align-items:center;gap:8px}
.dots i{display:block;border-radius:50%;background:var(--ink-2);opacity:.45;width:12px;height:12px;transition:transform .12s}
.dots i.P{width:30px;height:30px;background:var(--accent);opacity:1} .dots i.S{width:18px;height:18px;background:var(--accent);opacity:.6}
.dots i.hit{transform:scale(1.35)}
.st b .P{color:var(--accent)} .st .ipa{color:var(--ink-2)}
.v-end{display:grid;gap:10px}
.er{display:grid;grid-template-columns:70px 1fr;gap:4px 12px;align-items:center;padding:12px;border-radius:var(--r-m);background:var(--soft)}
.eipa{font-size:1.7rem;font-weight:700;color:var(--accent);grid-row:1/3}
.erule{font-weight:600} .erule .sup{display:block;font-weight:500;margin:0}
.ews{display:flex;flex-wrap:wrap;gap:6px}
.v-spell{display:grid;gap:10px}
.sr{display:grid;grid-template-columns:auto auto 1fr;gap:10px;align-items:center}
.sl{font-size:1.6rem;font-weight:800;padding:4px 14px;border-radius:12px;background:var(--ink);color:var(--paper)}
.sarr{color:var(--ink-2);font-size:1.3rem}
.sws{display:flex;flex-wrap:wrap;gap:6px}
.sws mark{background:none;color:var(--accent);font-weight:800}
.v-letters{display:grid;gap:8px}
.lg{display:grid;grid-template-columns:120px 1fr;gap:10px;align-items:center}
.lls{display:flex;flex-wrap:wrap;gap:6px}
.lt{width:42px;height:42px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface);font-weight:800;font-size:1.15rem;cursor:pointer}
.lt:hover{border-color:var(--accent)}
.v-link,.v-groups,.v-pitch{display:grid;gap:10px}
.lp,.gl,.pl{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:14px 16px;border-radius:var(--r-m);border:1.5px solid var(--line);background:var(--surface);cursor:pointer;text-align:left}
.lp svg,.gl>svg{width:18px;height:18px;color:var(--accent)}
.lp b{font-size:1.35rem;display:flex;align-items:center;gap:2px}
.lp .arc{display:inline-block;width:18px;height:10px;border:2.5px solid var(--accent);border-top:0;border-radius:0 0 12px 12px;margin:0 2px;transform:translateY(8px)}
.lp .ipa{font-size:1.15rem;color:var(--ink-2)} .lp mark.lk{background:none;color:var(--accent);font-weight:900}
.gl>span{font-size:1.15rem;display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.chunk{padding:4px 10px;border-radius:10px;background:var(--soft)}
.pause{color:var(--accent);font-weight:900}
.pl{width:100%} .pl svg{height:auto}
.pl .pc{fill:none;stroke:var(--accent);stroke-width:4;stroke-linecap:round;stroke-linejoin:round;opacity:.25}
.pl .nd{fill:var(--accent)}
.pl .pc.run{opacity:1;stroke-dasharray:900;stroke-dashoffset:0}
.pl .pc.run.go{animation:draw 1.6s ease-out}
@keyframes draw{from{stroke-dashoffset:900}to{stroke-dashoffset:0}}
.pl text{font:600 17px var(--ui);fill:var(--ink)} .pl text.nuc{fill:var(--accent);font-weight:800} .pl .arr{font-size:18px;fill:var(--accent)}
.v-accent{display:grid;gap:8px}
.ah,.ar{display:grid;grid-template-columns:1fr 1.3fr 1.3fr;gap:8px;align-items:center}
.ah b{color:var(--ink-2);font-size:.9rem} .ar>b{font-size:1.2rem}
.v-weak,.v-table{width:100%;border-collapse:collapse}
.v-weak th,.v-weak td,.v-table th,.v-table td{padding:10px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
.v-weak thead th,.v-table thead th{color:var(--ink-2);font-size:.85rem}
.v-weak tbody th{font-size:1.2rem} .v-weak td.ipa{font-size:1.15rem} .v-weak td.w{color:var(--accent);font-weight:700}
@container pron (max-width:820px){
  .beat{grid-template-columns:1fr;gap:16px}
  .visual{min-height:0;padding:14px}
  .lmain{align-items:flex-start}
  .v-mouth{grid-template-columns:1fr} .v-mouth .mouth{max-width:240px;margin:0 auto}
  .topic{flex-direction:column;align-items:stretch} .tact{justify-content:flex-start}
  .tact .btn{flex:1;min-width:0;padding:10px 12px}
  .tinfo{min-width:0} .tinfo h3,.tout{overflow-wrap:anywhere}
  .topic{min-width:0}
  .lprog i{width:12px}
  .gate{height:128px} .g-sky{bottom:146px}
  .gate-hint{display:none}
  .btext{order:-1} .btext h2{font-size:1.35rem} .btext .lead{font-size:1.02rem}
  .g-rtab{width:32px;height:32px} .g-top{gap:8px}
  .g-hint{font-size:.82rem;top:84px} .g-sky{top:132px}
  .lg{grid-template-columns:1fr}
}
@container pron (max-width:480px){ .v-two{grid-template-columns:1fr} .fb-gates{grid-template-columns:1fr} .ah,.ar{grid-template-columns:1fr 1fr} .ah span,.ar>b{grid-column:1/-1} }
@media (prefers-reduced-motion: reduce){ *{animation:none!important;transition:none!important} }


.terms,.plan{margin-top:22px}
.terms h2,.plan h2,.remember h2,.l-mist h2,.l-check h2{font-size:1.15rem;margin:0 0 10px}
.terms dl{display:grid;gap:10px;margin:0}
.term{display:grid;grid-template-columns:minmax(110px,auto) 1fr;gap:4px 14px;padding:12px 14px;border-radius:var(--r-m);background:var(--surface);border:1px solid var(--line)}
.term dt{font-weight:800;color:var(--accent)} .term dd{margin:0} .term dd p{margin:0 0 .2em}
.plan ol{margin:0;padding-left:1.4em;display:grid;gap:4px} .plan a{font-weight:650;text-decoration:none} .plan a:hover{text-decoration:underline}
.beat.wide{grid-template-columns:1fr}
.beat.wide .btext{order:0;max-width:820px} .beat.wide .brest{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:0 22px;max-width:none;align-items:start} .beat.wide .brest>*{margin-top:14px}
.beat.wide .visual{min-height:0}
.steps,.listenfor{margin-top:14px}
.steps h3,.listenfor h3,.note h3{font-size:.86rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-2);margin:0 0 6px;display:flex;align-items:center;gap:6px}
.steps ol{margin:0;padding:0;list-style:none;counter-reset:st;display:grid;gap:8px}
.steps li{counter-increment:st;position:relative;padding-left:38px;min-height:28px}
.steps li::before{content:counter(st);position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font-weight:800;display:grid;place-items:center;font-size:.9rem}
.steps li p{margin:0 0 .15em}
.listenfor{padding:10px 14px;border-radius:var(--r-m);background:var(--soft)} .listenfor h3 svg{width:16px;height:16px;color:var(--accent)} .listenfor p{margin:0 0 .15em}
.note{margin-top:14px;padding:12px 14px;border-radius:var(--r-m);border:1px solid var(--line);border-left:5px solid var(--accent);background:var(--surface)}
.note p{margin:0 0 .15em}
.note .ni{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font-size:.8rem;font-weight:800}
.note.n-exception{border-left-color:var(--voiceless)} .note.n-exception .ni{background:var(--voiceless);color:#fff}
.note.n-mistake{border-left-color:var(--bad)} .note.n-mistake .ni{background:var(--bad);color:#fff}
.note.n-tip{border-left-color:var(--good)} .note.n-tip .ni{background:var(--good);color:#fff}
.l-mist,.l-check{max-width:780px}
.mlist{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:12px}
.mcard{display:grid;grid-template-columns:1fr 1fr;border-radius:var(--r-m);overflow:hidden;border:1px solid var(--line);background:var(--surface)}
.mm,.mf{display:flex;gap:10px;padding:14px} .mf{background:var(--soft)}
.mm small,.mf small{display:block;font-weight:800;color:var(--ink-2);text-transform:uppercase;font-size:.75rem;letter-spacing:.05em}
.mi{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800}
.mi.bad{background:var(--bad)} .mi.good{background:var(--good)}
.mm p,.mf p{margin:0 0 .2em}
.ck-q{margin-top:12px;padding:20px;border-radius:var(--r-l);background:var(--surface);border:1px solid var(--line)}
.ck-n{font-weight:700;color:var(--ink-2);font-size:.9rem}
.say.big{min-height:52px;padding:10px 20px;font-size:1.05rem;margin:4px 0 8px}
.ck-show{font-size:1.5rem;font-weight:700;margin:6px 0}
.ck-opts{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}
.ck-o{display:inline-flex;align-items:center;gap:4px}
.btn.opt{white-space:normal;text-align:left;flex-direction:column;align-items:flex-start;gap:0;border-radius:var(--r-m);min-width:90px}
.btn.opt .sup{font-weight:500;font-size:.85em;margin:0}
.btn.opt.right{border-color:var(--good);background:color-mix(in srgb,var(--good) 14%,var(--surface))}
.btn.opt.wrong{border-color:var(--bad);opacity:.75;text-decoration:line-through}
.btn.opt:disabled{cursor:default}
.ck-fb .good b{color:var(--good)} .ck-fb .bad b{color:var(--bad)} .ck-fb .btn{margin-top:10px}
.iconb.say{border:1.5px solid var(--line);border-radius:50%;width:40px;height:40px;padding:0;justify-content:center}
.ck-end{margin-top:12px;padding:22px;border-radius:var(--r-l);background:var(--surface);border:1px solid var(--line)}
.ck-score{font-size:1.2rem} .ck-act{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
.remember{padding:20px 22px;border-radius:var(--r-l);background:var(--surface);border:1px solid var(--line);border-top:6px solid var(--good)}
.remember ul{margin:0;padding-left:1.2em;display:grid;gap:8px} .remember li p{margin:0 0 .1em}


.v-alpha{display:grid;gap:12px}
.a-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.a-bar .btn svg{width:18px;height:18px}
.btn.glowb{border-color:var(--accent);color:var(--accent)}
.a-tip{color:var(--ink-2);font-size:.92rem}
.a-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px}
.at{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border-radius:var(--r-s);border:1.5px solid var(--line);background:var(--surface);cursor:pointer;min-height:64px}
.at:hover{border-color:var(--accent)}
.at-l{font-size:1.45rem;font-weight:800;line-height:1.1} .at-l small{font-size:.8em;font-weight:500;margin-left:3px;color:var(--ink-2)}
.at-i{font-size:.9rem;color:var(--ink-2);white-space:nowrap} .at-i.long{font-size:.7rem}
.at.diff::after{content:"★";position:absolute;top:2px;right:5px;font-size:.7rem;color:var(--voiceless)}
.at.sel{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--surface));box-shadow:0 0 0 2px var(--accent) inset}
.at.ok{border-color:var(--good);background:color-mix(in srgb,var(--good) 22%,var(--surface))}
.at.bad{border-color:var(--bad);background:color-mix(in srgb,var(--bad) 18%,var(--surface));animation:shake .3s}
@keyframes shake{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
.a-detail{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center;padding:14px;border-radius:var(--r-m);background:var(--soft)}
.ad-big{display:flex;gap:10px;align-items:baseline;font-size:3.4rem;font-weight:800;line-height:1;padding:0 6px}
.ad-big b+b{font-weight:500;color:var(--ink-2)}
.ad-info{display:grid;gap:6px}
.ad-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0}
.ad-k{min-width:92px;font-size:.82rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-2)}
.ad-g{font-weight:650} .ad-s{font-weight:700}
.ad-note{margin:4px 0 0;padding:8px 10px;border-radius:var(--r-s);background:var(--surface);border-left:4px solid var(--voiceless);font-size:.95rem}
.ad-note .sup{display:block;margin-top:2px}
.ad-nw{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.say.sm{min-height:34px;padding:4px 10px;font-size:.92rem}
.a-quiz{padding:14px;border-radius:var(--r-m);background:var(--soft);border:2px solid var(--accent)}
.q-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-weight:700}
.q-top .q-x{margin-left:auto}
.q-msg{margin:8px 0 0} .q-msg .good{color:var(--good)}
.q-end{font-size:1.2rem} .q-act{display:flex;gap:8px}
.v-alpha.quizzing .a-detail{display:none}
.v-alpha.quizzing .at-i{visibility:hidden}


.v-anat{display:grid;grid-template-columns:minmax(220px,320px) 1fr;gap:18px;align-items:start}
.anat .a-pin{cursor:pointer} .anat .a-pin circle{fill:var(--accent);stroke:var(--surface);stroke-width:2}
.anat .a-pin text{fill:var(--accent-ink);font:700 10px var(--ui);pointer-events:none}
.anat .a-pin.hi circle{fill:var(--bad)}
.anat .m-vf{stroke:var(--ink-2);stroke-width:4;stroke-linecap:round}
.anat .hi:not(.a-pin){stroke:var(--bad)!important;stroke-width:5}
.anat .m-tongue.hi,.anat .m-lip.hi,.anat .m-tooth.hi{fill:color-mix(in srgb,var(--bad) 45%,var(--surface))}
.a-list{margin:0;padding-left:1.5em;display:grid;gap:6px}
.a-part{background:none;border:0;padding:4px 0;cursor:pointer;text-align:left;font-size:1rem}
.a-part[aria-expanded="true"] b{color:var(--bad)}
.a-desc{margin:2px 0 6px;padding:8px 10px;border-radius:var(--r-s);background:var(--soft)}
.a-desc .sup{display:block;margin-top:2px}
@container pron (max-width:720px){
  .term{grid-template-columns:1fr}
  .mcard{grid-template-columns:1fr}
  .a-detail{grid-template-columns:1fr}
  .ad-big{font-size:2.6rem}
  .a-grid{grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:6px}
  .at{min-height:56px;padding:6px 2px} .at-l{font-size:1.2rem} .at-i{font-size:.78rem}
  .v-anat{grid-template-columns:1fr}
  .ad-k{min-width:0;width:100%}
}
.v-table .sup{display:block;font-size:.85em;margin:0}
.v-pairs .pw b{overflow-wrap:anywhere}
@container pron (max-width:420px){ .v-pairs .pw b{font-size:.95rem} .v-pairs .pw .ipa{font-size:.85rem} }
.g-note.warn{background:#FBEAE3;color:#5a1d0a;border:1px solid var(--bad);padding:8px 12px;border-radius:var(--r-s)}
@container pron (max-width:480px){
  .v-weak,.v-table{font-size:.9rem} .v-weak th,.v-weak td,.v-table th,.v-table td{padding:8px 4px}
  .v-weak tbody th{font-size:1rem} .v-weak td.ipa{font-size:1rem}
  .v-weak td .say,.v-table td .say{white-space:normal;text-align:left}
  .v-link .lp b{flex-wrap:wrap;font-size:1.1rem} .v-link .lp b,.v-link .ipa{overflow-wrap:anywhere}
  .v-table td,.v-table th{overflow-wrap:anywhere}
}
.vc small .sup{display:block;margin:0}
@container pron (min-width:821px){ .beat:not(.wide){align-items:start} .beat:not(.wide) .visual{position:sticky;top:12px} }
@container pron (max-width:820px){ .beat{grid-template-columns:minmax(0,1fr)} .visual>*{min-width:0} }
@container pron (max-width:480px){
  .sr{grid-template-columns:minmax(0,auto) auto minmax(0,1fr)} .sl{max-width:30cqw;overflow-wrap:anywhere}
  .st b,.sw b{overflow-wrap:anywhere;min-width:0}
}
.pairbtn{flex-wrap:wrap;max-width:100%;border-radius:var(--r-m)}


.a-grid{gap:10px}
.at{--tc:var(--violet);--tx:#fff;border:0;border-radius:16px;background:linear-gradient(160deg,color-mix(in srgb,var(--tc) 78%,#fff) 0%,var(--tc) 55%,color-mix(in srgb,var(--tc) 80%,#000) 100%);color:var(--tx);box-shadow:0 6px 0 color-mix(in srgb,var(--tc) 65%,#000),0 10px 20px rgba(40,16,110,.18);transition:transform .12s,box-shadow .12s}
.at:nth-child(5n+2){--tc:#0AAFFF;--tx:#0B1A3A} .at:nth-child(5n+3){--tc:#00C83A;--tx:#062312} .at:nth-child(5n+4){--tc:#FF7D1D;--tx:#2A1200} .at:nth-child(5n+5){--tc:#FFC400;--tx:#2A2000}
.at:hover{transform:translateY(-3px)}
.at:active{transform:translateY(3px);box-shadow:0 2px 0 color-mix(in srgb,var(--tc) 65%,#000)}
.at .at-l small,.at .at-i{color:inherit;opacity:.85}
.at.sel{box-shadow:0 0 0 3px #fff,0 0 0 6px var(--tc),0 10px 24px color-mix(in srgb,var(--tc) 50%,transparent)}
.at.diff::after{color:#fff;text-shadow:0 0 4px rgba(0,0,0,.5)}
.at.ok{background:linear-gradient(160deg,#5BEA8A,#00B83A);color:#062312}
.at.bad{background:linear-gradient(160deg,#FFB08A,#E5532A);color:#2A0A00}
.ad-big{position:relative;padding:14px 22px;border-radius:24px 24px 24px 8px;background:linear-gradient(160deg,#9D6BFF,var(--violet));color:#fff;box-shadow:0 10px 26px rgba(135,75,248,.35)}
.ad-big b+b{color:#E8DDFF}
.av{width:40px;height:40px} .av img.mascot{width:40px}
.g-link{margin-left:14px}
.at{background:linear-gradient(160deg,color-mix(in srgb,var(--tc) 88%,#fff) 0%,var(--tc) 50%,color-mix(in srgb,var(--tc) 82%,#000) 100%)}
.ad-big{justify-self:start}
@container pron (max-width:560px){ .fb .says-b{font-size:.86rem;padding:10px 12px} .fb .says-b .sup{display:none} .fb .says img.mascot{width:48px} }



:host{
  --paper:#F7F5FF; --line:#E4DDF7; --soft:#F1ECFF; --ink-2:#554E6B;
  --glass:rgba(255,255,255,.78); --glass-2:rgba(255,255,255,.92);
  --sky:radial-gradient(900px 520px at 6% -8%,#D4EFFF 0,rgba(212,239,255,0) 62%),radial-gradient(820px 520px at 100% -4%,#EADFFF 0,rgba(234,223,255,0) 60%),radial-gradient(760px 520px at 50% 108%,#FFE9D6 0,rgba(255,233,214,0) 62%),#F7F5FF;
  --lift:0 14px 34px rgba(76,44,170,.13),0 2px 6px rgba(76,44,170,.06);
  --violet-ink:#5B25D6; --cyan-ink:#0A6E9E;
  color-scheme:light;
}
.pron{background:var(--sky);background-color:var(--paper);min-height:100vh}


.top{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px max(16px,calc((100cqw - 1120px)/2));background:var(--glass);backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);border-bottom:1px solid rgba(135,75,248,.12);color:var(--ink)}
.brand{display:flex;align-items:center;gap:12px;color:inherit;text-decoration:none;min-width:0}
.logo{height:26px;width:auto;flex:none}
.logo .lo-w{fill:var(--ink)} .logo .lo-to{fill:var(--violet)}
.brand-sep{width:1px;height:24px;background:currentColor;opacity:.2}
.brand-name{font-weight:700;font-size:1.02rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
main{max-width:1120px;margin:0 auto;padding:22px 16px 40px}
.foot{max-width:1120px;margin:0 auto;padding:14px 16px 28px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;color:var(--ink-2);font-size:.85rem}

.trbar-top{margin-left:auto}
.g-top .trbar-top{order:9}
.topic .sup.ttr{margin:2px 0 0;font-size:.92rem;font-weight:600}
.topic .sup.tout{margin-top:2px}
.xhead{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px 14px;margin:0 0 8px}
.xhead .kicker,.xhead .g-kicker{margin:0} .xhead.xh2 h2{margin:0}
.trbar{display:inline-flex;align-items:center;gap:2px;padding:3px;border-radius:999px;background:#fff;border:1px solid var(--line);box-shadow:0 2px 10px rgba(76,44,170,.07);flex:none;margin-left:auto}
.tr-cap{display:inline-flex;align-items:center;gap:6px;padding:0 8px 0 7px;color:var(--ink-2);font:600 .78rem/1 var(--ui);letter-spacing:.01em;white-space:nowrap}
.tr-cap svg{width:16px;height:16px;color:var(--violet)}
.trb{position:relative;display:inline-flex;align-items:center;gap:5px;min-height:34px;padding:6px 13px;border:0;border-radius:999px;background:transparent;color:var(--ink);font:600 .86rem/1 var(--ui);letter-spacing:0;cursor:pointer;transition:background .2s,color .2s,box-shadow .2s}
.trb:hover{background:var(--soft)}
.trb[aria-pressed="true"]{color:#fff;box-shadow:0 3px 10px rgba(76,44,170,.22)}
.trb[aria-pressed="true"]::before{content:"✓";font-size:.78em}
.trb[data-trbtn="kk"][aria-pressed="true"]{background:#086E9C}
.trb[data-trbtn="ru"][aria-pressed="true"]{background:#6A2FE0}
@container pron (max-width:420px){ .tr-lbl{display:none} .tr-cap{padding:0 4px 0 6px} .trb{padding:6px 11px} }


.tr{display:none!important}
.pron[data-tr="ru"] .xpl .tr-ru,.pron[data-tr="kk"] .xpl .tr-kk{display:block!important}
.pron[data-tr="ru"] .xpl .tr-cy,.pron[data-tr="kk"] .xpl .tr-cy{display:inline!important}
.tr-ru{--trc:#7C4DEB;--trbg:#F4EFFF;--trbg2:rgba(244,239,255,.35);--trink:#5A28C9}
.tr-kk{--trc:#0A9FE0;--trbg:#EAF7FF;--trbg2:rgba(234,247,255,.35);--trink:#0A6A97}
.sup.tr:not(.tr-cy){position:relative;margin:.45em 0 .85em;padding:.55em .95em .62em 1.05em;border-radius:3px 14px 14px 3px;background:linear-gradient(100deg,var(--trbg),var(--trbg2));box-shadow:inset 3px 0 0 var(--trc);color:#2E2745;font-family:var(--ui);font-size:var(--tr-size);font-weight:450;line-height:var(--tr-lh);text-align:left;white-space:normal;animation:trIn .26s ease}
.sup.tr:not(.tr-cy)::before{display:block;margin:0 0 .3em;font:700 var(--cap)/1.2 var(--ui);letter-spacing:.09em;text-transform:uppercase;color:var(--trink)}
.tr-ru::before{content:"Русский"} .tr-kk::before{content:"Қазақша"}
.tr-cy{color:var(--ink-2)}
@keyframes trIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}

.xpl :is(h1,h2)+.sup.tr:not(.tr-cy),.xpl :is(h1,h2)+.tr+.sup.tr:not(.tr-cy){margin:.15em 0 .7em;padding:0;background:none;box-shadow:none;color:var(--trink);font-size:1.06rem;font-weight:600;line-height:1.35}
.xpl :is(h1,h2)+.sup.tr:not(.tr-cy)::before,.xpl :is(h1,h2)+.tr+.sup.tr:not(.tr-cy)::before{display:inline-block;margin:0 .55em 0 0;padding:.28em .5em .24em;border-radius:6px;background:var(--trbg);vertical-align:.12em}

.btn .sup.tr,.say .sup.tr,.chip .sup.tr,.pv .sup.tr,.gate-pop .sup.tr,.term dd .sup.tr,.erule .sup.tr,.vc .sup.tr,.facts .sup.tr,.v-table .sup.tr,.a-part .sup.tr,.a-desc .sup.tr,.ad-note .sup.tr,.says-b .sup.tr{margin:.3em 0 .15em;padding:.24em .6em .28em .7em;font-size:.88em;line-height:1.45;border-radius:2px 9px 9px 2px}
.btn .sup.tr::before,.say .sup.tr::before,.chip .sup.tr::before,.pv .sup.tr::before,.gate-pop .sup.tr::before,.erule .sup.tr::before,.vc .sup.tr::before,.facts .sup.tr::before,.v-table .sup.tr::before,.a-part .sup.tr::before,.a-desc .sup.tr::before,.ad-note .sup.tr::before{display:none}
.says-b .sup.tr::before{margin-bottom:.15em;font-size:.6rem}
.pv .sup.tr{color:#1F1838;background:rgba(255,255,255,.82)}


.floaters{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1;transition:opacity .35s}
.floaters span{position:absolute;font-family:var(--ipa);font-weight:700;color:var(--violet);opacity:.32;text-shadow:0 0 14px #fff,0 0 2px #fff;animation:drift 14s ease-in-out infinite;will-change:transform;transition:opacity .35s,scale .35s,color .35s}
.floaters span:nth-child(4n+2){color:#0A9FE0} .floaters span:nth-child(4n+3){color:#F06A0A} .floaters span:nth-child(4n+4){color:#00A83A}
.pron[data-audio="on"] .floaters span{opacity:.62;scale:1.14}
@keyframes drift{0%,100%{transform:translate(0,0)}50%{transform:translate(var(--dx,10px),-22px)}}
.wave{width:100%;height:46px}
.wave path{fill:none;stroke-width:2.5;stroke-linecap:round}
.wave .w1{stroke:var(--cyan);opacity:.9;stroke-dasharray:14 10;animation:wv 6s linear infinite}
.wave .w2{stroke:var(--orange);opacity:.7;stroke-dasharray:6 12;animation:wv 9s linear infinite reverse}
@keyframes wv{to{stroke-dashoffset:-240}}


.btn.glow{background:linear-gradient(135deg,#5EDCFF,#0AAFFF);border:0;color:#08203A;box-shadow:0 8px 22px rgba(10,175,255,.38)}
.btn.glow:hover{background:linear-gradient(135deg,#7FE4FF,#20B8FF)}
.btn.primary{background:linear-gradient(135deg,#9563FF,var(--violet) 55%,#6A2FE0);border:0}
.btn.primary:hover{background:linear-gradient(135deg,#8452F5,#6A2FE0)}


.say{position:relative;display:inline-flex;align-items:center;gap:9px;min-height:42px;padding:5px 15px 5px 5px;border-radius:999px;border:1.5px solid var(--line);background:#fff;color:var(--ink);cursor:pointer;font-weight:650;box-shadow:0 3px 10px rgba(76,44,170,.07);transition:border-color .2s,box-shadow .25s,transform .15s}
.say svg,.pw svg,.chip svg,.pv-play svg,.q-play svg{flex:none;box-sizing:border-box;width:32px;height:32px;padding:7px;border-radius:50%;color:#fff;background:radial-gradient(circle at 34% 28%,#fff 0,#D9F6FF 16%,#3FD2FF 46%,#7A55F6 100%);box-shadow:inset 0 -3px 6px rgba(60,20,160,.25),0 2px 6px rgba(10,150,230,.35)}
.say:hover{border-color:#9FDFFF;box-shadow:0 0 0 4px rgba(10,199,255,.12),0 6px 16px rgba(76,44,170,.12);transform:translateY(-1px)}
.say .ipa{font-weight:400;color:var(--ink-2)}
.say.us svg{background:radial-gradient(circle at 34% 28%,#fff 0,#FFE3D6 16%,#FF8A4C 48%,#D0342C 100%)}
.say.slowp{padding-left:15px} .say.slowp::before{content:"🐢";font-size:1rem;margin-right:2px}
.say.sm{min-height:36px;padding:3px 12px 3px 3px;font-size:.92rem} .say.sm svg{width:28px;height:28px;padding:6px}
.say.big{min-height:62px;padding:7px 24px 7px 7px;font-size:1.08rem;margin:6px 0 10px} .say.big svg{width:48px;height:48px;padding:12px}
.iconb.say{width:44px;height:44px;padding:4px;border-radius:50%;justify-content:center} .iconb.say svg{width:34px;height:34px}

[data-say].playing,[data-pair].playing,.pv-play.playing,.gate-spk.playing,.q-play.playing,#mine.playing,#fb-both.playing{border-color:#3FC9FF!important;box-shadow:0 0 0 4px rgba(10,199,255,.2),0 10px 26px rgba(10,175,255,.28)!important}
.playing svg{animation:crystal .9s ease-in-out infinite}
.say.playing::after,.pw.playing::after,.pv-play.playing::after,.gate-spk.playing::after,.iconb.say.playing::after{content:"";position:absolute;inset:-3px;border-radius:inherit;border:2px solid rgba(10,190,255,.7);animation:sayRing 1.05s ease-out infinite;pointer-events:none}
@keyframes crystal{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.12);filter:brightness(1.25) drop-shadow(0 0 6px rgba(10,199,255,.9))}}
@keyframes sayRing{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.18,1.45)}}
.loading svg{animation:load .7s ease-in-out infinite alternate}
@keyframes load{from{opacity:.55;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
[data-say].err,[data-pair].err,.pv-play.err,.gate-spk.err,.q-play.err{border-color:var(--bad)!important;animation:shake .3s}
.err svg{background:radial-gradient(circle at 34% 28%,#fff,#E9E4F2 40%,#A39CB8)!important}

.pw{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 10px 12px;border-radius:20px 20px 20px 6px;border:1.5px solid var(--line);background:linear-gradient(170deg,#fff 0%,#F6F2FF 100%);cursor:pointer;box-shadow:0 6px 16px rgba(76,44,170,.08);transition:transform .15s,border-color .2s,box-shadow .25s}
.pw:hover{border-color:#9FDFFF;transform:translateY(-2px)}
.pw svg{width:36px;height:36px;padding:8px}
.pc .pboth,.pairbtn .both{border-radius:999px} .pboth.playing,.both.playing{color:var(--cyan-ink)!important;text-decoration:underline wavy}

.sw.playing,.st.playing,.lp.playing,.gl.playing,.pl.playing,.lt.playing{border-color:#3FC9FF!important;box-shadow:0 0 0 4px rgba(10,199,255,.18),0 10px 24px rgba(10,175,255,.22)!important}
.lt.playing{transform:translateY(-2px) scale(1.06)}
.btn.playing{box-shadow:0 0 0 4px rgba(10,199,255,.3),0 10px 24px rgba(10,175,255,.3)}


.says img.mascot{filter:drop-shadow(0 8px 12px rgba(76,44,170,.22))}
.says-b{background:#fff;border:1px solid #EEE8FB;box-shadow:var(--lift)}
.says-b::before{background:#fff;border-color:#EEE8FB}


.world{min-height:100vh;color:var(--ink)}
.world .foot{color:var(--ink-2)}
.w-hero{position:relative;overflow:hidden;min-height:clamp(440px,60vh,620px);display:flex;align-items:center;background:#DCEEFF var(--img) 70% center/cover no-repeat}
.w-hero::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(247,245,255,.95) 0%,rgba(247,245,255,.82) 30%,rgba(247,245,255,.2) 54%,rgba(247,245,255,0) 68%),linear-gradient(0deg,#F7F5FF 0%,rgba(247,245,255,0) 22%)}
.w-hero-in{position:relative;z-index:2;width:100%;max-width:1120px;margin:0 auto;padding:40px 16px 60px}
.w-hero-in>*{max-width:560px}
.w-kick{display:inline-flex;align-items:center;gap:8px;font-size:.82rem;font-weight:800;letter-spacing:.04em;padding:7px 14px;border-radius:999px;background:#fff;color:var(--violet-ink);border:1px solid var(--line);box-shadow:0 6px 18px rgba(76,44,170,.1);margin:0 0 16px}
.w-kick::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px rgba(0,230,65,.2)}
.w-hero h1{font-size:clamp(2.5rem,6.4cqw,4.4rem);line-height:.98;margin:0 0 14px;letter-spacing:-.025em;background:linear-gradient(100deg,#2B0F7A 0%,#5B25D6 46%,#0A6E9E 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.w-lead{font-size:1.12rem;color:#2D2643}
.w-stages{list-style:none;padding:0;margin:18px 0 24px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.w-stages li{display:flex;align-items:center;gap:10px;padding:8px 16px 8px 8px;border-radius:999px;background:rgba(255,255,255,.86);border:1px solid #fff;box-shadow:0 6px 18px rgba(76,44,170,.1)}
.w-stages li svg{width:20px;height:20px;color:var(--violet)}
.w-stages .sn{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--violet);color:#fff;font-weight:800;font-size:.9rem}
.w-stages .st2 .sn{background:#0AAFFF;color:#08203A} .w-stages .st2 svg{color:#0A9FE0}
.w-stages b{display:block;font-family:var(--head);line-height:1.1} .w-stages small{display:block;color:var(--ink-2);font-size:.78rem}
.w-cta{display:inline-flex;align-items:center;gap:14px;padding:10px 10px 10px 24px;border-radius:999px;background:linear-gradient(135deg,#9563FF,#6A2FE0);color:#fff;text-decoration:none;box-shadow:0 14px 34px rgba(106,47,224,.38);transition:transform .15s,box-shadow .2s}
.w-cta:hover{transform:translateY(-2px);box-shadow:0 18px 40px rgba(106,47,224,.45)}
.w-cta small{display:block;color:#ECE3FF;font-size:.78rem;font-weight:700} .w-cta b{display:block;font-family:var(--head);font-size:1.05rem}
.w-cta .go{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:#fff;color:var(--violet)} .w-cta .go svg{width:22px;height:22px}
.w-regions{position:relative;z-index:3;max-width:1120px;margin:-40px auto 0;padding:0 16px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.rg{position:relative;display:flex;flex-direction:column;justify-content:flex-end;min-height:132px;padding:10px 12px;border-radius:22px;overflow:hidden;color:var(--ink);text-decoration:none;background:#E6F2FF var(--img) center 40%/cover;border:3px solid #fff;box-shadow:0 12px 28px rgba(76,44,170,.16);transition:transform .2s,box-shadow .2s,border-color .2s}
.rg::before{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(255,255,255,.97) 0%,rgba(255,255,255,.82) 32%,rgba(255,255,255,0) 64%)}
.rg>*{position:relative}
.rg:hover{transform:translateY(-4px);box-shadow:0 18px 34px rgba(76,44,170,.22)}
.rg.on{border-color:var(--violet);box-shadow:0 0 0 4px rgba(135,75,248,.22),0 18px 34px rgba(106,47,224,.25)}
.rg-lv{align-self:flex-start;font-family:var(--head);font-weight:800;font-size:.8rem;padding:3px 9px;border-radius:999px;background:var(--violet);color:#fff;margin-bottom:auto;box-shadow:0 3px 8px rgba(76,44,170,.3)}
.rg.on .rg-lv{background:#0AAFFF;color:#08203A}
.rg-n{font-family:var(--head);font-weight:800;line-height:1.15;font-size:.98rem}
.rg-s{display:flex;align-items:center;gap:4px;font-size:.8rem;color:var(--ink-2);font-weight:600} .rg-s svg{width:14px;height:14px;color:#F5A300}
.w-main{padding-top:30px}
.rg-band{position:relative;overflow:hidden;border-radius:var(--r-l);min-height:230px;display:flex;flex-direction:column;justify-content:flex-end;background:#E6F2FF var(--img) center 55%/cover;border:3px solid #fff;box-shadow:var(--lift)}
.rg-band::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.96) 0%,rgba(255,255,255,.82) 38%,rgba(255,255,255,.1) 75%)}
.rg-band-in{position:relative;padding:26px 28px 6px;max-width:620px}
.rg-kick{font-size:.82rem;font-weight:800;color:var(--violet-ink);margin:0 0 4px;letter-spacing:.03em}
.rg-band h2{font-size:clamp(1.7rem,4cqw,2.5rem);line-height:1.05;margin:0 0 8px;color:var(--ink)}
.rg-line{color:#2D2643}
.lvmeta{display:flex;align-items:center;gap:6px;color:var(--ink-2);font-size:.9rem;font-weight:600;margin:6px 0 0} .lvmeta svg{width:15px;height:15px;color:#F5A300}
.rg-wave{position:relative;opacity:.9}
.home-guide{max-width:760px;margin:22px 0 6px}
.topics{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.t-path{position:relative;margin-top:16px;padding-left:64px}
.t-path::before{content:"";position:absolute;left:27px;top:20px;bottom:20px;width:4px;border-radius:4px;background:linear-gradient(180deg,var(--cyan),var(--violet) 50%,var(--orange));opacity:.6}
.topic{position:relative;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 18px;background:#fff;color:var(--ink);border:1px solid #EEE8FB;border-radius:var(--r-m);box-shadow:0 8px 22px rgba(76,44,170,.09);transition:transform .2s,box-shadow .2s}
.topic:hover{transform:translateX(3px);box-shadow:0 14px 30px rgba(76,44,170,.15)}
.topic.next-up{box-shadow:0 0 0 3px #3FC9FF,0 14px 30px rgba(10,175,255,.22)}
.stop{position:absolute;left:-64px;top:50%;width:56px;height:56px;transform:translateY(-50%);display:grid;place-items:center}
.stop .bubble{position:absolute;inset:0;width:56px;height:56px;fill:var(--violet);filter:drop-shadow(0 4px 8px rgba(106,47,224,.35))}
.stop b{position:relative;font-family:var(--head);font-size:1.15rem;color:#fff;margin-top:-4px}
.topic.done .stop .bubble{fill:#00C83A} .topic.done .stop b{color:#062312}
.topic.next-up .stop .bubble{fill:#0AAFFF} .topic.next-up .stop b{color:#08203A}
.tinfo{display:flex;gap:14px;align-items:flex-start;min-width:0}
.tid{font-family:var(--head);font-weight:800;color:var(--violet-ink);font-variant-numeric:tabular-nums;min-width:38px;padding-top:2px}
.tinfo h3{font-size:1.08rem;margin:0 0 2px}
.tout{color:var(--ink-2);font-size:.9rem;margin:0}
.tact{display:flex;gap:8px;flex:none}
.btn.learn{background:var(--soft);border-color:transparent;color:var(--ink)} .btn.learn svg{color:var(--violet-ink)}
.btn.learn .ok{font-style:normal;font-weight:900;color:#0B7A3E}
.btn.playb{background:linear-gradient(135deg,#9563FF,#6A2FE0);color:#fff;border:0;box-shadow:0 6px 16px rgba(106,47,224,.3)}
.btn.playb svg{color:#CFF4FF}
.stars{display:inline-flex;gap:1px;margin-left:2px}
.stars i{width:14px;height:14px;color:rgba(255,255,255,.35)} .stars i svg{width:14px;height:14px}
.stars i.on{color:var(--yellow)}


.learnv{min-height:100vh;display:flex;flex-direction:column}
.lbar{position:relative;display:flex;align-items:center;gap:14px;padding:14px max(16px,calc((100cqw - 1120px)/2));color:var(--ink);background:#E6F2FF var(--img) center 55%/cover;overflow:hidden;border-bottom:1px solid rgba(135,75,248,.12)}
.lbar::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.95),rgba(255,255,255,.84) 55%,rgba(255,255,255,.45))}
.lbar>*{position:relative}
.iconb{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;color:var(--ink);background:#fff;border:1px solid var(--line);flex:none;box-shadow:0 4px 12px rgba(76,44,170,.1)}
.iconb svg{width:20px;height:20px}
.ltitle{flex:1;min-width:0;display:flex;flex-direction:column}
.ltitle small{font-size:.78rem;color:var(--violet-ink);font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ltitle b{font-family:var(--head);font-size:1.12rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lprog{display:flex;gap:6px;align-items:center}
.lprog i{width:10px;height:10px;border-radius:50%;background:rgba(26,16,51,.14);transition:all .3s}
.lprog i.on{background:var(--violet)} .lprog i.now{width:26px;border-radius:6px;background:linear-gradient(90deg,var(--violet),#0AAFFF);box-shadow:0 0 10px rgba(135,75,248,.5)}
.lmain{flex:1;width:100%;display:flex;flex-direction:column;justify-content:flex-start;gap:16px;padding-top:28px}
.lmain>*{width:100%}
.lnav{position:sticky;bottom:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px max(16px,calc((100cqw - 1120px)/2));background:var(--glass);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid rgba(135,75,248,.12)}
.lnav-end{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
.visual,.tryit,.remember,.ck-q,.ck-end,.l-watch,.mcard,.term,.note{box-shadow:var(--lift);border-color:#EEE8FB}
.visual{background:#fff}
.l-intro h1{background:linear-gradient(100deg,#2B0F7A,#5B25D6 60%,#0A6E9E);-webkit-background-clip:text;background-clip:text;color:transparent}
.l-introgrid{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:30px;align-items:start}
.l-introgrid .l-intro{max-width:none}
.plan{position:sticky;top:78px;margin-top:0;border-radius:var(--r-l);overflow:hidden;background:#fff;border:1px solid #EEE8FB;box-shadow:var(--lift)}
.plan-top{height:120px;background:#E6F2FF var(--img) center 50%/cover;position:relative;display:flex;align-items:flex-end;padding:10px 14px}
.plan-k{position:relative;color:var(--ink);background:rgba(255,255,255,.92);padding:5px 12px;border-radius:999px;font-family:var(--head);font-weight:800;font-size:.86rem;box-shadow:0 4px 12px rgba(76,44,170,.15)}
.plan-in{padding:16px 18px 18px}
.plan ol{margin:0;padding-left:1.4em;display:grid;gap:6px}
.plan .plan-game{list-style:none;margin:8px 0 0 -1.4em}
.plan .plan-game a{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;background:linear-gradient(135deg,#9563FF,#6A2FE0);color:#fff;font-family:var(--head);text-decoration:none;box-shadow:0 6px 16px rgba(106,47,224,.3)}
.plan .plan-game svg{width:18px;height:18px;color:#CFF4FF}
@container pron (max-width:900px){ .l-introgrid{grid-template-columns:1fr} .plan{position:static} }


.toplay{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:28px 30px;border-radius:var(--r-l);color:var(--ink);background:#E6F2FF var(--img) center/cover;min-height:220px;border:3px solid #fff;box-shadow:0 20px 44px rgba(76,44,170,.2)}
.toplay::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.96),rgba(255,255,255,.84) 50%,rgba(255,255,255,.15))}
.toplay>.tp-in,.toplay>.tp-m{position:relative;z-index:2}
.tp-in{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.tp-k{display:flex;align-items:center;gap:8px;font-size:.82rem;font-weight:800;color:var(--violet-ink);margin:0;letter-spacing:.03em}
.tp-done{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#00C83A;color:#fff;font-size:.8rem}
.toplay .tp-l{margin:0;font-size:1.25rem;font-weight:700;font-family:var(--head)}
.tp-m{display:flex;align-items:flex-end;gap:4px}
.toplay .tp-float{left:52%}
.tp-m img.mascot{width:104px;filter:drop-shadow(0 10px 16px rgba(76,44,170,.3))}
.tp-m img.mascot:first-child{animation:hop 2.4s ease-in-out infinite}
@keyframes hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.practise{position:relative;isolation:isolate;display:inline-flex;align-items:center;gap:14px;margin-top:12px;padding:9px 10px 9px 9px;border-radius:999px;background:linear-gradient(135deg,#9D6BFF 0%,#7A3CF2 45%,#5B25D6 100%);color:#fff;text-decoration:none;box-shadow:0 14px 34px rgba(106,47,224,.42),inset 0 1px 0 rgba(255,255,255,.35);overflow:hidden;transition:transform .18s,box-shadow .2s}
.practise::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.35) 45%,transparent 60%);transform:translateX(-120%);animation:shine 3.6s ease-in-out infinite}
@keyframes shine{0%,55%{transform:translateX(-120%)}85%,100%{transform:translateX(120%)}}
.practise:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 20px 44px rgba(106,47,224,.5)}
.practise:focus-visible{outline:3px solid #0AAFFF;outline-offset:3px}
.pr-orb{position:relative;display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 34% 28%,#fff 0,#E2F8FF 30%,#8FE3FF 100%);color:var(--violet);box-shadow:0 0 0 0 rgba(143,227,255,.7);animation:orbCall 2.2s ease-out infinite}
.pr-orb svg{width:26px;height:26px}
@keyframes orbCall{0%{box-shadow:0 0 0 0 rgba(143,227,255,.75)}70%,100%{box-shadow:0 0 0 14px rgba(143,227,255,0)}}
.pr-t b{display:block;font-family:var(--head);font-size:1.3rem;line-height:1.1}
.pr-t small{display:block;font-size:.8rem;color:#EEE6FF;font-weight:600}
.pr-go{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.2);transition:transform .2s} .pr-go svg{width:20px;height:20px}
.practise:hover .pr-go{transform:translateX(4px)}
.practise.sm{margin-top:14px} .practise.sm .pr-orb{width:44px;height:44px} .practise.sm .pr-t b{font-size:1.12rem}


.game{position:relative;height:var(--pron-game-h,100dvh);overflow:hidden;color:var(--ink);font-family:var(--ui);touch-action:none;user-select:none;-webkit-user-select:none;background:#DCEEFF}
.g-bg{position:absolute;inset:0;background:#DCEEFF var(--img) center 60%/cover no-repeat}
.g-bg::before{content:"";position:absolute;inset:0;background:
  linear-gradient(180deg,rgba(255,255,255,.7) 0%,rgba(255,255,255,.25) 20%,rgba(255,255,255,0) 40%,rgba(255,255,255,.05) 68%,rgba(247,245,255,.6) 100%),
  radial-gradient(60% 40% at 50% 22%,rgba(10,199,255,calc(var(--p,0) * .25)),transparent 70%),
  radial-gradient(50% 35% at 22% 18%,rgba(0,230,65,calc(var(--p,0) * .16)),transparent 70%),
  radial-gradient(50% 35% at 80% 18%,rgba(255,125,29,calc(var(--p,0) * .14)),transparent 70%);transition:background .8s}
.g-float span{opacity:.42;font-size:1.6em}
.pron[data-audio="on"] .g-float span{opacity:.75}
.g-top{position:absolute;top:0;left:0;right:0;z-index:14;display:flex;align-items:center;gap:12px;padding:10px max(14px,calc((100cqw - 1120px)/2));background:var(--glass);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(135,75,248,.12)}
.g-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:#fff;color:var(--ink);border:1px solid var(--line);cursor:pointer;flex:none;box-shadow:0 4px 12px rgba(76,44,170,.12)}
.g-icon svg{width:20px;height:20px}
.g-title{display:flex;flex-direction:column;min-width:0;flex:1}
.g-topic{font-size:.8rem;font-weight:700;color:var(--violet-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .g-round{font-family:var(--head);font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g-rounds{display:flex;gap:6px}
.g-rtab{width:36px;height:36px;border-radius:50%;border:1.5px solid #D6CBF5;background:#fff;color:var(--ink);font-weight:800;cursor:pointer;display:grid;place-items:center}
.g-rtab.on{background:var(--violet);border-color:var(--violet);color:#fff;box-shadow:0 4px 12px rgba(106,47,224,.35)} .g-rtab:disabled{opacity:.45;cursor:not-allowed}
.g-rtab.star{color:#8A5B00;border-color:#F5B800} .g-rtab.star.on{background:var(--yellow);color:#3A2A00} .g-rtab svg{width:18px;height:18px}
.g-intro,.g-modal{position:absolute;inset:0;z-index:8;display:grid;place-items:center;padding:76px 16px 16px;overflow-y:auto}
.g-modal{background:rgba(70,40,160,.18);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);z-index:12}
.g-modal.low{place-items:end center;padding-bottom:max(16px,env(safe-area-inset-bottom))}
.g-intro,.g-modal:not(.low){display:flex;flex-direction:column;align-items:center}
.g-intro>.g-card,.g-modal:not(.low)>.g-card{margin:auto 0}
.g-card{width:min(660px,100%);padding:26px;border-radius:var(--r-l);background:rgba(255,255,255,.96);color:var(--ink);border:1px solid #fff;box-shadow:0 26px 60px rgba(60,30,140,.24)}
.g-card h1{font-size:clamp(1.7rem,5cqw,2.4rem);margin:0 0 4px;letter-spacing:-.01em} .g-card h2{margin:0 0 10px}
.g-kicker{font-size:.82rem;font-weight:800;color:var(--cyan-ink);margin:0 0 6px;letter-spacing:.03em} .g-kicker.bad{color:#B4380A}
.g-task{font-size:1.1rem;margin-top:10px}
.g-note{font-size:.9rem;background:#FFF6D1;border-left:3px solid #F5B800;padding:8px 10px;border-radius:6px;color:#4A3800}
.g-card .says{margin:0 0 14px}
.g-card .says img.mascot{width:76px}
.g-card .says-b{background:#F6F2FF;border-color:transparent;box-shadow:none;font-size:.95rem}
.g-card .says-b::before{background:#F6F2FF;border-color:transparent}
.g-preview{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:18px 0}
.pv{position:relative;display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:20px 20px 20px 6px;background:linear-gradient(170deg,color-mix(in srgb,var(--gc) 70%,#fff),var(--gc));color:#120A2E;box-shadow:0 8px 18px color-mix(in srgb,var(--gc) 35%,transparent)}
.pv b{font-family:var(--head);font-size:1.15rem} .pv small{color:rgba(18,10,46,.85)}
.pv-play{position:relative;display:inline-flex;align-items:center;gap:7px;align-self:flex-start;margin-top:4px;padding:3px 12px 3px 3px;border-radius:999px;border:1.5px solid rgba(255,255,255,.9);background:#fff;color:var(--ink);font-weight:700;cursor:pointer}
.pv-play svg{width:28px;height:28px;padding:6px}
.g-link{display:inline-block;margin-top:14px;margin-left:14px;color:var(--violet-ink);font-weight:600}
.g-hud{position:absolute;top:70px;left:0;right:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 max(14px,calc((100cqw - 1120px)/2))}
.g-dots{display:flex;flex-wrap:wrap;gap:6px;flex:1}
.g-dots i{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,.85);box-shadow:inset 0 0 0 1.5px rgba(106,47,224,.3);transition:background .3s,box-shadow .3s}
.g-dots i.on{background:var(--violet);box-shadow:0 0 0 2px #fff,0 0 10px rgba(135,75,248,.7)}
.g-streak{font-family:var(--head);font-weight:800;color:#fff;background:linear-gradient(135deg,#FF9A3D,#F06A0A);padding:3px 10px;border-radius:999px;opacity:0;transition:opacity .3s;min-width:44px;text-align:center;box-shadow:0 4px 12px rgba(240,106,10,.35)} .g-streak.on{opacity:1}
.g-hint{position:absolute;top:100px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100% - 32px);z-index:4;text-align:center;font-size:.95rem;font-weight:600;color:var(--ink);padding:6px 16px;margin:0;border-radius:999px;background:rgba(255,255,255,.82);box-shadow:0 6px 16px rgba(76,44,170,.12);pointer-events:none}
.g-sky{position:absolute;left:0;right:0;top:140px;bottom:176px;z-index:3}
.g-fx{position:absolute;inset:0;z-index:6;pointer-events:none}
.echo{position:absolute;z-index:2;left:0;top:0;width:82px;height:82px;border:0;padding:0;border-radius:50%;background:none;cursor:grab;transition:filter .2s;will-change:transform}
.echo-core{position:absolute;inset:14px;border-radius:50%;background:radial-gradient(circle at 34% 28%,#fff 0,#D9F6FF 18%,#3FD2FF 48%,#7A55F6 100%);box-shadow:0 0 0 3px #fff,0 10px 24px rgba(60,30,140,.3),0 0 30px 8px rgba(10,199,255,.4);transition:transform .2s}
.echo-ring{position:absolute;inset:6px;border-radius:50%;border:2.5px solid rgba(10,170,255,.85);opacity:0}
.echo.wait .echo-core{animation:load .7s ease-in-out infinite alternate}
.echo.talk .echo-core{animation:crystal .7s ease-in-out infinite}
.echo.talk .echo-ring{animation:ring 1s ease-out infinite} .echo.talk .echo-ring.r2{animation-delay:.5s}
@keyframes ring{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.8);opacity:0}}
.echo.sel .echo-core{box-shadow:0 0 0 4px #fff,0 0 0 7px var(--violet),0 0 30px 10px rgba(10,199,255,.55)}
.echo.card{width:auto;height:auto;max-width:min(78cqw,520px);border-radius:20px 20px 20px 6px;padding:12px 18px;background:#fff;border:2.5px solid #3FC9FF;color:var(--ink);box-shadow:0 12px 28px rgba(60,30,140,.22)}
.echo.card .echo-text{font-size:1.15rem;font-weight:700;white-space:normal;display:block}
.echo.card .echo-ring{border-radius:20px 20px 20px 6px;inset:-2px}
.echo.card.sel{border-color:var(--violet);box-shadow:0 0 0 3px rgba(135,75,248,.3),0 14px 30px rgba(60,30,140,.25)}
.echo.drag{cursor:grabbing;filter:brightness(1.08)}
.echo.fly{transition:transform .4s cubic-bezier(.5,0,.75,0),opacity .4s;opacity:0}
.echo.fade{transition:opacity .5s,transform .5s;opacity:0}
.g-wave{position:absolute;z-index:1;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;border:2px solid rgba(10,170,255,.75);pointer-events:none;animation:waveOut .9s ease-out forwards}
@keyframes waveOut{0%{transform:scale(.55);opacity:.85}100%{transform:scale(2.5);opacity:0}}
.g-gates{position:absolute;left:0;right:0;bottom:0;z-index:4;display:grid;grid-template-columns:repeat(var(--n),minmax(0,250px));justify-content:center;gap:14px;padding:0 max(12px,calc((100cqw - 1120px)/2)) max(18px,env(safe-area-inset-bottom))}
.gate{position:relative;height:142px}
.gate-hit{position:absolute;inset:0 0 12px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;padding:0 8px 16px;border:0;background:none;color:#120A2E;cursor:pointer;text-align:center}
.gate-arch{position:absolute;inset:0;border-radius:30px 30px 30px 10px;background:linear-gradient(180deg,color-mix(in srgb,var(--gc) 62%,#fff),var(--gc));box-shadow:0 0 0 3px #fff,0 14px 30px color-mix(in srgb,var(--gc) 45%,transparent),inset 0 -10px 20px rgba(20,11,58,.1);transition:transform .15s,box-shadow .2s}
.gate-arch::after{content:"";position:absolute;left:10px;bottom:-11px;width:26px;height:16px;background:var(--gc);clip-path:polygon(0 0,100% 0,0 100%)}
.gate:hover .gate-arch,.gate.hover .gate-arch{transform:translateY(-5px);box-shadow:0 0 0 3px #fff,0 0 0 7px color-mix(in srgb,var(--gc) 45%,transparent),0 18px 40px color-mix(in srgb,var(--gc) 55%,transparent)}
.gate-ripple{position:absolute;inset:0;border-radius:30px 30px 30px 10px;border:3px solid var(--gc);opacity:0;pointer-events:none}
.gate.good .gate-ripple{animation:ripple .8s ease-out}
.gate.sounding .gate-ripple{animation:ripple 1s ease-out infinite}
.gate.sounding .gate-arch{box-shadow:0 0 0 3px #fff,0 0 0 8px color-mix(in srgb,var(--gc) 40%,transparent),0 18px 40px color-mix(in srgb,var(--gc) 55%,transparent)}
@keyframes ripple{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.3)}}
.gate-key{position:absolute;top:12px;left:14px;font-size:.75rem;font-weight:800;color:rgba(18,10,46,.6)}
.gate-label{position:relative;font-family:var(--head);font-size:clamp(1rem,3.4cqw,1.45rem);font-weight:800;line-height:1.1}
.gate-hint{position:relative;font-size:.78rem;color:rgba(18,10,46,.8);line-height:1.2}
.gate-spk{position:absolute;top:8px;right:8px;display:grid;place-items:center;width:42px;height:42px;border-radius:50%;border:0;padding:0;background:#fff;cursor:pointer;z-index:2;box-shadow:0 4px 12px rgba(18,10,46,.2)}
.gate-spk svg{width:34px;height:34px;padding:8px;border-radius:50%;color:#fff;background:radial-gradient(circle at 34% 28%,#fff 0,#D9F6FF 16%,#3FD2FF 46%,#7A55F6 100%)}
.gate.good .gate-arch{animation:gpulse .6s}
@keyframes gpulse{40%{transform:scale(1.06);box-shadow:0 0 0 4px #fff,0 0 60px var(--gc)}}
.gate.bad .gate-arch{animation:gshake .45s}
@keyframes gshake{20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.gate-pop{position:absolute;left:50%;bottom:156px;transform:translateX(-50%);white-space:nowrap;padding:6px 12px;border-radius:16px 16px 16px 4px;background:#fff;color:var(--ink);font-weight:800;animation:pop 1.5s forwards;pointer-events:none;z-index:3;box-shadow:0 8px 20px rgba(60,30,140,.2)}
.gate-pop .ipa{font-weight:400;color:var(--ink-2)}
@keyframes pop{0%{opacity:0;transform:translate(-50%,10px)}15%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-14px)}}

.g-glyph{position:absolute;left:50%;top:24px;z-index:3;font:800 1.6rem/1 var(--ipa);color:color-mix(in srgb,var(--gc) 55%,#1A1033);text-shadow:0 0 10px #fff,0 0 3px #fff;pointer-events:none;opacity:0;animation:glyphUp 1.3s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes glyphUp{0%{opacity:0;transform:translate(-50%,0) scale(.6)}20%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--gx,0px)),-130px) scale(1.2)}}
.g-toast{position:absolute;left:50%;top:136px;transform:translateX(-50%);z-index:7;padding:8px 14px;border-radius:999px;background:var(--yellow);color:#2A2000;font-weight:700;opacity:0;transition:opacity .2s;pointer-events:none;box-shadow:0 6px 16px rgba(245,184,0,.35)}
.g-toast.show{opacity:1}

.g-mate{position:absolute;left:max(10px,calc((100cqw - 1120px)/2 - 20px));bottom:176px;z-index:5;display:flex;align-items:flex-end;gap:8px;pointer-events:none;opacity:0;transform:translateY(24px) scale(.9);transition:opacity .3s,transform .35s cubic-bezier(.3,1.4,.6,1)}
.g-mate.show{opacity:1;transform:none}
.g-mate img.mascot{position:relative;z-index:1;width:104px;filter:drop-shadow(0 10px 16px rgba(60,30,140,.3))}
.g-mate-ring{position:absolute;left:8px;bottom:6px;width:88px;height:88px;border-radius:50%;border:3px solid rgba(10,190,255,.0);pointer-events:none}
.pron[data-audio="on"] .g-mate.companion .g-mate-ring{animation:listenRing 1.1s ease-out infinite}
@keyframes listenRing{0%{border-color:rgba(10,190,255,.7);transform:scale(.8)}100%{border-color:rgba(10,190,255,0);transform:scale(1.5)}}
.pron[data-audio="on"] .g-mate.companion:not(.talking) img.mascot{animation:lean 1.1s ease-in-out infinite}
@keyframes lean{0%,100%{transform:rotate(0)}50%{transform:rotate(-4deg) translateY(-2px)}}
.g-mate.hop img.mascot{animation:hop .55s ease-out}
.g-mate-b{max-width:230px;padding:9px 13px;border-radius:16px 16px 16px 4px;background:#fff;color:var(--ink);font-weight:700;font-size:.92rem;margin-bottom:62px;box-shadow:0 10px 24px rgba(60,30,140,.2)}
.g-mate-b:empty{display:none}
@media (min-height:640px){@container pron (min-width:1000px){ .g-mate.companion{opacity:1;transform:none} }}
.fb .fb-word{font-size:1.7rem;margin:0 0 10px} .fb .fb-word .ipa{color:var(--ink-2);font-size:1.2rem}
.fb-show{font-size:1.25rem;font-weight:700}
.fb-gates{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0 12px}
.fb-g{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:12px;border-radius:18px 18px 18px 6px;border:2px solid var(--gc);background:color-mix(in srgb,var(--gc) 14%,#fff)}
.fb-g small{color:var(--ink-2);font-weight:700} .fb-g b{font-family:var(--head);font-size:1.2rem}
.fb-g.no{border-style:dashed}
.g-card .btn.ghost,.btn.ghost.sm{color:var(--ink);border-color:var(--line);background:#fff}
.fb-g .btn.ghost.sm{padding:3px 12px 3px 3px} .fb-g .btn svg{width:28px;height:28px;padding:6px;border-radius:50%;color:#fff;background:radial-gradient(circle at 34% 28%,#fff 0,#D9F6FF 16%,#3FD2FF 46%,#7A55F6 100%)}
.fb-why{padding:10px 12px;border-radius:12px;background:#F6F2FF;margin-bottom:12px}
.fb-act{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:10px}
.fb .says img.mascot{width:62px}
.tut-steps{list-style:none;padding:0;margin:0 0 10px;display:grid;gap:12px}
.tut-steps li{display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:center}
.tut-steps p{margin:0}
.tut-orb{width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 34% 28%,#fff,#D9F6FF 18%,#3FD2FF 48%,#7A55F6);box-shadow:0 0 0 3px #fff,0 4px 12px rgba(10,150,230,.4)}
.tut-gate{width:42px;height:34px;border-radius:14px 14px 14px 4px;background:var(--cyan)}
.tut-back,.tut-spk{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--soft);color:var(--violet-ink);font-size:1.3rem} .tut-spk svg{width:20px;height:20px}
.tut-keys{font-size:.85rem;color:var(--ink-2)}
.result{text-align:center}
.res-cast{display:flex;align-items:flex-end;justify-content:center;gap:2px;margin:6px 0}
.res-cast img.mascot{width:80px;filter:drop-shadow(0 8px 14px rgba(60,30,140,.28))}
.res-cast.win img.mascot{animation:hop 1.6s ease-in-out infinite} .res-cast.win img.mascot:nth-child(2){animation-delay:.2s} .res-cast.win img.mascot:nth-child(4){animation-delay:.4s} .res-cast.win img.mascot:nth-child(5){animation-delay:.6s}
.res-star{width:92px;height:92px;margin:0 4px 10px;color:#E4DEF3} .res-star svg{width:92px;height:92px}
.res-star.on{color:var(--yellow);filter:drop-shadow(0 6px 14px rgba(245,170,0,.55));animation:starin .7s}
@keyframes starin{0%{transform:scale(.3) rotate(-30deg)}70%{transform:scale(1.15)}100%{transform:none}}
.res-num b{font-size:2.2rem} .res-note{color:var(--ink-2)}
.result h3{margin:16px 0 8px;font-size:1rem}
.res-mix{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.chip{position:relative;display:inline-flex;align-items:center;gap:7px;padding:3px 12px 3px 3px;border-radius:999px;border:1.5px solid var(--line);background:#fff;color:var(--ink);cursor:pointer;font-weight:650}
.chip svg{width:28px;height:28px;padding:6px} .chip small{color:var(--ink-2)}
.result .fb-act{justify-content:center}


.portal-fx{position:fixed;inset:0;z-index:100;display:grid;place-items:center;pointer-events:none;background:rgba(255,255,255,0);transition:background .45s}
.portal-fx .pfx{width:80px;height:80px;fill:#fff;stroke:var(--pc);stroke-width:7;filter:drop-shadow(0 0 24px var(--pc));transform:scale(.2);opacity:0;transition:transform .42s cubic-bezier(.6,0,.4,1),opacity .2s}
.portal-fx.go{background:rgba(247,245,255,.75)}
.portal-fx.go .pfx{transform:scale(30);opacity:1}
.portal-fx.out{opacity:0;transition:opacity .5s}


@container pron (max-width:980px){ .w-regions{grid-template-columns:repeat(6,minmax(150px,1fr));overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px} .rg{scroll-snap-align:start} }
.l1{font-weight:650;color:#3E2A8C}
@container pron (max-width:820px){
  .w-hero .floaters{bottom:auto;height:240px}
  .w-hero{min-height:0;background-size:auto 330px;background-position:80% top;background-color:#F7F5FF}
  .w-hero::before{background:linear-gradient(180deg,rgba(247,245,255,0) 0px,rgba(247,245,255,0) 170px,rgba(247,245,255,.9) 290px,#F7F5FF 330px,#F7F5FF 100%)}
  .w-hero-in{padding:250px 16px 60px}
  .w-kick{font-size:.74rem}
  .t-path{padding-left:50px} .t-path::before{left:20px} .stop{left:-50px;width:42px;height:42px} .stop .bubble{width:42px;height:42px} .stop b{font-size:.98rem}
  .rg-band{min-height:210px} .rg-band-in{padding:20px 18px 4px}
  .rg-band::before{background:linear-gradient(0deg,rgba(255,255,255,.97) 0%,rgba(255,255,255,.85) 55%,rgba(255,255,255,.3) 100%)}
  .lbar{padding:12px 14px} .lprog i{width:8px;height:8px} .lprog i.now{width:16px}
  .toplay{flex-direction:column;align-items:flex-start;padding:22px 18px} .toplay::before{background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.86) 70%,rgba(255,255,255,.6))}
  .toplay .tp-float{display:none}
  .tp-m{align-self:flex-end;margin-top:-26px} .tp-m img.mascot{width:78px}
  .gate{height:120px} .g-sky{bottom:150px} .g-mate{bottom:150px} .g-mate img.mascot{width:80px} .gate-pop{bottom:132px}
  .gate-hint{display:none}
  .g-hint{font-size:.84rem;top:96px} .g-sky{top:140px}
  .says.hook img.mascot{width:86px}
}
@container pron (max-width:560px){
  .brand-sep,.brand-name{display:none}
  .logo{height:22px}
  .lprog{display:none}
  .tr-cap{display:none} .trb{padding:6px 10px;font-size:.84rem;min-height:34px}
  .top{padding:8px 12px}
  .g-top{gap:6px;padding:8px 10px} .g-topic{display:none}
  @container pron (max-width:440px){ .g-round{display:none} } .g-round{font-size:.9rem} .g-rtab{width:30px;height:30px;font-size:.85rem} .g-icon{width:38px;height:38px}

  .g-hud{top:62px}
  .g-gates{gap:8px} .gate-spk{width:36px;height:36px;top:6px;right:6px} .gate-spk svg{width:30px;height:30px;padding:7px} .gate-key{display:none}
  .g-mate-b{display:none}
  .says img.mascot{width:60px} .says.hook img.mascot{width:72px}
  .res-cast img.mascot{width:56px} .res-star,.res-star svg{width:70px;height:70px}
  .practise{gap:10px;padding:7px 8px 7px 7px} .pr-orb{width:44px;height:44px} .pr-t b{font-size:1.12rem} .pr-t small{font-size:.74rem} .pr-go{width:36px;height:36px}
  .lnav .btn{padding:10px 14px}
  .lnav-end .btn.ghost{display:none}
}
@media (max-height:560px){ .g-mate{display:none} }
@media (prefers-reduced-motion: reduce){ .floaters span,.wave path,.practise::after,.pr-orb{animation:none!important} .portal-fx{display:none} }
@container pron (min-width:980px){ .l-end{max-width:none;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start} .l-end>.toplay{grid-column:1/-1} .l-end>section:only-child{grid-column:1/-1} }

.er{grid-template-columns:70px minmax(0,1fr)} .vp{grid-template-columns:repeat(2,minmax(0,1fr))}
.sws .say{max-width:100%;flex-wrap:wrap;overflow-wrap:anywhere;white-space:normal;text-align:left}
.gate-pop{white-space:normal;width:max-content;max-width:min(300px,calc(100cqw - 16px));text-align:center}
@container pron (max-width:360px){ .er{grid-template-columns:52px minmax(0,1fr)} .eipa{font-size:1.35rem} }

.gate.nope .gate-arch{animation:nope .55s ease-in-out}
.gate.nope .gate-arch::before{content:"";position:absolute;inset:-3px;border-radius:inherit;box-shadow:0 0 0 3px rgba(135,75,248,.45);opacity:0;animation:nopeGlow .9s ease-out}
@keyframes nope{0%,100%{transform:none;filter:none}20%{transform:translateX(-4px) rotate(-1deg);filter:saturate(.55) brightness(1.05)}45%{transform:translateX(3px) rotate(.6deg);filter:saturate(.6)}70%{transform:translateX(-2px);filter:saturate(.8)}}
@keyframes nopeGlow{0%{opacity:1}100%{opacity:0;transform:scale(1.06)}}
.echo.retry{animation:retry .7s cubic-bezier(.3,1.4,.6,1)}
.echo.retry .echo-core{box-shadow:0 0 0 3px #fff,0 0 0 7px rgba(255,214,10,.75),0 0 30px 10px rgba(10,199,255,.45)}
@keyframes retry{0%{filter:brightness(1)}30%{filter:brightness(1.25)}100%{filter:none}}
.g-why{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:4px 14px 4px 4px;border-radius:999px;border:1.5px solid #D6CBF5;background:#fff;color:var(--violet-ink);font:700 .9rem/1 var(--ui);cursor:pointer;box-shadow:0 4px 12px rgba(76,44,170,.14)}
.g-why b{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--soft);color:var(--violet-ink);font-size:.95rem}
.g-why:hover{border-color:var(--violet)}
.g-why.pop{animation:whyIn .45s cubic-bezier(.3,1.5,.6,1)}
@keyframes whyIn{0%{transform:scale(.6);opacity:0}100%{transform:none;opacity:1}}
.g-hud{gap:10px}
@container pron (max-width:560px){ .g-why{min-height:34px;padding:3px 10px 3px 3px;font-size:.82rem} .g-why b{width:26px;height:26px} }
@media (prefers-reduced-motion: reduce){ .gate.nope .gate-arch,.echo.retry,.g-why.pop{animation:none!important} }
.pron{container:pron/inline-size;overflow-wrap:break-word}
.pron [lang="kk"]{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
@container pron (min-width:721px){.lnav{padding-right:max(96px,calc((100cqw - 1120px)/2))}}
`
