import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Lock, Sword, Zap } from 'lucide-react';
import {
    useXpWeaponStore,
    XP_WEAPONS,
    TIER_ORDER,
    TIER_LABELS,
    TIER_COLORS,
    type WeaponTier,
    type XpWeaponDef,
} from '../../store/useXpWeaponStore';
import { useGameStore } from '../../store/useGameStore';
import './XpWeaponsStore.css';

export const XpWeaponsStore = () => {
    const { equippedWeaponId, unlockedWeaponIds, purchaseWeapon, equipWeapon, canAfford } = useXpWeaponStore();
    const { skills } = useGameStore();

    const [activeTier, setActiveTier] = useState<WeaponTier>('beginner');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 2800);
    };

    const handlePurchase = (weapon: XpWeaponDef) => {
        const { success, reason } = purchaseWeapon(weapon.id);
        if (success) {
            showToast(`✅ ${weapon.name} unlocked!`, true);
        } else {
            showToast(`❌ ${reason}`, false);
        }
    };

    const handleEquip = (id: string) => {
        if (equippedWeaponId === id) {
            equipWeapon(null);
            showToast('Weapon unequipped', true);
        } else {
            equipWeapon(id);
            const name = XP_WEAPONS.find(w => w.id === id)?.name ?? '';
            showToast(`⚔️ ${name} equipped!`, true);
        }
    };

    const tierWeapons = XP_WEAPONS.filter(w => w.tier === activeTier);
    const tierColor = TIER_COLORS[activeTier];

    return (
        <div className="xpw-store">
            {/* Header */}
            <div className="xpw-header">
                <Sword size={22} />
                <div>
                    <h2 className="xpw-title">⚔️ Weapons Forge</h2>
                    <p className="xpw-subtitle">Spend your skill XP to forge legendary weapons</p>
                </div>
            </div>

            {/* Tier tabs */}
            <div className="xpw-tier-tabs">
                {TIER_ORDER.map(tier => (
                    <button
                        key={tier}
                        className={`xpw-tier-tab ${activeTier === tier ? 'active' : ''}`}
                        style={activeTier === tier ? { borderBottomColor: TIER_COLORS[tier], color: TIER_COLORS[tier] } : {}}
                        onClick={() => setActiveTier(tier)}
                    >
                        {TIER_LABELS[tier]}
                    </button>
                ))}
            </div>

            {/* Weapon grid */}
            <div className="xpw-grid">
                {tierWeapons.map(weapon => {
                    const owned = unlockedWeaponIds.includes(weapon.id);
                    const equipped = equippedWeaponId === weapon.id;
                    const affordable = canAfford(weapon.id);
                    const expanded = expandedId === weapon.id;

                    return (
                        <motion.div
                            key={weapon.id}
                            className={`xpw-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}`}
                            style={{ '--tier-color': tierColor } as React.CSSProperties}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            {/* Equipped badge */}
                            {equipped && <div className="xpw-equipped-badge">EQUIPPED</div>}

                            {/* Top row */}
                            <div className="xpw-card-top" onClick={() => setExpandedId(expanded ? null : weapon.id)}>
                                <span className="xpw-icon">{weapon.icon}</span>
                                <div className="xpw-info">
                                    <span className="xpw-name">{weapon.name}</span>
                                    <span className="xpw-effect">{weapon.effect}</span>
                                </div>
                                {owned
                                    ? <CheckCircle size={18} className="xpw-owned-check" />
                                    : affordable
                                        ? <Zap size={18} className="xpw-affordable-icon" />
                                        : <Lock size={18} className="xpw-lock-icon" />
                                }
                            </div>

                            {/* Expandable cost breakdown */}
                            <AnimatePresence>
                                {expanded && (
                                    <motion.div
                                        className="xpw-costs"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <p className="xpw-costs-label">Skill XP Required:</p>
                                        {weapon.costs.map(cost => {
                                            const have = skills[cost.skill]?.totalXp ?? 0;
                                            const pct = Math.min(100, (have / cost.xp) * 100);
                                            const met = have >= cost.xp;
                                            return (
                                                <div key={cost.skill} className="xpw-cost-row">
                                                    <span className={`xpw-skill-label ${met ? 'met' : 'unmet'}`}>
                                                        {cost.skill}
                                                    </span>
                                                    <div className="xpw-cost-bar">
                                                        <div
                                                            className="xpw-cost-fill"
                                                            style={{
                                                                width: `${pct}%`,
                                                                background: met ? '#22c55e' : tierColor,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className={`xpw-cost-num ${met ? 'met' : 'unmet'}`}>
                                                        {have.toLocaleString()} / {cost.xp.toLocaleString()}
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {/* Buttons */}
                                        <div className="xpw-btn-row">
                                            {owned ? (
                                                <button
                                                    className={`xpw-btn ${equipped ? 'unequip' : 'equip'}`}
                                                    onClick={() => handleEquip(weapon.id)}
                                                >
                                                    {equipped ? '▪ Unequip' : '⚔ Equip'}
                                                </button>
                                            ) : (
                                                <button
                                                    className={`xpw-btn forge ${affordable ? 'affordable' : 'locked'}`}
                                                    disabled={!affordable}
                                                    onClick={() => handlePurchase(weapon)}
                                                    style={affordable ? { background: tierColor } : {}}
                                                >
                                                    {affordable ? '🔥 Forge Weapon' : '🔒 Need More XP'}
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        className={`xpw-toast ${toast.ok ? 'success' : 'error'}`}
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                    >
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
