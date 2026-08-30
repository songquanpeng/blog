import test from 'node:test';
import assert from 'node:assert/strict';
import {
  homePageMode,
  isSafeNavigationURL,
  parseNavigationConfig,
  serializeNavigationConfig,
  validateNavigationGroups,
  valueForHomePageMode,
} from './settings.js';

test('navigation config round-trips historical JSON and trims editable fields', () => {
  const raw = '[{"key":" Meta ","value":[{"link":" /archive ","text":" 存档 "}]}]';
  const parsed = parseNavigationConfig(raw);
  assert.equal(parsed.error, '');
  assert.deepEqual(JSON.parse(serializeNavigationConfig(parsed.groups, true)), [
    { key: 'Meta', value: [{ text: '存档', link: '/archive' }] },
  ]);
});

test('navigation config reports malformed and structurally invalid data', () => {
  assert.match(parseNavigationConfig('{').error, /JSON 解析失败/);
  assert.match(parseNavigationConfig('{}').error, /分组列表/);
  assert.match(parseNavigationConfig('[{"key":"Meta"}]').error, /缺少链接列表/);
});

test('navigation validation matches safe public URL rules', () => {
  assert.equal(isSafeNavigationURL('/page/about'), true);
  assert.equal(isSafeNavigationURL('https://example.com/path'), true);
  assert.equal(isSafeNavigationURL('//example.com'), false);
  assert.equal(isSafeNavigationURL('javascript:alert(1)'), false);
  assert.match(validateNavigationGroups([{ key: '主导航', value: [{ text: '坏链接', link: 'ftp://example.com' }] }]), /链接无效/);
  assert.equal(validateNavigationGroups([{ key: '主导航', value: [{ text: '关于', link: '/page/about' }] }]), '');
});

test('home page modes hide the historical magic values', () => {
  assert.equal(homePageMode(''), 'list');
  assert.equal(homePageMode('404'), 'disabled');
  assert.equal(homePageMode('<h1>Hi</h1>'), 'custom');
  assert.equal(valueForHomePageMode('list', '<h1>Hi</h1>'), '');
  assert.equal(valueForHomePageMode('disabled', ''), '404');
  assert.match(valueForHomePageMode('custom', '404'), /欢迎/);
});
