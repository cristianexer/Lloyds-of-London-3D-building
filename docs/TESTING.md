# Verification report

Tested on **6 September 2026**, macOS with an Apple M4 Pro. Production files were served from Vite preview on port 4173. Browser automation uses isolated sessions and does not reuse a personal browser profile.

## Automated checks

- **17 Vitest tests passed**: exclusive mode transitions, slider bounds, floor visibility, component and system isolation, hiding/restoration, full reset, reduced motion, guided tour completion, staged roof-first motion, exact no-drift explosion, unchanged orientation, reproducible generation, unique IDs/valid parents, clear atrium floor plates and sourced metadata.
- **Production Chrome 152.0.7977.65**: assembled/exploded rendering, multiple scrubs with a byte-level hash of the actual instanced transform buffers before and after reset, section position, floor controls, search and selection, framing, isolation, related-system filtering, hiding and restoration, both interior presets, all tour stops, the fictional market lesson, pointer cancellation of rotation, keyboard camera control, reduced motion, the text catalogue and return to 3D.
- **390 × 844 Chrome touch emulation**: no horizontal document overflow, touch controls, searchable anatomy sheet, heritage selection, information sheet and cutaway controls.
- **WebGL-unavailable simulation**: the searchable catalogue and component information remain accessible when WebGL context creation is unavailable.
- **WebKit 26.0, 1024 × 1366 touch viewport**: rendering, full explosion, section reassembly, floors, service-pod search/selection, isolation, framing and reset passed with no page errors. This is a Safari-engine check on macOS, not testing on physical iPad hardware.
- **Final focused checks** passed for each on-scene market hotspot, the adjusted Underwriting Room viewpoint, and recovery after a real `WEBGL_lose_context` event using the Retry action.
- **Production build and TypeScript** passed. The full Chrome pass reported **no page errors and no failed asset requests**.

`output/playwright/results.json` and `output/playwright/webkit-results.json` contain raw results from local runs; this generated output is ignored by Git. `scripts/browser-check.mjs` and `scripts/webkit-check.mjs` reproduce the checks. Additional visual/context-loss checks are in `scripts/final-visual-check.mjs`.

## Measured performance

After a 1.5-second settling period, each sample counted actual rendered frames over approximately 3.5 seconds of assembled auto-rotation. The renderer was ANGLE Metal on Apple M4 Pro.

| Configuration                              | Render DPR | Rendered fps | 95th percentile animation-frame interval |
| ------------------------------------------ | ---------: | -----------: | ---------------------------------------: |
| Chrome, 1440 × 1000, Retina context        |        1.5 |         60.2 |                                  16.8 ms |
| Chrome touch viewport emulation, 390 × 844 |        1.0 |         60.3 |                                  16.7 ms |

The measured assembled scene used 28 main-pass draw calls and approximately 634,000 triangles. Shadow rendering adds work beyond the reported main-pass draw-call count. Idle scenes render on demand; these are active-interaction measurements, not idle fps claims. Shader compilation and model generation are excluded from the settled rotation sample.

These short measurements do not guarantee 60 fps across devices. Physical iPhone/iPad thermals, mobile GPUs, low-end devices, long sessions and real Safari touch gestures still need device testing. Initialisation and exploding all instances cost more than steady-state orbiting. The app limits DPR and can reduce it when active frame samples are slow.

## Visual inspection and known limits

Assembled, exploded, cutaway, floor, interior, selection and mobile screenshots were inspected. The original restrained explosion was revised after user feedback: separate service assemblies, wider offsets, four roof sections, larger gallery gaps and automatic expanded framing. Additional close-up references informed stair shells, service pods, ladders, pipe bends, collars, landing supports and façade/roof details.

The model remains an approximation, not a surveyed reconstruction. Some real architectural details remain absent, including the retained historic entrance, full basement levels, Adam Room, complete upper-office furnishings and concealed services. Furniture, escalator geometry and heritage ornament are representative. The vertical section is not capped, and does not provide dimensioned construction drawings. Transparency uses sorted conventional PBR surfaces, not full multi-layer refractive simulation.

No public deployment or physical-device performance certification was performed. The static production output is ready for Vercel using the committed configuration and lockfile.
