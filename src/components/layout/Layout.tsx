import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import './Layout.css';

export const Layout = () => {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-wrapper">
                <TopBar />
                <main className="content-area">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
