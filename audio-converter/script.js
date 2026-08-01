/* ============================================================
   techtuate audio converter
   - drop / choose audio files (mp3, wav, m4a, aac, ogg, opus, flac)
   - decode with the Web Audio API, trim a selection, adjust
     channels / sample rate, re-encode to MP3 (lamejs) or WAV
   - everything runs in the browser; files are never uploaded
   ============================================================ */
(function () {
  'use strict';

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // lamejs is vendored as a global via lib/lamejs.min.js
  var LAME = window.lamejs;
  var MP3_RATES = { 8000: 1, 11025: 1, 12000: 1, 16000: 1, 22050: 1, 24000: 1, 32000: 1, 44100: 1, 48000: 1 };
  var MIN_GAP = 0.05; // seconds - smallest trimmable selection

  function $(id) { return document.getElementById(id); }
  function show(el, on) { if (el) el.hidden = !on; }

  var AC = window.AudioContext || window.webkitAudioContext;
  var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!AC || !OAC) {
    document.querySelector('main').insertAdjacentHTML('afterbegin',
      '<div class="callout yellow"><h4>Your browser can not do this.</h4><p>This tool needs the Web Audio API. Try a recent Chrome, Firefox, Edge or Safari.</p></div>');
  }
  var ctx = AC ? new AC() : null;

  var dropzone = $('dropzone');
  var fileInput = $('file-input');
  var controls = $('controls');
  var filesEl = $('files');
  var flash = $('copy-flash');
  var fmtSel = $('fmt');
  var bitrateWrap = $('bitrate-wrap');

  var files = [];       // list of file objects
  var nextId = 1;
  var playing = null;   // { source, id }
  var converting = false;

  // ---------- ingest ----------
  function ingest(fileList) {
    var arr = Array.prototype.slice.call(fileList || []);
    arr.forEach(function (file) {
      if (!file) return;
      var looksAudio = /^audio\//.test(file.type) || /\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|weba|webm)$/i.test(file.name);
      if (!looksAudio) { flashMsg(file.name + ' is not audio'); return; }
      addFile(file);
    });
    show(controls, files.length > 0);
  }

  function addFile(file) {
    var f = {
      id: nextId++, file: file, name: file.name,
      buffer: null, duration: 0, startSec: 0, endSec: 0,
      sizeStr: humanSize(file.size), els: {}, resultBlob: null, resultName: '', decoded: false
    };
    files.push(f);
    renderCard(f);
    decode(f);
  }

  function decode(f) {
    var reader = new FileReader();
    reader.onload = function () {
      ctx.decodeAudioData(reader.result.slice(0),
        function (buffer) {
          f.buffer = buffer;
          f.duration = buffer.duration;
          f.startSec = 0;
          f.endSec = buffer.duration;
          f.decoded = true;
          onDecoded(f);
        },
        function () { setStatus(f, 'could not decode this file', true); }
      );
    };
    reader.onerror = function () { setStatus(f, 'could not read this file', true); };
    reader.readAsArrayBuffer(f.file);
  }

  // ---------- card ----------
  function renderCard(f) {
    var card = document.createElement('div');
    card.className = 'ac-file';
    card.innerHTML =
      '<div class="ac-file-head">' +
        '<h3 class="ac-file-name"></h3>' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<span class="ac-file-meta"></span>' +
          '<button type="button" class="ac-file-remove" title="Remove">remove</button>' +
        '</div>' +
      '</div>' +
      '<div class="ac-wave-wrap">' +
        '<canvas class="ac-wave"></canvas>' +
        '<div class="ac-dim ac-dim-l"></div>' +
        '<div class="ac-dim ac-dim-r"></div>' +
        '<div class="ac-sel"></div>' +
        '<div class="ac-handle ac-h-start" role="slider" aria-label="Trim start" tabindex="0"></div>' +
        '<div class="ac-handle ac-h-end" role="slider" aria-label="Trim end" tabindex="0"></div>' +
      '</div>' +
      '<div class="ac-trim">' +
        '<button type="button" class="ac-play">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
          '<span class="ac-play-label">Play selection</span>' +
        '</button>' +
        '<span class="ac-time"><label>Start</label><input class="ac-in-start" type="text" inputmode="decimal" value="0:00.000" /></span>' +
        '<span class="ac-time"><label>End</label><input class="ac-in-end" type="text" inputmode="decimal" value="0:00.000" /></span>' +
        '<span class="ac-seldur"></span>' +
      '</div>' +
      '<div class="ac-file-foot">' +
        '<div class="ac-progress"><span></span></div>' +
        '<span class="ac-status">decoding...</span>' +
        '<a class="btn ac-dl" hidden download>Download</a>' +
      '</div>';

    var e = f.els = {
      card: card,
      name: card.querySelector('.ac-file-name'),
      meta: card.querySelector('.ac-file-meta'),
      remove: card.querySelector('.ac-file-remove'),
      waveWrap: card.querySelector('.ac-wave-wrap'),
      canvas: card.querySelector('.ac-wave'),
      dimL: card.querySelector('.ac-dim-l'),
      dimR: card.querySelector('.ac-dim-r'),
      sel: card.querySelector('.ac-sel'),
      hStart: card.querySelector('.ac-h-start'),
      hEnd: card.querySelector('.ac-h-end'),
      play: card.querySelector('.ac-play'),
      playLabel: card.querySelector('.ac-play-label'),
      inStart: card.querySelector('.ac-in-start'),
      inEnd: card.querySelector('.ac-in-end'),
      selDur: card.querySelector('.ac-seldur'),
      progBar: card.querySelector('.ac-progress > span'),
      status: card.querySelector('.ac-status'),
      dl: card.querySelector('.ac-dl')
    };
    e.name.textContent = f.name;
    e.meta.textContent = f.sizeStr;

    e.remove.addEventListener('click', function () { removeFile(f); });
    e.play.addEventListener('click', function () { togglePlay(f); });
    e.inStart.addEventListener('change', function () { onTimeInput(f, 'start'); });
    e.inEnd.addEventListener('change', function () { onTimeInput(f, 'end'); });
    bindHandle(f, e.hStart, 'start');
    bindHandle(f, e.hEnd, 'end');

    filesEl.appendChild(card);
  }

  function onDecoded(f) {
    var e = f.els;
    e.meta.textContent = f.sizeStr + ' · ' + fmtTime(f.duration) + ' · ' +
      f.buffer.numberOfChannels + 'ch · ' + f.buffer.sampleRate + ' Hz';
    setStatus(f, 'ready');
    drawWave(f);
    layout(f);
  }

  // ---------- waveform ----------
  function drawWave(f) {
    if (!f.decoded) return;
    var canvas = f.els.canvas;
    var cssW = f.els.waveWrap.clientWidth || 600;
    var cssH = 84;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.round(cssH * dpr);
    var g = canvas.getContext('2d');
    g.scale(dpr, dpr);
    g.clearRect(0, 0, cssW, cssH);

    var data = f.buffer.getChannelData(0);
    var step = Math.max(1, Math.floor(data.length / cssW));
    var mid = cssH / 2;
    g.fillStyle = '#0a0a0a';
    for (var x = 0; x < cssW; x++) {
      var start = x * step, end = Math.min(data.length, start + step), max = 0;
      for (var i = start; i < end; i++) { var a = Math.abs(data[i]); if (a > max) max = a; }
      var h = Math.max(1, max * (cssH - 6));
      g.fillRect(x, mid - h / 2, 1, h);
    }
  }

  // ---------- trim layout ----------
  function layout(f) {
    if (!f.decoded) return;
    var e = f.els, w = e.waveWrap.clientWidth, d = f.duration || 1;
    var xs = (f.startSec / d) * w, xe = (f.endSec / d) * w;
    e.sel.style.left = xs + 'px';
    e.sel.style.width = Math.max(0, xe - xs) + 'px';
    e.hStart.style.left = (xs - 8) + 'px';
    e.hEnd.style.left = (xe - 8) + 'px';
    e.dimL.style.left = '0px'; e.dimL.style.width = xs + 'px';
    e.dimR.style.left = xe + 'px'; e.dimR.style.width = Math.max(0, w - xe) + 'px';
    e.selDur.textContent = 'selection ' + fmtTime(f.endSec - f.startSec);
    if (document.activeElement !== e.inStart) e.inStart.value = fmtTime(f.startSec);
    if (document.activeElement !== e.inEnd) e.inEnd.value = fmtTime(f.endSec);
  }

  function bindHandle(f, handle, which) {
    handle.addEventListener('pointerdown', function (ev) {
      if (!f.decoded) return;
      ev.preventDefault();
      handle.setPointerCapture(ev.pointerId);
      var rect = f.els.waveWrap.getBoundingClientRect();
      function move(e2) {
        var px = e2.clientX - rect.left;
        var t = clamp((px / rect.width) * f.duration, 0, f.duration);
        if (which === 'start') f.startSec = Math.min(t, f.endSec - MIN_GAP);
        else f.endSec = Math.max(t, f.startSec + MIN_GAP);
        f.startSec = clamp(f.startSec, 0, f.duration);
        f.endSec = clamp(f.endSec, 0, f.duration);
        layout(f);
        invalidateResult(f);
      }
      function up(e3) {
        handle.releasePointerCapture(ev.pointerId);
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
      }
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
    // keyboard nudge
    handle.addEventListener('keydown', function (ev) {
      if (!f.decoded) return;
      var d = ev.shiftKey ? 1 : 0.1, moved = true;
      if (ev.key === 'ArrowLeft') { if (which === 'start') f.startSec = clamp(f.startSec - d, 0, f.endSec - MIN_GAP); else f.endSec = clamp(f.endSec - d, f.startSec + MIN_GAP, f.duration); }
      else if (ev.key === 'ArrowRight') { if (which === 'start') f.startSec = clamp(f.startSec + d, 0, f.endSec - MIN_GAP); else f.endSec = clamp(f.endSec + d, f.startSec + MIN_GAP, f.duration); }
      else moved = false;
      if (moved) { ev.preventDefault(); layout(f); invalidateResult(f); }
    });
  }

  function onTimeInput(f, which) {
    if (!f.decoded) return;
    var e = f.els;
    var v = parseTime(which === 'start' ? e.inStart.value : e.inEnd.value);
    if (v === null) { layout(f); return; }
    if (which === 'start') f.startSec = clamp(v, 0, f.endSec - MIN_GAP);
    else f.endSec = clamp(v, f.startSec + MIN_GAP, f.duration);
    layout(f);
    invalidateResult(f);
  }

  // ---------- playback ----------
  function togglePlay(f) {
    if (!f.decoded) return;
    if (playing && playing.id === f.id) { stopPlayback(); return; }
    stopPlayback();
    if (ctx.state === 'suspended') ctx.resume();
    var s = ctx.createBufferSource();
    s.buffer = f.buffer;
    s.connect(ctx.destination);
    var dur = Math.max(0.02, f.endSec - f.startSec);
    s.start(0, f.startSec, dur);
    playing = { source: s, id: f.id };
    setPlayLabel(f, true);
    s.onended = function () { if (playing && playing.id === f.id) { playing = null; setPlayLabel(f, false); } };
  }
  function stopPlayback() {
    if (!playing) return;
    var pf = fileById(playing.id);
    try { playing.source.stop(); } catch (e) {}
    if (pf) setPlayLabel(pf, false);
    playing = null;
  }
  function setPlayLabel(f, on) { f.els.playLabel.textContent = on ? 'Stop' : 'Play selection'; }

  // ---------- convert ----------
  fmtSel.addEventListener('change', function () {
    bitrateWrap.classList.toggle('hidden', fmtSel.value !== 'mp3');
  });

  $('btn-convert-all').addEventListener('click', function () { convertAll(); });
  $('btn-clear').addEventListener('click', function () {
    stopPlayback();
    files.slice().forEach(function (f) { removeFile(f); });
  });
  $('btn-upload').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () { ingest(fileInput.files); fileInput.value = ''; });

  function currentOpts() {
    return {
      format: fmtSel.value,
      bitrate: parseInt($('bitrate').value, 10) || 192,
      rate: $('rate').value,
      channels: $('channels').value
    };
  }

  function convertAll() {
    if (converting) return;
    var ready = files.filter(function (f) { return f.decoded; });
    if (!ready.length) { flashMsg('nothing to convert yet'); return; }
    converting = true;
    var btn = $('btn-convert-all');
    btn.disabled = true; btn.textContent = 'Converting...';
    var opts = currentOpts();
    var i = 0;
    function next() {
      if (i >= ready.length) {
        converting = false; btn.disabled = false; btn.textContent = 'Convert all';
        flashMsg('done - ' + ready.length + ' file' + (ready.length > 1 ? 's' : '') + ' ready');
        return;
      }
      var f = ready[i++];
      convertOne(f, opts).then(next, function (err) {
        setStatus(f, (err && err.message) || 'convert failed', true);
        next();
      });
    }
    next();
  }

  function convertOne(f, opts) {
    setStatus(f, 'converting...');
    setProgress(f, 0);
    f.els.dl.hidden = true;
    return processFile(f, opts).then(function (res) {
      var base = f.name.replace(/\.[^.]+$/, '');
      var name = base + '-techtuate.' + res.ext;
      f.resultBlob = res.blob; f.resultName = name;
      var url = URL.createObjectURL(res.blob);
      f.els.dl.href = url;
      f.els.dl.setAttribute('download', name);
      f.els.dl.hidden = false;
      setProgress(f, 1);
      setStatus(f, res.ext.toUpperCase() + ' · ' + humanSize(res.blob.size));
    });
  }

  // ---------- processing pipeline ----------
  function processFile(f, opts) {
    return new Promise(function (resolve, reject) {
      try {
        var src = f.buffer, sr = src.sampleRate;
        var startS = Math.floor(clamp(f.startSec, 0, f.duration) * sr);
        var endS = Math.floor(clamp(f.endSec, 0, f.duration) * sr);
        var len = Math.max(1, endS - startS);

        // 1. trim source channels
        var chans = [];
        for (var c = 0; c < src.numberOfChannels; c++) {
          chans.push(src.getChannelData(c).subarray(startS, startS + len));
        }
        // 2. channel remap
        var targetCh = opts.channels === 'keep' ? src.numberOfChannels : parseInt(opts.channels, 10);
        chans = remapChannels(chans, targetCh, len);
        // 3. target rate
        var targetRate = opts.rate === 'keep' ? sr : parseInt(opts.rate, 10);
        if (opts.format === 'mp3' && !MP3_RATES[targetRate]) targetRate = 44100;

        var afterResample = function (outChans, outRate) {
          // mp3 supports 1-2 channels only
          if (opts.format === 'mp3' && outChans.length > 2) outChans = outChans.slice(0, 2);
          if (opts.format === 'wav') {
            resolve({ blob: encodeWav(outChans, outRate), ext: 'wav' });
          } else {
            encodeMp3(outChans, outRate, opts.bitrate, function (p) { setProgress(f, p); })
              .then(function (blob) { resolve({ blob: blob, ext: 'mp3' }); }, reject);
          }
        };

        if (targetRate !== sr) {
          resample(chans, sr, targetRate).then(function (r) { afterResample(r.chans, targetRate); }, reject);
        } else {
          afterResample(chans, sr);
        }
      } catch (err) { reject(err); }
    });
  }

  function remapChannels(chans, target, len) {
    var srcN = chans.length;
    if (target === srcN) return chans;
    var i, out;
    if (target === 1) {
      out = new Float32Array(len);
      for (i = 0; i < len; i++) {
        var sum = 0;
        for (var c = 0; c < srcN; c++) sum += chans[c][i];
        out[i] = sum / srcN;
      }
      return [out];
    }
    // target === 2
    var l = chans[0];
    var r = chans[1] || chans[0];
    // return copies so downstream (encoders) get clean arrays
    return [Float32Array.from(l), Float32Array.from(r)];
  }

  function resample(chans, srcRate, dstRate) {
    return new Promise(function (resolve, reject) {
      try {
        var numCh = chans.length, len = chans[0].length;
        var outLen = Math.max(1, Math.round(len * dstRate / srcRate));
        var octx = new OAC(numCh, outLen, dstRate);
        var srcBuf = octx.createBuffer(numCh, len, srcRate);
        for (var c = 0; c < numCh; c++) srcBuf.getChannelData(c).set(chans[c]);
        var node = octx.createBufferSource();
        node.buffer = srcBuf;
        node.connect(octx.destination);
        node.start();
        var done = function (rendered) {
          var out = [];
          for (var k = 0; k < numCh; k++) out.push(rendered.getChannelData(k));
          resolve({ chans: out, length: rendered.length });
        };
        var p = octx.startRendering();
        if (p && p.then) p.then(done, reject);
        else octx.oncomplete = function (ev) { done(ev.renderedBuffer); };
      } catch (err) { reject(err); }
    });
  }

  // ---------- encoders ----------
  function encodeWav(chans, rate) {
    var numCh = chans.length, len = chans[0].length;
    var blockAlign = numCh * 2;
    var dataLen = len * blockAlign;
    var buffer = new ArrayBuffer(44 + dataLen);
    var view = new DataView(buffer);
    writeStr(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLen, true);
    writeStr(view, 8, 'WAVE');
    writeStr(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);            // PCM
    view.setUint16(22, numCh, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);           // bits per sample
    writeStr(view, 36, 'data');
    view.setUint32(40, dataLen, true);
    var off = 44;
    for (var i = 0; i < len; i++) {
      for (var c = 0; c < numCh; c++) {
        var s = chans[c][i];
        s = s < -1 ? -1 : s > 1 ? 1 : s;
        view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        off += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  function floatToInt16(f) {
    var out = new Int16Array(f.length);
    for (var i = 0; i < f.length; i++) {
      var s = f[i]; s = s < -1 ? -1 : s > 1 ? 1 : s;
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  }

  function encodeMp3(chans, rate, kbps, onProgress) {
    return new Promise(function (resolve, reject) {
      try {
        if (!LAME || !LAME.Mp3Encoder) { reject(new Error('mp3 encoder missing')); return; }
        var numCh = chans.length;
        var enc = new LAME.Mp3Encoder(numCh, rate, kbps);
        var len = chans[0].length;
        var left = floatToInt16(chans[0]);
        var right = numCh > 1 ? floatToInt16(chans[1]) : null;
        var block = 1152;
        var data = [];
        var i = 0;
        function step() {
          var count = 0;
          for (; i < len && count < 50; i += block, count++) {
            var ls = left.subarray(i, i + block);
            var chunk = numCh > 1 ? enc.encodeBuffer(ls, right.subarray(i, i + block)) : enc.encodeBuffer(ls);
            if (chunk.length > 0) data.push(new Uint8Array(chunk));
          }
          if (onProgress) onProgress(Math.min(0.99, i / len));
          if (i < len) { setTimeout(step, 0); }
          else {
            var end = enc.flush();
            if (end.length > 0) data.push(new Uint8Array(end));
            if (onProgress) onProgress(1);
            resolve(new Blob(data, { type: 'audio/mpeg' }));
          }
        }
        step();
      } catch (err) { reject(err); }
    });
  }

  // ---------- helpers ----------
  function removeFile(f) {
    if (playing && playing.id === f.id) stopPlayback();
    var idx = files.indexOf(f);
    if (idx >= 0) files.splice(idx, 1);
    if (f.els.dl && f.els.dl.href) { try { URL.revokeObjectURL(f.els.dl.href); } catch (e) {} }
    if (f.els.card && f.els.card.parentNode) f.els.card.parentNode.removeChild(f.els.card);
    show(controls, files.length > 0);
  }

  function invalidateResult(f) {
    if (!f.resultBlob) return;
    f.resultBlob = null;
    f.els.dl.hidden = true;
    if (f.els.dl.href) { try { URL.revokeObjectURL(f.els.dl.href); } catch (e) {} }
    setProgress(f, 0);
    setStatus(f, 'ready');
  }

  function setStatus(f, msg, isErr) {
    if (!f.els.status) return;
    f.els.status.textContent = msg;
    f.els.status.classList.toggle('err', !!isErr);
  }
  function setProgress(f, p) { if (f.els.progBar) f.els.progBar.style.width = Math.round(p * 100) + '%'; }

  function fileById(id) { for (var i = 0; i < files.length; i++) if (files[i].id === id) return files[i]; return null; }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function writeStr(view, off, str) { for (var i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); }

  function fmtTime(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    var ms = Math.round((t - Math.floor(t)) * 1000);
    if (ms === 1000) { ms = 0; s += 1; }
    return m + ':' + pad2(s) + '.' + pad3(ms);
  }
  function parseTime(str) {
    str = String(str || '').trim();
    if (!str) return null;
    var sec;
    if (str.indexOf(':') >= 0) {
      var p = str.split(':');
      sec = (parseFloat(p[0]) || 0) * 60 + (parseFloat(p[1]) || 0);
    } else sec = parseFloat(str);
    return isFinite(sec) ? sec : null;
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function pad3(n) { return n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n; }
  function humanSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function flashMsg(msg) {
    if (!flash) return;
    flash.textContent = msg;
    flash.classList.add('show');
    setTimeout(function () { flash.classList.remove('show'); }, 1600);
  }

  // ---------- drag & drop ----------
  ['dragenter', 'dragover'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  dropzone.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files) ingest(e.dataTransfer.files);
  });
  dropzone.addEventListener('click', function (e) {
    if (e.target.closest('button')) return;
    fileInput.click();
  });
  dropzone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });

  // ---------- redraw on resize ----------
  var rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      files.forEach(function (f) { if (f.decoded) { drawWave(f); layout(f); } });
    }, 120);
  });

})();
