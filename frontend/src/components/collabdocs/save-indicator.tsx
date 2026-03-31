import { cn } from "../../lib/utils";
import { Check, Cloud, AlertCircle } from "lucide-react";

type SaveStatus = "saved" | "saving" | "syncing" | "error";

interface SaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date | null;
  className?: string;
}

const statusConfig = {
  saved: {
    icon: Check,
    text: "Saved",
    classes: "text-emerald-600 dark:text-emerald-400",
    spin: false,
  },
  saving: {
    icon: Cloud,
    text: "Saving...",
    classes: "text-muted-foreground",
    spin: false,
  },
  syncing: {
    icon: Cloud,
    text: "Syncing...",
    classes: "text-blue-500",
    spin: true,
  },
  error: {
    icon: AlertCircle,
    text: "Error saving",
    classes: "text-destructive",
    spin: false,
  },
};

export function SaveIndicator({ status, lastSaved, className }: SaveIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", config.classes, className)}>
      <Icon className={cn("h-3.5 w-3.5", config.spin && "animate-spin")} />
      <span>{config.text}</span>
      {status === "saved" && lastSaved && (
        <span className="text-muted-foreground hidden sm:inline">
          · {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}
