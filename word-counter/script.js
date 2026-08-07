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
  var elLevel = $('s-level');
  var elEase = $('s-ease');
  var elEaseCap = $('cap-ease');
  var tileChars = $('tile-chars');
  var limit = $('limit');
  var limitMsg = $('limit-msg');
  var flash = $('copy-flash');

  var READING_WPM = 200;
  // Readability needs a little text before the estimate means anything.
  var READ_MIN_WORDS = 5;

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

  /* ---------- readability ----------
     Estimates via Flesch Reading Ease + Flesch-Kincaid grade. Both need a
     syllable count, which is heuristic in English, so these are estimates. */
  function syllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return 0;
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    var m = word.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
  }

  // Flesch Reading Ease band -> short plain-English label
  function easeBand(score) {
    if (score >= 90) return 'Very easy';
    if (score >= 80) return 'Easy';
    if (score >= 70) return 'Fairly easy';
    if (score >= 60) return 'Standard';
    if (score >= 50) return 'Fairly hard';
    if (score >= 30) return 'Hard';
    return 'Very hard';
  }

  // Flesch-Kincaid grade -> tile label
  function gradeLabel(grade) {
    var g = Math.round(grade);
    if (g < 1) return 'Grade 1';
    if (g <= 12) return 'Grade ' + g;
    if (g <= 15) return 'College';
    return 'Postgrad';
  }

  // returns null when there is not enough text, else { ease, band, grade, gradeLabel }
  function readability(text, words, sentences) {
    if (words < READ_MIN_WORDS) return null;
    var sent = Math.max(sentences, 1);
    var toks = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
    if (!toks.length) return null;
    var syl = 0;
    for (var i = 0; i < toks.length; i++) syl += syllables(toks[i]);
    var wps = words / sent;             // words per sentence
    var spw = syl / toks.length;        // syllables per word
    var ease = 206.835 - 1.015 * wps - 84.6 * spw;
    var grade = 0.39 * wps + 11.8 * spw - 15.59;
    ease = Math.max(0, Math.min(100, ease));
    return { ease: Math.round(ease), band: easeBand(ease), grade: grade, gradeLabel: gradeLabel(grade) };
  }

  function update() {
    var t = input.value;
    var chars = t.length;
    var charsNs = t.replace(/\s/g, '').length;
    var words = countWords(t);
    var sentences = countSentences(t);

    elWords.textContent = fmt(words);
    elChars.textContent = fmt(chars);
    elCharsNs.textContent = fmt(charsNs);
    elSentences.textContent = fmt(sentences);
    elParagraphs.textContent = fmt(countParagraphs(t));
    elReading.textContent = readingTime(words);

    var r = readability(t, words, sentences);
    if (r) {
      elLevel.textContent = r.gradeLabel;
      elEase.textContent = r.band;
      elEaseCap.textContent = 'Reading ease · ' + r.ease;
    } else {
      elLevel.textContent = '-';
      elEase.textContent = '-';
      elEaseCap.textContent = 'Reading ease';
    }

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
