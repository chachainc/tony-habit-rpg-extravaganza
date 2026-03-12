/**
 * SafeModeShell — Minimal diagnostic component rendered when ?safe=1 is in the URL.
 * Uses only inline styles so it cannot be broken by CSS issues.
 */
export const SafeModeShell = () => {
    const bootErrors = (window as any).__bootErrors || [];
    const bootLog = (window as any).__bootLog || [];
    const ua = navigator.userAgent;

    const handleClearData = () => {
        try {
            localStorage.clear();
        } catch { /* ignore */ }
        window.location.href = window.location.origin + window.location.pathname;
    };

    const handleReloadNormal = () => {
        window.location.href = window.location.origin + window.location.pathname;
    };

    const handleUnregisterSW = async () => {
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(r => r.unregister()));
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
                alert('Service workers unregistered and caches cleared.');
            } else {
                alert('No service worker support detected.');
            }
        } catch (e) {
            alert('Error: ' + String(e));
        }
    };

    const containerStyle: React.CSSProperties = {
        position: 'fixed', inset: 0, zIndex: 999999,
        background: '#111', color: '#e5e5e5',
        fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        padding: '24px', overflow: 'auto',
        fontSize: '14px', lineHeight: '1.6',
    };

    const btnStyle: React.CSSProperties = {
        padding: '10px 20px', margin: '6px',
        border: '1px solid #444', borderRadius: '8px',
        background: '#222', color: '#e5e5e5',
        fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    };

    const dangerBtnStyle: React.CSSProperties = {
        ...btnStyle, background: '#7f1d1d', borderColor: '#991b1b',
    };

    return (
        <div style={containerStyle}>
            <h1 style={{ fontSize: '22px', color: '#f2a63a', marginBottom: '12px' }}>
                🛡️ Safe Mode
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                The app loaded in diagnostic mode. No stores, animations, or heavy features are active.
            </p>

            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Actions</h2>
                <button style={btnStyle} onClick={handleReloadNormal}>
                    Reload Normally
                </button>
                <button style={btnStyle} onClick={handleUnregisterSW}>
                    Clear Service Workers
                </button>
                <button style={dangerBtnStyle} onClick={handleClearData}>
                    ⚠️ Clear All Local Data & Reload
                </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Browser Info</h2>
                <pre style={{
                    background: '#1a1a1a', padding: '12px', borderRadius: '8px',
                    fontSize: '11px', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                    color: '#9ca3af', maxHeight: '120px', overflow: 'auto',
                }}>{ua}</pre>
            </div>

            {bootErrors.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '16px', color: '#fca5a5', marginBottom: '8px' }}>
                        Boot Errors ({bootErrors.length})
                    </h2>
                    {bootErrors.map((err: any, i: number) => (
                        <pre key={i} style={{
                            background: '#1a0000', padding: '10px', borderRadius: '6px',
                            fontSize: '11px', color: '#fca5a5', marginBottom: '6px',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                            {err.msg}{err.src ? `\n  at ${err.src}:${err.line}:${err.col}` : ''}
                            {err.err ? `\n  ${err.err}` : ''}
                        </pre>
                    ))}
                </div>
            )}

            {bootLog.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Boot Log</h2>
                    <div style={{
                        background: '#1a1a1a', padding: '10px', borderRadius: '8px',
                        fontSize: '11px', color: '#9ca3af', maxHeight: '200px', overflow: 'auto',
                    }}>
                        {bootLog.map((entry: any, i: number) => (
                            <div key={i}>[{entry.t}] {entry.m}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
