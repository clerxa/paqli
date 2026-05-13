import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white rounded-[12px] border-[0.5px] border-[rgba(45,38,64,0.08)] px-5 py-4",
        className,
      )}
      {...rest}
    />
  );
}
