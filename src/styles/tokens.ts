/**
 * Design Tokens - AAA Gacha-Grade System
 * Single source of truth for all visual properties
 */

export const DESIGN_TOKENS = {
    // === SPACING (8pt grid) ===
    spacing: {
        xs: '4px',    // 0.5 × base
        sm: '8px',    // 1 × base
        md: '16px',   // 2 × base
        lg: '24px',   // 3 × base
        xl: '32px',   // 4 × base
        '2xl': '48px', // 6 × base
        '3xl': '64px', // 8 × base
    },

    // === COLORS ===
    colors: {
        // Primary (Purple/Blue for premium feel)
        primary: {
            50: '#f0f4ff',
            100: '#e0e7ff',
            200: '#c7d2fe',
            300: '#a5b4fc',
            400: '#818cf8',
            500: '#606cdc',  // Main primary
            600: '#4f46e5',
            700: '#4338ca',
            800: '#3730a3',
            900: '#312e81',
        },

        // Secondary/Accent (Gold for premium/rewards)
        accent: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b',  // Main accent
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f',
        },

        // Feedback
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',

        // Neutrals
        gray: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
        },

        // Rarity colors
        rarity: {
            common: '#9ca3af',
            rare: '#3b82f6',
            epic: '#a855f7',
            legendary: '#f59e0b',
        },

        // Background layers (for depth)
        bg: {
            base: '#0a0a0f',       // Deepest background
            elevated: '#12121a',   // Cards/panels
            hover: '#1a1a24',      // Hover states
            active: '#22222e',     // Active/pressed
        },
    },

    // === TYPOGRAPHY ===
    typography: {
        // Font families
        fontFamily: {
            sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            display: '"Outfit", "Inter", sans-serif',  // For headings
            mono: '"JetBrains Mono", "Courier New", monospace',
        },

        // Font sizes (type scale)
        fontSize: {
            xs: '0.75rem',    // 12px
            sm: '0.875rem',   // 14px
            base: '1rem',     // 16px
            lg: '1.125rem',   // 18px
            xl: '1.25rem',    // 20px
            '2xl': '1.5rem',  // 24px
            '3xl': '1.875rem', // 30px
            '4xl': '2.25rem',  // 36px
            '5xl': '3rem',     // 48px
        },

        // Font weights
        fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
            black: 900,
        },

        // Line heights
        lineHeight: {
            tight: 1.2,
            normal: 1.5,
            relaxed: 1.75,
        },
    },

    // === BORDERS & RADIUS ===
    borderRadius: {
        none: '0',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        full: '9999px',
    },

    borderWidth: {
        none: '0',
        thin: '1px',
        medium: '2px',
        thick: '4px',
    },

    // === SHADOWS (Depth/Elevation) ===
    shadows: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',

        // Glow effects
        glow: {
            primary: '0 0 20px rgba(96, 108, 220, 0.5)',
            accent: '0 0 20px rgba(245, 158, 11, 0.5)',
            success: '0 0 20px rgba(34, 197, 94, 0.5)',
            rare: '0 0 20px rgba(59, 130, 246, 0.6)',
            epic: '0 0 25px rgba(168, 85, 247, 0.7)',
            legendary: '0 0 30px rgba(245, 158, 11, 0.8)',
        },
    },

    // === Z-INDEX (Layering) ===
    zIndex: {
        base: 0,
        dropdown: 1000,
        sticky: 1020,
        fixed: 1030,
        modalBackdrop: 1040,
        modal: 1050,
        popover: 1060,
        tooltip: 1070,
    },

    // === TRANSITIONS (Motion) ===
    transitions: {
        // Durations
        duration: {
            instant: '100ms',
            fast: '150ms',
            normal: '250ms',
            slow: '350ms',
        },

        // Easing curves
        easing: {
            easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
            easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
            easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
            bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        },
    },

    // === BREAKPOINTS (Responsive) ===
    breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
    },

    // === EFFECTS ===
    effects: {
        // Backdrop blur
        backdropBlur: {
            sm: 'blur(4px)',
            md: 'blur(8px)',
            lg: 'blur(16px)',
        },

        // Gradients
        gradients: {
            primary: 'linear-gradient(135deg, #606cdc, #4338ca)',
            accent: 'linear-gradient(135deg, #f59e0b, #d97706)',
            success: 'linear-gradient(135deg, #22c55e, #16a34a)',
            dark: 'linear-gradient(180deg, #12121a, #0a0a0f)',

            // Rarity gradients
            rare: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            epic: 'linear-gradient(135deg, #a855f7, #9333ea)',
            legendary: 'linear-gradient(135deg, #f59e0b, #d97706)',
        },
    },
} as const;

// Type export for TypeScript
export type DesignTokens = typeof DESIGN_TOKENS;
