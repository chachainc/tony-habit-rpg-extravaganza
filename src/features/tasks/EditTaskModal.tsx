import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pencil, CheckCircle, X } from 'lucide-react';
import type { RecurringTask } from '../../store/useRecurringTasksStore';

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

    if (!task) return null;

    const toggleDay = (day: number) => {
        setActiveDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a,b) => a - b)
        );
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(task.id, {
            title: title.trim() || task.title,
            activeDays
        });
        onClose();
    };

    return (
        <motion.div
            className="todo-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="todo-modal-card"
                initial={{ scale: 0.9, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 30, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '16px', maxWidth: '400px', width: '90%' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 700 }}>
                        <Pencil size={20} className="text-muted" />
                        Edit Task
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Task Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={task.title}
                            autoFocus
                            style={{
                                width: '100%',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--border)',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Days</label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label, idx) => {
                                const isActive = activeDays.includes(idx);
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => toggleDay(idx)}
                                        style={{
                                            flex: 1,
                                            minWidth: '40px',
                                            padding: '10px 0',
                                            borderRadius: '8px',
                                            border: isActive ? '1px solid var(--text-strong)' : '1px solid rgba(255,255,255,0.1)',
                                            background: isActive ? 'var(--text-strong)' : 'rgba(0,0,0,0.2)',
                                            color: isActive ? 'var(--bg-dark)' : 'var(--text-secondary)',
                                            fontWeight: isActive ? 700 : 500,
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

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '8px',
                            background: 'var(--text-strong)',
                            color: 'var(--bg-dark)',
                            fontSize: '1rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            marginTop: '0.5rem'
                        }}
                    >
                        <CheckCircle size={18} />
                        Save Changes
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
};
