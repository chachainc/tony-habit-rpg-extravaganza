import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useConquestStore } from '../../store/useConquestStore';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import './Conquest.css';

const CaravanEncounterContent = () => {
    const navigate = useNavigate();
    const currency = useCurrencyStore();
    const conquest = useConquestStore();

    const handleBuyHeal = () => {
        if (currency.gold >= 40) {
            currency.spendGold(40);
            conquest.healHP(30);
        }
    };

    const handleBuyBuff = () => {
        if (currency.gold >= 50) {
            currency.spendGold(50);
            conquest.addRunBuff({
                id: `caravan_defense_${Date.now()}`,
                type: 'defensePercent',
                label: "Caravan Shield",
                amount: 15
            });
        }
    };

    return (
        <div className="combat-page">
            <div className="combat-bg" style={{ filter: 'brightness(0.6)', background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url(/assets/backgrounds/desert_camp.jpg)' }}></div>
            
            <div className="combat-header">
                <button className="combat-back-btn" onClick={() => navigate('/conquest')}>← Return Map</button>
            </div>

            <motion.div 
                className="combat-arena"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ justifyContent: 'center', gap: '2rem' }}
            >
                <div style={{ textAlign: 'center', zIndex: 10 }}>
                    <h1 style={{ color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1rem', textShadow: '0 0 10px rgba(251,191,36,0.6)' }}>
                        Traveling Caravan
                    </h1>
                    <p style={{ color: '#cbd5e1', maxWidth: '400px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '1.5' }}>
                        A wandering merchant gestures you over to his eclectic stall. "Rest your weary bones and browse my wares..."
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', width: '100%', maxWidth: '300px', zIndex: 10 }}>
                    <button 
                        className="combat-action-btn run-btn"
                        style={{ padding: '1rem' }}
                        onClick={handleBuyHeal}
                        disabled={currency.gold < 40}
                    >
                        ❤️ Buy Salve (40 Gold) <br /> 
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Restore 30 HP</span>
                    </button>

                    <button 
                        className="combat-action-btn shield-btn"
                        style={{ padding: '1rem' }}
                        onClick={handleBuyBuff}
                        disabled={currency.gold < 50}
                    >
                        🛡️ Buy Plating (50 Gold) <br />
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>+15 DEF this run</span>
                    </button>

                    <button 
                        className="combat-action-btn item-btn"
                        style={{ padding: '1rem', marginTop: '1rem' }}
                        onClick={() => navigate('/conquest')}
                    >
                        Leave Caravan
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export const CaravanEncounter = () => {
    const navigate = useNavigate();
    return (
        <ErrorBoundary fallback={
            <div className="combat-page" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h1 style={{ color: '#ef4444' }}>Caravan Encounter Failed</h1>
                <button className="combat-action-btn item-btn" onClick={() => navigate('/conquest')}>Return to Map</button>
            </div>
        }>
            <CaravanEncounterContent />
        </ErrorBoundary>
    );
};
