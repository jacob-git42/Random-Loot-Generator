const spellsSettingsNamespace = "lootmakros";
const spellsSettingsKey = "spellsPreset";
const spellsFolderName = "Spells";
const lootFolderName = "Loot";

function getTableResultText(result) {
  return result?.name?.trim() || result?.description?.trim() || "";
}

function getSpellsFolder() {
  const lootFolder = game.folders.find(folder => folder.name === lootFolderName && folder.type === "RollTable");
  return game.folders.find(folder =>
    folder.name === spellsFolderName && folder.type === "RollTable" && folder.folder?.id === lootFolder?.id
  );
}

function getLootTableById(id) {
  const folder = getSpellsFolder();
  return folder?.contents.find(table => table.id === id) || null;
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

async function runWithPreset() {
  ensureSpellsSettingRegistered();
  const preset = game.settings.get(spellsSettingsNamespace, spellsSettingsKey);
  const selections = Array.isArray(preset?.selections)
    ? preset.selections
    : (preset?.tableId && preset?.count ? [{ tableId: preset.tableId, count: preset.count }] : []);
  if (!selections.length) return false;

  const validSelections = selections
    .map(selection => ({
      table: getLootTableById(selection.tableId),
      count: Math.max(1, parseInt(selection.count) || 0)
    }))
    .filter(selection => selection.table && selection.count > 0);
  if (!validSelections.length) {
    ui.notifications.warn("Preset spell tables were not found.");
    return false;
  }

  if (game.user.isGM) {
    await game.settings.set(spellsSettingsNamespace, spellsSettingsKey, {});
  }

  let textResults = [];
  let count = 0;
  for (const selection of validSelections) {
    count += selection.count;
    for (let i = 0; i < selection.count; i++) {
      const rollResult = await selection.table.roll();
      const result = rollResult.results[0];
      if (result) {
        textResults.push(`<li>${getTableResultText(result)}</li>`);
      }
    }
  }

  const chatContent = `
    <div style="border: 1px solid #7b6330; padding: 12px; border-radius: 8px; background: linear-gradient(160deg, rgba(66,50,18,0.16), rgba(20,18,12,0.08)); box-shadow: inset 0 0 0 1px rgba(235,197,120,0.22), 0 2px 8px rgba(0,0,0,0.16);">
      <p style="margin: 0 0 4px 0; font-size: 0.76em; letter-spacing: 0.12em; text-transform: uppercase; color: #8b6d2e; font-weight: 700;">Arcane Discovery</p>
      <h3 style="margin-top: 0; border-bottom: 1px solid rgba(123,99,48,0.45); padding-bottom: 6px; font-size: 1.1em; color: #2f2a1d;">📜 Scrolls</h3>
      <p>Rolled <b>${count}x</b> scrolls:</p>
      <ul style="margin: 5px 0; padding-left: 20px;">
        ${textResults.join("")}
      </ul>
    </div>
  `;

  await ChatMessage.create({
    content: chatContent,
    speaker: ChatMessage.getSpeaker({ title: "Treasure Chest" })
  });

  await ChatMessage.create({
    content: `<div style="text-align: center; color: #000000;">
                <span style="display:none;">LOOT-CLAIM:SPELLS</span>
                Loot Claimed: <span style="color: #8b0000; font-weight: bold;">${game.user.name}</span> 💰
              </div>`,
    speaker: ChatMessage.getSpeaker({ alias: "Loot System" })
  });

  return true;
}

async function runWithDialog() {
  const folder = getSpellsFolder();
  if (!folder) {
    ui.notifications.error(`Table folder "${spellsFolderName}" not found!`);
    return;
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
    return;
  }

  const options = `<option value="">-- none --</option>${tableOptions}`;

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
      roll: {
        icon: '<i class="fas fa-dice"></i>',
        label: "Roll",
        callback: async (html) => {
          const selections = [1, 2, 3].map(index => {
            const tableId = String(html.find(`[name="table-select-${index}"]`).val() || "").trim();
            const count = parseInt(html.find(`[name="roll-count-${index}"]`).val()) || 0;
            return { tableId, count };
          }).filter(selection => selection.tableId && selection.count > 0);

          if (!selections.length) {
            return ui.notifications.warn("Please select at least one table with a count greater than 0.");
          }

          let totalCount = 0;
          let resultItemsHtml = "";

          for (const selection of selections) {
            const selectedTable = getLootTableById(selection.tableId);
            if (!selectedTable) continue;

            totalCount += selection.count;
            let textResults = [];
            for (let i = 0; i < selection.count; i++) {
              const rollResult = await selectedTable.roll();
              const result = rollResult.results[0];
              if (result) textResults.push(`<li>${getTableResultText(result)}</li>`);
            }

            if (textResults.length > 0) {
              resultItemsHtml += textResults.join("");
            }
          }

          if (!resultItemsHtml) {
            return ui.notifications.warn("No valid rolls could be generated from the selected tables.");
          }

          const chatContent = `
            <div style="border: 1px solid #7b6330; padding: 12px; border-radius: 8px; background: linear-gradient(160deg, rgba(66,50,18,0.16), rgba(20,18,12,0.08)); box-shadow: inset 0 0 0 1px rgba(235,197,120,0.22), 0 2px 8px rgba(0,0,0,0.16);">
              <p style="margin: 0 0 4px 0; font-size: 0.76em; letter-spacing: 0.12em; text-transform: uppercase; color: #8b6d2e; font-weight: 700;">Arcane Discovery</p>
              <h3 style="margin-top: 0; border-bottom: 1px solid rgba(123,99,48,0.45); padding-bottom: 6px; font-size: 1.1em; color: #2f2a1d;">📜 Scrolls</h3>
              <p>Rolled <b>${totalCount}x</b> scrolls:</p>
              <ul style="margin: 5px 0; padding-left: 20px;">
                ${resultItemsHtml}
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

const usedPreset = await runWithPreset();
if (!usedPreset) {
  await runWithDialog();
}
