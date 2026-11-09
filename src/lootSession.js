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

async function handleClaimLoot({ sessionId, messageId, tokenId, userId } = {}) {
  if (!game.user.isGM) return;

  const session = lootSessions.get(sessionId);
  if (!session) {
    ui.notifications.warn(`Loot session ${sessionId} is invalid or already claimed.`);
    return;
  }
  // Single use: delete before doing anything async so a second signal is rejected
  lootSessions.delete(sessionId);

  const user = game.users.get(userId);
  const token = tokenId ? canvas.tokens?.get(tokenId) : null;
  const claimerName = token?.name ?? user?.character?.name ?? user?.name ?? 'Unknown';

  const message = game.messages.get(messageId);
  if (message) {
    const lockedContent = message.content.replace(
      /<button[^>]*reveal-loot-btn[^>]*>[\s\S]*?<\/button>/,
      '<span class="loot-card__button--locked">🔒 Loot Claimed 🔒</span>'
    );
    await message.update({ content: lockedContent });
  }

  // Loot macros read their preset from a world setting, so runs are serialized
  executionQueue = executionQueue
    .then(() => runLootMacro(session, { claimerName, tokenId, userId }))
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
  await macro.execute(scope);
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

      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending...';

      const controlledToken = canvas.tokens?.controlled[0] ?? game.user.character?.getActiveTokens()[0];

      try {
        await lootSocket.executeAsGM('claimLoot', {
          sessionId: button.dataset.sessionId,
          messageId: message.id,
          tokenId: controlledToken?.id ?? null,
          userId: game.user.id
        });
      } catch (err) {
        console.error(`${MODULE_ID} | Failed to send loot claim to GM:`, err);
        ui.notifications.error('Could not reach a GM to reveal the loot.');
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  }
}

Hooks.on('renderChatMessageHTML', bindRevealButtons);
