// Dashboard page
const { useMemo: useMemoD } = React;

function DashboardPage({ inputs }) {
  const series = useMemoD(() => window.FIMath.project(inputs), [inputs]);
  const fi = window.FIMath.timeToFI(inputs);
  const annualSavings = inputs.annualIncome * (inputs.savingsRate / 100);
  const savingsRate = inputs.savingsRate;
  const baseFI = inputs.annualExpenses * (100 / inputs.withdrawalRate);
  const hcBridge = window.FIMath.healthcareBridge(inputs);
  const fiNumber = baseFI + hcBridge.total;
  const yearsLeft = fi.years;
  const fiDate = yearsLeft != null ? new Date(2026, 3, 24 + yearsLeft * 365.25) : null;
  const progress = Math.min(1, inputs.currentNetWorth / fiNumber);

  // Coast FI at age 65
  const coastNum = window.FIMath.coastFI(inputs, 65);
  const coastReached = inputs.currentNetWorth >= coastNum;
  // Barista FI at $25k part-time
  const baristaNum = window.FIMath.baristaFI(inputs, 25000);

  const fmt = window.FIMath.fmtMoney;
  const fmtFull = window.FIMath.fmtMoneyFull;

  const quip = useMemoD(() => {
    if (yearsLeft == null) return "At this rate, the heat death of the universe gets there first.";
    if (savingsRate < 10) return "You're saving like rent is due tomorrow. Because, statistically, it kind of is.";
    if (yearsLeft < 5) return "You're basically already there. Quietly start drafting the resignation email.";
    if (yearsLeft < 12) return "Respectable. Boring. Boring is good. Boring compounds.";
    if (yearsLeft < 22) return "The math works. Now you just have to outlast it.";
    if (yearsLeft < 35) return "Long road. Pack snacks. Index funds. Patience.";
    return "Two-thirds of a working life. Consider raising income, lowering rent, or finding god.";
  }, [yearsLeft, savingsRate]);

  return (
    <>
      <PageHead
        title="Where you stand"
        sub="The number you're chasing, the number you have, and the gap between them — refreshed every time you change an assumption."
        actions={<>
          <button className="btn ghost">Export ↓</button>
          <button className="btn primary">Adjust inputs</button>
        </>}
      />

      <div className="hero-stat">
        <div>
          <div className="lead">Years to financial independence</div>
          <div className="big">
            {yearsLeft != null ? yearsLeft : "∞"}
            <span className="unit">years</span>
          </div>
          <div className="quip">{quip}</div>
        </div>
        <div className="summary">
          <div className="summary-row">
            <span className="k">FI date</span>
            <span className="v">{fiDate ? fiDate.toLocaleDateString("en-US", {month: "short", year: "numeric"}) : "—"}</span>
          </div>
          <div className="summary-row">
            <span className="k">Age at FI</span>
            <span className="v">{fi.age ?? "—"}</span>
          </div>
          <div className="summary-row">
            <span className="k">Target portfolio</span>
            <span className="v">{fmt(fiNumber)}</span>
          </div>
          {hcBridge.total > 0 && (
            <div className="summary-row" style={{paddingLeft: 14, borderLeft: "2px solid var(--accent)", marginLeft: -16}}>
              <span className="k" style={{fontSize: 11}}>↳ healthcare bridge</span>
              <span className="v" style={{fontSize: 14, color: "var(--ink-2)"}}>+{fmt(hcBridge.total)}</span>
            </div>
          )}
          <div className="summary-row">
            <span className="k">Today</span>
            <span className="v">{fmt(inputs.currentNetWorth)}</span>
          </div>
          <div style={{marginTop: 4}}>
            <div className="progress"><span style={{width: `${progress * 100}%`}}></span></div>
            <div style={{display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)"}}>
              <span>{(progress * 100).toFixed(1)}% of FI</span>
              <span>{fmt(fiNumber - inputs.currentNetWorth)} remaining</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="Net worth" value={fmt(inputs.currentNetWorth)} sub="across all accounts" />
        <Stat label="Annual savings" value={fmt(annualSavings)} sub={`${savingsRate}% of income`} delta={`+${fmt(annualSavings)}/yr`} />
        <Stat label="Real return" value={`${(window.FIMath.realReturn(inputs.annualReturn, inputs.inflation) * 100).toFixed(2)}%`} sub={`${inputs.annualReturn}% nom · ${inputs.inflation}% infl`} />
        <Stat label="Withdrawal rate" value={`${inputs.withdrawalRate}%`} sub="aka the fragile rule" />
      </div>

      <div className="section-head">
        <h2>Projection</h2>
        <span className="meta">today's dollars · 60-year horizon</span>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Net worth, projected</h3>
          <span className="chip dot">deterministic · {inputs.annualReturn}% nominal</span>
        </div>
        <ProjectionChart series={series} />
        <div style={{display: "flex", gap: 18, marginTop: 16, fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-mono)"}}>
          <span style={{display: "flex", alignItems: "center", gap: 6}}>
            <span style={{width: 14, height: 2, background: "var(--ink)"}}></span> Portfolio value
          </span>
          <span style={{display: "flex", alignItems: "center", gap: 6}}>
            <span style={{width: 14, height: 2, background: "var(--accent)", borderTop: "1px dashed"}}></span> FI threshold
          </span>
          <span style={{display: "flex", alignItems: "center", gap: 6}}>
            <span style={{width: 8, height: 8, borderRadius: "50%", background: "var(--ink)"}}></span> Crossover
          </span>
        </div>
      </div>

      <div className="grid-12-8" style={{marginTop: 20}}>
        <div className="card">
          <div className="card-head">
            <h3>Sensitivity to savings rate</h3>
            <span className="chip">years to FI · holding everything else equal</span>
          </div>
          <SavingsRateBar inputs={inputs} />
          <div className="editorial" style={{marginTop: 14}}>
            Income matters. Investment returns matter. But the lever you actually control — every month, in real time — is the gap between what comes in and what goes out.
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>FI variants</h3>
            <span className="meta">for the impatient</span>
          </div>
          <div style={{display: "flex", flexDirection: "column", gap: 14}}>
            <div>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
                <strong style={{fontSize: 13}}>Coast FI <span style={{fontWeight: 400, color: "var(--ink-3)", fontSize: 12}}>· stop saving at 65</span></strong>
                {coastReached && <span className="pill">reached</span>}
              </div>
              <div className="num" style={{fontSize: 22, marginTop: 4}}>{fmtFull(coastNum)}</div>
              <div style={{fontSize: 12, color: "var(--ink-3)", marginTop: 2}}>
                Hit this and you can stop contributing. Compound interest takes the wheel.
              </div>
            </div>
            <div style={{borderTop: "1px solid var(--rule)", paddingTop: 14}}>
              <strong style={{fontSize: 13}}>Barista FI <span style={{fontWeight: 400, color: "var(--ink-3)", fontSize: 12}}>· $25k side income</span></strong>
              <div className="num" style={{fontSize: 22, marginTop: 4}}>{fmtFull(baristaNum)}</div>
              <div style={{fontSize: 12, color: "var(--ink-3)", marginTop: 2}}>
                Portfolio covers the gap. You serve oat lattes, philosophically.
              </div>
            </div>
            <div style={{borderTop: "1px solid var(--rule)", paddingTop: 14}}>
              <strong style={{fontSize: 13}}>Lean FI <span style={{fontWeight: 400, color: "var(--ink-3)", fontSize: 12}}>· bare-bones spend</span></strong>
              <div className="num" style={{fontSize: 22, marginTop: 4}}>{fmtFull(inputs.annualExpenses * 0.7 * 25)}</div>
              <div style={{fontSize: 12, color: "var(--ink-3)", marginTop: 2}}>
                Cut spending 30%, retire sooner, eat more lentils.
              </div>
            </div>
          </div>
        </div>
      </div>

      {hcBridge.total > 0 && (
        <div className="card" style={{marginTop: 20}}>
          <div className="card-head">
            <h3>Healthcare bridge</h3>
            <span className="chip dot">retire {hcBridge.retireAge} → Medicare {hcBridge.medicareAge}</span>
          </div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 24, alignItems: "center"}}>
            <div>
              <div className="stat-label">Years uncovered</div>
              <div className="stat-value">{hcBridge.years}</div>
              <div className="stat-sub">no employer plan, no Medicare</div>
            </div>
            <div>
              <div className="stat-label">Per year</div>
              <div className="stat-value">{fmtFull(hcBridge.annual)}</div>
              <div className="stat-sub">premiums + OOP, today's $</div>
            </div>
            <div>
              <div className="stat-label">Bridge fund</div>
              <div className="stat-value" style={{color: "var(--accent-ink)"}}>{fmtFull(hcBridge.total)}</div>
              <div className="stat-sub">added to your FI number</div>
            </div>
            <div className="editorial" style={{fontSize: 13}}>
              ACA subsidies cliff at 400% FPL. Below that, the marketplace is genuinely affordable. Above it, healthcare alone can postpone retirement by years. Plan accordingly, or get a spouse with benefits.
            </div>
          </div>
          <div style={{marginTop: 18, position: "relative", height: 36, background: "var(--bg)", borderRadius: 6, overflow: "hidden", border: "1px solid var(--rule)"}}>
            {(() => {
              const start = hcBridge.retireAge;
              const end = hcBridge.medicareAge;
              const span = 80 - inputs.currentAge;
              const left = ((start - inputs.currentAge) / span) * 100;
              const width = ((end - start) / span) * 100;
              return (
                <>
                  <div style={{position: "absolute", left: `${left}%`, top: 0, bottom: 0, width: `${width}%`, background: "var(--accent)", opacity: 0.25}}></div>
                  <div style={{position: "absolute", left: `${left}%`, top: 0, bottom: 0, borderLeft: "1px solid var(--accent-ink)"}}></div>
                  <div style={{position: "absolute", left: `${left + width}%`, top: 0, bottom: 0, borderLeft: "1px solid var(--ink)"}}></div>
                  <div style={{position: "absolute", left: 8, top: 10, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-3)"}}>now · {inputs.currentAge}</div>
                  <div style={{position: "absolute", left: `calc(${left}% + 6px)`, top: 10, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-ink)"}}>retire · {start}</div>
                  <div style={{position: "absolute", left: `calc(${left + width}% + 6px)`, top: 10, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-2)"}}>medicare · {end}</div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

Object.assign(window, { DashboardPage });
