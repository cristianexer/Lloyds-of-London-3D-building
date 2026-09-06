import { useState } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  X,
  ArrowUpRight,
  Focus,
  EyeOff,
  Scan,
  Layers3,
  RotateCcw,
  Check,
  PanelLeftClose,
  Box,
} from 'lucide-react';
import { assemblies, assemblyById, systems } from '../model/catalogue';
import { parts, partById, partsByAssembly } from '../model/building';
import { sources } from '../data/sources';
import { useExplorer } from '../store';
import type { Assembly } from '../model/types';

export function Hierarchy() {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [limit, setLimit] = useState(60);
  const selected = useExplorer((s) => s.selected);
  const isOpen = useExplorer((s) => s.hierarchyOpen);
  const catalogue = useExplorer((s) => s.catalogueOnly);
  const toggle = (id: string) =>
    setExpanded((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const choose = (id: string) => {
    useExplorer.getState().select(id);
    if (window.innerWidth < 900 && !catalogue) useExplorer.getState().toggleHierarchy();
  };
  if (!isOpen && !catalogue) return null;
  const q = query.toLowerCase().trim();
  const found = q
    ? parts.filter((p) =>
        `${p.name} ${p.id} ${assemblyById.get(p.assembly)?.name}`.toLowerCase().includes(q),
      )
    : [];
  const foundAssemblies = q
    ? assemblies.filter((a) => `${a.name} ${a.system}`.toLowerCase().includes(q))
    : [];
  return (
    <aside
      className={`hierarchy ${catalogue ? 'catalogue-full' : ''}`}
      aria-label="Building hierarchy"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">BUILDING ANATOMY</span>
          <span className="count-label">{parts.length.toLocaleString('en-GB')} elements</span>
        </div>
        <button
          className="icon-button"
          aria-label="Close building hierarchy"
          onClick={() =>
            catalogue
              ? useExplorer.getState().setCatalogue(false)
              : useExplorer.getState().toggleHierarchy()
          }
        >
          <PanelLeftClose size={17} />
        </button>
      </div>
      <label className="search-field">
        <Search size={15} />
        <input
          aria-label="Search components"
          placeholder="Find a component…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(60);
          }}
        />
        <kbd>/</kbd>
      </label>
      <div className="tree-scroll">
        {catalogue && (
          <p className="catalogue-intro">
            Explore the building through its components. Select any entry for its purpose, geometry
            status and sources. All descriptions are available without 3D.
          </p>
        )}
        {q ? (
          <div className="search-results">
            <p className="small-label">{foundAssemblies.length + found.length} results</p>
            {foundAssemblies.map((a) => (
              <button
                key={a.id}
                className={`tree-child ${selected === a.id ? 'selected' : ''}`}
                onClick={() => choose(a.id)}
              >
                <Layers3 size={13} />
                {a.name}
              </button>
            ))}
            {found.slice(0, limit).map((p) => (
              <button
                key={p.id}
                className={`tree-child component ${selected === p.id ? 'selected' : ''}`}
                onClick={() => choose(p.id)}
              >
                <Box size={12} />
                <span>
                  {p.name}
                  <small>{p.id}</small>
                </span>
              </button>
            ))}
            {found.length > limit && (
              <button className="text-button" onClick={() => setLimit((n) => n + 60)}>
                Show 60 more
              </button>
            )}
            {!found.length && !foundAssemblies.length && (
              <p className="empty-state">No components found. Try “roof”, “lift” or “gallery”.</p>
            )}
          </div>
        ) : (
          systems.map((system, i) => {
            const open = expanded.includes(system.id);
            const list = assemblies.filter((a) => a.system === system.id);
            return (
              <div className="tree-system" key={system.id}>
                <div className="tree-row">
                  <button
                    className="tree-toggle"
                    aria-label={`${open ? 'Collapse' : 'Expand'} ${system.name}`}
                    aria-expanded={open}
                    onClick={() => toggle(system.id)}
                  >
                    {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                  <button
                    className={`tree-name ${selected === system.id ? 'selected' : ''}`}
                    onClick={() => choose(system.id)}
                  >
                    <span className="tree-number">{String(i + 1).padStart(2, '0')}</span>
                    {system.name}
                  </button>
                  <span className="tree-count">{list.length}</span>
                </div>
                {open && (
                  <div className="tree-assemblies">
                    {list.map((a) => {
                      const show = expanded.includes(a.id);
                      const children = partsByAssembly.get(a.id) || [];
                      return (
                        <div key={a.id}>
                          <div className="assembly-row">
                            <button
                              className="tree-toggle"
                              aria-label={`${show ? 'Collapse' : 'Expand'} ${a.name} components`}
                              aria-expanded={show}
                              onClick={() => toggle(a.id)}
                            >
                              {show ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            </button>
                            <button
                              className={`tree-child ${selected === a.id ? 'selected' : ''}`}
                              onClick={() => choose(a.id)}
                            >
                              {a.name}
                              <span>{children.length}</span>
                            </button>
                          </div>
                          {show && (
                            <div className="component-list">
                              {children.map((p) => (
                                <button
                                  key={p.id}
                                  className={`tree-child component ${selected === p.id ? 'selected' : ''}`}
                                  onClick={() => choose(p.id)}
                                >
                                  <span>
                                    {p.name}
                                    <small>{p.id}</small>
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="hierarchy-foot">
        <span className="accent-dot" />
        Reference-based reconstruction
        <button
          onClick={() => useExplorer.getState().setCatalogue(!catalogue)}
          className="icon-button"
          aria-label={catalogue ? 'Return to 3D' : 'Open text catalogue'}
        >
          <ArrowUpRight size={15} />
        </button>
      </div>
    </aside>
  );
}
export function InfoPanel() {
  const selected = useExplorer((s) => s.selected);
  const open = useExplorer((s) => s.infoOpen);
  const hidden = useExplorer((s) => s.hidden);
  const isolated = useExplorer((s) => s.isolated);
  if (!selected || !open) return null;
  const part = partById.get(selected);
  const system = systems.find((s) => s.id === selected);
  const assembly = assemblyById.get(part?.assembly || selected);
  const systemId = part?.system || assembly?.system || system!.id;
  const info: Assembly = assembly || {
    id: system!.id,
    name: system!.name,
    system: system!.id,
    description: system!.description,
    significance:
      'Select an assembly in the building hierarchy to explore its architectural role and source references.',
    accuracy: system!.id === 'room' || system!.id === 'heritage' ? 'Illustrative' : 'Approximate',
    sources: system!.id === 'heritage' ? ['lloyds'] : ['rshp'],
  };
  const name = part?.name || info.name;
  return (
    <aside className="info-panel" aria-label="Component information">
      <div className="panel-heading">
        <span className="eyebrow">IN FOCUS</span>
        <button
          className="icon-button"
          aria-label="Close component information"
          onClick={() => useExplorer.getState().closeInfo()}
        >
          <X size={18} />
        </button>
      </div>
      <div className="info-scroll">
        <div className="component-diagram" aria-hidden="true">
          <svg viewBox="0 0 200 105">
            <g fill="none" stroke="currentColor" strokeWidth=".8">
              <path d="M55 78 100 99 148 74V28L103 8 55 32Z M55 32l45 21 48-25M100 53v46M55 46l45 21 48-25M55 62l45 21 48-25M69 39v45M84 46v45M117 46v45M133 38v44" />
              <path strokeDasharray="2 3" d="M103 8v46M55 78l48-24 45 20" />
            </g>
          </svg>
          <span>{systems.find((s) => s.id === systemId)?.short}</span>
        </div>
        <span className="small-label">{systems.find((s) => s.id === systemId)?.name}</span>
        <h2>{name}</h2>
        <span className="accuracy-badge">
          <span />
          {info.accuracy} geometry
        </span>
        <p>{info.description}</p>
        <h3>Why it matters</h3>
        <p>{info.significance}</p>
        {part && (
          <dl className="component-facts">
            <div>
              <dt>Assembly</dt>
              <dd>{info.name}</dd>
            </div>
            <div>
              <dt>Model level</dt>
              <dd>
                {part.level === 0
                  ? 'Ground'
                  : part.level >= 12
                    ? 'Roof / plant'
                    : `Gallery ${part.level}`}
              </dd>
            </div>
            <div>
              <dt>Element ID</dt>
              <dd className="mono">{part.id}</dd>
            </div>
          </dl>
        )}
        <div className="info-actions">
          <button onClick={() => useExplorer.getState().camera('frame')}>
            <Focus size={15} />
            Frame
          </button>
          <button
            className={isolated === selected ? 'active' : ''}
            onClick={() => useExplorer.getState().isolate()}
          >
            <Scan size={15} />
            Isolate
          </button>
          <button onClick={() => useExplorer.getState().hide()}>
            <EyeOff size={15} />
            Hide
          </button>
          <button onClick={() => useExplorer.getState().related(systemId)}>
            <Layers3 size={15} />
            Related system
          </button>
        </div>
        {(hidden.length > 0 || isolated) && (
          <button
            className="text-button restore-action"
            onClick={() => useExplorer.getState().restore()}
          >
            <RotateCcw size={14} />
            Restore all components
          </button>
        )}
        <div className="source-links">
          <h3>
            <Check size={13} /> Source references
          </h3>
          {info.sources.map((id) => (
            <a key={id} href={sources[id].url} target="_blank" rel="noreferrer">
              {sources[id].title}
              <ArrowUpRight size={13} />
            </a>
          ))}
          <small>Consulted 6 September 2026</small>
        </div>
        <p className="accuracy-note">
          Original educational model. Geometry is not surveyed. Interior furniture and routes are
          illustrative.
        </p>
      </div>
    </aside>
  );
}
