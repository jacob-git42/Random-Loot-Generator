# Gold Payout System - Implementierungszusammenfassung

## ✅ Was wurde implementiert

### 1. **Neue Utility-Datei: `src/goldPayout.js`**
   - **8 Funktionen** für Gold-Verwaltung:
     - `getPlayerCharactersMap()` - Alle Player-Owned Characters laden
     - `loadSavedPayoutConfig()` / `savePayoutConfig()` - Einstellungen speichern/laden
     - `showPayoutConfigurationDialog()` - Dialog zur Charakterauswahl
     - `showPayoutConfirmationDialog()` - Bestätigungsdialog vor Auszahlung
     - `processGoldPayout()` - Tatsächliche Auszahlung an Characters
     - `createPayoutResultCard()` - Chatkarte mit Ergebnis
     - `handleGoldPayout()` - **Hauptfunktion** (vom Makro aufgerufen)

### 2. **Settings in `src/module.js`**
   - Registriert neue Setting: `goldPayoutCharacters`
   - Speichert Zuordnung: `{ [userId]: { characterId, characterName } }`

### 3. **Module-Konfiguration in `module.json`**
   - `goldPayout.js` als esmodule hinzugefügt
   - Macht alle Funktionen global verfügbar

### 4. **Beide Makros erweitert**
   - **`macros/Individual_Treasure.js`**
     - Nach der Loot-Chat-Nachricht: `await handleGoldPayout(goldPerPlayer);`
   - **`macros/Treasure_Hoard.js`**
     - Nach der Loot-Chat-Nachricht: `await handleGoldPayout(goldPerPlayer);`

## 🔄 Workflow (Zusammenfassung)

```
Individual Treasure / Treasure Hoard ausführen
        ↓
Loot wird normal generiert und gezeigt (UNVERÄNDERT)
        ↓
handleGoldPayout() wird aufgerufen
        ↓
IF keine Konfiguration existiert:
   → Dialog: Charaktere auswählen
   → Auswahl speichern
ELSE:
   → Gespeicherte Charaktere nutzen
        ↓
Bestätigungsdialog zeigen
        ↓
Gold auszahlen (+ zu character.system.currency.gp)
        ↓
Ergebnis-Chatkarte posten
```

## 🛡️ Schutzmaßnahmen

**Der Reveal-Workflow wurde NICHT verändert:**
- ✅ Loot-Anzeige bleibt identisch
- ✅ Gold-Aufrundung (`Math.ceil`) funktioniert wie vorher
- ✅ Chat-Struktur unverändert
- ✅ Der Payout läuft **nach** dem kompletten Reveal-Prozess

## 📊 Error-Handling

Alle Fehler werden mit **UI Notifications** angezeigt:
```javascript
ui.notifications.error('Fehler bei der Gold-Auszahlung...');
ui.notifications.warn('Keine Spieler konfiguriert...');
ui.notifications.info('Gold erfolgreich ausgezahlt!');
```

Ergebnis-Chatkarte zeigt auch:
- ✅ Erfolgreich ausgezahlte Characters
- ❌ Failed Characters mit Fehlermeldung

## 🎯 User-Erlebnis

### Erste Nutzung:
1. Makro ausführen
2. Loot wird angezeigt (normal)
3. 📋 Dialog öffnet: "Wähle Charaktere für Gold-Auszahlung"
4. ✅ Charaktere auswählen → Speichern
5. ✅ Bestätigungsdialog anzeigen
6. 💰 Gold auszahlen
7. 💬 Ergebnis-Chatkarte posten

### Nächste Nutzung:
1. Makro ausführen
2. Loot wird angezeigt
3. ✅ Bestätigungsdialog (mit gespeicherten Charakteren)
4. 💰 Gold auszahlen
5. 💬 Ergebnis-Chatkarte posten

## 🔧 Technische Highlights

- **Keine Abhängigkeiten** - verwendet nur Foundry Core APIs
- **Global verfügbar** - via `window.handleGoldPayout`
- **Asynchron** - alle Dialoge und Operationen sind async
- **Fehlerresistent** - Try-Catch überall
- **Deutsche UI** - Alle Texte, Dialoge, Notifications in Deutsch

## 📝 Dateien geändert/erstellt

| Datei | Änderung | Zeilen |
|-------|----------|--------|
| `src/goldPayout.js` | **ERSTELLT** | ~380 |
| `module.json` | Geändert | +1 esmodule |
| `src/module.js` | Geändert | +8 Zeilen Setting |
| `macros/Individual_Treasure.js` | Geändert | +3 Zeilen |
| `macros/Treasure_Hoard.js` | Geändert | +3 Zeilen |

## 🧪 Nächste Schritte zum Testen

1. **Modul laden** in Foundry
2. **Beide Makros testen**:
   - Individual Treasure ausführen → Dialog sollte kommen
   - Charaktere auswählen → Speichern
   - Bestätigungsdialog bestätigen
   - Gold sollte auf Character erhöht werden
   - Chatkarte sollte Erfolg zeigen

3. **Zweites Mal ausführen**:
   - Sollte direkt zum Bestätigungsdialog gehen (keine Konfiguration)

4. **Error Cases**:
   - Character löschen → Fehler sollte gezeigt werden
   - Abbrechen bei Dialogen → Sollte nicht auszahlen

## 💡 Besonderheiten

- **Global speichert** - Die Konfiguration ist **world-weit**, nicht per User
- **Alle Spieler können Gold erhalten** - Nicht nur aktive in der Session
- **Character-Wechsel möglich** - Ein Spieler kann mehrere Characters haben
- **Flexible Checkboxen** - Spieler können abgewählt werden
- **Einmalige Konfiguration** - Nach dem ersten Mal auto-gespeichert

Viel Erfolg beim Testen! 🎲💰
