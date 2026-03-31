import { useState, useMemo, useCallback } from 'react';
import { X, Heart, Gift, Sparkles } from 'lucide-react';
import { usePetStore, PET_DATABASE } from '../../store/usePetStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useConquestStore } from '../../store/useConquestStore';
import { Panel } from '../../components/ui/Panel';
import './RoomPanels.css';

const showFloatingFeedback = (text: string, type: 'xp' | 'gold' = 'xp') => {
    const el = document.createElement('div');
    el.className = `floating-feedback floating-feedback--${type}`;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
};

const FEED_COST = 10;
const PLAY_COOLDOWN_HOURS = 12;

const DAILY_ITEMS = [
    { name: 'Bone Fragment', icon: '🦴', chance: 0.4 },
    { name: 'Shiny Pebble', icon: '💎', chance: 0.2 },
    { name: 'Feather', icon: '🪶', chance: 0.25 },
    { name: 'Lucky Clover', icon: '🍀', chance: 0.1 },
    { name: 'Gold Nugget', icon: '🪙', chance: 0.05 },
];

const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const PetInteractionPanel = ({ onClose }: { onClose: () => void }) => {
    const equippedPetId = usePetStore(s => s.equippedPetId);
    const petName = usePetStore(s => s.name);
    const gold = useCurrencyStore(s => s.gold);

    const [lastFed, setLastFed] = useState<string | null>(null);
    const [lastPlayedTs, setLastPlayedTs] = useState<number | null>(null);
    const [droppedItem, setDroppedItem] = useState<{ name: string; icon: string } | null>(null);
    const [feedAnim, setFeedAnim] = useState(false);
    const [playAnim, setPlayAnim] = useState(false);

    const petDef = equippedPetId ? PET_DATABASE[equippedPetId] : null;
    const displayName = petName || petDef?.name || 'Your Pet';
    const petIcon = petDef?.icon || '🐾';

    const today = getTodayStr();
    const canFeed = gold >= FEED_COST && lastFed !== today;
    const hoursSincePlay = lastPlayedTs ? (Date.now() - lastPlayedTs) / 3600000 : PLAY_COOLDOWN_HOURS;
    const canPlay = hoursSincePlay >= PLAY_COOLDOWN_HOURS;

    const handleFeed = useCallback(() => {
        if (gold < FEED_COST || lastFed === getTodayStr()) return;
        useCurrencyStore.getState().spendGold(FEED_COST);

        // Give 1 random rare resource instead of gold
        const roll = Math.random();
        let rewardLabel = '';
        if (roll < 0.33) {
            useConquestStore.getState().addSigils(1);
            rewardLabel = '🔱 +1 Sigil!';
        } else if (roll < 0.66) {
            useCurrencyStore.getState().addBalloons(1);
            rewardLabel = '🎈 +1 Balloon!';
        } else {
            useCurrencyStore.getState().addShmeckles(1);
            rewardLabel = '🐌 +1 Shmeckle!';
        }

        setLastFed(getTodayStr());
        setFeedAnim(true);
        showFloatingFeedback(rewardLabel, 'gold');
        setTimeout(() => setFeedAnim(false), 1000);
    }, [gold, lastFed]);

    const handlePlay = useCallback(() => {
        if (lastPlayedTs && (Date.now() - lastPlayedTs) / 3600000 < PLAY_COOLDOWN_HOURS) return;
        const reward = 5 + Math.floor(Math.random() * 15);
        useCurrencyStore.getState().addGold(reward, { exact: true });
        // No XP from playing — just fun and gold!
        setLastPlayedTs(Date.now());
        setPlayAnim(true);
        showFloatingFeedback(`+${reward}g`, 'gold');

        // Random item drop
        const roll = Math.random();
        let cum = 0;
        for (const item of DAILY_ITEMS) {
            cum += item.chance;
            if (roll < cum) { setDroppedItem(item); break; }
        }
        setTimeout(() => { setPlayAnim(false); setDroppedItem(null); }, 3000);
    }, [lastPlayedTs]);

    const bondLevel = useMemo(() => {
        return { level: 0, label: 'Companion', icon: '💚' };
    }, []);

    if (!petDef) {
        return (
            <Panel variant="glass" className="room-panel">
                <div className="panel-header">
                    <h2>🐾 Pet Companion</h2>
                    <button className="panel-close-btn" onClick={onClose}><X size={24} /></button>
                </div>
                <div className="pet-empty-state">
                    <span className="pet-empty-icon">🐾</span>
                    <p>No pet active yet!</p>
                    <p className="pet-empty-hint">Visit the Pet Shop or pull the Gacha to adopt a companion.</p>
                </div>
            </Panel>
        );
    }

    return (
        <Panel variant="glass" className="room-panel pet-interaction-panel">
            <div className="panel-header">
                <h2>🐾 {displayName}</h2>
                <button className="panel-close-btn" onClick={onClose}><X size={24} /></button>
            </div>

            {/* Pet display */}
            <div className="pet-display-section">
                <div className={`pet-big-icon ${feedAnim ? 'pet-anim-feed' : ''} ${playAnim ? 'pet-anim-play' : ''}`}>
                    {petIcon}
                </div>
                <div className="pet-bond-badge">
                    <span>{bondLevel.icon} {bondLevel.label}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="pet-actions-grid">
                <button
                    className={`pet-action-btn pet-action-btn--feed ${!canFeed ? 'disabled' : ''}`}
                    onClick={handleFeed}
                    disabled={!canFeed}
                >
                    <Heart size={20} />
                    <span>Feed</span>
                    <small>{FEED_COST}g • Nice job! 🐾</small>
                    {lastFed === today && <span className="pet-action-done">✅ Fed today</span>}
                </button>

                <button
                    className={`pet-action-btn pet-action-btn--play ${!canPlay ? 'disabled' : ''}`}
                    onClick={handlePlay}
                    disabled={!canPlay}
                >
                    <Sparkles size={20} />
                    <span>Play</span>
                    <small>5-20g + item</small>
                    {!canPlay && <span className="pet-action-cooldown">⏳ {Math.ceil(PLAY_COOLDOWN_HOURS - hoursSincePlay)}h left</span>}
                </button>
            </div>

            {/* Dropped item toast */}
            {droppedItem && (
                <div className="pet-item-drop">
                    <Gift size={16} />
                    <span>Found: {droppedItem.icon} {droppedItem.name}!</span>
                </div>
            )}

            {/* Pet info */}
            <div className="pet-info-section">
                <h4>Abilities</h4>
                <div className="pet-abilities-list">
                    {petDef.abilities.map(a => (
                        <div key={a.id} className="pet-ability-chip">
                            <span>{a.icon} {a.name}</span>
                            <small>{a.description}</small>
                        </div>
                    ))}
                </div>
                <div className="pet-passive-info">
                    <strong>{petDef.passive.icon} {petDef.passive.name}</strong>
                    <span>{petDef.passive.description}</span>
                </div>
            </div>
        </Panel>
    );
};
