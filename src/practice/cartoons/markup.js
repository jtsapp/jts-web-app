// Разметка Cartoon World — из прототипа без логотипа, переключателя RU/KZ и ссылки
// «К содержанию»: шапка и язык — у приложения, а якорь #ct-main сдвигал бы адрес
// приложения. Корень .ct#cartoons-app — как у прототипа: на него опирается CSS.

export const CARTOONS_MARKUP = `<div class="ct" id="cartoons-app">

    <header class="ct-top">
      <div class="ct-top__inner">
        <nav class="ct-crumbs" aria-label="Навигация по разделу">
          <a href="#" data-route="library" data-i18n="navLibrary">Мультфильмы</a>
          <span class="ct-crumbs__sep" aria-hidden="true">/</span>
          <span class="ct-crumbs__current" id="ct-crumb-current"></span>
        </nav>
      </div>
    </header>

    <main id="ct-main" tabindex="-1">
      <!-- LIBRARY -->
      <section class="ct-view" id="ct-library" aria-labelledby="ct-lib-title">
        <div class="ct-hero">
                    <h1 class="ct-h1" id="ct-lib-title" data-i18n="libTitle">Cartoon World</h1>
        </div>

        <form class="ct-filters" id="ct-filters" role="search" aria-label="Поиск и фильтры">
          <div class="ct-search">
            <label class="ct-visually-hidden" for="ct-q" data-i18n="searchLabel">Поиск</label>
            <svg class="ct-search__icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 14l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <input id="ct-q" name="q" type="search" autocomplete="off" data-i18n-placeholder="searchPh" placeholder="Название или сериал">
          </div>

          <fieldset class="ct-levels ct-audience">
            <legend class="ct-visually-hidden" data-i18n="audienceLabel">Для кого</legend>
            <div class="ct-seg" id="ct-aud-chips"></div>
          </fieldset>

          <fieldset class="ct-levels">
            <legend class="ct-visually-hidden" data-i18n="levelLegend">Уровень CEFR</legend>
            <div class="ct-chips" id="ct-level-chips"></div>
          </fieldset>

          <div class="ct-selects">
            <label class="ct-select">
              <span data-i18n="topicLabel">Тема</span>
              <select id="ct-topic" name="topic"></select>
            </label>
            <label class="ct-select">
              <span data-i18n="lengthLabel">Длительность</span>
              <select id="ct-length" name="length"></select>
            </label>
            <button type="button" class="ct-clear" id="ct-clear" hidden data-i18n="resetFilters">Сбросить фильтры</button>
          </div>
        </form>

        <p class="ct-count" id="ct-count" aria-live="polite"></p>
        <div class="ct-shelves" id="ct-grid"></div>
        <div class="ct-empty" id="ct-empty" hidden>
          <p class="ct-empty__title" data-i18n="emptyTitle">Ничего не нашлось</p>
          <p data-i18n="emptyText">Попробуйте другой уровень или уберите часть фильтров.</p>
          <button type="button" class="ct-btn ct-btn--ghost" id="ct-reset" data-i18n="resetFilters">Сбросить фильтры</button>
        </div>
      </section>

      <!-- PLAYER -->
      <section class="ct-view" id="ct-player-view" hidden aria-labelledby="ct-ep-title">
        <div class="ct-watch">
          <div class="ct-video" id="ct-video"></div>
          <div class="ct-meta">
            <div class="ct-meta__title">
              <p class="ct-eyebrow" id="ct-ep-eyebrow"></p>
              <h1 class="ct-h2" id="ct-ep-title"></h1>
              <ul class="ct-tags" id="ct-ep-tags"></ul>
            </div>
            <div class="ct-controls" id="ct-controls">
              <label class="ct-select ct-select--inline" id="ct-rate-box" hidden><span data-i18n="speed">Скорость</span><select id="ct-rate" disabled></select></label>
              <a class="ct-yt-link" id="ct-yt-link" href="#" target="_blank" rel="noopener"></a>
            </div>
          </div>
          <section class="ct-mission" id="ct-mission" aria-label="Writing mission" hidden></section>
          <p class="ct-credit" id="ct-credit" hidden></p>
        </div>
      </section>
    </main>


    <footer class="ct-foot">
      <p data-i18n-html="footYoutube">Видео встроены из YouTube. Смотря их, вы соглашаетесь с <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">Условиями YouTube</a> и <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Политикой конфиденциальности Google</a>.</p>
    </footer>
  </div>`
