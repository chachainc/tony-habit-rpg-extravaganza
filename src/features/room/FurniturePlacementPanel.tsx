import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, GripHorizontal } from 'lucide-react';
import {
    useRoomStore,
    ROOM_FURNITURE_CATALOG,
    type PlacedFurniture,
} from '../../store/useRoomStore';
import './FurniturePlacementPanel.css';

interface Props {
    onClose: () => void;
}

export const FurniturePlacementPanel: React.FC<Props> = ({
    onClose,
}) => {
    const {
        ownedRoomFurniture,
        isPlaced,
        placeRoomFurniture,
        unplaceByFurnitureId,
    } = useRoomStore();

    const [isMinimized, setIsMinimized] = useState(false);

    const ownedItems = ROOM_FURNITURE_CATALOG.filter((def) =>
        ownedRoomFurniture.includes(def.id)
    );

    const rarityColor: Record<string, string> = {
        common: '#94a3b8',
        uncommon: '#4ade80',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#eab308',
    };

    // Ghost drag logic for placing NEW items from the drawer
    const [draggedItem, setDraggedItem] = useState<{ id: string; x: number; y: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent, defId: string) => {
        // Prevent default scrolling when attempting to drag an item out
        e.stopPropagation();
        setDraggedItem({
            id: defId,
            x: e.clientX,
            y: e.clientY
        });
    };

    useEffect(() => {
        const handleGlobalPointerMove = (e: PointerEvent) => {
            if (draggedItem) {
                setDraggedItem({ id: draggedItem.id, x: e.clientX, y: e.clientY });
            }
        };

        const handleGlobalPointerUp = (e: PointerEvent) => {
            if (draggedItem) {
                // Drop occurred. Calculate relative X, Y in the main room container
                const roomVisualHub = document.querySelector('.room-visual-hub');
                if (roomVisualHub) {
                    const rect = roomVisualHub.getBoundingClientRect();
                    const dropX = ((e.clientX - rect.left) / rect.width) * 100;
                    const dropY = ((e.clientY - rect.top) / rect.height) * 100;

                    // Only place if dropped roughly inside the room area
                    if (dropX >= 0 && dropX <= 100 && dropY >= 0 && dropY <= 100) {
                        placeRoomFurniture(draggedItem.id, dropX, dropY);
                    }
                }
                setDraggedItem(null);
            }
        };

        if (draggedItem) {
            window.addEventListener('pointermove', handleGlobalPointerMove);
            window.addEventListener('pointerup', handleGlobalPointerUp);
        }

        return () => {
            window.removeEventListener('pointermove', handleGlobalPointerMove);
            window.removeEventListener('pointerup', handleGlobalPointerUp);
        };
    }, [draggedItem, placeRoomFurniture]);

    const activeItemDef = draggedItem ? ROOM_FURNITURE_CATALOG.find(c => c.id === draggedItem.id) : null;

    return (
        <>
            <motion.div 
                className={`fp-bottom-drawer ${isMinimized ? 'minimized' : ''}`}
                initial={{ y: 200 }}
                animate={{ y: 0 }}
                exit={{ y: 200 }}
                onPointerDown={(e) => e.stopPropagation()} 
            >
                {/* Header / Handle */}
                <div className="fp-drawer-header">
                    <button className="fp-drawer-minimize" onClick={() => setIsMinimized(!isMinimized)}>
                        <GripHorizontal size={20} />
                    </button>
                    <h3>🪑 Furniture Inventory</h3>
                    <button className="fp-drawer-close" onClick={onClose}><X size={18} /></button>
                </div>

                {!isMinimized && (
                    <div className="fp-drawer-body">
                        {ownedItems.length === 0 ? (
                            <div className="fp-empty-tray">
                                <p>No furniture owned yet. Visit the Store.</p>
                            </div>
                        ) : (
                            <div className="fp-tray-list">
                                {ownedItems.map((def) => {
                                    const placed = isPlaced(def.id);
                                    return (
                                        <div
                                            key={def.id}
                                            className={`fp-tray-item ${placed ? 'placed' : ''}`}
                                            onPointerDown={!placed ? (e) => handlePointerDown(e, def.id) : undefined}
                                            style={{ cursor: placed ? 'default' : 'grab' }}
                                        >
                                            <div className="fp-tray-item-visual">
                                                <span className="fp-tray-item-icon">{def.icon}</span>
                                            </div>
                                            <div className="fp-tray-item-info">
                                                <span className="fp-tray-item-name" style={{ color: rarityColor[def.rarity] }}>
                                                    {def.name}
                                                </span>
                                            </div>
                                            {placed && (
                                                <div className="fp-tray-item-overlay">
                                                    <button className="fp-tray-return" onClick={(e) => { e.stopPropagation(); unplaceByFurnitureId(def.id); }}>
                                                        <Trash2 size={12} /> Store
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Ghost Drag Preview rendered at Window Level */}
            {draggedItem && activeItemDef && (
                <div 
                    style={{
                        position: 'fixed',
                        left: draggedItem.x,
                        top: draggedItem.y,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        zIndex: 9999,
                        fontSize: '3rem',
                        opacity: 0.6,
                        filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))'
                    }}
                >
                    {activeItemDef.icon}
                </div>
            )}
        </>
    );
};

// ... keep DraggableFurniturePiece unchanged below
export interface DraggablePieceProps {
    placed: PlacedFurniture;
    editMode: boolean;
    onInteract?: () => void;
}

export const DraggableFurniturePiece: React.FC<DraggablePieceProps> = ({
    placed,
    editMode,
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
        if (!isDragging || !dragStart.current) return;
        e.stopPropagation();

        // Dynamically find the room container
        const roomVisualHub = document.querySelector('.room-visual-hub');
        const rect = roomVisualHub ? roomVisualHub.getBoundingClientRect() : null;
        if (!rect) return;

        const dx = ((e.clientX - dragStart.current.clientX) / rect.width) * 100;
        const dy = ((e.clientY - dragStart.current.clientY) / rect.height) * 100;

        const newX = Math.max(0, Math.min(100 - sizeW, dragStart.current.pieceX + dx));
        const newY = Math.max(0, Math.min(100 - sizeH, dragStart.current.pieceY + dy));

        movePlacedFurniture(placed.id, newX, newY);
    }, [isDragging, movePlacedFurniture, placed.id, sizeW, sizeH]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        if (!isDragging && !editMode && onInteract) {
            e.stopPropagation();
            onInteract();
            return;
        }
        if (!isDragging) return;
        e.stopPropagation();
        setIsDragging(false);

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
