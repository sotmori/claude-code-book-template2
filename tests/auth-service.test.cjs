const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function fixture(development = false) {
  let token = 'token-A', cleared = 0;
  const events = [], requestHandlers = [], responseHandlers = [];
  const values = new Map([['refresh', 'refresh-A']]);
  const session = {
    getToken: () => token,
    clearSession: () => { token = null; cleared += 1; },
    getAppContext: () => ({ appId: 'app', tenantId: 'tenant', principalId: 'person' }),
    setSession: value => { token = value; },
    getDevRefreshToken: () => values.get('refresh') ?? null,
  };
  const api = Object.assign(async config => ({ data: {}, config }), {
    interceptors: {
      request: { use: handler => requestHandlers.push(handler) },
      response: { use: (_success, failure) => responseHandlers.push(failure) },
    },
    post: async () => ({ data: { token: 'refreshed' } }),
    get: async () => ({ data: {} }),
  });
  const axios = { create: () => api, isAxiosError: error => error.isAxiosError === true };
  const modules = {};
  function load(name) {
    if (modules[name]) return modules[name];
    const module = { exports: {} };
    const source = fs.readFileSync(path.join(__dirname, '../src/auth', `${name}.ts`), 'utf8')
      .replaceAll('import.meta.env.DEV', String(development))
      .replaceAll('import.meta.env.PROD', String(!development))
      .replaceAll('import.meta.env.VITE_APP_ID', "'app'");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, URL, Event, CustomEvent,
      window: { location: { origin: 'https://apps.example.test' }, dispatchEvent: event => events.push(event.type) },
      sessionStorage: { getItem: key => values.get(key) ?? null },
      require: dependency => dependency === 'axios' ? { __esModule: true, default: axios } : dependency === './app-session' ? session : load(dependency.replace('./', '')),
    });
    modules[name] = module.exports;
    return module.exports;
  }
  load('auth-service');
  const request = (url, authorization) => ({ url, headers: new Headers(authorization ? { authorization } : {}) });
  const error = config => ({ isAxiosError: true, response: { status: 401 }, config });
  return { requestHandlers, responseHandlers, request, error, events, api, load, values, setToken: value => { token = value; }, getToken: () => token, cleared: () => cleared };
}

test('production requests reject captured stale credentials, including lowercase header names', () => {
  const f = fixture();
  assert.throws(() => f.requestHandlers[0](f.request('/customapps/app/data', 'Bearer stale')), /session changed/);
  assert.equal(f.requestHandlers[0](f.request('/customapps/app/data', 'Bearer token-A')).headers.get('authorization'), 'Bearer token-A');
  f.setToken(null);
  assert.throws(() => f.requestHandlers[0](f.request('/customapps/app/data', 'Bearer token-A')), /session changed/);
});
test('guest profiles retain email and principal while exposing the display name to the shell', async () => {
  const f = fixture();
  const profile = { principalId: 'guest-principal', email: 'guest@example.test', displayName: 'Guest Name', isGuest: true };
  f.api.get = async (url, config) => {
    assert.equal(url, '/auth/profile');
    assert.equal(config.headers.Authorization, 'Bearer token-A');
    return { data: profile };
  };
  const user = await f.load('auth-service').getProfile('token-A');
  assert.equal(user.principalId, profile.principalId);
  assert.equal(user.email, profile.email);
  assert.equal(user.displayName, profile.displayName);
  assert.equal(user.name, profile.displayName);
  assert.equal(user.isGuest, true);
});
test('profile name handling supports members and older guest profiles', async () => {
  const f = fixture();
  for (const [profile, expected] of [
    [{ fullName: 'Member Name' }, 'Member Name'],
    [{ name: 'Existing Name', fullName: 'Member Name' }, 'Existing Name'],
    [{ principalId: 'older-guest', isGuest: true }, ''],
  ]) {
    f.api.get = async () => ({ data: profile });
    assert.equal((await f.load('auth-service').getProfile('token-A')).name, expected);
  }
});
test('public and handoff requests strip explicit credentials without forcing a login', () => {
  const f = fixture();
  for (const url of ['/public/customapps/capability/resolve', '/v1/public/customapps/capability/submit', '/auth/handoff', '/auth/portal-launch']) {
    assert.equal(f.requestHandlers[0](f.request(url, 'Bearer stale')).headers.has('authorization'), false);
    assert.equal(f.requestHandlers[0](f.request(url)).headers.has('authorization'), false); // the current session is never attached
  }
});
test('absolute URLs on another origin never receive the app session', () => {
  const f = fixture();
  for (const url of ['https://bucket.s3.example.test/key?X-Amz-Signature=1', '//evil.test/customapps/app/data', 'HTTPS://evil.test/auth/profile']) {
    assert.equal(f.requestHandlers[0](f.request(url)).headers.has('authorization'), false);
    assert.equal(f.requestHandlers[0](f.request(url, 'Bearer token-A')).headers.has('authorization'), false);
  }
  assert.equal(f.requestHandlers[0](f.request('https://apps.example.test/v1/auth/profile')).headers.get('authorization'), 'Bearer token-A');
  assert.equal(f.requestHandlers[0]({ baseURL: '/v1', url: 'customapps/app/data', headers: new Headers() }).headers.get('authorization'), 'Bearer token-A');
});
test('a delayed old 401 cannot clear a replacement session', async () => {
  const f = fixture(), failure = f.error(f.request('/auth/profile', 'Bearer token-A'));
  f.setToken('token-B');
  await assert.rejects(f.responseHandlers[0](failure));
  assert.equal(f.getToken(), 'token-B'); assert.equal(f.cleared(), 0); assert.deepEqual(f.events, []);
  f.setToken(null); // document-scope mismatch makes the frozen accessor return null
  await assert.rejects(f.responseHandlers[0](failure)); assert.equal(f.cleared(), 0);
});
test('the current credential 401 clears only its own session', async () => {
  const f = fixture();
  await assert.rejects(f.responseHandlers[0](f.error(f.request('/auth/profile', 'Bearer token-A'))));
  assert.equal(f.cleared(), 1); assert.deepEqual(f.events, ['auth:session-expired']);
});
test('development may request a fresh login profile before storing its session', () => {
  const f = fixture(true); f.setToken(null);
  assert.equal(f.requestHandlers[0](f.request('/auth/profile', 'Bearer fresh-login')).headers.get('authorization'), 'Bearer fresh-login');
});
test('a failing development refresh cannot clear a replacement login', async () => {
  const f = fixture(true); f.load('dev-auth-service');
  let fail;
  f.api.post = () => new Promise((_resolve, reject) => { fail = reject; });
  const pending = f.responseHandlers[0](f.error(f.request('/customapps/app/data', 'Bearer token-A')));
  f.setToken('token-B'); f.values.set('refresh', 'refresh-B'); fail(Error('old refresh failed'));
  await assert.rejects(pending); assert.equal(f.getToken(), 'token-B'); assert.equal(f.cleared(), 0);
});

test('development login advertises support and verifies the selected factor without losing leading zeroes', async () => {
  const f = fixture(true), calls = [];
  f.api.post = async (...args) => { calls.push(args); return { data: { token: 'login-token' } }; };
  const service = f.load('dev-auth-service');
  await service.login('user@example.test', 'not-logged');
  await service.verifyTwoFactor('totp-operation', '012345', 'totp');
  await service.verifyTwoFactor('legacy-operation', '001234');
  assert.equal(calls[0][2].headers['X-Valance-Client-Capabilities'], 'passkey-login-v1');
  assert.equal(calls[1][0], '/auth/login/verify-2fa');
  assert.equal(calls[1][1].method, 'totp');
  assert.equal(calls[1][1].code, '012345');
  assert.equal(calls[1][2].headers['X-Valance-Client-Capabilities'], 'passkey-login-v1');
  assert.equal(calls[2][1].method, 'email');
  assert.equal(calls[2][1].code, '001234');
});

test('factor classification accepts legacy email and rejects contradictory or unknown challenges', () => {
  const f = fixture(true), { getMfaMethod } = f.load('auth-types');
  assert.equal(getMfaMethod({ challengeName: 'EMAIL_OTP' }), 'email');
  assert.equal(getMfaMethod({ challengeName: 'TOTP', mfa: { method: 'totp' } }), 'totp');
  assert.throws(() => getMfaMethod({ challengeName: 'TOTP' }), /Unsupported sign-in challenge/);
  assert.throws(() => getMfaMethod({ challengeName: 'EMAIL_OTP', mfa: { method: 'totp' } }), /Unsupported sign-in challenge/);
  assert.throws(() => getMfaMethod({ challengeName: 'PASSKEY' }), /Unsupported sign-in challenge/);
});
