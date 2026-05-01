import { StoreLayout } from './StoreLayout';
import { ItemCard } from './ItemCard';
import { useGameStore } from '../../../store/useGameStore';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { useInventoryStore } from '../../../store/useInventoryStore';
import { useSoundStore } from '../../../store/useSoundStore';
import { getPassiveBonuses } from '../../../store/usePassiveEffects';
import { ITEM_DATABASE, getItemsByCategory, type Item } from '../../../data/items';
import { canPurchaseItem } from '../../../data/unlocks';
import { useState, useCallback } from 'react';
import { PurchaseConfirmModal } from '../../../components/ui/PurchaseConfirmModal';
import { PurchaseSuccessOverlay } from '../../../components/ui/PurchaseSuccessOverlay';
import { SeedShopModal } from './SeedShopModal';
import furnitureStoreBg from '../../../assets/backgrounds/furniture_store.png';
import './FurnitureStore.css';

interface Props {
    onClose: () => void;
}

export const FurnitureStore = ({ onClose }: Props) => {
    const { skills } = useGameStore();
    const currencyStore = useCurrencyStore();
    const { ownsMarketplaceItem, purchaseMarketplaceItem, marketplaceOwned } = useInventoryStore();
    const { playPurchaseSound, playSuccessSound, playUnlockSound } = useSoundStore();

    // Discount calculation
    const rawDiscount = skills.Work?.level ? useGameStore.getState().getWorkDiscount() : 0;
    const equipDiscount = getPassiveBonuses().gold_multiplier ?? 0;
    const discountPercent = Math.min(50, rawDiscount + equipDiscount);
    const discountMult = 1 - (discountPercent / 100);

    // Modal state
    const [confirmItem, setConfirmItem] = useState<Item | null>(null);
    const [successItem, setSuccessItem] = useState<Item | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showSeedShop, setShowSeedShop] = useState(false);

    const handlePurchaseClick = (itemId: string) => {
        const item = ITEM_DATABASE[itemId];
        if (!item) return;
        
        const playerState = { skills, defense: 0, attack: 0, ownedItems: marketplaceOwned };
        const purchaseCheck = canPurchaseItem(item, playerState, currencyStore, discountMult);
        
        console.log("Furniture purchase tapped", itemId, "Gold:", currencyStore.gold);
        
        if (purchaseCheck.missingCurrency.length > 0) {
            console.log("Purchase failed: Not enough currency", purchaseCheck.missingCurrency);
            useSoundStore.getState().playErrorSound?.();
            // Could add a toast here if we imported toastStore, but button is disabled anyway
        }

        setConfirmItem(item);
    };

    const handleConfirmPurchase = useCallback(() => {
        if (!confirmItem) return;

        const success = purchaseMarketplaceItem(confirmItem.id);

        if (success) {
            console.log("Purchase successful", confirmItem.id);
            playPurchaseSound();
            if (confirmItem.rarity === 'rare' || confirmItem.rarity === 'epic' || confirmItem.rarity === 'legendary') {
                playUnlockSound();
            }

            setSuccessItem(confirmItem);
            setShowSuccess(true);
        } else {
            console.log("Purchase failed during confirm", confirmItem.id);
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

    // Get furniture by category
    const hygieneItems = getItemsByCategory('hygiene');
    const sleepItems = getItemsByCategory('sleep');

    const hygieneLevel = skills.Hygiene?.level || 1;
    const sleepLevel = skills.Sleep?.level || 1;

    return (
        <>
            <StoreLayout
                storeName="Furniture & Home"
                storeIcon="🏠"
                storeColor="#f59e0b"
                onClose={onClose}
                backgroundImage={furnitureStoreBg}
                topBar={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 1rem' }}>
                        <button 
                            className="seed-shop-buy-btn" 
                            style={{ margin: 0, padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                            onClick={() => setShowSeedShop(true)}
                        >
                            🌱 Premium Seed Shop
                        </button>
                    </div>
                }
                glowPoints={[
                    { x: 20, y: 25, color: '#fbbf24', intensity: 1.0 },
                    { x: 80, y: 45, color: '#fbbf24', intensity: 0.8 },
                ]}
            >
                <div className="furniture-store">
                    {/* Hygiene Furniture Section */}
                    <div className="store-section hygiene-section">
                        <h3 className="section-title">🚿 Hygiene Furniture</h3>
                        <p className="section-description">
                            Upgrade your bathroom with better hygiene furniture. Higher hygiene levels unlock premium items.
                        </p>
                        <div className="player-stats">
                            <span className="stat-badge">🧼 Hygiene Level: {hygieneLevel}</span>
                        </div>

                        <div className="items-grid">
                            {hygieneItems.map((item) => {
                                const playerState = {
                                    skills,
                                    defense: 0,
                                    attack: 0,
                                    ownedItems: marketplaceOwned,
                                };

                                const purchaseCheck = canPurchaseItem(item, playerState, currencyStore, discountMult);
                                const isOwned = ownsMarketplaceItem(item.id);

                                return (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        isUnlocked={purchaseCheck.canUnlock}
                                        isOwned={isOwned}
                                        canAfford={purchaseCheck.missingCurrency.length === 0}
                                        missingRequirements={purchaseCheck.missingRequirements}
                                        missingCurrency={purchaseCheck.missingCurrency}
                                        onPurchase={() => handlePurchaseClick(item.id)}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Sleep Furniture Section */}
                    <div className="store-section sleep-section">
                        <h3 className="section-title">🛏️ Sleep Furniture</h3>
                        <p className="section-description">
                            Improve your sleep quality with comfortable beds and bedroom upgrades.
                        </p>
                        <div className="player-stats">
                            <span className="stat-badge">😴 Sleep Level: {sleepLevel}</span>
                        </div>

                        <div className="items-grid">
                            {sleepItems.map((item) => {
                                const playerState = {
                                    skills,
                                    defense: 0,
                                    attack: 0,
                                    ownedItems: marketplaceOwned,
                                };

                                const purchaseCheck = canPurchaseItem(item, playerState, currencyStore, discountMult);
                                const isOwned = ownsMarketplaceItem(item.id);

                                return (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        isUnlocked={purchaseCheck.canUnlock}
                                        isOwned={isOwned}
                                        canAfford={purchaseCheck.missingCurrency.length === 0}
                                        missingRequirements={purchaseCheck.missingRequirements}
                                        missingCurrency={purchaseCheck.missingCurrency}
                                        onPurchase={() => handlePurchaseClick(item.id)}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="store-info">
                        <div className="info-card">
                            <h4>🏡 About Furniture</h4>
                            <p>Furniture provides passive bonuses to your character:</p>
                            <ul>
                                <li><strong>XP Boosts:</strong> Earn more XP for related skills</li>
                                <li><strong>Defense Bonuses:</strong> Some items increase your Defense stat</li>
                                <li><strong>Visual Upgrades:</strong> See furnishings in your 2D room</li>
                            </ul>
                            <p className="tip">💡 Tip: Higher skill levels unlock better furniture with stronger bonuses!</p>
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

            {showSeedShop && (
                <SeedShopModal onClose={() => setShowSeedShop(false)} />
            )}
        </>
    );
};
