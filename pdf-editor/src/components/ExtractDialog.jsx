import { useState } from 'react';

export function ExtractDialog({ numPages, onExtract, onClose }) {
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState(String(numPages));
  const [err, setErr] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = parseInt(from, 10);
    const t = parseInt(to, 10);
    if (Number.isNaN(f) || Number.isNaN(t) || f < 1 || t < f || t > numPages) {
      setErr(`Enter a valid range between 1 and ${numPages}.`);
      return;
    }
    onExtract(f, t);
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="extract-title">
        <h3 id="extract-title" className="dialog-title">Extract pages</h3>
        <p className="dialog-sub">Downloads a new PDF with only the selected page range. The open document is unchanged.</p>
        <form onSubmit={handleSubmit}>
          <div className="dialog-row">
            <label className="dialog-label">
              From
              <input
                className="dialog-input"
                type="number"
                value={from}
                min={1}
                max={numPages}
                onChange={(e) => { setFrom(e.target.value); setErr(''); }}
              />
            </label>
            <label className="dialog-label">
              To
              <input
                className="dialog-input"
                type="number"
                value={to}
                min={1}
                max={numPages}
                onChange={(e) => { setTo(e.target.value); setErr(''); }}
              />
            </label>
          </div>
          {err && <div className="dialog-err">{err}</div>}
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onClose}>cancel</button>
            <button type="submit" className="btn primary">extract &amp; download</button>
          </div>
        </form>
      </div>
    </div>
  );
}
