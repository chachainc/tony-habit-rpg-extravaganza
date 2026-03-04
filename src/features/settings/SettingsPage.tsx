import { motion } from 'framer-motion';
import { Settings, Shield, Lock, Eye, Server, AlertTriangle, KeyRound, Database, Globe, Download, Upload } from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore';
import './SettingsPage.css';

export const SettingsPage = () => {
    const { profileName, shareCode, exportSave, importSave } = useProfileStore();

    const handleExport = () => {
        exportSave();
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const json = ev.target?.result as string;
                if (json) importSave(json);
            };
            reader.readAsText(file);
        };
        input.click();
    };

    return (
        <div className="settings-page">
            <div className="settings-bg">
                <div className="settings-bg__gradient" />
            </div>

            <div className="settings-content">
                <motion.div
                    className="settings-header"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Settings size={36} className="settings-icon" />
                    <h1>Settings</h1>
                </motion.div>

                {/* Profile Section */}
                <motion.section
                    className="settings-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                >
                    <h2>👤 Profile</h2>
                    <div className="settings-profile-row">
                        <span className="settings-label">Display Name</span>
                        <span className="settings-value">{profileName}</span>
                    </div>
                    {shareCode && (
                        <div className="settings-profile-row">
                            <span className="settings-label">Share Code</span>
                            <span className="settings-value settings-value--code">{shareCode.slice(0, 8)}...{shareCode.slice(-4)}</span>
                        </div>
                    )}
                </motion.section>

                {/* Data Management */}
                <motion.section
                    className="settings-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h2>💾 Data Management</h2>
                    <div className="settings-actions-row">
                        <button className="settings-action-btn" onClick={handleExport}>
                            <Download size={18} />
                            Export Save
                        </button>
                        <button className="settings-action-btn" onClick={handleImport}>
                            <Upload size={18} />
                            Import Save
                        </button>
                    </div>
                </motion.section>

                {/* Security Section */}
                <motion.div
                    className="settings-security-divider"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                >
                    <Shield size={20} />
                    <h2>Security & Privacy</h2>
                    <p className="settings-security-sub">How your data is protected</p>
                </motion.div>

                <motion.section
                    className="settings-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="section-icon-row">
                        <KeyRound size={20} />
                        <h3>How Profiles Work</h3>
                    </div>
                    <p>Each player has a unique <strong>share code</strong> — a long string of random characters that acts as both your username and password.</p>
                    <p>Only someone who knows your exact code can access your profile. There is no other way to log in — no email, no password reset, no recovery options.</p>
                </motion.section>

                <motion.section
                    className="settings-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <div className="section-icon-row">
                        <Lock size={20} />
                        <h3>Why Your Code Is Secure</h3>
                    </div>
                    <p>Your share code is generated using <strong>cryptographic randomness</strong>.</p>
                    <ul className="security-list">
                        <li>Each code is <strong>256 bits</strong> of randomness (64 characters)</li>
                        <li>More possible codes than atoms in the observable universe</li>
                        <li>There is <strong>no way to search or list</strong> existing profiles</li>
                        <li>Guessing a valid code is effectively impossible</li>
                    </ul>
                </motion.section>

                <motion.section
                    className="settings-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="section-icon-row">
                        <Database size={20} />
                        <h3>What We Store</h3>
                    </div>
                    <p>We only store your game progress: stats, inventory, quests, calendar, and streaks.</p>
                    <p>No personal information of any kind is required to play.</p>
                </motion.section>

                <motion.section
                    className="settings-section settings-section--highlight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <div className="section-icon-row">
                        <Eye size={20} />
                        <h3>What We Do NOT Collect</h3>
                    </div>
                    <div className="no-collect-grid">
                        <div className="no-collect-item">🚫 No email</div>
                        <div className="no-collect-item">🚫 No phone</div>
                        <div className="no-collect-item">🚫 No real name</div>
                        <div className="no-collect-item">🚫 No tracking</div>
                        <div className="no-collect-item">🚫 No location</div>
                        <div className="no-collect-item">🚫 No data selling</div>
                    </div>
                </motion.section>

                <motion.section
                    className="settings-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="section-icon-row">
                        <Server size={20} />
                        <h3>Server Protections</h3>
                    </div>
                    <ul className="security-list">
                        <li><strong>Encrypted traffic</strong> — HTTPS protects from eavesdropping</li>
                        <li><strong>Rate limiting</strong> — blocks rapid guess attempts</li>
                        <li><strong>Server-side validation</strong> — prevents tampering</li>
                        <li><strong>Automatic lockout</strong> — temporary blocks after invalid attempts</li>
                    </ul>
                </motion.section>

                <motion.section
                    className="settings-section settings-section--warning"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                >
                    <div className="section-icon-row">
                        <AlertTriangle size={20} />
                        <h3>Risk Assessment</h3>
                    </div>
                    <p>The most likely risk is <strong>loss of game progress</strong> if you lose your code. This game does not handle financial or personal data.</p>
                    <p className="security-reassure">Protect your share code like a password and your profile will stay safe.</p>
                </motion.section>

                <motion.section
                    className="settings-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="section-icon-row">
                        <Globe size={20} />
                        <h3>How To Protect Your Profile</h3>
                    </div>
                    <ol className="security-steps">
                        <li><strong>Never share your code publicly.</strong></li>
                        <li><strong>Save your code somewhere safe.</strong></li>
                        <li><strong>Use the export feature for backups.</strong></li>
                        <li><strong>Contact the host if something seems wrong.</strong></li>
                    </ol>
                </motion.section>
            </div>
        </div>
    );
};
