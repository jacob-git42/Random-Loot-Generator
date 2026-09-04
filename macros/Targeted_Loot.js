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

// 1. Zuerst Setting registrieren
ensureTargetedLootSettingRegistered();

// 2. Altes Preset leeren, wenn das Makro manuell geklickt wurde (nicht aus einer Claim-Card heraus)
const isFromClaim = typeof args !== "undefined" && args?.[0]?.fromClaim;
if (game.user.isGM && !isFromClaim) {
  await game.settings.set(targetedLootSettingsNamespace, targetedLootSettingsKey, {});
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

function clearTargetedLootSlot(slot, htmlElement) {
  htmlElement.find(`#item-uuid-${slot}`).val("");
  htmlElement.find(`#item-img-${slot}`).val("");
  htmlElement.find(`#item-name-${slot}`).val("");
  htmlElement.find(`#manual-id-${slot}`).val("");

  const dropZone = htmlElement.find(`#loot-drop-zone-${slot}`)[0];
  const contentDiv = dropZone.querySelector(".zone-content");
  dropZone.style.border = "2px dashed #7a7975";
  dropZone.style.background = "rgba(0,0,0,0.05)";
  contentDiv.innerHTML = `<span style="font-size: 0.75em; color: #666;"><i class="fas fa-box-open"></i> Drop Item</span>`;
  htmlElement.find(`.clear-slot-btn[data-slot="${slot}"]`).hide();
}

async function resolveAndSetTargetedLootItem(uuidOrId, slot, htmlElement) {
  if (!uuidOrId) return;
  let cleanId = String(uuidOrId).trim();
  if (cleanId.startsWith("@UUID[") || cleanId.startsWith("@Compendium[")) {
    cleanId = cleanId.match(/\[([^\]]+)\]/)?.[1] || cleanId;
  }

  const item = await resolveItemFromEntry(cleanId);
  if (!item) {
    ui.notifications.warn(`Could not find an item with ID: ${cleanId}`);
    return;
  }

  htmlElement.find(`#item-uuid-${slot}`).val(item.uuid);
  htmlElement.find(`#item-img-${slot}`).val(item.img);
  htmlElement.find(`#item-name-${slot}`).val(item.name);
  htmlElement.find(`#manual-id-${slot}`).val(item.uuid);

  const dropZone = htmlElement.find(`#loot-drop-zone-${slot}`)[0];
  dropZone.style.border = "2px solid #b45f06";
  dropZone.style.background = "rgba(180, 95, 6, 0.05)";
  dropZone.querySelector(".zone-content").innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px; width: 100%; justify-content: flex-start; text-align: left; padding: 0 4px;">
      <img src="${item.img}" style="width: 20px; height: 20px; border: none; border-radius: 4px; flex-shrink: 0;">
      <span style="font-weight: bold; color: #b45f06; font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</span>
    </div>
  `;
  htmlElement.find(`.clear-slot-btn[data-slot="${slot}"]`).show();
}

async function askForTargetedLootEntries() {
  const dropZonesHtml = Array.from({ length: 8 }, (_, i) => `
    <div class="form-group" style="display: flex; flex-direction: column; gap: 4px; margin: 0; border: 1px solid #bbb; padding: 6px; border-radius: 4px; background: rgba(0,0,0,0.02); position: relative;">
      <label style="font-weight: bold; font-size: 0.85em; margin: 0; color: #444;">Slot ${i + 1}:</label>
      <div class="clear-slot-btn" data-slot="${i}" style="position: absolute; top: 4px; right: 4px; cursor: pointer; color: #888; display: none; font-size: 0.9em;"><i class="fas fa-times-circle"></i></div>
      <div id="loot-drop-zone-${i}" class="loot-drop-zone" data-slot="${i}" style="border: 2px dashed #7a7975; padding: 6px; text-align: center; background: rgba(0,0,0,0.05); border-radius: 4px; cursor: pointer; height: 28px; display: flex; align-items: center; justify-content: center; overflow: hidden; transition: background 0.2s;">
        <div style="pointer-events: none; width: 100%; display: flex; align-items: center; justify-content: center;" class="zone-content"><span style="font-size: 0.75em; color: #666;"><i class="fas fa-box-open"></i> Drop Item</span></div>
      </div>
      <input type="text" id="manual-id-${i}" class="manual-id-input" data-slot="${i}" placeholder="Paste ID / UUID here..." style="font-size: 0.75em; height: 20px; text-align: center; margin-top: 2px;">
      <input type="hidden" id="item-uuid-${i}" name="item-uuid-${i}" value="">
      <input type="hidden" id="item-img-${i}" name="item-img-${i}" value="">
      <input type="hidden" id="item-name-${i}" name="item-name-${i}" value="">
    </div>
  `).join("");

  return new Promise(resolve => {
    new Dialog({
      title: "Targeted Loot Preset",
      content: `<form style="padding: 5px;"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">${dropZonesHtml}</div></form>`,
      buttons: {
        apply: {
          icon: '<i class="fas fa-check"></i>',
          label: "Apply",
          callback: html => {
            const entries = [];
            for (let i = 0; i < 8; i++) {
              const uuid = String(html.find(`#item-uuid-${i}`).val() || "").trim();
              if (uuid) entries.push(uuid);
            }
            if (!entries.length) {
              ui.notifications.warn("Please add at least one item first!");
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
      close: () => resolve(null),
      render: html => {
        html.find(".clear-slot-btn").on("click", event => {
          clearTargetedLootSlot(event.currentTarget.getAttribute("data-slot"), html);
        });

        html.find(".loot-drop-zone").each((_, zone) => {
          zone.addEventListener("dragover", event => {
            event.preventDefault();
            zone.style.background = "rgba(180, 95, 6, 0.1)";
          });
          zone.addEventListener("dragleave", () => {
            zone.style.background = "rgba(0,0,0,0.05)";
          });
          zone.addEventListener("drop", async event => {
            event.preventDefault();
            zone.style.background = "rgba(0,0,0,0.05)";
            const slot = zone.getAttribute("data-slot");
            let itemUuid = null;
            try {
              const data = TextEditor.getDragEventData(event) || JSON.parse(event.dataTransfer.getData("text/plain"));
              if (data.uuid) itemUuid = data.uuid;
              else if (data.tagText) {
                const name = data.tagText.split("|")[0].trim();
                const found = game.items.find(item => item.name.toLowerCase() === name.toLowerCase());
                itemUuid = found?.uuid || null;
              }
            } catch (_err) {}
            if (itemUuid) await resolveAndSetTargetedLootItem(itemUuid, slot, html);
          });
        });

        html.find(".manual-id-input").on("change", async event => {
          await resolveAndSetTargetedLootItem(event.currentTarget.value, event.currentTarget.getAttribute("data-slot"), html);
        });
      }
    }, { width: 460 }).render(true);
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