import { cn } from "../../lib/utils";

interface LiveCursorProps {
  name: string;
  position: { x: number; y: number };
  color?: string;
}

export function LiveCursor({ name, position, color = "#7c3aed" }: LiveCursorProps) {
  return (
    <div
      className="pointer-events-none fixed z-50 transition-all duration-75"
      style={{ left: position.x, top: position.y }}
    >
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 0L0 14L4 10L7 17L9 16L6 9L11 9L0 0Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      <div
        className={cn(
          "ml-3 -mt-1 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm whitespace-nowrap"
        )}
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  );
}
