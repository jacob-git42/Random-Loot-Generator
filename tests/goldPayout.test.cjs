const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('gold payout reports missing configuration and characters in English', async () => {
  const warnings = [];
  const context = {
    Hooks: { once() {}, on() {} },
    ui: { notifications: { warn: message => warnings.push(message) } },
    game: { actors: new Map() }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/goldPayout.js', 'utf8') +
    '\nglobalThis.processGoldPayout = processGoldPayout;', context);

  assert.equal(await context.processGoldPayout(10, {}), false);
  assert.equal(warnings[0], 'No players configured for gold payout.');
  const result = await context.processGoldPayout(10, { user: { characterId: 'missing', characterName: 'Hero' } });
  assert.equal(result.failed, 1);
  assert.equal(result.details[0], '❌ Hero: Character not found');
});
