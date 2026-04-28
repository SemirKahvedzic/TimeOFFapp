"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginatorProps {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}

export function Paginator({ page, pageCount, onPage }: PaginatorProps) {
  if (pageCount <= 1) return null;

  const pages = pageRange(page, pageCount);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1.5 mt-6 flex-wrap"
    >
      <PageBtn disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
        <ChevronLeft size={14} />
      </PageBtn>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-xs" style={{ color: "var(--ink-faint)" }}>
            ···
          </span>
        ) : (
          <PageBtn key={p} active={p === page} onClick={() => onPage(p)}>
            {p}
          </PageBtn>
        )
      )}
      <PageBtn disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page">
        <ChevronRight size={14} />
      </PageBtn>
    </nav>
  );
}

function PageBtn({
  children, onClick, active, disabled, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="min-w-[34px] h-[34px] px-2.5 rounded-full text-[12px] font-bold inline-flex items-center justify-center transition-all duration-150 active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed"
      style={
        active
          ? {
              background: "linear-gradient(135deg, var(--brand), var(--accent))",
              color: "white",
              boxShadow: "var(--glow-brand)",
            }
          : {
              background: "var(--surface-2)",
              color: "var(--ink-soft)",
              boxShadow: "var(--soft-1)",
            }
      }
      {...rest}
    >
      {children}
    </button>
  );
}

/** Returns a windowed list of page numbers with `"…"` markers, e.g. [1, "…", 4, 5, 6, "…", 12]. */
function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}
