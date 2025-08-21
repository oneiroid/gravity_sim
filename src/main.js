import { SpaceCurvatureSimulation } from './simulation.js';
import { config } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const simulation = new SpaceCurvatureSimulation(config);
    window.simulation = simulation; // Expose to global scope for onclick in HTML
});