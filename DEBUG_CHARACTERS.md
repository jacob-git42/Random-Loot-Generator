# 🔍 Character Recognition Debug Guide

## Problem

Charaktere werden nicht erkannt, obwohl jedem Spieler ein Charakter zugeordnet ist.

---

## Debugging-Schritte

### 1. Debug-Function in Konsole ausführen

Öffnen Sie die **Foundry Developer Console** (F12):

```javascript
game.jacobs_loot_debugCharacters()
```

Dies zeigt an:
- ✅ Alle Benutzer und ihre IDs
- ✅ Alle Charaktere und ihre Ownership-Struktur
- ✅ Die erkannte Character-Map
- ⚠️ Charaktere OHNE erkannte Owner

### 2. Output interpretieren

Der Output sieht etwa so aus:

```
=== jacobs-loot-generator Character Debug ===

USERS:
  [user-id-1] Player 1 (isGM: false)
  [user-id-2] Player 2 (isGM: false)
  [system] System (isGM: true)

CHARACTERS:
  [actor-id-1] Aragorn
    Type: character
    Ownership: {user-id-1: 3, default: 0}
    Owner: Player 1 (user-id-1)

  [actor-id-2] Legolas
    Type: character
    Ownership: {user-id-2: 3, default: 0}
    Owner: Player 2 (user-id-2)

CHARACTER MAP:
{
  user-id-1: [{id: "actor-id-1", name: "Aragorn", owner: "Player 1"}],
  user-id-2: [{id: "actor-id-2", name: "Legolas", owner: "Player 2"}]
}

=== Debug Complete ===
```

---

## Mögliche Probleme & Lösungen

### Problem 1: "NO OWNER FOUND" Warnung

**Ursache**: Ownership ist nicht auf 3 gesetzt

**Lösung**:
1. Character öffnen → Klick auf "Permissions"
2. Stelle sicher, dass der Spieler "Owner" ist (Level 3)
3. Speichern

### Problem 2: Ownership hat andere Wert

**Beispiel**:
```
Ownership: {user-id-1: 2, default: 0}
```

**Erklärung der Levels**:
- 0 = No access
- 1 = Limited (kann sehen)
- 2 = Observer (kann alles sehen)
- 3 = Owner (volle Kontrolle)

**Lösung**: Character-Permissions auf "Owner" (3) setzen

### Problem 3: User-ID nicht erkannt

**Zeichen**: 
- User wird angezeigt
- Character wird angezeigt
- Aber nicht miteinander verlinkt

**Debug-Befehl** (in Konsole):
```javascript
// Überprüfe User IDs
game.users.forEach(u => console.log(`${u.name}: ${u.id}`));

// Überprüfe Character Ownership
game.actors.forEach(a => a.type === 'character' && console.log(`${a.name}:`, a.ownership));
```

**Lösung**: Character-Ownership manuell korrigieren (siehe Problem 1)

---

## Häufige Ownership-Strukturen

### Foundry v11+ (Standard)
```javascript
{
  "user-id-123": 3,  // Owner
  "default": 0       // Default (no access)
}
```

### Alte Versionen
```javascript
{
  "user-id-123": {
    "level": 3
  }
}
```

### Alternative Systeme
```javascript
{
  "user-id-123": "owner"
}
```

---

## Schnelle Fehlersuche

### 1. Alle Player-Characters auflisten
```javascript
// In Konsole:
game.actors.filter(a => a.type === 'character').forEach(a => {
  const owners = Object.entries(a.ownership || {})
    .filter(([k, v]) => v === 3)
    .map(([k]) => k);
  const owner = owners.length ? game.users.get(owners[0])?.name : 'NONE';
  console.log(`${a.name} → Owner: ${owner}`);
});
```

### 2. User-Character-Zuordnung prüfen
```javascript
// In Konsole:
game.users.filter(u => !u.isGM).forEach(u => {
  const chars = game.actors.filter(a => 
    a.type === 'character' && 
    Object.entries(a.ownership || {}).some(([k, v]) => k === u.id && v === 3)
  );
  console.log(`${u.name}: ${chars.map(c => c.name).join(', ') || 'KEINE'}`);
});
```

### 3. Character-Map direkt laden
```javascript
// In Konsole:
const map = await getPlayerCharactersMap();
console.table(map);
```

---

## Wenn das Debug-Script keine Characters zeigt

### Schritt 1: Überprüfen Sie, ob Characters existieren
```javascript
// In Konsole:
game.actors.filter(a => a.type === 'character')
```

Sollte mindestens 1 Character zeigen.

### Schritt 2: Überprüfen Sie Player-Counts
```javascript
// In Konsole:
game.users.filter(u => !u.isGM)
```

Sollte Ihre Spieler zeigen.

### Schritt 3: Manuelles Zuweisen (Workaround)
```javascript
// Character-Ownership ändern
const actor = game.actors.getName("Aragorn");
await actor.update({
  ownership: {
    [game.users.getName("PlayerName").id]: 3,
    default: 0
  }
});
```

---

## Output-Kategorien

### ✅ Grün (OK)
- User wird angezeigt
- Character wird angezeigt
- Ownership = 3
- Owner wird erkannt

### ⚠️ Orange (Warnung)
- `⚠️ NO OWNER FOUND` in Debug-Output
- Character ist nicht zugeordnet

### ❌ Rot (Fehler)
- CHARACTER MAP zeigt keine Einträge
- Keine Characters angezeigt

---

## Im Konfigurationsdialog

Nach dem Debug können Sie testen:

1. Sidebar: "Configure Players" klicken
2. Überprüfen Sie, welche Characters angezeigt werden
3. Vergleichen Sie mit Debug-Output

---

## Wenn alles nicht hilft

1. **Screenshot der Debug-Console machen** (alles sichtbar)
2. **Foundry Version überprüfen** (F12 → Console, dort `game.version` eingeben)
3. **D&D System überprüfen** (kann Ownership beeinflussen)

---

## Quick Fix: Alle Character-Permissions zurücksetzen

Falls mehrere Characters falsch konfiguriert sind:

```javascript
// In Konsole (ACHTUNG: Ändert alle Characters!)
for (const actor of game.actors) {
  if (actor.type === 'character') {
    // Finde Owner basierend auf Token oder ähnliches
    // Dies ist ein Platzhalter - bitte anpassen!
    console.log(`${actor.name}: ${JSON.stringify(actor.ownership)}`);
  }
}
```

**Sicherer Weg**: Jeden Character einzeln im UI öffnen → Permissions → "Owner" setzen

---

Bitte führen Sie `game.jacobs_loot_debugCharacters()` aus und teilen Sie den Output mit mir! 🔍

