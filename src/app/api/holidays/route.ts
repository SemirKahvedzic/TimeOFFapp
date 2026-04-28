import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const where: { date?: { gte: Date; lte: Date } } = {};
  if (year) {
    const y = parseInt(year, 10);
    where.date = { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59) };
  }
  const holidays = await prisma.holiday.findMany({ where, orderBy: { date: "asc" } });
  return NextResponse.json(holidays);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { name, date, recurring, source } = body;
  if (!name || !date) return NextResponse.json({ error: "Name and date required" }, { status: 400 });
  const created = await prisma.holiday.create({
    data: {
      name,
      date: new Date(date),
      recurring: !!recurring,
      source: source || "company",
    },
  });
  await audit({ actorId: session.user.id, action: "holiday.created", targetType: "Holiday", targetId: created.id, metadata: created });
  return NextResponse.json(created, { status: 201 });
}
