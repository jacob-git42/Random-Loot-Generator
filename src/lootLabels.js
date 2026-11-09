const MODULE_ID = 'jacobs-loot-generator';

const STYLES = {
  common:    { background: 0x262626, foreground: 0xf3f3f3, weight: 'normal' },
  uncommon:  { background: 0x262626, foreground: 0x91cfff, weight: 'normal' },
  rare:      { background: 0x262626, foreground: 0xffe66d, weight: 'normal' },
  veryRare:  { background: 0xd5d5d5, foreground: 0x705000, weight: 'normal' },
  legendary: { background: 0xd5d5d5, foreground: 0x7d390d, weight: 'bold' },
  artifact:  { background: 0x262626, foreground: 0x77ed91, weight: 'normal' }
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
  const margin = Math.max(1, Math.min(token.w, token.h) * 0.01);
  const maxWidth = token.w - 2 * margin;
  const maxHeight = token.h * 0.45;
  const padding = Math.max(2, Math.min(token.w, token.h) * 0.025);
  if (maxWidth <= padding * 2 || maxHeight <= padding * 2) return;
  const fontSize = Math.max(8, Math.min(14, token.h * 0.13));
  const name = data.name.replace(/^spell scroll:\s*(?=\S)/i, '');
  const text = new PIXI.Text(name, {
    fontFamily: 'Arial, sans-serif',
    fontSize,
    fontWeight: style.weight,
    fill: style.foreground,
    align: 'center',
    wordWrap: true,
    wordWrapWidth: Math.max(1, maxWidth - padding * 2),
    breakWords: true
  });
  const scale = Math.min(1, (maxWidth - padding * 2) / text.width, (maxHeight - padding * 2) / text.height);
  text.scale.set(scale);
  const width = maxWidth;
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
  label.position.set((token.w - width) / 2, token.h - margin - height);
  token.addChild(label);
  labels.set(token, label);
}

Hooks.on('drawToken', drawLootLabel);
Hooks.on('canvasReady', () => {
  for (const token of canvas.tokens.placeables) drawLootLabel(token);
});
