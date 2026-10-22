# Prepositions World — web-admin: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** страница «Prepositions World» во вкладке «Практика и тесты»: загрузить html-прототип, увидеть
текущий релиз, итог загрузки (сколько медиа залито/переиспользовано/удалено), предупреждения и плашку
«движок отличается».

**Architecture:** копия страницы Just Listen It (`feature/system/listen`) над ручками бэкенда
`GET /admin/prepositions`, `POST /admin/prepositions/upload` (план backend, Task 5).

**Tech Stack:** Angular 17 standalone, Angular Material, RxJS, Karma/Jasmine (`npx ng test`, в CI не гоняется).

## Global Constraints

- Рабочее дерево: `C:/Users/nural/Desktop/web-admin-prepositions`, ветка `feat/prepositions-world` от `origin/develop`.
- Только ADMIN: маршрут с `roleGuard(['ADMIN'])` (бэкенд пускает в `/admin/prepositions` только ADMIN).
- Тексты интерфейса — по-русски; ошибки сервера (`err.error.messages[0]`) — как есть.
- Загрузка 23 МБ идёт долго: кнопка заблокирована, пока идёт запрос, и показан спиннер «Разбор …».

## Файлы

| Файл | Что |
|---|---|
| `src/app/core/services/prepositions.service.ts` | типы и два вызова |
| `src/app/feature/system/prepositions/prepositions-page.component.{ts,html,scss,spec.ts}` | страница |
| `src/app/feature/system/system.routes.ts` (изм.) | маршрут `prepositions` |
| `src/app/feature/system/practice/practice.component.ts` (изм.) | вкладка и счётчик вопросов |

---

### Task 1: Сервис и страница

**Files:**
- Create: `src/app/core/services/prepositions.service.ts`
- Create: `src/app/feature/system/prepositions/prepositions-page.component.ts`, `.html`, `.scss`, `.spec.ts`

**Interfaces:**
- Consumes: бэкенд `GET /admin/prepositions` → `{release, history}`; `POST /admin/prepositions/upload` →
  `{release, uploadedMedia, reusedMedia, removedMedia, engineMatches, warnings}`.
- Produces: `PrepositionsService.getLatest(): Observable<PrepositionsSnapshot>`, `uploadHtml(file: File)`;
  `PrepositionsPageComponent` (selector `app-prepositions-page`).

- [ ] **Step 1: Падающий тест страницы**

`src/app/feature/system/prepositions/prepositions-page.component.spec.ts`:

```ts
import { of, throwError } from 'rxjs';

import { PrepositionsPageComponent } from './prepositions-page.component';

/** Без TestBed — тот же приём, что у ListenPageComponent: логика страницы без шаблона. */
describe('PrepositionsPageComponent — загрузка Prepositions World', () => {
  const release = {
    id: 3, fileName: 'Prepositions World.html', lessonsCount: 31, questionsCount: 472,
    imagesCount: 266, audioCount: 502, engineSha: 'abc'
  };
  let service: { getLatest: jasmine.Spy; uploadHtml: jasmine.Spy };
  let toast: { showSuccess: jasmine.Spy; showError: jasmine.Spy };

  function build(): PrepositionsPageComponent {
    return new PrepositionsPageComponent(service as never, toast as never);
  }

  function pick(name: string): Event {
    const input = { files: [new File(['x'], name)], value: name } as unknown as HTMLInputElement;
    return { target: input } as unknown as Event;
  }

  beforeEach(() => {
    service = {
      getLatest: jasmine.createSpy().and.returnValue(of({ release, history: [release] })),
      uploadHtml: jasmine.createSpy().and.returnValue(of({
        release, uploadedMedia: 700, reusedMedia: 68, removedMedia: 2, engineMatches: false,
        warnings: ['Движок в файле отличается…', 'Нет записи у 1 вопросов']
      })),
    };
    toast = { showSuccess: jasmine.createSpy(), showError: jasmine.createSpy() };
  });

  it('при открытии показывает текущий релиз и историю', () => {
    const c = build();
    c.ngOnInit();
    expect(c.release?.questionsCount).toBe(472);
    expect(c.history.length).toBe(1);
  });

  it('загружает html и показывает итог: файлы, движок, предупреждения', () => {
    const c = build();
    c.onFile(pick('Prepositions World (11).html'));
    expect(service.uploadHtml).toHaveBeenCalled();
    expect(c.lastUpload?.uploadedMedia).toBe(700);
    expect(c.lastUpload?.engineMatches).toBeFalse();
    expect(c.otherWarnings).toEqual(['Нет записи у 1 вопросов']);
    expect(toast.showSuccess).toHaveBeenCalled();
  });

  it('не html — ошибка без запроса', () => {
    const c = build();
    c.onFile(pick('course.json'));
    expect(service.uploadHtml).not.toHaveBeenCalled();
    expect(toast.showError).toHaveBeenCalled();
  });

  it('текст ошибки сервера показывается как есть', () => {
    service.uploadHtml.and.returnValue(throwError(() => ({ error: { messages: ['Вопрос place/x/0: нет картинки в pics'] } })));
    const c = build();
    c.onFile(pick('p.html'));
    expect(toast.showError).toHaveBeenCalledWith('Вопрос place/x/0: нет картинки в pics');
    expect(c.uploading).toBeFalse();
  });

  it('сеть оборвалась на большом файле — понятный текст, а не пустой тост', () => {
    service.uploadHtml.and.returnValue(throwError(() => ({ status: 0 })));
    const c = build();
    c.onFile(pick('p.html'));
    expect(toast.showError).toHaveBeenCalledWith('Стенд не ответил на загрузку. Файл большой — попробуйте ещё раз');
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `npx ng test --watch=false --include='src/app/feature/system/prepositions/**/*.spec.ts'`
Expected: FAIL — компонента нет.

- [ ] **Step 3: Сервис**

```ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

export interface PrepositionsRelease {
  id: number;
  fileName: string;
  lessonsCount: number;
  questionsCount: number;
  imagesCount: number;
  audioCount: number;
  engineSha: string;
  createdAt?: string;
}

export interface PrepositionsSnapshot {
  release: PrepositionsRelease | null;
  history: PrepositionsRelease[];
}

export interface PrepositionsUploadResult {
  release: PrepositionsRelease;
  uploadedMedia: number;
  reusedMedia: number;
  removedMedia: number;
  engineMatches: boolean;
  warnings: string[];
}

/** Prepositions World: html-прототип целиком заменяет курс предлогов в «Практике» ученика. */
@Injectable({ providedIn: 'root' })
export class PrepositionsService extends BaseService {

  constructor(private http: HttpClient) {
    super();
  }

  getLatest(): Observable<PrepositionsSnapshot> {
    return this.http.get<PrepositionsSnapshot>(this.url('/admin/prepositions'));
  }

  uploadHtml(file: File): Observable<PrepositionsUploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<PrepositionsUploadResult>(this.url('/admin/prepositions/upload'), form);
  }
}
```

- [ ] **Step 4: Компонент**

```ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';

import {
  PrepositionsRelease,
  PrepositionsService,
  PrepositionsUploadResult
} from '../../../core/services/prepositions.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Prepositions World (предлоги в «Практике» ученика). Источник — html-прототип методиста (~23 МБ): сервер
 * разбирает его, проверяет, кладёт картинки и записи в MinIO. Новый файл целиком заменяет прежний курс.
 */
@Component({
  selector: 'app-prepositions-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './prepositions-page.component.html',
  styleUrl: './prepositions-page.component.scss'
})
export class PrepositionsPageComponent implements OnInit {
  loading = false;
  uploading = false;
  release: PrepositionsRelease | null = null;
  history: PrepositionsRelease[] = [];
  lastUpload: PrepositionsUploadResult | null = null;
  selectedName = '';

  constructor(
    private prepositions: PrepositionsService,
    private toast: ToastService
  ) {}

  /** Предупреждение о движке — отдельной плашкой, поэтому в общем списке его нет. */
  get otherWarnings(): string[] {
    return (this.lastUpload?.warnings || []).filter((w) => !w.startsWith('Движок'));
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.prepositions.getLatest()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (snap) => {
          this.release = snap.release;
          this.history = snap.history || [];
        },
        error: () => this.toast.showError('Не удалось загрузить Prepositions World')
      });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.html') && !name.endsWith('.htm')) {
      this.toast.showError('Нужен html-файл прототипа Prepositions World');
      return;
    }
    this.selectedName = file.name;
    this.uploading = true;
    this.prepositions.uploadHtml(file)
      .pipe(finalize(() => (this.uploading = false)))
      .subscribe({
        next: (result) => {
          this.lastUpload = result;
          this.release = result.release;
          this.toast.showSuccess(`Загружено: ${result.release.lessonsCount} уроков, ${result.release.questionsCount} вопросов`);
          this.load();
        },
        error: (err) => {
          const msg = err?.error?.messages?.[0];
          // 0 и 5xx без тела — обрыв на большом файле (прокси, перезапуск стенда), а не брак файла
          const fallback = !err?.status || err.status >= 500
            ? 'Стенд не ответил на загрузку. Файл большой — попробуйте ещё раз'
            : 'Не удалось загрузить файл Prepositions World';
          this.toast.showError(typeof msg === 'string' ? msg : fallback);
        }
      });
  }
}
```

- [ ] **Step 5: Шаблон**

```html
<div class="prep-page">
  <div class="page-header">
    <button mat-raised-button color="primary" [disabled]="uploading" (click)="fileInput.click()">
      <mat-icon>upload_file</mat-icon>
      Загрузить HTML
    </button>
    <input #fileInput type="file" accept=".html,.htm,text/html" hidden (change)="onFile($event)">
  </div>

  <p class="hint">
    Файл прототипа <b>Prepositions World.html</b>: 8 категорий, уроки, практика со сценами, записи голоса. Сервер
    проверяет каждый вопрос, кладёт картинки и записи в хранилище — ученик видит курс в «Практике» → «Письмо» →
    Prepositions World. Новый файл полностью заменяет прежний курс; одинаковые картинки и записи повторно не
    загружаются. Ошибка в любом вопросе отклоняет загрузку целиком.
  </p>

  <div class="loading" *ngIf="loading && !uploading"><mat-spinner diameter="32"></mat-spinner></div>
  <div class="file-status" *ngIf="uploading">
    <mat-spinner diameter="22"></mat-spinner>
    <span>Разбор {{ selectedName || 'файла' }}… Файл большой, это может занять минуту.</span>
  </div>

  <div class="empty-state" *ngIf="!loading && !uploading && !release">
    <mat-icon>menu_book</mat-icon>
    <p>Курс ещё не загружен. Выберите html-файл прототипа.</p>
  </div>

  <section class="engine-warning" *ngIf="lastUpload && !lastUpload.engineMatches">
    <mat-icon>warning</mat-icon>
    <p>
      Движок в файле отличается от перенесённого на сайт. Тексты, вопросы, сцены и картинки применились; правки
      движка (схемы, логика сцен, оформление) на сайт не попадут — для них нужна доработка сайта.
    </p>
  </section>

  <section class="release" *ngIf="release">
    <h2>{{ release.fileName }}</h2>
    <p class="meta" *ngIf="release.createdAt">Загружен {{ release.createdAt | date:'dd.MM.yyyy HH:mm' }}</p>
    <ul class="stats">
      <li><b>{{ release.lessonsCount }}</b><span>уроков</span></li>
      <li><b>{{ release.questionsCount }}</b><span>вопросов</span></li>
      <li><b>{{ release.imagesCount }}</b><span>картинок</span></li>
      <li><b>{{ release.audioCount }}</b><span>записей</span></li>
    </ul>
  </section>

  <section class="upload-result" *ngIf="lastUpload">
    <h3>Итог загрузки</h3>
    <p>
      Файлов загружено: <b>{{ lastUpload.uploadedMedia }}</b>, уже были: <b>{{ lastUpload.reusedMedia }}</b>,
      удалено ненужных: <b>{{ lastUpload.removedMedia }}</b>.
    </p>
  </section>

  <section class="warnings" *ngIf="otherWarnings.length">
    <h3>Предупреждения разбора ({{ otherWarnings.length }})</h3>
    <ul><li *ngFor="let w of otherWarnings">{{ w }}</li></ul>
  </section>

  <section class="history" *ngIf="history.length > 1">
    <h3>История загрузок</h3>
    <table>
      <tr *ngFor="let r of history">
        <td>{{ r.createdAt | date:'dd.MM.yyyy HH:mm' }}</td>
        <td>{{ r.fileName }}</td>
        <td>{{ r.questionsCount }} вопросов</td>
      </tr>
    </table>
  </section>
</div>
```

- [ ] **Step 6: Стили**

Скопировать `listen-page.component.scss` в `prepositions-page.component.scss`, заменить корневой класс
`.listen-page` на `.prep-page`, удалить правила `.tree`/`.chips`/`.chip` (на этой странице их нет) и добавить:

```scss
.engine-warning {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  margin: 0 0 20px;
  border-radius: 12px;
  background: #fff4e0;
  color: #6b4500;

  mat-icon {
    flex: none;
    color: #c77700;
  }

  p {
    margin: 0;
    line-height: 1.5;
  }
}

.upload-result p {
  margin: 0 0 16px;
}
```

- [ ] **Step 7: Тест зелёный**

Run: `npx ng test --watch=false --include='src/app/feature/system/prepositions/**/*.spec.ts'`
Expected: PASS (5 specs).

- [ ] **Step 8: Commit**

```bash
git add src/app/core/services/prepositions.service.ts src/app/feature/system/prepositions
git commit -m "feat(prepositions): страница загрузки Prepositions World

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Маршрут и вкладка «Практика и тесты»

**Files:**
- Modify: `src/app/feature/system/system.routes.ts` (после блока `listen`)
- Modify: `src/app/feature/system/practice/practice.component.ts` (вкладка + счётчик)

- [ ] **Step 1: Маршрут** — после маршрута `listen` (`system.routes.ts`, блок с комментарием «Just Listen It»):

```ts
          // Prepositions World: загрузка html-прототипа; бэкенд пускает в /admin/prepositions только ADMIN
          {
            path: 'prepositions',
            loadComponent: () => import('./prepositions/prepositions-page.component').then(m => m.PrepositionsPageComponent),
            canActivate: [roleGuard(['ADMIN'])],
          },
```

- [ ] **Step 2: Вкладка и счётчик** — в `practice.component.ts`:

1. импорт: `import { PrepositionsService } from '../../../core/services/prepositions.service';`
2. в `tabs` после строки `listen`:
   ```ts
    // Prepositions World: html-прототип загружается целиком (кнопка внутри вкладки, как у Just Listen It)
    { segment: 'prepositions', label: 'Prepositions World', path: '/system/prepositions', count: null },
   ```
3. в конструктор последним параметром: `private prepositionsService: PrepositionsService`
4. в `loadCounts()` в объект `forkJoin`:
   `prepositions: safe(this.prepositionsService.getLatest().pipe(map(snapshot => snapshot.release?.questionsCount))),`
   и в деструктуризацию `subscribe(({ …, listen, prepositions }) =>`, а в `counts`: `'prepositions': prepositions`.

Если у `PracticeComponent` есть spec, конструирующий компонент с позиционными параметрами
(`grep -n "new PracticeComponent" -r src/app`), добавить туда заглушку
`{ getLatest: () => of({ release: null, history: [] }) }` последним аргументом.

- [ ] **Step 3: Сборка и тесты**

Run: `npx ng build --configuration development`
Expected: сборка без ошибок.

Run: `npx ng test --watch=false --include='src/app/feature/system/{practice,prepositions,listen}/**/*.spec.ts'`
Expected: PASS.

- [ ] **Step 4: Ручная проверка** (`npx ng serve`, вход ADMIN на дев-бэкенде — входит владелец):
вкладка «Prepositions World» видна в «Практика и тесты», страница открывается, загрузка фикстуры
`jts-web-app/src/practice/prepositions/__fixtures__/prototype-mini.html` (план сайта, Task 1) проходит
и показывает «движок совпадает» (плашки нет). Пока бэкенд не выкачен на дев — проверка только сборкой и тестами.

- [ ] **Step 5: Commit и PR**

```bash
git add src/app/feature/system/system.routes.ts src/app/feature/system/practice
git commit -m "feat(prepositions): вкладка Prepositions World в «Практика и тесты»

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/prepositions-world
```

PR в `develop` (`gh pr create --repo jtsapp/web-admin --base develop`) — после мержа PR бэкенда; в описании
ссылка на PR бэкенда.
