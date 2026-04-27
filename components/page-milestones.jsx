// Milestones page
const { useMemo: useMemoMS } = React;

function MilestonesPage({ inputs }) {
  const series = useMemoMS(() => window.FIMath.project(inputs), [inputs]);
  const fiNumber = inputs.annualExpenses * (100 / inputs.withdrawalRate);
  const annualSavings = inputs.annualIncome * (inputs.savingsRate / 100);
  const fmt = window.FIMath.fmtMoney;
  const fmtFull = window.FIMath.fmtMoneyFull;

  const milestones = [
    { id: "100k", label: "First $100K", quip: "Charlie Munger said this one's the hardest. He was right.", target: 100_000 },
    { id: "250k", label: "Quarter million", quip: "You can quietly stop checking the balance now.", target: 250_000 },
    { id: "500k", label: "Half million", quip: "Compound interest does more than you do.", target: 500_000 },
    { id: "lean", label: "Lean FI", quip: "Could quit. Wouldn't be fun. But could.", target: fiNumber * 0.7 },
    { id: "1m", label: "Two commas", quip: "Statistically rare. Rationally meaningless. Emotionally enormous.", target: 1_000_000 },
    { id: "halffi", label: "Halfway to FI", quip: "The downhill half is faster. Annoying, but true.", target: fiNumber * 0.5 },
    { id: "coast", label: "Coast FI (age 65)", quip: "You can stop saving. Promise.", target: window.FIMath.coastFI(inputs, 65) },
    { id: "fi", label: "Full FI", quip: "Pour the drink. Quit the meeting. Or don't.", target: fiNumber },
    { id: "fatfi", label: "Fat FI · 1.5×", quip: "For when 4% feels like skydiving without a parachute.", target: fiNumber * 1.5 },
  ].sort((a, b) => a.target - b.target);

  const findYear = (target) => {
    const hit = series.find(d => d.balance >= target);
    return hit;
  };

  return (
    <>
      <PageHead
        title="Milestones"
        sub="The waypoints between today and the finish line. Most of FI is the part where nothing visible happens."
      />

      <div className="grid-12-8">
        <div className="card">
          <div className="card-head">
            <h3>Waypoints</h3>
            <span className="chip">today's $ · {inputs.annualReturn}% nominal</span>
          </div>
          {milestones.map(m => {
            const hit = findYear(m.target);
            const done = inputs.currentNetWorth >= m.target;
            return (
              <div key={m.id} className={`milestone ${done ? "done" : ""}`}>
                <div>
                  <div className="label">{m.label} <span style={{color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontSize: 12, marginLeft: 8}}>{fmtFull(m.target)}</span></div>
                  <small>{m.quip}</small>
                </div>
                <div className="when">
                  {done ? "✓ done" : hit ? `+${hit.year}y` : "out of range"}
                  <span className="age">{done ? `age ${inputs.currentAge}` : hit ? `age ${hit.age}` : "—"}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{display: "flex", flexDirection: "column", gap: 20}}>
          <div className="card">
            <div className="card-head"><h3>The compounding curve</h3></div>
            <div style={{fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6}}>
              The first $100K takes about <strong>{findYear(100_000)?.year ?? "—"} years</strong> from where you are. The next $100K takes <strong>~{Math.max(0, (findYear(200_000)?.year ?? 0) - (findYear(100_000)?.year ?? 0))} years</strong>. By the time you're between $900K and $1M, the gap closes in months, not years.
            </div>
            <div className="editorial" style={{marginTop: 14}}>
              You don't get rich at the finish line. You get rich at the inflection point — and then you wait.
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Pace check</h3></div>
            <div style={{display: "flex", flexDirection: "column", gap: 10}}>
              <div className="summary-row"><span className="k">Saving / yr</span><span className="v">{fmt(annualSavings)}</span></div>
              <div className="summary-row"><span className="k">Saving / mo</span><span className="v">{fmt(annualSavings / 12)}</span></div>
              <div className="summary-row"><span className="k">Saving / day</span><span className="v">{fmt(annualSavings / 365)}</span></div>
              <div className="summary-row"><span className="k">Per latte</span><span className="v">{(annualSavings / 365 / 6).toFixed(1)}×</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { MilestonesPage });
