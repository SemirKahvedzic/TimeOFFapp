"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(1100px 700px at 12% 10%, var(--accent-soft) 0%, transparent 55%)," +
          "radial-gradient(1100px 700px at 90% 100%, var(--brand-soft) 0%, transparent 55%)," +
          "var(--bg)",
      }}
    >
      <FloatingBlob color="var(--brand)"  size={420} top="-8%" left="-12%" opacity={0.18} />
      <FloatingBlob color="var(--accent)" size={360} top="60%" left="80%"  opacity={0.18} />
      <FloatingBlob color="var(--brand)"  size={260} top="80%" left="6%"   opacity={0.10} />

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
              className="w-16 h-16 rounded-3xl object-cover mb-4"
              style={{ boxShadow: "var(--soft-2)" }}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-3xl flex items-center justify-center text-white mb-4"
              style={{
                background: "linear-gradient(135deg, var(--brand), var(--accent))",
                boxShadow: "var(--glow-brand)",
              }}
            >
              <Sparkles size={22} />
            </div>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-center" style={{ color: "var(--ink)" }}>
            {t("login.welcome", { company: companyName })}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-mute)" }}>
            {t("login.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel>{t("login.email")}</FieldLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <FieldLabel>{t("login.password")}</FieldLabel>
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
                {t("login.signIn")}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-7 pt-5" style={{ borderTop: "1px solid var(--line)" }}>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 text-center"
            style={{ color: "var(--ink-mute)" }}
          >
            {t("login.demoTitle")}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <DemoBtn
              label={t("login.role.admin")}
              email="admin@company.com"
              pw="admin123"
              onClick={() => { setEmail("admin@company.com"); setPassword("admin123"); }}
            />
            <DemoBtn
              label={t("login.role.employee")}
              email="sarah@company.com"
              pw="employee123"
              onClick={() => { setEmail("sarah@company.com"); setPassword("employee123"); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingBlob({
  color, size, top, left, opacity,
}: { color: string; size: number; top: string; left: string; opacity: number }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
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

function DemoBtn({
  label, email, pw, onClick,
}: { label: string; email: string; pw: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="rounded-2xl px-3 py-2.5 text-left transition-all active:scale-[0.98]"
      style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
    >
      <p className="text-[11px] font-bold" style={{ color: "var(--brand)" }}>{label}</p>
      <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--ink-mute)" }}>{email}</p>
      <p className="text-[10px] truncate" style={{ color: "var(--ink-faint)" }}>{pw}</p>
    </button>
  );
}
