"use client";
import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  /**
   * When false, clicking the backdrop and pressing Escape are no-ops; the
   * modal can only be closed via the X button. Use for forms where losing
   * half-entered data on a stray click would be annoying.
   */
  dismissible?: boolean;
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Modal({ open, onClose, title, subtitle, children, size = "md", dismissible = true }: ModalProps) {
  useEffect(() => {
    if (!dismissible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: "rgba(28, 22, 64, 0.42)" }}
        onClick={dismissible ? onClose : undefined}
      />
      <div
        // 100dvh accounts for mobile browser chrome (URL bar, etc.) so the
        // modal really fits the visible viewport. flex-col + scrollable
        // body keeps the header pinned while long forms scroll inside the
        // modal instead of extending past the screen edges.
        className={`relative z-10 w-full ${SIZES[size]} max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col rounded-[28px] overflow-hidden`}
        style={{
          background: "var(--surface-2)",
          boxShadow: "var(--soft-2), 0 30px 80px -20px rgba(28,22,64,0.35)",
        }}
      >
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-mute)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-all shrink-0"
            style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
            aria-label="Close"
          >
            <X size={14} style={{ color: "var(--ink-soft)" }} />
          </button>
        </div>
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
