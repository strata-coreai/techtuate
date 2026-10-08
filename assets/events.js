/*
  techtuate usage events.
  One shared script for every page. It does not read file contents or form
  fields; it only notes that an action happened, on which tool, and the file
  extension of a download.

  Events:
    tool_export    a result was downloaded or copied (method: download | copy)
    ai_scan        an AI scan finished successfully (card reader, font finder,
                   business card maker digitize)
    ai_scan_error  an AI scan came back with an error
    support_click  a click on the Buy Me a Coffee link
    seo_to_tool    a click from a marketing page (/vs/, /why-free/,
                   /free-pdf-editor/) into a tool

  The analytics tag is added outside this repo, so send() works with
  Cloudflare Zaraz, a plain gtag, or a dataLayer, whichever is present.
*/
(function () {
  'use strict';

  var first = location.pathname.split('/').filter(Boolean)[0] || '';
  var NAMES = { '': 'home', c: 'contact-page' };
  var PAGE = NAMES[first] || first;
  var MARKETING = { vs: 1, 'why-free': 1, 'free-pdf-editor': 1 };
  var NOT_TOOLS = { '': 1, vs: 1, 'why-free': 1, 'free-pdf-editor': 1, assets: 1 };

  function send(name, params) {
    var p = params || {};
    if (!p.tool) p.tool = PAGE;
    try {
      if (window.zaraz && typeof window.zaraz.track === 'function') {
        window.zaraz.track(name, p);
      } else if (typeof window.gtag === 'function') {
        window.gtag('event', name, p);
      } else {
        var row = { event: name };
        for (var k in p) row[k] = p[k];
        (window.dataLayer = window.dataLayer || []).push(row);
      }
    } catch (e) { /* never break a tool over analytics */ }
  }
  window.ttTrack = send;

  // One download can reach us twice (a.click() plus the bubbling click event).
  var lastExport = 0;
  function exported(method, fileType) {
    var now = Date.now();
    if (now - lastExport < 800) return;
    lastExport = now;
    var p = { method: method };
    if (fileType) p.file_type = fileType;
    send('tool_export', p);
  }

  function extOf(name) {
    var m = /\.([a-z0-9]{1,5})$/i.exec(name || '');
    return m ? m[1].toLowerCase() : 'file';
  }
  function downloadFrom(a) {
    exported('download', extOf(a.getAttribute('download')));
  }

  // Downloads started from code: a.click() and a.dispatchEvent(click),
  // which covers detached anchors and jsPDF / FileSaver saves.
  try {
    var A = HTMLAnchorElement.prototype;
    var origClick = A.click;
    A.click = function () {
      try { if (this.hasAttribute('download')) downloadFrom(this); } catch (e) {}
      return origClick.apply(this, arguments);
    };
    var origDispatch = A.dispatchEvent;
    A.dispatchEvent = function (ev) {
      try {
        if (ev && ev.type === 'click' && this.hasAttribute('download')) downloadFrom(this);
      } catch (e) {}
      return origDispatch.apply(this, arguments);
    };
  } catch (e) {}

  // Clicks the user makes: download links, support link, marketing -> tool.
  document.addEventListener('click', function (e) {
    try {
      var a = e.target && e.target.closest && e.target.closest('a');
      if (!a) return;
      if (a.hasAttribute('download')) { downloadFrom(a); return; }
      var href = a.href || '';
      if (/buymeacoffee\.com/i.test(href)) { send('support_click'); return; }
      if (MARKETING[first] && a.host === location.host) {
        var target = a.pathname.split('/').filter(Boolean)[0] || '';
        if (!NOT_TOOLS[target]) send('seo_to_tool', { target_tool: target });
      }
    } catch (err) {}
  }, true);

  // Copy-to-clipboard counts as getting a result out of the tool.
  try {
    var cb = navigator.clipboard;
    if (cb && typeof cb.writeText === 'function') {
      var origWrite = cb.writeText.bind(cb);
      cb.writeText = function () {
        exported('copy');
        return origWrite.apply(null, arguments);
      };
    }
  } catch (e) {}

  // AI scans: watch the two Pages Function endpoints. Reads only the ok flag.
  try {
    if (typeof window.fetch === 'function') {
      var origFetch = window.fetch;
      window.fetch = function (input) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var res = origFetch.apply(this, arguments);
        var m = /\/api\/(scan|font)\b/.exec(url);
        if (m) {
          var kind = m[1] === 'font' ? 'font' : 'card';
          res.then(function (r) {
            return r.clone().json().then(function (j) {
              send(j && j.ok ? 'ai_scan' : 'ai_scan_error', { scan_type: kind });
            });
          }).catch(function () { send('ai_scan_error', { scan_type: kind }); });
        }
        return res;
      };
    }
  } catch (e) {}
})();
