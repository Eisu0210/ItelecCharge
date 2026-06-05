const ALLOWED_REXEL_HOSTS = new Set([
  "www.rexel.be",
  "rexel.be",
  "www.rexel.com",
  "rexel.com",
  "www.rexel.fr",
  "rexel.fr",
]);

export function isAllowedRexelUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (ALLOWED_REXEL_HOSTS.has(host)) return true;
  if (host.endsWith(".rexel.be") || host.endsWith(".rexel.com") || host.endsWith(".rexel.fr")) {
    const parts = host.split(".");
    if (parts.length >= 3 && parts[parts.length - 2] === "rexel") return true;
  }
  return false;
}
