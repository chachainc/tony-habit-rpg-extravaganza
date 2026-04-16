/**
 * Documenting the Persistent Store Registry.
 *
 * All state that needs to survive a browser refresh or be synchronized
 * with the backend (via login/share code) is managed through this registry.
 */

export interface PersistConfig {
    storeName: string;
    persistKey: string;
    syncEnabled: boolean;
    restoreEnabled: boolean;
}

export const PERSIST_REGISTRY: Record<string, PersistConfig> = {
    achievements: { storeName: "useAchievementTrophyStore", persistKey: "gl-achievement-trophies-v2", syncEnabled: true, restoreEnabled: true },
    auras: { storeName: "useAuraStore", persistKey: "gl-auras-v1", syncEnabled: true, restoreEnabled: true },
    boardCollection: { storeName: "useBoardCollectionStore", persistKey: "gl-board-collection-v1", syncEnabled: true, restoreEnabled: true },
    books: { storeName: "useBookStore", persistKey: "gl-books-storage-v2", syncEnabled: true, restoreEnabled: true },
    bookTrophies: { storeName: "useBookTrophyStore", persistKey: "gl-book-trophy-v1", syncEnabled: true, restoreEnabled: true },
    budget: { storeName: "useBudgetStore", persistKey: "gl-budget-v1", syncEnabled: true, restoreEnabled: true },
    buffs: { storeName: "useBuffStore", persistKey: "gl-buffs-v2", syncEnabled: true, restoreEnabled: true },
    calendar: { storeName: "useCalendarStore", persistKey: "gl-calendar-storage", syncEnabled: true, restoreEnabled: true },
    campaign: { storeName: "useCampaignStore", persistKey: "gl-campaign-v2", syncEnabled: true, restoreEnabled: true },
    character: { storeName: "useCharacterStore", persistKey: "gl-character-v1", syncEnabled: true, restoreEnabled: true },
    checkin: { storeName: "useCheckInStore", persistKey: "gl-checkin-v1", syncEnabled: true, restoreEnabled: true },
    codex: { storeName: "useCodexStore", persistKey: "gl-codex-v1", syncEnabled: true, restoreEnabled: true },
    conquest: { storeName: "useConquestStore", persistKey: "gl-conquest-storage-v1", syncEnabled: true, restoreEnabled: true },
    consistency: { storeName: "useConsistencyStore", persistKey: "gl-consistency-v1", syncEnabled: true, restoreEnabled: true },
    currency: { storeName: "useCurrencyStore", persistKey: "gl-currency-v2", syncEnabled: true, restoreEnabled: true },
    day: { storeName: "useDayStore", persistKey: "gl-day-v3", syncEnabled: true, restoreEnabled: true },
    enemies: { storeName: "useEnemyStore", persistKey: "gl-enemies-v3", syncEnabled: true, restoreEnabled: true },
    equipment: { storeName: "useEquipmentStore", persistKey: "gl-equipment-v1", syncEnabled: true, restoreEnabled: true },
    factions: { storeName: "useFactionStore", persistKey: "gl-factions-v1", syncEnabled: true, restoreEnabled: true },
    fusion: { storeName: "useFusionStore", persistKey: "gl-fusion-v1", syncEnabled: true, restoreEnabled: true },
    gacha: { storeName: "useGachaStore", persistKey: "gl-gacha-v1", syncEnabled: true, restoreEnabled: true },
    game: { storeName: "useGameStore", persistKey: "gl-game-storage-v7", syncEnabled: true, restoreEnabled: true },
    gym: { storeName: "useGymStore", persistKey: "gl-gym-v1", syncEnabled: true, restoreEnabled: true },
    health: { storeName: "useHealthStore", persistKey: "gl-health-v1", syncEnabled: true, restoreEnabled: true },
    inventory: { storeName: "useInventoryStore", persistKey: "gl-inventory-v4", syncEnabled: true, restoreEnabled: true },
    magic: { storeName: "useMagicStore", persistKey: "gl-magic-storage-v1", syncEnabled: true, restoreEnabled: true },
    marketplace: { storeName: "useMarketplaceStore", persistKey: "gl-marketplace-v1", syncEnabled: true, restoreEnabled: true },
    monopoly: { storeName: "useMonopolyStore", persistKey: "gl-monopoly-v3", syncEnabled: true, restoreEnabled: true },
    pets: { storeName: "usePetStore", persistKey: "gl-pet-storage-v3", syncEnabled: true, restoreEnabled: true },
    recurringTasks: { storeName: "useRecurringTasksStore", persistKey: "gl-recurring-tasks-v3", syncEnabled: true, restoreEnabled: true },
    risk: { storeName: "useRiskStore", persistKey: "gl-risk-storage", syncEnabled: true, restoreEnabled: true },
    room: { storeName: "useRoomStore", persistKey: "gl-room-v1", syncEnabled: true, restoreEnabled: true },
    shop: { storeName: "useShopStore", persistKey: "gl-daily-shop-v1", syncEnabled: true, restoreEnabled: true },
    skillTrophies: { storeName: "useSkillTrophyStore", persistKey: "gl-skill-trophy-v1", syncEnabled: true, restoreEnabled: true },
    sound: { storeName: "useSoundStore", persistKey: "gl-sound-v1", syncEnabled: true, restoreEnabled: true },
    strategy: { storeName: "useStrategyStore", persistKey: "gl-strategy-storage-v1", syncEnabled: true, restoreEnabled: true },
    tasks: { storeName: "useTaskStore", persistKey: "gl-tasks-storage-v4", syncEnabled: true, restoreEnabled: true },
    titles: { storeName: "useTitleStore", persistKey: "gl-titles-v1", syncEnabled: true, restoreEnabled: true },
    towerDefense: { storeName: "useTowerDefenseStore", persistKey: "gl-td-storage", syncEnabled: true, restoreEnabled: true },
    arenaStats: { storeName: "useArenaStatsStore", persistKey: "gl-arena-stats-v1", syncEnabled: true, restoreEnabled: true },
    marketLoyalty: { storeName: "useMarketLoyaltyStore", persistKey: "gl-market-loyalty-v1", syncEnabled: true, restoreEnabled: true },
    economyBalance: { storeName: "useEconomyBalanceStore", persistKey: "gl-economy-balance-v1", syncEnabled: true, restoreEnabled: true },
    xpWeapons: { storeName: "useXpWeaponStore", persistKey: "gl-xp-weapons-v1", syncEnabled: true, restoreEnabled: true },
    storm: { storeName: "useStormStore", persistKey: "gl-storm-v1", syncEnabled: true, restoreEnabled: true },
    blackjack: { storeName: "useBlackjackStore", persistKey: "gl-blackjack-v1", syncEnabled: true, restoreEnabled: true },
    miniGames: { storeName: "useMiniGameStore", persistKey: "gl-mini-games-v1", syncEnabled: true, restoreEnabled: true },
    weaponProgression: { storeName: "useWeaponProgressionStore", persistKey: "gl-weapon-progression-v1", syncEnabled: true, restoreEnabled: true },
    focus: { storeName: "useFocusStore", persistKey: "gl-focus-v1", syncEnabled: true, restoreEnabled: true },
    journal: { storeName: "useJournalStore", persistKey: "gl-journal-v1", syncEnabled: true, restoreEnabled: true },

    // Special store: Profile itself is persisted, but does NOT participate in the nested sync payload (it is the root schema itself).
    profile: { storeName: "useProfileStore", persistKey: "gl-profile-storage", syncEnabled: false, restoreEnabled: false },
};

/**
 * Validation utility to check registry keys
 */
export function validatePersistRegistry() {
    console.log("Validating Persist Registry...");

    const keys = new Set<string>();
    let hasDuplicate = false;

    Object.entries(PERSIST_REGISTRY).forEach(([id, entry]) => {
        if (!entry.storeName) console.warn(`[Validation] Entry ${id} missing storeName`);
        if (!entry.persistKey) console.warn(`[Validation] Entry ${id} missing persistKey`);

        if (keys.has(entry.persistKey)) {
            console.error(`[Validation] DUPLICATE persistKey detected: ${entry.persistKey}`);
            hasDuplicate = true;
        }
        keys.add(entry.persistKey);
    });

    if (!hasDuplicate) {
        console.log(`[Validation] ${Object.keys(PERSIST_REGISTRY).length} entries validated. No duplicates found.`);
    }

    // You can call this somewhere in an App initialization effect during dev mode.
}
