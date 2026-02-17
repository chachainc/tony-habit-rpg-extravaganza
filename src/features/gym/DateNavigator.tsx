import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDateLabel, getLocalDateString } from '../../store/useGymStore';

interface Props {
    selectedDate: string;
    onSelectDate: (date: string) => void;
}

export const DateNavigator = ({ selectedDate, onSelectDate }: Props) => {
    // Generate dates: 2 days before, selected, 2 days after
    const dates = useMemo(() => {
        const result = [];
        const base = new Date(selectedDate + 'T12:00:00'); // midday to avoid timezone issues

        for (let i = -2; i <= 2; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            result.push(getLocalDateString(d));
        }
        return result;
    }, [selectedDate]);

    const navigate = (direction: 'prev' | 'next') => {
        const base = new Date(selectedDate + 'T12:00:00');
        base.setDate(base.getDate() + (direction === 'prev' ? -1 : 1));
        onSelectDate(getLocalDateString(base));
    };

    return (
        <div className="date-navigator">
            <button className="date-nav-btn" onClick={() => navigate('prev')}>
                <ChevronLeft size={20} />
            </button>

            <div className="date-strip">
                <AnimatePresence mode="popLayout">
                    {dates.map(date => (
                        <motion.button
                            key={date}
                            layout
                            className={`date-strip__item ${date === selectedDate ? 'active' : ''}`}
                            onClick={() => onSelectDate(date)}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                        >
                            <span className="date-strip__label">{getDateLabel(date)}</span>
                            <span className="date-strip__date">{date.slice(5)}</span>
                        </motion.button>
                    ))}
                </AnimatePresence>
            </div>

            <button className="date-nav-btn" onClick={() => navigate('next')}>
                <ChevronRight size={20} />
            </button>
        </div>
    );
};
