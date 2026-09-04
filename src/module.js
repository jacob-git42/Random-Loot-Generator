const MODULE_ID = 'jacobs-loot-generator';
const ROLL_TABLE_FOLDER_NAME = 'Loot';
const MACRO_DM_FOLDER_NAME = 'Loot_DM';
const MACRO_PLAYER_FOLDER_NAME = 'Loot_Player';
const SPELLS_FOLDER_NAME = 'Spells';
const OBSERVER_OWNERSHIP = 2;
const NO_OWNERSHIP = 0;
const MACRO_SYNC_VERSION = 13; // Version erhöht für Loot_DM & Loot_Player Trennung

// Extract AppV2 classes from foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { AbstractSidebarTab } = foundry.applications.sidebar;

// 1. Define Sidebar Tab using HandlebarsApplicationMixin + AbstractSidebarTab
class JacobsLootSidebarTab extends HandlebarsApplicationMixin(AbstractSidebarTab) {
  static tabName = 'lootGenerator';

  static DEFAULT_OPTIONS = {
    id: 'jacobs-loot-generator',
    actions: {
      runMacro: JacobsLootSidebarTab.#onRunMacro
    }
  };

  static PARTS = {
    tab: {
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

  // Register sidebar tab metadata
  CONFIG.ui.sidebar.TABS.lootGenerator = {
    icon: 'fa-solid fa-dice-d4',
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

// 4. Automatic table & macro synchronization on world start
Hooks.once('ready', async () => {
  if (!game.settings.get(MODULE_ID, 'enabled')) return;

  if (game.user.isGM && game.settings.get(MODULE_ID, 'macroSyncVersion') < MACRO_SYNC_VERSION) {
    console.log(`${MODULE_ID} | Creating/updating macros in "Loot_DM" and "Loot_Player" folders`);
    
    // Ensure Macro folders exist
    const dmMacroFolder = game.folders.find(f => f.name === MACRO_DM_FOLDER_NAME && f.type === 'Macro')
      || await Folder.create({ name: MACRO_DM_FOLDER_NAME, type: 'Macro' });

    const playerMacroFolder = game.folders.find(f => f.name === MACRO_PLAYER_FOLDER_NAME && f.type === 'Macro')
      || await Folder.create({ name: MACRO_PLAYER_FOLDER_NAME, type: 'Macro' });

    // Define macro assignments, folders, and ownerships
    const macrosToCreate = [
      // DM Folder Macros (Ownership: NONE / GM Only)
      { name: 'RollTables to Chat', path: 'macros/RollTables_to_Chat.js', folderId: dmMacroFolder.id, ownership: NO_OWNERSHIP },
      { name: 'Reset_Loot_Counters', path: 'macros/Reset_Loot_Counters.js', folderId: dmMacroFolder.id, ownership: NO_OWNERSHIP },
      { name: 'Clean up Random Loot Generator', command: cleanupMacroCommand, folderId: dmMacroFolder.id, ownership: NO_OWNERSHIP },

      // Player Folder Macros (Ownership: OBSERVER)
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
              await existing.update({ folder: targetFolder.id, ownership: { default: OBSERVER_OWNERSHIP } });
              normalized++;
              continue;
            }

            await RollTable.create({
              ...data,
              folder: targetFolder.id,
              ownership: { default: OBSERVER_OWNERSHIP }
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