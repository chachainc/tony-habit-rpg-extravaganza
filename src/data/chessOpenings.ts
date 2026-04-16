export interface ChessOpeningMove {
    notation: string;
    fr: number;
    fc: number;
    tr: number;
    tc: number;
}

export interface ChessCombatBuff {
    attack?: number;
    defense?: number;
    crit?: number;
    goldMultiplier?: number;
    magicAttack?: number;
}

export interface ChessOpening {
    id: string;
    name: string;
    side: 'white' | 'black';
    moves: ChessOpeningMove[];
    idea: string;
    remember: string;
    difficulty: 'beginner' | 'intermediate';
    combatBuff?: ChessCombatBuff;
}

const N_MAP: Record<string, { fr: number; fc: number; tr: number; tc: number }> = {
    // Pawns
    'e4': { fr: 6, fc: 4, tr: 4, tc: 4 },
    'e5': { fr: 1, fc: 4, tr: 3, tc: 4 },
    'e6': { fr: 1, fc: 4, tr: 2, tc: 4 },
    'd4': { fr: 6, fc: 3, tr: 4, tc: 3 },
    'd5': { fr: 1, fc: 3, tr: 3, tc: 3 },
    'c4': { fr: 6, fc: 2, tr: 4, tc: 2 },
    'c5': { fr: 1, fc: 2, tr: 3, tc: 2 },
    'c6': { fr: 1, fc: 2, tr: 2, tc: 2 },
    'c3': { fr: 6, fc: 2, tr: 5, tc: 2 },
    'd3': { fr: 6, fc: 3, tr: 5, tc: 3 },
    'd6': { fr: 1, fc: 3, tr: 2, tc: 3 },
    'g6': { fr: 1, fc: 6, tr: 2, tc: 6 },
    'cxd4': { fr: 3, fc: 2, tr: 4, tc: 3 }, // Black taking on d4 from c5
    'dxc4': { fr: 3, fc: 3, tr: 4, tc: 2 }, // Black taking on c4 from d5
    
    // Knights
    'Nf3': { fr: 7, fc: 6, tr: 5, tc: 5 },
    'Nf6': { fr: 0, fc: 6, tr: 2, tc: 5 },
    'Nc3': { fr: 7, fc: 1, tr: 5, tc: 2 },
    'Nc6': { fr: 0, fc: 1, tr: 2, tc: 2 },
    'Nxd4': { fr: 5, fc: 5, tr: 4, tc: 3 }, // White taking on d4 from f3
    
    // Bishops
    'Bc4': { fr: 7, fc: 5, tr: 4, tc: 2 },
    'Bc5': { fr: 0, fc: 5, tr: 3, tc: 2 },
    'Bb5': { fr: 7, fc: 5, tr: 3, tc: 1 },
    'Bf4': { fr: 7, fc: 2, tr: 4, tc: 5 },
};

export function mapMoves(notations: string[]): ChessOpeningMove[] {
    return notations.map((n, index) => {
        const moveData = N_MAP[n];
        if (!moveData) throw new Error(`Missing N_MAP entry for move: ${n} at index ${index}`);
        return {
            notation: n,
            ...moveData
        };
    });
}

export const CHESS_OPENINGS: ChessOpening[] = [
    // ---------------- BEGINNER PACK ---------------- //
    {
        id: "italian_game",
        name: "Italian Game",
        side: "white",
        moves: mapMoves(["e4", "e5", "Nf3", "Nc6", "Bc4"]),
        idea: "Control the center, develop quickly, and attack the f7 square.",
        remember: "Knight first, then bishop attack.",
        difficulty: "beginner",
        combatBuff: { attack: 2 } // early attack bonus
    },
    {
        id: "ruy_lopez",
        name: "Ruy Lopez",
        side: "white",
        moves: mapMoves(["e4", "e5", "Nf3", "Nc6", "Bb5"]),
        idea: "Attack the knight defending the center pawn.",
        remember: "Attack the defender, not the pawn.",
        difficulty: "beginner",
        combatBuff: { attack: 2 }
    },
    {
        id: "london_system",
        name: "London System",
        side: "white",
        moves: mapMoves(["d4", "d5", "Nf3", "Nf6", "Bf4"]),
        idea: "Safe, consistent setup with easy development.",
        remember: "Same setup every game.",
        difficulty: "beginner",
        combatBuff: { defense: 2 }
    },
    {
        id: "queens_gambit",
        name: "Queen's Gambit",
        side: "white",
        moves: mapMoves(["d4", "d5", "c4"]),
        idea: "Offer a pawn to gain strong center control.",
        remember: "Give a pawn, take the center.",
        difficulty: "beginner",
        combatBuff: { goldMultiplier: 2 }
    },
    {
        id: "kings_pawn",
        name: "King's Pawn Opening",
        side: "white",
        moves: mapMoves(["e4"]),
        idea: "Fast central control and open lines.",
        remember: "e4 = aggressive start.",
        difficulty: "beginner",
        combatBuff: { attack: 1 }
    },
    {
        id: "sicilian_defense",
        name: "Sicilian Defense",
        side: "black",
        moves: mapMoves(["e4", "c5"]),
        idea: "Counterattack the center from the side.",
        remember: "Don’t mirror — counterattack.",
        difficulty: "beginner",
        combatBuff: { crit: 2 }
    },
    {
        id: "french_defense",
        name: "French Defense",
        side: "black",
        moves: mapMoves(["e4", "e6", "d4", "d5"]),
        idea: "Strong defensive structure with counterplay.",
        remember: "Block first, strike later.",
        difficulty: "beginner",
        combatBuff: { defense: 2 }
    },
    {
        id: "caro_kann",
        name: "Caro-Kann Defense",
        side: "black",
        moves: mapMoves(["e4", "c6", "d4", "d5"]),
        idea: "Very solid and reliable defense.",
        remember: "Safe over flashy.",
        difficulty: "beginner",
        combatBuff: { defense: 3 }
    },
    {
        id: "scandinavian_defense",
        name: "Scandinavian Defense",
        side: "black",
        moves: mapMoves(["e4", "d5"]),
        idea: "Attack the center immediately.",
        remember: "Hit the center instantly.",
        difficulty: "beginner",
        combatBuff: { attack: 1, defense: 1 }
    },
    {
        id: "kings_indian",
        name: "King's Indian Setup",
        side: "black",
        moves: mapMoves(["d4", "Nf6", "c4", "g6"]),
        idea: "Control from distance and attack later.",
        remember: "Let them take center, then break it.",
        difficulty: "beginner",
        combatBuff: { magicAttack: 2 }
    },

    // ---------------- INTERMEDIATE PACK ---------------- //
    {
        id: "italian_giuoco_piano",
        name: "Italian Game (Giuoco Piano)",
        side: "white",
        moves: mapMoves(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d3"]),
        idea: "A slow, positional build-up preparing to strike the center later.",
        remember: "Quiet game, preparing the d4 push.",
        difficulty: "intermediate",
        combatBuff: { attack: 3, defense: 1 }
    },
    {
        id: "sicilian_dragon_basic",
        name: "Sicilian Defense (Basic Open)",
        side: "black",
        moves: mapMoves(["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6"]),
        idea: "Fianchetto the kingside bishop to create massive diagonal pressure.",
        remember: "Breathe fire down the long diagonal.",
        difficulty: "intermediate",
        combatBuff: { crit: 3, attack: 1 }
    },
    {
        id: "french_advance",
        name: "French Defense (Advance)",
        side: "white",
        moves: mapMoves(["e4", "e6", "d4", "d5", "e5", "c5", "c3", "Nc6", "Nf3"]),
        idea: "White shuts down the center and suffocates Black for a kingside attack.",
        remember: "Lock the center, attack the king.",
        difficulty: "intermediate",
        combatBuff: { defense: 4 }
    },
    {
        id: "queens_gambit_declined",
        name: "Queen's Gambit Declined (Basic)",
        side: "black",
        moves: mapMoves(["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Nf3"]),
        idea: "Refuse the gambit to maintain a solid, unbreakable pawn in the center.",
        remember: "Hold the center, don't get greedy.",
        difficulty: "intermediate",
        combatBuff: { goldMultiplier: 3, defense: 2 }
    }
];
