export function getAuthConfig() {
  const username = (process.env.SHAMSAK_USER || process.env.SHAMSAK_USERNAME || "").trim();
  // Passwords are secrets: never trim or otherwise transform them.
  const password = process.env.SHAMSAK_PASSWORD || "";
  const passwordHash = process.env.SHAMSAK_PASSWORD_HASH || "";
  // A dedicated AUTH_SECRET is preferred. The password/hash remains a fallback
  // only so a deployment with the documented Shamsak variables can initialize.
  const secret = process.env.AUTH_SECRET || password || passwordHash;

  return {
    username,
    password,
    passwordHash,
    secret,
    configured: Boolean(username && (password || passwordHash) && secret),
  };
}
