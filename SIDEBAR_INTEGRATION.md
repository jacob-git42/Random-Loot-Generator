# 📍 Sidebar Integration - Visual Guide

## Sidebar Panel Layout (Nach Update)

```
┌─────────────────────────────────────────┐
│ 🪙 Loot Generator                       │
├─────────────────────────────────────────┤
│                                         │
│ ✨ GOLD PAYOUT CONFIGURATION (NEU)      │
│ ─────────────────────────────────────── │
│ Configure which players receive gold    │
│ [👥 Configure Players] ← NEUER BUTTON   │
│                                         │
├─────────────────────────────────────────┤
│ PLAYER REVEALED LOOT                    │
│ Create a loot card that players         │
│ can reveal after the encounter.         │
│ [📦 Generate Loot]                      │
│                                         │
├─────────────────────────────────────────┤
│ DIRECT GM LOOT                          │
│ Generate selected rewards directly      │
│ without creating a player reveal card.  │
│                                         │
│ [✨ Spells]                             │
│ [🧪 Potions]                            │
│ [🎯 Targeted Loot]                      │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│ [⟲ Reset Loot Counters]                 │
│ Reset all Treasure Hoard counters.      │
│                                         │
│ [🗑️  Clean Up Data]                     │
│                                         │
│ ℹ️ Show warning info                    │
│   Removes module macros, roll...        │
│                                         │
└─────────────────────────────────────────┘
```

## Workflow: Konfiguration vom Button

```
Button Click: "Configure Players"
        ↓
#onConfigureGoldPayout()
        ↓
window.openPayoutConfigurationDialog()
        ↓
getPlayerCharactersMap()
  ├─ Alle nicht-GM Spieler laden
  └─ Ihre Characters sammeln
        ↓
showPayoutConfigurationDialog()
  ├─ Spieler mit Characters: Dropdown + Checkbox
  ├─ Spieler ohne Characters: Text "Kein Charakter" + Checkbox (deaktiviert)
  └─ Save / Cancel Buttons
        ↓
IF User klickt "Speichern":
  ├─ savePayoutConfig()
  └─ UI Notification: ✅ Konfiguration gespeichert!
ELSE:
  └─ Dialog schließt
```

## Dialog: Spielerliste (Neu)

```
┌────────────────────────────────────────────────┐
│ Gold-Auszahlung konfigurieren                 │
├────────────────────────────────────────────────┤
│                                                │
│ Wähle aus, welche Charaktere Gold              │
│ erhalten sollen:                               │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ Spieler 1                 ┌──────────┐  │  │
│ │ [Aragorn      ▼]          [☑] ← Normal │  │
│ ├──────────────────────────────────────────┤  │
│ │ Spieler 2                 ┌──────────┐  │  │
│ │ [Legolas      ▼]          [☑] ← Normal │  │
│ ├──────────────────────────────────────────┤  │
│ │ Spieler 3                 ┌──────────┐  │  │
│ │ Kein Charakter verfügbar  [☐] ← Grau   │  │
│ │ (orange Warnung)                   aus  │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Diese Einstellung wird gespeichert...          │
│                                                │
│    [💾 Speichern & Auszahlen] [✕ Abbrechen]  │
│                                                │
└────────────────────────────────────────────────┘
```

## State Diagram

```
                    ┌─────────────────┐
                    │  Sidebar Panel  │
                    │  (Loot Module)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ "Configure      │
                    │ Players"        │
                    │ Button Click    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Check if GM      │
                    └────────┬────────┘
                      YES   │   NO
                      ┌─────┴─────┐
                      │           │
                 ┌────▼────┐  ┌──▼──────────────┐
                 │ Open    │  │ Warn: "Nur der  │
                 │ Config  │  │ GM kann..."     │
                 │ Dialog  │  └─────────────────┘
                 └────┬────┘
                      │
         ┌────────────┴───────────┐
         │                        │
    ┌────▼─────────┐      ┌──────▼─────────┐
    │ User wählt   │      │ User klickt    │
    │ Charaktere   │      │ "Abbrechen"    │
    │ & speichert  │      │                │
    └────┬─────────┘      └─────────────────┘
         │
    ┌────▼──────────────────┐
    │ savePayoutConfig()    │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ UI Notification:               │
    │ "✅ Konfiguration gespeichert" │
    └───────────────────────────────┘
         │
    ┌────▼─────────────────────┐
    │ Dialog schließt          │
    │ Neue Konfiguration ready │
    └──────────────────────────┘
```

## Integration Points

### 1. Action Registration (module.js)
```
DEFAULT_OPTIONS = {
  actions: {
    runMacro: JacobsLootSidebarTab.#onRunMacro,
    configureGoldPayout: ← NEW ← JacobsLootSidebarTab.#onConfigureGoldPayout
  }
}
```

### 2. Event Handler (module.js)
```
#onConfigureGoldPayout(event, target) {
  if (window.openPayoutConfigurationDialog) {
    await window.openPayoutConfigurationDialog();
  }
}
```

### 3. Global Export (goldPayout.js)
```
Hooks.once('setup', () => {
  window.openPayoutConfigurationDialog = openPayoutConfigurationDialog;
});
```

### 4. Template Button (loot-panel.html)
```html
<button type="button" 
        class="loot-btn loot-primary" 
        data-action="configureGoldPayout">
  <i class="fa-solid fa-user-group"></i> Configure Players
</button>
```

## Data Flow

```
Button Click
    ↓
Event Handler: #onConfigureGoldPayout()
    ↓
window.openPayoutConfigurationDialog()
    ↓
getPlayerCharactersMap()
    ├─ game.users.filter(!isGM)
    └─ game.actors.filter(type='character')
    ↓
showPayoutConfigurationDialog()
    ├─ Build form with current + new players
    ├─ Show warning for players without chars
    └─ Return Promise
    ↓
IF "Speichern":
    ├─ Extract selected characters
    ├─ savePayoutConfig()
    ├─ Resolve config
    └─ Show success notification
ELSE IF "Abbrechen":
    ├─ Resolve null
    └─ Show cancel notification
```

