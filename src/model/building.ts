import { Euler, Quaternion, Vector3 } from 'three';
import type { GeometryKind, MaterialKind, Part, Stage, SystemId, Vec3 } from './types';

// Original, reference-based geometry. Coordinates are model units, not a survey.
// +X faces the Lime Street side; +Z faces the Leadenhall Place end, approximately.
export function generateBuilding(): Part[] {
  const parts: Part[] = [];
  const counters = new Map<string, number>();
  type Context = { system: SystemId; assembly: string; stage: Stage; offset: Vec3; level: number };
  let c: Context = {
    system: 'structure',
    assembly: 'columns',
    stage: 'fixed',
    offset: [0, 0, 0],
    level: 0,
  };
  function context(
    system: SystemId,
    assembly: string,
    stage: Stage = 'fixed',
    offset: Vec3 = [0, 0, 0],
    level = 0,
  ) {
    c = { system, assembly, stage, offset, level };
  }
  function add(
    name: string,
    shape: GeometryKind,
    material: MaterialKind,
    position: Vec3,
    scale: Vec3,
    rotation: Vec3 = [0, 0, 0],
    colour?: string,
  ) {
    const n = (counters.get(c.assembly) || 0) + 1;
    counters.set(c.assembly, n);
    parts.push({
      ...c,
      id: `${c.assembly}/${String(n).padStart(4, '0')}`,
      name,
      shape,
      material,
      position,
      scale,
      rotation,
      colour,
    });
  }
  function box(name: string, mat: MaterialKind, p: Vec3, s: Vec3, rot: Vec3 = [0, 0, 0]) {
    add(name, 'box', mat, p, s, rot);
  }
  function cyl(name: string, mat: MaterialKind, p: Vec3, r: number, h: number) {
    add(name, 'cylinder', mat, p, [r, h, r]);
  }
  function beam(name: string, mat: MaterialKind, a: Vec3, b: Vec3, r = 0.12) {
    const from = new Vector3(...a),
      to = new Vector3(...b),
      d = to.clone().sub(from);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.clone().normalize());
    const e = new Euler().setFromQuaternion(q);
    add(
      name,
      'cylinder',
      mat,
      from.add(to).multiplyScalar(0.5).toArray() as Vec3,
      [r, d.length(), r],
      [e.x, e.y, e.z],
    );
  }
  const pitch = 4.8;
  // Ring-shaped galleries: a genuine open atrium, with southern upper terraces.
  for (let f = 0; f < 12; f++) {
    const y = 2 + f * pitch;
    const end = f >= 10 ? 9 : f >= 8 ? 19 : 27;
    context('structure', `floor-${f}`, 'floor', [0, f * 5.4, 0], f);
    if (f === 0) box('Underwriting Room base slab', 'concrete', [0, y, -1], [40, 0.65, 56]);
    else {
      for (const side of [-1, 1])
        box(
          `Gallery ${f} ${side === 1 ? 'east' : 'west'} plate`,
          'concrete',
          [side * 14, y, (end - 27) / 2],
          [12, 0.5, end + 27],
        );
      box(`Gallery ${f} north return`, 'concrete', [0, y, -23], [16, 0.5, 8]);
      if (f < 8) box(`Gallery ${f} south return`, 'concrete', [0, y, 23], [16, 0.5, 8]);
    }
    for (const side of [-1, 1]) {
      for (let z = -23; z <= end - 2; z += 7) {
        box('Radial gallery beam', 'concrete', [side * 14, y - 0.55, z], [12, 0.8, 0.65]);
        // Dark coffer grid and softly lit circular luminaires at the lower levels.
        if (f > 0 && f < 5) {
          context('room', 'room-lights', 'floor', [0, f * 5.4, 0], f);
          for (const x of [side * 10.3, side * 14, side * 17.8]) {
            box('Ceiling coffer', 'dark', [x, y - 0.32, z + 2], [3.1, 0.09, 3.1]);
            cyl('Circular ceiling luminaire', 'warm', [x, y - 0.39, z + 2], 0.31, 0.09);
          }
          context('structure', `floor-${f}`, 'floor', [0, f * 5.4, 0], f);
        }
      }
      // Balustrades face into the atrium, independently selectable.
      for (let z = -18; z <= Math.min(end, 19); z += 3.8) {
        context('structure', `floor-${f}`, 'floor', [0, f * 5.4, 0], f);
        box('Atrium gallery balustrade', 'glass', [side * 8.12, y + 0.85, z], [0.12, 1.3, 3.65]);
        beam(
          'Gallery handrail',
          'steel',
          [side * 8.12, y + 1.55, z - 1.87],
          [side * 8.12, y + 1.55, z + 1.87],
          0.07,
        );
        beam(
          'Balustrade post',
          'steel',
          [side * 8.12, y + 0.3, z - 1.87],
          [side * 8.12, y + 1.55, z - 1.87],
          0.05,
        );
      }
    }
    // Columns have expressed capitals and collars at each level.
    context('structure', 'columns', 'structure', [0, f * 5.4, 0], f);
    for (const x of [-20, -8, 8, 20])
      for (const z of [-25, -12.5, 0, 12.5, 25]) {
        if (z > end) continue;
        cyl('Concrete column segment', 'concrete', [x, y + pitch / 2, z], 0.52, pitch);
        cyl('Column joint collar', 'concrete', [x, y + pitch - 0.32, z], 0.68, 0.65);
        box('Expressed beam capital', 'concrete', [x, y + pitch - 0.4, z], [1.65, 0.7, 1.65]);
      }
    // Curtain walls: glass is inset behind mullions, rails, pipes and columns.
    for (const side of [-1, 1]) {
      for (let z = -24.5; z < end; z += 4.3) {
        context('facade', 'curtain-wall', 'facade', [side * 29, f * 1.0, 0], f);
        box(`Glazed bay · level ${f}`, 'glass', [side * 19.85, y + 2.6, z], [0.13, 3.85, 4.05]);
        context('facade', 'mullions', 'facade', [side * 29, f * 1.0, 0], f);
        for (const dz of [-2.1, 0, 2.1])
          box(
            'Vertical façade mullion',
            'steel',
            [side * 20.05, y + 2.65, z + dz],
            [0.16, 4.35, 0.1],
          );
        box('Horizontal transom', 'steel', [side * 20.13, y + 2.85, z], [0.2, 0.12, 4.3]);
        box('Spandrel cassette', 'steel', [side * 20.15, y + 0.65, z], [0.35, 0.72, 4.3]);
        box('Maintenance walkway', 'dark', [side * 20.65, y + 0.25, z], [1.1, 0.14, 4.3]);
        beam(
          'Outside guardrail',
          'steel',
          [side * 21.2, y + 1.05, z - 2.15],
          [side * 21.2, y + 1.05, z + 2.15],
          0.055,
        );
        beam(
          'Façade service pipe',
          'steel',
          [side * 21.25, y - 0.2, z - 2.15],
          [side * 21.25, y - 0.2, z + 2.15],
          0.16,
        );
        beam(
          'Façade return pipe',
          'steel',
          [side * 21.46, y + 0.06, z - 2.15],
          [side * 21.46, y + 0.06, z + 2.15],
          0.085,
        );
        beam(
          'Lower façade conduit',
          'dark',
          [side * 21.2, y - 0.44, z - 2.15],
          [side * 21.2, y - 0.44, z + 2.15],
          0.055,
        );
        for (const dz of [-1.95, 1.95]) {
          beam(
            'Walkway support strut',
            'steel',
            [side * 20, y - 0.6, z + dz],
            [side * 21.2, y + 0.22, z + dz],
            0.07,
          );
          beam(
            'Façade external suspension rod',
            'steel',
            [side * 21.1, y + 0.2, z + dz],
            [side * 21.1, y + 4.5, z + dz],
            0.035,
          );
          box('Façade fixing shoe', 'steel', [side * 20.4, y + 0.75, z + dz], [0.65, 0.35, 0.35]);
        }
      }
    }
    if (f >= 8)
      for (const x of [-18, -14, -10, 10, 14, 18]) {
        context('facade', 'curtain-wall', 'facade', [0, f * 1.0, 29], f);
        box('Stepped terrace glazed bay', 'glass', [x, y + 2.6, end], [3.8, 3.9, 0.14]);
        context('facade', 'mullions', 'facade', [0, f * 1.0, 29], f);
        box(
          'Stepped terrace edge mullion',
          'steel',
          [x - 1.9, y + 2.5, end + 0.1],
          [0.12, 4.7, 0.14],
        );
        box('Stepped terrace spandrel', 'steel', [x, y + 0.6, end + 0.1], [4, 0.6, 0.25]);
      }
    for (const endSide of [-1, 1]) {
      if (endSide === 1 && f >= 8) continue;
      const z = endSide * 27;
      for (const x of [-17, -13, -9, -5, -1, 3, 7, 11, 15, 19]) {
        context('facade', 'curtain-wall', 'facade', [0, f * 1.0, endSide * 29], f);
        box('End elevation glazed bay', 'glass', [x, y + 2.7, z], [3.8, 3.85, 0.14]);
        context('facade', 'mullions', 'facade', [0, f * 1.0, endSide * 29], f);
        box('End façade mullion', 'steel', [x - 1.9, y + 2.5, z + 0.15], [0.13, 4.7, 0.15]);
        box('End façade spandrel', 'steel', [x, y + 0.6, z + 0.15], [4, 0.6, 0.3]);
        beam(
          'End service pipe',
          'steel',
          [x - 2, y - 0.15, z + 0.8],
          [x + 2, y - 0.15, z + 0.8],
          0.17,
        );
      }
    }
  }
  // Steel-tube diagonal braces, represented without a structural engineering claim.
  context('structure', 'bracing', 'structure', [0, 0, 0], 0);
  for (const x of [-20.7, 20.7])
    for (const z of [-20, 18])
      for (let f = 0; f < 3; f++) {
        const y = 2 + f * 9.6;
        context('structure', 'bracing', 'structure', [Math.sign(x) * 3, f * 1.6, 0], f * 2);
        beam('Diagonal cross-brace', 'concrete', [x, y, z - 4], [x, y + 9.6, z + 4], 0.23);
        beam('Diagonal cross-brace', 'concrete', [x, y, z + 4], [x, y + 9.6, z - 4], 0.23);
      }
  const towers = [
    { x: -25, z: -21, h: 73, plant: true },
    { x: 25, z: -19, h: 79, plant: true },
    { x: -25, z: 16, h: 57, plant: true },
    { x: 25, z: 20, h: 64, plant: true },
    { x: -13, z: 32, h: 43, plant: false },
    { x: 13, z: 32, h: 48, plant: false },
  ];
  towers.forEach((t, i) => {
    const outward: Vec3 = [Math.sign(t.x) * 38, 0, t.z > 28 ? 39 : Math.sign(t.z) * 22];
    const floors = Math.floor((t.h - (t.plant ? 13 : 2)) / pitch);
    const sign = Math.sign(t.x);
    for (let f = 0; f <= floors; f++) {
      const y = 2 + f * pitch;
      context('services', `tower-${i}`, 'tower', outward, f);
      box(`Tower ${i + 1} inner service spine`, 'dark', [t.x, y + 2.4, t.z - 1.9], [3.9, 4.8, 1.6]);
      for (const dx of [-2.35, 2.35]) {
        box('Vertical core edge', 'concrete', [t.x + dx, y + 2.4, t.z], [0.35, 4.8, 6]);
        for (const dz of [-2.8, 2.8])
          box('Tower spine', 'steel', [t.x + dx, y + 2.4, t.z + dz], [0.2, 4.8, 0.2]);
      }
      box('Service tower floor joint', 'steel', [t.x, y, t.z], [5, 0.24, 6.15]);
      context(
        'services',
        'service-pods',
        'tower',
        [outward[0] + sign * 5, f * 1.3, outward[2] - 10],
        f,
      );
      box('Prefabricated service pod enclosure', 'dark', [t.x, y + 2.1, t.z], [4.3, 3.55, 5.8]);
      // Rectangular prefabricated service pods sit beside the curved stair enclosures.
      for (const face of [-1, 1]) {
        box(
          'Stainless-steel service pod face',
          'steel',
          [t.x, y + 2.1, t.z + face * 2.99],
          [4.32, 3.55, 0.15],
        );
        for (const dx of [-0.75, 0.75])
          box(
            'Service pod cladding joint',
            'dark',
            [t.x + dx, y + 2.1, t.z + face * 3.08],
            [0.035, 3.5, 0.035],
          );
        add(
          'Circular service pod window surround',
          'cylinder',
          'steel',
          [t.x, y + 2.15, t.z + face * 3.1],
          [0.41, 0.12, 0.41],
          [Math.PI / 2, 0, 0],
        );
        add(
          'Circular service pod window',
          'cylinder',
          'dark',
          [t.x, y + 2.15, t.z + face * 3.18],
          [0.32, 0.07, 0.32],
          [Math.PI / 2, 0, 0],
        );
      }

      const sx = t.x + sign * 3.5;
      context(
        'circulation',
        'stairs',
        'tower',
        [outward[0] + sign * 13, f * 1.25, outward[2] + 8],
        f,
      );
      cyl('Dark inner stair shaft', 'dark', [sx, y + 2, t.z], 2.5, 4.25);
      add(
        `Curved stainless stair enclosure · tower ${i + 1}`,
        'stair-shell',
        'steel',
        [sx, y + 1.82, t.z],
        [2.65, 3.35, 2.65],
        [0, sign > 0 ? 0 : Math.PI, 0],
      );
      add(
        'Stair enclosure bottom rim',
        'stair-shell',
        'steel',
        [sx, y + 0.16, t.z],
        [2.7, 0.13, 2.7],
        [0, sign > 0 ? 0 : Math.PI, 0],
      );
      add(
        'Stair enclosure top rim',
        'stair-shell',
        'steel',
        [sx, y + 3.5, t.z],
        [2.7, 0.13, 2.7],
        [0, sign > 0 ? 0 : Math.PI, 0],
      );
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        box(
          'Representative radial stair tread',
          'concrete',
          [sx + Math.sin(a) * 1.5, y + 0.3 + k * 0.5, t.z + Math.cos(a) * 1.5],
          [1.7, 0.12, 0.65],
          [0, a, 0],
        );
      }
      // Folded cladding seams, soffit brackets and open service landings.
      context(
        'circulation',
        'stairs',
        'tower',
        [outward[0] + sign * 13, f * 1.25, outward[2] + 8],
        f,
      );
      for (let j = 0; j <= 8; j++) {
        const a = -Math.PI / 2 + (j * Math.PI) / 8;
        const px = sx + sign * Math.cos(a) * 2.674,
          pz = t.z + Math.sin(a) * 2.674;
        beam('Vertical stair cladding seam', 'dark', [px, y + 0.25, pz], [px, y + 3.42, pz], 0.014);
      }
      box(
        'Cantilever stair landing soffit',
        'concrete',
        [sx - sign * 1.1, y + 0.03, t.z],
        [3.8, 0.24, 4.6],
      );
      beam(
        'Stair landing cantilever bracket',
        'concrete',
        [t.x, y - 1, t.z],
        [sx + sign * 1.5, y - 0.03, t.z],
        0.2,
      );
      for (const dz of [-2.4, 2.4]) {
        beam(
          'Open landing balustrade',
          'steel',
          [sx - sign * 2.4, y + 4.1, t.z + dz],
          [sx + sign * 0.1, y + 4.1, t.z + dz],
          0.047,
        );
        for (let j = 0; j < 4; j++)
          beam(
            'Landing railing post',
            'steel',
            [sx - sign * (0.2 + j * 0.7), y + 3.6, t.z + dz],
            [sx - sign * (0.2 + j * 0.7), y + 4.12, t.z + dz],
            0.035,
          );
      }
      // Open steel service spine and ladder: visible through gaps between pods.
      context('services', `tower-${i}`, 'tower', [outward[0], f * 0.7, outward[2]], f);
      for (const dx of [-2.5, 2.5]) {
        beam(
          'Service frame vertical post',
          'dark',
          [t.x + dx, y, t.z + 3.5],
          [t.x + dx, y + pitch, t.z + 3.5],
          0.105,
        );
        beam(
          'Service spine diagonal',
          'steel',
          [t.x + dx, y + 0.2, t.z + 3.5],
          [t.x - dx, y + pitch - 0.2, t.z + 3.5],
          0.06,
        );
      }
      beam(
        'Service frame cross-member',
        'steel',
        [t.x - 2.65, y + 3.9, t.z + 3.5],
        [t.x + 2.65, y + 3.9, t.z + 3.5],
        0.1,
      );
      for (const dx of [-0.31, 0.31])
        beam(
          'Maintenance ladder side rail',
          'steel',
          [t.x - sign * 2.8 + dx, y, t.z + 3.6],
          [t.x - sign * 2.8 + dx, y + pitch, t.z + 3.6],
          0.04,
        );
      for (let j = 0; j < 12; j++)
        beam(
          'Maintenance ladder rung',
          'steel',
          [t.x - sign * 2.8 - 0.32, y + j * 0.4, t.z + 3.6],
          [t.x - sign * 2.8 + 0.32, y + j * 0.4, t.z + 3.6],
          0.03,
        );
      // Ribbed vertical pipes at the other side of the tower.
      context(
        'services',
        'pipework',
        'tower',
        [outward[0] - sign * 8, f * 0.7, outward[2] + 13],
        f,
      );
      for (let k = 0; k < 3; k++) {
        const px = t.x - sign * (2.85 + k * 0.67);
        cyl(
          'Exposed vertical riser',
          'steel',
          [px, y + 2.4, t.z + 2.85],
          k === 0 ? 0.38 : 0.23,
          pitch,
        );
        cyl('Riser connection band', 'steel', [px, y + 1, t.z + 2.85], k === 0 ? 0.45 : 0.29, 0.2);
      }
      // Prominent full-height ductwork with frequent joint collars, elbows and supports.
      for (let k = 0; k < 2; k++) {
        const px = t.x - sign * (1.7 + k * 0.86),
          pz = t.z + 4.25;
        cyl(
          'Large external ventilation riser',
          'steel',
          [px, y + 2.4, pz],
          k === 0 ? 0.47 : 0.28,
          pitch,
        );
        for (let j = 0; j < 4; j++)
          cyl(
            'Segmented duct coupling',
            'steel',
            [px, y + 0.2 + j * 1.2, pz],
            k === 0 ? 0.505 : 0.32,
            0.07,
          );
        beam('Riser anchoring bracket', 'dark', [px, y + 1.4, pz], [px, y + 1.4, t.z + 2.5], 0.08);
        if (f === 1) {
          const points: Vec3[] = [
            [px, y + 0.3, pz],
            [px, y - 0.9, pz + 0.1],
            [px + sign * 0.5, y - 1.5, pz + 0.4],
            [px + sign * 2.5, y - 1.5, pz + 0.4],
            [px + sign * 3, y - 1.1, pz + 0.4],
          ];
          for (let j = 0; j < points.length - 1; j++) {
            beam(
              'Low-level service duct bend',
              'steel',
              points[j],
              points[j + 1],
              k === 0 ? 0.46 : 0.27,
            );
            add('Rounded duct elbow', 'sphere', 'steel', points[j], [
              k === 0 ? 0.46 : 0.27,
              k === 0 ? 0.46 : 0.27,
              k === 0 ? 0.46 : 0.27,
            ]);
          }
        }
      }
      if (i < 3) {
        // Four lift tracks per principal tower, twelve in total.
        context(
          'circulation',
          'lifts',
          'tower',
          [outward[0] - sign * 10, f * 0.7, outward[2] - 7],
          f,
        );
        for (let k = 0; k < 4; k++) {
          const lz = t.z - 2.1 + k * 1.4;
          box(
            'External glass lift shaft',
            'glass',
            [t.x - sign * 2.62, y + 2.3, lz],
            [0.28, 4.65, 1.15],
          );
          beam(
            'Lift guide rail',
            'steel',
            [t.x - sign * 2.94, y, lz - 0.54],
            [t.x - sign * 2.94, y + pitch, lz - 0.54],
            0.055,
          );
          if (f === (k * 3 + i) % Math.max(floors, 1)) {
            box(
              'Representative glass lift car',
              'glass',
              [t.x - sign * 3.25, y + 1.5, lz],
              [1.05, 2.4, 1.2],
            );
            box('Lift car floor', 'steel', [t.x - sign * 3.25, y + 0.32, lz], [1.15, 0.16, 1.3]);
            box('Lift car canopy', 'steel', [t.x - sign * 3.25, y + 2.76, lz], [1.15, 0.13, 1.3]);
          }
        }
      }
      context('services', `tower-${i}`, 'tower', outward, f);
      box('Tower connection bridge', 'steel', [t.x - sign * 3.6, y + 0.2, t.z], [4, 0.27, 1.5]);
    }
    const top = 2 + (floors + 1) * pitch;
    if (t.plant) {
      context('services', 'plant', 'tower', [outward[0], 23, outward[2]], 13);
      box('Rooftop plant room volume', 'dark', [t.x, top + 5.5, t.z], [8, 11, 8.4]);
      for (const side of [-1, 1]) {
        for (let k = 0; k < 27; k++) {
          box(
            'Plant room folded metal cladding',
            'steel',
            [t.x + side * 4.05, top + 5.5, t.z - 4 + k * 0.31],
            [0.16, 10.9, 0.09],
          );
          box(
            'Plant room folded metal cladding',
            'steel',
            [t.x - 3.95 + k * 0.3, top + 5.5, t.z + side * 4.22],
            [0.09, 10.9, 0.16],
          );
        }
        for (const y of [top, top + 3.66, top + 7.33, top + 11]) {
          box('Plant room horizontal band', 'steel', [t.x + side * 4.14, y, t.z], [0.2, 0.2, 8.6]);
          box('Plant room horizontal band', 'steel', [t.x, y, t.z + side * 4.31], [8.3, 0.2, 0.2]);
        }
      }
      box('Plant room roof cap', 'steel', [t.x, top + 11.2, t.z], [8.5, 0.28, 8.9]);
      context('services', 'pipework', 'tower', [outward[0] - sign * 8, 23, outward[2] + 13], 13);
      // Smooth bent ducts built from short, connected cylinders.
      const pts: Vec3[] = [
        [t.x - sign * 4, top + 9, t.z + 4.8],
        [t.x - sign * 4.8, top + 8.4, t.z + 4.8],
        [t.x - sign * 5.2, top + 6.4, t.z + 4.8],
        [t.x - sign * 4.9, top + 4, t.z + 4.8],
        [t.x - sign * 3, top + 2, t.z + 4.8],
        [t.x - sign * 2.6, top - 1, t.z + 4.8],
      ];
      for (let k = 0; k < pts.length - 1; k++) {
        beam('Curved rooftop ventilation duct', 'steel', pts[k], pts[k + 1], 0.68);
        add('Duct elbow', 'sphere', 'steel', pts[k], [0.68, 0.68, 0.68]);
      }
    }
    context('roof', 'cranes', 'roof', [outward[0], 35, outward[2]], 13);
    const cy = top + (t.plant ? 11.6 : 1);
    cyl('Crane slewing base', 'blue', [t.x, cy, t.z], 1.4, 0.5);
    beam('Crane mast', 'blue', [t.x, cy, t.z], [t.x, cy + 3.8, t.z], 0.23);
    beam('Crane jib upper chord', 'blue', [t.x - 3.5, cy + 4, t.z], [t.x + 6, cy + 4, t.z], 0.12);
    beam(
      'Crane jib lower chord',
      'blue',
      [t.x - 3.5, cy + 3.3, t.z],
      [t.x + 6, cy + 3.3, t.z],
      0.12,
    );
    for (let k = 0; k < 9; k++)
      beam(
        'Crane lattice diagonal',
        'blue',
        [t.x - 3.5 + k, cy + 3.3, t.z],
        [t.x - 2.5 + k, cy + 4, t.z],
        0.065,
      );
    beam('Crane jib stay', 'steel', [t.x, cy + 5, t.z], [t.x + 5.8, cy + 3.6, t.z], 0.05);
    beam(
      'Crane hoist cable',
      'dark',
      [t.x + 5.8, cy + 3.5, t.z],
      [t.x + 5.8, cy - 0.4, t.z],
      0.035,
    );
    box('Crane counterweight', 'dark', [t.x - 2.9, cy + 3.2, t.z], [1.7, 1.2, 1.25]);
  });
  // Barrel vault: discrete glazed facets and a triangulated steel lattice.
  const roofY = 60.4,
    radius = 8.3;
  context('roof', 'vault', 'roof', [0, 68, 0], 12);
  for (let zi = 0; zi <= 16; zi++) {
    const z = -20 + zi * 2.5;
    context('roof', 'vault', 'roof', [0, 68, (Math.floor(Math.min(zi, 15) / 4) - 1.5) * 11], 12);
    for (let a = 0; a < 20; a++) {
      const t0 = (a * Math.PI) / 20,
        t1 = ((a + 1) * Math.PI) / 20;
      beam(
        'Vault transverse steel rib',
        'steel',
        [Math.cos(t0) * radius, roofY + Math.sin(t0) * radius, z],
        [Math.cos(t1) * radius, roofY + Math.sin(t1) * radius, z],
        zi % 4 === 0 ? 0.14 : 0.075,
      );
      if (zi < 16) {
        const tm = (t0 + t1) / 2;
        box(
          'Vault glass pane',
          'glass',
          [Math.cos(tm) * radius, roofY + Math.sin(tm) * radius, z + 1.25],
          [2 * radius * Math.sin(Math.PI / 40), 0.055, 2.4],
          [0, 0, tm + Math.PI / 2],
        );
        if (a % 2 === 0)
          beam(
            'Vault diagonal lattice',
            'steel',
            [Math.cos(t0) * radius, roofY + Math.sin(t0) * radius, z],
            [Math.cos(t1) * radius, roofY + Math.sin(t1) * radius, z + 2.5],
            0.038,
          );
      }
    }
  }
  for (let section = 0; section < 4; section++)
    for (let a = 0; a <= 10; a++) {
      const t = (a * Math.PI) / 10;
      context('roof', 'vault', 'roof', [0, 68, (section - 1.5) * 11], 12);
      beam(
        'Vault longitudinal purlin',
        'steel',
        [Math.cos(t) * radius, roofY + Math.sin(t) * radius, -20 + section * 10],
        [Math.cos(t) * radius, roofY + Math.sin(t) * radius, -10 + section * 10],
        0.075,
      );
    }
  for (const z of [-20, 20]) {
    context('roof', 'end-screen', 'roof', [0, 37, Math.sign(z) * 34], 12);
    for (let x = -8; x <= 8; x += 2) {
      beam(
        'Atrium end-screen mullion',
        'steel',
        [x, 39, z],
        [x, roofY + Math.sqrt(Math.max(0, radius * radius - x * x)), z],
        0.09,
      );
      if (x < 8) box('Atrium end-screen glazing', 'glass', [x + 1, 49.5, z], [1.92, 21, 0.055]);
    }
    for (let y = 39; y <= 60; y += 3) {
      beam('Atrium end-screen transom', 'steel', [-8, y, z], [8, y, z], 0.07);
      for (let x = -8; x < 8; x += 4) {
        beam('End-screen lattice', 'steel', [x, y, z + 0.1], [x + 4, y + 3, z + 0.1], 0.04);
      }
    }
    beam('Atrium major diagonal', 'steel', [-8, 40, z], [8, 60, z], 0.13);
    beam('Atrium major diagonal', 'steel', [-8, 60, z], [8, 40, z], 0.13);
  }
  // Roof-level exposed headers follow the terraces.
  for (const side of [-1, 1]) {
    context('services', 'pipework', 'roof', [side * 18, 60, 0], 12);
    beam(
      'Rooftop ventilation header',
      'steel',
      [side * 10, 59.4, -22],
      [side * 10, 59.4, 13],
      0.75,
    );
    for (let z = -17; z < 15; z += 7) {
      beam('Rooftop branch duct', 'steel', [side * 10, 59.4, z], [side * 17, 59.4, z], 0.3);
      beam('Rooftop branch return', 'steel', [side * 17, 59.4, z], [side * 17, 57.4, z], 0.3);
    }
  }
  for (const side of [-1, 1])
    for (const deck of [
      { z: 23, y: 40.9 },
      { z: 14, y: 50.5 },
      { z: -8, y: 59.8 },
    ]) {
      context('services', 'plant', 'roof', [side * 24, 49, Math.sign(deck.z) * 12], 12);
      box('Terrace rooftop plant curb', 'concrete', [side * 14, deck.y, deck.z], [10, 0.35, 5.6]);
      for (const dz of [-2.8, 2.8])
        beam(
          'Rooftop safety parapet',
          'steel',
          [side * 9.2, deck.y + 0.8, deck.z + dz],
          [side * 18.8, deck.y + 0.8, deck.z + dz],
          0.06,
        );
      for (let k = 0; k < 3; k++) {
        cyl(
          'Roof ventilation fan drum',
          'steel',
          [side * (11 + k * 2.7), deck.y + 0.8, deck.z],
          0.95,
          1.1,
        );
        cyl(
          'Ventilation fan grille rim',
          'dark',
          [side * (11 + k * 2.7), deck.y + 1.39, deck.z],
          1,
          0.08,
        );
        for (let j = -3; j <= 3; j++)
          beam(
            'Fan grille slat',
            'steel',
            [side * (11 + k * 2.7) - 0.8, deck.y + 1.46, deck.z + j * 0.21],
            [side * (11 + k * 2.7) + 0.8, deck.y + 1.46, deck.z + j * 0.21],
            0.025,
          );
      }
      for (let k = 0; k < 4; k++)
        beam(
          'Terrace parallel distribution pipe',
          'steel',
          [side * 9.2, deck.y + 0.35, deck.z - 2 + k * 0.32],
          [side * 19, deck.y + 0.35, deck.z - 2 + k * 0.32],
          0.07,
        );
    }
  // Furnishing and escalators are educational reconstructions, not current layouts.
  for (let f = 0; f < 4; f++) {
    context('room', 'boxes', 'floor', [0, f * 5.4, 0], f);
    const y = 2 + f * pitch + 0.35;
    for (const side of [-1, 1])
      for (let row = 0; row < 7; row++)
        for (let col = 0; col < 2; col++) {
          const x = side * (10.7 + col * 4.2),
            z = -21 + row * 6.4;
          box(
            `Illustrative underwriting box · level ${f}`,
            'wood',
            [x, y + 0.65, z],
            [3.6, 1.2, 2.55],
          );
          box('Box desktop', 'wood', [x, y + 1.31, z], [3.9, 0.12, 2.7]);
          for (const dx of [-0.95, 0.95]) {
            box('Desk display', 'dark', [x + dx, y + 1.72, z], [0.75, 0.62, 0.1]);
            box('Display stand', 'steel', [x + dx, y + 1.38, z], [0.12, 0.14, 0.3]);
            cyl('Desk chair seat', 'dark', [x + dx, y + 0.72, z + 1.7], 0.36, 0.15);
            box('Desk chair back', 'dark', [x + dx, y + 1.08, z + 1.95], [0.65, 0.65, 0.12]);
          }
        }
    if (f < 3) {
      context('circulation', 'escalators', 'floor', [0, f * 5.4, 0], f);
      const startX = f % 2 === 0 ? -6 : 6,
        endX = -startX;
      for (const z of [-3, 0]) {
        const start: Vec3 = [startX, y + 0.2, z],
          end: Vec3 = [endX, y + pitch + 0.2, z];
        for (const dz of [-0.7, 0.7]) {
          beam(
            'Escalator stringer',
            'steel',
            [start[0], start[1], z + dz],
            [end[0], end[1], z + dz],
            0.25,
          );
          beam(
            'Escalator handrail',
            'dark',
            [start[0], start[1] + 1.2, z + dz],
            [end[0], end[1] + 1.2, z + dz],
            0.09,
          );
          beam(
            'Escalator glazed side',
            'glass',
            [start[0], start[1] + 0.6, z + dz],
            [end[0], end[1] + 0.6, z + dz],
            0.24,
          );
        }
        for (let k = 0; k < 30; k++) {
          const t = k / 29;
          box(
            'Escalator tread',
            'dark',
            [startX + (endX - startX) * t, y + 0.2 + pitch * t, z],
            [0.42, 0.15, 1.3],
          );
        }
      }
    }
  }
  context('heritage', 'rostrum', 'fixed', [0, 0, 0], 0);
  cyl('Rostrum stone plinth', 'concrete', [0, 2.65, 13], 3.4, 0.45);
  cyl('Mahogany rostrum base', 'wood', [0, 3.1, 13], 2.65, 0.5);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    cyl(
      'Rostrum mahogany column',
      'wood',
      [Math.sin(a) * 1.7, 5.6, 13 + Math.cos(a) * 1.7],
      0.15,
      4.8,
    );
    cyl(
      'Rostrum column capital',
      'wood',
      [Math.sin(a) * 1.7, 8, 13 + Math.cos(a) * 1.7],
      0.22,
      0.2,
    );
  }
  cyl('Rostrum entablature', 'wood', [0, 8.2, 13], 2.2, 0.5);
  cyl('Rostrum cornice', 'wood', [0, 8.55, 13], 2.45, 0.18);
  add('Rostrum dome', 'sphere', 'wood', [0, 8.65, 13], [1.9, 0.7, 1.9]);
  add('Illustrative Lutine Bell', 'bell', 'brass', [0, 6.85, 13], [0.55, 0.7, 0.55]);
  beam('Bell suspension', 'brass', [0, 7.1, 13], [0, 8.2, 13], 0.07);
  add('Clock surround', 'cylinder', 'wood', [0, 10, 13], [0.75, 0.3, 0.75], [Math.PI / 2, 0, 0]);
  add(
    'Clock face indication',
    'cylinder',
    'concrete',
    [0, 10, 13.17],
    [0.6, 0.04, 0.6],
    [Math.PI / 2, 0, 0],
  );
  beam('Clock minute hand', 'dark', [0, 10, 13.2], [0, 10.45, 13.2], 0.025);
  beam('Clock hour hand', 'dark', [0, 10, 13.2], [0.29, 10, 13.2], 0.035);
  return parts;
}
export const parts = generateBuilding();
export const partById = new Map(parts.map((p) => [p.id, p]));
export const partsByAssembly = new Map<string, Part[]>();
for (const p of parts) {
  const list = partsByAssembly.get(p.assembly) || [];
  list.push(p);
  partsByAssembly.set(p.assembly, list);
}
