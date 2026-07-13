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

export function ChevronLeftIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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

export function AppleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.88 2.65 3.22 2.6 1.29-.05 1.78-.83 3.34-.83 1.56 0 2 .83 3.37.81 1.39-.03 2.27-1.27 3.12-2.53.98-1.45 1.39-2.85 1.41-2.93-.03-.01-2.71-1.04-2.74-4.12-.02-.01 0 0 0 0Zm-2.58-7.57c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-3 1.54-.66.76-1.24 1.98-1.08 3.15 1.14.09 2.31-.58 3.02-1.44Z" />
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

export function LearningIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 4 2 9l10 5 8-4v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11.5V16c0 1 2.7 3 6 3s6-2 6-3v-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
export function PracticeIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  )
}
export function TutorIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
export function LessonsIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5v-15Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5v-15Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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
