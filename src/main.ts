import {
  areAdjacent,
  createDictionaryIndex,
  createGame,
  findMinimumWordSolution,
  giveUp,
  isGameOver,
  localDateKey,
  PAR_MARGIN,
  parseDictionary,
  selectPuzzle,
  shareText,
  submitWord,
  WILDCARD,
  type DictionaryIndex,
  type GameState,
  type WordPath,
} from "./game.js";

const DAILY_MODE = false;

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
const newPuzzleButton = requiredElement<HTMLButtonElement>("new-puzzle");
const revealAnswerButton = requiredElement<HTMLButtonElement>("reveal-answer");
const revealedAnswerElement = requiredElement<HTMLElement>("revealed-answer");
const answerSummaryElement = requiredElement<HTMLParagraphElement>("answer-summary");
const answerWordsElement = requiredElement<HTMLDivElement>("answer-words");
const shareResultButton = requiredElement<HTMLButtonElement>("share-result");
const revealWarningDialog = requiredElement<HTMLDialogElement>("reveal-warning");
const cancelRevealButton = requiredElement<HTMLButtonElement>("cancel-reveal");
const confirmRevealButton = requiredElement<HTMLButtonElement>("confirm-reveal");

let dictionary: DictionaryIndex;
let game: GameState;
let selectedPath: number[] = [];
let minimumSolution: readonly WordPath[] = [];
let answerRevealed = false;
let selectedAnswerIndex = 0;
let activeDateKey = localDateKey(new Date());

submitButton.addEventListener("click", submitSelection);
clearButton.addEventListener("click", clearSelection);
newPuzzleButton.addEventListener("click", () => startPuzzle());
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
shareResultButton.addEventListener("click", () => void shareResult());
wildcardInput.addEventListener("input", () => {
  wildcardInput.value = wildcardInput.value.replace(/[^a-z]/gi, "").slice(0, 1);
  renderSelection();
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
    newPuzzleButton.disabled = false;
    revealAnswerButton.disabled = false;
    newPuzzleButton.textContent = DAILY_MODE ? "Restart today's puzzle" : "New puzzle";
  } catch (error) {
    console.error(error);
    showMessage("The dictionary could not be loaded. Run the game from a web server.", "error");
  }
}

function startPuzzle(): void {
  game = createGame(selectPuzzle(dictionary, DAILY_MODE));
  selectedPath = [];
  minimumSolution = findMinimumWordSolution(game.board, dictionary);
  answerRevealed = false;
  selectedAnswerIndex = 0;
  wildcardInput.value = "";
  activeDateKey = localDateKey(new Date());
  render();
  showMessage(
    DAILY_MODE ? "Today's puzzle is ready." : "A new test puzzle is ready.",
    "neutral",
  );
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
}

function clearSelection(): void {
  selectedPath = [];
  wildcardInput.value = "";
  showMessage("Selection cleared.", "neutral");
  render();
}

function handleKeyDown(event: KeyboardEvent): void {
  if (
    event.key !== "Enter" ||
    event.repeat ||
    submitButton.disabled ||
    revealWarningDialog.open
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
  showMessage(
    completedBeforeReveal
      ? "Answer revealed. Your winning result is unchanged."
      : "Answer revealed. Your score is frozen.",
    "neutral",
  );
}

async function shareResult(): Promise<void> {
  if (!isGameOver(game)) {
    return;
  }

  const text = shareText(game, window.location.href);

  if (navigator.share) {
    try {
      await navigator.share({ text });
      showMessage("Share opened.", "success");
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        showMessage("Sharing cancelled.", "neutral");
        return;
      }
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    showMessage("Result copied to the clipboard.", "success");
  } catch {
    window.prompt("Copy your SpellSweep result:", text);
    showMessage("Copy the displayed result to share it.", "neutral");
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
