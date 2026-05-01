"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { PlusCircle, Clock, CheckCircle, XCircle, Inbox, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RequestForm } from "@/components/RequestForm";
import { RequestCard } from "@/components/RequestCard";
import { AttendanceWidget } from "@/components/AttendanceWidget";
import { BalanceCard } from "@/components/BalanceCard";
import { UpcomingHolidays } from "@/components/UpcomingHolidays";
import { Paginator } from "@/components/ui/Paginator";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";
import { usePageTitle } from "@/lib/usePageTitle";

const PAGE_SIZE = 10;
const FILTERS: { key: string; labelKey: MessageKey; icon: React.ElementType; tone: string; bg: string }[] = [
  { key: "all",      labelKey: "status.all",      icon: ListFilter,  tone: "var(--brand)", bg: "var(--brand-soft)" },
  { key: "pending",  labelKey: "status.pending",  icon: Clock,       tone: "var(--warn)",  bg: "var(--warn-bg)"   },
  { key: "approved", labelKey: "status.approved", icon: CheckCircle, tone: "var(--ok)",    bg: "var(--ok-bg)"     },
  { key: "rejected", labelKey: "status.rejected", icon: XCircle,     tone: "var(--err)",   bg: "var(--err-bg)"    },
];

interface TimeOffRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
  rejectionReason?: string;
  type: string;
  status: string;
  halfDayStart?: boolean;
  halfDayEnd?: boolean;
  createdAt: string;
  user: { name: string; email: string };
  leaveType?: { id: string; key: string; label: string; emoji: string; color: string } | null;
}

function MiniStat({
  label, value, icon: Icon, color,
}: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 tilt-hover"
      style={{
        background: `linear-gradient(160deg, color-mix(in oklab, ${color} 14%, var(--surface-2)), var(--surface-2))`,
        boxShadow: "var(--soft-1)",
      }}
    >
      <Icon size={16} style={{ color }} className="mb-2" />
      <p className="text-2xl font-black tracking-tight" style={{ color: "var(--ink)" }}>
        {value}
      </p>
      <p className="text-[10px] font-bold mt-0.5 uppercase tracking-wider" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

export default function EmployeeDashboard() {
  usePageTitle("nav.home");
  const { data: session } = useSession();
  const t = useT();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/requests");
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [filter]);

  const counts = useMemo(() => ({
    all:      requests.length,
    pending:  requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }), [requests]);

  const filtered = useMemo(
    () => (filter === "all" ? requests : requests.filter((r) => r.status === filter)),
    [filter, requests]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage  = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const greeting = t(greetingKeyForHour(new Date().getHours()));

  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <div
        className="relative overflow-hidden rounded-[28px] p-6"
        style={{
          background: "linear-gradient(135deg, var(--surface-2), var(--surface))",
          boxShadow: "var(--soft-2)",
        }}
      >
        <div className="brand-cap" />
        <div
          className="absolute -top-12 -right-10 w-48 h-48 rounded-full opacity-30 pointer-events-none"
          style={{ background: "linear-gradient(135deg, var(--brand), var(--accent))", filter: "blur(40px)" }}
        />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-mute)" }}>
              {greeting}
            </p>
            <h1 className="text-3xl font-black tracking-tight mt-1" style={{ color: "var(--ink)" }}>
              {session?.user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-sm mt-2" style={{ color: "var(--ink-soft)" }}>
              {t("dash.subtitle")}
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} size="md">
            <PlusCircle size={16} />
            {t("btn.newRequest")}
          </Button>
        </div>
      </div>

      <AttendanceWidget />

      <BalanceCard />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Pending"  value={counts.pending}  icon={Clock}       color="var(--warn)" />
            <MiniStat label="Approved" value={counts.approved} icon={CheckCircle} color="var(--ok)"   />
            <MiniStat label="Rejected" value={counts.rejected} icon={XCircle}     color="var(--err)"  />
          </div>

          <div
            className="rounded-3xl"
            style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}
          >
            <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-sm font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
                {t("dash.myRequests")}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-mute)" }}>
                {filtered.length} {filter === "all" ? "" : t(`status.${filter}` as MessageKey).toLowerCase()}
              </span>
            </div>

            {/* Filter tabs (history) */}
            <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap">
              {FILTERS.map(({ key, labelKey, icon: Icon, tone, bg }) => {
                const isActive = filter === key;
                const count = counts[key as keyof typeof counts];
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 active:scale-[0.97]"
                    style={
                      isActive
                        ? { background: bg, color: tone, boxShadow: `0 4px 14px -4px color-mix(in oklab, ${tone} 45%, transparent)` }
                        : { background: "var(--surface)", color: "var(--ink-soft)", boxShadow: "var(--soft-press-sm)" }
                    }
                  >
                    <Icon size={11} className="opacity-90" />
                    {t(labelKey)}
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md min-w-[18px] text-center font-extrabold leading-none"
                      style={
                        isActive
                          ? { background: "color-mix(in oklab, white 45%, transparent)", color: tone }
                          : { background: "var(--surface-2)", color: "var(--ink-mute)" }
                      }
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="px-3 pb-4 space-y-2.5">
              {loading ? (
                <div className="py-10 text-center text-sm" style={{ color: "var(--ink-mute)" }}>{t("common.loading")}</div>
              ) : filtered.length === 0 ? (
                <div className="py-10 flex flex-col items-center text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
                  >
                    <Inbox size={22} style={{ color: "var(--ink-mute)" }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>
                    {filter === "all"
                      ? t("dash.empty.title")
                      : t("dash.empty.filtered", { filter: t(`status.${filter}` as MessageKey).toLowerCase() })}
                  </p>
                  {filter === "all" && (
                    <p className="text-xs mt-1" style={{ color: "var(--ink-faint)" }}>
                      {t("dash.empty.sub")}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {pageItems.map((r) => <RequestCard key={r.id} request={r} onUpdate={fetchRequests} />)}
                  <Paginator page={safePage} pageCount={pageCount} onPage={setPage} />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <UpcomingHolidays />
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t("cal.requestOff")} size="md">
        <RequestForm onSuccess={() => { setShowModal(false); fetchRequests(); }} />
      </Modal>
    </div>
  );
}

function greetingKeyForHour(h: number): MessageKey {
  if (h < 5) return "dash.greet.late";
  if (h < 12) return "dash.greet.morning";
  if (h < 17) return "dash.greet.afternoon";
  if (h < 21) return "dash.greet.evening";
  return "dash.greet.night";
}
