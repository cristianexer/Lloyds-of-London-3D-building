import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { parts } from '../model/building';
import { positionAt } from '../model/explosion';
import { prepareSections, buildSectionCaps } from '../model/section';
import { isVisible, useExplorer } from '../store';
import type { Part } from '../model/types';

function CappedSection() {
  const section = useExplorer((s) => s.section),
    hidden = useExplorer((s) => s.hidden),
    isolated = useExplorer((s) => s.isolated);
  const prepared = useMemo(() => prepareSections(parts), []);
  const caps = useMemo(
    () =>
      buildSectionCaps(prepared, 22 - section * 40, (p) =>
        isVisible(p, { mode: 'section', floor: 0, hidden, isolated }),
      ),
    [prepared, section, hidden, isolated],
  );
  useEffect(() => () => caps.geometry.dispose(), [caps]);
  return (
    <mesh
      name="Solid section faces"
      geometry={caps.geometry}
      onClick={(e) => {
        const id = e.faceIndex == null ? null : caps.ids[e.faceIndex];
        if (id) {
          e.stopPropagation();
          useExplorer.getState().select(id);
        }
      }}
    >
      <meshStandardMaterial color="#d9bc83" roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  );
}
export function SectionCaps() {
  const mode = useExplorer((s) => s.mode);
  return mode === 'section' ? <CappedSection /> : null;
}
const guideSpecs = [
  { assembly: 'vault', label: 'Glass vault', minY: 60 },
  { assembly: 'curtain-wall', label: 'Façade', minY: 27 },
  { assembly: 'service-pods', label: 'Service pods', minY: 32 },
  { assembly: 'stairs', label: 'Stairs', minY: 22 },
  { assembly: 'floor-8', label: 'Gallery 08', minY: 39 },
  { assembly: 'meeting-pods', label: 'Meeting pods', minY: 23 },
];
function Guide({ part, label }: { part: Part; label: string }) {
  const group = useRef<THREE.Group>(null),
    anchor = useRef<THREE.Group>(null),
    current = useRef(0);
  const labelElement = useRef<HTMLButtonElement>(null);
  const { invalidate } = useThree();
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...part.position),
      new THREE.Vector3(...part.position),
    ]);
    const line = new THREE.Line(
      geometry,
      new THREE.LineDashedMaterial({
        color: '#bcae86',
        transparent: true,
        opacity: 0.5,
        dashSize: 0.8,
        gapSize: 0.65,
        depthWrite: false,
      }),
    );
    line.frustumCulled = false;
    return line;
  }, [part]);
  useEffect(
    () => () => {
      line.geometry.dispose();
      line.material.dispose();
    },
    [line],
  );
  useFrame((_, dt) => {
    const s = useExplorer.getState(),
      delta = s.explosion - current.current;
    current.current =
      s.reducedMotion || Math.abs(delta) < 0.0001
        ? s.explosion
        : current.current + delta * (1 - Math.exp(-dt * 12));
    const end = positionAt(part, current.current);
    const moved = Math.hypot(...end.map((n, i) => n - part.position[i]));
    const visible = moved > 3 && isVisible(part, s);
    if (group.current) group.current.visible = visible;
    if (labelElement.current) labelElement.current.style.display = visible ? '' : 'none';
    const a = line.geometry.getAttribute('position');
    a.setXYZ(1, ...end);
    a.needsUpdate = true;
    line.computeLineDistances();
    anchor.current?.position.set(end[0], end[1] + 1.6, end[2]);
    if (Math.abs(delta) > 0.0001) invalidate();
  });
  return (
    <group ref={group} name={`Guide: ${label}`} visible={false}>
      <primitive object={line} raycast={() => {}} />
      <group ref={anchor}>
        <Html center zIndexRange={[3, 0]}>
          <button
            ref={labelElement}
            style={{ display: 'none' }}
            className="connection-label"
            onClick={() => useExplorer.getState().select(part.assembly)}
          >
            {label}
          </button>
        </Html>
      </group>
    </group>
  );
}
export function ExplosionGuides() {
  const mode = useExplorer((s) => s.mode),
    enabled = useExplorer((s) => s.guides);
  const anchors = useMemo(
    () =>
      guideSpecs.map((spec) => ({
        ...spec,
        part: parts.find(
          (p) =>
            p.assembly === spec.assembly &&
            p.position[1] >= spec.minY &&
            p.offset.some((v) => v !== 0),
        )!,
      })),
    [],
  );
  if (mode !== 'exterior' || !enabled) return null;
  return (
    <group name="Exploded connection guides">
      {anchors.map((a) => (
        <Guide key={a.assembly} part={a.part} label={a.label} />
      ))}
    </group>
  );
}
