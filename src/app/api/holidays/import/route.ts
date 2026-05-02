import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Holidays from "date-holidays";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

interface PreviewItem {
  date: string; // YYYY-MM-DD
  name: string;
}

// `date-holidays` returns Date objects in the holiday's local timezone. For
// preview/storage we only care about the calendar day, so pull "YYYY-MM-DD"
// straight from the provided datestring (format: "YYYY-MM-DD hh:mm:ss …").
function toIsoDay(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function buildHolidays(countryCode: string, year: number): PreviewItem[] {
  const hd = new Holidays(countryCode);
  const list = hd.getHolidays(year) ?? [];
  return list
    .filter((h) => h.type === "public")
    .map((h) => ({ date: toIsoDay(h.date), name: h.name }));
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const countryCode = searchParams.get("countryCode")?.toUpperCase();
  const yearRaw = searchParams.get("year");

  // Country list is bundled in the package, no I/O. Always include it so the
  // UI can populate its dropdown from the same response that gives it the
  // preview rows.
  const countries = new Holidays().getCountries("en");

  // Always return the country list so the UI can populate its dropdown
  // even when the company's saved countryCode isn't in date-holidays. The
  // POST endpoint enforces validity before writing.
  if (!countryCode || !yearRaw || !countries[countryCode]) {
    return NextResponse.json({ countries, holidays: [] });
  }
  const year = parseInt(yearRaw, 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return NextResponse.json({ countries, holidays: [] });
  }

  return NextResponse.json({ countries, holidays: buildHolidays(countryCode, year) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { countryCode: rawCountry, year: rawYear } = await req.json();
  const countryCode = typeof rawCountry === "string" ? rawCountry.toUpperCase() : "";
  const year = typeof rawYear === "number" ? rawYear : parseInt(String(rawYear), 10);

  const countries = new Holidays().getCountries("en");
  if (!countries[countryCode]) {
    return NextResponse.json({ error: "Unsupported country" }, { status: 400 });
  }
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const candidates = buildHolidays(countryCode, year);
  if (candidates.length === 0) {
    return NextResponse.json({ created: 0, skipped: 0 });
  }

  // Skip rows that already exist as a public holiday on the same date+name.
  // Matching by (date, name) lets admins re-import after renaming or after
  // adding their own custom entries on the same day without losing them.
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  const existing = await prisma.holiday.findMany({
    where: { source: "public", date: { gte: start, lte: end } },
    select: { date: true, name: true },
  });
  const existingKeys = new Set(
    existing.map((h) => `${h.date.toISOString().slice(0, 10)}|${h.name}`),
  );

  const fresh = candidates.filter((c) => !existingKeys.has(`${c.date}|${c.name}`));
  if (fresh.length > 0) {
    await prisma.holiday.createMany({
      data: fresh.map((c) => ({
        name: c.name,
        date: new Date(`${c.date}T00:00:00.000Z`),
        recurring: false,
        source: "public",
      })),
    });
  }

  await audit({
    actorId: session.user.id,
    action: "holiday.imported",
    targetType: "Holiday",
    targetId: `${countryCode}-${year}`,
    metadata: { countryCode, year, created: fresh.length, skipped: candidates.length - fresh.length },
  });

  return NextResponse.json({ created: fresh.length, skipped: candidates.length - fresh.length });
}
