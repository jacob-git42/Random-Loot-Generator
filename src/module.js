const MODULE_ID = 'jacobs-loot-generator';
const ROLL_TABLE_FOLDER_NAME = 'Loot';
const MACRO_DM_FOLDER_NAME = 'Loot_DM';
const MACRO_PLAYER_FOLDER_NAME = 'Loot_Player';
const SPELLS_FOLDER_NAME = 'Spells';
const OBSERVER_OWNERSHIP = 2;
const TABLE_OWNERSHIP = 3; 
const NO_OWNERSHIP = 0;
const MACRO_SYNC_VERSION = 22;

// Extract AppV2 classes from foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { AbstractSidebarTab } = foundry.applications.sidebar;

// 1. Define Sidebar Tab using HandlebarsApplicationMixin + AbstractSidebarTab
class JacobsLootSidebarTab extends HandlebarsApplicationMixin(AbstractSidebarTab) {
  static tabName = 'lootGenerator';

  static DEFAULT_OPTIONS = {
    actions: {
      runMacro: JacobsLootSidebarTab.#onRunMacro
    }
  };

  static PARTS = {
    loot: {
      template: `modules/${MODULE_ID}/templates/loot-panel.html`
    }
  };

  /**
   * Prepare context data for the Handlebars template
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return context;
  }

  /**
   * Handle macro execution triggered via data-action="runMacro"
   */
  static async #onRunMacro(event, target) {
    event.preventDefault();
    const name = target.dataset.name;
    const macro = game.macros.find(m => m.name === name);
    if (macro) {
      await macro.execute();
    } else {
      ui.notifications.warn(`Macro not found: ${name}`);
    }
  }
}

// 2. Module Initialization & Native Sidebar Tab Registration
Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing Random Loot Generator`);

  // Register module settings
  game.settings.register(MODULE_ID, 'enabled', {
    name: 'Enable Random Loot Generator',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, 'macrosCreated', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, 'macroSyncVersion', {
    scope: 'world',
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register(MODULE_ID, 'tablesImported', {
    name: 'Tables Imported',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  });

  if (!game.settings.get(MODULE_ID, 'enabled')) return;

  // Register sidebar tab metadata (Korrektes fa-coins Icon)
  CONFIG.ui.sidebar.TABS.lootGenerator = {
    icon: 'fa-solid fa-coins',
    tooltip: 'Loot Generator'
  };

  // Bind sidebar tab class to CONFIG.ui
  CONFIG.ui.lootGenerator = JacobsLootSidebarTab;

  // Inject custom tab right before settings gear icon
  const settingsTab = CONFIG.ui.sidebar.TABS.settings;
  delete CONFIG.ui.sidebar.TABS.settings;
  CONFIG.ui.sidebar.TABS.settings = settingsTab;
});

// 3. Helper functions for macro creation
async function createMacroFromPath(name, path, folderId, ownership) {
  try {
    const base = `modules/${MODULE_ID}`;
    const res = await fetch(`${base}/${path}`);
    if (!res.ok) return null;
    const cmd = await res.text();
    const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
    try {
      new AsyncFunction(cmd);
    } catch (syntaxError) {
      console.error(`${MODULE_ID} | Invalid macro syntax in ${path}:`, syntaxError);
      return null;
    }
    const existing = game.macros.find(m => m.name === name);
    if (existing) {
      await existing.update({ 
        command: cmd,
        folder: folderId,
        ownership: { default: ownership }
      });
      return existing;
    }
    return await Macro.create({ 
      name, 
      type: 'script', 
      scope: 'global', 
      command: cmd,
      folder: folderId,
      ownership: { default: ownership }
    });
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to create macro ${name}:`, err);
    return null;
  }
}

const cleanupMacroCommand = `if (!game.user.isGM) {
  return ui.notifications.warn('Only a GM can clean up Random Loot Generator data.');
}

const confirmed = await Dialog.confirm({
  title: 'Clean up Random Loot Generator',
  content: '<p>Delete the module macros, RollTables in the "Loot" folder, and the folders themselves?</p><p>This cannot be undone.</p>'
});
if (!confirmed) return;

const macroNames = [
  'Individual Treasure',
  'Potions',
  'RollTables to Chat',
  'Spells',
  'Targeted Loot',
  'Treasure Hoard',
  'Reset_Loot_Counters',
  'Clean up Random Loot Generator'
];
const macros = game.macros.filter(macro => macroNames.includes(macro.name));
for (const macro of macros) await macro.delete();

const targetFolderNames = ['Loot', 'Loot_DM', 'Loot_Player'];
const folders = game.folders.filter(folder => (folder.type === 'RollTable' || folder.type === 'Macro') && targetFolderNames.includes(folder.name));
const tables = game.tables.filter(table => folders.some(folder => folder.id === table.folder?.id));
for (const table of tables) await table.delete();
for (const folder of folders) await folder.delete();

ui.notifications.info('Random Loot Generator data was removed.');`;

const resetLootCountersCommand = `// Reset Specific Loot Counters Macro (Styled - V12/V13 Compatible)
const individualTreasureSettingsNamespace = "lootmakros";
const lootCounterSettingsKey = "lootCounters";

if (!game.user.isGM) {
  ui.notifications.warn("Nur der GM kann die Loot-Zähler zurücksetzen.");
} else {
  const currentCounters = game.settings.get(individualTreasureSettingsNamespace, lootCounterSettingsKey) || {
    individual: { "range-0-4": 0, "range-5-10": 0, "range-11-16": 0, "range-17": 0 },
    hoard: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 }
  };

  const ind = currentCounters.individual || {};
  const hoard = currentCounters.hoard || {};

  const renderItem = (name, label, value) => \`
    <label style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; border-radius: 4px; background: rgba(0,0,0,0.03); cursor: pointer; border: 1px solid rgba(0,0,0,0.08); transition: background 0.15s ease;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" name="\${name}" style="margin: 0; cursor: pointer;">
        <span style="font-weight: 500;">\${label}</span>
      </div>
      <span style="background: rgba(0,0,0,0.1); border-radius: 10px; padding: 1px 8px; font-size: 0.82em; font-weight: bold; color: \${value > 0 ? '#b45f06' : '#666'};\">\${value}</span>
    </label>
  \`;

  const dialogContent = \`
    <form style="padding: 2px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <p style="margin: 0; font-size: 0.9em; color: #444;">Wähle die Zähler zum Zurücksetzen:</p>
        <button type="button" id="select-all-btn" style="width: auto; padding: 3px 10px; font-size: 0.8em; line-height: 1.2;">
          <i class="fas fa-check-square"></i> Alle auswählen
        </button>
      </div>

      <fieldset style="border: 1px solid #7a7971; border-radius: 5px; margin-bottom: 12px; padding: 8px 10px; background: rgba(0,0,0,0.02);">
        <legend style="font-size: 0.85em; font-weight: bold; color: #4b4a44; padding: 0 4px;">Individual Treasure</legend>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.85em;">
          \${renderItem("ind-range-0-4", "CR 0-4", ind["range-0-4"] || 0)}
          \${renderItem("ind-range-5-10", "CR 5-10", ind["range-5-10"] || 0)}
          \${renderItem("ind-range-11-16", "CR 11-16", ind["range-11-16"] || 0)}
          \${renderItem("ind-range-17", "CR 17+", ind["range-17"] || 0)}
        </div>
      </fieldset>

      <fieldset style="border: 1px solid #7a7971; border-radius: 5px; padding: 8px 10px; background: rgba(0,0,0,0.02);">
        <legend style="font-size: 0.85em; font-weight: bold; color: #4b4a44; padding: 0 4px;">Treasure Hoard</legend>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.85em;">
          \${renderItem("hoard-tier1", "Tier 1", hoard.tier1 || 0)}
          \${renderItem("hoard-tier2", "Tier 2", hoard.tier2 || 0)}
          \${renderItem("hoard-tier3", "Tier 3", hoard.tier3 || 0)}
          \${renderItem("hoard-tier4", "Tier 4", hoard.tier4 || 0)}
        </div>
      </fieldset>
    </form>
  \`;

  new Dialog({
    title: "Loot-Zähler zurücksetzen",
    content: dialogContent,
    buttons: {
      reset: {
        icon: '<i class="fas fa-undo"></i>',
        label: "Zurücksetzen",
        callback: async (html) => {
          const updatedCounters = typeof structuredClone === "function" 
            ? structuredClone(currentCounters) 
            : foundry.utils.deepClone(currentCounters);

          let resetCount = 0;

          const indKeys = ["range-0-4", "range-5-10", "range-11-16", "range-17"];
          for (const key of indKeys) {
            if (html.find(\`[name="ind-\${key}"]\`).is(":checked")) {
              updatedCounters.individual[key] = 0;
              resetCount++;
            }
          }

          const hoardKeys = ["tier1", "tier2", "tier3", "tier4"];
          for (const key of hoardKeys) {
            if (html.find(\`[name="hoard-\${key}"]\`).is(":checked")) {
              updatedCounters.hoard[key] = 0;
              resetCount++;
            }
          }

          if (resetCount === 0) {
            ui.notifications.warn("Keine Zähler zum Zurücksetzen ausgewählt.");
            return;
          }

          await game.settings.set(individualTreasureSettingsNamespace, lootCounterSettingsKey, updatedCounters);
          ui.notifications.info(\`\${resetCount} Zähler erfolgreich zurückgesetzt!\`);
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Abbrechen"
      }
    },
    default: "reset",
    render: (html) => {
      let allChecked = false;
      html.find("#select-all-btn").on("click", (e) => {
        allChecked = !allChecked;
        html.find('input[type="checkbox"]').prop("checked", allChecked);
        $(e.currentTarget).html(allChecked 
          ? '<i class="fas fa-minus-square"></i> Alle abwählen' 
          : '<i class="fas fa-check-square"></i> Alle auswählen'
        );
      });

      html.find("label").hover(
        function() { $(this).css("background", "rgba(0,0,0,0.08)"); },
        function() { $(this).css("background", "rgba(0,0,0,0.03)"); }
      );
    }
  }, { width: 420 }).render(true);
}`;

// 4. Automatic table & macro synchronization on world start
Hooks.once('ready', async () => {
  if (!game.settings.get(MODULE_ID, 'enabled')) return;

  if (game.user.isGM && game.settings.get(MODULE_ID, 'macroSyncVersion') < MACRO_SYNC_VERSION) {
    console.log(`${MODULE_ID} | Synchronizing macros into DM and Player folders...`);
    
    // Ensure Macro folders exist
    const dmMacroFolder = game.folders.find(f => f.name === MACRO_DM_FOLDER_NAME && f.type === 'Macro')
      || await Folder.create({ name: MACRO_DM_FOLDER_NAME, type: 'Macro' });

    const playerMacroFolder = game.folders.find(f => f.name === MACRO_PLAYER_FOLDER_NAME && f.type === 'Macro')
      || await Folder.create({ name: MACRO_PLAYER_FOLDER_NAME, type: 'Macro' });

    const macrosToCreate = [
      // DM Folder Macros
      { name: 'RollTables to Chat', path: 'macros/RollTables_to_Chat.js', folderId: dmMacroFolder.id, ownership: NO_OWNERSHIP },
      { name: 'Reset_Loot_Counters', command: resetLootCountersCommand, folderId: dmMacroFolder.id, ownership: NO_OWNERSHIP },
      { name: 'Clean up Random Loot Generator', command: cleanupMacroCommand, folderId: dmMacroFolder.id, ownership: NO_OWNERSHIP },

      // Player Folder Macros
      { name: 'Individual Treasure', path: 'macros/Individual_Treasure.js', folderId: playerMacroFolder.id, ownership: OBSERVER_OWNERSHIP },
      { name: 'Potions', path: 'macros/Potions.js', folderId: playerMacroFolder.id, ownership: OBSERVER_OWNERSHIP },
      { name: 'Spells', path: 'macros/Spells.js', folderId: playerMacroFolder.id, ownership: OBSERVER_OWNERSHIP },
      { name: 'Targeted Loot', path: 'macros/Targeted_Loot.js', folderId: playerMacroFolder.id, ownership: OBSERVER_OWNERSHIP },
      { name: 'Treasure Hoard', path: 'macros/Treasure_Hoard.js', folderId: playerMacroFolder.id, ownership: OBSERVER_OWNERSHIP }
    ];

    for (const m of macrosToCreate) {
      if (m.command) {
        const existing = game.macros.find(macro => macro.name === m.name);
        if (existing) {
          await existing.update({ 
            command: m.command,
            folder: m.folderId,
            ownership: { default: m.ownership }
          });
        } else {
          await Macro.create({ 
            name: m.name, 
            type: 'script', 
            scope: 'global', 
            command: m.command,
            folder: m.folderId,
            ownership: { default: m.ownership }
          });
        }
      } else {
        await createMacroFromPath(m.name, m.path, m.folderId, m.ownership);
      }
    }

    await game.settings.set(MODULE_ID, 'macrosCreated', true);
    await game.settings.set(MODULE_ID, 'macroSyncVersion', MACRO_SYNC_VERSION);
    ui.notifications.info('Random Loot Generator: Macros updated in "Loot_DM" and "Loot_Player" folders.');
  }

  if (game.user.isGM) {
    try {
      const manifestUrl = `modules/${MODULE_ID}/roll_tables/manifest.json`;
      const resp = await fetch(manifestUrl);
      if (resp.ok) {
        const files = await resp.json();
        const folder = game.folders.find(f => f.name === ROLL_TABLE_FOLDER_NAME && f.type === 'RollTable')
          || await Folder.create({ name: ROLL_TABLE_FOLDER_NAME, type: 'RollTable' });
        const spellsFolder = game.folders.find(f =>
          f.name === SPELLS_FOLDER_NAME && f.type === 'RollTable' && f.folder?.id === folder.id
        ) || await Folder.create({ name: SPELLS_FOLDER_NAME, type: 'RollTable', folder: folder.id });
        let imported = 0;
        let normalized = 0;

        for (const fname of files) {
          try {
            const url = `modules/${MODULE_ID}/roll_tables/${encodeURIComponent(fname)}`;
            const r = await fetch(url);
            if (!r.ok) continue;
            const data = await r.json();
            if (!data?.name) continue;
            const isSpellTable = /^(wizard-)?spells-level-\d+\.json$/i.test(fname);
            const targetFolder = isSpellTable ? spellsFolder : folder;

            const existing = game.tables.find(t => t.name === data.name);
            if (existing) {
              await existing.update({ folder: targetFolder.id, ownership: { default: TABLE_OWNERSHIP } });
              normalized++;
              continue;
            }

            await RollTable.create({
              ...data,
              folder: targetFolder.id,
              ownership: { default: TABLE_OWNERSHIP }
            });
            imported++;
          } catch (e) {
            console.warn(`${MODULE_ID} | Failed importing ${fname}`, e);
          }
        }

        await game.settings.set(MODULE_ID, 'tablesImported', true);
        if (imported || normalized) {
          ui.notifications.info(`${MODULE_ID}: Imported ${imported} and organized ${normalized} RollTables in "${ROLL_TABLE_FOLDER_NAME}".`);
        }
      }
    } catch (err) {
      console.warn(`${MODULE_ID} | RollTables import failed`, err);
    }
  }
});