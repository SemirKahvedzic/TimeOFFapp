"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

const HEARTBEAT_MS = 60_000;

export function PresenceHeartbeat() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;
    const ping = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      fetch("/api/presence", { method: "POST", keepalive: true }).catch(() => {});
    };

    ping();
    const id = window.setInterval(ping, HEARTBEAT_MS);
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status]);

  return null;
}
