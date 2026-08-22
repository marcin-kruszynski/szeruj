#!/usr/bin/env node

import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

function usage() {
  console.log("Użycie: node scripts/setup-env.mjs [--force]");
}

const argumentsList = process.argv.slice(2);
if (argumentsList.includes("--help") || argumentsList.includes("-h")) {
  usage();
  process.exit(0);
}
if (argumentsList.some((argument) => argument !== "--force")) {
  usage();
  process.exit(2);
}

const force = argumentsList.includes("--force");
const target = path.resolve(process.cwd(), ".env");
if (existsSync(target) && !force) {
  console.error("Plik .env już istnieje. Zostawiam go bez zmian (użyj --force, aby wygenerować nowy). ");
  process.exit(1);
}

const uid = typeof process.getuid === "function" ? process.getuid() : 1000;
const gid = typeof process.getgid === "function" ? process.getgid() : 1000;
const randomSecret = (bytes) => randomBytes(bytes).toString("base64url");
const contents = `# Public address used in links returned by Szeruj.
SZERUJ_PUBLIC_URL=http://szeruj.local:8369

# Docker/Compose settings.
SZERUJ_BIND_ADDRESS=0.0.0.0
SZERUJ_PORT=8369
SZERUJ_DATA_PATH=./data
SZERUJ_MEMORY_LIMIT=2g
SZERUJ_UID=${uid}
SZERUJ_GID=${gid}
SZERUJ_IMAGE=szeruj:local
SZERUJ_CONTAINER_NAME=szeruj

# Credentials. Do not commit this file.
ADMIN_USERNAME=admin
ADMIN_PASSWORD=${randomSecret(24)}
ADMIN_SESSION_SECRET=${randomSecret(48)}
API_TOKEN=${randomSecret(48)}
`;

writeFileSync(target, contents, { encoding: "utf8", flag: force ? "w" : "wx", mode: 0o600 });
chmodSync(target, 0o600);
mkdirSync(path.resolve(process.cwd(), "data"), { recursive: true });

console.log("Gotowe: utworzyłem prywatny .env z losowymi sekretami i katalog data.");
console.log("Token dla agentów jest w .env jako API_TOKEN (pokażesz go przez: npm run token --silent).");
console.log("Sprawdź SZERUJ_PUBLIC_URL, a potem uruchom: docker compose up -d --build");
