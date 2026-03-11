// ─── Collection Codex ─────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CODEX_SECTIONS,
    RARITY_COLORS,
    RARITY_GLOWS,
    RARITY_ORDER,
    SOURCE_LABELS,
    getCodexBySection,
    type CodexEntry,
    type CodexSection,
    type CodexRarity,
} from '../../data/codex';
import { useGachaStore } from '../../store/useGachaStore';
import { useAuraStore } from '../../store/useAuraStore';
import { useTitleStore } from '../../store/useTitleStore';
import { useCodexStore } from '../../store/useCodexStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useRoomStore } from '../../store/useRoomStore';
import './CollectionCodex.css';

// ── Owned-check logic per section ───────────────────────────────────────────

function useOwnedChecker() {
    const gachaStore = useGachaStore();
    const auraStore = useAuraStore();
    const titleStore = useTitleStore();
    const codexStore = useCodexStore();
    const profileStore = useProfileStore();
    const inventoryStore = useInventoryStore();
    const equipmentStore = useEquipmentStore();
    const roomStore = useRoomStore();

    return (entry: CodexEntry): boolean => {
        // Secret items need to be discovered first
        if (entry.isSecret && !codexStore.isSecretDiscovered(entry.id)) {
            // Still show in codex, just as "locked + secret hint hidden"
        }

        if (entry.section === 'pets') {
            // Check gacha-owned pets
            const petId = entry.id.replace('codex_pet_', '');
            return gachaStore.ownedPets.includes(petId);
        }
        if (entry.section === 'auras') {
            const auraId = entry.id.replace('codex_aura_', '');
            return auraStore.unlockedAuras.includes(auraId);
        }
        if (entry.section === 'titles') {
            const titleId = entry.id.replace('codex_title_', '');
            return titleStore.unlockedTitles.includes(titleId);
        }
        if (entry.section === 'banners') {
            const bannerId = entry.id.replace('codex_banner_', '');
            if (bannerId === 'default') return true;
            return profileStore.unlockedBanners.includes(bannerId);
        }
        if (entry.section === 'books') {
            const match = entry.id.match(/^codex_book_(.+)_lv(\d+)$/);
            if (match) {
                const itemId = `${match[1]}_book_${match[2]}`;
                return inventoryStore.discoveredItems?.includes(itemId) || false;
            }
        }
        if (entry.section === 'weapons' || entry.section === 'armor' || entry.section === 'jewelry') {
            if (entry.id.startsWith('codex_item_')) {
                const itemId = entry.id.replace('codex_item_', '');
                return inventoryStore.ownsMarketplaceItem(itemId);
            }
            if (entry.id.startsWith('codex_equip_')) {
                const equipId = entry.id.replace('codex_equip_', '');
                return equipmentStore.ownedEquipment.includes(equipId);
            }
        }
        if (entry.section === 'furniture') {
            const furnId = entry.id.replace('codex_furn_', '');
            return roomStore.ownsRoomFurniture(furnId);
        }

        // Artifacts / Relics / Cosmetics — not yet tracked per-item; show locked
        // (will integrate with inventory in future)
        return false;
    };
}

// ── Card Component ────────────────────────────────────────────────────────────

interface CodexCardProps {
    entry: CodexEntry;
    owned: boolean;
    secretRevealed: boolean;
}

const CodexCard = ({ entry, owned, secretRevealed }: CodexCardProps) => {
    const [expanded, setExpanded] = useState(false);
    const rarityColor = RARITY_COLORS[entry.rarity];
    const rarityGlow = RARITY_GLOWS[entry.rarity];

    const obtainHint = (entry.isSecret && !secretRevealed)
        ? '🔐 Hidden unlock condition'
        : entry.obtainHint;

    return (
        <motion.div
            className={`codex-card ${owned ? 'owned' : 'locked'} rarity-${entry.rarity}`}
            style={{
                borderColor: owned ? rarityColor : undefined,
                boxShadow: owned ? rarityGlow : undefined,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setExpanded(e => !e)}
            layout
        >
            {/* Rarity shimmer on owned legendary+ */}
            {owned && (entry.rarity === 'legendary' || entry.rarity === 'mythic') && (
                <div className="codex-card-shimmer" />
            )}

            {/* Top row: icon + rarity badge */}
            <div className="codex-card-header">
                <div className={`codex-icon-wrap ${owned ? '' : 'locked-icon'}`}>
                    <span className="codex-icon">{owned ? entry.icon : '🔒'}</span>
                </div>
                <span
                    className="codex-rarity-badge"
                    style={{ background: rarityColor + '33', color: rarityColor, borderColor: rarityColor + '66' }}
                >
                    {entry.rarity.charAt(0).toUpperCase() + entry.rarity.slice(1)}
                </span>
            </div>

            {/* Name */}
            <div className={`codex-card-name ${!owned ? 'locked-text' : ''}`}>
                {entry.isSecret && !secretRevealed ? '???' : entry.name}
            </div>

            {/* Owned badge */}
            {owned && (
                <div className="codex-owned-badge">✓ Owned</div>
            )}

            {/* Sources */}
            <div className="codex-sources">
                {entry.sources.map(s => (
                    <span key={s} className={`codex-source-tag source-${s}`}>
                        {SOURCE_LABELS[s]}
                    </span>
                ))}
            </div>

            {/* Expanded detail */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        className="codex-card-detail"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {!entry.isSecret || secretRevealed ? (
                            <p className="codex-detail-desc">{entry.description}</p>
                        ) : null}

                        <div className="codex-obtain-hint">
                            <span className="codex-hint-label">How to get:</span>
                            <span className="codex-hint-text">{obtainHint}</span>
                        </div>

                        {entry.spinOdds && (
                            <div className="codex-odds">
                                <span>🎰 Odds: </span>
                                <span style={{ color: RARITY_COLORS[entry.rarity] }}>{entry.spinOdds}</span>
                            </div>
                        )}
                        {entry.priceHint && (
                            <div className="codex-odds">
                                <span>💰 Price: </span>
                                <span style={{ color: '#f59e0b' }}>{entry.priceHint}</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ── Rarity Filter Pills ───────────────────────────────────────────────────────

const RARITY_FILTERS: { id: CodexRarity | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'common', label: 'Common' },
    { id: 'uncommon', label: 'Uncommon' },
    { id: 'rare', label: 'Rare' },
    { id: 'epic', label: 'Epic' },
    { id: 'legendary', label: 'Legendary' },
    { id: 'mythic', label: 'Mythic' },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export const CollectionCodex = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState<CodexSection>('pets');
    const [search, setSearch] = useState('');
    const [rarityFilter, setRarityFilter] = useState<CodexRarity | 'all'>('all');
    const [showOwnedOnly, setShowOwnedOnly] = useState(false);

    const checkOwned = useOwnedChecker();
    const codexStore = useCodexStore();

    // Compute section entries with owned/locked state
    const allEntries = useMemo(() => getCodexBySection(activeSection), [activeSection]);

    const entries = useMemo(() => {
        let result = allEntries.map(e => ({ entry: e, owned: checkOwned(e) }));

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(({ entry }) =>
                entry.name.toLowerCase().includes(q) ||
                entry.description.toLowerCase().includes(q)
            );
        }
        if (rarityFilter !== 'all') {
            result = result.filter(({ entry }) => entry.rarity === rarityFilter);
        }
        if (showOwnedOnly) {
            result = result.filter(({ owned }) => owned);
        }

        // Sort: owned → locked, then by rarity desc
        result.sort((a, b) => {
            if (activeSection === 'books') {
                const cats = ['fantasy', 'business', 'self-improvement', 'history', 'philosophy'];
                const matchA = a.entry.id.match(/^codex_book_(.+)_lv(\d+)$/);
                const matchB = b.entry.id.match(/^codex_book_(.+)_lv(\d+)$/);
                if (matchA && matchB) {
                    const catAIdx = cats.indexOf(matchA[1]);
                    const catBIdx = cats.indexOf(matchB[1]);
                    if (catAIdx !== catBIdx) return catAIdx - catBIdx;
                    return parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
                }
            }

            if (a.owned !== b.owned) return a.owned ? -1 : 1;
            return RARITY_ORDER.indexOf(b.entry.rarity) - RARITY_ORDER.indexOf(a.entry.rarity);
        });

        return result;
    }, [allEntries, search, rarityFilter, showOwnedOnly, checkOwned]);

    // Section completion stats
    const sectionStats = useMemo(() => {
        const all = getCodexBySection(activeSection);
        const ownedCount = all.filter(e => checkOwned(e)).length;
        return { total: all.length, owned: ownedCount };
    }, [activeSection, checkOwned]);

    return (
        <div className="codex-overlay">
            <div className="codex-bg-blur" />

            {/* ── Top Bar ── */}
            <div className="codex-top-bar">
                <button className="codex-back-btn" onClick={() => navigate(-1)}>
                    ← Back
                </button>
                <div className="codex-title">
                    <span className="codex-title-icon">📖</span>
                    Collection Codex
                </div>
                <div className="codex-progress-pill">
                    {sectionStats.owned}/{sectionStats.total}
                </div>
            </div>

            {/* ── Section Tabs ── */}
            <div className="codex-section-tabs">
                {CODEX_SECTIONS.map(sec => (
                    <button
                        key={sec.id}
                        className={`codex-tab ${activeSection === sec.id ? 'active' : ''}`}
                        onClick={() => { setActiveSection(sec.id); setSearch(''); setRarityFilter('all'); }}
                    >
                        <span className="codex-tab-icon">{sec.icon}</span>
                        <span className="codex-tab-label">{sec.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Filters Row ── */}
            <div className="codex-filters">
                <input
                    className="codex-search"
                    placeholder="🔍 Search..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div className="codex-rarity-pills">
                    {RARITY_FILTERS.map(f => (
                        <button
                            key={f.id}
                            className={`codex-rarity-pill ${rarityFilter === f.id ? 'active' : ''}`}
                            style={rarityFilter === f.id && f.id !== 'all'
                                ? { background: RARITY_COLORS[f.id as CodexRarity] + '33', borderColor: RARITY_COLORS[f.id as CodexRarity] }
                                : {}
                            }
                            onClick={() => setRarityFilter(f.id as CodexRarity | 'all')}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <label className="codex-owned-toggle">
                    <input
                        type="checkbox"
                        checked={showOwnedOnly}
                        onChange={e => setShowOwnedOnly(e.target.checked)}
                    />
                    <span>Owned only</span>
                </label>
            </div>

            {/* ── Grid ── */}
            <div className="codex-grid-wrapper">
                {entries.length === 0 ? (
                    <div className="codex-empty">
                        <span>😶 No items matching your filters.</span>
                    </div>
                ) : (
                    <motion.div className="codex-grid" layout>
                        <AnimatePresence>
                            {entries.map(({ entry, owned }) => (
                                <CodexCard
                                    key={entry.id}
                                    entry={entry}
                                    owned={owned}
                                    secretRevealed={codexStore.isSecretDiscovered(entry.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default CollectionCodex;
