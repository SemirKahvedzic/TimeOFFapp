"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";
import { Input, FieldLabel } from "@/components/ui/Input";
import { useT } from "@/lib/i18n/context";

interface LoginFormProps {
  companyName: string;
  logoUrl?: string | null;
}

export function LoginForm({ companyName, logoUrl }: LoginFormProps) {
  const router = useRouter();
  const t = useT();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) setError(t("login.error"));
    else router.push("/");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 overflow-hidden relative"
      style={{ background: "var(--bg)" }}
    >
      {/* Animated mesh gradient layer */}
      <div
        className="auth-mesh absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(1100px 700px at 12% 10%, var(--accent-soft) 0%, transparent 55%)," +
            "radial-gradient(1100px 700px at 90% 100%, var(--brand-soft) 0%, transparent 55%)," +
            "radial-gradient(900px 600px at 50% 110%, color-mix(in oklab, var(--brand) 18%, transparent) 0%, transparent 60%)",
        }}
      />

      <FloatingBlob color="var(--brand)"  size={420} top="-8%" left="-12%" opacity={0.18} animClass="auth-blob-a" />
      <FloatingBlob color="var(--accent)" size={360} top="60%" left="80%"  opacity={0.18} animClass="auth-blob-b" />
      <FloatingBlob color="var(--brand)"  size={260} top="80%" left="6%"   opacity={0.10} animClass="auth-blob-c" />

      <ParticleField count={18} />

      <div
        className="auth-card relative z-10 w-full max-w-md rounded-[36px] p-8 sm:p-10"
        style={{ background: "var(--surface-2)", boxShadow: "var(--soft-2), var(--glow-brand)" }}
      >
        <div
          className="auth-shimmer absolute top-0 left-1/4 right-1/4 h-[2px] rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--brand) 35%, var(--accent) 65%, transparent 100%)",
          }}
        />

        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={companyName}
              width={160}
              height={160}
              className="w-40 h-40 rounded-[24px] object-cover mb-6"
              style={{
                boxShadow:
                  "0 18px 40px -16px rgba(20,18,40,0.35), 0 4px 12px -4px rgba(20,18,40,0.12), 0 0 60px -20px rgba(124,92,255,0.4)",
              }}
            />
          ) : (
            <div
              className="w-36 h-36 rounded-[32px] flex items-center justify-center text-white mb-6"
              style={{
                background: "linear-gradient(135deg, var(--brand), var(--accent))",
                boxShadow: "var(--glow-brand)",
              }}
            >
              <Sparkles size={56} />
            </div>
          )}
          <h1
            className="auth-fade-up text-2xl font-extrabold tracking-tight text-center"
            style={{ color: "var(--ink)", animationDelay: "0.15s" }}
          >
            {t("login.welcome", { company: companyName })}
          </h1>
          <p
            className="auth-fade-up text-sm mt-1"
            style={{ color: "var(--ink-mute)", animationDelay: "0.25s" }}
          >
            {t("login.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="auth-fade-up" style={{ animationDelay: "0.35s" }}>
            <FieldLabel>{t("login.email")}</FieldLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="auth-fade-up" style={{ animationDelay: "0.45s" }}>
            <div className="flex items-end justify-between mb-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: "var(--ink-mute)" }}
              >
                {t("login.password")}
              </span>
              <Link
                href="/forgot-password"
                className="text-[11px] font-semibold hover:underline"
                style={{ color: "var(--brand)" }}
              >
                {t("login.forgot")}
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingRight: "44px" }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full"
                style={{ color: "var(--ink-mute)" }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
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
            disabled={loading}
            className="auth-fade-up w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-60 active:scale-[0.99] hover:translate-y-[-1px]"
            style={{
              background: "linear-gradient(135deg, var(--brand), var(--accent))",
              boxShadow: "var(--glow-brand)",
              animationDelay: "0.55s",
            }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {t("login.signIn")}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function FloatingBlob({
  color, size, top, left, opacity, animClass,
}: { color: string; size: number; top: string; left: string; opacity: number; animClass?: string }) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${animClass ?? ""}`}
      style={{
        width: size,
        height: size,
        top,
        left,
        background: color,
        opacity,
        filter: "blur(80px)",
      }}
    />
  );
}

// Stable pseudo-random so SSR + client agree on positions.
function ParticleField({ count }: { count: number }) {
  const particles = Array.from({ length: count }, (_, i) => {
    const seed = i * 9301 + 49297;
    const r1 = ((seed * 233280) % 100) / 100;
    const r2 = ((seed * 1103515245 + 12345) % 100) / 100;
    const r3 = (i * 17 + 31) % 100 / 100;
    return {
      left: `${(r1 * 100).toFixed(1)}%`,
      size: 3 + Math.round(r2 * 5),
      duration: 14 + Math.round(r3 * 16),
      delay: Math.round(r1 * 18),
      opacity: 0.25 + r2 * 0.35,
    };
  });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <span
          key={i}
          className="auth-particle absolute rounded-full"
          style={{
            left: p.left,
            bottom: "-20px",
            width: p.size,
            height: p.size,
            background: i % 3 === 0 ? "var(--accent)" : "var(--brand)",
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

