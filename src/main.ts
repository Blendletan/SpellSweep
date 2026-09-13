import {
  areAdjacent,
  createDictionaryIndex,
  createGame,
  dailyPuzzleNumber,
  findMinimumWordSolution,
  giveUp,
  isGameOver,
  isValidPath,
  localDateKey,
  PAR_MARGIN,
  parseDictionary,
  resultSummary,
  selectPuzzle,
  shareText,
  submitWord,
  TILE_COUNT,
  WILDCARD,
  type DictionaryIndex,
  type GameState,
  type WordPath,
} from "./game.js";
import {
  TUTORIAL_BOARD,
  TUTORIAL_OPTIMAL_WORDS,
  TUTORIAL_PAR,
  TUTORIAL_PERFECT,
  TUTORIAL_STEPS,
  TUTORIAL_SUBOPTIMAL_WORDS,
} from "./tutorial.js";

const DAILY_MODE = true;
const SHARE_URL = "https://blendletan.github.io/SpellSweep/";
const DAILY_PROGRESS_COOKIE_NAME = "spellsweepDailyProgress";
const TUTORIAL_COOKIE_NAME = "spellsweepTutorialSeen";
const TUTORIAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

type SavedDailyProgress = {
  dateKey: string;
  board: string;
  covered: string;
  wordsUsed: number;
  completed: boolean;
  gaveUp: boolean;
  answerRevealed: boolean;
  selectedPath: number[];
  wildcardLetter: string;
  selectedAnswerIndex: number;
};

const boardElement = requiredElement<HTMLDivElement>("board");
const scoreElement = requiredElement<HTMLElement>("score-value");
const perfectElement = requiredElement<HTMLElement>("perfect-score");
const parElement = requiredElement<HTMLElement>("par-score");
const coveredCountElement = requiredElement<HTMLElement>("covered-count");
const currentWordElement = requiredElement<HTMLDivElement>("current-word");
const wildcardControl = requiredElement<HTMLLabelElement>("wildcard-control");
const wildcardInput = requiredElement<HTMLInputElement>("wildcard-letter");
const submitButton = requiredElement<HTMLButtonElement>("submit-word");
const clearButton = requiredElement<HTMLButtonElement>("clear-path");
const messageElement = requiredElement<HTMLParagraphElement>("message");
const revealAnswerButton = requiredElement<HTMLButtonElement>("reveal-answer");
const revealedAnswerElement = requiredElement<HTMLElement>("revealed-answer");
const answerSummaryElement = requiredElement<HTMLParagraphElement>("answer-summary");
const answerWordsElement = requiredElement<HTMLDivElement>("answer-words");
const shareResultButton = requiredElement<HTMLButtonElement>("share-result");
const resultDialog = requiredElement<HTMLDialogElement>("result-dialog");
const closeResultDialogButton = requiredElement<HTMLButtonElement>(
  "close-result-dialog",
);
const copyResultButton = requiredElement<HTMLButtonElement>("copy-result");
const resultDialogTitleElement = requiredElement<HTMLHeadingElement>(
  "result-dialog-title",
);
const resultDialogSummaryElement = requiredElement<HTMLParagraphElement>(
  "result-dialog-summary",
);
const resultShareStatusElement = requiredElement<HTMLParagraphElement>(
  "result-share-status",
);
const manualShareElement = requiredElement<HTMLDivElement>("manual-share");
const manualShareTextElement = requiredElement<HTMLTextAreaElement>(
  "manual-share-text",
);
const revealWarningDialog = requiredElement<HTMLDialogElement>("reveal-warning");
const cancelRevealButton = requiredElement<HTMLButtonElement>("cancel-reveal");
const confirmRevealButton = requiredElement<HTMLButtonElement>("confirm-reveal");
const showTutorialButton = requiredElement<HTMLButtonElement>("show-tutorial");
const tutorialDialog = requiredElement<HTMLDialogElement>("tutorial-dialog");
const closeTutorialButton = requiredElement<HTMLButtonElement>("close-tutorial");
const tutorialTitleElement = requiredElement<HTMLHeadingElement>("tutorial-title");
const tutorialDescriptionElement = requiredElement<HTMLParagraphElement>(
  "tutorial-description",
);
const tutorialExampleElement = requiredElement<HTMLElement>("tutorial-example");
const tutorialScoreElement = requiredElement<HTMLElement>("tutorial-score");
const tutorialPerfectElement = requiredElement<HTMLElement>("tutorial-perfect");
const tutorialParElement = requiredElement<HTMLElement>("tutorial-par");
const tutorialCoveredElement = requiredElement<HTMLElement>("tutorial-covered");
const tutorialBoardElement = requiredElement<HTMLDivElement>("tutorial-board");
const tutorialCurrentWordElement = requiredElement<HTMLParagraphElement>(
  "tutorial-current-word",
);
const tutorialWordListElement = requiredElement<HTMLDivElement>(
  "tutorial-word-list",
);
const tutorialProgressRowElement = requiredElement<HTMLDivElement>(
  "tutorial-progress-row",
);
const tutorialStepCountElement = requiredElement<HTMLElement>("tutorial-step-count");
const tutorialProgressElement = requiredElement<HTMLDivElement>("tutorial-progress");
const tutorialBackButton = requiredElement<HTMLButtonElement>("tutorial-back");
const tutorialNextButton = requiredElement<HTMLButtonElement>("tutorial-next");

let dictionary: DictionaryIndex;
let game: GameState;
let selectedPath: number[] = [];
let minimumSolution: readonly WordPath[] = [];
let answerRevealed = false;
let selectedAnswerIndex = 0;
let activeDateKey = localDateKey(new Date());
let activePuzzleNumber = dailyPuzzleNumber(new Date());
let tutorialStepIndex = 0;

submitButton.addEventListener("click", submitSelection);
clearButton.addEventListener("click", clearSelection);
revealAnswerButton.addEventListener("click", requestRevealAnswer);
cancelRevealButton.addEventListener("click", () => {
  revealWarningDialog.close();
  showMessage("Your run is still active.", "neutral");
});
revealWarningDialog.addEventListener("cancel", () => {
  showMessage("Your run is still active.", "neutral");
});
confirmRevealButton.addEventListener("click", () => {
  revealWarningDialog.close();
  void revealAnswer();
});
showTutorialButton.addEventListener("click", openTutorial);
closeTutorialButton.addEventListener("click", () => tutorialDialog.close());
tutorialBackButton.addEventListener("click", () => {
  tutorialStepIndex = Math.max(0, tutorialStepIndex - 1);
  renderTutorial();
});
tutorialNextButton.addEventListener("click", () => {
  if (tutorialStepIndex === TUTORIAL_STEPS.length - 1) {
    tutorialDialog.close();
    return;
  }

  tutorialStepIndex += 1;
  renderTutorial();
});
tutorialDialog.addEventListener("close", rememberTutorialSeen);
shareResultButton.addEventListener("click", openResultDialog);
closeResultDialogButton.addEventListener("click", () => resultDialog.close());
copyResultButton.addEventListener("click", () => void copyShareResult());
wildcardInput.addEventListener("input", () => {
  wildcardInput.value = wildcardInput.value.replace(/[^a-z]/gi, "").slice(0, 1);
  renderSelection();
  persistDailyProgress();
});
document.addEventListener("keydown", handleKeyDown);

void loadGame();
setInterval(checkForNewDailyPuzzle, 30_000);

async function loadGame(): Promise<void> {
  try {
    const response = await fetch("./data/dictionary.txt");
    if (!response.ok) {
      throw new Error(`Dictionary request failed with status ${response.status}.`);
    }

    dictionary = createDictionaryIndex(parseDictionary(await response.text()));
    startPuzzle();
    revealAnswerButton.disabled = false;
    if (!hasSeenTutorial()) {
      openTutorial();
    }
  } catch (error) {
    console.error(error);
    showMessage("The dictionary could not be loaded. Run the game from a web server.", "error");
  }
}

function startPuzzle(): void {
  if (resultDialog.open) {
    resultDialog.close();
  }

  const now = new Date();
  activeDateKey = localDateKey(now);
  activePuzzleNumber = dailyPuzzleNumber(now);
  const saved = DAILY_MODE ? loadDailyProgress(activeDateKey) : undefined;
  game = saved?.game ?? createGame(selectPuzzle(dictionary, DAILY_MODE, now));
  selectedPath = saved?.selectedPath ?? [];
  minimumSolution = findMinimumWordSolution(game.board, dictionary);
  answerRevealed = saved?.answerRevealed ?? false;
  selectedAnswerIndex = Math.min(
    saved?.selectedAnswerIndex ?? 0,
    Math.max(0, minimumSolution.length - 1),
  );
  wildcardInput.value = saved?.wildcardLetter ?? "";
  render();
  showMessage("", "neutral");
  persistDailyProgress();
}

function chooseTile(tileIndex: number): void {
  if (isGameOver(game)) {
    return;
  }

  const previousIndex = selectedPath.at(-1);
  const existingPosition = selectedPath.indexOf(tileIndex);

  if (existingPosition !== -1) {
    if (existingPosition === selectedPath.length - 1) {
      selectedPath.pop();
      showMessage("Removed the last tile.", "neutral");
    } else {
      showMessage("A tile cannot be used twice in the same word.", "error");
    }
  } else if (previousIndex !== undefined && !areAdjacent(previousIndex, tileIndex)) {
    showMessage("The next tile must touch the previous tile.", "error");
  } else {
    selectedPath.push(tileIndex);
    showMessage("", "neutral");
  }

  render();
  persistDailyProgress();
}

function clearSelection(): void {
  selectedPath = [];
  wildcardInput.value = "";
  showMessage("Selection cleared.", "neutral");
  render();
  persistDailyProgress();
}

function handleKeyDown(event: KeyboardEvent): void {
  if (
    event.key !== "Enter" ||
    event.repeat ||
    submitButton.disabled ||
    revealWarningDialog.open ||
    tutorialDialog.open
  ) {
    return;
  }

  const target = event.target;
  if (
    target instanceof HTMLButtonElement &&
    target !== submitButton &&
    !target.classList.contains("tile")
  ) {
    return;
  }

  event.preventDefault();
  submitSelection();
}

function openTutorial(): void {
  tutorialStepIndex = 0;
  renderTutorial();
  if (!tutorialDialog.open) {
    tutorialDialog.showModal();
  }
}

function renderTutorial(): void {
  const step = TUTORIAL_STEPS[tutorialStepIndex];
  const isWelcome = Boolean(step.isWelcome);
  const displayedWords = step.showOptimalSolution
    ? TUTORIAL_OPTIMAL_WORDS
    : TUTORIAL_SUBOPTIMAL_WORDS.slice(0, step.acceptedWordCount);
  const coveredTiles = new Set(displayedWords.flatMap(({ path }) => path));
  const activePath = step.activeWord?.path ?? [];
  const activeWord = step.activeWord?.word ?? "";
  const displayedScore = step.showOptimalSolution
    ? TUTORIAL_OPTIMAL_WORDS.length
    : step.acceptedWordCount;

  tutorialTitleElement.textContent = step.title;
  tutorialDescriptionElement.textContent = step.description;
  tutorialExampleElement.hidden = isWelcome;
  tutorialProgressRowElement.hidden = isWelcome;
  tutorialScoreElement.textContent = String(displayedScore);
  tutorialPerfectElement.textContent = String(TUTORIAL_PERFECT);
  tutorialParElement.textContent = String(TUTORIAL_PAR);
  tutorialCoveredElement.textContent = String(coveredTiles.size);
  tutorialStepCountElement.textContent = `Step ${tutorialStepIndex} of ${
    TUTORIAL_STEPS.length - 1
  }`;
  tutorialBackButton.hidden = isWelcome;
  tutorialBackButton.disabled = isWelcome;
  tutorialNextButton.textContent =
    tutorialStepIndex === TUTORIAL_STEPS.length - 1 ? "Let’s play" : "Next";

  tutorialBoardElement.classList.toggle("optimal", Boolean(step.showOptimalSolution));
  tutorialBoardElement.setAttribute(
    "aria-label",
    activeWord
      ? `Example board with ${coveredTiles.size} tiles covered. ${activeWord.toUpperCase()} is highlighted in selection order.`
      : `Example board with ${coveredTiles.size} of 25 tiles covered.`,
  );
  tutorialBoardElement.replaceChildren(
    createTutorialPath(activePath),
    ...TUTORIAL_BOARD.map((tile, tileIndex) => {
      const tileElement = document.createElement("div");
      const selectedPosition = activePath.indexOf(tileIndex);
      const wildcardPosition = step.activeWord?.path.indexOf(tileIndex) ?? -1;
      const interpretedWildcard =
        tile === WILDCARD && wildcardPosition !== -1
          ? step.activeWord?.word[wildcardPosition]
          : undefined;

      tileElement.className = "tutorial-tile";
      tileElement.classList.toggle("covered", coveredTiles.has(tileIndex));
      tileElement.classList.toggle("selected", selectedPosition !== -1);
      tileElement.classList.toggle("wildcard", tile === WILDCARD);
      tileElement.textContent = (interpretedWildcard ?? tile).toUpperCase();
      tileElement.setAttribute("aria-hidden", "true");

      if (tile === WILDCARD && interpretedWildcard) {
        const wildcardSymbol = document.createElement("span");
        wildcardSymbol.className = "wildcard-symbol";
        wildcardSymbol.textContent = "?";
        tileElement.append(wildcardSymbol);
      }

      if (selectedPosition !== -1) {
        const order = document.createElement("span");
        order.className = "path-order";
        order.textContent = String(selectedPosition + 1);
        tileElement.append(order);
      }

      return tileElement;
    }),
  );

  tutorialCurrentWordElement.textContent = activeWord
    ? activeWord.toUpperCase()
    : step.showOptimalSolution
      ? `PERFECT SOLUTION: ${TUTORIAL_PERFECT} WORDS`
      : step.acceptedWordCount === 0
        ? "NO WORDS PLAYED YET"
        : "PUZZLE SOLVED IN 6 WORDS";

  renderTutorialWords(step.showOptimalSolution, displayedWords);
  tutorialProgressElement.replaceChildren(
    ...TUTORIAL_STEPS.slice(1).map((_, index) => {
      const dot = document.createElement("span");
      dot.className = "tutorial-dot";
      dot.classList.toggle("current", index + 1 === tutorialStepIndex);
      return dot;
    }),
  );
}

function createTutorialPath(path: readonly number[]): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("tutorial-path");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");

  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const current = path[index];
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String((previous % 5) * 20 + 10));
    line.setAttribute("y1", String(Math.floor(previous / 5) * 20 + 10));
    line.setAttribute("x2", String((current % 5) * 20 + 10));
    line.setAttribute("y2", String(Math.floor(current / 5) * 20 + 10));
    svg.append(line);
  }

  return svg;
}

function renderTutorialWords(
  showOptimalSolution: boolean | undefined,
  displayedWords: readonly WordPath[],
): void {
  if (!showOptimalSolution) {
    if (displayedWords.length === 0) {
      tutorialWordListElement.setAttribute("aria-label", "No example words played yet");
      const empty = document.createElement("span");
      empty.className = "tutorial-word-chip";
      empty.textContent = "Words played will appear here";
      tutorialWordListElement.replaceChildren(empty);
      return;
    }

    tutorialWordListElement.setAttribute(
      "aria-label",
      `Example words played: ${displayedWords.map(({ word }) => word).join(", ")}`,
    );
    tutorialWordListElement.replaceChildren(
      ...displayedWords.map(({ word }) => createTutorialWordChip(word)),
    );
    return;
  }

  tutorialWordListElement.setAttribute(
    "aria-label",
    "Better solution: HOUSE, HOT, and PLANT are replaced by HOUSEPLANT. WATER and the two BREAD paths remain.",
  );
  const replacedWords = TUTORIAL_SUBOPTIMAL_WORDS.slice(0, 3).map(({ word }) =>
    createTutorialWordChip(word, "replaced"),
  );
  const arrow = document.createElement("span");
  arrow.className = "tutorial-word-chip";
  arrow.textContent = "→";
  const optimalWords = TUTORIAL_OPTIMAL_WORDS.map(({ word }) =>
    createTutorialWordChip(word, "optimal"),
  );
  tutorialWordListElement.replaceChildren(...replacedWords, arrow, ...optimalWords);
}

function createTutorialWordChip(
  word: string,
  kind?: "replaced" | "optimal",
): HTMLSpanElement {
  const chip = document.createElement("span");
  chip.className = "tutorial-word-chip";
  if (kind) {
    chip.classList.add(kind);
  }
  chip.textContent = word.toUpperCase();
  return chip;
}

function hasSeenTutorial(): boolean {
  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie.startsWith(`${TUTORIAL_COOKIE_NAME}=`));
}

function rememberTutorialSeen(): void {
  document.cookie = `${TUTORIAL_COOKIE_NAME}=1; Max-Age=${TUTORIAL_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

function loadDailyProgress(dateKey: string): {
  game: GameState;
  answerRevealed: boolean;
  selectedPath: number[];
  wildcardLetter: string;
  selectedAnswerIndex: number;
} | undefined {
  const encodedProgress = readCookie(DAILY_PROGRESS_COOKIE_NAME);
  if (!encodedProgress) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(encodedProgress));
    if (typeof parsed !== "object" || parsed === null) {
      return undefined;
    }

    const saved = parsed as Partial<SavedDailyProgress>;
    if (
      saved.dateKey !== dateKey ||
      typeof saved.board !== "string" ||
      typeof saved.covered !== "string" ||
      !new RegExp(`^[01]{${TILE_COUNT}}$`).test(saved.covered) ||
      typeof saved.wordsUsed !== "number" ||
      !Number.isInteger(saved.wordsUsed) ||
      saved.wordsUsed < 0 ||
      typeof saved.completed !== "boolean" ||
      typeof saved.gaveUp !== "boolean" ||
      typeof saved.answerRevealed !== "boolean" ||
      !Array.isArray(saved.selectedPath) ||
      !saved.selectedPath.every(Number.isInteger) ||
      !isValidPath(saved.selectedPath) ||
      typeof saved.wildcardLetter !== "string" ||
      !/^[a-z]?$/.test(saved.wildcardLetter) ||
      typeof saved.selectedAnswerIndex !== "number" ||
      !Number.isInteger(saved.selectedAnswerIndex) ||
      saved.selectedAnswerIndex < 0
    ) {
      return undefined;
    }

    const board = saved.board.split("");
    createGame(board);
    const covered = saved.covered.split("").map((value) => value === "1");
    const completed = saved.completed;
    const gaveUp = saved.gaveUp;
    const answerRevealed = saved.answerRevealed;

    if (
      completed !== covered.every(Boolean) ||
      (completed && gaveUp) ||
      (answerRevealed && !completed && !gaveUp) ||
      (gaveUp && !answerRevealed) ||
      ((completed || gaveUp) && saved.selectedPath.length > 0)
    ) {
      return undefined;
    }

    return {
      game: {
        board,
        covered,
        wordsUsed: saved.wordsUsed,
        completed,
        gaveUp,
      },
      answerRevealed,
      selectedPath: saved.selectedPath,
      wildcardLetter: saved.wildcardLetter,
      selectedAnswerIndex: saved.selectedAnswerIndex,
    };
  } catch {
    return undefined;
  }
}

function persistDailyProgress(): void {
  if (!DAILY_MODE || !game) {
    return;
  }

  const saved: SavedDailyProgress = {
    dateKey: activeDateKey,
    board: game.board.join(""),
    covered: game.covered.map((value) => (value ? "1" : "0")).join(""),
    wordsUsed: game.wordsUsed,
    completed: game.completed,
    gaveUp: game.gaveUp,
    answerRevealed,
    selectedPath,
    wildcardLetter: wildcardInput.value,
    selectedAnswerIndex,
  };
  const expires = new Date();
  expires.setHours(24, 0, 0, 0);

  try {
    document.cookie = `${DAILY_PROGRESS_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(saved))}; Expires=${expires.toUTCString()}; Path=/; SameSite=Lax`;
  } catch {
    // The game remains playable when cookies are unavailable.
  }
}

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}

function submitSelection(): void {
  const word = selectedWord();
  const result = submitWord(game, selectedPath, word, dictionary.words);

  if (!result.accepted) {
    selectedPath = [];
    wildcardInput.value = "";
    render();
    showMessage(
      word ? `${word.toUpperCase()} is not in the dictionary.` : "That selection is not a valid word.",
      "error",
    );
    persistDailyProgress();
    return;
  }

  game = result.state;
  selectedPath = [];
  wildcardInput.value = "";

  if (game.completed) {
    const perfect = minimumSolution.length;
    showMessage(
      `Complete with a score of ${game.wordsUsed}. Perfect is ${perfect}; par is ${perfect + PAR_MARGIN}.`,
      "success",
    );
  } else {
    showMessage(`${word.toUpperCase()} accepted.`, "success");
  }

  render();
  persistDailyProgress();
  if (game.completed) {
    openResultDialog();
  }
}

function requestRevealAnswer(): void {
  if (game.gaveUp || answerRevealed) {
    return;
  }

  if (game.completed) {
    revealAnswer();
  } else {
    revealWarningDialog.showModal();
  }
}

function revealAnswer(): void {
  if (game.gaveUp || answerRevealed) {
    return;
  }

  const completedBeforeReveal = game.completed;
  if (!completedBeforeReveal) {
    game = giveUp(game);
  }
  selectedPath = [];
  wildcardInput.value = "";
  answerRevealed = true;
  selectedAnswerIndex = 0;
  render();
  persistDailyProgress();
  showMessage(
    completedBeforeReveal
      ? "Answer revealed. Your winning result is unchanged."
      : "Answer revealed. Your score is frozen.",
    "neutral",
  );
  openResultDialog();
}

function openResultDialog(): void {
  if (!isGameOver(game)) {
    return;
  }

  resultDialogTitleElement.textContent = `SpellSweep #${activePuzzleNumber}`;
  resultDialogSummaryElement.textContent = resultSummary(game, minimumSolution.length);
  resultShareStatusElement.textContent = "";
  manualShareElement.hidden = true;
  manualShareTextElement.value = "";
  if (!resultDialog.open) {
    resultDialog.showModal();
  }
  copyResultButton.focus();
}

async function copyShareResult(): Promise<void> {
  if (!isGameOver(game)) {
    return;
  }

  const text = shareText(
    game,
    SHARE_URL,
    minimumSolution.length,
    activePuzzleNumber,
  );

  try {
    await navigator.clipboard.writeText(text);
    resultShareStatusElement.textContent = "Copied! Paste it anywhere.";
    manualShareElement.hidden = true;
  } catch {
    resultShareStatusElement.textContent = "Copy the text below to share your result.";
    manualShareTextElement.value = text;
    manualShareElement.hidden = false;
    manualShareTextElement.focus();
    manualShareTextElement.select();
  }
}

function selectedWord(): string {
  const wildcardLetter = wildcardInput.value.toLowerCase();
  return selectedPath
    .map((tileIndex) => {
      const tile = game.board[tileIndex];
      return tile === WILDCARD ? wildcardLetter : tile;
    })
    .join("");
}

function render(): void {
  const answerPath = minimumSolution[selectedAnswerIndex]?.path ?? [];
  const displayedPath = answerRevealed ? answerPath : selectedPath;

  boardElement.replaceChildren(
    ...game.board.map((tile, tileIndex) => {
      const button = document.createElement("button");
      const selectedPosition = displayedPath.indexOf(tileIndex);
      button.type = "button";
      button.className = "tile";
      button.textContent = tile === WILDCARD ? "?" : tile.toUpperCase();
      button.classList.toggle("wildcard", tile === WILDCARD);
      button.classList.toggle("covered", game.covered[tileIndex]);
      button.classList.toggle("selected", selectedPosition !== -1);
      button.disabled = isGameOver(game);
      button.setAttribute("aria-pressed", String(selectedPosition !== -1));
      button.setAttribute(
        "aria-label",
        `${tile === WILDCARD ? "Wildcard" : tile.toUpperCase()} tile${
          game.covered[tileIndex] ? ", covered" : ", uncovered"
        }${
          selectedPosition !== -1
            ? !answerRevealed
              ? `, selection ${selectedPosition + 1}`
              : `, revealed path ${selectedPosition + 1}`
            : ""
        }`,
      );
      button.addEventListener("click", () => chooseTile(tileIndex));
      return button;
    }),
  );

  scoreElement.textContent = String(game.wordsUsed);
  perfectElement.textContent = String(minimumSolution.length);
  parElement.textContent = String(minimumSolution.length + PAR_MARGIN);
  coveredCountElement.textContent = String(game.covered.filter(Boolean).length);
  revealAnswerButton.disabled = game.gaveUp || answerRevealed;
  shareResultButton.hidden = !isGameOver(game);
  renderAnswer();
  renderSelection();
}

function renderSelection(): void {
  if (answerRevealed) {
    wildcardControl.hidden = true;
    currentWordElement.textContent =
      minimumSolution[selectedAnswerIndex]?.word.toUpperCase() ?? "Answer revealed";
    clearButton.disabled = true;
    submitButton.disabled = true;
    return;
  }

  if (game.completed) {
    wildcardControl.hidden = true;
    currentWordElement.textContent = "Puzzle complete";
    clearButton.disabled = true;
    submitButton.disabled = true;
    return;
  }

  const usesWildcard = selectedPath.some(
    (tileIndex) => game.board[tileIndex] === WILDCARD,
  );
  wildcardControl.hidden = !usesWildcard;

  const word = selectedWord();
  currentWordElement.textContent = selectedPath.length === 0
    ? "Select a tile"
    : word.length === selectedPath.length
      ? word.toUpperCase()
      : selectedPath.map((index) => game.board[index].toUpperCase()).join("");

  clearButton.disabled = selectedPath.length === 0;
  submitButton.disabled =
    selectedPath.length < 2 || (usesWildcard && wildcardInput.value.length !== 1);
}

function renderAnswer(): void {
  revealedAnswerElement.hidden = !answerRevealed;
  if (!answerRevealed) {
    answerWordsElement.replaceChildren();
    return;
  }

  answerSummaryElement.textContent = `${minimumSolution.length} ${
    minimumSolution.length === 1 ? "word" : "words"
  } cover all 25 tiles.`;
  answerWordsElement.replaceChildren(
    ...minimumSolution.map(({ word }, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-word";
      button.classList.toggle("active", index === selectedAnswerIndex);
      button.textContent = word.toUpperCase();
      button.setAttribute("aria-pressed", String(index === selectedAnswerIndex));
      button.addEventListener("click", () => {
        selectedAnswerIndex = index;
        render();
        persistDailyProgress();
      });
      return button;
    }),
  );
}

function checkForNewDailyPuzzle(): void {
  if (!game) {
    return;
  }

  if (DAILY_MODE && localDateKey(new Date()) !== activeDateKey) {
    startPuzzle();
    showMessage("A new daily puzzle has begun.", "neutral");
  }
}

function showMessage(
  message: string,
  kind: "neutral" | "error" | "success",
): void {
  messageElement.textContent = message;
  messageElement.classList.toggle("error", kind === "error");
  messageElement.classList.toggle("success", kind === "success");
}

function requiredElement<ElementType extends HTMLElement>(id: string): ElementType {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}.`);
  }
  return element as ElementType;
}
