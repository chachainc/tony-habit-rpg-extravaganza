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
import armorStoreBg from '../../../assets/backgrounds/armor_store.png';
import { Search, Filter } from 'lucide-react';
import './ArmorStore.css';

interface Props {
    onClose: () => void;
}

// Armor store items (gated by Defense stat)
const ARMOR_ITEMS = [
    'cloth_tunic',
    'leather_armor',
    'cinder_crown',
    'studded_leather',
    'embergrip_gauntlets',
    'chainmail',
    'coalwake_boots',
    'iron_platebody',
    'moltenstride_leggings',
    'flameveil_cloak',
    'steel_plate',
    'ashforge_plate',
    'mythric_plate',
    'frostbound_helm',
    'frostbound_chestplate',
    'frostbound_gauntlets',
    'frostbound_leggings',
    'frostbound_boots',
    'frostbound_cloak',
];

export const ArmorStore = ({ onClose }: Props) => {
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
    const [activeAffinity, setActiveAffinity] = useState<'all' | 'fire' | 'ice' | 'shadow'>('all');
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const getDefense = useGameStore(state => state.getDefense);
    const playerDefense = getDefense();

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

    const filteredItems = ARMOR_ITEMS.filter((itemId) => {
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
    ] as const;

    const topBar = (
        <div className="store-search-bar" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            <div style={{ display: 'flex', width: '100%', gap: '0.5rem' }}>
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder="Search armor..."
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
            <div className="affinity-tabs-scroll">
                {AFFINITY_TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`filter-tab ${activeAffinity === tab.id ? 'active' : ''}`}
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
                storeName="Armor & Clothing"
                storeIcon="👕"
                storeColor="#8b5cf6"
                onClose={onClose}
                backgroundImage={armorStoreBg}
                glowPoints={[
                    { x: 30, y: 40, color: '#ff6600', intensity: 1.5 },
                    { x: 70, y: 35, color: '#ff4400', intensity: 1.2 },
                ]}
                topBar={topBar}
                bottomSheet={bottomSheet}
            >
                <div className="armor-store">
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
                        <h3 className="section-title">Protective Gear</h3>
                        <p className="section-description">
                            Upgrade your defense with better armor. Higher defense unlocks stronger protection.
                        </p>
                        <div className="player-stats">
                            <span className="stat-badge">🛡️ Your Defense: {playerDefense}</span>
                        </div>

                        {filteredItems.length === 0 ? (
                            <div className="empty-state">
                                {activeAffinity !== 'all' && !searchQuery
                                    ? `No ${AFFINITY_TABS.find(t => t.id === activeAffinity)?.label || ''} armor available yet.`
                                    : "No items found matching your criteria."}
                            </div>
                        ) : (
                            <div className="items-grid">
                                {filteredItems.map((itemId) => {
                                    const item = ITEM_DATABASE[itemId];
                                    if (!item) return null;

                                    const playerState = {
                                        skills,
                                        defense: playerDefense,
                                        attack: 0,
                                        ownedItems: marketplaceOwned,
                                    };

                                    const purchaseCheck = canPurchaseItem(item, playerState, currencyStore);
                                    const isOwned = ownsMarketplaceItem(itemId);

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
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="store-section cosmetics-section">
                        <h3 className="section-title">Color Variants</h3>
                        <p className="section-description">
                            Customize your armor with different colors (Coming Soon)
                        </p>
                        <div className="coming-soon-badge">
                            🎨 Color variants unlock after owning base armor
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
