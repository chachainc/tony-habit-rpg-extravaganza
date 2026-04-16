import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useRecurringTasksStore, DAILY_TASKS_TEMPLATE, type RecurringTask } from '../../store/useRecurringTasksStore';
import { EditTaskModal } from './EditTaskModal';
import { Card } from '../../components/ui';
import { getTodayIndex } from '../../utils/dayHelpers';

export const AllTasksPage: React.FC = () => {
    const navigate = useNavigate();
    const { customRecurringTasks, taskOverrides, removedTaskIds, editDailyTask, removeDailyTask } = useRecurringTasksStore();
    const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);

    // Assembly
    const baseTasks = DAILY_TASKS_TEMPLATE.filter(t => !removedTaskIds.includes(t.id));
    
    const allTasks: RecurringTask[] = [...baseTasks, ...customRecurringTasks].map(t => {
        const finalTask = { ...t };
        const override = taskOverrides[t.id];
        if (override) {
            if (override.bundle) finalTask.bundle = override.bundle;
            if (override.title) finalTask.title = override.title;
            if (override.activeDays) finalTask.activeDays = override.activeDays;
        }
        return finalTask as RecurringTask;
    });

    const todayDow = getTodayIndex();

    const isVisibleToday = (task: RecurringTask) => {
        const days = task.activeDays;
        if (!days || days.length === 0) return true;
        return days.includes(todayDow);
    };

    return (
        <div style={{ padding: '1rem', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1rem 0' }}
            >
                <button 
                    onClick={() => navigate('/tasks')} 
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Manage All Tasks</h1>
            </motion.div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {allTasks.map(task => {
                    const showsToday = isVisibleToday(task);

                    return (
                        <Card key={task.id} variant="elevated" className="recurring-task-card">
                            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>
                                    {task.title}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        padding: '2px 8px', 
                                        borderRadius: '12px', 
                                        background: showsToday ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)', 
                                        color: showsToday ? '#4ade80' : 'var(--text-muted)',
                                        fontWeight: 600
                                    }}>
                                        {showsToday ? 'Shows Today' : 'Hidden Today'}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Bundle: {task.bundle || 'None'}
                                    </span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setEditingTask({ ...task })}
                                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm(`Remove "${task.title}"?`)) {
                                            removeDailyTask(task.id);
                                        }
                                    }}
                                    style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#f87171', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <AnimatePresence>
                {editingTask && (
                    <EditTaskModal
                        task={editingTask}
                        currentOverride={taskOverrides[editingTask.id]}
                        onSave={(id, updates) => editDailyTask(id, updates)}
                        onClose={() => setEditingTask(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
