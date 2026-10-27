// Run with: node --test tests/storage.test.cjs (no dependencies required).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

const html = readFileSync(join(__dirname, '../保障金三角_依照公版_修正版.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const STORE = 'protection_triangle_reference_v6';
function boot(storage, { blocked = false, confirm = true } = {}) {
  const inputs = [...html.matchAll(/<input\b[^>]*data-key="([^"]+)"[^>]*>/g)].map(([, key]) => ({
    value: '', listeners: {}, getAttribute: () => key,
    addEventListener(name, fn) { this.listeners[name] = fn; }, key,
  }));
  const elements = {
    '.viewport': { clientWidth: 1000 }, '.stage': { style: {} }, '.page': { style: {} },
  };
  const button = { addEventListener(name, fn) { this[name] = fn; } };
  const events = {};
  const localStorage = {
    getItem(key) { if (blocked) throw Error('blocked'); return storage.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw Error('blocked'); storage.set(key, value); },
    removeItem(key) { if (blocked) throw Error('blocked'); storage.delete(key); },
  };
  runInNewContext(script, {
    localStorage, confirm: () => confirm,
    document: { querySelectorAll: () => inputs, querySelector: s => elements[s], getElementById: () => button },
    window: { addEventListener: (name, fn) => { events[name] = fn; } },
  });
  assert.equal(inputs.length, 30);
  assert.ok(inputs.every(x => typeof x.listeners.input === 'function'));
  assert.equal(typeof button.click, 'function');
  assert.ok(elements['.page'].style.transform.startsWith('scale('));
  elements['.viewport'].clientWidth = 390;
  events.resize();
  assert.equal(elements['.stage'].style.width, '370px');
  return { inputs, button, enter(key, value) {
    const input = inputs.find(x => x.key === key);
    input.value = value; input.listeners.input();
  } };
}

test('normal input persists across reload without losing existing fields', () => {
  const storage = new Map([[STORE, JSON.stringify({ client: '王先生', life: '300', extra: 'preserve' })]]);
  const app = boot(storage);
  assert.equal(app.inputs.find(x => x.key === 'client').value, '王先生');
  app.enter('care', '25000');
  const reloaded = boot(storage);
  assert.equal(reloaded.inputs.find(x => x.key === 'care').value, '25000');
  assert.equal(reloaded.inputs.find(x => x.key === 'life').value, '300');
  assert.equal(JSON.parse(storage.get(STORE)).extra, 'preserve');
});

for (const raw of ['null', '[]', '["value"]', '42', 'true', '"text"', '{bad json', '']) {
  test(`invalid state ${JSON.stringify(raw)} leaves initialization functional and storage untouched`, () => {
    const storage = new Map([[STORE, raw]]);
    const app = boot(storage);
    assert.equal(storage.get(STORE), raw);
    assert.ok(app.inputs.every(x => x.value === ''));
    app.enter('client', '新客戶');
    assert.equal(JSON.parse(storage.get(STORE)).client, '新客戶');
    app.button.click();
    assert.equal(storage.has(STORE), false);
  });
}

test('missing storage initializes without creating a record', () => {
  const storage = new Map(); boot(storage); assert.equal(storage.size, 0);
});
test('unavailable localStorage does not break initialization, input or clear', () => {
  const storage = new Map([[STORE, '{"client":"保留"}']]);
  const app = boot(storage, { blocked: true });
  app.enter('client', '測試'); app.button.click();
  assert.ok(app.inputs.every(x => x.value === ''));
  assert.equal(storage.get(STORE), '{"client":"保留"}');
});
test('cancel clear preserves data; confirm removes only this application record', () => {
  const storage = new Map([[STORE, '{"client":"保留"}'], ['unrelated', 'keep']]);
  const app = boot(storage, { confirm: false }); app.button.click();
  assert.equal(app.inputs[0].value, '保留');
  assert.equal(storage.get(STORE), '{"client":"保留"}');
  const confirmed = boot(storage); confirmed.button.click();
  assert.ok(confirmed.inputs.every(x => x.value === ''));
  assert.equal(storage.has(STORE), false);
  assert.equal(storage.get('unrelated'), 'keep');
});
