import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The PDF editor is deployed under /pdf-editor/ on the techtuate site,
// so all built asset URLs must be prefixed with that path.
export default defineConfig({
  base: '/pdf-editor/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  // pdf.js ships an ESM build that benefits from being pre-bundled by Vite.
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
});
