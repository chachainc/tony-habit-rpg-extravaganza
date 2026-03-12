import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Shield, Crosshair, BookOpen, ChevronRight, Check } from 'lucide-react';
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
        id: 'gym',
        title: 'Build Your Strength',
        text: <>Complete <strong>Gym tasks</strong> to gain <strong>Attack power</strong> for combat modes.<br/><br/>Higher attack makes conquering territories and defeating enemies easier.</>,
        icon: <Crosshair size={48} />,
        color: '#ef4444',
    },
    {
        id: 'habits',
        title: 'Fortify Your Defense',
        text: <>Complete <strong>habit tasks and daily routines</strong> to gain <strong>Defense</strong>.<br/><br/>Defense helps protect your territories and survive stronger enemies.</>,
        icon: <Shield size={48} />,
        color: '#3b82f6',
    },
    {
        id: 'knowledge',
        title: 'Gain Knowledge',
        text: <>Complete <strong>Reading tasks</strong> to earn <strong>Fantasy Books</strong>.<br/><br/>Each completed book gives you a <strong>Level 1 Fantasy Book item</strong>. These books can be <strong>fused together</strong> to create stronger books.</>,
        icon: <BookOpen size={48} />,
        color: '#8b5cf6',
    },
    {
        id: 'fuse',
        title: 'Fuse Your Power',
        text: <>If you have <strong>two books of the same level</strong>, you can <strong>fuse them</strong> to create a higher level book.<br/><br/>Stronger books provide better bonuses.</>,
        icon: <Brain size={48} />,
        color: '#ec4899',
    },
    {
        id: 'luck',
        title: 'Good Luck, Warrior!',
        text: 'Grow stronger, conquer territories, collect rewards, and build your legend.',
        icon: <Sparkles size={48} />,
        color: '#10b981',
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
