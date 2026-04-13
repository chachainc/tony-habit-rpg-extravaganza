import { StoreLayout } from './StoreLayout';
import { ItemCard } from './ItemCard';
import { useGameStore } from '../../../store/useGameStore';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { useInventoryStore } from '../../../store/useInventoryStore';
import { useSoundStore } from '../../../store/useSoundStore';
import { ITEM_DATABASE, type Item } from '../../../data/items';
import { canPurchaseItem } from '../../../data/unlocks';
import { useState, useCallback } from 'react';
import { PurchaseConfirmModal } from '../../../components/ui/PurchaseConfirmModal';
import { PurchaseSuccessOverlay } from '../../../components/ui/PurchaseSuccessOverlay';
import weaponStoreBg from '../../../assets/backgrounds/weapon_store.png';
import { Search, Filter } from 'lucide-react';
import './WeaponStore.css';


interface Props {
    onClose: () => void;
}

// Weapon items (gated by Attack stat)
const WEAPON_ITEMS = [
    'wooden_stick',
    'iron_sword',
    'steel_blade',
    'enchanted_axe',
    'legendary_hammer',
    'flame_blade',
    'moltenblade',
    'glacial_hammer',
    'void_dagger',
    'golden_ledger',
    'diceblade',
];

const EVOLUTIONS: Record<string, {
    targetId: string;
    metric: keyof import('../../../store/useWeaponProgressionStore').WeaponMetrics;
    threshold: number;
    legendaryCoreId: string;
}> = {
    'moltenblade': { targetId: 'infernal_coreblade', metric: 'burnDamageDealt', threshold: 500, legendaryCoreId: 'infernal_core' },
    'glacial_hammer': { targetId: 'frost_titan_breaker', metric: 'chilledEnemiesApplied', threshold: 50, legendaryCoreId: 'frost_titan_core' },
    'void_dagger': { targetId: 'abyss_render', metric: 'critsHits', threshold: 100, legendaryCoreId: 'abyss_core' },
    'golden_ledger': { targetId: 'sovereign_ledger', metric: 'enemiesKilled', threshold: 50, legendaryCoreId: 'sovereign_core' },
    'diceblade': { targetId: 'chaos_edge', metric: 'diceRolled', threshold: 100, legendaryCoreId: 'chaos_core' },
};

export const WeaponStore = ({ onClose }: Props) => {
    const { skills } = useGameStore();
    const currencyStore = useCurrencyStore();
    const { ownsMarketplaceItem, purchaseMarketplaceItem, marketplaceOwned } = useInventoryStore();
    const { playPurchaseSound, playSuccessSound, playUnlockSound } = useSoundStore();

    // Modal state
    const [confirmItem, setConfirmItem] = useState<Item | null>(null);
    const [successItem, setSuccessItem] = useState<Item | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'all' | 'unowned'>('all');
    const [activeAffinity, setActiveAffinity] = useState<'all' | 'fire' | 'ice' | 'shadow' | 'economy' | 'luck' | 'neutral'>('all');
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Calculate player's attack stat from skills
    const calculateAttack = () => {
        const strength = skills.Strength?.level || 1;
        const flexibility = skills.Flexibility?.level || 1;
        const cardio = skills.Cardio?.level || 1;
        return Math.floor((strength + flexibility + cardio) / 3 * 0.5);
    };

    const playerAttack = calculateAttack();

    const handlePurchaseClick = (itemId: string) => {
        const item = ITEM_DATABASE[itemId];
        if (!item) return;
        setConfirmItem(item);
    };

    const handleConfirmPurchase = useCallback(() => {
        if (!confirmItem) return;

        const success = purchaseMarketplaceItem(confirmItem.id);

        if (success) {
            playPurchaseSound();
            if (confirmItem.rarity === 'rare' || confirmItem.rarity === 'epic' || confirmItem.rarity === 'legendary') {
                playUnlockSound();
            }

            setSuccessItem(confirmItem);
            setShowSuccess(true);
        }

        setConfirmItem(null);
    }, [confirmItem, purchaseMarketplaceItem, playPurchaseSound, playUnlockSound]);

    const handleCancelPurchase = () => {
        setConfirmItem(null);
    };

    const handleSuccessComplete = useCallback(() => {
        playSuccessSound();
        setShowSuccess(false);
        setSuccessItem(null);
    }, [playSuccessSound]);

    const ownedCount = WEAPON_ITEMS.filter(id => ownsMarketplaceItem(id)).length;

    const filteredItems = WEAPON_ITEMS.filter((itemId) => {
        const item = ITEM_DATABASE[itemId];
        if (!item) return false;

        // Affinity filter
        if (activeAffinity !== 'all') {
            const itemAffinity = item.affinity || 'neutral';
            if (itemAffinity !== activeAffinity) return false;
        }

        // Search filter (within active affinity)
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // Category filter
        if (activeCategory === 'unowned' && ownsMarketplaceItem(itemId)) {
            return false;
        }

        return true;
    }).sort((a, b) => {
        const itemA = ITEM_DATABASE[a];
        const itemB = ITEM_DATABASE[b];
        return (itemA?.cost.gold || 0) - (itemB?.cost.gold || 0);
    });

    const AFFINITY_TABS = [
        { id: 'all', label: 'All', icon: '' },
        { id: 'fire', label: 'Fire', icon: '🔥' },
        { id: 'ice', label: 'Ice', icon: '❄️' },
        { id: 'shadow', label: 'Shadow', icon: '🌑' },
        { id: 'economy', label: 'Economy', icon: '💰' },
        { id: 'luck', label: 'Luck', icon: '🍀' },
        { id: 'neutral', label: 'Neutral', icon: '🛡️' },
    ] as const;

    const topBar = (
        <div className="store-search-bar" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            <div style={{ display: 'flex', width: '100%', gap: '0.5rem' }}>
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder="Search weapons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="store-search-input"
                />
                <button
                    className="mobile-filter-toggle mobile-only"
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                >
                    <Filter size={18} />
                </button>
            </div>
            {/* Affinity Tabs - Horizontal Scroll */}
            <div className="affinity-tabs-scroll" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none' }}>
                {AFFINITY_TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`filter-tab ${activeAffinity === tab.id ? 'active' : ''}`}
                        style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={() => setActiveAffinity(tab.id as any)}
                    >
                        {tab.icon && <span>{tab.icon}</span>}
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );

    const bottomSheet = showMobileFilters ? (
        <div className="store-mobile-filters">
            <div className="filter-header">
                <h3>Filters</h3>
                <button onClick={() => setShowMobileFilters(false)}>Done</button>
            </div>
            <div className="filter-options">
                <button
                    className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveCategory('all')}
                >
                    All Items
                </button>
                <button
                    className={`filter-btn ${activeCategory === 'unowned' ? 'active' : ''}`}
                    onClick={() => setActiveCategory('unowned')}
                >
                    Unowned Only
                </button>
            </div>
        </div>
    ) : null;

    return (
        <>
            <StoreLayout
                storeName="Weapon Shop"
                storeIcon="⚔️"
                storeColor="#ef4444"
                onClose={onClose}
                backgroundImage={weaponStoreBg}
                glowPoints={[
                    { x: 25, y: 30, color: '#ff4444', intensity: 1.2 },
                    { x: 75, y: 30, color: '#ff4444', intensity: 1.2 },
                ]}
                topBar={topBar}
                bottomSheet={bottomSheet}
            >
                {/* Weapon Shop */}
                <div className="weapon-store">
                    <div className="store-section desktop-only">
                        <div className="filter-tabs">
                            <button
                                className={`filter-tab ${activeCategory === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveCategory('all')}
                            >
                                All Items
                            </button>
                            <button
                                className={`filter-tab ${activeCategory === 'unowned' ? 'active' : ''}`}
                                onClick={() => setActiveCategory('unowned')}
                            >
                                Unowned Only
                            </button>
                        </div>
                    </div>
                
                    <div className="store-section">
                        <h3 className="section-title">Weapons & Arms</h3>
                        <p className="section-description">
                            Unlock powerful weapons by increasing your Attack stat. Stronger weapons help you defeat tougher enemies!
                        </p>
                        <div className="player-stats">
                            <span className="stat-badge">⚔️ Your Attack: {playerAttack}</span>
                            <span className="stat-badge">🗡️ Weapons Owned: {ownedCount}</span>
                        </div>

                        {filteredItems.length === 0 ? (
                            <div className="empty-state">No items found matching your criteria.</div>
                        ) : (
                            <div className="items-grid">
                                {filteredItems.map((itemId) => {
                                    const item = ITEM_DATABASE[itemId];
                                    if (!item) return null;

                                    const playerState = {
                                        skills,
                                        defense: 0,
                                        attack: playerAttack,
                                        ownedItems: marketplaceOwned,
                                    };

                                    const purchaseCheck = canPurchaseItem(item, playerState, currencyStore);
                                    const isOwned = ownsMarketplaceItem(itemId);
                                    const evolution = EVOLUTIONS[itemId];
                                    let evolveNode: React.ReactNode = undefined;

                                    if (isOwned && evolution) {
                                        // We will do a safe sync read here because we are in React render context!
                                        const { useWeaponProgressionStore } = require('../../../store/useWeaponProgressionStore');
                                        const val = useWeaponProgressionStore.getState().getMetric(itemId, evolution.metric) || 0;
                                        const hasCore = useInventoryStore.getState().items[evolution.legendaryCoreId] > 0;
                                        const hasGold = currencyStore.gold >= 500;
                                        const canEvolve = val >= evolution.threshold && hasCore && hasGold;

                                        const percent = Math.min(100, Math.floor((val / evolution.threshold) * 100));

                                        evolveNode = (
                                            <button 
                                                className={`item-btn ${canEvolve ? 'item-btn--purchase' : 'item-btn--expensive'}`}
                                                disabled={!canEvolve}
                                                onClick={() => {
                                                    if (canEvolve) {
                                                        // Consume gold + core
                                                        currencyStore.spendGold(500);
                                                        useInventoryStore.getState().removeItem(evolution.legendaryCoreId, 1);
                                                        // Evolve!
                                                        useInventoryStore.getState().removeItem(itemId, 1);
                                                        useInventoryStore.getState().purchaseMarketplaceItem(evolution.targetId);
                                                        
                                                        // Success
                                                        setSuccessItem(ITEM_DATABASE[evolution.targetId]);
                                                        setShowSuccess(true);
                                                        playUnlockSound();
                                                    }
                                                }}
                                            >
                                                <span style={{ fontSize: '0.85em' }}>
                                                    {canEvolve ? '✨ Evolve (500g)' : `Milestone: ${percent}%`}
                                                </span>
                                            </button>
                                        );
                                    }

                                    return (
                                        <ItemCard
                                            key={itemId}
                                            item={item}
                                            isUnlocked={purchaseCheck.canUnlock}
                                            isOwned={isOwned}
                                            canAfford={purchaseCheck.missingCurrency.length === 0}
                                            missingRequirements={purchaseCheck.missingRequirements}
                                            missingCurrency={purchaseCheck.missingCurrency}
                                            onPurchase={() => handlePurchaseClick(itemId)}
                                            evolveNode={evolveNode}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        </div>

                        <div className="store-info">
                            <div className="info-card">
                                <h4>💪 How to Increase Attack</h4>
                                <p>Your Attack stat is calculated from:</p>
                                <ul>
                                    <li><strong>Strength</strong> - Weightlifting, resistance training</li>
                                    <li><strong>Flexibility</strong> - Stretching, yoga</li>
                                    <li><strong>Cardio</strong> - Running, cycling, swimming</li>
                                </ul>
                                <p className="formula">Attack = Average(Strength, Flexibility, Cardio) × 0.5</p>
                            </div>
                        </div>
                    </div>
            </StoreLayout>

            {/* Purchase Confirmation Modal */}
            {confirmItem && (
                <PurchaseConfirmModal
                    item={confirmItem}
                    isOpen={!!confirmItem}
                    onConfirm={handleConfirmPurchase}
                    onCancel={handleCancelPurchase}
                />
            )}

            {/* Success Overlay */}
            <PurchaseSuccessOverlay
                item={successItem}
                isVisible={showSuccess}
                onComplete={handleSuccessComplete}
            />
        </>
    );
};
