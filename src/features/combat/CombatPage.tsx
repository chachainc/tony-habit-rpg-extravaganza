import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Crown, Shield, Zap, Map as MapIcon, Castle } from 'lucide-react';
import { useBattleStore } from '../../store/useBattleStore';
import { useConquestStore } from '../../store/useConquestStore';
import { useGameStore } from '../../store/useGameStore';
import { useStrategyStore } from '../../store/useStrategyStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { ChessGame } from '../conquest/ChessGame';
import { ConquestTiles } from '../conquest/ConquestTiles';
import { useState } from 'react';
import './CombatPage.css';

export const CombatPage = () => {
    const navigate = useNavigate();
    const { sigils, addSigils } = useConquestStore();
    const strategy = useStrategyStore();
    const currency = useCurrencyStore();
    const [showChess, setShowChess] = useState(false);
    const [showTiles, setShowTiles] = useState(false);
    const { getAttack, getDefense, getMagicAttack, getMaxMP } = useGameStore();
    const { currentMP, player } = useBattleStore();

    const atk = getAttack();
    const def = getDefense();
    const magicAtk = getMagicAttack();
    const maxMP = getMaxMP();
    const currentHP = player?.hp ?? 0;
    const maxHP = player?.maxHp ?? 0;
    const balloons = currency.balloons ?? 0;
    const shmeckles = currency.shmeckles ?? 0;

    return (
        <div className="combat-page">
            {/* Background */}
            <div className="combat-bg">
                <div className="combat-bg__gradient" />
                <div className="combat-bg__particles">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div
                            key={i}
                            className="combat-particle"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${3 + Math.random() * 4}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="combat-content">
                {/* Header */}
                <motion.div
                    className="combat-header"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1>⚔️ Combat</h1>
                    <p className="combat-subtitle">Choose your battlefield</p>
                </motion.div>

                {/* Combat Stats Bar */}
                <motion.div
                    className="combat-stats-bar"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="combat-stat">
                        <Swords size={14} />
                        <span>ATK {atk}</span>
                    </div>
                    <div className="combat-stat">
                        <Shield size={14} />
                        <span>DEF {def}</span>
                    </div>
                    <div className="combat-stat">
                        <Zap size={14} />
                        <span>MAG {magicAtk}</span>
                    </div>
                    <div className="combat-stat">
                        <span>🔮 MP {currentMP}/{maxMP}</span>
                    </div>
                    <div className="combat-stat">
                        <span>❤️ HP {currentHP}/{maxHP}</span>
                    </div>
                    <div className="combat-stat">
                        <span>🔱 {sigils} Sigils</span>
                    </div>
                    <div className="combat-stat">
                        <span>🐌 {shmeckles} Shmeckles</span>
                    </div>
                    <div className="combat-stat">
                        <span>🎈 {balloons} Balloons</span>
                    </div>
                </motion.div>

                {/* Combat Options */}
                <div className="combat-options">

                    {/* ─── DAILY GAMES ─── */}
                    <div className="combat-section-label">🎮 DAILY GAMES</div>

                    <motion.button
                        className="combat-option combat-option--conquest"
                        onClick={() => navigate('/conquest')}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="combat-option__icon">
                            <Crown size={48} />
                        </div>
                        <div className="combat-option__info">
                            <h2>Conquest <span className="combat-limit-badge">1/day</span></h2>
                            <p>Team-based territory battles. Compete for glory with allies.</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>

                    <motion.button
                        className="combat-option combat-option--chess"
                        onClick={() => setShowChess(true)}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="combat-option__icon" style={{ fontSize: '48px', lineHeight: '48px' }}>♟️</div>
                        <div className="combat-option__info">
                            <h2>Daily Chess <span className="combat-limit-badge">1/day</span></h2>
                            <p>Challenge your mind. Win: +1 Sigil, +1 Smeckle, +1 Balloon.</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>

                    <motion.button
                        className="combat-option combat-option--tiles"
                        onClick={() => setShowTiles(true)}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="combat-option__icon" style={{ fontSize: '48px', lineHeight: '48px' }}>🎲</div>
                        <div className="combat-option__info">
                            <h2>Tiles Game <span className="combat-limit-badge">3/day</span></h2>
                            <p>Match tiles and test your memory.</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>

                    {/* ─── TEST YOUR POWER ─── */}
                    <div className="combat-section-label">⚔️ TEST YOUR POWER</div>

                    <motion.button
                        className="combat-option combat-option--arena"
                        onClick={() => navigate('/arena')}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="combat-option__icon">
                            <Swords size={48} />
                        </div>
                        <div className="combat-option__info">
                            <h2>Arena</h2>
                            <p>Climb the Tower of Discipline. Battle enemies floor by floor and earn rewards.</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>

                    {/* ─── EXPAND YOUR ARMY ─── */}
                    <div className="combat-section-label">🏰 EXPAND YOUR ARMY</div>

                    <motion.button
                        className="combat-option combat-option--risk"
                        onClick={() => navigate('/risk')}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="combat-option__icon">
                            <MapIcon size={48} />
                        </div>
                        <div className="combat-option__info">
                            <h2>Risk</h2>
                            <p>Strategic territory conquest. Deploy armies using Sigils.</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>

                    <motion.button
                        className="combat-option combat-option--storm"
                        onClick={() => navigate('/storm')}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ borderLeft: '4px solid #a855f7' }}
                    >
                        <div className="combat-option__icon" style={{ fontSize: '48px', lineHeight: '48px' }}>🐌</div>
                        <div className="combat-option__info">
                            <h2>Storm the Fort</h2>
                            <p>Hold the line! Side-view wave defense where you deploy soldiers using Shmeckles.</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>

                    <motion.button
                        className="combat-option combat-option--tower"
                        onClick={() => navigate('/tower-defense')}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="combat-option__icon">
                            <Castle size={48} />
                        </div>
                        <div className="combat-option__info">
                            <h2>Tower Defense</h2>
                            <p>Defend the base against waves of enemies. Spend Balloons to build towers.</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>

                </div>
            </div>

            <AnimatePresence>
                {showChess && <ChessGame
                onComplete={(result) => {
                    if (result === 'win') {
                        // Chess win: +1 sigil, +1 shmeckle (→ also +1 balloon auto-mirrored)
                        addSigils(1);
                        currency.addShmeckles(1);
                    }
                    setShowChess(false);
                }}
                onClose={() => setShowChess(false)}
                canPlay={strategy.canPlayChessToday()}
                />}
            </AnimatePresence>
            <AnimatePresence>
                {showTiles && <ConquestTiles
                onComplete={(result, diff) => {
                    if (result === 'win') {
                        const tilesGold: Record<number, number> = { 1: 5, 2: 15, 3: 30, 4: 50 };
                        currency.addGold(tilesGold[diff] ?? 5);
                    }
                    setShowTiles(false);
                }}
                onClose={() => setShowTiles(false)}
                canPlay={strategy.canPlayTilesToday()}
                canPlayImpossible={strategy.canPlayImpossible()}
                />}
            </AnimatePresence>
        </div>
    );
};
