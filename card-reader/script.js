/* ============================================================
   techtuate business card reader
   - capture (upload / camera / paste / drag-drop / sample card)
   - send image(s) to /api/scan (Cloudflare Pages Function -> Gemini)
   - editable review with flags, reach-out links, then save to a local
     IndexedDB phonebook
   - export vCard (.vcf) + CSV, copy to clipboard
   Everything except the single /api/scan call stays in this browser.
   States: empty -> reading -> review (or failed) -> (save) -> empty
   ============================================================ */
(function () {
  'use strict';

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  var MAX_EDGE = 1600;      // downscale longest edge before upload
  var JPEG_Q = 0.85;
  var SAMPLE_URL = '/card-reader/sample-card.jpg';

  // ---- state ----
  var images = { front: null, back: null };
  var wantBack = false;
  var stream = null;
  var stage = 'empty';      // empty | reading | review | failed
  var scanSeq = 0;          // ignore late responses after "start over"
  var freshId = null;       // newest saved contact (highlighted)

  // ---- element helpers ----
  function $(id) { return document.getElementById(id); }
  function show(el, on) { if (el) el.hidden = !on; }

  var dropzone = $('dropzone');
  var fileInput = $('file-input');
  var emptyBox = $('cr-empty');
  var hasBox = $('cr-has');
  var thumbFront = $('thumb-front');
  var thumbBack = $('thumb-back');
  var thumbBackWrap = $('thumb-back-wrap');
  var addBackBtn = $('btn-add-back');
  var veil = $('cr-veil');
  var stageLabel = $('stage-label');
  var ghost = $('cr-ghost');
  var scanStatus = $('scan-status');
  var failActions = $('cr-fail-actions');
  var review = $('review');
  var form = $('review-form');
  var reviewNote = $('review-note');

  var GHOST_IDLE = 'The details will appear here, ready to edit.';
  var GHOST_READING = 'Reading the card. Usually a couple of seconds.';

  // which slot the next captured image fills
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
      showGhostMessage('That does not look like an image. Try a photo of the card.', true);
      return;
    }
    fileToImage(file).then(function (img) {
      var data = drawToJpeg(img, img.naturalWidth, img.naturalHeight);
      setImage(targetSlot(), data);
    }).catch(function (e) {
      showGhostMessage(e.message || 'Could not read that image.', true);
    });
  }

  // A new image arrives: show it and read the card straight away.
  // Adding the back re-reads front + back together so details merge.
  function setImage(slot, dataUrl) {
    images[slot] = dataUrl;
    if (slot === 'back') wantBack = false;
    renderCard();
    scan();
  }

  function removeBack() {
    images.back = null; wantBack = false;
    renderCard();
  }

  function renderCard() {
    var has = !!images.front;
    show(emptyBox, !has);
    show(hasBox, has);
    if (images.front) thumbFront.src = images.front;
    show(thumbBackWrap, !!images.back);
    if (images.back) thumbBack.src = images.back;
    show(addBackBtn, has && !images.back);
  }

  // ---------- stage / ghost ----------
  function setStage(s, info) {
    stage = s;
    var reading = s === 'reading';
    show(veil, reading);
    ghost.classList.toggle('reading', reading);
    show(ghost, s !== 'review');
    show(form, s === 'review');
    show(failActions, s === 'failed');
    addBackBtn.disabled = reading;
    if (s === 'empty') {
      stageLabel.textContent = 'front + back supported';
      showGhostMessage(GHOST_IDLE, false);
      reviewNote.textContent = '';
    } else if (reading) {
      stageLabel.textContent = 'reading\u2026';
      showGhostMessage(GHOST_READING, false);
      reviewNote.textContent = '';
    } else if (s === 'review') {
      stageLabel.textContent = info || 'ready to check';
    } else if (s === 'failed') {
      stageLabel.textContent = 'could not read it';
      reviewNote.textContent = '';
    }
  }

  function showGhostMessage(msg, isError) {
    scanStatus.textContent = msg;
    scanStatus.classList.toggle('error', !!isError);
  }

  // ---------- capture: upload ----------
  $('btn-upload').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) ingestFile(fileInput.files[0]);
    fileInput.value = '';
  });

  dropzone.addEventListener('click', function () { fileInput.click(); });
  dropzone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });

  // ---------- capture: drag/drop (anywhere on the card panel) ----------
  var cardPanel = dropzone.closest('.cr-card') || dropzone;
  ['dragenter', 'dragover'].forEach(function (ev) {
    cardPanel.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    cardPanel.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('dragover'); });
  });
  cardPanel.addEventListener('drop', function (e) {
    var dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) ingestFile(dt.files[0]);
  });

  // ---------- capture: paste ----------
  window.addEventListener('paste', function (e) {
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return; // let normal text pastes through
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image') === 0) {
        var f = items[i].getAsFile();
        if (f) { ingestFile(f); e.preventDefault(); return; }
      }
    }
  });

  // ---------- capture: sample card ----------
  $('btn-sample').addEventListener('click', function () {
    fetch(SAMPLE_URL).then(function (r) {
      if (!r.ok) throw new Error('missing');
      return r.blob();
    }).then(function (b) {
      ingestFile(new File([b], 'sample-card.jpg', { type: b.type || 'image/jpeg' }));
    }).catch(function () {
      showGhostMessage('The sample card could not be loaded. Try one of your own.', true);
    });
  });

  // ---------- capture: camera ----------
  var cameraWrap = $('camera-wrap');
  var video = $('camera-video');

  $('btn-camera').addEventListener('click', startCamera);
  $('btn-camera-cancel').addEventListener('click', stopCamera);
  $('btn-snap').addEventListener('click', snapCamera);

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // fallback: the file input with the capture attribute opens the camera on phones
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
        document.body.classList.add('cr-modal-open');
      })
      .catch(function () {
        showGhostMessage('Could not open the camera. You can upload a photo instead.', true);
      });
  }

  function stopCamera() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    video.srcObject = null;
    show(cameraWrap, false);
    document.body.classList.remove('cr-modal-open');
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cameraWrap && !cameraWrap.hidden) stopCamera();
  });

  function snapCamera() {
    if (!video.videoWidth) return;
    var data = drawToJpeg(video, video.videoWidth, video.videoHeight);
    stopCamera();
    setImage(targetSlot(), data);
  }

  // ---------- add back / start over ----------
  addBackBtn.addEventListener('click', function () {
    wantBack = true;
    fileInput.click();
  });
  thumbBackWrap.addEventListener('click', function (e) {
    if (e.target.closest('[data-remove="back"]')) removeBack();
  });
  $('btn-discard').addEventListener('click', resetAll);

  // ---------- scan ----------
  function scan() {
    if (!images.front) return;
    var payload = { images: [images.front] };
    if (images.back) payload.images.push(images.back);
    var seq = ++scanSeq;
    var t0 = performance.now();
    setStage('reading');

    fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().then(function (body) { return { ok: res.ok, body: body }; });
    }).then(function (r) {
      if (seq !== scanSeq) return;
      if (!r.ok || !r.body || r.body.ok === false) {
        var m = (r.body && r.body.error) || 'The reader could not process this card.';
        fail(m);
        return;
      }
      var secs = ((performance.now() - t0) / 1000).toFixed(1);
      populateReview(r.body.data || r.body || {}, true);
      setStage('review', (images.back ? 'front + back' : 'front') + ' read in ' + secs + 's');
      afterReview();
    }).catch(function () {
      if (seq !== scanSeq) return;
      fail('Could not reach the reader. Check your connection and try again.');
    });
  }

  function fail(msg) {
    setStage('failed');
    showGhostMessage('Couldn\u2019t read this card. ' + msg, true);
  }

  $('btn-retry').addEventListener('click', scan);
  $('btn-manual').addEventListener('click', function () {
    populateReview({}, false);
    setStage('review', 'typing it in');
    afterReview();
  });

  // On narrow screens the contact panel sits below the card: bring it into view.
  function afterReview() {
    if (window.matchMedia && matchMedia('(max-width: 980px)').matches) {
      try { review.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    }
  }

  // ---------- review form ----------
  var emailsBox = $('emails');
  var phonesBox = $('phones');
  var PHONE_TYPES = ['mobile', 'work', 'home', 'other'];

  function setFlag(row, text) {
    var f = row.querySelector('.cr-flag');
    if (f) f.textContent = text || '';
    updateCheckCount();
  }

  function updateCheckCount() {
    var n = [].slice.call(form.querySelectorAll('.cr-flag')).filter(function (f) { return f.textContent; }).length;
    reviewNote.textContent = form.hidden ? '' : (n ? n + (n === 1 ? ' field' : ' fields') + ' to check' : '');
  }

  // Editing a field clears its flag.
  form.addEventListener('input', function (e) {
    var row = e.target.closest('.cr-field');
    if (row && row.querySelector('.cr-flag') && row.querySelector('.cr-flag').textContent) setFlag(row, '');
  });

  function removeBtn(label, onClick) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'cr-x'; b.textContent = '\u00d7';
    b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
  }

  function emailRow(value) {
    var row = document.createElement('label');
    row.className = 'cr-field cr-email-row';
    var lab = document.createElement('span'); lab.className = 'cr-label'; lab.textContent = 'Email';
    var inp = document.createElement('input');
    inp.type = 'email'; inp.placeholder = 'name@company.com'; inp.value = value || '';
    inp.className = 'cr-email';
    inp.addEventListener('input', buildReach);
    var flag = document.createElement('span'); flag.className = 'cr-flag';
    row.appendChild(lab); row.appendChild(inp); row.appendChild(flag);
    if (emailsBox.children.length) row.appendChild(removeBtn('Remove email', function () { row.remove(); buildReach(); updateCheckCount(); }));
    return row;
  }

  function phoneRow(value, type, e164, isMobile) {
    var row = document.createElement('label');
    row.className = 'cr-field cr-phone-row';
    if (e164) row.setAttribute('data-e164', e164);
    var sel = document.createElement('select');
    sel.className = 'cr-ptype';
    sel.setAttribute('aria-label', 'Phone type');
    var wantType = type || (isMobile ? 'mobile' : 'other');
    PHONE_TYPES.forEach(function (t) {
      var o = document.createElement('option'); o.value = t; o.textContent = t;
      if (t === wantType) o.selected = true;
      sel.appendChild(o);
    });
    var inp = document.createElement('input');
    inp.type = 'tel'; inp.placeholder = '+60 12 345 6789'; inp.value = value || '';
    inp.className = 'cr-phone';
    inp.addEventListener('input', buildReach);
    sel.addEventListener('change', buildReach);
    var flag = document.createElement('span'); flag.className = 'cr-flag';
    row.appendChild(sel); row.appendChild(inp); row.appendChild(flag);
    if (phonesBox.children.length) row.appendChild(removeBtn('Remove phone', function () { row.remove(); buildReach(); updateCheckCount(); }));
    return row;
  }

  document.querySelector('[data-add="email"]').addEventListener('click', function () {
    var r = emailRow(''); emailsBox.appendChild(r); r.querySelector('input').focus();
  });
  document.querySelector('[data-add="phone"]').addEventListener('click', function () {
    var r = phoneRow('', 'mobile'); phonesBox.appendChild(r); r.querySelector('input').focus();
  });

  // ---------- reach-out: deep links built from the recognized contact ----------
  // All client-side. Nothing is sent anywhere; these just open the user's own apps.
  var IS_APPLE = /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(navigator.userAgent || '') ||
    (navigator.platform && /Mac|iPhone|iPad|iPod/.test(navigator.platform));
  var IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  var BRAND = { whatsapp: '#25d366', email: '#ea4335', gmail: '#ea4335', outlook: '#0078d4', call: '#ffd60a', text: '#34c759', facetime: '#34c759', linkedin: '#0a66c2', web: '#8d879c' };

  function fieldVal(key) { var el = form.querySelector('[data-key="' + key + '"]'); return el ? el.value.trim() : ''; }
  function firstName() { var f = fieldVal('fullName'); return f ? f.split(/\s+/)[0] : ''; }

  // Short brand name for the LinkedIn/web people search. The scan supplies a
  // best 1-2 word searchName; if it's missing (or the user retyped company)
  // fall back to the first significant word of the company field, since the
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
    return ''; // national-only, no country code: can't build a WhatsApp link
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

  function actLink(href, label, color, external) {
    var a = document.createElement('a');
    a.className = 'cr-act';
    a.href = href;
    if (external) { a.target = '_blank'; a.rel = 'noopener'; }
    a.style.setProperty('--c', color);
    a.innerHTML = '<span class="dot" aria-hidden="true"></span>';
    a.appendChild(document.createTextNode(label));
    return a;
  }

  var reachBox = $('cr-reach');
  var reachMoreOpen = false;

  // One row of pills for the whole contact: the main four up front
  // (WhatsApp, Email, Call, LinkedIn), the rest behind "more".
  function buildReach() {
    var main = [], extra = [];
    var name = firstName();

    var phoneRows = [].slice.call(phonesBox.querySelectorAll('.cr-phone-row')).filter(function (r) {
      return r.querySelector('.cr-phone').value.trim();
    });
    var mobileRow = phoneRows.filter(function (r) { return r.querySelector('.cr-ptype').value === 'mobile'; })[0];
    var anyPhone = mobileRow || phoneRows[0];
    if (anyPhone) {
      var raw = anyPhone.querySelector('.cr-phone').value.trim();
      var e164 = usableE164(raw, anyPhone.getAttribute('data-e164'));
      if (mobileRow && e164) main.push(actLink(waHref(e164, name ? 'Hi ' + name + ', great connecting.' : ''), 'WhatsApp', BRAND.whatsapp, true));
      if (mobileRow) {
        extra.push(actLink(smsHref(e164 || raw), 'Text', BRAND.text, false));
        if (IS_APPLE) extra.push(actLink(ftHref(e164 || raw), 'FaceTime', BRAND.facetime, false));
      }
    }

    var email = [].slice.call(emailsBox.querySelectorAll('.cr-email')).map(function (i) { return i.value.trim(); })
      .filter(function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); })[0];
    if (email) {
      var subj = 'Great connecting';
      var body = (name ? 'Hi ' + name : 'Hi there') +
        ',\n\nIt was great connecting today. I\'d love to stay in touch - happy to continue the conversation whenever suits you.\n\nBest regards,';
      main.push(actLink(mailtoHref(email, subj, body), 'Email', BRAND.email, false));
      extra.push(actLink(gmailHref(email, subj, body), 'Gmail', BRAND.gmail, !IS_MOBILE));
      extra.push(actLink(outlookHref(email, subj, body), 'Outlook', BRAND.outlook, !IS_MOBILE));
    }

    if (anyPhone) {
      var r2 = anyPhone.querySelector('.cr-phone').value.trim();
      main.push(actLink(telHref(usableE164(r2, anyPhone.getAttribute('data-e164')) || r2), 'Call', BRAND.call, false));
    }

    var full = fieldVal('fullName'), company = fieldVal('company');
    if (full || company) {
      var q = (full + ' ' + companySearch(company)).trim();
      main.push(actLink(linkedinHref(q), 'LinkedIn', BRAND.linkedin, true));
      extra.push(actLink(webHref(q), 'Web search', BRAND.web, true));
    }

    reachBox.innerHTML = '';
    main.forEach(function (a) { reachBox.appendChild(a); });
    if (extra.length) {
      if (reachMoreOpen) extra.forEach(function (a) { reachBox.appendChild(a); });
      var more = document.createElement('button');
      more.type = 'button'; more.className = 'cr-act more';
      more.textContent = reachMoreOpen ? 'less' : 'more';
      more.setAttribute('aria-expanded', String(reachMoreOpen));
      more.addEventListener('click', function () { reachMoreOpen = !reachMoreOpen; buildReach(); });
      reachBox.appendChild(more);
    }
    show(reachBox, main.length + extra.length > 0);
  }

  ['fullName', 'company'].forEach(function (k) {
    var el = form.querySelector('[data-key="' + k + '"]');
    if (el) el.addEventListener('input', function () {
      // Once the user retypes the company, drop the scanned brand name.
      if (k === 'company') aiCompanySearch = '';
      buildReach();
    });
  });

  // flags: "check" for low-confidence reads, "not on card" for empty ones
  function flagFor(val, key, conf, fromScan) {
    if (!fromScan) return '';
    if (!val) return (key === 'notes') ? '' : 'not on card';
    var c = conf && typeof conf[key] === 'number' ? conf[key] : 1;
    return c < 0.6 ? 'check' : '';
  }

  function setField(key, val, conf, fromScan) {
    var el = form.querySelector('[data-key="' + key + '"]');
    if (!el) return;
    el.value = val || '';
    var row = el.closest('.cr-field');
    var f = row && row.querySelector('.cr-flag');
    if (f) f.textContent = flagFor(el.value, key, conf, fromScan);
  }

  function addressToString(a) {
    if (!a) return '';
    if (typeof a === 'string') return a;
    return [a.street, a.city, a.state, a.postalCode, a.country]
      .filter(function (x) { return x; }).join(', ');
  }

  function normType(t) {
    t = (t || '').toLowerCase();
    if (t.indexOf('cell') >= 0 || t.indexOf('mob') >= 0) return 'mobile';
    if (t.indexOf('work') >= 0 || t.indexOf('office') >= 0) return 'work';
    if (t.indexOf('home') >= 0) return 'home';
    return PHONE_TYPES.indexOf(t) >= 0 ? t : 'other';
  }

  function populateReview(d, fromScan) {
    var conf = d.confidence || {};
    aiCompanySearch = (d.searchName || '').trim();
    reachMoreOpen = false;
    setField('fullName', d.fullName || d.name || '', conf, fromScan);
    setField('jobTitle', d.jobTitle || d.title || '', conf, fromScan);
    setField('company', d.company || d.organization || '', conf, fromScan);
    setField('website', d.website || d.url || '', conf, fromScan);
    setField('address', addressToString(d.address), conf, fromScan);
    setField('notes', d.notes || '', conf, fromScan);

    emailsBox.innerHTML = '';
    var emails = Array.isArray(d.emails) ? d.emails : (d.email ? [d.email] : []);
    if (!emails.length) {
      var er = emailRow('');
      if (fromScan) er.querySelector('.cr-flag').textContent = 'not on card';
      emailsBox.appendChild(er);
    } else emails.forEach(function (e) { emailsBox.appendChild(emailRow(typeof e === 'string' ? e : e.value)); });

    phonesBox.innerHTML = '';
    var phones = Array.isArray(d.phones) ? d.phones : (d.phone ? [{ value: d.phone, type: 'mobile' }] : []);
    if (!phones.length) {
      var pr = phoneRow('', 'mobile');
      if (fromScan) pr.querySelector('.cr-flag').textContent = 'not on card';
      phonesBox.appendChild(pr);
    } else phones.forEach(function (p) {
      if (typeof p === 'string') phonesBox.appendChild(phoneRow(p, 'mobile'));
      else phonesBox.appendChild(phoneRow(p.value, p.isMobile ? 'mobile' : normType(p.type), p.e164 || '', !!p.isMobile));
    });

    buildReach();
    show(form, true);
    updateCheckCount();
  }

  // ---------- collect form into a contact object ----------
  function collectContact() {
    var emails = [].slice.call(emailsBox.querySelectorAll('.cr-email'))
      .map(function (i) { return i.value.trim(); }).filter(Boolean);
    var phones = [].slice.call(phonesBox.querySelectorAll('.cr-phone-row')).map(function (row) {
      var v = row.querySelector('.cr-phone').value.trim();
      var t = row.querySelector('.cr-ptype').value;
      return v ? { value: v, type: t } : null;
    }).filter(Boolean);
    return {
      fullName: fieldVal('fullName'),
      jobTitle: fieldVal('jobTitle'),
      company: fieldVal('company'),
      emails: emails,
      phones: phones,
      website: fieldVal('website'),
      address: fieldVal('address'),
      notes: fieldVal('notes')
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

  // ---------- toast + clipboard ----------
  var flash = $('copy-flash');
  function toast(msg) {
    if (!flash) return;
    flash.textContent = msg;
    flash.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { flash.classList.remove('show'); }, 1600);
  }
  function copyText(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(msg || 'Copied'); }).catch(function () { window.prompt('Copy:', text); });
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
  function needsSomething(c) { return !c.fullName && !c.company && !(c.emails || []).length; }

  $('btn-download-one').addEventListener('click', function () {
    var c = collectContact();
    if (needsSomething(c)) { toast('Add a name, company or email first'); return; }
    download(safeName(c) + '.vcf', toVCard(c), 'text/vcard');
  });
  $('btn-copy-one').addEventListener('click', function () { copyText(contactToText(collectContact()), 'Contact copied'); });
  $('btn-save').addEventListener('click', function () {
    var c = collectContact();
    if (needsSomething(c)) { toast('Add a name, company or email before saving'); return; }
    c.id = 'c' + Date.now() + Math.floor(Math.random() * 1000);
    c.createdAt = Date.now();
    dbPut(c).then(function () {
      freshId = c.id;
      resetAll();
      loadPhonebook();
      toast('Saved to your phonebook');
    });
  });

  function resetAll() {
    scanSeq++; // drop any in-flight read
    images = { front: null, back: null }; wantBack = false;
    renderCard();
    form.reset();
    emailsBox.innerHTML = ''; phonesBox.innerHTML = '';
    [].slice.call(form.querySelectorAll('.cr-flag')).forEach(function (f) { f.textContent = ''; });
    setStage('empty');
  }

  // ---------- IndexedDB phonebook ----------
  var DB_NAME = 'techtuate-card-reader';
  var STORE = 'contacts';
  var dbP = null;
  var memStore = [];
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
    }).catch(function () { /* IndexedDB unavailable: session-only memory */ memStore.push(c); });
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
      pbCount.textContent = list.length + ' saved in this browser';
      show(pbEmpty, list.length === 0);
      show(pbList, list.length > 0);
      show(pbBar, list.length > 0);
      pbList.innerHTML = '';
      list.forEach(function (c) { pbList.appendChild(pbItem(c)); });
    });
  }

  function hueFor(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
  }
  function initials(c) {
    var src = (c.fullName || c.company || '?').trim();
    return src.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
  }

  function pbItem(c) {
    var el = document.createElement('div');
    el.className = 'cr-pb-item' + (c.id === freshId ? ' fresh' : '');
    var h = hueFor((c.fullName || '') + (c.company || ''));
    var orb = document.createElement('span');
    orb.className = 'cr-orb'; orb.setAttribute('aria-hidden', 'true');
    orb.style.setProperty('--h1', String(h));
    orb.style.setProperty('--h2', String((h + 320) % 360));
    orb.textContent = initials(c);

    var main = document.createElement('div');
    main.className = 'cr-pb-main';
    var name = document.createElement('div');
    name.className = 'cr-pb-name'; name.textContent = c.fullName || c.company || 'Unnamed contact';
    var sub = document.createElement('div');
    sub.className = 'cr-pb-sub';
    sub.textContent = [c.jobTitle, c.company].filter(Boolean).join(', ') ||
      [(c.emails || [])[0], (c.phones || [])[0] && c.phones[0].value].filter(Boolean).join(' \u00b7 ');
    main.appendChild(name); main.appendChild(sub);

    var more = document.createElement('button');
    more.type = 'button'; more.className = 'cr-more';
    more.setAttribute('aria-label', 'Options for ' + (c.fullName || c.company || 'this contact'));
    more.setAttribute('aria-expanded', 'false');
    more.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';

    var menu = document.createElement('div');
    menu.className = 'cr-menu'; menu.hidden = true; menu.setAttribute('role', 'menu');
    menu.appendChild(menuBtn('Download .vcf', function () { download(safeName(c) + '.vcf', toVCard(c), 'text/vcard'); }));
    menu.appendChild(menuBtn('Copy details', function () { copyText(contactToText(c), 'Contact copied'); }));
    menu.appendChild(menuBtn('Delete', function () { dbDel(c.id).then(loadPhonebook); }, 'danger'));

    more.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.hidden;
      closeMenus();
      menu.hidden = !open;
      more.setAttribute('aria-expanded', String(open));
    });

    el.appendChild(orb); el.appendChild(main); el.appendChild(more); el.appendChild(menu);
    return el;
  }
  function menuBtn(label, fn, cls) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.setAttribute('role', 'menuitem');
    if (cls) b.className = cls;
    b.addEventListener('click', function () { closeMenus(); fn(); });
    return b;
  }
  function closeMenus() {
    [].slice.call(document.querySelectorAll('.cr-menu')).forEach(function (m) { m.hidden = true; });
    [].slice.call(document.querySelectorAll('.cr-more')).forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
  }
  document.addEventListener('click', closeMenus);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(); });

  $('btn-export-vcf').addEventListener('click', function () {
    if (!current.length) return;
    download('techtuate-contacts.vcf', current.map(toVCard).join('\r\n'), 'text/vcard');
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

  // ---------- feedback mailto (assembled at click time) ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.tt-feedback');
    if (!a) return;
    a.href = 'mailto:' + ['joshi', 'gaurav'].join('') + '@' + ['gmail', '.com'].join('') + '?subject=' + encodeURIComponent('techtuate feedback');
  }, true);

  // ---------- init ----------
  renderCard();
  setStage('empty');
  loadPhonebook();
})();
