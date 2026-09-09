import assert from "node:assert/strict";
import test from "node:test";

import {
  areAdjacent,
  assertValidBoard,
  createDictionaryIndex,
  createGame,
  elapsedMilliseconds,
  generateCandidateBoard,
  isSolvableBoard,
  isValidPath,
  isValidWord,
  localDateKey,
  parseDictionary,
  pathPattern,
  playableCoverage,
  seededRandom,
  selectPuzzle,
  submitWord,
  WILDCARD_INDEX,
} from "./game.ts";

function boardWith(overrides: Readonly<Record<number, string>> = {}): string[] {
  const board = Array(25).fill("a");
  board[WILDCARD_INDEX] = "?";

  for (const [index, letter] of Object.entries(overrides)) {
    board[Number(index)] = letter;
  }

  return board;
}

test("a board has exactly 25 tiles and a center wildcard", () => {
  assert.doesNotThrow(() => assertValidBoard(boardWith()));
  assert.throws(() => assertValidBoard(boardWith().slice(0, 24)));
  assert.throws(() => assertValidBoard(boardWith({ [WILDCARD_INDEX]: "a" })));
  assert.throws(() => assertValidBoard(boardWith({ 0: "ab" })));
});

test("adjacency includes all eight neighbors but does not wrap rows", () => {
  for (const neighbor of [6, 7, 8, 11, 13, 16, 17, 18]) {
    assert.equal(areAdjacent(12, neighbor), true);
  }

  assert.equal(areAdjacent(4, 5), false);
  assert.equal(areAdjacent(0, 2), false);
  assert.equal(areAdjacent(0, 0), false);
});

test("a path cannot jump, leave the board, or reuse a tile", () => {
  assert.equal(isValidPath([0, 1, 7, 12]), true);
  assert.equal(isValidPath([0, 2]), false);
  assert.equal(isValidPath([0, 1, 0]), false);
  assert.equal(isValidPath([0, 25]), false);
});

test("a path produces its board pattern", () => {
  const board = boardWith({ 0: "c", 1: "a", 6: "t" });
  assert.equal(pathPattern(board, [0, 1, 6]), "cat");
  assert.throws(() => pathPattern(board, [0, 2]));
});

test("dictionary parsing normalizes words and ignores invalid entries", () => {
  assert.deepEqual(
    [...parseDictionary("Cat\r\nA\n dog \ncan't\nDOG\n")],
    ["cat", "dog"],
  );
});

test("two-letter words are valid and one-letter submissions are not", () => {
  const board = boardWith({ 0: "a", 1: "t" });
  const dictionary = new Set(["at", "a"]);

  assert.equal(isValidWord(board, [0, 1], "AT", dictionary), true);
  assert.equal(isValidWord(board, [0], "a", dictionary), false);
});

test("the wildcard matches one letter and can change between words", () => {
  const board = boardWith({ 11: "c", 13: "t" });
  const dictionary = new Set(["cat", "cot", "cut", "cart"]);
  const path = [11, 12, 13];

  assert.equal(isValidWord(board, path, "cat", dictionary), true);
  assert.equal(isValidWord(board, path, "cot", dictionary), true);
  assert.equal(isValidWord(board, path, "cut", dictionary), true);
  assert.equal(isValidWord(board, path, "cart", dictionary), false);
});

test("an invalid submission has no effect", () => {
  const game = createGame(boardWith({ 0: "c", 1: "a", 6: "t" }), 100);
  const result = submitWord(game, [0, 1, 6], "cab", new Set(["cat"]), 200);

  assert.equal(result.accepted, false);
  assert.equal(result.state, game);
  assert.equal(result.state.wordsUsed, 0);
  assert.equal(result.state.covered.some(Boolean), false);
});

test("accepted words increase the count and permanently add coverage", () => {
  const game = createGame(boardWith({ 0: "c", 1: "a", 6: "t" }), 100);
  const dictionary = new Set(["cat"]);
  const first = submitWord(game, [0, 1, 6], "cat", dictionary, 200);
  const repeated = submitWord(first.state, [0, 1, 6], "cat", dictionary, 300);

  assert.equal(first.accepted, true);
  assert.equal(first.state.wordsUsed, 1);
  assert.deepEqual(
    first.state.covered.flatMap((covered, index) => (covered ? [index] : [])),
    [0, 1, 6],
  );
  assert.equal(repeated.accepted, true);
  assert.equal(repeated.state.wordsUsed, 2);
  assert.deepEqual(repeated.state.covered, first.state.covered);
});

test("covered tiles remain available in later words", () => {
  const board = boardWith({ 0: "c", 1: "a", 2: "r", 6: "t" });
  const dictionary = new Set(["cat", "car"]);
  const first = submitWord(createGame(board), [0, 1, 6], "cat", dictionary);
  const second = submitWord(first.state, [0, 1, 2], "car", dictionary);

  assert.equal(second.accepted, true);
  assert.equal(second.state.wordsUsed, 2);
  assert.equal(second.state.covered[2], true);
});

test("covering the final tiles completes the game immediately", () => {
  const board = boardWith();
  const nearlyComplete = {
    ...createGame(board, 100),
    covered: board.map((_, index) => index !== 0 && index !== 1),
  };
  const result = submitWord(nearlyComplete, [0, 1], "aa", new Set(["aa"]), 475);

  assert.equal(result.accepted, true);
  assert.equal(result.state.completedAt, 475);
  assert.equal(elapsedMilliseconds(result.state, 900), 375);

  const afterCompletion = submitWord(result.state, [0, 1], "aa", new Set(["aa"]), 500);
  assert.equal(afterCompletion.accepted, false);
  assert.equal(afterCompletion.state, result.state);
});

test("elapsed time cannot be negative", () => {
  assert.equal(elapsedMilliseconds(createGame(boardWith(), 500), 400), 0);
});

test("solvability is the union of overlapping valid word paths", () => {
  const dictionary = createDictionaryIndex(new Set(["aa"]));
  assert.equal(isSolvableBoard(boardWith(), dictionary), true);
});

test("a board is unsolvable when one tile occurs in no valid word path", () => {
  const dictionary = createDictionaryIndex(new Set(["aa"]));
  const board = boardWith({ 0: "z" });
  const coverage = playableCoverage(board, dictionary);

  assert.equal(coverage[0], false);
  assert.equal(coverage.slice(1).every(Boolean), true);
  assert.equal(isSolvableBoard(board, dictionary), false);
});

test("solvability search handles wildcard-only coverage and interpretations", () => {
  const board = boardWith(
    Object.fromEntries(Array.from({ length: 25 }, (_, index) => [index, "z"])),
  );
  board[11] = "c";
  board[12] = "?";
  board[13] = "t";

  const dictionary = createDictionaryIndex(new Set(["cat", "cot", "cut"]));
  const coveredIndexes = playableCoverage(board, dictionary).flatMap(
    (covered, index) => (covered ? [index] : []),
  );

  assert.deepEqual(coveredIndexes, [11, 12, 13]);
});

test("candidate boards use weighted letters and always center the wildcard", () => {
  const lowest = generateCandidateBoard(() => 0);
  const highest = generateCandidateBoard(() => 0.999999);

  assert.equal(lowest[12], "?");
  assert.equal(highest[12], "?");
  assert.equal(lowest.filter((tile) => tile === "?").length, 1);
  assert.equal(lowest.every((tile, index) => index === 12 || tile === "a"), true);
  assert.equal(highest.every((tile, index) => index === 12 || tile === "z"), true);
});

test("seeded random values are reproducible", () => {
  const first = seededRandom("2026-09-08");
  const second = seededRandom("2026-09-08");
  const third = seededRandom("2026-09-09");

  const firstValues = [first(), first(), first()];
  assert.deepEqual(firstValues, [second(), second(), second()]);
  assert.notDeepEqual(firstValues, [third(), third(), third()]);
});

test("the local date key uses local calendar fields", () => {
  const date = new Date(2026, 8, 8, 23, 59, 59);
  assert.equal(localDateKey(date), "2026-09-08");
});

test("daily selection is stable while debug selection uses its random source", () => {
  const allPairs = new Set<string>();
  for (const first of "abcdefghijklmnopqrstuvwxyz") {
    for (const second of "abcdefghijklmnopqrstuvwxyz") {
      allPairs.add(first + second);
    }
  }
  const dictionary = createDictionaryIndex(allPairs);
  const date = new Date(2026, 8, 8, 12);

  const dailyFirst = selectPuzzle(dictionary, true, date);
  const dailySecond = selectPuzzle(dictionary, true, date);
  const debugFirst = selectPuzzle(dictionary, false, date, () => 0);
  const debugSecond = selectPuzzle(dictionary, false, date, () => 0.999999);

  assert.deepEqual(dailyFirst, dailySecond);
  assert.notDeepEqual(debugFirst, debugSecond);
});
