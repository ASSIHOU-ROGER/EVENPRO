"use client";
import { AlertTriangle, X } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="card w-full max-w-sm !p-0 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-6 pb-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" : "bg-gold/10 text-gold"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-6 py-4">
          <button onClick={onCancel} className="btn-secondary py-1.5 px-4 text-[11px]">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={
              danger
                ? "btn py-1.5 px-4 text-[11px] bg-red-600 text-white shadow-md hover:bg-red-700"
                : "btn-primary py-1.5 px-4 text-[11px]"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
