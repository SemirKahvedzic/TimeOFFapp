"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, Globe, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Select, FieldLabel } from "@/components/ui/Input";
import { useT } from "@/lib/i18n/context";
import { LANGUAGES, LANGUAGE_LABELS, type Lang } from "@/lib/i18n/messages";
import { usePageTitle } from "@/lib/usePageTitle";

type ThemeOverride = "light" | "dark" | "";    // "" = use company default
type LanguageOverride = Lang | "";              // "" = use company default

export default function PreferencesPage() {
  usePageTitle("nav.preferences");
  const t = useT();
  const [theme, setTheme] = useState<ThemeOverride>("");
  const [language, setLanguage] = useState<LanguageOverride>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/me/preferences")
      .then((r) => r.json())
      .then((data: { theme: string | null; language: string | null }) => {
        setTheme((data.theme as ThemeOverride) ?? "");
        setLanguage((data.language as LanguageOverride) ?? "");
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
        body: JSON.stringify({
          theme: theme === "" ? null : theme,
          language: language === "" ? null : language,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(t("prefs.saved"));
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
        {loading ? (
          <p className="text-sm" style={{ color: "var(--ink-mute)" }}>{t("common.loading")}</p>
        ) : (
          <>
            <div>
              <FieldLabel>{t("prefs.theme")}</FieldLabel>
              <div
                className="grid grid-cols-3 gap-2 p-1 rounded-2xl"
                style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
              >
                <ThemeChoice
                  active={theme === ""}
                  onClick={() => setTheme("")}
                  label={t("prefs.useCompany")}
                />
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
                  onChange={(e) => setLanguage(e.target.value as LanguageOverride)}
                  style={{ paddingLeft: 38 }}
                >
                  <option value="">— {t("prefs.useCompany")} —</option>
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
