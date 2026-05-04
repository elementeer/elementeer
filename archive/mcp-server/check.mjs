import { FREE_PRODUCT_SURFACE } from './dist/product-surfaces.js';
import { TOOL_TIER_ASSIGNMENTS } from './dist/product-tiers.js';

const freeFromAssignments = TOOL_TIER_ASSIGNMENTS.filter(a => a.tier === 'free').map(a => a.id);
console.log('Free from assignments:', freeFromAssignments.length);
const primary = FREE_PRODUCT_SURFACE.primaryTools;
console.log('Primary tools:', primary.length);
const missingInPrimary = freeFromAssignments.filter(id => !primary.includes(id));
const extraInPrimary = primary.filter(id => !freeFromAssignments.includes(id));
console.log('Missing in primary:', missingInPrimary);
console.log('Extra in primary:', extraInPrimary);
if (missingInPrimary.length === 0 && extraInPrimary.length === 0) {
  console.log('OK');
} else {
  console.log('Mismatch');
}