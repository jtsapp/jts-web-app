'use client'

// Просьба о доступе к микрофону — плашка Speaking Buddy: стрелка к адресной строке, где спросит браузер, кнопка
// «Разрешить, когда я на сайте» и подсказка. Общая для звонка тьютору и Луны (задача 202, 16.11.2026, владелец:
// «сделать запрос как на Speaking Buddy»), поэтому вынесена из экрана звонка. Вид — .t-micperm в tutor.css, тексты
// даёт экран: у тьютора свой словарь (i18n/dict.js), у Луны — общий.

import { MicIcon, MicOffIcon } from '../tutor/TutorIcons.jsx'

function ArrowUpIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5l6 6-1.4 1.4L13 8.8V19h-2V8.8l-3.6 3.6L6 11l6-6z" fill="currentColor" />
    </svg>
  )
}

/**
 * blocked — браузер уже запретил и сам больше не спросит: стрелки к адресной строке нет, микрофон перечёркнут,
 * а под подсказкой (children) — где снять запрет.
 * onClose — кнопка «Не сейчас». У звонка тьютору её нет: там отказ — уйти с экрана звонка.
 * @param {{ hint: string, allowLabel: string, onAllow: () => void, blocked?: boolean, closeLabel?: string,
 *   onClose?: () => void, className?: string, children?: import('react').ReactNode }} props
 */
export default function MicPermissionPrompt({ hint, allowLabel, onAllow, blocked = false, closeLabel, onClose, className = '', children }) {
  return (
    <div
      className={`t-micperm${blocked ? ' is-blocked' : ''}${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-label={hint}
      data-mic-perm={blocked ? 'blocked' : 'ask'}
    >
      <div className="t-micperm__row">
        <span className="t-micperm__chips">
          {!blocked && (
            <span className="t-micperm__chip t-micperm__chip--arrow">
              <ArrowUpIcon size={22} />
            </span>
          )}
          <span className="t-micperm__chip t-micperm__chip--mic">
            {blocked ? <MicOffIcon size={22} /> : <MicIcon size={22} />}
          </span>
        </span>
        <button className="t-micperm__allow" type="button" onClick={onAllow}>
          {allowLabel}
        </button>
      </div>
      <p className="t-micperm__hint">{hint}</p>
      {children}
      {onClose && (
        <button className="t-micperm__close" type="button" onClick={onClose}>
          {closeLabel}
        </button>
      )}
    </div>
  )
}
