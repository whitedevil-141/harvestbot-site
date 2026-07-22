"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button, FOCUS, IconButton } from "./controls";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useDialogBehaviour(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const node = ref.current;
    node?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const focusable = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return ref;
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
}) {
  const ref = useDialogBehaviour(onClose);

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={`adm-enter flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl border border-adm-line bg-adm-surface shadow-2xl shadow-black/70 ${
          size === "lg" ? "max-w-3xl" : "max-w-md"
        }`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-adm-line px-5 py-4">
          <h2 className="min-w-0 truncate text-sm font-semibold text-adm-text">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="adm-scroll flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex gap-2 border-t border-adm-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/** A right-hand panel, for long content that reads better tall than wide. */
export function Drawer({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useDialogBehaviour(onClose);

  return (
    <div className="fixed inset-0 z-90 flex justify-end bg-black/75 backdrop-blur-sm">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="flex-1 cursor-default" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={`flex h-full w-full max-w-2xl flex-col border-l border-adm-line bg-adm-surface ${FOCUS}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-adm-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-adm-text">{title}</h2>
            {subtitle && <div className="mt-1.5 flex flex-wrap items-center gap-2">{subtitle}</div>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="adm-scroll flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-adm-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Delete",
  pending,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1" variant="danger" loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[13px] leading-relaxed text-adm-dim">{body}</div>
    </Modal>
  );
}
