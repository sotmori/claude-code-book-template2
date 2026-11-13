const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function storage() {
  const values = new Map();
  return { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k), values };
}
function fixture(development = false) {
  const sessionStorage = storage(), localStorage = storage(), cache = {};
  const calls = [];
  const window = { location: { origin: 'https://apps.example.test', protocol: 'https:', port: '', pathname: '/app/', search: '?code=secret&state=private', hash: '#/records/1', replace: value => calls.push(['replace', value]), reload: () => calls.push(['reload']) } };
  window.top = window; window.parent = window;
  window.history = { replaceState: (_, __, value) => { calls.push(['history', value]); const u = new URL(value, window.location.origin); Object.assign(window.location, { pathname: u.pathname, search: u.search, hash: u.hash }); } };
  const api = { get: async (...args) => { calls.push(['get', ...args]); return { data: { url: 'https://portal.example.test/launch?host=apps.example.test' } }; }, post: async (...args) => { calls.push(['post', ...args]); return { data: { token: token('A'), appId: 'app1', returnPath: '/app/' } }; } };
  function load(name) {
    if (name === './auth-service') return { api };
    if (cache[name]) return cache[name].exports;
    const filename = path.resolve(__dirname, '../src/auth', `${name}.ts`);
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.DEV', String(development));
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module = cache[name] = { exports: {} };
    vm.runInNewContext(compiled, { module, exports: module.exports, require: load, window, sessionStorage, localStorage, URL, Uint8Array, TextDecoder, atob });
    return module.exports;
  }
  return { sessionStorage, localStorage, calls, window, api, load, newDocument: () => { for (const name of Object.keys(cache)) delete cache[name]; } };
}
const token = (tenant, principal = 'person') => `header.${Buffer.from(JSON.stringify({ tenantId: tenant, principalId: principal })).toString('base64url')}.signature`;

test('tab credentials retire shared credentials and require complete identity', () => {
  const f = fixture(), s = f.load('./app-session');
  f.localStorage.setItem('token', 'legacy'); s.setSession(token('A'), 'app1');
  assert.equal(f.localStorage.getItem('token'), null);
  assert.equal(s.getToken(), token('A'));
  assert.throws(() => s.setSession(token('B'), '_self'));
  assert.equal(fixture().load('./app-session').getToken(), null);
});
test('business storage isolates tenant, app and principal; queued handles fail after switch', () => {
  const f = fixture(); let s = f.load('./app-session'), d = f.load('./scoped-storage');
  s.setSession(token('A'), 'app1'); const queue = d.scopedStorage.capture(); queue.setItem('queue', 'A write');
  function switchTo(jwt, app) {
    assert.throws(() => s.setSession(jwt, app), /identity changed/);
    assert.equal(s.getToken(), null); // old document cannot obtain replacement identity
    f.newDocument(); s = f.load('./app-session'); d = f.load('./scoped-storage'); s.setSession(jwt, app);
  }
  switchTo(token('B'), 'app1'); assert.equal(d.scopedStorage.getItem('queue'), null); assert.throws(() => queue.getItem('queue'));
  switchTo(token('A'), 'app2'); assert.equal(d.scopedStorage.getItem('queue'), null);
  switchTo(token('A', 'other'), 'app1'); assert.equal(d.scopedStorage.getItem('queue'), null);
  switchTo(token('A'), 'app1'); assert.equal(d.scopedStorage.getItem('queue'), 'A write');
  s.clearSession(); assert.throws(() => d.scopedStorage.setItem('queue', 'stale'));
});
test('legacy queues are quarantined, never assigned to the current tenant', () => {
  const f = fixture(), s = f.load('./app-session'), d = f.load('./scoped-storage');
  f.localStorage.setItem('offlineQueue', 'unattributed'); s.setSession(token('A'), 'app1');
  d.quarantineLegacyStorage(['offlineQueue']); d.quarantineLegacyStorage(['offlineQueue']);
  assert.equal(f.localStorage.getItem('offlineQueue'), null);
  assert.equal(f.localStorage.getItem('quarantine:offlineQueue'), 'unattributed');
  assert.equal(d.scopedStorage.getItem('offlineQueue'), null);
});
test('a legacy key written again after quarantine is kept beside the first copy, never fatal', () => {
  const f = fixture(), s = f.load('./app-session'), d = f.load('./scoped-storage');
  s.setSession(token('A'), 'app1');
  f.localStorage.setItem('offlineQueue', 'first'); d.quarantineLegacyStorage(['offlineQueue']);
  // An old tab, or the original build after a rollback, writes the key again.
  f.localStorage.setItem('offlineQueue', 'second'); d.quarantineLegacyStorage(['offlineQueue']);
  f.localStorage.setItem('offlineQueue', 'second'); d.quarantineLegacyStorage(['offlineQueue']);
  f.localStorage.setItem('offlineQueue', 'third'); d.quarantineLegacyStorage(['offlineQueue']);
  assert.equal(f.localStorage.getItem('offlineQueue'), null);
  assert.deepEqual(['quarantine:offlineQueue', 'quarantine:offlineQueue:1', 'quarantine:offlineQueue:2', 'quarantine:offlineQueue:3'].map(k => f.localStorage.getItem(k)), ['first', 'second', 'third', null]);
  f.sessionStorage.setItem('wizard', 'legacy'); d.quarantineLegacyStorage(['wizard'], f.sessionStorage);
  assert.equal(f.sessionStorage.getItem('wizard'), null); assert.equal(f.sessionStorage.getItem('quarantine:wizard'), 'legacy');
  const full = { getItem: k => (k === 'offlineQueue' ? 'unmovable' : null), setItem: () => { throw Error('QuotaExceededError'); }, removeItem: () => { throw Error('must stay'); } };
  assert.doesNotThrow(() => d.quarantineLegacyStorage(['offlineQueue'], full));
});
test('handoff strips secret before request and restores complete pending location', async () => {
  const f = fixture(), s = f.load('./app-session'), r = f.load('./app-runtime');
  f.window.location.hash = '#vh=one-time';
  f.sessionStorage.setItem(s.RETURN_LOCATION_KEY, '/app/?code=secret&state=private#/records/1');
  await r.bootstrapAppSession();
  assert.equal(f.calls[0][0], 'history'); assert.equal(f.calls[1][0], 'post');
  assert.equal(f.window.location.search, '?code=secret&state=private'); assert.equal(f.window.location.hash, '#/records/1');
  assert.equal(f.sessionStorage.getItem(s.RETURN_LOCATION_KEY), null);
});
test('failed handoff leaves no secret fragment or previous identity', async () => {
  const f = fixture(), s = f.load('./app-session'), r = f.load('./app-runtime'); s.setSession(token('A'), 'app1');
  f.window.location.hash = '#vh=expired'; f.api.post = async () => { throw Error('expired'); };
  await assert.rejects(r.bootstrapAppSession()); assert.equal(f.window.location.hash, ''); assert.equal(s.getToken(), null);
});
test('framed launch stores full location privately and navigates top once with pathname only', async () => {
  const f = fixture(), s = f.load('./app-session'), r = f.load('./app-runtime');
  f.window.top = { location: { replace: value => f.calls.push(['top', value]) } };
  await Promise.all([r.launchThroughPortal(), r.launchThroughPortal()]);
  assert.equal(f.sessionStorage.getItem(s.RETURN_LOCATION_KEY), '/app/?code=secret&state=private#/records/1');
  assert.equal(f.calls.filter(c => c[0] === 'get').length, 1);
  assert.equal(f.calls[0][2].params.path, '/app/'); assert.equal(f.calls[1][0], 'top');
});
test('public pages bootstrap without login, and cross-origin return paths are refused', async () => {
  const f = fixture(), r = f.load('./app-runtime'); await r.bootstrapAppSession(); assert.equal(f.calls.length, 0);
  for (const bad of ['//evil.test/', '/\\evil.test', 'https://evil.test/', '/\nevil']) assert.equal(r.safeReturnLocation(bad), null);
});

test('unframed listing bundles ignore previously stored tokens', () => {
  const f = fixture(), s = f.load('./app-session'); s.setSession(token('A'), 'app1');
  f.window.location.pathname = '/marketplace/listing/versions/v1/app/';
  assert.equal(s.getToken(), null); assert.equal(s.getAppContext(), null);
  f.window.top = {}; assert.equal(s.getToken(), token('A'));
});

test('offline apps origin: an un-framed listing bundle uses the token this tab redeemed there', async () => {
  const f = fixture(), s = f.load('./app-session'), r = f.load('./app-runtime');
  Object.assign(f.window.location, { origin: 'http://appliance.local:8081', protocol: 'http:', port: '8081', pathname: '/marketplace/listing/versions/v1/app/index.html', search: '', hash: '#vh=one-time' });
  f.api.post = async () => ({ data: { token: token('A'), appId: 'install1', returnPath: '/marketplace/listing/versions/v1/app/index.html' } });
  await r.bootstrapAppSession();
  assert.equal(s.getToken(), token('A')); assert.equal(s.getAppContext().appId, 'install1');
  f.newDocument(); assert.equal(f.load('./app-session').getToken(), null); // reload requires a new handoff
  s.clearSession(); assert.equal(s.getToken(), null);
});
test('cloud: an un-framed listing bundle never uses a token the launcher stored', () => {
  const f = fixture(), s = f.load('./app-session');
  f.window.location.pathname = '/marketplace/listing/versions/v1/app/';
  // The launcher redeems at the listing root and writes the shared tab keys directly.
  f.sessionStorage.setItem(s.TOKEN_KEY, token('A'));
  f.sessionStorage.setItem(s.CONTEXT_KEY, JSON.stringify({ appId: 'install1', tenantId: 'A', principalId: 'person' }));
  assert.equal(s.getToken(), null); assert.equal(s.getAppContext(), null);
  // A binding from an earlier top-level redemption does not cover a newer launcher token.
  s.bindTopLevelListing(token('A', 'earlier')); assert.equal(s.getToken(), null);
  // Another listing's binding does not carry over either.
  s.bindTopLevelListing(token('A')); f.window.location.pathname = '/marketplace/other/versions/v1/app/';
  assert.equal(s.getToken(), null);
  f.window.top = {}; assert.equal(s.getToken(), null); // stored credentials are never accepted
});
test('a shared apps origin keeps older-template apps signed in', () => {
  const f = fixture(), s = f.load('./app-session');
  Object.assign(f.window.location, { protocol: 'http:', port: '8081', pathname: '/customapps/t/a/app/' });
  f.localStorage.setItem('token', 'older app'); f.localStorage.setItem('refreshToken', 'older refresh');
  s.setSession(token('A'), 'app1'); s.clearSession(); s.retireLegacyCredentials();
  assert.equal(f.localStorage.getItem('token'), 'older app'); assert.equal(f.localStorage.getItem('refreshToken'), 'older refresh');
  Object.assign(f.window.location, { protocol: 'https:', port: '', pathname: '/' });
  s.retireLegacyCredentials(); assert.equal(f.localStorage.getItem('token'), null);
});
test('development supports multi-membership Cognito tokens without tenant claims', () => {
  const f = fixture(true), s = f.load('./app-session');
  const cognito = `header.${Buffer.from(JSON.stringify({ sub: 'login-id' })).toString('base64url')}.sig`;
  s.setSession(cognito, 'app1', { tenantId: 'host', principalId: 'person' });
  assert.equal(s.getAppContext().tenantId, 'host');
  assert.throws(() => fixture(false).load('./app-session').setSession(cognito, 'app1', { tenantId: 'host', principalId: 'person' }));
});

test('handoff retry preserves an earlier private callback and rejects another listing path', async () => {
  const f = fixture(), s = f.load('./app-session'), r = f.load('./app-runtime');
  f.sessionStorage.setItem(s.RETURN_LOCATION_KEY, '/app/?code=keep#/callback');
  await r.launchThroughPortal();
  assert.equal(f.sessionStorage.getItem(s.RETURN_LOCATION_KEY), '/app/?code=keep#/callback');
  f.window.location.pathname = '/marketplace/ours/versions/2/app/';
  assert.equal(r.safeReturnLocation('/marketplace/theirs/app/#/data'), null);
});

test('explicit logout survives reload and blocks automatic portal SSO until sign-in', async () => {
  const f = fixture(); let s = f.load('./app-session');
  s.setSession(token('A'), 'app1'); s.setExplicitlySignedOut(true); s.clearSession();
  f.newDocument(); s = f.load('./app-session'); const r = f.load('./app-runtime');
  assert.equal(s.isExplicitlySignedOut(), true); await r.launchThroughPortal(); assert.equal(f.calls.length, 0);
  s.setExplicitlySignedOut(false); await r.launchThroughPortal(); assert.equal(f.calls.filter(c => c[0] === 'get').length, 1);
});
test('logout marker is scoped per app on a shared origin; a fresh handoff clears it', async () => {
  const f = fixture(), s = f.load('./app-session'), r = f.load('./app-runtime');
  f.window.location.pathname = '/customapps/t/a/app/index.html'; s.setExplicitlySignedOut(true);
  f.window.location.pathname = '/customapps/t/b/app/index.html'; assert.equal(s.isExplicitlySignedOut(), false);
  f.window.location.pathname = '/customapps/t/a/app/index.html'; assert.equal(s.isExplicitlySignedOut(), true);
  f.window.location.hash = '#vh=fresh'; await r.bootstrapAppSession();
  f.window.location.pathname = '/customapps/t/a/app/index.html'; assert.equal(s.isExplicitlySignedOut(), false);
});
