# Live Shot Tracker (Local-First PWA)

A lightweight progressive web app for live, shot-by-shot game stats.

## Best way for iPad app-like use

Use GitHub Pages. It gives you one browser link, and iPad users can install to Home Screen.

### One-link setup (about 5 minutes)

1. Create a GitHub repository and upload this project.
2. Make sure the default branch is named main.
3. Push once. The included workflow at [.github/workflows/pages.yml](.github/workflows/pages.yml) deploys automatically.
4. In repository settings, open Pages and set Source to GitHub Actions (if not already set).
5. Your public link will be:
	https://YOUR-USERNAME.github.io/YOUR-REPO/

### Configure deployment (optional)

The workflow supports GitHub repository variables so you can tune deployment without editing the workflow each time.

Set these in repository Settings -> Secrets and variables -> Actions -> Variables:

- PAGES_PUBLISH_DIR: folder to publish (default is .)
- PAGES_CUSTOM_DOMAIN: custom domain like tracker.yourclub.org (optional)

The workflow file is [.github/workflows/pages.yml](.github/workflows/pages.yml).

### iPad install steps

1. Open the Pages URL in Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Launch from the new icon like an app.

Data still stays local on each device unless exported.

## What it does

- Start-page flow: capture game details once, then enter clean live mode
- Record shots via one-tap path buttons for all 1-7 to 1-7 combinations (49 buttons)
- Keep quick controls for team, player, and result to apply to each tap
- Keep a running game clock
- Auto-save everything locally in your browser (`localStorage`)
- Work offline after first load via service worker cache
- Export data at end of game to CSV or JSON

## Live workflow

1. Open app and fill in game details on **Start Game** page.
2. Press **Start Live Tracking**.
3. In live screen, set Team/Result/Player once.
4. Tap the 1-7 to 1-7 shot path buttons as shots happen.
5. Export CSV/JSON at the end.

## Quick start (no hosting platform required)

> PWAs need a local web server (not `file://`) for service worker + install support.

From this project folder, run one of these:

### Option A: Python

```powershell
python -m http.server 8080
```

Then open: http://localhost:8080

### Option B: Node

```powershell
npx serve .
```

Then open the local URL shown in terminal.

## Share with others

- Zip the folder and send it
- Teammates extract, run a local server command above, and open in browser
- They can install it to device home screen from browser menu (if supported)

## Data export

Use **Export CSV** or **Export JSON** after the game.

## Notes

- All game data stays on the current device/browser profile unless exported.
- To clear and start over, use **New Game**.
- For multi-game history, add a game list page later and store multiple sessions.
