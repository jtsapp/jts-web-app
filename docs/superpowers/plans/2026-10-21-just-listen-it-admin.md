# Just Listen It — web-admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вкладка «Just Listen It» в «Практика и тесты» web-admin: админ загружает HTML-прототип, видит итог разбора (наборы, предупреждения), текущий релиз и историю загрузок.

**Architecture:** Копия устройства вкладки «Словарь» (`vocab-catalog-page`): тонкий standalone-компонент + сервис API в `core/services`. Новая вкладка в оболочке `PracticeComponent` со счётчиком слов текущего релиза.

**Tech Stack:** Angular (standalone), Angular Material, RxJS, Karma + Jasmine.

**Спека:** `jts-web-app/docs/superpowers/specs/2026-10-21-just-listen-it-design.md` (часть 2). **Зависит от** плана backend (`2026-10-21-just-listen-it-backend.md`): ручки `GET /admin/listen`, `POST /admin/listen/upload`.

## Global Constraints

- Рабочая копия: `C:\Users\nural\Desktop\web-admin-just-listen`, ветка `feat/just-listen-it` от `origin/develop` (уже создана). Пути ниже — от `src/app`, если не сказано иное.
- Правила — `backend/docs/DEVELOPMENT_GUIDE.md` §6.1: компонент до ~300 строк `.ts` и ~200 строк шаблона, логика в сервисе, подписки не текут. Тексты — по-русски строкой, как у соседней вкладки «Словарь» (i18n у вкладок «Практики» нет).
- Ошибка сервера: `err.error.messages[0]` (как в `vocab-catalog-page`).
- Проверки: `npx ng test --watch=false --browsers=ChromeHeadless`, `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`, `npx ng build --configuration=production`.
- Коммиты: `тип(listen): суть` по-русски + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Пуш и PR — только по команде владельца, после мержа бэкенда.

---

## File Structure

```
src/app/core/services/listen.service.ts              ← API /admin/listen
src/app/core/services/listen.service.spec.ts
src/app/feature/system/listen/listen-page.component.ts
src/app/feature/system/listen/listen-page.component.html
src/app/feature/system/listen/listen-page.component.scss
src/app/feature/system/listen/listen-page.component.spec.ts
src/app/feature/system/system.routes.ts               ← маршрут 'listen' (ADMIN)
src/app/feature/system/practice/practice.component.ts ← вкладка + счётчик
src/app/feature/system/practice/practice.component.spec.ts
```

---

### Task 1: Сервис `ListenService`

**Files:**
- Create: `core/services/listen.service.ts`
- Test: `core/services/listen.service.spec.ts`

**Interfaces:**
- Produces:
  - `interface ListenRelease { id: number; fileName: string; levelsCount: number; fieldsCount: number; lessonsCount: number; wordsCount: number; createdAt?: string }`
  - `interface ListenSetSummary { id: string; name: string; ru?: string; icon?: string; group?: string; units: number; lessons: number; words: number }`
  - `interface ListenIndex { release?: number; uploadedAt?: string; levels?: ListenSetSummary[]; fields?: ListenSetSummary[] }`
  - `interface ListenSnapshot { release: ListenRelease | null; history: ListenRelease[]; index: ListenIndex }`
  - `interface ListenUploadResult { release: ListenRelease; sets: { id: string; words: number }[]; warnings: string[] }`
  - `ListenService.getLatest(): Observable<ListenSnapshot>` → `GET /admin/listen`
  - `ListenService.uploadHtml(file: File): Observable<ListenUploadResult>` → `POST /admin/listen/upload` (multipart `file`)

- [ ] **Step 1: Написать падающий тест**

`core/services/listen.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ListenService, ListenSnapshot, ListenUploadResult } from './listen.service';

describe('ListenService — Just Listen It', () => {
  let service: ListenService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ListenService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ListenService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('текущий релиз — GET /admin/listen', () => {
    let snap: ListenSnapshot | undefined;
    service.getLatest().subscribe(v => snap = v);
    const req = http.expectOne(r => r.url.endsWith('/admin/listen'));
    expect(req.request.method).toBe('GET');
    req.flush({ release: null, history: [], index: {} });
    expect(snap).toEqual({ release: null, history: [], index: {} });
  });

  it('загрузка — multipart с полем file', () => {
    const file = new File(['<html></html>'], 'jts.html', { type: 'text/html' });
    let result: ListenUploadResult | undefined;
    service.uploadHtml(file).subscribe(v => result = v);
    const req = http.expectOne(r => r.url.endsWith('/admin/listen/upload'));
    expect(req.request.method).toBe('POST');
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.flush({ release: { id: 1, fileName: 'jts.html', levelsCount: 5, fieldsCount: 16, lessonsCount: 658, wordsCount: 11135 }, sets: [], warnings: [] });
    expect(result?.release.wordsCount).toBe(11135);
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run (из корня `web-admin-just-listen`): `npx ng test --watch=false --browsers=ChromeHeadless --include src/app/core/services/listen.service.spec.ts`
Expected: FAIL — `Cannot find module './listen.service'`.

- [ ] **Step 3: Реализация**

`core/services/listen.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

export interface ListenRelease {
  id: number;
  fileName: string;
  levelsCount: number;
  fieldsCount: number;
  lessonsCount: number;
  wordsCount: number;
  createdAt?: string;
}

export interface ListenSetSummary {
  id: string;
  name: string;
  ru?: string;
  icon?: string;
  group?: string;
  units: number;
  lessons: number;
  words: number;
}

export interface ListenIndex {
  release?: number;
  uploadedAt?: string;
  levels?: ListenSetSummary[];
  fields?: ListenSetSummary[];
}

export interface ListenSnapshot {
  release: ListenRelease | null;
  history: ListenRelease[];
  index: ListenIndex;
}

export interface ListenUploadResult {
  release: ListenRelease;
  sets: { id: string; words: number }[];
  warnings: string[];
}

/** Just Listen It: HTML-прототип целиком заменяет наборы раздела в «Практике» ученика. */
@Injectable({ providedIn: 'root' })
export class ListenService extends BaseService {

  constructor(private http: HttpClient) {
    super();
  }

  getLatest(): Observable<ListenSnapshot> {
    return this.http.get<ListenSnapshot>(this.url('/admin/listen'));
  }

  uploadHtml(file: File): Observable<ListenUploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ListenUploadResult>(this.url('/admin/listen/upload'), form);
  }
}
```

- [ ] **Step 4: Прогнать тест**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include src/app/core/services/listen.service.spec.ts`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/listen.service.ts src/app/core/services/listen.service.spec.ts
git commit -m "feat(listen): сервис API загрузки Just Listen It

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Страница `ListenPageComponent`

**Files:**
- Create: `feature/system/listen/listen-page.component.ts`
- Create: `feature/system/listen/listen-page.component.html`
- Create: `feature/system/listen/listen-page.component.scss`
- Test: `feature/system/listen/listen-page.component.spec.ts`

**Interfaces:**
- Consumes: `ListenService.getLatest/uploadHtml`, типы из Task 1; `ToastService.showSuccess/showError`.
- Produces: `ListenPageComponent` (selector `app-listen-page`), поля `release`, `history`, `index`, `lastUpload: ListenUploadResult | null`, методы `load()`, `onFile(event)`.

- [ ] **Step 1: Написать падающий тест**

`feature/system/listen/listen-page.component.spec.ts`:

```ts
import { of, throwError } from 'rxjs';

import { ListenPageComponent } from './listen-page.component';

/** Без TestBed — тот же приём, что у PracticeComponent: логика страницы без шаблона. */
describe('ListenPageComponent — загрузка Just Listen It', () => {
  const release = { id: 3, fileName: 'jts.html', levelsCount: 5, fieldsCount: 16, lessonsCount: 658, wordsCount: 11135 };
  let service: { getLatest: jasmine.Spy; uploadHtml: jasmine.Spy };
  let toast: { showSuccess: jasmine.Spy; showError: jasmine.Spy };

  function build(): ListenPageComponent {
    return new ListenPageComponent(service as never, toast as never);
  }

  function pick(name: string): Event {
    const input = { files: [new File(['x'], name)], value: name } as unknown as HTMLInputElement;
    return { target: input } as unknown as Event;
  }

  beforeEach(() => {
    service = {
      getLatest: jasmine.createSpy().and.returnValue(of({ release, history: [release], index: { levels: [], fields: [] } })),
      uploadHtml: jasmine.createSpy().and.returnValue(of({ release, sets: [{ id: 'A0', words: 369 }], warnings: ['A0: предупреждение'] })),
    };
    toast = { showSuccess: jasmine.createSpy(), showError: jasmine.createSpy() };
  });

  it('при открытии показывает текущий релиз и историю', () => {
    const c = build();
    c.ngOnInit();
    expect(c.release?.wordsCount).toBe(11135);
    expect(c.history.length).toBe(1);
  });

  it('загружает html, показывает наборы и предупреждения разбора', () => {
    const c = build();
    c.onFile(pick('jts_just_listen_it.html'));
    expect(service.uploadHtml).toHaveBeenCalled();
    expect(c.lastUpload?.sets[0].id).toBe('A0');
    expect(c.lastUpload?.warnings.length).toBe(1);
    expect(toast.showSuccess).toHaveBeenCalled();
  });

  it('не html — ошибка без запроса', () => {
    const c = build();
    c.onFile(pick('data.json'));
    expect(service.uploadHtml).not.toHaveBeenCalled();
    expect(toast.showError).toHaveBeenCalled();
  });

  it('текст ошибки сервера показывается как есть', () => {
    service.uploadHtml.and.returnValue(throwError(() => ({ error: { messages: ['A0, юнит 1: нет юнитов'] } })));
    const c = build();
    c.onFile(pick('jts.html'));
    expect(toast.showError).toHaveBeenCalledWith('A0, юнит 1: нет юнитов');
    expect(c.uploading).toBeFalse();
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include src/app/feature/system/listen/listen-page.component.spec.ts`
Expected: FAIL — `Cannot find module './listen-page.component'`.

- [ ] **Step 3: Компонент**

`feature/system/listen/listen-page.component.ts`:

```ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';

import {
  ListenIndex,
  ListenRelease,
  ListenService,
  ListenUploadResult
} from '../../../core/services/listen.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Just Listen It (диктант слова и предложения в «Практике» ученика). Источник — HTML-прототип методиста:
 * сервер разбирает его, проверяет и кладёт наборы в MinIO. Новый файл целиком заменяет прежние наборы.
 */
@Component({
  selector: 'app-listen-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './listen-page.component.html',
  styleUrl: './listen-page.component.scss'
})
export class ListenPageComponent implements OnInit {
  loading = false;
  uploading = false;
  release: ListenRelease | null = null;
  history: ListenRelease[] = [];
  index: ListenIndex = {};
  lastUpload: ListenUploadResult | null = null;
  selectedName = '';

  constructor(
    private listen: ListenService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.listen.getLatest()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (snap) => {
          this.release = snap.release;
          this.history = snap.history || [];
          this.index = snap.index || {};
        },
        error: () => this.toast.showError('Не удалось загрузить Just Listen It')
      });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.html') && !name.endsWith('.htm')) {
      this.toast.showError('Нужен HTML-файл прототипа Just Listen It');
      return;
    }
    this.selectedName = file.name;
    this.uploading = true;
    this.listen.uploadHtml(file)
      .pipe(finalize(() => (this.uploading = false)))
      .subscribe({
        next: (result) => {
          this.lastUpload = result;
          this.release = result.release;
          this.toast.showSuccess(`Загружено: ${result.release.wordsCount} слов в ${result.sets.length} наборах`);
          this.load();
        },
        error: (err) => {
          const msg = err?.error?.messages?.[0];
          this.toast.showError(typeof msg === 'string' ? msg : 'Не удалось загрузить файл Just Listen It');
        }
      });
  }
}
```

- [ ] **Step 4: Шаблон**

`feature/system/listen/listen-page.component.html`:

```html
<div class="listen-page">
  <div class="page-header">
    <button mat-raised-button color="primary" [disabled]="uploading" (click)="fileInput.click()">
      <mat-icon>upload_file</mat-icon>
      Загрузить HTML
    </button>
    <input #fileInput type="file" accept=".html,.htm,text/html" hidden (change)="onFile($event)">
  </div>

  <p class="hint">
    Файл прототипа <b>jts-just-listen-it.html</b>: уровни A0–B2 и профессиональные направления. Сервер проверяет
    каждую запись и кладёт наборы в хранилище — ученик видит их в «Практике» → «Аудирование» → Just Listen It.
    Новый файл полностью заменяет прежние наборы. Ошибка в любой записи отклоняет загрузку целиком.
  </p>

  <div class="loading" *ngIf="loading && !uploading"><mat-spinner diameter="32"></mat-spinner></div>
  <div class="file-status" *ngIf="uploading">
    <mat-spinner diameter="22"></mat-spinner>
    <span>Разбор {{ selectedName || 'файла' }}…</span>
  </div>

  <div class="empty-state" *ngIf="!loading && !uploading && !release">
    <mat-icon>hearing</mat-icon>
    <p>Наборы ещё не загружены. Выберите HTML-файл прототипа.</p>
  </div>

  <section class="release" *ngIf="release">
    <h2>{{ release.fileName }}</h2>
    <p class="meta" *ngIf="release.createdAt">Загружен {{ release.createdAt | date:'dd.MM.yyyy HH:mm' }}</p>
    <ul class="stats">
      <li><b>{{ release.levelsCount }}</b><span>уровней</span></li>
      <li><b>{{ release.fieldsCount }}</b><span>направлений</span></li>
      <li><b>{{ release.lessonsCount }}</b><span>уроков</span></li>
      <li><b>{{ release.wordsCount }}</b><span>слов</span></li>
    </ul>
  </section>

  <section class="warnings" *ngIf="lastUpload?.warnings?.length">
    <h3>Предупреждения разбора ({{ lastUpload!.warnings.length }})</h3>
    <ul><li *ngFor="let w of lastUpload!.warnings">{{ w }}</li></ul>
  </section>

  <section class="tree" *ngIf="index.levels?.length">
    <h3>Уровни</h3>
    <div class="chips">
      <div class="chip" *ngFor="let set of index.levels">
        <b>{{ set.id }}</b>
        <span>{{ set.name }}</span>
        <i>{{ set.words }} слов · {{ set.lessons }} уроков</i>
      </div>
    </div>
  </section>

  <section class="tree" *ngIf="index.fields?.length">
    <h3>Профессиональные направления</h3>
    <div class="chips">
      <div class="chip" *ngFor="let set of index.fields">
        <b>{{ set.icon }} {{ set.name }}</b>
        <span>{{ set.ru }}</span>
        <i>{{ set.words }} терминов · {{ set.lessons }} уроков</i>
      </div>
    </div>
  </section>

  <section class="history" *ngIf="history.length > 1">
    <h3>История загрузок</h3>
    <table>
      <tr *ngFor="let r of history">
        <td>{{ r.createdAt | date:'dd.MM.yyyy HH:mm' }}</td>
        <td>{{ r.fileName }}</td>
        <td>{{ r.wordsCount }} слов</td>
      </tr>
    </table>
  </section>
</div>
```

- [ ] **Step 5: Стили**

`feature/system/listen/listen-page.component.scss` — начать с копии оформления «Словаря», затем добавить блоки предупреждений и истории:

```bash
cp src/app/feature/system/vocab-catalog/vocab-catalog-page.component.scss src/app/feature/system/listen/listen-page.component.scss
sed -i 's/\.vocab-page/.listen-page/' src/app/feature/system/listen/listen-page.component.scss
```

Дописать в конец файла:

```scss
.warnings {
  background: #fff8e6;
  border: 1px solid #f3d38a;
  border-radius: 16px;
  padding: 14px 18px;
  margin-bottom: 22px;

  h3 {
    margin: 0 0 8px;
    font-size: 15px;
  }

  ul {
    margin: 0;
    padding-left: 18px;
    max-height: 240px;
    overflow: auto;
    font-size: 13px;
  }
}

.history table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  td {
    padding: 6px 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }
}
```

- [ ] **Step 6: Прогнать тест**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include src/app/feature/system/listen/listen-page.component.spec.ts`
Expected: PASS (4 теста).

- [ ] **Step 7: Commit**

```bash
git add src/app/feature/system/listen
git commit -m "feat(listen): страница загрузки Just Listen It

Итог разбора (наборы, предупреждения), текущий релиз и история загрузок.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Маршрут и вкладка в «Практика и тесты»

**Files:**
- Modify: `feature/system/system.routes.ts` (дочерний маршрут оболочки `PracticeComponent`, рядом с `vocab-catalog`)
- Modify: `feature/system/practice/practice.component.ts` (вкладка, сервис, счётчик)
- Modify: `feature/system/practice/practice.component.spec.ts`

**Interfaces:**
- Consumes: `ListenService.getLatest()` (Task 1), `ListenPageComponent` (Task 2).
- Produces: адрес `/system/listen` (только ADMIN), вкладка «Just Listen It» после «Словаря», счётчик — `release.wordsCount`.

- [ ] **Step 1: Обновить тест оболочки (падающий)**

В `feature/system/practice/practice.component.spec.ts`:

1. Добавить шпион и передать его в конструктор девятым аргументом:

```ts
  let listen: { getLatest: jasmine.Spy };

  function build(): PracticeComponent {
    return new PracticeComponent(router as never, adaptive as never, tasks as never, vocab as never, mnemo as never, surveys as never, ielts as never, sat as never, listen as never);
  }
```

2. В `beforeEach` добавить:

```ts
    listen = { getLatest: jasmine.createSpy().and.returnValue(of({ release: { wordsCount: 11135 }, history: [], index: {} })) };
```

3. Ожидания вкладок и счётчиков:

```ts
    expect(build().tabs.map(t => t.label)).toEqual(['Тест уровня CEFR', 'Задания', 'Словарь', 'Just Listen It', 'Мнемотехники', 'Опросы', 'IELTS', 'SAT']);
```

```ts
    expect(c.tabs.map(t => t.count)).toEqual([214, 186, 658, 11135, 6, 5, 351, 247]);
```

Остальные тесты файла индексов вкладок, кроме этих двух, не используют (`tabs[0]`, `tabs[1]` — CEFR и Задания остаются на местах).

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include src/app/feature/system/practice/practice.component.spec.ts`
Expected: FAIL — нет вкладки «Just Listen It», счётчики без 11135.

- [ ] **Step 3: Вкладка и счётчик**

В `practice.component.ts`:

Импорт:

```ts
import { ListenService } from '../../../core/services/listen.service';
```

Вкладка — после строки «Словарь»:

```ts
    { segment: 'vocab-catalog', label: 'Словарь', path: '/system/vocab-catalog', count: null },
    // Just Listen It: HTML-прототип загружается целиком (кнопка внутри вкладки, как у «Словаря»)
    { segment: 'listen', label: 'Just Listen It', path: '/system/listen', count: null },
```

Конструктор — последним параметром:

```ts
    private satQuestionService: SatQuestionService,
    private listenService: ListenService
  ) {}
```

В `loadCounts()` — новый источник в `forkJoin` и в таблицу:

```ts
      sat: safe(this.satQuestionService.list().pipe(map(list => list.length))),
      listen: safe(this.listenService.getLatest().pipe(map(snapshot => snapshot.release?.wordsCount))),
    }).subscribe(({ cefr, tasks, vocab, mnemo, surveys, ielts, sat, listen }) => {
      const counts: Record<string, number | null> = {
        'adaptive-test': cefr, 'tasks': tasks, 'vocab-catalog': vocab, 'mnemotechnics': mnemo, 'surveys': surveys,
        'ielts-tests': ielts, 'sat-questions': sat, 'listen': listen
      };
```

- [ ] **Step 4: Маршрут**

В `feature/system/system.routes.ts`, в `children` оболочки сразу после блока `vocab-catalog`:

```ts
          // Just Listen It: загрузка HTML-прототипа; бэкенд пускает в /admin/listen только ADMIN
          {
            path: 'listen',
            loadComponent: () => import('./listen/listen-page.component').then(m => m.ListenPageComponent),
            canActivate: [roleGuard(['ADMIN'])],
          },
```

- [ ] **Step 5: Тесты, типы, сборка**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npx ng build --configuration=production
```
Expected: тесты зелёные (новых падений нет; `system.routes.spec.ts` тоже зелёный), типы без ошибок, сборка проходит.

- [ ] **Step 6: Живая проверка**

После мержа и деплоя бэкенда на dev: `npx ng serve` против dev-API (как обычно для этого репо), войти админом, открыть «Практика и тесты» → «Just Listen It», загрузить `C:\Users\nural\Desktop\jts-web-app\data\jtslisten.html`.
Expected: тост «Загружено: 11135 слов в 21 наборах», карточки 5 уровней и 16 направлений, предупреждений нет; счётчик вкладки — 11135. Скриншот страницы приложить к PR.

- [ ] **Step 7: Commit**

```bash
git add src/app/feature/system/system.routes.ts src/app/feature/system/practice/practice.component.ts src/app/feature/system/practice/practice.component.spec.ts
git commit -m "feat(listen): вкладка Just Listen It в «Практика и тесты»

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
