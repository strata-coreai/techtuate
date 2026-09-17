(() => {
  'use strict';
  const E = window.ScanEngine;
  const $ = (s) => document.querySelector(s);

  const MAX_SRC = 4000;          // long side cap when loading a photo
  const PREVIEW_LONG = 1400;     // preview render size
  const MAX_OUT_PIXELS = 16e6;   // keep exports inside mobile canvas limits
  const SHAPES = { auto: null, a4: 297 / 210, letter: 11 / 8.5, id: 85.6 / 53.98, passport: 125 / 88, square: 1 };
  const PAGE_INCHES = { a4: 297 / 25.4, letter: 11 };

  const state = {
    name: 'document', src: null, srcCanvas: null, corners: null,
    shape: 'auto', look: 'color', sharp: 40, scale: 1, turns: 0,
    autoFingers: true, strokes: [], brush: false, brushSize: 4,
    preview: null // { key, page, fingers }
  };

  /* ---------- loading ---------- */

  const drop = $('#drop'), fileIn = $('#file'), camIn = $('#camera'), dropErr = $('#drop-error');

  function showStage(id) {
    for (const s of ['stage-drop', 'stage-crop', 'stage-result']) $('#' + s).hidden = s !== id;
    $('#tool').scrollIntoView({ block: 'nearest' });
  }

  function fail(msg) { dropErr.textContent = msg; dropErr.hidden = false; showStage('stage-drop'); }

  async function loadFile(file) {
    if (!file) return;
    dropErr.hidden = true;
    if (file.type && !file.type.startsWith('image/')) return fail('That does not look like an image. Try a JPG or PNG photo.');
    state.name = (file.name || 'document').replace(/\.[^.]+$/, '') || 'document';
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = url;
      });
      const k = Math.min(1, MAX_SRC / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h);
      state.src = { width: w, height: h, data: d.data };
      state.srcCanvas = c;
      state.strokes = []; state.turns = 0; state.preview = null;
      autoDetect();
      showStage('stage-crop');
      layoutCrop();
    } catch (e) {
      fail('This browser could not open that image. Try a JPG or PNG (on iPhone, share the photo as JPG).');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  fileIn.addEventListener('change', () => { loadFile(fileIn.files[0]); fileIn.value = ''; });
  camIn.addEventListener('change', () => { loadFile(camIn.files[0]); camIn.value = ''; });
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('over')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });
  window.addEventListener('paste', (e) => {
    const item = [...(e.clipboardData ? e.clipboardData.items : [])].find(i => i.type.startsWith('image/'));
    if (item) loadFile(item.getAsFile());
  });

  /* ---------- corner editor ---------- */

  const cropCanvas = $('#crop-canvas'), cropWrap = $('#crop-wrap'), loupe = $('#loupe');
  let view = { scale: 1, cssW: 0, cssH: 0 };
  let dragIdx = -1;

  function autoDetect() {
    const r = E.detectCorners(state.src);
    state.corners = r.corners;
    $('#crop-hint').textContent = r.confident
      ? 'Found the page. Drag a yellow corner if it is off. Fingers inside the page get cleaned up next.'
      : 'Could not find clear page edges, so this is a starting guess. Drag each yellow corner onto the page corners.';
  }

  function layoutCrop() {
    if (!state.src) return;
    const pad = window.innerWidth <= 820 ? 24 : 40;
    const maxW = Math.max(200, cropWrap.clientWidth - pad);
    const maxH = Math.max(260, window.innerHeight * 0.72);
    const s = Math.min(maxW / state.src.width, maxH / state.src.height);
    view = { scale: s, cssW: Math.round(state.src.width * s), cssH: Math.round(state.src.height * s) };
    const dpr = window.devicePixelRatio || 1;
    cropCanvas.style.width = view.cssW + 'px';
    cropCanvas.style.height = view.cssH + 'px';
    cropCanvas.width = Math.round(view.cssW * dpr);
    cropCanvas.height = Math.round(view.cssH * dpr);
    drawCrop();
  }

  function drawCrop() {
    const ctx = cropCanvas.getContext('2d');
    const dpr = cropCanvas.width / view.cssW;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(state.srcCanvas, 0, 0, view.cssW, view.cssH);
    const q = state.corners.map(p => [p[0] * view.scale, p[1] * view.scale]);
    // dim what gets cut away
    ctx.beginPath();
    ctx.rect(0, 0, view.cssW, view.cssH);
    ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 3; i >= 1; i--) ctx.lineTo(q[i][0], q[i][1]);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill('evenodd');
    ctx.beginPath();
    q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath();
    ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffd60a'; ctx.stroke();
    q.forEach((p, i) => {
      const r = i === dragIdx ? 12 : 10;
      ctx.fillStyle = '#000'; ctx.fillRect(p[0] - r + 3, p[1] - r + 3, r * 2, r * 2);
      ctx.fillStyle = '#ffd60a'; ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
      ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeRect(p[0] - r, p[1] - r, r * 2, r * 2);
    });
  }

  function cropPoint(e) {
    const rect = cropCanvas.getBoundingClientRect();
    return [(e.clientX - rect.left), (e.clientY - rect.top)];
  }

  function drawLoupe(pt) {
    const [cx, cy] = pt;
    const size = 120, zoom = 3;
    loupe.hidden = false;
    const wrapRect = cropWrap.getBoundingClientRect(), canRect = cropCanvas.getBoundingClientRect();
    let lx = canRect.left - wrapRect.left + cx - size - 24;
    let ly = canRect.top - wrapRect.top + cy - size - 24;
    if (lx < 4) lx = canRect.left - wrapRect.left + cx + 24;
    if (ly < 4) ly = canRect.top - wrapRect.top + cy + 24;
    loupe.style.left = lx + 'px'; loupe.style.top = ly + 'px';
    const ctx = loupe.getContext('2d');
    const srcX = cx / view.scale, srcY = cy / view.scale;
    const half = (size / zoom) / view.scale / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, loupe.width, loupe.height);
    ctx.drawImage(state.srcCanvas, srcX - half, srcY - half, half * 2, half * 2, 0, 0, loupe.width, loupe.height);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    const m = loupe.width / 2;
    ctx.beginPath(); ctx.moveTo(m, m - 26); ctx.lineTo(m, m + 26); ctx.moveTo(m - 26, m); ctx.lineTo(m + 26, m); ctx.stroke();
    ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  cropCanvas.addEventListener('pointerdown', (e) => {
    const p = cropPoint(e);
    const reach = e.pointerType === 'touch' ? 40 : 26;
    let best = -1, bd = reach;
    state.corners.forEach((c, i) => {
      const d = Math.hypot(c[0] * view.scale - p[0], c[1] * view.scale - p[1]);
      if (d < bd) { bd = d; best = i; }
    });
    if (best < 0) return;
    dragIdx = best;
    cropCanvas.setPointerCapture(e.pointerId);
    drawCrop(); drawLoupe(p);
    e.preventDefault();
  });
  cropCanvas.addEventListener('pointermove', (e) => {
    const p = cropPoint(e);
    if (dragIdx < 0) {
      const near = state.corners.some(c => Math.hypot(c[0] * view.scale - p[0], c[1] * view.scale - p[1]) < 26);
      cropCanvas.style.cursor = near ? 'grab' : 'default';
      return;
    }
    const x = Math.min(view.cssW, Math.max(0, p[0])), y = Math.min(view.cssH, Math.max(0, p[1]));
    state.corners[dragIdx] = [Math.min(state.src.width - 1, x / view.scale), Math.min(state.src.height - 1, y / view.scale)];
    drawCrop(); drawLoupe([x, y]);
  });
  const endDrag = () => { if (dragIdx >= 0) { dragIdx = -1; loupe.hidden = true; drawCrop(); } };
  cropCanvas.addEventListener('pointerup', endDrag);
  cropCanvas.addEventListener('pointercancel', endDrag);

  $('#btn-detect').addEventListener('click', () => { autoDetect(); drawCrop(); });
  $('#btn-full').addEventListener('click', () => {
    const w = state.src.width - 1, h = state.src.height - 1;
    state.corners = [[0, 0], [w, 0], [w, h], [0, h]];
    drawCrop();
  });
  $('#shape').addEventListener('change', (e) => { state.shape = e.target.value; });
  $('#btn-scan').addEventListener('click', () => {
    if (!isUsableQuad(state.corners)) {
      $('#crop-hint').textContent = 'Those corners cross over each other. Put each yellow corner on its own page corner.';
      return;
    }
    state.preview = null;
    state.strokes = [];
    showStage('stage-result');
    render();
  });
  window.addEventListener('resize', () => {
    if (!$('#stage-crop').hidden) layoutCrop();
    if (!$('#stage-result').hidden) render();
  });

  // order corners clockwise from top-left so any drag order still flattens correctly
  function orderCorners(q) {
    const cx = q.reduce((a, p) => a + p[0], 0) / 4, cy = q.reduce((a, p) => a + p[1], 0) / 4;
    const s = [...q].sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
    let start = 0, bestSum = Infinity;
    s.forEach((p, i) => { if (p[0] + p[1] < bestSum) { bestSum = p[0] + p[1]; start = i; } });
    return [0, 1, 2, 3].map(i => s[(start + i) % 4]);
  }
  function isUsableQuad(q) {
    const o = orderCorners(q);
    let a = 0;
    for (let i = 0; i < 4; i++) { const p = o[i], n = o[(i + 1) % 4]; a += p[0] * n[1] - n[0] * p[1]; }
    return Math.abs(a) / 2 > 400;
  }

  /* ---------- result ---------- */

  const resCanvas = $('#result-canvas'), resWrap = $('#result-wrap'), busy = $('#busy');
  let renderTimer = 0, lastOut = null;

  function pageSize() {
    return E.outputSize(orderCorners(state.corners), SHAPES[state.shape]);
  }

  function getPreviewPage() {
    const q = orderCorners(state.corners);
    const key = JSON.stringify([q, state.shape]);
    if (state.preview && state.preview.key === key) return state.preview;
    const [w, h] = pageSize();
    const k = Math.min(1, PREVIEW_LONG / Math.max(w, h));
    const pw = Math.max(1, Math.round(w * k)), ph = Math.max(1, Math.round(h * k));
    const page = E.warp(state.src, q, pw, ph);
    const fingers = E.detectFingers(page);
    state.preview = { key, page, fingers };
    return state.preview;
  }

  function combinedMask(fingers, w, h) {
    const m = E.rasterStrokes(state.strokes, w, h);
    if (state.autoFingers && fingers) {
      const f = E.scaleMask(fingers.mask, fingers.w, fingers.h, w, h);
      for (let i = 0; i < m.length; i++) m[i] |= f[i];
    }
    return m;
  }

  function finish(page, mask, scaleTo) {
    let img = E.inpaint(page, mask);
    if (scaleTo) img = E.resize(img, scaleTo[0], scaleTo[1]);
    img = E.applyLook(img, state.look);
    img = E.sharpen(img, state.sharp / 100 * 1.2);
    return E.rotate(img, state.turns);
  }

  function render() {
    clearTimeout(renderTimer);
    busy.hidden = false;
    renderTimer = setTimeout(() => {
      const pv = getPreviewPage();
      const { width: w, height: h } = pv.page;
      const fingers = { mask: pv.fingers.mask, w, h };
      const out = finish(pv.page, combinedMask(fingers, w, h));
      lastOut = out;
      drawResult(out);
      const found = pv.fingers.pixels > 0;
      $('#finger-note').textContent = !state.autoFingers ? '' :
        found ? 'Found something at the edge and filled it in.' : 'No fingers found at the edges.';
      updateSizeNote();
      busy.hidden = true;
    }, 30);
  }

  function drawResult(img) {
    const pad = window.innerWidth <= 820 ? 24 : 40;
    const maxW = Math.max(200, resWrap.clientWidth - pad), maxH = Math.max(260, window.innerHeight * 0.75);
    const s = Math.min(1, maxW / img.width, maxH / img.height);
    resCanvas.width = img.width; resCanvas.height = img.height;
    resCanvas.style.width = Math.round(img.width * s) + 'px';
    resCanvas.style.height = Math.round(img.height * s) + 'px';
    resCanvas.getContext('2d').putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
  }

  function exportDims() {
    const [w, h] = pageSize();
    let sc = state.scale;
    if (w * h * sc * sc > MAX_OUT_PIXELS) sc = Math.sqrt(MAX_OUT_PIXELS / (w * h));
    return { w, h, sw: Math.round(w * sc), sh: Math.round(h * sc), capped: sc < state.scale };
  }

  function updateSizeNote() {
    const d = exportDims();
    const [a, b] = state.turns % 2 ? [d.sh, d.sw] : [d.sw, d.sh];
    $('#size-note').textContent = `${a} x ${b} px` + (d.capped ? ' (capped to keep the file manageable)' : '');
  }

  document.querySelectorAll('input[name="look"]').forEach(r => r.addEventListener('change', () => { state.look = r.value; render(); }));
  document.querySelectorAll('input[name="scale"]').forEach(r => r.addEventListener('change', () => { state.scale = +r.value; updateSizeNote(); }));
  $('#sharp').addEventListener('input', (e) => { state.sharp = +e.target.value; render(); });
  $('#rot-l').addEventListener('click', () => { state.turns = (state.turns + 3) % 4; render(); });
  $('#rot-r').addEventListener('click', () => { state.turns = (state.turns + 1) % 4; render(); });
  $('#auto-fingers').addEventListener('change', (e) => { state.autoFingers = e.target.checked; render(); });
  $('#btn-back').addEventListener('click', () => { showStage('stage-crop'); layoutCrop(); });
  $('#btn-new-1').addEventListener('click', () => { showStage('stage-drop'); fileIn.click(); });
  $('#btn-new-2').addEventListener('click', () => { showStage('stage-drop'); fileIn.click(); });

  /* ---------- paint to remove ---------- */

  const brushBtn = $('#btn-brush');
  brushBtn.addEventListener('click', () => {
    state.brush = !state.brush;
    brushBtn.setAttribute('aria-pressed', String(state.brush));
    brushBtn.textContent = state.brush ? 'Done painting' : 'Paint over anything else';
    $('#brush-tools').hidden = !state.brush;
    resCanvas.classList.toggle('painting', state.brush);
  });
  $('#brush-size').addEventListener('input', (e) => { state.brushSize = +e.target.value; });
  $('#btn-undo').addEventListener('click', () => { state.strokes.pop(); render(); });
  $('#btn-clear').addEventListener('click', () => { state.strokes = []; render(); });

  // preview pixel (after rotation) to normalized page coordinates (before rotation)
  function toPage(e) {
    const r = resCanvas.getBoundingClientRect();
    const a = (e.clientX - r.left) / r.width, b = (e.clientY - r.top) / r.height;
    switch (state.turns) {
      case 1: return [b, 1 - a];
      case 2: return [1 - a, 1 - b];
      case 3: return [1 - b, a];
      default: return [a, b];
    }
  }

  let stroke = null;
  resCanvas.addEventListener('pointerdown', (e) => {
    if (!state.brush) return;
    resCanvas.setPointerCapture(e.pointerId);
    stroke = { r: state.brushSize / 100 * 0.5, pts: [toPage(e)] };
    paintDot(e);
    e.preventDefault();
  });
  resCanvas.addEventListener('pointermove', (e) => {
    if (!stroke) return;
    stroke.pts.push(toPage(e));
    paintDot(e);
  });
  const endStroke = () => {
    if (!stroke) return;
    state.strokes.push(stroke);
    stroke = null;
    render();
  };
  resCanvas.addEventListener('pointerup', endStroke);
  resCanvas.addEventListener('pointercancel', endStroke);

  function paintDot(e) {
    const r = resCanvas.getBoundingClientRect();
    const k = resCanvas.width / r.width;
    const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
    const rad = stroke.r * Math.max(resCanvas.width, resCanvas.height);
    const ctx = resCanvas.getContext('2d');
    ctx.fillStyle = 'rgba(255,214,10,0.65)';
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  }

  /* ---------- download ---------- */

  $('#btn-download').addEventListener('click', async () => {
    const btn = $('#btn-download');
    btn.disabled = true; busy.hidden = false; busy.textContent = 'Building full size scan...';
    await new Promise(r => setTimeout(r, 40));
    try {
      const q = orderCorners(state.corners);
      const d = exportDims();
      const page = E.warp(state.src, q, d.w, d.h);
      const pv = getPreviewPage();
      const mask = combinedMask({ mask: pv.fingers.mask, w: pv.page.width, h: pv.page.height }, d.w, d.h);
      const scaleTo = d.sw !== d.w || d.sh !== d.h ? [d.sw, d.sh] : null;
      const out = finish(page, mask, scaleTo);
      const c = document.createElement('canvas');
      c.width = out.width; c.height = out.height;
      c.getContext('2d').putImageData(new ImageData(out.data, out.width, out.height), 0, 0);
      const fmt = $('#format').value;
      let blob;
      if (fmt === 'png') blob = await new Promise(r => c.toBlob(r, 'image/png'));
      else {
        const jpg = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
        if (fmt === 'jpg') blob = jpg;
        else {
          const bytes = new Uint8Array(await jpg.arrayBuffer());
          const inches = PAGE_INCHES[state.shape];
          const dpi = inches ? Math.max(out.width, out.height) / inches : 200;
          blob = new Blob([E.jpegPdf(bytes, out.width, out.height, dpi)], { type: 'application/pdf' });
        }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${state.name}-scan.${fmt}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (err) {
      busy.textContent = 'That was too big for this browser. Try 1x resolution.';
      setTimeout(() => { busy.hidden = true; busy.textContent = 'Working...'; }, 3500);
      btn.disabled = false;
      return;
    }
    busy.hidden = true; busy.textContent = 'Working...';
    btn.disabled = false;
  });

  // debug hook for automated tests
  window.__scan = { state, get lastOut() { return lastOut; }, loadFile };
})();
