'use client'

import { useMemo } from 'react'
import { useI18n } from '../../i18n.jsx'
import { LEVELS, PATTERNS, formsOf, pattern, visibleVerbs } from '../../practice/verbs/engine.js'
import { SearchIcon, SpeakerIcon, StarIcon } from './VerbsIcons.jsx'

const PAUSES = [0, 1.5, 3, 5]

// Часть 02 «Изучи» — таблица 90 глаголов (renderTable прототипа). Фильтры
// живут в VerbsPage: схему выставляет и урок («открыть схему в таблице»), а
// при уходе на другую вкладку и обратно фильтр не должен сбрасываться.
export default function VerbsTable({
  data,
  filters,
  onFilters,
  level,
  onLevel,
  saved,
  onToggleSave,
  revealed,
  onReveal,
  onHideAgain,
  player,
  playerState,
  pause,
  onPause,
  loop,
  onLoop,
  onPractice,
}) {
  const { t } = useI18n()
  const visible = useMemo(
    () => visibleVerbs(data.verbs, { ...filters, level }, saved),
    [data.verbs, filters, level, saved],
  )
  const groups = data.groups.filter((g) => visible.some((v) => v.group === g))
  const savedN = Object.keys(saved).filter((k) => saved[k]).length
  const anyFilter =
    !!filters.query || level !== 'all' || filters.pattern !== 'all' || filters.group !== 'all' || filters.onlySaved
  const playing = playerState.active ? playerState.verb : null

  const set = (patch) => onFilters({ ...filters, ...patch })
  const clear = () => {
    onLevel('all')
    onFilters({ ...filters, query: '', pattern: 'all', group: 'all', onlySaved: false })
  }
  // «Слушать выбранное» — по группам в их порядке, как в таблице.
  const listenVisible = () => {
    const ordered = []
    for (const g of data.groups) ordered.push(...visible.filter((v) => v.group === g))
    player.start(ordered, { loop })
  }

  return (
    <div className="vb-table-part">
      <div className="vb-intro">
        <div>
          <span className="vb-eyebrow">{t('verbs.playerTitle')}</span>
          <h2>{t('verbs.sub1')}</h2>
        </div>
        <button type="button" className="vb-btn" onClick={onPractice}>
          {t('verbs.practice')} ↗
        </button>
      </div>

      <div className="vb-card vb-filters">
        <label className="vb-search">
          <SearchIcon />
          <span className="vb-sr">{t('verbs.searchLabel')}</span>
          <input
            type="search"
            autoComplete="off"
            value={filters.query}
            placeholder={t('verbs.search')}
            onChange={(e) => set({ query: e.target.value })}
          />
        </label>
        <div className="vb-filters__row">
          <label>
            <span>{t('verbs.level')}</span>
            <select value={level} onChange={(e) => onLevel(e.target.value)}>
              <option value="all">{t('verbs.all')}</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('verbs.pattern')}</span>
            <select value={filters.pattern} onChange={(e) => set({ pattern: e.target.value })}>
              <option value="all">{t('verbs.allPatterns')}</option>
              {PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('verbs.group')}</span>
            <select value={filters.group} onChange={(e) => set({ group: e.target.value })}>
              <option value="all">{t('verbs.allGroups')}</option>
              {data.groups.map((g) => (
                <option key={g} value={g}>
                  {t('verbs.group_' + g)}
                </option>
              ))}
            </select>
          </label>
          <label className="vb-check">
            <input type="checkbox" checked={filters.onlySaved} onChange={(e) => set({ onlySaved: e.target.checked })} />
            <span>{t('verbs.favorites')}</span>
            <span className="vb-pill">{savedN}</span>
          </label>
        </div>
        <div className="vb-filters__bottom">
          <label className="vb-check">
            <input type="checkbox" role="switch" checked={filters.hide} onChange={(e) => set({ hide: e.target.checked })} />
            <span>{t('verbs.hide')}</span>
          </label>
          {filters.hide && (
            <button type="button" className="vb-link" onClick={onHideAgain}>
              {t('verbs.hideAgain')}
            </button>
          )}
          {anyFilter && (
            <button type="button" className="vb-link" onClick={clear}>
              {t('verbs.clear')}
            </button>
          )}
          <span className="vb-muted vb-filters__count" aria-live="polite">
            {t('verbs.count', { n: visible.length, total: data.verbs.length })}
          </span>
        </div>
        {filters.hide && <p className="vb-muted">{t('verbs.revealHint')}</p>}
      </div>

      <div className="vb-chips" aria-label={t('verbs.groups')}>
        {data.groups.map((g) => (
          <button
            key={g}
            type="button"
            className="vb-chip"
            aria-pressed={filters.group === g}
            onClick={() => set({ group: filters.group === g ? 'all' : g })}
          >
            {t('verbs.group_' + g)} <span>{data.verbs.filter((v) => v.group === g).length}</span>
          </button>
        ))}
      </div>

      <section className={`vb-listen${playerState.active && !playerState.paused ? ' is-running' : ''}`}>
        <div className="vb-listen__top">
          <div className="vb-listen__mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="vb-listen__copy">
            <h3>{t('verbs.playerTitle')}</h3>
            <p>{t('verbs.playerHint')}</p>
          </div>
          <button type="button" className="vb-btn vb-btn--ghost" disabled={!visible.length} onClick={listenVisible}>
            <SpeakerIcon />
            {t('verbs.listenVisible')}
          </button>
        </div>
        {playerState.active && playing && (
          <div className="vb-listen__now">
            <div className="vb-listen__row">
              <strong lang="en">{formsOf(playing).join(' → ')}</strong>
              <span className="vb-pill">
                {playerState.index + 1} / {playerState.total}
              </span>
            </div>
            <p className="vb-muted" aria-live="polite">
              {playerState.waiting && !playerState.paused
                ? t('verbs.repeatPause')
                : t(playerState.paused ? 'verbs.paused' : 'verbs.playing', { n: playerState.index + 1, total: playerState.total })}
            </p>
            <div className="vb-row">
              <button type="button" className="vb-btn vb-btn--ghost" onClick={() => player.pauseResume()}>
                {t(playerState.paused ? 'verbs.resume' : 'verbs.pause')}
              </button>
              <button type="button" className="vb-btn vb-btn--ghost" onClick={() => player.next()}>
                {t('verbs.nextVerb')}
              </button>
              <button type="button" className="vb-btn vb-btn--ghost" onClick={() => player.stop()}>
                {t('verbs.stop')}
              </button>
            </div>
          </div>
        )}
        {playerState.error && <div className="vb-notice">{t('verbs.clipError')}</div>}
        <details className="vb-listen__settings">
          <summary>{t('verbs.playerSettings')}</summary>
          <div className="vb-listen__grid">
            <label>
              <span>{t('verbs.repeatGap')}</span>
              <select value={String(pause)} onChange={(e) => onPause(Number(e.target.value))}>
                {PAUSES.map((p) => (
                  <option key={p} value={String(p)}>
                    {p} {t('verbs.seconds')}
                  </option>
                ))}
              </select>
            </label>
            <label className="vb-check">
              <input type="checkbox" checked={loop} onChange={(e) => onLoop(e.target.checked)} />
              <span>{t('verbs.loop')}</span>
            </label>
          </div>
        </details>
      </section>
      <p className="vb-muted">{t('verbs.groupNote')}</p>

      {groups.length === 0 && <div className="vb-empty">{t('verbs.empty')}</div>}
      {groups.map((g) => {
        const vs = visible.filter((v) => v.group === g)
        return (
          <section className="vb-group" key={g} id={`vb-group-${g}`}>
            <div className="vb-group__head">
              <div className="vb-group__meta">
                <h3>
                  <span className="vb-group__num">{String(data.groups.indexOf(g) + 1).padStart(2, '0')}</span>
                  {t('verbs.group_' + g)}
                </h3>
                <span className="vb-pill">{vs.length}</span>
              </div>
              <button type="button" className="vb-btn vb-btn--ghost vb-btn--sm" onClick={() => player.start(vs, { loop })}>
                <SpeakerIcon />
                {t('verbs.listenGroup')}
              </button>
            </div>
            <div className="vb-table-scroll" tabIndex={0} aria-label={t('verbs.group_' + g)}>
              <table className="vb-table">
                <thead>
                  <tr>
                    {['V1', 'V2', 'V3', t('verbs.ruCol'), t('verbs.kkCol'), t('verbs.level'), t('verbs.listen')].map((h) => (
                      <th scope="col" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vs.map((v) => (
                    <tr key={v.v1} className={playing && playing.v1 === v.v1 ? 'is-playing' : undefined}>
                      <td lang="en">
                        {v.v1} <span className="vb-pill vb-pill--sm">{pattern(v)}</span>
                        {v.note && <small className="vb-note">{t('verbs.' + v.note)}</small>}
                      </td>
                      {[1, 2].map((i) => {
                        const key = `${v.v1}-${i}`
                        return (
                          <td lang="en" key={i}>
                            {filters.hide && !revealed[key] ? (
                              <button
                                type="button"
                                className="vb-hidden"
                                aria-label={`${t('verbs.reveal')} V${i + 1}, ${v.v1}`}
                                onClick={() => onReveal(key)}
                              >
                                ____
                              </button>
                            ) : (
                              <span className={filters.hide ? 'vb-revealed' : undefined}>{formsOf(v)[i]}</span>
                            )}
                          </td>
                        )
                      })}
                      <td lang="ru">{v.ru}</td>
                      <td lang="kk">{v.kk}</td>
                      <td>
                        <span className="vb-pill">{v.lvl}</span>
                      </td>
                      <td className="vb-actions">
                        <button
                          type="button"
                          className="vb-icon-btn"
                          aria-label={`${t('verbs.listen')}: ${v.v1}`}
                          onClick={() => player.start([v], { loop })}
                        >
                          <SpeakerIcon />
                        </button>
                        <button
                          type="button"
                          className="vb-icon-btn"
                          aria-pressed={!!saved[v.v1]}
                          aria-label={`${t(saved[v.v1] ? 'verbs.saved' : 'verbs.save')}: ${v.v1}`}
                          onClick={() => onToggleSave(v.v1)}
                        >
                          <StarIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="vb-scroll-hint" aria-hidden="true">
              ← V1 · V2 · V3 · RU · KK →
            </div>
          </section>
        )
      })}

      <div className="vb-next">
        <p className="vb-muted">{t('verbs.editorial')}</p>
        <button type="button" className="vb-btn" onClick={onPractice}>
          {t('verbs.practice')} →
        </button>
      </div>
    </div>
  )
}
