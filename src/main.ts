import {
  areAdjacent,
  createDictionaryIndex,
  createGame,
  elapsedMilliseconds,
  localDateKey,
  parseDictionary,
  selectPuzzle,
  submitWord,
  WILDCARD,
  type DictionaryIndex,
  type GameState,
} from "./game.js";

const DAILY_MODE = false;

const boardElement = requiredElement<HTMLDivElement>("board");
const wordsUsedElement = requiredElement<HTMLElement>("words-used");
const coveredCountElement = requiredElement<HTMLElement>("covered-count");
const elapsedTimeElement = requiredElement<HTMLElement>("elapsed-time");
const currentWordElement = requiredElement<HTMLDivElement>("current-word");
const wildcardControl = requiredElement<HTMLLabelElement>("wildcard-control");
const wildcardInput = requiredElement<HTMLInputElement>("wildcard-letter");
const submitButton = requiredElement<HTMLButtonElement>("submit-word");
const clearButton = requiredElement<HTMLButtonElement>("clear-path");
const messageElement = requiredElement<HTMLParagraphElement>("message");
const newPuzzleButton = requiredElement<HTMLButtonElement>("new-puzzle");

let dictionary: DictionaryIndex;
let game: GameState;
let selectedPath: number[] = [];
let activeDateKey = localDateKey(new Date());

submitButton.addEventListener("click", submitSelection);
clearButton.addEventListener("click", clearSelection);
newPuzzleButton.addEventListener("click", () => startPuzzle());
wildcardInput.addEventListener("input", () => {
  wildcardInput.value = wildcardInput.value.replace(/[^a-z]/gi, "").slice(0, 1);
  renderSelection();
});

void loadGame();
setInterval(updateClock, 250);

async function loadGame(): Promise<void> {
  try {
    const response = await fetch("./data/dictionary.txt");
    if (!response.ok) {
      throw new Error(`Dictionary request failed with status ${response.status}.`);
    }

    dictionary = createDictionaryIndex(parseDictionary(await response.text()));
    startPuzzle();
    newPuzzleButton.disabled = false;
    newPuzzleButton.textContent = DAILY_MODE ? "Restart today's puzzle" : "New puzzle";
  } catch (error) {
    console.error(error);
    showMessage("The dictionary could not be loaded. Run the game from a web server.", "error");
  }
}

function startPuzzle(): void {
  game = createGame(selectPuzzle(dictionary, DAILY_MODE));
  selectedPath = [];
  wildcardInput.value = "";
  activeDateKey = localDateKey(new Date());
  render();
  showMessage(
    DAILY_MODE ? "Today's puzzle is ready." : "A new test puzzle is ready.",
    "neutral",
  );
}

function chooseTile(tileIndex: number): void {
  if (game.completedAt !== null) {
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

function submitSelection(): void {
  const word = selectedWord();
  const result = submitWord(game, selectedPath, word, dictionary.words);

  if (!result.accepted) {
    showMessage(`${word || "That selection"} is not a valid word.`, "error");
    return;
  }

  game = result.state;
  selectedPath = [];
  wildcardInput.value = "";

  if (game.completedAt !== null) {
    showMessage(
      `Complete in ${game.wordsUsed} words and ${formatElapsed(elapsedMilliseconds(game))}!`,
      "success",
    );
  } else {
    showMessage(`${word.toUpperCase()} accepted.`, "success");
  }

  render();
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
  boardElement.replaceChildren(
    ...game.board.map((tile, tileIndex) => {
      const button = document.createElement("button");
      const selectedPosition = selectedPath.indexOf(tileIndex);
      button.type = "button";
      button.className = "tile";
      button.textContent = tile === WILDCARD ? "?" : tile.toUpperCase();
      button.classList.toggle("wildcard", tile === WILDCARD);
      button.classList.toggle("covered", game.covered[tileIndex]);
      button.classList.toggle("selected", selectedPosition !== -1);
      button.disabled = game.completedAt !== null;
      button.setAttribute("aria-pressed", String(selectedPosition !== -1));
      button.setAttribute(
        "aria-label",
        `${tile === WILDCARD ? "Wildcard" : tile.toUpperCase()} tile${
          game.covered[tileIndex] ? ", covered" : ", uncovered"
        }${selectedPosition !== -1 ? `, selection ${selectedPosition + 1}` : ""}`,
      );
      button.addEventListener("click", () => chooseTile(tileIndex));
      return button;
    }),
  );

  wordsUsedElement.textContent = String(game.wordsUsed);
  coveredCountElement.textContent = String(game.covered.filter(Boolean).length);
  renderSelection();
  updateClock();
}

function renderSelection(): void {
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

function updateClock(): void {
  if (!game) {
    return;
  }

  elapsedTimeElement.textContent = formatElapsed(elapsedMilliseconds(game));

  if (DAILY_MODE && localDateKey(new Date()) !== activeDateKey) {
    startPuzzle();
    showMessage("A new daily puzzle has begun.", "neutral");
  }
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
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
