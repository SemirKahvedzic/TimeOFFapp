"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, MailCheck, Sparkles } from "lucide-react";
import { Input, FieldLabel } from "@/components/ui/Input";
import { useT } from "@/lib/i18n/context";

interface Props {
  companyName: string;
  logoUrl?: string | null;
}

export function ForgotPasswordForm({ companyName, logoUrl }: Props) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

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
            {t("forgot.title")}
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: "var(--ink-mute)" }}>
            {t("forgot.subtitle")}
          </p>
        </div>

        {submitted ? (
          <div className="space-y-5">
            <div
              className="rounded-2xl px-4 py-4 text-sm flex items-start gap-3"
              style={{ background: "var(--brand-soft)", color: "var(--ink)" }}
            >
              <MailCheck size={18} style={{ color: "var(--brand)", flexShrink: 0, marginTop: 2 }} />
              <span>{t("forgot.sent")}</span>
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 py-3 text-sm font-semibold"
              style={{ color: "var(--brand)" }}
            >
              <ArrowLeft size={16} />
              {t("forgot.backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <FieldLabel>{t("forgot.email")}</FieldLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
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
                  {t("forgot.send")}
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
