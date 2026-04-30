"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { TrendingUp, Users, CalendarRange, Crown, Download } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar } from "@/components/Avatar";
import { Pill } from "@/components/ui/Badge";
import { Select, FieldLabel, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatLeaveDays } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import { usePageTitle } from "@/lib/usePageTitle";

interface ReportData {
  year: number;
  usageByMonth:      { month: string; days: number }[];
  usageByDepartment: { department: string; days: number }[];
  topUsers:          { name: string; avatarUrl: string | null; days: number }[];
  upcomingCoverage:  { id: string; name: string; avatarUrl: string | null; department: string | null; deptColor: string | null; startDate: string; endDate: string }[];
}

interface DepartmentOption { id: string; name: string; color: string; }
interface UserOption       { id: string; name: string; email: string; department?: { id: string; name: string } | null; }

export default function ReportsPage() {
  usePageTitle("nav.reports");
  const t = useT();
  const [data, setData] = useState<ReportData | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ])
      .then(([reportData, deptList, userList]) => {
        setData(reportData);
        setDepartments(Array.isArray(deptList) ? deptList : []);
        setUsers(Array.isArray(userList) ? userList : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="py-20 text-center">
        <div
          className="inline-block w-8 h-8 border-[3px] rounded-full animate-spin"
          style={{ borderColor: "var(--brand-soft)", borderTopColor: "var(--brand)" }}
        />
        <p className="text-sm mt-3" style={{ color: "var(--ink-mute)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  const totalDays = data.usageByMonth.reduce((sum, m) => sum + m.days, 0);
  const peakMonth = data.usageByMonth.reduce((best, m) => (m.days > best.days ? m : best), data.usageByMonth[0]);
  const maxMonth = peakMonth?.days || 1;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-mute)" }}>
          {t("reports.label", { year: data.year })}
        </p>
        <h1 className="text-3xl font-black tracking-tight mt-1" style={{ color: "var(--ink)" }}>
          {t("reports.title")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          {t("reports.subtitle")}
        </p>
      </div>

      <DownloadSection departments={departments} users={users} />

      {/* Headline KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HeadlineKPI
          icon={CalendarRange}
          color="#7c5cff"
          label={t("reports.totalDays")}
          value={formatLeaveDays(totalDays)}
          sub=""
        />
        <HeadlineKPI
          icon={TrendingUp}
          color="#ff8fb1"
          label={t("reports.peakMonth")}
          value={peakMonth ? format(new Date(peakMonth.month + "-01"), "MMMM") : "—"}
          sub={peakMonth ? formatLeaveDays(peakMonth.days) : ""}
        />
        <HeadlineKPI
          icon={Users}
          color="#10b981"
          label={t("reports.peopleSoon")}
          value={`${data.upcomingCoverage.length}`}
          sub=""
        />
      </div>

      {/* Usage by month */}
      <div className="rounded-3xl p-6" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
        <h2 className="text-sm font-extrabold tracking-tight mb-4" style={{ color: "var(--ink)" }}>
          {t("reports.byMonth")}
        </h2>
        <div className="grid grid-cols-12 gap-2 items-end h-44">
          {data.usageByMonth.map((m) => {
            const pct = (m.days / maxMonth) * 100;
            return (
              <div key={m.month} className="flex flex-col items-center gap-1.5">
                <div className="relative flex-1 w-full flex items-end">
                  <div
                    className="w-full rounded-xl transition-all"
                    style={{
                      height: `${Math.max(6, pct)}%`,
                      background:
                        m.days === 0
                          ? "var(--surface)"
                          : "linear-gradient(180deg, var(--brand), var(--accent))",
                      boxShadow: m.days === 0 ? "var(--soft-press-sm)" : "var(--soft-1)",
                      minHeight: 8,
                    }}
                    title={`${m.days} days`}
                  />
                </div>
                <span className="text-[10px] font-bold uppercase" style={{ color: "var(--ink-mute)" }}>
                  {format(new Date(m.month + "-01"), "MMM")}
                </span>
                <span className="text-[10px] font-extrabold" style={{ color: "var(--ink)" }}>
                  {m.days || ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Usage by department */}
        <div className="rounded-3xl p-6" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
          <h2 className="text-sm font-extrabold tracking-tight mb-4" style={{ color: "var(--ink)" }}>
            {t("reports.byDept")}
          </h2>
          {data.usageByDepartment.length === 0 ? (
            <p className="text-sm italic" style={{ color: "var(--ink-faint)" }}>{t("reports.empty.dept")}</p>
          ) : (
            <div className="space-y-3">
              {data.usageByDepartment.map((d) => {
                const max = data.usageByDepartment[0].days || 1;
                const pct = (d.days / max) * 100;
                return (
                  <div key={d.department}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>{d.department}</span>
                      <span className="text-[11px] font-extrabold" style={{ color: "var(--ink-mute)" }}>
                        {formatLeaveDays(d.days)}
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, var(--brand), var(--accent))",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top users */}
        <div className="rounded-3xl p-6" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
          <h2 className="text-sm font-extrabold tracking-tight mb-4" style={{ color: "var(--ink)" }}>
            {t("reports.topUsers")}
          </h2>
          {data.topUsers.length === 0 ? (
            <p className="text-sm italic" style={{ color: "var(--ink-faint)" }}>{t("reports.empty.top")}</p>
          ) : (
            <div className="space-y-2.5">
              {data.topUsers.map((u, i) => (
                <div
                  key={u.name}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
                >
                  <Avatar name={u.name} size={36} className="rounded-full shrink-0" imageUrl={u.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{u.name}</p>
                      {i === 0 && <Crown size={11} style={{ color: "#f59e0b" }} />}
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-extrabold px-2.5 py-1 rounded-full"
                    style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                  >
                    {formatLeaveDays(u.days)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming coverage */}
      <div className="rounded-3xl p-6" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
        <h2 className="text-sm font-extrabold tracking-tight mb-4" style={{ color: "var(--ink)" }}>
          {t("reports.upcoming")}
        </h2>
        {data.upcomingCoverage.length === 0 ? (
          <p className="text-sm italic" style={{ color: "var(--ink-faint)" }}>{t("reports.empty.up")}</p>
        ) : (
          <div className="space-y-2.5">
            {data.upcomingCoverage.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
              >
                <Avatar name={c.name} size={32} className="rounded-full shrink-0" imageUrl={c.avatarUrl} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{c.name}</p>
                    {c.department && c.deptColor && (
                      <Pill label={c.department} color={c.deptColor} />
                    )}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
                    {format(new Date(c.startDate), "MMM d")} → {format(new Date(c.endDate), "MMM d")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HeadlineKPI({
  icon: Icon, color, label, value, sub,
}: { icon: React.ElementType; color: string; label: string; value: string; sub: string }) {
  return (
    <div
      className="rounded-3xl p-5 tilt-hover"
      style={{
        background: `linear-gradient(160deg, color-mix(in oklab, ${color} 14%, var(--surface-2)), var(--surface-2))`,
        boxShadow: "var(--soft-1)",
      }}
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white mb-3"
        style={{ background: color, boxShadow: `0 12px 28px -8px ${color}88` }}
      >
        <Icon size={18} />
      </div>
      <p className="text-2xl font-black tracking-tight" style={{ color: "var(--ink)" }}>
        {value}
      </p>
      <p className="text-[11px] font-bold uppercase tracking-wider mt-1" style={{ color }}>
        {label}
      </p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mute)" }}>{sub}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Download section — pick scope & date window, download CSV       */
/* ─────────────────────────────────────────────────────────────── */
type Scope = "all" | "department" | "person";

function DownloadSection({
  departments, users,
}: { departments: DepartmentOption[]; users: UserOption[] }) {
  const t = useT();
  const [scope, setScope] = useState<Scope>("all");
  const [departmentId, setDepartmentId] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<"" | "approved" | "pending" | "rejected">("");
  const [from, setFrom] = useState("");
  const [to, setTo]     = useState("");
  const [downloading, setDownloading] = useState(false);

  // Filter user dropdown by department when scope is "person" and a dept is also selected
  const filteredUsers = users;

  async function download() {
    if (scope === "department" && !departmentId) return toast.error(t("download.toast.pickDept"));
    if (scope === "person"     && !userId)       return toast.error(t("download.toast.pickPerson"));

    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (scope === "department") params.set("departmentId", departmentId);
      if (scope === "person")     params.set("userId", userId);
      if (status) params.set("status", status);
      if (from)   params.set("from", from);
      if (to)     params.set("to", to);

      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) throw new Error(t("download.toast.failed"));
      const blob = await res.blob();

      // Pull filename from header, or fall back
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = /filename="?([^"]+)"?/i.exec(cd);
      const filename = m?.[1] ?? `timeoff-${new Date().toISOString().slice(0, 10)}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("download.toast.success"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("download.toast.failed"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="rounded-3xl p-6"
      style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="text-base font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
            {t("download.title")}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--ink-soft)" }}>
            {t("download.subtitle")}
          </p>
        </div>
      </div>

      {/* Scope picker */}
      <div className="flex flex-wrap gap-2 mb-4">
        <ScopeBtn active={scope === "all"}        onClick={() => setScope("all")}>{t("download.scope.all")}</ScopeBtn>
        <ScopeBtn active={scope === "department"} onClick={() => setScope("department")}>{t("download.scope.dept")}</ScopeBtn>
        <ScopeBtn active={scope === "person"}     onClick={() => setScope("person")}>{t("download.scope.person")}</ScopeBtn>
      </div>

      {/* Scope-specific picker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {scope === "department" && (
          <div className="md:col-span-2">
            <FieldLabel>{t("download.field.dept")}</FieldLabel>
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">{t("download.placeholder.dept")}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
        )}

        {scope === "person" && (
          <div className="md:col-span-2">
            <FieldLabel>{t("download.field.person")}</FieldLabel>
            <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">{t("download.placeholder.person")}</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}{u.department?.name ? ` — ${u.department.name}` : ""}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <FieldLabel>{t("download.field.status")}</FieldLabel>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="">{t("download.placeholder.status")}</option>
            <option value="approved">{t("status.approved")}</option>
            <option value="pending">{t("status.pending")}</option>
            <option value="rejected">{t("status.rejected")}</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>{t("download.field.from")}</FieldLabel>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <FieldLabel>{t("download.field.to")}</FieldLabel>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 flex-wrap">
        <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
          {scope === "all"        && t("download.hint.all")}
          {scope === "department" && (departmentId
            ? t("download.hint.deptPicked", { name: departments.find((d) => d.id === departmentId)?.name ?? "" })
            : t("download.hint.deptMissing"))}
          {scope === "person" && (userId
            ? t("download.hint.personPicked", { name: users.find((u) => u.id === userId)?.name ?? "" })
            : t("download.hint.personMissing"))}
        </p>
        <Button onClick={download} loading={downloading}>
          <Download size={14} />
          {t("btn.downloadCsv")}
        </Button>
      </div>
    </div>
  );
}

function ScopeBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="px-4 py-2 rounded-full text-[12px] font-bold transition-all duration-200 active:scale-[0.97]"
      style={
        active
          ? {
              background: "linear-gradient(135deg, var(--brand), var(--accent))",
              color: "white",
              boxShadow: "var(--glow-brand)",
            }
          : {
              background: "var(--surface)",
              color: "var(--ink-soft)",
              boxShadow: "var(--soft-press-sm)",
            }
      }
    >
      {children}
    </button>
  );
}
