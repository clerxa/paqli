import logoSrc from "@/assets/paqli-logo.png";

interface LogoProps {
  variant?: "dark" | "light";
  /** Optional fixed height (px). If omitted, responsive sizing is used. */
  size?: number;
  className?: string;
}

export function Logo({ size, className }: LogoProps) {
  if (size) {
    return (
      <img
        src={logoSrc}
        alt="Paqli"
        style={{ height: size, width: "auto", display: "block" }}
        className={className}
      />
    );
  }
  return (
    <img
      src={logoSrc}
      alt="Paqli"
      className={`block w-auto h-12 md:h-16 ${className ?? ""}`}
    />
  );
}
