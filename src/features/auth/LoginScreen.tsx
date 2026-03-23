import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Copy, Check, LogIn, UserPlus, AlertTriangle } from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore';
import './LoginScreen.css';

export const LoginScreen = () => {
    const { createProfile, login, lastSyncError } = useProfileStore();
    const [mode, setMode] = useState<'choose' | 'create' | 'login' | 'created'>('choose');
    const [name, setName] = useState('');
    const [codeInput, setCodeInput] = useState('');
    const [newCode, setNewCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleCreate = async () => {
        setLoading(true);
        setError('');
        const code = await createProfile(name || undefined);
        setLoading(false);

        if (code) {
            setNewCode(code);
            setMode('created');
        } else {
            setError(lastSyncError || 'Failed to create profile. Is the server running?');
        }
    };

    const handleLogin = async () => {
        if (codeInput.trim().length < 43) {
            setError('Code must be at least 43 characters long.');
            return;
        }
        setLoading(true);
        setError('');
        const success = await login(codeInput);
        setLoading(false);

        if (!success) {
            setError(lastSyncError || 'Invalid share code.');
        }
        // If successful, page will reload via the store
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(newCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = newCode;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleContinue = () => {
        window.location.reload();
    };

    return (
        <div className="login-screen">
            {/* Background video — bottom 50% of screen, loops silently */}
            <video
                className="login-bg-video"
                autoPlay
                loop
                muted
                playsInline
                ref={(el) => { if (el) el.defaultMuted = true; }}
            >
                <source src="/videos/Cow_warrior_slicing_202603171609.mp4" type="video/mp4" />
            </video>

            <motion.div
                className="login-card"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="login-header">
                    <Shield size={42} className="login-icon" />
                    <h1>Tony's Habit RPG</h1>
                    <p className="login-subtitle">Your journey begins with a secure profile</p>
                </div>

                {mode === 'choose' && (
                    <motion.div
                        className="login-options"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <button
                            className="login-btn login-btn--create"
                            onClick={() => setMode('create')}
                        >
                            <UserPlus size={20} />
                            <span>Create New Profile</span>
                        </button>
                        <button
                            className="login-btn login-btn--login"
                            onClick={() => { setMode('login'); setTimeout(() => inputRef.current?.focus(), 100); }}
                        >
                            <LogIn size={20} />
                            <span>Enter Share Code</span>
                        </button>
                    </motion.div>
                )}

                {mode === 'create' && (
                    <motion.div
                        className="login-form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <label>
                            <span>Character Name (optional)</span>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Hero"
                                maxLength={50}
                                autoFocus
                            />
                        </label>
                        <div className="login-actions">
                            <button className="login-btn login-btn--back" onClick={() => setMode('choose')}>
                                Back
                            </button>
                            <button
                                className="login-btn login-btn--create"
                                onClick={handleCreate}
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Profile'}
                            </button>
                        </div>
                    </motion.div>
                )}

                {mode === 'login' && (
                    <motion.div
                        className="login-form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <label>
                            <span>Your Share Code</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={codeInput}
                                onChange={e => setCodeInput(e.target.value.trim())}
                                placeholder="Paste your 64-character code..."
                                className="code-input"
                                spellCheck={false}
                                autoComplete="off"
                            />
                        </label>
                        <div className="login-actions">
                            <button className="login-btn login-btn--back" onClick={() => setMode('choose')}>
                                Back
                            </button>
                            <button
                                className="login-btn login-btn--login"
                                onClick={handleLogin}
                                disabled={loading || codeInput.length < 43}
                            >
                                {loading ? 'Loading...' : 'Login'}
                            </button>
                        </div>
                    </motion.div>
                )}

                {mode === 'created' && (
                    <motion.div
                        className="login-created"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="code-warning">
                            <AlertTriangle size={18} />
                            <strong>Save this code! It is your password.</strong>
                        </div>
                        <div className="code-display">
                            <code>{newCode}</code>
                            <button className="copy-btn" onClick={handleCopy}>
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <p className="code-hint">
                            This code is the only way to access your profile.
                            Save it in a password manager or write it down.
                        </p>
                        <button
                            className="login-btn login-btn--create login-btn--continue"
                            onClick={handleContinue}
                        >
                            I've Saved My Code — Continue
                        </button>
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        className="login-error"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <AlertTriangle size={16} />
                        {error}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};
