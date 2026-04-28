import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/export
 *   ?userId=…       — only requests from this employee
 *   ?departmentId=… — only requests from members of this department
 *   ?status=…       — optional status filter (approved | pending | rejected)
 *   ?from=YYYY-MM-DD &to=YYYY-MM-DD — optional date window (request startDate falls in window)
 *
 * Returns CSV. Filename reflects the scope so the user gets a meaningful download name.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId       = searchParams.get("userId")       ?? undefined;
  const departmentId = searchParams.get("departmentId") ?? undefined;
  const status       = searchParams.get("status")       ?? undefined;
  const from         = searchParams.get("from")         ?? undefined;
  const to           = searchParams.get("to")           ?? undefined;

  const where: Prisma.TimeOffRequestWhereInput = {};
  if (userId) where.userId = userId;
  if (departmentId) where.user = { departmentId };
  if (status && ["pending", "approved", "rejected"].includes(status)) where.status = status;
  if (from || to) {
    where.startDate = {};
    if (from) (where.startDate as Prisma.DateTimeFilter).gte = new Date(from);
    if (to)   (where.startDate as Prisma.DateTimeFilter).lte = new Date(`${to}T23:59:59`);
  }

  const requests = await prisma.timeOffRequest.findMany({
    where,
    include: {
      user: {
        select: {
          name: true, email: true, jobTitle: true,
          department: { select: { name: true } },
          manager:    { select: { name: true } },
        },
      },
      leaveType: { select: { label: true, key: true, paid: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
  });

  // Compute scope label for the filename
  let scopeLabel = "all";
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (u) scopeLabel = `person-${slug(u.name)}`;
  } else if (departmentId) {
    const d = await prisma.department.findUnique({ where: { id: departmentId }, select: { name: true } });
    if (d) scopeLabel = `dept-${slug(d.name)}`;
  }

  const header = [
    "Employee", "Email", "Job Title", "Department", "Manager",
    "Leave Type", "Type Key", "Paid",
    "Start Date", "End Date", "Calendar Days", "Half-Day Start", "Half-Day End",
    "Status", "Request Reason", "Rejection Reason",
    "Reviewed By", "Reviewed At", "Submitted At",
  ];

  const rows = requests.map((r) => {
    const days = Math.floor((r.endDate.getTime() - r.startDate.getTime()) / 86400000) + 1;
    return [
      r.user.name,
      r.user.email,
      r.user.jobTitle ?? "",
      r.user.department?.name ?? "",
      r.user.manager?.name ?? "",
      r.leaveType?.label ?? r.type,
      r.leaveType?.key ?? r.type,
      r.leaveType ? (r.leaveType.paid ? "yes" : "no") : "",
      format(r.startDate, "yyyy-MM-dd"),
      format(r.endDate,   "yyyy-MM-dd"),
      days,
      r.halfDayStart ? "yes" : "no",
      r.halfDayEnd   ? "yes" : "no",
      r.status,
      r.reason || "",
      r.rejectionReason || "",
      r.reviewedBy?.name || "",
      r.reviewedAt ? format(r.reviewedAt, "yyyy-MM-dd") : "",
      format(r.createdAt, "yyyy-MM-dd"),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });

  // Add a UTF-8 BOM so Excel opens it cleanly with non-ASCII names
  const csv = "﻿" + [header.join(","), ...rows].join("\n");

  const filename = `timeoff-${scopeLabel}-${format(new Date(), "yyyy-MM-dd")}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
}
