const MODULE_ID = 'random-loot-generator';
const ROLL_TABLE_FOLDER_NAME = 'Loot';
const OBSERVER_OWNERSHIP = 2;
const MACRO_SYNC_VERSION = 4;

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing Random Loot Generator`);

  game.settings.register(MODULE_ID, 'enabled', {
    name: 'Enable Random Loot Generator',
    hint: 'Enable or disable the Random Loot Generator module features',
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
});

async function createMacroFromPath(name, path) {
  try {
    const base = `modules/${MODULE_ID}`;
    const res = await fetch(`${base}/${path}`);
    if (!res.ok) return null;
    const cmd = await res.text();
    const existing = game.macros.find(m => m.name === name);
    if (existing) {
      await existing.update({ command: cmd });
      return existing;
    }
    return await Macro.create({ name, type: 'script', scope: 'global', command: cmd });
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to create macro ${name}:`, err);
    return null;
  }
}

async function cleanupRandomLootGenerator(folderName = 'Loot') {
  if (!game.user.isGM) {
    ui.notifications.warn('Only a GM can clean up Random Loot Generator data.');
    return;
  }

  const confirmed = await Dialog.confirm({
    title: 'Clean up Random Loot Generator',
    content: '<p>Delete the module macros, RollTables in the "Loot" folder, and the folder itself?</p><p>This cannot be undone.</p>'
  });
  if (!confirmed) return;

  const macroNames = [
    'Individual Treasure',
    'Potions',
    'RollTables to Chat',
    'Spells',
    'Targeted Loot',
    'Treasure Hoard',
    'Clean up Random Loot Generator'
  ];
  const macros = game.macros.filter(macro => macroNames.includes(macro.name));
  for (const macro of macros) await macro.delete();

  const folders = game.folders.filter(folder => folder.type === 'RollTable' && folder.name === folderName);
  const tables = game.tables.filter(table => folders.some(folder => folder.id === table.folder?.id));
  for (const table of tables) await table.delete();
  for (const folder of folders) await folder.delete();

  ui.notifications.info('Random Loot Generator data was removed.');
}

class LootPanel extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'random-loot-panel',
      title: 'Random Loot Generator',
      template: `modules/${MODULE_ID}/templates/loot-panel.html`,
      width: 420,
      height: 'auto',
      resizable: true
    });
  }

  getData() {
    return {};
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="run-macro"]').on('click', async (ev) => {
      const name = ev.currentTarget.dataset.name;
      const macro = game.macros.find(m => m.name === name);
      if (macro) await macro.execute();
      else ui.notifications.warn(`Macro not found: ${name}`);
    });
  }
}

let lootPanel = null;

function addLootSidebarButton(sidebarHtml) {
  const root = sidebarHtml?.[0] || sidebarHtml;
  const tabs = root?.querySelector('#sidebar-tabs, .sidebar-tabs, #sidebar .tabs, #sidebar nav.tabs');
  if (!tabs || tabs.querySelector('.random-loot-button')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'item random-loot-button';
  button.innerHTML = '<i class="fas fa-dice-d20"></i>';
  button.title = 'Random Loot Generator';
  button.setAttribute('aria-label', 'Random Loot Generator');
  button.addEventListener('click', () => {
    if (!lootPanel) lootPanel = new LootPanel();
    lootPanel.render(true);
  });
  tabs.appendChild(button);
}

Hooks.on('renderSidebar', (_app, html) => addLootSidebarButton(html));
Hooks.on('renderSidebarTab', (_app, html) => addLootSidebarButton(document.querySelector('#sidebar')));

Hooks.once('ready', async () => {
  if (!game.settings.get(MODULE_ID, 'enabled')) return;

  // Create or update module macros (GM only)
  if (game.user.isGM && game.settings.get(MODULE_ID, 'macroSyncVersion') < MACRO_SYNC_VERSION) {
    console.log(`${MODULE_ID} | Creating macros from module files`);
    const macrosToCreate = [
      { name: 'Individual Treasure', path: 'macros/Individual_Treasure.js' },
      { name: 'Potions', path: 'macros/Potions.js' },
      { name: 'RollTables to Chat', path: 'macros/RollTables_to_Chat.js' },
      { name: 'Spells', path: 'macros/Spells.js' },
      { name: 'Targeted Loot', path: 'macros/Targeted_Loot.js' },
      { name: 'Treasure Hoard', path: 'macros/Treasure_Hoard.js' },
      { name: 'Clean up Random Loot Generator', command: `(${cleanupRandomLootGenerator.toString()})();` }
    ];

    for (const m of macrosToCreate) {
      if (m.command) {
        const existing = game.macros.find(macro => macro.name === m.name);
        if (existing) await existing.update({ command: m.command });
        else await Macro.create({ name: m.name, type: 'script', scope: 'global', command: m.command });
      } else {
        await createMacroFromPath(m.name, m.path);
      }
    }

    await game.settings.set(MODULE_ID, 'macrosCreated', true);
    await game.settings.set(MODULE_ID, 'macroSyncVersion', MACRO_SYNC_VERSION);
    ui.notifications.info('Random Loot Generator: Macros created.');
  }

  // Import and normalize module RollTables (GM only)
  if (game.user.isGM) {
    try {
      const manifestUrl = `modules/${MODULE_ID}/roll_tables/manifest.json`;
      const resp = await fetch(manifestUrl);
      if (resp.ok) {
        const files = await resp.json();
        const folder = game.folders.find(f => f.name === ROLL_TABLE_FOLDER_NAME && f.type === 'RollTable')
          || await Folder.create({ name: ROLL_TABLE_FOLDER_NAME, type: 'RollTable' });
        let imported = 0;
        let normalized = 0;

        for (const fname of files) {
          try {
            const url = `modules/${MODULE_ID}/roll_tables/${encodeURIComponent(fname)}`;
            const r = await fetch(url);
            if (!r.ok) {
              console.warn(`${MODULE_ID} | Missing roll table file: ${fname}`);
              continue;
            }
            const data = await r.json();
            if (!data?.name) continue;

            const existing = game.tables.find(t => t.name === data.name);
            if (existing) {
              await existing.update({ folder: folder.id, ownership: { default: OBSERVER_OWNERSHIP } });
              normalized++;
              continue;
            }

            await RollTable.create({
              ...data,
              folder: folder.id,
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

  // Add the module button to the sidebar tab bar.
  try {
    addLootSidebarButton(document.querySelector('#sidebar'));
  } catch (err) {
    console.warn(`${MODULE_ID} | Failed to add sidebar button:`, err);
  }
});
