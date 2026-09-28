import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Se apunta directamente al código fuente de @thermocycler/core (no a
// su dist/ compilado). Así, al tocar algo del motor durante desarrollo,
// Vite lo recompila al vuelo junto con la web, sin pasos intermedios.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@thermocycler/core': path.resolve(dirname, '../core/src/index.ts'),
    },
  },
});
