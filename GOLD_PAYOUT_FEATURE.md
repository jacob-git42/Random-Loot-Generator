# Gold Payout System

## Übersicht

Das Gold Payout System ist eine automatische Funktion für die **Individual Treasure** und **Treasure Hoard** Makros. Es ermöglicht dem GM, Gold automatisch an alle konfigurierten Spieler-Charaktere auszuzahlen.

## Features

✅ **Automatische Auszahlung**: Nach dem Loot-Roll wird Gold automatisch zu den Charakteren hinzugefügt  
✅ **Konfigurierbar**: GM kann auswählen, welche Charaktere Gold erhalten  
✅ **Persistent**: Einstellungen werden gespeichert und für zukünftige Auszahlungen verwendet  
✅ **Flexible Character-Auswahl**: Falls ein Spieler mehrere Charaktere hat, kann zwischen ihnen gewechselt werden  
✅ **GM-Bestätigung**: Vor der Auszahlung wird eine Bestätigung gezeigt  
✅ **Detailliertes Feedback**: Chatkarte zeigt alle ausgezahlten Beträge und Status

## Workflow

### Erste Nutzung
1. GM führt **Individual Treasure** oder **Treasure Hoard** Makro aus
2. Loot wird wie gewohnt generiert und im Chat angezeigt
3. **Neuer Schritt**: Ein Dialog zur Spieler-Auswahl öffnet sich:
   - Alle Player-Owned Characters der Welt werden angezeigt
   - Der Standard-Charakter jedes Spielers ist vorausgewählt
   - GM kann Charaktere anpassen oder Spieler abwählen (Checkbox)
4. GM klickt "Speichern & Auszahlen"
5. **Bestätigungsdialog** zeigt die Auszahlung im Detail
6. GM bestätigt → Gold wird ausgezahlt
7. **Ergebnis-Chatkarte** wird gepostet (✅ Erfolg / ⚠️ Teilweise / ❌ Fehler)

### Nachfolgende Nutzung
1. GM führt Makro aus → Loot wird generiert
2. **Automatisch** werden die gespeicherten Charaktere verwendet (kein Dialog)
3. **Bestätigungsdialog** mit den konfigurierten Charakteren
4. GM bestätigt → Gold wird ausgezahlt
5. Ergebnis-Chatkarte wird gepostet

### Character-Konfiguration ändern
GM kann die Spieler-Auswahl jederzeit ändern durch:
- Im Bestätigungsdialog einen anderen Charakter im Dropdown auswählen (Zukunft)
- Oder komplett neue Konfiguration laden (Settings zurücksetzen - manuell)

## Auswirkungen auf bestehende Funktionalität

### ✅ Reveal Workflow - UNVERÄNDERT
- Die Loot-Anzeige funktioniert exakt wie vorher
- Der `LOOT-CLAIM:INDIVIDUAL` / `LOOT-CLAIM:HOARD` Workflow ist nicht betroffen
- Die Chat-Nachrichten für Spieler sehen gleich aus

### ✅ Gold-Berechnung - UNVERÄNDERT
- `Math.ceil(goldRoll.total / 4)` wird wie vorher berechnet
- Gold wird automatisch aufgerundet
- Berechnung ist identisch

## Technische Details

### Neue Dateien
- **`src/goldPayout.js`** - Alle Gold-Payout-Funktionen
  - `handleGoldPayout(goldPerPlayer)` - Haupteinstiegspunkt
  - `getPlayerCharactersMap()` - Lädt alle Player-Owned Characters
  - `loadSavedPayoutConfig()` - Lädt gespeicherte Konfiguration
  - `showPayoutConfigurationDialog()` - Dialog zur Auswahl
  - `showPayoutConfirmationDialog()` - Bestätigung vor Auszahlung
  - `processGoldPayout()` - Tatsächliche Auszahlung
  - `createPayoutResultCard()` - Ergebnis-Chatkarte

### Modifizierte Dateien
- **`module.json`** - `goldPayout.js` als esmodule hinzugefügt
- **`src/module.js`** - Setting `goldPayoutCharacters` registriert
- **`macros/Individual_Treasure.js`** - `handleGoldPayout()` nach Loot-Anzeige aufgerufen
- **`macros/Treasure_Hoard.js`** - `handleGoldPayout()` nach Loot-Anzeige aufgerufen

### Gespeicherte Einstellung
```javascript
// Setting: jacobs-loot-generator.goldPayoutCharacters
// Struktur:
{
  [userId]: {
    characterId: "actor-uuid",
    characterName: "Aragorn"
  },
  [userId2]: {
    characterId: "actor-uuid-2",
    characterName: "Legolas"
  }
}
```

## Error-Handling

Alle Fehler werden als **UI Notifications** dem GM angezeigt:
- ❌ Keine Spieler konfiguriert
- ❌ Charakter nicht gefunden (gelöscht?)
- ❌ Fehler beim Gold speichern
- ⚠️ Teilweise erfolgreiche Auszahlung

Die Ergebnis-Chatkarte zeigt auch grafisch:
- ✅ (Grün) - Alle erfolgreich
- ⚠️ (Orange) - Teilweise erfolgreich
- ❌ (Rot) - Keine erfolgreich

## Bedingungen

- **Nur für GM**: Nur der GM kann Auszahlungen veranlassen (`game.user.isGM`)
- **Player-Owned Characters**: Nur Charaktere, die einem Spieler gehören (nicht NPC)
- **Aktive Characters**: Alle Characters in der Welt können Gold erhalten (nicht nur aktive)

## Zukünftige Verbesserungen

- [ ] Dialog zum Ändern der Character-Auswahl im Bestätigungsdialog
- [ ] UI-Button zum manuellen Zurücksetzen der Konfiguration
- [ ] Bulk-Character-Zuordnung (z.B. immer Standard-Character)
- [ ] Optional: Automatische GM-Bestätigung ohne Dialog

## Testing-Checkliste

- [ ] Erstes Makro-Ausführen zeigt Configuration Dialog
- [ ] Charaktere können abgewählt werden
- [ ] Einstellung wird gespeichert
- [ ] Zweites Ausführen nutzt gespeicherte Charaktere
- [ ] Gold wird korrekt zu Charakteren hinzugefügt
- [ ] Ergebnis-Chatkarte wird gepostet
- [ ] Fehlerbehandlung funktioniert (z.B. gelöschter Character)
- [ ] Reveal-Workflow bleibt unverändert
- [ ] Gold-Berechnung (Math.ceil) funktioniert noch
- [ ] Beide Makros (Individual + Treasure Hoard) funktionieren

