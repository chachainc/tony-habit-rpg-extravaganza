import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../../store/useProfileStore';
import { Panel } from '../../components/ui/Panel';
import { GachaButton } from '../../components/ui/GachaButton';
import { Particles } from '../../components/vfx/Particles';
import './CharacterCreation.css';

// We'll use absolute paths for the imported generated assets
import ironVanguardImg from '../../assets/characters/iron_vanguard_new.jpg';
import verdantGuardianImg from '../../assets/characters/verdant_guardian_new.jpg';
import shadowRogueImg from '../../assets/characters/shadow_rogue_new.jpg';
import arcaneScholarImg from '../../assets/characters/arcane_scholar_new.jpg';

// Video asset for sleep tracking
import cowsSleepingVid from '../../assets/cows_sleeping.mp4';

const CLASSES = [
    { id: 'Warrior', name: 'Warrior', img: ironVanguardImg, desc: 'A heavily-armored warrior. Wields a colossal blade radiating crimson energy to dominate the battlefield.' },
    { id: 'Guardian', name: 'Guardian', img: verdantGuardianImg, desc: 'A guardian of the wilds. Channels nature\'s magic through an enchanted staff to protect the innocent.' },
    { id: 'Ranger', name: 'Ranger', img: shadowRogueImg, desc: 'A swift hunter of the wilds. Strikes from the shadows with an enchanted bow and piercing precision.' },
    { id: 'Mage', name: 'Mage', img: arcaneScholarImg, desc: 'A master of the mystic arts. Summons cosmic power and ancient runes from forbidden tomes.' }
] as const;

export const CharacterCreation: React.FC = () => {
    const navigate = useNavigate();
    const { setClassType, setAppearance, setHealthTrackingMode } = useProfileStore();

    const [step, setStep] = useState<1 | 2>(1);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [healthMode, setHealthMode] = useState<'sleep' | 'readiness' | 'none' | null>(null);

    const handleComplete = () => {
        if (!selectedClass || !healthMode) return;

        setClassType(selectedClass as any);
        setAppearance({ hairHue: 0, skinHue: 0 });
        setHealthTrackingMode(healthMode);

        navigate('/');
    };

    return (
        <div className={`char-create-container ${step === 2 ? 'sleep-prompt-mode' : ''}`}>
            {step === 1 && <Particles count={40} color="rgba(255, 200, 100, 0.5)" speed={0.5} />}
            
            <video 
                autoPlay 
                loop 
                muted 
                playsInline 
                preload="auto"
                className="sleep-bg-video" 
                style={{ 
                    visibility: step === 2 ? 'visible' : 'hidden',
                    backgroundColor: '#0a1428'
                }}
                ref={(el) => { if (el) el.defaultMuted = true; }}
            >
                <source src={cowsSleepingVid} type="video/mp4" />
            </video>

            <div className="char-create-content">
                {step === 1 && <h1 className="cc-title text-gold">Awaken, Hero</h1>}

                {/* STEP 1: Class Selection */}
                {step === 1 && (
                    <Panel variant="glass" padding="lg" className="cc-panel animation-slide-up">
                        <h2>Choose Your Path</h2>
                        <p className="text-muted">Select your class. You can switch later.</p>

                        <div className="archetype-grid">
                            {CLASSES.map((arch) => (
                                <div
                                    key={arch.id}
                                    className={`archetype-card ${selectedClass === arch.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedClass(arch.id)}
                                >
                                    <div className="arch-img-frame">
                                        <img src={arch.img} alt={arch.name} draggable={false} />
                                    </div>
                                    <h3>{arch.name}</h3>
                                    <p>{arch.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="cc-actions">
                            <GachaButton
                                variant="primary"
                                size="lg"
                                disabled={!selectedClass}
                                onClick={() => setStep(2)}
                            >
                                Confirm Path
                            </GachaButton>
                        </div>
                    </Panel>
                )}

                {/* STEP 2: Sleep Tracking */}
                {step === 2 && (
                    <Panel variant="glass" padding="lg" className="cc-panel sleep-panel-override animation-slide-up">
                        <h2 className="sleep-title">Do You Track Your Sleep?</h2>
                        <p className="text-muted mb-4 sleep-subtitle">If yes, you'll log your sleep quality each morning and it will impact your in-game stats and recovery.</p>

                        <div className="health-options">
                            <div
                                className={`health-card ${healthMode === 'sleep' ? 'selected' : ''}`}
                                onClick={() => setHealthMode('sleep')}
                            >
                                <h3>🌙 Yes, I Track My Sleep</h3>
                                <p>I'll log how well I slept each day for bonus XP and stat effects.</p>
                            </div>

                            <div
                                className={`health-card ${healthMode === 'none' ? 'selected' : ''}`}
                                onClick={() => setHealthMode('none')}
                            >
                                <h3>❌ No Thanks</h3>
                                <p>Skip sleep tracking entirely.</p>
                            </div>
                        </div>

                        <div className="cc-actions spaced mt-4">
                            <GachaButton variant="secondary" onClick={() => setStep(1)}>Back</GachaButton>
                            <GachaButton
                                variant="primary"
                                size="lg"
                                disabled={!healthMode}
                                onClick={handleComplete}
                            >
                                Begin Journey
                            </GachaButton>
                        </div>
                    </Panel>
                )}

            </div>
        </div>
    );
};
