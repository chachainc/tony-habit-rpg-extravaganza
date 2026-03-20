import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Shield, Crosshair, BookOpen, ChevronRight, Check } from 'lucide-react';
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
        text: 'Complete real-life habit tasks to power up your character and conquer the world. Keep in mind: daily tasks have a maximum XP cap per skill each day to prevent grinding!',
        icon: <Sparkles size={48} />,
        color: '#f59e0b',
    },
    {
        id: 'caps_exemptions',
        title: 'XP Caps & Exemptions',
        text: <>XP from daily tasks is capped per skill each day (e.g. 6 Strength XP/day).<br/><br/>However, <strong>Weekly tasks, Sleep logging, Daily Check-Ins, and Combat rewards</strong> bypass these caps entirely!</>,
        icon: <Shield size={48} />,
        color: '#3b82f6',
    },
    {
        id: 'build_guidance',
        title: 'Fantasy Builds',
        text: <>Focus on real-world habits that fit your desired fantasy class!<br/><br/>
        • <strong>Strength builds</strong> &rarr; leveled by Strength<br/>
        • <strong>Magic builds</strong> &rarr; leveled by Intelligence<br/>
        • <strong>Speed builds</strong> &rarr; leveled by Cardio<br/>
        • <strong>Tank builds</strong> &rarr; leveled by Health / Hygiene</>,
        icon: <Crosshair size={48} />,
        color: '#ef4444',
    },
    {
        id: 'arcane',
        title: 'Arcane Knowledge',
        text: <><strong>Intelligence XP</strong> strengthens your mind and contributes to Magic Attack.<br/><br/><strong>Books</strong> are completed through your Library. Read real books to earn XP based on the genre!<br/>• Fantasy = Intelligence & Habit XP<br/>• Self-Improvement = Habit XP<br/>• Business = Work & Habit XP</>,
        icon: <BookOpen size={48} />,
        color: '#8b5cf6',
    },
    {
        id: 'luck',
        title: 'Good Luck, Warrior!',
        text: 'Grow stronger by building real-world habits, conquer territories, and build your legend.',
        icon: <Sparkles size={48} />,
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
