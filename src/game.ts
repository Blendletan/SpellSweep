export const BOARD_SIZE = 5;
export const TILE_COUNT = BOARD_SIZE * BOARD_SIZE;
export const WILDCARD_INDEX = 12;
export const WILDCARD = "?";

export type Board = readonly string[];

export type GameState = Readonly<{
  board: Board;
  covered: readonly boolean[];
  wordsUsed: number;
  startedAt: number;
  completedAt: number | null;
}>;

export type Submission = Readonly<{
  accepted: boolean;
  state: GameState;
}>;

export type DictionaryIndex = Readonly<{
  words: ReadonlySet<string>;
  prefixes: ReadonlySet<string>;
  maxWordLength: number;
}>;

export type RandomSource = () => number;

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

const LETTER_FREQUENCIES: readonly (readonly [string, number])[] = [
  ["a", 8.167],
  ["b", 1.492],
  ["c", 2.782],
  ["d", 4.253],
  ["e", 12.702],
  ["f", 2.228],
  ["g", 2.015],
  ["h", 6.094],
  ["i", 6.966],
  ["j", 0.153],
  ["k", 0.772],
  ["l", 4.025],
  ["m", 2.406],
  ["n", 6.749],
  ["o", 7.507],
  ["p", 1.929],
  ["q", 0.095],
  ["r", 5.987],
  ["s", 6.327],
  ["t", 9.056],
  ["u", 2.758],
  ["v", 0.978],
  ["w", 2.36],
  ["x", 0.15],
  ["y", 1.974],
  ["z", 0.074],
];

const TOTAL_LETTER_WEIGHT = LETTER_FREQUENCIES.reduce(
  (total, [, weight]) => total + weight,
  0,
);

export function parseDictionary(text: string): Set<string> {
  const words = text
    .split(/\r?\n/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length >= 2 && /^[a-z]+$/.test(word));

  return new Set(words);
}

export function createDictionaryIndex(
  sourceWords: ReadonlySet<string>,
): DictionaryIndex {
  const words = new Set<string>();
  const prefixes = new Set<string>();
  let maxWordLength = 0;

  for (const sourceWord of sourceWords) {
    const word = sourceWord.trim().toLowerCase();
    if (word.length < 2 || !/^[a-z]+$/.test(word)) {
      continue;
    }

    words.add(word);
    maxWordLength = Math.max(maxWordLength, word.length);

    for (let length = 1; length <= word.length; length += 1) {
      prefixes.add(word.slice(0, length));
    }
  }

  return { words, prefixes, maxWordLength };
}

export function createGame(board: Board, startedAt = Date.now()): GameState {
  assertValidBoard(board);

  return {
    board: [...board],
    covered: Array(TILE_COUNT).fill(false),
    wordsUsed: 0,
    startedAt,
    completedAt: null,
  };
}

export function assertValidBoard(board: Board): void {
  if (board.length !== TILE_COUNT) {
    throw new Error(`A SpellSweep board must contain ${TILE_COUNT} tiles.`);
  }

  for (let index = 0; index < board.length; index += 1) {
    const tile = board[index];

    if (index === WILDCARD_INDEX) {
      if (tile !== WILDCARD) {
        throw new Error("The center tile must be the wildcard.");
      }
    } else if (!/^[a-z]$/.test(tile)) {
      throw new Error("Every non-center tile must be one lowercase letter.");
    }
  }
}

export function areAdjacent(firstIndex: number, secondIndex: number): boolean {
  if (!isTileIndex(firstIndex) || !isTileIndex(secondIndex) || firstIndex === secondIndex) {
    return false;
  }

  const firstRow = Math.floor(firstIndex / BOARD_SIZE);
  const firstColumn = firstIndex % BOARD_SIZE;
  const secondRow = Math.floor(secondIndex / BOARD_SIZE);
  const secondColumn = secondIndex % BOARD_SIZE;

  return (
    Math.abs(firstRow - secondRow) <= 1 &&
    Math.abs(firstColumn - secondColumn) <= 1
  );
}

export function isValidPath(path: readonly number[]): boolean {
  const visited = new Set<number>();

  for (let pathIndex = 0; pathIndex < path.length; pathIndex += 1) {
    const tileIndex = path[pathIndex];

    if (!isTileIndex(tileIndex) || visited.has(tileIndex)) {
      return false;
    }

    if (pathIndex > 0 && !areAdjacent(path[pathIndex - 1], tileIndex)) {
      return false;
    }

    visited.add(tileIndex);
  }

  return true;
}

export function pathPattern(board: Board, path: readonly number[]): string {
  if (!isValidPath(path)) {
    throw new Error("Cannot form a word from an invalid path.");
  }

  return path.map((tileIndex) => board[tileIndex]).join("");
}

export function wordMatchesPath(
  board: Board,
  path: readonly number[],
  submittedWord: string,
): boolean {
  if (path.length < 2 || !isValidPath(path)) {
    return false;
  }

  const word = submittedWord.trim().toLowerCase();
  if (word.length !== path.length || !/^[a-z]+$/.test(word)) {
    return false;
  }

  return path.every((tileIndex, wordIndex) => {
    const tile = board[tileIndex];
    return tile === WILDCARD || tile === word[wordIndex];
  });
}

export function isValidWord(
  board: Board,
  path: readonly number[],
  submittedWord: string,
  dictionary: ReadonlySet<string>,
): boolean {
  const word = submittedWord.trim().toLowerCase();
  return dictionary.has(word) && wordMatchesPath(board, path, word);
}

export function submitWord(
  state: GameState,
  path: readonly number[],
  submittedWord: string,
  dictionary: ReadonlySet<string>,
  submittedAt = Date.now(),
): Submission {
  if (
    state.completedAt !== null ||
    !isValidWord(state.board, path, submittedWord, dictionary)
  ) {
    return { accepted: false, state };
  }

  const covered = [...state.covered];
  for (const tileIndex of path) {
    covered[tileIndex] = true;
  }

  const completed = covered.every(Boolean);
  return {
    accepted: true,
    state: {
      ...state,
      covered,
      wordsUsed: state.wordsUsed + 1,
      completedAt: completed ? submittedAt : null,
    },
  };
}

export function elapsedMilliseconds(state: GameState, now = Date.now()): number {
  const end = state.completedAt ?? now;
  return Math.max(0, end - state.startedAt);
}

export function playableCoverage(
  board: Board,
  dictionary: DictionaryIndex,
): readonly boolean[] {
  assertValidBoard(board);

  const covered = Array(TILE_COUNT).fill(false) as boolean[];
  const visited = Array(TILE_COUNT).fill(false) as boolean[];
  const path: number[] = [];

  function search(tileIndex: number, prefix: string): void {
    visited[tileIndex] = true;
    path.push(tileIndex);

    const tile = board[tileIndex];
    const possibleLetters = tile === WILDCARD ? ALPHABET : tile;

    for (const letter of possibleLetters) {
      const nextPrefix = prefix + letter;
      if (!dictionary.prefixes.has(nextPrefix)) {
        continue;
      }

      if (dictionary.words.has(nextPrefix)) {
        for (const usedIndex of path) {
          covered[usedIndex] = true;
        }
      }

      if (nextPrefix.length < dictionary.maxWordLength) {
        for (const neighbor of NEIGHBORS[tileIndex]) {
          if (!visited[neighbor]) {
            search(neighbor, nextPrefix);
          }
        }
      }
    }

    path.pop();
    visited[tileIndex] = false;
  }

  if (dictionary.maxWordLength >= 2) {
    for (let tileIndex = 0; tileIndex < TILE_COUNT; tileIndex += 1) {
      search(tileIndex, "");
    }
  }

  return covered;
}

export function isSolvableBoard(
  board: Board,
  dictionary: DictionaryIndex,
): boolean {
  return playableCoverage(board, dictionary).every(Boolean);
}

export function generateCandidateBoard(random: RandomSource = Math.random): Board {
  const board: string[] = [];

  for (let tileIndex = 0; tileIndex < TILE_COUNT; tileIndex += 1) {
    board.push(tileIndex === WILDCARD_INDEX ? WILDCARD : randomLetter(random));
  }

  return board;
}

export function generateSolvableBoard(
  dictionary: DictionaryIndex,
  random: RandomSource = Math.random,
): Board {
  while (true) {
    const board = generateCandidateBoard(random);
    if (isSolvableBoard(board, dictionary)) {
      return board;
    }
  }
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function seededRandom(seedText: string): RandomSource {
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function selectPuzzle(
  dictionary: DictionaryIndex,
  dailyMode: boolean,
  now = new Date(),
  random: RandomSource = Math.random,
): Board {
  const puzzleRandom = dailyMode ? seededRandom(localDateKey(now)) : random;
  return generateSolvableBoard(dictionary, puzzleRandom);
}

function isTileIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < TILE_COUNT;
}

function randomLetter(random: RandomSource): string {
  let target = random() * TOTAL_LETTER_WEIGHT;

  for (const [letter, weight] of LETTER_FREQUENCIES) {
    target -= weight;
    if (target < 0) {
      return letter;
    }
  }

  return "z";
}

const NEIGHBORS: readonly (readonly number[])[] = Array.from(
  { length: TILE_COUNT },
  (_, tileIndex) => {
    const neighbors: number[] = [];
    for (let candidate = 0; candidate < TILE_COUNT; candidate += 1) {
      if (areAdjacent(tileIndex, candidate)) {
        neighbors.push(candidate);
      }
    }
    return neighbors;
  },
);
