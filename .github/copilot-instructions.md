<!-- Short, focused instructions for AI coding agents working on this repo -->
# Copilot / AI Agent Instructions — gravity_sim

This repository implements a browser-based n-body gravity simulator using Three.js. The goal of this file is to give concise, actionable guidance to an AI agent so it can make correct, small-to-medium sized code changes without breaking the visual simulation.

- Project entrypoint: `src/main.js` instantiates `SpaceCurvatureSimulation` from `src/simulation.js` using `config` from `src/config.js`. Follow this call chain when making changes to initialization and wiring.
- Major components:
  - `src/simulation.js` — main application class: scene, camera, renderer, bodies array, physics loop (`animate` -> `updatePhysics`). Primary place for simulation lifecycle and global state (G, boundarySize, simulationSpeed).
  - `src/body.js` — `Body` class: visual `THREE.Mesh` + mass and velocity. Keep geometry/material creation consistent with current patterns (sphere radius derived from mass).
  - `src/spatialGrid.js` — lightweight octree for neighbor queries. Used for collision checks (`getNearby`) and to improve performance. When changing neighbor logic, update both `simulation.checkBodyCollisions` and `SpatialGrid.getNearby` semantics.
  - `src/controls.js` — DOM wiring, UI element ids, and camera input handling (mouse drag/pan/zoom). If you change UI ids, update HTML accordingly.
  - `src/utils.js` — collision resolution and boundary reflection. Physics math and numeric safeguards (softeningFactor, epsilon checks) live here.

- Important data flows & invariants:
  - Bodies are represented by `Body` instances whose `mesh.position` is authoritative for position. Update both `mesh.position` and `velocity` consistently.
  - `SpatialGrid` must be kept in sync: `addBody` calls `spatialGrid.add`; `removeBody` calls `spatialGrid.remove`; `updatePhysics` calls `spatialGrid.update(body, oldPosition)` after moving a body.
  - Camera state: `cameraDistance`, `cameraTheta`, `cameraPhi`, and `cameraTarget` in `SpaceCurvatureSimulation` control view — use `updateCameraPosition()` to apply changes.

- Project conventions and patterns:
  - Reusable temporary vectors are stored on the `SpaceCurvatureSimulation` instance (e.g. `tempForce`, `tempDirection`) to avoid GC churn. Prefer adding new temp vectors there rather than allocating in hot loops.
  - Many numeric constants live in `src/config.js` — change behavior by altering `config` where appropriate rather than hardcoding values.
  - UI elements are referenced by specific ids in `src/controls.js`: `speedSlider`, `gravitySlider`, `pauseBtn`, `resetBtn`, `addBodyBtn`, `massInput`, `container`, `bodyList`.
  - Physics uses small epsilon/safeguards (e.g. softeningFactor, checks for zero inverse mass). Preserve these when editing physics code.

- Build / run / debug notes:
  - This is a static client-side app. Open `index.html` in a modern browser (or use a static file server) to run. No build step is required.
  - If adding npm-based tooling or bundling, keep `three.module.js` as the included module or update imports consistently across files.

 - Project provenance / Gemini CLI:
   - This project was scaffolded/built using a Gemini CLI process (see `GEMINI.md`). Treat the repository as a static vanilla JS app — edits should preserve ES module imports and the local `three.module.js` file.
   - Recommended quick dev servers (pick one):
     - Python 3 built-in server:

       ```bash
       python -m http.server 8000
       ```

     - Node.js `http-server` (no install):

       ```bash
       npx http-server -c-1 . 8000
       ```

     - These avoid CORS/file protocol issues and are sufficient for local testing of `index.html`.

- Quick examples (do this when making edits):
  - To add a UI toggle that changes `config.simulation.softeningFactor`: add a slider in `index.html`, wire it in `src/controls.js` and set `simulation.config.simulation.softeningFactor = value` (or `simulation.config` is imported as shared config).
  - To add a new body property that affects rendering (e.g. `temperature` -> emissive color): add the field on `Body`, update material creation in `src/body.js`, and update `updateBodyList()` in `src/simulation.js` to reflect the UI.

- Safety & non-goals for agents:
  - Do not change DOM ids or HTML structure unless editing `index.html` and `style.css` together — tests and UI code expect specific ids.
  - Avoid changing numeric semantics silently (e.g. mass sign, inverse mass calculations). If a change is required, add a short comment explaining the rationale and a small test case (manual or automated) in the repo.

Files to inspect when making changes: `src/simulation.js`, `src/config.js`, `src/spatialGrid.js`, `src/utils.js`, `src/controls.js`, `index.html`, `style.css`.

If anything in this file is unclear or you need additional examples (e.g. preferred unit tests, linting rules, or recommended local server commands), ask and I will extend these instructions.
