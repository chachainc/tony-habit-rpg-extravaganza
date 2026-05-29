import type { MuscleGroup } from '../store/useGymStore';

export interface TemplateExerciseData {
    exerciseName: string;
    muscleGroup: MuscleGroup;
    sets: number;
    repsTarget: string; // e.g. "8-12"
}

export interface WorkoutTemplate {
    id: string;
    name: string;
    description: string;
    color: string;
    icon: string;
    exercises: TemplateExerciseData[];
}

export const WORKOUT_TEMPLATES: Record<string, WorkoutTemplate> = {
    day1: {
        id: 'day1',
        name: 'Day 1 — Upper',
        description: 'Chest, Back, Shoulders, and Arms',
        color: '#ef4444', // Red
        icon: '💪',
        exercises: [
            { exerciseName: 'Incline Dumbbell Press', muscleGroup: 'chest', sets: 4, repsTarget: '8-12' },
            { exerciseName: 'Seated Chest Press Machine', muscleGroup: 'chest', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Lat Pulldown', muscleGroup: 'back', sets: 4, repsTarget: '8-12' },
            { exerciseName: 'Chest Supported Row', muscleGroup: 'back', sets: 3, repsTarget: '8-12' },
            { exerciseName: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', sets: 3, repsTarget: '8-12' },
            { exerciseName: 'Lateral Raises', muscleGroup: 'shoulders', sets: 3, repsTarget: '12-15' },
            { exerciseName: 'Cable Tricep Pushdown', muscleGroup: 'arms', sets: 3, repsTarget: '10-15' },
            { exerciseName: 'Dumbbell Hammer Curl', muscleGroup: 'arms', sets: 3, repsTarget: '10-12' },
        ],
    },
    day2: {
        id: 'day2',
        name: 'Day 2 — Lower',
        description: 'Glutes, Quads, Hamstrings, and Calves (No Squats/Deadlifts)',
        color: '#3b82f6', // Blue
        icon: '🦵',
        exercises: [
            { exerciseName: 'Smith Machine Hip Thrust', muscleGroup: 'legs', sets: 4, repsTarget: '8-12' },
            { exerciseName: 'Leg Press', muscleGroup: 'legs', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Bulgarian Split Squat', muscleGroup: 'legs', sets: 3, repsTarget: '8-12' },
            { exerciseName: 'Leg Curl', muscleGroup: 'legs', sets: 3, repsTarget: '10-15' },
            { exerciseName: 'Leg Extension', muscleGroup: 'legs', sets: 3, repsTarget: '10-15' },
            { exerciseName: 'Standing Calf Raise', muscleGroup: 'legs', sets: 4, repsTarget: '12-20' },
            { exerciseName: 'Seated Calf Raise', muscleGroup: 'legs', sets: 3, repsTarget: '12-15' },
        ],
    },
    day3: {
        id: 'day3',
        name: 'Day 3 — Rest / Cardio',
        description: 'Recovery & Active Cardio Day',
        color: '#10b981', // Emerald
        icon: '🚶‍♀️',
        exercises: [
            { exerciseName: 'Walking', muscleGroup: 'full_body', sets: 1, repsTarget: '20-30 min' },
            { exerciseName: 'Incline treadmill', muscleGroup: 'full_body', sets: 1, repsTarget: '20-30 min' },
            { exerciseName: 'Elliptical', muscleGroup: 'full_body', sets: 1, repsTarget: '20-30 min' },
            { exerciseName: 'Insanity workout', muscleGroup: 'full_body', sets: 1, repsTarget: '30-45 min' },
            { exerciseName: 'Mobility/stretching', muscleGroup: 'full_body', sets: 1, repsTarget: '10-15 min' },
        ],
    },
    day4: {
        id: 'day4',
        name: 'Day 4 — Push',
        description: 'Chest, Shoulders, and Triceps',
        color: '#f59e0b', // Amber
        icon: '🔴',
        exercises: [
            { exerciseName: 'Incline Dumbbell Press', muscleGroup: 'chest', sets: 4, repsTarget: '8-12' },
            { exerciseName: 'Seated Chest Press', muscleGroup: 'chest', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', sets: 3, repsTarget: '8-12' },
            { exerciseName: 'Cable Fly', muscleGroup: 'chest', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Lateral Raises', muscleGroup: 'shoulders', sets: 3, repsTarget: '12-15' },
            { exerciseName: 'Overhead Tricep Extension', muscleGroup: 'arms', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Tricep Pushdown', muscleGroup: 'arms', sets: 3, repsTarget: '10-15' },
        ],
    },
    day5: {
        id: 'day5',
        name: 'Day 5 — Pull',
        description: 'Back, Biceps, and Rear Delts/Traps',
        color: '#8b5cf6', // Violet
        icon: '🔵',
        exercises: [
            { exerciseName: 'Lat Pulldown', muscleGroup: 'back', sets: 4, repsTarget: '8-12' },
            { exerciseName: 'Chest Supported Row', muscleGroup: 'back', sets: 3, repsTarget: '8-12' },
            { exerciseName: 'Seated Cable Row', muscleGroup: 'back', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Rear Delt Fly', muscleGroup: 'shoulders', sets: 3, repsTarget: '12-15' },
            { exerciseName: 'Dumbbell Curl', muscleGroup: 'arms', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Hammer Curl', muscleGroup: 'arms', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Shrugs', muscleGroup: 'back', sets: 3, repsTarget: '12-15' },
        ],
    },
    day6: {
        id: 'day6',
        name: 'Day 6 — Legs + Conditioning',
        description: 'Legs with active conditioning finish',
        color: '#ec4899', // Pink
        icon: '🔥',
        exercises: [
            { exerciseName: 'Smith Machine Hip Thrust', muscleGroup: 'legs', sets: 4, repsTarget: '8-12' },
            { exerciseName: 'Leg Press', muscleGroup: 'legs', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Walking Lunges', muscleGroup: 'legs', sets: 3, repsTarget: '10-12 per leg' },
            { exerciseName: 'Leg Curl', muscleGroup: 'legs', sets: 3, repsTarget: '10-15' },
            { exerciseName: 'Leg Extension', muscleGroup: 'legs', sets: 3, repsTarget: '10-15' },
            { exerciseName: 'Calf Raises', muscleGroup: 'legs', sets: 4, repsTarget: '12-20' },
            { exerciseName: 'Cardio Finish: Incline Walk / Bike / HIIT', muscleGroup: 'full_body', sets: 1, repsTarget: '15-20 min' },
        ],
    },
    day7: {
        id: 'day7',
        name: 'Day 7 — Rest',
        description: 'Recovery & Mobility focus',
        color: '#6b7280', // Gray
        icon: '🧘',
        exercises: [
            { exerciseName: 'Recovery day', muscleGroup: 'full_body', sets: 1, repsTarget: 'Complete' },
            { exerciseName: 'Stretching', muscleGroup: 'full_body', sets: 1, repsTarget: '10-15 min' },
            { exerciseName: 'Walking', muscleGroup: 'full_body', sets: 1, repsTarget: '20-30 min' },
            { exerciseName: 'Mobility', muscleGroup: 'full_body', sets: 1, repsTarget: '10-15 min' },
            { exerciseName: 'Foam rolling', muscleGroup: 'full_body', sets: 1, repsTarget: '5-10 min' },
        ],
    },
};
