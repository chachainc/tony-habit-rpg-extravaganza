import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Server, AlertTriangle, KeyRound, Database, Globe } from 'lucide-react';
import './SecurityPage.css';

export const SecurityPage = () => {
    return (
        <div className="security-page">
            <motion.div
                className="security-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Shield size={40} className="security-icon" />
                <h1>Security & Privacy</h1>
                <p className="security-subtitle">How your data is protected</p>
            </motion.div>

            {/* How Profiles Work */}
            <motion.section
                className="security-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="section-icon-row">
                    <KeyRound size={24} />
                    <h2>How Profiles Work</h2>
                </div>
                <p>
                    Each player has a unique <strong>share code</strong> — a long string of random characters
                    that acts as both your username and password.
                </p>
                <p>
                    Only someone who knows your exact code can access your profile.
                    There is no other way to log in — no email, no password reset, no recovery options.
                </p>
                <p>
                    Think of your share code like a key to your personal vault.
                    Keep it safe and you keep your game safe.
                </p>
            </motion.section>

            {/* Why The Code Is Secure */}
            <motion.section
                className="security-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <div className="section-icon-row">
                    <Lock size={24} />
                    <h2>Why Your Code Is Secure</h2>
                </div>
                <p>
                    Your share code is generated using <strong>cryptographic randomness</strong> — the same
                    kind of randomness used by banks and secure websites.
                </p>
                <ul className="security-list">
                    <li>Each code is <strong>256 bits</strong> of randomness (64 characters)</li>
                    <li>There are more possible codes than atoms in the observable universe</li>
                    <li>Codes are not sequential, not based on time, and not predictable</li>
                    <li>There is <strong>no way to search or list</strong> existing profiles</li>
                    <li>Guessing a valid code by chance is effectively impossible</li>
                </ul>
            </motion.section>

            {/* What We Store */}
            <motion.section
                className="security-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="section-icon-row">
                    <Database size={24} />
                    <h2>What We Store</h2>
                </div>
                <p>We only store your game progress:</p>
                <ul className="security-list">
                    <li>Stats and skill levels</li>
                    <li>Inventory and equipment</li>
                    <li>Quest and task progress</li>
                    <li>Conquest data, calendar, and daily login streaks</li>
                    <li>Your chosen character name (optional)</li>
                </ul>
                <p>Nothing else. No personal information of any kind is required to play.</p>
            </motion.section>

            {/* What We Do NOT Collect */}
            <motion.section
                className="security-section security-section--highlight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
            >
                <div className="section-icon-row">
                    <Eye size={24} />
                    <h2>What We Do NOT Collect</h2>
                </div>
                <div className="no-collect-grid">
                    <div className="no-collect-item">🚫 No email address</div>
                    <div className="no-collect-item">🚫 No phone number</div>
                    <div className="no-collect-item">🚫 No real name</div>
                    <div className="no-collect-item">🚫 No browser history</div>
                    <div className="no-collect-item">🚫 No file access</div>
                    <div className="no-collect-item">🚫 No location data</div>
                    <div className="no-collect-item">🚫 No cross-site tracking</div>
                    <div className="no-collect-item">🚫 No data selling to third parties</div>
                </div>
            </motion.section>

            {/* How The Server Protects Data */}
            <motion.section
                className="security-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="section-icon-row">
                    <Server size={24} />
                    <h2>How The Server Protects Data</h2>
                </div>
                <ul className="security-list">
                    <li><strong>Encrypted traffic</strong> — all data travels over HTTPS, protecting it from eavesdropping</li>
                    <li><strong>Rate limiting</strong> — the server blocks rapid repeated attempts to guess codes</li>
                    <li><strong>Server-side validation</strong> — the server checks all rewards and currency changes to prevent tampering</li>
                    <li><strong>No admin keys in the app</strong> — all sensitive credentials stay on the server, never in your browser</li>
                    <li><strong>Automatic lockout</strong> — repeated invalid code attempts trigger a temporary block</li>
                </ul>
            </motion.section>

            {/* Realistic Risk */}
            <motion.section
                className="security-section security-section--warning"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
            >
                <div className="section-icon-row">
                    <AlertTriangle size={24} />
                    <h2>Honest Risk Assessment</h2>
                </div>
                <p>
                    No system on the internet is 100% immune to every possible issue.
                    We want to be transparent:
                </p>
                <ul className="security-list">
                    <li>The most likely risk is <strong>loss of game progress</strong> — for example, if you lose your code or accidentally share it</li>
                    <li>This game does not handle financial data or sensitive personal information</li>
                    <li>The system is designed for <strong>safe private use among friends</strong></li>
                    <li>We have taken practical precautions appropriate for a small private game</li>
                </ul>
                <p className="security-reassure">
                    Protect your share code like a password and your profile will stay safe.
                </p>
            </motion.section>

            {/* How To Protect Yourself */}
            <motion.section
                className="security-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <div className="section-icon-row">
                    <Globe size={24} />
                    <h2>How To Protect Your Profile</h2>
                </div>
                <ol className="security-steps">
                    <li><strong>Never share your code publicly.</strong> Treat it like a password.</li>
                    <li><strong>Save your code somewhere safe.</strong> A password manager, a note, or a secure file.</li>
                    <li><strong>Use the export feature for backups.</strong> Download your save periodically.</li>
                    <li><strong>Contact the host if something seems wrong.</strong> We can help investigate.</li>
                </ol>
            </motion.section>
        </div>
    );
};
