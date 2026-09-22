"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconAlert, IconCheckCircle, IconInfo, IconX } from "@/components/icons";

type ToastKind = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
};

type ToastContextValue = {
  toast: (kind: ToastKind, title: string, description?: string) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastKind, { ring: string; icon: ReactNode; bar: string }> = {
  success: {
    ring: "border-success/30",
    bar: "bg-success",
    icon: <IconCheckCircle size={18} className="text-success" />,
  },
  error: {
    ring: "border-danger/30",
    bar: "bg-danger",
    icon: <IconAlert size={18} className="text-danger" />,
  },
  warning: {
    ring: "border-warning/30",
    bar: "bg-warning",
    icon: <IconAlert size={18} className="text-warning" />,
  },
  info: {
    ring: "border-brand-300",
    bar: "bg-brand-500",
    icon: <IconInfo size={18} className="text-brand-600" />,
  },
};

const DURATION = 4800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (kind: ToastKind, title: string, description?: string) => {
      counter.current += 1;
      const id = counter.current;
      setItems((current) => [...current.slice(-3), { id, kind, title, description }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[120] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end"
        role="region"
        aria-label="Notificações"
      >
        <div aria-live="polite" aria-atomic="false" className="contents">
          {items.map((item) => {
            const style = STYLES[item.kind];
            return (
              <div
                key={item.id}
                className={`animate-pop-in pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border bg-white/95 px-4 py-3 shadow-pop backdrop-blur ${style.ring}`}
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} aria-hidden="true" />
                <span className="mt-0.5 shrink-0">{style.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-600">{item.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="icon-btn -mr-1 h-7 w-7 shrink-0"
                  aria-label="Fechar notificação"
                >
                  <IconX size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast deve ser usado dentro de <ToastProvider>.");
  return context;
}
