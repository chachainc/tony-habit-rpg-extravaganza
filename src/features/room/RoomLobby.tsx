import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BedDouble, BookOpen, Shirt, Scale, Dumbbell, DollarSign, Edit3 } from 'lucide-react';
import { usePetStore } from '../../store/usePetStore';
import { ITEM_DATABASE } from '../../data/items';
import { useHeroImage } from '../../hooks/useHeroImage';
import { SceneShell } from '../../components/scene';
import { LoadoutPanel } from '../character/LoadoutPanel';
import homeCampBg from '../../assets/room-bg.jpg';
import './RoomLobby.css';

const ROOM_CARDS = [
    {
        id: 'closet',
        icon: <Shirt size={28} />,
        title: 'Closet',
        subtitle: 'Titles, Auras, Pets',
        color: 'rgba(139, 92, 246, 0.35)',
        borderColor: 'rgba(139, 92, 246, 0.5)',
        route: null,
        panelHint: 'wardrobe',
    },
    {
        id: 'bed',
        icon: <BedDouble size={28} />,
        title: 'Bed',
        subtitle: 'Sleep Log',
        color: 'rgba(59, 130, 246, 0.35)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        route: '/room/2d',
        panelHint: 'sleep',
    },
    {
        id: 'library',
        icon: <BookOpen size={28} />,
        title: 'Library',
        subtitle: 'Book Collection',
        color: 'rgba(245, 158, 11, 0.35)',
        borderColor: 'rgba(245, 158, 11, 0.5)',
        route: '/library',
    },
    {
        id: 'body',
        icon: <Scale size={28} />,
        title: 'Body',
        subtitle: 'Weight & Calories',
        color: 'rgba(236, 72, 153, 0.35)',
        borderColor: 'rgba(236, 72, 153, 0.5)',
        route: '/health',
    },
    {
        id: 'gym',
        icon: <Dumbbell size={28} />,
        title: 'Gym',
        subtitle: 'Workout Tracker',
        color: 'rgba(239, 68, 68, 0.35)',
        borderColor: 'rgba(239, 68, 68, 0.5)',
        route: '/gym',
    },
    {
        id: 'budget',
        icon: <DollarSign size={28} />,
        title: 'Budget',
        subtitle: 'Finances & Shop',
        color: 'rgba(16, 185, 129, 0.35)',
        borderColor: 'rgba(16, 185, 129, 0.5)',
        route: '/budget',
    },
    {
        id: 'arrange',
        icon: <Edit3 size={28} />,
        title: 'Arrange',
        subtitle: 'Place & Move Items',
        color: 'rgba(59, 130, 246, 0.4)',
        borderColor: 'rgba(59, 130, 246, 0.6)',
        route: '/room/2d',
        state: { autoEdit: true },
    },
    {
        id: 'pet',
        icon: null, // filled dynamically
        title: 'Pet',
        subtitle: 'Care & Bond',
        color: 'rgba(251, 191, 36, 0.35)',
        borderColor: 'rgba(251, 191, 36, 0.5)',
        route: '/pet',
        panelHint: 'pet',
    },
    {
        id: '2d-room',
        icon: null, // filled dynamically with hero image
        title: '2D Room',
        subtitle: 'Walk Around',
        color: 'rgba(30, 58, 90, 0.6)',
        borderColor: 'rgba(59, 130, 246, 0.4)',
        route: '/room/2d',
        state: { autoEdit: false },
    },
];

export const RoomLobby = ({ onClose: _onClose }: { onClose: () => void }) => {
    const navigate = useNavigate();
    const { equippedPetId, name: petName } = usePetStore();
    const petData = equippedPetId ? ITEM_DATABASE[equippedPetId] : null;
    const petSprite = petData?.icon || '🐮';
    const heroImage = useHeroImage();
    
    const [showLoadout, setShowLoadout] = useState(false);

    return (
        <SceneShell
            backgroundImage={homeCampBg}
            showFog={true}
            showVignette={true}
            showEmbers={true}
        >
            <div className="room-hub">
                {/* Equipment Loadout Bar */}
                <motion.div 
                    className="room-hub__loadout"
                    onClick={() => setShowLoadout(true)}
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(30, 41, 59, 0.85)' }}
                >
                    <img src={heroImage} alt="Hero" className="room-hub__hero-thumb" />
                    <span className="room-hub__pet-badge">{petSprite} {petName}</span>
                    <span className="room-hub__loadout-label">⚔ Wardrobe & Loadout</span>
                </motion.div>

                {/* Grid of cards */}
                <div className="room-hub__grid">
                    {ROOM_CARDS.map((card, i) => (
                        <motion.button
                            key={card.id}
                            className="room-hub__card"
                            style={{
                                background: card.color,
                                borderColor: card.borderColor,
                            }}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.04 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                if (card.id === 'closet') {
                                    setShowLoadout(true);
                                } else if (card.route) {
                                    navigate(card.route, card.state ? { state: card.state } : undefined);
                                }
                            }}
                        >
                            <div className="room-hub__card-icon">
                                {card.id === 'pet'
                                    ? <span style={{ fontSize: '1.6rem' }}>{petSprite}</span>
                                    : card.id === '2d-room'
                                        ? <img src={heroImage} alt="" className="room-hub__card-hero" />
                                        : card.icon
                                }
                            </div>
                            <span className="room-hub__card-title">{card.title}</span>
                            <small className="room-hub__card-sub">{card.subtitle}</small>
                        </motion.button>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {showLoadout && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.98)',
                            zIndex: 60,
                            overflowY: 'auto'
                        }}
                    >
                        <LoadoutPanel onClose={() => setShowLoadout(false)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </SceneShell>
    );
};
