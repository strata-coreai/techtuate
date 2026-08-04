/* ============================================================
   techtuate word & character counter
   - live word / character (with and without spaces) / sentence /
     paragraph counts and reading time, all in the browser
   - text is never uploaded
   ============================================================ */
(function () {
  'use strict';

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  function $(id) { return document.getElementById(id); }

  var input = $('input');
  var elWords = $('s-words');
  var elChars = $('s-chars');
  var elCharsNs = $('s-chars-ns');
  var elSentences = $('s-sentences');
  var elParagraphs = $('s-paragraphs');
  var elReading = $('s-reading');
  var tileChars = $('tile-chars');
  var limit = $('limit');
  var limitMsg = $('limit-msg');
  var flash = $('copy-flash');

  var READING_WPM = 200;

  function countWords(t) {
    var m = t.trim();
    if (!m) return 0;
    return m.split(/\s+/).length;
  }
  function countSentences(t) {
    var parts = t.split(/[.!?…]+/);
    var n = 0;
    for (var i = 0; i < parts.length; i++) if (parts[i].trim()) n++;
    return n;
  }
  function countParagraphs(t) {
    if (!t.trim()) return 0;
    var parts = t.split(/\n{2,}/);
    var n = 0;
    for (var i = 0; i < parts.length; i++) if (parts[i].trim()) n++;
    return n || 1;
  }
  function readingTime(words) {
    if (!words) return '0 sec';
    var mins = words / READING_WPM;
    if (mins < 1) return Math.max(1, Math.round(mins * 60)) + ' sec';
    var m = Math.floor(mins);
    var s = Math.round((mins - m) * 60);
    if (s === 60) { m += 1; s = 0; }
    return s ? m + ' min ' + s + ' sec' : m + ' min';
  }
  function fmt(n) { return n.toLocaleString('en-US'); }

  function update() {
    var t = input.value;
    var chars = t.length;
    var charsNs = t.replace(/\s/g, '').length;
    var words = countWords(t);

    elWords.textContent = fmt(words);
    elChars.textContent = fmt(chars);
    elCharsNs.textContent = fmt(charsNs);
    elSentences.textContent = fmt(countSentences(t));
    elParagraphs.textContent = fmt(countParagraphs(t));
    elReading.textContent = readingTime(words);

    applyLimit(chars);
  }

  function applyLimit(chars) {
    var lim = parseInt(limit.value, 10);
    if (!isFinite(lim) || lim <= 0) {
      tileChars.classList.remove('over');
      limitMsg.hidden = true;
      return;
    }
    var left = lim - chars;
    limitMsg.hidden = false;
    if (left < 0) {
      tileChars.classList.add('over');
      limitMsg.classList.remove('ok');
      limitMsg.textContent = 'over by ' + fmt(-left);
    } else {
      tileChars.classList.remove('over');
      limitMsg.classList.add('ok');
      limitMsg.textContent = fmt(left) + ' left';
    }
  }

  function flashMsg(msg) {
    if (!flash) return;
    flash.textContent = msg;
    flash.classList.add('show');
    setTimeout(function () { flash.classList.remove('show'); }, 1400);
  }

  input.addEventListener('input', update);
  limit.addEventListener('input', function () { applyLimit(input.value.length); });

  $('btn-clear').addEventListener('click', function () {
    input.value = '';
    input.focus();
    update();
  });
  $('btn-copy').addEventListener('click', function () {
    if (!input.value) { flashMsg('nothing to copy'); return; }
    function done() { flashMsg('text copied ✳'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(input.value).then(done).catch(function () { input.select(); });
    } else { input.select(); }
  });

  update();
})();
