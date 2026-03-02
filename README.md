# MathCounts Ladder MVP

A simple, kid-friendly tournament tracker for a 10-person MathCounts-style head-to-head ladder.

## What it does
- Takes 10 to 16 competitor names (default template starts with 16 lines).
- Randomly shuffles the starting order.
- Adds a staged intro: hold list, casino-style shuffle, announce first pair, then start.
- Assigns each competitor a consistent animal emoji across all views.
- Runs matches as **current winner vs next challenger**.
- Early rounds (more than 4 competitors active): first to 3 points wins each match.
- Loser is placed from the back: 10th, 9th, 8th, ...
- Final four (semis/finals): must win by a margin of 3 points.
- Auto-resets score for each new match.
- Shows confetti and winner banner after each match.
- Saves progress automatically in browser storage.

## Accuracy and testing
- A tested reference rules engine is included in `tournament-engine.js` as pure functions.
- Automated tests are in `tests/tournament-engine.test.js`.
- Covered cases include:
	- winner seat-stability (left/right winner stays in same seat),
	- correct back placement order,
	- right-column queue depletion as competitors are pulled in,
	- final-four target switch,
	- tournament finish and champion placement,
	- invalid input side handling,
	- ignored scoring once tournament is finished.

### Run tests
If Node.js is installed:
- `node --test tests/*.test.js`
- or `npm test`

## How to run
### Easiest option
Open `index.html` in any modern browser.

### Optional local server
If needed, run one of these in this folder:
- Python: `python -m http.server 8080`
- Node: `npx serve .`

Then open `http://localhost:8080`.

## Handoff tips
- Keep this folder together (`index.html`, `styles.css`, `app.js`, `tournament-engine.js`).
- To clear saved state, click **New Tournament** or clear browser site data.

## Portable Windows EXE
This project can be packaged as a portable desktop app (no installer required).

### Build prerequisites
- Node.js installed on Windows.

### Build commands
- Install dependencies: `npm install`
- Build portable EXE: `npm run build:portable`

### Output
- Portable executable: `release/MathCounts Ladder 1.0.0.exe`
- Unpacked app folder: `release/win-unpacked/`

Note: the EXE is unsigned by default, so Windows SmartScreen may show a warning on first run.
