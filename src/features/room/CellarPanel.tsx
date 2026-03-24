import { useState, useMemo } from 'react';
import { X, Lock, Unlock, ArrowLeftRight } from 'lucide-react';
import { useInventoryStore, ITEM_DB, type Rarity } from '../../store/useInventoryStore';
import { Panel } from '../../components/ui/Panel';
import './RoomPanels.css';

type FilterType = 'all' | 'weapon' | 'armor' | 'potion' | 'jewelry' | 'book' | 'other';
const RARITY_ORDER: Record<Rarity, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };

export const CellarPanel = ({ onClose }: { onClose: () => void }) => {
    const { items, stashedItems = [], toggleStash } = useInventoryStore();
    const [filter, setFilter] = useState<FilterType>('all');
    const [compareA, setCompareA] = useState<string | null>(null);
    const [compareB, setCompareB] = useState<string | null>(null);

    const ownedItems = useMemo(() => {
        return Object.entries(items)
            .filter(([id, count]) => count > 0 && ITEM_DB[id])
            .map(([id, count]) => ({ item: ITEM_DB[id], count }))
            .filter(({ item }) => {
                if (filter === 'all') return true;
                if (filter === 'other') return !['weapon', 'armor', 'potion', 'jewelry', 'book'].includes(item.type);
                return item.type === filter;
            })
            .sort((a, b) => (RARITY_ORDER[a.item.rarity] ?? 4) - (RARITY_ORDER[b.item.rarity] ?? 4));
    }, [items, filter]);

    const handleCompareToggle = (itemId: string) => {
        if (compareA === itemId) { setCompareA(null); return; }
        if (compareB === itemId) { setCompareB(null); return; }
        if (!compareA) { setCompareA(itemId); return; }
        if (!compareB) { setCompareB(itemId); return; }
        setCompareA(itemId);
        setCompareB(null);
    };

    const itemA = compareA ? ITEM_DB[compareA] : null;
    const itemB = compareB ? ITEM_DB[compareB] : null;
    const isStashed = (id: string) => (stashedItems ?? []).includes(id);

    return (
        <Panel variant="glass" className="room-panel cellar-panel">
            <div className="panel-header">
                <h2>📦 Cellar Vault</h2>
                <button className="panel-close-btn" onClick={onClose}><X size={24} /></button>
            </div>
            <p className="panel-subtitle">View, compare, and protect your items</p>

            {/* Stats bar */}
            <div className="cellar-stats-bar">
                <span className="cellar-stat">📦 {ownedItems.reduce((s, i) => s + i.count, 0)} items</span>
                <span className="cellar-stat">💰 {ownedItems.reduce((s, i) => s + (i.item.value ?? 0) * i.count, 0).toLocaleString()}g value</span>
                {(() => {
                    const rarityCounts: Record<string, number> = {};
                    ownedItems.forEach(({ item, count }) => { rarityCounts[item.rarity] = (rarityCounts[item.rarity] ?? 0) + count; });
                    return Object.entries(rarityCounts).map(([r, c]) => (
                        <span key={r} className={`cellar-stat rarity-${r}`}>
                            {r === 'legendary' ? '⭐' : r === 'epic' ? '💜' : r === 'rare' ? '💙' : '⬜'} {c}
                        </span>
                    ));
                })()}
            </div>

            {/* Filter tabs */}
            <div className="panel-tabs scrollable-tabs">
                {(['all', 'weapon', 'armor', 'potion', 'jewelry', 'book', 'other'] as FilterType[]).map(f => (
                    <button key={f} className={`panel-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                        {f === 'all' ? '📦 All' : f === 'weapon' ? '⚔️' : f === 'armor' ? '🛡️' : f === 'potion' ? '🧪' : f === 'jewelry' ? '💍' : f === 'book' ? '📚' : '🔮'}
                    </button>
                ))}
            </div>

            {/* Comparison strip */}
            {(itemA || itemB) && (
                <div className="cellar-compare-strip">
                    <div className="compare-slot">
                        {itemA ? (
                            <>
                                <span className="compare-icon">{itemA.icon}</span>
                                <div className="compare-stats">
                                    <strong>{itemA.name}</strong>
                                    <small>{itemA.type === 'weapon' ? `ATK ${itemA.value}` : itemA.type === 'armor' ? `DEF ${itemA.value}` : `Val ${itemA.value}`}</small>
                                    {itemA.critChance && <small>Crit {Math.round(itemA.critChance * 100)}%</small>}
                                </div>
                            </>
                        ) : <span className="compare-empty">Tap item</span>}
                    </div>
                    <ArrowLeftRight size={16} className="compare-arrow" />
                    <div className="compare-slot">
                        {itemB ? (
                            <>
                                <span className="compare-icon">{itemB.icon}</span>
                                <div className="compare-stats">
                                    <strong>{itemB.name}</strong>
                                    <small>{itemB.type === 'weapon' ? `ATK ${itemB.value}` : itemB.type === 'armor' ? `DEF ${itemB.value}` : `Val ${itemB.value}`}</small>
                                    {itemB.critChance && <small>Crit {Math.round(itemB.critChance * 100)}%</small>}
                                </div>
                            </>
                        ) : <span className="compare-empty">Tap item</span>}
                    </div>
                    <button className="compare-clear" onClick={() => { setCompareA(null); setCompareB(null); }}>✕</button>
                </div>
            )}

            <div className="panel-content-scrollable">
                <div className="cellar-inventory-grid">
                    {ownedItems.length === 0 ? (
                        <p className="empty-msg">No items matching this filter.</p>
                    ) : (
                        ownedItems.map(({ item, count }) => {
                            const stashed = isStashed(item.id);
                            const isComparing = compareA === item.id || compareB === item.id;
                            return (
                                <div
                                    key={item.id}
                                    className={`cellar-item rarity-border-${item.rarity} ${isComparing ? 'cellar-item--comparing' : ''}`}
                                    onClick={() => handleCompareToggle(item.id)}
                                >
                                    <span className="cellar-item-icon">{item.icon}</span>
                                    <div className="cellar-item-info">
                                        <strong>{item.name}</strong>
                                        <small>×{count} · {item.rarity}</small>
                                    </div>
                                    <button
                                        className={`cellar-stash-btn ${stashed ? 'cellar-stash-btn--locked' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); toggleStash?.(item.id); }}
                                        title={stashed ? 'Unlock (allow selling)' : 'Lock (prevent selling)'}
                                    >
                                        {stashed ? <Lock size={14} /> : <Unlock size={14} />}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Panel>
    );
};
