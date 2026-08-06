"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolver = useRef<(value: boolean) => void>();

  const confirmFn = useCallback<ConfirmFn>((options) => {
    setState({ ...options, open: true });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function handleConfirm() {
    resolver.current?.(true);
    setState((s) => (s ? { ...s, open: false } : s));
  }

  function handleCancel() {
    resolver.current?.(false);
    setState((s) => (s ? { ...s, open: false } : s));
  }

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      {state && (
        <ConfirmDialog
          open={state.open}
          title={state.title}
          message={state.message}
          confirmLabel={state.confirmLabel}
          cancelLabel={state.cancelLabel}
          danger={state.danger}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

// Remplace window.confirm() par une boîte de dialogue au design du site.
// Usage : const ok = await confirmDialog({ title: "...", message: "..." }); if (!ok) return;
export function useConfirm() {
  return useContext(ConfirmContext);
}
