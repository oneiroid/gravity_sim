import * as THREE from './three.module.js';

export class Body {
    constructor(x, y, z, mass, color, isStatic = false) {
        this.isStatic = isStatic;
        this.id = Date.now() + Math.random();
        this.mass = mass;
        this.velocity = new THREE.Vector3(0, 0, 0);

        const radius = Math.max(1, Math.abs(mass) ** .7 / 15.);
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshPhongMaterial({ 
            color: color,
            shininess: 30,
            specular: 0x888888
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
    }
}