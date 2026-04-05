import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import cowBurnsMoneyVideo from '../../assets/video/cow_burns_money.mp4';
import './SpendingCutscene.css';

interface Props {
    isVisible: boolean;
    onDismiss: () => void;
}

export const SpendingCutscene = ({ isVisible, onDismiss }: Props) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasTriggeredRef = useRef(false);

    useEffect(() => {
        if (isVisible) {
            hasTriggeredRef.current = false;
            const vid = videoRef.current;
            if (vid) {
                vid.currentTime = 0;
                vid.play().catch(() => {
                    // Video failed to autoplay — let the overlay stay skippable
                });
            }
        } else {
            const vid = videoRef.current;
            if (vid) {
                vid.pause();
                vid.currentTime = 0;
            }
        }
    }, [isVisible]);

    const handleDismiss = () => {
        if (hasTriggeredRef.current) return;
        hasTriggeredRef.current = true;
        onDismiss();
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="spending-cutscene-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    // Intentionally do NOT dismiss on backdrop tap — must use Skip
                >
                    <motion.div
                        className="spending-cutscene-stage"
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        {/* Skip button — always visible */}
                        <button
                            className="spending-cutscene-skip"
                            onClick={handleDismiss}
                            aria-label="Skip cutscene"
                        >
                            ✕ Skip
                        </button>

                        {/* Video */}
                        <video
                            ref={videoRef}
                            className="spending-cutscene-video"
                            src={cowBurnsMoneyVideo}
                            muted
                            playsInline
                            onEnded={handleDismiss}
                            onError={handleDismiss}
                            preload="auto"
                        />

                        {/* Fallback caption */}
                        <p className="spending-cutscene-caption">🔥 Money burned!</p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
