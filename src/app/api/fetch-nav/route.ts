import { NextRequest, NextResponse } from "next/server";

interface FetchNavRequestBody {
  holdingId: string;
  navDate: string;
}

interface SecNavRecord {
  last_val: number;
  nav_date: string;
  [key: string]: unknown;
}

interface FetchNavSuccessResponse {
  lastVal: number;
  navDate: string;
}

interface FetchNavEmptyResponse {
  lastVal: null;
  navDate: null;
}

type FetchNavResponse = FetchNavSuccessResponse | FetchNavEmptyResponse;

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function fetchNavForDate(
  holdingId: string,
  navDate: string,
  apiKey: string,
): Promise<SecNavRecord[] | null> {
  const url = `https://api.sec.or.th/FundDailyInfo/${encodeURIComponent(holdingId)}/dailynav/${navDate}`;
  const res = await fetch(url, {
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
    },
  });

  if (res.status === 200) {
    const data: unknown = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data as SecNavRecord[];
    }
    return null;
  }

  if (res.status === 204) {
    return null;
  }

  // Other errors — treat as failure
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse<FetchNavResponse>> {
  const apiKey = process.env.SEC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ lastVal: null, navDate: null }, { status: 500 });
  }

  let body: FetchNavRequestBody;
  try {
    body = (await req.json()) as FetchNavRequestBody;
  } catch {
    return NextResponse.json({ lastVal: null, navDate: null }, { status: 400 });
  }

  const { holdingId, navDate } = body;
  if (!holdingId || !navDate) {
    return NextResponse.json({ lastVal: null, navDate: null }, { status: 400 });
  }

  // Try today, today-1, today-2, today-3
  for (let offset = 0; offset >= -3; offset--) {
    const attemptDate = offset === 0 ? navDate : addDays(navDate, offset);
    try {
      const records = await fetchNavForDate(holdingId, attemptDate, apiKey);
      if (records && records.length > 0) {
        const record = records[0];
        return NextResponse.json({
          lastVal: record.last_val,
          navDate: record.nav_date ?? attemptDate,
        });
      }
    } catch {
      // Network or parse error — try next date
    }
  }

  return NextResponse.json({ lastVal: null, navDate: null });
}
