export interface StyleArenaMoveEvaluation {
    moveSan: string;
    fr: number;
    fc: number;
    tr: number;
    tc: number;
    grade: 'perfect' | 'good' | 'poor' | 'blunder';
    styleDelta: number;
    feedback: string;
}

export interface StyleArenaTurn {
    fen: string;
    prompt?: string;
    evaluations: StyleArenaMoveEvaluation[];
    bossResponseSan?: string; // Move played by the boss after your move. Null if challenge ends on this turn's response.
}

export interface StyleArenaChallenge {
    id: string; // e.g., 'morphy_tier_1'
    tier: 1 | 2 | 3;
    title: string;
    description: string;
    bossPassive: string;
    turns: StyleArenaTurn[];
    startingMeter: number;
    meterTarget: number;
    rewards: {
        gold: number;
        intelligenceXp: number;
    };
}

export interface ChessPlayerLessonMove {
    notation: string;
    fr: number;
    fc: number;
    tr: number;
    tc: number;
    explanation: string;
}

export interface ChessPlayerSimulation {
    boardSetupMoves: {fr: number; fc: number; tr: number; tc: number}[];
    options: {
        notation: string;
        isCorrect: boolean;
        explanation: string;
    }[];
}

export interface ChessHistoricalPlayer {
    id: string;
    name: string;
    years: string;
    nationality: string;
    tagline: string;
    achievements: string;
    playstyleCharacteristics: string[];
    lesson: {
        startStateMoves: {fr: number; fc: number; tr: number; tc: number}[];
        interactiveMoves: ChessPlayerLessonMove[];
    };
    simulation: ChessPlayerSimulation | null;
    arenaChallenges?: StyleArenaChallenge[];
}

export interface ChessEra {
    id: string;
    title: string;
    years: string;
    description: string;
    players: ChessHistoricalPlayer[];
}

// Helper to define setup easily mapping standard moves if needed, but we'll use exact coordinates to be safe
export const CHESS_HISTORY_ERAS: ChessEra[] = [
    {
        id: "romantic_era",
        title: "The Romantic Era",
        years: "1800s - 1880s",
        description: "An age of swashbuckling attacks, kingside dashes, and glorious sacrifices. Defense was considered cowardly.",
        players: [
            {
                id: "morphy",
                name: "Paul Morphy",
                years: "1837 – 1884",
                nationality: "American",
                tagline: "The first great attacking genius",
                achievements: "Unofficial World Champion, defeated all European masters in a historic tour.",
                playstyleCharacteristics: [
                    "Valued rapid development over material.",
                    "Fierce, calculating attacker.",
                    "Pioneered the concept of open lines and initiative."
                ],
                lesson: {
                    startStateMoves: [
                        { fr: 6, fc: 4, tr: 4, tc: 4 }, // e4
                        { fr: 1, fc: 4, tr: 3, tc: 4 }, // e5
                        { fr: 7, fc: 6, tr: 5, tc: 5 }, // Nf3
                        { fr: 0, fc: 1, tr: 2, tc: 2 }  // Nc6
                    ],
                    interactiveMoves: [
                        { notation: "Bc4", fr: 7, fc: 5, tr: 4, tc: 2, explanation: "Morphy develops quickly, targeting the weak f7 pawn immediately." },
                        { notation: "Bc5", fr: 0, fc: 5, tr: 3, tc: 2, explanation: "Black develops naturally, preparing to battle for the center." },
                        { notation: "b4", fr: 6, fc: 1, tr: 4, tc: 1, explanation: "The Evans Gambit! Morphy sacrifices a pawn purely to accelerate his piece development and open attacking lines." }
                    ]
                },
                simulation: {
                    boardSetupMoves: [
                        { fr: 6, fc: 4, tr: 4, tc: 4 }, // e4
                        { fr: 1, fc: 4, tr: 3, tc: 4 }, // e5
                        { fr: 7, fc: 6, tr: 5, tc: 5 }, // Nf3
                        { fr: 0, fc: 1, tr: 2, tc: 2 }, // Nc6
                        { fr: 7, fc: 5, tr: 4, tc: 2 }, // Bc4
                        { fr: 1, fc: 3, tr: 2, tc: 3 }  // d6
                    ],
                    options: [
                        { notation: "c3", isCorrect: true, explanation: "Morphy prepares to push d4 to completely blow the center open and mobilize his forces rapidly!" },
                        { notation: "d3", isCorrect: false, explanation: "A solid positional move, but too slow for Morphy's bloodthirsty style." },
                        { notation: "a3", isCorrect: false, explanation: "Too passive. Morphy never wasted time with early sideways pawn moves." }
                    ]
                },
                arenaChallenges: [
                {
                    id: 'morphy_t1',
                    tier: 1,
                    title: 'The Romantic Genius',
                    description: 'Develop quickly, open the position, and attack before your opponent can breathe.',
                    bossPassive: 'Initiative Bias - Severe penalties for slow, waiting moves.',
                    startingMeter: 30,
                    meterTarget: 100,
                    rewards: { gold: 200, intelligenceXp: 75 },
                    turns: [
                        {
                            fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                            prompt: 'You have a lead in development. What should you do?',
                            bossResponseSan: '...Nc6',
                            evaluations: [
                                { moveSan: 'Bc4', fr: 7, fc: 5, tr: 4, tc: 2, grade: 'perfect', styleDelta: +25, feedback: 'Perfect. Morphy immediately targets f7 and accelerates the attack.' },
                                { moveSan: 'Nf3', fr: 7, fc: 6, tr: 5, tc: 5, grade: 'good', styleDelta: +10, feedback: 'Good. Development continues, but Morphy might play even more aggressively.' },
                                { moveSan: 'a3', fr: 6, fc: 0, tr: 5, tc: 0, grade: 'blunder', styleDelta: -30, feedback: 'Too slow. Morphy punishes wasted time instantly.' }
                            ]
                        },
                        {
                            fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQ1RK1 w kq - 0 5',
                            prompt: 'The center is closed. How do you proceed?',
                            bossResponseSan: '...exd4',
                            evaluations: [
                                { moveSan: 'd4', fr: 6, fc: 3, tr: 4, tc: 3, grade: 'perfect', styleDelta: +25, feedback: 'Perfect. Morphy breaks open the center to activate his pieces.' },
                                { moveSan: 'Re1', fr: 7, fc: 5, tr: 7, tc: 4, grade: 'good', styleDelta: +10, feedback: 'Good preparation, but Morphy often acts immediately.' },
                                { moveSan: 'h3', fr: 6, fc: 7, tr: 5, tc: 7, grade: 'poor', styleDelta: -15, feedback: 'Too slow. This does not improve your position.' }
                            ]
                        },
                        {
                            fen: 'r1bqk1nr/pppp1ppp/2n5/2b5/2BpP3/2P2N2/PP3PPP/RNBQ1RK1 w kq - 0 6',
                            prompt: 'You can sacrifice to open the king. Do you?',
                            bossResponseSan: '...Kxf7',
                            evaluations: [
                                { moveSan: 'Bxf7+', fr: 4, fc: 2, tr: 1, tc: 5, grade: 'perfect', styleDelta: +30, feedback: 'Brilliant. Morphy embraces sacrifice for initiative.' },
                                { moveSan: 'Qd2', fr: 7, fc: 3, tr: 6, tc: 3, grade: 'good', styleDelta: +5, feedback: 'Solid, but less forcing.' },
                                { moveSan: 'a4', fr: 6, fc: 0, tr: 4, tc: 0, grade: 'blunder', styleDelta: -30, feedback: 'You ignored a powerful attacking opportunity.' }
                            ]
                        },
                        {
                            fen: 'r1bq1bnr/pppp1kpp/2n5/2b5/3pP3/2P2N2/PP3PPP/RNBQ1RK1 w - - 0 7',
                            prompt: 'Your rook can enter an open file. What do you do?',
                            bossResponseSan: '...Re8',
                            evaluations: [
                                { moveSan: 'Re1', fr: 7, fc: 5, tr: 7, tc: 4, grade: 'perfect', styleDelta: +20, feedback: 'Excellent. Morphy activates rooks early.' },
                                { moveSan: 'cxd4', fr: 5, fc: 2, tr: 4, tc: 3, grade: 'good', styleDelta: +10, feedback: 'Decent, but slower than attacking immediately.' },
                                { moveSan: 'b3', fr: 6, fc: 1, tr: 5, tc: 1, grade: 'poor', styleDelta: -15, feedback: 'Too passive.' }
                            ]
                        },
                        {
                            fen: 'r1bqrbb1/pppp1kpp/2n5/2b3N1/3pP3/2P5/PP3PPP/RNBQR1K1 w - - 3 8',
                            prompt: 'You have initiative. How do you finish?',
                            bossResponseSan: '...g6',
                            evaluations: [
                                { moveSan: 'Qh5+', fr: 7, fc: 3, tr: 3, tc: 7, grade: 'perfect', styleDelta: +30, feedback: 'Perfect. Morphy finishes with direct pressure.' },
                                { moveSan: 'Nd2', fr: 7, fc: 1, tr: 6, tc: 3, grade: 'poor', styleDelta: -20, feedback: 'You gave up momentum.' },
                                { moveSan: 'g3', fr: 6, fc: 6, tr: 5, tc: 6, grade: 'blunder', styleDelta: -30, feedback: 'Completely unnecessary.' }
                            ]
                        }
                    ]
                }
            ]
            }
        ]
    },
    {
        id: "classical_era",
        title: "The Classical Era",
        years: "1880s - 1920s",
        description: "The formulation of positional chess. Structure, weak squares, and pawn formations began to rule the board.",
        players: [
            {
                id: "steinitz",
                name: "Wilhelm Steinitz",
                years: "1836 – 1900",
                nationality: "Austrian / American",
                tagline: "The father of positional chess",
                achievements: "The First Official World Chess Champion.",
                playstyleCharacteristics: [
                    "Defended relentlessly to prove the opponent's attack was flawed.",
                    "Valued the bishop pair and solid pawn structures.",
                    "Accumulated small advantages into quiet victories."
                ],
                lesson: {
                    startStateMoves: [
                        { fr: 6, fc: 4, tr: 4, tc: 4 }, // e4
                        { fr: 1, fc: 4, tr: 3, tc: 4 }, // e5
                        { fr: 7, fc: 6, tr: 5, tc: 5 }, // Nf3
                        { fr: 0, fc: 1, tr: 2, tc: 2 }  // Nc6
                    ],
                    interactiveMoves: [
                        { notation: "Bb5", fr: 7, fc: 5, tr: 3, tc: 1, explanation: "The Ruy Lopez. Unlike Morphy, Steinitz preferred the long-term positional pressure of pinning the knight." },
                        { notation: "a6", fr: 1, fc: 0, tr: 2, tc: 0, explanation: "Black questions the bishop. Will Steinitz retreat or capture?" },
                        { notation: "Bxc6", fr: 3, fc: 1, tr: 2, tc: 2, explanation: "He frequently captured immediately to double Black's pawns, securing a permanent structural advantage." }
                    ]
                },
                simulation: null
            },
            {
                id: "capablanca",
                name: "José Raúl Capablanca",
                years: "1888 – 1942",
                nationality: "Cuban",
                tagline: "The Chess Machine",
                achievements: "Third World Champion, went undefeated for 8 years.",
                playstyleCharacteristics: [
                    "Unrivaled endgame transition and technique.",
                    "Simplified complex, murky positions into clear wins.",
                    "Utterly flawless tactical defense."
                ],
                lesson: {
                    startStateMoves: [
                        { fr: 6, fc: 3, tr: 4, tc: 3 }, // d4
                        { fr: 1, fc: 3, tr: 3, tc: 3 }, // d5
                        { fr: 6, fc: 2, tr: 4, tc: 2 }, // c4
                        { fr: 1, fc: 4, tr: 2, tc: 4 }  // e6
                    ],
                    interactiveMoves: [
                        { notation: "Nc3", fr: 7, fc: 1, tr: 5, tc: 2, explanation: "Developing naturally in the Queen's Gambit Declined." },
                        { notation: "Nf6", fr: 0, fc: 6, tr: 2, tc: 5, explanation: "Black defends the center solidly." },
                        { notation: "Bg5", fr: 7, fc: 2, tr: 3, tc: 6, explanation: "Capablanca classically pins the knight, aiming to simplify the position and trade pieces if it yields a superior pawn structure." }
                    ]
                },
                simulation: null
            }
        ]
    },
    {
        id: "modern_era",
        title: "The Dynamic Modern Era",
        years: "1960s - Present",
        description: "A blending of deep universal understanding, raw tactical dynamism, and computer-assisted preparation.",
        players: [
            {
                id: "kasparov",
                name: "Garry Kasparov",
                years: "1963 – Present",
                nationality: "Russian",
                tagline: "The aggressive, unyielding beast",
                achievements: "Thirteenth World Champion, held World No. 1 ranking for 255 months.",
                playstyleCharacteristics: [
                    "Relentless, dynamic attacking player.",
                    "Deep, devastating opening preparation.",
                    "Created terrifying initiative that crushed opponents psychologically."
                ],
                lesson: {
                    // Sicilian Defense
                    startStateMoves: [
                        { fr: 6, fc: 4, tr: 4, tc: 4 }, // e4
                        { fr: 1, fc: 2, tr: 3, tc: 2 }, // c5
                        { fr: 7, fc: 6, tr: 5, tc: 5 }, // Nf3
                        { fr: 1, fc: 3, tr: 2, tc: 3 }  // d6
                    ],
                    interactiveMoves: [
                        { notation: "d4", fr: 6, fc: 3, tr: 4, tc: 3, explanation: "Kasparov immediately clashes in the center, blowing the position open." },
                        { notation: "cxd4", fr: 3, fc: 2, tr: 4, tc: 3, explanation: "Black accepts the challenge." },
                        { notation: "Nxd4", fr: 5, fc: 5, tr: 4, tc: 3, explanation: "Kasparov places his knight powerfully in the center, eager to launch piece assaults against the Black king." }
                    ]
                },
                simulation: null,
                arenaChallenges: [
                    {
                        id: 'kasparov_t1',
                        tier: 1,
                        title: 'The Relentless Attacker',
                        description: 'Take the initiative and never let go. Attack dynamically.',
                        bossPassive: 'Initiative Forcer - Massive penalties for retreating or defensive-only logic.',
                        startingMeter: 30,
                        meterTarget: 100,
                        rewards: { gold: 250, intelligenceXp: 100 },
                        turns: [
                            {
                                fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
                                prompt: 'You can gain tempo. What do you do?',
                                bossResponseSan: '...h6',
                                evaluations: [
                                    { moveSan: 'Ng5', fr: 5, fc: 5, tr: 3, tc: 6, grade: 'perfect', styleDelta: +20, feedback: 'Perfect. Kasparov thrives on forcing threats and immediate tempo.' },
                                    { moveSan: 'Be2', fr: 7, fc: 5, tr: 6, tc: 4, grade: 'poor', styleDelta: -10, feedback: 'Too quiet. Does not seize control.' },
                                    { moveSan: 'd3', fr: 6, fc: 3, tr: 5, tc: 3, grade: 'blunder', styleDelta: -30, feedback: 'You lost the initiative entirely by playing slow.' }
                                ]
                            },
                            {
                                fen: 'r1bq1rk1/ppp2ppp/2n1pn2/8/3P4/2N2N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
                                prompt: 'The center is tense. Break it.',
                                bossResponseSan: '...exd5',
                                evaluations: [
                                    { moveSan: 'd5', fr: 4, fc: 3, tr: 3, tc: 3, grade: 'perfect', styleDelta: +20, feedback: 'Excellent. Kasparov strikes at the center directly.' },
                                    { moveSan: 'Re1', fr: 7, fc: 5, tr: 7, tc: 4, grade: 'good', styleDelta: +10, feedback: 'Decent preparation, but less forcing than taking space.' },
                                    { moveSan: 'a3', fr: 6, fc: 0, tr: 5, tc: 0, grade: 'blunder', styleDelta: -30, feedback: 'This does absolutely nothing to seize control.' }
                                ]
                            },
                            {
                                fen: 'r1bq1rk1/ppp2ppp/2n2n2/3p4/8/2N5/PPP2PPP/R1BQ1R1K w - - 0 9',
                                prompt: 'You can increase pressure rapidly.',
                                bossResponseSan: '...Ne5',
                                evaluations: [
                                    { moveSan: 'Qf3', fr: 7, fc: 3, tr: 5, tc: 5, grade: 'perfect', styleDelta: +20, feedback: 'Perfect coordination and pressure on the kingside.' },
                                    { moveSan: 'h3', fr: 6, fc: 7, tr: 5, tc: 7, grade: 'poor', styleDelta: -15, feedback: 'Too slow and unchallenging.' },
                                    { moveSan: 'Kg1', fr: 7, fc: 7, tr: 7, tc: 6, grade: 'blunder', styleDelta: -30, feedback: 'You stepped back instead of moving forward.' }
                                ]
                            },
                            {
                                fen: 'r1bq1rk1/ppp2ppp/2n5/3pn3/8/2N2Q2/PPP2PPP/R4R1K w - - 0 10',
                                prompt: 'Keep the pressure scaling, or simplify?',
                                bossResponseSan: '...Qh4',
                                evaluations: [
                                    { moveSan: 'Rae1', fr: 7, fc: 0, tr: 7, tc: 4, grade: 'perfect', styleDelta: +20, feedback: 'Perfect. The pressure increases as pieces activate.' },
                                    { moveSan: 'Qxd5', fr: 5, fc: 5, tr: 3, tc: 3, grade: 'poor', styleDelta: -15, feedback: 'You cashed in too early and reduced the pressure.' },
                                    { moveSan: 'b3', fr: 6, fc: 1, tr: 5, tc: 1, grade: 'blunder', styleDelta: -30, feedback: 'Too passive in a tense situation.' }
                                ]
                            },
                            {
                                fen: 'r1b2rk1/ppp2ppp/2n5/3pP3/2N4q/8/PPP3PP/R4R1K w - - 0 11',
                                prompt: 'Final push. Find the breakthrough.',
                                bossResponseSan: '...fxe6',
                                evaluations: [
                                    { moveSan: 'e6', fr: 3, fc: 4, tr: 2, tc: 4, grade: 'perfect', styleDelta: +30, feedback: 'Devastating breakthrough. The position explodes into tactics.' },
                                    { moveSan: 'Nd2', fr: 4, fc: 2, tr: 6, tc: 3, grade: 'poor', styleDelta: -20, feedback: 'You retreated and lost the overwhelming momentum.' },
                                    { moveSan: 'a4', fr: 6, fc: 0, tr: 4, tc: 0, grade: 'blunder', styleDelta: -40, feedback: 'This completely ignores the tactical crisis on the board.' }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                id: "carlsen",
                name: "Magnus Carlsen",
                years: "1990 – Present",
                nationality: "Norwegian",
                tagline: "The Endgame Virtuoso",
                achievements: "Sixteenth World Champion, highest rating in human history.",
                playstyleCharacteristics: [
                    "Peerless endgame technique and quiet maneuvering.",
                    "Squeezes tiny advantages until the opponent breaks.",
                    "Extremely universal, playing almost any opening."
                ],
                lesson: {
                    startStateMoves: [
                        { fr: 6, fc: 3, tr: 4, tc: 3 }, // d4
                        { fr: 0, fc: 6, tr: 2, tc: 5 }  // Nf6
                    ],
                    interactiveMoves: [
                        { notation: "Nf3", fr: 7, fc: 6, tr: 5, tc: 5, explanation: "Carlsen prefers flexible, non-committal moves that avoid heavy early theory." }
                    ]
                },
                simulation: null,
                arenaChallenges: [
                    {
                        id: 'carlsen_t1',
                        tier: 1,
                        title: 'The Endgame Virtuoso',
                        description: 'Improve quietly until the position collapses under its own weight.',
                        bossPassive: 'Positional Squeeze - Punishes overextension and unnecessary forcing tactics.',
                        startingMeter: 50,
                        meterTarget: 100,
                        rewards: { gold: 300, intelligenceXp: 120 },
                        turns: [
                            {
                                fen: 'r1bq1rk1/ppp2ppp/2n1p3/3p4/3P4/2N5/PPP2PPP/R1BQ1RK1 w - - 0 10',
                                prompt: 'Improve your position.',
                                bossResponseSan: '...Re8',
                                evaluations: [
                                    { moveSan: 'Re1', fr: 7, fc: 5, tr: 7, tc: 4, grade: 'perfect', styleDelta: +15, feedback: 'Perfect. Carlsen improves gradually and contests the center.' },
                                    { moveSan: 'h4', fr: 6, fc: 7, tr: 4, tc: 7, grade: 'poor', styleDelta: -10, feedback: 'Creates weaknesses without justification.' },
                                    { moveSan: 'Qh5', fr: 7, fc: 3, tr: 3, tc: 7, grade: 'blunder', styleDelta: -25, feedback: 'Unnecessary aggression. Carlsen waits for the right moment.' }
                                ]
                            },
                            {
                                fen: 'r1bqr1k1/ppp2ppp/2n1p3/3p4/3P4/2N2N2/PPP2PPP/R1BQR1K1 w - - 0 11',
                                prompt: 'No tactics available. Proceed calmly.',
                                bossResponseSan: '...a5',
                                evaluations: [
                                    { moveSan: 'Nd2', fr: 5, fc: 5, tr: 6, tc: 3, grade: 'perfect', styleDelta: +15, feedback: 'Quiet and strong. Preparing to reroute to better squares.' },
                                    { moveSan: 'a4', fr: 6, fc: 0, tr: 4, tc: 0, grade: 'poor', styleDelta: -10, feedback: 'Does not improve your piece coordination.' },
                                    { moveSan: 'g4', fr: 6, fc: 6, tr: 4, tc: 6, grade: 'blunder', styleDelta: -30, feedback: 'Too aggressive. You overextended severely.' }
                                ]
                            },
                            {
                                fen: 'r1bqr1k1/1pp2ppp/2n1p3/p2p4/3P4/2N2Q2/PPPN1PPP/R1B1R1K1 w - - 0 12',
                                prompt: 'Simplify or complicate?',
                                bossResponseSan: '...Qxd5',
                                evaluations: [
                                    { moveSan: 'Qxd5', fr: 5, fc: 5, tr: 3, tc: 3, grade: 'perfect', styleDelta: +20, feedback: 'Carlsen happily transitions to a structurally superior endgame.' },
                                    { moveSan: 'b3', fr: 6, fc: 1, tr: 5, tc: 1, grade: 'poor', styleDelta: -10, feedback: 'Slow, and allows Black to dictate the flow.' },
                                    { moveSan: 'f4', fr: 6, fc: 5, tr: 4, tc: 5, grade: 'blunder', styleDelta: -25, feedback: 'Too risky. You are breaking your own solid structure.' }
                                ]
                            },
                            {
                                fen: 'r3r1k1/1p3ppp/2p5/p2p4/3P4/2N3P1/PPPN1P1P/R2QR1K1 w - - 0 13',
                                prompt: 'You have a slight edge.',
                                bossResponseSan: '...Kg7',
                                evaluations: [
                                    { moveSan: 'Kg2', fr: 7, fc: 6, tr: 6, tc: 6, grade: 'perfect', styleDelta: +20, feedback: 'Classic Carlsen move. The King is an active piece in the endgame.' },
                                    { moveSan: 'h3', fr: 6, fc: 7, tr: 5, tc: 7, grade: 'poor', styleDelta: -10, feedback: 'Too passive.' },
                                    { moveSan: 'Qh5', fr: 7, fc: 3, tr: 3, tc: 7, grade: 'blunder', styleDelta: -30, feedback: 'Not necessary! Stop trying to force checkmates.' }
                                ]
                            },
                            {
                                fen: 'r3r3/1p3pkp/2p5/p2p4/3P4/2N3P1/PPPN1K1P/R7 w - - 0 14',
                                prompt: 'Endgame advantage secured.',
                                bossResponseSan: '...Rd8',
                                evaluations: [
                                    { moveSan: 'Rd1', fr: 7, fc: 0, tr: 7, tc: 3, grade: 'perfect', styleDelta: +30, feedback: 'Maximizing piece activity. The squeeze is complete.' },
                                    { moveSan: 'a3', fr: 6, fc: 0, tr: 5, tc: 0, grade: 'poor', styleDelta: -10, feedback: 'Does nothing important.' },
                                    { moveSan: 'g4', fr: 5, fc: 6, tr: 4, tc: 6, grade: 'blunder', styleDelta: -25, feedback: 'Creates targets unnecessarily.' }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
];
