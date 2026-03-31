import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm",
          "placeholder:text-muted-foreground",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          "transition-all duration-200",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus:border-destructive focus:ring-destructive/20",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
