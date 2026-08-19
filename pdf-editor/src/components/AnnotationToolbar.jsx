const TOOLS = [
  { id: 'cursor',    label: '↖',  title: 'Select / move / delete' },
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

const FONTS = [
  { id: 'sans',  label: 'Sans'  },
  { id: 'serif', label: 'Serif' },
  { id: 'mono',  label: 'Mono'  },
];

export function AnnotationToolbar({
  activeTool, setActiveTool,
  activeColor, setActiveColor,
  strokeWidth, setStrokeWidth,
  showTextOptions,
  textFont, setTextFont,
  textSize, setTextSize,
  textBold, setTextBold,
  textShadow, setTextShadow,
}) {
  const clampSize = (v) => Math.max(6, Math.min(96, Math.round(v) || 6));
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

      {showTextOptions ? (
        <>
          <div className="ann-sep" aria-hidden="true" />
          <div className="ann-group ann-text-opts" aria-label="Text style">
            <select
              className="ann-font"
              value={textFont}
              onChange={(e) => setTextFont(e.target.value)}
              aria-label="Font"
              title="Font"
            >
              {FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <div className="ann-size" title="Font size">
              <button type="button" className="btn icon" aria-label="Smaller" onClick={() => setTextSize(clampSize(textSize - 1))}>-</button>
              <input
                type="number"
                min="6"
                max="96"
                value={textSize}
                onChange={(e) => setTextSize(clampSize(parseInt(e.target.value, 10)))}
                aria-label="Font size in points"
              />
              <button type="button" className="btn icon" aria-label="Larger" onClick={() => setTextSize(clampSize(textSize + 1))}>+</button>
            </div>
            <button
              type="button"
              className={`btn icon ann-bold${textBold ? ' active' : ''}`}
              title="Bold"
              onClick={() => setTextBold(!textBold)}
              aria-pressed={textBold}
            >
              B
            </button>
            <button
              type="button"
              className={`btn ann-shadow${textShadow ? ' active' : ''}`}
              title="Drop shadow"
              onClick={() => setTextShadow(!textShadow)}
              aria-pressed={textShadow}
            >
              Shadow
            </button>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
