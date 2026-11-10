const MODULE_ID = 'jacobs-loot-generator';

const STYLES = {
  common:    { background: 0x141400, foreground: 0xDCDCDC, weight: 'normal', bgAlpha: 0.85  },
  uncommon:  { background: 0x141400, foreground: 0x5A5AFF, weight: 'normal', bgAlpha: 0.85 },
  rare:      { background: 0x141400, foreground: 0xD59F00, weight: 'normal', bgAlpha: 0.85 },
  veryRare:  { background: 0x141400, foreground: 0xAF6025, weight: 'bold', bgAlpha: 0.85 },
  legendary: { background: 0xFFFFFF, foreground: 0xAF6025, weight: 'bold', bgAlpha: 0.85 },
  artifact:  { background: 0xFFFFFF, foreground: 0xFF0000, weight: 'bold', bgAlpha: 0.85 }
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
    fontFamily: 'Roboto Condensed',
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
  background.beginFill(style.background, style.bgAlpha);
  background.drawRect(0, 0, width, height);
  background.endFill();
  text.position.set((width - text.width) / 2, padding);

  const label = new PIXI.Container();
  label.eventMode = 'none';
  label.addChild(background, text);
  label.position.set((token.w - width) / 2, (token.h - height) - 10 );
  token.addChild(label);
  labels.set(token, label);
}

Hooks.on('drawToken', drawLootLabel);
Hooks.on('canvasReady', () => {
  for (const token of canvas.tokens.placeables) drawLootLabel(token);
});
