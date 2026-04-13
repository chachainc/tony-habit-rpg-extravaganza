import React, { useState } from 'react';
import { useGameStore, type SkillName } from '../../store/useGameStore';
import { usePetStore } from '../../store/usePetStore';
import { useEquipmentStore, EQUIPMENT_DB } from '../../store/useEquipmentStore';
import { useMagicStore, SPELL_DB } from '../../store/useMagicStore';
import { useXpWeaponStore } from '../../store/useXpWeaponStore';
import { useInventoryStore, getItemById } from '../../store/useInventoryStore';
import { calculateAffinitySynergy, type AffinityType } from '../../store/useAffinitySystem';
import { Flame, ChevronDown, ChevronUp, Check, X } from 'lucide-react';

const AFFINITY_SOURCES: Record<AffinityType, { skills: SkillName[], label: string, color: string }> = {
    fire: { skills: ['Strength', 'Cardio', 'Health'], label: 'Cardio, Workouts, Health', color: '#ef4444' },
    ice: { skills: ['Sleep', 'Hygiene', 'Flexibility'], label: 'Sleep, Hygiene, Recovery', color: '#3b82f6' },
    shadow: { skills: ['Intelligence', 'Work', 'Social'], label: 'Deep Focus, Intellect, Tasks', color: '#8b5cf6' },
    economy: { skills: ['Housemaid', 'Habit'], label: 'Budget, Chores, Consistency', color: '#10b981' },
    luck: { skills: ['Luck'], label: 'Streak-based Behaviors', color: '#fbbf24' },
    neutral: { skills: [], label: 'All-around Balance', color: '#94a3b8' }
};

export const YourAffinitiesPanel: React.FC = () => {
    const [expanded, setExpanded] = useState<AffinityType | null>(null);
    const { skills, getXpProgress } = useGameStore();

    // Loadout
    const petDef = usePetStore(s => s.getEquippedPetDef());
    
    // Check both XP weapons and marketplace weapons
    const xpWeaponDef = useXpWeaponStore(s => s.getEquippedWeapon());
    const invWeaponId = useInventoryStore(s => s.equipped.weapon);
    const invWeaponDef = invWeaponId ? getItemById(invWeaponId) : null;
    const weaponAffinity = xpWeaponDef?.affinity || invWeaponDef?.affinity;
    const hasWeaponEquipped = !!weaponAffinity;

    const spellDefMagic = useMagicStore(s => s.equippedSpell);
    const equipState = useEquipmentStore();
    const invState = useInventoryStore();

    const armorIds = [
        equipState.equippedArmor, equipState.equippedAccessory, equipState.equippedWeapon,
        invState.equipped.armor, invState.equipped.head, invState.equipped.chest,
        invState.equipped.hands, invState.equipped.legs, invState.equipped.feet, invState.equipped.cloak
    ].filter(Boolean) as string[];
    
    const armorAffinities = armorIds.map(id => EQUIPMENT_DB[id]?.affinity || getItemById(id)?.affinity).filter(Boolean) as AffinityType[];

    const synergy = calculateAffinitySynergy({
        petAffinity: petDef?.affinity,
        weaponAffinity: weaponAffinity,
        spellAffinity: spellDefMagic ? SPELL_DB[spellDefMagic]?.affinity : undefined,
        armorAffinities
    }, []);

    const toggleExpand = (aff: AffinityType) => {
        setExpanded(prev => prev === aff ? null : aff);
    };

    const getAffinityProgress = (affType: AffinityType) => {
        const sources = AFFINITY_SOURCES[affType].skills;
        if (sources.length === 0) return { level: 1, pct: 0 };

        let totalLevel = 0;
        let totalPct = 0;

        sources.forEach(skillName => {
            const skill = skills[skillName];
            if (skill) {
                totalLevel += skill.level;
                const prog = getXpProgress(skillName);
                if (prog.required > 0) {
                    totalPct += (prog.current / prog.required);
                }
            }
        });

        const avgLevel = Math.max(1, Math.floor(totalLevel / sources.length));
        const avgPct = Math.round((totalPct / sources.length) * 100);

        return { level: avgLevel, pct: Math.min(100, Math.max(0, avgPct)) };
    };

    // Filter out neutral for the main display list
    const mainAffinities: AffinityType[] = ['fire', 'ice', 'shadow', 'economy', 'luck'];

    // Determine loadout counts by affinity
    const getLoadoutStatus = (affType: AffinityType) => {
        const hasPet = petDef?.affinity === affType;
        const hasWeapon = weaponAffinity === affType;
        const hasSpell = spellDefMagic && SPELL_DB[spellDefMagic]?.affinity === affType;
        const armorCount = armorAffinities.filter(a => a === affType).length;
        
        return { hasPet, hasWeapon, hasSpell, armorCount };
    };

    return (
        <div className="affinities-dashboard" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
            <h2 className="section-title" style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Flame size={18} /> Your Affinities
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {mainAffinities.map(aff => {
                    const info = AFFINITY_SOURCES[aff];
                    const progress = getAffinityProgress(aff);
                    const isExpanded = expanded === aff;
                    const status = getLoadoutStatus(aff);
                    
                    const isMajor = synergy.majorAffinity === aff && synergy.matchCount > 1;

                    return (
                        <div key={aff} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', overflow: 'hidden', borderLeft: isMajor ? `2px solid ${info.color}` : '2px solid transparent' }}>
                            {/* Header row */}
                            <div 
                                onClick={() => toggleExpand(aff)}
                                style={{ 
                                    padding: '0.75rem 1rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    cursor: 'pointer',
                                    borderLeft: `4px solid ${info.color}`
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <div style={{ fontWeight: 'bold', textTransform: 'capitalize', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {aff}
                                            {isMajor && <span style={{ fontSize: '0.7rem', background: info.color, color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Major</span>}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Lv. {progress.level}</div>
                                    </div>
                                    {/* Inline progress bar */}
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${progress.pct}%`, height: '100%', background: info.color }} />
                                    </div>
                                </div>
                                <div style={{ marginLeft: '1rem', color: '#64748b' }}>
                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.4)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                        
                                        {/* Feeds From */}
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feeds From</div>
                                            <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{info.label}</div>
                                        </div>

                                        {/* Active Bonuses */}
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Bonuses</div>
                                            {isMajor ? (
                                                <div style={{ fontSize: '0.9rem', color: info.color }}>{synergy.matchCount}/3 Full Synergy</div>
                                            ) : (
                                                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>No Major Synergy</div>
                                            )}
                                            {status.armorCount > 0 ? (
                                                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem' }}>+{status.armorCount}% Armor Bonus</div>
                                            ) : (
                                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>0% Armor Bonus</div>
                                            )}
                                        </div>

                                        {/* Loadout Status */}
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Loadout Status</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: status.hasPet ? '#4ade80' : '#64748b' }}>
                                                    {status.hasPet ? <Check size={14} /> : <X size={14} />} Pet
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: status.hasWeapon ? '#4ade80' : '#64748b' }}>
                                                    {status.hasWeapon ? <Check size={14} /> : <X size={14} />} Weapon
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: status.hasSpell ? '#4ade80' : '#64748b' }}>
                                                    {status.hasSpell ? <Check size={14} /> : <X size={14} />} Spell
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: status.armorCount > 0 ? '#4ade80' : '#64748b' }}>
                                                    {status.armorCount > 0 ? <Check size={14} /> : <X size={14} />} Armor ({status.armorCount}/3)
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
