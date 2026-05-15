import logoSrc from "@/assets/paqli-logo.png";

interface LogoProps {
  variant?: "dark" | "light";
  size?: number;
}

export function Logo({ size = 30 }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="Paqli"
      style={{ height: size, width: "auto", display: "block" }}
    />
  );
}
