"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Thermometer, BriefcaseMedical, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";

type Status = "present" | "sick" | "absent";

const OPTIONS: {
  value: Status;
  labelKey: MessageKey;
  subKey: MessageKey;
  icon: React.ReactNode;
  color: string;
}[] = [
  { value: "present", labelKey: "att.present", subKey: "att.present.sub", icon: <CheckCircle2 size={20} />,    color: "#10b981" },
  { value: "sick",    labelKey: "att.sick",    subKey: "att.sick.sub",    icon: <Thermometer size={20} />,     color: "#f59e0b" },
  { value: "absent",  labelKey: "att.absent",  subKey: "att.absent.sub",  icon: <BriefcaseMedical size={20} />,color: "#ef4444" },
];

export function AttendanceWidget() {
  const t = useT();
  const today = format(new Date(), "yyyy-MM-dd");
  const [marked, setMarked] = useState<Status | null>(null);
  const [loading, setLoading] = useState<Status | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/attendance");
        if (!res.ok) return;
        const records: { date: string; status: Status }[] = await res.json();
        const todayRecord = records.find((r) => r.date.slice(0, 10) === today);
        if (!cancelled && todayRecord) setMarked(todayRecord.status);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [today]);

  async function mark(status: Status) {
    setLoading(status);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMarked(status);
      toast.success(t(`att.${status}` as MessageKey));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  }

  if (!hydrated) {
    return (
      <div
        className="rounded-3xl p-5 h-[116px] animate-pulse"
        style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}
      />
    );
  }

  if (marked) {
    const opt = OPTIONS.find((o) => o.value === marked)!;
    return (
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-3xl"
        style={{
          background: `color-mix(in oklab, ${opt.color} 14%, var(--surface-2))`,
          boxShadow: "var(--soft-1)",
        }}
      >
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
          style={{ background: opt.color, boxShadow: `0 8px 22px -6px ${opt.color}66` }}
        >
          {opt.icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-extrabold" style={{ color: opt.color }}>
            {opt.value === "present" ? t("att.checkedIn") : opt.value === "sick" ? t("att.feelBetter") : t("att.dayOff")}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-mute)" }}>
            {format(new Date(), "EEEE, MMM d")}
          </p>
        </div>
        <button
          onClick={() => setMarked(null)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
          style={{ background: "var(--surface)", color: "var(--ink-soft)", boxShadow: "var(--soft-press-sm)" }}
        >
          <RefreshCw size={11} /> {t("att.change")}
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl p-5"
      style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-mute)" }}>
          {t("att.title")}
        </p>
        <p className="text-[11px] font-medium" style={{ color: "var(--ink-mute)" }}>
          {format(new Date(), "EEEE, MMM d")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => mark(opt.value)}
            disabled={!!loading}
            className="flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{
              background: "var(--surface)",
              boxShadow: "var(--soft-press-sm)",
              color: opt.color,
            }}
          >
            {loading === opt.value ? (
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              opt.icon
            )}
            <div className="text-center">
              <p className="text-xs font-extrabold leading-tight">{t(opt.labelKey)}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-mute)" }}>{t(opt.subKey)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
