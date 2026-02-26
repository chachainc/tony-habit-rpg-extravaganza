import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import './StoreLayout.css';

interface Props {
    storeName: string;
    storeIcon: string;
    storeColor: string;
    onClose: () => void;
    children: ReactNode;
    /** Optional AI-generated background image */
    backgroundImage?: string;
    /** Optional glowing points for atmospheric lighting */
    glowPoints?: Array<{ x: number; y: number; color?: string; intensity?: number }>;
    /** Optional sticky top bar (e.g. for search/filters) */
    topBar?: ReactNode;
    /** Optional bottom sheet (e.g. for mobile filters/sort) */
    bottomSheet?: ReactNode;
}

export const StoreLayout = ({
    storeName,
    storeIcon,
    storeColor,
    onClose,
    children,
    backgroundImage,
    glowPoints = [],
    topBar,
    bottomSheet,
}: Props) => {
    return (
        <div className="store-overlay" onClick={onClose}>
            <motion.div
                className="store-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
            >
                {/* Background Image Layer */}
                {backgroundImage && (
                    <div
                        className="store-background"
                        style={{ backgroundImage: `url(${backgroundImage})` }}
                    />
                )}

                {/* Vignette Overlay */}
                <div className="store-vignette" />

                {/* Fog Animation */}
                <div className="store-fog">
                    <div className="fog fog--1" />
                    <div className="fog fog--2" />
                </div>

                {/* Glow Points */}
                {glowPoints.length > 0 && (
                    <div className="store-glows">
                        {glowPoints.map((glow, i) => (
                            <div
                                key={i}
                                className="glow-point"
                                style={{
                                    left: `${glow.x}%`,
                                    top: `${glow.y}%`,
                                    '--glow-color': glow.color || '#fbbf24',
                                    '--glow-intensity': glow.intensity || 1,
                                } as React.CSSProperties}
                            />
                        ))}
                    </div>
                )}

                {/* Header */}
                <div
                    className="store-header"
                    style={{
                        background: `linear-gradient(135deg, ${storeColor}dd, ${storeColor}99)`,
                        borderBottom: `3px solid ${storeColor}`,
                    }}
                >
                    <div className="store-header-left">
                        <span className="store-icon">{storeIcon}</span>
                        <h2>{storeName}</h2>
                    </div>
                    {/* Explicitly bind cross-browser touch and click to onClose */}
                    <button
                        className="store-close-btn"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
                    >
                        <X size={20} /> <span className="store-close-label">Back</span>
                    </button>
                </div>

                {/* Optional Sticky Top Bar */}
                {topBar && (
                    <div className="store-sticky-top-bar">
                        {topBar}
                    </div>
                )}

                {/* Content */}
                <div className="store-content">
                    {children}
                </div>

                {/* Optional Bottom Sheet Container */}
                {bottomSheet && (
                    <div className="store-bottom-sheet">
                        {bottomSheet}
                    </div>
                )}
            </motion.div>
        </div>
    );
};
