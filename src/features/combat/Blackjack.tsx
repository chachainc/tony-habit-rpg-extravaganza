import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hand, MousePointerClick, ChevronsUp, Settings, Lock } from 'lucide-react';
import { useBlackjackStore, handValue, type Card } from '../../store/useBlackjackStore';
import { DEALERS, TABLE_THEMES } from '../../data/blackjackContent';
import './Blackjack.css';

// ─── AUDIO HOOKS (SCAFFOLDED) ────────────────────────────────────────────────
const playCardFlipSound = () => { /* TODO: Hook up real SFX */ };
const playChipClickSound = () => { /* TODO: Hook up real SFX */ };
const playWinSound = () => { /* TODO: Hook up real SFX */ };
const playLossSound = () => { /* TODO: Hook up real SFX */ };

const SUIT_COLORS: Record<string, string> = {
    '♠': '#0f172a', '♣': '#0f172a', '♥': '#dc2626', '♦': '#dc2626',
};

const CardDisplay = ({ card, hidden = false, index, isDealer }: { card: Card; hidden?: boolean; index: number; isDealer: boolean }) => {
    // Determine entry direction
    const initialY = isDealer ? -40 : 40;
    
    return (
        <motion.div
            className={`bj-card ${hidden ? 'hidden' : ''}`}
            initial={{ y: initialY, x: 20, rotateY: 90, opacity: 0 }}
            animate={{ y: 0, x: 0, rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: index * 0.15, type: 'spring', stiffness: 200, damping: 20 }}
            onAnimationStart={() => {
                if (!hidden) playCardFlipSound();
            }}
        >
            {hidden ? (
                <div className="bj-card-back">
                    <div className="bj-card-pattern" />
                </div>
            ) : (
                <div className="bj-card-front" style={{ color: SUIT_COLORS[card.suit] }}>
                    <div className="bj-card-corner top-left">
                        <span className="bj-card-rank">{card.rank}</span>
                        <span className="bj-card-suit">{card.suit}</span>
                    </div>
                    <div className="bj-card-center-suit">{card.suit}</div>
                </div>
            )}
        </motion.div>
    );
};

const DealerAvatar = ({ phase, result, dealerId }: { phase: string, result: string | null, dealerId: string }) => {
    const dealerDef = DEALERS[dealerId as keyof typeof DEALERS] || DEALERS['classic_cow'];
    const [imgError, setImgError] = useState(false);
    
    // Re-check image if dealer changes
    useEffect(() => { setImgError(false); }, [dealerId]);
    
    // Determine expression
    let emoji = dealerDef.fallbackEmoji;
    let moodClass = 'neutral';
    
    if (phase === 'result') {
        if (result === 'win' || result === 'blackjack') {
            moodClass = 'annoyed';
        } else if (result === 'lose') {
            moodClass = 'smug';
        } else if (result === 'push') {
            moodClass = 'neutral';
        }
    }

    return (
        <div className="bj-dealer-avatar-wrapper">
            <div className={`bj-dealer-portrait ${moodClass}`}>
                {!imgError ? (
                    <>
                        <img 
                            src={dealerDef.imagePath} 
                            alt={dealerDef.name} 
                            className="bj-dealer-art"
                            onError={() => setImgError(true)}
                        />
                        <div className="bj-dealer-gradient" />
                    </>
                ) : (
                    <div className="bj-dealer-art-fallback" />
                )}
            </div>

            {imgError && (
                <div className="bj-dealer-emoji-fallback">
                    <div className="bj-dealer-emoji">{emoji}</div>
                    <div className="bj-dealer-nameplate">{dealerDef.name}</div>
                </div>
            )}
        </div>
    );
};

const BlackjackCustomizeModal = ({ onClose }: { onClose: () => void }) => {
    const bj = useBlackjackStore();
    return (
        <motion.div className="bj-customize-overlay" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
            <div className="bj-customize-modal">
                <div className="bj-customize-header">
                    <h3>VIP Lounge</h3>
                    <button onClick={onClose} className="bj-close"><X size={20} /></button>
                </div>
                <div className="bj-customize-content">
                    <p className="bj-customize-note">Custom dealers, themed tables, and boss challenges will appear here in future updates.</p>
                    
                    <div className="bj-stats-preview">
                        <div className="bj-stat">
                            <span className="label">Win Streak</span>
                            <span className="value">{bj.highestWinStreak}</span>
                        </div>
                        <div className="bj-stat">
                            <span className="label">Total Blackjacks</span>
                            <span className="value">{bj.totalBlackjacks}</span>
                        </div>
                    </div>

                    <div className="bj-customize-grid">
                        <div className="bj-customize-card disabled">
                            <Lock size={20} />
                            <span>Select Dealer</span>
                        </div>
                        <div className="bj-customize-card disabled">
                            <Lock size={20} />
                            <span>Select Table</span>
                        </div>
                        <div className="bj-customize-card boss disabled">
                            <Lock size={20} />
                            <span>Boss Challenge</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export const Blackjack = ({ onClose }: { onClose: () => void }) => {
    const bj = useBlackjackStore();
    const [betAmount, setBetAmount] = useState(10);
    const [showCustomize, setShowCustomize] = useState(false);
    const [showCashOutAmt, setShowCashOutAmt] = useState<number | null>(null);

    // Auto-reset daily on open
    useEffect(() => { bj.resetDaily(); }, []);

    // Play sounds on result change
    useEffect(() => {
        if (bj.phase === 'result') {
            if (bj.result === 'win' || bj.result === 'blackjack') playWinSound();
            else if (bj.result === 'lose') playLossSound();
        }
    }, [bj.phase, bj.result]);

    const showDealerFull = bj.phase === 'result';
    const playerVal = handValue(bj.playerHand);
    const dealerVal = showDealerFull ? handValue(bj.dealerHand) : (bj.dealerHand.length > 0 ? bj.dealerHand[0].value : 0);

    const themeDef = TABLE_THEMES[bj.selectedTheme] || TABLE_THEMES['classic_felt'];

    const handleBetClick = (amt: number) => {
        playChipClickSound();
        setBetAmount(amt);
    };

    return (
        <motion.div
            className="bj-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
            <div className="bj-casino-container">
                <div className="bj-table-surface" style={themeDef.cssVariables as any}>
                    
                    {/* Theme Particle Scaffolding */}
                    {themeDef.particleEffect && (
                        <div className={`bj-particles ${themeDef.particleEffect}`} />
                    )}

                    {/* Header Overlay */}
                    <div className="bj-header">
                        <h2>Blackjack {bj.currentWinStreak >= 3 && <span className="bj-streak">🔥{bj.currentWinStreak}</span>}</h2>
                        <div className="bj-header-actions">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {bj.phase === 'idle' && (
                                    <button className="bj-vip-btn" onClick={() => setShowCustomize(true)}><Settings size={14} /> VIP</button>
                                )}
                                <div className="bj-coins">
                                    <span className="bj-coin-icon">💰</span>
                                    {bj.casinoCoins}
                                </div>
                            </div>
                            <button className="bj-close" onClick={onClose}><X size={20} /></button>
                            
                            <div className="bj-cashout-wrapper">
                                <button
                                    className={`bj-cashout-btn ${bj.phase !== 'playing' ? 'disabled' : ''}`}
                                    onClick={() => {
                                        if (bj.phase !== 'playing') return;
                                        playChipClickSound();
                                        const refund = Math.floor(bj.currentBet / 2);
                                        if (refund > 0) {
                                            setShowCashOutAmt(refund);
                                            setTimeout(() => setShowCashOutAmt(null), 1500);
                                        }
                                        bj.cashOut();
                                    }}
                                    disabled={bj.phase !== 'playing'}
                                >
                                    CASH OUT
                                </button>
                                <AnimatePresence>
                                    {showCashOutAmt !== null && (
                                        <motion.div
                                            className="bj-cashout-floater"
                                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, y: -25, scale: 1 }}
                                            exit={{ opacity: 0, y: -35 }}
                                            transition={{ duration: 0.6 }}
                                        >
                                            +{showCashOutAmt} 💰
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    <div className="bj-table-content">
                        {/* ── Dealer Area ── */}
                        <div className="bj-dealer-area">
                            <DealerAvatar phase={bj.phase} result={bj.result} dealerId={bj.selectedDealer} />
                            
                            {(bj.phase === 'playing' || bj.phase === 'result') && (
                                <div className="bj-hand-container">
                                    <div className="bj-hand-label">
                                        Dealer {showDealerFull && <span className="bj-hand-val">{dealerVal}</span>}
                                    </div>
                                    <div className="bj-hand dealer-hand">
                                        <AnimatePresence>
                                            {bj.dealerHand.map((card, i) => (
                                                <CardDisplay key={`dealer-${i}-${card.rank}-${card.suit}`} card={card} hidden={!showDealerFull && i === 1} index={i} isDealer={true} />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Center Area / Results ── */}
                        <div className="bj-center-area">
                            {bj.phase === 'idle' && (
                                <div className="bj-table-branding">
                                    <h3 className="bj-table-logo">GAMIFIED CASINO</h3>
                                    <p className="bj-table-limits">MIN 5 | MAX 25</p>
                                    <p className="bj-table-rules">Blackjack Pays 3 to 2 &bull; Dealer must hit soft 17</p>
                                </div>
                            )}

                            {bj.phase === 'result' && (
                                <motion.div
                                    className={`bj-result-badge ${bj.result}`}
                                    initial={{ scale: 0.5, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                >
                                    <div className="bj-result-headline">
                                        {bj.result === 'blackjack' ? 'BLACKJACK!' :
                                         bj.result === 'win' ? 'YOU WIN!' :
                                         bj.result === 'push' ? 'PUSH' :
                                         bj.message.includes('Bust') ? 'BUST' : 'DEALER WINS'}
                                    </div>
                                    <div className="bj-result-msg">{bj.message}</div>
                                    <button 
                                        className="bj-premium-btn bj-new-hand" 
                                        onClick={() => { playChipClickSound(); bj.newHand(); }}
                                    >
                                        Drop New Hand
                                    </button>
                                </motion.div>
                            )}
                            
                            {(bj.phase === 'playing' || bj.phase === 'result') && (
                                <div className="bj-active-bet-chip">
                                    <div className="bj-chip active-chip">
                                        <div className="bj-chip-inner">{bj.currentBet}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Player Area ── */}
                        <div className="bj-player-area">
                            <div className="bj-hand-container player-hand-container">
                                {(bj.phase === 'playing' || bj.phase === 'result') && (
                                    <>
                                        <div className="bj-hand player-hand">
                                            <AnimatePresence>
                                                {bj.playerHand.map((card, i) => (
                                                    <CardDisplay key={`player-${i}-${card.rank}-${card.suit}`} card={card} index={i} isDealer={false} />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                        <div className="bj-hand-label">
                                            Player <span className="bj-hand-val">{playerVal}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Controls */}
                            {bj.phase === 'idle' && (
                                <div className="bj-bet-controls">
                                    <div className="bj-chip-rack">
                                        {[5, 10, 25].map(amt => (
                                            <button
                                                key={amt}
                                                className={`bj-chip ${betAmount === amt ? 'selected' : ''} ${amt > bj.casinoCoins ? 'disabled' : ''}`}
                                                onClick={() => handleBetClick(amt)}
                                                disabled={amt > bj.casinoCoins}
                                            >
                                                <div className="bj-chip-inner">{amt}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        className="bj-premium-btn bj-deal-btn"
                                        onClick={() => { playChipClickSound(); bj.placeBet(betAmount); }}
                                        disabled={!bj.canPlay() || betAmount > bj.casinoCoins}
                                    >
                                        DEAL
                                    </button>
                                    {!bj.canPlay() && (
                                        <div className="bj-limit-msg">Daily limit reached or out of coins!</div>
                                    )}
                                </div>
                            )}

                            {bj.phase === 'playing' && (
                                <div className="bj-action-controls">
                                    <button className="bj-action-btn action-hit" onClick={bj.hit}>
                                        <MousePointerClick size={16} /> HIT
                                    </button>
                                    <button className="bj-action-btn action-stand" onClick={bj.stand}>
                                        <Hand size={16} /> STAND
                                    </button>
                                    {bj.playerHand.length === 2 && bj.currentBet <= bj.casinoCoins && (
                                        <button className="bj-action-btn action-double" onClick={bj.doubleDown}>
                                            <ChevronsUp size={16} /> DOUBLE
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Bottom Info Footer */}
                    <div className="bj-footer-info">
                        <span>Daily Limit: {Math.max(0, 500 - bj.dailyWinnings)} left</span>
                        <span>Hands: {bj.totalHands} • Wins: {bj.totalWins}</span>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showCustomize && <BlackjackCustomizeModal onClose={() => setShowCustomize(false)} />}
            </AnimatePresence>
        </motion.div>
    );
};
