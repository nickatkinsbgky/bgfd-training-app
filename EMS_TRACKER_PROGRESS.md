# EMS Recertification Tracker — Progress Snapshot

Saved: 2026-11-05

Repo: `nickatkinsbgky/bgfd-training-app`  
Live page: https://nickatkinsbgky.github.io/bgfd-training-app/ems-recert.html

## Current behavior

- Main page is the personnel search/select landing.
- **Open record** opens the person’s full record on its own page.
- Top-bar buttons open their own full pages:
  - View full roster
  - Department averages
  - Training focus
  - Race to Recertify
- Each of those pages has a **Back to EMS Tracker** button that returns to the main personnel list.
- Header “Find personnel” also returns to the main page.

## Top bar layout (left to right)

Save · Upload to site · Load site data · token · Save token · View full roster · Department averages · Training focus · Race to Recertify

## Key files

- `ems-recert.html` — page structure, top bar, views
- `ems-recert.js` — self-contained tracker logic (no remote fetch/eval)
- `ems-recert-data.js` — seed personnel and class data
- `ems-bracket.js` — Race to Recertify view
- `ems-sync.js` — GitHub token / upload / load site data
- `ems-pdf.js` — printable PDF export

## Notes for later

- Script is self-contained. Do not reintroduce the old fetch+eval loader.
- Person-view navigation buttons (Full roster / Department averages / Training focus) were removed from the person page. Their handlers in JS are null-guarded so a missing element does not crash startup.
- If buttons or data stop working, check the browser console for a null `.onclick` on a missing element and guard it.
- Cache-buster on `ems-recert.js` must be bumped in the HTML after JS changes so GitHub Pages serves the new file.
