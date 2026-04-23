import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Pencil, Check, X } from 'lucide-react';
import type { RecurringTask } from '../../store/useRecurringTasksStore';
import { useToastStore } from '../../components/ui/Toast';

interface EditTaskModalProps {
    task: RecurringTask | null;
    currentOverride: { title?: string; activeDays?: number[] } | undefined;
    onSave: (id: string, updates: Partial<RecurringTask>) => void;
    onClose: () => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, currentOverride, onSave, onClose }) => {
    const [title, setTitle] = useState('');
    const [activeDays, setActiveDays] = useState<number[]>([]);

    useEffect(() => {
        if (task) {
            const initialTitle = currentOverride?.title ?? task.title ?? '';
            setTitle(initialTitle);
            
            let initialDays = currentOverride?.activeDays ?? task.activeDays;
            if (!initialDays || initialDays.length === 0) {
                initialDays = [0, 1, 2, 3, 4, 5, 6]; // Default to all days for older tasks
            }
            setActiveDays(initialDays);
        }
    }, [task, currentOverride]);

    // Handle body locking
    useEffect(() => {
        if (task) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [task]);

    if (!task) return null;

    const toggleDay = (day: number) => {
        setActiveDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a,b) => a - b)
        );
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalTitle = title.trim() || task.title;
        const previousDays = currentOverride?.activeDays ?? task.activeDays ?? [0, 1, 2, 3, 4, 5, 6];
        const titleChanged = finalTitle !== (currentOverride?.title ?? task.title);
        const daysChanged = JSON.stringify(activeDays) !== JSON.stringify(previousDays);

        onSave(task.id, {
            title: finalTitle,
            activeDays
        });

        if (titleChanged || daysChanged) {
            useToastStore.getState().addToast({
                type: 'success',
                message: 'Task updated successfully',
                duration: 2500
            });
        }
        
        onClose();
    };

    const isDirty = (title.trim() && title.trim() !== (currentOverride?.title ?? task.title)) || 
                    JSON.stringify(activeDays) !== JSON.stringify(currentOverride?.activeDays ?? task.activeDays ?? [0, 1, 2, 3, 4, 5, 6]);

    return createPortal(
        <motion.div
            className="todo-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 100000, // Stay securely above Layout bottom nav
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'env(safe-area-inset-top, 20px) 16px env(safe-area-inset-bottom, 20px) 16px'
            }}
        >
            <motion.div
                className="todo-modal-card"
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#0f172a',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05) inset',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '420px',
                    // Use max-height that leaves room for iOS keyboard / safe areas
                    maxHeight: 'min(90dvh, calc(100dvh - env(safe-area-inset-bottom) - 40px))', 
                    overflow: 'hidden',
                }}
            >
                {/* Header Container */}
                <div style={{ 
                    padding: '20px 24px', 
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                            background: 'rgba(6, 182, 212, 0.15)', 
                            color: '#22d3ee',
                            padding: '8px', 
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Pencil size={18} strokeWidth={2.5} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                            Edit Task
                        </h2>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose} 
                        style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: '#64748b', 
                            cursor: 'pointer',
                            padding: '6px',
                            display: 'flex',
                            borderRadius: '50%',
                            transition: 'all 0.2s',
                            outline: 'none'
                        }}
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>
                
                {/* Scrollable Form Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Task Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={task.title}
                            autoFocus
                            style={{
                                width: '100%',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(6, 182, 212, 0.2)',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                color: '#f8fafc',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#06b6d4'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.2)'}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Active Days
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label, idx) => {
                                const isActive = activeDays.includes(idx);
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => toggleDay(idx)}
                                        style={{
                                            flex: 1,
                                            minWidth: '42px',
                                            padding: '12px 0',
                                            borderRadius: '10px',
                                            border: isActive ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)',
                                            background: isActive ? 'rgba(6, 182, 212, 0.15)' : 'rgba(0,0,0,0.2)',
                                            color: isActive ? '#22d3ee' : '#64748b',
                                            fontWeight: isActive ? 800 : 600,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sticky Footer */}
                <div style={{ 
                    padding: '20px 24px', 
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(15, 23, 42, 0.95)',
                    display: 'flex',
                    gap: '12px',
                    backdropFilter: 'blur(4px)',
                    flexShrink: 0
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '14px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#cbd5e1',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        style={{
                            flex: 2,
                            padding: '14px',
                            borderRadius: '12px',
                            background: isDirty ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' : 'rgba(255,255,255,0.1)',
                            color: isDirty ? '#ffffff' : '#94a3b8',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            border: 'none',
                            cursor: isDirty ? 'pointer' : 'default',
                            boxShadow: isDirty ? '0 4px 12px rgba(6, 182, 212, 0.3)' : 'none',
                            transition: 'all 0.2s',
                            opacity: isDirty ? 1 : 0.7
                        }}
                    >
                        <Check size={18} strokeWidth={2.5} />
                        {isDirty ? 'Save Changes' : 'Saved'}
                    </button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};
