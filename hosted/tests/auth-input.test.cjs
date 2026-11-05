const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const ts = require('typescript');
const source = readFileSync(join(__dirname,'../app/auth-input.ts'),'utf8');
const moduleObject = {exports:{}};
const context = vm.createContext({exports:moduleObject.exports,module:moduleObject,Set,Error});
vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {validateAuthInput,safeReturnPath} = moduleObject.exports;

test('registration validates confirmation and preserves password whitespace', () => {
  const password = '  this-is-a-test-password  ';
  const result = validateAuthInput('register',{email:'  person@example.com  ',password,confirmPassword:password});
  assert.equal(result.email,'person@example.com');
  assert.equal(result.password,password);
  assert.throws(() => validateAuthInput('register',{email:'person@example.com',password,confirmPassword:'different'}),/password_mismatch/);
});
test('rejects malformed addresses, nonstring passwords, weak and excessive passwords', () => {
  for (const email of ['not-an-email','a@b','a b@example.com']) {
    assert.throws(() => validateAuthInput('login',{email,password:'valid-password'}),/invalid_email/);
  }
  assert.throws(() => validateAuthInput('login',{email:'a@example.com',password:12}),/invalid_password/);
  assert.throws(() => validateAuthInput('register',{email:'a@example.com',password:'short',confirmPassword:'short'}),/weak_password/);
  assert.throws(() => validateAuthInput('reset',{password:'x'.repeat(129),confirmPassword:'x'.repeat(129)}),/invalid_password/);
  assert.throws(() => validateAuthInput('forgot',null),/invalid_request/);
});
test('forgot-password requests need no password; reset requests need no email', () => {
  assert.equal(validateAuthInput('forgot',{email:'a@example.com'}).email,'a@example.com');
  assert.equal(validateAuthInput('reset',{password:'long-test-password',confirmPassword:'long-test-password'}).password,'long-test-password');
});
test('email callbacks cannot redirect to an external or arbitrary URL', () => {
  for (const path of ['https://evil.example','//evil.example','/\\evil.example','/admin',null]) assert.equal(safeReturnPath(path),'/tracker.html');
  assert.equal(safeReturnPath('/reset-password'),'/reset-password');
});
