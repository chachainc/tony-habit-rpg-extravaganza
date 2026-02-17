import { useEffect, useState } from 'react';
import { useBattleStore, type Combatant } from '../../store/useBattleStore';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { usePetStore } from '../../store/usePetStore';
import { useCampaignStore } from '../../store/useCampaignStore';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import './ArenaBattlefield.css';

// ... (imports remain the same)

// ...

// Pet
const { activePet } = usePetStore();
const petItem = activePet ? ITEM_DATABASE[activePet] : null;
const [floatingTexts, setFloatingTexts] = useState<Array<{ id: number, text: string, type: 'damage' | 'heal' | 'crit', x: number, y: number }>>([]);
const [hitTargetId, setHitTargetId] = useState<string | null>(null);

// Watch for damage/healing to spawn floating text
useEffect(() => {
    if (!lastDamage) return;

    const isPlayerTarget = lastDamage.target === 'player';
    // Randomize position slightly around the target center
    const xOffset = Math.random() * 10 - 5;
    const targetX = isPlayerTarget ? 25 + xOffset : 75 + xOffset; // % positions
    const targetY = 40;

    const newText = {
        id: Date.now(),
        text: lastDamage.amount.toString(),
        type: (lastDamage.isCrit ? 'crit' : 'damage') as 'damage' | 'heal' | 'crit',
        x: targetX,
        y: targetY
    };

    setFloatingTexts(prev => [...prev, newText]);
    setHitTargetId(lastDamage.target);

    // ...

    // Clear hit effect shortly
    const timer = setTimeout(() => setHitTargetId(null), 500);
    return () => clearTimeout(timer);
}, [lastDamage]);

// Clean up old texts
useEffect(() => {
    if (floatingTexts.length > 0) {
        const timer = setTimeout(() => {
            setFloatingTexts(prev => prev.slice(1));
        }, 1000);
        return () => clearTimeout(timer);
    }
}, [floatingTexts]);

if (!player || !enemy) return <div>Loading Combat...</div>;

const bgImage = getBackgroundForFloor(currentFloor);
const enemyImage = ENEMY_IMAGES[enemy.id];

return (
    <div className="battlefield-layout">
        {/* Background */}
        <div className="battlefield-background">
            <div className="bg-layer far" style={{ backgroundImage: `url(${bgImage})` }} />
            <div className="bg-overlay" />
        </div>

        {/* Header */}
        <div className="battlefield-header">
            <div className="combatant-name-header ally" style={{ width: '200px' }}>{player.name}</div>
            <div className="vs-badge">
                <div className="vs-text">VS</div>
            </div>
            <div className="combatant-name-header enemy" style={{ width: '200px' }}>{enemy.name}</div>

            <div className="turn-counter">
                Turn {turnNumber} {isGoldenSlime ? '(Golden Slime!)' : ''}
            </div>
        </div>

        {/* Stage */}
        <div className="battlefield-stage">
            {/* Allies Zone */}
            <div className="squad-zone allies">
                {/* Pet could go here as a mini unit */}
                {petItem && (
                    <div className="pet-mini" style={{ position: 'absolute', left: 0, bottom: 0, zIndex: 4 }}>
                        <span style={{ fontSize: '2rem' }}>{petItem.icon}</span>
                    </div>
                )}

                <UnitEntity
                    combatant={player}
                    isAlly={true}
                    isActive={phase === 'executing' && useBattleStore.getState().currentTurn === 'player'}
                    isHit={hitTargetId === 'player'}
                    imageSrc={playerSpriteImg}
                />
            </div>

            {/* Enemies Zone */}
            <div className="squad-zone enemies">
                <UnitEntity
                    combatant={enemy}
                    isAlly={false}
                    isActive={phase === 'executing' && useBattleStore.getState().currentTurn !== 'player'}
                    isHit={hitTargetId === enemy.id}
                    imageSrc={enemyImage}
                />
            </div>
        </div>

        {/* Floating Numbers overlay */}
        <div className="floating-number-container">
            {floatingTexts.map(ft => (
                <div
                    key={ft.id}
                    className={`floating-number ${ft.type}`}
                    style={{ left: `${ft.x}%`, top: `${ft.y}%` }}
                >
                    {ft.text}
                </div>
            ))}
        </div>
    </div>
);
};

// Need access to ITEM_DATABASE for pet icon, simple import
import { ITEM_DATABASE } from '../../data/items';
