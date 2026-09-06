# Interaction contract

The Zustand store is the sole source of interaction state. Per-frame Three.js changes stay out of React state.

- **Exterior:** supports 0–100% staged explosion and façade opacity. Camera framing expands smoothly along the current orbit when explosion changes.
- **Cutaway:** reassembles and clears filters. A vertical plane moves from the Lime Street side through the model. Closed convex solids receive geometric section faces derived from their transformed mesh intersections. Glazing and hollow/open casings are excluded so they do not acquire invented solid infill. Faces retain component IDs for selection; this is a visual section, not a construction drawing. Clipped faces do not consume selection events.
- **Floors:** reassembles and clears filters. Geometry assigned to levels above the chosen gallery can be hidden or rendered in faint, non-interactive ghost batches. Hiding and isolation filters apply to both. Switching this option reframes the camera for the appropriate visible extent. Elements crossing a level boundary belong to their declared model level. Camera targets the visible floor stack.
- **Market:** reassembles, shows the illustrative ground-floor setting and provides a fictional placement/organisation lesson. No live market feed.
- **Interior camera presets:** use a reassembled near-complete section to avoid looking into a half-clipped atrium. They are curated viewpoints, not unrestricted first-person navigation.
- **Isolate / Hide / Related system:** operate on stable component, assembly or system IDs. Restore all clears both visibility filters. Reset also clears selection, explosion, rotation, tour, custom camera and opacity.
- **Tour:** six manually advanced, skippable camera stops. Completion restores the assembled exterior.

## Deterministic explosion

Every part keeps immutable base position, rotation, scale, staged direction and offset. `positionAt(part, fraction)` derives the target from that base on every update. It never adds a delta to an existing object transform. Temporal smoothing approaches the target and snaps exactly at a small threshold; reduced motion jumps directly to it.

At full separation the vault opens into four longitudinal sections and rises 68 model units; the end screens separate independently. Façades move outwards, towers travel 38 units laterally, and the stair shells, service pods, risers, plant rooms and lift assemblies have distinct offsets. Galleries spread by an additional 5.4 units per level. These offsets explain relationships; they do not describe a real dismantling sequence.

## Rendering and accessibility

Repeated parts are grouped into instanced draw batches with stable IDs; selection maps `instanceId` back to component metadata. The logical Building → System → Assembly → Component tree is exported as JSON, independent of draw batching. Colour, clipping and visibility are updated in those batches.

Rendering is demand-driven; only camera movement, rotation, visual state changes and animation request frames. Background tabs use `frameloop="never"`. DPR starts at 1 on compact displays and at most 1.5 on desktop, reducing to 1 if the initial active frame sample is slower than 32 fps. There are no external model, texture, font or HDRI requests.

The text catalogue contains the same hierarchy, geometry status, educational content and sources without requiring Canvas. WebGL failure or context loss exposes it; retry is available. Keyboard controls and reduced motion are documented in the in-app help.

## Connection guides and section geometry

Six optional exploded-view guides show representative assembled-to-separated relationships. Each follows the same immutable component position and easing as the model. Labels select the corresponding assembly; they disappear when assembled or filtered out. They are educational guide lines, not real physical cables or joints.

Section preparation is cached while Cutaway is mounted. Candidate solid bounds reject non-intersections before triangle-edge intersections are projected into the section plane, reduced to a convex hull and triangulated. Tests cover area, transformed geometry, tangency, filters and hollow/glass exclusions. The highlighted fill represents a cut through model solids, not actual building material layers.
