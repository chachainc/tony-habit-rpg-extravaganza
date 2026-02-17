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
];

export const WeaponStore = ({ onClose }: Props) => {
    const { skills } = useGameStore();
    const currencyStore = useCurrencyStore();
    const { ownsMarketplaceItem, purchaseMarketplaceItem, marketplaceOwned } = useInventoryStore();
    const { playPurchaseSound, playSuccessSound, playUnlockSound } = useSoundStore();

    // Modal state
    const [confirmItem, setConfirmItem] = useState<Item | null>(null);
    const [successItem, setSuccessItem] = useState<Item | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

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
            >
                <div className="weapon-store">
                    <div className="store-section">
                        <h3 className="section-title">Weapons & Arms</h3>
                        <p className="section-description">
                            Unlock powerful weapons by increasing your Attack stat. Stronger weapons help you defeat tougher enemies!
                        </p>
                        <div className="player-stats">
                            <span className="stat-badge">⚔️ Your Attack: {playerAttack}</span>
                            <span className="stat-badge">🗡️ Weapons Owned: {ownedCount}</span>
                        </div>

                        <div className="items-grid">
                            {WEAPON_ITEMS.map((itemId) => {
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
