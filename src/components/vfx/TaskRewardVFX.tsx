import { useState, useEffect, useCallback } from 'react';
import './TaskRewardVFX.css';

// ─── Types ────────────────────────────────────────────
export interface TaskRewardEvent {
    rewards: { skillId: string; xp: number }[];
    originX: number; // viewport px
    originY: number; // viewport px
}

interface FloatingXP {
    id: string;
    text: string;
    color: string;
    x: number;
    y: number;
}

interface CoinParticle {
    id: string;
    startX: number;
    startY: number;
    midX: number;
    midY: number;
    endX: number;
    endY: number;
    delay: number;
    size: number;
}

// ─── Skill colors (mirrors TasksPage) ────────────────
const SKILL_COLORS: Record<string, string> = {
    'Sleep': '#a78bfa', 'Hygiene': '#22d3ee', 'Flexibility': '#f472b6',
    'Strength': '#f87171', 'Cardio': '#fbbf24', 'Work': '#94a3b8',
    'Health': '#fb7185', 'Social': '#f472b6', 'Luck': '#facc15',
    'Habit': '#fb923c', 'Housemaid': '#d6d3d1', 'Intelligence': '#a78bfa',
};

// ─── Helper: trigger from anywhere ───────────────────
export const triggerTaskReward = (event: TaskRewardEvent) => {
    window.dispatchEvent(new CustomEvent('task-reward', { detail: event }));
};

// ─── Component ───────────────────────────────────────
export const TaskRewardVFX = () => {
    const [floatingXPs, setFloatingXPs] = useState<FloatingXP[]>([]);
    const [coins, setCoins] = useState<CoinParticle[]>([]);
    const [pulse, setPulse] = useState(false);

    const handleReward = useCallback((e: Event) => {
        const detail = (e as CustomEvent<TaskRewardEvent>).detail;
        if (!detail?.rewards?.length) return;
        const { rewards, originX, originY } = detail;
        const now = Date.now();

        // 1. Floating XP text — one per unique skill
        const grouped: Record<string, number> = {};
        rewards.forEach(r => {
            if (r.xp > 0) grouped[r.skillId] = (grouped[r.skillId] || 0) + r.xp;
        });

        const newXPs: FloatingXP[] = Object.entries(grouped).map(([skill, xp], i) => ({
            id: `xp_${now}_${skill}`,
            text: `+${xp} ${skill} XP`,
            color: SKILL_COLORS[skill] || '#60a5fa',
            x: originX + (i * 10 - Object.keys(grouped).length * 5),
            y: originY - 10 - i * 28,
        }));
        setFloatingXPs(prev => [...prev, ...newXPs]);

        // Auto-remove after animation
        setTimeout(() => {
            setFloatingXPs(prev => prev.filter(f => !newXPs.some(n => n.id === f.id)));
        }, 900);

        // 2. Coin particles — 6-10 random
        const coinCount = 6 + Math.floor(Math.random() * 5);
        // Target: top bar currency area (approximate top-center)
        const targetX = window.innerWidth * 0.3;
        const targetY = 20;

        const newCoins: CoinParticle[] = Array.from({ length: coinCount }, (_, i) => {
            const angle = (Math.PI * 2 * i) / coinCount + (Math.random() - 0.5) * 0.6;
            const burstDist = 40 + Math.random() * 50;
            const midX = originX + Math.cos(angle) * burstDist;
            const midY = originY + Math.sin(angle) * burstDist - 20;
            return {
                id: `coin_${now}_${i}`,
                startX: originX,
                startY: originY,
                midX,
                midY,
                endX: targetX + (Math.random() - 0.5) * 30,
                endY: targetY,
                delay: i * 0.03,
                size: 14 + Math.random() * 6,
            };
        });
        setCoins(prev => [...prev, ...newCoins]);

        setTimeout(() => {
            setCoins(prev => prev.filter(c => !newCoins.some(n => n.id === c.id)));
        }, 1100);

        // 3. Screen pulse
        setPulse(true);
        setTimeout(() => setPulse(false), 300);

        // 4. Mobile haptic (optional)
        try {
            if (navigator.vibrate) navigator.vibrate(15);
        } catch {}
    }, []);

    useEffect(() => {
        window.addEventListener('task-reward', handleReward);
        return () => window.removeEventListener('task-reward', handleReward);
    }, [handleReward]);

    return (
        <>
            {/* Screen pulse overlay */}
            {pulse && <div className="trv-screen-pulse" />}

            {/* Floating XP text */}
            {floatingXPs.map(xp => (
                <div
                    key={xp.id}
                    className="trv-floating-xp"
                    style={{
                        left: xp.x,
                        top: xp.y,
                        color: xp.color,
                        textShadow: `0 0 8px ${xp.color}`,
                    }}
                >
                    {xp.text}
                </div>
            ))}

            {/* Coin particles */}
            {coins.map(coin => (
                <div
                    key={coin.id}
                    className="trv-coin"
                    style={{
                        '--start-x': `${coin.startX}px`,
                        '--start-y': `${coin.startY}px`,
                        '--mid-x': `${coin.midX}px`,
                        '--mid-y': `${coin.midY}px`,
                        '--end-x': `${coin.endX}px`,
                        '--end-y': `${coin.endY}px`,
                        '--delay': `${coin.delay}s`,
                        '--size': `${coin.size}px`,
                    } as React.CSSProperties}
                >
                    💰
                </div>
            ))}
        </>
    );
};
