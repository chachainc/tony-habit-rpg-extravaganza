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
import hospitalBg from '../../../assets/backgrounds/hospital.png';
import './HospitalStore.css';

interface Props {
    onClose: () => void;
}

// Hospital/First Aid store items
const HOSPITAL_ITEMS = [
    'consumable_streak_shield',
    'consumable_monopoly_refresh',
    'consumable_xp_boost',
];

export const HospitalStore = ({ onClose }: Props) => {
    const { skills } = useGameStore();
    const currencyStore = useCurrencyStore();
    const { purchaseMarketplaceItem, marketplaceOwned } = useInventoryStore();
    const { playPurchaseSound, playSuccessSound } = useSoundStore();

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
            
            // Instantly apply monopoly refresh effect
            if (confirmItem.id === 'consumable_monopoly_refresh') {
                import('../../../store/useMonopolyStore').then(({ useMonopolyStore }) => {
                    useMonopolyStore.getState().addDailyTickets(5);
                });
            }

            setSuccessItem(confirmItem);
            setShowSuccess(true);
        }

        setConfirmItem(null);
    }, [confirmItem, purchaseMarketplaceItem, playPurchaseSound]);

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
                storeName="First Aid"
                storeIcon="⚕️"
                storeColor="#06b6d4"
                onClose={onClose}
                backgroundImage={hospitalBg}
                glowPoints={[
                    { x: 50, y: 40, color: '#fbbf24', intensity: 1.5 },
                    { x: 30, y: 20, color: '#38bdf8', intensity: 0.8 },
                    { x: 70, y: 20, color: '#38bdf8', intensity: 0.8 },
                ]}
            >
                <div className="store-section">
                    <h3 className="section-title">Consumables & Buffs</h3>
                    <p className="section-description">
                        Stock up on health potions, stabilizers, and special utilities. Consumables can be purchased multiple times!
                    </p>

                    <div className="items-grid">
                        {HOSPITAL_ITEMS.map((itemId) => {
                            const item = ITEM_DATABASE[itemId];
                            if (!item) return null;

                            const playerState = {
                                skills,
                                defense: 0,
                                attack: 0,
                                ownedItems: marketplaceOwned,
                            };

                            const purchaseCheck = canPurchaseItem(item, playerState, currencyStore);

                            // Consumables always show as "not owned" since they can be bought multiple times
                            return (
                                <ItemCard
                                    key={itemId}
                                    item={item}
                                    isUnlocked={purchaseCheck.canUnlock}
                                    isOwned={false}
                                    canAfford={purchaseCheck.missingCurrency.length === 0}
                                    missingRequirements={purchaseCheck.missingRequirements}
                                    missingCurrency={purchaseCheck.missingCurrency}
                                    onPurchase={() => handlePurchaseClick(itemId)}
                                />
                            );
                        })}
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
