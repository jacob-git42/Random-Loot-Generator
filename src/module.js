const MODULE_ID = 'random-loot-generator';

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
});

async function createMacroFromPath(name, path) {
  try {
    const base = `modules/${MODULE_ID}`;
    const res = await fetch(`${base}/${path}`);
    if (!res.ok) return null;
    const cmd = await res.text();
    const existing = game.macros.find(m => m.name === name);
    if (existing) return existing;
    return await Macro.create({ name, type: 'script', scope: 'global', command: cmd });
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to create macro ${name}:`, err);
    return null;
  }
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

Hooks.once('ready', async () => {
  if (!game.settings.get(MODULE_ID, 'enabled')) return;

  // Create macros on first run (GM only)
  if (game.user.isGM && !game.settings.get(MODULE_ID, 'macrosCreated')) {
    console.log(`${MODULE_ID} | Creating macros from module files`);
    const macrosToCreate = [
      { name: 'Individual Treasure', path: 'macros/Individual_Treasure.js' },
      { name: 'Potions', path: 'macros/Potions.js' },
      { name: 'RollTables to Chat', path: 'macros/RollTables_to_Chat.js' },
      { name: 'Spells', path: 'macros/Spells.js' },
      { name: 'Targeted Loot', path: 'macros/Targeted_Loot.js' },
      { name: 'Treasure Hoard', path: 'macros/Treasure_Hoard.js' }
    ];

    for (const m of macrosToCreate) {
      await createMacroFromPath(m.name, m.path);
    }

    await game.settings.set(MODULE_ID, 'macrosCreated', true);
    ui.notifications.info('Random Loot Generator: Macros created.');
  }

  // Import RollTables from module roll_tables manifest if not already imported (GM only)
  if (game.user.isGM) {
    const importKey = 'tablesImported';
    if (!game.settings.settings.has(`${MODULE_ID}.${importKey}`)) {
      game.settings.register(MODULE_ID, importKey, { name: 'Tables Imported', scope: 'world', config: false, type: Boolean, default: false });
    }
    const already = game.settings.get(MODULE_ID, importKey);
    if (!already) {
      try {
        const manifestUrl = `modules/${MODULE_ID}/roll_tables/manifest.json`;
        const resp = await fetch(manifestUrl);
        if (resp.ok) {
          const files = await resp.json();
          let imported = 0;
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
              const exists = game.tables.find(t => t.name === data.name);
              if (exists) continue;
              await RollTable.create(data);
              imported++;
            } catch (e) {
              console.warn(`${MODULE_ID} | Failed importing ${fname}`, e);
            }
          }
          await game.settings.set(MODULE_ID, importKey, true);
          ui.notifications.info(`${MODULE_ID}: Imported ${imported} RollTables from module.`);
        }
      } catch (err) {
        console.warn(`${MODULE_ID} | RollTables import failed`, err);
      }
    }
  }

  // Add a small button to the left sidebar to open the LootPanel
  try {
    const container = document.querySelector('#sidebar');
    if (container) {
      const btn = document.createElement('a');
      btn.className = 'random-loot-button';
      btn.innerHTML = `<i class="fas fa-dice-d20"></i>`;
      btn.title = 'Random Loot';
      btn.style.cssText = 'display:block; padding:8px; text-align:center; color:var(--text-color); cursor:pointer;';
      btn.addEventListener('click', () => {
        if (!lootPanel) lootPanel = new LootPanel();
        lootPanel.render(true);
      });
      // append to sidebar header (if available)
      const header = container.querySelector('.sidebar-header');
      if (header) header.appendChild(btn);
      else container.appendChild(btn);
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | Failed to add sidebar button:`, err);
  }
});
