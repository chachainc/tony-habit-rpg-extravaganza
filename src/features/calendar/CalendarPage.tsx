import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { Button, Modal } from '../../components/ui';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useTodoStore, TIME_OF_DAY_LABELS } from '../../store/useTodoStore';
import './CalendarPage.css';

export const CalendarPage = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Render Fallback for safety
    if (!dayjs) {
        return <div style={{ padding: 20, color: 'white' }}>Error: Dayjs not loaded</div>;
    }

    // Store
    const {
        checkIns,
        // tasks,
        toggleCheckIn,
        toggleTask,
        // deleteTask, 
        // streak, 
        hasCheckedIn,
        getTasksForDate
    } = useCalendarStore();

    const { getTodosForDate, completeTodo, uncompleteTodo } = useTodoStore();

    // Fallback if store is undefined (though improbable with Zustand)
    if (!checkIns) {
        return (
            <div className="calendar-page">
                <div className="calendar-header">
                    <h1>📅 Calendar (Loading...)</h1>
                </div>
            </div>
        );
    }

    // Streak and Daily Bonus Logic handled in store or globally.
    // Here we just display.

    // Calendar Generation
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    const calendarDays = [];
    let day = startDate;

    while (day.isBefore(endDate)) {
        calendarDays.push(day);
        day = day.add(1, 'day');
    }

    const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
    const handleNextMonth = () => setCurrentDate(currentDate.add(1, 'month'));
    const handleToday = () => setCurrentDate(dayjs());

    const isToday = (d: dayjs.Dayjs) => d.isSame(dayjs(), 'day');

    const handleCheckInClick = () => {
        if (!selectedDate) return;

        const isTodaySelected = selectedDate === dayjs().format('YYYY-MM-DD');
        if (isTodaySelected && !hasCheckedIn(selectedDate)) {
            navigate('/checkin');
        } else {
            // For past/future dates or toggling off (if allowed), use store directly
            // Or if already checked in, maybe show details?
            // For now, toggle is fine for admin/correction purposes, or just disable if strictly "Daily"
            toggleCheckIn(selectedDate);
        }
    };

    return (
        <div className="calendar-page">
            <div className="calendar-header">
                <h1>📅 Calendar</h1>
                <div className="calendar-controls">
                    <Button variant="ghost" onClick={handlePrevMonth}><ChevronLeft /></Button>
                    <h2>{currentDate.format('MMMM YYYY')}</h2>
                    <Button variant="ghost" onClick={handleNextMonth}><ChevronRight /></Button>
                    <Button variant="secondary" onClick={handleToday} className="today-btn">Today</Button>
                </div>
            </div>

            <div className="calendar-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="calendar-day-header">{d}</div>
                ))}

                {calendarDays.map((d) => {
                    const dateStr = d.format('YYYY-MM-DD');
                    const isCheckedIn = hasCheckedIn(dateStr);
                    const dayTasks = getTasksForDate(dateStr);
                    const isCurrentMonth = d.month() === currentDate.month();

                    return (
                        <div
                            key={dateStr}
                            className={`calendar-day 
                                ${!isCurrentMonth ? 'other-month' : ''} 
                                ${isToday(d) ? 'today' : ''}
                                ${isCheckedIn ? 'checked-in' : ''}
                            `}
                            onClick={() => setSelectedDate(dateStr)}
                        >
                            <span className="day-number">{d.date()}</span>

                            {isCheckedIn && <Flame size={16} className="check-in-icon" />}

                            {dayTasks.length > 0 && (
                                <div className="day-tasks-indicator">
                                    <span className="task-count">{dayTasks.filter(t => t.completed).length}/{dayTasks.length}</span>
                                </div>
                            )}

                            {/* Todo dots */}
                            {(() => {
                                const todos = getTodosForDate(dateStr);
                                if (todos.length === 0) return null;
                                return (
                                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                        {todos.map(t => (
                                            <span key={t.id} style={{
                                                width: 6, height: 6, borderRadius: '50%',
                                                background: t.completed ? '#22d3ee88' : '#06b6d4',
                                                display: 'inline-block', flexShrink: 0,
                                            }} />
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>

            {/* Daily Details Modal */}
            <Modal
                isOpen={!!selectedDate}
                onClose={() => setSelectedDate(null)}
                title={`Tasks for ${dayjs(selectedDate).format('MMMM D, YYYY')}`}
            >
                {selectedDate && (
                    <div className="day-details">
                        <div className="day-actions">
                            <Button
                                variant={hasCheckedIn(selectedDate) ? "secondary" : "primary"}
                                onClick={handleCheckInClick}
                                className="check-in-btn"
                            >
                                {hasCheckedIn(selectedDate) ? "Checked In! 🔥" : "Check In for Today"}
                            </Button>
                        </div>

                        <h3>Tasks</h3>
                        <div className="day-tasks-list">
                            {getTasksForDate(selectedDate).length === 0 ? (
                                <p className="no-tasks">No tasks for this day.</p>
                            ) : (
                                getTasksForDate(selectedDate).map(task => (
                                    <div key={task.id} className="day-task-item">
                                        <input
                                            type="checkbox"
                                            checked={task.completed}
                                            onChange={() => toggleTask(selectedDate, task.id)}
                                        />
                                        <span className={task.completed ? 'completed' : ''}>{task.text}</span>
                                        {task.skillId && <span className="task-xp-badge">+{task.difficulty === 'hard' ? 50 : 25} XP {task.skillId}</span>}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* To-Dos for this day */}
                        {(() => {
                            const todos = getTodosForDate(selectedDate);
                            if (todos.length === 0) return null;
                            return (
                                <>
                                    <h3 style={{ color: '#22d3ee', marginTop: '1rem' }}>📋 To-Dos</h3>
                                    <div className="day-tasks-list">
                                        {todos.map(todo => (
                                            <div key={todo.id} className="day-task-item">
                                                <input
                                                    type="checkbox"
                                                    checked={todo.completed}
                                                    onChange={() => todo.completed ? uncompleteTodo(todo.id) : completeTodo(todo.id)}
                                                />
                                                <span className={todo.completed ? 'completed' : ''}>
                                                    {todo.title}
                                                    {todo.note && <span style={{ color: '#64748b', marginLeft: 6, fontSize: '0.8em' }}> — {todo.note}</span>}
                                                </span>
                                                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#64748b' }}>{TIME_OF_DAY_LABELS[todo.timeOfDay]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
            </Modal>
        </div>
    );
};
