import { getCompany } from "@/lib/company";
import { LoginForm } from "./LoginForm";

// Always render fresh — at build time DATABASE_URL is unavailable, so a
// static prerender would bake "TimeOff" + default brand colors and cause
// a hydration mismatch on the live site once the real company exists.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const company = await getCompany().catch(() => null);
  return (
    <LoginForm
      companyName={company?.name ?? "TimeOff"}
      logoUrl={company?.logoUrl ?? null}
    />
  );
}
