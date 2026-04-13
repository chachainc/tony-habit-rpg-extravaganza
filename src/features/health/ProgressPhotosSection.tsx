import React, { useRef, useState, useMemo } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHealthStore, getDateLabel } from '../../store/useHealthStore';
import { useGameStore } from '../../store/useGameStore';
import { compressImage } from './utils/imageCompression';

export const ProgressPhotosSection = () => {
    const { addProgressPhoto, getAllPhotos, deletePhoto } = useHealthStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadType, setUploadType] = useState<'front' | 'side' | 'back'>('front');
    const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

    const allPhotos = getAllPhotos();

    const photosByDate = useMemo(() => {
        const groups: Record<string, typeof allPhotos> = {};
        allPhotos.forEach(p => {
            if (!groups[p.date]) groups[p.date] = [];
            groups[p.date].push(p);
        });
        return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
    }, [allPhotos]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const dataUrl = await compressImage(file, 600, 0.65);
            addProgressPhoto(uploadType, dataUrl);
            
            // Check daily reward (all 3 sides)
            // Wait slightly for store to update
            setTimeout(() => {
                const store = useHealthStore.getState();
                const latestPhotoDate = store.progressPhotos.length > 0 ? store.progressPhotos[0].date : null;
                if (latestPhotoDate && store.photoRewardLastClaimDate !== latestPhotoDate) {
                    const todaysPhotos = store.getPhotosForDate(latestPhotoDate);
                    const types = new Set(todaysPhotos.map(p => p.type));
                    if (types.has('front') && types.has('side') && types.has('back')) {
                        useGameStore.getState().addSkillXp('Habit', 3);
                        useGameStore.getState().addSkillXp('Health', 2);
                        store.setPhotoRewardClaimDate(latestPhotoDate);
                        
                        import('../../components/ui/Toast').then(({ useToastStore }) => {
                            useToastStore.getState().addToast({
                                type: 'success', message: '+3 Habit, +2 Health XP for full progress update!', duration: 3000
                            });
                        }).catch(() => {});
                    }
                }
            }, 100);

        } catch (err) {
            console.error("Photo compression failed", err);
        }

        e.target.value = '';
    };

    const triggerUpload = (type: 'front' | 'side' | 'back') => {
        setUploadType(type);
        fileInputRef.current?.click();
    };

    return (
        <section className="health-section">
            <h3 className="health-section__title" style={{ color: 'var(--text-strong)', marginBottom: '1rem' }}>
                📸 Progress Photos
            </h3>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
            />

            <div className="photo-upload-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {(['front', 'side', 'back'] as const).map((type) => (
                    <button 
                        key={type} 
                        onClick={() => triggerUpload(type)}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                            background: 'var(--bg-surface)', padding: '1rem 0.5rem', borderRadius: '12px',
                            border: '1px dashed var(--border)', color: 'var(--text-muted)', cursor: 'pointer'
                        }}
                    >
                        <Camera size={20} />
                        <span style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{type}</span>
                    </button>
                ))}
            </div>

            {photosByDate.length === 0 ? (
                <div className="history-empty" style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-surface)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                    No progress photos yet. Upload your first to track changes!
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {photosByDate.map(([date, photos]) => (
                        <div key={date} style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{getDateLabel(date)}</div>
                            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
                                {photos.map((photo) => (
                                    <div key={photo.id} style={{ position: 'relative', flexShrink: 0 }}>
                                        <img
                                            src={photo.dataUrl}
                                            alt={`${photo.type} progress`}
                                            onClick={() => setViewingPhoto(photo.dataUrl)}
                                            style={{ width: '80px', height: '100px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                                        />
                                        <span style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>
                                            {photo.type}
                                        </span>
                                        <button 
                                            onClick={() => deletePhoto(photo.id)}
                                            style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {viewingPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setViewingPhoto(null)}
                        style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <button style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                            <X size={32} />
                        </button>
                        <img src={viewingPhoto} alt="Full scale" style={{ maxWidth: '90%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};
