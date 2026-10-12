import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/wc-wysiwyg.ts'),
      name: 'WcWysiwyg',
      fileName: (format) => (format === 'es' ? 'wc-wysiwyg.es.js' : 'wc-wysiwyg.umd.cjs'),
      formats: ['es', 'umd'],
    },
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      // Zero runtime dependencies — nothing to externalize.
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'style.css';
          return '[name][extname]';
        },
      },
    },
  },
});
