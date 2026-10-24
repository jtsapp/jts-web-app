// Слова и строки «Грамматики · игр» — функции прототипа. Сверяются с оракулом
// (text.test.js): поиск перевода с отбрасыванием окончаний и разбор строки на
// кликабельные слова — то, что ученик видит на каждом экране.

export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Починка прототипа: он экранировал строку ДО разбора на слова, и кавычка, ставшая «&quot;», уходила в слово —
// на экране «&quot;Are you tired?» (16 строк правила в L4-24 и L5-21, косвенная речь). Теперь строка режется
// сырой, а экранируется каждый кусок; на строках без & < > " результат байт в байт прежний (оракул).
export function wrapEN(s){return String(s).split(/(\s+|\/)/).map(tok=>{if(!/[A-Za-z]/.test(tok))return esc(tok);const om=tok.match(/^(\d+(?:st|nd|rd|th))([^A-Za-z]*)$/);if(om)return `<span class="w" data-k="${om[1].toLowerCase()}">${om[1]}</span>`+esc(om[2]);const m=tok.match(/^([^A-Za-z']*)(.*?)([^A-Za-z']*)$/);const core=m[2];const key=core.replace(/^'+|'+$/g,'').toLowerCase();return esc(m[1])+`<span class="w" data-k="${esc(key)}">${esc(core)}</span>`+esc(m[3]);}).join('');}

// look прототипа; словарь — аргументом: на сайте он приходит с бэкенда при первом клике по слову.
export function lookUp(GLOSS,k){if(GLOSS[k])return GLOSS[k];const om=k.match(/^(\d+)(st|nd|rd|th)$/);if(om)return [om[1]+'-й (порядковое числительное)',om[1]+'-ші/-шы (реттік сан есім)'];const tries=[k.replace(/'s$/,''),k.replace(/s'$/,'s'),k.replace(/ies$/,'y'),k.replace(/es$/,''),k.replace(/s$/,''),k.replace(/ied$/,'y'),k.replace(/ed$/,''),k.replace(/ed$/,'e'),k.replace(/(.)\1ed$/,'$1'),k.replace(/ing$/,''),k.replace(/ing$/,'e'),k.replace(/(.)\1ing$/,'$1'),k.replace(/er$/,''),k.replace(/est$/,''),k.replace(/ly$/,'')];for(const x of tries)if(x!==k&&GLOSS[x])return GLOSS[x];return null;}

// Набранный ответ «Впиши сам»: регистр, кавычки-апострофы, пробелы и точка в конце не важны.
export const norm=s=>String(s).toLowerCase().replace(/[’‘`]/g,"'").replace(/\s+/g,' ').replace(/[.!?,]+$/,'').trim();

export const trail=w=>{const m=w.match(/[.,!?;:]+$/);return m?m[0]:'';};

export const sentOf=(s,a)=>s.replace('___',a);
