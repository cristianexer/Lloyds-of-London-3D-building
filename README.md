# Inside Lloyd’s

An independent, static architectural explorer of Lloyd’s of London at One Lime Street. Built with React, TypeScript, Vite, React Three Fiber, Drei and Zustand. No backend, login, runtime AI, API key or remote media service is required.

## Run locally

Node.js **22.16 or later** recommended. Package versions are pinned and the npm lockfile is included.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite, normally `http://localhost:5173`.

```sh
npm test             # Core state, model and explosion invariants
npm run build        # Regenerates metadata, checks TypeScript, produces dist/
npm run preview      # Serve the production build
```

## Explore

- Orbit with a drag; pan with right-drag or two fingers; zoom with the wheel or a pinch.
- Use **Exterior** to scrub the assembled/exploded model. Roof sections lift, façades move away, service assemblies separate and galleries spread. The camera expands its framing with the diagram.
- **Cutaway** moves a vertical section through the building. **Floors** hides levels above the chosen gallery. Both reassemble first and make explosion unavailable explicitly.
- Search **Building anatomy**, expand a system and assembly, or click/tap a rendered part. The information panel provides geometry status, purpose and source links.
- **Frame**, **Isolate**, **Hide**, **Related system** and **Restore all** work with component, assembly or system IDs. **Reset view** restores the model and camera together.
- The six-stop guided tour is skippable. Camera presets include exterior elevations, the roof, atrium and Underwriting Room.
- **Inside the market** offers a fictional placement journey and a separate explanation of organisational relationships. Select the on-scene hotspots or the equivalent panel controls.
- Focus the canvas to use arrow-key orbit, `+` / `−` zoom and `Home` reset. `/` focuses search. All essential component actions are also available in the text catalogue.
- Reduced motion follows the system preference and can be toggled. The text catalogue remains usable when WebGL is unavailable or its context is lost.

## Model and provenance

The model is generated locally by [`src/model/building.ts`](src/model/building.ts). It contains **approximately 17,000 individually addressable elements**, **34 assemblies** and **seven systems**, rendered in instanced batches. Counts describe selectable model details, not a count of real building parts.

```sh
npm run model:manifest
```

This reproduces the complete logical **Building → System → Assembly → Component** tree in `public/data/components.json` and source records in `public/data/sources.json`. Building generation also runs directly in the app; no GLB download is needed. Rendering batches do not erase the logical hierarchy or instance IDs.

- [`public/asset-manifest.json`](public/asset-manifest.json): assets, attribution, licence information and rejected asset-search candidate.
- [`docs/RESEARCH.md`](docs/RESEARCH.md): primary sources and modelling decisions.
- [`docs/INTERACTIONS.md`](docs/INTERACTIONS.md): state, visibility, animation and rendering contracts.
- [`docs/TESTING.md`](docs/TESTING.md): checks, measured performance and limitations.

The exterior, footprint, orientation, service routes and dimensions are **approximate reference-based reconstructions**. Interior furniture, stair/escalator details and the Rostrum/Bell are illustrative. The model does not reproduce current box allocations or serve as a surveyed digital twin. No supplied reference photographs are redistributed. Lloyd’s is represented as an insurance marketplace, not a bank or a single insurer.

## Browser verification

The repository includes reproducible Playwright checks. Start the dev server or production preview in another terminal first. The Chrome check uses the installed Google Chrome application; install Chrome if absent.

```sh
npm run test:browser
npx playwright install webkit
node scripts/webkit-check.mjs
```

Set `TEST_URL` to test another local/deployed address. Screenshots and JSON results go to ignored `output/playwright/`. Core tests do not require a browser. A production check can use `TEST_URL=http://localhost:4173 npm run test:browser` after `npm run preview`.

## Deploy to Vercel

Import this repository into Vercel and use the **Vite** preset. `vercel.json` supplies the build command (`npm run build`) and output directory (`dist`). No environment variables or server functions are needed. Alternatively, upload `dist/` to any static web host. All runtime assets are local build outputs.

No public deployment is created by this implementation.

## Source layout

```text
src/model/          Pure procedural geometry, hierarchy, types and explosion maths
src/data/           Structured public sources
src/store.ts        Central interaction state and visibility rules
src/components/     Instanced scene, camera, panels, tour and market lesson
scripts/            Metadata exporter and repeatable browser checks
tests/              Core interaction and model invariants
public/             Favicon, asset manifest and generated catalogue
```

`npm run format` formats source and documentation. There are no photographic textures to fetch, no CDN font requests, and no unlicensed imported building meshes.
