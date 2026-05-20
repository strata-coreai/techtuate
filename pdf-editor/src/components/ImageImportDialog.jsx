import { useEffect, useState } from 'react';

/**
 * Shows a preview list of queued image files and lets the user pick a page-size
 * mode before committing.
 *
 * mode='build'  → user dropped images with no PDF open → creates a new PDF
 * mode='add'    → user dropped images with a PDF open → appends pages
 */
export function ImageImportDialog({ initialFiles, mode, onConfirm, onClose }) {
  const [files, setFiles] = useState(initialFiles);
  const [objectUrls, setObjectUrls] = useState(() => initialFiles.map((f) => URL.createObjectURL(f)));
  const [pageSizeMode, setPageSizeMode] = useState('fit-letter');

  useEffect(() => {
    // revoke on unmount
    const urls = objectUrls;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const removeImage = (i) => {
    URL.revokeObjectURL(objectUrls[i]);
    setFiles((prev) => prev.filter((_, j) => j !== i));
    setObjectUrls((prev) => prev.filter((_, j) => j !== i));
  };

  if (files.length === 0) {
    onClose();
    return null;
  }

  const handleConfirm = () => {
    onConfirm(files, pageSizeMode);
    onClose();
  };

  const n = files.length;
  const actionLabel = mode === 'build'
    ? `Build PDF (${n} page${n !== 1 ? 's' : ''})`
    : `Add ${n} page${n !== 1 ? 's' : ''}`;

  return (
    <div className="dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog image-dialog" role="dialog" aria-modal="true" aria-labelledby="img-dialog-title">
        <h3 id="img-dialog-title" className="dialog-title">
          {mode === 'build' ? 'Build PDF from images' : 'Add pages from images'}
        </h3>

        <div className="img-list">
          {files.map((file, i) => (
            <div key={i} className="img-item">
              <img src={objectUrls[i]} className="img-preview" alt={file.name} />
              <span className="img-name" title={file.name}>{trunc(file.name, 28)}</span>
              <button type="button" className="btn icon img-remove" title="Remove" onClick={() => removeImage(i)}>✕</button>
            </div>
          ))}
        </div>

        <div className="dialog-row">
          <label className="dialog-label">
            Page size
            <select
              className="scale-select"
              value={pageSizeMode}
              onChange={(e) => setPageSizeMode(e.target.value)}
            >
              <option value="fit-letter">Fit to letter (default)</option>
              <option value="fill-letter">Fill letter (may crop)</option>
              <option value="original">Original (1 px = 1 pt)</option>
            </select>
          </label>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>cancel</button>
          <button type="button" className="btn primary" onClick={handleConfirm}>{actionLabel}</button>
        </div>
      </div>
    </div>
  );
}

function trunc(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
