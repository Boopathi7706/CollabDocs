import { Avatar } from "./avatar";
import { cn } from "../../lib/utils";

interface User {
  id: string;
  name: string;
  image?: string;
}

interface PresenceProps {
  users: User[];
  maxVisible?: number;
  size?: "sm" | "md";
  className?: string;
}

export function Presence({ users, maxVisible = 5, size = "md", className }: PresenceProps) {
  const visible = users.slice(0, maxVisible);
  const overflow = users.length - maxVisible;

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-2">
        {visible.map((user) => (
          <Avatar
            key={user.id}
            name={user.name}
            image={user.image}
            size={size}
            showBorder
          />
        ))}
        {overflow > 0 && (
          <div
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "bg-secondary text-secondary-foreground font-medium ring-2 ring-background",
              size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
            )}
          >
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}
