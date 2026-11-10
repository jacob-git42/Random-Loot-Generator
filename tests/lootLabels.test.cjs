const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture() {
  const hooks = {};
  class Container {
    constructor() {
      this.children = [];
      this.position = { set: (x, y) => { this.x = x; this.y = y; } };
    }
    addChild(...children) { this.children.push(...children); }
    destroy() {
      this.destroyed = true;
      if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
    }
  }
  class Text {
    constructor(text, style) {
      this.text = text;
      this.style = style;
      this.unscaledWidth = text.length * style.fontSize * 0.6;
      this.unscaledHeight = style.fontSize;
      this.factor = 1;
      this.scale = { set: value => { this.factor = value; } };
      this.position = { set: (x, y) => { this.x = x; this.y = y; } };
    }
    get width() { return this.unscaledWidth * this.factor; }
    get height() { return this.unscaledHeight * this.factor; }
  }
  class Graphics {
    lineStyle(width, color) { this.border = color; }
    beginFill(color) { this.background = color; }
    drawRect(x, y, width, height) { this.width = width; this.height = height; }
    endFill() {}
  }
  const token = {
    w: 100, h: 100, children: [],
    document: { getFlag: () => token.data },
    addChild(child) { child.parent = this; this.children.push(child); }
  };
  const context = {
    Hooks: { on: (name, callback) => { hooks[name] = callback; } },
    canvas: { tokens: { placeables: [token] } },
    PIXI: { Container, Text, Graphics }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/lootLabels.js', 'utf8'), context);
  return { hooks, token };
}

test('draws each rarity with its specified colors inside the grid field', () => {
  const f = fixture();
  const colors = {
    common: [0x141400, 0xDCDCDC], uncommon: [0x050828, 0xDCDCDC],
    rare: [0xD59F00, 0x000000], veryRare: [0xFF9619, 0x000000],
    legendary: [0xAF6025, 0xFFFFFF], artifact: [0x262626, 0x77ed91],
    unknown: [0x141400, 0xDCDCDC]
  };
  for (const [rarity, [background, foreground]] of Object.entries(colors)) {
    f.token.data = { rarity, name: 'An exceptionally long name for a magical treasure item' };
    f.hooks.drawToken(f.token);
    assert.equal(f.token.children.length, 1);
    const label = f.token.children[0];
    const [box, text] = label.children;
    assert.equal(box.background, background);
    assert.equal(box.border, foreground);
    assert.equal(text.style.fill, foreground);
    assert.equal(text.style.fontWeight, ['veryRare', 'legendary', 'artifact'].includes(rarity) ? 'bold' : 'normal');
    assert.equal(text.x, (box.width - text.width) / 2);
    assert.equal(label.x, (f.token.w - box.width) / 2);
    assert.equal(label.y, (f.token.h - box.height) / 2);
    assert.equal(text.style.wordWrap, false);
  }
});

test('removes only a nonempty spell scroll prefix from displayed names', () => {
  const f = fixture();
  for (const [name, expected] of [
    ['Spell Scroll: Fireball', 'Fireball'],
    ['spell scroll:   Shield', 'Shield'],
    ['Spell Scroll:', 'Spell Scroll:'],
    ['Scroll of Protection', 'Scroll of Protection'],
    ['Sword', 'Sword']
  ]) {
    f.token.data = { name };
    f.hooks.drawToken(f.token);
    assert.equal(f.token.children[0].children[1].text, expected);
    assert.equal(f.token.data.name, name);
  }
});

test('redraws on scene load and leaves unrelated tokens alone', () => {
  const f = fixture();
  f.token.data = { name: 'Potion', rarity: 'rare' };
  f.hooks.drawToken(f.token);
  const first = f.token.children[0];
  f.hooks.canvasReady();
  assert.equal(first.destroyed, true);
  assert.equal(f.token.children.length, 1);
  f.token.data = undefined;
  f.hooks.drawToken(f.token);
  assert.equal(f.token.children.length, 0);
});
