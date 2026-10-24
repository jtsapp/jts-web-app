// CSS «Грамматики · игр» — стили прототипа методиста (data/jtsgrammar-games.html)
// для Shadow DOM экрана GrammarGamesPage. Правила прототипа — как есть, кроме:
// - :root и html,body → корень раздела .gg (тень не видит :root и body); шрифт —
//   сайта: var(--gg-font) ставит экран от вычисленного шрифта хоста (Manrope, на
//   телефоне PT Root UI, в kk — Inter), Google Fonts прототипа не грузятся;
// - убраны шапка прототипа (.top, .logo, .seg, .mascot-top — язык и звук у экрана
//   свои) и неиспользуемый блок QUEST;
// - в конце — свои правила: экран загрузки темы и кнопка «В словарь» в окне слова.
// Тёмной темы у раздела нет (Д13): светлая палитра прототипа.

export const GRAMMAR_GAMES_CSS = `
.gg{--acc:#9047FF;--acc2:#6932BB;--ink:#171326;--muted:#6B6878;--line:#EFEDF4;--bg:#FFFFFF;--ok:#2FB164;--okbg:#E7F6EC;--bad:#E5484D;--badbg:#FDECEC; --ks:#2D5BD0;--ka:#7A3FE0;--kv:#1E8A4F;--kn:#C2185B;--kq:#C46A12;--ko:#5E5A72;--ksb:#E6EEFF;--kab:#F1E9FF;--kvb:#E2F6EA;--knb:#FFE4EE;--kqb:#FFF0E0;--kob:#F3F2F7;margin:0;position:relative;background:var(--bg);color:var(--ink);font-family:var(--gg-font,inherit)}
*{box-sizing:border-box}
button{font-family:inherit;cursor:pointer;color:inherit}
.icon-btn{border:1px solid var(--line);background:#fff;border-radius:999px;width:38px;height:38px;font-size:17px;display:grid;place-items:center;flex:none}.icon-btn.off{opacity:.4}
main{max-width:1120px;margin:0 auto;padding:22px 20px 70px}
h1{font-size:30px;margin:4px 0 6px;letter-spacing:-.4px;line-height:1.2}
h2.sec{font-size:20px;margin:30px 0 12px;display:flex;align-items:center;gap:10px}
.sub{color:var(--muted);margin:0 0 16px;font-size:15px;line-height:1.55}
.back{border:0;background:none;color:var(--muted);font-weight:700;font-size:14px;padding:6px 0;margin-bottom:6px}
.btn{border:0;border-radius:999px;padding:12px 24px;font-weight:700;font-size:15.5px;background:var(--acc);color:#fff;transition:background .15s,transform .08s}.btn:hover{background:var(--acc2)}.btn:active{transform:scale(.98)}.btn:disabled{opacity:.4;cursor:default}
.btn.line{background:#fff;color:var(--ink);border:1.5px solid var(--line)}.btn.line:hover{background:#F7F2FF;border-color:#DCCBFF}
.btn.big{font-size:18px;padding:16px 34px}
.row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px}
.pill{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-weight:800;font-size:14px;white-space:nowrap}
/* ---------- HUB ---------- */
.hero{display:flex;align-items:center;gap:20px;background:linear-gradient(110.8deg,#9047FF 15.5%,#6932BB 94.2%);color:#fff;border-radius:20px;padding:24px 28px;margin-bottom:22px;position:relative;overflow:hidden}
.hero:after{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.18) 1px,transparent 1px);background-size:22px 22px;opacity:.5;pointer-events:none}
.hero h1{color:#fff;margin:0}.hero p{margin:6px 0 0;opacity:.92;line-height:1.5}.hero img{width:120px;height:120px;object-fit:contain;flex:none;filter:drop-shadow(0 8px 16px rgba(0,0,0,.25));position:relative;z-index:1}
.hero>div{position:relative;z-index:1}
.hero .stat{margin-left:auto;background:rgba(255,255,255,.16);border-radius:16px;padding:12px 16px;text-align:center;flex:none}.hero .stat b{font-size:26px;display:block}
.levels{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:22px}
.lvcard{position:relative;border:0;text-align:left;border-radius:20px;padding:16px 16px 14px;color:#fff;background:linear-gradient(140deg,#7C4DFF,#5A2FD0);overflow:hidden;transition:transform .15s,box-shadow .15s;min-height:128px}
.lvcard:before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.2) 1px,transparent 1px);background-size:16px 16px;opacity:.45}
.lvcard>*{position:relative}
.lvcard .big{font-size:26px;font-weight:800;letter-spacing:-.5px;line-height:1}.lvcard .nm{font-size:10.5px;letter-spacing:2px;font-weight:800;margin-top:8px;opacity:.95;text-transform:uppercase}
.lvcard .bar{height:5px;background:rgba(255,255,255,.25);border-radius:9px;margin-top:12px;overflow:hidden}.lvcard .bar i{display:block;height:100%;background:#fff}
.lvcard .cnt{font-size:12px;opacity:.85;margin-top:6px;font-weight:700}
.lvcard.on{transform:translateY(-4px);box-shadow:0 14px 30px rgba(90,40,200,.3),0 0 0 3px #fff inset,0 0 0 5px rgba(144,71,255,.35)}
.lvcard:not(.on){filter:saturate(.75) brightness(.97)}
.lvcard:hover{transform:translateY(-4px)}
.lvhead{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;margin:6px 0 14px}
.lvhead h2{margin:0;font-size:26px}.lvhead .stk{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
.stk span{font-weight:800;font-size:13px;padding:6px 12px;border-radius:10px;transform:rotate(-3deg);box-shadow:0 4px 10px rgba(0,0,0,.08)}
.stk span:nth-child(1){background:#fff;color:var(--acc);border:1px solid var(--line)}.stk span:nth-child(2){background:#1FB5F0;color:#fff;transform:rotate(2deg)}.stk span:nth-child(3){background:#E2489E;color:#fff}
.tgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.tcard{background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px 16px;cursor:pointer;transition:transform .15s,box-shadow .15s;display:flex;gap:12px;align-items:flex-start;text-align:left;width:100%}
.tcard:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(60,30,140,.12)}
.tcard .num{font-weight:800;color:var(--acc);font-size:13px;min-width:22px;padding-top:3px}
.tcard .ic{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;font-size:23px;flex:none}
.tcard h3{margin:0 0 3px;font-size:15px;line-height:1.3}.tcard p{margin:0;color:var(--muted);font-size:12.5px}
.tcard .prog{display:flex;align-items:center;gap:8px;margin-top:9px;font-size:11.5px;color:var(--muted);font-weight:700}.tcard .prog .bar{flex:1;height:5px;border-radius:99px;background:#F1EEF8;overflow:hidden}.tcard .prog .bar i{display:block;height:100%;border-radius:99px}
.tcard.soon{opacity:.5;cursor:default}.tcard.soon:hover{transform:none;box-shadow:none}
/* ---------- TOPIC / RULE ---------- */
.thead{display:flex;gap:18px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:24px;padding:20px 22px;margin-bottom:6px}
.thead .ic{width:66px;height:66px;border-radius:20px;display:grid;place-items:center;font-size:36px;flex:none}
.thead h1{margin:0;font-size:26px}.thead .lvb{display:inline-block;font-size:12px;font-weight:800;border-radius:999px;padding:3px 10px;background:#F1EEF8;color:var(--acc);margin-bottom:6px}
.thead .intro{margin:8px 0 0;line-height:1.6;font-size:15px}
.thead img{width:96px;height:96px;object-fit:contain;margin-left:auto;flex:none}
.tabs{display:flex;gap:8px;margin:16px 0 4px}.tabs button{border:1px solid #E4DEF5;background:#fff;border-radius:999px;padding:9px 18px;font-weight:700;font-size:14px;color:#4A4664}.tabs button.on{background:var(--acc);border-color:var(--acc);color:#fff}
.cards3d{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px}
.c3d{position:relative;cursor:pointer;transform-style:preserve-3d;transform:perspective(900px);transition:transform .25s ease-out,box-shadow .25s;border-radius:20px;background:linear-gradient(160deg,#fff 0%,#FAF7FF 100%);border:1px solid #EFEDF4;padding:18px 18px 16px;box-shadow:0 2px 0 #EFEDF4,0 9px 0 -2px #EEE7FD,0 16px 28px rgba(105,50,187,.10);min-height:200px;display:flex;flex-direction:column}
.c3d:hover{box-shadow:0 2px 0 #E4DCF8,0 12px 0 -2px #D2C4F4,0 26px 40px rgba(80,40,180,.22)}
.c3d .no{position:absolute;right:14px;top:12px;font-weight:800;font-size:40px;color:#F1EAFF;transform:translateZ(10px)}
.c3d h4{margin:0 0 14px;font-size:16px;transform:translateZ(30px);position:relative}
.c3d .fz{transform:translateZ(40px);margin-bottom:14px}
.c3d .ex1{transform:translateZ(25px);font-size:14.5px;color:#3E3760;margin-top:auto}
.c3d .more-hint{transform:translateZ(20px);font-size:12px;color:var(--acc);font-weight:800;margin-top:10px;display:flex;align-items:center;gap:6px}
.formula{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.brick{position:relative;display:inline-block;padding:8px 13px 9px;border-radius:12px;font-weight:800;font-size:15px;line-height:1.2;border:1.5px solid transparent;box-shadow:0 3px 0 rgba(23,19,38,.06),0 8px 16px rgba(80,40,180,.08)}
.brick.s{background:var(--ksb);color:var(--ks);border-color:#CFDDFF}.brick.a{background:var(--kab);color:var(--ka);border-color:#DCCBFF}.brick.v{background:var(--kvb);color:var(--kv);border-color:#BFE6CE}.brick.n{background:var(--knb);color:var(--kn);border-color:#FFC6DA}.brick.q{background:var(--kqb);color:var(--kq);border-color:#FFD6AE}.brick.o{background:var(--kob);color:var(--ko);border-color:#E1DFEA}
.plus{font-weight:800;color:#B9B2D3;font-size:18px}
.legend{display:flex;flex-wrap:wrap;gap:12px;margin:14px 0 0;font-size:12.5px;color:var(--muted);font-weight:700}.legend i{display:inline-block;width:12px;height:12px;border-radius:4px;margin-right:5px;vertical-align:-1px}
/* modal */
.ov{position:fixed;inset:0;background:rgba(25,20,49,.55);backdrop-filter:blur(3px);z-index:60;display:grid;place-items:center;padding:16px;animation:fade .2s;perspective:1400px}
.modal{background:#fff;border-radius:26px;max-width:680px;width:100%;max-height:88vh;overflow:auto;padding:26px 26px 22px;position:relative;animation:flipIn .45s cubic-bezier(.2,.9,.3,1.2);box-shadow:0 30px 80px rgba(20,10,60,.4)}
.modal .x{position:absolute;right:14px;top:14px}
.modal h3{margin:0 0 16px;font-size:22px;padding-right:40px}
.modal .formula .brick{font-size:18px;padding:11px 16px 12px}
.modal .txt{font-size:16px;line-height:1.7;margin:18px 0}
.exlist{display:flex;flex-direction:column;gap:8px}
.exl{display:flex;gap:10px;align-items:center;border:1px solid var(--line);background:#FAF9FD;border-radius:14px;padding:10px 12px;font-size:16px}
.spk{border:0;background:#EFE9FC;color:var(--acc);border-radius:10px;width:34px;height:34px;flex:none;font-size:15px}
.spk:hover{background:var(--acc);color:#fff}
/* table */
.gtable{background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden;margin-bottom:14px;box-shadow:0 10px 24px rgba(60,30,140,.06)}
.gtable .cap{padding:13px 18px;font-weight:800;background:linear-gradient(90deg,#F4EEFF,#fff);border-bottom:1px solid var(--line)}
.tscroll{overflow-x:auto}
table.gt{border-collapse:collapse;width:100%;min-width:520px}
.gt th{font-size:13px;text-align:left;padding:11px 14px;background:#FBFAFE;color:var(--muted);border-bottom:1px solid var(--line)}
.gt th .hc{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-weight:800}
.gt th .hc.p{background:#E7F6EC;color:#1C7A43}.gt th .hc.m{background:#FDECEC;color:#B4262B}.gt th .hc.q{background:#FFF4DE;color:#A35F00}
.gt td{padding:11px 14px;border-bottom:1px solid #F3F0FA;font-size:15.5px;vertical-align:top}
.gt tr:last-child td{border-bottom:0}.gt td:first-child{font-weight:800;color:var(--acc);white-space:nowrap}
.gt tbody tr:hover td{background:#FBF8FF}
/* mistakes */
.mlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.mist{background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px 16px}
.mist .b{color:#B4262B;text-decoration:line-through;text-decoration-thickness:2px;font-size:15.5px}.mist .g{color:#1C7A43;font-weight:800;font-size:15.5px;margin-top:4px}
.mist .why{color:var(--muted);font-size:13.5px;margin-top:8px;line-height:1.5}
/* words */
.w{cursor:pointer;border-radius:5px;padding:0 1px;transition:background .12s;border-bottom:1.5px dotted rgba(135,75,246,.45)}
.w:hover,.w.sel{background:#EFE6FF;border-bottom-color:var(--acc)}
.pop{position:absolute;z-index:80;background:#fff;border-radius:16px;box-shadow:0 16px 40px rgba(30,15,80,.25);border:1px solid var(--line);padding:12px 14px;min-width:210px;max-width:290px;animation:pop .18s}
.pop .wd{font-weight:800;font-size:19px;display:flex;align-items:center;gap:8px}
.pop .tr{display:flex;gap:8px;margin-top:7px;font-size:14.5px;line-height:1.35}.pop .tr b{font-size:11px;background:#F1EEF8;color:var(--acc);border-radius:6px;padding:2px 6px;height:fit-content;margin-top:1px}
.pop .acts{display:flex;gap:6px;margin-top:10px}.pop .acts button{border:0;background:#F1EEF8;border-radius:10px;padding:7px 10px;font-weight:800;font-size:12.5px;color:var(--acc)}
.pop .acts button:hover{background:var(--acc);color:#fff}
.cta{margin:30px 0 0;background:linear-gradient(110.8deg,#9047FF 15.5%,#6932BB 94.2%);border-radius:20px;padding:22px 24px;color:#fff;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.cta h3{margin:0;font-size:20px}.cta p{margin:4px 0 0;opacity:.9}.cta .btn{margin-left:auto;background:#fff;color:var(--acc)}.cta .btn:hover{background:#F3EBFF}
/* ---------- GAMES GRID ---------- */
.games{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;margin-top:14px}
.gcard{--gb:#F7F2FF;--gc:#7A3FE0;background:var(--gb);border:1.5px solid transparent;border-radius:20px;padding:18px;cursor:pointer;transition:transform .15s,box-shadow .15s,border-color .15s;text-align:left}
.gcard:hover{transform:translateY(-3px);box-shadow:0 12px 26px rgba(80,40,180,.12);border-color:rgba(144,71,255,.25)}
.gcard .gi{font-size:34px}.gcard b{display:block;margin:10px 0 4px;font-size:16.5px;color:var(--gc)}.gcard>span{font-size:13px;color:var(--ink);opacity:.62;line-height:1.4;display:block}
.gcard .stars{font-size:17px;letter-spacing:2px;margin-top:10px;color:rgba(23,19,38,.13)}.gcard .stars .y{color:#FFB400}
.gcard.done{border-color:#FFD66B}
.g-pick{--gb:#F1E9FF;--gc:#8A4BE0}.g-match{--gb:#FFE4F0;--gc:#C2185B}.g-sort{--gb:#FFF0E0;--gc:#D27A1C}.g-build{--gb:#DCE8FF;--gc:#2D5BD0}.g-trans{--gb:#E2F6EA;--gc:#239157}.g-fix{--gb:#FFE9E9;--gc:#C93636}.g-place{--gb:#FFF0E0;--gc:#D27A1C}.g-type{--gb:#E6F4FF;--gc:#1C7CC9}.g-dialog{--gb:#F1E9FF;--gc:#8A4BE0}.g-listen{--gb:#E2F6EA;--gc:#239157}.g-race{--gb:#FFE4F0;--gc:#C2185B}.g-catch{--gb:#DCE8FF;--gc:#2D5BD0}
.gcard.boss{--gb:linear-gradient(110.8deg,#9047FF 15.5%,#6932BB 94.2%);--gc:#fff;color:#fff}.gcard.boss>span{color:#fff;opacity:.85}.gcard.boss .stars{color:rgba(255,255,255,.3)}
/* ---------- GAME FRAME ---------- */
.gtop{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.gtop .title{font-weight:800;font-size:17px}.gtop .sp{flex:1}
.pbar{height:9px;background:#E9E4F7;border-radius:99px;overflow:hidden;margin-bottom:16px}.pbar i{display:block;height:100%;background:linear-gradient(90deg,#9047FF,#B36BFF);transition:width .3s}
.stage{background:#fff;border:1px solid var(--line);border-radius:26px;padding:26px;min-height:400px;position:relative;overflow:hidden}
.ginst{text-align:center;color:var(--muted);font-size:14.5px;margin:-6px 0 14px;font-weight:600}
.pic{font-size:70px;text-align:center;line-height:1.1;margin:0 0 12px;animation:pop .35s}
.q{font-size:25px;font-weight:700;text-align:center;line-height:1.5;margin-bottom:22px}
.q .hint{color:var(--muted);font-weight:600;font-size:.8em}
.blank{display:inline-block;min-width:80px;border-bottom:3px solid var(--acc);color:var(--acc);padding:0 6px}
.opts{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.opts.col{flex-direction:column;align-items:stretch;max-width:620px;margin:0 auto}
.opt{border:1.5px solid var(--line);background:#fff;border-radius:16px;padding:14px 22px;font-size:18px;font-weight:700;min-width:130px;transition:background .12s,border-color .12s}
.opts.col .opt{font-size:17px;text-align:left}
.opt:hover{border-color:#CDB4FF;background:#F7F2FF}
.opt.ok{background:var(--okbg);border-color:var(--ok);color:#156B38}.opt.bad{background:var(--badbg);border-color:var(--bad);color:#9B1C20;animation:shake .35s}
.fb{text-align:center;font-weight:800;font-size:18px;min-height:28px;margin-top:14px}.fb.ok{color:var(--ok)}.fb.bad{color:var(--bad)}
.explain{text-align:center;color:var(--muted);font-size:14.5px;margin-top:4px}
/* build */
.answer{min-height:66px;border:2px dashed #D7CCF5;border-radius:18px;padding:10px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;margin-bottom:18px;background:#FBFAFF}
.answer.ok{border-color:var(--ok);background:var(--okbg)}.answer.bad{border-color:var(--bad);background:var(--badbg);animation:shake .35s}
.bubbles{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.bub{border:0;border-radius:999px;padding:12px 18px;font-size:18px;font-weight:700;color:#fff;background:linear-gradient(110.8deg,#9047FF 15.5%,#6932BB 94.2%);box-shadow:0 6px 14px rgba(105,50,187,.25)}
.bub:active{transform:scale(.96)}.bub.used{visibility:hidden}
.word{border-radius:12px;padding:10px 14px;font-size:18px;font-weight:700;background:#fff;border:1.5px solid #E4DEF5}
.solution{text-align:center;margin-top:12px;color:var(--muted);font-size:15px}
/* trans */
.tbox{max-width:620px;margin:0 auto 18px;text-align:center}
.tfrom{display:inline-block;font-size:22px;font-weight:800;background:#F4EFFF;border:2px solid #E1D5FB;border-radius:16px;padding:12px 18px}
.ttask{display:inline-flex;align-items:center;gap:8px;margin:14px 0 4px;background:#FFF4DE;color:#8A5200;font-weight:800;border-radius:999px;padding:7px 14px;font-size:14px}
.arrow{font-size:28px;color:var(--acc);margin:6px 0}
/* match */
.cards{display:grid;gap:12px;grid-template-columns:repeat(4,minmax(0,1fr))}
.cards.long{grid-template-columns:repeat(3,minmax(0,1fr))}
.mc{perspective:800px;height:92px;cursor:pointer}.cards.long .mc{height:104px}
.mc .in{position:relative;width:100%;height:100%;transition:transform .45s;transform-style:preserve-3d}
.mc.flip .in{transform:rotateY(180deg)}
.mc .f,.mc .b{position:absolute;inset:0;border-radius:16px;display:grid;place-items:center;backface-visibility:hidden;font-weight:800;padding:8px;text-align:center}
.mc .f{background:linear-gradient(110.8deg,#9047FF 15.5%,#6932BB 94.2%);color:#fff;font-size:28px}
.mc .b{background:#fff;border:2px solid #D7CCF5;transform:rotateY(180deg);font-size:17px}.cards.long .mc .b{font-size:14px;line-height:1.3}
.mc.done .b{background:var(--okbg);border-color:var(--ok)}
/* sort */
.chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;min-height:52px;margin-bottom:20px}
.chip2{border:1.5px solid #E4DEF5;background:#fff;border-radius:999px;padding:10px 16px;font-size:16.5px;font-weight:700}
.chip2.sel{border-color:var(--acc);background:#F1E9FF;transform:translateY(-3px)}.chip2.bad{animation:shake .35s;border-color:var(--bad)}
.buckets{display:grid;gap:12px}
.bucket{border:2px dashed #CDBEF5;border-radius:20px;padding:12px;min-height:130px;background:#FBF9FF;cursor:pointer;transition:all .12s}
.bucket:hover{border-color:var(--acc);background:#F5EEFF}
.bucket h5{margin:0 0 10px;text-align:center;font-size:15px;color:var(--acc)}
.bucket .in{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}.bucket .in span{background:var(--okbg);border:1px solid #BFE5CC;color:#156B38;border-radius:10px;padding:5px 9px;font-weight:700;font-size:14px;animation:pop .3s}
/* type */
.tin{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px}
.tin input{font:inherit;font-size:21px;font-weight:700;padding:12px 16px;border-radius:14px;border:2px solid #D7CCF5;min-width:240px;text-align:center;outline:none}
.tin input:focus{border-color:var(--acc)}.tin input.ok{border-color:var(--ok);background:var(--okbg)}.tin input.bad{border-color:var(--bad);background:var(--badbg);animation:shake .35s}
/* dialog */
.chat{max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:10px;max-height:360px;overflow-y:auto;padding:4px 4px 10px}
.msg{display:flex;gap:10px;align-items:flex-end;animation:pop .3s}
.msg .av{font-size:30px;flex:none}
.msg .bb{background:#F1EEF8;border-radius:18px 18px 18px 4px;padding:11px 15px;font-size:17px;line-height:1.45;max-width:80%}
.msg.B{flex-direction:row-reverse}.msg.B .bb{background:#EADFFF;border-radius:18px 18px 4px 18px}
.msg .bb .blank{min-width:60px}
.msg .bb .fill{color:var(--acc);font-weight:800}
.chatopts{margin-top:14px}
/* race */
.track{position:relative;background:#3B3561;border-radius:18px;padding:14px 14px;margin-bottom:18px}
.lane{position:relative;height:50px;margin-left:78px;border-bottom:2px dashed rgba(255,255,255,.25)}.lane:last-child{border-bottom:0}
.lane .car{position:absolute;top:4px;font-size:34px;transition:left .5s;transform:scaleX(-1)}
.lane .fin{position:absolute;right:0;top:0;bottom:0;width:14px;background:repeating-linear-gradient(0deg,#fff 0 7px,#111 7px 14px);border-radius:3px}
.lane .nm{position:absolute;left:-76px;top:17px;width:70px;color:rgba(255,255,255,.75);font-size:11px;font-weight:800}
.tfq{font-size:23px;font-weight:700;text-align:center;line-height:1.5;margin:6px 0 18px;min-height:70px}
.tfb{display:flex;gap:14px;justify-content:center}.tfb .opt{min-width:170px;font-size:20px}
/* listen */
.lbtn{width:110px;height:110px;border-radius:50%;border:0;font-size:48px;background:linear-gradient(110.8deg,#9047FF 15.5%,#6932BB 94.2%);color:#fff;box-shadow:0 14px 30px rgba(105,50,187,.3);display:block;margin:0 auto 10px}
.lbtn.play{animation:pulse 1s infinite}
/* catch */
.sky{position:relative;height:440px;border-radius:20px;background:linear-gradient(#DCEBFF,#F4F0FF);overflow:hidden}
.cloud{position:absolute;padding:14px 20px;border-radius:999px;background:#fff;font-weight:800;font-size:17px;box-shadow:0 8px 20px rgba(60,80,160,.18);user-select:none;white-space:nowrap;cursor:pointer}
.cloud:before,.cloud:after{content:'';position:absolute;background:#fff;border-radius:50%;z-index:-1}.cloud:before{width:34px;height:34px;left:14px;top:-14px}.cloud:after{width:44px;height:44px;right:16px;top:-20px}
.cloud.ok{background:var(--ok);color:#fff;transform:scale(1.2);opacity:0;transition:all .35s}.cloud.bad{background:var(--bad);color:#fff;animation:shake .35s}
.taskline{text-align:center;font-weight:800;font-size:18px;margin-bottom:12px}
/* fix */
.sentence{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:10px 0 20px}
.sentence .word{cursor:pointer}.sentence .word:hover{border-color:var(--acc)}.sentence .word.sel{border-color:var(--bad);background:var(--badbg)}.sentence .word.fixed{border-color:var(--ok);background:var(--okbg)}.sentence .word.miss{animation:shake .35s;border-color:#FFB4B6}
/* place */
.scenewrap{width:100%;max-width:580px;margin:0 auto;overflow:hidden}
.scene{position:relative;width:580px;height:360px;transform-origin:top left;border-radius:20px;background:linear-gradient(#EAF4FF 0 82%,#E7DCC8 82%);overflow:hidden}
.boxA{position:absolute;left:150px;top:140px;width:140px;height:95px;border:4px solid #B07A3B;background:rgba(214,170,110,.28);border-radius:6px;z-index:3}
.boxA:before{content:'';position:absolute;left:-4px;top:-26px;width:140px;height:22px;border:4px solid #B07A3B;border-bottom:0;background:rgba(214,170,110,.45);transform:skewX(-35deg);transform-origin:bottom left;border-radius:4px 4px 0 0}
.legA{position:absolute;top:235px;width:12px;height:65px;background:#8C5A24;border-radius:3px;z-index:3}
.boxB{position:absolute;left:430px;top:196px;width:110px;height:100px;background:linear-gradient(#E3B57A,#C98E4A);border-radius:6px;z-index:3}
.boxB:after{content:'';position:absolute;left:50%;top:0;bottom:0;width:16px;margin-left:-8px;background:rgba(255,255,255,.25)}
.zone{position:absolute;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;border:3px dashed rgba(135,75,246,.35);background:rgba(135,75,246,.06);cursor:pointer;z-index:6}
.zone:hover{border-color:var(--acc);background:rgba(135,75,246,.16)}
.zone.ok{border-color:var(--ok);background:rgba(47,177,100,.18)}.zone.bad{border-color:var(--bad);background:rgba(229,72,77,.18)}
.thing{position:absolute;transform:translate(-50%,-50%);font-size:46px;pointer-events:none}
.thing.z-behind{z-index:2;font-size:38px}.thing.z-in{z-index:2}.thing.z-front{z-index:5;font-size:56px}.thing.z-other{z-index:5}
/* boss */
.arena{display:flex;justify-content:space-between;align-items:center;gap:12px;background:linear-gradient(#2B1F55,#4A2C8A);border-radius:20px;padding:14px 18px;color:#fff;margin-bottom:18px}
.fighter{text-align:center;min-width:110px}.fighter img{width:84px;height:84px;object-fit:contain}.fighter .mon{font-size:70px;line-height:1;display:inline-block}
.fighter .mon.hit{animation:hit .4s}.fighter img.hurt{animation:shake .4s;filter:hue-rotate(-40deg) saturate(2)}
.hp{height:10px;background:rgba(255,255,255,.2);border-radius:9px;overflow:hidden;margin-top:8px;width:120px}.hp i{display:block;height:100%;background:linear-gradient(90deg,#FF6B6B,#FFB400);transition:width .3s}
.vs{font-weight:800;font-size:22px;opacity:.6}
/* result */
.result{text-align:center;padding:20px 10px}
.result img{width:170px;height:170px;object-fit:contain;animation:pop .5s}
.result .big{font-size:46px;letter-spacing:6px;margin:6px 0}.result .big .y{color:#FFB400}.result .big span{color:#E3DDF2}
.result h2{margin:6px 0;font-size:28px}
.emj{width:1.15em!important;height:1.15em!important;margin:0!important;filter:none!important;vertical-align:-.2em;display:inline-block;object-fit:contain;pointer-events:none}
/* ===== race: Dexter vs Spark ===== */
.rtrack{position:relative;border-radius:22px;overflow:hidden;padding:64px 14px 14px;margin-bottom:18px;background:linear-gradient(180deg,#C9B4FF 0%,#EDE4FF 52%,#F7F2FF 100%)}
.rclouds{position:absolute;left:0;right:0;top:6px;height:52px;background:radial-gradient(28px 14px at 60px 26px,#fff 98%,transparent),radial-gradient(40px 18px at 92px 22px,#fff 98%,transparent),radial-gradient(26px 12px at 330px 30px,#fff 98%,transparent),radial-gradient(38px 16px at 365px 24px,#fff 98%,transparent),radial-gradient(30px 13px at 620px 28px,#fff 98%,transparent);background-size:720px 52px;background-repeat:repeat-x;opacity:.9}
.rhills{position:absolute;left:0;right:0;top:34px;height:40px;background:radial-gradient(120px 40px at 100px 40px,#B79BFF 98%,transparent),radial-gradient(160px 46px at 380px 44px,#A98BF8 98%,transparent),radial-gradient(110px 36px at 610px 40px,#B79BFF 98%,transparent);background-size:720px 40px;background-repeat:repeat-x;opacity:.7}
.rtrack.run .rclouds{animation:scrollX 14s linear infinite}.rtrack.run .rhills{animation:scrollX 8s linear infinite}
@keyframes scrollX{to{background-position:-720px 0}}
.rlane{position:relative;height:84px;margin-top:8px;border-radius:16px;background:#5B3FA8;background-image:linear-gradient(90deg,rgba(255,255,255,.5) 50%,transparent 0);background-size:46px 4px;background-repeat:repeat-x;background-position:0 50%;box-shadow:inset 0 -6px 0 rgba(0,0,0,.12)}
.rtrack.run .rlane{animation:road .5s linear infinite}@keyframes road{to{background-position:-46px 50%}}
.rnm{position:absolute;left:10px;top:6px;color:rgba(255,255,255,.8);font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;z-index:1}
.rfin{position:absolute;right:0;top:0;bottom:0;width:18px;background:repeating-conic-gradient(#fff 0 25%,#171326 0 50%) 0 0/12px 12px;border-radius:0 16px 16px 0}
.racer{position:absolute;bottom:4px;height:76px;transition:left .55s cubic-bezier(.3,1.4,.5,1);z-index:2;filter:drop-shadow(0 6px 6px rgba(20,8,60,.35))}
.racer.s{height:66px}
.racer.go.d{animation:runD .32s ease-in-out infinite alternate}.racer.go.s{animation:runS .28s ease-in-out infinite alternate}
@keyframes runD{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-7px) rotate(3deg)}}
@keyframes runS{from{transform:translateY(0) rotate(-8deg)}to{transform:translateY(-10px) rotate(8deg)}}
.racer.boost{animation:boost .5s}@keyframes boost{30%{transform:translateY(-16px) scale(1.08)}}
.racer.trip{animation:trip .5s}@keyframes trip{30%{transform:rotate(-18deg) translateX(-6px)}}
.racer.cheer{animation:win .45s ease-in-out infinite alternate}.racer.sad{filter:grayscale(.6) drop-shadow(0 6px 6px rgba(20,8,60,.25));transform:rotate(-8deg)}
/* ===== catch: Dexter cheering ===== */
.skywrap{position:relative}
.catcher{position:absolute;left:14px;bottom:8px;height:96px;z-index:4;pointer-events:none;filter:drop-shadow(0 6px 8px rgba(20,8,60,.25))}
.catcher.jump{animation:jump .5s}.catcher.oops{animation:oops .5s}
@keyframes jump{40%{transform:translateY(-26px) rotate(-6deg)}}
@keyframes oops{25%{transform:translateX(-8px) rotate(-10deg)}75%{transform:translateX(8px) rotate(8deg)}}
.sky{background:linear-gradient(180deg,#E7DCFF 0%,#F3EEFF 55%,#E6F0FF 100%)!important}
/* ===== final battle: Dexter vs Spark ===== */
.arena2{position:relative;height:290px;border-radius:22px;overflow:hidden;margin-bottom:18px;background:linear-gradient(110.8deg,#9047FF 15.5%,#6932BB 94.2%)}
.arena2:before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.18) 1px,transparent 1px);background-size:20px 20px;opacity:.6}
.ar-lights{position:absolute;inset:0;background:radial-gradient(ellipse 45% 60% at 25% 0%,rgba(255,255,255,.22),transparent 70%),radial-gradient(ellipse 45% 60% at 75% 0%,rgba(255,255,255,.18),transparent 70%)}
.ar-ring{position:absolute;left:6%;right:6%;bottom:16px;height:46px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(255,255,255,.35),rgba(255,255,255,.06) 60%,transparent 72%)}
.ar-hud{position:absolute;top:14px;color:#fff;z-index:5;width:32%}.ar-hud.l{left:18px}.ar-hud.r{right:18px;text-align:right}
.ar-hud b{font-size:15px;letter-spacing:.3px}.ar-hud span{font-size:12.5px;font-weight:700;opacity:.92}
.hp2{height:11px;background:rgba(255,255,255,.25);border-radius:9px;overflow:hidden;margin:6px 0 5px}.hp2 i{display:block;height:100%;background:linear-gradient(90deg,#2FB164,#9BE15D);border-radius:9px;transition:width .45s}
.hp2.sp i{background:linear-gradient(90deg,#FF6B6B,#FFB400);margin-left:auto}
.ar-vs{position:absolute;left:50%;top:16px;transform:translateX(-50%);color:#fff;font-weight:900;font-size:26px;letter-spacing:1px;text-shadow:0 3px 0 rgba(0,0,0,.18);z-index:5}
.ftr{position:absolute;bottom:26px;z-index:3;filter:drop-shadow(0 10px 10px rgba(20,8,60,.35))}
.ftr.d{left:12%;height:190px}.ftr.s{right:12%;height:160px}
.ftr.idle.d{animation:bobD 1.4s ease-in-out infinite}.ftr.idle.s{animation:bobS 1.1s ease-in-out infinite}
@keyframes bobD{50%{transform:translateY(-6px)}}@keyframes bobS{50%{transform:translateY(-12px) rotate(-5deg)}}
.ftr.d.atk{animation:atkD .72s ease-in-out}.ftr.s.atk{animation:atkS .72s ease-in-out}
@keyframes atkD{0%{left:12%}35%{left:46%;transform:rotate(14deg) scale(1.05)}55%{left:44%;transform:rotate(-4deg)}100%{left:12%}}
@keyframes atkS{0%{right:12%}35%{right:46%;transform:rotate(-24deg) scale(1.08)}55%{right:44%;transform:rotate(6deg)}100%{right:12%}}
.ftr.hit{animation:hitF .5s}.ftr.s.hit{--kb:26px;--kr:14deg}.ftr.d.hit{--kb:-26px;--kr:-12deg}
@keyframes hitF{0%{filter:none}20%{filter:brightness(2.4) saturate(.3)}45%{transform:translateX(var(--kb)) rotate(var(--kr))}100%{transform:none}}
.ftr.ko.s{animation:koS 1.1s forwards}.ftr.ko.d{animation:koD 1.1s forwards}
@keyframes koS{to{transform:translate(50px,40px) rotate(110deg);opacity:.55}}
@keyframes koD{to{transform:translate(-40px,40px) rotate(-90deg);opacity:.55}}
.ftr.win{animation:win .45s ease-in-out infinite alternate}@keyframes win{to{transform:translateY(-24px)}}
.pow{position:absolute;top:70px;font-weight:900;font-size:40px;color:#FFE14D;-webkit-text-stroke:2px #4E1CB0;text-shadow:0 5px 0 #4E1CB0;opacity:0;pointer-events:none;z-index:6}
.pow.atS{right:22%}.pow.atD{left:22%}
.pow.show{animation:powA .65s}@keyframes powA{0%{opacity:0;transform:scale(.3) rotate(-14deg)}30%{opacity:1;transform:scale(1.25) rotate(6deg)}100%{opacity:0;transform:scale(1)}}
@media (max-width:720px){.arena2{height:230px}.ftr.d{height:140px;left:6%}.ftr.s{height:118px;right:6%}.ar-hud{width:40%}.pow{font-size:30px;top:62px}.rlane{height:70px}.racer{height:62px}.racer.s{height:54px}.catcher{height:70px}}

.toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:var(--ink);color:#fff;padding:12px 18px;border-radius:14px;font-weight:700;z-index:90;animation:pop .2s}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
@keyframes pop{0%{transform:scale(.7);opacity:0}70%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
@keyframes fade{from{opacity:0}}
@keyframes flipIn{from{transform:rotateX(-25deg) translateY(40px) scale(.85);opacity:0}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes pulse{50%{transform:scale(1.07)}}
@keyframes hit{0%{transform:scale(1)}30%{transform:scale(.8) rotate(-10deg);filter:brightness(3)}100%{transform:scale(1)}}
.confetti{position:fixed;top:-10px;width:10px;height:14px;z-index:95;animation:fall 1.6s linear forwards;border-radius:2px}
@keyframes fall{to{transform:translateY(105vh) rotate(540deg)}}
@media (max-width:900px){.levels{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:720px){
 .icon-btn{width:32px;height:32px;font-size:14px}
 main{padding:16px 14px 60px}
 .levels{grid-template-columns:repeat(2,minmax(0,1fr))}.lvcard .big{font-size:22px}
 .hero img{width:64px;height:64px}.hero .stat{display:none}.hero{padding:18px;gap:12px}.hero h1{font-size:21px}.hero p{font-size:13.5px}.thead h1{font-size:21px}
 .thead{flex-wrap:wrap}.thead img{display:none}
 .q{font-size:20px}.opt{min-width:100px;font-size:17px;padding:12px 16px}.stage{padding:16px}
 .cards{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.mc{height:76px}.mc .b{font-size:14px}.cards.long{grid-template-columns:repeat(2,minmax(0,1fr))}
 .tfb .opt{min-width:120px}.tfq{font-size:19px}.arena{padding:10px}.fighter{min-width:80px}.fighter img{width:60px;height:60px}.fighter .mon{font-size:50px}.hp{width:80px}
 .lvhead .stk{display:none}
}

/* ---------- порт: загрузка темы, «В словарь» ---------- */
.gg-wait{display:grid;place-items:center;align-content:center;gap:12px;text-align:center;min-height:300px}
.gg-wait img{width:120px;height:120px;object-fit:contain}
.gg-wait .sub{margin:0;max-width:420px}
.pop .acts{flex-wrap:wrap}
.pop .acts button:disabled{opacity:.6;cursor:default;background:#F1EEF8;color:var(--acc)}
`
