import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SoundState {
    isMuted: boolean;
    volume: number;

    // Actions
    setMuted: (muted: boolean) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;

    // Sound effects (using Web Audio API oscillators)
    playPurchaseSound: () => void;
    playSuccessSound: () => void;
    playErrorSound: () => void;
    playUnlockSound: () => void;
}

// Audio context singleton
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

// Play a tone with given parameters
const playTone = (
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.3,
    delay: number = 0
) => {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime + delay);
        oscillator.stop(ctx.currentTime + delay + duration);
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
};

export const useSoundStore = create<SoundState>()(
    persist(
        (set, get) => ({
            isMuted: false,
            volume: 0.5,

            setMuted: (muted) => set({ isMuted: muted }),
            setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
            toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

            // Coin jingle / cash register sound
            playPurchaseSound: () => {
                if (get().isMuted) return;
                const vol = get().volume * 0.4;

                // Ascending arpeggio
                playTone(523, 0.15, 'triangle', vol, 0); // C5
                playTone(659, 0.15, 'triangle', vol, 0.08); // E5
                playTone(784, 0.2, 'triangle', vol, 0.16); // G5
            },

            // Achievement / success fanfare
            playSuccessSound: () => {
                if (get().isMuted) return;
                const vol = get().volume * 0.35;

                // Triumphant chord
                playTone(523, 0.3, 'sine', vol, 0); // C5
                playTone(659, 0.3, 'sine', vol, 0); // E5
                playTone(784, 0.3, 'sine', vol, 0); // G5
                playTone(1047, 0.4, 'sine', vol * 0.8, 0.15); // C6
            },

            // Error / denied buzz
            playErrorSound: () => {
                if (get().isMuted) return;
                const vol = get().volume * 0.3;

                // Low buzz
                playTone(200, 0.15, 'sawtooth', vol, 0);
                playTone(180, 0.2, 'sawtooth', vol, 0.12);
            },

            // Unlock / rare item discovery
            playUnlockSound: () => {
                if (get().isMuted) return;
                const vol = get().volume * 0.4;

                // Magical ascending sparkle
                playTone(880, 0.1, 'sine', vol * 0.6, 0); // A5
                playTone(1047, 0.1, 'sine', vol * 0.7, 0.08); // C6
                playTone(1319, 0.1, 'sine', vol * 0.8, 0.16); // E6
                playTone(1568, 0.15, 'sine', vol, 0.24); // G6
                playTone(2093, 0.25, 'sine', vol * 0.9, 0.32); // C7
            },
        }),
        {
            name: 'gl-sound-v1',
        }
    )
);
