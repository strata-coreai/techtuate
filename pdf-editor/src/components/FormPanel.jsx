import { PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFOptionList } from 'pdf-lib';

/**
 * Right-side panel for filling AcroForm fields.
 * formFields === null  → still loading
 * formFields === []    → no fields detected
 * formFields.length>0  → render inputs
 */
export function FormPanel({ formFields, formValues, setFormValues, flattenForm, setFlattenForm, structurallyModified }) {
  const set = (name, value) =>
    setFormValues((prev) => { const n = new Map(prev); n.set(name, value); return n; });

  if (formFields === null) {
    return (
      <div className="form-panel-inner">
        <span className="loading">loading fields…</span>
      </div>
    );
  }

  if (formFields.length === 0) {
    return (
      <div className="form-panel-inner">
        <p className="form-empty-msg">
          No form fields detected. This tool fills existing fields — it doesn't add new ones.
        </p>
      </div>
    );
  }

  return (
    <div className="form-panel-inner">
      {structurallyModified && (
        <div className="form-warn">
          Pages have been reordered or merged. Form values may not embed correctly in the output.
        </div>
      )}

      {formFields.map((field) => (
        <div key={field.name} className="form-field-row">
          <label className="form-field-label" title={field.name}>
            {trunc(field.name, 32)}
          </label>
          <FieldInput field={field} value={formValues.get(field.name)} onChange={(v) => set(field.name, v)} />
        </div>
      ))}

      <div className="form-flatten-row">
        <label className="flatten-label">
          <input
            type="checkbox"
            checked={flattenForm}
            onChange={(e) => setFlattenForm(e.target.checked)}
          />
          Flatten on save
        </label>
        <span className="flatten-hint">
          Bakes values in; fields won't be editable in other tools.
        </span>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const { type, name, options } = field;
  const val = value ?? field.currentValue ?? '';

  if (type === 'text') {
    return (
      <input
        className="form-input"
        type="text"
        value={val}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
      />
    );
  }

  if (type === 'checkbox') {
    return (
      <input
        className="form-checkbox"
        type="checkbox"
        checked={!!val}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }

  if (type === 'dropdown' || type === 'optionList') {
    return (
      <select className="form-select" value={val} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (type === 'radio') {
    return (
      <div className="form-radio-group">
        {options.map((o) => (
          <label key={o} className="form-radio-label">
            <input
              type="radio"
              name={name}
              value={o}
              checked={val === o}
              onChange={() => onChange(o)}
            />
            {o}
          </label>
        ))}
      </div>
    );
  }

  // unknown / fallback
  return (
    <input className="form-input" type="text" value={val} onChange={(e) => onChange(e.target.value)} placeholder="—" />
  );
}

function trunc(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ── helpers shared with App.jsx (exported) ────────────────────────────────

export function getFieldType(field) {
  if (field instanceof PDFTextField)  return 'text';
  if (field instanceof PDFCheckBox)   return 'checkbox';
  if (field instanceof PDFDropdown)   return 'dropdown';
  if (field instanceof PDFRadioGroup) return 'radio';
  if (field instanceof PDFOptionList) return 'optionList';
  return 'unknown';
}

export function getFieldOptions(field) {
  if (field instanceof PDFDropdown || field instanceof PDFOptionList || field instanceof PDFRadioGroup) {
    try { return field.getOptions(); } catch { return []; }
  }
  return [];
}

export function getFieldCurrentValue(field, type) {
  try {
    if (type === 'text')      return field.getText() ?? '';
    if (type === 'checkbox')  return field.isChecked();
    if (type === 'dropdown')  return field.getSelected() ?? '';
    if (type === 'radio')     return field.getSelected() ?? '';
    if (type === 'optionList') return field.getSelected()?.[0] ?? '';
  } catch {}
  return '';
}

export function applyFormValue(form, name, value) {
  try {
    const field = form.getField(name);
    if (field instanceof PDFTextField) {
      field.setText(String(value ?? ''));
    } else if (field instanceof PDFCheckBox) {
      value ? field.check() : field.uncheck();
    } else if (field instanceof PDFDropdown) {
      if (value) field.select(String(value));
    } else if (field instanceof PDFRadioGroup) {
      if (value) field.select(String(value));
    } else if (field instanceof PDFOptionList) {
      if (value) field.select([String(value)]);
    }
  } catch (e) {
    console.warn(`Form field "${name}" could not be set:`, e);
  }
}
