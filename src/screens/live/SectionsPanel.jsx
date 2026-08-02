import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import {
  getLessonSections, createSection, setSectionCompleted, deleteSection,
  getLessonMaterials, attachSectionMaterial, detachSectionMaterial, setSectionMaterialHidden,
  materialRenderUrl,
} from '../../api.js'
import { useLessonLive } from './useLessonLive.js'

// "Разделы" (Edvibe-style) for the live lesson: the teacher organises materials into sections
// and points the class at one material ("follow-me"); students see the same material appear.
// Every mutating call returns the full section list, so we just replace state. A `sections-changed`
// STOMP signal reloads sections when anyone edits them.
//
// The material player is an <iframe> onto the backend `/render` page, authenticated by a token in
// the query string — deliberate parity with web-admin (see api.materialRenderUrl). Known security
// trade-off, to be replaced by a short-lived ticket once the backend offers one.
export default function SectionsPanel({ lessonId, token, selfUserId, isStaff }) {
  const { t } = useI18n()
  const [sections, setSections] = useState([])
  const [materials, setMaterials] = useState([]) // teacher-only attach pool
  const [active, setActive] = useState(null) // { sectionId, materialId }
  const [following, setFollowing] = useState(false)
  const nonceRef = useRef(0)
  const [nonce, setNonce] = useState(0)

  const reloadSections = useCallback(() => {
    getLessonSections(token, lessonId).then((list) => setSections(list || [])).catch(() => {})
  }, [token, lessonId])

  const openMaterial = useCallback((sectionId, materialId, fromTeacher) => {
    nonceRef.current += 1
    setNonce(nonceRef.current)
    setActive({ sectionId, materialId })
    if (fromTeacher) setFollowing(true)
  }, [])

  const { connected, sendFocus } = useLessonLive(lessonId, token, selfUserId, {
    onFocus: (evt) => { if (evt.materialId != null) openMaterial(evt.sectionId, evt.materialId, true) },
    onSectionsChanged: () => reloadSections(),
  })

  useEffect(() => {
    reloadSections()
    if (isStaff) getLessonMaterials(token, lessonId).then((m) => setMaterials(m || [])).catch(() => {})
  }, [reloadSections, isStaff, token, lessonId])

  // ── teacher actions (each returns the fresh section list) ──────────────────
  const withSections = (p) => p.then((list) => { if (Array.isArray(list)) setSections(list) }).catch(() => {})
  const addSection = () => withSections(createSection(token, lessonId, t('sections.newTitle')))
  const removeSection = (sectionId) => withSections(deleteSection(token, lessonId, sectionId))
  const toggleCompleted = (s) => withSections(setSectionCompleted(token, lessonId, s.id, !s.completed))
  const attach = (sectionId, materialId) => { if (materialId) withSections(attachSectionMaterial(token, lessonId, sectionId, Number(materialId))) }
  const detach = (sectionId, sectionMaterialId) => withSections(detachSectionMaterial(token, lessonId, sectionId, sectionMaterialId))
  const toggleHidden = (sectionId, m) => withSections(setSectionMaterialHidden(token, lessonId, sectionId, m.id, !m.hidden))

  // Teacher clicking a material focuses the whole class on it; student just opens it locally.
  const pickMaterial = (sectionId, materialId) => {
    setFollowing(false)
    openMaterial(sectionId, materialId, false)
    if (isStaff) sendFocus(sectionId, materialId)
  }

  const renderUrl = useMemo(() => {
    if (!active?.materialId) return null
    return materialRenderUrl(lessonId, active.materialId, {
      mode: isStaff ? 'review' : 'live',
      token,
      nonce,
    })
  }, [active, isStaff, token, lessonId, nonce])

  return (
    <section className="sections" aria-label={t('sections.title')}>
      <div className="sections__list">
        <div className="sections__head">
          <h2 className="sections__title">{t('sections.title')}</h2>
          {isStaff && <button type="button" className="sections__add" onClick={addSection}>+ {t('sections.add')}</button>}
          <span className={`board__conn${connected ? ' is-on' : ''}`}>{connected ? t('live.connected') : t('live.disconnected')}</span>
        </div>

        {sections.length === 0 && <p className="sections__empty">{t('sections.empty')}</p>}

        {sections.map((s) => {
          const mats = isStaff ? s.materials : (s.materials || []).filter((m) => !m.hidden)
          return (
            <div key={s.id} className={`sections__item${s.completed ? ' is-done' : ''}`}>
              <div className="sections__item-head">
                <span className="sections__item-title">
                  {s.kind === 'EXTRA' ? t('sections.extra') : s.title}
                  {s.completed && <span className="sections__done" aria-label={t('sections.doneBadge')}>✓</span>}
                </span>
                {isStaff && (
                  <span className="sections__item-actions">
                    <button type="button" onClick={() => toggleCompleted(s)}>{s.completed ? t('sections.markUndone') : t('sections.markDone')}</button>
                    {s.kind !== 'EXTRA' && <button type="button" className="is-danger" onClick={() => removeSection(s.id)}>{t('sections.delete')}</button>}
                  </span>
                )}
              </div>

              <ul className="sections__materials">
                {mats.map((m) => (
                  <li key={m.id} className={`sections__material${active?.materialId === m.materialId ? ' is-active' : ''}${m.hidden ? ' is-hidden' : ''}`}>
                    <button type="button" className="sections__material-open" onClick={() => pickMaterial(s.id, m.materialId)}>
                      {m.title || `#${m.materialId}`}
                      {m.isGraded && <span className="sections__badge">{t('sections.graded')}</span>}
                      {m.hidden && <span className="sections__badge sections__badge--muted">{t('sections.hiddenBadge')}</span>}
                    </button>
                    {isStaff && (
                      <span className="sections__material-actions">
                        <button type="button" onClick={() => toggleHidden(s.id, m)}>{m.hidden ? t('sections.material.show') : t('sections.material.hide')}</button>
                        <button type="button" className="is-danger" onClick={() => detach(s.id, m.id)}>×</button>
                      </span>
                    )}
                  </li>
                ))}
                {mats.length === 0 && <li className="sections__material-empty">{t('sections.noMaterials')}</li>}
              </ul>

              {isStaff && materials.length > 0 && (
                <select className="sections__attach" defaultValue="" onChange={(e) => { attach(s.id, e.target.value); e.target.value = '' }}>
                  <option value="" disabled>{t('sections.material.attach')}</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.fileName || `#${m.id}`}</option>)}
                </select>
              )}
            </div>
          )
        })}
      </div>

      <div className="sections__viewer">
        {!isStaff && following && <p className="sections__following">{t('sections.following')}</p>}
        {renderUrl ? (
          <iframe
            key={`${active.materialId}:${nonce}`}
            className="sections__frame"
            title={t('sections.materialTitle')}
            src={renderUrl}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        ) : (
          <p className="sections__viewer-empty">{isStaff ? t('sections.viewerHintTeacher') : t('sections.viewerHintStudent')}</p>
        )}
      </div>
    </section>
  )
}
