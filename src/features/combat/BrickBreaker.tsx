import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useMiniGameStore } from '../../store/useMiniGameStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import './BrickBreaker.css';

interface Brick {
    x: number; y: number; w: number; h: number;
    alive: boolean; hp: number; color: string;
}

export const BrickBreaker = ({ onClose }: { onClose: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const { canPlayBreaker, recordBreakerPlay, breakerHighScore } = useMiniGameStore();
    const { addGold } = useCurrencyStore();

    const [score, setScore] = useState(0);
    const [, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [canPlay] = useState(canPlayBreaker());

    // Game state refs
    const paddleRef = useRef({ x: 0, w: 70, h: 10 });
    const ballRef = useRef({ x: 0, y: 0, r: 6, vx: 3, vy: -3, launched: false });
    const bricksRef = useRef<Brick[]>([]);
    const livesRef = useRef(3);
    const scoreRef = useRef(0);

    const buildBricks = useCallback((W: number) => {
        const bricks: Brick[] = [];
        const colors = ['#ef4444', '#f97316', '#fbbf24', '#22c55e', '#3b82f6', '#a855f7'];
        const cols = 8;
        const rows = 5;
        const bw = (W - 20) / cols;
        const bh = 16;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                bricks.push({
                    x: 10 + c * bw, y: 40 + r * (bh + 3),
                    w: bw - 3, h: bh,
                    alive: true, hp: r < 2 ? 2 : 1,
                    color: colors[r % colors.length],
                });
            }
        }
        return bricks;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canPlay) return;
        const ctx = canvas.getContext('2d')!;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const W = rect.width;
        const H = rect.height;

        const paddle = paddleRef.current;
        paddle.x = W / 2 - paddle.w / 2;

        const ball = ballRef.current;
        ball.x = W / 2; ball.y = H - 30; ball.vx = 3; ball.vy = -3; ball.launched = false;

        bricksRef.current = buildBricks(W);
        livesRef.current = 3;
        scoreRef.current = 0;

        // Pointer tracking
        const handlePointer = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect();
            paddle.x = Math.max(0, Math.min(W - paddle.w, e.clientX - r.left - paddle.w / 2));
            if (!ball.launched) {
                ball.x = paddle.x + paddle.w / 2;
            }
        };
        const handleClick = () => {
            if (!ball.launched) ball.launched = true;
        };
        canvas.addEventListener('pointermove', handlePointer);
        canvas.addEventListener('click', handleClick);

        const loop = () => {
            ctx.clearRect(0, 0, W, H);

            // Background
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, W, H);

            // Draw bricks
            for (const b of bricksRef.current) {
                if (!b.alive) continue;
                ctx.fillStyle = b.hp > 1 ? b.color : b.color + '99';
                ctx.fillRect(b.x, b.y, b.w, b.h);
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.strokeRect(b.x, b.y, b.w, b.h);
            }

            // Paddle
            ctx.fillStyle = '#a3e635';
            ctx.shadowColor = '#a3e63555';
            ctx.shadowBlur = 8;
            ctx.fillRect(paddle.x, H - 18, paddle.w, paddle.h);
            ctx.shadowBlur = 0;

            // Ball
            if (ball.launched) {
                ball.x += ball.vx;
                ball.y += ball.vy;

                // Wall collisions
                if (ball.x - ball.r <= 0 || ball.x + ball.r >= W) ball.vx = -ball.vx;
                if (ball.y - ball.r <= 0) ball.vy = -ball.vy;

                // Paddle collision
                if (ball.y + ball.r >= H - 18 && ball.y + ball.r <= H - 8 &&
                    ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
                    ball.vy = -Math.abs(ball.vy);
                    const hitPos = (ball.x - paddle.x) / paddle.w;
                    ball.vx = (hitPos - 0.5) * 6;
                }

                // Bottom — lose life
                if (ball.y + ball.r > H) {
                    livesRef.current--;
                    setLives(livesRef.current);
                    if (livesRef.current <= 0) {
                        setGameOver(true);
                        setScore(scoreRef.current);
                        recordBreakerPlay(scoreRef.current);
                        const goldReward = Math.min(5, Math.floor(scoreRef.current / 200));
                        if (goldReward > 0) addGold(goldReward);
                        return;
                    }
                    ball.x = paddle.x + paddle.w / 2;
                    ball.y = H - 30;
                    ball.vx = 3; ball.vy = -3;
                    ball.launched = false;
                }

                // Brick collisions
                for (const b of bricksRef.current) {
                    if (!b.alive) continue;
                    if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
                        ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
                        b.hp--;
                        if (b.hp <= 0) {
                            b.alive = false;
                            scoreRef.current += 10;
                            setScore(scoreRef.current);
                        }
                        ball.vy = -ball.vy;
                        break;
                    }
                }

                // Win check
                if (bricksRef.current.every(b => !b.alive)) {
                    setWon(true);
                    setScore(scoreRef.current);
                    recordBreakerPlay(scoreRef.current);
                    const goldReward = Math.min(5, Math.floor(scoreRef.current / 200) + 2);
                    if (goldReward > 0) addGold(goldReward);
                    return;
                }
            } else {
                ball.x = paddle.x + paddle.w / 2;
                ball.y = H - 30;
            }

            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf2488';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Lives indicator
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '11px sans-serif';
            ctx.fillText(`Lives: ${'❤️'.repeat(livesRef.current)}`, 10, 16);
            ctx.fillText(`Score: ${scoreRef.current}`, W - 75, 16);

            animRef.current = requestAnimationFrame(loop);
        };

        animRef.current = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(animRef.current);
            canvas.removeEventListener('pointermove', handlePointer);
            canvas.removeEventListener('click', handleClick);
        };
    }, [canPlay, buildBricks, addGold, recordBreakerPlay]);

    if (!canPlay) {
        return (
            <motion.div className="breaker-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="breaker-container">
                    <div className="breaker-header">
                        <h2>🧱 Brick Breaker</h2>
                        <button className="breaker-close" onClick={onClose}><X size={20} /></button>
                    </div>
                    <div className="breaker-limit">🚫 Daily limit reached (3/3). Come back tomorrow!</div>
                    <div className="breaker-high-score">🏆 High Score: {breakerHighScore}</div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div className="breaker-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="breaker-container">
                <div className="breaker-header">
                    <h2>🧱 Brick Breaker</h2>
                    <button className="breaker-close" onClick={onClose}><X size={20} /></button>
                </div>

                <canvas ref={canvasRef} className="breaker-canvas" />

                {!ballRef.current.launched && !gameOver && !won && (
                    <div className="breaker-hint">Tap / click to launch ball</div>
                )}

                {(gameOver || won) && (
                    <div className="breaker-result-overlay">
                        <div className={`breaker-result-title ${won ? 'win' : 'lose'}`}>
                            {won ? '🎉 You Win!' : '💀 Game Over'}
                        </div>
                        <div className="breaker-result-score">Score: {score}</div>
                        <div className="breaker-result-actions">
                            <button className="breaker-exit-btn" onClick={onClose}>Exit</button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
