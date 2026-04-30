"use client";
import { ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function AppShell({
  children,
  companyName,
  companyTagline,
  companyLogoUrl,
  userAvatarUrl,
  maxWidth = "max-w-5xl",
}: {
  children: ReactNode;
  companyName: string;
  companyTagline?: string | null;
  companyLogoUrl?: string | null;
  userAvatarUrl?: string | null;
  maxWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="flex min-h-screen md:h-screen md:overflow-hidden">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(28, 22, 64, 0.42)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed off-canvas on mobile, in-flow on md+ */}
      <div
        className={`fixed md:sticky top-0 left-0 z-50 h-screen transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:flex-shrink-0`}
      >
        <Sidebar
          companyName={companyName}
          companyTagline={companyTagline}
          logoUrl={companyLogoUrl}
          userAvatarUrl={userAvatarUrl}
        />
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 md:overflow-y-auto w-full">
        {/* Mobile top bar */}
        <div
          className="md:hidden sticky top-0 z-30 px-4 py-3 flex items-center justify-between"
          style={{ background: "var(--bg)", borderBottom: "1px solid var(--line)" }}
        >
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)", color: "var(--ink)" }}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            {companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companyLogoUrl}
                alt={companyName}
                width={28}
                height={28}
                className="w-7 h-7 rounded-lg object-cover"
                style={{ boxShadow: "var(--soft-press-sm)" }}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg, var(--brand), var(--accent))" }}
              >
                <Sparkles size={12} />
              </div>
            )}
            <p className="font-extrabold text-sm tracking-tight truncate" style={{ color: "var(--ink)" }}>
              {companyName}
            </p>
          </div>
          <div className="w-9" /> {/* Spacer to balance the hamburger */}
        </div>

        <div className={`${maxWidth} mx-auto px-4 sm:px-6 py-6 sm:py-8`}>{children}</div>
      </main>
    </div>
  );
}
