const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
const source = fs.readFileSync(path.resolve(__dirname, '../vendor/valance-sdk/src/record-identity.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function load(crypto) {
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, crypto, Uint8Array });
  return module.exports;
}
test('allocates portable UUIDs without a session, location or secure-context randomUUID', () => {
  const { newRecordId } = load({ getRandomValues: bytes => webcrypto.getRandomValues(bytes) });
  const ids = Array.from({ length: 100 }, () => newRecordId());
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});
test('fails instead of substituting an insecure random source', () => {
  assert.throws(() => load({}).newRecordId());
});
