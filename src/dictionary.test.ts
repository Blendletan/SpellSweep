import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createDictionaryIndex,
  findMinimumWordSolution,
  isValidWord,
  isSolvableBoard,
  parseDictionary,
  selectPuzzle,
} from "./game.ts";

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
});
