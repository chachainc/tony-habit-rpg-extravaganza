import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTowerDefenseStore } from '../../store/useTowerDefenseStore';
import { Castle, ArrowLeft, Play, RefreshCw, Skull } from 'lucide-react';
import './TowerDefensePage.css';

export const TowerDefensePage = () => {
    const navigate = useNavigate();
    const td = useTowerDefenseStore();

    // Abstract enemy for placeholder UI
    const [enemyPosition, setEnemyPosition] = useState(-1); // -1 means none, 0 is left, 100 is base

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (td.isWaveActive && td.baseHealth > 0) {
            setEnemyPosition(0);
            interval = setInterval(() => {
                setEnemyPosition(prev => {
                    if (prev >= 90) {
                        td.takeDamage(10);
                        useTowerDefenseStore.setState({ isWaveActive: false }); // End wave when it hits base
                        return -1;
                    }
                    return prev + 5;
                });
            }, 500);
        }
        return () => clearInterval(interval);
    }, [td.isWaveActive, td.baseHealth]);

    return (
        <div className="td-page">
            <div className="td-header">
                <button className="td-back" onClick={() => navigate('/combat')}>
                    <ArrowLeft size={24} /> Back
                </button>
                <h1><Castle size={24} style={{ display: 'inline', verticalAlign: 'middle' }} /> Tower Defense</h1>
                <div className="td-stats">
                    <span className="wave-display">Wave: {td.currentWave}</span>
                    <span className="health-display">Base HP: {td.baseHealth}/{td.maxBaseHealth}</span>
                </div>
            </div>

            <div className="td-content">
                <p>Strategic wave defense prototype.</p>

                <div className="td-controls">
                    {td.baseHealth > 0 ? (
                        <button
                            className="td-start-btn"
                            disabled={td.isWaveActive}
                            onClick={td.startNextWave}
                        >
                            <Play size={16} /> Start Next Wave
                        </button>
                    ) : (
                        <div className="td-game-over">
                            <h2>Game Over</h2>
                            <button className="td-reset-btn" onClick={td.resetGame}>
                                <RefreshCw size={16} /> Restart
                            </button>
                        </div>
                    )}
                </div>

                <div className="td-lane">
                    <div className="td-lane-path">
                        {enemyPosition >= 0 && (
                            <div
                                className="td-enemy"
                                style={{ left: `${enemyPosition}%` }}
                            >
                                <Skull size={24} color="var(--danger-color)" />
                            </div>
                        )}
                    </div>
                    <div className="td-base">
                        <Castle size={48} color={td.baseHealth > 0 ? "var(--accent-primary)" : "var(--danger-color)"} />
                    </div>
                </div>
            </div>
        </div>
    );
};
