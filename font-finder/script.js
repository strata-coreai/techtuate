/* ============================================================
   techtuate font finder
   - paste / drop / upload a screenshot
   - downscale in the browser, send it ONCE to /api/font (Gemini vision)
   - show the fonts found, with free equivalents previewed live via Google Fonts
   The screenshot leaves the device only for that one read. Nothing is stored.
   ============================================================ */
(function () {
  'use strict';

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  var MAX_EDGE = 1600;               // downscale longest edge before upload
  var MAX_URL = 5.5 * 1024 * 1024;   // keep the data URL comfortably under the function's 6MB cap

  function $(id) { return document.getElementById(id); }
  function show(el, on) { if (el) el.hidden = !on; }

  var dropzone = $('dropzone');
  var fileInput = $('file-input');
  var findSection = $('find-section');
  var preview = $('preview');
  var results = $('results');
  var fontList = $('font-list');
  var resultsNotes = $('results-notes');
  var status = $('find-status');
  var flash = $('copy-flash');

  var currentDataUrl = null;   // downscaled JPEG data URL to upload
  var loadedFonts = {};        // google font family -> true (avoid duplicate <link>s)
  var busy = false;

  // ---------- ingest a single image ----------
  function ingestFile(file) {
    if (!file || !/^image\//.test(file.type)) { flashMsg('that is not an image'); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      currentDataUrl = downscale(img);
      URL.revokeObjectURL(url);
      preview.src = currentDataUrl;
      show(findSection, true);
      show(results, false);
      setStatus('', false);
      findSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    img.onerror = function () { URL.revokeObjectURL(url); flashMsg('could not read that image'); };
    img.src = url;
  }

  function downscale(img) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
    var q = 0.85;
    var url = canvas.toDataURL('image/jpeg', q);
    while (url.length > MAX_URL && q > 0.4) {
      q -= 0.15;
      url = canvas.toDataURL('image/jpeg', q);
    }
    return url;
  }

  // ---------- call the function ----------
  function findFonts() {
    if (busy || !currentDataUrl) return;
    busy = true;
    setStatus('Reading the fonts...', false, true);
    $('btn-find').disabled = true;

    fetch('/api/font', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: currentDataUrl })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, body: j }; });
    }).then(function (res) {
      var b = res.body || {};
      if (!b.ok) {
        setStatus(b.error || 'Something went wrong. Please try again.', true);
        return;
      }
      var fonts = (b.data && b.data.fonts) || [];
      if (!fonts.length) {
        setStatus('No fonts could be read from this screenshot. Try a clearer or larger crop.', true);
        return;
      }
      renderResults(b.data);
      setStatus('', false);
      show(findSection, true);
    }).catch(function () {
      setStatus('Could not reach the font service. Please try again.', true);
    }).finally(function () {
      busy = false;
      $('btn-find').disabled = false;
    });
  }

  // ---------- render ----------
  function renderResults(data) {
    fontList.innerHTML = '';
    (data.fonts || []).forEach(function (f) { fontList.appendChild(fontCard(f)); });
    if (data.notes) { resultsNotes.textContent = data.notes; show(resultsNotes, true); }
    else show(resultsNotes, false);
    show(results, true);
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fontCard(f) {
    var card = document.createElement('div');
    card.className = 'ff-card';

    var head = document.createElement('div');
    head.className = 'ff-card-head';
    var role = el('span', 'ff-role', f.role || 'Font');
    var conf = el('span', 'ff-conf', confLabel(f.confidence));
    head.appendChild(role); head.appendChild(conf);
    card.appendChild(head);

    var name = document.createElement('h3');
    name.className = 'ff-name';
    if (f.identifiedName) name.textContent = f.identifiedName;
    else name.appendChild(el('span', 'ff-unknown', 'Name uncertain'));
    if (f.isLikelyCustom) name.appendChild(el('span', 'ff-custom', 'likely custom'));
    card.appendChild(name);

    if (f.family) card.appendChild(el('p', 'ff-family', f.family));

    if (f.sampleText) {
      var s = document.createElement('p');
      s.className = 'ff-sample';
      s.appendChild(el('span', '', 'seen as'));
      s.appendChild(document.createTextNode('“' + f.sampleText + '”'));
      card.appendChild(s);
    }

    var alts = (f.freeAlternatives || []).filter(Boolean);
    if (alts.length) {
      card.appendChild(el('p', 'ff-alts-label', 'Free equivalents'));
      var wrap = document.createElement('div');
      wrap.className = 'ff-alts';
      alts.forEach(function (a) { wrap.appendChild(altRow(a, f.sampleText)); });
      card.appendChild(wrap);
    }
    return card;
  }

  function altRow(a, sample) {
    var row = document.createElement('div');
    row.className = 'ff-alt';

    var top = document.createElement('div');
    top.className = 'ff-alt-top';
    top.appendChild(el('span', 'ff-alt-name', a.name || 'Font'));
    if (a.source) top.appendChild(el('span', 'ff-alt-src', a.source));
    var copy = document.createElement('button');
    copy.type = 'button'; copy.className = 'ff-alt-copy'; copy.textContent = 'copy name';
    copy.addEventListener('click', function () { copyText(a.name || '', (a.name || 'name') + ' copied ✳'); });
    top.appendChild(copy);
    row.appendChild(top);

    if (a.note) row.appendChild(el('div', 'ff-alt-note', a.note));

    // live preview: only load web fonts we can trust (Google Fonts)
    var pv = document.createElement('div');
    pv.className = 'ff-alt-preview';
    pv.setAttribute('data-loaded', '0');
    pv.textContent = shortSample(sample);
    row.appendChild(pv);

    if (a.name && /google/i.test(a.source || '')) {
      loadGoogleFont(a.name, function () {
        pv.style.fontFamily = "'" + a.name.replace(/'/g, '') + "', sans-serif";
        pv.setAttribute('data-loaded', '1');
      });
    } else {
      pv.style.display = 'none';
    }
    return row;
  }

  function shortSample(s) {
    s = (s || '').trim();
    if (!s) return 'The quick brown fox 0123';
    return s.length > 42 ? s.slice(0, 42) + '…' : s;
  }

  // ---------- Google Fonts loader (runtime third-party fetch, disclosed) ----------
  function loadGoogleFont(name, onReady) {
    var fam = name.trim();
    if (!loadedFonts[fam]) {
      loadedFonts[fam] = true;
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=' +
        encodeURIComponent(fam).replace(/%20/g, '+') + ':wght@400;700&display=swap';
      document.head.appendChild(link);
    }
    if (document.fonts && document.fonts.load) {
      // try to confirm the face actually resolves; apply either way after a beat
      document.fonts.load('700 22px "' + fam.replace(/"/g, '') + '"').then(onReady, onReady);
      setTimeout(onReady, 1500);
    } else {
      setTimeout(onReady, 600);
    }
  }

  // ---------- helpers ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function confLabel(c) {
    if (typeof c !== 'number') return '';
    var pct = Math.round(Math.max(0, Math.min(1, c)) * 100);
    var word = pct >= 70 ? 'high' : pct >= 40 ? 'medium' : 'low';
    return 'confidence: ' + word + ' (' + pct + '%)';
  }
  function setStatus(msg, isErr, busyState) {
    if (!status) return;
    if (!msg) { show(status, false); return; }
    status.textContent = msg;
    status.classList.toggle('err', !!isErr);
    status.classList.toggle('busy', !!busyState);
    show(status, true);
  }
  function copyText(text, msg) {
    if (!text) return;
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

  // ---------- capture wiring ----------
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
  $('btn-paste').addEventListener('click', function () { flashMsg('press Ctrl/Cmd + V to paste'); });

  ['dragenter', 'dragover'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  dropzone.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) ingestFile(e.dataTransfer.files[0]);
  });

  window.addEventListener('paste', function (e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image') === 0) {
        var f = items[i].getAsFile();
        if (f) { ingestFile(f); e.preventDefault(); return; }
      }
    }
  });

  $('btn-find').addEventListener('click', findFonts);
  $('btn-new').addEventListener('click', function () {
    currentDataUrl = null;
    preview.removeAttribute('src');
    fontList.innerHTML = '';
    show(findSection, false);
    show(results, false);
    setStatus('', false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

})();
