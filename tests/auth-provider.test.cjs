const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
function runtime() {
  let signedOut = false;
  let token = 'A', cleared = 0, installed = 0, resolveProfile, rejectProfile, resolveLogout, resolveReplacement;
  const profile = new Promise((resolve, reject) => { resolveProfile = resolve; rejectProfile = reject; });
  const logout = new Promise(resolve => { resolveLogout = resolve; });
  const replacement = new Promise(resolve => { resolveReplacement = resolve; });
  const source = fs.readFileSync(path.resolve(__dirname, '../src/auth/auth-provider.tsx'), 'utf8').replaceAll('import.meta.env.DEV', 'false') + '\nexport { ProductionAuthProvider };';
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  const modules = {
    react: { useState: initial => [initial, () => {}], useEffect: effect => effect() },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    './auth-context': { AuthContext: { Provider: 'provider' } },
    './auth-service': { getProfile: requested => requested === 'A' ? profile : replacement, api: { post: (url, body, config) => { assert.equal(config.headers.Authorization, 'Bearer A'); return logout; } }, SESSION_EXPIRED_EVENT: 'expired' },
    './app-session': { setExplicitlySignedOut: value => { signedOut = value; }, getToken: () => token, getAppContext: () => ({ appId: 'app' }), clearSession: () => { token = null; cleared++; }, setSession: next => { token = next; installed++; } },
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => modules[name], window: { addEventListener() {}, removeEventListener() {} } });
  const output = module.exports.ProductionAuthProvider({ children: null });
  return { signedOut: () => signedOut, resolveProfile, rejectProfile, resolveLogout, resolveReplacement, logout: output.props.value.logout, setToken: value => { token = value; }, token: () => token, cleared: () => cleared, installed: () => installed };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('late profile success cannot reinstall an older app session', async () => {
  const env = runtime(); env.setToken('B'); env.resolveProfile({ appId: 'app' }); await settle();
  assert.equal(env.token(), 'B'); assert.equal(env.installed(), 0); assert.equal(env.cleared(), 0);
});
test('a profile refused for this app (ended guest admission: 404 APP_NOT_AVAILABLE) ends the app session', async () => {
  const env = runtime();
  env.rejectProfile({ isAxiosError: true, response: { status: 404, data: { message: 'このアプリを開く権限がありません。', data: { code: 'APP_NOT_AVAILABLE' } } } });
  await settle();
  // Cleared and unauthenticated: ProtectedRoute then re-launches through the portal, which explains the refusal.
  assert.equal(env.token(), null); assert.equal(env.cleared(), 1); assert.equal(env.installed(), 0);
});
test('late profile failure cannot clear a replacement app session', async () => {
  const env = runtime(); env.setToken('B'); env.rejectProfile(new Error('old session expired')); await settle();
  assert.equal(env.token(), 'B'); assert.equal(env.cleared(), 0);
});
test('late logout completion cannot clear a replacement app session', async () => {
  const env = runtime(); const pending = env.logout(); env.setToken('B'); env.resolveLogout(); await pending;
  assert.equal(env.token(), 'B'); assert.equal(env.cleared(), 0);
});

test('a replacement session gets its own profile after the old response finishes', async () => {
  const env = runtime(); env.setToken('B'); env.resolveProfile({ appId: 'app' }); await settle();
  env.resolveReplacement({ appId: 'app' }); await settle();
  assert.equal(env.token(), 'B'); assert.equal(env.installed(), 1); assert.equal(env.cleared(), 0);
});
test('logout without a current session sends no request', async () => {
  const env = runtime(); env.setToken(null); await env.logout(); assert.equal(env.cleared(), 0);
});

test('explicit logout is marked before revocation and clears the session after success', async () => {
  const env = runtime(); const pending = env.logout();
  assert.equal(env.signedOut(), true); assert.equal(env.token(), 'A');
  env.resolveLogout(); await pending; assert.equal(env.token(), null); assert.equal(env.signedOut(), true);
});
