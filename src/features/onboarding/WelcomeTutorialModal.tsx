import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Shield, Crosshair, BookOpen, ChevronRight, Check, Users } from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore';
import './WelcomeTutorialModal.css';

interface TutorialScreen {
    id: string;
    title: string;
    text: React.ReactNode;
    icon: React.ReactNode;
    color: string;
}

const SCREENS: TutorialScreen[] = [
    {
        id: 'welcome',
        title: 'Welcome, Adventurer!',
        text: 'Complete real-life habit tasks to power up your character and conquer the world.',
        icon: <Sparkles size={48} />,
        color: '#f59e0b',
    },
    {
        id: 'combat_stats',
        title: 'Combat Scaling',
        text: <>Your habits directly calculate your combat stats. Here is the exact breakdown:<br/><br/>
        • <strong>Strength:</strong> Increases Attack power (+1.5 Attack per level)<br/>
        • <strong>Cardio:</strong> Increases Max HP (+15 HP per level)<br/>
        • <strong>Intelligence:</strong> Increases Magic Attack (+2.0) and Max Mana (+10.0 per level)<br/>
        </>,
        icon: <Crosshair size={48} />,
        color: '#ef4444',
    },
    {
        id: 'defense_stats',
        title: 'Defense & Maintenance',
        text: <><strong>Defense</strong> scales from the average level of 5 core habits: <strong>Sleep, Hygiene, Cardio, Flexibility, and Habit Building</strong> (Average × 1.2).<br/><br/>
        <em>Warning:</em> If your Sleep or Hygiene fall below level 5, your defense is halved! Neglecting them also causes your defense to slowly decay day by day.</>,
        icon: <Shield size={48} />,
        color: '#3b82f6',
    },
    {
        id: 'social',
        title: 'Social Influence',
        text: <>Leveling up your <strong>Social</strong> skill directly impacts your influence in the kingdom.<br/><br/>Higher Social levels are required to unlock and adopt rare <strong>Pets</strong> in the marketplace, which provide powerful unique bonuses.</>,
        icon: <Users size={48} />,
        color: '#10b981',
    },
    {
        id: 'knowledge',
        title: 'Arcane Knowledge',
        text: <>Logging <strong>Intelligence</strong> tasks earns you Fantasy Books.<br/><br/>You can <strong>fuse</strong> two books of the same tier to create a stronger one to permanently boost your magical prowess.</>,
        icon: <BookOpen size={48} />,
        color: '#8b5cf6',
    },
    {
        id: 'luck',
        title: 'Good Luck, Warrior!',
        text: 'Grow stronger by building real-world habits, conquer territories, and build your legend.',
        icon: <Shield size={48} />,
        color: '#ec4899',
    }
];

export const WelcomeTutorialModal = () => {
    const { completeWelcomeTutorial } = useProfileStore();
    const [step, setStep] = useState(0);

    const isLastStep = step === SCREENS.length - 1;
    const currentScreen = SCREENS[step];

    const handleNext = () => {
        if (isLastStep) {
            completeWelcomeTutorial();
        } else {
            setStep(s => s + 1);
        }
    };

    return (
        <div className="welcome-tutorial-overlay">
            <motion.div 
                className="welcome-tutorial-modal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                style={{ '--theme-color': currentScreen.color } as React.CSSProperties}
            >
                <div className="wtm-header">
                    <div className="wtm-icon" style={{ color: currentScreen.color, textShadow: `0 0 20px ${currentScreen.color}66` }}>
                        {currentScreen.icon}
                    </div>
                </div>

                <div className="wtm-body">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentScreen.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="wtm-content"
                        >
                            <h2 style={{ color: currentScreen.color }}>{currentScreen.title}</h2>
                            <p className="wtm-text">{currentScreen.text}</p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="wtm-footer">
                    <div className="wtm-dots">
                        {SCREENS.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`wtm-dot ${idx === step ? 'active' : ''}`} 
                                style={{ backgroundColor: idx === step ? currentScreen.color : '#334155' }}
                            />
                        ))}
                    </div>
                    
                    <button 
                        className="wtm-btn" 
                        onClick={handleNext}
                        style={{ backgroundColor: currentScreen.color }}
                    >
                        {isLastStep ? (
                            <>Start Adventure <Check size={18} /></>
                        ) : (
                            <>Next <ChevronRight size={18} /></>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
