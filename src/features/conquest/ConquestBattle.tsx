import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useBattleStore } from '../../store/useBattleStore';
import { useConquestStore } from '../../store/useConquestStore';
import { useGameStore } from '../../store/useGameStore';
import { Arena } from '../arena/Arena';

export const ConquestBattle = () => {
    const navigate = useNavigate();
    const battle = useBattleStore();
    const conquest = useConquestStore();
    const game = useGameStore();
    const [blessingApplied, setBlessingApplied] = useState(false);

    // Run once on mount to scale the enemy by current player level
    useEffect(() => {
        if (!battle.enemy) return;

        // Apply a base 15% player power boost if Shrine Blessing is active
        const hasBlessing = conquest.runBuffs.some(b => b.label.includes('Shrine Blessing: +15% Power'));
        const hasDefBlessing = conquest.runBuffs.some(b => b.label.includes('Shrine Blessing: +15% Block'));
        
        // Find existing modifiers that might have been carried over
        if (!blessingApplied && (hasBlessing || hasDefBlessing) && battle.player) {
            
            // To safely boost stats just for this battle without permanently changing base stats,
            // we will mutate the local battle.player stats. They reset next battle.
            if (hasBlessing) {
                 useBattleStore.setState(state => {
                     if(!state.player) return state;
                     return {
                         player: {
                             ...state.player,
                             atk: Math.floor(state.player.atk * 1.15),
                         }
                     }
                 });
            }
            if (hasDefBlessing) {
                 useBattleStore.setState(state => {
                     if(!state.player) return state;
                     return {
                         player: {
                             ...state.player,
                             def: Math.floor(state.player.def * 1.15),
                         }
                     }
                 });
            }
            
            setBlessingApplied(true);
        }

        // Scale Enemy based on player level + conquest tier
        const playerLevel = game.getGlobalLevel() || 1;
        // Assume tier defaults to 1 if floor is 0
        const conquestTier = conquest.runFloor || 1; 

        // Apply scaling factor. A simple scaling: 
        // 10% per player level spread out, slightly multiplied by conquest tier.
        const scaleFactor = 1 + ((playerLevel * 0.1) * (1 + (conquestTier * 0.05)));

        useBattleStore.setState(state => {
            if (!state.enemy) return state;
            return {
                enemy: {
                    ...state.enemy,
                    maxHp: Math.floor(state.enemy.maxHp * scaleFactor),
                    hp: Math.floor(state.enemy.maxHp * scaleFactor), // reset hp to new max
                    atk: Math.floor(state.enemy.atk * scaleFactor),
                    def: Math.floor(state.enemy.def * scaleFactor),
                }
            };
        });

    }, []); // Run only on mount

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-base)',
            zIndex: 100,
        }}>
            {/* We render the Arena UI component but since it's instantiated here, 
                it acts on the currently initialized battle store and routes back to conquest. */}
            <Arena onClose={() => navigate('/conquest')} />
        </div>
    );
};
