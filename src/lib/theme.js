// Ключ и загрузочный скрипт темы — отдельно от ThemeToggle: layout.jsx
// серверный, а импорт из 'use client'-модуля отдал бы ему не строку, а
// клиентскую ссылку.
export const THEME_KEY = 'jts_theme'

// Выполняется в <head> до гидратации: атрибут должен стоять до первой
// отрисовки, иначе тёмная тема каждый раз мигает белым. ?theme=dark в адресе
// запоминается — удобно раздать ссылку.
export const THEME_BOOT = `(function(){try{
var t=new URLSearchParams(location.search).get('theme'),s=localStorage;
if(t)s.setItem('${THEME_KEY}',t);
if(s.getItem('${THEME_KEY}')==='dark')document.documentElement.setAttribute('data-theme','dark');
}catch(e){}})()`
