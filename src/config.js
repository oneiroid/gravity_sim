
import * as THREE from './three.module.js';

export const config = {
    // Camera settings
    camera: {
        fov: 75,
        near: 0.1,
        far: 1000,
        initialDistance: 100,
        initialTheta: 0,
        initialPhi: Math.PI / 4,
    },

    // Renderer settings
    renderer: {
        clearColor: 0x000511,
        shadowMap: {
            enabled: false,
            type: THREE.PCFSoftShadowMap,
        },
    },

    // Lighting settings
    lighting: {
        ambient: {
            color: 0x404040,
            intensity: 0.8,
        },
        directional: {
            color: 0xffffff,
            intensity: 0.8,
            position: new THREE.Vector3(50, 50, 50),
        },
    },

    // Simulation settings
    simulation: {
        boundarySize: 150,
        G: .7, // Gravitational constant
        initialSpeed: 1,
        deltaTime: 0.016, // Assuming 60 FPS
        spatialGridCellSize: 10,
        softeningFactor: .5, // Added softening factor for gravitational force
    },

    // Body settings
    bodies: {
        initial: [
            { mass: 1000, color: 0x1976d2, position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3(0, 5, 0) },
            { mass: 100, color: 0xf57c00, position: new THREE.Vector3(30, 0, 0), velocity: new THREE.Vector3(0, 5, 5) },
        ],
        defaultColors: [0x1976d2, 0xf57c00, 0x388e3c, 0xd32f2f, 0x7b1fa2, 0x00796b],
        restitution: 0.7,
        damping: 0.8,
    },

    // UI controls settings
    controls: {
        speed: {
            min: 0,
            max: 10,
            initial: 1,
            step: 0.1,
        },
        gravity: {
            min: -10,
            max: 10,
            initial: 1.,
            step: 0.5,
        },
        mass: {
            initial: 1000,
            min: -5000,
            max: 5000,
        },
        panSpeed: 0.1,
        mouseMoveDebounce: 10,
        wheelDebounce: 10,
    },
};
