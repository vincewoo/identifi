// Shared UI primitives
const { useState } = React;

function Field({ label, value, onChange, prefix, suffix, min, max, step, type = "number", help, options }) {
  if (options) {
    return (
      <div className="field">
        <label>{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {help && <div className="help">{help}</div>}
      </div>
    );
  }
  return (
    <div className="field">
      <label>{label}</label>
      <div className="input-wrap">
        {prefix && <span className="prefix">{prefix}</span>}
        <input
          type={type}
          value={value}
          min={min} max={max} step={step}
          className={`${prefix ? "has-prefix" : ""} ${suffix ? "has-suffix" : ""}`}
          onChange={e => onChange(type === "number" ? +e.target.value : e.target.value)}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
      {help && <div className="help">{help}</div>}
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, step, suffix, help }) {
  return (
    <div className="field">
      <label style={{display: "flex", justifyContent: "space-between"}}>
        <span>{label}</span>
        <span className="mono" style={{color: "var(--ink)", fontWeight: 500}}>{value}{suffix}</span>
      </label>
      <input type="range" className="slider"
        value={value} min={min} max={max} step={step}
        onChange={e => onChange(+e.target.value)} />
      {help && <div className="help">{help}</div>}
    </div>
  );
}

function Switch({ on, onChange }) {
  return <div className={`switch ${on ? "on" : ""}`} onClick={() => onChange(!on)}></div>;
}

function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <button key={t.value} className={`tab ${value === t.value ? "active" : ""}`}
          onClick={() => onChange(t.value)}>{t.label}</button>
      ))}
    </div>
  );
}

function Stat({ label, value, sub, delta }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {delta && <div className={`delta ${delta.startsWith("-") ? "neg" : ""}`}>{delta}</div>}
    </div>
  );
}

// Icons (minimal stroke set)
const Icon = {
  dash: (p) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><rect x="1.5" y="1.5" width="4.5" height="4.5"/><rect x="8" y="1.5" width="4.5" height="4.5"/><rect x="1.5" y="8" width="4.5" height="4.5"/><rect x="8" y="8" width="4.5" height="4.5"/></svg>,
  scenario: (p) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M1 11 L4 7 L7 9 L13 3"/><circle cx="13" cy="3" r="1"/></svg>,
  monte: (p) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M1 11 Q3 5 7 7 T13 3"/><path d="M1 9 Q4 11 7 6 T13 8" opacity="0.5"/></svg>,
  inputs: (p) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M2 4h10M2 7h6M2 10h8"/></svg>,
  goals: (p) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><circle cx="7" cy="7" r="5.5"/><circle cx="7" cy="7" r="2.5"/><circle cx="7" cy="7" r="0.5" fill="currentColor"/></svg>,
  settings: (p) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><circle cx="7" cy="7" r="2"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.8 2.8l1.4 1.4M9.8 9.8l1.4 1.4M2.8 11.2l1.4-1.4M9.8 4.2l1.4-1.4"/></svg>,
  arrow: (p) => <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M2 5h6M5 2l3 3-3 3"/></svg>,
  menu: (p) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M2 4h12M2 8h12M2 12h12"/></svg>,
  add: (p) => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M6 2v8M2 6h8"/></svg>,
};

function BrandMark() {
  return <div className="brand-mark"></div>;
}

function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span style={{flex: 1}}>{label}</span>
      {badge && <span className="chip" style={{fontSize: 10, padding: "1px 6px"}}>{badge}</span>}
    </button>
  );
}

function Sidebar({ page, setPage, onClose }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Icon.dash() },
    { id: "scenarios", label: "Scenarios", icon: Icon.scenario(), badge: "3" },
    { id: "monte", label: "Monte Carlo", icon: Icon.monte() },
    { id: "milestones", label: "Milestones", icon: Icon.goals() },
    { id: "inputs", label: "Inputs", icon: Icon.inputs() },
    { id: "settings", label: "Assumptions", icon: Icon.settings() },
  ];
  return (
    <aside className={`side ${onClose ? "open" : ""}`}>
      <div className="brand">
        <BrandMark />
        <div>
          IdentiFI
          <small>v0.4 · forecast</small>
        </div>
      </div>

      <div className="nav">
        <div className="nav-section">Forecast</div>
        {items.slice(0, 4).map(it => (
          <NavItem key={it.id} {...it} active={page === it.id} onClick={() => { setPage(it.id); onClose && onClose(); }} />
        ))}
        <div className="nav-section" style={{marginTop: 12}}>Configure</div>
        {items.slice(4).map(it => (
          <NavItem key={it.id} {...it} active={page === it.id} onClick={() => { setPage(it.id); onClose && onClose(); }} />
        ))}
      </div>

      <div className="side-foot">
        <div className="quip">"The market doesn't care about your spreadsheet."</div>
        Not financial advice. Not even sound advice. <br/>Just math, dressed up.
      </div>
    </aside>
  );
}

function PageHead({ title, sub, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

Object.assign(window, { Field, SliderField, Switch, Tabs, Stat, Icon, BrandMark, Sidebar, PageHead, NavItem });
