import { useState } from 'react';
import { X, Calendar as CalendarIcon, Gift, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCalendarStore } from '../../store/useCalendarStore';
import { Button } from '../../components/ui/Button';
import './CalendarModal.css';

interface Props {
    onClose: () => void;
}

export const CalendarModal = ({ onClose }: Props) => {
    const { checkIns, checkIn, canCheckIn, getMonthProgress, canClaimMonthReward, claimMonthReward } = useCalendarStore();

    // Current month/year
    const now = new Date();
    const [viewYear] = useState(now.getFullYear());
    const [viewMonth] = useState(now.getMonth() + 1); // 1-12

    const progress = getMonthProgress(viewYear, viewMonth);
    const canClaim = canClaimMonthReward(viewYear, viewMonth);
    const canCheckToday = canCheckIn();

    const handleCheckIn = () => {
        const success = checkIn();
        if (success) {
            // Success feedback could go here
        }
    };

    const handleClaimReward = () => {
        const success = claimMonthReward(viewYear, viewMonth);
        if (success) {
            // Success feedback
        }
    };

    // Generate calendar days
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const firstDayOfMonth = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 = Sunday
    const days: Array<{ day: number; checked: boolean; isToday: boolean }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        // Fix string comparison for today to be robust
        const nY = now.getFullYear();
        const nM = now.getMonth() + 1;
        const nD = now.getDate();
        const todayKey = `${nY}-${String(nM).padStart(2, '0')}-${String(nD).padStart(2, '0')}`;
        const isToday = dateKey === todayKey;

        days.push({
            day,
            checked: checkIns && checkIns[dateKey] ? true : false, // Safety check
            isToday,
        });
    }

    const monthName = new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long' });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                className="modal-content calendar-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                <div className="modal-header">
                    <div className="header-title">
                        <CalendarIcon size={24} />
                        <h2>Daily Calendar</h2>
                    </div>
                    <button onClick={onClose} className="close-btn">
                        <X />
                    </button>
                </div>

                <div className="calendar-body">
                    {/* Month Display */}
                    <div className="month-display">
                        <h3>{monthName} {viewYear}</h3>
                    </div>

                    {/* Progress Bar */}
                    <div className="progress-section">
                        <div className="progress-info">
                            <span className="progress-label">Monthly Progress</span>
                            <span className="progress-count">{progress.checkedDays} / 28 days</span>
                        </div>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${(progress.checkedDays / 28) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Check-in Button */}
                    {canCheckToday && (
                        <div className="checkin-section">
                            <Button onClick={handleCheckIn} variant="success">
                                <Check size={18} />
                                Check In Today
                            </Button>
                        </div>
                    )}

                    {/* Calendar Grid */}
                    <div className="calendar-grid">
                        {/* Weekday Headers */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="calendar-weekday">
                                {day}
                            </div>
                        ))}

                        {/* Empty cells for first week offset */}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`empty-${i}`} className="calendar-day calendar-day--empty" />
                        ))}

                        {/* Days */}
                        {days.map(({ day, checked, isToday }) => (
                            <div
                                key={day}
                                className={`calendar-day ${checked ? 'calendar-day--checked' : ''} ${isToday ? 'calendar-day--today' : ''}`}
                            >
                                <span className="day-number">{day}</span>
                                {checked && <Check size={16} className="check-icon" />}
                            </div>
                        ))}
                    </div>

                    {/* Reward Section */}
                    <div className="reward-section">
                        <div className="reward-info">
                            <Gift size={24} className="gift-icon" />
                            <div className="reward-text">
                                <h4>Monthly Reward</h4>
                                <p>Check in 28 days to earn <strong>5 Diamonds</strong> + <strong>500 Gold</strong></p>
                            </div>
                        </div>

                        {canClaim && (
                            <Button onClick={handleClaimReward} variant="primary">
                                <Gift size={18} />
                                Claim Reward
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
