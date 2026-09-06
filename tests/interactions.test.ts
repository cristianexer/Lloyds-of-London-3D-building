import { beforeEach, describe, expect, it } from 'vitest';
import { useExplorer, isVisible, matches } from '../src/store';
import { parts, generateBuilding } from '../src/model/building';
import { assemblies } from '../src/model/catalogue';
import { positionAt, stageProgress } from '../src/model/explosion';
const state = () => useExplorer.getState();
beforeEach(() => {
  state().reset();
  state().setReducedMotion(false);
});
describe('exclusive exploration modes', () => {
  it('reassembles on section/floor/market entry and ignores an incompatible explosion', () => {
    for (const mode of ['section', 'floors', 'market'] as const) {
      state().setMode('exterior');
      state().setExplosion(0.87);
      state().setMode(mode);
      state().setExplosion(0.5);
      expect(state().explosion).toBe(0);
      expect(state().mode).toBe(mode);
    }
  });
  it('clamps slider endpoints and rejects non-finite explosion input', () => {
    state().setExplosion(20);
    expect(state().explosion).toBe(1);
    state().setExplosion(-1);
    expect(state().explosion).toBe(0);
    state().setExplosion(NaN);
    expect(state().explosion).toBe(0);
  });
  it('hides only levels above the chosen gallery', () => {
    state().setMode('floors');
    state().setFloor(3);
    for (const p of parts) expect(isVisible(p, state())).toBe(p.level <= 3);
  });
  it('clears hiding and isolation when entering a new mode', () => {
    state().select('stairs');
    state().isolate();
    state().hide();
    state().setMode('section');
    expect(state().isolated).toBeNull();
    expect(state().hidden).toEqual([]);
  });
});
describe('selection and restoration', () => {
  it('isolates one stable instance without affecting its neighbours', () => {
    const p = parts[5];
    state().select(p.id);
    state().isolate();
    expect(parts.filter((p) => isVisible(p, state()))).toEqual([p]);
  });
  it('isolates a complete assembly and a related system', () => {
    state().select('vault');
    state().isolate();
    expect(parts.filter((p) => isVisible(p, state())).every((p) => p.assembly === 'vault')).toBe(
      true,
    );
    state().related('roof');
    expect(parts.filter((p) => isVisible(p, state())).every((p) => p.system === 'roof')).toBe(true);
  });
  it('hides selected components and restores them together', () => {
    state().select('stairs');
    state().hide();
    expect(parts.filter((p) => p.assembly === 'stairs').every((p) => !isVisible(p, state()))).toBe(
      true,
    );
    state().restore();
    expect(parts.every((p) => isVisible(p, state()))).toBe(true);
  });
  it('reset restores every view-affecting field and requests a new camera transition', () => {
    const before = state().viewNonce;
    state().select('vault');
    state().isolate();
    state().hide();
    state().setExplosion(0.7);
    state().setFacade(0.1);
    state().setRotate(true);
    state().reset();
    expect(state()).toMatchObject({
      mode: 'exterior',
      explosion: 0,
      facade: 0.62,
      selected: null,
      isolated: null,
      hidden: [],
      autoRotate: false,
      view: 'hero',
      tour: null,
    });
    expect(state().viewNonce).toBeGreaterThan(before);
  });
  it('reduced motion prevents auto-rotation', () => {
    state().setRotate(true);
    state().setReducedMotion(true);
    expect(state().autoRotate).toBe(false);
    state().setRotate(true);
    expect(state().autoRotate).toBe(false);
  });
  it('tour finishes assembled and clears prior isolation', () => {
    state().select('vault');
    state().isolate();
    for (let i = 0; i < 6; i++) state().tourStep(i);
    expect(state()).toMatchObject({
      mode: 'exterior',
      explosion: 0,
      isolated: null,
      view: 'hero',
      tour: 5,
    });
    state().tourStep(null);
    expect(state().tour).toBeNull();
  });
});
describe('authored explosion invariants', () => {
  it('moves the roof before the facade, towers or floor plates', () => {
    expect(stageProgress('roof', 0.1)).toBeGreaterThan(0);
    for (const stage of ['facade', 'tower', 'floor'] as const)
      expect(stageProgress(stage, 0.1)).toBe(0);
  });
  it('repeated arbitrary scrubbing returns every part to its exact original transform', () => {
    const saved = parts.map((p) => [...p.position]);
    for (let pass = 0; pass < 20; pass++)
      for (const x of [0, 0.73, 0.1, 1, 0.55, 0]) for (const p of parts) positionAt(p, x);
    parts.forEach((p, i) => {
      expect(positionAt(p, 0)).toEqual(saved[i]);
      expect(p.position).toEqual(saved[i]);
      expect(positionAt(p, 1)).toEqual(p.position.map((v, j) => v + p.offset[j]));
    });
  });
  it('preserves part orientation and dimension during separation', () => {
    const p = parts.find((p) => p.assembly === 'escalators')!;
    const saved = JSON.stringify(p);
    positionAt(p, 1);
    expect(JSON.stringify(p)).toBe(saved);
  });
});
describe('reproducible component catalogue', () => {
  it('has unique persistent identifiers with a real system/assembly parent', () => {
    expect(parts.length).toBeGreaterThan(300);
    expect(new Set(parts.map((p) => p.id)).size).toBe(parts.length);
    for (const p of parts) {
      expect(assemblies.find((a) => a.id === p.assembly)?.system).toBe(p.system);
      expect(matches(p, p.id)).toBe(true);
    }
  });
  it('reproduces identical geometry without randomness', () => {
    expect(generateBuilding()).toEqual(parts);
  });
  it('keeps the central atrium clear of upper gallery floor plates', () => {
    for (const p of parts.filter((p) => p.name.includes('plate') && p.level > 0)) {
      expect(Math.abs(p.position[0]) - p.scale[0] / 2).toBeGreaterThanOrEqual(8);
    }
  });
  it('describes every assembly and identifies illustrative geometry', () => {
    for (const a of assemblies) {
      expect(a.sources.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(10);
    }
    expect(assemblies.find((a) => a.id === 'boxes')?.accuracy).toBe('Illustrative');
  });
});
