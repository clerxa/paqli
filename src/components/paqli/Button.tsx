import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-aubergine text-lin hover:bg-aubergine-mid px-4 py-[7px]",
  ghost:
    "bg-transparent border-[0.5px] border-[rgba(45,38,64,0.15)] text-aubergine-light hover:bg-brume px-4 py-[7px]",
  danger: "bg-danger text-white hover:opacity-90 px-4 py-[7px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...rest }, ref) => (
    <button ref={ref} className={cn(base, variants[variant], className)} {...rest} />
  ),
);
Button.displayName = "PaqliButton";
