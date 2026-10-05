/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const cache = new Map();
const memory = new Map();
let failStorage = false;
const storage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => { if (failStorage) throw new Error('Quota'); memory.set(key, value); },
};
function load(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, { module: loaded, exports: loaded.exports,
    require: name => load(path.resolve(path.dirname(filename), name + '.ts')),
    localStorage: storage, window: { dispatchEvent() {} }, Event, URL, crypto,
  }, { filename });
  cache.set(filename, loaded.exports); return loaded.exports;
}
const model = load(path.resolve(__dirname, '../lib/workspace.ts'));
const empty = { version: 1, rooms: [], works: [] };
assert(model.isWorkspace(empty));
assert(!model.isWorkspace({ ...empty, version: 2 }));
assert(!model.safeWebLink('javascript:alert(1)'));
assert(!model.safeWebLink('https://user:secret@example.com'));
assert(model.safeWebLink('https://example.com/work'));
const room = { id: 'room', title: 'test', audience: '', goal: '', notes: '', toolIds: ['chatbot'], updatedAt: new Date().toISOString() };
assert(model.isWorkspace({ ...empty, rooms: [room] }));
assert(!model.isWorkspace({ ...empty, rooms: [room, room] }));
assert(!model.isWorkspace({ ...empty, rooms: [{ ...room, toolIds: ['unknown'] }] }));
assert(!model.isWorkspace({ ...empty, rooms: [{ ...room, updatedAt: 'invalid' }] }));
assert(!model.isWorkspace({ ...empty, rooms: [{ ...room, title: 'x'.repeat(101) }] }));
assert(!model.isWorkspace({ ...empty, rooms: Array.from({ length: 101 }, (_, index) => ({ ...room, id: String(index) })) }));
model.writeWorkspace({ ...empty, rooms: [room] });
assert.equal(model.readWorkspace().rooms[0].id, 'room');
const setting = { botName: 'test AI', role: 'teacher', target: '', tone: '', mustDo: '', mustNot: '' };
model.storeAIWork(setting);
assert.equal(model.readWorkspace().works[0].content.role, 'teacher');
const before = memory.get(model.WORKSPACE_KEY);
failStorage = true;
assert.throws(() => model.storeAIWork(setting));
assert.equal(memory.get(model.WORKSPACE_KEY), before);
failStorage = false;
memory.set(model.WORKSPACE_KEY, '{broken');
assert.throws(() => model.readWorkspace());
assert.throws(() => model.storeAIWork(setting));
assert.equal(memory.get(model.WORKSPACE_KEY), '{broken');
console.log('Workspace validation, snapshots, quota failure and corrupt-data protection: passed');
