import Link from "next/link";

function LogoMark({ size = 32 }: { size?: number }) {
  const rx = Math.round(size * 0.22);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: "block" }}
    >
      <defs>
        <linearGradient id="sf-logo-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF4E50" />
          <stop offset="100%" stopColor="#FF7B35" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx={rx} fill="url(#sf-logo-g)" />
      <path d="M20 3L8 18H16L12 29L24 14H16Z" fill="white" />
    </svg>
  );
}

interface LogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Logo({ href = "/", size = "md", subtitle, className, style }: LogoProps) {
  const iconSize = size === "sm" ? 28 : size === "lg" ? 40 : 32;
  const fontSize = size === "sm" ? "0.875rem" : size === "lg" ? "1.25rem" : "1rem";
  const subtitleSize = size === "sm" ? "0.7rem" : "0.75rem";

  const content = (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: size === "sm" ? "0.5rem" : "0.625rem",
        textDecoration: "none",
        ...style,
      }}
      className={className}
    >
      <LogoMark size={iconSize} />
      <span style={{ display: "flex", flexDirection: subtitle ? "column" : "row", gap: subtitle ? "1px" : 0 }}>
        <span
          style={{
            fontFamily: "var(--font-syne)",
            fontSize,
            fontWeight: 700,
            color: "var(--foreground)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          Script<span style={{ color: "var(--accent)" }}>Forge</span>
        </span>
        {subtitle && (
          <span
            style={{
              fontSize: subtitleSize,
              color: "var(--muted)",
              lineHeight: 1,
              fontFamily: "var(--font-syne)",
            }}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  );
}

export function LogoMarkOnly({ size = 32 }: { size?: number }) {
  return <LogoMark size={size} />;
}
