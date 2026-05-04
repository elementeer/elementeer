const { TOOL_TIER_ASSIGNMENTS } = require('./dist/product-tiers.js');
const freeTools = TOOL_TIER_ASSIGNMENTS.filter(a => a.tier === 'free').map(a => a.id);
console.log('Total free tools:', freeTools.length);
const wizardTools = freeTools.filter(id => id.includes('wizard'));
console.log('Wizard tools:', wizardTools);
console.log('Missing wizard tools?');
const expectedWizards = [
  'wizard_elementskit',
  'wizard_essential_addons',
  'wizard_happy_addons',
  'wizard_powerpack',
  'wizard_premium_addons',
  'wizard_the_plus_addons',
  'wizard_uae',
  'wizard_crocoblock',
  'wizard_essential_addons',
  'wizard_uae',
];
for (const wiz of expectedWizards) {
  if (!freeTools.includes(wiz)) {
    console.log('Missing:', wiz);
  }
}