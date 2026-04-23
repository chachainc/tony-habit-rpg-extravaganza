import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                        <Card className="error-card">
                            <h2 style={{ color: '#ef4444' }}>Something went wrong</h2>
                            <p>We're sorry, but the application encountered an error.</p>
                            <pre style={{
                                background: 'rgba(0,0,0,0.3)',
                                padding: '1rem',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '0.8rem',
                                marginTop: '1rem'
                            }}>
                                {this.state.error?.message}
                            </pre>
                            <div style={{ marginTop: '1rem', width: '100%' }}>
                                <Button
                                    variant="primary"
                                    onClick={() => window.location.reload()}
                                >
                                    Reload Application
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
