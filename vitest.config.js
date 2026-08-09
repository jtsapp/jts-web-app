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
    exclude: ['tests/**/*.spec.js', 'node_modules/**'],
  },
}
