# Live Shot Tracker (Local-First PWA)

A lightweight progressive web app for live, shot-by-shot game stats.

## Best way for iPad app-like use

Use GitHub Pages. It gives you one browser link, and iPad users can install to Home Screen.

### One-link setup (about 5 minutes)

1. Create a GitHub repository and upload this project.
2. Make sure the default branch is named main.
3. Push once. The included workflow at [.github/workflows/pages.yml](.github/workflows/pages.yml) deploys automatically.
4. In repository settings, set Pages source to GitHub Actions (one-time).
5. Your public link will be:
	https://YOUR-USERNAME.github.io/YOUR-REPO/

### Configure deployment (optional)

The workflow supports GitHub repository variables so you can tune deployment without editing the workflow each time.

Set these in repository Settings -> Secrets and variables -> Actions -> Variables:

- PAGES_PUBLISH_DIR: folder to publish (default is .)
- PAGES_CUSTOM_DOMAIN: custom domain like tracker.yourclub.org (optional)

The workflow file is [.github/workflows/pages.yml](.github/workflows/pages.yml).

### Troubleshooting GitHub Pages action errors

If Actions shows `Resource not accessible by integration` on `configure-pages`:

1. Open repository Settings -> Actions -> General.
2. Under Workflow permissions, select Read and write permissions.
3. Open Settings -> Pages and set Source to GitHub Actions.
4. Re-run the failed workflow.

If this is an organization repository, an admin policy may block Pages creation from Actions. In that case, enable Pages manually once, then deployments will work.

### iPad install steps

1. Open the Pages URL in Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Launch from the new icon like an app.

Data still stays local on each device unless exported.

## What it does

- Start-page flow: capture game details and player labels once, then enter live mode
- Player labels for both teams (6 each), used in all displays and exports
- Multi-screen live workspace with tabs: Capture, Stats, Log, Report
- Record shots with shooter + from/hit/result/outcome rows and auto-submit
- Expandable extra shot inputs (phase, defense, note), easy to extend in code
- Auto-save everything locally in your browser (`localStorage`)
- Work offline after first load via service worker cache
- Export data at end of game to CSV, JSON, and PDF report

## Live workflow

1. Open app and fill in game details on **Start Game** page.
2. Press **Start Live Tracking**.
3. Use **Capture** tab to enter shots (auto-submits when required rows are complete).
4. Open **More Shot Inputs** only when needed.
5. Use **Stats** and **Log** tabs when you want to review.
6. Use **Report** tab for breakdowns and PDF export.

## Report output

The PDF report includes:

- Match header information
- Totals and score summary
- Player breakdown (shots, goals, blocked, out)
- From-zone distribution
- Hit-zone distribution
- Result distribution
- Outcome distribution

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
- The app checks for updates on load and reloads when a new version is available.
- If an installed iPad copy still shows an old version, remove it from the Home Screen and add it again after the newest deploy.
