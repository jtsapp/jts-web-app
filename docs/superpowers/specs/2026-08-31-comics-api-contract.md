# Комиксы: контракт API

Спека для бэкенд-команды. Раздел «Комиксы» в «Практике»: каталог комиксов,
постраничные картинки и текст реплик с переводом.

Решения, на которых стоит спека (приняты 31.08.2026):

- бэкенд делает отдельная команда, админка и веб — по этому контракту;
- материал комикса заливается **одним ZIP** на комикс, распаковывает бэкенд;
- веб берёт комиксы **только из API**, статического фолбэка нет.

Идиомы взяты с модуля `reel` (`V96__Create_reels_table.sql`,
`AdminReelController`, `ReelRequest`) — он ближе всего по форме.

---

## 1. Что такое комикс

Графический роман, разрезанный на страницы. Одна страница — одна картинка
WebP; читалка показывает по странице на экран. Рядом со страницей веб рисует
панель реплик: список фраз в порядке чтения, каждая с готовым переводом.
Реплики не привязаны к координатам на картинке — только порядок.

Пилот: Yellow (Jay Martin), 214 страниц, 34.9 МБ, ~1250×1920 (20 разворотов
1920×1476).

Контент бывает 18+ (мат, военные сцены), поэтому у комикса есть флаг
`adultOnly` — веб по нему закрывает карточку.

---

## 2. Таблицы

Номера миграций взять следующие свободные: на `origin/main` последняя —
`V202__Group_description.sql`.

### `comics`

```sql
CREATE TABLE comics (
    id           BIGSERIAL PRIMARY KEY,
    slug         VARCHAR(64)  NOT NULL UNIQUE,
    title        VARCHAR(255) NOT NULL,
    author       VARCHAR(255),
    level        VARCHAR(8),
    cover_url    VARCHAR(1000),
    description_ru TEXT,
    description_en TEXT,
    description_kk TEXT,
    page_count   INTEGER NOT NULL DEFAULT 0,
    adult_only   BOOLEAN NOT NULL DEFAULT false,
    order_index  INTEGER NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comics_is_active ON comics(is_active);
CREATE INDEX idx_comics_order ON comics(order_index);
```

`slug` — латиницей, из него собирается путь в MinIO (`comics/<slug>/…`) и по
нему веб кэширует прогресс чтения. Меняться после заливки не должен.

`page_count` — денормализация ради списка в админке и карточки в каталоге:
каталог не должен тянуть страницы, чтобы показать «214 стр.».

### `comic_pages`

```sql
CREATE TABLE comic_pages (
    id         BIGSERIAL PRIMARY KEY,
    comic_id   BIGINT  NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
    number     INTEGER NOT NULL,
    image_url  VARCHAR(1000) NOT NULL,
    width      INTEGER,
    height     INTEGER,
    CONSTRAINT uq_comic_pages_number UNIQUE (comic_id, number)
);

CREATE INDEX idx_comic_pages_comic ON comic_pages(comic_id);
```

`width`/`height` нужны читалке: без них страница «прыгает» при загрузке —
браузер не знает пропорции, пока не скачает картинку.

### `comic_page_blocks`

Реплики страницы. Отдельной таблицей, а не JSON-колонкой: их правят
поштучно (опечатка в переводе — это UPDATE одной строки, а не перезапись
всей страницы).

```sql
CREATE TABLE comic_page_blocks (
    id             BIGSERIAL PRIMARY KEY,
    comic_page_id  BIGINT  NOT NULL REFERENCES comic_pages(id) ON DELETE CASCADE,
    order_index    INTEGER NOT NULL,
    kind           VARCHAR(16) NOT NULL DEFAULT 'balloon',
    text_en        TEXT NOT NULL,
    text_ru        TEXT,
    text_kk        TEXT
);

CREATE INDEX idx_comic_blocks_page ON comic_page_blocks(comic_page_id, order_index);
```

`kind` — одно из `balloon` (речь), `caption` (авторская плашка), `sfx` (звук),
`sign` (надпись в кадре). Веб приглушает `sfx` и `sign`: их не разбирают
пословно.

`order_index` — порядок чтения страницы. Это единственная привязка реплики к
картинке, координат нет. Так вышло не от лени: координаты баллонов, снятые
зрением модели, врут — до половины рамок ложится на пустой рисунок.

---

## 3. Заливка: ZIP

### Эндпоинт

```
POST /admin/comics/{id}/upload
Content-Type: multipart/form-data
Body: material=<файл .zip>
```

Ответ `200`:

```json
{ "pages": 214, "blocks": 1180, "warnings": [] }
```

### Структура архива

```
yellow/
  pages/001.webp … 214.webp
  cover.webp
  index.json
  yellow.json           ← страницы: {id,title,author,level,cover,pages:[{n,url,w,h}]}
  text-yellow.json      ← реплики: {id,model,pages:{"<n>":[{kind,en,ru,kk}]}}
  README.txt
```

Внутри архива один корневой каталог, его имя = `slug`. Именно такой архив
отдаёт `scripts/extract-comics.js` + `scripts/extract-comic-text.js` в
`jts-web-app`.

### Что делает бэкенд

1. Разбирает `pages/*.webp`. Имя файла — номер страницы (`001.webp` → 1),
   ведущие нули срезать. Порядок брать из имени, а не из порядка записей в
   ZIP: в архиве он не гарантирован.
2. Каждый файл кладёт в MinIO по существующему `FileServiceImpl` в путь
   `comics/<slug>/<NNN>.webp`, `Content-Type: image/webp`. Хост в примерах —
   `files-dev.justtostudy.kz`: именно оттуда отдаются рилсы
   (`/development/reels/…`), проверено на дев-стенде 31.08.
3. Пишет `comic_pages` (number, image_url, width, height). Размеры брать из
   `<slug>.json` — там уже посчитаны; читать WebP-заголовок не нужно.
4. `cover.webp` кладёт туда же как `comics/<slug>/cover.webp`, записывает в
   `comics.cover_url`.
5. Разбирает `text-<slug>.json` и пишет `comic_page_blocks`. Ключ — номер
   страницы строкой. `order_index` — позиция в массиве.
6. Обновляет `comics.page_count`.

**Повторная заливка того же комикса — полная замена**: старые
`comic_pages` (и каскадом блоки) удаляются, объекты в MinIO
перезаписываются. Иначе после перегенерации в базе останется хвост из
страниц, которых больше нет.

### Важные оговорки

- **Текст может покрывать не все страницы.** `text-<slug>.json` заполняется
  отдельным прогоном и докатывается. Страницы без реплик — это норма, не
  ошибка: `comic_pages` создаётся всегда, `comic_page_blocks` — только там,
  где есть текст. В `warnings` можно вернуть «текст есть у N из M страниц».
- **Лимит тела запроса.** 35 МБ одним куском. Проверить `client_max_body_size`
  в nginx и `spring.servlet.multipart.max-file-size` /
  `max-request-size` — дефолт Spring 1 МБ / 10 МБ, с ним заливка упадёт на
  413. В этом проекте на такие грабли уже наступали: STT «не слышал дольше
  30 секунд» ровно из-за nginx-лимита в 1 МБ.
- **Распаковку вести потоково** (`ZipInputStream`), не разворачивая архив в
  память целиком.
- **Zip-slip.** Имена внутри архива проверять: запись, чей нормализованный
  путь выходит за пределы корня (`../`), отбрасывать. Готового разбора ZIP в
  бэкенде сейчас нет, так что это первый такой обработчик.
- Заливка длинная (214 объектов в MinIO). Если синхронный запрос упирается в
  таймаут прокси — вынести в асинхронную задачу со статусом, но тогда нужен
  `GET /admin/comics/{id}/upload-status`. Начинать лучше с синхронного:
  проще, и при 35 МБ обычно укладывается.

---

## 4. Эндпоинты админки

Все под `@PreAuthorize("hasRole('ADMIN')")`, как `AdminReelController`.

| Метод | Путь | Назначение |
|---|---|---|
| `GET` | `/admin/comics` | список, `Page<ComicResponse>`, `@PageableDefault` |
| `GET` | `/admin/comics/{id}` | карточка |
| `POST` | `/admin/comics` | создать (метаданные, без страниц) |
| `PUT` | `/admin/comics/{id}` | обновить метаданные |
| `DELETE` | `/admin/comics/{id}` | удалить вместе со страницами и блоками |
| `PATCH` | `/admin/comics/{id}/activate` | показать в каталоге |
| `PATCH` | `/admin/comics/{id}/deactivate` | скрыть |
| `POST` | `/admin/comics/{id}/upload` | залить ZIP (см. выше) |
| `GET` | `/admin/comics/{id}/pages` | страницы с блоками — для просмотра в админке |
| `PUT` | `/admin/comics/blocks/{blockId}` | правка одной реплики |

`ComicRequest` (создание/обновление):

```json
{
  "slug": "yellow",
  "title": "Yellow",
  "author": "Jay Martin",
  "level": "B1",
  "descriptionRu": "…", "descriptionEn": "…", "descriptionKk": "…",
  "adultOnly": true,
  "orderIndex": 0,
  "isActive": true
}
```

Валидация как в `ReelRequest`: `@NotBlank` на `slug` и `title`, `@NotNull` на
`isActive`. На `slug` дополнительно `@Pattern("^[a-z0-9-]{2,64}$")` — он едет
в путь MinIO и в URL.

`ComicBlockRequest` (правка реплики): `{ "kind", "textEn", "textRu", "textKk" }`.

---

## 5. Эндпоинты для приложения

| Метод | Путь | Назначение | Статус |
|---|---|---|---|
| `GET` | `/mobile/comics` | каталог активных комиксов | сделано |
| `GET` | `/mobile/comics/{id}` | страницы + реплики одного комикса | сделано |
| `GET` | `/mobile/comics/search?q=` | поиск по названию и автору | сделано |

**Правка контракта 31.08.2026.** Изначально читалка адресовалась по `slug`,
реализовали по `id` — клиент подогнан, вопрос закрыт. Но `slug` всё равно
должен приходить в ответе: веб помечает им закладку чтения в localStorage,
потому что `id` при перезаливке материала может смениться, а закладка нет.

Поиск отдаёт тот же список, что и каталог. Пустой `q` клиент до сервера не
доводит — показывает весь каталог.

`GET /mobile/comics` → массив:

```json
[{
  "id": 1,
  "slug": "yellow",
  "title": "Yellow",
  "author": "Jay Martin",
  "level": "B1",
  "coverUrl": "https://files-dev.justtostudy.kz/…/comics/yellow/cover.webp",
  "pageCount": 214,
  "adultOnly": true,
  "description": { "ru": "…", "en": "…", "kk": "…" }
}]
```

`GET /mobile/comics/yellow` →

```json
{
  "id": 1,
  "slug": "yellow",
  "title": "Yellow",
  "author": "Jay Martin",
  "level": "B1",
  "coverUrl": "…",
  "adultOnly": true,
  "pages": [{
    "n": 1,
    "url": "https://files-dev.justtostudy.kz/…/comics/yellow/001.webp",
    "w": 976,
    "h": 1500,
    "blocks": [
      { "kind": "balloon", "en": "Here you go. You need ketchup?",
        "ru": "Держи. Кетчуп нужен?", "kk": "Мә. Кетчуп керек пе?" }
    ]
  }]
}
```

Замечания:

- Отдавать **одним ответом**, а не по странице. Для Yellow это ~300 КБ JSON;
  запрос на страницу означал бы 214 запросов за одно чтение книги.
- `blocks` у страницы без текста — пустой массив, не `null`.
- Порядок `pages` — по `number`, `blocks` — по `order_index`. Веб на этот
  порядок опирается и сам не сортирует.
- Неактивный комикс (`is_active = false`) из обоих эндпоинтов исключать.

---

## 6. Возрастной гейт

`adultOnly` бэкенд только отдаёт; решение принимает клиент. Но чтобы клиенту
было чем решать, нужен возраст пользователя в профиле. Сейчас `birthDate`
уходит на бэкенд в `updateUser` и обратно веб его не получает.

Просьба: отдавать `birthDate` (или готовое `isAdult`) в ответе профиля. Если
такое поле уже есть под другим именем — скажите каким, доделаем на клиенте.

---

## 7. Порядок выката

1. Бэкенд: миграции + модуль + эндпоинты, катится на дев.
   Читающая часть (`/mobile/comics`, `/mobile/comics/{id}`, `/mobile/comics/search`)
   заявлена готовой; на деве 31.08 в 18:10 ещё не отвечала.
   **Админская часть (`/admin/comics*`, включая заливку) — не начата, и без неё
   материал в систему не попадёт.**
2. Админка: раздел «Комиксы» в «Медиа», создание карточки и заливка ZIP —
   готово, ждёт ручек.
3. Веб: каталог, поиск и читалка на `/mobile/comics` — готово, ждёт ручек.

Пока ручки не отвечают, раздел в вебе не показывается вовсе: каталог пуст,
и чип с секцией скрыты. Это ожидаемое поведение, а не поломка.

Отдельно: пока в профиле нет `birthDate`, комиксы с `adultOnly` скрыты у всех
— гейт закрыт по умолчанию. Пилотный Yellow помечен 18+, так что до появления
поля он не покажется даже после заливки.

Материал пилота (214 WebP, обложка, манифесты, текст 12 страниц) собран и
лежит архивом; остальные 202 страницы текста добираются прогоном
`node scripts/extract-comic-text.js --id yellow`.
