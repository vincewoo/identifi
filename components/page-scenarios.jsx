// Scenarios page
const { useState: useStateS, useMemo: useMemoS } = React;

function ScenariosPage({ inputs, scenarios, setScenarios }) {
  const [editing, setEditing] = useStateS(scenarios[0].id);
  const fmt = window.FIMath.fmtMoney;

  const computed = useMemoS(() => scenarios.map(s => {
    const merged = { ...inputs, ...s.overrides };
    const series = window.FIMath.project(merged);
    const fi = window.FIMath.timeToFI(merged);
    return { ...s, merged, series, fi };
  }), [scenarios, inputs]);

  const fiNumber = inputs.annualExpenses * (100 / inputs.withdrawalRate);
  const baseline = computed[0];

  const editScenario = computed.find(s => s.id === editing) || computed[0];

  return (
    <>
      <PageHead
        title="Scenarios"
        sub="What if you got a raise. What if you moved. What if you panic-sold in March 2020. Run the parallels side by side; lie to yourself with rigor."
        actions={<>
          <button className="btn ghost"><Icon.add /> New scenario</button>
          <button className="btn primary">Save view</button>
        </>}
      />

      <div className="card" style={{marginBottom: 20}}>
        <div className="card-head">
          <h3>Compare</h3>
          <span className="chip">{computed.length} scenarios · today's $</span>
        </div>
        <CompareChart scenarios={computed} fiNumber={fiNumber} />
        <div style={{display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap"}}>
          {computed.map((s, i) => {
            const colors = ["var(--ink)", "var(--accent)", "oklch(0.55 0.18 28)", "oklch(0.55 0.16 260)"];
            return (
              <div key={s.id} style={{display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "var(--font-mono)"}}>
                <span style={{width: 16, height: 2, background: colors[i % colors.length]}}></span>
                <span style={{color: "var(--ink-2)"}}>{s.name}</span>
                <span style={{color: "var(--ink-4)"}}>· {s.fi.years != null ? `${s.fi.years}y` : "never"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-3" style={{marginBottom: 20}}>
        {computed.map(s => {
          const delta = baseline && s.id !== baseline.id && s.fi.years != null && baseline.fi.years != null
            ? s.fi.years - baseline.fi.years : null;
          return (
            <div key={s.id} className={`scenario ${editing === s.id ? "selected" : ""}`}
              onClick={() => setEditing(s.id)}>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <div className="name">{s.name}</div>
                {s.id === baseline.id && <span className="chip">baseline</span>}
              </div>
              <div className="tag">{s.tag}</div>
              <div className="headline">
                {s.fi.years != null ? `${s.fi.years}y` : "∞"}
                {delta != null && (
                  <span style={{fontSize: 13, marginLeft: 8, color: delta < 0 ? "var(--pos)" : "var(--neg)"}}>
                    {delta < 0 ? "↓" : "↑"}{Math.abs(delta)}y
                  </span>
                )}
              </div>
              <div className="num-row">
                <span>income</span>
                <span className="v">{fmt(s.merged.annualIncome)}</span>
              </div>
              <div className="num-row">
                <span>expenses</span>
                <span className="v">{fmt(s.merged.annualExpenses)}</span>
              </div>
              <div className="num-row">
                <span>save rate</span>
                <span className="v">{s.merged.savingsRate}%</span>
              </div>
              <div className="num-row">
                <span>FI age</span>
                <span className="v">{s.fi.age ?? "—"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Editing · {editScenario.name}</h3>
          <span className="meta">overrides only — blanks inherit from inputs</span>
        </div>
        <div className="grid-3" style={{gap: 16}}>
          <Field label="Annual income"
            value={editScenario.merged.annualIncome}
            onChange={v => updateOverride(scenarios, setScenarios, editing, "annualIncome", v)}
            prefix="$" />
          <Field label="Annual expenses"
            value={editScenario.merged.annualExpenses}
            onChange={v => updateOverride(scenarios, setScenarios, editing, "annualExpenses", v)}
            prefix="$" />
          <Field label="Savings rate"
            value={editScenario.merged.savingsRate}
            onChange={v => updateOverride(scenarios, setScenarios, editing, "savingsRate", v)}
            suffix="%" min="0" max="100" />
          <Field label="Expected return"
            value={editScenario.merged.annualReturn}
            onChange={v => updateOverride(scenarios, setScenarios, editing, "annualReturn", v)}
            suffix="%" step="0.1" />
          <Field label="Inflation"
            value={editScenario.merged.inflation}
            onChange={v => updateOverride(scenarios, setScenarios, editing, "inflation", v)}
            suffix="%" step="0.1" />
          <Field label="Withdrawal rate"
            value={editScenario.merged.withdrawalRate}
            onChange={v => updateOverride(scenarios, setScenarios, editing, "withdrawalRate", v)}
            suffix="%" step="0.1" />
        </div>
      </div>
    </>
  );
}

function updateOverride(scenarios, setScenarios, id, key, value) {
  setScenarios(scenarios.map(s =>
    s.id === id ? { ...s, overrides: { ...s.overrides, [key]: value } } : s
  ));
}

Object.assign(window, { ScenariosPage });
