# GEMINI Project Analysis

## Project Overview

This project is a web-based 3D gravity simulation that visualizes the curvature of space caused by massive objects. It's built using vanilla JavaScript, HTML, and CSS, with the Three.js library for 3D rendering. The simulation allows users to add and remove celestial bodies, adjust simulation parameters like gravity and speed, and interact with the 3D scene.

The application's entry point is `index.html`, which sets up the user interface and a canvas for the simulation. The core logic is modular, with different files handling specific aspects of the simulation:

- **`src/main.js`**: Initializes the simulation.
- **`src/simulation.js`**: The main simulation class that manages the scene, bodies, physics, and rendering loop.
- **`src/body.js`**: Defines the `Body` class, representing celestial objects in the simulation.
- **`src/controls.js`**: Manages user interactions with the simulation's controls, such as sliders and buttons.
- **`src/spatialGrid.js`**: Implements a spatial grid data structure to optimize collision detection between bodies.
- **`src/utils.js`**: Contains utility functions for physics calculations, including collision resolution and boundary checks.

## Building and Running

This is a client-side-only project. To run the simulation, you can simply open the `index.html` file in a modern web browser. No build process is required.

For development, it's recommended to use a local web server to avoid potential issues with browser security policies (e.g., CORS). You can use any simple web server, such as Python's built-in `http.server`:

```bash
python -m http.server
```

Or, if you have Node.js installed, you can use a package like `http-server`:

```bash
npx http-server
```

Once the server is running, you can access the simulation at `http://localhost:8000` (or the port specified by your server).

## Development Conventions

The project follows a modular, object-oriented approach. Key conventions include:

- **ES6 Modules**: The JavaScript code is organized into ES6 modules, with clear imports and exports.
- **Class-based Structure**: The core logic is encapsulated in classes, such as `SpaceCurvatureSimulation` and `Body`.
- **Separation of Concerns**: Different functionalities (e.g., simulation logic, UI controls, utility functions) are separated into their own files.
- **Three.js**: The project uses the Three.js library for all 3D rendering, following its standard practices for creating scenes, cameras, lights, and objects.
- **No External Dependencies (besides Three.js)**: The project is self-contained and does not rely on any external frameworks or libraries other than Three.js, which is included locally.
