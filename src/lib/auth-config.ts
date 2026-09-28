export function getAuthConfig() {
  const username = (
    process.env.SHAMSAK_USER ||
    process.env.SHAMSAK_USERNAME ||
    ""
  ).trim();

  const password = process.env.SHAMSAK_PASSWORD || "";
  const passwordHash = process.env.SHAMSAK_PASSWORD_HASH || "";

  const ownerUsername = (
    process.env.SHAMSAK_OWNER_USER ||
    ""
  ).trim();
  const ownerPassword = process.env.SHAMSAK_OWNER_PASSWORD || "";

  const secret =
    process.env.AUTH_SECRET ||
    password ||
    passwordHash;

  return {
    username,
    password,
    passwordHash,
    ownerUsername,
    ownerPassword,
    secret,
    configured: Boolean(
      username &&
      (password || passwordHash) &&
      secret
    ),
  };
}
