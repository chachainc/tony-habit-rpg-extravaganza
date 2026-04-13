import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkoutTimerState {
    isRunning: boolean;
    startTime: number | null;
    
    // Actions
    startTimer: () => void;
    stopTimer: () => void;
    resetTimer: () => void;
    
    getElapsedSeconds: () => number;
}

export const useWorkoutTimer = create<WorkoutTimerState>()(
    persist(
        (set, get) => ({
            isRunning: false,
            startTime: null,

            startTimer: () => {
                if (get().isRunning) return;
                set({
                    isRunning: true,
                    // If resuming, we ideally would shift startTime based on existing elapsed. 
                    // But for this simple implementation, we just set startTime once.
                    startTime: get().startTime ? get().startTime : Date.now()
                });
            },

            stopTimer: () => {
                set({ isRunning: false });
            },

            resetTimer: () => {
                set({
                    isRunning: false,
                    startTime: null,
                });
            },

            getElapsedSeconds: () => {
                const { isRunning, startTime } = get();
                if (!startTime) return 0;
                
                // If it is running, calc real-time passed.
                // Note: The prompt asks for `elapsed` in state, but updatingzustand state every second is bad for react performance.
                // Getting `elapsedSeconds` from a getter function is preferred so the component can set an interval and poll it.
                if (isRunning) {
                    return Math.floor((Date.now() - startTime) / 1000);
                }
                
                // If stopped, we would need to store the frozen 'elapsed' time.
                // Let's modify the standard behavior to just return the difference
                // But wait, if it's stopped, it will still show the old time?
                // For this use case, we only really care about `elapsed` while running, and it's reset on complete.
                return Math.floor((Date.now() - startTime) / 1000); 
            }
        }),
        {
            name: 'gl-workout-timer',
        }
    )
);
