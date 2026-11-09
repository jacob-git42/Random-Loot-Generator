const MODULE_ID = 'jacobs-loot-generator';

// Loot sessions live only in the GM client's memory. Chat cards carry just the anonymous session id.
const lootSessions = new Map();
let lootSocket = null;
let executionQueue = Promise.resolve();

function createLootSession({ macroId, macroName, preset }) {
  const sessionId = foundry.utils.randomID();
  lootSessions.set(sessionId, { macroId, macroName, preset });
  return sessionId;
}

Hooks.once('init', () => {
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = { ...(module.api ?? {}), createLootSession };
});

Hooks.once('socketlib.ready', () => {
  lootSocket = socketlib.registerModule(MODULE_ID);
  // Registered on every client so socketlib knows the function name; only the GM executes it
  lootSocket.register('claimLoot', handleClaimLoot);
});

async function handleClaimLoot({ sessionId, messageId, tokenId, sceneId, userId } = {}) {
  if (!game.user.isGM) return;

  const session = lootSessions.get(sessionId);
  if (!session) {
    throw new Error('Loot session is invalid or already claimed on this GM client.');
  }

  const user = game.users.get(userId);
  if (!user || !canvas.ready || canvas.scene?.id !== sceneId) {
    throw new Error('The GM must view the same scene as the player.');
  }
  const token = tokenId ? canvas.tokens?.get(tokenId) : null;
  if (!token || (!user.isGM && !token.document.testUserPermission(user, 'OWNER'))) {
    throw new Error('Select a token owned by your user before revealing the loot.');
  }
  const message = game.messages.get(messageId);
  if (!message || !message.content.includes(`data-session-id="${sessionId}"`)) {
    throw new Error('The loot card does not match this session.');
  }

  // Claim before the first await so simultaneous clicks cannot execute twice.
  lootSessions.delete(sessionId);
  const claimerName = token.name;
  const lockedContent = message.content.replace(
    /<button[^>]*reveal-loot-btn[^>]*>[\s\S]*?<\/button>/,
    '<span class="loot-card__button--locked">🔒 Loot Claimed 🔒</span>'
  );
  try {
    await message.update({ content: lockedContent });
  } catch (error) {
    lootSessions.set(sessionId, session);
    throw error;
  }

  // Loot macros read their preset from a world setting, so runs are serialized
  executionQueue = executionQueue
    .then(() => runLootMacro(session, { claimerName, tokenId, sceneId, userId }))
    .catch(err => {
      console.error(`${MODULE_ID} | Error executing loot macro:`, err);
      ui.notifications.error('Loot macro failed. See console for details.');
    });
  await executionQueue;
}

async function runLootMacro(session, scope) {
  const macro = game.macros.get(session.macroId) ?? game.macros.getName(session.macroName);
  if (!macro) {
    ui.notifications.error(`Loot macro "${session.macroName}" not found!`);
    return;
  }

  if (session.preset) {
    await game.settings.set(session.preset.namespace, session.preset.key, session.preset.value);
  }
  const createCollector = game.modules.get(MODULE_ID)?.api?.createLootCollector;
  if (!createCollector) throw new Error('Item Piles integration is not available.');
  await macro.execute({ ...scope, lootCollector: createCollector(scope) });
}

function bindRevealButtons(message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  for (const button of root.querySelectorAll('.reveal-loot-btn')) {
    if (button.dataset.bound) continue;
    button.dataset.bound = 'true';

    button.addEventListener('click', async event => {
      event.preventDefault();
      if (!lootSocket) {
        ui.notifications.error('socketlib is not ready.');
        return;
      }

      const controlledToken = canvas.tokens?.controlled[0];
      if (!canvas.ready || !canvas.scene || !controlledToken) {
        ui.notifications.warn('Select a token on the active scene before revealing loot.');
        return;
      }

      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending...';

      try {
        await lootSocket.executeAsGM('claimLoot', {
          sessionId: button.dataset.sessionId,
          messageId: message.id,
          tokenId: controlledToken.id,
          sceneId: canvas.scene.id,
          userId: game.user.id
        });
      } catch (err) {
        console.error(`${MODULE_ID} | Failed to send loot claim to GM:`, err);
        ui.notifications.error(`Could not reveal loot: ${err.message}`);
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  }
}

Hooks.on('renderChatMessageHTML', bindRevealButtons);
