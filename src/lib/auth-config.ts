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

  const secret = process.env.AUTH_SECRET || "";

  return {
    username,
    password,
    passwordHash,
    ownerUsername,
    ownerPassword,
    secret,
    // Either the shared account or the separate owner account is enough
    // to enable authentication. Requiring SHAMSAK_USER as well would make
    // a correctly configured owner-only deployment return 503 forever.
    configured: Boolean(
      secret &&
      (
        (username && (password || passwordHash)) ||
        (ownerUsername && ownerPassword)
      )
    ),
  };
}
