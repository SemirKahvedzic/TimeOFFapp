import { prisma } from "./db";

export type CompanyRecord = {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  brandColor: string;
  accentColor: string;
  theme: string;
  language: string;
  workWeek: string;
  countryCode: string;
  timeZone: string;
  icalToken: string;
};

export async function getCompany(): Promise<CompanyRecord> {
  const existing = await prisma.company.findFirst();
  if (existing) return existing;
  return prisma.company.create({
    data: { name: "My Company" },
  });
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

export function brandCssVars(brandHex: string, accentHex: string): string {
  const b = hexToRgb(brandHex) ?? { r: 124, g: 92, b: 255 };
  const a = hexToRgb(accentHex) ?? { r: 255, g: 143, b: 177 };
  return `
    :root {
      --brand:       ${brandHex};
      --brand-soft:  rgba(${b.r}, ${b.g}, ${b.b}, 0.14);
      --brand-glow:  rgba(${b.r}, ${b.g}, ${b.b}, 0.45);
      --accent:      ${accentHex};
      --accent-soft: rgba(${a.r}, ${a.g}, ${a.b}, 0.14);
    }
  `.trim();
}

export function workWeekDays(csv: string): number[] {
  return csv
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 0 && n <= 6);
}
