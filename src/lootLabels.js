const MODULE_ID = 'jacobs-loot-generator';

const STYLES = {
  common:    { background: 0x141400, foreground: 0xDCDCDC, weight: 'normal' },
  uncommon:  { background: 0x050828, foreground: 0xDCDCDC, weight: 'normal' },
  rare:      { background: 0xD59F00, foreground: 0x000000, weight: 'normal' },
  veryRare:  { background: 0xFF9619, foreground: 0x000000, weight: 'bold' },
  legendary: { background: 0xAF6025, foreground: 0xFFFFFF, weight: 'bold' },
  artifact:  { background: 0x262626, foreground: 0x77ed91, weight: 'bold' }
};

const labels = new WeakMap();

function drawLootLabel(token) {
  const previous = labels.get(token);
  if (previous) {
    if (!previous.destroyed) previous.destroy({ children: true });
    labels.delete(token);
  }

  const data = token.document.getFlag(MODULE_ID, 'lootLabel');
  if (!data?.name || !(token.w > 0) || !(token.h > 0)) return;

  const style = Object.hasOwn(STYLES, data.rarity) ? STYLES[data.rarity] : STYLES.common;
  const padding = Math.max(2, Math.min(token.w, token.h) * 0.025);
  const fontSize = Math.max(8, Math.min(14, token.h * 0.13));
  const name = data.name.replace(/^spell scroll:\s*(?=\S)/i, '');
  const text = new PIXI.Text(name, {
    fontFamily: 'Arial, sans-serif',
    fontSize,
    fontWeight: style.weight,
    fill: style.foreground,
    align: 'center',
    wordWrap: false
  });
  const width = text.width + padding * 2;
  const height = text.height + padding * 2;
  const background = new PIXI.Graphics();
  background.lineStyle(1, style.foreground, 1);
  background.beginFill(style.background, 0.95);
  background.drawRect(0, 0, width, height);
  background.endFill();
  text.position.set((width - text.width) / 2, padding);

  const label = new PIXI.Container();
  label.eventMode = 'none';
  label.addChild(background, text);
  label.position.set((token.w - width) / 2, (token.h - height) / 2);
  token.addChild(label);
  labels.set(token, label);
}

Hooks.on('drawToken', drawLootLabel);
Hooks.on('canvasReady', () => {
  for (const token of canvas.tokens.placeables) drawLootLabel(token);
});
