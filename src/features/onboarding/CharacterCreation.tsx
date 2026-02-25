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

    const [step, setStep] = useState<1 | 2>(1);
    const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
    const [healthMode, setHealthMode] = useState<'sleep' | 'readiness' | 'none' | null>(null);

    const handleComplete = () => {
        if (!selectedArchetype || !healthMode) return;

        setCharacterArchetype(selectedArchetype as any);
        setAppearance({ hairHue: 0, skinHue: 0 });
        setHealthTrackingMode(healthMode);

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
                        <p className="text-muted">Select your class. You can switch later.</p>

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

                {/* STEP 2: Sleep Tracking */}
                {step === 2 && (
                    <Panel variant="glass" padding="lg" className="cc-panel animation-slide-up">
                        <h2>Do You Track Your Sleep?</h2>
                        <p className="text-muted mb-4">If yes, you'll log your sleep quality each morning and it will impact your in-game stats and recovery.</p>

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
