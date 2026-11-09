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
