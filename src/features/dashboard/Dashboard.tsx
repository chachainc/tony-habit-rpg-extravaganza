import { motion } from 'framer-motion';
import { CheckCircle2, Trophy, Flame } from 'lucide-react';
import './Dashboard.css';

export const Dashboard = () => {
    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div>
                    <h1 className="welcome-text">Good Afternoon, Architect</h1>
                    <p className="subtitle">Your digital legacy awaits.</p>
                </div>
                <button className="primary-btn">
                    + New Quest
                </button>
            </header>

            <div className="dashboard-grid">
                {/* Pet / Companion Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card pet-card"
                >
                    <div className="card-header">
                        <h3>Companion</h3>
                        <span className="status-badge pulse">Active</span>
                    </div>
                    <div className="pet-visual">
                        <img src="https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Felix" alt="Pet" className="pet-avatar" />
                        <div className="pet-stats">
                            <div className="stat-row">
                                <span>Health</span>
                                <div className="progress-bar red"><div style={{ width: '80%' }}></div></div>
                            </div>
                            <div className="stat-row">
                                <span>Energy</span>
                                <div className="progress-bar blue"><div style={{ width: '65%' }}></div></div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Quick Stats - Streak */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card streak-card"
                >
                    <div className="card-header">
                        <h3>Streak</h3>
                        <Flame className="text-orange" />
                    </div>
                    <div className="big-stat">
                        12 <span className="label">Days</span>
                    </div>
                    <p className="card-caption">You're on fire! Keep it up.</p>
                </motion.div>

                {/* Tasks Overview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card tasks-card"
                >
                    <div className="card-header">
                        <h3>Active Quests</h3>
                        <span className="highlight">3 Pending</span>
                    </div>
                    <ul className="task-list">
                        <li className="task-item">
                            <CheckCircle2 className="check-icon" />
                            <span>Design System Review</span>
                        </li>
                        <li className="task-item">
                            <CheckCircle2 className="check-icon" />
                            <span>Meditate for 10 mins</span>
                        </li>
                    </ul>
                </motion.div>

                {/* Recent Achievements */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card achievement-card"
                >
                    <div className="card-header">
                        <h3>Latest Win</h3>
                        <Trophy className="text-yellow" />
                    </div>
                    <div className="achievement-content">
                        <div className="badge-icon">🏆</div>
                        <div>
                            <h4>Early Riser</h4>
                            <p>Completed 5 morning tasks in a row</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
