"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarPlus, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { Input, FieldLabel } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AttendeePicker } from "./AttendeePicker";
import { tzWallClockToUtc, utcToTzWallClock } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

interface MeetingFormProps {
  timeZone: string;
  initial?: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    startsAt: string;
    endsAt: string;
    attendees: { user: { id: string; name: string } }[];
  };
  /** When creating, prefill the date to this YYYY-MM-DD (e.g. selected from a calendar). Time defaults to 10:00 company-tz. */
  defaultDate?: string;
  onSuccess: () => void;
}

interface Conflict {
  userId: string;
  kind: "meeting" | "timeoff";
  label: string;
}

export function MeetingForm({ timeZone, initial, defaultDate, onSuccess }: MeetingFormProps) {
  const t = useT();
  const { data: session } = useSession();
  const [title, setTitle]             = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [location, setLocation]       = useState(initial?.location ?? "");

  const [startWall, setStartWall] = useState(() => {
    if (initial?.startsAt) return utcToTzWallClock(new Date(initial.startsAt), timeZone);
    if (defaultDate) return `${defaultDate}T10:00`;
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30 - (now.getMinutes() % 30), 0, 0);
    return utcToTzWallClock(now, timeZone);
  });
  const [endWall, setEndWall] = useState(() => {
    if (initial?.endsAt) return utcToTzWallClock(new Date(initial.endsAt), timeZone);
    if (defaultDate) return `${defaultDate}T11:00`;
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30 - (now.getMinutes() % 30), 0, 0);
    return utcToTzWallClock(new Date(now.getTime() + 60 * 60_000), timeZone);
  });
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    initial?.attendees.map((a) => a.user.id) ?? [],
  );
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [saving, setSaving] = useState(false);

  // Live conflict scan (debounced). When attendeeIds is empty, we don't fetch
  // and the visibleConflicts derivation below masks any stale results.
  useEffect(() => {
    if (attendeeIds.length === 0) return;
    if (!startWall || !endWall) return;
    const startUtc = tzWallClockToUtc(startWall, timeZone);
    const endUtc   = tzWallClockToUtc(endWall, timeZone);
    if (endUtc <= startUtc) return;

    const handle = setTimeout(() => {
      fetch("/api/meetings/conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: startUtc.toISOString(),
          endsAt:   endUtc.toISOString(),
          userIds:  attendeeIds,
          excludeMeetingId: initial?.id,
        }),
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((list: Conflict[]) => setConflicts(Array.isArray(list) ? list : []))
        .catch(() => setConflicts([]));
    }, 400);
    return () => clearTimeout(handle);
  }, [attendeeIds, startWall, endWall, timeZone, initial?.id]);

  const visibleConflicts = useMemo<Conflict[]>(
    () => (attendeeIds.length === 0 ? [] : conflicts),
    [attendeeIds.length, conflicts],
  );

  const conflictMap = useMemo(() => {
    const map: Record<string, { kind: "meeting" | "timeoff"; label: string }[]> = {};
    for (const c of visibleConflicts) {
      (map[c.userId] = map[c.userId] ?? []).push({ kind: c.kind, label: c.label });
    }
    return map;
  }, [visibleConflicts]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || attendeeIds.length === 0) {
      toast.error(t("meetings.toast.required"));
      return;
    }

    const startUtc = tzWallClockToUtc(startWall, timeZone);
    const endUtc   = tzWallClockToUtc(endWall, timeZone);
    if (endUtc <= startUtc) {
      toast.error(t("meetings.toast.endAfterStart"));
      return;
    }

    setSaving(true);
    try {
      const url = initial ? `/api/meetings/${initial.id}` : "/api/meetings";
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          location:    location.trim()    || null,
          startsAt: startUtc.toISOString(),
          endsAt:   endUtc.toISOString(),
          attendeeIds,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(initial ? t("meetings.toast.updated") : t("meetings.toast.created"));
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("meetings.toast.failed"));
    } finally {
      setSaving(false);
    }
  }

  const conflictCount = visibleConflicts.length;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <FieldLabel>{t("meetings.field.title")}</FieldLabel>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={140} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel>{t("meetings.field.startsAt")}</FieldLabel>
          <Input
            type="datetime-local"
            value={startWall}
            onChange={(e) => setStartWall(e.target.value)}
            required
          />
        </div>
        <div>
          <FieldLabel>{t("meetings.field.endsAt")}</FieldLabel>
          <Input
            type="datetime-local"
            value={endWall}
            onChange={(e) => setEndWall(e.target.value)}
            required
          />
        </div>
      </div>
      <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
        {t("meetings.field.tzHint", { tz: timeZone })}
      </p>

      <div>
        <FieldLabel>{t("meetings.field.location")} <span style={{ color: "var(--ink-faint)" }}>· {t("common.optional")}</span></FieldLabel>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("meetings.field.locationPlaceholder")} maxLength={200} />
      </div>

      <div>
        <FieldLabel>{t("meetings.field.attendees")}</FieldLabel>
        <AttendeePicker
          selected={attendeeIds}
          onChange={setAttendeeIds}
          excludeUserIds={session?.user?.id ? [session.user.id] : []}
          conflicts={conflictMap}
        />
      </div>

      {conflictCount > 0 && (
        <div
          className="flex items-start gap-2.5 px-3 py-2.5 rounded-2xl"
          style={{ background: "var(--warn-bg)" }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: "var(--warn)" }} />
          <div className="text-[12px]" style={{ color: "var(--warn)" }}>
            <p className="font-bold">{t("meetings.conflict.heading", { count: conflictCount })}</p>
            <p style={{ color: "var(--ink-soft)" }}>{t("meetings.conflict.note")}</p>
          </div>
        </div>
      )}

      <div>
        <FieldLabel>{t("meetings.field.description")} <span style={{ color: "var(--ink-faint)" }}>· {t("common.optional")}</span></FieldLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full text-sm rounded-2xl px-4 py-3 outline-none resize-none"
          style={{
            background: "var(--surface)",
            color: "var(--ink)",
            boxShadow: "var(--soft-press-sm)",
          }}
        />
      </div>

      <Button type="submit" loading={saving} className="w-full" size="lg">
        <CalendarPlus size={15} />
        {initial ? t("btn.save") : t("meetings.create")}
      </Button>
    </form>
  );
}
