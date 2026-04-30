"use client";

const PALETTES: [string, string][] = [
  ["#6366f1", "#a855f7"],
  ["#10b981", "#0d9488"],
  ["#f59e0b", "#ef4444"],
  ["#3b82f6", "#06b6d4"],
  ["#ec4899", "#f43f5e"],
  ["#8b5cf6", "#6366f1"],
  ["#14b8a6", "#0ea5e9"],
  ["#f97316", "#eab308"],
  ["#0ea5e9", "#4f46e5"],
  ["#a855f7", "#ec4899"],
];

function hashName(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h, 33) ^ str.charCodeAt(i);
  }
  return Math.abs(h);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({
  name,
  size = 40,
  className = "",
  imageUrl,
}: {
  name: string;
  size?: number;
  className?: string;
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, objectFit: "cover", flexShrink: 0, display: "block" }}
      />
    );
  }

  const hash = hashName(name || "?");
  const [c1, c2] = PALETTES[hash % PALETTES.length];
  const initials = getInitials(name || "?");
  const gradId = `av${hash}`;
  const fontSize = size <= 28 ? size * 0.4 : size * 0.36;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill={`url(#${gradId})`} />
      {/* inner ring depth */}
      <circle cx="20" cy="20" r="14" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="7" />
      {/* top-right highlight blob */}
      <circle cx="27" cy="11" r="9" fill="rgba(255,255,255,0.09)" />
      <text
        x="20"
        y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="system-ui,-apple-system,BlinkMacSystemFont,sans-serif"
        letterSpacing={initials.length > 1 ? "-0.5" : "0"}
      >
        {initials}
      </text>
    </svg>
  );
}
