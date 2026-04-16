import React from 'react';
import { motion } from 'framer-motion';
import {
    ShoppingBag,
    ListTodo,
    Users,
    Dices,
    Calendar,
    Award
} from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
import { Particles } from '../../components/vfx/Particles';
import { useGameStore } from '../../store/useGameStore';
import { Hourglass } from 'lucide-react';
import './TownHub.css';

interface Building {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    color: string;
    onClick: () => void;
    locked?: boolean;
    notification?: boolean;
}

interface TownHubProps {
    onNavigate: (page: string) => void;
}

export const TownHub: React.FC<TownHubProps> = ({ onNavigate }) => {
    const { getGlobalLevel } = useGameStore();
    const level = getGlobalLevel();

    const buildings: Building[] = [
        {
            id: 'tasks',
            name: 'Task Board',
            icon: <ListTodo size={40} />,
            description: 'Daily quests and challenges',
            color: '#3b82f6',
            onClick: () => onNavigate('tasks'),
            notification: true,
        },
        {
            id: 'arena',
            name: 'Battle Arena',
            icon: <img src="/assets/arena-icon.jpg" alt="Arena" className="building-card__image-icon" />,
            description: 'Fight abstract enemies',
            color: '#ef4444',
            onClick: () => onNavigate('arena'),
        },
        {
            id: 'marketplace',
            name: 'Marketplace',
            icon: <ShoppingBag size={40} />,
            description: 'Walk around and visit 5 stores',
            color: '#f59e0b',
            onClick: () => onNavigate('marketplace'),
        },
        {
            id: 'focus',
            name: 'Focus Room',
            icon: <Hourglass size={40} />,
            description: 'Free the tortoise through focused time',
            color: '#10b981',
            onClick: () => onNavigate('focus'),
            notification: false,
        },

        {
            id: 'social',
            name: 'Social Hub',
            icon: <Users size={40} />,
            description: 'Pets and companions',
            color: '#a855f7',
            onClick: () => onNavigate('social'),
        },
        {
            id: 'monopoly',
            name: 'Daily Board',
            icon: <Dices size={40} />,
            description: 'Roll for rewards',
            color: '#06b6d4',
            onClick: () => onNavigate('monopoly'),
            notification: true,
        },
        {
            id: 'checkin',
            name: 'Daily Login',
            icon: <Calendar size={40} />,
            description: 'Claim streak rewards',
            color: '#ec4899',
            onClick: () => onNavigate('checkin'),
            notification: true,
        },
        {
            id: 'monthly-calendar',
            name: 'Monthly Calendar',
            icon: <Calendar size={40} />,
            description: '28-day check-in rewards',
            color: '#14b8a6',
            onClick: () => onNavigate('monthly-calendar'),
            notification: false,
        },
        {
            id: 'achievements',
            name: 'Achievements',
            icon: <Award size={40} />,
            description: 'Track your milestones',
            color: '#8b5cf6',
            onClick: () => onNavigate('achievements'),
            locked: level < 5,
        },
    ];

    return (
        <div className="town-hub">
            {/* Parallax Background Layers */}
            <div className="town-hub__bg">
                <motion.div
                    className="town-hub__bg-layer town-hub__bg-layer--1"
                    animate={{ x: [0, -20, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                    className="town-hub__bg-layer town-hub__bg-layer--2"
                    animate={{ x: [0, -30, 0] }}
                    transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                    className="town-hub__bg-layer town-hub__bg-layer--3"
                    animate={{ x: [0, -40, 0] }}
                    transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                />

                <Particles count={60} color="rgba(100, 150, 255, 0.4)" speed={0.5} />
                <div className="town-hub__vignette" />
            </div>

            {/* Content */}
            <div className="town-hub__content">
                <div className="town-hub__header">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        Welcome to Your Town
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="town-hub__subtitle"
                    >
                        Level {level} · Choose your destination
                    </motion.p>
                </div>

                {/* Building Grid */}
                <div className="town-hub__buildings">
                    {buildings.map((building, index) => (
                        <motion.div
                            key={building.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                                duration: 0.3,
                                delay: index * 0.05,
                            }}
                        >
                            <Panel
                                variant="glass"
                                onClick={building.locked ? undefined : building.onClick}
                                className={`building-card ${building.locked ? 'building-card--locked' : ''}`}
                            >
                                <div
                                    className="building-card__glow"
                                    style={{ backgroundColor: building.color }}
                                />

                                {building.notification && (
                                    <div className="building-card__notification" />
                                )}

                                {building.locked && (
                                    <div className="building-card__lock">
                                        <span>🔒</span>
                                        <span className="building-card__lock-text">Level 5</span>
                                    </div>
                                )}

                                <div
                                    className="building-card__icon"
                                    style={{ color: building.color }}
                                >
                                    {building.icon}
                                </div>

                                <h3 className="building-card__name">{building.name}</h3>
                                <p className="building-card__description">{building.description}</p>
                            </Panel>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
