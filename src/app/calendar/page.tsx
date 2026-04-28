"use client";
import { TeamCalendar } from "@/components/TeamCalendar";
import { useT } from "@/lib/i18n/context";

export default function CalendarPage() {
  const t = useT();
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-mute)" }}>
          {t("nav.calendar")}
        </p>
        <h1 className="text-3xl font-black tracking-tight mt-1" style={{ color: "var(--ink)" }}>
          {t("cal.title")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          {t("cal.subtitle")}
        </p>
      </div>
      <div className="rounded-3xl p-5" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
        <TeamCalendar />
      </div>
    </div>
  );
}
