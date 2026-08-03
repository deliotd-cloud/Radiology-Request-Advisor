/**
 * Regenerates src/scenarios.js from the RULES array in ../index.html.
 *
 * Run this whenever you add, remove or rename a scenario, otherwise the Worker
 * will reject events for the new rule id:
 *
 *   node worker/gen-scenarios.js
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const outPath  = path.join(__dirname, 'src', 'scenarios.js');

const src = fs.readFileSync(htmlPath, 'utf8');
const re  = /id:'([a-z0-9_]+)',\s*cat:'([^']+)',\s*label:'([^']+)'/g;

const found = [];
let m;
while ((m = re.exec(src))) found.push({ id: m[1], cat: m[2], label: m[3] });

if (!found.length) {
  console.error('No scenarios found — has the RULES format changed?');
  process.exit(1);
}

const body = found
  .map(s => '  ' + JSON.stringify(s.id) + ': ' + JSON.stringify([s.label, s.cat]))
  .join(',\n');

fs.writeFileSync(outPath,
  '/**\n * Scenario allowlist, generated from the RULES array in index.html.\n *\n' +
  ' * The Worker accepts ONLY these ids and derives the label and category from\n' +
  ' * this table, so no client-supplied text is ever stored. Regenerate with:\n' +
  ' *   node worker/gen-scenarios.js\n */\n\nexport const SCENARIOS = {\n' + body + '\n};\n');

console.log('Wrote ' + found.length + ' scenarios to ' + outPath);
