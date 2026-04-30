// The owner is a single, special admin account that cannot be deleted or
// demoted. Only the owner can delete other admins. Configurable via
// NEXT_PUBLIC_OWNER_EMAIL so it travels to the client too.
export const OWNER_EMAIL = (
  process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "semirfsk@gmail.com"
).toLowerCase();

export function isOwnerEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === OWNER_EMAIL;
}
