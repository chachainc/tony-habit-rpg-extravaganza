import { useState, useEffect, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Gift, CheckCircle, Circle, Sun, Sunset, Moon, Star, MinusCircle, Trash2, Pencil, Dices, CalendarDays, ChevronDown, ChevronUp, GripVertical, ClipboardList, X } from 'lucide-react';
import { Card } from '../../components/ui';
import { useGameStore, type SkillName } from '../../store/useGameStore';
import { safeUUID } from '../../utils/safeUUID';

import { useRecurringTasksStore, type BundleType, type TaskCategory, DAILY_TASKS_TEMPLATE } from '../../store/useRecurringTasksStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useTodoStore, type TimeOfDay, type Recurrence, TIME_OF_DAY_LABELS } from '../../store/useTodoStore';
import { WeightInput } from '../../components/WeightInput/WeightInput';
import { TrainingInput } from './TrainingInput';
import { DailyChest } from './DailyChest';
import { useNavigate } from 'react-router-dom';
import './TasksPage.css';


// Skill icons mapping
const SKILL_ICONS: Record<SkillName, string> = {
    Sleep: '💤',
    Hygiene: '🚿',
    Flexibility: '🤸',
    Strength: '💪',
    Cardio: '🏃',
    Work: '💼',
    Health: '❤️',
    Social: '🤝',
    Luck: '🍀',
    Habit: '🔥',
    Housemaid: '🧹',
    Intelligence: '🧠',
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
    'Social': '#ec4899', // pink
    'Luck': '#eab308',   // yellow
    'Habit': '#f97316',  // orange
    'Housemaid': '#a8a29e', // generic stone/gray
    'Intelligence': '#8b5cf6', // purple
};

const CATEGORY_CONFIG: Record<TaskCategory, { label: string; color: string; icon: string }> = {
    health: { label: 'Health', color: '#ef4444', icon: '❤️' },
    hygiene: { label: 'Hygiene', color: '#06b6d4', icon: '🚿' },
    fitness: { label: 'Fitness', color: '#22c55e', icon: '💪' },
    work: { label: 'Work', color: '#64748b', icon: '💼' },
    lifestyle: { label: 'Lifestyle', color: '#f59e0b', icon: '🏠' },
};

const BUNDLE_CONFIG: Record<BundleType, { title: string; icon: React.ReactNode; color: string }> = {
    morning: { title: 'Morning Foundation', icon: <Sun size={24} />, color: '#f59e0b' },
    midday: { title: 'Mid Day', icon: <Sun size={24} />, color: '#eab308' },
    afternoon: { title: 'Afternoon (After Work)', icon: <Sunset size={24} />, color: '#f97316' },
    night: { title: 'Night (Before Bed)', icon: <Moon size={24} />, color: '#8b5cf6' },
};

// ── Radar chart helper: draws a polygon from skill levels ──
const RADAR_SKILLS: SkillName[] = ['Strength', 'Cardio', 'Health', 'Intelligence', 'Flexibility', 'Habit'];
const RADAR_COLORS: Record<SkillName, string> = {
    'Strength': '#ef4444', 'Cardio': '#f59e0b', 'Health': '#f43f5e',
    'Intelligence': '#8b5cf6', 'Flexibility': '#ec4899', 'Habit': '#f97316',
    'Sleep': '#8b5cf6', 'Hygiene': '#06b6d4', 'Work': '#64748b',
    'Social': '#ec4899', 'Luck': '#eab308', 'Housemaid': '#a8a29e',
};

const RadarChart = ({ skills }: { skills: Record<SkillName, { level: number }> }) => {
    const size = 160;
    const center = size / 2;
    const maxRadius = 60;
    const levels = RADAR_SKILLS.map(s => skills[s]?.level || 1);
    const maxLevel = Math.max(...Object.values(skills).map(s => s.level), 5);

    const getPoint = (index: number, value: number) => {
        const angle = (Math.PI * 2 * index) / RADAR_SKILLS.length - Math.PI / 2;
        const radius = (value / maxLevel) * maxRadius;
        return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
    };

    const polygonPoints = levels.map((lvl, i) => {
        const pt = getPoint(i, lvl);
        return `${pt.x},${pt.y}`;
    }).join(' ');

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="radar-chart-svg">
            {/* Grid rings */}
            {[0.25, 0.5, 0.75, 1].map(pct => (
                <polygon
                    key={pct}
                    points={RADAR_SKILLS.map((_, i) => {
                        const pt = getPoint(i, maxLevel * pct);
                        return `${pt.x},${pt.y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1"
                />
            ))}
            {/* Axis lines */}
            {RADAR_SKILLS.map((_, i) => {
                const pt = getPoint(i, maxLevel);
                return <line key={i} x1={center} y1={center} x2={pt.x} y2={pt.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
            })}
            {/* Data polygon */}
            <polygon points={polygonPoints} fill="rgba(163, 230, 53, 0.15)" stroke="#a3e635" strokeWidth="2" />
            {/* Data dots + labels */}
            {RADAR_SKILLS.map((skill, i) => {
                const pt = getPoint(i, levels[i]);
                const labelPt = getPoint(i, maxLevel + 3);
                return (
                    <g key={skill}>
                        <circle cx={pt.x} cy={pt.y} r="3" fill={RADAR_COLORS[skill]} />
                        <text x={labelPt.x} y={labelPt.y} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="600">
                            {SKILL_ICONS[skill]}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

export const TasksPage = () => {
    const navigate = useNavigate();
    const { skills, getXpProgress } = useGameStore();

    const {
        dailyTasks,
        weeklyTasks,
        completeTask,
        uncompleteTask,
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
        moveDailyTask,
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

    // Category filter
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<TaskCategory | 'all'>('all');

    // Stats dashboard
    const [showStats, setShowStats] = useState(false);

    // Scroll Highlight State
    const [highlightAddTask, setHighlightAddTask] = useState(false);

    // Drag state — pointer-based for mobile touch support
    const [dragState, setDragState] = useState<{ taskId: string; bundle: BundleType; index: number; startY: number; isDragging: boolean } | null>(null);
    const dragOverItem = useRef<{ bundle: BundleType; index: number } | null>(null);
    const DRAG_THRESHOLD = 8;

    const scrollToAdd = () => {
        const element = document.getElementById('add-task-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightAddTask(true);
            setTimeout(() => setHighlightAddTask(false), 2000);
        }
    };

    // Check and reset tasks on mount
    useEffect(() => {
        checkAndReset();
    }, [checkAndReset]);

    // Timer state for re-rendering
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    // Calendar Store
    const { addTask: addCalendarTask, tasks: calendarTasks, toggleTask: toggleCalendarTask, deleteTask: deleteCalendarTask } = useCalendarStore();
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

    // ── To-Do Store ────────────────────────────────────────
    const { getTodayTodos, addTodo, completeTodo, uncompleteTodo, deleteTodo } = useTodoStore();
    const todayTodos = getTodayTodos();
    const [showTodoModal, setShowTodoModal] = useState(false);
    const [todoTitle, setTodoTitle] = useState('');
    const [todoNote, setTodoNote] = useState('');
    const [todoTimeOfDay, setTodoTimeOfDay] = useState<TimeOfDay>('anytime');
    const [todoDueDate, setTodoDueDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [todoRecurrence, setTodoRecurrence] = useState<Recurrence>('none');
    const [todoRecurrenceDays, setTodoRecurrenceDays] = useState<number[]>([]);
    const [showTodosSection, setShowTodosSection] = useState(true);

    const handleAddTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!todoTitle.trim()) return;
        addTodo({
            title: todoTitle.trim(),
            note: todoNote.trim() || undefined,
            timeOfDay: todoTimeOfDay,
            dueDate: todoDueDate,
            recurrence: todoRecurrence,
            recurrenceDays: todoRecurrence === 'custom' ? todoRecurrenceDays : undefined,
        });
        setTodoTitle('');
        setTodoNote('');
        setTodoTimeOfDay('anytime');
        setTodoDueDate(dayjs().format('YYYY-MM-DD'));
        setTodoRecurrence('none');
        setTodoRecurrenceDays([]);
        setShowTodoModal(false);
    };

    const toggleRecurrenceDay = (day: number) => {
        setTodoRecurrenceDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

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

    // Filter Luck out
    const skillNames = (Object.keys(skills) as SkillName[]).filter(s => s !== 'Luck');

    // ── Daily Score ──────────────────────────────────────
    const dailyScore = useMemo(() => {
        if (dailyTasks.length === 0) return { pct: 0, grade: 'F', color: '#64748b' };
        const completed = dailyTasks.filter(t => t.completed).length;
        const pct = Math.round((completed / dailyTasks.length) * 100);
        let grade: string;
        let color: string;
        if (pct === 100) { grade = 'S'; color = '#fbbf24'; }
        else if (pct >= 90) { grade = 'A'; color = '#22c55e'; }
        else if (pct >= 75) { grade = 'B'; color = '#3b82f6'; }
        else if (pct >= 50) { grade = 'C'; color = '#f59e0b'; }
        else if (pct >= 25) { grade = 'D'; color = '#f97316'; }
        else { grade = 'F'; color = '#ef4444'; }
        return { pct, grade, color };
    }, [dailyTasks]);

    // ── Active skills with XP progress ───────────────────
    const activeSkillProgress = useMemo(() => {
        const skillSet = new Set<SkillName>();
        dailyTasks.forEach(t => t.rewards.forEach(r => skillSet.add(r.skillId)));
        return Array.from(skillSet).map(skillName => ({
            name: skillName,
            ...getXpProgress(skillName),
            level: skills[skillName]?.level || 1,
        }));
    }, [dailyTasks, skills, getXpProgress]);

    // ── Weekly heatmap (Mon - Sun, 7 days) ───────────────
    const weeklyHeatmap = useMemo(() => {
        const today = dayjs();
        const dayOfWeek = today.day(); // 0=Sun
        const monday = today.subtract(dayOfWeek === 0 ? 6 : dayOfWeek - 1, 'day');
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = monday.add(i, 'day');
            const isToday = date.isSame(today, 'day');
            const isFuture = date.isAfter(today, 'day');
            // Use today's live data for current day
            let pct = 0;
            if (isToday && dailyTasks.length > 0) {
                pct = Math.round((dailyTasks.filter(t => t.completed).length / dailyTasks.length) * 100);
            } else if (!isFuture) {
                // Past days — no historical data in this store, show as unknown
                pct = -1; // -1 = no data
            }
            days.push({
                label: date.format('dd')[0], // M, T, W, T, F, S, S
                date: date.format('MMM D'),
                pct,
                isToday,
                isFuture,
            });
        }
        return days;
    }, [dailyTasks]);

    const getTimeUntilWeeklyReset = () => {
        const now = new Date();
        const day = now.getDay();
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

    // ── Drag handlers (pointer-based for mobile touch) ──
    const handleDragPointerDown = (e: React.PointerEvent, bundle: BundleType, index: number, taskId: string) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDragState({ taskId, bundle, index, startY: e.clientY, isDragging: false });
    };

    const handleDragPointerMove = (e: React.PointerEvent) => {
        if (!dragState) return;
        if (!dragState.isDragging) {
            if (Math.abs(e.clientY - dragState.startY) > DRAG_THRESHOLD) {
                setDragState(prev => prev ? { ...prev, isDragging: true } : null);
            }
            return;
        }
        // Find which task element we're hovering over
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const taskEl = el?.closest('.recurring-task') as HTMLElement | null;
        if (taskEl) {
            const idx = parseInt(taskEl.dataset.dragIndex || '0', 10);
            const bundle = (taskEl.dataset.dragBundle || dragState.bundle) as BundleType;
            dragOverItem.current = { bundle, index: idx };
        }
    };

    const handleDragPointerUp = () => {
        if (dragState?.isDragging && dragOverItem.current) {
            moveDailyTask(dragState.taskId, dragOverItem.current.bundle, dragOverItem.current.index);
        }
        setDragState(null);
        dragOverItem.current = null;
    };

    const renderBundle = (bundleType: BundleType) => {
        const templateIds = new Set(DAILY_TASKS_TEMPLATE.map(t => t.id));
        let bundleTasks = dailyTasks.filter(t => t.bundle === bundleType)
            .filter(t => templateIds.has(t.id) || t.id.startsWith('custom-'));

        // Apply category filter
        if (activeCategoryFilter !== 'all') {
            bundleTasks = bundleTasks.filter(t => t.category === activeCategoryFilter);
        }

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

                    <div className="recurring-tasks-list" onPointerMove={handleDragPointerMove} onPointerUp={handleDragPointerUp}>
                        {bundleTasks.map((task, idx) => {
                            const catConfig = task.category ? CATEGORY_CONFIG[task.category] : null;
                            const isBeingDragged = dragState?.isDragging && dragState.taskId === task.id;
                            return (
                                <div
                                    key={task.id}
                                    className={`recurring-task ${task.completed ? 'completed' : ''} ${isBeingDragged ? 'dragging' : ''}`}
                                    data-drag-index={idx}
                                    data-drag-bundle={bundleType}
                                    onClick={() => {
                                        if (dragState?.isDragging) return; // prevent tap during drag
                                        if (task.completed) {
                                            uncompleteTask(task.id);
                                        } else {
                                            if (task.requiresInput === 'training') {
                                                setShowTrainingInput(true);
                                            } else {
                                                completeTask(task.id);
                                            }
                                        }
                                    }}
                                >
                                    <div className="drag-handle" onPointerDown={(e) => handleDragPointerDown(e, bundleType, idx, task.id)}>
                                        <GripVertical size={16} />
                                    </div>
                                    <div className="recurring-task__check">
                                        {task.completed ? (
                                            <CheckCircle size={24} className="check-done" />
                                        ) : (
                                            <Circle size={24} className="check-todo" />
                                        )}
                                    </div>
                                    <div className="recurring-task__info">
                                        <div className="recurring-task__title-row">
                                            <span className="recurring-task__title">{task.title}</span>
                                            {catConfig && (
                                                <span
                                                    className="category-dot"
                                                    style={{ background: catConfig.color }}
                                                    title={catConfig.label}
                                                />
                                            )}
                                        </div>
                                        {/* Show logged weight inline for Weigh Self when completed */}
                                        {task.requiresInput === 'weight' && task.completed && todayWeight != null && (
                                            <span className="weight-logged-badge">⚖️ {todayWeight} lbs</span>
                                        )}
                                        <div className="recurring-task__meta">
                                            {task.rewards.map((reward, ridx) => (
                                                <span
                                                    key={ridx}
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
                            );
                        })}
                    </div>
                </Card>
            </motion.div>
        );
    };

    const morningStatus = getBundleStatus('morning');
    const middayStatus = getBundleStatus('midday');
    const afternoonStatus = getBundleStatus('afternoon');
    const nightStatus = getBundleStatus('night');
    const isPerfectDay = morningStatus.isComplete && middayStatus.isComplete && afternoonStatus.isComplete && nightStatus.isComplete;

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

                {/* ── Today's To-Dos ── */}
                {todayTodos.length > 0 && (
                    <motion.div
                        className="todo-section"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="todo-section-header" onClick={() => setShowTodosSection(s => !s)}>
                            <span className="todo-section-title"><ClipboardList size={16} /> Today's To-Dos</span>
                            <span className="todo-section-count">{todayTodos.filter(t => t.completed).length}/{todayTodos.length}</span>
                            {showTodosSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                        <AnimatePresence>
                            {showTodosSection && (
                                <motion.div
                                    className="todo-list"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                >
                                    {todayTodos.map(todo => (
                                        <div key={todo.id} className={`todo-item ${todo.completed ? 'todo-item--done' : ''}`}>
                                            <button
                                                className="todo-check-btn"
                                                onClick={() => todo.completed ? uncompleteTodo(todo.id) : completeTodo(todo.id)}
                                            >
                                                {todo.completed ? <CheckCircle size={22} className="check-done" /> : <Circle size={22} className="check-todo" />}
                                            </button>
                                            <div className="todo-item-body">
                                                <span className="todo-item-title">{todo.title}</span>
                                                {todo.note && <span className="todo-item-note">{todo.note}</span>}
                                                <span className="todo-item-meta">
                                                    {TIME_OF_DAY_LABELS[todo.timeOfDay]}
                                                    {todo.recurrence !== 'none' && ` · 🔁 ${todo.recurrence}`}
                                                </span>
                                            </div>
                                            <button className="todo-delete-btn" onClick={() => deleteTodo(todo.id)}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* ── Stats Dashboard ── */}
                <motion.div
                    className="stats-dashboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <button className="stats-toggle" onClick={() => setShowStats(!showStats)}>
                        📊 Today's Stats
                        {showStats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <AnimatePresence>
                        {showStats && (
                            <motion.div
                                className="stats-widget-grid"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                            >
                                {/* Daily Score */}
                                <div className="stat-widget daily-score-widget">
                                    <div className="grade-badge" style={{ borderColor: dailyScore.color, color: dailyScore.color }}>
                                        {dailyScore.grade}
                                    </div>
                                    <div className="stat-widget-body">
                                        <div className="stat-label">Daily Score</div>
                                        <div className="stat-value" style={{ color: dailyScore.color }}>{dailyScore.pct}%</div>
                                        <div className="stat-sub">{dailyTasks.filter(t => t.completed).length}/{dailyTasks.length} tasks</div>
                                    </div>
                                </div>

                                {/* Weekly Heatmap */}
                                <div className="stat-widget heatmap-widget">
                                    <div className="stat-label">This Week</div>
                                    <div className="heatmap-grid">
                                        {weeklyHeatmap.map((day, i) => {
                                            let bg = 'rgba(255,255,255,0.05)';
                                            if (day.isFuture) bg = 'rgba(255,255,255,0.02)';
                                            else if (day.pct === -1) bg = 'rgba(255,255,255,0.06)';
                                            else if (day.pct >= 100) bg = '#22c55e';
                                            else if (day.pct >= 75) bg = 'rgba(34,197,94,0.7)';
                                            else if (day.pct >= 50) bg = 'rgba(34,197,94,0.4)';
                                            else if (day.pct >= 25) bg = 'rgba(34,197,94,0.2)';
                                            else if (day.pct > 0) bg = 'rgba(34,197,94,0.1)';
                                            return (
                                                <div key={i} className={`heatmap-cell ${day.isToday ? 'today' : ''}`} title={`${day.date}: ${day.pct >= 0 ? day.pct + '%' : 'No data'}`}>
                                                    <div className="heatmap-square" style={{ background: bg }} />
                                                    <span className="heatmap-label">{day.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Skill Radar */}
                                <div className="stat-widget radar-widget">
                                    <div className="stat-label">Skill Profile</div>
                                    <RadarChart skills={skills} />
                                </div>

                                {/* XP Progress Bars */}
                                <div className="stat-widget xp-bars-widget">
                                    <div className="stat-label">Active Skills</div>
                                    <div className="xp-bars-list">
                                        {activeSkillProgress.slice(0, 6).map(sp => (
                                            <div key={sp.name} className="xp-bar-row">
                                                <span className="xp-bar-icon">{SKILL_ICONS[sp.name]}</span>
                                                <span className="xp-bar-name">Lv.{sp.level}</span>
                                                <div className="xp-bar-track">
                                                    <div
                                                        className="xp-bar-fill"
                                                        style={{
                                                            width: `${sp.percentage}%`,
                                                            background: SKILL_COLORS[sp.name],
                                                        }}
                                                    />
                                                </div>
                                                <span className="xp-bar-text">{sp.current}/{sp.required}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── Category Filter Bar ── */}
                <div className="category-filter-bar">
                    <button
                        className={`category-pill ${activeCategoryFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveCategoryFilter('all')}
                    >
                        All
                    </button>
                    {(Object.keys(CATEGORY_CONFIG) as TaskCategory[]).map(cat => (
                        <button
                            key={cat}
                            className={`category-pill ${activeCategoryFilter === cat ? 'active' : ''}`}
                            style={{ '--cat-color': CATEGORY_CONFIG[cat].color } as React.CSSProperties}
                            onClick={() => setActiveCategoryFilter(activeCategoryFilter === cat ? 'all' : cat)}
                        >
                            {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
                        </button>
                    ))}
                </div>

                {/* Add Task + To-Do Shortcut Row */}
                <div className="tasks-add-shortcut-row">
                    <button onClick={scrollToAdd} className="add-task-shortcut-btn">
                        <Plus size={16} />
                        Add Task
                    </button>
                    <button onClick={() => setShowTodoModal(true)} className="add-task-shortcut-btn add-task-shortcut-btn--todo">
                        <ClipboardList size={16} />
                        + To-Do
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
                    {renderBundle('midday')}
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

            {/* ── To-Do Creation Modal ── */}
            <AnimatePresence>
                {showTodoModal && (
                    <motion.div
                        className="todo-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowTodoModal(false)}
                    >
                        <motion.div
                            className="todo-modal-card"
                            initial={{ scale: 0.9, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 30, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="todo-modal-header">
                                <span><ClipboardList size={18} /> New To-Do</span>
                                <button className="todo-modal-close" onClick={() => setShowTodoModal(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleAddTodo} className="todo-modal-form">
                                <input
                                    className="todo-modal-input"
                                    type="text"
                                    placeholder="What do you need to do?"
                                    value={todoTitle}
                                    onChange={e => setTodoTitle(e.target.value)}
                                    autoFocus
                                />
                                <textarea
                                    className="todo-modal-input todo-modal-textarea"
                                    placeholder="Note (optional)"
                                    value={todoNote}
                                    onChange={e => setTodoNote(e.target.value)}
                                    rows={2}
                                />

                                <div className="todo-modal-row">
                                    <label className="todo-modal-label">Time of Day</label>
                                    <div className="todo-time-chips">
                                        {(['anytime', 'morning', 'afternoon', 'evening'] as TimeOfDay[]).map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                className={`todo-chip ${todoTimeOfDay === t ? 'todo-chip--active' : ''}`}
                                                onClick={() => setTodoTimeOfDay(t)}
                                            >
                                                {TIME_OF_DAY_LABELS[t]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="todo-modal-row">
                                    <label className="todo-modal-label">Due Date</label>
                                    <input
                                        type="date"
                                        className="todo-modal-input todo-modal-date"
                                        value={todoDueDate}
                                        onChange={e => setTodoDueDate(e.target.value)}
                                    />
                                </div>

                                <div className="todo-modal-row">
                                    <label className="todo-modal-label">Recurrence</label>
                                    <div className="todo-time-chips">
                                        {(['none', 'daily', 'weekly', 'custom'] as Recurrence[]).map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                className={`todo-chip ${todoRecurrence === r ? 'todo-chip--active' : ''}`}
                                                onClick={() => setTodoRecurrence(r)}
                                            >
                                                {r === 'none' ? '🚫 Once' : r === 'daily' ? '🔁 Daily' : r === 'weekly' ? '📅 Weekly' : '🗓 Custom'}
                                            </button>
                                        ))}
                                    </div>
                                    {todoRecurrence === 'custom' && (
                                        <div className="todo-day-chips">
                                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className={`todo-day-chip ${todoRecurrenceDays.includes(i) ? 'todo-day-chip--active' : ''}`}
                                                    onClick={() => toggleRecurrenceDay(i)}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={!todoTitle.trim()}
                                    className="btn btn--primary btn--md todo-modal-submit"
                                >
                                    <Plus size={16} /> Add To-Do
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
