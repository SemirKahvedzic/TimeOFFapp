import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("relative rounded-[26px] overflow-hidden", className)}
      style={{
        background: "var(--surface-2)",
        boxShadow: "var(--soft-1)",
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("px-6 pt-5 pb-3 flex items-center justify-between gap-3", className)}
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
}

/** A pillowy soft card with deeper shadow — used for hero/highlighted content. */
export function SoftCard({
  children,
  className = "",
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn("relative rounded-[28px] overflow-hidden", glow && "brand-glow", className)}
      style={{
        background: "var(--surface)",
        boxShadow: glow ? "var(--glow-brand), var(--soft-2)" : "var(--soft-2)",
      }}
    >
      {children}
    </div>
  );
}

/** Inset/recessed card — feels carved into the surface. Great for empty states. */
export function InsetCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("relative rounded-2xl", className)}
      style={{
        background: "var(--surface)",
        boxShadow: "var(--soft-press)",
      }}
    >
      {children}
    </div>
  );
}

/** Decorative card-section divider with brand-tinted glow cap. */
export function CardCap() {
  return <div className="brand-cap pointer-events-none" />;
}
