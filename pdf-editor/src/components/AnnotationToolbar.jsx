const TOOLS = [
  { id: 'cursor',    label: '↖',  title: 'Select / delete' },
  { id: 'highlight', label: '▬',  title: 'Highlight' },
  { id: 'freedraw',  label: '✏',  title: 'Freehand draw' },
  { id: 'text',      label: 'T',  title: 'Text' },
  { id: 'rectangle', label: '□',  title: 'Rectangle' },
];

const COLORS = [
  { value: '#ffd60a', title: 'Yellow' },
  { value: '#0a0a0a', title: 'Black' },
  { value: '#e63946', title: 'Red' },
  { value: '#1d6fa4', title: 'Blue' },
  { value: '#2a9d5c', title: 'Green' },
];

const WIDTHS = [1, 2, 3, 4, 6];

export function AnnotationToolbar({ activeTool, setActiveTool, activeColor, setActiveColor, strokeWidth, setStrokeWidth }) {
  return (
    <div className="ann-toolbar" role="toolbar" aria-label="Annotation tools">
      <div className="ann-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn icon ann-tool${activeTool === t.id ? ' active' : ''}`}
            title={t.title}
            onClick={() => setActiveTool(t.id)}
            aria-pressed={activeTool === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ann-sep" aria-hidden="true" />

      <div className="ann-group" aria-label="Color">
        {COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`color-swatch${activeColor === c.value ? ' active' : ''}`}
            style={{ background: c.value }}
            title={c.title}
            onClick={() => setActiveColor(c.value)}
            aria-pressed={activeColor === c.value}
          />
        ))}
      </div>

      <div className="ann-sep" aria-hidden="true" />

      <div className="ann-group" aria-label="Stroke width">
        {WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            className={`btn icon ann-width${strokeWidth === w ? ' active' : ''}`}
            title={`Stroke ${w}px`}
            onClick={() => setStrokeWidth(w)}
            aria-pressed={strokeWidth === w}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}
