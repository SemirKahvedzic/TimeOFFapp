"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, Globe, Save, Eye, EyeOff, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input, Select, FieldLabel } from "@/components/ui/Input";
import { useT } from "@/lib/i18n/context";
import { LANGUAGES, LANGUAGE_LABELS, type Lang } from "@/lib/i18n/messages";
import { usePageTitle } from "@/lib/usePageTitle";

type ThemeChoiceValue = "light" | "dark";

export default function PreferencesPage() {
  usePageTitle("nav.preferences");
  const t = useT();
  const [theme, setTheme] = useState<ThemeChoiceValue>("light");
  const [language, setLanguage] = useState<Lang>("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Default to whatever the layout already resolved for this user, so the
    // form reflects the currently visible theme/language even if the user has
    // no explicit preference saved yet.
    const htmlTheme = document.documentElement.dataset.theme;
    const resolvedTheme: ThemeChoiceValue = htmlTheme === "dark" ? "dark" : "light";
    const htmlLang = document.documentElement.lang;
    const resolvedLang: Lang = (LANGUAGES as readonly string[]).includes(htmlLang)
      ? (htmlLang as Lang)
      : "en";

    fetch("/api/me/preferences")
      .then((r) => r.json())
      .then((data: { theme: string | null; language: string | null }) => {
        setTheme((data.theme as ThemeChoiceValue) ?? resolvedTheme);
        setLanguage((data.language as Lang) ?? resolvedLang);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, language }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(t("prefs.saved"));

      // The root layout reads theme + language on the server and bakes them
      // into <html data-theme>, <html lang>, and the LanguageProvider context.
      // router.refresh() didn't reliably propagate the new values in Next 16,
      // so we do a hard reload — heavy-handed but bulletproof.
      window.location.reload();
    } catch {
      toast.error(t("prefs.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-mute)" }}>
          {t("prefs.label")}
        </p>
        <h1 className="text-3xl font-black tracking-tight mt-1" style={{ color: "var(--ink)" }}>
          {t("prefs.title")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          {t("prefs.subtitle")}
        </p>
      </div>

      <div className="rounded-3xl p-6 space-y-5" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
        <h2 className="text-base font-bold" style={{ color: "var(--ink)" }}>
          {t("prefs.section.appearance")}
        </h2>
        {loading ? (
          <p className="text-sm" style={{ color: "var(--ink-mute)" }}>{t("common.loading")}</p>
        ) : (
          <>
            <div>
              <FieldLabel>{t("prefs.theme")}</FieldLabel>
              <div
                className="grid grid-cols-2 gap-2 p-1 rounded-2xl"
                style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
              >
                <ThemeChoice
                  active={theme === "light"}
                  onClick={() => setTheme("light")}
                  icon={<Sun size={14} />}
                  label={t("settings.brand.theme.light")}
                />
                <ThemeChoice
                  active={theme === "dark"}
                  onClick={() => setTheme("dark")}
                  icon={<Moon size={14} />}
                  label={t("settings.brand.theme.dark")}
                />
              </div>
            </div>

            <div>
              <FieldLabel>{t("prefs.language")}</FieldLabel>
              <div className="relative">
                <Globe
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--ink-mute)" }}
                />
                <Select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Lang)}
                  style={{ paddingLeft: 38 }}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
                  ))}
                </Select>
              </div>
            </div>

            <Button onClick={save} loading={saving} size="lg">
              <Save size={15} />
              {t("btn.save")}
            </Button>
          </>
        )}
      </div>

      <PasswordSection />
    </div>
  );
}

function PasswordSection() {
  const t = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast.error(t("prefs.password.tooShort"));
      return;
    }
    if (next !== confirm) {
      toast.error(t("prefs.password.mismatch"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.status === 403) {
        toast.error(t("prefs.password.wrongCurrent"));
        return;
      }
      if (res.status === 400) {
        const body = await res.json().catch(() => null);
        toast.error(
          body?.error === "too_short"
            ? t("prefs.password.tooShort")
            : t("prefs.password.saveFailed")
        );
        return;
      }
      if (!res.ok) throw new Error("Failed");
      toast.success(t("prefs.password.saved"));
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      toast.error(t("prefs.password.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="rounded-3xl p-6 space-y-5"
      style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}
    >
      <div>
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--ink)" }}>
          <KeyRound size={16} style={{ color: "var(--brand)" }} />
          {t("prefs.section.password")}
        </h2>
        <p className="text-xs mt-1" style={{ color: "var(--ink-mute)" }}>
          {t("prefs.section.passwordHint")}
        </p>
      </div>

      <div>
        <FieldLabel>{t("prefs.password.current")}</FieldLabel>
        <PasswordInput
          value={current}
          onChange={setCurrent}
          show={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
          autoComplete="current-password"
          required
        />
      </div>

      <div>
        <FieldLabel>{t("prefs.password.new")}</FieldLabel>
        <PasswordInput
          value={next}
          onChange={setNext}
          show={showNext}
          onToggle={() => setShowNext((v) => !v)}
          autoComplete="new-password"
          required
        />
      </div>

      <div>
        <FieldLabel>{t("prefs.password.confirm")}</FieldLabel>
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          show={showNext}
          onToggle={() => setShowNext((v) => !v)}
          autoComplete="new-password"
          required
        />
      </div>

      <Button type="submit" loading={saving} size="lg">
        <KeyRound size={15} />
        {t("prefs.password.save")}
      </Button>
    </form>
  );
}

function PasswordInput({
  value, onChange, show, onToggle, autoComplete, required,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        autoComplete={autoComplete}
        required={required}
        style={{ paddingRight: "44px" }}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full"
        style={{ color: "var(--ink-mute)" }}
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function ThemeChoice({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon?: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all duration-200 active:scale-[0.97]"
      style={
        active
          ? { background: "var(--surface-2)", color: "var(--brand)", boxShadow: "var(--soft-1)" }
          : { color: "var(--ink-soft)", background: "transparent" }
      }
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
