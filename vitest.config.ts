import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Tests unitarios: funciones puras de src/lib (sin DOM, sin red). El alias @
// espeja el de tsconfig para que los imports coincidan con el código de producción.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
