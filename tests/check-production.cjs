const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parseEnv } = require('node:util');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
const files = walk(dist);
const read = file => fs.readFileSync(file, 'utf8');
const assets = path.join(dist, 'assets');
const code = files.filter(file => path.dirname(file) === assets && file.endsWith('.js')).map(read).join('\n');
for (const forbidden of ['/auth/login', '/auth/refresh', 'destinationMasked', 'getDevelopmentAppId', 'Connected app ID']) {
  assert.ok(!code.includes(forbidden), `Development authentication leaked into production: ${forbidden}`);
}
for (const required of ['/auth/handoff', '/auth/portal-launch', '/auth/logout', 'valance.app.token', 'valance.app.signedOut:']) {
  assert.ok(code.includes(required), `Missing production authentication: ${required}`);
}
// Source maps publish the original source; the bundle must not ship or reference them.
const textFiles = files.filter(file => /\.(m?js|css|html?)$/.test(file));
assert.deepEqual(files.filter(file => file.endsWith('.map')).map(file => path.relative(root, file)), [], 'Production build must not contain source maps');
for (const file of textFiles.filter(file => path.dirname(file) === assets || file.endsWith('.html'))) {
  assert.ok(!/[#@]\s*sourceMappingURL=/.test(read(file)), `Source map reference in ${path.relative(root, file)}`);
}
// Local settings (VITE_APP_ID, VITE_API_TARGET, ...) belong to `npm run dev` only.
const local = ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local']
  .map(name => path.join(root, name)).filter(file => fs.existsSync(file))
  .flatMap(file => Object.entries(parseEnv(read(file))).map(([key, value]) => ({ key, value: value.trim(), file })))
  .filter(({ key, value }) => key.startsWith('VITE_') && value.length >= 8);
for (const file of textFiles) {
  const text = read(file);
  for (const { key, value, file: source } of local) {
    assert.ok(!text.includes(value), `${key} from ${path.basename(source)} leaked into ${path.relative(root, file)}`);
  }
}
console.log(`Production bundle excludes password/MFA/refresh code, source maps and local VITE_* settings (${local.length} checked), and includes app hand-off.`);
