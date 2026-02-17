// Marketplace town layout configuration
export interface StoreConfig {
    id: string;
    name: string;
    icon: string;
    emoji: string; // For building display
    position: { x: number; y: number }; // Grid position (in tiles)
    description: string;
    color: string; // Glow color
    interactionRadius: number; // Tiles
    inventoryCategories: string[];
}

export interface MarketplaceLayout {
    gridSize: { width: number; height: number }; // In tiles
    tileSize: number; // Pixels per tile
    playerStart: { x: number; y: number };
    stores: StoreConfig[];
    obstacles: Array<{ x: number; y: number }>; // Non-walkable tiles
}

// Marketplace configuration
export const MARKETPLACE_LAYOUT: MarketplaceLayout = {
    gridSize: { width: 20, height: 15 },
    tileSize: 64,
    playerStart: { x: 10, y: 13 }, // Bottom center

    stores: [
        // Top Row
        {
            id: 'armor-store',
            name: 'Armor & Clothing',
            icon: '👕',
            emoji: '👕',
            position: { x: 3, y: 3 },
            description: 'Player armor, pet outfits, and color variants',
            color: '#f59e0b',
            interactionRadius: 2,
            inventoryCategories: ['armor', 'pet-clothing', 'color-variants'],
        },
        {
            id: 'pet-store',
            name: 'Pet Emporium',
            icon: '🐾',
            emoji: '🐾',
            position: { x: 10, y: 3 },
            description: 'New pets, upgrades, and accessories',
            color: '#a855f7',
            interactionRadius: 2,
            inventoryCategories: ['pets', 'pet-accessories', 'pet-food'],
        },
        {
            id: 'weapon-store',
            name: 'Weapon Forge',
            icon: '⚔️',
            emoji: '⚔️',
            position: { x: 17, y: 3 },
            description: 'Weapons that scale with Strength',
            color: '#ef4444',
            interactionRadius: 2,
            inventoryCategories: ['weapons', 'weapon-mods'],
        },

        // Bottom Row
        {
            id: 'furniture-store',
            name: 'Home & Garden',
            icon: '🏠',
            emoji: '🏠',
            position: { x: 5, y: 9 },
            description: 'Furniture and household items',
            color: '#22c55e',
            interactionRadius: 2,
            inventoryCategories: ['hygiene-furniture', 'sleep-furniture', 'decorations'],
        },
        {
            id: 'hospital',
            name: 'First Aid',
            icon: '⚕️',
            emoji: '⚕️',
            position: { x: 15, y: 9 },
            description: 'Consumables, stabilizers, and utilities',
            color: '#06b6d4',
            interactionRadius: 2,
            inventoryCategories: ['consumables', 'buffs', 'utilities'],
        },
        {
            id: 'spell-store',
            name: 'Arcane Emporium',
            icon: '✨',
            emoji: '✨',
            position: { x: 10, y: 11 },
            description: 'Purchase magical spells for battle',
            color: '#8b5cf6',
            interactionRadius: 2,
            inventoryCategories: ['spells'],
        },
    ],

    // Define obstacles (non-walkable tiles) - fountain in center, decorative elements
    obstacles: [
        // Center fountain (3x3)
        { x: 9, y: 7 },
        { x: 10, y: 7 },
        { x: 11, y: 7 },
        { x: 9, y: 8 },
        { x: 10, y: 8 },
        { x: 11, y: 8 },
        { x: 9, y: 9 },
        { x: 10, y: 9 },
        { x: 11, y: 9 },
    ],
};

// Helper to check if a tile is walkable
export function isWalkable(x: number, y: number, layout: MarketplaceLayout): boolean {
    // Check bounds
    if (x < 0 || x >= layout.gridSize.width || y < 0 || y >= layout.gridSize.height) {
        return false;
    }

    // Check obstacles
    if (layout.obstacles.some(obs => obs.x === x && obs.y === y)) {
        return false;
    }

    // Check store buildings (stores occupy a 2x2 area)
    for (const store of layout.stores) {
        const storeX = store.position.x;
        const storeY = store.position.y;

        // Check if position overlaps with store building (2x2)
        if (x >= storeX && x < storeX + 2 && y >= storeY && y < storeY + 2) {
            return false;
        }
    }

    return true;
}

// Calculate distance between two points
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Check if player is within interaction range of a store
export function canInteractWithStore(
    playerX: number,
    playerY: number,
    store: StoreConfig
): boolean {
    // Check distance to any point of the 2x2 building
    for (let dx = 0; dx < 2; dx++) {
        for (let dy = 0; dy < 2; dy++) {
            const distance = getDistance(
                playerX,
                playerY,
                store.position.x + dx,
                store.position.y + dy
            );
            if (distance <= store.interactionRadius) {
                return true;
            }
        }
    }
    return false;
}
