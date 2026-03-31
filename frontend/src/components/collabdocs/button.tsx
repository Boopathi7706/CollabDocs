import { cn } from "../../lib/utils";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, children, className, disabled, ...props }, ref) => {
    const variantClasses = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
      ghost: "bg-transparent text-foreground hover:bg-secondary",
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm rounded-lg",
      md: "px-5 py-2.5 text-sm rounded-xl",
      lg: "px-6 py-3 text-base rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-in-out",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "hover:scale-[1.02] active:scale-[0.98]",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
