// FI math engine — compound growth, Monte Carlo, withdrawal modeling.
// All amounts in present-day dollars unless noted.

window.FIMath = (function () {
  // Box-Muller transform for normal distribution
  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // Real (inflation-adjusted) return: (1+nominal)/(1+inflation) - 1
  function realReturn(nominalPct, inflationPct) {
    return (1 + nominalPct / 100) / (1 + inflationPct / 100) - 1;
  }

  // Deterministic year-by-year projection
  // Returns array of {year, age, balance, contributions, growth, fiTarget}
  function project(inputs) {
    const {
      currentAge,
      currentNetWorth,
      annualIncome,
      annualExpenses,
      savingsRate, // % of income saved (overrides if provided)
      annualReturn, // nominal %
      inflation, // %
      withdrawalRate, // % e.g. 4
      yearsToProject = 60,
    } = inputs;

    const realRet = realReturn(annualReturn, inflation);
    const annualSavings = savingsRate != null
      ? annualIncome * (savingsRate / 100)
      : annualIncome - annualExpenses;

    // Healthcare bridge: extra annual expense from retirement age to Medicare (65)
    const hc = inputs.healthcare || {};
    const hcEnabled = hc.enabled !== false;
    const hcRetireAge = hc.retireAge ?? inputs.targetAge ?? 50;
    const hcMedicareAge = hc.medicareAge ?? 65;
    const hcAnnualCost = hc.annualCost ?? 0; // present-day $/yr
    const hcCovered = hc.coveredByExpenses ?? false; // is HC already in annualExpenses?

    // FI number must fund the higher pre-Medicare expense level OR a "bridge fund"
    // We approach this by using the post-Medicare expenses as the perpetual SWR base,
    // and adding an explicit pre-Medicare bridge fund on top.
    const yearsBridge = Math.max(0, hcMedicareAge - hcRetireAge);
    const bridgeAnnual = hcCovered ? 0 : (hcEnabled ? hcAnnualCost : 0);
    const bridgeFund = bridgeAnnual * yearsBridge; // simple sum, today's $
    const baseFI = annualExpenses * (100 / withdrawalRate);
    const fiNumber = baseFI + bridgeFund;

    const series = [];
    let balance = currentNetWorth;
    for (let i = 0; i <= yearsToProject; i++) {
      const growth = balance * realRet;
      series.push({
        year: i,
        age: currentAge + i,
        balance: balance,
        contributions: i === 0 ? 0 : annualSavings,
        growth: i === 0 ? 0 : growth,
        fiTarget: fiNumber,
      });
      balance = balance + growth + annualSavings;
    }
    return series;
  }

  // Find the year FI is reached
  function timeToFI(inputs) {
    const series = project(inputs);
    const target = series[0].fiTarget;
    for (const point of series) {
      if (point.balance >= target) {
        return { years: point.year, age: point.age, target, reached: true };
      }
    }
    return { years: null, age: null, target, reached: false };
  }

  // Coast FI: amount needed today to coast (no contributions) to FI by target age
  function coastFI(inputs, targetAge) {
    const { currentAge, annualExpenses, withdrawalRate, annualReturn, inflation } = inputs;
    const fiNumber = annualExpenses * (100 / withdrawalRate);
    const yearsToCoast = targetAge - currentAge;
    const realRet = realReturn(annualReturn, inflation);
    return fiNumber / Math.pow(1 + realRet, yearsToCoast);
  }

  // Barista FI: how much income you'd need to earn to cover the gap
  // Returns the portfolio value where contributions can stop & part-time covers expenses
  function baristaFI(inputs, partTimeIncome) {
    const { annualExpenses, withdrawalRate } = inputs;
    const gap = Math.max(0, annualExpenses - partTimeIncome);
    return gap * (100 / withdrawalRate);
  }

  // Monte Carlo simulation
  // Returns { paths: [...sample paths], percentiles: {p10,p25,p50,p75,p90}, successRate }
  function monteCarlo(inputs, opts = {}) {
    const {
      currentNetWorth, annualIncome, annualExpenses, savingsRate,
      annualReturn, inflation, withdrawalRate, yearsToProject = 50,
      retirementYear,
    } = inputs;
    const trials = opts.trials || 500;
    const stdDev = opts.stdDev || 15; // % stdev of nominal annual return
    const realMean = realReturn(annualReturn, inflation);
    const realStd = stdDev / 100;
    const annualSavings = savingsRate != null
      ? annualIncome * (savingsRate / 100)
      : annualIncome - annualExpenses;
    const retYear = retirementYear ?? 30;

    // Healthcare bridge in MC — extra spend during pre-Medicare retired years
    const hc = inputs.healthcare || {};
    const hcEnabled = hc.enabled !== false;
    const hcRetireAge = hc.retireAge ?? inputs.targetAge ?? 50;
    const hcMedicareAge = hc.medicareAge ?? 65;
    const hcAnnualCost = hc.annualCost ?? 0;
    const hcCovered = hc.coveredByExpenses ?? false;
    const bridgeAnnual = (hcEnabled && !hcCovered) ? hcAnnualCost : 0;
    // Year offset of Medicare relative to retirement
    const bridgeYears = Math.max(0, hcMedicareAge - hcRetireAge);

    const allPaths = [];
    let successes = 0;

    for (let t = 0; t < trials; t++) {
      const path = [currentNetWorth];
      let bal = currentNetWorth;
      let depleted = false;
      for (let y = 1; y <= yearsToProject; y++) {
        const r = realMean + randn() * realStd;
        if (y <= retYear) {
          bal = bal * (1 + r) + annualSavings;
        } else {
          // Add HC bridge expense for first `bridgeYears` years of retirement
          const yearsRetired = y - retYear;
          const hcExtra = (yearsRetired <= bridgeYears) ? bridgeAnnual : 0;
          bal = bal * (1 + r) - annualExpenses - hcExtra;
          if (bal < 0) { bal = 0; depleted = true; }
        }
        path.push(bal);
      }
      if (!depleted) successes++;
      allPaths.push(path);
    }

    // Compute percentiles per year
    const percentiles = { p10: [], p25: [], p50: [], p75: [], p90: [] };
    for (let y = 0; y <= yearsToProject; y++) {
      const yearVals = allPaths.map(p => p[y]).sort((a, b) => a - b);
      const pct = (p) => yearVals[Math.floor(yearVals.length * p)];
      percentiles.p10.push(pct(0.10));
      percentiles.p25.push(pct(0.25));
      percentiles.p50.push(pct(0.50));
      percentiles.p75.push(pct(0.75));
      percentiles.p90.push(pct(0.90));
    }

    // Sample 50 paths for visualization
    const samplePaths = [];
    const stride = Math.max(1, Math.floor(trials / 50));
    for (let i = 0; i < trials; i += stride) samplePaths.push(allPaths[i]);

    return {
      paths: samplePaths,
      percentiles,
      successRate: successes / trials,
      trials,
    };
  }

  // Format helpers
  function fmtMoney(n, opts = {}) {
    if (n == null || isNaN(n)) return "—";
    const abs = Math.abs(n);
    if (opts.abbr !== false && abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (opts.abbr !== false && abs >= 10_000) return `$${(n / 1_000).toFixed(0)}K`;
    if (opts.abbr !== false && abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${Math.round(n).toLocaleString()}`;
  }
  function fmtMoneyFull(n) {
    if (n == null || isNaN(n)) return "—";
    return `$${Math.round(n).toLocaleString()}`;
  }
  function fmtPct(n, dec = 1) { return `${n.toFixed(dec)}%`; }

  // Healthcare bridge fund estimate — present-day $
  function healthcareBridge(inputs) {
    const hc = inputs.healthcare || {};
    if (hc.enabled === false || hc.coveredByExpenses) return { years: 0, annual: 0, total: 0 };
    const retireAge = hc.retireAge ?? inputs.targetAge ?? 50;
    const medicareAge = hc.medicareAge ?? 65;
    const annual = hc.annualCost ?? 0;
    const years = Math.max(0, medicareAge - retireAge);
    return { years, annual, total: annual * years, retireAge, medicareAge };
  }

  return {
    project, timeToFI, coastFI, baristaFI, monteCarlo, healthcareBridge,
    realReturn, fmtMoney, fmtMoneyFull, fmtPct, randn,
  };
})();
