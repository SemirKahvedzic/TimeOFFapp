"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { RequestCard } from "@/components/RequestCard";
import { Paginator } from "@/components/ui/Paginator";
import { Clock, CheckCircle, XCircle, ListFilter, Inbox } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";
import { usePageTitle } from "@/lib/usePageTitle";

const PAGE_SIZE = 10;

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
  user: { id: string; name: string; email: string; department?: { name: string; color: string } | null };
  leaveType?: { id: string; key: string; label: string; emoji: string; color: string } | null;
}

const FILTERS: { key: string; labelKey: MessageKey; icon: React.ElementType; tone: string; bg: string }[] = [
  { key: "all",      labelKey: "status.all",      icon: ListFilter,  tone: "var(--brand)", bg: "var(--brand-soft)" },
  { key: "pending",  labelKey: "status.pending",  icon: Clock,       tone: "var(--warn)",  bg: "var(--warn-bg)"   },
  { key: "approved", labelKey: "status.approved", icon: CheckCircle, tone: "var(--ok)",    bg: "var(--ok-bg)"     },
  { key: "rejected", labelKey: "status.rejected", icon: XCircle,     tone: "var(--err)",   bg: "var(--err-bg)"    },
];

export default function AdminRequestsPage() {
  usePageTitle("nav.requests");
  const t = useT();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/requests");
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Reset to first page whenever the filter changes
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
  const pageStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd   = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-7">
      {/* ── Header ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--ink-mute)" }}>
          {t("req.label")}
        </p>
        <h1 className="text-[34px] leading-none font-black tracking-tight mt-1.5" style={{ color: "var(--ink)" }}>
          {t("req.title")}
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--ink-soft)" }}>
          {t("req.subtitle", { count: requests.length })}
          {counts.pending > 0 && (
            <>
              {" · "}
              <span className="font-semibold" style={{ color: "var(--warn)" }}>
                {t("req.awaitingNote", { count: counts.pending })}
              </span>
            </>
          )}
        </p>
      </div>

      {/* ── Filter tabs (pill row) ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(({ key, labelKey, icon: Icon, tone, bg }) => {
          const isActive = filter === key;
          const count = counts[key as keyof typeof counts];
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-all duration-200 active:scale-[0.97]"
              style={
                isActive
                  ? {
                      background: bg,
                      color: tone,
                      boxShadow: `0 4px 14px -4px color-mix(in oklab, ${tone} 45%, transparent)`,
                    }
                  : {
                      background: "var(--surface-2)",
                      color: "var(--ink-soft)",
                      boxShadow: "var(--soft-1)",
                    }
              }
            >
              <Icon size={13} className="opacity-90" />
              {t(labelKey)}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md min-w-[18px] text-center font-extrabold leading-none"
                style={
                  isActive
                    ? { background: "color-mix(in oklab, white 45%, transparent)", color: tone }
                    : { background: "var(--surface)", color: "var(--ink-mute)" }
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="py-24 text-center">
          <div
            className="inline-block w-7 h-7 border-[2.5px] rounded-full animate-spin"
            style={{ borderColor: "var(--brand-soft)", borderTopColor: "var(--brand)" }}
          />
          <p className="text-sm mt-3" style={{ color: "var(--ink-mute)" }}>Loading requests…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
          >
            <Inbox size={26} style={{ color: "var(--ink-mute)" }} />
          </div>
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            {t("req.empty.title", { filter: filter === "all" ? "" : t(`status.${filter}` as MessageKey) })}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--ink-mute)" }}>
            {filter === "pending" ? t("req.empty.pending") : t("req.empty.sub")}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {pageItems.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                showUser
                isAdmin={r.status === "pending"}
                onUpdate={fetchRequests}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
            <p className="text-[11px]" style={{ color: "var(--ink-mute)" }}>
              {t("req.showing", { start: pageStart, end: pageEnd, total: filtered.length })}
            </p>
            <Paginator page={safePage} pageCount={pageCount} onPage={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
