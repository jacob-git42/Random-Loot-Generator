const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture() {
  const calls = [];
  const messages = [];
  const warnings = [];
  const token = { id: 'hero', center: { x: 50, y: 50 }, w: 100, h: 100, document: { x: 0, y: 0 } };
  const item = (name, type = 'equipment') => ({
    name, type, documentName: 'Item', img: `${name}.png`,
    toObject() { return { name, type, img: this.img, system: { properties: [] } }; }
  });
  const documents = new Map([
    ['Item.sword', item('Sword', 'weapon')],
    ['Item.spell', item('Fireball', 'spell')],
    ['Item.potion', item('Potion')]
  ]);
  const grid = {
    size: 100,
    getOffset: ({ x, y }) => ({ i: Math.floor(y / 100), j: Math.floor(x / 100) }),
    getCenterPoint: ({ i, j }) => ({ x: j * 100 + 50, y: i * 100 + 50 }),
    getTopLeftPoint: ({ i, j }) => ({ x: j * 100, y: i * 100 })
  };
  const context = {
    console, Math,
    Hooks: { once() {} },
    CONST: { GRID_TYPES: { GRIDLESS: 0 }, TOKEN_DISPLAY_MODES: { NONE: 0 } },
    CONFIG: { Canvas: { polygonBackends: { sight: { create: () => ({ contains: x => x >= 0 }) } } } },
    canvas: {
      ready: true, scene: { id: 'scene', grid: { type: 1, distance: 5 } }, grid,
      dimensions: { sceneRect: { contains: () => true } },
      tokens: { placeables: [token], get: id => id === token.id ? token : null }
    },
    fromUuid: async uuid => documents.get(uuid),
    Item: { implementation: class {
      constructor(data) { Object.assign(this, data); }
      static async createScrollFromSpell(spell, options, config) {
        assert.equal(config.dialog, false);
        return item(`Scroll of ${spell.name}`).toObject();
      }
    } },
    game: {
      items: [], packs: [], tables: [],
      itempiles: { API: { createItemPile: async options => {
        calls.push(options);
        if (options.items[0].item.name === 'Potion') throw new Error('Pile failed');
        return { tokenUuid: `Scene.scene.Token.${calls.length}` };
      } } }
    },
    ChatMessage: { create: async data => messages.push(data), getSpeaker: () => ({}) },
    ui: { notifications: { warn: text => warnings.push(text) } }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/itemPiles.js', 'utf8') +
    '\nglobalThis.testAPI = { createLootCollector, availablePositions, resolveItem };', context);
  return { ...context.testAPI, calls, messages, warnings, documents, context, item, token };
}

test('places individual items, makes scrolls and reports failures without stopping', async () => {
  const f = fixture();
  const collector = f.createLootCollector({ tokenId: 'hero', sceneId: 'scene' });
  collector.add({ documentUuid: 'Item.sword', name: 'Sword' });
  collector.add({ description: '@UUID[Item.spell]{Fireball}' }, 'spell');
  collector.add({ documentUuid: 'Item.missing', name: 'Missing' });
  collector.add({ documentUuid: 'Item.potion', name: 'Potion' });
  await collector.finish();
  assert.equal(f.calls.length, 3);
  assert.equal(f.calls[0].items[0].item.name, 'Sword');
  assert.equal(f.calls[1].items[0].item.name, 'Scroll of Fireball');
  assert.equal(f.calls[0].tokenOverrides.texture.src, 'Sword.png');
  assert.equal(f.calls[0].tokenOverrides.texture.scaleX, 0.5);
  assert.equal(f.calls[0].tokenOverrides.texture.scaleY, 0.5);
  assert.equal(f.calls[0].tokenOverrides.displayName, f.context.CONST.TOKEN_DISPLAY_MODES.NONE);
  assert.equal(f.calls[0].itemPileFlags.overrideSingleItemScale, true);
  assert.equal(f.calls[0].itemPileFlags.singleItemScale, 0.5);
  assert.equal(f.calls[0].itemPileFlags.deleteWhenEmpty, true);
  assert.equal(f.calls[0].tokenOverrides.flags['jacobs-loot-generator'].lootLabel.name, 'Sword');
  assert.notDeepEqual(f.calls[0].position, f.calls[1].position);
  for (const call of f.calls) {
    assert.ok(call.position.x >= 0);
    assert.notDeepEqual(call.position, { x: 0, y: 0 });
  }
  assert.match(f.messages[0].content, /2\/4 items placed/);
  assert.match(f.messages[0].content, /Missing/);
  assert.match(f.messages[0].content, /Pile failed/);
  assert.equal(f.warnings.length, 1);
});

test('stores the prepared item name and rarity in the pile token', async () => {
  const f = fixture();
  f.context.Item.implementation = class {
    constructor(data) {
      this.name = `${data.name} +1`;
      this.system = { rarity: 'uncommon' };
    }
  };
  const collector = f.createLootCollector({ tokenId: 'hero', sceneId: 'scene' });
  collector.add({ documentUuid: 'Item.sword', name: 'Sword' });
  await collector.finish();
  const label = f.calls[0].tokenOverrides.flags['jacobs-loot-generator'].lootLabel;
  assert.equal(label.name, 'Sword +1');
  assert.equal(label.rarity, 'uncommon');
});

test('labels art by table category or loot type without changing items', async () => {
  const f = fixture();
  const artwork = f.item('Carved bone statuette', 'loot');
  const typedArt = f.item('Silver necklace', 'loot');
  typedArt.toObject = () => ({
    name: typedArt.name, type: 'loot', img: typedArt.img, system: { type: { value: 'art' } }
  });
  const ordinaryLoot = f.item('Gemstone', 'loot');
  f.documents.set('Item.art', artwork);
  f.documents.set('Item.typed-art', typedArt);
  f.documents.set('Item.gem', ordinaryLoot);
  const collector = f.createLootCollector({ tokenId: 'hero', sceneId: 'scene' });
  collector.add({ documentUuid: 'Item.art', name: artwork.name }, 'art');
  collector.add('Item.typed-art');
  collector.add({ documentUuid: 'Item.gem', name: ordinaryLoot.name });
  await collector.finish();
  assert.deepEqual(f.calls.map(call => call.tokenOverrides.flags['jacobs-loot-generator'].lootLabel.name),
    ['Art Object', 'Art Object', 'Gemstone']);
  assert.deepEqual(f.calls.map(call => call.items[0].item.name),
    ['Carved bone statuette', 'Silver necklace', 'Gemstone']);
  assert.match(f.messages[0].content, /Carved bone statuette/);
});

test('reports every item when the GM changes scenes', async () => {
  const f = fixture();
  const collector = f.createLootCollector({ tokenId: 'hero', sceneId: 'old-scene' });
  collector.add({ documentUuid: 'Item.sword', name: 'Sword' });
  await collector.finish();
  assert.equal(f.calls.length, 0);
  assert.match(f.messages[0].content, /active scene changed/);
});

test('only selects visible cells within 25 feet and excludes the revealing token', () => {
  const f = fixture();
  const positions = f.availablePositions(f.token);
  assert.ok(positions.length > 0);
  for (const { point } of positions) {
    assert.ok(point.x >= 0);
    assert.ok(Math.hypot(point.x - 50, point.y - 50) <= 500);
    assert.notDeepEqual({ x: point.x, y: point.y }, f.token.center);
  }
});

test('overlaps item piles when all free positions are occupied', () => {
  const f = fixture();
  f.context.canvas.dimensions.sceneRect.contains = (x, y) => x === 150 && y === 50;
  f.context.canvas.tokens.placeables.push({
    id: 'existing', w: 100, h: 100, document: { x: 100, y: 0 }
  });
  const positions = f.availablePositions(f.token);
  assert.equal(positions.length, 1);
  assert.equal(positions[0].occupied, true);
});

test('applies the selected +2 system profile to a base weapon', async () => {
  const f = fixture();
  const effect = name => ({
    name,
    clone: () => ({ toObject: () => ({
      name, system: { changes: [{ key: 'system.magicalBonus', value: name.endsWith('+2') ? '2' : '1' }] }
    }) })
  });
  const activity = {
    type: 'enchant', uuid: 'Activity.weapon',
    effects: [{ _id: 'one' }, { _id: 'two' }],
    canEnchant: () => true, getAppliedEffectChanges: () => ({})
  };
  f.documents.set('Item.template', {
    name: 'Weapon, +1, +2, or +3', type: 'weapon', documentName: 'Item',
    system: { activities: [activity] }, effects: new Map([['one', effect('Weapon +1')], ['two', effect('Weapon +2')]])
  });
  f.context.Item.implementation = function(data) { Object.assign(this, data); };
  f.context.ActiveEffect = { implementation: { forApplication: async changes => changes } };
  f.context.foundry = { utils: { randomID: () => 'id', mergeObject: obj => obj } };
  f.context.game.tables.push({
    name: 'Weapons', folder: { name: 'Loot' },
    roll: async () => ({ results: [{ documentUuid: 'Item.sword', name: 'Sword' }] })
  });
  const data = await f.resolveItem({ description: '@UUID[Item.template]{Weapon, +2}' }, 'item');
  assert.equal(data.name, 'Sword');
  assert.equal(data.effects[0].name, 'Weapon +2');
  assert.equal(data.effects[0].system.changes[0].value, '2');
  assert.equal(data.img, 'Sword.png');
});

test('all ammunition table entries use the requested +1, +2 or +3 profile', async () => {
  const table = JSON.parse(fs.readFileSync('roll_tables/Ammunition.json', 'utf8'));
  const manifest = JSON.parse(fs.readFileSync('roll_tables/manifest.json', 'utf8'));
  assert.ok(manifest.includes('Ammunition.json'));
  assert.ok(table.results.length > 1);
  for (const result of table.results) {
    for (const bonus of [1, 2, 3]) {
      const f = fixture();
      const effects = new Map([1, 2, 3].map(value => {
        const name = `Ammunition +${value}`;
        return [String(value), {
          name,
          clone: () => ({ toObject: () => ({
            name, system: { changes: [{ key: 'system.magicalBonus', value: String(value) }] }
          }) })
        }];
      }));
      const activity = {
        type: 'enchant', uuid: 'Activity.ammunition',
        effects: [1, 2, 3].map(value => ({ _id: String(value) })),
        canEnchant: () => true, getAppliedEffectChanges: () => ({})
      };
      f.documents.set('Item.ammunition', {
        name: 'Ammunition, +1, +2, or +3', type: 'consumable', documentName: 'Item',
        system: { activities: [activity] }, effects
      });
      f.documents.set(result.documentUuid, f.item(result.name, 'consumable'));
      f.context.game.tables.push({ name: table.name, folder: { name: 'Loot' }, results: [result] });
      f.context.Item.implementation = function(data) { Object.assign(this, data); };
      f.context.ActiveEffect = { implementation: { forApplication: async changes => changes } };
      f.context.foundry = { utils: { randomID: () => 'id', mergeObject: obj => obj } };
      const data = await f.resolveItem({
        description: `@UUID[Item.ammunition]{Ammunition, +${bonus}}`
      }, 'item');
      assert.equal(data.name, result.name);
      assert.equal(data.effects[0].name, `Ammunition +${bonus}`);
      assert.equal(data.effects[0].system.changes[0].value, String(bonus));
    }
  }
});

test('demon armor can select every base armor and reports its unsupported rider', async () => {
  const table = JSON.parse(fs.readFileSync('roll_tables/Armor.json', 'utf8'));
  assert.ok(table.results.length > 1);
  for (const result of table.results) {
    const f = fixture();
    const label = result.description.match(/\{([^}]+)\}/)[1];
    const uuid = result.description.match(/@UUID\[([^\]]+)\]/)[1];
    f.documents.set(uuid, f.item(label));
    let selected;
    const source = { clone: () => ({ toObject: () => ({ system: { changes: [] } }) }) };
    const activity = {
      type: 'enchant', uuid: 'Activity.demon',
      effects: [{ _id: 'profile', riders: { item: ['Compendium.dnd5e.equipment24.Item.dmgClawedGauntle'] } }],
      canEnchant: target => { selected = target.name; return true; },
      getAppliedEffectChanges: () => ({})
    };
    f.documents.set('Item.demon', {
      name: 'Demon Armor', type: 'equipment', documentName: 'Item',
      system: { activities: [activity] }, effects: new Map([['profile', source]])
    });
    f.context.game.tables.push({ name: 'Armor', folder: { name: 'Loot' }, results: [result] });
    f.context.Item.implementation = function(data) { Object.assign(this, data); };
    f.context.ActiveEffect = { implementation: { forApplication: async changes => changes } };
    f.context.foundry = { utils: { randomID: () => 'id', mergeObject: obj => obj } };
    await assert.rejects(() => f.resolveItem({ documentUuid: 'Item.demon', name: 'Demon Armor' }, 'item'),
      /requires additional activities or items/);
    assert.equal(selected, label);
  }
});

test('reports an enchantment with no suitable base table', async () => {
  const f = fixture();
  f.documents.set('Item.warning', f.item('Weapon of Warning', 'weapon'));
  await assert.rejects(() => f.resolveItem({ documentUuid: 'Item.warning', name: 'Weapon of Warning' }, 'item'),
    /Base item table not found/);
});

test('copies a system enchantment and its rider to a valid random base', async () => {
  const f = fixture();
  const source = { clone: () => ({ toObject: () => ({
    _id: 'enchantment', type: 'enchantment', system: { changes: [
      { key: 'name', value: '{} of Warning' }, { key: 'img', value: 'template.png' }
    ] }, flags: {}
  }) }) };
  const rider = { toObject: () => ({ name: 'Initiative advantage', flags: {}, system: {} }) };
  const activity = {
    type: 'enchant', uuid: 'Activity.warning',
    effects: [{ _id: 'profile', riders: { effect: ['rider'], activity: [], item: [] } }],
    canEnchant: () => true,
    getAppliedEffectChanges: () => ({})
  };
  f.documents.set('Item.warning', {
    name: 'Weapon of Warning', type: 'weapon', documentName: 'Item',
    system: { activities: [activity] }, effects: new Map([['profile', source], ['rider', rider]])
  });
  f.context.game.tables.push({
    name: 'Weapons', folder: { name: 'Loot' },
    results: [{ documentUuid: 'Item.sword', name: 'Sword' }]
  });
  f.context.Item.implementation = function(data) { Object.assign(this, data); };
  f.context.ActiveEffect = { implementation: { forApplication: async changes => changes } };
  let id = 0;
  f.context.foundry = { utils: { randomID: () => `id${++id}`, mergeObject: obj => obj } };
  const data = await f.resolveItem({ documentUuid: 'Item.warning', name: 'Weapon of Warning' }, 'item');
  assert.equal(data.img, 'Sword.png');
  assert.equal(data.effects.length, 2);
  assert.equal(data.effects[0].system.changes.length, 1);
  assert.equal(data.effects[1].flags.dnd5e.dependentOn, data.effects[0]._id);
});
