/**
 * The owner signs in with their own account (SHAMSAK_OWNER_USER /
 * SHAMSAK_OWNER_PASSWORD); everyone else shares the regular one. Owner-only
 * features stay hidden from everyone until that account is configured.
 */
export function isOwner(username: string | null | undefined) {
  const owner = (process.env.SHAMSAK_OWNER_USER || "").trim();
  return Boolean(owner && process.env.SHAMSAK_OWNER_PASSWORD && username === owner);
}
