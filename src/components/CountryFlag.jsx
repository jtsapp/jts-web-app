// Флаг страны картинкой: эмодзи-флаги из макета «Регистрация» (Figma рисует их
// яблочным набором), выгруженные рендером в public/assets/flags/<iso>.webp —
// 59 стран списка телефона плюс глобус «другой страны». Не эмодзи текстом: на
// Windows флаг-эмодзи браузер рисует двумя буквами («KZ»), а не флагом.
//
// Полотно у всех флагов одно (86×64, 3× от глифа 32-го кегля), поэтому размер
// задаётся высотой, а ширина держит пропорцию.

const RATIO = 86 / 64

export default function CountryFlag({ iso, height = 21, className = '' }) {
  const code = String(iso || 'other').toLowerCase()
  return (
    <img
      className={`country-flag${className ? ' ' + className : ''}`}
      src={`/assets/flags/${code}.webp`}
      width={Math.round(height * RATIO)}
      height={height}
      alt=""
      draggable={false}
      data-iso={code}
    />
  )
}
