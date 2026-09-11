import type { Board, WordPath } from "./game.js";

export const TUTORIAL_PERFECT = 4;
export const TUTORIAL_PAR = 7;

export const TUTORIAL_BOARD: Board = [
  "h", "o", "u", "s", "e",
  "t", "n", "a", "l", "p",
  "w", "a", "?", "e", "r",
  "b", "r", "e", "a", "d",
  "d", "a", "e", "r", "b",
];

const HOUSE: WordPath = { word: "house", path: [0, 1, 2, 3, 4] };
const HOT: WordPath = { word: "hot", path: [0, 1, 5] };
const PLANT: WordPath = { word: "plant", path: [9, 8, 7, 6, 5] };
const WATER: WordPath = { word: "water", path: [10, 11, 12, 13, 14] };
const FIRST_BREAD: WordPath = { word: "bread", path: [15, 16, 17, 18, 19] };
const SECOND_BREAD: WordPath = { word: "bread", path: [24, 23, 22, 21, 20] };
const HOUSEPLANT: WordPath = {
  word: "houseplant",
  path: [0, 1, 2, 3, 4, 9, 8, 7, 6, 5],
};

export const TUTORIAL_SUBOPTIMAL_WORDS: readonly WordPath[] = [
  HOUSE,
  HOT,
  PLANT,
  WATER,
  FIRST_BREAD,
  SECOND_BREAD,
];

export const TUTORIAL_OPTIMAL_WORDS: readonly WordPath[] = [
  HOUSEPLANT,
  WATER,
  FIRST_BREAD,
  SECOND_BREAD,
];

export type TutorialStep = Readonly<{
  title: string;
  description: string;
  acceptedWordCount: number;
  isWelcome?: boolean;
  activeWord?: WordPath;
  showOptimalSolution?: boolean;
}>;

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: "Welcome to SpellSweep!",
    description:
      "This quick tutorial will show you how to play and improve your score. Select Next to begin, or close this window with the × button or Escape key to start playing right away.",
    acceptedWordCount: 0,
    isWelcome: true,
  },
  {
    title: "Cover the board",
    description:
      "Trace valid words to cover all 25 tiles. SpellSweep uses the North American Scrabble dictionary.",
    acceptedWordCount: 0,
  },
  {
    title: "Make a word",
    description:
      "HOUSE covers its five tiles. Follow touching tiles in order, and never visit the same tile twice within one word.",
    acceptedWordCount: 1,
    activeWord: HOUSE,
  },
  {
    title: "Corners count",
    description:
      "HOT starts on two covered tiles, then moves diagonally from O to T. Covered tiles remain playable, and corner-touching tiles are adjacent.",
    acceptedWordCount: 2,
    activeWord: HOT,
  },
  {
    title: "Reuse is allowed",
    description:
      "PLANT ends on the T that HOT already covered. Tiles may be shared by as many different words as you need.",
    acceptedWordCount: 3,
    activeWord: PLANT,
  },
  {
    title: "Use the wildcard",
    description:
      "The center ? stands for T in WATER. Enter the needed letter when you use it; the wildcard can stand for a different letter in your next word.",
    acceptedWordCount: 4,
    activeWord: WATER,
  },
  {
    title: "Keep sweeping",
    description:
      "BREAD covers the fourth row. Each accepted word adds one to your Score, so fewer words are better.",
    acceptedWordCount: 5,
    activeWord: FIRST_BREAD,
  },
  {
    title: "Words can repeat",
    description:
      "BREAD is valid again along a different path. The repeated word finishes the board and still counts as another word used.",
    acceptedWordCount: 6,
    activeWord: SECOND_BREAD,
  },
  {
    title: "A solid result",
    description: `Solved in 6 words. Perfect is ${TUTORIAL_PERFECT} and Par is ${TUTORIAL_PAR}, so this beats Par—but it uses two more words than necessary.`,
    acceptedWordCount: 6,
  },
  {
    title: "The missed shortcut",
    description: `HOUSEPLANT follows HOUSE straight into PLANT. It replaces HOUSE, HOT, and PLANT with one word, bringing the solution down to Perfect: ${TUTORIAL_PERFECT}.`,
    acceptedWordCount: 6,
    activeWord: HOUSEPLANT,
    showOptimalSolution: true,
  },
  {
    title: "Ready to play",
    description:
      "Cover every tile, reuse letters when helpful, and look for words that do more work. Reveal Answer ends an unfinished run, but you can review this tutorial at any time.",
    acceptedWordCount: 6,
    showOptimalSolution: true,
  },
];
