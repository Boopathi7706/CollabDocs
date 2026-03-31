import { cn } from "../../lib/utils";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

type ConnectionState = "connected" | "disconnected" | "reconnecting";

interface ConnectionStatusProps {
  status: ConnectionState;
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
}

const statusConfig = {
  connected: {
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
    label: "Connected",
    icon: Wifi,
  },
  disconnected: {
    dotColor: "bg-rose-500",
    textColor: "text-rose-600 dark:text-rose-400",
    label: "Disconnected",
    icon: WifiOff,
  },
  reconnecting: {
    dotColor: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
    label: "Reconnecting...",
    icon: Loader2,
  },
};

export function ConnectionStatus({
  status,
  className,
  showIcon = false,
  showLabel = true,
}: ConnectionStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {showIcon ? (
        <Icon
          className={cn(
            "h-4 w-4",
            config.textColor,
            status === "reconnecting" && "animate-spin"
          )}
        />
      ) : (
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            config.dotColor,
            status === "reconnecting" && "animate-pulse"
          )}
        />
      )}
      {showLabel && (
        <span className={cn("text-xs font-medium", config.textColor)}>
          {config.label}
        </span>
      )}
    </div>
  );
}
