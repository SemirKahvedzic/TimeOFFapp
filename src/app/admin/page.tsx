"use client";
import { useState, useEffect, useCallback } from "react";
import { Users, Clock, CheckCircle, XCircle, Download, Calendar, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { RequestCard } from "@/components/RequestCard";
import { TeamCalendar } from "@/components/TeamCalendar";
import { Avatar } from "@/components/Avatar";
import { Pill } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import { usePageTitle } from "@/lib/usePageTitle";

interface TimeOffRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
  type: string;
  status: string;
  halfDayStart?: boolean;
  halfDayEnd?: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string; department?: { name: string; color: string } | null };
  leaveType?: { id: string; key: string; label: string; emoji: string; color: string } | null;
}

function KpiTile({
  label, value, icon: Icon, color,
}: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div
      className="rounded-3xl p-5 tilt-hover"
      style={{
        background: `linear-gradient(160deg, color-mix(in oklab, ${color} 14%, var(--surface-2)), var(--surface-2))`,
        boxShadow: "var(--soft-1)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
          style={{
            background: color,
            boxShadow: `0 8px 22px -6px ${color}66`,
          }}
        >
          <Icon size={18} />
        </div>
        <Sparkles size={12} style={{ color }} />
      </div>
      <p className="text-3xl font-black tracking-tight" style={{ color: "var(--ink)" }}>
        {value}
      </p>
      <p className="text-[11px] font-bold uppercase tracking-wider mt-1" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  usePageTitle("nav.overview");
  const t = useT();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/requests");
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  async function handleExport() {
    const res = await fetch("/api/export");
    if (!res.ok) { toast.error(t("admin.export.fail")); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-off-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("admin.export.success"));
  }

  const pending  = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");
  const rejected = requests.filter((r) => r.status === "rejected");

  const today = new Date();
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
  const offThisWeek = requests.filter((r) => {
    if (r.status !== "approved") return false;
    const s = r.startDate.slice(0, 10);
    const e = r.endDate.slice(0, 10);
    const t = today.toISOString().slice(0, 10);
    const w = weekEnd.toISOString().slice(0, 10);
    return s <= w && e >= t;
  });

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-[28px] p-6"
        style={{ background: "linear-gradient(135deg, var(--surface-2), var(--surface))", boxShadow: "var(--soft-2)" }}
      >
        <div className="brand-cap" />
        <div
          className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full opacity-30 pointer-events-none"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--brand))", filter: "blur(50px)" }}
        />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-mute)" }}>
              {t("admin.overview.label")}
            </p>
            <h1 className="text-3xl font-black tracking-tight mt-1" style={{ color: "var(--ink)" }}>
              {t("admin.overview.title")}
            </h1>
            <p className="text-sm mt-2" style={{ color: "var(--ink-soft)" }}>
              {pending.length > 0
                ? t("admin.overview.pending", { count: pending.length })
                : t("admin.overview.allCaught")}
            </p>
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <Download size={14} />
            {t("btn.exportCsv")}
          </Button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile label={t("admin.overview.kpi.total")}    value={requests.length} icon={Users}       color="#7c5cff" />
        <KpiTile label={t("admin.overview.kpi.pending")}  value={pending.length}  icon={Clock}       color="#f59e0b" />
        <KpiTile label={t("admin.overview.kpi.approved")} value={approved.length} icon={CheckCircle} color="#10b981" />
        <KpiTile label={t("admin.overview.kpi.rejected")} value={rejected.length} icon={XCircle}     color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending */}
        <div className="rounded-3xl" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-sm font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
              {t("admin.overview.pendingCard")}
            </h2>
            {pending.length > 0 && (
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: "var(--warn-bg)", color: "var(--warn)" }}
              >
                {t("admin.overview.toReview", { count: pending.length })}
              </span>
            )}
          </div>
          <div className="px-3 pb-3 space-y-2.5">
            {loading ? (
              <div className="py-10 text-center text-sm" style={{ color: "var(--ink-mute)" }}>{t("common.loading")}</div>
            ) : pending.length === 0 ? (
              <div className="py-12 flex flex-col items-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: "var(--ok-bg)" }}
                >
                  <CheckCircle size={22} style={{ color: "var(--ok)" }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>{t("admin.overview.allCaughtCard")}</p>
              </div>
            ) : (
              pending.map((r) => (
                <RequestCard key={r.id} request={r} showUser isAdmin onUpdate={fetchRequests} />
              ))
            )}
          </div>
        </div>

        {/* Off this week */}
        <div className="rounded-3xl" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-sm font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
              {t("admin.overview.thisWeek")}
            </h2>
            <Calendar size={14} style={{ color: "var(--ink-mute)" }} />
          </div>
          <div className="px-5 pb-5">
            {offThisWeek.length === 0 ? (
              <div className="py-10 text-center text-sm italic" style={{ color: "var(--ink-faint)" }}>
                {t("admin.overview.noOne")}
              </div>
            ) : (
              <div className="space-y-2.5">
                {offThisWeek.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-2xl"
                    style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={r.user.name} size={36} className="rounded-full shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>
                          {r.user.name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: "var(--ink-mute)" }}>
                          {formatDate(r.startDate)} → {formatDate(r.endDate)}
                        </p>
                      </div>
                    </div>
                    <Pill
                      label={r.leaveType?.label ?? "Vacation"}
                      color={r.leaveType?.color ?? "#10b981"}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-3xl p-5" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
        <h2 className="text-sm font-extrabold tracking-tight mb-3" style={{ color: "var(--ink)" }}>
          {t("admin.overview.calendar")}
        </h2>
        <TeamCalendar onRequestCreated={fetchRequests} />
      </div>
    </div>
  );
}
