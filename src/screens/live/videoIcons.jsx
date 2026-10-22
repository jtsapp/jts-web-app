// Иконки звонка: инлайн-SVG в стиле lw-meet__icon, цвет берут у кнопки через currentColor.
const PATHS = {
  mic: 'M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z',
  camera: 'M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4Z',
  expand: 'M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM4 14h2v4h4v2H4v-6Zm14 0h2v6h-6v-2h4v-4Z',
  collapse: 'M8 4h2v6H4V8h4V4Zm6 0h2v4h4v2h-6V4ZM4 14h6v6H8v-4H4v-2Zm10 0h6v2h-4v4h-2v-6Z',
  // Удалить участника — человек с минусом, а не трубка: трубка уже значит «выйти самому».
  remove: 'M14 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4 6c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Zm7-5h6v2h-6V9Z',
  leave:'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z',
}

// off — перечёркнутая иконка: устройство выключено.
export default function VideoIcon({ name, off = false, size = 20 }) {
  return (
    <svg className="lw-video__icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path fill="currentColor" d={PATHS[name]} />
      {off && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />}
    </svg>
  )
}
