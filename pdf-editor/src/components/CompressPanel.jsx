import { useState } from 'react';
import { formatBytes } from '../lib/format.js';

const MODES = [
  {
    id: 'light',
    label: 'Light',
    desc: 'Stream dedup via re-save, no image changes',
    estimate: '10-30% smaller',
  },
  {
    id: 'medium',
    label: 'Medium',
    desc: 'Re-encode images to JPEG 75, max 1200 px',
    estimate: '~50% smaller',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    desc: 'JPEG 55, max 800 px - preview quality',
    estimate: '~70-80% smaller',
  },
];

export function CompressPanel({ origSize, compressing, onCompress, onCancel }) {
  const [mode, setMode] = useState('medium');

  return (
    <div className="compress-panel">
      <div className="compress-header">
        <span className="compress-label">Compress</span>
        <span className="compress-orig">{formatBytes(origSize)}</span>
      </div>
      <div className="compress-modes">
        {MODES.map((m) => (
          <label key={m.id} className={`compress-mode${mode === m.id ? ' selected' : ''}`}>
            <input
              type="radio"
              name="compress-mode"
              value={m.id}
              checked={mode === m.id}
              onChange={() => setMode(m.id)}
            />
            <span className="compress-mode-name">{m.label}</span>
            <span className="compress-mode-desc">{m.desc}</span>
            <span className="compress-mode-est">{m.estimate}</span>
          </label>
        ))}
      </div>
      <div className="compress-actions">
        <button
          className="btn primary"
          onClick={() => onCompress(mode)}
          disabled={compressing}
        >
          {compressing ? <span className="loading">compressing...</span> : 'Compress and save'}
        </button>
        <button className="btn ghost" onClick={onCancel} disabled={compressing}>
          cancel
        </button>
      </div>
    </div>
  );
}
