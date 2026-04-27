// Inputs page
function InputsPage({ inputs, setInputs }) {
  const set = (k, v) => setInputs({ ...inputs, [k]: v });
  const fmt = window.FIMath.fmtMoney;
  const annualSavings = inputs.annualIncome * (inputs.savingsRate / 100);

  return (
    <>
      <PageHead
        title="Inputs"
        sub="Tell the model what's true today. Garbage in, garbage projection. Honest in, mildly less garbage."
        actions={<button className="btn primary">Save snapshot</button>}
      />

      <div className="grid-12-8">
        <div style={{display: "flex", flexDirection: "column", gap: 20}}>
          <div className="card">
            <div className="card-head"><h3>About you</h3></div>
            <div className="grid-2" style={{gap: 16}}>
              <Field label="Current age" value={inputs.currentAge} onChange={v => set("currentAge", v)} suffix="yrs" />
              <Field label="Target retirement age" value={inputs.targetAge} onChange={v => set("targetAge", v)} suffix="yrs" help="Aspirational, not binding" />
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Money in, money out</h3></div>
            <div className="grid-2" style={{gap: 16}}>
              <Field label="Annual income (post-tax)" value={inputs.annualIncome} onChange={v => set("annualIncome", v)} prefix="$" />
              <Field label="Annual expenses" value={inputs.annualExpenses} onChange={v => set("annualExpenses", v)} prefix="$" />
              <SliderField label="Savings rate" value={inputs.savingsRate} onChange={v => set("savingsRate", v)} min={0} max={80} step={1} suffix="%" help={`= ${fmt(annualSavings)} / year`} />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Passive income</h3>
              <span className="meta">dividends, rental, royalties</span>
            </div>
            <div className="grid-2" style={{gap: 20, marginBottom: 18}}>
              <div className="toggle-row" style={{borderBottom: "none", padding: 0}}>
                <div className="lab">Model passive income
                  <small>Reduces FI number; optionally boosts pre-FI savings</small>
                </div>
                <Switch on={inputs.passiveIncome?.enabled ?? false}
                  onChange={v => set("passiveIncome", { ...(inputs.passiveIncome || {}), enabled: v })} />
              </div>
              <div className="toggle-row" style={{borderBottom: "none", padding: 0}}>
                <div className="lab">Augments pre-retirement savings
                  <small>Add to contributions while still working</small>
                </div>
                <Switch on={inputs.passiveIncome?.preRetirement ?? true}
                  onChange={v => set("passiveIncome", { ...(inputs.passiveIncome || {}), preRetirement: v })} />
              </div>
            </div>
            <div className="grid-2" style={{gap: 16}}>
              <Field label="Annual passive income"
                value={inputs.passiveIncome?.annual ?? 0}
                onChange={v => set("passiveIncome", { ...(inputs.passiveIncome || {}), annual: v })}
                prefix="$" help="Dividends, rent, royalties — today's dollars" />
              <Field label="Annual growth rate"
                value={inputs.passiveIncome?.growthRate ?? 0}
                onChange={v => set("passiveIncome", { ...(inputs.passiveIncome || {}), growthRate: v })}
                suffix="%" step={0.5} help="How fast this income stream grows per year (nominal)" />
            </div>
            <div className="editorial" style={{marginTop: 16, fontSize: 14}}>
              {(() => {
                const pi = inputs.passiveIncome || {};
                if (!pi.enabled) return "Passive income is off. If you have dividends or rental income, model it here.";
                const piAnnual = pi.annual ?? 0;
                if (piAnnual === 0) return "Enter an annual amount above to see the effect on your FI number.";
                const reduction = piAnnual * (100 / inputs.withdrawalRate);
                return `${window.FIMath.fmtMoneyFull(piAnnual)}/yr of passive income reduces your required portfolio by ${window.FIMath.fmtMoneyFull(reduction)} at a ${inputs.withdrawalRate}% withdrawal rate.`;
              })()}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Portfolio today</h3></div>
            <div className="grid-2" style={{gap: 16}}>
              <Field label="Current net worth" value={inputs.currentNetWorth} onChange={v => set("currentNetWorth", v)} prefix="$" help="Investable assets only" />
              <Field label="Annual contributions" value={annualSavings} onChange={() => {}} prefix="$" help="Computed from above" />
            </div>
            <div style={{marginTop: 18}}>
              <div style={{fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", marginBottom: 8}}>Allocation (approximate)</div>
              <div style={{display: "flex", height: 8, borderRadius: 4, overflow: "hidden", border: "1px solid var(--rule)"}}>
                <div style={{flex: 70, background: "var(--ink)"}}></div>
                <div style={{flex: 20, background: "var(--ink-3)"}}></div>
                <div style={{flex: 8, background: "var(--accent)"}}></div>
                <div style={{flex: 2, background: "var(--rule-strong)"}}></div>
              </div>
              <div style={{display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)"}}>
                <span><span style={{display: "inline-block", width: 8, height: 8, background: "var(--ink)", marginRight: 4}}></span>Stocks 70%</span>
                <span><span style={{display: "inline-block", width: 8, height: 8, background: "var(--ink-3)", marginRight: 4}}></span>Bonds 20%</span>
                <span><span style={{display: "inline-block", width: 8, height: 8, background: "var(--accent)", marginRight: 4}}></span>Cash 8%</span>
                <span><span style={{display: "inline-block", width: 8, height: 8, background: "var(--rule-strong)", marginRight: 4}}></span>Other 2%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{position: "sticky", top: 20, alignSelf: "start"}}>
          <div className="card-head"><h3>Live snapshot</h3></div>
          <div style={{display: "flex", flexDirection: "column", gap: 12}}>
            <Stat label="Annual savings" value={fmt(annualSavings)} sub={`${inputs.savingsRate}% of ${fmt(inputs.annualIncome)}`} />
            <div style={{borderTop: "1px solid var(--rule)", paddingTop: 12}}>
              {(() => {
                const piAnnual = (inputs.passiveIncome?.enabled && inputs.passiveIncome?.annual > 0)
                  ? inputs.passiveIncome.annual : 0;
                const fiNum = Math.max(0, inputs.annualExpenses - piAnnual) * (100 / inputs.withdrawalRate);
                return <Stat label="FI number" value={fmt(fiNum)} sub={`${inputs.withdrawalRate}% withdrawal${piAnnual > 0 ? ` · −${fmt(piAnnual)}/yr passive` : ""}`} />;
              })()}
            </div>
            <div style={{borderTop: "1px solid var(--rule)", paddingTop: 12}}>
              <Stat label="Real return" value={`${(window.FIMath.realReturn(inputs.annualReturn, inputs.inflation) * 100).toFixed(2)}%`} sub="after inflation" />
            </div>
          </div>
          <div className="editorial" style={{marginTop: 16, fontSize: 13}}>
            Round numbers are fine. Precision here is theater — the assumptions wobble more than the inputs ever will.
          </div>
        </div>
      </div>
    </>
  );
}

// Settings / Assumptions page
function SettingsPage({ inputs, setInputs }) {
  const set = (k, v) => setInputs({ ...inputs, [k]: v });
  return (
    <>
      <PageHead
        title="Assumptions"
        sub="The numbers that decide whether the chart goes up or sideways. Tweak them, watch everything else move."
      />
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3>Markets & inflation</h3></div>
          <div style={{display: "flex", flexDirection: "column", gap: 18}}>
            <SliderField label="Expected nominal return" value={inputs.annualReturn} onChange={v => set("annualReturn", v)} min={2} max={12} step={0.1} suffix="%" help="S&P 500 long-run average ≈ 7-10%" />
            <SliderField label="Inflation" value={inputs.inflation} onChange={v => set("inflation", v)} min={0} max={8} step={0.1} suffix="%" help="Long-run US ≈ 2-3%. Recent: spicier." />
            <SliderField label="Withdrawal rate" value={inputs.withdrawalRate} onChange={v => set("withdrawalRate", v)} min={2} max={6} step={0.1} suffix="%" help="The 4% rule comes from a 1994 paper. Update accordingly." />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Behavior</h3></div>
          <div className="toggle-row">
            <div className="lab">Inflation-adjusted display
              <small>Show all figures in today's purchasing power</small>
            </div>
            <Switch on={inputs.realDollars} onChange={v => set("realDollars", v)} />
          </div>
          <div className="toggle-row">
            <div className="lab">Include Social Security
              <small>Estimate $1,800/mo at age 67. Aspirational.</small>
            </div>
            <Switch on={inputs.includeSS} onChange={v => set("includeSS", v)} />
          </div>
          <div className="toggle-row">
            <div className="lab">Account for taxes on withdrawal
              <small>Assume ~15% effective rate on drawdowns</small>
            </div>
            <Switch on={inputs.taxAware} onChange={v => set("taxAware", v)} />
          </div>
          <div className="toggle-row">
            <div className="lab">Sequence-of-returns risk
              <small>Show worst-decade-first stress test in Monte Carlo</small>
            </div>
            <Switch on={inputs.sorr} onChange={v => set("sorr", v)} />
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 20}}>
        <div className="card-head">
          <h3>Healthcare bridge · pre-Medicare</h3>
          <span className="meta">retire before 65? this matters.</span>
        </div>
        <div className="grid-2" style={{gap: 20, marginBottom: 18}}>
          <div className="toggle-row" style={{borderBottom: "none", padding: 0}}>
            <div className="lab">Model healthcare bridge
              <small>Out-of-pocket coverage from retirement to age 65</small>
            </div>
            <Switch on={inputs.healthcare.enabled}
              onChange={v => set("healthcare", { ...inputs.healthcare, enabled: v })} />
          </div>
          <div className="toggle-row" style={{borderBottom: "none", padding: 0}}>
            <div className="lab">Already in expenses?
              <small>Skip if your $/yr already covers premiums</small>
            </div>
            <Switch on={inputs.healthcare.coveredByExpenses}
              onChange={v => set("healthcare", { ...inputs.healthcare, coveredByExpenses: v })} />
          </div>
        </div>
        <div className="grid-3" style={{gap: 16}}>
          <Field label="Annual healthcare cost"
            value={inputs.healthcare.annualCost}
            onChange={v => set("healthcare", { ...inputs.healthcare, annualCost: v })}
            prefix="$" help="ACA marketplace + OOP. Single ~$8K, family ~$16K." />
          <Field label="Retirement age"
            value={inputs.healthcare.retireAge}
            onChange={v => set("healthcare", { ...inputs.healthcare, retireAge: v })}
            suffix="yrs" />
          <Field label="Medicare age"
            value={inputs.healthcare.medicareAge}
            onChange={v => set("healthcare", { ...inputs.healthcare, medicareAge: v })}
            suffix="yrs" help="65 unless Congress feels brave" />
        </div>
        <div className="editorial" style={{marginTop: 16, fontSize: 14}}>
          {(() => {
            const b = window.FIMath.healthcareBridge(inputs);
            if (!inputs.healthcare.enabled) return "Healthcare bridge is off. The model assumes employer coverage forever, which is a fiction.";
            if (inputs.healthcare.coveredByExpenses) return "Marked as already in your annual expenses. Carry on.";
            return `${b.years} years × ${window.FIMath.fmtMoneyFull(b.annual)} = ${window.FIMath.fmtMoneyFull(b.total)} of extra portfolio you need to retire at ${b.retireAge}. The single biggest line item people forget.`;
          })()}
        </div>
      </div>

      <div className="card" style={{marginTop: 20}}>
        <div className="card-head"><h3>The disclaimer that should be louder</h3></div>
        <div className="editorial" style={{fontSize: 14, lineHeight: 1.6}}>
          This tool is a model. All models are wrong; some are useful. The future will not look like the median line. It will look like one specific squiggle through the fan, and you don't get to know which one. Save aggressively, diversify, and check the chart less often.
        </div>
      </div>
    </>
  );
}

Object.assign(window, { InputsPage, SettingsPage });
