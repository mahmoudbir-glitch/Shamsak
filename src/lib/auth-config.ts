export function getAuthConfig(){
  const username = (process.env.SHAMSAK_USER || process.env.SHAMSAK_USERNAME || "").trim();
  // Passwords are secrets: never trim or otherwise transform them.
  const password = process.env.SHAMSAK_PASSWORD || "";
  const passwordHash = process.env.SHAMSAK_PASSWORD_HASH || "";
  // AUTH_SECRET remains supported, but SHAMSAK_PASSWORD is the fallback secret
  // so SHAMSAK_USER + SHAMSAK_PASSWORD is sufficient for a deployment.
  const secret = process.env.AUTH_SECRET || password;

  return {
    username,
    password,
    passwordHash,
    secret,
    configured: Boolean(username && (password || passwordHash) && secret),
  };
}
