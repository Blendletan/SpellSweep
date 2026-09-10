import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

import {
  createDictionaryIndex,
  createGame,
  findMinimumWordSolution,
  generateCandidateBoard,
  isSolvableBoard,
  parseDictionary,
  seededRandom,
  submitWord,
} from "../src/game.ts";

const dictionaryUrl = new URL("../data/dictionary.txt", import.meta.url);

const readStarted = performance.now();
const dictionaryText = await readFile(dictionaryUrl, "utf8");
const readMilliseconds = performance.now() - readStarted;

const parseStarted = performance.now();
const words = parseDictionary(dictionaryText);
const parseMilliseconds = performance.now() - parseStarted;

const indexStarted = performance.now();
const dictionary = createDictionaryIndex(words);
const indexMilliseconds = performance.now() - indexStarted;

const generationTimes: number[] = [];
const solvabilityTimes: number[] = [];
const answerTimes: number[] = [];
const attemptsPerBoard: number[] = [];
const boards: (readonly string[])[] = [];

for (let boardNumber = 1; boardNumber <= 10; boardNumber += 1) {
  const random = seededRandom(`performance-${boardNumber}`);
  const generationStarted = performance.now();
  let attempts = 0;
  let board: readonly string[];

  do {
    attempts += 1;
    board = generateCandidateBoard(random);
  } while (!isSolvableBoard(board, dictionary));

  generationTimes.push(performance.now() - generationStarted);
  attemptsPerBoard.push(attempts);
  boards.push(board);

  const solvabilityStarted = performance.now();
  isSolvableBoard(board, dictionary);
  solvabilityTimes.push(performance.now() - solvabilityStarted);

  const answerStarted = performance.now();
  findMinimumWordSolution(board, dictionary);
  answerTimes.push(performance.now() - answerStarted);
}

const exampleBoard = boards[0];
const exampleAnswer = findMinimumWordSolution(exampleBoard, dictionary)[0];
const exampleGame = createGame(exampleBoard);
const submissionStarted = performance.now();
for (let repetition = 0; repetition < 10_000; repetition += 1) {
  submitWord(exampleGame, exampleAnswer.path, exampleAnswer.word, dictionary.words);
}
const submissionMilliseconds = performance.now() - submissionStarted;

console.log("SpellSweep performance (10 deterministic boards)");
console.log(`Dictionary file read: ${format(readMilliseconds)} ms`);
console.log(`Dictionary parse: ${format(parseMilliseconds)} ms`);
console.log(`Dictionary prefix index: ${format(indexMilliseconds)} ms`);
console.log(`Board generation: ${summary(generationTimes)} ms`);
console.log(`Generation attempts: ${summary(attemptsPerBoard)}`);
console.log(`Solvability check: ${summary(solvabilityTimes)} ms`);
console.log(`Exact minimum answer: ${summary(answerTimes)} ms`);
console.log(
  `Valid submission: ${format(submissionMilliseconds / 10_000)} ms average`,
);

function summary(values: readonly number[]): string {
  const sorted = [...values].sort((first, second) => first - second);
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  return `avg ${format(average)}, median ${format(median)}, max ${format(sorted.at(-1) ?? 0)}`;
}

function format(value: number): string {
  return value.toFixed(2);
}
