# Verification report

Tested on **6 September 2026**, macOS with an Apple M4 Pro. Production files were served from Vite preview on port 4174 under `/Lloyds-of-London-3D-building/`, matching the GitHub Pages base path. The root-path build is also available on port 4173. Browser automation uses isolated sessions and does not reuse a personal browser profile.

## Automated checks

- **22 Vitest tests passed**: exclusive mode transitions, slider bounds, floor visibility, component and system isolation, hiding/restoration, full reset, reduced motion, guided tour completion, staged roof-first motion, exact no-drift explosion, unchanged orientation, reproducible generation, unique IDs/valid parents, clear atrium floor plates and sourced metadata, plus solid-section areas/normals/IDs, transformed sections, tangency, hollow exclusions and ghost-floor filtering.
- **Production Chrome 152.0.7977.65**: assembled/exploded rendering, multiple scrubs with a byte-level hash of the actual instanced transform buffers before and after reset, section position, floor controls, search and selection, framing, isolation, related-system filtering, hiding and restoration, both interior presets, all tour stops, the fictional market lesson, pointer cancellation of rotation, keyboard camera control, reduced motion, the text catalogue and return to 3D.
- **390 × 844 Chrome touch emulation**: no horizontal document overflow, touch controls, searchable anatomy sheet, heritage selection, information sheet and cutaway controls.
- **WebGL-unavailable simulation**: the searchable catalogue and component information remain accessible when WebGL context creation is unavailable.
- **WebKit 26.0, 1024 × 1366 touch viewport**: rendering, full explosion, section reassembly, floors with ghost context, service-pod search/selection, isolation, framing and reset passed with no page errors. This is a Safari-engine check on macOS, not testing on physical iPad hardware.
- **Final focused checks** passed for each on-scene market hotspot, the adjusted Underwriting Room viewpoint, and recovery after a real `WEBGL_lose_context` event using the Retry action.
- **Production build and TypeScript** passed. The full Chrome pass reported **no page errors and no failed asset requests**.

`output/playwright/results.json` and `output/playwright/webkit-results.json` contain raw results from local runs; this generated output is ignored by Git. `scripts/browser-check.mjs` and `scripts/webkit-check.mjs` reproduce the checks. Additional visual/context-loss checks are in `scripts/final-visual-check.mjs`.

## Measured performance

After a 1.5-second settling period, each sample counted actual rendered frames over approximately 3.5 seconds of assembled auto-rotation. The renderer was ANGLE Metal on Apple M4 Pro.

| Configuration                              | Render DPR | Rendered fps | 95th percentile animation-frame interval |
| ------------------------------------------ | ---------: | -----------: | ---------------------------------------: |
| Chrome, 1440 × 1000, Retina context        |        1.5 |         60.2 |                                  16.7 ms |
| Chrome touch viewport emulation, 390 × 844 |        1.0 |         60.1 |                                  16.8 ms |

The measured assembled scene used 28 main-pass draw calls and approximately 661,000 triangles. Shadow rendering adds work beyond the reported main-pass draw-call count. Idle scenes render on demand; these are active-interaction measurements, not idle fps claims. Shader compilation and model generation are excluded from the settled rotation sample.

These short measurements do not guarantee 60 fps across devices. Physical iPhone/iPad thermals, mobile GPUs, low-end devices, long sessions and real Safari touch gestures still need device testing. Initialisation and exploding all instances cost more than steady-state orbiting. The app limits DPR and can reduce it when active frame samples are slow.

## Visual inspection and known limits

Assembled, exploded, cutaway, floor, interior, selection and mobile screenshots were inspected. The original restrained explosion was revised after user feedback: separate service assemblies, wider offsets, four roof sections, larger gallery gaps and automatic expanded framing. Additional close-up references informed stair shells, service pods, ladders, pipe bends, collars, landing supports and façade/roof details.

The model remains an approximation, not a surveyed reconstruction. Some real architectural details remain absent, including full basement levels, Adam Room, complete upper-office furnishings and concealed services. The retained Cooper entrance now has an illustrative representation. Furniture, escalator geometry and heritage ornament are representative. Section faces cap closed model solids; thin glazing and hollow casings are intentionally not filled. The view does not provide dimensioned construction drawings. Transparency uses sorted conventional PBR surfaces, not full multi-layer refractive simulation.

Physical-device performance certification was not performed. GitHub Pages publication is configured in `.github/workflows/pages.yml`; the local Pages-path build passed without missing asset requests. The Vercel configuration is retained for root-domain hosting.

## Finishing checks

- `scripts/refinement-check.mjs`: assembled guide labels are absent; exploded labels appear and select an assembly; the guide toggle works; solid section faces exist; ghost/hide transitions update the rendered batches; the Cooper entrance can be searched, isolated and framed. No page errors.
- `scripts/banner-check.mjs`: the original SVG renders, component transforms animate, and `prefers-reduced-motion` stops the animation. Both assembled and separated frames were inspected.
- Dependency patch updates: Vite 6.4.3 and Vitest 3.2.7. `npm audit` reports zero known vulnerabilities at the time of this check. Generated production asset hashes were unchanged by these tooling patches.
- Reference review and the final additions are recorded in `docs/RESEARCH.md`. This validates model relationships against references, not surveyed dimensional accuracy.
