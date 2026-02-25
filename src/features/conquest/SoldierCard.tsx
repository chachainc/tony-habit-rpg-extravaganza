import { memo } from 'react';
import { motion } from 'framer-motion';
import type { SoldierRole, Soldier } from '../../store/useConquestStore';
import scoutImg from '../../assets/soldiers/scout.png';
import moraleImg from '../../assets/soldiers/morale.png';
import siegeImg from '../../assets/soldiers/siege.png';
import healerImg from '../../assets/soldiers/healer.png';
import './SoldierCard.css';

interface SoldierCardProps {
    soldier?: Soldier; // If provided, shows owned soldier stats
    name?: string;     // For store preview
    role?: SoldierRole;// For store preview
    cost?: number;     // For store preview
    onAction?: () => void;
    actionLabel?: string;
    actionDisabled?: boolean;
    isStoreView?: boolean;
}

const ROLE_ICONS: Record<SoldierRole, string> = {
    scout: '🔭', morale: '📯', siege: '🏗️', healer: '💊',
};

const ROLE_IMAGES: Record<SoldierRole, string> = {
    scout: scoutImg,
    morale: moraleImg,
    siege: siegeImg,
    healer: healerImg,
};

const RANK_COLORS: Record<string, string> = {
    'Recruit': '#a78bfa',
    'Veteran': '#60a5fa',
    'Captain': '#3b82f6',
    'Elite Guard': '#ef4444',
    'Warden': '#f59e0b',
};

export const SoldierCard = memo(({
    soldier,
    name,
    role,
    cost,
    onAction,
    actionLabel,
    actionDisabled,
    isStoreView
}: SoldierCardProps) => {

    // Resolve display data
    const displayName = soldier?.name || name || 'Unknown Soldier';
    const displayRole = soldier?.role || role || 'scout';
    const displayRank = soldier?.rank || 'Recruit';
    const displayLevel = soldier?.level || 1;
    const displayAtk = soldier?.atk || 5;
    const displayDef = soldier?.def || 5;

    // Generate a deterministic but pseudo-random avatar based on the name length and role
    const avatarSeed = displayName.length + displayRole.charCodeAt(0);
    const avatarHues = [260, 200, 340, 40, 150];
    const baseHue = avatarHues[avatarSeed % avatarHues.length];

    return (
        <motion.div
            className={`soldier-card-comp ${isStoreView ? 'store-view' : 'army-view'}`}
            whileHover={{ y: -2 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <div className="soldier-card-header" style={{
                background: `linear-gradient(135deg, hsl(${baseHue}, 50%, 20%), hsl(${baseHue + 30}, 50%, 15%))`
            }}>
                <img src={ROLE_IMAGES[displayRole]} alt={displayRole} className="soldier-portrait" />
                <div className="soldier-role-badge">{ROLE_ICONS[displayRole]}</div>
                <div className="soldier-rank-pill" style={{ color: RANK_COLORS[displayRank], backgroundColor: `${RANK_COLORS[displayRank]}22` }}>
                    {displayRank}
                </div>
            </div>

            <div className="soldier-card-body">
                <h3 className="soldier-card-name">{displayName}</h3>
                <div className="soldier-card-role">{displayRole.charAt(0).toUpperCase() + displayRole.slice(1)}</div>

                <div className="soldier-card-stats">
                    <div className="stat-col">
                        <span className="stat-label">LVL</span>
                        <span className="stat-val">{displayLevel}</span>
                    </div>
                    <div className="stat-col">
                        <span className="stat-label">ATK</span>
                        <span className="stat-val">{displayAtk}</span>
                    </div>
                    <div className="stat-col">
                        <span className="stat-label">DEF</span>
                        <span className="stat-val">{displayDef}</span>
                    </div>
                </div>
            </div>

            {onAction && (
                <div className="soldier-card-footer">
                    <button
                        className={`soldier-action-btn ${isStoreView ? 'buy-btn' : 'upgrade-btn'}`}
                        onClick={onAction}
                        disabled={actionDisabled}
                    >
                        {actionLabel || (isStoreView ? `${cost} 🔱 Recruit` : 'Upgrade')}
                    </button>
                </div>
            )}
        </motion.div>
    );
});
