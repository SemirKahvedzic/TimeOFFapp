"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, X, Loader2, AlertCircle, Sparkles } from "lucide-react";

type Outcome =
  | { kind: "loading" }
  | { kind: "success"; status: "accepted" | "declined"; meetingTitle: string; organizerName: string }
  | { kind: "error"; message: string };

function RsvpInner() {
  const params = useSearchParams();
  const token = params.get("token");
  // Missing-token state is derived (not set), so the lint rule about
  // setState-in-effect doesn't apply.
  const initial: Outcome = token
    ? { kind: "loading" }
    : { kind: "error", message: "Missing or malformed link." };
  const [outcome, setOutcome] = useState<Outcome>(initial);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/meetings/respond/public", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setOutcome({ kind: "error", message: data?.error ?? "Couldn't process this link." });
          return;
        }
        setOutcome({
          kind: "success",
          status: data.status,
          meetingTitle: data.meeting?.title ?? "your meeting",
          organizerName: data.meeting?.organizerName ?? "the organizer",
        });
      } catch {
        if (!cancelled) setOutcome({ kind: "error", message: "Network error. Try the link again later." });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-md rounded-[28px] p-8 text-center"
        style={{ background: "var(--surface-2)", boxShadow: "var(--soft-2)" }}
      >
        {outcome.kind === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--brand)" }} />
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Recording your response…</p>
          </div>
        )}

        {outcome.kind === "success" && (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
              style={{
                background: outcome.status === "accepted"
                  ? "linear-gradient(135deg, #34d399, #10b981)"
                  : "linear-gradient(135deg, #ff6b6b, #ef4444)",
                boxShadow: outcome.status === "accepted"
                  ? "0 12px 28px -8px rgba(16,185,129,0.45)"
                  : "0 12px 28px -8px rgba(239,68,68,0.45)",
              }}
            >
              {outcome.status === "accepted" ? <Check size={26} /> : <X size={26} />}
            </div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
              {outcome.status === "accepted" ? "You're in" : "Got it — declined"}
            </h1>
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
              {outcome.status === "accepted"
                ? <>You&rsquo;ve accepted <strong style={{ color: "var(--ink)" }}>{outcome.meetingTitle}</strong>. {outcome.organizerName} has been notified.</>
                : <>You&rsquo;ve declined <strong style={{ color: "var(--ink)" }}>{outcome.meetingTitle}</strong>. {outcome.organizerName} has been notified.</>}
            </p>
            <p className="text-[11px] mt-2 inline-flex items-center gap-1.5" style={{ color: "var(--ink-faint)" }}>
              <Sparkles size={11} /> You can close this tab.
            </p>
          </div>
        )}

        {outcome.kind === "error" && (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--err-bg)", color: "var(--err)" }}
            >
              <AlertCircle size={24} />
            </div>
            <h1 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
              Something went wrong
            </h1>
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>{outcome.message}</p>
            <p className="text-[11px] mt-2" style={{ color: "var(--ink-faint)" }}>
              You can still respond from your dashboard after signing in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RsvpPage() {
  return (
    <Suspense fallback={null}>
      <RsvpInner />
    </Suspense>
  );
}
