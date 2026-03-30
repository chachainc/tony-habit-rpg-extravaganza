import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Crown, Shield, Zap, Map as MapIcon, Castle, ScrollText } from 'lucide-react';
import { useBattleStore } from '../../store/useBattleStore';
import { useConquestStore } from '../../store/useConquestStore';
import { useGameStore } from '../../store/useGameStore';
import { useStrategyStore } from '../../store/useStrategyStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { ChessGame } from '../conquest/ChessGame';
import { ConquestTiles } from '../conquest/ConquestTiles';
import { WarJournal } from './WarJournal';
import { PetBattle } from './PetBattle';
import { PetTown } from './PetTown';
import { Blackjack } from './Blackjack';
import { PhysicsLauncher } from './PhysicsLauncher';
import { BrickBreaker } from './BrickBreaker';
import { useState } from 'react';
import './CombatPage.css';

export const CombatPage = () => {
    const navigate = useNavigate();
    const { sigils, addSigils } = useConquestStore();
    const strategy = useStrategyStore();
    const currency = useCurrencyStore();
    const [showChess, setShowChess] = useState(false);
    const [showTiles, setShowTiles] = useState(false);
    const [showJournal, setShowJournal] = useState(false);
    const [showPetBattle, setShowPetBattle] = useState(false);
    const [showPetTown, setShowPetTown] = useState(false);
    const [showBlackjack, setShowBlackjack] = useState(false);
    const [showLauncher, setShowLauncher] = useState(false);
    const [showBreaker, setShowBreaker] = useState(false);
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
                    <h1>🎮 Games</h1>
                    <p className="combat-subtitle">Choose your game</p>
                    <button
                        className="wj-open-btn"
                        onClick={() => setShowJournal(true)}
                    >
                        <ScrollText size={16} /> War Journal
                    </button>
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

                {/* Game Options */}
                <div className="combat-options">

                    {/* ═══════════ COMBAT SECTION ═══════════ */}
                    <div className="combat-section-label">⚔️ COMBAT</div>

                    <motion.button
                        className="combat-option combat-option--arena"
                        onClick={() => navigate('/arena')}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
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

                    <motion.button
                        className="combat-option combat-option--petbattle"
                        onClick={() => setShowPetBattle(true)}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="combat-option__icon" style={{ fontSize: '48px', lineHeight: '48px' }}>🐾</div>
                        <div className="combat-option__info">
                            <h2>Pet Battle <span className="combat-limit-badge">3/day</span></h2>
                            <p>Pokémon-style combat with your pets. Type advantages and turn-based strategy!</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>

                    {/* ═══════════ PETS SECTION ═══════════ */}
                    <div className="combat-section-label">🐾 PETS</div>

                    <motion.button
                        className="combat-option combat-option--pets"
                        onClick={() => setShowPetTown(true)}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.22 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="combat-option__icon" style={{ fontSize: '48px', lineHeight: '48px' }}>🏕️</div>
                        <div className="combat-option__info">
                            <h2>Pet Town</h2>
                            <p>Capture wild pets and build your collection!</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>

                    {/* ═══════════ STRATEGY SECTION ═══════════ */}
                    <div className="combat-section-label">🎯 STRATEGY</div>

                    <motion.button
                        className="combat-option combat-option--blackjack"
                        onClick={() => setShowBlackjack(true)}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="combat-option__icon" style={{ fontSize: '48px', lineHeight: '48px' }}>🃏</div>
                        <div className="combat-option__info">
                            <h2>Blackjack</h2>
                            <p>Casino table game. 50 free coins/day. No gold spent.</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>

                    <motion.button
                        className="combat-option combat-option--launcher"
                        onClick={() => setShowLauncher(true)}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="combat-option__icon" style={{ fontSize: '48px', lineHeight: '48px' }}>🏗️</div>
                        <div className="combat-option__info">
                            <h2>Physics Launcher <span className="combat-limit-badge">3/day</span></h2>
                            <p>Angry Birds-style! Drag, aim, and destroy targets.</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>

                    <motion.button
                        className="combat-option combat-option--breaker"
                        onClick={() => setShowBreaker(true)}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="combat-option__icon" style={{ fontSize: '48px', lineHeight: '48px' }}>🧱</div>
                        <div className="combat-option__info">
                            <h2>Brick Breaker <span className="combat-limit-badge">3/day</span></h2>
                            <p>Classic breakout! Smash bricks with the ball.</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>

                    <motion.button
                        className="combat-option combat-option--tiles"
                        onClick={() => setShowTiles(true)}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
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

                    <motion.button
                        className="combat-option combat-option--chess"
                        onClick={() => setShowChess(true)}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 }}
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

                    {/* ═══════════ ARMY SECTION ═══════════ */}
                    <div className="combat-section-label">🏰 ARMY</div>

                    <motion.button
                        className="combat-option combat-option--conquest"
                        onClick={() => navigate('/conquest')}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
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
                        className="combat-option combat-option--risk"
                        onClick={() => navigate('/risk')}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
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
                        transition={{ delay: 0.65 }}
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

            {/* ═══ Modals ═══ */}
            <AnimatePresence>
                {showChess && <ChessGame
                onComplete={(result) => {
                    if (result === 'win') {
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
                onComplete={(result, diff, clearPct) => {
                    const tilesGold: Record<number, number> = { 1: 5, 2: 15, 3: 30, 4: 50 };
                    const fullGold = tilesGold[diff] ?? 5;
                    if (result === 'win') {
                        currency.addGold(fullGold);
                    } else if (clearPct >= 50) {
                        currency.addGold(Math.max(1, Math.floor(fullGold / 2)));
                    }
                    setShowTiles(false);
                }}
                onClose={() => setShowTiles(false)}
                canPlay={strategy.canPlayTilesToday()}
                canPlayImpossible={strategy.canPlayImpossible()}
                />}
            </AnimatePresence>
            <AnimatePresence>
                {showJournal && <WarJournal onClose={() => setShowJournal(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showPetBattle && <PetBattle onClose={() => setShowPetBattle(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showPetTown && <PetTown onClose={() => setShowPetTown(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showBlackjack && <Blackjack onClose={() => setShowBlackjack(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showLauncher && <PhysicsLauncher onClose={() => setShowLauncher(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showBreaker && <BrickBreaker onClose={() => setShowBreaker(false)} />}
            </AnimatePresence>
        </div>
    );
};
