const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/tools/forms.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Find lines with server.tool(
const lines = content.split('\n');
const toolStarts = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('server.tool(')) {
    toolStarts.push(i);
  }
}
if (toolStarts.length !== 4) {
  console.error('Expected 4 server.tool calls, found', toolStarts.length);
  process.exit(1);
}
// Add end of file as last end
toolStarts.push(lines.length);

const blocks = [];
for (let b = 0; b < 4; b++) {
  const start = toolStarts[b];
  const end = toolStarts[b + 1];
  // Find previous line that is a comment with // ---
  let blockStart = start;
  for (let i = start - 1; i >= 0; i--) {
    if (lines[i].includes('// ---')) {
      blockStart = i;
      break;
    }
  }
  const blockLines = lines.slice(blockStart, end);
  blocks.push(blockLines.join('\n'));
}

// Identify which block is which tool by checking the tool name line
const toolNames = blocks.map(block => {
  const match = block.match(/'([a-z_]+)'/);
  return match ? match[1] : 'unknown';
});
console.log('Detected tools:', toolNames);

// free tools: create_form_light, list_form_templates
// advanced tools: create_form_advanced, migrate_form
const freeIndices = [0, 2];
const advancedIndices = [1, 3];

function createFunction(name, indices) {
  let code = `export function ${name}(\n  server: McpServer,\n  getClient: (siteId?: string) => ElementifyClient,\n): void {\n`;
  for (const idx of indices) {
    code += '\n' + blocks[idx] + '\n';
  }
  code += '}\n';
  return code;
}

const freeFunction = createFunction('registerFormFreeTools', freeIndices);
const advancedFunction = createFunction('registerFormAdvancedTools', advancedIndices);

// Append to file
const newContent = content.trimEnd() + '\n\n' + freeFunction + '\n\n' + advancedFunction + '\n';
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Added split functions to forms.ts');