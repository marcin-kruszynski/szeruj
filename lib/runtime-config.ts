type RuntimeSecretName = "ADMIN_USERNAME" | "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET" | "API_TOKEN";

const minimumLengths: Record<RuntimeSecretName, number> = {
  ADMIN_USERNAME: 1,
  ADMIN_PASSWORD: 16,
  ADMIN_SESSION_SECRET: 32,
  API_TOKEN: 32,
};

export function runtimeValue(name: RuntimeSecretName) {
  const local = typeof process !== "undefined" ? process.env[name] : undefined;
  return local?.trim() || undefined;
}

export function requiredRuntimeValue(
  name: RuntimeSecretName
) {
  const value = runtimeValue(name);
  if (!value) throw new Error(`Brakuje konfiguracji ${name}.`);
  if (value.length < minimumLengths[name]) {
    throw new Error(`Konfiguracja ${name} jest za krótka (minimum ${minimumLengths[name]} znaków).`);
  }
  return value;
}

export function validateRuntimeSecrets() {
  requiredRuntimeValue("ADMIN_USERNAME");
  requiredRuntimeValue("ADMIN_PASSWORD");
  requiredRuntimeValue("ADMIN_SESSION_SECRET");
  requiredRuntimeValue("API_TOKEN");
}

export async function timingSafeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}
