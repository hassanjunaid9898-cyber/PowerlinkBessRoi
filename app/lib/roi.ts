// app/lib/roi.ts

export type RoiInputs = {
  gensetKVA: number;
  loadKVA: number;
  powerFactor: number;
  hoursPerDay: number;
  dieselPricePerL: number;
  bessSizeKWh: number;
  bessPricePerKWh: number;
  socMax: number;
  socMin: number;
};

export type RoiOutputs = {
  // detailed metrics
  loadPct: number;                     // e.g. 0.45 = 45%
  loadKW: number;                      // kW
  fuelLph: number;                     // baseline L/h (interpolated)
  annualFuelOnlyLitres: number;
  annualFuelOnlyCost: number;
  dieselKWhPerL: number;
  dailyBESSEnergyKWh: number;
  fuelSavedPerDayLitres: number;
  annualFuelSavingsLitres: number;
  annualFuelSavingsCost: number;

  // BESS cycles (new)
  bessCyclesPerDay: number;

  // Capex + ROI
  capex: number;
  paybackYears: number | null;
  simpleFiveYearROI: number | null;
};

export type FuelCurvePoint = {
  kva: number;
  lph25: number;
  lph50: number;
  lph75: number;
  lph100: number;
};

// Your full lookup table
export const fuelCurveTable: FuelCurvePoint[] = [
  { kva: 10, lph25: 0.9, lph50: 1.2, lph75: 1.7, lph100: 2.1 },
  { kva: 15, lph25: 1.3, lph50: 1.8, lph75: 2.6, lph100: 3.2 },
  { kva: 20, lph25: 2.3, lph50: 3.4, lph75: 4.9, lph100: 6.1 },
  { kva: 30, lph25: 4.0, lph50: 5.7, lph75: 7.6, lph100: 8.4 },
  { kva: 40, lph25: 4.9, lph50: 6.1, lph75: 9.1, lph100: 11.0 },
  { kva: 50, lph25: 6.1, lph50: 8.7, lph75: 12.1, lph100: 15.1 },
  { kva: 60, lph25: 7.3, lph50: 10.5, lph75: 14.1, lph100: 15.9 },
  { kva: 75, lph25: 6.8, lph50: 11.0, lph75: 14.4, lph100: 18.2 },
  { kva: 100, lph25: 9.1, lph50: 12.9, lph75: 17.4, lph100: 23.1 },
  { kva: 125, lph25: 9.8, lph50: 15.5, lph75: 22.0, lph100: 28.0 },
  { kva: 150, lph25: 11.7, lph50: 18.9, lph75: 26.9, lph100: 34.4 },
  { kva: 180, lph25: 13.6, lph50: 22.3, lph75: 31.8, lph100: 41.3 },
  { kva: 200, lph25: 15.5, lph50: 25.7, lph75: 36.7, lph100: 48.1 },
  { kva: 250, lph25: 17.8, lph50: 29.1, lph75: 41.6, lph100: 54.5 },
  { kva: 300, lph25: 21.6, lph50: 36.0, lph75: 51.5, lph100: 68.1 },
  { kva: 350, lph25: 25.7, lph50: 42.8, lph75: 60.9, lph100: 81.4 },
  { kva: 400, lph25: 29.9, lph50: 49.6, lph75: 70.8, lph100: 95.0 },
  { kva: 500, lph25: 33.7, lph50: 56.4, lph75: 80.6, lph100: 108.3 },
  { kva: 600, lph25: 41.6, lph50: 70.0, lph75: 99.9, lph100: 135.1 },
  { kva: 800, lph25: 61.7, lph50: 79.3, lph75: 119.1, lph100: 161.0 },
  { kva: 1000, lph25: 75.9, lph50: 111.9, lph75: 153.0, lph100: 222.3 },
  { kva: 1250, lph25: 81.8, lph50: 137.7, lph75: 197.2, lph100: 269.1 },
];

// exported helper for dropdown
export const gensetSizes = fuelCurveTable.map((r) => r.kva);

// --- FuelLphInterpSimple equivalent ---
export function fuelLphInterpSimple(
  gensetKVA: number,
  loadPct: number,
  table: FuelCurvePoint[]
): number {
  const row = table.find((r) => r.kva === gensetKVA);
  if (!row) {
    throw new Error(`Fuel curve missing for ${gensetKVA} kVA`);
  }

  const x = [0.25, 0.5, 0.75, 1.0];
  const y = [row.lph25, row.lph50, row.lph75, row.lph100];

  // Clamp 0.25..1
  if (loadPct <= x[0]) return y[0];
  if (loadPct >= x[3]) return y[3];

  // Interpolate
  for (let i = 0; i < 3; i++) {
    if (loadPct >= x[i] && loadPct <= x[i + 1]) {
      const t = (loadPct - x[i]) / (x[i + 1] - x[i]);
      return y[i] + t * (y[i + 1] - y[i]);
    }
  }

  throw new Error("Interpolation failed");
}

// --- Main ROI (BESS_ROI_FullLoadStrategy + BESS cycles formula) ---
export function bessRoi(inputs: RoiInputs, table: FuelCurvePoint[]): RoiOutputs {
  const {
    gensetKVA,
    loadKVA,
    powerFactor,
    hoursPerDay,
    dieselPricePerL,
    bessSizeKWh,
    bessPricePerKWh,
    socMax,
    socMin,
  } = inputs;

  // Basic validation (as in VBA)
  if (gensetKVA <= 0 || loadKVA <= 0 || powerFactor <= 0) {
    throw new Error("Invalid genset, load or power factor");
  }
  if (hoursPerDay <= 0 || bessSizeKWh <= 0 || bessPricePerKWh <= 0) {
    throw new Error("Invalid hours per day or BESS sizing");
  }
  if (socMax <= socMin || socMax > 1 || socMin < 0) {
    throw new Error("Invalid SOC limits");
  }

  const loadKW = loadKVA * powerFactor;
  const gensetKW = gensetKVA * powerFactor;

  if (loadKW >= gensetKW) {
    throw new Error("No headroom to charge BESS from genset");
  }

  const loadPct = loadKVA / gensetKVA;

  // Baseline fuel
  const fuelBase_Lph = fuelLphInterpSimple(gensetKVA, loadPct, table);
  if (fuelBase_Lph <= 0) throw new Error("Baseline fuel is non-positive");

  // Full-load fuel (100%)
  const fuelFull_Lph = fuelLphInterpSimple(gensetKVA, 1, table);
  if (fuelFull_Lph <= 0) throw new Error("Full-load fuel is non-positive");

  // Usable BESS energy (SOC window)
  const E_batt_use = bessSizeKWh * (socMax - socMin);
  if (E_batt_use <= 0) throw new Error("Usable BESS energy is non-positive");

  // Charging power (surplus)
  const P_ch = gensetKW - loadKW;
  if (P_ch <= 0) throw new Error("No surplus power to charge BESS");

  const t_ch = E_batt_use / P_ch;      // charge hours
  const t_dis = E_batt_use / loadKW;   // discharge hours
  if (t_ch <= 0 || t_dis <= 0) throw new Error("Invalid charge/discharge time");

  const T_cycle = t_ch + t_dis;
  const onFraction = t_ch / T_cycle;

  const gensetHoursPerDay = hoursPerDay * onFraction;

  // Baseline fuel (no BESS)
  const fuelDay_base_L = fuelBase_Lph * hoursPerDay;
  const annualFuelOnlyLitres = fuelDay_base_L * 365;
  const annualFuelOnlyCost = annualFuelOnlyLitres * dieselPricePerL;

  // New fuel with full-load strategy
  const fuelDay_new_L = fuelFull_Lph * gensetHoursPerDay;

  const fuelSavedPerDay_L = fuelDay_base_L - fuelDay_new_L;
  if (fuelSavedPerDay_L <= 0) {
    throw new Error("Full-load strategy does not save fuel for this case");
  }

  const annualFuelSavingsLitres = fuelSavedPerDay_L * 365;
  const annualFuelSavingsCost = annualFuelSavingsLitres * dieselPricePerL;

  // Diesel kWh per L at baseline operating point
  const dieselKWhPerL = loadKW / fuelBase_Lph;

  // Daily BESS energy (from saved fuel)
  const dailyBESSEnergyKWh = fuelSavedPerDay_L * dieselKWhPerL;

  // --- BESS cycles per day (your Excel formula) ---
  // --- BESS cycles per day (updated Excel logic) ---
// =IF( (GensetKVA*PF - LoadKVA*PF) <= 0, 0,
//      HoursPerDay*(GensetKVA*PF - LoadKVA*PF)*(LoadKVA*PF) /
//      (BessSizeKWh*(SocMax-SocMin)*((GensetKVA*PF - LoadKVA*PF) + (LoadKVA*PF))) )
let bessCyclesPerDay = 0;
const headroomKW = gensetKW - loadKW; // (Genset kW - Load kW)

if (headroomKW > 0 && bessSizeKWh > 0 && socMax > socMin) {
  const denom =
    bessSizeKWh * (socMax - socMin) * (headroomKW + loadKW);
  if (denom !== 0) {
    bessCyclesPerDay =
      (hoursPerDay * headroomKW * loadKW) / denom;
  }
}

  // Capex & ROI
  const capex = bessSizeKWh * bessPricePerKWh;
  const paybackYears =
    annualFuelSavingsCost > 0 ? capex / annualFuelSavingsCost : null;

  const totalSavings5y = annualFuelSavingsCost * 5;
  const simpleFiveYearROI =
    capex > 0 ? ((totalSavings5y - capex) / capex) * 100 : null;

  return {
    loadPct,
    loadKW,
    fuelLph: fuelBase_Lph,
    annualFuelOnlyLitres,
    annualFuelOnlyCost,
    dieselKWhPerL,
    dailyBESSEnergyKWh,
    fuelSavedPerDayLitres: fuelSavedPerDay_L,
    annualFuelSavingsLitres,
    annualFuelSavingsCost,
    bessCyclesPerDay,
    capex,
    paybackYears,
    simpleFiveYearROI,
  };
}
