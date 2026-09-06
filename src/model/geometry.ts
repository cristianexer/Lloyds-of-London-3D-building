import * as THREE from 'three';
import type { GeometryKind } from './types';
export function makeGeometry(kind: GeometryKind) {
  switch (kind) {
    case 'box':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'cylinder':
      return new THREE.CylinderGeometry(1, 1, 1, 12);
    case 'sphere':
      return new THREE.SphereGeometry(1, 10, 8);
    case 'shell':
      return new THREE.CylinderGeometry(1, 1, 1, 24, 1, true, 0, Math.PI * 1.5);
    case 'ring':
      return new THREE.TorusGeometry(1, 0.035, 4, 32);
    case 'bell':
      return new THREE.CylinderGeometry(0.45, 1, 1, 16, 1, true);
    case 'stair-shell': {
      const outline = new THREE.Shape();
      outline.moveTo(-1, -1);
      outline.lineTo(0, -1);
      outline.absarc(0, 0, 1, -Math.PI / 2, Math.PI / 2, false);
      outline.lineTo(-1, 1);
      outline.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-0.97, -0.97);
      hole.lineTo(-0.97, 0.97);
      hole.lineTo(0, 0.97);
      hole.absarc(0, 0, 0.97, Math.PI / 2, -Math.PI / 2, true);
      hole.closePath();
      outline.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(outline, {
        depth: 1,
        bevelEnabled: false,
        curveSegments: 24,
      });
      g.rotateX(Math.PI / 2);
      g.translate(0, 0.5, 0);
      return g;
    }
  }
}
