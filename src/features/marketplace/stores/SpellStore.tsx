import { motion } from 'framer-motion';
import { Sparkles, Check, Coins } from 'lucide-react';
import { StoreLayout } from './StoreLayout';
import { useMagicStore, SPELL_DB, type Spell } from '../../../store/useMagicStore';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { useGameStore } from '../../../store/useGameStore';
import spellStoreBg from '../../../assets/backgrounds/spell_store.png';
import './SpellStore.css';

interface Props {
    onClose: () => void;
}

const SpellCard = ({ spell, isOwned, canAfford, onBuy }: {
    spell: Spell;
    isOwned: boolean;
    canAfford: boolean;
    onBuy: () => void;
}) => {
    const getEffectDescription = () => {
        switch (spell.effect.type) {
            case 'heal':
                return `Restores ${spell.effect.value}% HP`;
            case 'damage':
                return `${spell.effect.value}x Magic ATK damage`;
            case 'shield':
                return `Absorbs damage for ${spell.effect.value} turns`;
            default:
                return '';
        }
    };

    return (
        <motion.div
            className={`spell-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'cannot-afford' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={!isOwned ? { scale: 1.02, y: -4 } : {}}
        >
            <div className="spell-icon-wrap">
                <span className="spell-icon">{spell.icon}</span>
                {spell.effect.element && (
                    <span className={`element-badge ${spell.effect.element}`}>
                        {spell.effect.element === 'fire' && '🔥'}
                        {spell.effect.element === 'ice' && '❄️'}
                        {spell.effect.element === 'lightning' && '⚡'}
                    </span>
                )}
            </div>

            <div className="spell-info">
                <h3 className="spell-name">{spell.name}</h3>
                <p className="spell-description">{spell.description}</p>
                <div className="spell-stats">
                    <span className="spell-effect">{getEffectDescription()}</span>
                    <span className="spell-mp-cost">💧 {spell.mpCost} MP</span>
                </div>
            </div>

            <div className="spell-actions">
                {isOwned ? (
                    <div className="owned-badge">
                        <Check size={16} />
                        Owned
                    </div>
                ) : (
                    <button
                        className="buy-btn"
                        onClick={onBuy}
                        disabled={!canAfford}
                    >
                        <Coins size={16} />
                        {spell.goldCost}g
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export const SpellStore = ({ onClose }: Props) => {
    const { buySpell, hasSpell, canAffordSpell } = useMagicStore();
    const { gold } = useCurrencyStore();
    const { skills, getMagicAttack, getMaxMP } = useGameStore();

    const allSpells = Object.values(SPELL_DB);
    const ownedCount = allSpells.filter(s => hasSpell(s.id)).length;

    const handleBuySpell = (spellId: string) => {
        const success = buySpell(spellId);
        if (success) {
            // Could add a celebration effect here
        }
    };

    return (
        <StoreLayout
            storeName="Arcane Emporium"
            storeIcon="✨"
            storeColor="#8b5cf6"
            onClose={onClose}
            backgroundImage={spellStoreBg}
            glowPoints={[
                { x: 35, y: 30, color: '#a855f7', intensity: 1.4 },
                { x: 65, y: 25, color: '#38bdf8', intensity: 1.2 },
                { x: 50, y: 50, color: '#c084fc', intensity: 1.0 },
            ]}
        >
            {/* Stats Bar */}
            <div className="magic-stats-bar">
                <div className="magic-stat">
                    <span className="stat-icon">🧠</span>
                    <span className="stat-label">Intelligence</span>
                    <span className="stat-value">Lv. {skills['Intelligence'].level}</span>
                </div>
                <div className="magic-stat">
                    <span className="stat-icon">✨</span>
                    <span className="stat-label">Magic ATK</span>
                    <span className="stat-value">{getMagicAttack()}</span>
                </div>
                <div className="magic-stat">
                    <span className="stat-icon">💧</span>
                    <span className="stat-label">Max MP</span>
                    <span className="stat-value">{getMaxMP()}</span>
                </div>
                <div className="magic-stat">
                    <span className="stat-icon">💰</span>
                    <span className="stat-label">Gold</span>
                    <span className="stat-value">{gold.toLocaleString()}</span>
                </div>
            </div>

            {/* Collection Progress */}
            <div className="collection-progress">
                <Sparkles size={18} />
                <span>Spells Learned: {ownedCount} / {allSpells.length}</span>
            </div>

            {/* Spell Grid */}
            <div className="spells-grid">
                {allSpells.map((spell) => (
                    <SpellCard
                        key={spell.id}
                        spell={spell}
                        isOwned={hasSpell(spell.id)}
                        canAfford={canAffordSpell(spell.id)}
                        onBuy={() => handleBuySpell(spell.id)}
                    />
                ))}
            </div>

            {/* Info Section */}
            <div className="spell-info-section">
                <h4>📖 How Spells Work</h4>
                <ul>
                    <li><strong>Purchase:</strong> Buy spells with gold (one-time cost)</li>
                    <li><strong>Cast in Battle:</strong> Use the "Spells" button in Arena</li>
                    <li><strong>MP Cost:</strong> Each spell costs MP to cast</li>
                    <li><strong>Intelligence:</strong> Level up by reading books to increase Magic ATK and Max MP</li>
                </ul>
            </div>
        </StoreLayout>
    );
};
