# Gold Payout System - Workflow Diagram

## Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ GM führt Individual Treasure oder Treasure Hoard Makro aus              │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Loot wird generiert (UNVERÄNDERT)                                       │
│  - Loot-Items werden gerollt                                            │
│  - Trinkets, Gems, Magic Items werden zusammengestellt                  │
│  - Gold wird berechnet: Math.ceil(goldRoll.total / 4)                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Loot-Chatkarte wird gepostet (UNVERÄNDERT)                              │
│  - Show Encounter Reward / Treasure Hoard Tier X                        │
│  - Show Items (Trinkets, Gems, Magic)                                   │
│  - Show "Gold per Player (4 players): X gp each"                        │
│  - LOOT-CLAIM Marker (falls includeClaim=true)                          │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
                 ┌───────────────────────┐
                 │ handleGoldPayout()    │
                 │ called with goldPerPl │
                 └───────────┬───────────┘
                             │
                             ▼
                    ┌────────────────────────────┐
                    │ game.user.isGM ?           │
                    └───┬────────────┬───────────┘
                    NO │            │ YES
                       │            ▼
                       │    load saved config
                       │            │
                       │            ▼
                       │    ┌──────────────────┐
                       │    │ config exists?   │
                       │    └──┬────────┬──────┘
                       │   YES │        │ NO
                       │       │        ▼
                       │       │   showPayoutConfigurationDialog()
                       │       │        │
                       │       │        ▼
                       │       │   ┌─────────────────────┐
                       │       │   │ Dialog              │
                       │       │   │ - List all players  │
                       │       │   │ - Show characters   │
                       │       │   │ - Allow selection   │
                       │       │   │ - Checkboxes        │
                       │       │   └────┬────────┬────────┘
                       │       │    SAVE│        │CANCEL
                       │       │        ▼        ▼
                       │       │   save cfg   return null
                       │       │        │        │
                       │       └────────┼────────┘
                       │               │
                       │               ▼
                       │       showPayoutConfirmationDialog()
                       │               │
                       │               ▼
                       │       ┌──────────────────────┐
                       │       │ Dialog               │
                       │       │ - Table with:        │
                       │       │   Player | Character │
                       │       │   Gold                │
                       │       │ - Total Gold         │
                       │       │ - CONFIRM / CANCEL   │
                       │       └────┬────────┬────────┘
                       │          CONFIRM    │CANCEL
                       │            │        │
                       │            ▼        ▼
                       │       process   return false
                       │       payout        │
                       │            │        │
                       └────────────┼────────┘
                                    │
                                    ▼
                          ┌──────────────────────┐
                          │ processGoldPayout()  │
                          │                      │
                          │ For each character:  │
                          │  - Get actor by ID   │
                          │  - Add goldPerPlayer │
                          │  - Update currency  │
                          │  - Track success/err │
                          └──────┬───────────────┘
                                 │
                                 ▼
                          ┌──────────────────────┐
                          │ createPayoutCardPage │
                          │                      │
                          │ Show results:        │
                          │  ✅ Erfolg           │
                          │  ⚠️ Teilweise        │
                          │  ❌ Fehler           │
                          └──────┬───────────────┘
                                 │
                                 ▼
                          ┌──────────────────────┐
                          │ Post Chat Card       │
                          │ (Ergebnis anzeigen)  │
                          └──────┬───────────────┘
                                 │
                                 ▼
                          ┌──────────────────────┐
                          │ Show Notification    │
                          │  ✅ / ⚠️ / ❌         │
                          └──────┬───────────────┘
                                 │
                                 ▼
                               DONE
```

## Configuration Dialog - Detail

```
┌────────────────────────────────────────────────────────────┐
│ Gold-Auszahlung konfigurieren                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Wähle aus, welche Charaktere Gold erhalten sollen:        │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ [Player 1]           [Dropdown: Aragorn     ] ☑       │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ [Player 2]           [Dropdown: Legolas     ] ☑       │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ [Player 2]           [Dropdown: Gimli       ] ☑       │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ [Player 3]           [Dropdown: Frodo       ] ☑       │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ Diese Einstellung wird gespeichert und für zukünftige     │
│ Auszahlungen verwendet.                                   │
│                                                            │
│                  [Speichern & Auszahlen]  [Abbrechen]    │
└────────────────────────────────────────────────────────────┘
```

## Confirmation Dialog - Detail

```
┌────────────────────────────────────────────────────────────┐
│ Gold-Auszahlung bestätigen                                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Bestätigung: Gold-Auszahlung                             │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Spieler      │ Charakter    │ Gold                  │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ Player 1     │ Aragorn      │ 🪙 120 gp              │  │
│ │ Player 2     │ Legolas      │ 🪙 120 gp              │  │
│ │ Player 3     │ Frodo        │ 🪙 120 gp              │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ Insgesamt:                  │ 🪙 360 gp              │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ Fortfahren?                                               │
│                                                            │
│              [Bestätigen & Auszahlen]  [Abbrechen]       │
└────────────────────────────────────────────────────────────┘
```

## Result Card - Detail

```
┌────────────────────────────────────────────────────────────┐
│ ✅ GRÜN (Alle erfolgreich) / ⚠️ ORANGE (Teilweise) / ❌ ROT │
│ Gold-Auszahlung                                           │
│ ✅ Auszahlungsergebnis                                     │
│ ────────────────────────────────────────────────────────  │
│ Pro Spieler: 🪙 120 gp                                     │
│ Erfolgreich: 3 | Fehler: 0                                │
│                                                            │
│ • ✅ Aragorn: +120 gp (gesamt: 1520 gp)                  │
│ • ✅ Legolas: +120 gp (gesamt: 890 gp)                   │
│ • ✅ Frodo: +120 gp (gesamt: 450 gp)                     │
│                                                            │
│ Wenn Fehler:                                              │
│ • ❌ Gandalf: Charakter nicht gefunden                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Data Structure

```javascript
// Settings: game.settings.get('jacobs-loot-generator', 'goldPayoutCharacters')

{
  "user-id-1": {
    characterId: "actor-uuid-1",
    characterName: "Aragorn"
  },
  "user-id-2": {
    characterId: "actor-uuid-2",
    characterName: "Legolas"
  },
  "user-id-3": {
    characterId: "actor-uuid-3",
    characterName: "Frodo"
  }
}
```

## Function Call Stack

```
Individual_Treasure.js / Treasure_Hoard.js
  │
  └─ runLootRolls() / rollTreasureHoard()
      │
      ├─ [Loot Generation] (UNVERÄNDERT)
      │
      ├─ [Chat Message Creation] (UNVERÄNDERT)
      │
      └─ handleGoldPayout(goldPerPlayer)
          │
          ├─ getPlayerCharactersMap()
          │  └─ Returns: { [userId]: [{id, name, owner}, ...] }
          │
          ├─ loadSavedPayoutConfig()
          │  └─ Returns: { [userId]: {characterId, characterName} }
          │
          ├─ IF no config:
          │  └─ showPayoutConfigurationDialog()
          │     ├─ [User selects characters]
          │     └─ savePayoutConfig(config)
          │
          ├─ showPayoutConfirmationDialog()
          │  └─ [User confirms]
          │
          ├─ processGoldPayout()
          │  ├─ For each character:
          │  │  ├─ game.actors.get(characterId)
          │  │  ├─ Get current currency.gp
          │  │  └─ actor.update({currency.gp: newAmount})
          │  │
          │  └─ Returns: {success, failed, details}
          │
          └─ createPayoutResultCard()
             └─ ChatMessage.create({content})
```

## State Machine

```
Initial State: "no config"
   │
   ▼
[Show Configuration Dialog]
   │
   ├─ User: Cancel → Exit (NO payout)
   │
   ├─ User: Save → Config Saved
   │   │
   │   ▼
   │ [Show Confirmation Dialog]
   │   │
   │   ├─ User: Cancel → Exit (NO payout)
   │   │
   │   ├─ User: Confirm → Process Payout
   │   │   │
   │   │   ▼
   │   │ [Update Characters]
   │   │   │
   │   │   ├─ Success: Show ✅ Card
   │   │   ├─ Partial: Show ⚠️ Card
   │   │   └─ Failed: Show ❌ Card
   │   │   │
   │   │   ▼
   │   │ Done (Config saved for next use)
   │
   ├─ NEXT RUN: Config exists
   │   │
   │   ▼
   │ [Show Confirmation Dialog] (skip config)
   │   │
   │   └─ User: Confirm → Process Payout
   │       └─ [Update Characters] → Done
```

