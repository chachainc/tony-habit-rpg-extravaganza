import { motion } from 'framer-motion';
import { useBookTrophyStore, TROPHY_MILESTONES } from '../../store/useBookTrophyStore';
import './TrophyPedestal.css';

export const TrophyPedestal = () => {
    const { totalBooksRead, getCurrentTrophy } = useBookTrophyStore();
    const trophy = getCurrentTrophy();

    // Find next trophy milestone
    const nextTrophy = TROPHY_MILESTONES.find(t => t.booksRequired > totalBooksRead);
    const booksToNext = nextTrophy ? nextTrophy.booksRequired - totalBooksRead : 0;

    return (
        <div className="trophy-pedestal">
            {/* Floating Book Counter */}
            <motion.div
                className="books-counter"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                📚 {totalBooksRead}
            </motion.div>

            {/* Trophy Display */}
            <motion.div
                className={`trophy-display rarity-${trophy.id === 'grand_library_crown' ? 'legendary' :
                    trophy.id === 'arcane_nebula_scroll' ? 'epic' :
                        trophy.id === 'eternal_encyclopedia' ? 'rare' :
                            trophy.id === 'golden_tome' ? 'uncommon' : 'common'}`}
                animate={{
                    scale: [1, 1.02, 1],
                    rotate: [0, 1, 0, -1, 0]
                }}
                transition={{ duration: 4, repeat: Infinity }}
            >
                <div className="trophy-glow" />
                <span className="trophy-icon">{trophy.icon}</span>
            </motion.div>

            {/* Trophy Name & Description */}
            <div className="trophy-info">
                <h3 className="trophy-name">{trophy.name}</h3>
                <p className="trophy-description">{trophy.description}</p>
            </div>

            {/* Bonuses Display */}
            {trophy.intelligenceBonus > 0 && (
                <div className="trophy-bonuses">
                    <span className="bonus-item">🧠 +{trophy.intelligenceBonus} INT</span>
                    {trophy.maxMPBonus > 0 && (
                        <span className="bonus-item">💧 +{trophy.maxMPBonus} MP</span>
                    )}
                    {trophy.special === 'astral_fire' && (
                        <span className="bonus-item special">🔥 Astral Fire Unlocked</span>
                    )}
                    {trophy.special === 'magic_xp_2x' && (
                        <span className="bonus-item special">✨ 2x Magic XP</span>
                    )}
                </div>
            )}

            {/* Progress to Next Trophy */}
            {nextTrophy && (
                <div className="next-trophy-progress">
                    <span className="progress-label">Next: {nextTrophy.name}</span>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${((totalBooksRead - (TROPHY_MILESTONES[TROPHY_MILESTONES.indexOf(nextTrophy) - 1]?.booksRequired || 0)) /
                                    (nextTrophy.booksRequired - (TROPHY_MILESTONES[TROPHY_MILESTONES.indexOf(nextTrophy) - 1]?.booksRequired || 0))) * 100}%`
                            }}
                        />
                    </div>
                    <span className="progress-text">{booksToNext} books to go</span>
                </div>
            )}

            {/* Pedestal Base */}
            <div className="pedestal-base" />
        </div>
    );
};
