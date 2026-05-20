// Central pdf.js setup. We use Vite's `?worker` import so the worker
// is bundled by Vite (no manual file-copy or CDN), which means it
// works identically in dev and in the Cloudflare Pages build.
//
// `GlobalWorkerOptions.workerPort` accepts a Worker instance directly
// — that's the right hook when we already have a constructed worker.
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerPort) {
  pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();
}

export { pdfjsLib };
