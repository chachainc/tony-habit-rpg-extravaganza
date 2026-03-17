import { NavLink } from 'react-router-dom';
import { House, CheckSquare, BarChart2, Settings, Swords, User, Store, DollarSign } from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
    { icon: House, label: 'Room', path: '/room' },
    { icon: CheckSquare, label: 'Tasks', path: '/' },
    { icon: Store, label: 'Market', path: '/marketplace' },
    { icon: DollarSign, label: 'Budget', path: '/budget' },
    { icon: Swords, label: 'Combat', path: '/combat' },
    { icon: User, label: 'Character', path: '/character' },
    { icon: BarChart2, label: 'Stats', path: '/stats' },
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
