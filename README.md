# Random Loot Generator

Foundry VTT v14 module packaging your macros and RollTables for easy import.

Installation (quick):
1. Run the PowerShell install script to copy this module into your Foundry `Data/modules` folder and enable it as GM.

PowerShell (quick example):

```powershell
# Copy module into your Foundry Data/modules folder (prompts if not provided)
.\copy_to_foundry.ps1
```

What it does:
- Imports the RollTables listed in `roll_tables/manifest.json` into the world (idempotent).
- Creates the bundled macros under `macros/` on first GM run (idempotent).
- Adds a small Loot panel in the left sidebar for quick macro execution.

Testing checklist:
- Enable the module as a GM.
- Open Foundry and ensure `game.tables` includes the imported tables and `game.macros` includes the macros.
- Open the Loot sidebar button (dice icon) and run macros from the panel.

Notes:
- Filenames with commas are URL-encoded by the module import logic.
- If a RollTable already exists with the same name, it will not be recreated.

Author: Jacob
Version: 0.00
