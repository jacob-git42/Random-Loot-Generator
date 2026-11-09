const MODULE_ID = 'jacobs-loot-generator';
const RADIUS = 25;

function textOf(result) {
  if (typeof result === 'string') return result;
  return result?.description || result?.name || '';
}

function labelOf(result) {
  const text = textOf(result);
  const label = text.match(/@(?:UUID|Compendium)\[[^\]]+\]\{([^}]+)\}/i)?.[1]
    || text.match(/@item\[([^\]|]+)/i)?.[1];
  return (label || text.replace(/<[^>]*>/g, '').trim() || 'Unknown item').trim();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

async function findItem(result) {
  const text = textOf(result);
  let uuid = result?.documentUuid || text.match(/@(?:UUID|Compendium)\[([^\]]+)\]/i)?.[1];
  if (!uuid && typeof result === 'string' && /^(?:Item|Compendium)\./.test(result)) uuid = result;
  if (uuid) {
    const document = await fromUuid(uuid);
    if (!document) throw new Error(`Document not found: ${uuid}`);
    if (document.documentName !== 'Item') throw new Error(`Not an Item: ${uuid}`);
    return document;
  }
  const name = labelOf(result).toLowerCase();
  const worldItem = game.items.find(item => item.name.toLowerCase() === name);
  if (worldItem) return worldItem;
  for (const pack of game.packs) {
    if (pack.documentName !== 'Item') continue;
    try {
      const index = await pack.getIndex();
      const entry = index.find(item => item.name.toLowerCase() === name);
      if (entry) return await pack.getDocument(entry._id);
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not search item pack ${pack.collection}:`, error);
    }
  }
  throw new Error(`Item not found: ${labelOf(result)}`);
}

async function rollBaseItem(tableName, accept = () => true) {
  const table = game.tables.find(t => t.name === tableName && t.folder?.name === 'Loot');
  if (!table) throw new Error(`Base item table not found: ${tableName}`);
  const candidates = table.results?.filter(accept);
  if (candidates && !candidates.length) throw new Error(`No suitable base item in ${tableName}`);
  const result = candidates
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : (await table.roll()).results[0];
  if (!result) throw new Error(`Base item table is empty: ${tableName}`);
  return findItem(result);
}

async function applyEnchantment(template, base, selectProfile) {
  const activity = template.system?.activities?.find(activity => activity.type === 'enchant');
  if (!activity) throw new Error(`No system enchantment activity found for ${template.name}`);
  const profiles = activity.effects.filter(profile => template.effects.get(profile._id));
  const profile = selectProfile ? profiles.find(selectProfile) : profiles[Math.floor(Math.random() * profiles.length)];
  if (!profile) throw new Error(`No matching enchantment profile found for ${template.name}`);
  const sourceEffect = template.effects.get(profile._id);
  const target = new Item.implementation(base.toObject());
  const errors = activity.canEnchant(target);
  if (errors !== true && errors?.length) throw new Error(`Base item ${base.name} cannot accept ${template.name}`);
  const changes = activity.getAppliedEffectChanges(sourceEffect, { target });
  const effect = sourceEffect.clone(foundry.utils.mergeObject({
    'flags.dnd5e': { enchantmentProfile: profile._id },
    system: { origin: { activity: activity.uuid, profile: profile._id } },
    disabled: false,
    transfer: true
  }, changes)).toObject();
  effect.system.changes = await ActiveEffect.implementation.forApplication(effect.system.changes, activity, target);
  effect.system.changes = effect.system.changes.filter(change => change.key !== 'img');
  effect._id = foundry.utils.randomID();
  const data = base.toObject();
  data.effects = [...(data.effects || []), effect];
  for (const id of profile.riders?.effect || []) {
    const rider = template.effects.get(id);
    if (!rider) throw new Error(`Missing enchantment effect for ${template.name}`);
    const riderData = rider.toObject();
    riderData._id = foundry.utils.randomID();
    riderData.flags ??= {};
    riderData.flags.dnd5e ??= {};
    riderData.flags.dnd5e.dependentOn = effect._id;
    data.effects.push(riderData);
  }
  if (profile.riders?.activity?.length || profile.riders?.item?.length) {
    throw new Error(`Enchantment requires additional activities or items: ${template.name}`);
  }
  return data;
}

async function resolveItem(result, kind) {
  const label = labelOf(result);
  const wand = label.match(/^(?:\+([123])\s+wand of the war mage|wand of the war mage,\s*\+([123]))$/i);
  let item = wand
    ? await fromUuid('Compendium.dnd5e.equipment24.Item.dmg1WandOfTheWar')
    : await findItem(result);
  if (!item) throw new Error(`Item template not found: ${label}`);
  const scrollLevel = label.match(/^spell scroll,\s*(cantrip|[1-9](?:st|nd|rd|th) level)$/i);
  if (scrollLevel) {
    const level = scrollLevel[1].toLowerCase() === 'cantrip' ? 0 : parseInt(scrollLevel[1], 10);
    const table = game.tables.find(t => t.name === `Spells - Level ${level}`);
    if (!table) throw new Error(`Spell table for level ${level} not found`);
    const spellResult = (await table.roll()).results[0];
    if (!spellResult) throw new Error(`Spell table for level ${level} is empty`);
    return resolveItem(spellResult, 'spell');
  }
  if (item.type === 'spell') {
    const scroll = await Item.implementation.createScrollFromSpell(item, {}, { dialog: false });
    if (!scroll) throw new Error(`Scroll creation failed: ${label}`);
    return typeof scroll.toObject === 'function' ? scroll.toObject() : scroll;
  }
  if (kind === 'spell') throw new Error(`Result is not a spell: ${label}`);

  if (wand) {
    const bonus = Number(wand[1] || wand[2]);
    const base = await fromUuid('Compendium.dnd5e.equipment24.Item.phbafcWand000000');
    if (!base) throw new Error(`Base wand not found for ${label}`);
    return applyEnchantment(item, base, profile => {
      const effect = item.effects.get(profile._id);
      return effect && new RegExp(`\\+${bonus}(?!\\d)`).test(effect.name);
    });
  }
  const plus = label.match(/^(weapon|armor|shield|ammunition),?\s*\+([123])$/i);
  if (plus) {
    const category = plus[1].toLowerCase();
    const bonus = Number(plus[2]);
    let base;
    if (category === 'shield') {
      base = await fromUuid('Compendium.dnd5e.equipment24.Item.phbarmShield0000');
    } else if (category === 'ammunition') {
      base = await rollBaseItem('Ammunition');
    } else {
      base = await rollBaseItem(category === 'weapon' ? 'Weapons' : 'Armor');
    }
    if (!base) throw new Error(`Base item not found for ${label}`);
    return applyEnchantment(item, base, profile => {
      const effect = item.effects.get(profile._id);
      return effect && new RegExp(`\\+${bonus}(?!\\d)`).test(effect.name);
    });
  }

  if (/^(weapon of warning|adamantine armor|armor of resistance|vicious weapon|demon armor|defender|elven chain)$/i.test(label)) {
    const weapon = /weapon|defender/i.test(label);
    let accept = () => true;
    if (/adamantine/i.test(label)) {
      accept = result => /breastplate|chain|half plate|scale|plate|ring mail|splint/i.test(labelOf(result));
    } else if (/^defender$/i.test(label)) {
      accept = result => /longsword|greatsword|shortsword|scimitar|rapier/i.test(labelOf(result));
    } else if (/^elven chain$/i.test(label)) {
      accept = result => /^chain shirt$/i.test(labelOf(result));
    }
    const base = await rollBaseItem(weapon ? 'Weapons' : 'Armor', accept);
    return applyEnchantment(item, base);
  }
  return item.toObject();
}

function availablePositions(token) {
  if (!canvas.ready || !canvas.scene || !canvas.grid?.getOffset || !canvas.grid?.getCenterPoint) {
    throw new Error('Active gridded scene is required for item placement.');
  }
  if (canvas.scene.grid.type === CONST.GRID_TYPES.GRIDLESS) {
    throw new Error('Item placement requires a gridded scene.');
  }
  const size = canvas.grid.size;
  const distance = canvas.scene.grid.distance;
  if (!(size > 0) || !(distance > 0)) throw new Error('Invalid scene grid size or distance.');
  const radius = RADIUS * size / distance;
  const center = token.center;
  const polygon = CONFIG.Canvas.polygonBackends.sight.create(center, { type: 'sight', radius });
  const bounds = canvas.dimensions.sceneRect;
  const positions = new Map();
  const steps = Math.ceil(radius / size) + 2;
  const origin = canvas.grid.getOffset(center);
  const occupied = new Set();
  const playerPositions = new Set();
  for (const other of canvas.tokens.placeables) {
    const left = other.document.x;
    const top = other.document.y;
    for (let x = left + size / 2; x < left + other.w; x += size) {
      for (let y = top + size / 2; y < top + other.h; y += size) {
        const offset = canvas.grid.getOffset({ x, y });
        const key = `${offset.i},${offset.j}`;
        occupied.add(key);
        if (other.id === token.id) playerPositions.add(key);
      }
    }
  }
  for (let i = origin.i - steps; i <= origin.i + steps; i++) {
    for (let j = origin.j - steps; j <= origin.j + steps; j++) {
      const offset = { i, j };
      const point = canvas.grid.getCenterPoint(offset);
      if (Math.hypot(point.x - center.x, point.y - center.y) > radius) continue;
      if (!bounds.contains(point.x, point.y) || !polygon.contains(point.x, point.y)) continue;
      const key = `${i},${j}`;
      if (playerPositions.has(key)) continue;
      positions.set(key, { point, offset, occupied: occupied.has(key) });
    }
  }
  const candidates = [...positions.values()];
  const all = candidates.filter(position => !position.occupied);
  if (!all.length) all.push(...candidates);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  if (!all.length) throw new Error('No visible unoccupied grid space is available within 25 feet.');
  return all;
}

function createLootCollector({ tokenId, sceneId }) {
  const entries = [];
  return {
    add(result, kind = 'item') {
      entries.push({ result, kind });
    },
    async finish() {
      if (!entries.length) return;
      let positions;
      let placementError;
      try {
        if (canvas.scene?.id !== sceneId) throw new Error('The active scene changed before placement.');
        const token = canvas.tokens.get(tokenId);
        if (!token) throw new Error('The revealing token no longer exists on this scene.');
        if (!game.itempiles?.API?.createItemPile) throw new Error('Item Piles API is unavailable.');
        positions = availablePositions(token);
      } catch (error) {
        placementError = error.message;
        console.error(`${MODULE_ID} | Loot placement unavailable:`, error);
      }
      const rows = [];
      let placed = 0;
      for (const entry of entries) {
        const label = labelOf(entry.result);
        try {
          const item = await resolveItem(entry.result, entry.kind);
          if (placementError) throw new Error(placementError);
          const position = positions[placed % positions.length];
          const topLeft = canvas.grid.getTopLeftPoint(position.offset);
          const pile = await game.itempiles.API.createItemPile({
            sceneId,
            position: topLeft,
            tokenOverrides: { width: 1, height: 1, texture: { src: item.img } },
            items: [{ item, quantity: 1 }]
          });
          if (!pile?.tokenUuid) throw new Error('Item Piles did not return a token.');
          placed++;
          const description = item.name === label ? item.name : `${item.name} (${label})`;
          rows.push(`<li>${escapeHTML(description)} <span>(placed)</span></li>`);
        } catch (error) {
          console.error(`${MODULE_ID} | Could not create or place ${label}:`, error);
          rows.push(`<li class="loot-card__item-error"><strong>${escapeHTML(label)}</strong> — ${escapeHTML(error.message)}; add manually.</li>`);
        }
      }
      try {
        await ChatMessage.create({
          content: `<div class="loot-card"><h3>Item Piles</h3><p>${placed}/${entries.length} items placed.</p><ul>${rows.join('')}</ul></div>`,
          speaker: ChatMessage.getSpeaker({ alias: 'Loot Generator' })
        });
      } catch (error) {
        console.error(`${MODULE_ID} | Could not post item placement results:`, error, rows);
        ui.notifications.error('Could not post Item Piles results. See the console for details.');
      }
      if (placed !== entries.length) ui.notifications.warn('Some loot could not be placed. See the Item Piles chat card.');
    }
  };
}

Hooks.once('init', () => {
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = { ...(module.api ?? {}), createLootCollector };
});
