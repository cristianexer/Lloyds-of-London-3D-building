import { writeFile } from 'node:fs/promises';
import { Matrix4, Euler, Quaternion, Vector3 } from 'three';
import { parts } from '../src/model/building';
import type { Part } from '../src/model/types';

// A compact vector interpretation generated from the same authored model.
// Each component receives a small projected explosion offset, animated in CSS.
const selected = parts.filter(
  (p) =>
    p.shape === 'stair-shell' ||
    /base slab| plate$|north return|south return|Glazed bay|End elevation glazed bay|Stepped terrace glazed bay|Prefabricated service pod enclosure|Rooftop plant room volume|Plant room roof cap|Meeting pod enclosure|Concrete column segment|External.*riser|Vertical.*duct/.test(
      p.name,
    ) ||
    (['vault', 'cranes', 'pipework'].includes(p.assembly) &&
      p.shape === 'cylinder' &&
      p.scale[1] > 0.6),
);
const project = (v: Vector3) => [746 + (v.x - v.z) * 2.05, 367 - v.y * 2.75 + (v.x + v.z) * 0.71];
const points = (ps: Vector3[]) =>
  ps
    .map((v) =>
      project(v)
        .map((n) => n.toFixed(2))
        .join(','),
    )
    .join(' ');
const colour = (p: Part) =>
  p.material === 'glass'
    ? '#263f43'
    : p.material === 'blue'
      ? '#54889a'
      : p.material === 'dark'
        ? '#3d4f4f'
        : p.material === 'concrete'
          ? '#899087'
          : '#718481';
const shapes: { depth: number; svg: string }[] = [];
for (const p of selected) {
  const matrix = new Matrix4().compose(
    new Vector3(...p.position),
    new Quaternion().setFromEuler(new Euler(...p.rotation)),
    new Vector3(...p.scale),
  );
  const vertex = (x: number, y: number, z: number) => new Vector3(x, y, z).applyMatrix4(matrix);
  let drawing = '';
  if (p.shape === 'cylinder') {
    const a = project(vertex(0, -0.5, 0)),
      b = project(vertex(0, 0.5, 0));
    drawing = `<path d="M${a.join(',')} L${b.join(',')}" fill="none" stroke="${colour(p)}" stroke-width="${Math.max(0.45, p.scale[0] * 3.4).toFixed(2)}"/>`;
  } else {
    const faces =
      p.shape === 'stair-shell'
        ? Array.from({ length: 12 }, (_, i) => {
            const a = -Math.PI / 2 + (i * Math.PI) / 12,
              b = a + Math.PI / 12;
            return [
              vertex(Math.cos(a), -0.5, Math.sin(a)),
              vertex(Math.cos(b), -0.5, Math.sin(b)),
              vertex(Math.cos(b), 0.5, Math.sin(b)),
              vertex(Math.cos(a), 0.5, Math.sin(a)),
            ];
          })
        : [
            [
              vertex(-0.5, 0.5, -0.5),
              vertex(0.5, 0.5, -0.5),
              vertex(0.5, 0.5, 0.5),
              vertex(-0.5, 0.5, 0.5),
            ],
            [
              vertex(0.5, -0.5, -0.5),
              vertex(0.5, -0.5, 0.5),
              vertex(0.5, 0.5, 0.5),
              vertex(0.5, 0.5, -0.5),
            ],
            [
              vertex(-0.5, -0.5, 0.5),
              vertex(0.5, -0.5, 0.5),
              vertex(0.5, 0.5, 0.5),
              vertex(-0.5, 0.5, 0.5),
            ],
          ];
    drawing = faces
      .map(
        (face, i) =>
          `<polygon points="${points(face)}" fill="${colour(p)}" fill-opacity="${p.material === 'glass' ? '.68' : '.94'}" stroke="${i === 0 ? '#b0b8a7' : '#8c9d91'}" stroke-width=".35"/>`,
      )
      .join('');
  }
  const dx = (p.offset[0] - p.offset[2]) * 0.29,
    dy = -p.offset[1] * 0.52 + (p.offset[0] + p.offset[2]) * 0.08;
  shapes.push({
    depth: p.position[0] + p.position[2] + p.position[1] * 0.12,
    svg: `<g class="piece" style="--dx:${dx.toFixed(2)}px;--dy:${dy.toFixed(2)}px">${drawing}</g>`,
  });
}
shapes.sort((a, b) => a.depth - b.depth);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500" viewBox="0 0 1200 500" role="img" aria-labelledby="title desc">
<title id="title">Inside Lloyd’s — architecture, inside out</title>
<desc id="desc">An animated architectural illustration of Lloyd’s of London. Its service towers, galleries and vaulted roof slowly separate and reassemble. An independent experiment with OpenAI Astra 6 by Cristian Exer.</desc>
<style>
.piece {animation: separate 12s cubic-bezier(.45,0,.2,1) infinite;}
@keyframes separate {0%,15%,90%,100% {transform:translate(0,0)} 43%,63% {transform:translate(var(--dx),var(--dy))}}
.signal {animation: signal 12s ease-in-out infinite}
@keyframes signal {0%,15%,90%,100% {opacity:.35} 43%,63% {opacity:1}}
@media(prefers-reduced-motion:reduce) {.piece,.signal {animation:none}}
</style>
<defs><pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#8c9a7c" stroke-opacity=".045"/></pattern></defs>
<rect width="1200" height="500" rx="14" fill="#1b241f"/>
<rect x="475" width="725" height="500" fill="url(#grid)"/>
<path d="M42 66H1158M42 439H1158" stroke="#52604b" stroke-opacity=".6"/>
<circle cx="48" cy="38" r="3" fill="#c9b88f"/>
<text x="63" y="42" fill="#b1bca2" font-family="Arial,Helvetica,sans-serif" font-size="11" letter-spacing="2.5">ONE LIME STREET · LONDON</text>
<text x="1157" y="42" text-anchor="end" fill="#8f9e83" font-family="Arial,Helvetica,sans-serif" font-size="10" letter-spacing="2">AN ARCHITECTURAL EXPLORATION</text>
<text x="47" y="152" fill="#ecebdd" font-family="Georgia,serif" font-size="64" letter-spacing="-2">Inside Lloyd’s</text>
<text x="50" y="203" fill="#caba92" font-family="Georgia,serif" font-style="italic" font-size="36">Architecture, inside out.</text>
<text x="51" y="258" fill="#afbcaa" font-family="Arial,Helvetica,sans-serif" font-size="15">Take apart a landmark.</text>
<text x="51" y="281" fill="#afbcaa" font-family="Arial,Helvetica,sans-serif" font-size="15">Discover how the pieces belong together.</text>
<path d="M51 322H88" stroke="#bdad81"/>
<text x="51" y="351" fill="#d5d8c5" font-family="Arial,Helvetica,sans-serif" font-size="12" letter-spacing="1.5">ORBIT  /  EXPLODE  /  DISCOVER</text>
<text x="51" y="376" fill="#82947b" font-family="Arial,Helvetica,sans-serif" font-size="11">An experiment with OpenAI Astra 6.</text>
<ellipse cx="746" cy="370" rx="187" ry="59" fill="#253028" stroke="#67755b" stroke-opacity=".5"/>
${shapes.map((s) => s.svg).join('\n')}
<path class="signal" d="M1010 148v206m-6-206h12m-12 206h12" fill="none" stroke="#a99b72" stroke-dasharray="2 5"/>
<text x="1054" y="252" transform="rotate(-90 1054 252)" text-anchor="middle" fill="#96a387" font-family="Arial,Helvetica,sans-serif" font-size="10" letter-spacing="2">SERVED SPACE / VISIBLE SERVICES</text>
<text x="51" y="471" fill="#87997e" font-family="Arial,Helvetica,sans-serif" font-size="10" letter-spacing="1.5">INDEPENDENT EXPERIMENT · CRISTIAN EXER</text>
<text x="1157" y="471" text-anchor="end" fill="#c5b78f" font-family="Arial,Helvetica,sans-serif" font-size="10" letter-spacing="1.5">17,732 ELEMENTS · 39 ASSEMBLIES · 7 SYSTEMS</text>
</svg>`;
await writeFile('docs/banner.svg', svg);
console.log(`Generated animated banner from ${selected.length} model components.`);
