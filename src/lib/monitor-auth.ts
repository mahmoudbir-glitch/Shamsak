export function isMonitoringOwner(username: string) {
  const configuredOwner = (process.env.SHAMSAK_OWNER_USER || "").trim();
  if (configuredOwner) return username === configuredOwner;

  const primaryOwner = (
    process.env.SHAMSAK_USER ||
    process.env.SHAMSAK_USERNAME ||
    ""
  ).trim();

  return Boolean(primaryOwner && username === primaryOwner);
}
