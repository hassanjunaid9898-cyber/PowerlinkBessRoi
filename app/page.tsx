"use client";

import { useState, useEffect } from "react";
import { gensetSizes, type RoiInputs, type RoiOutputs } from "./lib/roi";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const defaultInputs: RoiInputs = {
  gensetKVA: 125,
  loadKVA: 56,
  powerFactor: 0.8,
  hoursPerDay: 10,
  dieselPricePerL: 3,
  bessSizeKWh: 520,
  bessPricePerKWh: 650,
  socMax: 1,
  socMin: 0.2,
};

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "N/A";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function Home() {
  const [inputs, setInputs] = useState<RoiInputs>(defaultInputs);
  const [results, setResults] = useState<RoiOutputs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // theme
  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) setTheme(stored);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // responsive
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleNumberChange =
    (field: keyof RoiInputs) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      setInputs((prev) => ({ ...prev, [field]: Number.isNaN(value) ? 0 : value }));
    };

  const handleGensetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    setInputs((prev) => ({ ...prev, gensetKVA: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Calculation failed");
      }
      setResults(data.result as RoiOutputs);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputs(defaultInputs);
    setResults(null);
    setError(null);
  };

  const handlePrint = () => window.print();

  return (
    <main className="page">
      <div className="container">
        <header className="header no-print">
          <div>
            <h1>BESS ROI Calculator</h1>
            <p>
              Full-load genset + BESS optimisation using interpolated fuel curves. Engineering estimate for
              feasibility and pre-sales modelling.
            </p>
          </div>

          <div className="header-actions">
            <button
              className="btn-outline"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? "Dark mode" : "Light mode"}
            </button>

            <button className="btn-primary" onClick={handlePrint}>
              Export PDF
            </button>
          </div>
        </header>

        <section
          className="grid"
          style={{
            gridTemplateColumns: isMobile ? "1fr" : "420px 1fr",
          }}
        >
          {/* INPUTS */}
          <form className="card" onSubmit={handleSubmit}>
            <h2>Inputs</h2>

            <div className="form-grid">
              <label>
                <span>Genset rating (kVA)</span>
                <select value={inputs.gensetKVA} onChange={handleGensetChange}>
                  {gensetSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <InputField label="Average load (kVA)" value={inputs.loadKVA} onChange={handleNumberChange("loadKVA")} />
              <InputField label="Power factor" value={inputs.powerFactor} step="0.01" onChange={handleNumberChange("powerFactor")} />
              <InputField label="Operating hours per day" value={inputs.hoursPerDay} onChange={handleNumberChange("hoursPerDay")} />
              <InputField label="Diesel price ($/L)" value={inputs.dieselPricePerL} step="0.01" onChange={handleNumberChange("dieselPricePerL")} />
              <InputField label="BESS size (kWh)" value={inputs.bessSizeKWh} onChange={handleNumberChange("bessSizeKWh")} />
              <InputField label="BESS price ($/kWh)" value={inputs.bessPricePerKWh} onChange={handleNumberChange("bessPricePerKWh")} />
              <InputField label="BESS SOC max (0–1)" value={inputs.socMax} step="0.01" onChange={handleNumberChange("socMax")} />
              <InputField label="BESS SOC min (0–1)" value={inputs.socMin} step="0.01" onChange={handleNumberChange("socMin")} />

              <div className="actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Calculating…" : "Calculate ROI"}
                </button>
                <button type="button" className="btn-outline" onClick={handleReset}>
                  Reset
                </button>
              </div>

              {error && <div className="error">{error}</div>}
              <div className="muted" style={{ fontSize: 12 }}>
                * Engineering estimate only. Real performance depends on actual load profiles, genset behaviour and BESS configuration.
              </div>
            </div>
          </form>

          {/* RESULTS */}
          <div className="card">
            <h2>Results</h2>

            {!results && (
              <div className="muted">
                Enter your parameters and click <strong>Calculate ROI</strong> to see estimated savings and payback.
              </div>
            )}

            {results && (
              <>
                {/* HERO METRICS */}
                <div className="hero-grid">
                  <div className="hero">
                    <div className="k">Annual fuel savings</div>
                    <div className="v">${formatMoney(results.annualFuelSavingsCost)}</div>
                    <div className="s">≈ {formatMoney(results.annualFuelSavingsLitres)} L/year saved</div>
                  </div>

                  <div className="hero">
                    <div className="k">Simple payback</div>
                    <div className="v">
                      {results.paybackYears ? `${results.paybackYears.toFixed(1)} yrs` : "N/A"}
                    </div>
                    <div className="s">Capex / annual fuel savings</div>
                  </div>

                  <div className="hero">
                    <div className="k">BESS CAPEX</div>
                    <div className="v">${formatMoney(results.capex)}</div>
                    <div className="s">BESS size × price per kWh</div>
                  </div>
                </div>

                {/* CHARTS */}
                <div className="charts charts-block no-print">
                  <ChartsSection results={results} />
                </div>

                {/* DETAILS TABLE */}
                <div className="table-title">Detailed metrics</div>
                <table>
                  <tbody>
                    <DetailRow label="Load %" value={`${(results.loadPct * 100).toFixed(1)} %`} />
                    <DetailRow label="Load (kW)" value={results.loadKW.toFixed(2)} />
                    <DetailRow label="Fuel use (L/h) – interpolated" value={results.fuelLph.toFixed(4)} />
                    <DetailRow label="BESS cycles per day" value={results.bessCyclesPerDay.toFixed(6)} />
                    <DetailRow label="Daily BESS energy used (kWh)" value={results.dailyBESSEnergyKWh.toFixed(2)} />
                    <DetailRow label="Diesel kWh per L" value={results.dieselKWhPerL.toFixed(6)} />
                    <DetailRow label="Annual fuel use (L)" value={results.annualFuelOnlyLitres.toFixed(0)} />
                    <DetailRow label="Annual fuel cost ($)" value={`$${formatMoney(results.annualFuelOnlyCost)}`} />
                    <DetailRow label="Fuel saved per day (L)" value={results.fuelSavedPerDayLitres.toFixed(2)} />
                    <DetailRow label="Annual fuel saved (L)" value={results.annualFuelSavingsLitres.toFixed(0)} />
                    <DetailRow label="Annual fuel savings ($)" value={`$${formatMoney(results.annualFuelSavingsCost)}`} />
                    <DetailRow label="5-year simple ROI" value={results.simpleFiveYearROI !== null ? `${results.simpleFiveYearROI.toFixed(0)} %` : "N/A"} />
                    <DetailRow label="ROI (years)" value={results.paybackYears ? results.paybackYears.toFixed(2) : "N/A"} />
                  </tbody>
                </table>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

type InputFieldProps = {
  label: string;
  value: number;
  step?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

function InputField({ label, value, step, onChange }: InputFieldProps) {
  return (
    <label>
      <span>{label}</span>
      <input type="number" value={value} step={step ?? "1"} onChange={onChange} />
    </label>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <tr>
      <td>{label}</td>
      <td>{value}</td>
    </tr>
  );
}

function ChartsSection({ results }: { results: RoiOutputs }) {
  const baselineCost = results.annualFuelOnlyCost;
  const savings = results.annualFuelSavingsCost;
  const costWithBess = Math.max(baselineCost - savings, 0);

  const pieData = [
    { name: "Fuel cost with BESS", value: costWithBess },
    { name: "Fuel savings", value: savings },
  ];

  const barData = [
    { name: "Annual fuel cost", Baseline: baselineCost, "With BESS": costWithBess },
  ];

  // Powerlink-aligned colors
  const COLORS = ["#0381D4", "#61CE70"];

  return (
    <>
      <div className="chart-card">
        <div className="chart-title">Fuel cost vs savings (annual)</div>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              labelLine={false}
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => {
                const v = Number(value);
                return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}/year`;
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <div className="chart-title">Annual fuel cost comparison</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(val) => `$${(Number(val) / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: any) => {
                const v = Number(value);
                return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}/year`;
              }}
            />
            <Legend />
            <Bar dataKey="Baseline" fill="#f97316" />
            <Bar dataKey="With BESS" fill="#61CE70" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
