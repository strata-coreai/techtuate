/* ============================================================
   techtuate contact page (/c/)
   Opened by scanning a business card QR from /business-card-maker/.
   The contact is packed into the link after "#" (never sent to any
   server), decoded here, and saved as a vCard in one tap.

   Link format:  https://techtuate.com/c/#1<base64url>
     "1" = format version
     payload = UTF-8 text of these fields joined by U+001F, trailing
     empty fields dropped:
       name, title, company, mobile, office, email, web, address,
       linkedin, accent (hex without "#")
   ============================================================ */
(function () {
  'use strict';

  var KEYS = ['name', 'title', 'company', 'mobile', 'office', 'email', 'web', 'address', 'linkedin', 'accent'];
  var root = document.getElementById('cc');
  var toastEl = document.getElementById('toast');

  function decode(hash) {
    hash = String(hash || '').replace(/^#/, '');
    if (hash.charAt(0) !== '1') return null;
    try {
      var b64 = hash.slice(1).replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      var parts = text.split('\u001f'), d = {};
      KEYS.forEach(function (k, j) { d[k] = (parts[j] || '').trim(); });
      if (!d.name && !d.company && !d.mobile && !d.email) return null;
      return d;
    } catch (e) { return null; }
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function vEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
  function url(u) { u = String(u || '').trim(); if (!u) return ''; return /^https?:\/\//i.test(u) ? u : 'https://' + u; }
  function tel(s) { return String(s || '').replace(/[^\d+]/g, ''); }

  function vcard(d) {
    var nm = d.name || d.company, parts = nm.split(/\s+/), last = parts.length > 1 ? parts.pop() : '', first = parts.join(' ');
    var L = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + vEsc(last) + ';' + vEsc(first) + ';;;', 'FN:' + vEsc(nm)];
    if (d.company) L.push('ORG:' + vEsc(d.company));
    if (d.title) L.push('TITLE:' + vEsc(d.title));
    if (d.mobile) L.push('TEL;TYPE=CELL:' + tel(d.mobile));
    if (d.office) L.push('TEL;TYPE=WORK,VOICE:' + tel(d.office));
    if (d.email) L.push('EMAIL;TYPE=INTERNET:' + vEsc(d.email));
    if (d.web) L.push('URL:' + vEsc(url(d.web)));
    if (d.address) L.push('ADR;TYPE=WORK:;;' + vEsc(d.address) + ';;;;');
    if (d.linkedin) L.push('X-SOCIALPROFILE;TYPE=linkedin:' + vEsc(url(d.linkedin)));
    L.push('END:VCARD');
    return L.join('\r\n') + '\r\n';
  }

  function toast(m) {
    toastEl.textContent = m; toastEl.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove('show'); }, 3500);
  }

  // iPhone/iPad: opening the card shows Apple's own "Create New Contact" sheet.
  // Android: the downloaded text/x-vcard opens straight in the Contacts app.
  function save(d) {
    var ua = navigator.userAgent || '';
    var ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var android = /Android/i.test(ua);
    var name = (d.name || d.company || 'contact').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'contact';
    var blob = new Blob([vcard(d)], { type: android ? 'text/x-vcard' : 'text/vcard' });
    var href = URL.createObjectURL(blob);
    if (ios) { window.location.href = href; return; }
    var a = document.createElement('a');
    a.href = href; a.download = name + '.vcf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(href); }, 4000);
    toast(android ? 'Downloaded. Tap it to add to your contacts.' : 'Downloaded. Open the file to add it to your contacts.');
  }

  function lum(hex) {
    var n = parseInt(hex, 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function render(d) {
    var acc = /^[0-9a-f]{6}$/i.test(d.accent) ? d.accent : 'ffd60a';
    var L = lum(acc);
    root.style.setProperty('--acc', '#' + acc);
    root.style.setProperty('--on', L > 0.4 ? '#111111' : '#ffffff');
    var nm = d.name || d.company;
    document.title = 'Save ' + nm + ' - techtuate';
    var role = [d.title, d.name ? d.company : ''].filter(Boolean).join(' \u00b7 ');
    var rows = [];
    if (d.mobile) rows.push(['mobile', '<a href="tel:' + esc(tel(d.mobile)) + '">', d.mobile]);
    if (d.office) rows.push(['office', '<a href="tel:' + esc(tel(d.office)) + '">', d.office]);
    if (d.email) rows.push(['email', '<a href="mailto:' + esc(d.email) + '">', d.email]);
    if (d.web) rows.push(['web', '<a href="' + esc(url(d.web)) + '" rel="noopener nofollow">', d.web.replace(/^https?:\/\//i, '')]);
    if (d.linkedin) rows.push(['linkedin', '<a href="' + esc(url(d.linkedin)) + '" rel="noopener nofollow">', d.linkedin.replace(/^https?:\/\/(www\.)?/i, '')]);
    if (d.address) rows.push(['address', '<span class="v">', d.address]);
    root.innerHTML =
      '<article class="cc-card">' +
        '<div class="cc-mono" aria-hidden="true">' + esc((nm.replace(/^(the|a|an)\s+/i, '')[0] || '?').toUpperCase()) + '</div>' +
        '<h1 class="cc-name">' + esc(nm) + '</h1>' +
        (role ? '<p class="cc-role">' + esc(role) + '</p>' : '') +
        '<button type="button" class="cc-save" id="save"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5"/><path d="M19 8v6M16 11h6"/></svg>Save to contacts</button>' +
        (rows.length ? '<ul class="cc-rows">' + rows.map(function (r) {
          return '<li>' + r[1] + '<small>' + r[0] + '</small><span>' + esc(r[2]) + '</span>' + (r[1].indexOf('<a') === 0 ? '</a>' : '</span>') + '</li>';
        }).join('') + '</ul>' : '') +
      '</article>' +
      '<p class="cc-foot"><span class="dot" aria-hidden="true"></span>These details live only inside this link. Nothing is stored on a server.<br><a href="/business-card-maker/">Make your own free card with a QR like this</a></p>';
    document.getElementById('save').addEventListener('click', function () { save(d); });
  }

  function empty() {
    document.title = 'Contact link - techtuate';
    root.innerHTML = '<div class="cc-err"><h1>This contact link looks incomplete.</h1><p>Try scanning the QR code again, holding the phone steady.</p><p><a href="/business-card-maker/">Make your own free business card with a QR</a></p></div>';
  }

  function go() { var d = decode(location.hash); if (d) render(d); else empty(); }
  window.addEventListener('hashchange', go);
  go();
})();
