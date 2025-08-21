import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
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

    // Initialize UI elements with config values
    speedSlider.min = config.controls.speed.min;
    speedSlider.max = config.controls.speed.max;
    speedSlider.value = config.controls.speed.initial;
    speedSlider.step = config.controls.speed.step;
    speedValue.textContent = `${config.controls.speed.initial.toFixed(1)}x`;

    gravitySlider.min = config.controls.gravity.min;
    gravitySlider.max = config.controls.gravity.max;
    gravitySlider.value = config.controls.gravity.initial;
    gravitySlider.step = config.controls.gravity.step;
    gravityValue.textContent = config.controls.gravity.initial.toFixed(1);

    massInput.min = config.controls.mass.min;
    massInput.max = config.controls.mass.max;
    massInput.value = config.controls.mass.initial;

    cachedElements.speedSlider.addEventListener('input', (e) => {
        simulation.simulationSpeed = parseFloat(e.target.value);
        cachedElements.speedValue.textContent = `${simulation.simulationSpeed.toFixed(1)}x`;
    });

    cachedElements.gravitySlider.addEventListener('input', (e) => {
        simulation.G = parseFloat(e.target.value);
        cachedElements.gravityValue.textContent = simulation.G.toFixed(1);
    });

    cachedElements.pauseBtn.addEventListener('click', () => {
        simulation.isPaused = !simulation.isPaused;
        cachedElements.pauseBtn.textContent = simulation.isPaused ? '▶️ Play' : '⏸️ Pause';
    });

    cachedElements.resetBtn.addEventListener('click', () => {
        simulation.reset();
    });

    cachedElements.addBodyBtn.addEventListener('click', () => {
        const mass = parseInt(cachedElements.massInput.value);
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle);
        const z = Math.sin(angle);
        const y = (Math.random() - 0.5) * 20;
        
        const newBody = simulation.addBody(x, y, z, mass);
        // Give it some initial velocity for orbital motion
        const speed = Math.sqrt(simulation.bodies[0].mass) * 0.3;
        newBody.velocity.set(-Math.sin(angle) * speed, 0, Math.cos(angle) * speed);
    });

    // Mouse controls for camera
    let isRotating = false;
    let isPanning = false;
    
    simulation.renderer.domElement.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left mouse button
            isRotating = true;
        } else if (e.button === 2) { // Right mouse button
            isPanning = true;
            e.preventDefault();
        }
        simulation.previousMouse = { x: e.clientX, y: e.clientY };
    });

    simulation.renderer.domElement.addEventListener('mousemove', debounce((e) => {
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
            const cameraRight = new THREE.Vector3();
            const cameraUp = new THREE.Vector3();
            simulation.camera.getWorldDirection(cameraRight);
            cameraRight.cross(simulation.camera.up).normalize();
            cameraUp.crossVectors(cameraRight, simulation.camera.getWorldDirection(new THREE.Vector3())).normalize();
            
            simulation.cameraTarget.add(cameraRight.multiplyScalar(-deltaX * config.controls.panSpeed));
            simulation.cameraTarget.add(cameraUp.multiplyScalar(deltaY * config.controls.panSpeed));
            
            simulation.updateCameraPosition();
        }
        simulation.previousMouse = { x: e.clientX, y: e.clientY };
    }, config.controls.mouseMoveDebounce)); // Debounce mousemove

    simulation.renderer.domElement.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            isRotating = false;
        } else if (e.button === 2) {
            isPanning = false;
        }
    });

    // Prevent right-click context menu
    simulation.renderer.domElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    simulation.renderer.domElement.addEventListener('wheel', debounce((e) => {
        e.preventDefault();
        simulation.cameraDistance = Math.max(20, Math.min(200, simulation.cameraDistance + e.deltaY * 0.1));
        simulation.updateCameraPosition();
    }, config.controls.wheelDebounce)); // Debounce wheel
}