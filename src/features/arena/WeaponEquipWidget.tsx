// WeaponEquipWidget — small floating badge showing the equipped XP weapon.
// Placed next to the pet icon in Arena and on the Battle Prep screen.

import { useXpWeaponStore } from '../../store/useXpWeaponStore';
import './WeaponEquipWidget.css';

interface Props {
    size?: 'sm' | 'md';
}

export const WeaponEquipWidget = ({ size = 'md' }: Props) => {
    const { getEquippedWeapon } = useXpWeaponStore();
    const weapon = getEquippedWeapon();
    if (!weapon) return null;

    return (
        <div className={`weapon-widget weapon-widget--${size}`} title={`${weapon.name}: ${weapon.effect}`}>
            <span className="weapon-widget__icon">{weapon.icon}</span>
            {size === 'md' && (
                <div className="weapon-widget__tooltip">
                    <strong>{weapon.name}</strong>
                    <span>{weapon.effect}</span>
                </div>
            )}
        </div>
    );
};
