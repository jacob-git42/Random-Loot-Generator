// RollTables-to-Chat macro (copied)
const moduleMacroNames = ["Individual Treasure", "Treasure Hoard", "Spells", "Potions", "Targeted Loot"];
const individualTreasureMacroNames = ["Individual-Treasure", "Individual Treasure"];
const individualTreasureSettingsNamespace = "lootmakros";
const individualTreasureSettingsKey = "individualTreasurePreset";
const individualTreasureRanges = [
  { id: "range-0-4", label: "CR 1/8 to 4", formula: "4d6" },
  { id: "range-5-10", label: "CR 5 to 10", formula: "4d6 * 10" },
  { id: "range-11-16", label: "CR 11 to 16", formula: "4d6 * 100" },
  { id: "range-17", label: "CR 17 or higher", formula: "4d6 * 1000" }
];
const treasureHoardMacroNames = ["Treasure-Hord", "Treasure Hord", "Treasure-Hoard", "Treasure Hoard", "TreasureHoard"];
const treasureHoardSettingsNamespace = "lootmakros";
const treasureHoardSettingsKey = "treasureHoardPreset";
const spellsMacroNames = ["Spells", "Spell", "Scrolls"];
const spellsSettingsNamespace = "lootmakros";
const spellsSettingsKey = "spellsPreset";
const spellsFolderName = "Spells";
const lootFolderName = "Loot";
const potionsMacroNames = ["Potions", "Potion", "Potions and Poisons"];
const potionsSettingsNamespace = "lootmakros";
const potionsSettingsKey = "potionsPreset";
const targetedLootMacroNames = ["Targeted-Loot", "Targeted Loot", "Treasure Presenter"];
const targetedLootSettingsNamespace = "lootmakros";
const targetedLootSettingsKey = "targetedLootPreset";

// DMG recommendations shown in the UI
const DMG_RECOMMENDED = { 1: 7, 2: 18, 3: 12, 4: 8 };

function isIndividualTreasureMacro(macro) {
  if (!macro) return false;
  const loweredName = macro.name.toLowerCase();
  const normalizedName = loweredName.replace(/[^a-z0-9]/g, "");
  return individualTreasureMacroNames.some(name => {
    const needle = name.toLowerCase();
    const normalizedNeedle = needle.replace(/[^a-z0-9]/g, "");
    return loweredName === needle || loweredName.includes(needle) || normalizedName === normalizedNeedle || normalizedName.includes(normalizedNeedle);
  });
}

function isTreasureHoardMacro(macro) {
  if (!macro) return false;
  const loweredName = macro.name.toLowerCase();
  const normalizedName = loweredName.replace(/[^a-z0-9]/g, "");
  return treasureHoardMacroNames.some(name => {
    const needle = name.toLowerCase();
    const normalizedNeedle = needle.replace(/[^a-z0-9]/g, "");
    return loweredName === needle || loweredName.includes(needle) || normalizedName === normalizedNeedle || normalizedName.includes(normalizedNeedle);
  });
}

function isSpellsMacro(macro) {
  if (!macro) return false;
  const loweredName = macro.name.toLowerCase();
  const normalizedName = loweredName.replace(/[^a-z0-9]/g, "");
  return spellsMacroNames.some(name => {
    const needle = name.toLowerCase();
    const normalizedNeedle = needle.replace(/[^a-z0-9]/g, "");
    return loweredName === needle || loweredName.includes(needle) || normalizedName === normalizedNeedle || normalizedName.includes(normalizedNeedle);
  });
}

function isPotionsMacro(macro) {
  if (!macro) return false;
  const loweredName = macro.name.toLowerCase();
  const normalizedName = loweredName.replace(/[^a-z0-9]/g, "");
  return potionsMacroNames.some(name => {
    const needle = name.toLowerCase();
    const normalizedNeedle = needle.replace(/[^a-z0-9]/g, "");
    return loweredName === needle || loweredName.includes(needle) || normalizedName === normalizedNeedle || normalizedName.includes(normalizedNeedle);
  });
}

function isTargetedLootMacro(macro) {
  if (!macro) return false;
  const loweredName = macro.name.toLowerCase();
  const normalizedName = loweredName.replace(/[^a-z0-9]/g, "");
  return targetedLootMacroNames.some(name => {
    const needle = name.toLowerCase();
    const normalizedNeedle = needle.replace(/[^a-z0-9]/g, "");
    return loweredName === needle || loweredName.includes(needle) || normalizedName === normalizedNeedle || normalizedName.includes(normalizedNeedle);
  });
}

function getClaimMarkerForMacro(macro) {
  if (isIndividualTreasureMacro(macro)) return "LOOT-CLAIM:INDIVIDUAL";
  if (isTreasureHoardMacro(macro)) return "LOOT-CLAIM:HOARD";
  if (isSpellsMacro(macro)) return "LOOT-CLAIM:SPELLS";
  if (isPotionsMacro(macro)) return "LOOT-CLAIM:POTIONS";
  if (isTargetedLootMacro(macro)) return "LOOT-CLAIM:TARGETED";
  return null;
}

function ensureIndividualTreasureSettingRegistered() {
  const settingId = `${individualTreasureSettingsNamespace}.${individualTreasureSettingsKey}`;
  if (!game.settings.settings.has(settingId)) {
    game.settings.register(individualTreasureSettingsNamespace, individualTreasureSettingsKey, {
      name: "Individual Treasure Preset",
      scope: "world",
      config: false,
      type: Object,
      default: {}
    });
  }
}

function ensureTreasureHoardSettingRegistered() {
  const settingId = `${treasureHoardSettingsNamespace}.${treasureHoardSettingsKey}`;
  if (!game.settings.settings.has(settingId)) {
    game.settings.register(treasureHoardSettingsNamespace, treasureHoardSettingsKey, {
      name: "Treasure Hoard Preset",
      scope: "world",
      config: false,
      type: Object,
      default: {}
    });
  }
}

function ensureSpellsSettingRegistered() {
  const settingId = `${spellsSettingsNamespace}.${spellsSettingsKey}`;
  if (!game.settings.settings.has(settingId)) {
    game.settings.register(spellsSettingsNamespace, spellsSettingsKey, {
      name: "Spells Preset",
      scope: "world",
      config: false,
      type: Object,
      default: {}
    });
  }
}

function ensurePotionsSettingRegistered() {
  const settingId = `${potionsSettingsNamespace}.${potionsSettingsKey}`;
  if (!game.settings.settings.has(settingId)) {
    game.settings.register(potionsSettingsNamespace, potionsSettingsKey, {
      name: "Potions Preset",
      scope: "world",
      config: false,
      type: Object,
      default: {}
    });
  }
}

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

async function askIndividualTreasurePreset() {
  const rows = individualTreasureRanges.map(r => `
    <div class="form-group" style="display: flex; align-items: center; margin-bottom: 8px;">
      <label style="flex: 1.5; font-weight: bold;">${r.label}:</label>
      <span style="flex: 1.5; font-size: 0.85em; color: #666;">(${r.formula} gp per monster)</span>
      <input type="number" name="${r.id}" value="0" min="0" style="width: 60px; text-align: center;">
    </div>
  `).join("");

  return new Promise(resolve => {
    new Dialog({
      title: "Individual Treasure Preset",
      content: `
        <form style="padding: 5px;">
          <p style="margin-bottom: 12px; font-style: italic;">Set defeated monsters per CR tier (applies to next loot click):</p>
          ${rows}
        </form>
      `,
      buttons: {
        apply: {
          icon: '<i class="fas fa-check"></i>',
          label: "Apply",
          callback: (html) => {
            const counts = {};
            let total = 0;

            for (const r of individualTreasureRanges) {
              const count = parseInt(html.find(`[name="${r.id}"]`).val()) || 0;
              counts[r.id] = Math.max(0, count);
              total += counts[r.id];
            }

            if (total <= 0) {
              ui.notifications.warn("No monster counts entered.");
              return resolve(null);
            }

            resolve(counts);
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

async function askTreasureHoardPreset() {
  const dialogContent = `
    <form style="padding: 5px;">
      <p style="margin-bottom: 12px; font-style: italic;">Set parameters for the Treasure Hoard:</p>
      
      <!-- Tier Slider -->
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label style="font-weight: bold; font-size: 0.95em;">Tier Level:</label>
          <span id="presetTierLabel" style="font-weight: bold; color: #b45f06; font-size: 1.05em;">Tier 2</span>
        </div>
        <input type="range" id="hoard-tier" name="hoard-tier" min="1" max="4" value="2" step="1" style="width: 100%; cursor: pointer;">
        <div style="display: flex; justify-content: space-between; font-size: 0.72em; color: #666; margin-top: 4px;">
          <span>T1 (L1-4)</span>
          <span>T2 (L5-10)</span>
          <span>T3 (L11-16)</span>
          <span>T4 (L17-20)</span>
        </div>
      </div>

      <div style="background: rgba(0,0,0,0.05); padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 0.85em; text-align: center;">
        <b>Hoard Counter (rolled / recommended):</b><br>
        <span id="counterDisplay" style="color: #111; font-weight: bold;">${counters[2] || 0} / ${DMG_RECOMMENDED[2]} Hoards</span>
      </div>

      <!-- Hoard Count -->
      <div class="form-group" style="display: flex; align-items: center; justify-content: space-between;">
        <label for="hoard-count" style="font-weight: bold;">Number of hoards:</label>
        <input type="number" id="hoard-count" name="hoard-count" value="1" min="1" max="10" style="text-align: center; width: 70px;">
      </div>
    </form>
  `;

  return new Promise(resolve => {
    new Dialog({
      title: "Treasure Hoard Preset",
      content: dialogContent,
      buttons: {
        apply: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Generate Loot",
          callback: (html) => {
            const count = parseInt(html.find('[name="hoard-count"]').val()) || 0;
            const tier = parseInt(html.find('[name="hoard-tier"]').val()) || 2;
            
            if (count <= 0) {
              ui.notifications.warn("Please enter at least 1 hoard.");
              return resolve(null);
            }
            resolve({ count, tier });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "apply",
      render: (html) => {
        // Update the tier label when the slider changes.
        html.find("#hoard-tier").on("input change", function() {
          html.find("#presetTierLabel").text("Tier " + $(this).val());
        });
      },
      close: () => resolve(null)
    }).render(true);
  });
}

const randomTitles = [
  "Combat ended. Loot phase started!",
  "Victory! The loot is yours...",
  "Enemies defeated, open your bags!",
  "An epic victory demands epic loot:",
  "The dust settles. Time for your reward!",
  "Battle won. Who's looting the remains?",
  "The enemy bites the dust. Claim what was theirs!",
  "Danger averted, treasure phase active!",
  "Victorious in battle. Your share awaits:",
  "The fight is over. Time to collect the spoils!",
  "Complete victory! Claim your reward:",
  "The battle is done. Grab the loot!",
  "No enemies left in sight. Time to plunder!",
  "You survived! Here is your payoff:",
  "Triumph is yours. I wonder what they carry?",
  "Combat successfully completed. Distributing loot!",
  "Escaped the mess victorious. Your take:",
  "The battle dust settles. Time to count the coin!",
  "Enemies neutralized. Their pockets belong to you now:",
  "You cleared the battlefield. Claim your find:",
  "Ruthless victory! Let's see what the losers left behind:",
  "Threat eliminated. Ready for the raid?",
  "A glorious end for your foes, a rich one for you:",
  "The enemy has breathed their last. Seize their belongings:",
  "Battle survived. Time to cash in!",
  "The threat is history. Your share is ready:",
  "Hard fight, well-deserved reward. Help yourselves:",
  "No one stands in your way. The loot is yours:",
  "Enemies eliminated. Check what they were guarding:",
  "Proven superiority! Unlock your reward:"
];

const moduleMacros = game.macros
  .filter(macro => moduleMacroNames.includes(macro.name))
  .sort((a, b) => a.name.localeCompare(b.name));
const options = moduleMacros
  .map(macro => `<option value="${macro.id}">${macro.name}</option>`)
  .join("");

if (options) {
  new Dialog({
    title: "Post Macro to Chat",
    content: `
      <form>
        <div class="form-group">
          <label>Select a macro:</label>
          <select name="macro-select" style="width: 100%; margin-bottom: 15px;">${options}</select>
        </div>
      </form>
    `,
    buttons: {
      post: {
        icon: '<i class="fas fa-comment-medical"></i>',
        label: "Post to Chat",
        callback: async (html) => {
          const selectedId = html.find('[name="macro-select"]').val();
          const selectedMacro = game.macros.get(selectedId);
          
          if (!selectedMacro) return;

          if (isIndividualTreasureMacro(selectedMacro)) {
            if (!game.user.isGM) {
              ui.notifications.warn("Only a GM can preset Individual Treasure values.");
              return;
            }

            ensureIndividualTreasureSettingRegistered();
            const counts = await askIndividualTreasurePreset();
            if (!counts) return;

            await game.settings.set(individualTreasureSettingsNamespace, individualTreasureSettingsKey, {
              counts,
              createdBy: game.user.id,
              createdAt: Date.now()
            });
          }

if (isTreasureHoardMacro(selectedMacro)) {
  if (!game.user.isGM) {
    ui.notifications.warn("Only a GM can preset Treasure Hoard values.");
    return;
  }

  ensureTreasureHoardSettingRegistered();
  const hoardPreset = await askTreasureHoardPreset();
  if (!hoardPreset) return;

  await game.settings.set(treasureHoardSettingsNamespace, treasureHoardSettingsKey, {
    count: hoardPreset.count,
    tier: hoardPreset.tier,
    createdBy: game.user.id,
    createdAt: Date.now()
  });
}

          if (isSpellsMacro(selectedMacro)) {
            if (!game.user.isGM) {
              ui.notifications.warn("Only a GM can preset Spells values.");
              return;
            }

            ensureSpellsSettingRegistered();
            const spellsPreset = await askSpellsPreset();
            if (!spellsPreset) return;

            await game.settings.set(spellsSettingsNamespace, spellsSettingsKey, {
              selections: spellsPreset,
              createdBy: game.user.id,
              createdAt: Date.now()
            });
          }

          if (isPotionsMacro(selectedMacro)) {
            if (!game.user.isGM) {
              ui.notifications.warn("Only a GM can preset Potions values.");
              return;
            }

            ensurePotionsSettingRegistered();
            const potionCount = await askPotionsPreset();
            if (!potionCount) return;

            await game.settings.set(potionsSettingsNamespace, potionsSettingsKey, {
              count: potionCount,
              createdBy: game.user.id,
              createdAt: Date.now()
            });
          }

          if (isTargetedLootMacro(selectedMacro)) {
            if (!game.user.isGM) {
              ui.notifications.warn("Only a GM can preset Targeted Loot values.");
              return;
            }

            ensureTargetedLootSettingRegistered();
            const entries = await askTargetedLootPreset();
            if (!entries) return;

            await game.settings.set(targetedLootSettingsNamespace, targetedLootSettingsKey, {
              entries,
              createdBy: game.user.id,
              createdAt: Date.now()
            });
          }

          const randomTitle = randomTitles[Math.floor(Math.random() * randomTitles.length)];
          const expectedClaimMarker = getClaimMarkerForMacro(selectedMacro);

          const chatMessage = await ChatMessage.create({
            content: "Generating loot card...",
            speaker: ChatMessage.getSpeaker({ title: "Dungeon Master" })
          });

          const chatContent = `
            <div style="border: 1px solid #7b6330; padding: 12px; border-radius: 8px; background: linear-gradient(160deg, rgba(66,50,18,0.18), rgba(20,18,12,0.10)); text-align: center; box-shadow: inset 0 0 0 1px rgba(235,197,120,0.22), 0 2px 8px rgba(0,0,0,0.18);">
              <p style="margin: 0 0 4px 0; font-size: 0.78em; letter-spacing: 0.12em; text-transform: uppercase; color: #8b6d2e; font-weight: 700;">Treasure Opportunity</p>
              <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 1.08em; color: #2f2a1d;">${randomTitle}</p>

              <a class="content-link" data-link data-type="Macro" data-uuid="Macro.${selectedMacro.id}" style="background: linear-gradient(180deg, #8e6c2e, #6c5122); color: #fff7e6 !important; padding: 9px 16px; border-radius: 6px; display: inline-block; text-decoration: none; border: 1px solid #4d3a17; font-weight: bold; box-shadow: 0 1px 0 rgba(255,231,176,0.28) inset, 0 2px 6px rgba(0,0,0,0.25);">
                ⚡ Reveal Loot ⚡
              </a>
            </div>
          `;

          await chatMessage.update({ content: chatContent });

          let hookId = Hooks.on("createChatMessage", async (msgDoc, options, userId) => {
            if (!game.user.isGM) return;

            const isMatchingClaim = expectedClaimMarker ? msgDoc.content.includes(expectedClaimMarker) : false;

            if (isMatchingClaim) {
              const targetMsg = game.messages.get(chatMessage.id);
              
              if (targetMsg && targetMsg.content.includes('⚡Press Button for Loot⚡')) {
                const lockedContent = targetMsg.content.replace(
                  /<a class="content-link"[\s\S]*?⚡ Reveal Loot ⚡\s*<\/a>/,
                  `<span style="background: linear-gradient(180deg, #3e3a32, #2d2a24); color: #c4b8a4 !important; padding: 9px 16px; border-radius: 6px; display: inline-block; border: 1px solid #575044; font-weight: bold; cursor: not-allowed; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);">🔒 Loot Claimed 🔒</span>`
                );
                
                await targetMsg.update({ content: lockedContent });
                ui.notifications.info("Loot card locked.");
              }
              
              Hooks.off("createChatMessage", hookId);
            }
          });
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    },
    default: "post"
  }).render(true);
} else {
  ui.notifications.error("No Random Loot Generator macros found!");
}

async function askSpellsPreset() {
  const lootFolder = game.folders.find(f => f.name === lootFolderName && f.type === "RollTable");
  const folder = game.folders.find(f =>
    f.name === spellsFolderName && f.type === "RollTable" && f.folder?.id === lootFolder?.id
  );
  if (!folder) {
    ui.notifications.error(`Table folder "${spellsFolderName}" not found!`);
    return null;
  }

  const tableOptions = folder.contents
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(t => {
      const isSelected = t.name.toLowerCase().includes("scroll") ? "selected" : "";
      return `<option value="${t.id}" ${isSelected}>${t.name}</option>`;
    })
    .join("");

  if (!tableOptions) {
    ui.notifications.warn(`No roll tables found in folder "${spellsFolderName}".`);
    return null;
  }

  const options = `<option value="">-- none --</option>${tableOptions}`;

  return new Promise(resolve => {
    new Dialog({
      title: "Roll from Folder: Spells",
      content: `
        <form>
          <div class="form-group">
            <label>Select a table:</label>
            <select name="table-select-1" style="width: 100%;">${tableOptions}</select>
          </div>
          <div class="form-group">
            <label>Number of scrolls:</label>
            <input type="number" name="roll-count-1" value="1" min="0" autofocus style="text-align: center; width: 60px;">
          </div>
          <hr>
          <div class="form-group">
            <label>Select another table (optional):</label>
            <select name="table-select-2" style="width: 100%;">${options}</select>
          </div>
          <div class="form-group">
            <label>Number of scrolls:</label>
            <input type="number" name="roll-count-2" value="0" min="0" style="text-align: center; width: 60px;">
          </div>
          <hr>
          <div class="form-group">
            <label>Select another table (optional):</label>
            <select name="table-select-3" style="width: 100%;">${options}</select>
          </div>
          <div class="form-group">
            <label>Number of scrolls:</label>
            <input type="number" name="roll-count-3" value="0" min="0" style="text-align: center; width: 60px;">
          </div>
        </form>
      `,
      buttons: {
        apply: {
          icon: '<i class="fas fa-dice"></i>',
          label: "Roll",
          callback: html => {
            const selections = [1, 2, 3].map(index => ({
              tableId: String(html.find(`[name="table-select-${index}"]`).val() || "").trim(),
              count: parseInt(html.find(`[name="roll-count-${index}"]`).val()) || 0
            })).filter(selection => selection.tableId && selection.count > 0);
            if (!selections.length) {
              ui.notifications.warn("Please select at least one table with a count greater than 0.");
              return resolve(null);
            }
            resolve(selections);
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

async function askPotionsPreset() {
  return new Promise(resolve => {
    new Dialog({
      title: "Potions Preset",
      content: `
        <form>
          <div class="form-group">
            <label for="potion-count">Number of Potions:</label>
            <input type="number" id="potion-count" name="potion-count" value="1" min="1" style="text-align: center; width: 60px;">
          </div>
        </form>
      `,
      buttons: {
        apply: {
          icon: '<i class="fas fa-check"></i>',
          label: "Apply",
          callback: (html) => {
            const count = parseInt(html.find('[name="potion-count"]').val()) || 0;
            if (count <= 0) {
              ui.notifications.warn("Please enter at least 1 potion.");
              return resolve(null);
            }
            resolve(count);
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

function clearTargetedLootPresetSlot(slot, htmlElement) {
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

async function resolveAndSetTargetedLootPresetItem(uuidOrId, slot, htmlElement) {
  if (!uuidOrId) return;
  let cleanId = uuidOrId.trim();
  if (cleanId.startsWith("@UUID[") || cleanId.startsWith("@Compendium[")) {
    cleanId = cleanId.match(/\[([^\]]+)\]/)?.[1] || cleanId;
  }

  try {
    let item = await fromUuid(cleanId);
    if (!item && cleanId.length === 16) item = game.items.get(cleanId);

    if (item) {
      htmlElement.find(`#item-uuid-${slot}`).val(item.uuid);
      htmlElement.find(`#item-img-${slot}`).val(item.img);
      htmlElement.find(`#item-name-${slot}`).val(item.name);
      htmlElement.find(`#manual-id-${slot}`).val(item.uuid);

      const dropZone = htmlElement.find(`#loot-drop-zone-${slot}`)[0];
      dropZone.style.border = "2px solid #b45f06";
      dropZone.style.background = "rgba(180, 95, 6, 0.05)";
      const contentDiv = dropZone.querySelector(".zone-content");
      contentDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; width: 100%; justify-content: flex-start; text-align: left; padding: 0 4px;">
          <img src="${item.img}" style="width: 20px; height: 20px; border: none; border-radius: 4px; flex-shrink: 0;">
          <span style="font-weight: bold; color: #b45f06; font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</span>
        </div>
      `;

      htmlElement.find(`.clear-slot-btn[data-slot="${slot}"]`).show();
    } else {
      ui.notifications.warn(`Could not find an item with ID: ${cleanId}`);
    }
  } catch (_err) {
    ui.notifications.warn("Failed to resolve dropped item.");
  }
}

async function askTargetedLootPreset() {
  const dropZonesHtml = Array.from({ length: 8 }, (_, i) => `
    <div class="form-group" style="display: flex; flex-direction: column; gap: 4px; margin: 0; border: 1px solid #bbb; padding: 6px; border-radius: 4px; background: rgba(0,0,0,0.02); position: relative;">
      <label style="font-weight: bold; font-size: 0.85em; margin: 0; color: #444;">Slot ${i + 1}:</label>

      <div class="clear-slot-btn" data-slot="${i}" style="position: absolute; top: 4px; right: 4px; cursor: pointer; color: #888; display: none; font-size: 0.9em;">
        <i class="fas fa-times-circle"></i>
      </div>

      <div id="loot-drop-zone-${i}" class="loot-drop-zone" data-slot="${i}" style="border: 2px dashed #7a7975; padding: 6px; text-align: center; background: rgba(0,0,0,0.05); border-radius: 4px; cursor: pointer; height: 28px; display: flex; align-items: center; justify-content: center; overflow: hidden; transition: background 0.2s;">
        <div style="pointer-events: none; width: 100%; display: flex; align-items: center; justify-content: center;" class="zone-content">
          <span style="font-size: 0.75em; color: #666;"><i class="fas fa-box-open"></i> Drop Item</span>
        </div>
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
          callback: (html) => {
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
      render: (html) => {
        html.find(".clear-slot-btn").on("click", (e) => clearTargetedLootPresetSlot(e.currentTarget.getAttribute("data-slot"), html));

        html.find(".loot-drop-zone").each((_, zone) => {
          zone.addEventListener("dragover", e => { e.preventDefault(); zone.style.background = "rgba(180, 95, 6, 0.1)"; });
          zone.addEventListener("dragleave", _e => { zone.style.background = "rgba(0,0,0,0.05)"; });
          zone.addEventListener("drop", async e => {
            e.preventDefault();
            zone.style.background = "rgba(0,0,0,0.05)";
            const slot = zone.getAttribute("data-slot");
            let itemUuid = null;
            try {
              const data = TextEditor.getDragEventData(e) || JSON.parse(e.dataTransfer.getData("text/plain"));
              if (data.uuid) itemUuid = data.uuid;
              else if (data.tagText) {
                const name = data.tagText.split("|")[0].trim();
                const found = game.items.find(i => i.name.toLowerCase() === name.toLowerCase());
                itemUuid = found ? found.uuid : null;
              }
            } catch (_err) {}
            if (itemUuid) await resolveAndSetTargetedLootPresetItem(itemUuid, slot, html);
          });
        });

        html.find(".manual-id-input").on("change", async (e) => {
          await resolveAndSetTargetedLootPresetItem(e.currentTarget.value, e.currentTarget.getAttribute("data-slot"), html);
        });
      }
    }, { width: 460 }).render(true);
  });
}
