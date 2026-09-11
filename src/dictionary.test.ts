import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createDictionaryIndex,
  findMinimumWordSolution,
  isValidWord,
  isSolvableBoard,
  PAR_MARGIN,
  parseDictionary,
  selectPuzzle,
} from "./game.ts";
import {
  TUTORIAL_BOARD,
  TUTORIAL_OPTIMAL_WORDS,
  TUTORIAL_PAR,
  TUTORIAL_PERFECT,
  TUTORIAL_STEPS,
  TUTORIAL_SUBOPTIMAL_WORDS,
} from "./tutorial.ts";

test("the authoritative dictionary loads and can produce a daily puzzle", async () => {
  const dictionaryText = await readFile(
    new URL("../data/dictionary.txt", import.meta.url),
    "utf8",
  );
  const words = parseDictionary(dictionaryText);

  assert.equal(words.size, 178_691);
  assert.equal(words.has("aa"), true);
  assert.equal(words.has("cat"), true);
  assert.equal(words.has("zyzzyvas"), true);

  const dictionary = createDictionaryIndex(words);
  const date = new Date(2026, 8, 8, 12);
  const first = selectPuzzle(dictionary, true, date);
  const second = selectPuzzle(dictionary, true, date);

  assert.deepEqual(first, second);
  assert.equal(isSolvableBoard(first, dictionary), true);

  for (const day of [8, 9, 10]) {
    const board = selectPuzzle(dictionary, true, new Date(2026, 8, day, 12));
    const solution = findMinimumWordSolution(board, dictionary);
    const covered = new Set(solution.flatMap(({ path }) => path));
    assert.equal(covered.size, 25);
    for (const { word, path } of solution) {
      assert.equal(isValidWord(board, path, word, dictionary.words), true);
    }
  }

  for (const { word, path } of [
    ...TUTORIAL_SUBOPTIMAL_WORDS,
    ...TUTORIAL_OPTIMAL_WORDS,
  ]) {
    assert.equal(
      isValidWord(TUTORIAL_BOARD, path, word, dictionary.words),
      true,
      `${word} must be a valid tutorial path`,
    );
  }

  const suboptimalCoverage = new Set(
    TUTORIAL_SUBOPTIMAL_WORDS.flatMap(({ path }) => path),
  );
  const optimalCoverage = new Set(
    TUTORIAL_OPTIMAL_WORDS.flatMap(({ path }) => path),
  );
  const exactTutorialSolution = findMinimumWordSolution(TUTORIAL_BOARD, dictionary);

  assert.equal(TUTORIAL_SUBOPTIMAL_WORDS.length, 6);
  assert.equal(suboptimalCoverage.size, 25);
  assert.equal(TUTORIAL_OPTIMAL_WORDS.length, TUTORIAL_PERFECT);
  assert.equal(optimalCoverage.size, 25);
  assert.equal(exactTutorialSolution.length, TUTORIAL_PERFECT);
  assert.equal(TUTORIAL_PAR, TUTORIAL_PERFECT + PAR_MARGIN);
  assert.equal(
    TUTORIAL_SUBOPTIMAL_WORDS.filter(({ word }) => word === "bread").length,
    2,
  );
  assert.notDeepEqual(
    TUTORIAL_SUBOPTIMAL_WORDS[4]?.path,
    TUTORIAL_SUBOPTIMAL_WORDS[5]?.path,
  );
  assert.deepEqual(TUTORIAL_SUBOPTIMAL_WORDS[1]?.path, [0, 1, 5]);
  assert.equal(TUTORIAL_STEPS.length, 11);
  assert.equal(TUTORIAL_STEPS[0]?.isWelcome, true);
  assert.equal(TUTORIAL_STEPS[1]?.title, "Cover the board");
  assert.equal(TUTORIAL_STEPS.at(-2)?.showOptimalSolution, true);
});
