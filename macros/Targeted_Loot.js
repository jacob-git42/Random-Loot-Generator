const targetedLootSettingsNamespace = "lootmakros";
const targetedLootSettingsKey = "targetedLootPreset";

function ensureTargetedLootSettingRegistered() {
  const settingId = `${targetedLootSettingsNamespace}.${targetedLootSettingsKey}`;
  if (!game.settings.settings.has(settingId)) {
    game.settings.register(targetedLootSettingsNamespace, targetedLootSettingsKey, {
      name: "Targeted Loot Preset",
      scope: "world",
      config: false,
      type: Object,
      default: {}
    });
  }
}

async function resolveItemFromEntry(entry) {
  if (!entry) return null;
  let cleanId = String(entry).trim();

  if (cleanId.startsWith("@UUID[") || cleanId.startsWith("@Compendium[")) {
    cleanId = cleanId.match(/\[([^\]]+)\]/)?.[1] || cleanId;
  }

  try {
    let item = await fromUuid(cleanId);
    if (!item && cleanId.length === 16) item = game.items.get(cleanId);
    return item || null;
  } catch (_err) {
    return null;
  }
}

async function askForTargetedLootEntries() {
  const inputs = Array.from({ length: 8 }, (_, index) => `
    <div class="form-group" style="margin-bottom: 6px;">
      <label for="targeted-loot-${index}">Item ${index + 1}</label>
      <input type="text" id="targeted-loot-${index}" name="targeted-loot-${index}" placeholder="Paste item UUID or ID..." style="width: 100%;">
    </div>
  `).join("");

  return new Promise(resolve => {
    new Dialog({
      title: "Targeted Loot",
      content: `<form>${inputs}</form>`,
      buttons: {
        apply: {
          icon: '<i class="fas fa-check"></i>',
          label: "Post Loot",
          callback: html => {
            const entries = Array.from({ length: 8 }, (_, index) =>
              String(html.find(`[name="targeted-loot-${index}"]`).val() || "").trim()
            ).filter(Boolean);
            if (!entries.length) {
              ui.notifications.warn("Add at least one item first.");
              return resolve(null);
            }
            resolve(entries);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "apply",
      close: () => resolve(null)
    }).render(true);
  });
}

async function postTargetedLoot(entries, includeClaim = false) {
  if (game.user.isGM) {
    await game.settings.set(targetedLootSettingsNamespace, targetedLootSettingsKey, {});
  }

  let itemsListHtml = "";
  let itemsCount = 0;

  for (const entry of entries) {
    const item = await resolveItemFromEntry(entry);
    if (!item) continue;
    itemsCount++;
    itemsListHtml += `<li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;"><img src="${item.img}" style="width: 24px; height: 24px; border: 1px solid #7a7975; border-radius: 4px; flex-shrink: 0;"><a class="content-link" data-link data-uuid="${item.uuid}"><i class="fas fa-suit-case"></i> ${item.name}</a></li>`;
  }

  if (itemsCount === 0) {
    ui.notifications.warn("No valid items found.");
    return;
  }

  await ChatMessage.create({
    content: await TextEditor.enrichHTML(`<div style="border: 1px solid #7b6330; padding: 12px; border-radius: 8px; background: linear-gradient(160deg, rgba(66,50,18,0.16), rgba(20,18,12,0.08)); box-shadow: inset 0 0 0 1px rgba(235,197,120,0.22), 0 2px 8px rgba(0,0,0,0.16);"><p style="margin: 0 0 4px 0; font-size: 0.76em; letter-spacing: 0.12em; text-transform: uppercase; color: #8b6d2e; font-weight: 700;">Curated Reward</p><h3 style="margin-top: 0; border-bottom: 1px solid rgba(123,99,48,0.45); padding-bottom: 6px; font-size: 1.1em; color: #2f2a1d;">💎 Treasure Found!</h3><ul style="margin: 5px 0; padding-left: 0; list-style-type: none; line-height: 1.6em;">${itemsListHtml}</ul></div>`, { async: true }),
    speaker: ChatMessage.getSpeaker({ title: "Treasure Chest" })
  });

  if (includeClaim) {
    await ChatMessage.create({
      content: `<div style="text-align: center; color: #000000;"><span style="display:none;">LOOT-CLAIM:TARGETED</span>Loot Claimed: <span style="color: #8b0000; font-weight: bold;">${game.user.name}</span> 💰</div>`,
      speaker: ChatMessage.getSpeaker({ alias: "Loot System" })
    });
  }
}

async function runWithPreset() {
  ensureTargetedLootSettingRegistered();
  const preset = game.settings.get(targetedLootSettingsNamespace, targetedLootSettingsKey);
  const entries = Array.isArray(preset?.entries) ? preset.entries : [];
  if (!entries.length) return false;

  await postTargetedLoot(entries, true);
  return true;
}

const usedPreset = await runWithPreset();
if (!usedPreset) {
  const entries = await askForTargetedLootEntries();
  if (entries) await postTargetedLoot(entries);
}
