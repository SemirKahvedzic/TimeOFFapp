import { getCompany } from "@/lib/company";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const company = await getCompany().catch(() => null);
  return (
    <LoginForm
      companyName={company?.name ?? "TimeOff"}
      logoUrl={company?.logoUrl ?? null}
    />
  );
}
