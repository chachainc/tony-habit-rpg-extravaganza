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
import './ArmorStore.css';

interface Props {
    onClose: () => void;
}

// Armor store items (gated by Defense stat)
const ARMOR_ITEMS = [
    'cloth_tunic',
    'leather_armor',
    'studded_leather',
    'chainmail',
    'iron_platebody',
    'steel_plate',
    'mythric_plate',
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

    // Calculate player's defense stat from skills
    const calculateDefense = () => {
        const hygiene = skills.Hygiene?.level || 1;
        const sleep = skills.Sleep?.level || 1;
        const flexibility = skills.Flexibility?.level || 1;
        return Math.floor((hygiene + sleep + flexibility) / 3 * 0.5);
    };

    const playerDefense = calculateDefense();

    const handlePurchaseClick = (itemId: string) => {
        const item = ITEM_DATABASE[itemId];
        if (!item) return;
        setConfirmItem(item);
    };

    const handleConfirmPurchase = useCallback(() => {
        if (!confirmItem) return;

        const success = purchaseMarketplaceItem(confirmItem.id);

        if (success) {
            // Play sounds
            playPurchaseSound();
            if (confirmItem.rarity === 'rare' || confirmItem.rarity === 'epic' || confirmItem.rarity === 'legendary') {
                playUnlockSound();
            }

            // Show success overlay
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
            >
                <div className="armor-store">
                    <div className="store-section">
                        <h3 className="section-title">Protective Gear</h3>
                        <p className="section-description">
                            Upgrade your defense with better armor. Higher defense unlocks stronger protection.
                        </p>
                        <div className="player-stats">
                            <span className="stat-badge">🛡️ Your Defense: {playerDefense}</span>
                        </div>

                        <div className="items-grid">
                            {ARMOR_ITEMS.map((itemId) => {
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
