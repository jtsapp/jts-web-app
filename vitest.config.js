export default {
  esbuild: {
    // Components in src/**/*.jsx use the automatic JSX runtime (no explicit
    // `import React` — matches Next.js/SWC), so the test transform must too.
    jsx: 'automatic',
  },
  test: {
    // Exposes afterEach/etc as globals so @testing-library/react's automatic
    // cleanup() runs between tests (see node_modules/@testing-library/react/dist/index.js).
    globals: true,
    // Свой exclude ПЕРЕКРЫВАЕТ дефолтный, поэтому здесь перечислено всё, что
    // иначе уехало бы в прогон. `**/node_modules/**` вместо корневого: после
    // `npm run build` в `.next/standalone` лежит копия проекта вместе со своим
    // node_modules, и vitest собирал тесты чужих пакетов — 1273 файла из .next
    // и 424 «падения», к коду проекта отношения не имеющих.
    exclude: ['tests/**/*.spec.js', '**/node_modules/**', '.next/**'],
  },
}
