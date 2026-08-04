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
        document.body.classList.add('cr-modal-open');   // lock scroll behind the focused camera
      })
      .catch(function () {
        setStatus('Could not open the camera. You can upload a photo instead.', 'error');
      });
  }

  function stopCamera() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    video.srcObject = null;
    show(cameraWrap, false);
    document.body.classList.remove('cr-modal-open');
  }

  // close the camera modal with Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cameraWrap && !cameraWrap.hidden) stopCamera();
  });

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
    row.className = 'cr-multi-row cr-has-acts';
    var top = document.createElement('div'); top.className = 'cr-row-top';
    var inp = document.createElement('input');
    inp.type = 'email'; inp.placeholder = 'name@company.com'; inp.value = value || '';
    inp.className = 'cr-email';
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'cr-del'; del.textContent = '\u00d7';
    del.setAttribute('aria-label', 'Remove email');
    del.addEventListener('click', function () { row.remove(); });
    top.appendChild(inp); top.appendChild(del);
    var acts = document.createElement('div'); acts.className = 'cr-acts';
    row.appendChild(top); row.appendChild(acts);
    row._upd = function () { updateEmailActions(inp, acts); };
    inp.addEventListener('input', row._upd);
    row._upd();
    return row;
  }

  function phoneRow(value, type, e164, isMobile) {
    var row = document.createElement('div');
    row.className = 'cr-multi-row cr-has-acts';
    if (e164) row.setAttribute('data-e164', e164);
    var top = document.createElement('div'); top.className = 'cr-row-top';
    var sel = document.createElement('select');
    sel.className = 'cr-ptype';
    var wantType = type || (isMobile ? 'mobile' : 'other');
    PHONE_TYPES.forEach(function (t) {
      var o = document.createElement('option'); o.value = t; o.textContent = t;
      if (t === wantType) o.selected = true;
      sel.appendChild(o);
    });
    var inp = document.createElement('input');
    inp.type = 'tel'; inp.placeholder = '+1 555 123 4567'; inp.value = value || '';
    inp.className = 'cr-phone';
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'cr-del'; del.textContent = '\u00d7';
    del.setAttribute('aria-label', 'Remove phone');
    del.addEventListener('click', function () { row.remove(); });
    top.appendChild(sel); top.appendChild(inp); top.appendChild(del);
    var acts = document.createElement('div'); acts.className = 'cr-acts';
    row.appendChild(top); row.appendChild(acts);
    row._upd = function () { updatePhoneActions(row, sel, inp, acts); };
    inp.addEventListener('input', row._upd);
    sel.addEventListener('change', row._upd);
    row._upd();
    return row;
  }

  // ---------- reach-out: build deep links from the recognized contact ----------
  // All client-side. Nothing is sent anywhere; these just open the user's own apps.
  var ICON = {
    call: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#0a0a0a" d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1.1L6.6 10.8z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#25D366"/><g transform="translate(3 3) scale(0.72)"><path fill="#fff" d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1.1L6.6 10.8z"/></g></svg>',
    sms: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#34C759" d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.5 3.4 5.9-.1 1-.6 2.2-1.4 3.1 1.6-.2 3.2-.8 4.4-1.7 1.1.3 2.3.5 3.6.5 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/></svg>',
    email: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2" fill="none" stroke="#0a0a0a" stroke-width="1.8"/><path d="M3.5 6.5l8.5 6 8.5-6" fill="none" stroke="#0a0a0a" stroke-width="1.6"/></svg>',
    gmail: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2" fill="#fff" stroke="#EA4335" stroke-width="1.5"/><path d="M3.2 6.5l8.8 6 8.8-6" fill="none" stroke="#EA4335" stroke-width="1.8"/></svg>',
    outlook: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2" fill="#0078D4"/><path d="M4 7.5l8 5 8-5" fill="none" stroke="#fff" stroke-width="1.6"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2"/><circle cx="7" cy="8" r="1.5" fill="#fff"/><rect x="5.7" y="10.4" width="2.6" height="7.6" fill="#fff"/><path fill="#fff" d="M10.6 10.4h2.5v1.05a2.9 2.9 0 0 1 2.5-1.25c2 0 3.2 1.25 3.2 3.7V18h-2.6v-3.85c0-1-.4-1.7-1.35-1.7-.8 0-1.45.6-1.45 1.7V18h-2.6z"/></svg>',
    web: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#0a0a0a" stroke-width="1.7"/><path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18" fill="none" stroke="#0a0a0a" stroke-width="1.2"/></svg>',
    facetime: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="2.5" y="6" width="13" height="12" rx="2.5" fill="#34C759"/><path d="M16 10l5-3v10l-5-3z" fill="#34C759"/></svg>'
  };

  // FaceTime is only useful on Apple devices (iPhone/iPad/Mac). Show it there (desktop Macs included).
  var IS_APPLE = /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(navigator.userAgent || '') ||
    (navigator.platform && /Mac|iPhone|iPad|iPod/.test(navigator.platform));
  var IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

  // Ship the reach-out layout CSS from JS so it can never drift/cache apart from this script.
  // (Injected into <head> after site.css, so it wins on equal specificity.)
  (function injectReachStyles() {
    if (document.getElementById('cr-reach-style')) return;
    var css = [
      '.cr-multi-row.cr-has-acts{flex-direction:column;align-items:stretch;gap:8px}',
      '.cr-row-top{display:flex;gap:8px;align-items:center}',
      '.cr-row-top select{max-width:120px}',
      '.cr-row-top input{flex:1;min-width:0}',
      '.cr-acts{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
      '.cr-acts-lead{flex-basis:100%;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-dim);margin-bottom:-3px}',
      '.cr-connect{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:2px 0 16px}',
      '.cr-connect[hidden]{display:none}',
      '.cr-connect-label{font-family:var(--font-mono);font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-mute)}',
      '.cr-act{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border:2px solid var(--ink);border-radius:999px;background:var(--bg);color:var(--ink);font-family:var(--font-body);font-size:13.5px;font-weight:700;line-height:1;text-decoration:none;cursor:pointer;box-shadow:2px 2px 0 var(--ink);transition:transform .12s ease,box-shadow .12s ease,background .12s ease}',
      '.cr-act.primary{background:var(--yellow)}',
      '.cr-act:hover{transform:translate(-1px,-1px);box-shadow:3px 3px 0 var(--ink);background:var(--yellow-wash)}',
      '.cr-act.primary:hover{background:var(--yellow-soft)}',
      '.cr-act:active{transform:translate(0,0);box-shadow:1px 1px 0 var(--ink)}',
      '.cr-act svg{display:block;flex:0 0 auto}',
      '.cr-act span{white-space:nowrap}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'cr-reach-style';
    s.textContent = css;
    document.head.appendChild(s);
  })();

  function fieldVal(key) { var el = form.querySelector('[data-key="' + key + '"]'); return el ? el.value.trim() : ''; }
  function firstName() { var f = fieldVal('fullName'); return f ? f.split(/\s+/)[0] : ''; }

  // Short brand name for the LinkedIn/web people search. The scan supplies a
  // best 1-2 word searchName; if it's missing (or the user retyped company)
  // we fall back to the first significant word of the company field, since the
  // full legal name ("... Technologies Pvt Ltd") makes the search useless.
  var aiCompanySearch = '';
  function companyShort(c) {
    c = (c || '').trim();
    if (!c) return '';
    var words = c.replace(/[.,&]/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length > 1 && /^(the|a|an)$/i.test(words[0])) words.shift();
    return words[0] || '';
  }
  function companySearch(company) { return aiCompanySearch || companyShort(company); }
  function enc(s) { return encodeURIComponent(s || ''); }

  function usableE164(raw, stored) {
    if (/\+/.test(raw)) return '+' + raw.replace(/[^\d]/g, '');
    if (stored) return stored;
    return ''; // national-only, no country code -> can't build a WhatsApp link
  }
  function telHref(n) { return 'tel:' + (n || '').replace(/[^\d+]/g, ''); }
  function smsHref(n) { return 'sms:' + (n || '').replace(/[^\d+]/g, ''); }
  function ftHref(n) { return 'facetime:' + (n || '').replace(/[^\d+]/g, ''); }
  function waHref(e164, text) {
    var d = (e164 || '').replace(/[^\d]/g, '');
    return 'https://wa.me/' + d + (text ? '?text=' + enc(text) : '');
  }
  function mailtoHref(email, subj, body) { return 'mailto:' + email + '?subject=' + enc(subj) + '&body=' + enc(body); }
  // On mobile, open the actual app (its scheme) so the message prefills; on desktop, web compose.
  function gmailHref(email, subj, body) {
    if (IS_MOBILE) return 'googlegmail://co?to=' + enc(email) + '&subject=' + enc(subj) + '&body=' + enc(body);
    return 'https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=' + enc(email) + '&su=' + enc(subj) + '&body=' + enc(body);
  }
  function outlookHref(email, subj, body) {
    if (IS_MOBILE) return 'ms-outlook://compose?to=' + enc(email) + '&subject=' + enc(subj) + '&body=' + enc(body);
    return 'https://outlook.office.com/mail/deeplink/compose?to=' + enc(email) + '&subject=' + enc(subj) + '&body=' + enc(body);
  }
  function linkedinHref(q) { return 'https://www.linkedin.com/search/results/people/?keywords=' + enc(q); }
  function webHref(q) { return 'https://www.google.com/search?q=' + enc(q + ' linkedin'); }

  function actionBtn(href, label, icon, external, primary) {
    var a = document.createElement('a');
    a.className = 'cr-act' + (primary ? ' primary' : '');
    a.href = href;
    if (external) { a.target = '_blank'; a.rel = 'noopener'; }
    a.innerHTML = icon + '<span>' + label + '</span>';
    a.setAttribute('aria-label', label);
    return a;
  }

  function leadLabel() {
    var s = document.createElement('span');
    s.className = 'cr-acts-lead';
    s.textContent = 'Reach out';
    return s;
  }

  function updatePhoneActions(row, sel, inp, acts) {
    acts.innerHTML = '';
    var raw = inp.value.trim();
    if (!raw) return;
    var e164 = usableE164(raw, row.getAttribute('data-e164'));
    var mobile = sel.value === 'mobile';
    acts.appendChild(leadLabel());
    if (mobile) {
      var name = firstName();
      var waText = name ? 'Hi ' + name + ', great connecting.' : '';
      // WhatsApp is the primary action for a mobile; if we can't build it, Call is primary.
      if (e164) acts.appendChild(actionBtn(waHref(e164, waText), 'WhatsApp', ICON.whatsapp, true, true));
      acts.appendChild(actionBtn(telHref(e164 || raw), 'Call', ICON.call, false, !e164));
      acts.appendChild(actionBtn(smsHref(e164 || raw), 'Text', ICON.sms, false));
      if (IS_APPLE) acts.appendChild(actionBtn(ftHref(e164 || raw), 'FaceTime', ICON.facetime, false));
    } else {
      acts.appendChild(actionBtn(telHref(e164 || raw), 'Call', ICON.call, false, true));
    }
  }

  function updateEmailActions(inp, acts) {
    acts.innerHTML = '';
    var e = inp.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    var name = firstName();
    var subj = 'Great connecting';
    var body = (name ? 'Hi ' + name : 'Hi there') +
      ',\n\nIt was great connecting today. I\'d love to stay in touch - happy to continue the conversation whenever suits you.\n\nBest regards,';
    // Email = mailto: opens the user's default mail app (Gmail/Outlook/Apple Mail) with the message.
    // Gmail/Outlook = the app scheme on mobile (opens the app), web compose in a new tab on desktop.
    var webCompose = !IS_MOBILE;
    acts.appendChild(leadLabel());
    acts.appendChild(actionBtn(mailtoHref(e, subj, body), 'Email', ICON.email, false, true));
    acts.appendChild(actionBtn(gmailHref(e, subj, body), 'Gmail', ICON.gmail, webCompose));
    acts.appendChild(actionBtn(outlookHref(e, subj, body), 'Outlook', ICON.outlook, webCompose));
  }

  // Create the Connect block if it isn't in the markup (so it works even if index.html drifted).
  function ensureConnectBox() {
    var box = $('cr-connect');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'cr-connect'; box.className = 'cr-connect'; box.hidden = true;
    var label = document.createElement('span'); label.className = 'cr-connect-label'; label.textContent = 'Connect';
    var acts = document.createElement('div'); acts.id = 'cr-connect-actions'; acts.className = 'cr-acts';
    box.appendChild(label); box.appendChild(acts);
    var anchor = form.querySelector('.cr-multi'); // the Email fieldset
    if (anchor) form.insertBefore(box, anchor); else form.appendChild(box);
    return box;
  }

  function buildConnect() {
    var box = ensureConnectBox();
    var acts = box.querySelector('#cr-connect-actions') || box.querySelector('.cr-acts');
    if (!acts) return;
    var name = fieldVal('fullName'); var company = fieldVal('company');
    acts.innerHTML = '';
    if (!name && !company) { show(box, false); return; }
    var q = (name + ' ' + companySearch(company)).trim();
    acts.appendChild(actionBtn(linkedinHref(q), 'LinkedIn', ICON.linkedin, true));
    acts.appendChild(actionBtn(webHref(q), 'Web search', ICON.web, true));
    show(box, true);
  }

  function refreshActions() {
    [].slice.call(phonesBox.children).forEach(function (r) { if (r._upd) r._upd(); });
    [].slice.call(emailsBox.children).forEach(function (r) { if (r._upd) r._upd(); });
    buildConnect();
  }

  // name / company edits refresh LinkedIn search + message prefills
  ['fullName', 'company'].forEach(function (k) {
    var el = form.querySelector('[data-key="' + k + '"]');
    if (el) el.addEventListener('input', function () {
      // Once the user retypes the company, drop the scanned brand name and
      // derive the search term from what they actually typed.
      if (k === 'company') aiCompanySearch = '';
      refreshActions();
    });
  });

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
    aiCompanySearch = (d.searchName || '').trim();
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
      else phonesBox.appendChild(phoneRow(p.value, p.isMobile ? 'mobile' : normType(p.type), p.e164 || '', !!p.isMobile));
    });

    buildConnect();
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