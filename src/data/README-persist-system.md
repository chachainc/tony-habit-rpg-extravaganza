# Persist System & Registry

This document defines the persistence architecture of the application. The system uses a centralized registry to manage the LocalStorage keys required by Zustand's `persist` middleware. This guarantees no keys silently drift and prevents data loss during PWA server syncs and manual exports/imports.

## Overview

The centralized dictionary `PERSIST_REGISTRY` lives in `src/data/persistRegistry.ts`.
Every robust Zustand store (managing elements like tasks, economy, stats) implements `syncEnabled: true` and `restoreEnabled: true` to flag itself as part of the core payload that should be synchronized when logging into an account.

### Why not static strings?
When keys are hardcoded in the individual files, `collectStoreData` in `useProfileStore` easily falls out of alignment. If a store key is bumped (e.g. `gl-inventory-v1` to `gl-inventory-v2`) inside a single component, the sync mechanism silently ignores it, causing catastrophic progress reset upon loading an old cloud save.

The `PERSIST_REGISTRY` forces a single source of truth.

## Registry State

| ID | Store Name | Persist Key | Synchronized |
|---|---|---|---|
| achievements | `useAchievementTrophyStore` | `gl-achievement-trophies-v2` | true |
| auras | `useAuraStore` | `gl-auras-v1` | true |
| books | `useBookStore` | `gl-books-storage-v2` | true |
| bookTrophies | `useBookTrophyStore` | `gl-book-trophy-v1` | true |
| buffs | `useBuffStore` | `gl-buffs-v2` | true |
| calendar | `useCalendarStore` | `gl-calendar-storage` | true |
| campaign | `useCampaignStore` | `gl-campaign-v2` | true |
| character | `useCharacterStore` | `gl-character-v1` | true |
| checkin | `useCheckInStore` | `gl-checkin-v1` | true |
| codex | `useCodexStore` | `gl-codex-v1` | true |
| conquest | `useConquestStore` | `gl-conquest-storage-v1` | true |
| consistency | `useConsistencyStore` | `gl-consistency-v1` | true |
| currency | `useCurrencyStore` | `gl-currency-v2` | true |
| day | `useDayStore` | `gl-day-v3` | true |
| enemies | `useEnemyStore` | `gl-enemies-v3` | true |
| equipment | `useEquipmentStore` | `gl-equipment-v1` | true |
| factions | `useFactionStore` | `gl-factions-v1` | true |
| fusion | `useFusionStore` | `gl-fusion-v1` | true |
| gacha | `useGachaStore` | `gl-gacha-v1` | true |
| game | `useGameStore` | `gl-game-storage-v7` | true |
| gym | `useGymStore` | `gl-gym-v1` | true |
| health | `useHealthStore` | `gl-health-v1` | true |
| inventory | `useInventoryStore` | `gl-inventory-v4` | true |
| magic | `useMagicStore` | `gl-magic-storage-v1` | true |
| marketplace | `useMarketplaceStore` | `gl-marketplace-v1` | true |
| monopoly | `useMonopolyStore` | `gl-monopoly-v3` | true |
| pets | `usePetStore` | `gl-pet-storage-v3` | true |
| recurringTasks | `useRecurringTasksStore` | `gl-recurring-tasks-v3` | true |
| risk | `useRiskStore` | `gl-risk-storage` | true |
| room | `useRoomStore` | `gl-room-v1` | true |
| shop | `useShopStore` | `gl-daily-shop-v1` | true |
| skillTrophies | `useSkillTrophyStore` | `gl-skill-trophy-v1` | true |
| sound | `useSoundStore` | `gl-sound-v1` | true |
| strategy | `useStrategyStore` | `gl-strategy-storage-v1` | true |
| tasks | `useTaskStore` | `gl-tasks-storage-v4` | true |
| titles | `useTitleStore` | `gl-titles-v1` | true |
| towerDefense | `useTowerDefenseStore` | `gl-td-storage` | true |
| xpWeapons | `useXpWeaponStore` | `gl-xp-weapons-v1` | true |
| profile | `useProfileStore` | `gl-profile-storage` | false |

## How to add a new Store safely

1. Create your standard Zustand store using the `persist()` middleware.
2. In `src/data/persistRegistry.ts`, add a new entry to `PERSIST_REGISTRY` naming your store and establishing the `persistKey`.
3. In your store, import `PERSIST_REGISTRY` and supply it to the `persist` options object: 
   `persist((set) => (...), { name: PERSIST_REGISTRY.myNewStore.persistKey })`
4. Update this documentation markdown table.

That's it! Because `useProfileStore.ts` loops over the dynamically exported registry object, your new store is automatically backed up, serialized into exports, pushed to Firebase via save, and explicitly restored.
