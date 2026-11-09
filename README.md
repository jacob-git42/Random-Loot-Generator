# Random Loot Generator

Foundry VTT v14 module packaging your macros and RollTables for easy import.

To reveal a loot card, select an owned token on the active scene. The GM who
created the card must be connected and viewing that same scene; loot sessions
are kept in that GM client's memory and do not survive a reload.

On reveal, the GM resolves the rolled items and creates individual Item Piles
within 25 scene distance units of the selected token. A sight polygon blocks
placement behind walls. Placement requires a gridded scene; when free grid
spaces run out, piles can overlap. A public Item Piles chat card lists successes
and items requiring manual placement. Gold is not placed on the canvas: the
existing gold payout and GM confirmation remain unchanged.

Newly generated piles use 0.5 icon scale and a compact canvas label colored by
the prepared item's rarity. The label is bounded to the token's grid cell and
is restored on scene load or client reload. Items without a rarity use the
common colors. Art objects are labelled `Art Object`, and the `Spell Scroll:`
prefix is omitted from scroll labels; actual item names and chat results remain
unchanged. Art objects are recognized by the hoard's art table or the D&D 5e
loot type `art`. Existing piles retain their saved names, though scroll prefixes
are removed when their labels are drawn. Later item changes do not update labels.
Piles that occupy the same cell can still have overlapping labels.
After updating the module, reload the GM client to synchronize the bundled
macros; synchronization replaces the commands of existing module macros.

The D&D 5e system supplies scrolls and enchantment effects. Missing compendium
entries, unsupported enchantment riders, failed placement, or a scene change
are reported in the chat card instead of stopping the remaining loot. Some
tables refer to `Compendium.world.jacobs-loot-generator`, which must exist in
the world until that compendium is included in this module.

Magical ammunition uses a random base item from the `Ammunition` roll table.
Demon Armor can select any base armor from `Armor`, but remains a manual
fallback because its enchantment also requires a dependent Clawed Gauntlets item.

The lightweight unit tests can be run with `node --test tests/*.test.cjs`;
they mock Foundry and do not replace testing inside Foundry VTT.
