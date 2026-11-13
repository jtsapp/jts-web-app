# Just to Study Birge — web-admin (кабинет контент-менеджера) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Правило владельца: субагенты по задачам — без ревью между задачами; одно ревью ветки в конце (задача 12), найденное
> правится сразу.

**Goal:** в web-admin у контент-менеджера и админа появляется блок меню «Birge» с четырьмя экранами модерации ленты
студентов — Очередь проверки, Журнал решений, Настройки модерации и Лента — поверх ручек `/admin/birge/**`.

**Architecture:** служба ручек `core/services/birge-moderation.service.ts` и типы `core/models/birge.models.ts` строго
по §5.3 спеки; подписи кодов и чистые правила (пороги, словари, причина отказа, сутки по Алматы) — отдельными модулями
под тестами; экраны — standalone-компоненты в `feature/system/birge/`, у каждого сверху общая сводка дня, у очереди и
ленты — общая карточка поста. Блок меню «прямой» (`direct: true`): пункт сразу открывает очередь, разделы — вкладками
шапки кабинета. Каждый экран сам подключает свой раздел меню и маршрут — так сборка проверяет его шаблон сразу, а
спеки навигации остаются зелёными на каждом коммите.

**Tech Stack:** Angular 17.3 (standalone, FormsModule/ngModel, Angular Material 17), RxJS 7, SCSS, Karma + Jasmine.

**Источники:** спека `C:\Users\nural\Desktop\jts-web-app-birge\docs\superpowers\specs\2026-11-11-birge-community-design.md`
(§8 — экраны, §5.2/§5.3 — контракт, §3–§4 — смысл полей) и прототип
`…\specs\2026-11-11-birge-prototype.html` (роль «Контент-менеджер», функция `manager()`).

## Global Constraints

- Ручки — `/admin/birge/**`, доступ `CONTENT_MANAGER` и `ADMIN` (спека §2, §5.2). Преподавателю раздела нет.
- Формы JSON — ровно §5.3: имена полей не переименовываются; camelCase; время — ISO-8601 с зоной; списки с курсором —
  `{items, nextCursor}`, `nextCursor: null` — конец; курсор — непрозрачная строка, уходит в `cursor` как есть.
  Расхождение с контрактом — не правка «по месту», а вопрос владельцу.
- Причины риска — ровно коды §5.3; `AI_UNAVAILABLE` и `REPORTS` приходят со `score: 0` — показываются
  меткой без числа.
- Порядок `pending` в очереди задаёт сервер (по времени входа в очередь) — клиент его не меняет.
- Настройки (§3.5): `autoPublishBelow` 5–60 и не выше `autoRejectFrom − 5`; `autoRejectFrom` 40–95 и не ниже
  `autoPublishBelow + 5`; `dailyLimit` 1–10; `overflowMode` `reject | tomorrow | hidden`; `reportsToHide` 1–10;
  по умолчанию 30 / 70 / 3 / `reject` / 3. Запись словаря пустая или короче 3 букв (кроме записей с `*`) отклоняется.
- Отказ менеджера: `reason` — `INSULT | PROFANITY | ADS_CONTACTS | OFF_TOPIC | OTHER`; `note` обязателен при `OTHER`,
  до 200 символов.
- Отмена из журнала — только решения AI, кроме `queued*`; повторная — 409 (§5.2). Кнопку показывает поле `revertible`.
  Отмена пишется в журнал решением менеджера (`auto_published` → `hidden`, остальные → `restored`) и шлёт автору
  уведомление: «Скрыть» — `BIRGE_POST_HIDDEN`, «Опубликовать» — `BIRGE_POST_APPROVED`; отмена `hidden_overflow` автора
  не уведомляет (он и так видел пост опубликованным).
- Действия по статусу (§5.2, остальное — 409): `approve`/`reject` — `pending`, `tomorrow`, `hidden` по жалобам без
  решения; `hide` — `published`; `restore` — `hidden` (любая причина), `rejected`. Очередь `pending` включает скрытые
  по жалобам без решения (`status = hidden`, `queueSource = reports`).
- `summary.autoRejected` = `auto_rejected` + `auto_rejected_overflow` + `auto_feedback`.
- Ошибки — `{messages: ["…"]}` (§5); 429 у ручек менеджера не бывает.
- Сутки лимита и задача «на завтра» — `Asia/Almaty` (UTC+5, в web-admin это `SCHOOL_DATE_OFFSET = '+0500'`).
- Меню: блок «Birge», значок `forum`, у `CONTENT_MANAGER` и `ADMIN`: Очередь проверки `/birge/queue`, Журнал решений
  `/birge/log`, Настройки модерации `/birge/settings`, Лента `/birge/feed` (в web-admin все адреса кабинета под
  `/system`: `/system/birge/queue` и т. д.).
- Компоненты — `src/app/feature/system/birge/`, служба — `src/app/core/services/birge-moderation.service.ts`.
- GIF нет (решение владельца): вложения — только фото.
- Конвенции web-admin: standalone-компоненты; цвет — `var(--jts-…, #запасной)` или пара `color-mix(…, … calc(var(--jts-dark, 0) * 100%))`
  (сторож `npm run test:theme` идёт в CI); любой `<select>` — с `UnifiedSelectModule` в imports (`npm run test:selects`);
  корень экрана — класс `.jts-screen`, своего `<h1>` нет — заголовок даёт шапка кабинета (`npm run test:frame`);
  ошибки бэкенда — тело `{messages: [...]}`, читать через `apiErrorText`; комментарии по-русски и объясняют «почему»;
  строки экранов — по-русски в шаблоне (как у «Скорочтения» и «Грамматики · игр»).
- Karma: один spec — `npx ng test --watch=false --browsers=ChromeHeadless --include=<путь>`; страницы — без TestBed
  (`new Component(stubs)`), DOM-тесты — только там, где важны кнопки (карточка, окно отказа, очередь); в spec маршрутов
  `canActivateAs` — один раз на `it`.
- Команды плана — для Git Bash; рабочая копия `C:\Users\nural\Desktop\web-admin` (ветка `develop`) не трогается.
- Коммиты заканчиваются строкой `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Не пушить: PR — по команде
  владельца после финального ревью.

---

## Контракт ручек (§5.2 / §5.3 спеки)

```
GET  /admin/birge/summary                         → {autoPublished, autoRejected, pending, tomorrow, escalated, limit}
GET  /admin/birge/queue                           → {pending: ManagerPost[], tomorrow: ManagerPost[]}   (pending — и скрытые по жалобам без решения)
POST /admin/birge/posts/{id}/decision             {action, reason, note} → ManagerPost   (reason/note null у approve/hide/restore)
GET  /admin/birge/log?from=&to=&decision=&author=&cursor=   → {items: LogItem[], nextCursor}
POST /admin/birge/log/{id}/revert                 → LogItem (с revertedAt); повтор — 409; в журнал — hidden / restored; уведомление автору (кроме hidden_overflow)
GET  /admin/birge/posts?status=&cursor=           → {items: ManagerPost[], nextCursor}   (с комментариями, kind)
GET  /admin/birge/settings                        → Settings
PUT  /admin/birge/settings                        {autoPublishBelow, autoRejectFrom, dailyLimit, overflowMode, reportsToHide, dictionaries} → Settings
```

ManagerPost несёт `hits: string[]` (найденные фрагменты, как их написал ученик) и `media[].url: string | null`
(null — файл удалён); LogItem — `rejectReason: {code, note} | null` и `revertedBy: {id, name} | null`.
Ошибки — `{messages: ["…"]}` (GlobalExceptionHandler бэкенда, §5), читает их `apiErrorText`.

## Карта файлов

```
src/app/core/models/birge.models.ts                          — типы §5.3
src/app/core/services/birge-moderation.service.ts (+ .spec)  — восемь ручек
src/app/feature/system/birge/
  birge.labels.ts (+ .spec)          — подписи кодов: причины, решения, статусы, темы, пометки очереди, фото
  birge.rules.ts (+ .spec)           — пороги, словари, форма настроек, причина отказа, действия ленты, Алматы, ошибки
  birge.testing.ts                   — образцы ManagerPost / LogItem / Settings / Summary для spec (в сборку не попадает)
  _birge.scss                        — цвета раздела и общие куски стилей (миксины)
  birge-summary.component.*          — сводка дня над всеми экранами (+ значок очереди в меню)
  birge-post-card.component.*        — пост глазами модератора (очередь и лента)
  birge-reject-dialog.component.*    — окно «Отклонить» с причиной
  birge-queue-page.component.*       — Очередь проверки
  birge-log-page.component.*         — Журнал решений
  birge-settings-page.component.*    — Настройки модерации
  birge-feed-page.component.*        — Лента со статусами
src/app/feature/system/role-navigation/role-navigation.config.ts (+ .spec)   — блок «Birge»
src/app/feature/system/system.routes.ts (+ .spec)                            — четыре маршрута
```

---

### Task 1: Worktree, зависимости и исходная проверка

**Files:** ничего не создаётся в коде; создаётся worktree `C:\Users\nural\Desktop\web-admin-birge` на ветке `feat/birge`.

**Interfaces:**
- Produces: рабочая папка `C:/Users/nural/Desktop/web-admin-birge` от `origin/develop` со своими `node_modules`
  (не junction: в основной копии `node_modules` старше `origin/develop` — там нет `@tiptap/*`, `jssip`, `pdfjs-dist`,
  `opus-recorder`, и `system.routes.spec` не соберётся); файл базовой линии
  `C:/Users/nural/Desktop/web-admin-birge/../birge-karma-baseline.txt` с итогом полного прогона Karma.

- [ ] **Step 1: Проверить место на диске и что ветки ещё нет**

```bash
df -h /c | tail -1
git -C "C:/Users/nural/Desktop/web-admin" fetch origin develop
git -C "C:/Users/nural/Desktop/web-admin" show-ref --verify --quiet refs/heads/feat/birge && echo "ВЕТКА УЖЕ ЕСТЬ" || echo "ветки нет"
ls -d "C:/Users/nural/Desktop/web-admin-birge" 2>/dev/null && echo "ПАПКА УЖЕ ЕСТЬ" || echo "папки нет"
```

Expected: свободно не меньше 3 ГБ, «ветки нет», «папки нет». Если ветка или папка есть — остановиться и спросить
владельца (не перезаписывать чужую работу).

- [ ] **Step 2: Создать worktree от origin/develop**

```bash
git -C "C:/Users/nural/Desktop/web-admin" worktree add -b feat/birge "C:/Users/nural/Desktop/web-admin-birge" origin/develop
git -C "C:/Users/nural/Desktop/web-admin-birge" log -1 --format="%h %s"
```

Expected: `Preparing worktree (new branch 'feat/birge')` и последний коммит `origin/develop`.

- [ ] **Step 3: Поставить зависимости (как CI: `npm ci --force`)**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && npm ci --force --no-audit --no-fund
ls -d node_modules/@tiptap node_modules/jssip node_modules/pdfjs-dist node_modules/opus-recorder
```

Expected: `added NNNN packages`, все четыре папки на месте.

- [ ] **Step 4: Исходная проверка навигации и маршрутов**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless \
  --include=src/app/feature/system/role-navigation/role-navigation.config.spec.ts \
  --include=src/app/feature/system/role-navigation/navigation-coverage.spec.ts \
  --include=src/app/feature/system/role-navigation/cabinet-navigation.guard.spec.ts \
  --include=src/app/feature/system/system.routes.spec.ts
```

Expected: `TOTAL: N SUCCESS`. Если что-то красное — записать имена тестов: это базовая линия, не наша поломка.

- [ ] **Step 5: Базовая линия полного прогона (фоном, 10–20 минут)**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless > ../birge-karma-baseline.txt 2>&1; tail -5 ../birge-karma-baseline.txt
```

Expected: последняя строка `TOTAL: N SUCCESS` или `TOTAL: K FAILED, M SUCCESS` — число и имена упавших записать; в задаче
12 итог сравнивается с этой линией. Коммита в этой задаче нет.

---

### Task 2: Модели и служба ручек

**Files:**
- Create: `src/app/core/models/birge.models.ts`
- Create: `src/app/core/services/birge-moderation.service.ts`
- Test: `src/app/core/services/birge-moderation.service.spec.ts`

**Interfaces:**
- Produces (типы, `birge.models.ts`): `BirgeReasonCode`, `BirgeReason {code, score}`, `BirgeAuthor {id, name, level, avatarUrl}`,
  `BirgePerson {id, name}`, `BirgeTopic`, `BirgePostStatus`, `BirgeHiddenReason`, `BirgeQueueSource`, `BirgeImageCategory`,
  `BirgeMediaModeration {state, category, confidence}`, `BirgeManagerMedia {id, url, width, height, moderation}`,
  `BirgeRejectCode`, `BirgeRejectReason {code, note}`, `ManagerPost` (с `hits: string[]`), `BirgeQueue {pending, tomorrow}`, `BirgeAction`,
  `BirgeDecisionBody {action, reason, note}`, `BirgeAiDecision`, `BirgeManagerDecision`, `BirgeDecision`, `BirgeLogItem`
  (с `rejectReason: BirgeRejectReason | null`),
  `BirgeLogFilter {from, to, decision, author}`, `BirgePage<T> {items, nextCursor}`, `BirgeSummary`, `BirgeOverflowMode`,
  `BirgeDictionaries {profanity, complaint, criticism}`, `BirgeSettingsInput`, `BirgeSettings`.
- Produces (служба): `BirgeModerationService.summary(): Observable<BirgeSummary>`, `.queue(): Observable<BirgeQueue>`,
  `.decide(postId: number, body: BirgeDecisionBody): Observable<ManagerPost>`,
  `.log(filter: BirgeLogFilter, cursor?: string | null): Observable<BirgePage<BirgeLogItem>>`,
  `.revert(logId: number): Observable<BirgeLogItem>`,
  `.posts(status: BirgePostStatus | null, cursor?: string | null): Observable<BirgePage<ManagerPost>>`,
  `.settings(): Observable<BirgeSettings>`, `.saveSettings(input: BirgeSettingsInput): Observable<BirgeSettings>`.

- [ ] **Step 1: Failing test — служба**

`src/app/core/services/birge-moderation.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { BirgeModerationService } from './birge-moderation.service';
import { BirgeLogFilter, BirgeSettingsInput } from '../models/birge.models';

describe('BirgeModerationService — ручки /admin/birge', () => {
  let service: BirgeModerationService;
  let http: HttpTestingController;
  const noFilter: BirgeLogFilter = { from: '', to: '', decision: '', author: '' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [BirgeModerationService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(BirgeModerationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('сводка, очередь и настройки — GET без параметров', () => {
    service.summary().subscribe();
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/admin/birge/summary')).flush({});
    service.queue().subscribe();
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/admin/birge/queue')).flush({ pending: [], tomorrow: [] });
    service.settings().subscribe();
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/admin/birge/settings')).flush({});
  });

  it('решение по посту — POST decision телом как в контракте', () => {
    service.decide(101, { action: 'reject', reason: 'OTHER', note: 'Реклама курса' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/admin/birge/posts/101/decision'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ action: 'reject', reason: 'OTHER', note: 'Реклама курса' });
    req.flush({});

    // approve / hide / restore — reason и note null (контракт это допускает)
    service.decide(102, { action: 'approve', reason: null, note: null }).subscribe();
    const approve = http.expectOne((r) => r.url.endsWith('/admin/birge/posts/102/decision'));
    expect(approve.request.body).toEqual({ action: 'approve', reason: null, note: null });
    approve.flush({});
  });

  it('журнал: пустые фильтры не уходят, заполненные — как есть, автор без крайних пробелов, курсор — непрозрачной строкой', () => {
    service.log(noFilter).subscribe();
    const all = http.expectOne((r) => r.url.endsWith('/admin/birge/log'));
    expect(all.request.method).toBe('GET');
    expect(all.request.params.keys()).toEqual([]);
    all.flush({ items: [], nextCursor: null });

    service.log({ from: '2026-11-01', to: '2026-11-11', decision: 'auto_feedback', author: '  Аружан ' }, 'eyJpZCI6OSwgImF0IjoxfQ==').subscribe();
    const page = http.expectOne((r) => r.url.endsWith('/admin/birge/log'));
    expect(page.request.params.get('from')).toBe('2026-11-01');
    expect(page.request.params.get('to')).toBe('2026-11-11');
    expect(page.request.params.get('decision')).toBe('auto_feedback');
    expect(page.request.params.get('author')).toBe('Аружан');
    expect(page.request.params.get('cursor')).toBe('eyJpZCI6OSwgImF0IjoxfQ==');
    page.flush({ items: [], nextCursor: null });
  });

  it('отмена решения AI — POST revert', () => {
    service.revert(9).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/admin/birge/log/9/revert'));
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('лента: статус и курсор уходят, только если заданы', () => {
    service.posts(null).subscribe();
    const all = http.expectOne((r) => r.url.endsWith('/admin/birge/posts'));
    expect(all.request.params.keys()).toEqual([]);
    all.flush({ items: [], nextCursor: null });

    service.posts('hidden', 'abc').subscribe();
    const hidden = http.expectOne((r) => r.url.endsWith('/admin/birge/posts'));
    expect(hidden.request.params.get('status')).toBe('hidden');
    expect(hidden.request.params.get('cursor')).toBe('abc');
    hidden.flush({ items: [], nextCursor: null });
  });

  it('настройки — PUT только правимых полей, без updatedAt и updatedBy', () => {
    const input: BirgeSettingsInput = {
      autoPublishBelow: 25, autoRejectFrom: 75, dailyLimit: 5, overflowMode: 'tomorrow', reportsToHide: 4,
      dictionaries: { profanity: ['бля', '*пизд'], complaint: ['развод'], criticism: ['дорого'] },
    };
    service.saveSettings(input).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/admin/birge/settings'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(input);
    req.flush({ ...input, updatedAt: null, updatedBy: null });
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/services/birge-moderation.service.spec.ts`
Expected: FAIL — `Cannot find module './birge-moderation.service'` (и `'../models/birge.models'`).

- [ ] **Step 3: Implement — модели**

`src/app/core/models/birge.models.ts`:

```ts
/**
 * Birge — лента студентов с автоматической модерацией. Формы /admin/birge/** — ровно §5.3 спеки jts-web-app
 * docs/superpowers/specs/2026-11-11-birge-community-design.md: по ним параллельно пишутся бэкенд и веб, поэтому имена
 * полей здесь не переименовываются и не «улучшаются».
 */

/** Причина риска. Подписи держит web-admin (birge.labels.ts): сервер отдаёт только код. */
export type BirgeReasonCode =
  | 'PROFANITY' | 'IMAGE_UNSAFE' | 'INSULT' | 'HARASSMENT' | 'PLATFORM_COMPLAINT' | 'TOXICITY' | 'MASKED_SUSPECT'
  | 'LINK_OR_CONTACT' | 'SPAM' | 'SOFT_CRITICISM' | 'CAPS' | 'AI_UNAVAILABLE' | 'REPORTS';

export interface BirgeReason {
  code: BirgeReasonCode;
  /** AI_UNAVAILABLE и REPORTS приходят со score 0: это метки, в формулу риска они не входят. */
  score: number;
}

/** Автор поста. level — A0–C2 или null (нет уровня — без плашки). */
export interface BirgeAuthor {
  id: number;
  name: string;
  level: string | null;
  avatarUrl: string | null;
}

/** Человек в журнале: автор, модератор, отменивший решение. */
export interface BirgePerson {
  id: number;
  name: string;
}

export type BirgeTopic = 'GRAMMAR' | 'SPEAKING' | 'VOCABULARY' | 'MOTIVATION' | 'QUESTION';
export type BirgePostStatus = 'published' | 'pending' | 'tomorrow' | 'rejected' | 'hidden';
export type BirgeHiddenReason = 'overflow' | 'reports' | 'manager';
export type BirgeQueueSource = 'risk' | 'reports' | 'ai_unavailable';
export type BirgeImageCategory = 'ok' | 'sexual' | 'violence' | 'weapon' | 'drugs' | 'offensive_gesture' | 'other_unsafe';

/** Итог проверки фото (Claude vision при загрузке). unchecked — сервис не ответил. */
export interface BirgeMediaModeration {
  state: 'ok' | 'flagged' | 'unchecked';
  category: BirgeImageCategory | null;
  confidence: number | null;
}

/**
 * Фото поста. url — null, когда файла уже нет: фото с IMAGE_UNSAFE сервер стирает сразу после решения, а категория
 * у менеджера остаётся (спека §4, «Медиа»).
 */
export interface BirgeManagerMedia {
  id: number;
  url: string | null;
  width: number;
  height: number;
  moderation: BirgeMediaModeration | null;
}

/** Причина ручного отказа: её видит автор в уведомлении. OTHER — только с заметкой. */
export type BirgeRejectCode = 'INSULT' | 'PROFANITY' | 'ADS_CONTACTS' | 'OFF_TOPIC' | 'OTHER';

export interface BirgeRejectReason {
  code: BirgeRejectCode;
  note: string | null;
}

/** Пост глазами менеджера: ветка или комментарий со всеми полями модерации. */
export interface ManagerPost {
  id: number;
  parentId: number | null;
  kind: 'thread' | 'comment';
  /** У комментария — первые 80 символов его ветки. */
  threadPreview: string | null;
  author: BirgeAuthor;
  /** У комментария темы нет. */
  topic: BirgeTopic | null;
  text: string;
  continuations: string[];
  /** Найденные фрагменты, как их написал ученик («х@й»), — как hits ответа публикации. */
  hits: string[];
  media: BirgeManagerMedia[];
  /** hidden с hiddenReason = reports и без решения стоит в очереди вместе с pending (спека §3.4). */
  status: BirgePostStatus;
  hiddenReason: BirgeHiddenReason | null;
  queueSource: BirgeQueueSource | null;
  risk: number;
  reasons: BirgeReason[];
  reportsCount: number;
  rejectReason: BirgeRejectReason | null;
  createdAt: string;
  moderatedAt: string | null;
}

export interface BirgeQueue {
  pending: ManagerPost[];
  tomorrow: ManagerPost[];
}

export type BirgeAction = 'approve' | 'reject' | 'hide' | 'restore';

/** Тело POST /admin/birge/posts/{id}/decision: reason — только у reject, note обязателен при OTHER. */
export interface BirgeDecisionBody {
  action: BirgeAction;
  reason: BirgeRejectCode | null;
  note: string | null;
}

export type BirgeAiDecision =
  | 'auto_published' | 'auto_rejected' | 'auto_rejected_overflow' | 'auto_feedback' | 'queued' | 'queued_tomorrow'
  | 'hidden_overflow' | 'queued_ai_unavailable' | 'hidden_reports';
export type BirgeManagerDecision = 'approved' | 'rejected' | 'hidden' | 'restored';
export type BirgeDecision = BirgeAiDecision | BirgeManagerDecision;

/** Строка журнала решений. */
export interface BirgeLogItem {
  id: number;
  postId: number;
  createdAt: string;
  actorType: 'ai' | 'manager';
  /** null у решения AI. */
  actor: BirgePerson | null;
  author: BirgePerson;
  /** До 80 символов. */
  textPreview: string;
  risk: number;
  decision: BirgeDecision;
  reasons: BirgeReason[];
  note: string | null;
  /** У ручного отказа — причина и заметка модератора, иначе null. */
  rejectReason: BirgeRejectReason | null;
  /** Можно ли отменить, решает сервер: только решения AI, кроме «в очередь», и ещё не отменённые. */
  revertible: boolean;
  revertedAt: string | null;
  revertedBy: BirgePerson | null;
}

/** Фильтры журнала. Пустая строка — без этого фильтра. */
export interface BirgeLogFilter {
  /** YYYY-MM-DD по Алматы. */
  from: string;
  to: string;
  decision: BirgeDecision | '';
  /** Подстрока имени автора. */
  author: string;
}

/** Список с курсором: nextCursor = null — конец. Курсор непрозрачный — клиент передаёт его как есть, не разбирая. */
export interface BirgePage<T> {
  items: T[];
  nextCursor: string | null;
}

/** Сегодня по Алматы. escalated / limit — сколько ручных заявок из дневного лимита уже ушло в очередь. */
export interface BirgeSummary {
  autoPublished: number;
  autoRejected: number;
  pending: number;
  tomorrow: number;
  escalated: number;
  limit: number;
}

export type BirgeOverflowMode = 'reject' | 'tomorrow' | 'hidden';

export interface BirgeDictionaries {
  profanity: string[];
  complaint: string[];
  criticism: string[];
}

/** Что менеджер правит и шлёт PUT'ом. */
export interface BirgeSettingsInput {
  autoPublishBelow: number;
  autoRejectFrom: number;
  dailyLimit: number;
  overflowMode: BirgeOverflowMode;
  reportsToHide: number;
  dictionaries: BirgeDictionaries;
}

/** Ответ GET и PUT. updatedAt/updatedBy — null, пока настройки по умолчанию никто не правил. */
export interface BirgeSettings extends BirgeSettingsInput {
  updatedAt: string | null;
  updatedBy: BirgePerson | null;
}
```

- [ ] **Step 4: Implement — служба**

`src/app/core/services/birge-moderation.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BaseService } from './base.service';
import {
  BirgeDecisionBody, BirgeLogFilter, BirgeLogItem, BirgePage, BirgePostStatus, BirgeQueue, BirgeSettings,
  BirgeSettingsInput, BirgeSummary, ManagerPost
} from '../models/birge.models';

/**
 * Birge — модерация ленты студентов: ручки /admin/birge/** (CONTENT_MANAGER и ADMIN). Пустой фильтр в запрос не уходит:
 * «decision=» сервер прочёл бы как решение с пустым кодом, а не «любое». Курсор непрозрачный: что внутри, знает только
 * сервер, поэтому nextCursor уходит обратно как есть.
 */
@Injectable({ providedIn: 'root' })
export class BirgeModerationService extends BaseService {

  constructor(private http: HttpClient) {
    super();
  }

  /** Сегодня по Алматы: что AI решил сам, сколько ждёт и сколько ручных заявок из лимита ушло. */
  summary(): Observable<BirgeSummary> {
    return this.http.get<BirgeSummary>(this.url('/admin/birge/summary'));
  }

  queue(): Observable<BirgeQueue> {
    return this.http.get<BirgeQueue>(this.url('/admin/birge/queue'));
  }

  /** approve / reject / hide / restore. Ответ — пост с новым статусом. */
  decide(postId: number, body: BirgeDecisionBody): Observable<ManagerPost> {
    return this.http.post<ManagerPost>(this.url(`/admin/birge/posts/${postId}/decision`), body);
  }

  log(filter: BirgeLogFilter, cursor: string | null = null): Observable<BirgePage<BirgeLogItem>> {
    let params = new HttpParams();
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    if (filter.decision) params = params.set('decision', filter.decision);
    const author = filter.author.trim();
    if (author) params = params.set('author', author);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<BirgePage<BirgeLogItem>>(this.url('/admin/birge/log'), { params });
  }

  /** Отмена решения AI. Повторная отмена — 409. */
  revert(logId: number): Observable<BirgeLogItem> {
    return this.http.post<BirgeLogItem>(this.url(`/admin/birge/log/${logId}/revert`), {});
  }

  posts(status: BirgePostStatus | null, cursor: string | null = null): Observable<BirgePage<ManagerPost>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<BirgePage<ManagerPost>>(this.url('/admin/birge/posts'), { params });
  }

  settings(): Observable<BirgeSettings> {
    return this.http.get<BirgeSettings>(this.url('/admin/birge/settings'));
  }

  /** PUT проверяет границы и нормализует словари: ответ отдаёт их уже в нормализованном виде. */
  saveSettings(input: BirgeSettingsInput): Observable<BirgeSettings> {
    return this.http.put<BirgeSettings>(this.url('/admin/birge/settings'), input);
  }
}
```

- [ ] **Step 5: Run — PASS**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/services/birge-moderation.service.spec.ts`
Expected: `TOTAL: 6 SUCCESS`.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && git add src/app/core/models/birge.models.ts src/app/core/services/birge-moderation.service.ts src/app/core/services/birge-moderation.service.spec.ts && git commit -m "$(cat <<'EOF'
feat(birge): типы контракта и служба ручек /admin/birge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Подписи кодов

**Files:**
- Create: `src/app/feature/system/birge/birge.labels.ts`
- Test: `src/app/feature/system/birge/birge.labels.spec.ts`

**Interfaces:**
- Consumes: типы из `core/models/birge.models.ts` (задача 2).
- Produces: `type BirgeTone = 'ok' | 'bad' | 'pend' | 'hid'`; `interface BirgeLabel {label: string; tone: BirgeTone}`;
  `reasonLabel(code: string): string`; `isMarkerReason(r: BirgeReason): boolean` (AI_UNAVAILABLE, REPORTS, score 0);
  `reasonText(r: BirgeReason): string` («Ссылка или контакты · 52», у метки — без числа);
  `decisionLabel(code: string): BirgeLabel`;
  `logDecisionLabel(item: Pick<BirgeLogItem, 'decision' | 'rejectReason'>): BirgeLabel` («Менеджер: отклонено — Не по теме»);
  `DECISION_FILTERS: {code: BirgeDecision; label: string}[]`; `revertLabel(decision: string): string`;
  `revertDoneMessage(decision: string): string`; `statusLabel(status: string): BirgeLabel`;
  `postStatusLabel(post: Pick<ManagerPost, 'status' | 'hiddenReason'>): BirgeLabel` (у скрытых — по причине:
  «Скрыто по жалобам», «Скрыто модератором», «Скрыто: лимит дня — видит только автор»);
  `FEED_FILTERS: {status: BirgePostStatus | null; label: string}[]`;
  `queueFlag(source: BirgeQueueSource | null): string | null`; `topicLabel(topic: string): string`;
  `kindLabel(post: Pick<ManagerPost, 'kind' | 'threadPreview'>): string`;
  `REJECT_REASONS: {code: BirgeRejectCode; label: string}[]`; `rejectReasonLabel(code: string): string`;
  `mediaCheckLabel(moderation: BirgeMediaModeration | null): string`;
  `OVERFLOW_OPTIONS: {value: BirgeOverflowMode; label: string; short: string}[]`; `overflowShort(mode: string): string`;
  `DICTIONARIES: {key: keyof BirgeDictionaries; title: string; hint: string}[]`.

- [ ] **Step 1: Failing test**

`src/app/feature/system/birge/birge.labels.spec.ts`:

```ts
import { BirgeDecision } from '../../../core/models/birge.models';
import {
  DECISION_FILTERS, DICTIONARIES, FEED_FILTERS, OVERFLOW_OPTIONS, REJECT_REASONS, decisionLabel, isMarkerReason,
  kindLabel, logDecisionLabel, mediaCheckLabel, overflowShort, postStatusLabel, queueFlag, reasonLabel, reasonText,
  rejectReasonLabel, revertDoneMessage, revertLabel, statusLabel, topicLabel
} from './birge.labels';

describe('birge.labels — подписи кодов Birge', () => {
  const REASON_CODES = ['PROFANITY', 'IMAGE_UNSAFE', 'INSULT', 'HARASSMENT', 'PLATFORM_COMPLAINT', 'TOXICITY',
    'MASKED_SUSPECT', 'LINK_OR_CONTACT', 'SPAM', 'SOFT_CRITICISM', 'CAPS', 'AI_UNAVAILABLE', 'REPORTS'];
  const DECISION_CODES: BirgeDecision[] = ['auto_published', 'auto_rejected', 'auto_rejected_overflow', 'auto_feedback',
    'queued', 'queued_tomorrow', 'hidden_overflow', 'queued_ai_unavailable', 'hidden_reports',
    'approved', 'rejected', 'hidden', 'restored'];

  it('у каждой причины из контракта своя подпись; незнакомый код — как есть', () => {
    const labels = REASON_CODES.map(reasonLabel);
    REASON_CODES.forEach((code, i) => expect(labels[i]).withContext(code).not.toBe(code));
    expect(new Set(labels).size).toBe(REASON_CODES.length);
    expect(reasonLabel('PLATFORM_COMPLAINT')).toBe('Негативный отзыв о платформе');
    expect(reasonLabel('SOFT_CRITICISM')).toBe('Критика — нужно решение человека');
    expect(reasonLabel('BRAND_NEW')).toBe('BRAND_NEW');
  });

  it('причина с риском — подпись и число; метки AI_UNAVAILABLE и REPORTS (score 0) — без числа', () => {
    expect(reasonText({ code: 'LINK_OR_CONTACT', score: 52 })).toBe('Ссылка или контакты · 52');
    expect(reasonText({ code: 'REPORTS', score: 0 })).toBe('Жалобы студентов');
    expect(reasonText({ code: 'AI_UNAVAILABLE', score: 0 })).toBe('AI-проверка недоступна');
    expect(isMarkerReason({ code: 'REPORTS', score: 0 })).toBeTrue();
    expect(isMarkerReason({ code: 'CAPS', score: 35 })).toBeFalse();
  });

  it('решения журнала: все коды §4 в фильтре по порядку, AI и менеджер различимы, тон по исходу', () => {
    expect(DECISION_FILTERS.map((d) => d.code)).toEqual(DECISION_CODES);
    DECISION_CODES.forEach((code) => expect(decisionLabel(code).label).withContext(code).not.toBe(code));
    expect(decisionLabel('auto_published')).toEqual({ label: 'AI: опубликовано', tone: 'ok' });
    expect(decisionLabel('auto_feedback')).toEqual({ label: 'AI: в Feedback', tone: 'bad' });
    expect(decisionLabel('queued_ai_unavailable').tone).toBe('pend');
    expect(decisionLabel('hidden_reports').tone).toBe('hid');
    expect(decisionLabel('rejected')).toEqual({ label: 'Менеджер: отклонено', tone: 'bad' });
    expect(decisionLabel('mystery')).toEqual({ label: 'mystery', tone: 'hid' });
  });

  it('ручной отказ в журнале — с причиной; без причины и у прочих решений — как есть', () => {
    expect(logDecisionLabel({ decision: 'rejected', rejectReason: { code: 'OFF_TOPIC', note: null } }))
      .toEqual({ label: 'Менеджер: отклонено — Не по теме', tone: 'bad' });
    expect(logDecisionLabel({ decision: 'rejected', rejectReason: null })).toEqual({ label: 'Менеджер: отклонено', tone: 'bad' });
    expect(logDecisionLabel({ decision: 'auto_feedback', rejectReason: null })).toEqual({ label: 'AI: в Feedback', tone: 'bad' });
  });

  it('отмена решения AI: опубликованное скрывают, остальное публикуют; автор узнаёт об этом', () => {
    expect(revertLabel('auto_published')).toBe('Скрыть');
    for (const code of ['auto_rejected', 'auto_rejected_overflow', 'auto_feedback', 'hidden_overflow', 'hidden_reports']) {
      expect(revertLabel(code)).withContext(code).toBe('Опубликовать');
    }
    expect(revertDoneMessage('auto_published')).toBe('Публикация скрыта из ленты — автор получил уведомление');
    expect(revertDoneMessage('auto_feedback')).toBe('Текст восстановлен и опубликован — автор получил уведомление');
    // отмена hidden_overflow автора не уведомляет: он и так видел пост опубликованным
    expect(revertDoneMessage('hidden_overflow')).toBe('Текст опубликован для всех');
  });

  it('статусы ленты: «Все» первым; у скрытых — причина в самой плашке', () => {
    expect(FEED_FILTERS.map((f) => f.label)).toEqual(['Все', 'Опубликовано', 'На проверке', 'На завтра', 'Отклонено', 'Скрыто']);
    expect(FEED_FILTERS[0].status).toBeNull();
    expect(statusLabel('tomorrow')).toEqual({ label: 'На завтра', tone: 'pend' });
    expect(statusLabel('rejected').tone).toBe('bad');
    expect(postStatusLabel({ status: 'hidden', hiddenReason: 'reports' })).toEqual({ label: 'Скрыто по жалобам', tone: 'hid' });
    expect(postStatusLabel({ status: 'hidden', hiddenReason: 'manager' }).label).toBe('Скрыто модератором');
    expect(postStatusLabel({ status: 'hidden', hiddenReason: 'overflow' }).label).toBe('Скрыто: лимит дня — видит только автор');
    expect(postStatusLabel({ status: 'hidden', hiddenReason: null }).label).toBe('Скрыто');
    expect(postStatusLabel({ status: 'pending', hiddenReason: null })).toEqual({ label: 'На проверке', tone: 'pend' });
  });

  it('пометка очереди: жалобы и сбой AI — да, обычный риск — нет', () => {
    expect(queueFlag('reports')).toBe('Жалобы студентов');
    expect(queueFlag('ai_unavailable')).toBe('AI недоступен');
    expect(queueFlag('risk')).toBeNull();
    expect(queueFlag(null)).toBeNull();
  });

  it('тип поста и тема', () => {
    expect(kindLabel({ kind: 'thread', threadPreview: null })).toBe('Новая ветка');
    expect(kindLabel({ kind: 'comment', threadPreview: 'Present Perfect vs Past Simple' }))
      .toBe('Комментарий к «Present Perfect vs Past Simple»');
    expect(kindLabel({ kind: 'comment', threadPreview: null })).toBe('Комментарий');
    expect(['GRAMMAR', 'SPEAKING', 'VOCABULARY', 'MOTIVATION', 'QUESTION'].map(topicLabel))
      .toEqual(['Грамматика', 'Speaking', 'Словарь', 'Мотивация', 'Вопрос']);
  });

  it('причины отказа — пять кодов контракта в порядке ТЗ', () => {
    expect(REJECT_REASONS.map((r) => r.code)).toEqual(['INSULT', 'PROFANITY', 'ADS_CONTACTS', 'OFF_TOPIC', 'OTHER']);
    expect(rejectReasonLabel('ADS_CONTACTS')).toBe('Реклама или контакты');
    expect(rejectReasonLabel('OTHER')).toBe('Другое');
  });

  it('проверка фото: категория и уверенность; без проверки — так и сказано', () => {
    expect(mediaCheckLabel({ state: 'ok', category: 'ok', confidence: 0.98 })).toBe('Фото: безопасно · 98 %');
    expect(mediaCheckLabel({ state: 'flagged', category: 'offensive_gesture', confidence: 0.6 }))
      .toBe('Фото: оскорбительный жест · 60 %');
    expect(mediaCheckLabel({ state: 'flagged', category: 'weapon', confidence: null })).toBe('Фото: оружие');
    expect(mediaCheckLabel({ state: 'unchecked', category: null, confidence: null })).toBe('Фото не проверено');
    expect(mediaCheckLabel(null)).toBe('Фото не проверено');
  });

  it('переполнение лимита: три режима прототипа; словари — три, у каждого своя подсказка', () => {
    expect(OVERFLOW_OPTIONS.map((o) => o.value)).toEqual(['reject', 'tomorrow', 'hidden']);
    expect(overflowShort('reject')).toBe('отклонять');
    expect(overflowShort('tomorrow')).toBe('на завтра');
    expect(DICTIONARIES.map((d) => d.key)).toEqual(['profanity', 'complaint', 'criticism']);
    expect(DICTIONARIES[0].hint).toContain('*корень — в любом месте слова');
    expect(DICTIONARIES[1].hint).toContain('в любом месте текста');
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/feature/system/birge/birge.labels.spec.ts`
Expected: FAIL — `Cannot find module './birge.labels'`.

- [ ] **Step 3: Implement**

`src/app/feature/system/birge/birge.labels.ts`:

```ts
import {
  BirgeDecision, BirgeDictionaries, BirgeHiddenReason, BirgeImageCategory, BirgeLogItem, BirgeMediaModeration,
  BirgeOverflowMode, BirgePostStatus, BirgeQueueSource, BirgeReason, BirgeReasonCode, BirgeRejectCode, ManagerPost
} from '../../../core/models/birge.models';

/**
 * Подписи кодов Birge. Сервер отдаёт только коды (спека §3.2: подписи держат веб и web-admin), поэтому незнакомый код —
 * новая причина на бэкенде раньше админки — показывается как есть, а не пропадает. Экраны раздела на русском, как у
 * остальных разделов контент-менеджера («Скорочтение», «Грамматика · игры»).
 */

/** Цвет плашки: ok — опубликовано, bad — отклонено, pend — ждёт решения, hid — скрыто. */
export type BirgeTone = 'ok' | 'bad' | 'pend' | 'hid';

export interface BirgeLabel {
  label: string;
  tone: BirgeTone;
}

const REASONS: Record<BirgeReasonCode, string> = {
  PROFANITY: 'Нецензурная лексика',
  IMAGE_UNSAFE: 'Недопустимое фото',
  INSULT: 'Оскорбление',
  HARASSMENT: 'Травля',
  PLATFORM_COMPLAINT: 'Негативный отзыв о платформе',
  TOXICITY: 'Токсичный тон',
  MASKED_SUSPECT: 'Похоже на замаскированный мат',
  LINK_OR_CONTACT: 'Ссылка или контакты',
  SPAM: 'Спам или реклама',
  SOFT_CRITICISM: 'Критика — нужно решение человека',
  CAPS: 'Текст капсом (крик)',
  AI_UNAVAILABLE: 'AI-проверка недоступна',
  REPORTS: 'Жалобы студентов',
};

export function reasonLabel(code: string): string {
  return (REASONS as Record<string, string>)[code] ?? code;
}

/** AI_UNAVAILABLE и REPORTS — метки «почему пост здесь», а не вклад в риск: сервер шлёт их со score 0 (спека §5.3). */
export function isMarkerReason(r: BirgeReason): boolean {
  return r.code === 'AI_UNAVAILABLE' || r.code === 'REPORTS' || r.score === 0;
}

/** Плашка причины: «Ссылка или контакты · 52»; у метки число не пишется — «· 0» читалось бы как «риска нет». */
export function reasonText(r: BirgeReason): string {
  return isMarkerReason(r) ? reasonLabel(r.code) : `${reasonLabel(r.code)} · ${r.score}`;
}

const DECISIONS: Record<BirgeDecision, BirgeLabel> = {
  auto_published: { label: 'AI: опубликовано', tone: 'ok' },
  auto_rejected: { label: 'AI: отклонено', tone: 'bad' },
  auto_rejected_overflow: { label: 'AI: отклонено — лимит дня', tone: 'bad' },
  auto_feedback: { label: 'AI: в Feedback', tone: 'bad' },
  queued: { label: 'AI: в очередь', tone: 'pend' },
  queued_tomorrow: { label: 'AI: на завтра', tone: 'pend' },
  hidden_overflow: { label: 'AI: скрыто — лимит дня', tone: 'hid' },
  queued_ai_unavailable: { label: 'AI недоступен: в очередь', tone: 'pend' },
  hidden_reports: { label: 'Скрыто по жалобам', tone: 'hid' },
  approved: { label: 'Менеджер: одобрено', tone: 'ok' },
  rejected: { label: 'Менеджер: отклонено', tone: 'bad' },
  hidden: { label: 'Менеджер: скрыто', tone: 'hid' },
  restored: { label: 'Менеджер: опубликовано', tone: 'ok' },
};

export function decisionLabel(code: string): BirgeLabel {
  return (DECISIONS as Record<string, BirgeLabel>)[code] ?? { label: code, tone: 'hid' };
}

/** Строка журнала: у ручного отказа к решению дописывается его причина — «Менеджер: отклонено — Не по теме». */
export function logDecisionLabel(item: Pick<BirgeLogItem, 'decision' | 'rejectReason'>): BirgeLabel {
  const base = decisionLabel(item.decision);
  return item.decision === 'rejected' && item.rejectReason
    ? { ...base, label: `${base.label} — ${rejectReasonLabel(item.rejectReason.code)}` }
    : base;
}

/** Фильтр журнала «Решение»: все коды §4 спеки — сначала AI, потом менеджер. */
export const DECISION_FILTERS: { code: BirgeDecision; label: string }[] =
  (Object.keys(DECISIONS) as BirgeDecision[]).map((code) => ({ code, label: DECISIONS[code].label }));

/** Отмена решения AI (спека §5.2): опубликованное скрывается, всё остальное отменяемое публикуется. */
export function revertLabel(decision: string): string {
  return decision === 'auto_published' ? 'Скрыть' : 'Опубликовать';
}

/**
 * Тосты отмены — тексты прототипа. Отмена пишется решением менеджера (hidden / restored) и шлёт автору
 * BIRGE_POST_HIDDEN или BIRGE_POST_APPROVED (спека §5.2) — кроме hidden_overflow: автор и так видел пост
 * опубликованным, уведомления нет, и тост его не обещает.
 */
export function revertDoneMessage(decision: string): string {
  if (decision === 'auto_published') return 'Публикация скрыта из ленты — автор получил уведомление';
  if (decision === 'hidden_overflow') return 'Текст опубликован для всех';
  return 'Текст восстановлен и опубликован — автор получил уведомление';
}

const STATUSES: Record<BirgePostStatus, BirgeLabel> = {
  published: { label: 'Опубликовано', tone: 'ok' },
  pending: { label: 'На проверке', tone: 'pend' },
  tomorrow: { label: 'На завтра', tone: 'pend' },
  rejected: { label: 'Отклонено', tone: 'bad' },
  hidden: { label: 'Скрыто', tone: 'hid' },
};

export function statusLabel(status: string): BirgeLabel {
  return (STATUSES as Record<string, BirgeLabel>)[status] ?? { label: status, tone: 'hid' };
}

/** Фильтр ленты: null — все статусы. */
export const FEED_FILTERS: { status: BirgePostStatus | null; label: string }[] = [
  { status: null, label: 'Все' },
  ...(Object.keys(STATUSES) as BirgePostStatus[]).map((status) => ({ status, label: STATUSES[status].label })),
];

const HIDDEN_BADGES: Record<BirgeHiddenReason, string> = {
  overflow: 'Скрыто: лимит дня — видит только автор',
  reports: 'Скрыто по жалобам',
  manager: 'Скрыто модератором',
};

/**
 * Плашка статуса поста. У скрытых причина — в самой плашке: скрытый по жалобам ждёт решения в очереди (спека §3.4),
 * скрытый модератором — уже решён, и «Скрыто» без причины их не различило бы.
 */
export function postStatusLabel(post: Pick<ManagerPost, 'status' | 'hiddenReason'>): BirgeLabel {
  if (post.status !== 'hidden') return statusLabel(post.status);
  const label = post.hiddenReason ? (HIDDEN_BADGES as Record<string, string>)[post.hiddenReason] : undefined;
  return { label: label ?? 'Скрыто', tone: 'hid' };
}

/**
 * Пометка карточки очереди: пост пришёл не по риску, а по жалобам или из-за сбоя AI. Такие заявки дневной лимит не
 * тратят (спека §3.3, §3.4) — менеджер должен это видеть, иначе «3 / 3» в сводке и пятая карточка выглядят поломкой.
 */
export function queueFlag(source: BirgeQueueSource | null): string | null {
  if (source === 'reports') return 'Жалобы студентов';
  if (source === 'ai_unavailable') return 'AI недоступен';
  return null;
}

/** Темы — подписи прототипа. */
const TOPICS: Record<string, string> = {
  GRAMMAR: 'Грамматика',
  SPEAKING: 'Speaking',
  VOCABULARY: 'Словарь',
  MOTIVATION: 'Мотивация',
  QUESTION: 'Вопрос',
};

export function topicLabel(topic: string): string {
  return TOPICS[topic] ?? topic;
}

/** «Новая ветка» или «Комментарий к «начало ветки»» — к какой ветке ответ, менеджеру важно для контекста. */
export function kindLabel(post: Pick<ManagerPost, 'kind' | 'threadPreview'>): string {
  if (post.kind === 'thread') return 'Новая ветка';
  return post.threadPreview ? `Комментарий к «${post.threadPreview}»` : 'Комментарий';
}

/** Причины ручного отказа — в порядке ТЗ; подпись уходит автору в уведомлении. */
export const REJECT_REASONS: { code: BirgeRejectCode; label: string }[] = [
  { code: 'INSULT', label: 'Оскорбление' },
  { code: 'PROFANITY', label: 'Нецензурная лексика' },
  { code: 'ADS_CONTACTS', label: 'Реклама или контакты' },
  { code: 'OFF_TOPIC', label: 'Не по теме' },
  { code: 'OTHER', label: 'Другое' },
];

export function rejectReasonLabel(code: string): string {
  return REJECT_REASONS.find((r) => r.code === code)?.label ?? code;
}

const IMAGE_CATEGORIES: Record<BirgeImageCategory, string> = {
  ok: 'безопасно',
  sexual: 'сексуальный контент',
  violence: 'насилие',
  weapon: 'оружие',
  drugs: 'наркотики',
  offensive_gesture: 'оскорбительный жест',
  other_unsafe: 'другое недопустимое',
};

/** Подпись под фото: что увидела проверка и насколько уверена. */
export function mediaCheckLabel(moderation: BirgeMediaModeration | null): string {
  if (!moderation || moderation.state === 'unchecked') return 'Фото не проверено';
  const code = moderation.category ?? 'ok';
  const category = (IMAGE_CATEGORIES as Record<string, string>)[code] ?? code;
  const sure = moderation.confidence == null ? '' : ` · ${Math.round(moderation.confidence * 100)} %`;
  return `Фото: ${category}${sure}`;
}

/** Поведение при переполнении лимита — подписи прототипа; short — для «Как работает модерация». */
export const OVERFLOW_OPTIONS: { value: BirgeOverflowMode; label: string; short: string }[] = [
  { value: 'reject', label: 'Отклонять с подсказкой «перепишите» (рекомендуется)', short: 'отклонять' },
  { value: 'tomorrow', label: 'Ставить в очередь на завтра', short: 'на завтра' },
  { value: 'hidden', label: 'Публиковать скрыто — видно только автору', short: 'скрыто' },
];

export function overflowShort(mode: string): string {
  return OVERFLOW_OPTIONS.find((o) => o.value === mode)?.short ?? mode;
}

/**
 * Словари модерации. Ловят они по-разному (спека §3.1): мат — начало слова или корень со звёздочкой, отзывы и критика —
 * подстрока текста. Поэтому подсказка синтаксиса у каждого своя: общая «*корень» про отзывы ввела бы в заблуждение.
 */
export const DICTIONARIES: { key: keyof BirgeDictionaries; title: string; hint: string }[] = [
  {
    key: 'profanity',
    title: 'Нецензурная лексика',
    hint: 'слово — ловит начало слова, в том числе после приставки («за», «вы», «пере»…); *корень — в любом месте слова. '
      + 'Замены вроде х@й и б*я сервер разбирает сам.',
  },
  {
    key: 'complaint',
    title: 'Плохие отзывы о платформе → Feedback',
    hint: 'запись ловится в любом месте текста; фразу пишите целиком («верните деньги»).',
  },
  {
    key: 'criticism',
    title: 'Мягкая критика → на ручную проверку',
    hint: 'запись ловится в любом месте текста; фразу пишите целиком («плохо объясня»).',
  },
];
```

- [ ] **Step 4: Run — PASS**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/feature/system/birge/birge.labels.spec.ts`
Expected: `TOTAL: 11 SUCCESS`.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && git add src/app/feature/system/birge/birge.labels.ts src/app/feature/system/birge/birge.labels.spec.ts && git commit -m "$(cat <<'EOF'
feat(birge): подписи причин, решений, статусов и пометок очереди

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Правила экранов и образцы для тестов

**Files:**
- Create: `src/app/feature/system/birge/birge.rules.ts`
- Create: `src/app/feature/system/birge/birge.testing.ts`
- Test: `src/app/feature/system/birge/birge.rules.spec.ts`

**Interfaces:**
- Consumes: `DICTIONARIES` (задача 3), `apiErrorText` (`core/utils/api-error-text.util.ts`), `schoolWall`
  (`core/utils/school-time.ts`).
- Produces (`birge.rules.ts`): константы `PUBLISH_RANGE {min: 5, max: 60}`, `REJECT_RANGE {min: 40, max: 95}`,
  `LIMIT_RANGE {min: 1, max: 10}`, `REPORTS_RANGE {min: 1, max: 10}`, `ZONE_GAP = 5`, `NOTE_MAX = 200`;
  `withPublishBelow(s: Pick<BirgeSettingsInput, 'autoRejectFrom'>, value: number): number`;
  `withRejectFrom(s: Pick<BirgeSettingsInput, 'autoPublishBelow'>, value: number): number`;
  `zones(autoPublishBelow: number, autoRejectFrom: number): {publish: number; manager: number; reject: number}`;
  `parseDictionary(text: string): string[]`; `formatDictionary(entries: string[]): string`;
  `interface BirgeSettingsForm {autoPublishBelow; autoRejectFrom; dailyLimit; overflowMode; reportsToHide; profanity: string; complaint: string; criticism: string}`;
  `toForm(s: BirgeSettingsInput): BirgeSettingsForm`; `toInput(f: BirgeSettingsForm): BirgeSettingsInput`;
  `settingsProblems(s: BirgeSettingsInput): string[]`;
  `rejectProblem(reason: BirgeRejectCode | null, note: string): string | null`;
  `feedAction(status: BirgePostStatus): BirgeAction | null`; `limitPercent(escalated: number, limit: number): number`;
  `almatyDayLabel(now: Date): string`; `logFilterProblem(f: BirgeLogFilter): string | null`;
  `birgeErrorText(error: unknown, fallback: string): string`;
  `interface TextPart {text: string; hit: boolean}`; `splitHits(text: string, hits: string[]): TextPart[]` — куски
  текста для подсветки найденного: все вхождения без учёта регистра, без innerHTML.
- Produces (`birge.testing.ts`, только для spec): `managerPost(patch?)`, `logItem(patch?)`, `birgeSettings(patch?)`,
  `SUMMARY: BirgeSummary`.

- [ ] **Step 1: Образцы для тестов**

`src/app/feature/system/birge/birge.testing.ts`:

```ts
import { BirgeLogItem, BirgeSettings, BirgeSummary, ManagerPost } from '../../../core/models/birge.models';

/*
 * Образцы ответов /admin/birge для spec — по примерам §5.3 спеки. Тест правит только нужные ему поля. Файл
 * подключают одни spec: в сборку приложения он не попадает (tsconfig.app.json берёт только достижимое из main.ts).
 */

export function managerPost(patch: Partial<ManagerPost> = {}): ManagerPost {
  return {
    id: 101,
    parentId: null,
    kind: 'thread',
    threadPreview: null,
    author: { id: 42, name: 'Аружан К.', level: 'A2', avatarUrl: null },
    topic: 'QUESTION',
    text: 'Тьютор сегодня объяснял слишком быстро, я ничего не понял.',
    continuations: [],
    hits: [],
    media: [],
    status: 'pending',
    hiddenReason: null,
    queueSource: 'risk',
    risk: 48,
    reasons: [{ code: 'SOFT_CRITICISM', score: 48 }],
    reportsCount: 0,
    rejectReason: null,
    createdAt: '2026-11-11T09:58:00+05:00',
    moderatedAt: null,
    ...patch,
  };
}

export function logItem(patch: Partial<BirgeLogItem> = {}): BirgeLogItem {
  return {
    id: 9,
    postId: 101,
    createdAt: '2026-11-11T09:31:00+05:00',
    actorType: 'ai',
    actor: null,
    author: { id: 42, name: 'Аружан К.' },
    textPreview: 'Это развод, верните…',
    risk: 78,
    decision: 'auto_feedback',
    reasons: [{ code: 'PLATFORM_COMPLAINT', score: 78 }],
    note: null,
    rejectReason: null,
    revertible: true,
    revertedAt: null,
    revertedBy: null,
    ...patch,
  };
}

export function birgeSettings(patch: Partial<BirgeSettings> = {}): BirgeSettings {
  return {
    autoPublishBelow: 30,
    autoRejectFrom: 70,
    dailyLimit: 3,
    overflowMode: 'reject',
    reportsToHide: 3,
    dictionaries: { profanity: ['бля', '*пизд'], complaint: ['развод', 'верните деньги'], criticism: ['дорого'] },
    updatedAt: null,
    updatedBy: null,
    ...patch,
  };
}

export const SUMMARY: BirgeSummary = { autoPublished: 14, autoRejected: 3, pending: 1, tomorrow: 0, escalated: 1, limit: 3 };
```

- [ ] **Step 2: Failing test — правила**

`src/app/feature/system/birge/birge.rules.spec.ts`:

```ts
import {
  NOTE_MAX, almatyDayLabel, birgeErrorText, feedAction, formatDictionary, limitPercent, logFilterProblem,
  parseDictionary, rejectProblem, settingsProblems, splitHits, toForm, toInput, withPublishBelow, withRejectFrom, zones
} from './birge.rules';
import { birgeSettings } from './birge.testing';

describe('birge.rules — правила экранов Birge', () => {
  it('порог публикации: в границах 5–60 и на 5 ниже порога отказа, целым числом', () => {
    expect(withPublishBelow({ autoRejectFrom: 70 }, 2)).toBe(5);
    expect(withPublishBelow({ autoRejectFrom: 70 }, 80)).toBe(60);
    expect(withPublishBelow({ autoRejectFrom: 50 }, 58)).toBe(45);
    expect(withPublishBelow({ autoRejectFrom: 70 }, 33.6)).toBe(34);
  });

  it('порог отказа: в границах 40–95 и на 5 выше порога публикации', () => {
    expect(withRejectFrom({ autoPublishBelow: 30 }, 99)).toBe(95);
    expect(withRejectFrom({ autoPublishBelow: 30 }, 10)).toBe(40);
    expect(withRejectFrom({ autoPublishBelow: 50 }, 45)).toBe(55);
  });

  it('шкала трёх зон в сумме — 100 %', () => {
    expect(zones(30, 70)).toEqual({ publish: 30, manager: 40, reject: 30 });
  });

  it('словарь из поля: запятые и строки, лишние пробелы, пустые и повторы без учёта регистра', () => {
    expect(parseDictionary(' бля, хуй\n*пизд,,  Бля ,\n верните   деньги ')).toEqual(['бля', 'хуй', '*пизд', 'верните деньги']);
    expect(parseDictionary('')).toEqual([]);
    expect(formatDictionary(['бля', '*пизд'])).toBe('бля, *пизд');
  });

  it('форма ↔ тело PUT: туда и обратно без потерь', () => {
    const s = birgeSettings();
    const form = toForm(s);
    expect(form).toEqual({
      autoPublishBelow: 30, autoRejectFrom: 70, dailyLimit: 3, overflowMode: 'reject', reportsToHide: 3,
      profanity: 'бля, *пизд', complaint: 'развод, верните деньги', criticism: 'дорого',
    });
    expect(toInput(form)).toEqual({
      autoPublishBelow: 30, autoRejectFrom: 70, dailyLimit: 3, overflowMode: 'reject', reportsToHide: 3,
      dictionaries: s.dictionaries,
    });
  });

  it('настройки по умолчанию проходят', () => {
    expect(settingsProblems(toInput(toForm(birgeSettings())))).toEqual([]);
  });

  it('границы и зазор между порогами — по строке на нарушение', () => {
    const input = toInput(toForm(birgeSettings({ autoPublishBelow: 61, autoRejectFrom: 62, dailyLimit: 0, reportsToHide: 11 })));
    expect(settingsProblems(input)).toEqual([
      'Порог публикации — от 5 до 60',
      'Порог отказа должен быть хотя бы на 5 выше порога публикации',
      'Ручных заявок в день — от 1 до 10',
      'Жалоб до скрытия — от 1 до 10',
    ]);
  });

  it('записи словаря: короче 3 букв — нельзя, кроме записей с *; без букв — нельзя', () => {
    const input = toInput(toForm(birgeSettings({
      dictionaries: { profanity: ['ам', '*ам', 'сука'], complaint: ['***'], criticism: ['дорого'] },
    })));
    expect(settingsProblems(input)).toEqual([
      '«Нецензурная лексика»: запись «ам» короче 3 букв — она поймала бы полслова',
      '«Плохие отзывы о платформе → Feedback»: в записи «***» нет ни одной буквы',
    ]);
  });

  it('причина отказа: обязательна; «Другое» — только с описанием; описание до 200 символов', () => {
    expect(rejectProblem(null, '')).toBe('Выберите причину отказа');
    expect(rejectProblem('OFF_TOPIC', '')).toBeNull();
    expect(rejectProblem('OTHER', '   ')).toBe('Опишите причину — автор увидит её в уведомлении');
    expect(rejectProblem('OTHER', 'Реклама чужого курса')).toBeNull();
    expect(rejectProblem('INSULT', 'я'.repeat(NOTE_MAX + 1))).toBe('Комментарий — не длиннее 200 символов');
  });

  it('кнопка ленты по матрице §5.2: hide — published, restore — hidden и rejected, ждущие — в очередь', () => {
    expect(feedAction('published')).toBe('hide');
    expect(feedAction('hidden')).toBe('restore');
    expect(feedAction('rejected')).toBe('restore');
    expect(feedAction('pending')).toBeNull();
    expect(feedAction('tomorrow')).toBeNull();
  });

  it('подсветка найденного: все вхождения без учёта регистра, длинное раньше короткого, спецсимволы — буквально', () => {
    expect(splitHits('бля, опять х@й и БЛЯ', ['х@й', 'Бля'])).toEqual([
      { text: 'бля', hit: true }, { text: ', опять ', hit: false }, { text: 'х@й', hit: true },
      { text: ' и ', hit: false }, { text: 'БЛЯ', hit: true },
    ]);
    expect(splitHits('б*я и б**ть', ['б*я', 'б**ть'])).toEqual([
      { text: 'б*я', hit: true }, { text: ' и ', hit: false }, { text: 'б**ть', hit: true },
    ]);
    expect(splitHits('пиши на t.me/promo', ['t.me/promo', 't.me'])).toEqual([
      { text: 'пиши на ', hit: false }, { text: 't.me/promo', hit: true },
    ]);
    expect(splitHits('без находок', [])).toEqual([{ text: 'без находок', hit: false }]);
    expect(splitHits('', ['бля'])).toEqual([]);
    expect(splitHits('ничего', ['  ', ''])).toEqual([{ text: 'ничего', hit: false }]);
  });

  it('заполнение дневного лимита в процентах', () => {
    expect(limitPercent(1, 3)).toBe(33);
    expect(limitPercent(5, 3)).toBe(100);
    expect(limitPercent(0, 0)).toBe(0);
  });

  it('«Сегодня» — по Алматы, а не по поясу браузера', () => {
    expect(almatyDayLabel(new Date('2026-11-10T20:30:00Z'))).toBe('Сегодня, 11 ноября');
    expect(almatyDayLabel(new Date('2026-01-01T05:00:00Z'))).toBe('Сегодня, 1 января');
  });

  it('фильтр журнала: «с» позже «по» — ошибка; пустые границы — нет', () => {
    expect(logFilterProblem({ from: '2026-11-11', to: '2026-11-01', decision: '', author: '' })).toBe('Дата «с» позже даты «по»');
    expect(logFilterProblem({ from: '2026-11-01', to: '2026-11-11', decision: '', author: '' })).toBeNull();
    expect(logFilterProblem({ from: '2026-11-11', to: '', decision: '', author: '' })).toBeNull();
  });

  it('текст отказа: свой текст сервера; 404 без текста — «раздел не включён»; иначе запасной', () => {
    expect(birgeErrorText({ status: 409, error: { messages: ['По посту уже принято решение'] } }, 'x'))
      .toBe('По посту уже принято решение');
    expect(birgeErrorText({ status: 404, error: {} }, 'x'))
      .toBe('Раздел Birge на этом стенде ещё не включён: сервер ответил 404');
    expect(birgeErrorText({ status: 404, error: { messages: ['Пост не найден'] } }, 'x')).toBe('Пост не найден');
    expect(birgeErrorText({ status: 500, error: null }, 'Очередь не загрузилась')).toBe('Очередь не загрузилась');
  });
});
```

- [ ] **Step 3: Run — FAIL**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/feature/system/birge/birge.rules.spec.ts`
Expected: FAIL — `Cannot find module './birge.rules'`.

- [ ] **Step 4: Implement**

`src/app/feature/system/birge/birge.rules.ts`:

```ts
import {
  BirgeAction, BirgeLogFilter, BirgeOverflowMode, BirgePostStatus, BirgeRejectCode, BirgeSettingsInput
} from '../../../core/models/birge.models';
import { apiErrorText } from '../../../core/utils/api-error-text.util';
import { schoolWall } from '../../../core/utils/school-time';
import { DICTIONARIES } from './birge.labels';

/** Границы настроек — §3.5 спеки. Их же проверяет PUT бэкенда; здесь они видны до запроса. */
export const PUBLISH_RANGE = { min: 5, max: 60 } as const;
export const REJECT_RANGE = { min: 40, max: 95 } as const;
export const LIMIT_RANGE = { min: 1, max: 10 } as const;
export const REPORTS_RANGE = { min: 1, max: 10 } as const;
/** Между порогами — не меньше 5 пунктов: иначе спорной зоны «менеджеру» не остаётся. */
export const ZONE_GAP = 5;
/** Заметка к отказу — до 200 символов (контракт §5.3). */
export const NOTE_MAX = 200;

const OVERFLOW_MODES: readonly BirgeOverflowMode[] = ['reject', 'tomorrow', 'hidden'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября',
  'ноября', 'декабря'];

function clamp(value: number, min: number, max: number): number {
  const whole = Number.isFinite(value) ? Math.round(value) : min;
  return Math.min(max, Math.max(min, whole));
}

/** Ползунок «публиковать, если риск ниже»: в своих границах и на 5 ниже порога отказа — как в прототипе. */
export function withPublishBelow(s: Pick<BirgeSettingsInput, 'autoRejectFrom'>, value: number): number {
  return Math.min(clamp(value, PUBLISH_RANGE.min, PUBLISH_RANGE.max), s.autoRejectFrom - ZONE_GAP);
}

/** Ползунок «отклонять, если риск от»: в своих границах и на 5 выше порога публикации. */
export function withRejectFrom(s: Pick<BirgeSettingsInput, 'autoPublishBelow'>, value: number): number {
  return Math.max(clamp(value, REJECT_RANGE.min, REJECT_RANGE.max), s.autoPublishBelow + ZONE_GAP);
}

/** Ширины трёх зон шкалы в процентах: авто-публикация, менеджеру, отказ. */
export function zones(autoPublishBelow: number, autoRejectFrom: number): { publish: number; manager: number; reject: number } {
  return { publish: autoPublishBelow, manager: autoRejectFrom - autoPublishBelow, reject: 100 - autoRejectFrom };
}

/** Поле словаря: записи через запятую или с новой строки. Пустые и повторы (без учёта регистра) убираются. */
export function parseDictionary(text: string): string[] {
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const raw of (text ?? '').split(/[,\n]/)) {
    const entry = raw.trim().replace(/\s+/g, ' ');
    const key = entry.toLowerCase();
    if (!entry || seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }
  return entries;
}

export function formatDictionary(entries: string[]): string {
  return entries.join(', ');
}

/** Плоская форма экрана настроек: словари — строками полей ввода, как в прототипе. */
export interface BirgeSettingsForm {
  autoPublishBelow: number;
  autoRejectFrom: number;
  dailyLimit: number;
  overflowMode: BirgeOverflowMode;
  reportsToHide: number;
  profanity: string;
  complaint: string;
  criticism: string;
}

export function toForm(s: BirgeSettingsInput): BirgeSettingsForm {
  return {
    autoPublishBelow: s.autoPublishBelow,
    autoRejectFrom: s.autoRejectFrom,
    dailyLimit: s.dailyLimit,
    overflowMode: s.overflowMode,
    reportsToHide: s.reportsToHide,
    profanity: formatDictionary(s.dictionaries.profanity),
    complaint: formatDictionary(s.dictionaries.complaint),
    criticism: formatDictionary(s.dictionaries.criticism),
  };
}

/** Тело PUT. Порядок ключей постоянный: по JSON формы экран узнаёт, есть ли несохранённые правки. */
export function toInput(f: BirgeSettingsForm): BirgeSettingsInput {
  return {
    autoPublishBelow: Number(f.autoPublishBelow),
    autoRejectFrom: Number(f.autoRejectFrom),
    dailyLimit: Number(f.dailyLimit),
    overflowMode: f.overflowMode,
    reportsToHide: Number(f.reportsToHide),
    dictionaries: {
      profanity: parseDictionary(f.profanity),
      complaint: parseDictionary(f.complaint),
      criticism: parseDictionary(f.criticism),
    },
  };
}

/**
 * Что мешает сохранить настройки. Те же правила проверит PUT (спека §3.5): «ам» в словаре поймало бы полслова, поэтому
 * запись короче 3 букв отклоняется — кроме записей с *, у них длину задаёт сам корень.
 */
export function settingsProblems(s: BirgeSettingsInput): string[] {
  const problems: string[] = [];
  const within = (v: number, r: { min: number; max: number }) => Number.isInteger(v) && v >= r.min && v <= r.max;
  if (!within(s.autoPublishBelow, PUBLISH_RANGE)) problems.push(`Порог публикации — от ${PUBLISH_RANGE.min} до ${PUBLISH_RANGE.max}`);
  if (!within(s.autoRejectFrom, REJECT_RANGE)) problems.push(`Порог отказа — от ${REJECT_RANGE.min} до ${REJECT_RANGE.max}`);
  if (s.autoRejectFrom - s.autoPublishBelow < ZONE_GAP) {
    problems.push(`Порог отказа должен быть хотя бы на ${ZONE_GAP} выше порога публикации`);
  }
  if (!within(s.dailyLimit, LIMIT_RANGE)) problems.push(`Ручных заявок в день — от ${LIMIT_RANGE.min} до ${LIMIT_RANGE.max}`);
  if (!within(s.reportsToHide, REPORTS_RANGE)) problems.push(`Жалоб до скрытия — от ${REPORTS_RANGE.min} до ${REPORTS_RANGE.max}`);
  if (!OVERFLOW_MODES.includes(s.overflowMode)) problems.push('Выберите, что делать со спорными текстами сверх лимита');
  for (const dictionary of DICTIONARIES) {
    for (const entry of s.dictionaries[dictionary.key]) {
      const letters = (entry.match(/\p{L}/gu) ?? []).length;
      if (!letters) {
        problems.push(`«${dictionary.title}»: в записи «${entry}» нет ни одной буквы`);
      } else if (!entry.includes('*') && letters < 3) {
        problems.push(`«${dictionary.title}»: запись «${entry}» короче 3 букв — она поймала бы полслова`);
      }
    }
  }
  return problems;
}

/** Можно ли отклонить с такой причиной. «Другое» без описания автору ничего не объяснило бы. */
export function rejectProblem(reason: BirgeRejectCode | null, note: string): string | null {
  if (!reason) return 'Выберите причину отказа';
  const text = (note ?? '').trim();
  if (reason === 'OTHER' && !text) return 'Опишите причину — автор увидит её в уведомлении';
  if (text.length > NOTE_MAX) return `Комментарий — не длиннее ${NOTE_MAX} символов`;
  return null;
}

/**
 * Кнопка ленты по матрице §5.2: hide — у published, restore — у hidden (любая причина) и rejected. approve/reject
 * (pending, tomorrow, скрытые по жалобам без решения) ведут в очередь: там у решения есть причина отказа.
 */
export function feedAction(status: BirgePostStatus): BirgeAction | null {
  if (status === 'published') return 'hide';
  if (status === 'hidden' || status === 'rejected') return 'restore';
  return null;
}

/** Кусок текста карточки: hit — найденный модерацией фрагмент, его подсвечивают. */
export interface TextPart {
  text: string;
  hit: boolean;
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Текст, разрезанный по найденным фрагментам (hits приходят так, как их написал ученик: «х@й», «б*я»). Все вхождения,
 * без учёта регистра; длинный фрагмент раньше короткого, чтобы «t.me/promo» не подсветился наполовину. Куски выводятся
 * интерполяцией, а не innerHTML: текст ученика Angular экранирует сам, и «<b>» в посте остаётся текстом.
 */
export function splitHits(text: string, hits: string[]): TextPart[] {
  if (!text) return [];
  const words = [...new Set(hits.map((h) => h.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!words.length) return [{ text, hit: false }];
  const pattern = new RegExp(words.map(escapeRegExp).join('|'), 'giu');
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ text: text.slice(last, at), hit: false });
    parts.push({ text: match[0], hit: true });
    last = at + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false });
  return parts;
}

export function limitPercent(escalated: number, limit: number): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((escalated / limit) * 100));
}

/** «Сегодня, 11 ноября» по Алматы: сутки лимита сервер считает в Asia/Almaty (спека §9), а не в поясе браузера. */
export function almatyDayLabel(now: Date): string {
  const wall = schoolWall(now);
  return `Сегодня, ${wall.getUTCDate()} ${MONTHS[wall.getUTCMonth()]}`;
}

export function logFilterProblem(f: BirgeLogFilter): string | null {
  return f.from && f.to && f.from > f.to ? 'Дата «с» позже даты «по»' : null;
}

/**
 * Текст отказа ручки Birge. 404 без своего текста — стенд, где бэкенд ещё без модуля birge: «не удалось загрузить»
 * отправило бы искать поломку, которой нет.
 */
export function birgeErrorText(error: unknown, fallback: string): string {
  const own = apiErrorText(error, '');
  if (own) return own;
  const status = (error as { status?: unknown } | null | undefined)?.status;
  return status === 404 ? 'Раздел Birge на этом стенде ещё не включён: сервер ответил 404' : fallback;
}
```

- [ ] **Step 5: Run — PASS**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/feature/system/birge/birge.rules.spec.ts`
Expected: `TOTAL: 15 SUCCESS`.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && git add src/app/feature/system/birge/birge.rules.ts src/app/feature/system/birge/birge.rules.spec.ts src/app/feature/system/birge/birge.testing.ts && git commit -m "$(cat <<'EOF'
feat(birge): правила порогов, словарей, отказа, подсветки находок и суток по Алматы

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Сводка дня (общая над экранами) и стили раздела

**Files:**
- Create: `src/app/feature/system/birge/_birge.scss`
- Create: `src/app/feature/system/birge/birge-summary.component.ts`
- Create: `src/app/feature/system/birge/birge-summary.component.html`
- Create: `src/app/feature/system/birge/birge-summary.component.scss`
- Test: `src/app/feature/system/birge/birge-summary.component.spec.ts`

**Interfaces:**
- Consumes: `BirgeModerationService.summary()` (задача 2); `almatyDayLabel`, `limitPercent`, `birgeErrorText` (задача 4);
  `RoleNavigationService.updateBadges(counts: Record<string, number>)` (есть в `role-navigation/role-navigation.service.ts`).
- Produces: `<app-birge-summary>`; класс `BirgeSummaryComponent` с публичными `data: BirgeSummary | null`,
  `error: string`, `dayLabel: string`, `percent: number` (getter), `reload(): void` — экраны зовут `reload()` после
  решения. Sass-модуль `_birge.scss`: переменные `$ink $muted $card $soft $line $accent $accent-bg $ok $ok-bg $warn
  $warn-bg $bad $bad-bg`, миксины `badges`, `page-states`, `actions` (подключение: `@use 'birge' as brg;`).

- [ ] **Step 1: Failing test**

`src/app/feature/system/birge/birge-summary.component.spec.ts`:

```ts
import { of, throwError } from 'rxjs';

import { BirgeSummaryComponent } from './birge-summary.component';
import { SUMMARY } from './birge.testing';

describe('BirgeSummaryComponent — сводка дня над экранами Birge', () => {
  let birge: { summary: jasmine.Spy };
  let nav: { updateBadges: jasmine.Spy };

  function build(): BirgeSummaryComponent {
    const c = new BirgeSummaryComponent(birge as never, nav as never);
    c.ngOnInit();
    return c;
  }

  beforeEach(() => {
    birge = { summary: jasmine.createSpy('summary').and.returnValue(of(SUMMARY)) };
    nav = { updateBadges: jasmine.createSpy('updateBadges') };
  });

  it('цифры дня, заполнение лимита и подпись «Сегодня» по Алматы', () => {
    const c = build();
    expect(c.data).toEqual(SUMMARY);
    expect(c.percent).toBe(33);
    expect(c.dayLabel).toMatch(/^Сегодня, \d{1,2} [а-я]+$/);
    expect(c.error).toBe('');
  });

  it('ждущие решения — значком у пункта меню и вкладки «Очередь»', () => {
    build();
    expect(nav.updateBadges).toHaveBeenCalledOnceWith({ birge: 1, 'birge/queue': 1 });
  });

  it('reload перечитывает сводку и значок', () => {
    const c = build();
    birge.summary.and.returnValue(of({ ...SUMMARY, pending: 0, escalated: 2 }));
    c.reload();
    expect(c.data!.pending).toBe(0);
    expect(c.percent).toBe(67);
    expect(nav.updateBadges).toHaveBeenCalledWith({ birge: 0, 'birge/queue': 0 });
  });

  it('бэкенд без модуля — понятная строка вместо цифр', () => {
    birge.summary.and.returnValue(throwError(() => ({ status: 404, error: {} })));
    const c = build();
    expect(c.data).toBeNull();
    expect(c.error).toBe('Раздел Birge на этом стенде ещё не включён: сервер ответил 404');
    expect(nav.updateBadges).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/feature/system/birge/birge-summary.component.spec.ts`
Expected: FAIL — `Cannot find module './birge-summary.component'`.

- [ ] **Step 3: Implement — стили раздела**

`src/app/feature/system/birge/_birge.scss`:

```scss
// Общие цвета и куски стилей раздела Birge. Переменными Sass, а не своими --токенами: в компоненте --токен с именем
// --jts-* сторож тёмной темы запрещает, а пара «светлый · тёмный» через --jts-dark — так устроены цветные значения во
// всей админке (styles.scss, «Тёмная тема»). Светлые значения — из прототипа раздела.

$ink: var(--jts-text, #171326);
$muted: var(--jts-text-muted, #5a5a66);
$card: var(--jts-surface, #fff);
$soft: var(--jts-surface-alt, #faf9fe);
$line: var(--jts-line, #ece8f5);
$accent: var(--jts-accent-ink, #9047ff);
$accent-bg: color-mix(in srgb, #efe7ff, #2f2545 calc(var(--jts-dark, 0) * 100%));
$ok: color-mix(in srgb, #18a957, #5fd394 calc(var(--jts-dark, 0) * 100%));
$ok-bg: color-mix(in srgb, #e6f7ee, #1d3a2a calc(var(--jts-dark, 0) * 100%));
$warn: color-mix(in srgb, #e8890c, #f0ae5a calc(var(--jts-dark, 0) * 100%));
$warn-bg: color-mix(in srgb, #fff4e2, #3a2a1f calc(var(--jts-dark, 0) * 100%));
$bad: color-mix(in srgb, #e5484d, #f08a8d calc(var(--jts-dark, 0) * 100%));
$bad-bg: color-mix(in srgb, #fdecec, #511f25 calc(var(--jts-dark, 0) * 100%));

// Плашки статусов и решений: .brg-badge.ok / .bad / .pend / .hid (тон — BirgeTone из birge.labels.ts).
@mixin badges {
  .brg-badge {
    display: inline-block;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;

    &.ok { background: $ok-bg; color: $ok; }
    &.bad { background: $bad-bg; color: $bad; }
    &.pend { background: $warn-bg; color: $warn; }
    &.hid { background: $soft; color: $muted; }
  }
}

// Загрузка, ошибка, пустой список и «Показать ещё» — одинаково на всех экранах раздела.
@mixin page-states {
  .brg-status { display: flex; align-items: center; gap: 12px; padding: 16px 0; color: $muted; }
  .brg-error { margin: 0 0 12px; color: $bad; white-space: pre-line; }
  .brg-empty { margin: 0; padding: 32px 16px; border: 1px dashed $line; border-radius: 16px; text-align: center; color: $muted; }
  .brg-more { margin-top: 12px; }
}

// Ряд кнопок решения: экран кладёт его внутрь app-birge-post-card, поэтому стили — у экрана.
@mixin actions {
  .brg-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
  .brg-actions__ok {
    --mdc-filled-button-container-color: #{$ok};
    --mdc-filled-button-label-text-color: #fff;
  }
  .brg-actions__bad {
    --mdc-outlined-button-label-text-color: #{$bad};
    --mdc-outlined-button-outline-color: #{$bad};
  }
  .brg-actions__hint { margin-left: auto; font-size: 12px; color: $muted; }
}
```

- [ ] **Step 4: Implement — компонент**

`src/app/feature/system/birge/birge-summary.component.ts`:

```ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BirgeSummary } from '../../../core/models/birge.models';
import { BirgeModerationService } from '../../../core/services/birge-moderation.service';
import { RoleNavigationService } from '../role-navigation/role-navigation.service';
import { almatyDayLabel, birgeErrorText, limitPercent } from './birge.rules';

/**
 * Сводка дня над всеми экранами Birge (спека §8): что AI решил сам, сколько ждёт человека и сколько ручных заявок дня
 * уже ушло в очередь из лимита. Экран, принявший решение, зовёт reload(): цифры должны совпасть с тем, что на экране.
 */
@Component({
  selector: 'app-birge-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './birge-summary.component.html',
  styleUrl: './birge-summary.component.scss'
})
export class BirgeSummaryComponent implements OnInit {
  readonly dayLabel = almatyDayLabel(new Date());
  data: BirgeSummary | null = null;
  error = '';

  constructor(private birge: BirgeModerationService, private nav: RoleNavigationService) {}

  ngOnInit(): void {
    this.reload();
  }

  get percent(): number {
    return this.data ? limitPercent(this.data.escalated, this.data.limit) : 0;
  }

  reload(): void {
    this.birge.summary().subscribe({
      next: (summary) => {
        this.data = summary;
        this.error = '';
        // Ждущие решения — значком у пункта меню и вкладки «Очередь», как счётчики очередей у других ролей
        this.nav.updateBadges({ birge: summary.pending, 'birge/queue': summary.pending });
      },
      error: (err) => (this.error = birgeErrorText(err, 'Сводка дня не загрузилась')),
    });
  }
}
```

`src/app/feature/system/birge/birge-summary.component.html`:

```html
<section class="brg-summary" aria-label="Сводка модерации за сегодня">
  <p class="brg-summary__day">{{ dayLabel }} · сутки лимита — по Алматы</p>
  <p class="brg-summary__error" *ngIf="error" role="alert">{{ error }}</p>
  <ul class="brg-summary__tiles" *ngIf="data as s">
    <li data-testid="auto-published"><small>Опубликовано автоматически</small><b class="ok">{{ s.autoPublished }}</b></li>
    <!-- autoRejected = auto_rejected + auto_rejected_overflow + auto_feedback (спека §5.2): без пометки отзывы в
         Feedback выглядели бы потерянными постами -->
    <li data-testid="auto-rejected" title="Отказы AI, отказы сверх дневного лимита и отзывы о платформе, ушедшие в Feedback">
      <small>Отклонено автоматически (вкл. Feedback)</small><b class="bad">{{ s.autoRejected }}</b>
    </li>
    <li data-testid="pending">
      <small>Ждут решения</small><b class="pend">{{ s.pending }}</b>
      <span class="brg-summary__sub" *ngIf="s.tomorrow">и {{ s.tomorrow }} на завтра</span>
    </li>
    <li data-testid="escalated">
      <small>Ручных заявок сегодня</small><b>{{ s.escalated }} / {{ s.limit }}</b>
      <span class="brg-summary__bar" role="progressbar" aria-label="Заполнение дневного лимита" aria-valuemin="0"
            [attr.aria-valuemax]="s.limit" [attr.aria-valuenow]="s.escalated"><i [style.width.%]="percent"></i></span>
    </li>
  </ul>
</section>
```

`src/app/feature/system/birge/birge-summary.component.scss`:

```scss
@use 'birge' as brg;

.brg-summary { margin: 0 0 20px; }
.brg-summary__day { margin: 0 0 10px; font-size: 13px; color: brg.$muted; }
.brg-summary__error { margin: 0 0 10px; font-size: 14px; color: brg.$bad; }

.brg-summary__tiles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;

  li { padding: 14px 16px; border: 1px solid brg.$line; border-radius: 18px; background: brg.$card; }
  small { display: block; font-weight: 600; color: brg.$muted; }
  b { display: block; margin-top: 4px; font-size: 26px; color: brg.$ink; }
  b.ok { color: brg.$ok; }
  b.bad { color: brg.$bad; }
  b.pend { color: brg.$warn; }
}

.brg-summary__sub { display: block; margin-top: 2px; font-size: 12px; color: brg.$muted; }

.brg-summary__bar {
  display: block;
  height: 8px;
  margin-top: 8px;
  border-radius: 99px;
  overflow: hidden;
  background: brg.$accent-bg;

  i { display: block; height: 100%; border-radius: 99px; background: var(--jts-violet, #9047ff); }
}

@media (max-width: 760px) {
  .brg-summary__tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

- [ ] **Step 5: Run — PASS**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/feature/system/birge/birge-summary.component.spec.ts`
Expected: `TOTAL: 4 SUCCESS`.

- [ ] **Step 6: Сторож тёмной темы**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npm run test:theme`
Expected: строка «ок» сторожа без нарушений (нарушение `var(--jts-…)` без запасного цвета здесь — ошибка, чинить).

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && git add src/app/feature/system/birge/_birge.scss src/app/feature/system/birge/birge-summary.component.ts src/app/feature/system/birge/birge-summary.component.html src/app/feature/system/birge/birge-summary.component.scss src/app/feature/system/birge/birge-summary.component.spec.ts && git commit -m "$(cat <<'EOF'
feat(birge): сводка дня над экранами модерации и цвета раздела

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Карточка поста (очередь и лента)

**Files:**
- Create: `src/app/feature/system/birge/birge-post-card.component.ts`
- Create: `src/app/feature/system/birge/birge-post-card.component.html`
- Create: `src/app/feature/system/birge/birge-post-card.component.scss`
- Test: `src/app/feature/system/birge/birge-post-card.component.spec.ts`

**Interfaces:**
- Consumes: `ManagerPost`, `BirgeMediaModeration`, `BirgeReason` (задача 2); `kindLabel`, `queueFlag`, `reasonText`,
  `isMarkerReason`, `postStatusLabel`, `rejectReasonLabel`, `topicLabel`, `mediaCheckLabel`, `BirgeLabel` (задача 3); `splitHits`,
  `TextPart` (задача 4); `SchoolDatePipe` (`shared/school-date.pipe.ts`, время в +05:00); `_birge.scss` (задача 5).
- Produces: `<app-birge-post-card [post]="ManagerPost" [showStatus]="boolean">…кнопки…</app-birge-post-card>` — корень
  `article[data-post-id]`, внутри `[data-testid="risk"]`, `[data-testid="queue-flag"]`, `[data-testid="status"]`
  (в ленте всегда, в очереди — только у скрытых: «Скрыто по жалобам»), `[data-testid="media-check"]`, найденные
  фрагменты — `<mark>` в тексте и продолжениях; содержимое между тегами проецируется в конец карточки.

- [ ] **Step 1: Failing test**

`src/app/feature/system/birge/birge-post-card.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerPost } from '../../../core/models/birge.models';
import { BirgePostCardComponent } from './birge-post-card.component';
import { managerPost } from './birge.testing';

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

describe('BirgePostCardComponent — пост глазами модератора', () => {
  let fixture: ComponentFixture<BirgePostCardComponent>;

  async function render(post: ManagerPost, showStatus = false): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [BirgePostCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(BirgePostCardComponent);
    fixture.componentRef.setInput('post', post);
    fixture.componentRef.setInput('showStatus', showStatus);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const text = (el: Element): string => el.textContent!.replace(/\s+/g, ' ');

  afterEach(() => fixture?.destroy());

  it('ветка: автор, уровень, время по Алматы, тип и тема, риск, причины, текст и продолжения', async () => {
    const el = await render(managerPost({ continuations: ['Это только у меня так?'] }));
    expect(text(el)).toContain('Аружан К.');
    expect(el.querySelector('.brg-card__level')!.textContent!.trim()).toBe('A2');
    expect(text(el)).toContain('11.11 09:58 · Новая ветка · Вопрос');
    expect(el.querySelector('[data-testid="risk"]')!.textContent!.trim()).toBe('Риск 48/100');
    expect(text(el)).toContain('Критика — нужно решение человека · 48');
    expect(text(el)).toContain('Тьютор сегодня объяснял слишком быстро');
    expect(text(el)).toContain('↳ Это только у меня так?');
    expect(el.querySelector('.brg-card__avatar--letter')!.textContent!.trim()).toBe('А');
    expect(el.querySelector('[data-testid="queue-flag"]')).toBeNull();
    expect(el.querySelector('[data-testid="status"]')).toBeNull();
  });

  it('комментарий: начало ветки вместо темы, без уровня, аватар картинкой', async () => {
    const el = await render(managerPost({
      kind: 'comment', parentId: 100, threadPreview: 'Present Perfect vs Past Simple', topic: null,
      author: { id: 5, name: 'Тимур Б.', level: null, avatarUrl: PIXEL },
    }));
    expect(text(el)).toContain('Комментарий к «Present Perfect vs Past Simple»');
    expect(el.querySelector('.brg-card__level')).toBeNull();
    expect((el.querySelector('img.brg-card__avatar') as HTMLImageElement).src).toBe(PIXEL);
  });

  it('скрытый по жалобам в очереди: плашка «Скрыто по жалобам», пометка «не тратит лимит», число жалоб', async () => {
    const el = await render(managerPost({
      status: 'hidden', hiddenReason: 'reports', queueSource: 'reports', reportsCount: 3,
      reasons: [{ code: 'REPORTS', score: 0 }, { code: 'CAPS', score: 35 }],
    }));
    const badge = el.querySelector('[data-testid="status"]')!;
    expect(badge.textContent!.trim()).toBe('Скрыто по жалобам');
    expect(badge.classList).toContain('hid');
    expect(el.querySelector('[data-testid="queue-flag"]')!.textContent!.trim()).toBe('Жалобы студентов');
    expect(text(el)).toContain('не тратит лимит');
    expect(text(el)).toContain('Жалоб: 3');
    // метка REPORTS уже сказана пометкой очереди — второй плашкой с «· 0» она не дублируется
    const reasons = Array.from(el.querySelectorAll('.brg-reason')).map((r) => r.textContent!.trim());
    expect(reasons).toEqual(['Текст капсом (крик) · 35']);
  });

  it('метка без пометки очереди — плашкой без числа риска', async () => {
    const el = await render(managerPost({ queueSource: null, status: 'hidden', hiddenReason: 'manager', reasons: [{ code: 'AI_UNAVAILABLE', score: 0 }] }), true);
    const reasons = Array.from(el.querySelectorAll('.brg-reason')).map((r) => r.textContent!.trim());
    expect(reasons).toEqual(['AI-проверка недоступна']);
  });

  it('найденные фрагменты подсвечены везде, без учёта регистра; разметка ученика остаётся текстом', async () => {
    const el = await render(managerPost({
      text: 'бля, опять х@й и БЛЯ <b>жирно</b>', continuations: ['и тут бля'], hits: ['х@й', 'бля', '<b>'],
    }));
    const marks = Array.from(el.querySelectorAll('mark')).map((m) => m.textContent);
    expect(marks).toEqual(['бля', 'х@й', 'БЛЯ', '<b>', 'бля']);
    expect(el.querySelector('.brg-card__text b')).toBeNull();
    expect(el.querySelector('.brg-card__text')!.textContent).toBe('бля, опять х@й и БЛЯ <b>жирно</b>');
    expect(el.querySelector('.brg-card__more')!.textContent).toBe('↳ и тут бля');
  });

  it('в ленте — плашка статуса, время решения и причина отказа модератора', async () => {
    const el = await render(managerPost({
      status: 'rejected', queueSource: null, moderatedAt: '2026-11-11T10:15:00+05:00',
      rejectReason: { code: 'OTHER', note: 'Реклама курса' },
    }), true);
    const badge = el.querySelector('[data-testid="status"]')!;
    expect(badge.textContent!.trim()).toBe('Отклонено');
    expect(badge.classList).toContain('bad');
    expect(text(el)).toContain('решение 11.11 10:15');
    expect(text(el)).toContain('Причина отказа: Другое: Реклама курса');
  });

  it('фото: картинка и итог проверки; удалённое — подпись вместо картинки, категория остаётся', async () => {
    const el = await render(managerPost({
      media: [
        { id: 7, url: PIXEL, width: 1600, height: 1200, moderation: { state: 'ok', category: 'ok', confidence: 0.98 } },
        { id: 8, url: null, width: 800, height: 600, moderation: { state: 'flagged', category: 'weapon', confidence: 0.91 } },
      ],
    }));
    const checks = Array.from(el.querySelectorAll('[data-testid="media-check"]')).map((n) => n.textContent!.trim());
    expect(checks).toEqual(['Фото: безопасно · 98 %', 'Фото: оружие · 91 %']);
    expect(el.querySelectorAll('.brg-card__media img').length).toBe(1);
    expect(text(el)).toContain('Фото удалено');
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/feature/system/birge/birge-post-card.component.spec.ts`
Expected: FAIL — `Cannot find module './birge-post-card.component'`.

- [ ] **Step 3: Implement**

`src/app/feature/system/birge/birge-post-card.component.ts`:

```ts
import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BirgeReason, ManagerPost } from '../../../core/models/birge.models';
import { SchoolDatePipe } from '../../../shared/school-date.pipe';
import {
  BirgeLabel, isMarkerReason, kindLabel, mediaCheckLabel, postStatusLabel, queueFlag, reasonText, rejectReasonLabel,
  topicLabel
} from './birge.labels';
import { TextPart, splitHits } from './birge.rules';

/**
 * Пост глазами модератора — общий для очереди и ленты: автор, уровень, время, тип, тема, риск и причины, текст с
 * продолжениями (найденное модерацией подсвечено) и фото с итогом их проверки. Кнопки решения экран кладёт внутрь
 * (ng-content): у очереди и ленты они разные. Время — в поясе школы (+05:00, как Asia/Almaty), а не браузера.
 */
@Component({
  selector: 'app-birge-post-card',
  standalone: true,
  imports: [CommonModule, SchoolDatePipe],
  templateUrl: './birge-post-card.component.html',
  styleUrl: './birge-post-card.component.scss'
})
export class BirgePostCardComponent implements OnChanges {
  @Input({ required: true }) post!: ManagerPost;
  /** Плашка статуса и время решения: ленте нужны всегда, очереди — только у скрытых по жалобам. */
  @Input() showStatus = false;

  readonly reasonText = reasonText;
  readonly topicLabel = topicLabel;
  readonly mediaCheck = mediaCheckLabel;
  /**
   * Куски текста и продолжений с подсветкой hits и причины для плашек. Считаются при смене поста, а не геттером: новый
   * массив на каждой проверке шаблона в dev-сборке валил бы *ngFor ошибкой ExpressionChangedAfterItHasBeenChecked.
   */
  textParts: TextPart[] = [];
  moreParts: TextPart[][] = [];
  reasons: BirgeReason[] = [];

  ngOnChanges(): void {
    const hits = this.post.hits ?? [];
    this.textParts = splitHits(this.post.text, hits);
    this.moreParts = this.post.continuations.map((line) => splitHits(line, hits));
    // Метки REPORTS и AI_UNAVAILABLE (score 0) при пометке очереди повторили бы её второй плашкой
    this.reasons = this.flag ? this.post.reasons.filter((r) => !isMarkerReason(r)) : this.post.reasons;
  }

  get kind(): string {
    return kindLabel(this.post);
  }

  get flag(): string | null {
    return queueFlag(this.post.queueSource);
  }

  get status(): BirgeLabel {
    return postStatusLabel(this.post);
  }

  /** Плашка статуса: в ленте всегда, в очереди — только у скрытых (по жалобам он ждёт решения, но ученикам не виден). */
  get showBadge(): boolean {
    return this.showStatus || this.post.status === 'hidden';
  }

  get initial(): string {
    return this.post.author.name.trim().charAt(0).toUpperCase() || '?';
  }

  get rejectWhy(): string | null {
    const reason = this.post.rejectReason;
    return reason ? rejectReasonLabel(reason.code) + (reason.note ? `: ${reason.note}` : '') : null;
  }
}
```

`src/app/feature/system/birge/birge-post-card.component.html`:

```html
<article class="brg-card" [attr.data-post-id]="post.id">
  <header class="brg-card__head">
    <img *ngIf="post.author.avatarUrl as avatar; else letter" class="brg-card__avatar" [src]="avatar" alt="">
    <ng-template #letter><span class="brg-card__avatar brg-card__avatar--letter" aria-hidden="true">{{ initial }}</span></ng-template>
    <div class="brg-card__who">
      <b>{{ post.author.name }}</b>
      <span class="brg-card__level" *ngIf="post.author.level">{{ post.author.level }}</span>
      <small>{{ post.createdAt | schoolDate:'dd.MM HH:mm' }} · {{ kind }}<ng-container *ngIf="post.topic"> · {{ topicLabel(post.topic) }}</ng-container></small>
    </div>
    <span class="brg-card__risk" data-testid="risk">Риск {{ post.risk }}/100</span>
  </header>

  <div class="brg-card__why">
    <span *ngIf="showBadge" class="brg-badge" [ngClass]="status.tone" data-testid="status">{{ status.label }}</span>
    <span *ngIf="showStatus && post.moderatedAt as at" class="brg-card__note">решение {{ at | schoolDate:'dd.MM HH:mm' }}</span>
    <span class="brg-reason" *ngFor="let r of reasons">{{ reasonText(r) }}</span>
    <ng-container *ngIf="flag">
      <span class="brg-flag" data-testid="queue-flag">{{ flag }}</span>
      <span class="brg-flag brg-flag--free">не тратит лимит</span>
    </ng-container>
    <span *ngIf="post.reportsCount" class="brg-card__note">Жалоб: {{ post.reportsCount }}</span>
  </div>

  <p class="brg-card__reject" *ngIf="rejectWhy">Причина отказа: {{ rejectWhy }}</p>

  <div class="brg-card__body">
    <!-- Куски — интерполяцией, а не innerHTML: текст ученика экранирует сам Angular. В одну строку — иначе пробелы
         разметки встали бы между словом и подсветкой. -->
    <p class="brg-card__text" *ngIf="post.text"><ng-container *ngFor="let part of textParts"><mark *ngIf="part.hit; else plain">{{ part.text }}</mark><ng-template #plain>{{ part.text }}</ng-template></ng-container></p>
    <p class="brg-card__more" *ngFor="let parts of moreParts">↳ <ng-container *ngFor="let part of parts"><mark *ngIf="part.hit; else plainMore">{{ part.text }}</mark><ng-template #plainMore>{{ part.text }}</ng-template></ng-container></p>
    <ul class="brg-card__media" *ngIf="post.media.length">
      <li *ngFor="let m of post.media">
        <a *ngIf="m.url as url; else gone" [href]="url" target="_blank" rel="noopener">
          <img [src]="url" [attr.width]="m.width" [attr.height]="m.height" alt="Фото поста" loading="lazy">
        </a>
        <ng-template #gone><span class="brg-card__gone">Фото удалено</span></ng-template>
        <small [class.bad]="m.moderation?.state === 'flagged'" data-testid="media-check">{{ mediaCheck(m.moderation) }}</small>
      </li>
    </ul>
  </div>

  <ng-content></ng-content>
</article>
```

`src/app/feature/system/birge/birge-post-card.component.scss`:

```scss
@use 'birge' as brg;

@include brg.badges;

.brg-card {
  margin: 0 0 12px;
  padding: 14px;
  border: 1px solid brg.$line;
  border-radius: 16px;
  background: brg.$card;
  color: brg.$ink;
}

.brg-card__head { display: flex; align-items: center; gap: 10px; }
.brg-card__avatar { flex: none; width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.brg-card__avatar--letter { display: grid; place-items: center; background: brg.$accent-bg; color: brg.$accent; font-weight: 800; }

.brg-card__who {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  min-width: 0;

  small { flex-basis: 100%; color: brg.$muted; overflow-wrap: anywhere; }
}

.brg-card__level { padding: 1px 7px; border-radius: 999px; background: brg.$accent-bg; color: brg.$accent; font-size: 11px; font-weight: 700; }
.brg-card__risk { flex: none; margin-left: auto; font-size: 13px; font-weight: 800; color: brg.$warn; }

.brg-card__why { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 10px 0; }
.brg-reason { padding: 3px 8px; border-radius: 8px; background: brg.$warn-bg; color: brg.$warn; font-size: 11px; font-weight: 700; }
.brg-flag { padding: 3px 8px; border-radius: 8px; background: brg.$accent-bg; color: brg.$accent; font-size: 11px; font-weight: 700; }
.brg-flag--free { background: transparent; border: 1px solid brg.$accent-bg; }
.brg-card__note { font-size: 12px; color: brg.$muted; }
.brg-card__reject { margin: 0 0 8px; font-size: 13px; color: brg.$bad; }

.brg-card__body { padding: 12px; border-radius: 12px; background: brg.$soft; line-height: 1.5; }
.brg-card__text, .brg-card__more { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.brg-card__more { margin-top: 6px; color: brg.$muted; }
// Найденное модерацией — как подсветка у ученика в прототипе
mark { padding: 0 2px; border-radius: 4px; background: brg.$bad-bg; color: brg.$bad; }

.brg-card__media {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;

  img { display: block; width: 100%; height: 140px; object-fit: cover; border-radius: 10px; }
  small { display: block; margin-top: 4px; font-size: 12px; color: brg.$muted; }
  small.bad { color: brg.$bad; }
}

.brg-card__gone {
  display: grid;
  place-items: center;
  height: 140px;
  border: 1px dashed brg.$line;
  border-radius: 10px;
  font-size: 13px;
  color: brg.$muted;
}
```

- [ ] **Step 4: Run — PASS**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/feature/system/birge/birge-post-card.component.spec.ts`
Expected: `TOTAL: 7 SUCCESS`.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && git add src/app/feature/system/birge/birge-post-card.component.ts src/app/feature/system/birge/birge-post-card.component.html src/app/feature/system/birge/birge-post-card.component.scss src/app/feature/system/birge/birge-post-card.component.spec.ts && git commit -m "$(cat <<'EOF'
feat(birge): карточка поста для модератора — причины, подсветка находок, пометки очереди, фото

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Окно «Отклонить» с причиной

**Files:**
- Create: `src/app/feature/system/birge/birge-reject-dialog.component.ts`
- Create: `src/app/feature/system/birge/birge-reject-dialog.component.html`
- Create: `src/app/feature/system/birge/birge-reject-dialog.component.scss`
- Test: `src/app/feature/system/birge/birge-reject-dialog.component.spec.ts`

**Interfaces:**
- Consumes: `ManagerPost`, `BirgeRejectCode` (задача 2); `REJECT_REASONS` (задача 3); `NOTE_MAX`, `rejectProblem`
  (задача 4).
- Produces: `BirgeRejectDialogComponent`; `interface BirgeRejectDialogData {post: ManagerPost}`;
  `interface BirgeRejectChoice {reason: BirgeRejectCode; note: string | null}`. Окно закрывается `BirgeRejectChoice`
  или ничем (отмена); запрос не шлёт — его шлёт очередь.

- [ ] **Step 1: Failing test**

`src/app/feature/system/birge/birge-reject-dialog.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ManagerPost } from '../../../core/models/birge.models';
import { BirgeRejectDialogComponent } from './birge-reject-dialog.component';
import { managerPost } from './birge.testing';

describe('BirgeRejectDialogComponent — причина отказа', () => {
  let fixture: ComponentFixture<BirgeRejectDialogComponent>;
  let ref: { close: jasmine.Spy };

  async function open(post: ManagerPost = managerPost({
    id: 7, kind: 'comment', threadPreview: 'Ищу партнёра', text: 'Пишите мне в телеграм @promo_kz',
  })): Promise<void> {
    ref = { close: jasmine.createSpy('close') };
    await TestBed.configureTestingModule({
      imports: [BirgeRejectDialogComponent, NoopAnimationsModule],
      providers: [{ provide: MatDialogRef, useValue: ref }, { provide: MAT_DIALOG_DATA, useValue: { post } }],
    }).compileComponents();
    fixture = TestBed.createComponent(BirgeRejectDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (): string => el().textContent!.replace(/\s+/g, ' ');

  function click(testid: string): void {
    (el().querySelector(`[data-testid="${testid}"]`) as HTMLElement).click();
    fixture.detectChanges();
  }

  function typeNote(value: string): void {
    const area = el().querySelector('[data-testid="note"]') as HTMLTextAreaElement;
    area.value = value;
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  afterEach(() => fixture?.destroy());

  it('заголовок по типу поста, цитата и пять причин контракта по порядку', async () => {
    await open();
    expect(text()).toContain('Отклонить комментарий');
    expect(text()).toContain('«Пишите мне в телеграм @promo_kz»');
    const radios = Array.from(el().querySelectorAll('input[type="radio"]'));
    expect(radios.map((r) => r.getAttribute('data-testid')))
      .toEqual(['reason-INSULT', 'reason-PROFANITY', 'reason-ADS_CONTACTS', 'reason-OFF_TOPIC', 'reason-OTHER']);
    expect(text()).toContain('Реклама или контакты');
  });

  it('без причины окно не закрывается и подсказывает', async () => {
    await open();
    click('confirm');
    expect(ref.close).not.toHaveBeenCalled();
    expect(text()).toContain('Выберите причину отказа');
  });

  it('«Не по теме» — закрытие с причиной, без заметки', async () => {
    await open();
    click('reason-OFF_TOPIC');
    click('confirm');
    expect(ref.close).toHaveBeenCalledOnceWith({ reason: 'OFF_TOPIC', note: null });
  });

  it('«Другое» — только с описанием; описание уходит без крайних пробелов', async () => {
    await open();
    click('reason-OTHER');
    click('confirm');
    expect(ref.close).not.toHaveBeenCalled();
    expect(text()).toContain('Опишите причину — автор увидит её в уведомлении');
    typeNote('  Реклама чужого курса  ');
    click('confirm');
    expect(ref.close).toHaveBeenCalledOnceWith({ reason: 'OTHER', note: 'Реклама чужого курса' });
  });

  it('«Отмена» — закрытие без решения', async () => {
    await open();
    click('cancel');
    expect(ref.close).toHaveBeenCalledOnceWith();
  });

  it('ветка из одного фото — заголовок «Отклонить ветку», в цитате — «(только фото)»', async () => {
    await open(managerPost({ kind: 'thread', text: '' }));
    expect(text()).toContain('Отклонить ветку');
    expect(text()).toContain('«(только фото)»');
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/feature/system/birge/birge-reject-dialog.component.spec.ts`
Expected: FAIL — `Cannot find module './birge-reject-dialog.component'`.

- [ ] **Step 3: Implement**

`src/app/feature/system/birge/birge-reject-dialog.component.ts`:

```ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { BirgeRejectCode, ManagerPost } from '../../../core/models/birge.models';
import { REJECT_REASONS } from './birge.labels';
import { NOTE_MAX, rejectProblem } from './birge.rules';

export interface BirgeRejectDialogData {
  post: ManagerPost;
}

/** Выбор модератора; null у note — без комментария. */
export interface BirgeRejectChoice {
  reason: BirgeRejectCode;
  note: string | null;
}

/**
 * «Отклонить» в очереди: причина из пяти по контракту, у «Другого» — обязательное описание (его увидит автор в
 * уведомлении). Окно только собирает выбор; запрос шлёт очередь — так ошибка сервера показывается на её экране, а
 * повторная попытка не требует снова выбирать причину вслепую.
 */
@Component({
  selector: 'app-birge-reject-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule],
  templateUrl: './birge-reject-dialog.component.html',
  styleUrl: './birge-reject-dialog.component.scss'
})
export class BirgeRejectDialogComponent {
  private readonly ref = inject(MatDialogRef<BirgeRejectDialogComponent, BirgeRejectChoice>);
  readonly post = inject<BirgeRejectDialogData>(MAT_DIALOG_DATA).post;
  readonly reasons = REJECT_REASONS;
  readonly noteMax = NOTE_MAX;
  reason: BirgeRejectCode | null = null;
  note = '';
  /** Подсказку показываем после первой попытки: до выбора красная строка выглядела бы упрёком. */
  tried = false;

  get isThread(): boolean {
    return this.post.kind === 'thread';
  }

  get preview(): string {
    const text = this.post.text.trim() || '(только фото)';
    return text.length > 160 ? text.slice(0, 160) + '…' : text;
  }

  get problem(): string | null {
    return rejectProblem(this.reason, this.note);
  }

  confirm(): void {
    this.tried = true;
    if (this.problem || !this.reason) return;
    this.ref.close({ reason: this.reason, note: this.note.trim() || null });
  }

  cancel(): void {
    this.ref.close();
  }
}
```

`src/app/feature/system/birge/birge-reject-dialog.component.html`:

```html
<h2 mat-dialog-title>Отклонить {{ isThread ? 'ветку' : 'комментарий' }}</h2>
<mat-dialog-content class="brg-reject">
  <p class="brg-reject__quote">«{{ preview }}»</p>

  <fieldset class="brg-reject__reasons">
    <legend>Причина — автор увидит её в уведомлении</legend>
    <label *ngFor="let r of reasons">
      <input type="radio" name="brg-reject-reason" [value]="r.code" [(ngModel)]="reason" [attr.data-testid]="'reason-' + r.code">
      {{ r.label }}
    </label>
  </fieldset>

  <label class="brg-reject__note">
    {{ reason === 'OTHER' ? 'Опишите причину (обязательно)' : 'Комментарий для автора (необязательно)' }}
    <textarea name="brg-reject-note" rows="3" [maxlength]="noteMax" [(ngModel)]="note" data-testid="note"></textarea>
    <small>{{ note.length }} / {{ noteMax }}</small>
  </label>

  <p class="brg-reject__error" *ngIf="tried && problem" role="alert">{{ problem }}</p>
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button type="button" (click)="cancel()" data-testid="cancel">Отмена</button>
  <button mat-flat-button color="warn" type="button" (click)="confirm()" data-testid="confirm">Отклонить</button>
</mat-dialog-actions>
```

`src/app/feature/system/birge/birge-reject-dialog.component.scss`:

```scss
@use 'birge' as brg;

.brg-reject { display: flex; flex-direction: column; gap: 14px; color: brg.$ink; }
.brg-reject__quote { margin: 0; padding: 10px 12px; border-radius: 12px; background: brg.$soft; color: brg.$muted; overflow-wrap: anywhere; }

.brg-reject__reasons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;

  legend { margin-bottom: 6px; font-weight: 600; }
  label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
}

.brg-reject__note {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 600;

  textarea {
    box-sizing: border-box;
    width: 100%;
    padding: 10px;
    border: 1px solid brg.$line;
    border-radius: 12px;
    background: brg.$card;
    color: brg.$ink;
    font: inherit;
    font-weight: 400;
    resize: vertical;
  }

  small { align-self: flex-end; font-weight: 400; color: brg.$muted; }
}

.brg-reject__error { margin: 0; color: brg.$bad; }
```

- [ ] **Step 4: Run — PASS**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/feature/system/birge/birge-reject-dialog.component.spec.ts`
Expected: `TOTAL: 6 SUCCESS`.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && git add src/app/feature/system/birge/birge-reject-dialog.component.ts src/app/feature/system/birge/birge-reject-dialog.component.html src/app/feature/system/birge/birge-reject-dialog.component.scss src/app/feature/system/birge/birge-reject-dialog.component.spec.ts && git commit -m "$(cat <<'EOF'
feat(birge): окно отказа — причина из контракта, у «Другого» обязательное описание

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Очередь проверки, блок меню «Birge» и маршрут

**Files:**
- Create: `src/app/feature/system/birge/birge-queue-page.component.ts`
- Create: `src/app/feature/system/birge/birge-queue-page.component.html`
- Create: `src/app/feature/system/birge/birge-queue-page.component.scss`
- Test: `src/app/feature/system/birge/birge-queue-page.component.spec.ts`
- Modify: `src/app/feature/system/role-navigation/role-navigation.config.ts` (новая константа `birgeBlock` перед
  `export function cabinetBlocks(`, вставка в список ADMIN после `contentBlock(true),` и в список CONTENT_MANAGER после
  блока `library`)
- Modify: `src/app/feature/system/role-navigation/role-navigation.config.spec.ts` (порядок блоков ADMIN и
  CONTENT_MANAGER, новый `it` про Birge)
- Modify: `src/app/feature/system/system.routes.ts` (маршрут `birge/queue` после `content/word-hunt`)
- Modify: `src/app/feature/system/system.routes.spec.ts` (импорт и `describe('system.routes — Birge')` в конце файла)

**Interfaces:**
- Consumes: `BirgeModerationService.queue/settings/decide` (задача 2); `overflowShort` (задача 3); `birgeErrorText`
  (задача 4); `BirgeSummaryComponent.reload()` (задача 5); `<app-birge-post-card>` (задача 6);
  `BirgeRejectDialogComponent`, `BirgeRejectDialogData`, `BirgeRejectChoice` (задача 7).
- Produces: `BirgeQueuePageComponent` (маршрут `/system/birge/queue`); константа `birgeBlock()` в навигации с одним
  разделом `queue` — задачи 9–11 дописывают разделы в её массив `sections`; в `system.routes.spec.ts` массив `pages`
  блока «Birge» — задачи 9–11 дописывают в него строки.

- [ ] **Step 1: Failing test — экран очереди**

`src/app/feature/system/birge/birge-queue-page.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Observable, Subject, of, throwError } from 'rxjs';

import { BirgeQueue } from '../../../core/models/birge.models';
import { BirgeModerationService } from '../../../core/services/birge-moderation.service';
import { ToastService } from '../../../core/services/toast.service';
import { RoleNavigationService } from '../role-navigation/role-navigation.service';
import { BirgeQueuePageComponent } from './birge-queue-page.component';
import { BirgeRejectDialogComponent } from './birge-reject-dialog.component';
import { SUMMARY, birgeSettings, managerPost } from './birge.testing';

describe('BirgeQueuePageComponent — очередь проверки', () => {
  const risky = managerPost({ id: 101 });
  const reported = managerPost({
    id: 102, status: 'hidden', hiddenReason: 'reports', queueSource: 'reports', reportsCount: 3,
    reasons: [{ code: 'REPORTS', score: 0 }], text: 'Спорная ветка',
  });
  const aiDown = managerPost({ id: 104, queueSource: 'ai_unavailable', reasons: [{ code: 'AI_UNAVAILABLE', score: 0 }], text: 'Пост без проверки AI' });
  const later = managerPost({ id: 103, status: 'tomorrow', text: 'Отложенный пост' });

  let birge: { queue: jasmine.Spy; summary: jasmine.Spy; settings: jasmine.Spy; decide: jasmine.Spy };
  let dialog: { open: jasmine.Spy };
  let toast: { showSuccess: jasmine.Spy; showError: jasmine.Spy };
  let fixture: ComponentFixture<BirgeQueuePageComponent>;

  async function open(queue: Observable<BirgeQueue> = of({ pending: [risky, reported, aiDown], tomorrow: [later] })): Promise<void> {
    birge = {
      queue: jasmine.createSpy('queue').and.returnValue(queue),
      summary: jasmine.createSpy('summary').and.returnValue(of(SUMMARY)),
      settings: jasmine.createSpy('settings').and.returnValue(of(birgeSettings())),
      decide: jasmine.createSpy('decide').and.callFake((id: number) => of(managerPost({ id, status: 'published' }))),
    };
    dialog = { open: jasmine.createSpy('open') };
    toast = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
    await TestBed.configureTestingModule({
      imports: [BirgeQueuePageComponent],
      providers: [
        provideNoopAnimations(),
        { provide: BirgeModerationService, useValue: birge },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastService, useValue: toast },
        { provide: RoleNavigationService, useValue: { updateBadges: jasmine.createSpy('updateBadges') } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BirgeQueuePageComponent);
    fixture.detectChanges();
  }

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (el: Element = page()): string => el.textContent!.replace(/\s+/g, ' ');
  const card = (id: number): HTMLElement | null => page().querySelector(`[data-post-id="${id}"]`);

  function press(id: number, testid: 'approve' | 'reject'): void {
    (card(id)!.querySelector(`[data-testid="${testid}"]`) as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  afterEach(() => fixture?.destroy());

  it('сверху сводка дня и свёрнутое «Как работает модерация» с порогами из настроек', async () => {
    await open();
    expect(text()).toContain('Опубликовано автоматически');
    expect(text()).toContain('Отклонено автоматически (вкл. Feedback)');
    expect(text()).toContain('1 / 3');
    const how = page().querySelector('[data-testid="how"]') as HTMLDetailsElement;
    expect(how.open).toBeFalse();
    expect(text(how)).toContain('Риск < 30');
    expect(text(how)).toContain('Риск ≥ 70');
    expect(text(how)).toContain('не больше 3 в день');
    expect(text(how)).toContain('«отклонять»');
  });

  it('карточка: кнопки решения; жалобы и сбой AI помечены «не тратит лимит», обычный риск — нет', async () => {
    await open();
    // порядок задаёт сервер (время входа в очередь) — экран его не пересортировывает
    const order = Array.from(page().querySelectorAll('[data-post-id]')).map((n) => Number(n.getAttribute('data-post-id')));
    expect(order).toEqual([101, 102, 104, 103]);
    expect(text(card(101)!)).toContain('Одобрить и опубликовать');
    expect(text(card(101)!)).toContain('Отклонить');
    expect(card(101)!.querySelector('[data-testid="queue-flag"]')).toBeNull();
    expect(card(101)!.querySelector('[data-testid="status"]')).toBeNull();
    expect(text(card(102)!)).toContain('Жалобы студентов');
    expect(text(card(102)!)).toContain('не тратит лимит');
    expect(text(card(104)!)).toContain('AI недоступен');
  });

  it('скрытый по жалобам без решения: плашка «Скрыто по жалобам» и те же approve / reject', async () => {
    await open();
    expect(card(102)!.querySelector('[data-testid="status"]')!.textContent!.trim()).toBe('Скрыто по жалобам');
    press(102, 'approve');
    expect(birge.decide).toHaveBeenCalledOnceWith(102, { action: 'approve', reason: null, note: null });
    expect(card(102)).toBeNull();
  });

  it('отложенные на завтра — своим блоком и с теми же кнопками', async () => {
    await open();
    const tomorrow = page().querySelector('[data-testid="tomorrow"]')!;
    expect(text(tomorrow)).toContain('Отложено на завтра (1)');
    expect(tomorrow.querySelector('[data-post-id="103"] [data-testid="approve"]')).not.toBeNull();
  });

  it('«Одобрить и опубликовать»: approve, карточка уходит, тост, сводка перечитана', async () => {
    await open();
    press(101, 'approve');
    expect(birge.decide).toHaveBeenCalledOnceWith(101, { action: 'approve', reason: null, note: null });
    expect(card(101)).toBeNull();
    expect(toast.showSuccess).toHaveBeenCalledWith('Опубликовано — автор получил уведомление');
    expect(birge.summary).toHaveBeenCalledTimes(2);
  });

  it('«Отклонить»: окно с причиной, затем reject с выбранной причиной', async () => {
    await open();
    dialog.open.and.returnValue({ afterClosed: () => of({ reason: 'OFF_TOPIC', note: null }) });
    press(101, 'reject');
    expect(dialog.open).toHaveBeenCalledWith(BirgeRejectDialogComponent, jasmine.objectContaining({ data: { post: risky } }));
    expect(birge.decide).toHaveBeenCalledOnceWith(101, { action: 'reject', reason: 'OFF_TOPIC', note: null });
    expect(card(101)).toBeNull();
    expect(toast.showSuccess).toHaveBeenCalledWith('Отклонено — автор получил уведомление');
  });

  it('окно закрыли без выбора — решения нет, карточка на месте', async () => {
    await open();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) });
    press(101, 'reject');
    expect(birge.decide).not.toHaveBeenCalled();
    expect(card(101)).not.toBeNull();
  });

  it('пока решение в пути, второй клик запроса не шлёт', async () => {
    await open();
    birge.decide.and.returnValue(new Subject());
    press(101, 'approve');
    press(101, 'approve');
    expect(birge.decide).toHaveBeenCalledTimes(1);
    expect((card(101)!.querySelector('[data-testid="approve"]') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('409 — по посту уже решили: текст сервера и свежая очередь', async () => {
    await open();
    birge.decide.and.returnValue(throwError(() => ({ status: 409, error: { messages: ['По посту уже принято решение'] } })));
    press(101, 'approve');
    expect(toast.showError).toHaveBeenCalledWith('По посту уже принято решение');
    expect(birge.queue).toHaveBeenCalledTimes(2);
  });

  it('пустая очередь — так и сказано, блока «на завтра» нет', async () => {
    await open(of({ pending: [], tomorrow: [] }));
    expect(text()).toContain('Очередь пуста');
    expect(page().querySelector('[data-testid="tomorrow"]')).toBeNull();
  });

  it('бэкенд без модуля birge (404) — понятная строка, а не «очередь пуста»', async () => {
    await open(throwError(() => ({ status: 404, error: {} })));
    expect(text()).toContain('Раздел Birge на этом стенде ещё не включён');
    expect(text()).not.toContain('Очередь пуста');
  });
});
```

- [ ] **Step 2: Failing test — навигация и маршрут**

В `src/app/feature/system/role-navigation/role-navigation.config.spec.ts` заменить две строки порядка блоков:

```ts
    expect(cabinetBlocks('ADMIN').map(b=>b.title)).toEqual(['Рабочий стол','Задачи','Продажи','Ученики','Преподаватели','Координация','Контент','Финансы','Система']);
```

на

```ts
    expect(cabinetBlocks('ADMIN').map(b=>b.title)).toEqual(['Рабочий стол','Задачи','Продажи','Ученики','Преподаватели','Координация','Контент','Birge','Финансы','Система']);
```

и

```ts
    expect(cabinetBlocks('CONTENT_MANAGER').map(b=>b.title)).toEqual(['Главная','Контент платформы','Новости','Токены и призы','Деньги','Задачи']);
```

на

```ts
    expect(cabinetBlocks('CONTENT_MANAGER').map(b=>b.title)).toEqual(['Главная','Контент платформы','Birge','Новости','Токены и призы','Деньги','Задачи']);
```

Перед строкой `  it('gives JTS Hub to teachers only, in the common block',()=>{` вставить:

```ts
  it('gives Birge to the content manager and the admin, straight into the moderation queue',()=>{
    for(const role of ['CONTENT_MANAGER','ADMIN']){
      const blocks=cabinetBlocks(role);
      const birge=blocks.find(b=>b.id==='birge')!;
      expect(birge.icon).withContext(role).toBe('forum');
      expect(birge.sections.map(s=>s.route)).withContext(role).toEqual(['/system/birge/queue']);
      // Прямой блок: пункт меню открывает очередь, без страницы «Обзор»
      expect(blockLink(birge)).withContext(role).toBe('/system/birge/queue');
      for(const s of birge.sections){
        expect(cabinetContext(s.route,blocks)?.section?.id).withContext(role+': '+s.route).toBe(s.id);
        expect(cabinetPathAllowed(role,s.route)).withContext(role+': '+s.route).toBeTrue();
      }
    }
    for(const role of ['TEACHER','COORDINATOR','MANAGER'])expect(cabinetPathAllowed(role,'/system/birge/queue')).withContext(role).toBeFalse();
  });
```

В `src/app/feature/system/system.routes.spec.ts` после строки
`import { WordHuntPageComponent } from './word-hunt/word-hunt-page.component';` добавить:

```ts
import { BirgeQueuePageComponent } from './birge/birge-queue-page.component';
```

и в конец файла (после закрывающего `});` блока `describe('system.routes — Word Hunt'`) дописать:

```ts

/*
 * Birge: ручки /admin/birge/** бэкенд открывает CONTENT_MANAGER и ADMIN (спека jts-web-app
 * 2026-11-11-birge-community-design.md, §2 и §5.2). Преподавателю и менеджеру раздела нет — ни в меню, ни по адресу.
 */
describe('system.routes — Birge', () => {
  const pages: [string, unknown][] = [
    ['birge/queue', BirgeQueuePageComponent],
  ];

  for (const [path] of pages) {
    // canActivateAs настраивает TestBed — по одному вызову на тест
    for (const role of ['CONTENT_MANAGER', 'ADMIN']) {
      it(`${path} пускает ${role}`, () => {
        expect(canActivateAs(findRoute(path), role).allowed.every((ok) => ok === true)).toBeTrue();
      });
    }
    for (const role of ['TEACHER', 'MANAGER', 'STUDENT']) {
      it(`${path} не пускает ${role}`, () => {
        expect(canActivateAs(findRoute(path), role).allowed).toContain(false);
      });
    }
  }

  it('адреса открывают свои экраны (путь и имя экспорта в import() верные)', async () => {
    for (const [path, page] of pages) {
      expect(await (findRoute(path).loadComponent as () => Promise<unknown>)()).withContext(path).toBe(page);
    }
  });
});
```

- [ ] **Step 3: Run — FAIL**

Run:

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless \
  --include=src/app/feature/system/birge/birge-queue-page.component.spec.ts \
  --include=src/app/feature/system/role-navigation/role-navigation.config.spec.ts \
  --include=src/app/feature/system/system.routes.spec.ts
```

Expected: FAIL — `Cannot find module './birge-queue-page.component'` (сборка теста не проходит целиком).

- [ ] **Step 4: Implement — экран очереди**

`src/app/feature/system/birge/birge-queue-page.component.ts`:

```ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';

import { BirgeDecisionBody, BirgeSettings, ManagerPost } from '../../../core/models/birge.models';
import { BirgeModerationService } from '../../../core/services/birge-moderation.service';
import { ToastService } from '../../../core/services/toast.service';
import { BirgePostCardComponent } from './birge-post-card.component';
import { BirgeRejectChoice, BirgeRejectDialogComponent, BirgeRejectDialogData } from './birge-reject-dialog.component';
import { BirgeSummaryComponent } from './birge-summary.component';
import { overflowShort } from './birge.labels';
import { birgeErrorText } from './birge.rules';

/**
 * Очередь проверки Birge (спека §8): спорное после AI-модерации — не больше дневного лимита, плюс посты, которые AI не
 * успел проверить, и скрытые по жалобам без решения (status = hidden, §3.4) — эти лимит не тратят. approve/reject
 * допустимы у всего, что пришло в pending и tomorrow (матрица §5.2). Порядок pending задаёт сервер — по времени входа в
 * очередь, — и экран его не меняет. Решение меняет статус сразу и приходит автору уведомлением — это делает сервер;
 * экран убирает карточку и перечитывает сводку.
 */
@Component({
  selector: 'app-birge-queue-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, BirgeSummaryComponent, BirgePostCardComponent],
  templateUrl: './birge-queue-page.component.html',
  styleUrl: './birge-queue-page.component.scss'
})
export class BirgeQueuePageComponent implements OnInit {
  pending: ManagerPost[] = [];
  tomorrow: ManagerPost[] = [];
  /** Пороги для «Как работает модерация»; не загрузились — блок рассказывает без чисел. */
  settings: BirgeSettings | null = null;
  loading = false;
  loadError = '';
  /** Посты, по которым решение в пути: второй клик слал бы второе решение. */
  readonly busy = new Set<number>();
  readonly overflowShort = overflowShort;

  @ViewChild(BirgeSummaryComponent) summary?: BirgeSummaryComponent;

  constructor(private birge: BirgeModerationService, private dialog: MatDialog, private toast: ToastService) {}

  ngOnInit(): void {
    this.load();
    this.birge.settings().subscribe({ next: (s) => (this.settings = s), error: () => (this.settings = null) });
  }

  readonly trackPost = (_: number, post: ManagerPost): number => post.id;

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.birge.queue()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (queue) => {
          this.pending = queue.pending;
          this.tomorrow = queue.tomorrow;
        },
        error: (err) => {
          this.pending = [];
          this.tomorrow = [];
          this.loadError = birgeErrorText(err, 'Очередь не загрузилась');
        }
      });
  }

  refresh(): void {
    this.load();
    this.summary?.reload();
  }

  approve(post: ManagerPost): void {
    this.decide(post, { action: 'approve', reason: null, note: null }, 'Опубликовано — автор получил уведомление');
  }

  reject(post: ManagerPost): void {
    if (this.busy.has(post.id)) return;
    this.dialog
      .open<BirgeRejectDialogComponent, BirgeRejectDialogData, BirgeRejectChoice>(BirgeRejectDialogComponent, {
        width: '520px', maxWidth: '95vw', autoFocus: 'first-tabbable', data: { post }
      })
      .afterClosed()
      .subscribe((choice) => {
        if (!choice) return;
        this.decide(post, { action: 'reject', reason: choice.reason, note: choice.note }, 'Отклонено — автор получил уведомление');
      });
  }

  private decide(post: ManagerPost, body: BirgeDecisionBody, done: string): void {
    if (this.busy.has(post.id)) return;
    this.busy.add(post.id);
    this.birge.decide(post.id, body)
      .pipe(finalize(() => this.busy.delete(post.id)))
      .subscribe({
        next: () => {
          this.pending = this.pending.filter((p) => p.id !== post.id);
          this.tomorrow = this.tomorrow.filter((p) => p.id !== post.id);
          this.toast.showSuccess(done);
          this.summary?.reload();
        },
        error: (err: { status?: number }) => {
          this.toast.showError(birgeErrorText(err, 'Не удалось сохранить решение'));
          // 409 — по посту уже решили (второй модератор, отмена из журнала): очередь на экране устарела
          if (err?.status === 409) this.load();
        }
      });
  }
}
```

`src/app/feature/system/birge/birge-queue-page.component.html`:

```html
<div class="brg brg-queue jts-screen">
  <app-birge-summary></app-birge-summary>

  <details class="brg-how" data-testid="how">
    <summary>Как работает модерация</summary>
    <ol class="brg-how__flow" *ngIf="settings as s; else howShort">
      <li><b>1. Студент пишет</b>ветку или комментарий</li>
      <li><b>2. AI-проверка</b>словарь, классификатор тона, ссылки, фото → риск 0–100</li>
      <li><b>3. Риск &lt; {{ s.autoPublishBelow }}</b>публикуется сразу, без менеджера</li>
      <li><b>4. Риск ≥ {{ s.autoRejectFrom }}</b>отклоняется; плохие отзывы уходят в Feedback</li>
      <li><b>5. Между</b>сюда, но не больше {{ s.dailyLimit }} в день. Дальше — «{{ overflowShort(s.overflowMode) }}»</li>
    </ol>
    <ng-template #howShort>
      <p class="brg-how__note">AI считает риск 0–100: ниже порога публикации пост выходит сразу, от порога отказа —
        отклоняется, между ними — сюда, не больше лимита в день. Пороги — во вкладке «Настройки модерации».</p>
    </ng-template>
    <p class="brg-how__note">Жалобы студентов и сбой AI тоже приводят пост сюда — лимит дня они не тратят.</p>
  </details>

  <div class="brg-queue__bar">
    <h2>Ждут решения</h2>
    <button mat-stroked-button type="button" [disabled]="loading" (click)="refresh()"><mat-icon>refresh</mat-icon> Обновить</button>
  </div>

  <div class="brg-status" *ngIf="loading && !pending.length"><mat-spinner diameter="22"></mat-spinner><span>Загрузка очереди…</span></div>
  <p class="brg-error" *ngIf="loadError" role="alert">{{ loadError }}</p>
  <p class="brg-empty" *ngIf="!loading && !loadError && !pending.length" data-testid="empty">Очередь пуста 🎉 Всё остальное система решила сама.</p>

  <app-birge-post-card *ngFor="let post of pending; trackBy: trackPost" [post]="post">
    <div class="brg-actions">
      <button mat-flat-button type="button" class="brg-actions__ok" [disabled]="busy.has(post.id)" (click)="approve(post)" data-testid="approve">Одобрить и опубликовать</button>
      <button mat-stroked-button type="button" class="brg-actions__bad" [disabled]="busy.has(post.id)" (click)="reject(post)" data-testid="reject">Отклонить</button>
      <span class="brg-actions__hint">Автор увидит решение в уведомлениях</span>
    </div>
  </app-birge-post-card>

  <section class="brg-tomorrow" *ngIf="tomorrow.length" data-testid="tomorrow">
    <h2>Отложено на завтра ({{ tomorrow.length }})</h2>
    <p class="jts-screen-lead">В 00:00 по Алматы эти посты встанут в очередь и займут места в лимите нового дня. Решение по ним сейчас лимит не тратит.</p>
    <app-birge-post-card *ngFor="let post of tomorrow; trackBy: trackPost" [post]="post">
      <div class="brg-actions">
        <button mat-flat-button type="button" class="brg-actions__ok" [disabled]="busy.has(post.id)" (click)="approve(post)" data-testid="approve">Одобрить и опубликовать</button>
        <button mat-stroked-button type="button" class="brg-actions__bad" [disabled]="busy.has(post.id)" (click)="reject(post)" data-testid="reject">Отклонить</button>
      </div>
    </app-birge-post-card>
  </section>
</div>
```

`src/app/feature/system/birge/birge-queue-page.component.scss`:

```scss
@use 'birge' as brg;

@include brg.page-states;
@include brg.actions;

.brg-how {
  margin: 0 0 20px;
  padding: 14px 16px;
  border: 1px solid brg.$line;
  border-radius: 16px;
  background: brg.$card;
  color: brg.$ink;

  summary { cursor: pointer; font-weight: 700; }
  &[open] summary { margin-bottom: 12px; }
}

.brg-how__flow {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;

  li { padding: 10px; border-radius: 12px; background: brg.$accent-bg; line-height: 1.35; }
  b { display: block; margin-bottom: 3px; color: brg.$accent; }
}

.brg-how__note { margin: 10px 0 0; font-size: 13px; color: brg.$muted; }

.brg-queue__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;

  h2 { margin: 0; font-size: 18px; }
}

.brg-tomorrow {
  margin-top: 24px;

  h2 { margin: 0 0 4px; font-size: 18px; }
}

@media (max-width: 900px) {
  .brg-how__flow { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: Implement — блок меню**

В `src/app/feature/system/role-navigation/role-navigation.config.ts` перед строкой
`export function cabinetBlocks(role: string | null | undefined,` вставить:

```ts
/**
 * Birge — лента студентов (спека jts-web-app docs/superpowers/specs/2026-11-11-birge-community-design.md, §8): спорное
 * после AI-модерации решает человек. Блок прямой: пункт меню сразу открывает очередь — страница со ссылками на разделы
 * ничего бы не добавила, вкладки и так стоят в шапке кабинета.
 */
const birgeBlock = (): CabinetBlock => ({
  id: 'birge', direct: true, title: 'Birge', icon: 'forum',
  description: 'Лента студентов: спорные посты, решения AI и настройки модерации.',
  sections: [
    section('queue', 'Очередь проверки', '/birge/queue', 'Спорные ветки и комментарии: одобрить или отклонить.'),
  ]
});
```

В том же файле строку списка админа

```ts
    contentBlock(true),
```

заменить на

```ts
    contentBlock(true),
    birgeBlock(),
```

и в списке контент-менеджера фрагмент

```ts
sections: librarySections},
    {id: 'news', title: 'Новости',
```

заменить на

```ts
sections: librarySections},
    birgeBlock(),
    {id: 'news', title: 'Новости',
```

- [ ] **Step 6: Implement — маршрут**

В `src/app/feature/system/system.routes.ts` фрагмент (конец маршрута `content/word-hunt` и начало `groups`)

```ts
        loadComponent: () => import('./word-hunt/word-hunt-page.component').then(m => m.WordHuntPageComponent),
      },
      {
        path: 'groups',
```

заменить на

```ts
        loadComponent: () => import('./word-hunt/word-hunt-page.component').then(m => m.WordHuntPageComponent),
      },
      // Birge (спека jts-web-app 2026-11-11-birge-community-design.md, §8): бэкенд пускает в /admin/birge/** только
      // CONTENT_MANAGER и ADMIN — остальным экран показал бы одни отказы
      {
        path: 'birge/queue',
        canActivate: [roleGuard(['CONTENT_MANAGER', 'ADMIN'])],
        loadComponent: () => import('./birge/birge-queue-page.component').then(m => m.BirgeQueuePageComponent),
      },
      {
        path: 'groups',
```

- [ ] **Step 7: Run — PASS**

Run:

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless \
  --include=src/app/feature/system/birge/birge-queue-page.component.spec.ts \
  --include=src/app/feature/system/role-navigation/role-navigation.config.spec.ts \
  --include=src/app/feature/system/role-navigation/navigation-coverage.spec.ts \
  --include=src/app/feature/system/role-navigation/cabinet-navigation.guard.spec.ts \
  --include=src/app/feature/system/system.routes.spec.ts
```

Expected: `TOTAL: N SUCCESS` (красное из базовой линии задачи 1 — то же, нового нет).

- [ ] **Step 8: Сборка и сторожа — шаблон под strictTemplates**

Run:

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && NODE_OPTIONS=--max-old-space-size=3072 npx ng build --configuration development --source-map=false && npm run test:theme && npm run test:frame
```

Expected: `Application bundle generation complete.`, оба сторожа — «ок». Ошибка шаблона (тип, неизвестное свойство) —
чинить в шаблоне, а не глушить.

- [ ] **Step 9: Commit**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && git add src/app/feature/system/birge/birge-queue-page.component.ts src/app/feature/system/birge/birge-queue-page.component.html src/app/feature/system/birge/birge-queue-page.component.scss src/app/feature/system/birge/birge-queue-page.component.spec.ts src/app/feature/system/role-navigation/role-navigation.config.ts src/app/feature/system/role-navigation/role-navigation.config.spec.ts src/app/feature/system/system.routes.ts src/app/feature/system/system.routes.spec.ts && git commit -m "$(cat <<'EOF'
feat(birge): очередь проверки и блок меню «Birge» у контент-менеджера и админа

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Журнал решений

**Files:**
- Create: `src/app/feature/system/birge/birge-log-page.component.ts`
- Create: `src/app/feature/system/birge/birge-log-page.component.html`
- Create: `src/app/feature/system/birge/birge-log-page.component.scss`
- Test: `src/app/feature/system/birge/birge-log-page.component.spec.ts`
- Modify: `src/app/feature/system/role-navigation/role-navigation.config.ts` (раздел `log` в `birgeBlock`)
- Modify: `src/app/feature/system/role-navigation/role-navigation.config.spec.ts` (список адресов блока)
- Modify: `src/app/feature/system/system.routes.ts` (маршрут `birge/log`)
- Modify: `src/app/feature/system/system.routes.spec.ts` (импорт и строка в `pages`)

**Interfaces:**
- Consumes: `BirgeModerationService.log/revert` (задача 2); `DECISION_FILTERS`, `logDecisionLabel`, `reasonLabel`,
  `revertLabel`, `revertDoneMessage`, `BirgeLabel` (задача 3); `birgeErrorText`, `logFilterProblem` (задача 4);
  `BirgeSummaryComponent.reload()` (задача 5).
- Produces: `BirgeLogPageComponent` (маршрут `/system/birge/log`) с публичными `filter: BirgeLogFilter`,
  `items: BirgeLogItem[]`, `nextCursor`, `error`, `filterError`, `apply()`, `reset()`, `more()`,
  `decisionOf(item): BirgeLabel` («Менеджер: отклонено — <причина>»), `noteOf(item): string | null`,
  `canRevert(item): boolean`, `revert(item): void`, `revertLabel(decision): string`, `summary?`.

- [ ] **Step 1: Failing test — экран**

`src/app/feature/system/birge/birge-log-page.component.spec.ts`:

```ts
import { Subject, of, throwError } from 'rxjs';

import { BirgeLogFilter, BirgeLogItem, BirgePage } from '../../../core/models/birge.models';
import { BirgeLogPageComponent } from './birge-log-page.component';
import { logItem } from './birge.testing';

describe('BirgeLogPageComponent — журнал решений', () => {
  const published = logItem({ id: 9, decision: 'auto_published', risk: 6, reasons: [], textPreview: 'Как запомнить неправильные глаголы?' });
  const feedback = logItem({ id: 8 });
  const queued = logItem({ id: 7, decision: 'queued', revertible: false, risk: 48 });
  const none: BirgeLogFilter = { from: '', to: '', decision: '', author: '' };
  const page = (items: BirgeLogItem[], nextCursor: string | null = null): BirgePage<BirgeLogItem> => ({ items, nextCursor });

  let birge: { log: jasmine.Spy; revert: jasmine.Spy };
  let toast: { showSuccess: jasmine.Spy; showError: jasmine.Spy };
  let summary: { reload: jasmine.Spy };

  function build(): BirgeLogPageComponent {
    const c = new BirgeLogPageComponent(birge as never, toast as never);
    summary = { reload: jasmine.createSpy('reload') };
    c.summary = summary as never;
    c.ngOnInit();
    return c;
  }

  beforeEach(() => {
    birge = {
      log: jasmine.createSpy('log').and.returnValue(of(page([published, feedback, queued], 'c1'))),
      revert: jasmine.createSpy('revert').and.callFake((id: number) => of(logItem({
        id, decision: 'auto_published', revertible: false, revertedAt: '2026-11-11T10:20:00+05:00',
        revertedBy: { id: 5, name: 'Контент-менеджер' },
      }))),
    };
    toast = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
  });

  it('открывается без фильтров — первая страница и курсор', () => {
    const c = build();
    expect(birge.log).toHaveBeenCalledOnceWith(none, null);
    expect(c.items.map((i) => i.id)).toEqual([9, 8, 7]);
    expect(c.nextCursor).toBe('c1');
  });

  it('фильтры уходят по «Показать»; «с» позже «по» — без запроса', () => {
    const c = build();
    c.filter = { from: '2026-11-11', to: '2026-11-01', decision: '', author: '' };
    c.apply();
    expect(c.filterError).toBe('Дата «с» позже даты «по»');
    expect(birge.log).toHaveBeenCalledTimes(1);
    c.filter = { from: '2026-11-01', to: '2026-11-11', decision: 'auto_feedback', author: 'Аружан' };
    c.apply();
    expect(c.filterError).toBe('');
    expect(birge.log).toHaveBeenCalledWith({ from: '2026-11-01', to: '2026-11-11', decision: 'auto_feedback', author: 'Аружан' }, null);
  });

  it('«Показать ещё» продолжает показанную выборку, даже если поля фильтров уже поправили', () => {
    const c = build();
    c.filter.author = 'Тимур';
    birge.log.and.returnValue(of(page([logItem({ id: 6 })])));
    c.more();
    expect(birge.log).toHaveBeenCalledWith(none, 'c1');
    expect(c.items.map((i) => i.id)).toEqual([9, 8, 7, 6]);
    expect(c.nextCursor).toBeNull();
  });

  it('ответ старой выборки после новых фильтров не подмешивается', () => {
    const stale = new Subject<BirgePage<BirgeLogItem>>();
    birge.log.and.returnValue(stale);
    const c = build();
    birge.log.and.returnValue(of(page([queued])));
    c.filter.decision = 'queued';
    c.apply();
    stale.next(page([published, feedback]));
    expect(c.items.map((i) => i.id)).toEqual([7]);
  });

  it('отменить можно только revertible и ещё не отменённое; подпись — по решению', () => {
    const c = build();
    expect(c.canRevert(published)).toBeTrue();
    expect(c.canRevert(queued)).toBeFalse();
    expect(c.canRevert(logItem({ revertedAt: '2026-11-11T10:00:00+05:00' }))).toBeFalse();
    expect(c.revertLabel('auto_published')).toBe('Скрыть');
    expect(c.revertLabel('auto_feedback')).toBe('Опубликовать');
  });

  it('отмена: строка из ответа с «Отменено», тост по решению, сводка перечитана; неотменяемое — без запроса', () => {
    const c = build();
    c.revert(published);
    expect(birge.revert).toHaveBeenCalledOnceWith(9);
    expect(c.items[0].revertedAt).toBe('2026-11-11T10:20:00+05:00');
    expect(toast.showSuccess).toHaveBeenCalledWith('Публикация скрыта из ленты — автор получил уведомление');
    expect(summary.reload).toHaveBeenCalled();
    c.revert(queued);
    expect(birge.revert).toHaveBeenCalledTimes(1);
  });

  it('ручной отказ: «Менеджер: отклонено — <причина>» и заметка модератора', () => {
    const c = build();
    const manual = logItem({
      id: 5, decision: 'rejected', actorType: 'manager', actor: { id: 5, name: 'Контент-менеджер' }, revertible: false,
      rejectReason: { code: 'OTHER', note: 'Реклама чужого курса' },
    });
    expect(c.decisionOf(manual)).toEqual({ label: 'Менеджер: отклонено — Другое', tone: 'bad' });
    expect(c.noteOf(manual)).toBe('Реклама чужого курса');
    expect(c.noteOf(logItem({ note: 'старая заметка' }))).toBe('старая заметка');
    expect(c.noteOf(feedback)).toBeNull();
  });

  it('уже отменили (409) — текст сервера и журнал перечитан показанными фильтрами', () => {
    const c = build();
    birge.revert.and.returnValue(throwError(() => ({ status: 409, error: { messages: ['Решение уже отменено'] } })));
    c.filter.author = 'не применено';
    c.revert(feedback);
    expect(toast.showError).toHaveBeenCalledWith('Решение уже отменено');
    expect(birge.log).toHaveBeenCalledTimes(2);
    expect(birge.log.calls.mostRecent().args).toEqual([none, null]);
  });

  it('бэкенд без модуля — понятная строка', () => {
    birge.log.and.returnValue(throwError(() => ({ status: 404, error: {} })));
    const c = build();
    expect(c.error).toBe('Раздел Birge на этом стенде ещё не включён: сервер ответил 404');
    expect(c.items).toEqual([]);
  });
});
```

- [ ] **Step 2: Failing test — навигация и маршрут**

В `role-navigation.config.spec.ts` строку

```ts
      expect(birge.sections.map(s=>s.route)).withContext(role).toEqual(['/system/birge/queue']);
```

заменить на

```ts
      expect(birge.sections.map(s=>s.route)).withContext(role).toEqual(['/system/birge/queue','/system/birge/log']);
```

В `system.routes.spec.ts` после `import { BirgeQueuePageComponent } from './birge/birge-queue-page.component';` добавить

```ts
import { BirgeLogPageComponent } from './birge/birge-log-page.component';
```

и строку `    ['birge/queue', BirgeQueuePageComponent],` заменить на

```ts
    ['birge/queue', BirgeQueuePageComponent],
    ['birge/log', BirgeLogPageComponent],
```

- [ ] **Step 3: Run — FAIL**

Run:

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless \
  --include=src/app/feature/system/birge/birge-log-page.component.spec.ts \
  --include=src/app/feature/system/role-navigation/role-navigation.config.spec.ts \
  --include=src/app/feature/system/system.routes.spec.ts
```

Expected: FAIL — `Cannot find module './birge-log-page.component'`.

- [ ] **Step 4: Implement — экран**

`src/app/feature/system/birge/birge-log-page.component.ts`:

```ts
import { UnifiedSelectModule } from '../../../shared/searchable-select/unified-select.directive';
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';

import { BirgeLogFilter, BirgeLogItem } from '../../../core/models/birge.models';
import { BirgeModerationService } from '../../../core/services/birge-moderation.service';
import { ToastService } from '../../../core/services/toast.service';
import { SchoolDatePipe } from '../../../shared/school-date.pipe';
import { BirgeSummaryComponent } from './birge-summary.component';
import { BirgeLabel, DECISION_FILTERS, logDecisionLabel, reasonLabel, revertDoneMessage, revertLabel } from './birge.labels';
import { birgeErrorText, logFilterProblem } from './birge.rules';

function emptyFilter(): BirgeLogFilter {
  return { from: '', to: '', decision: '', author: '' };
}

/**
 * Журнал решений Birge (спека §8): каждое решение AI и менеджера. Любое решение AI, кроме «в очередь», можно отменить —
 * так AI не работает «вслепую». Можно ли, решает сервер (revertible); повторная отмена — 409. Ответ отмены — та же
 * строка AI с revertedAt; сама отмена ложится в журнал решением менеджера (hidden / restored) и видна при следующей
 * загрузке. Автора она уведомляет (BIRGE_POST_HIDDEN / BIRGE_POST_APPROVED), кроме отмены hidden_overflow (спека §5.2).
 */
@Component({
  selector: 'app-birge-log-page',
  standalone: true,
  imports: [UnifiedSelectModule, CommonModule, FormsModule, MatButtonModule, MatProgressSpinnerModule, SchoolDatePipe,
    BirgeSummaryComponent],
  templateUrl: './birge-log-page.component.html',
  styleUrl: './birge-log-page.component.scss'
})
export class BirgeLogPageComponent implements OnInit {
  readonly decisions = DECISION_FILTERS;
  readonly revertLabel = revertLabel;
  /** Поля фильтров; в запрос уходят только по «Показать». */
  filter: BirgeLogFilter = emptyFilter();
  items: BirgeLogItem[] = [];
  nextCursor: string | null = null;
  loading = false;
  loadingMore = false;
  error = '';
  filterError = '';
  /** Строки, отмена которых в пути: второй клик дал бы 409 на собственную отмену. */
  readonly reverting = new Set<number>();

  @ViewChild(BirgeSummaryComponent) summary?: BirgeSummaryComponent;

  /** Фильтры показанной выборки: «Показать ещё» продолжает её, даже если поля уже поправили. */
  private applied: BirgeLogFilter = emptyFilter();
  /** Номер выборки: ответ прежней, пришедший после новых фильтров, в список не подмешивается. */
  private seq = 0;

  constructor(private birge: BirgeModerationService, private toast: ToastService) {}

  ngOnInit(): void {
    this.apply();
  }

  readonly trackItem = (_: number, item: BirgeLogItem): number => item.id;

  apply(): void {
    this.filterError = logFilterProblem(this.filter) ?? '';
    if (this.filterError) return;
    this.applied = { ...this.filter };
    this.fetch();
  }

  reset(): void {
    this.filter = emptyFilter();
    this.apply();
  }

  more(): void {
    if (!this.nextCursor || this.loading || this.loadingMore) return;
    const seq = this.seq;
    this.loadingMore = true;
    this.birge.log(this.applied, this.nextCursor).subscribe({
      next: (page) => {
        if (seq !== this.seq) return;
        this.items = [...this.items, ...page.items];
        this.nextCursor = page.nextCursor;
        this.loadingMore = false;
      },
      error: (err) => {
        if (seq !== this.seq) return;
        this.loadingMore = false;
        this.toast.showError(birgeErrorText(err, 'Следующая страница журнала не загрузилась'));
      }
    });
  }

  /** У ручного отказа — с причиной: «Менеджер: отклонено — Не по теме». */
  decisionOf(item: BirgeLogItem): BirgeLabel {
    return logDecisionLabel(item);
  }

  /** Заметка модератора: у ручного отказа она в rejectReason, у прочих решений — в note. */
  noteOf(item: BirgeLogItem): string | null {
    return item.rejectReason?.note || item.note || null;
  }

  reasonsLine(item: BirgeLogItem): string {
    return item.reasons.map((r) => reasonLabel(r.code)).join(', ');
  }

  canRevert(item: BirgeLogItem): boolean {
    return item.revertible && !item.revertedAt;
  }

  revert(item: BirgeLogItem): void {
    if (!this.canRevert(item) || this.reverting.has(item.id)) return;
    this.reverting.add(item.id);
    this.birge.revert(item.id)
      .pipe(finalize(() => this.reverting.delete(item.id)))
      .subscribe({
        next: (updated) => {
          this.items = this.items.map((i) => (i.id === updated.id ? updated : i));
          this.toast.showSuccess(revertDoneMessage(item.decision));
          this.summary?.reload();
        },
        error: (err: { status?: number }) => {
          this.toast.showError(birgeErrorText(err, 'Не удалось отменить решение'));
          // 409 — решение уже отменили (другая вкладка, второй модератор): строка на экране устарела
          if (err?.status === 409) this.fetch();
        }
      });
  }

  private fetch(): void {
    const seq = ++this.seq;
    this.loading = true;
    this.loadingMore = false;
    this.error = '';
    this.birge.log(this.applied, null).subscribe({
      next: (page) => {
        if (seq !== this.seq) return;
        this.items = page.items;
        this.nextCursor = page.nextCursor;
        this.loading = false;
      },
      error: (err) => {
        if (seq !== this.seq) return;
        this.items = [];
        this.nextCursor = null;
        this.loading = false;
        this.error = birgeErrorText(err, 'Журнал не загрузился');
      }
    });
  }
}
```

`src/app/feature/system/birge/birge-log-page.component.html`:

```html
<div class="brg brg-log jts-screen">
  <app-birge-summary></app-birge-summary>

  <p class="jts-screen-lead">Все автоматические решения можно выборочно перепроверить и отменить — так AI не работает
    «вслепую». Решения «в очередь» здесь не отменяются: по ним решают в очереди.</p>

  <form class="brg-filters" (ngSubmit)="apply()">
    <label>С<input type="date" name="from" [(ngModel)]="filter.from"></label>
    <label>По<input type="date" name="to" [(ngModel)]="filter.to"></label>
    <label>Решение
      <select name="decision" [(ngModel)]="filter.decision">
        <option value="">Все решения</option>
        <option *ngFor="let d of decisions" [value]="d.code">{{ d.label }}</option>
      </select>
    </label>
    <label class="brg-filters__author">Автор<input type="search" name="author" [(ngModel)]="filter.author" placeholder="Часть имени"></label>
    <button mat-flat-button color="primary" type="submit" [disabled]="loading">Показать</button>
    <button mat-button type="button" (click)="reset()">Сбросить</button>
  </form>
  <p class="brg-error" *ngIf="filterError" role="alert">{{ filterError }}</p>

  <div class="brg-status" *ngIf="loading"><mat-spinner diameter="22"></mat-spinner><span>Загрузка журнала…</span></div>
  <p class="brg-error" *ngIf="error" role="alert">{{ error }}</p>
  <p class="brg-empty" *ngIf="!loading && !error && !items.length">Решений по этим фильтрам нет.</p>

  <div class="brg-log__wrap" *ngIf="items.length">
    <table class="brg-log__table">
      <thead>
        <tr><th>Время</th><th>Автор</th><th>Текст</th><th>Риск</th><th>Решение</th><th></th></tr>
      </thead>
      <tbody>
        <tr *ngFor="let item of items; trackBy: trackItem" [attr.data-log-id]="item.id">
          <td class="brg-log__time">{{ item.createdAt | schoolDate:'dd.MM HH:mm' }}</td>
          <td>{{ item.author.name }}</td>
          <td class="brg-log__text">
            {{ item.textPreview }}
            <small *ngIf="item.reasons.length">{{ reasonsLine(item) }}</small>
            <small *ngIf="noteOf(item) as note">Комментарий: {{ note }}</small>
          </td>
          <td><b>{{ item.risk }}</b></td>
          <td>
            <span class="brg-badge" [ngClass]="decisionOf(item).tone">{{ decisionOf(item).label }}</span>
            <small *ngIf="item.actorType === 'manager'">{{ item.actor?.name || 'Модератор' }}</small>
          </td>
          <td class="brg-log__act">
            <ng-container *ngIf="item.revertedAt; else revertCell">
              <span class="brg-badge hid" data-testid="reverted">Отменено</span>
              <small>{{ item.revertedAt | schoolDate:'dd.MM HH:mm' }}<ng-container *ngIf="item.revertedBy"> · {{ item.revertedBy.name }}</ng-container></small>
            </ng-container>
            <ng-template #revertCell>
              <button mat-stroked-button type="button" *ngIf="canRevert(item)" [disabled]="reverting.has(item.id)"
                      (click)="revert(item)" data-testid="revert">{{ revertLabel(item.decision) }}</button>
            </ng-template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <button mat-stroked-button type="button" class="brg-more" *ngIf="nextCursor" [disabled]="loadingMore" (click)="more()">
    {{ loadingMore ? 'Загрузка…' : 'Показать ещё' }}
  </button>
</div>
```

`src/app/feature/system/birge/birge-log-page.component.scss`:

```scss
@use 'birge' as brg;

@include brg.badges;
@include brg.page-states;

.brg-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin: 0 0 16px;

  label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: brg.$muted; }

  input {
    height: 36px;
    padding: 0 10px;
    border: 1px solid brg.$line;
    border-radius: 10px;
    background: brg.$card;
    color: brg.$ink;
    font: inherit;
    font-size: 14px;
  }
}

.brg-filters__author input { min-width: 200px; }

.brg-log__wrap { overflow-x: auto; border: 1px solid brg.$line; border-radius: 16px; background: brg.$card; }

.brg-log__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: brg.$ink;

  th, td { padding: 10px 12px; border-bottom: 1px solid brg.$line; text-align: left; vertical-align: top; }
  th { font-size: 12px; font-weight: 700; color: brg.$muted; }
  tr:last-child td { border-bottom: 0; }
  small { display: block; margin-top: 3px; color: brg.$muted; }
}

.brg-log__time, .brg-log__act { white-space: nowrap; }
.brg-log__text { min-width: 240px; max-width: 420px; overflow-wrap: anywhere; }
```

- [ ] **Step 5: Implement — раздел меню и маршрут**

В `role-navigation.config.ts` строку

```ts
    section('queue', 'Очередь проверки', '/birge/queue', 'Спорные ветки и комментарии: одобрить или отклонить.'),
```

заменить на

```ts
    section('queue', 'Очередь проверки', '/birge/queue', 'Спорные ветки и комментарии: одобрить или отклонить.'),
    section('log', 'Журнал решений', '/birge/log', 'Все решения AI и модератора; решение AI можно отменить.'),
```

В `system.routes.ts` фрагмент

```ts
        loadComponent: () => import('./birge/birge-queue-page.component').then(m => m.BirgeQueuePageComponent),
      },
```

заменить на

```ts
        loadComponent: () => import('./birge/birge-queue-page.component').then(m => m.BirgeQueuePageComponent),
      },
      {
        path: 'birge/log',
        canActivate: [roleGuard(['CONTENT_MANAGER', 'ADMIN'])],
        loadComponent: () => import('./birge/birge-log-page.component').then(m => m.BirgeLogPageComponent),
      },
```

- [ ] **Step 6: Run — PASS**

Run:

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless \
  --include=src/app/feature/system/birge/birge-log-page.component.spec.ts \
  --include=src/app/feature/system/role-navigation/role-navigation.config.spec.ts \
  --include=src/app/feature/system/role-navigation/navigation-coverage.spec.ts \
  --include=src/app/feature/system/system.routes.spec.ts
```

Expected: `TOTAL: N SUCCESS`.

- [ ] **Step 7: Сборка и сторожа**

Run:

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && NODE_OPTIONS=--max-old-space-size=3072 npx ng build --configuration development --source-map=false && npm run test:theme && npm run test:frame && npm run test:selects
```

Expected: `Application bundle generation complete.`; сторожа — «ок»; `test:selects` — `missing: 0`.

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && git add src/app/feature/system/birge/birge-log-page.component.ts src/app/feature/system/birge/birge-log-page.component.html src/app/feature/system/birge/birge-log-page.component.scss src/app/feature/system/birge/birge-log-page.component.spec.ts src/app/feature/system/role-navigation/role-navigation.config.ts src/app/feature/system/role-navigation/role-navigation.config.spec.ts src/app/feature/system/system.routes.ts src/app/feature/system/system.routes.spec.ts && git commit -m "$(cat <<'EOF'
feat(birge): журнал решений — фильтры, подгрузка курсором, отмена решений AI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Настройки модерации

**Files:**
- Create: `src/app/feature/system/birge/birge-settings-page.component.ts`
- Create: `src/app/feature/system/birge/birge-settings-page.component.html`
- Create: `src/app/feature/system/birge/birge-settings-page.component.scss`
- Test: `src/app/feature/system/birge/birge-settings-page.component.spec.ts`
- Modify: `src/app/feature/system/role-navigation/role-navigation.config.ts` (раздел `settings`)
- Modify: `src/app/feature/system/role-navigation/role-navigation.config.spec.ts` (список адресов блока)
- Modify: `src/app/feature/system/system.routes.ts` (маршрут `birge/settings` с `canDeactivate`)
- Modify: `src/app/feature/system/system.routes.spec.ts` (импорт, строка в `pages`, проверка охраны ухода)

**Interfaces:**
- Consumes: `BirgeModerationService.settings/saveSettings` (задача 2); `DICTIONARIES`, `OVERFLOW_OPTIONS` (задача 3);
  `toForm`, `toInput`, `settingsProblems`, `withPublishBelow`, `withRejectFrom`, `zones`, `BirgeSettingsForm`,
  `PUBLISH_RANGE`, `REJECT_RANGE`, `LIMIT_RANGE`, `REPORTS_RANGE`, `birgeErrorText` (задача 4);
  `BirgeSummaryComponent.reload()` (задача 5); `PendingChangesAware` и `pendingChangesGuard`
  (`core/guards/pending-changes.guard.ts`).
- Produces: `BirgeSettingsPageComponent implements PendingChangesAware` (маршрут `/system/birge/settings`) с публичными
  `model: BirgeSettingsForm | null`, `saved: BirgeSettings | null`, `problems: string[]`, `saving`, `loadError`,
  `dirty` (getter), `scale` (getter), `setPublish(el: HTMLInputElement)`, `setReject(el: HTMLInputElement)`, `save()`,
  `discard()`, `canDeactivate(): boolean`, `onBeforeUnload(event: BeforeUnloadEvent)`, `ask(question: string): boolean`.

- [ ] **Step 1: Failing test — экран**

`src/app/feature/system/birge/birge-settings-page.component.spec.ts`:

```ts
import { Subject, of, throwError } from 'rxjs';

import { BirgeSettingsInput } from '../../../core/models/birge.models';
import { BirgeSettingsPageComponent } from './birge-settings-page.component';
import { birgeSettings } from './birge.testing';

describe('BirgeSettingsPageComponent — настройки модерации', () => {
  let birge: { settings: jasmine.Spy; saveSettings: jasmine.Spy };
  let toast: { showSuccess: jasmine.Spy; showError: jasmine.Spy };
  let summary: { reload: jasmine.Spy };

  function build(): BirgeSettingsPageComponent {
    const c = new BirgeSettingsPageComponent(birge as never, toast as never);
    summary = { reload: jasmine.createSpy('reload') };
    c.summary = summary as never;
    c.ngOnInit();
    return c;
  }

  /** Ползунок с позицией, которую выставил человек. */
  const slider = (value: number): HTMLInputElement => ({ valueAsNumber: value, value: String(value) }) as HTMLInputElement;

  beforeEach(() => {
    birge = {
      settings: jasmine.createSpy('settings').and.returnValue(of(birgeSettings())),
      saveSettings: jasmine.createSpy('saveSettings').and.callFake((input: BirgeSettingsInput) => of(birgeSettings({
        ...input, updatedAt: '2026-11-11T11:00:00+05:00', updatedBy: { id: 5, name: 'Контент-менеджер' },
      }))),
    };
    toast = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
  });

  it('форма из настроек сервера: словари — строками через запятую, правок нет, шкала трёх зон', () => {
    const c = build();
    expect(c.model).toEqual({
      autoPublishBelow: 30, autoRejectFrom: 70, dailyLimit: 3, overflowMode: 'reject', reportsToHide: 3,
      profanity: 'бля, *пизд', complaint: 'развод, верните деньги', criticism: 'дорого',
    });
    expect(c.dirty).toBeFalse();
    expect(c.scale).toEqual({ publish: 30, manager: 40, reject: 30 });
  });

  it('ползунок публикации упирается в «порог отказа − 5» и сам встаёт на допустимое место', () => {
    const c = build();
    c.setReject(slider(50));
    expect(c.model!.autoRejectFrom).toBe(50);
    const publish = slider(58);
    c.setPublish(publish);
    expect(c.model!.autoPublishBelow).toBe(45);
    expect(publish.value).toBe('45');
    expect(c.dirty).toBeTrue();
  });

  it('ползунок отказа не опускается ниже «порог публикации + 5»', () => {
    const c = build();
    c.setPublish(slider(50));
    const reject = slider(45);
    c.setReject(reject);
    expect(c.model!.autoRejectFrom).toBe(55);
    expect(reject.value).toBe('55');
  });

  it('сохранение: PUT разобранными словарями, форма — из ответа (нормализованного), тост, сводка', () => {
    const c = build();
    c.model!.dailyLimit = 5;
    c.model!.profanity = 'бля,\n*пизд, сігейін, бля';
    birge.saveSettings.and.returnValue(of(birgeSettings({
      dailyLimit: 5,
      dictionaries: { profanity: ['бля', '*пизд', 'сигейин'], complaint: ['развод', 'верните деньги'], criticism: ['дорого'] },
      updatedAt: '2026-11-11T11:00:00+05:00', updatedBy: { id: 5, name: 'Контент-менеджер' },
    })));
    c.save();
    expect(birge.saveSettings).toHaveBeenCalledOnceWith({
      autoPublishBelow: 30, autoRejectFrom: 70, dailyLimit: 5, overflowMode: 'reject', reportsToHide: 3,
      dictionaries: { profanity: ['бля', '*пизд', 'сігейін'], complaint: ['развод', 'верните деньги'], criticism: ['дорого'] },
    });
    expect(c.model!.profanity).toBe('бля, *пизд, сигейин');
    expect(c.dirty).toBeFalse();
    expect(c.saved!.updatedBy!.name).toBe('Контент-менеджер');
    expect(toast.showSuccess).toHaveBeenCalledWith('Настройки модерации сохранены');
    expect(summary.reload).toHaveBeenCalled();
  });

  it('запись словаря короче 3 букв — отказ до запроса', () => {
    const c = build();
    c.model!.complaint = 'развод, ам';
    c.save();
    expect(birge.saveSettings).not.toHaveBeenCalled();
    expect(c.problems).toEqual(['«Плохие отзывы о платформе → Feedback»: запись «ам» короче 3 букв — она поймала бы полслова']);
  });

  it('отказ сервера (границы) — его строки списком, правки остаются', () => {
    const c = build();
    c.model!.reportsToHide = 4;
    birge.saveSettings.and.returnValue(throwError(() => ({
      status: 400, error: { messages: ['dailyLimit: от 1 до 10', 'reportsToHide: от 1 до 10'] },
    })));
    c.save();
    expect(c.problems).toEqual(['dailyLimit: от 1 до 10', 'reportsToHide: от 1 до 10']);
    expect(c.saving).toBeFalse();
    expect(c.dirty).toBeTrue();
  });

  it('пока сохраняется, второй «Сохранить» запроса не шлёт', () => {
    const c = build();
    birge.saveSettings.and.returnValue(new Subject());
    c.model!.dailyLimit = 4;
    c.save();
    c.save();
    expect(birge.saveSettings).toHaveBeenCalledTimes(1);
    expect(c.saving).toBeTrue();
  });

  it('«Отменить изменения» возвращает сохранённое', () => {
    const c = build();
    c.model!.overflowMode = 'hidden';
    c.model!.criticism = 'дорого, глючит';
    c.discard();
    expect(c.model!.overflowMode).toBe('reject');
    expect(c.model!.criticism).toBe('дорого');
    expect(c.dirty).toBeFalse();
  });

  it('уход с несохранёнными правками спрашивает; без правок — нет', () => {
    const c = build();
    const ask = spyOn(c, 'ask').and.returnValue(false);
    expect(c.canDeactivate()).toBeTrue();
    expect(ask).not.toHaveBeenCalled();
    c.model!.dailyLimit = 7;
    expect(c.canDeactivate()).toBeFalse();
    expect(ask).toHaveBeenCalledWith('Настройки модерации не сохранены. Уйти без сохранения?');
    const event = { preventDefault: jasmine.createSpy('preventDefault') } as unknown as BeforeUnloadEvent;
    c.onBeforeUnload(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('бэкенд без модуля — строка вместо формы', () => {
    birge.settings.and.returnValue(throwError(() => ({ status: 404, error: {} })));
    const c = build();
    expect(c.model).toBeNull();
    expect(c.loadError).toBe('Раздел Birge на этом стенде ещё не включён: сервер ответил 404');
  });
});
```

- [ ] **Step 2: Failing test — навигация и маршрут**

В `role-navigation.config.spec.ts` строку

```ts
      expect(birge.sections.map(s=>s.route)).withContext(role).toEqual(['/system/birge/queue','/system/birge/log']);
```

заменить на

```ts
      expect(birge.sections.map(s=>s.route)).withContext(role).toEqual(['/system/birge/queue','/system/birge/log','/system/birge/settings']);
```

В `system.routes.spec.ts` после `import { BirgeLogPageComponent } from './birge/birge-log-page.component';` добавить

```ts
import { BirgeSettingsPageComponent } from './birge/birge-settings-page.component';
```

строку `    ['birge/log', BirgeLogPageComponent],` заменить на

```ts
    ['birge/log', BirgeLogPageComponent],
    ['birge/settings', BirgeSettingsPageComponent],
```

и перед строкой `  it('адреса открывают свои экраны (путь и имя экспорта в import() верные)', async () => {` вставить

```ts
  it('настройки: уход с несохранёнными правками охраняется', () => {
    expect(findRoute('birge/settings').canDeactivate).toEqual([pendingChangesGuard]);
  });

```

- [ ] **Step 3: Run — FAIL**

Run:

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless \
  --include=src/app/feature/system/birge/birge-settings-page.component.spec.ts \
  --include=src/app/feature/system/role-navigation/role-navigation.config.spec.ts \
  --include=src/app/feature/system/system.routes.spec.ts
```

Expected: FAIL — `Cannot find module './birge-settings-page.component'`.

- [ ] **Step 4: Implement — экран**

`src/app/feature/system/birge/birge-settings-page.component.ts`:

```ts
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';

import { PendingChangesAware } from '../../../core/guards/pending-changes.guard';
import { BirgeSettings } from '../../../core/models/birge.models';
import { BirgeModerationService } from '../../../core/services/birge-moderation.service';
import { ToastService } from '../../../core/services/toast.service';
import { SchoolDatePipe } from '../../../shared/school-date.pipe';
import { BirgeSummaryComponent } from './birge-summary.component';
import { DICTIONARIES, OVERFLOW_OPTIONS } from './birge.labels';
import {
  BirgeSettingsForm, LIMIT_RANGE, PUBLISH_RANGE, REJECT_RANGE, REPORTS_RANGE, birgeErrorText, settingsProblems, toForm,
  toInput, withPublishBelow, withRejectFrom, zones
} from './birge.rules';

/**
 * Настройки модерации Birge (спека §3.5, §8): пороги риска двумя ползунками над шкалой трёх зон, дневной лимит ручных
 * заявок, что делать сверх него, порог жалоб и три словаря. Веса причин — не настройка (они в коде бэкенда). Сервер
 * нормализует словари при сохранении — форма потом показывает их уже так, как их сравнивает модерация.
 */
@Component({
  selector: 'app-birge-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatProgressSpinnerModule, SchoolDatePipe, BirgeSummaryComponent],
  templateUrl: './birge-settings-page.component.html',
  styleUrl: './birge-settings-page.component.scss'
})
export class BirgeSettingsPageComponent implements OnInit, PendingChangesAware {
  readonly dictionaries = DICTIONARIES;
  readonly overflowOptions = OVERFLOW_OPTIONS;
  readonly publishRange = PUBLISH_RANGE;
  readonly rejectRange = REJECT_RANGE;
  readonly limitRange = LIMIT_RANGE;
  readonly reportsRange = REPORTS_RANGE;
  model: BirgeSettingsForm | null = null;
  saved: BirgeSettings | null = null;
  loading = false;
  saving = false;
  loadError = '';
  /** Что мешает сохранить — строками под формой: тост исчез бы раньше, чем по нему поправят словарь. */
  problems: string[] = [];

  @ViewChild(BirgeSummaryComponent) summary?: BirgeSummaryComponent;

  /** JSON сохранённого: с ним сравнивается форма, чтобы знать о несохранённых правках. */
  private baseline = '';

  constructor(private birge: BirgeModerationService, private toast: ToastService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.birge.settings()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (s) => this.take(s),
        error: (err) => (this.loadError = birgeErrorText(err, 'Настройки не загрузились'))
      });
  }

  get dirty(): boolean {
    return !!this.model && JSON.stringify(toInput(this.model)) !== this.baseline;
  }

  get scale(): { publish: number; manager: number; reject: number } | null {
    return this.model ? zones(this.model.autoPublishBelow, this.model.autoRejectFrom) : null;
  }

  setPublish(el: HTMLInputElement): void {
    if (!this.model) return;
    this.model.autoPublishBelow = withPublishBelow(this.model, el.valueAsNumber);
    // Упёрлись в порог отказа — ползунок встаёт на настоящее значение, иначе показывал бы не то, что сохранится
    el.value = String(this.model.autoPublishBelow);
  }

  setReject(el: HTMLInputElement): void {
    if (!this.model) return;
    this.model.autoRejectFrom = withRejectFrom(this.model, el.valueAsNumber);
    el.value = String(this.model.autoRejectFrom);
  }

  save(): void {
    if (!this.model || this.saving) return;
    const input = toInput(this.model);
    this.problems = settingsProblems(input);
    if (this.problems.length) return;
    this.saving = true;
    this.birge.saveSettings(input)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (s) => {
          this.take(s);
          this.toast.showSuccess('Настройки модерации сохранены');
          // Лимит дня мог смениться — «X / лимит» в сводке должен совпасть
          this.summary?.reload();
        },
        error: (err) => (this.problems = birgeErrorText(err, 'Не удалось сохранить настройки').split('\n'))
      });
  }

  discard(): void {
    if (this.saved) this.take(this.saved);
  }

  canDeactivate(): boolean {
    return !this.dirty || this.ask('Настройки модерации не сохранены. Уйти без сохранения?');
  }

  /** Закрытие вкладки и перезагрузку охрана маршрута не видит — для них браузерный вопрос. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty) event.preventDefault();
  }

  /** Вопрос перед уходом отдельным методом: тест подменяет его, не трогая window.confirm. */
  ask(question: string): boolean {
    return window.confirm(question);
  }

  private take(s: BirgeSettings): void {
    this.saved = s;
    this.model = toForm(s);
    this.baseline = JSON.stringify(toInput(this.model));
    this.problems = [];
  }
}
```

`src/app/feature/system/birge/birge-settings-page.component.html`:

```html
<div class="brg brg-settings jts-screen">
  <app-birge-summary></app-birge-summary>

  <div class="brg-status" *ngIf="loading"><mat-spinner diameter="22"></mat-spinner><span>Загрузка настроек…</span></div>
  <p class="brg-error" *ngIf="loadError" role="alert">{{ loadError }}</p>

  <form *ngIf="model as m" class="brg-settings__grid" (ngSubmit)="save()">
    <section class="brg-settings__card">
      <h2>Пороги AI-модерации</h2>
      <div class="brg-scale" *ngIf="scale as z" aria-hidden="true">
        <div class="ok" [style.width.%]="z.publish">авто-публикация</div>
        <div class="pend" [style.width.%]="z.manager">менеджеру</div>
        <div class="bad" [style.width.%]="z.reject">отказ</div>
      </div>

      <label for="brg-publish">Публиковать автоматически, если риск ниже: <b>{{ m.autoPublishBelow }}</b></label>
      <input #publishInput id="brg-publish" type="range" [min]="publishRange.min" [max]="publishRange.max"
             [value]="m.autoPublishBelow" (input)="setPublish(publishInput)" data-testid="publish">

      <label for="brg-reject">Отклонять автоматически, если риск от: <b>{{ m.autoRejectFrom }}</b></label>
      <input #rejectInput id="brg-reject" type="range" [min]="rejectRange.min" [max]="rejectRange.max"
             [value]="m.autoRejectFrom" (input)="setReject(rejectInput)" data-testid="reject">

      <label for="brg-limit">Максимум ручных заявок в день: <b>{{ m.dailyLimit }}</b></label>
      <input id="brg-limit" type="range" name="dailyLimit" [min]="limitRange.min" [max]="limitRange.max" [(ngModel)]="m.dailyLimit">

      <fieldset class="brg-settings__radio">
        <legend>Если лимит исчерпан, спорные тексты:</legend>
        <label *ngFor="let o of overflowOptions">
          <input type="radio" name="overflowMode" [value]="o.value" [(ngModel)]="m.overflowMode"> {{ o.label }}
        </label>
      </fieldset>
      <p class="brg-settings__hint">Счётчик ручных заявок обнуляется в 00:00 по Алматы. Жалобы студентов и сбой AI лимит не тратят.</p>

      <label for="brg-reports">Скрыть пост и отдать модератору после жалоб: <b>{{ m.reportsToHide }}</b></label>
      <input id="brg-reports" type="range" name="reportsToHide" [min]="reportsRange.min" [max]="reportsRange.max" [(ngModel)]="m.reportsToHide">
    </section>

    <section class="brg-settings__card">
      <h2>Словари</h2>
      <p class="brg-settings__hint">Записи — через запятую или с новой строки. Сервер хранит их в той же нормализации, что и
        текст (нижний регистр, ё → е, казахские буквы → русские): после сохранения «сігейін» покажется как «сигейин».</p>
      <ng-container *ngFor="let d of dictionaries">
        <label [for]="'brg-dict-' + d.key">{{ d.title }}</label>
        <textarea [id]="'brg-dict-' + d.key" [name]="d.key" rows="4" [(ngModel)]="m[d.key]" [attr.data-testid]="'dict-' + d.key"></textarea>
        <small class="brg-settings__hint">{{ d.hint }}</small>
      </ng-container>
    </section>

    <div class="brg-settings__foot">
      <ul class="brg-problems" *ngIf="problems.length" role="alert"><li *ngFor="let p of problems">{{ p }}</li></ul>
      <span class="brg-settings__stamp" *ngIf="saved?.updatedAt as at">
        Изменено {{ at | schoolDate:'dd.MM.yyyy HH:mm' }}<ng-container *ngIf="saved?.updatedBy as by"> · {{ by.name }}</ng-container>
      </span>
      <button mat-button type="button" [disabled]="!dirty || saving" (click)="discard()">Отменить изменения</button>
      <button mat-flat-button color="primary" type="submit" [disabled]="!dirty || saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
    </div>
  </form>
</div>
```

`src/app/feature/system/birge/birge-settings-page.component.scss`:

```scss
@use 'birge' as brg;

@include brg.page-states;

.brg-settings__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.brg-settings__card {
  padding: 16px 18px;
  border: 1px solid brg.$line;
  border-radius: 18px;
  background: brg.$card;
  color: brg.$ink;

  h2 { margin: 0 0 8px; font-size: 18px; }
  label { display: block; margin: 14px 0 6px; font-weight: 600; }
  input[type='range'] { width: 100%; accent-color: var(--jts-violet, #9047ff); }

  textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 90px;
    padding: 10px;
    border: 1px solid brg.$line;
    border-radius: 12px;
    background: brg.$soft;
    color: brg.$ink;
    font: inherit;
    font-size: 13px;
    resize: vertical;
  }
}

.brg-scale {
  display: flex;
  height: 28px;
  margin-top: 6px;
  border-radius: 10px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 700;
  color: #fff;

  div { display: grid; place-items: center; min-width: 0; overflow: hidden; white-space: nowrap; }
  .ok { background: brg.$ok; }
  .pend { background: brg.$warn; }
  .bad { background: brg.$bad; }
}

.brg-settings__radio {
  margin: 14px 0 0;
  padding: 0;
  border: 0;

  legend { margin-bottom: 6px; font-weight: 600; }
  label { display: flex; align-items: flex-start; gap: 8px; margin: 6px 0; font-weight: 500; }
}

.brg-settings__hint { display: block; margin: 8px 0 0; font-size: 12px; line-height: 1.45; color: brg.$muted; }

.brg-settings__foot {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.brg-settings__stamp { margin-right: auto; font-size: 12px; color: brg.$muted; }

.brg-problems {
  flex-basis: 100%;
  margin: 0;
  padding: 10px 14px 10px 30px;
  border-radius: 12px;
  background: brg.$bad-bg;
  color: brg.$bad;
  font-size: 13px;
}

@media (max-width: 900px) {
  .brg-settings__grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: Implement — раздел меню и маршрут**

В `role-navigation.config.ts` строку

```ts
    section('log', 'Журнал решений', '/birge/log', 'Все решения AI и модератора; решение AI можно отменить.'),
```

заменить на

```ts
    section('log', 'Журнал решений', '/birge/log', 'Все решения AI и модератора; решение AI можно отменить.'),
    section('settings', 'Настройки модерации', '/birge/settings', 'Пороги риска, лимит ручных заявок, жалобы и словари.'),
```

В `system.routes.ts` фрагмент

```ts
        loadComponent: () => import('./birge/birge-log-page.component').then(m => m.BirgeLogPageComponent),
      },
```

заменить на

```ts
        loadComponent: () => import('./birge/birge-log-page.component').then(m => m.BirgeLogPageComponent),
      },
      {
        path: 'birge/settings',
        canActivate: [roleGuard(['CONTENT_MANAGER', 'ADMIN'])],
        // ползунки и словари без сохранения терялись бы молча — экран спрашивает перед уходом
        canDeactivate: [pendingChangesGuard],
        loadComponent: () => import('./birge/birge-settings-page.component').then(m => m.BirgeSettingsPageComponent),
      },
```

- [ ] **Step 6: Run — PASS**

Run:

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless \
  --include=src/app/feature/system/birge/birge-settings-page.component.spec.ts \
  --include=src/app/feature/system/role-navigation/role-navigation.config.spec.ts \
  --include=src/app/feature/system/role-navigation/navigation-coverage.spec.ts \
  --include=src/app/feature/system/system.routes.spec.ts
```

Expected: `TOTAL: N SUCCESS`.

- [ ] **Step 7: Сборка и сторожа**

Run:

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && NODE_OPTIONS=--max-old-space-size=3072 npx ng build --configuration development --source-map=false && npm run test:theme && npm run test:frame
```

Expected: `Application bundle generation complete.`; сторожа — «ок».

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && git add src/app/feature/system/birge/birge-settings-page.component.ts src/app/feature/system/birge/birge-settings-page.component.html src/app/feature/system/birge/birge-settings-page.component.scss src/app/feature/system/birge/birge-settings-page.component.spec.ts src/app/feature/system/role-navigation/role-navigation.config.ts src/app/feature/system/role-navigation/role-navigation.config.spec.ts src/app/feature/system/system.routes.ts src/app/feature/system/system.routes.spec.ts && git commit -m "$(cat <<'EOF'
feat(birge): настройки модерации — шкала зон, лимит, переполнение, жалобы, словари

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Лента со статусами

**Files:**
- Create: `src/app/feature/system/birge/birge-feed-page.component.ts`
- Create: `src/app/feature/system/birge/birge-feed-page.component.html`
- Create: `src/app/feature/system/birge/birge-feed-page.component.scss`
- Test: `src/app/feature/system/birge/birge-feed-page.component.spec.ts`
- Modify: `src/app/feature/system/role-navigation/role-navigation.config.ts` (раздел `feed`)
- Modify: `src/app/feature/system/role-navigation/role-navigation.config.spec.ts` (список адресов блока)
- Modify: `src/app/feature/system/system.routes.ts` (маршрут `birge/feed`)
- Modify: `src/app/feature/system/system.routes.spec.ts` (импорт и строка в `pages`)

**Interfaces:**
- Consumes: `BirgeModerationService.posts/decide` (задача 2); `FEED_FILTERS` (задача 3); `feedAction`, `birgeErrorText`
  (задача 4); `BirgeSummaryComponent.reload()` (задача 5); `<app-birge-post-card [showStatus]="true">` (задача 6).
- Produces: `BirgeFeedPageComponent` (маршрут `/system/birge/feed`) с публичными `status: BirgePostStatus | null`,
  `posts: ManagerPost[]`, `nextCursor`, `error`, `select(status)`, `load()`, `more()`, `actionOf(post)`,
  `actionLabel(action)`, `act(post)`, `summary?`.

- [ ] **Step 1: Failing test — экран**

`src/app/feature/system/birge/birge-feed-page.component.spec.ts`:

```ts
import { Subject, of, throwError } from 'rxjs';

import { BirgePage, ManagerPost } from '../../../core/models/birge.models';
import { BirgeFeedPageComponent } from './birge-feed-page.component';
import { managerPost } from './birge.testing';

describe('BirgeFeedPageComponent — лента со статусами', () => {
  const shown = managerPost({ id: 1, status: 'published', queueSource: null });
  const hidden = managerPost({ id: 2, status: 'hidden', hiddenReason: 'manager', queueSource: null });
  const rejected = managerPost({ id: 3, status: 'rejected', queueSource: null, rejectReason: { code: 'OFF_TOPIC', note: null } });
  const waiting = managerPost({ id: 4, status: 'pending' });
  const later = managerPost({ id: 5, status: 'tomorrow' });
  const page = (items: ManagerPost[], nextCursor: string | null = null): BirgePage<ManagerPost> => ({ items, nextCursor });

  let birge: { posts: jasmine.Spy; decide: jasmine.Spy };
  let toast: { showSuccess: jasmine.Spy; showError: jasmine.Spy };
  let summary: { reload: jasmine.Spy };

  function build(): BirgeFeedPageComponent {
    const c = new BirgeFeedPageComponent(birge as never, toast as never);
    summary = { reload: jasmine.createSpy('reload') };
    c.summary = summary as never;
    c.ngOnInit();
    return c;
  }

  beforeEach(() => {
    birge = {
      posts: jasmine.createSpy('posts').and.returnValue(of(page([shown, hidden, rejected, waiting], 'p2'))),
      decide: jasmine.createSpy('decide').and.callFake((id: number, body: { action: string }) => of(managerPost({
        id, queueSource: null,
        status: body.action === 'hide' ? 'hidden' : 'published',
        hiddenReason: body.action === 'hide' ? 'manager' : null,
      }))),
    };
    toast = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
  });

  it('открывается со всеми статусами', () => {
    const c = build();
    expect(birge.posts).toHaveBeenCalledOnceWith(null, null);
    expect(c.posts.map((p) => p.id)).toEqual([1, 2, 3, 4]);
    expect(c.nextCursor).toBe('p2');
  });

  it('фильтр статуса перечитывает ленту; тот же статус ещё раз — без запроса', () => {
    const c = build();
    c.select('hidden');
    expect(birge.posts).toHaveBeenCalledWith('hidden', null);
    c.select('hidden');
    expect(birge.posts).toHaveBeenCalledTimes(2);
  });

  it('кнопка по статусу: опубликованное скрывают, скрытое и отклонённое публикуют, ждущие — в очереди', () => {
    const c = build();
    expect(c.actionOf(shown)).toBe('hide');
    expect(c.actionOf(hidden)).toBe('restore');
    expect(c.actionOf(rejected)).toBe('restore');
    expect(c.actionOf(waiting)).toBeNull();
    expect(c.actionOf(later)).toBeNull();
    expect(c.actionLabel('hide')).toBe('Скрыть');
    expect(c.actionLabel('restore')).toBe('Опубликовать');
  });

  it('«Скрыть»: hide без причины, пост из ответа на своём месте, тост, сводка', () => {
    const c = build();
    c.act(shown);
    expect(birge.decide).toHaveBeenCalledOnceWith(1, { action: 'hide', reason: null, note: null });
    expect(c.posts[0].status).toBe('hidden');
    expect(toast.showSuccess).toHaveBeenCalledWith('Пост скрыт из ленты — автор получил уведомление');
    expect(summary.reload).toHaveBeenCalled();
  });

  it('«Опубликовать» скрытое — restore', () => {
    const c = build();
    c.act(hidden);
    expect(birge.decide).toHaveBeenCalledOnceWith(2, { action: 'restore', reason: null, note: null });
    expect(c.posts[1].status).toBe('published');
    expect(toast.showSuccess).toHaveBeenCalledWith('Пост опубликован — автор получил уведомление');
  });

  it('под фильтром «Опубликовано» скрытый пост уходит из списка', () => {
    const c = build();
    birge.posts.and.returnValue(of(page([shown])));
    c.select('published');
    c.act(shown);
    expect(c.posts).toEqual([]);
  });

  it('ждущий решения пост кнопкой не трогается; второй клик во время запроса — без второго решения', () => {
    const c = build();
    c.act(waiting);
    expect(birge.decide).not.toHaveBeenCalled();
    birge.decide.and.returnValue(new Subject());
    c.act(shown);
    c.act(shown);
    expect(birge.decide).toHaveBeenCalledTimes(1);
  });

  it('«Показать ещё» — следующая страница того же статуса', () => {
    const c = build();
    birge.posts.and.returnValue(of(page([later])));
    c.more();
    expect(birge.posts).toHaveBeenCalledWith(null, 'p2');
    expect(c.posts.map((p) => p.id)).toEqual([1, 2, 3, 4, 5]);
    expect(c.nextCursor).toBeNull();
  });

  it('409 — решение уже другое: текст сервера и лента перечитана', () => {
    const c = build();
    birge.decide.and.returnValue(throwError(() => ({ status: 409, error: { messages: ['Пост уже скрыт'] } })));
    c.act(shown);
    expect(toast.showError).toHaveBeenCalledWith('Пост уже скрыт');
    expect(birge.posts).toHaveBeenCalledTimes(2);
  });

  it('бэкенд без модуля — понятная строка', () => {
    birge.posts.and.returnValue(throwError(() => ({ status: 404, error: {} })));
    const c = build();
    expect(c.error).toBe('Раздел Birge на этом стенде ещё не включён: сервер ответил 404');
    expect(c.posts).toEqual([]);
  });
});
```

- [ ] **Step 2: Failing test — навигация и маршрут**

В `role-navigation.config.spec.ts` строку

```ts
      expect(birge.sections.map(s=>s.route)).withContext(role).toEqual(['/system/birge/queue','/system/birge/log','/system/birge/settings']);
```

заменить на

```ts
      expect(birge.sections.map(s=>s.route)).withContext(role).toEqual(['/system/birge/queue','/system/birge/log','/system/birge/settings','/system/birge/feed']);
```

В `system.routes.spec.ts` после `import { BirgeSettingsPageComponent } from './birge/birge-settings-page.component';`
добавить

```ts
import { BirgeFeedPageComponent } from './birge/birge-feed-page.component';
```

и строку `    ['birge/settings', BirgeSettingsPageComponent],` заменить на

```ts
    ['birge/settings', BirgeSettingsPageComponent],
    ['birge/feed', BirgeFeedPageComponent],
```

- [ ] **Step 3: Run — FAIL**

Run:

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless \
  --include=src/app/feature/system/birge/birge-feed-page.component.spec.ts \
  --include=src/app/feature/system/role-navigation/role-navigation.config.spec.ts \
  --include=src/app/feature/system/system.routes.spec.ts
```

Expected: FAIL — `Cannot find module './birge-feed-page.component'`.

- [ ] **Step 4: Implement — экран**

`src/app/feature/system/birge/birge-feed-page.component.ts`:

```ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';

import { BirgeAction, BirgePostStatus, ManagerPost } from '../../../core/models/birge.models';
import { BirgeModerationService } from '../../../core/services/birge-moderation.service';
import { ToastService } from '../../../core/services/toast.service';
import { BirgePostCardComponent } from './birge-post-card.component';
import { BirgeSummaryComponent } from './birge-summary.component';
import { FEED_FILTERS } from './birge.labels';
import { birgeErrorText, feedAction } from './birge.rules';

/**
 * Лента Birge глазами модератора (спека §8): все ветки и комментарии со статусами. Опубликованное можно скрыть,
 * скрытое и отклонённое — опубликовать; ждущие решения здесь не решаются — для них очередь со своим лимитом.
 */
@Component({
  selector: 'app-birge-feed-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatProgressSpinnerModule, BirgeSummaryComponent, BirgePostCardComponent],
  templateUrl: './birge-feed-page.component.html',
  styleUrl: './birge-feed-page.component.scss'
})
export class BirgeFeedPageComponent implements OnInit {
  readonly filters = FEED_FILTERS;
  status: BirgePostStatus | null = null;
  posts: ManagerPost[] = [];
  nextCursor: string | null = null;
  loading = false;
  loadingMore = false;
  error = '';
  /** Посты, решение по которым в пути: второй клик слал бы второе решение. */
  readonly busy = new Set<number>();

  @ViewChild(BirgeSummaryComponent) summary?: BirgeSummaryComponent;

  /** Номер выборки: ответ прежнего фильтра, пришедший после нового, в список не подмешивается. */
  private seq = 0;

  constructor(private birge: BirgeModerationService, private toast: ToastService) {}

  ngOnInit(): void {
    this.load();
  }

  readonly trackPost = (_: number, post: ManagerPost): number => post.id;

  select(status: BirgePostStatus | null): void {
    if (status === this.status) return;
    this.status = status;
    this.load();
  }

  load(): void {
    const seq = ++this.seq;
    this.loading = true;
    this.loadingMore = false;
    this.error = '';
    this.birge.posts(this.status, null).subscribe({
      next: (page) => {
        if (seq !== this.seq) return;
        this.posts = page.items;
        this.nextCursor = page.nextCursor;
        this.loading = false;
      },
      error: (err) => {
        if (seq !== this.seq) return;
        this.posts = [];
        this.nextCursor = null;
        this.loading = false;
        this.error = birgeErrorText(err, 'Лента не загрузилась');
      }
    });
  }

  more(): void {
    if (!this.nextCursor || this.loading || this.loadingMore) return;
    const seq = this.seq;
    this.loadingMore = true;
    this.birge.posts(this.status, this.nextCursor).subscribe({
      next: (page) => {
        if (seq !== this.seq) return;
        this.posts = [...this.posts, ...page.items];
        this.nextCursor = page.nextCursor;
        this.loadingMore = false;
      },
      error: (err) => {
        if (seq !== this.seq) return;
        this.loadingMore = false;
        this.toast.showError(birgeErrorText(err, 'Следующая страница ленты не загрузилась'));
      }
    });
  }

  actionOf(post: ManagerPost): BirgeAction | null {
    return feedAction(post.status);
  }

  actionLabel(action: BirgeAction): string {
    return action === 'hide' ? 'Скрыть' : 'Опубликовать';
  }

  act(post: ManagerPost): void {
    const action = this.actionOf(post);
    if (!action || this.busy.has(post.id)) return;
    this.busy.add(post.id);
    this.birge.decide(post.id, { action, reason: null, note: null })
      .pipe(finalize(() => this.busy.delete(post.id)))
      .subscribe({
        next: (updated) => {
          // Под фильтром статуса пост, сменивший статус, уходит: иначе «Опубликовано» показывало бы скрытый
          this.posts = this.status && updated.status !== this.status
            ? this.posts.filter((p) => p.id !== updated.id)
            : this.posts.map((p) => (p.id === updated.id ? updated : p));
          this.toast.showSuccess(action === 'hide'
            ? 'Пост скрыт из ленты — автор получил уведомление'
            : 'Пост опубликован — автор получил уведомление');
          this.summary?.reload();
        },
        error: (err: { status?: number }) => {
          this.toast.showError(birgeErrorText(err, 'Не удалось сохранить решение'));
          // 409 — статус уже другой (решили в очереди, отменили в журнале): лента на экране устарела
          if (err?.status === 409) this.load();
        }
      });
  }
}
```

`src/app/feature/system/birge/birge-feed-page.component.html`:

```html
<div class="brg brg-feed jts-screen">
  <app-birge-summary></app-birge-summary>

  <p class="jts-screen-lead">Все ветки и комментарии со статусами. «Скрыть» убирает опубликованное из ленты, «Опубликовать»
    возвращает скрытое или отклонённое. Ждущие решения — в очереди: там действует дневной лимит.</p>

  <div class="jts-chips brg-feed__filters" role="group" aria-label="Статус">
    <button type="button" *ngFor="let f of filters" [class.is-on]="status === f.status"
            [attr.aria-pressed]="status === f.status" (click)="select(f.status)">{{ f.label }}</button>
  </div>

  <div class="brg-status" *ngIf="loading"><mat-spinner diameter="22"></mat-spinner><span>Загрузка ленты…</span></div>
  <p class="brg-error" *ngIf="error" role="alert">{{ error }}</p>
  <p class="brg-empty" *ngIf="!loading && !error && !posts.length">Постов с таким статусом нет.</p>

  <app-birge-post-card *ngFor="let post of posts; trackBy: trackPost" [post]="post" [showStatus]="true">
    <div class="brg-actions" *ngIf="actionOf(post) as action; else inQueue">
      <button mat-stroked-button type="button" [disabled]="busy.has(post.id)" (click)="act(post)" data-testid="feed-action">{{ actionLabel(action) }}</button>
    </div>
    <ng-template #inQueue>
      <div class="brg-actions"><a mat-button routerLink="/system/birge/queue">Решить в очереди</a></div>
    </ng-template>
  </app-birge-post-card>

  <button mat-stroked-button type="button" class="brg-more" *ngIf="nextCursor" [disabled]="loadingMore" (click)="more()">
    {{ loadingMore ? 'Загрузка…' : 'Показать ещё' }}
  </button>
</div>
```

`src/app/feature/system/birge/birge-feed-page.component.scss`:

```scss
@use 'birge' as brg;

@include brg.page-states;
@include brg.actions;

.brg-feed__filters { margin: 0 0 16px; }
```

- [ ] **Step 5: Implement — раздел меню и маршрут**

В `role-navigation.config.ts` строку

```ts
    section('settings', 'Настройки модерации', '/birge/settings', 'Пороги риска, лимит ручных заявок, жалобы и словари.'),
```

заменить на

```ts
    section('settings', 'Настройки модерации', '/birge/settings', 'Пороги риска, лимит ручных заявок, жалобы и словари.'),
    section('feed', 'Лента', '/birge/feed', 'Все посты со статусами: скрыть или опубликовать.'),
```

В `system.routes.ts` фрагмент

```ts
        loadComponent: () => import('./birge/birge-settings-page.component').then(m => m.BirgeSettingsPageComponent),
      },
```

заменить на

```ts
        loadComponent: () => import('./birge/birge-settings-page.component').then(m => m.BirgeSettingsPageComponent),
      },
      {
        path: 'birge/feed',
        canActivate: [roleGuard(['CONTENT_MANAGER', 'ADMIN'])],
        loadComponent: () => import('./birge/birge-feed-page.component').then(m => m.BirgeFeedPageComponent),
      },
```

- [ ] **Step 6: Run — PASS**

Run:

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless \
  --include=src/app/feature/system/birge/birge-feed-page.component.spec.ts \
  --include=src/app/feature/system/role-navigation/role-navigation.config.spec.ts \
  --include=src/app/feature/system/role-navigation/navigation-coverage.spec.ts \
  --include=src/app/feature/system/role-navigation/cabinet-navigation.guard.spec.ts \
  --include=src/app/feature/system/system.routes.spec.ts
```

Expected: `TOTAL: N SUCCESS`.

- [ ] **Step 7: Сборка и сторожа**

Run:

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && NODE_OPTIONS=--max-old-space-size=3072 npx ng build --configuration development --source-map=false && npm run test:theme && npm run test:frame
```

Expected: `Application bundle generation complete.`; сторожа — «ок».

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/nural/Desktop/web-admin-birge" && git add src/app/feature/system/birge/birge-feed-page.component.ts src/app/feature/system/birge/birge-feed-page.component.html src/app/feature/system/birge/birge-feed-page.component.scss src/app/feature/system/birge/birge-feed-page.component.spec.ts src/app/feature/system/role-navigation/role-navigation.config.ts src/app/feature/system/role-navigation/role-navigation.config.spec.ts src/app/feature/system/system.routes.ts src/app/feature/system/system.routes.spec.ts && git commit -m "$(cat <<'EOF'
feat(birge): лента со статусами — фильтр, «Скрыть» и «Опубликовать»

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Итоговая проверка, ручной прогон и ревью

**Files:** правки — только по итогам проверок и ревью (в файлах раздела Birge и тех, что меняли задачи 8–11).

**Interfaces:**
- Consumes: всё из задач 2–11; базовая линия `C:/Users/nural/Desktop/birge-karma-baseline.txt` (задача 1).
- Produces: ветка `feat/birge`, готовая к PR в `develop` web-admin.

- [ ] **Step 1: Полный прогон Karma**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng test --watch=false --browsers=ChromeHeadless > ../birge-karma-final.txt 2>&1; tail -5 ../birge-karma-final.txt`
Expected: упавших не больше, чем в базовой линии, и среди упавших нет новых имён (сравнить `FAILED`-строки двух файлов:
`grep "FAILED$" ../birge-karma-baseline.txt | sort > /tmp/a; grep "FAILED$" ../birge-karma-final.txt | sort > /tmp/b; diff /tmp/a /tmp/b`
— пусто или только исчезнувшие строки).

- [ ] **Step 2: Прод-сборка с бюджетами**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && NODE_OPTIONS=--max-old-space-size=3072 npm run build`
Expected: `Application bundle generation complete.`, без `ERROR`; предупреждений `anyComponentStyle` по файлам
`birge-*.scss` нет (порог 8 КБ) — если есть, сократить стили, а не поднимать бюджет.

- [ ] **Step 3: Сторожа**

Run: `cd "C:/Users/nural/Desktop/web-admin-birge" && npm run test:theme && npm run test:selects && npm run test:frame && npm run test:tours && npm run test:parity`
Expected: каждый — «ок»; `test:selects` — `missing: 0`.

- [ ] **Step 4: Ручной прогон на дев-бэкенде**

Run (фоном): `cd "C:/Users/nural/Desktop/web-admin-birge" && npx ng serve --port 4300`
Открыть `http://localhost:4300`, войти учёткой контент-менеджера дев-стенда (вводит владелец). Проверить:
- в меню блок «Birge» со значком `forum` сразу после «Контент платформы»; клик открывает «Очередь проверки», в шапке —
  четыре вкладки без «Обзора»;
- сводка: четыре плитки («Отклонено автоматически (вкл. Feedback)» с подсказкой при наведении), «X / лимит» с
  полосой; число «Ждут решения» — значком у пункта меню и вкладки «Очередь»;
- в очереди скрытый по жалобам пост — с плашкой «Скрыто по жалобам», «не тратит лимит» и кнопками
  «Одобрить и опубликовать» / «Отклонить»; найденные фрагменты (`hits`) подсвечены в тексте и продолжениях;
- «Как работает модерация» свёрнуто, раскрывается с порогами из настроек;
- если бэкенд дева ещё без модуля birge — на всех четырёх экранах строка «Раздел Birge на этом стенде ещё не включён», а
  не ошибка; если модуль есть — одобрить и отклонить по посту (окно причины, «Другое» без описания не проходит),
  в журнале — строка «Менеджер: отклонено — <причина>», у решения AI «Скрыть»/«Опубликовать» → «Отменено», после
  «Показать» — новая строка «Менеджер: скрыто» / «Менеджер: опубликовано», а у автора в колокольчике сайта —
  уведомление об отмене (у отмены «AI: скрыто — лимит дня» уведомления нет, и тост его не обещает); в настройках ползунки
  не сходятся ближе 5, «Сохранить» → словари приходят нормализованными; уход с несохранёнными правками спрашивает;
  в ленте фильтр статусов и «Скрыть» / «Опубликовать»;
- тёмная тема (переключатель темы кабинета) — плашки и шкала читаются;
- ширина 375 px (окно браузера) — плитки сводки в две колонки, шкала и форма настроек в одну.
Остановить `ng serve`.

- [ ] **Step 5: Финальное ревью ветки**

Одно ревью ветки (`git diff origin/develop...feat/birge`) сильной моделью: соответствие §5.3 и §8 спеки, гонки
(двойные клики, устаревшие ответы курсора), тёмная тема, сторожа. Найденное — исправить, прогнать затронутые spec,
отдельный коммит `fix(birge): правки по ревью`.

- [ ] **Step 6: Итог ветки**

Run: `git -C "C:/Users/nural/Desktop/web-admin-birge" status --short && git -C "C:/Users/nural/Desktop/web-admin-birge" log --oneline origin/develop..HEAD`
Expected: рабочее дерево чистое; 10 коммитов задач 2–11 (+ правки ревью). Не пушить — PR в `develop` web-admin
открывается по команде владельца; порядок выкатки на прод — бэкенд → web-admin → веб (спека §11).
