/**
 * Coordinate conversion between pdf.js CSS-pixel space and pdf-lib point space.
 *
 * pdf.js renders with top-left origin in CSS pixels at the current scale.
 * pdf-lib draws with bottom-left origin in PDF points (1 pt = 1/72 inch).
 *
 * Letter page example (612 × 792 pts, scale 1.0):
 *   css (0, 0)     → pdf (0, 792)   top-left  → pdf bottom-left origin
 *   css (100, 50)  → pdf (100, 742) 100px right, 50px down from top
 *   css (612, 792) → pdf (612, 0)   bottom-right corner
 */

/**
 * CSS pixel coordinate (at `scale`) → PDF points.
 * @param {{ x: number, y: number, scale: number, pageHeightPts: number }} p
 * @returns {{ x: number, y: number }}
 */
export function cssToPdf({ x, y, scale, pageHeightPts }) {
  return {
    x: x / scale,
    y: pageHeightPts - y / scale,
  };
}

/**
 * PDF point coordinate → CSS pixels at `scale`.
 * @param {{ x: number, y: number, scale: number, pageHeightPts: number }} p
 * @returns {{ x: number, y: number }}
 */
export function pdfToCss({ x, y, scale, pageHeightPts }) {
  return {
    x: x * scale,
    y: (pageHeightPts - y) * scale,
  };
}

/**
 * Returns the intrinsic size of a page in PDF points (scale-invariant).
 * Uses pdf.js's getViewport at scale=1 so we don't need a separate call.
 * @param {import('pdfjs-dist').PDFDocumentProxy} pdfDoc
 * @param {number} pageNum  1-based
 * @returns {Promise<{ widthPts: number, heightPts: number }>}
 */
export async function getPdfPageSize(pdfDoc, pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const vp = page.getViewport({ scale: 1 });
  return { widthPts: vp.width, heightPts: vp.height };
}
