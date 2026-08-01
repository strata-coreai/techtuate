/* ============================================================
   techtuate color palette extractor
   - drop / upload / paste an image
   - draw to an HTML5 canvas, read pixel data
   - median-cut quantization -> N dominant colors (sorted by coverage)
   - click a swatch to copy hex; copy the whole palette as a list or CSS
   Everything runs in your browser. The image is never uploaded.
   ============================================================ */
(function () {
  'use strict';

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  var SAMPLE_EDGE = 220;   // downscale longest edge before sampling (speed)

  function $(id) { return document.getElementById(id); }
  function show(el, on) { if (el) el.hidden = !on; }

  var dropzone = $('dropzone');
  var fileInput = $('file-input');
  var result = $('result');
  var preview = $('preview');
  var paletteEl = $('palette');
  var countSel = $('count');
  var flash = $('copy-flash');

  var lastPixels = null;   // cached sampled pixels so changing the count is instant
  var lastColors = [];

  // ---------- load an image file ----------
  function ingestFile(file) {
    if (!file || !/^image\//.test(file.type)) { flashMsg('that is not an image'); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      preview.src = url;              // show the original (revoked later by browser on unload)
      lastPixels = samplePixels(img);
      render();
      show(result, true);
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    img.onerror = function () { URL.revokeObjectURL(url); flashMsg('could not read that image'); };
    img.src = url;
  }

  // ---------- sample pixels from a downscaled canvas ----------
  function samplePixels(img) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = Math.min(1, SAMPLE_EDGE / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, cw, ch);
    var data = ctx.getImageData(0, 0, cw, ch).data;
    var pixels = [];
    for (var i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 125) continue;   // skip mostly-transparent pixels
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    return pixels;
  }

  // ---------- frequency quantization with perceptual dedup ----------
  // Bin pixels into a coarse RGB histogram (32 levels/channel), then greedily
  // keep the most frequent bins, merging any bin that is too close (in RGB) to
  // one already kept. This gives clean, distinct dominant colors on both photos
  // and flat graphics/logos, sorted by how much of the image they cover.
  var SHIFT = 3;          // 256 >> 3 = 32 levels per channel
  var MIN_DIST2 = 46 * 46; // squared RGB distance below which two colors merge

  function quantize(pixels, count) {
    if (!pixels.length) return [];
    var map = Object.create(null);
    for (var i = 0; i < pixels.length; i++) {
      var p = pixels[i];
      var key = ((p[0] >> SHIFT) << 10) | ((p[1] >> SHIFT) << 5) | (p[2] >> SHIFT);
      var b = map[key];
      if (b) { b.r += p[0]; b.g += p[1]; b.b += p[2]; b.n++; }
      else map[key] = { r: p[0], g: p[1], b: p[2], n: 1 };
    }
    var bins = [];
    for (var k in map) {
      var m = map[k];
      bins.push({ r: m.r / m.n, g: m.g / m.n, b: m.b / m.n, n: m.n });
    }
    bins.sort(function (a, b) { return b.n - a.n; });

    var chosen = [];
    for (var j = 0; j < bins.length; j++) {
      var bin = bins[j], merged = false;
      for (var c = 0; c < chosen.length; c++) {
        var dr = chosen[c].r - bin.r, dg = chosen[c].g - bin.g, db = chosen[c].b - bin.b;
        if (dr * dr + dg * dg + db * db < MIN_DIST2) {
          var tot = chosen[c].n + bin.n;
          chosen[c].r = (chosen[c].r * chosen[c].n + bin.r * bin.n) / tot;
          chosen[c].g = (chosen[c].g * chosen[c].n + bin.g * bin.n) / tot;
          chosen[c].b = (chosen[c].b * chosen[c].n + bin.b * bin.n) / tot;
          chosen[c].n = tot; merged = true; break;
        }
      }
      if (!merged) chosen.push({ r: bin.r, g: bin.g, b: bin.b, n: bin.n });
    }
    chosen.sort(function (a, b) { return b.n - a.n; });
    return chosen.slice(0, count).map(function (c) {
      return { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), size: c.n };
    });
  }

  // ---------- render ----------
  function render() {
    if (!lastPixels) return;
    var count = parseInt(countSel.value, 10) || 5;
    var colors = quantize(lastPixels, count);
    lastColors = colors;
    var total = lastPixels.length;   // % is share of the whole image

    paletteEl.innerHTML = '';
    colors.forEach(function (c) {
      var hex = toHex(c.r, c.g, c.b);
      var rgb = 'rgb(' + c.r + ', ' + c.g + ', ' + c.b + ')';
      var pct = total ? Math.round((c.size / total) * 100) : 0;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cp-swatch';
      btn.title = 'Copy ' + hex;

      var chip = document.createElement('span');
      chip.className = 'cp-chip';
      chip.style.background = hex;

      var vals = document.createElement('span');
      vals.className = 'cp-vals';
      var h = document.createElement('span'); h.className = 'cp-hex'; h.textContent = hex;
      var r = document.createElement('span'); r.className = 'cp-rgb'; r.textContent = rgb;
      vals.appendChild(h); vals.appendChild(r);

      var share = document.createElement('span');
      share.className = 'cp-share';
      var pctEl = document.createElement('span'); pctEl.className = 'cp-pct'; pctEl.textContent = pct + '%';
      var tag = document.createElement('span'); tag.className = 'cp-copy-tag'; tag.textContent = 'copy';
      share.appendChild(pctEl); share.appendChild(tag);

      btn.appendChild(chip); btn.appendChild(vals); btn.appendChild(share);
      btn.addEventListener('click', function () { copyText(hex, hex + ' copied ✳'); });
      paletteEl.appendChild(btn);
    });
  }

  // ---------- helpers ----------
  function toHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      var s = v.toString(16); return s.length === 1 ? '0' + s : s;
    }).join('').toUpperCase();
  }

  function copyText(text, msg) {
    function done() { flashMsg(msg || 'copied ✳'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { window.prompt('Copy:', text); });
    } else { window.prompt('Copy:', text); }
  }
  function flashMsg(msg) {
    if (!flash) return;
    flash.textContent = msg;
    flash.classList.add('show');
    setTimeout(function () { flash.classList.remove('show'); }, 1500);
  }

  // ---------- capture: upload ----------
  $('btn-upload').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) ingestFile(fileInput.files[0]);
    fileInput.value = '';
  });
  dropzone.addEventListener('click', function (e) {
    if (e.target.closest('button')) return;
    fileInput.click();
  });
  dropzone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });

  // ---------- capture: drag/drop ----------
  ['dragenter', 'dragover'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  dropzone.addEventListener('drop', function (e) {
    var dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) ingestFile(dt.files[0]);
  });

  // ---------- capture: paste ----------
  $('btn-paste').addEventListener('click', function () { flashMsg('press Ctrl/Cmd + V to paste'); });
  window.addEventListener('paste', function (e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image') === 0) {
        var f = items[i].getAsFile();
        if (f) { ingestFile(f); e.preventDefault(); return; }
      }
    }
  });

  // ---------- controls ----------
  countSel.addEventListener('change', render);
  $('btn-copy-hex').addEventListener('click', function () {
    if (!lastColors.length) return;
    copyText(lastColors.map(function (c) { return toHex(c.r, c.g, c.b); }).join(', '), 'hex list copied ✳');
  });
  $('btn-copy-css').addEventListener('click', function () {
    if (!lastColors.length) return;
    var css = ':root {\n' + lastColors.map(function (c, i) {
      return '  --color-' + (i + 1) + ': ' + toHex(c.r, c.g, c.b) + ';';
    }).join('\n') + '\n}';
    copyText(css, 'CSS variables copied ✳');
  });
  $('btn-new').addEventListener('click', function () {
    lastPixels = null; lastColors = [];
    preview.removeAttribute('src');
    paletteEl.innerHTML = '';
    show(result, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
