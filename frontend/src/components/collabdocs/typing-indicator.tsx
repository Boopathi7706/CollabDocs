import { cn } from "../../lib/utils";

interface TypingUser {
  id: string;
  name: string;
}

interface TypingIndicatorProps {
  users: TypingUser[];
  className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const names =
    users.length === 1
      ? users[0].name
      : users.length === 2
      ? `${users[0].name} and ${users[1].name}`
      : `${users[0].name} and ${users.length - 1} others`;

  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span>
        <strong className="font-medium text-foreground">{names}</strong>{" "}
        {users.length === 1 ? "is" : "are"} typing...
      </span>
    </div>
  );
}
