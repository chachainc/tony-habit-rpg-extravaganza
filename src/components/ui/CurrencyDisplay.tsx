import { Coins, Ticket, Diamond, Heart, Sword, Shield } from 'lucide-react';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useGameStore } from '../../store/useGameStore';
import { useDayStore } from '../../store/useDayStore';
import { useRoomStore } from '../../store/useRoomStore';
import './CurrencyDisplay.css';

interface Props {
    compact?: boolean;
}

export const CurrencyDisplay = ({ compact = false }: Props) => {
    const { gold, tickets, diamonds } = useCurrencyStore();
    const { getAttack, getDefense } = useGameStore();
    const { playerCurrentHP, playerMaxHP } = useDayStore();
    const roomBonuses = useRoomStore((s) => s.getRoomCombatBonuses());
    const effectiveMaxHP = playerMaxHP + roomBonuses.maxHP;

    const attack = getAttack();
    const defense = getDefense();
    const hpPercent = Math.round((playerCurrentHP / effectiveMaxHP) * 100);

    if (compact) {
        return (
            <div className="currency-display currency-display--compact">
                {/* Combat Stats */}
                <div className="stat-group stat-group--combat">
                    <div className="currency-item stat-item--hp">
                        <Heart size={18} className="currency-icon currency-icon--hp" />
                        <span className="currency-value">{playerCurrentHP}/{playerMaxHP}</span>
                    </div>
                    <div className="currency-item">
                        <Sword size={18} className="currency-icon currency-icon--attack" />
                        <span className="currency-value">{attack}</span>
                    </div>
                    <div className="currency-item">
                        <Shield size={18} className="currency-icon currency-icon--defense" />
                        <span className="currency-value">{defense}</span>
                    </div>
                </div>

                <div className="stat-divider" />

                {/* Currency */}
                <div className="stat-group stat-group--currency">
                    <div className="currency-item">
                        <Coins size={18} className="currency-icon currency-icon--gold" />
                        <span className="currency-value">{gold.toLocaleString()}</span>
                    </div>
                    <div className="currency-item">
                        <Ticket size={18} className="currency-icon currency-icon--tickets" />
                        <span className="currency-value">{tickets}</span>
                    </div>
                    <div className="currency-item">
                        <Diamond size={18} className="currency-icon currency-icon--diamonds" />
                        <span className="currency-value">{diamonds}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="currency-display">
            {/* Combat Stats */}
            <div className="stat-group stat-group--combat">
                <div className="currency-item currency-item--large stat-item--hp">
                    <Heart size={24} className="currency-icon currency-icon--hp" />
                    <div className="currency-info">
                        <span className="currency-label">HP</span>
                        <span className="currency-value">
                            {playerCurrentHP}/{effectiveMaxHP}
                            <span className="hp-percent">({hpPercent}%)</span>
                        </span>
                    </div>
                </div>
                <div className="currency-item currency-item--large">
                    <Sword size={24} className="currency-icon currency-icon--attack" />
                    <div className="currency-info">
                        <span className="currency-label">Attack</span>
                        <span className="currency-value">{attack}</span>
                    </div>
                </div>
                <div className="currency-item currency-item--large">
                    <Shield size={24} className="currency-icon currency-icon--defense" />
                    <div className="currency-info">
                        <span className="currency-label">Defense</span>
                        <span className="currency-value">{defense}</span>
                    </div>
                </div>
            </div>

            <div className="stat-divider stat-divider--vertical" />

            {/* Currency */}
            <div className="stat-group stat-group--currency">
                <div className="currency-item currency-item--large">
                    <Coins size={24} className="currency-icon currency-icon--gold" />
                    <div className="currency-info">
                        <span className="currency-label">Gold</span>
                        <span className="currency-value">{gold.toLocaleString()}</span>
                    </div>
                </div>
                <div className="currency-item currency-item--large">
                    <Ticket size={24} className="currency-icon currency-icon--tickets" />
                    <div className="currency-info">
                        <span className="currency-label">Tickets</span>
                        <span className="currency-value">{tickets}</span>
                    </div>
                </div>
                <div className="currency-item currency-item--large">
                    <Diamond size={24} className="currency-icon currency-icon--diamonds" />
                    <div className="currency-info">
                        <span className="currency-label">Diamonds</span>
                        <span className="currency-value">{diamonds}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

