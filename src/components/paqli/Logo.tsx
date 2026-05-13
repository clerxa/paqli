interface LogoProps {
  variant?: "dark" | "light";
  size?: number;
}

export function Logo({ variant = "dark", size = 30 }: LogoProps) {
  const isLight = variant === "light";
  const markBg = isLight ? "rgba(250,248,245,0.12)" : "#2D2640";
  const markColor = "#FAF8F5";
  const wordColor = isLight ? "#FAF8F5" : "#2D2640";
  const wordSize = Math.round((size * 22) / 30);
  const markFontSize = Math.round((size * 17) / 30);
  const radius = Math.round((size * 7) / 30);

  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: markBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: markFontSize,
            color: markColor,
            lineHeight: 1,
            position: "relative",
            top: 1,
          }}
        >
          p
        </span>
      </div>
      <span
        style={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: wordSize,
          color: wordColor,
          letterSpacing: "-0.5px",
          lineHeight: 1,
          position: "relative",
          top: 1,
        }}
      >
        aqli
      </span>
    </div>
  );
}
