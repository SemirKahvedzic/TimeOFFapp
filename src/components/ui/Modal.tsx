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
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Modal({ open, onClose, title, subtitle, children, size = "md" }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: "rgba(28, 22, 64, 0.42)" }}
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full ${SIZES[size]} rounded-[28px] overflow-hidden`}
        style={{
          background: "var(--surface-2)",
          boxShadow: "var(--soft-2), 0 30px 80px -20px rgba(28,22,64,0.35)",
        }}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-3">
          <div>
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
            className="rounded-full p-2 transition-all"
            style={{ background: "var(--surface)", boxShadow: "var(--soft-press-sm)" }}
            aria-label="Close"
          >
            <X size={14} style={{ color: "var(--ink-soft)" }} />
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
