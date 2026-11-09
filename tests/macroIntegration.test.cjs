const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

for (const scenario of [
  { file: 'Potions', key: 'potionsPreset', preset: { count: 2 }, kind: 'item' },
  { file: 'Spells', key: 'spellsPreset', preset: { selections: [{ tableId: 'table', count: 2 }] }, kind: 'spell' },
  { file: 'Targeted_Loot', key: 'targetedLootPreset', preset: { entries: ['Item.test', 'Item.test'] }, kind: 'item' }
]) {
  test(`${scenario.file} forwards each original result once to Item Piles`, async () => {
    const table = { id: 'table', name: '🧪 Potions and Poisons',
      roll: async () => ({ results: [{ documentUuid: 'Item.test', name: 'Example' }] }) };
    const lootFolder = { id: 'loot', name: 'Loot', type: 'RollTable', contents: [table] };
    const spellsFolder = { id: 'spells', name: 'Spells', type: 'RollTable', folder: lootFolder, contents: [table] };
    const results = [];
    let finished = 0;
    const collector = { add: (value, kind = 'item') => results.push({ value, kind }), finish: async () => finished++ };
    const messages = [];
    const context = {
      console, scope: { lootCollector: collector, claimerName: 'Hero' },
      game: {
        user: { isGM: true, name: 'GM' },
        folders: [lootFolder, spellsFolder], items: new Map(),
        settings: { settings: new Map(), register() {}, get: () => scenario.preset, set: async () => {} }
      },
      fromUuid: async () => ({ uuid: 'Item.test', name: 'Example', img: 'example.png' }),
      ChatMessage: { create: async data => messages.push(data), getSpeaker: () => ({}) },
      TextEditor: { enrichHTML: async text => text },
      ui: { notifications: { warn() {}, error() {} } }
    };
    vm.createContext(context);
    const source = fs.readFileSync(`macros/${scenario.file}.js`, 'utf8');
    await vm.runInContext(`(async (scope) => { ${source}\n})(scope)`, context);
    assert.equal(results.length, 2);
    assert.ok(results.every(entry => entry.kind === scenario.kind));
    assert.equal(finished, 1);
    assert.ok(messages.length > 0);
  });
}

test('Treasure Hoard forwards art table results as art through nested tables', async () => {
  const results = [];
  const artResult = { type: 'document', documentCollection: 'Item', name: 'Statuette' };
  const gemResult = { type: 'document', documentCollection: 'Item', name: 'Gem' };
  const lootFolder = { id: 'loot', name: 'Loot', type: 'RollTable', contents: [] };
  const artTable = { id: 'art', name: '250 GP Art Objects', folder: lootFolder,
    roll: async () => ({ results: [{ type: 'document', documentCollection: 'RollTable', documentId: 'nested' }] }) };
  const nestedTable = { id: 'nested', name: 'Nested artwork', folder: lootFolder,
    roll: async () => ({ results: [artResult] }) };
  const gemTable = { id: 'gem', name: '50 GP Gemstones', folder: lootFolder,
    roll: async () => ({ results: [gemResult] }) };
  lootFolder.contents = [artTable, nestedTable, gemTable];
  const context = {
    console, Math: Object.assign(Object.create(Math), { random: () => 0.9 }),
    scope: { lootCollector: { add: (value, kind = 'item', options) => results.push({ value, kind, options }), finish: async () => {} } },
    game: {
      user: { isGM: false, name: 'Player' }, folders: [lootFolder], tables: lootFolder.contents,
      settings: { settings: new Map(), register() {}, get: () => ({ count: 1, tier: 1 }) }
    },
    Roll: class { async evaluate() { return { total: 1 }; } },
    ChatMessage: { create: async () => {}, getSpeaker: () => ({}) },
    TextEditor: { enrichHTML: async text => text }
  };
  vm.createContext(context);
  const source = fs.readFileSync('macros/Treasure_Hoard.js', 'utf8');
  await vm.runInContext(`(async (scope) => { ${source}\n})(scope)`, context);
  assert.equal(results.length, 2);
  assert.equal(results.find(entry => entry.value === artResult).kind, 'art');
  assert.equal(results.find(entry => entry.value === artResult).options.tableName, '250 GP Art Objects');
  assert.equal(results.find(entry => entry.value === gemResult).kind, 'gem');
  assert.equal(results.find(entry => entry.value === gemResult).options.tableName, '50 GP Gemstones');
});

test('Individual Treasure forwards gem category and source table', async () => {
  const results = [];
  const gem = { name: 'Ruby', documentUuid: 'Item.ruby' };
  const table = { name: '500 GP Gemstones', roll: async () => ({ results: [gem] }) };
  const folder = { name: 'Loot', type: 'RollTable', contents: [table] };
  const context = {
    console, Math: Object.assign(Object.create(Math), { random: () => 0 }),
    scope: { lootCollector: { add: (value, kind, options) => results.push({ value, kind, options }), finish: async () => {} } },
    game: { user: { isGM: false }, folders: [folder],
      settings: { settings: new Map(), register() {}, get: () => ({ counts: { 'range-0-4': 1 } }) } },
    Roll: class { async evaluate() { return { total: 4 }; } },
    ChatMessage: { create: async () => {}, getSpeaker: () => ({}) },
    TextEditor: { enrichHTML: async text => text }
  };
  vm.createContext(context);
  const source = fs.readFileSync('macros/Individual_Treasure.js', 'utf8');
  await vm.runInContext(`(async (scope) => { ${source}\n})(scope)`, context);
  assert.equal(results.length, 1);
  assert.equal(results[0].value, gem);
  assert.equal(results[0].kind, 'gem');
  assert.equal(results[0].options.tableName, '500 GP Gemstones');
});

test('Treasure Hoard uses English fallback messages for unavailable results', async () => {
  const context = {
    scope: {},
    game: { folders: [], tables: [] }
  };
  vm.createContext(context);
  const source = fs.readFileSync('macros/Treasure_Hoard.js', 'utf8')
    .replace('const usedPreset = await runWithPreset();', 'return { resolveTableRoll };\nconst usedPreset = await runWithPreset();');
  const { resolveTableRoll } = await vm.runInContext(`(async (scope) => { ${source}\n})(scope)`, context);
  assert.equal(await resolveTableRoll(null), 'Unknown item');
  assert.equal(await resolveTableRoll({}, 6), 'Unknown item');
  assert.equal(await resolveTableRoll({ roll: async () => ({ results: [] }) }), 'Empty result');
  assert.equal(await resolveTableRoll({ id: 'table', roll: async () => ({ results: [{}] }) }), 'Unknown result');
});
