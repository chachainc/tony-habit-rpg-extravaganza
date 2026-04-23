export interface LessonStep {
    step: number;
    side: "white" | "black";
    move: string;
    from: string;
    to: string;
    highlights: string[];
    explanation: string;
    warning?: string;
}

export const italianGame: LessonStep[] = [
    {
        step: 1,
        side: "white",
        move: "e4",
        from: "e2",
        to: "e4",
        highlights: ["e4", "d5", "f5"],
        explanation: "Control the center immediately. White stakes a claim on the central squares and opens lines for the Queen and Bishop.",
        warning: "Never start a game without fighting for the center!"
    },
    {
        step: 2,
        side: "black",
        move: "e5",
        from: "e7",
        to: "e5",
        highlights: ["e5", "d4", "f4"],
        explanation: "Black responds symmetrically, fiercely contesting the center and preventing White from claiming full dominance.",
    },
    {
        step: 3,
        side: "white",
        move: "Nf3",
        from: "g1",
        to: "f3",
        highlights: ["e5", "d4"],
        explanation: "Develop a piece and attack at the exact same time! This knight immediately threatens Black's central pawn.",
    },
    {
        step: 4,
        side: "black",
        move: "Nc6",
        from: "b8",
        to: "c6",
        highlights: ["e5", "d4"],
        explanation: "Black naturally develops a piece while defending the attacked e5 pawn. An elegant, multipurpose move.",
    },
    {
        step: 5,
        side: "white",
        move: "Bc4",
        from: "f1",
        to: "c4",
        highlights: ["f7"],
        explanation: "The defining move of the Italian Game! The Bishop eyes the weak f7 pawn, a notoriously vulnerable square near the King.",
        warning: "The f7 pawn is only defended by the King. This is where early checkmates happen!"
    },
    {
        step: 6,
        side: "black",
        move: "Bc5",
        from: "f8",
        to: "c5",
        highlights: ["d4", "f2"],
        explanation: "The Giuoco Piano ('Quiet Game'). Black mirrors White, developing their own bishop to an active diagonal.",
    },
    {
        step: 7,
        side: "white",
        move: "c3",
        from: "c2",
        to: "c3",
        highlights: ["d4"],
        explanation: "White prepares a massive central strike! This pawn supports an impending d4 push to dominate the board.",
    },
    {
        step: 8,
        side: "black",
        move: "Nf6",
        from: "g8",
        to: "f6",
        highlights: ["e4"],
        explanation: "Black ignores the threat and continues development, counter-attacking White's e4 pawn instead.",
        warning: "Both sides are now perfectly poised for a sharp, tactical battle!"
    }
];
