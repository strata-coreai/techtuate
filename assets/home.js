/* ============================================================
   techtuate home page: search, "I'm wrestling with" groups,
   device-only toggle, FAQ accordion, copy link, feedback mailto.
   The tool list is the <a class="tool"> cards in index.html: each card's
   data-* attributes are the single source for search + grouping.
   ============================================================ */
(function () {
  'use strict';

  // Group ids used in each card's data-groups. "all" is implicit.
  var GROUPS = [
    { id: 'all', label: 'everything', line: 'All {n} of them, in one place. Pick one above or search for the job.' },
    { id: 'paper', label: 'paperwork', line: 'Forms to fill, PDFs to unlock, word limits to hit and business cards to file.' },
    { id: 'picture', label: 'a picture', line: 'Too big, wrong format, or you need the colors or the font out of it.' },
    { id: 'design', label: 'a design', line: 'Fonts, colors, vectors and QR codes for the thing you are making.' },
    { id: 'code', label: 'some code', line: 'JSON, SQL, diffs, SVGs and passwords, handled in the tab.' },
    { id: 'people', label: 'new people', line: 'Just met someone. Save their card, share yours, keep your logins strong.' },
    { id: 'sound', label: 'sound & gifs', line: 'Voice memos, music clips and animated GIFs that need to be smaller.' }
  ];
  var MAX_RESULTS = 6;

  function $(s, root) { return (root || document).querySelector(s); }
  function $$(s, root) { return [].slice.call((root || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- tool index (built from the cards) ----------
  var cards = $$('.grid .tool');
  var TOOLS = cards.map(function (el) {
    var icon = $('.ticon', el);
    return {
      el: el,
      href: el.getAttribute('href'),
      name: ($('.tool-name', el) || {}).textContent || '',
      line: ($('.tool-line', el) || {}).textContent || '',
      short: el.getAttribute('data-short') || '',
      kw: (el.getAttribute('data-kw') || '').toLowerCase(),
      groups: (el.getAttribute('data-groups') || '').split(/\s+/).filter(Boolean),
      ai: el.getAttribute('data-ai') === '1',
      style: el.getAttribute('style') || '',
      iconSvg: icon ? icon.innerHTML : ''
    };
  });

  $$('[data-tool-count]').forEach(function (n) { n.textContent = String(TOOLS.length); });

  // ---------- search ----------
  var input = $('#q');
  var form = input && input.form;
  var results = $('#results');
  var clearBtn = $('.search-clear');
  var searchBox = $('#search');
  var matches = [];
  var active = 0;

  function score(q) {
    var ql = q.trim().toLowerCase();
    if (!ql) return [];
    var toks = ql.split(/\s+/).filter(Boolean);
    return TOOLS.map(function (t, i) {
      var n = t.name.toLowerCase(), l = t.line.toLowerCase(), s = 0;
      toks.forEach(function (w) {
        if (n.indexOf(w) >= 0) s += 3;
        if (t.kw.indexOf(w) >= 0) s += 2;
        if (l.indexOf(w) >= 0) s += 1;
      });
      if (n.indexOf(ql) >= 0) s += 4;
      return { t: t, s: s, i: i };
    }).filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.i - b.i; })
      .slice(0, MAX_RESULTS)
      .map(function (x) { return x.t; });
  }

  function nameHtml(name, q) {
    var ql = q.trim().toLowerCase();
    var idx = ql ? name.toLowerCase().indexOf(ql) : -1;
    if (idx < 0) return esc(name);
    return esc(name.slice(0, idx)) + '<mark>' + esc(name.slice(idx, idx + ql.length)) + '</mark>' + esc(name.slice(idx + ql.length));
  }

  function render() {
    var q = input.value;
    var has = !!q.trim();
    clearBtn.hidden = !has;
    if (!has) { closeResults(); return; }
    matches = score(q);
    active = 0;
    var html;
    if (matches.length) {
      html = '<ul role="listbox" aria-label="Matching tools">' + matches.map(function (t, i) {
        return '<li role="presentation"><a class="result' + (i === 0 ? ' first active' : '') + '" role="option" id="res-' + i + '"' +
          ' aria-selected="' + (i === 0) + '" href="' + esc(t.href) + '">' +
          '<span class="ticon sm" aria-hidden="true" style="' + esc(t.style) + '">' + t.iconSvg + '</span>' +
          '<span class="result-text"><span class="result-name">' + nameHtml(t.name, q) + '</span>' +
          '<span class="result-line">' + esc(t.line) + '</span></span>' +
          '<span class="result-tag' + (t.ai ? ' ai' : '') + '">' + (t.ai ? 'AI *' : 'on-device') + '</span></a></li>';
      }).join('') + '</ul>';
    } else {
      html = '<p class="results-empty">Nothing for "' + esc(q.trim()) + '" yet. <a class="tt-feedback" href="#feedback">Tell GJ you need it</a> and it might be the next one.</p>';
    }
    html += '<div class="results-hint" aria-hidden="true"><span>enter to open the top match</span><span>esc to close</span></div>';
    results.innerHTML = html;
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-activedescendant', matches.length ? 'res-0' : '');
  }

  function closeResults() {
    results.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function setActive(i) {
    var rows = $$('.result', results);
    if (!rows.length) return;
    active = (i + rows.length) % rows.length;
    rows.forEach(function (r, k) {
      r.classList.toggle('active', k === active);
      r.setAttribute('aria-selected', String(k === active));
    });
    input.setAttribute('aria-activedescendant', 'res-' + active);
  }

  function openActive() {
    var t = matches[active] || matches[0];
    if (t) { window.location.href = t.href; return true; }
    return false;
  }

  function focusSearch(smooth) {
    try { window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' }); } catch (e) { window.scrollTo(0, 0); }
    setTimeout(function () { input.focus({ preventScroll: true }); }, smooth ? 250 : 0);
  }

  if (input) {
    input.addEventListener('input', render);
    input.addEventListener('focus', function () { if (input.value.trim()) render(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (results.hidden) render(); else setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Escape') { e.preventDefault(); input.value = ''; render(); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!input.value.trim()) { input.focus(); return; }
      if (!openActive()) render();
    });
    clearBtn.addEventListener('click', function () { input.value = ''; render(); input.focus(); });
    document.addEventListener('click', function (e) {
      if (!searchBox.contains(e.target)) closeResults();
    });
    $$('.try .chip').forEach(function (b) {
      b.addEventListener('click', function () { input.value = b.getAttribute('data-q'); render(); input.focus(); });
    });
    $$('[data-focus-search]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); focusSearch(true); });
    });
    // "/" anywhere (when not typing) jumps to the search.
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      var a = document.activeElement;
      var typing = a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
      if (typing) return;
      e.preventDefault();
      focusSearch(true);
    });
    // Deep links: /?q=pdf prefills, /#search focuses.
    var pq = null;
    try { pq = new URLSearchParams(window.location.search).get('q'); } catch (e) { pq = null; }
    if (pq) { input.value = pq; focusSearch(false); render(); }
    else if (window.location.hash === '#search') focusSearch(false);
  }

  // ---------- groups + device-only toggle ----------
  var groupsBox = $('.groups');
  var groupLine = $('.group-line');
  var toggle = $('.toggle');
  var grid = $('.grid');
  var state = { group: 'all', localOnly: false };

  function inGroup(t, g) { return g === 'all' || t.groups.indexOf(g) >= 0; }

  if (groupsBox) {
    groupsBox.innerHTML = GROUPS.map(function (g) {
      var n = TOOLS.filter(function (t) { return inGroup(t, g.id); }).length;
      return '<button type="button" class="group" data-group="' + g.id + '" aria-pressed="' + (g.id === 'all') + '">' +
        esc(g.label) + '<sup>' + n + '</sup></button>';
    }).join('');
    groupsBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-group]');
      if (!b) return;
      state.group = b.getAttribute('data-group');
      applyFilter();
    });
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      state.localOnly = !state.localOnly;
      applyFilter();
    });
  }

  function applyFilter() {
    $$('.group', groupsBox).forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-group') === state.group));
    });
    toggle.setAttribute('aria-checked', String(state.localOnly));
    var g = GROUPS.filter(function (x) { return x.id === state.group; })[0] || GROUPS[0];
    groupLine.textContent = g.line.replace('{n}', String(TOOLS.length));
    var shown = 0;
    TOOLS.forEach(function (t) {
      var on = inGroup(t, state.group) && (!state.localOnly || !t.ai);
      t.el.hidden = !on;
      if (on) {
        // restart the rise animation so a filter change feels alive
        t.el.style.animation = 'none';
        void t.el.offsetWidth;
        t.el.style.animation = '';
        t.el.style.animationDelay = (shown * 0.03) + 's';
        shown++;
      }
    });
    var empty = $('.grid-empty', grid);
    if (!shown) {
      if (!empty) {
        empty = document.createElement('p');
        empty.className = 'grid-empty';
        empty.textContent = 'Nothing here that stays fully on your device yet.';
        grid.insertBefore(empty, grid.firstChild);
      }
      empty.hidden = false;
    } else if (empty) {
      empty.hidden = true;
    }
  }
  if (groupLine) groupLine.textContent = GROUPS[0].line.replace('{n}', String(TOOLS.length));

  // ---------- FAQ: one open at a time ----------
  $$('.faq[data-single-open]').forEach(function (faq) {
    var items = $$('details', faq);
    items.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        items.forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  });

  // ---------- copy link ----------
  var toast = $('#toast');
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }
  var copyBtn = $('#copy-link');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var url = 'https://techtuate.com';
      function done() {
        copyBtn.textContent = 'Link copied';
        showToast('Link copied. Now go paste it somewhere.');
        setTimeout(function () { copyBtn.textContent = 'Copy the link'; }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function () { window.prompt('Copy this link:', url); });
      } else {
        window.prompt('Copy this link:', url);
      }
    });
  }

  // ---------- feedback mailto (assembled at click time so the address never sits in raw HTML) ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.tt-feedback');
    if (!a) return;
    var u = ['joshi', 'gaurav'].join('');
    var d = ['gmail', '.com'].join('');
    a.href = 'mailto:' + u + '@' + d + '?subject=' + encodeURIComponent('techtuate feedback');
  }, true);

  var yr = $('#yr');
  if (yr) yr.textContent = String(new Date().getFullYear());
})();
