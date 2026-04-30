"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Calendar, Users, LogOut, BarChart3, CalendarCheck,
  Settings, PieChart, Sparkles, SlidersHorizontal, UserCog,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";

const employeeNav: { href: string; key: MessageKey; icon: React.ElementType }[] = [
  { href: "/dashboard",   key: "nav.home",        icon: LayoutDashboard },
  { href: "/calendar",    key: "nav.calendar",    icon: Calendar },
  { href: "/preferences", key: "nav.preferences", icon: SlidersHorizontal },
];

const adminNav: { href: string; key: MessageKey; icon: React.ElementType }[] = [
  { href: "/admin",          key: "nav.overview",    icon: BarChart3 },
  { href: "/admin/requests", key: "nav.requests",    icon: CalendarCheck },
  { href: "/calendar",       key: "nav.calendar",    icon: Calendar },
  { href: "/admin/users",    key: "nav.team",        icon: Users },
  { href: "/admin/reports",  key: "nav.reports",     icon: PieChart },
  { href: "/admin/settings", key: "nav.settings",    icon: Settings },
  { href: "/preferences",    key: "nav.account",     icon: UserCog },
];

interface SidebarProps {
  companyName: string;
  companyTagline?: string | null;
  logoUrl?: string | null;
  userAvatarUrl?: string | null;
}

export function Sidebar({ companyName, companyTagline, logoUrl, userAvatarUrl }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useT();
  const isAdmin = session?.user?.role === "admin";
  const nav = isAdmin ? adminNav : employeeNav;

  return (
    <aside
      className="w-72 shrink-0 flex flex-col h-screen sticky top-0 px-3.5 py-4"
      style={{ background: "var(--bg)" }}
    >
      {/* ── Brand ── */}
      <div
        className="px-3.5 py-3 mb-5 rounded-2xl"
        style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}
      >
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={companyName}
              width={56}
              height={56}
              className="w-14 h-14 rounded-2xl object-cover shrink-0"
              style={{ boxShadow: "var(--soft-press-sm)" }}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--brand), var(--accent))",
                boxShadow: "var(--glow-brand)",
              }}
            >
              <Sparkles size={22} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p
              className="text-[13px] font-extrabold tracking-tight truncate leading-tight"
              style={{ color: "var(--ink)" }}
            >
              {companyName}
            </p>
            <p className="text-[10px] truncate" style={{ color: "var(--ink-mute)" }}>
              {companyTagline || t("nav.taglineFallback")}
            </p>
          </div>
          {isAdmin && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
            >
              ADMIN
            </span>
          )}
        </div>
      </div>

      {/* ── Section heading ── */}
      <p
        className="text-[9px] font-bold uppercase tracking-[0.2em] px-3 mb-2"
        style={{ color: "var(--ink-faint)" }}
      >
        {t("nav.workspace")}
      </p>

      {/* ── Nav ── */}
      <nav className="flex-1 space-y-1">
        {nav.map(({ href, key, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200"
              data-key={key}
              style={
                active
                  ? {
                      color: "var(--ink)",
                      background: "var(--surface-2)",
                      boxShadow: "var(--soft-1)",
                      fontWeight: 700,
                    }
                  : {
                      color: "var(--ink-soft)",
                      fontWeight: 500,
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "var(--surface)";
                  e.currentTarget.style.color = "var(--ink)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--ink-soft)";
                }
              }}
            >
              {active && (
                <span
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
                  style={{ background: "linear-gradient(180deg, var(--brand), var(--accent))" }}
                />
              )}
              <Icon
                size={15}
                style={{ color: active ? "var(--brand)" : "var(--ink-mute)" }}
              />
              {t(key)}
            </Link>
          );
        })}
      </nav>

      {/* ── User card ── */}
      <div
        className="mt-3 p-2.5 rounded-2xl"
        style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}
      >
        <div className="flex items-center gap-2.5">
          <Avatar name={session?.user?.name ?? "?"} size={32} className="rounded-full" imageUrl={userAvatarUrl} />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold truncate leading-tight" style={{ color: "var(--ink)" }}>
              {session?.user?.name}
            </p>
            <p className="text-[10px] truncate" style={{ color: "var(--ink-mute)" }}>
              {session?.user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-150 active:scale-[0.98] hover:-translate-y-0.5"
          style={{
            background: "var(--surface)",
            color: "var(--ink-soft)",
            boxShadow: "var(--soft-press-sm)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--ink)";
            e.currentTarget.style.boxShadow = "var(--soft-2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--ink-soft)";
            e.currentTarget.style.boxShadow = "var(--soft-press-sm)";
          }}
        >
          <LogOut size={11} />
          {t("nav.signOut")}
        </button>
      </div>
    </aside>
  );
}
