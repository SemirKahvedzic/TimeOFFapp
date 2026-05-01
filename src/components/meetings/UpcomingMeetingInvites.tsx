"use client";
import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check, X, MapPin, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar } from "@/components/Avatar";
import { formatInCompanyTz } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

interface MeetingInvite {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  organizer: { id: string; name: string; avatarUrl: string | null };
  attendees: { user: { id: string; name: string; avatarUrl: string | null } }[];
}

export function UpcomingMeetingInvites() {
  const t = useT();
  const [invites, setInvites] = useState<MeetingInvite[]>([]);
  const [timeZone, setTimeZone] = useState<string>("UTC");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/meetings?scope=invites");
      if (res.ok) setInvites(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  useEffect(() => {
    fetch("/api/company")
      .then((r) => (r.ok ? r.json() : null))
      .then((c: { timeZone?: string } | null) => { if (c?.timeZone) setTimeZone(c.timeZone); })
      .catch(() => {});
  }, []);

  async function respond(meetingId: string, status: "accepted" | "declined") {
    setBusyId(meetingId);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(status === "accepted" ? t("invites.toast.accepted") : t("invites.toast.declined"));
      fetchInvites();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("invites.toast.failed"));
    } finally {
      setBusyId(null);
    }
  }

  if (loading || invites.length === 0) return null;

  return (
    <div
      className="rounded-3xl"
      style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}
    >
      <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, var(--brand), var(--accent))" }}
          >
            <CalendarClock size={14} />
          </div>
          <h2 className="text-sm font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
            {t("invites.title")}
          </h2>
        </div>
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
        >
          {t("invites.pendingCount", { count: invites.length })}
        </span>
      </div>

      <div className="px-3 pb-4 space-y-2.5">
        {invites.map((m) => {
          const dayLabel = formatInCompanyTz(new Date(m.startsAt), timeZone, { weekday: "short", month: "short", day: "numeric" });
          const startTime = formatInCompanyTz(new Date(m.startsAt), timeZone, { hour: "2-digit", minute: "2-digit", hour12: false });
          const endTime = formatInCompanyTz(new Date(m.endsAt), timeZone, { hour: "2-digit", minute: "2-digit", hour12: false });
          const totalPeople = m.attendees.length + 1;
          const busy = busyId === m.id;
          return (
            <div
              key={m.id}
              className="rounded-2xl p-3.5"
              style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
            >
              <div className="flex items-start gap-3">
                <Avatar
                  name={m.organizer.name}
                  size={36}
                  className="rounded-full shrink-0"
                  imageUrl={m.organizer.avatarUrl}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold leading-tight" style={{ color: "var(--ink)" }}>
                    {m.title}
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
                    {t("invites.from", { name: m.organizer.name })} · {dayLabel} · {startTime}–{endTime} ({timeZone})
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {m.location && (
                      <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--ink-soft)" }}>
                        <MapPin size={11} style={{ color: "var(--ink-faint)" }} />
                        <span className="truncate max-w-[200px]">{m.location}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--ink-soft)" }}>
                      <Users size={11} style={{ color: "var(--ink-faint)" }} />
                      {t("invites.peopleCount", { count: totalPeople })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => respond(m.id, "accepted")}
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all duration-150 active:scale-[0.97] disabled:opacity-60"
                  style={{
                    background: "var(--ok)",
                    boxShadow: "0 6px 16px -6px color-mix(in oklab, var(--ok) 60%, transparent)",
                  }}
                >
                  <Check size={13} />
                  {t("btn.accept")}
                </button>
                <button
                  type="button"
                  onClick={() => respond(m.id, "declined")}
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-[0.97] disabled:opacity-60 hover:bg-[var(--err-bg)]"
                  style={{
                    color: "var(--err)",
                    background: "transparent",
                    border: "1.5px solid color-mix(in oklab, var(--err) 35%, transparent)",
                  }}
                >
                  <X size={13} />
                  {t("btn.decline")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
