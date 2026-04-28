import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const all = searchParams.get("all");

  let where = {};
  if (all === "true" && session.user.role === "admin") {
    where = userId ? { userId } : {};
  } else {
    where = { userId: session.user.id };
  }

  const records = await prisma.attendance.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
    take: 30,
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, status, note } = body;

  if (!date || !status) {
    return NextResponse.json({ error: "Date and status required" }, { status: 400 });
  }

  if (!["present", "absent", "sick"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const record = await prisma.attendance.upsert({
    where: { userId_date: { userId: session.user.id, date: d } },
    update: { status, note: note || null },
    create: { userId: session.user.id, date: d, status, note: note || null },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(record, { status: 201 });
}
