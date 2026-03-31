import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Play, Check, X, Brain } from 'lucide-react';
import { useFusionStore } from '../../store/useFusionStore';
import { usePetStore } from '../../store/usePetStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import './SharedFusionPanel.css';

interface SharedFusionPanelProps {
    mode: 'pet' | 'book';
}

export const SharedFusionPanel = ({ mode }: SharedFusionPanelProps) => {
    // Stores
    const { getFusionInfo, fusePet } = useFusionStore();
    const { ownedPets } = usePetStore();
    const inventory = useInventoryStore(s => s.items);
    const removeItem = useInventoryStore(s => s.removeItem);
    const addItem = useInventoryStore(s => s.addItem);

    // State
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    // @ts-ignore - unused but kept for future

    // Filter Items Based on Mode
    let availableItems: { id: string; name: string; level: number; count: number; rarity?: string; emoji?: string; req: number }[] = [];

    if (mode === 'pet') {
        const uniquePets = Array.from(new Set(ownedPets.map((p: string) => p).filter(Boolean)));
        availableItems = uniquePets.map(petId => {
            if (!petId || typeof petId !== 'string') return null;
            const info = getFusionInfo(petId);
            const level = info.level;
            const copies = Number(info.copies) || 0;
            const threshold = Number(info.copiesNeeded) || 3;
            return {
                id: petId,
                name: petId.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
                level,
                count: copies,
                rarity: 'Common',
                emoji: '🐾',
                req: threshold
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => b.level - a.level);
    } else {
        // Books (e.g., 'fantasy_book_1', 'fantasy_book_2')
        const bookItems = Object.entries(inventory).filter(([id]) => id.startsWith('fantasy_book_'));
        availableItems = bookItems.map(([id, quantity]) => {
            const levelMatch = id.match(/\d+$/);
            const level = levelMatch ? parseInt(levelMatch[0], 10) : 1;
            return {
                id,
                name: `Fantasy Tome Lv.${level}`,
                level,
                count: Number(quantity) || 0,
                rarity: 'Common',
                emoji: '📖',
                req: 2 // User requested exactly 2 duplicates to level up books
            };
        }).sort((a, b) => b.level - a.level);
    }

    const selectedItem = availableItems.find(i => i.id === selectedItemId);

    // --- Actions ---

    const handleFuse = () => {
        if (!selectedItem) return;

        if (mode === 'pet') {
            const result = fusePet(selectedItem.id);
            if (result) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2500);
            }
        } else {
            // Book Fusion (manual subtraction/addition)
            if (selectedItem.count >= selectedItem.req) {
                removeItem(selectedItem.id, selectedItem.req);
                const nextLevel = selectedItem.level + 1;
                const nextId = `fantasy_book_${nextLevel}`;
                addItem(nextId, 1);
                
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2500);
            }
        }
    };

    return (
        <div className="shared-fusion-layout">
            {/* Left Col: Roster List */}
            <div className="fusion-roster">
                <h3>{mode === 'pet' ? 'Pet Roster' : 'Tome Codex'}</h3>
                <div className="fusion-grid">
                    {availableItems.map(item => {
                        const isSelected = selectedItemId === item.id;
                        const canFuse = item.count >= item.req;
                        const isMaxLevel = mode === 'pet' ? item.level >= 5 : item.level >= 5; // Assuming max lv 5 for both

                        return (
                            <motion.div
                                key={item.id}
                                className={`fusion-grid-item ${isSelected ? 'active' : ''} ${canFuse && !isMaxLevel ? 'can-fuse' : ''}`}
                                onClick={() => setSelectedItemId(item.id)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="fgi-emoji">{item.emoji}</div>
                                <div className="fgi-info">
                                    <span className="fgi-name">{item.name} <span className="fgi-level">Lv.{item.level}</span></span>
                                    <div className="fgi-progress-wrapper">
                                        <div className="fgi-progress-text">
                                            {isMaxLevel ? 'MAX' : `${item.count} / ${item.req}`}
                                        </div>
                                        <div className="fgi-progress-bar">
                                            <div 
                                                className="fgi-progress-fill" 
                                                style={{ width: `${isMaxLevel ? 100 : Math.min(100, (item.count / item.req) * 100)}%` }} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}

                    {availableItems.length === 0 && (
                        <div className="fusion-empty">
                            No {mode === 'pet' ? 'pets' : 'books'} found in your inventory.
                        </div>
                    )}
                </div>
            </div>

            {/* Right Col: Fusion Altar */}
            <div className="fusion-altar">
                <AnimatePresence mode="wait">
                    {showSuccess ? (
                        <motion.div
                            key="success"
                            className="fusion-success-view"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="success-particles">
                                <Sparkles size={64} className="sparkle-icon" />
                            </div>
                            <h2>Fusion Successful!</h2>
                            <p>You obtained a higher level {mode === 'pet' ? 'Pet' : 'Tome'}!</p>
                        </motion.div>
                    ) : selectedItem ? (
                        <motion.div
                            key="altar"
                            className="fusion-altar-content"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h3>Altar of Ascension</h3>

                            <div className="altar-display">
                                <div className="altar-platform">
                                    <div className="altar-glow" />
                                    <div className="altar-emoji">{selectedItem.emoji}</div>
                                </div>
                                <div className="altar-details">
                                    <h2>{selectedItem.name}</h2>
                                    <div className="altar-badge">Lv. {selectedItem.level}</div>
                                </div>
                            </div>

                            {selectedItem.level >= 5 ? (
                                <div className="altar-max">
                                    <Check size={32} />
                                    <span>Maximum Level Reached</span>
                                </div>
                            ) : (
                                <div className="altar-action-area">
                                    <div className="altar-req">
                                        Requirements: <strong>{selectedItem.count} / {selectedItem.req}</strong> duplicates
                                    </div>
                                    
                                    <button 
                                        className={`btn-fuse ${selectedItem.count >= selectedItem.req ? 'ready' : 'locked'}`}
                                        disabled={selectedItem.count < selectedItem.req}
                                        onClick={handleFuse}
                                    >
                                        {selectedItem.count >= selectedItem.req ? (
                                            <>Ascend <Play size={18} /></>
                                        ) : (
                                            <>Not Enough Clones <X size={18} /></>
                                        )}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            className="fusion-altar-empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Brain size={48} />
                            <p>Select a {mode === 'pet' ? 'pet' : 'tome'} to view ascension requirements.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
