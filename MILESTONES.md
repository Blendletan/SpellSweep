# SpellSweep Implementation Milestones

This roadmap translates `AGENTS.md` and `GAME-RULES.md` into an ordered implementation plan. It is meant to preserve the overall direction while allowing individual steps to change when testing reveals a better approach.

The required order is:

1. Make the rules correct.
2. Make the game minimally playable.
3. Playtest and revise the rules.
4. Measure and address real performance problems.
5. Polish the presentation.

Do not skip ahead to architecture, optimization, or visual polish. Keep the implementation small, direct, static, and easy to understand.

## Milestone 0: Repository Baseline

- [x] Inventory the existing source files, scripts, tests, dictionary, and puzzle data.
- [x] Identify useful existing work and unrelated user changes that must be preserved.
- [x] Confirm the current build and test commands.
- [x] Confirm that `data/dictionary.txt` has the expected format and is the only authoritative dictionary.
- [x] Decide the initial value of `DAILY_MODE`.

Decision: keep `DAILY_MODE = false` during development and playtesting. Enabling it for release remains a one-line change to the same boolean.

Completion criteria: the existing project is understood well enough to make focused changes without introducing unnecessary structure or overwriting unrelated work.

## Milestone 1: Core Game Data

- [x] Represent the fixed 5x5 board as 25 tiles.
- [x] Keep the wildcard fixed at the center tile, index 12.
- [x] Represent the current path as tile indexes.
- [x] Track covered tiles, accepted-word count, elapsed time, and completion status.
- [x] Keep this logic independent of the browser UI.

Completion criteria: a game state can be created, inspected, and reset using ordinary TypeScript data and functions.

## Milestone 2: Dictionary and Path Rules

- [x] Load and normalize `data/dictionary.txt`.
- [x] Support fast full-word membership checks.
- [x] Support prefix checks if required by the board search.
- [x] Implement horizontal, vertical, and diagonal adjacency.
- [x] Reject a path that visits a tile more than once.
- [x] Allow two-letter words.
- [x] Match the wildcard to any one required letter for the current word only.
- [x] Confirm that the wildcard may represent a different letter in later words.

Completion criteria: a path can be evaluated as a valid or invalid dictionary word according to every path and wildcard rule.

## Milestone 3: Submission and Completion Rules

- [x] Accept a valid submitted path and increase the word count once.
- [x] Mark every tile in an accepted path as covered.
- [x] Keep all covered tiles available for future words.
- [x] Count a valid word even when it covers no new tiles.
- [x] Leave all game state unchanged after an invalid submission.
- [x] End the game immediately when all 25 tiles are covered.
- [x] Record final accepted-word count and elapsed time.
- [x] Provide reset/restart behavior.
- [x] Do not provide undo for accepted words.

Completion criteria: tested state transitions preserve monotonic coverage and cannot create a softlock through an accepted move.

## Milestone 4: Solvability Search

- [x] Enumerate legal dictionary-word paths on a candidate board.
- [x] Handle wildcard substitutions during the search.
- [x] Use dictionary prefixes to stop paths that cannot become words.
- [x] Record the tiles covered by all valid word paths.
- [x] Declare a board solvable only when every tile occurs in at least one valid path.

Because words may overlap and tiles are never consumed, it is not necessary to find a partition or simulate a sequence of moves merely to determine solvability. A board is solvable when the union of its valid word paths covers all 25 tiles. Milestone 8 separately finds an exact minimum-word solution for the Reveal Answer feature.

Test cases should include overlapping solutions, an uncoverable tile, a tile coverable only through the wildcard, multiple wildcard interpretations, and attempted tile reuse within one path.

Completion criteria: the checker reliably distinguishes known solvable and unsolvable boards.

## Milestone 5: Board Generation and Puzzle Modes

- [x] Define one explicit English-language letter-frequency distribution.
- [x] Draw the 24 ordinary letters independently from that distribution.
- [x] Place the wildcard in the center.
- [x] Reject candidates that fail the solvability check.
- [x] Continue until a solvable board is produced.
- [x] Keep one obvious `const DAILY_MODE = ...` switch.
- [x] In daily mode, derive the same puzzle for the same local calendar date.
- [x] Change the daily puzzle at local midnight.
- [x] In debug mode, produce a fresh solvable puzzle on each refresh.

Measure browser generation before selecting a more complicated approach. If generation is impractically slow, stop and discuss the simplest compliant alternative, such as pre-generating verified boards, before introducing workers, caches, or build-time infrastructure.

Completion criteria: only solvable boards are presented, daily refreshes are stable for the local day, and debug refreshes produce fresh puzzles.

## Milestone 6: Rule Test Gate

Before starting the playable interface, verify meaningful tests for:

- [x] Board dimensions and center wildcard.
- [x] All eight movement directions, including edges and corners.
- [x] No repeated tile within one word.
- [x] Free tile reuse between words.
- [x] Two-letter words.
- [x] Wildcard matching and reassignment.
- [x] Dictionary validation.
- [x] Valid and invalid submission effects.
- [x] Valid words that add no coverage.
- [x] Immediate completion at 25 covered tiles.
- [x] Reset behavior.
- [x] Daily and debug puzzle selection.
- [x] Solvability acceptance and rejection.

Completion criteria: the important game rules can be verified without interacting with a webpage, and all rule tests pass.

## Milestone 7: Minimal Playable Interface

- [x] Display the 5x5 board and distinguish the wildcard.
- [x] Allow mouse, touch, or similarly direct path selection.
- [x] Show the selected path and candidate word.
- [x] Provide submit and clear-selection controls.
- [x] Clearly distinguish covered and uncovered tiles without disabling either.
- [x] Show accepted-word count and elapsed time.
- [x] Give understandable invalid-submission feedback.
- [x] Show the result immediately on completion.
- [x] Rely on page refresh for restarting or loading a new puzzle; provide no separate in-page button.

Use ordinary HTML, CSS, and TypeScript. The UI should call the tested game logic rather than duplicate it. Visual simplicity is acceptable at this stage.

Completion criteria: a person can complete a puzzle and understand the essential game state without developer tools.

## Milestone 8: Reveal Answer and Minimum-Word Solution

- [x] Extend the board search to retain concrete valid words and their tile paths.
- [x] Remove duplicate solution candidates that represent the same word and path.
- [x] Find an exact covering solution that uses the minimum possible number of word paths.
- [x] Make minimum-solution selection deterministic when several equally short solutions exist.
- [x] Verify that every revealed path is legal, every revealed word is in the dictionary, and the combined paths cover all 25 tiles.
- [x] Add a simple gave-up outcome to the game state.
- [x] Freeze elapsed time and accepted-word count at the moment the player gives up.
- [x] Prevent further word submissions after giving up.
- [x] Add a Reveal Answer button.
- [x] Warn the player that revealing the answer will end the run and require confirmation before continuing.
- [x] Leave the game unchanged when the warning is cancelled.
- [x] Display every word in the minimum-word solution after confirmation.
- [x] Let the player select a revealed word to highlight its exact path on the board.
- [x] Add focused tests for minimum cardinality, deterministic tie handling, frozen results, cancelled reveals, and complete path coverage.

The revealed answer must be an exact minimum-word solution, not a greedy approximation. A direct exact search with pruning is preferred. Measure it against real generated boards while implementing it; if exact solving is too slow for interactive use, stop and discuss the measured problem before introducing a worker or more elaborate optimization.

Completion criteria: after a warning and confirmation, Reveal Answer immediately ends the run, freezes its counters, and shows a verified solution using the fewest possible words with inspectable tile paths.

## Milestone 9: Score Sharing

- [x] Make sharing available only after the player wins or gives up.
- [x] For a win, create share text containing the accepted-word count, elapsed time, and webpage link.
- [x] For a revealed answer, create share text containing “This one beat me!” and the webpage link instead of the score.
- [x] Use the browser's native text-sharing function when available.
- [x] Fall back to copying the same text to the clipboard when native sharing is unavailable.
- [x] Give clear success or failure feedback without adding a sharing framework or graphics dependency.
- [x] Test both completed-game and gave-up share content.

Plain text satisfies the current rule allowing either text or a graphic. A graphic share card can be considered later only if playtesting shows a present need.

Completion criteria: a finished or surrendered game can produce the correct share text and webpage link through an available browser mechanism.

## Milestone 10: Initial Playtesting Checkpoint

- [x] Confirm that a complete debug-mode game can be played.
- [x] Evaluate whether the core rules are enjoyable enough to continue.
- [x] Record the first important playtesting observation.
- [x] Decide whether to proceed to deployment and broader testing.

Initial result (September 9, 2026): the project owner reports that the game is difficult but fun and approved proceeding. Broader difficulty, score, interaction, dictionary-word, touch, and device observations move to Milestone 13 so they can be gathered from the deployed build.

Completion criteria: the prototype demonstrates enough enjoyment to justify broader device testing. Complete.

## Milestone 11: Performance Review

- [x] Measure dictionary loading time.
- [x] Measure valid-path and solvability search time.
- [x] Measure solvable-board generation time.
- [x] Check UI responsiveness during selection and submission.
- [x] Optimize only behavior demonstrated to be too slow.

Measured September 9, 2026 across 10 deterministic boards: dictionary read 4.83 ms; dictionary parse 79.53 ms; prefix index 267.11 ms; solvable-board generation averaged 29.16 ms and reached 69.47 ms maximum; solvability checks averaged 24.11 ms and reached 64.82 ms maximum; exact minimum-answer search averaged 90.48 ms and reached 136.53 ms maximum; core valid submissions averaged below 0.01 ms. Browser playtesting showed immediate selection and submission feedback. No optimization is justified by these measurements.

Completion criteria: the game performs acceptably on its intended browsers, or a measured bottleneck has a focused solution.

## Milestone 12: Prototype GitHub Pages Deployment

- [x] Confirm the GitHub repository, default branch, and intended Pages URL.
- [x] Add the smallest practical GitHub Pages workflow.
- [x] Install dependencies with the committed lockfile and compile TypeScript in the workflow.
- [x] Assemble a static artifact containing `index.html`, `style.css`, `build/`, and `data/dictionary.txt` without committing generated build output.
- [x] Keep `DAILY_MODE = false` for this playtesting deployment.
- [x] Push the reviewed source and workflow to GitHub only after explicit approval.
- [x] Enable or verify GitHub Pages using the workflow artifact.
- [x] Verify that the public site loads its JavaScript, stylesheet, and dictionary from the repository's Pages base path.
- [x] Smoke-test ordinary words, wildcard words, Reveal Answer, solution paths, and sharing on the deployed URL.
- [x] Confirm that the deployed prototype has no backend dependency.

This is a playtesting deployment, not the final launch. Its purpose is to make the real HTTPS build available across devices before interaction and visual decisions are finalized.

Deployment result (September 9, 2026): commit `2f02ce1` deployed successfully to `https://blendletan.github.io/SpellSweep/` through GitHub Actions. The public build loaded its static assets and dictionary, accepted an ordinary word and a wildcard word, preserved the active run when the Reveal Answer warning was cancelled, froze the result after confirmation, displayed and navigated the exact minimum-word solution paths, and exposed the post-game Share Result control. The existing automated tests also verify the completed-game and gave-up share text. No backend is used.

Completion criteria: the current prototype is playable from its GitHub Pages URL and is ready for cross-device testing. Complete.

## Milestones 13–17: Iterative Playtesting Loop

Milestones 13 through 17 are an iterative loop rather than a strict one-pass sequence. As the owner plays the game and begins showing it to other people, observations may move directly into scoring corrections, interaction changes, visual refinement, or tutorial changes before every checklist item in the preceding milestone is complete. Keep each change focused, test it, return to playtesting, and update these lists as evidence accumulates.

## Milestone 13: Cross-Device Playtesting and Rule Review

Playtesting feedback recorded September 10, 2026 identified five concrete interaction problems to address in Milestone 14:

- An invalid dictionary submission needs unmistakable feedback and must clear the selected path, including any wildcard entry, so the player can immediately try another word.
- The player needs a manual pause control that freezes elapsed time and obscures the puzzle, and leaving the browser tab must pause the run automatically.
- Pressing Enter should submit the current word whenever the Submit word button is enabled.
- Covered and uncovered tiles need substantially stronger visual separation.
- Reveal Answer must remain available after a solved puzzle without changing the completed result or the content shared for that win.

- [x] Play multiple debug-mode boards on a desktop computer.
- [x] Confirm that the game is practically playable on desktop, phones, and touchscreens.
- [x] Continue evaluating touchscreen wildcard entry and other detailed touch interactions.
- [x] Continue evaluating phone layout, text size, controls, and scrolling as the interface changes.
- [x] Confirm that the Reveal Answer mechanic and solution display are understandable in normal play.
- [x] Continue testing Reveal Answer cancellation, confirmation, and path inspection on each relevant device as the interface changes.
- [x] Test native sharing or its fallback on desktop and mobile.
- [x] Record typical word counts and how they compare with Perfect and Par.
- [x] Confirm that generated boards are solvable in practice, not merely in theory.
- [x] Record whether difficulty comes from the rules, generated letters, obscure dictionary words, or interaction friction.
- [x] Record accessibility and keyboard issues observed during real use.
- [x] Decide which findings require rule changes and which require interface changes.

Completion criteria: there is enough evidence from desktop, touchscreen, and phone use to make targeted changes without guessing. Complete.

## Milestone 14: Interaction, Mobile, and Accessibility Corrections

Superseded decision (September 10, 2026): the completed pause-related work below records what was implemented and tested, but pausing and elapsed-time scoring are no longer part of the game. Milestone 15 removes them before further polish.

- [x] Update `GAME-RULES.md` before implementation to define pausing and post-completion answer revealing as explicit current behavior.
- [x] On a rejected dictionary submission, show a clear error in the existing live status region, clear the selected path, clear any wildcard letter, and leave coverage and word count otherwise unchanged.
- [x] Verify that invalid-word feedback is visible long enough and prominent enough that Submit word cannot appear unresponsive.
- [x] Add direct pause/resume state to the existing game data and elapsed-time calculation without introducing a separate timer service or configuration layer.
- [x] While paused, freeze the displayed elapsed time, reject gameplay input, and cover the board with a simple pause surface that does not expose its letters.
- [x] Add one obvious Pause/Resume control that is unavailable after the run ends.
- [x] Listen for browser visibility changes and pause an active run when its tab becomes hidden.
- [x] Automatically resume when the tab becomes visible only if hiding the tab caused the pause; never automatically resume a pause the player initiated manually.
- [x] Ensure repeated visibility events, manual pause followed by tab switching, and time spent paused cannot double-count or lose elapsed time.
- [x] Submit the current selection when Enter is pressed and Submit word is enabled.
- [x] Do not let Enter submit while paused, after the game ends, while the Reveal Answer confirmation is open, or when the current selection is incomplete.
- [x] Increase the background and border contrast between covered and uncovered tiles while preserving the stronger selected-path state.
- [x] Keep covered state understandable through accessible labels and a non-color-only visual cue where practical.
- [x] Keep Reveal Answer enabled after a win; revealing a solved board should display the same minimum-word solution and inspectable paths without changing the word count or setting the gave-up outcome.
- [x] Preserve the existing confirmation and “This one beat me!” share result when Reveal Answer is used before completion.
- [x] Bypass the give-up warning after completion because the run and score are already final, and prevent repeated solution computation once the answer is displayed.
- [x] Verify that sharing after a solved-board reveal preserves the winning outcome rather than saying “This one beat me!”; Milestone 15 revises the score format.
- [x] Add focused logic tests for pause/resume timing, submission rejection while paused, repeated pause transitions, and unchanged completed results after answer reveal.
- [x] Manually verify invalid feedback and clearing, Enter submission, pause concealment, and tile contrast in the local browser build.
- [ ] Manually re-check both Reveal Answer paths and both share-result variants during the next broader browser/device pass.
- [ ] Adjust mobile layout and touch behavior where continued testing shows a need.
- [x] Re-run the full rule suite and TypeScript compiler after these corrections.
- [ ] Repeat targeted desktop, touchscreen, and phone checks as the iterative playtesting loop continues.

Implementation result (September 10, 2026): the five reported changes are implemented in the existing direct game state and browser UI. The automated suite passes 29 tests, TypeScript compiles successfully, and a local browser check verified invalid-word clearing and feedback, Enter submission, pause concealment, and stronger covered-tile contrast.

Historical completion criteria (pause portions superseded by Milestone 15): invalid submissions are unmistakable and reset the attempt; Enter submits safely; covered state is immediately distinguishable; and Reveal Answer works before or after completion while preserving the correct share outcome. The tested interaction works reliably across the target devices without unintended rule changes.

## Milestone 15: Word-Count Scoring, Perfect, and Par

This is the next implementation priority.

- [x] Remove the elapsed-time display and every timer update from the browser interface.
- [x] Remove the Pause/Resume control, puzzle-cover overlay, tab-visibility behavior, and related styling.
- [x] Remove pause state, accumulated paused duration, start/end timestamps used only for timing, and elapsed-time helpers from the game logic.
- [x] Keep the player's score as the accepted-word count only; invalid submissions must not affect it.
- [x] Use the existing exact minimum-word solution search to determine each puzzle's Perfect score.
- [x] Calculate Par directly as Perfect plus 3 without adding a scoring framework or configuration system.
- [x] Display Score, Perfect, and Par clearly throughout play and in the completed result.
- [x] Retain the already-computed minimum solution for Reveal Answer so displaying Perfect does not require duplicate solution work.
- [x] Keep Reveal Answer behavior unchanged: using it during play is a surrender, while using it after a win preserves the winning outcome.
- [x] Update winning share text to contain the player's word-count score and webpage link with no elapsed-time result.
- [x] Keep surrendered share text as “This one beat me!” with the webpage link.
- [x] Remove obsolete pause/timer tests and add focused tests for exact Perfect, Par = Perfect + 3, word-count-only results, and both share outcomes.
- [x] Update interface instructions, accessible labels, and result messages so none imply that speed affects scoring.
- [x] Compile, run the complete test suite, and browser-test the revised score display, result states, Reveal Answer paths, and sharing behavior.

Keep this change direct: the exact solver already defines Perfect, and Par is one addition. Do not introduce a generalized scoring system.

Implementation result (September 10, 2026): timer and pause behavior were removed from the state, interface, styles, and tests. Each puzzle now computes and retains its exact minimum solution once, displays its length as Perfect, displays Perfect + 3 as Par, and uses accepted words as the sole player score. Winning share text contains only the word-count score and link; surrendered sharing remains “This one beat me!”. The 25-test suite passes, TypeScript compiles, and the revised score and answer displays were verified in the local browser build.

Completion criteria: the game contains no timer or pause behavior; the only player score is accepted words used; every puzzle visibly shows its exact Perfect score and Par value; and completed and surrendered share results follow the revised scoring rules. Complete.

## Milestone 16: Final Visual Polish and Deployment Verification

- [x] Keep SpellSweep's visual direction independent from Word Web except for the specific shared-series elements listed below; do not copy Word Web's colors, fonts, page layout, buttons, corkboard treatment, bubbles, or other styling.
- [x] Change the browser title to `SpellSweep — RMLP`, matching Word Web's series-level title treatment while leaving the visible game name as SpellSweep.
- [x] Copy `assets/rmlp-logo-mark.svg` from the WordWebDebug repository and use the small RMLP mark beside the SpellSweep heading and as the favicon; do not import the full Word Web lockup or broader brand styling.
- [x] Keep Share Result unavailable until the player completes the puzzle or gives up.
- [x] Remove native sharing, canvas/image sharing, and downloads; Share Result should only copy plain text to the clipboard.
- [x] Adapt Word Web's result language to SpellSweep's score: `Perfect score`, `beat par by N`, `made par`, `+N over par`, or `This one beat me!` after giving up, followed by the SpellSweep webpage link.
- [x] Use a simple Word Web-style emoji-cell row in completed-result text when it remains clear and legible; do not include score cells in a gave-up result.
- [x] Immediately after either completion or giving up, open a gentle, keyboard-accessible, dismissible result dialog containing the outcome and one Share Result button.
- [x] Keep a post-game Share Result control available after the result dialog is dismissed so the player can copy the result again.
- [x] After a successful copy, show `Copied! Paste it anywhere.`; if clipboard access fails, reveal the plain text in a read-only control for manual copying.
- [x] Add a compact footer containing only `Send feedback` linking to `mailto:robertparkinson@shaw.ca` and `Support more puzzles ☕` linking to `https://www.paypal.com/paypalme/AceBlender`.
- [ ] Add focused tests for every completed and gave-up share-text variant, and manually verify share visibility, dialog dismissal and reopening, keyboard behavior, clipboard success and fallback, and phone-sized presentation without adding a UI framework or test framework.
- [ ] Improve typography, spacing, and board appearance after interaction stabilizes.
- [ ] Refine feedback and restrained animations where useful.
- [ ] Produce and test the final static build.
- [ ] Verify relative paths and required assets on GitHub Pages.
- [x] Set the intended release value of `DAILY_MODE`.
- [ ] Re-test daily puzzle persistence and local-midnight behavior when daily mode is enabled.
- [ ] Verify the final deployed game on desktop and mobile.

Implementation progress (September 11, 2026): the approved shared-series elements are implemented without changing SpellSweep's broader visual language. The result flow now uses an accessible in-page dialog and clipboard-only text, with focused coverage for all score descriptions and the gave-up result. The complete 26-test suite passes, TypeScript compiles, required local assets return successfully, and browser checks verified the active/post-game share visibility, gave-up dialog, successful copy feedback, close and Escape dismissal, reopening, footer links, and desktop and phone-sized layouts. The manual-copy fallback and completed-game dialog remain to be exercised in the next broader browser pass; production deployment and the remaining general polish items are still pending.

Completion criteria: the stabilized game is attractive, accessible, and verified on its final static GitHub Pages deployment.

## Milestone 17: Player Tutorial

This is the current implementation priority within the iterative playtesting loop. The planned interaction follows the concise staged approach used by the WordWeb tutorial: a fixed example advances through short explanations, first completing the puzzle inefficiently and then exposing the simpler route the example player missed.

- [x] Decide the overall tutorial approach: use a fixed, explanatory 5×5 example board in a modal walkthrough rather than altering the live puzzle or requiring the player to complete a second game.
- [x] Decide first-visit behavior: open the tutorial automatically when its first-party functional cookie is absent.
- [x] Decide dismissal behavior: closing, skipping, or completing the tutorial records the cookie so later visits are not interrupted.
- [x] Decide replay behavior: keep a permanent How to play control that reopens the tutorial at its first step without clearing or changing the active puzzle.
- [x] Curate an example board using familiar words and a clear 6-word solution against a Perfect score of 4.
- [x] Validate every demonstrated word and path against `data/dictionary.txt`, and use the existing exact solver to verify the example's stated Perfect score against the full dictionary.
- [x] Introduce the objective: cover all 25 tiles by submitting valid words.
- [x] Tell players explicitly that SpellSweep uses the North American Scrabble dictionary.
- [x] Demonstrate tile-selection order and adjacent horizontal and vertical movement.
- [x] Demonstrate a diagonal move clearly enough that it cannot be mistaken for an orthogonal path.
- [x] Explain that a tile cannot be repeated within one word.
- [x] Demonstrate reusing an already-covered tile in a later word.
- [x] Demonstrate submitting the same word again along a different path that adds useful coverage, and explain that every accepted submission increases the score.
- [x] Demonstrate entering a letter for the center wildcard and explain that it may represent a different letter in each word.
- [x] Show the example player completing the board with a valid but suboptimal word count.
- [x] Compare the example result with Perfect and Par, reinforcing that the score is accepted words used and lower is better.
- [x] Reveal the missed shorter path and visually distinguish the unnecessary words that caused the gap from Perfect.
- [x] Explain covered and uncovered tile states and the consequence of using Reveal Answer before the puzzle is complete.
- [x] Finish with a brief rules recap and a clear Let’s play action.
- [x] Add Back, Next, close, current-step text, and compact progress indicators.
- [x] Keep tutorial rendering independent of the active `GameState` so opening, navigating, or dismissing it cannot change the current board, coverage, or score.
- [x] Implement the walkthrough directly with the existing HTML, CSS, and TypeScript; add no onboarding framework or runtime dependency.
- [x] Make the dialog keyboard accessible, announce step changes appropriately, preserve sensible focus, and support Escape dismissal.
- [x] Keep controls touch friendly and make the tutorial board and copy fit or scroll cleanly on phone-sized screens.
- [x] Test first-visit automatic display, dismissal through completion and Escape, cookie persistence across reloads, and manual replay from step one.
- [x] Verify the walkthrough and its unchanged live-game state in the local browser's narrow touch-sized layout and responsive desktop styling; continue physical-device checks in the iterative playtesting loop.

Prefer a small in-page walkthrough built with the existing HTML, CSS, and TypeScript. Do not add an onboarding framework or dependency.

Implementation result (September 10, 2026): the ten-step tutorial uses HOUSE, HOT, PLANT, WATER, BREAD, and BREAD to finish its fixed example in 6 words, then shows how HOUSEPLANT replaces the first three plays to reach the exact Perfect score of 4. The example was verified against the full authoritative dictionary. The tutorial opens automatically until dismissed, stores only a first-party seen flag, remains replayable from How to play, and leaves the live puzzle untouched. TypeScript compiles, all 25 tests pass, and local browser testing verified keyboard navigation, Escape dismissal, narrow-screen scrolling, cookie persistence, and replay from step one.

Completion criteria: a first-time player is automatically shown a concise walkthrough that explains the North American Scrabble dictionary, movement, reuse, wildcard, scoring, and optimization rules; dismissal persists across later visits; and any player can reopen the tutorial without affecting an active puzzle. Complete.

## Milestone 18: GoatCounter Analytics

- [x] Create or confirm the GoatCounter site and obtain its public site code.
- [x] Add GoatCounter's smallest supported page-view integration to the static site.
- [x] Record one custom event whenever a player activates the Share Result button.
- [x] Count the share-button activation without including the puzzle, score, share text, or other player-entered data.
- [x] Record one custom event when a player confirms Reveal solution on an unfinished puzzle, counting a give-up without counting post-win answer views.
- [x] Count the reveal confirmation without including the puzzle, score, solution, or other player-entered data.
- [x] Ensure analytics failure or blocking never interferes with gameplay or sharing.
- [x] Add a brief privacy disclosure if the final GoatCounter configuration or applicable policy requires one.
- [ ] Verify production page-view counting on GitHub Pages.
- [ ] Verify the confirmed give-up event is counted once on desktop and mobile and is not emitted by post-win answer views.
- [ ] Verify the Share Result event is counted once per button activation on desktop and mobile.

Keep analytics limited to aggregate page visits, confirmed unfinished-puzzle reveals, and Share Result button activations. Do not add a tag manager, analytics framework, analytics or tracking cookies, user accounts, or broader behavioral tracking. The first-party functional cookies used for tutorial dismissal and same-day puzzle progress must not be sent to GoatCounter.

Implementation progress (September 11, 2026): SpellSweep now uses the confirmed `blendletan` GoatCounter site code for ordinary page views, a constant `spellsweep-puzzle-revealed` event on the unfinished-run reveal confirmation, and a constant `spellsweep-share-result` event on the result-copy button. Post-win answer views do not emit the reveal event. The declarative click integrations contain no puzzle, score, solution, share text, or player-entered values, and blocked analytics remains independent of the game's own click handlers. No additional in-game privacy disclosure was added for this cookie-free aggregate configuration; re-evaluate that decision if the analytics settings or applicable policy change. Production dashboard confirmation and desktop/mobile event checks remain part of the final one-to-two-day launch test.

Completion criteria: GoatCounter reports public-site visits, confirmed give-ups, and Share Result button activations accurately while the game remains a simple static site and sends no game or player data beyond those three aggregate events.

## Milestone 19: Release-State Persistence and Puzzle Numbers

- [x] Store daily game progress in a first-party functional cookie that expires at local midnight.
- [x] Restore covered tiles, score, end state, revealed answer, and the current tile selection when the player returns during the same local day.
- [x] Ignore missing, stale, or malformed progress without preventing the game from loading.
- [x] Number daily puzzles consecutively from SpellSweep #1 on September 12, 2026 using local calendar dates.
- [x] Include the puzzle number in every completed and gave-up shared result without displaying it elsewhere.
- [x] Remove the initial “Today's puzzle is ready.” message.
- [x] Manually verify same-day restoration in the browser.
- [ ] Manually verify next-day expiry in the browser.

Completion criteria: a player can leave and resume the current day's puzzle, shared results identify the daily puzzle number, and the initial interface contains no redundant ready message.

## Ongoing Constraints

- Keep the implementation to a handful of meaningful files and roughly hundreds to one thousand lines of handwritten application code when practical.
- Prefer direct functions and ordinary data structures over abstractions.
- Add no frontend framework, component library, major dependency, generalized rules engine, configuration system, or server architecture without explicit approval.
- Do not implement hypothetical variants or features absent from `GAME-RULES.md`.
- Preserve the single `DAILY_MODE` boolean as the only mode switch.
- Revisit this roadmap when evidence changes the plan; update the relevant milestone rather than losing the overall sequence.
