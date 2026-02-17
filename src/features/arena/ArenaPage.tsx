import { useNavigate } from 'react-router-dom';
import { Arena } from './Arena';

export const ArenaPage = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-base)',
            zIndex: 100,
        }}>
            <Arena onClose={() => navigate('/')} />
        </div>
    );
};
