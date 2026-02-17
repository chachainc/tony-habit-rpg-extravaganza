import type { ReactNode } from 'react';
import './SceneShell.css';

interface SceneShellProps {
    /** AI-generated background image URL */
    backgroundImage?: string;
    /** Fallback gradient colors if no image provided */
    fallbackGradient?: string;
    /** Whether to show fog overlay animation */
    showFog?: boolean;
    /** Whether to show ember particles */
    showEmbers?: boolean;
    /** Whether to show vignette overlay */
    showVignette?: boolean;
    /** Optional lantern/glow positions as {x: %, y: %} */
    glowPoints?: Array<{ x: number; y: number; color?: string; intensity?: number }>;
    /** Child content (the actual scene UI) */
    children: ReactNode;
    /** Optional className for the scene content layer */
    contentClassName?: string;
}

/**
 * SceneShell - Reusable layered background wrapper for all walkable scenes.
 * 
 * Layers (back to front):
 * 0. Background image (or gradient fallback)
 * 1. Gradient overlay (vignette)
 * 2. Fog/atmosphere overlay (animated)
 * 3. Content layer (children)
 * 4. Foreground particles (embers)
 * 5. Glow spots (lanterns/torches)
 */
export function SceneShell({
    backgroundImage,
    fallbackGradient = 'linear-gradient(180deg, #0f1419 0%, #1a1a2e 50%, #16213e 100%)',
    showFog = true,
    showEmbers = false,
    showVignette = true,
    glowPoints = [],
    children,
    contentClassName = '',
}: SceneShellProps) {
    return (
        <div className="scene-shell">
            {/* Layer 0: Background Image or Gradient */}
            <div
                className="scene-layer scene-layer--background"
                style={{
                    backgroundImage: backgroundImage ? `url(${backgroundImage})` : fallbackGradient,
                    backgroundSize: backgroundImage ? 'cover' : 'initial',
                    backgroundPosition: 'center',
                }}
            />

            {/* Layer 1: Vignette Overlay */}
            {showVignette && <div className="scene-layer scene-layer--vignette" />}

            {/* Layer 2: Fog Animation */}
            {showFog && (
                <div className="scene-layer scene-layer--fog">
                    <div className="fog fog--1" />
                    <div className="fog fog--2" />
                </div>
            )}

            {/* Layer 3: Content */}
            <div className={`scene-layer scene-layer--content ${contentClassName}`}>
                {children}
            </div>

            {/* Layer 4: Ember Particles */}
            {showEmbers && (
                <div className="scene-layer scene-layer--embers">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="ember"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${3 + Math.random() * 4}s`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Layer 5: Glow Points (lanterns/torches) */}
            {glowPoints.length > 0 && (
                <div className="scene-layer scene-layer--glows">
                    {glowPoints.map((glow, i) => (
                        <div
                            key={i}
                            className="glow-point"
                            style={{
                                left: `${glow.x}%`,
                                top: `${glow.y}%`,
                                '--glow-color': glow.color || '#fbbf24',
                                '--glow-intensity': glow.intensity || 1,
                            } as React.CSSProperties}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default SceneShell;
