"use client";
import { useState } from "react";
import { Trash2, MapPin, MessageSquare, Users, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar } from "@/components/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MeetingForm } from "./MeetingForm";
import { formatInCompanyTz } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

export interface MeetingDto {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  organizer: { id: string; name: string; avatarUrl: string | null };
  attendees: { user: { id: string; name: string; avatarUrl: string | null } }[];
}

interface Props {
  meeting: MeetingDto;
  currentUserId: string;
  isAdmin: boolean;
  timeZone: string;
  onUpdate: () => void;
}

export function MeetingCard({ meeting, currentUserId, isAdmin, timeZone, onUpdate }: Props) {
  const t = useT();
  const [showCancel, setShowCancel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOrganizer = meeting.organizer.id === currentUserId;
  const canModify = isOrganizer || isAdmin;
  const isCancelled = meeting.status === "cancelled";

  const start = new Date(meeting.startsAt);
  const end   = new Date(meeting.endsAt);
  const dayLabel = formatInCompanyTz(start, timeZone, { weekday: "short", month: "short", day: "numeric" });
  const timeLabel = `${formatInCompanyTz(start, timeZone, { hour: "2-digit", minute: "2-digit", hour12: false })}–${formatInCompanyTz(end, timeZone, { hour: "2-digit", minute: "2-digit", hour12: false })}`;

  async function cancel() {
    setBusy(true);
    setShowCancel(false);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(t("meetings.toast.cancelled"));
      onUpdate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("meetings.toast.failed"));
    } finally {
      setBusy(false);
    }
  }

  const totalPeople = meeting.attendees.length + 1; // +1 for organizer

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-[1px]"
        style={{
          background: "var(--surface-2)",
          boxShadow: "var(--soft-1)",
          opacity: isCancelled ? 0.6 : 1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--soft-2)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--soft-1)"; }}
      >
        <div className="flex gap-3 sm:gap-4 p-4">
          <div
            className="flex flex-col items-center justify-center shrink-0 rounded-2xl px-3 py-2 min-w-[72px]"
            style={{
              background: isCancelled ? "var(--surface)" : "linear-gradient(135deg, var(--brand), var(--accent))",
              color: isCancelled ? "var(--ink-mute)" : "white",
              boxShadow: isCancelled ? "var(--soft-press-sm)" : "var(--glow-brand)",
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ opacity: 0.85 }}>
              {dayLabel.split(",")[0]}
            </span>
            <span className="text-xl font-black leading-none mt-0.5">
              {formatInCompanyTz(start, timeZone, { day: "2-digit" })}
            </span>
            <span className="text-[10px] font-bold mt-1" style={{ opacity: 0.85 }}>
              {timeLabel}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3
                  className="text-[15px] font-extrabold tracking-tight leading-tight"
                  style={{
                    color: "var(--ink)",
                    textDecoration: isCancelled ? "line-through" : undefined,
                  }}
                >
                  {meeting.title}
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
                  {dayLabel} · {timeZone}
                  {isCancelled && (
                    <span className="ml-2 font-bold uppercase tracking-wider text-[10px]" style={{ color: "var(--err)" }}>
                      · {t("meetings.cancelled")}
                    </span>
                  )}
                </p>
              </div>

              {canModify && !isCancelled && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowEdit(true)}
                    aria-label={t("btn.edit")}
                    title={t("btn.edit")}
                    className="p-1.5 rounded-lg transition-all duration-150 hover:bg-[var(--brand-soft)] hover:text-[color:var(--brand)]"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCancel(true)}
                    disabled={busy}
                    aria-label={t("meetings.cancel.action")}
                    title={t("meetings.cancel.action")}
                    className="p-1.5 rounded-lg transition-all duration-150 hover:bg-[var(--err-bg)] hover:text-[color:var(--err)]"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {meeting.location && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mt-2 text-[12px] font-semibold"
                style={{ background: "var(--surface)", color: "var(--ink-soft)" }}
              >
                <MapPin size={11} style={{ color: "var(--ink-mute)" }} />
                <span className="truncate max-w-[260px]">{meeting.location}</span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-2.5">
              <Users size={12} style={{ color: "var(--ink-mute)" }} />
              <div className="flex -space-x-2">
                <Avatar
                  name={meeting.organizer.name}
                  size={22}
                  className="rounded-full ring-2 ring-[color:var(--surface-2)]"
                  imageUrl={meeting.organizer.avatarUrl}
                />
                {meeting.attendees.slice(0, 5).map((a) => (
                  <Avatar
                    key={a.user.id}
                    name={a.user.name}
                    size={22}
                    className="rounded-full ring-2 ring-[color:var(--surface-2)]"
                    imageUrl={a.user.avatarUrl}
                  />
                ))}
              </div>
              <span className="text-[11px]" style={{ color: "var(--ink-mute)" }}>
                {totalPeople === 1
                  ? t("meetings.peopleCount.one", { count: totalPeople })
                  : t("meetings.peopleCount.many", { count: totalPeople })}
              </span>
            </div>

            {meeting.description && (
              <div className="mt-2.5 flex items-start gap-2">
                <MessageSquare size={11} className="mt-0.5 shrink-0" style={{ color: "var(--ink-faint)" }} />
                <p className="text-[12px] italic leading-relaxed" style={{ color: "var(--ink-mute)" }}>
                  {meeting.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title={t("meetings.cancel.title")}
        subtitle={t("meetings.cancel.body", { title: meeting.title })}
        size="sm"
      >
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setShowCancel(false)}>{t("btn.cancel")}</Button>
          <Button variant="danger" className="flex-1" onClick={cancel}>{t("meetings.cancel.confirm")}</Button>
        </div>
      </Modal>

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title={t("meetings.edit.title")}
        size="md"
      >
        <MeetingForm
          timeZone={timeZone}
          initial={{
            id: meeting.id,
            title: meeting.title,
            description: meeting.description,
            location: meeting.location,
            startsAt: meeting.startsAt,
            endsAt: meeting.endsAt,
            attendees: meeting.attendees,
          }}
          onSuccess={() => { setShowEdit(false); onUpdate(); }}
        />
      </Modal>
    </>
  );
}
