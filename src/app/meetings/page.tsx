"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarPlus, Inbox, Calendar, History, UserCog } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Paginator } from "@/components/ui/Paginator";
import { MeetingForm } from "@/components/meetings/MeetingForm";
import { MeetingCard, type MeetingDto } from "@/components/meetings/MeetingCard";
import { useT } from "@/lib/i18n/context";
import { usePageTitle } from "@/lib/usePageTitle";
import type { MessageKey } from "@/lib/i18n/messages";

const PAGE_SIZE = 10;

type Tab = "upcoming" | "past" | "organized";

const TABS: { key: Tab; labelKey: MessageKey; icon: React.ElementType }[] = [
  { key: "upcoming",  labelKey: "meetings.tab.upcoming",  icon: Calendar },
  { key: "past",      labelKey: "meetings.tab.past",      icon: History },
  { key: "organized", labelKey: "meetings.tab.organized", icon: UserCog },
];

export default function MeetingsPage() {
  usePageTitle("nav.meetings");
  const t = useT();
  const { data: session } = useSession();
  const [meetings, setMeetings] = useState<MeetingDto[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [timeZone, setTimeZone] = useState<string>("UTC");

  const fetchMeetings = useCallback(async (which: Tab) => {
    setLoading(true);
    const res = await fetch(`/api/meetings?scope=${which}`);
    if (res.ok) setMeetings(await res.json());
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchMeetings(tab); }, [tab, fetchMeetings]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [tab]);

  // Pull company TZ once.
  useEffect(() => {
    fetch("/api/company")
      .then((r) => (r.ok ? r.json() : null))
      .then((c: { timeZone?: string } | null) => {
        if (c?.timeZone) setTimeZone(c.timeZone);
      })
      .catch(() => {});
  }, []);

  const pageCount = Math.max(1, Math.ceil(meetings.length / PAGE_SIZE));
  const safePage  = Math.min(page, pageCount);
  const pageItems = useMemo(
    () => meetings.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [meetings, safePage],
  );

  const userId = session?.user?.id ?? "";
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--ink-mute)" }}>
            {t("meetings.label")}
          </p>
          <h1 className="text-[34px] leading-none font-black tracking-tight mt-1.5" style={{ color: "var(--ink)" }}>
            {t("meetings.title")}
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--ink-soft)" }}>
            {t("meetings.subtitle")}
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} size="md">
          <CalendarPlus size={16} />
          {t("meetings.new")}
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map(({ key, labelKey, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-all active:scale-[0.97]"
              style={
                active
                  ? { background: "var(--brand-soft)", color: "var(--brand)", boxShadow: "0 4px 14px -4px color-mix(in oklab, var(--brand) 45%, transparent)" }
                  : { background: "var(--surface-2)", color: "var(--ink-soft)", boxShadow: "var(--soft-1)" }
              }
            >
              <Icon size={13} className="opacity-90" />
              {t(labelKey)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div
            className="inline-block w-7 h-7 border-[2.5px] rounded-full animate-spin"
            style={{ borderColor: "var(--brand-soft)", borderTopColor: "var(--brand)" }}
          />
          <p className="text-sm mt-3" style={{ color: "var(--ink-mute)" }}>{t("common.loading")}</p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
          >
            <Inbox size={26} style={{ color: "var(--ink-mute)" }} />
          </div>
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{t("meetings.empty.title")}</p>
          <p className="text-xs mt-1" style={{ color: "var(--ink-mute)" }}>{t("meetings.empty.sub")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {pageItems.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                currentUserId={userId}
                isAdmin={!!isAdmin}
                timeZone={timeZone}
                onUpdate={() => fetchMeetings(tab)}
              />
            ))}
          </div>

          <Paginator page={safePage} pageCount={pageCount} onPage={setPage} />
        </>
      )}

      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title={t("meetings.new.title")}
        subtitle={t("meetings.new.subtitle")}
        size="md"
      >
        <MeetingForm
          timeZone={timeZone}
          onSuccess={() => { setShowNew(false); fetchMeetings(tab); }}
        />
      </Modal>
    </div>
  );
}
