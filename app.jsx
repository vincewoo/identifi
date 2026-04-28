// Main app shell
const { useState: useStateApp, useEffect: useEffectApp } = React;

function loadStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function usePersistedState(key, defaultValue) {
  const [state, setState] = useStateApp(() => loadStored(key, defaultValue));
  const setPersisted = (value) => {
    setState(value);
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };
  return [state, setPersisted];
}

const DEFAULT_INPUTS = {
  currentAge: 32,
  targetAge: 50,
  annualIncome: 145000,
  annualExpenses: 62000,
  savingsRate: 42,
  currentNetWorth: 185000,
  annualReturn: 7.5,
  inflation: 2.8,
  withdrawalRate: 4.0,
  realDollars: true,
  includeSS: false,
  taxAware: false,
  sorr: true,
  healthcare: {
    enabled: true,
    coveredByExpenses: false,
    annualCost: 14000,   // ACA marketplace family-of-2 ish, post-subsidy
    retireAge: 50,
    medicareAge: 65,
  },
  passiveIncome: {
    enabled: false,
    annual: 0,           // present-day $/yr (real dollars)
    growthRate: 0,       // % per year nominal growth
    preRetirement: true, // if true, counts as extra contributions before FI
  },
  liabilities: {
    enabled: false,
    items: [],           // array of { id, label, kind, balance, rate, monthlyPayment, includeInNetWorth }
  },
};

const DEFAULT_SCENARIOS = [
  { id: "base", name: "Status quo", tag: "current trajectory", overrides: {} },
  { id: "raise", name: "Big raise + same spend", tag: "+ $40k income, hold expenses", overrides: { annualIncome: 185000, savingsRate: 55 } },
  { id: "lcol", name: "Move to LCOL city", tag: "− $18k expenses", overrides: { annualExpenses: 44000, savingsRate: 58 } },
];

function App() {
  const tweaks = useTweaks({
    "theme": "light",
    "density": "comfy",
    "accentHue": 152,
    "chartStyle": "shaded",
    "numberFormat": "abbr",
    "tone": "dry",
    "showHero": true
  });

  const [page, setPage] = usePersistedState("identifi_page", "dashboard");
  const [inputs, setInputs] = usePersistedState("identifi_inputs", DEFAULT_INPUTS);
  const [scenarios, setScenarios] = usePersistedState("identifi_scenarios", DEFAULT_SCENARIOS);
  const [mobileNav, setMobileNav] = useStateApp(false);

  const [tweakValues] = tweaks;

  // Apply theme + density tweaks
  useEffectApp(() => {
    document.documentElement.setAttribute("data-theme", tweakValues.theme);
    document.documentElement.setAttribute("data-density", tweakValues.density);
    document.documentElement.style.setProperty("--accent", `oklch(0.62 0.18 ${tweakValues.accentHue})`);
    document.documentElement.style.setProperty("--accent-ink", `oklch(0.32 0.10 ${tweakValues.accentHue})`);
    document.documentElement.style.setProperty("--accent-soft", `oklch(0.93 0.05 ${tweakValues.accentHue})`);
  }, [tweakValues.theme, tweakValues.density, tweakValues.accentHue]);

  const pageMap = {
    dashboard: <DashboardPage inputs={inputs} setPage={setPage} />,
    scenarios: <ScenariosPage inputs={inputs} scenarios={scenarios} setScenarios={setScenarios} />,
    monte: <MonteCarloPage inputs={inputs} />,
    milestones: <MilestonesPage inputs={inputs} />,
    inputs: <InputsPage inputs={inputs} setInputs={setInputs} />,
    settings: <SettingsPage inputs={inputs} setInputs={setInputs} />,
  };

  const screenLabels = {
    dashboard: "01 Dashboard", scenarios: "02 Scenarios", monte: "03 Monte Carlo",
    milestones: "04 Milestones", inputs: "05 Inputs", settings: "06 Assumptions",
  };

  return (
    <div className="app" data-screen-label={screenLabels[page]}>
      <Sidebar page={page} setPage={setPage} onClose={mobileNav ? () => setMobileNav(false) : null} />
      <main className="main">
        <div className="mobile-bar">
          <div className="brand">
            <BrandMark />
            <div>IdentiFI</div>
          </div>
          <button className="btn ghost" onClick={() => setMobileNav(true)}><Icon.menu /></button>
        </div>
        {pageMap[page]}
      </main>

      <TweaksPanel tweaks={tweaks}>
        <TweakSection label="Appearance">
          <TweakRadio tweaks={tweaks} k="theme" label="Theme"
            options={[{value:"light",label:"Light"},{value:"dark",label:"Dark"}]} />
          <TweakRadio tweaks={tweaks} k="density" label="Density"
            options={[{value:"comfy",label:"Comfy"},{value:"compact",label:"Compact"}]} />
          <TweakSlider tweaks={tweaks} k="accentHue" label="Accent hue" min={0} max={360} step={1} />
        </TweakSection>
        <TweakSection label="Display">
          <TweakRadio tweaks={tweaks} k="chartStyle" label="Chart fill"
            options={[{value:"shaded",label:"Shaded"},{value:"line",label:"Line only"}]} />
          <TweakRadio tweaks={tweaks} k="numberFormat" label="Numbers"
            options={[{value:"abbr",label:"$1.2M"},{value:"full",label:"$1,200,000"}]} />
        </TweakSection>
        <TweakSection label="Voice">
          <TweakRadio tweaks={tweaks} k="tone" label="Tone"
            options={[{value:"dry",label:"Dry"},{value:"neutral",label:"Neutral"},{value:"warm",label:"Encouraging"}]} />
          <TweakToggle tweaks={tweaks} k="showHero" label="Hero quip" />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
