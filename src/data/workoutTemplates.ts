import type { MuscleGroup } from '../store/useGymStore';

export interface TemplateExerciseData {
    exerciseName: string;
    muscleGroup: MuscleGroup;
    sets: number;
    repsTarget: string; // e.g. "8-12"
}

export interface WorkoutTemplate {
    id: 'day1' | 'day2' | 'day3';
    name: string;
    description: string;
    color: string;
    icon: string;
    exercises: TemplateExerciseData[];
}

export const WORKOUT_TEMPLATES: Record<string, WorkoutTemplate> = {
    day1: {
        id: 'day1',
        name: 'Day 1: Push Focus',
        description: 'Chest, Shoulders, and Triceps',
        color: '#ef4444', // Red
        icon: '🟥',
        exercises: [
            { exerciseName: 'Incline Dumbbell Press', muscleGroup: 'chest', sets: 4, repsTarget: '8-12' },
            { exerciseName: 'Seated Chest Press Machine', muscleGroup: 'chest', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', sets: 3, repsTarget: '8-12' },
            { exerciseName: 'Lateral Raises', muscleGroup: 'shoulders', sets: 3, repsTarget: '12-15' },
            { exerciseName: 'Tricep Pushdowns', muscleGroup: 'arms', sets: 3, repsTarget: '10-15' },
            { exerciseName: 'Overhead Tricep Extension (Dumbbell)', muscleGroup: 'arms', sets: 3, repsTarget: '10-12' },
        ],
    },
    day2: {
        id: 'day2',
        name: 'Day 2: Pull Focus',
        description: 'Back and Biceps',
        color: '#3b82f6', // Blue
        icon: '🟦',
        exercises: [
            { exerciseName: 'Lat Pulldown', muscleGroup: 'back', sets: 4, repsTarget: '8-12' },
            { exerciseName: 'Seated Cable Row', muscleGroup: 'back', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Chest Supported Dumbbell Row', muscleGroup: 'back', sets: 3, repsTarget: '8-12' },
            { exerciseName: 'Face Pulls', muscleGroup: 'shoulders', sets: 3, repsTarget: '12-15' },
            { exerciseName: 'Dumbbell Curls', muscleGroup: 'arms', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Hammer Curls', muscleGroup: 'arms', sets: 3, repsTarget: '10-12' },
        ],
    },
    day3: {
        id: 'day3',
        name: 'Day 3: Lower + Core',
        description: 'Legs and Core (No Squat/Deadlift)',
        color: '#22c55e', // Green
        icon: '🟩',
        exercises: [
            { exerciseName: 'Smith Machine Hip Thrust', muscleGroup: 'legs', sets: 4, repsTarget: '8-12' },
            { exerciseName: 'Leg Press', muscleGroup: 'legs', sets: 3, repsTarget: '10-12' },
            { exerciseName: 'Leg Curl Machine', muscleGroup: 'legs', sets: 3, repsTarget: '10-15' },
            { exerciseName: 'Leg Extension', muscleGroup: 'legs', sets: 3, repsTarget: '10-15' },
            { exerciseName: 'Standing Calf Raises', muscleGroup: 'legs', sets: 4, repsTarget: '12-20' },
            { exerciseName: 'Cable Crunches', muscleGroup: 'full_body', sets: 3, repsTarget: '12-15' },
            { exerciseName: 'Plank', muscleGroup: 'full_body', sets: 3, repsTarget: 'time-based' },
        ],
    },
};
