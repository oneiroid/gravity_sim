import * as THREE from './three.module.js';
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
    // Only move non-static bodies. Use absolute masses to compute ratios and guard against zero.
    const absMassA = Math.abs(bodyA.mass);
    const absMassB = Math.abs(bodyB.mass);
    const absTotalMass = absMassA + absMassB;
    let moveA = overlap * 0.5;
    let moveB = overlap * 0.5;
    if (absTotalMass > 1e-9) {
        moveA = overlap * (absMassB / absTotalMass) * 0.5;
        moveB = overlap * (absMassA / absTotalMass) * 0.5;
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

    // Don't resolve if velocities are separating (moving apart)
    if (velocityAlongNormal > 0) return;

    // Calculate restitution (bounciness)
    const restitution = config.bodies.restitution;

    // Calculate impulse scalar (numerator)
    let impulseScalar = -(1 + restitution) * velocityAlongNormal;

    // Compute total inverse mass, guarding against zero/negative masses
    let totalInverseMass = 0;
    if (!bodyA.isStatic && Math.abs(bodyA.mass) > 1e-9) totalInverseMass += 1 / Math.abs(bodyA.mass);
    if (!bodyB.isStatic && Math.abs(bodyB.mass) > 1e-9) totalInverseMass += 1 / Math.abs(bodyB.mass);

    if (totalInverseMass <= 1e-9) {
        // Can't apply impulse sensibly (very heavy or zero-mass bodies) — bail out
        return;
    }

    impulseScalar /= totalInverseMass;

    // Apply impulse along the collision normal
    tempImpulse.copy(tempSeparationVector).multiplyScalar(impulseScalar);

    if (!bodyA.isStatic && Math.abs(bodyA.mass) > 1e-9) {
        bodyA.velocity.add(tempImpulse.clone().multiplyScalar(-1 / Math.abs(bodyA.mass)));
    }
    if (!bodyB.isStatic && Math.abs(bodyB.mass) > 1e-9) {
        bodyB.velocity.add(tempImpulse.clone().multiplyScalar(1 / Math.abs(bodyB.mass)));
    }
}

export function checkBoundaryCollisions(body, boundarySize) {
    // Spherical boundary collision: reflect velocity when a body exceeds the sphere radius
    const pos = body.mesh.position;
    const vel = body.velocity;
    const radius = body.mesh.geometry.parameters.radius;
    const damping = config.bodies.damping; // Energy loss on bounce

    const distFromCenter = pos.length();
    const allowed = boundarySize - radius;

    if (distFromCenter > allowed) {
        // Use a unit normal for calculations; avoid mutating it before dot()
        const unitNormal = pos.clone().normalize();

        // Compute velocity component along the normal using the unit normal
        const vDotN = vel.dot(unitNormal);

        // Reflect velocity across the normal: v' = v - 2*(v·n)*n
        const reflected = vel.clone().sub(unitNormal.clone().multiplyScalar(2 * vDotN));

        // Apply damping to reduce kinetic energy
        vel.copy(reflected.multiplyScalar(damping));

        // Project position back to the allowed surface along the radial direction
        pos.copy(unitNormal.multiplyScalar(allowed));
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
