import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Box } from 'lucide-react';
import { useCharacterStore, COSMETICS_DB } from '../../store/useCharacterStore';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useInventoryStore, getItemById } from '../../store/useInventoryStore';
import { ITEM_DATABASE } from '../../data/items';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { usePetStore, PET_DATABASE } from '../../store/usePetStore';
import { useGameStore } from '../../store/useGameStore';
import type { SkillName } from '../../store/useGameStore';

import { usePlayerAvatar } from '../../hooks/usePlayerAvatar';
import { useMagicStore, SPELL_DB } from '../../store/useMagicStore';
import { useTitleStore, TITLES } from '../../store/useTitleStore';
import { useProfileStore } from '../../store/useProfileStore';
import { getSkillSynergyBonus } from '../../store/useCombatFormulas';
import './LoadoutPanel.css';

type RadialSlotId = 
    | 'helm' | 'amulet' | 'cape' | 'weapon' | 'body' | 'shield' 
    | 'legs' | 'gloves' | 'boots' | 'ring' | 'pet' | 'pet_accessory' | 'book' 
    | 'artifact' | 'relic' | 'spell' | 'title';

interface SelectionItem {
    id: string;
    name: string;
    icon: string;
    desc: string;
}

export const LoadoutPanel = ({ onClose }: { onClose: () => void }) => {
    const heroImage = usePlayerAvatar();
    const gameStore = useGameStore();

    // ── Stores ──
    const charStore = useCharacterStore();
    const equipStore = useEquipmentStore();
    const invStore = useInventoryStore();
    const auraStore = useAuraStore();
    const petStore = usePetStore();
    const magicStore = useMagicStore();
    const titleStore = useTitleStore();
    
    const classType = useProfileStore(s => s.classType);
    const synergy = getSkillSynergyBonus();

    // ── UI State ──
    const [activeSlot, setActiveSlot] = useState<RadialSlotId | null>(null);
    const [statPopups, setStatPopups] = useState<{ id: number; diffAtk: number; diffDef: number; keyAtk: number; keyDef: number }[]>([]);
    
    // Track previous stats to compute diff manually
    const [prevStats, setPrevStats] = useState({ overallAtk: 0, overallDef: 0 });

    // ── Computed Current Equipment Data ──
    // Maps each slot ID to its actual display data from the unified DB stores
    // Helper: get owned marketplace armor items for a specific slot
    const getOwnedArmorForSlot = (slotName: string) =>
        Object.values(ITEM_DATABASE)
            .filter(i => i?.type === 'armor' && i?.slot === slotName && invStore.marketplaceOwned.includes(i.id))
            .map(i => ({
                id: i.id,
                name: i.name,
                icon: i.icon,
                desc: [
                    i.stats?.defense ? `DEF +${i.stats.defense}` : '',
                    i.stats?.attack ? `ATK +${i.stats.attack}` : '',
                ].filter(Boolean).join(' · ') || i.description || '',
                isLocked: false,
            }));

    // Helper: check if an item id is a marketplace armor item (routes to invStore)
    const isMarketplaceArmor = (itemId: string) => ITEM_DATABASE[itemId]?.type === 'armor';

    const getSlotData = (slot: RadialSlotId): { icon: string; name: string; emptyIcon: string } => {
        switch (slot) {
            case 'helm': {
                // Priority: stat armor from invStore.head > cosmetic from charStore.head
                const armorHelm = invStore.equipped.head ? getItemById(invStore.equipped.head) : null;
                if (armorHelm) return { icon: armorHelm.icon || '⛑️', name: armorHelm.name, emptyIcon: '⛑️' };
                const cosHelm = charStore.equipped.head ? COSMETICS_DB[charStore.equipped.head] : null;
                return { icon: cosHelm ? '🪖' : '', name: cosHelm?.name || '', emptyIcon: '⛑️' };
            }
            case 'amulet': {
                const amulet = charStore.equipped.accessory ? COSMETICS_DB[charStore.equipped.accessory] : null;
                return { icon: amulet ? '📿' : '', name: amulet?.name || '', emptyIcon: '💍' };
            }
            case 'cape': {
                // Priority: cloak armor > aura
                const armorCloak = invStore.equipped.cloak ? getItemById(invStore.equipped.cloak) : null;
                if (armorCloak) return { icon: armorCloak.icon || '🧥', name: armorCloak.name, emptyIcon: '✨' };
                const aura = activeAuraId !== 'none' ? AURAS.find(a => a.id === auraStore.activeAuraId) : null;
                return { icon: aura ? aura.icon : '', name: aura?.name || '', emptyIcon: '✨' };
            }
            case 'weapon': {
                const wep = invStore.equipped.weapon ? getItemById(invStore.equipped.weapon) : null;
                return { icon: wep?.icon || '', name: wep?.name || '', emptyIcon: '⚔️' };
            }
            case 'body': {
                // Priority: armor chest > cosmetic body
                const armorChest = invStore.equipped.chest ? getItemById(invStore.equipped.chest) : null;
                if (armorChest) return { icon: armorChest.icon || '🦺', name: armorChest.name, emptyIcon: '🦺' };
                const cosBody = charStore.equipped.body ? COSMETICS_DB[charStore.equipped.body] : null;
                return { icon: cosBody ? '👕' : '', name: cosBody?.name || '', emptyIcon: '🦺' };
            }
            case 'shield': {
                const shield = invStore.equipped.armor ? getItemById(invStore.equipped.armor) : null;
                return { icon: shield?.icon || '', name: shield?.name || '', emptyIcon: '🛡️' };
            }
            case 'legs': {
                // Priority: armor legs > cosmetic legs
                const armorLegs = invStore.equipped.legs ? getItemById(invStore.equipped.legs) : null;
                if (armorLegs) return { icon: armorLegs.icon || '👖', name: armorLegs.name, emptyIcon: '🩳' };
                const cosLegs = charStore.equipped.legs ? COSMETICS_DB[charStore.equipped.legs] : null;
                return { icon: cosLegs ? '👖' : '', name: cosLegs?.name || '', emptyIcon: '🩳' };
            }
            case 'gloves': {
                const armorHands = invStore.equipped.hands ? getItemById(invStore.equipped.hands) : null;
                return { icon: armorHands?.icon || '', name: armorHands?.name || '', emptyIcon: '🧤' };
            }
            case 'boots': {
                // Priority: armor feet > cosmetic feet
                const armorFeet = invStore.equipped.feet ? getItemById(invStore.equipped.feet) : null;
                if (armorFeet) return { icon: armorFeet.icon || '👢', name: armorFeet.name, emptyIcon: '👢' };
                const cosBoots = charStore.equipped.feet ? COSMETICS_DB[charStore.equipped.feet] : null;
                return { icon: cosBoots ? '👟' : '', name: cosBoots?.name || '', emptyIcon: '👢' };
            }
            case 'ring': {
                const ring = invStore.equipped.jewelry ? getItemById(invStore.equipped.jewelry) : null;
                return { icon: ring?.icon || '', name: ring?.name || '', emptyIcon: '💍' };
            }
            case 'pet': {
                const petDef = petStore.equippedPetId ? PET_DATABASE[petStore.equippedPetId] : null;
                return { icon: petDef?.icon || '', name: petDef?.name || '', emptyIcon: '🐾' };
            }
            case 'book': {
                const book = invStore.equipped.book ? getItemById(invStore.equipped.book) : null;
                return { icon: book?.icon || '', name: book?.name || '', emptyIcon: '📚' };
            }
            case 'artifact': {
                const artifact = invStore.equipped.artifact ? getItemById(invStore.equipped.artifact) : null;
                return { icon: artifact?.icon || '', name: artifact?.name || '', emptyIcon: '🔮' };
            }
            case 'relic': {
                const relic = invStore.equipped.relic ? getItemById(invStore.equipped.relic) : null;
                return { icon: relic?.icon || '', name: relic?.name || '', emptyIcon: '🏺' };
            }
            case 'pet_accessory': {
                const pAcc = invStore.equipped.pet_accessory ? getItemById(invStore.equipped.pet_accessory) : null;
                return { icon: pAcc?.icon || '', name: pAcc?.name || '', emptyIcon: '🎀' };
            }
            case 'spell': {
                const spelling = magicStore.equippedSpell ? SPELL_DB[magicStore.equippedSpell] : null;
                return { icon: spelling?.icon || '', name: spelling?.name || '', emptyIcon: '🪄' };
            }
            case 'title': {
                const activeTitle = titleStore.activeTitle ? TITLES.find(t => t.id === titleStore.activeTitle) : null;
                return { icon: activeTitle?.icon || '', name: activeTitle?.name || '', emptyIcon: '👑' };
            }
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
            relic: invStore.equipped.relic ?? null,
            title: titleStore.activeTitle ?? null
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
        
        if (snapshot.weapon) invStore.equipItem(snapshot.weapon, 'weapon'); else invStore.unequipItem('weapon');
        if (snapshot.ring) invStore.equipItem(snapshot.ring, 'jewelry'); else invStore.unequipItem('jewelry');
        
        if (snapshot.shield) invStore.equipItem(snapshot.shield, 'armor'); else invStore.unequipItem('armor');
        if (snapshot.book) invStore.equipItem(snapshot.book, 'book'); else invStore.unequipItem('book');
        if (snapshot.artifact) invStore.equipItem(snapshot.artifact, 'artifact'); else invStore.unequipItem('artifact');
        if (snapshot.relic) invStore.equipItem(snapshot.relic, 'relic'); else invStore.unequipItem('relic');
        if (snapshot.pet_accessory) invStore.equipItem(snapshot.pet_accessory, 'pet_accessory'); else invStore.unequipItem('pet_accessory');
        
        if (snapshot.pet) petStore.equipPet(snapshot.pet);
        if (snapshot.title) titleStore.setActiveTitle(snapshot.title); else titleStore.setActiveTitle(null);
    };


    // ── Selection Modal Logic ──
    const getSelectionList = (slot: RadialSlotId): (SelectionItem & { isLocked?: boolean })[] => {
        let list: (SelectionItem & { isLocked?: boolean })[] = [];
        
        switch (slot) {
            case 'helm':
                list = [
                    ...getOwnedArmorForSlot('head'),
                    ...Object.values(COSMETICS_DB).filter(c => c?.slot === 'head')
                        .map(c => ({ id: c.id, name: c.name, icon: '🪖', desc: 'Cosmetic', isLocked: !charStore.ownedCosmetics.includes(c.id) }))
                ];
                break;
            case 'body':
                list = [
                    ...getOwnedArmorForSlot('chest'),
                    ...Object.values(COSMETICS_DB).filter(c => c?.slot === 'body')
                        .map(c => ({ id: c.id, name: c.name, icon: '👕', desc: 'Cosmetic', isLocked: !charStore.ownedCosmetics.includes(c.id) }))
                ];
                break;
            case 'legs':
                list = [
                    ...getOwnedArmorForSlot('legs'),
                    ...Object.values(COSMETICS_DB).filter(c => c?.slot === 'legs')
                        .map(c => ({ id: c.id, name: c.name, icon: '👖', desc: 'Cosmetic', isLocked: !charStore.ownedCosmetics.includes(c.id) }))
                ];
                break;
            case 'boots':
                list = [
                    ...getOwnedArmorForSlot('feet'),
                    ...Object.values(COSMETICS_DB).filter(c => c?.slot === 'feet')
                        .map(c => ({ id: c.id, name: c.name, icon: '👟', desc: 'Cosmetic', isLocked: !charStore.ownedCosmetics.includes(c.id) }))
                ];
                break;
            case 'amulet':
                list = Object.values(COSMETICS_DB).filter(c => c?.slot === 'accessory')
                    .map(c => ({ id: c.id, name: c.name, icon: '📿', desc: 'Cosmetic', isLocked: !charStore.ownedCosmetics.includes(c.id) }));
                break;
            case 'gloves':
                list = getOwnedArmorForSlot('hands');
                break;
            case 'cape':
                list = [
                    ...getOwnedArmorForSlot('cloak'),
                    ...AURAS.map(a => ({ id: a.id, name: a.name, icon: a.icon, desc: 'Aura boost', isLocked: !auraStore.unlockedAuras.includes(a.id) }))
                ];
                break;
            case 'weapon':
                list = Object.keys(invStore.items)
                    .map(id => getItemById(id))
                    .filter(i => i && i.type === 'weapon')
                    .map(e => ({ id: e.id, name: e.name, icon: e.icon, desc: `ATK +${e.stats?.attack || e.statBonuses?.attack || e.value || 0}`, isLocked: false }));
                break;
            case 'shield':
                list = Object.keys(invStore.items)
                    .map(id => getItemById(id))
                    .filter(i => i && i.type === 'armor')
                    .map(i => ({ id: i.id, name: i.name, icon: i.icon, desc: `DEF +${i.stats?.defense || i.statBonuses?.defense || i.value || 0}`, isLocked: false }));
                break;
            case 'ring':
                list = Object.keys(invStore.items)
                    .map(id => getItemById(id))
                    .filter(i => i && i.type === 'jewelry')
                    .map(e => ({ id: e.id, name: e.name, icon: e.icon, desc: `ATK +${e.stats?.attack || e.statBonuses?.attack || 0} DEF +${e.stats?.defense || e.statBonuses?.defense || 0}`, isLocked: false }));
                break;
            case 'pet':
                // List ALL pets from PET_DATABASE — full collection
                list = Object.values(PET_DATABASE).map(p => ({
                    id: p.id,
                    name: p.name,
                    icon: p.icon,
                    desc: `${p.passive.name} · ${p.passive.description}`,
                    isLocked: !petStore.ownedPets.includes(p.id),
                }));
                break;
            case 'pet_accessory':
                list = Object.keys(invStore.items)
                    .map(id => getItemById(id))
                    .filter(i => i && (i.type === 'pet_accessory' || i.type === 'pet_gear'))
                    .map(i => ({ id: i.id, name: i.name, icon: i.icon, desc: 'Pet Accessory', isLocked: false }));
                break;
            case 'book':
                list = Object.keys(invStore.items)
                    .map(id => getItemById(id))
                    .filter(i => i && i.type === 'book')
                    .map(i => ({ id: i.id, name: i.name, icon: i.icon, desc: i.effect || '', isLocked: false }));
                break;
            case 'artifact':
                list = Object.keys(invStore.items)
                    .map(id => getItemById(id))
                    .filter(i => i && i.type === 'artifact')
                    .map(i => ({ id: i.id, name: i.name, icon: i.icon, desc: i.effect || '', isLocked: false }));
                break;
            case 'relic':
                list = Object.keys(invStore.items)
                    .map(id => getItemById(id))
                    .filter(i => i && i.type === 'relic')
                    .map(i => ({ id: i.id, name: i.name, icon: i.icon, desc: i.effect || '', isLocked: false }));
                break;
            case 'spell':
                list = magicStore.ownedSpells.map(id => {
                    const s = SPELL_DB[id];
                    return { id: s.id, name: s.name, icon: s.icon, desc: `${s.mpCost} MP`, isLocked: false };
                });
                break;
            case 'title':
                list = TITLES.map(t => ({ id: t.id, name: t.name, icon: t.icon, desc: t.description, isLocked: !titleStore.unlockedTitles.includes(t.id) }));
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
            // Unequip logic — clear both stores where applicable
            switch (activeSlot) {
                case 'helm': invStore.unequipItem('head'); charStore.unequipItem('head'); break;
                case 'body': invStore.unequipItem('chest'); charStore.unequipItem('body'); break;
                case 'legs': invStore.unequipItem('legs'); charStore.unequipItem('legs'); break;
                case 'boots': invStore.unequipItem('feet'); charStore.unequipItem('feet'); break;
                case 'gloves': invStore.unequipItem('hands'); break;
                case 'amulet': charStore.unequipItem('accessory'); break;
                case 'cape': invStore.unequipItem('cloak'); auraStore.setActiveAura('none'); break;
                case 'weapon': equipStore.unequipSlot('weapon'); break;
                case 'shield': invStore.unequipItem('armor'); break;
                case 'ring': equipStore.unequipSlot('accessory'); break;
                case 'pet': petStore.unequipPet(); break;
                case 'pet_accessory': invStore.unequipItem('pet_accessory'); break;
                case 'book': invStore.unequipItem('book'); break;
                case 'artifact': invStore.unequipItem('artifact'); break;
                case 'relic': invStore.unequipItem('relic'); break;
                case 'spell': magicStore.equipSpell(null); break;
                case 'title': titleStore.setActiveTitle(null); break;
                case 'gloves': break;
            }
        } else {
            // Equip logic — route armor items to invStore, cosmetics to charStore
            switch (activeSlot) {
                case 'helm':
                    if (isMarketplaceArmor(itemId)) invStore.equipItem(itemId, 'head');
                    else charStore.equipItem('head', itemId);
                    break;
                case 'body':
                    if (isMarketplaceArmor(itemId)) invStore.equipItem(itemId, 'chest');
                    else charStore.equipItem('body', itemId);
                    break;
                case 'legs':
                    if (isMarketplaceArmor(itemId)) invStore.equipItem(itemId, 'legs');
                    else charStore.equipItem('legs', itemId);
                    break;
                case 'boots':
                    if (isMarketplaceArmor(itemId)) invStore.equipItem(itemId, 'feet');
                    else charStore.equipItem('feet', itemId);
                    break;
                case 'gloves': invStore.equipItem(itemId, 'hands'); break;
                case 'amulet': charStore.equipItem('accessory', itemId); break;
                case 'cape':
                    if (isMarketplaceArmor(itemId)) invStore.equipItem(itemId, 'cloak');
                    else auraStore.setActiveAura(itemId);
                    break;
                case 'weapon': equipStore.equipItem(itemId); break;
                case 'shield': invStore.equipItem(itemId, 'armor'); break;
                case 'ring': equipStore.equipItem(itemId); break;
                case 'pet': petStore.equipPet(itemId); break;
                case 'pet_accessory': invStore.equipItem(itemId, 'pet_accessory'); break;
                case 'book': invStore.equipItem(itemId, 'book'); break;
                case 'artifact': invStore.equipItem(itemId, 'artifact'); break;
                case 'relic': invStore.equipItem(itemId, 'relic'); break;
                case 'spell': magicStore.equipSpell(itemId); break;
                case 'title': titleStore.setActiveTitle(itemId); break;
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
                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(30,20,60,0.8)', border: '1px solid rgba(139,92,246,0.3)', padding: '0.75rem', borderRadius: '8px', zIndex: 10 }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Class</div>
                        <div style={{ fontWeight: 'bold', color: '#a78bfa', marginBottom: '8px', fontSize: '1.1rem' }}>{classType || 'Warrior'}</div>
                        
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Active Synergy</div>
                        <div 
                            title="Synergy activates when both skills >= 1"
                            style={{ fontWeight: 'bold', color: synergy.active ? '#a3e635' : '#475569', fontSize: '0.85rem', maxWidth: '200px', cursor: 'help' }}
                        >
                            {synergy.description}
                        </div>
                    </div>

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
                        {renderSlot('title', 'ls-title')}
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
