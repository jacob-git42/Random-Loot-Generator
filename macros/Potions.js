const tableName = "🧪 Potions and Poisons";
const rollTableFolderName = "Loot";

function getTableResultText(result) {
  return result?.name?.trim() || result?.description?.trim() || "";
}
const potionsSettingsNamespace = "lootmakros";
const potionsSettingsKey = "potionsPreset";

const lootTableFolder = game.folders.find(f => f.name === rollTableFolderName && f.type === "RollTable");
const table = lootTableFolder?.contents.find(t => t.name === tableName);

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

ensurePotionsSettingRegistered();

async function runWithPreset() {
  ensurePotionsSettingRegistered();
  const preset = game.settings.get(potionsSettingsNamespace, potionsSettingsKey);
  if (!preset?.count) return false;

  const count = Math.max(1, parseInt(preset.count) || 1);
  if (game.user.isGM) {
    await game.settings.set(potionsSettingsNamespace, potionsSettingsKey, {});
  }

  let textResults = [];
  for (let i = 0; i < count; i++) {
    const rollResult = await table.roll();
    const result = rollResult.results[0];
    if (result) {
      textResults.push(`<li>${getTableResultText(result)}</li>`);
    }
  }

  const chatContent = `
    <div class="loot-card">
      <p class="loot-card__eyebrow" style="margin: 0 0 4px 0;">Alchemical Prize</p>
      <h3>🧪 Potions</h3>
      <p>Rolled <b>${count}x</b> potions:</p>
      <ul style="margin: 5px 0; padding-left: 20px;">
        ${textResults.join("")}
      </ul>
    </div>
  `;

  await ChatMessage.create({
    content: chatContent,
    speaker: ChatMessage.getSpeaker({ title: "Treasure Chest" })
  });

  await createPotionClaimMessage();

  return true;
}

async function createPotionClaimMessage() {
  await ChatMessage.create({
    content: `<div class="loot-card__claim">
                <span style="display:none;">LOOT-CLAIM:POTIONS</span>
          Loot Claimed: <span class="loot-card__claim-name">${game.user.name}</span> 💰
              </div>`,
    speaker: ChatMessage.getSpeaker({ alias: "Loot System" })
  });
}

async function runWithDialog() {
  new Dialog({
    title: "Generate Potions",
    content: `
      <form>
        <div class="form-group">
          <label for="potion-count">Number of Potions:</label>
          <input type="number" id="potion-count" name="potion-count" value="1" min="1" style="text-align: center; width: 60px;">
        </div>
      </form>
    `,
    buttons: {
      roll: {
        icon: '<i class="fas fa-dice-d20"></i>',
        label: "Generate Loot",
        callback: async (html) => {
          const count = parseInt(html.find('[name="potion-count"]').val()) || 0;
          if (count < 1) {
            return ui.notifications.warn("Please enter at least 1 potion.");
          }

          let textResults = [];
          for (let i = 0; i < count; i++) {
            const rollResult = await table.roll();
            const result = rollResult.results[0];
            if (result) textResults.push(`<li>${getTableResultText(result)}</li>`);
          }

          const chatContent = `
            <div class="loot-card">
              <p class="loot-card__eyebrow" style="margin: 0 0 4px 0;">Alchemical Prize</p>
              <h3>🧪 Potions</h3>
              <p>Rolled <b>${count}x</b> potions:</p>
              <ul style="margin: 5px 0; padding-left: 20px;">
                ${textResults.join("")}
              </ul>
            </div>
          `;

          await ChatMessage.create({
            content: chatContent,
            speaker: ChatMessage.getSpeaker({ title: "Treasure Chest" })
          });
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    },
    default: "roll"
  }).render(true);
}

if (!table) {
  ui.notifications.error(`Rollable table "${tableName}" not found!`);
} else {
  const usedPreset = await runWithPreset();
  if (!usedPreset) {
    await runWithDialog();
  }
}