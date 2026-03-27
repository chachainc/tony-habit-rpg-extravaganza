import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, BookOpen, Dumbbell, Hammer, ArrowLeft } from 'lucide-react';
import './RoomLobby.css';

const ROOM_CARDS = [
    {
        id: '2d-room',
        icon: '🏠',
        lucideIcon: Home,
        title: '2D Room',
        subtitle: 'Your personal room with Garden, Cellar & Workshop',
        color: '#6366f1',
        gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(124, 58, 237, 0.2))',
        borderColor: 'rgba(99, 102, 241, 0.4)',
        route: '/room/2d',
    },
    {
        id: 'library',
        icon: '📚',
        lucideIcon: BookOpen,
        title: 'Library',
        subtitle: 'Track your reading progress & book collection',
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(234, 88, 12, 0.2))',
        borderColor: 'rgba(245, 158, 11, 0.4)',
        route: '/library',
    },
    {
        id: 'gym',
        icon: '💪',
        lucideIcon: Dumbbell,
        title: 'Body Station',
        subtitle: 'Health tracker, gym stats & body metrics',
        color: '#ef4444',
        gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        route: '/health',
    },
    {
        id: 'workshop',
        icon: '🔨',
        lucideIcon: Hammer,
        title: 'Workshop',
        subtitle: 'Craft items & manage your inventory',
        color: '#22c55e',
        gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(21, 128, 61, 0.2))',
        borderColor: 'rgba(34, 197, 94, 0.4)',
        route: '/room/2d',
    },
];

export const RoomLobby = ({ onClose }: { onClose: () => void }) => {
    const navigate = useNavigate();

    return (
        <div className="room-lobby">
            <div className="room-lobby__header">
                <button className="room-lobby__back" onClick={onClose}>
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1>Your Room</h1>
                    <p className="room-lobby__subtitle">Choose a zone to explore</p>
                </div>
            </div>

            <div className="room-lobby__grid">
                {ROOM_CARDS.map((card, i) => (
                    <motion.button
                        key={card.id}
                        className="room-lobby__card"
                        style={{
                            background: card.gradient,
                            borderColor: card.borderColor,
                        }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate(card.route)}
                    >
                        <div className="room-lobby__card-icon" style={{ color: card.color }}>
                            {card.icon}
                        </div>
                        <div className="room-lobby__card-info">
                            <h3 style={{ color: card.color }}>{card.title}</h3>
                            <p>{card.subtitle}</p>
                        </div>
                        <card.lucideIcon size={18} className="room-lobby__card-arrow" style={{ color: card.color }} />
                    </motion.button>
                ))}
            </div>
        </div>
    );
};
