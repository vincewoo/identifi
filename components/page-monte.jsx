// Monte Carlo page
const { useState: useStateMC, useMemo: useMemoMC } = React;

function MonteCarloPage({ inputs }) {
  const [trials, setTrials] = useStateMC(500);
  const [stdDev, setStdDev] = useStateMC(15);
  const [retYear, setRetYear] = useStateMC(20);
  const [seed, setSeed] = useStateMC(0);

  const result = useMemoMC(() =>
    window.FIMath.monteCarlo({ ...inputs, retirementYear: retYear }, { trials, stdDev }),
    [inputs, trials, stdDev, retYear, seed]
  );

  const fmt = window.FIMath.fmtMoney;
  const finalP50 = result.percentiles.p50[result.percentiles.p50.length - 1];
  const finalP10 = result.percentiles.p10[result.percentiles.p10.length - 1];
  const finalP90 = result.percentiles.p90[result.percentiles.p90.length - 1];

  const verdict = result.successRate > 0.95 ? "Bulletproof. Probably."
    : result.successRate > 0.85 ? "Comfortable. Sleep is possible."
    : result.successRate > 0.7 ? "Workable. Hope is doing some heavy lifting."
    : result.successRate > 0.5 ? "A coin flip with extra steps."
    : "Optimistic of you to even ask.";

  return (
    <>
      <PageHead
        title="Monte Carlo"
        sub={`${result.trials.toLocaleString()} alternate timelines, randomized returns, the same plan. Most of finance is making peace with a probability distribution.`}
        actions={<>
          <button className="btn ghost" onClick={() => setSeed(seed + 1)}>↻ Re-roll</button>
          <button className="btn primary">Export runs</button>
        </>}
      />

      <div className="grid-12-8">
        <div className="card">
          <div className="card-head">
            <h3>Portfolio · accumulation → drawdown</h3>
            <span className="chip dot">{trials} trials · σ {stdDev}%</span>
          </div>
          <MonteCarloChart result={result} retirementYear={retYear} />
          <div style={{display: "flex", gap: 18, marginTop: 16, fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-mono)", flexWrap: "wrap"}}>
            <span style={{display: "flex", alignItems: "center", gap: 6}}>
              <span style={{width: 14, height: 2, background: "var(--ink)"}}></span> Median (p50)
            </span>
            <span style={{display: "flex", alignItems: "center", gap: 6}}>
              <span style={{width: 14, height: 8, background: "var(--accent)", opacity: 0.18}}></span> p25–p75
            </span>
            <span style={{display: "flex", alignItems: "center", gap: 6}}>
              <span style={{width: 14, height: 8, background: "var(--accent)", opacity: 0.08}}></span> p10–p90
            </span>
            <span style={{display: "flex", alignItems: "center", gap: 6}}>
              <span style={{borderLeft: "1px dashed var(--ink)", height: 10}}></span> Retirement year
            </span>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Verdict</h3>
            <span className="meta">based on {result.trials} trials</span>
          </div>
          <div style={{display: "flex", alignItems: "center", gap: 20, marginBottom: 16}}>
            <SuccessRing rate={result.successRate} />
            <div>
              <div style={{fontSize: 13, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em"}}>
                Plan survives
              </div>
              <div className="num" style={{fontSize: 22, fontWeight: 600, margin: "4px 0"}}>
                {Math.round(result.successRate * result.trials)} of {result.trials}
              </div>
              <div style={{fontSize: 12, color: "var(--ink-3)"}}>simulated lifetimes</div>
            </div>
          </div>
          <div className="editorial">{verdict}</div>

          <div style={{marginTop: 18, display: "flex", flexDirection: "column", gap: 10}}>
            <div className="summary-row">
              <span className="k">Final · 90th</span>
              <span className="v" style={{color: "var(--pos)"}}>{fmt(finalP90)}</span>
            </div>
            <div className="summary-row">
              <span className="k">Final · median</span>
              <span className="v">{fmt(finalP50)}</span>
            </div>
            <div className="summary-row">
              <span className="k">Final · 10th</span>
              <span className="v" style={{color: finalP10 < 0 ? "var(--neg)" : "var(--ink)"}}>{fmt(finalP10)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{marginTop: 20}}>
        <div className="card">
          <div className="card-head">
            <h3>Simulation parameters</h3>
            <span className="meta">re-rolls instantly</span>
          </div>
          <div style={{display: "flex", flexDirection: "column", gap: 18}}>
            <SliderField label="Trials" value={trials} onChange={setTrials}
              min={100} max={2000} step={100}
              help="More trials = smoother bands, slower compute" />
            <SliderField label="Volatility (σ)" value={stdDev} onChange={setStdDev}
              suffix="%" min={5} max={30} step={1}
              help="Stocks ≈ 15-18%. Bonds ≈ 5-8%. Crypto ≈ pray." />
            <SliderField label="Retirement year" value={retYear} onChange={setRetYear}
              suffix="y" min={5} max={50} step={1}
              help="When contributions stop and withdrawals start" />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>How to read this</h3>
          </div>
          <div style={{fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6}}>
            <p style={{marginTop: 0}}>Each thin line is one simulated lifetime — same plan, different luck. The bold line is the median outcome. The shaded bands hold 50% and 80% of all outcomes.</p>
            <p>Success means the portfolio is still positive at the end of the horizon. Failure means it isn't.</p>
            <p style={{marginBottom: 0}} className="editorial">A 90% success rate isn't a 90% chance you'll be fine. It's a 90% chance the model thinks you'll be fine. Two different things.</p>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { MonteCarloPage });
