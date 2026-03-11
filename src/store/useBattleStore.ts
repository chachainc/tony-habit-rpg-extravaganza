import { create } from 'zustand';
import { ENEMY_DB, type Ability, type Element, getElementMultiplier, ELEMENT_ICONS } from './useEnemyStore';
import { useGameStore } from './useGameStore';
import { useConsistencyStore } from './useConsistencyStore';
import { usePetStore } from './usePetStore';
import { useMagicStore, SPELL_DB } from './useMagicStore';
import { useRoomStore } from './useRoomStore';
import { useCampaignStore } from './useCampaignStore';
import { getSkillSynergyBonus } from './useCombatFormulas';

export interface Combatant {
    id: string;
    name: string;
    icon: string;
    element: Element;
    maxHp: number;
    hp: number;
    maxMana: number; // New: Mana pool for skills
    mana: number; // New: Current mana
    manaRegen: number; // New: Mana regenerated per turn
    atk: number;
    def: number;
    spd: number;
    critRate: number;
    critDmg: number;
    energy: number; // 0-100 for ultimate
    abilities: Ability[];
    cooldowns: Record<string, number>; // ability id -> turns remaining
    buffs: Array<{ stat: 'atk' | 'def' | 'spd'; amount: number; turnsLeft: number }>;
    debuffs: Array<{ stat: 'atk' | 'def' | 'spd'; amount: number; turnsLeft: number }>;
    dots: Array<{ damage: number; turnsLeft: number }>;
    isPlayer: boolean;
    isDefending: boolean; // New: 50% dmg reduction
    isBerserk: boolean; // New: Berserk buff from habit streaks
    damageReduction: number; // Pet ability: % damage reduction (0-100)
    damageReductionTurns: number; // Turns remaining for damage reduction
    manaShieldActive: boolean; // True if mana shield is absorbing damage
    manaShieldTurns: number; // Turns remaining for mana shield
    scalingFactor: number; // Used for dynamic reward scaling
}

export const calculateEffectiveDefense = (defender: Combatant, isMagic: boolean = false): number => {
    let effectiveDef = defender.def;
    defender.buffs.forEach(b => { if (b.stat === 'def') effectiveDef += b.amount; });
    defender.debuffs.forEach(d => { if (d.stat === 'def') effectiveDef -= d.amount; });

    // Temporary bridge: magic defense is half of physical defense.
    if (isMagic) {
        effectiveDef = Math.round(effectiveDef * 0.5);
    }

    return Math.max(0, effectiveDef);
};

export interface CombatLog {
    message: string;
    type: 'damage' | 'heal' | 'buff' | 'debuff' | 'crit' | 'element' | 'info' | 'victory' | 'defeat';
    value?: number;
}

export type BattlePhase = 'idle' | 'prep' | 'select_action' | 'executing' | 'enemy_turn' | 'victory' | 'defeat' | 'escaped';

interface BattleState {
    phase: BattlePhase;
    player: Combatant | null;
    enemy: Combatant | null;
    turnOrder: string[]; // IDs in turn order
    currentTurn: string; // Current combatant ID
    turnNumber: number;
    combatLog: CombatLog[];
    selectedAbility: Ability | null;
    lastDamage: { target: string; amount: number; isCrit: boolean; elementBonus: number } | null;
    isGoldenSlime: boolean; // Track if current enemy is Golden Slime
    goldenSlimeTurnsRemaining: number; // Turns before Golden Slime escapes
    petAbilityCooldown: number; // Turns remaining before pet ability can be used again
    petAbilityUsedThisBattle: boolean; // Track if pet ability has been triggered
    currentMP: number; // Player's current mana for spells
    maxMP: number; // Player's max mana
    equippedSpells: string[]; // IDs of spells equipped for battle

    // Tower Expansion State
    bossPhase: 1 | 2;
    playerDamageModifier: number;
    enemyDamageModifier: number;
    affinityActive: boolean;
    weaknessActive: boolean;
    activeFloorModifier: any | null; // Use FloorModifier if imported, or any
    activeRunBuffs: any[]; // Use RunBuff[] if imported, or any

    // Actions
    initBattle: (enemyId: string, options?: { context?: 'arena' | 'conquest' | 'conquest_elite'; conquestTier?: number }) => void;
    selectAbility: (ability: Ability) => void;
    executePlayerAction: () => void;
    executeEnemyAction: () => void;
    endTurn: () => void;
    applyDamage: (attacker: Combatant, defender: Combatant, ability: Ability) => number;
    resetBattle: () => void;
    playerDefend: () => void; // New action
    usePetAbility: () => void; // Pet ability action
    castSpell: (spellId: string) => void; // Cast a spell from magic store
    restoreMP: (amount: number) => void; // Restore MP (used by room resting)
    startBattle: () => void;
    introGracePeriod: boolean; // Tower Expansion: Transition from prep to combat
    context: 'arena' | 'conquest' | 'conquest_elite' | 'risk' | 'tower-defense';
    conquestTier: number | null;
    conquestEnemyPower?: number;
}

// Player abilities - Replaced with the 3 distinct actions
const PLAYER_ABILITIES: Ability[] = [
    {
        id: 'basic_strike',
        name: 'Basic Strike',
        type: 'attack',
        description: 'A swift strike.',
        icon: '⚔️',
        element: 'neutral',
        damageMultiplier: 1.0,
        cooldown: 0,
        energyCost: 0,
    },
    // Defensive Stance is handled as a special action, but we keep an ability definition for metadata
    {
        id: 'defensive_stance',
        name: 'Defensive Stance',
        type: 'skill',
        description: 'Reduce damage by 50% for 1 turn.',
        icon: '🛡️',
        element: 'neutral',
        damageMultiplier: 0,
        cooldown: 0,
        energyCost: 0,
    },
    {
        id: 'ultimate_slam',
        name: 'Heavy Slam', // Default ultimate
        type: 'ultimate',
        description: 'Deals massive damage.',
        icon: '💥',
        element: 'neutral',
        damageMultiplier: 2.5,
        cooldown: 0,
        energyCost: 100, // Requires full rage
    },
];

export const useBattleStore = create<BattleState>()((set, get) => ({
    phase: 'idle',
    player: null,
    enemy: null,
    turnOrder: [],
    currentTurn: '',
    turnNumber: 0,
    combatLog: [],
    selectedAbility: null,
    lastDamage: null,
    isGoldenSlime: false,
    goldenSlimeTurnsRemaining: 3,
    petAbilityCooldown: 0,
    petAbilityUsedThisBattle: false,
    currentMP: 60, // Default, updated on battle init
    maxMP: 60,
    equippedSpells: [],
    bossPhase: 1,
    playerDamageModifier: 1.0,
    enemyDamageModifier: 1.0,
    affinityActive: false,
    weaknessActive: false,
    activeFloorModifier: null,
    activeRunBuffs: [],
    introGracePeriod: false,
    context: 'arena',
    conquestTier: null,

    initBattle: (enemyId: string, options?: { context?: 'arena' | 'conquest' | 'conquest_elite'; conquestTier?: number }) => {
        const enemyDef = ENEMY_DB[enemyId];
        if (!enemyDef) return;

        const gameStore = useGameStore.getState();
        const consistencyStore = useConsistencyStore.getState();
        const roomBonuses = useRoomStore.getState().getRoomCombatBonuses();
        const campaignStore = useCampaignStore.getState();

        // Calculate scaling
        const globalLevel = gameStore.getGlobalLevel();
        const totalXp = Object.values(gameStore.skills).reduce((sum, s) => sum + s.totalXp, 0);
        const xpScaling = Math.floor(totalXp * 0.001);

        const levelScaleHp = 1 + (globalLevel * 0.10);
        const levelScaleStats = 1 + (globalLevel * 0.05);

        let playerHp = Math.round((gameStore.skills.Cardio.level * 15) + 80);
        let playerAtk = Math.round(gameStore.getAttack());
        let playerDef = Math.round(gameStore.getDefense());
        let playerSpd = Math.round((gameStore.skills.Flexibility.level * 2) + 50);

        playerHp += roomBonuses.maxHP;
        playerAtk = Math.round(playerAtk * (1 + roomBonuses.atkPercent / 100));
        playerDef = Math.round(playerDef * (1 + roomBonuses.defPercent / 100));
        playerSpd = Math.round(playerSpd * (1 + roomBonuses.spdPercent / 100));

        // Apply Cardio↔Strength synergy bonus
        const synergy = getSkillSynergyBonus();
        playerAtk = Math.round(playerAtk * synergy.bonusMultiplier);

        const playerMaxMana = Math.round(50 + (gameStore.skills.Housemaid.level * 5));
        const playerManaRegen = Math.round(5 + (gameStore.skills.Cardio.level * 0.5));

        const weeklyProgress = consistencyStore.getWeeklyProgress();
        const hasBerserk = weeklyProgress.daysCompleted >= 3;

        const player: Combatant = {
            id: 'player',
            name: 'Hero',
            icon: '🤠',
            element: 'neutral',
            maxHp: playerHp,
            hp: playerHp,
            maxMana: playerMaxMana,
            mana: playerMaxMana,
            manaRegen: playerManaRegen,
            atk: hasBerserk ? Math.round(playerAtk * 1.25) : playerAtk,
            def: playerDef,
            spd: playerSpd,
            critRate: 0.10 + (gameStore.skills.Luck?.level || 1) * 0.01 + (roomBonuses.critPercent / 100),
            critDmg: 1.5,
            energy: 0,
            abilities: PLAYER_ABILITIES,
            cooldowns: {},
            buffs: [],
            debuffs: [],
            dots: [],
            isPlayer: true,
            isDefending: false,
            isBerserk: hasBerserk,
            damageReduction: 0,
            damageReductionTurns: 0,
            manaShieldActive: false,
            manaShieldTurns: 0,
            scalingFactor: 1.0,
        };

        const context = options?.context || 'arena';
        const conquestTier = options?.conquestTier || null;

        let enemyMaxHp = Math.round(enemyDef.baseHp * levelScaleHp + xpScaling * 2);
        let enemyAtk = Math.round(enemyDef.baseAtk * levelScaleStats + xpScaling * 0.5);
        let enemyDef_stat = Math.round(enemyDef.baseDef * levelScaleStats + xpScaling * 0.5);
        let conquestEnemyPower = undefined;

        if (context === 'conquest' && conquestTier !== null) {
            // Target curve: Node 1 (~10), Node 2 (~13), Node 3 (~17), Node 4 (~22), Boss (~30).
            const tierCurve = { 1: 10, 2: 13, 3: 17, 4: 22, 5: 30 };
            conquestEnemyPower = tierCurve[conquestTier as keyof typeof tierCurve] || 30;

            // Map power roughly to stats
            enemyMaxHp = Math.round(conquestEnemyPower * 10);
            enemyAtk = Math.round(conquestEnemyPower * 0.6);
            enemyDef_stat = Math.round(conquestEnemyPower * 0.4);
        }

        const enemy: Combatant = {
            id: enemyDef.id,
            name: enemyDef.name,
            icon: enemyDef.icon,
            element: enemyDef.element,
            maxHp: enemyMaxHp,
            hp: enemyMaxHp,
            maxMana: 50,
            mana: 50,
            manaRegen: 5,
            atk: enemyAtk,
            def: enemyDef_stat,
            spd: Math.round(enemyDef.baseSpd * levelScaleStats),
            critRate: enemyDef.critRate,
            critDmg: enemyDef.critDmg,
            energy: 0,
            abilities: [
                { id: 'basic_attack', name: 'Attack', type: 'attack', description: 'Basic attack.', icon: '👊', element: enemyDef.element, damageMultiplier: 1.0, cooldown: 0, energyCost: 0 },
                ...enemyDef.abilities,
            ],
            cooldowns: {},
            buffs: [],
            debuffs: [],
            dots: [],
            isPlayer: false,
            isDefending: false,
            isBerserk: false,
            damageReduction: 0,
            damageReductionTurns: 0,
            manaShieldActive: false,
            manaShieldTurns: 0,
            scalingFactor: Math.max(1, levelScaleStats + (xpScaling * 0.02)),
        };

        // Psychological Profile Logic
        const weaknessSkillLevel = gameStore.skills[enemyDef.weaknessSkill]?.level || 1;
        const affinitySkillLevel = gameStore.skills[enemyDef.affinitySkill]?.level || 1;

        const weaknessActive = weaknessSkillLevel >= enemyDef.thresholdLevel;
        const affinityActive = affinitySkillLevel < enemyDef.thresholdLevel;

        const playerDamageModifier = weaknessActive ? 1.08 : 1.0;
        const enemyDamageModifier = affinityActive ? 1.08 : 1.0;

        // Apply Floor Modifiers natively
        const activeFloorModifier = campaignStore.currentFloorModifier;
        if (activeFloorModifier && context === 'arena') {
            const effect = activeFloorModifier.effect;
            const mult = effect.multiplier || 1.0;

            if (effect.stat === 'hp') {
                enemy.maxHp = Math.round(enemy.maxHp * mult);
                enemy.hp = enemy.maxHp;
            } else if (effect.stat === 'atk') {
                if (mult < 1.0) player.atk = Math.round(player.atk * mult); // 'Void Aura' nerfs player
                else enemy.atk = Math.round(enemy.atk * mult);
            } else if (effect.stat === 'def') {
                enemy.def = Math.round(enemy.def * mult);
            } else if (effect.stat === 'spd') {
                player.spd = Math.round(player.spd * mult);
                enemy.spd = Math.round(enemy.spd * mult);
            } else if (effect.stat === 'mana') {
                player.manaRegen = Math.round(player.manaRegen * mult);
            }
        }

        const isGoldenSlime = enemyId === 'golden_slime';
        const turnOrder = [player, enemy]
            .sort((a, b) => b.spd - a.spd)
            .map(c => c.id);

        set({
            phase: 'prep', // Start in prep phase
            player,
            enemy,
            turnOrder,
            currentTurn: turnOrder[0],
            turnNumber: 1,
            combatLog: [
                { message: `Battle Start! ${enemyDef.name} appears!`, type: 'info' },
                { message: enemyDef.openingLine, type: 'info' }, // Show opening line
                { message: `${ELEMENT_ICONS[enemyDef.element]} ${enemyDef.name} is ${enemyDef.element} element`, type: 'element' },
                ...(isGoldenSlime ? [{ message: `✨ RARE ENCOUNTER! Defeat it in 3 turns for 500 gold!`, type: 'info' as const }] : []),
            ],
            selectedAbility: null,
            lastDamage: null,
            isGoldenSlime,
            goldenSlimeTurnsRemaining: 3,
            currentMP: gameStore.getMaxMP(),
            maxMP: gameStore.getMaxMP(),
            equippedSpells: get().equippedSpells.length === 0
                ? useMagicStore.getState().ownedSpells.slice(0, 2)
                : get().equippedSpells,
            bossPhase: 1,
            playerDamageModifier,
            enemyDamageModifier,
            weaknessActive,
            affinityActive,
            activeFloorModifier,
            activeRunBuffs: campaignStore.activeRunBuffs,
            context,
            conquestTier,
            conquestEnemyPower,
        });
    },

    startBattle: () => {
        const { turnOrder } = get();
        set({ phase: turnOrder[0] === 'player' ? 'select_action' : 'enemy_turn', introGracePeriod: true });

        // Always give 3-second grace period before enemy can attack
        // If enemy goes first, delay their action
        if (turnOrder[0] !== 'player') {
            setTimeout(() => {
                set({ introGracePeriod: false });
                get().executeEnemyAction();
            }, 3000);
        } else {
            // If player goes first, just clear the grace flag after 3s
            setTimeout(() => set({ introGracePeriod: false }), 3000);
        }
    },

    selectAbility: (ability: Ability) => {
        const { player, phase } = get();
        if (phase !== 'select_action' || !player) return;

        // Check cooldown
        if (player.cooldowns[ability.id] > 0) return;

        // Check energy for ultimate
        if (ability.type === 'ultimate' && player.energy < ability.energyCost) return;

        set({ selectedAbility: ability });
    },

    executePlayerAction: () => {
        const { player, enemy, selectedAbility, phase } = get();
        if (phase !== 'select_action' || !player || !enemy || !selectedAbility) return;

        set({ phase: 'executing' });

        // Apply damage
        const damage = get().applyDamage(player, enemy, selectedAbility);

        // Update cooldowns
        const newCooldowns = { ...player.cooldowns };
        if (selectedAbility.cooldown > 0) {
            newCooldowns[selectedAbility.id] = selectedAbility.cooldown;
        }

        // Consume energy for ultimate
        let newEnergy = player.energy;
        if (selectedAbility.type === 'ultimate') {
            newEnergy = 0;
        } else {
            // Gain energy on non-ultimate attacks
            newEnergy = Math.min(100, newEnergy + 20);
        }

        // Apply self effects (buffs from ability)
        let newBuffs = [...player.buffs];
        if (selectedAbility.effects?.buff) {
            newBuffs.push({
                stat: selectedAbility.effects.buff.stat,
                amount: selectedAbility.effects.buff.amount,
                turnsLeft: selectedAbility.effects.buff.turns,
            });
        }

        // Update player state
        const updatedPlayer = {
            ...player,
            cooldowns: newCooldowns,
            energy: newEnergy,
            buffs: newBuffs,
        };

        const newHp = enemy.hp - damage;

        // Check for victory
        if (newHp <= 0) {
            set({
                phase: 'victory',
                player: updatedPlayer,
                enemy: { ...enemy, hp: 0 },
                selectedAbility: null,
                combatLog: [
                    ...get().combatLog,
                    { message: `🏆 Victory! ${enemy.name} defeated!`, type: 'victory' },
                ],
            });
            return;
        }

        set({
            player: updatedPlayer,
            enemy: { ...enemy, hp: newHp },
            selectedAbility: null,
        });

        // End player turn
        setTimeout(() => get().endTurn(), 800);
    },

    executeEnemyAction: () => {
        const { player, enemy } = get();
        if (!player || !enemy) return;

        // Choose ability: prioritize ultimates when full energy, then skills off cooldown
        let chosenAbility = enemy.abilities[0]; // Default to basic attack

        // Check for ultimate
        const ultimate = enemy.abilities.find(a => a.type === 'ultimate');
        if (ultimate && enemy.energy >= ultimate.energyCost) {
            chosenAbility = ultimate;
        } else {
            // Try to use a skill that's off cooldown
            const availableSkills = enemy.abilities.filter(
                a => a.type === 'skill' && (!enemy.cooldowns[a.id] || enemy.cooldowns[a.id] <= 0)
            );
            if (availableSkills.length > 0) {
                chosenAbility = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            }
        }

        set({ phase: 'executing' });

        // Apply damage
        const damage = get().applyDamage(enemy, player, chosenAbility);

        // Update cooldowns
        const newCooldowns = { ...enemy.cooldowns };
        if (chosenAbility.cooldown > 0) {
            newCooldowns[chosenAbility.id] = chosenAbility.cooldown;
        }

        // Update energy
        let newEnergy = enemy.energy;
        if (chosenAbility.type === 'ultimate') {
            newEnergy = 0;
        } else {
            newEnergy = Math.min(100, newEnergy + 15);
        }

        // Update enemy state
        const updatedEnemy = {
            ...enemy,
            cooldowns: newCooldowns,
            energy: newEnergy,
        };

        // Check for defeat
        if (player.hp - damage <= 0) {
            set({
                phase: 'defeat',
                player: { ...player, hp: 0 },
                enemy: updatedEnemy,
                combatLog: [
                    ...get().combatLog,
                    { message: `💀 Defeated... But you can try again!`, type: 'defeat' },
                ],
            });
            return;
        }

        set({
            player: { ...player, hp: player.hp - damage },
            enemy: updatedEnemy,
        });

        // End enemy turn
        setTimeout(() => get().endTurn(), 800);
    },

    endTurn: () => {
        const { player, enemy, currentTurn, turnOrder, turnNumber } = get();
        if (!player || !enemy) return;

        // Tick down cooldowns for current combatant
        const current = currentTurn === 'player' ? player : enemy;
        const newCooldowns: Record<string, number> = {};
        Object.entries(current.cooldowns).forEach(([id, cd]) => {
            if (cd > 1) newCooldowns[id] = cd - 1;
        });

        // Tick down buffs/debuffs
        const tickedBuffs = current.buffs
            .map(b => ({ ...b, turnsLeft: b.turnsLeft - 1 }))
            .filter(b => b.turnsLeft > 0);
        const tickedDebuffs = current.debuffs
            .map(d => ({ ...d, turnsLeft: d.turnsLeft - 1 }))
            .filter(d => d.turnsLeft > 0);

        // Apply DOTs
        let dotDamage = 0;
        const tickedDots = current.dots
            .map(d => {
                dotDamage += d.damage;
                return { ...d, turnsLeft: d.turnsLeft - 1 };
            })
            .filter(d => d.turnsLeft > 0);

        // Reset isDefending for the character starting their turn
        // Regenerate mana at the end of turn
        const updatedCurrent = {
            ...current,
            cooldowns: newCooldowns,
            buffs: tickedBuffs,
            debuffs: tickedDebuffs,
            dots: tickedDots,
            isDefending: false, // Reset defense at start of turn
            mana: Math.min(current.maxMana, current.mana + current.manaRegen), // Mana regen
            hp: current.isPlayer
                ? Math.max(0, current.hp - dotDamage)
                : current.hp,
        };

        // Get next in turn order
        const currentIndex = turnOrder.indexOf(currentTurn);
        const nextIndex = (currentIndex + 1) % turnOrder.length;
        const nextTurn = turnOrder[nextIndex];

        const newTurnNumber = nextIndex === 0 ? turnNumber + 1 : turnNumber;

        // Log for DOT damage
        let newLog = [...get().combatLog];
        if (dotDamage > 0) {
            newLog.push({
                message: `${current.name} takes ${dotDamage} DOT damage!`,
                type: 'damage',
                value: dotDamage,
            });
        }

        // Check Golden Slime escape (at the end of player's turn)
        const { isGoldenSlime, goldenSlimeTurnsRemaining } = get();
        if (isGoldenSlime && currentTurn === 'player') {
            const newTurnsRemaining = goldenSlimeTurnsRemaining - 1;

            if (newTurnsRemaining <= 0) {
                // Golden Slime escapes!
                set({
                    phase: 'escaped',
                    goldenSlimeTurnsRemaining: 0,
                    combatLog: [
                        ...newLog,
                        { message: `💨 The Golden Slime escaped!`, type: 'info' },
                        { message: `Better luck next time...`, type: 'defeat' },
                    ],
                });
                return;
            }

            // Update turns remaining and warn player
            newLog.push({
                message: `⚠️ Golden Slime will escape in ${newTurnsRemaining} turn${newTurnsRemaining > 1 ? 's' : ''}!`,
                type: 'info',
            });
            set({ goldenSlimeTurnsRemaining: newTurnsRemaining });
        }


        // Decrement pet ability cooldown at start of player turn
        const { petAbilityCooldown } = get();
        const newPetCooldown = nextTurn === 'player' && petAbilityCooldown > 0
            ? petAbilityCooldown - 1
            : petAbilityCooldown;

        set({
            player: currentTurn === 'player' ? updatedCurrent as Combatant : player,
            enemy: currentTurn !== 'player' ? updatedCurrent as Combatant : enemy,
            currentTurn: nextTurn,
            turnNumber: newTurnNumber,
            phase: nextTurn === 'player' ? 'select_action' : 'enemy_turn',
            combatLog: newLog,
            petAbilityCooldown: newPetCooldown,
        });

        // If enemy turn, execute after delay
        if (nextTurn !== 'player') {
            setTimeout(() => get().executeEnemyAction(), 600);
        }
    },

    playerDefend: () => {
        const { player } = get();
        if (!player) return;

        set({
            player: { ...player, isDefending: true, energy: Math.min(100, player.energy + 10) }, // Defending gains some energy
            phase: 'executing',
            combatLog: [
                ...get().combatLog,
                { message: `${player.name} enters a Defensive Stance!`, type: 'info' },
            ],
        });

        setTimeout(() => get().endTurn(), 500);
    },

    usePetAbility: () => {
        const { player, enemy, phase, petAbilityCooldown } = get();
        if (!player || !enemy || phase !== 'select_action') return;
        if (petAbilityCooldown > 0) return;

        const petStore = usePetStore.getState();
        const petDef = petStore.getActivePetDef();
        if (!petDef) return;

        // Use the first active ability by default
        const ability = petDef.abilities[0];
        if (!ability) return;

        set({ phase: 'executing' });

        const logs: CombatLog[] = [];
        logs.push({
            message: `${petStore.name} uses ${ability.icon} ${ability.name}!`,
            type: 'info',
        });

        let updatedPlayer = { ...player };
        let updatedEnemy = { ...enemy };

        // Get player skill levels for scaling
        const gameState = useGameStore.getState();
        const scalingLevel = ability.scalingStat
            ? (gameState.skills[ability.scalingStat]?.level || 1)
            : 1;

        switch (ability.type) {
            case 'heal': {
                const healAmount = Math.round((ability.healBase || 20) + scalingLevel * (ability.healScaling || 0.5));
                updatedPlayer.hp = Math.min(updatedPlayer.maxHp, updatedPlayer.hp + healAmount);
                logs.push({
                    message: `${player.name} heals ${healAmount} HP!`,
                    type: 'heal',
                    value: healAmount,
                });
                break;
            }

            case 'damage':
            case 'extra_damage': {
                const damage = Math.round((ability.baseDamage || 10) + scalingLevel * (ability.scalingFactor || 1.0));
                updatedEnemy.hp = Math.max(0, updatedEnemy.hp - damage);
                logs.push({
                    message: `${enemy.name} takes ${damage} damage!`,
                    type: 'damage',
                    value: damage,
                });
                set({
                    lastDamage: {
                        target: enemy.id,
                        amount: damage,
                        isCrit: false,
                        elementBonus: 1,
                    },
                });
                break;
            }

            case 'buff_atk': {
                const atkBoost = Math.round(player.atk * ((ability.buffValue || 20) / 100));
                updatedPlayer.buffs = [
                    ...updatedPlayer.buffs,
                    { stat: 'atk', amount: atkBoost, turnsLeft: ability.buffDuration || 2 }
                ];
                logs.push({
                    message: `${player.name}'s ATK increased by ${ability.buffValue}%!`,
                    type: 'buff',
                });
                break;
            }

            case 'buff_def': {
                const defBoost = Math.round(player.def * ((ability.buffValue || 20) / 100));
                updatedPlayer.buffs = [
                    ...updatedPlayer.buffs,
                    { stat: 'def', amount: defBoost, turnsLeft: ability.buffDuration || 2 }
                ];
                logs.push({
                    message: `${player.name}'s DEF increased by ${ability.buffValue}%!`,
                    type: 'buff',
                });
                break;
            }

            case 'debuff_def': {
                const defReduction = Math.round(enemy.def * ((ability.buffValue || 20) / 100));
                updatedEnemy.buffs = [
                    ...updatedEnemy.buffs,
                    { stat: 'def', amount: -defReduction, turnsLeft: ability.buffDuration || 2 }
                ];
                logs.push({
                    message: `${enemy.name}'s DEF reduced by ${ability.buffValue}%!`,
                    type: 'debuff',
                });
                break;
            }

            case 'reduce_damage': {
                updatedPlayer.damageReduction = ability.buffValue || 30;
                updatedPlayer.damageReductionTurns = ability.buffDuration || 2;
                logs.push({
                    message: `${player.name} gains ${ability.buffValue}% damage reduction!`,
                    type: 'buff',
                });
                break;
            }
        }

        // Check for victory
        if (updatedEnemy.hp <= 0) {
            set({
                phase: 'victory',
                player: updatedPlayer,
                enemy: updatedEnemy,
                petAbilityCooldown: ability.cooldown,
                combatLog: [
                    ...get().combatLog,
                    ...logs,
                    { message: `🏆 Victory! ${enemy.name} defeated!`, type: 'victory' },
                ],
            });
            return;
        }

        set({
            player: updatedPlayer,
            enemy: updatedEnemy,
            petAbilityCooldown: ability.cooldown,
            combatLog: [...get().combatLog, ...logs],
        });

        // End player turn
        setTimeout(() => get().endTurn(), 800);
    },

    applyDamage: (attacker: Combatant, defender: Combatant, ability: Ability) => {
        // Calculate effective stats
        let effectiveAtk = attacker.atk;
        if (ability.isMagic && attacker.isPlayer) {
            effectiveAtk = useGameStore.getState().getMagicAttack();
        }

        attacker.buffs.forEach(b => { if (b.stat === 'atk') effectiveAtk += b.amount; });
        attacker.debuffs.forEach(d => { if (d.stat === 'atk') effectiveAtk -= d.amount; });

        const effectiveDef = calculateEffectiveDefense(defender, ability.isMagic);

        // Crit check - spells don't crit
        const isCrit = ability.isMagic ? false : Math.random() < attacker.critRate;
        const critMult = isCrit ? attacker.critDmg : 1.0;

        // Tower Expansion Modifiers
        let towerMult = 1.0;
        if (attacker.isPlayer) {
            towerMult = get().playerDamageModifier;
        } else {
            towerMult = get().enemyDamageModifier;
        }

        // Element multiplier
        const elementMult = getElementMultiplier(ability.element, defender.element);

        // New Mitigation-based Formula
        const rawDamage = effectiveAtk * ability.damageMultiplier * critMult * elementMult * towerMult;
        const mitigatedDamage = rawDamage * (100 / (100 + effectiveDef));

        // Incoming damage modifiers
        let incomingModifiers = 1.0;

        // Defensive Stance (50% reduction)
        if (defender.isDefending) {
            incomingModifiers *= 0.5;
        }

        // Pet ability damage reduction
        if (defender.damageReduction > 0 && defender.damageReductionTurns > 0) {
            incomingModifiers *= (1 - defender.damageReduction / 100);
        }

        // Variance (+/- 5%)
        incomingModifiers *= (0.95 + Math.random() * 0.1);

        let finalDamage = Math.max(1, Math.round(mitigatedDamage * incomingModifiers));

        // Mana Shield absorption (2 MP = 1 HP damage absorbed)
        let mpAbsorbed = 0;
        if (defender.isPlayer && defender.manaShieldActive && defender.manaShieldTurns > 0) {
            const state = get();
            const availableMP = state.currentMP;
            const maxAbsorbable = Math.floor(availableMP / 2);
            const damageToAbsorb = Math.min(finalDamage, maxAbsorbable);

            if (damageToAbsorb > 0) {
                mpAbsorbed = damageToAbsorb * 2;
                finalDamage -= damageToAbsorb;
                set({ currentMP: availableMP - mpAbsorbed });
            }
        }

        // Ensure final damage is rounded
        finalDamage = Math.round(finalDamage);

        // Apply HP deduction
        defender.hp = Math.max(0, defender.hp - finalDamage);

        // Tower Expansion: Boss Phase 2 Check
        const enemyDef = ENEMY_DB[defender.id];
        if (!defender.isPlayer && enemyDef?.isBoss && get().bossPhase === 1 && defender.hp < (defender.maxHp / 2)) {
            set({ bossPhase: 2 });
            const bossLogs: CombatLog[] = [
                { message: `💢 ${defender.name} IS GETTING SERIOUS!`, type: 'info' },
                { message: `Phase 2: ATK and SPD increased!`, type: 'buff' },
            ];
            // Buff the boss
            defender.atk = Math.round(defender.atk * 1.25);
            defender.spd = Math.round(defender.spd * 1.2);
            set(state => ({ combatLog: [...state.combatLog, ...bossLogs] }));
        }

        // Log the action
        const logs: CombatLog[] = [];
        logs.push({
            message: `${attacker.name} uses ${ability.icon} ${ability.name}!`,
            type: 'info',
        });

        if (elementMult > 1) {
            logs.push({ message: `Super effective!`, type: 'element' });
        } else if (elementMult < 1) {
            logs.push({ message: `Not very effective...`, type: 'element' });
        }

        if (isCrit) {
            logs.push({ message: `Critical hit!`, type: 'crit' });
        }

        logs.push({
            message: `${defender.name} takes ${finalDamage} damage!`,
            type: 'damage',
            value: finalDamage,
        });

        // Apply debuffs to defender
        if (ability.effects?.debuff) {
            defender.debuffs.push({
                stat: ability.effects.debuff.stat,
                amount: ability.effects.debuff.amount,
                turnsLeft: ability.effects.debuff.turns,
            });
            logs.push({
                message: `${defender.name}'s ${ability.effects.debuff.stat.toUpperCase()} decreased!`,
                type: 'debuff',
            });
        }

        // Apply DOT
        if (ability.effects?.dot) {
            defender.dots.push({
                damage: ability.effects.dot.damage,
                turnsLeft: ability.effects.dot.turns,
            });
            logs.push({
                message: `${defender.name} is burning!`,
                type: 'debuff',
            });
        }

        // Apply heal to attacker
        if (ability.effects?.heal) {
            const healAmount = Math.round(attacker.maxHp * ability.effects.heal / 100);
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
            logs.push({
                message: `${attacker.name} heals ${healAmount} HP!`,
                type: 'heal',
                value: healAmount,
            });
        }

        set({
            combatLog: [...get().combatLog, ...logs],
            lastDamage: {
                target: defender.id,
                amount: finalDamage,
                isCrit,
                elementBonus: elementMult,
            },
        });

        return finalDamage;
    },

    resetBattle: () => {
        set({
            phase: 'idle',
            player: null,
            enemy: null,
            turnOrder: [],
            currentTurn: '',
            turnNumber: 0,
            combatLog: [],
            selectedAbility: null,
            lastDamage: null,
            isGoldenSlime: false,
            goldenSlimeTurnsRemaining: 3,
            petAbilityCooldown: 0,
            petAbilityUsedThisBattle: false,
        });
    },

    castSpell: (spellId: string) => {
        const { player, enemy, phase, currentMP } = get();
        if (!player || !enemy || phase !== 'select_action') return;

        const spell = SPELL_DB[spellId];
        if (!spell) return;

        // Check if player has the spell
        const magicStore = useMagicStore.getState();
        if (!magicStore.hasSpell(spellId)) return;

        // Check MP cost
        if (currentMP < spell.mpCost) {
            set({
                combatLog: [...get().combatLog, {
                    message: `Not enough MP! Need ${spell.mpCost}, have ${currentMP}`,
                    type: 'info'
                }],
            });
            return;
        }

        // Deduct MP
        const newMP = currentMP - spell.mpCost;

        const initialLogs: CombatLog[] = [{
            message: `${player.name} casts ${spell.icon} ${spell.name}!`,
            type: 'info'
        }];

        // Consume MP and start action
        set({
            combatLog: [...get().combatLog, ...initialLogs],
            currentMP: newMP,
            phase: 'executing'
        });

        let updatedPlayer = { ...player };
        let updatedEnemy = { ...enemy };

        // Apply spell effects
        if (spell.effect.type === 'heal') {
            const healAmount = Math.round(player.maxHp * (spell.effect.value / 100));
            const newHp = Math.min(player.maxHp, player.hp + healAmount);
            updatedPlayer.hp = newHp;
            set({
                player: updatedPlayer,
                combatLog: [...get().combatLog, {
                    message: `Healed ${healAmount} HP!`,
                    type: 'heal',
                    value: healAmount
                }]
            });
        } else if (spell.effect.type === 'damage') {
            const tempAbility: Ability = {
                id: spell.id,
                name: spell.name,
                type: 'skill',
                description: spell.description,
                icon: spell.icon,
                element: 'neutral', // Spells currently default to neutral
                isMagic: true, // Flags for MATK and temporary MDEF
                damageMultiplier: spell.effect.value,
                cooldown: 0,
                energyCost: 0,
            };

            // applyDamage mutates updatedEnemy's HP and pushes its own logs
            get().applyDamage(updatedPlayer, updatedEnemy, tempAbility);

            // Sync mutated objects to store
            set({ enemy: updatedEnemy, player: updatedPlayer });

        } else if (spell.effect.type === 'shield') {
            updatedPlayer.manaShieldActive = true;
            updatedPlayer.manaShieldTurns = spell.effect.value;
            set({
                player: updatedPlayer,
                combatLog: [...get().combatLog, {
                    message: `Mana Shield activated for ${spell.effect.value} turns!`,
                    type: 'buff'
                }]
            });
        }

        // Add extra energy for casting spells (+15% faster ultimate)
        const bonusEnergy = Math.min(100 - updatedPlayer.energy, 15);
        updatedPlayer.energy += bonusEnergy;
        set({ player: updatedPlayer }); // Final player sync

        // Check for victory
        if (updatedEnemy.hp <= 0) {
            setTimeout(() => {
                set({
                    phase: 'victory',
                    combatLog: [...get().combatLog, { message: '🎉 Victory!', type: 'victory' }],
                });
            }, 800);
            return;
        }

        // End player turn
        setTimeout(() => get().endTurn(), 800);
    },

    restoreMP: (amount: number) => {
        const { maxMP, currentMP } = get();
        set({
            currentMP: Math.min(maxMP, currentMP + amount),
        });
    },
}));
