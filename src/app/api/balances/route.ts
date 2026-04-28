import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/balances
 *  - employees see their own balances
 *  - admins can pass ?userId=X to see another user
 *  - admins can pass ?all=true to see every user's balances (used by Reports)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`, 10);
  const all = searchParams.get("all") === "true";
  const userIdParam = searchParams.get("userId");

  const isAdmin = session.user.role === "admin";

  if (all && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = all ? undefined : isAdmin ? (userIdParam ?? session.user.id) : session.user.id;

  const balances = await prisma.leaveBalance.findMany({
    where: { year, ...(userId ? { userId } : {}) },
    include: {
      leaveType: true,
      user: { select: { id: true, name: true, email: true, departmentId: true } },
    },
    orderBy: [{ leaveType: { order: "asc" } }],
  });

  return NextResponse.json(balances);
}
