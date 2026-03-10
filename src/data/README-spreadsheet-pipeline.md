# Spreadsheet Content Pipeline
This project supports injecting new Items, Pets, Weapons, Armors, and Books natively via a JSON array without requiring source code modifications. 

To use this feature, export your tracking spreadsheet (Excel, Google Sheets) to JSON format and replace the contents of `src/data/gameContent.json`.

## Required Schema Columns

| Column Name | Type | Description | Required? |
|-------------|------|-------------|-----------|
| `id` | `string` | A unique string identifier for the item (e.g. `ember_fox`, `shadow_blade`). **Must not match existing hardcoded IDs.** | **YES** |
| `type` | `string` | The system type of the item. Valid types: `pet`, `weapon`, `armor`, `book`, `relic`, `pet_gear`, `furniture`, `ticket` | **YES** |
| `name` | `string` | The display name of the object. | **YES** |
| `rarity` | `string` | The tier of the item. Valid: `common`, `uncommon`, `rare`, `epic`, `legendary`, `mythic` | **YES** |
| `category` | `string` | Use for `book` types (`fantasy`, `business`, etc) or `shopCategory` overrides (`blacksmith`, `armory`, `library`). | No |
| `level` | `number` | The integer tier step. Principally used for Books (1, 2, 3, 4, 5). | No |
| `fusionRequirement`| `number`| How many duplicate copies are needed to fuse this unit. | No |
| `effectType` | `string`| The name of the stat or effect this item alters (e.g. `arena_crit`, `intelligence`, `xp_gain`). | No |
| `effectValue`| `number`| The numerical value of the stat bonus (`0.05` = 5%). | No |
| `value` | `number` | Generic value field. Evaluates as ATK for weapons or DEF for armors. | No |
| `critChance` | `number` | Unique critical strike chance modifier. | No |
| `price` | `number` | Store Gold acquisition value. | No |
| `source` | `string` | Origin label for Codex tracking (e.g. `gacha`, `marketplace`, `library`, `daily_spin`). | No |
| `description`| `string` | The flavor text spanning across the Codex and Item tooltips. | No |
| `icon` | `string` | A single emoji representing the entity (e.g. 🦊, 🗡️). | No |

### Behavior Notes
- **Duplicate IDs:** If an exported item shares an `id` with a core hardcoded game item, the system will log a warning indicating a bypass, discarding the spreadsheet version in favor of the internal build.
- **Auto-Codex Stubs:** The parser will safely generate a Collection Codex stub if `source` or `description` happens to be empty.
- **Unknown Fields:** Any spreadsheet columns not explicitly expected by this schema are safely omitted and ignored during the merge step.
