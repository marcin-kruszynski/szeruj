import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { zipSync, strToU8 } from "fflate";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownDocument } from "../components/MarkdownDocument";
import { extractHtmlBundle, normalizeArchivePath } from "../lib/archive";
import { createDocumentId, isDocumentId } from "../lib/ids";
import { contentTypeForPath } from "../lib/mime";
import { configuredPublicOrigin, publicOriginFromHeaders } from "../lib/public-url";
import { isThemeId, THEMES, THEME_STORAGE_KEY } from "../lib/themes";

test("offers five light and five dark persistent browser themes", () => {
  assert.equal(THEMES.length, 10);
  assert.equal(THEMES.filter((theme) => theme.mode === "light").length, 5);
  assert.equal(THEMES.filter((theme) => theme.mode === "dark").length, 5);
  assert.equal(new Set(THEMES.map((theme) => theme.value)).size, THEMES.length);
  assert.equal(THEME_STORAGE_KEY, "szeruj-theme");
  assert.equal(isThemeId("graphite"), true);
  assert.equal(isThemeId("unknown"), false);

  const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const requiredVariables = [
    "bg",
    "bg-soft",
    "panel",
    "panel-strong",
    "ink",
    "muted",
    "line",
    "line-strong",
    "accent",
    "accent-strong",
    "accent-soft",
    "accent-ink",
    "on-accent",
    "secondary",
    "secondary-soft",
    "code-bg",
    "code-ink",
    "code-chrome",
    "syntax-comment",
    "syntax-keyword",
    "syntax-string",
    "syntax-number",
    "syntax-title",
    "syntax-variable",
    "danger",
    "shadow",
  ];
  for (const theme of THEMES) {
    const selector = `:root\\[data-theme=["']${theme.value}["']\\]`;
    const block = styles.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\}`))?.[1];
    assert.ok(block, `missing CSS block for ${theme.value}`);
    for (const variable of requiredVariables) {
      assert.match(block, new RegExp(`--${variable}:`), `${theme.value} is missing --${variable}`);
    }
    assert.match(block, new RegExp(`color-scheme:\\s*${theme.mode}`));
  }
});

test("generates 22-character, URL-safe document IDs", () => {
  const ids = new Set(Array.from({ length: 100 }, () => createDocumentId()));
  assert.equal(ids.size, 100);
  for (const id of ids) {
    assert.equal(id.length, 22);
    assert.equal(isDocumentId(id), true);
  }
  assert.equal(isDocumentId("short"), false);
  assert.equal(isDocumentId("../../etc/passwd_______"), false);
});

test("rejects unsafe archive paths", () => {
  for (const path of ["../index.html", "assets/../../secret", "/index.html", "C:/index.html", "a\\b.html", "./index.html"]) {
    assert.throws(() => normalizeArchivePath(path));
  }
  assert.equal(normalizeArchivePath("report/assets/chart.png"), "report/assets/chart.png");
});

test("extracts an HTML bundle and prefers root index.html", () => {
  const archive = zipSync({
    "report/index.html": strToU8("<h1>nested</h1>"),
    "index.html": strToU8("<h1>root</h1>"),
    "assets/app.css": strToU8("body { color: tomato; }"),
  });
  const bundle = extractHtmlBundle(archive);
  assert.equal(bundle.entryPath, "index.html");
  assert.equal(bundle.files.length, 3);
  assert.ok(bundle.byteSize > 0);
});

test("rejects ZIP without an HTML entry", () => {
  const archive = zipSync({ "README.txt": strToU8("hello") });
  assert.throws(() => extractHtmlBundle(archive), /HTML/);
});

test("maps content types used by HTML bundles", () => {
  assert.equal(contentTypeForPath("index.html"), "text/html; charset=utf-8");
  assert.equal(contentTypeForPath("assets/app.css"), "text/css; charset=utf-8");
  assert.equal(contentTypeForPath("assets/chart.svg"), "image/svg+xml");
  assert.equal(contentTypeForPath("unknown.bin"), "application/octet-stream");
});

test("renders rich Markdown lists and copyable fenced blocks", () => {
  const html = renderToStaticMarkup(
    MarkdownDocument({
      content: [
        "# Dokument",
        "",
        "- pierwszy punkt",
        "  - zagnieżdżony punkt",
        "",
        "1. pierwszy krok",
        "2. drugi krok",
        "",
        "```text",
        "wartość do skopiowania",
        "```",
      ].join("\n"),
    })
  );

  assert.match(html, /<ul>/);
  assert.match(html, /<ol>/);
  assert.match(html, /class="markdown-code-block"/);
  assert.match(html, /aria-label="Kopiuj blok: Tekst"/);
  assert.match(html, /wartość do skopiowania/);
});

test("does not render active HTML embedded in Markdown", () => {
  const html = renderToStaticMarkup(
    MarkdownDocument({
      content: [
        "# Bezpieczny dokument",
        "",
        "<script>globalThis.compromised = true</script>",
        "",
        "[niebezpieczny link](javascript:alert('xss'))",
      ].join("\n"),
    })
  );

  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /javascript:/i);
  assert.match(html, /niebezpieczny link/);
});

test("uses the configured public URL as the canonical origin", () => {
  const previous = process.env.SZERUJ_PUBLIC_URL;
  process.env.SZERUJ_PUBLIC_URL = "https://docs.example.org/";
  try {
    assert.equal(configuredPublicOrigin(), "https://docs.example.org");
    assert.equal(
      publicOriginFromHeaders(new Headers({ host: "192.168.1.63:8369" })),
      "https://docs.example.org"
    );
  } finally {
    if (previous === undefined) delete process.env.SZERUJ_PUBLIC_URL;
    else process.env.SZERUJ_PUBLIC_URL = previous;
  }
});

test("derives an HTTP origin for private LAN hosts", () => {
  const previous = process.env.SZERUJ_PUBLIC_URL;
  delete process.env.SZERUJ_PUBLIC_URL;
  try {
    assert.equal(
      publicOriginFromHeaders(new Headers({ host: "192.168.1.63:8369" })),
      "http://192.168.1.63:8369"
    );
    assert.equal(
      publicOriginFromHeaders(new Headers({ host: "szeruj.local:8369" })),
      "http://szeruj.local:8369"
    );
  } finally {
    if (previous !== undefined) process.env.SZERUJ_PUBLIC_URL = previous;
  }
});

test("rejects a public URL with a path or embedded credentials", () => {
  const previous = process.env.SZERUJ_PUBLIC_URL;
  try {
    process.env.SZERUJ_PUBLIC_URL = "https://example.org/subpath";
    assert.throws(() => configuredPublicOrigin(), /ścieżki/);
    process.env.SZERUJ_PUBLIC_URL = "https://user:secret@example.org";
    assert.throws(() => configuredPublicOrigin(), /logowania/);
  } finally {
    if (previous === undefined) delete process.env.SZERUJ_PUBLIC_URL;
    else process.env.SZERUJ_PUBLIC_URL = previous;
  }
});
