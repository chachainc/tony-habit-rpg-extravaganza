import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBattleStore } from '../../store/useBattleStore';
import { useProfileStore } from '../../store/useProfileStore';

// Assuming vite handles static asset imports. We can do dynamic import or static maps.
import warriorUltVid from '../../assets/ultimates/warrior_ult.mp4';
import mageUltVid from '../../assets/ultimates/mage_ult.mp4';
import guardianUltVid from '../../assets/ultimates/guardian_ult.mp4';
import rangerUltVid from '../../assets/ultimates/ranger_ult.mp4';

export const UltimateVideoOverlay = () => {
    const activeUltimateVideo = useBattleStore(s => s.activeUltimateVideo);
    const resumeFromUltimate = useBattleStore(s => s.resumeFromUltimate);
    const classType = useProfileStore(s => s.classType);
    
    const [videoSrc, setVideoSrc] = useState<string | null>(null);

    useEffect(() => {
        if (!activeUltimateVideo) {
            setVideoSrc(null);
            return;
        }

        // Map class type to video src
        if (classType === 'Warrior') {
            setVideoSrc(warriorUltVid);
        } else if (classType === 'Mage') {
            setVideoSrc(mageUltVid);
        } else if (classType === 'Ranger') {
            setVideoSrc(rangerUltVid);
        } else if (classType === 'Guardian') {
            setVideoSrc(guardianUltVid);
        } else {
            setVideoSrc(warriorUltVid); // Failback for invalid classType
        }

    }, [activeUltimateVideo, classType]);

    // Safety timeout in case video fails to load or play
    useEffect(() => {
        if (activeUltimateVideo) {
            const timeoutId = setTimeout(() => {
                resumeFromUltimate();
            }, 6000); // Max wait time 6 seconds
            return () => clearTimeout(timeoutId);
        }
    }, [activeUltimateVideo, resumeFromUltimate]);

    if (!activeUltimateVideo) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    zIndex: 99999,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    pointerEvents: 'auto', // block interaction
                }}
            >
                {videoSrc && (
                    <video 
                        src={videoSrc}
                        autoPlay
                        playsInline
                        muted // Auto-play requires muted on some browsers, assuming we want it muted or we can leave it loud. Assuming standard effects.
                        onEnded={() => resumeFromUltimate()}
                        onError={(e) => {
                            console.error('Ultimate video failed to play', e);
                            resumeFromUltimate();
                        }}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                        }}
                    />
                )}
            </motion.div>
        </AnimatePresence>
    );
};
