"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/lib/i18n/context";

interface UserOption {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  lastSeenAt?: string | null;
}

const ONLINE_WINDOW_MS = 90_000;

interface ConflictMap {
  [userId: string]: { kind: "meeting" | "timeoff"; label: string }[];
}

export function AttendeePicker({
  selected,
  onChange,
  excludeUserIds = [],
  conflicts = {},
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  excludeUserIds?: string[];
  conflicts?: ConflictMap;
}) {
  const t = useT();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: UserOption[]) => setUsers(Array.isArray(list) ? list : []))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const excludeSet = useMemo(() => new Set(excludeUserIds), [excludeUserIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (excludeSet.has(u.id)) return false;
      if (selectedSet.has(u.id)) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.jobTitle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [users, query, selectedSet, excludeSet]);

  const selectedUsers = users.filter((u) => selectedSet.has(u.id));

  function add(id: string) {
    onChange([...selected, id]);
    setQuery("");
  }
  function remove(id: string) {
    onChange(selected.filter((s) => s !== id));
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-2xl"
        style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
      >
        {selectedUsers.map((u) => {
          const userConflicts = conflicts[u.id];
          const hasConflict = !!userConflicts && userConflicts.length > 0;
          return (
            <span
              key={u.id}
              className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full text-[12px] font-bold"
              style={{
                background: hasConflict ? "var(--warn-bg)" : "var(--surface-2)",
                color: hasConflict ? "var(--warn)" : "var(--ink)",
                boxShadow: "var(--soft-press-sm)",
              }}
              title={hasConflict ? userConflicts.map((c) => c.label).join(", ") : undefined}
            >
              <Avatar name={u.name} size={20} className="rounded-full shrink-0" imageUrl={u.avatarUrl} />
              {u.name.split(" ")[0]}
              <button
                type="button"
                onClick={() => remove(u.id)}
                aria-label={t("btn.remove")}
                className="rounded-full p-0.5 hover:bg-[var(--ink-faint)]/20"
              >
                <X size={11} />
              </button>
            </span>
          );
        })}

        <div className="relative flex-1 min-w-[140px]">
          <Search
            size={13}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--ink-faint)" }}
          />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={selectedUsers.length === 0 ? t("meetings.field.attendees.placeholder") : ""}
            className="w-full bg-transparent text-sm outline-none pl-6 py-1"
            style={{ color: "var(--ink)" }}
          />
        </div>
      </div>

      {open && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0 mt-1 max-h-72 overflow-auto rounded-2xl z-20"
          style={{ background: "var(--surface-2)", boxShadow: "var(--soft-2)" }}
        >
          {filtered.slice(0, 30).map((u) => {
            const online = u.lastSeenAt
              ? now - new Date(u.lastSeenAt).getTime() < ONLINE_WINDOW_MS
              : false;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => add(u.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[color:var(--surface)] transition-colors"
              >
                <div className="relative shrink-0">
                  <Avatar name={u.name} size={28} className="rounded-full" imageUrl={u.avatarUrl} />
                  {online && (
                    <span
                      className="absolute bottom-0 right-0 block w-2 h-2 rounded-full"
                      style={{ background: "#10b981", boxShadow: "0 0 0 2px var(--surface-2)" }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold truncate" style={{ color: "var(--ink)" }}>{u.name}</p>
                  <p className="text-[11px] truncate" style={{ color: "var(--ink-mute)" }}>
                    {u.jobTitle ? `${u.jobTitle} · ${u.email}` : u.email}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
