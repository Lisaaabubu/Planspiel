import React, { useEffect, useMemo, useState } from "react";



// ─────────────────────────────────────────────────────────────
// GWÖ-Steuer (ab Runde 7): 0–25 Punkte → Stufen 100% bis 0%
// 0–2:100%, 3–5:90%, 6–7:80%, 8–10:70%, 11–13:60%,
// 14–16:50%, 17–19:40%, 20–22:30%, 23–24:20%, 25:0%
// ─────────────────────────────────────────────────────────────
export function getGwoTaxRate(points0to25: number, roundNumber: number): number {
  if (roundNumber < 7) return 1.0;
  const p = Math.max(0, Math.min(25, Math.round(points0to25)));
  if (p <= 2) return 1.00;
  if (p <= 5) return 0.90;
  if (p <= 7) return 0.80;
  if (p <= 10) return 0.70;
  if (p <= 13) return 0.60;
  if (p <= 16) return 0.50;
  if (p <= 19) return 0.40;
  if (p <= 22) return 0.30;
  if (p <= 24) return 0.20;
  return 0.00;
}

// ───────── Fairness-basiertes Nachfrage-Modell (ab Runde 7) ─────────
type DemandWeights = {
  LAMBDA: number;   // Stärke des Fairness-Rabatts auf wahrgen. Preis
  W_PRICE: number;  // Gewicht Preis
  W_FAIR: number;   // Gewicht Fairness
};

const DEMAND_WEIGHTS_BEFORE7: DemandWeights = { LAMBDA: 0.0, W_PRICE: 2.0, W_FAIR: 0.0 };
const DEMAND_WEIGHTS_AFTER7: DemandWeights  = { LAMBDA: 0.8, W_PRICE: 2.0, W_FAIR: 1.2 };

function fairnessNormalized(points0to25: number): number {
  return Math.max(0, Math.min(25, Math.round(points0to25))) / 25;
}

function perceivedPrice(price: number, fairPoints: number, round: number): number {
  const F = fairnessNormalized(fairPoints);
  const W = round >= 7 ? DEMAND_WEIGHTS_AFTER7 : DEMAND_WEIGHTS_BEFORE7;
  return price / (1 + W.LAMBDA * F);
}

function attractiveness(price: number, pRef: number, fairPoints: number, round: number): number {
  const W = round >= 7 ? DEMAND_WEIGHTS_AFTER7 : DEMAND_WEIGHTS_BEFORE7;
  const pEff = perceivedPrice(price, fairPoints, round);
  const fair = fairnessNormalized(fairPoints);
  return Math.pow(pRef / Math.max(0.01, pEff), W.W_PRICE) * (1 + W.W_FAIR * fair);
}

function sharesByAttractiveness(attrs: number[]): number[] {
  const sum = attrs.reduce((a, b) => a + b, 0);
  if (sum <= 0) return attrs.map(() => 0);
  return attrs.map(a => a / sum);
}

/**
 * Planspiel Marktwirtschaft — Landing-Namen + MaxQty + Nachfrage-Reduktion
 * ------------------------------------------------------------------------
 * - Übernimmt Firmennamen von der Startseite (localStorage["planspiel_firm_names"])
 * - Erzwingt frischen Start, wenn Landing "planspiel_force_new" setzt
 * - Produktionslimit MAX_QTY = 100
 * - Nachfrage ~15% straffer (TIGHTEN_DEMAND = 0.85)
 */

type FairnessKeys = "ecoIngredients" | "greenEnergy" | "fairTrade" | "fairWages" | "workplace";

interface FirmDecision {
  id: string;
  name: string;
  price: number; // Netto-Preis vor MwSt
  quantity: number; // produzierte Stückzahl
  fairness: Record<FairnessKeys, number>; // 0..5 je Kategorie
  prevFairness: Record<FairnessKeys, number>;
  active: boolean;
  cash: number; // Vermögen/Kasse (kumuliert)
  loan: number; // offener Kreditbetrag
}

interface RoundResultPerFirm {
  firmId: string;
  demand: number;
  unsold: number;
  unitCost: number;
  vatRateApplied: number; // 0..1
  netRevenue: number;
  vatCollected: number;
  grossRevenue: number;
  variableCost: number;
  profit: number;
  pointsSum25: number; // 0..25
  pointsScaled20: number; // 0..20
}

interface GlobalConfig {
  minUnitCost: number;
  fairnessCostPerLevel: number;
  livingCostPerRound: number;
  baseVatPhase1: number;
  riskOfSpoilage: number;

  baseDemandPerFirm: number; // Grundnachfrage (Stück pro Firma) → 100
  pointsScaleK: number;      // 0..25 → 0..20 (0.8)

  initialLoan: number;
  loanInterestRate: number;
  roundsPhase1: number;
}

interface RoundState {
  roundNumber: number;
  results: RoundResultPerFirm[];
}

interface GameState {
  config: GlobalConfig;
  firms: FirmDecision[];
  rounds: RoundState[];
}

const FAIRNESS_KEYS: FairnessKeys[] = [
  "ecoIngredients",
  "greenEnergy",
  "fairTrade",
  "fairWages",
  "workplace",
];

// ------------------------------------------------------------------------
// NEW CONSTANTS
const MAX_QTY = 100;         // Produktionsobergrenze
const TIGHTEN_DEMAND = 0.6; // ~15% weniger Verkäufe

// LocalStorage keys
const LS_KEY = "planspiel-markt-webapp-v3b"; // Save des Spiels
const FORCE_KEY = "planspiel_force_new";     // von Landing: zwingt frischen Start
const NAMES_KEY = "planspiel_firm_names";    // JSON-Array der Firmennamen

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function sumFairness(f: Record<FairnessKeys, number>) {
  return FAIRNESS_KEYS.reduce((acc, k) => acc + (f[k] || 0), 0);
}

function scale25to20(sum25: number, k: number) {
  return Math.round(clamp(sum25 * k, 0, 20));
}

function gwoVatFromPoints(points0to20: number) {
  const rate = clamp((20 - points0to20) / 20, 0, 1);
  return rate;
}

function unitCost(config: GlobalConfig, fairness: Record<FairnessKeys, number>) {
  const extra = sumFairness(fairness) * config.fairnessCostPerLevel;
  return config.minUnitCost + extra;
}

// Nachfrage-Allokation (gestrafft) mit Produktionslimit

// ===================== Setup Overlay & Stats View =====================
function SetupOverlay({firms, onConfirm}:{firms: FirmDecision[]; onConfirm:(values: Record<string, Record<FairnessKeys, number>>) => void}) {
  const [values, setValues] = useState<Record<string, Record<FairnessKeys, number>>>(() => {
    const v: Record<string, Record<FairnessKeys, number>> = {};
    firms.forEach(f => { v[f.id] = { ...f.fairness }; });
    return v;
  });
  const keys: FairnessKeys[] = FAIRNESS_KEYS;

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000}}>
      <div style={{background:'#fff', color:'#111', borderRadius:12, padding:20, width:'min(900px,95vw)', maxHeight:'90vh', overflow:'auto'}}>
        <h2 style={{marginTop:0}}>Startwerte Fairness (Runde 1)</h2>
        <p>Lege die Fairness-Level (0–5) je Kategorie pro Firma fest. Diese gelten für die <b>erste Runde</b>. Danach passt ihr sie wie gewohnt pro Runde im Spiel an (±1).</p>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign:'left', padding:6, borderBottom:'1px solid #ddd'}}>Firma</th>
              {keys.map(k => <th key={k} style={{textAlign:'left', padding:6, borderBottom:'1px solid #ddd'}}>{k}</th>)}
            </tr>
          </thead>
          <tbody>
            {firms.map(f => (
              <tr key={f.id}>
                <td style={{padding:6, borderBottom:'1px solid #eee'}}>{f.name}</td>
                {keys.map(k => (
                  <td key={k} style={{padding:6, borderBottom:'1px solid #eee'}}>
                    <input type="number" min={0} max={5} value={values[f.id][k] || 0}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(5, Number(e.target.value||0)));
                        setValues(prev => ({...prev, [f.id]: {...prev[f.id], [k]: v}}));
                      }}
                      style={{width:60, padding:'6px 8px'}} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
          <button onClick={()=>onConfirm(values)} style={{padding:'8px 14px', borderRadius:10, background:'#16a34a', color:'#fff', fontWeight:700, border:'none', cursor:'pointer'}}>Spiel starten</button>
        </div>
      </div>
    </div>
  );
}

function StatsView({state}:{state: GameState}) {
  const lastRound = state.rounds[state.rounds.length-1]?.roundNumber || 0;
  const winner = [...state.firms].sort((a,b)=> b.cash - a.cash)[0];
  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Spielende – Statistiken</h2>
      <div className="mb-4">Runden gespielt: <b>{lastRound}</b></div>
      <div className="p-3 rounded-xl bg-emerald-700/20 border border-emerald-600 mb-6">
        🏆 <b>Gewinner:</b> {winner?.name} – Cash: <b>{euro(winner?.cash || 0)}</b>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left p-2">Runde</th>
              {state.firms.map(f => <th key={f.id} className="text-left p-2">{f.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {state.rounds.map(r => (
              <tr key={r.roundNumber} className="border-b border-slate-800">
                <td className="p-2">{r.roundNumber}</td>
                {state.firms.map(f => {
                  const rr = r.results.find(x=>x.firmId===f.id);
                  const txt = rr ? `Absatz ${rr.demand} | Gewinn ${euro(rr.profit)}` : "–";
                  return <td key={f.id} className="p-2">{txt}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
    </div>
    
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        onClick={() => {
          // Spielstand löschen & zurück zur Startseite
          localStorage.removeItem(LS_KEY);
          window.location.href = "../client/pages/start/index.html";
        }}
        className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600"
      >
        Neues Spiel
      </button>

      <button
        onClick={() => {
          // zur statischen Abschlussseite springen
          window.location.href = "../client/pages/end/index.html";
        }}
        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500"
      >
        Zur Abschlussseite
      </button>
  </div>

    </div>
  );
}

// =====================================================================

function allocateDemand(cfg: GlobalConfig, firms: FirmDecision[], roundNumber: number): RoundResultPerFirm[] {
  const inPhase1 = roundNumber <= cfg.roundsPhase1;
  const baseDemand = cfg.baseDemandPerFirm; // 100
  // NEW: Fairness-aware attractiveness shares
  const prices = firms.map(f => f.price);
  const pRef = prices.length ? (prices.reduce((a,b)=>a+b,0) / prices.length) : 1;
  const attrs = firms.map(f => attractiveness(f.price, pRef, sumFairness(f.fairness), roundNumber));
  const shares = sharesByAttractiveness(attrs);
  const totalMarketDemand = baseDemand * firms.length;

  const results: RoundResultPerFirm[] = firms.map((f, idx) => {
    const pts25 = sumFairness(f.fairness);
    const pts20 = scale25to20(pts25, cfg.pointsScaleK);

    // 1) Preisindex (dämpfen und auf [0,2] begrenzen)
    const priceIndexRaw = 1 + 0.2 * (f.price - 1);
    const priceIndex = clamp(priceIndexRaw, 0, 2);

    // 2) Preis-Effekt nach Preis-Absatz-Kurve (m = -0.3, b = 1.2)
    const priceEffect = Math.max(0, 1.2 - 0.3 * priceIndex);

    // 3) Ethik-Effekt je Phase
    const ethicEffect = inPhase1
      ? clamp(0.9 + 0.01 * pts20, 0.7, 1.2)
      : clamp(0.7 + 0.025 * pts20, 0.7, 1.2);

        // 4) Gewünschte Nachfrage über Fairness-/Preis-Attraktivität (Marktanteil)
    const desired = Math.round(shares[idx] * totalMarketDemand * TIGHTEN_DEMAND);

    // 5) Kapazität hart auf 100 begrenzen
    const capacity = Math.min(Math.max(0, Math.round(f.quantity)), MAX_QTY);

    // 6) Verkäufe & Rest
    const sold = Math.min(desired, capacity);
    const unsold = capacity - sold;

    // MwSt-Satz je Firma
    const vatRate = inPhase1
      ? cfg.baseVatPhase1
      : gwoVatFromPoints(pts20);

    const uCost = unitCost(cfg, f.fairness);

    const netRevenue = f.price * sold;
    const vatCollected = f.price * vatRate * sold;
    const grossRevenue = netRevenue + vatCollected;

    const variableCost = uCost * (sold + cfg.riskOfSpoilage * unsold);
    const profit = netRevenue - variableCost;

    return {
      firmId: f.id,
      demand: sold,
      unsold,
      unitCost: uCost,
      vatRateApplied: vatRate,
      netRevenue,
      vatCollected,
      grossRevenue,
      variableCost,
      profit,
      pointsSum25: pts25,
      pointsScaled20: pts20,
    };
  });

  return results;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function euro(n: number) {
  return n.toLocaleString("de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

function pct(n: number) {
  return (n * 100).toFixed(0) + "%";
}

// ----------------------------- HARD-CODED CONFIG -----------------------------

const CONFIG: GlobalConfig = {
  minUnitCost: 0.5,
  fairnessCostPerLevel: 0.05,
  livingCostPerRound: 5,
  baseVatPhase1: 0.1,
  riskOfSpoilage: 1.0,

  baseDemandPerFirm: 100,
  pointsScaleK: 0.8,

  initialLoan: 100,
  loanInterestRate: 0.1,
  roundsPhase1: 6,
};

// --------- NEW: build firms from landing names (or fallback) ---------
function storageGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageDel(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

function readFirmNames(): string[] {
  const raw = storageGet(NAMES_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr.map((x) => String(x)).map(s => s.trim()).filter(s => s.length >= 2).slice(0,5);
    }
  } catch {}
  return [];
}

function buildInitialFirmsFromNames(config: GlobalConfig): FirmDecision[] {
  const names = readFirmNames();
  const effective = names.length ? names : ["AlpenCocoa", "WienerSchoko"];
  const templates: Omit<FirmDecision, "id" | "name">[] = [
    {
      price: 1.8,
      quantity: 100,
      fairness: { ecoIngredients: 2, greenEnergy: 1, fairTrade: 2, fairWages: 1, workplace: 1 },
      prevFairness: { ecoIngredients: 2, greenEnergy: 1, fairTrade: 2, fairWages: 1, workplace: 1 },
      active: true,
      cash: 0,
      loan: CONFIG.initialLoan,
    },
    {
      price: 1.2,
      quantity: 100,
      fairness: { ecoIngredients: 1, greenEnergy: 0, fairTrade: 1, fairWages: 0, workplace: 0 },
      prevFairness: { ecoIngredients: 1, greenEnergy: 0, fairTrade: 1, fairWages: 0, workplace: 0 },
      active: true,
      cash: 0,
      loan: CONFIG.initialLoan,
    },
  ];
  return effective.map((nm, i) => ({
    id: uid(),
    name: nm,
    ...templates[i % templates.length],
  }));
}

export default function App() {
  const [state, setState] = useState<GameState>(() => {
    const force = storageGet(FORCE_KEY) === "1";
    const saved = !force ? storageGet(LS_KEY) : null;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Wenn es ein Save mit 0 Runden ist und neue Namen existieren -> Namen aktualisieren
        const names = readFirmNames();
        if (Array.isArray(parsed?.firms) && parsed.rounds?.length === 0 && names.length) {
          parsed.firms = parsed.firms.slice(0, names.length).map((f: any, i: number) => ({ ...f, name: names[i] }));
        }
        return parsed;
      } catch {}
    }

    // neuer Start: FORCE oder kein Save
    const fresh: GameState = { config: CONFIG, firms: buildInitialFirmsFromNames(CONFIG), rounds: [] };
    // FORCE verbrauchen
    storageDel(FORCE_KEY);
    return fresh;
  });

  const [roundNumber, setRoundNumber] = useState<number>(() => state.rounds.length + 1);
  const [showHelp, setShowHelp] = useState(false);

  
  const [showSetup, setShowSetup] = useState<boolean>(() => (state.rounds.length===0));
  const [showStats, setShowStats] = useState<boolean>(false);
useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    setRoundNumber(state.rounds.length + 1);
  }, [state.rounds.length]);

  const inPhase1 = roundNumber <= state.config.roundsPhase1;

  function confirmInitialFairness(values: Record<string, Record<FairnessKeys, number>>) {
    setState(s => ({
      ...s,
      firms: s.firms.map(f => values[f.id] ? ({...f, fairness: {...values[f.id]}, prevFairness: {...values[f.id]}}) : f)
    }));
    setShowSetup(false);
    setRoundNumber(1);
  }

  const activeFirms = useMemo(() => state.firms.filter((f) => f.active), [state.firms]);

  function updateFirm<K extends keyof FirmDecision>(id: string, key: K, value: FirmDecision[K]) {
    setState((s) => ({
      ...s,
      firms: s.firms.map((f) => {
        if (f.id !== id) return f;
        if (key === "quantity") {
          const v = Math.max(0, Math.min(Number(value as number), MAX_QTY));
          return { ...f, quantity: Math.round(v) } as FirmDecision;
        }
        return { ...f, [key]: value } as FirmDecision;
      }),
    }));
  }

  function updateFairness(id: string, k: FairnessKeys, nextVal: number) {
    setState((s) => ({
      ...s,
      firms: s.firms.map((f) => {
        if (f.id !== id) return f;
        const bounded = clamp(nextVal, 0, 5);
        const prev = f.prevFairness[k] ?? f.fairness[k];
        if (Math.abs(bounded - prev) > 1) return f; // Δ<=1 Regel erzwingen
        return { ...f, fairness: { ...f.fairness, [k]: bounded } };
      }),
    }));
  }

  function addFirm() {
    const newFirm: FirmDecision = {
      id: uid(),
      name: `Neue Firma`,
      price: 1.2,
      quantity: 100,
      fairness: { ecoIngredients: 0, greenEnergy: 0, fairTrade: 0, fairWages: 0, workplace: 0 },
      prevFairness: { ecoIngredients: 0, greenEnergy: 0, fairTrade: 0, fairWages: 0, workplace: 0 },
      active: true,
      cash: 0,
      loan: state.config.initialLoan,
    };
    setState((s) => ({ ...s, firms: [...s.firms, newFirm] }));
  }

  function deleteFirm(id: string) {
    setState((s) => ({ ...s, firms: s.firms.filter((f) => f.id !== id) }));
  }

  function toggleActive(id: string) {
    setState((s) => ({ ...s, firms: s.firms.map((f) => (f.id === id ? { ...f, active: !f.active } : f)) }));
  }

  function allocateAndUpdate() {
    const results = allocateDemand(state.config, activeFirms, roundNumber);

    const updatedFirms = state.firms.map((f) => {
      if (!f.active) return f;
      const r = results.find((x) => x.firmId === f.id)!;
      const nextCash = f.cash + r.profit - state.config.livingCostPerRound;
      const nextPrevFairness = { ...f.fairness };
      return { ...f, cash: nextCash, prevFairness: nextPrevFairness };
    });

    const newRound: RoundState = { roundNumber, results };
    setState((s) => ({ ...s, firms: updatedFirms, rounds: [...s.rounds, newRound] }));
    if (roundNumber >= 12) { setShowStats(true); window.location.hash = '#/stats'; }
  }

  function resetGame() {
    // Reset: neuen Start aus Landing-Namen
    localStorage.removeItem(LS_KEY);
    const fresh: GameState = { config: CONFIG, firms: buildInitialFirmsFromNames(CONFIG), rounds: [] };
    setState(fresh);
    setRoundNumber(1);
  }

  if (showSetup) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6"><SetupOverlay firms={state.firms} onConfirm={confirmInitialFairness} /></div>
    );
  }

  if (showStats) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6"><StatsView state={state} /></div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
<button
  type="button"
  onClick={() => { window.location.href = "../client/pages/start/index.html";}}
  style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontWeight: 600, marginRight: 8 }}
  title="Zur Startseite"
>
  🏠 Home
</button>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Planspiel Marktwirtschaft</h1>
            <p className="text-slate-400 text-sm">
              Runden {state.config.roundsPhase1}× Phase 1 (10% MwSt), ab Runde {state.config.roundsPhase1 + 1} GWÖ-Steuer (0–100%). ·
              <span className="ml-2"> Max. Produktion: {MAX_QTY} Stk/Firma</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
<button className="px-3 py-2 rounded-xl bg-rose-700 hover:bg-rose-600" onClick={resetGame}>Reset</button>
          </div>
        </header>

        {/* Firms editor */}
        <section className="bg-slate-900 rounded-2xl p-5 shadow border border-slate-800">
          <h2 className="text-lg font-semibold mb-4">Entscheidungen für Runde #{roundNumber}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-300">
                  <th className="p-2">Aktiv</th>
                  <th className="p-2">Firma</th>
                  <th className="p-2">Preis (netto)</th>
                  <th className="p-2">Menge (max {MAX_QTY})</th>
                  <th className="p-2">Kosten/Stk</th>
                  {FAIRNESS_KEYS.map((k) => (
                    <th key={k} className="p-2">{labelFair(k)}</th>
                  ))}
                  <th className="p-2">Punkte (0–25)</th>
                  <th className="p-2">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {state.firms.map((f) => {
                  const sum25 = sumFairness(f.fairness);
                  const uCost = unitCost(state.config, f.fairness);
                  return (
                    <tr key={f.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                      <td className="p-2 align-top">
                        <input type="checkbox" checked={f.active} onChange={() => toggleActive(f.id)} />
                      </td>
                      <td className="p-2 align-top w-[220px]">
                        <input className="w-full bg-slate-800 rounded-lg px-3 py-2" value={f.name} onChange={(e) => updateFirm(f.id, "name", e.target.value)} />
                        <div className="text-xs text-slate-400 mt-1">Cash: {euro(f.cash)}</div>
                      </td>
                      <td className="p-2 align-top">
                        <NumInput value={f.price} step={0.01} onChange={(v) => updateFirm(f.id, "price", v)} />
                      </td>
                      <td className="p-2 align-top">
                        <NumInput value={Math.min(f.quantity, MAX_QTY)} step={10} onChange={(v) => updateFirm(f.id, "quantity", Math.max(0, Math.min(Math.round(v), MAX_QTY)))} />
                      </td>
                      <td className="p-2 align-top text-slate-300">{euro(uCost)}</td>
                      {FAIRNESS_KEYS.map((k) => (
                        <td key={k} className="p-2 align-top">
                          <Stepper value={f.fairness[k]} prev={f.prevFairness[k]} onChange={(nv) => updateFairness(f.id, k, nv)} />
                        </td>
                      ))}
                      <td className="p-2 align-top">{sum25}</td>
                      <td className="p-2 align-top whitespace-nowrap">
                        <button className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 mr-2" onClick={() => updateFirm(f.id, "prevFairness", { ...f.fairness })}>Δ fixieren</button>
                        <button className="px-2 py-1 rounded-lg bg-rose-700 hover:bg-rose-600" onClick={() => deleteFirm(f.id)}>Löschen</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Δ-Regel: Fairness-Level dürfen pro Runde je Kategorie höchstens um 1 steigen oder fallen. „Δ fixieren“ setzt den aktuellen Stand als Referenz für die nächste Runde.
          </p>
        </section>
        {/* Controls to advance round */}
        <div className="flex items-center justify-end gap-3">
          <button
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
            onClick={allocateAndUpdate}
            title="Berechnen & nächste Runde"
          >
            Nächste Runde
          </button>
        </div>
    

        {/* Results history */}
        <section className="bg-slate-900 rounded-2xl p-5 shadow border border-slate-800">
          <h2 className="text-lg font-semibold mb-3">Ergebnisse</h2>
          {state.rounds.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              {state.rounds.map((r) => (
                <div key={r.roundNumber} className="border border-slate-800 rounded-xl p-3 bg-slate-950/40">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      Runde #{r.roundNumber}{" "}
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-800">
                        {r.roundNumber <= state.config.roundsPhase1 ? "Phase 1" : "Phase 2"}
                      </span>
                    </h3>
                  </div>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-300">
                          <th className="p-2">Firma</th>
                          <th className="p-2">Verkauf</th>
                          <th className="p-2">Unverkauft</th>
                          <th className="p-2">MwSt-Satz</th>
                          <th className="p-2">Umsatz (netto)</th>
                          <th className="p-2">MwSt</th>
                          <th className="p-2">Kosten</th>
                          <th className="p-2">Gewinn</th>
                          <th className="p-2">Punkte (0–20)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.results.map((res) => {
                          const firm = state.firms.find((f) => f.id === res.firmId);
                          if (!firm) return null;
                          return (
                            <tr key={res.firmId} className="border-t border-slate-800">
                              <td className="p-2">{firm.name}</td>
                              <td className="p-2">{res.demand}</td>
                              <td className="p-2">{res.unsold}</td>
                              <td className="p-2">{pct(res.vatRateApplied)}</td>
                              <td className="p-2">{euro(res.netRevenue)}</td>
                              <td className="p-2">{euro(res.vatCollected)}</td>
                              <td className="p-2">{euro(res.variableCost)}</td>
                              <td className={"p-2 " + (res.profit >= 0 ? "text-emerald-400" : "text-rose-400")}>{euro(res.profit)}</td>
                              <td className="p-2">{res.pointsScaled20}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="text-xs text-slate-500">
          <p>Makro-Parameter und Nachfrage-Logik sind fix im Code. Für Kurse kann eine Admin-Variante mit Server/DB ergänzt werden.</p>
        </footer>
      </div>

      {/* Hilfe-Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowHelp(false)} />
          <div className="relative bg-slate-950 border border-slate-800 rounded-2xl shadow-xl w-[min(1000px,95vw)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-xl font-semibold">Hilfe & Infos</h2>
              <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700" onClick={() => setShowHelp(false)}>Schließen</button>
            </div>
            <div className="p-4 grid lg:grid-cols-3 gap-4">
              <Card title="Spielregeln (fix)">
                <ul className="text-sm leading-7 text-slate-300">
                  <li>Min-Kosten: {euro(state.config.minUnitCost)} / Stk</li>
                  <li>+ Fairness: +{euro(state.config.fairnessCostPerLevel)} pro Level & Kategorie</li>
                  <li>Lebenshaltung: {euro(state.config.livingCostPerRound)} / Runde</li>
                  <li>Phase 1 MwSt: {pct(state.config.baseVatPhase1)}</li>
                  <li>Phase 2 MwSt: 0 Punkte → 100% · 20 Punkte → 0%</li>
                  <li>Δ-Regel: Fairness je Kategorie max ±1 pro Runde</li>
                  <li>Max. Produktion: {MAX_QTY} Stk/Firma</li>
                  <li>Nachfrage gestrafft: ~15% geringere Verkäufe</li>
                </ul>
              </Card>
              <Card title="Marktmodell (fix)">
                <ul className="text-sm leading-7 text-slate-300">
                  <li>Grundnachfrage (pro Firma): {state.config.baseDemandPerFirm} Stück</li>
                  <li>Preis-Absatz-Kurve: Effekt = 1.2 − 0.3 × PreisIndex</li>
                  <li>PreisIndex ≈ 1 + 0.2 × (Preis − 1), begrenzt [0,2]</li>
                  <li>Ethikfaktor Phase 1 (schwach): 0.9 + 0.01 × Punkte</li>
                  <li>Ethikfaktor Phase 2 (stark): 0.7 + 0.025 × Punkte</li>
                  <li>GWÖ-Steuer (ab Runde {state.config.roundsPhase1 + 1}): Punkte 0 → 100%, 20 → 0%</li>
                </ul>
              </Card>
              <Card title="Spielstand (live)">
                <ul className="text-sm leading-7 text-slate-300">
                  <li>Aktuelle Runde: #{roundNumber} ({inPhase1 ? "Phase 1" : "Phase 2"})</li>
                  <li>Firmen aktiv: {activeFirms.length} / {state.firms.length}</li>
                  <li>Letzte Berechnung: {state.rounds.length > 0 ? `Runde #${state.rounds.at(-1)!.roundNumber}` : "–"}</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------- Small UI Components -----------------------------

function labelFair(k: FairnessKeys) {
  switch (k) {
    case "ecoIngredients": return "Öko-Zutaten";
    case "greenEnergy": return "Grüner Strom";
    case "fairTrade": return "Fairer Handel";
    case "fairWages": return "Faire Löhne";
    case "workplace": return "Arbeitsplatz";
  }
}

function NumInput({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <input
      type="number"
      className="w-32 bg-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
      value={value}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  );
}

function Stepper({ value, prev, onChange }: { value: number; prev: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3 justify-between bg-slate-800 rounded-xl px-2 py-1">
      <button
        className="px-3 py-1.5 bg-slate-900 rounded-lg hover:bg-slate-700 disabled:opacity-40"
        onClick={() => onChange(value - 1)}
        disabled={value - 1 < 0 || Math.abs((value - 1) - prev) > 1}
        title="-1 (Δ≤1)"
      >–</button>
      <span className="w-6 text-center font-semibold">{value}</span>
      <button
        className="px-3 py-1.5 bg-slate-900 rounded-lg hover:bg-slate-700 disabled:opacity-40"
        onClick={() => onChange(value + 1)}
        disabled={value + 1 > 5 || Math.abs((value + 1) - prev) > 1}
        title="+1 (Δ≤1)"
      >+</button>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 mr-2">{children}</span>;
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
      Noch keine Ergebnisse – stelle Entscheidungen ein und klicke <span className="text-slate-200">„Nächste Runde“</span>.
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 rounded-2xl p-4 shadow border border-slate-800">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}