const DEFAULT_PUBLIC_ORIGIN = "http://szeruj.local:8369";
const SAFE_HOST = /^(?:(?:[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?)|(?:\[[0-9A-Fa-f:.]+\]))(?::\d{1,5})?$/;

function normalizeOrigin(value: string, source: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${source} musi być pełnym adresem http:// albo https://.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${source} musi używać http:// albo https://.`);
  }
  if (url.username || url.password) {
    throw new Error(`${source} nie może zawierać danych logowania.`);
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${source} nie może zawierać ścieżki, parametrów ani fragmentu.`);
  }
  return url.origin;
}

export function configuredPublicOrigin() {
  const value = typeof process !== "undefined"
    ? process.env.SZERUJ_PUBLIC_URL?.trim()
    : undefined;
  return value ? normalizeOrigin(value, "SZERUJ_PUBLIC_URL") : null;
}

function headerOrigin(requestHeaders: Headers) {
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0].trim();
  const host = forwardedHost || requestHeaders.get("host")?.trim();
  if (!host || !SAFE_HOST.test(host)) return null;

  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
  let hostname: string;
  try {
    hostname = new URL(`http://${host}`).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return null;
  }
  const isLocal =
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".home") ||
    /^(?:10|127)\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname);
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : isLocal
      ? "http"
      : "https";

  try {
    return normalizeOrigin(`${protocol}://${host}`, "Adres żądania");
  } catch {
    return null;
  }
}

export function publicOriginFromHeaders(requestHeaders: Headers) {
  return configuredPublicOrigin() ?? headerOrigin(requestHeaders) ?? DEFAULT_PUBLIC_ORIGIN;
}

export function publicOrigin(request: Request) {
  return configuredPublicOrigin() ?? headerOrigin(request.headers) ?? new URL(request.url).origin;
}
