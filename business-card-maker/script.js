/* ============================================================
   techtuate business card maker - app
   Steps: format -> template -> details -> download   (print)
          format -> details -> QR style + download     (digital only)
   Everything is drawn in the browser (engine.js + templates.js).
   The only network call is the optional "digitize your card" scan
   (/api/scan, labeled on the page). The design is kept in
   localStorage in this browser only.
   ============================================================ */
(function () {
  'use strict';

  var BCM = window.BCM, TEMPLATES = window.BCM_TEMPLATES, CATS = window.BCM_CATS;
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var yr = $('yr'); if (yr) yr.textContent = new Date().getFullYear();

  // ---------- constants ----------
  var STORE_KEY = 'techtuate-bcm-v1';
  var SIZES = {
    us:   { w: 88.9, h: 50.8, b: 3.175, label: 'US 3.5 x 2 in' },
    eu:   { w: 85,   h: 55,   b: 3,     label: 'EU 85 x 55' },
    asia: { w: 90,   h: 54,   b: 3,     label: 'Asia 90 x 54' }
  };
  var FIELDS = [
    { k: 'name', label: 'Name', ph: 'Your full name', qr: true },
    { k: 'title', label: 'Title', ph: 'Job title', qr: true },
    { k: 'company', label: 'Company', ph: 'Company or brand', qr: true },
    { k: 'mobile', label: 'Mobile', ph: '+60 12-345 6789', qr: true, type: 'tel' },
    { k: 'office', label: 'Office', ph: 'Office phone', qr: true, type: 'tel' },
    { k: 'email', label: 'Email', ph: 'you@company.com', qr: true, type: 'email' },
    { k: 'web', label: 'Website', ph: 'company.com', qr: true },
    { k: 'address', label: 'Address', ph: 'Street, city', qr: true },
    { k: 'linkedin', label: 'LinkedIn', ph: 'linkedin.com/in/you', qr: true },
    { k: 'tagline', label: 'Tagline', ph: 'optional, used on some templates', qr: false }
  ];
  var QR_DEFAULT = { name: 1, title: 1, company: 1, mobile: 1, office: 0, email: 1, web: 1, address: 0, linkedin: 0 };
  var FONT_CHOICES = [
    { id: 'serif', label: 'Serif', tag: 'CLASSIC', css: '"BCM Serif"', f: { b: 'serif700', r: 'serif400', i: 'serif400i' } },
    { id: 'sans', label: 'Sans', tag: 'CLEAN', css: '"BCM Sans"', f: { b: 'sans700', r: 'sans400', i: 'sans400' } },
    { id: 'geo', label: 'Geo', tag: 'MODERN', css: '"BCM Geo"', f: { b: 'geo700', r: 'geo400', i: 'geo400' } },
    { id: 'display', label: 'Display', tag: 'ELEGANT', css: '"BCM Display"', f: { b: 'disp700', r: 'disp400', i: 'disp400i' } },
    { id: 'mono', label: 'Mono', tag: 'TECHNICAL', css: '"BCM Mono"', f: { b: 'mono500', r: 'mono400', i: 'mono400' } },
    { id: 'italic', label: 'Italic', tag: 'BOUTIQUE', css: '"BCM Display"', style: 'italic', f: { b: 'disp400i', r: 'disp400i', i: 'disp400i' } }
  ];
  var SWATCHES = ['#1b2a4a', '#2f5d50', '#8a1c2b', '#e85d2a', '#0f6b8f', '#a07d3b', '#6b3fa0', '#1d1d1f'];
  var DQ_COLORS = ['#111111', '#1b2a4a', '#8a1c2b', '#2f5d50', '#6b3fa0'];
  var SAMPLE = { name: 'Alex Morgan', title: 'Head of Partnerships', company: 'Northbridge Studio', tagline: 'Good work, well made',
    mobile: '+60 12-345 6789', office: '+60 3-2141 5566', email: 'alex@northbridge.studio', web: 'northbridge.studio',
    address: '18 Jalan Telawi, Bangsar, Kuala Lumpur', linkedin: '' };

  // ---------- state ----------
  function defaultSize() {
    var lang = (navigator.language || 'en-US');
    if (/-US$|-CA$/i.test(lang) || lang === 'en') return 'us';
    if (/-(MY|SG|JP|CN|KR|TW|HK|TH|ID|PH|VN|IN|BD|PK|LK|AE|SA)$/i.test(lang) || /^(ms|ja|zh|ko|th|id|vi|hi)/i.test(lang)) return 'asia';
    return 'eu';
  }
  function freshState() {
    return { v: 1, format: 'double', tpl: 'boardroom', size: defaultSize(), accent: null, font: null, step: 0,
      d: {}, logoMeta: null, logoRaw: null, logoBg: 'auto', qr: { mode: 'vcard', f: Object.assign({}, QR_DEFAULT), link: '', offline: false }, logo: null,
      dq: { logo: 1, fg: '#111111', caption: 1 }, paper: /-US$|-CA$/i.test(navigator.language || '') ? 'letter' : 'a4', pngBleed: false };
  }
  var S = freshState();
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && saved.v === 1) S = Object.assign(freshState(), saved, { qr: Object.assign(freshState().qr, saved.qr || {}), dq: Object.assign(freshState().dq, saved.dq || {}) });
  } catch (e) {}
  var saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      var keep = Object.assign({}, S, { logo: null }); // the cleaned logo is rebuilt from logoRaw on load
      try { localStorage.setItem(STORE_KEY, JSON.stringify(keep)); }
      catch (e) { try { localStorage.setItem(STORE_KEY, JSON.stringify(Object.assign(keep, { logoRaw: null, logoMeta: null }))); } catch (e2) {} }
    }, 250);
  }

  // ---------- helpers ----------
  var toastEl = $('toast');
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }
  function tpl() { return TEMPLATES.filter(function (t) { return t.id === S.tpl; })[0] || TEMPLATES[0]; }
  // portrait templates use the same card size turned upright
  function dims(t) { var z = SIZES[S.size] || SIZES.us; return t && t.portrait ? { w: z.h, h: z.w, b: z.b, label: z.label + ' upright' } : z; }
  function size() { return dims(tpl()); }
  function fontChoice(t) { var id = S.font || t.font; return FONT_CHOICES.filter(function (f) { return f.id === id; })[0] || FONT_CHOICES[0]; }
  function accentOf(t) { return S.accent || t.accent; }
  function isDigital() { return S.format === 'digital'; }
  function flow() { return isDigital() ? ['format', 'details', 'qr'] : ['format', 'template', 'details', 'download']; }
  function trimv(s) { return String(s || '').trim(); }
  function details() { var d = {}; FIELDS.forEach(function (f) { d[f.k] = trimv(S.d[f.k]); }); return d; }
  function previewDetails() {
    var d = details();
    if (!d.name && !d.company && !d.email && !d.mobile) return Object.assign({}, SAMPLE);
    if (!d.name) d.name = 'Your Name';
    return d;
  }
  function download(name, blobOrUrl) {
    var a = document.createElement('a');
    a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    if (typeof blobOrUrl !== 'string') setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  // Save a vCard so it lands in the phone's contacts, not a text viewer.
  // iPhone/iPad: open the card in Safari, which shows the native "Create New Contact" sheet.
  // Android: download as text/x-vcard, the type the Contacts app opens.
  // Computers: plain download (Outlook, Apple Contacts or a Google Contacts import).
  function saveContact(filename, text) {
    var ua = navigator.userAgent || '';
    var ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var android = /Android/i.test(ua);
    var blob = new Blob([text], { type: android ? 'text/x-vcard' : 'text/vcard' });
    var url = URL.createObjectURL(blob);
    if (ios) { window.location.href = url; setTimeout(function () { URL.revokeObjectURL(url); }, 60000); return; }
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function fileBase() {
    var n = (trimv(S.d.name) || 'business-card').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return n || 'business-card';
  }

  // ---------- vCard + QR payload ----------
  function vEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
  function normUrl(u) { u = trimv(u); if (!u) return ''; return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u; }
  function vcard(all) {
    var d = details(), f = all ? { name: 1, title: 1, company: 1, mobile: 1, office: 1, email: 1, web: 1, address: 1, linkedin: 1 } : S.qr.f;
    var L = ['BEGIN:VCARD', 'VERSION:3.0'];
    var nm = d.name || d.company || 'Contact', parts = nm.split(/\s+/), last = parts.length > 1 ? parts.pop() : '', first = parts.join(' ');
    L.push('N:' + vEsc(last) + ';' + vEsc(first) + ';;;');
    L.push('FN:' + vEsc(nm));
    if (f.company && d.company) L.push('ORG:' + vEsc(d.company));
    if (f.title && d.title) L.push('TITLE:' + vEsc(d.title));
    if (f.mobile && d.mobile) L.push('TEL;TYPE=CELL:' + d.mobile.replace(/[^\d+]/g, ''));
    if (f.office && d.office) L.push('TEL;TYPE=WORK,VOICE:' + d.office.replace(/[^\d+]/g, ''));
    if (f.email && d.email) L.push('EMAIL;TYPE=INTERNET:' + vEsc(d.email));
    if (f.web && d.web) L.push('URL:' + vEsc(normUrl(d.web)));
    if (f.address && d.address) L.push('ADR;TYPE=WORK:;;' + vEsc(d.address) + ';;;;');
    if (f.linkedin && d.linkedin) L.push('X-SOCIALPROFILE;TYPE=linkedin:' + vEsc(normUrl(d.linkedin)));
    L.push('END:VCARD');
    return L.join('\r\n');
  }
  // Contact link: https://techtuate.com/c/#1<base64url>. The contact rides in the part after "#",
  // which browsers never send to a server; /c/ decodes it and saves it to the phone's contacts.
  // Every scanner app opens links, while many show a raw vCard as plain text.
  var LINK_KEYS = ['name', 'title', 'company', 'mobile', 'office', 'email', 'web', 'address', 'linkedin'];
  function contactLink() {
    var d = details(), f = S.qr.f;
    var vals = LINK_KEYS.map(function (k) { return f[k] ? String(d[k] || '').replace(/[\u0000-\u001f]/g, ' ') : ''; });
    vals.push(String(accentOf(tpl())).replace('#', '').toLowerCase());
    var bytes = new TextEncoder().encode(vals.join('\u001f')), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return 'https://techtuate.com/c/#1' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function contactPayload() { return S.qr.offline ? vcard(false) : contactLink(); }
  function qrPayload() {
    if (S.qr.mode === 'none' && !isDigital()) return '';
    if (S.qr.mode === 'link') return normUrl(S.qr.link || S.d.web || S.d.linkedin);
    var d = details();
    if (!d.name && !d.company && !d.email && !d.mobile) {
      // nothing typed yet: preview with the sample so the layout is visible
      var keep = S.d; S.d = SAMPLE; var v = contactPayload(); S.d = keep; return v;
    }
    return contactPayload();
  }
  var qrCache = { key: '', q: null };
  function qrMatrix(ecl) {
    var text = qrPayload(), key = text + '|' + ecl;
    if (qrCache.key !== key) { qrCache = { key: key, q: text ? BCM.makeQR(text, ecl) : null }; }
    return qrCache.q;
  }

  // ---------- card rendering ----------
  function opts(t, o) {
    var sz = size();
    return Object.assign({ accent: accentOf(t), fonts: fontChoice(t).f, qr: qrMatrix('M'), logo: S.logo, logoAR: S.logoMeta && S.logoMeta.ar, logoInk: S.logoMeta && S.logoMeta.ink,
      oneSided: S.format === 'single', qrKind: S.qr.mode, B: sz.b }, o || {});
  }
  function faces(t, d, o) {
    var sz = dims(t), W = sz.w, H = sz.h;
    var out = [{ side: 'front', els: t.front(W, H, d, o) }];
    if (S.format === 'double') out.push({ side: 'back', els: t.back(W, H, d, o) });
    return out;
  }
  function svgFace(els, opt) { var sz = size(); return BCM.toSVG(els, sz.w, sz.h, opt || {}); }

  // ---------- steps ----------
  var stepsEl = $('steps');
  var STEP_LABEL = { format: 'Format', template: 'Template', details: 'Details & QR', download: 'Download', qr: 'QR style & download' };
  function stepName() { var f = flow(); S.step = Math.max(0, Math.min(S.step, f.length - 1)); return f[S.step]; }
  function renderSteps() {
    var f = flow(), cur = stepName();
    stepsEl.innerHTML = f.map(function (s, i) {
      return '<button type="button" class="bcm-step' + (i < S.step ? ' done' : '') + '" role="tab" aria-selected="' + (s === cur) + '" data-step="' + i + '"><span class="n">' + (i < S.step ? '&#10003;' : (i + 1)) + '</span>' + STEP_LABEL[s] + '</button>';
    }).join('');
    $$('.bcm-pane').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-step') === cur); });
    document.body.classList.toggle('is-digital', isDigital());
    $('details-split').classList.toggle('single', isDigital());
    $('details-step-label').textContent = 'step ' + (flow().indexOf('details') + 1);
    if (cur === 'template') renderGallery();
    if (cur === 'details') renderDetails();
    if (cur === 'download') renderFinal();
    if (cur === 'qr') renderDQ();
  }
  function go(i) {
    S.step = i; save(); renderSteps();
    var top = stepsEl.getBoundingClientRect().top + window.scrollY - 90;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' });
  }
  stepsEl.addEventListener('click', function (e) { var b = e.target.closest('[data-step]'); if (b) go(+b.getAttribute('data-step')); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b) { go(S.step + (b.getAttribute('data-go') === 'next' ? 1 : -1)); return; }
    if (e.target.closest('[data-reset]')) {
      if (!window.confirm('Start a new card? This clears your details, logo and design from this browser.')) return;
      S = freshState(); try { localStorage.removeItem(STORE_KEY); } catch (err) {}
      buildFields(); renderAll(); go(0); toast('Started fresh');
    }
  });

  // ---------- step 1: format ----------
  $$('.bcm-fmt').forEach(function (b) {
    b.addEventListener('click', function () {
      S.format = b.getAttribute('data-format');
      if (isDigital() && S.qr.mode === 'none') S.qr.mode = 'vcard';
      save(); renderFormat(); renderSteps();
    });
  });
  function renderFormat() {
    $$('.bcm-fmt').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-format') === S.format)); });
    var q = BCM.makeQR('https://techtuate.com/business-card-maker/', 'M');
    if (q) {
      var n = q.n, d = [];
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.get(r, c)) d.push('M' + c + ' ' + r + 'h1v1h-1z');
      $('fmt-qr').innerHTML = '<svg viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges"><path d="' + d.join('') + '" fill="#111"/></svg>';
    }
  }

  // ---------- step 2: template gallery ----------
  var filter = 'all';
  function inFilter(t) { return filter === 'all' || (filter === 'portrait' ? !!t.portrait : t.cat === filter); }
  $('filters').innerHTML = CATS.map(function (c) { return '<button type="button" data-cat="' + c.id + '" aria-pressed="' + (c.id === 'all') + '">' + c.label.replace(/&/g, '&amp;') + '</button>'; }).join('');
  $('filters').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]'); if (!b) return;
    filter = b.getAttribute('data-cat');
    $$('[data-cat]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $$('.bcm-tpl').forEach(function (el) { el.hidden = !inFilter(TEMPLATES[+el.getAttribute('data-i')]); });
  });
  var galleryKey = '';
  function renderGallery() {
    var d = previewDetails(), key = JSON.stringify([d, S.size, S.logo ? S.logo.length : 0, S.logoMeta, S.qr, S.format]);
    if (key !== galleryKey) {
      galleryKey = key;
      $('gallery').innerHTML = TEMPLATES.map(function (t, i) {
        var o = opts(t, { accent: t.accent, fonts: FONT_CHOICES.filter(function (f) { return f.id === t.font; })[0].f, oneSided: false });
        var sz = dims(t);
        var front = BCM.toSVG(t.front(sz.w, sz.h, d, o), sz.w, sz.h), back = BCM.toSVG(t.back(sz.w, sz.h, d, o), sz.w, sz.h);
        return '<button type="button" class="bcm-tpl' + (t.portrait ? ' portrait' : '') + '" role="radio" data-i="' + i + '"' + (inFilter(t) ? '' : ' hidden') + '>' +
          '<span class="bcm-tpl-pair"><span class="face" style="display:block">' + front + '</span><span class="face back">' + back + '</span></span>' +
          '<span class="bcm-tpl-h">' + t.name + '<small>' + (i < 9 ? '0' : '') + (i + 1) + '</small></span>' +
          '<span class="bcm-tpl-for">' + t.for + '</span>' +
          '<span class="bcm-inds">' + t.inds.map(function (x) { return '<span>' + x.replace(/&/g, '&amp;') + '</span>'; }).join('') + '</span></button>';
      }).join('');
    }
    $$('.bcm-tpl').forEach(function (el) { el.setAttribute('aria-checked', String(TEMPLATES[+el.getAttribute('data-i')].id === S.tpl)); });
    if (typeof applySuggest === 'function') applySuggest(false);
  }
  $('gallery').addEventListener('click', function (e) {
    var b = e.target.closest('.bcm-tpl'); if (!b) return;
    var t = TEMPLATES[+b.getAttribute('data-i')];
    if (S.tpl === t.id) { b.classList.toggle('flip'); return; } // second tap shows the back on touch screens
    S.tpl = t.id; S.accent = null; S.font = null; save(); renderGallery();
  });

  // ---------- describe your business -> suggested templates ----------
  // A plain keyword match, no AI: the choice is only eight templates, so a curated word list
  // per template does the job instantly and nothing leaves the browser.
  // Stems match the start of a word ("account" matches accountant, accounting); short ones
  // (3 letters or fewer) must match exactly. Weight 3 = core fit, 1 = also fits.
  var FIT = {
    boardroom: [3, 'law lawyer legal attorney solicitor barrister advocate notary counsel consult advis strateg financ invest wealth capital private equity venture partner executive director ceo corporate management governance policy diplomat recruit headhunt', 1, 'real estate property board trust'],
    ledger: [3, 'account cpa audit tax bank insur actuar bookkeep payroll fund pension credit loan mortgage treasur complian risk broker fintech valuat', 1, 'financ invest wealth consult advis'],
    blueprint: [3, 'engineer construct builder contractor energy solar renewab wind oil gas petrol lubric power electric mechanic manufactur factory industr logistic shipping freight supply chain warehouse mining steel metal chemical automotive plumb weld hvac survey civil infrastructure utilit machin fabricat aerospace marine', 1, 'architect drone robot hardware'],
    studio: [3, 'design creative architect interior photo film video studio agency art artist illustrat music producer writer author copywrit content media stylist tattoo animat ux ui brand portfolio freelanc', 1, 'fashion market advertis wedding boutique'],
    colorblock: [3, 'sales market retail fmcg consumer ecommerce startup entrepreneur growth advertis event distribut franchise trade dealer beverage promo sport fitness gym trainer agent', 1, 'shop store food brand founder business'],
    clinic: [3, 'health medic doctor dentist dental clinic hospital nurse therap physio pharma wellness yoga pilates psycholog nutrition dietit vet care school educat teach tutor coach university academ nonprofit ngo charit foundation volunteer church mosque temple counsell midwife optometr chiropract', 1, 'spa massage science research'],
    terminal: [3, 'software code coder program saas tech data analytic cloud cyber security devops web app digital crypto blockchain hardware robot machine learning gaming game', 1, 'develop startup engineer founder automation'],
    tower: [3, 'founder cofounder product media podcast influencer creator youtube event speaker startup', 1, 'marketing growth tech app agency author'],
    atelier: [3, 'fashion couture bridal makeup cosmetic skincare perfume gallery curator model jewel stylist boutique beauty', 1, 'architect interior design art florist salon photo'],
    heritage: [3, 'hotel hospitality restaurant cafe coffee bakery baker patisser food catering chef bar wine winery brew distill spa salon beauty real estate property realtor boutique jewel luxury wedding florist flower travel tour resort venue antique craft artisan tailor butcher tea', 1, 'interior fashion event']
  };
  var SHORT_FIT = { law: 'boardroom', cpa: 'ledger', tax: 'ledger', it: 'terminal', ai: 'terminal', ml: 'terminal', dev: 'terminal', ux: 'studio', ui: 'studio', gym: 'colorblock', spa: 'heritage', bar: 'heritage', pr: 'colorblock', hr: 'boardroom', ngo: 'clinic', vet: 'clinic', gp: 'clinic', fnb: 'heritage', oil: 'blueprint', gas: 'blueprint', tea: 'heritage', app: 'terminal', art: 'studio' };
  function suggest(text) {
    var t = ' ' + String(text || '').toLowerCase().replace(/f\s*&\s*b/g, 'fnb').replace(/non[\s-]+profit/g, 'nonprofit').replace(/[^a-z0-9]+/g, ' ') + ' ';
    var words = t.trim().split(' ').filter(Boolean);
    if (!words.length) return [];
    var res = TEMPLATES.map(function (tp) {
      var spec = FIT[tp.id] || [], score = 0, hits = [];
      for (var k = 0; k < spec.length; k += 2) {
        var w = spec[k];
        spec[k + 1].split(' ').forEach(function (stem) {
          var hit = null;
          if (stem.indexOf(' ') < 0 && stem.length <= 3) { if (words.indexOf(stem) >= 0) hit = stem; }
          else words.forEach(function (x) { if (!hit && x.length >= 3 && x.indexOf(stem) === 0) hit = x; });
          if (!hit && / /.test(stem) && t.indexOf(' ' + stem) >= 0) hit = stem;
          if (hit) { score += w; if (hits.indexOf(hit) < 0) hits.push(hit); }
        });
      }
      words.forEach(function (x) { if (SHORT_FIT[x] === tp.id) { score += 3; if (hits.indexOf(x) < 0) hits.push(x); } });
      return { id: tp.id, name: tp.name, score: score, hits: hits };
    }).filter(function (r) { return r.score > 0; });
    res.sort(function (a, b) { return b.score - a.score; });
    return res.slice(0, 3);
  }
  var bizT = null, lastPick = '';
  $('biz').value = S.biz || '';
  $('biz').addEventListener('input', function () {
    S.biz = this.value; save();
    clearTimeout(bizT); bizT = setTimeout(function () { applySuggest(true); }, 180);
  });
  $('biz-out').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pick]'); if (!b) return;
    S.tpl = b.getAttribute('data-pick'); S.accent = null; S.font = null; save(); renderGallery();
  });
  function applySuggest(autoPick) {
    var out = $('biz-out'), r = suggest(S.biz), top = r[0] ? r[0].score : 0;
    var good = r.filter(function (x) { return x.score >= Math.max(3, top / 2); });
    $$('.bcm-tpl').forEach(function (el) {
      var id = TEMPLATES[+el.getAttribute('data-i')].id, i = -1;
      good.forEach(function (g, j) { if (g.id === id) i = j; });
      var badge = el.querySelector('.bcm-fit'); if (badge) badge.remove();
      el.style.order = i >= 0 ? i - 10 : '';
      el.classList.toggle('dim', good.length > 0 && i < 0);
      if (i >= 0) { var s = document.createElement('span'); s.className = 'bcm-fit' + (i ? ' good' : ''); s.textContent = i ? 'good fit' : 'best fit'; el.appendChild(s); }
    });
    if (!trimv(S.biz)) { out.textContent = 'We’ll suggest the templates that suit your line of work.'; return; }
    if (!good.length) { out.textContent = 'No close match for that. Boardroom and Studio suit almost any business.'; return; }
    out.innerHTML = 'Suggested: ' + good.map(function (g) { return '<button type="button" data-pick="' + g.id + '">' + g.name + '</button>'; }).join(', ') +
      '. <span class="bcm-why">Matched ' + good[0].hits.slice(0, 3).map(function (h) { return '“' + h + '”'; }).join(', ') + '.</span>';
    if (autoPick && good[0].id !== lastPick) {
      lastPick = good[0].id;
      if (filter !== 'all') $$('#filters [data-cat="all"]')[0].click();
      S.tpl = good[0].id; S.accent = null; S.font = null; save();
      $$('.bcm-tpl').forEach(function (el) { el.setAttribute('aria-checked', String(TEMPLATES[+el.getAttribute('data-i')].id === S.tpl)); });
    }
  }

  // ---------- step 3: details ----------
  var fieldsEl = $('fields');
  function buildFields() {
    fieldsEl.innerHTML = FIELDS.map(function (f) {
      return '<label class="bcm-f"><span>' + f.label + '</span><input type="' + (f.type || 'text') + '" data-k="' + f.k + '" placeholder="' + f.ph + '" autocomplete="off" />' +
        (f.qr ? '<button type="button" class="bcm-q" data-qk="' + f.k + '"></button>' : '<em class="bcm-q">card only</em>') + '</label>';
    }).join('');
    $$('input[data-k]', fieldsEl).forEach(function (inp) { inp.value = S.d[inp.getAttribute('data-k')] || ''; });
  }
  fieldsEl.addEventListener('input', function (e) {
    var k = e.target.getAttribute('data-k'); if (!k) return;
    S.d[k] = e.target.value; save(); scheduleLive();
  });
  fieldsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qk]'); if (!b || S.qr.mode !== 'vcard') return;
    e.preventDefault();
    var k = b.getAttribute('data-qk'); S.qr.f[k] = S.qr.f[k] ? 0 : 1; save(); renderQRControls(); scheduleLive();
  });

  // QR contents
  $('qr-mode').addEventListener('click', function (e) {
    var b = e.target.closest('[data-qr]'); if (!b) return;
    S.qr.mode = b.getAttribute('data-qr'); save(); renderQRControls(); scheduleLive();
  });
  $('qr-fields').addEventListener('click', function (e) {
    var b = e.target.closest('[data-qf]'); if (!b) return;
    var k = b.getAttribute('data-qf'); S.qr.f[k] = S.qr.f[k] ? 0 : 1; save(); renderQRControls(); scheduleLive();
  });
  $('qr-offline').addEventListener('change', function () { S.qr.offline = this.checked; save(); renderQRControls(); scheduleLive(); if (isDigital()) renderDQ(); });
  $('qr-link').addEventListener('input', function (e) { S.qr.link = e.target.value; save(); renderQRControls(); scheduleLive(); });
  function renderQRControls() {
    if (isDigital() && S.qr.mode === 'none') S.qr.mode = 'vcard';
    $$('#qr-mode [data-qr]').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-qr') === S.qr.mode)); });
    var vc = S.qr.mode === 'vcard';
    $('qr-fields').hidden = !vc;
    $('qr-fields').innerHTML = FIELDS.filter(function (f) { return f.qr; }).map(function (f) {
      var on = !!S.qr.f[f.k];
      return '<button type="button" role="checkbox" data-qf="' + f.k + '" aria-checked="' + on + '"><span class="bx" aria-hidden="true">' + (on ? '&#10003;' : '') + '</span>' + f.label + '</button>';
    }).join('');
    $('qr-link-wrap').hidden = S.qr.mode !== 'link';
    $('qr-how').hidden = !vc;
    $('qr-offline').checked = !!S.qr.offline;
    if (S.qr.mode === 'link' && !S.qr.link && document.activeElement !== $('qr-link')) $('qr-link').value = '';
    else if (document.activeElement !== $('qr-link')) $('qr-link').value = S.qr.link || '';
    $('qr-link').placeholder = S.d.web ? normUrl(S.d.web) : 'https://your-site.com or a LinkedIn profile';
    $$('[data-qk]', fieldsEl).forEach(function (b) {
      var k = b.getAttribute('data-qk'), on = vc && !!S.qr.f[k];
      b.hidden = !vc;
      b.classList.toggle('on', on); b.textContent = on ? 'in QR' : 'card only';
      b.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + k + (on ? ' from' : ' to') + ' the QR code');
    });
    // size meter: how fine the modules get on a ~18 mm printed QR
    var meter = $('qr-meter'), q = qrMatrix(isDigital() && S.dq.logo && S.logo ? 'H' : 'M');
    meter.hidden = !q || isDigital();
    if (q && !isDigital()) {
      var mod = 18 / (q.n + 2), pct = Math.max(12, Math.min(100, (mod - 0.2) / (0.55 - 0.2) * 100));
      meter.querySelector('i').style.width = pct + '%';
      var warn = mod < 0.28;
      meter.classList.toggle('warn', warn);
      meter.querySelector('.bcm-meter-t').textContent = warn
        ? 'Dense QR: it may not scan reliably at card size. Untick a field or two.'
        : (mod < 0.4 ? 'QR size: fine at card size. Fewer fields make it quicker to scan.' : 'QR size: easy to scan at 2 cm.');
    }
  }

  // look: accent + font
  function renderLook() {
    var t = tpl(), acc = accentOf(t), list = [t.accent].concat(SWATCHES.filter(function (c) { return c.toLowerCase() !== t.accent.toLowerCase(); })).slice(0, 8);
    var custom = list.indexOf(acc) < 0;
    $('swatches').innerHTML = list.map(function (c) { return '<button type="button" role="radio" aria-checked="' + (c === acc) + '" data-color="' + c + '" style="background:' + c + '" aria-label="Accent ' + c + '"></button>'; }).join('') +
      '<label class="cust' + (custom ? ' on' : '') + '" title="Custom color"' + (custom ? ' style="background:' + acc + '"' : '') + '>' + (custom ? '' : '+') + '<input type="color" id="acc-custom" value="' + acc + '" aria-label="Custom accent color" /></label>';
    var fc = fontChoice(t);
    $('fonts').innerHTML = FONT_CHOICES.map(function (f) {
      return '<button type="button" role="radio" aria-checked="' + (f.id === fc.id) + '" data-font="' + f.id + '" style="font-family:' + f.css + ';font-style:' + (f.style || 'normal') + '">Aa ' + f.label + '<small>' + f.tag + '</small></button>';
    }).join('');
  }
  $('swatches').addEventListener('click', function (e) { var b = e.target.closest('[data-color]'); if (!b) return; S.accent = b.getAttribute('data-color'); save(); renderLook(); scheduleLive(); });
  $('swatches').addEventListener('input', function (e) { if (e.target.id === 'acc-custom') { S.accent = e.target.value; save(); scheduleLive(); } });
  $('swatches').addEventListener('change', function (e) { if (e.target.id === 'acc-custom') renderLook(); });
  $('fonts').addEventListener('click', function (e) { var b = e.target.closest('[data-font]'); if (!b) return; S.font = b.getAttribute('data-font'); save(); renderLook(); scheduleLive(); });

  // sizes
  $('sizes').innerHTML = Object.keys(SIZES).map(function (k) { return '<button type="button" role="radio" data-size="' + k + '">' + SIZES[k].label + '</button>'; }).join('');
  $('sizes').addEventListener('click', function (e) { var b = e.target.closest('[data-size]'); if (!b) return; S.size = b.getAttribute('data-size'); save(); scheduleLive(); });

  // logo
  // S.logoRaw = the uploaded logo (rasterised, max 1200 px), S.logoBg = 'auto' | 'remove' | 'keep',
  // S.logo = the cleaned version the cards use (rebuilt from logoRaw, not saved separately).
  $('btn-logo').addEventListener('click', function () { $('logo-file').click(); });
  $('btn-logo-rm').addEventListener('click', function () { S.logo = S.logoRaw = S.logoMeta = null; S.logoBg = 'auto'; save(); renderLogo(); galleryKey = ''; scheduleLive(); });
  $('logo-file').addEventListener('change', function () {
    var f = this.files && this.files[0]; this.value = '';
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      rasterLogo(rd.result).then(function (raw) {
        S.logoRaw = raw; S.logoBg = 'auto';
        return applyLogo().then(function () {
          if (S.logoMeta.removed) toast('Removed the logo’s background. You can keep it instead.');
        });
      }).catch(function () { toast('That image could not be read. Try a PNG, JPG or SVG.'); });
    };
    rd.readAsDataURL(f);
  });
  $('logo-bg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-bg]'); if (!b || !S.logoRaw) return;
    S.logoBg = b.getAttribute('data-bg'); applyLogo();
  });
  function loadImage(src) {
    return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = src; });
  }
  // Any upload -> PNG, max 1200 px on the long side. SVGs are rasterised at 1200 px (sharp for print).
  function rasterLogo(src) {
    return loadImage(src).then(function (im) {
      var nw = im.naturalWidth || 1200, nh = im.naturalHeight || 1200, isSvg = /^data:image\/svg/.test(src);
      var s = isSvg ? 1200 / Math.max(nw, nh) : Math.min(1, 1200 / Math.max(nw, nh));
      var cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(nw * s)); cv.height = Math.max(1, Math.round(nh * s));
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/png');
    });
  }
  function applyLogo() {
    return prepLogo(S.logoRaw, S.logoBg).then(function (r) {
      S.logo = r.src; S.logoMeta = r.meta; save(); renderLogo(); galleryKey = ''; scheduleLive();
      if (isDigital() && stepName() === 'qr') renderDQ();
    });
  }
  // Clean up a logo so it sits well on any card:
  // - detects a solid background (the border of the image is one opaque color)
  // - removes it when asked ('auto' removes white only; 'remove' removes any color)
  // - trims empty margins, then measures aspect ratio and ink color
  //   (used to fit the logo and to add a contrast chip on dark cards)
  function prepLogo(src, mode) {
    return loadImage(src).then(function (im) {
      var cw = im.naturalWidth, ch = im.naturalHeight;
      var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      var g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
      var px = g.getImageData(0, 0, cw, ch), d = px.data, i, x, y;
      // sample the border: is it one solid, opaque color?
      var sr = 0, sg = 0, sb = 0, sn = 0, opaque = 0, samples = [];
      var step = Math.max(1, Math.floor((cw + ch) / 200));
      for (x = 0; x < cw; x += step) { samples.push((0 * cw + x) * 4, ((ch - 1) * cw + x) * 4); }
      for (y = 0; y < ch; y += step) { samples.push((y * cw) * 4, (y * cw + cw - 1) * 4); }
      samples.forEach(function (k) { if (d[k + 3] > 240) { opaque++; sr += d[k]; sg += d[k + 1]; sb += d[k + 2]; sn++; } });
      var bg = sn ? [sr / sn, sg / sn, sb / sn] : null, near = 0;
      if (bg) samples.forEach(function (k) { if (d[k + 3] > 240 && Math.abs(d[k] - bg[0]) + Math.abs(d[k + 1] - bg[1]) + Math.abs(d[k + 2] - bg[2]) < 60) near++; });
      var hasBg = !!bg && opaque / samples.length > 0.9 && near / samples.length > 0.85;
      var bgWhite = hasBg && Math.min(bg[0], bg[1], bg[2]) > 225;
      var remove = hasBg && (mode === 'remove' || (mode !== 'keep' && bgWhite));
      if (remove) {
        // knock out every pixel close to the background color, with a soft edge
        var T0 = 38, T1 = 110;
        for (i = 0; i < d.length; i += 4) {
          var dist = Math.sqrt((d[i] - bg[0]) * (d[i] - bg[0]) + (d[i + 1] - bg[1]) * (d[i + 1] - bg[1]) + (d[i + 2] - bg[2]) * (d[i + 2] - bg[2]));
          if (dist < T0) d[i + 3] = 0;
          else if (dist < T1) {
            var a = (dist - T0) / (T1 - T0);
            // un-mix the background from the edge pixel so no halo is left behind
            for (var c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, Math.round(bg[c] + (d[i + c] - bg[c]) / a)));
            d[i + 3] = Math.round(d[i + 3] * a);
          }
        }
      }
      var x0 = cw, y0 = ch, x1 = -1, y1 = -1, r = 0, gg = 0, b = 0, n = 0;
      for (y = 0; y < ch; y++) for (x = 0; x < cw; x++) {
        i = (y * cw + x) * 4;
        if (d[i + 3] > 24) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          if (d[i + 3] > 128) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
        }
      }
      if (x1 < 0) throw new Error('empty');
      var pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(cw - 1, x1 + pad); y1 = Math.min(ch - 1, y1 + pad);
      g.putImageData(px, 0, 0);
      var tw = x1 - x0 + 1, th = y1 - y0 + 1, out = document.createElement('canvas');
      out.width = tw; out.height = th; out.getContext('2d').drawImage(cv, x0, y0, tw, th, 0, 0, tw, th);
      var hex = function (v) { v = Math.round(v / Math.max(1, n)); return (v < 16 ? '0' : '') + v.toString(16); };
      // a logo kept on its own solid background is "inked" in that background color
      var ink = hasBg && !remove ? '#' + bg.map(function (v) { v = Math.round(v); return (v < 16 ? '0' : '') + v.toString(16); }).join('') : (n ? '#' + hex(r) + hex(gg) + hex(b) : null);
      return { src: out.toDataURL('image/png'), meta: { ar: tw / th, ink: ink, hasBg: hasBg, removed: remove } };
    });
  }
  function renderLogo() {
    var t = tpl(), box = $('logo-box');
    if (S.logo) box.innerHTML = '<img alt="" src="' + S.logo + '">';
    else box.innerHTML = '<span class="mono" style="background:' + accentOf(t) + '">' + ((trimv(S.d.company) || trimv(S.d.name) || 'M')[0] || 'M').toUpperCase() + '</span>';
    box.classList.toggle('has-logo', !!S.logo);
    $('btn-logo').textContent = S.logo ? 'Replace logo' : 'Add logo';
    $('btn-logo-rm').hidden = !S.logo;
    var hasBg = !!(S.logo && S.logoMeta && S.logoMeta.hasBg);
    $('logo-bg').hidden = !hasBg;
    $$('#logo-bg [data-bg]').forEach(function (b) { b.setAttribute('aria-checked', String((b.getAttribute('data-bg') === 'remove') === !!(S.logoMeta && S.logoMeta.removed))); });
  }

  // live preview
  var liveT = null;
  function scheduleLive() { clearTimeout(liveT); liveT = setTimeout(renderLive, 60); }
  function renderLive() {
    renderQRControls(); renderLogo();
    $$('#sizes [data-size]').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-size') === S.size)); });
    if (isDigital()) return;
    var t = tpl(), d = previewDetails(), o = opts(t), fs = faces(t, d, o), cut = [];
    $('live').classList.toggle('portrait', !!t.portrait);
    $('live').innerHTML = fs.map(function (f) {
      BCM.resolve(f.els).forEach(function (e) { if (e.t === 'text' && e.cut) cut.push(e.s); });
      return '<div><p class="bcm-face-l">' + f.side + '</p><div class="bcm-face">' + svgFace(f.els, { bleed: 0, guides: true, safe: 3.5 }) + '</div></div>';
    }).join('');
    var note = $('live-note');
    if (cut.length) { note.classList.add('warn'); note.textContent = 'Some text is too long for this template and was shortened (' + cut.slice(0, 2).join(', ') + '). Try a shorter version, another size or another template.'; }
    else { note.classList.remove('warn'); note.textContent = 'Dashed yellow line = trim edge, green = safe area. Anything important stays inside the green line.'; }
  }
  function renderDetails() { renderQRControls(); renderLook(); renderLogo(); renderLive(); }

  // ---------- digitize (optional AI scan) ----------
  var digit = $('digit'), dStatus = $('digit-status');
  $('btn-scan').addEventListener('click', function () { $('scan-camera').click(); });
  $('btn-scan-upload').addEventListener('click', function () { $('scan-file').click(); });
  ['scan-camera', 'scan-file'].forEach(function (id) {
    $(id).addEventListener('change', function () { var f = this.files && this.files[0]; this.value = ''; if (f) scanCard(f); });
  });
  function scanCard(file) {
    if (!/^image\//.test(file.type)) { dStatus.textContent = 'That does not look like an image. Try a photo of your card.'; dStatus.classList.add('err'); return; }
    digit.classList.add('busy'); dStatus.classList.remove('err');
    dStatus.textContent = 'Reading your card. Usually a few seconds.';
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () {
      URL.revokeObjectURL(url);
      var s = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
      var cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth * s); cv.height = Math.round(im.naturalHeight * s);
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: [cv.toDataURL('image/jpeg', 0.85)] }) })
        .then(function (r) { return r.json(); })
        .then(function (b) {
          digit.classList.remove('busy');
          if (!b || !b.ok) { dStatus.textContent = 'Couldn\u2019t read that card. ' + ((b && b.error) || '') + ' You can type your details below.'; dStatus.classList.add('err'); return; }
          applyScan(b.data || {});
        })
        .catch(function () { digit.classList.remove('busy'); dStatus.textContent = 'Could not reach the reader. Check your connection, or type your details below.'; dStatus.classList.add('err'); });
    };
    im.onerror = function () { URL.revokeObjectURL(url); digit.classList.remove('busy'); dStatus.textContent = 'Could not open that image.'; dStatus.classList.add('err'); };
    im.src = url;
  }
  function applyScan(x) {
    var phones = Array.isArray(x.phones) ? x.phones : [];
    var mob = phones.filter(function (p) { return p && (p.isMobile || /mob|cell/i.test(p.type || '')); })[0];
    var other = phones.filter(function (p) { return p && p !== mob; })[0];
    var got = {
      name: x.fullName, title: x.jobTitle, company: x.company,
      mobile: mob && mob.value, office: other && other.value,
      email: Array.isArray(x.emails) ? (typeof x.emails[0] === 'string' ? x.emails[0] : x.emails[0] && x.emails[0].value) : '',
      web: x.website, address: typeof x.address === 'string' ? x.address : ''
    };
    var n = 0;
    Object.keys(got).forEach(function (k) { if (trimv(got[k])) { S.d[k] = trimv(got[k]); n++; } });
    save(); buildFields(); renderDetails();
    dStatus.textContent = n ? 'Filled in ' + n + ' fields from your card. Check them below, then choose what goes into the QR.' : 'We couldn\u2019t find any details on that card. You can type them below.';
    dStatus.classList.toggle('err', !n);
  }

  // ---------- step 4: download (print) ----------
  function renderFinal() {
    var t = tpl(), d = previewDetails(), fs = faces(t, d, opts(t));
    $('final').className = 'bcm-final' + (fs.length === 1 ? ' one' : '') + (t.portrait ? ' portrait' : '');
    $('final').innerHTML = fs.map(function (f) { return '<div><p class="bcm-face-l">' + f.side + '</p><div class="bcm-face">' + svgFace(f.els, { bleed: 0 }) + '</div></div>'; }).join('');
    $$('[data-sides]').forEach(function (e) { e.textContent = fs.length > 1 ? 'front and back pages' : 'one page'; });
    $$('[data-backs-note]').forEach(function (e) { e.hidden = fs.length === 1; });
    $$('#paper [data-paper]').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-paper') === S.paper)); });
    $('png-bleed').checked = !!S.pngBleed;
    $('dl-qr-png').disabled = $('dl-qr-svg').disabled = !qrMatrix('M');
  }
  $('paper').addEventListener('click', function (e) { var b = e.target.closest('[data-paper]'); if (!b) return; S.paper = b.getAttribute('data-paper'); save(); renderFinal(); });
  $('png-bleed').addEventListener('change', function () { S.pngBleed = this.checked; save(); });

  function needDetails() {
    var d = details();
    if (!d.name && !d.company) { toast('Add at least your name or company first'); go(flow().indexOf('details')); return true; }
    return false;
  }
  var jsPdfP = null;
  function loadJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (jsPdfP) return jsPdfP;
    jsPdfP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = '/qr-code/lib/jspdf.umd.min.js';
      s.onload = function () { res(window.jspdf.jsPDF); }; s.onerror = function () { jsPdfP = null; rej(new Error('pdf')); };
      document.head.appendChild(s);
    });
    return jsPdfP;
  }
  function busy(btn, p) {
    btn.classList.add('busy');
    return p.then(function (r) { btn.classList.remove('busy'); return r; }, function (e) { btn.classList.remove('busy'); toast('Something went wrong making the file. Please try again.'); throw e; });
  }
  function finalFaces() { var t = tpl(); return faces(t, details(), opts(t)); }

  $('dl-pdf').addEventListener('click', function () {
    if (needDetails()) return;
    var sz = size(), fs = finalFaces(), M = 10, b = sz.b, PW = sz.w + 2 * (b + M), PH = sz.h + 2 * (b + M);
    busy(this, loadJsPdf().then(function (JsPDF) {
      var doc = new JsPDF({ unit: 'mm', format: [PW, PH], orientation: PW > PH ? 'landscape' : 'portrait', compress: true });
      return Promise.all([BCM.registerPdfFonts(doc, BCM.fontKeysOf(fs.map(function (f) { return f.els; }))), BCM.pdfImages(fs.map(function (f) { return f.els; }))]).then(function (r) {
        var imgs = r[1];
        fs.forEach(function (f, i) {
          if (i) doc.addPage([PW, PH], PW > PH ? 'landscape' : 'portrait');
          BCM.drawPdf(doc, f.els, sz.w, sz.h, M + b, M + b, b, imgs);
          BCM.cropMarks(doc, M + b, M + b, sz.w, sz.h, b + 1, 5);
        });
        doc.setProperties({ title: (trimv(S.d.name) || 'Business card') + ' - business card', creator: 'techtuate.com' });
        download(fileBase() + '-print.pdf', doc.output('blob'));
      });
    }));
  });

  $('dl-sheet').addEventListener('click', function () {
    if (needDetails()) return;
    var sz = size(), fs = finalFaces(), paper = S.paper === 'letter' ? [215.9, 279.4] : [210, 297];
    var PW = paper[0], PH = paper[1], margin = 10;
    var cols = Math.max(1, Math.floor((PW - 2 * margin) / sz.w)), rows = Math.max(1, Math.floor((PH - 2 * margin - 8) / sz.h));
    while (cols * rows > 10) rows--;
    var x0 = (PW - cols * sz.w) / 2, y0 = (PH - rows * sz.h) / 2;
    busy(this, loadJsPdf().then(function (JsPDF) {
      var doc = new JsPDF({ unit: 'mm', format: S.paper === 'letter' ? 'letter' : 'a4', orientation: 'portrait', compress: true });
      return Promise.all([BCM.registerPdfFonts(doc, BCM.fontKeysOf(fs.map(function (f) { return f.els; }))), BCM.pdfImages(fs.map(function (f) { return f.els; }))]).then(function (r) {
        var imgs = r[1];
        fs.forEach(function (f, i) {
          if (i) doc.addPage();
          for (var rr = 0; rr < rows; rr++) for (var c = 0; c < cols; c++) {
            // backs are mirrored left-to-right so they line up when the sheet is flipped on its long edge
            var col = f.side === 'back' ? cols - 1 - c : c;
            BCM.drawPdf(doc, f.els, sz.w, sz.h, x0 + col * sz.w, y0 + rr * sz.h, 0, imgs);
          }
          doc.setDrawColor(90, 90, 90); doc.setLineWidth(0.12);
          for (var cx = 0; cx <= cols; cx++) { var x = x0 + cx * sz.w; doc.line(x, y0 - 7, x, y0 - 2); doc.line(x, y0 + rows * sz.h + 2, x, y0 + rows * sz.h + 7); }
          for (var ry = 0; ry <= rows; ry++) { var y = y0 + ry * sz.h; doc.line(x0 - 7, y, x0 - 2, y); doc.line(x0 + cols * sz.w + 2, y, x0 + cols * sz.w + 7, y); }
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
          doc.text((f.side === 'back' ? 'Backs. Print on the other side of the front sheet, flipping on the long edge. ' : 'Fronts. ') +
            'Print at 100% (actual size, no scaling). Cut along the marks. Card ' + sz.label + '.', PW / 2, PH - 5, { align: 'center' });
        });
        download(fileBase() + '-sheet-' + S.paper + '.pdf', doc.output('blob'));
      });
    }));
  });

  $('dl-png').addEventListener('click', function () {
    if (needDetails()) return;
    var sz = size(), fs = finalFaces(), b = S.pngBleed ? sz.b : 0;
    busy(this, BCM.loadAllFonts().then(function () {
      return fs.reduce(function (p, f) {
        return p.then(function () {
          return BCM.toCanvas(f.els, sz.w, sz.h, { dpi: 300, bleed: b }).then(function (cv) {
            return new Promise(function (res) { cv.toBlob(function (bl) { download(fileBase() + '-' + f.side + (b ? '-bleed' : '') + '.png', bl); setTimeout(res, 350); }, 'image/png'); });
          });
        });
      }, Promise.resolve());
    }));
  });

  // ---------- QR on its own (print step + digital step) ----------
  function dqECL() { return S.dq.logo && S.logo ? 'H' : 'M'; }
  function qrArt(forPrintStep) {
    var q = qrMatrix(forPrintStep ? 'M' : dqECL());
    if (!q) return null;
    var logo = !forPrintStep && S.dq.logo && S.logo ? S.logo : null;
    var cap = !forPrintStep && S.dq.caption;
    var fg = forPrintStep ? '#111111' : S.dq.fg;
    var U = 1000, quiet = 4, mod = U / (q.n + 2 * quiet), capH = cap ? 150 : 0;
    var d = previewDetails();
    return { q: q, U: U, quiet: quiet, mod: mod, capH: capH, H: U + capH, fg: fg, logo: logo, cap: cap,
      name: d.name || d.company || '', line: S.qr.mode === 'link' ? 'scan to visit' : 'scan to save my contact' };
  }
  function qrSVG(a, fontStack) {
    var p = [];
    for (var r = 0; r < a.q.n; r++) for (var c = 0; c < a.q.n; c++) if (a.q.get(r, c)) {
      var run = 1; while (c + run < a.q.n && a.q.get(r, c + run)) run++;
      p.push('M' + ((a.quiet + c) * a.mod).toFixed(2) + ' ' + ((a.quiet + r) * a.mod).toFixed(2) + 'h' + (run * a.mod + 0.3).toFixed(2) + 'v' + (a.mod + 0.3).toFixed(2) + 'h' + (-(run * a.mod + 0.3)).toFixed(2) + 'z');
      c += run - 1;
    }
    var out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + a.U + ' ' + a.H + '">',
      '<rect width="' + a.U + '" height="' + a.H + '" rx="60" fill="#ffffff"/>',
      '<path d="' + p.join('') + '" fill="' + a.fg + '"/>'];
    if (a.logo) {
      var ls = a.U * 0.22, lx = (a.U - ls) / 2;
      out.push('<rect x="' + (lx - 14) + '" y="' + (lx - 14) + '" width="' + (ls + 28) + '" height="' + (ls + 28) + '" rx="36" fill="#ffffff"/>');
      out.push('<image href="' + a.logo + '" x="' + lx + '" y="' + lx + '" width="' + ls + '" height="' + ls + '" preserveAspectRatio="xMidYMid meet"/>');
    }
    if (a.cap) {
      var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      out.push('<text x="' + a.U / 2 + '" y="' + (a.U + 40) + '" text-anchor="middle" font-family=' + fontStack + ' font-weight="700" font-size="54" fill="#1d1d22">' + esc(a.name) + '</text>');
      out.push('<text x="' + a.U / 2 + '" y="' + (a.U + 100) + '" text-anchor="middle" font-family=' + fontStack + ' font-size="38" fill="#6b6b73">' + esc(a.line) + '</text>');
    }
    out.push('</svg>');
    return out.join('');
  }
  function qrPNG(a, px) {
    return BCM.loadAllFonts().then(function () {
      var k = px / a.U, cv = document.createElement('canvas'); cv.width = px; cv.height = Math.round(a.H * k);
      var g = cv.getContext('2d'); g.scale(k, k);
      g.fillStyle = '#ffffff'; g.beginPath(); if (g.roundRect) g.roundRect(0, 0, a.U, a.H, 60); else g.rect(0, 0, a.U, a.H); g.fill();
      g.fillStyle = a.fg;
      for (var r = 0; r < a.q.n; r++) for (var c = 0; c < a.q.n; c++) if (a.q.get(r, c)) g.fillRect((a.quiet + c) * a.mod, (a.quiet + r) * a.mod, a.mod + 0.3, a.mod + 0.3);
      var done = Promise.resolve();
      if (a.logo) {
        done = new Promise(function (res) {
          var im = new Image(); im.onload = function () {
            var ls = a.U * 0.22, lx = (a.U - ls) / 2;
            g.fillStyle = '#ffffff'; g.beginPath(); if (g.roundRect) g.roundRect(lx - 14, lx - 14, ls + 28, ls + 28, 36); else g.rect(lx - 14, lx - 14, ls + 28, ls + 28); g.fill();
            var s = Math.min(ls / im.naturalWidth, ls / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
            g.drawImage(im, lx + (ls - w) / 2, lx + (ls - h) / 2, w, h); res();
          }; im.onerror = res; im.src = a.logo;
        });
      }
      return done.then(function () {
        if (a.cap) {
          g.textAlign = 'center'; g.fillStyle = '#1d1d22'; g.font = '700 54px "BCM Sans"'; g.fillText(a.name, a.U / 2, a.U + 40);
          g.fillStyle = '#6b6b73'; g.font = '400 38px "BCM Sans"'; g.fillText(a.line, a.U / 2, a.U + 100);
        }
        return cv;
      });
    });
  }
  function dlQrPng(forPrint, btn) {
    var a = qrArt(forPrint); if (!a) { toast('Add some details for the QR first'); return; }
    busy(btn, qrPNG(a, forPrint ? 1024 : 2048).then(function (cv) {
      return new Promise(function (res) { cv.toBlob(function (bl) { download(fileBase() + '-qr.png', bl); res(); }, 'image/png'); });
    }));
  }
  function dlQrSvg(forPrint) {
    var a = qrArt(forPrint); if (!a) { toast('Add some details for the QR first'); return; }
    download(fileBase() + '-qr.svg', new Blob([qrSVG(a, '"Noto Sans, Arial, Helvetica, sans-serif"')], { type: 'image/svg+xml' }));
  }
  $('dl-qr-png').addEventListener('click', function () { dlQrPng(true, this); });
  $('dl-qr-svg').addEventListener('click', function () { dlQrSvg(true); });
  $('dq-png').addEventListener('click', function () { if (needDetails()) return; dlQrPng(false, this); });
  $('dq-svg').addEventListener('click', function () { if (needDetails()) return; dlQrSvg(false); });
  $('dq-vcf').addEventListener('click', function () { if (needDetails()) return; saveContact(fileBase() + '.vcf', vcard(true)); });

  // ---------- digital step ----------
  function renderDQ() {
    $$('#dq-logo [data-v]').forEach(function (b) { b.setAttribute('aria-checked', String(+b.getAttribute('data-v') === +S.dq.logo)); });
    $$('#dq-caption [data-v]').forEach(function (b) { b.setAttribute('aria-checked', String(+b.getAttribute('data-v') === +S.dq.caption)); });
    var custom = DQ_COLORS.indexOf(S.dq.fg) < 0;
    $('dq-colors').innerHTML = DQ_COLORS.map(function (c) { return '<button type="button" role="radio" aria-checked="' + (c === S.dq.fg) + '" data-fg="' + c + '" style="background:' + c + '" aria-label="QR color ' + c + '"></button>'; }).join('') +
      '<label class="cust' + (custom ? ' on' : '') + '"' + (custom ? ' style="background:' + S.dq.fg + '"' : '') + '>' + (custom ? '' : '+') + '<input type="color" id="dq-custom" value="' + S.dq.fg + '" aria-label="Custom QR color" /></label>';
    var cr = BCM.contrast(S.dq.fg, '#ffffff');
    $('dq-contrast').textContent = cr < 4.5 ? 'That color is too light for phones to read reliably. Pick something darker.' : 'Dark on white scans best. We warn you if the contrast gets too low.';
    $('dq-contrast').classList.toggle('warn', cr < 4.5);
    $('dq-logo-hint').textContent = S.dq.logo && !S.logo ? 'No logo added yet. Add one in the details step.' : (S.dq.logo ? 'Strongest error correction is on, so the QR still scans with the logo covering its middle.' : '');
    var a = qrArt(false);
    $('dq-preview').innerHTML = a ? qrSVG(a, '"BCM Sans, Noto Sans, Arial, sans-serif"') : '<p class="bcm-hint">Add your details to see the QR.</p>';
  }
  $('dq-logo').addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b) return; S.dq.logo = +b.getAttribute('data-v'); save(); renderDQ(); });
  $('dq-caption').addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b) return; S.dq.caption = +b.getAttribute('data-v'); save(); renderDQ(); });
  $('dq-colors').addEventListener('click', function (e) { var b = e.target.closest('[data-fg]'); if (!b) return; S.dq.fg = b.getAttribute('data-fg'); save(); renderDQ(); });
  $('dq-colors').addEventListener('input', function (e) { if (e.target.id === 'dq-custom') { S.dq.fg = e.target.value; save(); } });
  $('dq-colors').addEventListener('change', function (e) { if (e.target.id === 'dq-custom') renderDQ(); });

  // ---------- feedback mailto ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.tt-feedback'); if (!a) return;
    a.href = 'mailto:' + ['joshi', 'gaurav'].join('') + '@' + ['gmail', '.com'].join('') + '?subject=' + encodeURIComponent('techtuate feedback');
  }, true);

  // ---------- init ----------
  function renderAll() { renderFormat(); renderSteps(); }
  buildFields();
  renderFormat();
  document.body.classList.toggle('is-digital', isDigital());
  BCM.loadAllFonts().then(function () { galleryKey = ''; renderSteps(); });
  // designs saved before logoRaw existed kept the logo in S.logo
  if (!S.logoRaw && S.logo) S.logoRaw = S.logo;
  if (S.logoRaw) applyLogo().then(function () { renderSteps(); }, function () { S.logo = S.logoRaw = S.logoMeta = null; save(); });
  renderSteps();
})();
