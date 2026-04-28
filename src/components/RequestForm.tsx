"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "./ui/Button";
import { Input, Textarea, FieldLabel } from "./ui/Input";
import toast from "react-hot-toast";
import { useT } from "@/lib/i18n/context";

interface RequestFormProps {
  onSuccess: () => void;
  initialStart?: string;
  initialEnd?: string;
}

interface LeaveType {
  id: string;
  key: string;
  label: string;
  emoji: string;
  color: string;
  paid: boolean;
}

export function RequestForm({ onSuccess, initialStart, initialEnd }: RequestFormProps) {
  const t = useT();
  const today = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(initialStart ?? today);
  const [endDate,   setEndDate]   = useState(initialEnd ?? initialStart ?? today);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [halfDayStart, setHalfDayStart] = useState(false);
  const [halfDayEnd,   setHalfDayEnd]   = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/leave-types")
      .then((r) => r.json())
      .then((data) => {
        setLeaveTypes(data);
        if (data.length && !leaveTypeId) setLeaveTypeId(data[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSingleDay = startDate === endDate;
  const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate, endDate, reason, leaveTypeId,
          halfDayStart, halfDayEnd: isSingleDay ? halfDayStart : halfDayEnd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("form.toast.failed"));
      toast.success(t("form.toast.submitted"));
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("form.toast.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <FieldLabel>{t("form.type")}</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {leaveTypes.map((lt) => {
            const active = lt.id === leaveTypeId;
            return (
              <button
                key={lt.id}
                type="button"
                onClick={() => setLeaveTypeId(lt.id)}
                className="flex flex-col items-center gap-1 px-2 py-3 rounded-2xl text-xs font-semibold transition-all"
                style={
                  active
                    ? {
                        background: `color-mix(in oklab, ${lt.color} 18%, var(--surface))`,
                        boxShadow: `var(--soft-press-sm), inset 0 0 0 2px ${lt.color}`,
                        color: lt.color,
                      }
                    : {
                        background: "var(--surface)",
                        boxShadow: "var(--soft-press-sm)",
                        color: "var(--ink-soft)",
                      }
                }
              >
                <span className="text-lg leading-none">{lt.emoji}</span>
                <span className="leading-tight">{lt.label}</span>
                {!lt.paid && <span className="text-[9px] opacity-60">{t("form.unpaid")}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>{t("form.start")}</FieldLabel>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <FieldLabel>{t("form.end")}</FieldLabel>
          <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
      </div>

      {/* Half-day toggles */}
      <div className="flex items-center gap-2">
        <HalfDayToggle
          checked={halfDayStart}
          onChange={setHalfDayStart}
          label={isSingleDay ? t("form.halfSingle") : t("form.halfFirst")}
          accent={selectedType?.color}
        />
        {!isSingleDay && (
          <HalfDayToggle
            checked={halfDayEnd}
            onChange={setHalfDayEnd}
            label={t("form.halfLast")}
            accent={selectedType?.color}
          />
        )}
      </div>

      <div>
        <FieldLabel hint={t("common.optional")}>{t("form.note")}</FieldLabel>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={t("form.notePlaceholder")}
        />
      </div>

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {t("btn.submit")}
      </Button>
    </form>
  );
}

function HalfDayToggle({
  checked, onChange, label, accent,
}: { checked: boolean; onChange: (b: boolean) => void; label: string; accent?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-2xl text-xs font-semibold transition-all"
      style={
        checked
          ? {
              background: accent ? `color-mix(in oklab, ${accent} 18%, var(--surface))` : "var(--brand-soft)",
              boxShadow: "var(--soft-press-sm)",
              color: accent ?? "var(--brand)",
            }
          : { background: "var(--surface)", boxShadow: "var(--soft-press-sm)", color: "var(--ink-soft)" }
      }
    >
      <span>{label}</span>
      <span
        className="w-8 h-4 rounded-full relative transition-colors"
        style={{
          background: checked ? (accent ?? "var(--brand)") : "var(--ink-faint)",
          opacity: checked ? 1 : 0.4,
        }}
      >
        <span
          className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
          style={{ left: checked ? "calc(100% - 14px)" : "2px" }}
        />
      </span>
    </button>
  );
}
