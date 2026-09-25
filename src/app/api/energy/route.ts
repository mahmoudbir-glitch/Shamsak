import { NextResponse } from "next/server";
import { getEnergyAdapter } from "@/lib/data-adapter";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await getEnergyAdapter().getSnapshot();
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "energy_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
