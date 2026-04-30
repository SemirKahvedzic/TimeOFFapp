// The "super-owner" is a single, hardcoded email that can never be deleted
// or demoted, and is the only one allowed to remove an owner-admin. Other
// admins can also be promoted to owner-admin via User.isOwner — they can
// edit brand settings and promote others, but only the super-owner can
// strip their owner status or delete them.
//
// Configurable via NEXT_PUBLIC_OWNER_EMAIL so the email travels to the
// client too.
export const OWNER_EMAIL = (
  process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "semirfsk@gmail.com"
).toLowerCase();

/** True only for the hardcoded super-owner email. */
export function isOwnerEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === OWNER_EMAIL;
}

/** True for the super-owner OR any user with isOwner=true. */
export function userIsOwner(user: { email?: string | null; isOwner?: boolean | null } | null | undefined): boolean {
  if (!user) return false;
  return isOwnerEmail(user.email) || user.isOwner === true;
}
