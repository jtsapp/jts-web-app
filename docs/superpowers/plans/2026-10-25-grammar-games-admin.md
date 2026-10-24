# «Грамматика · игры» — web-admin (этап 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Владелец: план с готовым кодом выполняется инлайн, ревью — одно в конце.

**Goal:** страница «Грамматика · игры» в web-admin. На ней: заливка html прототипа или zip, темы по уровням L1–L5 со скрытием, правка темы JSON-редактором, выгрузка zip и монеты за игру. Доступ — у администратора (вкладка «Практика и тесты») и у контент-менеджера (свой пункт меню).

**Architecture:** две службы поверх ручек бэкенда (PR jtsapp/backend#313): `GrammarGamesService` и `PracticeCoinRulesService`. Три standalone-компонента: страница, редактор темы, панель монет. Подписи меню, вкладки и игр берутся из одного файла `grammar-games.labels.ts`. Страница подключена двумя маршрутами: в оболочке «Практики и тестов» для админа и `content/grammar-games` для контент-менеджера (у него нет «Практики и тестов», а оболочка её дёргает чужие ручки).

**Tech Stack:** Angular 17 (standalone), Angular Material, RxJS, Karma + Jasmine.

**Спека:** jts-web-app `docs/superpowers/specs/2026-10-25-grammar-games-speed-reading-design.md`, часть A2, допущения Д1, Д3, Д10.

## Global Constraints

- Репозиторий `jtsapp/web-admin`, worktree `C:\Users\nural\Desktop\web-admin-grammar-games`, ветка `feat/grammar-games` от `origin/develop` (b54d539d). Все команды — из этой папки.
- `node_modules` — junction на `C:\Users\nural\Desktop\web-admin-practice-reading\node_modules` (тот же `package-lock.json`, sha1 `cd8761c8…`). Перед удалением worktree снять junction (`cmd /c rmdir node_modules`), иначе снесётся чужая установка.
- Ручки бэкенда (строгий Jackson: в теле запроса — только перечисленные поля):
  - `POST /admin/grammar-games/upload` (multipart `file`) → `{topics, created, updated, unchanged, warnings}`;
  - `GET /admin/grammar-games/topics?level=L1` → `[{id, level, n, icon, titleRu, hidden, games, updatedAt}]`;
  - `GET /admin/grammar-games/topics/{id}`, `PUT` (тело — тема), `PATCH` (`{hidden}`);
  - `GET /admin/grammar-games/export` → zip;
  - `GET`/`PUT /admin/practice/coin-rules` (`{ключ: 0–10}`).
- Ошибки сервера — через `apiErrorText`. Текст проверки темы приходит одной строкой с переводами строк: «Тема не прошла проверку:\n…».
- Тексты интерфейса — по-русски прямо в шаблоне, как у соседних страниц «Практики» (Prepositions World, Just to Listen).
- Цвета — токенами `var(--jts-…, запасной)`, как в `prepositions-page.component.scss`. `npm run test:theme` не должен краснеть.
- Компонент — до ~300 строк `.ts` и ~200 строк шаблона.
- Тесты компонентов — без TestBed, как `PrepositionsPageComponent`; тест службы — `HttpTestingController`.
- Проверки: `npx ng test --watch=false --browsers=ChromeHeadless`, `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`, `npx ng build --configuration=production`.
- Коммиты — `тип(grammar-games): суть` по-русски, в конце `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Карта файлов

```
src/app/core/services/grammar-games.service.ts (+ .spec.ts)        — ручки /admin/grammar-games, ссылка на сайт
src/app/core/services/practice-coin-rules.service.ts               — ручки /admin/practice/coin-rules
src/app/feature/system/grammar-games/grammar-games.labels.ts       — уровни, игры, подписи
src/app/feature/system/grammar-games/grammar-games-page.component.{ts,html,scss,spec.ts}
src/app/feature/system/grammar-games/grammar-topic-editor.component.{ts,html,spec.ts}
src/app/feature/system/grammar-games/grammar-coin-rules.component.{ts,html,spec.ts}
src/app/feature/system/system.routes.ts                             — два маршрута (правка)
src/app/feature/system/practice/practice.component.ts (+ .spec.ts)  — вкладка и счётчик (правка)
src/app/feature/system/system.component.ts                          — пункт меню контент-менеджера (правка)
```

---

### Task 1: Службы и подписи

**Files:**
- Create: `src/app/core/services/grammar-games.service.ts`, `src/app/core/services/grammar-games.service.spec.ts`
- Create: `src/app/core/services/practice-coin-rules.service.ts`
- Create: `src/app/feature/system/grammar-games/grammar-games.labels.ts`

**Interfaces — Produces:**
- `GrammarGamesUploadResult {topics, created, updated, unchanged, warnings}`;
- `GrammarTopicRow {id, level, n, icon, titleRu, hidden, games, updatedAt?}`;
- `GrammarGamesService`: `upload(file)`, `list(level?)`, `topic(id)`, `save(id, body)`, `setHidden(id, hidden)`, `exportZip()`, `siteLink(id)`;
- `PracticeCoinRulesService`: `all()`, `update(changes)`;
- `GRAMMAR_LEVELS`, `GRAMMAR_GAMES: {game, label}[]`, `GRAMMAR_GAMES_TITLE`, `COIN_RULE_PREFIX`.

- [ ] **Step 1: Падающий тест службы** — `grammar-games.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { GrammarGamesService } from './grammar-games.service';
import { environment } from '../../../environments/environment';

describe('GrammarGamesService — ручки «Грамматики · игр»', () => {
  let service: GrammarGamesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GrammarGamesService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GrammarGamesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('список уровня — параметром level, без уровня — без параметра', () => {
    service.list('L2').subscribe();
    const withLevel = http.expectOne(r => r.url.endsWith('/admin/grammar-games/topics'));
    expect(withLevel.request.params.get('level')).toBe('L2');
    withLevel.flush([]);
    service.list().subscribe();
    const all = http.expectOne(r => r.url.endsWith('/admin/grammar-games/topics'));
    expect(all.request.params.has('level')).toBeFalse();
    all.flush([]);
  });

  it('видимость — PATCH ровно с полем hidden; правка — PUT телом темы', () => {
    service.setHidden('L1-01', true).subscribe();
    const patch = http.expectOne(r => r.url.endsWith('/admin/grammar-games/topics/L1-01'));
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ hidden: true });
    patch.flush({});
    service.save('L1-01', { id: 'L1-01' }).subscribe();
    const put = http.expectOne(r => r.url.endsWith('/admin/grammar-games/topics/L1-01'));
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ id: 'L1-01' });
    put.flush({});
  });

  it('выгрузка — zip как blob; заливка — multipart с полем file', () => {
    service.exportZip().subscribe();
    const exp = http.expectOne(r => r.url.endsWith('/admin/grammar-games/export'));
    expect(exp.request.responseType).toBe('blob');
    exp.flush(new Blob(['zip']));
    service.upload(new File(['x'], 'p.html')).subscribe();
    const up = http.expectOne(r => r.url.endsWith('/admin/grammar-games/upload'));
    expect((up.request.body as FormData).get('file')).toBeTruthy();
    up.flush({ topics: 1, created: 1, updated: 0, unchanged: 0, warnings: [] });
  });

  it('ссылка на тему у сайта ученика своего стенда', () => {
    expect(service.siteLink('L1-01')).toBe(`${environment.studentAppUrl}/?screen=grammar-games&topic=L1-01`);
  });
});
```

- [ ] **Step 2: Запустить — падает** (`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/core/services/grammar-games.service.spec.ts'`): нет `grammar-games.service`.

- [ ] **Step 3: Службы и подписи**

`src/app/core/services/grammar-games.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { environment } from '../../../environments/environment';

export interface GrammarGamesUploadResult {
  topics: number;
  created: number;
  updated: number;
  unchanged: number;
  warnings: string[];
}

export interface GrammarTopicRow {
  id: string;
  level: string;
  n: number;
  icon: string;
  titleRu: string;
  hidden: boolean;
  games: number;
  updatedAt?: string | null;
}

/**
 * «Грамматика · игры» (раздел «Практики» ученика): 125 тем с правилом и играми. Темы приходят заливкой прототипа
 * методиста или zip-а и правятся по одной; видимость — отдельным переключателем (docs/practice/GRAMMAR_GAMES.md
 * бэкенда).
 */
@Injectable({ providedIn: 'root' })
export class GrammarGamesService extends BaseService {

  constructor(private http: HttpClient) {
    super();
  }

  upload(file: File): Observable<GrammarGamesUploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<GrammarGamesUploadResult>(this.url('/admin/grammar-games/upload'), form);
  }

  list(level?: string): Observable<GrammarTopicRow[]> {
    const params = level ? new HttpParams().set('level', level) : undefined;
    return this.http.get<GrammarTopicRow[]>(this.url('/admin/grammar-games/topics'), { params });
  }

  topic(id: string): Observable<unknown> {
    return this.http.get<unknown>(this.url(`/admin/grammar-games/topics/${encodeURIComponent(id)}`));
  }

  save(id: string, body: unknown): Observable<GrammarTopicRow> {
    return this.http.put<GrammarTopicRow>(this.url(`/admin/grammar-games/topics/${encodeURIComponent(id)}`), body);
  }

  setHidden(id: string, hidden: boolean): Observable<GrammarTopicRow> {
    return this.http.patch<GrammarTopicRow>(this.url(`/admin/grammar-games/topics/${encodeURIComponent(id)}`), { hidden });
  }

  exportZip(): Observable<Blob> {
    return this.http.get(this.url('/admin/grammar-games/export'), { responseType: 'blob' });
  }

  /** Тема на сайте ученика этого же стенда: так методист проверяет правку глазами ученика. */
  siteLink(id: string): string {
    return `${environment.studentAppUrl}/?screen=grammar-games&topic=${encodeURIComponent(id)}`;
  }
}
```

`src/app/core/services/practice-coin-rules.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

/** Сколько монет дают разделы «Практики»: ключ правила → 0–10. Ключи заводит миграция раздела, а не админка. */
@Injectable({ providedIn: 'root' })
export class PracticeCoinRulesService extends BaseService {

  constructor(private http: HttpClient) {
    super();
  }

  all(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(this.url('/admin/practice/coin-rules'));
  }

  update(changes: Record<string, number>): Observable<Record<string, number>> {
    return this.http.put<Record<string, number>>(this.url('/admin/practice/coin-rules'), changes);
  }
}
```

`src/app/feature/system/grammar-games/grammar-games.labels.ts`:

```ts
/** Название раздела — то же, что у плитки ученика: заказчик назвал так, чтобы не путать со старой «Грамматикой». */
export const GRAMMAR_GAMES_TITLE = 'Грамматика · игры';

export const GRAMMAR_LEVELS = [
  { id: 'L1', range: '0 → A1' },
  { id: 'L2', range: 'A1 → A2' },
  { id: 'L3', range: 'A2 → B1' },
  { id: 'L4', range: 'B1 → B2' },
  { id: 'L5', range: 'B2 → C1' },
] as const;

/** Ключ правила монет игры: grammar-games.<игра> (V411 бэкенда). */
export const COIN_RULE_PREFIX = 'grammar-games.';

/** Игры в порядке сетки ученика; названия — GAMES[*].n.ru прототипа. */
export const GRAMMAR_GAMES = [
  { game: 'pick', label: 'Выбери форму' },
  { game: 'match', label: 'Найди пары' },
  { game: 'sort', label: 'Разложи по корзинам' },
  { game: 'build', label: 'Собери предложение' },
  { game: 'trans', label: 'Трансформер' },
  { game: 'fix', label: 'Найди ошибку' },
  { game: 'place', label: 'Где это?' },
  { game: 'type', label: 'Впиши сам' },
  { game: 'dialog', label: 'Диалог' },
  { game: 'listen', label: 'Слушай и выбирай' },
  { game: 'race', label: 'Гонка: верно или нет' },
  { game: 'catch', label: 'Лови правильное' },
  { game: 'boss', label: 'Финальный бой' },
] as const;
```

- [ ] **Step 4: Тест проходит** — та же команда, 4 теста PASS.
- [ ] **Step 5: Commit** — `feat(grammar-games): службы ручек и подписи раздела`.

---

### Task 2: Монеты за игру — `GrammarCoinRulesComponent`

**Files:** Create `src/app/feature/system/grammar-games/grammar-coin-rules.component.{ts,html,spec.ts}`

**Interfaces:** Consumes — `PracticeCoinRulesService`, `GRAMMAR_GAMES`, `COIN_RULE_PREFIX`. Produces — `<app-grammar-coin-rules>` с `rows: {game, label, coins, saved}[]`, `load()`, `save()`, `changed`, `error`.

- [ ] **Step 1: Падающий тест** — `grammar-coin-rules.component.spec.ts`:

```ts
import { of, throwError } from 'rxjs';
import { GrammarCoinRulesComponent } from './grammar-coin-rules.component';

describe('GrammarCoinRulesComponent — монеты за игру', () => {
  let service: { all: jasmine.Spy; update: jasmine.Spy };
  let toast: { showSuccess: jasmine.Spy; showError: jasmine.Spy };
  const server = { 'grammar-games.pick': 2, 'grammar-games.boss': 5, 'speed-reading': 4 };

  function build(): GrammarCoinRulesComponent {
    const c = new GrammarCoinRulesComponent(service as never, toast as never);
    c.ngOnInit();
    return c;
  }

  beforeEach(() => {
    service = { all: jasmine.createSpy().and.returnValue(of(server)), update: jasmine.createSpy() };
    toast = { showSuccess: jasmine.createSpy(), showError: jasmine.createSpy() };
  });

  it('13 игр по порядку сетки; только правила раздела; строки без правила не показываются', () => {
    const c = build();
    expect(c.rows.map(r => r.game)).toEqual(['pick', 'boss']);
    expect(c.rows[1].label).toBe('Финальный бой');
  });

  it('сохраняет только изменённое', () => {
    service.update.and.returnValue(of({ ...server, 'grammar-games.pick': 3 }));
    const c = build();
    c.rows[0].coins = 3;
    expect(c.changed).toBeTrue();
    c.save();
    expect(service.update).toHaveBeenCalledWith({ 'grammar-games.pick': 3 });
    expect(c.rows[0].saved).toBe(3);
    expect(c.changed).toBeFalse();
  });

  it('вне 0–10 или не целое — ошибка без запроса', () => {
    const c = build();
    c.rows[0].coins = 11;
    c.save();
    c.rows[0].coins = 1.5;
    c.save();
    expect(service.update).not.toHaveBeenCalled();
    expect(c.error).toContain('от 0 до 10');
  });

  it('отказ сервера — его текст', () => {
    service.update.and.returnValue(throwError(() => ({ status: 400, error: { messages: ['Неизвестное правило монет: x'] } })));
    const c = build();
    c.rows[0].coins = 4;
    c.save();
    expect(c.error).toBe('Неизвестное правило монет: x');
  });
});
```

- [ ] **Step 2: Запустить — падает.**

- [ ] **Step 3: Реализация** — `grammar-coin-rules.component.ts`:

```ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';

import { PracticeCoinRulesService } from '../../../core/services/practice-coin-rules.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorText } from '../../../core/utils/api-error-text.util';
import { COIN_RULE_PREFIX, GRAMMAR_GAMES } from './grammar-games.labels';

interface CoinRow {
  game: string;
  label: string;
  coins: number;
  /** Что сейчас на сервере — по нему видно, что поменяли. */
  saved: number;
}

/**
 * Монеты за игру (решение заказчика 25.10.2026: суммы задаёт контент-менеджер). Ученик получает min(лимит,
 * звёзды + 1) и только за улучшение результата, финальный бой — весь лимит; потолок правила — 10 (допущения Д1–Д3).
 */
@Component({
  selector: 'app-grammar-coin-rules',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  templateUrl: './grammar-coin-rules.component.html',
})
export class GrammarCoinRulesComponent implements OnInit {
  rows: CoinRow[] = [];
  loading = false;
  saving = false;
  error: string | null = null;

  constructor(private rules: PracticeCoinRulesService, private toast: ToastService) {}

  get changed(): boolean {
    return this.rows.some(r => r.coins !== r.saved);
  }

  ngOnInit(): void {
    this.loading = true;
    this.rules.all().pipe(finalize(() => (this.loading = false))).subscribe({
      next: (all) => this.apply(all),
      error: (err) => (this.error = apiErrorText(err, 'Не удалось загрузить монеты за игры')),
    });
  }

  save(): void {
    const bad = this.rows.find(r => !Number.isInteger(r.coins) || r.coins < 0 || r.coins > 10);
    if (bad) {
      this.error = `«${bad.label}»: монеты — целое число от 0 до 10`;
      return;
    }
    const changes: Record<string, number> = {};
    for (const r of this.rows) if (r.coins !== r.saved) changes[COIN_RULE_PREFIX + r.game] = r.coins;
    if (!Object.keys(changes).length) return;
    this.saving = true;
    this.error = null;
    this.rules.update(changes).pipe(finalize(() => (this.saving = false))).subscribe({
      next: (all) => {
        this.apply(all);
        this.toast.showSuccess('Монеты за игры сохранены');
      },
      error: (err) => (this.error = apiErrorText(err, 'Не удалось сохранить монеты за игры')),
    });
  }

  private apply(all: Record<string, number>): void {
    // Правила без строки на сервере не показываем: создать их админка не может (ключи заводит миграция).
    this.rows = GRAMMAR_GAMES
      .filter(g => typeof all[COIN_RULE_PREFIX + g.game] === 'number')
      .map(g => {
        const coins = all[COIN_RULE_PREFIX + g.game];
        return { game: g.game, label: g.label, coins, saved: coins };
      });
  }
}
```

`grammar-coin-rules.component.html`:

```html
<section class="gg-coins">
  <h3>Монеты за игру</h3>
  <p class="hint">
    Сколько монет даёт игра за результат: при звёздах ученик получает меньшее из «лимита» и «звёзды + 1»,
    «Финальный бой» — весь лимит. Платится только улучшение результата. От 0 до 10.
  </p>
  <p class="loading" *ngIf="loading">Загрузка…</p>
  <div class="gg-coins__grid" *ngIf="rows.length">
    <label *ngFor="let row of rows" class="gg-coins__row">
      <span>{{ row.label }}</span>
      <input type="number" min="0" max="10" step="1" [(ngModel)]="row.coins" [name]="'coins-' + row.game">
    </label>
  </div>
  <p class="upload-error" *ngIf="error" role="alert">{{ error }}</p>
  <button mat-flat-button color="primary" type="button" [disabled]="!changed || saving" (click)="save()">
    Сохранить монеты
  </button>
</section>
```

- [ ] **Step 4: Тест проходит.** — [ ] **Step 5: Commit** — `feat(grammar-games): панель монет за игру`.

---

### Task 3: Редактор темы — `GrammarTopicEditorComponent`

**Files:** Create `src/app/feature/system/grammar-games/grammar-topic-editor.component.{ts,html,spec.ts}`

**Interfaces:** Consumes — `GrammarGamesService.topic/save/siteLink`, `AutoGrowDirective` (`../practice-reading/reading-form/editors/auto-grow.directive`). Produces — `<app-grammar-topic-editor [topicId] (saved) (closed)>`; поля `text`, `problems: string[]`, `checkMessage`, `saving`; методы `check()`, `save()`.

- [ ] **Step 1: Падающий тест** — `grammar-topic-editor.component.spec.ts`:

```ts
import { of, throwError } from 'rxjs';
import { GrammarTopicEditorComponent } from './grammar-topic-editor.component';

describe('GrammarTopicEditorComponent — правка темы JSON-ом', () => {
  let service: { topic: jasmine.Spy; save: jasmine.Spy; siteLink: jasmine.Spy };
  let toast: { showSuccess: jasmine.Spy; showError: jasmine.Spy };
  const topic = { id: 'L1-01', lv: 'L1', n: 1, title: { ru: 'To be' } };

  function build(): GrammarTopicEditorComponent {
    const c = new GrammarTopicEditorComponent(service as never, toast as never);
    c.topicId = 'L1-01';
    c.ngOnChanges();
    return c;
  }

  beforeEach(() => {
    service = {
      topic: jasmine.createSpy().and.returnValue(of(topic)),
      save: jasmine.createSpy(),
      siteLink: jasmine.createSpy().and.returnValue('https://dev-tutor/?screen=grammar-games&topic=L1-01'),
    };
    toast = { showSuccess: jasmine.createSpy(), showError: jasmine.createSpy() };
  });

  it('открывает тему отформатированным JSON', () => {
    const c = build();
    expect(c.text).toBe(JSON.stringify(topic, null, 2));
  });

  it('«Проверить JSON»: синтаксис и id — на месте, без запроса', () => {
    const c = build();
    c.text = '{ "id": "L1-01", ';
    c.check();
    expect(c.problems[0]).toContain('Не JSON');
    c.text = JSON.stringify({ ...topic, id: 'L1-02' });
    c.check();
    expect(c.problems).toEqual(['id в теме (L1-02) не совпадает с открытой темой (L1-01)']);
    c.text = JSON.stringify(topic);
    c.check();
    expect(c.problems).toEqual([]);
    expect(c.checkMessage).toContain('Полные правила проверит сервер');
    expect(service.save).not.toHaveBeenCalled();
  });

  it('сохраняет разобранный объект и отдаёт строку наружу', () => {
    const row = { id: 'L1-01', level: 'L1', n: 1, icon: '👋', titleRu: 'To be!', hidden: false, games: 12 };
    service.save.and.returnValue(of(row));
    const c = build();
    let emitted: unknown = null;
    c.saved.subscribe((r: unknown) => (emitted = r));
    c.text = JSON.stringify({ ...topic, title: { ru: 'To be!' } });
    c.save();
    expect(service.save).toHaveBeenCalledWith('L1-01', { ...topic, title: { ru: 'To be!' } });
    expect(emitted).toEqual(row);
  });

  it('отказ проверки сервера — список строк без заголовка', () => {
    service.save.and.returnValue(throwError(() => ({
      status: 400, error: { messages: ['Тема не прошла проверку:\nL1-01 · color · нужен цвет вида #9047FF\nL1-01 · icon · нужен непустой текст'] }
    })));
    const c = build();
    c.save();
    expect(c.problems).toEqual(['L1-01 · color · нужен цвет вида #9047FF', 'L1-01 · icon · нужен непустой текст']);
    expect(c.saving).toBeFalse();
  });

  it('битый JSON не уходит на сервер', () => {
    const c = build();
    c.text = 'nope';
    c.save();
    expect(service.save).not.toHaveBeenCalled();
    expect(c.problems[0]).toContain('Не JSON');
  });
});
```

- [ ] **Step 2: Запустить — падает.**

- [ ] **Step 3: Реализация** — `grammar-topic-editor.component.ts`:

```ts
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';

import { GrammarGamesService, GrammarTopicRow } from '../../../core/services/grammar-games.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorText } from '../../../core/utils/api-error-text.util';
import { AutoGrowDirective } from '../practice-reading/reading-form/editors/auto-grow.directive';

/**
 * Правка одной темы JSON-ом (допущение Д10: формы по полям с живым предпросмотром — не в первой версии). «Проверить
 * JSON» ловит синтаксис и чужой id на месте; правила темы (не меньше 12 заданий, один пропуск, ответ не среди
 * неверных…) проверяет сервер при сохранении — той же проверкой, что заливку, чтобы правила жили в одном месте.
 */
@Component({
  selector: 'app-grammar-topic-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, AutoGrowDirective],
  templateUrl: './grammar-topic-editor.component.html',
})
export class GrammarTopicEditorComponent implements OnChanges {
  @Input() topicId = '';
  @Output() saved = new EventEmitter<GrammarTopicRow>();
  @Output() closed = new EventEmitter<void>();

  text = '';
  loading = false;
  saving = false;
  problems: string[] = [];
  checkMessage: string | null = null;

  constructor(private games: GrammarGamesService, private toast: ToastService) {}

  get siteLink(): string {
    return this.games.siteLink(this.topicId);
  }

  ngOnChanges(): void {
    if (!this.topicId) return;
    this.reset();
    this.loading = true;
    this.games.topic(this.topicId).pipe(finalize(() => (this.loading = false))).subscribe({
      next: (topic) => (this.text = JSON.stringify(topic, null, 2)),
      error: (err) => (this.problems = [apiErrorText(err, 'Не удалось открыть тему')]),
    });
  }

  check(): void {
    const topic = this.parse();
    if (topic) this.checkMessage = 'JSON в порядке, id совпадает. Полные правила проверит сервер при сохранении.';
  }

  save(): void {
    const topic = this.parse();
    if (!topic) return;
    this.saving = true;
    this.games.save(this.topicId, topic).pipe(finalize(() => (this.saving = false))).subscribe({
      next: (row) => {
        this.toast.showSuccess(`Тема ${row.id} сохранена`);
        this.saved.emit(row);
      },
      error: (err) => (this.problems = this.serverProblems(apiErrorText(err, 'Не удалось сохранить тему'))),
    });
  }

  private parse(): Record<string, unknown> | null {
    this.reset();
    let value: unknown;
    try {
      value = JSON.parse(this.text);
    } catch (e) {
      this.problems = [`Не JSON: ${(e as Error).message}`];
      return null;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      this.problems = ['Тема — JSON-объект { … }'];
      return null;
    }
    const id = (value as { id?: unknown }).id;
    if (id !== this.topicId) {
      this.problems = [`id в теме (${String(id)}) не совпадает с открытой темой (${this.topicId})`];
      return null;
    }
    return value as Record<string, unknown>;
  }

  /** «Тема не прошла проверку:\n…» → строки проблем: заголовок список и так подписывает. */
  private serverProblems(text: string): string[] {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.length > 1 && lines[0].endsWith(':') ? lines.slice(1) : lines;
  }

  private reset(): void {
    this.problems = [];
    this.checkMessage = null;
  }
}
```

`grammar-topic-editor.component.html`:

```html
<section class="gg-editor">
  <header class="gg-editor__head">
    <h3>Тема {{ topicId }}</h3>
    <a mat-stroked-button [href]="siteLink" target="_blank" rel="noopener">
      <mat-icon>open_in_new</mat-icon> Открыть на сайте
    </a>
    <button mat-icon-button type="button" (click)="closed.emit()" aria-label="Закрыть"><mat-icon>close</mat-icon></button>
  </header>
  <p class="hint">
    Тема целиком в форме прототипа: правило (cards, tables, mistakes) и материал игр. Поле <code>id</code> не меняйте —
    на нём прогресс учеников. Видимость здесь не задаётся: для неё — переключатель в списке.
  </p>
  <p class="loading" *ngIf="loading">Загрузка…</p>
  <textarea class="gg-editor__json" appAutoGrow rows="20" spellcheck="false" [(ngModel)]="text" name="topic-json"
            [disabled]="loading"></textarea>
  <section class="upload-error" *ngIf="problems.length" role="alert">
    <p>Не сохранено:</p>
    <ul><li *ngFor="let p of problems">{{ p }}</li></ul>
  </section>
  <p class="gg-editor__ok" *ngIf="checkMessage">{{ checkMessage }}</p>
  <div class="gg-editor__actions">
    <button mat-stroked-button type="button" [disabled]="loading" (click)="check()">Проверить JSON</button>
    <button mat-flat-button color="primary" type="button" [disabled]="loading || saving" (click)="save()">Сохранить</button>
  </div>
</section>
```

- [ ] **Step 4: Тест проходит.** — [ ] **Step 5: Commit** — `feat(grammar-games): правка темы JSON-редактором`.

---

### Task 4: Страница — `GrammarGamesPageComponent`

**Files:** Create `src/app/feature/system/grammar-games/grammar-games-page.component.{ts,html,scss,spec.ts}`

**Interfaces:** Consumes — Tasks 1–3; `downloadBlob` (`core/utils/download-blob.util`). Produces — страница: `level`, `rows`, `lastUpload`, `uploadError`, `editingId`, `onFile()`, `setLevel()`, `toggleHidden()`, `onSaved()`, `exportZip()`.

- [ ] **Step 1: Падающий тест** — `grammar-games-page.component.spec.ts`:

```ts
import { of, Subject, throwError } from 'rxjs';
import { GrammarGamesPageComponent } from './grammar-games-page.component';

describe('GrammarGamesPageComponent — «Грамматика · игры»', () => {
  const row = { id: 'L1-01', level: 'L1', n: 1, icon: '👋', titleRu: 'To be', hidden: false, games: 12 };
  let service: { list: jasmine.Spy; upload: jasmine.Spy; setHidden: jasmine.Spy; exportZip: jasmine.Spy };
  let toast: { showSuccess: jasmine.Spy; showError: jasmine.Spy };

  function build(): GrammarGamesPageComponent {
    const c = new GrammarGamesPageComponent(service as never, toast as never);
    c.ngOnInit();
    return c;
  }

  function pick(name: string): Event {
    const input = { files: [new File(['x'], name)], value: name } as unknown as HTMLInputElement;
    return { target: input } as unknown as Event;
  }

  beforeEach(() => {
    service = {
      list: jasmine.createSpy().and.returnValue(of([row])),
      upload: jasmine.createSpy().and.returnValue(of({ topics: 125, created: 125, updated: 0, unchanged: 0, warnings: [] })),
      setHidden: jasmine.createSpy().and.returnValue(of({ ...row, hidden: true })),
      exportZip: jasmine.createSpy().and.returnValue(of(new Blob(['zip']))),
    };
    toast = { showSuccess: jasmine.createSpy(), showError: jasmine.createSpy() };
  });

  it('открывается на L1 и грузит темы уровня; смена уровня перечитывает', () => {
    const c = build();
    expect(service.list).toHaveBeenCalledWith('L1');
    expect(c.rows.length).toBe(1);
    c.setLevel('L3');
    expect(service.list).toHaveBeenCalledWith('L3');
    expect(c.editingId).toBeNull();
  });

  it('заливает html и zip, итог на странице, список перечитан', () => {
    const c = build();
    c.onFile(pick('jts-grammar-games.html'));
    expect(service.upload).toHaveBeenCalled();
    expect(c.lastUpload?.created).toBe(125);
    expect(service.list).toHaveBeenCalledTimes(2);
    c.onFile(pick('grammar-games.zip'));
    expect(service.upload).toHaveBeenCalledTimes(2);
  });

  it('чужое расширение — без запроса', () => {
    const c = build();
    c.onFile(pick('topics.json'));
    expect(service.upload).not.toHaveBeenCalled();
    expect(toast.showError).toHaveBeenCalled();
  });

  it('отказ проверки — список строк остаётся на странице', () => {
    service.upload.and.returnValue(throwError(() => ({
      status: 400, error: { messages: ['Файл не прошёл проверку:\nL1-02 · color · нужен цвет вида #9047FF'] }
    })));
    const c = build();
    c.onFile(pick('p.html'));
    expect(c.uploadError).toEqual(['L1-02 · color · нужен цвет вида #9047FF']);
    expect(c.uploading).toBeFalse();
  });

  it('стенд не ответил — повтор безопасен, так и говорим', () => {
    service.upload.and.returnValue(throwError(() => ({ status: 504 })));
    const c = build();
    c.onFile(pick('p.html'));
    expect(c.uploadError![0]).toContain('повтор того же файла ничего не испортит');
  });

  it('новая заливка снимает прошлую ошибку и итог', () => {
    const c = build();
    c.uploadError = ['старая'];
    c.lastUpload = { topics: 1, created: 1, updated: 0, unchanged: 0, warnings: [] };
    service.upload.and.returnValue(new Subject<never>());
    c.onFile(pick('p.html'));
    expect(c.uploading).toBeTrue();
    expect(c.uploadError).toBeNull();
    expect(c.lastUpload).toBeNull();
  });

  it('скрытие меняет строку из ответа сервера; отказ — тост', () => {
    const c = build();
    c.toggleHidden(c.rows[0]);
    expect(service.setHidden).toHaveBeenCalledWith('L1-01', true);
    expect(c.rows[0].hidden).toBeTrue();
    service.setHidden.and.returnValue(throwError(() => ({ status: 404, error: { messages: ['Тема не найдена'] } })));
    c.toggleHidden(c.rows[0]);
    expect(toast.showError).toHaveBeenCalledWith('Тема не найдена');
  });

  it('сохранённая в редакторе тема заменяет строку и закрывает редактор', () => {
    const c = build();
    c.editingId = 'L1-01';
    c.onSaved({ ...row, titleRu: 'To be!' });
    expect(c.rows[0].titleRu).toBe('To be!');
    expect(c.editingId).toBeNull();
  });

  it('выгрузка — файл grammar-games.zip', () => {
    const c = build();
    const download = spyOn(c, 'download');
    c.exportZip();
    expect(download).toHaveBeenCalledWith(jasmine.any(Blob), 'grammar-games.zip');
  });
});
```

- [ ] **Step 2: Запустить — падает.**

- [ ] **Step 3: Реализация** — `grammar-games-page.component.ts`:

```ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';

import {
  GrammarGamesService,
  GrammarGamesUploadResult,
  GrammarTopicRow
} from '../../../core/services/grammar-games.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorText } from '../../../core/utils/api-error-text.util';
import { downloadBlob } from '../../../core/utils/download-blob.util';
import { GrammarCoinRulesComponent } from './grammar-coin-rules.component';
import { GrammarTopicEditorComponent } from './grammar-topic-editor.component';
import { GRAMMAR_GAMES_TITLE, GRAMMAR_LEVELS } from './grammar-games.labels';

/**
 * «Грамматика · игры» (раздел «Практики» ученика): 125 тем на 5 уровнях, у каждой правило и 11–13 игр. Темы приходят
 * заливкой html прототипа методиста или zip-а (выгрузка этой же страницы) и правятся по одной. Старая «Грамматика»
 * ученика (юниты) и «Грамматика» кабинета контент-менеджера — другие разделы, эта страница их не трогает.
 */
@Component({
  selector: 'app-grammar-games-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    GrammarCoinRulesComponent, GrammarTopicEditorComponent],
  templateUrl: './grammar-games-page.component.html',
  styleUrl: './grammar-games-page.component.scss'
})
export class GrammarGamesPageComponent implements OnInit {
  readonly title = GRAMMAR_GAMES_TITLE;
  readonly levels = GRAMMAR_LEVELS;
  level = 'L1';
  rows: GrammarTopicRow[] = [];
  loading = false;
  uploading = false;
  exporting = false;
  selectedName = '';
  lastUpload: GrammarGamesUploadResult | null = null;
  /**
   * Почему не прошла заливка — строками на странице, а не только тостом: список «тема · поле · что не так» бывает
   * длинным, и методист правит по нему html, а тост исчез бы через несколько секунд.
   */
  uploadError: string[] | null = null;
  editingId: string | null = null;

  constructor(private games: GrammarGamesService, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadRows();
  }

  setLevel(level: string): void {
    this.level = level;
    this.editingId = null;
    this.loadRows();
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.html') && !name.endsWith('.htm') && !name.endsWith('.zip')) {
      this.toast.showError('Нужен html прототипа или zip с темами');
      return;
    }
    this.selectedName = file.name;
    this.uploading = true;
    this.uploadError = null;
    // итог прошлой попытки во время новой выглядел бы её итогом
    this.lastUpload = null;
    this.games.upload(file).pipe(finalize(() => (this.uploading = false))).subscribe({
      next: (result) => {
        this.lastUpload = result;
        this.toast.showSuccess(`Залито тем: ${result.topics} (новых ${result.created}, изменено ${result.updated})`);
        this.loadRows();
      },
      error: (err) => this.failUpload(err),
    });
  }

  toggleHidden(row: GrammarTopicRow): void {
    this.games.setHidden(row.id, !row.hidden).subscribe({
      next: (updated) => this.replace(updated),
      error: (err) => this.toast.showError(apiErrorText(err, 'Не удалось изменить видимость темы')),
    });
  }

  edit(row: GrammarTopicRow): void {
    this.editingId = this.editingId === row.id ? null : row.id;
  }

  onSaved(row: GrammarTopicRow): void {
    this.replace(row);
    this.editingId = null;
  }

  exportZip(): void {
    this.exporting = true;
    this.games.exportZip().pipe(finalize(() => (this.exporting = false))).subscribe({
      next: (blob) => this.download(blob, 'grammar-games.zip'),
      error: (err) => this.toast.showError(apiErrorText(err, 'Не удалось выгрузить темы')),
    });
  }

  /** Отдельным методом — чтобы тест не скачивал файл. */
  download(blob: Blob, name: string): void {
    downloadBlob(blob, name);
  }

  private loadRows(): void {
    this.loading = true;
    this.games.list(this.level).pipe(finalize(() => (this.loading = false))).subscribe({
      next: (rows) => (this.rows = rows),
      error: (err) => {
        this.rows = [];
        this.toast.showError(apiErrorText(err, 'Не удалось загрузить темы'));
      },
    });
  }

  private replace(updated: GrammarTopicRow): void {
    this.rows = this.rows.map(r => (r.id === updated.id ? updated : r));
  }

  private failUpload(err: unknown): void {
    const status = typeof (err as { status?: unknown })?.status === 'number' ? (err as { status: number }).status : 0;
    const own = apiErrorText(err, '');
    let lines: string[];
    if (own) {
      const all = own.split('\n').map(l => l.trim()).filter(Boolean);
      lines = all.length > 1 && all[0].endsWith(':') ? all.slice(1) : all;
    } else if (status === 413) {
      lines = ['Файл больше, чем пропускает стенд (HTTP 413): нужно поднять лимит тела запроса на прокси перед бэкендом'];
    } else if (status === 0 || status >= 500) {
      // заливка повторяемая (темы — upsert), поэтому, в отличие от загрузок с медиа, повторить можно сразу
      lines = [`Стенд не ответил${status ? ` (HTTP ${status})` : ''}. Проверьте список тем ниже — повтор того же файла `
        + 'ничего не испортит: заливка только обновляет темы.'];
    } else {
      lines = ['Не удалось залить файл'];
    }
    this.uploadError = lines;
    this.toast.showError(lines[0]);
  }
}
```

`grammar-games-page.component.html`:

```html
<div class="gg-page">
  <div class="page-header">
    <button mat-stroked-button type="button" [disabled]="exporting" (click)="exportZip()">
      <mat-icon>download</mat-icon> Выгрузить zip
    </button>
    <button mat-raised-button color="primary" type="button" [disabled]="uploading" (click)="fileInput.click()">
      <mat-icon>upload_file</mat-icon> Загрузить html или zip
    </button>
    <input #fileInput type="file" accept=".html,.htm,.zip,text/html,application/zip" hidden (change)="onFile($event)">
  </div>

  <p class="hint">
    {{ title }} — раздел «Практики» ученика: 125 тем на 5 уровнях, у темы правило и 11–13 игр. Загрузите
    <b>html прототипа методиста</b> или <b>zip</b> из «Выгрузить zip» (перенос с другого стенда). Ошибка в любой теме
    отклоняет загрузку целиком; темы, которых нет в файле, не удаляются; скрытые остаются скрытыми.
  </p>

  <div class="file-status" *ngIf="uploading">
    <mat-spinner diameter="22"></mat-spinner><span>Разбор {{ selectedName || 'файла' }}…</span>
  </div>

  <section class="upload-error" *ngIf="uploadError && !uploading" role="alert">
    <mat-icon>error_outline</mat-icon>
    <ul><li *ngFor="let line of uploadError">{{ line }}</li></ul>
  </section>

  <section class="upload-result" *ngIf="lastUpload">
    <h3>Итог загрузки</h3>
    <p>
      Тем в файле: <b>{{ lastUpload.topics }}</b> — новых <b>{{ lastUpload.created }}</b>, изменено
      <b>{{ lastUpload.updated }}</b>, без изменений <b>{{ lastUpload.unchanged }}</b>.
    </p>
    <ul class="warnings" *ngIf="lastUpload.warnings.length"><li *ngFor="let w of lastUpload.warnings">{{ w }}</li></ul>
  </section>

  <nav class="gg-levels">
    <button *ngFor="let l of levels" type="button" class="gg-level" [class.is-active]="l.id === level"
            (click)="setLevel(l.id)">
      <b>{{ l.id }}</b><span>{{ l.range }}</span>
    </button>
  </nav>

  <div class="loading" *ngIf="loading"><mat-spinner diameter="28"></mat-spinner></div>
  <div class="empty-state" *ngIf="!loading && !rows.length">
    <mat-icon>extension</mat-icon><p>Тем уровня {{ level }} нет. Загрузите прототип.</p>
  </div>

  <table class="gg-topics" *ngIf="!loading && rows.length">
    <ng-container *ngFor="let row of rows">
      <tr [class.is-hidden]="row.hidden">
        <td class="gg-topics__n">{{ row.n }}</td>
        <td class="gg-topics__icon">{{ row.icon }}</td>
        <td><b>{{ row.titleRu }}</b><span class="gg-topics__id">{{ row.id }}</span></td>
        <td>{{ row.games }} игр</td>
        <td class="gg-topics__actions">
          <button mat-stroked-button type="button" (click)="toggleHidden(row)">
            {{ row.hidden ? 'Показать' : 'Скрыть' }}
          </button>
          <button mat-stroked-button type="button" (click)="edit(row)">
            {{ editingId === row.id ? 'Закрыть' : 'Править' }}
          </button>
        </td>
      </tr>
      <tr *ngIf="editingId === row.id" class="gg-topics__editor">
        <td colspan="5">
          <app-grammar-topic-editor [topicId]="row.id" (saved)="onSaved($event)" (closed)="editingId = null">
          </app-grammar-topic-editor>
        </td>
      </tr>
    </ng-container>
  </table>

  <app-grammar-coin-rules></app-grammar-coin-rules>
</div>
```

`grammar-games-page.component.scss` — блоки страницы Prepositions (`.page-header`, `.hint`, `.loading`, `.empty-state`, `.file-status`, `.upload-error`, `.upload-result`) скопировать из `prepositions-page.component.scss` под корнем `.gg-page`, плюс:

```scss
.gg-levels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}

.gg-level {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 96px;
  padding: 8px 14px;
  border: 1px solid var(--jts-border, rgba(0, 0, 0, 0.12));
  border-radius: 12px;
  background: var(--jts-surface, #fff);
  cursor: pointer;

  span { font-size: 12px; color: var(--jts-text-muted, rgba(0, 0, 0, 0.55)); }

  &.is-active {
    border-color: var(--jts-primary, #9047ff);
    box-shadow: 0 0 0 1px var(--jts-primary, #9047ff);
  }
}

.gg-topics {
  width: 100%;
  border-collapse: collapse;

  td { padding: 8px; border-bottom: 1px solid var(--jts-border, rgba(0, 0, 0, 0.08)); vertical-align: middle; }
  tr.is-hidden td { opacity: 0.55; }
  &__n { width: 32px; color: var(--jts-text-muted, rgba(0, 0, 0, 0.55)); }
  &__icon { width: 32px; font-size: 20px; }
  &__id { margin-left: 8px; font-size: 12px; color: var(--jts-text-muted, rgba(0, 0, 0, 0.55)); }
  &__actions { text-align: right; white-space: nowrap; button { margin-left: 6px; } }
  &__editor td { background: var(--jts-surface-muted, rgba(144, 71, 255, 0.04)); }
}

.gg-editor {
  &__head { display: flex; align-items: center; gap: 8px; h3 { margin: 0 auto 0 0; } }
  &__json { width: 100%; font-family: ui-monospace, Consolas, monospace; font-size: 13px; box-sizing: border-box; }
  &__actions { display: flex; gap: 8px; margin-top: 8px; }
  &__ok { color: var(--jts-success, #1b7f3b); }
}

.gg-coins {
  margin-top: 32px;
  &__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px 16px; margin: 12px 0; }
  &__row { display: flex; align-items: center; justify-content: space-between; gap: 8px; input { width: 64px; } }
}
```

> Стили редактора и панели монет живут в scss страницы: оба компонента рисуются только внутри неё. Поэтому у страницы `ViewEncapsulation` по умолчанию не подходит — стили не дойдут до дочерних. Добавить в `@Component` страницы `encapsulation: ViewEncapsulation.None` (импорт из `@angular/core`), а корень `.gg-page` держит правила в пределах страницы.

- [ ] **Step 4: Тест проходит.** — [ ] **Step 5: Commit** — `feat(grammar-games): страница заливки, тем по уровням и выгрузки`.

---

### Task 5: Маршруты, вкладка «Практики и тестов», меню контент-менеджера

**Files:** Modify `src/app/feature/system/system.routes.ts`, `src/app/feature/system/practice/practice.component.ts` (+ `.spec.ts`), `src/app/feature/system/system.component.ts`

- [ ] **Step 1: Падающий тест** — в `practice.component.spec.ts`: добавить мок `grammarGames = { list: jasmine.createSpy().and.returnValue(of(new Array(125).fill({}))) }`, двенадцатый аргумент конструктора, и ожидания:

```ts
// в списке подписей — после 'Cartoon World':
'Cartoon World', 'Грамматика · игры', 'Мнемотехники', …
// в счётчиках — после 726:
726, 125, 6, …
```

- [ ] **Step 2: Запустить — падает** (нет вкладки).

- [ ] **Step 3: Реализация**

`practice.component.ts`:
- импорт `GrammarGamesService` и `GRAMMAR_GAMES_TITLE`;
- вкладка после `cartoons`:

  ```ts
  // «Грамматика · игры»: заливка прототипа или zip, правка тем и монеты за игру (кнопки внутри вкладки)
  { segment: 'grammar-games', label: GRAMMAR_GAMES_TITLE, path: '/system/grammar-games', count: null },
  ```

- параметр конструктора `private grammarGamesService: GrammarGamesService` последним;
- в `forkJoin`: `grammarGames: safe(this.grammarGamesService.list().pipe(map(list => list.length)))`, в `counts` — `'grammar-games': grammarGames`.

`system.routes.ts` — внутри детей оболочки «Практика и тесты», после `cartoons`:

```ts
// «Грамматика · игры»: заливка прототипа, правка тем, монеты; бэкенд пускает ADMIN и CONTENT_MANAGER
{
  path: 'grammar-games',
  loadComponent: () => import('./grammar-games/grammar-games-page.component').then(m => m.GrammarGamesPageComponent),
  canActivate: [roleGuard(['ADMIN', 'CONTENT_MANAGER'])],
},
```

и среди маршрутов кабинета контент-менеджера, после `content/grammar`:

```ts
// Та же страница для контент-менеджера: «Практики и тестов» у него нет, а её оболочка зовёт ручки чужих разделов
{
  path: 'content/grammar-games',
  canActivate: [roleGuard(['CONTENT_MANAGER', 'ADMIN'])],
  loadComponent: () => import('./grammar-games/grammar-games-page.component').then(m => m.GrammarGamesPageComponent),
},
```

`system.component.ts` — в ветке `role === 'CONTENT_MANAGER'` после пункта «Грамматика»:

```ts
{title: 'Грамматика · игры', iconName: 'sports_esports', route: '/system/content/grammar-games'} as NavItem,
```

- [ ] **Step 4: Все тесты и сборка**

```bash
npx ng test --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run test:theme
npx ng build --configuration=production
```

Expected: новые тесты зелёные, падений, которых нет на `origin/develop`, нет; сборка проходит.

- [ ] **Step 5: Commit** — `feat(grammar-games): вкладка «Практики и тестов» и пункт меню контент-менеджера`.

---

### Task 6: Живая проверка, ревью, PR

- [ ] Поднять админку против локального бэкенда нельзя (нет Docker), поэтому живой прогон — против дев-стенда, после выката PR jtsapp/backend#313. До выката — снимки страницы с подменёнными ответами (Playwright `page.route` на `**/admin/grammar-games/**` и `**/admin/practice/coin-rules**`, роль ADMIN в `localStorage` — как в соседних проверках админки). Снимки: список уровня, итог заливки с ошибками, открытый редактор с ошибками сервера, панель монет; ширина 1280 и 390.
- [ ] Одно ревью ветки субагентом (`git diff origin/develop...HEAD`), найденное — поправить, повторить Task 5 Step 4.
- [ ] PR — только по слову владельца: `gh pr create --repo jtsapp/web-admin --base develop --head feat/grammar-games`, в описании — что страница делает, что проверено, что ждёт бэкенд #313, порядок мержа (бэкенд → админка → сайт); последняя строка `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Self-review

- **Спека A2:**
  - маршрут и карточка «Практики и тестов», роли ADMIN и CONTENT_MANAGER — Task 5;
  - заливка и итог — Task 4;
  - вкладки L1–L5, список, «скрыть / показать» — Task 4;
  - JSON-редактор с проверкой, сохранением и «Открыть на сайте» — Task 3;
  - выгрузка zip — Task 4;
  - монеты 0–10 — Task 2;
  - тесты — в каждой задаче.
- **Отличие от спеки:** «Проверить» проверяет только JSON и id; полные правила — на сохранении, ручки «проверить без записи» у бэкенда нет. Ради одной кнопки бэкенд не трогаем.
- **Имена между задачами совпадают:** `GrammarGamesService.list/topic/save/setHidden/exportZip/siteLink/upload`, `GrammarTopicRow`, `GrammarGamesUploadResult`, `GRAMMAR_GAMES`, `GRAMMAR_LEVELS`, `GRAMMAR_GAMES_TITLE`, `COIN_RULE_PREFIX`.
