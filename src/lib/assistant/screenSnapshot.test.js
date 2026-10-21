// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { pressableLabel, snapshotScreen, snapshotWithRefs } from './screenSnapshot.js'

const mount = (html) => {
  document.body.innerHTML = `<div id="root">${html}</div>`
  return document.getElementById('root')
}

describe('снимок экрана', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  // Ровно тот случай, ради которого снимок затевался: помощник должен увидеть
  // и задание, и что ученик ввёл, и что написал экран в ответ.
  it('видит задание, ответ ученика и разбор после проверки', () => {
    const root = mount(`
      <h2>Turn the statement into a question:</h2>
      <p>Clare is reading.</p>
      <input class="lw-gap-input is-wrong" aria-label="Ваш ответ" />
      <div class="kl-fb no"><b>Неверный ответ</b>
        <span>Правильный ответ: is clare reading. Put is first.</span></div>
      <button>Продолжить</button>`)
    root.querySelector('input').value = 'Is Cleare reading?'

    const snap = snapshotScreen(root)
    expect(snap).toContain('Turn the statement into a question:')
    expect(snap).toContain('Clare is reading.')
    expect(snap).toContain('[поле Ваш ответ: ученик ввёл «Is Cleare reading?» (отмечено как неверное)]')
    expect(snap).toContain('Правильный ответ: is clare reading.')
    expect(snap).toContain('[кнопка «Продолжить»]')
  })

  it('не выдаёт пароли, email и телефон — только что поле есть', () => {
    const root = mount(`
      <input type="password" value="secret123" />
      <input type="email" value="a@b.kz" />
      <input type="tel" value="+77010000000" />
      <input type="hidden" value="token" />`)
    const snap = snapshotScreen(root)
    expect(snap).not.toMatch(/secret123|a@b\.kz|77010000000|token/)
    expect(snap.match(/\[поле ввода\]/g)).toHaveLength(3)
  })

  it('пропускает скрытое и помеченное data-assistant-ignore', () => {
    const root = mount(`
      <p>видно</p>
      <p hidden>hidden-attr</p>
      <p style="display:none">inline-none</p>
      <p aria-hidden="true">aria</p>
      <div data-assistant-ignore><p>сам помощник</p></div>
      <script>var x = 1</script>`)
    const snap = snapshotScreen(root)
    expect(snap).toBe('видно')
  })

  it('разбивает блоки на строки и схлопывает пробелы', () => {
    const root = mount('<h1>  Заголовок  </h1><p>первая   строка</p><span>и</span> <span>хвост</span>')
    expect(snapshotScreen(root)).toBe('Заголовок\nпервая строка\nи хвост')
  })

  it('обрезает длинный снимок с пометкой', () => {
    const root = mount(`<p>${'a'.repeat(100)}</p>`)
    const snap = snapshotScreen(root, { maxChars: 20 })
    expect(snap).toBe(`${'a'.repeat(20)}\n…[снимок обрезан]`)
  })

  it('показывает пустое поле, выбор и отметки', () => {
    const root = mount(`
      <input placeholder="Введите ответ" />
      <select><option>A</option><option selected>B</option></select>
      <input type="checkbox" checked />
      <button disabled>Проверить</button>`)
    const snap = snapshotScreen(root)
    expect(snap).toContain('[пустое поле Введите ответ]')
    expect(snap).toContain('[выбор: «B»]')
    expect(snap).toContain('[отмечено]')
    expect(snap).toContain('[кнопка «Проверить» неактивна]')
  })

  // Курс (A0 «I ___ rain.»): варианты — кнопки с is-wrong / is-right, а не <input>.
  // Без пометки на кнопке помощник путал выбор ученика с текстом «why» в плашке.
  it('видит выбранный вариант-кнопку после проверки', () => {
    const root = mount(`
      <h2>Выберите правильное слово.</h2>
      <p>I ___ rain.</p>
      <button class="cp-choice" disabled>favourite</button>
      <button class="cp-choice is-wrong" disabled>like</button>
      <button class="cp-choice" disabled>don't like</button>
      <div class="cp-fb is-no"><b>Неверный ответ</b>
        <span>Rain в этом уроке — пример для don't like (не нравится).</span></div>`)
    const snap = snapshotScreen(root)
    expect(snap).toContain('[кнопка «like» неактивна (отмечено как неверное)]')
    expect(snap).toContain('[кнопка «favourite» неактивна]')
    expect(snap).toContain('[кнопка «don\'t like» неактивна]')
    expect(snap).not.toMatch(/кнопка «don't like»[^\n]*отмечено как неверное/)
    expect(snap).toContain('пример для don\'t like')
  })

  it('помечает верную кнопку is-right и пропущенный is-missed', () => {
    const root = mount(`
      <button class="cp-choice is-right" disabled>I like music.</button>
      <button class="cp-choice is-missed" disabled>People spend nothing for a day.</button>`)
    const snap = snapshotScreen(root)
    expect(snap).toContain('[кнопка «I like music.» неактивна (отмечено как верное)]')
    expect(snap).toContain('[кнопка «People spend nothing for a day.» неактивна (верный вариант, не выбран)]')
  })

  // Шаг «впиши пропуск» (A0: «I don't ___.», слова в банке): после неверного ответа плеер подставляет в поле ВЕРНЫЙ
  // ответ, а выбранное ученицей слово остаётся в data-assistant-entered. Без него снимок говорил «ученик ввёл
  // «understand» (отмечено как неверное)» про верное слово, и помощник переворачивал ответ, как раньше с like / don't like.
  it('поле с подставленным верным ответом: ученик ввёл своё, эталон — отдельно', () => {
    const root = mount(`
      <p>I don't ___ .</p>
      <input class="cp-field cp-gap__in is-wrong" aria-label="Введите ответ" disabled data-assistant-entered="answer" />`)
    root.querySelector('input').value = 'understand'
    const snap = snapshotScreen(root)
    expect(snap).toContain('[поле Введите ответ: ученик ввёл «answer» (отмечено как неверное); в поле сайт показал верный ответ «understand»]')
    expect(snap).not.toContain('ученик ввёл «understand»')
  })

  it('ученик поле не заполнил, а сайт поставил туда ключ — не «пустое поле»', () => {
    const root = mount('<input class="wb-tin is-rev" aria-label="seven" data-assistant-entered="" />')
    root.querySelector('input').value = '7'
    expect(snapshotScreen(root)).toBe('[поле seven: ученик ничего не ввёл; в поле сайт показал верный ответ «7»]')
  })

  it('ввод совпадает с тем, что показано в поле, — пояснения про подстановку нет', () => {
    const root = mount('<input class="is-wrong" aria-label="Ваш ответ" data-assistant-entered="Is Cleare reading?" />')
    root.querySelector('input').value = 'Is Cleare reading?'
    const snap = snapshotScreen(root)
    expect(snap).toBe('[поле Ваш ответ: ученик ввёл «Is Cleare reading?» (отмечено как неверное)]')
  })

  // Практика красит вердикт своими классами: воркбук и «Письмо» — is-no / is-ok / is-rev, «Грамматика» — wrong /
  // correct / picked-no, «Аудирование» — data-state. Без них помощник не видел, какой вариант ученик выбрал неверно.
  it('понимает вердикты разделов Практики', () => {
    const root = mount(`
      <button class="wb-opt is-no">went</button>
      <button class="wb-opt is-ok">goes</button>
      <button class="wb-opt is-rev">gone</button>
      <button class="lc-photo is-revealed">a dog</button>
      <button class="gr-opt wrong">am</button>
      <button class="gr-opt correct">is</button>
      <button class="gr-fchip picked-no">True</button>
      <button class="gr-opt sel">are</button>
      <input class="lt-input" data-state="no" aria-label="Ответ" />
      <select class="wb-dsel is-rev"><option>right</option></select>
      <button class="wb-opt is-normal">ok-not-verdict</button>`)
    root.querySelector('input').value = 'fourty'
    const snap = snapshotScreen(root)
    expect(snap).toContain('[кнопка «went» (отмечено как неверное)]')
    expect(snap).toContain('[кнопка «goes» (отмечено как верное)]')
    expect(snap).toContain('[кнопка «gone» (верный ответ показал сайт)]')
    expect(snap).toContain('[кнопка «a dog» (верный ответ показал сайт)]')
    expect(snap).toContain('[кнопка «am» (отмечено как неверное)]')
    expect(snap).toContain('[кнопка «is» (отмечено как верное)]')
    expect(snap).toContain('[кнопка «True» (отмечено как неверное)]')
    expect(snap).toContain('[кнопка «are» (выбрано)]')
    expect(snap).toContain('[поле Ответ: ученик ввёл «fourty» (отмечено как неверное)]')
    expect(snap).toContain('[выбор: «right» (верный ответ показал сайт)]')
    expect(snap).toContain('[кнопка «ok-not-verdict»]')
  })

  // «Слушай и выбирай»: галочка верного ответа спрятана в плитке заранее — textContent читал «1✓» до ответа.
  it('подпись кнопки — только из видимого, картинка — по alt', () => {
    const root = mount(`
      <button class="lc-photo"><img alt="A cyclist in a red helmet" /><span>1</span><i hidden>✓</i><i aria-hidden="true">✓</i></button>
      <button aria-label="Закрыть"><svg></svg></button>`)
    const snap = snapshotScreen(root)
    expect(snap).toContain('[кнопка «[картинка: A cyclist in a red helmet] 1»]')
    expect(snap).not.toContain('✓')
    expect(snap).toContain('[кнопка «Закрыть»]')
  })

  // «Чтение» до проверки отмечает выбор только aria-checked на role="radio".
  it('выбор через aria-checked / aria-pressed / aria-selected и роли-кнопки', () => {
    const root = mount(`
      <div role="radiogroup">
        <div role="radio" aria-checked="true">True</div>
        <div role="radio" aria-checked="false">False</div>
      </div>
      <button aria-pressed="true">RU</button>
      <div role="tab" aria-selected="true">Сегодня</div>
      <div role="option" aria-disabled="true">Нельзя</div>`)
    const snap = snapshotScreen(root)
    expect(snap).toContain('[кнопка «True» (выбрано)]')
    expect(snap).toContain('[кнопка «False»]')
    expect(snap).toContain('[кнопка «RU» (выбрано)]')
    expect(snap).toContain('[кнопка «Сегодня» (выбрано)]')
    expect(snap).toContain('[кнопка «Нельзя» неактивна]')
  })

  it('слово из банка, выбранное в пропуск, помечено «выбрано»', () => {
    const root = mount(`
      <button class="cp-chip" disabled>understand</button>
      <button class="cp-chip is-set" disabled>answer</button>`)
    const snap = snapshotScreen(root)
    expect(snap).toContain('[кнопка «answer» неактивна (выбрано)]')
    expect(snap).toContain('[кнопка «understand» неактивна]')
  })

  // В реальной разметке между «Неверный ответ» и разбором нет пробела, а разбор — span с display:block (course.css):
  // снимок склеивал их в «Неверный ответRain в этом уроке…».
  it('блок по стилю даёт перевод строки: плашка не склеивается с разбором', () => {
    const root = mount('<div class="cp-fb"><b>Неверный ответ<span style="display:block">Rain в этом уроке — пример для don\'t like.</span></b></div>')
    expect(snapshotScreen(root)).toBe('Неверный ответ\nRain в этом уроке — пример для don\'t like.')
  })

  it('строчные элементы по-прежнему не рвут фразу', () => {
    const root = mount('<p>I <span style="display:inline-block">like</span> <b>coffee</b>.</p>')
    expect(snapshotScreen(root)).toBe('I like coffee.')
  })

  // У 56% оцениваемых шагов курса разбора (why) нет, а верный вариант после ошибки на экране не раскрывается — помощник
  // угадывал его и на видео назвал верным «like» для «I ___ rain.» (ключ — «don't like»). Плеер кладёт эталон на плашку.
  it('эталон задания с плашки идёт отдельной строкой', () => {
    const root = mount('<div class="cp-fb" data-assistant-expected="don\'t like"><b>Неверный ответ</b></div><button>Продолжить</button>')
    expect(snapshotScreen(root)).toBe('Неверный ответ\n[верный ответ по заданию: «don\'t like»]\n[кнопка «Продолжить»]')
  })

  it('длинный эталон подрезается, пустой не выводится', () => {
    const long = mount(`<div data-assistant-expected="${'слово '.repeat(200)}">x</div>`)
    const snap = snapshotScreen(long)
    expect(snap).toContain('[верный ответ по заданию: «слово слово')
    expect(snap).toContain('…»]')
    expect(snap.length).toBeLessThan(900)
    expect(snapshotScreen(mount('<div data-assistant-expected="  ">Неверный ответ</div>'))).toBe('Неверный ответ')
  })

  it('без корня — пустая строка', () => {
    expect(snapshotScreen(null)).toBe('')
  })
})

// Слепые зоны обёртки экрана: Shadow DOM движков-прототипов (SpeakSpin, «Числа») и окна, уведённые порталом в body
// (плеер караоке, карточка перевода, выбор цели). Без этого помощник на SpeakSpin видел только кнопку «← К практике».
describe('снимок за пределами обёртки экрана', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('читает открытый Shadow DOM, стили тени пропускает', () => {
    const root = mount('<button>← К практике</button><div class="spsp-host"></div>')
    const shadow = root.querySelector('.spsp-host').attachShadow({ mode: 'open' })
    shadow.innerHTML = '<style>.hero{color:red}</style><main><h1>Speak for a minute</h1><p>Topic: My best friend</p><button>Spin</button></main>'
    expect(snapshotScreen(root)).toBe('[кнопка «← К практике»]\nSpeak for a minute\nTopic: My best friend\n[кнопка «Spin»]')
  })

  it('внутри тени видит поля и эталон', () => {
    const root = mount('<div class="host"></div>')
    const shadow = root.querySelector('.host').attachShadow({ mode: 'open' })
    shadow.innerHTML = '<p>three hundred</p><div data-assistant-expected="300"><b>Wrong</b></div>'
    expect(snapshotScreen(root)).toBe('three hundred\nWrong\n[верный ответ по заданию: «300»]')
  })

  it('окно-портал в body читается первым, экран — под ним', () => {
    const root = mount('<h1>Караоке</h1><button>Imagine</button>')
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div class="kk-play" data-assistant-overlay="плеер караоке"><p>Imagine there\'s no heaven</p><button>Пауза</button></div>',
    )
    expect(snapshotScreen(root)).toBe(
      '[поверх экрана открыто: плеер караоке]\nImagine there\'s no heaven\n[кнопка «Пауза»]\n[экран под окном]\nКараоке\n[кнопка «Imagine»]',
    )
  })

  it('непомеченный узел в body, скрытое окно и окно помощника не читаются', () => {
    const root = mount('<p>экран</p>')
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div class="toast">чужое</div>
       <div data-assistant-overlay="карточка" hidden><p>скрыто</p></div>
       <div data-assistant-ignore><div data-assistant-overlay="помощник"><p>сам помощник</p></div></div>`,
    )
    expect(snapshotScreen(root)).toBe('экран')
  })

  it('окно без имени и вложенное окно читаются один раз', () => {
    const root = mount('<p>экран</p>')
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div data-assistant-overlay><p>внешнее</p><div data-assistant-overlay="внутри"><p>вложенное</p></div></div>',
    )
    const snap = snapshotScreen(root)
    expect(snap).toBe('[поверх экрана открыто окно]\nвнешнее\nвложенное\n[экран под окном]\nэкран')
  })

  it('полоса прогресса — подписью и процентом из aria', () => {
    const root = mount('<p>Глава 1</p>')
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div data-assistant-overlay="полоса чтения книги" role="progressbar" aria-label="Прочитано" aria-valuemin="0" aria-valuemax="100" aria-valuenow="42"><span><span></span></span></div>',
    )
    expect(snapshotScreen(root)).toBe('[поверх экрана открыто: полоса чтения книги]\n[индикатор «Прочитано»: 42%]\n[экран под окном]\nГлава 1')
    expect(snapshotScreen(mount('<div role="progressbar"></div><p>x</p>'))).toBe('x')
  })

  // «Числа»: сообщение гаснет прозрачностью, а текст прошлого прыжка остаётся в разметке.
  it('прозрачное не читается, кроме самого корня и полей', () => {
    const root = mount(`
      <div class="msg" style="opacity:0">That island is 30.</div>
      <label><input type="checkbox" checked style="opacity:0" /> Slow</label>
      <p>Listen and jump</p>`)
    expect(snapshotScreen(root)).toBe('[отмечено] Slow\nListen and jump')
    root.style.opacity = '0'
    expect(snapshotScreen(root)).toBe('[отмечено] Slow\nListen and jump')
  })

  it('окно внутри корня читается на своём месте, без шапки', () => {
    const root = mount('<p>до</p><div data-assistant-overlay="карточка"><p>перевод</p></div><p>после</p>')
    expect(snapshotScreen(root)).toBe('до\nперевод\nпосле')
  })

  it('обрезка длинного экрана не съедает окно', () => {
    const root = mount(`<p>${'a'.repeat(200)}</p>`)
    document.body.insertAdjacentHTML('beforeend', '<div data-assistant-overlay="перевод"><p>apple — яблоко</p></div>')
    const snap = snapshotScreen(root, { maxChars: 80 })
    expect(snap.startsWith('[поверх экрана открыто: перевод]\napple — яблоко')).toBe(true)
    expect(snap.endsWith('…[снимок обрезан]')).toBe(true)
  })
})

describe('snapshotWithRefs — номера кнопок', () => {
  it('нумерует нажимаемые кнопки, неактивные и опасные — без номера', () => {
    document.body.innerHTML = `<div class="scr-in">
      <button>Послушать</button>
      <button disabled>Проверить</button>
      <div role="radio" aria-checked="false">like</div>
      <button>Выйти</button>
      <button>Далее</button>
    </div>`
    const { text, refs } = snapshotWithRefs(document.querySelector('.scr-in'))
    expect(text).toContain('[кнопка #1 «Послушать»]')
    expect(text).toContain('[кнопка «Проверить» неактивна]')
    expect(text).toContain('[кнопка #2 «like»]')
    expect(text).toContain('[кнопка «Выйти»]')
    expect(text).toContain('[кнопка #3 «Далее»]')
    expect([...refs.keys()]).toEqual([1, 2, 3])
    expect(refs.get(3).el.textContent).toBe('Далее')
    expect(refs.get(3).label).toBe('Далее')
  })
  it('нумерация сквозная: окно-портал первым, потом экран', () => {
    document.body.innerHTML = `<div class="scr-in"><button>Под окном</button></div>
      <div data-assistant-overlay="карточка"><button>В окне</button></div>`
    const { text, refs } = snapshotWithRefs(document.querySelector('.scr-in'))
    expect(text.indexOf('#1 «В окне»')).toBeGreaterThan(-1)
    expect(text.indexOf('#1 «В окне»')).toBeLessThan(text.indexOf('#2 «Под окном»'))
    expect(refs.size).toBe(2)
  })
  it('snapshotScreen — прежний текст, без номеров', () => {
    document.body.innerHTML = '<div class="scr-in"><button>Далее</button></div>'
    expect(snapshotScreen(document.querySelector('.scr-in'))).toBe('[кнопка «Далее»]')
  })
  it('pressableLabel — видимая подпись, иначе aria-label', () => {
    document.body.innerHTML = '<button id="a">Да<span hidden>✓</span>лее</button><button id="b" aria-label="Закрыть"></button>'
    expect(pressableLabel(document.getElementById('a'))).toBe('Далее')
    expect(pressableLabel(document.getElementById('b'))).toBe('Закрыть')
  })
})
