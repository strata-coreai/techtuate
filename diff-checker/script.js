/* ============================================================
   techtuate diff checker
   - compares two blocks of text / code / config in the browser
   - side-by-side + unified views, ignore whitespace / case,
     JSON normalize, word-level highlighting
   - share via URL (both blocks compressed into the hash with
     lz-string; no server ever sees the data)
   - export a standard unified .diff / .patch
   Nothing is uploaded. Uses vendored jsdiff (global "Diff") and
   lz-string (global "LZString").
   ============================================================ */
(function () {
  'use strict';

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  function $(id) { return document.getElementById(id); }

  var inA = $('input-a');
  var inB = $('input-b');
  var optWs = $('opt-ws');
  var optCase = $('opt-case');
  var optJson = $('opt-json');
  var viewSbsBtn = $('view-sbs');
  var viewUniBtn = $('view-uni');
  var output = $('output');
  var statsEl = $('stats');
  var jsonNote = $('json-note');
  var shareNote = $('share-note');
  var flash = $('copy-flash');

  var view = 'sbs'; // 'sbs' | 'uni'
  var SHARE_WARN = 8000; // link chars past which some apps may truncate

  /* ---------- helpers ---------- */
  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;';
    });
  }

  // split a jsdiff part value into lines, dropping the empty string that a
  // trailing newline produces (but keeping intentional blank lines).
  function splitLines(value) {
    var lines = value.split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  // recursively sort object keys so JSON diffs ignore key order
  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') {
      var out = {};
      Object.keys(v).sort().forEach(function (k) { out[k] = sortKeys(v[k]); });
      return out;
    }
    return v;
  }

  // try to pretty-print + key-sort as JSON; report success so we can note fallback
  function tryNormalizeJson(text) {
    if (!text.trim()) return { ok: true, text: text };
    try {
      return { ok: true, text: JSON.stringify(sortKeys(JSON.parse(text)), null, 2) };
    } catch (e) {
      return { ok: false, text: text };
    }
  }

  /* ---------- diff building ---------- */
  function currentOpts() {
    return { ignoreWhitespace: optWs.checked, ignoreCase: optCase.checked };
  }

  // word-level highlight for a changed line pair
  function intraline(oldLine, newLine, opts) {
    var parts = Diff.diffWordsWithSpace(oldLine, newLine, { ignoreCase: opts.ignoreCase });
    var left = '', right = '';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], v = esc(p.value);
      if (p.added) { right += '<ins>' + v + '</ins>'; }
      else if (p.removed) { left += '<del>' + v + '</del>'; }
      else { left += v; right += v; }
    }
    return { left: left, right: right };
  }

  // returns { rows, additions, deletions, identical }
  function buildRows(a, b, opts) {
    var parts = Diff.diffLines(a, b, opts);
    var segs = [];
    var additions = 0, deletions = 0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var lines = splitLines(p.value);
      var type = p.added ? 'add' : p.removed ? 'del' : 'eq';
      if (type === 'add') additions += lines.length;
      if (type === 'del') deletions += lines.length;
      segs.push({ type: type, lines: lines });
    }

    var rows = [];
    var ln = 1, rn = 1;
    var i2 = 0;
    while (i2 < segs.length) {
      var s = segs[i2];
      if (s.type === 'eq') {
        for (var k = 0; k < s.lines.length; k++) {
          rows.push({ type: 'eq', left: { n: ln++, html: esc(s.lines[k]) }, right: { n: rn++, html: esc(s.lines[k]) } });
        }
        i2++;
      } else if (s.type === 'del') {
        if (i2 + 1 < segs.length && segs[i2 + 1].type === 'add') {
          var rem = s.lines, add = segs[i2 + 1].lines;
          var m = Math.max(rem.length, add.length);
          for (var j = 0; j < m; j++) {
            var hasL = j < rem.length, hasR = j < add.length;
            if (hasL && hasR) {
              var il = intraline(rem[j], add[j], opts);
              rows.push({ type: 'chg', left: { n: ln++, html: il.left }, right: { n: rn++, html: il.right } });
            } else if (hasL) {
              rows.push({ type: 'del', left: { n: ln++, html: esc(rem[j]) }, right: null });
            } else {
              rows.push({ type: 'add', left: null, right: { n: rn++, html: esc(add[j]) } });
            }
          }
          i2 += 2;
        } else {
          for (var d = 0; d < s.lines.length; d++) {
            rows.push({ type: 'del', left: { n: ln++, html: esc(s.lines[d]) }, right: null });
          }
          i2++;
        }
      } else { // add
        for (var e = 0; e < s.lines.length; e++) {
          rows.push({ type: 'add', left: null, right: { n: rn++, html: esc(s.lines[e]) } });
        }
        i2++;
      }
    }
    return { rows: rows, additions: additions, deletions: deletions, identical: additions === 0 && deletions === 0 };
  }

  /* ---------- rendering ---------- */
  function renderSbs(rows) {
    var h = '<table class="dc-diff dc-sbs"><tbody>';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var lNum = r.left ? r.left.n : '';
      var rNum = r.right ? r.right.n : '';
      var lCode = r.left ? r.left.html : '';
      var rCode = r.right ? r.right.html : '';
      // left cell class
      var lClass = !r.left ? 'empty' : (r.type === 'del' || r.type === 'chg') ? 'c-del' : 'c-eq';
      var rClass = !r.right ? 'empty' : (r.type === 'add' || r.type === 'chg') ? 'c-add' : 'c-eq';
      var lLn = r.left ? 'dc-ln' : 'dc-ln empty';
      var rLn = r.right ? 'dc-ln dc-mid' : 'dc-ln dc-mid empty';
      h += '<tr>' +
        '<td class="' + lLn + '">' + lNum + '</td>' +
        '<td class="dc-code ' + lClass + '">' + lCode + '</td>' +
        '<td class="' + rLn + '">' + rNum + '</td>' +
        '<td class="dc-code ' + rClass + '">' + rCode + '</td>' +
        '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  function renderUni(rows) {
    var h = '<table class="dc-diff dc-uni"><tbody>';
    function line(cls, oldN, newN, sign, html) {
      return '<tr class="' + cls + '">' +
        '<td class="dc-ln">' + (oldN || '') + '</td>' +
        '<td class="dc-ln">' + (newN || '') + '</td>' +
        '<td class="dc-sign">' + sign + '</td>' +
        '<td class="dc-code">' + html + '</td></tr>';
    }
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.type === 'eq') {
        h += line('eq', r.left.n, r.right.n, '&nbsp;', r.left.html);
      } else if (r.type === 'del') {
        h += line('del', r.left.n, '', '-', r.left.html);
      } else if (r.type === 'add') {
        h += line('add', '', r.right.n, '+', r.right.html);
      } else { // chg -> a removed line then an added line
        h += line('del', r.left.n, '', '-', r.left.html);
        h += line('add', '', r.right.n, '+', r.right.html);
      }
    }
    h += '</tbody></table>';
    return h;
  }

  /* ---------- main update ---------- */
  function readSides() {
    var a = inA.value, b = inB.value;
    jsonNote.hidden = true;
    if (optJson.checked) {
      var na = tryNormalizeJson(a), nb = tryNormalizeJson(b);
      a = na.text; b = nb.text;
      if (!na.ok || !nb.ok) {
        jsonNote.hidden = false;
        jsonNote.textContent = 'One side is not valid JSON, so it is compared as plain text.';
      }
    }
    return { a: a, b: b };
  }

  function update() {
    var sides = readSides();
    var a = sides.a, b = sides.b;

    if (!a && !b) {
      output.innerHTML = '<div class="dc-empty">Paste text on both sides to see the difference.</div>';
      statsEl.innerHTML = '';
      return;
    }

    var res = buildRows(a, b, currentOpts());

    if (res.identical) {
      var same = optWs.checked || optCase.checked
        ? 'The two sides match once the ignore options are applied.'
        : 'The two sides are identical.';
      output.innerHTML = '<div class="dc-empty">' + same + '</div>';
      statsEl.innerHTML = '<span class="same">no differences</span>';
      return;
    }

    output.innerHTML = view === 'sbs' ? renderSbs(res.rows) : renderUni(res.rows);
    statsEl.innerHTML =
      '<span class="add">+' + res.additions + '</span>' +
      '<span class="del">-' + res.deletions + '</span>';
  }

  /* ---------- share via URL ---------- */
  function buildShareUrl() {
    var payload = { a: inA.value, b: inB.value };
    // pack option/view flags compactly
    var f = 0;
    if (optWs.checked) f |= 1;
    if (optCase.checked) f |= 2;
    if (optJson.checked) f |= 4;
    if (view === 'uni') f |= 8;
    payload.f = f;
    var comp = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
    var base = location.origin + location.pathname;
    return base + '#d=' + comp;
  }

  function applyFlags(f) {
    optWs.checked = !!(f & 1);
    optCase.checked = !!(f & 2);
    optJson.checked = !!(f & 4);
    setView((f & 8) ? 'uni' : 'sbs');
  }

  function loadFromHash() {
    var hash = location.hash || '';
    var m = hash.match(/[#&]d=([^&]+)/);
    if (!m) return false;
    try {
      var json = LZString.decompressFromEncodedURIComponent(m[1]);
      if (!json) return false;
      var payload = JSON.parse(json);
      inA.value = payload.a || '';
      inB.value = payload.b || '';
      applyFlags(payload.f || 0);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- export .diff ---------- */
  function download(name, text) {
    var blob = new Blob([text], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function flashMsg(msg) {
    if (!flash) return;
    flash.textContent = msg;
    flash.classList.add('show');
    setTimeout(function () { flash.classList.remove('show'); }, 1600);
  }

  function copyText(text, ok) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () { window.prompt('Copy this:', text); });
    } else {
      window.prompt('Copy this:', text);
    }
  }

  /* ---------- view switch ---------- */
  function setView(v) {
    view = v;
    var sbs = v === 'sbs';
    viewSbsBtn.classList.toggle('on', sbs);
    viewUniBtn.classList.toggle('on', !sbs);
    viewSbsBtn.setAttribute('aria-pressed', sbs ? 'true' : 'false');
    viewUniBtn.setAttribute('aria-pressed', sbs ? 'false' : 'true');
  }

  /* ---------- wire up ---------- */
  var t;
  function scheduleUpdate() { clearTimeout(t); t = setTimeout(update, 180); }

  inA.addEventListener('input', scheduleUpdate);
  inB.addEventListener('input', scheduleUpdate);
  optWs.addEventListener('change', update);
  optCase.addEventListener('change', update);
  optJson.addEventListener('change', update);

  viewSbsBtn.addEventListener('click', function () { setView('sbs'); update(); });
  viewUniBtn.addEventListener('click', function () { setView('uni'); update(); });

  $('btn-swap').addEventListener('click', function () {
    var tmp = inA.value; inA.value = inB.value; inB.value = tmp;
    update();
  });

  $('btn-clear').addEventListener('click', function () {
    inA.value = ''; inB.value = '';
    if (location.hash) history.replaceState(null, '', location.pathname);
    shareNote.textContent = '';
    inA.focus();
    update();
  });

  $('btn-share').addEventListener('click', function () {
    if (!inA.value && !inB.value) { flashMsg('nothing to share yet'); return; }
    var url = buildShareUrl();
    copyText(url, function () { flashMsg('share link copied ✳'); });
    if (url.length > SHARE_WARN) {
      shareNote.className = 'dc-note warn';
      shareNote.textContent = 'Heads up: this link is ' + url.length.toLocaleString() +
        ' characters. Some chat apps and email clients truncate very long links. For large files, use Export .diff instead.';
    } else {
      shareNote.className = 'dc-note';
      shareNote.textContent = 'Share link copied (' + url.length.toLocaleString() +
        ' chars). It carries your text inside the link, so no server sees it - share it only with people you would share the text with.';
    }
  });

  $('btn-export').addEventListener('click', function () {
    if (!inA.value && !inB.value) { flashMsg('nothing to export yet'); return; }
    // a .diff/.patch must be literal, so it is built from the raw text, not the
    // ignore-whitespace / ignore-case view.
    var patch = Diff.createTwoFilesPatch('original', 'changed', inA.value, inB.value, '', '');
    download('changes.diff', patch);
    flashMsg('.diff exported ✳');
  });

  /* ---------- init ---------- */
  loadFromHash();
  update();
})();
