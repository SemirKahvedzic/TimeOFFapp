"use client";
import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useT } from "@/lib/i18n/context";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel,
  cancelLabel,
  loading = false,
  destructive = true,
}: ConfirmDialogProps) {
  const t = useT();
  const finalConfirm = confirmLabel ?? t("btn.confirm");
  const finalCancel  = cancelLabel  ?? t("btn.cancel");
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={
              destructive
                ? { background: "var(--err-bg)", color: "var(--err)" }
                : { background: "var(--brand-soft)", color: "var(--brand)" }
            }
          >
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 text-sm" style={{ color: "var(--ink-soft)" }}>
            {message}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            {finalCancel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {finalConfirm}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
