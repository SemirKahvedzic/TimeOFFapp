import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function RsvpLayout({ children }: { children: React.ReactNode }) {
  // Public layout — intentionally not behind auth so meeting-invite email
  // recipients can respond without logging in. The token is the auth.
  return <>{children}</>;
}
