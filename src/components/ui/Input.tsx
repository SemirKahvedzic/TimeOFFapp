"use client";
import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

const INPUT_BASE =
  "w-full text-sm rounded-2xl px-4 py-3 outline-none transition-shadow border-0";
const INPUT_STYLE: React.CSSProperties = {
  background: "var(--surface)",
  color: "var(--ink)",
  boxShadow: "var(--soft-press-sm)",
};

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(INPUT_BASE, "focus:[box-shadow:var(--soft-press),0_0_0_2px_var(--brand-soft)]", className)}
      style={{ ...INPUT_STYLE, ...style }}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", style, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(INPUT_BASE, "resize-none focus:[box-shadow:var(--soft-press),0_0_0_2px_var(--brand-soft)]", className)}
      style={{ ...INPUT_STYLE, ...style }}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", style, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(INPUT_BASE, "appearance-none pr-9 focus:[box-shadow:var(--soft-press),0_0_0_2px_var(--brand-soft)]", className)}
      style={{
        ...INPUT_STYLE,
        ...style,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%238d8aa3' stroke-width='1.6' stroke-linecap='round'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 14px center",
      }}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export function FieldLabel({
  children,
  hint,
  className = "",
}: {
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex items-center justify-between mb-2", className)}>
      <span
        className="text-[10px] font-bold uppercase tracking-[0.16em]"
        style={{ color: "var(--ink-mute)" }}
      >
        {children}
      </span>
      {hint && (
        <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}
