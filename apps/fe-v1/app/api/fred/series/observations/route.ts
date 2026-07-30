import { NextResponse } from "next/server";

const FRED_OBSERVATIONS_URL = "https://api.stlouisfed.org/fred/series/observations";

function getFredApiKey(): string | null {
  const value = process.env.FRED_API_KEY?.trim() || process.env.NEXT_PUBLIC_FRED_API_KEY?.trim();
  return value || null;
}

export async function GET(request: Request) {
  const apiKey = getFredApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: {
          code: "missing_fred_key",
          message: "FRED API key is not configured",
        },
      },
      { status: 503 },
    );
  }

  const incoming = new URL(request.url);
  const seriesId = incoming.searchParams.get("series_id")?.trim();
  if (!seriesId) {
    return NextResponse.json(
      {
        error: {
          code: "missing_series_id",
          message: "series_id is required",
        },
      },
      { status: 400 },
    );
  }

  const upstream = new URL(FRED_OBSERVATIONS_URL);
  for (const [key, value] of incoming.searchParams.entries()) {
    if (key === "api_key" || key === "file_type") continue;
    upstream.searchParams.set(key, value);
  }
  upstream.searchParams.set("api_key", apiKey);
  upstream.searchParams.set("file_type", "json");

  const response = await fetch(upstream.toString(), {
    headers: { accept: "application/json" },
    next: { revalidate: 3600 },
    signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(15_000) : undefined,
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json; charset=utf-8",
      "cache-control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
