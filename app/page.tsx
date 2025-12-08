"use client";

import { useState, useEffect } from "react";
import { gensetSizes, type RoiInputs, type RoiOutputs } from "./lib/roi";

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

export default function Home() {
  const [inputs, setInputs] = useState<RoiInputs>(defaultInputs);
  const [results, setResults] = useState<RoiOutputs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simple responsive detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize(); // run once on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNumberChange =
    (field: keyof RoiInputs) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      setInputs((prev) => ({
        ...prev,
        [field]: Number.isNaN(value) ? 0 : value,
      }));
    };

  const handleGensetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    setInputs((prev) => ({
      ...prev,
      gensetKVA: value,
    }));
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

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: isMobile ? "1rem" : "2rem",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        background: "#0f172a",
        color: "#e5e7eb",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>
            BESS ROI Calculator
          </h1>
          <p style={{ marginTop: "0.5rem", color: "#9ca3af" }}>
            Full-load strategy using genset fuel curves and calculated BESS
            cycles.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.1fr 1.2fr",
            gap: "1.5rem",
            alignItems: "flex-start",
          }}
        >
          {/* Inputs */}
          <form
            onSubmit={handleSubmit}
            style={{
              background: "#020617",
              padding: "1.5rem",
              borderRadius: "1rem",
              border: "1px solid #1f2937",
            }}
          >
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              Inputs
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "0.75rem 1rem",
              }}
            >
              {/* Genset dropdown */}
              <label style={{ fontSize: "0.85rem" }}>
                <span
                  style={{
                    display: "block",
                    marginBottom: "0.2rem",
                    color: "#9ca3af",
                  }}
                >
                  Genset rating (kVA)
                </span>
                <select
                  value={inputs.gensetKVA}
                  onChange={handleGensetChange}
                  style={{
                    width: "100%",
                    padding: "0.4rem 0.5rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.9rem",
                  }}
                >
                  {gensetSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <InputField
                label="Average load (kVA)"
                value={inputs.loadKVA}
                onChange={handleNumberChange("loadKVA")}
              />
              <InputField
                label="Power factor"
                value={inputs.powerFactor}
                step="0.01"
                onChange={handleNumberChange("powerFactor")}
              />
              <InputField
                label="Operating hours per day"
                value={inputs.hoursPerDay}
                onChange={handleNumberChange("hoursPerDay")}
              />
              <InputField
                label="Diesel price ($/L)"
                value={inputs.dieselPricePerL}
                step="0.01"
                onChange={handleNumberChange("dieselPricePerL")}
              />
              <InputField
                label="BESS size (kWh)"
                value={inputs.bessSizeKWh}
                onChange={handleNumberChange("bessSizeKWh")}
              />
              <InputField
                label="BESS price ($/kWh)"
                value={inputs.bessPricePerKWh}
                onChange={handleNumberChange("bessPricePerKWh")}
              />
              <InputField
                label="BESS SOC max (0–1)"
                value={inputs.socMax}
                step="0.01"
                onChange={handleNumberChange("socMax")}
              />
              <InputField
                label="BESS SOC min (0–1)"
                value={inputs.socMin}
                step="0.01"
                onChange={handleNumberChange("socMin")}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: "0.75rem",
                marginTop: "1.5rem",
              }}
            >
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "999px",
                  border: "none",
                  background: "#22c55e",
                  color: "#022c22",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Calculating..." : "Calculate ROI"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "999px",
                  border: "1px solid #4b5563",
                  background: "transparent",
                  color: "#e5e7eb",
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            </div>

            {error && (
              <p
                style={{
                  marginTop: "1rem",
                  color: "#fecaca",
                  fontSize: "0.9rem",
                }}
              >
                {error}
              </p>
            )}

            <p
              style={{
                marginTop: "1rem",
                fontSize: "0.8rem",
                color: "#6b7280",
              }}
            >
              * Engineering estimate only. Real performance depends on actual
              load profiles, genset behaviour and BESS configuration.
            </p>
          </form>

          {/* Results */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div
              style={{
                background: "#020617",
                padding: "1.5rem",
                borderRadius: "1rem",
                border: "1px solid #1f2937",
              }}
            >
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                }}
              >
                Results
              </h2>

              {!results && (
                <p style={{ color: "#9ca3af", fontSize: "0.95rem" }}>
                  Enter your parameters and click{" "}
                  <strong>Calculate ROI</strong> to see estimated savings and
                  payback.
                </p>
              )}

              {results && (
                <>
                  {/* Summary cards */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: "1rem",
                      fontSize: "0.95rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <ResultCard
                      title="Load %"
                      value={`${(results.loadPct * 100).toFixed(1)} %`}
                      subtitle={`Load: ${results.loadKW.toFixed(1)} kW`}
                    />
                    <ResultCard
                      title="BESS cycles per day"
                      value={results.bessCyclesPerDay.toFixed(3)}
                      subtitle="Calculated from surplus & SOC window"
                    />
                    <ResultCard
                      title="Annual fuel (diesel only)"
                      value={`${results.annualFuelOnlyLitres.toFixed(0)} L`}
                      subtitle={`≈ $${results.annualFuelOnlyCost
                        .toFixed(0)
                        .toString()}/year`}
                    />
                    <ResultCard
                      title="Annual fuel saved"
                      value={`${results.annualFuelSavingsLitres
                        .toFixed(0)
                        .toString()} L`}
                      subtitle={`≈ $${results.annualFuelSavingsCost
                        .toFixed(0)
                        .toString()}/year`}
                    />
                    <ResultCard
                      title="BESS CAPEX"
                      value={`$${results.capex.toFixed(0).toString()}`}
                      subtitle="BESS size × price per kWh"
                    />
                    <ResultCard
                      title="Simple payback"
                      value={
                        results.paybackYears
                          ? `${results.paybackYears.toFixed(1)} years`
                          : "N/A"
                      }
                      subtitle="Capex / annual fuel savings"
                    />
                    <ResultCard
                      title="5-year simple ROI"
                      value={
                        results.simpleFiveYearROI !== null
                          ? `${results.simpleFiveYearROI.toFixed(0)} %`
                          : "N/A"
                      }
                      subtitle="(5y savings – capex) / capex"
                    />
                  </div>

                  {/* Detailed table */}
                  <div>
                    <h3
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        marginBottom: "0.5rem",
                      }}
                    >
                      Detailed metrics
                    </h3>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.85rem",
                      }}
                    >
                      <tbody>
                        <DetailRow
                          label="Load %"
                          value={`${(results.loadPct * 100).toFixed(1)} %`}
                        />
                        <DetailRow
                          label="Load (kW)"
                          value={results.loadKW.toFixed(2)}
                        />
                        <DetailRow
                          label="Fuel use (L/h) – interpolated"
                          value={results.fuelLph.toFixed(4)}
                        />
                        <DetailRow
                          label="Annual fuel use (L)"
                          value={results.annualFuelOnlyLitres.toFixed(2)}
                        />
                        <DetailRow
                          label="Annual fuel cost ($)"
                          value={results.annualFuelOnlyCost.toFixed(2)}
                        />
                        <DetailRow
                          label="Diesel kWh per L"
                          value={results.dieselKWhPerL.toFixed(9)}
                        />
                        <DetailRow
                          label="Daily BESS energy used (kWh)"
                          value={results.dailyBESSEnergyKWh.toFixed(3)}
                        />
                        <DetailRow
                          label="Fuel saved per day (L)"
                          value={results.fuelSavedPerDayLitres.toFixed(3)}
                        />
                        <DetailRow
                          label="Annual fuel saved (L)"
                          value={results.annualFuelSavingsLitres.toFixed(2)}
                        />
                        <DetailRow
                          label="Annual fuel savings ($)"
                          value={results.annualFuelSavingsCost.toFixed(2)}
                        />
                        <DetailRow
                          label="BESS cycles per day"
                          value={results.bessCyclesPerDay.toFixed(9)}
                        />
                        <DetailRow
                          label="BESS CAPEX ($)"
                          value={results.capex.toFixed(2)}
                        />
                        <DetailRow
                          label="ROI (years)"
                          value={
                            results.paybackYears
                              ? results.paybackYears.toFixed(8)
                              : "N/A"
                          }
                        />
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
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
    <label style={{ fontSize: "0.85rem" }}>
      <span
        style={{
          display: "block",
          marginBottom: "0.2rem",
          color: "#9ca3af",
        }}
      >
        {label}
      </span>
      <input
        type="number"
        value={value}
        step={step ?? "1"}
        onChange={onChange}
        style={{
          width: "100%",
          padding: "0.4rem 0.5rem",
          borderRadius: "0.5rem",
          border: "1px solid #374151",
          background: "#020617",
          color: "#e5e7eb",
          fontSize: "0.9rem",
        }}
      />
    </label>
  );
}

type ResultCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

function ResultCard({ title, value, subtitle }: ResultCardProps) {
  return (
    <div
      style={{
        padding: "0.9rem",
        borderRadius: "0.75rem",
        border: "1px solid #1f2937",
        background:
          "radial-gradient(circle at top left, #0f766e33 0, #020617 55%)",
      }}
    >
      <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{title}</div>
      <div
        style={{
          fontSize: "1.1rem",
          fontWeight: 600,
          marginTop: "0.2rem",
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          style={{
            marginTop: "0.2rem",
            fontSize: "0.75rem",
            color: "#6b7280",
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <tr>
      <td
        style={{
          padding: "0.25rem 0.5rem",
          borderBottom: "1px solid #111827",
          color: "#9ca3af",
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: "0.25rem 0.5rem",
          borderBottom: "1px solid #111827",
          textAlign: "right",
        }}
      >
        {value}
      </td>
    </tr>
  );
}
