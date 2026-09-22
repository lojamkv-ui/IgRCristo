"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconAlert, IconX } from "@/components/icons";
import { Button } from "@/components/ui/primitives";

type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-6xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move o foco para o painel, melhorando a navegação por teclado.
    const focusTarget = panelRef.current?.querySelector<HTMLElement>(
      "[data-autofocus], input, textarea, select, button",
    );
    focusTarget?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4 print:static print:block print:p-0">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar"
        onClick={() => (closeOnBackdrop ? onClose() : undefined)}
        className="animate-fade-in absolute inset-0 h-full w-full cursor-default bg-ink-950/60 backdrop-blur-[3px] print:hidden"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Janela"}
        className={`animate-pop-in relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop sm:rounded-2xl print:max-h-none print:overflow-visible print:rounded-none print:shadow-none ${SIZE_CLASS[size]} print-full`}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 py-3.5 sm:px-5 print:hidden">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-bold text-ink-950 sm:text-lg">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[13px] leading-snug text-ink-500">{description}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="icon-btn -mr-1 shrink-0" aria-label="Fechar janela">
            <IconX size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {children}
        </div>

        {footer ? (
          <footer className="flex flex-col-reverse gap-2 border-t border-line bg-surface/60 px-4 py-3 sm:flex-row sm:justify-end sm:px-5 print:hidden">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading} type="button">
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
            type="button"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            tone === "danger" ? "bg-danger-soft text-danger" : "bg-brand-50 text-brand-600"
          }`}
        >
          <IconAlert size={20} />
        </span>
        <div className="text-sm leading-relaxed text-ink-600">{message}</div>
      </div>
    </Modal>
  );
}
