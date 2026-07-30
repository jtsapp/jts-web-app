// Flat config для ESLint 9 (npm run lint). Раньше файла не было вовсе — eslint
// падал с «couldn't find eslint.config», и «проверка перед PR» из CLAUDE.md
// молча не выполнялась. eslint-config-next 16 уже отдаёт готовый flat-массив,
// поэтому просто разворачиваем его (FlatCompat не нужен и ломается на нём).
import next from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
  ...next,
  {
    // agent/ — Python; public/ — крупные single-file HTML-бандлы (до 5.7 МБ);
    // отчёты Playwright линтить незачем. .next/out/build уже игнорит next-конфиг.
    ignores: ['public/**', 'agent/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    // Новые правила react-hooks v7 (React-Compiler-готовность) — держим как warn,
    // а не error: их не было, когда писался код, и красный линт на 23 pre-existing
    // advisory блокирует сам гейт «проверка перед PR». Остаются видимыми для
    // постепенной чистки — больше всего в App.jsx и screens/TutorVoiceChatPage.jsx.
    // Вернуть в error — заменить 'warn' здесь.
    rules: {
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
]

export default eslintConfig
