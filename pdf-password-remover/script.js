/* ============================================================
   techtuate PDF password remover
   - removes the open-password from a PDF (you enter the password
     you already have) and strips printing/copying restrictions
   - runs entirely in the browser via a WebAssembly build of qpdf
     (vendored in ./lib/); the file and password are never uploaded
   ============================================================ */
import createModule from './lib/qpdf.mjs';

(function () {
  'use strict';

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  var $ = function (id) { return document.getElementById(id); };
  var drop = $('drop');
  var fileInput = $('file');
  var work = $('work');
  var fname = $('fname');
  var pwrow = $('pwrow');
  var pw = $('pw');
  var togglePw = $('toggle-pw');
  var btnUnlock = $('btn-unlock');
  var btnReset = $('btn-reset');
  var status = $('status');
  var dl = $('dl');

  var currentBytes = null;   // Uint8Array of the chosen PDF
  var currentName = '';
  var lastUrl = null;        // object URL to revoke

  /* ---------- qpdf runner ----------
     Runs `qpdf --decrypt [--password=..] in out` on the bytes and returns
     the unlocked bytes, or null when qpdf produced no output (wrong or
     missing password). A fresh module instance is used per run. */
  async function runQpdf(bytes, password) {
    var Module = await createModule({
      noInitialRun: true,
      locateFile: function (p) { return new URL('./lib/' + p, import.meta.url).href; }
    });
    var FS = Module.FS;
    FS.writeFile('/in.pdf', bytes);
    var args = ['--decrypt'];
    if (password) args.push('--password=' + password);
    args.push('/in.pdf', '/out.pdf');
    try { Module.callMain(args); } catch (e) { /* Emscripten throws ExitStatus on non-zero exit */ }
    var out = null;
    try { out = FS.readFile('/out.pdf'); } catch (e) { out = null; }
    return (out && out.length) ? out : null;
  }

  /* ---------- UI helpers ---------- */
  function setStatus(kind, html) {
    status.className = 'pr-status' + (kind ? ' ' + kind : '');
    status.innerHTML = html;
  }
  function busy(msg) { setStatus('busy', '<span class="pr-spin" aria-hidden="true"></span>' + msg); }

  function resetOutput() {
    dl.hidden = true;
    if (lastUrl) { URL.revokeObjectURL(lastUrl); lastUrl = null; }
  }

  function offerDownload(bytes) {
    resetOutput();
    var blob = new Blob([bytes], { type: 'application/pdf' });
    lastUrl = URL.createObjectURL(blob);
    dl.href = lastUrl;
    dl.download = currentName.replace(/\.pdf$/i, '') + '-unlocked.pdf';
    dl.hidden = false;
  }

  function fullReset() {
    currentBytes = null; currentName = '';
    resetOutput();
    work.hidden = true;
    pwrow.hidden = true;
    pw.value = '';
    drop.hidden = false;
    fileInput.value = '';
  }

  /* ---------- flow ---------- */
  async function loadFile(file) {
    if (!file) return;
    if (file.type && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      drop.hidden = false; work.hidden = true;
      alert('Please choose a PDF file.');
      return;
    }
    currentName = file.name || 'document.pdf';
    resetOutput();
    pwrow.hidden = true;
    pw.value = '';
    fname.textContent = currentName;
    drop.hidden = true;
    work.hidden = false;
    busy('Checking the PDF...');

    try {
      currentBytes = new Uint8Array(await file.arrayBuffer());
    } catch (e) {
      setStatus('err', 'Could not read that file. Try choosing it again.');
      return;
    }

    // First try with no password: handles unprotected files and
    // restriction-only files (open freely but block printing/copying).
    try {
      var out = await runQpdf(currentBytes, '');
      if (out) {
        offerDownload(out);
        setStatus('ok', 'Done. This PDF did not need a password (any printing or copying restrictions were removed). Download it below.');
      } else {
        pwrow.hidden = false;
        setStatus('', 'This PDF is password-protected. Enter the password you use to open it, then choose Unlock PDF.');
        pw.focus();
      }
    } catch (e) {
      setStatus('err', 'Something went wrong reading the PDF. Please try again.');
    }
  }

  async function unlockWithPassword() {
    if (!currentBytes) return;
    var password = pw.value;
    if (!password) { setStatus('err', 'Enter the PDF password first.'); pw.focus(); return; }
    busy('Unlocking...');
    dl.hidden = true;
    try {
      var out = await runQpdf(currentBytes, password);
      if (out) {
        offerDownload(out);
        setStatus('ok', 'Unlocked. Your PDF is ready to download below.');
      } else {
        setStatus('err', 'That password did not work. Double-check it and try again.');
        pw.focus(); pw.select();
      }
    } catch (e) {
      setStatus('err', 'Something went wrong. Please try again.');
    }
  }

  /* ---------- events ---------- */
  drop.addEventListener('click', function () { fileInput.click(); });
  drop.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', function () { loadFile(fileInput.files[0]); });

  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('drag'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('drag'); });
  });
  drop.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  btnUnlock.addEventListener('click', unlockWithPassword);
  pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') unlockWithPassword(); });
  btnReset.addEventListener('click', fullReset);

  togglePw.addEventListener('click', function () {
    var showing = pw.type === 'text';
    pw.type = showing ? 'password' : 'text';
    togglePw.textContent = showing ? 'show' : 'hide';
    pw.focus();
  });
})();
