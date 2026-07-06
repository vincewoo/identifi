// FI math engine — compound growth, Monte Carlo, withdrawal modeling.
// All amounts in present-day dollars unless noted.

window.FIMath = (function () {
  // Box-Muller transform for normal distribution
  function randn(rand = Math.random) {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // Deterministic PRNG (mulberry32) so a simulation can be replayed with a stable seed
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Real (inflation-adjusted) return: (1+nominal)/(1+inflation) - 1
  function realReturn(nominalPct, inflationPct) {
    return (1 + nominalPct / 100) / (1 + inflationPct / 100) - 1;
  }

  // Months until an amortizing loan is paid off. Returns Infinity if payment <= monthly interest.
  function amortizationMonths(balance, ratePct, monthlyPayment) {
    if (balance <= 0 || monthlyPayment <= 0) return 0;
    const r = (ratePct / 100) / 12;
    if (r === 0) return balance / monthlyPayment;
    const interestOnly = balance * r;
    if (monthlyPayment <= interestOnly) return Infinity;
    return -Math.log(1 - (balance * r) / monthlyPayment) / Math.log(1 + r);
  }

  // Annual outflow (today's $) for a single liability item in projection year `year`.
  // year=0 is current; payoff is derived from balance/rate/payment.
  function liabilityOutflowInYear(item, year) {
    if (item.kind === "interest_only") {
      return (item.balance > 0 && item.rate > 0) ? item.balance * (item.rate / 100) : 0;
    }
    // amortizing
    const months = amortizationMonths(item.balance, item.rate ?? 0, item.monthlyPayment ?? 0);
    if (!isFinite(months)) {
      // underwater: treat as interest-only perpetual cost
      const r = (item.rate / 100) / 12;
      return item.balance * r * 12;
    }
    const payoffYear = months / 12;
    return year < payoffYear ? (item.monthlyPayment ?? 0) * 12 : 0;
  }

  // Sum of all liability annual outflows in a given projection year.
  function totalLiabilityOutflow(liabilities, year) {
    if (!liabilities || !liabilities.enabled || !liabilities.items?.length) return 0;
    return liabilities.items.reduce((sum, it) => sum + liabilityOutflowInYear(it, year), 0);
  }

  // Net worth reduction from items where includeInNetWorth is true.
  function liabilityNetWorthOffset(liabilities) {
    if (!liabilities || !liabilities.enabled || !liabilities.items?.length) return 0;
    return liabilities.items.reduce((sum, it) => sum + (it.includeInNetWorth ? (it.balance ?? 0) : 0), 0);
  }

  // PV today of remaining amortizing payments (finite), discounted at realReturn.
  // Used to add a "runoff" bump to the FI number for debts that will end.
  function amortizingRunoffPV(liabilities, realRet) {
    if (!liabilities || !liabilities.enabled || !liabilities.items?.length) return 0;
    let pv = 0;
    for (const it of liabilities.items) {
      if (it.kind === "interest_only") continue;
      const months = amortizationMonths(it.balance, it.rate ?? 0, it.monthlyPayment ?? 0);
      if (!isFinite(months) || months <= 0) continue;
      const annualPayment = (it.monthlyPayment ?? 0) * 12;
      const years = months / 12;
      // PV of annuity: P * (1 - (1+r)^-n) / r, or P*n if r≈0
      if (Math.abs(realRet) < 0.0001) {
        pv += annualPayment * years;
      } else {
        pv += annualPayment * (1 - Math.pow(1 + realRet, -years)) / realRet;
      }
    }
    return pv;
  }

  // Annual interest cost of interest-only items (perpetual, so it's part of effective expenses).
  function interestOnlyAnnualCost(liabilities) {
    if (!liabilities || !liabilities.enabled || !liabilities.items?.length) return 0;
    return liabilities.items.reduce((sum, it) => {
      if (it.kind !== "interest_only") return sum;
      return sum + (it.balance > 0 && it.rate > 0 ? it.balance * (it.rate / 100) : 0);
    }, 0);
  }

  // Summary for UI: totals + per-item payoff info.
  function liabilitySummary(liabilities, currentAge) {
    if (!liabilities || !liabilities.items?.length) {
      return { totalBalance: 0, totalAnnualPayments: 0, items: [] };
    }
    let totalBalance = 0;
    let totalAnnualPayments = 0;
    const items = liabilities.items.map(it => {
      totalBalance += it.balance ?? 0;
      const annualPayment = it.kind === "interest_only"
        ? (it.balance > 0 && it.rate > 0 ? it.balance * (it.rate / 100) : 0)
        : (it.monthlyPayment ?? 0) * 12;
      totalAnnualPayments += annualPayment;
      let payoffYears = null;
      let payoffAge = null;
      let underwater = false;
      if (it.kind === "amortizing") {
        const months = amortizationMonths(it.balance, it.rate ?? 0, it.monthlyPayment ?? 0);
        if (isFinite(months)) {
          payoffYears = months / 12;
          payoffAge = currentAge + payoffYears;
        } else {
          underwater = true;
        }
      }
      return { ...it, annualPayment, payoffYears, payoffAge, underwater };
    });
    return { totalBalance, totalAnnualPayments, items };
  }

  // Real passive income in a given projection year, adjusted for growth and inflation
  function passiveIncomeInYear(pi, year, inflationPct) {
    if (!pi || pi.enabled === false || !(pi.annual > 0)) return 0;
    const nominalGrowth = (pi.growthRate ?? 0) / 100;
    const realGrowth = (1 + nominalGrowth) / (1 + inflationPct / 100) - 1;
    return pi.annual * Math.pow(1 + realGrowth, year);
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

    // Passive income reduces effective withdrawal need, shrinking the FI number
    const pi = inputs.passiveIncome || {};
    const piAnnual = (pi.enabled !== false && pi.annual > 0) ? pi.annual : 0;

    // Liabilities: interest-only adds to perpetual expenses; amortizing adds a finite runoff PV
    const liab = inputs.liabilities || {};
    const ioAnnual = interestOnlyAnnualCost(liab);
    const nwOffset = liabilityNetWorthOffset(liab);
    const runoffPV = amortizingRunoffPV(liab, realRet);

    const effectiveExpenses = Math.max(0, annualExpenses + ioAnnual - piAnnual);
    const baseFI = effectiveExpenses * (100 / withdrawalRate);
    const fiNumber = baseFI + bridgeFund + runoffPV;

    const series = [];
    let balance = currentNetWorth - nwOffset;
    for (let i = 0; i <= yearsToProject; i++) {
      const growth = balance * realRet;
      const piThisYear = passiveIncomeInYear(pi, i, inflation);
      const preRetPI = (pi.preRetirement !== false) ? piThisYear : 0;
      const liabOutflow = totalLiabilityOutflow(liab, i);
      series.push({
        year: i,
        age: currentAge + i,
        balance: balance,
        contributions: i === 0 ? 0 : annualSavings + preRetPI - liabOutflow,
        growth: i === 0 ? 0 : growth,
        fiTarget: fiNumber,
      });
      balance = balance + growth + annualSavings + preRetPI - liabOutflow;
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
    const pi = inputs.passiveIncome || {};
    const piAnnual = (pi.enabled !== false && pi.annual > 0) ? pi.annual : 0;
    const liab = inputs.liabilities || {};
    const ioAnnual = interestOnlyAnnualCost(liab);
    const realRet = realReturn(annualReturn, inflation);
    const runoffPV = amortizingRunoffPV(liab, realRet);
    const fiNumber = Math.max(0, annualExpenses + ioAnnual - piAnnual) * (100 / withdrawalRate) + runoffPV;
    const yearsToCoast = targetAge - currentAge;
    return fiNumber / Math.pow(1 + realRet, yearsToCoast);
  }

  // Barista FI: how much income you'd need to earn to cover the gap
  // Returns the portfolio value where contributions can stop & part-time covers expenses
  function baristaFI(inputs, partTimeIncome) {
    const { annualExpenses, withdrawalRate, annualReturn, inflation } = inputs;
    const pi = inputs.passiveIncome || {};
    const piAnnual = (pi.enabled !== false && pi.annual > 0) ? pi.annual : 0;
    const liab = inputs.liabilities || {};
    const ioAnnual = interestOnlyAnnualCost(liab);
    const realRet = realReturn(annualReturn, inflation);
    const runoffPV = amortizingRunoffPV(liab, realRet);
    const gap = Math.max(0, annualExpenses + ioAnnual - partTimeIncome - piAnnual);
    return gap * (100 / withdrawalRate) + runoffPV;
  }

  // Monte Carlo simulation
  // Returns { paths: [...sample paths], percentiles: {p10,p25,p50,p75,p90}, successRate }
  // Returns are drawn lognormally with median (1 + real return), so the median path
  // tracks the deterministic project() — annualReturn is a compound (geometric) rate
  // everywhere in the app — and a single year can never lose more than 100%.
  // Pass opts.seed for a reproducible run.
  function monteCarlo(inputs, opts = {}) {
    const {
      currentAge, currentNetWorth, annualIncome, annualExpenses, savingsRate,
      annualReturn, inflation, withdrawalRate, yearsToProject = 50,
      retirementYear,
    } = inputs;
    const trials = opts.trials || 500;
    const stdDev = opts.stdDev ?? 15; // % stdev of nominal annual return
    const rand = opts.seed != null ? mulberry32(opts.seed) : Math.random;
    const realMean = realReturn(annualReturn, inflation);
    // Deflate nominal volatility to real terms, then map to log-return space
    const realStd = (stdDev / 100) / (1 + inflation / 100);
    const logMu = Math.log(Math.max(1e-9, 1 + realMean));
    const logSd = realStd / (1 + realMean);
    const annualSavings = savingsRate != null
      ? annualIncome * (savingsRate / 100)
      : annualIncome - annualExpenses;
    const retYear = retirementYear ?? 30;

    // Healthcare bridge in MC — extra spend while retired and pre-Medicare.
    // The window runs from the simulated retirement year to Medicare age, keyed
    // off the trial's actual ages, not the (possibly different) hc.retireAge setting.
    const hc = inputs.healthcare || {};
    const hcEnabled = hc.enabled !== false;
    const hcRetireAge = hc.retireAge ?? inputs.targetAge ?? 50;
    const hcMedicareAge = hc.medicareAge ?? 65;
    const hcAnnualCost = hc.annualCost ?? 0;
    const hcCovered = hc.coveredByExpenses ?? false;
    const bridgeAnnual = (hcEnabled && !hcCovered) ? hcAnnualCost : 0;
    // Without currentAge, fall back to assuming retirement happens at hc.retireAge
    const ageAtYear = (y) => currentAge != null ? currentAge + y : hcRetireAge + (y - retYear);

    const pi = inputs.passiveIncome || {};
    const piEnabled = pi.enabled !== false && (pi.annual > 0);
    const liab = inputs.liabilities || {};
    const liabEnabled = liab.enabled && liab.items?.length > 0;
    const liabNwOffset = liabilityNetWorthOffset(liab);
    const startBal = currentNetWorth - liabNwOffset;

    // Social Security — market-independent, COLA-indexed income from claim age.
    // Never subject to the random return draw; it only shrinks (or reverses)
    // the withdrawal that the portfolio must fund.
    const ssInfo = socialSecurity(inputs, {
      retireAge: currentAge != null ? currentAge + retYear : undefined,
      currentYear: opts.currentYear,
    });
    const ssAnnual = ssInfo.enabled ? ssInfo.annual : 0;

    const allPaths = [];
    let successes = 0;

    for (let t = 0; t < trials; t++) {
      const path = [startBal];
      let bal = startBal;
      let depleted = false;
      for (let y = 1; y <= yearsToProject; y++) {
        const r = Math.exp(logMu + randn(rand) * logSd) - 1;
        const piThisYear = piEnabled ? passiveIncomeInYear(pi, y, inflation) : 0;
        const liabOutflow = liabEnabled ? totalLiabilityOutflow(liab, y) : 0;
        const ssThisYear = (ssAnnual > 0 && ageAtYear(y) >= ssInfo.claimAge) ? ssAnnual : 0;
        if (y <= retYear) {
          // Negative balances are allowed pre-retirement (net debt being paid down)
          const preRetPI = (pi.preRetirement !== false) ? piThisYear : 0;
          bal = bal * (1 + r) + annualSavings + preRetPI + ssThisYear - liabOutflow;
        } else {
          const hcExtra = (ageAtYear(y) <= hcMedicareAge) ? bridgeAnnual : 0;
          // Passive income and SS offset all retirement outflows; surplus accrues
          const netWithdrawal = annualExpenses + hcExtra + liabOutflow - piThisYear - ssThisYear;
          bal = bal * (1 + r) - netWithdrawal;
          if (bal < 0) { bal = 0; depleted = true; }
        }
        path.push(bal);
      }
      // Ending the horizon underwater (e.g. still accumulating) is also a failure
      if (bal < 0) depleted = true;
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

  // --- Social Security ------------------------------------------------------
  // 2025 SSA parameters, in today's dollars. Benefits are COLA-indexed, so a
  // real-dollar engine treats them as constant once claiming starts.
  const SS_WAGE_CAP = 176_100;              // annual taxable maximum
  const SS_BEND_1 = 1226, SS_BEND_2 = 7391; // monthly AIME bend points

  // Full retirement age from birth year (SSA schedule)
  function ssFullRetirementAge(birthYear) {
    if (birthYear >= 1960) return 67;
    if (birthYear >= 1955) return 66 + (birthYear - 1954) * (2 / 12);
    return 66;
  }

  // Estimated Social Security benefit, derived from existing inputs:
  // - claim age defaults to full retirement age (birth year from currentAge)
  // - AIME assumes career earnings at today's income (capped at the taxable
  //   max) from age 22 until retirement — retiring early leaves zero years in
  //   the 35-year average and shrinks the benefit
  // - claiming before/after FRA applies the SSA actuarial adjustment (62-70)
  // - inputs.couple treats annualIncome as a household of two same-age earners
  //   splitting it 50/50: each gets their own benefit (the bend points are
  //   progressive and the wage cap is per person, so two checks on half the
  //   income each pay more than one check on all of it)
  // Overrides via inputs.socialSecurity: { claimAge, monthly } — monthly is
  // the household total at the claim age.
  function socialSecurity(inputs, opts = {}) {
    const { currentAge, annualIncome } = inputs;
    const ss = inputs.socialSecurity || {};
    const couple = inputs.couple === true;
    const nowYear = opts.currentYear ?? new Date().getFullYear();
    const birthYear = nowYear - (currentAge ?? 40);
    const fra = ssFullRetirementAge(birthYear);
    const claimAge = Math.min(70, Math.max(62, ss.claimAge ?? fra));
    const retireAge = opts.retireAge ?? inputs.targetAge ?? fra;

    let monthly;
    if (ss.monthly > 0) {
      monthly = ss.monthly; // explicit override, assumed to be the claim-age amount
    } else {
      const earners = couple ? 2 : 1;
      const perEarnerIncome = (annualIncome ?? 0) / earners;
      const careerStart = 22;
      const yearsWorked = Math.max(0, Math.min(35, Math.max(retireAge, currentAge ?? 0) - careerStart));
      const aime = (Math.min(perEarnerIncome, SS_WAGE_CAP) * (yearsWorked / 35)) / 12;
      const pia =
        0.9 * Math.min(aime, SS_BEND_1) +
        0.32 * Math.max(0, Math.min(aime, SS_BEND_2) - SS_BEND_1) +
        0.15 * Math.max(0, aime - SS_BEND_2);
      // Early claiming: 5/9% per month for the first 36 months, 5/12% beyond.
      // Delayed claiming: 8%/yr up to age 70.
      const months = Math.round((claimAge - fra) * 12);
      const factor = months < 0
        ? 1 - Math.min(-months, 36) * (5 / 900) - Math.max(0, -months - 36) * (5 / 1200)
        : 1 + months * (8 / 1200);
      monthly = pia * factor * earners;
    }
    return { enabled: inputs.includeSS === true, birthYear, fra, claimAge, monthly, annual: monthly * 12, couple };
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
    socialSecurity, ssFullRetirementAge,
    passiveIncomeInYear, realReturn, fmtMoney, fmtMoneyFull, fmtPct, randn, mulberry32,
    amortizationMonths, liabilityOutflowInYear, totalLiabilityOutflow,
    liabilityNetWorthOffset, amortizingRunoffPV, interestOnlyAnnualCost, liabilitySummary,
  };
})();
