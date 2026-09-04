const trinketTableName = "🎒 Trinkets & Plunder";
const rollTableFolderName = "Loot";

function getTableResultText(result) {
	return result?.name?.trim() || result?.description?.trim() || "";
}

// Weighted gemstone table configuration.
const gemTableConfig = [
	{ name: "10 GP Gemstones",  weight: 50 },
	{ name: "50 GP Gemstones",  weight: 30 },
	{ name: "100 GP Gemstones", weight: 15 },
	{ name: "500 GP Gemstones", weight: 5  }
];

const lootTableFolder = game.folders.find(f => f.name === rollTableFolderName && f.type === "RollTable");
const lootTables = lootTableFolder?.contents || [];
const trinketTable = lootTables.find(t => t.name === trinketTableName);

// Find a table by exact or partial name.
function findTable(name) {
	if (!name) return null;
	const nameLower = name.toLowerCase().trim();
	return lootTables.find(t => t.name.toLowerCase().trim() === nameLower) ||
				 lootTables.find(t => t.name.toLowerCase().includes(nameLower));
}

let weightedGemTables = [];
let totalGemWeight = 0;

for (let config of gemTableConfig) {
	const table = findTable(config.name);
	if (table) {
		weightedGemTables.push({ table: table, weight: config.weight });
		totalGemWeight += config.weight;
	}
}

function getRandomWeightedGemTable() {
	if (weightedGemTables.length === 0) return null;
	let roll = Math.random() * totalGemWeight;
	for (let gemConfig of weightedGemTables) {
		roll -= gemConfig.weight;
		if (roll <= 0) return gemConfig.table;
	}
	return weightedGemTables[0].table;
}

// Determine the DMG magic item table (A-I) from the monster CR.
function getDMGMagicItemTableForCR(rangeId) {
	const rand = Math.random();
	if (rangeId === "range-0-4") {
		if (rand < 0.70) return "Magic Item Table A";
		if (rand < 0.95) return "Magic Item Table B";
		return "Magic Item Table F";
	} else if (rangeId === "range-5-10") {
		if (rand < 0.40) return "Magic Item Table A";
		if (rand < 0.75) return "Magic Item Table B";
		if (rand < 0.90) return "Magic Item Table C";
		return "Magic Item Table F";
	} else if (rangeId === "range-11-16") {
		if (rand < 0.35) return "Magic Item Table A";
		if (rand < 0.60) return "Magic Item Table B";
		if (rand < 0.80) return "Magic Item Table C";
		if (rand < 0.95) return "Magic Item Table D";
		return "Magic Item Table F";
	} else { // CR 17+
		if (rand < 0.30) return "Magic Item Table C";
		if (rand < 0.60) return "Magic Item Table D";
		if (rand < 0.85) return "Magic Item Table E";
		return "Magic Item Table G";
	}
}

const CHANCE_TRINKET = 0.20;
const CHANCE_GEM     = 0.05;
const CHANCE_MAGIC   = 0.03;

const rangeDefinitions = [
	{ id: "range-0-4",   label: "CR 1/8 to 4",   formula: "4d6" },
	{ id: "range-5-10",  label: "CR 5 to 10",    formula: "4d6 * 10" },
	{ id: "range-11-16", label: "CR 11 to 16",   formula: "4d6 * 100" },
	{ id: "range-17",    label: "CR 17 or higher", formula: "4d6 * 1000" }
];

const individualTreasureSettingsNamespace = "lootmakros";
const individualTreasureSettingsKey = "individualTreasurePreset";

function ensureIndividualTreasureSettingRegistered() {
	const settingId = `${individualTreasureSettingsNamespace}.${individualTreasureSettingsKey}`;
	if (!game.settings.settings.has(settingId)) {
		game.settings.register(individualTreasureSettingsNamespace, individualTreasureSettingsKey, {
			name: "Individual Treasure Preset",
			scope: "world",
			config: false,
			type: Object,
			default: {}
		});
	}
}

// Standard roll with replacement for gems and magic items.
async function rollAndGetLink(table, returnAsLink = true) {
	if (!table) return null;
	const rollResult = await table.roll();
	const res = rollResult.results[0];
	if (!res) return null;

	if (!returnAsLink) {
		return { text: getTableResultText(res), link: null };
	}

	const resultText = getTableResultText(res);
	let link = null;
	if (res.documentCollection && res.documentId) {
		link = `@UUID[${res.documentCollection}.${res.documentId}]{${resultText}}`;
	} else if (res.uuid) {
		link = `@UUID[${res.uuid}]{${resultText}}`;
	}
  
	return { text: resultText, link: link || resultText };
}

// Draw without replacement for trinkets and plunder.
async function drawAndLockItem(table, returnAsLink = false) {
	if (!table) return null;
  
	const availableResults = table.results.filter(r => !r.drawn);
	if (availableResults.length === 0) {
		return { text: `*(Table "${table.name}" is empty - please reset it!)*`, link: null };
	}

	let result = null;
	let attempts = 0;
  
	while (!result && attempts < 50) {
		attempts++;
		const rollResult = await table.roll();
		const candidate = rollResult.results[0];
		if (candidate && !candidate.drawn) {
			result = candidate;
		}
	}

	if (!result) result = availableResults[0];
	const resultText = getTableResultText(result);

	// Element als gezogen/gesperrt markieren
	await table.updateEmbeddedDocuments("TableResult", [{ _id: result.id, drawn: true }]);
  
	let link = null;
	if (returnAsLink) {
		if (result.documentCollection && result.documentId) {
			link = `@UUID[${result.documentCollection}.${result.documentId}]{${resultText}}`;
		} else if (result.uuid) {
			link = `@UUID[${result.uuid}]{${resultText}}`;
		}
	}
  
	return { text: resultText, link: link };
}

async function runLootRolls(countResolver, includeClaim = false) {
	let totalFormulaParts = [];
	let summaryText = "";
	let totalMonsterCount = 0;
	let monstersByRange = [];

	for (let r of rangeDefinitions) {
		const count = countResolver(r.id);
		if (count > 0) {
			totalMonsterCount += count;
			for (let i = 0; i < count; i++) {
				totalFormulaParts.push(`(${r.formula})`);
				monstersByRange.push(r.id);
			}
			summaryText += `<li><strong>${count}x</strong> Monsters in tier <strong>${r.label}</strong></li>`;
		}
	}

	if (totalMonsterCount === 0) {
		ui.notifications.warn("No monster counts entered!");
		return;
	}

	let goldRoll = await new Roll(totalFormulaParts.join(" + ")).evaluate();
  
	let foundTrinkets = [];
	let foundGems = [];
	let foundMagic = [];

	for (let m = 0; m < totalMonsterCount; m++) {
		const monsterRangeId = monstersByRange[m];

		// 1. Trinkets without replacement.
		if (Math.random() < CHANCE_TRINKET && trinketTable) {
			const itemData = await drawAndLockItem(trinketTable, false);
			if (itemData) foundTrinkets.push(`<li>${itemData.text}</li>`);
		}

		// 2. Gems with replacement.
		if (Math.random() < CHANCE_GEM && weightedGemTables.length > 0) {
			const randomGemTable = getRandomWeightedGemTable();
			const gemData = await rollAndGetLink(randomGemTable, true);
			if (gemData) {
				const displayOutput = gemData.link ? gemData.link : gemData.text;
				foundGems.push(`<li>${displayOutput} <span style="font-size:0.75em; color:#777;">(${randomGemTable.name})</span></li>`);
			}
		}

		// 3. Magic items with replacement from DMG tables A-I.
		if (Math.random() < CHANCE_MAGIC) {
			const tableName = getDMGMagicItemTableForCR(monsterRangeId);
			const magicTable = findTable(tableName);

			if (magicTable) {
				const itemData = await rollAndGetLink(magicTable, true);
				if (itemData) {
					const displayOutput = itemData.link ? itemData.link : itemData.text;
					foundMagic.push(`<li><strong>${displayOutput}</strong> <span style="font-size:0.8em; color:#777;">(${magicTable.name})</span></li>`);
				}
			}
		}
	}

	let lootSections = "";
  
	if (foundTrinkets.length > 0) {
		lootSections += `
			<p style="margin: 10px 0 3px 0; font-weight: bold; color: #8a6d3b;"><i class="fas fa-backpack"></i> Pocket Contents / Plunder:</p>
			<ul style="font-size: 0.85em; margin: 0; padding-left: 20px;">${foundTrinkets.join("")}</ul>
		`;
	}

	if (foundGems.length > 0) {
		lootSections += `
			<p style="margin: 10px 0 3px 0; font-weight: bold; color: #31708f;"><i class="fas fa-gem"></i> Gemstones:</p>
			<ul style="font-size: 0.85em; margin: 0; padding-left: 20px;">${foundGems.join("")}</ul>
		`;
	}

	if (foundMagic.length > 0) {
		lootSections += `
			<p style="margin: 10px 0 3px 0; font-weight: bold; color: #3c763d;"><i class="fas fa-wand-magic-sparkles"></i> Rare Find! (Magic):</p>
			<ul style="font-size: 0.85em; margin: 0; padding-left: 20px;">${foundMagic.join("")}</ul>
		`;
	}

	const chatContent = `
		<div style="border: 1px solid #7b6330; padding: 12px; border-radius: 8px; background: linear-gradient(160deg, rgba(66,50,18,0.16), rgba(20,18,12,0.08)); box-shadow: inset 0 0 0 1px rgba(235,197,120,0.22), 0 2px 8px rgba(0,0,0,0.16);">
			<p style="margin: 0 0 4px 0; font-size: 0.76em; letter-spacing: 0.12em; text-transform: uppercase; color: #8b6d2e; font-weight: 700;">Encounter Reward</p>
			<h3 style="margin-top: 0; border-bottom: 1px solid rgba(123,99,48,0.45); padding-bottom: 6px; font-size: 1.1em; color: #2f2a1d;">
				<i class="fas fa-coins" style="color: #dfa511;"></i> Individual Loot
			</h3>
			<p style="font-size: 0.9em; margin: 0;">Defeated creatures by tier:</p>
			<ul style="font-size: 0.85em; margin-top: 5px; padding-left: 20px;">${summaryText}</ul>
			<hr>
			${lootSections}
			<hr>
			<p style="margin-top: 10px; font-size: 1.1em; font-weight: bold;">
				Gold Found: <span style="color: #dfa511;"><i class="fas fa-coins"></i> ${goldRoll.total} gp</span>
			</p>
		</div>
	`;

	const enrichedContent = await TextEditor.enrichHTML(chatContent, {async: true});

	await ChatMessage.create({
		content: enrichedContent,
		speaker: ChatMessage.getSpeaker({ title: "Treasure Chest" })
	});

	if (includeClaim) {
		await ChatMessage.create({
			content: `<div style="text-align: center; color: #000000;">
								<span style="display:none;">LOOT-CLAIM:INDIVIDUAL</span>
								Loot Claimed: <span style="color: #8b0000; font-weight: bold;">${game.user.name}</span> 💰
							</div>`,
			speaker: ChatMessage.getSpeaker({ alias: "Loot System" })
		});
	}
}

async function runWithDialog() {
	let formRows = rangeDefinitions.map(r => `
		<div class="form-group" style="display: flex; align-items: center; margin-bottom: 8px;">
			<label style="flex: 1.5; font-weight: bold;">${r.label}:</label>
			<span style="flex: 1.5; font-size: 0.85em; color: #666;">(${r.formula} gp per monster)</span>
			<input type="number" name="${r.id}" value="0" min="0" style="width: 60px; text-align: center;">
		</div>
	`).join("");

	new Dialog({
		title: "Individual Treasure & Loot",
		content: `
			<form style="padding: 5px;">
				<p style="margin-bottom: 12px; font-style: italic;">Enter the total number of defeated monsters per tier:</p>
				${formRows}
			</form>
		`,
		buttons: {
			roll: {
				icon: '<i class="fas fa-coins"></i>',
				label: "Roll Loot",
				callback: async (html) => {
					await runLootRolls(rangeId => parseInt(html.find(`[name="${rangeId}"]`).val()) || 0);
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

async function runWithPreset() {
	ensureIndividualTreasureSettingRegistered();
	const preset = game.settings.get(individualTreasureSettingsNamespace, individualTreasureSettingsKey);
	if (!preset?.counts) return false;

	if (game.user.isGM) {
		await game.settings.set(individualTreasureSettingsNamespace, individualTreasureSettingsKey, {});
	}
	await runLootRolls(rangeId => parseInt(preset.counts[rangeId]) || 0, true);
	return true;
}

const usedPreset = await runWithPreset();
if (!usedPreset) {
	await runWithDialog();
}
