import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Box } from 'lucide-react';
import { useCharacterStore, COSMETICS_DB } from '../../store/useCharacterStore';
import { useEquipmentStore, EQUIPMENT_DB } from '../../store/useEquipmentStore';
import { useInventoryStore, ITEM_DB } from '../../store/useInventoryStore';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { usePetStore } from '../../store/usePetStore';
import { useGameStore } from '../../store/useGameStore';
import type { SkillName } from '../../store/useGameStore';
import { ITEM_DATABASE } from '../../data/items';
import { useHeroImage } from '../../hooks/useHeroImage';
import { useMagicStore, SPELL_DB } from '../../store/useMagicStore';
import './LoadoutPanel.css';

type RadialSlotId = 
    | 'helm' | 'amulet' | 'cape' | 'weapon' | 'body' | 'shield' 
    | 'legs' | 'gloves' | 'boots' | 'ring' | 'pet' | 'pet_accessory' | 'book' 
    | 'artifact' | 'relic' | 'spell';

interface SelectionItem {
    id: string;
    name: string;
    icon: string;
    desc: string;
}

export const LoadoutPanel = ({ onClose }: { onClose: () => void }) => {
    const heroImage = useHeroImage();
    const gameStore = useGameStore();

    // ── Stores ──
    const charStore = useCharacterStore();
    const equipStore = useEquipmentStore();
    const invStore = useInventoryStore();
    const auraStore = useAuraStore();
    const petStore = usePetStore();
    const magicStore = useMagicStore();

    // ── UI State ──
    const [activeSlot, setActiveSlot] = useState<RadialSlotId | null>(null);
    const [statPopups, setStatPopups] = useState<{ id: number; diffAtk: number; diffDef: number; keyAtk: number; keyDef: number }[]>([]);
    
    // Track previous stats to compute diff manually
    const [prevStats, setPrevStats] = useState({ overallAtk: 0, overallDef: 0 });

    // ── Computed Current Equipment Data ──
    // Maps each slot ID to its actual display data from the unified DB stores
    const getSlotData = (slot: RadialSlotId): { icon: string; name: string; emptyIcon: string } => {
        switch (slot) {
            case 'helm':
                const helm = charStore.equipped.head ? COSMETICS_DB[charStore.equipped.head] : null;
                return { icon: helm ? '🪖' : '', name: helm?.name || '', emptyIcon: '⛑️' };
            case 'amulet':
                const amulet = charStore.equipped.accessory ? COSMETICS_DB[charStore.equipped.accessory] : null;
                return { icon: amulet ? '📿' : '', name: amulet?.name || '', emptyIcon: '💍' };
            case 'cape':
                const aura = activeAuraId !== 'none' ? AURAS.find(a => a.id === auraStore.activeAuraId) : null;
                return { icon: aura ? aura.icon : '', name: aura?.name || '', emptyIcon: '✨' };
            case 'weapon':
                const wep = equipStore.equippedWeapon ? EQUIPMENT_DB[equipStore.equippedWeapon] : null;
                return { icon: wep?.icon || '', name: wep?.name || '', emptyIcon: '⚔️' };
            case 'body':
                const body = charStore.equipped.body ? COSMETICS_DB[charStore.equipped.body] : null;
                return { icon: body ? '👕' : '', name: body?.name || '', emptyIcon: '🦺' };
            case 'shield':
                const shield = invStore.equipped.armor ? ITEM_DB[invStore.equipped.armor] : null;
                return { icon: shield?.icon || '', name: shield?.name || '', emptyIcon: '🛡️' };
            case 'legs':
                const legs = charStore.equipped.legs ? COSMETICS_DB[charStore.equipped.legs] : null;
                return { icon: legs ? '👖' : '', name: legs?.name || '', emptyIcon: '🩳' };
            case 'gloves':
                return { icon: '', name: '', emptyIcon: '🧤' }; // Not implemented yet
            case 'boots':
                const boots = charStore.equipped.feet ? COSMETICS_DB[charStore.equipped.feet] : null;
                return { icon: boots ? '👟' : '', name: boots?.name || '', emptyIcon: '👢' };
            case 'ring':
                const ring = equipStore.equippedAccessory ? EQUIPMENT_DB[equipStore.equippedAccessory] : null;
                return { icon: ring?.icon || '', name: ring?.name || '', emptyIcon: '💍' };
            case 'pet':
                const pet = petStore.equippedPetId ? ITEM_DATABASE[petStore.equippedPetId] : null;
                return { icon: pet?.icon || '', name: pet?.name || '', emptyIcon: '🐾' };
            case 'book':
                const book = invStore.equipped.book ? ITEM_DB[invStore.equipped.book] : null;
                return { icon: book?.icon || '', name: book?.name || '', emptyIcon: '📚' };
            case 'artifact':
                const artifact = invStore.equipped.artifact ? ITEM_DB[invStore.equipped.artifact] : null;
                return { icon: artifact?.icon || '', name: artifact?.name || '', emptyIcon: '🔮' };
            case 'relic':
                const relic = invStore.equipped.relic ? ITEM_DB[invStore.equipped.relic] : null;
                return { icon: relic?.icon || '', name: relic?.name || '', emptyIcon: '🏺' };
            case 'pet_accessory':
                const pAcc = invStore.equipped.pet_accessory ? ITEM_DATABASE[invStore.equipped.pet_accessory] : null;
                return { icon: pAcc?.icon || '', name: pAcc?.name || '', emptyIcon: '🎀' };
            case 'spell':
                const spelling = magicStore.equippedSpell ? SPELL_DB[magicStore.equippedSpell] : null;
                return { icon: spelling?.icon || '', name: spelling?.name || '', emptyIcon: '🪄' };
        }
    };
    const activeAuraId = auraStore.activeAuraId;

    // ── Stat Totals Calculations ──
    const compiledStats = useMemo(() => {
        let stats = {
            attack: { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 },
            defense: { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 },
            other: { strength: 0, rng: 0, prayer: 0 },
            overallAtk: 0,
            overallDef: 0
        };

        // EquipmentStore (weapon, armor (not used in loadout shield slot but calculated), accessory)
        const eqBonuses = equipStore.getEquipmentBonuses();
        stats.overallAtk += eqBonuses.atk;
        stats.overallDef += eqBonuses.def;
        stats.attack.slash += eqBonuses.atk;
        stats.defense.slash += eqBonuses.def;

        // InventoryStore (shield, book, artifact, relic)
        const invAtk = invStore.getStatBonus('attack');
        const invDef = invStore.getStatBonus('defense');
        stats.overallAtk += invAtk;
        stats.overallDef += invDef;
        stats.attack.crush += invAtk; // Arbitrary spread for RS flavor
        stats.defense.crush += invDef;
        
        // Aura bonus logic can be mapped here too if any provide flat stats

        return stats;
    }, [equipStore.equippedWeapon, equipStore.equippedAccessory, invStore.equipped, activeAuraId]);

    // ── Floating Stat Feedback Effect ──
    useEffect(() => {
        // Only trigger popups if not the initial mount zero-state tracking
        if (prevStats.overallAtk !== 0 || prevStats.overallDef !== 0) {
            const diffAtk = compiledStats.overallAtk - prevStats.overallAtk;
            const diffDef = compiledStats.overallDef - prevStats.overallDef;
            
            if (diffAtk !== 0 || diffDef !== 0) {
                const id = Date.now();
                setStatPopups(prev => [...prev, { 
                    id, 
                    diffAtk, 
                    diffDef,
                    // Offset key so multiples stagger slightly 
                    keyAtk: id + 1,
                    keyDef: id + 2
                }]);
                
                // Cleanup popup
                setTimeout(() => {
                    setStatPopups(prev => prev.filter(p => p.id !== id));
                }, 1500);
            }
        }
        
        setPrevStats({
            overallAtk: compiledStats.overallAtk,
            overallDef: compiledStats.overallDef
        });
    }, [compiledStats.overallAtk, compiledStats.overallDef]);

    // ── Equipment Sets Logic ──
    const handleSaveSet = (setName: string) => {
        const snapshot: Record<string, string | null> = {
            helm: charStore.equipped.head ?? null,
            body: charStore.equipped.body ?? null,
            legs: charStore.equipped.legs ?? null,
            boots: charStore.equipped.feet ?? null,
            amulet: charStore.equipped.accessory ?? null,
            cape: activeAuraId !== 'none' ? activeAuraId : null,
            weapon: equipStore.equippedWeapon ?? null,
            shield: invStore.equipped.armor ?? null,
            ring: equipStore.equippedAccessory ?? null,
            pet: petStore.equippedPetId ?? null,
            pet_accessory: invStore.equipped.pet_accessory ?? null,
            book: invStore.equipped.book ?? null,
            artifact: invStore.equipped.artifact ?? null,
            relic: invStore.equipped.relic ?? null
        };
        equipStore.saveEquipmentSet(setName, snapshot);
    };

    const handleEquipSet = (setName: string) => {
        const snapshot = equipStore.equipmentSets[setName];
        if (!snapshot) return;

        if (snapshot.helm) charStore.equipItem('head', snapshot.helm); else charStore.unequipItem('head');
        if (snapshot.body) charStore.equipItem('body', snapshot.body); else charStore.unequipItem('body');
        if (snapshot.legs) charStore.equipItem('legs', snapshot.legs); else charStore.unequipItem('legs');
        if (snapshot.boots) charStore.equipItem('feet', snapshot.boots); else charStore.unequipItem('feet');
        if (snapshot.amulet) charStore.equipItem('accessory', snapshot.amulet); else charStore.unequipItem('accessory');
        
        if (snapshot.cape) auraStore.setActiveAura(snapshot.cape); else auraStore.setActiveAura('none');
        
        if (snapshot.weapon) equipStore.equipItem(snapshot.weapon); else equipStore.unequipSlot('weapon');
        if (snapshot.ring) equipStore.equipItem(snapshot.ring); else equipStore.unequipSlot('accessory');
        
        if (snapshot.shield) invStore.equipItem(snapshot.shield, 'armor'); else invStore.unequipItem('armor');
        if (snapshot.book) invStore.equipItem(snapshot.book, 'book'); else invStore.unequipItem('book');
        if (snapshot.artifact) invStore.equipItem(snapshot.artifact, 'artifact'); else invStore.unequipItem('artifact');
        if (snapshot.relic) invStore.equipItem(snapshot.relic, 'relic'); else invStore.unequipItem('relic');
        if (snapshot.pet_accessory) invStore.equipItem(snapshot.pet_accessory, 'pet_accessory'); else invStore.unequipItem('pet_accessory');
        
        if (snapshot.pet) petStore.equipPet(snapshot.pet);
    };


    // ── Selection Modal Logic ──
    const getSelectionList = (slot: RadialSlotId): (SelectionItem & { isLocked?: boolean })[] => {
        let list: (SelectionItem & { isLocked?: boolean })[] = [];
        
        switch (slot) {
            case 'helm':
                list = Object.values(COSMETICS_DB).filter(c => c && c.slot === 'head')
                    .map(c => ({ id: c.id, name: c.name, icon: '🪖', desc: 'Cosmetic', isLocked: !charStore.ownedCosmetics.includes(c.id) }));
                break;
            case 'body':
                list = Object.values(COSMETICS_DB).filter(c => c && c.slot === 'body')
                    .map(c => ({ id: c.id, name: c.name, icon: '👕', desc: 'Cosmetic', isLocked: !charStore.ownedCosmetics.includes(c.id) }));
                break;
            case 'legs':
                list = Object.values(COSMETICS_DB).filter(c => c && c.slot === 'legs')
                    .map(c => ({ id: c.id, name: c.name, icon: '👖', desc: 'Cosmetic', isLocked: !charStore.ownedCosmetics.includes(c.id) }));
                break;
            case 'boots':
                list = Object.values(COSMETICS_DB).filter(c => c && c.slot === 'feet')
                    .map(c => ({ id: c.id, name: c.name, icon: '👟', desc: 'Cosmetic', isLocked: !charStore.ownedCosmetics.includes(c.id) }));
                break;
            case 'amulet':
                list = Object.values(COSMETICS_DB).filter(c => c && c.slot === 'accessory')
                    .map(c => ({ id: c.id, name: c.name, icon: '📿', desc: 'Cosmetic', isLocked: !charStore.ownedCosmetics.includes(c.id) }));
                break;
            case 'cape':
                list = AURAS.map(a => ({ id: a.id, name: a.name, icon: a.icon, desc: 'Aura boost', isLocked: !auraStore.unlockedAuras.includes(a.id) }));
                break;
            case 'weapon':
                list = Object.values(EQUIPMENT_DB).filter(e => e && e.slot === 'weapon')
                    .map(e => ({ id: e.id, name: e.name, icon: e.icon, desc: `ATK +${e.atkBonus}`, isLocked: !equipStore.ownedEquipment.includes(e.id) }));
                break;
            case 'shield':
                list = Object.values(ITEM_DB).filter(i => i && i.type === 'armor')
                    .map(i => ({ id: i.id, name: i.name, icon: i.icon, desc: `DEF +${i.value}`, isLocked: (invStore.items[i.id] || 0) <= 0 }));
                break;
            case 'ring':
                list = Object.values(EQUIPMENT_DB).filter(e => e && e.slot === 'accessory')
                    .map(e => ({ id: e.id, name: e.name, icon: e.icon, desc: `ATK +${e.atkBonus}`, isLocked: !equipStore.ownedEquipment.includes(e.id) }));
                break;
            case 'pet':
                list = Object.values(ITEM_DATABASE).filter(i => i && i.type === 'pet')
                    .map(i => ({ id: i.id, name: i.name, icon: i.icon, desc: 'Companion', isLocked: !petStore.ownedPets.includes(i.id) }));
                break;
            case 'pet_accessory':
                list = Object.values(ITEM_DATABASE).filter(i => i && i.type === 'pet_accessory')
                    .map(i => ({ id: i.id, name: i.name, icon: i.icon, desc: 'Cosmetic', isLocked: !invStore.marketplaceOwned.includes(i.id) }));
                break;
            case 'book':
                list = Object.values(ITEM_DB).filter(i => i && i.type === 'book')
                    .map(i => ({ id: i.id, name: i.name, icon: i.icon, desc: i.effect || '', isLocked: (invStore.items[i.id] || 0) <= 0 }));
                break;
            case 'artifact':
                list = Object.values(ITEM_DB).filter(i => i && i.type === 'artifact')
                    .map(i => ({ id: i.id, name: i.name, icon: i.icon, desc: i.effect || '', isLocked: (invStore.items[i.id] || 0) <= 0 }));
                break;
            case 'relic':
                list = Object.values(ITEM_DB).filter(i => i && i.type === 'relic')
                    .map(i => ({ id: i.id, name: i.name, icon: i.icon, desc: i.effect || '', isLocked: (invStore.items[i.id] || 0) <= 0 }));
                break;
            case 'spell':
                list = magicStore.ownedSpells.map(id => {
                    const s = SPELL_DB[id];
                    return { id: s.id, name: s.name, icon: s.icon, desc: `${s.mpCost} MP`, isLocked: false };
                });
                break;
            case 'gloves':
                list = [];
                break;
        }

        return list.sort((a, b) => Number(a.isLocked) - Number(b.isLocked));
    };

    const handleSelect = (itemId: string | null) => {
        if (!activeSlot) return;

        if (itemId === null) {
            // Unequip logic
            switch (activeSlot) {
                case 'helm': charStore.unequipItem('head'); break;
                case 'body': charStore.unequipItem('body'); break;
                case 'legs': charStore.unequipItem('legs'); break;
                case 'boots': charStore.unequipItem('feet'); break;
                case 'amulet': charStore.unequipItem('accessory'); break;
                case 'cape': auraStore.setActiveAura('none'); break;
                case 'weapon': equipStore.unequipSlot('weapon'); break;
                case 'shield': invStore.unequipItem('armor'); break;
                case 'ring': equipStore.unequipSlot('accessory'); break;
                case 'pet': break; // Pet cannot be fully unequiped natively, just switched. Or maybe switch to empty string if store allowed.
                case 'pet_accessory': invStore.unequipItem('pet_accessory'); break;
                case 'book': invStore.unequipItem('book'); break;
                case 'artifact': invStore.unequipItem('artifact'); break;
                case 'relic': invStore.unequipItem('relic'); break;
                case 'spell': magicStore.equipSpell(null); break;
                case 'gloves': break;
            }
        } else {
            // Equip logic
            switch (activeSlot) {
                case 'helm': charStore.equipItem('head', itemId); break;
                case 'body': charStore.equipItem('body', itemId); break;
                case 'legs': charStore.equipItem('legs', itemId); break;
                case 'boots': charStore.equipItem('feet', itemId); break;
                case 'amulet': charStore.equipItem('accessory', itemId); break;
                case 'cape': auraStore.setActiveAura(itemId); break;
                case 'weapon': equipStore.equipItem(itemId); break;
                case 'shield': invStore.equipItem(itemId, 'armor'); break;
                case 'ring': equipStore.equipItem(itemId); break;
                case 'pet': petStore.equipPet(itemId); break;
                case 'pet_accessory': invStore.equipItem(itemId, 'pet_accessory'); break;
                case 'book': invStore.equipItem(itemId, 'book'); break;
                case 'artifact': invStore.equipItem(itemId, 'artifact'); break;
                case 'relic': invStore.equipItem(itemId, 'relic'); break;
                case 'spell': magicStore.equipSpell(itemId); break;
                case 'gloves': break;
            }
        }
        setActiveSlot(null);
    };

    const renderSlot = (id: RadialSlotId, cssClass: string) => {
        const data = getSlotData(id);
        const isEmpty = !data.icon;
        
        return (
            <div 
                className={`loadout-slot ${cssClass} ${isEmpty ? 'empty' : ''}`}
                onClick={() => setActiveSlot(id)}
            >
                {isEmpty ? (
                    <span className="slot-placeholder">{data.emptyIcon}</span>
                ) : (
                    <span className="loadout-slot-icon">{data.icon}</span>
                )}
                <div className="slot-label-tooltip">
                    {isEmpty ? `Equip ${id}` : data.name}
                </div>
            </div>
        );
    };

    return (
        <div className="loadout-panel">
            <div className="loadout-panel-header">
                <h2>Equipment Loadout</h2>
                <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <div className="loadout-panel-content">
                {/* ── Left/Center: Radial RuneScape Layout ── */}
                <div className="loadout-radial-area">
                    <div className="loadout-character-avatar">
                        <img src={heroImage} alt="Player Avatar" />
                    </div>

                    <div className="loadout-slots-container">
                        {renderSlot('helm', 'ls-head')}
                        {renderSlot('cape', 'ls-cape')}
                        {renderSlot('amulet', 'ls-amulet')}
                        <div className="ls-ammo"></div> {/* Empty placeholder for ammo/arrows space natively */}
                        
                        {renderSlot('weapon', 'ls-weapon')}
                        {renderSlot('body', 'ls-body')}
                        {renderSlot('shield', 'ls-shield')}

                        {renderSlot('legs', 'ls-legs')}
                        
                        {renderSlot('gloves', 'ls-gloves')}
                        {renderSlot('boots', 'ls-boots')}
                        {renderSlot('ring', 'ls-ring')}
                        
                        {/* Outside floaters */}
                        {renderSlot('artifact', 'ls-artifact')}
                        {renderSlot('pet', 'ls-pet')}
                        {renderSlot('pet_accessory', 'ls-pet-accessory')}
                        {renderSlot('book', 'ls-book')}
                        {renderSlot('relic', 'ls-relic')}
                        {renderSlot('spell', 'ls-spell')}
                    </div>
                </div>

                {/* ── Right: Stats Panel ── */}
                <div className="loadout-stats-area" style={{ position: 'relative' }}>
                    <AnimatePresence>
                        {statPopups.map(popup => (
                            <motion.div 
                                key={popup.id}
                                className="floating-stat-popup"
                                initial={{ opacity: 0, y: 0, scale: 0.8 }}
                                animate={{ opacity: 1, y: -40, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1 }}
                            >
                                {popup.diffAtk !== 0 && (
                                    <span style={{ color: popup.diffAtk > 0 ? '#4ade80' : '#ef4444' }}>
                                        {popup.diffAtk > 0 ? '+' : ''}{popup.diffAtk} ATK
                                    </span>
                                )}
                                {popup.diffDef !== 0 && (
                                    <span style={{ color: popup.diffDef > 0 ? '#4ade80' : '#ef4444' }}>
                                        {popup.diffDef > 0 ? '+' : ''}{popup.diffDef} DEF
                                    </span>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    <div className="stat-category">
                        <h4>Attack bonuses</h4>
                        <div className="stat-row"><span>Stab</span><span className="val pos">+{compiledStats.attack.stab}</span></div>
                        <div className="stat-row"><span>Slash</span><span className="val pos">+{compiledStats.attack.slash}</span></div>
                        <div className="stat-row"><span>Crush</span><span className="val pos">+{compiledStats.attack.crush}</span></div>
                        <div className="stat-row"><span>Magic</span><span className="val">+0</span></div>
                        <div className="stat-row"><span>Ranged</span><span className="val">+0</span></div>
                        <div className="stat-row total"><span>Total ATK</span><span className="val pos">+{compiledStats.overallAtk}</span></div>
                    </div>

                    <div className="stat-category">
                        <h4>Defence bonuses</h4>
                        <div className="stat-row"><span>Stab</span><span className="val pos">+{compiledStats.defense.stab}</span></div>
                        <div className="stat-row"><span>Slash</span><span className="val pos">+{compiledStats.defense.slash}</span></div>
                        <div className="stat-row"><span>Crush</span><span className="val pos">+{compiledStats.defense.crush}</span></div>
                        <div className="stat-row"><span>Magic</span><span className="val">+0</span></div>
                        <div className="stat-row"><span>Ranged</span><span className="val">+0</span></div>
                        <div className="stat-row total"><span>Total DEF</span><span className="val pos">+{compiledStats.overallDef}</span></div>
                    </div>

                    <div className="stat-category">
                        <h4>Real-Life Skill Levels</h4>
                        {(Object.keys(gameStore.skills) as SkillName[]).map((skill: SkillName) => {
                            const level = gameStore.skills[skill]?.level || 1;
                            return (
                                <div key={skill} className="stat-row skill-row">
                                    <span>{skill}</span>
                                    <span className="val">{level}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="loadout-sets-container">
                        <h4>Equipment Sets</h4>
                        <div className="loadout-sets-grid">
                            {Object.keys(equipStore.equipmentSets).map((setName) => (
                                <div key={setName} className="loadout-set-item" style={{display: 'flex', gap: '4px'}}>
                                    <button 
                                        className="loadout-set-btn" 
                                        onClick={() => handleEquipSet(setName)}
                                        style={{ flex: 1 }}
                                    >
                                        <Box size={14} /> <span>{setName.replace(' Set', '')}</span>
                                    </button>
                                    <button
                                        className="loadout-set-btn-save"
                                        onClick={() => handleSaveSet(setName)}
                                        title={`Save current loadout to ${setName}`}
                                    >
                                        <Save size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Selection Modal Popover ── */}
            {activeSlot && (
                <div className="loadout-selection-modal" onClick={() => setActiveSlot(null)}>
                    <div className="ls-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="ls-modal-header">
                            <h3>Select {activeSlot.charAt(0).toUpperCase() + activeSlot.slice(1)}</h3>
                            <button className="modal-close-btn" onClick={() => setActiveSlot(null)}><X size={18}/></button>
                        </div>
                        <div className="ls-modal-list">
                            <button className="ls-item-row unequip" onClick={() => handleSelect(null)}>
                                <span className="ls-item-icon">❌</span>
                                <div className="ls-item-details">
                                    <span className="ls-item-name">Unequip Current</span>
                                    <span className="ls-item-stats">Empty the slot</span>
                                </div>
                            </button>
                            
                            {getSelectionList(activeSlot).map(item => (
                                <button 
                                    key={item.id} 
                                    className={`ls-item-row ${item.isLocked ? 'locked' : ''}`} 
                                    onClick={() => !item.isLocked && handleSelect(item.id)}
                                    disabled={item.isLocked}
                                    style={{ opacity: item.isLocked ? 0.5 : 1, filter: item.isLocked ? 'grayscale(100%)' : 'none', cursor: item.isLocked ? 'not-allowed' : 'pointer', position: 'relative' }}
                                >
                                    <span className="ls-item-icon">{item.icon}</span>
                                    <div className="ls-item-details" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="ls-item-name">{item.name}</span>
                                            {item.isLocked && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', background: '#334155', color: '#94a3b8', borderRadius: '4px' }}>🔒 Locked</span>}
                                        </div>
                                        <span className="ls-item-stats">{item.desc}</span>
                                    </div>
                                </button>
                            ))}

                            {getSelectionList(activeSlot).length === 0 && (
                                <div style={{textAlign: 'center', padding: '1rem', color: '#64748b'}}>
                                    You don't own any items for this slot.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
