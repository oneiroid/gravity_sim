import * as THREE from './three.module.js';
import { debounce } from './utils.js';
import { config } from './config.js';

export function setupControls(simulation) {
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const gravitySlider = document.getElementById('gravitySlider');
    const gravityValue = document.getElementById('gravityValue');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const addBodyBtn = document.getElementById('addBodyBtn');
    const massInput = document.getElementById('massInput');

    // Cache DOM elements
    const cachedElements = {
        speedSlider, speedValue, gravitySlider, gravityValue,
        pauseBtn, resetBtn, addBodyBtn, massInput,
        container: document.getElementById('container'),
        bodyList: document.getElementById('bodyList')
    };

    // Initialize UI elements with config values (guard missing elements)
    if (speedSlider && speedValue) {
        speedSlider.min = config.controls.speed.min;
        speedSlider.max = config.controls.speed.max;
        speedSlider.value = config.controls.speed.initial;
        speedSlider.step = config.controls.speed.step;
        speedValue.textContent = `${config.controls.speed.initial.toFixed(1)}x`;
    }

    if (gravitySlider && gravityValue) {
        gravitySlider.min = config.controls.gravity.min;
        gravitySlider.max = config.controls.gravity.max;
        gravitySlider.value = config.controls.gravity.initial;
        gravitySlider.step = config.controls.gravity.step;
        gravityValue.textContent = config.controls.gravity.initial.toFixed(1);
    }

    if (massInput) {
        massInput.min = config.controls.mass.min;
        massInput.max = config.controls.mass.max;
        massInput.value = config.controls.mass.initial;
    }

    if (cachedElements.speedSlider) {
        cachedElements.speedSlider.addEventListener('input', (e) => {
            simulation.simulationSpeed = parseFloat(e.target.value);
            if (cachedElements.speedValue) cachedElements.speedValue.textContent = `${simulation.simulationSpeed.toFixed(1)}x`;
        });
    }

    if (cachedElements.gravitySlider) {
        cachedElements.gravitySlider.addEventListener('input', (e) => {
            simulation.G = parseFloat(e.target.value);
            if (cachedElements.gravityValue) cachedElements.gravityValue.textContent = simulation.G.toFixed(1);
        });
    }

    if (cachedElements.pauseBtn) {
        cachedElements.pauseBtn.addEventListener('click', () => {
            simulation.isPaused = !simulation.isPaused;
            cachedElements.pauseBtn.textContent = simulation.isPaused ? '\u25b6\ufe0f Play' : '\u23f8\ufe0f Pause';
        });
    }

    if (cachedElements.resetBtn) {
        cachedElements.resetBtn.addEventListener('click', () => {
            simulation.reset();
        });
    }

    if (cachedElements.addBodyBtn) {
        cachedElements.addBodyBtn.addEventListener('click', () => {
            const mass = parseInt(cachedElements.massInput.value) || config.controls.mass.initial;
            const angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * 10; // spawn a bit away from center
            const z = Math.sin(angle) * 10;
            const y = (Math.random() - 0.5) * 20;

            const newBody = simulation.addBody(x, y, z, mass);
            // Give it some initial velocity for orbital motion using a reference body if present
            if (simulation.bodies.length > 1) {
                const referenceMass = Math.max(1, Math.abs(simulation.bodies[0].mass));
                const speed = Math.sqrt(referenceMass) * 0.3;
                newBody.velocity.set(-Math.sin(angle) * speed, 0, Math.cos(angle) * speed);
            }
        });
    }

    // Mouse controls for camera
    let isRotating = false;
    let isPanning = false;
    const _cameraRight = new THREE.Vector3();
    const _cameraUp = new THREE.Vector3();
    const _tmpDir = new THREE.Vector3();

    const canvas = simulation.renderer && simulation.renderer.domElement;
    if (!canvas) return;

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left mouse button
            isRotating = true;
        } else if (e.button === 2) { // Right mouse button
            isPanning = true;
            e.preventDefault();
        }
        simulation.previousMouse = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', debounce((e) => {
        if (!simulation.previousMouse) simulation.previousMouse = { x: e.clientX, y: e.clientY };
        if (isRotating) {
            const deltaX = e.clientX - simulation.previousMouse.x;
            const deltaY = e.clientY - simulation.previousMouse.y;

            simulation.cameraTheta += deltaX * 0.01;
            simulation.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, simulation.cameraPhi + deltaY * 0.01));

            simulation.updateCameraPosition();
        } else if (isPanning) {
            const deltaX = e.clientX - simulation.previousMouse.x;
            const deltaY = e.clientY - simulation.previousMouse.y;

            // Calculate pan direction relative to camera orientation
            simulation.camera.getWorldDirection(_tmpDir);
            _cameraRight.copy(_tmpDir).cross(simulation.camera.up).normalize();
            _cameraUp.copy(simulation.camera.up).normalize();

            simulation.cameraTarget.add(_cameraRight.multiplyScalar(-deltaX * config.controls.panSpeed));
            simulation.cameraTarget.add(_cameraUp.multiplyScalar(deltaY * config.controls.panSpeed));

            simulation.updateCameraPosition();
        }
        simulation.previousMouse = { x: e.clientX, y: e.clientY };
    }, config.controls.mouseMoveDebounce)); // Debounce mousemove

    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            isRotating = false;
        } else if (e.button === 2) {
            isPanning = false;
        }
    });

    // Prevent right-click context menu
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('wheel', debounce((e) => {
        e.preventDefault();
        simulation.cameraDistance = Math.max(20, Math.min(200, simulation.cameraDistance + e.deltaY * 0.1));
        simulation.updateCameraPosition();
    }, config.controls.wheelDebounce)); // Debounce wheel
}