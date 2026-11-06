# Testing Checklist - Gold Payout System

## Pre-Test Checklist
- [ ] Modul in Foundry neu geladen (Full Refresh)
- [ ] Keine Fehler in der Foundry Console (F12 → Console Tab)
- [ ] Testworld mit mindestens 2 Spielern und 3+ Player-Characters vorbereitet

## Test 1: Erste Nutzung - Individual Treasure

### Setup
- [ ] Mehrere Player-Owned Characters in der Welt erstellen
- [ ] Beispiel: "Aragorn" (Player 1), "Legolas" (Player 2), "Gimli" (Player 2)

### Ausführung
1. [ ] "Individual Treasure" Makro ausführen
2. [ ] Dialog mit Monsteranzahl ausfüllen (z.B. 2x CR 0-4, 1x CR 5-10)
3. [ ] "Generate Loot" klicken

### Erwartetes Verhalten
- [ ] Loot wird normal angezeigt (Loot Card im Chat)
- [ ] Gold-Betrag wird berechnet und angezeigt (z.B. "X gp each")
- [ ] **Neuer Schritt**: "Gold-Auszahlung konfigurieren" Dialog öffnet sich
  - [ ] Alle Spieler werden angezeigt (mit Namen)
  - [ ] Standardcharaktere sind vorausgewählt
  - [ ] "Speichern & Auszahlen" Button ist vorhanden
  - [ ] "Abbrechen" Button ist vorhanden

4. [ ] Gold-Konfiguration Dialog ausfüllen:
   - [ ] Überprüfe, dass für jeden Spieler ein Character ausgewählt ist
   - [ ] Wähle einen der Charaktere ab (Checkbox deaktivieren)
   - [ ] Klicke "Speichern & Auszahlen"

### Erwartetes Verhalten nach Speichern
- [ ] "Bestätigung: Gold-Auszahlung" Dialog öffnet sich
  - [ ] Zeigt nur die Spieler, deren Checkbox aktiv war
  - [ ] Zeigt Spieler, Character-Name und Gold-Betrag pro Spieler
  - [ ] Zeigt Gesamtbetrag
  - [ ] "Bestätigen & Auszahlen" und "Abbrechen" Buttons vorhanden

5. [ ] Klicke "Bestätigen & Auszahlen"

### Erwartetes Ergebnis
- [ ] **Chatkarte** mit Auszahlungsergebnis wird gepostet:
  - [ ] Status-Icon (✅ = grün, ⚠️ = orange, ❌ = rot)
  - [ ] Zeigt "Pro Spieler: X gp"
  - [ ] Zeigt Erfolgreich/Fehler Count
  - [ ] Listet alle Charaktere mit Status auf
    - [ ] Format: "✅ Aragorn: +X gp (gesamt: Y gp)"

- [ ] UI Notification zeigt: "✅ Gold erfolgreich an X Spieler ausgezahlt!"

- [ ] **Gold in Character wurde erhöht**:
  - [ ] Öffne den Character Sheet des ausgezahlten Characters
  - [ ] Überprüfe `system.currency.gp` - sollte erhöht sein

## Test 2: Zweite Nutzung - Treasure Hoard (Gespeicherte Konfiguration)

### Ausführung
1. [ ] "Treasure Hoard" Makro ausführen
2. [ ] Dialog mit Anzahl und Tier ausfüllen (z.B. 1x Tier 3)
3. [ ] "Generate Loot" klicken

### Erwartetes Verhalten
- [ ] Loot wird normal angezeigt
- [ ] **DIREKT** zum "Bestätigung: Gold-Auszahlung" Dialog (KEINE Konfiguration)
  - [ ] Zeigt die Charaktere aus Test 1 (gespeichert)
  - [ ] Der abgewählte Spieler ist NICHT mehr dort

4. [ ] Klicke "Bestätigen & Auszahlen"

### Erwartetes Ergebnis
- [ ] Chatkarte wird gepostet mit Auszahlungsergebnis
- [ ] Gold wird zu den Charakteren hinzugefügt
- [ ] UI Notification: "✅ Gold erfolgreich an X Spieler ausgezahlt!"

## Test 3: Error Handling

### Szenario A: Character gelöscht
1. [ ] Einen der ausgezahlten Characters löschen
2. [ ] Makro erneut ausführen → Bestätigen
3. [ ] **Erwartetes Verhalten**:
   - [ ] Chatkarte zeigt ⚠️ (orange = Teilweise)
   - [ ] Gelöschter Character: "❌ [CharName]: Charakter nicht gefunden"
   - [ ] UI Notification: "⚠️ Gold teilweise ausgezahlt..."

### Szenario B: Abbrechen im Konfigurationsdialog
1. [ ] Makro ausführen
2. [ ] Im Konfigurationsdialog "Abbrechen" klicken
3. [ ] **Erwartetes Verhalten**:
   - [ ] Keine Auszahlung
   - [ ] UI Notification: "Gold-Auszahlung abgebrochen."

### Szenario C: Abbrechen im Bestätigungsdialog
1. [ ] Makro ausführen
2. [ ] Bestätigungsdialog öffnet sich
3. [ ] "Abbrechen" klicken
4. [ ] **Erwartetes Verhalten**:
   - [ ] Keine Auszahlung
   - [ ] UI Notification: "Gold-Auszahlung abgebrochen."

## Test 4: Multiple Characters pro Spieler

### Setup
- [ ] Einen Spieler mit 3 verschiedenen Characters erstellen
  - [ ] Char A, Char B, Char C

### Ausführung
1. [ ] Makro ausführen → Konfigurationsdialog
2. [ ] Für den Spieler "Char B" aus der Dropdown auswählen
3. [ ] "Speichern & Auszahlen" klicken
4. [ ] Bestätigen

### Erwartetes Verhalten
- [ ] Nur "Char B" bekommt Gold
- [ ] Andere Characters haben kein Gold erhalten
- [ ] Chatkarte zeigt nur "Char B"

### Nächste Nutzung
1. [ ] Makro erneut ausführen
2. [ ] Bestätigungsdialog zeigt "Char B" (gespeichert)
3. [ ] Bestätigen → "Char B" erhält mehr Gold

## Test 5: Reveal Workflow - Bleibt UNVERÄNDERT

### Ausführung
1. [ ] Makro ausführen
2. [ ] Loot wird angezeigt

### Überprüfungen
- [ ] Loot-Karte hat die gleiche Struktur wie vorher
  - [ ] "Encounter Reward" / "Treasure Hoard Tier X"
  - [ ] Loot-Items werden normal angezeigt
  - [ ] Gold pro Player wird angezeigt (z.B. "X gp each")
- [ ] Gold wird korrekt berechnet:
  - [ ] `Math.ceil()` funktioniert (wird aufgerundet)
  - [ ] Beispiel: 125 gp / 4 Spieler = 32 gp (nicht 31.25)
- [ ] LOOT-CLAIM-Marker vorhanden (wenn includeClaim)
  - [ ] "Loot Claimed: [GM Name] 💰"

## Test 6: Payout nur für GM

### Ausführung
1. [ ] Mit **nicht-GM Account** anmelden
2. [ ] Makro ausführen
3. [ ] Gold-Dialog sollte NICHT öffnen

### Erwartetes Verhalten
- [ ] UI Notification: "Nur der GM kann Gold auszahlen."
- [ ] KEINE Chatkarte
- [ ] KEINE Auszahlung

## Test 7: Keine Player-Characters

### Setup
- [ ] Alle Player-Owned Characters löschen

### Ausführung
1. [ ] Makro ausführen

### Erwartetes Verhalten
- [ ] UI Notification: "Keine Spieler-Charaktere gefunden."
- [ ] KEINE Dialoge
- [ ] Loot wird weiterhin angezeigt (Reveal funktioniert)

## Final Checklist

- [ ] Alle Tests erfolgreich absolviert
- [ ] Keine Fehler in der Foundry Console
- [ ] Reveal-Workflow ist UNVERÄNDERT
- [ ] Gold-Berechnung ist UNVERÄNDERT
- [ ] Both macros (Individual + Treasure Hoard) funktionieren identisch
- [ ] Error-Handling funktioniert robust

## Notes

- Testworld sollte regelmäßig "resette" werden (Charaktergold zurücksetzen für neue Tests)
- Gold-Payout-Einstellung kann in den World Settings überprüft werden:
  - Foundry Console: `game.settings.get('jacobs-loot-generator', 'goldPayoutCharacters')`

---

**Status**: [ ] Bereit zum Merge | [ ] Fehler gefunden | [ ] In Progress

