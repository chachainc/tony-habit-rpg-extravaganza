import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';
import { useMiniGameStore } from '../../store/useMiniGameStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import './PhysicsLauncher.css';

interface Body {
    x: number; y: number; w: number; h: number;
    vx: number; vy: number;
    type: 'projectile' | 'block' | 'target';
    alive: boolean;
    hp: number;
    color: string;
}

const GRAVITY = 0.35;
const GROUND_Y = 0.85; // percent of canvas height

export const PhysicsLauncher = ({ onClose }: { onClose: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const { canPlayLauncher, recordLauncherPlay, launcherHighScore } = useMiniGameStore();
    const { addGold } = useCurrencyStore();

    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [shotsLeft, setShotsLeft] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [levelComplete, setLevelComplete] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
    const [canPlay] = useState(canPlayLauncher());
    const bodiesRef = useRef<Body[]>([]);
    const projectileRef = useRef<Body | null>(null);
    const launchPosRef = useRef({ x: 80, y: 0 });

    // Build level
    const buildLevel = useCallback((lvl: number) => {
        const bodies: Body[] = [];
        const targetColors = ['#ef4444', '#f97316', '#fbbf24'];
        const blockColors = ['#64748b', '#78716c', '#a1a1aa'];

        if (lvl === 1) {
            bodies.push({ x: 300, y: 0, w: 20, h: 60, vx: 0, vy: 0, type: 'block', alive: true, hp: 1, color: blockColors[0] });
            bodies.push({ x: 290, y: 0, w: 40, h: 15, vx: 0, vy: 0, type: 'block', alive: true, hp: 1, color: blockColors[1] });
            bodies.push({ x: 300, y: 0, w: 25, h: 25, vx: 0, vy: 0, type: 'target', alive: true, hp: 1, color: targetColors[0] });
        } else if (lvl === 2) {
            bodies.push({ x: 260, y: 0, w: 20, h: 80, vx: 0, vy: 0, type: 'block', alive: true, hp: 1, color: blockColors[0] });
            bodies.push({ x: 320, y: 0, w: 20, h: 80, vx: 0, vy: 0, type: 'block', alive: true, hp: 1, color: blockColors[0] });
            bodies.push({ x: 255, y: 0, w: 90, h: 15, vx: 0, vy: 0, type: 'block', alive: true, hp: 2, color: blockColors[2] });
            bodies.push({ x: 280, y: 0, w: 25, h: 25, vx: 0, vy: 0, type: 'target', alive: true, hp: 1, color: targetColors[1] });
            bodies.push({ x: 310, y: 0, w: 25, h: 25, vx: 0, vy: 0, type: 'target', alive: true, hp: 1, color: targetColors[2] });
        } else {
            bodies.push({ x: 240, y: 0, w: 20, h: 100, vx: 0, vy: 0, type: 'block', alive: true, hp: 2, color: blockColors[0] });
            bodies.push({ x: 300, y: 0, w: 20, h: 100, vx: 0, vy: 0, type: 'block', alive: true, hp: 2, color: blockColors[0] });
            bodies.push({ x: 360, y: 0, w: 20, h: 60, vx: 0, vy: 0, type: 'block', alive: true, hp: 1, color: blockColors[1] });
            bodies.push({ x: 235, y: 0, w: 150, h: 15, vx: 0, vy: 0, type: 'block', alive: true, hp: 2, color: blockColors[2] });
            bodies.push({ x: 260, y: 0, w: 25, h: 25, vx: 0, vy: 0, type: 'target', alive: true, hp: 1, color: targetColors[0] });
            bodies.push({ x: 310, y: 0, w: 25, h: 25, vx: 0, vy: 0, type: 'target', alive: true, hp: 1, color: targetColors[1] });
            bodies.push({ x: 360, y: 0, w: 22, h: 22, vx: 0, vy: 0, type: 'target', alive: true, hp: 1, color: targetColors[2] });
        }

        return bodies;
    }, []);

    // Position bodies on ground
    const stackBodies = useCallback((bodies: Body[], canvasH: number) => {
        const groundY = canvasH * GROUND_Y;
        // Stack from ground up based on x position groups
        bodies.sort((a, b) => {
            if (a.type === 'target' && b.type !== 'target') return 1;
            if (a.type !== 'target' && b.type === 'target') return -1;
            return a.y - b.y;
        });
        let blockBottomY = groundY;
        for (const b of bodies) {
            if (b.type === 'block') {
                b.y = blockBottomY - b.h;
                blockBottomY -= b.h;
            } else if (b.type === 'target') {
                b.y = blockBottomY - b.h;
            }
        }
    }, []);

    // Init
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        const W = rect.width;
        const H = rect.height;
        const groundY = H * GROUND_Y;
        launchPosRef.current = { x: 80, y: groundY - 10 };

        const bodies = buildLevel(level);
        stackBodies(bodies, H);
        bodiesRef.current = bodies;
        projectileRef.current = null;

        const loop = () => {
            ctx.clearRect(0, 0, W, H);

            // Background
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, W, H);

            // Ground
            ctx.fillStyle = '#334155';
            ctx.fillRect(0, groundY, W, H - groundY);
            ctx.strokeStyle = '#22c55e44';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();

            // Slingshot
            const lp = launchPosRef.current;
            ctx.fillStyle = '#78716c';
            ctx.fillRect(lp.x - 3, lp.y - 30, 6, 32);
            ctx.fillRect(lp.x - 12, lp.y - 32, 24, 6);

            // Draw bodies
            for (const b of bodiesRef.current) {
                if (!b.alive) continue;
                ctx.fillStyle = b.color;
                ctx.fillRect(b.x, b.y, b.w, b.h);
                if (b.type === 'target') {
                    ctx.fillStyle = 'white';
                    ctx.font = `${Math.min(b.w, b.h) * 0.6}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText('★', b.x + b.w / 2, b.y + b.h * 0.7);
                }
            }

            // Projectile
            const proj = projectileRef.current;
            if (proj && proj.alive) {
                proj.vy += GRAVITY;
                proj.x += proj.vx;
                proj.y += proj.vy;

                // Ground collision
                if (proj.y + proj.h >= groundY) {
                    proj.y = groundY - proj.h;
                    proj.vy *= -0.3;
                    proj.vx *= 0.7;
                    if (Math.abs(proj.vy) < 1) proj.alive = false;
                }
                // Wall collision
                if (proj.x < 0 || proj.x + proj.w > W) proj.alive = false;

                // Body collisions
                for (const b of bodiesRef.current) {
                    if (!b.alive) continue;
                    if (proj.x + proj.w > b.x && proj.x < b.x + b.w &&
                        proj.y + proj.h > b.y && proj.y < b.y + b.h) {
                        b.hp--;
                        if (b.hp <= 0) {
                            b.alive = false;
                            if (b.type === 'target') {
                                setScore(s => s + 100);
                            } else {
                                setScore(s => s + 25);
                            }
                        }
                        proj.vx *= 0.5;
                        proj.vy *= 0.5;
                    }
                }

                ctx.fillStyle = '#a3e635';
                ctx.beginPath();
                ctx.arc(proj.x + proj.w / 2, proj.y + proj.h / 2, proj.w / 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw drag line
            if (dragging) {
                ctx.strokeStyle = '#a3e63588';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(lp.x, lp.y - 20);
                ctx.lineTo(dragEnd.x, dragEnd.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Check level complete (all targets dead)
            const targetsAlive = bodiesRef.current.filter(b => b.type === 'target' && b.alive).length;
            if (targetsAlive === 0 && !levelComplete) {
                setLevelComplete(true);
            }

            animRef.current = requestAnimationFrame(loop);
        };

        animRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animRef.current);
    }, [level, dragging, dragEnd, levelComplete, buildLevel, stackBodies]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (shotsLeft <= 0 || projectileRef.current?.alive || !canPlay) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setDragging(true);
        setDragEnd({ x, y });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragging) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        setDragEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handlePointerUp = () => {
        if (!dragging) return;
        setDragging(false);

        const lp = launchPosRef.current;
        const dx = lp.x - dragEnd.x;
        const dy = (lp.y - 20) - dragEnd.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 10) return;

        const power = Math.min(dist * 0.18, 16);
        const angle = Math.atan2(dy, dx);

        projectileRef.current = {
            x: lp.x - 7, y: lp.y - 34, w: 14, h: 14,
            vx: Math.cos(angle) * power,
            vy: -Math.abs(Math.sin(angle) * power),
            type: 'projectile', alive: true, hp: 1, color: '#a3e635',
        };
        setShotsLeft(s => s - 1);

        // Check game over after a delay
        setTimeout(() => {
            const targetsAlive = bodiesRef.current.filter(b => b.type === 'target' && b.alive).length;
            if (targetsAlive > 0 && shotsLeft <= 1) {
                setGameOver(true);
            }
        }, 3000);
    };

    const handleNextLevel = () => {
        if (level >= 3) {
            // Game complete
            const goldReward = Math.min(5, Math.floor(score / 100));
            if (goldReward > 0) addGold(goldReward);
            recordLauncherPlay(score);
            onClose();
            return;
        }
        setLevel(l => l + 1);
        setShotsLeft(3);
        setLevelComplete(false);
        projectileRef.current = null;
    };

    const handleRestart = () => {
        setScore(0);
        setLevel(1);
        setShotsLeft(3);
        setGameOver(false);
        setLevelComplete(false);
        projectileRef.current = null;
    };

    if (!canPlay) {
        return (
            <motion.div className="launcher-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="launcher-container">
                    <div className="launcher-header">
                        <h2>🏗️ Physics Launcher</h2>
                        <button className="launcher-close" onClick={onClose}><X size={20} /></button>
                    </div>
                    <div className="launcher-limit">🚫 Daily limit reached (3/3 plays). Come back tomorrow!</div>
                    <div className="launcher-high-score">🏆 High Score: {launcherHighScore}</div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div className="launcher-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="launcher-container">
                <div className="launcher-header">
                    <h2>🏗️ Level {level}/3</h2>
                    <div className="launcher-stats">
                        <span>🎯 {score}</span>
                        <span>🪨 {shotsLeft}</span>
                    </div>
                    <button className="launcher-close" onClick={onClose}><X size={20} /></button>
                </div>

                <canvas
                    ref={canvasRef}
                    className="launcher-canvas"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={() => setDragging(false)}
                />

                <div className="launcher-hint">
                    {dragging ? 'Release to launch!' : 'Drag to aim and launch 🪨'}
                </div>

                {levelComplete && (
                    <div className="launcher-level-complete">
                        <div className="launcher-complete-title">⭐ Level Complete!</div>
                        <button className="launcher-next-btn" onClick={handleNextLevel}>
                            {level >= 3 ? 'Finish & Collect' : 'Next Level →'}
                        </button>
                    </div>
                )}

                {gameOver && (
                    <div className="launcher-game-over">
                        <div className="launcher-over-title">Game Over</div>
                        <div className="launcher-over-score">Score: {score}</div>
                        <button className="launcher-retry-btn" onClick={handleRestart}>
                            <RotateCcw size={14} /> Retry
                        </button>
                        <button className="launcher-exit-btn" onClick={() => { recordLauncherPlay(score); onClose(); }}>
                            Exit
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
