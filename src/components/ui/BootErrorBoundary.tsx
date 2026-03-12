import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class BootErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[BOOT] Uncaught error causing BootErrorBoundary fallback:', error, errorInfo);
    }

    private handleClearStorage = () => {
        try {
            localStorage.clear();
            window.location.reload();
        } catch (e) {
            console.error('[BOOT] Failed to clear local storage:', e);
            window.location.reload();
        }
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    height: '100vh',
                    width: '100vw',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#111',
                    color: '#fff',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    padding: '24px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#ff6b6b' }}>
                        Startup issue detected
                    </h1>
                    <p style={{ marginBottom: '8px', color: '#ccc' }}>
                        Loading safe mode shell.
                    </p>
                    <p style={{ fontSize: '14px', marginBottom: '32px', color: '#888', maxWidth: '400px' }}>
                        If the normal app fails to load due to corrupted data, you can clear all local data here. Note: This will delete your local progress if not synced!
                    </p>
                    <button
                        onClick={this.handleClearStorage}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#e03131',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        Clear Local Data & Restart
                    </button>
                    {this.state.error && (
                        <pre style={{
                            marginTop: '32px',
                            padding: '16px',
                            backgroundColor: '#222',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#ff8787',
                            maxWidth: '100%',
                            overflow: 'auto',
                            textAlign: 'left'
                        }}>
                            {this.state.error.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
