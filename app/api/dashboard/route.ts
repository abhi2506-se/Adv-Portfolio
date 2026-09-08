// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/analytics-service";

export const dynamic = "force-dynamic";

// In-memory cache for dashboard data — refreshes every 30 seconds
let dashCache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 30_000;

export async function GET() {
  try {
    if (dashCache && Date.now() - dashCache.ts < CACHE_TTL) {
      return NextResponse.json(dashCache.data, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      });
    }
    const data = await getDashboardData();
    dashCache = { data, ts: Date.now() };
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    // Return cached data on error if available
    if (dashCache) return NextResponse.json(dashCache.data);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
