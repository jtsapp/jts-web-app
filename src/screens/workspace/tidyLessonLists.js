// Списки в html курса приходят с двумя дефектами вёрстки, которые видит ученик.
//
// Первый: пункты несут значок маркера прямо в тексте — «• About 20–30 minutes».
// Браузер рисует свой маркер, и в строке их оказывается два подряд.
//
// Второй: подпись блока продублирована первым пунктом — над списком стоит
// «How to study this lesson», и ровно то же самое написано в первом <li>.
// Читается как сбой, а не как заголовок.
//
// Чиним на отрисовке, а не в контенте: html лежит в 645 уроках каталога, правка
// источника — отдельная задача редакции, а выглядеть правильно урок должен уже
// сейчас. Обе проверки узкие: снимаем ровно повторяющийся текст и ровно ведущий
// значок, всё остальное оставляем как есть.

const BULLET = /^\s*[•·‣▪◦*]\s+/

function norm(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function tidyLessonLists(html) {
  if (!html || typeof DOMParser === 'undefined') return html
  if (!/<li/i.test(html)) return html

  const doc = new DOMParser().parseFromString(`<div id="jts-lists">${html}</div>`, 'text/html')
  const root = doc.getElementById('jts-lists') || doc.body
  let touched = false

  root.querySelectorAll('ul, ol').forEach((list) => {
    const items = [...list.children].filter((el) => el.tagName === 'LI')
    if (!items.length) return

    // Подпись ищем прямо перед списком: у курса это `.blab` в «пузыре», но
    // опираемся на положение, а не на класс — соседняя вёрстка зовёт её иначе.
    const lead = list.previousElementSibling
    const leadText = lead && !lead.querySelector?.('ul, ol') ? norm(lead.textContent) : ''
    if (leadText && norm(items[0].textContent) === leadText) {
      items.shift().remove()
      touched = true
    }

    items.forEach((li) => {
      // Первый текстовый узел, а не весь innerHTML: значок стоит до вложенных
      // тегов, и переписывать разметку целиком ради него незачем.
      const node = [...li.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim())
      if (node && BULLET.test(node.textContent)) {
        node.textContent = node.textContent.replace(BULLET, '')
        touched = true
      }
    })
  })

  return touched ? root.innerHTML : html
}
