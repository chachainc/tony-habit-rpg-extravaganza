import { useConquestStore } from '../src/store/useConquestStore';
import { useCombatStore } from '../src/store/useCombatStore';
import { useGameStore } from '../src/store/useGameStore';
import { usePetStore } from '../src/store/usePetStore';
import { useBattleStore } from '../src/store/useBattleStore';
import { CONQUEST_MAP_NODES, CONQUEST_BOSS_POOL } from '../src/data/conquest';
import { getEnemyDefeatGoldReward } from '../src/utils/enemyRewards';

async function runSim() {
    console.log("Starting Conquest Simulation...");

    const conquest = useConquestStore.getState();
    const game = useGameStore.getState();
    
    // Setup initial state
    game.addGems(100);
    conquest.dailyTickets = 5;

    console.log("1. Starting a new run");
    conquest.startRun();
    
    let state = useConquestStore.getState();
    if (state.runHP <= 0 || state.runMaxHP <= 0) {
        throw new Error("Run HP not initialized correctly");
    }
    console.log(`Run started with HP: ${state.runHP}/${state.runMaxHP}`);
    
    // Find a combat node
    console.log("2. Moving to nodes");
    const map = state.generatedMap;
    if (!map || map.length === 0) throw new Error("Map not generated");
    
    const startNode = map[0];
    conquest.movePlayer(startNode.id);
    
    // Give player some sigils for testing
    conquest.addSigils(100);
    
    // Simulate resolving a node
    console.log("3. Resolving a node");
    // Assume we win a combat node and trigger grantSpireReward
    const initialExp = game.levelProgress;
    conquest.grantSpireReward(10, 5, 0);
    const postExp = useGameStore.getState().levelProgress;
    
    if (postExp > initialExp) {
        throw new Error(`XP was granted! Initial: ${initialExp}, Post: ${postExp}`);
    } else {
        console.log("Verified: No XP granted from grantSpireReward");
    }

    // Check boss
    console.log("4. Simulating Boss resolution");
    conquest.grantSpireReward(50, 10, 1);
    
    console.log("5. Checking combat formulas");
    import('../src/store/useCombatFormulas').then((formulas) => {
        // Just verify imports work without crashing
        console.log("Combat formulas loaded.");
    });

    console.log("Simulating run completion");
    conquest.completeRun(true);
    if (useConquestStore.getState().runsCompleted === 0) {
         throw new Error("runsCompleted didn't increment");
    }

    console.log("Simulation complete. No errors.");
}

runSim().catch(e => {
    console.error("Simulation failed:", e);
    process.exit(1);
});
