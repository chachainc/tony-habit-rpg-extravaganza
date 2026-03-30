import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useBlackjackStore, handValue, type Card } from '../../store/useBlackjackStore';
import './Blackjack.css';

const SUIT_COLORS: Record<string, string> = {
    '♠': '#e2e8f0', '♣': '#e2e8f0', '♥': '#ef4444', '♦': '#ef4444',
};

const CardDisplay = ({ card, hidden = false }: { card: Card; hidden?: boolean }) => (
    <motion.div
        className={`bj-card ${hidden ? 'hidden' : ''}`}
        initial={{ rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
    >
        {hidden ? (
            <div className="bj-card-back">?</div>
        ) : (
            <>
                <span className="bj-card-rank">{card.rank}</span>
                <span className="bj-card-suit" style={{ color: SUIT_COLORS[card.suit] }}>{card.suit}</span>
            </>
        )}
    </motion.div>
);

export const Blackjack = ({ onClose }: { onClose: () => void }) => {
    const bj = useBlackjackStore();
    const [betAmount, setBetAmount] = useState(10);

    // Auto-reset daily on open
    useEffect(() => { bj.resetDaily(); }, []);

    const showDealerFull = bj.phase === 'result';
    const playerVal = handValue(bj.playerHand);
    const dealerVal = showDealerFull ? handValue(bj.dealerHand) : (bj.dealerHand.length > 0 ? bj.dealerHand[0].value : 0);

    return (
        <motion.div
            className="bj-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
            <div className="bj-container">
                <div className="bj-header">
                    <h2>🃏 Blackjack</h2>
                    <div className="bj-coins">🎰 {bj.casinoCoins} coins</div>
                    <button className="bj-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="bj-info-row">
                    <span>Daily Winnings: {bj.dailyWinnings}/500</span>
                    <span>Hands: {bj.totalHands} | Wins: {bj.totalWins}</span>
                </div>

                {/* ── Idle: Bet Selection ── */}
                {bj.phase === 'idle' && (
                    <div className="bj-bet-section">
                        <div className="bj-bet-label">Place Your Bet</div>
                        <div className="bj-bet-buttons">
                            {[5, 10, 25].map(amt => (
                                <button
                                    key={amt}
                                    className={`bj-bet-btn ${betAmount === amt ? 'selected' : ''}`}
                                    onClick={() => setBetAmount(amt)}
                                    disabled={amt > bj.casinoCoins}
                                >
                                    {amt}
                                </button>
                            ))}
                        </div>
                        <button
                            className="bj-deal-btn"
                            onClick={() => bj.placeBet(betAmount)}
                            disabled={!bj.canPlay() || betAmount > bj.casinoCoins}
                        >
                            Deal
                        </button>
                        {!bj.canPlay() && (
                            <div className="bj-limit-msg">Daily limit reached or out of coins!</div>
                        )}
                        <div className="bj-rules-note">
                            Casino coins only — no gold spent. 50 coins/day. Max 500 winnings/day.
                        </div>
                    </div>
                )}

                {/* ── Playing / Result ── */}
                {(bj.phase === 'playing' || bj.phase === 'result') && (
                    <div className="bj-table">
                        {/* Dealer */}
                        <div className="bj-hand-section">
                            <div className="bj-hand-label">
                                Dealer {showDealerFull ? `(${dealerVal})` : ''}
                            </div>
                            <div className="bj-hand">
                                {bj.dealerHand.map((card, i) => (
                                    <CardDisplay key={i} card={card} hidden={!showDealerFull && i === 1} />
                                ))}
                            </div>
                        </div>

                        <div className="bj-divider" />

                        {/* Player */}
                        <div className="bj-hand-section">
                            <div className="bj-hand-label">You ({playerVal})</div>
                            <div className="bj-hand">
                                {bj.playerHand.map((card, i) => (
                                    <CardDisplay key={i} card={card} />
                                ))}
                            </div>
                        </div>

                        {/* Bet display */}
                        <div className="bj-current-bet">Bet: {bj.currentBet} coins</div>

                        {/* Actions */}
                        {bj.phase === 'playing' && (
                            <div className="bj-actions">
                                <button className="bj-action-btn hit" onClick={bj.hit}>Hit</button>
                                <button className="bj-action-btn stand" onClick={bj.stand}>Stand</button>
                                {bj.playerHand.length === 2 && bj.currentBet <= bj.casinoCoins && (
                                    <button className="bj-action-btn double" onClick={bj.doubleDown}>Double</button>
                                )}
                            </div>
                        )}

                        {/* Result */}
                        {bj.phase === 'result' && (
                            <motion.div
                                className={`bj-result ${bj.result}`}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                            >
                                <div className="bj-result-text">{bj.message}</div>
                                <button className="bj-new-hand" onClick={bj.newHand}>New Hand</button>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};
