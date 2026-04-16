export interface ChessTrap {
    id: string;
    name: string;
    setupMoves: { fr: number, fc: number, tr: number, tc: number }[];
    criticalMove: { fr: number, fc: number, tr: number, tc: number, notation: string };
    explanation: string;
    combatEffect: 'stun' | 'burst_damage' | 'crit_boost';
}

export const CHESS_TRAPS: ChessTrap[] = [
    {
        id: "scholars_mate",
        name: "Scholar's Mate",
        // e4, e5, Bc4, Nc6, Qh5, Nf6
        setupMoves: [
            { fr: 6, fc: 4, tr: 4, tc: 4 }, // e4
            { fr: 1, fc: 4, tr: 3, tc: 4 }, // e5
            { fr: 7, fc: 5, tr: 4, tc: 2 }, // Bc4
            { fr: 0, fc: 1, tr: 2, tc: 2 }, // Nc6
            { fr: 7, fc: 3, tr: 3, tc: 7 }, // Qh5
            { fr: 0, fc: 6, tr: 2, tc: 5 }  // Nf6 (blunder)
        ],
        // Qxf7#
        criticalMove: { fr: 3, fc: 7, tr: 1, tc: 5, notation: "Qxf7#" },
        explanation: "The classic 4-move checkmate targeting the weak f7 pawn, which is only defended by the King.",
        combatEffect: 'burst_damage'
    },
    {
        id: "legal_trap",
        name: "The Légal Trap",
        // e4, e5, Nf3, d6, Bc4, Bg4, Nc3, h6 (Wait, standard is g6 or a6, let's just use simple setup)
        // e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4 h3 Bh5 Nxe5
        setupMoves: [
            { fr: 6, fc: 4, tr: 4, tc: 4 }, // e4
            { fr: 1, fc: 4, tr: 3, tc: 4 }, // e5
            { fr: 7, fc: 6, tr: 5, tc: 5 }, // Nf3
            { fr: 0, fc: 1, tr: 2, tc: 2 }, // Nc6
            { fr: 7, fc: 5, tr: 4, tc: 2 }, // Bc4
            { fr: 1, fc: 3, tr: 2, tc: 3 }, // d6
            { fr: 7, fc: 1, tr: 5, tc: 2 }, // Nc3
            { fr: 0, fc: 2, tr: 4, tc: 6 }, // Bg4 (pin)
            { fr: 6, fc: 7, tr: 5, tc: 7 }, // h3
            { fr: 4, fc: 6, tr: 3, tc: 7 }  // Bh5 (blunder)
        ],
        // Nxe5!
        criticalMove: { fr: 5, fc: 5, tr: 3, tc: 4, notation: "Nxe5!" },
        explanation: "Sacrificing the Queen to deliver a stunning forced checkmate with the remaining minor pieces.",
        combatEffect: 'stun'
    },
    {
        id: "fried_liver_attack",
        name: "Fried Liver Attack",
        // e4, e5, Nf3, Nc6, Bc4, Nf6, Ng5, d5, exd5, Nxd5
        setupMoves: [
            { fr: 6, fc: 4, tr: 4, tc: 4 }, // e4
            { fr: 1, fc: 4, tr: 3, tc: 4 }, // e5
            { fr: 7, fc: 6, tr: 5, tc: 5 }, // Nf3
            { fr: 0, fc: 1, tr: 2, tc: 2 }, // Nc6
            { fr: 7, fc: 5, tr: 4, tc: 2 }, // Bc4
            { fr: 0, fc: 6, tr: 2, tc: 5 }, // Nf6
            { fr: 5, fc: 5, tr: 3, tc: 6 }, // Ng5
            { fr: 1, fc: 3, tr: 3, tc: 3 }, // d5
            { fr: 4, fc: 4, tr: 3, tc: 3 }, // exd5
            { fr: 2, fc: 5, tr: 3, tc: 3 }  // Nxd5 (blunder)
        ],
        // Nxf7!
        criticalMove: { fr: 3, fc: 6, tr: 1, tc: 5, notation: "Nxf7!" },
        explanation: "A devastating knight sacrifice on f7 that rips open the black King's defenses.",
        combatEffect: 'crit_boost'
    }
];
