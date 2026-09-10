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
  pausedAt: number | null;
  pausedMilliseconds: number;
  completedAt: number | null;
  gaveUpAt: number | null;
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

export type WordPath = Readonly<{
  word: string;
  path: readonly number[];
}>;

export type RandomSource = () => number;

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const ALL_TILES_MASK = (1 << TILE_COUNT) - 1;

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
    pausedAt: null,
    pausedMilliseconds: 0,
    completedAt: null,
    gaveUpAt: null,
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
    isGameOver(state) ||
    isGamePaused(state) ||
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
  const end = state.completedAt ?? state.gaveUpAt ?? now;
  const currentPause = state.pausedAt === null
    ? 0
    : Math.max(0, end - state.pausedAt);
  return Math.max(
    0,
    end - state.startedAt - state.pausedMilliseconds - currentPause,
  );
}

export function isGameOver(state: GameState): boolean {
  return state.completedAt !== null || state.gaveUpAt !== null;
}

export function isGamePaused(state: GameState): boolean {
  return state.pausedAt !== null;
}

export function pauseGame(
  state: GameState,
  pausedAt = Date.now(),
): GameState {
  if (isGameOver(state) || isGamePaused(state)) {
    return state;
  }

  return { ...state, pausedAt };
}

export function resumeGame(
  state: GameState,
  resumedAt = Date.now(),
): GameState {
  if (isGameOver(state) || state.pausedAt === null) {
    return state;
  }

  return {
    ...state,
    pausedAt: null,
    pausedMilliseconds:
      state.pausedMilliseconds + Math.max(0, resumedAt - state.pausedAt),
  };
}

export function giveUp(state: GameState, gaveUpAt = Date.now()): GameState {
  if (isGameOver(state)) {
    return state;
  }

  const playingState = resumeGame(state, gaveUpAt);
  return { ...playingState, gaveUpAt };
}

export function playableCoverage(
  board: Board,
  dictionary: DictionaryIndex,
): readonly boolean[] {
  assertValidBoard(board);

  const covered = Array(TILE_COUNT).fill(false) as boolean[];
  visitValidWordPaths(board, dictionary, (_word, path) => {
    for (const tileIndex of path) {
      covered[tileIndex] = true;
    }
  });

  return covered;
}

export function isSolvableBoard(
  board: Board,
  dictionary: DictionaryIndex,
): boolean {
  return playableCoverage(board, dictionary).every(Boolean);
}

export function findMinimumWordSolution(
  board: Board,
  dictionary: DictionaryIndex,
): readonly WordPath[] {
  assertValidBoard(board);

  const candidates: WordPath[] = [];
  visitValidWordPaths(board, dictionary, (word, path) => {
    candidates.push({ word, path: [...path] });
  });

  const solution = minimumWordCover(candidates);
  if (!solution) {
    throw new Error("Cannot reveal an answer for an unsolvable board.");
  }
  return solution;
}

export function minimumWordCover(
  wordPaths: readonly WordPath[],
): readonly WordPath[] | null {
  type Candidate = Readonly<{
    mask: number;
    wordPath: WordPath;
    key: string;
  }>;

  const candidateByMask = new Map<number, Candidate>();
  for (const wordPath of wordPaths) {
    const mask = pathMask(wordPath.path);
    const key = `${wordPath.word}|${wordPath.path
      .map((tileIndex) => String(tileIndex).padStart(2, "0"))
      .join(",")}`;
    const existing = candidateByMask.get(mask);

    if (!existing || key < existing.key) {
      candidateByMask.set(mask, { mask, wordPath, key });
    }
  }

  const candidates = [...candidateByMask.values()].sort((first, second) =>
    first.key.localeCompare(second.key),
  );
  const availableCoverage = candidates.reduce(
    (coverage, candidate) => coverage | candidate.mask,
    0,
  );
  if (availableCoverage !== ALL_TILES_MASK) {
    return null;
  }

  const candidatesByTile: Candidate[][] = Array.from(
    { length: TILE_COUNT },
    () => [],
  );
  for (const candidate of candidates) {
    for (let tileIndex = 0; tileIndex < TILE_COUNT; tileIndex += 1) {
      if ((candidate.mask & (1 << tileIndex)) !== 0) {
        candidatesByTile[tileIndex].push(candidate);
      }
    }
  }

  let greedyCoverage = 0;
  const greedySolution: Candidate[] = [];
  while (greedyCoverage !== ALL_TILES_MASK) {
    const uncovered = ALL_TILES_MASK ^ greedyCoverage;
    let bestCandidate: Candidate | undefined;
    let bestGain = 0;

    for (const candidate of candidates) {
      const gain = bitCount(candidate.mask & uncovered);
      if (gain > bestGain) {
        bestCandidate = candidate;
        bestGain = gain;
      }
    }

    if (!bestCandidate) {
      return null;
    }
    greedySolution.push(bestCandidate);
    greedyCoverage |= bestCandidate.mask;
  }

  let bestSolution = greedySolution;
  const shallowestDepthForCoverage = new Map<number, number>();

  function search(coverage: number, chosen: Candidate[]): void {
    if (coverage === ALL_TILES_MASK) {
      if (chosen.length < bestSolution.length) {
        bestSolution = [...chosen];
      }
      return;
    }

    const previousDepth = shallowestDepthForCoverage.get(coverage);
    if (previousDepth !== undefined && previousDepth <= chosen.length) {
      return;
    }
    shallowestDepthForCoverage.set(coverage, chosen.length);

    const uncovered = ALL_TILES_MASK ^ coverage;
    let largestGain = 0;
    for (const candidate of candidates) {
      largestGain = Math.max(largestGain, bitCount(candidate.mask & uncovered));
    }
    if (largestGain === 0) {
      return;
    }

    const minimumAdditionalWords = Math.ceil(bitCount(uncovered) / largestGain);
    if (chosen.length + minimumAdditionalWords >= bestSolution.length) {
      return;
    }

    let options: Candidate[] | undefined;
    for (let tileIndex = 0; tileIndex < TILE_COUNT; tileIndex += 1) {
      if ((uncovered & (1 << tileIndex)) === 0) {
        continue;
      }

      const tileOptions = candidatesByTile[tileIndex].filter(
        (candidate) => (candidate.mask & uncovered) !== 0,
      );
      if (!options || tileOptions.length < options.length) {
        options = tileOptions;
      }
    }

    options?.sort((first, second) => {
      const gainDifference =
        bitCount(second.mask & uncovered) - bitCount(first.mask & uncovered);
      return gainDifference || first.key.localeCompare(second.key);
    });

    for (const candidate of options ?? []) {
      chosen.push(candidate);
      search(coverage | candidate.mask, chosen);
      chosen.pop();
    }
  }

  search(0, []);
  return bestSolution.map((candidate) => candidate.wordPath);
}

export function shareText(state: GameState, pageUrl: string): string {
  if (state.gaveUpAt !== null) {
    return `SpellSweep\nThis one beat me!\n${pageUrl}`;
  }
  if (state.completedAt !== null) {
    return `SpellSweep\n${state.wordsUsed} words in ${formatElapsed(
      elapsedMilliseconds(state),
    )}\n${pageUrl}`;
  }
  throw new Error("A game can only be shared after it ends.");
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

function visitValidWordPaths(
  board: Board,
  dictionary: DictionaryIndex,
  visit: (word: string, path: readonly number[]) => void,
): void {
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
        visit(nextPrefix, path);
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
}

function pathMask(path: readonly number[]): number {
  let mask = 0;
  for (const tileIndex of path) {
    if (!isTileIndex(tileIndex)) {
      throw new Error("A solution path contains an invalid tile index.");
    }
    mask |= 1 << tileIndex;
  }
  return mask;
}

function bitCount(value: number): number {
  let remaining = value;
  let count = 0;
  while (remaining !== 0) {
    remaining &= remaining - 1;
    count += 1;
  }
  return count;
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
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
