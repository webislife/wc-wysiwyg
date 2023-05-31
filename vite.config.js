import { defineConfig } from 'vite';
import { resolve } from 'path';
 export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, './src/wc-wysiwyg.ts'),
      name: 'WcWysiwyg',
      fileName: (format) => `wc-wysiwyg.${format}.js`,
    },
  },
});