import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The property-based tests run many full simulations, so they take
    // several seconds each. The default 5-second limit makes them flaky when
    // the suite runs in parallel.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/kernel/**', 'src/engines/**', 'src/interactions/**', 'src/assistant/**'],
    },
  },
});
