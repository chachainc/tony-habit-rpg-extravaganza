import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../../store/useProfileStore';
import { Panel } from '../../components/ui/Panel';
import { GachaButton } from '../../components/ui/GachaButton';
import { Particles } from '../../components/vfx/Particles';
import './CharacterCreation.css';

// We'll use absolute paths for the imported generated assets
import vanguardImg from '../../assets/characters/vanguard.png';
import rangerImg from '../../assets/characters/ranger.png';
import duelistImg from '../../assets/characters/duelist.png';
import mysticImg from '../../assets/characters/mystic.png';

const ARCHETYPES = [
    { id: 'vanguard', name: 'Vanguard Knight', img: vanguardImg, desc: 'A stalwart defender. Prefers head-on confrontation and unwavering discipline.' },
    { id: 'ranger', name: 'Arcane Ranger', img: rangerImg, desc: 'A swift striker. Blends martial agility with subtle arcane threads.' },
    { id: 'duelist', name: 'Ember Duelist', img: duelistImg, desc: 'An aggressive fighter. Wields fiery passion and curved blades.' },
    { id: 'mystic', name: 'Moonlight Mystic', img: mysticImg, desc: 'A calm scholar. Channels celestial energy through intense focus.' }
] as const;

export const CharacterCreation: React.FC = () => {
    const navigate = useNavigate();
    const { setCharacterArchetype, setAppearance, setHealthTrackingMode } = useProfileStore();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
    const [hairHue, setHairHue] = useState<number>(0);
    const [skinHue, setSkinHue] = useState<number>(0);
    const [healthMode, setHealthMode] = useState<'sleep' | 'readiness' | 'none' | null>(null);

    const activeArchetypeData = ARCHETYPES.find(a => a.id === selectedArchetype);

    const handleComplete = () => {
        // Save to store
        if (!selectedArchetype || !healthMode) return;

        setCharacterArchetype(selectedArchetype as any);
        setAppearance({ hairHue, skinHue });
        setHealthTrackingMode(healthMode);

        // Redirect to main game
        navigate('/');
    };

    return (
        <div className="char-create-container">
            <Particles count={40} color="rgba(255, 200, 100, 0.5)" speed={0.5} />

            <div className="char-create-content">
                <h1 className="cc-title text-gold">Awaken, Hero</h1>

                {/* STEP 1: Archetype */}
                {step === 1 && (
                    <Panel variant="glass" padding="lg" className="cc-panel animation-slide-up">
                        <h2>Choose Your Path</h2>
                        <p className="text-muted">You can customize your appearance and switch archetypes later.</p>

                        <div className="archetype-grid">
                            {ARCHETYPES.map((arch) => (
                                <div
                                    key={arch.id}
                                    className={`archetype-card ${selectedArchetype === arch.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedArchetype(arch.id)}
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
                                disabled={!selectedArchetype}
                                onClick={() => setStep(2)}
                            >
                                Confirm Path
                            </GachaButton>
                        </div>
                    </Panel>
                )}

                {/* STEP 2: Appearance */}
                {step === 2 && activeArchetypeData && (
                    <Panel variant="glass" padding="lg" className="cc-panel animation-slide-up">
                        <h2>Appearance</h2>

                        <div className="appearance-layout">
                            <div className="appearance-preview">
                                <img
                                    src={activeArchetypeData.img}
                                    alt="preview"
                                    style={{ filter: `hue-rotate(${hairHue}deg) brightness(${100 + skinHue}%)` }} // Simple hue manipulation MVP
                                />
                            </div>

                            <div className="appearance-controls">
                                <div className="control-group">
                                    <label>Aura / Tint Offset</label>
                                    <input
                                        type="range"
                                        min="0" max="360"
                                        value={hairHue}
                                        onChange={e => setHairHue(Number(e.target.value))}
                                    />
                                </div>
                                <div className="control-group">
                                    <label>Brightness Shift</label>
                                    <input
                                        type="range"
                                        min="-30" max="30"
                                        value={skinHue}
                                        onChange={e => setSkinHue(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="cc-actions spaced">
                            <GachaButton variant="secondary" onClick={() => setStep(1)}>Back</GachaButton>
                            <GachaButton variant="primary" size="lg" onClick={() => setStep(3)}>Next</GachaButton>
                        </div>
                    </Panel>
                )}

                {/* STEP 3: Health Tracking */}
                {step === 3 && (
                    <Panel variant="glass" padding="lg" className="cc-panel animation-slide-up">
                        <h2>Health Integration</h2>
                        <p className="text-muted mb-4">Do you use a sleep tracker or readiness score device? If enabled, your real-world recovery will impact your in-game stats.</p>

                        <div className="health-options">
                            <div
                                className={`health-card ${healthMode === 'sleep' ? 'selected' : ''}`}
                                onClick={() => setHealthMode('sleep')}
                            >
                                <h3>Track Sleep Score</h3>
                                <p>I will log my sleep quality daily.</p>
                            </div>

                            <div
                                className={`health-card ${healthMode === 'readiness' ? 'selected' : ''}`}
                                onClick={() => setHealthMode('readiness')}
                            >
                                <h3>Track Readiness</h3>
                                <p>I will log my Oura/Whoop/Garmin readiness score.</p>
                            </div>

                            <div
                                className={`health-card ${healthMode === 'none' ? 'selected' : ''}`}
                                onClick={() => setHealthMode('none')}
                            >
                                <h3>No Tracking</h3>
                                <p>Disable wellness modifiers and daily prompts.</p>
                            </div>
                        </div>

                        <div className="cc-actions spaced mt-4">
                            <GachaButton variant="secondary" onClick={() => setStep(2)}>Back</GachaButton>
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
