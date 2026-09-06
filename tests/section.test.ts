import { describe, it, expect } from 'vitest';
import { buildSectionCaps, prepareSections } from '../src/model/section';
import type { Part } from '../src/model/types';
const box: Part = {
  id: 'test/1',
  name: 'test',
  assembly: 'columns',
  system: 'structure',
  shape: 'box',
  material: 'concrete',
  position: [0, 0, 0],
  scale: [4, 6, 8],
  rotation: [0, 0, 0],
  offset: [0, 0, 0],
  stage: 'fixed',
  level: 0,
};
function area(g: ReturnType<typeof buildSectionCaps>['geometry']) {
  const p = g.getAttribute('position');
  let area = 0;
  for (let i = 0; i < p.count; i += 3)
    area +=
      Math.abs(
        (p.getY(i + 1) - p.getY(i)) * (p.getZ(i + 2) - p.getZ(i)) -
          (p.getZ(i + 1) - p.getZ(i)) * (p.getY(i + 2) - p.getY(i)),
      ) / 2;
  return area;
}
describe('solid section faces', () => {
  it('fills the exact cross-section, with outward normals and selectable triangle IDs', () => {
    const cap = buildSectionCaps(prepareSections([box]), 0);
    expect(area(cap.geometry)).toBeCloseTo(48);
    expect(cap.ids).toEqual(['test/1', 'test/1']);
    expect(cap.geometry.getAttribute('normal').getX(0)).toBeCloseTo(1);
    cap.geometry.dispose();
  });
  it('handles transformed solids and excludes tangency, removed and hidden geometry', () => {
    const p = {
      ...box,
      position: [7, 2, 3] as [number, number, number],
      rotation: [0, 0, Math.PI / 2] as [number, number, number],
    };
    const prepared = prepareSections([p]);
    const cap = buildSectionCaps(prepared, 7);
    expect(area(cap.geometry)).toBeCloseTo(32);
    for (const x of [4, 10, 20]) {
      const c = buildSectionCaps(prepared, x);
      expect(c.ids).toEqual([]);
      c.geometry.dispose();
    }
    const hidden = buildSectionCaps(prepared, 7, () => false);
    expect(hidden.ids).toEqual([]);
    cap.geometry.dispose();
    hidden.geometry.dispose();
  });
  it('does not turn glass or hollow casings into solid blocks', () => {
    expect(
      prepareSections([
        { ...box, material: 'glass' },
        { ...box, shape: 'shell' },
        { ...box, shape: 'stair-shell' },
      ]),
    ).toEqual([]);
  });
  it('caps the actual faceted cylinder outline rather than its bounding rectangle', () => {
    const cap = buildSectionCaps(
      prepareSections([
        { ...box, shape: 'cylinder', scale: [2, 6, 2], rotation: [0, 0, Math.PI / 2] },
      ]),
      0,
    );
    expect(area(cap.geometry)).toBeCloseTo(12);
    cap.geometry.dispose();
  });
});
