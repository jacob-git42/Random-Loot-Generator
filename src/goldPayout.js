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
 * Loads and displays previously saved configuration
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
          <div style="flex: 1; color: #f39c12; font-style: italic;">No character available</div>
          <input type="checkbox" name="include-${userId}" disabled style="cursor: not-allowed; opacity: 0.5;">
        </div>
      `;
      continue;
    }
    
    // Use saved character if exists, otherwise use first character
    const defaultCharId = savedChar?.characterId || characters[0]?.id;
    
    // Checkbox: checked only if previously saved
    const isChecked = savedChar ? 'checked' : '';
    
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
        <input type="checkbox" name="include-${userId}" ${isChecked} style="cursor: pointer;">
      </div>
    `;
  }
  
  const dialogContent = `
    <form style="padding: 10px;">
      <p style="margin-bottom: 12px; font-size: 0.9em; color: #666;">
        <strong>Select which characters should receive gold:</strong>
      </p>
      <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; border-radius: 4px;">
        ${formRows}
      </div>
      <p style="margin-top: 12px; font-size: 0.85em; color: #999;">This configuration will be saved and used for future payouts.</p>
    </form>
  `;
  
  return new Promise((resolve) => {
    new Dialog({
      title: "Configure Gold Payout",
      content: dialogContent,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Save",
          callback: async (html) => {
            const config = {};
            
            for (const userId of userIds) {
              const isIncluded = html.find(`[name="include-${userId}"]`).is(':checked');
              if (!isIncluded) continue;
              
              const characters = playerCharactersMap[userId];
              if (characters.length === 0) continue;
              
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
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "save"
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
        <strong>Confirm: Gold Distribution</strong>
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 0.9em;">
        <thead>
          <tr style="background: rgba(0,0,0,0.05);">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ccc;">Player</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ccc;">Character</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ccc;">Gold</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr style="background: rgba(0,0,0,0.08); font-weight: bold;">
            <td colspan="2" style="padding: 8px; border-top: 2px solid #ccc;">Total:</td>
            <td style="padding: 8px; border-top: 2px solid #ccc; text-align: right;"><i class="fas fa-coins"></i> ${totalGold.toLocaleString()} gp</td>
          </tr>
        </tfoot>
      </table>
      <p style="color: #666; font-size: 0.85em;">Proceed?</p>
    </div>
  `;
  
  return new Promise((resolve) => {
    new Dialog({
      title: "Confirm Gold Distribution",
      content: dialogContent,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm & Distribute",
          callback: () => resolve(true)
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
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
      results.details.push(`✅ ${config.characterName}: +${goldPerPlayer.toLocaleString()} gp (total: ${newGold.toLocaleString()} gp)`);
    } catch (err) {
      console.error(`${MODULE_ID} | Gold payout error for ${config.characterName}:`, err);
      results.failed++;
      results.details.push(`❌ ${config.characterName}: Error saving`);
    }
  }
  
  return results;
}

/**
 * Main entry point: Handle gold payout workflow
 * Should be called after loot generation
 */
async function handleGoldPayout(goldPerPlayer) {
  if (!game.user?.isGM) {
    ui.notifications.warn('Only the GM can distribute gold.');
    return;
  }
  
  try {
    // Get all player characters
    const playerCharactersMap = await getPlayerCharactersMap();
    
    if (Object.keys(playerCharactersMap).length === 0) {
      ui.notifications.warn('No player characters found.');
      return;
    }
    
    // Load saved config or show config dialog
    let selectedConfig = loadSavedPayoutConfig();
    
    // If no config exists or is incomplete, show configuration dialog
    if (Object.keys(selectedConfig).length === 0) {
      ui.notifications.info('Gold payout: Please select which characters should receive gold.');
      selectedConfig = await showPayoutConfigurationDialog(playerCharactersMap);
      
      if (!selectedConfig) {
        ui.notifications.info('Gold payout cancelled.');
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
      ui.notifications.info('Gold payout cancelled.');
      return;
    }
    
    // Process payout
    const results = await processGoldPayout(goldPerPlayer, selectedConfig);
    
    if (results.failed === 0) {
      ui.notifications.info(`✅ Gold successfully distributed to ${results.success} players!`);
    } else if (results.success > 0) {
      ui.notifications.warn(`⚠️ Gold partially distributed (${results.success}/${results.success + results.failed})`);
    } else {
      ui.notifications.error('❌ Gold distribution failed.');
    }
    
  } catch (err) {
    console.error(`${MODULE_ID} | Gold payout workflow error:`, err);
    ui.notifications.error('Error distributing gold. Check console for details.');
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
    ui.notifications.warn('Only the GM can configure gold payout.');
    return;
  }

  try {
    const playerCharactersMap = await getPlayerCharactersMap();
    
    // Debug log
    console.log(`${MODULE_ID} | Character Map:`, playerCharactersMap);
    
    if (Object.keys(playerCharactersMap).length === 0) {
      ui.notifications.warn('No player characters found.');
      return;
    }
    
    const config = await showPayoutConfigurationDialog(playerCharactersMap);
    
    if (config) {
      ui.notifications.info('✅ Gold payout configuration saved!');
    } else {
      ui.notifications.info('Configuration cancelled.');
    }
  } catch (err) {
    console.error(`${MODULE_ID} | Configuration dialog error:`, err);
    ui.notifications.error('Error opening configuration dialog.');
  }
}

// Export functions globally for macro access
Hooks.once('setup', () => {
  window.handleGoldPayout = handleGoldPayout;
  window.showPayoutConfigurationDialog = showPayoutConfigurationDialog;
  window.openPayoutConfigurationDialog = openPayoutConfigurationDialog;
  window.jacobs_loot_debugCharacters = debugCharactersAndOwnership;
});

/**
 * Register hook to listen for loot reveal events
 * This allows GM to confirm gold payout after a player reveals loot
 */
Hooks.on('lootRevealed', async (data) => {
  // Only GM can process payouts
  if (!game.user?.isGM) return;
  
  console.log(`${MODULE_ID} | Loot revealed:`, data);
  
  // Determine gold amount based on macro type
  let goldPerPlayer = 0;
  
  if (data.claimMarker === 'LOOT-CLAIM:INDIVIDUAL') {
    // For Individual Treasure, we need to calculate based on the preset that was used
    // This will be retrieved from settings
    const preset = game.settings.get('lootmakros', 'individualTreasurePreset') || {};
    if (preset.counts) {
      // Calculate total gold from the individual treasure rolls
      // Formula per the Individual Treasure macro: 4d6 * multiplier
      let totalGold = 0;
      totalGold += (preset.counts['range-0-4'] || 0) * 14; // 4d6 average = 14
      totalGold += (preset.counts['range-5-10'] || 0) * 140; // 4d6*10 average
      totalGold += (preset.counts['range-11-16'] || 0) * 1400; // 4d6*100 average
      totalGold += (preset.counts['range-17'] || 0) * 14000; // 4d6*1000 average
      goldPerPlayer = Math.ceil(totalGold / 4);
    }
  } else if (data.claimMarker === 'LOOT-CLAIM:HOARD') {
    // For Treasure Hoard, get from preset
    const preset = game.settings.get('lootmakros', 'treasureHoardPreset') || {};
    if (preset.tier) {
      // Base gold amounts for each hoard tier (these are approximate)
      const tierGold = {
        1: 180,
        2: 540,
        3: 2700,
        4: 13500
      };
      goldPerPlayer = Math.ceil((tierGold[preset.tier] || 0) / 4);
    }
  } else if (data.claimMarker === 'LOOT-CLAIM:SPELLS' || 
             data.claimMarker === 'LOOT-CLAIM:POTIONS' || 
             data.claimMarker === 'LOOT-CLAIM:TARGETED') {
    // For other loot types, no automatic gold payout
    console.log(`${MODULE_ID} | No automatic gold payout for ${data.claimMarker}`);
    return;
  }
  
  if (goldPerPlayer <= 0) {
    console.warn(`${MODULE_ID} | Could not calculate gold for ${data.claimMarker}`);
    return;
  }
  
  // Process payout directly (handleGoldPayout shows its own confirmation dialog)
  try {
    const playerCharactersMap = await getPlayerCharactersMap();
    const savedConfig = loadSavedPayoutConfig();
    
    // Check if config exists
    const configuredCount = Object.keys(savedConfig).length;
    if (configuredCount === 0) {
      ui.notifications.warn('No player configuration found for gold distribution. Please configure players first.');
      return;
    }
    
    // Call handleGoldPayout which shows the confirmation dialog
    await handleGoldPayout(goldPerPlayer);
    
  } catch (err) {
    console.error(`${MODULE_ID} | Error in lootRevealed hook:`, err);
    ui.notifications.error('Error distributing gold.');
  }
});
