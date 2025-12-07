// app/api/calc/route.ts
import { NextRequest, NextResponse } from "next/server";
import { bessRoi, fuelCurveTable, RoiInputs } from "../../lib/roi";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inputs = body as Partial<RoiInputs>;

    const requiredFields: (keyof RoiInputs)[] = [
      "gensetKVA",
      "loadKVA",
      "powerFactor",
      "hoursPerDay",
      "dieselPricePerL",
      "bessSizeKWh",
      "bessPricePerKWh",
      "socMax",
      "socMin",
    ];

    for (const key of requiredFields) {
      if (typeof inputs[key] !== "number" || Number.isNaN(inputs[key])) {
        return NextResponse.json(
          { success: false, error: `Invalid or missing field: ${key}` },
          { status: 400 }
        );
      }
    }

    const result = bessRoi(inputs as RoiInputs, fuelCurveTable);

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
