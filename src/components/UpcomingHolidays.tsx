"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { PartyPopper, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface Holiday {
  id: string;
  name: string;
  date: string;
  source: string;
}

export function UpcomingHolidays() {
  const t = useT();
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  useEffect(() => {
    const year = new Date().getFullYear();
    fetch(`/api/holidays?year=${year}`)
      .then((r) => r.json())
      .then((data) => setHolidays(Array.isArray(data) ? data : []));
  }, []);

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const upcoming = holidays
    .filter((h) => h.date.slice(0, 10) >= todayKey)
    .slice(0, 4);

  if (!upcoming.length) return null;

  return (
    <div
      className="rounded-3xl p-5"
      style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <PartyPopper size={14} style={{ color: "var(--accent)" }} />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-mute)" }}>
          {t("holidays.upcoming")}
        </p>
      </div>
      <div className="space-y-2">
        {upcoming.map((h) => {
          const date = new Date(h.date);
          return (
            <div
              key={h.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
              style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white shrink-0"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--brand))" }}
              >
                <span className="text-[8px] font-bold uppercase leading-none">{format(date, "MMM")}</span>
                <span className="text-base font-black leading-none">{format(date, "d")}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{h.name}</p>
                <p className="text-[10px]" style={{ color: "var(--ink-mute)" }}>
                  {format(date, "EEEE")}
                  {h.source === "company" && (
                    <span className="ml-1.5 inline-flex items-center gap-1">
                      <Sparkles size={8} /> {t("holidays.company")}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
