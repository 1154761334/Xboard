import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pluginRoot = path.join(root, 'plugins', 'SubFetcher');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('plugin manifest declares a feature plugin with the supported clients', () => {
  const manifest = JSON.parse(read('plugins/SubFetcher/config.json'));

  assert.equal(manifest.code, 'sub_fetcher');
  assert.equal(manifest.type, 'feature');
  assert.match(manifest.require.xboard, /^\>=\d+\.\d+\.\d+$/);
  assert.deepEqual(manifest.clients, ['clash', 'v2ray', 'singbox', 'surge']);
});

test('plugin route protects the config endpoint and accepts no subscription URL', () => {
  const routes = read('plugins/SubFetcher/routes/api.php');

  assert.match(routes, /\/api\/v1\/plugin\/sub-fetcher\/config/);
  assert.match(routes, /middleware\(\[['"]user['"],\s*['"]throttle:10,1['"]\]\)/);
  assert.doesNotMatch(routes, /\$request->(input|query)\(['"]url['"]/);
});

test('controller validates only a JSON body and preserves controlled subscription responses', () => {
  const controller = read('plugins/SubFetcher/Controllers/SubFetcherController.php');

  for (const client of ['clash', 'v2ray', 'singbox', 'surge']) {
    assert.match(controller, new RegExp(`['"]${client}['"]`));
  }
  assert.match(controller, /ClientController::class/);
  assert.match(controller, /use App\\Services\\Plugin\\InterceptResponseException;/);
  assert.match(controller, /downloadResponse\(\$exception->getResponse\(\),\s*self::CLIENTS\[\$client\]\)/);
  assert.match(controller, /\$request->isJson\(\)/);
  assert.match(controller, /\$request->query->all\(\)/);
  assert.match(controller, /\$request->request->all\(\)/);
  assert.match(controller, /Validator::make\(\$request->json\(\)->all\(\)/);
  assert.doesNotMatch(controller, /\$request->all\(\)/);
  assert.doesNotMatch(controller, /\$request->validate\(/);
});

test('controller returns a no-store attachment, keeps zero-valued safe headers, and does not log content', () => {
  const controller = read('plugins/SubFetcher/Controllers/SubFetcherController.php');

  assert.match(controller, /Cache-Control.*no-store|no-store.*Cache-Control/s);
  assert.match(controller, /Content-Disposition/);
  assert.match(controller, /\$value !== null/);
  assert.doesNotMatch(controller, /Log::(?:debug|info|notice|warning|error)\([^)]*(?:token|content|response|config)/is);
});

test('launcher has download-first actions and does not ask for an arbitrary URL', () => {
  const launcher = read('plugins/SubFetcher/resources/assets/sub-fetcher.js');

  assert.match(launcher, /VUE_NAIVE_ACCESS_TOKEN/);
  assert.match(launcher, /下载配置/);
  assert.match(launcher, /复制配置/);
  assert.match(launcher, /下载|download/i);
  assert.match(launcher, /预览配置/);
  assert.match(launcher, /function syncCacheSession\(token\)\s*\{[\s\S]*?cacheToken !== token[\s\S]*?configCache\.clear\(\)[\s\S]*?pendingRequests\.clear\(\)/);
  assert.match(launcher, /const token = getAccessToken\(\);\s*syncCacheSession\(token\);\s*if \(!token\)/);
  assert.match(launcher, /cacheToken !== token \|\| getAccessToken\(\) !== token/);
  assert.match(launcher, /function copyWithExecCommand\(content\)[\s\S]*?document\.execCommand\('copy'\)/);
  assert.match(launcher, /try\s*\{\s*await navigator\.clipboard\.writeText\(content\);\s*return;\s*\}\s*catch \(_\)\s*\{[\s\S]*?copyWithExecCommand\(content\)/);
  assert.doesNotMatch(launcher, /订阅链接.*input|url-input|原始订阅链接/);
});

test('custom html only loads the versioned launcher and no iframe remains', () => {
  const compose = read('compose.yaml');
  const currentHtml = fs.existsSync(path.join(pluginRoot, 'custom_html.txt'))
    ? read('plugins/SubFetcher/custom_html.txt')
    : '';

  assert.ok(compose.includes('plugins/SubFetcher'));
  assert.match(currentHtml, /sub-fetcher\.js/);
  assert.doesNotMatch(currentHtml, /iframe|fetcher-modal|floating-fetcher-btn/);
});
