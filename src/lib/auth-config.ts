export function getAuthConfig() {
  // Canonical production variable is SHAMSAK_USER.
  // SHAMSAK_USERNAME is kept as a backward-compatible alias.
  const username = (
    process.env.SHAMSAK_USER ||
    process.env.SHAMSAK_USERNAME ||
    ""
  ).trim();

  // Password must be read exactly as stored. Do not trim it.
  const password = process.env.SHAMSAK_PASSWORD || "";
  const passwordHash = process.env.SHAMSAK_PASSWORD_HASH || "";

  // AUTH_SECRET is preferred for signing the session cookie.
  // For compatibility with the two-variable setup, the password/hash can
  // temporarily act as the signing secret when AUTH_SECRET is not present.
  const secret =
    process.env.AUTH_SECRET ||
    password ||
    passwordHash;

  return {
    username,
    password,
    passwordHash,
    secret,
    configured: Boolean(
      username &&
      (password || passwordHash) &&
      secret
    ),
  };
}
