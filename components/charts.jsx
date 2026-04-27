// Charts — pure SVG, no dependencies. Responsive via viewBox.
const { useMemo } = React;

function _scale(domain, range) {
  return (v) => range[0] + ((v - domain[0]) / (domain[1] - domain[0])) * (range[1] - range[0]);
}

// Net worth projection: line + shaded contributions area + FI threshold line
function ProjectionChart({ series, height = 260, showFiLine = true, accent }) {
  const W = 800, H = height, PAD_L = 8, PAD_R = 60, PAD_T = 16, PAD_B = 28;

  const data = useMemo(() => {
    const xs = series.map(d => d.year);
    const ys = series.map(d => d.balance);
    const fi = series[0]?.fiTarget ?? 0;
    const yMax = Math.max(...ys, fi) * 1.05;
    return {
      x: _scale([Math.min(...xs), Math.max(...xs)], [PAD_L, W - PAD_R]),
      y: _scale([0, yMax], [H - PAD_B, PAD_T]),
      yMax, fi,
    };
  }, [series, H]);

  const linePath = series.map((d, i) => `${i === 0 ? "M" : "L"}${data.x(d.year).toFixed(1)},${data.y(d.balance).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${data.x(series[series.length-1].year)},${H-PAD_B} L${data.x(series[0].year)},${H-PAD_B} Z`;

  // Find crossing point
  const fiCross = series.find(d => d.balance >= data.fi);
  const fiCrossX = fiCross ? data.x(fiCross.year) : null;

  // Y axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => data.yMax * p);
  // X axis ticks
  const lastYear = series[series.length-1].year;
  const xTickStep = lastYear > 40 ? 10 : 5;
  const xTicks = [];
  for (let y = 0; y <= lastYear; y += xTickStep) xTicks.push(y);

  const fmt = window.FIMath.fmtMoney;
  const accentColor = accent || "var(--accent)";

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {/* grid */}
      {yTicks.map((v, i) => (
        <line key={`gy${i}`} className="grid" x1={PAD_L} x2={W - PAD_R} y1={data.y(v)} y2={data.y(v)} />
      ))}

      {/* area */}
      <path d={areaPath} fill={accentColor} fillOpacity="0.08" />
      {/* line */}
      <path d={linePath} fill="none" stroke="var(--ink)" strokeWidth="1.75" />

      {/* FI threshold */}
      {showFiLine && (
        <>
          <line x1={PAD_L} x2={W - PAD_R} y1={data.y(data.fi)} y2={data.y(data.fi)}
            stroke={accentColor} strokeWidth="1" strokeDasharray="4 4" />
          <text x={W - PAD_R + 6} y={data.y(data.fi) + 3} fill="var(--accent-ink)" fontSize="10">
            FI · {fmt(data.fi)}
          </text>
        </>
      )}

      {/* crossing dot */}
      {fiCrossX != null && (
        <>
          <circle cx={fiCrossX} cy={data.y(fiCross.balance)} r="4" fill="var(--ink)" />
          <line x1={fiCrossX} x2={fiCrossX} y1={data.y(fiCross.balance)} y2={H - PAD_B}
            stroke="var(--ink)" strokeWidth="0.75" strokeDasharray="2 2" />
        </>
      )}

      {/* y axis labels */}
      {yTicks.map((v, i) => (
        <text key={`yl${i}`} x={W - PAD_R + 6} y={data.y(v) + 3} fontSize="10">{fmt(v)}</text>
      ))}

      {/* x axis */}
      <line className="axis" x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} />
      {xTicks.map(t => (
        <g key={`x${t}`}>
          <line className="axis" x1={data.x(t)} x2={data.x(t)} y1={H - PAD_B} y2={H - PAD_B + 3} />
          <text x={data.x(t)} y={H - PAD_B + 16} textAnchor="middle">y{t}</text>
        </g>
      ))}
    </svg>
  );
}

// Monte Carlo fan chart
function MonteCarloChart({ result, height = 280, retirementYear }) {
  const W = 800, H = height, PAD_L = 8, PAD_R = 60, PAD_T = 16, PAD_B = 28;
  const { percentiles, paths } = result;

  const years = percentiles.p50.length;
  const allMax = Math.max(...percentiles.p90);
  const yMax = allMax * 1.05;

  const xs = _scale([0, years - 1], [PAD_L, W - PAD_R]);
  const ys = _scale([0, yMax], [H - PAD_B, PAD_T]);

  const buildPath = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  const buildBand = (lo, hi) => {
    const top = hi.map((v, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
    const bot = lo.map((v, i) => `L${xs(lo.length - 1 - i).toFixed(1)},${ys(lo[lo.length - 1 - i]).toFixed(1)}`).join(" ");
    return `${top} ${bot} Z`;
  };

  const fmt = window.FIMath.fmtMoney;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => yMax * p);

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`}>
      {yTicks.map((v, i) => (
        <line key={`gy${i}`} className="grid" x1={PAD_L} x2={W - PAD_R} y1={ys(v)} y2={ys(v)} />
      ))}

      {/* p10-p90 band */}
      <path d={buildBand(percentiles.p10, percentiles.p90)} fill="var(--accent)" fillOpacity="0.08" />
      {/* p25-p75 band */}
      <path d={buildBand(percentiles.p25, percentiles.p75)} fill="var(--accent)" fillOpacity="0.18" />

      {/* sample paths (faint) */}
      {paths.slice(0, 30).map((p, i) => (
        <path key={`p${i}`} d={buildPath(p)} fill="none" stroke="var(--ink-3)" strokeOpacity="0.08" strokeWidth="0.5" />
      ))}

      {/* median */}
      <path d={buildPath(percentiles.p50)} fill="none" stroke="var(--ink)" strokeWidth="1.75" />

      {/* retirement marker */}
      {retirementYear != null && retirementYear < years && (
        <>
          <line x1={xs(retirementYear)} x2={xs(retirementYear)} y1={PAD_T} y2={H - PAD_B}
            stroke="var(--ink)" strokeWidth="0.75" strokeDasharray="3 3" />
          <text x={xs(retirementYear) + 6} y={PAD_T + 10} fill="var(--ink-2)" fontSize="10">
            retire · y{retirementYear}
          </text>
        </>
      )}

      {yTicks.map((v, i) => (
        <text key={`yl${i}`} x={W - PAD_R + 6} y={ys(v) + 3} fontSize="10">{fmt(v)}</text>
      ))}

      <line className="axis" x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} />
      {[0, 10, 20, 30, 40, 50].filter(y => y < years).map(t => (
        <g key={`x${t}`}>
          <text x={xs(t)} y={H - PAD_B + 16} textAnchor="middle">y{t}</text>
        </g>
      ))}
    </svg>
  );
}

// Compare scenarios — multi-line overlay
function CompareChart({ scenarios, height = 280, fiNumber }) {
  const W = 800, H = height, PAD_L = 8, PAD_R = 70, PAD_T = 16, PAD_B = 28;

  const allMax = Math.max(...scenarios.flatMap(s => s.series.map(p => p.balance)), fiNumber || 0);
  const yMax = allMax * 1.05;
  const maxYear = Math.max(...scenarios.map(s => s.series[s.series.length - 1].year));

  const xs = _scale([0, maxYear], [PAD_L, W - PAD_R]);
  const ys = _scale([0, yMax], [H - PAD_B, PAD_T]);

  const fmt = window.FIMath.fmtMoney;
  const colors = ["var(--ink)", "var(--accent)", "oklch(0.55 0.18 28)", "oklch(0.55 0.16 260)"];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <line key={i} className="grid" x1={PAD_L} x2={W - PAD_R} y1={ys(yMax * p)} y2={ys(yMax * p)} />
      ))}

      {fiNumber && (
        <>
          <line x1={PAD_L} x2={W - PAD_R} y1={ys(fiNumber)} y2={ys(fiNumber)}
            stroke="var(--ink-3)" strokeWidth="0.75" strokeDasharray="3 3" />
          <text x={W - PAD_R + 6} y={ys(fiNumber) + 3} fontSize="10">FI {fmt(fiNumber)}</text>
        </>
      )}

      {scenarios.map((s, idx) => {
        const path = s.series.map((d, i) => `${i === 0 ? "M" : "L"}${xs(d.year).toFixed(1)},${ys(d.balance).toFixed(1)}`).join(" ");
        return <path key={s.id} d={path} fill="none" stroke={colors[idx % colors.length]} strokeWidth="1.75" />;
      })}

      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <text key={`yl${i}`} x={W - PAD_R + 6} y={ys(yMax * p) + 3} fontSize="10">{fmt(yMax * p)}</text>
      ))}

      <line className="axis" x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} />
      {[0, 10, 20, 30, 40, 50, 60].filter(y => y <= maxYear).map(t => (
        <text key={`x${t}`} x={xs(t)} y={H - PAD_B + 16} textAnchor="middle">y{t}</text>
      ))}
    </svg>
  );
}

// Donut/ring for success rate
function SuccessRing({ rate, size = 120 }) {
  const r = size / 2 - 8;
  const C = 2 * Math.PI * r;
  const dash = C * rate;
  const color = rate > 0.85 ? "var(--pos)" : rate > 0.7 ? "var(--warn)" : "var(--neg)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--rule)" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${C - dash}`}
        strokeDashoffset={C / 4}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        strokeLinecap="round" />
      <text x={size/2} y={size/2 + 2} textAnchor="middle"
        style={{fontSize: 22, fontFamily: "var(--font-mono)", fill: "var(--ink)", letterSpacing: "-0.02em"}}>
        {Math.round(rate * 100)}%
      </text>
      <text x={size/2} y={size/2 + 18} textAnchor="middle"
        style={{fontSize: 9, fill: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em"}}>
        success
      </text>
    </svg>
  );
}

// Bar — savings rate vs years
function SavingsRateBar({ inputs }) {
  const rates = [10, 20, 30, 40, 50, 60, 70];
  const W = 800, H = 180, PAD_L = 8, PAD_R = 50, PAD_T = 16, PAD_B = 32;

  const results = rates.map(r => {
    const t = window.FIMath.timeToFI({ ...inputs, savingsRate: r });
    return { rate: r, years: t.years || 80 };
  });

  const maxYears = Math.max(...results.map(r => r.years), 60);
  const xs = _scale([0, rates.length - 1], [PAD_L + 30, W - PAD_R]);
  const ys = _scale([0, maxYears], [H - PAD_B, PAD_T]);
  const barW = (xs(1) - xs(0)) * 0.55;

  const currentRate = inputs.savingsRate;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`}>
      {[0, 20, 40, 60].filter(v => v <= maxYears).map(v => (
        <g key={v}>
          <line className="grid" x1={PAD_L + 30} x2={W - PAD_R} y1={ys(v)} y2={ys(v)} />
          <text x={PAD_L + 25} y={ys(v) + 3} textAnchor="end" fontSize="10">{v}y</text>
        </g>
      ))}
      {results.map((r, i) => {
        const isCurrent = Math.abs(r.rate - currentRate) < 5;
        return (
          <g key={r.rate}>
            <rect
              x={xs(i) - barW/2} y={ys(r.years)}
              width={barW} height={H - PAD_B - ys(r.years)}
              fill={isCurrent ? "var(--ink)" : "var(--rule-strong)"}
              rx="2"
            />
            <text x={xs(i)} y={ys(r.years) - 6} textAnchor="middle" fontSize="10"
              fill={isCurrent ? "var(--ink)" : "var(--ink-3)"}
              fontWeight={isCurrent ? "600" : "400"}>
              {r.years >= 80 ? "∞" : r.years + "y"}
            </text>
            <text x={xs(i)} y={H - PAD_B + 16} textAnchor="middle" fontSize="10">{r.rate}%</text>
          </g>
        );
      })}
      <line className="axis" x1={PAD_L + 30} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} />
      <text x={(PAD_L + 30 + W - PAD_R) / 2} y={H - 4} textAnchor="middle" fontSize="10">savings rate (% of income)</text>
    </svg>
  );
}

Object.assign(window, { ProjectionChart, MonteCarloChart, CompareChart, SuccessRing, SavingsRateBar });
