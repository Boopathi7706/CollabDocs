import { cn } from "../../lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm",
        hover && "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
