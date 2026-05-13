import { useEffect } from "react";
import { Button } from "./Button";

export interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmVariant = "primary",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(45,38,64,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        className="bg-white"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: 16,
          padding: 28,
          maxWidth: 420,
          width: "calc(100% - 32px)",
          boxShadow: "0 20px 60px rgba(45,38,64,0.25)",
        }}
      >
        <h3
          className="font-display text-aubergine"
          style={{ fontSize: 20, marginBottom: 8 }}
        >
          {title}
        </h3>
        <p className="text-[13px] text-aubergine-light mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            variant={confirmVariant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
