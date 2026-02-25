import { NavLink } from 'react-router-dom';
import { House, CheckSquare, Cat, BarChart2, Settings, BookOpen, Swords, Dumbbell, Calendar, Crown, Shield, Heart, MapPin, User, Store } from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
    { icon: House, label: 'Room', path: '/' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: Store, label: 'Market', path: '/marketplace' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: Swords, label: 'Arena', path: '/arena' },
    { icon: Crown, label: 'Conquest', path: '/conquest' },
    { icon: User, label: 'Character', path: '/character' },
    { icon: BookOpen, label: 'Library', path: '/library' },
    { icon: Dumbbell, label: 'Gym', path: '/gym' },
    { icon: Heart, label: 'Health', path: '/health' },
    { icon: MapPin, label: 'Town', path: '/town' },
    { icon: Cat, label: 'Pet', path: '/pet' },
    { icon: BarChart2, label: 'Stats', path: '/stats' },
    { icon: Shield, label: 'Security', path: '/security' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Sidebar = () => {
    return (
        <aside className="sidebar">
            <div className="logo-area">
                <div className="logo-icon">GL</div>
                <span className="logo-text">Tony's Habit RPG</span>
            </div>

            <nav className="nav-menu">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={20} />
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};
