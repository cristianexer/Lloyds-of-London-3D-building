import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { parts, partById } from '../model/building';
import { positionAt } from '../model/explosion';
import type { GeometryKind, MaterialKind, Part, Vec3 } from '../model/types';
import { isVisible, matches, useExplorer, type View } from '../store';

type Batch = {
  key: string;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  parts: Part[];
  mesh: THREE.InstancedMesh | null;
  facade: boolean;
  glass: boolean;
};
const materialColours: Record<MaterialKind, string> = {
  concrete: '#73776f',
  steel: '#a1aaa8',
  dark: '#242f30',
  glass: '#354e55',
  warm: '#e3c495',
  wood: '#684131',
  brass: '#ad8548',
  blue: '#456d88',
};
const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1000);
function makeGeometry(kind: GeometryKind) {
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
function makeBatches() {
  const map = new Map<string, Batch>();
  const geometries = new Map<GeometryKind, THREE.BufferGeometry>();
  for (const p of parts) {
    const facade = p.system === 'facade';
    const key = `${p.shape}-${p.material}-${facade}`;
    if (!map.has(key)) {
      let g = geometries.get(p.shape);
      if (!g) {
        g = makeGeometry(p.shape);
        geometries.set(p.shape, g);
      }
      const glass = p.material === 'glass';
      const m = new THREE.MeshStandardMaterial({
        color: 'white',
        roughness: glass ? 0.15 : p.material === 'steel' ? 0.24 : 0.72,
        metalness: glass
          ? 0.25
          : p.material === 'steel'
            ? 0.88
            : p.material === 'brass'
              ? 0.75
              : 0.1,
        transparent: glass,
        opacity: glass ? 0.4 : 1,
        depthWrite: !glass,
        side:
          p.shape === 'shell' || p.shape === 'stair-shell' || glass
            ? THREE.DoubleSide
            : THREE.FrontSide,
        clippingPlanes: [clipPlane],
        clipShadows: true,
        envMapIntensity: glass ? 1.2 : 0.8,
      });
      if (p.material === 'warm') {
        m.emissive = new THREE.Color('#b78948');
        m.emissiveIntensity = 0.65;
      }
      map.set(key, { key, geometry: g, material: m, parts: [], mesh: null, facade, glass });
    }
    map.get(key)!.parts.push(p);
  }
  return [...map.values()];
}
function Model() {
  const batches = useMemo(makeBatches, []);
  const dirty = useRef(true);
  const current = useRef(0);
  const { invalidate } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colour = useMemo(() => new THREE.Color(), []);
  useEffect(
    () =>
      useExplorer.subscribe(() => {
        dirty.current = true;
        invalidate();
      }),
    [invalidate],
  );
  useEffect(
    () => () => {
      new Set(batches.map((b) => b.geometry)).forEach((g) => g.dispose());
      batches.forEach((b) => b.material.dispose());
    },
    [batches],
  );
  useFrame((_, dt) => {
    const s = useExplorer.getState();
    const delta = s.explosion - current.current;
    if (Math.abs(delta) > 0.0001) {
      current.current = s.reducedMotion
        ? s.explosion
        : current.current + delta * (1 - Math.exp(-dt * 12));
      dirty.current = true;
      invalidate();
    } else if (current.current !== s.explosion) {
      current.current = s.explosion;
      dirty.current = true;
    }
    if (!dirty.current) return;
    clipPlane.constant = s.mode === 'section' ? 22 - s.section * 40 : 1000;
    for (const batch of batches) {
      if (!batch.mesh) continue;
      const opacity = batch.facade
        ? batch.glass
          ? s.facade * 0.65
          : s.facade < 0.4
            ? s.facade / 0.4
            : 1
        : batch.glass
          ? 0.38
          : 1;
      const transparent = opacity < 1;
      if (batch.material.transparent !== transparent) {
        batch.material.transparent = transparent;
        batch.material.needsUpdate = true;
      }
      batch.material.opacity = opacity;
      batch.material.depthWrite = !transparent;
      batch.parts.forEach((p, i) => {
        dummy.position.set(...positionAt(p, current.current));
        dummy.rotation.set(...p.rotation);
        dummy.scale.set(...(isVisible(p, s) ? p.scale : ([0, 0, 0] as Vec3)));
        dummy.updateMatrix();
        batch.mesh!.setMatrixAt(i, dummy.matrix);
        const selected = matches(p, s.selected),
          hovered = matches(p, s.hovered);
        colour.set(
          selected ? '#eec67e' : hovered ? '#e8dbb8' : p.colour || materialColours[p.material],
        );
        if (s.selected && !selected) colour.multiplyScalar(0.76);
        batch.mesh!.setColorAt(i, colour);
      });
      batch.mesh.instanceMatrix.needsUpdate = true;
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
      batch.mesh.computeBoundingSphere();
    }
    dirty.current = false;
  });
  function hit(e: ThreeEvent<PointerEvent | MouseEvent>, batch: Batch) {
    if (e.instanceId === undefined) return null;
    const s = useExplorer.getState();
    if (s.mode === 'section' && e.point.x > clipPlane.constant) return null;
    return batch.parts[e.instanceId];
  }
  return (
    <group name="Lloyd’s building">
      {batches.map((b) => (
        <instancedMesh
          key={b.key}
          name={b.key}
          ref={(m) => {
            b.mesh = m;
            if (m) m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          }}
          args={[b.geometry, b.material, b.parts.length]}
          frustumCulled={false}
          castShadow={!b.glass}
          receiveShadow
          onClick={(e) => {
            const p = hit(e, b);
            if (p) {
              e.stopPropagation();
              useExplorer.getState().select(p.id);
            }
          }}
          onPointerMove={(e) => {
            if (e.pointerType === 'touch') return;
            const p = hit(e, b);
            if (p) {
              e.stopPropagation();
              if (useExplorer.getState().hovered !== p.id) useExplorer.getState().hover(p.id);
            }
          }}
          onPointerOut={() => useExplorer.getState().hover(null)}
        />
      ))}
    </group>
  );
}
const views: Record<Exclude<View, 'frame'>, { position: Vec3; target: Vec3 }> = {
  hero: { position: [113, 87, 139], target: [0, 36, 0] },
  lime: { position: [137, 65, 80], target: [0, 34, 0] },
  rear: { position: [-118, 90, -122], target: [0, 36, 0] },
  roof: { position: [79, 146, 82], target: [0, 35, 0] },
  atrium: { position: [0, 14, 17], target: [0, 35, -14] },
  room: { position: [4.5, 10.8, 16], target: [0, 9, -10] },
};
function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const framedExplosion = useRef(0);
  const { camera, invalidate, size, gl } = useThree();
  const desired = useRef(views.hero);
  const moving = useRef(true);
  const desiredFov = useRef(36);
  const autoRotate = useExplorer((s) => s.autoRotate);
  const reduced = useExplorer((s) => s.reducedMotion);
  const viewNonce = useExplorer((s) => s.viewNonce);
  useEffect(() => {
    const s = useExplorer.getState();
    let v = s.view === 'frame' ? views.hero : views[s.view];
    if (s.mode === 'market') v = { position: [48, 60, 68], target: [0, 3, 0] };
    if (s.mode === 'floors' && s.view === 'roof')
      v = { position: [70, 103 + s.floor * 2.4, 88], target: [0, 3 + s.floor * 2.4, 0] };
    if (s.view === 'frame' && s.selected) {
      const ps = parts.filter((p) => matches(p, s.selected));
      if (ps.length) {
        const bounds = new THREE.Box3();
        for (const p of ps) {
          const v = new THREE.Vector3(...positionAt(p, s.explosion));
          bounds.expandByPoint(v.clone().add(new THREE.Vector3(...p.scale).multiplyScalar(0.5)));
          bounds.expandByPoint(v.clone().sub(new THREE.Vector3(...p.scale).multiplyScalar(0.5)));
        }
        const target = bounds.getCenter(new THREE.Vector3());
        const radius = bounds.getSize(new THREE.Vector3()).length() / 2;
        const halfAngle = Math.min(
          Math.PI / 10,
          Math.atan((Math.tan(Math.PI / 10) * size.width) / size.height),
        );
        const dist = Math.max(9, (radius / Math.sin(halfAngle)) * 1.08);
        v = {
          target: target.toArray() as Vec3,
          position: target
            .clone()
            .add(new THREE.Vector3(0.65, 0.45, 0.9).normalize().multiplyScalar(dist))
            .toArray() as Vec3,
        };
      }
    }
    // Fit a tall model on narrow screens without changing its proportions.
    const indoor = s.view === 'atrium' || s.view === 'room' || s.view === 'frame';
    desiredFov.current = s.view === 'atrium' ? 60 : s.view === 'room' ? 55 : 36;
    const factor = indoor
      ? 1
      : size.width / size.height < 0.85
        ? 1.5
        : size.width / size.height < 1.2
          ? 1.15
          : 1;
    const target = new THREE.Vector3(...v.target);
    const pos = new THREE.Vector3(...v.position).sub(target).multiplyScalar(factor).add(target);
    if (s.mode === 'exterior' && s.explosion > 0) {
      pos
        .sub(target)
        .multiplyScalar(1 + s.explosion * 0.78)
        .add(target);
      pos.y += s.explosion * 29;
      target.y += s.explosion * 29;
    }
    framedExplosion.current = s.explosion;
    desired.current = { target: target.toArray() as Vec3, position: pos.toArray() as Vec3 };
    moving.current = true;
    invalidate();
  }, [viewNonce, size.width, size.height, invalidate]);
  useEffect(() => {
    function stop() {
      moving.current = false;
      useExplorer.getState().setRotate(false);
    }
    const element = gl.domElement;
    element.addEventListener('pointerdown', stop);
    element.addEventListener('wheel', stop, { passive: true });
    function key(e: KeyboardEvent) {
      if (!controls.current) return;
      const c = controls.current;
      const offset = camera.position.clone().sub(c.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      let handled = true;
      if (e.key === 'ArrowLeft') spherical.theta -= 0.13;
      else if (e.key === 'ArrowRight') spherical.theta += 0.13;
      else if (e.key === 'ArrowUp') spherical.phi = Math.max(0.05, spherical.phi - 0.1);
      else if (e.key === 'ArrowDown') spherical.phi = Math.min(Math.PI - 0.05, spherical.phi + 0.1);
      else if (e.key === '+' || e.key === '=')
        spherical.radius = Math.max(3, spherical.radius * 0.88);
      else if (e.key === '-') spherical.radius = Math.min(360, spherical.radius * 1.12);
      else if (e.key === 'Home') {
        useExplorer.getState().reset();
        return;
      } else handled = false;
      if (handled) {
        e.preventDefault();
        stop();
        camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(c.target));
        c.update();
        invalidate();
      }
    }
    element.addEventListener('keydown', key);
    function zoom(e: Event) {
      const factor = (e as CustomEvent<number>).detail;
      stop();
      if (controls.current) {
        camera.position
          .sub(controls.current.target)
          .multiplyScalar(factor)
          .add(controls.current.target);
        controls.current.update();
        invalidate();
      }
    }
    window.addEventListener('explorer-zoom', zoom);
    return () => {
      element.removeEventListener('pointerdown', stop);
      element.removeEventListener('wheel', stop);
      element.removeEventListener('keydown', key);
      window.removeEventListener('explorer-zoom', zoom);
    };
  }, [camera, gl, invalidate]);
  useFrame((_, dt) => {
    if (!controls.current) return;
    const s = useExplorer.getState();
    if (s.explosion !== framedExplosion.current && s.mode === 'exterior') {
      const old = framedExplosion.current,
        next = s.explosion,
        ratio = (1 + next * 0.78) / (1 + old * 0.78);
      const t = new THREE.Vector3(
        ...(moving.current ? desired.current.target : (controls.current.target.toArray() as Vec3)),
      );
      const p = new THREE.Vector3(
        ...(moving.current ? desired.current.position : (camera.position.toArray() as Vec3)),
      );
      p.sub(t).multiplyScalar(ratio).add(t);
      p.y += (next - old) * 29;
      t.y += (next - old) * 29;
      desired.current = { target: t.toArray() as Vec3, position: p.toArray() as Vec3 };
      framedExplosion.current = next;
      moving.current = true;
    }
    if (moving.current) {
      const k = reduced ? 1 : 1 - Math.exp(-dt * 4.5);
      const p = new THREE.Vector3(...desired.current.position),
        t = new THREE.Vector3(...desired.current.target);
      camera.position.lerp(p, k);
      controls.current.target.lerp(t, k);
      const pc = camera as THREE.PerspectiveCamera;
      pc.fov = THREE.MathUtils.lerp(pc.fov, desiredFov.current, k);
      pc.updateProjectionMatrix();
      controls.current.update();
      if (camera.position.distanceTo(p) < 0.03 && controls.current.target.distanceTo(t) < 0.03) {
        camera.position.copy(p);
        controls.current.target.copy(t);
        moving.current = false;
      }
      invalidate();
    }
    if (autoRotate) invalidate();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping={!reduced}
      dampingFactor={0.09}
      minDistance={3}
      maxDistance={360}
      maxPolarAngle={Math.PI * 0.93}
      autoRotate={autoRotate}
      autoRotateSpeed={0.45}
      onStart={() => {
        moving.current = false;
        useExplorer.getState().setRotate(false);
      }}
    />
  );
}
function Studio() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new THREE.Scene();
    room.background = new THREE.Color('#798284');
    const panels: THREE.Mesh[] = [];
    for (const [position, width, height, power] of [
      [[55, 30, 15], 15, 95, 4],
      [[-45, 35, 35], 25, 100, 2],
      [[0, 75, -5], 65, 45, 2],
      [[10, 40, -60], 16, 90, 3],
    ] as [Vec3, number, number, number][]) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(power, power, power),
          side: THREE.DoubleSide,
        }),
      );
      mesh.position.set(...position);
      mesh.lookAt(0, 30, 0);
      room.add(mesh);
      panels.push(mesh);
    }
    const env = pmrem.fromScene(room, 0.015);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.8;
    invalidate();
    return () => {
      scene.environment = null;
      env.dispose();
      panels.forEach((p) => {
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      });
      pmrem.dispose();
    };
  }, [gl, scene, invalidate]);
  return (
    <>
      <ambientLight intensity={0.2} />
      <hemisphereLight args={['#dae7ed', '#696252', 0.55]} />
      <directionalLight
        position={[30, 110, 60]}
        intensity={2.5}
        color="#fff0d9"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={100}
        shadow-camera-bottom={-70}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
        shadow-normalBias={0.25}
      />
      <directionalLight position={[-70, 60, -30]} intensity={1.3} color="#bfd1da" />
      <directionalLight position={[10, 25, -65]} intensity={1.1} color="#e4dece" />
      <pointLight position={[0, 16, 0]} intensity={100} distance={45} color="#edc185" decay={1.5} />
      <mesh position={[0, -1.1, 0]} receiveShadow>
        <cylinderGeometry args={[49, 49, 1.4, 96]} />
        <meshStandardMaterial color="#202820" roughness={0.92} />
      </mesh>
      <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[47.3, 47.39, 128]} />
        <meshBasicMaterial color="#76796b" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, -1.83, 0]}>
        <cylinderGeometry args={[49.15, 48.3, 0.17, 96]} />
        <meshStandardMaterial color="#161b18" metalness={0.5} roughness={0.6} />
      </mesh>
    </>
  );
}
function RenderStatus({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera, invalidate, setFrameloop, setDpr } = useThree();
  const samples = useRef<number[]>([]);
  const adjusted = useRef(false);
  useFrame((_, dt) => {
    if (dt < 0.2 && dt > 0.003) {
      samples.current.push(dt);
      if (samples.current.length > 120) samples.current.shift();
    }
    if (!adjusted.current && samples.current.length === 120) {
      const avg = samples.current.reduce((a, b) => a + b, 0) / 120;
      if (avg > 1 / 32) {
        setDpr(1);
        adjusted.current = true;
      }
    }
  });
  useEffect(() => {
    onReady();
    const visible = () => {
      setFrameloop(document.hidden ? 'never' : 'demand');
      if (!document.hidden) invalidate();
    };
    document.addEventListener('visibilitychange', visible);
    const debug = {
      renderer: gl,
      scene,
      camera,
      parts,
      store: useExplorer,
      frameTimes: samples.current,
    };
    // Scene inspection/performance hooks for reproducible browser verification.
    Object.assign(window, { __LLOYDS__: debug });
    return () => {
      document.removeEventListener('visibilitychange', visible);
      delete (window as unknown as { __LLOYDS__?: unknown }).__LLOYDS__;
    };
  }, [gl, scene, camera, onReady, invalidate, setFrameloop]);
  return null;
}
function MarketHotspots() {
  const mode = useExplorer((s) => s.mode);
  const step = useExplorer((s) => s.marketStep);
  const reduced = useExplorer((s) => s.reducedMotion);
  const { invalidate } = useThree();
  const marker = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  const positions: Vec3[] = [
    [0, 4, 18],
    [1, 4, 6],
    [-11, 4, -8],
  ];
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(
      positions.map((p) => new THREE.Vector3(...p)),
    );
    const m = new THREE.LineDashedMaterial({
      color: '#cbb886',
      dashSize: 0.65,
      gapSize: 0.4,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    const l = new THREE.Line(g, m);
    l.computeLineDistances();
    return l;
  }, []);
  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );
  useFrame((_, dt) => {
    if (mode !== 'market' || reduced) return;
    time.current += Math.min(dt, 0.05);
    const t = (time.current * 0.14) % 1;
    const segment = t < 0.5 ? 0 : 1;
    marker.current?.position.lerpVectors(
      new THREE.Vector3(...positions[segment]),
      new THREE.Vector3(...positions[segment + 1]),
      (t * 2) % 1,
    );
    invalidate();
  });
  if (mode !== 'market') return null;
  return (
    <group name="Fictional market journey">
      <primitive object={line} />
      <mesh ref={marker} position={positions[0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial color="#e4cb96" />
      </mesh>
      {positions.map((p, i) => (
        <Html key={i} position={[p[0], p[1] + 1.8, p[2]]} center occlude zIndexRange={[4, 0]}>
          <button
            className={`market-hotspot ${step === i ? 'active' : ''}`}
            aria-label={`Market hotspot: ${['client', 'broker', 'underwriters'][i]}`}
            onClick={() => useExplorer.getState().setMarketStep(i)}
          >
            <span>{i + 1}</span>
            {['Client', 'Broker', 'Underwriters'][i]}
          </button>
        </Html>
      ))}
    </group>
  );
}
export function Scene({ onReady, onError }: { onReady: () => void; onError: () => void }) {
  const [quality] = useState(() => (window.matchMedia('(max-width: 760px)').matches ? 1 : 1.5));
  const hovered = useExplorer((s) => s.hovered);
  const part = hovered ? partById.get(hovered) : null;
  return (
    <div className={`scene ${hovered ? 'is-hovering' : ''}`}>
      <Canvas
        frameloop="demand"
        dpr={[1, quality]}
        shadows
        camera={{ fov: 36, position: views.hero.position, near: 0.3, far: 1600 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.domElement.tabIndex = 0;
          gl.domElement.setAttribute(
            'aria-label',
            'Interactive building. Arrow keys orbit, plus and minus zoom, Home resets. Select components using the catalogue.',
          );
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            if (gl.domElement.isConnected) onError();
          });
        }}
        onPointerMissed={() => useExplorer.getState().hover(null)}
        fallback={<p>3D is unavailable. Open the component catalogue to explore the building.</p>}
      >
        <Studio />
        <Model />
        <MarketHotspots />
        <CameraRig />
        <RenderStatus onReady={onReady} />
      </Canvas>
      {part && (
        <div className="hover-caption" aria-hidden="true">
          <span className="accent-dot" />
          {part.name}
          <span>Click to inspect</span>
        </div>
      )}
    </div>
  );
}
