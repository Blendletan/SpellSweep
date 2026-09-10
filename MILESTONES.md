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
- [x] Provide an appropriate restart or new-puzzle action.

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

- [ ] Play multiple debug-mode boards on a desktop computer.
- [x] Confirm that the game is practically playable on desktop, phones, and touchscreens.
- [ ] Continue evaluating touchscreen wildcard entry and other detailed touch interactions.
- [ ] Continue evaluating phone layout, text size, controls, and scrolling as the interface changes.
- [x] Confirm that the Reveal Answer mechanic and solution display are understandable in normal play.
- [ ] Continue testing Reveal Answer cancellation, confirmation, and path inspection on each relevant device as the interface changes.
- [ ] Test native sharing or its fallback on desktop and mobile.
- [ ] Record typical word counts and how they compare with Perfect and Par.
- [x] Confirm that generated boards are solvable in practice, not merely in theory.
- [ ] Record whether difficulty comes from the rules, generated letters, obscure dictionary words, or interaction friction.
- [ ] Record accessibility and keyboard issues observed during real use.
- [ ] Decide which findings require rule changes and which require interface changes.

Completion criteria: there is enough evidence from desktop, touchscreen, and phone use to make targeted changes without guessing.

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

- [ ] Improve typography, spacing, and board appearance after interaction stabilizes.
- [ ] Refine feedback and restrained animations where useful.
- [ ] Produce and test the final static build.
- [ ] Verify relative paths and required assets on GitHub Pages.
- [ ] Set the intended release value of `DAILY_MODE`.
- [ ] Re-test daily puzzle persistence and local-midnight behavior when daily mode is enabled.
- [ ] Verify the final deployed game on desktop and mobile.

Completion criteria: the stabilized game is attractive, accessible, and verified on its final static GitHub Pages deployment.

## Milestone 17: Player Tutorial

- [ ] Decide how players enter, dismiss, and replay the tutorial without obstructing normal play.
- [ ] Explain the objective: cover all 25 tiles by submitting valid words.
- [ ] Demonstrate adjacent horizontal, vertical, and diagonal tile selection.
- [ ] Explain that a tile cannot be repeated within one word but may be reused in later words.
- [ ] Demonstrate entering a letter for the center wildcard and explain that it may represent a different letter in each word.
- [ ] Explain covered and uncovered tile states, word-count scoring, Perfect, Par, and the consequence of Reveal Answer.
- [ ] Keep the tutorial concise, keyboard accessible, touch friendly, and available to replay.
- [ ] Verify the tutorial on desktop, touchscreen laptop, and phone without changing the tested game rules.

Prefer a small in-page walkthrough built with the existing HTML, CSS, and TypeScript. Do not add an onboarding framework or dependency.

Completion criteria: a first-time player can understand and begin playing SpellSweep without outside instructions, and an experienced player can skip or reopen the tutorial easily.

## Milestone 18: GoatCounter Analytics

- [ ] Create or confirm the GoatCounter site and obtain its public site code.
- [ ] Add GoatCounter's smallest supported page-view integration to the static site.
- [ ] Record one custom event whenever a player activates the Share Result button.
- [ ] Count the share-button activation without including the puzzle, score, share text, or other player-entered data.
- [ ] Ensure analytics failure or blocking never interferes with gameplay or sharing.
- [ ] Add a brief privacy disclosure if the final GoatCounter configuration or applicable policy requires one.
- [ ] Verify production page-view counting on GitHub Pages.
- [ ] Verify the Share Result event is counted once per button activation on desktop and mobile.

Keep this limited to aggregate page visits and Share Result button activations. Do not add a tag manager, analytics framework, cookies, user accounts, or broader behavioral tracking.

Completion criteria: GoatCounter reports public-site visits and Share Result button activations accurately while the game remains a simple static site and sends no game or player data beyond those two aggregate events.

## Ongoing Constraints

- Keep the implementation to a handful of meaningful files and roughly hundreds to one thousand lines of handwritten application code when practical.
- Prefer direct functions and ordinary data structures over abstractions.
- Add no frontend framework, component library, major dependency, generalized rules engine, configuration system, or server architecture without explicit approval.
- Do not implement hypothetical variants or features absent from `GAME-RULES.md`.
- Preserve the single `DAILY_MODE` boolean as the only mode switch.
- Revisit this roadmap when evidence changes the plan; update the relevant milestone rather than losing the overall sequence.
