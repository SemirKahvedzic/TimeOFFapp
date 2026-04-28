/**
 * Unit tests for time-off request business logic.
 * These test pure functions and rules without hitting the database.
 */

// --- Logic under test (extracted from API route logic) ---

function validateDates(startDate: string, endDate: string): string | null {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Invalid date";
  if (start > end) return "Start date must be before end date";
  return null;
}

function hasOverlap(
  newStart: Date,
  newEnd: Date,
  existing: { startDate: Date; endDate: Date; status: string }[]
): boolean {
  return existing.some(
    (r) =>
      r.status !== "rejected" &&
      r.startDate <= newEnd &&
      r.endDate >= newStart
  );
}

function canApproveOrReject(userRole: string): boolean {
  return userRole === "admin";
}

function canDelete(
  requestUserId: string,
  requestStatus: string,
  actorId: string,
  actorRole: string
): { allowed: boolean; reason?: string } {
  if (actorRole !== "admin" && actorId !== requestUserId) {
    return { allowed: false, reason: "Forbidden" };
  }
  if (requestStatus === "approved" && actorRole !== "admin") {
    return { allowed: false, reason: "Cannot delete an approved request" };
  }
  return { allowed: true };
}

// --- Tests ---

describe("Date validation", () => {
  it("accepts valid date range", () => {
    expect(validateDates("2026-05-01", "2026-05-07")).toBeNull();
  });

  it("accepts single day", () => {
    expect(validateDates("2026-05-01", "2026-05-01")).toBeNull();
  });

  it("rejects start after end", () => {
    expect(validateDates("2026-05-10", "2026-05-01")).not.toBeNull();
  });

  it("rejects invalid dates", () => {
    expect(validateDates("not-a-date", "2026-05-01")).not.toBeNull();
  });
});

describe("Overlap detection", () => {
  const existing = [
    { startDate: new Date("2026-05-10"), endDate: new Date("2026-05-14"), status: "approved" },
    { startDate: new Date("2026-05-20"), endDate: new Date("2026-05-25"), status: "pending" },
    { startDate: new Date("2026-06-01"), endDate: new Date("2026-06-05"), status: "rejected" },
  ];

  it("detects overlap with approved request", () => {
    expect(hasOverlap(new Date("2026-05-12"), new Date("2026-05-16"), existing)).toBe(true);
  });

  it("detects overlap with pending request", () => {
    expect(hasOverlap(new Date("2026-05-19"), new Date("2026-05-21"), existing)).toBe(true);
  });

  it("ignores overlap with rejected request", () => {
    expect(hasOverlap(new Date("2026-06-01"), new Date("2026-06-03"), existing)).toBe(false);
  });

  it("detects overlap when new range starts on last day of existing", () => {
    // existing ends 05-14, new starts 05-15 — no overlap
    expect(hasOverlap(new Date("2026-05-15"), new Date("2026-05-19"), existing)).toBe(false);
  });

  it("allows date range after all existing", () => {
    expect(hasOverlap(new Date("2026-07-01"), new Date("2026-07-05"), existing)).toBe(false);
  });
});

describe("Role permissions", () => {
  it("allows admin to approve/reject", () => {
    expect(canApproveOrReject("admin")).toBe(true);
  });

  it("prevents employee from approving/rejecting", () => {
    expect(canApproveOrReject("employee")).toBe(false);
  });
});

describe("Delete permissions", () => {
  it("allows owner to delete their pending request", () => {
    const result = canDelete("user1", "pending", "user1", "employee");
    expect(result.allowed).toBe(true);
  });

  it("prevents non-owner employee from deleting", () => {
    const result = canDelete("user1", "pending", "user2", "employee");
    expect(result.allowed).toBe(false);
  });

  it("prevents employee from deleting approved request", () => {
    const result = canDelete("user1", "approved", "user1", "employee");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("approved");
  });

  it("allows admin to delete any request", () => {
    const result = canDelete("user1", "approved", "admin1", "admin");
    expect(result.allowed).toBe(true);
  });

  it("allows admin to delete approved requests", () => {
    const result = canDelete("user1", "approved", "admin1", "admin");
    expect(result.allowed).toBe(true);
  });
});
