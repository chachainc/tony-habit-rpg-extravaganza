import React, { useRef, useState, useMemo } from 'react';
import { Camera, Trash2, X, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHealthStore, getDateLabel } from '../../store/useHealthStore';
import { useGameStore } from '../../store/useGameStore';
import { compressImage } from './utils/imageCompression';

export const MealPhotosSection = () => {
    const { addMealPhoto, getAllMealPhotos, deleteMealPhoto } = useHealthStore();
    const { addSkillXp } = useGameStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

    const allPhotos = getAllMealPhotos();

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
            // Compress significantly harder since meal photos can be numerous
            const dataUrl = await compressImage(file, 500, 0.5);
            addMealPhoto(dataUrl, ""); // empty note for now
            addSkillXp('Habit', 1); // Reward a tiny bit of habit XP for tracking meal
        } catch (err) {
            console.error("Meal photo compression failed", err);
        }

        e.target.value = '';
    };

    const triggerUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        <section className="health-section">
            <h3 className="health-section__title" style={{ color: 'var(--text-strong)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Utensils size={20} color="#10b981" /> Meal Photos
            </h3>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
            />

            <button 
                onClick={triggerUpload}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                    width: '100%', padding: '1rem', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
                    fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.3)', marginBottom: '1.5rem'
                }}
            >
                <Camera size={20} />
                <span>Snap a Meal</span>
            </button>

            {photosByDate.length === 0 ? (
                <div className="history-empty" style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-surface)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                    No meals tracked yet. Snap a picture of your food to build awareness!
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
                                            alt={`Meal - ${date}`}
                                            onClick={() => setViewingPhoto(photo.dataUrl)}
                                            style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                                        />
                                        <button 
                                            onClick={() => deleteMealPhoto(photo.id)}
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
