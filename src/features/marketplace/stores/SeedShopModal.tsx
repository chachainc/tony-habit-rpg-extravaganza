import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Unlock } from 'lucide-react';
import { SEEDS, useGardenStore } from '../../../store/useGardenStore';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { useSoundStore } from '../../../store/useSoundStore';
import { Coins } from 'lucide-react';
import { PurchaseSuccessOverlay } from '../../../components/ui/PurchaseSuccessOverlay';
import './SeedShopModal.css';

interface Props {
    onClose: () => void;
    focusedSeedId?: string;
}

export const SeedShopModal = ({ onClose, focusedSeedId }: Props) => {
    const { gold } = useCurrencyStore();
    const { isSeedUnlocked, purchaseSeedUnlock } = useGardenStore();
    const { playPurchaseSound, playSuccessSound, playUnlockSound } = useSoundStore();

    const [showSuccess, setShowSuccess] = useState(false);
    const [successItemText, setSuccessItemText] = useState('');

    const premiumSeeds = SEEDS.filter(s => s.unlockCost && s.unlockCost > 0);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (focusedSeedId && containerRef.current) {
            const el = document.getElementById(`seed-card-${focusedSeedId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [focusedSeedId]);

    const handleUnlock = (seedId: string, name: string) => {
        const res = purchaseSeedUnlock(seedId);
        if (res.ok) {
            playPurchaseSound();
            playUnlockSound();
            setSuccessItemText(name);
            setShowSuccess(true);
        }
    };

    const handleSuccessComplete = () => {
        playSuccessSound();
        setShowSuccess(false);
    };

    return (
        <div className="seed-shop-overlay" onClick={onClose}>
            <motion.div 
                className="seed-shop-modal" 
                onClick={e => e.stopPropagation()}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
            >
                <div className="seed-shop-header">
                    <h2>🌱 Premium Seed Shop</h2>
                    <p>Unlock exotic seeds permanently for your garden!</p>
                    <button className="seed-shop-close" onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className="seed-shop-balance">
                    <Coins size={16} color="#fbbf24" style={{verticalAlign: 'text-bottom', marginRight: '4px'}}/>
                    <strong>{gold.toLocaleString()} Gold</strong>
                </div>

                <div className="seed-shop-content" ref={containerRef}>
                    {premiumSeeds.map(seed => {
                        const unlocked = isSeedUnlocked(seed.id);
                        const canAfford = gold >= (seed.unlockCost || 0);
                        const hrs = Math.floor(seed.growTimeMs / 3600000);

                        return (
                            <div key={seed.id} id={`seed-card-${seed.id}`} className={`seed-shop-card ${unlocked ? 'unlocked' : ''}`}>
                                <div className="seed-shop-card-icon">{seed.icon}</div>
                                <div className="seed-shop-card-info">
                                    <h3>{seed.name} {unlocked && <Unlock size={14} className="unlock-icon" />}</h3>
                                    
                                    <div className="seed-shop-card-stats">
                                        <span><strong>Unlock:</strong> {seed.unlockCost?.toLocaleString()} Gold</span>
                                        <span><strong>Plant:</strong> {seed.cost.toLocaleString()} Gold</span>
                                        <span><strong>Time:</strong> {hrs}h</span>
                                    </div>
                                    
                                    <div className="seed-shop-card-returns">
                                        <strong>Returns:</strong> {seed.reward.goldReturn.toLocaleString()} Gold
                                        {seed.reward.boxes > 0 && ` • +${seed.reward.boxes} Box${seed.reward.boxes > 1 ? 'es' : ''}`}
                                    </div>
                                    
                                    {unlocked && (
                                        <div className="seed-shop-badge-unlocked">Permanent Unlock Acquired</div>
                                    )}
                                </div>
                                {!unlocked && (
                                    <button 
                                        className={`seed-shop-buy-btn ${!canAfford ? 'disabled' : ''}`}
                                        disabled={!canAfford}
                                        onClick={() => handleUnlock(seed.id, seed.name)}
                                    >
                                        <Lock size={14} style={{ marginRight: '4px' }} />
                                        {canAfford ? 'Unlock' : 'Not Enough Gold'}
                                    </button>
                                )}
                                {unlocked && (
                                    <button className="seed-shop-buy-btn unlocked-btn" disabled>
                                        Unlocked
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Reusing existing purchase success overlay mechanism */}
            <PurchaseSuccessOverlay
                item={showSuccess ? { id: 'dummy', name: successItemText, icon: '🌱', description: 'Permanently unlocked in Garden!', category: 'consumable', price: 0, rarity: 'epic' } as any : null}
                isVisible={showSuccess}
                onComplete={handleSuccessComplete}
            />
        </div>
    );
};
