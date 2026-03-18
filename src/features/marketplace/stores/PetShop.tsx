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
import petShopBg from '../../../assets/backgrounds/pet_shop.png';
import './PetShop.css';

interface Props {
    onClose: () => void;
}

const PET_ITEMS = [
    'pet_cow',
    'pet_porcupine',
    'pet_dog',
    'pet_cat',
    'meditating_war_cow',
    'highland_archer_cow',
    'wizard_cow',
    'cow_king',
];

// Pet accessories (gated by Social level)
const PET_ACCESSORY_ITEMS = [
    'pet_sunglasses',
    'pet_hat',
    'pet_shirt',
];

export const PetShop = ({ onClose }: Props) => {
    const { skills } = useGameStore();
    const currencyStore = useCurrencyStore();
    const { ownsMarketplaceItem, purchaseMarketplaceItem, marketplaceOwned } = useInventoryStore();
    const { playPurchaseSound, playSuccessSound, playUnlockSound } = useSoundStore();

    // Modal state
    const [confirmItem, setConfirmItem] = useState<Item | null>(null);
    const [successItem, setSuccessItem] = useState<Item | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

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

    const socialLevel = skills.Social?.level || 1;
    const petsOwned = PET_ITEMS.filter(id => ownsMarketplaceItem(id)).length;

    return (
        <>
            <StoreLayout
                storeName="Pet Shop"
                storeIcon="🐾"
                storeColor="#10b981"
                onClose={onClose}
                backgroundImage={petShopBg}
                glowPoints={[
                    { x: 50, y: 20, color: '#a855f7', intensity: 1.3 },
                    { x: 80, y: 60, color: '#22c55e', intensity: 1.0 },
                ]}
            >
                <div className="pet-shop">
                    <div className="store-section">
                        <h3 className="section-title">Companion Pets</h3>
                        <p className="section-description">
                            Unlock new pets as you level up your Social skill. Each pet provides unique bonuses!
                        </p>
                        <div className="player-stats">
                            <span className="stat-badge">🤝 Social Level: {socialLevel}</span>
                            <span className="stat-badge">🐾 Owned Pets: {petsOwned}</span>
                        </div>

                        <div className="items-grid">
                            {PET_ITEMS.map((itemId) => {
                                const item = ITEM_DATABASE[itemId];
                                if (!item) return null;

                                const playerState = {
                                    skills,
                                    defense: 0,
                                    attack: 0,
                                    ownedItems: marketplaceOwned,
                                };

                                const purchaseCheck = canPurchaseItem(item, playerState, currencyStore);
                                const isOwned = ownsMarketplaceItem(itemId);

                                // Hidden pets should not be displayed at all until they are unlocked
                                if (itemId === 'cow_king' && !purchaseCheck.canUnlock && !isOwned) {
                                    return null;
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
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <div className="store-section accessories-section">
                        <h3 className="section-title">Pet Accessories</h3>
                        <p className="section-description">
                            Customize your pet with stylish accessories
                        </p>

                        <div className="items-grid">
                            {PET_ACCESSORY_ITEMS.map((itemId) => {
                                const item = ITEM_DATABASE[itemId];
                                if (!item) return null;

                                const playerState = {
                                    skills,
                                    defense: 0,
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
