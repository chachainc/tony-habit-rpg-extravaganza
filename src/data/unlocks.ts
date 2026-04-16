import type { UnlockRequirement, Item } from './items';
import type { SkillName } from '../store/useGameStore';

export interface PlayerState {
    skills: Record<SkillName, { level: number }>;
    attack: number;
    defense: number;
    ownedItems: string[];
}

export interface UnlockCheckResult {
    canUnlock: boolean;
    missingRequirements: string[];
}

/**
 * Check if a player meets the unlock requirements for an item
 */
export function checkUnlockRequirements(
    requirement: UnlockRequirement,
    playerState: PlayerState
): UnlockCheckResult {
    const missing: string[] = [];

    // Check skill requirements
    if (requirement.skills) {
        for (const req of requirement.skills) {
            const playerSkill = playerState.skills[req.skill];
            if (!playerSkill || playerSkill.level < req.level) {
                missing.push(`${req.skill} Level ${req.level}`);
            }
        }
    }

    // Check defense requirement
    if (requirement.defense !== undefined) {
        if (playerState.defense < requirement.defense) {
            missing.push(`Defense ${requirement.defense}`);
        }
    }

    // Check attack requirement
    if (requirement.attack !== undefined) {
        if (playerState.attack < requirement.attack) {
            missing.push(`Attack ${requirement.attack}`);
        }
    }

    // Check prerequisite items
    if (requirement.otherItems) {
        for (const itemId of requirement.otherItems) {
            if (!playerState.ownedItems.includes(itemId)) {
                missing.push(`Must own prerequisite item`);
            }
        }
    }

    return {
        canUnlock: missing.length === 0,
        missingRequirements: missing,
    };
}

/**
 * Check if player can afford and unlock an item
 */
export function canPurchaseItem(
    item: Item,
    playerState: PlayerState,
    currencyState: {
        gold: number;
        tickets: number;
        diamonds: number;
        tokens: Record<SkillName, number>;
    },
    discountMult: number = 1
): {
    canPurchase: boolean;
    canUnlock: boolean;
    missingRequirements: string[];
    missingCurrency: string[];
} {
    // Check unlock requirements
    const unlockCheck = checkUnlockRequirements(item.unlockRequirement, playerState);
    const missingCurrency: string[] = [];

    // Check currency requirements
    if (item.cost.gold) {
        const discountedGold = Math.max(1, Math.floor(item.cost.gold * discountMult));
        if (currencyState.gold < discountedGold) {
            missingCurrency.push(`${discountedGold - currencyState.gold} Gold`);
        }
    }
    if (item.cost.tickets && currencyState.tickets < item.cost.tickets) {
        missingCurrency.push(`${item.cost.tickets - currencyState.tickets} Tickets`);
    }
    if (item.cost.diamonds && currencyState.diamonds < item.cost.diamonds) {
        missingCurrency.push(`${item.cost.diamonds - currencyState.diamonds} Diamonds`);
    }
    if (item.cost.tokens) {
        for (const [skill, amount] of Object.entries(item.cost.tokens)) {
            const playerTokens = currencyState.tokens[skill as SkillName];
            if (playerTokens < amount) {
                missingCurrency.push(`${amount - playerTokens} ${skill} Tokens`);
            }
        }
    }

    return {
        canPurchase: unlockCheck.canUnlock && missingCurrency.length === 0,
        canUnlock: unlockCheck.canUnlock,
        missingRequirements: unlockCheck.missingRequirements,
        missingCurrency,
    };
}
