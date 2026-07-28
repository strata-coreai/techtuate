/* ============================================================
   techtuate business card reader
   - capture (upload / camera / paste / drag-drop)
   - send image(s) to /api/scan (Cloudflare Pages Function -> Gemini)
   - editable review, then save to a local IndexedDB phonebook
   - export vCard (.vcf) + CSV, copy to clipboard
   Everything except the single /api/scan call stays in this browser.
   ============================================================ */
(function () {
  'use strict';

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  var MAX_EDGE = 1600;      // downscale longest edge before upload
  var JPEG_Q = 0.85;

  // ---- state ----
  var images = { front: null, back: null };
  var wantBack = false;
  var stream = null;

  // ---- element helpers ----
  function $(id) { return document.getElementById(id); }
  function show(el, on) { if (el) el.hidden = !on; }

  var dropzone = $('dropzone');
  var fileInput = $('file-input');
  var thumbs = $('thumbs');
  var thumbFront = $('thumb-front');
  var thumbBack = $('thumb-back');
  var thumbBackWrap = $('thumb-back-wrap');
  var addBackBtn = $('btn-add-back');
  var scanSection = $('scan-section');
  var scanBtn = $('btn-scan');
  var scanStatus = $('scan-status');
  var review = $('review');
  var form = $('review-form');

  // which slot the next captured image fills: 'front' unless the back slot is requested and front exists
  function targetSlot() {
    if (wantBack && images.front && !images.back) return 'back';
    return 'front';
  }

  // ---------- image downscale ----------
  function fileToImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
      img.src = url;
    });
  }

  function drawToJpeg(source, w, h) {
    var scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    var cw = Math.round(w * scale);
    var ch = Math.round(h * scale);
    var canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, cw, ch);
    return canvas.toDataURL('image/jpeg', JPEG_Q);
  }

  function ingestFile(file) {
    if (!file || !/^image\//.test(file.type)) {
      setStatus('That does not look like an image. Try a photo of the card.', 'error');
      return;
    }
    fileToImage(file).then(function (img) {
      var data = drawToJpeg(img, img.naturalWidth, img.naturalHeight);
      setImage(targetSlot(), data);
    }).catch(function (e) {
      setStatus(e.message || 'Could not read that image.', 'error');
    });
  }

  function setImage(slot, dataUrl) {
    images[slot] = dataUrl;
    if (slot === 'back') wantBack = true;
    renderThumbs();
    // Bring the next action to the user (esp. on mobile, where the "Read card"
    // button would otherwise be below the fold after a capture).
    if (images.front) {
      requestAnimationFrame(function () {
        try { scanBtn.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
        scanSection.classList.add('cr-pop');
        setTimeout(function () { scanSection.classList.remove('cr-pop'); }, 900);
      });
    }
  }

  function removeImage(slot) {
    images[slot] = null;
    if (slot === 'back') wantBack = false;
    if (slot === 'front' && images.back) { // promote back to front
      images.front = images.back; images.back = null; wantBack = false;
    }
    renderThumbs();
  }

  function renderThumbs() {
    var has = images.front || images.back;
    show(thumbs, !!has);
    show(scanSection, !!images.front);
    if (images.front) thumbFront.src = images.front;
    show(thumbBackWrap, !!images.back);
    if (images.back) thumbBack.src = images.back;
    // hide "add back" once a back exists
    show(addBackBtn, !!images.front && !images.back);
    clearStatus();
  }

  // ---------- capture: upload ----------
  $('btn-upload').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) ingestFile(fileInput.files[0]);
    fileInput.value = '';
  });

  // dropzone click (but not when clicking a button inside)
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
  $('btn-paste').addEventListener('click', function () {
    setStatus('Press Ctrl/Cmd + V to paste a copied image.', 'working');
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

  // ---------- capture: camera ----------
  var cameraWrap = $('camera-wrap');
  var video = $('camera-video');

  $('btn-camera').addEventListener('click', startCamera);
  $('btn-camera-cancel').addEventListener('click', stopCamera);
  $('btn-snap').addEventListener('click', snapCamera);

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // fallback: use the file input with capture attribute
      fileInput.setAttribute('capture', 'environment');
      fileInput.click();
      fileInput.removeAttribute('capture');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(function (s) {
        stream = s;
        video.srcObject = s;
        show(cameraWrap, true);
      })
      .catch(function () {
        setStatus('Could not open the camera. You can upload a photo instead.', 'error');
      });
  }

  function stopCamera() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    video.srcObject = null;
    show(cameraWrap, false);
  }

  function snapCamera() {
    if (!video.videoWidth) return;
    var data = drawToJpeg(video, video.videoWidth, video.videoHeight);
    setImage(targetSlot(), data);
    stopCamera();
  }

  // ---------- add back side ----------
  addBackBtn.addEventListener('click', function () {
    wantBack = true;
    fileInput.click();
  });

  // remove thumbnail
  thumbs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-remove]');
    if (b) removeImage(b.getAttribute('data-remove'));
  });

  // ---------- status ----------
  function setStatus(msg, kind) {
    scanStatus.innerHTML = (kind === 'working' ? '<span class="cr-spin"></span>' : '') + msg;
    scanStatus.className = 'cr-status' + (kind ? ' ' + kind : '');
    show(scanStatus, true);
  }
  function clearStatus() { show(scanStatus, false); scanStatus.textContent = ''; }

  // ---------- scan ----------
  scanBtn.addEventListener('click', function () {
    if (!images.front) return;
    var payload = { images: [images.front] };
    if (images.back) payload.images.push(images.back);

    scanBtn.disabled = true;
    setStatus('Reading the card...', 'working');

    fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().then(function (body) { return { ok: res.ok, body: body }; });
    }).then(function (r) {
      scanBtn.disabled = false;
      if (!r.ok || !r.body || r.body.ok === false) {
        var m = (r.body && r.body.error) || 'The reader could not process this card.';
        if (r.body && r.body.detail) m += ' [' + String(r.body.detail).slice(0, 200) + ']';
        setStatus(m + ' You can still type the details in below.', 'error');
        populateReview({});   // open an empty, editable form so the tool never dead-ends
        return;
      }
      clearStatus();
      populateReview(r.body.data || r.body || {});
    }).catch(function () {
      scanBtn.disabled = false;
      setStatus('Network error reaching the reader. You can type the details in below.', 'error');
      populateReview({});
    });
  });

  // ---------- review form ----------
  var emailsBox = $('emails');
  var phonesBox = $('phones');
  var PHONE_TYPES = ['mobile', 'work', 'home', 'other'];

  function flagIf(input, key, conf) {
    var c = conf && typeof conf[key] === 'number' ? conf[key] : (input.value ? 1 : 0);
    if (c < 0.6 || !input.value) input.classList.add('flagged');
    else input.classList.remove('flagged');
  }

  function emailRow(value) {
    var row = document.createElement('div');
    row.className = 'cr-multi-row';
    var inp = document.createElement('input');
    inp.type = 'email'; inp.placeholder = 'name@company.com'; inp.value = value || '';
    inp.className = 'cr-email';
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'cr-del'; del.textContent = '\u00d7';
    del.setAttribute('aria-label', 'Remove email');
    del.addEventListener('click', function () { row.remove(); });
    row.appendChild(inp); row.appendChild(del);
    return row;
  }

  function phoneRow(value, type) {
    var row = document.createElement('div');
    row.className = 'cr-multi-row';
    var sel = document.createElement('select');
    sel.className = 'cr-ptype';
    PHONE_TYPES.forEach(function (t) {
      var o = document.createElement('option'); o.value = t; o.textContent = t;
      if (t === (type || 'mobile')) o.selected = true;
      sel.appendChild(o);
    });
    var inp = document.createElement('input');
    inp.type = 'tel'; inp.placeholder = '+1 555 123 4567'; inp.value = value || '';
    inp.className = 'cr-phone';
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'cr-del'; del.textContent = '\u00d7';
    del.setAttribute('aria-label', 'Remove phone');
    del.addEventListener('click', function () { row.remove(); });
    row.appendChild(sel); row.appendChild(inp); row.appendChild(del);
    return row;
  }

  document.querySelector('[data-add="email"]').addEventListener('click', function () {
    emailsBox.appendChild(emailRow(''));
  });
  document.querySelector('[data-add="phone"]').addEventListener('click', function () {
    phonesBox.appendChild(phoneRow('', 'mobile'));
  });

  function setField(key, val, conf) {
    var el = form.querySelector('[data-key="' + key + '"]');
    if (!el) return;
    el.value = val || '';
    flagIf(el, key, conf);
  }

  function addressToString(a) {
    if (!a) return '';
    if (typeof a === 'string') return a;
    return [a.street, a.city, a.state, a.postalCode, a.country]
      .filter(function (x) { return x; }).join(', ');
  }

  function populateReview(d) {
    var conf = d.confidence || {};
    setField('fullName', d.fullName || d.name || '', conf);
    setField('jobTitle', d.jobTitle || d.title || '', conf);
    setField('company', d.company || d.organization || '', conf);
    setField('website', d.website || d.url || '', conf);
    setField('address', addressToString(d.address), conf);
    setField('notes', d.notes || '', conf);

    // emails
    emailsBox.innerHTML = '';
    var emails = Array.isArray(d.emails) ? d.emails : (d.email ? [d.email] : []);
    if (!emails.length) emailsBox.appendChild(emailRow(''));
    else emails.forEach(function (e) { emailsBox.appendChild(emailRow(typeof e === 'string' ? e : e.value)); });

    // phones
    phonesBox.innerHTML = '';
    var phones = Array.isArray(d.phones) ? d.phones : (d.phone ? [{ value: d.phone, type: 'mobile' }] : []);
    if (!phones.length) phonesBox.appendChild(phoneRow('', 'mobile'));
    else phones.forEach(function (p) {
      if (typeof p === 'string') phonesBox.appendChild(phoneRow(p, 'mobile'));
      else phonesBox.appendChild(phoneRow(p.value, normType(p.type)));
    });

    show(review, true);
    review.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function normType(t) {
    t = (t || '').toLowerCase();
    if (t.indexOf('cell') >= 0 || t.indexOf('mob') >= 0) return 'mobile';
    if (t.indexOf('work') >= 0 || t.indexOf('office') >= 0) return 'work';
    if (t.indexOf('home') >= 0) return 'home';
    return PHONE_TYPES.indexOf(t) >= 0 ? t : 'other';
  }

  // ---------- collect form into a contact object ----------
  function collectContact() {
    function val(key) { var el = form.querySelector('[data-key="' + key + '"]'); return el ? el.value.trim() : ''; }
    var emails = [].slice.call(emailsBox.querySelectorAll('.cr-email'))
      .map(function (i) { return i.value.trim(); }).filter(Boolean);
    var phones = [].slice.call(phonesBox.querySelectorAll('.cr-multi-row')).map(function (row) {
      var v = row.querySelector('.cr-phone').value.trim();
      var t = row.querySelector('.cr-ptype').value;
      return v ? { value: v, type: t } : null;
    }).filter(Boolean);
    return {
      fullName: val('fullName'),
      jobTitle: val('jobTitle'),
      company: val('company'),
      emails: emails,
      phones: phones,
      website: val('website'),
      address: val('address'),
      notes: val('notes')
    };
  }

  // ---------- vCard ----------
  function vEsc(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }
  function splitName(full) {
    var parts = String(full || '').trim().split(/\s+/);
    if (parts.length <= 1) return { first: parts[0] || '', last: '' };
    var last = parts.pop();
    return { first: parts.join(' '), last: last };
  }
  function TYPE_MAP(t) { return t === 'mobile' ? 'CELL' : (t === 'work' ? 'WORK' : (t === 'home' ? 'HOME' : 'VOICE')); }

  function toVCard(c) {
    var n = splitName(c.fullName);
    var lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    lines.push('N:' + vEsc(n.last) + ';' + vEsc(n.first) + ';;;');
    lines.push('FN:' + vEsc(c.fullName || (c.company || 'Contact')));
    if (c.company) lines.push('ORG:' + vEsc(c.company));
    if (c.jobTitle) lines.push('TITLE:' + vEsc(c.jobTitle));
    (c.phones || []).forEach(function (p) { lines.push('TEL;TYPE=' + TYPE_MAP(p.type) + ':' + vEsc(p.value)); });
    (c.emails || []).forEach(function (e) { lines.push('EMAIL;TYPE=INTERNET:' + vEsc(e)); });
    if (c.website) lines.push('URL:' + vEsc(c.website));
    if (c.address) lines.push('ADR;TYPE=WORK:;;' + vEsc(c.address) + ';;;;');
    if (c.notes) lines.push('NOTE:' + vEsc(c.notes));
    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  function safeName(c) {
    var base = (c.fullName || c.company || 'contact').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    return (base || 'contact');
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- CSV ----------
  function cEsc(s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function contactsToCsv(list) {
    var head = ['Name', 'Title', 'Company', 'Emails', 'Phones', 'Website', 'Address', 'Notes'];
    var rows = [head.join(',')];
    list.forEach(function (c) {
      rows.push([
        cEsc(c.fullName), cEsc(c.jobTitle), cEsc(c.company),
        cEsc((c.emails || []).join('; ')),
        cEsc((c.phones || []).map(function (p) { return p.type + ':' + p.value; }).join('; ')),
        cEsc(c.website), cEsc(c.address), cEsc(c.notes)
      ].join(','));
    });
    return rows.join('\r\n');
  }

  // ---------- clipboard ----------
  var flash = $('copy-flash');
  function copyText(text, msg) {
    function done() { if (!flash) return; flash.textContent = msg || 'copied \u2733'; flash.classList.add('show'); setTimeout(function () { flash.classList.remove('show'); }, 1500); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { window.prompt('Copy:', text); });
    } else { window.prompt('Copy:', text); }
  }
  function contactToText(c) {
    var out = [];
    if (c.fullName) out.push(c.fullName);
    if (c.jobTitle || c.company) out.push([c.jobTitle, c.company].filter(Boolean).join(', '));
    (c.emails || []).forEach(function (e) { out.push(e); });
    (c.phones || []).forEach(function (p) { out.push(p.type + ': ' + p.value); });
    if (c.website) out.push(c.website);
    if (c.address) out.push(c.address);
    if (c.notes) out.push(c.notes);
    return out.join('\n');
  }

  // ---------- review actions ----------
  $('btn-download-one').addEventListener('click', function () {
    var c = collectContact();
    if (!c.fullName && !c.company && !(c.emails || []).length) { setStatus('Add at least a name, company, or email first.', 'error'); return; }
    download(safeName(c) + '.vcf', toVCard(c), 'text/vcard');
  });
  $('btn-copy-one').addEventListener('click', function () { copyText(contactToText(collectContact()), 'contact copied \u2733'); });
  $('btn-discard').addEventListener('click', resetAll);
  $('btn-save').addEventListener('click', function () {
    var c = collectContact();
    if (!c.fullName && !c.company && !(c.emails || []).length) { setStatus('Add at least a name, company, or email before saving.', 'error'); return; }
    c.id = 'c' + Date.now() + Math.floor(Math.random() * 1000);
    c.createdAt = Date.now();
    dbPut(c).then(function () { resetCapture(); loadPhonebook(); if (flash) { flash.textContent = 'saved to phonebook \u2733'; flash.classList.add('show'); setTimeout(function () { flash.classList.remove('show'); }, 1500); } });
  });

  function resetCapture() {
    images = { front: null, back: null }; wantBack = false;
    renderThumbs();
    show(review, false);
    clearStatus();
  }
  function resetAll() { resetCapture(); }

  // ---------- IndexedDB phonebook ----------
  var DB_NAME = 'techtuate-card-reader';
  var STORE = 'contacts';
  var dbP = null;
  function openDb() {
    if (dbP) return dbP;
    dbP = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('no-idb')); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbP;
  }
  function dbPut(c) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(c);
        tx.oncomplete = resolve; tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () { /* IndexedDB unavailable: fall back silently, session-only memory */ memStore.push(c); });
  }
  function dbAll() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var out = [];
        var tx = db.transaction(STORE, 'readonly');
        var cur = tx.objectStore(STORE).openCursor();
        cur.onsuccess = function () { var c = cur.result; if (c) { out.push(c.value); c.continue(); } else resolve(out); };
        cur.onerror = function () { reject(cur.error); };
      });
    }).catch(function () { return memStore.slice(); });
  }
  function dbDel(id) {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = resolve; tx.onerror = resolve;
      });
    }).catch(function () { memStore = memStore.filter(function (c) { return c.id !== id; }); });
  }
  function dbClear() {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = resolve; tx.onerror = resolve;
      });
    }).catch(function () { memStore = []; });
  }
  var memStore = [];

  // ---------- phonebook UI ----------
  var pbList = $('pb-list');
  var pbEmpty = $('pb-empty');
  var pbBar = $('pb-bar');
  var pbCount = $('pb-count');
  var current = [];

  function loadPhonebook() {
    dbAll().then(function (list) {
      list.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      current = list;
      pbCount.textContent = list.length + ' saved';
      show(pbEmpty, list.length === 0);
      show(pbList, list.length > 0);
      show(pbBar, list.length > 0);
      pbList.innerHTML = '';
      list.forEach(function (c) { pbList.appendChild(pbItem(c)); });
    });
  }

  function pbItem(c) {
    var el = document.createElement('div');
    el.className = 'cr-pb-item';
    var main = document.createElement('div');
    main.className = 'cr-pb-main';
    var name = document.createElement('div');
    name.className = 'cr-pb-name'; name.textContent = c.fullName || c.company || 'Unnamed contact';
    var sub = document.createElement('div');
    sub.className = 'cr-pb-sub';
    sub.textContent = [c.jobTitle, c.company, (c.emails || [])[0], (c.phones || [])[0] && c.phones[0].value]
      .filter(Boolean).join(' \u00b7 ');
    main.appendChild(name); main.appendChild(sub);

    var actions = document.createElement('div');
    actions.className = 'cr-pb-item-actions';
    actions.appendChild(iconBtn('.vcf', function () { download(safeName(c) + '.vcf', toVCard(c), 'text/vcard'); }));
    actions.appendChild(iconBtn('copy', function () { copyText(contactToText(c), 'contact copied \u2733'); }));
    actions.appendChild(iconBtn('delete', function () { dbDel(c.id).then(loadPhonebook); }));

    el.appendChild(main); el.appendChild(actions);
    return el;
  }
  function iconBtn(label, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'cr-icon-btn'; b.textContent = label;
    b.addEventListener('click', fn);
    return b;
  }

  $('btn-export-vcf').addEventListener('click', function () {
    if (!current.length) return;
    var all = current.map(toVCard).join('\r\n');
    download('techtuate-contacts.vcf', all, 'text/vcard');
  });
  $('btn-export-csv').addEventListener('click', function () {
    if (!current.length) return;
    download('techtuate-contacts.csv', contactsToCsv(current), 'text/csv');
  });
  $('btn-clear-pb').addEventListener('click', function () {
    if (!current.length) return;
    if (window.confirm('Remove all saved contacts from this browser? This cannot be undone.')) {
      dbClear().then(loadPhonebook);
    }
  });

  // ---------- init ----------
  renderThumbs();
  loadPhonebook();
})();
