export function getAuthConfig(){
  const username = process.env.SHAMSAK_USERNAME || process.env.SHAMSAK_USER || "";
  const password = process.env.SHAMSAK_PASSWORD;
  const passwordHash = process.env.SHAMSAK_PASSWORD_HASH;
  const secret = process.env.AUTH_SECRET;

  return {
    username,
    password,
    passwordHash,
    secret,
    configured: Boolean(username && (password || passwordHash) && secret),
  };
}
