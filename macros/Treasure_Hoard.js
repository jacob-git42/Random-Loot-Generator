const treasureHoardSettingsNamespace = "lootmakros";
const treasureHoardSettingsKey = "treasureHoardPreset";
const treasureHoardCountersKey = "treasureHoardCounters";
const rollTableFolderName = "Loot";

const potionTableName = "🧪 Potions and Poisons"; 
const BONUS_POTION_CHANCE = 0.40; // Von 0.50 auf 0.40 verringert

// DMG Soll-Empfehlungen für die Anzeige im UI
const DMG_RECOMMENDED = { 1: 7, 2: 18, 3: 12, 4: 8 };

// Konfiguration der Zauberrollen-Chancen pro Tier (Leicht verringert)
const SCROLL_CHANCES = {
  1: { extraChance2: 0.20, extraChance3: 0.05 },
  2: { extraChance2: 0.30, extraChance3: 0.10 },
  3: { extraChance2: 0.40, extraChance3: 0.12 },
  4: { extraChance2: 0.50, extraChance3: 0.15 }
};

// Pyramiden-Gewichtung der Zauberstufen pro Tier (Summe = 100)
const SPELL_WEIGHTS = {
  1: [ { level: 1, weight: 60 }, { level: 2, weight: 30 }, { level: 3, weight: 10 } ],
  2: [ { level: 2, weight: 50 }, { level: 3, weight: 30 }, { level: 4, weight: 15 }, { level: 5, weight: 5 } ],
  3: [ { level: 3, weight: 40 }, { level: 4, weight: 30 }, { level: 5, weight: 18 }, { level: 6, weight: 8 }, { level: 7, weight: 4 } ],
  4: [ { level: 4, weight: 35 }, { level: 5, weight: 25 }, { level: 6, weight: 18 }, { level: 7, weight: 12 }, { level: 8, weight: 7 }, { level: 9, weight: 3 } ]
};

// Hilfsfunktion zum Suchen von Tabellen
function findTable(name) {
  if (!name) return null;
  const nameLower = name.toLowerCase().trim();
  const folder = game.folders.find(f => f.name === rollTableFolderName && f.type === "RollTable");
  const tables = folder?.contents || [];
  return tables.find(t => t.name.toLowerCase().trim() === nameLower) ||
         tables.find(t => t.name.toLowerCase().includes(nameLower) || nameLower.includes(t.name.toLowerCase()));
}

// Hilfsfunktion zum rekursiven Auswürfeln von Untertabellen
async function resolveTableRoll(table, depth = 0) {
  if (!table || depth > 5) return "Unbekannter Gegenstand";

  const rollResult = await table.roll();
  const res = rollResult.results[0];
  if (!res) return "Leeres Ergebnis";

  if (res.type === "document" && res.documentCollection === "RollTable") {
    const folder = game.folders.find(f => f.name === rollTableFolderName && f.type === "RollTable");
    const nextTable = folder?.contents.find(table => table.id === res.documentId);
    if (nextTable) return await resolveTableRoll(nextTable, depth + 1);
  }

  if (res.type === "pack" || (res.type === "document" && res.documentCollection === "Item")) {
    const uuid = res.uuid || (res.documentCollection ? `Compendium.${res.documentCollection}.${res.documentId}` : null);
    if (uuid) {
      return `<a class="content-link" data-link data-type="Item" data-uuid="${uuid}">${res.text}</a>`;
    }
  }

  const textClean = res.text ? res.text.toLowerCase().trim() : "";
  const subTableMatch = findTable(textClean);
  if (subTableMatch && subTableMatch.id !== table.id) {
    return await resolveTableRoll(subTableMatch, depth + 1);
  }

  return res.text || "Unbekanntes Ergebnis";
}

// Gemstone-Tabelle basierend auf Tier (Maximal 500 GP Gemstones)
function getGemTableNameForTier(tier) {
  const rand = Math.random();
  if (tier === 1) return rand < 0.80 ? "10 GP Gemstones" : "50 GP Gemstones";
  if (tier === 2) return rand < 0.70 ? "50 GP Gemstones" : "100 GP Gemstones";
  if (tier === 3) return rand < 0.65 ? "100 GP Gemstones" : "500 GP Gemstones";
  return "500 GP Gemstones";
}

// Art Objects-Tabelle basierend auf Tier
function getArtTableNameForTier(tier) {
  const rand = Math.random();
  if (tier === 1) return rand < 0.80 ? "25 GP Art Objects" : "250 GP Art Objects";
  if (tier === 2) return rand < 0.75 ? "250 GP Art Objects" : "750 GP Art Objects";
  if (tier === 3) return rand < 0.70 ? "750 GP Art Objects" : "2,500 GP Art Objects";
  return rand < 0.60 ? "2,500 GP Art Objects" : "7,500 GP Art Objects";
}

// Bestimmt die DMG Magic Item Table (A-I) basierend auf dem Tier
function getDMGMagicItemTableForTier(tier) {
  const rand = Math.random();
  if (tier === 1) {
    if (rand < 0.45) return "Magic Item Table A";
    if (rand < 0.75) return "Magic Item Table B";
    if (rand < 0.90) return "Magic Item Table C";
    return "Magic Item Table F";
  } else if (tier === 2) {
    if (rand < 0.25) return "Magic Item Table B";
    if (rand < 0.50) return "Magic Item Table C";
    if (rand < 0.80) return "Magic Item Table F";
    return "Magic Item Table G";
  } else if (tier === 3) {
    if (rand < 0.15) return "Magic Item Table C";
    if (rand < 0.35) return "Magic Item Table D";
    if (rand < 0.50) return "Magic Item Table F";
    if (rand < 0.80) return "Magic Item Table G";
    return "Magic Item Table H";
  } else {
    if (rand < 0.15) return "Magic Item Table D";
    if (rand < 0.25) return "Magic Item Table E";
    if (rand < 0.45) return "Magic Item Table G";
    if (rand < 0.80) return "Magic Item Table H";
    return "Magic Item Table I";
  }
}

function getRandomSpellLevel(tier) {
  const weights = SPELL_WEIGHTS[tier] || SPELL_WEIGHTS[1];
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const entry of weights) {
    cumulative += entry.weight;
    if (rand < cumulative) return entry.level;
  }
  return weights[0].level;
}

async function rollSpellScroll(tier) {
  const targetLevel = getRandomSpellLevel(tier);
  const scrollTableName = `Spells - Level ${targetLevel}`;
  const scrollTable = findTable(scrollTableName);

  if (scrollTable) {
    const resText = await resolveTableRoll(scrollTable);
    return `<b>📜 Scroll (Level ${targetLevel}):</b> ${resText}`;
  } else {
    return `<b>📜 Scroll (Level ${targetLevel}):</b> (Tabelle "${scrollTableName}" fehlt)`;
  }
}

function ensureSettingsRegistered() {
  const presetId = `${treasureHoardSettingsNamespace}.${treasureHoardSettingsKey}`;
  if (!game.settings.settings.has(presetId)) {
    game.settings.register(treasureHoardSettingsNamespace, treasureHoardSettingsKey, {
      name: "Treasure Hoard Preset", scope: "world", config: false, type: Object, default: {}
    });
  }

  const counterId = `${treasureHoardSettingsNamespace}.${treasureHoardCountersKey}`;
  if (!game.settings.settings.has(counterId)) {
    game.settings.register(treasureHoardSettingsNamespace, treasureHoardCountersKey, {
      name: "Treasure Hoard Counters", scope: "world", config: false, type: Object, default: { 1: 0, 2: 0, 3: 0, 4: 0 }
    });
  }
}

async function updateCounter(tier, countAdd) {
  ensureSettingsRegistered();
  const counters = game.settings.get(treasureHoardSettingsNamespace, treasureHoardCountersKey) || { 1: 0, 2: 0, 3: 0, 4: 0 };
  counters[tier] = (counters[tier] || 0) + countAdd;
  await game.settings.set(treasureHoardSettingsNamespace, treasureHoardCountersKey, counters);
  return counters;
}

async function resetCounter(tier = null) {
  ensureSettingsRegistered();
  let counters = game.settings.get(treasureHoardSettingsNamespace, treasureHoardCountersKey) || { 1: 0, 2: 0, 3: 0, 4: 0 };
  if (tier && counters[tier] !== undefined) {
    counters[tier] = 0;
    ui.notifications.info(`Treasure Counter für Tier ${tier} zurückgesetzt.`);
  } else {
    counters = { 1: 0, 2: 0, 3: 0, 4: 0 };
    ui.notifications.info(`Alle Treasure Counter zurückgesetzt.`);
  }
  await game.settings.set(treasureHoardSettingsNamespace, treasureHoardCountersKey, counters);
}

async function rollTreasureHoard(hoardCount, selectedTier) {
  const safeHoards = Math.max(1, parseInt(hoardCount) || 1);
  const tier = Math.min(4, Math.max(1, parseInt(selectedTier) || 1));

  // Zähler inkrementieren
  const allCounters = await updateCounter(tier, safeHoards);
  const totalRolledForTier = allCounters[tier];

  const potionTable = findTable(potionTableName);

  let totalGoldValue = 0;
  let magicItemResults = [];
  let gemResults = [];
  let artResults = [];
  let bonusItems = [];

  for (let h = 0; h < safeHoards; h++) {
    // 1. Gold (Erhöht, um verringerte Kunst/Gems/Consumables auszugleichen)
    let gpFormula = "5d6 * 100";
    let spFormula = "2d6 * 10";
    if (tier === 1) { gpFormula = "8d6 * 10"; spFormula = "2d6 * 100"; }
    if (tier === 3) { gpFormula = "6d6 * 1000"; spFormula = "1d6 * 100"; }
    if (tier === 4) { gpFormula = "15d6 * 1000"; spFormula = "2d6 * 1000"; }

    const gpRoll = await new Roll(gpFormula).evaluate();
    const spRoll = await new Roll(spFormula).evaluate();
    totalGoldValue += gpRoll.total + (spRoll.total / 10);

    // 2. Gemstones (1d2 statt 1d3)
    const gemRoll = await new Roll("1d2").evaluate();
    for (let g = 0; g < gemRoll.total; g++) {
      const gemName = getGemTableNameForTier(tier);
      const gemTable = findTable(gemName);
      if (gemTable) gemResults.push(`<li>${await resolveTableRoll(gemTable)}</li>`);
      else gemResults.push(`<li>(Tabelle "${gemName}" fehlt)</li>`);
    }

    // 3. Art Objects (1d2 statt 1d3)
    const artRoll = await new Roll("1d2").evaluate();
    for (let a = 0; a < artRoll.total; a++) {
      const artName = getArtTableNameForTier(tier);
      const artTable = findTable(artName);
      if (artTable) artResults.push(`<li>${await resolveTableRoll(artTable)}</li>`);
      else artResults.push(`<li>(Tabelle "${artName}" fehlt)</li>`);
    }

    // 4. Magic Items (DMG Table A-I)
    const itemRollCount = (await new Roll("1d4").evaluate()).total;
    for (let i = 0; i < itemRollCount; i++) {
      const targetTableName = getDMGMagicItemTableForTier(tier);
      const magicTable = findTable(targetTableName);

      if (magicTable) {
        const resText = await resolveTableRoll(magicTable);
        magicItemResults.push(`<li>${resText}</li>`);
      } else {
        magicItemResults.push(`<li><b>[${targetTableName}]:</b> (Tabelle nicht gefunden)</li>`);
      }
    }

    // 5. Scrolls (Niedrigere Zusatzchancen)
    const config = SCROLL_CHANCES[tier];
    bonusItems.push(`<li>${await rollSpellScroll(tier)}</li>`);
    if (Math.random() < config.extraChance2) {
      bonusItems.push(`<li>${await rollSpellScroll(tier)}</li>`);
      if (Math.random() < config.extraChance3) {
        bonusItems.push(`<li>${await rollSpellScroll(tier)}</li>`);
      }
    }

    // 6. Potions
    if (Math.random() < BONUS_POTION_CHANCE && potionTable) {
      bonusItems.push(`<li><b>🧪 Potion:</b> ${await resolveTableRoll(potionTable)}</li>`);
    }
  }

  let bonusSection = bonusItems.length > 0 ? `
    <hr style="border: 0; border-top: 1px solid rgba(123,99,48,0.3); margin: 8px 0;">
    <p style="margin: 0 0 5px 0; font-weight: bold; color: #d97706;"><i class="fas fa-magic"></i> Consumables & Scrolls:</p>
    <ul style="margin: 0; padding-left: 20px; line-height: 1.6em;">${bonusItems.join("")}</ul>
  ` : "";

  // 1. Öffentliche Karte für Spieler (ohne Counter-Anzeige)
  const publicChatContent = `
    <div style="border: 1px solid #7b6330; padding: 12px; border-radius: 8px; background: linear-gradient(160deg, rgba(66,50,18,0.16), rgba(20,18,12,0.08)); box-shadow: inset 0 0 0 1px rgba(235,197,120,0.22), 0 2px 8px rgba(0,0,0,0.16);">
      <p style="margin: 0 0 4px 0; font-size: 0.76em; letter-spacing: 0.12em; text-transform: uppercase; color: #8b6d2e; font-weight: 700;">Treasure Hoard Tier ${tier} (${safeHoards}x)</p>
      <h3 style="margin-top: 0; border-bottom: 1px solid rgba(123,99,48,0.45); padding-bottom: 6px; font-size: 1.1em; color: #2f2a1d;">💎 Treasure Found!</h3>
      
      <p style="margin: 5px 0; font-weight: bold; color: #b45f06;"><i class="fas fa-coins"></i> Total Gold:</p>
      <p style="margin: 0 0 8px 15px; font-size: 1.1em; font-weight: bold; color: #111111;">${totalGoldValue.toLocaleString()} GP</p>

      <hr style="border: 0; border-top: 1px solid rgba(123,99,48,0.3); margin: 8px 0;">
      <p style="margin: 5px 0; font-weight: bold; color: #2e7d32;"><i class="fas fa-gem"></i> Gemstones:</p>
      <ul style="margin: 0 0 8px 0; padding-left: 20px; line-height: 1.5em;">${gemResults.join("")}</ul>

      <hr style="border: 0; border-top: 1px solid rgba(123,99,48,0.3); margin: 8px 0;">
      <p style="margin: 5px 0; font-weight: bold; color: #a84300;"><i class="fas fa-palette"></i> Art Objects:</p>
      <ul style="margin: 0 0 8px 0; padding-left: 20px; line-height: 1.5em;">${artResults.join("")}</ul>

      <hr style="border: 0; border-top: 1px solid rgba(123,99,48,0.3); margin: 8px 0;">
      <p style="margin: 5px 0; font-weight: bold; color: #6a1b9a;"><i class="fas fa-hat-wizard"></i> Magic Items:</p>
      <ul style="margin: 0; padding-left: 20px; line-height: 1.6em;">${magicItemResults.join("")}</ul>
      ${bonusSection}
    </div>
  `;

  ChatMessage.create({
    content: await TextEditor.enrichHTML(publicChatContent, {async: true}),
    speaker: ChatMessage.getSpeaker({ title: "Treasure Chest" })
  });
  
  ChatMessage.create({
    content: `<div style="text-align: center; color: #000000;">
                <span style="display:none;">LOOT-CLAIM:HOARD</span>
                Loot Claimed: <span style="color: #8b0000; font-weight: bold;">${game.user.name}</span> 💰
              </div>`,
    speaker: ChatMessage.getSpeaker({ alias: "Loot System" })
  });

  // 2. Private Karte NUR für den GM mit dem Counter-Stand
  const gmChatContent = `
    <div style="border: 1px solid #4a5568; padding: 10px; border-radius: 6px; background: #1a202c; color: #e2e8f0; font-size: 0.85em;">
      <div style="font-weight: bold; color: #63b3ed; margin-bottom: 4px; border-bottom: 1px solid #4a5568; padding-bottom: 4px;">
        🔒 GM Loot Tracker (Treasure Hoards)
      </div>
      <p style="margin: 4px 0;"><b>Aktueller Roll:</b> Tier ${tier} (+${safeHoards} Hoard${safeHoards > 1 ? 's' : ''})</p>
      <p style="margin: 4px 0; color: #f6ad55; font-weight: bold;">
        Tier ${tier} Zählerstand: ${totalRolledForTier} / ${DMG_RECOMMENDED[tier]} (DMG Empfehlung)
      </p>
      <hr style="border: 0; border-top: 1px dashed #4a5568; margin: 6px 0;">
      <p style="margin: 2px 0; font-size: 0.8em; color: #a0aec0;">Übersicht alle Tiers:</p>
      <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #cbd5e0;">
        <span>T1: ${allCounters[1] || 0}/${DMG_RECOMMENDED[1]}</span>
        <span>T2: ${allCounters[2] || 0}/${DMG_RECOMMENDED[2]}</span>
        <span>T3: ${allCounters[3] || 0}/${DMG_RECOMMENDED[3]}</span>
        <span>T4: ${allCounters[4] || 0}/${DMG_RECOMMENDED[4]}</span>
      </div>
    </div>
  `;

  const gmUsers = game.users.filter(u => u.isGM).map(u => u.id);
  ChatMessage.create({
    content: gmChatContent,
    whisper: gmUsers,
    speaker: ChatMessage.getSpeaker({ alias: "GM Tracker" })
  });
}

function showLootDialog() {
  ensureSettingsRegistered();
  const counters = game.settings.get(treasureHoardSettingsNamespace, treasureHoardCountersKey) || { 1: 0, 2: 0, 3: 0, 4: 0 };

  const dialogContent = `
    <div style="padding: 8px 4px;">
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label style="font-weight: bold; font-size: 0.95em;">Tier Level:</label>
          <span id="tierLabel" style="font-weight: bold; color: #b45f06; font-size: 1.05em;">Tier 2</span>
        </div>
        <input type="range" id="tierRange" min="1" max="4" value="2" step="1" style="width: 100%; cursor: pointer;">
        <div style="display: flex; justify-content: space-between; font-size: 0.72em; color: #666; margin-top: 4px;">
          <span>T1 (L1-4)</span>
          <span>T2 (L5-10)</span>
          <span>T3 (L11-16)</span>
          <span>T4 (L17+)</span>
        </div>
      </div>

      <div style="background: rgba(0,0,0,0.05); padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 0.85em; text-align: center;">
        <b>DMG Hoard Stats (Gezogen / Soll):</b><br>
        <span id="counterDisplay" style="color: #111; font-weight: bold;">${counters[2] || 0} / ${DMG_RECOMMENDED[2]} Hoards</span>
      </div>

      <div style="margin-bottom: 8px;">
        <label style="font-weight: bold; font-size: 0.95em; display: block; margin-bottom: 6px;">Anzahl Hoards:</label>
        <input type="number" id="hoardCount" value="1" min="1" max="10" style="width: 100%; text-align: center;">
      </div>
    </div>
  `;

  new Dialog({
    title: "Treasure Hoard Generator",
    content: dialogContent,
    buttons: {
      roll: {
        icon: '<i class="fas fa-dice-d20"></i>',
        label: "Loot Generieren",
        callback: async (html) => {
          await rollTreasureHoard(html.find("#hoardCount").val(), html.find("#tierRange").val());
        }
      },
      reset: {
        icon: '<i class="fas fa-undo"></i>',
        label: "Reset Counter",
        callback: async (html) => {
          const selectedTier = html.find("#tierRange").val();
          new Dialog({
            title: "Counter Reset Bestätigen",
            content: `<p>Möchtest du den Zähler für <b>Tier ${selectedTier}</b> oder <b>ALLE Tiers</b> zurücksetzen?</p>`,
            buttons: {
              current: {
                label: `Nur Tier ${selectedTier}`,
                callback: async () => await resetCounter(selectedTier)
              },
              all: {
                label: "Alle Tiers (1-4)",
                callback: async () => await resetCounter(null)
              },
              cancel: { label: "Abbrechen" }
            }
          }).render(true);
        }
      },
      cancel: { icon: '<i class="fas fa-times"></i>', label: "Schließen" }
    },
    default: "roll",
    render: (html) => {
      html.find("#tierRange").on("input change", function() {
        const val = $(this).val();
        html.find("#tierLabel").text("Tier " + val);
        html.find("#counterDisplay").text(`${counters[val] || 0} / ${DMG_RECOMMENDED[val]} Hoards`);
      });
    }
  }).render(true);
}

async function runWithPreset() {
  ensureSettingsRegistered();
  const preset = game.settings.get(treasureHoardSettingsNamespace, treasureHoardSettingsKey);
  if (!preset?.count) return false;