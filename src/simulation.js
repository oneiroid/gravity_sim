import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { Body } from './body.js';
import { setupControls } from './controls.js';
import { resolveCollision, checkBoundaryCollisions } from './utils.js';
import { SpatialGrid } from './spatialGrid.js';

export class SpaceCurvatureSimulation {
    constructor(config) {
        this.config = config;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(this.config.camera.fov, window.innerWidth / window.innerHeight, this.config.camera.near, this.config.camera.far);
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        
        this.bodies = [];
        this.boundarySize = this.config.simulation.boundarySize;
        this.G = this.config.simulation.G; // Gravitational constant
        this.simulationSpeed = this.config.simulation.initialSpeed;
        this.isPaused = false;
        
        this.mouse = { x: 0, y: 0 };
        this.isDragging = false;
        this.previousMouse = { x: 0, y: 0 };
        this.cameraDistance = this.config.camera.initialDistance;
        this.cameraTheta = this.config.camera.initialTheta;
        this.cameraPhi = this.config.camera.initialPhi;
        this.cameraTarget = new THREE.Vector3(0, 0, 0);

        // Reusable vectors for physics calculations to minimize object creation
        this.tempForce = new THREE.Vector3();
        this.tempDirection = new THREE.Vector3();
        this.tempRelativeVelocity = new THREE.Vector3();
        this.tempSeparationVector = new THREE.Vector3();
        this.tempImpulse = new THREE.Vector3();
        this.tempVelocity = new THREE.Vector3();

        this.spatialGrid = new SpatialGrid(this.boundarySize, this.config.simulation.spatialGridCellSize); // Initialize spatial grid with a cell size
        
        this.init();
        this.createInitialBodies();
        setupControls(this); // Pass the simulation instance to controls
        this.animate();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(this.config.renderer.clearColor, 1);
        this.renderer.shadowMap.enabled = this.config.renderer.shadowMap.enabled;
        this.renderer.shadowMap.type = this.config.renderer.shadowMap.type;
        document.getElementById('container').appendChild(this.renderer.domElement);

        // Set initial camera position
        this.updateCameraPosition();

        // Add ambient and directional lighting
        const ambientLight = new THREE.AmbientLight(this.config.lighting.ambient.color, this.config.lighting.ambient.intensity);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(this.config.lighting.directional.color, this.config.lighting.directional.intensity);
        directionalLight.position.copy(this.config.lighting.directional.position);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Add bounding cube
        this.createBoundingCube();

        // Window resize listener
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    createBoundingCube() {
        const size = this.boundarySize * 2;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x64b5f6, 
            transparent: false, 
            opacity: 1.0 
        });
        const wireframe = new THREE.LineSegments(edges, material);
        this.scene.add(wireframe);
    }

    createInitialBodies() {
        this.config.bodies.initial.forEach(bodyConfig => {
            const body = this.addBody(bodyConfig.position.x, bodyConfig.position.y, bodyConfig.position.z, bodyConfig.mass, bodyConfig.color);
            body.velocity.copy(bodyConfig.velocity);
        });
    }

    addBody(x, y, z, mass, color = null, isStatic = false) {
        if (!color) {
            color = this.config.bodies.defaultColors[this.bodies.length % this.config.bodies.defaultColors.length];
        }

        const body = new Body(x, y, z, mass, color, isStatic);
        this.scene.add(body.mesh);
        this.bodies.push(body);
        this.spatialGrid.add(body); // Add body to spatial grid
        this.updateBodyList();
        return body;
    }

    removeBody(bodyId) {
        const index = this.bodies.findIndex(body => body.id === bodyId);
        if (index !== -1) {
            this.scene.remove(this.bodies[index].mesh);
            this.spatialGrid.remove(this.bodies[index]); // Remove body from spatial grid
            this.bodies.splice(index, 1);
            this.updateBodyList();
        }
    }

    checkBodyCollisions() {
        const processedPairs = new Set(); // To avoid duplicate collision checks

        for (let i = 0; i < this.bodies.length; i++) {
            const bodyA = this.bodies[i];
            const potentialNeighbors = this.spatialGrid.getNearby(bodyA);

            for (const bodyB of potentialNeighbors) {
                // Ensure each pair is processed only once
                const pairKey = bodyA.id < bodyB.id ? `${bodyA.id}-${bodyB.id}` : `${bodyB.id}-${bodyA.id}`;
                if (processedPairs.has(pairKey)) {
                    continue;
                }
                processedPairs.add(pairKey);

                const distance = bodyA.mesh.position.distanceTo(bodyB.mesh.position);
                const radiusA = bodyA.mesh.geometry.parameters.radius;
                const radiusB = bodyB.mesh.geometry.parameters.radius;
                const minDistance = radiusA + radiusB;
                
                if (distance < minDistance) {
                    resolveCollision(bodyA, bodyB, distance, minDistance, this.tempSeparationVector, this.tempRelativeVelocity, this.tempImpulse);
                }
            }
        }
    }

    updatePhysics(deltaTime) {
        if (this.isPaused) return;

        // Apply gravitational forces
        for (let i = 0; i < this.bodies.length; i++) {
            const bodyA = this.bodies[i];

            // If bodyA is static, it doesn't move or get affected by forces
            if (bodyA.isStatic) {
                continue; // Skip to the next body
            }

            this.tempForce.set(0, 0, 0); // Reset force vector for current body

            for (let j = 0; j < this.bodies.length; j++) {
                if (i !== j) {
                    const bodyB = this.bodies[j];
                    const distance = bodyA.mesh.position.distanceTo(bodyB.mesh.position);
                    
                    if (distance > 0.1) {
                        const forceMagnitude = (this.G * bodyA.mass * bodyB.mass) / (distance * distance + this.config.simulation.softeningFactor * this.config.simulation.softeningFactor);
                        this.tempDirection.subVectors(bodyB.mesh.position, bodyA.mesh.position).normalize();
                        
                        this.tempForce.add(this.tempDirection.multiplyScalar(forceMagnitude / bodyA.mass));
                    }
                }
            }

            // Update velocity and position
            const oldPosition = bodyA.mesh.position.clone(); // Store old position for grid update
            bodyA.velocity.add(this.tempForce.multiplyScalar(deltaTime * this.simulationSpeed));
            this.tempVelocity.copy(bodyA.velocity).multiplyScalar(deltaTime * this.simulationSpeed);
            bodyA.mesh.position.add(this.tempVelocity);

            // Check boundary collisions
            checkBoundaryCollisions(bodyA, this.boundarySize);

            // Update body in spatial grid if its cell has changed
            this.spatialGrid.update(bodyA, oldPosition);
        }

        // Check body-to-body collisions
        this.checkBodyCollisions();
    }

    updateCameraPosition() {
        const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
        const y = this.cameraDistance * Math.cos(this.cameraPhi);
        const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
        
        this.camera.position.set(
            x + this.cameraTarget.x, 
            y + this.cameraTarget.y, 
            z + this.cameraTarget.z
        );
        this.camera.lookAt(this.cameraTarget);
    }

    updateBodyList() {
        const bodyList = document.getElementById('bodyList');
        // Clear existing list items efficiently
        while (bodyList.firstChild) {
            bodyList.removeChild(bodyList.firstChild);
        }
        
        this.bodies.forEach((body, index) => {
            const item = document.createElement('div');
            item.className = 'body-item';
            item.innerHTML = `
                <span>Body ${index + 1} (m=${body.mass})</span>
                <label class="static-checkbox-container">
                    <input type="checkbox" ${body.isStatic ? 'checked' : ''} onchange="simulation.toggleBodyStatic(${body.id})"> Static
                </label>
                <button onclick="simulation.removeBody(${body.id})">🗑️</button>
            `;
            bodyList.appendChild(item);

            // Apply emissive color immediately if body is static
            if (body.isStatic) {
                body.mesh.material.emissive.setHex(0x050505);
            } else {
                body.mesh.material.emissive.setHex(0x000000);
            }
        });
    }

    reset() {
        // Clear all bodies
        // Clear all bodies and spatial grid
        this.bodies.forEach(body => this.scene.remove(body.mesh));
        this.bodies = [];
        this.spatialGrid.clear(); // Clear the spatial grid

        // Recreate initial setup
        this.createInitialBodies();
        this.isPaused = true;
        document.getElementById('pauseBtn').textContent = '⏸️ Pause';
    }

    toggleBodyStatic(bodyId) {
        const body = this.bodies.find(b => b.id === bodyId);
        if (body) {
            body.isStatic = !body.isStatic;
            // Optionally, change color or material to indicate static state
            if (body.isStatic) {
                body.mesh.material.emissive.setHex(0x050505); // Subtle glow for static
            } else {
                body.mesh.material.emissive.setHex(0x000000); // Remove glow
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.updatePhysics(this.config.simulation.deltaTime);
        this.renderer.render(this.scene, this.camera);
    }
}