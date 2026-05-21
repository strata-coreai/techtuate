/**
 * Coffee prompt - appears once per browser session, the first time the user
 * exports a file. Two choices, both result in the file downloading:
 *   1. "Buy me a coffee" - opens BMaC in a new tab, then proceeds with save.
 *   2. "Save for free" - just proceeds with save.
 *
 * No dark patterns: no close-X, no countdown, no guilt. Per-session asks only.
 * Escape key resolves as "save for free" so the user is never stuck.
 */

import { useEffect } from 'react';

const BMAC_URL = 'https://buymeacoffee.com/techtuate';

export function CoffeePrompt({ open, onResolve }) {
  // Escape = save for free (don't trap the file)
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onResolve(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onResolve]);

  if (!open) return null;

  function buyAndSave() {
    try { window.open(BMAC_URL, '_blank', 'noopener'); } catch {}
    onResolve();
  }

  return (
    <div className="coffee-overlay" role="dialog" aria-modal="true" aria-labelledby="coffee-title">
      <div className="coffee-card">
        <div className="coffee-title" id="coffee-title">your file is ready.</div>
        <p className="coffee-body">
          buy me a coffee? or short on cash, no worries, we got you.
        </p>
        <div className="coffee-actions">
          <button className="btn primary" type="button" onClick={buyAndSave} autoFocus>
            Buy me a coffee
          </button>
          <button className="btn ghost" type="button" onClick={onResolve}>
            Save for free
          </button>
        </div>
        <div className="coffee-foot">
          free forever either way. coffees keep the next tool shipping a little faster.
        </div>
      </div>
    </div>
  );
}
