import { useMemo, useState } from 'react';
import { Trophy, X, Star } from 'lucide-react';
import {
    useSkillTrophyStore,
    STRENGTH_TROPHIES,
    CARDIO_TROPHIES,
    HOUSEMAID_TROPHIES,
    SLEEP_TROPHIES,
    LUCK_TROPHIES,
    type SkillTrophyTier
} from '../../store/useSkillTrophyStore';
import { useBookTrophyStore, TROPHY_MILESTONES as BOOK_TROPHIES } from '../../store/useBookTrophyStore';
import { Panel } from '../../components/ui/Panel';
import './RoomPanels.css';

type TrophyCategoryKey = 'strength' | 'cardio' | 'housemaid' | 'sleep' | 'luck' | 'books';

interface CategoryTab {
    id: TrophyCategoryKey;
    label: string;
    icon: string;
    description: string;
}

const CATEGORIES: CategoryTab[] = [
    { id: 'strength', label: 'Might', icon: '⚔️', description: 'Trophies earned from Strength training.' },
    { id: 'cardio', label: 'Speed', icon: '💨', description: 'Trophies earned from Cardio exercises.' },
    { id: 'housemaid', label: 'Chores', icon: '🧹', description: 'Trophies earned from Housemaid tasks.' },
    { id: 'sleep', label: 'Rest', icon: '🛏️', description: 'Trophies earned from consistent Sleep.' },
    { id: 'luck', label: 'Luck', icon: '🍀', description: 'Trophies earned from Rare Gacha Rolls.' },
    { id: 'books', label: 'Wisdom', icon: '📚', description: 'Trophies earned from Reading Books.' },
];

export const TrophyPanel = ({ onClose }: { onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<TrophyCategoryKey>('strength');

    // Stores
    const skillTrophyStore = useSkillTrophyStore();
    const bookTrophyStore = useBookTrophyStore();

    // Map store state to categories
    const categoryData: Record<TrophyCategoryKey, { allTrophies: readonly SkillTrophyTier[] | any[], currentTrophyId: string }> = {
        strength: {
            allTrophies: STRENGTH_TROPHIES,
            currentTrophyId: skillTrophyStore.getCurrentTrophy('strength').id,
        },
        cardio: {
            allTrophies: CARDIO_TROPHIES,
            currentTrophyId: skillTrophyStore.getCurrentTrophy('cardio').id,
        },
        housemaid: {
            allTrophies: HOUSEMAID_TROPHIES,
            currentTrophyId: skillTrophyStore.getCurrentTrophy('housemaid').id,
        },
        sleep: {
            allTrophies: SLEEP_TROPHIES,
            currentTrophyId: skillTrophyStore.getCurrentTrophy('sleep').id,
        },
        luck: {
            allTrophies: LUCK_TROPHIES,
            currentTrophyId: skillTrophyStore.getCurrentTrophy('luck').id,
        },
        books: {
            allTrophies: BOOK_TROPHIES,
            currentTrophyId: bookTrophyStore.getCurrentTrophy().id,
        }
    };

    const currentTabInfo = CATEGORIES.find(c => c.id === activeTab)!;
    const { allTrophies, currentTrophyId } = categoryData[activeTab];

    // Determine lock state: A trophy is "unlocked" if its ID matches currentTrophyId,
    // actually wait, this logic assumes we only show the HIGHEST trophy. But the request says:
    // "Display existing game trophies only, empty slots for unearned."
    // We should figure out which index is unlocked. If current is index 2, then 0,1,2 are unlocked.
    const currentIndex = allTrophies.findIndex(t => t.id === currentTrophyId);

    // Get total bonuses to display at the top
    const totalBonuses = [
        { label: 'ATK', val: skillTrophyStore.getStrengthATKBonus() },
        { label: 'DEF', val: skillTrophyStore.getSleepDEFBonus() },
        { label: 'SPD', val: skillTrophyStore.getCardioSPDBonus() },
        { label: 'INT', val: bookTrophyStore.getIntelligenceBonus() },
        { label: 'HP', val: skillTrophyStore.getSleepHPBonus() },
        { label: 'MP', val: bookTrophyStore.getMaxMPBonus() },
        { label: 'Luck', val: skillTrophyStore.getHousemaidLuckBonus() },
        { label: 'Crit%', val: skillTrophyStore.getLuckCritBonus() },
    ].filter(b => b.val > 0);

    return (
        <Panel variant="glass" className="room-panel trophy-panel">
            <div className="panel-header">
                <h2>🏆 Trophy Hall</h2>
                <button className="panel-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>

            {/* Total Bonuses Summary Header */}
            {totalBonuses.length > 0 ? (
                <div className="trophy-bonuses-summary">
                    <span className="bonuses-label">Total Bonuses:</span>
                    <div className="bonuses-list">
                        {totalBonuses.map(b => (
                            <span key={b.label} className="bonus-pill">
                                {b.label} +{b.val}
                            </span>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="panel-subtitle">Earn trophies to unlock powerful stat bonuses.</p>
            )}

            <div className="panel-tabs scrollable-tabs">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        className={`panel-tab ${activeTab === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(cat.id)}
                        title={cat.label}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            <div className="panel-content-scrollable">
                <div className="category-info">
                    <p>{currentTabInfo.description}</p>
                </div>

                {/* Ultra Rare Cow special display if luck tab */}
                {activeTab === 'luck' && skillTrophyStore.hasUltraRareCow && (
                    <div className="ultra-rare-cow-banner">
                        <span className="cow-icon">🐮✨</span>
                        <div className="cow-info">
                            <strong>ULTRA RARE COW</strong>
                            <span>1-in-100,000 Legend • +50% Crit Multiplier</span>
                        </div>
                    </div>
                )}

                <div className="trophy-display-grid">
                    {allTrophies.map((trophy, index) => {
                        // Skip the "none" base logic if it's explicitly index 0 and has 0 bonus.
                        // Actually show it so users see the progression.
                        const isUnlocked = index <= currentIndex && trophy.statBonus > 0;
                        const isBaseTier = trophy.id.includes('none') || trophy.statBonus === 0;

                        if (isBaseTier && !isUnlocked) return null; // Hide the base tier unless it's the only one

                        // Filter out "none" base trophies unless they actually contain something interesting
                        if (trophy.id.includes('none') && index === 0) return null;

                        return (
                            <div key={trophy.id} className={`trophy-display-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                                <div className="trophy-display-icon">
                                    {isUnlocked ? trophy.icon : '❓'}
                                </div>
                                <div className="trophy-display-details">
                                    <h5 className="trophy-name">{isUnlocked ? trophy.name : 'Unknown Trophy'}</h5>
                                    {isUnlocked ? (
                                        <p className="trophy-desc">{trophy.description}</p>
                                    ) : (
                                        <p className="trophy-desc requirement">
                                            Keep earning XP to unlock.
                                        </p>
                                    )}
                                </div>
                                {isUnlocked && trophy.statBonus > 0 && (
                                    <div className="trophy-bonus-tag">
                                        +{trophy.statBonus}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Panel>
    );
};
