import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  PanelLeft,
  Info,
  X,
  VolumeX,
  BookOpen,
  Compass,
  CircleHelp,
  Network,
} from 'lucide-react';
import { useExplorer } from './store';
import { Hierarchy, InfoPanel } from './components/Panels';
import { BottomControls, CameraControls, ModeSwitch, Tour } from './components/Controls';
import { Market } from './components/Market';
import { sources } from './data/sources';
import { parts } from './model/building';
const Scene = lazy(() => import('./components/Scene').then((m) => ({ default: m.Scene })));
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function canRender() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (gl) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
export default function App() {
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(canRender);
  const [about, setAbout] = useState(false);
  const [help, setHelp] = useState(false);
  const aboutRef = useRef<HTMLDialogElement>(null);
  const helpRef = useRef<HTMLDialogElement>(null);
  const view = useExplorer((s) => s.view);
  const interior = view === 'atrium' || view === 'room';
  const mode = useExplorer((s) => s.mode),
    catalogue = useExplorer((s) => s.catalogueOnly),
    infoOpen = useExplorer((s) => s.infoOpen),
    hierarchyOpen = useExplorer((s) => s.hierarchyOpen),
    tour = useExplorer((s) => s.tour),
    reduced = useExplorer((s) => s.reducedMotion);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => {
    setAvailable(false);
    useExplorer.getState().setCatalogue(true);
  }, []);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => useExplorer.getState().setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!available) useExplorer.getState().setCatalogue(true);
  }, [available]);
  useEffect(() => {
    if (about) aboutRef.current?.showModal();
    else aboutRef.current?.close();
  }, [about]);
  useEffect(() => {
    if (help) helpRef.current?.showModal();
    else helpRef.current?.close();
  }, [help]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || el.isContentEditable) return;
      if (e.key === '/' && !about && !help) {
        e.preventDefault();
        if (!useExplorer.getState().hierarchyOpen) useExplorer.getState().toggleHierarchy();
        requestAnimationFrame(() =>
          document.querySelector<HTMLInputElement>('[aria-label="Search components"]')?.focus(),
        );
      }
      if (e.key === 'Escape') {
        useExplorer.getState().closeInfo();
        useExplorer.getState().hover(null);
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [about, help]);
  return (
    <main
      className={`app ${infoOpen ? 'has-info' : ''} ${catalogue ? 'text-mode' : ''} ${mode === 'market' ? 'market-mode' : ''} ${interior ? 'interior-view' : ''}`}
    >
      <a
        className="skip-link"
        href="#catalogue-button"
        onClick={() => useExplorer.getState().setCatalogue(true)}
      >
        Skip 3D and explore the text catalogue
      </a>
      <header className="top-bar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            useExplorer.getState().reset();
          }}
          aria-label="Inside Lloyd’s home"
        >
          <svg viewBox="0 0 32 36" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="1.15">
              <path d="M4 32V11h5v21M22 32V3h6v29M11 32V16h9v16M2 18h28M2 25h28M12 16v-4a3.5 3.5 0 0 1 7 0v4" />
              <path d="M5 8h3M23 0h4M13 20v10M18 20v10" />
            </g>
          </svg>
          <span>
            Inside Lloyd’s<span className="brand-sub">AN ARCHITECTURAL EXPLORATION</span>
          </span>
        </a>
        <ModeSwitch />
        <div className="header-actions">
          <button
            className="market-link"
            title="Inside the market"
            aria-pressed={mode === 'market'}
            onClick={() =>
              useExplorer.getState().setMode(mode === 'market' ? 'exterior' : 'market')
            }
          >
            <span>Inside the market</span>
            <Network size={14} />
          </button>
          <button
            className="tour-button"
            onClick={() => {
              if (window.innerWidth < 900 && hierarchyOpen)
                useExplorer.getState().toggleHierarchy();
              useExplorer.getState().tourStep(0);
            }}
          >
            <Compass size={16} />
            <span>Guided tour</span>
            <ArrowRight size={14} />
          </button>
          <button
            className="icon-button about-button"
            aria-label="About this project"
            onClick={() => setAbout(true)}
          >
            <Info size={18} />
          </button>
        </div>
      </header>
      {available && !catalogue && (
        <SceneBoundary onError={onError}>
          <Suspense fallback={null}>
            <Scene onReady={onReady} onError={onError} />
          </Suspense>
        </SceneBoundary>
      )}
      {!ready && available && !catalogue && (
        <div className="loading" role="status">
          <div className="loading-line" />
          <span>Constructing the architecture</span>
          <small>Generating {parts.length.toLocaleString('en-GB')} elements locally</small>
        </div>
      )}
      {!catalogue && (
        <>
          <div className="editorial-intro">
            <div className="eyebrow">
              <span className="accent-dot" />
              ONE LIME STREET, LONDON
            </div>
            <h1>
              Architecture,
              <br />
              <em>inside out.</em>
            </h1>
            <p>
              Discover the remarkable building
              <br />
              that puts its workings on the outside.
            </p>
            <div className="building-credit">
              <span>Richard Rogers Partnership</span>
              <span>1978 — 1986</span>
            </div>
          </div>
          <div className="exhibit-index">
            <span>01 — LLOYD’S OF LONDON</span>
            <span>HIGH-TECH ARCHITECTURE</span>
          </div>
        </>
      )}
      {interior && mode !== 'market' && !catalogue && (
        <div className="interior-caption">
          <span className="eyebrow">WITHIN THE ARCHITECTURE</span>
          <h2>{view === 'atrium' ? 'A space for light.' : 'The heart of Lloyd’s.'}</h2>
          <p>
            {view === 'atrium'
              ? 'The central atrium and its glass vault.'
              : 'The Room · an illustrative reconstruction.'}
          </p>
        </div>
      )}
      {mode === 'market' && !catalogue ? (
        <Market />
      ) : tour !== null && !catalogue ? (
        <Tour />
      ) : (
        <Hierarchy />
      )}
      {!hierarchyOpen && !catalogue && mode !== 'market' && tour === null && (
        <button className="open-hierarchy" onClick={() => useExplorer.getState().toggleHierarchy()}>
          <PanelLeft size={16} />
          Building anatomy
        </button>
      )}
      <InfoPanel />
      {!catalogue && available && (
        <>
          <CameraControls />
          <BottomControls />
        </>
      )}
      {catalogue && (
        <div className="catalogue-title">
          <span className="eyebrow">THE TEXT COLLECTION</span>
          <h1>Every part has a purpose.</h1>
          <p>
            {available
              ? 'Explore the architectural catalogue, with or without the 3D model.'
              : '3D rendering is unavailable in this browser. The complete component catalogue and source references remain accessible.'}
          </p>
          <button
            className="primary-button"
            onClick={() => {
              if (available) useExplorer.getState().setCatalogue(false);
              else {
                const ok = canRender();
                setAvailable(ok);
                if (ok) {
                  setReady(false);
                  useExplorer.getState().setCatalogue(false);
                }
              }
            }}
          >
            {available ? 'Return to 3D' : 'Retry 3D rendering'}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      <footer className="site-footer">
        <span>
          Independent educational visualisation<span className="footer-dot">·</span>
          <button onClick={() => setAbout(true)}>
            Model notes & sources
            <ArrowUpRight size={11} />
          </button>
        </span>
        <div>
          <button
            id="catalogue-button"
            onClick={() => useExplorer.getState().setCatalogue(!catalogue)}
          >
            <BookOpen size={13} />
            <span>{catalogue ? '3D explorer' : 'Text catalogue'}</span>
          </button>
          <button
            className={reduced ? 'active' : ''}
            title="Reduce motion"
            aria-label="Reduce motion"
            aria-pressed={reduced}
            onClick={() => useExplorer.getState().setReducedMotion(!reduced)}
          >
            <VolumeX size={13} />
          </button>
          <button title="How to explore" aria-label="How to explore" onClick={() => setHelp(true)}>
            <CircleHelp size={14} />
          </button>
        </div>
      </footer>
      <dialog
        ref={aboutRef}
        className="modal"
        onCancel={() => setAbout(false)}
        onClick={(e) => {
          if (e.target === aboutRef.current) setAbout(false);
        }}
      >
        <div className="panel-heading">
          <span className="eyebrow">ABOUT THE EXHIBITION</span>
          <button className="icon-button" aria-label="Close about" onClick={() => setAbout(false)}>
            <X size={19} />
          </button>
        </div>
        <h2>
          Made to reveal.
          <br />
          <em>Not to survey.</em>
        </h2>
        <p>
          Inside Lloyd’s is an independent educational visualisation of the insurance marketplace’s
          building at One Lime Street. It is not an official Lloyd’s product.
        </p>
        <p>
          The original procedural model interprets public architectural descriptions and
          photographic references. Its footprint, proportions, service routes and orientation are
          approximate. Interior desks, escalator routes and heritage details are illustrative. No
          current box allocations are reproduced.
        </p>
        <p>
          Explosion is an educational diagram, not a construction sequence. Gallery numbers organise
          the model; they are not a certified floor schedule.
        </p>
        <h3>Public references</h3>
        <div className="source-links">
          {Object.values(sources).map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
              {s.title}
              <ArrowUpRight size={14} />
            </a>
          ))}
        </div>
        <small>
          Consulted 6 September 2026. Reference photographs are not redistributed. No third-party
          building model was imported. See the repository’s asset manifest for provenance.
        </small>
      </dialog>
      <dialog ref={helpRef} className="modal help-modal" onCancel={() => setHelp(false)}>
        <div className="panel-heading">
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <button className="icon-button" aria-label="Close help" onClick={() => setHelp(false)}>
            <X size={19} />
          </button>
        </div>
        <h2>Look a little closer.</h2>
        <dl className="help-list">
          <div>
            <dt>Orbit</dt>
            <dd>Drag with one finger or the left mouse button.</dd>
          </div>
          <div>
            <dt>Pan</dt>
            <dd>Drag with two fingers or the right mouse button.</dd>
          </div>
          <div>
            <dt>Zoom</dt>
            <dd>Pinch, scroll or use the + and − controls.</dd>
          </div>
          <div>
            <dt>Inspect</dt>
            <dd>Tap a part, or choose it in Building anatomy.</dd>
          </div>
          <div>
            <dt>Keyboard</dt>
            <dd>
              Focus the 3D scene. Arrow keys orbit; + and − zoom; Home resets. Press / to search the
              catalogue.
            </dd>
          </div>
          <div>
            <dt>Layers</dt>
            <dd>
              Drag the explosion slider in Exterior mode. Cutaway and Floors reassemble the model
              first. Connection guides label separated assemblies; choose Hide or Ghost for levels
              above your selected floor.
            </dd>
          </div>
        </dl>
        <button className="primary-button" onClick={() => setHelp(false)}>
          Back to exploring
          <ArrowRight size={16} />
        </button>
      </dialog>
    </main>
  );
}
