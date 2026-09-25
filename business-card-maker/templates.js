/* ============================================================
   techtuate business card maker - the 8 curated templates
   Each template returns layout elements (see engine.js) for a face.
   Inputs:
     W, H   trim size in mm (works for 88.9x50.8, 85x55, 90x54)
     d      details {name,title,company,tagline,mobile,office,email,web,address,linkedin}
     o      options {accent, fonts:{b,r,i}, qr, logo, oneSided, qrCaption, B (bleed)}
   Rules: important content stays 4 mm inside the trim; backgrounds run
   into the bleed; QR codes always sit on a light quiet zone.
   ============================================================ */
(function (root) {
  'use strict';
  var mix = function (a, b, t) { return root.BCM.mix(a, b, t); };
  var onColor = function (bg) { return root.BCM.onColor(bg); };

  function bg(W, H, B, fill) { return { t: 'rect', x: -B - 1, y: -B - 1, w: W + 2 * B + 2, h: H + 2 * B + 2, fill: fill }; }
  function T(s, x, y, f, size, fill, extra) { return Object.assign({ t: 'text', s: s, x: x, y: y, f: f, size: size, fill: fill }, extra || {}); }
  function initial(d) { var s = (d.company || d.name || 'M').trim(); return (s.replace(/^(the|a|an)\s+/i, '')[0] || 'M').toUpperCase(); }
  // logo (uploaded image) or a monogram disc
  function mark(o, d, x, y, size, disc, letter, fontKey) {
    if (o.logo) return [{ t: 'image', src: o.logo, x: x, y: y, w: size, h: size }];
    var r = size / 2, s = size * 1.25;
    return [{ t: 'circle', cx: x + r, cy: y + r, r: r, fill: disc },
      T(initial(d), x + r, y + r + s * 0.352778 * 0.36, fontKey || o.fonts.b, s, letter, { align: 'center' })];
  }
  function qr(o, x, y, size, fg, bgc) { return o.qr ? [{ t: 'qr', q: o.qr, x: x, y: y, size: size, fg: fg || '#111111', bg: bgc || '#ffffff', pad: size * 0.07, r: size * 0.04 }] : []; }
  function contacts(d, keys) { return keys.map(function (k) { return d[k]; }).filter(Boolean); }
  function stack(lines, x, yBottom, gap, f, size, fill, align, maxW) {
    var out = [], y = yBottom;
    for (var i = lines.length - 1; i >= 0; i--) { out.push(T(lines[i].s || lines[i], x, y, lines[i].f || f, lines[i].size || size, lines[i].fill || fill, { align: align, maxW: maxW })); y -= gap; }
    return out;
  }
  function caption(o) { return o.qrKind === 'link' ? 'SCAN TO VISIT' : 'SCAN TO SAVE CONTACT'; }
  function slug(s) {
    var words = String(s || 'hello').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/), out = words[0] || 'hello';
    for (var i = 1; i < words.length && (out + '-' + words[i]).length <= 14; i++) out += '-' + words[i];
    return out.slice(0, 16);
  }

  var TEMPLATES = [

  // 1 ---------------------------------------------------------------
  { id: 'boardroom', name: 'Boardroom', accent: '#1b2a4a', font: 'serif',
    for: 'Formal and quietly confident. Serif name, one navy rule, details tidy on the right.',
    inds: ['law', 'finance', 'consulting', 'corporate'], cat: 'corporate',
    front: function (W, H, d, o) {
      var m = 5.5, a = o.accent, oneQR = o.oneSided && o.qr;
      var els = [bg(W, H, o.B, '#fbfaf7')];
      els = els.concat(mark(o, d, m, m, 5.6, a, '#ffffff'));
      els.push(T((d.company || '').toUpperCase(), m + 7.4, m + 3.9, 'sans700', 5.6, a, { ls: 0.2, maxW: W - m * 2 - 8 - (oneQR ? 17 : 0) }));
      var ny = H - m - 11.5;
      els.push(T(d.name, m, ny, o.fonts.b, 15, a, { maxW: W * 0.52 }));
      els.push(T(d.title, m, ny + 4.4, 'sans400', 6.8, '#5b6275', { maxW: W * 0.5 }));
      els.push({ t: 'rect', x: m, y: ny + 7.2, w: 8, h: 0.4, fill: a });
      var lines = contacts(d, ['mobile', 'email', 'web']).map(function (s) { return { s: s }; });
      if (d.address) lines.push({ s: d.address, fill: '#8a8f9c', size: 5.6 });
      els = els.concat(stack(lines, W - m, H - m, 3.1, 'sans400', 6.3, '#3b4254', 'right', W * 0.44));
      if (oneQR) els = els.concat(qr(o, W - m - 15, m - 0.5, 15, a));
      return els;
    },
    back: function (W, H, d, o) {
      var a = o.accent, fg = onColor(a), els = [bg(W, H, o.B, a)], m = 8;
      if (o.qr) {
        var qs = Math.min(23, H - 16);
        els = els.concat(mark(o, d, m, H / 2 - 13, 10, fg, a));
        els.push(T((d.company || '').toUpperCase(), m, H / 2 + 4, 'sans700', 6.2, fg, { ls: 0.2, maxW: W - qs - m * 2 - 5 }));
        if (d.tagline) els.push(T(d.tagline, m, H / 2 + 9, o.fonts.i, 7, mix(fg, a, 0.25), { maxW: W - qs - m * 2 - 5 }));
        els = els.concat(qr(o, W - m - qs, (H - qs) / 2, qs, a));
      } else {
        els = els.concat(mark(o, d, W / 2 - 6, H / 2 - 12, 12, fg, a));
        els.push(T((d.company || '').toUpperCase(), W / 2, H / 2 + 7, 'sans700', 6.6, fg, { ls: 0.22, align: 'center', maxW: W - 16 }));
        if (d.tagline) els.push(T(d.tagline, W / 2, H / 2 + 12.5, o.fonts.i, 7.2, mix(fg, a, 0.25), { align: 'center', maxW: W - 16 }));
      }
      return els;
    } },

  // 2 ---------------------------------------------------------------
  { id: 'ledger', name: 'Ledger', accent: '#2f5d50', font: 'sans',
    for: 'Calm grid, small-caps labels, nothing wasted. Reads like a well-kept balance sheet.',
    inds: ['accounting', 'banking', 'insurance', 'audit'], cat: 'corporate',
    front: function (W, H, d, o) {
      var m = 5.5, a = o.accent, ink = '#1f2a26', oneQR = o.oneSided && o.qr;
      var els = [bg(W, H, o.B, '#f4f3ee')];
      var tw = W - 2 * m - (oneQR ? 17 : 0);
      els.push(T(d.name, m, m + 6.5, o.fonts.b, 14, ink, { maxW: tw }));
      els.push(T([d.title, d.company].filter(Boolean).join('  ·  '), m, m + 11, 'sans400', 6.8, a, { maxW: tw }));
      if (d.tagline && !oneQR) els.push(T(d.tagline, m, m + 15, o.fonts.i, 6.2, '#6b726e', { maxW: tw }));
      var top = H - m - 10.5;
      els.push({ t: 'rect', x: m, y: top, w: W - 2 * m, h: 0.35, fill: a });
      var cells = [['M', d.mobile], ['E', d.email], ['T', d.office], ['W', d.web]].filter(function (c) { return c[1]; });
      var colW = (W - 2 * m) / 2;
      cells.forEach(function (c, i) {
        var col = i % 2, row = Math.floor(i / 2), x = m + col * colW, y = top + 5 + row * 4.2;
        els.push(T(c[0], x, y, 'mono500', 5.4, a));
        els.push(T(c[1], x + 3.6, y, 'sans400', 6.3, ink, { maxW: colW - 5 }));
      });
      if (oneQR) els = els.concat(qr(o, W - m - 15, m - 0.5, 15, ink));
      return els;
    },
    back: function (W, H, d, o) {
      var a = o.accent, fg = onColor(a), els = [bg(W, H, o.B, a)];
      if (o.qr) {
        var qs = Math.min(24, H - 18);
        els = els.concat(qr(o, (W - qs) / 2, (H - qs) / 2 - 3, qs, mix(a, '#000000', 0.35)));
        els.push(T(caption(o), W / 2, (H + qs) / 2 + 3.5, 'mono500', 5.2, fg, { ls: 0.14, align: 'center' }));
      } else {
        els.push(T(d.company, W / 2, H / 2 + 1, o.fonts.b, 12, fg, { align: 'center', maxW: W - 16 }));
        if (d.tagline) els.push(T(d.tagline, W / 2, H / 2 + 6.5, 'sans400', 6.6, mix(fg, a, 0.3), { align: 'center', maxW: W - 16 }));
      }
      return els;
    } },

  // 3 ---------------------------------------------------------------
  { id: 'blueprint', name: 'Blueprint', accent: '#0f2d52', font: 'sans',
    for: 'Engineering-drawing grid and mono labels on deep blue. Precise, technical, practical.',
    inds: ['engineering', 'energy', 'construction', 'manufacturing'], cat: 'industrial',
    grid: function (W, H, o) {
      var out = [], step = 4, g = mix(o.accent, '#ffffff', 0.12);
      for (var x = -o.B; x <= W + o.B; x += step) out.push({ t: 'line', x1: x, y1: -o.B, x2: x, y2: H + o.B, stroke: g, sw: 0.12 });
      for (var y = -o.B; y <= H + o.B; y += step) out.push({ t: 'line', x1: -o.B, y1: y, x2: W + o.B, y2: y, stroke: g, sw: 0.12 });
      return out;
    },
    front: function (W, H, d, o) {
      var m = 5.5, a = o.accent, light = mix(a, '#ffffff', 0.88), soft = mix(a, '#ffffff', 0.62);
      var els = [bg(W, H, o.B, a)].concat(this.grid(W, H, o));
      var qs = o.qr ? 15 : 0;
      els.push(T((d.company || '').toUpperCase(), m, m + 3.5, 'mono500', 5.4, soft, { ls: 0.14, maxW: W - 2 * m }));
      els.push(T(d.name, m, H * 0.5, o.fonts.b, 14.5, '#ffffff', { maxW: W - 2 * m }));
      els.push(T(d.title, m, H * 0.5 + 4.4, 'mono400', 6.3, soft, { maxW: W - 2 * m }));
      var lines = [['M', d.mobile], ['E', d.email], ['W', d.web]].filter(function (c) { return c[1]; }).map(function (c) { return { s: c[0] + '  ' + c[1] }; });
      els = els.concat(stack(lines, m, H - m, 3.2, 'mono400', 5.9, light, 'left', W - 2 * m - qs - 3));
      els = els.concat(qr(o, W - m - qs, H - m - qs + 1, qs, a));
      return els;
    },
    back: function (W, H, d, o) {
      var a = o.accent, light = mix(a, '#ffffff', 0.9);
      var els = [bg(W, H, o.B, a)].concat(this.grid(W, H, o));
      els = els.concat(mark(o, d, W / 2 - 7, H / 2 - 10, 14, light, a));
      els.push(T((d.company || '').toUpperCase(), W / 2, H / 2 + 11, 'mono500', 5.6, light, { ls: 0.16, align: 'center', maxW: W - 16 }));
      return els;
    } },

  // 4 ---------------------------------------------------------------
  { id: 'studio', name: 'Studio', accent: '#e85d2a', font: 'geo',
    for: 'Oversized name, lots of white space, one accent dot. Lets your work do the talking.',
    inds: ['design', 'architecture', 'photography', 'agencies'], cat: 'creative',
    front: function (W, H, d, o) {
      var m = 5.5, a = o.accent, ink = '#141414', oneQR = o.oneSided && o.qr;
      var els = [bg(W, H, o.B, '#ffffff')];
      var parts = String(d.name || '').trim().split(/\s+/), l1 = parts.shift() || '', l2 = parts.join(' ');
      var maxW = W - 2 * m - (oneQR ? 18 : 0), size = 19;
      var widest = Math.max(root.BCM.measure(l1, o.fonts.b, size, -0.03), root.BCM.measure(l2 + '.', o.fonts.b, size, -0.03));
      if (widest > maxW) size = Math.max(8, size * maxW / widest);
      var y1 = m + size * 0.352778 * 0.95, y2 = y1 + size * 0.352778 * 1.02;
      els.push(T(l1, m, y1, o.fonts.b, size, ink, { ls: -0.03 }));
      var last = l2 ? l2 : l1, ly = l2 ? y2 : y1;
      if (l2) els.push(T(l2, m, y2, o.fonts.b, size, ink, { ls: -0.03 }));
      els.push(T('.', m + root.BCM.measure(last, o.fonts.b, size, -0.03) + 0.3, ly, o.fonts.b, size, a));
      els = els.concat(stack(contacts(d, ['title', 'company']), m, H - m, 3, 'geo400', 5.9, '#555555', 'left', W * 0.42));
      els = els.concat(stack(contacts(d, ['email', 'mobile', 'web']), W - m, H - m, 3, 'geo400', 5.9, ink, 'right', W * 0.5));
      if (oneQR) els = els.concat(qr(o, W - m - 16, m - 0.5, 16, ink));
      return els;
    },
    back: function (W, H, d, o) {
      var a = o.accent, fg = onColor(a), m = 6.5, els = [bg(W, H, o.B, a)];
      var word = String(d.company || d.name || '').split(/\s+/)[0].toLowerCase();
      if (o.qr) {
        var qs = Math.min(20, H - 14);
        els.push(T(word, m, H - m, 'geo700', 12, fg, { ls: -0.03, maxW: W - qs - 2 * m - 6 }));
        els.push(T('.', m + Math.min(root.BCM.measure(word, 'geo700', 12, -0.03), W - qs - 2 * m - 6) + 0.2, H - m, 'geo700', 12, mix(fg, a, 0.45)));
        els = els.concat(qr(o, W - m - qs, H - m - qs, qs, mix(a, '#000000', 0.45)));
      } else {
        els.push(T(word + '.', m, H - m, 'geo700', 16, fg, { ls: -0.03, maxW: W - 2 * m }));
      }
      return els;
    } },

  // 5 ---------------------------------------------------------------
  { id: 'colorblock', name: 'Color Block', accent: '#e85d2a', font: 'geo',
    for: 'Bold color panel with your logo, crisp details beside it. Memorable across a trade-show table.',
    inds: ['sales', 'marketing', 'startups', 'retail & FMCG'], cat: 'sales',
    front: function (W, H, d, o) {
      var a = o.accent, fg = onColor(a), pw = W * 0.38, m = 5, ink = '#1c1c1c', oneQR = o.oneSided && o.qr;
      var els = [bg(W, H, o.B, '#ffffff'), { t: 'rect', x: -o.B - 1, y: -o.B - 1, w: pw + o.B + 1, h: H + 2 * o.B + 2, fill: a }];
      els = els.concat(mark(o, d, m, m, 8, fg, a));
      var words = String(d.company || '').split(/\s+/), c1 = '', c2 = '';
      words.forEach(function (w) { if (!c2 && root.BCM.measure((c1 + ' ' + w).trim(), 'geo700', 7.4) < pw - m - 3) c1 = (c1 + ' ' + w).trim(); else c2 = (c2 + ' ' + w).trim(); });
      if (oneQR) {
        els = els.concat(qr(o, m, H - m - 15, 15, ink));
        els.push(T(c1, m, m + 13, 'geo700', 6.4, fg, { maxW: pw - m - 3.5 }));
        if (c2) els.push(T(c2, m, m + 16.2, 'geo700', 6.4, fg, { maxW: pw - m - 3.5 }));
      } else {
        els.push(T(c1, m, H - m - (c2 ? 3.6 : 0), 'geo700', 7.4, fg, { maxW: pw - m - 3.5 }));
        if (c2) els.push(T(c2, m, H - m, 'geo700', 7.4, fg, { maxW: pw - m - 3.5 }));
      }
      var x = pw + 5, tw = W - x - m;
      els.push(T(d.name, x, m + 6, o.fonts.b, 12.5, ink, { maxW: tw }));
      els.push(T(d.title, x, m + 10.2, 'geo700', 6.2, a, { maxW: tw }));
      els = els.concat(stack(contacts(d, ['mobile', 'email', 'web']), x, H - m, 3.1, 'sans400', 6.1, '#444444', 'left', tw));
      return els;
    },
    back: function (W, H, d, o) {
      var a = o.accent, fg = onColor(a), els = [bg(W, H, o.B, a)];
      if (o.qr) {
        var qs = Math.min(24, H - 16), x0 = W / 2 - (qs + 26) / 2;
        els = els.concat(qr(o, x0, (H - qs) / 2, qs, '#1c1c1c'));
        els.push(T('Let’s', x0 + qs + 5, H / 2 - 0.8, 'geo700', 11, fg));
        els.push(T('talk.', x0 + qs + 5, H / 2 + 4.6, 'geo700', 11, fg));
      } else {
        els.push(T(d.company, W / 2, H / 2 + 2, 'geo700', 13, fg, { align: 'center', maxW: W - 16 }));
      }
      return els;
    } },

  // 6 ---------------------------------------------------------------
  { id: 'clinic', name: 'Clinic', accent: '#2a7f7a', font: 'sans',
    for: 'Soft shapes, calm teal, generous line spacing. Friendly, reassuring, easy to read.',
    inds: ['healthcare', 'wellness', 'education', 'non-profit'], cat: 'health',
    front: function (W, H, d, o) {
      var m = 5.5, a = o.accent, ink = mix(a, '#000000', 0.55), oneQR = o.oneSided && o.qr;
      var els = [bg(W, H, o.B, mix(a, '#ffffff', 0.94)), { t: 'circle', cx: W + 2, cy: -7, r: 25, fill: a, opacity: 0.14 }];
      els = els.concat(mark(o, d, m, m, 6, a, '#ffffff'));
      els.push(T(d.company, m + 7.8, m + 4.1, 'sans700', 6.6, a, { maxW: W - 2 * m - 10 - (oneQR ? 16 : 0) }));
      els.push(T(d.name, m, H * 0.54, o.fonts.b, 13.5, ink, { maxW: W - 2 * m }));
      els.push(T(d.title, m, H * 0.54 + 4.3, 'sans400', 6.8, mix(ink, '#ffffff', 0.25), { maxW: W - 2 * m }));
      var l1 = [d.mobile, d.email].filter(Boolean).join('    ');
      var lines = [l1, d.address].filter(Boolean);
      els = els.concat(stack(lines, m, H - m, 3.3, 'sans400', 6, ink, 'left', W - 2 * m - (oneQR ? 17 : 0)));
      if (oneQR) els = els.concat(qr(o, W - m - 14, H - m - 14 + 0.5, 14, ink));
      return els;
    },
    back: function (W, H, d, o) {
      var a = o.accent, fg = onColor(a), els = [bg(W, H, o.B, a), { t: 'circle', cx: -4, cy: H + 6, r: 22, fill: '#ffffff', opacity: 0.1 }];
      if (o.qr) {
        var qs = Math.min(23, H - 18);
        els = els.concat(qr(o, (W - qs) / 2, (H - qs) / 2 - 3, qs, mix(a, '#000000', 0.55)));
        els.push(T(o.qrKind === 'link' ? 'Scan to visit' : 'Scan to save my contact', W / 2, (H + qs) / 2 + 3.6, 'sans400', 6.4, fg, { align: 'center' }));
      } else {
        els = els.concat(mark(o, d, W / 2 - 6, H / 2 - 10, 12, fg, a));
        els.push(T(d.company, W / 2, H / 2 + 9, 'sans700', 7.4, fg, { align: 'center', maxW: W - 16 }));
      }
      return els;
    } },

  // 7 ---------------------------------------------------------------
  { id: 'terminal', name: 'Terminal', accent: '#ffb000', font: 'mono',
    for: 'Dark, monospaced, a prompt instead of a logo. Instantly says "builds software".',
    inds: ['developers', 'SaaS', 'data', 'IT services'], cat: 'tech',
    front: function (W, H, d, o) {
      var m = 5.5, a = o.accent, base = '#0e0f13';
      var els = [bg(W, H, o.B, base)];
      var qs = o.qr ? 14 : 0;
      els.push(T('~/' + slug(d.company) + ' $ whoami', m, m + 3.4, 'mono400', 5.6, a, { maxW: W - 2 * m }));
      els.push(T(d.name, m, m + 11.5, o.fonts.b, 12.5, '#ffffff', { maxW: W - 2 * m }));
      els.push(T(d.title, m, m + 15.8, 'mono400', 6.1, '#9aa0aa', { maxW: W - 2 * m }));
      var rows = [['mail', d.email], ['tel ', d.mobile], ['web ', d.web]].filter(function (r) { return r[1]; });
      var y = H - m - (rows.length - 1) * 3.2;
      rows.forEach(function (r) {
        els.push(T(r[0], m, y, 'mono400', 5.7, a));
        els.push(T(r[1], m + root.BCM.measure('mail ', 'mono400', 5.7), y, 'mono400', 5.7, '#e6e6e6', { maxW: W - 2 * m - qs - 12 }));
        y += 3.2;
      });
      els = els.concat(qr(o, W - m - qs, H - m - qs + 1, qs, base));
      return els;
    },
    back: function (W, H, d, o) {
      var a = o.accent, base = '#0e0f13', els = [bg(W, H, o.B, base)];
      var s = '> ' + slug(d.company) + '_';
      var w = Math.min(root.BCM.measure(s, 'mono500', 10), W - 16);
      els.push(T(s, W / 2 - 1.5, H / 2 + 1.5, 'mono500', 10, a, { align: 'center', maxW: W - 16 }));
      els.push({ t: 'rect', x: W / 2 - 1.5 + w / 2 + 0.6, y: H / 2 - 2.2, w: 1.8, h: 4.3, fill: a });
      return els;
    } },

  // 8 ---------------------------------------------------------------
  { id: 'heritage', name: 'Heritage', accent: '#a07d3b', font: 'display',
    for: 'Cream stock, fine double border, centred serif. Old-world warmth with a modern QR on the back.',
    inds: ['hospitality', 'F&B', 'real estate', 'boutiques'], cat: 'hospitality',
    front: function (W, H, d, o) {
      var a = o.accent, ink = '#3b2f1f', cream = '#f5efe2', oneQR = o.oneSided && o.qr;
      var els = [bg(W, H, o.B, cream),
        { t: 'rect', x: 3.4, y: 3.4, w: W - 6.8, h: H - 6.8, fill: 'none', stroke: a, sw: 0.35 },
        { t: 'rect', x: 4.4, y: 4.4, w: W - 8.8, h: H - 8.8, fill: 'none', stroke: a, sw: 0.18 }];
      var cx = oneQR ? (W - 17) / 2 + 1.5 : W / 2, mw = oneQR ? W - 30 : W - 16;
      els.push(T((d.company || '').toUpperCase(), cx, H * 0.29, 'sans400', 5.2, a, { ls: 0.28, align: 'center', maxW: mw }));
      els.push(T(d.name, cx, H * 0.5, o.fonts.b, 14.5, ink, { align: 'center', maxW: mw }));
      els.push(T(d.title, cx, H * 0.5 + 4.8, o.fonts.i, 7.2, '#6b5a42', { align: 'center', maxW: mw }));
      var l1 = [d.mobile, d.email].filter(Boolean).join('  ·  ');
      els.push(T(l1, cx, H * 0.73, 'sans400', 5.7, '#4a3e2c', { align: 'center', maxW: mw }));
      els.push(T(d.web, cx, H * 0.73 + 3.1, 'sans400', 5.7, '#4a3e2c', { align: 'center', maxW: mw }));
      if (oneQR) els = els.concat(qr(o, W - 7 - 13, (H - 13) / 2, 13, ink, cream));
      return els;
    },
    back: function (W, H, d, o) {
      var a = o.accent, dark = mix(a, '#000000', 0.72), gold = mix(a, '#ffffff', 0.35), els = [bg(W, H, o.B, dark)];
      if (o.qr) {
        var qs = Math.min(21, H - 16);
        els.push(T(initial(d), W / 2 - qs / 2 - 9, H / 2 + 7, 'disp400i', 40, gold, { align: 'center' }));
        els = els.concat(qr(o, W / 2 + 1, (H - qs) / 2, qs, dark, '#f5efe2'));
      } else {
        els.push(T(initial(d), W / 2, H / 2 + 8, 'disp400i', 46, gold, { align: 'center' }));
      }
      return els;
    } }
  ];

  root.BCM_TEMPLATES = TEMPLATES;
  root.BCM_CATS = [
    { id: 'all', label: 'all' }, { id: 'corporate', label: 'corporate & finance' }, { id: 'industrial', label: 'industrial & engineering' },
    { id: 'creative', label: 'creative' }, { id: 'sales', label: 'sales & startups' }, { id: 'health', label: 'health & education' },
    { id: 'tech', label: 'tech' }, { id: 'hospitality', label: 'hospitality & property' }
  ];
})(window);
