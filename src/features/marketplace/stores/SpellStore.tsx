import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';
import { CurrencyIcon } from '../../../components/ui/CurrencyIcon';
import { StoreLayout } from './StoreLayout';
import { useMagicStore, SPELL_DB, type Spell } from '../../../store/useMagicStore';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { useGameStore } from '../../../store/useGameStore';
import spellStoreBg from '../../../assets/backgrounds/spell_store.png';
import './SpellStore.css';

interface Props {
    onClose: () => void;
}

const TIER_ORDER: Array<Spell['tier']> = ['novice', 'apprentice', 'adept', 'master', 'old'];
const TIER_LABELS: Record<string, string> = {
    novice: '⚡ Novice Spells',
    apprentice: '🔥 Apprentice Spells',
    adept: '🌩️ Adept Spells',
    master: '💀 Master Spells',
    old: '📜 Old Spells',
};
const TIER_COLORS: Record<string, string> = {
    novice: '#22c55e',
    apprentice: '#f59e0b',
    adept: '#3b82f6',
    master: '#a855f7',
    old: '#6b7280',
};

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
                return spell.baseDamage !== undefined && spell.tier !== 'old'
                    ? `Base Damage: ${spell.baseDamage}`
                    : `${spell.effect.value}x Magic ATK damage`;
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
                    {(spell.cooldownTurns ?? 0) > 0 ? (
                        <span className="spell-cooldown">⏳ Cooldown: {spell.cooldownTurns} turn{spell.cooldownTurns !== 1 ? 's' : ''}</span>
                    ) : (
                        <span className="spell-cooldown" style={{ opacity: 0.5 }}>⏳ No cooldown</span>
                    )}
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
                        <CurrencyIcon currencyType="gold" size={16} />
                        {spell.goldCost.toLocaleString()}g
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export const SpellStore = ({ onClose }: Props) => {
    const { buySpell, hasSpell, canAffordSpell, equipSpell } = useMagicStore();
    const { gold } = useCurrencyStore();
    const { skills, getMagicAttack, getMaxMP } = useGameStore();
    
    const [showEquipPrompt, setShowEquipPrompt] = useState<string | null>(null);

    const allSpells = Object.values(SPELL_DB);
    const ownedCount = allSpells.filter(s => hasSpell(s.id)).length;

    const handleBuySpell = (spellId: string) => {
        const spell = SPELL_DB[spellId];
        if (spell && gold >= spell.goldCost && !hasSpell(spellId)) {
            buySpell(spellId);
            setShowEquipPrompt(spellId);
        }
    };

    // Group spells by tier
    const spellsByTier: Record<string, Spell[]> = {};
    for (const tier of TIER_ORDER) {
        spellsByTier[tier as string] = allSpells.filter(s => (s.tier ?? 'old') === tier);
    }

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
                    <span className="stat-icon"><CurrencyIcon currencyType="gold" size={16} /></span>
                    <span className="stat-label">Gold</span>
                    <span className="stat-value">{gold.toLocaleString()}</span>
                </div>
            </div>

            {/* Collection Progress */}
            <div className="collection-progress">
                <Sparkles size={18} />
                <span>Spells Learned: {ownedCount} / {allSpells.length}</span>
            </div>

            {/* Spell Grid — Grouped by tier */}
            {TIER_ORDER.map(tier => {
                const tierSpells = spellsByTier[tier as string];
                if (!tierSpells || tierSpells.length === 0) return null;
                return (
                    <div key={tier} className="spell-tier-section">
                        <div
                            className="spell-tier-header"
                            style={{ borderLeftColor: TIER_COLORS[tier as string] ?? '#6b7280', color: TIER_COLORS[tier as string] ?? '#6b7280' }}
                        >
                            {TIER_LABELS[tier as string] ?? tier}
                        </div>
                        <div className="spells-grid">
                            {tierSpells.map((spell) => (
                                <SpellCard
                                    key={spell.id}
                                    spell={spell}
                                    isOwned={hasSpell(spell.id)}
                                    canAfford={canAffordSpell(spell.id)}
                                    onBuy={() => handleBuySpell(spell.id)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Info Section */}
            <div className="spell-info-section">
                <h4>📖 How Spells Work</h4>
                <ul>
                    <li><strong>Purchase:</strong> Buy spells with gold (one-time cost)</li>
                    <li><strong>Equip:</strong> Equip your spell in the Character Loadout or the Arena/Conquest battle prep screen</li>
                    <li><strong>Cast in Battle:</strong> Use the Cast Spell button — costs MP and may enter cooldown</li>
                    <li><strong>New Spells:</strong> Use BaseDamage × (1 + Int × 3%). Old Spells use Magic ATK × multiplier</li>
                    <li><strong>Intelligence:</strong> Level up by reading books to increase Magic ATK and Max MP</li>
                </ul>
            </div>

            {/* Equip Prompt Modal */}
            <AnimatePresence>
                {showEquipPrompt && (
                    <motion.div 
                        className="equip-prompt-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div 
                            className="equip-prompt-card"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                        >
                            <div className="equip-prompt-icon">🪄</div>
                            <h3>Spell Acquired!</h3>
                            <p>Do you want to equip <strong>{SPELL_DB[showEquipPrompt]?.name}</strong> now?</p>
                            <div className="equip-prompt-actions">
                                <button 
                                    className="btn-no" 
                                    onClick={() => setShowEquipPrompt(null)}
                                >
                                    No Thanks
                                </button>
                                <button 
                                    className="btn-yes" 
                                    onClick={() => {
                                        equipSpell(showEquipPrompt);
                                        setShowEquipPrompt(null);
                                    }}
                                >
                                    Equip Spell
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </StoreLayout>
    );
};
