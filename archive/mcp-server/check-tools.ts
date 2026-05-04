import { findUnassignedToolNames } from './src/product-tiers.js';

const unassigned = findUnassignedToolNames();
console.log('Unassigned tool names:', unassigned);
console.log('Count:', unassigned.length);