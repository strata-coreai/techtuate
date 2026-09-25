/* ============================================================
   techtuate business card maker - rendering engine
   One layout model, three outputs:
     - SVG   (live preview + gallery thumbnails)
     - Canvas (300 DPI PNG)
     - jsPDF (vector PDF with embedded fonts, bleed + crop marks)
   All coordinates are millimetres from the card's trim top-left;
   backgrounds may extend into the bleed (negative / beyond W,H).
   Text sizes are in points. Everything runs in the browser.
   ============================================================ */
(function (root) {
  'use strict';

  var PT = 0.352778; // mm per point

  // ---------- fonts ----------
  var FONT_DIR = '/business-card-maker/fonts/';
  var FONTS = {
    serif400:  { fam: 'BCM Serif',   w: 400, s: 'normal', file: 'noto-serif-400' },
    serif700:  { fam: 'BCM Serif',   w: 700, s: 'normal', file: 'noto-serif-700' },
    serif400i: { fam: 'BCM Serif',   w: 400, s: 'italic', file: 'noto-serif-400i' },
    sans400:   { fam: 'BCM Sans',    w: 400, s: 'normal', file: 'noto-sans-400' },
    sans700:   { fam: 'BCM Sans',    w: 700, s: 'normal', file: 'noto-sans-700' },
    geo400:    { fam: 'BCM Geo',     w: 400, s: 'normal', file: 'montserrat-400' },
    geo700:    { fam: 'BCM Geo',     w: 700, s: 'normal', file: 'montserrat-700' },
    disp400:   { fam: 'BCM Display', w: 400, s: 'normal', file: 'playfair-400' },
    disp700:   { fam: 'BCM Display', w: 700, s: 'normal', file: 'playfair-700' },
    disp400i:  { fam: 'BCM Display', w: 400, s: 'italic', file: 'playfair-400i' },
    mono400:   { fam: 'BCM Mono',    w: 400, s: 'normal', file: 'roboto-mono-400' },
    mono500:   { fam: 'BCM Mono',    w: 500, s: 'normal', file: 'roboto-mono-500' }
  };
  var fontPromises = {};
  function loadFont(key) {
    var f = FONTS[key];
    if (!f) return Promise.resolve();
    if (fontPromises[key]) return fontPromises[key];
    var face = new FontFace(f.fam, 'url(' + FONT_DIR + f.file + '.woff2) format("woff2")', { weight: String(f.w), style: f.s });
    fontPromises[key] = face.load().then(function (ff) { document.fonts.add(ff); }).catch(function () {});
    return fontPromises[key];
  }
  function loadAllFonts() { return Promise.all(Object.keys(FONTS).map(loadFont)); }

  // ---------- measuring (kerning off everywhere so all three outputs agree) ----------
  var mctx = document.createElement('canvas').getContext('2d');
  try { mctx.fontKerning = 'none'; } catch (e) {}
  function cssFont(key, px) { var f = FONTS[key]; return f.s + ' ' + f.w + ' ' + px + 'px "' + f.fam + '"'; }
  // width in mm of text at size pt with letter spacing ls (em)
  function measure(s, key, sizePt, ls) {
    s = String(s || '');
    if (!s) return 0;
    mctx.font = cssFont(key, 100);
    var w = mctx.measureText(s).width / 100 * sizePt * PT;
    return w + (ls || 0) * sizePt * PT * (Array.from(s).length - 1);
  }

  // ---------- colour helpers ----------
  function hexToRgb(h) {
    h = String(h || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r) { return '#' + r.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function mix(a, b, t) { var x = hexToRgb(a), y = hexToRgb(b); return rgbToHex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; })); }
  function lum(h) {
    var c = hexToRgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function onColor(bg) { return contrast(bg, '#ffffff') >= contrast(bg, '#161616') ? '#ffffff' : '#161616'; }

  // ---------- QR ----------
  function makeQR(text, ecl) {
    if (!text || !root.QRCode || !root.QRCode.create) return null;
    try {
      var q = root.QRCode.create(text, { errorCorrectionLevel: ecl || 'M' });
      var m = q.modules;
      return { n: m.size, get: function (r, c) { return !!m.data[r * m.size + c]; }, version: q.version };
    } catch (e) { return null; }
  }

  // ---------- resolve: auto-fit text, compute left x from alignment ----------
  function resolve(els) {
    return els.map(function (e) {
      if (e.t !== 'text' || !e.s) return e;
      var size = e.size, w = measure(e.s, e.f, size, e.ls);
      var str = e.s, cut = false;
      if (e.maxW && w > e.maxW) {
        var min = e.minSize || size * 0.5;
        size = Math.max(min, size * e.maxW / w);
        w = measure(str, e.f, size, e.ls);
        // still too long even at the smallest size: trim the end with an ellipsis
        while (w > e.maxW && str.length > 2) { str = str.slice(0, -2).replace(/\s+$/, '') + '\u2026'; w = measure(str, e.f, size, e.ls); cut = true; }
      }
      var x = e.x;
      if (e.align === 'center') x = e.x - w / 2;
      else if (e.align === 'right') x = e.x - w;
      return Object.assign({}, e, { s: str, size: size, lx: x, w: w, cut: cut, shrunk: size < e.size - 0.01 });
    });
  }

  // ---------- SVG ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // SVG text is laid out at 10x (0.1 mm units) inside a scale(0.1) group: tiny font sizes
  // in user units make browsers round glyph advances, so text would not match the PDF.
  function toSVG(els, W, H, opt) {
    opt = opt || {};
    var b = opt.bleed || 0, K = 10;
    var n = function (v) { return +(v * K).toFixed(2); };
    var vb = (-b) + ' ' + (-b) + ' ' + (W + 2 * b) + ' ' + (H + 2 * b);
    var id = 'c' + Math.random().toString(36).slice(2, 8);
    var out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="100%" style="display:block">',
      '<defs><clipPath id="' + id + '"><rect x="' + (-b) + '" y="' + (-b) + '" width="' + (W + 2 * b) + '" height="' + (H + 2 * b) + '"/></clipPath></defs>',
      '<g clip-path="url(#' + id + ')"><g transform="scale(0.1)">'];
    resolve(els).forEach(function (e) {
      var op = e.opacity != null ? ' opacity="' + e.opacity + '"' : '';
      if (e.t === 'rect') {
        out.push('<rect x="' + n(e.x) + '" y="' + n(e.y) + '" width="' + n(e.w) + '" height="' + n(e.h) + '"' + (e.r ? ' rx="' + n(e.r) + '"' : '') +
          ' fill="' + (e.fill || 'none') + '"' + (e.stroke ? ' stroke="' + e.stroke + '" stroke-width="' + n(e.sw) + '"' : '') + op + '/>');
      } else if (e.t === 'circle') {
        out.push('<circle cx="' + n(e.cx) + '" cy="' + n(e.cy) + '" r="' + n(e.r) + '" fill="' + (e.fill || 'none') + '"' + (e.stroke ? ' stroke="' + e.stroke + '" stroke-width="' + n(e.sw) + '"' : '') + op + '/>');
      } else if (e.t === 'line') {
        out.push('<line x1="' + n(e.x1) + '" y1="' + n(e.y1) + '" x2="' + n(e.x2) + '" y2="' + n(e.y2) + '" stroke="' + e.stroke + '" stroke-width="' + n(e.sw) + '"' + op + '/>');
      } else if (e.t === 'text' && e.s) {
        var f = FONTS[e.f];
        out.push('<text x="' + n(e.lx) + '" y="' + n(e.y) + '" font-family="' + f.fam + '" font-weight="' + f.w + '" font-style="' + f.s + '" font-size="' + n(e.size * PT) + '"' +
          ' style="font-kerning:none;white-space:pre" text-rendering="geometricPrecision"' + (e.ls ? ' letter-spacing="' + n(e.ls * e.size * PT) + '"' : '') + ' fill="' + e.fill + '"' + op + '>' + esc(e.s) + '</text>');
      } else if (e.t === 'qr' && e.q) {
        var q = e.q.n, pad = e.pad == null ? 1.2 : e.pad, m = (e.size - 2 * pad) / q;
        out.push('<rect x="' + n(e.x) + '" y="' + n(e.y) + '" width="' + n(e.size) + '" height="' + n(e.size) + '" rx="' + n(e.r || 0) + '" fill="' + (e.bg || '#fff') + '"/>');
        var d = [];
        for (var r = 0; r < q; r++) for (var c = 0; c < q; c++) if (e.q.get(r, c)) {
          var run = 1; while (c + run < q && e.q.get(r, c + run)) run++;
          d.push('M' + n(e.x + pad + c * m) + ' ' + n(e.y + pad + r * m) + 'h' + n(run * m + 0.01) + 'v' + n(m + 0.01) + 'h' + (-n(run * m + 0.01)) + 'z');
          c += run - 1;
        }
        out.push('<path d="' + d.join('') + '" fill="' + (e.fg || '#000') + '"/>');
      } else if (e.t === 'image' && e.src) {
        out.push('<image href="' + e.src + '" x="' + n(e.x) + '" y="' + n(e.y) + '" width="' + n(e.w) + '" height="' + n(e.h) + '" preserveAspectRatio="xMidYMid meet"/>');
      }
    });
    out.push('</g></g>');
    if (opt.guides) {
      out.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="none" stroke="rgba(255,214,10,.9)" stroke-width="0.25" stroke-dasharray="1 1"/>');
      var s = opt.safe || 3.5;
      out.push('<rect x="' + s + '" y="' + s + '" width="' + (W - 2 * s) + '" height="' + (H - 2 * s) + '" fill="none" stroke="rgba(143,227,192,.8)" stroke-width="0.18" stroke-dasharray="0.6 0.9"/>');
    }
    out.push('</svg>');
    return out.join('');
  }

  // ---------- Canvas (PNG) ----------
  function loadImg(src) {
    return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; });
  }
  function toCanvas(els, W, H, opt) {
    opt = opt || {};
    var dpi = opt.dpi || 300, b = opt.bleed || 0, k = dpi / 25.4;
    var cw = Math.round((W + 2 * b) * k), ch = Math.round((H + 2 * b) * k);
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    var g = cv.getContext('2d');
    try { g.fontKerning = 'none'; } catch (e) {}
    g.save(); g.scale(k, k); g.translate(b, b);
    g.beginPath(); g.rect(-b, -b, W + 2 * b, H + 2 * b); g.clip();
    var imgs = resolve(els).filter(function (e) { return e.t === 'image' && e.src; });
    return Promise.all(imgs.map(function (e) { return loadImg(e.src).then(function (i) { e._img = i; }); })).then(function () {
      var rs = resolve(els);
      rs.forEach(function (e, idx) {
        g.save();
        g.globalAlpha = e.opacity != null ? e.opacity : 1;
        if (e.t === 'rect') {
          g.beginPath();
          if (e.r && g.roundRect) g.roundRect(e.x, e.y, e.w, e.h, e.r); else g.rect(e.x, e.y, e.w, e.h);
          if (e.fill && e.fill !== 'none') { g.fillStyle = e.fill; g.fill(); }
          if (e.stroke) { g.strokeStyle = e.stroke; g.lineWidth = e.sw; g.stroke(); }
        } else if (e.t === 'circle') {
          g.beginPath(); g.arc(e.cx, e.cy, e.r, 0, Math.PI * 2);
          if (e.fill && e.fill !== 'none') { g.fillStyle = e.fill; g.fill(); }
          if (e.stroke) { g.strokeStyle = e.stroke; g.lineWidth = e.sw; g.stroke(); }
        } else if (e.t === 'line') {
          g.beginPath(); g.moveTo(e.x1, e.y1); g.lineTo(e.x2, e.y2); g.strokeStyle = e.stroke; g.lineWidth = e.sw; g.stroke();
        } else if (e.t === 'text' && e.s) {
          var px = e.size * PT; // mm, canvas is in mm units
          g.font = cssFont(e.f, px);
          g.fillStyle = e.fill; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
          if (e.ls) {
            var x = e.lx, chars = Array.from(e.s);
            chars.forEach(function (chr) { g.fillText(chr, x, e.y); x += g.measureText(chr).width + e.ls * px; });
          } else g.fillText(e.s, e.lx, e.y);
        } else if (e.t === 'qr' && e.q) {
          var n = e.q.n, pad = e.pad == null ? 1.2 : e.pad, m = (e.size - 2 * pad) / n;
          g.beginPath();
          if (e.r && g.roundRect) g.roundRect(e.x, e.y, e.size, e.size, e.r); else g.rect(e.x, e.y, e.size, e.size);
          g.fillStyle = e.bg || '#fff'; g.fill();
          g.fillStyle = e.fg || '#000';
          for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (e.q.get(r, c)) g.fillRect(e.x + pad + c * m, e.y + pad + r * m, m + 0.01, m + 0.01);
        } else if (e.t === 'image') {
          var im = imgs.filter(function (z) { return z.src === e.src; })[0];
          im = im && im._img;
          if (im) {
            var s = Math.min(e.w / im.naturalWidth, e.h / im.naturalHeight), iw = im.naturalWidth * s, ih = im.naturalHeight * s;
            g.drawImage(im, e.x + (e.w - iw) / 2, e.y + (e.h - ih) / 2, iw, ih);
          }
        }
        g.restore();
      });
      g.restore();
      return cv;
    });
  }

  // ---------- PDF (jsPDF) ----------
  var ttfCache = {};
  function fetchTTF(key) {
    if (ttfCache[key]) return ttfCache[key];
    ttfCache[key] = fetch(FONT_DIR + FONTS[key].file + '.ttf').then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      var bytes = new Uint8Array(buf), bin = '';
      for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    });
    return ttfCache[key];
  }
  function registerPdfFonts(doc, keys) {
    return Promise.all(keys.map(function (k) {
      return fetchTTF(k).then(function (b64) {
        var name = FONTS[k].file + '.ttf';
        doc.addFileToVFS(name, b64);
        doc.addFont(name, 'bcm-' + k, 'normal');
      });
    }));
  }
  function fontKeysOf(elsList) {
    var set = {};
    elsList.forEach(function (els) { els.forEach(function (e) { if (e.t === 'text' && e.s) set[e.f] = 1; }); });
    return Object.keys(set);
  }
  function pdfColor(doc, hex, kind) { var c = hexToRgb(hex); if (kind === 'fill') doc.setFillColor(c[0], c[1], c[2]); else if (kind === 'draw') doc.setDrawColor(c[0], c[1], c[2]); else doc.setTextColor(c[0], c[1], c[2]); }
  function withAlpha(doc, a, fn) {
    if (a == null || a >= 1 || !doc.GState) { fn(); return; }
    doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: a, 'stroke-opacity': a })); fn(); doc.restoreGraphicsState();
  }
  // draws a card face with its top-left trim corner at (ox, oy); clips to the bleed box
  function drawPdf(doc, els, W, H, ox, oy, bleed, imgCache) {
    var b = bleed || 0;
    doc.saveGraphicsState();
    doc.rect(ox - b, oy - b, W + 2 * b, H + 2 * b, null);
    doc.clip(); doc.discardPath();
    resolve(els).forEach(function (e) {
      withAlpha(doc, e.opacity, function () {
        if (e.t === 'rect') {
          var style = (e.fill && e.fill !== 'none' ? 'F' : '') + (e.stroke ? 'D' : '');
          if (!style) return;
          if (e.fill && e.fill !== 'none') pdfColor(doc, e.fill, 'fill');
          if (e.stroke) { pdfColor(doc, e.stroke, 'draw'); doc.setLineWidth(e.sw); }
          if (e.r) doc.roundedRect(ox + e.x, oy + e.y, e.w, e.h, e.r, e.r, style === 'FD' ? 'FD' : style);
          else doc.rect(ox + e.x, oy + e.y, e.w, e.h, style === 'FD' ? 'FD' : style);
        } else if (e.t === 'circle') {
          var st = (e.fill && e.fill !== 'none' ? 'F' : '') + (e.stroke ? 'D' : '');
          if (e.fill && e.fill !== 'none') pdfColor(doc, e.fill, 'fill');
          if (e.stroke) { pdfColor(doc, e.stroke, 'draw'); doc.setLineWidth(e.sw); }
          doc.circle(ox + e.cx, oy + e.cy, e.r, st || 'F');
        } else if (e.t === 'line') {
          pdfColor(doc, e.stroke, 'draw'); doc.setLineWidth(e.sw); doc.line(ox + e.x1, oy + e.y1, ox + e.x2, oy + e.y2);
        } else if (e.t === 'text' && e.s) {
          doc.setFont('bcm-' + e.f, 'normal'); doc.setFontSize(e.size); pdfColor(doc, e.fill, 'text');
          doc.text(e.s, ox + e.lx, oy + e.y, { baseline: 'alphabetic', charSpace: (e.ls || 0) * e.size * PT });
        } else if (e.t === 'qr' && e.q) {
          var n = e.q.n, pad = e.pad == null ? 1.2 : e.pad, m = (e.size - 2 * pad) / n;
          pdfColor(doc, e.bg || '#ffffff', 'fill');
          if (e.r) doc.roundedRect(ox + e.x, oy + e.y, e.size, e.size, e.r, e.r, 'F'); else doc.rect(ox + e.x, oy + e.y, e.size, e.size, 'F');
          pdfColor(doc, e.fg || '#000000', 'fill');
          for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (e.q.get(r, c)) {
            var run = 1; while (c + run < n && e.q.get(r, c + run)) run++;
            doc.rect(ox + e.x + pad + c * m, oy + e.y + pad + r * m, run * m + 0.01, m + 0.01, 'F');
            c += run - 1;
          }
        } else if (e.t === 'image' && e.src && imgCache[e.src]) {
          var im = imgCache[e.src];
          var s = Math.min(e.w / im.w, e.h / im.h), iw = im.w * s, ih = im.h * s;
          doc.addImage(im.data, 'PNG', ox + e.x + (e.w - iw) / 2, oy + e.y + (e.h - ih) / 2, iw, ih, undefined, 'FAST');
        }
      });
    });
    doc.restoreGraphicsState();
  }
  // Images for the PDF are re-encoded as PNG (keeps transparency, handles SVG logos)
  function pdfImages(elsList) {
    var srcs = {};
    elsList.forEach(function (els) { els.forEach(function (e) { if (e.t === 'image' && e.src) srcs[e.src] = 1; }); });
    var cache = {};
    return Promise.all(Object.keys(srcs).map(function (src) {
      return loadImg(src).then(function (im) {
        if (!im) return;
        // SVG logos are rasterised at full size so print stays sharp; bitmaps are never upscaled
        var max = 1200, big = Math.max(im.naturalWidth || max, im.naturalHeight || max), s = /^data:image\/svg/.test(src) ? max / big : Math.min(1, max / big);
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round((im.naturalWidth || max) * s)); cv.height = Math.max(1, Math.round((im.naturalHeight || max) * s));
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        cache[src] = { data: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
      });
    })).then(function () { return cache; });
  }
  function cropMarks(doc, x, y, W, H, gap, len) {
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.15);
    [[x, y], [x + W, y], [x, y + H], [x + W, y + H]].forEach(function (p, i) {
      var sx = i % 2 === 0 ? -1 : 1, sy = i < 2 ? -1 : 1;
      doc.line(p[0] + sx * gap, p[1], p[0] + sx * (gap + len), p[1]);
      doc.line(p[0], p[1] + sy * gap, p[0], p[1] + sy * (gap + len));
    });
  }

  root.BCM = {
    PT: PT, FONTS: FONTS, loadFont: loadFont, loadAllFonts: loadAllFonts, measure: measure,
    mix: mix, onColor: onColor, contrast: contrast, lum: lum,
    makeQR: makeQR, resolve: resolve, toSVG: toSVG, toCanvas: toCanvas,
    registerPdfFonts: registerPdfFonts, fontKeysOf: fontKeysOf, drawPdf: drawPdf, pdfImages: pdfImages, cropMarks: cropMarks
  };
})(window);
