import React, { useEffect, useRef } from 'react';
import './Particles.css';

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    speedY: number;
    speedX: number;
    opacity: number;
    life: number;
    maxLife: number;
}

interface ParticlesProps {
    count?: number;
    color?: string;
    speed?: number;
    className?: string;
}

export const Particles: React.FC<ParticlesProps> = ({
    count = 30,
    color = 'rgba(242, 166, 58, 0.6)',
    speed = 1,
    className = ''
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Handle Resize
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Initialize Particles
        const initParticles = () => {
            particlesRef.current = Array.from({ length: count }).map((_, i) => createParticle(i, canvas));
        };

        const createParticle = (id: number, c: HTMLCanvasElement): Particle => {
            return {
                id,
                x: Math.random() * c.width,
                y: c.height + Math.random() * 200, // Start below screen occasionally
                size: Math.random() * 2.5 + 0.5,
                speedY: (Math.random() * 0.5 + 0.2) * speed,
                speedX: (Math.random() * 0.4 - 0.2) * speed,
                opacity: Math.random() * 0.5 + 0.1,
                life: 0,
                maxLife: Math.random() * 200 + 100
            };
        };

        initParticles();

        // Animation Loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particlesRef.current.forEach(p => {
                // Move
                p.y -= p.speedY;
                p.x += p.speedX;
                p.life++;

                // Fade logic (fade in, fade out)
                let currentOpacity = p.opacity;
                if (p.life < 20) {
                    currentOpacity = p.opacity * (p.life / 20); // Fade in
                } else if (p.life > p.maxLife - 30) {
                    currentOpacity = p.opacity * ((p.maxLife - p.life) / 30); // Fade out
                }

                // Draw
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = color.replace(/[\d.]+\)$/g, `${Math.max(0, currentOpacity)})`);
                ctx.fill();

                // Reset if dead or off-screen
                if (p.life >= p.maxLife || p.y < -10) {
                    const newP = createParticle(p.id, canvas);
                    newP.y = canvas.height + 10;
                    Object.assign(p, newP);
                }
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [count, color, speed]);

    return (
        <canvas
            ref={canvasRef}
            className={`gacha-particles ${className}`}
            style={{ pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: 0 }}
        />
    );
};
