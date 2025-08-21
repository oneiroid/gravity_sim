import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { config } from './config.js';

export function resolveCollision(bodyA, bodyB, distance, minDistance, tempSeparationVector, tempRelativeVelocity, tempImpulse) {
    // If both are static, no collision resolution needed
    if (bodyA.isStatic && bodyB.isStatic) return;

    // Separate the bodies first
    const overlap = minDistance - distance;
    tempSeparationVector.subVectors(bodyB.mesh.position, bodyA.mesh.position);
    
    // Handle case where bodies are at exactly the same position
    if (tempSeparationVector.length() === 0) {
        tempSeparationVector.set(1, 0, 0); // Default separation direction
    } else {
        tempSeparationVector.normalize();
    }
    
    // Move bodies apart proportionally to their masses (lighter body moves more)
    // Only move non-static bodies
    const totalMass = bodyA.mass + bodyB.mass;
    let moveA, moveB;

    if (totalMass === 0) { // Special case: masses cancel out, separate equally
        moveA = overlap * 0.5;
        moveB = overlap * 0.5;
    } else {
        // Use absolute masses for separation proportion to avoid issues with negative mass ratios
        const absMassA = Math.abs(bodyA.mass);
        const absMassB = Math.abs(bodyB.mass);
        const absTotalMass = absMassA + absMassB;

        if (absTotalMass === 0) { // Should not happen if not both static, but safeguard
            moveA = overlap * 0.5;
            moveB = overlap * 0.5;
        } else {
            moveA = overlap * (absMassB / absTotalMass) * 0.5;
            moveB = overlap * (absMassA / absTotalMass) * 0.5;
        }
    }
    
    if (!bodyA.isStatic) {
        bodyA.mesh.position.add(tempSeparationVector.clone().multiplyScalar(-moveA));
    }
    if (!bodyB.isStatic) {
        bodyB.mesh.position.add(tempSeparationVector.clone().multiplyScalar(moveB));
    }
    
    // Calculate collision response using conservation of momentum
    tempRelativeVelocity.subVectors(bodyB.velocity, bodyA.velocity);
    
    const velocityAlongNormal = tempRelativeVelocity.dot(tempSeparationVector);
    
    // Don't resolve if velocities are separating
    if (velocityAlongNormal > 0) return;
    
    // Calculate restitution (bounciness) - somewhat elastic
    const restitution = config.bodies.restitution;
    
    // Calculate impulse scalar
    let impulseScalar = -(1 + restitution) * velocityAlongNormal;
    
    // Adjust impulse scalar based on static bodies and handle problematic inverse masses
    let totalInverseMass = 0;
    if (!bodyA.isStatic) totalInverseMass += (1 / bodyA.mass);
    if (!bodyB.isStatic) totalInverseMass += (1 / bodyB.mass);

    // If totalInverseMass is zero or very close to zero, skip impulse application
    if (Math.abs(totalInverseMass) < 1e-9) { // Use a small epsilon for comparison
        return; 
    }
    
    impulseScalar /= totalInverseMass;
    
    // Apply impulse
    tempImpulse.copy(tempSeparationVector).multiplyScalar(impulseScalar);
    
    if (!bodyA.isStatic) {
        bodyA.velocity.add(tempImpulse.clone().multiplyScalar(-1/bodyA.mass));
    }
    if (!bodyB.isStatic) {
        bodyB.velocity.add(tempImpulse.clone().multiplyScalar(1/bodyB.mass));
    }
}

export function checkBoundaryCollisions(body, boundarySize) {
    const pos = body.mesh.position;
    const vel = body.velocity;
    const radius = body.mesh.geometry.parameters.radius;
    const damping = config.bodies.damping; // Energy loss on bounce

    // Check X boundaries
    if (pos.x + radius > boundarySize) {
        pos.x = boundarySize - radius;
        vel.x = -Math.abs(vel.x) * damping;
    } else if (pos.x - radius < -boundarySize) {
        pos.x = -boundarySize + radius;
        vel.x = Math.abs(vel.x) * damping;
    }

    // Check Y boundaries
    if (pos.y + radius > boundarySize) {
        pos.y = boundarySize - radius;
        vel.y = -Math.abs(vel.y) * damping;
    } else if (pos.y - radius < -boundarySize) {
        pos.y = -boundarySize + radius;
        vel.y = Math.abs(vel.y) * damping;
    }

    // Check Z boundaries
    if (pos.z + radius > boundarySize) {
        pos.z = boundarySize - radius;
        vel.z = -Math.abs(vel.z) * damping;
    } else if (pos.z - radius < -boundarySize) {
        pos.z = -boundarySize + radius;
        vel.z = Math.abs(vel.z) * damping;
    }
}

export function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}