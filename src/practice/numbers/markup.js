// Разметка игры «Числа» для Shadow DOM — шапка прототипа и место под экраны (#view).
// Экраны рисует engine.js.

export const NUMBERS_MARKUP = `<header class="topbar">
  <div class="topbar-in">
    <div class="logo"><img src="/practice/numbers/img/dex.webp" alt=""><span>Dexter's Number World</span></div>
    <div class="spacer"></div>
    <div class="stat" id="hdrProg" title="Levels completed">0 / 17 levels</div>
  </div>
</header>
<div id="view"></div>`
