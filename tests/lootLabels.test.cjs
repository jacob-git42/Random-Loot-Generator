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
      this.unscaledWidth = Math.min(style.wordWrapWidth, text.length * style.fontSize * 0.6);
      this.unscaledHeight = Math.ceil(text.length * style.fontSize * 0.6 / style.wordWrapWidth) * style.fontSize;
      this.factor = 1;
      this.scale = { set: value => { this.factor = value; } };
      this.position = { set() {} };
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
    common: [0x262626, 0xf3f3f3], uncommon: [0x262626, 0x91cfff],
    rare: [0x262626, 0xffe66d], veryRare: [0xd5d5d5, 0x705000],
    legendary: [0xd5d5d5, 0x7d390d], artifact: [0x262626, 0x77ed91],
    unknown: [0x262626, 0xf3f3f3]
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
    assert.equal(text.style.fontWeight, rarity === 'legendary' ? 'bold' : 'normal');
    assert.ok(label.x >= 0 && label.x + box.width <= f.token.w);
    assert.ok(label.y >= 0 && label.y + box.height <= f.token.h);
    assert.ok(text.style.wordWrap && text.style.breakWords);
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
