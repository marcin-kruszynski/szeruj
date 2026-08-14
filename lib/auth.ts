import { requiredRuntimeValue, timingSafeEqual } from "./runtime-config";
import { publicOrigin } from "./public-url";

const COOKIE_NAME = "szeruj_admin";
const SESSION_SECONDS = 12 * 60 * 60;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(requiredRuntimeValue("ADMIN_SESSION_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return bytesToBase64Url(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)))
  );
}

function cookieValue(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE_NAME) return value.join("=");
  }
  return null;
}

export async function createAdminSessionCookie(request: Request) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `v1.${expires}`;
  const signature = await sign(payload);
  const secure = new URL(publicOrigin(request)).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearAdminSessionCookie(request: Request) {
  const secure = new URL(publicOrigin(request)).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export async function hasAdminSession(request: Request) {
  const value = cookieValue(request);
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expires = Number(parts[1]);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = await sign(`${parts[0]}.${parts[1]}`);
  return timingSafeEqual(parts[2], expected);
}

export async function adminGuard(request: Request, options: { csrf?: boolean } = {}) {
  if (!(await hasAdminSession(request))) {
    return Response.json({ error: "Sesja administratora wygasła." }, { status: 401 });
  }
  if (options.csrf) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== publicOrigin(request)) {
      return Response.json({ error: "Żądanie zostało odrzucone." }, { status: 403 });
    }
  }
  return null;
}

export async function apiTokenGuard(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  const expected = requiredRuntimeValue("API_TOKEN");
  if (!match || !(await timingSafeEqual(match[1].trim(), expected))) {
    return Response.json({ error: "Nieprawidłowy token API." }, { status: 401 });
  }
  return null;
}
