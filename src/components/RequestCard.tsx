"use client";
import { useState } from "react";
import { Calendar, Trash2, MessageSquare, CheckCircle, XCircle, AlertTriangle, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { formatDateRange, daysBetween, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";

interface Request {
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
  user?: { name: string; email: string; department?: { name: string; color: string } | null };
  leaveType?: { id: string; key: string; label: string; emoji: string; color: string } | null;
}

interface RequestCardProps {
  request: Request;
  showUser?: boolean;
  isAdmin?: boolean;
  onUpdate: () => void;
}

const FALLBACK_TYPE = { label: "Vacation", emoji: "🌴", color: "#10b981" };

const STATUS_CONFIG: Record<string, { labelKey: MessageKey; tone: string; bg: string }> = {
  approved: { labelKey: "status.approved", tone: "var(--ok)",   bg: "var(--ok-bg)"   },
  rejected: { labelKey: "status.rejected", tone: "var(--err)",  bg: "var(--err-bg)"  },
  pending:  { labelKey: "status.awaiting", tone: "var(--warn)", bg: "var(--warn-bg)" },
};

export function RequestCard({ request, showUser, isAdmin, onUpdate }: RequestCardProps) {
  const t = useT();
  const [loading, setLoading] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const days = daysBetween(request.startDate, request.endDate);
  const halfDayCount = (request.halfDayStart ? 0.5 : 0) + (request.halfDayEnd && days > 1 ? 0.5 : 0);
  const totalDays = (request.halfDayStart && request.halfDayEnd && days === 1) ? 0.5 : days - halfDayCount;
  const type = request.leaveType ?? FALLBACK_TYPE;
  const status = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
  const isPending = request.status === "pending";

  async function approve() {
    setLoading("approve");
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("card.toast.approved"));
      onUpdate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("card.toast.failed"));
    } finally {
      setLoading(null);
    }
  }

  async function doDelete() {
    setLoading("delete");
    setShowDelete(false);
    try {
      const res = await fetch(`/api/requests/${request.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("card.toast.deleted"));
      onUpdate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("card.toast.failed"));
    } finally {
      setLoading(null);
    }
  }

  async function doReject() {
    setLoading("reject");
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", rejectionReason: rejectNote.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("card.toast.rejected"));
      setShowReject(false);
      setRejectNote("");
      onUpdate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("card.toast.failed"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div
        className={cn(
          "group relative rounded-2xl overflow-hidden transition-all duration-200",
          "hover:-translate-y-[1px]",
          request.status === "rejected" && "opacity-75"
        )}
        style={{
          background: "var(--surface-2)",
          boxShadow: "var(--soft-1)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--soft-2)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--soft-1)"; }}
      >
        {/* Status-coloured left border */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: status.tone }}
        />

        <div className="pl-6 pr-5 py-4">
          {/* ── Top row: identity + actions ─────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              {/* Type avatar — small + soft */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{
                  background: `color-mix(in oklab, ${type.color} 14%, var(--surface))`,
                }}
                title={type.label}
              >
                {type.emoji}
              </div>

              <div className="min-w-0">
                {showUser && request.user ? (
                  <>
                    <h3
                      className="text-[15px] font-extrabold tracking-tight leading-tight truncate"
                      style={{ color: "var(--ink)" }}
                    >
                      {request.user.name}
                    </h3>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--ink-mute)" }}>
                      {request.user.department?.name ?? "—"}
                      {" · "}{type.label}
                    </p>
                  </>
                ) : (
                  <>
                    <h3
                      className="text-[15px] font-extrabold tracking-tight leading-tight"
                      style={{ color: "var(--ink)" }}
                    >
                      {type.label}
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
                      Submitted {new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Actions — top-right */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isAdmin && isPending && (
                <>
                  <button
                    onClick={approve}
                    disabled={!!loading}
                    aria-label={t("btn.approve")}
                    title={t("btn.approve")}
                    className="inline-flex items-center sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold text-white transition-all duration-150 active:scale-[0.97] disabled:opacity-60"
                    style={{
                      background: "var(--ok)",
                      boxShadow: "0 6px 16px -6px color-mix(in oklab, var(--ok) 60%, transparent)",
                    }}
                  >
                    {loading === "approve"
                      ? <span className="w-3.5 h-3.5 sm:w-3 sm:h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Check size={14} className="sm:w-[13px] sm:h-[13px]" />}
                    <span className="hidden sm:inline">{t("btn.approve")}</span>
                  </button>
                  <button
                    onClick={() => setShowReject(true)}
                    disabled={!!loading}
                    aria-label={t("btn.reject")}
                    title={t("btn.reject")}
                    className="inline-flex items-center sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold transition-all duration-150 active:scale-[0.97] disabled:opacity-60 hover:bg-[var(--err-bg)]"
                    style={{
                      color: "var(--err)",
                      background: "transparent",
                      border: "1.5px solid color-mix(in oklab, var(--err) 35%, transparent)",
                    }}
                  >
                    <X size={14} className="sm:w-[13px] sm:h-[13px]" />
                    <span className="hidden sm:inline">{t("btn.reject")}</span>
                  </button>
                </>
              )}
              {(!isAdmin || request.status !== "approved") && (
                <button
                  onClick={() => setShowDelete(true)}
                  disabled={!!loading}
                  className="p-1.5 rounded-lg transition-all duration-150 hover:bg-[var(--err-bg)] hover:text-[color:var(--err)]"
                  style={{ color: "var(--ink-faint)" }}
                  aria-label="Delete request"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* ── Status pill (compact) ─────────────────────────── */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
              style={{ background: status.bg, color: status.tone }}
            >
              {request.status === "approved" && <CheckCircle size={10} />}
              {request.status === "rejected" && <XCircle size={10} />}
              {request.status === "pending"  && (
                <span className="relative flex items-center justify-center w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full pulse-dot" style={{ background: status.tone }} />
                  <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: status.tone }} />
                </span>
              )}
              {t(status.labelKey)}
            </span>
            {(request.halfDayStart || request.halfDayEnd) && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{ background: "var(--surface)", color: "var(--ink-mute)" }}
              >
                {t("common.halfDay")}
              </span>
            )}
          </div>

          {/* ── Dates + duration (grouped) ────────────────────── */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: "var(--surface)" }}
            >
              <Calendar size={11} style={{ color: "var(--ink-mute)" }} />
              <span className="text-[12px] font-semibold" style={{ color: "var(--ink-soft)" }}>
                {formatDateRange(request.startDate, request.endDate)}
              </span>
            </div>
            <span
              className="text-[11px] font-extrabold px-2 py-1 rounded-lg"
              style={{
                color: type.color,
                background: `color-mix(in oklab, ${type.color} 14%, transparent)`,
              }}
            >
              {totalDays} {totalDays === 1 ? t("common.day") : t("common.days")}
            </span>
          </div>

          {/* ── Reason ────────────────────────────────────────── */}
          {request.reason && (
            <div className="mt-3 flex items-start gap-2">
              <MessageSquare size={12} className="mt-0.5 shrink-0" style={{ color: "var(--ink-faint)" }} />
              <p
                className="text-[12px] italic leading-relaxed"
                style={{ color: "var(--ink-mute)" }}
              >
                {request.reason}
              </p>
            </div>
          )}

          {/* ── Rejection note ────────────────────────────────── */}
          {request.status === "rejected" && request.rejectionReason && (
            <div
              className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg"
              style={{ background: "var(--err-bg)" }}
            >
              <AlertTriangle size={11} className="mt-0.5 shrink-0" style={{ color: "var(--err)" }} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--err)" }}>
                  {t("card.managerNote")}
                </p>
                <p className="text-[12px] italic mt-0.5" style={{ color: "var(--err)" }}>
                  {request.rejectionReason}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title={t("card.deleteTitle")} size="sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>{t("card.deleteCannotUndo")}</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowDelete(false)}>{t("btn.cancel")}</Button>
            <Button variant="danger" className="flex-1" onClick={doDelete}>{t("card.confirmDelete")}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showReject}
        onClose={() => { setShowReject(false); setRejectNote(""); }}
        title={t("card.rejectTitle")}
        subtitle={t("card.rejectSubtitle")}
      >
        <div className="space-y-4">
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder={t("card.rejectPlaceholder")}
            rows={3}
            className="w-full text-sm rounded-2xl px-4 py-3 outline-none resize-none"
            style={{
              background: "var(--surface)",
              color: "var(--ink)",
              boxShadow: "var(--soft-press-sm)",
            }}
          />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowReject(false); setRejectNote(""); }}>
              {t("btn.cancel")}
            </Button>
            <Button variant="danger" className="flex-1" loading={loading === "reject"} onClick={doReject}>
              {t("card.confirmReject")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
