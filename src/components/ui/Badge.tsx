"use client";
import { cn } from "@/lib/utils";

interface BadgeProps {
  status: string;
  className?: string;
}

const TONES: Record<string, { bg: string; ink: string; dot: string; label: string }> = {
  approved: { bg: "var(--ok-bg)",   ink: "var(--ok)",   dot: "var(--ok)",   label: "Approved" },
  rejected: { bg: "var(--err-bg)",  ink: "var(--err)",  dot: "var(--err)",  label: "Rejected" },
  pending:  { bg: "var(--warn-bg)", ink: "var(--warn)", dot: "var(--warn)", label: "Pending"  },
};

export function Badge({ status, className = "" }: BadgeProps) {
  const tone = TONES[status] ?? TONES.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold",
        className
      )}
      style={{ background: tone.bg, color: tone.ink }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
      {tone.label}
    </span>
  );
}

/** Tone-controlled colored pill, useful for leave types & departments. */
export function Pill({
  label,
  color,
  icon,
  className = "",
}: {
  label: string;
  color: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
        className
      )}
      style={{
        color,
        background: `color-mix(in oklab, ${color} 14%, transparent)`,
      }}
    >
      {icon}
      {label}
    </span>
  );
}
