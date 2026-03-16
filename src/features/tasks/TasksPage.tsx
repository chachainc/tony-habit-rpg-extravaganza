import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { Plus, Gift, CheckCircle, Circle, Sun, Sunset, Moon, Star, MinusCircle, Trash2, Pencil, Dices, CalendarDays } from 'lucide-react';
import { Card } from '../../components/ui';
import { useGameStore, type SkillName } from '../../store/useGameStore';
import { safeUUID } from '../../utils/safeUUID';

import { useRecurringTasksStore, type BundleType, DAILY_TASKS_TEMPLATE } from '../../store/useRecurringTasksStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { WeightInput } from '../../components/WeightInput/WeightInput';
import { TrainingInput } from './TrainingInput';
import { DailyChest } from './DailyChest';
import { useNavigate } from 'react-router-dom';
import './TasksPage.css';


// Skill icons mapping
const SKILL_ICONS: Record<SkillName, string> = {
    'Sleep': '😴',
    'Hygiene': '🧼',
    'Flexibility': '🧘',
    'Strength': '💪',
    'Cardio': '🏃',
    'Work': '💼',
    'Health': '❤️',
    'Social': '🤝',
    'Luck': '🍀',
    'Habit': '🔥',
    'Intelligence': '🧠',
};

// Skill colors
const SKILL_COLORS: Record<SkillName, string> = {
    'Sleep': '#8b5cf6',
    'Hygiene': '#06b6d4',
    'Flexibility': '#ec4899',
    'Strength': '#ef4444',
    'Cardio': '#f59e0b',
    'Work': '#64748b',
    'Health': '#f43f5e',
    'Social': '#f97316',
    'Luck': '#fcd34d',
    'Habit': '#ff6b35',
    'Intelligence': '#a78bfa',
};

const BUNDLE_CONFIG: Record<BundleType, { title: string; icon: React.ReactNode; color: string }> = {
    morning: { title: 'Morning Foundation', icon: <Sun size={24} />, color: '#f59e0b' },
    afternoon: { title: 'Afternoon Performance', icon: <Sunset size={24} />, color: '#f97316' },
    night: { title: 'Night Shutdown', icon: <Moon size={24} />, color: '#8b5cf6' },
};

export const TasksPage = () => {
    const navigate = useNavigate();
    const { skills } = useGameStore();

    const {
        dailyTasks,
        weeklyTasks,
        completeTask,
        checkAndReset,
        getBundleStatus,
        claimBundleReward,
        claimPerfectDayBonus,
        perfectDayClaimed,
        isWeeklyComplete,
        claimWeeklyBonus,
        weeklyBonusClaimed,
        addCustomRecurringTask,
        removeDailyTask,
        editDailyTask,
        getTodayWeight,
    } = useRecurringTasksStore();

    const todayWeight = getTodayWeight();

    // Form State
    const [taskTitle, setTaskTitle] = useState('');
    const [customSkills, setCustomSkills] = useState<{skill: SkillName, xp: number}[]>([{ skill: 'Sleep', xp: 1 }]);
    const [taskType, setTaskType] = useState<'today' | 'calendar' | 'recurring'>('today');
    const [selectedBundle, setSelectedBundle] = useState<BundleType>('morning');

    // Input Modals
    const [showWeightInput, setShowWeightInput] = useState(false);
    const [showTrainingInput, setShowTrainingInput] = useState(false);


    // Scroll Highlight State
    const [highlightAddTask, setHighlightAddTask] = useState(false);

    const scrollToAdd = () => {
        const element = document.getElementById('add-task-section');
        if (element) {
            // Use window scroll if element scroll fails, or ensure container is scrollable
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightAddTask(true);
            setTimeout(() => setHighlightAddTask(false), 2000);
        } else {
            console.error("Target element 'add-task-section' not found");
        }
    };

    // Check and reset tasks on mount
    useEffect(() => {
        checkAndReset();
    }, [checkAndReset]);

    // Timer state for re-rendering
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    // Calendar Store
    const { addTask: addCalendarTask, tasks: calendarTasks, toggleTask: toggleCalendarTask, deleteTask: deleteCalendarTask } = useCalendarStore();
    // Use dayjs for correct local date (ISO string is UTC and can be tomorrow)
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle.trim()) return;

        if (taskType === 'recurring') {
            addCustomRecurringTask(taskTitle, selectedBundle, customSkills.map(cs => ({
                skillId: cs.skill,
                xp: cs.xp
            })));
        } else if (taskType === 'today') {
            const newTask = {
                id: safeUUID(),
                text: taskTitle,
                completed: false,
                skillId: customSkills[0].skill,
                difficulty: 'medium' as 'easy' | 'medium' | 'hard'
            };
            addCalendarTask(dayjs().format('YYYY-MM-DD'), newTask);
        } else {
            // Calendar Day
            const newTask = {
                id: safeUUID(),
                text: taskTitle,
                completed: false,
                skillId: customSkills[0].skill,
                difficulty: 'medium' as 'easy' | 'medium' | 'hard'
            };
            addCalendarTask(selectedDate, newTask);
        }

        setTaskTitle('');
    };



    // Filter Luck out — it cannot be assigned to tasks
    const skillNames = (Object.keys(skills) as SkillName[]).filter(s => s !== 'Luck');

    const getTimeUntilWeeklyReset = () => {
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday
        const daysUntilSunday = day === 0 ? 0 : 7 - day;
        const target = new Date(now);
        target.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
        target.setHours(0, 0, 0, 0);

        const diff = target.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${days}d ${hours}h ${minutes}m`;
    };

    const renderBundle = (bundleType: BundleType) => {
        const templateIds = new Set(DAILY_TASKS_TEMPLATE.map(t => t.id));
        const bundleTasksRaw = dailyTasks.filter(t => t.bundle === bundleType);
        
        // Hide anything removed from template unless it's a custom task
        const bundleTasks = bundleTasksRaw.filter(t => templateIds.has(t.id) || t.id.startsWith('custom-'));

        if (bundleTasks.length === 0) return null;

        const status = getBundleStatus(bundleType);
        const config = BUNDLE_CONFIG[bundleType];

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bundle-section"
            >
                <Card variant="elevated" className={`bundle-card ${status.isComplete ? 'completed-glow' : ''}`}>
                    <div className="recurring-header">
                        <div className="bundle-title-row">
                            <span style={{ color: config.color }}>{config.icon}</span>
                            <div>
                                <h2>{config.title}</h2>
                                <p className="recurring-subtitle">
                                    {status.completedCount}/{status.totalCount} completed • Reward: 25 Gold
                                </p>
                            </div>
                        </div>
                        {status.isComplete && !status.isClaimed && (
                            <button
                                className="bundle-claim-btn"
                                onClick={() => claimBundleReward(bundleType)}
                            >
                                <Gift size={16} /> Claim 25 Gold
                            </button>
                        )}
                        {status.isClaimed && (
                            <div className="bundle-claimed">
                                ✓ Claimed
                            </div>
                        )}
                    </div>

                    <div className="recurring-tasks-list">
                        {bundleTasks.map((task) => (
                            <div
                                key={task.id}
                                className={`recurring-task ${task.completed ? 'completed' : ''}`}
                                onClick={() => {
                                    if (!task.completed) {
                                        if (task.requiresInput === 'weight') {
                                            // Only open modal if no weight logged today yet
                                            setShowWeightInput(true);
                                        } else if (task.requiresInput === 'training') {
                                            setShowTrainingInput(true);
                                        } else {
                                            completeTask(task.id);
                                        }
                                    }
                                }}
                            >
                                <div className="recurring-task__check">
                                    {task.completed ? (
                                        <CheckCircle size={24} className="check-done" />
                                    ) : (
                                        <Circle size={24} className="check-todo" />
                                    )}
                                </div>
                                <div className="recurring-task__info">
                                    <span className="recurring-task__title">{task.title}</span>
                                    {/* Show logged weight inline for Weigh Self when completed */}
                                    {task.requiresInput === 'weight' && task.completed && todayWeight != null && (
                                        <span className="weight-logged-badge">⚖️ {todayWeight} lbs</span>
                                    )}
                                    <div className="recurring-task__meta">
                                        {task.rewards.map((reward, idx) => (
                                            <span
                                                key={idx}
                                                className="skill-badge"
                                                style={{ background: SKILL_COLORS[reward.skillId] }}
                                            >
                                                {SKILL_ICONS[reward.skillId]} {reward.skillId} +{reward.xp}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="task-action-btns">
                                    <button
                                        className="task-edit-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newTitle = prompt('Edit task title:', task.title);
                                            if (newTitle && newTitle.trim()) {
                                                editDailyTask(task.id, newTitle.trim());
                                            }
                                        }}
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        className="task-delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Remove "${task.title}"?`)) {
                                                removeDailyTask(task.id);
                                            }
                                        }}
                                    >
                                        <MinusCircle size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </motion.div>
        );
    };

    const morningStatus = getBundleStatus('morning');
    const afternoonStatus = getBundleStatus('afternoon');
    const nightStatus = getBundleStatus('night');
    const isPerfectDay = morningStatus.isComplete && afternoonStatus.isComplete && nightStatus.isComplete;

    return (
        <div className="tasks-page-aaa">
            {/* Background effects */}
            <div className="tasks-bg">
                <div className="tasks-bg__image" />
                <div className="tasks-bg__vignette" />
                <div className="tasks-bg__fog">
                    <div className="fog fog--1" />
                    <div className="fog fog--2" />
                </div>
            </div>

            <div className="tasks-content">
                {/* Header with nav buttons */}
                <motion.div
                    className="tasks-header"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <button onClick={() => navigate('/monopoly')} className="tasks-header-nav-btn tasks-header-nav-btn--spin">
                        <Dices size={16} />
                        Daily Spin
                    </button>
                    <div className="tasks-header-center">
                        <h1>Daily Routine</h1>
                        <p className="tasks-subtitle">Build consistency with daily bundles</p>
                    </div>
                    <button onClick={() => navigate('/calendar')} className="tasks-header-nav-btn tasks-header-nav-btn--calendar">
                        <CalendarDays size={16} />
                        Calendar
                    </button>
                </motion.div>

                {/* Add Task Shortcut */}
                <div className="tasks-add-shortcut-row">
                    <button onClick={scrollToAdd} className="add-task-shortcut-btn">
                        <Plus size={16} />
                        Add Task
                    </button>
                </div>

                {/* Perfect Day Banner */}
                {isPerfectDay && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="perfect-day-banner"
                    >
                        <Card className="perfect-day-card">
                            <div className="perfect-day-content">
                                <div className="perfect-day-icon">
                                    <div className="star-burst"><Star size={48} fill="gold" color="gold" /></div>
                                </div>
                                <div>
                                    <h2>Perfect Day Achieved!</h2>
                                    <p>All bundles complete. You are unstoppable.</p>
                                </div>
                                {!perfectDayClaimed ? (
                                    <button
                                        className="perfect-claim-btn"
                                        onClick={() => claimPerfectDayBonus()}
                                    >
                                        <Gift size={20} /> Claim 75 Gold Bonus
                                    </button>
                                ) : (
                                    <div className="perfect-claimed">
                                        ✓ Bonus Claimed
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Daily Bundles */}
                <div className="bundles-container">
                    {renderBundle('morning')}
                    {renderBundle('afternoon')}
                    {renderBundle('night')}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    {(() => {
                        const todayStr = dayjs().format('YYYY-MM-DD');
                        const todayTasks = calendarTasks[todayStr] || [];
                        if (todayTasks.length === 0) return null;
                        return (
                            <Card variant="elevated" className="recurring-section custom-today-section">
                                <div className="recurring-header">
                                    <div>
                                        <h2>📌 Today's Custom Tasks</h2>
                                        <p className="recurring-subtitle">Tasks assigned to {dayjs().format('MMM D')}</p>
                                    </div>
                                    <div className="completion-badge">
                                        {todayTasks.filter(t => t.completed).length} / {todayTasks.length}
                                    </div>
                                </div>
                                <div className="recurring-tasks-list">
                                    {todayTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className={`recurring-task ${task.completed ? 'completed' : ''}`}
                                            onClick={() => toggleCalendarTask(todayStr, task.id)}
                                        >
                                            <div className="recurring-task__check">
                                                {task.completed ? (
                                                    <CheckCircle size={24} className="check-done" />
                                                ) : (
                                                    <Circle size={24} className="check-todo" />
                                                )}
                                            </div>
                                            <div className="recurring-task__info">
                                                <span className="recurring-task__title">{task.text}</span>
                                                {task.skillId && (
                                                    <div className="recurring-task__meta">
                                                        <span
                                                            className="skill-badge"
                                                            style={{ background: SKILL_COLORS[task.skillId as SkillName] }}
                                                        >
                                                            {SKILL_ICONS[task.skillId as SkillName]} {task.skillId}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                className="task-delete-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Delete "${task.text}"?`)) {
                                                        deleteCalendarTask(todayStr, task.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        );
                    })()}
                </motion.div>

                {/* Weekly Recurring Tasks */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card variant="elevated" className="recurring-section">
                        <div className="recurring-header">
                            <div>
                                <h2>📆 Weekly Tasks</h2>
                                <p className="recurring-subtitle">
                                    Complete all {weeklyTasks.length} tasks to earn 100 gold
                                </p>
                            </div>
                            <div className="completion-badge">
                                {weeklyTasks.filter(t => t.completed).length} / {weeklyTasks.length}
                            </div>
                        </div>
                        <div className="reset-timer" style={{
                            fontSize: '0.85rem',
                            color: '#94a3b8',
                            marginTop: '-1rem',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>⏳ Resets in: {getTimeUntilWeeklyReset()}</span>
                        </div>

                        <div className="recurring-tasks-list">
                            {weeklyTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`recurring-task ${task.completed ? 'completed' : ''}`}
                                    onClick={() => !task.completed && completeTask(task.id)}
                                >
                                    <div className="recurring-task__check">
                                        {task.completed ? (
                                            <CheckCircle size={24} className="check-done" />
                                        ) : (
                                            <Circle size={24} className="check-todo" />
                                        )}
                                    </div>
                                    <div className="recurring-task__info">
                                        <span className="recurring-task__title">{task.title}</span>
                                        <div className="recurring-task__meta">
                                            {task.rewards.map((reward, idx) => (
                                                <span
                                                    key={idx}
                                                    className="skill-badge"
                                                    style={{ background: SKILL_COLORS[reward.skillId] }}
                                                >
                                                    {SKILL_ICONS[reward.skillId]} {reward.skillId} +{reward.xp}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {isWeeklyComplete() && !weeklyBonusClaimed && (
                            <button
                                className="bonus-claim-btn bonus-claim-btn--weekly"
                                onClick={() => claimWeeklyBonus()}
                            >
                                <Gift size={20} />
                                Claim 100 Gold Bonus!
                            </button>
                        )}

                        {weeklyBonusClaimed && (
                            <div className="bundle-claimed" style={{ marginTop: '1rem' }}>
                                ✓ Weekly bonus claimed! Resets Sunday.
                            </div>
                        )}
                    </Card>
                </motion.div>

                {/* Input Modals */}
                <WeightInput
                    isOpen={showWeightInput}
                    onClose={() => setShowWeightInput(false)}
                    todayWeight={todayWeight}
                    onSubmit={(weight) => completeTask('weigh_self', { weight })}
                />


                <TrainingInput
                    isOpen={showTrainingInput}
                    onClose={() => setShowTrainingInput(false)}
                    onSubmit={(selections) => completeTask('training_session', { trainingSelections: selections })}
                />

                {/* Skills moved to Stats tab */}

                {/* Daily Chest */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <DailyChest />
                </motion.div>

                {/* Custom Task Creation */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card
                        id="add-task-section"
                        variant="elevated"
                        className={`task-creator ${highlightAddTask ? 'highlight-section' : ''}`}
                    >
                        <h2>Add Custom Task</h2>
                        <form onSubmit={handleAdd} className="task-form">
                            <input
                                type="text"
                                placeholder="What else do you need to do?"
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                className="task-input"
                            />

                            <div className="task-form__row">
                                {customSkills.map((cs, idx) => (
                                    <div key={idx} className="multi-skill-row" style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <label style={{ margin: 0 }}>Skill {idx + 1}</label>
                                                {customSkills.length > 1 && (
                                                    <button type="button" onClick={() => setCustomSkills(customSkills.filter((_, i) => i !== idx))} className="task-delete-btn" style={{ background: 'transparent', padding: '4px' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            <select
                                                value={cs.skill}
                                                onChange={(e) => {
                                                    const newArray = [...customSkills];
                                                    newArray[idx].skill = e.target.value as SkillName;
                                                    setCustomSkills(newArray);
                                                }}
                                                className="form-select"
                                            >
                                                {skillNames.map(skill => (
                                                    <option key={skill} value={skill}>
                                                        {SKILL_ICONS[skill]} {skill}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group xp-picker-group">
                                            <label>XP Reward</label>
                                            <div className="xp-presets">
                                                {[{ label: 'Easy', xp: 1 }, { label: 'Medium', xp: 3 }, { label: 'Hard', xp: 5 }].map(p => (
                                                    <button
                                                        key={p.label}
                                                        type="button"
                                                        className={`xp-preset-btn ${cs.xp === p.xp ? 'active' : ''}`}
                                                        onClick={() => {
                                                            const newArray = [...customSkills];
                                                            newArray[idx].xp = p.xp;
                                                            setCustomSkills(newArray);
                                                        }}
                                                    >
                                                        {p.label}<br /><span>{p.xp} XP</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="xp-slider-row">
                                                <input
                                                    type="range"
                                                    min={1}
                                                    max={15}
                                                    value={cs.xp}
                                                    onChange={e => {
                                                        const newArray = [...customSkills];
                                                        newArray[idx].xp = Number(e.target.value);
                                                        setCustomSkills(newArray);
                                                    }}
                                                    className="xp-slider"
                                                />
                                                <span className="xp-value-bubble">{cs.xp} XP</span>
                                            </div>
                                            {cs.xp >= 5 && (
                                                <div className="xp-extreme-label" style={{ marginTop: '0.5rem' }}>
                                                    {cs.xp === 15 ? '💀 Impossible'
                                                        : cs.xp >= 12 ? '🌋 Super Duper Insane'
                                                            : cs.xp >= 10 ? '🤯 You\'re Crazy'
                                                                : '😤 Insane'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {customSkills.length < 3 && (
                                    <button 
                                        type="button" 
                                        className="tasks-header-nav-btn" 
                                        onClick={() => setCustomSkills([...customSkills, { skill: 'Sleep', xp: 1 }])} 
                                        style={{ marginBottom: '1.5rem', alignSelf: 'flex-start' }}
                                    >
                                        <Plus size={16} /> Add Another Skill
                                    </button>
                                )}

                                <div className="form-group">
                                    <label>Task Type</label>
                                    <select
                                        value={taskType}
                                        onChange={(e) => setTaskType(e.target.value as any)}
                                        className="form-select"
                                    >
                                        <option value="today">Today Only</option>
                                        <option value="recurring">Daily Recurring</option>
                                        <option value="calendar">Future Calendar</option>
                                    </select>
                                </div>

                                {taskType === 'recurring' && (
                                    <div className="form-group">
                                        <label>Bundle</label>
                                        <select
                                            value={selectedBundle}
                                            onChange={(e) => setSelectedBundle(e.target.value as BundleType)}
                                            className="form-select"
                                        >
                                            <option value="morning">Morning Foundation</option>
                                            <option value="afternoon">Afternoon Performance</option>
                                            <option value="night">Night Shutdown</option>
                                        </select>
                                    </div>
                                )}

                                {taskType === 'calendar' && (
                                    <div className="form-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="form-input"
                                            style={{
                                                background: 'rgba(255,255,255,0.1)',
                                                color: 'white',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                padding: '0.5rem',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!taskTitle.trim()}
                                    className="btn btn--primary btn--md"
                                >
                                    <Plus size={18} />
                                    Add Task
                                </button>
                            </div>
                        </form>
                    </Card>
                </motion.div>


            </div>
        </div>
    );
};
