import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, Billboard, useTexture } from '@react-three/drei';
import { useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';

interface BattleStage3DProps {
    backgroundImage: string;
    playerImage?: string; // Optional - falls back to emoji if not provided
    playerEmoji?: string;
    enemyImage?: string;
    enemyEmoji?: string;
}

// Ground plane with subtle grid pattern
function Ground() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial
                color="#1a1a2e"
                transparent
                opacity={0.8}
            />
        </mesh>
    );
}

// Background plane using the AI-generated image
function BackgroundPlane({ imageUrl }: { imageUrl: string }) {
    const texture = useTexture(imageUrl);

    return (
        <mesh position={[0, 3, -8]} scale={[16, 9, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={texture} transparent />
        </mesh>
    );
}

// Character sprite as a billboarded plane
function CharacterSprite({
    imageUrl,
    position,
    scale = 3,
    playerSide: _playerSide = false
}: {
    imageUrl: string;
    position: [number, number, number];
    scale?: number;
    playerSide?: boolean;
}) {
    const texture = useTexture(imageUrl);
    const meshRef = useRef<THREE.Mesh>(null);

    // Gentle idle animation
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        }
    });

    return (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
            <mesh ref={meshRef} position={position}>
                <planeGeometry args={[scale, scale]} />
                <meshBasicMaterial
                    map={texture}
                    transparent
                    side={THREE.DoubleSide}
                />
            </mesh>
        </Billboard>
    );
}

// Emoji sprite (fallback when no image)
function EmojiSprite({
    emoji,
    position,
    scale = 3
}: {
    emoji: string;
    position: [number, number, number];
    scale?: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null);

    // Create a canvas texture for the emoji
    const canvasTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'transparent';
            ctx.fillRect(0, 0, 256, 256);
            ctx.font = '180px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 128, 140);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }, [emoji]);

    // Gentle idle animation
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        }
    });

    return (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
            <mesh ref={meshRef} position={position}>
                <planeGeometry args={[scale, scale]} />
                <meshBasicMaterial
                    map={canvasTexture}
                    transparent
                    side={THREE.DoubleSide}
                />
            </mesh>
        </Billboard>
    );
}

// Ambient particles for atmosphere
function Particles() {
    const particlesRef = useRef<THREE.Points>(null);

    const geometry = useMemo(() => {
        const positions = new Float32Array(100 * 3);
        for (let i = 0; i < 100; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 1] = Math.random() * 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geo;
    }, []);

    useFrame((state) => {
        if (particlesRef.current) {
            particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
        }
    });

    return (
        <points ref={particlesRef} geometry={geometry}>
            <pointsMaterial
                size={0.05}
                color="#a855f7"
                transparent
                opacity={0.6}
            />
        </points>
    );
}

// Main 3D Stage Component
export function BattleStage3D({
    backgroundImage,
    playerImage,
    playerEmoji = '🗡️',
    enemyImage,
    enemyEmoji = '👹'
}: BattleStage3DProps) {
    return (
        <Canvas
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                background: 'transparent'
            }}
            gl={{ alpha: true, antialias: true }}
        >
            {/* Overhead isometric camera - centered and angled down */}
            <OrthographicCamera
                makeDefault
                position={[0, 12, 8]}  // Centered X, high Y for overhead, moderate Z
                zoom={70}              // Higher zoom for better framing
                near={0.1}
                far={100}
            />

            {/* Lighting */}
            <ambientLight intensity={0.7} />
            <directionalLight
                position={[0, 15, 5]}
                intensity={0.9}
                castShadow
            />
            <pointLight position={[-4, 5, 3]} intensity={0.4} color="#3b82f6" />
            <pointLight position={[4, 5, 3]} intensity={0.4} color="#ef4444" />

            {/* Scene Content */}
            <Suspense fallback={null}>
                {/* Background image as far plane - centered */}
                <BackgroundPlane imageUrl={backgroundImage} />

                {/* Ground plane */}
                <Ground />

                {/* Atmospheric particles */}
                <Particles />

                {/* Player character - left side, centered in view */}
                {playerImage ? (
                    <CharacterSprite
                        imageUrl={playerImage}
                        position={[-2.5, 0, 0]}
                        scale={3.5}
                        playerSide={true}
                    />
                ) : (
                    <EmojiSprite
                        emoji={playerEmoji}
                        position={[-2.5, 0, 0]}
                        scale={3.5}
                    />
                )}

                {/* Enemy character - right side, centered in view */}
                {enemyImage ? (
                    <CharacterSprite
                        imageUrl={enemyImage}
                        position={[2.5, 0, 0]}
                        scale={4}
                        playerSide={false}
                    />
                ) : (
                    <EmojiSprite
                        emoji={enemyEmoji}
                        position={[2.5, 0, 0]}
                        scale={4}
                    />
                )}
            </Suspense>
        </Canvas>
    );
}

export default BattleStage3D;
