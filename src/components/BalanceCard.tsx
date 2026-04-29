"use client";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { formatLeaveDays } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

interface Balance {
  id: string;
  year: number;
  allowance: number;
  used: number;
  carriedOver: number;
  leaveType: { id: string; label: string; emoji: string; color: string; paid: boolean };
}

export function BalanceCard() {
  const t = useT();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/balances")
      .then((r) => r.json())
      .then((data) => {
        setBalances(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const visible = balances;

  if (loading) {
    return (
      <div
        className="rounded-3xl p-5"
        style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}
      >
        <p className="text-xs" style={{ color: "var(--ink-mute)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!visible.length) return null;

  return (
    <div
      className="rounded-3xl p-5"
      style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} style={{ color: "var(--brand)" }} />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-mute)" }}>
            {t("balance.label", { year: balances[0]?.year ?? new Date().getFullYear() })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {visible.map((b) => {
          const remaining = Math.max(0, b.allowance + b.carriedOver - b.used);
          const total = b.allowance + b.carriedOver;
          const pct = total === 0 ? 0 : Math.min(100, (b.used / total) * 100);
          return (
            <div
              key={b.id}
              className="rounded-2xl p-3.5 tilt-hover"
              style={{
                background: `linear-gradient(160deg, color-mix(in oklab, ${b.leaveType.color} 14%, var(--surface-2)), var(--surface-2))`,
                boxShadow: "var(--soft-1)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg leading-none">{b.leaveType.emoji}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: b.leaveType.color }}>
                  {b.leaveType.label}
                </span>
              </div>
              <p className="text-2xl font-black tracking-tight" style={{ color: "var(--ink)" }}>
                {formatLeaveDays(remaining)}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
                {t("balance.of")} {formatLeaveDays(total)} · {formatLeaveDays(b.used)} {t("balance.used")}
              </p>
              <div
                className="mt-2.5 h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${b.leaveType.color}, color-mix(in oklab, ${b.leaveType.color} 60%, var(--accent)))`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
