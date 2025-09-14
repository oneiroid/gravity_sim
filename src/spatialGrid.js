export class SpatialGrid {
    // A lightweight loose octree implementation tuned for neighbor queries.
    // boundarySize: half-size of root cubic bounding box
    // minSize: minimum node half-size (roughly controls depth)
    constructor(boundarySize, minSize) {
        this.boundarySize = boundarySize;
        this.minSize = Math.max(1, minSize || 8);
        this.root = new OctreeNode({ x: 0, y: 0, z: 0 }, boundarySize, this.minSize);
        this._bodyNodeMap = new Map();
    }

    add(body) {
        const inserted = this.root.insert(body);
        if (inserted) this._bodyNodeMap.set(body.id, inserted);
    }

    remove(body) {
        const node = this._bodyNodeMap.get(body.id);
        if (node) {
            node.removeBody(body.id);
            this._bodyNodeMap.delete(body.id);
        }
    }

    update(body, /* oldPosition */) {
        // Remove then re-insert based on new position for simplicity
        this.remove(body);
        this.add(body);
    }

    getNearby(body) {
        const center = body.mesh.position;
        const bodyRadius = (body.mesh.geometry && body.mesh.geometry.parameters && body.mesh.geometry.parameters.radius) || 1;
        // search radius is heuristic: a few times the body radius
        const searchRadius = Math.max(this.minSize * 1.5, bodyRadius * 4);
        const results = [];
        this.root.querySphere(center, searchRadius, results);
        return results.filter(b => b.id !== body.id);
    }

    clear() {
        this.root = new OctreeNode({ x: 0, y: 0, z: 0 }, this.boundarySize, this.minSize);
        this._bodyNodeMap.clear();
    }
}

class OctreeNode {
    constructor(center, halfSize, minSize) {
        this.center = center; // {x,y,z}
        this.half = halfSize; // half-size of cubic node
        this.minSize = minSize;
        this.bodies = [];
        this.children = null; // array of 8 children or null
        this.capacity = 8; // how many bodies before subdivide
    }

    containsPoint(point) {
        return Math.abs(point.x - this.center.x) <= this.half &&
               Math.abs(point.y - this.center.y) <= this.half &&
               Math.abs(point.z - this.center.z) <= this.half;
    }

    insert(body) {
        const p = body.mesh.position;
        if (!this.containsPoint(p)) return null;

        if (!this.children && (this.bodies.length < this.capacity || this.half * 2 <= this.minSize)) {
            this.bodies.push(body);
            return this;
        }

        if (!this.children) this.subdivide();

        for (const child of this.children) {
            const inserted = child.insert(body);
            if (inserted) return inserted;
        }

        // If none of the children contain the point (edge case), keep it here.
        this.bodies.push(body);
        return this;
    }

    removeBody(bodyId) {
        this.bodies = this.bodies.filter(b => b.id !== bodyId);
        if (this.children) {
            for (const child of this.children) child.removeBody(bodyId);
        }
    }

    subdivide() {
        const h = this.half / 2;
        const centers = [];
        for (let dx of [-1, 1]) for (let dy of [-1, 1]) for (let dz of [-1, 1]) {
            centers.push({ x: this.center.x + dx * h, y: this.center.y + dy * h, z: this.center.z + dz * h });
        }
        this.children = centers.map(c => new OctreeNode(c, h, this.minSize));

        // move existing bodies into children where possible
        const old = this.bodies;
        this.bodies = [];
        for (const b of old) {
            let placed = false;
            for (const child of this.children) {
                if (child.containsPoint(b.mesh.position)) { child.bodies.push(b); placed = true; break; }
            }
            if (!placed) this.bodies.push(b);
        }
    }

    // Query for bodies within a sphere (center: THREE.Vector3-like, radius number)
    querySphere(center, radius, out) {
        if (!boxIntersectsSphere(this.center, this.half, center, radius)) return;

        // check bodies in this node
        for (const b of this.bodies) {
            const d2 = distanceSquaredVec(b.mesh.position, center);
            if (d2 <= radius * radius) out.push(b);
        }

        if (this.children) {
            for (const child of this.children) child.querySphere(center, radius, out);
        }
    }
}

function distanceSquaredVec(a, b) {
    const dx = a.x - b.x; const dy = a.y - b.y; const dz = a.z - b.z;
    return dx*dx + dy*dy + dz*dz;
}

function boxIntersectsSphere(boxCenter, half, sphereCenter, radius) {
    // compute squared distance from sphere center to AABB
    let dmin = 0;
    const minX = boxCenter.x - half, maxX = boxCenter.x + half;
    const minY = boxCenter.y - half, maxY = boxCenter.y + half;
    const minZ = boxCenter.z - half, maxZ = boxCenter.z + half;

    if (sphereCenter.x < minX) dmin += (sphereCenter.x - minX) ** 2;
    else if (sphereCenter.x > maxX) dmin += (sphereCenter.x - maxX) ** 2;

    if (sphereCenter.y < minY) dmin += (sphereCenter.y - minY) ** 2;
    else if (sphereCenter.y > maxY) dmin += (sphereCenter.y - maxY) ** 2;

    if (sphereCenter.z < minZ) dmin += (sphereCenter.z - minZ) ** 2;
    else if (sphereCenter.z > maxZ) dmin += (sphereCenter.z - maxZ) ** 2;

    return dmin <= radius * radius;
}