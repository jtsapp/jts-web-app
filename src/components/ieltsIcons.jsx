// Stroke icons for the IELTS screens. Path data lifted from lucide-react (ISC),
// which felix imports as a package — inlined here instead so this app keeps its
// zero-icon-dependency setup and the same `currentColor` contract as icons.jsx.

function Svg({ size = 24, strokeWidth = 2, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function HeadphonesIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </Svg>
  )
}

export function BookOpenIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </Svg>
  )
}

export function PenLineIcon(props) {
  return (
    <Svg {...props}>
      <path d="M13 21h8" />
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    </Svg>
  )
}

export function MicIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 19v3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <rect x="9" y="2" width="6" height="13" rx="3" />
    </Svg>
  )
}

export function ArrowLeftIcon(props) {
  return (
    <Svg {...props}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </Svg>
  )
}

export function LoaderIcon(props) {
  return (
    <Svg {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </Svg>
  )
}

export function SparklesIcon(props) {
  return (
    <Svg {...props}>
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </Svg>
  )
}

export function PlayIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
    </Svg>
  )
}

export function VolumeIcon(props) {
  return (
    <Svg {...props}>
      <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
      <path d="M16 9a5 5 0 0 1 0 6" />
      <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
    </Svg>
  )
}

export function SquareIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </Svg>
  )
}

export function TrendingUpIcon(props) {
  return (
    <Svg {...props}>
      <path d="M16 7h6v6" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
    </Svg>
  )
}
