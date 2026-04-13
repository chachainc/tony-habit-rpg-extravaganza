import dayjs from 'dayjs';

export const getTodayIndex = () => dayjs().day();

export const getDayName = (index: number) => {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];
};

export const formatDaysInfo = (activeDays?: number[]) => {
    if (!activeDays || activeDays.length === 7) return 'Every day';
    
    const sortedDays = [...activeDays].sort();
    const names = sortedDays.map(getDayName);

    if (names.length === 1) return `${names[0]}s`;
    if (names.length === 2) return `${names[0]} and ${names[1]}`;

    return names.join(', ');
};
