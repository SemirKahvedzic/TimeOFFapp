"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameMonth, isToday, isSameDay, min, max, differenceInCalendarDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarPlus, X, Users, MessageSquare, PartyPopper, LayoutGrid, List as ListIcon, Inbox, Clock, MapPin } from "lucide-react";
import { useSession } from "next-auth/react";
import { Modal } from "./ui/Modal";
import { RequestForm } from "./RequestForm";
import { MeetingForm } from "./meetings/MeetingForm";
import { Button } from "./ui/Button";
import { Pill } from "./ui/Badge";
import { Avatar } from "./Avatar";
import { cn, formatInCompanyTz } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";

const WEEKDAY_KEYS: MessageKey[] = [
  "cal.weekday.sun", "cal.weekday.mon", "cal.weekday.tue", "cal.weekday.wed",
  "cal.weekday.thu", "cal.weekday.fri", "cal.weekday.sat",
];

interface CalendarRequest {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  type: string;
  reason?: string;
  user: { id: string; name: string; avatarUrl?: string | null };
  leaveType?: { id: string; key: string; label: string; emoji: string; color: string } | null;
}

interface CalendarHoliday {
  id: string;
  name: string;
  date: string;
  source: string;
}

interface AttendanceEntry {
  id: string;
  date: string;
  status: string; // "present" | "sick" | "absent"
}

interface CalendarMeeting {
  id: string;
  title: string;
  location: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  organizer: { id: string; name: string };
  attendees: { user: { id: string; name: string } }[];
}

const ATTENDANCE_TONE: Record<string, string> = {
  present: "var(--ok)",
  sick:    "var(--warn)",
  absent:  "var(--err)",
};

function dayStr(d: Date) { return format(d, "yyyy-MM-dd"); }
function isoStr(iso: string) { return iso.slice(0, 10); }

const STATUS_DOT: Record<string, string> = {
  approved: "var(--ok)",
  rejected: "var(--err)",
  pending:  "var(--warn)",
};

interface TeamCalendarProps {
  onRequestCreated?: () => void;
}

type ViewMode = "month" | "list";

export function TeamCalendar({ onRequestCreated }: TeamCalendarProps) {
  const { data: session } = useSession();
  const t = useT();
  const [current, setCurrent] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [requests, setRequests] = useState<CalendarRequest[]>([]);
  const [holidays, setHolidays] = useState<CalendarHoliday[]>([]);
  const [attendances, setAttendances] = useState<AttendanceEntry[]>([]);
  const [meetings, setMeetings]       = useState<CalendarMeeting[]>([]);
  const [timeZone, setTimeZone]       = useState<string>("UTC");
  const [workDays, setWorkDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [anchor,   setAnchor]   = useState<Date | null>(null);
  const [hovered,  setHovered]  = useState<Date | null>(null);
  const [confirmed, setConfirmed] = useState<{ start: Date; end: Date } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const monthKey = format(current, "yyyy-MM");

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/calendar?month=${monthKey}`);
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests ?? []);
      setHolidays(data.holidays ?? []);
      setAttendances(data.attendances ?? []);
      setMeetings(data.meetings ?? []);
      if (typeof data.timeZone === "string") setTimeZone(data.timeZone);
      if (typeof data.workWeek === "string") {
        setWorkDays(new Set(
          data.workWeek
            .split(",")
            .map((s: string) => parseInt(s.trim(), 10))
            .filter((n: number) => !isNaN(n) && n >= 0 && n <= 6),
        ));
      }
    }
  }, [monthKey]);

  function isWorkDay(day: Date) { return workDays.has(day.getDay()); }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (showModal || showMeetingModal) return;
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        clearSelection();
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showModal, showMeetingModal]);

  const days     = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });
  const startPad = getDay(startOfMonth(current));

  const holidayMap = new Map<string, CalendarHoliday>();
  for (const h of holidays) holidayMap.set(isoStr(h.date), h);

  const attendanceMap = new Map<string, AttendanceEntry>();
  for (const a of attendances) attendanceMap.set(isoStr(a.date), a);

  function getRequestsForDay(day: Date) {
    const ds = dayStr(day);
    return requests.filter((r) => ds >= isoStr(r.startDate) && ds <= isoStr(r.endDate));
  }

  function getMeetingsForDay(day: Date): CalendarMeeting[] {
    const ds = dayStr(day);
    return meetings.filter((m) => {
      // Compare by the day (in viewer-local terms) the meeting starts.
      const startDay = m.startsAt.slice(0, 10);
      return startDay === ds;
    });
  }

  const previewRange = isSelecting && anchor && hovered
    ? { start: min([anchor, hovered]), end: max([anchor, hovered]) }
    : null;
  const selRange = confirmed ?? previewRange;

  function inRange(day: Date) {
    if (!selRange) return false;
    const ds = dayStr(day);
    return ds >= dayStr(selRange.start) && ds <= dayStr(selRange.end);
  }
  function isStart(day: Date) { return selRange ? isSameDay(day, selRange.start) : false; }
  function isEnd(day: Date)   { return selRange ? isSameDay(day, selRange.end)   : false; }
  function isSingle()         { return selRange ? isSameDay(selRange.start, selRange.end) : false; }

  function handleDayClick(day: Date) {
    if (!isWorkDay(day)) return; // company has marked this day as a non-working day
    if (!isSelecting) {
      setAnchor(day); setHovered(day); setConfirmed(null); setIsSelecting(true);
    } else {
      setConfirmed({ start: min([anchor!, day]), end: max([anchor!, day]) });
      setIsSelecting(false);
    }
  }

  function clearSelection() {
    setAnchor(null); setHovered(null); setConfirmed(null); setIsSelecting(false);
  }

  const panelRequests = confirmed
    ? requests.filter((r) => isoStr(r.startDate) <= dayStr(confirmed.end) && isoStr(r.endDate) >= dayStr(confirmed.start))
    : [];
  const panelMeetings = confirmed
    ? meetings.filter((m) => {
        const startDay = m.startsAt.slice(0, 10);
        const endDay   = m.endsAt.slice(0, 10);
        return startDay <= dayStr(confirmed.end) && endDay >= dayStr(confirmed.start);
      })
    : [];
  const selTotalDays = confirmed ? differenceInCalendarDays(confirmed.end, confirmed.start) + 1 : 0;
  const selWorkDays = confirmed
    ? eachDayOfInterval({ start: confirmed.start, end: confirmed.end })
        .filter((d) => isWorkDay(d) && !holidayMap.has(dayStr(d))).length
    : 0;

  function switchView(next: ViewMode) {
    if (next === view) return;
    if (next === "list") clearSelection();
    setView(next);
  }

  return (
    <div ref={calendarRef} className="space-y-4" onMouseLeave={() => isSelecting && setHovered(anchor)}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
          {format(current, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 p-1 rounded-full"
            style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
          >
            <ViewBtn active={view === "month"} onClick={() => switchView("month")} icon={<LayoutGrid size={12} />}>
              {t("cal.view.month")}
            </ViewBtn>
            <ViewBtn active={view === "list"} onClick={() => switchView("list")} icon={<ListIcon size={12} />}>
              {t("cal.view.list")}
            </ViewBtn>
          </div>
          <div
            className="flex items-center gap-1 p-1 rounded-full"
            style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
          >
            <NavBtn onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1))}>
              <ChevronLeft size={14} />
            </NavBtn>
            <button
              onClick={() => setCurrent(new Date())}
              className="px-3 py-1 text-[11px] font-bold rounded-full transition-all"
              style={{ color: "var(--ink-soft)" }}
            >
              {t("cal.today")}
            </button>
            <NavBtn onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1))}>
              <ChevronRight size={14} />
            </NavBtn>
          </div>
        </div>
      </div>

      {view === "month" && (
        <p className={cn("text-xs transition-colors")} style={{ color: isSelecting ? "var(--brand)" : "var(--ink-mute)" }}>
          {isSelecting ? t("cal.hint.active") : t("cal.hint.idle")}
        </p>
      )}

      {view === "list" ? (
        <ListView
          current={current}
          requests={requests}
          holidays={holidays}
          workDays={workDays}
          t={t}
        />
      ) : (
        <>
      {/* Weekday headers */}
      <div className="grid grid-cols-7">
        {WEEKDAY_KEYS.map((k, idx) => {
          const isWork = workDays.has(idx);
          return (
            <div
              key={k}
              className="text-center text-[10px] font-bold uppercase tracking-[0.18em] py-2"
              style={{ color: isWork ? "var(--ink-mute)" : "var(--ink-faint)", opacity: isWork ? 1 : 0.55 }}
            >
              {t(k)}
            </div>
          );
        })}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1.5" style={{ cursor: isSelecting ? "crosshair" : "default" }}>
        {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} className="h-[80px]" />)}

        {days.map((day) => {
          const dayReqs = getRequestsForDay(day);
          const dayMeetings = getMeetingsForDay(day);
          const inMonth = isSameMonth(day, current);
          const todayDay = isToday(day);
          const selected = inRange(day);
          const rStart = isStart(day);
          const rEnd   = isEnd(day);
          const single = isSingle();
          const isAnchor = !!(anchor && isSameDay(day, anchor) && isSelecting);
          const holiday = holidayMap.get(dayStr(day));
          const attendance = attendanceMap.get(dayStr(day));
          const workDay = isWorkDay(day);
          const selectable = inMonth && workDay;

          return (
            <div
              key={day.toISOString()}
              className="relative h-[80px]"
              onMouseEnter={() => isSelecting && workDay && setHovered(day)}
              onClick={() => selectable && handleDayClick(day)}
            >
              <div
                className="h-full rounded-2xl px-2 py-1.5 flex flex-col transition-all"
                style={{
                  cursor: selectable ? "pointer" : !inMonth ? "default" : "not-allowed",
                  ...(
                    !inMonth
                      ? { background: "transparent" }
                      : !workDay
                      ? {
                          background: "var(--surface)",
                          boxShadow: "var(--soft-press-sm)",
                          opacity: 0.55,
                        }
                      : selected || isAnchor
                      ? {
                          background: "var(--brand-soft)",
                          boxShadow: rStart || rEnd || single ? "var(--soft-press-sm)" : "none",
                        }
                      : holiday
                      ? {
                          background: "color-mix(in oklab, var(--accent) 18%, var(--surface-2))",
                          boxShadow: "var(--soft-1)",
                        }
                      : todayDay
                      ? { background: "var(--surface-2)", boxShadow: "var(--soft-1), 0 0 0 2px var(--brand)" }
                      : { background: "var(--surface-2)", boxShadow: "var(--soft-1)" }
                  ),
                }}
                title={inMonth && !workDay ? t("cal.nonWorking") : undefined}
              >
                <div className="flex items-start justify-between">
                  <span
                    className="text-[11px] font-extrabold w-6 h-6 flex items-center justify-center rounded-full"
                    style={
                      todayDay
                        ? { background: "var(--brand)", color: "white" }
                        : selected
                        ? { color: "var(--brand)" }
                        : inMonth
                        ? { color: "var(--ink)" }
                        : { color: "var(--ink-faint)" }
                    }
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex items-center gap-1">
                    {dayMeetings.length > 0 && inMonth && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1 rounded-md"
                        style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                        title={dayMeetings.map((m) => {
                          const time = formatInCompanyTz(new Date(m.startsAt), timeZone, { hour: "2-digit", minute: "2-digit", hour12: false });
                          return `${time} ${m.title}`;
                        }).join("\n")}
                      >
                        <Users size={8} />
                        {dayMeetings.length}
                      </span>
                    )}
                    {attendance && inMonth && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: ATTENDANCE_TONE[attendance.status] ?? "var(--ink-mute)" }}
                        title={`Marked ${attendance.status}`}
                      />
                    )}
                    {dayReqs.length > 2 && (
                      <span
                        className="text-[9px] font-extrabold px-1 rounded-md"
                        style={{ background: "var(--surface)", color: "var(--ink-mute)" }}
                      >
                        +{dayReqs.length - 2}
                      </span>
                    )}
                  </div>
                </div>

                {holiday && (
                  <div
                    className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-[2px] rounded-md truncate"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    <PartyPopper size={8} className="shrink-0" />
                    <span className="truncate">{holiday.name}</span>
                  </div>
                )}

                <div className="mt-auto space-y-0.5 overflow-hidden">
                  {dayReqs.slice(0, holiday ? 1 : 2).map((r) => {
                    const color = r.leaveType?.color ?? "#10b981";
                    return (
                      <div
                        key={r.id}
                        className={cn(
                          "flex items-center gap-1 text-[9px] leading-tight px-1.5 py-[3px] rounded-md font-bold truncate",
                          r.status === "rejected" && "opacity-40 line-through",
                          r.status === "pending"  && "opacity-70"
                        )}
                        style={{
                          color,
                          background: `color-mix(in oklab, ${color} 16%, transparent)`,
                        }}
                      >
                        <span className="text-[9px] leading-none shrink-0">{r.leaveType?.emoji ?? "🌴"}</span>
                        <span className="truncate">{r.user.name.split(" ")[0]}</span>
                        <span className="w-1 h-1 rounded-full shrink-0 ml-auto" style={{ background: STATUS_DOT[r.status] }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Selection panel */}
      {view === "month" && confirmed && (
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: "var(--surface-2)", boxShadow: "var(--soft-2)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ background: "linear-gradient(135deg, var(--brand-soft), var(--accent-soft))" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                style={{
                  background: "linear-gradient(135deg, var(--brand), var(--accent))",
                  boxShadow: "var(--glow-brand)",
                }}
              >
                <CalendarPlus size={16} />
              </div>
              <div>
                <p className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>
                  {isSingle()
                    ? format(confirmed.start, "EEEE, MMMM d")
                    : `${format(confirmed.start, "MMM d")} → ${format(confirmed.end, "MMM d, yyyy")}`}
                </p>
                <p className="text-[11px]" style={{ color: "var(--ink-mute)" }}>
                  {selWorkDays === 1 ? t("cal.workingDay", { count: selWorkDays }) : t("cal.workingDays", { count: selWorkDays })}
                  {selTotalDays !== selWorkDays && (
                    <span style={{ color: "var(--ink-faint)" }}> · {t("cal.calendarDays", { count: selTotalDays })}</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="p-2 rounded-full"
              style={{ background: "var(--surface-2)", boxShadow: "var(--soft-press-sm)", color: "var(--ink-soft)" }}
            >
              <X size={14} />
            </button>
          </div>

          <div className="px-5 py-4 flex flex-col sm:flex-row gap-5">
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Users size={13} style={{ color: "var(--ink-mute)" }} />
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-mute)" }}>
                    {panelRequests.length === 0 ? t("cal.noOneOff") : t("cal.peopleOff")}
                  </p>
                </div>
                {panelRequests.length === 0 ? (
                  <p className="text-sm italic" style={{ color: "var(--ink-faint)" }}>
                    {t("cal.nobody")}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {panelRequests.map((r) => {
                      const color = r.leaveType?.color ?? "#10b981";
                      return (
                        <div
                          key={r.id}
                          className="flex items-start gap-3 p-3 rounded-2xl"
                          style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
                        >
                          <Avatar name={r.user.name} size={32} className="rounded-full shrink-0" imageUrl={r.user.avatarUrl} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>{r.user.name}</span>
                              <Pill
                                label={`${r.leaveType?.emoji ?? "🌴"} ${r.leaveType?.label ?? "Vacation"}`}
                                color={color}
                              />
                            </div>
                            <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
                              {format(new Date(r.startDate), "MMM d")} → {format(new Date(r.endDate), "MMM d")}
                            </p>
                            {r.reason && (
                              <div
                                className="flex items-start gap-1.5 mt-2 px-3 py-2 rounded-xl"
                                style={{ background: "var(--surface-2)" }}
                              >
                                <MessageSquare size={11} className="mt-0.5" style={{ color: "var(--ink-mute)" }} />
                                <p className="text-xs italic" style={{ color: "var(--ink-soft)" }}>
                                  &ldquo;{r.reason}&rdquo;
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {panelMeetings.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Clock size={13} style={{ color: "var(--ink-mute)" }} />
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-mute)" }}>
                      {t("cal.meetingsScheduled", { count: panelMeetings.length })}
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {panelMeetings.map((m) => {
                      const dayLabel = formatInCompanyTz(new Date(m.startsAt), timeZone, { weekday: "short", month: "short", day: "numeric" });
                      const startTime = formatInCompanyTz(new Date(m.startsAt), timeZone, { hour: "2-digit", minute: "2-digit", hour12: false });
                      const endTime = formatInCompanyTz(new Date(m.endsAt), timeZone, { hour: "2-digit", minute: "2-digit", hour12: false });
                      return (
                        <div
                          key={m.id}
                          className="flex items-start gap-3 p-3 rounded-2xl"
                          style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                            style={{ background: "linear-gradient(135deg, var(--brand), var(--accent))" }}
                          >
                            <Users size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{m.title}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
                              {dayLabel} · {startTime}–{endTime} · {m.organizer.name}
                              {" · "}{t("cal.peopleCount", { count: m.attendees.length + 1 })}
                            </p>
                            {m.location && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <MapPin size={11} style={{ color: "var(--ink-faint)" }} />
                                <p className="text-[11px] truncate" style={{ color: "var(--ink-soft)" }}>{m.location}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {session?.user && (
              <div
                className="flex flex-col gap-2 sm:items-end sm:pl-5 sm:min-w-[200px]"
                style={{ borderLeft: "1px solid var(--line)" }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider hidden sm:block"
                   style={{ color: "var(--ink-mute)" }}>
                  {t("cal.quickAction")}
                </p>
                <Button onClick={() => setShowModal(true)} className="w-full">
                  <CalendarPlus size={14} />
                  {t("cal.requestOff")}
                </Button>
                <Button onClick={() => setShowMeetingModal(true)} className="w-full">
                  <Users size={14} />
                  {t("cal.scheduleMeeting")}
                </Button>
                <p className="text-[10px] sm:text-right" style={{ color: "var(--ink-faint)" }}>
                  {isSingle() ? t("cal.singleDay") : t("cal.workingDays", { count: selWorkDays })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t("cal.requestOff")} size="md">
        <RequestForm
          initialStart={confirmed ? format(confirmed.start, "yyyy-MM-dd") : undefined}
          initialEnd={confirmed   ? format(confirmed.end,   "yyyy-MM-dd") : undefined}
          onSuccess={() => {
            setShowModal(false);
            clearSelection();
            fetchData();
            onRequestCreated?.();
          }}
        />
      </Modal>

      <Modal
        open={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        title={t("meetings.new.title")}
        subtitle={t("meetings.new.subtitle")}
        size="md"
        dismissible={false}
      >
        <MeetingForm
          timeZone={timeZone}
          defaultDate={confirmed ? format(confirmed.start, "yyyy-MM-dd") : undefined}
          onSuccess={() => {
            setShowMeetingModal(false);
            clearSelection();
            fetchData();
          }}
        />
      </Modal>
    </div>
  );
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-full transition-all"
      style={{ color: "var(--ink-soft)" }}
    >
      {children}
    </button>
  );
}

function StatusChip({
  tone, bg, label, count,
}: {
  tone: string;
  bg: string;
  label: string;
  count: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold"
      style={{ background: bg, color: tone }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone }} />
      {label}
      <span
        className="text-[10px] font-extrabold px-1 rounded-md min-w-[16px] text-center"
        style={{ background: "color-mix(in oklab, white 35%, transparent)", color: tone }}
      >
        {count}
      </span>
    </span>
  );
}

function ViewBtn({
  active, onClick, icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full transition-all"
      style={
        active
          ? { background: "var(--brand-soft)", color: "var(--brand)", boxShadow: "var(--soft-press-sm)" }
          : { color: "var(--ink-soft)" }
      }
    >
      {icon}
      {children}
    </button>
  );
}

function ListView({
  current, requests, holidays, workDays, t,
}: {
  current: Date;
  requests: CalendarRequest[];
  holidays: CalendarHoliday[];
  workDays: Set<number>;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}) {
  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const monthStartStr = dayStr(monthStart);
  const monthEndStr = dayStr(monthEnd);

  const holidaySet = new Set(holidays.map((h) => isoStr(h.date)));

  type Item =
    | { kind: "holiday"; date: Date; sortKey: string; holiday: CalendarHoliday }
    | { kind: "request"; date: Date; sortKey: string; request: CalendarRequest };

  const items: Item[] = [];

  for (const h of holidays) {
    const ds = isoStr(h.date);
    if (ds < monthStartStr || ds > monthEndStr) continue;
    items.push({ kind: "holiday", date: new Date(`${ds}T00:00:00`), sortKey: ds, holiday: h });
  }

  for (const r of requests) {
    const startStr = isoStr(r.startDate);
    const endStr = isoStr(r.endDate);
    if (endStr < monthStartStr || startStr > monthEndStr) continue;
    const effectiveStart = startStr < monthStartStr ? monthStartStr : startStr;
    items.push({
      kind: "request",
      date: new Date(`${effectiveStart}T00:00:00`),
      sortKey: effectiveStart,
      request: r,
    });
  }

  items.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey < b.sortKey ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "holiday" ? -1 : 1;
    return 0;
  });

  type Total = { user: { id: string; name: string; avatarUrl: string | null }; count: number; color: string };
  const totalsByUser = new Map<string, Total>();
  for (const r of requests) {
    if (r.status === "rejected") continue;
    const startStr = isoStr(r.startDate);
    const endStr = isoStr(r.endDate);
    if (endStr < monthStartStr || startStr > monthEndStr) continue;
    const overlapStart = startStr < monthStartStr ? monthStart : new Date(`${startStr}T00:00:00`);
    const overlapEnd = endStr > monthEndStr ? monthEnd : new Date(`${endStr}T00:00:00`);
    let workingDays = 0;
    for (const d of eachDayOfInterval({ start: overlapStart, end: overlapEnd })) {
      if (workDays.has(d.getDay()) && !holidaySet.has(dayStr(d))) workingDays++;
    }
    if (workingDays === 0) continue;
    const existing = totalsByUser.get(r.user.id);
    if (existing) {
      existing.count += workingDays;
    } else {
      totalsByUser.set(r.user.id, {
        user: { id: r.user.id, name: r.user.name, avatarUrl: r.user.avatarUrl ?? null },
        count: workingDays,
        color: r.leaveType?.color ?? "#10b981",
      });
    }
  }
  const totals = Array.from(totalsByUser.values()).sort((a, b) => b.count - a.count);

  const statusCounts = { approved: 0, pending: 0, rejected: 0 };
  for (const r of requests) {
    const startStr = isoStr(r.startDate);
    const endStr = isoStr(r.endDate);
    if (endStr < monthStartStr || startStr > monthEndStr) continue;
    if (r.status === "approved" || r.status === "pending" || r.status === "rejected") {
      statusCounts[r.status as "approved" | "pending" | "rejected"]++;
    }
  }

  if (items.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
        >
          <Inbox size={22} style={{ color: "var(--ink-mute)" }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>
          {t("cal.list.empty")}
        </p>
      </div>
    );
  }

  const grouped = new Map<string, Item[]>();
  for (const it of items) {
    const arr = grouped.get(it.sortKey) ?? [];
    arr.push(it);
    grouped.set(it.sortKey, arr);
  }

  return (
    <div className="space-y-4">
      {totals.length > 0 && (
        <div
          className="rounded-2xl px-4 py-3"
          style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
            <div className="flex items-center gap-1.5">
              <Users size={13} style={{ color: "var(--ink-mute)" }} />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--ink-mute)" }}>
                {t("cal.list.totals")}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusChip
                tone="var(--ok)"
                bg="var(--ok-bg)"
                label={t("status.approved")}
                count={statusCounts.approved}
              />
              <StatusChip
                tone="var(--warn)"
                bg="var(--warn-bg)"
                label={t("status.pending")}
                count={statusCounts.pending}
              />
              <StatusChip
                tone="var(--err)"
                bg="var(--err-bg)"
                label={t("status.rejected")}
                count={statusCounts.rejected}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {totals.map((tot) => (
              <div
                key={tot.user.id}
                className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full"
                style={{ background: "var(--surface-2)", boxShadow: "var(--soft-press-sm)" }}
              >
                <Avatar name={tot.user.name} size={22} className="rounded-full shrink-0" imageUrl={tot.user.avatarUrl} />
                <span className="text-[12px] font-bold" style={{ color: "var(--ink)" }}>
                  {tot.user.name}
                </span>
                <span
                  className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md"
                  style={{ background: `color-mix(in oklab, ${tot.color} 22%, transparent)`, color: tot.color }}
                >
                  {tot.count === 1 ? t("cal.list.day", { count: tot.count }) : t("cal.list.days", { count: tot.count })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
      {Array.from(grouped.entries()).map(([key, group]) => {
        const date = group[0].date;
        const today = isToday(date);
        return (
          <div
            key={key}
            className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl"
            style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
          >
            <div
              className="flex flex-col items-center justify-center shrink-0 rounded-2xl px-3 py-2 min-w-[64px]"
              style={
                today
                  ? { background: "var(--brand)", color: "white", boxShadow: "var(--glow-brand)" }
                  : { background: "var(--surface-2)", color: "var(--ink)" }
              }
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ opacity: 0.85 }}>
                {format(date, "EEE")}
              </span>
              <span className="text-2xl font-black leading-none mt-0.5">{format(date, "d")}</span>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              {group.map((it) => {
                if (it.kind === "holiday") {
                  return (
                    <div
                      key={`h-${it.holiday.id}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: "color-mix(in oklab, var(--accent) 18%, var(--surface-2))" }}
                    >
                      <PartyPopper size={14} style={{ color: "var(--accent)" }} className="shrink-0" />
                      <p className="text-sm font-bold flex-1 truncate" style={{ color: "var(--ink)" }}>
                        {it.holiday.name}
                      </p>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                        style={{ background: "var(--accent)", color: "white" }}
                      >
                        {t("cal.list.holiday")}
                      </span>
                    </div>
                  );
                }
                const r = it.request;
                const color = r.leaveType?.color ?? "#10b981";
                const sameDay = isoStr(r.startDate) === isoStr(r.endDate);
                return (
                  <div
                    key={`r-${r.id}`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl",
                      r.status === "rejected" && "opacity-50",
                      r.status === "pending" && "opacity-90"
                    )}
                    style={{ background: `color-mix(in oklab, ${color} 12%, var(--surface-2))` }}
                  >
                    <Avatar name={r.user.name} size={28} className="rounded-full shrink-0" imageUrl={r.user.avatarUrl} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "text-sm font-bold truncate",
                            r.status === "rejected" && "line-through"
                          )}
                          style={{ color: "var(--ink)" }}
                        >
                          {r.user.name}
                        </span>
                        <Pill
                          label={`${r.leaveType?.emoji ?? "🌴"} ${r.leaveType?.label ?? "Vacation"}`}
                          color={color}
                        />
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
                        {sameDay
                          ? format(new Date(r.startDate), "MMM d")
                          : `${format(new Date(r.startDate), "MMM d")} → ${format(new Date(r.endDate), "MMM d")}`}
                      </p>
                    </div>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: STATUS_DOT[r.status] ?? "var(--ink-mute)" }}
                      title={r.status}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
