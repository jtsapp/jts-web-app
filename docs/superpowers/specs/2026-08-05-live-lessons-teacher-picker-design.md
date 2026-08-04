# Live-lessons teacher picker + native render (P3) — design

**Date:** 2026-08-05
**Repo/branch:** jts-web-app `feat/live-lessons-catalog-picker` (stacked on
`feat/lesson-workspace-live-data`, worktree `/jts-web-app-lesson-ws`)
**Status:** design — awaiting approval

## Goal

A teacher browses the course catalog (level → unit → lesson) served by
`GET /mobile/course-catalog` (P2 backend) and picks a lesson; the picked lesson
renders **natively** in the existing `LessonWorkspacePage`.

Decisions locked with the user:
- **Native JSON render + E6** (not raw iframe). The lesson HTML is turned into the
  workspace JSON model and rendered by the existing React blocks/questions.
- Recommended here (needs confirmation): **client-side extraction on open**.

## Why client-side extraction (recommended)

The catalog lesson (`CourseLesson`) stores only `fileUrl` (raw `L*.html` on
files-api), no `jsonUrl`. To render natively we need the JSON. Options:

| Where | Pros | Cons |
|-------|------|------|
| **Client, on open (rec.)** | No backend/register change; catalog stays light; always fresh; **avoids the broken dev `/media/upload`** (raw HTML is already on files-api via mc mirror, fetched directly) | Ports the lesson extractor into jts-web-app (~300 lines); ~1.2s settle per open |
| Register-time (web-admin) | Client unchanged (reuses jsonUrl path) | Renders+extracts+**uploads** 42 lessons per register — and dev upload returns a dead URL; needs `json_url` column |

The dev-upload breakage ([[dev-media-upload-returns-dead-r2-url]]) makes
register-time upload unreliable, so we extract on the client from the raw HTML.

## Data flow

```
CourseCatalogPage → getCourseCatalog()  (GET /mobile/course-catalog, SWR-cached)
  → teacher picks a CourseLesson id
  → setLiveWorkspaceId(id); setScreen('lesson-workspace')  (?screen=lesson-workspace&catalog=<id>)
LessonWorkspacePage(catalogLessonId)
  → loadCatalogLesson(id, token)
      → getCourseCatalogLesson(id)  (GET /mobile/course-catalog/lessons/{id}) → { fileUrl, title, type }
      → fetch(fileUrl)              (raw L*.html from files-api, public)
      → runAndExtract(html)         (ported extractor, hidden iframe)
      → rewriteMediaUrls(json, fileUrl)   (E6: relative audio/img/src → absolute)
      → workspace lesson model
```

The existing `?screen=lesson-workspace&lesson=<id>` (LiveLesson via jsonUrl) path
stays; a new `?screen=lesson-workspace&catalog=<id>` param selects the catalog
loader. `App.jsx` keeps one workspace case and passes whichever id is set.

## Components

1. **`src/api.js`** — add near `getLiveLesson`:
   - `getCourseCatalog(token, onFresh)` via `cachedAuthGet('/mobile/course-catalog', …)`.
   - `getCourseCatalogLesson(id, token)` via `authGet('/mobile/course-catalog/lessons/{id}')`.

2. **`src/screens/CourseCatalogPage.jsx`** — inside `LearningLayout active="lessons"`.
   - Level selector (reuse `LearningPage` node style) → per level, units
     (reuse `KingdomInteriorPage` unit grouping) → lesson rows (reuse
     `schedule/LessonRow` card) with a type badge (lesson/video/review/leadin/test).
   - `onOpenLesson(catalogLessonId)` → App navigates to the workspace.

3. **`src/screens/workspace/loadCatalogLesson.js`** — the loader above (mirrors
   `liveLessonData.js`), with an in-memory cache by lesson id.

4. **`src/screens/workspace/extract/`** — JS port of the web-admin lesson extractor
   (`extractLiveLesson` + `runAndExtract`, floor/quiet/cap settle) — the exact
   logic already tested there, kept in sync. Plus `rewriteMediaUrls(lesson, base)`
   for E6: absolutise relative `src`/`href` in info-block HTML and any media
   fields against the lesson's `fileUrl`.

5. **`src/App.jsx`** — import `CourseCatalogPage`; `case 'course-catalog'`; read
   `?catalog=` into `liveWorkspaceId` + a `workspaceMode` flag; entry point into
   the picker from `LessonsPage`/sidebar.

6. **`src/i18n.jsx`** — `catalog.*` keys in ru/en/kk (title, chooseLevel, unit,
   lessonTypes, openLesson, empty, loading).

## E6 — media URL rewrite

The lesson HTML references `audio/…`, `images/…` relative to its own folder.
After extraction, `rewriteMediaUrls` resolves every relative URL (in info-block
sanitized HTML and media fields) to absolute against `fileUrl` via `new URL(rel,
fileUrl)`. This is what makes the natively-rendered lesson actually play media.

## Testing

- **vitest** (repo already has vitest + RTL, jsdom): `rewriteMediaUrls` (relative →
  absolute, leaves absolute/data URLs alone); catalog grouping helper; the ported
  extractor keeps its unit tests (mirror the web-admin specs).
- **Playwright** e2e (repo has it): picker renders a mocked `/mobile/course-catalog`
  tree, clicking a lesson deep-links into the workspace.
- Real verification: run a real `L*.html` through the ported extractor + E6 in
  Chromium and confirm absolute media URLs (as done for P1/P2).

## Decomposition & scope

- **P3a** — picker screen + api.js + App wiring + i18n (buildable against the P2
  `/mobile/course-catalog` endpoints).
- **P3b** — catalog lesson loader + extractor port + E6 + workspace hand-off.

Both land together as one PR (the picker is only useful once open works).

## Out of scope

- Progress/grading persistence for catalog lessons (workspace already grades
  locally; server progress is a later concern).
- Lossy interactive fidelity (dead builder/Sam) — inherent to native render;
  tracked from P1, not solved here.
