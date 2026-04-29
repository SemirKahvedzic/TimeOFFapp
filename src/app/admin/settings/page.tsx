"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Save, Trash2, Plus, Building2, Palette, Briefcase, PartyPopper,
  Link as LinkIcon, Copy, Check, Pencil, Upload, ImageIcon, Sun, Moon,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, FieldLabel } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useT } from "@/lib/i18n/context";
import { type MessageKey } from "@/lib/i18n/messages";
import { usePageTitle } from "@/lib/usePageTitle";

interface Company {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  brandColor: string;
  accentColor: string;
  theme: string;
  language: string;
  workWeek: string;
  countryCode: string;
  timeZone: string;
  icalToken: string;
}

interface LeaveType {
  id: string; key: string; label: string; emoji: string; color: string;
  defaultAllowance: number | null; paid: boolean; requiresApproval: boolean; order: number; archived: boolean;
}

interface Holiday {
  id: string; name: string; date: string; recurring: boolean; source: string;
}

interface Department {
  id: string; name: string; color: string;
  _count?: { members: number };
}

const WEEK_DAYS = [
  { num: 0, label: "Sun" }, { num: 1, label: "Mon" }, { num: 2, label: "Tue" },
  { num: 3, label: "Wed" }, { num: 4, label: "Thu" }, { num: 5, label: "Fri" }, { num: 6, label: "Sat" },
];

// Brand defaults — must match prisma schema defaults
const DEFAULT_BRAND_COLOR  = "#7c5cff";
const DEFAULT_ACCENT_COLOR = "#ff8fb1";

export default function AdminSettingsPage() {
  usePageTitle("nav.settings");
  const t = useT();
  const [section, setSection] = useState<"brand" | "types" | "holidays" | "departments" | "ical">("brand");
  const [company, setCompany] = useState<Company | null>(null);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const refresh = useCallback(async () => {
    const [c, t, h, d] = await Promise.all([
      fetch("/api/company"),
      fetch("/api/leave-types"),
      fetch(`/api/holidays?year=${new Date().getFullYear()}`),
      fetch("/api/departments"),
    ]);
    if (c.ok) setCompany(await c.json());
    if (t.ok) setTypes(await t.json());
    if (h.ok) setHolidays(await h.json());
    if (d.ok) setDepartments(await d.json());
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-mute)" }}>
          {t("settings.label")}
        </p>
        <h1 className="text-3xl font-black tracking-tight mt-1" style={{ color: "var(--ink)" }}>
          {t("settings.title")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1 p-1 rounded-full w-fit"
           style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}>
        <SectionTab active={section === "brand"}       onClick={() => setSection("brand")}       icon={Palette}      label={t("settings.tab.brand")} />
        <SectionTab active={section === "types"}       onClick={() => setSection("types")}       icon={Briefcase}    label={t("settings.tab.types")} />
        <SectionTab active={section === "holidays"}    onClick={() => setSection("holidays")}    icon={PartyPopper}  label={t("settings.tab.holidays")} />
        <SectionTab active={section === "departments"} onClick={() => setSection("departments")} icon={Building2}    label={t("settings.tab.departments")} />
        <SectionTab active={section === "ical"}        onClick={() => setSection("ical")}        icon={LinkIcon}     label={t("settings.tab.ical")} />
      </div>

      {section === "brand"       && company && <BrandSection company={company} onSaved={refresh} />}
      {section === "types"       && <LeaveTypesSection types={types} onChange={refresh} />}
      {section === "holidays"    && <HolidaysSection holidays={holidays} onChange={refresh} />}
      {section === "departments" && <DepartmentsSection depts={departments} onChange={refresh} />}
      {section === "ical"        && company && <ICalSection company={company} />}
    </div>
  );
}

/* ---------- Section tab ---------- */
function SectionTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all"
      style={
        active
          ? { background: "var(--surface-2)", color: "var(--brand)", boxShadow: "var(--soft-1)" }
          : { color: "var(--ink-soft)" }
      }
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

/* ---------- Color picker input ---------- */
function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-2xl"
      style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-9 h-9 rounded-xl"
        style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }}
        aria-label="Color"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm flex-1 outline-none font-mono uppercase"
        style={{ color: "var(--ink)" }}
      />
    </div>
  );
}

/* ---------- Logo uploader ---------- */
function LogoUploader({
  logoUrl, fallback, brandColor, accentColor, onChange, onClear,
}: {
  logoUrl: string | null;
  fallback: string;
  brandColor: string;
  accentColor: string;
  onChange: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <div
      className="flex items-center gap-4 p-3 rounded-2xl"
      style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt="Logo preview"
          className="w-16 h-16 rounded-2xl object-cover shrink-0"
          style={{ boxShadow: "var(--soft-1)" }}
        />
      ) : (
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0"
          style={{
            background: `linear-gradient(135deg, ${brandColor}, ${accentColor})`,
            boxShadow: `0 12px 28px -8px ${brandColor}90`,
          }}
        >
          {fallback}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold" style={{ color: "var(--ink)" }}>
          {logoUrl ? "Custom logo" : "Default initial mark"}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
          PNG, JPG or SVG · square crops best · max 512KB
        </p>
        <div className="flex items-center gap-2 mt-2">
          <label
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all active:scale-[0.98]"
            style={{
              background: "var(--surface-2)",
              color: "var(--ink)",
              boxShadow: "var(--soft-1)",
            }}
          >
            <Upload size={12} />
            {logoUrl ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />
          </label>
          {logoUrl && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-[0.98]"
              style={{ color: "var(--err)", background: "transparent" }}
            >
              <ImageIcon size={12} />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Brand section                                                    */
/* ─────────────────────────────────────────────────────────────── */
function BrandSection({ company, onSaved }: { company: Company; onSaved: () => void }) {
  const t = useT();
  const [name, setName] = useState(company.name);
  const [tagline, setTagline] = useState(company.tagline ?? "");
  const [brandColor, setBrandColor] = useState(company.brandColor);
  const [accentColor, setAccentColor] = useState(company.accentColor);
  const [theme, setTheme] = useState<"light" | "dark">((company.theme as "light" | "dark") ?? "light");
  const [workWeek, setWorkWeek] = useState(new Set(company.workWeek.split(",").map(Number)));
  const [timeZone, setTimeZone] = useState(company.timeZone);
  const [countryCode, setCountryCode] = useState(company.countryCode);
  const [logoUrl, setLogoUrl] = useState<string | null>(company.logoUrl);
  const [saving, setSaving] = useState(false);

  // True if any field differs from what the server last returned. Comparing
  // workWeek as a sorted comma-string keeps it consistent with how the API
  // serializes it, so re-saving the same days never registers as dirty.
  const workWeekStr = Array.from(workWeek).sort((a, b) => a - b).join(",");
  const isDirty =
    name !== company.name ||
    tagline !== (company.tagline ?? "") ||
    brandColor !== company.brandColor ||
    accentColor !== company.accentColor ||
    theme !== company.theme ||
    workWeekStr !== company.workWeek ||
    timeZone !== company.timeZone ||
    countryCode !== company.countryCode ||
    logoUrl !== company.logoUrl;

  function toggleDay(d: number) {
    const next = new Set(workWeek);
    if (next.has(d)) next.delete(d); else next.add(d);
    setWorkWeek(next);
  }

  function handleLogoFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("settings.brand.toast.notImage"));
      return;
    }
    if (file.size > 512 * 1024) {
      toast.error(t("settings.brand.toast.tooBig"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => toast.error(t("settings.brand.toast.readFailed"));
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, tagline, brandColor, accentColor, logoUrl, theme,
          workWeek: Array.from(workWeek).sort((a, b) => a - b).join(","),
          timeZone, countryCode,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(t("settings.brand.toast.saved"));

      // Brand colors, theme, language, and logo all flow through the root
      // layout's server render. Hard-reload so the new values land in
      // <html data-theme>, the brand CSS vars, and the LanguageProvider.
      window.location.reload();
    } catch {
      toast.error(t("settings.brand.toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl p-6 space-y-5" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
      <h2 className="text-base font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
        {t("settings.brand.identity")}
      </h2>

      <div>
        <FieldLabel>{t("settings.brand.logo")}</FieldLabel>
        <LogoUploader
          logoUrl={logoUrl}
          fallback={(name[0] || "?").toUpperCase()}
          brandColor={brandColor}
          accentColor={accentColor}
          onChange={handleLogoFile}
          onClear={() => setLogoUrl(null)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel>{t("settings.brand.companyName")}</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <FieldLabel>{t("settings.brand.tagline")}</FieldLabel>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>{t("settings.brand.brandColor")}</FieldLabel>
            <ColorInput value={brandColor} onChange={setBrandColor} />
          </div>
          <div>
            <FieldLabel>{t("settings.brand.accentColor")}</FieldLabel>
            <ColorInput value={accentColor} onChange={setAccentColor} />
          </div>
        </div>
        {(brandColor.toLowerCase() !== DEFAULT_BRAND_COLOR ||
          accentColor.toLowerCase() !== DEFAULT_ACCENT_COLOR) && (
          <button
            type="button"
            onClick={() => {
              setBrandColor(DEFAULT_BRAND_COLOR);
              setAccentColor(DEFAULT_ACCENT_COLOR);
              toast.success(t("settings.brand.resetColors.toast"));
            }}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold transition-colors"
            style={{ color: "var(--ink-mute)" }}
          >
            <RotateCcw size={11} />
            {t("settings.brand.resetColors")}
            <span
              className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-mono"
              style={{ color: "var(--ink-faint)" }}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: DEFAULT_BRAND_COLOR }} />
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: DEFAULT_ACCENT_COLOR }} />
            </span>
          </button>
        )}
      </div>

      {/* Theme */}
      <div>
        <FieldLabel>{t("settings.brand.theme")}</FieldLabel>
        <div
          className="grid grid-cols-2 gap-2 p-1 rounded-2xl max-w-md"
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
        <FieldLabel>{t("settings.brand.workWeek")}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {WEEK_DAYS.map((d) => {
            const on = workWeek.has(d.num);
            return (
              <button
                key={d.num}
                type="button"
                onClick={() => toggleDay(d.num)}
                className="px-4 py-2 rounded-full text-xs font-bold transition-all"
                style={
                  on
                    ? { background: "var(--brand)", color: "white", boxShadow: "var(--glow-brand)" }
                    : { background: "var(--surface)", color: "var(--ink-soft)", boxShadow: "var(--soft-press-sm)" }
                }
              >
                {t(`cal.weekday.${["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.num] as "sun"}` as MessageKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>{t("settings.brand.country")}</FieldLabel>
          <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))} />
        </div>
        <div>
          <FieldLabel>{t("settings.brand.timezone")}</FieldLabel>
          <Input value={timeZone} onChange={(e) => setTimeZone(e.target.value)} placeholder="America/New_York" />
        </div>
      </div>

      {/* Brand preview */}
      <div className="rounded-3xl p-5" style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--ink-mute)" }}>
          {t("settings.brand.preview")}
        </p>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={name}
              className="w-14 h-14 rounded-2xl object-cover"
              style={{ boxShadow: `0 12px 28px -8px ${brandColor}90` }}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-black"
              style={{
                background: `linear-gradient(135deg, ${brandColor}, ${accentColor})`,
                boxShadow: `0 12px 28px -8px ${brandColor}90`,
              }}
            >
              {(name[0] || "?").toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold truncate" style={{ color: "var(--ink)" }}>{name || "Untitled"}</p>
            <p className="text-[11px] truncate" style={{ color: "var(--ink-mute)" }}>{tagline || "Time-off, simplified"}</p>
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-full text-xs font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${brandColor}, ${accentColor})`,
              boxShadow: `0 12px 28px -8px ${brandColor}90`,
            }}
          >
            Sample button
          </button>
        </div>
      </div>

      <Button onClick={save} loading={saving} disabled={!isDirty} size="lg">
        <Save size={15} />
        {t("btn.save")}
      </Button>
    </div>
  );
}

function ThemeChoice({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold transition-all duration-200 active:scale-[0.97]"
      style={
        active
          ? {
              background: "var(--surface-2)",
              color: "var(--brand)",
              boxShadow: "var(--soft-1)",
            }
          : {
              color: "var(--ink-soft)",
              background: "transparent",
            }
      }
    >
      {icon}
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Leave types section                                              */
/* ─────────────────────────────────────────────────────────────── */
function LeaveTypesSection({ types, onChange }: { types: LeaveType[]; onChange: () => void }) {
  const t = useT();
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [deleting, setDeleting] = useState<LeaveType | null>(null);
  const [deletingNow, setDeletingNow] = useState(false);

  async function archive() {
    if (!deleting) return;
    setDeletingNow(true);
    try {
      const res = await fetch(`/api/leave-types/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success(t("lt.toast.archived"));
      setDeleting(null);
      onChange();
    } catch {
      toast.error(t("card.toast.failed"));
    } finally { setDeletingNow(false); }
  }

  return (
    <div className="rounded-3xl p-6 space-y-5" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{t("lt.section.title")}</h2>
        <Button size="sm" variant="secondary" onClick={() => setShowNew(true)}>
          <Plus size={13} />
          {t("lt.add")}
        </Button>
      </div>

      <div className="space-y-2">
        {types.length === 0 && (
          <p className="text-sm italic" style={{ color: "var(--ink-faint)" }}>{t("lt.empty")}</p>
        )}
        {types.map((lt) => (
          <div
            key={lt.id}
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: `color-mix(in oklab, ${lt.color} 20%, var(--surface-2))` }}
            >
              {lt.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{lt.label}</p>
                <Pill label={lt.paid ? t("lt.paid.label") : t("lt.unpaid.label")} color={lt.paid ? "#10b981" : "#94a3b8"} />
                {lt.defaultAllowance != null && (
                  <Pill label={`${lt.defaultAllowance} ${t("lt.allowance.unit")}`} color={lt.color} />
                )}
              </div>
              <p className="text-[11px] mt-0.5 font-mono" style={{ color: "var(--ink-mute)" }}>{lt.key}</p>
            </div>
            <RowActions onEdit={() => setEditing(lt)} onDelete={() => setDeleting(lt)} />
          </div>
        ))}
      </div>

      {showNew && (
        <LeaveTypeEditor
          key="new"
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); onChange(); }}
        />
      )}

      {editing && (
        <LeaveTypeEditor
          key={editing.id}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChange(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={archive}
        loading={deletingNow}
        title={t("lt.archive.title")}
        message={t("lt.archive.body", { label: deleting?.label ?? "" })}
        confirmLabel={t("lt.archive.confirm")}
      />
    </div>
  );
}

function LeaveTypeEditor({
  existing, onClose, onSaved,
}: { existing?: LeaveType; onClose: () => void; onSaved: () => void }) {
  const [key, setKey]               = useState(existing?.key ?? "");
  const [label, setLabel]           = useState(existing?.label ?? "");
  const [emoji, setEmoji]           = useState(existing?.emoji ?? "🍃");
  const [color, setColor]           = useState(existing?.color ?? "#7c5cff");
  const [defaultAllowance, setDefaultAllowance] = useState<string>(existing?.defaultAllowance != null ? String(existing.defaultAllowance) : "");
  const [paid, setPaid]             = useState(existing?.paid ?? true);
  const [saving, setSaving]         = useState(false);
  const t = useT();

  async function save() {
    if (!label) return toast.error(t("lt.toast.required"));
    if (!existing && !key) return toast.error(t("lt.toast.keyRequired"));
    setSaving(true);
    try {
      const url = existing ? `/api/leave-types/${existing.id}` : "/api/leave-types";
      const method = existing ? "PATCH" : "POST";
      const body = existing
        ? { label, emoji, color, defaultAllowance: defaultAllowance ? parseFloat(defaultAllowance) : null, paid }
        : { key, label, emoji, color, defaultAllowance: defaultAllowance ? parseFloat(defaultAllowance) : null, paid };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("card.toast.failed"));
      toast.success(existing ? t("lt.toast.saved") : t("lt.toast.created"));
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("card.toast.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={existing ? t("lt.edit.title") : t("lt.add.title")}
      subtitle={existing ? t("lt.editing", { label: existing.label }) : t("lt.add.subtitle")}
      size="md"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <FieldLabel>{t("lt.field.emoji")}</FieldLabel>
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
          </div>
          {!existing && (
            <div className="col-span-2">
              <FieldLabel>{t("lt.field.key")}</FieldLabel>
              <Input value={key} onChange={(e) => setKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))} placeholder="study" />
            </div>
          )}
          <div className={existing ? "col-span-2" : "col-span-3"}>
            <FieldLabel>{t("lt.field.label")}</FieldLabel>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
        </div>

        <div>
          <FieldLabel>{t("lt.field.color")}</FieldLabel>
          <ColorInput value={color} onChange={setColor} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>{t("lt.field.allowance")}</FieldLabel>
            <Input
              type="number" min="0" step="0.5"
              value={defaultAllowance}
              onChange={(e) => setDefaultAllowance(e.target.value)}
              placeholder={t("lt.allowance.unit")}
            />
          </div>
          <div>
            <FieldLabel>{t("lt.field.paid")}</FieldLabel>
            <Select value={paid ? "yes" : "no"} onChange={(e) => setPaid(e.target.value === "yes")}>
              <option value="yes">{t("lt.paid.yes")}</option>
              <option value="no">{t("lt.paid.no")}</option>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t("btn.cancel")}</Button>
          <Button className="flex-1" loading={saving} onClick={save}>
            <Save size={14} />
            {existing ? t("btn.save") : t("lt.create")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Holidays section                                                 */
/* ─────────────────────────────────────────────────────────────── */
function HolidaysSection({ holidays, onChange }: { holidays: Holiday[]; onChange: () => void }) {
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [deleting, setDeleting] = useState<Holiday | null>(null);
  const [deletingNow, setDeletingNow] = useState(false);
  const t = useT();

  async function remove() {
    if (!deleting) return;
    setDeletingNow(true);
    try {
      const res = await fetch(`/api/holidays/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success(t("hol.toast.removed"));
      setDeleting(null);
      onChange();
    } catch {
      toast.error(t("card.toast.failed"));
    } finally { setDeletingNow(false); }
  }

  return (
    <div className="rounded-3xl p-6 space-y-5" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
          {t("hol.section.title", { year: new Date().getFullYear() })}
        </h2>
        <Button size="sm" variant="secondary" onClick={() => setShowNew(true)}>
          <Plus size={13} />
          {t("hol.add")}
        </Button>
      </div>

      <div className="space-y-2">
        {holidays.length === 0 && (
          <p className="text-sm italic" style={{ color: "var(--ink-faint)" }}>{t("hol.empty")}</p>
        )}
        {holidays.map((h) => (
          <div
            key={h.id}
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
          >
            <div
              className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-white shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--brand))" }}
            >
              <span className="text-[8px] font-bold uppercase leading-none">
                {new Date(h.date).toLocaleString("en-US", { month: "short" })}
              </span>
              <span className="text-base font-black leading-none">{new Date(h.date).getDate()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{h.name}</p>
                <Pill
                  label={h.source === "company" ? t("hol.tag.company") : t("hol.tag.public")}
                  color={h.source === "company" ? "#7c5cff" : "#10b981"}
                />
                {h.recurring && <Pill label={t("hol.tag.annual")} color="#f59e0b" />}
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
                {new Date(h.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <RowActions onEdit={() => setEditing(h)} onDelete={() => setDeleting(h)} />
          </div>
        ))}
      </div>

      {showNew && (
        <HolidayEditor
          key="new"
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); onChange(); }}
        />
      )}

      {editing && (
        <HolidayEditor
          key={editing.id}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChange(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={deletingNow}
        title={t("hol.delete.title")}
        message={t("hol.delete.body", { name: deleting?.name ?? "" })}
        confirmLabel={t("hol.delete.confirm")}
      />
    </div>
  );
}

function HolidayEditor({
  existing, onClose, onSaved,
}: { existing?: Holiday; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [name, setName] = useState(existing?.name ?? "");
  const [date, setDate] = useState(existing?.date ? existing.date.slice(0, 10) : "");
  const [recurring, setRecurring] = useState(existing?.recurring ?? false);
  const [source, setSource] = useState<"company" | "public">((existing?.source as "company" | "public") ?? "company");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name || !date) return toast.error(t("hol.toast.required"));
    setSaving(true);
    try {
      const url = existing ? `/api/holidays/${existing.id}` : "/api/holidays";
      const method = existing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, date, recurring, source }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(existing ? t("hol.toast.saved") : t("hol.toast.added"));
      onSaved();
    } catch {
      toast.error(t("card.toast.failed"));
    } finally { setSaving(false); }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={existing ? t("hol.edit.title") : t("hol.add.title")}
      size="md"
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>{t("hol.field.name")}</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("hol.placeholder")} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <FieldLabel>{t("hol.field.date")}</FieldLabel>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <FieldLabel>{t("hol.field.repeats")}</FieldLabel>
            <Select value={recurring ? "yes" : "no"} onChange={(e) => setRecurring(e.target.value === "yes")}>
              <option value="no">{t("hol.repeats.once")}</option>
              <option value="yes">{t("hol.repeats.annual")}</option>
            </Select>
          </div>
        </div>
        <div>
          <FieldLabel>{t("hol.field.type")}</FieldLabel>
          <Select value={source} onChange={(e) => setSource(e.target.value as "company" | "public")}>
            <option value="company">{t("hol.source.company")}</option>
            <option value="public">{t("hol.source.public")}</option>
          </Select>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t("btn.cancel")}</Button>
          <Button className="flex-1" loading={saving} onClick={save}>
            <Save size={14} />
            {existing ? t("btn.save") : t("hol.add")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Departments section                                              */
/* ─────────────────────────────────────────────────────────────── */
function DepartmentsSection({ depts, onChange }: { depts: Department[]; onChange: () => void }) {
  const t = useT();
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [deletingNow, setDeletingNow] = useState(false);

  async function remove() {
    if (!deleting) return;
    setDeletingNow(true);
    try {
      const res = await fetch(`/api/departments/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success(t("dept.toast.removed"));
      setDeleting(null);
      onChange();
    } catch {
      toast.error(t("card.toast.failed"));
    } finally { setDeletingNow(false); }
  }

  function deleteMessage(d: Department | null): string {
    if (!d) return "";
    const members = d._count?.members ?? 0;
    if (members === 0) return t("dept.delete.bodyEmpty", { name: d.name });
    if (members === 1) return t("dept.delete.bodyOneMember", { name: d.name });
    return t("dept.delete.bodyMembers", { name: d.name, count: members });
  }

  return (
    <div className="rounded-3xl p-6 space-y-5" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{t("dept.section.title")}</h2>
        <Button size="sm" variant="secondary" onClick={() => setShowNew(true)}>
          <Plus size={13} />
          {t("dept.add")}
        </Button>
      </div>

      {depts.length === 0 && (
        <p className="text-sm italic" style={{ color: "var(--ink-faint)" }}>{t("dept.empty")}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {depts.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
          >
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{d.name}</p>
              <p className="text-[11px]" style={{ color: "var(--ink-mute)" }}>
                {d._count?.members ?? 0} {d._count?.members === 1 ? t("dept.member") : t("dept.members")}
              </p>
            </div>
            <RowActions onEdit={() => setEditing(d)} onDelete={() => setDeleting(d)} />
          </div>
        ))}
      </div>

      {showNew && (
        <DepartmentEditor
          key="new"
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); onChange(); }}
        />
      )}

      {editing && (
        <DepartmentEditor
          key={editing.id}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChange(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={deletingNow}
        title={t("dept.delete.title")}
        message={deleteMessage(deleting)}
        confirmLabel={t("dept.delete.confirm")}
      />
    </div>
  );
}

function DepartmentEditor({
  existing, onClose, onSaved,
}: { existing?: Department; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [name, setName] = useState(existing?.name ?? "");
  const [color, setColor] = useState(existing?.color ?? "#7c5cff");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name) return toast.error(t("dept.toast.required"));
    setSaving(true);
    try {
      const url = existing ? `/api/departments/${existing.id}` : "/api/departments";
      const method = existing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(existing ? t("dept.toast.saved") : t("dept.toast.added"));
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("card.toast.failed"));
    } finally { setSaving(false); }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={existing ? t("dept.edit.title") : t("dept.add.title")}
      size="md"
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>{t("dept.field.name")}</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("dept.placeholder")} />
        </div>
        <div>
          <FieldLabel>{t("dept.field.color")}</FieldLabel>
          <ColorInput value={color} onChange={setColor} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t("btn.cancel")}</Button>
          <Button className="flex-1" loading={saving} onClick={save}>
            <Save size={14} />
            {existing ? t("btn.save") : t("dept.add")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* iCal section                                                     */
/* ─────────────────────────────────────────────────────────────── */
function ICalSection({ company }: { company: Company }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/api/ical/${company.icalToken}`
    : `/api/ical/${company.icalToken}`;

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t("ical.toast.copied"));
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-3xl p-6 space-y-5" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
      <div>
        <h2 className="text-base font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
          {t("ical.section.title")}
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
          {t("ical.subtitle")}
        </p>
      </div>

      <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}>
        <LinkIcon size={16} style={{ color: "var(--ink-mute)" }} />
        <input
          readOnly
          value={url}
          className="bg-transparent flex-1 outline-none text-xs font-mono truncate"
          style={{ color: "var(--ink)" }}
        />
        <Button size="sm" variant="secondary" onClick={copy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? t("ical.copied") : t("ical.copy")}
        </Button>
      </div>

      <div className="text-xs space-y-2" style={{ color: "var(--ink-soft)" }}>
        <p className="font-bold uppercase tracking-wider text-[10px]" style={{ color: "var(--ink-mute)" }}>
          {t("ical.howTo")}
        </p>
        <p>• {t("ical.google")}</p>
        <p>• {t("ical.outlook")}</p>
        <p>• {t("ical.apple")}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Shared row actions (edit + delete)                               */
/* ─────────────────────────────────────────────────────────────── */
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={onEdit}
        className="p-2 rounded-full transition-all"
        style={{ color: "var(--ink-soft)" }}
        aria-label="Edit"
        title="Edit"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={onDelete}
        className="p-2 rounded-full transition-all"
        style={{ color: "var(--ink-faint)" }}
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
