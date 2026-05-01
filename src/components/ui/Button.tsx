"use client";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) => {
    const sizes = {
      sm: "px-3.5 py-1.5 text-xs",
      md: "px-5 py-2.5 text-sm",
      lg: "px-5 py-2.5 text-sm sm:px-7 sm:py-3.5 sm:text-base",
    };

    const base =
      "relative inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 disabled:opacity-55 disabled:cursor-not-allowed select-none active:scale-[0.98] enabled:hover:-translate-y-0.5";

    if (variant === "primary") {
      return (
        <button
          ref={ref}
          disabled={disabled || loading}
          className={cn(base, sizes[size], "text-white brand-glow btn-pop", className)}
          style={{
            background: "linear-gradient(135deg, var(--brand), color-mix(in oklab, var(--brand) 70%, var(--accent)))",
          }}
          {...props}
        >
          {loading && <Spinner />}
          {children}
        </button>
      );
    }

    if (variant === "danger") {
      return (
        <button
          ref={ref}
          disabled={disabled || loading}
          className={cn(base, sizes[size], "text-white btn-pop", className)}
          style={{
            background: "linear-gradient(135deg, #ff6b6b, #ef4444)",
            boxShadow: "0 12px 28px -8px rgba(239,68,68,0.45)",
          }}
          {...props}
        >
          {loading && <Spinner />}
          {children}
        </button>
      );
    }

    if (variant === "success") {
      return (
        <button
          ref={ref}
          disabled={disabled || loading}
          className={cn(base, sizes[size], "text-white btn-pop", className)}
          style={{
            background: "linear-gradient(135deg, #34d399, #10b981)",
            boxShadow: "0 12px 28px -8px rgba(16,185,129,0.4)",
          }}
          {...props}
        >
          {loading && <Spinner />}
          {children}
        </button>
      );
    }

    if (variant === "secondary") {
      return (
        <button
          ref={ref}
          disabled={disabled || loading}
          className={cn(base, sizes[size], "text-[color:var(--ink)] soft-pill soft-press enabled:hover:shadow-[var(--soft-2)]", className)}
          {...props}
        >
          {loading && <Spinner />}
          {children}
        </button>
      );
    }

    // ghost
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          base,
          sizes[size],
          "text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] hover:bg-[color:var(--brand-soft)]",
          className
        )}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

function Spinner() {
  return <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}
