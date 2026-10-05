import { normalize, validate } from '../model/spr.js'
import { ErrorIcon, EyeIcon, NoCircleIcon, OkCircleIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Десятичная запись прочтения: до четырёх знаков, без хвостовых нулей («21/2 = 10.5», «1/3 = 0.3333»)
function decimal(v) {
  return String(Math.round(v * 10000) / 10000)
}

/**
 * Ввод ответа-числа (Figma SAT 27): поле с счётчиком знаков, строка «Система прочитает», правила ввода и ошибка
 * формата. Ошибка формата видна ДО проверки, а не после (доска «Решения»): «3 1/2» студент узнаёт сразу, а не
 * потеряв балл. Пока ошибки нет, внизу пример — как в макете. Верность ответа экран не знает: ключей у него нет.
 */
export default function SprInput({ value, onChange, disabled, autoFocus }) {
  const { t } = useI18n()
  const raw = value || ''
  const v = raw ? validate(raw) : null
  const n = normalize(raw)
  const limit = n.startsWith('-') ? 6 : 5
  let reads = '—'
  if (v?.ok) reads = n.includes('/') ? `${n} = ${decimal(v.value)}` : decimal(v.value)
  const bad = v && !v.ok

  return (
    <div className="st-spr">
      <div className="st-card st-spr__card">
        <label className="st-spr__label" htmlFor="st-spr-input">{t('sat.spr.yours')}</label>
        <div className={`st-spr__field ${bad ? 'is-bad' : ''}`}>
          <input
            id="st-spr-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            maxLength={8}
            value={raw}
            disabled={disabled}
            autoFocus={autoFocus}
            aria-invalid={bad || undefined}
            aria-describedby="st-spr-reads"
            onChange={(e) => onChange?.(e.target.value)}
          />
          <span className="st-spr__count" aria-hidden="true">{n.length} / {limit}</span>
        </div>
        <p className="st-spr__reads" id="st-spr-reads">
          <EyeIcon size={18} />
          <span>{t('sat.spr.reads')}</span>
          <b>{bad ? '—' : reads}</b>
        </p>
      </div>
      <div className="st-card st-spr__rules">
        <h3>{t('sat.spr.rules')}</h3>
        <ul>
          <li><OkCircleIcon /> {t('sat.spr.rule.length')}</li>
          <li><OkCircleIcon /> {t('sat.spr.rule.forms')}</li>
          <li className="is-no"><NoCircleIcon /> {t('sat.spr.rule.mixed')}</li>
          <li className="is-no"><NoCircleIcon /> {t('sat.spr.rule.symbols')}</li>
        </ul>
      </div>
      {/* после проверки пример ошибки уже ни к чему — ответ принят или разобран */}
      {!disabled && (
      <p className="st-spr__err" role={bad ? 'alert' : undefined}>
        <ErrorIcon />
        <span>
          {bad
            ? t('sat.spr.errorNow', { v: raw, msg: t(`sat.spr.err.${v.code}`) })
            : t('sat.spr.errorExample')}
        </span>
      </p>
      )}
    </div>
  )
}
