import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BedDouble, BookOpen, Shirt, Scale, Dumbbell, Pencil } from 'lucide-react';
import { usePetStore } from '../../store/usePetStore';
import { ITEM_DATABASE } from '../../data/items';
import { useHeroImage } from '../../hooks/useHeroImage';
import { SceneShell } from '../../components/scene';
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
        route: '/room/2d',
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
        id: 'arrange',
        icon: <Pencil size={28} />,
        title: 'Arrange',
        subtitle: 'Place & Move Items',
        color: 'rgba(30, 64, 100, 0.6)',
        borderColor: 'rgba(59, 130, 246, 0.4)',
        route: '/room/2d',
        panelHint: 'furniture_edit',
    },
    {
        id: 'pet',
        icon: null, // filled dynamically
        title: 'Pet',
        subtitle: 'Care & Bond',
        color: 'rgba(251, 191, 36, 0.35)',
        borderColor: 'rgba(251, 191, 36, 0.5)',
        route: '/room/2d',
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
    },
];

export const RoomLobby = ({ onClose: _onClose }: { onClose: () => void }) => {
    const navigate = useNavigate();
    const { activePet, name: petName } = usePetStore();
    const petData = ITEM_DATABASE[activePet];
    const petSprite = petData?.icon || '🐮';
    const heroImage = useHeroImage();

    return (
        <SceneShell
            backgroundImage={homeCampBg}
            showFog={true}
            showVignette={true}
            showEmbers={true}
        >
            <div className="room-hub">
                {/* Equipment Loadout Bar */}
                <div className="room-hub__loadout">
                    <img src={heroImage} alt="Hero" className="room-hub__hero-thumb" />
                    <span className="room-hub__pet-badge">{petSprite} {petName}</span>
                    <span className="room-hub__loadout-label">⚔ Equipment Loadout</span>
                </div>

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
                            onClick={() => navigate(card.route)}
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
        </SceneShell>
    );
};
