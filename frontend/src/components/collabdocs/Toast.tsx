import { useEffect } from "react";
import { cn } from "../../lib/utils";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, type, onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium",
        "animate-in fade-in slide-in-from-bottom-5 duration-200 backdrop-blur-md",
        type === "success"
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
          : "bg-destructive/10 border-destructive/20 text-destructive dark:bg-destructive/20 dark:text-destructive-foreground"
      )}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="opacity-70 hover:opacity-100 transition-opacity ml-2 focus:outline-none"
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
