// CSS Скорочтения — стили экрана из прототипа кабинета (data/jts-student-cabinet.html: .srstart, .tele, .srres
// и кирпичи кабинета .cbtn, .card, .chero, .cseg, .lrow, .cpill) для Shadow DOM экрана SpeedReadingPage.
// Правила прототипа — как есть, кроме:
// - :root и html,body → корень раздела .sr (тень не видит :root и body); шрифт — сайта: var(--sr-font) ставит
//   экран от вычисленного шрифта хоста (Manrope, на телефоне PT Root UI, в kk — Inter), Google Fonts прототипа
//   (Manrope и Material Symbols) не грузятся — значки встроенным SVG (.ms svg);
// - шапка кабинета и прочие экраны прототипа не переносились — только то, что рисует Скорочтение;
// - в конце — свои правила: шаг «Проверяем запись…», строка монет итога, отключённая кнопка образца,
//   телефон до 560 px.
// Тёмной темы у раздела нет (Д13): светлая палитра прототипа.

export const SPEED_READING_CSS = `
.sr{--acc:#9047FF;--acc2:#6932BB;--ink:#171326;--muted:#6B6878;--line:#EFEDF4;color:var(--ink);font-family:var(--sr-font,inherit);line-height:1.4}
*{box-sizing:border-box}
button{font-family:inherit;cursor:pointer;color:inherit}
h2,h3,h4,p{line-height:1.25}
.ms{display:inline-flex;width:22px;height:22px;flex:none;vertical-align:middle}
.ms svg{width:100%;height:100%;fill:currentColor}
.ph{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px}
.card{background:#fff;border:1px solid #EFEDF4;border-radius:20px;padding:20px 22px;margin-bottom:16px}
.card h3{margin:0 0 10px;font-size:18px}
.muted{color:#6B6878}
.cbtn{border:0;border-radius:999px;padding:11px 20px;font-weight:700;font-size:15px;background:#9047FF;color:#fff;cursor:pointer;display:inline-flex;align-items:center;gap:6px;text-decoration:none}
.cbtn:hover{background:#7E37EE}.cbtn:disabled{opacity:.45;cursor:default}
.cbtn.line{background:#fff;color:#171326;border:1px solid #E4DEF5}.cbtn.line:hover{background:#F7F2FF}
.cbtn.line:disabled:hover{background:#fff}
.cbtn.ghost{background:#F3EBFF;color:#9047FF}.cbtn.ghost:hover{background:#EADDFF}
.cbtn.sm{padding:8px 14px;font-size:14px}
.cbtn.white{background:#fff;color:#9047FF}
.chero{border-radius:20px;padding:24px;color:#fff;background:linear-gradient(110.8deg,#9047FF 15.5%,#6932BB 94.2%);display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:16px;position:relative;overflow:hidden}
.chero h2{margin:0 0 4px;font-size:24px}.chero p{margin:0;opacity:.92}
.chero img.m{width:110px;height:110px;object-fit:contain;margin:-10px 0 -14px auto}
.cpill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 10px;font-size:12.5px;font-weight:700;white-space:nowrap}
.st-new{background:#F3EBFF;color:#7A3FE0}.st-ok{background:#E2F6EA;color:#1E8A4F}.st-grey{background:#F3F2F7;color:#5E5A72}
.lrow{display:flex;align-items:center;gap:14px;padding:13px 0;border-top:1px solid #F3F1F8}
.lrow:first-of-type{border-top:0}
.lrow .ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;flex:none;font-size:22px}
.lrow .ti{flex:1;min-width:0}.lrow .ti b{display:block;font-size:15.5px}.lrow .ti span{color:#6B6878;font-size:13.5px}
.cseg{display:inline-flex;background:#F6F4FA;border-radius:999px;padding:3px;flex-wrap:wrap}
.cseg button{border:0;background:none;border-radius:999px;padding:7px 14px;font-weight:700;font-size:13.5px;color:#6B6878;cursor:pointer}
.cseg button.on{background:#9047FF;color:#fff}
.srstart{max-width:620px;margin:10px auto 0;background:#fff;border:1px solid #EFEDF4;border-radius:24px;padding:28px 28px 24px;text-align:center;box-shadow:0 18px 40px rgba(80,40,180,.08)}
.srava{width:150px;height:150px;border-radius:50%;margin:0 auto 12px;background:linear-gradient(110.8deg,#9047FF 15.5%,#6932BB 94.2%);display:grid;place-items:center;overflow:hidden}
.srava img{height:132px;margin-top:22px}
.srstart h2{color:#9047FF;margin:6px 0 6px;font-size:24px}.srstart>p{margin:0 auto 14px;max-width:470px;line-height:1.55}
.srnote{background:#E6EEFF;color:#2D5BD0;border-radius:14px;padding:11px 14px;font-size:14px;margin:10px auto;max-width:470px}
.srh{text-align:left;margin:18px 0 8px;font-size:15px}
.srtexts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;text-align:left}
.srtexts button{border:1.5px solid #EFEDF4;background:#fff;border-radius:14px;padding:10px 12px;cursor:pointer;display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:center}
.srtexts button .ic{grid-row:span 2;font-size:24px}.srtexts button b{font-size:14.5px}.srtexts button small{color:#6B6878;font-size:12px}
.srtexts button.on{border-color:#9047FF;background:#F7F2FF}
.srstart .cseg{justify-content:center}
.srgo{margin-top:18px;width:100%;justify-content:center;padding:15px 20px;font-size:16px}
.tele{background:#0E0C17;border-radius:24px;overflow:hidden;color:#fff;position:relative}
.tele-top{display:flex;align-items:center;gap:12px;padding:14px 18px;background:rgba(255,255,255,.04)}
.tele-top b{flex:1;text-align:center;font-size:16px}.tele-top #rectime{font-variant-numeric:tabular-nums;font-weight:700;opacity:.85;min-width:44px}
.recdot{width:12px;height:12px;border-radius:50%;background:#FF3B5C;box-shadow:0 0 0 0 rgba(255,59,92,.6);animation:recp 1.2s infinite}
@keyframes recp{70%{box-shadow:0 0 0 10px rgba(255,59,92,0)}}
.tele-view{position:relative;height:min(62vh,520px);overflow:hidden}
.tele-view:before,.tele-view:after{content:'';position:absolute;left:0;right:0;height:28%;z-index:2;pointer-events:none}
.tele-view:before{top:0;background:linear-gradient(#0E0C17,rgba(14,12,23,0))}.tele-view:after{bottom:0;background:linear-gradient(rgba(14,12,23,0),#0E0C17)}
.tele-line{position:absolute;left:8%;right:8%;top:42%;height:58px;margin-top:-6px;border-radius:14px;background:rgba(144,71,255,.16);border:1px solid rgba(144,71,255,.35);z-index:1}
.tele-text{position:absolute;left:0;right:0;top:0;padding:0 12%;text-align:center;font-size:30px;line-height:1.6;font-weight:600;will-change:transform;transform:translateY(42%)}
.tele-text h4{font-size:22px;margin:0 0 18px;color:#C9B4FF}
.tele-text span{transition:color .2s}.tele-text span.said{color:#7CF2A4}
.tele-count{position:absolute;inset:0;display:grid;place-items:center;font-size:110px;font-weight:900;color:#fff;z-index:3;pointer-events:none;text-shadow:0 10px 30px rgba(144,71,255,.6)}
.tele-count.cnt{animation:pop .5s}
.tele-bar{height:5px;background:rgba(255,255,255,.08)}.tele-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#FF5E7E,#9047FF)}
.srres{font-size:17px;line-height:1.8}.srres .g{color:#1E8A4F;font-weight:700}.srres .m{color:#A9A4BC}
.srsteps{text-align:left;max-width:470px;margin:14px auto 4px;display:flex;flex-direction:column;gap:10px}.srsteps div{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.5}.srsteps b{flex:none;width:26px;height:26px;border-radius:50%;background:#F3EBFF;color:#9047FF;display:grid;place-items:center;font-size:13px}
.srspd{flex-wrap:wrap}.srspd button{min-width:62px;justify-content:center}
.srlisten{margin-top:14px;display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.srlist{width:100%;max-height:190px;overflow:auto;background:#fff;border:1.5px solid #ECE6FA;border-radius:16px;padding:12px 16px;line-height:1.95;font-weight:700;font-size:16px;color:#A29CB8;text-align:left;position:relative}
.srlist span{transition:color .15s,background .15s;border-radius:6px;padding:1px 2px}
.srlist span.done{color:#1B1530}.srlist span.on{background:#9047FF;color:#fff;padding:1px 5px}
.toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:var(--ink);color:#fff;padding:12px 18px;border-radius:14px;font-weight:700;z-index:90;animation:pop .2s}
@keyframes pop{0%{transform:scale(.7);opacity:0}70%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
@media (max-width:860px){.srtexts{grid-template-columns:1fr}.tele-text{font-size:22px;padding:0 6%}.srstart{padding:20px 16px}.chero img.m{display:none}}
/* ---------- своё: итог считается, монеты, телефон ---------- */
.srwait{display:inline-flex;align-items:center;gap:8px;color:#6B6878;font-weight:700}
.srwait .ms{animation:srspin 1.4s linear infinite}
@keyframes srspin{to{transform:rotate(360deg)}}
.srsave{margin-top:10px;font-weight:700;font-size:14px;opacity:.95;display:flex;align-items:center;gap:6px;min-height:22px}
.srsave img{width:20px;height:20px}
.srcoin{display:inline-flex;align-items:center;gap:4px;vertical-align:middle}.srcoin img{width:16px;height:16px}
.srtries audio{height:36px;max-width:260px}
@media (prefers-reduced-motion:reduce){.recdot,.srwait .ms,.tele-count.cnt,.toast{animation:none}}
@media (max-width:560px){.srava{width:120px;height:120px}.srava img{height:106px;margin-top:18px}.srstart h2{font-size:21px}.tele-text{font-size:20px}.tele-count{font-size:80px}.card{padding:16px}.lrow{flex-wrap:wrap}.srtries audio{max-width:100%;width:100%}}
`
