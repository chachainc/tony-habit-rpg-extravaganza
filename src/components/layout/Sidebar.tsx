import { NavLink } from 'react-router-dom';
import { Home, House, CheckSquare, Cat, BarChart2, Settings, BookOpen, Swords, Dumbbell, Calendar, Crown, Shield, Heart } from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
    { icon: Home, label: 'Town', path: '/' },
    { icon: House, label: 'Home', path: '/home' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: BookOpen, label: 'Library', path: '/library' },
    { icon: Swords, label: 'Arena', path: '/arena' },
    { icon: Crown, label: 'Conquest', path: '/conquest' },
    { icon: Dumbbell, label: 'Gym', path: '/gym' },
    { icon: Heart, label: 'Health', path: '/health' },
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
