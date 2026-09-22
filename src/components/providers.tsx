"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { consumeFlash } from "@/lib/client";

type Toast = { id: number; kind: "success" | "error" | "info"; message: string };
type ToastContextValue = { push: (message: string, kind?: Toast["kind"]) => void };
type GuardContextValue = {
  dirty: boolean;
  setDirty: (value: boolean) => void;
  confirmLeave: () => Promise<boolean>;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const GuardContext = createContext<GuardContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("Toast indisponível.");
  return context;
}

export function useGuard() {
  const context = useContext(GuardContext);
  if (!context) throw new Error("Proteção de saída indisponível.");
  return context;
}

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dirty, setDirtyState] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const dirtyRef = useRef(false);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const push = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4600);
  }, []);

  useEffect(() => {
    const message = consumeFlash();
    if (message) push(message);
  }, [pathname, push]);

  const setDirty = useCallback((value: boolean) => {
    dirtyRef.current = value;
    setDirtyState(value);
  }, []);

  const confirmLeave = useCallback(() => {
    if (!dirtyRef.current) return Promise.resolve(true);
    setLeaveOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const closeLeave = (accepted: boolean) => {
    if (accepted) {
      dirtyRef.current = false;
      setDirtyState(false);
    }
    setLeaveOpen(false);
    resolver.current?.(accepted);
    resolver.current = null;
  };

  const toastValue = useMemo(() => ({ push }), [push]);
  const guardValue = useMemo(() => ({ dirty, setDirty, confirmLeave }), [dirty, setDirty, confirmLeave]);

  return (
    <ToastContext.Provider value={toastValue}>
      <GuardContext.Provider value={guardValue}>
        {children}
        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>
              {toast.message}
            </div>
          ))}
        </div>
        {leaveOpen ? (
          <div className="modal-backdrop" role="presentation" onMouseDown={() => closeLeave(false)}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="leave-title" onMouseDown={(event) => event.stopPropagation()}>
              <p className="kicker">Alterações sem salvar</p>
              <h2 id="leave-title">Sair sem guardar?</h2>
              <p>O que você preencheu ainda não foi salvo. Se sair agora, essas mudanças podem se perder.</p>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => closeLeave(false)}>Continuar editando</button>
                <button type="button" className="btn btn-danger" onClick={() => closeLeave(true)}>Sair sem salvar</button>
              </div>
            </div>
          </div>
        ) : null}
      </GuardContext.Provider>
    </ToastContext.Provider>
  );
}

export function GuardedLink({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const router = useRouter();
  const guard = useGuard();
  const go = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onClick?.();
    if (await guard.confirmLeave()) router.push(href);
  };
  return (
    <a href={href} className={className} onClick={go}>
      {children}
    </a>
  );
}
