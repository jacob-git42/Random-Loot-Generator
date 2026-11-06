# 🪙 Gold Payout System - Implementierung abgeschlossen

## 📋 Was wurde implementiert?

Ein vollständiges **automatisches Gold-Auszahlungssystem** für die Loot-Makros **Individual Treasure** und **Treasure Hoard**, das:

✅ Nach jedem Loot-Roll den GM auffordert, die Zielcharaktere für die Auszahlung zu wählen  
✅ Die Auswahl global speichert und bei zukünftigen Rollern automatisch verwendet  
✅ GM kann die Charaktere bei Bedarf anpassen  
✅ Zeigt eine Bestätigungskarte vor der Auszahlung  
✅ Zahlt Gold automatisch auf die ausgewählten Charaktere aus  
✅ Erstellt eine detaillierte Chatkarte mit dem Auszahlungsergebnis  

**WICHTIG**: Der Reveal-Workflow bleibt 100% unverändert ✓

---

## 🚀 Schnellstart zum Testen

### 1. Modul neuladen in Foundry
- Foundry öffnen
- Module Manager: "Random Loot Generator" deaktivieren/aktivieren oder neu laden
- Full Browser Refresh (Strg+Shift+R)

### 2. Test ausführen
```
Individual Treasure Makro ausführen
  → Loot wird angezeigt (wie gewohnt) ✓
  → Dialog: "Gold-Auszahlung konfigurieren" ← NEUER SCHRITT
  → Charaktere auswählen → Speichern
  → Dialog: "Gold-Auszahlung bestätigen"
  → Bestätigen → PAYOUT ✓
  → Chatkarte mit Ergebnis wird gepostet ✓
```

### 3. Zweiter Test (gespeicherte Konfiguration)
```
Individual Treasure Makro erneut ausführen
  → Loot wird angezeigt
  → Dialog: "Gold-Auszahlung bestätigen" ← DIREKT (keine Konfiguration)
  → (Die Charaktere sind bereits konfiguriert!)
  → Bestätigen → PAYOUT ✓
```

---

## 📁 Dateien

### Neue Datei
| Datei | Zweck | Größe |
|-------|-------|-------|
| `src/goldPayout.js` | Core-Logik für Gold-Payout | ~380 Zeilen |

### Geänderte Dateien
| Datei | Änderung | Details |
|-------|----------|---------|
| `module.json` | +1 esmodule | `goldPayout.js` hinzugefügt |
| `src/module.js` | +1 Setting | `goldPayoutCharacters` registriert |
| `macros/Individual_Treasure.js` | +3 Zeilen | `await handleGoldPayout(goldPerPlayer);` |
| `macros/Treasure_Hoard.js` | +3 Zeilen | `await handleGoldPayout(goldPerPlayer);` |

### Dokumentation (für Referenz)
| Datei | Inhalt |
|-------|--------|
| `GOLD_PAYOUT_FEATURE.md` | Detaillierte Feature-Dokumentation |
| `IMPLEMENTATION_SUMMARY.md` | Technische Zusammenfassung |
| `TESTING_CHECKLIST.md` | Komplette Testing-Checkliste |
| `WORKFLOW_DIAGRAM.md` | Flussdiagramme & Datenstrukturen |
| `GOLD_PAYOUT_README.md` | Diese Datei |

---

## 🔒 Schutzmaßnahmen (Reveal-Workflow bleibt UNVERÄNDERT)

Das Payout-System läuft **nach** dem kompletten Reveal-Prozess und beeinträchtigt diesen in keiner Weise:

✅ Loot-Anzeige ist identisch  
✅ Gold-Berechnung (`Math.ceil`) funktioniert wie vorher  
✅ Chat-Nachrichten-Struktur unverändert  
✅ LOOT-CLAIM Marker bleibt erhalten  
✅ Reveal-Buttons/Links funktionieren wie vorher  

---

## 🎯 Funktionaler Workflow

```
Makro ausführen
    ↓
[Loot generieren & anzeigen] ← UNVERÄNDERT
    ↓
IF erste Nutzung:
    → Dialog: Charaktere auswählen
    → Speichern
ELSE:
    → Nutze gespeicherte Charaktere
    ↓
Dialog: Bestätigung
    ↓
IF bestätigt:
    → Gold zu Characters hinzufügen
    → Chatkarte mit Ergebnis posten
ELSE:
    → Abbrechen (kein Payout)
```

---

## 🧪 Quick Test Checklist

- [ ] Modul neuladen ✓
- [ ] Individual Treasure ausführen
  - [ ] Loot wird angezeigt ✓
  - [ ] Konfigurationsdialog öffnet sich ✓
  - [ ] Charaktere sind auswählbar ✓
  - [ ] Nach "Speichern" kommt Bestätigungsdialog ✓
  - [ ] Nach "Bestätigen" wird Chatkarte gepostet ✓
  - [ ] Gold wurde zu Charakteren hinzugefügt ✓
  
- [ ] Treasure Hoard ausführen
  - [ ] Loot wird angezeigt ✓
  - [ ] Bestätigungsdialog öffnet sich (KEINE Konfiguration) ✓
  - [ ] Gespeicherte Charaktere werden angezeigt ✓
  - [ ] Gold wird ausgezahlt ✓

---

## 📊 Datenstruktur

Die Einstellungen werden unter folgendem Pfad gespeichert:

```javascript
game.settings.get('jacobs-loot-generator', 'goldPayoutCharacters')

// Struktur:
{
  "user-id-1": {
    characterId: "actor-uuid",
    characterName: "Aragorn"
  },
  "user-id-2": {
    characterId: "actor-uuid",
    characterName: "Legolas"
  }
}
```

**Sie können das in der Foundry-Konsole überprüfen:**
```javascript
game.settings.get('jacobs-loot-generator', 'goldPayoutCharacters')
```

---

## ⚙️ Konfiguration ändern

Wenn Sie die Charakterauswahl ändern möchten:

**Option 1: Manuell (via Dialog)**
- Makro mit `Strg`-Taste ausführen (Zukunft: neuen Button hinzufügen)
- Konfigurationsdialog öffnet sich
- Neue Charaktere auswählen → Speichern

**Option 2: Löschen (Konsole)**
```javascript
await game.settings.set('jacobs-loot-generator', 'goldPayoutCharacters', {})
```
Dann kommt beim nächsten Makro wieder der Konfigurationsdialog.

---

## 🐛 Error Handling

Alle Fehler werden dem GM angezeigt:

| Fehler | Handling |
|--------|----------|
| Keine Spieler-Charaktere | UI Notification: Warn |
| Character gelöscht | ❌ in Chatkarte, aber andere Spieler bekommen Gold |
| Fehler beim Speichern | ⚠️ Teilweise erfolgreiche Auszahlung |
| User klickt Abbrechen | Dialog schließt, KEINE Auszahlung |

---

## 📝 Bekannte Limitierungen / Zukünftige Verbesserungen

- [ ] Dialog zur Konfigurationsänderung ohne `/resume` ist noch nicht implementiert
- [ ] UI-Button zum Zurücksetzen der Konfiguration in den Settings
- [ ] Automatische GM-Bestätigung (ohne Dialog) als Option
- [ ] Payout-History/Logging

---

## ✅ Finale Checkliste vor dem Merge

- [x] `goldPayout.js` erstellt mit allen 8 Funktionen
- [x] Settings in `module.json` und `module.js` registriert
- [x] Beide Makros mit Payout-Aufruf erweitert
- [x] Reveal-Workflow bleibt unverändert
- [x] Gold-Berechnung (Math.ceil) ist unverändert
- [x] Error-Handling implementiert (UI Notifications)
- [x] Chatkarte mit Ergebnis wird gepostet
- [x] Konfiguration wird persistent gespeichert
- [x] Nur GM kann Auszahlen
- [x] Alle Dokumentation erstellt
- [x] Testing-Checkliste erstellt

---

## 🎲 Viel Erfolg beim Testen!

Bei Fragen oder Problemen: Bitte die **Testing-Checkliste** durchgehen und Fehler mit Screenshots/Konsolenmeldungen dokumentieren.

**Status**: ✅ Implementierung abgeschlossen, bereit zum Testen

