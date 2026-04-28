// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const LEAVE_TYPES = [
  { key: "vacation",   label: "Vacation",     emoji: "🌴", color: "#10b981", defaultAllowance: 20, paid: true,  order: 1 },
  { key: "sick",       label: "Sick Leave",   emoji: "🤒", color: "#f59e0b", defaultAllowance: 10, paid: true,  order: 2 },
  { key: "personal",   label: "Personal",     emoji: "🌿", color: "#8b5cf6", defaultAllowance: 5,  paid: true,  order: 3 },
  { key: "parental",   label: "Parental",     emoji: "👶", color: "#ec4899", defaultAllowance: 0,  paid: true,  order: 4 },
  { key: "bereavement",label: "Bereavement",  emoji: "🕊️", color: "#64748b", defaultAllowance: 5,  paid: true,  order: 5 },
  { key: "unpaid",     label: "Unpaid",       emoji: "🌙", color: "#94a3b8", defaultAllowance: null, paid: false, order: 6 },
];

async function main() {
  // ── Company ────────────────────────────────────────────────
  await prisma.company.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Lumen & Co.",
      tagline: "Where the team breathes.",
      brandColor: "#7c5cff",
      accentColor: "#ff8fb1",
      workWeek: "1,2,3,4,5",
      countryCode: "US",
      timeZone: "America/New_York",
    },
  });

  // ── Leave Types ────────────────────────────────────────────
  for (const t of LEAVE_TYPES) {
    await prisma.leaveType.upsert({
      where: { key: t.key },
      update: {},
      create: t,
    });
  }
  const leaveTypes = await prisma.leaveType.findMany();
  const byKey = Object.fromEntries(leaveTypes.map((t: { key: string; id: string }) => [t.key, t]));

  // ── Departments ────────────────────────────────────────────
  const deptEng = await prisma.department.upsert({
    where: { name: "Engineering" },
    update: {},
    create: { name: "Engineering", color: "#7c5cff" },
  });
  const deptDesign = await prisma.department.upsert({
    where: { name: "Design" },
    update: {},
    create: { name: "Design", color: "#ff8fb1" },
  });
  const deptOps = await prisma.department.upsert({
    where: { name: "Operations" },
    update: {},
    create: { name: "Operations", color: "#10b981" },
  });

  // ── Users ──────────────────────────────────────────────────
  const adminPw = await bcrypt.hash("admin123", 10);
  const empPw   = await bcrypt.hash("employee123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      name: "Alex Admin",
      password: adminPw,
      role: "admin",
      jobTitle: "People Operations Lead",
      departmentId: deptOps.id,
    },
  });

  const sarah = await prisma.user.upsert({
    where: { email: "sarah@company.com" },
    update: {},
    create: {
      email: "sarah@company.com",
      name: "Sarah Johnson",
      password: empPw,
      role: "employee",
      jobTitle: "Senior Engineer",
      departmentId: deptEng.id,
      managerId: admin.id,
    },
  });
  const marcus = await prisma.user.upsert({
    where: { email: "marcus@company.com" },
    update: {},
    create: {
      email: "marcus@company.com",
      name: "Marcus Lee",
      password: empPw,
      role: "employee",
      jobTitle: "Product Designer",
      departmentId: deptDesign.id,
      managerId: admin.id,
    },
  });
  const priya = await prisma.user.upsert({
    where: { email: "priya@company.com" },
    update: {},
    create: {
      email: "priya@company.com",
      name: "Priya Patel",
      password: empPw,
      role: "employee",
      jobTitle: "Engineering Manager",
      departmentId: deptEng.id,
      managerId: admin.id,
    },
  });
  const tom = await prisma.user.upsert({
    where: { email: "tom@company.com" },
    update: {},
    create: {
      email: "tom@company.com",
      name: "Tom Rivera",
      password: empPw,
      role: "employee",
      jobTitle: "Frontend Engineer",
      departmentId: deptEng.id,
      managerId: priya.id,
    },
  });
  const employees = [sarah, marcus, priya, tom];

  // ── Leave Balances (current year) ──────────────────────────
  const year = new Date().getFullYear();
  for (const u of [admin, ...employees]) {
    for (const t of leaveTypes) {
      if (t.defaultAllowance === null) continue;
      await prisma.leaveBalance.upsert({
        where: { userId_leaveTypeId_year: { userId: u.id, leaveTypeId: t.id, year } },
        update: {},
        create: {
          userId: u.id,
          leaveTypeId: t.id,
          year,
          allowance: t.defaultAllowance,
          used: 0,
        },
      });
    }
  }
  // Seed some used days for realism
  await prisma.leaveBalance.update({
    where: { userId_leaveTypeId_year: { userId: sarah.id, leaveTypeId: byKey.vacation.id, year } },
    data: { used: 7 },
  });
  await prisma.leaveBalance.update({
    where: { userId_leaveTypeId_year: { userId: marcus.id, leaveTypeId: byKey.vacation.id, year } },
    data: { used: 4 },
  });

  // ── Holidays ───────────────────────────────────────────────
  const baseHolidays = [
    { name: "New Year's Day",    date: new Date(year, 0, 1),  recurring: true,  source: "public" },
    { name: "Independence Day",  date: new Date(year, 6, 4),  recurring: true,  source: "public" },
    { name: "Thanksgiving",      date: new Date(year, 10, 27),recurring: false, source: "public" },
    { name: "Christmas Day",     date: new Date(year, 11, 25),recurring: true,  source: "public" },
    { name: "Company Off-Site",  date: new Date(year, 8, 15), recurring: false, source: "company" },
    { name: "Founder's Day",     date: new Date(year, 4, 12), recurring: true,  source: "company" },
  ];
  for (const h of baseHolidays) {
    const exists = await prisma.holiday.findFirst({ where: { name: h.name, date: h.date } });
    if (!exists) await prisma.holiday.create({ data: h });
  }

  // ── Time-off requests ──────────────────────────────────────
  const now = new Date();
  const d = (offset: number) => {
    const x = new Date(now);
    x.setDate(x.getDate() + offset);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  // Wipe & reseed requests so this is idempotent
  await prisma.timeOffRequest.deleteMany();

  await prisma.timeOffRequest.createMany({
    data: [
      { userId: sarah.id,  startDate: d(3),  endDate: d(7),  reason: "Family vacation", type: "vacation", leaveTypeId: byKey.vacation.id, status: "approved", reviewedById: admin.id, reviewedAt: new Date() },
      { userId: marcus.id, startDate: d(10), endDate: d(12), reason: "Personal matters", type: "personal", leaveTypeId: byKey.personal.id, status: "approved", reviewedById: admin.id, reviewedAt: new Date() },
      { userId: priya.id,  startDate: d(-5), endDate: d(-3), reason: "Sick leave",       type: "sick",     leaveTypeId: byKey.sick.id,     status: "approved", reviewedById: admin.id, reviewedAt: new Date() },
      { userId: marcus.id, startDate: d(20), endDate: d(25), reason: "Summer trip",      type: "vacation", leaveTypeId: byKey.vacation.id, status: "pending" },
      { userId: tom.id,    startDate: d(5),  endDate: d(5),  reason: "Doctor appointment", type: "sick", leaveTypeId: byKey.sick.id, halfDayStart: true, halfDayEnd: true, status: "pending" },
      { userId: priya.id,  startDate: d(1),  endDate: d(2),  reason: "Short trip",       type: "vacation", leaveTypeId: byKey.vacation.id, status: "rejected", rejectionReason: "Coverage gap that week.", reviewedById: admin.id, reviewedAt: new Date() },
    ],
  });

  // ── Attendance backfill ────────────────────────────────────
  for (const emp of employees) {
    for (let i = 6; i >= 1; i--) {
      const date = d(-i);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue;
      const pool = ["present", "present", "present", "present", "sick"];
      const status = pool[Math.floor(Math.random() * pool.length)];
      await prisma.attendance.upsert({
        where: { userId_date: { userId: emp.id, date } },
        update: {},
        create: { userId: emp.id, date, status },
      });
    }
  }

  console.log("✅ Seed complete");
  console.log("  Admin:    admin@company.com / admin123");
  console.log("  Employee: sarah@company.com / employee123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
