interface LogoProps {
  variant?: "dark" | "light";
  /** Optional fixed height (px). Drives the font size. */
  size?: number;
  className?: string;
}

export function Logo({ size, variant = "dark", className }: LogoProps) {
  const color = variant === "light" ? "#FFFFFF" : "#2D2640";
  const style = size
    ? { fontSize: size, lineHeight: 1, color }
    : { color };
  const sizeClass = size ? "" : "text-[26px] md:text-[32px]";
  return (
    <span
      style={style}
      className={`font-display leading-none select-none ${sizeClass} ${className ?? ""}`}
    >
      paqli
    </span>
  );
}
