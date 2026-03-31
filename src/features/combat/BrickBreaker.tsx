import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { useMiniGameStore } from '../../store/useMiniGameStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import './BrickBreaker.css';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
interface Brick {
    x: number; y: number; w: number; h: number;
    alive: boolean; hp: number; maxHp: number; color: string;
    flashTimer: number;
}

interface Ball {
    x: number; y: number; r: number;
    vx: number; vy: number;
    launched: boolean;
    trailX: number; trailY: number;
}

interface Particle {
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; r: number; color: string;
}

interface DroppingPowerUp {
    id: string; // PowerUpType id
    x: number; y: number; w: number; h: number;
    vy: number; alive: boolean;
}

interface ActiveEffect {
    id: string;      // PowerUpType id
    expiresAt: number; // performance.now() timestamp
}

interface BossBrick {
    x: number; y: number; w: number; h: number;
    hp: number; maxHp: number;
    flashTimer: number;
    pulseTimer: number; // 0..360 for idle glow oscillation
    name: string;
    color: string;
    crackLevel: number; // 0=fine, 1=cracked, 2=broken
}

// ═══════════════════════════════════════════════════════════════
// CONFIG: POWER-UPS
// ═══════════════════════════════════════════════════════════════
type PowerUpEffectType = 'multi_ball' | 'wide_paddle' | 'slow_ball';

interface PowerUpType {
    id: PowerUpEffectType;
    name: string;
    color: string;
    glowColor: string;
    icon: string;   // emoji/text drawn on the capsule
    duration: number | null; // ms, null = until balls lost
}

const POWER_UP_TYPES: Record<PowerUpEffectType, PowerUpType> = {
    multi_ball: {
        id: 'multi_ball', name: 'MULTI BALL',
        color: '#f97316', glowColor: '#fb923c',
        icon: '✕', duration: null,
    },
    wide_paddle: {
        id: 'wide_paddle', name: 'WIDE PADDLE',
        color: '#22d3ee', glowColor: '#67e8f9',
        icon: '⟺', duration: 10000,
    },
    slow_ball: {
        id: 'slow_ball', name: 'SLOW BALL',
        color: '#a78bfa', glowColor: '#c4b5fd',
        icon: '◈', duration: 8000,
    },
};

const POWER_UP_ORDER: PowerUpEffectType[] = ['multi_ball', 'wide_paddle', 'slow_ball'];
const DROP_CHANCE = 0.12; // 12%

// ═══════════════════════════════════════════════════════════════
// CONFIG: BOSSES
// ═══════════════════════════════════════════════════════════════
interface BossConfig {
    id: string;
    name: string;
    maxHp: number;
    color: string;
    glowColor: string;
    crackColors: string[]; // color at each crack stage [fine, cracked, broken]
}

const BOSS_CONFIGS: BossConfig[] = [
    { id: 'war_cow_totem',    name: 'War Cow Totem',        maxHp: 20, color: '#dc2626', glowColor: '#ef4444', crackColors: ['#dc2626', '#b45309', '#78350f'] },
    { id: 'golden_hoof',      name: 'Golden Hoof Guardian', maxHp: 28, color: '#d97706', glowColor: '#fbbf24', crackColors: ['#d97706', '#92400e', '#451a03'] },
    { id: 'arcane_stone_beast', name: 'Arcane Stone Beast', maxHp: 36, color: '#7c3aed', glowColor: '#a78bfa', crackColors: ['#7c3aed', '#4c1d95', '#1e1b4b'] },
];

function getBossConfig(level: number): BossConfig {
    const idx = Math.floor((level / 5 - 1)) % BOSS_CONFIGS.length;
    return BOSS_CONFIGS[idx];
}

function isBossLevel(level: number): boolean {
    return level >= 5 && level % 5 === 0;
}

// ═══════════════════════════════════════════════════════════════
// CONFIG: LEVEL PALETTES & LAYOUT
// ═══════════════════════════════════════════════════════════════
const LEVEL_PALETTES: string[][] = [
    ['#ef4444', '#f97316', '#fbbf24', '#22c55e', '#3b82f6'],
    ['#a78bfa', '#818cf8', '#38bdf8', '#34d399', '#f472b6'],
    ['#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309'],
    ['#64748b', '#475569', '#334155', '#ef4444', '#22c55e'],
    ['#e879f9', '#c084fc', '#a78bfa', '#818cf8', '#60a5fa', '#34d399'],
];

function buildBricks(W: number, level: number): Brick[] {
    const bricks: Brick[] = [];
    const cols = 8;
    const bw = (W - 20) / cols;
    const bh = 16; const gap = 3;
    const palette = LEVEL_PALETTES[Math.min(level - 1, LEVEL_PALETTES.length - 1)];

    const mk = (r: number, c: number, hp = 1): Brick => ({
        x: 10 + c * bw, y: 44 + r * (bh + gap),
        w: bw - gap, h: bh,
        alive: true, hp, maxHp: hp,
        color: palette[r % palette.length],
        flashTimer: 0,
    });

    if (level === 1) {
        for (let r = 0; r < 5; r++) for (let c = 0; c < cols; c++) bricks.push(mk(r, c, r === 0 ? 2 : 1));
    } else if (level === 2) {
        for (let r = 0; r < 5; r++) for (let c = 0; c < cols; c++) if ((r + c) % 2 === 0) bricks.push(mk(r, c, 1));
    } else if (level === 3) {
        for (let r = 0; r < 5; r++) { const s = r; const e = cols - r; for (let c = s; c < e; c++) bricks.push(mk(r, c, r === 0 ? 2 : 1)); }
    } else if (level === 4) {
        for (let r = 0; r < 5; r++) for (let c = 0; c < cols; c++) bricks.push(mk(r, c, (c <= 1 || c >= cols - 2) ? 3 : 1));
    } else {
        const seed = level * 137;
        const pseudo = (n: number) => ((seed * n * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < cols; c++) {
                const rand = pseudo(r * cols + c);
                if (rand < 0.20) continue;
                bricks.push(mk(r, c, rand > 0.85 ? 3 : rand > 0.65 ? 2 : 1));
            }
        }
        for (let r = 0; r < 6; r++) {
            const rowBricks = bricks.filter(b => Math.round((b.y - 44) / (bh + gap)) === r);
            if (rowBricks.length < 3) {
                const c = Math.floor(cols / 2);
                if (!rowBricks.find(b => b.x === 10 + c * bw)) bricks.push(mk(r, c, 2));
            }
        }
    }
    return bricks;
}

function buildBossEntity(W: number, level: number): BossBrick {
    const cfg = getBossConfig(level);
    const bossW = W * 0.7;
    const bossH = 44;
    return {
        x: (W - bossW) / 2, y: 50,
        w: bossW, h: bossH,
        hp: cfg.maxHp, maxHp: cfg.maxHp,
        flashTimer: 0, pulseTimer: 0,
        name: cfg.name,
        color: cfg.color,
        crackLevel: 0,
    };
}

// ═══════════════════════════════════════════════════════════════
// SPEED HELPERS
// ═══════════════════════════════════════════════════════════════
const BASE_SPEED = 3;
const SPEED_SCALE = 0.35;
const MAX_SPEED = 6.5;
const SLOW_FACTOR = 0.55; // slow_ball reduces to 55% of normal

function levelSpeed(level: number, slowActive: boolean): number {
    const base = Math.min(BASE_SPEED + (level - 1) * SPEED_SCALE, MAX_SPEED);
    return slowActive ? base * SLOW_FACTOR : base;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
export const BrickBreaker = ({ onClose }: { onClose: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<number>(0);
    const { canPlayBreaker, recordBreakerPlay, breakerHighScore, highestBreakerLevel, unlockNextLevel } = useMiniGameStore();
    const { addGold } = useCurrencyStore();

    const [score, setScore] = useState(0);
    const [, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [, setActiveEffectLabels] = useState<string[]>([]);
    const [gameStarted, setGameStarted] = useState(false);
    const [canPlay] = useState(canPlayBreaker());
    const [selectedLevel, setSelectedLevel] = useState(1);

    const activeLevelRef = useRef(1);

    // Core refs
    const paddleRef = useRef({ x: 0, w: 70, baseW: 70, h: 10, stretch: 0 });
    const ballsRef = useRef<Ball[]>([]);  // All active balls (primary + multi)
    const bricksRef = useRef<Brick[]>([]);
    const bossRef = useRef<BossBrick | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const droppingPowerUpsRef = useRef<DroppingPowerUp[]>([]);
    const activeEffectsRef = useRef<ActiveEffect[]>([]);
    const livesRef = useRef(3);
    const scoreRef = useRef(0);
    const shakeRef = useRef(0);
    const pickupLabelRef = useRef<{ text: string; alpha: number; y: number } | null>(null);

    const changeLevel = (delta: number) => {
        setSelectedLevel(prev => Math.max(1, Math.min(highestBreakerLevel, prev + delta)));
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const hasEffect = (id: string) => activeEffectsRef.current.some(e => e.id === id);

    const addEffect = (id: PowerUpEffectType, duration: number | null) => {
        // Remove existing same effect (prevent stacking bugs)
        activeEffectsRef.current = activeEffectsRef.current.filter(e => e.id !== id);
        if (duration !== null) {
            activeEffectsRef.current.push({ id, expiresAt: performance.now() + duration });
        }
        setActiveEffectLabels(activeEffectsRef.current.map(e => e.id));
    };

    const tickEffects = (now: number) => {
        const before = activeEffectsRef.current.length;
        activeEffectsRef.current = activeEffectsRef.current.filter(e => e.expiresAt > now);
        if (activeEffectsRef.current.length !== before) {
            setActiveEffectLabels(activeEffectsRef.current.map(e => e.id));
        }
        // Revert paddle width if wide_paddle expired
        if (!hasEffect('wide_paddle')) {
            paddleRef.current.w = paddleRef.current.baseW;
        }
    };

    const clearEffects = () => {
        activeEffectsRef.current = [];
        droppingPowerUpsRef.current = [];
        setActiveEffectLabels([]);
        paddleRef.current.w = paddleRef.current.baseW;
    };

    const spawnParticles = useCallback((x: number, y: number, color: string, count = 6) => {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 1.5 + Math.random() * 2.5;
            particlesRef.current.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 30 + Math.random() * 20, maxLife: 50, r: 2 + Math.random() * 2, color });
        }
        if (particlesRef.current.length > 120) particlesRef.current = particlesRef.current.slice(-120);
    }, []);

    const triggerShake = useCallback(() => { shakeRef.current = 12; }, []);

    const tryDropPowerUp = useCallback((x: number, y: number) => {
        if (Math.random() > DROP_CHANCE) return;
        const puType = POWER_UP_TYPES[POWER_UP_ORDER[Math.floor(Math.random() * POWER_UP_ORDER.length)]];
        droppingPowerUpsRef.current.push({ id: puType.id, x, y, w: 36, h: 16, vy: 1.8, alive: true });
    }, []);

    const applyPowerUp = useCallback((id: string, W: number, level: number) => {
        const puType = POWER_UP_TYPES[id as PowerUpEffectType];
        if (!puType) return;

        pickupLabelRef.current = { text: puType.name, alpha: 1, y: 200 };

        if (id === 'multi_ball') {
            // Spawn 2 extra balls from primary
            const primary = ballsRef.current[0];
            if (!primary) return;
            for (let i = 0; i < 2; i++) {
                const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.6;
                const speed = levelSpeed(level, hasEffect('slow_ball'));
                const angle = Math.atan2(primary.vy, primary.vx) + spreadAngle;
                ballsRef.current.push({
                    x: primary.x, y: primary.y, r: primary.r,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    launched: true,
                    trailX: primary.x, trailY: primary.y,
                });
            }
        } else if (id === 'wide_paddle') {
            addEffect('wide_paddle', puType.duration);
            paddleRef.current.w = paddleRef.current.baseW * 1.7;
            paddleRef.current.x = Math.min(W - paddleRef.current.w, paddleRef.current.x);
        } else if (id === 'slow_ball') {
            addEffect('slow_ball', puType.duration);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Start ─────────────────────────────────────────────────────────────────
    const startGame = useCallback(() => {
        if (!canPlay) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        activeLevelRef.current = selectedLevel;
        cancelAnimationFrame(animRef.current);

        const ctx = canvas.getContext('2d')!;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const W = rect.width;
        const H = rect.height;

        const paddle = paddleRef.current;
        paddle.baseW = 70;
        paddle.w = 70;
        paddle.x = W / 2 - paddle.w / 2;
        paddle.stretch = 0;

        // Initialize primary ball
        const primaryBall: Ball = {
            x: W / 2, y: H - 36, r: 6,
            vx: levelSpeed(selectedLevel, false), vy: -levelSpeed(selectedLevel, false),
            launched: false, trailX: W / 2, trailY: H - 36,
        };
        ballsRef.current = [primaryBall];

        if (isBossLevel(selectedLevel)) {
            bricksRef.current = [];
            bossRef.current = buildBossEntity(W, selectedLevel);
        } else {
            bricksRef.current = buildBricks(W, selectedLevel);
            bossRef.current = null;
        }

        particlesRef.current = [];
        droppingPowerUpsRef.current = [];
        activeEffectsRef.current = [];
        pickupLabelRef.current = null;
        livesRef.current = 3;
        scoreRef.current = 0;
        shakeRef.current = 0;

        setScore(0); setLives(3); setGameOver(false); setWon(false);
        setActiveEffectLabels([]);
        setGameStarted(true);
        recordBreakerPlay(0);

        // ── Event handlers ───────────────────────────────────────────────────
        const handlePointer = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect();
            paddle.x = Math.max(0, Math.min(W - paddle.w, e.clientX - r.left - paddle.w / 2));
            // Pre-launch: keep primary ball centered on paddle
            const primary = ballsRef.current[0];
            if (primary && !primary.launched) {
                primary.x = paddle.x + paddle.w / 2;
            }
        };
        const handleClick = () => {
            const primary = ballsRef.current[0];
            if (primary && !primary.launched) primary.launched = true;
        };
        canvas.addEventListener('pointermove', handlePointer);
        canvas.addEventListener('click', handleClick);

        // ── Draw helpers ─────────────────────────────────────────────────────
        const drawBg = () => {
            const grad = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, H);
            grad.addColorStop(0, '#0a1628');
            grad.addColorStop(0.5, '#060d1a');
            grad.addColorStop(1, '#020608');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = 'rgba(255,255,255,0.02)';
            ctx.lineWidth = 0.5;
            for (let gx = 0; gx < W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
            for (let gy = 0; gy < H; gy += 30) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
        };

        const drawBricks = () => {
            for (const b of bricksRef.current) {
                if (!b.alive) continue;
                const dmgRatio = b.hp / b.maxHp;
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(b.x + 2, b.y + 2, b.w, b.h);
                ctx.globalAlpha = b.flashTimer > 0 ? 1 : 0.92 * (0.6 + dmgRatio * 0.4);
                ctx.fillStyle = b.flashTimer > 0 ? '#ffffff' : b.color;
                ctx.fillRect(b.x, b.y, b.w, b.h);
                ctx.globalAlpha = 1;
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fillRect(b.x, b.y, b.w, 3);
                ctx.strokeStyle = b.hp > 1 ? b.color + 'cc' : b.color + '55';
                ctx.lineWidth = b.hp > 2 ? 2 : 1;
                ctx.shadowColor = b.color;
                ctx.shadowBlur = b.hp > 1 ? 8 : 4;
                ctx.strokeRect(b.x, b.y, b.w, b.h);
                ctx.shadowBlur = 0; ctx.lineWidth = 1;
                if (b.maxHp > 1) {
                    for (let p = 0; p < b.hp; p++) {
                        ctx.fillStyle = '#ffffffcc';
                        ctx.beginPath();
                        ctx.arc(b.x + b.w - 5 - p * 7, b.y + b.h - 5, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                if (b.flashTimer > 0) b.flashTimer--;
            }
        };

        const drawBoss = (boss: BossBrick) => {
            boss.pulseTimer = (boss.pulseTimer + 2) % 360;
            const pulse = Math.sin(boss.pulseTimer * Math.PI / 180);
            const hpRatio = boss.hp / boss.maxHp;
            const cfg = getBossConfig(activeLevelRef.current);

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(boss.x + 4, boss.y + 4, boss.w, boss.h);

            // Main body — color shifts as HP drops
            const bodyColor = cfg.crackColors[boss.crackLevel];
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = boss.flashTimer > 0 ? '#ffffff' : bodyColor;
            ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
            ctx.globalAlpha = 1;

            // Crack lines
            if (boss.crackLevel >= 1) {
                ctx.strokeStyle = 'rgba(0,0,0,0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(boss.x + boss.w * 0.35, boss.y);
                ctx.lineTo(boss.x + boss.w * 0.45, boss.y + boss.h);
                ctx.stroke();
            }
            if (boss.crackLevel >= 2) {
                ctx.beginPath();
                ctx.moveTo(boss.x + boss.w * 0.65, boss.y);
                ctx.lineTo(boss.x + boss.w * 0.55, boss.y + boss.h);
                ctx.stroke();
                ctx.lineWidth = 1;
            }

            // Top bevel
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(boss.x, boss.y, boss.w, 4);

            // Pulsing glow
            const glowIntensity = 12 + pulse * 8 + (1 - hpRatio) * 15;
            ctx.strokeStyle = cfg.glowColor;
            ctx.lineWidth = 2;
            ctx.shadowColor = cfg.glowColor;
            ctx.shadowBlur = glowIntensity;
            ctx.strokeRect(boss.x, boss.y, boss.w, boss.h);
            ctx.shadowBlur = 0; ctx.lineWidth = 1;

            // Boss name label
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = 'bold 11px sans-serif';
            const nameW = ctx.measureText(boss.name).width;
            ctx.fillText(boss.name, boss.x + boss.w / 2 - nameW / 2, boss.y + boss.h / 2 + 4);

            // HP bar — shown below boss
            const barY = boss.y + boss.h + 6;
            const barW = boss.w;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(boss.x, barY, barW, 6);
            const fillW = barW * hpRatio;
            const barGrad = ctx.createLinearGradient(boss.x, barY, boss.x + barW, barY);
            barGrad.addColorStop(0, cfg.glowColor);
            barGrad.addColorStop(1, cfg.color);
            ctx.fillStyle = barGrad;
            ctx.shadowColor = cfg.glowColor;
            ctx.shadowBlur = 6;
            ctx.fillRect(boss.x, barY, fillW, 6);
            ctx.shadowBlur = 0;

            if (boss.flashTimer > 0) boss.flashTimer--;
        };

        const drawDroppings = () => {
            for (const pu of droppingPowerUpsRef.current) {
                if (!pu.alive) continue;
                const puType = POWER_UP_TYPES[pu.id as PowerUpEffectType];
                if (!puType) continue;
                ctx.shadowColor = puType.glowColor;
                ctx.shadowBlur = 10;
                ctx.fillStyle = puType.color;
                ctx.beginPath();
                ctx.roundRect(pu.x - pu.w / 2, pu.y - pu.h / 2, pu.w, pu.h, 6);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px sans-serif';
                const iconW = ctx.measureText(puType.icon).width;
                ctx.fillText(puType.icon, pu.x - iconW / 2, pu.y + 4);
            }
        };

        const drawParticles = () => {
            const remaining: Particle[] = [];
            for (const p of particlesRef.current) {
                p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--;
                if (p.life <= 0) continue;
                const alpha = p.life / p.maxLife;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color; ctx.shadowBlur = 4;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0; ctx.globalAlpha = 1;
                remaining.push(p);
            }
            particlesRef.current = remaining;
        };

        const drawPaddle = () => {
            const py = H - 18;
            const sh = paddle.h + paddle.stretch;
            if (paddle.stretch > 0) paddle.stretch -= 0.5;
            // Wide paddle tint
            const isWide = hasEffect('wide_paddle');
            const topColor = isWide ? '#67e8f9' : '#86efac';
            const botColor = isWide ? '#0891b2' : '#16a34a';
            const shadowC = isWide ? '#22d3ee' : '#4ade80';
            ctx.shadowColor = shadowC; ctx.shadowBlur = 12;
            const grad = ctx.createLinearGradient(paddle.x, py, paddle.x, py + sh);
            grad.addColorStop(0, topColor); grad.addColorStop(1, botColor);
            ctx.fillStyle = grad;
            const r = 5;
            ctx.beginPath();
            ctx.moveTo(paddle.x + r, py);
            ctx.lineTo(paddle.x + paddle.w - r, py);
            ctx.quadraticCurveTo(paddle.x + paddle.w, py, paddle.x + paddle.w, py + r);
            ctx.lineTo(paddle.x + paddle.w, py + sh - r);
            ctx.quadraticCurveTo(paddle.x + paddle.w, py + sh, paddle.x + paddle.w - r, py + sh);
            ctx.lineTo(paddle.x + r, py + sh);
            ctx.quadraticCurveTo(paddle.x, py + sh, paddle.x, py + sh - r);
            ctx.lineTo(paddle.x, py + r);
            ctx.quadraticCurveTo(paddle.x, py, paddle.x + r, py);
            ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
        };

        const drawBall = (ball: Ball) => {
            if (ball.launched) {
                const dx = ball.x - ball.trailX;
                const dy = ball.y - ball.trailY;
                for (let i = 1; i <= 4; i++) {
                    const tx = ball.trailX + dx * (i / 4);
                    const ty = ball.trailY + dy * (i / 4);
                    ctx.globalAlpha = (i / 4) * 0.35;
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath(); ctx.arc(tx, ty, ball.r * 0.75, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
                ball.trailX = ball.x; ball.trailY = ball.y;
            }
            ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10;
            const g = ctx.createRadialGradient(ball.x - 1, ball.y - 1, 1, ball.x, ball.y, ball.r);
            g.addColorStop(0, '#fef9c3'); g.addColorStop(1, '#f59e0b');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        };

        const drawHUD = () => {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, W, 34);
            ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 12px sans-serif';
            const lvlLabel = isBossLevel(activeLevelRef.current) ? `⚡ BOSS ${activeLevelRef.current}` : `LEVEL ${activeLevelRef.current}`;
            ctx.fillText(lvlLabel, 10, 21);
            ctx.fillStyle = '#f8fafc';
            const sw = ctx.measureText(`${scoreRef.current}`).width;
            ctx.fillText(`${scoreRef.current}`, W / 2 - sw / 2, 21);
            for (let i = 0; i < livesRef.current; i++) {
                ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 5;
                ctx.font = '12px sans-serif';
                ctx.fillText('♥', W - (livesRef.current - i) * 14 - 6, 21);
            }
            ctx.shadowBlur = 0;

            // Active effects bar (simplified pill row)
            let ex = 10;
            const now = performance.now();
            for (const eff of activeEffectsRef.current) {
                const puType = POWER_UP_TYPES[eff.id as PowerUpEffectType];
                if (!puType) continue;
                const remaining = Math.max(0, eff.expiresAt - now);
                const total = puType.duration ?? 1;
                const ratio = remaining / total;
                ctx.fillStyle = puType.color + '99';
                ctx.fillRect(ex, H - 12, 40 * ratio, 5);
                ctx.strokeStyle = puType.color;
                ctx.lineWidth = 1;
                ctx.strokeRect(ex, H - 12, 40, 5);
                ex += 46;
            }

            // Pickup label
            if (pickupLabelRef.current) {
                const lbl = pickupLabelRef.current;
                ctx.globalAlpha = Math.min(1, lbl.alpha);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px sans-serif';
                const lw = ctx.measureText(lbl.text).width;
                ctx.fillText(lbl.text, W / 2 - lw / 2, lbl.y);
                ctx.globalAlpha = 1;
                lbl.alpha -= 0.025;
                lbl.y -= 0.6;
                if (lbl.alpha <= 0) pickupLabelRef.current = null;
            }
        };

        // ── Core Ball Update ───────────────────────────────────────────────
        const updateBall = (ball: Ball, isExtra: boolean): boolean => {
            // Returns false if this ball is dead
            if (!ball.launched) return true;

            const isSlow = activeEffectsRef.current.some(e => e.id === 'slow_ball');
            const targetSpeed = levelSpeed(activeLevelRef.current, isSlow);

            ball.x += ball.vx; ball.y += ball.vy;

            // Wall
            if (ball.x - ball.r <= 0) ball.vx = Math.abs(ball.vx);
            if (ball.x + ball.r >= W) ball.vx = -Math.abs(ball.vx);
            if (ball.y - ball.r <= 0) ball.vy = Math.abs(ball.vy);

            // Normalize speed
            const sp = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
            if (sp > 0 && Math.abs(sp - targetSpeed) > 0.2) {
                ball.vx = (ball.vx / sp) * targetSpeed;
                ball.vy = (ball.vy / sp) * targetSpeed;
            }

            // Paddle
            const py = H - 18;
            if (ball.vy > 0 &&
                ball.y + ball.r >= py && ball.y + ball.r <= py + paddle.h + 4 &&
                ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
                ball.vy = -Math.abs(ball.vy);
                const hitPos = (ball.x - paddle.x) / paddle.w;
                ball.vx = (hitPos - 0.5) * targetSpeed * 2;
                const maxVx = targetSpeed * 0.88;
                ball.vx = Math.max(-maxVx, Math.min(maxVx, ball.vx));
                paddle.stretch = 4;
            }

            // Bottom — lose ball
            if (ball.y + ball.r > H) {
                if (isExtra) return false; // extra ball simply dies
                // Primary ball: lose life
                livesRef.current--;
                setLives(livesRef.current);
                triggerShake();
                clearEffects();
                // Kill all extra balls
                ballsRef.current = [ball];
                if (livesRef.current <= 0) return true; // endGame handled outside
                ball.x = paddle.x + paddle.w / 2;
                ball.y = H - 36;
                ball.vx = levelSpeed(activeLevelRef.current, false);
                ball.vy = -levelSpeed(activeLevelRef.current, false);
                ball.launched = false;
                ball.trailX = ball.x; ball.trailY = ball.y;
            }

            // Brick collision
            for (const b of bricksRef.current) {
                if (!b.alive) continue;
                if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
                    ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
                    const ox = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
                    const oy = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
                    if (ox < oy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
                    b.hp--;
                    if (b.hp <= 0) {
                        b.alive = false;
                        scoreRef.current += 10 * b.maxHp;
                        setScore(scoreRef.current);
                        spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.color, 7);
                        tryDropPowerUp(b.x + b.w / 2, b.y + b.h);
                    } else {
                        b.flashTimer = 3;
                        scoreRef.current += 2;
                    }
                    break;
                }
            }

            // Boss collision
            const boss = bossRef.current;
            if (boss) {
                if (ball.x + ball.r > boss.x && ball.x - ball.r < boss.x + boss.w &&
                    ball.y + ball.r > boss.y && ball.y - ball.r < boss.y + boss.h) {
                    const ox = Math.min(ball.x + ball.r - boss.x, boss.x + boss.w - (ball.x - ball.r));
                    const oy = Math.min(ball.y + ball.r - boss.y, boss.y + boss.h - (ball.y - ball.r));
                    if (ox < oy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
                    boss.hp--;
                    boss.flashTimer = 4;
                    shakeRef.current = 6; // mini-shake on boss hit
                    scoreRef.current += 5;
                    setScore(scoreRef.current);
                    // Update crack level
                    const hpRatio = boss.hp / boss.maxHp;
                    boss.crackLevel = hpRatio > 0.66 ? 0 : hpRatio > 0.33 ? 1 : 2;
                    if (boss.hp <= 0) {
                        // BOSS DEAD
                        spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, getBossConfig(activeLevelRef.current).glowColor, 20);
                        bossRef.current = null;
                    }
                }
            }

            return true;
        };

        // ── Main Loop ─────────────────────────────────────────────────────────
        let ended = false;

        const endGame = (didWin: boolean) => {
            if (ended) return;
            ended = true;
            cancelAnimationFrame(animRef.current);
            canvas.removeEventListener('pointermove', handlePointer);
            canvas.removeEventListener('click', handleClick);
            clearEffects();
            const finalScore = scoreRef.current;
            setScore(finalScore);
            setGameStarted(false);
            if (didWin) {
                setWon(true);
                unlockNextLevel(activeLevelRef.current);
                const goldBonus = isBossLevel(activeLevelRef.current) ? activeLevelRef.current : 0;
                const goldReward = Math.min(12, Math.floor(finalScore / 150) + activeLevelRef.current + goldBonus);
                if (goldReward > 0) addGold(goldReward);
            } else {
                setGameOver(true);
                const goldReward = Math.min(3, Math.floor(finalScore / 250));
                if (goldReward > 0) addGold(goldReward);
            }
        };

        const loop = () => {
            let sx = 0, sy = 0;
            if (shakeRef.current > 0) {
                sx = (Math.random() - 0.5) * 6;
                sy = (Math.random() - 0.5) * 6;
                shakeRef.current--;
            }
            ctx.save();
            ctx.translate(sx, sy);
            ctx.clearRect(-10, -10, W + 20, H + 20);
            drawBg();
            drawBricks();
            const boss = bossRef.current;
            if (boss) drawBoss(boss);
            drawDroppings();
            drawParticles();
            drawPaddle();
            for (const b of ballsRef.current) drawBall(b);
            drawHUD();

            tickEffects(performance.now());

            // Update dropping power-ups
            const livePowerUps: DroppingPowerUp[] = [];
            for (const pu of droppingPowerUpsRef.current) {
                if (!pu.alive) continue;
                pu.y += pu.vy;
                // Paddle catch
                const py = H - 18;
                if (pu.y + pu.h / 2 >= py && pu.y - pu.h / 2 <= py + paddle.h &&
                    pu.x + pu.w / 2 >= paddle.x && pu.x - pu.w / 2 <= paddle.x + paddle.w) {
                    applyPowerUp(pu.id, W, activeLevelRef.current);
                    pu.alive = false;
                    continue;
                }
                if (pu.y > H) { pu.alive = false; continue; }
                livePowerUps.push(pu);
            }
            droppingPowerUpsRef.current = livePowerUps;

            // Update all balls
            const primaryBall = ballsRef.current[0];
            const aliveBalls = ballsRef.current.filter((ball, idx) => updateBall(ball, idx > 0));
            ballsRef.current = aliveBalls.length > 0 ? aliveBalls : [primaryBall]; // always keep primary

            // Life death check (set by updateBall)
            if (primaryBall && livesRef.current <= 0) { endGame(false); return; }

            // Win conditions
            const bossKilled = isBossLevel(activeLevelRef.current) && bossRef.current === null;
            const allBricksGone = !isBossLevel(activeLevelRef.current) && bricksRef.current.every(b => !b.alive);
            if (bossKilled || allBricksGone) { endGame(true); return; }

            ctx.restore();
            animRef.current = requestAnimationFrame(loop);
        };

        animRef.current = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(animRef.current);
            canvas.removeEventListener('pointermove', handlePointer);
            canvas.removeEventListener('click', handleClick);
        };
    }, [canPlay, selectedLevel, addGold, recordBreakerPlay, unlockNextLevel, spawnParticles, triggerShake, tryDropPowerUp, applyPowerUp]);

    const playsRemaining = Math.max(0, 3 - (useMiniGameStore.getState().breakerPlaysToday));
    const showIdleScreen = !gameStarted && !gameOver && !won;
    const showEndScreen = gameOver || won;

    // ── Limit screen ──
    if (!canPlay) {
        return (
            <motion.div className="breaker-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="breaker-container" ref={containerRef}>
                    <div className="breaker-header">
                        <h2>⚔️ Brick Breaker</h2>
                        <button className="breaker-close" onClick={onClose}><X size={20} /></button>
                    </div>
                    <div className="breaker-limit-msg">
                        <div className="limit-icon">🚫</div>
                        <p>Daily limit reached (3/3)</p>
                        <p>Come back tomorrow!</p>
                        <div className="breaker-high-score-row">🏆 High Score: <strong>{breakerHighScore}</strong></div>
                        <div className="breaker-level-row">⚡ Highest Level: <strong>{highestBreakerLevel}</strong></div>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div className="breaker-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="breaker-container" ref={containerRef}>
                <div className="breaker-header">
                    <h2>
                        {isBossLevel(selectedLevel) && !gameStarted ? '⚡ BOSS LEVEL' : '⚔️ Brick Breaker'}
                    </h2>
                    <button className="breaker-close" onClick={onClose}><X size={20} /></button>
                </div>

                {showIdleScreen && (
                    <div className="breaker-idle-screen">
                        <div className="breaker-bg-art">
                            <div className="breaker-fake-bricks">
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <div key={i} className="breaker-fake-brick" style={{ '--brick-hue': `${(i * 23) % 360}deg` } as any} />
                                ))}
                            </div>
                        </div>

                        <div className="breaker-idle-content">
                            <div className="breaker-title-block">
                                <h3>
                                    {isBossLevel(selectedLevel)
                                        ? `⚡ ${getBossConfig(selectedLevel).name}`
                                        : 'Select Level'}
                                </h3>
                                <p className="breaker-unlock-label">Highest Unlocked: {highestBreakerLevel}</p>
                            </div>

                            <div className="breaker-level-picker">
                                <button className="breaker-level-arrow" onClick={() => changeLevel(-1)} disabled={selectedLevel <= 1}>
                                    <ChevronLeft size={24} />
                                </button>
                                <div className={`breaker-level-display ${isBossLevel(selectedLevel) ? 'boss' : ''}`}>
                                    <span className="breaker-level-num">{selectedLevel}</span>
                                    <span className="breaker-level-label">{isBossLevel(selectedLevel) ? 'BOSS' : 'LEVEL'}</span>
                                </div>
                                <button className="breaker-level-arrow" onClick={() => changeLevel(1)} disabled={selectedLevel >= highestBreakerLevel}>
                                    <ChevronRight size={24} />
                                </button>
                            </div>

                            <div className="breaker-plays-left">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Heart key={i} size={16} fill={i < playsRemaining ? '#ef4444' : 'none'} color={i < playsRemaining ? '#ef4444' : '#334155'} />
                                ))}
                                <span>{playsRemaining} play{playsRemaining !== 1 ? 's' : ''} left today</span>
                            </div>

                            <button className={`breaker-start-btn ${isBossLevel(selectedLevel) ? 'boss' : ''}`} onClick={startGame}>
                                {isBossLevel(selectedLevel) ? '⚡ CHALLENGE' : 'PLAY'}
                            </button>

                            {breakerHighScore > 0 && (
                                <div className="breaker-high-score-small">🏆 Best: {breakerHighScore}</div>
                            )}
                        </div>
                    </div>
                )}

                <canvas ref={canvasRef} className={`breaker-canvas ${gameStarted ? 'visible' : 'hidden'}`} />

                {gameStarted && !gameOver && !won && (
                    <div className="breaker-hint">Tap / click to launch</div>
                )}

                {showEndScreen && (
                    <div className="breaker-end-screen">
                        <div className={`breaker-result-title ${won ? 'win' : 'lose'}`}>
                            {won ? (isBossLevel(activeLevelRef.current) ? '⚡ Boss Defeated!' : '🎉 Level Clear!') : '💀 Game Over'}
                        </div>
                        {won && (
                            <div className="breaker-result-subtitle">
                                {activeLevelRef.current >= highestBreakerLevel - 1
                                    ? `🔓 Level ${activeLevelRef.current + 1} Unlocked!`
                                    : 'Nice work!'}
                            </div>
                        )}
                        <div className="breaker-result-score">Score: <strong>{score}</strong></div>
                        <div className="breaker-result-actions">
                            <button className="breaker-play-again-btn" onClick={() => { setGameOver(false); setWon(false); }}>
                                Play Again
                            </button>
                            <button className="breaker-exit-btn" onClick={onClose}>Exit</button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
