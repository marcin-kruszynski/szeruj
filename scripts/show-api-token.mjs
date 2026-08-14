#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");
let contents;
try {
  contents = readFileSync(envPath, "utf8");
} catch (error) {
  console.error(`Nie można odczytać ${envPath}: ${error.message}`);
  process.exit(1);
}

const line = contents
  .split(/\r?\n/)
  .find((entry) => entry.trimStart().startsWith("API_TOKEN="));
const token = line?.slice(line.indexOf("=") + 1).trim() || "";

if (!token) {
  console.error("API_TOKEN w .env jest pusty. Uruchom npm run setup albo wpisz własny token.");
  process.exit(1);
}

process.stdout.write(`${token}\n`);
