# IdentiFI

A financial independence forecasting tool. Enter your income, expenses, net worth, and assumptions — get a projection of when you hit FI, Monte Carlo simulations, scenario comparisons, and milestone tracking.

Live at: https://vincewoo.github.io/identifi/

## Features

- **Dashboard** — years-to-FI hero stat, net worth projection chart, savings rate sensitivity, Coast/Barista/Lean FI variants
- **Scenarios** — side-by-side comparison of up to 3 custom scenarios with an overlaid chart
- **Monte Carlo** — 500-trial fan chart with p10–p90 bands, success rate ring, adjustable volatility
- **Milestones** — waypoints from first $100K to Fat FI with year and age stamps
- **Inputs** — income, expenses, net worth, savings rate
- **Assumptions** — return rate, inflation, withdrawal rate, Social Security, tax modeling, healthcare bridge

### Healthcare bridge

Models out-of-pocket healthcare costs between early retirement and Medicare eligibility (age 65). Adds the bridge fund to your FI number so it's baked into the target, not forgotten.

## Stack

No build step. No framework dependencies beyond React itself.

- **React 18** — loaded from CDN
- **Babel standalone** — transpiles JSX in the browser
- **Pure SVG charts** — no charting library
- **Google Fonts** — Inter Tight, JetBrains Mono, Source Serif 4

## File structure

```
index.html              Entry point (GitHub Pages default)
styles.css              Design tokens + all component styles
app.jsx                 App shell, routing, default inputs, localStorage
tweaks-panel.jsx        Floating tweaks panel (theme, density, accent hue)
lib/
  fi-math.js            Math engine: projection, Monte Carlo, Coast/Barista FI
components/
  ui.jsx                Shared primitives: Field, Stat, Sidebar, icons
  charts.jsx            SVG charts: Projection, MonteCarlo, Compare, SuccessRing
  page-dashboard.jsx    Dashboard page
  page-scenarios.jsx    Scenarios page
  page-monte.jsx        Monte Carlo page
  page-milestones.jsx   Milestones page
  page-inputs.jsx       Inputs + Assumptions pages
```

## Running locally

Open `index.html` directly in a browser, or serve it with any static file server:

```bash
npx serve .
# or
python3 -m http.server
```

## Data persistence

All inputs and scenarios are saved to `localStorage` automatically. Clearing browser data resets to defaults.

## Deployment

Hosted on GitHub Pages from the `main` branch root. No CI needed — push to `main` and it's live.

## Disclaimer

Not financial advice. Not even sound advice. Just math, dressed up.
