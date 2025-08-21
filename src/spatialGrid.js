export class SpatialGrid {
    constructor(boundarySize, cellSize) {
        this.boundarySize = boundarySize;
        this.cellSize = cellSize;
        this.grid = {}; // Stores cells, e.g., { 'x_y_z': [body1, body2] }
    }

    // Converts world coordinates to grid coordinates
    toGridCoords(position) {
        const x = Math.floor((position.x + this.boundarySize) / this.cellSize);
        const y = Math.floor((position.y + this.boundarySize) / this.cellSize);
        const z = Math.floor((position.z + this.boundarySize) / this.cellSize);
        return `${x}_${y}_${z}`;
    }

    // Adds a body to the grid
    add(body) {
        const key = this.toGridCoords(body.mesh.position);
        if (!this.grid[key]) {
            this.grid[key] = [];
        }
        this.grid[key].push(body);
    }

    // Removes a body from the grid
    remove(body) {
        const key = this.toGridCoords(body.mesh.position);
        if (this.grid[key]) {
            this.grid[key] = this.grid[key].filter(b => b.id !== body.id);
            if (this.grid[key].length === 0) {
                delete this.grid[key];
            }
        }
    }

    // Updates a body's position in the grid
    update(body, oldPosition) {
        const oldKey = this.toGridCoords(oldPosition);
        const newKey = this.toGridCoords(body.mesh.position);

        if (oldKey !== newKey) {
            this.remove(body);
            this.add(body);
        }
    }

    // Gets potential neighbors for a body
    getNearby(body) {
        const neighbors = new Set();
        const currentKey = this.toGridCoords(body.mesh.position);
        const [cx, cy, cz] = currentKey.split('_').map(Number);

        // Check current cell and 26 surrounding cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const key = `${cx + dx}_${cy + dy}_${cz + dz}`;
                    if (this.grid[key]) {
                        this.grid[key].forEach(b => {
                            if (b.id !== body.id) {
                                neighbors.add(b);
                            }
                        });
                    }
                }
            }
        }
        return Array.from(neighbors);
    }

    // Clears the entire grid
    clear() {
        this.grid = {};
    }
}