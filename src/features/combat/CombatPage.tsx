import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, Crown, Shield, Zap } from 'lucide-react';
import { useBattleStore } from '../../store/useBattleStore';
import { useConquestStore } from '../../store/useConquestStore';
import { useGameStore } from '../../store/useGameStore';
import './CombatPage.css';

export const CombatPage = () => {
    const navigate = useNavigate();
    const { sigils } = useConquestStore();
    const { getAttack, getDefense, getMagicAttack, getMaxMP } = useGameStore();
    const { currentMP } = useBattleStore();

    const atk = getAttack();
    const def = getDefense();
    const magicAtk = getMagicAttack();
    const maxMP = getMaxMP();

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
                        <span>💎 MP {currentMP}/{maxMP}</span>
                    </div>
                    <div className="combat-stat">
                        <span>🔱 {sigils} Sigils</span>
                    </div>
                </motion.div>

                {/* Combat Options */}
                <div className="combat-options">
                    <motion.button
                        className="combat-option combat-option--arena"
                        onClick={() => navigate('/arena')}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
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
                        className="combat-option combat-option--conquest"
                        onClick={() => navigate('/conquest')}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="combat-option__icon">
                            <Crown size={48} />
                        </div>
                        <div className="combat-option__info">
                            <h2>Conquest</h2>
                            <p>Team-based territory battles. Compete for glory with allies.</p>
                        </div>
                        <div className="combat-option__arrow">→</div>
                    </motion.button>
                </div>
            </div>
        </div>
    );
};
