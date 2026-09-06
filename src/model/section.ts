import { BufferGeometry, Float32BufferAttribute, Matrix4, Euler, Quaternion, Vector3 } from 'three';
import { makeGeometry } from './geometry';
import type { Part, GeometryKind } from './types';

// Only closed, convex solids are capped. Glazing and hollow/open casings retain
// their real model thickness rather than receiving an invented solid infill.
const closed = new Set<GeometryKind>(['box', 'cylinder', 'sphere']);
type Point = [number, number];
const cross = (o: Point, a: Point, b: Point) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function hull(points: Point[]) {
  const unique = new Map(points.map((p) => [`${p[0].toFixed(6)},${p[1].toFixed(6)}`, p]));
  const sorted = [...unique.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return [];
  const lower: Point[] = [],
    upper: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, p) <= 1e-9) lower.pop();
    lower.push(p);
  }
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, p) <= 1e-9) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
type Prepared = {
  part: Part;
  vertices: Vector3[];
  edges: [number, number][];
  min: number;
  max: number;
};
export function prepareSections(parts: Part[]): Prepared[] {
  const shapes = new Map<GeometryKind, { vertices: Vector3[]; edges: [number, number][] }>();
  return parts
    .filter((p) => closed.has(p.shape) && p.material !== 'glass')
    .map((part) => {
      let shape = shapes.get(part.shape);
      if (!shape) {
        const g = makeGeometry(part.shape),
          pos = g.getAttribute('position'),
          index = g.index;
        const vertices = Array.from({ length: pos.count }, (_, i) =>
          new Vector3().fromBufferAttribute(pos, i),
        );
        const edges: [number, number][] = [];
        const count = index?.count ?? pos.count;
        for (let i = 0; i < count; i += 3) {
          const t = [0, 1, 2].map((j) => (index ? index.getX(i + j) : i + j));
          edges.push([t[0], t[1]], [t[1], t[2]], [t[2], t[0]]);
        }
        shape = { vertices, edges };
        shapes.set(part.shape, shape);
        g.dispose();
      }
      const matrix = new Matrix4().compose(
        new Vector3(...part.position),
        new Quaternion().setFromEuler(new Euler(...part.rotation)),
        new Vector3(...part.scale),
      );
      const vertices = shape.vertices.map((v) => v.clone().applyMatrix4(matrix));
      return {
        part,
        vertices,
        edges: shape.edges,
        min: Math.min(...vertices.map((v) => v.x)),
        max: Math.max(...vertices.map((v) => v.x)),
      };
    });
}
export function buildSectionCaps(
  prepared: Prepared[],
  x: number,
  visible: (p: Part) => boolean = () => true,
) {
  const positions: number[] = [],
    ids: string[] = [];
  for (const solid of prepared) {
    if (solid.min >= x - 1e-6 || solid.max <= x + 1e-6 || !visible(solid.part)) continue;
    const points: Point[] = [];
    for (const [i, j] of solid.edges) {
      const a = solid.vertices[i],
        b = solid.vertices[j];
      if ((a.x - x) * (b.x - x) > 0 || Math.abs(b.x - a.x) < 1e-10) continue;
      const t = (x - a.x) / (b.x - a.x);
      points.push([a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t]);
    }
    const polygon = hull(points);
    for (let i = 1; i < polygon.length - 1; i++) {
      for (const p of [polygon[0], polygon[i], polygon[i + 1]])
        positions.push(x + 0.003, p[0], p[1]);
      ids.push(solid.part.id);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return { geometry, ids };
}
