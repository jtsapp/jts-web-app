import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readDecl, readCourse } from './read-course.js'

function tmpCourse(body) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jts-')), 'course.html')
  fs.writeFileSync(file, body)
  return file
}

describe('readDecl', () => {
  it('вырезает объект целиком, не спотыкаясь о скобки в строках', () => {
    const src = 'const A={a:"}{",b:{c:1}};\nconst B=[1];'
    expect(readDecl(src, 'A')).toBe('{a:"}{",b:{c:1}}')
  })

  it('понимает шаблонные строки — в них живёт html урока', () => {
    const src = 'const A={h:`<b>}</b>`};'
    expect(readDecl(src, 'A')).toBe('{h:`<b>}</b>`}')
  })

  it('возвращает null для отсутствующего объявления', () => {
    expect(readDecl('const A=1;', 'B')).toBeNull()
  })

  // Новая выгрузка Pre-Intermediate: внутри шаблона урока есть вложенный
  // шаблон и регулярка с апострофом. Прежний сканер обрывал на них литерал, и
  // весь курс не читался — «Unexpected token ';'» на eval.
  it('переживает вложенный шаблон внутри подстановки', () => {
    const src = 'const A={h:`<b>${x?`<i>y</i>`:""}</b>`,z:1};\nconst B=[1];'
    expect(readDecl(src, 'A')).toBe('{h:`<b>${x?`<i>y</i>`:""}</b>`,z:1}')
  })

  it('не принимает апостроф внутри регулярки за начало строки', () => {
    const src = 'const A={h:`${w.replace(/\'/g,"x")}`,z:2};'
    expect(readDecl(src, 'A')).toBe('{h:`${w.replace(/\'/g,"x")}`,z:2}')
  })

  it('пропускает комментарии со скобками и кавычками', () => {
    expect(readDecl("const A={\n // don't } touch\n z:3};", 'A')).toBe("{\n // don't } touch\n z:3}")
    expect(readDecl('const A={/* } */ z:4};', 'A')).toBe('{/* } */ z:4}')
  })

  it('не путает деление с регуляркой', () => {
    expect(readDecl('const A={z: 10/2, y:1};', 'A')).toBe('{z: 10/2, y:1}')
  })
})

describe('readLevel через readCourse', () => {
  it('достаёт уровень из <title>, закодированного HTML-сущностями (как в скачанном файле курса)', () => {
    const file = tmpCourse(`
      <title>just to study &mdash; A0 &middot; Course</title>
      <script>
      const LESSONS={1:{unit:1,no:1,title:"One",blurb:"",tracks:{},html:"<b>x</b>"}};
      </script>`)
    expect(readCourse(file).label).toBe('A0')
  })

  it('достаёт уровень из <title>, уже раскодированного юникодным тире (как в опубликованном бандле)', () => {
    const file = tmpCourse(`
      <title>just to study — A1 · Course</title>
      <script>
      const LESSONS={1:{unit:1,no:1,title:"One",blurb:"",tracks:{},html:"<b>x</b>"}};
      </script>`)
    expect(readCourse(file).label).toBe('A1')
  })
})

describe('readCourse', () => {
  // Новые выгрузки пишут ступень словами, и код уровня стоит не сразу за тире.
  it('находит уровень, когда в заголовке есть название ступени', () => {
    const file = tmpCourse(`
      <title>just to study &mdash; Pre-Intermediate A2 &middot; Course</title>
      <script>
      const LESSONS={1:{unit:1,no:1,title:"One",blurb:"",tracks:{},html:"<b>x</b>"}};
      </script>`)
    expect(readCourse(file).level).toBe('a2')
  })

  // «B1+» — маркетинговое название ступени; уровни приложения a0…c1.
  it('срезает плюс у ступени вида B1+', () => {
    const file = tmpCourse(`
      <title>just to study &mdash; Intermediate B1+ &middot; Course</title>
      <script>
      const LESSONS={1:{unit:1,no:1,title:"One",blurb:"",tracks:{},html:"<b>x</b>"}};
      </script>`)
    expect(readCourse(file).level).toBe('b1')
  })

  // Находка ревью: ошибка про уровень была единственной в модуле без пути к
  // файлу, а экстрактор запускают сразу по нескольким --src.
  it('бросает ошибку с именем файла, если уровень в <title> не найден', () => {
    const file = tmpCourse(`
      <title>just to study course</title>
      <script>
      const LESSONS={1:{unit:1,no:1,title:"One",blurb:"",tracks:{},html:"<b>x</b>"}};
      </script>`)
    expect(() => readCourse(file)).toThrow(/уровень/)
    expect(() => readCourse(file)).toThrow(file)
  })

  // Находка ревью: экстрактор помечал юнит-тест как выложенный прямо на
  // объекте из read-course. Курс отдаётся только для чтения — пометки прохода
  // живут в вызывающем модуле.
  it('отдаёт уроки и юнит-тесты только для чтения', () => {
    const file = tmpCourse(`
      <title>just to study — A0 · Course</title>
      <script>
      const LESSONS={1:{unit:1,no:1,title:"One",blurb:"",tracks:{},html:"<b>x</b>"}};
      const REVIEWS={1:{unit:1,title:"Unit Test",html:"<b>t</b>"}};
      </script>`)
    const course = readCourse(file)
    expect(Object.isFrozen(course.lessons[0])).toBe(true)
    expect(Object.isFrozen(course.reviews[0])).toBe(true)
  })

  it('бросает явную ошибку с именем файла, если в курсе нет объявления LESSONS', () => {
    const file = tmpCourse(`
      <title>just to study — A0 · Course</title>
      <script>
      const UNITS=[];
      </script>`)
    expect(() => readCourse(file)).toThrow(/LESSONS/)
    expect(() => readCourse(file)).toThrow(file)
  })

  it('не падает, если UNITS и REVIEWS отсутствуют — это законный курс без юнит-тестов', () => {
    const file = tmpCourse(`
      <title>just to study — A0 · Course</title>
      <script>
      const LESSONS={1:{unit:1,no:1,title:"One",blurb:"",tracks:{},html:"<b>x</b>"}};
      </script>`)
    const course = readCourse(file)
    expect(course.units).toEqual([])
    expect(course.reviews).toEqual([])
    expect(course.lessons).toHaveLength(1)
  })

  it('оборачивает ошибку eval битого литерала — в сообщении есть имя объявления и путь файла', () => {
    const file = tmpCourse(`
      <title>just to study — A0 · Course</title>
      <script>
      const LESSONS={1:{unit:1,title:"One" blurb:"сломано, нет запятой"}};
      </script>`)
    expect(() => readCourse(file)).toThrow(/LESSONS/)
    expect(() => readCourse(file)).toThrow(file)
  })

  it('собирает уровень, юниты, уроки и юнит-тесты', () => {
    const file = tmpCourse(`
      <title>just to study — A0 · Course</title>
      <script>
      const UNITS=[["Lessons 1–3",["One","Two"]],["Lessons 4–6",["Three"]]];
      const LESSONS={
      1:{"unit":1,"no":1,"title":"One","blurb":"B1","tracks":{"t1":"a0_1.mp3"},"html":"<section class=\\"stage\\"></section>"},
      2:{"unit":2,"no":2,"title":"Three","blurb":"B2","tracks":{},"html":"<b>x</b>"}
      };
      const REVIEWS={1:{unit:1,items:21,pass:15,title:"Unit Test · Unit 1",html:\`<i>t</i>\`}};
      </script>`)
    const course = readCourse(file)

    expect(course.level).toBe('a0')
    expect(course.label).toBe('A0')
    expect(course.units).toEqual([{ no: 1, name: 'Lessons 1–3' }, { no: 2, name: 'Lessons 4–6' }])
    expect(course.lessons).toHaveLength(2)
    expect(course.lessons[0]).toMatchObject({ no: 1, unit: 1, title: 'One', tracks: { t1: 'a0_1.mp3' } })
    expect(course.reviews).toEqual([{ no: 1, unit: 1, title: 'Unit Test · Unit 1', html: '<i>t</i>' }])
  })

  it('берёт словарь режима self и карту картинок', () => {
    const file = tmpCourse(`
      <title>just to study — A0 · Course</title>
      <script>
      const UNITS=[["U",["One"]]];
      const LESSONS={1:{"unit":1,"no":1,"title":"One","blurb":"","tracks":{},
        "VOCAB":{"self":[["like","","нравится","ұнайды","def"]],"group":[]},
        "IMG":{"like":"data:image/jpeg;base64,AAA"},"html":""}};
      const REVIEWS={};
      </script>`)
    const [lesson] = readCourse(file).lessons
    expect(lesson.vocab).toEqual([['like', '', 'нравится', 'ұнайды', 'def']])
    expect(lesson.images).toEqual({ like: 'data:image/jpeg;base64,AAA' })
  })
})
