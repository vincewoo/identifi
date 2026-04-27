# IdentiFI — Claude context

## What this is

A static, no-build financial independence forecasting app. React 18 + Babel are loaded from CDN; JSX is transpiled in the browser at runtime. There is no package.json, no bundler, no build step.

## How to run

Open `index.html` in a browser, or:

```bash
npx serve .
python3 -m http.server
```

## Architecture

All state lives in `app.jsx` and flows down as props. There is no global store or context.

- `inputs` — the user's financial inputs (age, income, expenses, net worth, return assumptions, healthcare settings). Persisted to `localStorage` as `identifi_inputs`.
- `scenarios` — array of scenario objects with `overrides` merged on top of `inputs` at render time. Persisted as `identifi_scenarios`.
- `page` — active page key. Persisted as `identifi_page`.

## Math engine (`lib/fi-math.js`)

All exposed as `window.FIMath`. Key functions:

- `project(inputs)` — deterministic year-by-year compound growth, returns array of `{year, age, balance, fiTarget}`
- `timeToFI(inputs)` — finds the first year `balance >= fiTarget`
- `coastFI(inputs, targetAge)` — lump sum needed today to coast to FI by `targetAge`
- `baristaFI(inputs, partTimeIncome)` — portfolio needed when part-time income covers the gap
- `monteCarlo(inputs, opts)` — 500-trial Box-Muller simulation, returns `{paths, percentiles, successRate}`
- `healthcareBridge(inputs)` — pre-Medicare bridge fund: `years × annualCost`
- `fmtMoney(n)` / `fmtMoneyFull(n)` / `fmtPct(n)` — formatting helpers

The FI number is `annualExpenses × (100 / withdrawalRate) + healthcareBridge.total`.

## Component conventions

Each JSX file assigns its exports to `window` at the bottom (e.g. `Object.assign(window, { DashboardPage })`). This is how the browser-transpiled files share symbols without a module system.

Script load order in `index.html` matters:
1. `lib/fi-math.js` (plain JS, no JSX)
2. `tweaks-panel.jsx` (defines `useTweaks`, `TweaksPanel`, tweak controls)
3. `components/ui.jsx` (defines `Field`, `Sidebar`, `Icon`, etc.)
4. `components/charts.jsx` (depends on `FIMath`)
5. Page components (depend on `FIMath`, ui primitives, charts)
6. `app.jsx` (depends on everything above)

## Styles

All styles are in `styles.css`. Design tokens are CSS custom properties on `:root`. Dark mode uses `[data-theme="dark"]`. Compact density uses `[data-density="compact"]`. The accent hue is set dynamically via `document.documentElement.style.setProperty`.

Font stack: Inter Tight (display), JetBrains Mono (numbers/code), Source Serif 4 (editorial/italic pull-quotes).

## Deployment

GitHub Pages, `main` branch root. `index.html` is the entry point.
