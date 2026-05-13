import { cn } from "@/lib/utils";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("rounded-md", className)}
      style={{
        background:
          "linear-gradient(90deg, #F0EBE8 25%, #E8E2D6 50%, #F0EBE8 75%)",
        backgroundSize: "200% 100%",
        animation: "paqli-shimmer 1.5s infinite",
        ...style,
      }}
    />
  );
}
