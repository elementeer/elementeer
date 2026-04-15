import { findUnassignedToolNames } from './src/product-tiers.js';

const unassigned = findUnassignedToolNames();
console.log('Unassigned tool names:', unassigned);
if (unassigned.length === 0) {
  console.log('✅ All tools are assigned.');
  process.exit(0);
} else {
  console.error('❌ Found unassigned tools:', unassigned);
  process.exit(1);
}