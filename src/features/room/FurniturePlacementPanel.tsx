import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, MapPin, Trash2 } from 'lucide-react';
import {
    useRoomStore,
    ROOM_FURNITURE_CATALOG,
    type PlacedFurniture,
} from '../../store/useRoomStore';
import './FurniturePlacementPanel.css';

interface Props {
    onClose: () => void;
    /** Called when user taps an unplaced item and wants to click-place in the room */
    onEnterPlacementMode: (furnitureId: string) => void;
    /** List of currently active placement modes */
    placingFurnitureId: string | null;
}

export const FurniturePlacementPanel: React.FC<Props> = ({
    onClose,
    onEnterPlacementMode,
    placingFurnitureId,
}) => {
    const {
        ownedRoomFurniture,
        placedRoomFurniture,
        isPlaced,
        unplaceByFurnitureId,
        getPlacedBonusSummary,
    } = useRoomStore();

    const [tab, setTab] = useState<'inventory' | 'bonuses'>('inventory');

    const bonusSummary = getPlacedBonusSummary();

    const ownedItems = ROOM_FURNITURE_CATALOG.filter((def) =>
        ownedRoomFurniture.includes(def.id)
    );
    const unownedCount = ROOM_FURNITURE_CATALOG.length - ownedItems.length;

    const handlePlace = (furnitureId: string) => {
        onEnterPlacementMode(furnitureId);
    };

    const handleUnplace = (furnitureId: string) => {
        unplaceByFurnitureId(furnitureId);
    };

    const rarityColor: Record<string, string> = {
        common: '#94a3b8',
        uncommon: '#4ade80',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#eab308',
    };

    return (
        <div className="fp-panel">
            {/* Header */}
            <div className="fp-panel__header">
                <h3>🪑 Furniture</h3>
                <button className="fp-close-btn" onClick={onClose}><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div className="fp-tabs">
                <button
                    className={`fp-tab ${tab === 'inventory' ? 'active' : ''}`}
                    onClick={() => setTab('inventory')}
                >
                    <Package size={14} /> Owned ({ownedItems.length})
                </button>
                <button
                    className={`fp-tab ${tab === 'bonuses' ? 'active' : ''}`}
                    onClick={() => setTab('bonuses')}
                >
                    ✨ Active Bonuses
                </button>
            </div>

            <div className="fp-panel__body">
                {tab === 'inventory' && (
                    <>
                        {ownedItems.length === 0 ? (
                            <div className="fp-empty">
                                <p>No furniture owned yet.</p>
                                <p className="fp-empty-hint">
                                    Visit the Furniture Store to buy items for your room.
                                </p>
                            </div>
                        ) : (
                            <div className="fp-item-list">
                                {ownedItems.map((def) => {
                                    const placed = isPlaced(def.id);
                                    const isBeingPlaced = placingFurnitureId === def.id;
                                    return (
                                        <div
                                            key={def.id}
                                            className={`fp-item ${placed ? 'placed' : ''} ${isBeingPlaced ? 'placing' : ''}`}
                                        >
                                            <div className="fp-item__icon">{def.icon}</div>
                                            <div className="fp-item__info">
                                                <div className="fp-item__name-row">
                                                    <span
                                                        className="fp-item__name"
                                                        style={{ color: rarityColor[def.rarity] }}
                                                    >
                                                        {def.name}
                                                    </span>
                                                    {placed && (
                                                        <span className="fp-placed-badge">
                                                            <MapPin size={10} /> Placed
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="fp-item__bonus">{def.bonusLabel}</span>
                                            </div>
                                            <div className="fp-item__actions">
                                                {isBeingPlaced ? (
                                                    <span className="fp-placing-hint">Tap room to place</span>
                                                ) : placed ? (
                                                    <>
                                                        <button
                                                            className="fp-btn fp-btn--move"
                                                            onClick={() => handlePlace(def.id)}
                                                            title="Move"
                                                        >
                                                            ✥
                                                        </button>
                                                        <button
                                                            className="fp-btn fp-btn--remove"
                                                            onClick={() => handleUnplace(def.id)}
                                                            title="Remove from room"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        className="fp-btn fp-btn--place"
                                                        onClick={() => handlePlace(def.id)}
                                                    >
                                                        Place
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {unownedCount > 0 && (
                            <p className="fp-store-hint">
                                + {unownedCount} more items available in the store
                            </p>
                        )}
                    </>
                )}

                {tab === 'bonuses' && (
                    <div className="fp-bonuses">
                        {bonusSummary.length === 0 ? (
                            <div className="fp-empty">
                                <p>No furniture placed yet.</p>
                                <p className="fp-empty-hint">Place items in your room to activate bonuses.</p>
                            </div>
                        ) : (
                            <>
                                <p className="fp-bonus-subtitle">
                                    Active from {placedRoomFurniture.length} placed item
                                    {placedRoomFurniture.length !== 1 ? 's' : ''}:
                                </p>
                                <div className="fp-bonus-grid">
                                    {bonusSummary.map((b) => (
                                        <div key={b.label} className="fp-bonus-row">
                                            <span className="fp-bonus-label">{b.label}</span>
                                            <span className="fp-bonus-value">{b.value}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="fp-placed-list">
                                    <p className="fp-placed-title">Placed furniture:</p>
                                    {placedRoomFurniture.map((p) => {
                                        const def = ROOM_FURNITURE_CATALOG.find(d => d.id === p.furnitureId);
                                        if (!def) return null;
                                        return (
                                            <div key={p.id} className="fp-placed-entry">
                                                <span>{def.icon} {def.name}</span>
                                                <span className="fp-placed-coord">
                                                    {Math.round(p.x)}%, {Math.round(p.y)}%
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/** Draggable furniture piece rendered inside the room grid */
interface DraggablePieceProps {
    placed: PlacedFurniture;
    editMode: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    /** Called when tapped in non-edit mode (e.g. opens a panel) */
    onInteract?: () => void;
}

export const DraggableFurniturePiece: React.FC<DraggablePieceProps> = ({
    placed,
    editMode,
    containerRef,
    onInteract,
}) => {
    const { movePlacedFurniture, unplaceByFurnitureId } = useRoomStore();
    const def = ROOM_FURNITURE_CATALOG.find((d) => d.id === placed.furnitureId);
    const [isDragging, setIsDragging] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const dragStart = useRef<{ clientX: number; clientY: number; pieceX: number; pieceY: number } | null>(null);

    const sizeW = def?.sizeW ?? 10;
    const sizeH = def?.sizeH ?? 10;

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (!editMode) return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        setShowActions(false);
        dragStart.current = {
            clientX: e.clientX,
            clientY: e.clientY,
            pieceX: placed.x,
            pieceY: placed.y,
        };
    }, [editMode, placed.x, placed.y]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging || !dragStart.current || !containerRef.current) return;
        e.stopPropagation();

        const rect = containerRef.current.getBoundingClientRect();
        const dx = ((e.clientX - dragStart.current.clientX) / rect.width) * 100;
        const dy = ((e.clientY - dragStart.current.clientY) / rect.height) * 100;

        const newX = Math.max(0, Math.min(100 - sizeW, dragStart.current.pieceX + dx));
        const newY = Math.max(0, Math.min(100 - sizeH, dragStart.current.pieceY + dy));

        movePlacedFurniture(placed.id, newX, newY);
    }, [isDragging, containerRef, movePlacedFurniture, placed.id, sizeW, sizeH]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        if (!isDragging && !editMode && onInteract) {
            // Non-edit-mode tap → trigger interaction
            e.stopPropagation();
            onInteract();
            return;
        }
        if (!isDragging) return;
        e.stopPropagation();
        setIsDragging(false);

        // If barely moved, treat as tap
        const dist = dragStart.current
            ? Math.abs(e.clientX - dragStart.current.clientX) + Math.abs(e.clientY - dragStart.current.clientY)
            : 999;
        if (dist < 6 && editMode) {
            setShowActions((v) => !v);
        }
        dragStart.current = null;
    }, [isDragging, editMode, onInteract]);

    if (!def) return null;

    return (
        <div
            className={`fp-room-piece ${editMode ? 'edit-mode' : ''} ${isDragging ? 'dragging' : ''} ${onInteract && !editMode ? 'has-interaction' : ''}`}
            style={{
                left: `${placed.x}%`,
                top: `${placed.y}%`,
                width: `${sizeW}%`,
                height: `${sizeH}%`,
                touchAction: 'none',
                cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        >
            <span className="fp-room-piece__icon">{def.icon}</span>
            {editMode && !isDragging && (
                <div className="fp-room-piece__label">{def.name}</div>
            )}

            <AnimatePresence>
                {showActions && editMode && (
                    <motion.div
                        className="fp-room-piece__actions"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    >
                        <button
                            className="fp-room-action"
                            onClick={(e) => { e.stopPropagation(); unplaceByFurnitureId(placed.furnitureId); setShowActions(false); }}
                        >
                            <Trash2 size={12} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
