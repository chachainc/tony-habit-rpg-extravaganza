import { useBattleStore } from '../src/store/useBattleStore';
import { useCampaignStore } from '../src/store/useCampaignStore';
import { useCurrencyStore } from '../src/store/useCurrencyStore';
import { usePetStore } from '../src/store/usePetStore';

// Mock some things that might break in headless
global.window = {} as any;
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
} as any;

async function runSim() {
    console.log("Starting Arena Headless Simulation");

    const battle = useBattleStore.getState();
    const campaign = useCampaignStore.getState();
    const currency = useCurrencyStore.getState();
    const pets = usePetStore.getState();

    // Give some initial state
    currency.addGold(0);
    const startGold = currency.gold;

    console.log("--- BATTLE 1: Light Attacks ---");
    battle.initBattle('fatigue_wraith');
    battle.startBattle();

    while (useBattleStore.getState().phase === 'select_action') {
        const p = useBattleStore.getState().player;
        if (!p) break;
        const strike = p.abilities.find(a => a.id === 'light_strike') || p.abilities[0];
        useBattleStore.getState().selectAbility(strike);
        useBattleStore.getState().executePlayerAction();
    }
    
    console.log("Battle 1 ended in phase:", useBattleStore.getState().phase);
    console.log("Enemy HP:", useBattleStore.getState().enemy?.hp);
    console.log("Player HP:", useBattleStore.getState().player?.hp);
    
    // reset for next
    useBattleStore.getState().resetBattle();

    console.log("--- BATTLE 2: Spells ---");
    battle.initBattle('chaos_of_clutter');
    battle.startBattle();
    
    useBattleStore.setState({ equippedSpells: ['fireball'] }); // Mock equipped spell
    
    while (useBattleStore.getState().phase === 'select_action') {
        const p = useBattleStore.getState().player;
        if (!p) break;
        
        const mp = useBattleStore.getState().currentMP;
        if (mp >= 10 && useBattleStore.getState().spellCooldownTurns === 0) {
            useBattleStore.getState().castSpell('fireball');
        } else {
            const strike = p.abilities.find(a => a.id === 'light_strike') || p.abilities[0];
            useBattleStore.getState().selectAbility(strike);
            useBattleStore.getState().executePlayerAction();
        }
    }
    
    console.log("Battle 2 ended in phase:", useBattleStore.getState().phase);
    useBattleStore.getState().resetBattle();

    console.log("Simulation Complete.");
}

runSim().catch(console.error);
