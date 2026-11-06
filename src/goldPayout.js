/**
 * Gold Payout System for Random Loot Generator
 * Handles distribution of gold to player characters
 */

const MODULE_ID = 'jacobs-loot-generator';
const GOLD_PAYOUT_SETTINGS_KEY = 'goldPayoutCharacters';

/**
 * Get all player-owned characters grouped by user
 * Uses ownership levels to determine player character assignment
 * Returns: { [userId]: [{ id, name, owner }] }
 */
async function getPlayerCharactersMap() {
  const map = {};
  const allUsers = game.users || [];
  
  for (const user of allUsers) {
    // Skip GM users
    if (user.isGM) continue;
    
    // Find all actors where this user is OWNER and the actor is a CHARACTER (not NPC/monster)
    const owned = game.actors.filter(a => {
      // Only player characters, not NPCs or monsters
      if (a.type !== 'character') return false;
      
      // Check ownership level: user owns it or default allows owner access
      const perm = a.ownership[user.id] ?? a.ownership.default;
      return perm >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    });
    
    if (owned.length > 0) {
      map[user.id] = owned.map(a => ({
        id: a.id,
        name: a.name,
        owner: user.name
      }));
      
      console.log(`${MODULE_ID} | Character Map: ${user.name} → ${owned.map(a => a.name).join(', ')}`);
    } else {
      // Player without character
      map[user.id] = [];
      console.warn(`${MODULE_ID} | User "${user.name}" has no character assigned`);
    }
  }
  
  return map;
}

/**
 * Load saved payout configuration
 * Returns: { [userId]: { characterId, characterName } }
 */
function loadSavedPayoutConfig() {
  return game.settings.get(MODULE_ID, GOLD_PAYOUT_SETTINGS_KEY) || {};
}

/**
 * Save payout configuration
 */
async function savePayoutConfig(config) {
  await game.settings.set(MODULE_ID, GOLD_PAYOUT_SETTINGS_KEY, config);
}

/**
 * Show dialog to configure which players receive gold
 * First time: auto-select default character per player
 * Returns: { [userId]: { characterId, characterName } } or null if cancelled
 */
async function showPayoutConfigurationDialog(playerCharactersMap) {
  const savedConfig = loadSavedPayoutConfig();
  
  // Build form HTML
  let formRows = '';
  const userIds = Object.keys(playerCharactersMap).sort();
  
  for (const userId of userIds) {
    const characters = playerCharactersMap[userId];
    const savedChar = savedConfig[userId];
    
    // Get player user
    const user = game.users?.get(userId);
    const ownerName = user?.name || 'Unknown';
    
    // If no characters, show message
    if (characters.length === 0) {
      formRows += `
        <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid #ddd; background: rgba(255,165,0,0.1);">
          <label style="flex: 1; font-weight: bold; min-width: 120px;">${ownerName}</label>
          <div style="flex: 1; color: #f39c12; font-style: italic;">Kein Charakter verfügbar</div>
          <input type="checkbox" name="include-${userId}" disabled style="cursor: not-allowed; opacity: 0.5;">
        </div>
      `;
      continue;
    }
    
    // Default to first character if not saved, else use saved
    const defaultCharId = savedChar?.characterId || characters[0]?.id;
    
    // Build select options
    const options = characters.map(char => 
      `<option value="${char.id}" ${char.id === defaultCharId ? 'selected' : ''}>${char.name}</option>`
    ).join('');
    
    formRows += `
      <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid #ddd;">
        <label style="flex: 1; font-weight: bold; min-width: 120px;">${ownerName}</label>
        <select name="user-${userId}" style="flex: 1; min-width: 150px;">
          ${options}
        </select>
        <input type="checkbox" name="include-${userId}" checked style="cursor: pointer;">
      </div>
    `;
  }
  
  const dialogContent = `
    <form style="padding: 10px;">
      <p style="margin-bottom: 12px; font-size: 0.9em; color: #666;">
        <strong>Wähle aus, welche Charaktere Gold erhalten sollen:</strong>
      </p>
      <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; border-radius: 4px;">
        ${formRows}
      </div>
      <p style="margin-top: 12px; font-size: 0.85em; color: #999;">Diese Einstellung wird gespeichert und für zukünftige Auszahlungen verwendet.</p>
    </form>
  `;
  
  return new Promise((resolve) => {
    new Dialog({
      title: "Gold-Auszahlung konfigurieren",
      content: dialogContent,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Speichern & Auszahlen",
          callback: async (html) => {
            const config = {};
            
            for (const userId of userIds) {
              const isIncluded = html.find(`[name="include-${userId}"]`).is(':checked');
              if (!isIncluded) continue;
              
              const characters = playerCharactersMap[userId];
              if (characters.length === 0) continue; // Skip players without characters
              
              const selectedCharId = html.find(`[name="user-${userId}"]`).val();
              const selectedChar = characters.find(c => c.id === selectedCharId);
              
              if (selectedChar) {
                config[userId] = {
                  characterId: selectedChar.id,
                  characterName: selectedChar.name
                };
              }
            }
            
            await savePayoutConfig(config);
            resolve(config);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Abbrechen",
          callback: () => resolve(null)
        }
      },
      default: "save",
      render: (html) => {
        // Optional: Add select-all functionality
        const selectAllBtn = html.find('button:contains("Speichern")');
      }
    }).render(true);
  });
}

/**
 * Show GM confirmation dialog before processing payout
 * Returns: true if confirmed, false otherwise
 */
async function showPayoutConfirmationDialog(goldPerPlayer, selectedPlayers, playerCharactersMap) {
  const rows = selectedPlayers.map(userId => {
    const config = loadSavedPayoutConfig()[userId];
    const charName = config?.characterName || 'Unknown';
    return `<tr>
      <td style="padding: 6px; border-bottom: 1px solid #ddd;">${playerCharactersMap[userId]?.[0]?.owner || 'Unknown'}</td>
      <td style="padding: 6px; border-bottom: 1px solid #ddd;">${charName}</td>
      <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;"><i class="fas fa-coins"></i> ${goldPerPlayer.toLocaleString()} gp</td>
    </tr>`;
  }).join('');
  
  const totalGold = goldPerPlayer * selectedPlayers.length;
  
  const dialogContent = `
    <div style="padding: 10px;">
      <p style="margin-bottom: 15px; font-size: 0.95em;">
        <strong>Bestätigung: Gold-Auszahlung</strong>
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 0.9em;">
        <thead>
          <tr style="background: rgba(0,0,0,0.05);">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ccc;">Spieler</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ccc;">Charakter</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ccc;">Gold</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr style="background: rgba(0,0,0,0.08); font-weight: bold;">
            <td colspan="2" style="padding: 8px; border-top: 2px solid #ccc;">Insgesamt:</td>
            <td style="padding: 8px; border-top: 2px solid #ccc; text-align: right;"><i class="fas fa-coins"></i> ${totalGold.toLocaleString()} gp</td>
          </tr>
        </tfoot>
      </table>
      <p style="color: #666; font-size: 0.85em;">Fortfahren?</p>
    </div>
  `;
  
  return new Promise((resolve) => {
    new Dialog({
      title: "Gold-Auszahlung bestätigen",
      content: dialogContent,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Bestätigen & Auszahlen",
          callback: () => resolve(true)
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Abbrechen",
          callback: () => resolve(false)
        }
      },
      default: "confirm"
    }).render(true);
  });
}

/**
 * Process gold payout to selected characters
 * selectedConfig: { [userId]: { characterId, characterName } }
 */
async function processGoldPayout(goldPerPlayer, selectedConfig) {
  if (!selectedConfig || Object.keys(selectedConfig).length === 0) {
    ui.notifications.warn('Keine Spieler konfiguriert für Gold-Auszahlung.');
    return false;
  }
  
  const results = {
    success: 0,
    failed: 0,
    details: []
  };
  
  for (const [userId, config] of Object.entries(selectedConfig)) {
    try {
      const actor = game.actors?.get(config.characterId);
      
      if (!actor) {
        results.failed++;
        results.details.push(`❌ ${config.characterName}: Charakter nicht gefunden`);
        continue;
      }
      
      // Get current gold
      const currentGold = actor.system?.currency?.gp || 0;
      const newGold = currentGold + goldPerPlayer;
      
      // Update character with new gold
      await actor.update({
        'system.currency.gp': newGold
      });
      
      results.success++;
      results.details.push(`✅ ${config.characterName}: +${goldPerPlayer.toLocaleString()} gp (gesamt: ${newGold.toLocaleString()} gp)`);
    } catch (err) {
      console.error(`${MODULE_ID} | Gold payout error for ${config.characterName}:`, err);
      results.failed++;
      results.details.push(`❌ ${config.characterName}: Fehler beim Speichern`);
    }
  }
  
  return results;
}

/**
 * Create a chat card with payout results
 */
async function createPayoutResultCard(results, goldPerPlayer) {
  const detailsHtml = results.details.map(detail => `<li>${detail}</li>`).join('');
  
  const statusColor = results.failed === 0 ? '#28a745' : (results.success > 0 ? '#ffc107' : '#dc3545');
  const statusIcon = results.failed === 0 ? 'fa-check-circle' : (results.success > 0 ? 'fa-exclamation-circle' : 'fa-times-circle');
  
  const chatContent = `
    <div class="loot-card" style="border-left: 4px solid ${statusColor};">
      <p class="loot-card__eyebrow" style="margin: 0 0 4px 0;">Gold-Auszahlung</p>
      <h3 style="color: ${statusColor};">
        <i class="fas ${statusIcon}"></i> Auszahlungsergebnis
      </h3>
      <hr>
      <p style="margin: 8px 0; font-size: 0.95em;">
        <strong>Pro Spieler:</strong> <i class="fas fa-coins"></i> ${goldPerPlayer.toLocaleString()} gp
      </p>
      <p style="margin: 8px 0; font-size: 0.9em; color: #666;">
        Erfolgreich: ${results.success} | Fehler: ${results.failed}
      </p>
      <ul style="font-size: 0.85em; margin: 8px 0; padding-left: 20px; color: #333;">
        ${detailsHtml}
      </ul>
    </div>
  `;
  
  const enrichedContent = await TextEditor.enrichHTML(chatContent, { async: true });
  
  await ChatMessage.create({
    content: enrichedContent,
    speaker: ChatMessage.getSpeaker({ alias: 'Loot System' })
  });
}

/**
 * Main entry point: Handle gold payout workflow
 * Should be called after loot generation
 */
async function handleGoldPayout(goldPerPlayer) {
  if (!game.user?.isGM) {
    ui.notifications.warn('Nur der GM kann Gold auszahlen.');
    return;
  }
  
  try {
    // Get all player characters
    const playerCharactersMap = await getPlayerCharactersMap();
    
    if (Object.keys(playerCharactersMap).length === 0) {
      ui.notifications.warn('Keine Spieler-Charaktere gefunden.');
      return;
    }
    
    // Load saved config or show config dialog
    let selectedConfig = loadSavedPayoutConfig();
    
    // If no config exists or is incomplete, show configuration dialog
    if (Object.keys(selectedConfig).length === 0) {
      ui.notifications.info('Gold-Auszahlung: Bitte wähle die Charaktere aus.');
      selectedConfig = await showPayoutConfigurationDialog(playerCharactersMap);
      
      if (!selectedConfig) {
        ui.notifications.info('Gold-Auszahlung abgebrochen.');
        return;
      }
    }
    
    // Get userId list of configured players
    const selectedUserIds = Object.keys(selectedConfig);
    
    // Show confirmation dialog
    const confirmed = await showPayoutConfirmationDialog(
      goldPerPlayer,
      selectedUserIds,
      playerCharactersMap
    );
    
    if (!confirmed) {
      ui.notifications.info('Gold-Auszahlung abgebrochen.');
      return;
    }
    
    // Process payout
    const results = await processGoldPayout(goldPerPlayer, selectedConfig);
    
    // Create result card
    await createPayoutResultCard(results, goldPerPlayer);
    
    if (results.failed === 0) {
      ui.notifications.info(`✅ Gold erfolgreich an ${results.success} Spieler ausgezahlt!`);
    } else if (results.success > 0) {
      ui.notifications.warn(`⚠️ Gold teilweise ausgezahlt (${results.success}/${results.success + results.failed})`);
    } else {
      ui.notifications.error('❌ Gold-Auszahlung fehlgeschlagen.');
    }
    
  } catch (err) {
    console.error(`${MODULE_ID} | Gold payout workflow error:`, err);
    ui.notifications.error('Fehler bei der Gold-Auszahlung. Siehe Console für Details.');
  }
}

/**
 * Debug function: Log all characters and ownership
 * Run in console: game.jacobs_loot_debugCharacters()
 */
async function debugCharactersAndOwnership() {
  console.log(`%c=== ${MODULE_ID} Character Debug ===`, 'color: #ffc107; font-weight: bold');
  
  // Log all users
  console.log('%cUSERS:', 'color: #2196F3; font-weight: bold');
  const allUsers = game.users || [];
  for (const user of allUsers) {
    console.log(`  [${user.id}] ${user.name} (isGM: ${user.isGM})`);
  }
  
  // Log all characters and their ownership
  console.log('%cCHARACTERS:', 'color: #2196F3; font-weight: bold');
  const actors = game.actors || [];
  for (const actor of actors) {
    if (actor.type === 'character') {
      console.log(`  [${actor.id}] ${actor.name}`);
      console.log(`    Type: ${actor.type}`);
      console.log(`    Ownership:`, actor.ownership);
      
      // Try to find owner
      let ownerId = null;
      const owners = Object.entries(actor.ownership || {})
        .filter(([key, val]) => val === 3)
        .map(([key]) => key);
      if (owners.length > 0) ownerId = owners[0];
      
      if (ownerId) {
        const owner = game.users?.get(ownerId);
        console.log(`    Owner: ${owner?.name || 'Unknown'} (${ownerId})`);
      } else {
        console.warn(`    ⚠️ NO OWNER FOUND (ownership might be stored differently)`);
      }
    }
  }
  
  // Show character map
  console.log('%cCHARACTER MAP:', 'color: #2196F3; font-weight: bold');
  const map = await getPlayerCharactersMap();
  console.log(map);
  
  console.log(`%c=== Debug Complete ===`, 'color: #ffc107; font-weight: bold');
}

/**
 * Open configuration dialog from sidebar button
 * Allows GM to change player/character configuration at any time
 */
async function openPayoutConfigurationDialog() {
  if (!game.user?.isGM) {
    ui.notifications.warn('Nur der GM kann die Gold-Auszahlung konfigurieren.');
    return;
  }

  try {
    const playerCharactersMap = await getPlayerCharactersMap();
    
    // Debug log
    console.log(`${MODULE_ID} | Character Map:`, playerCharactersMap);
    
    if (Object.keys(playerCharactersMap).length === 0) {
      ui.notifications.warn('Keine Spieler-Charaktere gefunden.');
      return;
    }
    
    const config = await showPayoutConfigurationDialog(playerCharactersMap);
    
    if (config) {
      ui.notifications.info('✅ Gold-Payout-Konfiguration gespeichert!');
    } else {
      ui.notifications.info('Konfiguration abgebrochen.');
    }
  } catch (err) {
    console.error(`${MODULE_ID} | Configuration dialog error:`, err);
    ui.notifications.error('Fehler beim Öffnen des Konfigurationsdialogs.');
  }
}

// Export functions globally for macro access
Hooks.once('setup', () => {
  window.handleGoldPayout = handleGoldPayout;
  window.showPayoutConfigurationDialog = showPayoutConfigurationDialog;
  window.openPayoutConfigurationDialog = openPayoutConfigurationDialog;
  window.jacobs_loot_debugCharacters = debugCharactersAndOwnership;
});
