import { useEffect, useRef } from 'react';
import { useCharacterStore, COSMETICS_DB } from '../../store/useCharacterStore';
import { useRoomStore } from '../../store/useRoomStore';
import { usePetStore } from '../../store/usePetStore';
import './Room2D.css';

export const Room2D = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { position, equipped } = useCharacterStore();
    const { furnitureItems, roomDimensions } = useRoomStore();
    const { activePet } = usePetStore();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Animation frame function
        const render = () => {
            // Clear canvas
            ctx.fillStyle = '#1e293b'; // Dark floor
            ctx.fillRect(0, 0, roomDimensions.width, roomDimensions.height);

            // Draw grid (optional, for development)
            drawGrid(ctx, roomDimensions.width, roomDimensions.height);

            // Draw furniture
            furnitureItems.forEach((item) => {
                drawFurniture(ctx, item);
            });

            // Draw character
            drawCharacter(ctx, position.x, position.y, equipped);

            // Draw pet (if exists)
            if (activePet) {
                drawPet(ctx, position.x + 40, position.y + 40); // Near character
            }
        };

        render();
    }, [position, equipped, furnitureItems, roomDimensions, activePet]);

    return (
        <div className="room-2d-container">
            <canvas
                ref={canvasRef}
                width={roomDimensions.width}
                height={roomDimensions.height}
                className="room-canvas"
            />
        </div>
    );
};

// Helper: Draw grid
function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

// Helper: Draw furniture
function drawFurniture(ctx: CanvasRenderingContext2D, item: any) {
    // Simple placeholder rectangles for now
    ctx.fillStyle = '#8b4513'; // Brown
    ctx.fillRect(item.x, item.y, item.width, item.height);

    // Add a border
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.strokeRect(item.x, item.y, item.width, item.height);
}

// Helper: Draw character (top-down, detailed)
function drawCharacter(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    equipped: Partial<Record<string, string>>
) {
    const scale = 1;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 28, 12 * scale, 6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Get colors from equipped items
    const bodyColor = equipped.body ? COSMETICS_DB[equipped.body]?.color || '#3b82f6' : '#3b82f6';
    const legsColor = equipped.legs ? COSMETICS_DB[equipped.legs]?.color || '#1e40af' : '#1e40af';
    const feetColor = equipped.feet ? COSMETICS_DB[equipped.feet]?.color || '#334155' : '#334155';
    const headColor = equipped.head ? COSMETICS_DB[equipped.head]?.color : null;
    const accessoryColor = equipped.accessory ? COSMETICS_DB[equipped.accessory]?.color : null;

    // Body (torso) - oval shape
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(x, y, 12 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs - two rectangles
    ctx.fillStyle = legsColor;
    // Left leg
    ctx.fillRect(x - 8 * scale, y + 10 * scale, 6 * scale, 14 * scale);
    // Right leg
    ctx.fillRect(x + 2 * scale, y + 10 * scale, 6 * scale, 14 * scale);

    // Feet - shoes
    if (feetColor) {
        ctx.fillStyle = feetColor;
        // Left foot
        ctx.fillRect(x - 10 * scale, y + 22 * scale, 8 * scale, 4 * scale);
        // Right foot
        ctx.fillRect(x + 2 * scale, y + 22 * scale, 8 * scale, 4 * scale);
    }

    // Head - circle
    ctx.fillStyle = '#ffdbac'; // Skin tone
    ctx.beginPath();
    ctx.arc(x, y - 18 * scale, 10 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Face details
    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 4 * scale, y - 20 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 4 * scale, y - 20 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Mouth (simple line)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - 15 * scale, 4 * scale, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Headband (if equipped)
    if (headColor) {
        ctx.fillStyle = headColor;
        ctx.fillRect(x - 10 * scale, y - 24 * scale, 20 * scale, 4 * scale);
    }

    // Necklace (if equipped)
    if (accessoryColor) {
        ctx.fillStyle = accessoryColor;
        ctx.beginPath();
        ctx.arc(x, y - 2 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    // Arms - simple lines extending from body
    ctx.strokeStyle = '#ffdbac';
    ctx.lineWidth = 4 * scale;
    ctx.lineCap = 'round';

    // Left arm
    ctx.beginPath();
    ctx.moveTo(x - 10 * scale, y - 4 * scale);
    ctx.lineTo(x - 16 * scale, y + 8 * scale);
    ctx.stroke();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(x + 10 * scale, y - 4 * scale);
    ctx.lineTo(x + 16 * scale, y + 8 * scale);
    ctx.stroke();
}

// Helper: Draw pet (cow - top-down)
function drawPet(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const scale = 0.7;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + 18, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body - white/cream colored oval
    ctx.fillStyle = '#f5f5dc'; // Beige
    ctx.beginPath();
    ctx.ellipse(x, y, 14 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spots - black circles
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 6 * scale, y - 4 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 4 * scale, y + 2 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Head - smaller circle at top
    ctx.fillStyle = '#f5f5dc';
    ctx.beginPath();
    ctx.arc(x, y - 14 * scale, 8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Ears - two small circles
    ctx.fillStyle = '#daa520'; // Brown
    ctx.beginPath();
    ctx.arc(x - 6 * scale, y - 18 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 6 * scale, y - 18 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Snout - small oval
    ctx.fillStyle = '#ffb6c1'; // Pink
    ctx.beginPath();
    ctx.ellipse(x, y - 10 * scale, 4 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 3 * scale, y - 14 * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 3 * scale, y - 14 * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
}
