import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/health
 *
 * Railway healthcheck endpoint.
 * Returns 200 when the app is running and can reach the database.
 * Returns 503 when the database is unreachable.
 */
export async function GET() {
  try {
    // Lightweight query to verify DB connectivity
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", db: "connected", timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { status: "error", db: "unreachable", message },
      { status: 503 }
    );
  }
}
