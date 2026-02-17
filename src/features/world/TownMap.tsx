import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShopModal } from '../shop/ShopModal';
import { HomeModal } from '../pet/HomeModal';
import { Arena } from '../arena/Arena';
import type { ShopCategory } from '../../store/useInventoryStore';
import './TownMap.css';

interface Position { x: number; y: number }

export const TownMap = () => {
    const [avatarPos, setAvatarPos] = useState<Position>({ x: 50, y: 80 });
    const [activeModal, setActiveModal] = useState<'home' | 'arena' | null>(null);
    const [activeShop, setActiveShop] = useState<ShopCategory | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (activeModal || activeShop) return;
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setAvatarPos({ x, y });
    };

    const enterBuilding = (building: 'home' | 'arena') => {
        if (building === 'arena') setAvatarPos({ x: 50, y: 20 });
        if (building === 'home') setAvatarPos({ x: 15, y: 50 });
        setTimeout(() => setActiveModal(building), 400);
    };

    const enterShop = (category: ShopCategory) => {
        if (category === 'blacksmith') setAvatarPos({ x: 85, y: 30 });
        if (category === 'armory') setAvatarPos({ x: 85, y: 55 });
        if (category === 'first_aid') setAvatarPos({ x: 85, y: 80 });
        setTimeout(() => setActiveShop(category), 400);
    };

    return (
        <div className="town-container">
            <h2 className="town-header">Neon Valley</h2>

            <div className="town-map" ref={containerRef} onClick={handleMapClick}>
                {/* Background Decorations */}
                <div className="decor tree" style={{ top: '15%', left: '5%' }}>🌲</div>
                <div className="decor tree" style={{ top: '70%', left: '50%' }}>🌲</div>
                <div className="decor sun">☀️</div>

                {/* HOME (Left) */}
                <button
                    className="building home-building"
                    onClick={(e) => { e.stopPropagation(); enterBuilding('home'); }}
                    style={{ top: '45%', left: '10%' }}
                >
                    <div className="roof">🏠</div>
                    <span className="label">My Home</span>
                </button>

                {/* ARENA (Top Center) */}
                <button
                    className="building arena-building"
                    onClick={(e) => { e.stopPropagation(); enterBuilding('arena'); }}
                    style={{ top: '10%', left: '45%' }}
                >
                    <div className="roof">🏟️</div>
                    <span className="label">Arena</span>
                </button>

                {/* BLACKSMITH (Right Top) */}
                <button
                    className="building shop-building blacksmith"
                    onClick={(e) => { e.stopPropagation(); enterShop('blacksmith'); }}
                    style={{ top: '20%', left: '80%' }}
                >
                    <div className="roof">🗡️</div>
                    <span className="label">Blacksmith</span>
                </button>

                {/* ARMORY (Right Middle) */}
                <button
                    className="building shop-building armory"
                    onClick={(e) => { e.stopPropagation(); enterShop('armory'); }}
                    style={{ top: '45%', left: '80%' }}
                >
                    <div className="roof">🛡️</div>
                    <span className="label">Armory</span>
                </button>

                {/* FIRST AID (Right Bottom) */}
                <button
                    className="building shop-building first-aid"
                    onClick={(e) => { e.stopPropagation(); enterShop('first_aid'); }}
                    style={{ top: '70%', left: '80%' }}
                >
                    <div className="roof">⚕️</div>
                    <span className="label">First Aid</span>
                </button>

                {/* FURNITURE STORE (Bottom Center) */}
                <button
                    className="building shop-building furniture"
                    onClick={(e) => { e.stopPropagation(); enterShop('furniture'); }}
                    style={{ top: '75%', left: '35%' }}
                >
                    <div className="roof">🪑</div>
                    <span className="label">Furniture</span>
                </button>

                {/* Avatar */}
                <motion.div
                    className="avatar-sprite"
                    animate={{ top: `${avatarPos.y}%`, left: `${avatarPos.x}%` }}
                    transition={{ type: "spring", damping: 20, stiffness: 100 }}
                >
                    🤠
                    <div className="avatar-shadow"></div>
                </motion.div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {activeShop && <ShopModal category={activeShop} onClose={() => setActiveShop(null)} />}
                {activeModal === 'home' && <HomeModal onClose={() => setActiveModal(null)} />}
                {activeModal === 'arena' && <Arena onClose={() => setActiveModal(null)} />}
            </AnimatePresence>
        </div>
    );
};
