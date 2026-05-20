Detect and fill AcroForm fields in PDFs. README feature #6 — last of the planned editor features.

## Scope

1. After load, call `pdfDoc.getForm()` (pdf-lib) on the loaded document.
   - Build a list of `{ name, type, page, options, value }` for every field via `form.getFields()`. Detect type via `instanceof PDFTextField`, `PDFCheckBox`, `PDFDropdown`, `PDFRadioGroup`, etc.
   - Cache this on doc load — don't recompute on every render.

2. **Right-side panel** (parallel to the existing left sidebar — sidebars become symmetric). For each field:
   - Label = field name (or alt text if set)
   - Input matching the type: `<input type="text">`, `<input type="checkbox">`, `<select>`, radio buttons.
   - Editing updates an in-memory `formValues: Map<fieldName, value>`.

3. **Empty-form case.** If no fields detected, show: "No form fields detected. This tool fills existing fields — it doesn't add new ones."

4. **Save integration.** Extend `onSave`'s `mutate` to:
   - `const form = doc.getForm();`
   - For each entry in `formValues`, get the field by name and call `setText` / `check`/`uncheck` / `select` per type.
   - If "flatten on save" toggle is on, call `form.flatten()` before save.

5. **Flatten toggle.** Checkbox near the save button, default off. Tooltip: "Flattening bakes values in and removes the fields. Off = values fill the fields but stay editable in other tools."

## Constraints

- pdf-lib's form API only. No new deps.
- Visual overlay on top of the page canvas (showing field bounds) is **nice-to-have**; ship without it if it's awkward. Side-panel inputs are the must-have.
- Don't lose changes when switching pages — `formValues` is global to the doc, not per-page.

## Acceptance

- Open a fillable IRS-style form PDF → side panel lists every field with the right input type.
- Type into the panel → save → open the downloaded PDF in Acrobat or Preview → values are filled.
- Toggle flatten on → save → the saved PDF shows values baked in, fields are no longer editable.
- Open a PDF with no form → panel shows the empty-state message; save still works (round-trip).
- `npm run build` succeeds.

## Out of scope

Creating new form fields, signature fields, JavaScript-actions inside forms, conditional logic.
