"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";

interface Toast {
  id: number;
  message: ReactNode;
  tone: "success" | "error" | "neutral";
  action?: { label: string; run: () => void };
}

type ShowToast = (toast: Omit<Toast, "id">) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}

const DURATION_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ShowToast>(
    (toast) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((all) => [...all.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-xl animate-toast-in items-center gap-3 rounded-xl bg-ink py-2.5 pr-2 pl-3.5 text-[13px] text-white shadow-pop"
          >
            {toast.tone === "success" && (
              <CircleCheck aria-hidden className="size-4 shrink-0 text-emerald-300" />
            )}
            {toast.tone === "error" && (
              <CircleAlert aria-hidden className="size-4 shrink-0 text-red-300" />
            )}
            <div className="min-w-0 flex-1 leading-5">{toast.message}</div>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run();
                  dismiss(toast.id);
                }}
                className="rounded-md px-2 py-1 font-semibold text-[#a9bcff] hover:bg-white/10"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
              className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
