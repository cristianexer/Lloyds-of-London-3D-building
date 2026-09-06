import {
  RotateCcw,
  Play,
  Pause,
  Maximize,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  X,
  Layers3,
  Box,
  Slice,
  MoveUpRight,
} from 'lucide-react';
import { useExplorer, type View, type Mode } from '../store';
export const modeItems: { id: Mode; name: string; icon: typeof Box }[] = [
  { id: 'exterior', name: 'Exterior', icon: Box },
  { id: 'section', name: 'Cutaway', icon: Slice },
  { id: 'floors', name: 'Floors', icon: Layers3 },
];
export function ModeSwitch() {
  const mode = useExplorer((s) => s.mode);
  return (
    <nav className="mode-switch" aria-label="Exploration mode">
      {modeItems.map(({ id, name, icon: Icon }) => (
        <button
          key={id}
          className={mode === id ? 'active' : ''}
          aria-pressed={mode === id}
          onClick={() => useExplorer.getState().setMode(id)}
        >
          <Icon size={15} />
          {name}
        </button>
      ))}
    </nav>
  );
}
export function CameraControls() {
  const rotate = useExplorer((s) => s.autoRotate),
    reduced = useExplorer((s) => s.reducedMotion),
    mode = useExplorer((s) => s.mode),
    view = useExplorer((s) => s.view);
  const items: { name: string; view: View }[] = [
    { name: 'Three-quarter', view: 'hero' },
    { name: 'Lime Street', view: 'lime' },
    { name: 'Rear elevation', view: 'rear' },
    { name: 'Roof', view: 'roof' },
    { name: 'Atrium', view: 'atrium' },
    { name: 'Underwriting Room', view: 'room' },
  ];
  const camera = (view: View) => {
    if (view === 'atrium' || view === 'room') {
      useExplorer.getState().setMode('section');
      useExplorer.getState().setSection(0);
    }
    useExplorer.getState().camera(view);
  };
  return (
    <>
      <div className="camera-presets">
        <span className="small-label">VIEWPOINT</span>
        <select
          aria-label="Camera viewpoint"
          value={view === 'frame' ? '' : view}
          onChange={(e) => camera(e.target.value as View)}
        >
          <option value="" disabled>
            Selected component
          </option>
          {items.map((i) => (
            <option value={i.view} key={i.view}>
              {i.name}
            </option>
          ))}
        </select>
        <MoveUpRight size={14} />
      </div>
      <div className="camera-tools" aria-label="Camera controls">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => window.dispatchEvent(new CustomEvent('explorer-zoom', { detail: 0.84 }))}
        >
          <Plus size={19} />
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => window.dispatchEvent(new CustomEvent('explorer-zoom', { detail: 1.19 }))}
        >
          <Minus size={19} />
        </button>
        <span />
        <button
          title="Reset view and components"
          aria-label="Reset view"
          onClick={() => useExplorer.getState().reset()}
        >
          <Maximize size={17} />
        </button>
        <button
          title={reduced ? 'Auto-rotation disabled for reduced motion' : 'Auto-rotate'}
          aria-label={rotate ? 'Stop auto-rotation' : 'Start auto-rotation'}
          aria-pressed={rotate}
          disabled={reduced || mode === 'market'}
          className={rotate ? 'active' : ''}
          onClick={() => useExplorer.getState().setRotate(!rotate)}
        >
          {rotate ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>
    </>
  );
}
export function BottomControls() {
  const s = useExplorer();
  const ex = Math.round(s.explosion * 100);
  const stage =
    ex === 0
      ? 'The complete building'
      : ex < 24
        ? '01 / Lifting the roof'
        : ex < 49
          ? '02 / Opening the envelope'
          : ex < 73
            ? '03 / Revealing the services'
            : '04 / Separating the galleries';
  return (
    <div className="bottom-area">
      <div className="interaction-hint">
        <span>Drag to orbit</span>
        <i />
        <span>Scroll to zoom</span>
        <i />
        <span>Select to discover</span>
      </div>
      <section className="control-dock" aria-label="Building view controls">
        <div className="dock-main">
          <div className="dock-label">
            <span className="eyebrow">
              {s.mode === 'exterior'
                ? 'EXPLORE THE LAYERS'
                : s.mode === 'section'
                  ? 'THROUGH THE BUILDING'
                  : s.mode === 'floors'
                    ? 'ONE LEVEL AT A TIME'
                    : 'INSIDE THE MARKET'}
            </span>
            <span>
              {s.mode === 'exterior'
                ? stage
                : s.mode === 'section'
                  ? 'A section through the atrium'
                  : s.mode === 'floors'
                    ? 'Levels above are hidden'
                    : 'A fictional placement journey'}
            </span>
          </div>
          {s.mode === 'exterior' ? (
            <div className="explosion-input">
              <div className="range-label">
                <span>Assembled</span>
                <span>Exploded</span>
              </div>
              <input
                type="range"
                aria-label="Explosion"
                min="0"
                max="100"
                step="1"
                value={ex}
                style={{ '--range-progress': `${ex}%` } as React.CSSProperties}
                onChange={(e) => s.setExplosion(Number(e.target.value) / 100)}
              />
              <div className="range-ticks">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : s.mode === 'section' ? (
            <div className="explosion-input">
              <div className="range-label">
                <span>Lime Street side</span>
                <span>Through atrium</span>
              </div>
              <input
                type="range"
                aria-label="Section position"
                min="0"
                max="100"
                value={Math.round(s.section * 100)}
                style={{ '--range-progress': `${s.section * 100}%` } as React.CSSProperties}
                onChange={(e) => s.setSection(Number(e.target.value) / 100)}
              />
            </div>
          ) : s.mode === 'floors' ? (
            <div className="floor-select">
              <label htmlFor="floor-select">Explore a model level</label>
              <select
                id="floor-select"
                value={s.floor}
                onChange={(e) => s.setFloor(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0
                      ? 'Ground · Underwriting Room'
                      : `Gallery ${String(i).padStart(2, '0')}`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="market-dock-note">Invented participants · no live allocations</div>
          )}
          <div className="dock-value">
            {s.mode === 'exterior' ? (
              <>
                {ex}
                <small>%</small>
              </>
            ) : s.mode === 'section' ? (
              <Slice size={23} />
            ) : s.mode === 'floors' ? (
              <>{s.floor === 0 ? 'G' : String(s.floor).padStart(2, '0')}</>
            ) : (
              <Layers3 size={24} />
            )}
          </div>
          <button className="reset-button" onClick={s.reset}>
            <RotateCcw size={15} />
            <span>Reset view</span>
          </button>
        </div>
        <div className="dock-secondary">
          <span className="model-tag">
            <span className="accent-dot" />
            {s.mode === 'exterior'
              ? 'Architectural reconstruction'
              : s.mode === 'section'
                ? 'Section mode · explosion unavailable'
                : s.mode === 'floors'
                  ? 'Floor mode · explosion unavailable'
                  : 'Fictional educational example'}
          </span>
          {s.mode !== 'market' && (
            <label className="facade-control">
              Façade opacity
              <input
                aria-label="Façade opacity"
                type="range"
                min="5"
                max="100"
                value={Math.round(s.facade * 100)}
                onChange={(e) => s.setFacade(Number(e.target.value) / 100)}
              />
              <span>{Math.round(s.facade * 100)}%</span>
            </label>
          )}
          {(s.isolated || s.hidden.length > 0) && (
            <button className="text-button" onClick={s.restore}>
              Restore all
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
const tourStops = [
  {
    title: 'A building turned inside out.',
    text: 'Opened in 1986, Richard Rogers Partnership’s design makes the building’s workings part of its identity.',
  },
  {
    title: 'The services take the outside.',
    text: 'Six towers move service functions to the perimeter, leaving adaptable space within. Their separation here is an explanatory diagram.',
  },
  {
    title: 'Room for a changing market.',
    text: 'Galleries surround an open atrium. The concrete frame supports spaces that can evolve as the market changes.',
  },
  {
    title: 'A little light on the structure.',
    text: 'The glass vault crowns the central atrium. Slender steel ribs contrast with the concrete frame below.',
  },
  {
    title: 'The Room at the heart of it.',
    text: 'Brokers and underwriters meet at boxes. These desks and escalator routes illustrate the use of the space, not a current floor plan.',
  },
  {
    title: 'Now, make your own connections.',
    text: 'The building is assembled again. Select a component, try a section, or take the architecture apart at your own pace.',
  },
];
export function Tour() {
  const n = useExplorer((s) => s.tour);
  if (n === null) return null;
  const stop = tourStops[n];
  return (
    <section className="tour-card" aria-label="Guided architectural tour" aria-live="polite">
      <div className="panel-heading">
        <span className="eyebrow">A CLOSER LOOK · {String(n + 1).padStart(2, '0')} / 06</span>
        <button
          className="icon-button"
          aria-label="Skip guided tour"
          onClick={() => useExplorer.getState().tourStep(null)}
        >
          <X size={17} />
        </button>
      </div>
      <h2>{stop.title}</h2>
      <p>{stop.text}</p>
      <div className="tour-progress">
        {tourStops.map((_, i) => (
          <button
            aria-label={`Tour stop ${i + 1}`}
            aria-current={n === i ? 'step' : undefined}
            key={i}
            className={i === n ? 'active' : ''}
            onClick={() => useExplorer.getState().tourStep(i)}
          />
        ))}
      </div>
      <div className="tour-actions">
        <button
          disabled={n === 0}
          className="text-button"
          onClick={() => useExplorer.getState().tourStep(n - 1)}
        >
          <ArrowLeft size={15} />
          Previous
        </button>
        <button
          className="primary-button"
          onClick={() => useExplorer.getState().tourStep(n === 5 ? null : n + 1)}
        >
          {n === 5 ? 'Start exploring' : 'Continue'}
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
