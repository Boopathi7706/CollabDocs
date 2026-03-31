import { cn } from "../../lib/utils";

interface AvatarProps {
  name: string;
  image?: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "offline" | "away";
  showBorder?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { container: "h-6 w-6", text: "text-[10px]", status: "h-1.5 w-1.5" },
  md: { container: "h-8 w-8", text: "text-sm", status: "h-2 w-2" },
  lg: { container: "h-10 w-10", text: "text-base", status: "h-2.5 w-2.5" },
};

const statusColor = {
  online: "bg-emerald-500",
  offline: "bg-gray-400",
  away: "bg-amber-400",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getColor(name: string) {
  const colors = [
    "bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500",
    "bg-rose-500","bg-indigo-500","bg-teal-500","bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, image, size = "md", status, showBorder, className }: AvatarProps) {
  const sizes = sizeConfig[size];
  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          sizes.container,
          "rounded-full flex items-center justify-center font-medium text-white ring-2",
          showBorder ? "ring-background" : "ring-transparent",
          !image && getColor(name)
        )}
      >
        {image ? (
          <img src={image} alt={name} className="h-full w-full rounded-full object-cover" />
        ) : (
          <span className={sizes.text}>{getInitials(name)}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-background",
            sizes.status,
            statusColor[status]
          )}
        />
      )}
    </div>
  );
}
