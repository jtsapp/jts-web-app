// Прокси hosted-Speakout-страниц (тропа index.html + страницы уроков).
//
// Зачем: курс хостится на files-api.iqra.space (cross-origin), поэтому из iframe
// туда нельзя внедрить CSS, чтобы убрать нижний «бренд-футер» тропы (brandbar +
// «Just To Study · …» + кнопка «Сбросить прогресс»). Роут отдаёт те же
// страницы с нашего origin, дописав в <head>:
//   • <base href="/api/hl/{dir}/"> — относительные ссылки навигации
//     (уроки lessons/*.html, «назад» ../index.html, next-урок Lxx.html)
//     резолвятся снова на прокси, т.е. вся навигация остаётся на нашем origin
//     и футер скрыт на КАЖДОЙ странице, а не только на первой;
//   • <style>div.wrap{display:none}</style> — прячет футер. Именно скрываем,
//     а не вырезаем: кнопка #btnReset остаётся в DOM, её JS-обработчик не
//     падает. На тропе `div.wrap` бьёт только по футеру (сама тропа —
//     <main class="wrap" id="path">); у страниц урока div.wrap нет — no-op.
//
// Ассеты проксировать не нужно: аудио уроков встроено как data:base64, CSS/JS
// инлайновые, внешний только абсолютный Google-шрифт — всё грузится напрямую.

export const runtime = 'nodejs'

const UPSTREAM = 'https://files-api.iqra.space'
// Ограничиваем прокси только Speakout-курсами и только .html (SSRF-защита).
const ALLOWED_PREFIX = 'development/speakout/'

// Мост урок↔JTS-backend (внедряется только на страницах уроков).
// Урок сам считает XP/сердца локально; здесь мы:
//   • превращаем XP-пилюлю в монеты (гасим hudXpSet, показываем coins из balance);
//   • на верный ответ → начисляем монеты (/mobile/coins/grant), на неверный →
//     тратим сердце (/mobile/lives/spend), и показываем реальные значения;
//   • перекрашиваем текст фидбэка «+10 XP» → «+10 🪙».
// Токен берём из window.__JTS_TOKEN__ (кладёт родитель, iframe same-origin).
const LESSON_BRIDGE = `<script>(function(){
function ready(fn){document.readyState!=='loading'?fn():document.addEventListener('DOMContentLoaded',fn);}
ready(function(){
 var hud=document.querySelector('.hud'); if(!hud) return;
 var API=window.__JTS_API__||'https://dev-server.justtostudy.kz';
 function tok(){try{return window.__JTS_TOKEN__||(window.parent&&window.parent.__JTS_TOKEN__)||'';}catch(e){return '';}}
 function call(method,path){var t=tok(); if(!t) return Promise.resolve(null);
  return fetch(API+path,{method:method,headers:{Authorization:'Bearer '+t}}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});}
 var hudXp=document.getElementById('hudXp'), hN=document.getElementById('hN');
 // Монеты в верхнем HUD не показываем — только сердечко. XP-пилюлю прячем,
 // а её локальный апдейтер гасим (монеты всё равно начисляются в backend).
 try{window.hudXpSet=function(){};}catch(e){}
 if(hudXp)hudXp.style.display='none';
 // Сердечки — локальные для урока: сам урок ставит 3 при загрузке страницы и
 // снимает по одному за неверный ответ, поэтому при перезаходе в урок или
 // переходе на следующий они снова полные. Backend-пул сердец тут НЕ трогаем.
 var correct=0, wrong=0, streakN=0, ended=false;
 function post(m){try{window.parent.postMessage(Object.assign({jts:'lesson'},m),'*');}catch(e){}}
 var fbH=document.getElementById('fbH'), fbS=document.getElementById('fbS');
 // Бейдж монеты «+10» в футер фидбэка (виден только на верном ответе — по CSS).
 var dfoot=document.getElementById('dfoot');
 var dIn=dfoot&&dfoot.querySelector('.in'), btnMain=document.getElementById('btnMain');
 if(dIn&&btnMain){var coin=document.createElement('div');coin.className='jts-coin';
  coin.innerHTML='<img src="/assets/lesson/coin.png" alt=""><span>+10</span>';dIn.insertBefore(coin,btnMain);}
 if(dfoot){new MutationObserver(function(){
  var ok=dfoot.classList.contains('ok'), bad=dfoot.classList.contains('bad');
  if(!ok&&!bad){dfoot.__jts=0;return;}
  if(dfoot.__jts)return; dfoot.__jts=1;
  if(ok){correct++; streakN++; call('POST','/mobile/coins/grant?amount=10');
   // Текст фидбэка по дизайну: «Молодец! / Правильных ответов подряд: N».
   if(fbH)fbH.textContent='Молодец!';
   if(fbS)fbS.textContent='Правильных ответов подряд: '+streakN;
  }else{wrong++; streakN=0;
   // 3-я ошибка → сердца кончились → сразу экран «Жизней больше нет».
   if(!ended && hN && (hN.textContent||'').trim()==='0'){ended=true; post({outcome:'fail',correct:correct,wrong:wrong});}
  }
 }).observe(dfoot,{attributes:true,attributeFilter:['class']});}
 // Успех: урок дошёл до экрана завершения (#sEnd).
 var sEnd=document.getElementById('sEnd');
 if(sEnd){new MutationObserver(function(){
  if(ended || !sEnd.classList.contains('on')) return; ended=true;
  var acc=(correct+wrong)>0?Math.round(correct/(correct+wrong)*100):100, next='';
  try{var as=sEnd.querySelectorAll('a');for(var i=0;i<as.length;i++){if((as[i].href||'').indexOf('/lessons/')>=0){next=as[i].href;break;}}}catch(e){}
  post({outcome:'success',correct:correct,wrong:wrong,accuracy:acc,nextUrl:next});
 }).observe(sEnd,{attributes:true,attributeFilter:['class']});}
});
})();</script>`

export async function GET(request, { params }) {
  const { path } = await params
  const rel = (Array.isArray(path) ? path : []).join('/')

  if (
    !rel.startsWith(ALLOWED_PREFIX) ||
    !rel.endsWith('.html') ||
    rel.includes('..')
  ) {
    return new Response('forbidden', { status: 403 })
  }

  const upstreamUrl = `${UPSTREAM}/${rel}`
  let html
  try {
    const res = await fetch(upstreamUrl, { headers: { Accept: 'text/html' } })
    if (!res.ok) return new Response(`upstream ${res.status}`, { status: 502 })
    html = await res.text()
  } catch {
    return new Response('upstream fetch failed', { status: 502 })
  }

  // База = директория текущей страницы В ПРОСТРАНСТВЕ ПРОКСИ, чтобы вся
  // относительная навигация оставалась на /api/hl/… (и футер был скрыт везде).
  const dir = rel.slice(0, rel.lastIndexOf('/') + 1)
  // На страницах уроков подключаем мост: XP-пилюлю превращаем в монеты и
  // связываем сердца/монеты урока с backend (родитель кладёт токен в
  // window.__JTS_TOKEN__ уже same-origin iframe).
  const bridge = rel.includes('/lessons/') ? LESSON_BRIDGE : ''

  const inject =
    `<base href="/api/hl/${dir}">` +
    // Прячем нижний бренд-футер тропы; прогресс-бар урока делаем сплошным
    // фиолетовым (#9047ff) вместо градиента violet→blue.
    `<style>div.wrap{display:none!important}` +
    `.pbar i{background:#9047ff!important}.pbar i:before{display:none!important}` +
    // Встроенный экран завершения урока прячем — его заменяет нативный оверлей
    // JTS (детекция по классу .on всё равно работает при display:none).
    `#sEnd{display:none!important}` +
    // Верный ответ: кнопка «Продолжить» фиолетовая (а не зелёная) + бейдж монеты.
    `.dfoot.ok #btnMain{background:#9047ff!important;box-shadow:0 4px 0 #6a2ee0!important;color:#fff!important}` +
    `.jts-coin{display:none;align-items:center;gap:5px;background:#fff;border-radius:12px;` +
    `padding:5px 11px 5px 7px;font-weight:900;font-size:15px;color:#1a1730;box-shadow:0 2px 8px rgba(23,19,38,.1);flex:none}` +
    `.jts-coin img{width:22px;height:22px;display:block}` +
    `.dfoot.ok .jts-coin{display:inline-flex}</style>` +
    bridge

  html = /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (m) => m + inject)
    : inject + html

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
