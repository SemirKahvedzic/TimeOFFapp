"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Sparkles, Eye, EyeOff } from "lucide-react";
import { Input, FieldLabel } from "@/components/ui/Input";
import { useT } from "@/lib/i18n/context";

interface Props {
  companyName: string;
  logoUrl?: string | null;
}

export function ResetPasswordForm({ companyName, logoUrl }: Props) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 8) { setError(t("reset.tooShort")); return; }
    if (pw !== pw2)    { setError(t("reset.mismatch")); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: pw }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "too_short")           setError(t("reset.tooShort"));
        else if (data.error === "invalid_or_expired") setError(t("reset.invalidLink"));
        else setError(t("reset.invalidLink"));
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } finally {
      setLoading(false);
    }
  }

  const tokenMissing = !token;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(1100px 700px at 12% 10%, var(--accent-soft) 0%, transparent 55%)," +
          "radial-gradient(1100px 700px at 90% 100%, var(--brand-soft) 0%, transparent 55%)," +
          "var(--bg)",
      }}
    >
      <div
        className="relative z-10 w-full max-w-md rounded-[36px] p-8 sm:p-10"
        style={{ background: "var(--surface-2)", boxShadow: "var(--soft-2), var(--glow-brand)" }}
      >
        <div
          className="absolute top-0 left-1/4 right-1/4 h-[2px] rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, var(--brand), var(--accent), transparent)",
          }}
        />

        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={companyName}
              className="w-24 h-24 rounded-[28px] object-cover mb-5"
              style={{ boxShadow: "var(--soft-2)" }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-[28px] flex items-center justify-center text-white mb-5"
              style={{
                background: "linear-gradient(135deg, var(--brand), var(--accent))",
                boxShadow: "var(--glow-brand)",
              }}
            >
              <Sparkles size={32} />
            </div>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-center" style={{ color: "var(--ink)" }}>
            {t("reset.title")}
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: "var(--ink-mute)" }}>
            {t("reset.subtitle")}
          </p>
        </div>

        {tokenMissing ? (
          <div className="space-y-5">
            <div
              className="rounded-2xl px-4 py-4 text-sm flex items-start gap-3"
              style={{ background: "var(--err-bg)", color: "var(--err)" }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{t("reset.invalidLink")}</span>
            </div>
            <Link
              href="/forgot-password"
              className="flex items-center justify-center gap-2 py-2 text-sm font-semibold"
              style={{ color: "var(--brand)" }}
            >
              {t("reset.requestNew")}
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-5">
            <div
              className="rounded-2xl px-4 py-4 text-sm flex items-start gap-3"
              style={{ background: "var(--brand-soft)", color: "var(--ink)" }}
            >
              <CheckCircle2 size={18} style={{ color: "var(--brand)", flexShrink: 0, marginTop: 2 }} />
              <span>{t("reset.saved")}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <FieldLabel>{t("reset.new")}</FieldLabel>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full"
                  style={{ color: "var(--ink-mute)" }}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <FieldLabel>{t("reset.confirm")}</FieldLabel>
              <Input
                type={showPw ? "text" : "password"}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div
                className="rounded-2xl px-4 py-3 text-sm"
                style={{ background: "var(--err-bg)", color: "var(--err)" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !pw || !pw2}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-60 active:scale-[0.99]"
              style={{
                background: "linear-gradient(135deg, var(--brand), var(--accent))",
                boxShadow: "var(--glow-brand)",
              }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {t("reset.save")}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 py-2 text-sm font-semibold"
              style={{ color: "var(--ink-mute)" }}
            >
              <ArrowLeft size={14} />
              {t("forgot.backToLogin")}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
