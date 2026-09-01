// Набор SVG-иконок, используемых в интерфейсе

export function InstagramIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" />
    </svg>
  )
}

export function TelegramIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.94 4.3 18.9 19.02c-.23 1.02-.83 1.27-1.68.79l-4.64-3.42-2.24 2.16c-.25.25-.46.46-.94.46l.33-4.73L18.4 6.5c.37-.33-.08-.51-.58-.18L6.18 13.66l-4.57-1.43c-1-.31-1.02-1 .21-1.48l17.86-6.88c.83-.31 1.55.19 1.26 2.43z" />
    </svg>
  )
}

export function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01 9.42 9.42 0 0 1 16.08-6.66 9.36 9.36 0 0 1 2.76 6.67c0 5.19-4.23 9.41-9.42 9.41zM20.13 3.87A11.28 11.28 0 0 0 12.05.53C5.83.53.77 5.59.77 11.81c0 1.99.52 3.93 1.51 5.64L.68 23.47l6.15-1.61a11.25 11.25 0 0 0 5.22 1.33h.01c6.22 0 11.28-5.06 11.28-11.28 0-3.01-1.17-5.85-3.31-7.98z" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PlayIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
    </svg>
  )
}

export function MicIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
    </svg>
  )
}

export function StopIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

export function RepeatIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
    </svg>
  )
}

export function EyeIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function VolumeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 9v6h3.5L13 20V4L7.5 9H4Z" fill="currentColor" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M18.8 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronRightCircleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.14" />
      <path d="m10.5 8.5 3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MenuIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

// Нейтральный аватар для пользователя без имени — вместо случайной буквы
// («J» из 'JTS' или «П» из подписи «Профиль»), чтобы шапка и сам профиль
// показывали один и тот же силуэт, а не разные буквы.
export function UserIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8.5" r="3.6" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19.2c0-3.5 3.1-5.7 7-5.7s7 2.2 7 5.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CloseIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function BellIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6.4 9.2a5.6 5.6 0 0 1 11.2 0c0 4.1 1.7 5.7 1.7 5.7H4.7s1.7-1.6 1.7-5.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 18.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function SendIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M21.5 2.5 11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.5 2.5 15 21l-4-8-8-4 18.5-6.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PhoneIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PhoneChatIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M23.06 12.25c0-.85-.07-1.48-.22-2.13H12.2v3.87h6.24c-.13 1.04-.8 2.6-2.32 3.66l-.02.14 3.37 2.6.23.02c2.14-1.98 3.37-4.9 3.37-8.16Z" fill="#4285F4" />
      <path d="M12.2 24c3.06 0 5.63-1.01 7.5-2.74l-3.58-2.76c-.95.66-2.24 1.13-3.92 1.13-3 0-5.54-1.98-6.45-4.71l-.13.01-3.5 2.7-.05.13A11.79 11.79 0 0 0 12.2 24Z" fill="#34A853" />
      <path d="M5.76 14.92a7.28 7.28 0 0 1-.4-2.42c0-.84.15-1.66.38-2.42l-.01-.16L2.2 7.17l-.11.06A11.94 11.94 0 0 0 .8 12.5c0 1.92.47 3.74 1.29 5.36l3.67-2.94Z" fill="#FBBC05" />
      <path d="M12.2 4.87c2.13 0 3.56.91 4.38 1.67l3.2-3.11C17.82 1.5 15.26.5 12.2.5A11.79 11.79 0 0 0 2.09 7.23l3.66 2.85c.92-2.73 3.46-4.71 6.45-4.71Z" fill="#EB4335" />
    </svg>
  )
}

// Иконки навигации — точные векторы из Figma-сайдбара (RemixIcon fill),
// заливка currentColor. Offset пути повторяет позицию вектора в кадре 24×24.
export function LearningIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        transform="translate(3 2.27)"
        d="M18 17.73C18 18.29 17.55 18.73 17 18.73L1 18.73C0.45 18.73 0 18.29 0 17.73L0 7.22C0 6.91 0.14 6.62 0.39 6.43L8.39 0.21C8.75 -0.07 9.25 -0.07 9.61 0.21L17.61 6.43C17.86 6.62 18 6.91 18 7.22L18 17.73Z"
        fill="currentColor"
      />
    </svg>
  )
}
export function PracticeIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        transform="translate(3 3)"
        d="M18 14C18 16.21 16.21 18 14 18C11.79 18 10 16.21 10 14C10 11.79 11.79 10 14 10C16.21 10 18 11.79 18 14ZM8 4C8 6.21 6.21 8 4 8C1.79 8 0 6.21 0 4C0 1.79 1.79 0 4 0C6.21 0 8 1.79 8 4ZM18 4C18 6.21 16.21 8 14 8C13.26 8 12.56 7.80 11.97 7.45L7.45 11.97C7.80 12.56 8 13.26 8 14C8 16.21 6.21 18 4 18C1.79 18 0 16.21 0 14C0 11.79 1.79 10 4 10C4.74 10 5.44 10.20 6.03 10.55L10.55 6.03C10.20 5.44 10 4.74 10 4C10 1.79 11.79 0 14 0C16.21 0 18 1.79 18 4Z"
        fill="currentColor"
      />
    </svg>
  )
}
export function TutorIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        transform="translate(0.59 0.5)"
        d="M11.41 17.76L4.36 21.71L5.93 13.78L0 8.29L8.03 7.34L11.41 0L14.80 7.34L22.83 8.29L16.89 13.78L18.47 21.71L11.41 17.76Z"
        fill="currentColor"
      />
    </svg>
  )
}
export function LessonsIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        transform="translate(0 2)"
        d="M12 0L0 7L12 14L22 8.17L22 15.5L24 15.5L24 7L12 0ZM4 11.49L4 16C5.82 18.43 8.73 20 12 20C15.27 20 18.18 18.43 20 16L20 11.49L12 16.16L4 11.49Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IeltsIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        transform="translate(1 2)"
        d="M20.625 14.0538C20.625 14.7745 19.9833 15.4052 19.25 15.4052H16.9583C15.3083 15.4052 13.6583 15.946 12.375 16.9369L11.8254 17.3874C11.5504 17.5675 11.275 17.6575 11 17.6575C10.725 17.6575 10.4496 17.5675 10.1746 17.3874L9.625 16.9369C8.34168 15.946 6.69163 15.4052 5.04167 15.4052H2.75C2.01667 15.4052 1.375 14.7745 1.375 14.0538V2.88309H0.916667C0.410406 2.88309 0 3.28644 0 3.784V16.3967C9.7911e-05 16.8942 0.410468 17.2976 0.916667 17.2976H3.66667C5.85819 17.2976 7.95261 17.9588 9.71098 19.2754L9.7163 19.2798L10.4504 19.82C10.7762 20.06 11.2239 20.06 11.5496 19.82L12.289 19.2754C14.0474 17.9588 16.1419 17.2976 18.3333 17.2976H21.0833C21.5895 17.2976 21.9999 16.8942 22 16.3967V3.784C22 3.28644 21.5896 2.88309 21.0833 2.88309H20.625V14.0538ZM16.9583 0C15.0333 0 13.108 0.630636 11.5496 1.80182L11 2.25227L10.4504 1.80182C8.89202 0.630636 6.96667 0 5.04167 0H3.66667C3.11667 0 2.75 0.360364 2.75 0.900909V14.0538H5.04167C6.96667 14.0538 8.89202 14.6845 10.4504 15.8556L11 16.3061L11.5496 15.8556C13.108 14.6845 15.0333 14.0538 16.9583 14.0538H19.25V0.900909C19.25 0.360364 18.8833 0 18.3333 0H16.9583Z"
        fill="currentColor"
      />
    </svg>
  )
}
// Лист с галочкой — проверенная домашняя работа.
export function HomeworkIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M7 2.5h7.5L20 8v13.5H7a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 2.5V8h5.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m8.8 14.4 2.2 2.2 4.2-4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function VocabIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 2.5C5.34 2.5 4 3.84 4 5.5V18.5C4 20.16 5.34 21.5 7 21.5H19C19.55 21.5 20 21.05 20 20.5C20 19.95 19.55 19.5 19 19.5V17.5C19.55 17.5 20 17.05 20 16.5V3.5C20 2.95 19.55 2.5 19 2.5H7ZM17 19.5V17.5H7C6.45 17.5 6 17.95 6 18.5C6 19.05 6.45 19.5 7 19.5H17ZM8 7.5H16V9.5H8V7.5Z"
        fill="currentColor"
      />
    </svg>
  )
}
export function RuFlagIcon({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={{ borderRadius: 3, display: 'block' }}>
      <rect width="30" height="20" fill="#fff" />
      <rect y="6.67" width="30" height="6.67" fill="#0039A6" />
      <rect y="13.33" width="30" height="6.67" fill="#D52B1E" />
    </svg>
  )
}

export function GbFlagIcon({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={{ borderRadius: 3, display: 'block' }}>
      <rect width="30" height="20" fill="#012169" />
      <g stroke="#fff" strokeWidth="4">
        <path d="M0 0 30 20" />
        <path d="M30 0 0 20" />
      </g>
      <g stroke="#C8102E" strokeWidth="2">
        <path d="M0 0 30 20" />
        <path d="M30 0 0 20" />
      </g>
      <rect x="12.5" width="5" height="20" fill="#fff" />
      <rect y="7.5" width="30" height="5" fill="#fff" />
      <rect x="13.5" width="3" height="20" fill="#C8102E" />
      <rect y="8.5" width="30" height="3" fill="#C8102E" />
    </svg>
  )
}

export function KzFlagIcon({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={{ borderRadius: 3, display: 'block' }}>
      <rect width="30" height="20" fill="#00AFCA" />
      <circle cx="15" cy="9" r="4.2" fill="#FEC50C" />
      <rect x="6" y="15.5" width="18" height="1.6" rx="0.8" fill="#FEC50C" />
    </svg>
  )
}


export function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20.5 20.5-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function TrashIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Замок королевства — в пилюле-навигации шапки «Обучения»
export function CastleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 21v-9l2 1V8l2 1V5h2v2l3-2 3 2V5h2v4l2-1v2l2-1v9h-6v-4a2 2 0 0 0-4 0v4H3Zm8-9.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z" />
    </svg>
  )
}

/* ——— Иконки типов уроков (печеньки на тропе «Обучения») ——— */
// Выбор вариантов ответа — лист
export function LeafIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 20c0-9 6.5-15 16-15 0 9.5-6.5 15-16 15Z" fill="currentColor" />
      <path d="M8.5 15.5C11 13 14 11.5 17 11" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
// Аудио — эквалайзер
export function WaveIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {[
        [5, 9, 6],
        [9, 5, 14],
        [13, 7, 10],
        [17, 3, 18],
      ].map(([x, y, h]) => (
        <rect key={x} x={x} y={y} width="2.6" height={h} rx="1.3" fill="currentColor" />
      ))}
    </svg>
  )
}
// Видео — полумесяц (как в макете)
export function CrescentIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14.5 3a9 9 0 1 0 5.5 16.5A7.5 7.5 0 0 1 14.5 3Z" fill="currentColor" />
    </svg>
  )
}
// Объяснение темы — звезда
export function StarIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 18.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3Z" fill="currentColor" />
    </svg>
  )
}
// Финальный экзамен — «взрыв»/звёздочка
export function BurstIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m12 2 2.2 4.3 4.6-1.6-1.6 4.6L21.9 12l-4.7 2.7 1.6 4.6-4.6-1.6L12 22l-2.2-4.3-4.6 1.6 1.6-4.6L2.1 12l4.7-2.7L5.2 4.7l4.6 1.6L12 2Z" fill="currentColor" />
    </svg>
  )
}

export function CameraIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.4l1-1.6A1 1 0 0 1 8.75 4h6.5a1 1 0 0 1 .85.4l1 1.6h1.4A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function CheckIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Инструменты доски. Формы те же, что у преподавателя (Material: near_me, edit,
// check_box_outline_blank, radio_button_unchecked, title) — доска одна на всех, и
// узнавать инструмент по разной картинке ученику и преподавателю не с руки.
export function CursorIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 3l14 7-6 2-2 6-6-15z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

export function PenIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

export function RectIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function EllipseIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="8" ry="6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function TextToolIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 6h14M12 6v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function UndoIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 8H15a5 5 0 0 1 0 10h-4M9 8 12 5M9 8l3 3" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function RedoIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 8H9a5 5 0 0 0 0 10h4M15 8 12 5M15 8l-3 3" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ImageIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
      <path d="m4 17 5-5 4 4 2-2 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}


export function ExpandIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CollapseIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
