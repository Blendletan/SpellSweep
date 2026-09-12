# SpellSweep Game Rules

## Overview

SpellSweep is a word puzzle played on a **5×5 board**.

The goal is to cover all 25 tiles by finding valid words on the board.

Words are formed by tracing paths through adjacent tiles. Tiles may be reused in different words, so playing a word never removes tiles or prevents them from being used later.

The player's score is the **number of accepted words used**. Lower scores are better.

Each puzzle also displays two reference scores:

- **Perfect** is the minimum number of valid word paths whose combined coverage includes all 25 tiles.
- **Par** is currently Perfect plus 3.

Perfect is an exact optimum, not an estimate. If the smallest possible solution uses 5 words, Perfect is 5 and Par is 8.

The puzzle ends immediately when every tile has been covered by at least one accepted word.

---

# The Board

The board is a fixed **5×5 grid**.

There are 24 ordinary letter tiles and one wildcard tile.

The **center tile** is always the wildcard.

The other 24 letters are generated independently according to a fixed English-language letter-frequency distribution.

Conceptually:

> Draw letters IID according to English letter frequency, subject to the condition that the resulting board is solvable.

The board generator must reject boards that are not solvable and continue until it produces one that is.

---

# Solvability

A board is **solvable** if there exists some collection of valid words whose combined paths cover all 25 tiles.

The words do **not** need to form a partition of the board.

Different words may overlap and may reuse the same tiles.

For example, if one valid word uses a particular tile, that tile remains available for every later word.

Therefore an accepted move can never make a previously solvable board impossible to complete.

Progress is monotonic: accepted words can only add to the set of covered tiles.

---

# Forming Words

A word is formed by tracing a path through adjacent tiles.

From the current tile, the next tile may be:

- horizontally adjacent;
- vertically adjacent;
- diagonally adjacent.

In other words, all eight neighboring positions are legal when they exist.

A tile may **not** be visited more than once within the same word.

However, tiles may be reused freely across different words.

Two-letter words are allowed.

---

# The Wildcard

The center tile is a wildcard.

When used as part of a word, it may represent any single letter needed to make that word valid.

The wildcard is **not permanently assigned a letter**.

It may represent one letter in one word and a completely different letter in another word.

It behaves like an ordinary tile in all other respects:

- it must be adjacent to the previous and next tiles in the path;
- it may only be visited once within a particular word;
- it may be reused again in later words.

---

# Dictionary

The authoritative word list is:

```text
data/dictionary.txt
```

For the current prototype, this file contains the North American Scrabble dictionary.

A submitted word is valid if it can be formed according to the board rules and exists in this dictionary.

The tutorial must tell players that SpellSweep uses the North American Scrabble dictionary so they understand which words the game recognizes.

Do not substitute another dictionary unless explicitly instructed.

---

# Submitting Words

When the player submits a valid word:

1. the word is accepted;
2. the **words used** count increases by one;
3. every tile used by that word becomes covered;
4. already-covered tiles remain covered;
5. all tiles remain available for future words.

A valid word is therefore allowed to use:

- uncovered tiles;
- already-covered tiles;
- or any mixture of the two.

A word that covers no new tiles is still a valid submitted word and still counts toward the player's number of words used.

The same valid word may be submitted more than once, using either the same legal path or a different legal path. Every accepted submission counts as another word used, even when the spelling has already been accepted.

There is no undo.

Once a valid word has been submitted, its contribution to the player's word count cannot be removed.

This does **not** risk making the puzzle unwinnable, because submitted words do not consume or disable tiles.

---

# Invalid Words

If a submitted path does not produce a valid dictionary word, the submission has no effect on the game state.

It:

- does not increase the words-used count;
- does not cover any tiles;
- does not remove or change previous progress.

An invalid submission has no score penalty.

The interface must clearly tell the player that the word is not in the dictionary, then clear the selected path and any wildcard entry so a new word can be started immediately.

---

# Winning

The game ends as soon as all 25 board tiles have been covered by at least one accepted word.

The player does not need to use every accepted word efficiently.

There is no requirement that the winning words be disjoint.

The final result is the total number of accepted words used. The result should be shown alongside the puzzle's Perfect and Par values so the player can compare their score with both targets.

---

# Giving up

The player should have the option to give up by pressing a reveal answer button

If they do so the number of words used should freeze

The game should then tell the player a valid solution

After a puzzle has already been solved, the Reveal Answer button remains available and may show the same solution without changing the completed score or outcome. Revealing after a win does not turn the result into a surrender.

---

# Sharing

The game should include an option to share their score once the game is completed, or the player has given up

The share option should be available as either a text or a graphic that they can share

In either case it should include the player's word-count score and a link to the webpage the game is located at

If the player gave up and revealed the solution then the share card should say "This one beat me!" instead of the word-count score

---

# No Undo and No Softlocks

There is deliberately no undo system for accepted words.

Submitting an unnecessary word permanently worsens the player's word-count result.

However, it cannot damage the underlying puzzle state.

Because tiles remain usable after being covered, the player may always continue using any valid words that were available before.

Thus:

> **No valid move can make a solvable puzzle unsolvable.**

The player may waste words and worsen their score, but cannot softlock the game through an accepted move.

---

# Tutorial

SpellSweep must include a short, step-by-step tutorial built around a fixed example 5×5 board. The tutorial is explanatory rather than a separate playable puzzle and must not change or reset the player's current puzzle.

The tutorial must:

- explain that the goal is to cover all 25 tiles with valid words;
- identify the word list as the North American Scrabble dictionary;
- demonstrate horizontal, vertical, and diagonal movement;
- explain that a tile cannot be used twice within one word;
- demonstrate that covered tiles remain available in later words;
- explain that the same valid word may be submitted more than once and that every accepted submission increases the score;
- demonstrate entering a letter for the center wildcard and explain that its letter may change between words;
- explain word-count scoring, Perfect, Par, covered and uncovered tiles, and Reveal Answer;
- walk through a valid but suboptimal solution before showing the simpler path the example player missed.

The tutorial must open automatically when a player visits SpellSweep for the first time. Dismissing or completing it records a first-party functional cookie so it does not open automatically on later visits. A permanent How to play control must remain available so the tutorial can be reopened from its first step at any time.

The tutorial must be dismissible, keyboard accessible, touch friendly, and usable on both desktop and phone-sized screens.

---

# Puzzle Modes

SpellSweep has one deliberate runtime mode switch.

There must be one obvious boolean flag controlling puzzle selection:

```ts
const DAILY_MODE = true;
```

## Daily Mode

When:

```ts
DAILY_MODE = true
```

SpellSweep operates as a daily puzzle.

There is one puzzle for the current local calendar day.

The puzzle changes at **midnight local time**.

Refreshing the page during the same day must continue to produce the same daily puzzle.

The puzzle identity therefore persists for the duration of that local calendar day.

---

## Debug / Testing Mode

When:

```ts
DAILY_MODE = false
```

the game is in development/testing mode.

A new valid random puzzle is generated or selected on every page refresh.

The puzzle does not persist between refreshes.

This mode exists so that many puzzles can be played quickly during development and playtesting.

There is no in-page restart or new-puzzle button in either mode. Refreshing the page restarts the current daily puzzle in daily mode and produces a fresh puzzle in debug mode.

There should be no additional mode-selection framework or configuration system. This single boolean is the intended switch.

---

# Important Invariants

The implementation should preserve these rules:

1. The board is always 5×5.
2. The center tile is always the wildcard.
3. Ordinary letters are IID draws from English-language letter frequency.
4. Only solvable boards may be presented.
5. Movement may be horizontal, vertical, or diagonal.
6. A tile may not appear twice in the same word.
7. Tiles may be reused freely between different words.
8. Two-letter words are allowed.
9. The wildcard may represent a different letter in every word.
10. The same valid word may be accepted more than once.
11. Accepted words permanently increase the word count.
12. Accepted words permanently mark their tiles as covered.
13. Covering a tile does not make it unavailable.
14. Invalid submissions do not alter game state.
15. There is no undo for accepted words.
16. The game ends immediately when all 25 tiles are covered.
17. The player's score is the number of accepted words used.
18. Daily mode changes puzzle at local midnight.
19. Debug mode produces a new puzzle on refresh.
20. No accepted move can make a solvable puzzle unsolvable.
21. Perfect is the exact minimum number of words needed to cover the board.
22. Par is Perfect plus 3.
23. Revealing the answer after a win does not change the winning result.

---

# Scope of This Document

This document defines the **game rules**.

It does not prescribe the final visual design or UI architecture.

Details such as animations, colors, typography, exact mouse/touch gestures, visual feedback, and other presentation decisions should not alter the rules above.
