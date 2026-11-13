const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/auth/dev-auth-provider.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  const axios = { isAxiosError: error => error?.isAxiosError === true };
  const modules = { axios: { __esModule: true, default: axios } };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => modules[name] ?? {} });
  return module.exports;
}
// Development login routes answer errors as top-level {code, message}.
const failure = (status, code, message) => ({ isAxiosError: true, response: status === undefined ? undefined : { status, data: { code, message } } });

test('two-factor errors are chosen by code, not by message wording', () => {
  const { getOtpErrorMessage } = load();
  assert.equal(getOtpErrorMessage(failure(401, 'INVALID_CODE', '認証コードが無効か、有効期限が切れています。')), '認証コードが無効か、有効期限が切れています。');
  assert.match(getOtpErrorMessage(failure(401, 'CHALLENGE_EXPIRED', '認証できませんでした。再度ログインしてください。')), /認証セッションの有効期限/);
  assert.match(getOtpErrorMessage(failure(429, 'INVALID_CODE', 'x')), /上限/);
  assert.match(getOtpErrorMessage(failure(undefined)), /ネットワーク/);
});
test('login errors use the server code and message', () => {
  const { getLoginErrorMessage } = load();
  assert.equal(getLoginErrorMessage(failure(401, 'ERR_401001', 'メールアドレスまたはパスワードが間違っています。')), 'メールアドレスまたはパスワードが正しくありません');
  assert.equal(getLoginErrorMessage(failure(429, 'LOGIN_RATE_LIMITED', 'ログインの試行回数が上限に達しました。')), 'ログインの試行回数が上限に達しました。');
  assert.match(getLoginErrorMessage(failure(503, 'AUTH_PROVIDER_UNAVAILABLE', 'internal')), /サーバーエラー/);
});

test('policy refusals direct app developers to the portal and used codes advise waiting', () => {
  const { getLoginErrorMessage, getOtpErrorMessage } = load();
  assert.match(getLoginErrorMessage(failure(403, 'PASSKEY_REQUIRED', 'x')), /ポータルからアプリ/);
  assert.match(getLoginErrorMessage(failure(403, 'SIGN_IN_METHOD_SETUP_REQUIRED', 'x')), /ポータルからアプリ/);
  assert.match(getLoginErrorMessage(failure(409, 'CLIENT_UPGRADE_REQUIRED', 'x')), /テンプレートを最新版/);
  assert.match(getOtpErrorMessage(failure(409, 'TOTP_CODE_ALREADY_USED', 'x')), /次のコード/);
});
